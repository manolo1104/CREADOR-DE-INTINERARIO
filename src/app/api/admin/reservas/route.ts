import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cerrarCarritosDe, toursDeReserva } from "@/lib/cerrarCarrito";
import { origenValido } from "@/lib/origenReserva";
import { registrarEnBitacora, pesos } from "@/lib/admin/bitacora";
import { sesionActual } from "@/lib/admin/sesion";
import { sellarEnLineItems, resumenEvento } from "@/lib/admin/descuento";
import { codigoCumpleAlGuardar, liberarCodigoCumple } from "@/lib/encuestas/cumple";
import { hoyMX } from "@/lib/dates";
import { leadDesdeReserva, leadParaReservaSinLead } from "@/lib/admin/crmDatos";
import { abonarLigasDeCotizacion } from "@/lib/admin/linksPago";
import { pedidosSinCupo } from "@/lib/cupoTour";
import { crearReservaDeCotizacion, esErrorCotizacion } from "@/lib/cotizaciones/convertir";
import { avisoSobrecupo, pedidosDeCupo } from "@/lib/cotizaciones/reglasConversion";
import { puedeHacer } from "@/lib/admin/usuarios";
import { dineroAlCrearReserva } from "@/lib/admin/candadosCobro";

/** El lead que manda el panel, solo si existe (un id roto no se guarda). */
async function leadExistente(v: unknown): Promise<string | null> {
  if (typeof v !== "string" || !v || v.length > 40) return null;
  const op = await prisma.oportunidad.findUnique({ where: { id: v }, select: { id: true } }).catch(() => null);
  return op?.id ?? null;
}

/** El lead vigente de la cotización que se está convirtiendo. */
async function leadDeCotizacion(v: unknown): Promise<string | null> {
  if (typeof v !== "string" || !v || v.length > 40) return null;
  const q = await prisma.tourQuote.findUnique({ where: { id: v }, select: { oportunidadId: true } }).catch(() => null);
  return q?.oportunidadId ?? null;
}

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.toLowerCase() || "";
    const bookings = await prisma.tourBooking.findMany({ orderBy: { createdAt: "desc" } });
    const filtered = bookings.filter(b => !search ||
      [b.customerName, b.customerEmail, b.confirmationNumber, b.tourName]
        .some(v => v?.toLowerCase().includes(search))
    );
    return NextResponse.json(filtered);
  } catch (e: any) { console.error("admin/reservas:", e?.message); return NextResponse.json({ error: "Error interno" }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body?.confirmationNumber || !body?.customerName) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
    }
    // El descuento se sella aquí con quién lo puso (ver `descuento.ts`).
    const sesion = await sesionActual();
    const sellado = sellarEnLineItems(body.lineItems, null, sesion?.nombre ?? "Desconocido");
    // El código de cumpleaños se canjea ANTES de crear: si ya se usó, no se
    // guarda una reserva con un descuento que no le toca.
    const folio = String(body.confirmationNumber);
    const cumple = await codigoCumpleAlGuardar(sellado.lineItems, null, folio, hoyMX());
    if (!cumple.ok) return NextResponse.json({ error: cumple.error }, { status: 409 });
    // Whitelist de campos permitidos (evita asignación masiva de columnas inesperadas).
    // ¿Cabe? (revisión del 4 nov 2026): el panel no revisaba el cupo al capturar.
    // No se bloquea —a veces se suma una unidad—, pero queda en la nota y se avisa.
    // (La regla vive en `reglasConversion.ts`: la usa también la conversión de cotizaciones.)
    const pedidosCupo = pedidosDeCupo(sellado.lineItems, body);
    const sinLugar = pedidosCupo.length ? await pedidosSinCupo(pedidosCupo).catch(() => []) : [];
    const avisoCupo = avisoSobrecupo(sinLugar, "capturada en el panel");
    const cotizacionId = typeof body.cotizacionId === "string" && body.cotizacionId ? body.cotizacionId.slice(0, 40) : null;
    // 🔴 Lo cobrado sale de los renglones de cobro (lote 3, 5 nov 2026): quien no
    // es socio ya no puede crearla con depósito ni «pagada» mandándolo por la API
    // (el PATCH ya lo impedía; el panel manda 0 y «pending»).
    const dinero = dineroAlCrearReserva(body, !!sesion && puedeHacer(sesion.rol, "anularMovimiento"));
    // 🔴 Con `cotizacionId` (5 nov 2026): candado sobre la cotización y 409 si
    // ya tiene una reserva viva (la liga pagada la convirtió sola, otra persona
    // la convirtió o fue un doble clic). La cotización queda «aceptada» con su
    // folio en la misma transacción. El cuadro de Convertir ya no llega aquí
    // (usa /api/admin/cotizaciones/[id]/convertir): esto es por si algo más lo llama.
    const booking = await crearReservaDeCotizacion({
      confirmationNumber:    String(body.confirmationNumber),
      tourId:                body.tourId    ?? "",
      tourName:              body.tourName  ?? "",
      tourSlug:              body.tourSlug  ?? "",
      tourDate:              body.tourDate  ?? "",
      adults:                Number(body.adults)   || 1,
      children:              Number(body.children) || 0,
      totalAmount:           Math.round(Number(body.totalAmount) || 0),
      depositoPagado:        dinero.depositoPagado,
      promoCode:             body.promoCode || null,
      promoDiscount:         Number(body.promoDiscount) || 0,
      stripePaymentIntentId: body.stripePaymentIntentId || null,
      customerName:          String(body.customerName),
      customerEmail:         body.customerEmail || "",
      customerPhone:         body.customerPhone || null,
      notes:                 [avisoCupo, body.notes].filter(Boolean).join("\n") || null,
      lineItems:             (sellado.lineItems as any) ?? undefined,
      packageItems:          body.packageItems ?? undefined,
      extraItems:            body.extraItems   ?? undefined,
      // Sin estado explícito, lo dice el dinero (antes nacía «pagada» con $0).
      status:                dinero.status,
      guia:                  body.guia ? String(body.guia).slice(0, 80) : null,
      idiomaTour:            body.idiomaTour === "en" ? "en" : "es",
      // Una reserva capturada a mano casi nunca entró por la web: el
      // formulario obliga a elegirlo; si una llamada vieja no lo manda, queda
      // «por confirmar» y NO «web» (línea base 3 nov 2026: Web 90 de 97).
      origen:                origenValido(body.origen, "por_confirmar"),
      // El lead del que viene (al convertir una cotización): se mide la conversión real.
      oportunidadId:         (await leadExistente(body.oportunidadId)) ?? (await leadDeCotizacion(body.cotizacionId)),
      // La cotización que se convirtió (KPI «Cotización → reserva», 4 nov 2026).
      cotizacionId,
    }).catch(async (e) => {
      // No se creó: el código vuelve a quedar libre.
      if (cumple.canjeado) await liberarCodigoCumple(cumple.canjeado, folio);
      throw e;
    });
    // La venta ya está cerrada: apaga el carrito abandonado que la originó.
    // Sin esto el cron de recuperación le sigue escribiendo "¿Apartamos tu
    // lugar?" a alguien que ya pagó — y este panel es justo por donde entran
    // las ventas de los links de pago manuales.
    const cerrados = await cerrarCarritosDe(booking.customerEmail, toursDeReserva(body));
    if (cerrados) {
      console.log(`🛟  admin/reservas: ${cerrados} carrito(s) cerrados para ${booking.customerEmail}`);
    }

    await registrarEnBitacora({
      accion:     "creó",
      entidad:    "reserva",
      referencia: booking.confirmationNumber,
      resumen:    `Reserva ${booking.confirmationNumber} — ${booking.customerName}, ${booking.tourName || "sin tour"} el ${booking.tourDate || "sin fecha"}, ${pesos(booking.totalAmount)}`
        + (sellado.evento ? ` · ${resumenEvento(sellado.evento)}` : "")
        + (cumple.resumen ? ` · ${cumple.resumen}` : ""),
    });

    // Sin lead (capturada directo en Reservas): entra al CRM con el de esa persona o uno nuevo.
    // Su etapa la pone `leadDesdeReserva` de abajo, ya con lo abonado por liga.
    if (!booking.oportunidadId) await leadParaReservaSinLead(booking.id, sesion?.nombre ?? "Desconocido", { recalcular: false });
    // Lo que ya se pagó con la liga de pago de su cotización se abona aquí (antes la reserva nacía en $0).
    const abonadoPorLiga = cotizacionId
      ? await abonarLigasDeCotizacion(cotizacionId, booking.id).catch(e => { console.error("abonarLigasDeCotizacion:", (e as Error)?.message); return 0; })
      : 0;
    await leadDesdeReserva(booking.id, `reserva ${booking.confirmationNumber} creada`, { conContacto: true, revivir: true });
    return NextResponse.json({ ok: true, id: booking.id, carritosCerrados: cerrados, abonadoPorLiga, avisoCupo });
  } catch (e: any) {
    // La cotización ya tenía reserva: se dice cuál, sin crear otra.
    if (esErrorCotizacion(e)) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("admin/reservas:", e?.message); return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
