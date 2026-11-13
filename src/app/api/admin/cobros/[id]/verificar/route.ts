import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sesionActual } from "@/lib/admin/sesion";
import { puedeHacer } from "@/lib/admin/usuarios";
import { registrarEnBitacora, pesos } from "@/lib/admin/bitacora";
import { consultarCep, PAGINA_CEP } from "@/lib/admin/banxicoCep";
import { CUENTA_COBRO } from "@/lib/admin/cuentaCobro";
import { cobrosDeReserva, esVerificable } from "@/lib/admin/cobros";

export const dynamic = "force-dynamic";

/**
 * POST → verificar una transferencia contra el banco (12 nov 2026).
 *
 *  · `{ claveRastreo, bancoEmisor, fecha }` → le pregunta al CEP de Banxico.
 *    Lo pueden hacer quienes tienen `verificarCobro` (Erick, Martín, Manolo).
 *  · `{ manual: true }` → «lo vi en la cuenta»: solo `verificarCobroManual`
 *    (Manolo y Martín), para lo que Banxico no cubre (Inbursa→Inbursa,
 *    ventanilla, OXXO).
 *
 * 🔴 Verificar NO cambia lo cobrado ni el estado de la reserva: el cobro ya
 * contaba desde que se registró. Es la prueba de que el dinero sí llegó.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sesion = await sesionActual();
    if (!sesion || !puedeHacer(sesion.rol, "verificarCobro")) {
      return NextResponse.json({ error: "Tu cuenta no puede verificar pagos" }, { status: 403 });
    }
    const b = await req.json().catch(() => ({}));

    const mov = await prisma.movimiento.findUnique({ where: { id: params.id } });
    if (!mov || mov.tipo !== "cobro") return NextResponse.json({ error: "Ese cobro no existe" }, { status: 404 });
    if (mov.anulado) return NextResponse.json({ error: "Ese cobro está anulado" }, { status: 400 });
    if (!esVerificable(mov.metodoPago)) {
      return NextResponse.json({ error: "Solo se verifican transferencias y depósitos (Stripe se confirma solo)." }, { status: 400 });
    }
    if (mov.verificadoEn) {
      return NextResponse.json({ error: "Ese cobro ya está verificado" }, { status: 409 });
    }
    const reserva = mov.reservaId
      ? await prisma.tourBooking.findUnique({ where: { id: mov.reservaId }, select: { confirmationNumber: true, customerName: true } })
      : null;
    const quien = sesion.nombre;
    const etiqueta = `${pesos(mov.monto)}${reserva ? ` — reserva ${reserva.confirmationNumber} (${reserva.customerName})` : ""}`;

    // ── «Lo vi en la cuenta» ────────────────────────────────────────────────
    if (b?.manual === true) {
      if (!puedeHacer(sesion.rol, "verificarCobroManual")) {
        return NextResponse.json({ error: "Darla por vista sin Banxico solo lo hacen Manolo o Martín." }, { status: 403 });
      }
      await prisma.movimiento.update({
        where: { id: mov.id },
        data: { verificadoEn: new Date(), verificadoPor: quien, verificacion: "manual" },
      });
      await registrarEnBitacora({
        accion: "modificó", entidad: "cobro", referencia: reserva?.confirmationNumber,
        resumen: `Verificó a mano (vista en la cuenta) el cobro de ${etiqueta}`,
      });
      return NextResponse.json({
        ok: true, estado: "verificado", mensaje: "Quedó verificado a mano.",
        cobros: mov.reservaId ? await cobrosDeReserva(mov.reservaId) : undefined,
      });
    }

    // ── Con Banxico ─────────────────────────────────────────────────────────
    const claveRastreo = String(b?.claveRastreo ?? mov.claveRastreo ?? "").trim().toUpperCase().slice(0, 30);
    const bancoEmisor  = String(b?.bancoEmisor ?? mov.bancoEmisor ?? "").replace(/\D/g, "").slice(0, 5);
    const fecha        = /^\d{4}-\d{2}-\d{2}$/.test(String(b?.fecha ?? "")) ? String(b.fecha) : mov.fecha;

    const r = await consultarCep({
      fecha, claveRastreo, emisor: bancoEmisor,
      receptor: CUENTA_COBRO.bancoCodigo, cuenta: CUENTA_COBRO.clabe, monto: mov.monto,
    });

    // La clave y el banco se guardan siempre (aunque no se encuentre): así el
    // siguiente intento ya los trae y Manolo ve qué se consultó.
    const detalle = { estado: r.estado, texto: r.textoBanxico ?? r.mensaje, fecha, consultadoPor: quien, consultadoEn: new Date().toISOString() };
    await prisma.movimiento.update({
      where: { id: mov.id },
      data: {
        claveRastreo: claveRastreo || null,
        bancoEmisor: bancoEmisor || null,
        verificacionDetalle: detalle,
        ...(r.estado === "verificado" ? { verificadoEn: new Date(), verificadoPor: quien, verificacion: "banxico" } : {}),
      },
    });
    if (r.estado === "verificado" || r.estado === "no_encontrado") {
      await registrarEnBitacora({
        accion: "modificó", entidad: "cobro", referencia: reserva?.confirmationNumber,
        resumen: r.estado === "verificado"
          ? `Verificó con Banxico el cobro de ${etiqueta} (clave ${claveRastreo})`
          : `Banxico NO encontró la transferencia del cobro de ${etiqueta} (clave ${claveRastreo})`,
      });
    }
    return NextResponse.json({
      ok: r.estado === "verificado",
      estado: r.estado,
      mensaje: r.mensaje,
      textoBanxico: r.textoBanxico,
      paginaCep: PAGINA_CEP,
      cobros: mov.reservaId ? await cobrosDeReserva(mov.reservaId) : undefined,
    });
  } catch (e: any) {
    console.error("admin/cobros/verificar:", e?.message);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
