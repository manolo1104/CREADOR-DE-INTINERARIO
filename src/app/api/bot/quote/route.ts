import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAgentAuth } from "@/lib/agentAuth";
import { TOURS_DB, incluyeDeTour } from "@/lib/tours";
import { calcTourTotal, validatePromoCode, minBookingDate } from "@/lib/tourBooking";
import { DATOS_BANCO } from "@/lib/bot/bankData";
import { sendBrevoEmail } from "@/lib/brevo";
import { metaAlEnviar, conMeta } from "@/lib/quoteFollowUp";
import { buildTourQuoteEmailHtml } from "@/lib/tourEmail";

/** Envía por correo la cotización del bot. Devuelve true si se envió. */
async function enviarCorreoCotizacion(data: {
  customerEmail?: string; customerName: string; folio: string;
  tourName: string; tourSlug: string; tourDate: string;
  adults: number; children: number; totalAmount: number; notes?: string;
  lineItems?: any[]; packageItems?: any[];
}): Promise<boolean> {
  if (!data.customerEmail) return false;
  try {
    const html = buildTourQuoteEmailHtml({
      customerName: data.customerName,
      quoteNumber:  data.folio,
      tourName:     data.tourName,
      tourDate:     data.tourDate,
      tourSlug:     data.tourSlug,
      adults:       data.adults,
      children:     data.children,
      totalAmount:  data.totalAmount,
      notes:        data.notes,
      lineItems:    data.lineItems,
      packageItems: data.packageItems,
    });
    const adminTo = process.env.ADMIN_EMAIL_TOURS || "daftpunkmanolo@gmail.com";
    await sendBrevoEmail({
      to:  [{ email: data.customerEmail, name: data.customerName }],
      bcc: data.customerEmail !== adminTo ? [{ email: adminTo }] : [],
      subject: `Tu cotización de tour está lista — ${data.folio}`,
      htmlContent: html,
    });
    return true;
  } catch (e: any) {
    console.error("❌ correo cotización bot:", e?.message);
    return false;
  }
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/bot/quote
 * Crea una reserva "pendiente de pago" (TourBooking status="pending") con folio,
 * para el flujo de cotización + transferencia del bot de WhatsApp.
 *
 * El PRECIO lo calcula el servidor desde TOURS_DB (fuente de verdad). El bot
 * nunca decide el monto — solo manda slug, personas y datos del cliente.
 */
export async function POST(req: NextRequest) {
  const denied = checkAgentAuth(req);
  if (denied) return denied;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const {
    tourSlug,
    tourDate,
    adults,
    childrenMid = 0,
    childrenSmall = 0,
    customerName,
    customerPhone,
    customerEmail,
    promoCode,
    notes,
  } = body ?? {};

  // ── Validaciones ───────────────────────────────────────────────
  const tour = TOURS_DB.find((t) => t.slug === tourSlug);
  if (!tour) {
    return NextResponse.json({ error: `Tour no encontrado: ${tourSlug}` }, { status: 400 });
  }
  if (tour.precioUnidad === "vehiculo") {
    return NextResponse.json(
      { error: "Este tour se cobra por vehículo (según ruta y unidad) y se cotiza por WhatsApp, no por persona." },
      { status: 400 }
    );
  }

  const nAdults = Math.max(0, parseInt(String(adults), 10) || 0);
  const nMid    = Math.max(0, parseInt(String(childrenMid), 10) || 0);
  const nSmall  = Math.max(0, parseInt(String(childrenSmall), 10) || 0);
  const totalPersonas = nAdults + nMid + nSmall;

  if (nAdults < 1) {
    return NextResponse.json({ error: "Se requiere al menos 1 adulto." }, { status: 400 });
  }
  if (totalPersonas < tour.groupMin) {
    return NextResponse.json(
      { error: `Este tour requiere mínimo ${tour.groupMin} personas.` },
      { status: 400 }
    );
  }
  if (!customerName || String(customerName).trim().length < 2) {
    return NextResponse.json({ error: "Falta el nombre del cliente." }, { status: 400 });
  }
  if (!tourDate || !/^\d{4}-\d{2}-\d{2}$/.test(String(tourDate))) {
    return NextResponse.json({ error: "Fecha inválida (formato YYYY-MM-DD)." }, { status: 400 });
  }
  if (String(tourDate) < minBookingDate()) {
    return NextResponse.json(
      { error: "La fecha debe ser a partir de mañana." },
      { status: 400 }
    );
  }

  // ── Promo + precio (servidor) ──────────────────────────────────
  let promoDiscount = 0;
  let promoApplied: string | null = null;
  if (promoCode) {
    const v = validatePromoCode(String(promoCode));
    if (v.valid) {
      promoDiscount = v.discount;
      promoApplied = String(promoCode).trim().toUpperCase();
    }
  }

  const { total, subtotal } = calcTourTotal(tour.precio, nAdults, nMid, nSmall, promoDiscount);

  // ── Folio + persistencia ───────────────────────────────────────
  const folio = "HP" + Date.now().toString(36).toUpperCase();
  const appUrl = (process.env.APP_URL || "https://www.huasteca-potosina.com").replace(/\/$/, "");

  try {
    await prisma.tourBooking.create({
      data: {
        confirmationNumber: folio,
        // Esta ruta la llama el bot de WhatsApp: la venta se cerró en el chat,
        // no en la web. Es el único sitio que lo sabe con certeza.
        origen:   "whatsapp",
        tourId:   tour.id,
        tourName: tour.nombre,
        tourSlug: tour.slug,
        tourDate: String(tourDate),
        adults:   nAdults,
        children: nMid + nSmall,
        totalAmount:   total,
        depositoPagado: 0,
        promoCode:     promoApplied,
        promoDiscount,
        customerName:  String(customerName).trim(),
        customerEmail: customerEmail ? String(customerEmail).trim() : "",
        customerPhone: customerPhone ? String(customerPhone).replace(/\D/g, "") : null,
        notes:         notes ? String(notes) : null,
        lineItems: [
          {
            tourSlug: tour.slug,
            tourName: tour.nombre,
            tourDate: String(tourDate),
            adults: nAdults,
            childrenMid: nMid,
            childrenSmall: nSmall,
            subtotal,
          },
        ],
        // "borrador", no "pending": ese estado no existe en el panel
        // (`borrador | enviada | aceptada | expirada`), así que estas
        // cotizaciones aparecían sin etiqueta y fuera del conteo del tablero.
        // Pasa a "enviada" abajo, y solo si el correo de verdad salió.
        status: "borrador",
      },
    });
  } catch (e: any) {
    console.error("❌ bot/quote prisma:", e?.message);
    return NextResponse.json({ error: "No se pudo crear la cotización." }, { status: 500 });
  }

  const emailEnviado = await enviarCorreoCotizacion({
    customerEmail: customerEmail ? String(customerEmail).trim() : undefined,
    customerName: String(customerName).trim(),
    folio, tourName: tour.nombre, tourSlug: tour.slug, tourDate: String(tourDate),
    adults: nAdults, children: nMid + nSmall, totalAmount: total,
    notes: notes ? String(notes) : undefined,
  });

  // El estado y el arranque del seguimiento se escriben DESPUÉS del envío: si
  // Brevo falla, la cotización no puede decir "enviada" ni contar los días de
  // la secuencia desde un correo que nadie recibió.
  if (emailEnviado) {
    try {
      const creada = await prisma.tourQuote.findUnique({ where: { quoteNumber: folio } });
      await prisma.tourQuote.update({
        where: { quoteNumber: folio },
        data:  {
          status:    "enviada",
          lineItems: conMeta(creada?.lineItems, metaAlEnviar(String(tourDate), "es")) as never,
        },
      });
    } catch (e: any) {
      console.error("❌ bot/quote seguimiento:", e?.message);
    }
  }

  // ── Resumen para WhatsApp ──────────────────────────────────────
  // El cliente pide la cotización POR WHATSAPP, no solo por correo: mucha
  // gente da un correo que no revisa en el momento, y quedarse esperando el
  // mail mata la venta. Se arma aquí y no en el modelo, por lo mismo que en
  // /api/bot/paquete: pedirlo por prompt hacía que el bot se saltara el
  // desglose y soltara la CLABE sin decir qué se estaba apartando.
  const fmx = (n: number) => `$${n.toLocaleString("es-MX")}`;
  const fechaLarga = (d: string) => {
    const r = new Date(d + "T12:00:00").toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
    return r.charAt(0).toUpperCase() + r.slice(1);
  };
  // Los niños se desglosan: decir solo "4 personas" esconde que unos pagan el
  // 70 % y el cliente no puede cuadrar el total con lo que pidió.
  const desglosePersonas = [
    `${nAdults} adulto${nAdults !== 1 ? "s" : ""}`,
    nMid > 0 ? `${nMid} niño${nMid !== 1 ? "s" : ""} 6–10` : "",
    nSmall > 0 ? `${nSmall} menor${nSmall !== 1 ? "es" : ""} de 6` : "",
  ].filter(Boolean).join(" + ");

  // ⚠️ El transporte NO es igual en todos los tours (el RZR sale de la base en
  // Xilitla, el buceo se encuentra en Rioverde, el rappel en el embarcadero).
  // Se lee del "incluye" de ESTE tour en vez de prometer recogida siempre.
  const incluyeTour = incluyeDeTour(tour);
  const traeTraslado = /(transporte|traslado)[^.]*desde tu (hotel|hospedaje)/i.test(incluyeTour.join(" · "));

  const anticipo = Math.round(total * 0.3);
  const resumenWhatsApp = [
    `📋 *Tu cotización* — folio ${folio}`,
    "",
    `*${tour.nombre}*`,
    `${fechaLarga(String(tourDate))}`,
    `${desglosePersonas} · ${fmx(total)}`,
    ...(promoApplied ? [`Descuento aplicado: *${promoApplied}* (−${fmx(subtotal - total)})`] : []),
    "",
    "*Incluye:*",
    ...incluyeTour.map((i) => `• ${i}`),
    "",
    `*Total: ${fmx(total)} MXN*`,
    `*Apartas hoy con ${fmx(anticipo)}* (30 %) y el resto (${fmx(total - anticipo)}) lo liquidas el día del recorrido.`,
    "",
    traeTraslado
      ? "Pasamos por ti a tu hospedaje, en Xilitla o en Ciudad Valles — no necesitas hospedarte con nosotros."
      : "Este recorrido no incluye traslado desde tu hospedaje: el punto de encuentro te lo confirmamos al reservar.",
    "Cancelas gratis hasta 48 h antes, con reembolso completo.",
    "",
    `⏳ Esta cotización tiene vigencia de *48 horas*. En temporada alta y fines de semana conviene apartar cuanto antes: los lugares se llenan rápido.`,
    "",
    `⚠️ Al hacer la transferencia, pon *${folio}* como concepto — con eso identificamos tu pago.`,
  ].join("\n");

  return NextResponse.json({
    folio,
    total,
    anticipo,
    pctAnticipo: 30,
    saldo: total - anticipo,
    moneda: "MXN",
    personas: totalPersonas,
    tourName: tour.nombre,
    tourDate,
    datosBanco: DATOS_BANCO,
    linkPago: `${appUrl}/reservar-tour/${tour.slug}`,
    emailEnviado,
    resumenWhatsApp,
    instruccion: "MANDA `resumenWhatsApp` TAL CUAL como primer mensaje, antes de cualquier dato bancario.",
  });
}
