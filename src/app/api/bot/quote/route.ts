import { NextRequest, NextResponse } from "next/server";
import { checkAgentAuth } from "@/lib/agentAuth";
import { comunesDelBot, cotizarParaBot, itemsDelBot } from "@/lib/cotizaciones/resumen";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/bot/quote — la cotización de UN recorrido (herramienta crear_cotizacion).
 *
 * Pedido de siempre: { tourSlug, tourDate, adults, childrenMid?, childrenSmall?,
 * customerName, customerPhone?, customerEmail?, promoCode? }, más lo del bot
 * nuevo: { waChatId, telefono, zonaHospedaje, locale, notasInternas }.
 *
 * 🔴 Hasta oct 2026 esto creaba una RESERVA «borrador» (folio HP…) en vez de
 * una cotización: no salía en Cotizaciones, inflaba Reservas y Finanzas con
 * ventas que nadie había pagado, su seguimiento fallaba siempre (buscaba un
 * TourQuote que no existía) y cobraba la promo de HOY aunque el tour fuera
 * después del 29 oct. Ahora es una cotización COT- del panel, igual que las de
 * Erick: el precio de la web para ESA fecha, el mismo correo, 48 h de
 * vigencia y su seguimiento (ver `cotizarParaBot`).
 *
 * El precio lo calcula el servidor; el bot solo dice qué, cuándo y cuántos.
 * `promoCode` se acepta y se ignora: no hay códigos vigentes (PROMO_CODES vacío).
 *
 * Cambios del cliente (oct 2026): con `reemplazaA` (folio de su cotización
 * anterior) la vieja queda Vencida después de guardar y mandar ésta, salvo con
 * `aparte: true` (dos opciones para comparar). La respuesta trae `reemplazo`:
 * { folio, ok: true } o { folio, ok: false, motivo } (ver `cotizarParaBot`).
 */
export async function POST(req: NextRequest) {
  const denied = checkAgentAuth(req);
  if (denied) return denied;

  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const r = await cotizarParaBot({
    // Un solo renglón con los nombres de siempre. Si algún día llega el RZR
    // por aquí con ruta y vehículo, también se cotiza (por unidad).
    items: itemsDelBot([{
      slug:       body.tourSlug ?? body.slug,
      tourDate:   body.tourDate,
      adultos:    body.adults ?? body.adultos,
      ninosMid:   body.childrenMid ?? body.ninosMid,
      ninosSmall: body.childrenSmall ?? body.ninosSmall,
      addOns:     body.addOns,
      ruta:       body.ruta,
      vehiculo:   body.vehiculo,
      unidades:   body.unidades,
      personas:   body.personas,
      hora:       body.hora,
    }]),
    ...comunesDelBot(body),
  }, "bot/quote");
  return NextResponse.json(r.body, { status: r.status });
}
