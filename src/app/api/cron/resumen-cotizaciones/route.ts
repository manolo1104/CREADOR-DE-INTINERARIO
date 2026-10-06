import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { correosEquipo, sendBrevoEmail } from "@/lib/brevo";
import { buildResumenCotizacionesHtml, hayAlgo, type FilaResumen, type Resumen } from "@/lib/resumenCotizaciones";
import { diasParaVencer, fechaLimite, recordadoPorWhatsapp, urlRecordatorio } from "@/lib/vencimientoCotizacion";
import { addDaysYMD, hoyMX, ymdMX } from "@/lib/dates";
import { actividad, logger } from "@/lib/logger";
import type { TourQuote } from "@prisma/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/cron/resumen-cotizaciones
 *
 * El aviso diario al equipo: cotizaciones que vencen hoy y mañana, las que
 * vencieron ayer y los borradores que nadie ha mandado. Va a los buzones de
 * `ADMIN_EMAIL_TOURS` (el gmail de Manolo y el del celular). Si no hay nada
 * pendiente, no se manda.
 *
 * Corre una vez al día desde GitHub Actions (`resumen-cotizaciones.yml`). El
 * reloj de GitHub se atrasa horas, por eso el correo no promete hora.
 *
 * `?dry=1` devuelve el correo en HTML sin mandarlo.
 * Protegido por Bearer <CRON_SECRET o BLOG_AGENT_SECRET>.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET || process.env.BLOG_AGENT_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dry = req.nextUrl.searchParams.get("dry") === "1";
  const hoy = hoyMX();
  const ayer = addDaysYMD(hoy, -1);
  const hace14 = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [vivas, vencidasRecientes, borradores] = await Promise.all([
    prisma.tourQuote.findMany({ where: { status: "enviada" }, take: 500 }),
    // Las que el cron venció entre ayer y hoy; el filtro fino va abajo.
    prisma.tourQuote.findMany({ where: { status: "expirada", updatedAt: { gte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) } }, take: 200 }),
    prisma.tourQuote.findMany({
      where:   { status: "borrador", createdAt: { gte: hace14, lte: hace24h } },
      orderBy: { createdAt: "desc" },
      take:    30,
    }),
  ]);

  const fila = (q: TourQuote, venceEl: string | null): FilaResumen => {
    const rec = recordadoPorWhatsapp(q);
    return {
      folio:     q.quoteNumber,
      cliente:   q.customerName,
      tour:      q.tourName.split("—")[0].trim(),
      tourDate:  q.tourDate,
      total:     q.totalAmount,
      waUrl:     venceEl ? urlRecordatorio(q, venceEl, hoy) : null,
      recordado: rec ? (ymdMX(rec) === hoy ? "hoy" : ymdMX(rec) === ayer ? "ayer" : `el ${ymdMX(rec)}`) : null,
    };
  };

  const resumen: Resumen = { vencenHoy: [], vencenManana: [], vencieronAyer: [], borradores: [] };
  for (const q of vivas) {
    const vence = fechaLimite(q);
    if (!vence) continue;
    const dias = diasParaVencer(vence, hoy);
    if (dias === 0) resumen.vencenHoy.push(fila(q, vence));
    else if (dias === 1) resumen.vencenManana.push(fila(q, vence));
    // Venció ayer y el cron horario (que se atrasa) todavía no la pasa a Vencida.
    else if (dias === -1) resumen.vencieronAyer.push(fila(q, null));
  }
  for (const q of vencidasRecientes) {
    if (fechaLimite(q) === ayer) resumen.vencieronAyer.push(fila(q, null));
  }
  resumen.borradores = borradores.map((q) => fila(q, null));

  const cuenta = {
    vencenHoy:     resumen.vencenHoy.length,
    vencenManana:  resumen.vencenManana.length,
    vencieronAyer: resumen.vencieronAyer.length,
    borradores:    resumen.borradores.length,
  };

  if (!hayAlgo(resumen)) {
    actividad("📋  RESUMEN COTIZACIONES", "nada pendiente: no se manda");
    return NextResponse.json({ ok: true, dry, enviado: false, ...cuenta });
  }

  const { subject, html } = buildResumenCotizacionesHtml(resumen);
  if (dry) {
    return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8", "X-Asunto": encodeURIComponent(subject) } });
  }

  const para = correosEquipo();
  if (!para.length) {
    logger.error("resumen_cotizaciones_sin_destino", cuenta);
    return NextResponse.json({ ok: false, error: "ADMIN_EMAIL_TOURS vacía" }, { status: 500 });
  }
  try {
    await sendBrevoEmail({ to: para, subject, htmlContent: html });
  } catch (e) {
    logger.error("resumen_cotizaciones_failed", { reason: e instanceof Error ? e.message : "desconocido" });
    return NextResponse.json({ ok: false, error: "No se pudo mandar" }, { status: 500 });
  }
  actividad("📋  RESUMEN COTIZACIONES", subject, `${para.length} buzón(es)`);
  return NextResponse.json({ ok: true, enviado: true, ...cuenta });
}
