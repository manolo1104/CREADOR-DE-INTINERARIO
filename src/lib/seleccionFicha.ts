"use client";

import { useSyncExternalStore } from "react";

/**
 * Lo que la persona ya eligió en el módulo de la ficha (fecha, cuántos van,
 * total), a la vista de los demás botones de la MISMA página.
 *
 * Clarity, 11–28 oct 2026: el WhatsApp de la ficha decía siempre «2 adultos»
 * y sin fecha, aunque la persona ya hubiera puesto 4 personas y el 14 de
 * noviembre en el módulo. El cuadro lateral y la barra del celular son
 * componentes distintos al módulo; en vez de subir el estado a la página
 * (que es un Server Component), el módulo lo publica aquí y quien lo
 * necesita se suscribe. Una sola ficha por página, así que una sola
 * selección: se guarda por slug para no mezclar si algún día hay dos.
 */
export interface SeleccionFicha {
  slug: string;
  fecha: string;        // YYYY-MM-DD o ""
  adultos: number;
  ninosMid: number;
  ninosSmall: number;
  /** ninosMid + ninosSmall */
  ninos: number;
  total: number;
  /** La fecha elegida ya no tiene lugar para este grupo (lo dice el calendario). */
  sinLugar: boolean;
}

let seleccion: SeleccionFicha | null = null;
const oyentes = new Set<() => void>();

export function publicarSeleccion(s: SeleccionFicha) {
  const igual = seleccion && Object.keys(s).every((k) => (s as any)[k] === (seleccion as any)[k]);
  if (igual) return;
  seleccion = s;
  oyentes.forEach((f) => f());
}

function suscribir(f: () => void) {
  oyentes.add(f);
  return () => { oyentes.delete(f); };
}

/** La selección publicada para ESTE recorrido, o null si el módulo no existe o es otro. */
export function useSeleccionFicha(slug: string): SeleccionFicha | null {
  const s = useSyncExternalStore(suscribir, () => seleccion, () => null);
  return s && s.slug === slug ? s : null;
}
