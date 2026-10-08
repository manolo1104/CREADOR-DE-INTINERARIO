// Mandar una cotización: por correo, o anotar que salió por WhatsApp.
//
// Es el cuerpo de las dos rutas del panel (`/api/admin/cotizaciones/[id]/
// send-email` y `/whatsapp`) movido aquí TAL CUAL, para que el bot de WhatsApp
// mande EL MISMO correo, nazca la MISMA fecha límite y arranque EL MISMO
// seguimiento que cuando Erick la manda desde el panel. Dos copias de esta
// lógica acabarían diciendo cosas distintas del mismo folio.
//
// Nunca lanzan: devuelven `ok:false` con el motivo y cada ruta decide qué
// responder. Las del panel responden exactamente lo de siempre. Sin `actor`, la
// bitácora toma a quien tenga la sesión del panel abierta, como siempre.

import { prisma } from "@/lib/prisma";
import { sendBrevoEmail } from "@/lib/brevo";
import { buildTourQuoteEmailHtml } from "@/lib/tourEmail";
import { metaAlEnviar, conMeta, metaCotizacion } from "@/lib/quoteFollowUp";
import { calcularVencimiento, vigenciaDe } from "@/lib/vencimientoCotizacion";
import { hoyMX } from "@/lib/dates";
import { registrarEnBitacora, pesos, type Actor } from "@/lib/admin/bitacora";
import type { ResultadoEnvio } from "./tipos";

const esYMD = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

const mensajeDe = (e: unknown) => (e instanceof Error ? e.message : String(e));

/**
 * Manda la cotización por correo, la deja «enviada» y arranca su seguimiento.
 *
 * Sin correo del cliente va al buzón del equipo (`ADMIN_EMAIL_TOURS`), igual
 * que desde el panel: por eso `emailEnviado` dice si salió AL CLIENTE, que es
 * lo que el bot necesita saber para no prometer un correo que nadie recibió.
 */
export async function enviarCotizacionPorCorreo(quoteId: string, actor?: Actor): Promise<ResultadoEnvio> {
  let salioAlCliente = false;
  try {
    const q = await prisma.tourQuote.findUniqueOrThrow({ where: { id: quoteId } });

    // El _meta de la cotización (anticipo, vigencia, numPersonas) vive en packageItems.
    const rawPkgs = Array.isArray((q as any).packageItems) ? (q as any).packageItems : [];
    const meta    = rawPkgs.find((p: any) => p && p._meta) || {};

    // La fecha límite nace al enviar. Si se REENVÍA y la que tenía sigue en
    // pie, se respeta (el cliente ya la leyó); si ya pasó, cuenta de nuevo.
    const previa = metaCotizacion(q.lineItems).venceEl;
    const venceEl = previa && previa >= hoyMX()
      ? previa
      : calcularVencimiento(new Date(), vigenciaDe(q.packageItems), q.tourDate);

    const html = buildTourQuoteEmailHtml({
      customerName: q.customerName,
      quoteNumber:  q.quoteNumber,
      tourName:     q.tourName,
      tourDate:     q.tourDate,
      tourSlug:     q.tourSlug,
      adults:       q.adults,
      children:     q.children,
      totalAmount:  q.totalAmount,
      notes:        q.notes || undefined,
      partySize:    Number(meta.numPersonas) || undefined,
      lineItems:    Array.isArray((q as any).lineItems) ? (q as any).lineItems : undefined,
      packageItems: Array.isArray((q as any).packageItems) ? (q as any).packageItems : undefined,
      extraItems:   (q as any).extraItems ?? undefined,
      // Idioma del cliente, guardado en el `_meta` de la cotización.
      locale:       meta.locale,
      venceEl,
    });

    const adminTo = process.env.ADMIN_EMAIL_TOURS || "daftpunkmanolo@gmail.com";
    const to      = q.customerEmail || adminTo;

    await sendBrevoEmail({
      to:      [{ email: to, name: q.customerName }],
      bcc:     to !== adminTo ? [{ email: adminTo }] : [],
      subject: meta.locale === "en"
        ? `Your tour quote is ready — ${q.quoteNumber}`
        : `Tu cotización de tour está lista — ${q.quoteNumber}`,
      htmlContent: html,
    });
    salioAlCliente = !!q.customerEmail;

    // Mandarla a mano ARRANCA el seguimiento. Antes, la cotización que Manolo
    // atendía en persona —la que cierra al 25 %— se quedaba sin un solo correo
    // después, mientras que el carrito automático sí tenía tres.
    //
    // La marca se escribe AQUÍ y no en el cron: si el viaje ya está encima y
    // no caben los tres pasos antes de la fecha, nace en "sin-tiempo" y queda
    // dicho por qué esa cotización no va a recibir seguimiento.
    const seq = metaAlEnviar(q.tourDate, meta.locale === "en" ? "en" : "es");
    await prisma.tourQuote.update({
      where: { id: quoteId },
      data:  {
        status:    "enviada",
        // Fecha nueva = recordatorios nuevos: se borran las marcas de la anterior.
        lineItems: conMeta(q.lineItems, {
          ...seq, venceEl,
          ...(venceEl !== previa ? { recordadoWaAt: undefined, avisoVenceAt: undefined } : {}),
        }) as never,
      },
    });
    await registrarEnBitacora({
      accion:     "envió",
      entidad:    "cotización",
      referencia: q.quoteNumber,
      resumen:    `Cotización ${q.quoteNumber} por ${pesos(q.totalAmount)} a ${to} (${q.customerName})`,
      actor,
    });

    return { ok: true, emailEnviado: salioAlCliente, venceEl, destinatario: to, seguimiento: seq.seqEstado };
  } catch (e: unknown) {
    // Si el correo ya salió y lo que falló fue guardar, se dice: el cliente sí
    // lo tiene y el bot no debe volver a prometérselo.
    return { ok: false, emailEnviado: salioAlCliente, venceEl: null, destinatario: null, error: mensajeDe(e) };
  }
}

/**
 * Anota que la cotización se mandó por WhatsApp: pasa a «enviada» y nace su
 * fecha límite (la que se le escribió al cliente en el mensaje, `venceEl`, si
 * es válida). Antes se quedaba en «Sin enviar» aunque el cliente ya la tuviera.
 *
 * NO arranca la secuencia de correos (es la regla de siempre del panel).
 */
export async function marcarEnviadaPorWhatsapp(
  quoteId: string,
  venceEl?: string | null,
  actor?: Actor,
): Promise<ResultadoEnvio> {
  try {
    const q = await prisma.tourQuote.findUniqueOrThrow({ where: { id: quoteId } });
    const meta = metaCotizacion(q.lineItems);
    // El chat al que salió: el teléfono guardado o, en las del bot, el chat.
    const rawPkgs = Array.isArray(q.packageItems) ? (q.packageItems as any[]) : [];
    const destinatario = q.customerPhone || rawPkgs.find((p: any) => p && p._meta === true)?.waChatId || null;

    // Una ya aceptada no regresa a Enviada por abrirle un WhatsApp. Una
    // REEMPLAZADA tampoco (el cliente cambió algo y el bot le mandó otra): 🔴
    // regresaba a Enviada y volvía a ser cobrable junto a la nueva. Si de
    // verdad se quiere revivir, se le cambia el estado en el panel.
    const reemplazadaPor = rawPkgs.find((p: any) => p && p._meta === true)?.reemplazadaPor;
    if (q.status === "aceptada" || (typeof reemplazadaPor === "string" && reemplazadaPor)) {
      return { ok: true, emailEnviado: false, venceEl: meta.venceEl ?? null, destinatario, status: q.status, lineItems: q.lineItems };
    }

    const hoy = hoyMX();
    const sigueEnPie = q.status === "enviada" && esYMD(meta.venceEl) && meta.venceEl >= hoy;
    const vence = sigueEnPie
      ? meta.venceEl!
      : esYMD(venceEl) && venceEl >= hoy
        ? venceEl
        : calcularVencimiento(new Date(), vigenciaDe(q.packageItems), q.tourDate);

    const lineItems = conMeta(q.lineItems, {
      venceEl: vence,
      ...(vence !== meta.venceEl ? { recordadoWaAt: undefined, avisoVenceAt: undefined } : {}),
    });
    await prisma.tourQuote.update({
      where: { id: q.id },
      data:  { status: "enviada", lineItems: lineItems as never },
    });
    await registrarEnBitacora({
      accion:     "envió",
      entidad:    "cotización",
      referencia: q.quoteNumber,
      resumen:    `Cotización ${q.quoteNumber} por WhatsApp a ${q.customerName} (vence el ${vence})`,
      actor,
    });
    return { ok: true, emailEnviado: false, venceEl: vence, destinatario, status: "enviada", lineItems };
  } catch (e: unknown) {
    return { ok: false, emailEnviado: false, venceEl: null, destinatario: null, error: mensajeDe(e) };
  }
}
