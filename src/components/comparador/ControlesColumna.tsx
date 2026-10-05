"use client";

import { ChevronDown, Plus, X } from "lucide-react";
import { useComparador } from "./ComparadorShell";
import { MAX_COLUMNAS, MIN_COLUMNAS } from "@/lib/comparador";
import { comparadorUI } from "@/lib/i18n/comparador";
import type { OpcionColumna } from "@/lib/comparadorDatos";

/** Las opciones libres (las que no están ya en la tabla), agrupadas por categoría. */
function gruposLibres(opciones: OpcionColumna[], ocupados: string[]) {
  const libres = opciones.filter((o) => !ocupados.includes(o.slug));
  return Array.from(new Set(libres.map((o) => o.grupo))).map((g) => ({
    grupo: g,
    opciones: libres.filter((o) => o.grupo === g),
  }));
}

/**
 * El selector nativo va TRANSPARENTE encima de un botón "Cambiar ▾": el
 * nombre ya se lee en el encabezado de la columna, y un select con el nombre
 * cortado a la mitad en un teléfono se lee peor que un botón. Al tocarlo se
 * abre el selector del sistema, que en el celular es el cómodo.
 * `text-base` en el select: con menos de 16 px el iPhone hace zoom al tocarlo.
 */
const ESTILO_BOTON =
  "relative min-h-[44px] flex items-center justify-between gap-2 border border-white/15 hover:border-dorado/50 focus-within:border-dorado px-3 font-dm text-[11px] tracking-[1.5px] uppercase text-crema/75 transition-colors cursor-pointer";

/** Cambiar o quitar UNA columna. */
export function ControlColumna({ indice, opciones }: { indice: number; opciones: OpcionColumna[] }) {
  const { slugs, nombres, navegar, locale } = useComparador();
  const ui = comparadorUI(locale);
  const actual = slugs[indice];
  const nombre = nombres[indice];
  // Los que ya están en la tabla, primero: en el celular la tercera columna no
  // se ve, y elegirla aquí la intercambia con esta.
  const enTabla = opciones.filter((o) => slugs.includes(o.slug) && o.slug !== actual);

  function elegir(nuevo: string) {
    if (!nuevo || nuevo === actual) return;
    const lista = [...slugs];
    const j = lista.indexOf(nuevo);
    if (j >= 0) lista[j] = actual; // ya estaba: se intercambian de lugar
    lista[indice] = nuevo;
    navegar(lista, { columna: indice, de: actual, a: nuevo });
  }

  return (
    <div className="mt-2 flex items-stretch gap-2">
      <label className={`${ESTILO_BOTON} flex-1`}>
        <span>{ui.grupo.cambiar}</span>
        <ChevronDown className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <select
          aria-label={ui.columnas.cambiar(nombre)}
          value={actual}
          onChange={(e) => elegir(e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer text-base"
        >
          <option value={actual}>{nombre}</option>
          {enTabla.length > 0 && (
            <optgroup label={ui.columnas.enEstaComparacion}>
              {enTabla.map((o) => (
                <option key={o.slug} value={o.slug}>{o.nombre}</option>
              ))}
            </optgroup>
          )}
          {gruposLibres(opciones, slugs).map((g) => (
            <optgroup key={g.grupo} label={g.grupo}>
              {g.opciones.map((o) => (
                <option key={o.slug} value={o.slug}>{o.nombre}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      {slugs.length > MIN_COLUMNAS && (
        <button
          type="button"
          onClick={() => navegar(slugs.filter((_, i) => i !== indice), { columna: indice, de: actual })}
          aria-label={ui.columnas.quitar(nombre)}
          className="w-11 min-h-[44px] inline-flex items-center justify-center border border-white/15 text-crema/60 hover:text-crema hover:border-white/40 transition-colors"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

/**
 * "+ Agregar otro". Solo desde tablet: en el celular se ven dos columnas y una
 * tercera quedaría escondida justo al agregarla.
 */
export function AgregarColumna({ opciones }: { opciones: OpcionColumna[] }) {
  const { slugs, navegar, locale, tipo } = useComparador();
  const ui = comparadorUI(locale);
  if (slugs.length >= MAX_COLUMNAS[tipo]) return null;
  const grupos = gruposLibres(opciones, slugs);
  if (!grupos.length) return null;
  const etiqueta = tipo === "paquetes" ? ui.columnas.agregarPaquete : ui.columnas.agregarRecorrido;

  return (
    <div className="hidden md:flex justify-end mt-3">
      <label className={`${ESTILO_BOTON} gap-2.5 text-dorado border-dorado/40`}>
        <Plus className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{etiqueta}</span>
        <select
          aria-label={etiqueta}
          value=""
          onChange={(e) => e.target.value && navegar([...slugs, e.target.value], { columna: slugs.length, a: e.target.value })}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer text-base"
        >
          <option value="">{etiqueta}</option>
          {grupos.map((g) => (
            <optgroup key={g.grupo} label={g.grupo}>
              {g.opciones.map((o) => (
                <option key={o.slug} value={o.slug}>{o.nombre}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
    </div>
  );
}
