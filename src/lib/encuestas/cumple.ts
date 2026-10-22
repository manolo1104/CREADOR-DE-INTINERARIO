/**
 * El regalo de cumpleaños (21 oct 2026, reglas de Manolo):
 * - 10 % de descuento en los TOURS de su siguiente reserva. NO aplica al RZR
 *   (su reparto es 10 % Erick / 20 % Manolo / 80 % Martín: un descuento ahí le
 *   pega sobre todo a Martín), ni al hospedaje, ni a los extras, ni al traslado
 *   desde Ciudad Valles, ni al viaje desde CDMX.
 * - Un código personal por persona y año, de un solo uso, que vale 60 días.
 * - Solo a quien marcó la casilla de promociones en el check-in.
 *
 * Ej. (confirmado con Manolo): Tamul 2 personas $3,000 + RZR $4,500 + hotel
 * $2,000 → 10 % de $3,000 = $300. El corte sigue registrando el RZR completo.
 */

import { randomInt } from "crypto";
import { prisma } from "@/lib/prisma";
import { TOURS_LISTA, cargoVallesDe } from "@/lib/tours";
import { ID_TRASLADO_VALLES } from "@/lib/tourPricing";
import { subtotalPanel } from "@/lib/cotizaciones/armar";
import { VIAJE_SLUG } from "@/lib/viajeCdmx/config";
import { addDaysYMD } from "@/lib/dates";

export const PCT_CUMPLE = 10;
export const DIAS_VIGENCIA = 60;
/** Cuántos días hacia atrás se revisa por si GitHub se saltó una corrida. */
export const DIAS_ATRAS = 2;

// Sin 0/O ni 1/I/L: el cliente lo dicta por WhatsApp o lo copia a mano.
const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generarCodigoCumple(): string {
  let s = "";
  for (let i = 0; i < 5; i++) s += ALFABETO[randomInt(ALFABETO.length)];
  return `CUMPLE-${s}`;
}

/** «cumple-ab3cd » → «CUMPLE-AB3CD». */
export function normalizarCodigo(txt: unknown): string {
  return String(txt ?? "").trim().toUpperCase().replace(/\s+/g, "");
}

const bisiesto = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

/**
 * Si el cumpleaños cae hoy o en los `diasAtras` días anteriores, el día en que
 * cayó (YYYY-MM-DD) y su año. El 29 de febrero se festeja el 28 los años que
 * no son bisiestos.
 */
export function cumpleEnVentana(fechaNacimiento: string, hoy: string, diasAtras = DIAS_ATRAS): { anio: number; fecha: string } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaNacimiento)) return null;
  const mmdd = fechaNacimiento.slice(5);
  for (let d = 0; d <= diasAtras; d++) {
    const dia = addDaysYMD(hoy, -d);
    const anio = Number(dia.slice(0, 4));
    const festejo = mmdd === "02-29" && !bisiesto(anio) ? "02-28" : mmdd;
    if (dia.slice(5) === festejo) return { anio, fecha: dia };
  }
  return null;
}

export interface LineaCumple {
  nombre: string;
  base: number;
  /** Por qué no entra (si no entra). */
  fuera?: string;
}

/**
 * Sobre cuánto se calcula el 10 %: cada renglón de tour a precio del panel
 * (`subtotalPanel`, el mismo que guarda el editor), sin el traslado desde
 * Valles y sin los renglones que no aplican. Lo calcula el SERVIDOR con el
 * catálogo: no confía en el subtotal que manda el navegador.
 */
export function baseCumple(lineas: unknown): { base: number; monto: number; lineas: LineaCumple[] } {
  const out: LineaCumple[] = [];
  const arr = Array.isArray(lineas) ? lineas : [];
  for (const raw of arr) {
    const l = raw as Record<string, any>;
    if (!l || l._meta || !(l.tourSlug || l.tourName)) continue;
    const t = TOURS_LISTA.find((x) => x.slug === l.tourSlug);
    const nombre = t?.nombre || l.tourName || l.tourSlug;
    if (l.tourSlug === VIAJE_SLUG) { out.push({ nombre, base: 0, fuera: "el viaje desde CDMX no aplica" }); continue; }
    if (t?.precioUnidad === "vehiculo") { out.push({ nombre, base: 0, fuera: "el RZR no aplica" }); continue; }
    const linea = { adults: 0, childrenMid: 0, childrenSmall: 0, ...l } as Parameters<typeof subtotalPanel>[0];
    const subtotal = subtotalPanel(linea);
    const valles = (l.addOns ?? []).some((a: any) => a?.id === ID_TRASLADO_VALLES) ? cargoVallesDe(t) : 0;
    out.push({ nombre, base: Math.max(0, subtotal - valles) });
  }
  const base = out.reduce((s, x) => s + x.base, 0);
  return { base, monto: Math.round((base * PCT_CUMPLE) / 100), lineas: out };
}

export type Validacion =
  | { ok: true; codigo: string; nombre: string; email: string; venceEl: string; canjeadoEn: string | null; folioCanje: string | null }
  | { ok: false; error: string };

/**
 * ¿Sirve este código para la reserva `folio`? (Si ya se canjeó en ESA misma
 * reserva sigue sirviendo: se está editando.)
 */
export async function validarCodigoCumple(codigoTxt: unknown, hoy: string, folio?: string): Promise<Validacion> {
  const codigo = normalizarCodigo(codigoTxt);
  if (!/^CUMPLE-[A-Z0-9]{5}$/.test(codigo)) return { ok: false, error: "Ese no parece un código de cumpleaños (CUMPLE-XXXXX)." };
  const c = await prisma.codigoCumple.findUnique({ where: { codigo } });
  if (!c) return { ok: false, error: `No existe el código ${codigo}.` };
  if (c.canjeadoEn && c.folioCanje !== folio) {
    return { ok: false, error: `El código ${codigo} ya se usó en la reserva ${c.folioCanje ?? ""}.`.trim() };
  }
  if (!c.canjeadoEn && c.venceEl < hoy) return { ok: false, error: `El código ${codigo} venció el ${c.venceEl}.` };
  return {
    ok: true, codigo, nombre: c.nombre, email: c.email, venceEl: c.venceEl,
    canjeadoEn: c.canjeadoEn ? c.canjeadoEn.toISOString() : null, folioCanje: c.folioCanje,
  };
}

/**
 * Lo marca como usado en `folio`, de forma atómica: si dos reservas lo intentan
 * a la vez, solo una gana. Devuelve el error si no se pudo.
 */
export async function canjearCodigoCumple(codigoTxt: unknown, folio: string, hoy: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const codigo = normalizarCodigo(codigoTxt);
  const { count } = await prisma.codigoCumple.updateMany({
    where: { codigo, canjeadoEn: null, venceEl: { gte: hoy } },
    data:  { canjeadoEn: new Date(), folioCanje: folio },
  });
  if (count === 1) return { ok: true };
  const v = await validarCodigoCumple(codigo, hoy, folio);
  // Ya estaba canjeado en esta misma reserva: no es error.
  if (v.ok && v.folioCanje === folio) return { ok: true };
  return { ok: false, error: v.ok ? `No se pudo usar el código ${codigo}.` : v.error };
}

/** Lo libera (si se quitó de la reserva o la reserva no se pudo guardar). */
export async function liberarCodigoCumple(codigoTxt: unknown, folio: string): Promise<void> {
  await prisma.codigoCumple.updateMany({
    where: { codigo: normalizarCodigo(codigoTxt), folioCanje: folio },
    data:  { canjeadoEn: null, folioCanje: null },
  });
}

/**
 * Suelta lo que tenga canjeado una reserva que se canceló o se borró: el
 * regalo vuelve a servirle al cliente (si no ha vencido).
 */
export async function liberarCodigosDeFolio(folio: string): Promise<number> {
  const { count } = await prisma.codigoCumple.updateMany({
    where: { folioCanje: folio },
    data:  { canjeadoEn: null, folioCanje: null },
  });
  return count;
}

/** El código que trae el `_meta` de unos renglones ("" si ninguno). */
export function codigoDeLineas(lineItems: unknown): string {
  const m = metaCon(lineItems);
  return m?.codigoCumple ? normalizarCodigo(m.codigoCumple) : "";
}

/** El vencimiento de un código que se manda hoy. */
export const venceDesde = (hoy: string) => addDaysYMD(hoy, DIAS_VIGENCIA);

const metaCon = (lineItems: unknown): Record<string, unknown> | null =>
  Array.isArray(lineItems) ? ((lineItems as any[]).find((l) => l && l._meta) ?? null) : null;

/**
 * Al GUARDAR una reserva del panel: si su `_meta.codigoCumple` es nuevo, lo
 * canjea a nombre de este folio. Si el `_meta` llega SIN la llave (otras
 * pantallas), no es quitarlo: se deja.
 *
 * El de ANTES (si se quitó o se cambió) NO se suelta aquí: lo devuelve en
 * `porLiberar` y quien llama lo suelta DESPUÉS de guardar. Y si el guardado
 * truena, quien llama suelta `canjeado`. Así un error a medias no deja un
 * código usado sin reserva, ni una reserva con un código suelto.
 * Devuelve qué pasó para la bitácora, o el error si el código no sirve.
 */
export async function codigoCumpleAlGuardar(
  nuevos: unknown, antes: unknown, folio: string, hoy: string,
): Promise<
  | { ok: true; resumen: string | null; canjeado: string | null; porLiberar: string | null }
  | { ok: false; error: string }
> {
  const sinCambio = { ok: true as const, resumen: null, canjeado: null, porLiberar: null };
  const mNuevo = metaCon(nuevos);
  if (!mNuevo || !("codigoCumple" in mNuevo)) return sinCambio;
  const nuevo = codigoDeLineas(nuevos);
  const viejo = codigoDeLineas(antes);
  if (nuevo === viejo) return sinCambio;
  if (nuevo) {
    const r = await canjearCodigoCumple(nuevo, folio, hoy);
    if (!r.ok) return r;
  }
  return {
    ok: true,
    canjeado:   nuevo || null,
    porLiberar: viejo || null,
    resumen: nuevo
      ? `usó el código de cumpleaños ${nuevo}${viejo ? ` (en lugar de ${viejo})` : ""}`
      : `quitó el código de cumpleaños ${viejo}`,
  };
}
