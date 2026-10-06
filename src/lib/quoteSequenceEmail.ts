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
import { lineasCancelacion, lineasRecogida } from "./recogidaCorreo";
import {
  C, bajoBoton, boton, filaDato, filaMoney, fotoTour, garantias, nota, parrafo,
  shellCorreo, tabla,
} from "./emailLayout";
import type { Locale } from "./i18n/config";

const BASE = "https://www.huasteca-potosina.com";
const WA   = "524891090388";

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
        // Sin la cancelación en el cuerpo: la de cada recorrido va abajo
        // (`lineasCancelacion`), y el Edén no tiene reembolso.
        cuerpo:  "Puedes apartar tu lugar con el 30 % y liquidar el resto el día del recorrido, en efectivo o con tarjeta.",
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
    garantiaCancelacion: "✓ Cancelación gratuita hasta 48 h antes",
    // Solo cuando TODOS los cotizados recogen en las dos ciudades; si no, va la
    // frase de cada recorrido (ver `lineasRecogida`).
    garantiaRecogida: "✓ Pasamos por ti a tu hospedaje en Xilitla o Ciudad Valles",
    garantiaRecogidaSinTours: "✓ La hora y el punto de salida de cada recorrido, por escrito al reservar",
    dondeYHora: "Dónde y a qué hora",
    garantiaGuias: "✓ Guías certificados NOM-09 SECTUR · grupos pequeños",
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
        cuerpo:  "You can hold your spot with 30 % and settle the rest on the day of the tour, in cash or by card.",
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
    garantiaCancelacion: "✓ Free cancellation up to 48 h before",
    garantiaRecogida: "✓ We pick you up at your lodging in Xilitla or Ciudad Valles",
    garantiaRecogidaSinTours: "✓ Each tour's pickup time and place, in writing when you book",
    dondeYHora: "Where and when",
    garantiaGuias: "✓ NOM-09 SECTUR certified guides · small groups",
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
  const slugs = slugsDe(d.lineItems);
  // Desde el 29 sep 2026 todo se aparta con el 30 % (`pctACobrar`), así que el
  // paso 3 y la fila del anticipo aplican igual con uno o varios recorridos.
  const P = T.pasos[d.paso];
  const nombreCorto = d.tourName.split("—")[0].trim();
  const anticipo = Math.round(d.totalAmount * 0.3);
  const recogida = lineasRecogida(slugs, d.locale, { generica: T.garantiaRecogida, sinTours: T.garantiaRecogidaSinTours });
  const cancelacion = lineasCancelacion(slugs, d.locale, T.garantiaCancelacion);

  // El paso 4 manda a una persona; los otros dos, a cerrar.
  const { href, esWa } = d.paso === 4
    ? { href: `https://wa.me/${WA}?text=${encodeURIComponent(T.waTexto(nombreCorto))}`, esWa: true }
    : destino(d.lineItems, nombreCorto, T);

  const colorBoton = esWa ? "#25D366" : "#3a6b1a";

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
      // Lo que no es garantía genérica (la recogida de cada recorrido, una
      // política de cancelación propia) va en su bloque, sin palomita.
      recogida.detalle.length
        ? nota(`<strong style="color:${C.oscuro};">${T.dondeYHora}</strong><br>${recogida.detalle.join("<br>")}`, C.texto, "20px 0 0 0")
        : "",
      cancelacion.detalle.length ? nota(cancelacion.detalle.join("<br>"), C.texto, "14px 0 0 0") : "",
      garantias([...cancelacion.garantia, ...recogida.garantia, T.garantiaGuias]),
    ].join(""),
    origen: T.origen,
    paraBaja: d.email ?? undefined,
  });

  return { subject: P.subject(nombreCorto), html };
}

/**
 * «Tu cotización vence mañana» (oct 2026): el aviso automático de la fecha
 * límite. Sale UNA vez, el día anterior (o el mismo día si la cotización vence
 * el día en que se manda), solo a cotizaciones vivas y con correo. El equipo
 * manda además su recordatorio por WhatsApp desde el panel.
 *
 * Misma palanca que el resto: el 30 % para apartar, nunca un descuento. Y lo
 * que se dice de la fecha es verdad: pasada esa fecha no garantizamos el precio
 * ni el lugar; no se inventa escasez.
 */
const VENCE = {
  es: {
    subject: (t: string, cuando: string) => `Tu cotización de ${t} vence ${cuando}`,
    h1a: "Tu cotización",
    h1b: (cuando: string) => `vence ${cuando}`,
    cuerpo: (fecha: string) => `Te la guardamos hasta el ${fecha}. Si ya lo decidiste, apártala con el 30 % y el resto lo pagas el día del recorrido. Si algo cambió —fechas, cuántos van, qué recorridos— contéstanos y la ajustamos.`,
    cta: "Apartar con el 30 %",
    pie: "Después de esa fecha ya no podemos garantizarte el precio ni el lugar. Si necesitas más tiempo, escríbenos y te la extendemos.",
    vence: "Vence",
  },
  en: {
    subject: (t: string, cuando: string) => `Your ${t} quote expires ${cuando}`,
    h1a: "Your quote",
    h1b: (cuando: string) => `expires ${cuando}`,
    cuerpo: (fecha: string) => `We're holding it until ${fecha}. If you've decided, hold your spot with 30 % and pay the rest on the day of the tour. If anything changed — dates, how many of you, which tours — reply and we'll adjust it.`,
    cta: "Hold my spot with 30 %",
    pie: "After that date we can no longer guarantee the price or the spot. If you need more time, write to us and we'll extend it.",
    vence: "Expires",
  },
};

export interface QuoteVenceInput extends Omit<QuoteEmailInput, "paso"> {
  /** Fecha límite (`YYYY-MM-DD`). */
  venceEl: string;
  /** «mañana» u «hoy» (o «tomorrow» / «today»), ya en su idioma. */
  cuando:  string;
}

export function buildQuoteVenceEmail(d: QuoteVenceInput): { subject: string; html: string } {
  const en = d.locale === "en";
  const T = TEXTOS[en ? "en" : "es"];
  const V = VENCE[en ? "en" : "es"];
  const slugs = slugsDe(d.lineItems);
  const nombreCorto = d.tourName.split("—")[0].trim();
  const anticipo = Math.round(d.totalAmount * 0.3);
  const recogida = lineasRecogida(slugs, d.locale, { generica: T.garantiaRecogida, sinTours: T.garantiaRecogidaSinTours });
  const cancelacion = lineasCancelacion(slugs, d.locale, T.garantiaCancelacion);
  const { href, esWa } = destino(d.lineItems, nombreCorto, T);
  const primero = slugs.length ? TOURS_DB.find((t) => t.slug === slugs[0]) : undefined;
  const fechaVence = fechaLarga(d.venceEl, d.locale);
  // «hasta el jueves 9 de octubre de 2026»: en español, en minúscula tras «el».
  const fechaEnFrase = en ? fechaVence : fechaVence.replace(/^./, (c) => c.toLowerCase()).replace(",", "");

  const html = shellCorreo({
    locale: d.locale,
    preheader: en
      ? "Huasteca Potosina · San Luis Potosí · Mexico"
      : "Huasteca Potosina · San Luis Potosí · México",
    eyebrow: T.folio(d.quoteNumber),
    h1a: V.h1a,
    h1b: V.h1b(d.cuando),
    entradilla: V.cuerpo(fechaEnFrase),
    cuerpo: [
      primero ? fotoTour(primero.slug, primero.nombre, 200) + `<div style="height:26px"></div>` : "",
      parrafo(T.saludo(d.customerName), "0 0 20px 0"),
      tabla([
        filaDato(T.para, nombreCorto, true),
        filaDato(T.cuando, fechaLarga(d.tourDate, d.locale) || T.porDefinir),
        filaDato(V.vence, fechaVence),
        filaMoney(T.total, T.moneda(d.totalAmount), undefined, true),
        filaMoney(T.apartas, T.moneda(anticipo), "verde"),
      ].join("")),
      boton(href, esWa ? T.pasos[4].cta : V.cta, esWa ? "whatsapp" : "verde"),
      esWa ? "" : bajoBoton(T.verCarrito),
      nota(V.pie, C.texto, "28px 0 0 0"),
      recogida.detalle.length
        ? nota(`<strong style="color:${C.oscuro};">${T.dondeYHora}</strong><br>${recogida.detalle.join("<br>")}`, C.texto, "20px 0 0 0")
        : "",
      cancelacion.detalle.length ? nota(cancelacion.detalle.join("<br>"), C.texto, "14px 0 0 0") : "",
      garantias([...cancelacion.garantia, ...recogida.garantia, T.garantiaGuias]),
    ].join(""),
    origen: T.origen,
    paraBaja: d.email ?? undefined,
  });

  return { subject: V.subject(nombreCorto, d.cuando), html };
}
