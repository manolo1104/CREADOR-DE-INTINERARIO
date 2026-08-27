import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { linkRecuperacion } from "@/lib/recuperacion";
import { sendBrevoEmail } from "@/lib/brevo";
import { buildCartEmailHtml, type CartEmailTipo, type CartEmailLinea } from "@/lib/cartEmail";
import { actividad, logger } from "@/lib/logger";
import {
  DIAS_VIGENCIA,
  filtroDemasiadoViejos,
  filtroFechaPasada,
  filtroPendientes,
  minFechaTour,
} from "@/lib/cartFollowUp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const APP_URL = process.env.APP_URL ?? "https://www.huasteca-potosina.com";

// POST /api/cron/recuperar-carritos
// Envía recordatorios a los carritos abandonados que no se han convertido.
// Protegido por Bearer <CRON_SECRET o BLOG_AGENT_SECRET>. Lo dispara GitHub Actions.
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET || process.env.BLOG_AGENT_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Cadencia 1 h → 24 h → 72 h. Se restan unos minutos a cada ventana para que
  // un cron que corre "en punto" no se salte el envío por unos segundos.
  const margen  = 5 * 60 * 1000;
  const ahora   = new Date();
  const hace1h  = new Date(ahora.getTime() -  1 * 60 * 60 * 1000 + margen);
  const hace24h = new Date(ahora.getTime() - 24 * 60 * 60 * 1000 + margen);
  const hace72h = new Date(ahora.getTime() - 72 * 60 * 60 * 1000 + margen);
  const hace14d = new Date(ahora.getTime() - DIAS_VIGENCIA * 24 * 60 * 60 * 1000);
  const minFecha = minFechaTour();

  // Expira lo que ya no se puede vender: el tour YA PASÓ.
  // Antes solo se expiraba por antigüedad del carrito, así que un carrito de
  // hace 3 días para un tour de hace 2 seguía recibiendo "¡te está esperando!".
  // Eso no es una venta perdida, es daño a la marca. Va ANTES de buscar
  // candidatos para que los recién vencidos queden fuera de esta misma corrida.
  const { count: expiradosPorFecha } = await prisma.abandonedCart.updateMany({
    where: filtroFechaPasada(minFecha),
    data:  { status: "expired" },
  });

  // Expira carritos muy viejos (deja de escribirles). 14 días para que quepa
  // la secuencia completa de tres recordatorios.
  await prisma.abandonedCart.updateMany({
    where: filtroDemasiadoViejos(hace14d),
    data:  { status: "expired" },
  });

  // Candidatos: vivos, con menos de 3 recordatorios, creados hace más de 1 h y
  // con el tour todavía por delante.
  const abiertos = await prisma.abandonedCart.findMany({
    where:   filtroPendientes(minFecha, hace1h),
    orderBy: { createdAt: "asc" },
    take:    100,
  });

  let enviados = 0;
  let convertidos = 0;
  let fallidos = 0;

  for (const c of abiertos) {
    // Red de seguridad: si ya reservó (mismo correo+tour+fecha), no le escribimos.
    const yaReservo = await prisma.tourBooking.findFirst({
      where: { customerEmail: c.customerEmail, tourSlug: c.tourSlug, tourDate: c.tourDate },
    });
    if (yaReservo) {
      await prisma.abandonedCart.update({ where: { id: c.id }, data: { status: "converted" } });
      convertidos++;
      continue;
    }

    let tipo: CartEmailTipo | null = null;
    if      (c.emailsSent === 0) tipo = "recordatorio1";
    else if (c.emailsSent === 1 && (!c.lastEmailAt || c.lastEmailAt < hace24h)) tipo = "recordatorio2";
    else if (c.emailsSent === 2 && (!c.lastEmailAt || c.lastEmailAt < hace72h)) tipo = "recordatorio3";
    if (!tipo) continue;

    const restoreUrl = linkRecuperacion(APP_URL, c.tourId, c.tourSlug, c.token);

    // Todo lo que el recordatorio necesita vive dentro de `carritoJson`.
    //
    // Antes de aquí solo se sacaba el idioma, y el correo salía con el viaje
    // aplastado en un renglón —el primer tour cargando con el importe del
    // total— y exigiendo el pago completo, porque sin días a la vista
    // `pctACobrar(0, false)` devuelve 100. El cliente leía "paga $12,500" y el
    // carrito le iba a pedir $3,750.
    let locale = "es";
    let lineas: CartEmailLinea[] | undefined;
    let hospedaje: Parameters<typeof buildCartEmailHtml>[0]["hospedaje"];
    let traslado:  Parameters<typeof buildCartEmailHtml>[0]["traslado"];
    try {
      const guardado = c.carritoJson ? JSON.parse(c.carritoJson) : null;
      if (guardado?.locale === "en") locale = "en";

      if (Array.isArray(guardado?.lineas) && guardado.lineas.length) {
        lineas = guardado.lineas;
      } else if (Array.isArray(guardado?.items) && guardado.items.length) {
        // Carritos creados antes de que se guardaran los renglones tarifados.
        // El importe por recorrido no se puede reconstruir aquí sin recalcular,
        // y el correo deja la celda vacía cuando falta; lo que sí se recupera
        // —y es lo que importaba— son los días, que son los que deciden si se
        // aparta con el 30 % o se paga completo.
        lineas = guardado.items.map((i: Record<string, unknown>) => ({
          tourName: String(i.tourName ?? ""), tourSlug: String(i.tourSlug ?? ""),
          tourDate: String(i.tourDate ?? ""),
          adults: Number(i.adults) || 0,
          childrenMid: Number(i.childrenMid) || 0,
          childrenSmall: Number(i.childrenSmall) || 0,
          unidades: i.unidades ? Number(i.unidades) : undefined,
        }));
      }
      if (guardado?.hotel?.habitacion) hospedaje = guardado.hotel;
      if (guardado?.viaje?.ciudad)     traslado  = guardado.viaje;
    } catch { /* JSON viejo o corrupto: se queda en español y sin desglose */ }

    try {
      const { subject, html } = buildCartEmailHtml({
        tipo,
        tourName: c.tourName,
        tourSlug: c.tourSlug,
        tourDate: c.tourDate,
        adults:   c.adults,
        children: c.childrenMid + c.childrenSmall,
        total:    c.total,
        restoreUrl,
        lineas,
        hospedaje,
        traslado,
        email:    c.customerEmail,
        locale,
      });
      await sendBrevoEmail({ to: [{ email: c.customerEmail }], subject, htmlContent: html });
      await prisma.abandonedCart.update({
        where: { id: c.id },
        data:  { emailsSent: c.emailsSent + 1, lastEmailAt: ahora },
      });
      enviados++;
    } catch (e) {
      // Seguimos con los demás, pero SIN silencio: antes un fallo de Brevo
      // (llave caducada, cuota agotada) desaparecía sin dejar rastro y parecía
      // que el cron simplemente "no tenía nada que enviar".
      fallidos++;
      logger.error("cron_recordatorio_fallido", {
        cart_id: c.id,
        tipo,
        email:   c.customerEmail,
        reason:  e instanceof Error ? e.message : "desconocido",
      });
    }
  }

  actividad(
    "🛟  CRON RECUPERACIÓN",
    `${enviados} recordatorio(s)`,
    `${convertidos} ya reservó`,
    `${abiertos.length} abiertos`,
    expiradosPorFecha ? `${expiradosPorFecha} venció la fecha` : undefined,
    fallidos ? `⚠️ ${fallidos} fallaron` : undefined,
  );
  return NextResponse.json({
    ok: true,
    enviados,
    convertidos,
    fallidos,
    expiradosPorFecha,
    revisados: abiertos.length,
  });
}
