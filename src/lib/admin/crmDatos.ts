// Solo servidor: lo que lee y escribe el CRM (Fase 2, 3 nov 2026). Cada
// cambio de etapa queda en `EtapaOportunidad` con quién lo hizo, y lo que
// mueve dinero o clientes también en la bitácora.
import { prisma } from "@/lib/prisma";
import { addDaysYMD, hoyMX } from "@/lib/dates";
import { origenValido } from "@/lib/origenReserva";
import { TOURS_LISTA } from "@/lib/tours";
import { registrarEnBitacora } from "./bitacora";
import { montoCobrado } from "./dinero";
import { lineasDe } from "./reserva";
import {
  esEtapa, estaAbierta, etapaPorReglas, motivoPerdidaParaGuardar, normalizarTelefono, subirA, validarCambioEtapa,
  etiquetaEtapa, type Etapa,
} from "./crm";

const texto = (v: unknown, max: number) => { const t = String(v ?? "").trim().slice(0, max); return t || null; };
const ymd = (v: unknown) => { const t = String(v ?? "").trim(); return /^\d{4}-\d{2}-\d{2}$/.test(t) && addDaysYMD(t, 0) === t ? t : null; };
const entero = (v: unknown, max: number) => { if (v === null || v === undefined || v === "") return null; const n = Math.round(Number(v)); return Number.isFinite(n) && n >= 0 && n <= max ? n : null; };
const SLUGS = new Set([...TOURS_LISTA.map(t => t.slug), "rzr-xilitla", "__personalizado"]);
const tours = (v: unknown) => (Array.isArray(v) ? v.map(String).filter(s => SLUGS.has(s)) : []).slice(0, 10);

export class ErrorCrm extends Error {}

async function registrarEtapa(oportunidadId: string, anterior: string | null, nueva: string, por: string, origen: "persona" | "regla" | "agente") {
  await prisma.etapaOportunidad.create({ data: { oportunidadId, anterior, nueva, por, origen } });
}

/** Busca el contacto por teléfono (o correo) o lo crea. */
async function contactoPara(datos: { nombre: string; telefono: string | null; correo: string | null; idioma?: string | null }) {
  const correo = datos.correo?.toLowerCase() ?? null;
  const existente = datos.telefono
    ? await prisma.contacto.findUnique({ where: { telefono: datos.telefono } })
    : correo ? await prisma.contacto.findFirst({ where: { correo } }) : null;
  if (existente) {
    // Lo que faltaba se completa; lo que ya había no se pisa.
    const falta: Record<string, string> = {};
    if (!existente.correo && correo) falta.correo = correo;
    return Object.keys(falta).length ? prisma.contacto.update({ where: { id: existente.id }, data: falta }) : existente;
  }
  return prisma.contacto.create({ data: { nombre: datos.nombre, telefono: datos.telefono, correo, idioma: datos.idioma === "en" ? "en" : "es" } });
}

export interface NuevoLead {
  nombre?: unknown; telefono?: unknown; correo?: unknown; idioma?: unknown; canal?: unknown; tours?: unknown;
  fechaViaje?: unknown; pax?: unknown; perfil?: unknown; quiereHospedaje?: unknown; monto?: unknown;
  responsable?: unknown; proximoPaso?: unknown; proximoPasoEn?: unknown; nota?: unknown;
}

/**
 * Captura un lead. Si la persona ya tiene una oportunidad ABIERTA, no se
 * duplica: se devuelve esa (regla del prompt: «crear un lead en Nuevo si no
 * hay uno abierto»).
 */
export async function crearOportunidad(d: NuevoLead, quien: string) {
  const nombre = texto(d.nombre, 120);
  const telefono = normalizarTelefono(d.telefono);
  const correo = texto(d.correo, 160);
  if (!nombre) throw new ErrorCrm("Falta el nombre.");
  if (d.telefono && !telefono) throw new ErrorCrm("Ese teléfono no parece válido (10 dígitos, o con +país).");
  const contacto = await contactoPara({ nombre, telefono, correo, idioma: texto(d.idioma, 2) });
  const abierta = await prisma.oportunidad.findFirst({ where: { contactoId: contacto.id, etapa: { in: ["nuevo", "calificado", "cotizado", "seguimiento", "anticipo", "confirmado"] } }, orderBy: { createdAt: "desc" } });
  if (abierta) return { oportunidad: abierta, existente: true };

  const datos = { tours: tours(d.tours), fechaViaje: ymd(d.fechaViaje), pax: entero(d.pax, 200) };
  const etapa = etapaPorReglas("nuevo", datos);
  const op = await prisma.oportunidad.create({
    data: {
      contactoId: contacto.id, etapa, canal: origenValido(d.canal, "whatsapp"), ...datos,
      perfil: texto(d.perfil, 20), quiereHospedaje: typeof d.quiereHospedaje === "boolean" ? d.quiereHospedaje : null,
      monto: entero(d.monto, 10_000_000), responsable: texto(d.responsable, 60) ?? quien,
      proximoPaso: texto(d.proximoPaso, 200), proximoPasoEn: ymd(d.proximoPasoEn), creadoPor: quien,
    },
  });
  await registrarEtapa(op.id, null, "nuevo", quien, "persona");
  if (etapa !== "nuevo") await registrarEtapa(op.id, "nuevo", etapa, "Regla: tour, fecha y personas", "regla");
  const nota = texto(d.nota, 2000);
  if (nota) await prisma.notaOportunidad.create({ data: { oportunidadId: op.id, autor: quien, texto: nota } });
  await registrarEnBitacora({ accion: "creó", entidad: "lead", referencia: contacto.nombre, resumen: `Lead nuevo: ${contacto.nombre} (${etiquetaEtapa(etapa)})` });
  return { oportunidad: op, existente: false };
}

/** Edita los datos de la oportunidad (y del contacto). Aplica la regla Nuevo → Calificado. */
export async function editarOportunidad(id: string, d: NuevoLead, quien: string) {
  const op = await prisma.oportunidad.findUnique({ where: { id }, include: { contacto: true } });
  if (!op) throw new ErrorCrm("Ese lead no existe.");
  const data: Record<string, unknown> = {};
  if (d.canal !== undefined) data.canal = origenValido(d.canal, op.canal as never);
  if (d.tours !== undefined) data.tours = tours(d.tours);
  if (d.fechaViaje !== undefined) data.fechaViaje = ymd(d.fechaViaje);
  if (d.pax !== undefined) data.pax = entero(d.pax, 200);
  if (d.perfil !== undefined) data.perfil = texto(d.perfil, 20);
  if (d.quiereHospedaje !== undefined) data.quiereHospedaje = typeof d.quiereHospedaje === "boolean" ? d.quiereHospedaje : null;
  if (d.monto !== undefined) data.monto = entero(d.monto, 10_000_000);
  if (d.responsable !== undefined) data.responsable = texto(d.responsable, 60);
  if (d.proximoPaso !== undefined) data.proximoPaso = texto(d.proximoPaso, 200);
  if (d.proximoPasoEn !== undefined) data.proximoPasoEn = ymd(d.proximoPasoEn);
  const contacto: Record<string, unknown> = {};
  if (d.nombre !== undefined && texto(d.nombre, 120)) contacto.nombre = texto(d.nombre, 120);
  if (d.correo !== undefined) contacto.correo = texto(d.correo, 160)?.toLowerCase() ?? null;
  if (d.idioma !== undefined) contacto.idioma = d.idioma === "en" ? "en" : "es";
  if (d.telefono !== undefined) {
    const t = normalizarTelefono(d.telefono);
    if (d.telefono && !t) throw new ErrorCrm("Ese teléfono no parece válido.");
    if (t && t !== op.contacto.telefono) {
      const otro = await prisma.contacto.findUnique({ where: { telefono: t } });
      if (otro && otro.id !== op.contactoId) throw new ErrorCrm(`Ese teléfono ya es de ${otro.nombre}.`);
    }
    contacto.telefono = t;
  }
  const despues = {
    tours: (data.tours as string[] | undefined) ?? op.tours,
    fechaViaje: data.fechaViaje !== undefined ? (data.fechaViaje as string | null) : op.fechaViaje,
    pax: data.pax !== undefined ? (data.pax as number | null) : op.pax,
  };
  const etapa = etapaPorReglas(op.etapa as Etapa, despues);
  if (etapa !== op.etapa) data.etapa = etapa;
  if (Object.keys(contacto).length) await prisma.contacto.update({ where: { id: op.contactoId }, data: contacto });
  const r = await prisma.oportunidad.update({ where: { id }, data });
  if (etapa !== op.etapa) await registrarEtapa(id, op.etapa, etapa, "Regla: tour, fecha y personas", "regla");
  return r;
}

/** Mover de etapa a mano (arrastrar o la barra de la ficha). Perdido exige motivo. */
export async function moverEtapa(id: string, hacia: unknown, motivo: { clave?: unknown; detalle?: unknown }, quien: string) {
  const op = await prisma.oportunidad.findUnique({ where: { id }, include: { contacto: true } });
  if (!op) throw new ErrorCrm("Ese lead no existe.");
  const motivoTexto = hacia === "perdido" ? motivoPerdidaParaGuardar(motivo.clave, motivo.detalle) : null;
  const v = validarCambioEtapa(hacia, motivoTexto);
  if (!v.ok) throw new ErrorCrm(v.error);
  if (op.etapa === hacia) return op;
  const r = await prisma.oportunidad.update({
    where: { id },
    data: { etapa: hacia as string, motivoPerdida: hacia === "perdido" ? motivoTexto : null },
  });
  await registrarEtapa(id, op.etapa, hacia as string, quien, "persona");
  await registrarEnBitacora({
    accion: "modificó", entidad: "lead", referencia: op.contacto.nombre,
    resumen: `${op.contacto.nombre}: ${etiquetaEtapa(op.etapa)} → ${etiquetaEtapa(hacia as string)}${motivoTexto ? ` (${motivoTexto})` : ""}`,
  });
  return r;
}

export async function agregarNota(id: string, t: unknown, quien: string) {
  const nota = texto(t, 2000);
  if (!nota) throw new ErrorCrm("La nota está vacía.");
  const op = await prisma.oportunidad.findUnique({ where: { id }, select: { id: true } });
  if (!op) throw new ErrorCrm("Ese lead no existe.");
  return prisma.notaOportunidad.create({ data: { oportunidadId: id, autor: quien, texto: nota } });
}

/**
 * Enlaza una cotización (COT-…) o una reserva (HP…) por su folio. La etapa
 * sube sola: con cotización, a Cotizado; con reserva pagada (anticipo o
 * total), a Confirmado; con reserva sin pago, a En seguimiento. Nunca baja.
 */
export async function vincularFolio(id: string, folioCrudo: unknown, quien: string) {
  const folio = String(folioCrudo ?? "").trim().toUpperCase();
  if (!folio) throw new ErrorCrm("Escribe el folio (COT-… o HP…).");
  const op = await prisma.oportunidad.findUnique({ where: { id }, include: { contacto: true } });
  if (!op) throw new ErrorCrm("Ese lead no existe.");
  let objetivo: Etapa | null = null;
  let monto: number | null = null;
  const cot = await prisma.tourQuote.findUnique({ where: { quoteNumber: folio } });
  if (cot) {
    if (cot.oportunidadId && cot.oportunidadId !== id) throw new ErrorCrm("Esa cotización ya es de otro lead.");
    await prisma.tourQuote.update({ where: { id: cot.id }, data: { oportunidadId: id } });
    objetivo = "cotizado"; monto = cot.totalAmount;
  } else {
    const res = await prisma.tourBooking.findUnique({ where: { confirmationNumber: folio } });
    if (!res) throw new ErrorCrm("No encontré ninguna cotización ni reserva con ese folio.");
    if (res.oportunidadId && res.oportunidadId !== id) throw new ErrorCrm("Esa reserva ya es de otro lead.");
    await prisma.tourBooking.update({ where: { id: res.id }, data: { oportunidadId: id } });
    objetivo = montoCobrado(res) > 0 ? "confirmado" : "seguimiento"; monto = res.totalAmount;
  }
  const etapa = subirA(op.etapa as Etapa, objetivo);
  await prisma.oportunidad.update({ where: { id }, data: { etapa, ...(monto && !op.monto ? { monto } : {}) } });
  if (etapa !== op.etapa) await registrarEtapa(id, op.etapa, etapa, `Regla: se enlazó ${folio}`, "regla");
  await registrarEnBitacora({ accion: "modificó", entidad: "lead", referencia: folio, resumen: `${op.contacto.nombre}: se enlazó ${folio}${etapa !== op.etapa ? ` y pasó a ${etiquetaEtapa(etapa)}` : ""}` });
  return { etapa };
}

// ── Tareas ──────────────────────────────────────────────────────────────────

export async function crearTarea(d: { titulo?: unknown; responsable?: unknown; vence?: unknown; oportunidadId?: unknown; salidaClave?: unknown }, quien: string) {
  const titulo = texto(d.titulo, 200);
  if (!titulo) throw new ErrorCrm("Escribe qué hay que hacer.");
  const vence = ymd(d.vence) ?? hoyMX();
  const oportunidadId = texto(d.oportunidadId, 40);
  if (oportunidadId && !(await prisma.oportunidad.findUnique({ where: { id: oportunidadId }, select: { id: true } }))) throw new ErrorCrm("Ese lead no existe.");
  const t = await prisma.tarea.create({
    data: { titulo, responsable: texto(d.responsable, 60) ?? quien, vence, oportunidadId, salidaClave: texto(d.salidaClave, 200), creadaPor: quien, origen: "manual" },
  });
  // El próximo paso del lead es su tarea más cercana.
  if (oportunidadId) await sincronizarProximoPaso(oportunidadId);
  return t;
}

export async function cambiarTarea(id: string, accion: unknown, dias: unknown, quien: string) {
  const t = await prisma.tarea.findUnique({ where: { id } });
  if (!t) throw new ErrorCrm("Esa tarea no existe.");
  let r;
  if (accion === "hecha") r = await prisma.tarea.update({ where: { id }, data: { estado: "hecha", hechaPor: quien, hechaEn: new Date() } });
  else if (accion === "reabrir") r = await prisma.tarea.update({ where: { id }, data: { estado: "pendiente", hechaPor: null, hechaEn: null } });
  else if (accion === "posponer") {
    const n = Math.max(1, Math.min(30, Math.round(Number(dias) || 1)));
    r = await prisma.tarea.update({ where: { id }, data: { vence: addDaysYMD(t.vence < hoyMX() ? hoyMX() : t.vence, n) } });
  } else throw new ErrorCrm("Acción no válida.");
  await registrarEnBitacora({ accion: "modificó", entidad: "tarea", referencia: t.titulo.slice(0, 60), resumen: `Seguimiento «${t.titulo.slice(0, 80)}»: ${accion === "posponer" ? `pospuesto a ${r.vence}` : accion}` });
  if (t.oportunidadId) await sincronizarProximoPaso(t.oportunidadId, accion === "hecha" ? t.titulo : null);
  return r;
}

/**
 * El próximo paso de un lead = su tarea pendiente más cercana. Si ya no queda
 * ninguna y el próximo paso era la tarea que se acaba de cerrar, se limpia
 * (uno escrito a mano en la ficha se respeta).
 */
async function sincronizarProximoPaso(oportunidadId: string, tituloCerrado: string | null = null) {
  const sig = await prisma.tarea.findFirst({ where: { oportunidadId, estado: "pendiente" }, orderBy: { vence: "asc" } });
  if (sig) { await prisma.oportunidad.update({ where: { id: oportunidadId }, data: { proximoPaso: sig.titulo, proximoPasoEn: sig.vence } }); return; }
  if (tituloCerrado) await prisma.oportunidad.updateMany({ where: { id: oportunidadId, proximoPaso: tituloCerrado }, data: { proximoPaso: null, proximoPasoEn: null } });
}

// ── Lecturas ────────────────────────────────────────────────────────────────

/** Los tours de una cotización o reserva (sus renglones, o el principal). */
export function toursDe(x: { tourSlug: string; lineItems?: unknown }): string[] {
  const s = lineasDe(x as never).map(l => l.tourSlug).filter((v): v is string => !!v);
  return Array.from(new Set(s.length ? s : [x.tourSlug].filter(Boolean)));
}

export async function listarPipeline() {
  const desde = new Date(Date.now() - 120 * 86400000);
  const ops = await prisma.oportunidad.findMany({
    where: { OR: [{ etapa: { in: ["nuevo", "calificado", "cotizado", "seguimiento", "anticipo", "confirmado"] } }, { updatedAt: { gte: desde } }] },
    include: { contacto: true, _count: { select: { tareas: { where: { estado: "pendiente" } } } } },
    orderBy: { updatedAt: "desc" },
  });
  return ops.map(o => ({
    id: o.id, etapa: o.etapa, canal: o.canal, tours: o.tours, fechaViaje: o.fechaViaje, pax: o.pax, monto: o.monto,
    responsable: o.responsable, proximoPaso: o.proximoPaso, proximoPasoEn: o.proximoPasoEn, motivoPerdida: o.motivoPerdida,
    nombre: o.contacto.nombre, telefono: o.contacto.telefono, tareasPendientes: o._count.tareas,
    createdAt: o.createdAt.toISOString(), updatedAt: o.updatedAt.toISOString(),
  }));
}
export type LeadTarjeta = Awaited<ReturnType<typeof listarPipeline>>[number];

export async function fichaOportunidad(id: string) {
  const op = await prisma.oportunidad.findUnique({
    where: { id },
    include: {
      contacto: { include: { oportunidades: { select: { id: true, etapa: true, createdAt: true, tours: true }, orderBy: { createdAt: "desc" } } } },
      historial: { orderBy: { createdAt: "desc" } }, notasLista: { orderBy: { createdAt: "desc" } }, tareas: { orderBy: { vence: "asc" } },
    },
  });
  if (!op) return null;
  const [cotizaciones, reservas] = await Promise.all([
    prisma.tourQuote.findMany({ where: { oportunidadId: id }, orderBy: { createdAt: "desc" }, select: { id: true, quoteNumber: true, status: true, totalAmount: true, tourName: true, tourDate: true, createdAt: true } }),
    prisma.tourBooking.findMany({ where: { oportunidadId: id }, orderBy: { createdAt: "desc" } }),
  ]);
  return {
    id: op.id, etapa: op.etapa, canal: op.canal, tours: op.tours, fechaViaje: op.fechaViaje, pax: op.pax, perfil: op.perfil,
    quiereHospedaje: op.quiereHospedaje, monto: op.monto, responsable: op.responsable, proximoPaso: op.proximoPaso,
    proximoPasoEn: op.proximoPasoEn, motivoPerdida: op.motivoPerdida, creadoPor: op.creadoPor, createdAt: op.createdAt.toISOString(),
    contacto: { id: op.contacto.id, nombre: op.contacto.nombre, telefono: op.contacto.telefono, correo: op.contacto.correo, idioma: op.contacto.idioma },
    otras: op.contacto.oportunidades.filter(o => o.id !== id).map(o => ({ id: o.id, etapa: o.etapa, createdAt: o.createdAt.toISOString(), tours: o.tours })),
    historial: op.historial.map(h => ({ id: h.id, anterior: h.anterior, nueva: h.nueva, por: h.por, origen: h.origen, en: h.createdAt.toISOString() })),
    notas: op.notasLista.map(n => ({ id: n.id, autor: n.autor, texto: n.texto, en: n.createdAt.toISOString() })),
    tareas: op.tareas.map(t => ({ id: t.id, titulo: t.titulo, responsable: t.responsable, vence: t.vence, estado: t.estado, hechaPor: t.hechaPor, en: t.createdAt.toISOString() })),
    cotizaciones: cotizaciones.map(c => ({ id: c.id, folio: c.quoteNumber, status: c.status, total: c.totalAmount, tour: c.tourName, fecha: c.tourDate, en: c.createdAt.toISOString() })),
    reservas: reservas.map(r => ({ id: r.id, folio: r.confirmationNumber, status: r.status, total: r.totalAmount, cobrado: montoCobrado(r), tour: r.tourName, fecha: r.tourDate, en: r.createdAt.toISOString() })),
  };
}
export type FichaLead = NonNullable<Awaited<ReturnType<typeof fichaOportunidad>>>;

export async function tareasPendientes() {
  const ts = await prisma.tarea.findMany({
    where: { OR: [{ estado: "pendiente" }, { estado: "hecha", hechaEn: { gte: new Date(Date.now() - 86400000) } }] },
    include: { oportunidad: { include: { contacto: { select: { nombre: true, telefono: true } } } } },
    orderBy: { vence: "asc" }, take: 500,
  });
  return ts.map(t => ({
    id: t.id, titulo: t.titulo, responsable: t.responsable, vence: t.vence, estado: t.estado, origen: t.origen, hechaPor: t.hechaPor,
    oportunidadId: t.oportunidadId, salidaClave: t.salidaClave,
    cliente: t.oportunidad?.contacto.nombre ?? null, telefono: t.oportunidad?.contacto.telefono ?? null,
    etapa: t.oportunidad?.etapa ?? null,
  }));
}
export type TareaFila = Awaited<ReturnType<typeof tareasPendientes>>[number];

/** Para los contadores del menú: leads abiertos y seguimientos vencidos. */
export async function contadoresCrm(): Promise<{ leads: number; vencidos: number }> {
  try {
    const hoy = hoyMX();
    const [leads, vencidos] = await Promise.all([
      prisma.oportunidad.count({ where: { etapa: { in: ["nuevo", "calificado", "cotizado", "seguimiento", "anticipo"] } } }),
      prisma.tarea.count({ where: { estado: "pendiente", vence: { lt: hoy } } }),
    ]);
    return { leads, vencidos };
  } catch {
    return { leads: 0, vencidos: 0 };
  }
}

export { estaAbierta, esEtapa };
