"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * «Si tienes 1, 2 o 3 días» (pase de diseño, 20 nov 2026). Antes eran tres
 * tarjetas iguales que repetían el mismo día 1 tres veces; ahora es un selector
 * de días y una sola línea de tiempo. El indicador se desliza con transform
 * (ver `.indicador-segmentado` en globals.css); el contenido cambia sin
 * animación porque se consulta, no se contempla.
 */
export interface LugarRuta { nombre: string; href: string; foto?: string }
export interface JornadaRuta { titulo: string; lugares: LugarRuta[]; tour?: { nombre: string; href: string; precio: string } }
export interface Ruta { dias: string; jornadas: JornadaRuta[] }

export default function RutasDias({ rutas, en }: { rutas: Ruta[]; en: boolean }) {
  const [i, setI] = useState(1);
  const ruta = rutas[i];
  return (
    <div>
      <div role="tablist" aria-label={en ? "Trip length" : "Duración del viaje"}
        className="relative inline-grid rounded-xl border border-white/15 bg-negro/60 p-1"
        style={{ gridTemplateColumns: `repeat(${rutas.length}, minmax(0, 1fr))` }}>
        <span aria-hidden="true" className="indicador-segmentado absolute inset-y-1 left-1 rounded-lg bg-verde-selva"
          style={{ width: `calc((100% - 0.5rem) / ${rutas.length})`, transform: `translateX(${i * 100}%)` }} />
        {rutas.map((r, k) => (
          <button key={r.dias} role="tab" type="button" aria-selected={k === i} onClick={() => setI(k)}
            className={`tactil relative min-h-[44px] px-6 font-dm text-sm ${k === i ? "text-crema" : "text-crema/55 hover:text-crema"}`}>
            {r.dias}
          </button>
        ))}
      </div>

      <ol role="tabpanel" className="mt-8 space-y-4">
        {ruta.jornadas.map((j, k) => (
          <li key={j.titulo} className="grid gap-4 rounded-2xl border border-white/10 bg-negro/40 p-4 md:grid-cols-[150px_1fr_auto] md:items-center md:p-5">
            <div>
              <p className="font-cormorant text-dorado text-2xl leading-none">{en ? `Day ${k + 1}` : `Día ${k + 1}`}</p>
              <p className="mt-1 font-dm text-xs text-crema/50">{j.titulo}</p>
            </div>
            <ul className="flex flex-wrap gap-2">
              {j.lugares.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="tactil group flex items-center gap-2.5 rounded-xl border border-white/10 bg-negro/50 py-1.5 pl-1.5 pr-3.5 hover:border-lima/40">
                    {l.foto && (
                      <span className="relative block h-9 w-9 flex-shrink-0 overflow-hidden rounded-lg">
                        <Image src={l.foto} alt="" fill sizes="36px" className="object-cover" />
                      </span>
                    )}
                    <span className="font-dm text-sm text-crema/90 group-hover:text-lima">{l.nombre}</span>
                  </Link>
                </li>
              ))}
            </ul>
            {j.tour && (
              <Link href={j.tour.href} className="tactil inline-flex items-center justify-between gap-3 rounded-xl border border-verde-vivo/30 px-4 py-2.5 hover:border-verde-vivo/60 md:justify-start">
                <span className="font-dm text-xs text-crema/60">
                  {en ? "With " : "Con "}<span className="text-crema/90">{j.tour.nombre}</span>
                  <span className="block text-dorado">{j.tour.precio}</span>
                </span>
                <ArrowRight className="h-4 w-4 text-verde-vivo" aria-hidden="true" />
              </Link>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
