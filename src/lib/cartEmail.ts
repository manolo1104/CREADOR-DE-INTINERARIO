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
}


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

const fila = (izq: string, der: string, sub = "") => `
      <tr>
        <td style="padding:13px 16px;border-top:1px solid #e3ddc9;vertical-align:top">
          <div style="color:#1a2e1a;font-size:14px;line-height:1.35">${izq}</div>
          ${sub ? `<div style="color:#7d7566;font-size:12px;margin-top:3px;line-height:1.4">${sub}</div>` : ""}
        </td>
        <td style="padding:13px 16px;border-top:1px solid #e3ddc9;text-align:right;white-space:nowrap;color:#1a2e1a;font-size:14px;vertical-align:top">${der}</td>
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

  const anticipo = d.anticipo ?? Math.round((d.total * ANTICIPO_PCT) / 100);

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1a2e1a;background:#ffffff">
    <div style="background:#0e1710;padding:22px 24px">
      <div style="color:#c4882a;font-size:11px;letter-spacing:3px;text-transform:uppercase">Tours Huasteca Potosina</div>
      <h1 style="font-size:23px;margin:8px 0 0;color:#f5f0e3;font-weight:normal">${c.titulo}</h1>
    </div>

    <div style="padding:24px">
      <p style="font-size:15px;line-height:1.6;color:#444;margin:0 0 22px">${c.intro}</p>

      <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#8a7a5a;margin:0 0 8px">
        ${T.tuViaje}${lineas && lineas.length > 1 ? T.recorridos(lineas.length) : ""}
      </div>
      <table style="width:100%;border-collapse:collapse;background:#faf7ee;border:1px solid #e3ddc9">
        <tr><td colspan="2" style="padding:12px 16px;background:#f2ecdc;font-size:13px;color:#5c5347">
          ${T.grupoDe(grupo)}
        </td></tr>
        ${filasTours}${filaTraslado}${filaHotel}
        <tr>
          <td style="padding:14px 16px;border-top:2px solid #d8cfb8;font-size:15px">${T.total}</td>
          <td style="padding:14px 16px;border-top:2px solid #d8cfb8;text-align:right;font-size:17px;font-weight:bold;color:#3a6b1a;white-space:nowrap">${mx(d.total, locale)}</td>
        </tr>
        <tr>
          <td style="padding:0 16px 14px;font-size:13px;color:#7d7566">${T.apartasHoy(ANTICIPO_PCT)}</td>
          <td style="padding:0 16px 14px;text-align:right;font-size:14px;color:#c4882a;white-space:nowrap">${mx(anticipo, locale)}</td>
        </tr>
      </table>

      <p style="text-align:center;margin:26px 0 8px">
        <a href="${d.restoreUrl}" style="background:#c4882a;color:#0e1710;text-decoration:none;padding:15px 34px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;font-size:13px;display:inline-block">
          ${c.cta} →
        </a>
      </p>
      <p style="text-align:center;font-size:12px;color:#8a8275;margin:0 0 22px">
        ${T.ctaSub}
      </p>

      <table style="width:100%;border-collapse:collapse;font-size:12px;color:#6b6357;border-top:1px solid #e3ddc9">
        <tr>
          <td style="padding:12px 0 0;line-height:1.6">
            ${T.garantias.join("<br>")}
          </td>
        </tr>
      </table>

      <p style="font-size:12px;line-height:1.6;color:#8a8275;text-align:center;margin:20px 0 0">
        ${T.prefieresChat}
        <a href="https://wa.me/524891251458" style="color:#3a6b1a;text-decoration:none">+52 489 125 1458</a>.
      </p>
      <p style="font-size:11px;color:#aaa;text-align:center;margin-top:16px">
        ${T.yaNoInteresa}
      </p>
    </div>
  </div>`;

  return { subject: c.subject(tituloTour), html };
}
