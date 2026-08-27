/**
 * El sistema visual de los correos, en un solo sitio.
 *
 * Hasta ahora solo dos correos —la confirmación de tour y la de paquete— tenían
 * la marca puesta. Los otros quince salían en Arial sobre fondo blanco: el
 * itinerario, los cinco de la secuencia, los cuatro del carrito, la entrega de
 * la guía, la petición de reseña y los tres de cotización. El cliente compraba
 * a una marca y recibía correos de otra.
 *
 * Vive aparte y no copiado en cada archivo por la misma razón de siempre: seis
 * copias de una cabecera divergen en cuanto alguien toca una. Si mañana cambia
 * el dorado, cambia aquí.
 *
 * ── Reglas de correo que condicionan el código ────────────────────────────
 *
 * · Tablas, no flexbox ni grid: Outlook usa el motor de Word y no los soporta.
 * · Estilos EN LÍNEA: Gmail recorta el `<head>` en varios contextos. El
 *   `<style>` solo lleva el `@import` de las fuentes y las media queries, que
 *   son mejoras, no la base — sin ellas el correo se sigue viendo bien.
 * · Cormorant Garamond y DM Sans siempre con respaldo real (Georgia y Arial):
 *   Outlook de escritorio no baja fuentes web y usará el respaldo.
 * · Ninguna imagen carga un dato: casi todos los clientes las bloquean hasta
 *   que la persona las autoriza.
 */

import type { Locale } from "./i18n/config";
import { linkBaja } from "./baja";

export const BASE = "https://www.huasteca-potosina.com";
export const WA   = "524891251458";

/** La paleta, tal cual la define `tailwind.config.ts`. */
export const C = {
  fondo:    "#edeae4",  // detrás del lienzo
  lienzo:   "#f4edd8",  // crema
  tarjeta:  "#faf7ee",
  borde:    "#d4ccbc",
  oscuro:   "#1a2e1a",  // verde-profundo
  verde:    "#3a6b1a",  // verde-selva
  dorado:   "#c4882a",
  terracota:"#9a4a1e",
  texto:    "#3a3a2e",
  tenue:    "#8a7a5a",
  whatsapp: "#25D366",
} as const;

const SERIF = "'Cormorant Garamond',Georgia,'Times New Roman',serif";
const SANS  = "'DM Sans','Helvetica Neue',Arial,sans-serif";

// ── Piezas ──────────────────────────────────────────────────────────────────

/** Barra de sección: fondo verde profundo, etiqueta en dorado. */
export const barra = (texto: string, margenSuperior = 32) => `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${C.oscuro};margin:${margenSuperior}px 0 0 0;">
    <tr><td style="padding:13px 22px;">
      <p style="margin:0;font-family:${SANS};font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${C.dorado};">${texto}</p>
    </td></tr>
  </table>`;

/** Regla dorada corta, para respirar entre bloques. */
export const regla = (margen = "22px 0") => `
  <table role="presentation" width="48" cellspacing="0" cellpadding="0" border="0" style="margin:${margen};">
    <tr><td style="height:1px;background-color:${C.dorado};"></td></tr>
  </table>`;

/** Bloque con filete dorado a la izquierda: para notas y advertencias. */
export const nota = (texto: string, color: string = C.texto, margen = "20px 0 0 0") => `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-left:2px solid ${C.dorado};margin:${margen};">
    <tr><td style="padding:2px 0 2px 18px;">
      <p style="margin:0;font-family:${SANS};font-size:13px;font-weight:300;color:${color};line-height:1.75;">${texto}</p>
    </td></tr>
  </table>`;

/** Párrafo de cuerpo. */
export const parrafo = (texto: string, margen = "0 0 18px 0") => `
  <p style="margin:${margen};font-family:${SANS};font-size:14px;font-weight:300;color:${C.texto};line-height:1.85;">${texto}</p>`;

/** Titular dentro del cuerpo (no el de la cabecera). */
export const titulo = (texto: string, margen = "0 0 12px 0") => `
  <p style="margin:${margen};font-family:${SERIF};font-size:26px;font-weight:400;color:${C.oscuro};line-height:1.25;">${texto}</p>`;

/** Botón principal. `tono` cambia el color sin tener que recordar el hex. */
export const boton = (href: string, texto: string, tono: "verde" | "dorado" | "whatsapp" = "verde") => {
  const fondo = tono === "dorado" ? C.dorado : tono === "whatsapp" ? C.whatsapp : C.verde;
  const letra = tono === "dorado" ? "#0e1710" : "#ffffff";
  return `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0 0 0;">
    <tr><td align="center">
      <a href="${href}" style="display:inline-block;background-color:${fondo};color:${letra};text-decoration:none;padding:15px 34px;font-family:${SANS};font-size:12px;font-weight:500;letter-spacing:2px;text-transform:uppercase;">${texto}</a>
    </td></tr>
  </table>`;
};

/** Línea pequeña centrada bajo un botón. */
export const bajoBoton = (texto: string) => `
  <p style="margin:10px 0 0 0;font-family:${SANS};font-size:12px;font-weight:300;color:${C.tenue};text-align:center;line-height:1.6;">${texto}</p>`;

/** Renglón etiqueta / valor. */
export const filaDato = (k: string, v: string, primero = false) => `
  <tr>
    <td style="width:45%;border:1px solid ${C.borde};${primero ? "" : "border-top:none;"}background-color:${C.tarjeta};padding:14px 22px;vertical-align:top;">
      <p style="margin:0;font-family:${SANS};font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:${C.tenue};">${k}</p>
    </td>
    <td style="width:55%;border:1px solid ${C.borde};border-left:none;${primero ? "" : "border-top:none;"}background-color:${C.tarjeta};padding:14px 22px;vertical-align:top;text-align:right;">
      <p style="margin:0;font-family:${SERIF};font-size:17px;color:${C.oscuro};">${v}</p>
    </td>
  </tr>`;

/** Renglón de dinero. */
export const filaMoney = (
  k: string, v: string,
  acento?: "verde" | "terracota",
  grande = false,
  primero = false,
) => {
  const color = acento === "verde" ? C.verde : acento === "terracota" ? C.terracota : C.oscuro;
  const pad = grande ? "18px" : "13px";
  return `
  <tr>
    <td style="border:1px solid ${C.borde};${primero ? "" : "border-top:none;"}background-color:${C.tarjeta};padding:${pad} 22px;">
      <p style="margin:0;font-family:${SANS};font-size:${grande ? "13" : "12"}px;color:${C.texto};">${k}</p>
    </td>
    <td style="border:1px solid ${C.borde};border-left:none;${primero ? "" : "border-top:none;"}background-color:${C.tarjeta};padding:${pad} 22px;text-align:right;white-space:nowrap;">
      <p style="margin:0;font-family:${SERIF};font-size:${grande ? "26" : "19"}px;font-weight:${grande ? "500" : "400"};color:${color};">${v}</p>
    </td>
  </tr>`;
};

/** Envuelve filas en la tabla con borde de tarjeta. */
export const tabla = (filas: string) => `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">${filas}</table>`;

/** Foto de un recorrido, en su versión ligera para correo. */
export const fotoTour = (slug: string, alt: string, alto = 190) => `
  <img src="${BASE}/imagenes/correo/${slug}.jpg" width="600" alt="${alt}"
    style="display:block;width:100%;max-width:620px;height:${alto}px;object-fit:cover;border:0;outline:none;text-decoration:none;">`;

/** Lista de garantías con palomita verde. */
export const garantias = (items: string[]) => `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:26px 0 0 0;">
    <tr><td style="border-top:1px solid ${C.borde};padding:18px 0 0 0;">
      ${items.map((x) => `
      <p style="margin:0 0 8px 0;font-family:${SANS};font-size:12.5px;font-weight:300;color:${C.tenue};line-height:1.6;">
        <span style="color:${C.verde};">✓</span>&nbsp; ${x.replace(/^✓\s*/, "")}
      </p>`).join("")}
    </td></tr>
  </table>`;

// ── El lienzo ───────────────────────────────────────────────────────────────

export interface ShellInput {
  locale:      Locale;
  /** Línea gris sobre el lienzo. También es el texto de vista previa. */
  preheader:   string;
  /** Etiqueta pequeña de la cabecera. */
  eyebrow:     string;
  /** Titular, en dos renglones. */
  h1a:         string;
  h1b?:        string;
  /** Bajada de la cabecera. */
  entradilla?: string;
  /** El cuerpo, armado con las piezas de arriba. */
  cuerpo:      string;
  /** Texto del pie, sobre la firma. Admite HTML. */
  pie?:        string;
  /** Línea final, más pequeña: de dónde salió este correo. */
  origen?:     string;
  /**
   * Correo del destinatario. Si viene, el pie lleva baja de un clic.
   *
   * Solo en los correos de MARKETING. Una confirmación de reserva no lleva
   * baja: no es publicidad, y ofrecer darse de baja de su propia compra
   * confunde. Por eso es opcional y no se saca de ningún sitio automático.
   */
  paraBaja?:   string;
}

export function shellCorreo(d: ShellInput): string {
  return `<!DOCTYPE html>
<html lang="${d.locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${d.eyebrow}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');
  * { margin:0; padding:0; }
  body { font-family:${SANS}; background-color:${C.fondo}; line-height:1.6; }
  table { border-collapse:collapse; }
  img { display:block; max-width:100%; height:auto; }
  a { color:${C.oscuro}; text-decoration:none; }
  .wrapper { background-color:${C.fondo}; padding:20px 0; }
  .container { max-width:620px; margin:0 auto; background-color:${C.lienzo}; }
  @media only screen and (max-width:640px) {
    .wrapper { padding:0!important; }
    .container,.full-width { width:100%!important; max-width:100%!important; }
    .mobile-plg { padding:30px 22px!important; }
    .hero-title { font-size:32px!important; }
  }
</style>
</head>
<body>
<div class="wrapper">

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr><td style="padding:14px 0;text-align:center;">
      <p style="margin:0;font-family:${SANS};font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#6a7a5a;">${d.preheader}</p>
    </td></tr>
  </table>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr><td align="center" style="padding:0;">
      <table class="container full-width" role="presentation" width="620" cellspacing="0" cellpadding="0" border="0">

        <tr><td class="mobile-plg" style="padding:36px 40px 40px 40px;background-color:${C.oscuro};">
          <p style="margin:0 0 10px 0;font-family:${SANS};font-size:11px;letter-spacing:3.5px;text-transform:uppercase;color:rgba(255,255,255,0.65);">${d.eyebrow}</p>
          <h1 class="hero-title" style="margin:0;font-family:${SERIF};font-size:44px;font-style:italic;font-weight:300;color:${C.lienzo};line-height:1.1;">
            ${d.h1a}${d.h1b ? `<br>${d.h1b}` : ""}
          </h1>
          ${d.entradilla ? `<p style="margin:14px 0 0 0;font-family:${SANS};font-size:14px;font-weight:300;color:rgba(244,237,216,0.75);line-height:1.7;">${d.entradilla}</p>` : ""}
        </td></tr>

        <tr><td class="mobile-plg" style="background-color:${C.lienzo};padding:40px 44px 44px 44px;">
          ${d.cuerpo}
          ${d.pie ? `
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:30px 0 0 0;">
            <tr><td style="border-top:1px solid ${C.borde};padding:20px 0 0 0;">
              <p style="margin:0;font-family:${SANS};font-size:13px;font-weight:300;color:${C.texto};line-height:1.75;">${d.pie}</p>
            </td></tr>
          </table>` : ""}
        </td></tr>

        <tr><td style="background-color:${C.oscuro};padding:22px 40px;text-align:center;">
          <p style="margin:0;font-family:${SANS};font-size:11px;letter-spacing:2.5px;text-transform:uppercase;color:rgba(244,237,216,0.5);">Tours Huasteca Potosina · Xilitla, S.L.P.</p>
          ${d.origen ? `<p style="margin:8px 0 0 0;font-family:${SANS};font-size:11px;font-weight:300;color:rgba(244,237,216,0.32);line-height:1.6;">${d.origen}</p>` : ""}
          ${d.paraBaja ? `<p style="margin:10px 0 0 0;font-family:${SANS};font-size:11px;font-weight:300;color:rgba(244,237,216,0.32);line-height:1.6;"><a href="${linkBaja(d.paraBaja, BASE)}" style="color:rgba(244,237,216,0.55);text-decoration:underline;">Darme de baja</a></p>` : ""}
        </td></tr>

      </table>
    </td></tr>
  </table>
</div>
</body>
</html>`;
}
