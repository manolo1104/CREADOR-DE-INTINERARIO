// Correo del check-in previo: sale el día ANTES del tour (21 oct 2026).
//
// Es operativo, no marketing: va a quien ya compró, así que no lleva baja
// (regla de `emailLayout.ts`). Pide 6 respuestas en un minuto y lo dice en el
// asunto; el gancho para contestar es el regalo de cumpleaños.

import { emailLocale } from "./i18n/emails";
import { TOURS_DB } from "./tours";
import { nombreTour } from "./reviewEmail";
import { C, WA, boton, bajoBoton, fotoTour, nota, parrafo, shellCorreo } from "./emailLayout";
import { escapeHtml as esc } from "./escapeHtml";
import { nombreDePila } from "./reviewRequest";
import { diffDiasYMD, hoyMX } from "./dates";
import type { Locale } from "./i18n/config";

/** «mañana» / «hoy» / «el sábado 25 de octubre», según cuánto falta. */
export function cuandoEsElTour(fecha: string, locale: Locale, hoy = hoyMX()): string {
  const dias = diffDiasYMD(hoy, fecha);
  if (dias === 0) return locale === "en" ? "today" : "hoy";
  if (dias === 1) return locale === "en" ? "tomorrow" : "mañana";
  const [y, m, d] = fecha.split("-").map(Number);
  const txt = new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString(locale === "en" ? "en-US" : "es-MX", {
    weekday: "long", day: "numeric", month: "long", timeZone: "UTC",
  });
  return locale === "en" ? `on ${txt}` : `el ${txt}`;
}

const TEXTOS = {
  es: {
    subject: (cuando: string, t: string) => `${cuando.charAt(0).toUpperCase()}${cuando.slice(1)}: ${t} · tu check-in de 1 minuto`,
    eyebrow: "Antes de tu tour",
    titulo: "Tu check-in",
    entradilla: (cuando: string, t: string) => `Salimos ${cuando} a <strong>${t}</strong>. Antes, cuéntanos un poco de ti.`,
    saludo: (n: string) => `Hola${n ? ` ${n}` : ""},`,
    cuerpo:
      "Son seis preguntas y toma un minuto: de dónde vienes, con quién viajas y cómo nos conociste. Nos ayuda a preparar tu salida y a mejorar cada tour.",
    regalo:
      "<strong>Y un regalo:</strong> si nos dices tu cumpleaños, ese día te mandamos un 10 % de descuento para tu próximo tour con nosotros.",
    cta: "Hacer mi check-in",
    bajo: "No necesitas contraseña: la liga es solo tuya.",
    dudas: `¿Dudas sobre la recogida o qué llevar? Escríbenos por <a href="https://wa.me/${WA}" style="color:${C.verde};text-decoration:underline;">WhatsApp al 489 109 0388</a>.`,
    firma: "El equipo de Tours Huasteca Potosina · Xilitla, S.L.P.",
  },
  en: {
    subject: (cuando: string, t: string) => `${cuando.charAt(0).toUpperCase()}${cuando.slice(1)}: ${t} · your 1-minute check-in`,
    eyebrow: "Before your tour",
    titulo: "Your check-in",
    entradilla: (cuando: string, t: string) => `We head out ${cuando} to <strong>${t}</strong>. First, tell us a little about you.`,
    saludo: (n: string) => `Hi${n ? ` ${n}` : ""},`,
    cuerpo:
      "Six quick questions, one minute: where you're coming from, who you're traveling with and how you found us. It helps us prepare your tour and make every trip better.",
    regalo:
      "<strong>And a gift:</strong> tell us your birthday and on that day we'll send you 10% off your next tour with us.",
    cta: "Do my check-in",
    bajo: "No password needed: this link is just for you.",
    dudas: `Questions about pickup or what to bring? Message us on <a href="https://wa.me/${WA}" style="color:${C.verde};text-decoration:underline;">WhatsApp at +52 489 109 0388</a>.`,
    firma: "The Tours Huasteca Potosina team · Xilitla, S.L.P.",
  },
} as const;

export interface CheckinEmailInput {
  customerName: string;
  tourName: string;
  tourSlug?: string;
  /** Primer día del viaje, YYYY-MM-DD. */
  fecha: string;
  link: string;
  locale?: unknown;
}

export function buildCheckinEmailHtml(d: CheckinEmailInput): { subject: string; html: string } {
  const locale = emailLocale(d.locale);
  const T = TEXTOS[locale];
  const nombre = esc(nombreDePila(d.customerName || ""));
  const tourTxt = nombreTour(d.tourName, d.tourSlug, locale).split("—")[0].trim();
  const tour = esc(tourTxt);
  const cuando = cuandoEsElTour(d.fecha, locale);
  const slug = d.tourSlug && TOURS_DB.some((t) => t.slug === d.tourSlug) ? d.tourSlug : "";

  const html = shellCorreo({
    locale,
    preheader: locale === "en" ? "Six questions · one minute" : "Seis preguntas · un minuto",
    eyebrow: T.eyebrow,
    h1a: T.titulo,
    entradilla: T.entradilla(cuando, tour),
    cuerpo: [
      slug ? fotoTour(slug, tour, 190) : "",
      slug ? `<div style="height:26px"></div>` : "",
      parrafo(T.saludo(nombre), "0 0 16px 0"),
      parrafo(T.cuerpo),
      parrafo(T.regalo, "0"),
      boton(d.link, T.cta, "dorado"),
      bajoBoton(T.bajo),
      nota(T.dudas, C.texto, "30px 0 0 0"),
    ].join(""),
    origen: T.firma,
  });

  return { subject: T.subject(cuando, tourTxt), html };
}

/** El mensaje de WhatsApp que arma el panel cuando la reserva no trae correo. */
export function mensajeCheckinWhatsapp(nombre: string, tour: string, fecha: string, link: string, locale: Locale): string {
  const pila = nombreDePila(nombre);
  const cuando = cuandoEsElTour(fecha, locale);
  return locale === "en"
    ? `Hi${pila ? ` ${pila}` : ""}! This is Tours Huasteca Potosina 🌿 To get your “${tour}” tour ready (${cuando}), could you do your check-in? Six questions, one minute: ${link}\nTell us your birthday and we'll send you a gift that day 🎁`
    : `¡Hola${pila ? ` ${pila}` : ""}! Somos Tours Huasteca Potosina 🌿 Para preparar tu tour «${tour}» (${cuando}), ¿nos ayudas con tu check-in? Son 6 preguntas, 1 minuto: ${link}\nSi nos dices tu cumpleaños, ese día te llega un regalo 🎁`;
}
