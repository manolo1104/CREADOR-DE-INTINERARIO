import { NextRequest, NextResponse } from "next/server";
import type { TourBooking } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { checkAgentAuth } from "@/lib/agentAuth";
import { getPaquete } from "@/lib/paquetes";
import { ANTICIPO_PCT } from "@/lib/carrito";
import { metaDe } from "@/lib/admin/reserva";
import { cuandoVence, etapaDe } from "@/lib/vencimientoCotizacion";
import { metaDeCotizacion, resumenDeCotizacion } from "@/lib/cotizaciones/armar";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const mx = (n: number) => `$${Math.round(n).toLocaleString("es-MX")} MXN`;

/** ¿Lleva hotel? Entonces el saldo se paga al hacer check-in, no al guía. */
function conHotel(packageItems: unknown, slug: string | null | undefined): boolean {
  const filas = Array.isArray(packageItems)
    ? (packageItems as Record<string, unknown>[]).filter((p) => p && typeof p === "object" && p._meta !== true)
    : [];
  return filas.length > 0 || !!(slug && getPaquete(slug));
}

/**
 * Lo que se pagó y lo que falta de una reserva, ya redactado para que el bot
 * no tenga que interpretar los números.
 *
 * El saldo se paga el día del tour en efectivo o transferencia (el guía NO
 * cobra con tarjeta, aunque aquí lo decía); con hotel, al hacer check-in.
 */
function resumenPagoReserva(b: TourBooking): string {
  const total = b.totalAmount;
  const dep = b.depositoPagado ?? 0;
  const cuando = conHotel(b.packageItems, b.tourSlug)
    ? "al hacer check-in en el hotel"
    : "el día del tour, en efectivo o transferencia";
  if (b.status === "cancelled") {
    return `Reserva CANCELADA (era por ${mx(total)}). No le confirmes nada ni hables de reembolsos: si pregunta, pásalo al equipo.`;
  }
  // Las «reservas» borrador las dejó el bot de antes: eran cotizaciones.
  if (b.status === "borrador") {
    return `Es una cotización vieja, todavía SIN pago: total ${mx(total)}; se aparta con ${mx(Math.round(total * (ANTICIPO_PCT / 100)))} (${ANTICIPO_PCT} %). `
      + "Si quiere reservar, cotízala de nuevo para que le llegue con su fecha límite.";
  }
  // Con un pago en línea de por medio (Stripe) NO se dice «sin pago»: el
  // depósito pudo no anotarse y eso es justo el caso de abajo, que no adivina.
  if (dep <= 0 && b.status === "pending" && !b.stripePaymentIntentId) {
    const acordado = Number(metaDe(b).anticipoAcordado);
    const anticipo = Number.isFinite(acordado) && acordado > 0 ? acordado : Math.round(total * (ANTICIPO_PCT / 100));
    return `Reserva creada, pero todavía SIN pago registrado (total ${mx(total)}; el anticipo es ${mx(anticipo)}). `
      + "Si dice que ya pagó, pídele el comprobante: el pago lo valida el equipo. NO le digas que está confirmada.";
  }
  // Hay 2 reservas viejas (jul 2026) pagadas sin este dato. Ahí NO se adivina:
  // decir «liquidado» sin saberlo es regalarle el saldo a alguien que quizá lo debe.
  if (dep <= 0) {
    return `No tengo registrado cuánto se pagó de esta reserva (total ${mx(total)}). `
      + "NO le digas al cliente que está liquidada ni que debe algo: dile que el equipo se lo confirma en un momento.";
  }
  const saldo = Math.max(0, total - dep);
  return saldo === 0
    ? `Liquidado: pagó los ${mx(total)} completos. No debe nada.`
    : `Pagó un anticipo de ${mx(dep)} de un total de ${mx(total)}. LE FALTA PAGAR ${mx(saldo)}, que se paga ${cuando}.`;
}

/**
 * GET /api/bot/booking/[folio] — un folio, para consultar_reserva, el
 * comprobante y el aviso de escalación.
 *
 *  · Cotización (COT-, HP-P…): { tipo: "cotizacion", folio, status, tourName,
 *    tourDate, total, anticipo, saldo, venceEl, resumenPago }. Antes daba 404 y
 *    el bot no podía decir ni cuánto apartaba ni hasta cuándo valía.
 *  · Cotización REEMPLAZADA por otra (el cliente cambió algo): { tipo:
 *    "cotizacion", folio, status: "expirada", etapa, reemplazadaPor, tourName,
 *    tourDate, customerName, locale, resumenPago: "Esta cotización fue
 *    reemplazada por COT-…" }, SIN montos ni fecha límite.
 *  · Reserva (HP-M-, HP…): lo de siempre, con `tipo: "reserva"`.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { folio: string } }
) {
  const denied = checkAgentAuth(req);
  if (denied) return denied;

  const folio = String(params.folio || "").trim().toUpperCase();
  if (!folio) {
    return NextResponse.json({ error: "Falta el folio." }, { status: 400 });
  }

  try {
    const q = await prisma.tourQuote.findUnique({ where: { quoteNumber: folio } });
    if (q) {
      const r = resumenDeCotizacion(q);
      const etapa = etapaDe(q);
      const meta = metaDeCotizacion(q.packageItems);
      const esPaquete = conHotel(q.packageItems, typeof meta.paqueteSlug === "string" ? meta.paqueteSlug : q.tourSlug);
      const pct = r.total > 0 ? Math.round((r.anticipo / r.total) * 100) : ANTICIPO_PCT;
      const cuando = esPaquete ? "al hacer check-in en el hotel" : "el día del tour, en efectivo o transferencia";
      // Ya convertida: lo que importa es lo que dice la reserva. La que
      // convirtió el bot guarda su folio en el `_meta`; la que se convirtió
      // desde el panel no, pero su reserva guarda de qué cotización salió (la
      // misma búsqueda de `convertirCotizacionEnReserva`). Si esa búsqueda
      // falla, se contesta igual, sin la reserva.
      const reserva = r.reservaFolio
        ? await prisma.tourBooking.findUnique({ where: { confirmationNumber: r.reservaFolio } })
        : r.status === "aceptada"
          ? await prisma.tourBooking.findFirst({
              where:   { lineItems: { array_contains: [{ cotizacionOrigen: q.quoteNumber }] } },
              orderBy: { createdAt: "asc" },
            }).catch(() => null)
          : null;

      // Reemplazada por otra del mismo cliente (cambió el tour, la fecha, la
      // gente o el hotel): ya no vale. Van SIN montos ni fecha límite a
      // propósito: con ellos el bot le repetía al cliente el anticipo viejo.
      // Si de todos modos terminó en reserva (pagó con el folio viejo y el
      // equipo la convirtió), manda la reserva, como abajo.
      if (!reserva && r.status === "expirada" && r.reemplazadaPor) {
        return NextResponse.json({
          tipo:           "cotizacion",
          folio:          r.folio,
          status:         "expirada",
          etapa,
          reemplazadaPor: r.reemplazadaPor,
          tourName:       r.tourName,
          tourDate:       r.tourDate,
          customerName:   r.customerName,
          locale:         r.locale,
          resumenPago:    `Esta cotización fue reemplazada por ${r.reemplazadaPor}.`,
        });
      }

      let resumenPago: string;
      if (reserva) {
        resumenPago = `Esta cotización ya es la reserva ${reserva.confirmationNumber}. ${resumenPagoReserva(reserva)}`;
      } else if (r.status === "aceptada") {
        resumenPago = "La cotización está ACEPTADA (ya pagó o el equipo la convirtió en reserva desde el panel), pero aquí no tengo el folio de su reserva. "
          + "No le pidas otro pago: dile que el equipo le confirma en un momento.";
      } else if (etapa === "vencida") {
        resumenPago = `Cotización VENCIDA${r.venceEl ? ` (valía hasta ${cuandoVence(r.venceEl, "es")})` : ""} y SIN pago registrado: ya no le aparta lugar. `
          + "Ofrécele cotizarla de nuevo con la fecha que quiera.";
      } else if (r.status === "borrador") {
        // Una del bot solo se queda en borrador si falló anotar el envío: el
        // cliente SÍ tiene el resumen por WhatsApp, así que no se dice «no se le mandó».
        resumenPago = `Cotización SIN pago (en el panel sigue como borrador): total ${mx(r.total)}; se aparta con ${mx(r.anticipo)} (${pct} %) y el resto, ${mx(r.saldo)}, se paga ${cuando}. `
          + "NO es una reserva confirmada: se confirma cuando el equipo valida el pago.";
      } else {
        resumenPago = `Cotización ENVIADA, todavía SIN pago: total ${mx(r.total)}. Aparta con ${mx(r.anticipo)} (${pct} %) y el resto, ${mx(r.saldo)}, se paga ${cuando}.`
          + (r.venceEl ? ` Vale hasta ${cuandoVence(r.venceEl, "es")}.` : "")
          + " NO es una reserva confirmada: se confirma cuando el equipo valida el pago.";
      }

      return NextResponse.json({
        tipo:         "cotizacion",
        folio:        r.folio,
        status:       r.status,
        // borrador | enviada | por-vencer | aceptada | vencida (la que pinta el panel).
        etapa,
        tourName:     r.tourName,
        tourDate:     r.tourDate,
        adults:       q.adults,
        children:     q.children,
        total:        r.total,
        anticipo:     r.anticipo,
        saldo:        r.saldo,
        pctAnticipo:  pct,
        venceEl:      r.venceEl,
        esPaquete,
        customerName: r.customerName,
        locale:       r.locale,
        reservaFolio: reserva?.confirmationNumber ?? r.reservaFolio,
        resumenPago,
      });
    }

    const b = await prisma.tourBooking.findUnique({
      where: { confirmationNumber: folio },
    });

    if (!b) {
      return NextResponse.json({ error: `No existe ninguna cotización ni reserva con el folio ${folio}.` }, { status: 404 });
    }

    // ⚠️ Qué se pagó y qué falta.
    // Esto NO se devolvía: el bot solo veía `totalAmount` y `status: "paid"`, así
    // que a quien reservó EN LÍNEA —donde se cobra el anticipo del 30 %— Camila
    // le decía que su reserva estaba pagada por el total. El cliente se enteraba
    // del saldo el día del tour.
    //
    // `status: "paid"` significa RESERVA CONFIRMADA, no liquidada: el anticipo ya
    // aparta el lugar. Lo que dice cuánto entró es `depositoPagado`.
    const conDato   = b.depositoPagado != null && b.depositoPagado > 0;
    const pagado    = conDato ? b.depositoPagado! : null;
    const saldo     = conDato ? Math.max(0, b.totalAmount - pagado!) : null;
    const liquidado = conDato ? saldo === 0 : null;

    return NextResponse.json({
      tipo: "reserva",
      folio: b.confirmationNumber,
      tourName: b.tourName,
      tourSlug: b.tourSlug,
      tourDate: b.tourDate,
      adults: b.adults,
      children: b.children,
      totalAmount: b.totalAmount,
      status: b.status, // pending | paid | cancelled (y «borrador», las del bot viejo)
      pagado,
      saldo,
      liquidado,
      pctPagado: conDato ? Math.round((pagado! / Math.max(1, b.totalAmount)) * 100) : null,
      // Con hotel el saldo se paga al hacer check-in (el bot lo dice distinto).
      esPaquete: conHotel(b.packageItems, b.tourSlug),
      // Redactado para que el bot no tenga que interpretar los números.
      resumenPago: resumenPagoReserva(b),
      customerName: b.customerName,
      customerPhone: b.customerPhone,
      createdAt: b.createdAt,
    });
  } catch (e: unknown) {
    console.error("❌ bot/booking:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "No se pudo consultar el folio." }, { status: 500 });
  }
}
