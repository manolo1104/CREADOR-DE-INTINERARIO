// Correos de carrito abandonado: cotización inmediata + recordatorios de recuperación.
// El link "restoreUrl" regresa al cliente a /reservar-tour/[slug] con su selección precargada.

import { getEmails, emailLocale } from "./i18n/emails";
import { TOURS_DB } from "./tours";
import { localizeTour } from "./i18n/localize";
import type { Locale } from "./i18n/config";

/**
 * El nombre del recorrido en el idioma del correo.
 *
 * Los carritos guardan el nombre en ESPAÑOL (se escribe al agregarlo, desde
 * `TOURS_DB`), así que un correo en inglés decía "Expedición Tamul". Se resuelve
 * otra vez por slug cuando lo hay; si no, se deja el guardado.
 */
function nombreTour(nombre: string, slug: string | undefined, locale: Locale): string {
  if (locale === "es" || !slug) return nombre;
  const base = TOURS_DB.find((t) => t.slug === slug);
  return base ? localizeTour(base, locale).nombre : nombre;
}

const mx = (n: number, locale: Locale) =>
  `$${Math.round(n).toLocaleString(locale === "en" ? "en-US" : "es-MX")} MXN`;

function formatFecha(ymd: string, locale: Locale): string {
  // ymd = "YYYY-MM-DD" → "15 de agosto de 2026" / "August 15, 2026"
  // (anclado a mediodía para no desfasar día)
  try {
    const d = new Date(`${ymd}T12:00:00`);
    return d.toLocaleDateString(locale === "en" ? "en-US" : "es-MX", {
      day: "numeric", month: "long", year: "numeric",
    });
  } catch {
    return ymd;
  }
}

export type CartEmailTipo = "cotizacion" | "recordatorio1" | "recordatorio2" | "recordatorio3";

export interface CartEmailLinea {
  tourName:      string;
  /** Para poder traducir el nombre; opcional en cotizaciones viejas. */
  tourSlug?:     string;
  tourDate:      string;
  adults:        number;
  childrenMid?:  number;  // 6–10 años, 70 %
  childrenSmall?: number; // menores de 6, 50 %
  children?:     number;  // total, si no vienen los tramos
  subtotal?:     number;
  eleccion?:     string;
  unidades?:     number;  // tours por vehículo (RZR)
}

export interface CartEmailInput {
  tipo:       CartEmailTipo;
  tourName:   string;
  tourSlug?:  string;
  tourDate:   string;
  adults:     number;
  children:   number;
  total:      number;
  restoreUrl: string;
  /** El itinerario completo. Sin esto el correo resume todo en una línea. */
  lineas?:    CartEmailLinea[];
  hospedaje?: {
    habitacion: string; noches: number; huespedes: number;
    checkin?: string; checkout?: string; subtotal?: number;
  } | null;
  traslado?:  { ciudad: string; personas: number; subtotal?: number } | null;
  anticipo?:  number;
  /** Idioma en que el cliente armó el carrito. Cae al español si no viene. */
  locale?:    string;
  /**
   * Del destinatario, para firmar su baja de un clic.
   *
   * El criterio en todo el sistema es uno: ¿ya nos pagó? Si no —itinerario,
   * secuencia, carrito, cotización, boletín— el correo lleva baja. Si sí
   * —confirmaciones, entrega de la guía, petición de reseña— no la lleva:
   * no es publicidad y ofrecerle darse de baja de su propia compra confunde.
   */
  email?:     string | null;
}


import { pctACobrar } from "@/lib/carrito";
import {
  C, WA, bajoBoton, boton, filaMoney, fotoTour, garantias, shellCorreo,
} from "./emailLayout";

const ANTICIPO_PCT = 30;

/** "2 adultos · 1 de 6 a 10 años · 1 menor de 6" — el desglose que importa. */
function gente(l: CartEmailLinea, locale: Locale): string {
  const c = getEmails(locale).carrito;
  if (l.unidades) return c.vehiculos(l.unidades);
  const partes: string[] = [];
  if (l.adults) partes.push(c.adultos(l.adults));
  if (l.childrenMid)   partes.push(c.de6a10(l.childrenMid));
  if (l.childrenSmall) partes.push(c.menoresDe6(l.childrenSmall));
  if (!l.childrenMid && !l.childrenSmall && l.children) {
    partes.push(c.menores(l.children));
  }
  return partes.join(" · ") || c.unaPersona;
}

// Mismo tratamiento de borde y fondo que `filaMoney` del módulo compartido:
// con `border-top` solo, los renglones del itinerario y los del total no
// cerraban la misma caja y se veía un escalón a media tabla.
const fila = (izq: string, der: string, sub = "") => `
      <tr>
        <td style="border:1px solid #d4ccbc;border-top:none;background-color:#faf7ee;padding:14px 22px;vertical-align:top;">
          <div style="font-family:'DM Sans',Arial,sans-serif;color:#1a2e1a;font-size:14px;line-height:1.35;">${izq}</div>
          ${sub ? `<div style="font-family:'DM Sans',Arial,sans-serif;color:#8a7a5a;font-size:12px;font-weight:300;margin-top:4px;line-height:1.5;">${sub}</div>` : ""}
        </td>
        <td style="border:1px solid #d4ccbc;border-top:none;border-left:none;background-color:#faf7ee;padding:14px 22px;text-align:right;white-space:nowrap;vertical-align:top;">
          <span style="font-family:'Cormorant Garamond',Georgia,serif;color:#1a2e1a;font-size:18px;">${der}</span>
        </td>
      </tr>`;

export function buildCartEmailHtml(d: CartEmailInput): { subject: string; html: string } {
  const locale = emailLocale(d.locale);
  const T = getEmails(locale).carrito;
  const c = T.tipos[d.tipo];
  const lineas = d.lineas?.length ? d.lineas : null;
  const tituloTour = nombreTour(d.tourName, d.tourSlug, locale);

  // ⚠️ El grupo NO se suma entre recorridos: son las MISMAS personas yendo
  // varios días. Sumando, un viaje de 2 días para 3 personas decía "6".
  const grupo = lineas
    ? Math.max(...lineas.map((l) => (l.adults || 0) + (l.childrenMid || 0) + (l.childrenSmall || 0) + (l.children || 0)), 0)
    : d.adults + d.children;

  const filasTours = lineas
    ? lineas.map((l) => fila(
        nombreTour(l.tourName, l.tourSlug, locale).split("—")[0].trim(),
        l.subtotal != null ? mx(l.subtotal, locale) : "",
        `${formatFecha(l.tourDate, locale)} · ${gente(l, locale)}${l.eleccion ? T.eligio(l.eleccion) : ""}`,
      )).join("")
    : fila(tituloTour, mx(d.total, locale), `${formatFecha(d.tourDate, locale)} · ${T.adultos(d.adults)}${d.children ? ` · ${T.menores(d.children)}` : ""}`);

  const filaHotel = d.hospedaje
    ? fila(
        `🏨 ${d.hospedaje.habitacion}`,
        d.hospedaje.subtotal != null ? mx(d.hospedaje.subtotal, locale) : "",
        T.nochesHuespedes(d.hospedaje.noches, d.hospedaje.huespedes)
        + (d.hospedaje.checkin && d.hospedaje.checkout
            ? ` · ${formatFecha(d.hospedaje.checkin, locale)} → ${formatFecha(d.hospedaje.checkout, locale)}`
            : ""),
      )
    : "";

  const filaTraslado = d.traslado
    ? fila(
        T.traslado(d.traslado.ciudad),
        d.traslado.subtotal != null ? mx(d.traslado.subtotal, locale) : "",
        T.idaYVuelta(d.traslado.personas),
      )
    : "";

  // El correo tiene que decir el MISMO porcentaje que se le cobró: con un solo
  // día de recorrido es el 100 %, no el 30 % de siempre.
  const diasCorreo = new Set((d.lineas ?? []).map((l: any) => l.tourDate).filter(Boolean)).size;
  const pctCorreo  = pctACobrar(diasCorreo, Boolean((d as any).hospedaje));
  const anticipo   = d.anticipo ?? Math.round((d.total * pctCorreo) / 100);

  // La foto del primer recorrido del carrito: es lo que estaba a punto de
  // comprar, y verlo pesa más que cualquier recordatorio escrito.
  const slugFoto = (lineas?.[0]?.tourSlug) || d.tourSlug || "";
  const tourFoto = TOURS_DB.find((t) => t.slug === slugFoto);

  const html = shellCorreo({
    locale,
    preheader: locale === "en"
      ? "Huasteca Potosina · San Luis Potosí · Mexico"
      : "Huasteca Potosina · San Luis Potosí · México",
    eyebrow: `${T.tuViaje}${lineas && lineas.length > 1 ? T.recorridos(lineas.length) : ""}`,
    h1a: c.titulo,
    entradilla: c.intro,
    cuerpo: [
      tourFoto ? fotoTour(tourFoto.slug, tituloTour, 190) : "",
      `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:${tourFoto ? "0" : "0"} 0 0 0;">
        <tr><td colspan="2" style="border:1px solid ${C.borde};${tourFoto ? "border-top:none;" : ""}background-color:#f2ecdc;padding:13px 22px;">
          <p style="margin:0;font-family:'DM Sans',Arial,sans-serif;font-size:12px;letter-spacing:1px;color:#5c5347;">${T.grupoDe(grupo)}</p>
        </td></tr>
        ${filasTours}${filaTraslado}${filaHotel}
        ${filaMoney(T.total, mx(d.total, locale), "verde", true)}
        ${filaMoney(pctCorreo >= 100 ? T.pagoCompleto : T.apartasHoy(pctCorreo), mx(anticipo, locale))}
      </table>`,
      boton(d.restoreUrl, c.cta, "dorado"),
      bajoBoton(T.ctaSub),
      garantias([...T.garantias]),
    ].join(""),
    pie: `${T.prefieresChat} <a href="https://wa.me/${WA}" style="color:${C.verde};font-weight:500;">+52 489 125 1458</a>.`,
    origen: T.yaNoInteresa,
    paraBaja: d.email ?? undefined,
  });

  return { subject: c.subject(tituloTour), html };
}
