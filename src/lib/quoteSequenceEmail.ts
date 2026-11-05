/**
 * Los tres correos de seguimiento de una cotización.
 *
 * Van después de la cotización (que es el paso 1), la haya mandado el panel a
 * mano o el bot. Misma palanca que el resto del sistema: el anticipo y la
 * cancelación gratuita, nunca un descuento. El anticipo es el de ESA
 * cotización (el 30 % si no se capturó otro): decían «el 30 %» fijo aunque
 * Erick hubiera pedido el 50 % o $4,000 (lote 4, 5 nov 2026).
 *
 * El botón lleva al CARRITO con los recorridos ya dentro, no a la página del
 * tour: la persona ya cotizó, hacerla volver a elegir es perder el trabajo que
 * ya hizo. Pero solo si el carrito cobra exactamente lo cotizado
 * (`cobraComoLaWeb`); si no, a su liga de anticipo o a WhatsApp.
 */

import { TOURS_DB } from "./tours";
import { getPaquete } from "./paquetes";
import { anticipoDe, type MetaCotizacion as MetaPrecio } from "./admin/totalesCotizacion";
import { cobraComoLaWeb } from "./cotizaciones/reglasEnvio";
// 🔴 El nombre del cliente lo dicta él por WhatsApp (el bot lo guarda tal
// cual): sin escapar, un «nombre» con un <a href> salía como enlace real en
// un correo con la marca y el dominio de Tours.
import { escapeHtml as esc } from "./escapeHtml";
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
  /**
   * El hotel y el `_meta` de la cotización (`packageItems`) y su `tourSlug`:
   * con ellos el botón sabe si es un paquete del catálogo (su página) o lleva
   * noches de hotel (WhatsApp). Sin ellos, el carrito como antes.
   */
  packageItems?: unknown;
  tourSlug?:     string | null;
  /** Comida, transporte, guía: con extras cobrados el carrito no cobra lo cotizado. */
  extraItems?:   unknown;
  /** La liga de pago viva de ESTA cotización, si tiene: el botón cuando la web no cobra lo cotizado. */
  ligaPago?:     { url: string; monto: number } | null;
}

/** El anticipo de ESTA cotización, como se le dice al cliente (lote 4, 5 nov 2026). */
interface Anticipo {
  /** El importe ya escrito: «$1,500 MXN». */
  monto:    string;
  pct:      number;
  /** Se capturó como importe ($4,000) y no como porcentaje: se dice el importe. */
  fijo:     boolean;
  /** Pago completo: ya no queda saldo para el día del recorrido. */
  completo: boolean;
}

/** Los textos de un paso: los que hablan del anticipo lo reciben ya calculado. */
interface TextosPaso {
  subject: (tour: string, a: Anticipo) => string;
  h1a:     (a: Anticipo) => string;
  h1b:     (a: Anticipo) => string;
  cuerpo:  (a: Anticipo) => string;
  cta:     (a: Anticipo) => string;
  pie:     string;
}

/** «con el 30 %» o, si se capturó un importe, «con $4,000 MXN». */
const conEs = (a: Anticipo) => (a.fijo ? `con ${a.monto}` : `con el ${a.pct} %`);
const conEn = (a: Anticipo) => (a.fijo ? `with ${a.monto}` : `with ${a.pct} %`);

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
        h1a: () => "Tu cotización,",
        h1b: () => "a la mano",
        cuerpo:  () => "Te la acabamos de mandar. Si la abriste de pasada y se te fue entre otros mensajes, aquí la tienes de nuevo — y con el botón ya no tienes que volver a armarla.",
        cta:     () => "Abrir mi cotización",
        pie:     "Los precios de esta cotización se respetan. Si algo cambió —fechas, cuántos van, qué recorridos— dinos y la ajustamos.",
      },
      3: {
        subject: (t: string, a: Anticipo) => (a.completo ? `Aparta tu ${t}` : `Aparta tu ${t} ${conEs(a)}`),
        h1a: (a: Anticipo) => (a.completo ? "Aparta tu lugar" : "No hace falta que"),
        h1b: (a: Anticipo) => (a.completo ? "hoy mismo" : "pagues todo hoy"),
        // Sin la cancelación en el cuerpo: la de cada recorrido va abajo
        // (`lineasCancelacion`), y el Edén no tiene reembolso.
        cuerpo:  (a: Anticipo) => (a.completo
          ? "Con el pago completo queda apartado tu lugar y el día del recorrido ya no pagas nada."
          : `Puedes apartar tu lugar ${conEs(a)} y liquidar el resto el día del recorrido, en efectivo o con tarjeta.`),
        cta:     (a: Anticipo) => (a.completo ? "Apartar mi lugar" : `Apartar ${conEs(a)}`),
        pie:     "Los fines de semana y los puentes se llenan primero. Si tienes una fecha en mente, mejor asegurarla.",
      },
      4: {
        subject: () => "¿Te ayudamos a decidir?",
        h1a: () => "Última de",
        h1b: () => "nuestra parte",
        cuerpo:  () => "No te vamos a seguir escribiendo. Solo queríamos decirte que si algo no te terminó de convencer —las fechas, el precio, si es apto para tu grupo, cómo llegar— hay una persona de este lado que te contesta en menos de una hora.",
        cta:     () => "Escribirle a una persona",
        pie:     "Tu cotización sigue guardada por si la quieres retomar más adelante.",
      },
    } as Record<QuotePaso, TextosPaso>,
    apartas:  (a: Anticipo) => (a.completo ? "Pago completo" : `Apartas hoy ${conEs(a)}`),
    verCarrito: "Se abre con todo lo que cotizaste, listo para pagar.",
    ctaLiga:  (monto: string) => `Pagar ${monto} en línea`,
    verLiga:  "Se abre el pago seguro con tarjeta de tu cotización.",
    ctaWa:    "Escríbenos por WhatsApp",
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
        h1a: () => "Your quote,",
        h1b: () => "one click away",
        cuerpo:  () => "We just sent it over. If you skimmed it and it slipped down your inbox, here it is again — and the button means you don't have to build it a second time.",
        cta:     () => "Open my quote",
        pie:     "The prices in this quote stand. If anything changed — dates, how many of you, which tours — tell us and we'll adjust it.",
      },
      3: {
        subject: (t: string, a: Anticipo) => (a.completo ? `Hold your ${t}` : `Hold your ${t} ${conEn(a)}`),
        h1a: (a: Anticipo) => (a.completo ? "Hold your spot" : "You don't have to"),
        h1b: (a: Anticipo) => (a.completo ? "today" : "pay it all today"),
        cuerpo:  (a: Anticipo) => (a.completo
          ? "Paying in full holds your spot, and there's nothing left to pay on the day of the tour."
          : `You can hold your spot ${conEn(a)} and settle the rest on the day of the tour, in cash or by card.`),
        cta:     (a: Anticipo) => (a.completo ? "Hold my spot" : `Hold my spot ${conEn(a)}`),
        pie:     "Weekends and long weekends fill up first. If you have a date in mind, it's worth locking it in.",
      },
      4: {
        subject: () => "Can we help you decide?",
        h1a: () => "Last one",
        h1b: () => "from us",
        cuerpo:  () => "We won't keep writing. We just wanted to say that if something didn't quite convince you — the dates, the price, whether it suits your group, how to get here — there's a real person on this end who answers in under an hour.",
        cta:     () => "Message a real person",
        pie:     "Your quote stays saved in case you want to pick it up later.",
      },
    } as Record<QuotePaso, TextosPaso>,
    apartas:  (a: Anticipo) => (a.completo ? "Full payment" : `You pay ${a.fijo ? a.monto : `${a.pct} %`} today`),
    verCarrito: "It opens with everything you quoted, ready to pay.",
    ctaLiga:  (monto: string) => `Pay ${monto} online`,
    verLiga:  "It opens the secure card payment for your quote.",
    ctaWa:    "Message us on WhatsApp",
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

/** Las filas que no son el `_meta`: las noches de hotel cotizadas. */
function filasHotel(packageItems: unknown): unknown[] {
  return Array.isArray(packageItems)
    ? packageItems.filter((p) => !!p && typeof p === "object" && (p as { _meta?: unknown })._meta !== true)
    : [];
}

/** El `_meta: true` de `packageItems`: el del precio (anticipo, descuento) y los datos del bot. */
function metaPaquete(packageItems: unknown): Record<string, unknown> {
  const m = Array.isArray(packageItems)
    ? packageItems.find((p) => !!p && typeof p === "object" && (p as { _meta?: unknown })._meta === true)
    : undefined;
  return (m as Record<string, unknown> | undefined) ?? {};
}

/** El paquete del catálogo de la cotización: el del `_meta` del bot o, si no, su `tourSlug`. */
function paqueteDe(packageItems: unknown, tourSlug?: string | null): string | null {
  const meta = metaPaquete(packageItems);
  const slug = typeof meta.paqueteSlug === "string" ? meta.paqueteSlug : tourSlug ?? "";
  return slug && getPaquete(slug) ? slug : null;
}

/**
 * El anticipo de ESTA cotización (lote 4, 5 nov 2026): el capturado en el
 * panel o, sin capturar, el 30 %. Se dice como importe si así se capturó
 * ($4,000) o si no es un porcentaje redondo; si es el 100 %, como pago completo.
 */
function anticipoDeCotizacion(d: Pick<QuoteEmailInput, "totalAmount" | "packageItems">, moneda: (n: number) => string): Anticipo {
  const meta = metaPaquete(d.packageItems) as MetaPrecio;
  const { anticipo, pct } = anticipoDe(d.totalAmount, meta);
  const fijo = meta.anticipoTipo === "fixed" || (meta.anticipoTipo == null && meta.anticipo != null && pct % 5 !== 0);
  return { monto: moneda(anticipo), pct, fijo, completo: d.totalAmount > 0 && anticipo >= d.totalAmount };
}

type Textos = (typeof TEXTOS)["es"] | (typeof TEXTOS)["en"];

/**
 * A dónde manda el botón: la misma regla que el `linkPago` del bot.
 *
 *  · 🔴 Solo a la web si cobra EXACTAMENTE lo cotizado (`cobraComoLaWeb`, lote
 *    4, 5 nov 2026): con descuento, precio a mano, extras cobrados o
 *    conceptos a mano el carrito cobraba otro precio y la reserva nacía sin
 *    nada de eso. Entonces va la liga de anticipo de ESTA cotización, si
 *    tiene, o WhatsApp.
 *  · Un paquete del catálogo → su página (/reservar-paquete), con su precio.
 *  · Noches de hotel a la medida o un RZR → la liga o WhatsApp: ninguna
 *    página los cobra igual. 🔴 Antes el carrito se abría con los recorridos
 *    sueltos (los del paquete incluidos): el cliente pagaba los tours sin el
 *    hotel y a otro precio, y el hotel nunca se apartaba.
 *  · Recorridos reconocidos → al carrito ya cargado.
 */
function destino(
  d: Pick<QuoteEmailInput, "lineItems" | "packageItems" | "tourSlug" | "extraItems" | "totalAmount" | "ligaPago">,
  tourName: string,
  T: Textos,
): { href: string; tipo: "web" | "liga" | "wa" } {
  const wa = { href: `https://wa.me/${WA}?text=${encodeURIComponent(T.waTexto(tourName))}`, tipo: "wa" as const };
  const liga = d.ligaPago?.url ? { href: esc(d.ligaPago.url), tipo: "liga" as const } : null;
  const otraVia = liga ?? wa;
  if (!cobraComoLaWeb(d)) return otraVia;
  const paquete = paqueteDe(d.packageItems, d.tourSlug);
  if (paquete) return { href: `${BASE}/reservar-paquete/${encodeURIComponent(paquete)}`, tipo: "web" };
  const conVehiculo = Array.isArray(d.lineItems)
    && d.lineItems.some((l) => !!l && typeof l === "object" && !(l as { _meta?: unknown })._meta && !!(l as { vehiculo?: unknown }).vehiculo);
  if (filasHotel(d.packageItems).length || conVehiculo) return otraVia;
  const slugs = slugsDe(d.lineItems);
  if (slugs.length) {
    return { href: `${BASE}/reservar/carrito?${slugs.map((s) => `agregar=${encodeURIComponent(s)}`).join("&")}`, tipo: "web" };
  }
  return otraVia;
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
  const P = T.pasos[d.paso];
  const nombreCorto = d.tourName.split("—")[0].trim();
  // El anticipo de ESTA cotización, no un 30 % fijo (lote 4, 5 nov 2026).
  const anticipo = anticipoDeCotizacion(d, T.moneda);
  const montoAnticipo = anticipoDe(d.totalAmount, metaPaquete(d.packageItems) as MetaPrecio).anticipo;
  const recogida = lineasRecogida(slugs, d.locale, { generica: T.garantiaRecogida, sinTours: T.garantiaRecogidaSinTours });
  const cancelacion = lineasCancelacion(slugs, d.locale, T.garantiaCancelacion);

  // El paso 4 manda a una persona; los otros dos, a cerrar.
  const { href, tipo } = d.paso === 4
    ? { href: `https://wa.me/${WA}?text=${encodeURIComponent(T.waTexto(nombreCorto))}`, tipo: "wa" as const }
    : destino(d, nombreCorto, T);
  const esWa = tipo === "wa";
  // La liga cobra SU monto: el botón lo dice, para que nadie pague creyendo otra
  // cifra. Y «Abrir mi cotización» no puede llevar a un chat.
  const cta = tipo === "liga" && d.ligaPago ? T.ctaLiga(T.moneda(d.ligaPago.monto))
    : esWa && d.paso === 2 ? T.ctaWa
    : P.cta(anticipo);

  const primero = slugs.length ? TOURS_DB.find((t) => t.slug === slugs[0]) : undefined;

  const html = shellCorreo({
    locale: d.locale,
    preheader: d.locale === "en"
      ? "Huasteca Potosina · San Luis Potosí · Mexico"
      : "Huasteca Potosina · San Luis Potosí · México",
    eyebrow: T.folio(d.quoteNumber),
    h1a: P.h1a(anticipo),
    h1b: P.h1b(anticipo),
    entradilla: P.cuerpo(anticipo),
    cuerpo: [
      // La foto del primer recorrido cotizado. Sin recorridos reconocibles
      // (un paquete, el RZR) no se pone ninguna: mejor sin foto que con la de
      // otra cosa.
      primero ? fotoTour(primero.slug, primero.nombre, 200) + `<div style="height:26px"></div>` : "",
      parrafo(T.saludo(esc(d.customerName)), "0 0 20px 0"),
      tabla([
        filaDato(T.para, esc(nombreCorto), true),
        filaDato(T.cuando, fechaLarga(d.tourDate, d.locale) || T.porDefinir),
        filaMoney(T.total, T.moneda(d.totalAmount), undefined, true),
        filaMoney(T.apartas(anticipo), T.moneda(montoAnticipo), "verde"),
      ].join("")),
      boton(href, cta, esWa ? "whatsapp" : "verde"),
      tipo === "web" ? bajoBoton(T.verCarrito) : tipo === "liga" ? bajoBoton(T.verLiga) : "",
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

  return { subject: P.subject(nombreCorto, anticipo), html };
}

/**
 * «Tu cotización vence mañana» (oct 2026): el aviso automático de la fecha
 * límite. Sale UNA vez, el día anterior (o el mismo día si la cotización vence
 * el día en que se manda), solo a cotizaciones vivas y con correo. El equipo
 * manda además su recordatorio por WhatsApp desde el panel.
 *
 * Misma palanca que el resto: el anticipo de ESA cotización para apartar
 * (antes decía «el 30 %» fijo), nunca un descuento. Y lo que se dice de la
 * fecha es verdad: pasada esa fecha no garantizamos el precio ni el lugar; no
 * se inventa escasez.
 */
const VENCE = {
  es: {
    subject: (t: string, cuando: string) => `Tu cotización de ${t} vence ${cuando}`,
    h1a: "Tu cotización",
    h1b: (cuando: string) => `vence ${cuando}`,
    cuerpo: (fecha: string, a: Anticipo) => `Te la guardamos hasta el ${fecha}. Si ya lo decidiste, ${a.completo ? "apártala con el pago completo" : `apártala ${conEs(a)} y el resto lo pagas el día del recorrido`}. Si algo cambió —fechas, cuántos van, qué recorridos— contéstanos y la ajustamos.`,
    cta: (a: Anticipo) => (a.completo ? "Apartar mi lugar" : `Apartar ${conEs(a)}`),
    pie: "Después de esa fecha ya no podemos garantizarte el precio ni el lugar. Si necesitas más tiempo, escríbenos y te la extendemos.",
    vence: "Vence",
  },
  en: {
    subject: (t: string, cuando: string) => `Your ${t} quote expires ${cuando}`,
    h1a: "Your quote",
    h1b: (cuando: string) => `expires ${cuando}`,
    cuerpo: (fecha: string, a: Anticipo) => `We're holding it until ${fecha}. If you've decided, ${a.completo ? "hold your spot by paying in full" : `hold your spot ${conEn(a)} and pay the rest on the day of the tour`}. If anything changed — dates, how many of you, which tours — reply and we'll adjust it.`,
    cta: (a: Anticipo) => (a.completo ? "Hold my spot" : `Hold my spot ${conEn(a)}`),
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
  // El anticipo de ESTA cotización, no un 30 % fijo (lote 4, 5 nov 2026).
  const anticipo = anticipoDeCotizacion(d, T.moneda);
  const montoAnticipo = anticipoDe(d.totalAmount, metaPaquete(d.packageItems) as MetaPrecio).anticipo;
  const recogida = lineasRecogida(slugs, d.locale, { generica: T.garantiaRecogida, sinTours: T.garantiaRecogidaSinTours });
  const cancelacion = lineasCancelacion(slugs, d.locale, T.garantiaCancelacion);
  const { href, tipo } = destino(d, nombreCorto, T);
  const esWa = tipo === "wa";
  const cta = tipo === "liga" && d.ligaPago ? T.ctaLiga(T.moneda(d.ligaPago.monto)) : esWa ? T.pasos[4].cta(anticipo) : V.cta(anticipo);
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
    entradilla: V.cuerpo(fechaEnFrase, anticipo),
    cuerpo: [
      primero ? fotoTour(primero.slug, primero.nombre, 200) + `<div style="height:26px"></div>` : "",
      parrafo(T.saludo(esc(d.customerName)), "0 0 20px 0"),
      tabla([
        filaDato(T.para, esc(nombreCorto), true),
        filaDato(T.cuando, fechaLarga(d.tourDate, d.locale) || T.porDefinir),
        filaDato(V.vence, fechaVence),
        filaMoney(T.total, T.moneda(d.totalAmount), undefined, true),
        filaMoney(T.apartas(anticipo), T.moneda(montoAnticipo), "verde"),
      ].join("")),
      boton(href, cta, esWa ? "whatsapp" : "verde"),
      tipo === "web" ? bajoBoton(T.verCarrito) : tipo === "liga" ? bajoBoton(T.verLiga) : "",
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
