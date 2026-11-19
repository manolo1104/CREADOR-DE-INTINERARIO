"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bus, Car, MapPin, Users, Calculator } from "lucide-react";
import type { Tour } from "@/lib/tours";
import { comoLlegar, personasDeGrupo, totalEstimado } from "@/lib/planRecomendador";

const mxn = (n: number) => `$${Math.round(n).toLocaleString("es-MX")}`;

/**
 * Lo que faltaba en el resultado del recomendador (13 nov 2026): cómo llegar
 * desde SU ciudad, el viaje grupal desde CDMX cuando aplica, y cuánto le
 * costaría el viaje entero. Los números salen de las mismas fuentes que el
 * resto del sitio (`lib/planRecomendador.ts`).
 */
export function PlanCompleto({ origen, dias, grupo, principal, secundario, paquete }: {
  origen: string; dias: string; grupo: string;
  principal: Tour | null; secundario: Tour | null;
  paquete: { slug: string; nombre: string } | null;
}) {
  const { adultos, ninos } = personasDeGrupo(grupo);
  const llegar = comoLlegar(origen, adultos + ninos);
  const estimado = totalEstimado({ dias, grupo, origen, principal, secundario, paquete });

  // El viaje grupal desde CDMX: solo si viene de ahí y hay una salida a la venta.
  const [salida, setSalida] = useState<{ fechaSalida: string; precioVigente: number; disponibles: number } | null>(null);
  useEffect(() => {
    if (llegar?.slug !== "cdmx") return;
    fetch("/api/viaje-cdmx/salidas").then((r) => (r.ok ? r.json() : null)).then((d) => {
      const s = (d?.salidas ?? []).find((x: { disponibles: number }) => x.disponibles > 0);
      if (s) setSalida(s);
    }).catch(() => {});
  }, [llegar?.slug]);

  const fecha = (ymd: string) => new Date(`${ymd.slice(0, 10)}T12:00:00`).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="mb-8 space-y-3">
      {/* Cómo llegar */}
      <div className="rounded-2xl bg-white border border-negro/8 p-5">
        <p className="flex items-center gap-2 font-cormorant text-verde-profundo text-xl mb-2">
          <MapPin className="w-4 h-4 text-verde-selva" aria-hidden="true" />Cómo llegar desde {origen || "tu ciudad"}
        </p>
        {llegar ? (
          <ul className="space-y-1.5 font-dm text-[13px] text-negro/70">
            {llegar.auto && <li className="flex gap-2"><Car className="w-4 h-4 flex-shrink-0 text-verde-selva" aria-hidden="true" />En auto: unas {llegar.auto} hasta Xilitla{llegar.km ? ` (${llegar.km})` : ""}.</li>}
            {llegar.bus && <li className="flex gap-2"><Bus className="w-4 h-4 flex-shrink-0 text-verde-selva" aria-hidden="true" />En autobús: {llegar.bus}.</li>}
            {llegar.traslado && <li className="flex gap-2"><Users className="w-4 h-4 flex-shrink-0 text-verde-selva" aria-hidden="true" />Traslado privado para tu grupo: {mxn(llegar.traslado)} MXN ida y vuelta, de puerta a puerta.</li>}
          </ul>
        ) : (
          <p className="font-dm text-[13px] text-negro/60">
            Te decimos la mejor ruta desde tu ciudad por{" "}
            <a href={`https://wa.me/524891090388?text=${encodeURIComponent(`Hola, voy desde ${origen || "mi ciudad"}. ¿Cuál es la mejor forma de llegar a Xilitla?`)}`} target="_blank" rel="noopener noreferrer" className="text-verde-selva underline">WhatsApp</a>.
          </p>
        )}
      </div>

      {/* Viaje grupal desde CDMX */}
      {salida && (
        <Link href="/viaje-cdmx-xilitla" className="rounded-xl block bg-verde-profundo text-crema p-5 hover:bg-verde-selva transition-colors">
          <p className="text-[10px] tracking-[2px] uppercase text-lima/80 mb-1">Viaje grupal desde CDMX</p>
          <p className="font-cormorant text-xl leading-tight">Sale el {fecha(salida.fechaSalida)}: transporte, hotel y recorridos incluidos</p>
          <p className="mt-1 font-dm text-[12px] text-crema/70">{mxn(salida.precioVigente)} MXN por persona · quedan {salida.disponibles} lugares →</p>
        </Link>
      )}

      {/* Total estimado */}
      {estimado.lineas.length > 0 && (
        <div className="rounded-2xl bg-white border border-negro/8 p-5">
          <p className="flex items-center gap-2 font-cormorant text-verde-profundo text-xl mb-2">
            <Calculator className="w-4 h-4 text-verde-selva" aria-hidden="true" />Total estimado del viaje
          </p>
          <ul className="space-y-1 font-dm text-[13px] text-negro/70">
            {estimado.lineas.map((l) => (
              <li key={l.concepto} className="flex justify-between gap-3"><span>{l.concepto}</span><span className="tabular-nums">{mxn(l.monto)}</span></li>
            ))}
          </ul>
          <p className="mt-3 flex justify-between border-t border-negro/10 pt-3 font-dm text-sm text-negro">
            <span>≈ Para {estimado.personas} {estimado.personas === 1 ? "persona" : "personas"}</span>
            <strong className="font-cormorant text-dorado text-2xl font-normal">{mxn(estimado.total)} MXN</strong>
          </p>
          <p className="mt-1 font-dm text-[11px] text-negro/45">Es una estimación{llegar?.slug === "cdmx" ? "" : " sin tu transporte"}: el precio final lo ves al elegir fecha en el carrito. Apartas con el 30 %.</p>
        </div>
      )}
    </div>
  );
}
