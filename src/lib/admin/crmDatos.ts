// Solo servidor: lo que lee y escribe el CRM (Fase 2, 3 nov 2026). Cada
// cambio de etapa queda en `EtapaOportunidad` con quién lo hizo, y lo que
// mueve dinero o clientes también en la bitácora.
import { leerOrigenWeb } from "./origenWeb";
import { prisma } from "@/lib/prisma";
import { addDaysYMD, hoyMX } from "@/lib/dates";
import { origenValido } from "@/lib/origenReserva";
import { TOURS_LISTA } from "@/lib/tours";
import { registrarEnBitacora, SISTEMA } from "./bitacora";
import { montoCobrado } from "./dinero";
import { lineasDe } from "./reserva";
import { correoParaContacto } from "@/lib/reservaWeb";
import { resumenLead, cotizacionVigente, cotizacionViva } from "./resumenLead";
import { fechaLimite, etapaDe } from "../vencimientoCotizacion";
import { etiquetaMotivo as etiquetaCancelacion } from "./cancelacion";
import { HECHA_POR_REGLA, RESPONSABLE_OPERACION, tituloConsultaNueva } from "./automatizaciones";
import {
  esEtapa, estaAbierta, etapaPorCobro, etapaPorReglas, horaValida, viajeYaPaso, ETAPAS_QUE_SE_OPERAN, motivoPerdidaParaGuardar, normalizarTelefono, subirA, validarCambioEtapa,
  etiquetaEtapa, etapaPorHechos, montoPorHechos, canalTrasReserva, cerradoHaceMenosDe, fechasDelViaje, completarLead, loQueMandaLaCotizacion, leadVacio,
  DIAS_CIERRE_RECIENTE, type Etapa, type ReservaDelLead,
} from "./crm";

const texto = (v: unknown, max: number) => { const t = String(v ?? "").trim().slice(0, max); return t || null; };
const ymd = (v: unknown) => { const t = String(v ?? "").trim(); return /^\d{4}-\d{2}-\d{2}$/.test(t) && addDaysYMD(t, 0) === t ? t : null; };
const entero = (v: unknown, max: number) => { if (v === null || v === undefined || v === "") return null; const n = Math.round(Number(v)); return Number.isFinite(n) && n >= 0 && n <= max ? n : null; };
const SLUGS = new Set([...TOURS_LISTA.map(t => t.slug), "rzr-xilitla", "__personalizado"]);
const tours = (v: unknown) => (Array.isArray(v) ? v.map(String).filter(s => SLUGS.has(s)) : []).slice(0, 10);

export class ErrorCrm extends Error {}

export async function registrarEtapa(oportunidadId: string, anterior: string | null, nueva: string, por: string, origen: "persona" | "regla" | "agente") {
  await prisma.etapaOportunidad.create({ data: { oportunidadId, anterior, nueva, por, origen } });
  // Lo que toca cada vez que cambia la etapa, venga de quien venga (5 nov 2026).
  // Nunca tumba el cambio que ya se guardó.
  if (anterior && anterior !== nueva) await trasCambiarEtapa(oportunidadId, anterior, nueva).catch(e => console.error("trasCambiarEtapa:", (e as Error)?.message));
}

/**
 * Fuera de Cotizado, el «Seguimiento a la cotización: ¿la vio?» ya no aplica y
 * se cierra solo (antes le pedía a Erick perseguir a quien ya pagó). Y un lead
 * que revive (Perdido u Operado → abierto) no deja otro abierto y vacío del
 * mismo contacto: ese se junta con él.
 */
async function trasCambiarEtapa(oportunidadId: string, anterior: string, nueva: string) {
  if (anterior === "cotizado") await cerrarSeguimientosDeCotizacion(oportunidadId);
  if (!estaAbierta(anterior) && estaAbierta(nueva)) await juntarLeadsVacios(oportunidadId);
}

/** Cierra los «Seguimiento a la cotización» automáticos pendientes de un lead. */
async function cerrarSeguimientosDeCotizacion(oportunidadId: string) {
  const ts = await prisma.tarea.findMany({ where: { oportunidadId, estado: "pendiente", regla: "cotizado-24h" }, select: { id: true, titulo: true } });
  if (!ts.length) return;
  await prisma.tarea.updateMany({ where: { id: { in: ts.map(t => t.id) }, estado: "pendiente" }, data: { estado: "hecha", hechaPor: HECHA_POR_REGLA, hechaEn: new Date() } });
  for (const t of ts) await sincronizarProximoPaso(oportunidadId, t.titulo);
}

/** Los otros leads abiertos y VACÍOS del mismo contacto se juntan con este (que acaba de revivir). */
async function juntarLeadsVacios(oportunidadId: string) {
  const op = await prisma.oportunidad.findUnique({ where: { id: oportunidadId } });
  if (!op || !estaAbierta(op.etapa)) return;
  const otros = await prisma.oportunidad.findMany({ where: { contactoId: op.contactoId, id: { not: op.id }, etapa: { in: ETAPAS_PIPELINE_ABIERTAS } } });
  for (const o of otros) {
    const [cotizaciones, reservas] = await Promise.all([
      prisma.tourQuote.count({ where: { oportunidadId: o.id } }),
      prisma.tourBooking.count({ where: { oportunidadId: o.id } }),
    ]);
    if (leadVacio({ etapa: o.etapa, cotizaciones, reservas })) await fusionarLead(op.id, o.id, "este lead volvió a abrirse y no deben quedar dos abiertos");
  }
}

/**
 * Un contacto que nació sin teléfono (chat «@lid») resultó ser alguien que ya
 * estaba en el CRM con ese número (5 nov 2026). Sus chats y sus leads pasan al
 * contacto bueno; entre los leads abiertos que le quedan, los vacíos se juntan
 * con el que tiene cotización o reserva (o con el más viejo). El contacto sin
 * teléfono, ya sin nada, se borra.
 */
export async function juntarContactos(destinoId: string, origenId: string, porque: string): Promise<void> {
  if (destinoId === origenId) return;
  const [d, o] = await Promise.all([prisma.contacto.findUnique({ where: { id: destinoId } }), prisma.contacto.findUnique({ where: { id: origenId } })]);
  if (!d || !o) return;
  await prisma.conversacion.updateMany({ where: { contactoId: o.id }, data: { contactoId: d.id } });
  await prisma.oportunidad.updateMany({ where: { contactoId: o.id }, data: { contactoId: d.id } });
  const data: Record<string, string> = {};
  if (!d.correo && o.correo) data.correo = o.correo;
  const sinNombre = (n: string) => !n.trim() || n === d.telefono || /^Sin nombre/i.test(n);
  if (sinNombre(d.nombre) && !sinNombre(o.nombre)) data.nombre = o.nombre;
  if (Object.keys(data).length) await prisma.contacto.update({ where: { id: d.id }, data });
  await prisma.contacto.delete({ where: { id: o.id } }).catch(() => null);
  await registrarEnBitacora({ accion: "modificó", entidad: "lead", referencia: d.nombre, resumen: `${d.nombre}: se juntaron dos contactos de la misma persona (${porque})` });

  const abiertos = await prisma.oportunidad.findMany({ where: { contactoId: d.id, etapa: { in: ETAPAS_PIPELINE_ABIERTAS } }, orderBy: { createdAt: "asc" } });
  if (abiertos.length < 2) return;
  const conCuentas = await Promise.all(abiertos.map(async a => ({
    a, vacio: leadVacio({ etapa: a.etapa, cotizaciones: await prisma.tourQuote.count({ where: { oportunidadId: a.id } }), reservas: await prisma.tourBooking.count({ where: { oportunidadId: a.id } }) }),
  })));
  const queda = (conCuentas.find(x => !x.vacio) ?? conCuentas[0]).a;
  for (const x of conCuentas) if (x.a.id !== queda.id && x.vacio) await fusionarLead(queda.id, x.a.id, porque);
}

/**
 * Junta `origenId` (vacío: sin cotizaciones ni reservas) en `destinoId`: le
 * pasa sus notas y seguimientos, y lo que le falte (de qué página llegó, tours,
 * fecha, personas). Después lo borra. Lo usan el lead que revive y el chat
 * «@lid» cuyo teléfono llega después (5 nov 2026).
 */
export async function fusionarLead(destinoId: string, origenId: string, porque: string): Promise<boolean> {
  const [d, o] = await Promise.all([
    prisma.oportunidad.findUnique({ where: { id: destinoId }, include: { contacto: { select: { nombre: true } } } }),
    prisma.oportunidad.findUnique({ where: { id: origenId } }),
  ]);
  if (!d || !o || d.id === o.id) return false;
  await prisma.tarea.updateMany({ where: { oportunidadId: o.id }, data: { oportunidadId: d.id } });
  await prisma.notaOportunidad.updateMany({ where: { oportunidadId: o.id }, data: { oportunidadId: d.id } });
  const data: Record<string, unknown> = {};
  if (!d.origenWeb && o.origenWeb) {
    data.origenWeb = o.origenWeb as object;
    if (d.canal === "whatsapp" && o.canal === "whatsapp_sitio") data.canal = "whatsapp_sitio";
  }
  if (d.canal === "por_confirmar" && o.canal !== "por_confirmar") data.canal = o.canal;
  if (!d.tours.length && o.tours.length) data.tours = o.tours;
  if (!d.fechaViaje && o.fechaViaje) data.fechaViaje = o.fechaViaje;
  if (!d.pax && o.pax) data.pax = o.pax;
  if (!d.perfil && o.perfil) data.perfil = o.perfil;
  if (d.quiereHospedaje == null && o.quiereHospedaje != null) data.quiereHospedaje = o.quiereHospedaje;
  if (Object.keys(data).length) await prisma.oportunidad.update({ where: { id: d.id }, data });
  const dia = o.createdAt.toLocaleDateString("es-MX", { timeZone: "America/Mexico_City", day: "numeric", month: "short" }).replace(/\./g, "");
  await prisma.notaOportunidad.create({ data: { oportunidadId: d.id, autor: "Panel", texto: `Se juntó aquí el lead del ${dia} de esta misma persona (no tenía cotizaciones ni reservas): ${porque}. Sus notas y seguimientos pasaron a este.` } });
  await prisma.oportunidad.delete({ where: { id: o.id } });
  await registrarEnBitacora({ accion: "modificó", entidad: "lead", referencia: d.contacto.nombre, resumen: `${d.contacto.nombre}: se juntaron dos leads abiertos en uno (${porque})` });
  await sincronizarProximoPaso(d.id);
  return true;
}

/** Busca el contacto por teléfono (o correo) o lo crea. */
export async function contactoPara(datos: { nombre: string; telefono: string | null; correo: string | null; idioma?: string | null }) {
  const correo = datos.correo?.toLowerCase() ?? null;
  // Por teléfono; si no, por correo. Un contacto capturado solo con correo y
  // que luego llega con teléfono (p. ej. la cotización) es la MISMA persona:
  // antes nacía un segundo contacto y un segundo lead (revisión del 4 nov 2026).
  const existente = (datos.telefono ? await prisma.contacto.findUnique({ where: { telefono: datos.telefono } }) : null)
    ?? (correo ? await prisma.contacto.findFirst({ where: { correo, ...(datos.telefono ? { telefono: null } : {}) }, orderBy: { createdAt: "asc" } }) : null);
  if (existente) {
    // Lo que faltaba se completa; lo que ya había no se pisa.
    const falta: Record<string, string> = {};
    if (!existente.correo && correo) falta.correo = correo;
    if (!existente.telefono && datos.telefono) falta.telefono = datos.telefono;
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
 * duplica (regla del prompt: «crear un lead en Nuevo si no hay uno abierto»):
 * lo capturado se junta en esa (5 nov 2026; antes se tiraba sin avisar la nota,
 * el próximo paso, los tours, la fecha y las personas). Devuelve qué se agregó.
 */
export async function crearOportunidad(d: NuevoLead, quien: string): Promise<{ oportunidad: { id: string; etapa: string }; existente: boolean; agregado: string[] }> {
  const nombre = texto(d.nombre, 120);
  const telefono = normalizarTelefono(d.telefono);
  const correo = texto(d.correo, 160);
  if (!nombre) throw new ErrorCrm("Falta el nombre.");
  if (d.telefono && !telefono) throw new ErrorCrm("Ese teléfono no parece válido (10 dígitos, o con +país).");
  const contacto = await contactoPara({ nombre, telefono, correo, idioma: texto(d.idioma, 2) });
  const abierta = await prisma.oportunidad.findFirst({ where: { contactoId: contacto.id, etapa: { in: ["nuevo", "calificado", "cotizado", "seguimiento", "anticipo", "confirmado"] } }, orderBy: { createdAt: "desc" } });
  if (abierta) {
    const j = await juntarCaptura(abierta, d, quien);
    return { oportunidad: { ...abierta, etapa: j.etapa }, existente: true, agregado: j.agregado };
  }

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
  // El próximo paso del alta es un SEGUIMIENTO de verdad (4 nov 2026): antes quedaba
  // solo como texto en el lead y no salía en /seguimientos ni avisaba a nadie.
  if (op.proximoPaso) await crearTarea({ titulo: op.proximoPaso, vence: op.proximoPasoEn ?? undefined, responsable: op.responsable ?? quien, oportunidadId: op.id }, quien);
  await registrarEnBitacora({ accion: "creó", entidad: "lead", referencia: contacto.nombre, resumen: `Lead nuevo: ${contacto.nombre} (${etiquetaEtapa(etapa)})` });
  return { oportunidad: op, existente: false, agregado: [] };
}

/** Lo capturado en «Nuevo lead» se junta en el lead abierto que ya tenía: lo que falta, la nota y el próximo paso. */
async function juntarCaptura(op: { id: string; etapa: string; tours: string[]; fechaViaje: string | null; pax: number | null; perfil: string | null; quiereHospedaje: boolean | null; monto: number | null; canal: string; responsable: string | null }, d: NuevoLead, quien: string): Promise<{ agregado: string[]; etapa: string }> {
  const { data, agregado } = completarLead(
    { etapa: op.etapa as Etapa, tours: op.tours, fechaViaje: op.fechaViaje, pax: op.pax, perfil: op.perfil, quiereHospedaje: op.quiereHospedaje, monto: op.monto, canal: op.canal },
    {
      tours: tours(d.tours), fechaViaje: ymd(d.fechaViaje), pax: entero(d.pax, 200), perfil: texto(d.perfil, 20),
      quiereHospedaje: typeof d.quiereHospedaje === "boolean" ? d.quiereHospedaje : null, monto: entero(d.monto, 10_000_000),
      canal: d.canal ? origenValido(d.canal, "por_confirmar") : null,
    },
  );
  if (Object.keys(data).length) await prisma.oportunidad.update({ where: { id: op.id }, data: data as never });
  if (data.etapa) await registrarEtapa(op.id, op.etapa, data.etapa, "Regla: tour, fecha y personas", "regla");
  const nota = texto(d.nota, 2000);
  if (nota) { await prisma.notaOportunidad.create({ data: { oportunidadId: op.id, autor: quien, texto: nota } }); agregado.push("la nota"); }
  const paso = texto(d.proximoPaso, 200);
  if (paso) {
    await crearTarea({ titulo: paso, vence: ymd(d.proximoPasoEn) ?? undefined, responsable: texto(d.responsable, 60) ?? op.responsable ?? quien, oportunidadId: op.id }, quien);
    agregado.push(`el seguimiento «${paso}»`);
  }
  return { agregado, etapa: data.etapa ?? op.etapa };
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
 * sube sola: con cotización, a Cotizado; con reserva, según lo cobrado (ver
 * `etapaPorCobro`): sin pago En seguimiento, con anticipo Anticipo pagado,
 * liquidada Confirmado. Nunca baja.
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
    objetivo = etapaPorCobro(montoCobrado(res), res.totalAmount); monto = res.totalAmount;
  }
  const etapa = subirA(op.etapa as Etapa, objetivo);
  await prisma.oportunidad.update({ where: { id }, data: { etapa, ...(monto && !op.monto ? { monto } : {}) } });
  if (etapa !== op.etapa) await registrarEtapa(id, op.etapa, etapa, `Regla: se enlazó ${folio}`, "regla");
  await registrarEnBitacora({ accion: "modificó", entidad: "lead", referencia: folio, resumen: `${op.contacto.nombre}: se enlazó ${folio}${etapa !== op.etapa ? ` y pasó a ${etiquetaEtapa(etapa)}` : ""}` });
  return { etapa };
}

// ── Tareas ──────────────────────────────────────────────────────────────────

export async function crearTarea(d: { titulo?: unknown; responsable?: unknown; vence?: unknown; hora?: unknown; oportunidadId?: unknown; salidaClave?: unknown }, quien: string) {
  const titulo = texto(d.titulo, 200);
  if (!titulo) throw new ErrorCrm("Escribe qué hay que hacer.");
  const vence = ymd(d.vence) ?? hoyMX();
  const oportunidadId = texto(d.oportunidadId, 40);
  if (oportunidadId && !(await prisma.oportunidad.findUnique({ where: { id: oportunidadId }, select: { id: true } }))) throw new ErrorCrm("Ese lead no existe.");
  const t = await prisma.tarea.create({
    data: { titulo, responsable: texto(d.responsable, 60) ?? quien, vence, hora: horaValida(d.hora), oportunidadId, salidaClave: texto(d.salidaClave, 200), creadaPor: quien, origen: "manual" },
  });
  // El próximo paso del lead es su tarea más cercana.
  if (oportunidadId) await sincronizarProximoPaso(oportunidadId);
  return t;
}

export interface CambioTarea { accion?: unknown; dias?: unknown; titulo?: unknown; vence?: unknown; hora?: unknown; responsable?: unknown }

export async function cambiarTarea(id: string, c: CambioTarea, quien: string) {
  const { accion, dias } = c;
  const t = await prisma.tarea.findUnique({ where: { id } });
  if (!t) throw new ErrorCrm("Esa tarea no existe.");
  let r;
  if (accion === "editar") {
    // Editar en su lugar (3 nov 2026): qué, día, hora y quién. Si cambia el
    // día, la hora o el responsable, el recordatorio vuelve a salir.
    const titulo = c.titulo !== undefined ? texto(c.titulo, 200) : t.titulo;
    if (!titulo) throw new ErrorCrm("Escribe qué hay que hacer.");
    const vence = c.vence !== undefined ? ymd(c.vence) : t.vence;
    if (!vence) throw new ErrorCrm("Esa fecha no es válida.");
    const hora = c.hora !== undefined ? horaValida(c.hora) : t.hora;
    const responsable = c.responsable !== undefined ? texto(c.responsable, 60) ?? t.responsable : t.responsable;
    const avisar = vence !== t.vence || hora !== t.hora || responsable !== t.responsable;
    r = await prisma.tarea.update({ where: { id }, data: { titulo, vence, hora, responsable, ...(avisar ? { avisadaEn: null } : {}) } });
    const partes = [titulo !== t.titulo && `«${titulo.slice(0, 60)}»`, vence !== t.vence && `día ${vence}`, hora !== t.hora && `hora ${hora ?? "sin hora"}`, responsable !== t.responsable && `para ${responsable}`].filter(Boolean);
    if (partes.length) await registrarEnBitacora({ accion: "modificó", entidad: "tarea", referencia: t.titulo.slice(0, 60), resumen: `Seguimiento «${t.titulo.slice(0, 80)}» editado: ${partes.join(", ")}` });
    if (t.oportunidadId) await sincronizarProximoPaso(t.oportunidadId);
    return r;
  }
  if (accion === "hecha") r = await prisma.tarea.update({ where: { id }, data: { estado: "hecha", hechaPor: quien, hechaEn: new Date() } });
  else if (accion === "reabrir") r = await prisma.tarea.update({ where: { id }, data: { estado: "pendiente", hechaPor: null, hechaEn: null } });
  else if (accion === "posponer") {
    const n = Math.max(1, Math.min(30, Math.round(Number(dias) || 1)));
    r = await prisma.tarea.update({ where: { id }, data: { vence: addDaysYMD(t.vence < hoyMX() ? hoyMX() : t.vence, n), avisadaEn: null } });
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
export async function sincronizarProximoPaso(oportunidadId: string, tituloCerrado: string | null = null) {
  const sig = await prisma.tarea.findFirst({ where: { oportunidadId, estado: "pendiente" }, orderBy: [{ vence: "asc" }, { hora: "asc" }] });
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
  await operarViajesPasados();
  const desde = new Date(Date.now() - 120 * 86400000);
  const ops = await prisma.oportunidad.findMany({
    where: { OR: [{ etapa: { in: ["nuevo", "calificado", "cotizado", "seguimiento", "anticipo", "confirmado"] } }, { updatedAt: { gte: desde } }] },
    include: { contacto: true, _count: { select: { tareas: { where: { estado: "pendiente" } } } } },
    orderBy: { updatedAt: "desc" },
  });
  // La cotización vigente de cada lead, para enseñar cuándo vence en su tarjeta.
  const cots = ops.length ? await prisma.tourQuote.findMany({
    where: { oportunidadId: { in: ops.map(o => o.id) } },
    select: { id: true, oportunidadId: true, status: true, tourDate: true, lineItems: true, packageItems: true, createdAt: true, quoteNumber: true, totalAmount: true, tourName: true, tourSlug: true, adults: true, children: true, notes: true, extraItems: true },
  }) : [];
  const hoy = hoyMX();
  const venceDe = (id: string) => {
    const q = cotizacionVigente(cots.filter(c => c.oportunidadId === id));
    if (!q) return { venceCotizacion: null, estadoCotizacion: null };
    return { venceCotizacion: fechaLimite(q), estadoCotizacion: etapaDe(q, hoy) };
  };
  return ops.map(o => ({
    ...venceDe(o.id),
    id: o.id, etapa: o.etapa, canal: o.canal, tours: o.tours, fechaViaje: o.fechaViaje, pax: o.pax, monto: o.monto,
    responsable: o.responsable, proximoPaso: o.proximoPaso, proximoPasoEn: o.proximoPasoEn, motivoPerdida: o.motivoPerdida,
    nombre: o.contacto.nombre, telefono: o.contacto.telefono, tareasPendientes: o._count.tareas,
    createdAt: o.createdAt.toISOString(), updatedAt: o.updatedAt.toISOString(),
  }));
}
export type LeadTarjeta = Awaited<ReturnType<typeof listarPipeline>>[number];

export async function fichaOportunidad(id: string) {
  await operarViajesPasados(hoyMX(), id);
  const op = await prisma.oportunidad.findUnique({
    where: { id },
    include: {
      contacto: { include: { oportunidades: { select: { id: true, etapa: true, createdAt: true, tours: true }, orderBy: { createdAt: "desc" } } } },
      historial: { orderBy: { createdAt: "desc" } }, notasLista: { orderBy: { createdAt: "desc" } }, tareas: { orderBy: [{ vence: "asc" }, { hora: "asc" }] },
    },
  });
  if (!op) return null;
  const [cotizaciones, reservas] = await Promise.all([
    prisma.tourQuote.findMany({ where: { oportunidadId: id }, orderBy: { createdAt: "desc" } }),
    prisma.tourBooking.findMany({ where: { oportunidadId: id }, orderBy: { createdAt: "desc" } }),
  ]);
  const ligas = cotizaciones.length ? await prisma.linkPago.findMany({ where: { cotizacionId: { in: cotizaciones.map(c => c.id) }, estado: "pagado", reservaId: null }, select: { cotizacionId: true, montoPagado: true, monto: true } }) : [];
  const pagadoPorLiga = (cid: string) => ligas.filter(l => l.cotizacionId === cid).reduce((t, l) => t + (l.montoPagado ?? l.monto), 0);
  const hoy = hoyMX();
  return {
    resumen: resumenLead(cotizaciones, reservas, hoy),
    id: op.id, etapa: op.etapa, canal: op.canal, tours: op.tours, fechaViaje: op.fechaViaje, pax: op.pax, perfil: op.perfil,
    quiereHospedaje: op.quiereHospedaje, monto: op.monto, responsable: op.responsable, proximoPaso: op.proximoPaso,
    proximoPasoEn: op.proximoPasoEn, motivoPerdida: op.motivoPerdida, creadoPor: op.creadoPor, createdAt: op.createdAt.toISOString(),
    // De qué página y canal llegó (código de referencia del WhatsApp, 4 nov 2026).
    origenWeb: leerOrigenWeb(op.origenWeb),
    contacto: { id: op.contacto.id, nombre: op.contacto.nombre, telefono: op.contacto.telefono, correo: op.contacto.correo, idioma: op.contacto.idioma },
    otras: op.contacto.oportunidades.filter(o => o.id !== id).map(o => ({ id: o.id, etapa: o.etapa, createdAt: o.createdAt.toISOString(), tours: o.tours })),
    historial: op.historial.map(h => ({ id: h.id, anterior: h.anterior, nueva: h.nueva, por: h.por, origen: h.origen, en: h.createdAt.toISOString() })),
    notas: op.notasLista.map(n => ({ id: n.id, autor: n.autor, texto: n.texto, en: n.createdAt.toISOString() })),
    tareas: op.tareas.map(t => ({ id: t.id, titulo: t.titulo, responsable: t.responsable, vence: t.vence, hora: t.hora, estado: t.estado, hechaPor: t.hechaPor, hechaEn: t.hechaEn?.toISOString() ?? null, creadaPor: t.creadaPor, en: t.createdAt.toISOString() })),
    cotizaciones: cotizaciones.map(c => ({
      id: c.id, folio: c.quoteNumber, status: c.status, total: c.totalAmount, tour: c.tourName, tours: toursDe(c), fecha: c.tourDate,
      personas: c.adults + c.children, en: c.createdAt.toISOString(), editadaEn: c.updatedAt.toISOString(),
      vence: fechaLimite(c), estadoVence: etapaDe(c, hoy), pagadoPorLiga: pagadoPorLiga(c.id),
    })),
    reservas: reservas.map(r => ({
      id: r.id, folio: r.confirmationNumber, status: r.status, total: r.totalAmount, cobrado: montoCobrado(r), tour: r.tourName, tours: toursDe(r),
      fecha: r.tourDate, personas: r.adults + r.children, origen: r.origen, guia: r.guia, en: r.createdAt.toISOString(),
    })),
  };
}
export type FichaLead = NonNullable<Awaited<ReturnType<typeof fichaOportunidad>>>;

export async function tareasPendientes() {
  const ts = await prisma.tarea.findMany({
    where: { OR: [{ estado: "pendiente" }, { estado: "hecha", hechaEn: { gte: new Date(Date.now() - 86400000) } }] },
    include: { oportunidad: { include: { contacto: { select: { nombre: true, telefono: true } } } } },
    orderBy: [{ vence: "asc" }, { hora: "asc" }], take: 500,
  });
  return ts.map(t => ({
    id: t.id, titulo: t.titulo, responsable: t.responsable, vence: t.vence, hora: t.hora, estado: t.estado, origen: t.origen, hechaPor: t.hechaPor,
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

// ── Cambios de etapa automáticos (3 nov 2026, pedido de Manolo) ─────────────
// «La creación de cotización agrega automáticamente el lead, el flujo empieza
// desde Calificado y una vez que se manda por correo o se descarga el PDF pasa
// a Cotizado.» Nunca tumban la operación que los dispara: si algo falla, se
// anota en el log y la cotización o la reserva se guardan igual.

const ESTADOS_SIN_LEAD = ["expirada", "archivada", "aceptada"];

/**
 * El lead de una cotización: el que ya tiene enlazado, el abierto de esa
 * persona, o uno nuevo con los datos de la cotización. Sube a `objetivo`
 * (Calificado al crearla, Cotizado al mandarla o descargar su PDF), nunca baja.
 */
export async function leadDesdeCotizacion(
  quoteId: string, objetivo: "calificado" | "cotizado", quien: string, motivo: string, sincronizar = false,
): Promise<string | null> {
  try {
    const q = await prisma.tourQuote.findUnique({ where: { id: quoteId } });
    if (!q) return null;
    if (!q.oportunidadId && ESTADOS_SIN_LEAD.includes(q.status)) return null;
    const datos = { tours: toursDe(q), fechaViaje: ymd(q.tourDate), pax: (q.adults + q.children) || null };
    let op = q.oportunidadId ? await prisma.oportunidad.findUnique({ where: { id: q.oportunidadId } }) : null;
    if (!op) {
      const contacto = await contactoPara({ nombre: q.customerName, telefono: normalizarTelefono(q.customerPhone), correo: q.customerEmail?.trim() || null });
      op = await prisma.oportunidad.findFirst({ where: { contactoId: contacto.id, etapa: { in: ["nuevo", "calificado", "cotizado", "seguimiento", "anticipo", "confirmado"] } }, orderBy: { createdAt: "desc" } });
      if (!op) {
        // Canal HONESTO (KPI «Leads con canal de origen», 4 nov 2026): antes todo
        // lead nacido de una cotización quedaba «WhatsApp» por omisión y el KPI
        // salía 100 % sin que nadie lo hubiera registrado. Si su chat está en la
        // Bandeja, escribió por WhatsApp; si no, queda «por confirmar» y Erick
        // lo completa en la ficha.
        const tieneChat = await prisma.conversacion.count({
          where: { OR: [{ contactoId: contacto.id }, ...(contacto.telefono ? [{ telefono: contacto.telefono }] : [])] },
        }).catch(() => 0);
        op = await prisma.oportunidad.create({
          data: { contactoId: contacto.id, etapa: objetivo, canal: tieneChat ? "whatsapp" : "por_confirmar", ...datos, monto: q.totalAmount || null, responsable: quien, creadoPor: quien },
        });
        await registrarEtapa(op.id, null, objetivo, `Regla: ${motivo}`, "regla");
        await registrarEnBitacora({ accion: "creó", entidad: "lead", referencia: q.quoteNumber, resumen: `Lead nuevo desde la cotización ${q.quoteNumber}: ${contacto.nombre} (${etiquetaEtapa(objetivo)})` });
      }
      await prisma.tourQuote.update({ where: { id: q.id }, data: { oportunidadId: op.id } });
    }
    const etapa = subirA(op.etapa as Etapa, objetivo);
    const data: Record<string, unknown> = {};
    // Lo vivo manda (5 nov 2026): con reservas vivas, monto, fecha, tours y
    // personas salen de ellas; con otra cotización viva, el monto es el de la
    // vigente. Antes la última cotización que se tocaba (otra opción, un día
    // extra, el «aceptada» tras convertir) pisaba lo que valía el lead.
    const hoy = hoyMX();
    const [reservasVivas, cotsDelLead] = await Promise.all([
      prisma.tourBooking.count({ where: { oportunidadId: op.id, status: { not: "cancelled" } } }),
      prisma.tourQuote.findMany({ where: { oportunidadId: op.id, status: { in: ["borrador", "enviada"] } } }),
    ]);
    const vivas = cotsDelLead.filter(c => cotizacionViva(c, hoy));
    // ¿Es la que manda? Al editarla, sus datos pasan al lead aunque haya otra viva (revisión del 5 nov 2026).
    const esLaVigente = cotizacionVigente(vivas)?.id === q.id;
    const manda = loQueMandaLaCotizacion({ reservasVivas, otrasCotizacionesVivas: vivas.filter(c => c.id !== q.id).length, sincronizar, esLaVigente });
    if (manda.monto === "esta" && q.totalAmount) data.monto = q.totalAmount;
    if (manda.monto === "vigente") { const v = cotizacionVigente(vivas); if (v?.totalAmount) data.monto = v.totalAmount; }
    // Al EDITAR la cotización, lo que dice ella manda en el lead (pedido de
    // Manolo, 3 nov 2026). Al crearla o mandarla, solo se llena lo que falta.
    const pisar = (k: "tours" | "fechaViaje" | "pax", v: unknown, vacio: boolean) => {
      if (v === null || v === undefined || (Array.isArray(v) && !v.length)) return;
      if (manda.pisar ? JSON.stringify(v) !== JSON.stringify(op![k]) : manda.llenarVacios && vacio) data[k] = v;
    };
    pisar("tours", datos.tours, !op.tours.length);
    pisar("fechaViaje", datos.fechaViaje, !op.fechaViaje);
    pisar("pax", datos.pax, !op.pax);
    if (etapa !== op.etapa) data.etapa = etapa;
    const cambios: string[] = [];
    if (sincronizar) {
      if (data.monto !== undefined && data.monto !== op.monto) cambios.push(`total ${pesosCorto(data.monto as number)}`);
      if (data.fechaViaje !== undefined) cambios.push(`fecha ${new Date(`${datos.fechaViaje}T12:00:00`).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" }).replace(/\./g, "")}`);
      if (data.pax !== undefined) cambios.push(`${datos.pax} personas`);
      if (data.tours !== undefined) cambios.push("tours");
      cambios.push(...(await contactoDesdeCotizacion(op.contactoId, q)));
    }
    if (Object.keys(data).length) await prisma.oportunidad.update({ where: { id: op.id }, data });
    if (etapa !== op.etapa) await registrarEtapa(op.id, op.etapa, etapa, `Regla: ${motivo}`, "regla");
    if (cambios.length) {
      await prisma.notaOportunidad.create({ data: { oportunidadId: op.id, autor: quien, texto: `Se editó la cotización ${q.quoteNumber} y el lead se actualizó: ${cambios.join(", ")}.` } });
    }
    return op.id;
  } catch (e) {
    console.error("leadDesdeCotizacion:", (e as Error)?.message);
    return null;
  }
}

const pesosCorto = (n: number) => `$${Math.round(n).toLocaleString("es-MX")}`;

/**
 * Nombre, correo y teléfono de la cotización editada pasan al contacto. El
 * teléfono solo si no es ya de otra persona (es único). Devuelve qué cambió.
 */
async function contactoDesdeCotizacion(contactoId: string, q: { customerName: string; customerEmail: string | null; customerPhone: string | null }): Promise<string[]> {
  const c = await prisma.contacto.findUnique({ where: { id: contactoId } });
  if (!c) return [];
  const data: Record<string, string> = {};
  const nombre = q.customerName?.trim();
  if (nombre && nombre !== c.nombre) data.nombre = nombre.slice(0, 120);
  const correo = q.customerEmail?.trim().toLowerCase();
  if (correo && correo !== c.correo) data.correo = correo.slice(0, 160);
  const tel = normalizarTelefono(q.customerPhone);
  if (tel && tel !== c.telefono) {
    const otro = await prisma.contacto.findUnique({ where: { telefono: tel } });
    if (!otro) data.telefono = tel;
  }
  if (!Object.keys(data).length) return [];
  await prisma.contacto.update({ where: { id: contactoId }, data });
  return [data.nombre && "nombre", data.correo && "correo", data.telefono && "teléfono"].filter((x): x is string => !!x);
}

/** El último día de tour de una reserva (sus renglones, o el principal). */
const ultimoDiaDe = (r: { tourDate: string; lineItems?: unknown }) =>
  [...lineasDe(r as never).map(l => l.tourDate), r.tourDate].filter((f): f is string => typeof f === "string" && /^\d{4}-\d{2}-\d{2}$/.test(f)).sort().at(-1) ?? null;

/**
 * Pone el lead al día con sus HECHOS (5 nov 2026): la etapa y el monto salen
 * del dinero de sus reservas vivas (ver `etapaPorHechos`), sin depender de la
 * reserva que lo dispara. Antes cada camino hacía su cuenta: un pago en la web
 * de alguien con lead abierto lo dejaba en Cotizado, y cancelar una de dos
 * reservas o anular un cobro de una cancelada no movía nada.
 *  - `revivir`: hubo un hecho nuevo (reserva nueva, cobro, liga pagada).
 *  - `canalDe`: el canal de la reserva que lo dispara (ver `canalTrasReserva`).
 * Devuelve la etapa en que quedó. No lanza.
 */
export async function recalcularLead(oportunidadId: string, motivo: string, { revivir = false, canalDe = null as string | null } = {}): Promise<Etapa | null> {
  try {
    const op = await prisma.oportunidad.findUnique({ where: { id: oportunidadId } });
    if (!op) return null;
    const hoy = hoyMX();
    const [vivas, cots] = await Promise.all([
      prisma.tourBooking.findMany({ where: { oportunidadId: op.id, status: { not: "cancelled" } } }),
      prisma.tourQuote.findMany({ where: { oportunidadId: op.id, status: { in: ["borrador", "enviada"] } } }),
    ]);
    const reservas: ReservaDelLead[] = vivas.map(x => ({ cobrado: montoCobrado(x), total: x.totalAmount, ultimoDia: ultimoDiaDe(x) }));
    const etapa = etapaPorHechos({ etapa: op.etapa as Etapa, reservas, hoy, revivir });
    const vigente = cotizacionVigente(cots.filter(c => cotizacionViva(c, hoy)));
    const monto = montoPorHechos({ reservas, cotizacionVigente: vigente?.totalAmount ?? null, actual: op.monto });
    const canal = canalTrasReserva(op.canal, canalDe);
    const data: Record<string, unknown> = {};
    if (etapa !== op.etapa) data.etapa = etapa;
    if (op.etapa === "perdido" && etapa !== "perdido") data.motivoPerdida = null;
    if (canal !== op.canal) data.canal = canal;
    if (monto !== op.monto) data.monto = monto;
    if (!Object.keys(data).length) return op.etapa as Etapa;
    await prisma.oportunidad.update({ where: { id: op.id }, data });
    if (etapa !== op.etapa) {
      const volvio = op.etapa === "perdido" ? " (estaba perdido y volvió)" : op.etapa === "operado" ? " (ya operado: viaje nuevo por venir)" : "";
      await registrarEtapa(op.id, op.etapa, etapa, `Regla: ${motivo}${volvio}`, "regla");
    }
    return etapa;
  } catch (e) {
    console.error("recalcularLead:", (e as Error)?.message);
    return null;
  }
}

/**
 * Una reserva enlazada a un lead lo pone al día (ver `recalcularLead`). Una
 * reserva cancelada ya no revive al lead ni le da su canal, pero el lead igual
 * se recalcula con lo que sigue vivo (p. ej. al anular un cobro suyo, 5 nov 2026).
 */
export async function leadDesdeReserva(bookingId: string, motivo: string, { conContacto = false, revivir = false } = {}): Promise<void> {
  try {
    const r = await prisma.tourBooking.findUnique({ where: { id: bookingId } });
    if (!r?.oportunidadId) return;
    const viva = r.status !== "cancelled";
    // Al crear la reserva (p. ej. al convertir la cotización) el nombre, correo
    // y teléfono que se capturaron pasan al contacto. En los cobros, no: ahí
    // nadie los tocó y no deben pisar lo que se corrigió en la ficha.
    if (conContacto && viva) {
      const op = await prisma.oportunidad.findUnique({ where: { id: r.oportunidadId }, select: { contactoId: true } });
      if (op) await contactoDesdeCotizacion(op.contactoId, r);
    }
    // Un lead Perdido que vuelve y reserva (o paga) ya no está perdido: una
    // reserva NUEVA o un cobro son hechos (revisión del 4 nov 2026). Editar una
    // reserva vieja no lo revive: alguien lo marcó perdido a propósito.
    await recalcularLead(r.oportunidadId, motivo, { revivir: revivir && viva, canalDe: viva ? r.origen : null });
  } catch (e) {
    console.error("leadDesdeReserva:", (e as Error)?.message);
  }
}

/**
 * El lead de esa persona que se cerró (en alguna de `etapas`) hace menos de 14
 * días, o null. Cuenta desde el cambio de etapa que lo cerró.
 */
export async function leadCerradoReciente(contactoId: string, etapas: Etapa[], ahora: Date = new Date()) {
  const cierres = await prisma.etapaOportunidad.findMany({
    where: { nueva: { in: etapas }, createdAt: { gte: new Date(ahora.getTime() - DIAS_CIERRE_RECIENTE * 86_400_000) }, oportunidad: { contactoId, etapa: { in: etapas } } },
    orderBy: { createdAt: "desc" }, take: 5, include: { oportunidad: { include: { contacto: { select: { nombre: true } } } } },
  });
  const c = cierres.find(x => x.oportunidad.etapa === x.nueva && cerradoHaceMenosDe(x.createdAt, ahora));
  return c ? c.oportunidad : null;
}

/**
 * Una reserva capturada SIN lead (directo en Reservas, en el Calendario, en la
 * web o en el viaje CDMX) también entra al CRM (revisión del 4 nov 2026). Se
 * enlaza al lead abierto de esa persona (por teléfono o correo), al que perdió
 * hace menos de 14 días (vuelve: 5 nov 2026, antes nacía un duplicado), o nace
 * uno con los datos de la reserva. Al enlazar uno que ya existía, su etapa se
 * pone al día con lo cobrado (5 nov 2026: un pago en la web lo dejaba en
 * Cotizado y le salía «¿la vio?» a quien ya pagó). Con `recalcular: false` lo
 * hace quien llama, después de abonar el dinero. Nunca tumba la reserva.
 */
export async function leadParaReservaSinLead(bookingId: string, quien: string, { recalcular = true } = {}): Promise<string | null> {
  try {
    const r = await prisma.tourBooking.findUnique({ where: { id: bookingId } });
    if (!r || r.oportunidadId || r.status === "cancelled") return r?.oportunidadId ?? null;
    const telefono = normalizarTelefono(r.customerPhone);
    // 🔴 Sin el correo de relleno de las reservas pagadas sin correo
    // («pendiente@desconocido», lote 5, 5 nov 2026): con él, todas esas reservas
    // de clientes distintos caían en el MISMO contacto y en un solo lead.
    const correo = correoParaContacto(r.customerEmail);
    // Sin teléfono ni correo no hay a quién darle seguimiento: no se inventa un contacto.
    if (!telefono && !correo) return null;
    const contacto = await contactoPara({ nombre: r.customerName || "Sin nombre", telefono, correo, idioma: r.idiomaTour });
    const op = await prisma.oportunidad.findFirst({ where: { contactoId: contacto.id, etapa: { in: ETAPAS_PIPELINE_ABIERTAS } }, orderBy: { createdAt: "desc" } })
      ?? await leadCerradoReciente(contacto.id, ["perdido"]);
    if (!op) {
      const etapa = etapaPorCobro(montoCobrado(r), r.totalAmount);
      const nuevo = await prisma.oportunidad.create({
        data: {
          contactoId: contacto.id, etapa, canal: origenValido(r.origen, "por_confirmar"), tours: toursDe(r).filter(t => SLUGS.has(t)),
          fechaViaje: ymd(r.tourDate), pax: (r.adults + r.children) || null, monto: r.totalAmount || null, responsable: quien, creadoPor: quien,
        },
      });
      await registrarEtapa(nuevo.id, null, etapa, `Regla: reserva ${r.confirmationNumber} capturada`, "regla");
      await prisma.tourBooking.update({ where: { id: r.id }, data: { oportunidadId: nuevo.id } });
      return nuevo.id;
    }
    await prisma.tourBooking.update({ where: { id: r.id }, data: { oportunidadId: op.id } });
    if (recalcular) await recalcularLead(op.id, `reserva ${r.confirmationNumber}${quien === "Web" ? " pagada en el sitio" : " enlazada"}`, { revivir: true, canalDe: r.origen });
    return op.id;
  } catch (e) {
    console.error("leadParaReservaSinLead:", (e as Error)?.message);
    return null;
  }
}

/**
 * El lead de una cotización NUEVA hecha desde la ficha o la Bandeja (5 nov
 * 2026). Si ese lead ya está cerrado (Operado o Perdido), la venta nueva no se
 * queda colgada de él —ahí ninguna regla la mueve y no aparece en el tablero—:
 * va al lead abierto de esa persona o a uno nuevo del mismo contacto.
 */
export async function leadParaCotizacionNueva(v: unknown, quien: string): Promise<{ id: string; nuevo: boolean } | null> {
  if (typeof v !== "string" || !v || v.length > 40) return null;
  const op = await prisma.oportunidad.findUnique({ where: { id: v } }).catch(() => null);
  if (!op) return null;
  if (estaAbierta(op.etapa)) return { id: op.id, nuevo: false };
  const abierto = await prisma.oportunidad.findFirst({ where: { contactoId: op.contactoId, etapa: { in: ETAPAS_PIPELINE_ABIERTAS } }, orderBy: { createdAt: "desc" } });
  if (abierto) return { id: abierto.id, nuevo: false };
  const tieneChat = await prisma.conversacion.count({ where: { contactoId: op.contactoId } }).catch(() => 0);
  const nuevo = await prisma.oportunidad.create({
    data: { contactoId: op.contactoId, etapa: "calificado", canal: tieneChat ? "whatsapp" : "por_confirmar", responsable: quien, creadoPor: quien },
    include: { contacto: { select: { nombre: true } } },
  });
  await registrarEtapa(nuevo.id, null, "calificado", `Regla: cotización nueva de un cliente con su lead anterior ${etiquetaEtapa(op.etapa)}`, "regla");
  const dia = op.createdAt.toLocaleDateString("es-MX", { timeZone: "America/Mexico_City", day: "numeric", month: "short", year: "numeric" }).replace(/\./g, "");
  await prisma.notaOportunidad.create({ data: { oportunidadId: nuevo.id, autor: quien, texto: `Cliente que vuelve: su lead del ${dia} está ${etiquetaEtapa(op.etapa)}. Esta cotización abre un lead nuevo para no mezclar los viajes.` } });
  await registrarEnBitacora({ accion: "creó", entidad: "lead", referencia: nuevo.contacto.nombre, resumen: `Lead nuevo de ${nuevo.contacto.nombre}: cotización nueva y su lead anterior estaba ${etiquetaEtapa(op.etapa)}` });
  return { id: nuevo.id, nuevo: true };
}

/**
 * La liga de pago de una cotización o reserva mueve su lead (reglas del
 * prompt, revisión del 4 nov 2026): mandarla → En seguimiento; pagarla →
 * Anticipo pagado (si era de una cotización; la de una reserva ya entra por
 * `registrarCobro`). Nunca baja; un perdido que paga vuelve. No lanza.
 */
export async function leadPorLigaDePago(link: { cotizacionId: string | null; reservaId: string | null; titulo?: string | null }, evento: "creada" | "pagada", quien: string): Promise<void> {
  try {
    let opId: string | null = null;
    if (link.cotizacionId) {
      const q = await prisma.tourQuote.findUnique({ where: { id: link.cotizacionId }, select: { oportunidadId: true } });
      opId = q?.oportunidadId ?? (await leadDesdeCotizacion(link.cotizacionId, "cotizado", quien, "liga de pago de la cotización"));
    } else if (link.reservaId) {
      opId = (await prisma.tourBooking.findUnique({ where: { id: link.reservaId }, select: { oportunidadId: true } }))?.oportunidadId ?? null;
    }
    if (!opId) return;
    const op = await prisma.oportunidad.findUnique({ where: { id: opId } });
    if (!op) return;
    if (evento === "pagada" && !link.cotizacionId) return; // la de reserva: registrarCobro ya lo movió
    const objetivo: Etapa = evento === "creada" ? "seguimiento" : "anticipo";
    const etapa = evento === "pagada" && op.etapa === "perdido" ? objetivo : subirA(op.etapa as Etapa, objetivo);
    if (etapa === op.etapa) return;
    await prisma.oportunidad.update({ where: { id: op.id }, data: { etapa, ...(op.etapa === "perdido" ? { motivoPerdida: null } : {}) } });
    await registrarEtapa(op.id, op.etapa, etapa, `Regla: liga de pago ${evento === "creada" ? "enviada" : "pagada"}${link.titulo ? ` (${link.titulo.slice(0, 60)})` : ""}`, "regla");
  } catch (e) {
    console.error("leadPorLigaDePago:", (e as Error)?.message);
  }
}

const ETAPAS_PIPELINE_ABIERTAS = ["nuevo", "calificado", "cotizado", "seguimiento", "anticipo", "confirmado"];

export { estaAbierta, esEtapa };

// ── Cuando se quita lo que sostenía al lead (3 nov 2026, pregunta de Manolo:
// «¿qué pasa si elimino una cotización? ¿se pasa sola a perdida?») ──────────
// - Eliminar una cotización: si el lead SOLO existía por ella (sin otras
//   cotizaciones, reservas, notas ni seguimientos, y no nació en WhatsApp ni
//   tiene chat ni origen web: 5 nov 2026), el lead se borra. Si tiene más, se
//   queda, se anota y sus datos pasan a lo que sigue vivo.
// - Cancelar o reactivar una de varias reservas: el lead se pone al día con lo
//   que sigue vivo (`recalcularLead`, 5 nov 2026).
// - Marcarla vencida NO lo pierde: es justo cuando hay que darle seguimiento
//   (la ficha y la tarjeta la enseñan en rojo).
// - Cancelar su única reserva viva: el lead pasa a Perdido con el motivo de la
//   cancelación. «Capturada dos veces o por error» no es venta perdida: solo se anota.
// - Reactivar esa reserva: el lead vuelve a la etapa que dice lo cobrado.

/** Tras eliminar (de verdad) una cotización enlazada a un lead. Devuelve si el lead se borró. */
export async function leadTrasBorrarCotizacion(oportunidadId: string, folio: string, quien: string): Promise<"borrado" | "actualizado" | null> {
  try {
    const op = await prisma.oportunidad.findUnique({
      where: { id: oportunidadId },
      include: { _count: { select: { notasLista: true, tareas: true } }, historial: { where: { origen: "persona" }, select: { id: true } } },
    });
    if (!op) return null;
    const [cots, ress, chats] = await Promise.all([
      prisma.tourQuote.findMany({ where: { oportunidadId } }),
      prisma.tourBooking.findMany({ where: { oportunidadId } }),
      prisma.conversacion.count({ where: { contactoId: op.contactoId } }),
    ]);
    // 🔴 Un lead que nació en WhatsApp, que trae su origen web o cuyo contacto
    // tiene chat NO existía «solo por la cotización» (5 nov 2026): borrarlo
    // dejaba el chat apuntando a un contacto borrado y desde ahí cada mensaje
    // fallaba al crear su lead. Se queda, regresa de etapa y se anota.
    const protegido = op.creadoPor === "WhatsApp" || !!op.origenWeb || chats > 0;
    const soloEra = !protegido && !cots.length && !ress.length && !op._count.notasLista && !op._count.tareas && !op.historial.length;
    if (soloEra) {
      await prisma.oportunidad.delete({ where: { id: oportunidadId } });
      // El contacto se va con él si no tiene otro lead ni ningún chat.
      const otros = await prisma.oportunidad.count({ where: { contactoId: op.contactoId } });
      const conChat = await prisma.conversacion.count({ where: { contactoId: op.contactoId } });
      if (!otros && !conChat) await prisma.contacto.delete({ where: { id: op.contactoId } }).catch(() => null);
      await registrarEnBitacora({ accion: "eliminó", entidad: "lead", referencia: folio, resumen: `Se eliminó la cotización ${folio} y con ella su lead (no tenía nada más)` });
      return "borrado";
    }
    // Lo que sigue vivo manda: la reserva viva, si no la cotización más reciente.
    const viva = ress.filter(r => r.status !== "cancelled").sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
    const q = cotizacionVigente(cots);
    const fuente = viva ?? q;
    const data: Record<string, unknown> = fuente
      ? { monto: fuente.totalAmount || null, fechaViaje: ymd(fuente.tourDate) ?? op.fechaViaje, tours: toursDe(fuente).filter(t => SLUGS.has(t)).length ? toursDe(fuente).filter(t => SLUGS.has(t)) : op.tours }
      : { monto: null };
    // En Cotizado sin ninguna cotización ni reserva ya no está cotizado.
    const baja = !fuente && op.etapa === "cotizado";
    if (baja) data.etapa = "calificado";
    await prisma.oportunidad.update({ where: { id: oportunidadId }, data });
    if (baja) await registrarEtapa(oportunidadId, op.etapa, "calificado", `Regla: se eliminó la cotización ${folio}`, "regla");
    await prisma.notaOportunidad.create({ data: { oportunidadId, autor: quien, texto: `Se eliminó la cotización ${folio}.` } });
    return "actualizado";
  } catch (e) {
    console.error("leadTrasBorrarCotizacion:", (e as Error)?.message);
    return null;
  }
}

/** Tras cancelar una reserva enlazada: si era su única reserva viva, el lead se pierde con ese motivo. */
export async function leadTrasCancelarReserva(bookingId: string, quien: string): Promise<void> {
  try {
    const r = await prisma.tourBooking.findUnique({ where: { id: bookingId } });
    if (!r?.oportunidadId) return;
    const op = await prisma.oportunidad.findUnique({ where: { id: r.oportunidadId } });
    if (!op || op.etapa === "perdido") return;
    const vivas = await prisma.tourBooking.count({ where: { oportunidadId: op.id, status: { not: "cancelled" } } });
    const motivo = etiquetaCancelacion(r.motivoCancelacion) || "sin motivo";
    if (vivas > 0 || String(r.motivoCancelacion ?? "").startsWith("duplicada")) {
      await prisma.notaOportunidad.create({ data: { oportunidadId: op.id, autor: quien, texto: `Se canceló la reserva ${r.confirmationNumber} (${motivo}).${vivas > 0 ? " Sigue con otra reserva viva." : ""}` } });
      // Lo que sigue vivo manda (5 nov 2026): antes solo se anotaba y el lead
      // seguía con la etapa y el monto de la reserva cancelada.
      await recalcularLead(op.id, `se canceló la reserva ${r.confirmationNumber}`);
      return;
    }
    const clave = String(r.motivoCancelacion ?? "").split(":")[0];
    const motivoPerdida = clave === "cupo" ? `sin-disponibilidad: reserva ${r.confirmationNumber} cancelada` : `otro: reserva ${r.confirmationNumber} cancelada — ${motivo}`;
    await prisma.oportunidad.update({ where: { id: op.id }, data: { etapa: "perdido", motivoPerdida } });
    await registrarEtapa(op.id, op.etapa, "perdido", `Regla: se canceló la reserva ${r.confirmationNumber} (${motivo})`, "regla");
  } catch (e) {
    console.error("leadTrasCancelarReserva:", (e as Error)?.message);
  }
}

/**
 * Tras reactivar una reserva cancelada, el lead se pone al día con TODAS sus
 * reservas vivas (5 nov 2026; antes solo se movía si estaba perdido y solo
 * contaba esa reserva). Si se perdió por ella, vuelve; si alguien lo marcó
 * perdido por otra razón, se queda perdido.
 */
export async function leadTrasReactivarReserva(bookingId: string): Promise<void> {
  try {
    const r = await prisma.tourBooking.findUnique({ where: { id: bookingId } });
    if (!r?.oportunidadId) return;
    const op = await prisma.oportunidad.findUnique({ where: { id: r.oportunidadId } });
    if (!op) return;
    const porEsta = op.etapa === "perdido" && String(op.motivoPerdida ?? "").includes(r.confirmationNumber);
    await recalcularLead(op.id, `se reactivó la reserva ${r.confirmationNumber}`, { revivir: porEsta });
  } catch (e) {
    console.error("leadTrasReactivarReserva:", (e as Error)?.message);
  }
}

// ── Viaje ya pasado → Operado (regla del prompt, 3 nov 2026) ───────────────
// Pregunta de Manolo: «¿qué pasa con los que ya están confirmados y pasa la
// fecha del tour?». Al día siguiente del último tour, un lead con Anticipo
// pagado o Confirmado pasa solo a Operado y sale del tablero. Si quedó saldo
// sin registrar, se anota en su historial para cobrarlo o registrarlo. Se
// revisa al abrir Leads o una ficha: sin cron y sin que nadie lo empuje.

/** Pasa a Operado los leads cuyo viaje ya pasó. Con `soloId`, solo ese. Devuelve cuántos movió. */
export async function operarViajesPasados(hoy: string = hoyMX(), soloId?: string): Promise<number> {
  try {
    const ops = await prisma.oportunidad.findMany({
      where: { etapa: { in: ETAPAS_QUE_SE_OPERAN }, ...(soloId ? { id: soloId } : {}) },
      select: { id: true, etapa: true, fechaViaje: true },
    });
    if (!ops.length) return 0;
    const [ress, cots] = await Promise.all([
      prisma.tourBooking.findMany({
        where: { oportunidadId: { in: ops.map(o => o.id) }, status: { not: "cancelled" } },
        select: { oportunidadId: true, confirmationNumber: true, tourDate: true, tourSlug: true, lineItems: true, totalAmount: true, depositoPagado: true, stripePaymentIntentId: true, createdAt: true },
      }),
      // Una venta nueva cotizada sobre este lead (otro viaje) también cuenta (5 nov 2026):
      // antes el lead pasaba a Operado por la reserva vieja y la venta nueva se perdía ahí.
      prisma.tourQuote.findMany({
        where: { oportunidadId: { in: ops.map(o => o.id) }, status: { in: ["borrador", "enviada"] } },
        select: { oportunidadId: true, status: true, tourDate: true, lineItems: true, packageItems: true, createdAt: true },
      }),
    ]);
    let movidos = 0;
    for (const op of ops) {
      const suyas = ress.filter(r => r.oportunidadId === op.id);
      const deReservas = suyas.flatMap(r => { const f = lineasDe(r as never).map(l => l.tourDate); return f.length ? f : [r.tourDate]; });
      const deCotizaciones = cots.filter(q => q.oportunidadId === op.id && cotizacionViva(q, hoy))
        .flatMap(q => { const f = lineasDe(q as never).map(l => l.tourDate).filter((x): x is string => !!x); return f.length ? f : [q.tourDate]; });
      const { paso, ultima } = viajeYaPaso(fechasDelViaje(deReservas, deCotizaciones, op.fechaViaje), hoy);
      if (!paso || !ultima) continue;
      // Solo si nadie la movió mientras tanto.
      const r = await prisma.oportunidad.updateMany({ where: { id: op.id, etapa: op.etapa }, data: { etapa: "operado" } });
      if (!r.count) continue;
      const dia = new Date(`${ultima}T12:00:00`).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" }).replace(/\./g, "");
      await registrarEtapa(op.id, op.etapa, "operado", `Regla: el viaje ya pasó (${dia})`, "regla");
      const falta = suyas.reduce((t, x) => t + Math.max(0, x.totalAmount - montoCobrado(x)), 0);
      if (falta > 0) {
        await prisma.notaOportunidad.create({ data: { oportunidadId: op.id, autor: "Panel", texto: `El viaje ya se operó y hay ${pesosCorto(falta)} sin registrar como cobrados. Si ya se cobró, regístralo en Reservas; si no, hay que cobrarlo.` } });
      }
      movidos++;
    }
    return movidos;
  } catch (e) {
    console.error("operarViajesPasados:", (e as Error)?.message);
    return 0;
  }
}

// ── Leads de la web que no compran (5 nov 2026) ─────────────────────────────
// Quien guarda una cotización en el carrito, pide su recomendación o deja su
// nombre y su WhatsApp en el checkout y no paga se quedaba fuera del CRM: solo
// le llegaban los correos automáticos y nadie le daba seguimiento.

export interface LeadWeb {
  nombre?: string | null; telefono?: string | null; correo?: string | null; idioma?: string | null;
  tours?: string[]; fechaViaje?: string | null; pax?: number | null; monto?: number | null;
  /** Qué hizo en el sitio: es la nota del lead. */
  que: string;
}

/**
 * La persona por teléfono o correo; si no existe, se crea. A diferencia de
 * `contactoPara`, a un contacto que ya existía no se le cambia nada: lo
 * escribió un visitante del sitio y puede venir con un dedazo.
 */
async function contactoDeLaWeb(d: { nombre: string | null; telefono: string | null; correo: string | null; idioma: string | null }) {
  const buscar = async () => (d.telefono ? await prisma.contacto.findUnique({ where: { telefono: d.telefono } }) : null)
    ?? (d.correo ? await prisma.contacto.findFirst({ where: { correo: d.correo, ...(d.telefono ? { telefono: null } : {}) }, orderBy: { createdAt: "asc" } }) : null);
  const existente = await buscar();
  if (existente) return existente;
  try {
    return await prisma.contacto.create({ data: { nombre: d.nombre || d.correo || "Sin nombre (web)", telefono: d.telefono, correo: d.correo, idioma: d.idioma === "en" ? "en" : "es" } });
  } catch (e) {
    // Otra petición lo creó al mismo tiempo (el teléfono es único).
    if ((e as { code?: string })?.code === "P2002") { const otro = await buscar(); if (otro) return otro; }
    throw e;
  }
}

/**
 * «¿Consulta nueva?» para Operación cuando alguien con su lead Perdido hace poco
 * vuelve al sitio y deja sus datos (revisión del 5 nov 2026). Como el de la
 * Bandeja: uno a la vez y como mucho uno al día; se cierra solo en cuanto esa
 * persona tiene un lead abierto (p. ej. porque pagó y el perdido revivió).
 */
async function consultaNuevaPorLaWeb(lead: { id: string; etapa: string; contacto: { nombre: string } }) {
  const pendiente = await prisma.tarea.findFirst({ where: { oportunidadId: lead.id, regla: "consulta-nueva", estado: "pendiente" }, select: { id: true } });
  if (pendiente) return;
  const hoy = hoyMX();
  try {
    await prisma.tarea.create({
      data: {
        titulo: tituloConsultaNueva(lead.contacto.nombre, etiquetaEtapa(lead.etapa), "web"), responsable: RESPONSABLE_OPERACION, vence: hoy,
        oportunidadId: lead.id, origen: "regla", regla: "consulta-nueva", claveRegla: `consulta-nueva:${lead.id}:${hoy}`, creadaPor: "Regla automática",
      },
    });
  } catch (e) {
    if ((e as { code?: string })?.code === "P2002") return; // ya se avisó hoy
    throw e;
  }
  await sincronizarProximoPaso(lead.id);
}

/**
 * Un lead de la web que todavía no compra entra al CRM como Nuevo (Calificado
 * si ya trae tour, fecha y personas: la regla de siempre), con canal «web» y a
 * cargo de Operación. Si esa persona ya tiene un lead abierto no se duplica:
 * solo se le anota lo que hizo (la misma nota, una vez al día). Si su lead se
 * perdió hace menos de 14 días tampoco: se anota ahí, Operación recibe el
 * «¿Consulta nueva?» y, si paga en línea, su reserva revive ese lead
 * (revisión del 5 nov 2026: el guardado del pago abría un lead nuevo y el
 * perdido se quedaba perdido junto a un duplicado). Cuando pague, su reserva
 * encuentra este lead. No lanza: nunca frena al cliente.
 */
export async function leadDesdeWeb(d: LeadWeb): Promise<{ id: string; nuevo: boolean } | null> {
  try {
    const telefono = normalizarTelefono(d.telefono);
    const correo = d.correo?.trim().toLowerCase() || null;
    if (!telefono && !correo) return null;
    const contacto = await contactoDeLaWeb({ nombre: texto(d.nombre, 120), telefono, correo, idioma: d.idioma ?? null });
    const nota = d.que.trim().slice(0, 2000);
    const abierta = await prisma.oportunidad.findFirst({ where: { contactoId: contacto.id, etapa: { in: ETAPAS_PIPELINE_ABIERTAS } }, orderBy: { createdAt: "desc" } });
    const perdido = abierta ? null : await leadCerradoReciente(contacto.id, ["perdido"]);
    const suyo = abierta ?? perdido;
    if (suyo) {
      const yaAnotada = await prisma.notaOportunidad.findFirst({ where: { oportunidadId: suyo.id, texto: nota, createdAt: { gte: new Date(Date.now() - 86_400_000) } }, select: { id: true } });
      if (!yaAnotada) await prisma.notaOportunidad.create({ data: { oportunidadId: suyo.id, autor: "Web", texto: nota } });
      if (perdido) await consultaNuevaPorLaWeb(perdido);
      return { id: suyo.id, nuevo: false };
    }
    const datos = { tours: tours(d.tours), fechaViaje: ymd(d.fechaViaje), pax: entero(d.pax, 200) };
    const etapa = etapaPorReglas("nuevo", datos);
    const op = await prisma.oportunidad.create({
      data: { contactoId: contacto.id, etapa, canal: "web", ...datos, monto: entero(d.monto, 10_000_000), responsable: RESPONSABLE_OPERACION, creadoPor: "Web" },
    });
    await registrarEtapa(op.id, null, "nuevo", "Regla: dejó sus datos en la web", "regla");
    if (etapa !== "nuevo") await registrarEtapa(op.id, "nuevo", etapa, "Regla: tour, fecha y personas", "regla");
    await prisma.notaOportunidad.create({ data: { oportunidadId: op.id, autor: "Web", texto: nota } });
    await registrarEnBitacora({ accion: "creó", entidad: "lead", referencia: contacto.nombre, resumen: `Lead nuevo de la web: ${contacto.nombre} (${etiquetaEtapa(etapa)})`, actor: SISTEMA });
    return { id: op.id, nuevo: true };
  } catch (e) {
    console.error("leadDesdeWeb:", (e as Error)?.message);
    return null;
  }
}
