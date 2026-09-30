// Qué cookies aceptó el visitante, una por una.
//
// 🔴 Antes el aviso sólo guardaba "accepted" o "rejected" y NADIE lo leía:
// Google Analytics y Clarity cargaban igual con "Rechazar", mientras el Aviso
// de Privacidad prometía que desde ese banner se podían rechazar. Ahora
// `Analytics.tsx` consulta esto ANTES de cargar cada servicio.
//
// Modelo de aviso y exclusión (el de la ley mexicana): mientras el visitante
// no decida, se mide como siempre; lo que apague deja de cargarse.
//
// Lo lee también un script en línea de `Analytics.tsx`, que no puede importar
// este archivo: si cambian las claves, hay que cambiarlas allá también.

export const CLAVE_CONSENTIMIENTO = "hp_cookie_consent";
export const CLAVE_PREFERENCIAS   = "hp_cookie_prefs";

/** Evento que abre el panel desde fuera del aviso (el pie del sitio). */
export const EVENTO_ABRIR_COOKIES = "hp:cookies-abrir";

export interface PreferenciasCookies {
  /** Google Analytics 4. */
  analitica: boolean;
  /** Microsoft Clarity: mapas de clics y grabaciones. */
  grabacion: boolean;
}

export const TODAS: PreferenciasCookies = { analitica: true, grabacion: true };

/** null = todavía no ha decidido (el aviso debe salir). */
export function decisionTomada(): boolean {
  try {
    return localStorage.getItem(CLAVE_CONSENTIMIENTO) !== null;
  } catch {
    return true; // sin almacenamiento no hay forma de recordar: no insistir
  }
}

export function leerPreferencias(): PreferenciasCookies {
  try {
    // Quien pulsó "Rechazar" en el aviso anterior lo rechazó todo.
    if (localStorage.getItem(CLAVE_CONSENTIMIENTO) === "rejected") {
      return { analitica: false, grabacion: false };
    }
    const guardadas = JSON.parse(localStorage.getItem(CLAVE_PREFERENCIAS) || "{}");
    return {
      analitica: guardadas.analitica !== false,
      grabacion: guardadas.grabacion !== false,
    };
  } catch {
    return { ...TODAS };
  }
}

export function guardarPreferencias(p: PreferenciasCookies) {
  const todas = p.analitica && p.grabacion;
  try {
    localStorage.setItem(CLAVE_PREFERENCIAS, JSON.stringify(p));
    localStorage.setItem(CLAVE_CONSENTIMIENTO, todas ? "accepted" : "custom");
  } catch {
    /* modo privado sin almacenamiento: la decisión dura esta página */
  }
}

/** Borra las cookies propias cuyo nombre empiece con alguno de los prefijos. */
function borrarCookies(prefijos: string[]) {
  const host = location.hostname;
  const raiz = "." + host.split(".").slice(-2).join(".");
  for (const par of document.cookie.split("; ")) {
    const nombre = par.split("=")[0];
    if (!prefijos.some(p => nombre.startsWith(p))) continue;
    for (const dominio of ["", host, "." + host, raiz]) {
      document.cookie = `${nombre}=; Max-Age=0; path=/${dominio ? `; domain=${dominio}` : ""}`;
    }
  }
}

/**
 * `window` visto como lo dejan los scripts de `Analytics.tsx`: cada función
 * existe sólo si ese servicio llegó a cargarse en esta página. (Los tipos
 * globales del proyecto declaran `gtag` siempre presente, y aquí justo importa
 * saber si falta.)
 */
type Ventana = {
  gtag?: unknown;
  clarity?: (...args: unknown[]) => void;
  hpActivarGA?: () => void;
  hpActivarClarity?: () => void;
  [clave: string]: unknown;
};

/**
 * Pone en marcha lo que se acaba de encender y apaga lo que se acaba de apagar.
 *
 * Encender no necesita recargar: `Analytics.tsx` deja a mano las funciones que
 * cargan cada servicio. Apagar SÍ recarga cuando el servicio ya estaba
 * corriendo: Clarity no tiene orden oficial para detenerse (con el
 * consentimiento negado sigue grabando, sólo que sin cookies), así que la única
 * forma honesta de apagarlo es no volver a cargarlo.
 */
export function aplicarPreferencias(antes: PreferenciasCookies, ahora: PreferenciasCookies) {
  const w = window as unknown as Ventana;
  let recargar = false;

  if (antes.analitica && !ahora.analitica) {
    const id = process.env.NEXT_PUBLIC_GA4_ID;
    if (id) w[`ga-disable-${id}`] = true;
    borrarCookies(["_ga"]);
    if (w.gtag) recargar = true;
  }
  if (antes.grabacion && !ahora.grabacion) {
    try { w.clarity?.("consent", false); } catch { /* sin Clarity cargado */ }
    borrarCookies(["_clck", "_clsk"]);
    if (w.clarity) recargar = true;
  }
  if (recargar) {
    location.reload();
    return;
  }
  // Idempotentes: si ya corrían no recargan nada. A Clarity además le llega
  // aquí el "sí" del visitante, que une sus páginas en una sola sesión.
  if (ahora.analitica) w.hpActivarGA?.();
  if (ahora.grabacion) w.hpActivarClarity?.();
}
