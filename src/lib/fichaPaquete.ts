/**
 * La ficha de un paquete multidía, armada SOLO con datos que ya existen
 * (rediseño del 20 nov 2026, «prompt maestro» de Manolo).
 *
 * Nada se escribe aquí a mano: cada campo se DERIVA de
 *   · el paquete (`paquetes.ts` + su traducción),
 *   · los tours de cada día (`tours.ts`: plan hora por hora, recogida, incluye),
 *   · los destinos (`destinos.ts`: foto, descripción, lat/lng),
 *   · el hotel (`habitaciones.ts`) y el motor de precios (`paquetePricing.ts`),
 *   · los requisitos (`tourRequisitos.ts`) y las reseñas reales de Google.
 * Lo que no existe (salidas fijas, precio privado, coordenadas del hotel,
 * tiempos de traslado del hotel a cada paraje) no se inventa: el módulo que lo
 * necesitaría no se pinta. Ver el plan en ~/.claude/plans/cozy-questing-cook.md.
 */
import type { Locale } from "@/lib/i18n/config";
import { localePath } from "@/lib/i18n/config";
import {
  PAQUETES_DB, getPaquete, habitacionesDePaquete, precioVisible, TRASLADOS_TEXTO,
  type Paquete, type ItinerarioDia,
} from "@/lib/paquetes";
import {
  getLocalizedHabitaciones, getLocalizedLogistica, getLocalizedFaqs, localizePaquete,
  galeriaPaqueteLocalizada,
} from "@/lib/i18n/paquetes.en";
import { TOURS_DB, fraseRecogida, tourDurTexto, type Tour, type TourMomento } from "@/lib/tours";
import { localizeTour, localizeDestino } from "@/lib/i18n/localize";
import { DESTINOS_DB, type Destino } from "@/lib/destinos";
import { HABITACIONES_HOTEL, caracteristicasHabitacion } from "@/lib/habitaciones";
import { computePaqueteCharge, MAX_PERSONAS_PAQUETE, MAX_POR_HABITACION } from "@/lib/paquetePricing";
import { TOUR_REQUISITOS, QUE_LLEVAR_BASE } from "@/lib/tourRequisitos";
import { resenasRealesPara, type ResenaParaPagina } from "@/lib/i18n/resenasReales.en";
import { itemsTienda, type ItemTienda, type CategoriaTienda } from "@/lib/paquetesTienda";
import { HOTEL_PROPIO } from "@/lib/hotelPropio";

// ── Tipos ────────────────────────────────────────────────────────────────

export interface FotoFicha { src: string; alt: string }

export interface DestacadoFicha {
  slug: string;
  nombre: string;
  descripcion: string;
  zona: string;
  foto: string;
  dia: number;
  href: string;
}

export interface DiaFicha {
  dia: number;
  tipo: ItinerarioDia["tipo"];
  titulo: string;
  descripcion: string;
  /** El recorrido de ese día, si lo hay. */
  tour?: {
    slug: string;
    nombre: string;
    descripcion: string;
    duracion: string;
    recogida: string;
    dificultad: Tour["dificultad"];
    href: string;
    /** Ruta del RZR («Ruta Miradores»), cuando el día la fija. */
    ruta?: string;
  };
  /** Plan hora por hora del tour (vacío si el tour no lo trae). */
  momentos: TourMomento[];
  /** Lugares del día, en orden, tal como los declara el tour. */
  lugares: string[];
  /** «Desayuno» / «Comida»: solo lo que el `incluye` del tour dice. */
  comidas: string[];
  fotos: FotoFicha[];
  /** Dónde se duerme esa noche; null el día de salida. */
  noche: string | null;
}

export interface ParadaMapa {
  id: string;
  nombre: string;
  lat: number;
  lng: number;
  dia: number;
  foto?: string;
  descripcion: string;
  actividad: string;
  href?: string;
  /** El punto de Xilitla: base del hotel, no un paraje. */
  base?: boolean;
}

export interface FilaPrecio {
  adultos: number;
  total: number;
  porPersona: number;
  habitaciones: number;
}

export interface HabitacionFicha {
  id: string;
  nombre: string;
  descripcion: string;
  vista: string;
  imagen: string;
  galeria: string[];
  maxHuespedes: number;
  caracteristicas: string[];
  vistaMontana: boolean;
}

export interface GrupoIncluye { id: string; items: string[] }

export interface FichaPaquete {
  paquete: Paquete;
  slug: string;
  nombre: string;
  subtitulo: string;
  dias: number;
  noches: number;
  duracion: string;
  precio: number;
  precioLabel: string;
  categorias: CategoriaTienda[];
  galeria: FotoFicha[];
  destinos: number;
  dificultad: Tour["dificultad"];
  tiposActividad: Tour["categoria"][];
  transporte?: string;
  destacados: DestacadoFicha[];
  diasFicha: DiaFicha[];
  paradas: ParadaMapa[];
  habitaciones: HabitacionFicha[];
  /** Lo que se suma por la Jungla para dos personas, en toda la estancia. */
  suplementoMontana: number | null;
  hotel: string;
  incluye: GrupoIncluye[];
  noIncluye: string[];
  precios: FilaPrecio[];
  edadMinima: number | null;
  /** Lo de todos los días de agua, una vez; y lo propio de los recorridos que traen su lista. */
  queLlevar: { general: string[]; porTour: { tour: string; items: string[] }[] };
  /** Requisitos de cada recorrido, por separado: juntos se contradecían. */
  requisitos: { tour: string; items: string[] }[];
  logistica: ReturnType<typeof getLocalizedLogistica>;
  resenas: ResenaParaPagina[];
  faqsBase: { q: string; a: string }[];
  relacionados: ItemTienda[];
}

// ── Coincidencia de nombres (lugar del tour → destino) ───────────────────

const normalizar = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[‘’'"]/g, "").replace(/\s+/g, " ").trim();

/** "Jardín Surrealista (Las Pozas)" → ["jardin surrealista (las pozas)", "jardin surrealista", "las pozas"] */
function clavesDe(nombre: string): string[] {
  const parentesis = nombre.match(/\(([^)]+)\)/)?.[1] ?? "";
  const sinDetalle = nombre.split(/\s+[—–]\s+/)[0];
  return [nombre, sinDetalle, nombre.replace(/\s*\([^)]*\)/g, ""), parentesis]
    .map(normalizar).filter((s) => s.length >= 5);
}
const exactas = (a: string[], b: string[]) => a.some((x) => b.includes(x));
const coinciden = (a: string[], b: string[]) => a.some((x) => b.some((y) => x.includes(y) || y.includes(x)));

/** El destino de un lugar del itinerario. La coincidencia exacta va primero
 *  («Cascadas de Tamasopo» es subcadena de «Siete Cascadas de Tamasopo»). */
export function destinoDeLugar(lugar: string): Destino | undefined {
  const claves = clavesDe(lugar);
  return DESTINOS_DB.find((d) => exactas(claves, clavesDe(d.nombre)))
    ?? DESTINOS_DB.find((d) => coinciden(claves, clavesDe(d.nombre)));
}

/** Los lugares del día. En el RZR, solo los de la ruta que fija el paquete. */
function lugaresDelDia(tour: Tour, ruta?: string): string[] {
  // El punto de encuentro y el traslado no son lugares que se visitan.
  const lugares = tour.destinos.filter((x) => !/^(base|traslado|transfer|meeting|round-trip)/i.test(x));
  if (!ruta || !tour.rutas?.length) return lugares;
  return lugares.filter((x) => x.includes(ruta));
}

const primeraFrase = (s: string, max = 190) => {
  const f = s.split(/(?<=[.!?])\s/)[0] ?? s;
  return f.length > max ? `${f.slice(0, max - 1).trimEnd()}…` : f;
};

/** Hasta `max` destacados tomando uno de cada día por turno: así un paquete de
 *  cuatro días no enseña seis lugares de los dos primeros. Conserva el orden. */
function repartirPorDia(xs: DestacadoFicha[], max: number): DestacadoFicha[] {
  const dias = Array.from(new Set(xs.map((x) => x.dia)));
  const elegidos = new Set<DestacadoFicha>();
  for (let ronda = 0; elegidos.size < Math.min(max, xs.length); ronda++) {
    for (const d of dias) {
      const delDia = xs.filter((x) => x.dia === d);
      if (delDia[ronda] && elegidos.size < max) elegidos.add(delDia[ronda]);
    }
  }
  return xs.filter((x) => elegidos.has(x));
}

const ORDEN_DIF: Tour["dificultad"][] = ["baja", "media", "alta"];

/** Xilitla, el pueblo (el hotel no tiene coordenadas propias publicadas). */
const XILITLA = { lat: 21.3917, lng: -98.9958 };

// ── Fotos ────────────────────────────────────────────────────────────────

function fotosDelDia(tour: Tour, lugares: string[], locale: Locale, max = 4): FotoFicha[] {
  const fotos: FotoFicha[] = [];
  const vistas = new Set<string>();
  const meter = (src: string | undefined, alt: string) => {
    if (!src || vistas.has(src) || fotos.length >= max) return;
    vistas.add(src);
    fotos.push({ src, alt });
  };
  for (const l of lugares) {
    const d = destinoDeLugar(l);
    if (d) meter(d.imagen_hero, `${localizeDestino(d, locale).nombre} — ${tour.nombreCorto || tour.nombre}`);
  }
  for (const g of tour.gallery) meter(g.src, g.alt);
  if (!fotos.length) meter(tour.imagen_hero, tour.nombre);
  return fotos;
}

// ── Incluye por categoría ───────────────────────────────────────────────

// El orden de esta lista es el de PRUEBA (el primero que casa gana): «Transporte
// del hotel al inicio de cada tour» es transporte aunque diga «hotel» y «tour».
const GRUPOS: { id: string; re: RegExp }[] = [
  { id: "transporte", re: /transporte|traslado|transport|transfer/i },
  { id: "hospedaje", re: /noche|hotel|habitaci|night|room/i },
  { id: "alimentos", re: /desayuno|comida|breakfast|lunch|meal/i },
  { id: "equipo", re: /equipo|chaleco|casco|seguro|gear|vest|helmet|insurance/i },
  { id: "foto", re: /foto|video|photo/i },
  { id: "entradas", re: /entrada|admission|entrance|ticket/i },
  { id: "actividades", re: /tour|recorrido|rzr|rafting|salto|ruta|expedici|cascada|para[íi]so|route|waterfall/i },
  { id: "guias", re: /gu[íi]a|guide/i },
];
/** El orden en que se ENSEÑAN los grupos. */
const ORDEN_GRUPOS = ["hospedaje", "transporte", "actividades", "entradas", "guias", "equipo", "alimentos", "foto", "otros"];

function agrupar(items: string[]): GrupoIncluye[] {
  const grupos = new Map<string, string[]>();
  for (const it of items) {
    const g = GRUPOS.find((x) => x.re.test(it))?.id ?? "otros";
    grupos.set(g, [...(grupos.get(g) ?? []), it]);
  }
  return ORDEN_GRUPOS.filter((id) => grupos.has(id)).map((id) => ({ id, items: grupos.get(id)! }));
}

// ── La ficha ─────────────────────────────────────────────────────────────

const RESENAS_PRIMERO = ["jetsay martinez", "Javier Fernández", "Giovana Jimenez"];

export function construirFicha(slug: string, locale: Locale): FichaPaquete | null {
  const base = getPaquete(slug);
  if (!base || base.evento) return null;
  const p = localizePaquete(base, locale);
  const en = locale === "en";
  const lp = (x: string) => localePath(x, locale);
  const tienda = itemsTienda(locale, null);
  const item = tienda.find((i) => i.tipo === "paquete" && i.slug === slug);

  // Días
  const toursUsados: Tour[] = [];
  const diasFicha: DiaFicha[] = p.itinerario.map((d) => {
    const tb = d.tourSlug ? TOURS_DB.find((t) => t.slug === d.tourSlug) : undefined;
    const ultimo = d.dia === p.dias;
    const noche = ultimo ? null : HOTEL_PROPIO.nombre;
    if (!tb) {
      return {
        dia: d.dia, tipo: d.tipo, titulo: d.titulo, descripcion: d.descripcion,
        momentos: [], lugares: [], comidas: [], noche,
        fotos: (d.fotos ?? []).map((src) => ({ src, alt: d.titulo })),
      };
    }
    toursUsados.push(tb);
    const t = localizeTour(tb, locale);
    const lugares = lugaresDelDia(t, d.rutaVehiculo);
    const comidas: string[] = [];
    if (t.incluye.some((x) => /^(desayuno|breakfast)/i.test(x))) comidas.push(en ? "Breakfast" : "Desayuno");
    if (t.incluye.some((x) => /^(comida|lunch)/i.test(x))) comidas.push(en ? "Lunch" : "Comida");
    return {
      dia: d.dia, tipo: d.tipo, titulo: d.titulo, descripcion: d.descripcion,
      tour: {
        slug: t.slug,
        nombre: t.nombreCorto || t.nombre,
        descripcion: t.descripcion,
        duracion: tourDurTexto(tb, en ? " h" : " h"),
        recogida: fraseRecogida(tb, en),
        dificultad: tb.dificultad,
        href: lp(`/tours/${t.slug}`),
        ruta: d.rutaVehiculo,
      },
      // El plan hora por hora del RZR no existe y su ruta cambia: se omite.
      momentos: d.rutaVehiculo ? [] : t.itinerario ?? [],
      lugares: lugares.map((x) => x.replace(/\s*\([^)]*\)/g, "").split(/\s+[—–]\s+/)[0].trim()),
      comidas,
      fotos: fotosDelDia(t, lugares, locale),
      noche,
    };
  });

  // Destinos (en orden, sin repetir) → destacados y mapa
  const vistos = new Set<string>();
  const destacados: DestacadoFicha[] = [];
  const paradas: ParadaMapa[] = [{
    id: "xilitla", nombre: en ? "Xilitla — your hotel's town" : "Xilitla — base del hotel",
    ...XILITLA, dia: 1, base: true,
    descripcion: en
      ? `${HOTEL_PROPIO.nombre}: every night of the trip, ${HOTEL_PROPIO.metrosALasPozas} m from Las Pozas.`
      : `${HOTEL_PROPIO.nombre}: todas las noches del viaje, a ${HOTEL_PROPIO.metrosALasPozas} m de Las Pozas.`,
    actividad: en ? "Lodging" : "Hospedaje",
  }];
  p.itinerario.forEach((d) => {
    const tb = d.tourSlug ? TOURS_DB.find((t) => t.slug === d.tourSlug) : undefined;
    if (!tb) return;
    const antes = destacados.length;
    for (const l of lugaresDelDia(tb, d.rutaVehiculo)) {
      const dest = destinoDeLugar(l);
      if (!dest || vistos.has(dest.slug)) continue;
      vistos.add(dest.slug);
      const dl = localizeDestino(dest, locale);
      const tl = localizeTour(tb, locale);
      destacados.push({
        slug: dest.slug, nombre: dl.nombre, descripcion: primeraFrase(dl.descripcion), zona: dest.zona,
        foto: dest.imagen_hero, dia: d.dia, href: lp(`/destinos/${dest.slug}`),
      });
      if (Number.isFinite(dest.lat) && Number.isFinite(dest.lng)) {
        paradas.push({
          id: dest.slug, nombre: dl.nombre, lat: dest.lat, lng: dest.lng, dia: d.dia,
          foto: dest.imagen_hero, descripcion: primeraFrase(dl.descripcion, 140),
          actividad: tl.nombreCorto || tl.nombre, href: lp(`/destinos/${dest.slug}`),
        });
      }
    }
    // Un día sin paraje de catálogo (el RZR por los miradores) se destaca con su
    // propio recorrido: nombre, foto y frase del tour, nada más.
    if (destacados.length === antes) {
      const tl = localizeTour(tb, locale);
      destacados.push({
        slug: tb.slug, nombre: d.rutaVehiculo ? `${tl.nombreCorto || tl.nombre} · ${d.rutaVehiculo}` : (tl.nombreCorto || tl.nombre),
        descripcion: primeraFrase(tl.tagline), zona: "Xilitla",
        foto: tb.imagenTarjeta ?? tb.imagen_hero, dia: d.dia, href: lp(`/tours/${tb.slug}`),
      });
    }
  });

  // Habitaciones
  const habsLoc = getLocalizedHabitaciones(locale);
  const habitaciones: HabitacionFicha[] = habitacionesDePaquete(base).flatMap((h) => {
    const loc = habsLoc.find((x) => x.id === h.id);
    const hotel = HABITACIONES_HOTEL.find((x) => x.id === h.id);
    if (!loc || !hotel) return [];
    return [{
      id: h.id, nombre: loc.nombre, descripcion: loc.descripcion, vista: loc.vista,
      imagen: hotel.imagen, galeria: hotel.galeria ?? [hotel.imagen],
      maxHuespedes: Math.min(hotel.maxHuespedes, MAX_POR_HABITACION),
      caracteristicas: caracteristicasHabitacion(hotel.caracteristicas, locale),
      vistaMontana: !!hotel.vistaMontana,
    }];
  });
  const normal = computePaqueteCharge({ slug, personas: 2, pct: 100 });
  const montana = computePaqueteCharge({ slug, personas: 2, vistaMontana: true, pct: 100 });
  const suplementoMontana = normal && montana && montana.total > normal.total ? montana.total - normal.total : null;

  // Tabla de precios: el motor real, sin fecha (= el precio que se anuncia hoy)
  const precios: FilaPrecio[] = [];
  for (let n = 2; n <= MAX_PERSONAS_PAQUETE; n++) {
    const r = computePaqueteCharge({ slug, personas: n, pct: 100 });
    if (r) precios.push({ adultos: n, total: r.total, porPersona: Math.round(r.total / n), habitaciones: r.habitaciones });
  }

  // Información práctica (los requisitos solo existen en español)
  const reqs = toursUsados.map((t) => TOUR_REQUISITOS[t.id]).filter(Boolean);
  const edades = reqs.map((r) => r!.edadMinima).filter((x): x is number => typeof x === "number");
  const unicos = (xs: string[]) => Array.from(new Set(xs));
  const propios = toursUsados.filter((t) => TOUR_REQUISITOS[t.id]?.queLlevar?.length);
  const queLlevar = en
    ? { general: [], porTour: [] }
    : {
        general: toursUsados.some((t) => !TOUR_REQUISITOS[t.id]?.queLlevar?.length) ? QUE_LLEVAR_BASE : [],
        porTour: propios
          .map((t) => ({ tour: t.nombreCorto || t.nombre, items: TOUR_REQUISITOS[t.id]!.queLlevar! }))
          .filter((x, i, a) => a.findIndex((y) => y.tour === x.tour) === i),
      };
  const requisitos = en ? [] : toursUsados.flatMap((t) => {
    const items = TOUR_REQUISITOS[t.id]?.requisitos ?? [];
    return items.length ? [{ tour: t.nombreCorto || t.nombre, items }] : [];
  }).filter((x, i, a) => a.findIndex((y) => y.tour === x.tour) === i);

  const dificultad = toursUsados.reduce<Tour["dificultad"]>(
    (m, t) => (ORDEN_DIF.indexOf(t.dificultad) > ORDEN_DIF.indexOf(m) ? t.dificultad : m), "baja");

  // Reseñas reales: primero las que hablan de organización y guías.
  const todas = resenasRealesPara(locale);
  const resenas = [
    ...RESENAS_PRIMERO.map((a) => todas.find((r) => r.autor === a)).filter((r): r is ResenaParaPagina => !!r),
    ...todas.filter((r) => !RESENAS_PRIMERO.includes(r.autor)),
  ].slice(0, 3);

  // Relacionados: los otros paquetes por cercanía de días, y el viaje CDMX.
  const relacionados = [
    ...tienda.filter((i) => i.tipo === "paquete" && i.slug !== slug)
      .sort((a, b) => Math.abs(a.dias - p.dias) - Math.abs(b.dias - p.dias)),
    ...tienda.filter((i) => i.tipo === "viaje"),
  ].slice(0, 4);

  return {
    paquete: p,
    slug: p.slug,
    nombre: p.nombre,
    subtitulo: p.subtitulo,
    dias: p.dias,
    noches: p.noches,
    duracion: p.duracion,
    precio: precioVisible(p),
    precioLabel: p.precioLabel,
    categorias: item?.categorias ?? ["multidia"],
    galeria: galeriaPaqueteLocalizada(base, locale).map((f) => ({ src: f.src, alt: f.alt ?? p.nombre })),
    destinos: destacados.length,
    dificultad,
    tiposActividad: unicos(toursUsados.map((t) => t.categoria)) as Tour["categoria"][],
    transporte: p.incluye.find((x) => /transporte|traslado|transport|transfer/i.test(x)),
    destacados: repartirPorDia(destacados, 6),
    diasFicha,
    paradas,
    habitaciones,
    suplementoMontana,
    hotel: HOTEL_PROPIO.nombre,
    incluye: agrupar(p.incluye),
    noIncluye: p.noIncluye,
    precios,
    edadMinima: edades.length ? Math.max(...edades) : null,
    queLlevar,
    requisitos,
    logistica: getLocalizedLogistica(locale),
    resenas,
    faqsBase: getLocalizedFaqs(locale, TRASLADOS_TEXTO(locale)),
    relacionados,
  };
}

export const SLUGS_FICHA = PAQUETES_DB.map((p) => p.slug);
