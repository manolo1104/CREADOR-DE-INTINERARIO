// Qué es un folio y cuándo se creó, leído del propio número.
//
// Los folios llevan la hora de creación en milisegundos, en base 36:
//   HP-M-XXXXXXXX?? → capturada a mano en el panel (`ReservasClient`, viaje CDMX)
//   HPXXXXXXXX      → creada por un pago en la web (paquetes, pagos rescatados)
//   HPXXXXXXXXYY    → creada por un pago en la web (viaje CDMX)
//   COT-XXXXXXXX??  → cotización del panel · HP-P… → cotización vieja del bot
// Sirve para reconstruir el canal y la fecha de reservas de antes de que
// existiera el campo `origen` (línea base del 3 nov 2026).

export type TipoFolio = "manual" | "web" | "cotizacion" | "otro";

const RE_MANUAL     = /^HP-M-([0-9A-Z]{8})/;
const RE_WEB        = /^HP([0-9A-Z]{8})(?:[0-9A-Z]{2})?$/;
const RE_COTIZACION = /^(?:COT-|HP-P)/;

export function tipoFolio(folio: string): TipoFolio {
  const f = String(folio ?? "").trim().toUpperCase();
  if (RE_MANUAL.test(f)) return "manual";
  if (RE_COTIZACION.test(f)) return "cotizacion";
  if (RE_WEB.test(f)) return "web";
  return "otro";
}

/** Entre 2020 y 2100: fuera de eso no es una hora, es casualidad. */
const MS_MIN = Date.UTC(2020, 0, 1);
const MS_MAX = Date.UTC(2100, 0, 1);

/** El instante en que se creó el folio, o null si el folio no lo trae. */
export function fechaDeFolio(folio: string): Date | null {
  const f = String(folio ?? "").trim().toUpperCase();
  const m = f.match(RE_MANUAL) ?? f.match(RE_WEB);
  if (!m) return null;
  const ms = parseInt(m[1], 36);
  return Number.isFinite(ms) && ms > MS_MIN && ms < MS_MAX ? new Date(ms) : null;
}
