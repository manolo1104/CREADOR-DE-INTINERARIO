"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { MapPin } from "lucide-react";
import type { ParadaMapa } from "@/lib/fichaPaquete";
import { trackTourEvent } from "@/lib/tourTracker";
import type { Locale } from "@/lib/i18n/config";
import { textosFicha } from "@/lib/i18n/fichaPaqueteTextos";

const MapaRutaLeaflet = dynamic(() => import("./MapaRutaLeaflet"), {
  ssr: false,
  loading: () => <div className="h-[460px] animate-pulse bg-verde-profundo/40" />,
});

/**
 * Mapa + lista de paradas. Leaflet NO se descarga hasta que el mapa está a
 * punto de verse (IntersectionObserver con 300 px de margen): no pesa en el LCP
 * de la ficha. La lista va siempre: es la versión accesible y la del celular.
 */
export function PackageRouteMap({
  paradas, slug, locale,
}: {
  paradas: ParadaMapa[];
  slug: string;
  locale: Locale;
}) {
  const tf = textosFicha(locale);
  const textos = { nota: tf.mapaNota, lista: tf.mapaLista, dia: tf.diaN, ver: tf.verDestino };
  const caja = useRef<HTMLDivElement>(null);
  const [cargar, setCargar] = useState(false);
  const usado = useRef(false);

  useEffect(() => {
    const el = caja.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setCargar(true); obs.disconnect(); }
    }, { rootMargin: "300px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const interaccion = (id: string) => {
    if (usado.current) return; // una vez por visita: interesa SI lo usan, no cuántos clics
    usado.current = true;
    trackTourEvent("ROUTE_MAP_INTERACTION", { slug, parada: id });
  };

  const ruta = paradas.filter((p) => !p.base);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div>
        <div ref={caja} className="overflow-hidden rounded-2xl border border-white/10">
          {cargar ? (
            <MapaRutaLeaflet paradas={paradas} diaTexto={textos.dia} verTexto={textos.ver} onInteraccion={interaccion} />
          ) : (
            <div className="h-[460px] bg-verde-profundo/40" />
          )}
        </div>
        <p className="mt-3 font-dm text-[12px] leading-relaxed text-crema/50">{textos.nota}</p>
      </div>

      <div>
        <p className="font-dm text-[12px] uppercase tracking-[2px] text-crema/45">{textos.lista}</p>
        <ol className="mt-3 space-y-2">
          {ruta.map((p, k) => (
            <li key={p.id}>
              <Link
                href={p.href ?? "#"}
                onClick={() => interaccion(p.id)}
                className="tactil group flex items-center gap-3 rounded-xl border border-white/10 bg-negro/40 p-2 pr-3 hover:border-white/25"
              >
                <span className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg">
                  {p.foto ? <Image src={p.foto} alt="" fill sizes="48px" className="object-cover" /> : <MapPin className="m-3 h-6 w-6 text-agua" />}
                </span>
                <span className="min-w-0">
                  <span className="block font-dm text-[11px] uppercase tracking-[1.5px] text-agua">{k + 1} · {textos.dia(p.dia)}</span>
                  <span className="block truncate font-dm text-sm text-crema/90 group-hover:text-crema">{p.nombre}</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
