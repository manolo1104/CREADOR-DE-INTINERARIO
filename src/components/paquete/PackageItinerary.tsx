"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BedDouble, ChevronDown, Clock, MapPin, UtensilsCrossed, Car } from "lucide-react";
import type { DiaFicha } from "@/lib/fichaPaquete";
import { textosFicha } from "@/lib/i18n/fichaPaqueteTextos";
import type { Locale } from "@/lib/i18n/config";
import { trackTourEvent } from "@/lib/tourTracker";


/**
 * Itinerario día por día (20 nov 2026). Cada jornada se entiende SIN abrirla:
 * foto, título, qué se hace, duración, recogida, comidas y dónde se duerme.
 * Lo que se despliega es el plan hora por hora del recorrido (`tour.itinerario`).
 * Funciona con cualquier número de días: sale de `ficha.diasFicha`.
 */
export function PackageItinerary({ dias, slug, locale }: { dias: DiaFicha[]; slug: string; locale: Locale }) {
  const t = textosFicha(locale);
  const [abiertos, setAbiertos] = useState<Set<number>>(new Set());
  const conHoras = dias.filter((d) => d.momentos.length > 0).map((d) => d.dia);
  const todos = conHoras.length > 0 && conHoras.every((d) => abiertos.has(d));

  const alternar = (dia: number) => {
    setAbiertos((s) => {
      const n = new Set(s);
      if (n.has(dia)) n.delete(dia);
      else { n.add(dia); trackTourEvent("ITINERARY_DAY_EXPAND", { slug, dia }); }
      return n;
    });
  };

  const dos = (n: number) => String(n).padStart(2, "0");

  return (
    <div>
      {/* Navegación entre días + abrir todo */}
      <div className="scrollbar-none sticky top-[calc(var(--navbar-offset,65px)+8px)] z-20 -mx-4 mb-8 flex items-center gap-2 overflow-x-auto bg-negro/90 px-4 py-3 backdrop-blur-md sm:mx-0 sm:flex-wrap sm:overflow-visible sm:rounded-xl sm:border sm:border-white/10">
        {dias.map((d) => (
          <a key={d.dia} href={`#dia-${d.dia}`} className="tactil inline-flex min-h-[40px] flex-shrink-0 items-center whitespace-nowrap rounded-full border border-white/15 px-4 font-dm text-[13px] text-crema/75 hover:border-agua hover:text-crema">
            {t.diaN(d.dia)}
          </a>
        ))}
        {conHoras.length > 0 && (
          <button
            type="button"
            onClick={() => setAbiertos(todos ? new Set() : new Set(conHoras))}
            className="tactil ml-auto inline-flex min-h-[40px] flex-shrink-0 items-center gap-1.5 whitespace-nowrap font-dm text-[13px] text-agua hover:text-crema"
          >
            {todos ? t.itiCerrarTodo : t.itiAbrirTodo}
          </button>
        )}
      </div>

      <ol className="relative space-y-12 border-l border-white/15 pl-6 sm:pl-10">
        {dias.map((d) => {
          const abierto = abiertos.has(d.dia);
          const etiqueta = d.tipo === "salida" ? t.salida : d.dia === 1 ? t.llegada : t.recorrido;
          return (
            <li key={d.dia} id={`dia-${d.dia}`} className="relative scroll-mt-40">
              <span aria-hidden="true" className="absolute -left-[31px] top-1 flex h-3.5 w-3.5 rounded-full border-2 border-negro bg-agua sm:-left-[47px]" />
              <p className="font-dm text-[12px] uppercase tracking-[3px] text-agua">
                {t.diaN(d.dia)} · {etiqueta}
              </p>
              <h3 className="mt-2 font-cormorant text-[30px] font-light leading-[1.05] text-crema sm:text-[38px]">
                <span className="mr-3 text-dorado">{dos(d.dia)}</span>{d.titulo}
              </h3>

              <div className="mt-5 grid gap-6">
                {d.fotos.length > 0 && (
                  <div className="grid grid-cols-3 content-start gap-2 sm:grid-cols-[2fr_1fr] sm:grid-rows-3">
                    <div className="relative col-span-3 aspect-[16/10] overflow-hidden rounded-2xl sm:col-span-1 sm:row-span-3 sm:aspect-auto sm:min-h-[300px]">
                      <Image src={d.fotos[0].src} alt={d.fotos[0].alt} fill sizes="(max-width: 1024px) 100vw, 520px" className="zoom-foto object-cover" />
                    </div>
                    {d.fotos.slice(1, 4).map((f) => (
                      <div key={f.src} className="relative aspect-square overflow-hidden rounded-xl sm:aspect-auto">
                        <Image src={f.src} alt={f.alt} fill sizes="(max-width: 640px) 33vw, 220px" className="object-cover" />
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <p className="font-dm text-[15px] leading-relaxed text-crema/75">{d.descripcion}</p>

                  {d.lugares.length > 0 && (
                    <div className="mt-4">
                      <p className="font-dm text-[11px] uppercase tracking-[2px] text-crema/45">{t.lugaresDia}</p>
                      <ul className="mt-2 flex flex-wrap gap-1.5">
                        {d.lugares.map((l) => (
                          <li key={l} className="inline-flex items-center gap-1 rounded-full border border-white/12 px-2.5 py-1 font-dm text-[12px] text-crema/80">
                            <MapPin className="h-3 w-3 text-agua" aria-hidden="true" />{l}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <dl className="mt-5 grid grid-cols-1 gap-3 border-t border-white/10 pt-4 font-dm text-[13px] sm:grid-cols-2">
                    {d.tour && (
                      <>
                        <Dato Icono={Clock} titulo={t.duracion} valor={`${d.tour.nombre}${d.tour.ruta ? ` · ${d.tour.ruta}` : ""} · ${d.tour.duracion}`} />
                        <Dato Icono={Car} titulo={t.recogida} valor={d.tour.recogida} />
                      </>
                    )}
                    <Dato Icono={UtensilsCrossed} titulo={t.comidas} valor={d.comidas.length ? d.comidas.join(" · ") : t.sinComidas} />
                    <Dato Icono={BedDouble} titulo={t.noche} valor={d.noche ?? t.ultimoDia} />
                  </dl>

                  {d.tour && (
                    <Link href={d.tour.href} className="mt-4 inline-flex min-h-[44px] items-center gap-1.5 font-dm text-[13px] text-agua hover:text-crema">
                      {t.verTour}: {d.tour.nombre} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  )}
                </div>
              </div>

              {d.momentos.length > 0 && (
                <div className="mt-4">
                  <button
                    type="button"
                    aria-expanded={abierto}
                    aria-controls={`horas-${d.dia}`}
                    onClick={() => alternar(d.dia)}
                    className="tactil inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-white/15 px-4 font-dm text-[13px] text-crema hover:border-agua"
                  >
                    {abierto ? t.itiOcultarHoras : t.itiVerHoras}
                    <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${abierto ? "rotate-180" : ""}`} aria-hidden="true" />
                  </button>
                  {abierto && (
                    <div id={`horas-${d.dia}`} className="desplegable mt-4 rounded-2xl border border-white/10 bg-verde-profundo/25 p-5">
                      <ol className="space-y-4">
                        {d.momentos.map((m) => (
                          <li key={`${m.hora}-${m.momento}`} className="grid grid-cols-[88px_1fr] gap-3">
                            <span className="font-cormorant text-[20px] leading-tight text-dorado">{m.hora}</span>
                            <span>
                              <span className="block font-dm text-sm font-medium text-crema">{m.momento}</span>
                              <span className="mt-0.5 block font-dm text-[13px] leading-relaxed text-crema/65">{m.texto}</span>
                            </span>
                          </li>
                        ))}
                      </ol>
                      <p className="mt-4 font-dm text-[12px] text-crema/45">{t.horarioNota}</p>
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Dato({ Icono, titulo, valor }: { Icono: typeof Clock; titulo: string; valor: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icono className="mt-0.5 h-4 w-4 flex-shrink-0 text-agua" aria-hidden="true" />
      <div>
        <dt className="text-[11px] uppercase tracking-[1.5px] text-crema/45">{titulo}</dt>
        <dd className="mt-0.5 text-crema/85">{valor}</dd>
      </div>
    </div>
  );
}
