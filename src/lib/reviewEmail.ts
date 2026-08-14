// Correo de petición de reseña, unos días después del tour.
//
// El objetivo real no es "más reseñas": es más reseñas EN INGLÉS. Las 492 de
// Google están casi todas en español y un visitante estadounidense que no ve a
// nadie como él asume que el sitio no es para él.

import { emailLocale } from "./i18n/emails";
import { TOURS_DB } from "./tours";
import { localizeTour } from "./i18n/localize";
import { GOOGLE_REVIEW_URL } from "./reviewRequest";
import type { Locale } from "./i18n/config";

/**
 * El nombre del recorrido en el idioma del correo.
 *
 * Las reservas guardan el nombre en ESPAÑOL (se escribe desde `TOURS_DB` al
 * reservar), así que sin esto un correo en inglés diría "Expedición Tamul".
 * Es la misma trampa que ya documenta `cartEmail.ts`.
 */
function nombreTour(nombre: string, slug: string | undefined, locale: Locale): string {
  if (locale === "es" || !slug) return nombre;
  const base = TOURS_DB.find((t) => t.slug === slug);
  return base ? localizeTour(base, locale).nombre : nombre;
}

const TEXTOS = {
  es: {
    subject: (t: string) => `¿Cómo te fue en ${t}?`,
    titulo: "¿Cómo te fue?",
    saludo: (n: string) => `Hola ${n},`,
    intro: (t: string) =>
      `Hace unos días saliste con nosotros a <strong>${t}</strong>. Ojalá hayas vuelto a casa con las fotos que querías y con ganas de regresar.`,
    pedido:
      "Si el viaje valió la pena, ¿nos dejarías una reseña en Google? Nos toma dos minutos leerla y nos ayuda más de lo que parece: es lo que lee la siguiente persona que está decidiendo si venir.",
    cta: "Escribir una reseña",
    honesto:
      "Y si algo no salió como esperabas, dínoslo a nosotros primero respondiendo a este correo. Preferimos enterarnos y arreglarlo.",
    firma: "El equipo de Tours Huasteca Potosina · Xilitla, S.L.P.",
  },
  en: {
    subject: (t: string) => `How was ${t}?`,
    titulo: "How did it go?",
    saludo: (n: string) => `Hi ${n},`,
    intro: (t: string) =>
      `A few days ago you came out with us to <strong>${t}</strong>. We hope you got the photos you wanted — and that you're already thinking about coming back.`,
    // El "in English" es el punto entero de este correo, no un detalle: una
    // reseña en inglés le habla al siguiente viajero estadounidense, y hoy casi
    // no hay ninguna.
    pedido:
      "If the trip was worth it, would you leave us a Google review — in English? It takes two minutes, and it matters more than you'd think: almost all our reviews are in Spanish, so yours is the one the next English-speaking traveler will actually read before deciding to come.",
    cta: "Write a review",
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
}

export function buildReviewEmailHtml(d: ReviewEmailInput): { subject: string; html: string } {
  const locale = emailLocale(d.locale);
  const T = TEXTOS[locale];

  // Solo el nombre de pila: "Hola Manuel Arturo Covarrubias Martínez," suena a
  // carta del banco, no a los guías con los que pasó el día.
  const nombre = (d.customerName || "").trim().split(/\s+/)[0] || (locale === "en" ? "there" : "hola");
  const tour = nombreTour(d.tourName, d.tourSlug, locale).split("—")[0].trim();

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1a2e1a;background:#ffffff">
    <div style="background:#0e1710;padding:22px 24px">
      <div style="color:#c4882a;font-size:11px;letter-spacing:3px;text-transform:uppercase">Tours Huasteca Potosina</div>
      <h1 style="font-size:23px;margin:8px 0 0;color:#f5f0e3;font-weight:normal">${T.titulo}</h1>
    </div>

    <div style="padding:24px">
      <p style="font-size:15px;line-height:1.6;color:#444;margin:0 0 16px">${T.saludo(nombre)}</p>
      <p style="font-size:15px;line-height:1.6;color:#444;margin:0 0 22px">${T.intro(tour)}</p>
      <p style="font-size:15px;line-height:1.6;color:#444;margin:0 0 26px">${T.pedido}</p>

      <div style="text-align:center;margin:0 0 26px">
        <a href="${GOOGLE_REVIEW_URL}"
           style="display:inline-block;background:#c4882a;color:#0e1710;text-decoration:none;padding:14px 32px;font-size:13px;letter-spacing:2px;text-transform:uppercase;font-weight:bold">
          ${T.cta}
        </a>
      </div>

      <p style="font-size:13px;line-height:1.6;color:#7d7566;margin:0 0 22px;padding-top:18px;border-top:1px solid #e3ddc9">
        ${T.honesto}
      </p>

      <p style="font-size:12px;line-height:1.5;color:#8a7a5a;margin:0">${T.firma}</p>
    </div>
  </div>`;

  return { subject: T.subject(tour), html };
}
