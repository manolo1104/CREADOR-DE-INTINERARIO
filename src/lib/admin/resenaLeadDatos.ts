// Solo servidor: la reseña de Google de los leads, leída de la base (19 nov 2026).
//
// `resenasDeLeads` lo llama el tablero de Leads (los Operado de su columna) de
// una vez para todos, y `resenaDelLead` la ficha de un lead Operado. Pocas
// consultas para todo el lote, nunca una por lead. Solo lee: abrir el tablero
// o la ficha no escribe nada (la marca la pone el botón, con la ruta
// `/api/admin/reservas/[id]/resena-whatsapp`). Si la base falla, la pantalla
// se abre igual, sin el botón.
//
// Las reglas viven en `resenaLead.ts` (puro, con pruebas).

import { prisma } from "@/lib/prisma";
import { hoyMX } from "@/lib/dates";
import { ESTADOS_NO_ELEGIBLES, reviewPedidaEn, reviewWhatsappEn } from "@/lib/reviewRequest";
import { nombreTour } from "@/lib/reviewEmail";
import { ultimoDiaDelTour } from "@/lib/encuestas/encuesta";
import { diasDeTourDe, viajeConTodoCancelado } from "./salidas";
import { normalizarTelefono } from "./crm";
import { estadoResenaLead, viajeQueTermino, type MensajeDelChat, type ResenaLead, type ReservaParaResena } from "./resenaLead";

export type { ResenaLead };

/** Cuántos mensajes nuestros por chat se leen desde que terminó el viaje: de sobra para ver si se pidió. */
const MENSAJES_POR_CHAT = 200;

/**
 * El renglón que deja en la bitácora el botón «Pedir reseña por WhatsApp»
 * (`/api/admin/reservas/[id]/resena-whatsapp`). La marca de la reserva solo
 * guarda CUÁNDO; quién la pidió está en ese renglón (20 nov 2026). Si ese texto
 * cambia allá, aquí solo se deja de ver el nombre.
 */
const PREFIJO_RESENA_BITACORA = "Pidió reseña de Google por WhatsApp";
/** El renglón se escribe justo después de la marca; este margen cubre la diferencia de relojes entre el servidor y la base. */
const MARGEN_RENGLON_MS = 5 * 60_000;

/** La reseña de cada lead que ya viajó (los que no, no vienen). */
export async function resenasDeLeads(ids: string[], hoy: string = hoyMX()): Promise<Record<string, ResenaLead>> {
  const unicos = Array.from(new Set(ids.filter(Boolean)));
  if (!unicos.length) return {};
  try {
    const [ops, reservas] = await Promise.all([
      prisma.oportunidad.findMany({
        where:  { id: { in: unicos } },
        select: { id: true, contactoId: true, contacto: { select: { nombre: true, telefono: true, idioma: true } } },
      }),
      // `tourDate` es el día del PRIMER renglón: si es después de hoy, el viaje
      // todavía no termina. El último día se decide abajo con todos sus renglones.
      prisma.tourBooking.findMany({
        where:  { oportunidadId: { in: unicos }, status: { notIn: ESTADOS_NO_ELEGIBLES }, tourDate: { lte: hoy } },
        select: {
          id: true, oportunidadId: true, confirmationNumber: true, status: true, depositoPagado: true, totalAmount: true,
          tourDate: true, tourSlug: true, tourName: true, lineItems: true, adults: true, children: true, customerName: true, customerPhone: true,
          encuesta: { select: { satisfaccionEnviadaEn: true, calificacion: true } },
        },
      }),
    ]);
    if (!reservas.length) return {};

    // Si Operación marcó «Cancelada» TODAS sus salidas, no hizo ningún tour (el mismo criterio que el correo automático).
    const fechas = Array.from(new Set(reservas.flatMap(b => diasDeTourDe(b).map(d => d.fecha))));
    const canceladas = new Set(fechas.length
      ? (await prisma.salida.findMany({ where: { estado: "cancelada", fecha: { in: fechas } }, select: { clave: true } }).catch(() => [])).map(s => s.clave)
      : []);

    const idiomaDe = new Map(ops.map(o => [o.id, o.contacto.idioma === "en" ? "en" as const : "es" as const]));
    const porLead = new Map<string, ReservaParaResena[]>();
    for (const b of reservas) {
      if (!b.oportunidadId) continue;
      const lista = porLead.get(b.oportunidadId) ?? [];
      lista.push({
        id: b.id, folio: b.confirmationNumber, status: b.status, depositoPagado: b.depositoPagado ?? 0,
        ultimoDia: ultimoDiaDelTour(b) || null,
        todoCancelado: viajeConTodoCancelado(b, canceladas),
        // Las reservas guardan el nombre en español: al contacto en inglés, el de inglés.
        tour: nombreTour(b.tourName, b.tourSlug, idiomaDe.get(b.oportunidadId) ?? "es").split("—")[0].trim(),
        // El correo y la encuesta se marcan juntos; la encuesta también, por si un PATCH de Reservas borró el `_meta`.
        correoEn: reviewPedidaEn(b.lineItems) ?? b.encuesta?.satisfaccionEnviadaEn?.toISOString() ?? null,
        whatsappEn: reviewWhatsappEn(b.lineItems) ?? null,
        calificacion: b.encuesta?.calificacion ?? null,
        telefono: b.customerPhone ?? null,
      });
      porLead.set(b.oportunidadId, lista);
    }

    // Los chats de la Bandeja, solo de los que ya viajaron: por su contacto o por su teléfono.
    const conViaje: { o: (typeof ops)[number]; viaje: { desde: string; reservas: ReservaParaResena[] }; tel: string | null }[] = [];
    for (const o of ops) {
      const viaje = viajeQueTermino(porLead.get(o.id) ?? [], hoy);
      if (viaje) conViaje.push({ o, viaje, tel: normalizarTelefono(o.contacto.telefono) });
    }
    if (!conViaje.length) return {};
    const desde = conViaje.map(x => x.viaje.desde).sort()[0];
    const tels = Array.from(new Set(conViaje.map(x => x.tel).filter((t): t is string => !!t)));
    // Las reservas del viaje que ya tienen la marca del botón: de ellas se busca quién la pidió.
    const marcadas = conViaje.flatMap(x => x.viaje.reservas).filter(r => !!r.whatsappEn && Number.isFinite(Date.parse(r.whatsappEn)));
    // Una sola lectura para todo el lote, acotada por fecha (índice de `createdAt`), como la de la confirmación por correo.
    const leerRenglones: Promise<{ referencia: string | null; nombre: string; createdAt: Date }[]> = marcadas.length
      ? prisma.bitacora.findMany({
          where: {
            accion:     "envió",
            entidad:    "reserva",
            referencia: { in: marcadas.map(r => r.folio) },
            resumen:    { startsWith: PREFIJO_RESENA_BITACORA },
            createdAt:  { gte: new Date(Math.min(...marcadas.map(r => Date.parse(r.whatsappEn as string))) - MARGEN_RENGLON_MS) },
          },
          orderBy: { createdAt: "desc" },
          select:  { referencia: true, nombre: true, createdAt: true },
        }).catch(() => [])
      : Promise.resolve([]);
    const [chats, renglones] = await Promise.all([
      prisma.conversacion.findMany({
        where: {
          noEsCliente: false,
          OR: [{ contactoId: { in: conViaje.map(x => x.o.contactoId) } }, ...(tels.length ? [{ telefono: { in: tels } }] : [])],
        },
        select: {
          contactoId: true, telefono: true,
          mensajes: {
            // Desde las 00:00 de México del primer día que cuenta; la regla fina de cada lead va en `peticionesDelChat`.
            where:   { direccion: "sale", fecha: { gte: new Date(`${desde}T00:00:00-06:00`) } },
            select:  { fecha: true, texto: true, direccion: true, estado: true, enviadoDesde: true, enviadoPor: true },
            orderBy: { fecha: "desc" },
            take:    MENSAJES_POR_CHAT,
          },
        },
      }).catch(() => []),
      leerRenglones,
    ]);
    // De cada reserva, el renglón más reciente desde su marca (la marca guarda la última vez que se pidió).
    const quienPidio = new Map<string, string>();
    for (const r of marcadas) {
      const desdeMarca = Date.parse(r.whatsappEn as string) - MARGEN_RENGLON_MS;
      const renglon = renglones.find(b => b.referencia === r.folio && b.createdAt.getTime() >= desdeMarca);
      if (renglon?.nombre) quienPidio.set(r.id, renglon.nombre);
    }

    const resultado: Record<string, ResenaLead> = {};
    for (const { o, tel } of conViaje) {
      const mensajes: MensajeDelChat[] = chats
        .filter(c => c.contactoId === o.contactoId || (!!tel && c.telefono === tel))
        .flatMap(c => c.mensajes.map(x => ({ fecha: x.fecha, texto: x.texto, direccion: x.direccion, estado: x.estado, desde: x.enviadoDesde, por: x.enviadoPor })));
      const reservas = (porLead.get(o.id) ?? []).map(r => ({ ...r, whatsappPor: quienPidio.get(r.id) ?? null }));
      const r = estadoResenaLead({ nombre: o.contacto.nombre, telefono: o.contacto.telefono, idioma: o.contacto.idioma, reservas, mensajes }, hoy);
      if (r) resultado[o.id] = r;
    }
    return resultado;
  } catch (e) {
    console.error("resenasDeLeads:", e instanceof Error ? e.message : String(e));
    return {};
  }
}

/** La reseña de UN lead (la ficha), o null si todavía no viaja o la base falló. */
export async function resenaDelLead(id: string, hoy: string = hoyMX()): Promise<ResenaLead | null> {
  return (await resenasDeLeads([id], hoy))[id] ?? null;
}
