/**
 * La piel de los correos del CURSO: negra, azul eléctrico y blanco.
 *
 * Misma API que `emailLayout.ts` (parrafo, boton, titulo, regla, nota, tabla,
 * barra, bajoBoton, shellCorreo) para que `cursoEmail.ts` sólo cambie el
 * import. Los correos de tours siguen con su piel crema: son otra marca y
 * otro público.
 *
 * Tres cosas que un correo oscuro obliga a hacer distinto:
 *
 * 1. `bgcolor` EN EL ATRIBUTO además de la hoja de estilo. Outlook de
 *    escritorio ignora `background-color` en algunos elementos: si sólo va en
 *    el estilo, el fondo sale blanco, y como el texto es blanco el correo
 *    queda EN BLANCO. Con texto oscuro un fallo de fondo se perdona; con
 *    texto claro, no.
 * 2. `color-scheme: dark` y `supported-color-schemes`. Sin eso, Gmail en
 *    móvil invierte los colores por su cuenta y deja la paleta al revés.
 * 3. Las fuentes de la landing (Sora y JetBrains Mono) sólo cargan en algunos
 *    clientes. Cada una lleva su pila de respaldo real: la monoespaciada
 *    siempre se ve monoespaciada, aunque no sea la nuestra.
 */

import { linkBaja } from "./baja";

export const BASE = "https://www.huasteca-potosina.com";
export const WA = "524891251458";

/** La paleta del funnel, tal cual la define `tailwind.config.ts`. */
export const C = {
  fondo: "#04060A", // detrás del lienzo, un punto más oscuro
  lienzo: "#07090C", // tinta
  tarjeta: "#0D1117", // tinta-2
  elevado: "#141B24", // tinta-3
  borde: "#1F2A37", // linea
  borde2: "#2C3A4B", // linea-2
  oscuro: "#0D1117", // cabecera y pie
  texto: "#D6DEE9",
  claro: "#F2F6FC", // hielo
  tenue: "#8A99AD",
  azul: "#3B8CFF",
  azulVivo: "#63A6FF",
  humo: "#12233F",
  whatsapp: "#25D366",
} as const;

const SANS = "'Sora','Helvetica Neue',Helvetica,Arial,sans-serif";
const MONO = "'JetBrains Mono',ui-monospace,'SF Mono',Menlo,Consolas,monospace";

// ── Piezas ──────────────────────────────────────────────────────────────────

/** Barra de sección: etiqueta monoespaciada sobre azul apagado. */
export const barra = (texto: string, margenSuperior = 32) => `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${C.humo}" style="background-color:${C.humo};margin:${margenSuperior}px 0 0 0;">
    <tr><td bgcolor="${C.humo}" style="padding:13px 22px;background-color:${C.humo};">
      <p style="margin:0;font-family:${MONO};font-size:11px;letter-spacing:2.4px;text-transform:uppercase;color:${C.azulVivo};">${texto}</p>
    </td></tr>
  </table>`;

/** Regla azul corta, para respirar entre bloques. */
export const regla = (margen = "22px 0") => `
  <table role="presentation" width="48" cellspacing="0" cellpadding="0" border="0" style="margin:${margen};">
    <tr><td bgcolor="${C.azul}" style="height:2px;background-color:${C.azul};font-size:0;line-height:0;">&nbsp;</td></tr>
  </table>`;

/** Bloque con filete azul a la izquierda: para notas y advertencias. */
export const nota = (texto: string, color: string = C.texto, margen = "20px 0 0 0") => `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-left:2px solid ${C.azul};margin:${margen};">
    <tr><td style="padding:2px 0 2px 18px;">
      <p style="margin:0;font-family:${SANS};font-size:13px;font-weight:400;color:${color};line-height:1.75;">${texto}</p>
    </td></tr>
  </table>`;

/** Párrafo de cuerpo. */
export const parrafo = (texto: string, margen = "0 0 18px 0") => `
  <p style="margin:${margen};font-family:${SANS};font-size:15px;font-weight:400;color:${C.texto};line-height:1.8;">${texto}</p>`;

/** Titular dentro del cuerpo (no el de la cabecera). */
export const titulo = (texto: string, margen = "0 0 12px 0") => `
  <p style="margin:${margen};font-family:${SANS};font-size:24px;font-weight:600;color:${C.claro};line-height:1.2;letter-spacing:-0.3px;">${texto}</p>`;

/**
 * Botón principal.
 *
 * OJO con el azul: blanco encima da 3.8:1 y reprueba. Por eso el botón azul
 * lleva letra casi negra (6.9:1), igual que en la landing.
 */
export const boton = (href: string, texto: string, tono: "verde" | "dorado" | "whatsapp" = "verde") => {
  const fondo = tono === "whatsapp" ? C.whatsapp : tono === "dorado" ? C.azulVivo : C.azul;
  const letra = "#07090C";
  return `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0 0 0;">
    <tr><td align="center">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
        <tr><td bgcolor="${fondo}" style="background-color:${fondo};">
          <a href="${href}" style="display:inline-block;background-color:${fondo};color:${letra};text-decoration:none;padding:16px 34px;font-family:${SANS};font-size:12px;font-weight:600;letter-spacing:1.8px;text-transform:uppercase;">${texto}</a>
        </td></tr>
      </table>
    </td></tr>
  </table>`;
};

/** Línea pequeña centrada bajo un botón. */
export const bajoBoton = (texto: string) => `
  <p style="margin:10px 0 0 0;font-family:${SANS};font-size:12px;font-weight:400;color:${C.tenue};text-align:center;line-height:1.6;">${texto}</p>`;

/** Renglón etiqueta / valor. El valor va monoespaciado: es un dato. */
export const filaDato = (k: string, v: string, primero = false) => `
  <tr>
    <td bgcolor="${C.tarjeta}" style="width:45%;border:1px solid ${C.borde};${primero ? "" : "border-top:none;"}background-color:${C.tarjeta};padding:14px 22px;vertical-align:top;">
      <p style="margin:0;font-family:${MONO};font-size:10.5px;letter-spacing:1.4px;text-transform:uppercase;color:${C.tenue};">${k}</p>
    </td>
    <td bgcolor="${C.tarjeta}" style="width:55%;border:1px solid ${C.borde};border-left:none;${primero ? "" : "border-top:none;"}background-color:${C.tarjeta};padding:14px 22px;vertical-align:top;text-align:right;">
      <p style="margin:0;font-family:${SANS};font-size:16px;font-weight:500;color:${C.claro};">${v}</p>
    </td>
  </tr>`;

/** Renglón de dinero. La cifra va en monoespaciada tabular. */
export const filaMoney = (
  k: string,
  v: string,
  acento?: "verde" | "terracota",
  grande = false,
  primero = false,
) => {
  const color = acento === "verde" ? C.azulVivo : acento === "terracota" ? C.azulVivo : C.claro;
  const pad = grande ? "18px" : "13px";
  return `
  <tr>
    <td bgcolor="${C.tarjeta}" style="border:1px solid ${C.borde};${primero ? "" : "border-top:none;"}background-color:${C.tarjeta};padding:${pad} 22px;">
      <p style="margin:0;font-family:${SANS};font-size:${grande ? "13" : "12"}px;color:${C.texto};">${k}</p>
    </td>
    <td bgcolor="${C.tarjeta}" style="border:1px solid ${C.borde};border-left:none;${primero ? "" : "border-top:none;"}background-color:${C.tarjeta};padding:${pad} 22px;text-align:right;white-space:nowrap;">
      <p style="margin:0;font-family:${MONO};font-size:${grande ? "24" : "18"}px;font-weight:700;color:${color};">${v}</p>
    </td>
  </tr>`;
};

/** Envuelve filas en la tabla con borde de tarjeta. */
export const tabla = (filas: string) => `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">${filas}</table>`;

/** Lista con palomita azul. */
export const garantias = (items: string[]) => `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:26px 0 0 0;">
    <tr><td style="border-top:1px solid ${C.borde};padding:18px 0 0 0;">
      ${items
        .map(
          (x) => `
      <p style="margin:0 0 8px 0;font-family:${SANS};font-size:12.5px;font-weight:400;color:${C.tenue};line-height:1.6;">
        <span style="color:${C.azulVivo};">✓</span>&nbsp; ${x.replace(/^✓\s*/, "")}
      </p>`
        )
        .join("")}
    </td></tr>
  </table>`;

// ── El lienzo ───────────────────────────────────────────────────────────────

export interface ShellInput {
  locale: string;
  preheader: string;
  eyebrow: string;
  h1a: string;
  h1b?: string;
  entradilla?: string;
  cuerpo: string;
  pie?: string;
  origen?: string;
  /** Sólo en los correos de marketing. Un alumno no se da de baja de su curso. */
  paraBaja?: string;
}

export function shellCorreo(d: ShellInput): string {
  return `<!DOCTYPE html>
<html lang="${d.locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${d.eyebrow}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');
  :root { color-scheme: dark; supported-color-schemes: dark; }
  * { margin:0; padding:0; }
  body { font-family:${SANS}; background-color:${C.fondo}; line-height:1.6; }
  table { border-collapse:collapse; }
  img { display:block; max-width:100%; height:auto; }
  a { color:${C.azulVivo}; text-decoration:none; }
  .wrapper { background-color:${C.fondo}; padding:20px 0; }
  .container { max-width:620px; margin:0 auto; background-color:${C.lienzo}; }
  @media only screen and (max-width:640px) {
    .wrapper { padding:0!important; }
    .container,.full-width { width:100%!important; max-width:100%!important; }
    .mobile-plg { padding:30px 22px!important; }
    .hero-title { font-size:30px!important; }
  }
</style>
</head>
<body bgcolor="${C.fondo}" style="background-color:${C.fondo};">
<div class="wrapper" style="background-color:${C.fondo};">

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${C.fondo}">
    <tr><td style="padding:14px 0;text-align:center;">
      <p style="margin:0;font-family:${MONO};font-size:10.5px;letter-spacing:2.2px;text-transform:uppercase;color:${C.tenue};">${d.preheader}</p>
    </td></tr>
  </table>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${C.fondo}">
    <tr><td align="center" style="padding:0;">
      <table class="container full-width" role="presentation" width="620" cellspacing="0" cellpadding="0" border="0" bgcolor="${C.lienzo}">

        <tr><td class="mobile-plg" bgcolor="${C.oscuro}" style="padding:36px 40px 40px 40px;background-color:${C.oscuro};border-bottom:1px solid ${C.borde};">
          <p style="margin:0 0 12px 0;font-family:${MONO};font-size:10.5px;letter-spacing:2.4px;text-transform:uppercase;color:${C.azulVivo};">${d.eyebrow}</p>
          <h1 class="hero-title" style="margin:0;font-family:${SANS};font-size:38px;font-weight:600;color:${C.claro};line-height:1.1;letter-spacing:-0.8px;">
            ${d.h1a}${d.h1b ? `<br>${d.h1b}` : ""}
          </h1>
          ${d.entradilla ? `<p style="margin:16px 0 0 0;font-family:${SANS};font-size:14px;font-weight:400;color:${C.tenue};line-height:1.7;">${d.entradilla}</p>` : ""}
        </td></tr>

        <tr><td class="mobile-plg" bgcolor="${C.lienzo}" style="background-color:${C.lienzo};padding:40px 44px 44px 44px;">
          ${d.cuerpo}
          ${
            d.pie
              ? `
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:30px 0 0 0;">
            <tr><td style="border-top:1px solid ${C.borde};padding:20px 0 0 0;">
              <p style="margin:0;font-family:${SANS};font-size:13px;font-weight:400;color:${C.tenue};line-height:1.75;">${d.pie}</p>
            </td></tr>
          </table>`
              : ""
          }
        </td></tr>

        <tr><td bgcolor="${C.oscuro}" style="background-color:${C.oscuro};padding:22px 40px;text-align:center;border-top:1px solid ${C.borde};">
          <p style="margin:0;font-family:${MONO};font-size:10.5px;letter-spacing:2px;text-transform:uppercase;color:${C.tenue};">Turismo con IA · Huasteca Potosina Tours</p>
          ${d.origen ? `<p style="margin:8px 0 0 0;font-family:${SANS};font-size:11px;font-weight:400;color:#5C6B7E;line-height:1.6;">${d.origen}</p>` : ""}
          ${d.paraBaja ? `<p style="margin:10px 0 0 0;font-family:${SANS};font-size:11px;font-weight:400;color:#5C6B7E;line-height:1.6;"><a href="${linkBaja(d.paraBaja, BASE)}" style="color:${C.tenue};text-decoration:underline;">Darme de baja</a></p>` : ""}
        </td></tr>

      </table>
    </td></tr>
  </table>
</div>
</body>
</html>`;
}
