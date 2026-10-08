// Armar una cotización en el SERVIDOR, con la forma exacta del panel.
//
// Hasta oct 2026 cada ruta del bot guardaba un formato distinto (una reserva
// «borrador» con folio HP…, una cotización sin `_meta`, otra con el hotel
// marcado `_meta: "cotizado"` que el panel borraba) y cobraba con su propia
// cuenta, con la promo de HOY en vez de la de la fecha del recorrido. Aquí se
// juntan las dos cosas que importan:
//
//  1. El PRECIO sale de las mismas funciones con las que cobra la web
//     (`computeTourCharge`, `computeVehiculoCharge`, `computePaqueteCharge`):
//     promo según la FECHA del recorrido, viajero solo, tarifa de grupo del
//     Edén, add-ons. Lo que dice el bot = lo que dice la cotización = lo que
//     cobraría el sitio.
//  2. La FORMA es la del panel: renglones `LineItem` a precio de LISTA (lo que
//     calcula `calcTourLine`, que es como el panel cotiza desde el 1 oct),
//     habitaciones `PackageItem` con la tarifa del panel y el `_meta` de
//     `packageItems` que lee el editor. Así Erick abre y guarda una cotización
//     del bot sin que se mueva el total ni se pierda el hotel, y el PDF y el
//     correo dicen lo mismo al peso.
//
// `calcularCotizacionBot` es PURA (no toca la base): la usa `/api/bot/precio`,
// que solo pregunta. `guardarCotizacionBot` la llama y guarda.

import { randomInt } from "crypto";
import type { TourQuote } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  TOURS_DB, TOURS_LISTA, PROMO_TEMPORADA, PROMO_VENCE, fechaConPromo, precioDeFecha, promoVigente,
  precioGrupo, precioPorCabeza,
  type Tour, type TourVehiculo,
} from "@/lib/tours";
import { computeTourCharge, computeVehiculoCharge, fechaTourValida, vehiculoBookingName } from "@/lib/tourPricing";
import { computePaqueteCharge, MAX_POR_HABITACION, MAX_PERSONAS_PAQUETE } from "@/lib/paquetePricing";
import { PAQUETES_DB, eventoALaVenta, getPaquete, habitacionesDePaquete, paqueteEnFecha, paquetesEventoALaVenta, type Paquete } from "@/lib/paquetes";
import { minimoPersonas, CONFIRMA_SALIDA_DIAS } from "@/lib/tourBooking";
import { ANTICIPO_PCT } from "@/lib/carrito";
import { TOUR_REQUISITOS } from "@/lib/tourRequisitos";
import { repartirHuespedes } from "@/lib/hospedaje";
import { HABITACIONES_PANEL, tarifaPanel, type HabitacionPanel } from "@/lib/admin/habitacionesPanel";
import { cargarPaquete } from "@/lib/admin/paquetesPanel";
import { grupoParaGuardar, conMeta as conMetaReserva } from "@/lib/admin/reserva";
import { desgloseCotizacion } from "@/lib/admin/totalesCotizacion";
import { registrarEnBitacora, pesos, BOT, type Actor } from "@/lib/admin/bitacora";
import { lugaresDePaqueteSeguro } from "@/lib/cupoPaquete";
import { cabeEnCupo, textoLugares } from "@/lib/cupoEvento";
import { mensajeSinCupo, pedidosSinCupo } from "@/lib/cupoTour";
import { fechaLimite } from "@/lib/vencimientoCotizacion";
import { conMeta as conMetaSeguimiento, metaCotizacion as metaSeguimiento } from "@/lib/quoteFollowUp";
import { addDaysYMD, diffDiasYMD, hoyMX } from "@/lib/dates";
import type {
  CotizacionBotInput, CotizacionCalculada, ErrorPrecio, HospedajeCotizacionBot, HospedajePrecio,
  ItemCotizacionBot, ItemEntradaBot, ItemRzrBot, ItemTourBot, LineaGuardada, LineaPrecio, LineItem,
  LocaleBot, MetaCotizacionBot, PackageItem, PaqueteCotizacionBot, PaquetePrecio, PrecioBotInput,
  PromoLinea, RespuestaPrecioBot, ResultadoReemplazo,
} from "./tipos";

/** Tope de recorridos sueltos por cotización (el mismo del paquete a la medida de antes). */
export const MAX_RECORRIDOS = 8;
/** Lo que `computeVehiculoCharge` acepta; arriba de eso recortaba en silencio. */
const MAX_UNIDADES = 10;
/** Más noches sueltas que esto ya no es una cotización de bot. */
const MAX_NOCHES = 30;

/**
 * El hotel de los renglones de hospedaje: el mismo texto que pone el panel al
 * agregar una habitación (`EMPTY_PACKAGE.hotel` en ReservaModal.tsx). Se
 * escribe aquí porque ese archivo es "use client" y de él solo salen tipos.
 */
export const HOTEL_PARAISO = "Hotel Paraíso Encantado, Xilitla";

/** El slug reservado de los conceptos escritos a mano (`SLUG_PERSONALIZADO` del panel). */
const SLUG_PERSONALIZADO = "__personalizado";

/** El 30 %, la regla única del sitio (`ANTICIPO_PCT`). */
const PCT = ANTICIPO_PCT;

// ── Utilidades ──────────────────────────────────────────────────────────────

/** Texto limpio y con tope: lo que llega del bot es lo que escribió un cliente. */
function texto(v: unknown, max = 200): string {
  return String(v ?? "").trim().slice(0, max);
}

/** Entero ≥ 0. Lo que no es número cuenta como 0. */
function entero(v: unknown): number {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Para comparar nombres: sin acentos, sin mayúsculas, guiones como espacios. */
function norm(v: unknown): string {
  return String(v ?? "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[-_]/g, " ").replace(/\s+/g, " ").trim();
}

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

/** ¿YYYY-MM-DD de un día que existe? (2026-02-30 no). */
function fechaReal(f: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f)) return false;
  const [y, m, d] = f.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/**
 * Por qué NO se puede cotizar esa fecha, o null si se puede.
 *
 * «Para hoy» no se cotiza en automático: no hay forma de saber si queda salida
 * y es la venta que más se cae (la matriz de escalamiento la pasa al equipo).
 */
function problemaDeFecha(fecha: string, que: string): string | null {
  if (!fecha) return `Falta la fecha de ${que} (AAAA-MM-DD).`;
  if (!fechaReal(fecha)) return `La fecha «${fecha}» de ${que} no es válida: usa AAAA-MM-DD.`;
  const hoy = hoyMX();
  if (fecha < hoy) return `La fecha de ${que} (${fecha}) ya pasó.`;
  if (fecha === hoy) return `${que.charAt(0).toUpperCase()}${que.slice(1)} es para HOY (${fecha}): eso no se cotiza en automático, lo confirma el equipo.`;
  if (!fechaTourValida(fecha)) return `La fecha de ${que} (${fecha}) está a más de un año: todavía no abrimos esas salidas.`;
  return null;
}

/**
 * El anticipo de un tour para mañana tiene que llegar antes de las 10 pm
 * (regla del equipo: es cuando se arma la logística de la mañana).
 */
export const CORTE_MANANA_MIN = 22 * 60;

/** Minutos transcurridos del día en México (el servidor corre en UTC). */
export function minutosDelDiaMX(d: Date = new Date()): number {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Mexico_City", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(d);
  const v = (t: string) => Number(partes.find((p) => p.type === t)?.value ?? 0) || 0;
  return (v("hour") % 24) * 60 + v("minute");
}

/** Lo que hay que decir de una fecha que SÍ se cotiza. */
function avisosDeFecha(fecha: string): string[] {
  if (fecha !== addDaysYMD(hoyMX(), 1)) return [];
  // De 10 pm a medianoche «antes de las 10 pm» es un plazo que ya pasó.
  return minutosDelDiaMX() >= CORTE_MANANA_MIN
    ? ["Es para MAÑANA y ya pasan de las 10 pm: no le pidas pagar antes de las 10 pm; el equipo le confirma a primera hora si hay salida."]
    : ["Es para MAÑANA: el anticipo tiene que llegar antes de las 10 pm y el equipo confirma la salida."];
}

/**
 * Busca por nombre aproximado: primero exacto y luego «contiene», en los dos
 * sentidos. El bot manda lo que dijo el cliente («nanacatli», «el defender
 * familiar») y no tiene por qué memorizar los nombres literales del catálogo.
 * Si «contiene» atina a varios, se devuelven todos para preguntar cuál.
 */
function buscarPorNombre<T>(lista: T[], pedido: unknown, nombre: (x: T) => string, quitar?: RegExp): { item?: T; ambiguos?: T[] } {
  const limpia = (s: string) => (quitar ? s.replace(quitar, "") : s).trim();
  const p = limpia(norm(pedido));
  if (!p) return {};
  const n = (x: T) => limpia(norm(nombre(x)));
  const exacto = lista.find((x) => n(x) === p);
  if (exacto) return { item: exacto };
  const parecidos = lista.filter((x) => n(x).includes(p) || p.includes(n(x)));
  if (parecidos.length === 1) return { item: parecidos[0] };
  return parecidos.length ? { ambiguos: parecidos } : {};
}

function tourPorSlug(slug: string): Tour | undefined {
  return slug ? TOURS_DB.find((t) => t.slug === slug || t.id === slug) : undefined;
}

/** "6 adultos + 2 niños" → 8. Es cuánta gente sube a UNA unidad. */
function capacidadDe(v: TourVehiculo): number {
  return (String(v.capacidad).match(/\d+/g) ?? []).reduce((s, n) => s + Number(n), 0);
}

/**
 * La promo de temporada baja de un recorrido EN ESA FECHA. Se dice también
 * cuando no aplica pero sigue viva, para que el bot pueda contestar «si lo
 * mueves antes del 29 de octubre te sale en…».
 */
function promoDeTour(t: Tour, fecha: string): PromoLinea {
  if (!(PROMO_TEMPORADA.tours as ReadonlySet<string>).has(t.slug)) return { aplica: false };
  const lista = t.precioLista ?? t.precio;
  if (fechaConPromo(fecha)) return { aplica: true, precioLista: lista, precioPromo: precioDeFecha(t, fecha), vence: PROMO_VENCE };
  return promoVigente() ? { aplica: false, precioLista: lista, vence: PROMO_VENCE } : { aplica: false, precioLista: lista };
}

/**
 * Lo que vale un renglón para EL PANEL: copia exacta de `calcTourLine`
 * (ReservaModal.tsx, que es "use client" y no se puede importar aquí). Precio
 * de lista de `TOURS_LISTA`, 70 % / 50 % para menores, matriz flota × ruta en
 * el RZR, actividades opcionales a precio de catálogo y, en los conceptos a
 * mano, su precio por persona.
 *
 * 🔴 Se guarda ESTE número como `subtotal`: es el que recalculan el editor al
 * guardar y el PDF al imprimir. Si se guardara el cobrado (con promo), el
 * correo y el PDF del mismo folio enseñarían renglones distintos, y la primera
 * vez que Erick guardara la cotización los renglones cambiarían solos.
 */
export function subtotalPanel(l: LineItem): number {
  if (l.tourSlug === SLUG_PERSONALIZADO) {
    const p = Math.max(0, Number(l.precioPersona) || 0);
    return p * Math.max(0, l.adults || 0)
         + Math.round(p * 0.7) * (l.childrenMid ?? 0)
         + Math.round(p * 0.5) * (l.childrenSmall ?? 0);
  }
  const t = TOURS_LISTA.find((x) => x.slug === l.tourSlug);
  if (!t) return 0;
  const personas = (l.adults || 0) + (l.childrenMid ?? 0) + (l.childrenSmall ?? 0);
  // 🔴 Tarifa del GRUPO completo (el Edén): una sola cifra para todos, igual que
  // `calcTourLine`. Faltaba aquí también: un Edén de 4 salía en $11,960
  // ($2,990 × 4) contra los $3,480 del escalón de cuatro que cobra la web.
  const delGrupo = precioGrupo(t, personas);
  // Lo que paga cada cabeza: lista menos el escalón del tamaño del grupo
  // (`escalaPersona`, desde 3 personas). TOURS_LISTA no lleva promo, así que
  // aquí siempre aplica la escalera, como en el editor del panel.
  const porCabeza = precioPorCabeza(t, personas);
  const base = delGrupo !== null
    ? delGrupo
    : (t.precioUnidad === "vehiculo" && t.rutas && t.flota)
    ? (() => {
        const rutaIdx  = Math.max(0, t.rutas!.findIndex((r) => r.nombre === l.ruta));
        const veh      = t.flota!.find((v) => v.nombre === l.vehiculo) ?? t.flota![0];
        const unidades = Math.max(1, l.unidades ?? 1);
        return (veh?.precios[rutaIdx] ?? t.precio) * unidades;
      })()
    : (
        porCabeza * l.adults +
        Math.round(porCabeza * 0.7) * (l.childrenMid   ?? 0) +
        Math.round(porCabeza * 0.5) * (l.childrenSmall ?? 0)
      );
  const cat = t.addOns ?? [];
  const addOns = cat.length
    ? (l.addOns ?? []).reduce((s, a) => {
        const def = cat.find((x) => x.id === a.id);
        return def ? s + def.precio * Math.max(0, a.cantidad || 0) : s;
      }, 0)
    : 0;
  return base + addOns;
}

/** Lo que vale una habitación para el panel (`calcPackageLine`). */
const subtotalHabitacion = (p: Pick<PackageItem, "precioPorNoche" | "noches" | "habitaciones">) =>
  p.precioPorNoche * p.noches * p.habitaciones;

/** Solo dígitos. */
const digitos = (v: unknown) => String(v ?? "").replace(/\D/g, "");

/**
 * El teléfono REAL del cliente: el que mandó el bot o, si el chat es `@c.us`,
 * los dígitos del chat (ahí sí son el número). Un `@lid` NO es un teléfono:
 * de ahí no se saca nada, o el recordatorio iría a un número que no existe.
 */
export function telefonoReal(telefono?: string | null, waChatId?: string | null): string | null {
  const t = digitos(telefono);
  if (t.length >= 10 && t.length <= 15) return t;
  const chat = String(waChatId ?? "");
  if (/@c\.us$/.test(chat)) {
    const d = digitos(chat.split("@")[0]);
    if (d.length >= 10 && d.length <= 15) return d;
  }
  return null;
}

type Resultado<T> = ({ ok: true } & T) | { ok: false; motivo: string };
const falla = (motivo: string): { ok: false; motivo: string } => ({ ok: false, motivo });

// ── Habitaciones ────────────────────────────────────────────────────────────

const RE_MONTANA  = /monta|jungla|vista|suite/;
const RE_ESTANDAR = /estandar|selva|jardin|normal|sencilla|doble|king|matrimonial|basica/;

interface HabitacionLeida {
  /** Las del panel que coinciden con lo que pidió (varias si es ambiguo: «lirios»). */
  candidatas?: HabitacionPanel[];
  categoria?:  "montana" | "estandar";
  /** Lo pidió y no existe. */
  desconocida?: string;
}

/** Qué habitación pidió, con la lista REAL del hotel (la misma que ofrece el panel). */
function leerHabitacion(pedido: unknown): HabitacionLeida {
  const p = norm(pedido);
  if (!p) return {};
  const r = buscarPorNombre(HABITACIONES_PANEL, pedido, (h) => h.label);
  if (r.item) return { candidatas: [r.item] };
  if (r.ambiguos?.length) return { candidatas: r.ambiguos };
  if (RE_MONTANA.test(p))  return { categoria: "montana" };
  if (RE_ESTANDAR.test(p)) return { categoria: "estandar" };
  return { desconocida: texto(pedido, 80) };
}

const tarifaBase = (h: HabitacionPanel) => h.tarifas[2] ?? h.tarifas[1] ?? Number.MAX_SAFE_INTEGER;

/** La primera habitación de esa categoría en la que caben: la estándar, la más barata. */
function habitacionDeCategoria(categoria: "montana" | "estandar", ocupacion: number): HabitacionPanel | undefined {
  const caben = HABITACIONES_PANEL.filter((h) => h.maxHuespedes >= ocupacion);
  if (categoria === "montana") return caben.find((h) => h.vistaMontana);
  return caben.filter((h) => !h.vistaMontana).sort((a, b) => tarifaBase(a) - tarifaBase(b))[0];
}

/**
 * Los renglones de hospedaje: uno por cada ocupación distinta, porque
 * `PackageItem.huespedes` es la gente de CADA habitación del renglón y de eso
 * depende la tarifa (5 personas en 2 cuartos = uno de 3 y uno de 2).
 */
function filasHabitacion(
  etiqueta: string, tarifa: (huespedes: number) => number,
  reparto: number[], noches: number, checkin: string,
): PackageItem[] {
  const checkout = checkin ? addDaysYMD(checkin, noches) : "";
  const ocupaciones = Array.from(new Set(reparto)).sort((x, y) => y - x);
  return ocupaciones.map((huespedes) => {
    const habitaciones   = reparto.filter((n) => n === huespedes).length;
    const precioPorNoche = tarifa(huespedes);
    const fila: PackageItem = {
      habitacion: etiqueta, hotel: HOTEL_PARAISO, noches, habitaciones, precioPorNoche,
      checkin, checkout, subtotal: 0, huespedes,
    };
    fila.subtotal = subtotalHabitacion(fila);
    return fila;
  });
}

/** El reparto que mandó el cliente, si cuadra con el motor de paquetes; si no, null. */
function repartoValido(reparto: unknown, personas: number, habitaciones: number): number[] | null {
  if (!Array.isArray(reparto)) return null;
  const r = reparto.map((n) => entero(n));
  const ok = r.length === habitaciones
    && r.every((n) => n >= 1 && n <= MAX_POR_HABITACION)
    && r.reduce((a, b) => a + b, 0) === personas;
  return ok ? r : null;
}

// ── Recorridos ──────────────────────────────────────────────────────────────

interface LineaArmada {
  linea:    LineaPrecio;
  guardada: LineaGuardada;
  personas: number;
  notas:    string[];
}

/** El tipo del renglón: se acepta sin `tipo` (contrato `ItemBot`) y se deduce del catálogo. */
function normalizarItem(crudo: ItemEntradaBot): ItemCotizacionBot {
  const r = (crudo ?? {}) as Record<string, unknown>;
  const slug = texto(r.slug ?? r.tourSlug, 80);
  const tour = tourPorSlug(slug);
  const conVehiculo = !!(texto(r.ruta) || texto(r.vehiculo));
  const esRzr = r.tipo === "rzr" || tour?.precioUnidad === "vehiculo" || (!tour && conVehiculo);
  if (esRzr) {
    return {
      tipo: "rzr", slug: slug || undefined, tourDate: texto(r.tourDate, 10),
      ruta: texto(r.ruta, 80), vehiculo: texto(r.vehiculo, 80),
      unidades: entero(r.unidades) || undefined, personas: entero(r.personas) || undefined,
      hora: texto(r.hora, 10) || undefined,
    };
  }
  return {
    tipo: "tour", slug, tourDate: texto(r.tourDate, 10),
    adultos: entero(r.adultos ?? r.adults), ninosMid: entero(r.ninosMid ?? r.childrenMid),
    ninosSmall: entero(r.ninosSmall ?? r.childrenSmall),
    addOns: Array.isArray(r.addOns) ? (r.addOns as { id: string; cantidad: number }[]) : undefined,
  };
}

/**
 * Un recorrido por persona (o por grupo), cobrado con `computeTourCharge`.
 * `panel`: la arma alguien del equipo, y el tope en línea de la salida no
 * aplica (ver `OpcionesCotizacion`).
 */
function lineaTour(item: ItemTourBot, panel = false): Resultado<LineaArmada> {
  const tour = tourPorSlug(texto(item.slug, 80));
  if (!tour) return falla(`No existe el recorrido «${texto(item.slug, 80)}».`);
  const nombre = tour.nombreCorto;
  const fecha = texto(item.tourDate, 10);
  const malFecha = problemaDeFecha(fecha, nombre);
  if (malFecha) return falla(malFecha);

  const a = entero(item.adultos), m = entero(item.ninosMid), s = entero(item.ninosSmall);
  const personas = a + m + s;
  // `computeTourCharge` devuelve null sin decir por qué, y además RECORTA en
  // silencio los adultos al cupo. Las reglas se revisan aquí antes, una por
  // una, para que el bot pueda explicarle al cliente qué falló.
  if (a < 1) return falla(`${nombre}: hace falta al menos un adulto.`);
  // 🔴 Un grupo más grande que la salida NO es una cotización automática: es
  // un chat que pasa al equipo, que sabe si sale otra unidad. Por eso el motivo
  // lo dice así, para que el bot no lo intente partir ni lo cotice a su modo.
  if (personas > tour.groupMax && !panel) {
    return falla(`${nombre} se aparta en línea para máximo ${tour.groupMax} personas por salida y son ${personas}. Un grupo así se cotiza a mano: lo ve el equipo (otra unidad o una salida privada).`);
  }
  if (personas < minimoPersonas(tour)) {
    return falla(`${nombre} sale con mínimo ${plural(tour.groupMin, "persona", "personas")} y son ${personas}.`);
  }
  const req = TOUR_REQUISITOS[tour.id];
  if (tour.soloAdultos && m + s > 0) {
    return falla(`${nombre} es solo para adultos${req?.edadMinima ? ` (desde ${req.edadMinima} años)` : ""}: no lleva precio de niño.`);
  }

  const avisos = avisosDeFecha(fecha);
  // 🔴 La edad mínima NO bloquea: Manolo la dejó informativa el 2 oct (la web
  // vende boleto de niño en esos recorridos) y el equipo hace excepciones. Va
  // como aviso para que el bot pregunte y, si toca, lo pase al equipo.
  if (req?.edadMinima && s > 0) {
    avisos.push(`${nombre} es desde ${req.edadMinima} años y van menores de 6: confírmalo con el equipo antes de apartar.`);
  } else if (req?.edadMinima && req.edadMinima > 6 && m > 0) {
    avisos.push(`${nombre} es desde ${req.edadMinima} años: pregunta la edad exacta de los niños de 6 a 10.`);
  }

  const pedidos = (Array.isArray(item.addOns) ? item.addOns : [])
    .map((x) => ({ id: texto(x?.id, 60), cantidad: entero(x?.cantidad) }))
    .filter((x) => x.id && x.cantidad > 0);
  for (const x of pedidos) {
    if (!(tour.addOns ?? []).some((c) => c.id === x.id)) {
      avisos.push(`«${x.id}» no es una actividad de ${nombre}: no se cobró.`);
    }
  }

  const charge = computeTourCharge({
    tourSlug: tour.slug, adults: a, childrenMid: m, childrenSmall: s,
    addOns: pedidos, tourDate: fecha, pct: 100,
    // Solo el panel cotiza arriba del tope de la salida; el bot, nunca.
    sinTopeDeCupo: panel,
  });
  if (!charge) return falla(`${nombre}: no se pudo cotizar con esos datos.`);

  const porGrupo = !!tour.tarifaGrupo?.length;
  const linea: LineaPrecio = {
    slug: tour.slug, nombre: tour.nombre, tourDate: fecha,
    cobro: porGrupo ? "grupo" : "persona",
    personas, adultos: a, ninosMid: m, ninosSmall: s,
    total: charge.total,
    ...(porGrupo ? {} : { porPersona: charge.tour.precio }),
    promo: porGrupo ? { aplica: false } : promoDeTour(tour, fecha),
    ...(charge.viajeroSolo ? { viajeroSolo: true } : {}),
    ...(charge.addOns.length ? { addOns: charge.addOns } : {}),
    ...(avisos.length ? { avisos } : {}),
  };
  const guardada: LineaGuardada = {
    tourSlug: tour.slug, tourName: tour.nombre, tourDate: fecha,
    adults: a, childrenMid: m, childrenSmall: s, subtotal: 0,
    ...(charge.addOns.length ? { addOns: charge.addOns } : {}),
    // Viaja con el renglón: el correo le explica la tarifa al cliente.
    ...(charge.viajeroSolo ? { viajeroSolo: true } : {}),
  };
  guardada.subtotal = subtotalPanel(guardada);

  const notas: string[] = [];
  // Va bajo el mínimo (Manolo, 8 oct 2026): paga tarifa normal y la salida se
  // confirma CONFIRMA_SALIDA_DIAS días antes; si no se junta, se devuelve todo.
  // La nota es para el equipo: qué día hay que confirmarle o devolverle.
  if (charge.viajeroSolo) {
    const d = new Date(`${fecha}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - CONFIRMA_SALIDA_DIAS);
    const confirmarEl = d.toISOString().slice(0, 10);
    notas.push(`${nombre} (${fecha}) va bajo el mínimo: ${personas} de ${tour.groupMin}. Confirmarle la salida a más tardar el ${confirmarEl}; si no se junta el mínimo, devolverle el 100 %.`);
  }
  return { ok: true, linea, guardada, personas, notas };
}

/**
 * La hora de inicio del RZR: la elige el cliente entre 9:00 am y 5:00 pm
 * (decisión de Manolo del 6 oct). «5» o «3:30» sin am/pm se leen de la tarde,
 * que es lo único que cabe en esa ventana.
 */
function horaRzr(v: unknown): { hora?: string; motivo?: string } {
  const t = texto(v, 12).toLowerCase().replace(/\s+/g, "").replace(/\./g, "");
  if (!t) return {};
  const m = t.match(/^(\d{1,2})(?::?(\d{2}))?(am|pm|hrs?|h)?$/);
  if (!m) return { motivo: `La hora «${texto(v, 12)}» no se entiende: usa HH:MM (de 09:00 a 17:00).` };
  let h = Number(m[1]);
  const min = Number(m[2] ?? 0);
  if (m[3] === "pm" && h < 12) h += 12;
  if (m[3] === "am" && h === 12) h = 0;
  if (!m[3] && h >= 1 && h <= 5) h += 12;
  if (h > 23 || min > 59) return { motivo: `La hora «${texto(v, 12)}» no existe.` };
  const minutos = h * 60 + min;
  if (minutos < 9 * 60 || minutos > 17 * 60) {
    return { motivo: "El RZR arranca a la hora que elija el cliente, entre 9:00 am y 5:00 pm." };
  }
  return { hora: `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}` };
}

/** Un recorrido por vehículo (RZR): ruta × unidad × unidades, y que quepan. */
function lineaRzr(item: ItemRzrBot): Resultado<LineaArmada> {
  const slug = texto(item.slug, 80);
  const tour = slug ? tourPorSlug(slug) : TOURS_DB.find((t) => t.precioUnidad === "vehiculo");
  if (!tour || tour.precioUnidad !== "vehiculo" || !tour.rutas?.length || !tour.flota?.length) {
    return falla(slug ? `«${slug}» no es un recorrido por vehículo.` : "No hay recorrido por vehículo en el catálogo.");
  }
  const nombre = tour.nombreCorto;
  const fecha = texto(item.tourDate, 10);
  // Sin fecha se cotiza igual: el bot de antes no siempre la mandaba y el
  // precio del RZR no cambia con la fecha. Si viene, tiene que ser una que se pueda.
  const malFecha = fecha ? problemaDeFecha(fecha, nombre) : null;
  if (malFecha) return falla(malFecha);

  const h = horaRzr(item.hora);
  if (h.motivo) return falla(h.motivo);

  const rutas = tour.rutas.map((r) => r.nombre).join(", ");
  const ruta = buscarPorNombre(tour.rutas, item.ruta, (r) => r.nombre, /^ruta /);
  if (!ruta.item) {
    return falla(ruta.ambiguos
      ? `¿Cuál ruta? ${ruta.ambiguos.map((r) => r.nombre).join(" o ")}.`
      : `${texto(item.ruta) ? `No existe la ruta «${texto(item.ruta, 80)}»` : "Falta la ruta"}. Rutas: ${rutas}.`);
  }
  const flota = tour.flota.map((v) => `${v.nombre} (${v.capacidad})`).join(", ");
  const veh = buscarPorNombre(tour.flota, item.vehiculo, (v) => v.nombre);
  if (!veh.item) {
    return falla(veh.ambiguos
      ? `¿Cuál vehículo? ${veh.ambiguos.map((v) => v.nombre).join(" o ")}.`
      : `${texto(item.vehiculo) ? `No existe el vehículo «${texto(item.vehiculo, 80)}»` : "Falta el vehículo"}. Flota: ${flota}.`);
  }

  const personas = entero(item.personas);
  const cabe = capacidadDe(veh.item);
  const unidades = entero(item.unidades) || (personas > 0 && cabe > 0 ? Math.ceil(personas / cabe) : 1);
  if (unidades > MAX_UNIDADES) return falla(`Máximo ${MAX_UNIDADES} vehículos por reserva: para más, lo arma el equipo.`);
  if (personas > 0 && cabe > 0 && personas > cabe * unidades) {
    return falla(
      `No caben ${personas} personas en ${plural(unidades, "unidad", "unidades")} ${veh.item.nombre} (cada una lleva ${veh.item.capacidad}). ` +
      `Hacen falta ${Math.ceil(personas / cabe)} unidades o un vehículo más grande. Flota: ${flota}.`,
    );
  }

  const charge = computeVehiculoCharge({
    tourSlug: tour.slug, ruta: ruta.item.nombre, vehiculo: veh.item.nombre, unidades, pct: 100,
  });
  if (!charge) return falla(`${nombre}: no se pudo cotizar ${ruta.item.nombre} en ${veh.item.nombre}.`);

  const nombreLinea = vehiculoBookingName(tour, charge.ruta.nombre, charge.vehiculo.nombre, charge.unidades);
  const avisos = fecha ? avisosDeFecha(fecha) : ["Sin fecha: pregúntala antes de apartar."];
  const linea: LineaPrecio = {
    slug: tour.slug, nombre: nombreLinea, tourDate: fecha, cobro: "vehiculo",
    personas, adultos: personas, ninosMid: 0, ninosSmall: 0,
    total: charge.total, promo: { aplica: false },
    ruta: charge.ruta.nombre, vehiculo: charge.vehiculo.nombre, unidades: charge.unidades,
    capacidad: cabe, capacidadTexto: charge.vehiculo.capacidad,
    ...(h.hora ? { hora: h.hora } : {}),
    ...(avisos.length ? { avisos } : {}),
  };
  // En el panel el RZR va SIN personas (`adults: 0`, como lo deja el editor):
  // el precio es por unidad y el grupo vive en `numPersonas`.
  const guardada: LineaGuardada = {
    tourSlug: tour.slug, tourName: nombreLinea, tourDate: fecha,
    adults: 0, childrenMid: 0, childrenSmall: 0, subtotal: 0,
    ruta: charge.ruta.nombre, vehiculo: charge.vehiculo.nombre, unidades: charge.unidades,
    ...(h.hora ? { hora: h.hora } : {}),
  };
  guardada.subtotal = subtotalPanel(guardada);

  const notas = h.hora ? [`${nombreLinea} (${fecha}): arranca a las ${h.hora}.`] : [];
  return { ok: true, linea, guardada, personas, notas };
}

// ── Paquetes ────────────────────────────────────────────────────────────────

/** Por qué `computePaqueteCharge` dijo que no, con las mismas reglas que él. */
function motivoPaquete(p: Paquete, adultos: number, personas: number): string {
  const ev = p.evento;
  if (ev?.sinHotel) {
    if (adultos < ev.minAdultos) return `${p.nombre}: mínimo ${plural(ev.minAdultos, "adulto", "adultos")}.`;
    if (personas > ev.maxPorReserva) return `${p.nombre}: máximo ${ev.maxPorReserva} personas por reserva.`;
    return `${p.nombre}: no se pudo cotizar con esos datos.`;
  }
  if (adultos < 2) {
    return `${p.nombre} es desde 2 adultos (el precio es por pareja). Para una sola persona se arma el viaje a la medida: recorridos más hotel.`;
  }
  if (personas > MAX_PERSONAS_PAQUETE) return `Más de ${MAX_PERSONAS_PAQUETE} personas en un paquete se cotiza a mano: lo ve el equipo.`;
  if (ev) {
    if (adultos < ev.minAdultos) return `${p.nombre}: mínimo ${plural(ev.minAdultos, "adulto", "adultos")}.`;
    if (personas > ev.maxPorReserva) return `${p.nombre}: máximo ${ev.maxPorReserva} personas (un cuarto por reserva).`;
    if (ev.extraEventoPorPersona == null && personas !== 2) return `${p.nombre} es solo para parejas.`;
  }
  return `${p.nombre}: no se pudo cotizar con esos datos.`;
}

/**
 * Los recorridos de un paquete del catálogo, como los carga el panel
 * (`cargarPaquete`: un renglón por día de tour, en días seguidos), con lo que
 * el panel deja para después: los niños, el recorrido que eligió, la ruta del
 * RZR del itinerario y la actividad opcional que el paquete ya incluye.
 */
function lineasDePaquete(
  p: Paquete, fecha: string, a: number, m: number, s: number, elegidos: string[],
  avisos: string[], notas: string[],
): LineaGuardada[] {
  const carga = cargarPaquete(p.slug, fecha, a, 0, "", HOTEL_PARAISO);
  if (!carga) return [];
  const dias = p.itinerario.filter((d) => d.tipo === "tour");
  const e = p.eleccionTour;
  const personas = a + m + s;
  // A la carta (sin día fijo) se reparten en el orden en que los eligió, igual
  // que la reserva del sitio, y los días que faltan se quedan con lo que
  // precarga el panel sin repetir lo ya elegido. Con día fijo solo cambia ése.
  const aLaCarta = !!e && e.dia === undefined;
  const orden = aLaCarta
    ? [...elegidos, ...carga.lineas.map((l) => l.tourSlug).filter((x) => elegidos.indexOf(x) === -1)]
    : [];

  return carga.lineas.map((l, i) => {
    const dia = dias[i];
    let slug = l.tourSlug;
    if (aLaCarta && orden[i]) slug = orden[i];
    else if (e && e.dia !== undefined && dia?.dia === e.dia && elegidos[0]) slug = elegidos[0];
    const t = TOURS_LISTA.find((x) => x.slug === slug);
    const linea: LineaGuardada = {
      ...l, tourSlug: slug, tourName: t?.nombre ?? l.tourName,
      adults: a, childrenMid: m, childrenSmall: s,
    };

    if (t && t.precioUnidad === "vehiculo" && t.rutas?.length && t.flota?.length) {
      const ruta = t.rutas.find((r) => r.nombre === dia?.rutaVehiculo) ?? t.rutas[0];
      const veh  = t.flota[0];
      Object.assign(linea, {
        ruta: ruta.nombre, vehiculo: veh.nombre, unidades: 1,
        adults: 0, childrenMid: 0, childrenSmall: 0,
        tourName: vehiculoBookingName(t, ruta.nombre, veh.nombre, 1),
      });
      const cabe = capacidadDe(veh);
      if (cabe > 0 && personas > cabe) {
        const msg = `El paquete trae 1 ${veh.nombre} (${veh.capacidad}) y son ${personas}: el equipo confirma cuántas unidades.`;
        avisos.push(msg);
        notas.push(msg);
      }
    } else if (t && dia?.addOns?.length) {
      const addOns = dia.addOns
        .map((id) => (t.addOns ?? []).find((x) => x.id === id))
        .filter((x): x is NonNullable<typeof x> => !!x)
        .map((x) => ({ id: x.id, nombre: x.nombre, cantidad: personas, precio: x.precio, subtotal: x.precio * personas }));
      if (addOns.length) linea.addOns = addOns;
    }
    linea.subtotal = subtotalPanel(linea);
    return linea;
  });
}

/**
 * Los renglones de un paquete de EVENTO (Xantolo), que el panel no sabe
 * cargar: los recorridos de su itinerario y la parte propia del evento como
 * concepto a mano. Sin hotel, el evento entero es un concepto por persona; con
 * hotel, la parte de la noche vale lo que paga cada persona extra
 * (`extraEventoPorPersona`).
 */
function lineasDeEvento(p: Paquete, a: number, m: number, s: number): LineaGuardada[] {
  const ev = p.evento!;
  const lineas: LineaGuardada[] = [];
  for (const d of p.itinerario) {
    if (d.tipo !== "tour" || !d.tourSlug) continue;
    const t = TOURS_LISTA.find((x) => x.slug === d.tourSlug);
    if (!t || t.precioUnidad === "vehiculo") continue;
    const l: LineaGuardada = {
      tourSlug: t.slug, tourName: t.nombre, tourDate: addDaysYMD(ev.fecha, d.dia - 1),
      adults: a, childrenMid: m, childrenSmall: s, subtotal: 0,
    };
    l.subtotal = subtotalPanel(l);
    lineas.push(l);
  }
  const precioPersona = ev.sinHotel ? p.precio : ev.extraEventoPorPersona;
  if (precioPersona) {
    const l: LineaGuardada = {
      tourSlug: SLUG_PERSONALIZADO,
      tourName: ev.sinHotel ? `${p.nombre} · ${ev.fechaTexto}` : `Degustación y noche con guía · ${p.nombre}`,
      tourDate: ev.fecha, adults: a, childrenMid: m, childrenSmall: s, precioPersona, subtotal: 0,
    };
    l.subtotal = subtotalPanel(l);
    lineas.push(l);
  }
  return lineas;
}

/**
 * El cuarto de un paquete: el que pidió si cabe y es de la vista que se cobró;
 * si no, uno de esa vista. El precio lo pone el motor de paquetes; este
 * renglón dice QUÉ cuarto se le da.
 */
function habitacionDePaquete(
  p: Paquete, leida: HabitacionLeida, montana: boolean, ocupacion: number, avisos: string[],
): HabitacionPanel {
  const pedidas = leida.candidatas ?? [];
  const caben = pedidas.filter((h) => h.maxHuespedes >= ocupacion);
  const candidata = caben.find((h) => h.vistaMontana === montana);
  if (candidata) return candidata;
  if (pedidas.length) {
    avisos.push(caben.length
      ? `${pedidas[0].label} no es de la vista que se cotizó (${montana ? "montaña" : "selva"}): se puso otra de esa vista.`
      : `${pedidas[0].label} no admite ${ocupacion} personas por habitación: se cotizó otra.`);
  }
  if (montana) {
    const h = habitacionDeCategoria("montana", ocupacion);
    if (h) return h;
  }
  // Las del paquete, en su orden: la primera es la que se asigna.
  for (const hp of habitacionesDePaquete(p)) {
    const h = HABITACIONES_PANEL.find((x) => x.id === hp.id);
    if (h && !h.vistaMontana && h.maxHuespedes >= ocupacion) return h;
  }
  return habitacionDeCategoria("estandar", ocupacion) ?? HABITACIONES_PANEL[0];
}

interface PaqueteArmado {
  precio: PaquetePrecio;
  /** Como lo llama la reserva del sitio: «Paquete · …», o «Noche … · fecha» sin hotel. */
  nombre: string;
  lineas: LineaGuardada[];
  filas:  PackageItem[];
  notas:  string[];
}

/** Un paquete del catálogo o de evento, cobrado con `computePaqueteCharge`. */
function armarPaquete(paq: PaqueteCotizacionBot): Resultado<PaqueteArmado> {
  const slug = texto(paq.slug, 80);
  const p = slug ? getPaquete(slug) : undefined;
  if (!p) {
    const hay = [...PAQUETES_DB, ...paquetesEventoALaVenta()].map((x) => x.slug).join(", ");
    return falla(`No existe el paquete «${slug}». Paquetes: ${hay}.`);
  }
  const a = entero(paq.adultos), m = entero(paq.ninosMid), s = entero(paq.ninosSmall);
  const personas = a + m + s;
  const ev = p.evento;
  const avisos: string[] = [];
  const notas: string[] = [];

  let fecha: string;
  if (ev) {
    // De fecha fija: la fecha no se elige y se vende hasta la víspera.
    if (!eventoALaVenta(p)) return falla(`${p.nombre} (${ev.fechaTexto}) ya no está a la venta: se vende hasta la víspera.`);
    fecha = ev.fecha;
    const pedida = texto(paq.fecha, 10);
    if (pedida && pedida !== ev.fecha) avisos.push(`${p.nombre} es solo el ${ev.fechaTexto}: se cotizó esa fecha.`);
  } else {
    fecha = texto(paq.fecha, 10);
    const mal = problemaDeFecha(fecha, `inicio del paquete ${p.nombre}`);
    if (mal) return falla(mal);
    avisos.push(...avisosDeFecha(fecha));
  }

  // El recorrido «a elegir»: se valida contra las opciones del catálogo.
  const e = p.eleccionTour;
  const pedidos = Array.isArray(paq.eleccion) ? paq.eleccion.map((x) => texto(x, 80)).filter(Boolean) : [];
  const elegidos: string[] = [];
  if (e) {
    for (const x of pedidos) {
      const o = e.opciones.find((op) => op.slug === x || norm(op.nombre) === norm(x));
      if (!o) avisos.push(`«${x}» no es una opción de ${p.nombre}. Opciones: ${e.opciones.map((op) => op.nombre).join(", ")}.`);
      else if (elegidos.indexOf(o.slug) === -1) elegidos.push(o.slug);
    }
    elegidos.splice(e.cuantos ?? 1);
  } else if (pedidos.length) {
    avisos.push(`${p.nombre} no deja elegir recorridos: se cotizó su itinerario.`);
  }

  // El cuarto que pidió decide también la vista: pedir la Jungla es pedir
  // montaña. Si además mandó `vistaMontana`, manda eso.
  const leida: HabitacionLeida = ev ? {} : leerHabitacion(paq.habitacion);
  if (leida.desconocida) avisos.push(`No conozco la habitación «${leida.desconocida}»: se cotizó la del paquete.`);
  const pidioMontana = leida.categoria === "montana"
    || (!!leida.candidatas?.length && leida.candidatas.every((h) => h.vistaMontana));
  const montana = !ev && (typeof paq.vistaMontana === "boolean" ? paq.vistaMontana : pidioMontana);

  const charge = computePaqueteCharge({
    slug: p.slug, personas: a, childrenMid: m, childrenSmall: s,
    vistaMontana: montana, reparto: paq.reparto, tourElegido: elegidos.join(","),
    nocheExtra: !!paq.nocheExtra, pct: 100, fecha,
  });
  if (!charge) return falla(motivoPaquete(p, a, personas));

  const sinHotel = !!ev?.sinHotel;
  const noches   = sinHotel ? 0 : charge.nochesTotales;
  // Con la noche extra se entra la víspera: el día 1 sigue siendo de tour.
  const checkin  = sinHotel ? "" : (charge.nocheExtra ? addDaysYMD(fecha, -1) : fecha);
  const checkout = sinHotel ? "" : addDaysYMD(checkin, noches);

  const lineas = ev ? lineasDeEvento(p, a, m, s) : lineasDePaquete(p, fecha, a, m, s, elegidos, avisos, notas);

  let filas: PackageItem[] = [];
  let habitacion: string | undefined;
  if (!sinHotel) {
    // Las habitaciones del motor de paquetes (de 4 en 4) y su reparto.
    const reparto = repartoValido(paq.reparto, personas, charge.habitaciones) ?? repartirHuespedes(personas, charge.habitaciones);
    const ocupacion = Math.max(...reparto);
    if (ev) {
      // La asigna el hotel: el renglón dice eso y lleva la tarifa estándar. Si
      // Erick la cambia en el panel, un nombre fuera del catálogo conserva su precio.
      const base = habitacionDeCategoria("estandar", ocupacion);
      habitacion = "Habitación (la asigna el hotel)";
      filas = filasHabitacion(habitacion, (n) => (base ? tarifaPanel(base.label, n) : 0), reparto, noches, checkin);
    } else {
      // La Luna de Miel trae la suite de montaña en el precio: ése es su cuarto.
      const hab = habitacionDePaquete(p, leida, montana || p.habitacionIncluida === "montana", ocupacion, avisos);
      habitacion = hab.label;
      filas = filasHabitacion(hab.label, (n) => tarifaPanel(hab.label, n), reparto, noches, checkin);
    }
    if (reparto.length > 1) notas.push(`Reparto por habitación: ${reparto.join(" + ")}.`);
  }

  if (charge.nocheExtra) notas.push(`Noche extra: entran la víspera (${checkin}), check-in 3 pm.`);
  if (elegidos.length) {
    const nombres = elegidos.map((x) => e?.opciones.find((o) => o.slug === x)?.nombre ?? x).join(", ");
    notas.push(`Recorridos elegidos: ${nombres}.`);
  }
  if (ev) notas.push(ev.notaEquipo);

  const lista = p.precioLista ?? p.precio;
  const enFecha = paqueteEnFecha(p, fecha).precio;
  const precio: PaquetePrecio = {
    slug: p.slug, nombre: p.nombre, total: charge.total,
    personas, adultos: a, ninosMid: m, ninosSmall: s,
    fecha, checkin, checkout, noches,
    ...(habitacion ? { habitacion } : {}),
    habitaciones: sinHotel ? 0 : charge.habitaciones,
    nocheExtra: charge.nocheExtra,
    evento: !!ev,
    promo: !ev && enFecha < lista
      ? { aplica: true, precioLista: lista, precioPromo: enFecha, vence: PROMO_VENCE }
      : { aplica: false },
    ...(avisos.length ? { avisos } : {}),
  };
  const nombre = sinHotel ? `${p.nombre} · ${ev!.fechaTexto}` : `Paquete · ${p.nombre}`;
  return { ok: true, precio, nombre, lineas, filas, notas };
}

// ── Hospedaje a la medida ───────────────────────────────────────────────────

/**
 * Noches sueltas en el Hotel Paraíso Encantado, con las tarifas DEL PANEL
 * (`tarifaPanel`), no con `cotizarHospedaje`.
 *
 * 🔴 Por qué: el panel no recalcula el precio por noche al abrir la cotización,
 * pero sí en cuanto Erick toca el cuarto o la gente (`aplicarHabitacion` →
 * `tarifaPanel`). Con cualquier otra tabla, tocar la cotización del bot movería
 * el precio. Y `cotizarHospedaje` solo reconoce la Jungla como vista a la
 * montaña: la Suite Flor de Liz 2 y la LindaVista (montaña en el panel,
 * $1,900 / $2,400) le salen a $1,500 / $1,900, los Helechos (hasta 6 personas)
 * los topa en 4, y la Orquídeas 2 (solo 2) le deja meter a 4.
 */
function armarHospedaje(h: HospedajeCotizacionBot): Resultado<{ precio: HospedajePrecio; filas: PackageItem[] }> {
  const huespedes = entero(h.huespedes);
  if (huespedes < 1) return falla("Falta cuántas personas se hospedan.");
  const checkin = texto(h.checkin, 10);
  if (!fechaReal(checkin)) return falla(`Falta la fecha de entrada al hotel (AAAA-MM-DD)${checkin ? `: «${checkin}» no sirve` : ""}.`);
  if (checkin < hoyMX()) return falla(`La entrada al hotel (${checkin}) ya pasó.`);

  let noches = entero(h.noches);
  const salida = texto(h.checkout, 10);
  if (salida) {
    if (!fechaReal(salida)) return falla(`La salida del hotel «${salida}» no es una fecha (AAAA-MM-DD).`);
    noches = diffDiasYMD(checkin, salida);
    if (noches < 1) return falla("La salida del hotel tiene que ser después de la entrada.");
  }
  if (noches < 1) return falla("Faltan las noches de hotel (o la fecha de salida).");
  if (noches > MAX_NOCHES) return falla(`Más de ${MAX_NOCHES} noches se cotiza a mano: lo ve el equipo.`);

  const leida = leerHabitacion(h.habitacion);
  if (leida.desconocida) {
    return falla(`No conozco la habitación «${leida.desconocida}». Habitaciones: ${HABITACIONES_PANEL.map((x) => x.label).join(", ")}.`);
  }
  const avisos: string[] = [];
  // Las que pidió, o las mínimas para que quepan todos.
  const tope = leida.candidatas?.length
    ? Math.max(...leida.candidatas.map((x) => x.maxHuespedes))
    : MAX_POR_HABITACION;
  const habitaciones = entero(h.habitaciones) || Math.ceil(huespedes / tope);
  if (habitaciones > huespedes) return falla(`Son ${habitaciones} habitaciones para ${plural(huespedes, "persona", "personas")}: sobra al menos una.`);
  const reparto = repartirHuespedes(huespedes, habitaciones);
  const ocupacion = Math.max(...reparto);

  let hab: HabitacionPanel | undefined;
  if (leida.candidatas?.length) {
    hab = leida.candidatas.find((x) => x.maxHuespedes >= ocupacion);
    if (!hab) {
      const x = leida.candidatas[0];
      return falla(`${x.label} admite hasta ${x.maxHuespedes} personas por habitación: para ${huespedes} hacen falta ${Math.ceil(huespedes / x.maxHuespedes)} habitaciones.`);
    }
  } else {
    hab = habitacionDeCategoria(leida.categoria ?? "estandar", ocupacion);
    if (!hab) return falla(`Ninguna habitación admite ${ocupacion} personas: repártanse en más habitaciones.`);
    if (!leida.categoria) avisos.push(`No dijo qué habitación: se cotizó ${hab.label} (estándar, vista a la selva).`);
  }

  const elegida = hab;
  const filas = filasHabitacion(elegida.label, (n) => tarifaPanel(elegida.label, n), reparto, noches, checkin);
  const subtotal = filas.reduce((s, f) => s + f.subtotal, 0);
  const precio: HospedajePrecio = {
    habitacion: elegida.label, hotel: HOTEL_PARAISO,
    checkin, checkout: addDaysYMD(checkin, noches), noches, habitaciones, huespedes,
    precioPorNoche: filas.reduce((s, f) => s + f.precioPorNoche * f.habitaciones, 0),
    subtotal,
    desglose: filas.map((f) => ({ habitaciones: f.habitaciones, huespedes: f.huespedes ?? 0, precioPorNoche: f.precioPorNoche, subtotal: f.subtotal })),
    ...(avisos.length ? { avisos } : {}),
  };
  return { ok: true, precio, filas };
}

// ── La cotización completa ──────────────────────────────────────────────────

/**
 * Quién arma la cotización. 🔴 Va en un argumento APARTE y nunca dentro de
 * `input`: `input` es lo que manda el bot (el cuerpo de una petición) y lo del
 * panel no se puede pedir desde fuera.
 */
export interface OpcionesCotizacion {
  /**
   * La arma alguien del equipo en el panel (decisión de Manolo, 7 oct 2026):
   * puede pasar del tope en línea de la salida —sabe si sale una segunda
   * unidad— y un día lleno solo se le avisa. El bot, nunca: un grupo de 20 es
   * un chat para el equipo, no una cotización automática.
   */
  panel?: boolean;
}

/** Lo que `calcularCotizacionBotConCupo` contó en la base, por posición en `items`. */
export interface OpcionesCalculo extends OpcionesCotizacion {
  /** Renglones que el bot NO cotiza porque ese día ya no caben, con el motivo para el cliente. */
  sinLugar?: Map<number, string>;
  /** Lo mismo para el panel: se cotiza y solo se avisa. */
  avisosDeCupo?: Map<number, string>;
}

/**
 * Cotiza SIN guardar: recorridos sueltos, un paquete y noches de hotel. Lo que
 * no se puede (cupo, mínimo, solo adultos, fecha, ruta o vehículo que no
 * existe, gente que no cabe) va en `errores` con su motivo y NO suma; lo demás
 * se cotiza igual.
 *
 * Pura: no lee la base. El cupo de los paquetes de evento y el de cada
 * recorrido por día (que sí viven en la base) los cuenta
 * `calcularCotizacionBotConCupo` y llegan aquí en `opciones`.
 */
export function calcularCotizacionBot(input: PrecioBotInput, opciones: OpcionesCalculo = {}): CotizacionCalculada {
  const errores: ErrorPrecio[] = [];
  const lineas: LineaPrecio[] = [];
  /** Los recorridos sueltos, aparte de los del paquete: el nombre de la cotización los suma. */
  const sueltas: LineaGuardada[] = [];
  const delPaquete: LineaGuardada[] = [];
  const filas: PackageItem[] = [];
  const notas: string[] = [];
  let total = 0;
  let grupo = 0;

  const items = Array.isArray(input.items) ? input.items : [];
  items.forEach((crudo, indice) => {
    const item = normalizarItem(crudo);
    const slug = item.slug || (item.tipo === "rzr" ? "rzr" : "");
    if (indice >= MAX_RECORRIDOS) {
      errores.push({ indice, slug, motivo: `Máximo ${MAX_RECORRIDOS} recorridos por cotización.` });
      return;
    }
    const r = item.tipo === "rzr" ? lineaRzr(item) : lineaTour(item, opciones.panel === true);
    if (!r.ok) {
      errores.push({ indice, slug, motivo: r.motivo });
      return;
    }
    // El día ya no tiene lugar para este grupo. Va DESPUÉS de las reglas del
    // recorrido: si la fecha ya pasó, eso es lo primero que hay que decir.
    const sinLugar = opciones.sinLugar?.get(indice);
    if (sinLugar) {
      errores.push({ indice, slug, motivo: sinLugar });
      return;
    }
    const avisoDeCupo = opciones.avisosDeCupo?.get(indice);
    if (avisoDeCupo) r.linea.avisos = [...(r.linea.avisos ?? []), avisoDeCupo];
    lineas.push(r.linea);
    sueltas.push(r.guardada);
    notas.push(...r.notas);
    total += r.linea.total;
    grupo = Math.max(grupo, r.personas);
  });

  let paquete: PaquetePrecio | undefined;
  let nombrePaquete = "";
  if (input.paquete) {
    const r = armarPaquete(input.paquete);
    if (!r.ok) {
      errores.push({ indice: -1, slug: texto(input.paquete.slug, 80) || "paquete", motivo: r.motivo });
    } else {
      paquete = r.precio;
      nombrePaquete = r.nombre;
      delPaquete.push(...r.lineas);
      filas.push(...r.filas);
      notas.push(...r.notas);
      total += r.precio.total;
      grupo = Math.max(grupo, r.precio.personas);
    }
  }

  let hospedaje: HospedajePrecio | undefined;
  if (input.hospedaje) {
    if (paquete && paquete.noches > 0) {
      errores.push({
        indice: -1, slug: "hospedaje",
        motivo: `${paquete.nombre} ya incluye el hotel: para llegar la víspera usa la noche extra del paquete.`,
      });
    } else {
      const r = armarHospedaje(input.hospedaje);
      if (!r.ok) {
        errores.push({ indice: -1, slug: "hospedaje", motivo: r.motivo });
      } else {
        hospedaje = r.precio;
        filas.push(...r.filas);
        total += r.precio.subtotal;
        grupo = Math.max(grupo, r.precio.huespedes);
      }
    }
  }

  // El itinerario del correo y del PDF se lee como el viaje: por fecha, y lo
  // que no tiene fecha (un RZR por confirmar) al final.
  const guardadas = [...delPaquete, ...sueltas]
    .sort((x, y) => (x.tourDate || "9999").localeCompare(y.tourDate || "9999"));

  // 🔴 El total es el que cobra la web (promo por fecha, viajero solo, Edén
  // por grupo, precio de paquete); los renglones van a precio de lista, que
  // es lo que suma el panel. Cuando no coinciden:
  //  · si la web cobra MENOS (promo, Edén, paquete), la diferencia viaja como
  //    descuento fijo, como lo captura el panel desde el 1 oct. Un
  //    `priceOverride` se borraba en cuanto Erick tocaba cualquier renglón (la
  //    fecha, una persona): el total brincaba a la suma de lista y el cliente
  //    leía otro precio. El descuento sobrevive a la edición y el PDF y el
  //    correo lo enseñan como «Descuento», igual que antes;
  //  · si cobra MÁS que la suma de los renglones, un descuento no lo puede
  //    decir: va como `priceOverride`, que el editor abre con ESE total.
  //    (Hasta el 8 oct 2026 el caso típico era el viajero solo, que pagaba dos
  //    lugares; ya no, pero la rama sigue valiendo para el Edén y su escalera.)
  // Con la suma exacta va todo en `null`, para que el editor no pinte nada.
  const sumaPanel = guardadas.reduce((s, l) => s + l.subtotal, 0) + filas.reduce((s, f) => s + f.subtotal, 0);
  const priceOverride = total > sumaPanel ? total : null;
  const descuentoFijo = total < sumaPanel ? sumaPanel - total : null;

  // El MISMO redondeo que el panel con «30 %» y que `desgloseCotizacion`
  // (`Math.round(total × 0.3)`), guardado como importe: el PDF, el correo, el
  // bot y la reserva dicen el mismo anticipo al peso.
  const anticipo = Math.round(total * (PCT / 100));
  const numPersonas = grupo > 0 ? grupo : null;

  const cliente = input.cliente;
  const locale: LocaleBot = input.locale === "en" ? "en" : "es";
  const zona = texto(input.zonaHospedaje, 80);
  const notasInternas = [
    texto(input.notasInternas, 1500),
    zona ? `Se hospeda en: ${zona}.` : "",
    ...notas,
  ].filter(Boolean).join("\n");

  const meta: MetaCotizacionBot = {
    _meta: true,
    anticipo,
    anticipoTipo:  "percent",
    anticipoValor: PCT,
    vigencia:      "48h",
    numPersonas,
    priceOverride,
    discountType:  descuentoFijo !== null ? "fixed" : null,
    discountValue: descuentoFijo,
    notasInternas,
    origen:        "bot",
    waChatId:      texto(cliente?.waChatId, 120) || null,
    waTelefono:    telefonoReal(cliente?.telefono, cliente?.waChatId),
    zonaHospedaje: zona || null,
    locale,
    ...(paquete ? { paqueteSlug: paquete.slug } : {}),
  };

  // Las columnas, como las escribe el panel al guardar (nombres con « + »,
  // slug y fecha del primer recorrido). Un paquete se llama como lo llama la
  // reserva del sitio («Paquete · …») y lleva SU slug: el botón del correo
  // abre /reservar-paquete con ese precio y, en un evento, la reserva cuenta
  // para el cupo. La fecha es la del primer recorrido: de ella cuelga la
  // fecha límite (nunca después de la víspera).
  const nombres = sueltas.map((l) => l.tourName);
  const tourName = paquete
    ? [nombrePaquete, ...nombres].join(" + ")
    : guardadas.length
      ? guardadas.map((l) => l.tourName).join(" + ")
      : hospedaje ? `Hospedaje · ${hospedaje.habitacion}` : "";
  const tourSlug = paquete ? paquete.slug : (guardadas[0]?.tourSlug ?? "");
  const tourDate = guardadas[0]?.tourDate || paquete?.fecha || hospedaje?.checkin || "";

  return {
    lineas,
    ...(hospedaje ? { hospedaje } : {}),
    ...(paquete ? { paquete } : {}),
    total,
    anticipo,
    saldo: total - anticipo,
    pctAnticipo: PCT,
    errores,
    vacia: guardadas.length === 0 && filas.length === 0,
    numPersonas,
    sumaPanel,
    priceOverride,
    guardar: {
      tourName, tourSlug, tourDate,
      // El grupo, NO la suma por tour (ver src/lib/admin/reserva.ts).
      ...grupoParaGuardar(guardadas, numPersonas),
      totalAmount: total,
      lineItems: guardadas,
      packageItems: [meta, ...filas],
      extraItems: [],
    },
  };
}

/** La respuesta de `/api/bot/precio`, tal cual la pide el contrato del bot. */
export function respuestaPrecioBot(calc: CotizacionCalculada): RespuestaPrecioBot {
  return {
    ok: true,
    lineas: calc.lineas,
    ...(calc.hospedaje ? { hospedaje: calc.hospedaje } : {}),
    ...(calc.paquete ? { paquete: calc.paquete } : {}),
    total: calc.total,
    anticipo: calc.anticipo,
    saldo: calc.saldo,
    pctAnticipo: calc.pctAnticipo,
    errores: calc.errores,
  };
}

/**
 * El cupo de cada recorrido por día (`lib/cupoTour.ts`): el mismo que pinta el
 * calendario del sitio y que se vuelve a contar al cobrar. Los recorridos de un
 * paquete del catálogo ocupan las mismas salidas; los de un evento (Xantolo) se
 * quedan con su propio cupo, que se revisa aparte.
 *
 * Para el bot, lo que no cabe sale de la cuenta con un motivo que puede repetir
 * tal cual —«El sábado 10 de octubre ya no hay lugar para 4 personas en
 * Expedición Tamul. Hay lugar el viernes 9 de octubre. Elige otra fecha.»—;
 * para el panel solo se avisa. Si la base no contesta no frena nada (ver
 * `pedidosSinCupo`): el pago vuelve a contar antes de cobrar.
 */
async function cupoDelDia(input: PrecioBotInput, panel: boolean): Promise<{ porRenglon: Map<number, string>; paquete: string | null }> {
  const sueltos: { indice: number; slug: string; fecha: string; personas: number }[] = [];
  (Array.isArray(input.items) ? input.items : []).slice(0, MAX_RECORRIDOS).forEach((crudo, indice) => {
    const item = normalizarItem(crudo);
    if (item.tipo !== "tour") return;
    const tour = tourPorSlug(texto(item.slug, 80));
    const personas = entero(item.adultos) + entero(item.ninosMid) + entero(item.ninosSmall);
    // Arriba del tope en línea ya lo explica `lineaTour` (es para el equipo):
    // contarlo aquí diría «ya no hay lugar» de un día que a lo mejor está vacío.
    if (!tour || (!panel && personas > tour.groupMax)) return;
    sueltos.push({ indice, slug: tour.slug, fecha: texto(item.tourDate, 10), personas });
  });

  let delPaquete: { slug: string; fecha: string; personas: number }[] = [];
  const p = input.paquete ? getPaquete(texto(input.paquete.slug, 80)) : undefined;
  if (!panel && input.paquete && p && !p.evento) {
    const r = armarPaquete(input.paquete);
    if (r.ok) {
      delPaquete = r.lineas
        .filter((l) => !l.unidades)
        .map((l) => ({ slug: l.tourSlug, fecha: l.tourDate, personas: (l.adults || 0) + (l.childrenMid || 0) + (l.childrenSmall || 0) }));
    }
  }

  const porRenglon = new Map<number, string>();
  if (!sueltos.length && !delPaquete.length) return { porRenglon, paquete: null };
  const sinCupo = await pedidosSinCupo([...sueltos, ...delPaquete]);
  const motivo = (slug: string, fecha: string): string | null => {
    const s = sinCupo.find((x) => x.slug === slug && x.fecha === fecha);
    return s ? mensajeSinCupo(s) : null;
  };
  for (const s of sueltos) {
    const m = motivo(s.slug, s.fecha);
    if (m) porRenglon.set(s.indice, m);
  }
  const llenos = delPaquete.map((l) => motivo(l.slug, l.fecha)).filter((m): m is string => !!m);
  return { porRenglon, paquete: llenos.length && p ? `${p.nombre}: ${llenos.join(" ")}` : null };
}

/**
 * `calcularCotizacionBot` más lo que se cuenta en la base: el cupo de cada
 * recorrido por día (`cupoDelDia`) y el de los paquetes de EVENTO (Xantolo).
 * Sin lugar, el renglón o el paquete sale de la cuenta con su motivo (en el
 * panel solo se avisa). Si la base no contesta, se cotiza igual: una
 * cotización no aparta lugar, y el pago en línea vuelve a contar antes de
 * cobrar.
 */
export async function calcularCotizacionBotConCupo(input: PrecioBotInput, opciones: OpcionesCotizacion = {}): Promise<CotizacionCalculada> {
  const panel = opciones.panel === true;
  const cupo = await cupoDelDia(input, panel);
  const calculo: OpcionesCalculo = panel
    ? { panel, avisosDeCupo: cupo.porRenglon }
    : { panel, sinLugar: cupo.porRenglon };
  // Un paquete con algún recorrido lleno ese día no se le cotiza al bot, igual
  // que el evento sin lugar de abajo: le llegaría al cliente algo que no se puede pagar.
  if (cupo.paquete && input.paquete) {
    const sin = calcularCotizacionBot({ ...input, paquete: undefined }, calculo);
    return { ...sin, errores: [...sin.errores, { indice: -1, slug: texto(input.paquete.slug, 80), motivo: cupo.paquete }] };
  }
  const p = input.paquete ? getPaquete(texto(input.paquete.slug, 80)) : undefined;
  if (!p?.evento || !input.paquete) return calcularCotizacionBot(input, calculo);
  const personas = entero(input.paquete.adultos) + entero(input.paquete.ninosMid) + entero(input.paquete.ninosSmall);
  const lugares = await lugaresDePaqueteSeguro(p);
  if (lugares && !cabeEnCupo(lugares, personas)) {
    const sin = calcularCotizacionBot({ ...input, paquete: undefined }, calculo);
    return {
      ...sin,
      errores: [...sin.errores, { indice: -1, slug: p.slug, motivo: `Ya no hay lugar para ${plural(personas, "persona", "personas")} en ${p.nombre}. ${textoLugares(lugares)}.` }],
    };
  }
  return calcularCotizacionBot(input, calculo);
}

// ── Guardar ─────────────────────────────────────────────────────────────────

const CORREO_OK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Dos caracteres al azar: dos folios del mismo milisegundo no chocan. */
const sufijoFolio = () => randomInt(0, 36 * 36).toString(36).padStart(2, "0").toUpperCase();

/** Folio de cotización: el prefijo del panel (`COT-` + base 36) más el sufijo. */
export function folioCotizacion(): string {
  return "COT-" + Date.now().toString(36).toUpperCase() + sufijoFolio();
}

/**
 * Cotiza y GUARDA en `TourQuote` (estado «borrador»), como si la hubiera
 * armado Erick en el panel, y lo deja en la bitácora con el actor del bot.
 * Mandarla (correo o WhatsApp) es otro paso: `enviar.ts`.
 *
 * Si no queda nada que cobrar, o falta el nombre del cliente, NO guarda:
 * devuelve `quote: null` y los motivos en `calc.errores`. Solo lanza si falla
 * la base.
 */
export async function guardarCotizacionBot(
  input: CotizacionBotInput,
  actor: Actor = BOT,
): Promise<{ quote: TourQuote | null; calc: CotizacionCalculada }> {
  const calc = await calcularCotizacionBotConCupo(input);

  const nombre = texto(input.cliente?.nombre, 120);
  const correo = texto(input.cliente?.correo, 160);
  const faltas: ErrorPrecio[] = [];
  if (nombre.length < 2) faltas.push({ indice: -1, slug: "cliente", motivo: "Falta el nombre del cliente, como quiere que aparezca en la cotización." });
  if (correo && !CORREO_OK.test(correo)) faltas.push({ indice: -1, slug: "cliente", motivo: `El correo «${correo}» no parece válido: pídeselo otra vez.` });
  if (faltas.length || calc.vacia) {
    return { quote: null, calc: { ...calc, errores: [...calc.errores, ...faltas] } };
  }

  const fila = calc.guardar;
  const telefono = telefonoReal(input.cliente?.telefono, input.cliente?.waChatId);
  const notes = texto(input.notasCliente, 1000) || null;

  const crear = () => prisma.tourQuote.create({
    data: {
      quoteNumber:   folioCotizacion(),
      tourName:      fila.tourName,
      tourSlug:      fila.tourSlug,
      tourDate:      fila.tourDate,
      adults:        fila.adults,
      children:      fila.children,
      totalAmount:   fila.totalAmount,
      customerName:  nombre,
      customerEmail: correo,
      customerPhone: telefono,
      // SOLO lo que puede leer el cliente: `notes` sale en el correo y en el
      // PDF. Lo del equipo va en `notasInternas`, dentro del `_meta`.
      notes,
      lineItems:     fila.lineItems as never,
      packageItems:  fila.packageItems as never,
      extraItems:    fila.extraItems as never,
      status:        "borrador",
    },
  });
  let quote: TourQuote;
  try {
    quote = await crear();
  } catch (e: unknown) {
    // Folio repetido (mismo milisegundo y mismo sufijo): se saca otro.
    if ((e as { code?: string })?.code !== "P2002") throw e;
    quote = await crear();
  }

  await registrarEnBitacora({
    accion:     "creó",
    entidad:    "cotización",
    referencia: quote.quoteNumber,
    resumen:    `Cotización ${quote.quoteNumber} — ${quote.customerName}, ${quote.tourName || "sin tour"} el ${quote.tourDate || "sin fecha"}, ${pesos(quote.totalAmount)} (bot de WhatsApp)`,
    actor,
  });

  return { quote, calc };
}

// ── Lectura y notas (para las rutas del bot) ───────────────────────────────

/** El `_meta` de `packageItems` (precio, anticipo, datos del bot). Solo el `_meta: true` de verdad. */
export function metaDeCotizacion(packageItems: unknown): Record<string, any> {
  if (!Array.isArray(packageItems)) return {};
  return (packageItems as any[]).find((p) => p && typeof p === "object" && p._meta === true) ?? {};
}

/** Lo que el bot necesita saber de una cotización guardada. */
export interface ResumenCotizacion {
  folio:         string;
  status:        string;
  tourName:      string;
  tourDate:      string;
  total:         number;
  anticipo:      number;
  saldo:         number;
  /** Fecha límite (YYYY-MM-DD) o null (borrador o aceptada). */
  venceEl:       string | null;
  customerName:  string;
  waChatId:      string | null;
  locale:        LocaleBot;
  /** La reserva en que se convirtió, si ya se convirtió. */
  reservaFolio:  string | null;
  /** La cotización que la reemplazó (`reemplazarCotizacion`), si la reemplazaron. */
  reemplazadaPor: string | null;
}

/** Folio, total, anticipo (el MISMO de `desgloseCotizacion`), saldo y fecha límite. */
export function resumenDeCotizacion(q: TourQuote): ResumenCotizacion {
  const meta = metaDeCotizacion(q.packageItems);
  const { anticipo, saldo } = desgloseCotizacion(0, q.totalAmount, meta);
  return {
    folio:        q.quoteNumber,
    status:       q.status,
    tourName:     q.tourName,
    tourDate:     q.tourDate,
    total:        q.totalAmount,
    anticipo,
    saldo,
    venceEl:      fechaLimite(q),
    customerName: q.customerName,
    waChatId:     typeof meta.waChatId === "string" ? meta.waChatId : null,
    locale:       meta.locale === "en" ? "en" : "es",
    reservaFolio: typeof meta.reservaFolio === "string" ? meta.reservaFolio : null,
    reemplazadaPor: typeof meta.reemplazadaPor === "string" && meta.reemplazadaPor ? meta.reemplazadaPor : null,
  };
}

/** Los últimos 10 dígitos de un teléfono (el número sin lada), o "" si no alcanza. */
const diezDigitos = (v: unknown) => {
  const d = digitos(v);
  return d.length >= 10 ? d.slice(-10) : "";
};

/**
 * La cotización viva más reciente de un chat o de un teléfono: «enviada» o
 * «borrador», de los últimos 30 días. Es la que el bot busca cuando llega un
 * comprobante sin folio. null si no hay.
 *
 * Se traen las vivas recientes (pocas: 300 alcanzan de sobra) y se comparan
 * aquí, sin filtros JSON de Prisma. El teléfono va por los últimos 10 dígitos:
 * el bot lo guarda con lada (52…, a veces 521…) y el panel como se teclea
 * («481 123 4567», «+52 1 481…»), que con un `endsWith` sobre la columna no
 * coincidía nunca. Un chat `@c.us` también sirve de teléfono; uno `@lid`, no.
 *
 * Una reemplazada nunca es «la activa»: el reemplazo la deja «expirada» y,
 * si alguien la reactiva en el panel, igual se salta. Ligarle un comprobante
 * sería apartar lo que el cliente ya cambió; sin folio, el aviso al dueño
 * llega igual y él decide.
 */
export async function buscarCotizacionActiva(p: { chatId?: string | null; telefono?: string | null }): Promise<TourQuote | null> {
  const chatId = texto(p.chatId, 120);
  const tel = diezDigitos(telefonoReal(p.telefono, chatId));
  if (!chatId && !tel) return null;
  const recientes = await prisma.tourQuote.findMany({
    where: {
      status:    { in: ["enviada", "borrador"] },
      createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
    orderBy: { createdAt: "desc" },
    take:    300,
  });
  return recientes.find((q) => {
    const meta = metaDeCotizacion(q.packageItems);
    if (typeof meta.reemplazadaPor === "string" && meta.reemplazadaPor) return false;
    if (chatId && meta.waChatId === chatId) return true;
    return !!tel && (diezDigitos(q.customerPhone) === tel || diezDigitos(meta.waTelefono) === tel);
  }) ?? null;
}

/**
 * Agrega una nota interna (nunca la ve el cliente) a una cotización (COT-,
 * HP-P) o a una reserva (HP-M-, HP), con la fecha y hora de México. La usa la
 * escalación del bot para que quien abra el folio en el panel vea por qué se
 * pasó al equipo. Nunca lanza: devuelve si la encontró y la escribió.
 */
export async function agregarNotaInterna(folio: string, nota: string): Promise<boolean> {
  const f = texto(folio, 60).toUpperCase();
  const n = texto(nota, 600);
  if (!f || !n) return false;
  const cuando = new Date().toLocaleString("es-MX", {
    timeZone: "America/Mexico_City", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
  const renglon = `[${cuando}] ${n}`;
  const sumar = (previas: unknown) => [texto(previas, 4000), renglon].filter(Boolean).join("\n");
  try {
    const q = await prisma.tourQuote.findUnique({ where: { quoteNumber: f } });
    if (q) {
      const pkgs = Array.isArray(q.packageItems) ? [...(q.packageItems as any[])] : [];
      const i = pkgs.findIndex((p) => p && typeof p === "object" && p._meta === true);
      if (i === -1) pkgs.unshift({ _meta: true, notasInternas: renglon });
      else pkgs[i] = { ...pkgs[i], notasInternas: sumar(pkgs[i].notasInternas) };
      await prisma.tourQuote.update({ where: { id: q.id }, data: { packageItems: pkgs as never } });
      return true;
    }
    const b = await prisma.tourBooking.findUnique({ where: { confirmationNumber: f } });
    if (!b) return false;
    const previas = (Array.isArray(b.lineItems) ? (b.lineItems as any[]) : []).find((l) => l && l._meta)?.notasInternas;
    await prisma.tourBooking.update({
      where: { id: b.id },
      data:  { lineItems: conMetaReserva(b.lineItems, { notasInternas: sumar(previas) }) as never },
    });
    return true;
  } catch (e: unknown) {
    console.error("cotizaciones/agregarNotaInterna:", e instanceof Error ? e.message : e);
    return false;
  }
}

// ── Reemplazo: la cotización nueva deja sin efecto a la anterior ────────────
//
// El cliente cambia el tour, la fecha, la gente o el hotel después de recibir
// su cotización. Hasta oct 2026 la vieja seguía viva: le llegaban los correos
// de seguimiento de las dos, el «vence mañana» de la que ya no quería y, si
// pagaba con el folio viejo, se convertía lo que ya no era. Ahora el bot manda
// `reemplazaA` con la nueva y la vieja pasa a Vencida con una nota de por qué.
//
// Dos piezas: `puedeReemplazar` decide y es PURA (se prueba sin base);
// `reemplazarCotizacion` escribe, con el candado de la conversión en reserva.

/** Lo que se puede reemplazar: lo que todavía no se pagó, no se convirtió y no venció. */
export const ESTADOS_REEMPLAZABLES = ["borrador", "enviada"] as const;

/**
 * Un folio de cotización: COT-… (las de hoy) o HP-P… (las del bot de antes,
 * «HP-P» + base 36). Las reservas son HP-M-… o HP + base 36, sin guion tras
 * la P: ninguna empieza con «HP-P».
 */
const RE_FOLIO_COTIZACION = /^(COT-|HP-P)[A-Z0-9-]+$/;

/**
 * Un teléfono para comparar: los 10 dígitos de un número de México venga como
 * venga (52…, 521… o los 10 solos) o, de otro país, todos sus dígitos. "" si
 * no es un teléfono. Más estricto que `diezDigitos` a propósito: aquí un
 * parecido de más vencería la cotización de OTRO cliente.
 */
export function telefonoComparable(v: unknown): string {
  const d = digitos(v);
  if (d.length === 10) return d;
  if (d.length === 12 && d.startsWith("52")) return d.slice(2);
  if (d.length === 13 && d.startsWith("521")) return d.slice(3);
  return d.length >= 11 && d.length <= 15 ? d : "";
}

/** Lo mínimo de una cotización para decidir un reemplazo (un `TourQuote` sirve tal cual). */
export interface CotizacionReemplazable {
  quoteNumber:    string;
  status:         string;
  customerPhone?: string | null;
  /** Con correo en las dos y distinto, es OTRA persona del mismo chat. */
  customerEmail?: string | null;
  /** Para leer el `_meta`: waChatId, waTelefono, reservaFolio, reemplazadaPor. */
  packageItems?:  unknown;
}

/** El resultado de `puedeReemplazar`. `siguiente`: ya la había reemplazado ésa (la cadena sigue). */
export type DecisionReemplazo =
  | { ok: true }
  | { ok: false; motivo: string; pagoEnCurso?: true; reservaFolio?: string; siguiente?: string };

/** Los teléfonos de una cotización: la columna, el del `_meta` y el del chat si es `@c.us`. */
function telefonosDe(q: CotizacionReemplazable): string[] {
  const meta = metaDeCotizacion(q.packageItems);
  const chat = typeof meta.waChatId === "string" ? meta.waChatId : "";
  return [q.customerPhone, meta.waTelefono, telefonoReal(null, chat)]
    .map(telefonoComparable)
    .filter(Boolean);
}

/** ¿Son del mismo cliente? El mismo chat, o el mismo teléfono en cualquiera de sus formas. */
export function mismoClienteDeCotizacion(a: CotizacionReemplazable, b: CotizacionReemplazable): boolean {
  const chatA = texto(metaDeCotizacion(a.packageItems).waChatId, 120);
  const chatB = texto(metaDeCotizacion(b.packageItems).waChatId, 120);
  if (chatA && chatA === chatB) return true;
  const telefonosB = telefonosDe(b);
  return telefonosDe(a).some((t) => telefonosB.indexOf(t) >= 0);
}

/**
 * ¿Las dos traen correo y no es el mismo? Entonces son personas distintas
 * aunque escriban desde el mismo chat. 🔴 «Cotízale también a mi hermana Ana,
 * ana@…» salía del mismo chat y daba de baja la cotización del cliente.
 */
function correosDistintos(a: CotizacionReemplazable, b: CotizacionReemplazable): boolean {
  const ca = texto(a.customerEmail, 160).toLowerCase();
  const cb = texto(b.customerEmail, 160).toLowerCase();
  return Boolean(ca && cb && ca !== cb);
}

/**
 * ¿La cotización `vieja` se puede dar por reemplazada por `nueva`? PURA.
 *
 * Solo si es del MISMO cliente (mismo chat o mismo teléfono, y no otro
 * correo), no tiene reserva y sigue en borrador o enviada. La de otro
 * cliente se rechaza antes de mirar nada más y sin decir qué tiene: el
 * motivo regresa al bot.
 *
 * `reservaDeOrigen`: el folio de la reserva cuyo `cotizacionOrigen` es la
 * vieja (convertida desde el panel, que no escribe `reservaFolio`), o null.
 * Lo busca quien escribe; aquí solo se decide.
 */
export function puedeReemplazar(
  vieja: CotizacionReemplazable,
  nueva: CotizacionReemplazable,
  reservaDeOrigen: string | null = null,
): DecisionReemplazo {
  const folio = texto(vieja.quoteNumber, 60).toUpperCase();
  if (!folio) return { ok: false, motivo: "Falta el folio de la cotización anterior." };
  if (folio === texto(nueva.quoteNumber, 60).toUpperCase()) {
    return { ok: false, motivo: "Es la misma cotización: no hay nada que reemplazar." };
  }
  if (!mismoClienteDeCotizacion(vieja, nueva)) {
    return { ok: false, motivo: `La ${folio} es de otro chat y otro teléfono: no se tocó.` };
  }
  if (correosDistintos(vieja, nueva)) {
    return { ok: false, motivo: `La ${folio} es de otra persona (otro correo): no se tocó.` };
  }
  const meta = metaDeCotizacion(vieja.packageItems);
  // Con reserva hubo pago (o el equipo la convirtió): un cambio ahí lo ve una persona.
  const reserva = (typeof meta.reservaFolio === "string" && meta.reservaFolio) || reservaDeOrigen;
  if (reserva) {
    return { ok: false, motivo: `La ${folio} ya es la reserva ${reserva}: no se reemplaza. Un cambio después del pago lo ve el equipo.`, pagoEnCurso: true, reservaFolio: reserva };
  }
  if (typeof meta.reemplazadaPor === "string" && meta.reemplazadaPor) {
    return { ok: false, motivo: `La ${folio} ya había sido reemplazada por la ${meta.reemplazadaPor}.`, siguiente: texto(meta.reemplazadaPor, 60).toUpperCase() };
  }
  if (vieja.status === "aceptada") {
    return { ok: false, motivo: `La ${folio} está aceptada (pagada o convertida en reserva): no se reemplaza. Un cambio después del pago lo ve el equipo.`, pagoEnCurso: true };
  }
  if (vieja.status === "expirada") {
    return { ok: false, motivo: `La ${folio} ya estaba vencida: no hizo falta reemplazarla.` };
  }
  if ((ESTADOS_REEMPLAZABLES as readonly string[]).indexOf(vieja.status) === -1) {
    return { ok: false, motivo: `La ${folio} está en «${vieja.status}»: solo se reemplaza una cotización en borrador o enviada.` };
  }
  return { ok: true };
}

/** Escribe campos en el `_meta` de `packageItems` (el de precio). Si no hay, lo crea al principio. */
function conMetaDeCotizacion(packageItems: unknown, campos: Record<string, unknown>): unknown[] {
  const base = Array.isArray(packageItems) ? [...packageItems] : [];
  const i = base.findIndex((p) => !!p && typeof p === "object" && (p as { _meta?: unknown })._meta === true);
  if (i === -1) return [{ _meta: true, ...campos }, ...base];
  base[i] = { ...(base[i] as object), ...campos };
  return base;
}

/** Cuántas cotizaciones de una cadena de reemplazos (A → B → C…) se siguen. */
const MAX_SALTOS_REEMPLAZO = 3;

/**
 * Da por reemplazada la cotización `folioViejo` por `nueva`, que ya se guardó
 * y se mandó. A la vieja:
 *  · estado «expirada» (Vencida en el panel): un /confirma con ese folio ya
 *    no la convierte sin que el dueño lo vea;
 *  · seguimiento terminado (`seqEstado: "terminado"` en el `_meta` de
 *    `lineItems`): ni pasos ni «vence mañana»;
 *  · `reemplazadaPor` y la nota interna «[Bot · AAAA-MM-DD] Reemplazada por
 *    COT-…» en el `_meta` de `packageItems` (la nota no la ve el cliente);
 *  · un renglón en la bitácora con el actor del bot.
 *
 * Todo en una transacción con candado sobre la fila vieja, el mismo de
 * `convertirCotizacionEnReserva`: si a la vez llega el /confirma de esa
 * cotización, uno espera al otro y nunca se vence una que ya se pagó.
 *
 * Si la que manda el bot ya la había reemplazado OTRA, se sigue la cadena
 * (hasta MAX_SALTOS_REEMPLAZO) y se reemplaza la viva; `folio` en la respuesta
 * es la que de verdad se dio de baja. 🔴 La ficha del bot se queda atrás si el
 * sitio tardó más que su tope (Brevo lento): el sitio sí creó y mandó la B,
 * pero el bot seguía con la A; al reintentar quedaban vivas la B y la C.
 *
 * Nunca lanza: si no se puede, `ok: false` con el motivo y la vieja se queda
 * como estaba.
 */
export async function reemplazarCotizacion(
  folioViejo: string,
  nueva: CotizacionReemplazable,
  actor: Actor = BOT,
): Promise<ResultadoReemplazo> {
  let folio = texto(folioViejo, 60).toUpperCase();
  if (!RE_FOLIO_COTIZACION.test(folio)) {
    return { folio, ok: false, motivo: `«${folio || "(vacío)"}» no es un folio de cotización (COT-… o HP-P…): no se reemplazó nada.` };
  }
  for (let salto = 0; ; salto++) {
    const { resultado, siguiente } = await reemplazarUna(folio, nueva, actor);
    if (resultado.ok || !siguiente || salto >= MAX_SALTOS_REEMPLAZO || !RE_FOLIO_COTIZACION.test(siguiente)) return resultado;
    folio = siguiente;
  }
}

/** Un reemplazo, sin seguir la cadena. `siguiente`: la que ya había reemplazado a `folio`. Nunca lanza. */
async function reemplazarUna(
  folio: string,
  nueva: CotizacionReemplazable,
  actor: Actor,
): Promise<{ resultado: ResultadoReemplazo; siguiente?: string }> {
  type Paso =
    | { ok: false; decision: DecisionReemplazo }
    | { ok: true; antes: string; cliente: string };
  const noExiste: DecisionReemplazo = { ok: false, motivo: `No existe la cotización ${folio}.` };
  try {
    const r: Paso = await prisma.$transaction(async (tx): Promise<Paso> => {
      const fila = await tx.tourQuote.findUnique({ where: { quoteNumber: folio }, select: { id: true } });
      if (!fila) return { ok: false, decision: noExiste };
      await tx.$queryRaw`SELECT id FROM "TourQuote" WHERE id = ${fila.id} FOR UPDATE`;
      const q = await tx.tourQuote.findUnique({ where: { id: fila.id } });
      if (!q) return { ok: false, decision: noExiste };

      // Convertida desde el panel: su reserva guarda de qué cotización salió.
      const deOrigen = await tx.tourBooking.findFirst({
        where:  { lineItems: { array_contains: [{ cotizacionOrigen: q.quoteNumber }] } },
        select: { confirmationNumber: true },
      });
      const v = puedeReemplazar(q, nueva, deOrigen?.confirmationNumber ?? null);
      if (!v.ok) return { ok: false, decision: v };

      // La nota se SUMA a las que ya tenía, sin recortarlas.
      const previas = String(metaDeCotizacion(q.packageItems).notasInternas ?? "").trim();
      const nota = `[Bot · ${hoyMX()}] Reemplazada por ${nueva.quoteNumber}`;
      await tx.tourQuote.update({
        where: { id: q.id },
        data:  {
          status:       "expirada",
          lineItems:    conMetaSeguimiento(q.lineItems, { seqEstado: "terminado" }) as never,
          packageItems: conMetaDeCotizacion(q.packageItems, {
            reemplazadaPor: nueva.quoteNumber,
            notasInternas:  [previas, nota].filter(Boolean).join("\n"),
          }) as never,
        },
      });
      return { ok: true, antes: q.status, cliente: q.customerName };
    });
    if (!r.ok) {
      const d = r.decision;
      if (d.ok) return { resultado: { folio, ok: true } }; // no pasa: un «ok» siempre escribe
      return {
        resultado: {
          folio, ok: false, motivo: d.motivo,
          ...(d.pagoEnCurso ? { pagoEnCurso: true as const } : {}),
          ...(d.reservaFolio ? { reservaFolio: d.reservaFolio } : {}),
        },
        ...(d.siguiente ? { siguiente: d.siguiente } : {}),
      };
    }

    await registrarEnBitacora({
      accion:     "modificó",
      entidad:    "cotización",
      referencia: folio,
      resumen:    `Cotización ${folio} — ${r.cliente}: reemplazada por ${nueva.quoteNumber} (bot de WhatsApp). Pasó a Vencida y se terminó su seguimiento.`,
      detalle:    [{ campo: "estado", antes: r.antes, despues: "expirada" }],
      actor,
    });
    return { resultado: { folio, ok: true } };
  } catch (e: unknown) {
    console.error(`cotizaciones/reemplazarCotizacion ${folio}:`, e instanceof Error ? e.message : e);
    return { resultado: { folio, ok: false, motivo: `No se pudo reemplazar la ${folio} (falló la base): sigue como estaba.` } };
  }
}

/**
 * ¿La cotización que el bot quiere reemplazar YA está pagada? Se pregunta
 * ANTES de guardar la nueva (cotizarParaBot). 🔴 Antes se creaba y se mandaba
 * por correo la nueva, y solo al final se decía «no se reemplazó»: al cliente
 * que ya había pagado (en la web con el link del bot, o el equipo lo registró
 * en el panel) le llegaba otra cotización con otro anticipo, y el seguimiento
 * de cobro de la nueva.
 *
 * Pagada = tiene reserva (`reservaFolio`, o una reserva con su
 * `cotizacionOrigen`), está «aceptada», o el MISMO cliente (correo o
 * teléfono) tiene una reserva hecha después de mandársela (la regla
 * `yaReservo` del cron de seguimiento). Sigue la cadena de reemplazos como
 * `reemplazarCotizacion`. Solo mira cotizaciones del mismo cliente: de otro
 * no dice nada (el reemplazo de después la rechaza igual).
 *
 * null = no hay pago: se cotiza. Nunca lanza: si la base falla, null (el
 * reemplazo vuelve a revisar con candado).
 */
export async function pagoDeCotizacionAnterior(
  folioViejo: string,
  cliente: { correo?: string | null; telefono?: string | null; waChatId?: string | null },
): Promise<{ folio: string; motivo: string; reservaFolio: string | null } | null> {
  let folio = texto(folioViejo, 60).toUpperCase();
  if (!RE_FOLIO_COTIZACION.test(folio)) return null;
  const chat = texto(cliente.waChatId, 120);
  const tel = telefonoReal(cliente.telefono, chat || null);
  const solicitante: CotizacionReemplazable = {
    quoteNumber:   "",
    status:        "",
    customerPhone: tel,
    customerEmail: texto(cliente.correo, 160) || null,
    packageItems:  [{ _meta: true, ...(chat ? { waChatId: chat } : {}), ...(tel ? { waTelefono: tel } : {}) }],
  };
  try {
    for (let salto = 0; salto <= MAX_SALTOS_REEMPLAZO; salto++) {
      const q = await prisma.tourQuote.findUnique({ where: { quoteNumber: folio } });
      if (!q) return null;
      if (!mismoClienteDeCotizacion(q, solicitante) || correosDistintos(q, solicitante)) return null;
      const pago = await pagoDeCotizacion(q);
      if (pago) return pago;
      const siguiente = metaDeCotizacion(q.packageItems).reemplazadaPor;
      if (typeof siguiente !== "string" || !siguiente) return null;
      folio = texto(siguiente, 60).toUpperCase();
    }
    return null;
  } catch (e: unknown) {
    console.error(`cotizaciones/pagoDeCotizacionAnterior ${folio}:`, e instanceof Error ? e.message : e);
    return null;
  }
}

/** El pago de UNA cotización (ver pagoDeCotizacionAnterior), o null. */
async function pagoDeCotizacion(q: TourQuote): Promise<{ folio: string; motivo: string; reservaFolio: string | null } | null> {
  const folio = q.quoteNumber;
  const meta = metaDeCotizacion(q.packageItems);
  let reserva: string | null = typeof meta.reservaFolio === "string" && meta.reservaFolio ? meta.reservaFolio : null;
  if (!reserva) {
    const deOrigen = await prisma.tourBooking.findFirst({
      where:  { lineItems: { array_contains: [{ cotizacionOrigen: folio }] } },
      select: { confirmationNumber: true },
    });
    reserva = deOrigen?.confirmationNumber ?? null;
  }
  if (reserva) {
    return { folio, motivo: `La ${folio} ya es la reserva ${reserva}: un cambio después del pago lo ve el equipo.`, reservaFolio: reserva };
  }
  if (q.status === "aceptada") {
    return { folio, motivo: `La ${folio} ya está aceptada (pagada o convertida en reserva): un cambio después del pago lo ve el equipo.`, reservaFolio: null };
  }
  // Pagó por otro lado (la liga de la web, o el equipo registró la reserva):
  // la misma regla con que el cron deja de cobrarle.
  const correo = texto(q.customerEmail, 160).toLowerCase();
  const tel = diezDigitos(q.customerPhone) || diezDigitos(meta.waTelefono);
  if (!correo && !tel) return null;
  const seq = metaSeguimiento(q.lineItems);
  const desde = seq.seqDesde ? new Date(seq.seqDesde) : q.createdAt;
  const candidatas = await prisma.tourBooking.findMany({
    where:   {
      createdAt: { gte: Number.isNaN(desde.getTime()) ? q.createdAt : desde },
      status:    { notIn: ["cancelled", "borrador"] },
    },
    select:  { confirmationNumber: true, customerEmail: true, customerPhone: true },
    orderBy: { createdAt: "asc" },
    take:    200,
  });
  const otra = candidatas.find((b) =>
    (!!correo && texto(b.customerEmail, 160).toLowerCase() === correo) || (!!tel && diezDigitos(b.customerPhone) === tel));
  if (otra) {
    return {
      folio,
      motivo: `El cliente ya tiene la reserva ${otra.confirmationNumber}, hecha después de mandarle la ${folio} (pagó en la web o el equipo la registró): un cambio lo ve el equipo.`,
      reservaFolio: otra.confirmationNumber,
    };
  }
  return null;
}
