"use client";

import { useState } from "react";
import Image from "next/image";
import { Images, Users } from "lucide-react";
import { GaleriaHabitacion } from "@/components/booking/GaleriaHabitacion";
import { getHabitacion, type Habitacion } from "@/lib/habitaciones";
import { trackTourEvent } from "@/lib/tourTracker";
import type { HabitacionFicha } from "@/lib/fichaPaquete";
import type { Locale } from "@/lib/i18n/config";
import { textosFicha } from "@/lib/i18n/fichaPaqueteTextos";

/**
 * Las habitaciones que ofrece el paquete, con sus fotos reales del hotel. El
 * visor es `GaleriaHabitacion`, el mismo del checkout: un solo visor de cuartos.
 */
export function RoomOptions({
  habitaciones, slug, suplemento, locale,
}: {
  habitaciones: HabitacionFicha[];
  slug: string;
  suplemento: string | null;
  locale: Locale;
}) {
  const tf = textosFicha(locale);
  const t = { hasta: tf.hotelHasta, incluida: tf.hotelIncluida, suplemento: tf.hotelSuplemento, verFotos: tf.hotelVerFotos };
  const [abierta, setAbierta] = useState<Habitacion | null>(null);

  return (
    <>
      <ul className="grid gap-4 sm:grid-cols-2">
        {habitaciones.map((h) => (
          <li key={h.id} className="overflow-hidden rounded-2xl border border-white/10 bg-negro/40">
            <button
              type="button"
              onClick={() => {
                const hab = getHabitacion(h.id);
                if (!hab) return;
                setAbierta(hab);
                trackTourEvent("ACCOMMODATION_VIEW", { slug, habitacion: h.id });
              }}
              className="group relative block aspect-[4/3] w-full overflow-hidden"
            >
              <Image src={h.imagen} alt={h.nombre} fill sizes="(max-width: 640px) 100vw, 300px" className="zoom-foto object-cover" />
              <span className="absolute bottom-2 right-2 inline-flex items-center gap-1.5 rounded-full bg-negro/70 px-2.5 py-1 font-dm text-[11px] text-crema backdrop-blur-sm">
                <Images className="h-3.5 w-3.5" aria-hidden="true" /> {t.verFotos} · {h.galeria.length}
              </span>
            </button>
            <div className="p-4">
              <h4 className="font-cormorant text-[22px] leading-tight text-crema">{h.nombre}</h4>
              <p className="mt-0.5 font-dm text-[12px] text-agua">{h.vista}</p>
              <p className="mt-2 font-dm text-[13px] leading-relaxed text-crema/65">{h.descripcion}</p>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {h.caracteristicas.slice(0, 4).map((c) => (
                  <li key={c} className="rounded-full border border-white/12 px-2 py-0.5 font-dm text-[11px] text-crema/70">{c}</li>
                ))}
              </ul>
              <p className="mt-3 flex items-center justify-between gap-2 border-t border-white/10 pt-3 font-dm text-[12px]">
                <span className="inline-flex items-center gap-1.5 text-crema/60"><Users className="h-3.5 w-3.5" aria-hidden="true" />{t.hasta(h.maxHuespedes)}</span>
                <span className={h.vistaMontana ? "text-dorado" : "text-crema/60"}>
                  {h.vistaMontana && suplemento ? t.suplemento(suplemento) : t.incluida}
                </span>
              </p>
            </div>
          </li>
        ))}
      </ul>
      <GaleriaHabitacion habitacion={abierta} abierta={!!abierta} onCerrar={() => setAbierta(null)} />
    </>
  );
}
