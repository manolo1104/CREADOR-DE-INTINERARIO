import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { correosEquipo, sendBrevoEmail } from "@/lib/brevo";
import { buildResumenCotizacionesHtml, hayAlgo, type FilaResumen, type Resumen } from "@/lib/resumenCotizaciones";
import { diasParaVencer, fechaLimite, recordadoPorWhatsapp, urlRecordatorio } from "@/lib/vencimientoCotizacion";
import { addDaysYMD, hoyMX, ymdMX } from "@/lib/dates";
import { actividad, logger } from "@/lib/logger";
import { metaCotizacion } from "@/lib/quoteFollowUp";
import { ETAPA_PERDIDO, esCotizacionPerdida, leadsDeCotizaciones } from "@/lib/cotizaciones/marcaPerdido";
import type { TourQuote } from "@prisma/client";

/**
 * ¿Ya no es un pendiente del equipo? La REEMPLAZADA (el cliente cambió algo y
 * el bot le mandó otra: `reemplazadaPor` en el `_meta` de packageItems) y la
 * que el cron de seguimiento cortó por tener una más nueva del mismo cliente
 * (`seqMasReciente` en el de lineItems). 🔴 Salían en «Vencieron ayer» («en el
 * panel se le pone otra fecha») o en «vencen hoy» con su link de recordatorio:
 * el equipo le escribía al cliente por un folio que ya no vale.
 */
function yaNoCuenta(q: TourQuote): boolean {
  const pm = Array.isArray(q.packageItems)
    ? (q.packageItems as unknown[]).find((p) => !!p && typeof p === "object" && (p as { _meta?: unknown })._meta === true) as { reemplazadaPor?: unknown } | undefined
    : undefined;
  if (pm && typeof pm.reemplazadaPor === "string" && pm.reemplazadaPor) return true;
  return Boolean(metaCotizacion(q.lineItems).seqMasReciente);
}

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
 * Sin las de un lead Perdido (19 nov 2026, decisión de Manolo): el cliente ya
 * dijo que no y el correo le ofrecía al equipo recordarle por WhatsApp. Se
 * mira la etapa del lead en cada corrida (ver `marcaPerdido.ts`): si regresa,
 * vuelve a salir. `porLeadPerdido` dice cuántas se quedaron fuera.
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

  // Los leads en Perdido de todas estas cotizaciones, de una sola vez (19 nov 2026).
  const perdidos = await leadsPerdidos([...vivas, ...vencidasRecientes, ...borradores]);
  // Las que se quedan fuera por su lead Perdido y SÍ habrían salido en el correo.
  const fueraPorPerdido: string[] = [];
  const dePerdido = (q: TourQuote): boolean => {
    if (!esCotizacionPerdida(q, perdidos)) return false;
    fueraPorPerdido.push(q.quoteNumber);
    return true;
  };

  const resumen: Resumen = { vencenHoy: [], vencenManana: [], vencieronAyer: [], borradores: [] };
  for (const q of vivas) {
    if (yaNoCuenta(q)) continue;
    const vence = fechaLimite(q);
    if (!vence) continue;
    const dias = diasParaVencer(vence, hoy);
    // Solo hoy, mañana y ayer entran al correo.
    if (dias < -1 || dias > 1) continue;
    if (dePerdido(q)) continue;
    if (dias === 0) resumen.vencenHoy.push(fila(q, vence));
    else if (dias === 1) resumen.vencenManana.push(fila(q, vence));
    // Venció ayer y el cron horario (que se atrasa) todavía no la pasa a Vencida.
    else resumen.vencieronAyer.push(fila(q, null));
  }
  for (const q of vencidasRecientes) {
    if (yaNoCuenta(q)) continue;
    if (fechaLimite(q) !== ayer) continue;
    if (dePerdido(q)) continue;
    resumen.vencieronAyer.push(fila(q, null));
  }
  resumen.borradores = borradores.filter((q) => !yaNoCuenta(q) && !dePerdido(q)).map((q) => fila(q, null));

  const cuenta = {
    vencenHoy:     resumen.vencenHoy.length,
    vencenManana:  resumen.vencenManana.length,
    vencieronAyer: resumen.vencieronAyer.length,
    borradores:    resumen.borradores.length,
    porLeadPerdido: fueraPorPerdido.length,
  };

  if (!hayAlgo(resumen)) {
    actividad("📋  RESUMEN COTIZACIONES", "nada pendiente: no se manda");
    return NextResponse.json({ ok: true, dry, enviado: false, ...cuenta });
  }

  const { subject, html } = buildResumenCotizacionesHtml(resumen);
  if (dry) {
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8", "X-Asunto": encodeURIComponent(subject),
        // Para comparar el `?dry=1` de antes y después: cuáles dejó fuera su lead Perdido.
        "X-Fuera-Por-Lead-Perdido": encodeURIComponent(fueraPorPerdido.join(",")) || "0",
      },
    });
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
  actividad("📋  RESUMEN COTIZACIONES", subject, `${para.length} buzón(es)`, fueraPorPerdido.length ? `${fueraPorPerdido.length} fuera por lead Perdido` : undefined);
  return NextResponse.json({ ok: true, enviado: true, ...cuenta });
}

/**
 * Los leads en Perdido de estas cotizaciones, en una sola consulta (19 nov
 * 2026). Las de antes del CRM no tienen lead: nunca cuentan como perdidas.
 */
async function leadsPerdidos(cotizaciones: { oportunidadId: string | null }[]): Promise<Set<string>> {
  const ids = leadsDeCotizaciones(cotizaciones);
  if (!ids.length) return new Set();
  const ops = await prisma.oportunidad.findMany({ where: { id: { in: ids }, etapa: ETAPA_PERDIDO }, select: { id: true } });
  return new Set(ops.map((o) => o.id));
}
