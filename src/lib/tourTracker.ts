// Client-only — call only from "use client" components

/**
 * Id de sesión del visitante. Se exporta porque el pago se crea en el servidor
 * (`/api/tours/create-payment-intent`), que no ve el sessionStorage: sin
 * mandárselo, el evento del pago quedaba huérfano y el embudo no podía ligar
 * "abrió la reserva" con "llegó al pago" de la misma persona.
 */
export function sessionId(): string {
  return getSessionId();
}

function getSessionId(): string {
  if (typeof sessionStorage === "undefined") return "ssr";
  let sid = sessionStorage.getItem("hp_sid");
  if (!sid) {
    sid = `sess_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`;
    sessionStorage.setItem("hp_sid", sid);
  }
  return sid;
}

/** movil | escritorio — responde "¿esta gente entra desde el celular?". */
function getDevice(): string {
  if (typeof window === "undefined") return "desconocido";
  return window.matchMedia?.("(max-width: 1023px)").matches ? "movil" : "escritorio";
}

/**
 * De dónde llegó el visitante. Solo el host cuando es externo, para no meter
 * datos personales que a veces viajan en la query string de otros sitios.
 */
function getReferrer(): string | undefined {
  if (typeof document === "undefined" || !document.referrer) return undefined;
  try {
    const url = new URL(document.referrer);
    return url.host === window.location.host ? `interno:${url.pathname}` : url.host;
  } catch {
    return undefined;
  }
}

export function trackTourEvent(
  event: string,
  data?: Record<string, unknown>
): void {
  if (typeof window === "undefined") return;
  try {
    fetch("/api/track", {
      method:    "POST",
      headers:   { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        event,
        data: data ?? {},
        path: window.location.pathname,
        sid:  getSessionId(),
        device:   getDevice(),
        referrer: getReferrer(),
      }),
    }).catch(() => {});
  } catch {
    // fire and forget — never throw
  }
}
