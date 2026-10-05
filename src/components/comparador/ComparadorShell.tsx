"use client";

import { createContext, useContext, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  urlComparar,
  type Grupo,
  type LimitesGrupo,
  type TarifaTour,
  type TipoComparacion,
} from "@/lib/comparador";
import type { Locale } from "@/lib/i18n/config";
import { trackTourEvent } from "@/lib/tourTracker";

/**
 * Lo que comparten las islas del comparador: quién viaja (lo cambia el
 * visitante sin recargar) y qué se está comparando (lo decide la URL).
 *
 * La tabla se pinta en el servidor; aquí solo vive lo que se mueve en el
 * navegador. Cambiar de recorrido sí pasa por el servidor (`navegar`), porque
 * la columna nueva trae renglones nuevos; cambiar el número de personas no,
 * porque los totales se recalculan aquí con la misma función que cobra.
 */
interface Contexto {
  tipo: TipoComparacion;
  locale: Locale;
  grupo: Grupo;
  cambiarGrupo: (g: Grupo) => void;
  slugs: string[];
  nombres: string[];
  ids: string[];
  /** Solo recorridos; en paquetes va vacío. */
  tarifas: TarifaTour[];
  limites: LimitesGrupo;
  origen: string | null;
  navegar: (slugs: string[], detalle: { columna: number; de?: string; a?: string }) => void;
  pendiente: boolean;
}

const ComparadorCtx = createContext<Contexto | null>(null);

export function useComparador(): Contexto {
  const ctx = useContext(ComparadorCtx);
  if (!ctx) throw new Error("useComparador() solo funciona dentro de <ComparadorShell>");
  return ctx;
}

export function ComparadorShell({
  tipo,
  locale,
  grupoInicial,
  limites,
  slugs,
  nombres,
  ids,
  tarifas,
  origen,
  children,
}: {
  tipo: TipoComparacion;
  locale: Locale;
  grupoInicial: Grupo;
  limites: LimitesGrupo;
  slugs: string[];
  nombres: string[];
  ids: string[];
  tarifas: TarifaTour[];
  origen: string | null;
  children: ReactNode;
}) {
  const router = useRouter();
  const [grupo, setGrupo] = useState<Grupo>(grupoInicial);
  const [pendiente, startTransition] = useTransition();

  function cambiarGrupo(g: Grupo) {
    setGrupo(g);
    // La URL lleva el grupo para que la liga compartida abra con la misma gente.
    // Sin pasar por el router: nada de esto necesita al servidor.
    window.history.replaceState(null, "", urlComparar(tipo, slugs, { grupo: g, locale, origen: origen ?? undefined }));
  }

  function navegar(nuevos: string[], detalle: { columna: number; de?: string; a?: string }) {
    trackTourEvent("COMPARAR_CAMBIO", { tipo, ...detalle });
    startTransition(() => {
      router.replace(urlComparar(tipo, nuevos, { grupo, locale, origen: origen ?? undefined }), { scroll: false });
    });
  }

  return (
    <ComparadorCtx.Provider
      value={{ tipo, locale, grupo, cambiarGrupo, slugs, nombres, ids, tarifas, limites, origen, navegar, pendiente }}
    >
      {/* Mientras llega la columna nueva, la tabla se atenúa en vez de congelarse
          sin aviso: el toque sí hizo algo. */}
      <div aria-busy={pendiente} className={`transition-opacity duration-200 ${pendiente ? "opacity-60" : "opacity-100"}`}>
        {children}
      </div>
    </ComparadorCtx.Provider>
  );
}
