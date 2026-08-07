import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAgentAuth } from "@/lib/agentAuth";
import { TOURS_DB } from "@/lib/tours";
import { PAQUETES_DB } from "@/lib/paquetes";
import { HABITACIONES } from "@/lib/paquetes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

    return NextResponse.json({ folio, total, moneda: "MXN", tipo: "rzr", ruta: tour.rutas[ri].nombre, vehiculo: veh.nombre });
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

    try {
      await prisma.tourQuote.create({
        data: {
          quoteNumber: folio,
          tourName: `Paquete ${paq.nombre}`,
          tourSlug: `paquete-${paq.slug}`,
          tourDate: checkin ? String(checkin) : "",
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
              checkin: checkin ? String(checkin) : "",
              checkout: checkout ? String(checkout) : "",
              subtotal: total,
            },
          ],
          status: "enviada",
        },
      });
    } catch (e: any) {
      console.error("❌ bot/lead paquete prisma:", e?.message);
      return NextResponse.json({ error: "No se pudo registrar la cotización." }, { status: 500 });
    }

    return NextResponse.json({ folio, total, moneda: "MXN", tipo: "paquete", paquete: paq.nombre, habitacion: hab?.nombre ?? null, noches: paq.noches });
  }

  return NextResponse.json({ error: "tipo inválido (usa 'rzr' o 'paquete')." }, { status: 400 });
}
