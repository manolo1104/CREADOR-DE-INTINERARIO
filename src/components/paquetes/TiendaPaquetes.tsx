"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import { CATEGORIAS_TIENDA, type CategoriaTienda, type ItemTienda } from "@/lib/paquetesTienda";
import { textosTienda } from "@/lib/i18n/paquetesTiendaTextos";
import { trackTourEvent } from "@/lib/tourTracker";
import type { Locale } from "@/lib/i18n/config";
import { TarjetaItem } from "./TarjetaItem";

/**
 * Secciones 2 y 3 de /paquetes: «Encuentra tu experiencia» (cinco mosaicos que
 * filtran sin recargar) y los productos.
 *
 * Sin filtro se ven los viajes de varios días (los paquetes y el viaje CDMX),
 * con el destacado en grande. Con filtro entran también los tours de un día de
 * esa categoría, en su propia rejilla compacta. El filtro vive en `?tipo=` para
 * que se pueda compartir la liga, y se escribe con `replaceState`: no recarga
 * ni ensucia el historial.
 */
export function TiendaPaquetes({
  items,
  locale,
  urlComparar,
  hrefTours,
}: {
  items: ItemTienda[];
  locale: Locale;
  urlComparar: string;
  hrefTours: string;
}) {
  const t = textosTienda(locale);
  const [cat, setCat] = useState<CategoriaTienda | null>(null);
  const resultadosRef = useRef<HTMLDivElement>(null);

  // El filtro de la liga compartida (?tipo=aventura), una vez al montar.
  useEffect(() => {
    const tipo = new URLSearchParams(window.location.search).get("tipo");
    if (tipo && (CATEGORIAS_TIENDA as string[]).includes(tipo)) setCat(tipo as CategoriaTienda);
  }, []);

  function elegir(c: CategoriaTienda | null, desdeMosaico = false) {
    setCat(c);
    const url = new URL(window.location.href);
    if (c) url.searchParams.set("tipo", c);
    else url.searchParams.delete("tipo");
    window.history.replaceState(null, "", url.toString());
    if (c) trackTourEvent("SELECT_PACKAGE_CATEGORY", { categoria: c, origen: desdeMosaico ? "mosaico" : "chip" });
    // Desde el mosaico se baja a los resultados; desde los chips ya se está ahí.
    if (desdeMosaico) {
      const suave = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      resultadosRef.current?.scrollIntoView({ behavior: suave ? "smooth" : "auto", block: "start" });
    }
  }

  const viajes = useMemo(
    () => items.filter((i) => i.tipo !== "tour" && (!cat || i.categorias.includes(cat))),
    [items, cat],
  );
  const tours = useMemo(
    () => (cat ? items.filter((i) => i.tipo === "tour" && i.categorias.includes(cat)) : []),
    [items, cat],
  );
  const total = viajes.length + tours.length;

  // La categoría que se lee en la tarjeta: la elegida o la primera del producto.
  const tipoDe = (i: ItemTienda) => t.categorias[cat && i.categorias.includes(cat) ? cat : i.categorias[0]].nombre;
  const textos = {
    verPaquete: t.verPaquete, verTour: t.verTour, verViaje: t.verViaje, reservar: t.reservar,
    whatsapp: t.whatsapp, incluyeHotel: t.incluyeHotel, sinPrecio: t.sinPrecio,
  };

  const H2 = "font-cormorant font-light leading-[1.05] text-crema";
  const chip = (activo: boolean) =>
    `tactil inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap rounded-full border px-4 font-dm text-[13px] ${
      activo ? "border-agua bg-agua/15 text-crema" : "border-white/15 text-crema/70 hover:border-white/35 hover:text-crema"
    }`;

  return (
    <>
      {/* ── 2 · ENCUENTRA TU EXPERIENCIA ── */}
      <section aria-labelledby="h-experiencia" className="mx-auto max-w-6xl px-4 pt-16 sm:px-6 md:pt-24">
        <p className="font-dm text-[12px] uppercase tracking-[3px] text-agua">{t.catEyebrow}</p>
        <h2 id="h-experiencia" className={`${H2} mt-3`} style={{ fontSize: "clamp(32px,4.4vw,54px)" }}>
          {t.catH2} <em className="text-dorado">{t.catH2Em}</em>
        </h2>

        <ul className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-5 md:gap-4">
          {CATEGORIAS_TIENDA.map((c, k) => {
            const info = t.categorias[c];
            const activo = cat === c;
            return (
              <li key={c} className={k === CATEGORIAS_TIENDA.length - 1 ? "col-span-2 md:col-span-1" : ""}>
                <button
                  type="button"
                  aria-pressed={activo}
                  onClick={() => elegir(activo ? null : c, !activo)}
                  className={`tactil group relative block w-full overflow-hidden rounded-2xl text-left ring-offset-2 ring-offset-negro ${
                    activo ? "ring-2 ring-agua" : ""
                  } ${k === CATEGORIAS_TIENDA.length - 1 ? "aspect-[2/1] md:aspect-[3/4]" : "aspect-[3/4]"}`}
                >
                  <Image src={info.foto} alt={info.alt} fill sizes="(max-width: 768px) 50vw, 230px" className="zoom-foto object-cover" />
                  <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-negro/90 via-negro/30 to-transparent" />
                  <span className="texto-sobre-foto absolute inset-x-0 bottom-0 p-3.5 md:p-4">
                    <span className="block font-cormorant text-[22px] leading-tight text-crema md:text-[24px]">{info.nombre}</span>
                    <span className="mt-1 block font-dm text-[12px] leading-snug text-crema/70">{info.desc}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ── 3 · PAQUETES DESTACADOS (y lo que deja el filtro) ── */}
      <section id="catalogo" aria-labelledby="h-destacados" className="mx-auto max-w-6xl scroll-mt-24 px-4 pt-16 sm:px-6 md:pt-24">
        <div ref={resultadosRef} className="scroll-mt-24">
          <p className="font-dm text-[12px] uppercase tracking-[3px] text-agua">{t.destEyebrow}</p>
          <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 id="h-destacados" className={H2} style={{ fontSize: "clamp(32px,4.4vw,54px)" }}>
                {t.destH2} <em className="text-dorado">{t.destH2Em}</em>
              </h2>
              <p className="mt-3 max-w-xl font-dm text-[15px] leading-relaxed text-crema/65">{t.destLead}</p>
            </div>
            <Link
              href={urlComparar}
              prefetch={false}
              className="inline-flex min-h-[44px] items-center gap-2 self-start font-dm text-[13px] text-crema/70 underline decoration-white/25 underline-offset-4 hover:text-crema md:self-auto"
            >
              {t.comparar}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>

          {/* Los chips: se envuelven en vez de deslizarse, sin scroll de lado. */}
          <div role="group" aria-label={t.filtroAria} className="mt-6 flex flex-wrap gap-2">
            <button type="button" aria-pressed={!cat} onClick={() => elegir(null)} className={chip(!cat)}>
              {t.todos}
            </button>
            {CATEGORIAS_TIENDA.map((c) => (
              <button key={c} type="button" aria-pressed={cat === c} onClick={() => elegir(cat === c ? null : c)} className={chip(cat === c)}>
                {t.categorias[c].nombre}
                {cat === c && <X className="h-3.5 w-3.5" aria-hidden="true" />}
              </button>
            ))}
          </div>
          <p aria-live="polite" className="mt-3 font-dm text-[12px] text-crema/45">{t.resultados(total)}</p>
        </div>

        {viajes.length > 0 && (
          <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {viajes.map((i, k) => {
              const grande = !cat && k === 0 && !!i.destacado;
              return (
                <li key={i.id} className={grande ? "sm:col-span-2" : ""}>
                  <TarjetaItem item={i} variante={grande ? "grande" : "normal"} tipoTexto={tipoDe(i)} textos={textos} locale={locale} seccion="destacados" posicion={k + 1} />
                </li>
              );
            })}
          </ul>
        )}

        {tours.length > 0 && (
          <div className="mt-12">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
              <h3 className="font-cormorant text-[28px] font-light text-crema">{t.toursDeUnDia}</h3>
              <Link href={hrefTours} className="inline-flex min-h-[44px] items-center gap-2 font-dm text-[13px] text-crema/70 underline decoration-white/25 underline-offset-4 hover:text-crema">
                {t.verTodosTours}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
            <p className="font-dm text-[14px] text-crema/55">{t.toursDeUnDiaLead}</p>
            <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {tours.map((i, k) => (
                <li key={i.id}>
                  <TarjetaItem item={i} variante="compacta" tipoTexto={tipoDe(i)} textos={textos} locale={locale} seccion="tours-de-un-dia" posicion={k + 1} />
                </li>
              ))}
            </ul>
          </div>
        )}

        {total === 0 && (
          <div className="mt-6 rounded-2xl border border-white/10 bg-verde-profundo/25 p-8 text-center">
            <p className="font-dm text-sm text-crema/70">{t.vacio}</p>
            <button type="button" onClick={() => elegir(null)} className="tactil mt-4 inline-flex min-h-[44px] items-center rounded-xl border border-white/20 px-5 font-dm text-[13px] text-crema hover:bg-white/5">
              {t.limpiar}
            </button>
          </div>
        )}
      </section>
    </>
  );
}
