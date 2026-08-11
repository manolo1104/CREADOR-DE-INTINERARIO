import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TOURS_DB } from "@/lib/tours";
import { calcTourTotal, minBookingDate } from "@/lib/tourBooking";
import { buildPaquetePersonalizadoEmailHtml } from "@/lib/tourEmail";
import { sendBrevoEmail } from "@/lib/brevo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Anticipo estándar. Misma cifra que `tourPricing.ts` y que el sitio. */
const PCT_ANTICIPO = 30;

/**
 * Tarifa por noche del Hotel Paraíso Encantado para cotizar hospedaje suelto.
 *
 * ⚠️ El sitio NO tiene este dato: los paquetes traen el hospedaje empaquetado y
 * el desglose de `valor` en `paquetes.ts` es un ancla de marketing, no la
 * tarifa real. El API del hotel solo devuelve disponibilidad, sin precios.
 *
 * Mientras no esté configurada, el hospedaje se suma al itinerario SIN monto y
 * se le dice al cliente que el equipo le pasa la tarifa. Preferimos eso a
 * inventar un precio: el cliente lo está usando para decidir con su dinero.
 *
 * Para activarlo: pon HOSPEDAJE_TARIFA_NOCHE en el entorno del sitio.
 */
const TARIFA_NOCHE = Number(process.env.HOSPEDAJE_TARIFA_NOCHE) || null;
/** Suplemento de la habitación Jungla (vista a la montaña). Sí está en el sitio. */
const SUPLEMENTO_JUNGLA = 400;

const DATOS_BANCO = {
  banco:    "BBVA",
  titular:  "Tours Huasteca Potosina",
  clabe:    process.env.BANCO_CLABE   ?? "",
  cuenta:   process.env.BANCO_CUENTA  ?? "",
};

interface ItemEntrada {
  slug?: string;
  tourDate?: string;
  adultos?: number;
  ninosMid?: number;
  ninosSmall?: number;
}

/**
 * POST /api/bot/paquete
 *
 * Cotiza un PAQUETE A MEDIDA: varios tours con sus propias fechas, en un solo
 * folio y un solo correo. Antes el bot solo podía cotizar un tour a la vez
 * (`/api/bot/quote` recibe un `slug`), así que a un cliente que quería tres
 * recorridos le generaba tres folios y tres correos sueltos.
 *
 * El hospedaje es OPCIONAL y así se comunica: los tours pasan por el cliente a
 * su hospedaje en Xilitla o en Ciudad Valles, sea nuestro o no.
 *
 * El PRECIO lo calcula el servidor desde TOURS_DB. El bot solo manda qué tours,
 * qué fechas y cuánta gente — nunca decide el monto.
 */
export async function POST(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.AGENT_API_TOKEN}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { items, customerName, customerEmail, customerPhone, hospedaje, notes } = body ?? {};

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Manda al menos un tour en `items`." }, { status: 400 });
  }
  if (items.length > 8) {
    return NextResponse.json({ error: "Máximo 8 recorridos por paquete." }, { status: 400 });
  }
  if (!customerName || !String(customerName).trim()) {
    return NextResponse.json({ error: "Falta el nombre del cliente." }, { status: 400 });
  }

  const minDate = minBookingDate();
  const lineItems: any[] = [];
  let total = 0;

  for (const raw of items as ItemEntrada[]) {
    const tour = TOURS_DB.find((t) => t.slug === raw.slug || t.id === raw.slug);
    if (!tour) {
      return NextResponse.json({ error: `No existe el tour "${raw.slug}".` }, { status: 400 });
    }
    // El RZR se cobra por vehículo (flota × ruta), no por persona: mezclarlo
    // aquí daría un total falso.
    if (tour.precioUnidad === "vehiculo") {
      return NextResponse.json(
        { error: `${tour.nombre} se cobra por vehículo y no puede ir en un paquete por persona. Cotízalo aparte.` },
        { status: 400 },
      );
    }
    if (!raw.tourDate || !/^\d{4}-\d{2}-\d{2}$/.test(String(raw.tourDate))) {
      return NextResponse.json({ error: `Falta la fecha (AAAA-MM-DD) de ${tour.nombre}.` }, { status: 400 });
    }
    if (String(raw.tourDate) < minDate) {
      return NextResponse.json(
        { error: `La fecha de ${tour.nombre} debe ser a partir del ${minDate}.` },
        { status: 400 },
      );
    }

    const adultos = Math.max(0, parseInt(String(raw.adultos ?? 0), 10) || 0);
    const mid     = Math.max(0, parseInt(String(raw.ninosMid ?? 0), 10) || 0);
    const small   = Math.max(0, parseInt(String(raw.ninosSmall ?? 0), 10) || 0);
    const personas = adultos + mid + small;

    if (personas < tour.groupMin) {
      return NextResponse.json({ error: `${tour.nombre} requiere mínimo ${tour.groupMin} personas.` }, { status: 400 });
    }
    if (personas > tour.groupMax) {
      return NextResponse.json({ error: `${tour.nombre} admite máximo ${tour.groupMax} personas por salida.` }, { status: 400 });
    }
    if (tour.soloAdultos && mid + small > 0) {
      return NextResponse.json({ error: `${tour.nombre} es solo para mayores; no aplica precio de niños.` }, { status: 400 });
    }

    const { subtotal } = calcTourTotal(tour.precio, adultos, mid, small, 0);
    total += subtotal;

    lineItems.push({
      tourSlug: tour.slug,
      tourName: tour.nombre,
      tourDate: String(raw.tourDate),
      adults: adultos,
      childrenMid: mid,
      childrenSmall: small,
      subtotal,
    });
  }

  // Se ordena por fecha para que el itinerario del correo se lea como el viaje.
  lineItems.sort((a, b) => a.tourDate.localeCompare(b.tourDate));

  // ── Hospedaje (opcional) ───────────────────────────────────────
  // Entra al MISMO folio y al mismo correo. Antes el bot tenía que decirle al
  // cliente que la habitación "la confirma el equipo aparte", que es justo
  // donde se caía la conversación.
  const packageItems: any[] = [];
  let hospedajeSubtotal: number | null = null;
  let hospedajeSinTarifa = false;

  if (hospedaje?.interesado) {
    const noches = Math.max(0, parseInt(String(hospedaje.noches ?? 0), 10) || 0);
    const habitaciones = Math.max(1, parseInt(String(hospedaje.habitaciones ?? 1), 10) || 1);
    const esJungla = /jungla/i.test(String(hospedaje.habitacion ?? ""));

    if (TARIFA_NOCHE && noches > 0) {
      const porNoche = TARIFA_NOCHE + (esJungla ? SUPLEMENTO_JUNGLA : 0);
      hospedajeSubtotal = porNoche * noches * habitaciones;
      total += hospedajeSubtotal;
    } else {
      // Sin tarifa configurada no se inventa un monto: se deja marcado.
      hospedajeSinTarifa = true;
    }

    packageItems.push({
      hotel: "Hotel Paraíso Encantado (Xilitla)",
      habitacion: hospedaje.habitacion ?? null,
      noches: noches || null,
      habitaciones,
      checkin: hospedaje.checkin ?? null,
      checkout: hospedaje.checkout ?? null,
      subtotal: hospedajeSubtotal,
      _meta: hospedajeSinTarifa ? "tarifa_pendiente" : "cotizado",
    });
  }

  const hosp     = packageItems[0];
  const anticipo = Math.round((total * PCT_ANTICIPO) / 100);
  const folio    = "HP-P" + Date.now().toString(36).toUpperCase();
  const appUrl   = (process.env.APP_URL || "https://www.huasteca-potosina.com").replace(/\/$/, "");

  try {
    await prisma.tourBooking.create({
      data: {
        confirmationNumber: folio,
        tourId:   "paquete-personalizado",
        tourName: `Paquete a medida · ${lineItems.length} recorridos`,
        tourSlug: "paquete-personalizado",
        tourDate: lineItems[0].tourDate,
        adults:   Math.max(...lineItems.map((l) => l.adults)),
        children: Math.max(...lineItems.map((l) => l.childrenMid + l.childrenSmall)),
        totalAmount:    total,
        depositoPagado: 0,
        promoCode:      null,
        promoDiscount:  0,
        customerName:  String(customerName).trim(),
        customerEmail: customerEmail ? String(customerEmail).trim() : "",
        customerPhone: customerPhone ? String(customerPhone).replace(/\D/g, "") : null,
        notes: notes ? String(notes) : null,
        lineItems,
        packageItems,
        status: "pending",
      },
    });
  } catch (e: any) {
    console.error("❌ bot/paquete prisma:", e?.message);
    return NextResponse.json({ error: "No se pudo crear la cotización." }, { status: 500 });
  }

  let emailEnviado = false;
  if (customerEmail) {
    try {
      const html = buildPaquetePersonalizadoEmailHtml({
        customerName: String(customerName).trim(),
        folio,
        lineItems,
        total,
        anticipo,
        pctAnticipo: PCT_ANTICIPO,
        hospedajeInteresado: Boolean(hospedaje?.interesado),
        hospedaje: hosp
          ? {
              hotel: hosp.hotel,
              habitacion: hosp.habitacion,
              noches: hosp.noches,
              habitaciones: hosp.habitaciones,
              checkin: hosp.checkin,
              checkout: hosp.checkout,
              subtotal: hosp.subtotal,
              tarifaPendiente: hospedajeSinTarifa,
            }
          : undefined,
        notes: notes ? String(notes) : undefined,
      });
      const adminTo = process.env.ADMIN_EMAIL_TOURS || "daftpunkmanolo@gmail.com";
      await sendBrevoEmail({
        to:  [{ email: String(customerEmail).trim(), name: String(customerName).trim() }],
        bcc: String(customerEmail).trim() !== adminTo ? [{ email: adminTo }] : [],
        subject: `Tu viaje a la Huasteca, armado a tu medida — ${folio}`,
        htmlContent: html,
      });
      emailEnviado = true;
    } catch (e: any) {
      console.error("❌ correo paquete personalizado:", e?.message);
    }
  }

  // El resumen se arma AQUÍ, no en el modelo. Pedirlo por prompt no funcionó:
  // el bot saltaba directo a los datos bancarios sin enseñar qué se estaba
  // apartando. Igual que `toWhatsAppFormat()`, esto es determinista.
  const fmx = (n: number) => `$${n.toLocaleString("es-MX")}`;
  const fechaLarga = (d: string) => {
    const r = new Date(d + "T12:00:00").toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
    return r.charAt(0).toUpperCase() + r.slice(1);
  };
  // Se desglosan los niños: decir solo "4 personas" escondía que dos pagan el
  // 70 %, y el cliente no podía cuadrar el subtotal con lo que pidió.
  const personasDe = (l: any) =>
    [
      `${l.adults} adulto${l.adults !== 1 ? "s" : ""}`,
      l.childrenMid > 0 ? `${l.childrenMid} niño${l.childrenMid !== 1 ? "s" : ""} 6–10` : "",
      l.childrenSmall > 0 ? `${l.childrenSmall} menor${l.childrenSmall !== 1 ? "es" : ""} de 6` : "",
    ]
      .filter(Boolean)
      .join(" + ");

  const lineaHospedaje = hosp
    ? [
        "",
        "*Hospedaje*",
        `${hosp.hotel}${hosp.habitacion ? ` · ${hosp.habitacion}` : ""}`,
        `${hosp.noches ? `${hosp.noches} noche${hosp.noches !== 1 ? "s" : ""}` : "fechas por confirmar"}${hosp.checkin ? ` · ${fechaLarga(hosp.checkin)}` : ""}${hosp.habitaciones > 1 ? ` · ${hosp.habitaciones} habitaciones` : ""}`,
        hospedajeSinTarifa
          ? "Tarifa: te la confirma el equipo hoy mismo — no va incluida en el total de abajo."
          : `${fmx(hospedajeSubtotal!)}`,
      ]
    : [];

  const resumenWhatsApp = [
    `📋 *Tu paquete a la medida* — folio ${folio}`,
    "",
    ...lineItems.map((l, i) =>
      `*Día ${i + 1} · ${fechaLarga(l.tourDate)}*\n${l.tourName}\n${personasDe(l)} · ${fmx(l.subtotal)}`,
    ),
    ...lineaHospedaje,
    "",
    `*Total${hospedajeSinTarifa ? " de los tours" : " del viaje"}: ${fmx(total)} MXN*`,
    `*Apartas hoy con ${fmx(anticipo)}* (${PCT_ANTICIPO} %) y el resto (${fmx(total - anticipo)}) lo liquidas el día del primer recorrido.`,
    "",
    hosp
      ? `Los tours te recogen en el hotel. Si prefieres quedarte en otro lado, también pasamos por ti — en Xilitla o en Ciudad Valles.`
      : `Pasamos por ustedes a su hospedaje, en Xilitla o en Ciudad Valles — no necesitan hospedarse con nosotros.`,
    `Cancelas gratis hasta 48 h antes, con reembolso completo.`,
  ].join("\n");

  return NextResponse.json({
    folio,
    total,
    anticipo,
    pctAnticipo: PCT_ANTICIPO,
    saldo: total - anticipo,
    moneda: "MXN",
    recorridos: lineItems.map((l) => ({ tour: l.tourName, fecha: l.tourDate, personas: l.adults + l.childrenMid + l.childrenSmall, subtotal: l.subtotal })),
    hospedajeOpcional: true,
    recogida: "Pasamos por el cliente a su hospedaje en Xilitla o en Ciudad Valles, sea nuestro hotel o no.",
    datosBanco: DATOS_BANCO,
    linkSitio: `${appUrl}/reservar`,
    emailEnviado,
    resumenWhatsApp,
    instruccion: "MANDA `resumenWhatsApp` TAL CUAL como primer mensaje, antes de cualquier dato bancario.",
  });
}
