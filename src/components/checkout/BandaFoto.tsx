"use client";

import Image from "next/image";
import { Star, CalendarDays, Users } from "lucide-react";
import { personasDeItem, type CarritoItem } from "@/lib/carrito";
import { formatTourDate } from "@/lib/tourBooking";
import { TOURS_DB } from "@/lib/tours";
import { localizeTour } from "@/lib/i18n/localize";
import { getBooking } from "@/lib/i18n/booking";
import type { Locale } from "@/lib/i18n/config";
import { GOOGLE_RATING } from "@/lib/resenas";

/** «10 oct» / «Oct 10». */
function diaCorto(ymd: string, locale: Locale): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12))
    .toLocaleDateString(locale === "en" ? "en-US" : "es-MX", { day: "numeric", month: "short", timeZone: "UTC" })
    .replace(/\./g, "");
}

/**
 * La foto del recorrido arriba del checkout: la historia sigue donde la dejó la
 * ficha (oscura, con la foto grande) en vez de saltar a un formulario crema sin
 * una sola imagen. Debajo de la foto, lo que se está comprando en una línea: qué,
 * cuándo y cuántos, más la calificación real de Google.
 */
export function BandaFoto({ items, locale }: { items: CarritoItem[]; locale: Locale }) {
  const t = getBooking(locale).carrito;
  const tc = getBooking(locale).checkout;
  const fechados = [...items].filter((i) => i.tourDate).sort((a, b) => a.tourDate.localeCompare(b.tourDate));
  const primero = fechados[0] ?? items[0];
  if (!primero) return null;

  const base = TOURS_DB.find((x) => x.slug === primero.tourSlug);
  const nombreLargo = base ? localizeTour(base, locale).nombre : primero.tourName;
  const [titulo, subtitulo] = nombreLargo.split("—").map((s) => s.trim());
  const imagen = base?.imagenTarjeta ?? base?.imagen_hero ?? primero.tourImage;

  const varios = items.length > 1;
  const rango = fechados.length
    ? fechados.length === 1 || fechados[0].tourDate === fechados[fechados.length - 1].tourDate
      ? diaCorto(fechados[0].tourDate, locale)
      : `${diaCorto(fechados[0].tourDate, locale)} – ${diaCorto(fechados[fechados.length - 1].tourDate, locale)}`
    : tc.sinFechaResumen;
  // Las personas son las mismas en todos los recorridos: se toma el grupo más grande.
  const personas = Math.max(...items.map((i) => personasDeItem(i)), 0);

  return (
    <section className="relative bg-negro text-crema overflow-hidden">
      <div className="absolute inset-0">
        <Image src={imagen} alt="" fill priority sizes="100vw" className="object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-t from-negro via-negro/55 to-negro/10" aria-hidden="true" />
      </div>
      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-20 sm:pt-28 pb-5 sm:pb-7">
        <h1 className="font-cormorant font-light text-[30px] sm:text-[40px] leading-[1.05]">
          {varios ? tc.tuViajeHuasteca : titulo}
        </h1>
        {!varios && subtitulo && (
          <p className="mt-1 font-dm text-[13px] sm:text-[14px] text-crema/75">{subtitulo}</p>
        )}
        <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 font-dm text-[12px] sm:text-[13px] text-crema/85">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5 text-lima" aria-hidden="true" />
            {varios
              ? tc.recorridosYDias(items.length, rango)
              : primero.tourDate ? formatTourDate(primero.tourDate, locale) : tc.sinFechaResumen}
          </span>
          {personas > 0 && !primero.unidades && (
            <span className="inline-flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-lima" aria-hidden="true" />
              {t.personas(personas)}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 fill-dorado text-dorado" aria-hidden="true" />
            <strong className="font-medium text-crema">{GOOGLE_RATING}</strong> · {t.resenasGoogle}
          </span>
        </p>
      </div>
    </section>
  );
}
