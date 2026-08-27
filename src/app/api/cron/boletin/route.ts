import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendBrevoEmail } from "@/lib/brevo";
import { buildBoletinEmail } from "@/lib/boletinEmail";
import { actividad, logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/cron/boletin
 *
 * El resumen mensual a quien ya terminó su secuencia. Es lo que convierte la
 * base de correos —guía gratis, planificador, blog, recomendador— en algo vivo
 * en vez de un archivo al que nadie vuelve.
 *
 * Se dispara el día 3 de cada mes. No el 1: si el agente de blog publica el
 * último día del mes, el día 3 ya está indexado y con su imagen puesta.
 *
 * ── Reglas de quién lo recibe ─────────────────────────────────────────────
 *
 *  · `status: "terminado"` — ya agotó la secuencia de 7 pasos. A quien sigue
 *    en secuencia NO se le manda: recibiría dos cosas nuestras la misma semana.
 *  · Nunca a `baja` ni a `convertido`.
 *  · Solo si han pasado 25 días desde su último correo nuestro, sea cual sea:
 *    la mayor parte de la lista está en varias fuentes (blog + guía) y sin este
 *    filtro recibiría el boletín dos veces.
 *  · Un correo, un envío: la lista se deduplica por dirección antes de mandar.
 *
 * `?dry=1` enseña a quién le tocaría sin enviar ni marcar nada.
 * `?mes=3` fuerza un mes, para poder revisar el texto de otra temporada.
 * Protegido por Bearer <CRON_SECRET o BLOG_AGENT_SECRET>.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET || process.env.BLOG_AGENT_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dry = req.nextUrl.searchParams.get("dry") === "1";
  const mesForzado = Number(req.nextUrl.searchParams.get("mes")) || undefined;

  const ahora = new Date();
  const hace25d = new Date(ahora.getTime() - 25 * 24 * 60 * 60 * 1000);
  const hace40d = new Date(ahora.getTime() - 40 * 24 * 60 * 60 * 1000);

  // Los artículos del último mes y pico. La ventana es más ancha que el mes
  // para que un envío que se salte una corrida no deje huecos.
  const posts = await prisma.blogPost.findMany({
    where:   { published: true, publishedAt: { gte: hace40d } },
    orderBy: { publishedAt: "desc" },
    take:    3,
    select:  { slug: true, title: true, excerpt: true, coverImageUrl: true },
  });

  const candidatos = await prisma.lead.findMany({
    where: {
      status: "terminado",
      email:  { not: "" },
      OR: [{ lastEmailAt: null }, { lastEmailAt: { lt: hace25d } }],
    },
    orderBy: { lastEmailAt: "asc" },
    take: 500,
  });

  // Un correo, un envío. Mucha gente está en la lista dos veces —dejó su correo
  // en el blog y después en la guía— y son filas distintas de `Lead`.
  const porEmail = new Map<string, (typeof candidatos)[number]>();
  for (const l of candidatos) if (!porEmail.has(l.email)) porEmail.set(l.email, l);
  // `Array.from` y no spread: el `target` del proyecto no itera Map.
  const unicos = Array.from(porEmail.values());

  let enviados = 0;
  let fallidos = 0;
  const destinatarios: { email: string; fuente: string }[] = [];

  for (const lead of unicos) {
    destinatarios.push({ email: lead.email, fuente: lead.fuente });
    if (dry) continue;

    try {
      const { subject, html } = buildBoletinEmail({
        email:     lead.email,
        posts,
        tourSlug:  lead.tourPrincipal,
        mes:       mesForzado,
      });
      await sendBrevoEmail({ to: [{ email: lead.email }], subject, htmlContent: html });

      // Se marca DESPUÉS de enviar. Se actualizan TODAS las filas de ese correo
      // —no solo la que se tomó— para que la deduplicación del mes que viene
      // siga funcionando.
      await prisma.lead.updateMany({
        where: { email: lead.email },
        data:  { lastEmailAt: ahora },
      });
      enviados++;
    } catch (e) {
      fallidos++;
      logger.error("boletin_failed", {
        lead_id: lead.id,
        reason:  e instanceof Error ? e.message : "desconocido",
      });
    }
  }

  actividad(
    dry ? "📰  BOLETÍN (prueba)" : "📰  BOLETÍN MENSUAL",
    dry ? `${destinatarios.length} recibirían` : `${enviados} enviado(s)`,
    `${posts.length} artículo(s)`,
    `${candidatos.length} filas → ${unicos.length} correos`,
    fallidos ? `⚠️ ${fallidos} fallaron` : undefined,
  );

  return NextResponse.json({
    ok: true, dry, enviados, fallidos,
    articulos: posts.length,
    filas: candidatos.length,
    correosUnicos: unicos.length,
    ...(dry ? { recibirian: destinatarios } : {}),
  });
}
