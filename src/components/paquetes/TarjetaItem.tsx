"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BedDouble, Check, Clock, MapPin } from "lucide-react";
import type { ItemTienda } from "@/lib/paquetesTienda";
import { waLink } from "@/lib/whatsapp";
import { trackTourEvent } from "@/lib/tourTracker";
import { formatoMXN } from "@/lib/i18n/paquetes.en";
import type { Locale } from "@/lib/i18n/config";

/**
 * La tarjeta de la tienda de /paquetes (20 nov 2026). Una pieza para los tres
 * productos (paquete, viaje CDMX, tour de un día) en tres tamaños:
 *
 *  · "grande": el paquete destacado, foto a la izquierda en escritorio.
 *  · "normal": los demás viajes de varios días.
 *  · "compacta": los tours de un día que entran al filtrar.
 *
 * Toda la tarjeta es clicable (el título estira su enlace sobre ella) y los
 * botones van por encima con `z-10`. El WhatsApp es un enlace normal: lo mide
 * solo `WhatsAppClickTracker`, y el `data-seccion` dice de qué tarjeta vino.
 */
export interface TextosTarjeta {
  verPaquete: string;
  verTour: string;
  verViaje: string;
  reservar: string;
  whatsapp: string;
  incluyeHotel: string;
  sinPrecio: string;
}

export function TarjetaItem({
  item,
  variante = "normal",
  tipoTexto,
  textos,
  locale,
  seccion,
  posicion,
}: {
  item: ItemTienda;
  variante?: "grande" | "normal" | "compacta";
  /** La categoría principal, ya traducida («Naturaleza y cultura»). */
  tipoTexto: string;
  textos: TextosTarjeta;
  locale: Locale;
  seccion: string;
  posicion: number;
}) {
  const grande = variante === "grande";
  const compacta = variante === "compacta";
  const ver = item.tipo === "paquete" ? textos.verPaquete : item.tipo === "viaje" ? textos.verViaje : textos.verTour;
  const datos = { slug: item.slug, tipo: item.tipo, seccion, posicion };
  const elegir = () => trackTourEvent("SELECT_PACKAGE", datos);
  const conReserva = !!item.reservarHref && !compacta;

  return (
    <article
      data-seccion={`${seccion}:${item.slug}`}
      className={`group relative flex h-full overflow-hidden rounded-2xl border bg-verde-profundo/25 transition-[border-color,transform] duration-300 ease-smooth-out hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 ${
        item.destacado ? "border-dorado/40" : "border-white/10 hover:border-white/25"
      } ${grande ? "flex-col lg:flex-row" : "flex-col"}`}
    >
      {/* ── Foto ── */}
      <div
        className={`relative flex-shrink-0 overflow-hidden ${
          grande ? "aspect-[4/3] lg:aspect-auto lg:w-[55%]" : compacta ? "aspect-[16/10]" : "aspect-[4/3]"
        }`}
      >
        <Image
          src={item.foto}
          alt={item.fotoAlt}
          fill
          sizes={grande ? "(max-width: 1024px) 100vw, 620px" : compacta ? "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 300px" : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"}
          className="zoom-foto object-cover"
        />
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-negro/80 to-transparent" />
        {item.badge && (
          <span className="absolute left-3 top-3 rounded-full bg-dorado px-3 py-1 font-dm text-[10px] font-semibold uppercase tracking-[1.5px] text-negro">
            {item.badge}
          </span>
        )}
        <span className="texto-sobre-foto absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-negro/60 px-2.5 py-1 font-dm text-[11px] text-crema backdrop-blur-sm">
          <Clock className="h-3 w-3" aria-hidden="true" />
          {item.duracion}
        </span>
      </div>

      {/* ── Cuerpo ── */}
      <div className={`flex flex-1 flex-col ${compacta ? "p-4" : grande ? "p-6 lg:p-8" : "p-5"}`}>
        <p className="font-dm text-[11px] uppercase tracking-[2px] text-agua">
          {tipoTexto}
          {item.lugar && <span className="text-crema/45"> · {item.lugar}</span>}
        </p>

        <h3 className={`mt-2 font-cormorant font-light leading-[1.05] text-crema ${grande ? "text-[34px] lg:text-[44px]" : compacta ? "text-[24px]" : "text-[30px]"}`}>
          {/* El enlace se estira sobre toda la tarjeta: foto y texto llevan a la ficha. */}
          <Link href={item.href} onClick={elegir} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
            {item.nombre}
          </Link>
        </h3>

        <p className={`mt-2 font-dm text-crema/65 leading-relaxed ${compacta ? "text-[13px] line-clamp-2" : "text-sm line-clamp-3"}`}>
          {item.resumen}
        </p>

        {!compacta && item.actividades.length > 0 && (
          <ul className="mt-4 space-y-1.5">
            {item.actividades.map((a) => (
              <li key={a} className="flex items-start gap-2 font-dm text-[13px] text-crema/80">
                <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-agua" aria-hidden="true" />
                {a}
              </li>
            ))}
          </ul>
        )}

        <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 font-dm text-[12px] text-crema/55">
          <li className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-crema/40" aria-hidden="true" />
            {item.modalidad}
          </li>
          {item.incluyeHotel && (
            <li className="inline-flex items-center gap-1.5">
              <BedDouble className="h-3.5 w-3.5 text-crema/40" aria-hidden="true" />
              {textos.incluyeHotel}
            </li>
          )}
        </ul>

        {/* ── Precio arriba, botones abajo: apilados para que nada se tape. ── */}
        <div className="mt-auto pt-5">
          <div className="border-t border-white/10 pt-4">
            {item.precio !== null ? (
              <p className="flex flex-wrap items-baseline gap-x-2">
                <span className={`whitespace-nowrap font-cormorant leading-none text-dorado ${compacta ? "text-[26px]" : "text-[34px]"}`}>
                  {formatoMXN(item.precio, locale)}
                </span>
                <span className="whitespace-nowrap font-dm text-[12px] text-crema/55">MXN {item.unidad}</span>
              </p>
            ) : (
              <p className="font-dm text-[13px] text-crema/60">{textos.sinPrecio}</p>
            )}
            {item.notaPrecio && <p className="mt-1 font-dm text-[11px] text-crema/45">{item.notaPrecio}</p>}
          </div>

          {/* Jerarquía: «Ver» manda (dorado, a todo lo ancho). Debajo, la reserva
              directa y WhatsApp. Sin «Reservar» (viaje y tours) van en una fila. */}
          <div className="relative z-10 mt-4 grid gap-2">
            <div className="flex gap-2">
              <Link
                href={item.href}
                onClick={elegir}
                className="tactil group/b inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-dorado px-4 font-dm text-[12px] font-medium uppercase tracking-[1.5px] text-negro hover:bg-crema"
              >
                {ver}
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/b:translate-x-0.5" aria-hidden="true" />
              </Link>
              {!conReserva && <BotonWa item={item} etiqueta={textos.whatsapp} />}
            </div>
            {conReserva && (
              <div className="flex gap-2">
                <Link
                  href={item.reservarHref!}
                  onClick={() => trackTourEvent("CLICK_BOOKING", datos)}
                  className="tactil inline-flex min-h-[48px] flex-1 items-center justify-center whitespace-nowrap rounded-xl border border-white/20 px-4 font-dm text-[12px] uppercase tracking-[1.5px] text-crema hover:border-white/40 hover:bg-white/5"
                >
                  {textos.reservar}
                </Link>
                <BotonWa item={item} etiqueta={textos.whatsapp} />
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

/** WhatsApp con el paquete ya escrito. Lo mide `WhatsAppClickTracker` solo. */
function BotonWa({ item, etiqueta }: { item: ItemTienda; etiqueta: string }) {
  return (
    <a
      href={waLink(item.waMsg)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${etiqueta}: ${item.nombre}`}
      className="tactil inline-flex min-h-[48px] min-w-[48px] items-center justify-center rounded-xl border border-white/20 text-crema hover:border-[#25D366]/60 hover:text-[#25D366]"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.532 5.86L.054 23.447a.75.75 0 0 0 .916.99l5.764-1.511A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.693 9.693 0 0 1-4.953-1.357l-.355-.211-3.68.965.981-3.585-.232-.369A9.712 9.712 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/></svg>
    </a>
  );
}
