// Editar una reserva sin perder lo que trae (lote 5 de la auditoría, 5 nov 2026).
//
// 🔴 Las reservas de la web (paquetes y carritos con hotel o traslado) no
// salían bien de «Editar»: el paquete se volvía «Ruta Surrealista + Expedición
// Tamul + …» con el slug del primer tour, el hotel perdía su importe (NaN) y el
// renglón del traslado no dejaba guardar. Además, quitar a los niños dejaba el
// `children` viejo en el renglón y seguían ocupando cupo y lugar en la salida.
//
// Sin dependencias de servidor: lo usan el cuadro de la reserva, su lista y la
// ruta que guarda.

import { addDaysYMD, diffDiasYMD } from "@/lib/dates";

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// ── Habitaciones ────────────────────────────────────────────────────────────

/** Lo que vale una habitación del cuadro: precio por noche × noches × habitaciones. Nunca NaN. */
export function importeHabitacion(p: { precioPorNoche?: unknown; noches?: unknown; habitaciones?: unknown }): number {
  return Math.round(num(p.precioPorNoche) * num(p.noches) * num(p.habitaciones));
}

/**
 * Las habitaciones guardadas, listas para el cuadro. La web las guarda con su
 * `subtotal` pero sin `precioPorNoche`: se saca de ahí (a dos decimales, así el
 * importe vuelve exacto al redondear), como `habitacionesParaReserva` al
 * convertir una cotización. Sin los dos, queda en 0 —nunca NaN—.
 */
export function habitacionesParaEditar<T extends object>(guardadas: T[] | null | undefined): (T & { precioPorNoche: number; noches: number; habitaciones: number })[] {
  return (Array.isArray(guardadas) ? guardadas : []).map((p) => {
    const r = p as Record<string, unknown>;
    const noches = Math.max(0, num(r.noches));
    const habitaciones = Math.max(1, num(r.habitaciones) || 1);
    const guardado = num(r.precioPorNoche);
    const subtotal = Math.max(0, num(r.subtotal));
    const precioPorNoche = guardado > 0
      ? guardado
      : noches > 0 ? Math.round((subtotal / (noches * habitaciones)) * 100) / 100 : 0;
    return { ...p, noches, habitaciones, precioPorNoche };
  });
}

// ── Renglones ───────────────────────────────────────────────────────────────

/**
 * Un concepto SIN recorrido que trae la web (el traslado desde otra ciudad):
 * tiene nombre y fecha, pero ningún slug. Se guarda tal cual, con su importe.
 */
export function esConceptoSinTour(l: { tourSlug?: unknown; tourName?: unknown }): boolean {
  return !l.tourSlug && typeof l.tourName === "string" && l.tourName.trim() !== "";
}

/** El importe guardado de un concepto sin recorrido (no hay lista que lo recalcule). */
export function importeDeConcepto(l: { subtotal?: unknown }): number {
  return Math.max(0, Math.round(num(l.subtotal)));
}

/**
 * El renglón como se guarda: `children` = todos los menores (bebés incluidos). 🔴 El
 * carrito guarda `children` ADEMÁS de `childrenMid` y `childrenSmall`; si en
 * Editar se quitaban los niños, el `children` viejo se quedaba y el cupo, las
 * Salidas del día y el corte (que toman el mayor de los dos) los seguían
 * contando. Solo se toca en los renglones que ya traen `children`.
 */
export function lineaParaGuardar<T extends object>(l: T): T {
  const r = l as Record<string, unknown>;
  if (!("children" in r)) return l;
  // Los bebés de 0 a 3 (gratis, 17 nov 2026) también ocupan lugar.
  return { ...l, children: Math.max(0, num(r.childrenMid)) + Math.max(0, num(r.childrenSmall)) + Math.max(0, num(r.infants)) };
}

// ── Lo que manda el servidor al guardar ─────────────────────────────────────

/** El total que se puede guardar: un entero ≥ 0, o null (la columna no admite otra cosa). */
export function totalParaGuardar(v: unknown): number | null {
  if (v === null || v === "" || typeof v === "boolean") return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

/** La fecha más temprana de unos `lineItems`, o "". */
function primeraFecha(lineItems: unknown): string {
  return (Array.isArray(lineItems) ? lineItems : [])
    .filter((l) => !!l && typeof l === "object" && !(l as { _meta?: unknown })._meta)
    .map((l) => String((l as { tourDate?: unknown }).tourDate ?? ""))
    .filter((f) => FECHA.test(f))
    .sort()[0] ?? "";
}

/**
 * Una reserva de PAQUETE (web o convertida de una cotización de paquete) sigue
 * siendo ese paquete al editarla: el panel mandaba el slug, el id y el nombre
 * del primer tour, y el paquete dejaba de contar en su cupo, el correo lo
 * mandaba a /tours/… y la lista lo llamaba «Ruta Surrealista + …».
 *
 * Devuelve qué escribir en vez de lo que mandó el panel. La fecha del paquete
 * (el día 1, que puede ser de llegada) se mueve solo si se movieron los
 * recorridos, y los mismos días.
 */
export function identidadDePaqueteAlEditar(
  antes: { tourId: string; tourName: string; tourSlug: string; tourDate: string; lineItems?: unknown },
  cambios: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (cambios.tourId !== undefined) out.tourId = antes.tourId;
  if (cambios.tourSlug !== undefined) out.tourSlug = antes.tourSlug;
  if (cambios.tourName !== undefined) out.tourName = antes.tourName;
  if (cambios.tourDate !== undefined) {
    const a = primeraFecha(antes.lineItems);
    const d = primeraFecha(cambios.lineItems !== undefined ? cambios.lineItems : antes.lineItems);
    out.tourDate = !FECHA.test(antes.tourDate)
      ? cambios.tourDate
      : a && d ? addDaysYMD(antes.tourDate, diffDiasYMD(a, d)) : antes.tourDate;
  }
  return out;
}

/** Las notas con el aviso al principio, sin repetirlo si ya estaba. */
export function notasConAviso(notas: string | null | undefined, aviso: string | null): string | null {
  const n = (notas ?? "").trim();
  if (!aviso) return n || null;
  if (n.includes(aviso)) return n;
  return [aviso, n].filter(Boolean).join("\n");
}
