"use client";

/**
 * En qué se va el dinero de cada tour, concepto por concepto.
 *
 * El estado de resultados dice "guías $4,300" de todo el negocio junto, y la
 * tabla de rentabilidad dice cuánto cuesta Tamul en total. Ninguna de las dos
 * contesta la pregunta con la que se negocia con un proveedor: **cuánto llevo
 * gastado en lancheros DE TAMUL este mes**. Eso es lo que hay aquí.
 *
 * 🔴 Una reserva puede llevar varios tours, y un costo capturado ("Guía $800")
 * no dice a cuál de ellos pertenece. Repartirlo a ojo inventaría una cifra, así
 * que esas reservas van a su propio grupo, dicho con todas sus letras. Los
 * costos que todavía son estimación sí se saben repartir: cada renglón del
 * Cotizador trae el recorrido del que salió.
 */

import { useMemo, useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import type { Finanzas } from "@/lib/admin/finanzas";
import { fmx } from "./ui";

interface Concepto {
  nombre: string;
  monto: number;
  veces: number;
  /** true = todavía sale del Cotizador, nadie lo ha capturado. */
  estimado: boolean;
}

interface Grupo {
  slug: string;
  nombre: string;
  salidas: number;
  total: number;
  conceptos: Concepto[];
  /** El cajón de las reservas de varios tours. */
  mezclado?: boolean;
}

const MEZCLA = "__varios__";

export default function GastoPorTour({ datos }: { datos: Finanzas }) {
  const grupos = useMemo<Grupo[]>(() => {
    const acc: Record<string, Grupo> = {};

    const meter = (clave: string, nombre: string, concepto: string, monto: number, estimado: boolean) => {
      const g = (acc[clave] ??= { slug: clave, nombre, salidas: 0, total: 0, conceptos: [], mezclado: clave === MEZCLA });
      g.total += monto;
      const c = g.conceptos.find(x => x.nombre.toLowerCase() === concepto.toLowerCase());
      if (c) { c.monto += monto; c.veces += 1; c.estimado = c.estimado && estimado; }
      else    { g.conceptos.push({ nombre: concepto, monto, veces: 1, estimado }); }
    };

    for (const r of datos.reservas) {
      const unSoloTour = r.tours.length === 1;

      if (r.costoRegistrado > 0) {
        // Capturado. Si la reserva lleva un solo tour, es de ese tour; si lleva
        // varios, no hay forma de saber de cuál, y no se inventa.
        const clave  = unSoloTour ? (r.tours[0].slug || r.tourSlug) : MEZCLA;
        const nombre = unSoloTour ? r.tours[0].nombre : "Reservas de varios tours";
        for (const m of r.movimientos) meter(clave, nombre, m.concepto, m.monto, false);
        (acc[clave] ??= { slug: clave, nombre, salidas: 0, total: 0, conceptos: [], mezclado: clave === MEZCLA }).salidas += 1;
        continue;
      }

      // Todavía estimado: cada renglón del catálogo sabe de qué tour salió.
      for (const l of r.desgloseCatalogo) {
        const tour  = r.tours.find(t => t.slug === l.tourSlug);
        const clave = tour?.slug || (unSoloTour ? r.tourSlug : MEZCLA);
        const nom   = tour?.nombre || (unSoloTour ? r.tour : "Reservas de varios tours");
        meter(clave, nom, l.concepto, l.total, true);
      }
      if (r.desgloseCatalogo.length > 0) {
        for (const t of r.tours) {
          const g = acc[t.slug];
          if (g) g.salidas += 1;
        }
      }
    }

    return Object.values(acc)
      .map(g => ({ ...g, conceptos: g.conceptos.sort((a, b) => b.monto - a.monto) }))
      .sort((a, b) => b.total - a.total);
  }, [datos.reservas]);

  if (grupos.length === 0) {
    return <p className="text-[#1B4332]/30 font-dm text-xs">Todavía no hay costos en este periodo.</p>;
  }

  const total = grupos.reduce((s, g) => s + g.total, 0);

  return (
    <div className="space-y-1.5">
      {grupos.map(g => <Fila key={g.slug} g={g} />)}
      <div className="flex items-baseline gap-2 pt-2 border-t border-[#1B4332]/8">
        <span className="font-dm text-[11px] uppercase tracking-[1.5px] text-[#1B4332]/45 flex-1">Total</span>
        <span className="panel-cifra font-dm text-sm text-[#C9484A] font-medium">{fmx(total)}</span>
      </div>
    </div>
  );
}

function Fila({ g }: { g: Grupo }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <div className="border border-[#1B4332]/10 rounded-sm">
      <button
        onClick={() => setAbierto(a => !a)}
        className="panel-foco w-full flex items-center gap-2 px-3 min-h-[48px] text-left hover:bg-[#1B4332]/[0.02] transition-colors"
      >
        {abierto ? <ChevronDown className="w-4 h-4 text-[#1B4332]/40 shrink-0" />
                 : <ChevronRight className="w-4 h-4 text-[#1B4332]/40 shrink-0" />}
        <span className="flex-1 min-w-0">
          <span className="block font-dm text-sm text-[#1B4332] truncate">{g.nombre}</span>
          <span className="block font-dm text-[10px] text-[#1B4332]/40">
            {g.salidas} salida{g.salidas === 1 ? "" : "s"} · {g.conceptos.length} concepto{g.conceptos.length === 1 ? "" : "s"}
          </span>
        </span>
        <span className="panel-cifra font-dm text-sm text-[#C9484A] shrink-0">{fmx(g.total)}</span>
      </button>

      {abierto && (
        <div className="border-t border-[#1B4332]/8 px-3 py-2">
          {g.mezclado && (
            <p className="font-dm text-[11px] text-[#1B4332]/45 mb-2 leading-snug">
              Son reservas con más de un recorrido: el costo capturado no dice a
              cuál de ellos pertenece, así que no se reparte.
            </p>
          )}
          <ul className="space-y-1">
            {g.conceptos.map(c => (
              <li key={c.nombre} className="flex items-baseline gap-2 font-dm text-xs">
                <span className="text-[#1B4332]/70 flex-1 truncate">
                  {c.nombre}
                  {c.veces > 1 && <span className="text-[#1B4332]/30"> × {c.veces}</span>}
                  {c.estimado && (
                    <span className="text-[#1a4e8a]/60 text-[10px] ml-1.5">del Cotizador</span>
                  )}
                </span>
                <span className="panel-cifra text-[#1B4332]">{fmx(c.monto)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
