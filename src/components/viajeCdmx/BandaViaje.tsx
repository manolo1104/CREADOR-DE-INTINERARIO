"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Bus, ArrowRight } from "lucide-react";
import { TrackedLink } from "@/components/TrackedLink";
import { ALTO_BANDA_VIAJE, VIAJE_RUTA } from "@/lib/viajeCdmx/config";
import { VIAJE_RUTA_EN } from "@/lib/viajeCdmx/en";
import { pesos, pesosEn, rangoCorto, rangoCortoEn } from "@/lib/viajeCdmx/precio";

/**
 * La franja del viaje CDMX–Xilitla, justo debajo de la del estado del río
 * (Manolo, 17 oct 2026: «así como el banner del nivel del río, que aparece en
 * todas las pantallas»). Vive dentro del menú fijo, igual que `BandaRio`.
 *
 * 🔴 Alto FIJO y pintada desde el servidor: el menú crece 30 px, y para no
 * tapar el arranque de ninguna página `EspacioBandaViaje` mete el mismo alto en
 * el flujo, debajo del menú. Si la franja esperara al servidor (como la del
 * río), el contenido brincaría 30 px al aparecer. Las fechas y el precio llegan
 * después, dentro del mismo renglón: sin brinco.
 *
 * No sale en el pago ni en el panel (lo mismo que la del río), ni en la página
 * del viaje: ahí ya estás.
 */
export function bandaViajeVisible(pathname: string | null | undefined): boolean {
  const p = pathname ?? "";
  if (/^\/(admin|curso)|^\/(en\/)?reservar-(tour|paquete)\/|^\/(en\/)?reservar\/carrito|^\/(en\/)?confirmacion/.test(p)) return false;
  if (/^\/viaje-cdmx-xilitla|^\/en\/huasteca-potosina-from-mexico-city/.test(p)) return false;
  return true;
}

interface Salida {
  fechaSalida: string;
  fechaRegreso: string;
  precioVigente: number;
  estado: string;
}

export function BandaViaje() {
  const pathname = usePathname();
  const [salidas, setSalidas] = useState<Salida[] | null>(null);

  useEffect(() => {
    let vivo = true;
    fetch("/api/viaje-cdmx/salidas")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (vivo && Array.isArray(d?.salidas)) setSalidas(d.salidas); })
      .catch(() => {});
    return () => { vivo = false; };
  }, []);

  if (!bandaViajeVisible(pathname)) return null;
  const en = pathname === "/en" || (pathname ?? "").startsWith("/en/");
  const abiertas = (salidas ?? []).filter((s) => s.estado === "preventa" || s.estado === "disponible" || s.estado === "ultimos");
  const desde = abiertas.length ? Math.min(...abiertas.map((s) => s.precioVigente)) : null;
  const fechas = abiertas.slice(0, 2).map((s) => (en ? rangoCortoEn(s.fechaSalida, s.fechaRegreso) : rangoCorto(s.fechaSalida, s.fechaRegreso)));

  return (
    <div className="bg-dorado text-negro border-b border-negro/10" style={{ height: ALTO_BANDA_VIAJE }}>
      <TrackedLink
        href={`${en ? VIAJE_RUTA_EN : VIAJE_RUTA}#fechas`}
        event="VIAJE_BANNER_CLICK"
        data={{ origen: "banda", ruta: pathname }}
        className="group mx-auto flex h-full max-w-7xl items-center justify-center gap-1.5 overflow-hidden whitespace-nowrap px-4 font-dm text-[11px] sm:text-xs"
      >
        <Bus className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {/* En el celular, el nombre corto: el renglón completo no cabe en 360 px y se cortaba el «Ver fechas». */}
        <strong className="font-medium sm:hidden">{en ? "Trip from Mexico City" : "Viaje desde CDMX"}</strong>
        <strong className="hidden font-medium sm:inline">{en ? "Weekend trip from Mexico City" : "Viaje a la Huasteca desde CDMX"}</strong>
        <span className="hidden sm:inline">{en ? "· all included" : "· todo incluido"}</span>
        {fechas.length > 0 && <span className="hidden md:inline">· {fechas.join(en ? " and " : " y ")}</span>}
        {desde != null && <span>· {en ? "from" : "desde"} {en ? pesosEn(desde) : pesos(desde)}</span>}
        <span className="ml-1 inline-flex items-center gap-0.5 underline underline-offset-2">
          {en ? "See dates" : "Ver fechas"}
          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </span>
      </TrackedLink>
    </div>
  );
}

/**
 * El mismo alto de la franja, en el flujo de la página y debajo del menú fijo:
 * todo baja 30 px y nada queda tapado. Va en `PublicShell`, antes del contenido.
 */
export function EspacioBandaViaje() {
  const pathname = usePathname();
  if (!bandaViajeVisible(pathname)) return null;
  return <div aria-hidden="true" style={{ height: ALTO_BANDA_VIAJE }} />;
}
