import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sesionActual } from "@/lib/admin/sesion";
import { puedeHacer } from "@/lib/admin/usuarios";
import { hoyMX } from "@/lib/dates";
import { montoCobrado } from "@/lib/admin/kpis";
import {
  cobrosDeReserva, registrarCobro, anularCobro, marcarEntregado, editarCobro,
  metodoValido, requiereComprobante,
} from "@/lib/admin/cobros";

export const dynamic = "force-dynamic";

// GET → los cobros de una reserva, con sus comprobantes.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    return NextResponse.json(await cobrosDeReserva(params.id));
  } catch (e: any) {
    console.error("admin/cobros GET:", e?.message);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// POST → registrar un cobro de esta reserva.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sesion = await sesionActual();
    if (!sesion || !puedeHacer(sesion.rol, "registrarCobro")) {
      return NextResponse.json({ error: "Tu cuenta no puede registrar cobros" }, { status: 403 });
    }

    const b = await req.json();
    const monto  = Math.round(Number(b?.monto) || 0);
    const metodo = b?.metodo;

    if (monto <= 0)          return NextResponse.json({ error: "El monto tiene que ser mayor a cero" }, { status: 400 });
    if (!metodoValido(metodo)) return NextResponse.json({ error: "Elige cómo entró el dinero" }, { status: 400 });

    // 🔴 El comprobante se sube ANTES que el cobro (la subida devuelve su id) y
    // aquí se comprueba que llegó. Al revés no se puede: un archivo necesita el
    // renglón al que colgarse, y un renglón sin comprobante ya estaría guardado.
    const evidenciaIds: string[] = Array.isArray(b?.evidenciaIds)
      ? b.evidenciaIds.filter((x: unknown) => typeof x === "string").slice(0, 10)
      : [];
    if (requiereComprobante(metodo) && evidenciaIds.length === 0) {
      return NextResponse.json(
        { error: "Ese método necesita comprobante: sube la captura o el PDF." },
        { status: 400 },
      );
    }

    const reserva = await prisma.tourBooking.findUnique({
      where: { id: params.id },
      select: { totalAmount: true, depositoPagado: true, stripePaymentIntentId: true },
    });
    if (!reserva) return NextResponse.json({ error: "Esa reserva no existe" }, { status: 404 });

    // Mismo criterio que `montoCobrado()`: una reserva pagada por Stripe puede
    // tener el depósito en cero y no deber nada.
    const yaCobrado = montoCobrado(reserva);
    const saldo     = reserva.totalAmount - yaCobrado;

    // 🔴 DESGLOSAR ≠ COBRAR.
    // Una reserva que ya figura cobrada pero sin ningún renglón (las anteriores
    // a este módulo, y las que nacen de una cotización con anticipo acordado)
    // no necesita dinero nuevo: necesita que alguien diga CÓMO entró el que ya
    // está contado. Sin este modo, el panel contestaba "esta reserva solo debe
    // $0" y no había forma de registrar nada.
    const desglosar = !!b?.desglosar;
    if (desglosar) {
      const cuantos = await prisma.movimiento.count({ where: { reservaId: params.id, tipo: "cobro" } });
      if (cuantos > 0) {
        return NextResponse.json({ error: "Esta reserva ya dice cómo entró su dinero" }, { status: 400 });
      }
      if (monto > yaCobrado) {
        return NextResponse.json(
          { error: `Solo figuran $${yaCobrado.toLocaleString("es-MX")} cobrados. Para registrar dinero nuevo, desglosa primero lo que ya había.` },
          { status: 400 },
        );
      }
    } else if (monto > saldo && !b?.forzar) {
      // Pasarse del total casi siempre es un dedazo, pero a veces es real
      // (se sumó gente el día del tour): se avisa y se deja confirmar.
      return NextResponse.json(
        {
          error: saldo > 0
            ? `Esta reserva solo debe $${saldo.toLocaleString("es-MX")}. Revisa el monto.`
            : "Esta reserva ya está liquidada.",
          saldo,
          sePuedeForzar: true,
        },
        { status: 400 },
      );
    }

    const r = await registrarCobro({
      reservaId:   params.id,
      monto,
      metodo,
      fecha:       b?.fecha,
      recibidoPor: b?.recibidoPor ? String(b.recibidoPor) : sesion.nombre,
      folio:       b?.folio,
      nota:        b?.nota ?? (desglosar ? "Se registró cómo entró dinero que ya figuraba cobrado" : null),
      creadoPor:   sesion.nombre,
      sinRescate:  desglosar,
    });

    if (evidenciaIds.length) {
      await prisma.evidencia.updateMany({
        where: { id: { in: evidenciaIds }, bookingId: params.id },
        data:  { movimientoId: r.cobro.id },
      });
    }

    return NextResponse.json({ ok: true, ...r, cobros: await cobrosDeReserva(params.id) });
  } catch (e: any) {
    console.error("admin/cobros POST:", e?.message);
    return NextResponse.json({ error: e?.message || "Error interno" }, { status: 500 });
  }
}

// PATCH → anular un cobro, o dar por entregado el efectivo.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sesion = await sesionActual();
    if (!sesion) return NextResponse.json({ error: "Sin sesión" }, { status: 403 });
    const b = await req.json();

    if (b?.accion === "anular") {
      const id     = String(b?.cobroId ?? "");
      const motivo = String(b?.motivo ?? "").trim();
      if (!motivo) return NextResponse.json({ error: "Escribe por qué se anula" }, { status: 400 });

      const cobro = await prisma.movimiento.findUnique({ where: { id } });
      if (!cobro || cobro.reservaId !== params.id) {
        return NextResponse.json({ error: "Ese cobro no es de esta reserva" }, { status: 404 });
      }
      // Quien anula movimientos, siempre. Y además quien lo capturó HOY, para
      // que un dedazo de la mañana no tenga que esperar a que llegue un socio.
      const esSuyoDeHoy = cobro.creadoPor === sesion.nombre && cobro.fecha === hoyMX();
      if (!puedeHacer(sesion.rol, "anularMovimiento") && !esSuyoDeHoy) {
        return NextResponse.json(
          { error: "Solo puedes anular un cobro que tú registraste hoy. Pídeselo a un socio." },
          { status: 403 },
        );
      }
      const cobrado = await anularCobro(id, motivo, sesion.nombre);
      return NextResponse.json({ ok: true, cobrado, cobros: await cobrosDeReserva(params.id) });
    }

    // Corregir con qué método entró un cobro ya registrado. Lo puede hacer
    // quien registra cobros: decir bien de dónde salió un dinero que ya está
    // contado no mueve ninguna cifra, sólo el desglose.
    if (b?.accion === "editar") {
      if (!puedeHacer(sesion.rol, "registrarCobro")) {
        return NextResponse.json({ error: "Tu cuenta no puede tocar los cobros" }, { status: 403 });
      }
      const id = String(b?.cobroId ?? "");
      const cobro = await prisma.movimiento.findUnique({ where: { id } });
      if (!cobro || cobro.reservaId !== params.id) {
        return NextResponse.json({ error: "Ese cobro no es de esta reserva" }, { status: 404 });
      }
      if (b?.metodo !== undefined && !metodoValido(b.metodo)) {
        return NextResponse.json({ error: "Método de pago desconocido" }, { status: 400 });
      }
      await editarCobro(id, {
        metodo:      b?.metodo,
        fecha:       b?.fecha,
        folio:       b?.folio,
        recibidoPor: b?.recibidoPor,
      }, sesion.nombre);

      // El comprobante se sube aparte y llega aquí sólo para engancharlo.
      const evidenciaIds: string[] = Array.isArray(b?.evidenciaIds)
        ? b.evidenciaIds.filter((x: unknown) => typeof x === "string").slice(0, 10)
        : [];
      if (evidenciaIds.length) {
        await prisma.evidencia.updateMany({
          where: { id: { in: evidenciaIds }, bookingId: params.id },
          data:  { movimientoId: id },
        });
      }
      return NextResponse.json({ ok: true, cobros: await cobrosDeReserva(params.id) });
    }

    if (b?.accion === "entregar") {
      if (!puedeHacer(sesion.rol, "marcarEntregaEfectivo")) {
        return NextResponse.json({ error: "Solo un socio da por recibido el efectivo" }, { status: 403 });
      }
      const ids = Array.isArray(b?.cobroIds) ? b.cobroIds.map(String) : [];
      const total = await marcarEntregado(ids, sesion.nombre, sesion.nombre);
      return NextResponse.json({ ok: true, total, cobros: await cobrosDeReserva(params.id) });
    }

    return NextResponse.json({ error: "Acción no reconocida" }, { status: 400 });
  } catch (e: any) {
    console.error("admin/cobros PATCH:", e?.message);
    return NextResponse.json({ error: e?.message || "Error interno" }, { status: 500 });
  }
}
