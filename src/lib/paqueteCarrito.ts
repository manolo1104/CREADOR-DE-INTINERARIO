// El paquete que se está pagando en el checkout del carrito (13 nov 2026).
//
// Va APARTE del carrito de recorridos (`hp_carrito`): un paquete se paga solo
// —su reserva, su correo y su panel suponen un paquete por pago— y quien ya
// tenía tours guardados los encuentra intactos al volver al carrito.
//
// Por pestaña (`sessionStorage`): recargar no borra la fecha ni la habitación.

import { computePaqueteCharge, type PaqueteChargeResult } from "@/lib/paquetePricing";
import { ANTICIPO_PCT } from "@/lib/carrito";
import { MSI_DESDE } from "@/lib/stripeMsi";

export interface PedidoPaquete {
  slug: string;
  fecha: string;
  adultos: number;
  childrenMid: number;
  childrenSmall: number;
  habitacionId: string;
  nocheExtra: boolean;
  elegidos: string[];
}

const CLAVE = "hp_paquete_checkout";

export function pedidoInicial(slug: string): PedidoPaquete {
  return { slug, fecha: "", adultos: 2, childrenMid: 0, childrenSmall: 0, habitacionId: "", nocheExtra: false, elegidos: [] };
}

export function leerPedido(slug: string): PedidoPaquete | null {
  try {
    const d = JSON.parse(window.sessionStorage.getItem(CLAVE) || "null");
    if (!d || d.slug !== slug) return null;
    const n = (v: unknown, min: number) => (Number.isInteger(v) && (v as number) >= min && (v as number) <= 12 ? (v as number) : min);
    return {
      slug,
      fecha: typeof d.fecha === "string" ? d.fecha : "",
      adultos: Math.max(2, n(d.adultos, 2)),
      childrenMid: n(d.childrenMid, 0),
      childrenSmall: n(d.childrenSmall, 0),
      habitacionId: typeof d.habitacionId === "string" ? d.habitacionId : "",
      nocheExtra: d.nocheExtra === true,
      elegidos: Array.isArray(d.elegidos) ? d.elegidos.filter((x: unknown) => typeof x === "string").slice(0, 6) : [],
    };
  } catch {
    return null;
  }
}

export function guardarPedido(p: PedidoPaquete): void {
  try { window.sessionStorage.setItem(CLAVE, JSON.stringify(p)); } catch { /* sin almacenamiento */ }
}

export function olvidarPedido(): void {
  try { window.sessionStorage.removeItem(CLAVE); } catch { /* da igual */ }
}

/**
 * Lo que se PINTA: el total del viaje y lo de hoy con la misma función y la
 * misma regla que cobra el servidor (`lib/cobroPaquete.ts`): 30 %, o todo
 * desde el umbral de meses sin intereses. El servidor vuelve a calcularlo.
 */
export function cotizarPedido(p: PedidoPaquete, vistaMontana: boolean, pagarTodo: boolean): {
  completo: PaqueteChargeResult; hoy: number; pct: number; saldo: number;
} | null {
  const base = {
    slug: p.slug, personas: p.adultos, childrenMid: p.childrenMid, childrenSmall: p.childrenSmall,
    vistaMontana, nocheExtra: p.nocheExtra, tourElegido: p.elegidos.join(","), fecha: p.fecha || undefined,
  };
  const completo = computePaqueteCharge({ ...base, pct: 100 });
  if (!completo) return null;
  const pct = pagarTodo && completo.total >= MSI_DESDE ? 100 : ANTICIPO_PCT;
  const hoy = pct === 100 ? completo.total : computePaqueteCharge({ ...base, pct })?.charge ?? Math.round(completo.total * pct / 100);
  return { completo, hoy, pct, saldo: completo.total - hoy };
}
