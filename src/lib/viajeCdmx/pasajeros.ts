/**
 * Lo que el panel hace con los pasajeros del viaje: agregar una venta por
 * WhatsApp, mover a alguien de fecha y cancelar un lugar. Todo bajo el mismo
 * candado que la venta en línea: una venta del panel también gasta lugar, y
 * nadie del equipo puede vender el asiento que alguien está pagando en el sitio.
 *
 * Antes de esto, las ventas por fuera del sitio se anotaban en un contador
 * aparte (el «Lugares» de Xantolo) y el equipo capturaba cada venta dos veces.
 */
import type { TourBooking } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { registrarEnBitacora, pesos, type Actor } from "@/lib/admin/bitacora";
import { conMeta } from "@/lib/admin/reserva";
import { conSalidaBloqueada, conSalidasBloqueadas, ErrorViaje, libres, ocupacion } from "./cupo";
import { precioVigente, rangoCorto } from "./precio";
import { HORA_SALIDA, PUNTO_SALIDA, VIAJE_NOMBRE, VIAJE_SLUG } from "./config";

export interface DatosPasajero {
  nombre: string;
  email?: string | null;
  telefono?: string | null;
  personas: number;
  /** Por persona. Vacío = el precio vigente de la salida. */
  precioUnitario?: number | null;
  /** El lugar gratis del líder: total en $0. */
  cortesia?: boolean;
  liderCodigo?: string | null;
  /** whatsapp | telefono | walkin */
  origen?: string;
  nota?: string | null;
}

const ORIGENES = new Set(["whatsapp", "telefono", "walkin", "web", "ota"]);

function folioPanel(): string {
  // Mismo formato que las reservas del panel (`ReservasClient`): HP-M-…
  return "HP-M-" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 4).toUpperCase();
}

/** Una venta del panel (WhatsApp, teléfono, en persona). Sin lugar, 409. */
export async function agregarPasajero(salidaId: string, d: DatosPasajero, actor: Actor): Promise<TourBooking> {
  const personas = Math.floor(Number(d.personas));
  if (!Number.isFinite(personas) || personas < 1 || personas > 14) throw new ErrorViaje(400, "personas", "Número de personas inválido.");
  const nombre = String(d.nombre || "").trim();
  if (!nombre) throw new ErrorViaje(400, "nombre", "Falta el nombre.");

  const reserva = await conSalidaBloqueada(salidaId, async (tx, salida) => {
    if (salida.estado === "cancelada") throw new ErrorViaje(409, "cancelada", "Esa salida está cancelada.");
    const o = await ocupacion(tx, salida.id);
    const quedan = libres(salida.capacidad, o);
    if (personas > quedan) {
      throw new ErrorViaje(409, "sin-lugar",
        `Solo quedan ${quedan} lugar${quedan === 1 ? "" : "es"}${o.enPago ? ` (${o.enPago} los están pagando en el sitio ahora mismo)` : ""}. Si sale otra camioneta, sube el cupo de la salida primero.`,
        { disponibles: quedan });
    }
    const unitario = d.cortesia ? 0 : Math.max(0, Math.round(Number(d.precioUnitario) || precioVigente(salida)));
    const total = unitario * personas;
    const salidaTexto = rangoCorto(salida.fechaSalida, salida.fechaRegreso);
    const tourName = `${VIAJE_NOMBRE} · ${salidaTexto}`;
    const notasInternas = [
      d.cortesia ? `Lugar de cortesía${d.liderCodigo ? ` del líder ${d.liderCodigo}` : ""}.` : "",
      !d.cortesia && d.liderCodigo ? `Viene con el líder ${d.liderCodigo}.` : "",
      d.nota ? String(d.nota).slice(0, 300) : "",
    ].filter(Boolean).join(" ");

    return tx.tourBooking.create({
      data: {
        confirmationNumber: folioPanel(),
        tourId: VIAJE_SLUG, tourName, tourSlug: VIAJE_SLUG, tourDate: salida.fechaSalida,
        adults: personas, children: 0, totalAmount: total,
        customerName: nombre.slice(0, 120),
        customerEmail: String(d.email || "").trim().toLowerCase().slice(0, 160),
        customerPhone: d.telefono ? String(d.telefono).trim().slice(0, 40) : null,
        salidaId: salida.id,
        origen: ORIGENES.has(String(d.origen)) ? String(d.origen) : "whatsapp",
        // Sin cobro todavía: el anticipo se registra con «Cobro» en Reservas,
        // que pide el comprobante y lleva el desglose del corte.
        status: total === 0 ? "paid" : "pending",
        lineItems: [
          {
            _meta: true,
            numPersonas: personas,
            salidaId: salida.id,
            liderCodigo: d.liderCodigo ? String(d.liderCodigo).toUpperCase() : null,
            precioUnitario: unitario,
            cortesia: !!d.cortesia,
            pickupLugar: PUNTO_SALIDA.nombre ? `${PUNTO_SALIDA.nombre} · ${HORA_SALIDA}` : `CDMX · ${HORA_SALIDA}`,
            locale: "es",
            ...(notasInternas ? { notasInternas } : {}),
          },
          { tourSlug: VIAJE_SLUG, tourName, tourDate: salida.fechaSalida, adults: personas, childrenMid: 0, childrenSmall: 0, subtotal: total },
        ],
      },
    });
  });

  await registrarEnBitacora({
    accion: "creó", entidad: "reserva", referencia: reserva.confirmationNumber, actor,
    resumen: `Viaje CDMX ${reserva.tourDate}: ${reserva.customerName}, ${reserva.adults} persona${reserva.adults === 1 ? "" : "s"}, ${d.cortesia ? "cortesía" : pesos(reserva.totalAmount)} (venta del panel)`,
  });
  // Al CRM (revisión del 4 nov 2026): el pasajero del viaje también es un lead. No lanza.
  await import("@/lib/admin/crmDatos").then(m => m.leadParaReservaSinLead(reserva.id, actor.nombre)).catch(() => {});
  return reserva;
}

/**
 * Cambia a un pasajero de fecha. Bloquea las dos salidas, en orden fijo. El
 * precio NO cambia: el anticipo es transferible y se respeta lo que pagó.
 */
export async function moverPasajero(reservaId: string, destinoId: string, actor: Actor): Promise<TourBooking> {
  const previa = await prisma.tourBooking.findUnique({ where: { id: reservaId } });
  if (!previa?.salidaId) throw new ErrorViaje(404, "sin-reserva", "Esa reserva no es del viaje.");
  if (previa.salidaId === destinoId) throw new ErrorViaje(400, "misma", "Ya está en esa fecha.");
  const origenId = previa.salidaId;

  const { movida, destino } = await conSalidasBloqueadas([origenId, destinoId], async (tx, salidas) => {
    const r = await tx.tourBooking.findUniqueOrThrow({ where: { id: reservaId } });
    if (r.salidaId !== origenId) throw new ErrorViaje(409, "cambio", "Esta reserva cambió mientras la movías. Recarga.");
    if (r.status === "cancelled") throw new ErrorViaje(409, "cancelada", "La reserva está cancelada.");
    const destino = salidas.get(destinoId)!;
    if (destino.estado === "cancelada") throw new ErrorViaje(409, "cancelada", "La fecha destino está cancelada.");
    const personas = r.adults + r.children;
    const o = await ocupacion(tx, destino.id);
    const quedan = libres(destino.capacidad, o);
    if (personas > quedan) {
      throw new ErrorViaje(409, "sin-lugar", `En esa fecha solo quedan ${quedan} lugar${quedan === 1 ? "" : "es"}.`, { disponibles: quedan });
    }
    const tourName = `${VIAJE_NOMBRE} · ${rangoCorto(destino.fechaSalida, destino.fechaRegreso)}`;
    const lineas = (Array.isArray(r.lineItems) ? r.lineItems : []).map((l) =>
      l && typeof l === "object" && !(l as { _meta?: unknown })._meta
        ? { ...(l as object), tourName, tourDate: destino.fechaSalida }
        : l);
    const movida = await tx.tourBooking.update({
      where: { id: r.id },
      data: {
        salidaId: destino.id,
        tourDate: destino.fechaSalida,
        tourName,
        lineItems: conMeta(lineas, { salidaId: destino.id }) as never,
      },
    });
    return { movida, destino };
  });

  await registrarEnBitacora({
    accion: "modificó", entidad: "reserva", referencia: movida.confirmationNumber, actor,
    resumen: `Viaje CDMX: ${movida.customerName} (${movida.adults + movida.children} persona${movida.adults + movida.children === 1 ? "" : "s"}) movido del ${previa.tourDate} al ${destino.fechaSalida}`,
    detalle: [{ campo: "Fecha", antes: previa.tourDate, despues: destino.fechaSalida }],
  });
  return movida;
}

/**
 * Cancela un lugar. El reembolso, si toca, se hace en Stripe: desde el 5 nov
 * 2026 el webhook lo refleja solo en el cobro (`reembolsosStripe.ts`).
 */
export async function cancelarPasajero(reservaId: string, actor: Actor): Promise<TourBooking> {
  const previa = await prisma.tourBooking.findUnique({ where: { id: reservaId } });
  if (!previa?.salidaId) throw new ErrorViaje(404, "sin-reserva", "Esa reserva no es del viaje.");
  const r = await conSalidaBloqueada(previa.salidaId, (tx) =>
    tx.tourBooking.update({ where: { id: reservaId }, data: { status: "cancelled", motivoCancelacion: previa.motivoCancelacion ?? "otro: lugar del viaje CDMX cancelado desde el panel" } }));
  // Su lead: si era su única reserva viva, pasa a Perdido con este motivo. No lanza.
  await import("@/lib/admin/crmDatos").then(m => m.leadTrasCancelarReserva(reservaId, actor.nombre)).catch(() => {});
  // 🔴 La liga del saldo que ya se le mandó por correo se apaga (lote 3, 5 nov
  // 2026): antes el cliente podía pagar el lugar ya revendido y nadie se
  // enteraba. No lanza; la conciliación de cada hora lo reintenta.
  await import("@/lib/admin/linksPago")
    .then(m => m.apagarLigasDe({ reservaIds: [reservaId], cotizacionIds: [r.cotizacionId] }, `se canceló el lugar del viaje ${r.confirmationNumber}`))
    .catch(() => {});
  await registrarEnBitacora({
    accion: "modificó", entidad: "reserva", referencia: r.confirmationNumber, actor,
    resumen: `Viaje CDMX ${r.tourDate}: canceló el lugar de ${r.customerName} (${r.adults + r.children} persona${r.adults + r.children === 1 ? "" : "s"})`,
    detalle: [{ campo: "Estado", antes: previa.status, despues: "cancelled" }],
  });
  return r;
}

/**
 * Se canceló una salida: las ligas sin pagar de sus pasajeros se apagan
 * (lote 3, 5 nov 2026). Sus lugares no se cancelan aquí: eso lo decide el
 * equipo (moverlos o devolver). No lanza.
 */
export async function apagarLigasDeSalida(salidaId: string, fecha: string): Promise<number> {
  try {
    const reservas = await prisma.tourBooking.findMany({ where: { salidaId }, select: { id: true } });
    if (!reservas.length) return 0;
    const { apagarLigasDe } = await import("@/lib/admin/linksPago");
    return (await apagarLigasDe({ reservaIds: reservas.map((r) => r.id) }, `se canceló la salida del viaje del ${fecha}`)).apagadas;
  } catch (e) {
    console.error("apagarLigasDeSalida:", (e as Error)?.message);
    return 0;
  }
}
