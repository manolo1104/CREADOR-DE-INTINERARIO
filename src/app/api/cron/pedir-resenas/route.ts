import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendBrevoEmail } from "@/lib/brevo";
import { buildReviewEmailHtml } from "@/lib/reviewEmail";
import { actividad, logger } from "@/lib/logger";
import {
  ESTADO_ELEGIBLE,
  fechaLimiteResena,
  fechaMinimaResena,
  localeDeReserva,
  marcarReviewPedida,
  reviewPedidaEn,
} from "@/lib/reviewRequest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Se pide reseña en los DOS idiomas. Encendido el 26 ago 2026 por Manolo.
 *
 * Estuvo solo en inglés a propósito: las 492 reseñas de Google están casi todas
 * en español y el hueco a llenar era el inglés. Encender el español significa
 * escribirle también a la base mexicana, que es la grande, y esa era una
 * decisión suya y no del código.
 *
 * ⚠️ La primera corrida alcanza a TODO el que viajó en los últimos
 * `DIAS_MAXIMOS` (45) días y todavía no tiene la marca `reviewRequestedAt`, no
 * solo a los de los últimos dos. Conviene mirar antes con `?dry=1`, que enseña
 * la lista sin enviar ni marcar nada.
 */
const IDIOMAS_ACTIVOS: readonly string[] = ["en", "es"];

// POST /api/cron/pedir-resenas
// Pide reseña de Google a los clientes cuyo tour terminó hace unos días.
// Protegido por Bearer <CRON_SECRET o BLOG_AGENT_SECRET>. Lo dispara GitHub Actions.
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET || process.env.BLOG_AGENT_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // `?dry=1` enseña a quién le tocaría el correo SIN enviar ni marcar nada.
  // Este cron escribe a clientes reales: conviene poder mirar antes de disparar,
  // y sobre todo la primera vez que se enciende.
  const dry = req.nextUrl.searchParams.get("dry") === "1";

  const hasta = fechaLimiteResena();  // el tour ya terminó hace >= DIAS_ESPERA
  const desde = fechaMinimaResena();  // …pero no hace tanto que ya no lo recuerda

  // `tourDate` es String ISO `YYYY-MM-DD`: la comparación lexicográfica de
  // Prisma es exacta para este formato (mismo criterio que `cartFollowUp.ts`).
  const candidatos = await prisma.tourBooking.findMany({
    where: {
      status:    ESTADO_ELEGIBLE,
      tourDate:  { lte: hasta, gte: desde },
      customerEmail: { not: "" },
    },
    select: {
      id: true, customerName: true, customerEmail: true,
      tourName: true, tourSlug: true, tourDate: true, lineItems: true,
    },
    orderBy: { tourDate: "asc" },
    take: 200,
  });

  let enviados = 0;
  let fallidos = 0;
  let yaPedidas = 0;
  let otroIdioma = 0;
  const destinatarios: { email: string; tour: string; fecha: string }[] = [];

  for (const b of candidatos) {
    // Una sola vez por reserva. Sin esta marca, el cron volvería a pedir la
    // misma reseña cada día que el tour siga dentro de la ventana.
    if (reviewPedidaEn(b.lineItems)) { yaPedidas++; continue; }

    const locale = localeDeReserva(b.lineItems);
    // Con los dos idiomas activos esto ya no descarta a nadie; se deja porque
    // es el interruptor, y el contador avisaría si apareciera un locale nuevo.
    if (!IDIOMAS_ACTIVOS.includes(locale)) { otroIdioma++; continue; }

    destinatarios.push({ email: b.customerEmail, tour: b.tourName, fecha: b.tourDate });
    if (dry) continue;

    try {
      const { subject, html } = buildReviewEmailHtml({
        customerName: b.customerName,
        tourName:     b.tourName,
        tourSlug:     b.tourSlug,
        locale,
      });
      await sendBrevoEmail({ to: [{ email: b.customerEmail }], subject, htmlContent: html });

      // Se marca DESPUÉS de enviar: si Brevo falla, la reserva sigue elegible
      // y lo reintenta la próxima corrida en vez de perderse en silencio.
      await prisma.tourBooking.update({
        where: { id: b.id },
        data:  { lineItems: marcarReviewPedida(b.lineItems) as never },
      });
      enviados++;
    } catch (e) {
      fallidos++;
      logger.error("cron_resena_fallida", {
        booking_id: b.id,
        email:      b.customerEmail,
        reason:     e instanceof Error ? e.message : "desconocido",
      });
    }
  }

  actividad(
    dry ? "⭐  CRON RESEÑAS (prueba)" : "⭐  CRON RESEÑAS",
    dry ? `${destinatarios.length} recibirían` : `${enviados} petición(es)`,
    `${candidatos.length} candidatos`,
    yaPedidas ? `${yaPedidas} ya pedidas` : undefined,
    otroIdioma ? `${otroIdioma} en otro idioma` : undefined,
    fallidos ? `⚠️ ${fallidos} fallaron` : undefined,
  );

  return NextResponse.json({
    ok: true,
    dry,
    enviados,
    candidatos: candidatos.length,
    yaPedidas,
    otroIdioma,
    fallidos,
    ventana: { desde, hasta },
    // En prueba se devuelve a quién le tocaría; en real, solo el conteo.
    ...(dry ? { recibirian: destinatarios } : {}),
  });
}
