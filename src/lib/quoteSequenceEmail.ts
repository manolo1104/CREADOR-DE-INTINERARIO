/**
 * Los tres correos de seguimiento de una cotización.
 *
 * Van después de la cotización (que es el paso 1), la haya mandado el panel a
 * mano o el bot. Misma palanca que el resto del sistema: el anticipo del 30 %
 * y la cancelación gratuita, nunca un descuento.
 *
 * El botón lleva al CARRITO con los recorridos ya dentro, no a la página del
 * tour: la persona ya cotizó, hacerla volver a elegir es perder el trabajo que
 * ya hizo.
 */

import { TOURS_DB } from "./tours";
import {
  C, bajoBoton, boton, filaDato, filaMoney, fotoTour, garantias, nota, parrafo,
  shellCorreo, tabla,
} from "./emailLayout";
import type { Locale } from "./i18n/config";

const BASE = "https://www.huasteca-potosina.com";
const WA   = "524891251458";

export type QuotePaso = 2 | 3 | 4;

export interface QuoteEmailInput {
  paso:         QuotePaso;
  locale:       Locale;
  customerName: string;
  /** Del destinatario, solo para firmar su enlace de baja. */
  email?:       string | null;
  quoteNumber:  string;
  tourName:     string;
  tourDate:     string;
  totalAmount:  number;
  /** Los recorridos cotizados, para armar el link del carrito. */
  lineItems?:   unknown;
}

const TEXTOS = {
  es: {
    moneda:  (n: number) => `$${n.toLocaleString("es-MX")} MXN`,
    saludo:  (n: string) => (n ? `Hola ${n},` : "Hola,"),
    folio:   (f: string) => `Cotización ${f}`,
    para:    "Para",
    cuando:  "Fecha",
    porDefinir: "por definir",
    total:   "Total cotizado",
    pasos: {
      2: {
        subject: (t: string) => `Tu cotización de ${t}, a un clic`,
        h1a: "Tu cotización,",
        h1b: "a la mano",
        cuerpo:  "Te la acabamos de mandar. Si la abriste de pasada y se te fue entre otros mensajes, aquí la tienes de nuevo — y con el botón ya no tienes que volver a armarla.",
        cta:     "Abrir mi cotización",
        pie:     "Los precios de esta cotización se respetan. Si algo cambió —fechas, cuántos van, qué recorridos— dinos y la ajustamos.",
      },
      3: {
        subject: (t: string) => `Aparta tu ${t} con el 30 %`,
        h1a: "No hace falta que",
        h1b: "pagues todo hoy",
        cuerpo:  "Puedes apartar tu lugar con el 30 % y liquidar el resto el día del recorrido, en efectivo o con tarjeta. Cancelación gratuita hasta 48 horas antes, con reembolso completo. Si llueve, reprogramamos sin costo.",
        cta:     "Apartar con el 30 %",
        pie:     "Los fines de semana y los puentes se llenan primero. Si tienes una fecha en mente, mejor asegurarla.",
      },
      4: {
        subject: () => "¿Te ayudamos a decidir?",
        h1a: "Última de",
        h1b: "nuestra parte",
        cuerpo:  "No te vamos a seguir escribiendo. Solo queríamos decirte que si algo no te terminó de convencer —las fechas, el precio, si es apto para tu grupo, cómo llegar— hay una persona de este lado que te contesta en menos de una hora.",
        cta:     "Escribirle a una persona",
        pie:     "Tu cotización sigue guardada por si la quieres retomar más adelante.",
      },
    },
    apartas:  "Apartas hoy con el 30 %",
    verCarrito: "Se abre con todo lo que cotizaste, listo para pagar.",
    garantias: [
      "✓ Cancelación gratuita hasta 48 h antes",
      "✓ Pasamos por ti a tu hospedaje en Xilitla o Ciudad Valles",
      "✓ Guías certificados NOM-09 SECTUR · grupos pequeños",
    ],
    firma: "Tours Huasteca Potosina · Xilitla, S.L.P.",
    origen: "Recibes esto porque pediste una cotización.",
    waTexto: (t: string) => `Hola, tengo una cotización de "${t}" y una pregunta antes de reservar.`,
  },
  en: {
    moneda:  (n: number) => `$${n.toLocaleString("en-US")} MXN`,
    saludo:  (n: string) => (n ? `Hi ${n},` : "Hi,"),
    folio:   (f: string) => `Quote ${f}`,
    para:    "For",
    cuando:  "Date",
    porDefinir: "to be confirmed",
    total:   "Quoted total",
    pasos: {
      2: {
        subject: (t: string) => `Your ${t} quote, one click away`,
        h1a: "Your quote,",
        h1b: "one click away",
        cuerpo:  "We just sent it over. If you skimmed it and it slipped down your inbox, here it is again — and the button means you don't have to build it a second time.",
        cta:     "Open my quote",
        pie:     "The prices in this quote stand. If anything changed — dates, how many of you, which tours — tell us and we'll adjust it.",
      },
      3: {
        subject: (t: string) => `Hold your ${t} with 30 %`,
        h1a: "You don't have to",
        h1b: "pay it all today",
        cuerpo:  "You can hold your spot with 30 % and settle the rest on the day of the tour, in cash or by card. Free cancellation up to 48 hours before, fully refunded. If it rains, we reschedule at no cost.",
        cta:     "Hold my spot with 30 %",
        pie:     "Weekends and long weekends fill up first. If you have a date in mind, it's worth locking it in.",
      },
      4: {
        subject: () => "Can we help you decide?",
        h1a: "Last one",
        h1b: "from us",
        cuerpo:  "We won't keep writing. We just wanted to say that if something didn't quite convince you — the dates, the price, whether it suits your group, how to get here — there's a real person on this end who answers in under an hour.",
        cta:     "Message a real person",
        pie:     "Your quote stays saved in case you want to pick it up later.",
      },
    },
    apartas:  "You pay 30 % today",
    verCarrito: "It opens with everything you quoted, ready to pay.",
    garantias: [
      "✓ Free cancellation up to 48 h before",
      "✓ We pick you up at your lodging in Xilitla or Ciudad Valles",
      "✓ NOM-09 SECTUR certified guides · small groups",
    ],
    firma: "Tours Huasteca Potosina · Xilitla, S.L.P.",
    origen: "You are getting this because you asked us for a quote.",
    waTexto: (t: string) => `Hi, I have a quote for "${t}" and a question before booking.`,
  },
};

/** Los slugs cotizados que existen en el catálogo, para el link del carrito. */
function slugsDe(lineItems: unknown): string[] {
  if (!Array.isArray(lineItems)) return [];
  const slugs = lineItems
    .filter((l): l is { tourSlug?: unknown } => !!l && typeof l === "object" && !(l as { _meta?: boolean })._meta)
    .map((l) => String(l.tourSlug ?? ""))
    .filter((s) => TOURS_DB.some((t) => t.slug === s));
  // `Array.from` y no spread: el `target` del proyecto no itera Set.
  return Array.from(new Set(slugs));
}

/**
 * A dónde manda el botón.
 *
 * Con recorridos reconocidos, al carrito ya cargado. Un paquete o un RZR no se
 * pagan en línea, así que ahí el botón lleva a WhatsApp, que es donde de verdad
 * se cierran — mandarlos a un carrito que no los acepta sería un callejón.
 */
function destino(lineItems: unknown, tourName: string, T: (typeof TEXTOS)["es"] | (typeof TEXTOS)["en"]): { href: string; esWa: boolean } {
  const slugs = slugsDe(lineItems);
  if (slugs.length) {
    return { href: `${BASE}/reservar/carrito?${slugs.map((s) => `agregar=${encodeURIComponent(s)}`).join("&")}`, esWa: false };
  }
  return { href: `https://wa.me/${WA}?text=${encodeURIComponent(T.waTexto(tourName))}`, esWa: true };
}

function fechaLarga(ymd: string, locale: Locale): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return "";
  const f = new Date(`${ymd}T12:00:00`).toLocaleDateString(
    locale === "en" ? "en-US" : "es-MX",
    { weekday: "long", day: "numeric", month: "long", year: "numeric" },
  );
  return f.charAt(0).toUpperCase() + f.slice(1);
}

export function buildQuoteSequenceEmail(d: QuoteEmailInput): { subject: string; html: string } {
  const T = TEXTOS[d.locale === "en" ? "en" : "es"];
  const P = T.pasos[d.paso];
  const nombreCorto = d.tourName.split("—")[0].trim();
  const anticipo = Math.round(d.totalAmount * 0.3);

  // El paso 4 manda a una persona; los otros dos, a cerrar.
  const { href, esWa } = d.paso === 4
    ? { href: `https://wa.me/${WA}?text=${encodeURIComponent(T.waTexto(nombreCorto))}`, esWa: true }
    : destino(d.lineItems, nombreCorto, T);

  const colorBoton = esWa ? "#25D366" : "#3a6b1a";

  const slugs = slugsDe(d.lineItems);
  const primero = slugs.length ? TOURS_DB.find((t) => t.slug === slugs[0]) : undefined;

  const html = shellCorreo({
    locale: d.locale,
    preheader: d.locale === "en"
      ? "Huasteca Potosina · San Luis Potosí · Mexico"
      : "Huasteca Potosina · San Luis Potosí · México",
    eyebrow: T.folio(d.quoteNumber),
    h1a: P.h1a,
    h1b: P.h1b,
    entradilla: P.cuerpo,
    cuerpo: [
      // La foto del primer recorrido cotizado. Sin recorridos reconocibles
      // (un paquete, el RZR) no se pone ninguna: mejor sin foto que con la de
      // otra cosa.
      primero ? fotoTour(primero.slug, primero.nombre, 200) + `<div style="height:26px"></div>` : "",
      parrafo(T.saludo(d.customerName), "0 0 20px 0"),
      tabla([
        filaDato(T.para, nombreCorto, true),
        filaDato(T.cuando, fechaLarga(d.tourDate, d.locale) || T.porDefinir),
        filaMoney(T.total, T.moneda(d.totalAmount), undefined, true),
        filaMoney(T.apartas, T.moneda(anticipo), "verde"),
      ].join("")),
      boton(href, P.cta, esWa ? "whatsapp" : "verde"),
      esWa ? "" : bajoBoton(T.verCarrito),
      nota(P.pie, C.texto, "28px 0 0 0"),
      garantias([...T.garantias]),
    ].join(""),
    origen: T.origen,
    paraBaja: d.email ?? undefined,
  });

  return { subject: P.subject(nombreCorto), html };
}
