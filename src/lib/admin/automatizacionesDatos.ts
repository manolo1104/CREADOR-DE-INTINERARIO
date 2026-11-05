// Solo servidor: aplica las reglas de `automatizaciones.ts` y manda el resumen
// diario de las 7:30 (Fase 3 del rediseño, 4 nov 2026). Lo corre el reloj del
// servidor cada 5 minutos (`recordatoriosTimer.ts`) y, de respaldo, el cron
// horario. Todo es idempotente: la tarea se crea por su `claveRegla` única y el
// resumen se reclama en `Config` antes de mandarse.
import { prisma } from "@/lib/prisma";
import { sendBrevoEmail } from "@/lib/brevo";
import { addDaysYMD, diffDiasYMD } from "@/lib/dates";
import { saldoPendiente } from "./dinero";
import { diasDeTourDe } from "./salidas";
import { salidasEntre } from "./salidasDia";
import { sugerenciasAgrupar } from "./agruparDatos";
import { tituloAgrupar } from "./agrupar";
import { sincronizarProximoPaso } from "./crmDatos";
import { usuariosAdmin } from "./usuarios";
import { ahoraMX, estaAbierta } from "./crm";
import { correoDe } from "./recordatorios";
import {
  HECHA_POR_REGLA, RESPONSABLE_OPERACION, correoResumen, reglaCorteLunes, reglaCotizado, reglaLecturaGoogle, reglaLiga, reglaSaldo, reglaSalida, yaNoAplica,
  type HechosSeguimiento, type LineaResumen, type TareaPorRegla,
} from "./automatizaciones";
import { historialGoogle } from "./satisfaccion";
import { PRIMERA_SEMANA_CORTE, lunesDe } from "./corteSemanal";
import { hechosDeLigas } from "./linksPago";
import { motivoParaApagarLiga } from "./ligasReglas";

/** Ligas más viejas que esto no generan tarea: son de antes de la regla. */
const DIAS_LIGA = 14;
import { BASE_URL } from "./automatizaciones";

const responsablesPanel = () => usuariosAdmin().filter(u => u.rol !== "guia").map(u => u.nombre);

/** Junta lo que cada regla necesita y devuelve las tareas que TOCAN (sin ver si ya existen). */
export async function tareasQueTocan(ahora: Date = new Date()): Promise<TareaPorRegla[]> {
  const { hoy } = ahoraMX(ahora);
  const responsables = responsablesPanel();

  // Indicadores (4 nov 2026): la lectura de Google y el corte de la semana pasada.
  const lunes = lunesDe(hoy);
  const semanaPasada = addDaysYMD(lunes, -7);
  const [google, cortePasado] = await Promise.all([
    historialGoogle().catch(() => []),
    prisma.corteSemanal.findUnique({ where: { semana: semanaPasada }, select: { estado: true } }).catch(() => null),
  ]);
  const [cotizados, reservas, ligasActivas, salidas] = await Promise.all([
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

  // 🔴 Solo las ligas que todavía cobran algo vivo (lote 3, 5 nov 2026): la de
  // una cotización borrada o vencida, o de una reserva cancelada o ya pagada,
  // pedía «recordarle con fecha límite» que pagara. Esas las apaga el panel
  // (o la conciliación de cada hora); aquí nunca piden recordatorio.
  const hechosLiga = ligasActivas.length ? await hechosDeLigas(ligasActivas).catch(() => new Map()) : new Map();
  const ligas = ligasActivas.filter(l => !motivoParaApagarLiga(l, hechosLiga.get(l.id)));

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
    ...reglaLecturaGoogle(google.at(-1)?.fecha ?? null, hoy, lunes),
    ...reglaCorteLunes(cortePasado?.estado === "cerrado", semanaPasada, PRIMERA_SEMANA_CORTE),
    // Juntar salidas (4 nov 2026): una tarea por par, a Operación, para proponerlo al cliente.
    ...(await sugerenciasAgrupar(hoy).catch(() => [])).map(g => ({
      claveRegla: `agrupar-salidas:${g.mover.clave}>${g.hacia.clave}`, regla: "agrupar-salidas" as const,
      titulo: tituloAgrupar(g), responsable: RESPONSABLE_OPERACION, vence: hoy, salidaClave: g.mover.clave,
    })),
  ];
}

/** La parte de la clave «regla:objeto» que nombra al objeto (la liga, la reserva, la semana…). */
const objetoDe = (claveRegla: string | null) => (claveRegla ?? "").split(":").slice(1).join(":");

/**
 * Cierra los seguimientos automáticos cuyo motivo ya desapareció (5 nov 2026):
 * la liga ya se pagó o se canceló, el saldo ya se cobró, el lead salió de
 * Cotizado, la salida ya pasó, el corte ya se cerró, ya hay lectura de Google,
 * o quien volvió a escribir ya tiene un lead abierto. Quedan hechos por «Regla
 * (ya no aplica)», con su fecha. Devuelve cuántos cerró.
 */
export async function cerrarSeguimientosQueYaNoAplican(ahora: Date = new Date()): Promise<number> {
  const { hoy } = ahoraMX(ahora);
  const pendientes = await prisma.tarea.findMany({
    where: { estado: "pendiente", origen: "regla", regla: { in: ["cotizado-24h", "consulta-nueva", "liga-24h", "saldo-vencido", "salida-48h", "agrupar-salidas", "corte-lunes", "lectura-google"] } },
    select: { id: true, titulo: true, regla: true, claveRegla: true, oportunidadId: true, salidaClave: true },
  });
  if (!pendientes.length) return 0;
  const de = (regla: string) => pendientes.filter(t => t.regla === regla);
  const idsLead = Array.from(new Set(pendientes.filter(t => (t.regla === "cotizado-24h" || t.regla === "consulta-nueva") && t.oportunidadId).map(t => t.oportunidadId!)));
  const idsLiga = de("liga-24h").map(t => objetoDe(t.claveRegla)).filter(Boolean);
  const idsReserva = de("saldo-vencido").map(t => objetoDe(t.claveRegla)).filter(Boolean);
  const semanas = de("corte-lunes").map(t => objetoDe(t.claveRegla)).filter(Boolean);
  const [leads, ligas, reservas, cortes, google] = await Promise.all([
    idsLead.length ? prisma.oportunidad.findMany({ where: { id: { in: idsLead } }, select: { id: true, etapa: true, contactoId: true } }) : [],
    idsLiga.length ? prisma.linkPago.findMany({ where: { id: { in: idsLiga } }, select: { id: true, estado: true } }) : [],
    idsReserva.length ? prisma.tourBooking.findMany({ where: { id: { in: idsReserva } } }) : [],
    semanas.length ? prisma.corteSemanal.findMany({ where: { semana: { in: semanas } }, select: { semana: true, estado: true } }) : [],
    de("lectura-google").length ? historialGoogle().then(h => h.at(-1)?.fecha ?? null).catch(() => undefined) : Promise.resolve(undefined),
  ]);
  const contactos = Array.from(new Set(leads.map(l => l.contactoId)));
  const conAbierto = new Set(contactos.length
    ? (await prisma.oportunidad.findMany({ where: { contactoId: { in: contactos } }, select: { contactoId: true, etapa: true } })).filter(o => estaAbierta(o.etapa)).map(o => o.contactoId)
    : []);

  const hechosDe = (t: (typeof pendientes)[number]): HechosSeguimiento => {
    switch (t.regla) {
      case "cotizado-24h": case "consulta-nueva": {
        const l = leads.find(x => x.id === t.oportunidadId);
        return { etapaLead: l ? l.etapa : null, contactoConLeadAbierto: l ? conAbierto.has(l.contactoId) : undefined };
      }
      case "liga-24h": return { ligaEstado: ligas.find(x => x.id === objetoDe(t.claveRegla))?.estado ?? null };
      case "saldo-vencido": {
        const r = reservas.find(x => x.id === objetoDe(t.claveRegla));
        return { saldo: !r || r.status === "cancelled" ? null : saldoPendiente(r) };
      }
      case "salida-48h": case "agrupar-salidas": return { fechaSalida: (t.salidaClave ?? "").slice(0, 10) };
      case "corte-lunes": return { corteCerrado: cortes.find(c => c.semana === objetoDe(t.claveRegla))?.estado === "cerrado" };
      case "lectura-google": return { lecturaReciente: google === undefined ? undefined : !!google && diffDiasYMD(google, hoy) <= 6 };
      default: return {};
    }
  };
  const cerrar = pendientes.filter(t => yaNoAplica(t.regla, hechosDe(t), hoy));
  if (!cerrar.length) return 0;
  await prisma.tarea.updateMany({ where: { id: { in: cerrar.map(t => t.id) }, estado: "pendiente" }, data: { estado: "hecha", hechaPor: HECHA_POR_REGLA, hechaEn: ahora } });
  for (const t of cerrar) if (t.oportunidadId) await sincronizarProximoPaso(t.oportunidadId, t.titulo).catch(() => {});
  return cerrar.length;
}

/**
 * De las tareas que tocan hoy (por su clave), las que ya existen. Las que se
 * cerraron solas porque su motivo había desaparecido y ahora vuelven a tocar se
 * reabren; las que cerró una persona, no (5 nov 2026).
 */
export async function reabrirLasQueVolvieron(claves: string[]): Promise<Set<string | null>> {
  const existentes = claves.length ? await prisma.tarea.findMany({ where: { claveRegla: { in: claves } }, select: { id: true, claveRegla: true, estado: true, hechaPor: true, oportunidadId: true } }) : [];
  const reabrir = existentes.filter(t => t.estado === "hecha" && t.hechaPor === HECHA_POR_REGLA);
  if (reabrir.length) {
    await prisma.tarea.updateMany({ where: { id: { in: reabrir.map(t => t.id) }, hechaPor: HECHA_POR_REGLA }, data: { estado: "pendiente", hechaPor: null, hechaEn: null, avisadaEn: null } });
    for (const t of reabrir) if (t.oportunidadId) await sincronizarProximoPaso(t.oportunidadId).catch(() => {});
  }
  return new Set(existentes.map(t => t.claveRegla));
}

/**
 * Crea las tareas que tocan y no existen todavía. Devuelve cuántas creó. Una
 * que ya existió (aunque esté hecha) no renace: la clave es única. Antes cierra
 * las que ya no aplican, y una que se cerró sola porque su motivo desapareció
 * vuelve a abrirse si el motivo regresa (p. ej. se anuló el cobro del saldo).
 */
export async function aplicarReglas(ahora: Date = new Date()): Promise<{ creadas: number; porRegla: Record<string, number>; cerradas: number }> {
  const cerradas = await cerrarSeguimientosQueYaNoAplican(ahora).catch(e => { console.error("cerrar seguimientos:", (e as Error)?.message); return 0; });
  const tocan = await tareasQueTocan(ahora);
  if (!tocan.length) return { creadas: 0, porRegla: {}, cerradas };
  const ya = await reabrirLasQueVolvieron(tocan.map(t => t.claveRegla));
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
  return { creadas, porRegla, cerradas };
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
