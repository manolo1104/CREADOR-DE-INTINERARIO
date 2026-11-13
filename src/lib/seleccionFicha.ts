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

/**
 * El día como va en el botón: «sábado 14» (ES) o «Sat, Nov 14» (EN). Corto a
 * propósito: el botón ya lleva personas y total, y en inglés el día solo no
 * dice el mes. `corto` = «sáb 14» para la barra del celular.
 */
export function textoDiaBoton(ymd: string, en: boolean, corto = false): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return "";
  const d = new Date(`${ymd}T12:00:00`);
  if (en) return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const dia = d.toLocaleDateString("es-MX", { weekday: corto ? "short" : "long" }).replace(".", "");
  return `${dia} ${d.getDate()}`;
}

// ── La elección sobrevive a recargar la página (13 nov 2026) ───────────────
// Por pestaña (`sessionStorage`) y por recorrido: quien eligió el sábado 14
// para 2, recarga o vuelve de otra ficha y encuentra lo mismo.

const CLAVE = (slug: string) => `hp_sel_${slug}`;

export function guardarSeleccionSesion(s: Pick<SeleccionFicha, "slug" | "fecha" | "adultos" | "ninosMid" | "ninosSmall">): void {
  try { window.sessionStorage.setItem(CLAVE(s.slug), JSON.stringify({ f: s.fecha, a: s.adultos, m: s.ninosMid, s: s.ninosSmall })); } catch { /* sin almacenamiento: no pasa nada */ }
}

export function leerSeleccionSesion(slug: string): { fecha: string; adultos: number; ninosMid: number; ninosSmall: number } | null {
  try {
    const d = JSON.parse(window.sessionStorage.getItem(CLAVE(slug)) || "null");
    if (!d || typeof d !== "object") return null;
    const n = (v: unknown) => (Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 30 ? (v as number) : 0);
    return { fecha: typeof d.f === "string" ? d.f : "", adultos: n(d.a), ninosMid: n(d.m), ninosSmall: n(d.s) };
  } catch {
    return null;
  }
}
