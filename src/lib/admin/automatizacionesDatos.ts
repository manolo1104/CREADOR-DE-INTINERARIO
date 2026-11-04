// Solo servidor: aplica las reglas de `automatizaciones.ts` y manda el resumen
// diario de las 7:30 (Fase 3 del rediseño, 4 nov 2026). Lo corre el reloj del
// servidor cada 5 minutos (`recordatoriosTimer.ts`) y, de respaldo, el cron
// horario. Todo es idempotente: la tarea se crea por su `claveRegla` única y el
// resumen se reclama en `Config` antes de mandarse.
import { prisma } from "@/lib/prisma";
import { sendBrevoEmail } from "@/lib/brevo";
import { addDaysYMD } from "@/lib/dates";
import { saldoPendiente } from "./dinero";
import { diasDeTourDe } from "./salidas";
import { salidasEntre } from "./salidasDia";
import { sincronizarProximoPaso } from "./crmDatos";
import { usuariosAdmin } from "./usuarios";
import { ahoraMX } from "./crm";
import { correoDe } from "./recordatorios";
import {
  correoResumen, reglaCotizado, reglaLiga, reglaSaldo, reglaSalida, type LineaResumen, type TareaPorRegla,
} from "./automatizaciones";

/** Ligas más viejas que esto no generan tarea: son de antes de la regla. */
const DIAS_LIGA = 14;
import { BASE_URL } from "./automatizaciones";

const responsablesPanel = () => usuariosAdmin().filter(u => u.rol !== "guia").map(u => u.nombre);

/** Junta lo que cada regla necesita y devuelve las tareas que TOCAN (sin ver si ya existen). */
export async function tareasQueTocan(ahora: Date = new Date()): Promise<TareaPorRegla[]> {
  const { hoy } = ahoraMX(ahora);
  const responsables = responsablesPanel();

  const [cotizados, reservas, ligas, salidas] = await Promise.all([
    prisma.oportunidad.findMany({
      where: { etapa: "cotizado" },
      include: {
        contacto: { select: { nombre: true } },
        historial: { where: { nueva: "cotizado" }, orderBy: { createdAt: "desc" }, take: 1 },
        _count: { select: { tareas: { where: { estado: "pendiente" } } } },
      },
    }),
    prisma.tourBooking.findMany({
      where: { status: { not: "cancelled" }, tourDate: { lt: hoy } },
      select: { id: true, confirmationNumber: true, customerName: true, tourDate: true, tourSlug: true, tourName: true, lineItems: true, totalAmount: true, depositoPagado: true, stripePaymentIntentId: true, createdAt: true, oportunidadId: true, adults: true, children: true },
    }),
    prisma.linkPago.findMany({
      where: { estado: "activo", createdAt: { gte: new Date(ahora.getTime() - DIAS_LIGA * 86400000) } },
    }),
    salidasEntre(addDaysYMD(hoy, 1), addDaysYMD(hoy, 2)),
  ]);

  // El folio de la cotización vigente de cada lead cotizado, para el título.
  const cots = cotizados.length ? await prisma.tourQuote.findMany({
    where: { oportunidadId: { in: cotizados.map(c => c.id) } },
    select: { oportunidadId: true, quoteNumber: true, updatedAt: true }, orderBy: { updatedAt: "desc" },
  }) : [];

  // El lead de cada liga (por su cotización o su reserva).
  const cotsLiga = ligas.some(l => l.cotizacionId) ? await prisma.tourQuote.findMany({ where: { id: { in: ligas.map(l => l.cotizacionId).filter((x): x is string => !!x) } }, select: { id: true, oportunidadId: true } }) : [];
  const resLiga = ligas.some(l => l.reservaId) ? await prisma.tourBooking.findMany({ where: { id: { in: ligas.map(l => l.reservaId).filter((x): x is string => !!x) } }, select: { id: true, oportunidadId: true } }) : [];

  return [
    ...reglaCotizado(cotizados.filter(c => c.historial[0]).map(c => ({
      id: c.id, responsable: c.responsable, cotizadoId: c.historial[0].id, cotizadoEn: c.historial[0].createdAt,
      pendientes: c._count.tareas, cliente: c.contacto.nombre, fechaViaje: c.fechaViaje,
      folio: cots.find(q => q.oportunidadId === c.id)?.quoteNumber ?? null,
    })), ahora, hoy, responsables),
    ...reglaSaldo(reservas.map(r => ({
      id: r.id, folio: r.confirmationNumber, cliente: r.customerName, oportunidadId: r.oportunidadId,
      ultimoDia: diasDeTourDe(r as never).map(d => d.fecha).sort().at(-1) ?? r.tourDate,
      saldo: saldoPendiente(r),
    })), hoy),
    ...reglaLiga(ligas.map(l => ({
      id: l.id, titulo: l.titulo, cliente: l.cliente, monto: l.monto, creadaEn: l.createdAt, creadoPor: l.creadoPor,
      oportunidadId: (l.cotizacionId && cotsLiga.find(q => q.id === l.cotizacionId)?.oportunidadId) || (l.reservaId && resLiga.find(r => r.id === l.reservaId)?.oportunidadId) || null,
    })), ahora, hoy, responsables),
    ...reglaSalida(salidas.map(s => ({ clave: s.clave, fecha: s.fecha, tour: s.tourNombre, personas: s.personas, reservas: s.pasajeros.length })), hoy),
  ];
}

/**
 * Crea las tareas que tocan y no existen todavía. Devuelve cuántas creó. Una
 * que ya existió (aunque esté hecha) no renace: la clave es única.
 */
export async function aplicarReglas(ahora: Date = new Date()): Promise<{ creadas: number; porRegla: Record<string, number> }> {
  const tocan = await tareasQueTocan(ahora);
  if (!tocan.length) return { creadas: 0, porRegla: {} };
  const ya = new Set((await prisma.tarea.findMany({ where: { claveRegla: { in: tocan.map(t => t.claveRegla) } }, select: { claveRegla: true } })).map(t => t.claveRegla));
  const porRegla: Record<string, number> = {};
  let creadas = 0;
  for (const t of tocan) {
    if (ya.has(t.claveRegla)) continue;
    try {
      await prisma.tarea.create({
        data: {
          titulo: t.titulo.slice(0, 200), responsable: t.responsable, vence: t.vence, oportunidadId: t.oportunidadId ?? null,
          salidaClave: t.salidaClave ?? null, origen: "regla", regla: t.regla, claveRegla: t.claveRegla, creadaPor: "Regla automática",
        },
      });
    } catch (e) {
      // La creó otra corrida al mismo tiempo (clave única): no es error.
      if ((e as { code?: string })?.code === "P2002") continue;
      throw e;
    }
    creadas++; porRegla[t.regla] = (porRegla[t.regla] ?? 0) + 1;
    if (t.oportunidadId) await sincronizarProximoPaso(t.oportunidadId).catch(() => {});
  }
  return { creadas, porRegla };
}

// ── Resumen diario de las 7:30 (regla del prompt: «resumen de pendientes del operador») ──

/** Desde las 7:30 y hasta mediodía (si el servidor arrancó tarde), una vez al día por persona. */
export const HORA_RESUMEN = { desde: "07:30", hasta: "12:00" } as const;

/**
 * Manda a cada persona del panel (menos el guía) su resumen del día, si tiene
 * algo. Se reclama en `Config` («resumen-diario:<día>:<usuario>») antes de
 * mandar y se suelta si el envío falla. Los seguimientos que lista sin hora
 * quedan como avisados: así el recordatorio de las 8:00 no los repite.
 */
export async function enviarResumenDiario(ahora: Date = new Date()): Promise<{ enviados: number; errores: string[] }> {
  const { hoy, hhmm } = ahoraMX(ahora);
  if (hhmm < HORA_RESUMEN.desde || hhmm >= HORA_RESUMEN.hasta) return { enviados: 0, errores: [] };
  const personas = usuariosAdmin().filter(u => u.rol !== "guia");
  const [tareas, salidas] = await Promise.all([
    prisma.tarea.findMany({
      where: { estado: "pendiente", vence: { lte: hoy } },
      include: { oportunidad: { include: { contacto: { select: { nombre: true } } } } },
      orderBy: [{ vence: "asc" }, { hora: "asc" }],
    }),
    salidasEntre(hoy, addDaysYMD(hoy, 1)),
  ]);
  let enviados = 0;
  const errores: string[] = [];
  for (const u of personas) {
    const suyas = tareas.filter(t => t.responsable === u.nombre);
    // Las salidas van a quien opera (Operación) y al dueño; el socio las ve en el panel.
    const conSalidas = u.rol === "operacion" || u.rol === "dueno";
    if (!suyas.length && !(conSalidas && salidas.length)) continue;
    const clave = `resumen-diario:${hoy}:${u.user}`;
    try { await prisma.config.create({ data: { key: clave, value: new Date(ahora).toISOString() } }); }
    catch { continue; } // ya salió hoy
    const href = (t: (typeof suyas)[number]) => t.oportunidadId ? `${BASE_URL}/admin/leads/${t.oportunidadId}` : t.salidaClave ? `${BASE_URL}/admin/salidas-dia/${encodeURIComponent(t.salidaClave)}` : `${BASE_URL}/admin/seguimientos`;
    const linea = (t: (typeof suyas)[number]): LineaResumen => ({
      titulo: t.titulo, cliente: t.oportunidad?.contacto.nombre ?? null, href: href(t), rojo: t.vence < hoy,
      cuando: t.vence < hoy ? `Venció el ${t.vence.slice(8)}/${t.vence.slice(5, 7)}` : t.hora ? `Hoy ${t.hora}` : "Hoy",
    });
    const lineasSalidas: LineaResumen[] = conSalidas ? salidas.map(s => ({
      titulo: `${s.tourNombre} · ${s.personas} pax`, cliente: s.registro.guia ? `Guía: ${s.registro.guia}` : "Sin guía asignado",
      cuando: s.fecha === hoy ? "Hoy" : "Mañana", href: `${BASE_URL}/admin/salidas-dia/${encodeURIComponent(s.clave)}`, rojo: !s.registro.guia,
    })) : [];
    try {
      const correo = correoResumen(u.nombre, hoy, suyas.filter(t => t.vence < hoy).map(linea), suyas.filter(t => t.vence === hoy).map(linea), lineasSalidas);
      await sendBrevoEmail({ to: correoDe(u.nombre), ...correo, senderName: "Panel Huasteca" });
      enviados++;
      const sinHora = suyas.filter(t => !t.hora || t.vence < hoy).map(t => t.id);
      if (sinHora.length) await prisma.tarea.updateMany({ where: { id: { in: sinHora }, avisadaEn: null }, data: { avisadaEn: ahora } });
    } catch (e) {
      errores.push(`${u.nombre}: ${(e as Error)?.message}`);
      await prisma.config.delete({ where: { key: clave } }).catch(() => {});
    }
  }
  return { enviados, errores };
}
