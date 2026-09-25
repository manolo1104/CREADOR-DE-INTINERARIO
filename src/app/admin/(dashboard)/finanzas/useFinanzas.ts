"use client";

import { useCallback, useEffect, useState } from "react";
import type { Finanzas } from "@/lib/admin/finanzas";

export type Preset = "hoy" | "semana" | "mes" | "mesPasado" | "rango";

export const hoyMX = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });

export function sumaDias(ymd: string, dias: number): string {
  const d = new Date(ymd + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}
function lunesDe(ymd: string): string {
  const dow = (new Date(ymd + "T12:00:00Z").getUTCDay() + 6) % 7;
  return sumaDias(ymd, -dow);
}

/** El rango que corresponde a cada botón del selector. */
export function rangoDe(p: Preset, hoy = hoyMX()): { desde: string; hasta: string } {
  switch (p) {
    case "hoy":    return { desde: hoy, hasta: hoy };
    case "semana": return { desde: lunesDe(hoy), hasta: sumaDias(lunesDe(hoy), 6) };
    case "mes":    return { desde: hoy.slice(0, 8) + "01", hasta: hoy };
    case "mesPasado": {
      const finAnterior = sumaDias(hoy.slice(0, 8) + "01", -1);
      return { desde: finAnterior.slice(0, 8) + "01", hasta: finAnterior };
    }
    default: return { desde: hoy, hasta: hoy };
  }
}

/** Trae el corte y lo vuelve a pedir cuando cambia el periodo. */
export function useFinanzas(desde: string, hasta: string, base: "tour" | "venta") {
  const [datos,    setDatos]    = useState<Finanzas | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error,    setError]    = useState("");

  const cargar = useCallback(async () => {
    setCargando(true); setError("");
    try {
      const r = await fetch(`/api/admin/finanzas?desde=${desde}&hasta=${hasta}&base=${base}`);
      if (!r.ok) throw new Error(r.status === 403 ? "Esta sección no es para tu cuenta" : "No se pudieron calcular las finanzas");
      setDatos(await r.json());
    } catch (e: any) {
      setError(e.message); setDatos(null);
    } finally { setCargando(false); }
  }, [desde, hasta, base]);

  useEffect(() => { cargar(); }, [cargar]);
  return { datos, cargando, error, recargar: cargar };
}
