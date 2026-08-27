/**
 * Correo de confirmación de PAQUETE (tours + hotel).
 *
 * Vivía pegado dentro de `/api/paquetes/send-confirmation`, que solo se puede
 * llamar después de un pago real de Stripe: para mirar cómo se ve el correo del
 * producto más caro había que comprar uno. Aquí afuera se renderiza sin cobrar
 * nada (`src/scripts/previsualizar-correos-pagados.ts`).
 *
 * El diseño sigue el mismo sistema que la confirmación de tour: fondo `#edeae4`,
 * lienzo crema `#f4edd8`, cabecera verde profundo, Cormorant Garamond para los
 * nombres y las cifras, DM Sans para las etiquetas, y el dorado `#c4882a` como
 * único acento. Antes era un `<h2>` y dos tablas sin una sola nota de marca —
 * el correo más barato del sistema para el producto más caro.
 */

import { getEmails } from "./i18n/emails";
import { localizePaquete } from "./i18n/paquetes.en";
import { localizeTour } from "./i18n/localize";
import { TOURS_DB } from "./tours";
import type { Paquete } from "./paquetes";
import type { Locale } from "./i18n/config";

const BASE = "https://www.huasteca-potosina.com";
const WA   = "524891251458";

const fmx = (n: number) => `$${Math.round(n).toLocaleString("es-MX")} MXN`;

export function fechaLarga(ymd: string, locale: Locale): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return "";
  const f = new Date(`${ymd}T12:00:00`).toLocaleDateString(
    locale === "en" ? "en-US" : "es-MX",
    { weekday: "long", day: "numeric", month: "long", year: "numeric" },
  );
  return f.charAt(0).toUpperCase() + f.slice(1);
}

/** Fecha corta para el itinerario, donde la larga no cabe. */
function fechaCorta(ymd: string, locale: Locale): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return "";
  return new Date(`${ymd}T12:00:00`).toLocaleDateString(
    locale === "en" ? "en-US" : "es-MX",
    { weekday: "short", day: "numeric", month: "short" },
  );
}

export interface PaqueteEmailInput {
  locale:             Locale;
  paquete:            Paquete;
  confirmationNumber: string;
  customerName:       string;
  /** Primer día del viaje, `YYYY-MM-DD`. */
  fechaInicio:        string;
  adultos:            number;
  nMid:               number;   // 6–10 años
  nSmall:             number;   // menores de 6
  habitacion:         string;
  checkin:            string;
  nochesHotel:        number;
  nocheExtra:         boolean;
  /** El tour que eligió para el día que el paquete deja a elección. */
  eleccionNombre:     string;
  lineItems:          { tourSlug?: string; tourName?: string; tourDate?: string }[];
  totalFull:          number;
  cobrado:            number;
  pendiente:          number;
  /** Porcentaje que pagó por adelantado. */
  pctNum:             number;
}

// ── Piezas del sistema visual ───────────────────────────────────────────────

/** Barra de sección: verde profundo con la etiqueta en dorado. */
const barra = (texto: string) => `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#1a2e1a;margin:32px 0 0 0;">
    <tr><td style="padding:13px 22px;">
      <p style="margin:0;font-family:'DM Sans',Arial,sans-serif;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#c4882a;">${texto}</p>
    </td></tr>
  </table>`;

/** Renglón etiqueta / valor dentro de una tarjeta crema. */
const dato = (k: string, v: string, primero = false) => `
  <tr>
    <td style="width:45%;border:1px solid #d4ccbc;${primero ? "" : "border-top:none;"}background-color:#faf7ee;padding:14px 22px;vertical-align:top;">
      <p style="margin:0;font-family:'DM Sans',Arial,sans-serif;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#8a7a5a;">${k}</p>
    </td>
    <td style="width:55%;border:1px solid #d4ccbc;border-left:none;${primero ? "" : "border-top:none;"}background-color:#faf7ee;padding:14px 22px;vertical-align:top;text-align:right;">
      <p style="margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-size:17px;color:#1a2e1a;">${v}</p>
    </td>
  </tr>`;

/** Renglón de dinero. `acento` lo pinta en verde (lo pagado) o terracota (lo que falta). */
const money = (k: string, v: string, acento?: "verde" | "terracota", grande = false) => {
  const color = acento === "verde" ? "#3a6b1a" : acento === "terracota" ? "#9a4a1e" : "#1a2e1a";
  return `
  <tr>
    <td style="border:1px solid #d4ccbc;border-top:none;background-color:#faf7ee;padding:${grande ? "18px" : "13px"} 22px;">
      <p style="margin:0;font-family:'DM Sans',Arial,sans-serif;font-size:${grande ? "13" : "12"}px;color:#3a3a2e;">${k}</p>
    </td>
    <td style="border:1px solid #d4ccbc;border-top:none;border-left:none;background-color:#faf7ee;padding:${grande ? "18px" : "13px"} 22px;text-align:right;white-space:nowrap;">
      <p style="margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-size:${grande ? "26" : "19"}px;font-weight:${grande ? "500" : "400"};color:${color};">${v}</p>
    </td>
  </tr>`;
};

export function buildPaqueteConfirmEmailHtml(d: PaqueteEmailInput): { subject: string; html: string } {
  const L = d.locale;
  const T = getEmails(L).paquete;
  const paqueteLoc = localizePaquete(d.paquete, L);

  /**
   * El itinerario, con la foto del recorrido de cada día.
   *
   * Las fotos son las versiones para correo (`public/imagenes/correo/`): las
   * del sitio pesan hasta 850 KB y dos están en `.webp`, que Outlook no pinta.
   * El `alt` lleva el nombre real porque casi todos los clientes bloquean las
   * imágenes hasta que la persona las autoriza — sin ellas, el correo se sigue
   * leyendo completo.
   */
  const itinerarioHtml = d.lineItems.length
    ? barra(T.tuItinerario) + `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        ${d.lineItems.map((l, i) => {
          const base = TOURS_DB.find((t) => t.slug === l.tourSlug);
          const nombre = base ? localizeTour(base, L).nombre : (l.tourName ?? "");
          const dia = d.paquete.itinerario.filter((x) => x.tourSlug)[i]?.dia ?? i + 1;
          const foto = base
            ? `<img src="${BASE}/imagenes/correo/${base.slug}.jpg" width="150" alt="${nombre}"
                 style="display:block;width:150px;height:104px;object-fit:cover;border:0;">`
            : "";
          return `
          <tr>
            ${foto ? `<td style="width:150px;border:1px solid #d4ccbc;border-top:${i === 0 ? "1px" : "0"} solid #d4ccbc;border-right:none;background-color:#faf7ee;padding:0;vertical-align:top;">${foto}</td>` : ""}
            <td style="border:1px solid #d4ccbc;${i === 0 ? "" : "border-top:none;"}${foto ? "border-left:none;" : ""}background-color:#faf7ee;padding:16px 22px;vertical-align:top;">
              <p style="margin:0 0 4px 0;font-family:'DM Sans',Arial,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#c4882a;">${T.diaN(dia)}</p>
              <p style="margin:0 0 5px 0;font-family:'Cormorant Garamond',Georgia,serif;font-size:19px;color:#1a2e1a;line-height:1.25;">${nombre}</p>
              ${l.tourDate ? `<p style="margin:0;font-family:'DM Sans',Arial,sans-serif;font-size:12px;color:#8a7a5a;">${fechaCorta(l.tourDate, L)}</p>` : ""}
            </td>
          </tr>`;
        }).join("")}
      </table>`
    : "";

  const incluyeHtml = paqueteLoc.incluye?.length
    ? barra(T.todoIncluido) + `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr><td style="border:1px solid #d4ccbc;background-color:#faf7ee;padding:20px 22px;">
          ${paqueteLoc.incluye.map((x) => `
            <p style="margin:0 0 9px 0;font-family:'DM Sans',Arial,sans-serif;font-size:13px;font-weight:300;color:#3a3a2e;line-height:1.6;">
              <span style="color:#3a6b1a;">✓</span>&nbsp; ${x}
            </p>`).join("")}
        </td></tr>
      </table>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="${L}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${T.subject(d.confirmationNumber)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');
  * { margin:0; padding:0; }
  body { font-family:'DM Sans','Helvetica Neue',Arial,sans-serif; background-color:#edeae4; line-height:1.6; }
  table { border-collapse:collapse; }
  img { display:block; max-width:100%; height:auto; }
  a { color:#1a2e1a; text-decoration:none; }
  .wrapper { background-color:#edeae4; padding:20px 0; }
  .container { max-width:620px; margin:0 auto; background-color:#f4edd8; }
  @media only screen and (max-width:640px) {
    .wrapper { padding:0!important; }
    .container,.full-width { width:100%!important; max-width:100%!important; }
    .mobile-p { padding-left:24px!important; padding-right:24px!important; }
    .mobile-plg { padding:34px 24px!important; }
    .hero-title { font-size:32px!important; }
  }
</style>
</head>
<body>
<div class="wrapper">

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr><td style="padding:14px 0;text-align:center;">
      <p style="margin:0;font-family:'DM Sans',Arial,sans-serif;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#6a7a5a;">${T.preheader}</p>
    </td></tr>
  </table>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr><td align="center" style="padding:0;">
      <table class="container full-width" role="presentation" width="620" cellspacing="0" cellpadding="0" border="0">

        <!-- CABECERA -->
        <tr><td class="mobile-plg" style="padding:36px 40px 40px 40px;background-color:#1a2e1a;">
          <p style="margin:0 0 10px 0;font-family:'DM Sans',Arial,sans-serif;font-size:11px;letter-spacing:3.5px;text-transform:uppercase;color:rgba(255,255,255,0.65);">${T.eyebrow}</p>
          <h1 class="hero-title" style="margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-size:44px;font-style:italic;font-weight:300;color:#f4edd8;line-height:1.1;">
            ${T.h1a}<br>${T.h1b}
          </h1>
          <p style="margin:14px 0 0 0;font-family:'DM Sans',Arial,sans-serif;font-size:14px;font-weight:300;color:rgba(244,237,216,0.75);line-height:1.7;">${T.entradilla}</p>
        </td></tr>

        <tr><td class="mobile-plg" style="background-color:#f4edd8;padding:44px 48px 48px 48px;">

          <p style="margin:0 0 6px 0;font-family:'Cormorant Garamond',Georgia,serif;font-size:28px;color:#1a2e1a;line-height:1.2;">
            ${L === "en" ? "Hi" : "Hola"} <span style="font-style:italic;color:#c4882a;">${d.customerName}</span>
          </p>

          <table role="presentation" width="48" cellspacing="0" cellpadding="0" border="0" style="margin:18px 0 0 0;">
            <tr><td style="height:1px;background-color:#c4882a;"></td></tr>
          </table>

          <!-- FOLIO -->
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:26px 0 0 0;">
            <tr><td style="border:1px solid #c4882a;background-color:#fdf9f0;padding:24px 30px;text-align:center;">
              <p style="margin:0 0 6px 0;font-family:'DM Sans',Arial,sans-serif;font-size:11px;letter-spacing:2.5px;text-transform:uppercase;color:#8a7a5a;">${T.confirmacion}</p>
              <p style="margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-size:30px;font-weight:500;color:#1a2e1a;letter-spacing:1px;">${d.confirmationNumber}</p>
            </td></tr>
          </table>

          <!-- EL VIAJE -->
          ${barra(T.paquete)}
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr><td colspan="2" style="border:1px solid #d4ccbc;background-color:#faf7ee;padding:20px 22px;">
              <p style="margin:0 0 4px 0;font-family:'Cormorant Garamond',Georgia,serif;font-size:24px;color:#1a2e1a;line-height:1.2;">${paqueteLoc.nombre}</p>
              <p style="margin:0;font-family:'DM Sans',Arial,sans-serif;font-size:12px;letter-spacing:1px;color:#8a7a5a;">${paqueteLoc.duracion}</p>
            </td></tr>
            ${d.fechaInicio ? dato(T.fechaInicio, fechaLarga(d.fechaInicio, L) || d.fechaInicio) : ""}
            ${dato(T.personas, T.grupoLinea(d.adultos, d.nMid, d.nSmall))}
            ${d.habitacion ? dato(T.habitacion, d.habitacion) : ""}
            ${d.checkin ? dato(T.entradaHotel, `${fechaLarga(d.checkin, L)}<br><span style="font-family:'DM Sans',Arial,sans-serif;font-size:12px;color:#8a7a5a;">${T.noches(d.nochesHotel)}</span>`) : ""}
            ${d.eleccionNombre && d.paquete.eleccionTour ? dato(T.eligeDia(d.paquete.eleccionTour.dia), d.eleccionNombre) : ""}
          </table>
          ${d.nocheExtra ? `
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-left:2px solid #c4882a;margin:16px 0 0 0;">
            <tr><td style="padding:2px 0 2px 18px;">
              <p style="margin:0;font-family:'DM Sans',Arial,sans-serif;font-size:13px;font-weight:300;color:#3a6b1a;line-height:1.7;">${T.nocheExtraNota}</p>
            </td></tr>
          </table>` : ""}

          ${itinerarioHtml}

          <!-- DINERO -->
          ${barra(T.resumenPago)}
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td style="border:1px solid #d4ccbc;background-color:#faf7ee;padding:18px 22px;">
                <p style="margin:0;font-family:'DM Sans',Arial,sans-serif;font-size:13px;color:#3a3a2e;">${T.precio}</p>
              </td>
              <td style="border:1px solid #d4ccbc;border-left:none;background-color:#faf7ee;padding:18px 22px;text-align:right;white-space:nowrap;">
                <p style="margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-size:26px;font-weight:500;color:#1a2e1a;">${fmx(d.totalFull)}</p>
              </td>
            </tr>
            ${money(T.pagoInicial(d.pctNum), fmx(d.cobrado), "verde")}
            ${d.pendiente > 0 ? money(T.saldoPendiente, fmx(d.pendiente), "terracota", true) : ""}
          </table>

          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-left:2px solid #c4882a;margin:20px 0 0 0;">
            <tr><td style="padding:2px 0 2px 18px;">
              <p style="margin:0;font-family:'DM Sans',Arial,sans-serif;font-size:13px;font-weight:300;color:#3a3a2e;line-height:1.75;">${d.pendiente > 0 ? T.notaSaldo : T.notaLiquidado}</p>
            </td></tr>
          </table>

          ${incluyeHtml}

          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:32px 0 0 0;">
            <tr><td style="border-top:1px solid #d4ccbc;padding:22px 0 0 0;">
              <p style="margin:0 0 14px 0;font-family:'DM Sans',Arial,sans-serif;font-size:13px;font-weight:300;color:#8a7a5a;line-height:1.7;">${T.guiaAdjunta}</p>
              <p style="margin:0;font-family:'DM Sans',Arial,sans-serif;font-size:13px;font-weight:300;color:#3a3a2e;line-height:1.7;">
                ${T.dudas.replace("+52 489 125 1458", `<a href="https://wa.me/${WA}" style="color:#3a6b1a;font-weight:500;">+52 489 125 1458</a>`)}
              </p>
            </td></tr>
          </table>

        </td></tr>

        <tr><td style="background-color:#1a2e1a;padding:22px 40px;text-align:center;">
          <p style="margin:0;font-family:'DM Sans',Arial,sans-serif;font-size:11px;letter-spacing:2.5px;text-transform:uppercase;color:rgba(244,237,216,0.5);">Tours Huasteca Potosina · Xilitla, S.L.P.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</div>
</body>
</html>`;

  return { subject: T.subject(d.confirmationNumber), html };
}
