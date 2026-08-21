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

/**
 * Qué tan lejos llegó la persona, en orden. Clarity guarda la ETIQUETA más
 * reciente de la sesión, así que se manda el número junto al nombre: al filtrar
 * las grabaciones por `paso_embudo` salen ordenadas solas y "4·pago" queda
 * arriba de "1·vio_tour".
 */
const PASO_EMBUDO: Record<string, string> = {
  DESTINO_PAGE_VIEW: "0·destino",
  TOURS_LIST_VIEW:   "1·catalogo",
  TOUR_PAGE_VIEW:    "2·ficha_tour",
  CHECKOUT_STARTED:  "3·agrego_al_carrito",
  BOOKING_PAGE_VIEW: "4·abrio_carrito",
  DATE_SELECTED:     "5·eligio_fecha",
  PAYMENT_INITIATED: "6·pantalla_de_pago",
  PAGO_FALLIDO:      "7·pago_fallido",
  BOOKING_CONFIRMED: "8·reservo",
};

/**
 * Los pasos que hay que poder ver SIEMPRE en video. Clarity graba solo una
 * muestra de las visitas; `upgrade` obliga a conservar esta. Son justo los dos
 * momentos que el embudo no sabe explicar: de 17 personas que abrieron la
 * pantalla de pago, pagó una, y solo dos fallaron la tarjeta. Las otras catorce
 * se fueron sin dejar rastro y ningún número dice por qué.
 */
const GRABAR_SIEMPRE = new Set([
  "BOOKING_PAGE_VIEW",
  "DATE_SELECTED",
  "PAYMENT_INITIATED",
  "PAGO_FALLIDO",
  "BOOKING_CONFIRMED",
]);

/**
 * El mismo evento, contado también en Clarity.
 *
 * El script de Clarity ya se cargaba, pero nadie le hablaba: se juntaban
 * grabaciones sin una sola etiqueta, así que no había forma de pedir "enséñame
 * a los que abrieron el pago y se fueron" — que es exactamente la pregunta que
 * el embudo dejó abierta. Va aparte y entre `try`: si Clarity no está
 * configurado, `window.clarity` no existe y esto no debe tumbar la medición
 * propia, que es la que manda.
 */
function etiquetarClarity(event: string, sid: string, data: Record<string, unknown>): void {
  const clarity = (window as unknown as { clarity?: (...a: unknown[]) => void }).clarity;
  if (typeof clarity !== "function") return;
  try {
    // Liga la grabación con la fila de `TrackEvent`: es nuestro id aleatorio de
    // sesión, no un dato personal.
    clarity("identify", sid);
    clarity("event", event);

    const paso = PASO_EMBUDO[event];
    if (paso) clarity("set", "paso_embudo", paso);

    const tour = data.tour ?? data.tourSlug;
    if (typeof tour === "string" && tour) clarity("set", "tour", tour);

    if (GRABAR_SIEMPRE.has(event)) clarity("upgrade", event);
  } catch {
    // Clarity nunca debe romper el sitio.
  }
}

export function trackTourEvent(
  event: string,
  data?: Record<string, unknown>
): void {
  if (typeof window === "undefined") return;
  try {
    etiquetarClarity(event, getSessionId(), data ?? {});
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
