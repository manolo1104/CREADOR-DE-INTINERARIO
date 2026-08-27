import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAgentAuth } from "@/lib/agentAuth";
import { TOURS_DB } from "@/lib/tours";
import { PAQUETES_DB } from "@/lib/paquetes";
import { HABITACIONES } from "@/lib/paquetes";
import { sendBrevoEmail } from "@/lib/brevo";
import { buildTourQuoteEmailHtml } from "@/lib/tourEmail";
import { metaAlEnviar, conMeta } from "@/lib/quoteFollowUp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Envía por correo la cotización. Devuelve true si se envió. */
async function enviarCorreoCotizacion(data: {
  customerEmail?: string; customerName: string; folio: string;
  tourName: string; tourSlug: string; tourDate: string;
  adults: number; totalAmount: number; notes?: string;
  lineItems?: any[]; packageItems?: any[];
}): Promise<boolean> {
  if (!data.customerEmail) return false;
  try {
    const html = buildTourQuoteEmailHtml({
      customerName: data.customerName, quoteNumber: data.folio,
      tourName: data.tourName, tourDate: data.tourDate, tourSlug: data.tourSlug,
      adults: data.adults, children: 0, totalAmount: data.totalAmount,
      notes: data.notes, lineItems: data.lineItems, packageItems: data.packageItems,
    });
    const adminTo = process.env.ADMIN_EMAIL_TOURS || "daftpunkmanolo@gmail.com";
    await sendBrevoEmail({
      to:  [{ email: data.customerEmail, name: data.customerName }],
      bcc: data.customerEmail !== adminTo ? [{ email: adminTo }] : [],
      subject: `Tu cotización está lista — ${data.folio}`,
      htmlContent: html,
    });
    return true;
  } catch (e: any) {
    console.error("❌ correo cotización (lead):", e?.message);
    return false;
  }
}

/**
 * Arranca el seguimiento de una cotización recién enviada.
 *
 * Se llama SOLO si el correo salió: contar los días de la secuencia desde un
 * correo que nadie recibió gasta los tres pasos en el vacío. El `_meta` va en
 * `lineItems` —también en los paquetes, cuyo detalle vive en `packageItems`—
 * porque es donde lo busca `quoteFollowUp`.
 */
async function arrancarSeguimiento(folio: string, tourDate: string): Promise<void> {
  try {
    const q = await prisma.tourQuote.findUnique({ where: { quoteNumber: folio } });
    await prisma.tourQuote.update({
      where: { quoteNumber: folio },
      data:  { lineItems: conMeta(q?.lineItems, metaAlEnviar(tourDate, "es")) as never },
    });
  } catch (e: any) {
    console.error("❌ bot/lead seguimiento:", e?.message);
  }
}

/**
 * POST /api/bot/lead
 * Registra en el panel de COTIZACIONES (modelo TourQuote → /admin/cotizaciones)
 * las cotizaciones que NO pasan por el flujo de pago en línea: el RZR (cobro por
 * vehículo) y los PAQUETES (tours + hotel). Así el bot no pierde ninguna cotización.
 *
 * El PRECIO lo recalcula el SERVIDOR desde TOURS_DB / PAQUETES_DB (fuente de
 * verdad). El bot solo manda la selección (ruta/vehículo o paquete/habitación).
 */
const norm = (s: string) =>
  String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

function folioNuevo() {
  return "COT-" + Date.now().toString(36).toUpperCase();
}

/** Suma n días a una fecha YYYY-MM-DD (en UTC, sin líos de zona horaria). */
function addDays(dateStr: string, n: number): string {
  const [y, m, d] = String(dateStr).split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

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
    tipo,
    customerName,
    customerPhone,
    customerEmail,
    personas,
    notes,
  } = body ?? {};

  if (!customerName || String(customerName).trim().length < 2) {
    return NextResponse.json({ error: "Falta el nombre del cliente." }, { status: 400 });
  }

  const baseData = {
    customerName: String(customerName).trim(),
    customerEmail: customerEmail ? String(customerEmail).trim() : "",
    customerPhone: customerPhone ? String(customerPhone).replace(/\D/g, "") : null,
  };

  // ── RZR (cobro por vehículo) ───────────────────────────────────
  if (tipo === "rzr") {
    const { ruta, vehiculo, tourDate } = body;
    const tour = TOURS_DB.find((t) => t.precioUnidad === "vehiculo");
    if (!tour || !tour.rutas || !tour.flota) {
      return NextResponse.json({ error: "No hay tour por vehículo configurado." }, { status: 400 });
    }
    const ri = tour.rutas.findIndex(
      (r) => norm(r.nombre) === norm(ruta) || norm(r.nombre).includes(norm(ruta)) || (norm(ruta) && norm(r.nombre).includes(norm(ruta).replace("ruta ", "")))
    );
    if (ri < 0) {
      return NextResponse.json({ error: `Ruta no encontrada: ${ruta}` }, { status: 400 });
    }
    const veh = tour.flota.find(
      (v) => norm(v.nombre) === norm(vehiculo) || norm(v.nombre).includes(norm(vehiculo)) || (norm(vehiculo) && norm(vehiculo).includes(norm(v.nombre)))
    );
    if (!veh) {
      return NextResponse.json({ error: `Vehículo no encontrado: ${vehiculo}` }, { status: 400 });
    }
    const total = veh.precios[ri];
    const folio = folioNuevo();
    const nPersonas = Math.max(1, parseInt(String(personas), 10) || 1);

    try {
      await prisma.tourQuote.create({
        data: {
          quoteNumber: folio,
          tourName: `${tour.nombre} — ${tour.rutas[ri].nombre} · ${veh.nombre}`,
          tourSlug: tour.slug,
          tourDate: tourDate ? String(tourDate) : "",
          adults: nPersonas,
          children: 0,
          totalAmount: total,
          customerName: baseData.customerName,
          customerEmail: baseData.customerEmail,
          customerPhone: baseData.customerPhone,
          notes: `Cotización RZR por WhatsApp (cobro por vehículo). Ruta: ${tour.rutas[ri].nombre}. Vehículo: ${veh.nombre}. Personas: ${nPersonas}.${notes ? " " + String(notes) : ""}`,
          lineItems: [
            { tourSlug: tour.slug, tourName: tour.nombre, ruta: tour.rutas[ri].nombre, vehiculo: veh.nombre, tourDate: tourDate ? String(tourDate) : "", subtotal: total },
          ],
          status: "enviada",
        },
      });
    } catch (e: any) {
      console.error("❌ bot/lead rzr prisma:", e?.message);
      return NextResponse.json({ error: "No se pudo registrar la cotización." }, { status: 500 });
    }

    const emailEnviado = await enviarCorreoCotizacion({
      customerEmail: baseData.customerEmail || undefined,
      customerName: baseData.customerName, folio,
      tourName: `${tour.nombre} — ${tour.rutas[ri].nombre} · ${veh.nombre}`,
      tourSlug: tour.slug, tourDate: tourDate ? String(tourDate) : "",
      adults: nPersonas, totalAmount: total,
      notes: `Cobro por vehículo. Ruta: ${tour.rutas[ri].nombre}. Vehículo: ${veh.nombre}.`,
    });
    if (emailEnviado) await arrancarSeguimiento(folio, tourDate ? String(tourDate) : "");
    return NextResponse.json({ folio, total, moneda: "MXN", tipo: "rzr", ruta: tour.rutas[ri].nombre, vehiculo: veh.nombre, emailEnviado });
  }

  // ── PAQUETE (tours + hotel) ────────────────────────────────────
  if (tipo === "paquete") {
    const { paqueteSlug, habitacion, checkin, checkout } = body;
    const paq = PAQUETES_DB.find((p) => p.slug === paqueteSlug || p.id === paqueteSlug);
    if (!paq) {
      return NextResponse.json({ error: `Paquete no encontrado: ${paqueteSlug}` }, { status: 400 });
    }
    const hab = habitacion
      ? HABITACIONES.find((h) => norm(h.nombre) === norm(habitacion) || norm(h.nombre).includes(norm(habitacion)) || (norm(habitacion) && norm(habitacion).includes(norm(h.nombre))))
      : null;
    const suplemento = (hab?.suplemento ?? 0) * paq.noches;
    const total = paq.precio + suplemento;
    const folio = folioNuevo();
    const nPersonas = Math.max(1, parseInt(String(personas), 10) || 2);
    // La SALIDA la calcula el servidor = llegada + noches del paquete (no el bot,
    // que se equivocaba). Ej: Completo (3 noches), llegada jueves → salida domingo.
    const checkinStr = checkin && /^\d{4}-\d{2}-\d{2}$/.test(String(checkin)) ? String(checkin) : "";
    const checkoutStr = checkinStr ? addDays(checkinStr, paq.noches) : (checkout ? String(checkout) : "");

    try {
      await prisma.tourQuote.create({
        data: {
          quoteNumber: folio,
          tourName: `Paquete ${paq.nombre}`,
          tourSlug: `paquete-${paq.slug}`,
          tourDate: checkinStr,
          adults: nPersonas,
          children: 0,
          totalAmount: total,
          customerName: baseData.customerName,
          customerEmail: baseData.customerEmail,
          customerPhone: baseData.customerPhone,
          notes: `Cotización de paquete por WhatsApp. ${paq.duracion}. Habitación: ${hab?.nombre ?? "por definir"}${suplemento ? ` (+$${suplemento} suplemento)` : ""}. Personas: ${nPersonas}.${notes ? " " + String(notes) : ""}`,
          packageItems: [
            {
              paquete: paq.nombre,
              habitacion: hab?.nombre ?? "por definir",
              hotel: "Hotel Paraíso Encantado",
              noches: paq.noches,
              checkin: checkinStr,
              checkout: checkoutStr,
              subtotal: total,
            },
          ],
          // El paquete guarda su detalle en `packageItems`; el seguimiento vive
          // en `lineItems`, que es donde lo busca `quoteFollowUp`.
          status: "enviada",
        },
      });
    } catch (e: any) {
      console.error("❌ bot/lead paquete prisma:", e?.message);
      return NextResponse.json({ error: "No se pudo registrar la cotización." }, { status: 500 });
    }

    const emailEnviado = await enviarCorreoCotizacion({
      customerEmail: baseData.customerEmail || undefined,
      customerName: baseData.customerName, folio,
      tourName: `Paquete ${paq.nombre}`, tourSlug: `paquete-${paq.slug}`,
      tourDate: checkinStr,
      adults: nPersonas, totalAmount: total,
      packageItems: [
        { paquete: paq.nombre, habitacion: hab?.nombre ?? "por definir", hotel: "Hotel Paraíso Encantado", noches: paq.noches, checkin: checkinStr, checkout: checkoutStr, subtotal: total },
      ],
    });
    if (emailEnviado) await arrancarSeguimiento(folio, checkinStr);
    return NextResponse.json({ folio, total, moneda: "MXN", tipo: "paquete", paquete: paq.nombre, habitacion: hab?.nombre ?? null, noches: paq.noches, checkin: checkinStr, checkout: checkoutStr, emailEnviado });
  }

  return NextResponse.json({ error: "tipo inválido (usa 'rzr' o 'paquete')." }, { status: 400 });
}
