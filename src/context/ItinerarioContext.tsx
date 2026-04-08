"use client";

import { createContext, useContext, useState, useCallback } from "react";

interface ItinerarioContextType {
  slugsSeleccionados: string[];
  agregar: (slug: string) => void;
  quitar: (slug: string) => void;
  tieneDestino: (slug: string) => boolean;
  limpiar: () => void;
  count: number;
}

const ItinerarioContext = createContext<ItinerarioContextType | null>(null);

export function ItinerarioProvider({ children }: { children: React.ReactNode }) {
  const [slugsSeleccionados, setSlugs] = useState<string[]>([]);

  const agregar = useCallback(
    (slug: string) => setSlugs((prev: string[]) => (prev.includes(slug) ? prev : [...prev, slug])),
    [],
  );

  const quitar = useCallback(
    (slug: string) => setSlugs((prev: string[]) => prev.filter((s: string) => s !== slug)),
    [],
  );

  const tieneDestino = useCallback(
    (slug: string) => slugsSeleccionados.includes(slug),
    [slugsSeleccionados],
  );

  const limpiar = useCallback(() => setSlugs([]), []);

  return (
    <ItinerarioContext.Provider
      value={{ slugsSeleccionados, agregar, quitar, tieneDestino, limpiar, count: slugsSeleccionados.length }}
    >
      {children}
    </ItinerarioContext.Provider>
  );
}

export function useItinerario() {
  const ctx = useContext(ItinerarioContext);
  if (!ctx) throw new Error("useItinerario debe usarse dentro de <ItinerarioProvider>");
  return ctx;
}
