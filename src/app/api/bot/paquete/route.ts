import { NextRequest, NextResponse } from "next/server";
import { checkAgentAuth } from "@/lib/agentAuth";
import { comunesDelBot, cotizarParaBot, grupoDeItems, hospedajeDelBot, itemsDelBot } from "@/lib/cotizaciones/resumen";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/bot/paquete — un viaje a la medida: VARIOS recorridos, cada uno
 * con su fecha (el RZR por ruta, vehículo y unidades), y el hotel si el
 * cliente lo quiere, en UN folio y UN correo (herramienta
 * cotizar_paquete_personalizado).
 *
 * Pedido de siempre: { items:[{slug, tourDate, adultos, ninosMid, ninosSmall,
 * ruta, vehiculo, unidades}], customerName, customerEmail, customerPhone?,
 * hospedaje?:{interesado, habitacion, checkin, checkout, noches, habitaciones,
 * huespedes}, notes? }, más lo del bot nuevo (waChatId, telefono,
 * zonaHospedaje, locale, notasInternas y la `hora` del RZR).
 *
 * Antes guardaba un folio HP-P… sin el `_meta` del panel (el hotel marcado
 * `_meta: "cotizado"` desaparecía al abrirlo), cobraba la promo de HOY, mandaba
 * un correo propio sin fecha límite, devolvía un «BBVA» fijo como datos
 * bancarios y armaba un carrito que nunca se guardaba (le faltaba `tourId`).
 * También comparaba el token a mano y, sin la variable, quedaba ABIERTA. Ahora
 * es una cotización COT- del panel, con `checkAgentAuth` (ver `cotizarParaBot`).
 *
 * Cambios del cliente (oct 2026): con `reemplazaA` (folio de su cotización
 * anterior) la vieja queda Vencida después de guardar y mandar ésta, salvo con
 * `aparte: true` (dos opciones para comparar). La respuesta trae `reemplazo`.
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

  const items = itemsDelBot(body.items);
  if (!items.length) {
    return NextResponse.json({ error: "Manda al menos un recorrido en `items`." }, { status: 400 });
  }
  // Sin «cuántos duermen», los del grupo más grande: es lo que el cliente
  // acaba de decir en la conversación (la regla de antes).
  const hospedaje = hospedajeDelBot(body.hospedaje, grupoDeItems(items));

  const r = await cotizarParaBot({
    items,
    ...(hospedaje ? { hospedaje } : {}),
    ...comunesDelBot(body),
  }, "bot/paquete");
  return NextResponse.json(r.body, { status: r.status });
}
