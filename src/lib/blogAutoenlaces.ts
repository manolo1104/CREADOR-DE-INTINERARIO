/**
 * Enlaces internos automáticos dentro del cuerpo de los artículos del blog.
 *
 * 🔴 Por qué (19 nov 2026). Search Console, 18 ago–15 nov: el 87 % de las
 * impresiones del sitio está entre el puesto 5 y el 10, y las búsquedas son el
 * NOMBRE del lugar («cascada el meco», «la trinidad xilitla», «tamtoc»,
 * «xilitla»). La Fase 3 (10 nov) eligió UNA página dueña por lugar, pero los
 * 55 artículos casi no las enlazan: /paquetes recibe 54 enlaces y el inicio 43,
 * mientras que la ficha de Xilitla (dueña de «xilitla», 22,000 impresiones)
 * recibe 3, la de Minas Viejas 1 y las de Huichihuayán, Tamtoc y La Trinidad 0.
 * Un enlace con el nombre del lugar como ancla, desde un artículo que habla de
 * ese lugar, es la señal que le dice a Google cuál de nuestras páginas es la
 * que responde esa búsqueda.
 *
 * REGLAS
 *   · Solo la PRIMERA mención, solo dentro de un `<p>` (ni títulos, ni listas,
 *     ni tablas, ni pies de foto) y fuera de otro enlace.
 *   · Nunca si el artículo ya enlaza a esa página (en cualquier parte) ni si
 *     la página es el propio artículo.
 *   · Como mucho `MAX_NUEVOS` enlaces nuevos por artículo, en el orden de la
 *     lista (de más a menos búsquedas): más que eso estorba al lector.
 *   · El orden importa: las frases largas («qué hacer en Xilitla», «cascadas de
 *     la Huasteca Potosina») van ANTES que sus palabras sueltas («Xilitla»,
 *     «Huasteca Potosina»), porque cada regla ve los enlaces de las anteriores.
 *   · Dueños: los de la Fase 3 (`blogSeo.ts`) y, donde no hubo decisión, la
 *     página que mejor rankea hoy para el nombre del lugar.
 */
import { urlBlog } from "@/lib/blogDestinoMap";

const SITE = "https://www.huasteca-potosina.com";

/** Enlaces nuevos por artículo, como máximo (los que ya traía no cuentan). */
export const MAX_NUEVOS = 10;

const blog = (slug: string) => urlBlog(slug);
const destino = (slug: string) => `/destinos/${slug}`;

/** `siempre`: las dos reglas que ya existían antes del 19 nov; no cuentan para `MAX_NUEVOS`. */
export const AUTOENLACES: { patron: RegExp; href: string; siempre?: true }[] = [
  // ── Frases (antes que sus palabras sueltas) ──
  { patron: /\bqu[eé] hacer en Xilitla\b/i, href: blog("hacer-guia-definitiva-para-visitar-xilitla-todo-lo-que-necesitas-saber") },
  { patron: /\bclima (?:en|de) Xilitla\b/i, href: blog("mejor-temporada-para-ir-el-clima-en-xilitla-cual-es-la-mejor-epoca-par") },
  { patron: /\bcascadas (?:de|en) la Huasteca(?: Potosina)?\b/i, href: "/cascadas-de-la-huasteca-potosina" },
  { patron: /\bqu[eé] (?:hacer|ver|visitar) en la Huasteca(?: Potosina)?\b/i, href: "/que-hacer-en-la-huasteca-potosina" },
  { patron: /\bd[oó]nde (?:hospedarse|hospedarte|dormir|quedarse|quedarte)\b/i, href: "/donde-hospedarse-en-la-huasteca-potosina" },
  // El inicio pelea «huasteca potosina» (68,000 impresiones): ya lo enlazaban
  // 43 artículos y sigue sin contar para el tope. Va DESPUÉS de las frases que
  // contienen «Huasteca Potosina» para no partirlas.
  // «Tours Huasteca Potosina» es la marca, no la región: esa no se enlaza.
  { patron: /(?<!Tours )\bHuasteca Potosina\b/i, href: "/", siempre: true },

  // ── Lugares, de más a menos búsquedas ──
  { patron: /\bCascada de Tamul\b/i, href: blog("cascada-de-tamul-la-guia-definitiva-para-visitarla") },
  { patron: /\bPuente de Dios\b/, href: blog("puente-de-dios-tamasopo-el-portal-de-luz-de-la-huasteca") },
  { patron: /\bXantolo\b/, href: blog("xantolo-en-la-huasteca-potosina-la-fiesta-de-muertos-guia") },
  { patron: /\bS[oó]tano de las Golondrinas\b/i, href: destino("sotano-de-las-golondrinas") },
  { patron: /\bCascadas? de Micos\b/i, href: blog("cascadas-de-micos-guia-completa-para-tu-visita") },
  { patron: /\b(?:Cascadas? (?:del?|El) )?Meco\b/, href: "/tours/cascadas-del-meco" },
  { patron: /\bMinas Viejas\b/, href: destino("cascadas-minas-viejas") },
  // «Siete/7 Cascadas de Tamasopo» es OTRO lugar (tiene su propio artículo).
  { patron: /(?<!(?:Siete|siete|7) )\bCascadas de Tamasopo\b/, href: destino("cascadas-de-tamasopo") },
  { patron: /\bLas Pozas\b/, href: blog("las-pozas-xilitla-las-pozas-de-edward-james-todo-lo-que-nece") },
  { patron: /\bHuichihuay[aá]n\b/i, href: destino("nacimiento-huichihuayan") },
  { patron: /\bLa Trinidad\b/, href: destino("la-trinidad-xilitla") },
  { patron: /\bS[oó]tano de las Huahuas\b/i, href: destino("sotano-de-las-huahuas") },
  { patron: /\bTambaque\b/, href: destino("nacimiento-tambaque") },
  { patron: /\bCastillo de la Salud\b/, href: destino("castillo-de-la-salud") },
  { patron: /\bCascada El Salto\b/i, href: destino("cascada-el-salto") },
  { patron: /\bTaninul\b/, href: destino("balneario-taninul") },
  { patron: /\bzacahuil\b/i, href: blog("comida-tipica-la-historia-detras-del-zacahuil-el-platillo-gi") },
  { patron: /\bHacienda (?:Los )?G[oó]mez\b/, href: destino("hacienda-los-gomez-tamasopo") },
  { patron: /\bSan Vicente Tancuayalab\b/, href: destino("san-vicente-tancuayalab") },
  { patron: /\bEl Trampol[ií]n\b/, href: destino("cascada-el-trampolin-tamasopo") },
  { patron: /\bTamtoc\b/, href: destino("zona-arqueologica-tamtoc") },
  { patron: /\bLos Comales\b/, href: blog("cascada-los-comales-mas-alla-del-castillo-3-cascadas-secretas-cerca-de") },
  { patron: /\bR[ií]o Tampa[oó]n\b/i, href: blog("rafting-rio-tampaon-rafting-en-el-rio-tampaon-la-experiencia-definitiv") },
  { patron: /\bMedia Luna\b/, href: destino("laguna-media-luna") },
  { patron: /\bAquism[oó]n\b/, href: destino("aquismon-pueblo-magico") },
  { patron: /\bTancanhuitz\b/, href: destino("tancanhuitz") },
  { patron: /\bMuseo Leonora Carrington\b/i, href: blog("museo-leonora-carrington-leonora-carrington-en-xilitla-guia-para-visit") },

  // ── Palabras sueltas, al final ──
  { patron: /\bXilitla\b/, href: destino("xilitla-pueblo-magico") },
  { patron: /\btours? guiados?\b/i, href: "/tours", siempre: true },
];

const escapaRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** ¿El HTML ya enlaza a `href` (relativo o con el dominio, con o sin ?query/#ancla)? */
export function yaEnlazaA(html: string, href: string): boolean {
  // El inicio aparte: con la barra opcional, `href="#seccion"` (las anclas del
  // propio artículo) contaba como enlace al inicio y la regla nunca se aplicaba.
  const destinoRe =
    href === "/"
      ? `(?:${escapaRegex(SITE)}/?|/)`
      : `(?:${escapaRegex(SITE)})?${escapaRegex(href)}/?`;
  return new RegExp(`href="${destinoRe}(?:[?#][^"]*)?"`, "i").test(html);
}

/** Enlaza la primera mención de `patron` dentro de un `<p>` y fuera de otro `<a>`. Devuelve null si no hay. */
export function enlazaPrimeraMencion(html: string, patron: RegExp, href: string): string | null {
  const trozos = html.split(/(<[^>]+>)/);
  let enParrafo = 0;
  let enEnlace = 0;
  for (let i = 0; i < trozos.length; i++) {
    const t = trozos[i];
    if (t.startsWith("<")) {
      if (/^<p[\s>]/i.test(t)) enParrafo++;
      else if (/^<\/p>/i.test(t)) enParrafo = Math.max(0, enParrafo - 1);
      else if (/^<a[\s>]/i.test(t)) enEnlace++;
      else if (/^<\/a>/i.test(t)) enEnlace = Math.max(0, enEnlace - 1);
      continue;
    }
    if (!enParrafo || enEnlace) continue;
    const m = patron.exec(t);
    if (!m) continue;
    trozos[i] = `${t.slice(0, m.index)}<a href="${href}">${m[0]}</a>${t.slice(m.index + m[0].length)}`;
    return trozos.join("");
  }
  return null;
}

/** Aplica `AUTOENLACES` al cuerpo de un artículo. `slugPropio` es el de la base (con o sin año). */
export function autoenlaza(html: string, slugPropio: string): string {
  const propio = urlBlog(slugPropio);
  let nuevos = 0;
  let h = html;
  for (const { patron, href, siempre } of AUTOENLACES) {
    if (!siempre && nuevos >= MAX_NUEVOS) continue;
    if (href === propio || yaEnlazaA(h, href)) continue;
    const con = enlazaPrimeraMencion(h, patron, href);
    if (con !== null) {
      h = con;
      if (!siempre) nuevos++;
    }
  }
  return h;
}
