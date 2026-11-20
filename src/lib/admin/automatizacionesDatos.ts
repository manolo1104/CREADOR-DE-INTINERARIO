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
import { ahoraMX, cotizacionSalio, estaAbierta, normalizarEtapa } from "./crm";
import { esLigaAutomatica } from "./ligasReglas";
import { correoDe } from "./recordatorios";
import {
  DIAS_AVISO_MINIMO, HECHA_POR_REGLA, RESPONSABLE_OPERACION, correoResumen, esperaRespuestaDesde, reglaCorteLunes, reglaCotizado, reglaLecturaGoogle, reglaLiga, reglaMinimo, reglaRevisionJueves, reglaSaldo, reglaSalida, reglaToursSinCostos, yaNoAplica,
  type HechosSeguimiento, type LeadCotizado, type LineaResumen, type TareaPorRegla,
} from "./automatizaciones";
import { NO_CUENTAN } from "@/lib/cupoTour";
import { salidaCancelada } from "./salidas";
import { historialGoogle } from "./satisfaccion";
import { PRIMERA_SEMANA_CORTE, lunesDe } from "./corteSemanal";
import { hechosDeLigas } from "./linksPago";
import { TOURS_LISTA } from "@/lib/tours";
import { esAMedida } from "./salidas";
import { codigoDeTour } from "./coloresTour";
import { conceptosDe } from "./costos";
import { motivoParaApagarLiga } from "./ligasReglas";
import { avisoReporteJueves } from "./agente/calidadReglas";

/**
 * Los tours activos del catálogo sin costos en el Cotizador (lote 9): la misma
 * cuenta del KPI «Tours con margen medido» (sin RZR ni salidas a medida).
 * Null si no se pudo leer (así nunca se cierra una tarea por un error).
 */
async function toursSinCostos(): Promise<{ slug: string; codigo: string }[] | null> {
  const costos = await prisma.tourCosto.findMany({ select: { tourSlug: true, conceptos: true } }).catch(() => null);
  if (!costos) return null;
  const con = new Set(costos.filter(c => conceptosDe(c.conceptos).length > 0).map(c => c.tourSlug));
  return TOURS_LISTA.filter(t => !esAMedida(t.slug) && !con.has(t.slug)).map(t => ({ slug: t.slug, codigo: codigoDeTour(t.slug) }));
}

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
  const [google, cortePasado, revision, sinCostos] = await Promise.all([
    historialGoogle().catch(() => []),
    prisma.corteSemanal.findUnique({ where: { semana: semanaPasada }, select: { estado: true } }).catch(() => null),
    // Lote 9: la revisión del jueves de esta semana y los tours sin costos.
    prisma.revisionSemanal.findUnique({ where: { semana: lunes }, select: { id: true } }).then(r => !!r).catch(() => null),
    toursSinCostos(),
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
    // Sin los «borrador» del bot viejo (lote 6, 10 nov 2026): eran cotizaciones
    // sin pago y pedían cobrar un «saldo vencido» que nadie debía.
    prisma.tourBooking.findMany({
      where: { status: { notIn: NO_CUENTAN }, tourDate: { lt: hoy } },
      select: { id: true, confirmationNumber: true, customerName: true, tourDate: true, tourSlug: true, tourName: true, lineItems: true, totalAmount: true, depositoPagado: true, stripePaymentIntentId: true, createdAt: true, oportunidadId: true, adults: true, children: true },
    }),
    prisma.linkPago.findMany({
      where: { estado: "activo", createdAt: { gte: new Date(ahora.getTime() - DIAS_LIGA * 86400000) } },
    }),
    // Hasta 7 días: la de 48 h toma solo las de mañana y pasado; la del mínimo, toda la semana (lote 6).
    salidasEntre(addDaysYMD(hoy, 1), addDaysYMD(hoy, DIAS_AVISO_MINIMO)),
  ]);

  // Las cotizaciones de cada lead cotizado: cuándo salió cada una y el folio
  // para el título. Desde el 19 nov 2026 el lead pasa a Cotizado al CREAR la
  // cotización: las 24 h del «¿la vio?» cuentan desde que SALIÓ, y un lead que
  // solo tiene borradores sin mandar no lleva esa tarea (`esperaRespuestaDesde`).
  const cots = cotizados.length ? await prisma.tourQuote.findMany({
    where: { oportunidadId: { in: cotizados.map(c => c.id) } },
    select: { oportunidadId: true, quoteNumber: true, updatedAt: true, enviadaEn: true, status: true, createdAt: true }, orderBy: { updatedAt: "desc" },
  }) : [];
  // La misma regla que los KPIs (`COTIZACION_QUE_SALIO`): un borrador nuevo que
  // nadie mandó y se marcó vencido no salió, y no pide «¿la vio?» (20 nov 2026).
  const salio = (q: (typeof cots)[number]) => cotizacionSalio(q);
  const leadsCotizados: LeadCotizado[] = cotizados.flatMap(c => {
    const entro = c.historial[0];
    if (!entro) return [];
    const suyas = cots.filter(q => q.oportunidadId === c.id);
    // Las que salieron sin fecha guardada (las de antes del 19 nov) cuentan como enviadas antes de entrar (0).
    const desde = esperaRespuestaDesde(entro.createdAt.getTime(), suyas.filter(salio).map(q => q.enviadaEn?.getTime() ?? 0));
    if (desde === null) return [];
    return [{
      id: c.id, responsable: c.responsable, cotizadoId: entro.id, cotizadoEn: new Date(desde),
      pendientes: c._count.tareas, cliente: c.contacto.nombre, fechaViaje: c.fechaViaje,
      folio: (suyas.find(salio) ?? suyas[0])?.quoteNumber ?? null,
    }];
  });

  // 🔴 Solo las ligas que todavía cobran algo vivo (lote 3, 5 nov 2026): la de
  // una cotización borrada o vencida, o de una reserva cancelada o ya pagada,
  // pedía «recordarle con fecha límite» que pagara. Esas las apaga el panel
  // (o la conciliación de cada hora); aquí nunca piden recordatorio.
  const hechosLiga = ligasActivas.length ? await hechosDeLigas(ligasActivas).catch(() => new Map()) : new Map();
  const ligas = ligasActivas.filter(l => !motivoParaApagarLiga(l, hechosLiga.get(l.id)));

  // El lead de cada liga (por su cotización o su reserva).
  const cotsLiga = ligas.some(l => l.cotizacionId) ? await prisma.tourQuote.findMany({ where: { id: { in: ligas.map(l => l.cotizacionId).filter((x): x is string => !!x) } }, select: { id: true, oportunidadId: true } }) : [];
  const resLiga = ligas.some(l => l.reservaId) ? await prisma.tourBooking.findMany({ where: { id: { in: ligas.map(l => l.reservaId).filter((x): x is string => !!x) } }, select: { id: true, oportunidadId: true } }) : [];
  const leadDeLiga = (l: (typeof ligas)[number]): string | null =>
    (l.cotizacionId && cotsLiga.find(q => q.id === l.cotizacionId)?.oportunidadId) || (l.reservaId && resLiga.find(r => r.id === l.reservaId)?.oportunidadId) || null;
  // La etapa del lead de cada liga (`reglaLiga`): a un lead Perdido ya no se le
  // insiste (19 nov 2026; la liga no se apaga: si paga tarde, el pago revive el
  // lead solo), y la que salió sola con la cotización de un lead que sigue en
  // Cotizado la cubre el «¿la vio?» (20 nov 2026: salían las dos tareas juntas).
  const idsLeadLiga = Array.from(new Set(ligas.map(leadDeLiga).filter((x): x is string => !!x)));
  const etapaDeLead = new Map<string, string>(idsLeadLiga.length
    ? (await prisma.oportunidad.findMany({ where: { id: { in: idsLeadLiga } }, select: { id: true, etapa: true } })).map((o): [string, string] => [o.id, normalizarEtapa(o.etapa)])
    : []);

  return [
    ...reglaCotizado(leadsCotizados, ahora, hoy, responsables),
    ...reglaSaldo(reservas.map(r => ({
      id: r.id, folio: r.confirmationNumber, cliente: r.customerName, oportunidadId: r.oportunidadId,
      ultimoDia: diasDeTourDe(r as never).map(d => d.fecha).sort().at(-1) ?? r.tourDate,
      saldo: saldoPendiente(r),
    })), hoy),
    ...reglaLiga(ligas.map(l => {
      const oportunidadId = leadDeLiga(l);
      return {
        id: l.id, titulo: l.titulo, cliente: l.cliente, monto: l.monto, creadaEn: l.createdAt, creadoPor: l.creadoPor,
        oportunidadId, etapaLead: oportunidadId ? etapaDeLead.get(oportunidadId) ?? null : null,
      };
    }), ahora, hoy, responsables),
    ...reglaSalida(salidas.map(s => ({ clave: s.clave, fecha: s.fecha, tour: s.tourNombre, personas: s.personas, reservas: s.pasajeros.length })), hoy),
    ...reglaMinimo(salidas.map(s => ({ clave: s.clave, fecha: s.fecha, tour: s.tourNombre, personas: s.personas, minimo: s.minimo, estado: s.registro.estado })), hoy),
    ...reglaLecturaGoogle(google.at(-1)?.fecha ?? null, hoy, lunes),
    ...reglaCorteLunes(cortePasado?.estado === "cerrado", semanaPasada, PRIMERA_SEMANA_CORTE),
    // Sin poder leer la base no se crea nada (lote 9).
    ...(revision === null ? [] : reglaRevisionJueves(revision, hoy, lunes)),
    ...(sinCostos === null ? [] : reglaToursSinCostos(sinCostos, hoy)),
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
 * la liga ya se pagó o se canceló (o su lead se marcó Perdido, 19 nov 2026, o
 * salió sola con la cotización y su lead sigue en Cotizado: la cubre «¿la vio?»,
 * 20 nov 2026), el saldo ya se cobró, el lead salió de
 * Cotizado, la salida ya pasó, el corte ya se cerró, ya hay lectura de Google,
 * o quien volvió a escribir ya tiene un lead abierto. Quedan hechos por «Regla
 * (ya no aplica)», con su fecha. Devuelve cuántos cerró.
 */
export async function cerrarSeguimientosQueYaNoAplican(ahora: Date = new Date()): Promise<number> {
  const { hoy } = ahoraMX(ahora);
  const pendientes = await prisma.tarea.findMany({
    where: { estado: "pendiente", origen: "regla", regla: { in: ["cotizado-24h", "consulta-nueva", "liga-24h", "saldo-vencido", "salida-48h", "agrupar-salidas", "minimo-7d", "corte-lunes", "lectura-google", "revision-jueves", "tours-sin-costos"] } },
    select: { id: true, titulo: true, regla: true, claveRegla: true, oportunidadId: true, salidaClave: true },
  });
  if (!pendientes.length) return 0;
  const de = (regla: string) => pendientes.filter(t => t.regla === regla);
  // liga-24h también lee la etapa de su lead: con el lead Perdido se cierra (19 nov 2026).
  const idsLead = Array.from(new Set(pendientes.filter(t => (t.regla === "cotizado-24h" || t.regla === "consulta-nueva" || t.regla === "liga-24h") && t.oportunidadId).map(t => t.oportunidadId!)));
  const idsLiga = de("liga-24h").map(t => objetoDe(t.claveRegla)).filter(Boolean);
  const idsReserva = de("saldo-vencido").map(t => objetoDe(t.claveRegla)).filter(Boolean);
  const semanas = de("corte-lunes").map(t => objetoDe(t.claveRegla)).filter(Boolean);
  const semanasRevision = de("revision-jueves").map(t => objetoDe(t.claveRegla)).filter(Boolean);
  const [revisiones, sinCostos] = await Promise.all([
    semanasRevision.length ? prisma.revisionSemanal.findMany({ where: { semana: { in: semanasRevision } }, select: { semana: true } }).then(rs => new Set(rs.map(r => r.semana))).catch(() => null) : Promise.resolve(new Set<string>()),
    de("tours-sin-costos").length ? toursSinCostos() : Promise.resolve([]),
  ]);
  const [leads, ligas, reservas, cortes, google] = await Promise.all([
    idsLead.length ? prisma.oportunidad.findMany({ where: { id: { in: idsLead } }, select: { id: true, etapa: true, contactoId: true } }) : [],
    idsLiga.length ? prisma.linkPago.findMany({ where: { id: { in: idsLiga } }, select: { id: true, estado: true, creadoPor: true } }) : [],
    idsReserva.length ? prisma.tourBooking.findMany({ where: { id: { in: idsReserva } } }) : [],
    semanas.length ? prisma.corteSemanal.findMany({ where: { semana: { in: semanas } }, select: { semana: true, estado: true } }) : [],
    de("lectura-google").length ? historialGoogle().then(h => h.at(-1)?.fecha ?? null).catch(() => undefined) : Promise.resolve(undefined),
  ]);
  // Las salidas de los seguimientos de salida: ¿se cancelaron?, ¿ya llegó al mínimo? (lote 6).
  const deSalida = pendientes.filter(t => (t.regla === "salida-48h" || t.regla === "agrupar-salidas" || t.regla === "minimo-7d") && t.salidaClave);
  const registros = deSalida.length
    ? await prisma.salida.findMany({ where: { clave: { in: deSalida.map(t => t.salidaClave!) } }, select: { clave: true, estado: true } }).catch(() => null)
    : [];
  const fechasMinimo = de("minimo-7d").map(t => (t.salidaClave ?? "").slice(0, 10)).filter(f => /^\d{4}-\d{2}-\d{2}$/.test(f)).sort();
  const salidasMinimo = fechasMinimo.length
    ? await salidasEntre(fechasMinimo[0], fechasMinimo[fechasMinimo.length - 1], { conCanceladas: true }).catch(() => null)
    : [];
  // Solo «¿Consulta nueva?» pregunta si el contacto ya tiene otro lead abierto.
  const idsConsulta = new Set(de("consulta-nueva").map(t => t.oportunidadId));
  const contactos = Array.from(new Set(leads.filter(l => idsConsulta.has(l.id)).map(l => l.contactoId)));
  const conAbierto = new Set(contactos.length
    ? (await prisma.oportunidad.findMany({ where: { contactoId: { in: contactos } }, select: { contactoId: true, etapa: true } })).filter(o => estaAbierta(o.etapa)).map(o => o.contactoId)
    : []);

  const hechosDe = (t: (typeof pendientes)[number]): HechosSeguimiento => {
    switch (t.regla) {
      case "cotizado-24h": case "consulta-nueva": {
        const l = leads.find(x => x.id === t.oportunidadId);
        return { etapaLead: l ? normalizarEtapa(l.etapa) : null, contactoConLeadAbierto: l ? conAbierto.has(l.contactoId) : undefined };
      }
      case "liga-24h": {
        const l = t.oportunidadId ? leads.find(x => x.id === t.oportunidadId) : undefined;
        const liga = ligas.find(x => x.id === objetoDe(t.claveRegla));
        return { ligaEstado: liga?.estado ?? null, ligaAutomatica: esLigaAutomatica(liga?.creadoPor), etapaLead: l ? normalizarEtapa(l.etapa) : undefined };
      }
      case "saldo-vencido": {
        const r = reservas.find(x => x.id === objetoDe(t.claveRegla));
        return { saldo: !r || r.status === "cancelled" ? null : saldoPendiente(r) };
      }
      case "salida-48h": case "agrupar-salidas": case "minimo-7d": {
        const cancelada = registros === null ? undefined : salidaCancelada(registros.find(r => r.clave === t.salidaClave)?.estado);
        let minimoResuelto: boolean | undefined;
        if (t.regla === "minimo-7d" && salidasMinimo !== null) {
          const s = salidasMinimo.find(x => x.clave === t.salidaClave);
          // Ya no existe (se cancelaron o movieron sus reservas), llegó al mínimo, o Operación ya decidió.
          minimoResuelto = !s || s.minimo === null || s.personas >= s.minimo || s.registro.estado === "confirmada" || s.registro.estado === "operada";
        }
        return { fechaSalida: (t.salidaClave ?? "").slice(0, 10), salidaCancelada: cancelada, minimoResuelto };
      }
      case "corte-lunes": return { corteCerrado: cortes.find(c => c.semana === objetoDe(t.claveRegla))?.estado === "cerrado" };
      case "lectura-google": return { lecturaReciente: google === undefined ? undefined : !!google && diffDiasYMD(google, hoy) <= 6 };
      case "revision-jueves": return { revisionGuardada: revisiones === null ? undefined : revisiones.has(objetoDe(t.claveRegla)) };
      case "tours-sin-costos": return { toursSinCostos: sinCostos === null ? undefined : sinCostos.length, deOtroMes: objetoDe(t.claveRegla) < hoy.slice(0, 7) };
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
  // Lote 9: si el reporte de los jueves no salió, se le avisa al dueño (viernes a domingo).
  const lunes = lunesDe(hoy);
  const avisoReporte = await import("./agente/calidad")
    .then(m => m.estadoReporteJueves(lunes))
    .then(e => avisoReporteJueves(e, hoy, lunes, addDaysYMD(lunes, 3)))
    .catch(() => null);
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
    const avisos = u.rol === "dueno" && avisoReporte ? [avisoReporte] : [];
    if (!suyas.length && !(conSalidas && salidas.length) && !avisos.length) continue;
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
      const correo = correoResumen(u.nombre, hoy, suyas.filter(t => t.vence < hoy).map(linea), suyas.filter(t => t.vence === hoy).map(linea), lineasSalidas, avisos);
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
