import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendBrevoEmail } from "@/lib/brevo";
import { buildQuoteSequenceEmail, buildQuoteVenceEmail, type QuotePaso } from "@/lib/quoteSequenceEmail";
import { cuandoVence, diasParaVencer, fechaLimite } from "@/lib/vencimientoCotizacion";
import { hoyMX } from "@/lib/dates";
import {
  ESTADOS_VIVOS,
  PASOS_COTIZACION,
  anterioresDelMismoCliente,
  conMeta,
  localeDeCotizacion,
  metaCotizacion,
  siguientePaso,
  type MetaCotizacion,
} from "@/lib/quoteFollowUp";
import { actividad, logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/cron/secuencia-cotizaciones
 *
 * Da seguimiento a las cotizaciones enviadas —las del panel a mano y las del
 * bot—, que hasta ahora no tenían ninguno: se mandaban y ahí morían.
 *
 * Cadencia desde el envío: +1 hora, +24 horas y +72 horas. La misma del carrito
 * abandonado, y por la misma razón: quien acaba de pedir una cotización está
 * decidiendo AHORA. La versión anterior esperaba 2, 5 y 10 días y llegaba tarde
 * a su propia conversación.
 *
 * Si el cliente CONFIRMA la reserva, la secuencia se pausa en el acto.
 *
 * La secuencia se CANCELA si no cabe completa antes de la fecha del tour. Es
 * deliberado: tres correos que se cortan a la mitad, justo cuando la persona
 * iba a decidir, hacen más daño que no escribir.
 *
 * Desde oct 2026, además, la FECHA LÍMITE (`vencimientoCotizacion.ts`):
 *  - el día anterior (o el mismo día) sale UNA vez «tu cotización vence
 *    mañana» y, desde ahí, ya no salen los pasos normales: nunca dos correos
 *    seguidos sobre lo mismo;
 *  - pasada la fecha, la cotización pasa sola a Vencida (`expirada`) y se
 *    acaba su seguimiento. Esto vale también para las que no tienen correo.
 *
 * Y UNA secuencia por cliente (oct 2026, respaldo del reemplazo del bot): de
 * las vivas del mismo cliente (correo; si no, teléfono; si no, chat) solo la
 * más reciente recibe pasos y «vence mañana». A las anteriores se les termina
 * el seguimiento SIN correo; su estado no cambia y se pueden seguir pagando.
 *
 * `?dry=1` enseña a quién le tocaría, sin enviar ni marcar nada.
 * Protegido por Bearer <CRON_SECRET o BLOG_AGENT_SECRET>.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET || process.env.BLOG_AGENT_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dry = req.nextUrl.searchParams.get("dry") === "1";
  const ahora = new Date();

  const hoy = hoyMX();
  // También las que no tienen correo: a esas no se les escribe, pero sí vencen.
  const cotizaciones = await prisma.tourQuote.findMany({
    where:   { status: { in: [...ESTADOS_VIVOS] } },
    orderBy: { createdAt: "asc" },
    take:    500,
  });

  let enviados = 0;
  let fallidos = 0;
  let convertidas = 0;
  let sinTiempo = 0;
  let terminadas = 0;
  const destinatarios: { folio: string; email: string; paso: number | "vence" }[] = [];
  const vencidas: { folio: string; cliente: string; vencio: string }[] = [];
  const duplicadas: { folio: string; masReciente: string }[] = [];

  // 🔴 Un cliente, UNA secuencia. Si cambió algo y la cotización anterior no
  // alcanzó a quedar reemplazada (o el equipo le mandó dos), le llegaban los
  // correos de las dos. De las VIVAS de cada cliente solo sigue la más
  // reciente; las que vencen en esta corrida no cuentan, para que una que hoy
  // pasa a Vencida no deje sin seguimiento a otra que sí vale.
  const anteriores = anterioresDelMismoCliente(
    cotizaciones
      .filter((q) => {
        const v = fechaLimite(q);
        return !(v && diasParaVencer(v, hoy) < 0);
      })
      .map((q) => {
        const pm = metaDePaquete(q.packageItems);
        return {
          id:         q.id,
          folio:      q.quoteNumber,
          createdAt:  q.createdAt,
          correo:     q.customerEmail,
          telefono:   q.customerPhone,
          waTelefono: typeof pm.waTelefono === "string" ? pm.waTelefono : null,
          waChatId:   typeof pm.waChatId === "string" ? pm.waChatId : null,
        };
      }),
  );

  /**
   * ¿Hay una más reciente del mismo cliente? Entonces ésta ya no le escribe:
   * ni pasos ni «vence mañana». Se marca «terminado» SIN correo, y solo si su
   * seguimiento seguía vivo («sin-tiempo» y «pausada» ya dicen por qué no
   * recibe nada). El estado no se toca: sigue valiendo y se puede pagar.
   */
  const esAnterior = async (q: (typeof cotizaciones)[number], meta: MetaCotizacion): Promise<boolean> => {
    const masReciente = anteriores.get(q.id);
    if (!masReciente) return false;
    if (!meta.seqEstado || meta.seqEstado === "activo") {
      duplicadas.push({ folio: q.quoteNumber, masReciente });
      if (!dry) {
        await prisma.tourQuote.update({
          where: { id: q.id },
          data:  { lineItems: conMeta(q.lineItems, { seqEstado: "terminado", seqMasReciente: masReciente }) as never },
        });
      }
    }
    return true;
  };

  for (const q of cotizaciones) {
    const meta = metaCotizacion(q.lineItems);
    const venceEl = fechaLimite(q);

    // Sin correo no hay nada que mandar: solo se revisa si ya venció (y, si
    // tiene una más nueva, se deja dicho que su seguimiento terminó).
    if (!q.customerEmail) {
      if (venceEl && diasParaVencer(venceEl, hoy) < 0) {
        vencidas.push({ folio: q.quoteNumber, cliente: q.customerName, vencio: venceEl });
        if (!dry) await vencer(q.id, q.lineItems, venceEl);
        continue;
      }
      await esAnterior(q, meta);
      continue;
    }

    /**
     * Si CONFIRMÓ la reserva, la secuencia se pausa. Nada peor que seguir
     * persiguiendo a alguien que ya te pagó.
     *
     * Se mira solo la reserva hecha DESPUÉS de mandar esta cotización. Con el
     * filtro por correo a secas, un cliente que ya había viajado con nosotros
     * el año pasado quedaba fuera del seguimiento de su cotización NUEVA: su
     * reserva vieja la mataba antes de empezar.
     */
    const desdeCuando = meta.seqDesde ? new Date(meta.seqDesde) : q.createdAt;
    const yaReservo = await prisma.tourBooking.findFirst({
      where:  {
        customerEmail: q.customerEmail,
        createdAt:     { gte: Number.isNaN(desdeCuando.getTime()) ? q.createdAt : desdeCuando },
      },
      select: { id: true },
    });
    if (yaReservo) {
      if (!dry) {
        await prisma.tourQuote.update({
          where: { id: q.id },
          data:  {
            status:    "aceptada",
            // "pausada" y no "terminado": deja dicho en el panel POR QUÉ dejó
            // de recibir correos, que es distinto de haberse agotado sola.
            lineItems: conMeta(q.lineItems, { seqEstado: "pausada" }) as never,
          },
        });
      }
      convertidas++;
      continue;
    }

    // Pasó su fecha límite sin respuesta: Vencida, y se acabó el seguimiento.
    if (venceEl && diasParaVencer(venceEl, hoy) < 0) {
      vencidas.push({ folio: q.quoteNumber, cliente: q.customerName, vencio: venceEl });
      if (!dry) await vencer(q.id, q.lineItems, venceEl);
      continue;
    }

    // El mismo cliente tiene una más reciente: solo esa le escribe.
    if (await esAnterior(q, meta)) continue;

    // «Vence mañana» (o «hoy»): una sola vez, y no encima de otro correo
    // recién mandado. Desde que sale, ya no salen los pasos normales.
    if (venceEl && !meta.avisoVenceAt && diasParaVencer(venceEl, hoy) <= 1) {
      const ultimo = Date.parse(meta.seqUltimoAt ?? "");
      const reciente = !Number.isNaN(ultimo) && ahora.getTime() - ultimo < 6 * 60 * 60 * 1000;
      if (!reciente && !(await deBaja(q.customerEmail))) {
        destinatarios.push({ folio: q.quoteNumber, email: q.customerEmail, paso: "vence" });
        if (dry) continue;
        try {
          const locale = localeDeCotizacion(q.lineItems);
          const { subject, html } = buildQuoteVenceEmail({
            locale,
            customerName: q.customerName,
            email:        q.customerEmail,
            quoteNumber:  q.quoteNumber,
            tourName:     q.tourName,
            tourDate:     q.tourDate,
            totalAmount:  q.totalAmount,
            lineItems:    q.lineItems,
            // Paquete u hotel: el botón no puede mandar al carrito con los tours sueltos.
            packageItems: q.packageItems,
            tourSlug:     q.tourSlug,
            venceEl,
            cuando:       cuandoVence(venceEl, locale, hoy),
          });
          await sendBrevoEmail({ to: [{ email: q.customerEmail, name: q.customerName }], subject, htmlContent: html });
          await prisma.tourQuote.update({
            where: { id: q.id },
            data:  { lineItems: conMeta(q.lineItems, { avisoVenceAt: new Date().toISOString(), seqUltimoAt: new Date().toISOString() }) as never },
          });
          enviados++;
          actividad("📧  COTIZACIÓN VENCE", q.quoteNumber, q.customerEmail, venceEl);
        } catch (e) {
          fallidos++;
          logger.error("secuencia_cotizacion_vence_failed", {
            quote_id: q.id,
            reason:   e instanceof Error ? e.message : "desconocido",
          });
        }
        continue;
      }
    }
    if (meta.avisoVenceAt) continue;

    const paso = siguientePaso(meta, q.tourDate, ahora);
    if (!paso) continue;

    if ("corte" in paso) {
      // El corte se ESCRIBE, no se deja implícito: así el panel puede decir por
      // qué esa cotización no recibe seguimiento en vez de callar.
      if (paso.corte === "sin-tiempo" || paso.corte === "fecha-pasada") sinTiempo++;
      else terminadas++;
      if (!dry) {
        await prisma.tourQuote.update({
          where: { id: q.id },
          data:  { lineItems: conMeta(q.lineItems, { seqEstado: paso.corte === "terminado" ? "terminado" : "sin-tiempo" }) as never },
        });
      }
      continue;
    }

    destinatarios.push({ folio: q.quoteNumber, email: q.customerEmail, paso: paso.paso });
    if (dry) continue;

    try {
      const { subject, html } = buildQuoteSequenceEmail({
        paso:         paso.paso as QuotePaso,
        locale:       localeDeCotizacion(q.lineItems),
        customerName: q.customerName,
        email:        q.customerEmail,
        quoteNumber:  q.quoteNumber,
        tourName:     q.tourName,
        tourDate:     q.tourDate,
        totalAmount:  q.totalAmount,
        lineItems:    q.lineItems,
        packageItems: q.packageItems,
        tourSlug:     q.tourSlug,
      });
      await sendBrevoEmail({ to: [{ email: q.customerEmail, name: q.customerName }], subject, htmlContent: html });

      // Se marca DESPUÉS de enviar: si Brevo falla, el paso se reintenta en la
      // siguiente corrida en vez de perderse en silencio.
      await prisma.tourQuote.update({
        where: { id: q.id },
        data:  {
          lineItems: conMeta(q.lineItems, {
            seqPaso:     paso.paso,
            seqUltimoAt: new Date().toISOString(),
            seqEstado:   paso.paso >= PASOS_COTIZACION ? "terminado" : "activo",
          }) as never,
        },
      });
      enviados++;
      actividad(`📧  COTIZACIÓN ${paso.paso}/${PASOS_COTIZACION}`, q.quoteNumber, q.customerEmail);
    } catch (e) {
      fallidos++;
      logger.error("secuencia_cotizacion_failed", {
        quote_id: q.id,
        paso:     paso.paso,
        reason:   e instanceof Error ? e.message : "desconocido",
      });
    }
  }

  actividad(
    dry ? "📄  CRON COTIZACIONES (prueba)" : "📄  CRON COTIZACIONES",
    dry ? `${destinatarios.length} recibirían` : `${enviados} enviado(s)`,
    `${cotizaciones.length} vivas`,
    convertidas ? `${convertidas} ya reservó` : undefined,
    vencidas.length ? `${vencidas.length} vencida(s)` : undefined,
    sinTiempo   ? `${sinTiempo} sin tiempo antes del tour` : undefined,
    duplicadas.length ? `${duplicadas.length} terminada(s) por duplicado` : undefined,
    fallidos    ? `⚠️ ${fallidos} fallaron` : undefined,
  );

  return NextResponse.json({
    ok: true, dry, enviados, fallidos, convertidas, sinTiempo, terminadas,
    vencidas: vencidas.length,
    // Las que se terminaron (o, en prueba, se terminarían) por tener una más reciente del mismo cliente.
    porDuplicado: duplicadas.length,
    revisadas: cotizaciones.length,
    ...(dry ? { recibirian: destinatarios, vencerian: vencidas, duplicadas } : {}),
  });
}

/** El `_meta` de `packageItems` (el del precio y los datos del bot: waChatId, waTelefono). */
function metaDePaquete(packageItems: unknown): Record<string, unknown> {
  if (!Array.isArray(packageItems)) return {};
  const m = (packageItems as unknown[]).find(
    (p) => !!p && typeof p === "object" && (p as { _meta?: unknown })._meta === true,
  );
  return (m as Record<string, unknown> | undefined) ?? {};
}

/** Pasa a Vencida y deja escrita la fecha que venció (las viejas no la traían). */
async function vencer(id: string, lineItems: unknown, venceEl: string) {
  await prisma.tourQuote.update({
    where: { id },
    data:  { status: "expirada", lineItems: conMeta(lineItems, { venceEl, seqEstado: "terminado" }) as never },
  });
}

/**
 * ¿Pidió la baja? `/api/baja` ya vence sus cotizaciones, pero una que el
 * equipo reactive después a mano no debe volver a escribirle.
 */
async function deBaja(email: string): Promise<boolean> {
  const [lead, carrito] = await Promise.all([
    prisma.lead.findFirst({ where: { email, status: "baja" }, select: { id: true } }),
    prisma.abandonedCart.findFirst({ where: { customerEmail: email, status: "baja" }, select: { id: true } }),
  ]);
  return !!(lead || carrito);
}
