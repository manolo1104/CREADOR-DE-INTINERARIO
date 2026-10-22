import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendBrevoEmail } from "@/lib/brevo";
import { buildCheckinEmailHtml } from "@/lib/checkinEmail";
import { localeDeReserva } from "@/lib/reviewRequest";
import { addDaysYMD, hoyMX } from "@/lib/dates";
import { actividad, logger } from "@/lib/logger";
import {
  ESTADOS_EXCLUIDOS, HORA_DESDE, HORA_HASTA, asegurarEncuesta, correoUtil, fechaDelTour, horaMX,
  linkCheckin, tocaCheckin,
} from "@/lib/encuestas/encuesta";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// POST /api/cron/checkin
// Manda el check-in previo a las reservas cuyo viaje empieza MAÑANA (y, si no
// salió a tiempo, la mañana del mismo día: ver `tocaCheckin`).
// Protegido por Bearer <CRON_SECRET o BLOG_AGENT_SECRET>. Lo dispara GitHub
// Actions (`recuperar-carritos.yml`, cada hora). `?dry=1` enseña a quién le
// tocaría sin enviar ni marcar nada.
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET || process.env.BLOG_AGENT_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const dry = req.nextUrl.searchParams.get("dry") === "1";

  const hora = horaMX();
  if (!dry && (hora < HORA_DESDE || hora > HORA_HASTA)) {
    return NextResponse.json({ ok: true, fueraDeHorario: true, hora });
  }

  const hoy = hoyMX();
  const manana = addDaysYMD(hoy, 1);

  // La columna `tourDate` es la del primer renglón capturado: se trae de un
  // margen amplio y se decide con la fecha MÁS TEMPRANA de las líneas.
  const reservas = await prisma.tourBooking.findMany({
    where: {
      status:   { notIn: ESTADOS_EXCLUIDOS },
      tourDate: { gte: hoy, lte: addDaysYMD(hoy, 30) },
      customerEmail: { not: "" },
      // Ni a quien ya lo mandamos, ni a quien ya lo contestó por la liga que se
      // copió desde el panel (esa no deja marca de envío).
      OR: [{ encuesta: null }, { encuesta: { checkinEnviadoEn: null, checkinEn: null } }],
    },
    select: {
      id: true, confirmationNumber: true, customerName: true, customerEmail: true,
      tourName: true, tourSlug: true, tourDate: true, lineItems: true,
      adults: true, children: true, totalAmount: true,
    },
    orderBy: { tourDate: "asc" },
    take: 300,
  });

  const toca = reservas.filter((b) => tocaCheckin(fechaDelTour(b), hoy, hora) && correoUtil(b.customerEmail));
  const recibirian = toca.map((b) => ({ folio: b.confirmationNumber, email: b.customerEmail, tour: b.tourName, fecha: fechaDelTour(b) }));
  if (dry) return NextResponse.json({ ok: true, dry, hoy, manana, candidatos: reservas.length, recibirian });

  let enviados = 0;
  let fallidos = 0;
  for (const b of toca) {
    const enc = await asegurarEncuesta(b.id);
    // Marca atómica ANTES de enviar: si dos corridas se cruzan, solo una gana.
    const ahora = new Date();
    const { count } = await prisma.encuestaReserva.updateMany({
      where: { id: enc.id, checkinEnviadoEn: null },
      data:  { checkinEnviadoEn: ahora, checkinEnviadoPor: "correo" },
    });
    if (count === 0) continue;
    try {
      const { subject, html } = buildCheckinEmailHtml({
        customerName: b.customerName,
        tourName:     b.tourName,
        tourSlug:     b.tourSlug,
        fecha:        fechaDelTour(b),
        link:         linkCheckin(enc.token),
        locale:       localeDeReserva(b.lineItems),
      });
      await sendBrevoEmail({ to: [{ email: b.customerEmail, name: b.customerName }], subject, htmlContent: html });
      enviados++;
    } catch (e) {
      // Se devuelve la marca: la siguiente corrida lo reintenta.
      await prisma.encuestaReserva
        .update({ where: { id: enc.id }, data: { checkinEnviadoEn: null, checkinEnviadoPor: null } })
        .catch(() => logger.error("cron_checkin_marca_sin_devolver", { booking_id: b.id }));
      fallidos++;
      logger.error("cron_checkin_fallido", {
        booking_id: b.id,
        reason: e instanceof Error ? e.message : "desconocido",
      });
    }
  }

  actividad(
    "📝  CRON CHECK-IN",
    `${enviados} enviado(s)`,
    `${toca.length} para mañana u hoy`,
    fallidos ? `⚠️ ${fallidos} fallaron` : undefined,
  );
  return NextResponse.json({ ok: true, dry, hoy, manana, enviados, fallidos, candidatos: reservas.length });
}
