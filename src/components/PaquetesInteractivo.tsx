"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { Check, Moon, MapPin, ChevronLeft, ChevronRight, Info } from "lucide-react";
import { GaleriaPaquete } from "@/components/GaleriaPaquete";
import { PatronDestinos } from "@/components/PatronDestinos";
import { PaqueteFormCta } from "@/components/PaqueteFormCta";
import { galeriaPaquete, precioVisible, type Paquete } from "@/lib/paquetes";
import { ahorroPaquete } from "@/lib/ahorroPaquete";
import { useLocale } from "@/lib/i18n/useLocale";
import { getPaquetesInteractivoUI } from "@/lib/i18n/paquetes.en";

export type { Paquete };

const mxn = (n: number) => `$${n.toLocaleString("es-MX")}`;

/**
 * El nombre del recorrido, corto, para la lista de la tarjeta.
 *
 * En el catálogo los tours vienen con su nombre completo y su descripción
 * pegada: "Cascadas del Meco — Meco, Mirador Panorámico y El Gran Salto
 * (Día 1)". Puesto así, cada renglón ocupaba dos líneas y medias y comparar
 * dos paquetes era leerse dos párrafos. Aquí se queda el nombre y el día, que
 * es lo que se compara; la descripción entera vive en la ficha del paquete.
 */
function tituloCorto(tour: string): { nombre: string; dia: string } {
  const dia    = tour.match(/\((D[íi]a[^)]*|Day[^)]*)\)\s*$/)?.[1] ?? "";
  const sinDia = dia ? tour.slice(0, tour.lastIndexOf("(")).trim() : tour;
  // El guion largo separa el nombre de su descripción en el catálogo.
  const nombre = sinDia.split(/\s+[—–]\s+/)[0].trim();
  return { nombre, dia };
}

/**
 * Sistema de esquinas de esta pantalla, para no mezclar formas:
 * tarjeta `rounded-2xl` · bloques y botones dentro `rounded-lg` · etiquetas
 * que flotan sobre la foto `rounded-full`.
 */

function PaqueteCard({ p }: { p: Paquete }) {
  const { locale, lp } = useLocale();
  const t = getPaquetesInteractivoUI(locale);
  const fotos = galeriaPaquete(p);
  const ahorro = ahorroPaquete(p);

  return (
    <article
      className={`
        flex h-full flex-col overflow-hidden rounded-2xl border bg-crema/95 backdrop-blur-xl
        transition-[border-color,box-shadow,transform] duration-300
        hover:-translate-y-1 hover:border-verde-selva/60
        ${p.destacado ? "border-dorado/70" : "border-negro/10"}
      `}
      style={{
        boxShadow: p.destacado
          ? "0 1px 0 rgba(255,255,255,.9) inset, 0 20px 46px rgba(26,46,26,.20)"
          : "0 1px 0 rgba(255,255,255,.9) inset, 0 14px 34px rgba(26,46,26,.13)",
      }}
    >
      {/* Foto: una franja por recorrido, la misma pieza que usa /tours. */}
      <div className="relative h-40 flex-shrink-0 overflow-hidden">
        <GaleriaPaquete
          fotos={fotos}
          nombre={p.nombre}
          etiquetaAnterior={t.fotoAnterior}
          etiquetaSiguiente={t.fotoSiguiente}
        />
        {/* Velo sólo abajo: la etiqueta de las noches va sobre la foto y sin
            él se pierde contra cualquier cascada clara. Se deja pasar el clic
            para no tapar los botones de la galería. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-20 bg-gradient-to-t from-negro/85 to-transparent" />
        <span className="absolute bottom-3 left-3 z-20 flex items-center gap-1.5 rounded-full bg-negro/70 px-2.5 py-1 font-dm text-[9px] tracking-[1px] text-crema/90 backdrop-blur-sm">
          <Moon className="h-3 w-3" aria-hidden="true" /> {p.duracion}
        </span>
        {p.badge && (
          <span className="absolute right-3 top-3 z-20 rounded-full bg-dorado px-3 py-1.5 font-dm text-[9px] font-bold uppercase tracking-[1.5px] text-negro">
            {p.badge}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col px-5 pb-5 pt-4">
        <h2 className="font-cormorant text-[26px] font-light leading-tight text-negro">{p.nombre}</h2>
        <p className="mt-0.5 font-dm text-xs text-negro/65">{p.subtitulo}</p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {p.perfiles.map((chip) => (
            <span
              key={chip}
              className="rounded-full border border-verde-selva/35 bg-verde-selva/10 px-2.5 py-1 font-dm text-[9px] font-medium tracking-[0.5px] text-verde-selva"
            >
              {chip}
            </span>
          ))}
        </div>

        {/* El precio y, sólo cuando es cierto, lo que se ahorra. */}
        <div className="mt-4 rounded-lg border border-negro/10 bg-white/70 px-4 py-3">
          <div className="flex items-baseline gap-2">
            <span className="font-cormorant text-[34px] leading-none text-terracota">
              {mxn(precioVisible(p))}
            </span>
            <span className="font-dm text-[10px] text-negro/60">MXN {p.precioLabel}</span>
          </div>
          {ahorro && (
            <div className="mt-2.5 border-t border-negro/10 pt-2.5">
              <p className="font-dm text-[11px] font-semibold text-verde-selva">
                {t.ahorroBadge(mxn(ahorro.ahorro))}
              </p>
              <p className="mt-0.5 font-dm text-[10px] text-negro/55">
                {t.ahorroDetalle(`${mxn(ahorro.suelto)} MXN`)}
              </p>
            </div>
          )}
        </div>

        {p.tours.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 flex items-center gap-1.5 font-dm text-[9px] uppercase tracking-[2px] text-negro/55">
              <MapPin className="h-3 w-3" aria-hidden="true" /> {t.toursIncluidos}
            </p>
            <ul className="space-y-1.5">
              {p.tours.map((tour) => {
                const { nombre, dia } = tituloCorto(tour);
                return (
                  <li key={tour} className="flex items-start gap-2 font-dm text-[11px] leading-snug text-negro/80">
                    <Check className="mt-0.5 h-3 w-3 flex-shrink-0 text-verde-selva" aria-hidden="true" />
                    <span>
                      {nombre}
                      {dia && <span className="text-negro/45"> · {dia}</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <p className="mt-4 flex items-start gap-2 rounded-lg bg-negro/[0.04] px-3 py-2 font-dm text-[10px] leading-snug text-negro/70">
          <Info className="mt-0.5 h-3 w-3 flex-shrink-0 text-negro/40" aria-hidden="true" />
          {p.urgencia}
        </p>

        {/* Los dos caminos, en su orden: primero mirar, luego preguntar. */}
        <div className="mt-auto pt-5">
          <Link
            href={lp(`/paquetes/${p.slug}`)}
            className="mb-2.5 flex w-full items-center justify-center rounded-lg border border-verde-selva/50 py-3 font-dm text-[10px] uppercase tracking-[2px] text-verde-selva transition-[background-color,border-color,transform] duration-200 hover:border-verde-selva hover:bg-verde-selva/10 active:scale-[0.98]"
          >
            {t.verDiaPorDia}
          </Link>
          <PaqueteFormCta packageName={p.nombre} price={p.precio} destacado={p.destacado} compacto />
          <p className="mt-2.5 text-center font-dm text-[9px] leading-snug text-negro/55">
            {t.reservaFlexible}
          </p>
        </div>
      </div>
    </article>
  );
}

// ── Catálogo ─────────────────────────────────────────────────────────────

/**
 * Los paquetes en UNA fila que se desliza.
 *
 * Antes era una rejilla de dos columnas donde el quinto paquete se estiraba a
 * lo ancho para no dejar media fila vacía: tres formas de tarjeta distintas
 * para cinco productos que se comparan entre sí. En una sola fila todas las
 * tarjetas miden lo mismo y la comparación es directa; además la fila dice por
 * sí sola que hay más a la derecha.
 */
export function PaquetesInteractivo({ paquetes }: { paquetes: Paquete[] }) {
  const { locale } = useLocale();
  const t = getPaquetesInteractivoUI(locale);
  const pistaRef = useRef<HTMLDivElement>(null);
  const [puedeIzq, setPuedeIzq] = useState(false);
  const [puedeDer, setPuedeDer] = useState(false);

  const medir = useCallback(() => {
    const el = pistaRef.current;
    if (!el) return;
    // 4 px de holgura: los navegadores redondean el scroll y sin margen la
    // flecha derecha se quedaba encendida al final del recorrido.
    setPuedeIzq(el.scrollLeft > 4);
    setPuedeDer(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    medir();
    const el = pistaRef.current;
    if (!el) return;
    const obs = new ResizeObserver(medir);
    obs.observe(el);
    return () => obs.disconnect();
  }, [medir]);

  function mover(dir: -1 | 1) {
    const el = pistaRef.current;
    if (!el) return;
    const tarjeta = el.querySelector<HTMLElement>("[data-tarjeta]");
    const paso = tarjeta ? tarjeta.offsetWidth + 20 : el.clientWidth * 0.8;
    const suave = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * paso, behavior: suave ? "smooth" : "auto" });
  }

  const flechaCls =
    "hidden md:flex h-10 w-10 items-center justify-center rounded-full border border-negro/15 bg-crema/90 " +
    "text-negro/70 backdrop-blur transition-[opacity,background-color,transform] duration-200 " +
    "hover:bg-crema hover:text-negro active:scale-95 disabled:pointer-events-none disabled:opacity-0";

  return (
    <section
      id="catalogo"
      className="relative scroll-mt-24 overflow-hidden border-y border-negro/10 py-14"
      style={{ background: "linear-gradient(180deg, #f6f1e2, #e9dfc6)" }}
    >
      <PatronDestinos />

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="mb-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => mover(-1)}
            disabled={!puedeIzq}
            aria-label={t.catalogoAnterior}
            className={flechaCls}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => mover(1)}
            disabled={!puedeDer}
            aria-label={t.catalogoSiguiente}
            className={flechaCls}
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* La pista sangra hasta el borde de la pantalla para que la tarjeta
          siguiente asome: es lo que le dice al ojo que la fila continúa.

          🔴 `scroll-pl-*` TIENE que repetir el mismo valor que `px-*`. Sin él,
          el imán del scroll alinea la primera tarjeta con el borde del área
          visible y se come el margen izquierdo: la fila nace desplazada y la
          primera tarjeta aparece cortada contra el canto de la pantalla. */}
      <div
        ref={pistaRef}
        onScroll={medir}
        tabIndex={0}
        className="scrollbar-none flex snap-x snap-mandatory gap-5 overflow-x-auto px-6 pb-2 scroll-pl-6 md:px-[max(1.5rem,calc((100vw_-_72rem)/2))] md:scroll-pl-[max(1.5rem,calc((100vw_-_72rem)/2))]"
      >
        {paquetes.map((p) => (
          <div
            key={p.id}
            data-tarjeta
            className="w-[86vw] max-w-[360px] flex-shrink-0 snap-start sm:w-[340px]"
          >
            <PaqueteCard p={p} />
          </div>
        ))}
        {/* Cierra la fila con el mismo aire que la abre. */}
        <div className="w-px flex-shrink-0" aria-hidden="true" />
      </div>
    </section>
  );
}
