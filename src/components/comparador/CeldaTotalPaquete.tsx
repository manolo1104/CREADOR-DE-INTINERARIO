"use client";

import { useComparador } from "./ComparadorShell";
import { dinero } from "@/lib/comparador";
import { computePaqueteCharge } from "@/lib/paquetePricing";
import { comparadorUI } from "@/lib/i18n/comparador";

/**
 * El total de UN paquete para el grupo, con la función que cobra el checkout
 * de paquetes (`computePaqueteCharge`). Archivo aparte a propósito: trae el
 * catálogo de paquetes y habitaciones, y así solo lo descarga quien abre la
 * pestaña de paquetes.
 *
 * 🔴 `pct: 100`. Sin `pct` la función regresa null (exige 30, 50 o 100) y la
 * celda saldría vacía para todos.
 */
export function CeldaTotalPaquete({ slug }: { slug: string }) {
  const { grupo, locale } = useComparador();
  const ui = comparadorUI(locale);
  const r = computePaqueteCharge({
    slug,
    personas: grupo.adultos,
    childrenMid: grupo.ninosMid,
    childrenSmall: grupo.ninosSmall,
    pct: 100,
  });

  if (!r) return <p className="font-dm text-sm text-crema/70 leading-snug">{ui.total.noDisponible}</p>;

  return (
    <div>
      <p key={r.total} className="font-cormorant text-2xl md:text-3xl leading-none text-dorado tabular-nums motion-safe:animate-price-bump">
        {dinero(r.total)} <span className="font-dm text-[11px] text-crema/50 align-middle">MXN</span>
      </p>
      <p className="font-dm text-[11px] text-crema/55 mt-1.5">{ui.total.paraTuGrupo}</p>
      <p className="font-dm text-[11px] text-crema/55">{ui.total.habitaciones(r.habitaciones)}</p>
    </div>
  );
}
