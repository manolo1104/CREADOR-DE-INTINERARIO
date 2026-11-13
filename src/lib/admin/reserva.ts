// Cómo se lee el tamaño de un grupo, en un solo lugar.
//
// 🔴 El bug que esto arregla: `TourBooking.adults` / `.children` se guardaban
// SUMANDO las líneas de tour. Como el mismo grupo va a todos los tours, una
// reserva de 2 personas con 5 tours quedaba grabada como 10 adultos, y así se
// pintaba en el panel. En producción hay reservas que dicen 27 personas y son 9.
//
// La verdad está en `lineItems`: cada línea trae el grupo COMPLETO para ese
// tour. El tamaño real del grupo es entonces el MÁXIMO por línea, no la suma.
// Los datos viejos no se tocan: se corrigen al leerlos.

import { extrasDe, totalExtras } from "./extras";

export interface LineaTour {
  tourSlug?: string;
  tourName?: string;
  tourDate?: string;
  adults?: number;
  children?: number;       // formato viejo
  childrenMid?: number;
  childrenSmall?: number;
  subtotal?: number;
  /** Elección obligatoria del recorrido (ej. Siete Cascadas o Tamasopo). */
  eleccion?: string;
  /** Actividades opcionales contratadas. Ya vienen con su precio de catálogo. */
  addOns?: { id?: string; nombre?: string; cantidad?: number; subtotal?: number }[];
  _meta?: unknown;
}

/** Lo mínimo que necesitan estos helpers; sirve para TourBooking y TourQuote. */
export interface ConLineas {
  adults: number;
  children: number;
  tourSlug: string;
  tourName: string;
  tourDate: string;
  totalAmount: number;
  lineItems?: unknown;
}

export interface Grupo {
  adultos: number;
  ninosMid: number;    // 6–10 años
  ninosSmall: number;  // menores de 6
  ninos: number;
  total: number;
}

/**
 * Cuánto se cobra de verdad por cada peso de lista de una reserva (lote 9, 10
 * nov 2026): su total ÷ (renglones + hotel + extras). Con descuento, código o
 * un precio pactado más bajo da menos de 1; con el total editado hacia arriba,
 * más de 1. Así el ingreso de cada renglón es lo que se cobró y no su precio de
 * lista (el margen estimado y la realización de precio salían inflados). Sin
 * renglones, sin lista o con algún renglón sin subtotal (reservas viejas), 1.
 */
export function factorDeTotal(b: { totalAmount: number; lineItems?: unknown; packageItems?: unknown; extraItems?: unknown }): number {
  const sinMeta = (raw: unknown) => (Array.isArray(raw) ? raw : []).filter((x: any) => x && typeof x === "object" && !x._meta) as Record<string, unknown>[];
  const lineas = sinMeta(b.lineItems);
  if (!lineas.length || lineas.some(l => l.subtotal === undefined || l.subtotal === null || !Number.isFinite(Number(l.subtotal)))) return 1;
  const lista = lineas.reduce((t, l) => t + Number(l.subtotal), 0)
    + sinMeta(b.packageItems).reduce((t, p) => t + (Number(p.subtotal) || 0), 0)
    + totalExtras(extrasDe(b.extraItems));
  const total = Number(b.totalAmount) || 0;
  return lista > 0 && total >= 0 ? total / lista : 1;
}

/** Las líneas de tour reales, sin la línea `_meta`. */
export function lineasDe(b: ConLineas): LineaTour[] {
  const raw = b.lineItems;
  if (!Array.isArray(raw)) return [];
  return raw.filter((l: any) => l && !l._meta && (l.tourSlug || l.tourName));
}

/**
 * ¿La reserva incluye noches de hotel que vendimos nosotros? (KPI «Reservas con
 * hotel», 4 nov 2026). Sí cuando `packageItems` trae un renglón de hotel, o
 * cuando es el viaje CDMX, que lleva su noche. OJO: NO es dónde duerme el
 * cliente — eso lo dice `hospedajeDeReserva()` y puede ser otro hotel.
 */
export function incluyeHotel(b: { packageItems?: unknown; tourSlug?: string; lineItems?: unknown }): boolean {
  const pk = Array.isArray(b.packageItems) ? (b.packageItems as any[]) : [];
  if (pk.some(p => p && !p._meta && (p.hotel || p.habitacion || Number(p.noches) > 0))) return true;
  const VIAJE = "viaje-cdmx-xilitla"; // = VIAJE_SLUG (lib/viajeCdmx/config.ts)
  return b.tourSlug === VIAJE || (Array.isArray(b.lineItems) && (b.lineItems as any[]).some(l => l && !l._meta && l.tourSlug === VIAJE));
}

/** La línea `_meta` (método de pago, folio, pickup, numPersonas). */
export function metaDe(b: { lineItems?: unknown }): Record<string, any> {
  const raw = b.lineItems;
  if (!Array.isArray(raw)) return {};
  return (raw as any[]).find(l => l && l._meta) || {};
}

/**
 * Devuelve unos `lineItems` con esos campos escritos en el `_meta`, sin perder
 * nada de lo que ya llevaban ni tocar las líneas de tour. Si no había `_meta`,
 * lo crea al principio (es donde lo pone el panel al guardar una reserva).
 */
export function conMeta(lineItems: unknown, campos: Record<string, unknown>): unknown[] {
  const base = Array.isArray(lineItems) ? [...lineItems] : [];
  const i = base.findIndex((l: any) => l && typeof l === "object" && l._meta);
  if (i === -1) return [{ _meta: true, ...campos }, ...base];
  base[i] = { ...(base[i] as object), ...campos };
  return base;
}

const ninosDe = (l: LineaTour) => (l.childrenMid ?? l.children ?? 0) + (l.childrenSmall ?? 0);

/**
 * Tamaño real del grupo. Máximo por línea, no suma.
 * Si todas las líneas van por vehículo (el RZR guarda `adults: 0`) el máximo da
 * cero: ahí sí vale el `numPersonas` que se capturó a mano.
 */
export function grupoDe(b: ConLineas): Grupo {
  const lineas = lineasDe(b);

  if (lineas.length > 0) {
    const adultos    = Math.max(0, ...lineas.map(l => l.adults ?? 0));
    const ninosMid   = Math.max(0, ...lineas.map(l => l.childrenMid ?? l.children ?? 0));
    const ninosSmall = Math.max(0, ...lineas.map(l => l.childrenSmall ?? 0));
    const total      = adultos + ninosMid + ninosSmall;
    if (total > 0) return { adultos, ninosMid, ninosSmall, ninos: ninosMid + ninosSmall, total };

    // Solo líneas por vehículo: el conteo vive en el `_meta`.
    const capturado = Number(metaDe(b).numPersonas) || 0;
    if (capturado > 0) return { adultos: capturado, ninosMid: 0, ninosSmall: 0, ninos: 0, total: capturado };
  }

  // Reserva vieja de un solo tour, sin `lineItems`: las columnas SÍ son el grupo.
  const adultos = b.adults ?? 0;
  const ninos   = b.children ?? 0;
  return { adultos, ninosMid: ninos, ninosSmall: 0, ninos, total: adultos + ninos };
}

/** "2 adultos · 3 niños" — para el PDF y la ficha de detalle. */
export function grupoLargo(g: Grupo): string {
  const partes: string[] = [];
  partes.push(`${g.adultos} ${g.adultos === 1 ? "adulto" : "adultos"}`);
  if (g.ninosMid > 0)   partes.push(`${g.ninosMid} ${g.ninosMid === 1 ? "niño" : "niños"} (6–10)`);
  if (g.ninosSmall > 0) partes.push(`${g.ninosSmall} ${g.ninosSmall === 1 ? "niño" : "niños"} (−6)`);
  return partes.join(" · ");
}

/** "2A" / "2A · 3N" — para las columnas apretadas del listado. */
export function grupoCorto(g: Grupo): string {
  return `${g.adultos}A${g.ninos > 0 ? ` · ${g.ninos}N` : ""}`;
}

/**
 * Lo que se debe GUARDAR en las columnas `adults` / `children` al crear o
 * editar. Recibe las líneas del formulario y el conteo capturado a mano.
 * Devuelve el grupo, nunca la suma por tour.
 */
export function grupoParaGuardar(
  lineas: LineaTour[],
  numPersonasCapturado?: number | string | null,
): { adults: number; children: number } {
  const capturado = Number(numPersonasCapturado) || 0;
  if (lineas.length === 0) return { adults: Math.max(1, capturado), children: 0 };

  const adultos = Math.max(0, ...lineas.map(l => l.adults ?? 0));
  const ninos   = Math.max(0, ...lineas.map(l => ninosDe(l)));
  if (adultos + ninos > 0) return { adults: adultos, children: ninos };

  return { adults: Math.max(1, capturado), children: 0 };
}
