// Cálculo de precios AUTORITATIVO en el servidor.
// El cliente nunca decide el monto a cobrar: aquí se recalcula desde TOURS_DB.

import { TOURS_DB, type Tour, type TourRuta, type TourVehiculo } from "./tours";
import { calcTourTotal, validatePromoCode } from "./tourBooking";
import { descuentoPorPosicion } from "./carrito";

/**
 * Porcentajes de pago permitidos. 30 = "aparta tu lugar" (el resto se liquida
 * el día del tour), 100 = pago completo. Cualquier otro valor cae a 100.
 */
export const PCTS_TOUR = new Set([30, 100]);

/** Normaliza el porcentaje que llega del cliente. Nunca se confía en él. */
export function normalizarPct(pct: unknown): number {
  const n = Math.round(Number(pct));
  return PCTS_TOUR.has(n) ? n : 100;
}

export interface TourChargeInput {
  tourId?:        string;
  tourSlug?:      string;
  adults:         number;
  childrenMid:    number;
  childrenSmall:  number;
  promoCode?:     string;
  /** 30 (anticipo) o 100 (pago completo). Por defecto 100. */
  pct?:           number;
  /** Actividades opcionales. Del cliente SOLO se acepta el id y la cantidad. */
  addOns?:        { id: string; cantidad: number }[];
}

export interface TourChargeResult {
  tour:          Tour;
  total:         number; // total completo de la reserva (MXN)
  charge:        number; // monto a cobrar AHORA (total, o el 30 % si es anticipo)
  saldo:         number; // lo que queda por pagar el día del tour
  pct:           number; // porcentaje efectivamente cobrado
  promoDiscount: number; // porcentaje de descuento aplicado
  /** Add-ons validados, ya con su precio de catálogo. Vacío si no hubo. */
  addOns:        { id: string; nombre: string; cantidad: number; precio: number; subtotal: number }[];
  addOnsTotal:   number;
}

function clampInt(n: unknown, min: number, max: number): number {
  const v = Math.floor(Number(n) || 0);
  if (Number.isNaN(v)) return min;
  return Math.max(min, Math.min(max, v));
}

/**
 * Valida la fecha del tour contra el calendario real. Hasta ahora el servidor
 * NO la miraba: se podía cobrar una reserva para una fecha pasada o para dentro
 * de dos años manipulando el sessionStorage. Vacía se acepta (los tours por
 * WhatsApp coordinan la fecha después).
 */
export function fechaTourValida(tourDate: unknown): boolean {
  if (!tourDate) return true;
  if (typeof tourDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(tourDate)) return false;

  const hoyMX = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
  const [y, m, d] = hoyMX.split("-").map(Number);
  const hoy   = new Date(y, m - 1, d);
  const tope  = new Date(y, m - 1 + 12, d); // un año vista, holgado

  const [ty, tm, td] = tourDate.split("-").map(Number);
  const fecha = new Date(ty, tm - 1, td);
  if (Number.isNaN(fecha.getTime())) return false;

  return fecha >= hoy && fecha <= tope;
}

/**
 * Recalcula el cargo real de una reserva de tour a partir del catálogo del
 * servidor. Devuelve null si el tour no existe o si se excede el cupo máximo.
 */
export function computeTourCharge(input: TourChargeInput): TourChargeResult | null {
  const tour = TOURS_DB.find((t) => t.id === input.tourId || t.slug === input.tourSlug);
  if (!tour) return null;

  // Tours cobrados POR VEHÍCULO (ej. RZR) no se venden por el flujo por persona:
  // el precio depende de ruta + unidad y se cotiza por WhatsApp.
  if (tour.precioUnidad === "vehiculo") return null;

  const adults        = clampInt(input.adults, 1, tour.groupMax);
  const childrenMid   = clampInt(input.childrenMid, 0, tour.groupMax);
  const childrenSmall = clampInt(input.childrenSmall, 0, tour.groupMax);

  const personas = adults + childrenMid + childrenSmall;
  if (personas > tour.groupMax) return null;

  // Mínimo del tour. Existía en los datos pero solo lo miraba el bot: por la web
  // se podía pagar un rafting para 2 cuando la balsa no sale con menos de 4, y
  // eso terminaba en una llamada para reprogramar o en un reembolso.
  if (personas < tour.groupMin) return null;

  // Tours solo para adultos (ej. buceo Media Luna, edad mínima 10): el servidor
  // RECHAZA cualquier reserva con niños aunque la UI los oculte. Sin esta guarda
  // se podía pagar con descuento de niño manipulando el sessionStorage.
  if (tour.soloAdultos && childrenMid + childrenSmall > 0) return null;

  const promo = input.promoCode ? validatePromoCode(input.promoCode) : { valid: false, discount: 0 };
  const promoDiscount = promo.valid ? promo.discount : 0;

  const { total: totalTour } = calcTourTotal(tour.precio, adults, childrenMid, childrenSmall, promoDiscount);

  // ── Add-ons ───────────────────────────────────────────────────────────────
  // El precio se lee SIEMPRE del catálogo del propio tour, nunca del cliente.
  // Un id que no exista en este tour se ignora en silencio en vez de cobrarse.
  const addOns: TourChargeResult["addOns"] = [];
  for (const pedido of input.addOns ?? []) {
    const cat = (tour.addOns ?? []).find((a) => a.id === pedido?.id);
    if (!cat) continue;
    // Nadie puede comprar el add-on para más gente de la que va en la reserva.
    const cantidad = clampInt(pedido?.cantidad, 0, personas);
    if (cantidad <= 0) continue;
    addOns.push({
      id:       cat.id,
      nombre:   cat.nombre,
      cantidad,
      precio:   cat.precio,
      subtotal: cat.precio * cantidad,
    });
  }
  const addOnsTotal = addOns.reduce((acc, a) => acc + a.subtotal, 0);

  // Los add-ons no llevan descuento de promo ni tarifa de niño: son precio fijo
  // por persona que lo toma.
  const total = totalTour + addOnsTotal;

  // Anticipo: se cobra ahora el 30 % y el saldo se liquida el día del tour.
  const pct    = normalizarPct(input.pct);
  const charge = pct === 100 ? total : Math.round((total * pct) / 100);

  return { tour, total, charge, saldo: total - charge, pct, promoDiscount, addOns, addOnsTotal };
}

// ── Tours cobrados POR VEHÍCULO (ej. RZR) ────────────────────────────────────

export interface VehiculoChargeInput {
  tourId?:   string;
  tourSlug?: string;
  ruta?:     string;
  vehiculo?: string;
  unidades?: number;
  /** 30 (anticipo) o 100 (pago completo). Por defecto 100. */
  pct?:      number;
}

export interface VehiculoChargeResult {
  tour:     Tour;
  ruta:     TourRuta;
  vehiculo: TourVehiculo;
  unidades: number;
  total:    number; // precio del vehículo × unidades (MXN)
  charge:   number; // monto a cobrar ahora (total, o el 30 % si es anticipo)
  saldo:    number; // lo que queda por pagar el día del tour
  pct:      number; // porcentaje efectivamente cobrado
}

/**
 * Recalcula el cargo de un tour por vehículo (RZR) desde la matriz flota×ruta
 * del catálogo del servidor. El precio depende de la ruta y de la unidad
 * elegida — el cliente nunca decide el monto. Devuelve null si algo no cuadra.
 */
export function computeVehiculoCharge(input: VehiculoChargeInput): VehiculoChargeResult | null {
  const tour = TOURS_DB.find((t) => t.id === input.tourId || t.slug === input.tourSlug);
  if (!tour || tour.precioUnidad !== "vehiculo" || !tour.rutas || !tour.flota) return null;

  const rutaIdx = tour.rutas.findIndex((r) => r.nombre === input.ruta);
  if (rutaIdx < 0) return null;

  const vehiculo = tour.flota.find((v) => v.nombre === input.vehiculo);
  if (!vehiculo) return null;

  const precio = vehiculo.precios[rutaIdx];
  if (!precio || precio <= 0) return null;

  const unidades = clampInt(input.unidades, 1, 10);
  const total = precio * unidades;

  const pct    = normalizarPct(input.pct);
  const charge = pct === 100 ? total : Math.round((total * pct) / 100);

  return {
    tour, ruta: tour.rutas[rutaIdx], vehiculo, unidades,
    total, charge, saldo: total - charge, pct,
  };
}

/** Nombre descriptivo de una reserva por vehículo: "RZR — Ruta Nacimiento · Defender ×2". */
export function vehiculoBookingName(tour: Tour, rutaNombre: string, vehiculoNombre: string, unidades: number): string {
  const base = tour.nombre.split(" — ")[0];
  const uni  = unidades > 1 ? ` ×${unidades}` : "";
  return `${base} — ${rutaNombre} · ${vehiculoNombre}${uni}`;
}

// ── Tarifado de un carrito completo ──────────────────────────────────────────

export interface LineaCarrito {
  tourId: string; tourSlug: string; tourName: string; tourDate: string;
  adults: number; children: number; subtotal: number;
  /** Los tramos por separado: el correo dice "2 adultos · 1 niño · 1 menor". */
  childrenMid?: number; childrenSmall?: number;
  ruta?: string; vehiculo?: string; unidades?: number;
  eleccion?: string;
  /**
   * Actividades opcionales contratadas, ya con su precio de catálogo.
   *
   * 🔴 El bug que esto arregla: el add-on SÍ se cobraba —va dentro de
   * `charge.total`, o sea dentro de `subtotal`— pero no se copiaba aquí, así
   * que desaparecía del correo, de las notas del equipo y del panel. El cliente
   * veía $3,900 donde el tour para dos son $3,200 sin explicación, y el guía en
   * Xilitla nunca se enteraba de que habían pagado el Salto de las 7 Cascadas,
   * que necesita guía de rescate.
   */
  addOns?: { id: string; nombre: string; cantidad: number; precio: number; subtotal: number }[];
  /** Lo que costaba este renglón antes del descuento por varios recorridos. */
  subtotalSinDescuento?: number;
  /** Porcentaje descontado por ser el 2.º, 3.º… recorrido del carrito. */
  descuentoMultiple?: number;
}

export type TarifaCarrito =
  | {
      ok: true;
      lineItems: LineaCarrito[];
      total: number;
      /** Pesos ahorrados por llevar varios recorridos. 0 si va uno solo. */
      ahorroMultiple: number;
    }
  | { ok: false; error: string };


/**
 * Tarifa los recorridos de un carrito, siempre en el servidor.
 *
 * Lo usan LOS DOS caminos: el que cobra (`carrito-payment-intent`) y el que
 * guarda la cotización por correo (`guardar-carrito`). Vive aquí justo para que
 * no puedan divergir: si el correo promete un precio y el pago calcula otro, el
 * cliente lo descubre en la peor pantalla posible.
 *
 * Regla que no se rompe: lo que manda el cliente son referencias (qué tour, qué
 * día, cuánta gente). El `total` que viaja en su localStorage jamás se cobra.
 */
export function tarifarRecorridos(items: unknown[]): TarifaCarrito {
  const lineItems: LineaCarrito[] = [];
  let total = 0;

  for (const bruto of items) {
    const raw = bruto as Record<string, unknown>;
    if (!raw?.tourDate) {
      return { ok: false, error: "Falta la fecha de uno de los recorridos del carrito." };
    }
    if (!fechaTourValida(raw.tourDate)) {
      return { ok: false, error: "Una de las fechas no es válida. Revisa tu carrito." };
    }

    // Tours por vehículo (RZR, café): el precio sale de la matriz ruta×unidad.
    if (raw.ruta && raw.vehiculo) {
      // `pct: 100` porque aquí se pide el PRECIO COMPLETO del renglón; el
      // anticipo se aplica una sola vez sobre la suma, al final.
      const veh = computeVehiculoCharge({
        tourId:   raw.tourId as string,
        tourSlug: raw.tourSlug as string,
        ruta:     raw.ruta as string,
        vehiculo: raw.vehiculo as string,
        unidades: raw.unidades as number,
        pct:      100,
      });
      if (!veh) return { ok: false, error: "Ruta o vehículo inválido en el carrito." };
      lineItems.push({
        tourId:   veh.tour.id,
        tourSlug: veh.tour.slug,
        tourName: vehiculoBookingName(veh.tour, veh.ruta.nombre, veh.vehiculo.nombre, veh.unidades),
        tourDate: String(raw.tourDate),
        adults:   veh.unidades,
        children: 0,
        ruta:     veh.ruta.nombre,
        vehiculo: veh.vehiculo.nombre,
        unidades: veh.unidades,
        subtotal: veh.total,
      });
      total += veh.total;
      continue;
    }

    const charge = computeTourCharge({
      tourId:        raw.tourId as string,
      tourSlug:      raw.tourSlug as string,
      adults:        raw.adults as number,
      childrenMid:   raw.childrenMid as number,
      childrenSmall: raw.childrenSmall as number,
      promoCode:     raw.promoCode as string,
      pct:           100,
      addOns:        raw.addOns as { id: string; cantidad: number }[],
    });
    if (!charge) {
      return { ok: false, error: "Uno de los recorridos del carrito ya no está disponible con esos datos." };
    }

    // La elección se valida contra el catálogo, no se acepta a ciegas: viene del
    // localStorage del visitante, que cualquiera puede editar.
    const eleccionValida = charge.tour.eleccion?.opciones
      .find((o) => o.nombre === raw.eleccion || o.id === raw.eleccion)?.nombre;

    lineItems.push({
      tourId:   charge.tour.id,
      tourSlug: charge.tour.slug,
      tourName: charge.tour.nombre,
      tourDate: String(raw.tourDate),
      adults:   Number(raw.adults) || 1,
      children: (Number(raw.childrenMid) || 0) + (Number(raw.childrenSmall) || 0),
      childrenMid:   Number(raw.childrenMid) || 0,
      childrenSmall: Number(raw.childrenSmall) || 0,
      subtotal: charge.total,
      ...(eleccionValida ? { eleccion: eleccionValida } : {}),
      // Ya validados contra el catálogo por `computeTourCharge`: van con su
      // nombre y su precio real para que el correo y el panel los puedan pintar.
      ...(charge.addOns.length ? { addOns: charge.addOns } : {}),
    });
    total += charge.total;
  }

  // ── Descuento por varios recorridos ───────────────────────────────────────
  // Se aplica al final, sobre los renglones ya tarifados: el más caro completo,
  // el segundo −10 % y del tercero en adelante −15 %.
  //
  // No se acumula con un código promocional: un renglón que ya trae código se
  // queda como está. Sin esa guarda, un HUASTECA20 sobre el tercer recorrido
  // acabaría en 35 % de descuento sin que nadie lo hubiera decidido.
  let ahorroMultiple = 0;
  if (lineItems.length > 1) {
    const conPromo = items.some(
      (x) => typeof (x as Record<string, unknown>)?.promoCode === "string"
        && ((x as Record<string, unknown>).promoCode as string).trim() !== "",
    );
    if (!conPromo) {
      const orden = [...lineItems].sort((a, b) => b.subtotal - a.subtotal);
      orden.forEach((linea, i) => {
        const pct = descuentoPorPosicion(i);
        if (pct === 0) return;
        const original = linea.subtotal;
        const rebaja   = Math.round(original * pct / 100);
        linea.subtotalSinDescuento = original;
        linea.descuentoMultiple    = pct;
        linea.subtotal             = original - rebaja;
        ahorroMultiple += rebaja;
      });
      total -= ahorroMultiple;
    }
  }

  return { ok: true, lineItems, total, ahorroMultiple };
}
