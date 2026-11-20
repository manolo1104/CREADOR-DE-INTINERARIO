"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BedDouble, MapPin } from "lucide-react";
import { TRAMOS_DIAS, type ItemTienda } from "@/lib/paquetesTienda";
import { textosTienda } from "@/lib/i18n/paquetesTiendaTextos";
import { trackTourEvent } from "@/lib/tourTracker";
import { formatoMXN } from "@/lib/i18n/paquetes.en";
import { waLink } from "@/lib/whatsapp";
import type { Locale } from "@/lib/i18n/config";

/**
 * Sección 4: los viajes de varios días ordenados por cuántos días tiene la
 * gente (2 · 3 · 4 · 5+). Mismo selector segmentado que «Si tienes 1, 2 o 3
 * días» de /destinos (`.indicador-segmentado`). El «desde» solo sale cuando hay
 * precio real; un tramo sin viaje invita a armarlo a la medida.
 */
export function PorDuracion({ items, locale }: { items: ItemTienda[]; locale: Locale }) {
  const t = textosTienda(locale);
  // Abre en 4 días: es donde hay dos paquetes para comparar.
  const [i, setI] = useState(2);
  const tramo = TRAMOS_DIAS[i];
  const viajes = items.filter((x) => x.tipo !== "tour" && x.dias >= tramo.min && x.dias <= tramo.max);
  const n = TRAMOS_DIAS.length;

  return (
    <div>
      <div
        role="tablist"
        aria-label={t.durAria}
        className="relative grid w-full rounded-xl border border-white/15 bg-negro/60 p-1 sm:inline-grid sm:w-auto"
        style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
      >
        <span
          aria-hidden="true"
          className="indicador-segmentado absolute inset-y-1 left-1 rounded-lg bg-verde-selva"
          style={{ width: `calc((100% - 0.5rem) / ${n})`, transform: `translateX(${i * 100}%)` }}
        />
        {TRAMOS_DIAS.map((tr, k) => (
          <button
            key={tr.id}
            role="tab"
            type="button"
            aria-selected={k === i}
            onClick={() => setI(k)}
            className={`tactil relative min-h-[44px] px-3 font-dm text-sm sm:px-6 ${k === i ? "text-crema" : "text-crema/55 hover:text-crema"}`}
          >
            {t.durTabs[tr.id]}
          </button>
        ))}
      </div>

      <div role="tabpanel" className="mt-8 space-y-4">
        {viajes.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-negro/40 p-6">
            <p className="font-dm text-sm text-crema/70">{t.durVacio}</p>
            <a
              href={waLink(t.persWa)}
              target="_blank"
              rel="noopener noreferrer"
              className="tactil mt-4 inline-flex min-h-[44px] items-center rounded-xl border border-white/20 px-5 font-dm text-[13px] text-crema hover:bg-white/5"
            >
              {t.persCta2}
            </a>
          </div>
        )}
        {viajes.map((v, k) => (
          <article
            key={v.id}
            data-seccion={`por-duracion:${v.slug}`}
            className="grid gap-4 overflow-hidden rounded-2xl border border-white/10 bg-negro/40 md:grid-cols-[220px_1fr_auto] md:items-center"
          >
            <div className="relative aspect-[16/9] md:aspect-auto md:h-full md:min-h-[170px]">
              <Image src={v.foto} alt={v.fotoAlt} fill sizes="(max-width: 768px) 100vw, 220px" className="object-cover" />
            </div>
            <div className="px-5 md:px-0 md:py-5">
              <p className="font-cormorant text-[22px] leading-none text-dorado">{v.duracion}</p>
              <h3 className="mt-1.5 font-cormorant text-[28px] font-light leading-tight text-crema">{v.nombre}</h3>
              <p className="mt-3 flex items-start gap-2 font-dm text-[13px] text-crema/70">
                <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-agua" aria-hidden="true" />
                <span><span className="text-crema/45">{t.durDestinos}: </span>{v.actividades.join(" · ")}</span>
              </p>
              {v.incluyeHotel && (
                <p className="mt-1.5 flex items-start gap-2 font-dm text-[13px] text-crema/70">
                  <BedDouble className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-agua" aria-hidden="true" />
                  <span><span className="text-crema/45">{t.durHotel}: </span>{v.tipo === "paquete" ? t.durHotelSi : t.incluyeHotel}</span>
                </p>
              )}
            </div>
            <div className="flex flex-col gap-3 px-5 pb-5 md:w-[220px] md:px-5 md:py-5">
              {v.precio !== null && (
                <p>
                  <span className="block font-dm text-[11px] uppercase tracking-[1.5px] text-crema/45">{t.desde}</span>
                  <span className="whitespace-nowrap font-cormorant text-[30px] leading-none text-dorado">{formatoMXN(v.precio, locale)}</span>
                  <span className="whitespace-nowrap font-dm text-[12px] text-crema/55"> MXN {v.unidad}</span>
                </p>
              )}
              <Link
                href={v.href}
                onClick={() => trackTourEvent("SELECT_PACKAGE", { slug: v.slug, tipo: v.tipo, seccion: "por-duracion", posicion: k + 1 })}
                className="tactil inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-dorado/50 px-4 font-dm text-[12px] uppercase tracking-[1.5px] text-crema hover:bg-dorado hover:text-negro"
              >
                {v.tipo === "viaje" ? t.verViaje : t.verPaquete}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
