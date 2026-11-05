/**
 * El código de referencia del WhatsApp (4 nov 2026): une el CLIC del sitio con
 * el LEAD de la Bandeja y, de ahí, con la reserva.
 *
 * Sin esto, cuando alguien escribía desde un botón del sitio el lead solo sabía
 * «vino del sitio» (por el texto prellenado), pero no de qué página ni de qué
 * canal llegó la visita (Google, Maps, Instagram, IA…). GA4 contaba el clic y
 * el panel el lead, y nadie podía decir qué página o canal trae reservas.
 *
 * Cómo funciona:
 *  1. Al entrar al sitio se guarda de dónde llegó la visita (UTM o el sitio de
 *     origen) en sessionStorage, una vez por sesión.
 *  2. Al tocar cualquier botón de WhatsApp se agrega al mensaje prellenado un
 *     código corto: «… (ref. K7Q2M)», y el clic se guarda con ese código, la
 *     página y el origen de la visita (`WHATSAPP_CLICK`).
 *  3. Cuando el mensaje llega a la Bandeja, el código encuentra su clic y el
 *     lead nace con su página y su canal (`Oportunidad.origenWeb`).
 *
 * Las partes puras (sin `window`) también las usa el servidor.
 */

/** Sin 0/O/1/I: se dicta y se lee sin confusiones. */
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const RE_REF = /\bref\.?\s*([A-HJ-NP-Z2-9]{5})\b/i;
/** Un código ya puesto (en cualquier parte del mensaje): se quita antes de poner el nuevo. */
const RE_REF_PUESTA = /\s*\(ref\.\s*[A-Z0-9]{5}\)/gi;
/** La última frase termina en «:» («Me hospedo en: »): el cliente escribe ahí; el código va antes. */
const RE_FRASE_ABIERTA = /^([\s\S]*[.?!)\]]\s+)([^.?!]*:\s*)$/;

/** Un código nuevo de 5 caracteres. */
export function nuevaRef(azar: () => number = Math.random): string {
  let s = "";
  for (let i = 0; i < 5; i++) s += ALFABETO[Math.floor(azar() * ALFABETO.length) % ALFABETO.length];
  return s;
}

/** El código que viene en un mensaje («ref. K7Q2M» o «ref K7Q2M»), en mayúsculas. */
export function refDelTexto(texto: string | null | undefined): string | null {
  const m = String(texto ?? "").match(RE_REF);
  return m ? m[1].toUpperCase() : null;
}

/**
 * La liga de WhatsApp con el código al final del mensaje prellenado. Solo si la
 * liga ya trae texto: no se le inventa un mensaje a quien abre el chat vacío.
 * Si ya traía un código (dos clics al mismo botón), se reemplaza.
 */
export function agregarRef(url: string, ref: string): string {
  const m = url.match(/([?&]text=)([^&#]*)/);
  if (!m) return url;
  let texto: string;
  try { texto = decodeURIComponent(m[2].replace(/\+/g, " ")); } catch { texto = m[2]; }
  const base = texto.replace(RE_REF_PUESTA, "");
  const abierta = base.match(RE_FRASE_ABIERTA);
  const nuevo = abierta ? `${abierta[1]}(ref. ${ref}) ${abierta[2]}` : `${base.trimEnd()} (ref. ${ref})`;
  return url.replace(m[0], `${m[1]}${encodeURIComponent(nuevo)}`);
}

/** De dónde llegó la visita: lo primero que se vio en la sesión. */
export interface OrigenVisita {
  /** La primera página de la sesión. */
  landing: string;
  fuente: string | null;
  medio: string | null;
  campana: string | null;
  /** Solo el dominio del sitio de donde vino (nunca la URL completa). */
  referrer: string | null;
}

/** El canal de la visita, con las mismas claves que GA4 en el panel (`ETIQUETA_CANAL`). */
export type CanalVisita = "seo" | "maps" | "directo" | "ia" | "redes" | "referidos" | "publicidad" | "correo" | "otro";

export function canalDeVisita(o: Pick<OrigenVisita, "fuente" | "medio" | "campana" | "referrer"> | null | undefined): CanalVisita {
  if (!o) return "otro";
  const f = (o.fuente ?? "").toLowerCase(), m = (o.medio ?? "").toLowerCase(), c = (o.campana ?? "").toLowerCase(), r = (o.referrer ?? "").toLowerCase();
  if (c.includes("perfil-maps") || f === "maps" || r.includes("maps.google")) return "maps";
  if (/chatgpt|openai|perplexity|gemini|claude\.ai|copilot|deepseek/.test(`${f} ${r}`)) return "ia";
  if (/^(cpc|ppc|paid|paidsearch|paid_social|display)$/.test(m) || f === "gclid") return "publicidad";
  if (m === "email" || /brevo|correo|newsletter/.test(f)) return "correo";
  if (m === "social" || /instagram|facebook|^fb$|^ig$|tiktok|t\.co|twitter|x\.com|youtube|pinterest|lm\.facebook|l\.instagram/.test(`${f} ${r}`)) return "redes";
  if (m === "organic" || /(^|\.)google\.|bing\.|yahoo\.|duckduckgo|ecosia|yandex/.test(`${f} ${r}`)) return "seo";
  if (r) return "referidos";
  if (!f && !m) return "directo";
  return "otro";
}

// ── Solo navegador ──────────────────────────────────────────────────────────

const CLAVE = "hp_origen";
let ultima: { ref: string; en: number } | null = null;

/** Al entrar: guarda de dónde llegó la visita (una vez por sesión). */
export function guardarOrigenVisita(): void {
  if (typeof window === "undefined" || typeof sessionStorage === "undefined") return;
  try {
    if (sessionStorage.getItem(CLAVE)) return;
    const u = new URL(window.location.href);
    const q = (k: string) => (u.searchParams.get(k) || "").slice(0, 80) || null;
    let referrer: string | null = null;
    try {
      const h = document.referrer ? new URL(document.referrer).hostname : "";
      referrer = h && h !== window.location.hostname ? h : null;
    } catch { /* sin referrer */ }
    const origen: OrigenVisita = {
      landing: u.pathname.slice(0, 120),
      fuente: q("utm_source") ?? (u.searchParams.get("gclid") ? "gclid" : null),
      medio: q("utm_medium"),
      campana: q("utm_campaign"),
      referrer,
    };
    sessionStorage.setItem(CLAVE, JSON.stringify(origen));
  } catch { /* la medición nunca rompe el sitio */ }
}

export function origenVisita(): OrigenVisita | null {
  if (typeof sessionStorage === "undefined") return null;
  try { return JSON.parse(sessionStorage.getItem(CLAVE) || "null"); } catch { return null; }
}

/** Marca el código del clic en curso (lo recoge el evento WHATSAPP_CLICK de ese mismo clic). */
export function marcarRef(ref: string): void { ultima = { ref, en: Date.now() }; }

/** El código del clic de hace un momento (3 s), si lo hay. */
export function refReciente(): string | null {
  return ultima && Date.now() - ultima.en < 3000 ? ultima.ref : null;
}

/** Para los botones que abren WhatsApp con `window.open`: la liga con su código, ya marcado. */
export function conReferencia(url: string): string {
  const ref = nuevaRef();
  const nueva = agregarRef(url, ref);
  if (nueva !== url) marcarRef(ref);
  return nueva;
}
