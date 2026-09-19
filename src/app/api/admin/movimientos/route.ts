import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sesionActual } from "@/lib/admin/sesion";
import { registrarEnBitacora, pesos } from "@/lib/admin/bitacora";
import { categoriaDe, esDirecta } from "@/lib/admin/categorias";
import { puedeHacer } from "@/lib/admin/usuarios";
import { hoyMX } from "@/lib/dates";

export const dynamic = "force-dynamic";

const ES_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const TIPOS = ["costo", "gasto", "cobro", "reembolso", "distribucion"];

// GET → los movimientos de un rango. `reservaId` los de una sola reserva.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const reservaId = searchParams.get("reservaId");
    if (reservaId) {
      return NextResponse.json(
        await prisma.movimiento.findMany({ where: { reservaId }, orderBy: { fecha: "asc" } }),
      );
    }
    const desde = searchParams.get("desde") || hoyMX();
    const hasta = searchParams.get("hasta") || hoyMX();
    return NextResponse.json(
      await prisma.movimiento.findMany({
        where:   { fecha: { gte: desde, lte: hasta } },
        orderBy: { fecha: "asc" },
      }),
    );
  } catch (e: any) {
    console.error("admin/movimientos GET:", e?.message);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// POST → registrar un movimiento.
export async function POST(req: NextRequest) {
  try {
    const b = await req.json();

    const tipo      = TIPOS.includes(b?.tipo) ? String(b.tipo) : "gasto";
    const concepto  = String(b?.concepto ?? "").trim().slice(0, 140);
    const monto     = Math.round(Number(b?.monto) || 0);
    const fecha     = String(b?.fecha ?? "");
    const categoria = String(b?.categoria ?? "otroGeneral");

    if (!concepto)           return NextResponse.json({ error: "Falta el concepto" }, { status: 400 });
    if (monto <= 0)          return NextResponse.json({ error: "El monto tiene que ser mayor a cero" }, { status: 400 });
    if (!ES_FECHA.test(fecha)) return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });

    // Un costo pertenece a una reserva; un gasto general, a ninguna. Mezclarlos
    // haría que un gasto de la empresa bajara la utilidad de un cliente.
    const reservaId = b?.reservaId ? String(b.reservaId) : null;
    if (tipo === "costo" && !reservaId)
      return NextResponse.json({ error: "Un costo de tour tiene que ir en una reserva" }, { status: 400 });
    if (tipo === "gasto" && reservaId)
      return NextResponse.json({ error: "Un gasto general no se cuelga de una reserva" }, { status: 400 });
    if (tipo === "costo" && !esDirecta(categoria))
      return NextResponse.json({ error: "Esa categoría no es de costo de tour" }, { status: 400 });
    if (tipo === "gasto" && esDirecta(categoria))
      return NextResponse.json({ error: "Esa categoría es de costo de tour, no de gasto general" }, { status: 400 });

    let folio: string | null = null;
    if (reservaId) {
      const r = await prisma.tourBooking.findUnique({
        where: { id: reservaId }, select: { confirmationNumber: true },
      });
      if (!r) return NextResponse.json({ error: "Esa reserva no existe" }, { status: 400 });
      folio = r.confirmationNumber;
    }
    if (b?.socioId) {
      const s = await prisma.socio.findUnique({ where: { id: String(b.socioId) }, select: { id: true } });
      if (!s) return NextResponse.json({ error: "Ese socio no existe" }, { status: 400 });
    }

    const sesion = await sesionActual();
    // Capturar el costo de una salida y meter un gasto de la empresa son dos
    // permisos distintos: quien opera sabe lo que costó su lancha, no decide
    // cuánto se gasta en publicidad.
    const permiso = tipo === "costo" ? "capturarCostoDeSalida" : "capturarGastoGeneral";
    if (!sesion || !puedeHacer(sesion.rol, permiso)) {
      return NextResponse.json({ error: "Tu cuenta no puede registrar este movimiento" }, { status: 403 });
    }
    const pagado = b?.pagado === undefined ? true : !!b.pagado;
    const mov = await prisma.movimiento.create({
      data: {
        fecha, tipo, categoria, concepto, monto, reservaId,
        nota:         b?.nota ? String(b.nota).slice(0, 300) : null,
        proveedor:    b?.proveedor ? String(b.proveedor).slice(0, 120) : null,
        metodoPago:   b?.metodoPago ? String(b.metodoPago) : null,
        pagado,
        fechaPago:    pagado ? (ES_FECHA.test(String(b?.fechaPago ?? "")) ? String(b.fechaPago) : fecha) : null,
        recurrente:   !!b?.recurrente,
        periodicidad: b?.recurrente ? String(b?.periodicidad ?? "mensual") : null,
        socioId:      b?.socioId ? String(b.socioId) : null,
        creadoPor:    sesion?.nombre ?? null,
      },
    });

    await registrarEnBitacora({
      accion:     "creó",
      entidad:    tipo === "costo" ? "costo" : tipo === "gasto" ? "gasto" : tipo,
      referencia: folio ?? undefined,
      resumen:    `${categoriaDe(categoria).label}: "${concepto}" por ${pesos(monto)}` +
                  (folio ? ` en la reserva ${folio}` : ` (${fecha})`) +
                  (pagado ? "" : " — PENDIENTE de pago"),
    });

    return NextResponse.json({ ok: true, movimiento: mov });
  } catch (e: any) {
    console.error("admin/movimientos POST:", e?.message);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// PATCH → marcar pagado / anular. Un movimiento financiero NO se borra.
export async function PATCH(req: NextRequest) {
  try {
    const b  = await req.json();
    const id = String(b?.id ?? "");
    const antes = await prisma.movimiento.findUnique({ where: { id } });
    if (!antes) return NextResponse.json({ error: "Ese movimiento no existe" }, { status: 404 });

    const sesion = await sesionActual();
    if (!sesion || !puedeHacer(sesion.rol, "anularMovimiento")) {
      return NextResponse.json({ error: "Tu cuenta no puede cambiar movimientos ya registrados" }, { status: 403 });
    }

    if (b?.accion === "anular") {
      const motivo = String(b?.motivo ?? "").trim().slice(0, 200);
      if (!motivo) return NextResponse.json({ error: "Escribe por qué se anula" }, { status: 400 });
      const mov = await prisma.movimiento.update({
        where: { id },
        data: {
          anulado: true, anuladoPor: sesion?.nombre ?? "?", anuladoAt: new Date(),
          motivoAnulacion: motivo,
        },
      });
      await registrarEnBitacora({
        accion:  "eliminó",
        entidad: "movimiento",
        resumen: `Anulado "${antes.concepto}" de ${pesos(antes.monto)} (${antes.fecha}). Motivo: ${motivo}`,
        detalle: [{ campo: "anulado", antes: false, despues: true }],
      });
      return NextResponse.json({ ok: true, movimiento: mov });
    }

    if (b?.accion === "pagar") {
      const fechaPago = ES_FECHA.test(String(b?.fechaPago ?? "")) ? String(b.fechaPago) : hoyMX();
      const mov = await prisma.movimiento.update({
        where: { id }, data: { pagado: true, fechaPago },
      });
      await registrarEnBitacora({
        accion:  "modificó",
        entidad: "movimiento",
        resumen: `Pagado "${antes.concepto}" de ${pesos(antes.monto)} a ${antes.proveedor || "sin proveedor"}`,
        detalle: [{ campo: "pagado", antes: false, despues: true },
                  { campo: "fecha de pago", antes: antes.fechaPago, despues: fechaPago }],
      });
      return NextResponse.json({ ok: true, movimiento: mov });
    }

    return NextResponse.json({ error: "Acción no reconocida" }, { status: 400 });
  } catch (e: any) {
    console.error("admin/movimientos PATCH:", e?.message);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
