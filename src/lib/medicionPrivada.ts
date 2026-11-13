// Lo que GA4 y Clarity NO deben recibir (lote 8, 10 nov 2026). Puro.
//
// 🔴 GA4 guarda la dirección completa de cada página vista (con su «?…») y
// Clarity graba la pantalla con su dirección. Tres puertas les mandaban datos
// de clientes:
//  - la baja de correos: `/baja?t=…` lleva el correo del cliente (en base64);
//  - la liga del carrito recuperado: `?recuperar=…` abre el carrito con su
//    nombre, correo y teléfono;
//  - la pantalla de confirmación cuando Stripe regresa del banco:
//    `?payment_intent=…&payment_intent_client_secret=…` (la llave del pago).
// Ahora: en la baja no se mide nada; con alguno de esos parámetros, a GA4 se le
// manda la dirección SIN ellos y Clarity no graba esa visita.
//
// Las reglas viven dos veces: en TypeScript (servidor y pruebas) y como texto
// JavaScript para los scripts en línea de `components/Analytics.tsx`, que
// corren antes de React y no pueden importar módulos. Las pruebas comparan las
// dos para que no se separen.

import { MARCA_EQUIPO } from "@/lib/equipoInterno";

/** Parámetros de la dirección que identifican a un cliente o abren algo suyo. */
export const PARAMS_PRIVADOS = [
  "t", "token", "recuperar", "email", "correo", "telefono", "tel",
  "session_id", "payment_intent", "payment_intent_client_secret", "setup_intent", "setup_intent_client_secret",
] as const;

/** Páginas que no se miden nunca: su dirección ES la llave del cliente o la pantalla muestra sus datos. */
export const RE_RUTA_SIN_MEDIR = /^\/(checkin|opina)\/|^\/baja(\/|$)/;

/** La dirección sin los parámetros privados (igual si no traía ninguno). */
export function urlSinPrivados(u: string, base = "https://www.huasteca-potosina.com"): string {
  try {
    const x = new URL(u, base);
    let quitado = false;
    for (const p of PARAMS_PRIVADOS) if (x.searchParams.has(p)) { x.searchParams.delete(p); quitado = true; }
    return quitado ? x.toString() : u;
  } catch {
    return u;
  }
}

export function tieneParamsPrivados(u: string, base = "https://www.huasteca-potosina.com"): boolean {
  return urlSinPrivados(u, base) !== u;
}

/** Lo mismo, en JavaScript para el navegador (ES5): `hpLimpia(url)` y `hpPrivada(url)`. */
export const JS_URL_PRIVADA = `
  var HP_PRIV = ${JSON.stringify(PARAMS_PRIVADOS)};
  function hpLimpia(u) {
    try {
      var x = new URL(u, location.href), q = false;
      for (var i = 0; i < HP_PRIV.length; i++) if (x.searchParams.has(HP_PRIV[i])) { x.searchParams['delete'](HP_PRIV[i]); q = true; }
      return q ? x.toString() : u;
    } catch (e) { return u; }
  }
  function hpPrivada(u) { return hpLimpia(u) !== u; }
`;

/**
 * ¿Esta visita se mide? Va al principio de los scripts de GA4 y Clarity; un
 * `return` corta el script. Una sola marca del equipo (`hp_interno`) en
 * localStorage Y en cookie: la cookie la lee el servidor (lote 8).
 *
 *  - localhost / 127.0.0.1 / *.local → nunca.
 *  - /checkin, /opina y /baja → nunca (la dirección es la llave del cliente).
 *  - /admin → nunca, y marca el navegador como del equipo.
 *  - con la marca (en cualquiera de los dos lados) → nunca, y la copia al otro.
 */
export const JS_GUARDA = `
  var h = location.hostname;
  if (h === 'localhost' || h === '127.0.0.1' || /\\.local$/.test(h)) return;
  if (${RE_RUTA_SIN_MEDIR.toString()}.test(location.pathname)) return;
  function hpMarcar() {
    try { localStorage.setItem('${MARCA_EQUIPO}', '1'); } catch (e) {}
    try { document.cookie = '${MARCA_EQUIPO}=1; path=/; max-age=63072000; samesite=lax'; } catch (e) {}
  }
  if (location.pathname.indexOf('/admin') === 0) { hpMarcar(); return; }
  var hpInterno = false;
  try { hpInterno = localStorage.getItem('${MARCA_EQUIPO}') === '1'; } catch (e) {}
  try { if (/(?:^|;\\s*)${MARCA_EQUIPO}=1(?:;|$)/.test(document.cookie)) hpInterno = true; } catch (e) {}
  if (hpInterno) { hpMarcar(); return; }
`;

// ── Lo que se GUARDA de la visita (TrackEvent, origen web del lead) ─────────
// 🔴 /api/track quitaba el token de /checkin/<token> y /opina/<token> de la
// ruta, pero no de `data`: el clic a WhatsApp lleva la primera página de la
// visita (`landing`), y quien entró por su liga de check-in dejaba su llave en
// TrackEvent y, de ahí, en el origen web de su lead (lote 8, 10 nov 2026).

const RE_TOKEN_EN_RUTA = /\/(checkin|opina)\/[^/?#\s"']+/g;
const RE_PARAM_PRIVADO = new RegExp(`([?&])(?:${PARAMS_PRIVADOS.join("|")})=[^&#\\s"']*`, "g");

/** Un texto (ruta, dirección) sin el token de /checkin u /opina ni parámetros privados. */
export function textoSinPrivados(s: string): string {
  return s
    .replace(RE_TOKEN_EN_RUTA, "/$1")
    .replace(RE_PARAM_PRIVADO, "$1")
    // Lo que queda de los quitados: «?&», «&&» y un «?» o «&» al final.
    .replace(/([?&])&+/g, "$1")
    .replace(/[?&](?=$|[#\s"'])/g, "");
}

/** Lo mismo para todos los textos de un objeto de datos (hasta 5 niveles). */
export function datosSinPrivados<T>(v: T, nivel = 0): T {
  if (typeof v === "string") return textoSinPrivados(v) as T;
  if (nivel > 5 || v === null || typeof v !== "object") return v;
  if (Array.isArray(v)) return v.map(x => datosSinPrivados(x, nivel + 1)) as T;
  return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, datosSinPrivados(x, nivel + 1)])) as T;
}
