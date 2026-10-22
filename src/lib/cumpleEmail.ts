// Correo de cumpleaños con el código del 10 % (21 oct 2026).
//
// Es marketing: lleva baja (`paraBaja`) y solo sale a quien marcó la casilla
// de promociones en el check-in. El código se canjea por WhatsApp, como hoy
// DIRECTO10: el checkout del sitio no tiene campo para códigos.

import { emailLocale } from "./i18n/emails";
import { C, WA, boton, bajoBoton, nota, parrafo, shellCorreo } from "./emailLayout";
import { escapeHtml as esc } from "./escapeHtml";
import { nombreDePila } from "./reviewRequest";
import type { Locale } from "./i18n/config";

const fechaLarga = (ymd: string, locale: Locale) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString(locale === "en" ? "en-US" : "es-MX", {
    day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  });
};

const TEXTOS = {
  es: {
    subject: (n: string) => `¡Feliz cumpleaños${n ? `, ${n}` : ""}! 🎂 Tu regalo: 10 % en tu próximo tour`,
    eyebrow: "Tu regalo de cumpleaños",
    h1a: "Feliz",
    h1b: "cumpleaños",
    hoy: "Hoy es tu día y queremos celebrarlo contigo.",
    hace: (f: string) => `El ${f} fue tu cumpleaños y queremos celebrarlo contigo.`,
    regalo: "Te regalamos <strong>10 % de descuento</strong> en los tours de tu próxima reserva con nosotros. Este es tu código:",
    vence: (f: string) => `Válido hasta el ${f}. Escríbenos por WhatsApp con tu código y te armamos el viaje.`,
    cta: "Usar mi código por WhatsApp",
    wa: (c: string) => `Hola, quiero usar mi código de cumpleaños ${c}`,
    letras:
      "Aplica a los tours de una reserva nueva; no incluye el RZR, el hospedaje, los traslados ni el viaje desde CDMX. Un solo uso, a nombre tuyo. No se combina con otros descuentos.",
    firma: "Te lo mandamos porque nos diste tu cumpleaños en tu check-in.",
  },
  en: {
    subject: (n: string) => `Happy birthday${n ? `, ${n}` : ""}! 🎂 Your gift: 10% off your next tour`,
    eyebrow: "Your birthday gift",
    h1a: "Happy",
    h1b: "birthday",
    hoy: "Today is your day and we want to celebrate it with you.",
    hace: (f: string) => `Your birthday was on ${f} and we want to celebrate it with you.`,
    regalo: "Here's <strong>10% off</strong> the tours of your next booking with us. This is your code:",
    vence: (f: string) => `Valid until ${f}. Message us on WhatsApp with your code and we'll plan your trip.`,
    cta: "Use my code on WhatsApp",
    wa: (c: string) => `Hi, I'd like to use my birthday code ${c}`,
    letras:
      "Applies to the tours of a new booking; it doesn't include the RZR, lodging, transfers or the trip from Mexico City. One use, in your name. Can't be combined with other discounts.",
    firma: "You're getting this because you shared your birthday in your check-in.",
  },
} as const;

export interface CumpleEmailInput {
  customerName: string;
  email: string;
  codigo: string;
  /** Día en que fue (o es) el cumpleaños, YYYY-MM-DD. */
  fechaCumple: string;
  hoy: string;
  venceEl: string;
  locale?: unknown;
}

export function buildCumpleEmailHtml(d: CumpleEmailInput): { subject: string; html: string } {
  const locale = emailLocale(d.locale);
  const T = TEXTOS[locale];
  const pila = nombreDePila(d.customerName || "");
  const codigo = esc(d.codigo);

  const caja = `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:18px 0 0 0;">
    <tr><td align="center" style="border:1px dashed ${C.dorado};background-color:${C.tarjeta};padding:20px 12px;">
      <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:28px;letter-spacing:4px;font-weight:bold;color:${C.oscuro};">${codigo}</p>
    </td></tr>
  </table>`;

  const html = shellCorreo({
    locale,
    preheader: locale === "en" ? "10% off your next tour" : "10 % en tu próximo tour",
    eyebrow: T.eyebrow,
    h1a: T.h1a,
    h1b: T.h1b,
    entradilla: d.fechaCumple === d.hoy ? T.hoy : T.hace(fechaLarga(d.fechaCumple, locale)),
    cuerpo: [
      parrafo(`${locale === "en" ? "Hi" : "Hola"}${pila ? ` ${esc(pila)}` : ""},`, "0 0 16px 0"),
      parrafo(T.regalo, "0"),
      caja,
      bajoBoton(T.vence(fechaLarga(d.venceEl, locale))),
      boton(`https://wa.me/${WA}?text=${encodeURIComponent(T.wa(d.codigo))}`, T.cta, "whatsapp"),
      nota(T.letras, C.tenue, "30px 0 0 0"),
    ].join(""),
    origen: T.firma,
    paraBaja: d.email,
  });

  return { subject: T.subject(pila), html };
}
