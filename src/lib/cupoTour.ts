// Solo servidor: lee la base (las reservas y `Config`).
import { prisma } from "./prisma";
import { TOURS_DB, type Tour } from "./tours";
import type { Paquete } from "./paquetes";
import { addDaysYMD, diffDiasYMD, hoyMX } from "./dates";
import { localizeTour } from "./i18n/localize";
import { apartadosVigentes, type Apartado } from "./apartadosAlmacen";
import { LIBRES_CASI_LLENO } from "./cupoConstantes";

/**
 * El cupo de cada recorrido POR FECHA (decisión de Manolo, 7 oct 2026).
 *
 * Hasta hoy el calendario del sitio dejaba elegir cualquier día y nadie hacía
 * cumplir un tope diario: se podían vender tres grupos de diez para la misma
 * Expedición Tamul y enterarse la víspera, armando la logística. Ahora cada
 * recorrido lleva su propia cuenta por día y la venta en línea (el sitio y el
 * bot) no pasa de 12 personas. El calendario pinta cada día con su estado:
 *
 *   libre         nadie ha reservado ese recorrido ese día
 *   con-reservas  1 a 8 personas
 *   casi-lleno    9 a 11 (quedan 3 lugares o menos)
 *   sin-cupo      12 o más: gris, no se elige
 *   no-cabe       quedan lugares, pero no para el grupo que se pide
 *   cerrada       el equipo la cerró en el panel (río crecido, sin guía)
 *
 * La cuenta es la MISMA en los tres lugares que la usan: el calendario del
 * sitio (`/api/tours/disponibilidad`), las rutas que cobran y el calendario
 * del panel. Si cada uno contara a su modo, el sitio dejaría pagar un día que
 * el panel ya enseña lleno.
 *
 * Los APARTADOS del carrito (`lib/apartadosAlmacen.ts`: los lugares que otro
 * cliente tiene tomados 15 minutos mientras paga) cuentan como reservas en el
 * sitio y al cobrar. El panel cuenta solo reservas y los enseña aparte: en 15
 * minutos son una reserva o no son nada.
 *
 * Fuera: el RZR (se cobra por vehículo; su tope son las unidades). Y el tope
 * no manda en el PANEL: ahí alguien ya acordó la logística y sabe si sale una
 * segunda unidad, así que las cotizaciones y reservas del equipo solo avisan.
 */

/** El tope de personas por recorrido y por fecha en la venta en línea. */
export const CUPO_DIARIO = 12;

/**
 * Desde cuántos lugares libres un día se pinta «casi lleno». Vive en
 * `cupoConstantes.ts` porque el calendario del navegador también lo necesita y
 * este archivo arrastra Prisma. Se re-exporta para no romper a quien ya lo
 * pedía aquí.
 */
export { LIBRES_CASI_LLENO };

/**
 * Las reservas que no apartan lugar: las canceladas y los «borrador» del bot
 * viejo, que eran cotizaciones grabadas como reserva y nunca se pagaron.
 */
const NO_CUENTAN = ["cancelled", "borrador"];

/**
 * Cuántos días se pueden pedir de una vez: los seis meses que deja elegir el
 * calendario, con holgura.
 */
export const RANGO_MAX_DIAS = 190;

/**
 * Margen de la búsqueda por `tourDate`. Esa columna es la fecha del PRIMER
 * recorrido de un carrito; los demás pueden caer hasta seis meses antes o
 * después (es lo que deja elegir el calendario). Sin margen, el segundo
 * recorrido de un carrito no se contaría en su día.
 */
const MARGEN_DIAS = 200;

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

export type EstadoDia = "libre" | "con-reservas" | "casi-lleno" | "sin-cupo" | "no-cabe" | "cerrada";

/** ¿Se puede elegir un día en este estado? Los demás salen grises. */
export function seElige(e: EstadoDia): boolean {
  return e === "libre" || e === "con-reservas" || e === "casi-lleno";
}

/**
 * El tope diario de un recorrido, o `null` si no lleva cupo por fecha (el RZR).
 *
 * Nunca más de 12, ni más de lo que cabe en su salida (`groupMax`): la Gruta
 * de Xilo sale con 8 y Huasteca Instagrameable con 6 —el grupo chico es justo
 * lo que promete—. Con 12 parejo, el sitio vendería doce lugares en una salida
 * cuya ficha dice «máximo 8 personas por salida».
 */
export function cupoDeTour(t: Pick<Tour, "groupMax" | "precioUnidad">): number | null {
  if (t.precioUnidad === "vehiculo") return null;
  return Math.max(1, Math.min(CUPO_DIARIO, t.groupMax));
}

/**
 * Experiencia privada de UNA salida al día (el Edén en el Jardín): con una
 * reserva, el día ya es de alguien aunque sean dos personas. Lo dice su propia
 * política: «una vez apartada, ese día queda cerrado para todos los demás».
 */
function esPrivadaDelDia(t: Pick<Tour, "precioUnidad">): boolean {
  return t.precioUnidad === "grupo";
}

/** El recorrido del catálogo, solo si lleva cupo por fecha. */
function tourConCupo(slug: string): Tour | null {
  const t = TOURS_DB.find((x) => x.slug === slug);
  return t && cupoDeTour(t) !== null ? t : null;
}

/**
 * El estado de un día. `ocupadas` son las personas ya reservadas ese día en
 * ese recorrido; `grupo`, las que se quieren meter (0 = solo mirar).
 */
export function estadoDia(
  ocupadas: number,
  { cupo, cerrada = false, grupo = 0, privada = false }: { cupo: number; cerrada?: boolean; grupo?: number; privada?: boolean },
): EstadoDia {
  if (cerrada) return "cerrada";
  if (ocupadas >= cupo || (privada && ocupadas > 0)) return "sin-cupo";
  if (grupo > cupo - ocupadas) return "no-cabe";
  if (ocupadas <= 0) return "libre";
  return cupo - ocupadas <= LIBRES_CASI_LLENO ? "casi-lleno" : "con-reservas";
}

// ── La cuenta ───────────────────────────────────────────────────────────────

/** Lo que hace falta de una reserva para contarla (sirve el `TourBooking` entero). */
export interface ReservaParaCupo {
  tourSlug:   string;
  tourDate:   string;
  adults:     number;
  children:   number;
  status?:    string;
  lineItems?: unknown;
}

/** Un recorrido que ocupa una reserva, en su fecha. */
interface Salida { slug: string; fecha: string; personas: number }

const POR_NOMBRE = new Map(TOURS_DB.map((t) => [t.nombre, t.slug]));

function entero(v: unknown): number {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function texto(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/**
 * La gente de un renglón. 🔴 No se suman los tres campos de menores: el carrito
 * guarda `children` (los dos tramos juntos) ADEMÁS de `childrenMid` y
 * `childrenSmall`, y sumarlo todo contaba dos veces a cada niño —una familia de
 * cuatro ocupaba seis lugares—. Se toma la mayor de las dos formas.
 */
function personasDeRenglon(l: Record<string, unknown>): number {
  return entero(l.adults) + Math.max(entero(l.children), entero(l.childrenMid) + entero(l.childrenSmall));
}

/**
 * Los recorridos que ocupa una reserva: uno por renglón de tour, cada uno en su
 * fecha. 🔴 Un carrito guarda varios recorridos y solo el PRIMERO queda en
 * `tourSlug`/`tourDate`: contar las columnas dejaría fuera a los demás. Los
 * renglones sin recorrido (el traslado, un concepto escrito a mano) no ocupan
 * ninguna salida.
 *
 * Sin renglones —el checkout de un solo tour guarda nada más el `_meta`—, las
 * columnas son el recorrido y el grupo.
 */
export function salidasDeReserva(b: ReservaParaCupo): Salida[] {
  const renglones = Array.isArray(b.lineItems)
    ? (b.lineItems as unknown[]).filter(
        (l): l is Record<string, unknown> => !!l && typeof l === "object" && !(l as Record<string, unknown>)._meta,
      )
    : [];
  const deTour = renglones
    .map((l) => ({
      slug: texto(l.tourSlug) || POR_NOMBRE.get(texto(l.tourName)) || "",
      fecha: texto(l.tourDate),
      personas: personasDeRenglon(l),
    }))
    .filter((s) => s.slug && FECHA.test(s.fecha) && s.personas > 0);
  if (deTour.length) return deTour;
  if (!b.tourSlug || !FECHA.test(b.tourDate)) return [];
  return [{ slug: b.tourSlug, fecha: b.tourDate, personas: entero(b.adults) + entero(b.children) }];
}

/** Personas por recorrido y por fecha: `ocupacion.get(slug)?.get(fecha)`. Solo recorridos con cupo. */
export function ocupacionDe(reservas: ReservaParaCupo[]): Map<string, Map<string, number>> {
  const ocupacion = new Map<string, Map<string, number>>();
  for (const b of reservas) {
    if (b.status && NO_CUENTAN.includes(b.status)) continue;
    for (const s of salidasDeReserva(b)) {
      if (!tourConCupo(s.slug)) continue;
      const porFecha = ocupacion.get(s.slug) ?? new Map<string, number>();
      porFecha.set(s.fecha, (porFecha.get(s.fecha) ?? 0) + s.personas);
      ocupacion.set(s.slug, porFecha);
    }
  }
  return ocupacion;
}

/**
 * Las reservas que pueden tener algún recorrido entre `desde` y `hasta` (ver
 * `MARGEN_DIAS`) y, para el sitio, los apartados que siguen corriendo: van
 * como reservas de un renglón con estado «apartado», que no está en
 * `NO_CUENTAN`. `excluirApartado` es el del propio cliente (sus lugares no le
 * estorban a él); el panel pide `sinApartados` y cuenta solo reservas.
 */
async function reservasEntre(
  desde: string,
  hasta: string,
  { excluirApartado, sinApartados = false }: { excluirApartado?: string; sinApartados?: boolean } = {},
): Promise<ReservaParaCupo[]> {
  const [reservas, apartados] = await Promise.all([
    prisma.tourBooking.findMany({
      where: {
        status: { notIn: NO_CUENTAN },
        OR: [
          { tourDate: { gte: addDaysYMD(desde, -MARGEN_DIAS), lte: addDaysYMD(hasta, MARGEN_DIAS) } },
          // Las que no traen fecha arriba pueden traerla en sus renglones.
          { tourDate: "" },
        ],
      },
      select: { tourSlug: true, tourDate: true, adults: true, children: true, status: true, lineItems: true },
    }),
    sinApartados ? ([] as Apartado[]) : apartadosVigentes(excluirApartado),
  ]);
  return [
    ...reservas,
    ...apartados.flatMap((a) => a.lineas.map((l): ReservaParaCupo => ({
      tourSlug: l.slug, tourDate: l.fecha, adults: l.personas, children: 0, status: "apartado", lineItems: null,
    }))),
  ];
}

// ── Fechas cerradas a mano ──────────────────────────────────────────────────

/**
 * La clave de `Config` con las fechas que el equipo cerró para un recorrido
 * (río crecido, sin guía). Mismo patrón que el `cupo-manual:<slug>` de Xantolo.
 */
export function claveFechasCerradas(slug: string): string {
  return `fechas-cerradas:${slug}`;
}

/** Lo que guarda `Config`: un arreglo JSON de AAAA-MM-DD. Lo que no se entienda no cierra nada. */
export function leerFechasCerradas(valor: string | null | undefined): string[] {
  try {
    const v = JSON.parse(valor || "[]");
    return Array.isArray(v) ? v.filter((f): f is string => typeof f === "string" && FECHA.test(f)) : [];
  } catch {
    return [];
  }
}

async function fechasCerradasDe(slug: string): Promise<Set<string>> {
  const fila = await prisma.config.findUnique({ where: { key: claveFechasCerradas(slug) } });
  return new Set(leerFechasCerradas(fila?.value));
}

/** Las fechas cerradas de todos los recorridos (para el panel): `slug → fechas`. */
export async function todasLasFechasCerradas(): Promise<Map<string, string[]>> {
  const prefijo = claveFechasCerradas("");
  const filas = await prisma.config.findMany({ where: { key: { startsWith: prefijo } } });
  return new Map(filas.map((f) => [f.key.slice(prefijo.length), leerFechasCerradas(f.value)]));
}

/**
 * Cierra o abre una fecha de un recorrido y devuelve cómo quedó la lista. Se
 * guarda entera (es corta) y, de paso, sin las fechas que ya pasaron.
 */
export async function cambiarFechaCerrada(slug: string, fecha: string, cerrar: boolean): Promise<string[]> {
  const hoy = hoyMX();
  const fechas = await fechasCerradasDe(slug);
  if (cerrar) fechas.add(fecha);
  else fechas.delete(fecha);
  const lista = Array.from(fechas).filter((f) => f >= hoy).sort();
  const key = claveFechasCerradas(slug);
  await prisma.config.upsert({
    where:  { key },
    update: { value: JSON.stringify(lista) },
    create: { key, value: JSON.stringify(lista) },
  });
  return lista;
}

// ── Lo que pregunta el sitio ────────────────────────────────────────────────

/**
 * El estado de cada día de un recorrido entre dos fechas, para el calendario.
 * Vacío si el recorrido no lleva cupo. Lanza si la base falla: la ruta decide
 * qué hacer (el calendario se queda como antes y el cobro vuelve a contar).
 * `excluirApartado`: el apartado de quien mira, para no pintarle «no caben»
 * la fecha que él mismo tiene apartada.
 */
export async function disponibilidadDeTour(
  slug: string, desde: string, hasta: string, grupo: number, excluirApartado?: string,
): Promise<Record<string, EstadoDia>> {
  const t = tourConCupo(slug);
  if (!t) return {};
  const cupo = cupoDeTour(t)!;
  const [reservas, cerradas] = await Promise.all([reservasEntre(desde, hasta, { excluirApartado }), fechasCerradasDe(slug)]);
  const porFecha = ocupacionDe(reservas).get(slug) ?? new Map<string, number>();
  const dias: Record<string, EstadoDia> = {};
  const n = Math.min(diffDiasYMD(desde, hasta), RANGO_MAX_DIAS);
  for (let i = 0; i <= n; i++) {
    const f = addDaysYMD(desde, i);
    dias[f] = estadoDia(porFecha.get(f) ?? 0, { cupo, cerrada: cerradas.has(f), grupo, privada: esPrivadaDelDia(t) });
  }
  return dias;
}

/**
 * El estado de TODOS los recorridos en UN día, con una sola consulta.
 *
 * 🔴 Por qué no se resuelve llamando quince veces a `disponibilidadDeTour`
 * (9 oct 2026, «un botón para buscar lugares… que el resultado sea los tours
 * en los que hay lugares»): serían quince consultas a la base y quince lecturas
 * de `Config` por cada clic del visitante. `ocupacionDe` ya devuelve el mapa
 * completo `slug → fecha → personas` de una sola lectura, y
 * `todasLasFechasCerradas` hace lo propio con los días cerrados. Dos consultas
 * para los quince recorridos.
 *
 * `grupo` son las personas que quieren entrar: con él, un día con ocho
 * reservados sale `no-cabe` para un grupo de seis y `casi-lleno` para una
 * pareja. Es la misma cuenta que hace el cobro, así que lo que diga aquí es lo
 * que va a pasar al pagar.
 *
 * Los recorridos sin cupo por fecha (el RZR, que se cobra por vehículo) no
 * salen en el mapa: su tope son las unidades, no las personas, y decir de ellos
 * «sin lugar» sería falso.
 */
export async function disponibilidadDelDia(
  fecha: string,
  grupo: number,
): Promise<Record<string, EstadoDia>> {
  const [reservas, cerradas] = await Promise.all([
    reservasEntre(fecha, fecha),
    todasLasFechasCerradas(),
  ]);
  const ocupacion = ocupacionDe(reservas);
  const dias: Record<string, EstadoDia> = {};
  for (const t of TOURS_DB) {
    const cupo = cupoDeTour(t);
    if (cupo === null) continue;
    dias[t.slug] = estadoDia(ocupacion.get(t.slug)?.get(fecha) ?? 0, {
      cupo,
      cerrada: (cerradas.get(t.slug) ?? []).includes(fecha),
      grupo,
      privada: esPrivadaDelDia(t),
    });
  }
  return dias;
}

export interface PedidoDeCupo { slug: string; fecha: string; personas: number }

export interface SinCupo extends PedidoDeCupo {
  /** `sin-cupo`, `no-cabe` o `cerrada`. */
  estado: EstadoDia;
  /** Hasta dos días cercanos donde ese grupo sí cabe (AAAA-MM-DD). */
  alternativas: string[];
}

/** Hasta dónde se buscan días con lugar alrededor del que se pidió. */
const DIAS_ALREDEDOR = 7;

/**
 * Cuáles de estos recorridos YA NO caben en su fecha, con una sola consulta
 * para todos (el carrito trae varios). Los pedidos del mismo recorrido y día
 * se suman: dos renglones de 6 no caben donde quedan 8. Los recorridos sin
 * cupo (el RZR) y los pedidos sin fecha se dejan pasar.
 *
 * Si la base no contesta, también deja pasar (devuelve vacío) y lo anota en el
 * log: con 12 lugares y casi todos los días libres, perder la venta por un
 * tropiezo de la base cuesta más que el riesgo de pasarse. (El cupo de Xantolo
 * hace lo contrario a propósito: sus 4 cuartos se acaban de verdad.)
 *
 * `excluirApartado`: el apartado del carrito que pregunta (`lib/apartados.ts`,
 * el cobro del carrito). Sin él, sus propios lugares lo dejarían sin lugar.
 */
export async function pedidosSinCupo(
  pedidos: PedidoDeCupo[],
  { excluirApartado }: { excluirApartado?: string } = {},
): Promise<SinCupo[]> {
  const juntos = new Map<string, PedidoDeCupo>();
  for (const p of pedidos) {
    if (!FECHA.test(p.fecha) || !(p.personas > 0) || !tourConCupo(p.slug)) continue;
    const k = `${p.slug}|${p.fecha}`;
    const ya = juntos.get(k);
    juntos.set(k, { slug: p.slug, fecha: p.fecha, personas: (ya?.personas ?? 0) + p.personas });
  }
  if (!juntos.size) return [];

  try {
    const lista = Array.from(juntos.values());
    const fechas = lista.map((p) => p.fecha).sort();
    const slugs = Array.from(new Set(lista.map((p) => p.slug)));
    const [reservas, cerradasPorSlug] = await Promise.all([
      reservasEntre(fechas[0], fechas[fechas.length - 1], { excluirApartado }),
      Promise.all(slugs.map(async (s) => [s, await fechasCerradasDe(s)] as const)),
    ]);
    const ocupacion = ocupacionDe(reservas);
    const cerradas = new Map(cerradasPorSlug);
    const manana = addDaysYMD(hoyMX(), 1);

    const sinCupo: SinCupo[] = [];
    for (const p of lista) {
      const t = tourConCupo(p.slug)!;
      const cupo = cupoDeTour(t)!;
      const privada = esPrivadaDelDia(t);
      const porFecha = ocupacion.get(p.slug);
      const cerradasT = cerradas.get(p.slug) ?? new Set<string>();
      const estadoEn = (f: string) =>
        estadoDia(porFecha?.get(f) ?? 0, { cupo, cerrada: cerradasT.has(f), grupo: p.personas, privada });
      const estado = estadoEn(p.fecha);
      if (seElige(estado)) continue;
      // Lo más cerca primero, a los dos lados: un día después, uno antes…
      const alternativas: string[] = [];
      for (let d = 1; d <= DIAS_ALREDEDOR && alternativas.length < 2; d++) {
        for (const f of [addDaysYMD(p.fecha, d), addDaysYMD(p.fecha, -d)]) {
          if (alternativas.length < 2 && f >= manana && seElige(estadoEn(f))) alternativas.push(f);
        }
      }
      sinCupo.push({ ...p, estado, alternativas: alternativas.sort() });
    }
    return sinCupo;
  } catch (e) {
    console.error("cupoTour: no se pudo contar el cupo; se deja pasar:", e instanceof Error ? e.message : e);
    return [];
  }
}

/** ¿Cabe este grupo en ese recorrido ese día? Sin cupo que contar (el RZR), sí. */
export async function hayCupo(slug: string, fecha: string, personas: number, excluirApartado?: string): Promise<boolean> {
  return (await pedidosSinCupo([{ slug, fecha, personas }], { excluirApartado })).length === 0;
}

/** «sábado 10 de octubre» / «Saturday, October 10». */
function diaLargo(ymd: string, locale: "es" | "en"): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const fecha = new Date(Date.UTC(y, m - 1, d, 12));
  if (locale === "en") {
    return fecha.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });
  }
  const semana = fecha.toLocaleDateString("es-MX", { weekday: "long", timeZone: "UTC" });
  return `${semana} ${fecha.toLocaleDateString("es-MX", { day: "numeric", month: "long", timeZone: "UTC" })}`;
}

/**
 * Lo que se le dice al cliente (y lo que repite el bot): «El sábado 10 de
 * octubre ya no hay lugar para 4 personas en Expedición Tamul. Hay lugar el
 * viernes 9 de octubre. Elige otra fecha.»
 */
export function mensajeSinCupo(s: SinCupo, locale: "es" | "en" = "es"): string {
  const t = TOURS_DB.find((x) => x.slug === s.slug);
  const nombre = t ? localizeTour(t, locale).nombreCorto : s.slug;
  const dia = diaLargo(s.fecha, locale);
  const otras = s.alternativas.map((f) => diaLargo(f, locale));
  if (locale === "en") {
    const que = s.estado === "cerrada"
      ? `${nombre} doesn't run on ${dia}.`
      : `There's no room left for ${s.personas} ${s.personas === 1 ? "person" : "people"} on ${nombre} on ${dia}.`;
    return [que, otras.length ? `There's room on ${otras.join(" or ")}.` : "", "Please choose another date."].filter(Boolean).join(" ");
  }
  const que = s.estado === "cerrada"
    ? `El ${dia} no hay salida de ${nombre}.`
    : `El ${dia} ya no hay lugar para ${s.personas} ${s.personas === 1 ? "persona" : "personas"} en ${nombre}.`;
  return [que, otras.length ? `Hay lugar el ${otras.join(" o el ")}.` : "", "Elige otra fecha."].filter(Boolean).join(" ");
}

// ── Paquetes ────────────────────────────────────────────────────────────────

/**
 * Los recorridos de un paquete con su fecha, IGUAL que los graba la reserva
 * del sitio (`api/paquetes/send-confirmation`): el día N del itinerario cae
 * N−1 días después del inicio, y el día «a elegir» lleva el que eligió el
 * cliente; a la carta, los elegidos van en orden en los días de tour.
 * 🔴 Si allá cambia la forma de armar los renglones, cambia aquí: el cupo se
 * revisaría en otros días de los que después ocupa la reserva.
 */
export function toursDePaquete(
  p: Pick<Paquete, "itinerario" | "eleccionTour">, fechaInicio: string, elegidos: string[],
): { slug: string; fecha: string }[] {
  const aLaCarta = !p.itinerario.some((d) => d.tourSlug);
  const diasDeTour = p.itinerario.filter((d) => d.tipo === "tour");
  const dias = aLaCarta
    ? elegidos.map((slug, i) => ({ slug, dia: diasDeTour[i]?.dia ?? i + 1 }))
    : p.itinerario
        .filter((d) => d.tourSlug)
        .map((d) => ({
          slug: p.eleccionTour?.dia === d.dia && elegidos.length === 1 ? elegidos[0] : d.tourSlug!,
          dia: d.dia,
        }));
  return dias.map(({ slug, dia }) => ({ slug, fecha: addDaysYMD(fechaInicio, dia - 1) }));
}

// ── Lo que ve el panel ──────────────────────────────────────────────────────

/** Un recorrido en un día, como lo pinta el calendario del panel. */
export interface CupoDeTourEnDia {
  slug:     string;
  personas: number;
  cupo:     number;
  estado:   EstadoDia;
  cerrada:  boolean;
}

export interface ResumenCupoPanel {
  /** Los recorridos que llevan cupo por fecha (todos menos el RZR). */
  tours: { slug: string; nombre: string; cupo: number }[];
  /** Solo los días con alguien reservado o con algo cerrado; los demás están libres. */
  dias: Record<string, CupoDeTourEnDia[]>;
}

/**
 * El cupo de cada recorrido por día para el panel, con la misma cuenta que usa
 * el sitio. Recibe lo que el panel ya leyó (no vuelve a consultar). Aquí sí
 * van números: el equipo necesita saber cuántos van, no solo el color.
 */
export function resumenCupoPanel(reservas: ReservaParaCupo[], cerradas: Map<string, string[]>): ResumenCupoPanel {
  const ocupacion = ocupacionDe(reservas);
  const tours = TOURS_DB
    .filter((t) => cupoDeTour(t) !== null)
    .map((t) => ({ slug: t.slug, nombre: t.nombreCorto, cupo: cupoDeTour(t)!, privada: esPrivadaDelDia(t) }));
  const dias: Record<string, CupoDeTourEnDia[]> = {};
  for (const t of tours) {
    const porFecha = ocupacion.get(t.slug) ?? new Map<string, number>();
    const cerradasT = new Set(cerradas.get(t.slug) ?? []);
    const fechas = new Set([...Array.from(porFecha.keys()), ...Array.from(cerradasT)]);
    for (const f of Array.from(fechas)) {
      const personas = porFecha.get(f) ?? 0;
      const cerrada = cerradasT.has(f);
      (dias[f] ??= []).push({
        slug: t.slug, personas, cupo: t.cupo, cerrada,
        estado: estadoDia(personas, { cupo: t.cupo, cerrada, privada: t.privada }),
      });
    }
  }
  return { tours: tours.map(({ slug, nombre, cupo }) => ({ slug, nombre, cupo })), dias };
}

/** El mismo renglón de `resumenCupoPanel`, para UN recorrido y UN día (lo que devuelve el panel al cerrar o abrir). */
export async function cupoDeTourEnDia(slug: string, fecha: string): Promise<CupoDeTourEnDia | null> {
  const t = tourConCupo(slug);
  if (!t) return null;
  const cupo = cupoDeTour(t)!;
  // Solo reservas, como `resumenCupoPanel`: con los apartados, la cifra del día
  // brincaría al cerrar o abrir la fecha.
  const [reservas, cerradas] = await Promise.all([reservasEntre(fecha, fecha, { sinApartados: true }), fechasCerradasDe(slug)]);
  const personas = ocupacionDe(reservas).get(slug)?.get(fecha) ?? 0;
  const cerrada = cerradas.has(fecha);
  return { slug, personas, cupo, cerrada, estado: estadoDia(personas, { cupo, cerrada, privada: esPrivadaDelDia(t) }) };
}
