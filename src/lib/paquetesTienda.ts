/**
 * La «tienda» de /paquetes (rediseño del 20 nov 2026).
 *
 * Con solo cuatro paquetes —todos de 3 a 5 días con hotel— los filtros que
 * pidió Manolo («Escapadas», «Experiencias privadas») y el tramo de «2 días»
 * salían vacíos. Para llenarlos SIN inventar nada, la tienda junta los tres
 * productos reales que vendemos:
 *
 *   1. los paquetes de `PAQUETES_DB` (precio por pareja → `precioVisible`),
 *   2. el viaje CDMX–Xilitla (2 días; el precio sale de la base),
 *   3. los tours de un día de `TOURS_DB` (llevan a su ficha).
 *
 * Las categorías son una TABLA, como `etiquetasTour.ts`: no tocan la base ni el
 * modelo. Un producto solo entra en «privadas» si de verdad se vende privado
 * (`privateAvailable` / `exclusivo`); ningún paquete lo declara, así que
 * ninguno sale ahí.
 */
import type { Locale } from "@/lib/i18n/config";
import { localePath } from "@/lib/i18n/config";
import { precioVisible, type Paquete } from "@/lib/paquetes";
import { TOURS_DB, etiquetaUnidad, privadoDe, tourDurTexto, type Tour } from "@/lib/tours";
import { localizeTour } from "@/lib/i18n/localize";
import { getLocalizedPaquetes, formatoMXN } from "@/lib/i18n/paquetes.en";
import { DIAS as VIAJE_DIAS, NOCHES_TEXTO, VIAJE_RUTA } from "@/lib/viajeCdmx/config";
import { NOCHES_TEXTO_EN, VIAJE_RUTA_EN } from "@/lib/viajeCdmx/en";

export type CategoriaTienda = "aventura" | "naturaleza" | "escapadas" | "privadas" | "multidia";
export const CATEGORIAS_TIENDA: CategoriaTienda[] = ["aventura", "naturaleza", "escapadas", "privadas", "multidia"];

export type TipoItem = "paquete" | "viaje" | "tour";

/** Todo lo que pinta una tarjeta. Serializable: viaja del servidor al cliente. */
export interface ItemTienda {
  id: string;
  tipo: TipoItem;
  slug: string;
  nombre: string;
  resumen: string;
  foto: string;
  fotoAlt: string;
  /** "4 días / 3 noches", "6–8 h"… */
  duracion: string;
  /** Días del viaje; los tours de un día cuentan 1. */
  dias: number;
  /** Dónde ocurre; vacío cuando no hay un dato corto y cierto. */
  lugar: string;
  modalidad: string;
  actividades: string[];
  /** null = sin precio confiable (p. ej. la base no respondió): no se pinta cifra. */
  precio: number | null;
  /** "por pareja", "por persona", "por vehículo"… */
  unidad: string;
  /** Una segunda línea de precio real (el privado de un tour). */
  notaPrecio?: string;
  badge?: string;
  destacado?: boolean;
  incluyeHotel: boolean;
  categorias: CategoriaTienda[];
  href: string;
  /** Reserva en línea directa (solo paquetes: el checkout de siempre). */
  reservarHref?: string;
  waMsg: string;
}

// ── Tabla de categorías de los paquetes ───────────────────────────────────
// Por slug. Un paquete nuevo sin entrada cae en «multidía» y en «naturaleza».
const CATS_PAQUETE: Record<string, CategoriaTienda[]> = {
  "inmersion-huasteca": ["naturaleza", "escapadas", "multidia"],
  "gran-huasteca": ["naturaleza", "multidia"],
  aventura: ["aventura", "multidia"],
  "odisea-huasteca": ["naturaleza", "multidia"],
};

/** El nombre del recorrido sin su descripción ni el día («Cascadas del Meco»). */
export function tituloCorto(tour: string): { nombre: string; dia: string } {
  const dia = tour.match(/\((D[íi]a[^)]*|Day[^)]*)\)\s*$/)?.[1] ?? "";
  const sinDia = dia ? tour.slice(0, tour.lastIndexOf("(")).trim() : tour;
  const nombre = sinDia.split(/\s+[—–]\s+/)[0].trim();
  return { nombre, dia };
}

const T = {
  es: {
    lugarPaquete: "Base en Xilitla",
    modalidadPaquete: "Con hotel · itinerario armado",
    lugarViaje: "Desde CDMX a Xilitla",
    modalidadViaje: "Salida grupal mensual",
    nombreViaje: "Viaje CDMX–Xilitla",
    resumenViaje: "Sales el viernes en la noche desde la CDMX y despiertas en Xilitla. Transporte, hotel, desayunos y dos recorridos guiados.",
    actividadesViaje: ["Ruta Surrealista", "Expedición Tamul", "Transporte redondo"],
    duracionViaje: `${VIAJE_DIAS} días / ${NOCHES_TEXTO}`,
    porPersona: "por persona",
    modalidadTour: "Tour guiado de un día",
    tambienPrivado: " · también privado",
    privadoRegla: (n: string) => `Privado: ${n} por persona`,
    privadoPropio: (n: string) => `Privado desde ${n}`,
    waPaquete: (nombre: string, dur: string, slug: string) =>
      `Hola, me interesa el paquete «${nombre}» (${dur}, ref. ${slug}). ¿Qué fechas tienen disponibles?`,
    waTour: (nombre: string) => `Hola, me interesa el tour «${nombre}». ¿Qué fechas tienen disponibles?`,
    waViaje: "Hola, me interesa el viaje CDMX–Xilitla. ¿Cuándo es la próxima salida?",
  },
  en: {
    lugarPaquete: "Based in Xilitla",
    modalidadPaquete: "With hotel · day-by-day itinerary",
    lugarViaje: "Mexico City to Xilitla",
    modalidadViaje: "Monthly small-group departure",
    nombreViaje: "Mexico City–Xilitla trip",
    resumenViaje: "Leave Mexico City on Friday night and wake up in Xilitla. Transport, hotel, breakfasts and two guided tours.",
    actividadesViaje: ["Surrealist Route", "Tamul Expedition", "Round-trip transport"],
    duracionViaje: `${VIAJE_DIAS} days / ${NOCHES_TEXTO_EN}`,
    porPersona: "per person",
    modalidadTour: "Guided day tour",
    tambienPrivado: " · private option",
    privadoRegla: (n: string) => `Private: ${n} per person`,
    privadoPropio: (n: string) => `Private from ${n}`,
    waPaquete: (nombre: string, dur: string, slug: string) =>
      `Hi, I'm interested in the "${nombre}" package (${dur}, ref. ${slug}). Which dates are available?`,
    waTour: (nombre: string) => `Hi, I'm interested in the "${nombre}" tour. Which dates are available?`,
    waViaje: "Hi, I'm interested in the Mexico City–Xilitla trip. When is the next departure?",
  },
} as const;

function itemPaquete(p: Paquete, locale: Locale): ItemTienda {
  const t = T[locale];
  const lp = (x: string) => localePath(x, locale);
  // Sin repetir: la Odisea pasa dos veces por el mismo paraje en su lista.
  const actividades = Array.from(new Set(p.tours.map((x) => tituloCorto(x).nombre))).slice(0, 4);
  return {
    id: `paquete-${p.slug}`,
    tipo: "paquete",
    slug: p.slug,
    nombre: p.nombre,
    resumen: p.subtitulo,
    foto: p.imagen,
    fotoAlt: locale === "en" ? `${p.nombre}, Huasteca Potosina package` : `${p.nombre}, paquete en la Huasteca Potosina`,
    duracion: p.duracion,
    dias: p.dias,
    lugar: t.lugarPaquete,
    modalidad: t.modalidadPaquete,
    actividades,
    precio: precioVisible(p),
    unidad: p.precioLabel,
    badge: p.badge,
    destacado: p.destacado,
    incluyeHotel: true,
    categorias: CATS_PAQUETE[p.slug] ?? ["naturaleza", "multidia"],
    href: lp(`/paquetes/${p.slug}`),
    reservarHref: `${lp("/reservar/carrito")}?paquete=${p.slug}`,
    waMsg: t.waPaquete(p.nombre, p.duracion, p.slug),
  };
}

function itemViaje(locale: Locale, precio: number | null): ItemTienda {
  const t = T[locale];
  return {
    id: "viaje-cdmx",
    tipo: "viaje",
    slug: "viaje-cdmx-xilitla",
    nombre: t.nombreViaje,
    resumen: t.resumenViaje,
    foto: "/imagenes/tours/tamul/cascada-de-tamul-arcoiris.jpg",
    fotoAlt: locale === "en" ? "Tamul waterfall with a rainbow over the turquoise river" : "La cascada de Tamul con un arcoíris sobre el río turquesa",
    duracion: t.duracionViaje,
    dias: VIAJE_DIAS,
    lugar: t.lugarViaje,
    modalidad: t.modalidadViaje,
    actividades: [...t.actividadesViaje],
    precio,
    unidad: t.porPersona,
    incluyeHotel: true,
    categorias: ["escapadas", "multidia", "naturaleza"],
    href: locale === "en" ? VIAJE_RUTA_EN : VIAJE_RUTA,
    waMsg: t.waViaje,
  };
}

function categoriasTour(tour: Tour): CategoriaTienda[] {
  const cats: CategoriaTienda[] = [tour.categoria === "ecoturismo" ? "naturaleza" : "aventura"];
  if (tour.exclusivo || tour.privateAvailable) cats.push("privadas");
  return cats;
}

function itemTour(base: Tour, locale: Locale): ItemTienda {
  const t = T[locale];
  const tour = localizeTour(base, locale);
  const en = locale === "en";
  const priv = privadoDe(base);
  const notaPrecio = priv
    ? priv.tipo === "regla"
      ? t.privadoRegla(formatoMXN(priv.porPersona, locale))
      : t.privadoPropio(formatoMXN(priv.precio, locale))
    : undefined;
  return {
    id: `tour-${tour.slug}`,
    tipo: "tour",
    slug: tour.slug,
    nombre: tour.nombreCorto || tour.nombre,
    resumen: tour.tagline,
    foto: tour.imagenTarjeta ?? tour.imagen_hero,
    fotoAlt: `${tour.nombreCorto || tour.nombre}, Huasteca Potosina`,
    duracion: tourDurTexto(base, en ? " h" : " h"),
    dias: 1,
    lugar: "",
    modalidad: t.modalidadTour + (base.privateAvailable && !base.exclusivo ? t.tambienPrivado : ""),
    actividades: [],
    precio: base.precio,
    unidad: etiquetaUnidad(base, en),
    notaPrecio,
    incluyeHotel: false,
    categorias: categoriasTour(base),
    href: localePath(`/tours/${tour.slug}`, locale),
    waMsg: t.waTour(tour.nombreCorto || tour.nombre),
  };
}

/** Todos los productos de la tienda, en el orden en que se enseñan. */
export function itemsTienda(locale: Locale, precioViaje: number | null): ItemTienda[] {
  const paquetes = getLocalizedPaquetes(locale).map((p) => itemPaquete(p, locale));
  // El destacado primero (es el que se pinta grande), luego por días.
  paquetes.sort((a, b) => Number(!!b.destacado) - Number(!!a.destacado) || a.dias - b.dias);
  // Los tours: primero los que se venden privados en exclusiva (el Edén).
  const tours = [...TOURS_DB]
    .sort((a, b) => Number(!!b.exclusivo) - Number(!!a.exclusivo))
    .map((t) => itemTour(t, locale));
  return [...paquetes, itemViaje(locale, precioViaje), ...tours];
}

/** Los tramos de «elige por los días que tienes». */
export const TRAMOS_DIAS = [
  { id: "2", min: 2, max: 2 },
  { id: "3", min: 3, max: 3 },
  { id: "4", min: 4, max: 4 },
  { id: "5+", min: 5, max: 99 },
] as const;
