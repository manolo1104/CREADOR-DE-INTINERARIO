import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TOURS_DB, INCLUYE_SIEMPRE } from "@/lib/tours";
import { calcTourTotal, minBookingDate } from "@/lib/tourBooking";
import { computeVehiculoCharge } from "@/lib/tourPricing";
import { buildPaquetePersonalizadoEmailHtml } from "@/lib/tourEmail";
import { sendBrevoEmail } from "@/lib/brevo";
import { cotizarHospedaje } from "@/lib/hospedaje";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Anticipo estándar. Misma cifra que `tourPricing.ts` y que el sitio. */
const PCT_ANTICIPO = 30;


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
  /** Solo para los tours cobrados por vehículo (RZR). */
  ruta?: string;
  vehiculo?: string;
  unidades?: number;
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
    if (!raw.tourDate || !/^\d{4}-\d{2}-\d{2}$/.test(String(raw.tourDate))) {
      return NextResponse.json({ error: `Falta la fecha (AAAA-MM-DD) de ${tour.nombre}.` }, { status: 400 });
    }
    if (String(raw.tourDate) < minDate) {
      return NextResponse.json(
        { error: `La fecha de ${tour.nombre} debe ser a partir del ${minDate}.` },
        { status: 400 },
      );
    }

    // Cobro por VEHÍCULO (el RZR). Se cotiza con la misma función del sitio
    // para no duplicar la matriz flota × ruta. Antes se rechazaba, lo que
    // obligaba al cliente a llevar dos cotizaciones para un mismo viaje.
    if (tour.precioUnidad === "vehiculo") {
      // `computeVehiculoCharge` compara por nombre exacto ("Ruta Nanacatli"),
      // y el bot manda lo que dijo el cliente ("Nanacatli"). Se resuelve aquí
      // en vez de obligar al modelo a memorizar los nombres literales.
      const norm = (x: string) => x.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/^ruta /, "").trim();
      const pedidaRuta = norm(String(raw.ruta ?? ""));
      const rutaReal = (tour.rutas ?? []).find((r) => norm(r.nombre) === pedidaRuta)
        ?? (tour.rutas ?? []).find((r) => pedidaRuta && norm(r.nombre).includes(pedidaRuta));
      const pedidoVeh = norm(String(raw.vehiculo ?? ""));
      const vehReal = (tour.flota ?? []).find((v) => norm(v.nombre) === pedidoVeh)
        ?? (tour.flota ?? []).find((v) => pedidoVeh && norm(v.nombre).includes(pedidoVeh));

      const veh = computeVehiculoCharge({
        tourSlug: tour.slug,
        ruta: rutaReal?.nombre ?? String(raw.ruta ?? ""),
        vehiculo: vehReal?.nombre ?? String(raw.vehiculo ?? ""),
        unidades: raw.unidades,
        pct: 100,
      });
      if (!veh) {
        const rutas = (tour.rutas ?? []).map((r) => r.nombre).join(", ");
        const flota = (tour.flota ?? []).map((v) => v.nombre).join(", ");
        return NextResponse.json(
          { error: `Para ${tour.nombre} necesito la ruta y el vehículo. Rutas: ${rutas}. Flota: ${flota}.` },
          { status: 400 },
        );
      }
      total += veh.total;
      lineItems.push({
        tourSlug: tour.slug,
        tourName: tour.nombre,
        tourDate: String(raw.tourDate),
        adults: 0,
        childrenMid: 0,
        childrenSmall: 0,
        ruta: veh.ruta.nombre,
        vehiculo: veh.vehiculo.nombre,
        unidades: veh.unidades,
        capacidad: veh.vehiculo.capacidad,
        porUnidad: "vehiculo",
        incluye: [...tour.incluye, ...INCLUYE_SIEMPRE],
        subtotal: veh.total,
      });
      continue;
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
      incluye:  [...tour.incluye, ...INCLUYE_SIEMPRE],
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
    // Si no dicen cuántos duermen, se asume que son los mismos del tour más
    // grande: es lo que el cliente acaba de decir en la conversación.
    const huespedes = Math.max(
      0,
      parseInt(String(hospedaje.huespedes ?? 0), 10) ||
        Math.max(...lineItems.map((l) => l.adults + l.childrenMid + l.childrenSmall)),
    );

    const cot = cotizarHospedaje({
      habitacion: hospedaje.habitacion,
      noches,
      habitaciones,
      huespedes,
    });

    if (cot.ok) {
      hospedajeSubtotal = cot.total!;
      total += hospedajeSubtotal;
    } else {
      // Datos insuficientes: se registra el interés pero NO se inventa monto.
      hospedajeSinTarifa = true;
    }

    packageItems.push({
      hotel: "Hotel Paraíso Encantado (Xilitla)",
      habitacion: hospedaje.habitacion ?? null,
      noches: noches || null,
      habitaciones,
      huespedes: huespedes || null,
      checkin: hospedaje.checkin ?? null,
      checkout: hospedaje.checkout ?? null,
      subtotal: hospedajeSubtotal,
      desglose: cot.desglose ?? null,
      nochesGratis: cot.nochesGratis ?? 0,
      ahorro: cot.ahorro ?? 0,
      vistaMontana: cot.vistaMontana ?? null,
      _meta: hospedajeSinTarifa ? (cot.error ?? "tarifa_pendiente") : "cotizado",
    });
  }

  const hosp     = packageItems[0];
  const anticipo = Math.round((total * PCT_ANTICIPO) / 100);
  const folio    = "HP-P" + Date.now().toString(36).toUpperCase();
  const appUrl   = (process.env.APP_URL || "https://www.huasteca-potosina.com").replace(/\/$/, "");

  try {
    // Va a TourQuote, no a TourBooking: esto es una COTIZACIÓN, no una reserva
    // pagada. El panel las separa —/cotizaciones lee TourQuote y /reservas lee
    // TourBooking— y escribirlas como reserva las mezclaba con las ventas
    // reales, inflando /reservas con propuestas que nadie ha pagado.
    await prisma.tourQuote.create({
      data: {
        quoteNumber: folio,
        tourName: `Paquete a medida · ${lineItems.length} recorrido${lineItems.length !== 1 ? "s" : ""}${hosp ? " + hospedaje" : ""}`,
        tourSlug: "paquete-personalizado",
        tourDate: lineItems[0].tourDate,
        adults:   Math.max(...lineItems.map((l) => l.adults)),
        children: Math.max(...lineItems.map((l) => l.childrenMid + l.childrenSmall)),
        totalAmount: total,
        customerName:  String(customerName).trim(),
        customerEmail: customerEmail ? String(customerEmail).trim() : "",
        customerPhone: customerPhone ? String(customerPhone).replace(/\D/g, "") : null,
        notes: [
          `Paquete a medida armado por el bot de WhatsApp. Anticipo ${PCT_ANTICIPO} % = $${anticipo.toLocaleString("es-MX")}.`,
          hospedajeSinTarifa ? "⚠️ Hospedaje SIN tarifa: falta confirmarla con el cliente." : "",
          notes ? String(notes) : "",
        ].filter(Boolean).join(" "),
        lineItems,
        packageItems,
        status: "enviada",
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
              nochesGratis: hosp.nochesGratis,
              ahorro: hosp.ahorro,
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
  const personasDe = (l: any) => {
    // Los tours por vehículo se describen por unidad, no por pasajero.
    if (l.porUnidad === "vehiculo") {
      return `${l.ruta} · ${l.unidades} × ${l.vehiculo}`;
    }
    return [
      `${l.adults} adulto${l.adults !== 1 ? "s" : ""}`,
      l.childrenMid > 0 ? `${l.childrenMid} niño${l.childrenMid !== 1 ? "s" : ""} 6–10` : "",
      l.childrenSmall > 0 ? `${l.childrenSmall} menor${l.childrenSmall !== 1 ? "es" : ""} de 6` : "",
    ]
      .filter(Boolean)
      .join(" + ");
  };

  const lineaHospedaje = hosp
    ? [
        "",
        "*Hospedaje*",
        `${hosp.hotel}${hosp.habitacion ? ` · ${hosp.habitacion}` : ""}`,
        `${hosp.noches ? `${hosp.noches} noche${hosp.noches !== 1 ? "s" : ""}` : "fechas por confirmar"}${hosp.checkin ? ` · ${fechaLarga(hosp.checkin)}` : ""}${hosp.habitaciones > 1 ? ` · ${hosp.habitaciones} habitaciones` : ""}`,
        hospedajeSinTarifa
          ? "Tarifa: te la confirma el equipo hoy mismo — no va incluida en el total de abajo."
          : `${(hosp.desglose ?? []).map((d: any) => `${d.huespedes} pax · ${fmx(d.porNoche)}/noche`).join(" + ")} × ${hosp.desglose?.[0]?.nochesCobradas ?? hosp.noches} noche${(hosp.desglose?.[0]?.nochesCobradas ?? hosp.noches) !== 1 ? "s" : ""} = ${fmx(hospedajeSubtotal!)}`,
        ...(hosp.nochesGratis > 0
          ? [`🎁 *${hosp.nochesGratis} noche${hosp.nochesGratis !== 1 ? "s" : ""} de regalo* (cada 3ra noche va por nuestra cuenta) — te ahorras ${fmx(hosp.ahorro)}.`]
          : []),
      ]
    : [];

  // Lo que incluyen TODOS los recorridos del paquete. Se calcula por
  // intersección de los `incluye` reales de cada tour: si un tour no lo trae,
  // no se promete. Lo que solo trae alguno se lista aparte, con su tour.
  // Lo que incluyen TODOS los recorridos, comparado por CONCEPTO y no por
  // texto exacto: "traslado desde Xilitla o Ciudad Valles" y "traslado desde
  // Xilitla" son el mismo concepto con distinta redacción, y compararlos como
  // cadenas dejaba la intersección vacía — con lo que el resumen listaba el
  // `incluye` completo de cada tour y se volvía larguísimo.
  const CONCEPTOS: { clave: string; re: RegExp; etiqueta: string }[] = [
    { clave: "traslado", re: /traslado|recogida|pasamos por/i, etiqueta: "Traslado redondo desde tu hospedaje" },
    { clave: "desayuno", re: /desayuno/i,                       etiqueta: "Desayuno buffet en El Taco Loco, camino a los destinos" },
    { clave: "entradas", re: /entrada|acceso/i,                 etiqueta: "Entradas y accesos" },
    { clave: "guia",     re: /gu[ií]a|instructor/i,             etiqueta: "Guía certificado NOM-09 SECTUR" },
    { clave: "equipo",   re: /equipo de seguridad|casco|chaleco/i, etiqueta: "Equipo de seguridad" },
    { clave: "fotos",    re: /fotograf|fotos|video/i,           etiqueta: "Fotografías del recorrido" },
    { clave: "botiquin", re: /botiqu[ií]n/i,                    etiqueta: "Botiquín de primeros auxilios" },
    { clave: "seguro",   re: /seguro de viaje/i,                etiqueta: "Seguro de viaje" },
  ];
  const conceptosDe = (incluye: string[]) =>
    new Set(CONCEPTOS.filter((c) => incluye.some((i) => c.re.test(i))).map((c) => c.clave));

  const porItem = lineItems.map((l) => ({ nombre: l.tourName, set: conceptosDe(l.incluye ?? []) }));
  const comunes = porItem.length
    ? CONCEPTOS.filter((c) => porItem.every((p) => p.set.has(c.clave)))
    : [];
  const bloqueIncluye = comunes.length
    ? ["", "*Todos los recorridos incluyen:*", ...comunes.map((c) => `• ${c.etiqueta}`)]
    : [];

  // Diferencias: SOLO los conceptos que unos traen y otros no. Se nombra el
  // concepto, no el texto completo — el cliente quiere saber qué cambia.
  const clavesComunes = new Set(comunes.map((c) => c.clave));
  const diferencias = porItem
    .map((p) => ({
      nombre: p.nombre.split(" —")[0],
      suma: CONCEPTOS.filter((c) => !clavesComunes.has(c.clave) && p.set.has(c.clave)),
    }))
    .filter((d) => d.suma.length > 0);
  const bloqueDiferencias = diferencias.length
    ? ["", "*Y además:*", ...diferencias.map((d) => `• _${d.nombre}_ suma ${d.suma.map((c) => c.etiqueta.toLowerCase().split(",")[0]).join(" y ")}.`)]
    : [];

  const resumenWhatsApp = [
    `📋 *Tu paquete a la medida* — folio ${folio}`,
    "",
    ...lineItems.map((l, i) =>
      `*Día ${i + 1} · ${fechaLarga(l.tourDate)}*\n${l.tourName}\n${personasDe(l)} · ${fmx(l.subtotal)}`,
    ),
    ...bloqueIncluye,
    ...bloqueDiferencias,
    ...lineaHospedaje,
    "",
    `*Total${hospedajeSinTarifa ? " de los tours" : " del viaje"}: ${fmx(total)} MXN*`,
    `*Apartas hoy con ${fmx(anticipo)}* (${PCT_ANTICIPO} %) y el resto (${fmx(total - anticipo)}) lo liquidas el día del primer recorrido.`,
    "",
    hosp
      ? `Los tours te recogen en el hotel. Si prefieres quedarte en otro lado, también pasamos por ti — en Xilitla o en Ciudad Valles.`
      : `Pasamos por ustedes a su hospedaje, en Xilitla o en Ciudad Valles — no necesitan hospedarse con nosotros.`,
    `Cancelas gratis hasta 48 h antes, con reembolso completo.`,
    "",
    `⏳ Esta cotización tiene vigencia de *48 horas*. En temporada alta y fines de semana conviene apartar cuanto antes: los lugares y las habitaciones se llenan rápido.`,
    "",
    `⚠️ Al hacer la transferencia, pon *${folio}* como concepto — con eso identificamos tu pago.`,
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
