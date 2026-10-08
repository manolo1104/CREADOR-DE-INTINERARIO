import { NextRequest, NextResponse } from "next/server";
import { checkAgentAuth } from "@/lib/agentAuth";
import { getPaquete } from "@/lib/paquetes";
import { etapaDe } from "@/lib/vencimientoCotizacion";
import { buscarCotizacionActiva, metaDeCotizacion, resumenDeCotizacion } from "@/lib/cotizaciones/armar";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/bot/cotizacion-activa?chatId=…&telefono=… — la cotización viva más
 * reciente («enviada» o «borrador», de los últimos 30 días) de ese chat o de
 * ese teléfono.
 *
 * La usa el bot cuando llega un comprobante y la sesión no sabe de qué folio
 * es (se reinició, o la cotización la mandó Erick desde el panel): con ella el
 * aviso al dueño ya lleva el folio, el monto esperado y el `/confirma` listo.
 * Busca por el chat que guardó el bot (`_meta.waChatId`) y por el teléfono,
 * comparando los últimos 10 dígitos (52…, 521… o como lo capturó el panel).
 * Una cotización REEMPLAZADA por otra (`_meta.reemplazadaPor`) nunca es la
 * activa: el comprobante se liga a la nueva o a ninguna (ver
 * `buscarCotizacionActiva`).
 *
 * 200 { folio, status, total, anticipo, saldo, venceEl, customerName, tourName,
 * tourDate, … } · 404 si no hay · 400 sin chatId ni teléfono.
 */
export async function GET(req: NextRequest) {
  const denied = checkAgentAuth(req);
  if (denied) return denied;

  const chatId = (req.nextUrl.searchParams.get("chatId") ?? "").trim();
  const telefono = (req.nextUrl.searchParams.get("telefono") ?? "").trim();
  if (!chatId && !telefono) {
    return NextResponse.json({ error: "Falta chatId o telefono." }, { status: 400 });
  }

  try {
    const q = await buscarCotizacionActiva({ chatId, telefono });
    if (!q) {
      return NextResponse.json({ error: "No hay una cotización viva de ese chat o teléfono en los últimos 30 días." }, { status: 404 });
    }
    const r = resumenDeCotizacion(q);
    const meta = metaDeCotizacion(q.packageItems);
    const filas = Array.isArray(q.packageItems)
      ? (q.packageItems as Record<string, unknown>[]).filter((p) => p && typeof p === "object" && p._meta !== true)
      : [];
    const slugPaquete = typeof meta.paqueteSlug === "string" ? meta.paqueteSlug : q.tourSlug;
    return NextResponse.json({
      folio:        r.folio,
      status:       r.status,
      // «vencida» si ya pasó su fecha límite aunque el cron no la haya pasado a expirada.
      etapa:        etapaDe(q),
      total:        r.total,
      anticipo:     r.anticipo,
      saldo:        r.saldo,
      venceEl:      r.venceEl,
      customerName: r.customerName,
      tourName:     r.tourName,
      tourDate:     r.tourDate,
      adults:       q.adults,
      children:     q.children,
      // Con hotel, el saldo se paga al hacer check-in.
      esPaquete:    filas.length > 0 || !!(slugPaquete && getPaquete(slugPaquete)),
      locale:       r.locale,
    });
  } catch (e: unknown) {
    console.error("❌ bot/cotizacion-activa:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "No se pudo buscar la cotización." }, { status: 500 });
  }
}
