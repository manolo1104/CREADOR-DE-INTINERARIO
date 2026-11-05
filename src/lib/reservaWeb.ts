/**
 * La reserva de un pago de la web, armada SOLO con la metadata del cobro (lote
 * 5 de la auditoría, 5 nov 2026).
 *
 * 🔴 Por qué existe: la pantalla de confirmación (`/api/tours/send-confirmation`)
 * guardaba lo que le mandaba el navegador —recorridos, fecha, personas— y el
 * webhook (`recuperarPago.ts`) armaba la suya con la metadata. Resultado:
 *   · la misma compra quedaba distinta según quién ganara la carrera: la de la
 *     pantalla, sin el hotel que se pagó (el corte lo repartía 50/50 como si
 *     fuera de tours); la del webhook, con 6 adultos donde iban 2 y sin la
 *     elección ni el traslado de Valles;
 *   · cualquiera podía mandar a la pantalla otra fecha u otras personas con un
 *     pago bueno, o el pago de otro producto (Kora comparte la cuenta).
 * Ahora las dos rutas llaman a `armarReservaWeb` con la metadata que escribió
 * el SERVIDOR al crear el cobro. Del navegador solo se aceptan el nombre, el
 * correo, el teléfono y las notas.
 *
 * Sin base ni red: lo prueban las pruebas de vitest.
 */
import { CONFIRMA_SALIDA_DIAS } from "./tourBooking";
import { TOURS_DB } from "./tours";
import { HABITACIONES_HOTEL } from "./habitaciones";
import { computePaqueteCharge } from "./paquetePricing";
import { leerJson, reconstruirLineas, type LineaRecuperada } from "./webhookRecuperacion";

type Meta = Record<string, string | undefined>;

// ── ¿De qué es este pago? ───────────────────────────────────────────────────

export type ProductoWeb = "tour" | "paquete" | "viaje-cdmx" | "ajeno";

/**
 * De qué producto es un cobro. «ajeno»: no es de este sitio (Kora comparte la
 * cuenta de Stripe) o es un producto que ninguna pantalla de reservas conoce.
 */
export function productoDelPago(meta: Meta | null | undefined): ProductoWeb {
  const m = meta ?? {};
  // El mismo criterio que `esPagoDeTours` (recuperarPago.ts).
  if (m.source !== "huasteca-potosina.com" || !m.tourId) return "ajeno";
  if (!m.producto) return "tour";
  if (m.producto === "paquete") return "paquete";
  if (m.producto === "viaje-cdmx") return "viaje-cdmx";
  return "ajeno";
}

/** El aviso cuando un pago llega a la pantalla que no le toca. Nunca se crea reserva con él. */
export const PAGO_DE_OTRO_PRODUCTO = "Este pago no corresponde a esta reserva.";

// ── Hotel y traslado del carrito ────────────────────────────────────────────

export const HOTEL_PARAISO_WEB = "Hotel Paraíso Encantado";

/** El hotel del carrito como lo escribe `carrito-payment-intent` en `hospedajeData`. */
export interface HotelDelCarrito {
  habitacion?: string;
  noches?:     number;
  huespedes?:  number;
  total?:      number;
  checkin?:    string;
  checkout?:   string;
}

/**
 * El renglón de `packageItems` del hotel del carrito, CON su importe: es lo
 * que lee el corte (`hotelDe`) para no repartir el dinero del hotel 50/50.
 */
export function renglonHotelCarrito(h: HotelDelCarrito | null | undefined) {
  if (!h?.habitacion) return undefined;
  return [{
    hotel:        HOTEL_PARAISO_WEB,
    habitacion:   String(h.habitacion),
    noches:       Number(h.noches) || 0,
    habitaciones: String(h.habitacion).split(" + ").length,
    checkin:      h.checkin  || "",
    checkout:     h.checkout || "",
    subtotal:     Math.max(0, Math.round(Number(h.total) || 0)),
  }];
}

/** El traslado desde otra ciudad, como un renglón más (igual que la pantalla). */
export function renglonTraslado(
  viaje: { ciudad?: string; personas?: number; total?: number } | null | undefined,
  fecha: string,
  locale: "es" | "en",
): LineaRecuperada | null {
  if (!viaje?.ciudad) return null;
  return {
    tourName: locale === "en" ? `Transfer ${viaje.ciudad} → Xilitla (round trip)` : `Traslado ${viaje.ciudad} → Xilitla (ida y vuelta)`,
    tourDate: fecha,
    adults:   Number(viaje.personas) || 1,
    children: 0,
    subtotal: Number(viaje.total) || 0,
  };
}

// ── La reserva ──────────────────────────────────────────────────────────────

export interface ReservaWeb {
  tourId:   string;
  tourName: string;
  tourSlug: string;
  tourDate: string;
  /** El GRUPO (el mismo va a todos los recorridos), no la suma por recorrido. */
  adults:   number;
  children: number;
  totalAmount: number;
  saldo:    number;
  /** Recorridos (y el traslado), sin el `_meta`. */
  lineas:   LineaRecuperada[];
  /** El `_meta` de `lineItems`. */
  meta:     { _meta: true; locale: "es" | "en"; zonaHospedaje?: string };
  /** El hotel, con su importe; undefined si no se pagó hotel. */
  packageItems: ReturnType<typeof renglonHotelCarrito>;
  idiomaTour: "es" | "en";
  locale:   "es" | "en";
  /** Lo que escribió el cliente al pagar (carrito); null si no viene. */
  telefono: string | null;
  recogida: string;
  promoCode: string | null;
  promoDiscount: number;
  /** Lo que el equipo tiene que saber, en el formato de las notas del webhook. */
  notasEquipo: string[];
}

/** Lo que pide el recorrido por vehículo comprado solo (el RZR de `/reservar-tour/…/checkout`). */
function renglonRzr(meta: Meta, total: number): LineaRecuperada | null {
  if (!meta.vehiculo || !meta.ruta) return null;
  const unidades = Math.max(1, Number(meta.unidades) || 1);
  return {
    tourSlug: meta.tourSlug || "",
    tourName: meta.tourName || "",
    tourDate: meta.tourDate || "",
    ruta:     meta.ruta,
    vehiculo: meta.vehiculo,
    unidades,
    adults:   Number(meta.adults) || unidades,
    children: 0,
    childrenMid: 0,
    childrenSmall: 0,
    subtotal: total,
  };
}

/** El nombre corto del recorrido para las notas (la pantalla corta en «—»). */
const corto = (nombre: string) => nombre.split("—")[0].trim();

/** Lo que el equipo lee en las notas de una reserva hecha con la metadata. */
export function notasEquipoWeb(meta: Meta, lineas: LineaRecuperada[]): string[] {
  const locale = meta.locale === "en" ? "en" : "es";
  return [
    locale === "en" ? "⚠️ CLIENTE DE HABLA INGLESA: reservó desde la versión en inglés del sitio." : "",
    // Lo PIDIÓ, que no es lo mismo que haber comprado desde /en.
    meta.idiomaTour === "en" ? "🗣️ PIDIÓ GUÍA EN INGLÉS (sin costo): asignar guía bilingüe o avisarle antes por WhatsApp." : "",
    // La elección de cada recorrido (Siete Cascadas o Tamasopo): antes se perdía (lote 5).
    ...lineas.filter((l) => l.eleccion).map((l) => `${corto(l.tourName)} — eligió: ${l.eleccion}`),
    meta.addOns    ? `ACTIVIDAD EXTRA CONTRATADA: ${meta.addOns}` : "",
    meta.viajeroSolo ? `BAJO EL MÍNIMO (${meta.viajeroSolo}): pagó tarifa normal. Sumarlo a una salida compartida y confirmarle ${CONFIRMA_SALIDA_DIAS} días antes; si no se junta, REEMBOLSO del 100 %.` : "",
    meta.hospedaje ? `Hospedaje: ${meta.hospedaje}` : "",
    meta.traslado  ? `TRASLADO: ${meta.traslado}. Falta acordar hora y domicilio de recogida.` : "",
    // Ruta Surrealista desde Ciudad Valles (+$400 por reserva): ya va dentro
    // del subtotal del renglón; aquí, para que el equipo sepa ir por él allá.
    Number(meta.cargoValles) > 0 ? `🚐 SE HOSPEDA EN CIUDAD VALLES: traslado cobrado +$${Number(meta.cargoValles).toLocaleString("es-MX")}.` : "",
    // Eventos de Xantolo (4 oct 2026): lo que se opera esa noche y, en la
    // noche sin hotel, dónde pasar por el cliente.
    meta.recogida   ? `RECOGER EN: ${meta.recogida}` : "",
    meta.notaEquipo ? String(meta.notaEquipo) : "",
  ].filter(Boolean);
}

/**
 * La reserva de un pago de tours (carrito, RZR o un recorrido suelto) con lo
 * que escribió el servidor al crear el cobro. `cobrado` es lo que confirmó
 * Stripe. La usan la pantalla de confirmación, el webhook y la conciliación:
 * la misma compra queda igual sin importar quién llegue primero.
 */
export function armarReservaWeb(meta: Meta, cobrado: number): ReservaWeb {
  const locale = meta.locale === "en" ? "en" : "es";
  const totalCompleto = Math.round(Number(meta.totalCompleto) || 0);
  const totalAmount = totalCompleto > 0 ? totalCompleto : cobrado;

  const tours = reconstruirLineas(meta as Record<string, string>);
  const rzr = tours.length ? null : renglonRzr(meta, totalAmount);
  if (rzr) tours.push(rzr);
  const esCarrito = meta.carrito === "1" && tours.length > 0;

  // El grupo: el máximo por recorrido, como la pantalla. La metadata trae la
  // SUMA (`adults`): 2 personas en 3 recorridos daban 6 adultos.
  const adults = esCarrito
    ? Math.max(0, ...tours.map((l) => Number(l.adults) || 0)) || 1
    : Number(meta.adults) || 1;
  const children = esCarrito
    ? Math.max(0, ...tours.map((l) => Number(l.children) || 0))
    : Number(meta.children) || 0;

  const traslado = renglonTraslado(leerJson(meta.trasladoData), meta.tourDate || "", locale);
  const lineas = traslado ? [...tours, traslado] : tours;

  return {
    tourId:   meta.tourId || "unknown",
    tourName: meta.tourName || "Tour Huasteca",
    tourSlug: meta.tourSlug || "",
    tourDate: meta.tourDate || "",
    adults,
    children,
    totalAmount,
    saldo: Math.max(0, totalAmount - cobrado),
    lineas,
    meta: { _meta: true, locale, ...(meta.zonaHospedaje ? { zonaHospedaje: meta.zonaHospedaje } : {}) },
    packageItems: renglonHotelCarrito(leerJson<HotelDelCarrito>(meta.hospedajeData)),
    idiomaTour: meta.idiomaTour === "en" ? "en" : "es",
    locale,
    telefono: (meta.customerPhone || "").trim() || null,
    recogida: (meta.recogida || "").trim(),
    promoCode: (meta.promoCode || "").trim() || null,
    promoDiscount: Number(meta.promoDiscount) || 0,
    notasEquipo: notasEquipoWeb(meta, tours),
  };
}

// ── El hotel de un paquete ──────────────────────────────────────────────────

/**
 * Lo que vale el HOTEL dentro de un paquete pagado en la web (lote 5, 5 nov
 * 2026, plan aprobado por Manolo): va como `subtotal` del renglón del hotel
 * para que el corte lo separe de los tours en vez de repartirlo 50/50.
 *
 * Los cobros nuevos lo traen en la metadata (`importeHotel`). Los de antes se
 * recalculan con lo que pidió el cliente y SOLO valen si dan el mismo total que
 * se cobró: si una tarifa cambió desde entonces no se adivina (null).
 */
export function importeHotelDePaquete(meta: Meta): number | null {
  const directo = Math.round(Number(meta.importeHotel));
  if (Number.isFinite(directo) && directo > 0) return directo;
  const habitacion = String(meta.habitacion || "");
  const elegida = HABITACIONES_HOTEL.find((h) => h.nombre === habitacion);
  const r = computePaqueteCharge({
    slug:          meta.tourSlug,
    personas:      meta.adults,
    childrenMid:   meta.childrenMid,
    childrenSmall: meta.childrenSmall,
    vistaMontana:  elegida ? elegida.vistaMontana : /jungla|monta[ñn]a/i.test(habitacion),
    reparto:       meta.repartoHab ? String(meta.repartoHab).split("+").map((n) => Number(n) || 0) : undefined,
    nocheExtra:    String(meta.nocheExtra || "").startsWith("sí"),
    tourElegido:   meta.tourElegido,
    pct:           Number(meta.paquetePct) || 100,
    fecha:         meta.tourDate,
    conTour:       meta.conTour === "sí",
    desdeValles:   Number(meta.extraTraslado) > 0,
  });
  if (!r || r.total !== Math.round(Number(meta.totalCompleto) || 0)) return null;
  return r.importeHotel > 0 ? r.importeHotel : null;
}

// ── El contacto del CRM ─────────────────────────────────────────────────────

/**
 * El correo con que se busca o se crea el contacto de una reserva, o null si
 * es de relleno. 🔴 Las reservas pagadas sin correo se guardan con
 * «pendiente@desconocido»: usarlo enlazaba a TODAS ellas con el mismo contacto
 * y clientes distintos acababan en un solo lead (lote 5, 5 nov 2026).
 */
export function correoParaContacto(correo: string | null | undefined): string | null {
  const c = (correo ?? "").trim();
  if (!c.includes("@")) return null;
  if (/@desconocido$/i.test(c) || /\.invalid$/i.test(c)) return null;
  return c;
}
