/**
 * Las cuatro dudas que frenan el pago, respondidas DENTRO del checkout.
 *
 * En Clarity (30 sep–4 oct 2026) el 32 % de los toques en la ficha de Tamul
 * eran para abrir preguntas: niños, «no sé nadar», lluvia, cancelación. Quien
 * llegaba al carrito ya no tenía dónde verlas y se iba a preguntar por
 * WhatsApp o no volvía.
 *
 * REGLA (la misma de `tourRequisitos.ts`): aquí no se inventa nada. Cada
 * respuesta sale del catálogo (`tours.ts`, `TOUR_REQUISITOS`) o de una frase
 * que el sitio ya publica. Si un dato no existe para los recorridos del
 * carrito, la pregunta no se pinta.
 */

import { recogidaDeTour, fmtHora12, type Tour } from "./tours";
import { TOUR_REQUISITOS } from "./tourRequisitos";
import { localizeTour } from "./i18n/localize";
import { getBooking } from "./i18n/booking";
import type { Locale } from "./i18n/config";

export interface RespuestaRapida {
  id: "edad" | "nado" | "lluvia" | "cancelacion";
  pregunta: string;
  respuesta: string;
}

/** Un recorrido del carrito con su fecha (vacía si todavía no la elige). */
export interface RecorridoFechado {
  tour: Tour;
  fecha: string;
}

/**
 * Hasta cuándo se cancela gratis: 48 h antes de la hora de inicio.
 *
 * Basta con restar dos días al calendario y conservar la hora: México no
 * cambia de horario desde 2022, así que 48 h son siempre dos días exactos.
 */
export function limiteCancelacion(fecha: string, horaInicio: number): { fecha: string; hora: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) - 2, 12));
  return { fecha: d.toISOString().slice(0, 10), hora: horaInicio };
}

/** «jue 8 oct, 8:00 AM» / «Thu, Oct 8, 8:00 AM». */
export function textoLimite(limite: { fecha: string; hora: number }, locale: Locale): string {
  const [y, mo, d] = limite.fecha.split("-").map(Number);
  const dia = new Date(Date.UTC(y, mo - 1, d, 12)).toLocaleDateString(locale === "en" ? "en-US" : "es-MX", {
    weekday: "short", day: "numeric", month: "short", timeZone: "UTC",
  });
  // es-MX escribe «jue, 8 oct»: sin la coma ni los puntos de abreviatura se lee mejor.
  const limpio = locale === "en" ? dia : dia.replace(",", "").replace(/\./g, "");
  return `${limpio}, ${fmtHora12(limite.hora)}`;
}

const nombre = (t: Tour, locale: Locale) => localizeTour(t, locale).nombre.split("—")[0].trim();

/** La frase del clima dentro de una política de cancelación propia (Edén). */
function climaDe(t: Tour, locale: Locale): string | null {
  return t.cancelacion?.[locale].split(/(?<=\.)\s+/).find((f) => /clima|weather/i.test(f)) ?? null;
}

export function respuestasRapidas(recorridos: RecorridoFechado[], locale: Locale): RespuestaRapida[] {
  const m = getBooking(locale).checkout;
  const varios = recorridos.length > 1;
  const conNombre = (t: Tour, texto: string) => (varios ? `${nombre(t, locale)}: ${texto}` : texto);
  const out: RespuestaRapida[] = [];

  // ── ¿Pueden ir niños? ───────────────────────────────────────────────────
  const avisosEdad: string[] = [];
  let algunoConNinos = false;
  for (const { tour } of recorridos) {
    const req = TOUR_REQUISITOS[tour.id];
    if (tour.soloAdultos) avisosEdad.push(m.soloAdultos(nombre(tour, locale)));
    else if (req?.edadMinima) avisosEdad.push(m.edadMinima(nombre(tour, locale), req.edadMinima));
    // Los tramos de niño (70 % / 50 %) solo existen en los que se cobran por
    // persona: el RZR va por vehículo y el Edén por grupo.
    if (!tour.soloAdultos && tour.precioUnidad !== "vehiculo" && !tour.tarifaGrupo?.length) algunoConNinos = true;
  }
  if (avisosEdad.length || algunoConNinos) {
    out.push({
      id: "edad",
      pregunta: m.edadTitulo,
      respuesta: [...avisosEdad, algunoConNinos ? m.edadNinos : ""].filter(Boolean).join(" "),
    });
  }

  // ── ¿Y si no sé nadar? ──────────────────────────────────────────────────
  // Solo donde `TOUR_REQUISITOS` lo dice. Esas frases existen solo en español:
  // en inglés va la traducción de lo que afirman, no la frase completa.
  const nado = recorridos
    .map(({ tour }) => ({ tour, frase: TOUR_REQUISITOS[tour.id]?.requisitos?.find((r) => /saber nadar/i.test(r)) }))
    .filter((x): x is { tour: Tour; frase: string } => !!x.frase);
  if (nado.length) {
    out.push({
      id: "nado",
      pregunta: m.nadoTitulo,
      respuesta: locale === "en"
        ? m.nadoSinSaber
        : nado.map(({ tour, frase }) => conNombre(tour, frase.endsWith(".") ? frase : `${frase}.`)).join(" "),
    });
  }

  // ── ¿Y si llueve? ───────────────────────────────────────────────────────
  // Un recorrido con política propia dice lo que ESA política dice del clima
  // (ver la insignia de lluvia en `tours/[slug]`); si no dice nada, se calla.
  const lluvia: string[] = [];
  if (recorridos.some(({ tour }) => !tour.cancelacion)) lluvia.push(m.lluviaGenerica);
  for (const { tour } of recorridos) {
    const clima = tour.cancelacion ? climaDe(tour, locale) : null;
    if (clima) lluvia.push(conNombre(tour, clima));
  }
  if (lluvia.length) out.push({ id: "lluvia", pregunta: m.lluviaTitulo, respuesta: lluvia.join(" ") });

  // ── ¿Puedo cancelar? ────────────────────────────────────────────────────
  // Con fecha EXACTA: «gratis hasta el jue 8 oct, 8:00 AM». Se toma el primer
  // recorrido con la política de siempre; los de política propia van aparte.
  const cancel: string[] = [];
  const normales = recorridos
    .filter(({ tour }) => !tour.cancelacion)
    .sort((a, b) => (a.fecha || "9999").localeCompare(b.fecha || "9999"));
  if (normales.length) {
    const primero = normales[0];
    const limite = primero.fecha ? limiteCancelacion(primero.fecha, recogidaDeTour(primero.tour).horaInicio) : null;
    cancel.push(limite ? m.cancelHasta(textoLimite(limite, locale)) : m.cancelGenerica);
  }
  for (const { tour } of recorridos) {
    if (tour.cancelacion) cancel.push(conNombre(tour, tour.cancelacion[locale]));
  }
  if (cancel.length) out.push({ id: "cancelacion", pregunta: m.cancelTitulo, respuesta: cancel.join(" ") });

  return out;
}

/**
 * La línea de cancelación que va junto al botón de pagar: solo la fecha, sin
 * explicación. `null` si el carrito no tiene un recorrido con la política de
 * siempre (entonces no hay «cancelas gratis» que prometer).
 */
export function cancelacionJuntoAlBoton(recorridos: RecorridoFechado[], locale: Locale): string | null {
  const r = respuestasRapidas(recorridos, locale).find((x) => x.id === "cancelacion");
  if (!r || recorridos.every(({ tour }) => tour.cancelacion)) return null;
  return r.respuesta.split(/(?<=\.)\s+/)[0];
}
