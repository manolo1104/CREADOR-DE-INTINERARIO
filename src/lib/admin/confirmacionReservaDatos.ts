// Solo servidor: el correo de confirmación de las reservas, en la base (19 nov 2026).
//
//  · `anotarConfirmacionEnviada`: lo llama CADA camino que manda la
//    confirmación, justo después de que Brevo aceptó el correo. Deja el mismo
//    renglón en la bitácora y cierra la tarea «confirmacion-liga:<id>» si la
//    liga pagada la había dejado. Nunca lanza.
//  · `confirmacionesDelLead`: lo que la ficha del lead dice de cada reserva
//    (falta, enviada, sin correo…). Solo lee: abrir la ficha no escribe nada.
//
// Las reglas viven en `confirmacionReserva.ts` (puro, con pruebas).

import { prisma } from "@/lib/prisma";
import { hoyMX } from "@/lib/dates";
import { registrarEnBitacora, type Actor } from "./bitacora";
import { montoCobrado } from "./dinero";
import { metaDe } from "./reserva";
import {
  ACCION_CONFIRMACION, ENTIDAD_CONFIRMACION, PREFIJO_CONFIRMACION,
  claveTareaConfirmacion, correoUsable, estadoConfirmacion, eventoConfirmacionEnviada, leerRenglonConfirmacion, ultimoDiaReserva,
  type ConfirmacionDeReserva,
} from "./confirmacionReserva";

// ── Al mandarla ─────────────────────────────────────────────────────────────

/**
 * Deja constancia de que la confirmación de una reserva SALIÓ. Va después de
 * `sendBrevoEmail` (que lanza si Brevo no la acepta), nunca antes. Devuelve
 * cuándo quedó anotada.
 *
 * Nunca lanza: el correo ya salió y el pago ya está guardado; si la base falla
 * aquí, la ficha dirá «falta» y alguien la mandará otra vez, que es menos malo
 * que tumbar el cobro.
 */
export async function anotarConfirmacionEnviada(p: {
  /** Para cerrar su tarea «confirmacion-liga:<id>». Sin él, solo la bitácora. */
  reservaId?: string | null;
  folio: string;
  destinatario: string;
  cliente: string;
  /** Sin actor, la bitácora pone a quien tenga la sesión abierta. */
  actor?: Actor;
}): Promise<Date> {
  const enviadaEn = new Date();
  try {
    await registrarEnBitacora(eventoConfirmacionEnviada(p));
    if (p.reservaId) await cerrarTareaConfirmacion(p.reservaId, p.actor?.nombre ?? "Panel", enviadaEn);
  } catch (e) {
    console.error("anotarConfirmacionEnviada:", e instanceof Error ? e.message : String(e));
  }
  return enviadaEn;
}

/**
 * La liga pagada deja «mándale la confirmación» cuando su correo no salió
 * (`confirmarPagoDeLiga`). Si después sale por cualquier camino, esa tarea ya
 * está hecha y su lead deja de mostrarla como próximo paso.
 */
async function cerrarTareaConfirmacion(reservaId: string, quien: string, cuando: Date): Promise<void> {
  const t = await prisma.tarea.findUnique({
    where:  { claveRegla: claveTareaConfirmacion(reservaId) },
    select: { id: true, estado: true, titulo: true, oportunidadId: true },
  });
  if (!t || t.estado !== "pendiente") return;
  const r = await prisma.tarea.updateMany({
    where: { id: t.id, estado: "pendiente" },
    data:  { estado: "hecha", hechaPor: quien.slice(0, 80), hechaEn: cuando },
  });
  if (r.count && t.oportunidadId) {
    const opId = t.oportunidadId;
    await import("./crmDatos").then(m => m.sincronizarProximoPaso(opId, t.titulo));
  }
}

// ── En la ficha del lead ────────────────────────────────────────────────────

// El tipo vive en el módulo puro para que la pantalla lo use sin traer Prisma.
export type { ConfirmacionDeReserva };

const UN_DIA_MS = 86_400_000;

/**
 * La confirmación de cada reserva del lead, de la más nueva a la más vieja.
 * Solo lee. Si la base falla devuelve [] (la ficha se abre igual, sin el aviso).
 *
 * Bitácora no tiene índice por folio: la búsqueda va acotada por fecha (desde
 * que existe la reserva más vieja que importa; antes no pudo salir su correo)
 * y solo para las reservas vivas, con dinero y con el viaje por delante.
 */
export async function confirmacionesDelLead(oportunidadId: string, hoy: string = hoyMX()): Promise<ConfirmacionDeReserva[]> {
  try {
    const reservas = await prisma.tourBooking.findMany({
      where:   { oportunidadId },
      orderBy: { createdAt: "desc" },
      select:  {
        id: true, confirmationNumber: true, status: true, totalAmount: true, depositoPagado: true, stripePaymentIntentId: true,
        customerEmail: true, createdAt: true, tourDate: true, tourSlug: true, lineItems: true,
      },
    });
    if (!reservas.length) return [];

    const hechos = reservas.map(r => {
      const base = { status: r.status, cobrado: montoCobrado(r), customerEmail: r.customerEmail, createdAt: r.createdAt, ultimoDia: ultimoDiaReserva(r), enviadaEn: null };
      return { r, base, sinRegistro: estadoConfirmacion(base, hoy) };
    });
    // Cancelada, viaje pasado o sin dinero: el registro no cambia nada.
    const porLeer = hechos.filter(h => h.sinRegistro !== "no-aplica" && h.sinRegistro !== "sin-pago");

    let renglones: { referencia: string | null; resumen: string; createdAt: Date; nombre: string }[] = [];
    let tareas: { claveRegla: string | null }[] = [];
    if (porLeer.length) {
      [renglones, tareas] = await Promise.all([
        prisma.bitacora.findMany({
          where: {
            accion:     ACCION_CONFIRMACION,
            entidad:    ENTIDAD_CONFIRMACION,
            referencia: { in: porLeer.map(h => h.r.confirmationNumber) },
            resumen:    { startsWith: PREFIJO_CONFIRMACION },
            createdAt:  { gte: new Date(Math.min(...porLeer.map(h => h.r.createdAt.getTime())) - UN_DIA_MS) },
          },
          orderBy: { createdAt: "desc" },
          select:  { referencia: true, resumen: true, createdAt: true, nombre: true },
        }),
        prisma.tarea.findMany({
          where:  { claveRegla: { in: porLeer.map(h => claveTareaConfirmacion(h.r.id)) }, estado: "pendiente" },
          select: { claveRegla: true },
        }),
      ]);
    }

    return hechos.map(({ r, base }): ConfirmacionDeReserva => {
      // La más reciente de ESTE folio (vienen ordenadas de la más nueva).
      const ultimo = renglones
        .map(x => ({ x, leido: leerRenglonConfirmacion(x) }))
        .find(({ leido }) => leido?.folio === r.confirmationNumber);
      const enviadaEn = ultimo?.x.createdAt ?? null;
      return {
        reservaId:      r.id,
        folio:          r.confirmationNumber,
        estado:         estadoConfirmacion({ ...base, enviadaEn }, hoy),
        enviadaEn:      enviadaEn ? enviadaEn.toISOString() : null,
        destinatario:   ultimo?.leido?.destinatario ?? null,
        enviadaPor:     ultimo?.x.nombre ?? null,
        correo:         correoUsable(r.customerEmail) ? r.customerEmail : null,
        idioma:         metaDe(r).locale === "en" ? "en" : "es",
        tareaPendiente: tareas.some(t => t.claveRegla === claveTareaConfirmacion(r.id)),
        creadaEn:       r.createdAt.toISOString(),
      };
    });
  } catch (e) {
    console.error("confirmacionesDelLead:", e instanceof Error ? e.message : String(e));
    return [];
  }
}
