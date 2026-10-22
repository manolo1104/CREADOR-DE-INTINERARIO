// Correo de petición de reseña, unos días después del tour.
//
// El objetivo real no es "más reseñas": es más reseñas EN INGLÉS. Las 161 de
// Google están casi todas en español y un visitante estadounidense que no ve a
// nadie como él asume que el sitio no es para él.
//
// Desde el 21 oct 2026 es también la encuesta de satisfacción: cinco estrellas
// que llevan a `/opina/<token>` (calificación, recomendación 0-10, comentario).
// 🔴 El botón de Google sale SIEMPRE, a todos, califiquen como califiquen:
// Google prohíbe pedir la reseña solo a los contentos («review gating») y
// castiga la ficha entera. Las estrellas son nuestras; Google es aparte.

import { emailLocale } from "./i18n/emails";
import { TOURS_DB } from "./tours";
import { localizeTour } from "./i18n/localize";
import { GOOGLE_REVIEW_URL, nombreDePila } from "./reviewRequest";
import { C, boton, bajoBoton, fotoTour, nota, parrafo, shellCorreo } from "./emailLayout";
import { escapeHtml as esc } from "./escapeHtml";
import type { Locale } from "./i18n/config";

/**
 * El nombre del recorrido en el idioma del correo.
 *
 * Las reservas guardan el nombre en ESPAÑOL (se escribe desde `TOURS_DB` al
 * reservar), así que sin esto un correo en inglés diría "Expedición Tamul".
 * Es la misma trampa que ya documenta `cartEmail.ts`.
 */
export function nombreTour(nombre: string, slug: string | undefined, locale: Locale): string {
  if (locale === "es" || !slug) return nombre;
  const base = TOURS_DB.find((t) => t.slug === slug);
  return base ? localizeTour(base, locale).nombre : nombre;
}

const TEXTOS = {
  es: {
    subject: (t: string) => `¿Cómo te fue en ${t}?`,
    titulo: "¿Cómo te fue?",
    saludo: (n: string) => `Hola${n ? ` ${n}` : ""},`,
    intro: (t: string) =>
      `Hace unos días saliste con nosotros a <strong>${t}</strong>. Ojalá hayas vuelto a casa con las fotos que querías y con ganas de regresar.`,
    pedido:
      "Si el viaje valió la pena, ¿nos dejarías una reseña en Google? Nos toma dos minutos leerla y nos ayuda más de lo que parece: es lo que lee la siguiente persona que está decidiendo si venir.",
    cta: "Escribir una reseña",
    estrellas: "Primero, ¿qué calificación le das a tu tour? Toca una estrella.",
    bajoEstrellas: "1 = nada bien · 5 = excelente",
    yGoogle:
      "Y si el viaje valió la pena, ¿nos dejarías también una reseña en Google? Es lo que lee la siguiente persona que está decidiendo si venir.",
    ctaGoogle: "Escribir una reseña en Google",
    honesto:
      "Y si algo no salió como esperabas, dínoslo a nosotros primero respondiendo a este correo. Preferimos enterarnos y arreglarlo.",
    firma: "El equipo de Tours Huasteca Potosina · Xilitla, S.L.P.",
  },
  en: {
    subject: (t: string) => `How was ${t}?`,
    titulo: "How did it go?",
    saludo: (n: string) => `Hi${n ? ` ${n}` : ""},`,
    intro: (t: string) =>
      `A few days ago you came out with us to <strong>${t}</strong>. We hope you got the photos you wanted — and that you're already thinking about coming back.`,
    // El "in English" es el punto entero de este correo, no un detalle: una
    // reseña en inglés le habla al siguiente viajero estadounidense, y hoy casi
    // no hay ninguna.
    pedido:
      "If the trip was worth it, would you leave us a Google review — in English? It takes two minutes, and it matters more than you'd think: almost all our reviews are in Spanish, so yours is the one the next English-speaking traveler will actually read before deciding to come.",
    cta: "Write a review",
    estrellas: "First, how would you rate your tour? Tap a star.",
    bajoEstrellas: "1 = not good · 5 = excellent",
    yGoogle:
      "And if the trip was worth it, would you also leave us a Google review — in English? Almost all our reviews are in Spanish, so yours is the one the next English-speaking traveler will actually read.",
    ctaGoogle: "Write a Google review",
    honesto:
      "And if something fell short, tell us first by replying to this email. We'd rather hear it and fix it.",
    firma: "The Tours Huasteca Potosina team · Xilitla, S.L.P.",
  },
} as const;

export interface ReviewEmailInput {
  customerName: string;
  tourName: string;
  tourSlug?: string;
  locale?: unknown;
  /**
   * La liga de la encuesta SIN la calificación (`/opina/<token>`). Si viene,
   * el correo lleva las cinco estrellas; si no, es el de antes.
   */
  opinaUrl?: string;
}

/** Cinco estrellas, cada una una liga. Tabla: Outlook no entiende flexbox. */
function filaEstrellas(url: string): string {
  const celdas = [1, 2, 3, 4, 5].map((n) => `
      <td align="center" style="padding:0 4px;">
        <a href="${url}?c=${n}" style="display:block;text-decoration:none;font-family:Georgia,serif;font-size:34px;line-height:44px;color:${C.dorado};" aria-label="${n}">★</a>
        <p style="margin:0;font-family:'DM Sans',Arial,sans-serif;font-size:11px;color:${C.tenue};">${n}</p>
      </td>`).join("");
  return `
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:18px auto 0 auto;">
    <tr>${celdas}</tr>
  </table>`;
}

export function buildReviewEmailHtml(d: ReviewEmailInput): { subject: string; html: string } {
  const locale = emailLocale(d.locale);
  const T = TEXTOS[locale];

  // Solo el nombre de pila: "Hola Manuel Arturo Covarrubias Martínez," suena a
  // carta del banco, no a los guías con los que pasó el día.
  // Escapado: el nombre puede venir tal cual de un WhatsApp (lo guarda el bot).
  // Sin nombre queda «Hola,» (antes salía «Hola hola,»), como en el check-in.
  const nombre = esc(nombreDePila(d.customerName || ""));
  const tour = nombreTour(d.tourName, d.tourSlug, locale).split("—")[0].trim();

  // La foto del recorrido que hizo: no es decoración, es lo que le devuelve el
  // recuerdo antes de pedirle la reseña.
  const slug = d.tourSlug && TOURS_DB.some((t) => t.slug === d.tourSlug) ? d.tourSlug : "";

  const html = shellCorreo({
    locale,
    preheader: locale === "en"
      ? "Huasteca Potosina · San Luis Potosí · Mexico"
      : "Huasteca Potosina · San Luis Potosí · México",
    eyebrow: locale === "en" ? "After your trip" : "Después de tu viaje",
    h1a: T.titulo,
    entradilla: T.intro(tour),
    cuerpo: (d.opinaUrl
      ? [
          slug ? fotoTour(slug, tour, 200) : "",
          slug ? `<div style="height:26px"></div>` : "",
          parrafo(T.saludo(nombre), "0 0 16px 0"),
          parrafo(T.estrellas, "0"),
          filaEstrellas(d.opinaUrl),
          bajoBoton(T.bajoEstrellas),
          `<div style="height:30px"></div>`,
          parrafo(T.yGoogle, "0"),
          boton(GOOGLE_REVIEW_URL, T.ctaGoogle, "dorado"),
          nota(T.honesto, C.texto, "30px 0 0 0"),
        ]
      : [
          slug ? fotoTour(slug, tour, 200) : "",
          slug ? `<div style="height:26px"></div>` : "",
          parrafo(T.saludo(nombre), "0 0 16px 0"),
          parrafo(T.pedido, "0"),
          boton(GOOGLE_REVIEW_URL, T.cta, "dorado"),
          nota(T.honesto, C.texto, "30px 0 0 0"),
        ]).join(""),
    origen: T.firma,
  });

  return { subject: T.subject(tour), html };
}
