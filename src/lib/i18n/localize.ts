import { TOURS_DB, type Tour } from "@/lib/tours";
import { DESTINOS_DB, type Destino } from "@/lib/destinos";
import type { Locale } from "./config";
import { TOURS_EN } from "./tours.en";
import { DESTINOS_EN } from "./destinos.en";

// Superpone los campos en inglés sobre el registro español (fallback a ES si falta).
// Las páginas en español llaman con locale="es" → devuelven el dato original sin cambios.

export function localizeTour(tour: Tour, locale: Locale): Tour {
  if (locale === "es") return tour;
  const t = TOURS_EN[tour.slug];
  if (!t) return tour;
  return {
    ...tour,
    nombre: t.nombre ?? tour.nombre,
    tagline: t.tagline ?? tour.tagline,
    descripcion: t.descripcion ?? tour.descripcion,
    descripcionLarga: t.descripcionLarga ?? tour.descripcionLarga,
    tipo: t.tipo ?? tour.tipo,
    urgencia: t.urgencia ?? tour.urgencia,
    destinos: t.destinos ?? tour.destinos,
    incluye: t.incluye ?? tour.incluye,
    gallery: t.gallery
      ? tour.gallery.map((g, i) => ({ ...g, alt: t.gallery![i] ?? g.alt }))
      : tour.gallery,
  };
}

export function localizeDestino(destino: Destino, locale: Locale): Destino {
  if (locale === "es") return destino;
  const d = DESTINOS_EN[destino.slug];
  if (!d) return destino;
  const seo = destino.seo
    ? {
        metaTitle: d.seo?.metaTitle ?? destino.seo.metaTitle,
        metaDescription: d.seo?.metaDescription ?? destino.seo.metaDescription,
        keywords: d.seo?.keywords ?? destino.seo.keywords,
        faqPrincipales: d.seo?.faqPrincipales ?? destino.seo.faqPrincipales,
      }
    : destino.seo;
  return {
    ...destino,
    nombre: d.nombre ?? destino.nombre,
    descripcion: d.descripcion ?? destino.descripcion,
    tipo: d.tipo ?? destino.tipo,
    precio_entrada: d.precio_entrada ?? destino.precio_entrada,
    dias_abierto: d.dias_abierto ?? destino.dias_abierto,
    mejor_hora: d.mejor_hora ?? destino.mejor_hora,
    temporada_ideal: d.temporada_ideal ?? destino.temporada_ideal,
    advertencias: d.advertencias ?? destino.advertencias,
    como_llegar: d.como_llegar ?? destino.como_llegar,
    que_llevar: d.que_llevar ?? destino.que_llevar,
    datos_curiosos: d.datos_curiosos ?? destino.datos_curiosos,
    errores_comunes: d.errores_comunes ?? destino.errores_comunes,
    seo,
  };
}

/** Busca un tour por slug y lo localiza (o undefined). */
export function getLocalizedTour(slug: string, locale: Locale): Tour | undefined {
  const tour = TOURS_DB.find((t) => t.slug === slug);
  return tour ? localizeTour(tour, locale) : undefined;
}

/** Busca un destino por slug y lo localiza (o undefined). */
export function getLocalizedDestino(slug: string, locale: Locale): Destino | undefined {
  const destino = DESTINOS_DB.find((d) => d.slug === slug);
  return destino ? localizeDestino(destino, locale) : undefined;
}
