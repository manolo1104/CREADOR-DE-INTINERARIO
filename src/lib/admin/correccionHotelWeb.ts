// El hotel de las reservas de la web que se guardaron SIN su importe (lote 5
// de la auditoría, 5 nov 2026). Lo usa `src/scripts/corregir-hotel-reservas-web.ts`.
//
// 🔴 Hasta hoy:
//   · la reserva del carrito con hotel que creaba la pantalla de confirmación
//     no guardaba el hotel (`packageItems`): solo iba al correo y a las notas;
//   · la de paquete guardaba el hotel SIN `subtotal`.
// El corte toma el hotel de ese `subtotal` (`hotelDe`): sin él, el dinero que
// Manolo le paga al hotel se repartía 50/50 con Martín como si fuera de tours.
//
// De dónde sale el hotel, en este orden:
//   1. la metadata del pago en Stripe: `hospedajeData` del carrito; en el
//      paquete, `importeHotel` o el recálculo que dé el MISMO total cobrado;
//   2. si Stripe no la da, la nota «Hospedaje: …» del carrito, con el importe
//      que diga la nota o, si no lo dice, el total menos lo que suman sus
//      recorridos (y solo si eso es positivo y no pasa del total).
// Lo que no cuadre se lista para revisarlo a mano: nunca se adivina.

import type { PrismaClient } from "@prisma/client";
import { getPaquete } from "@/lib/paquetes";
import { tipoFolio } from "@/lib/admin/folio";
import { registrarEnBitacora, SISTEMA, pesos } from "@/lib/admin/bitacora";
import { HOTEL_PARAISO_WEB, importeHotelDePaquete, renglonHotelCarrito } from "@/lib/reservaWeb";
import { leerJson } from "@/lib/webhookRecuperacion";

export interface ReservaParaCorregir {
  id: string;
  confirmationNumber: string;
  tourSlug: string;
  totalAmount: number;
  status: string;
  notes: string | null;
  lineItems: unknown;
  packageItems: unknown;
  stripePaymentIntentId: string | null;
}

export type PropuestaHotel =
  | { accion: "nada"; motivo: string }
  | { accion: "revisar"; motivo: string }
  | { accion: "corregir"; fuente: "stripe" | "nota"; importe: number; packageItems: Record<string, unknown>[] };

type Fila = Record<string, unknown>;
const filas = (v: unknown): Fila[] => (Array.isArray(v) ? v.filter((x): x is Fila => !!x && typeof x === "object") : []);
const esHotel = (p: Fila) => p._meta !== true && !!(p.hotel || p.habitacion);
const importeDe = (p: Fila) => Math.max(0, Math.round(Number(p.subtotal) || 0));

/** Lo que se sabe del hotel por la nota de la reserva («Hospedaje: …»). */
export function hotelDeLaNota(notas: string | null | undefined): { habitacion: string; noches: number; huespedes: number; importe: number | null; checkin: string; checkout: string } | null {
  const m = (notas ?? "").match(/Hospedaje:\s*([^|]+)/);
  if (!m) return null;
  const texto = m[1].trim();
  // La del webhook: «Lirios 1 (2) · 2 noches · 2 huéspedes · $3600».
  const web = texto.match(/^(.+?)\s*·\s*(\d+)\s*noches?\s*·\s*(\d+)\s*hu[ée]sped(?:es)?\s*·\s*\$\s*([\d,.]+)/i);
  if (web) {
    return { habitacion: web[1].trim(), noches: Number(web[2]), huespedes: Number(web[3]), importe: Math.round(Number(web[4].replace(/[,]/g, ""))) || null, checkin: "", checkout: "" };
  }
  // La de la pantalla: «Lirios 1 (2), 2 noche(s), 2 huésped(es) — entrada 2026-11-20, salida 2026-11-22.»
  const pantalla = texto.match(/^(.+?),\s*(\d+)\s*noche\(s\),\s*(\d+)\s*hu[ée]sped\(es\)/i);
  if (!pantalla) return null;
  const entrada = texto.match(/entrada\s+(\d{4}-\d{2}-\d{2})/i)?.[1] ?? "";
  const salida = texto.match(/salida\s+(\d{4}-\d{2}-\d{2})/i)?.[1] ?? "";
  return { habitacion: pantalla[1].trim(), noches: Number(pantalla[2]), huespedes: Number(pantalla[3]), importe: null, checkin: entrada, checkout: salida };
}

/** Lo que suman los renglones (recorridos y traslado) de la reserva. */
function sumaDeRenglones(lineItems: unknown): number {
  return filas(lineItems).filter((l) => !l._meta).reduce((s, l) => s + Math.max(0, Math.round(Number(l.subtotal) || 0)), 0);
}

/**
 * Qué hacer con el hotel de una reserva. `meta`: la metadata de su pago en
 * Stripe, o null si no se pudo leer.
 */
export function propuestaHotel(r: ReservaParaCorregir, meta: Record<string, string> | null): PropuestaHotel {
  if (!r.stripePaymentIntentId || tipoFolio(r.confirmationNumber) !== "web") return { accion: "nada", motivo: "no es un pago de la web" };
  const actuales = filas(r.packageItems);
  const hoteles = actuales.filter(esHotel);
  if (hoteles.some((p) => importeDe(p) > 0)) return { accion: "nada", motivo: "el hotel ya tiene su importe" };

  const paquete = getPaquete(r.tourSlug);
  if (paquete) {
    if (paquete.evento?.sinHotel) return { accion: "nada", motivo: "paquete sin hotel" };
    if (!hoteles.length) return { accion: "revisar", motivo: "paquete sin renglón de hotel" };
    if (!meta) return { accion: "revisar", motivo: "no se pudo leer el pago en Stripe" };
    const importe = importeHotelDePaquete(meta);
    if (!importe) return { accion: "revisar", motivo: "el recálculo del paquete no da el total que se cobró (cambió una tarifa)" };
    if (importe > r.totalAmount) return { accion: "revisar", motivo: `el hotel (${pesos(importe)}) saldría mayor que la reserva (${pesos(r.totalAmount)})` };
    let puesto = false;
    const packageItems = actuales.map((p) => {
      if (puesto || !esHotel(p)) return p;
      puesto = true;
      return { ...p, subtotal: importe };
    });
    return { accion: "corregir", fuente: "stripe", importe, packageItems };
  }

  // Carrito con hotel.
  const deStripe = renglonHotelCarrito(leerJson(meta?.hospedajeData))?.[0];
  const nota = hotelDeLaNota(r.notes);
  if (!deStripe && !nota) return { accion: "nada", motivo: "no pagó hotel" };
  let renglon: Fila;
  let fuente: "stripe" | "nota";
  if (deStripe && deStripe.subtotal > 0) {
    renglon = deStripe;
    fuente = "stripe";
  } else if (nota) {
    const resto = r.totalAmount - sumaDeRenglones(r.lineItems);
    const importe = nota.importe ?? (resto > 0 ? resto : null);
    if (!importe) return { accion: "revisar", motivo: "la nota no dice cuánto costó el hotel y el total no deja un sobrante" };
    renglon = {
      hotel: HOTEL_PARAISO_WEB, habitacion: nota.habitacion, noches: nota.noches,
      habitaciones: nota.habitacion.split(" + ").length, checkin: nota.checkin, checkout: nota.checkout, subtotal: importe,
    };
    fuente = "nota";
  } else {
    return { accion: "revisar", motivo: "el pago trae el hotel sin importe" };
  }
  const importe = importeDe(renglon);
  if (importe > r.totalAmount) return { accion: "revisar", motivo: `el hotel (${pesos(importe)}) saldría mayor que la reserva (${pesos(r.totalAmount)})` };
  // Si ya había un renglón de hotel sin importe, se le pone; si no, se agrega.
  const packageItems = hoteles.length
    ? actuales.map((p) => (p === hoteles[0] ? { ...p, subtotal: importe } : p))
    : [...actuales, renglon];
  return { accion: "corregir", fuente, importe, packageItems };
}

export interface ResumenCorreccion {
  revisadas: number;
  corregidas: { folio: string; importe: number; fuente: string }[];
  revisar: { folio: string; motivo: string }[];
}

/**
 * Recorre las reservas de la web que podrían tener el hotel sin importe y, con
 * `aplicar`, lo escribe (y deja la bitácora). `leerMetadata`: la del pago en
 * Stripe (el script la pide a Stripe; las pruebas la inventan).
 */
export async function corregirHotelReservasWeb(opts: {
  db: PrismaClient;
  aplicar: boolean;
  leerMetadata: (paymentIntentId: string) => Promise<Record<string, string> | null>;
  log?: (linea: string) => void;
  /** Para probar con unas pocas: solo los folios que empiezan así. */
  prefijo?: string;
}): Promise<ResumenCorreccion> {
  const log = opts.log ?? (() => {});
  const todas = await opts.db.tourBooking.findMany({
    where: {
      stripePaymentIntentId: { not: null },
      ...(opts.prefijo ? { confirmationNumber: { startsWith: opts.prefijo } } : {}),
    },
    select: { id: true, confirmationNumber: true, tourSlug: true, totalAmount: true, status: true, notes: true, lineItems: true, packageItems: true, stripePaymentIntentId: true },
    orderBy: { createdAt: "asc" },
  });
  // Solo las que pueden traer hotel: paquete, nota «Hospedaje:» o un renglón de hotel.
  const candidatas = todas.filter((r) =>
    tipoFolio(r.confirmationNumber) === "web"
    && (!!getPaquete(r.tourSlug) || /Hospedaje:/.test(r.notes ?? "") || filas(r.packageItems).some(esHotel))
    && !filas(r.packageItems).some((p) => esHotel(p) && importeDe(p) > 0));

  const resumen: ResumenCorreccion = { revisadas: candidatas.length, corregidas: [], revisar: [] };
  for (const r of candidatas) {
    let meta: Record<string, string> | null = null;
    try { meta = await opts.leerMetadata(r.stripePaymentIntentId!); } catch { meta = null; }
    const p = propuestaHotel(r, meta);
    if (p.accion === "nada") continue;
    if (p.accion === "revisar") {
      resumen.revisar.push({ folio: r.confirmationNumber, motivo: p.motivo });
      log(`⚠️  ${r.confirmationNumber} (${r.status}): revisar a mano — ${p.motivo}`);
      continue;
    }
    resumen.corregidas.push({ folio: r.confirmationNumber, importe: p.importe, fuente: p.fuente });
    log(`${opts.aplicar ? "✅" : "→ "} ${r.confirmationNumber} (${r.status}): hotel ${pesos(p.importe)} de ${pesos(r.totalAmount)} (según ${p.fuente === "stripe" ? "el pago en Stripe" : "la nota de la reserva"})`);
    if (!opts.aplicar) continue;
    await opts.db.tourBooking.update({ where: { id: r.id }, data: { packageItems: p.packageItems as never } });
    await registrarEnBitacora({
      accion:     "modificó",
      entidad:    "reserva",
      referencia: r.confirmationNumber,
      resumen:    `Reserva ${r.confirmationNumber}: el hotel queda con su importe (${pesos(p.importe)}, según ${p.fuente === "stripe" ? "el pago en Stripe" : "la nota de la reserva"}) para que el corte no lo reparta como tours`,
      actor:      SISTEMA,
    });
  }
  return resumen;
}
