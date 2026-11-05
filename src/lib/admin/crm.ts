// Las reglas del CRM (Fase 2 del rediseño, 3 nov 2026). Puro: lo usan las
// APIs, las pantallas, el sembrado y las pruebas. Las etapas y los motivos
// de pérdida son los del prompt; no se cambian sin anotarlo aquí.

export const ETAPAS = [
  { clave: "nuevo",       etiqueta: "Nuevo" },
  { clave: "calificado",  etiqueta: "Calificado" },
  { clave: "cotizado",    etiqueta: "Cotizado" },
  { clave: "seguimiento", etiqueta: "En seguimiento" },
  { clave: "anticipo",    etiqueta: "Anticipo pagado" },
  { clave: "confirmado",  etiqueta: "Confirmado" },
  { clave: "operado",     etiqueta: "Operado" },
  { clave: "perdido",     etiqueta: "Perdido" },
] as const;

export type Etapa = (typeof ETAPAS)[number]["clave"];

/** Las columnas del pipeline. Operado y Perdido van en vistas aparte. */
export const ETAPAS_PIPELINE: Etapa[] = ["nuevo", "calificado", "cotizado", "seguimiento", "anticipo", "confirmado"];

export const esEtapa = (v: unknown): v is Etapa => ETAPAS.some(e => e.clave === v);
export const etiquetaEtapa = (e: string) => ETAPAS.find(x => x.clave === e)?.etiqueta ?? e;
/** El orden de las etapas (perdido al final, fuera del camino). */
export const ordenEtapa = (e: string) => ETAPAS.findIndex(x => x.clave === e);

/** Sube a `objetivo` solo si está antes en el camino; nunca baja ni revive una perdida. */
export function subirA(actual: Etapa, objetivo: Etapa): Etapa {
  if (actual === "perdido" || actual === "operado") return actual;
  return ordenEtapa(objetivo) > ordenEtapa(actual) ? objetivo : actual;
}

/** Abierta = todavía se puede ganar o perder. */
export const estaAbierta = (e: string) => (ETAPAS_PIPELINE as string[]).includes(e);

export const MOTIVOS_PERDIDA = [
  { clave: "precio",            etiqueta: "Precio" },
  { clave: "no-contesto",       etiqueta: "No contestó tras cotizar" },
  { clave: "sin-disponibilidad", etiqueta: "Fecha sin disponibilidad" },
  { clave: "otro-operador",     etiqueta: "Se fue con otro operador" },
  { clave: "otro",              etiqueta: "Otro (explícalo)" },
] as const;
export type MotivoPerdida = (typeof MOTIVOS_PERDIDA)[number]["clave"];

/** Lo que se guarda en `motivoPerdida`; null si no sirve («otro» exige detalle). */
export function motivoPerdidaParaGuardar(clave: unknown, detalle: unknown): string | null {
  if (!MOTIVOS_PERDIDA.some(m => m.clave === clave)) return null;
  const d = String(detalle ?? "").trim().slice(0, 200);
  if (clave === "otro" && !d) return null;
  return d ? `${clave}: ${d}` : String(clave);
}
export function claveMotivo(guardado: string | null | undefined): MotivoPerdida | null {
  const c = String(guardado ?? "").split(":")[0].trim();
  return MOTIVOS_PERDIDA.some(m => m.clave === c) ? (c as MotivoPerdida) : null;
}
export function etiquetaMotivoPerdida(guardado: string | null | undefined): string {
  if (!guardado) return "";
  const [c, ...resto] = guardado.split(":");
  const m = MOTIVOS_PERDIDA.find(x => x.clave === c.trim());
  const base = m ? m.etiqueta.replace(" (explícalo)", "") : c;
  const det = resto.join(":").trim();
  return det ? `${base}: ${det}` : base;
}

export const PERFILES = [
  { clave: "pareja", etiqueta: "Pareja" }, { clave: "familia", etiqueta: "Familia" }, { clave: "amigos", etiqueta: "Amigos" },
  { clave: "empresa", etiqueta: "Empresa o escuela" }, { clave: "solo", etiqueta: "Viaja solo" },
] as const;

/**
 * Un teléfono a E.164 de México cuando se puede (+52 y 10 dígitos). Quita el
 * «1» viejo de celular (+521…). Con «+» y otro país, se respeta. Null si no
 * parece teléfono.
 */
export function normalizarTelefono(v: unknown): string | null {
  const crudo = String(v ?? "").trim();
  if (!crudo) return null;
  const conMas = crudo.startsWith("+") || crudo.startsWith("00");
  let d = crudo.replace(/\D/g, "");
  if (crudo.startsWith("00")) d = d.slice(2);
  if (d.length === 10) return `+52${d}`;
  if (d.length === 12 && d.startsWith("52")) return `+${d}`;
  if (d.length === 13 && d.startsWith("521")) return `+52${d.slice(3)}`;
  if (conMas && d.length >= 8 && d.length <= 15) return `+${d}`;
  return null;
}

/** Para enlazar a WhatsApp: solo dígitos. */
export const waDe = (telefono: string | null | undefined) => (telefono ? telefono.replace(/\D/g, "") : "");

export interface DatosCalificacion { tours: string[]; fechaViaje: string | null; pax: number | null }

/** «Se capturan fecha, pax y tour → Calificado» (regla del prompt). */
export const estaCalificada = (o: DatosCalificacion) => o.tours.length > 0 && !!o.fechaViaje && (o.pax ?? 0) > 0;

/**
 * La etapa que toca por regla tras editar los datos. Solo SUBE de Nuevo a
 * Calificado: nunca baja una etapa ni salta las que dependen de un hecho
 * (cotización enviada, pago), que llegan en el PR 2.2.
 */
export function etapaPorReglas(actual: Etapa, o: DatosCalificacion): Etapa {
  return actual === "nuevo" && estaCalificada(o) ? "calificado" : actual;
}

/**
 * La etapa que pide una reserva enlazada, según lo cobrado (reglas del prompt:
 * «pago del anticipo → Anticipo pagado»). Sin cobro: En seguimiento; con parte
 * cobrada: Anticipo pagado; liquidada: Confirmado.
 */
export function etapaPorCobro(cobrado: number, total: number): Etapa {
  if (cobrado <= 0) return "seguimiento";
  return total > 0 && cobrado >= total ? "confirmado" : "anticipo";
}

/** La etapa siguiente en el camino (null en Confirmado, Operado o Perdido). */
export function etapaSiguiente(actual: string): Etapa | null {
  const i = ETAPAS_PIPELINE.indexOf(actual as Etapa);
  return i >= 0 && i < ETAPAS_PIPELINE.length - 1 ? ETAPAS_PIPELINE[i + 1] : actual === "confirmado" ? "operado" : null;
}

/**
 * ¿Ya pasó el viaje? El último día de tour (de todas sus reservas vivas, o la
 * fecha del lead si no tiene reserva) es anterior a hoy. Con eso un lead con
 * Anticipo pagado o Confirmado pasa solo a Operado al día siguiente del tour.
 */
export function viajeYaPaso(fechas: (string | null | undefined)[], hoy: string): { paso: boolean; ultima: string | null } {
  const validas = fechas.filter((f): f is string => typeof f === "string" && /^\d{4}-\d{2}-\d{2}$/.test(f)).sort();
  const ultima = validas[validas.length - 1] ?? null;
  return { paso: !!ultima && ultima < hoy, ultima };
}

/** Etapas que pasan solas a Operado cuando el viaje ya pasó. Las anteriores no: sin pago registrado hay que revisarlas. */
export const ETAPAS_QUE_SE_OPERAN: Etapa[] = ["anticipo", "confirmado"];

// ── El lead se mueve con los hechos (lote 2 de la auditoría, 5 nov 2026) ────

/** Entre estas etapas el lead sube o baja según el dinero de sus reservas. */
export const ETAPAS_DE_DINERO: Etapa[] = ["seguimiento", "anticipo", "confirmado"];

/** Lo que importa de una reserva VIVA (no cancelada) del lead. */
export interface ReservaDelLead { cobrado: number; total: number; ultimoDia: string | null }

/**
 * La etapa que dicen las reservas vivas del lead, sin importar cuál reserva
 * disparó el cambio (5 nov 2026). Antes cada camino hacía su cuenta y un pago
 * web, una cancelación o un cobro anulado dejaban el lead donde estaba.
 *  - Sin reservas vivas, el dinero no dice nada: se queda (su etapa pudo venir de una liga).
 *  - En Seguimiento, Anticipo o Confirmado manda lo cobrado: sube o baja.
 *  - Antes (Nuevo, Calificado, Cotizado) solo sube.
 *  - Perdido vuelve solo con un hecho nuevo (`revivir`: reserva nueva, cobro, liga pagada).
 *  - Operado vuelve con un hecho nuevo y un viaje que todavía no pasa.
 */
export function etapaPorHechos(h: { etapa: Etapa; reservas: ReservaDelLead[]; hoy: string; revivir: boolean }): Etapa {
  if (!h.reservas.length) return h.etapa;
  const cobrado = h.reservas.reduce((t, r) => t + r.cobrado, 0);
  const total = h.reservas.reduce((t, r) => t + r.total, 0);
  const porCobro = etapaPorCobro(cobrado, total);
  if (h.etapa === "perdido") return h.revivir ? porCobro : "perdido";
  if (h.etapa === "operado") return h.revivir && h.reservas.some(r => !!r.ultimoDia && r.ultimoDia >= h.hoy) ? porCobro : "operado";
  if (ETAPAS_DE_DINERO.includes(h.etapa)) return porCobro;
  return subirA(h.etapa, porCobro);
}

/**
 * Lo que vale el lead: la suma de sus reservas vivas; sin reservas, el total de
 * su cotización vigente; sin ninguna, lo que ya tenía (p. ej. un estimado a mano).
 */
export function montoPorHechos(h: { reservas: ReservaDelLead[]; cotizacionVigente: number | null; actual: number | null }): number | null {
  if (h.reservas.length) {
    const total = h.reservas.reduce((t, r) => t + r.total, 0);
    return total > 0 ? total : h.actual;
  }
  return h.cotizacionVigente && h.cotizacionVigente > 0 ? h.cotizacionVigente : h.actual;
}

/**
 * El canal del lead tras enlazarle una reserva (5 nov 2026). El canal que una
 * persona eligió al capturarla manda, salvo dos casos que borraban lo que ya se
 * sabía: «web» en una reserva dice cómo PAGÓ (en línea), no por dónde llegó; y
 * «WhatsApp» no le quita el detalle a «WhatsApp desde un botón del sitio».
 */
export function canalTrasReserva(canalLead: string, origenReserva: string | null | undefined): string {
  const o = String(origenReserva ?? "").trim();
  if (!o || o === "por_confirmar" || o === canalLead) return canalLead;
  if (canalLead === "por_confirmar") return o;
  if (o === "web") return canalLead;
  if (canalLead === "whatsapp_sitio" && o === "whatsapp") return canalLead;
  return o;
}

/** Cuántos días después de cerrarse (Operado o Perdido) un mensaje ya no se toma como consulta nueva. */
export const DIAS_CIERRE_RECIENTE = 14;

/** ¿El lead se cerró hace menos de `dias`? */
export function cerradoHaceMenosDe(cerradoEn: Date | string | null | undefined, ahora: Date, dias: number = DIAS_CIERRE_RECIENTE): boolean {
  if (!cerradoEn) return false;
  const t = new Date(cerradoEn).getTime();
  return Number.isFinite(t) && ahora.getTime() - t < dias * 86_400_000;
}

/**
 * Las fechas que dicen si el viaje del lead ya pasó: las de sus reservas vivas
 * y las de sus cotizaciones vivas (una venta nueva cotizada sobre un lead
 * Confirmado ya no lo deja operar antes de tiempo, 5 nov 2026). Sin ninguna, la del lead.
 */
export function fechasDelViaje(reservas: (string | null | undefined)[], cotizacionesVivas: (string | null | undefined)[], fechaLead: string | null): (string | null | undefined)[] {
  // Solo cuentan las cotizaciones con fecha (revisión del 5 nov 2026): una sin
  // fecha dejaba al lead sin ninguna y ya nunca pasaba a Operado.
  const deCotizaciones = cotizacionesVivas.filter(f => typeof f === "string" && /^\d{4}-\d{2}-\d{2}$/.test(f));
  return reservas.length || deCotizaciones.length ? [...reservas, ...deCotizaciones] : [fechaLead];
}

/** Lo que trae una captura de «Nuevo lead». */
export interface DatosCaptura {
  tours: string[]; fechaViaje: string | null; pax: number | null; perfil: string | null;
  quiereHospedaje: boolean | null; monto: number | null; canal: string | null;
}

/**
 * «Nuevo lead» de alguien que ya tiene uno abierto (5 nov 2026): antes se
 * tiraba lo capturado. Ahora se completa lo que le FALTA al lead (lo que ya
 * tenía no se pisa) y la regla Nuevo → Calificado se vuelve a aplicar.
 * Devuelve qué cambia y, en palabras, qué se agregó.
 */
export function completarLead(actual: DatosCaptura & { etapa: Etapa }, llega: DatosCaptura): { data: Partial<DatosCaptura> & { etapa?: Etapa }; agregado: string[] } {
  const data: Partial<DatosCaptura> & { etapa?: Etapa } = {};
  const agregado: string[] = [];
  if (!actual.tours.length && llega.tours.length) { data.tours = llega.tours; agregado.push("tours"); }
  if (!actual.fechaViaje && llega.fechaViaje) { data.fechaViaje = llega.fechaViaje; agregado.push("fecha del viaje"); }
  if (!actual.pax && llega.pax) { data.pax = llega.pax; agregado.push("personas"); }
  if (!actual.perfil && llega.perfil) { data.perfil = llega.perfil; agregado.push("perfil"); }
  // La casilla sin marcar no dice «no quiere»: solo un sí completa.
  if (actual.quiereHospedaje == null && llega.quiereHospedaje === true) { data.quiereHospedaje = true; agregado.push("hospedaje"); }
  if (!actual.monto && llega.monto) { data.monto = llega.monto; agregado.push("monto estimado"); }
  if (actual.canal === "por_confirmar" && llega.canal && llega.canal !== "por_confirmar") { data.canal = llega.canal; agregado.push("canal"); }
  const etapa = etapaPorReglas(actual.etapa, { tours: data.tours ?? actual.tours, fechaViaje: data.fechaViaje ?? actual.fechaViaje, pax: data.pax ?? actual.pax });
  if (etapa !== actual.etapa) data.etapa = etapa;
  return { data, agregado };
}

/** «a», «a y b», «a, b y c». */
export const enLista = (xs: string[]) => xs.length <= 1 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} y ${xs[xs.length - 1]}`;

/** Lo que la pantalla dice cuando «Nuevo lead» cae en un lead que ya estaba abierto (5 nov 2026). */
export function avisoLeadExistente(nombre: string, etapa: string, agregado: string[]): string {
  const base = `${nombre} ya tenía un lead abierto (${etiquetaEtapa(etapa)}): no se creó otro`;
  return agregado.length ? `${base}; se le agregó ${enLista(agregado)}.` : `${base} y no había nada nuevo que agregarle.`;
}

/**
 * Qué puede poner una cotización en su lead (5 nov 2026): lo vivo manda.
 *  - Con reservas vivas, el monto, la fecha, los tours y las personas salen de ellas: la cotización no toca nada.
 *  - Con OTRA cotización viva, el monto es el de la vigente (la más reciente).
 *    Al EDITAR la vigente, sus datos pasan al lead (regla de Manolo del 3 nov);
 *    al editar una opción más vieja, solo se llena lo vacío (revisión del 5 nov
 *    2026: antes ni la vigente los pasaba si quedaba un borrador viejo, que no vence).
 *  - Si es la única, como antes: su total y, al editarla, sus datos.
 */
export function loQueMandaLaCotizacion(h: { reservasVivas: number; otrasCotizacionesVivas: number; sincronizar: boolean; esLaVigente?: boolean }): { monto: "ninguno" | "esta" | "vigente"; pisar: boolean; llenarVacios: boolean } {
  if (h.reservasVivas > 0) return { monto: "ninguno", pisar: false, llenarVacios: false };
  if (h.otrasCotizacionesVivas > 0) return { monto: "vigente", pisar: h.sincronizar && h.esLaVigente === true, llenarVacios: true };
  return { monto: "esta", pisar: h.sincronizar, llenarVacios: true };
}

/** «Vacío» para juntarlo con otro del mismo contacto: sin cotizaciones ni reservas, y todavía al principio. */
export function leadVacio(l: { etapa: string; cotizaciones: number; reservas: number }): boolean {
  return l.cotizaciones === 0 && l.reservas === 0 && (l.etapa === "nuevo" || l.etapa === "calificado");
}

export type ValidacionCambio = { ok: true } | { ok: false; error: string };

/** Mover de etapa a mano: cualquiera puede, pero Perdido exige motivo. */
export function validarCambioEtapa(hacia: unknown, motivo: string | null): ValidacionCambio {
  if (!esEtapa(hacia)) return { ok: false, error: "Esa etapa no existe." };
  if (hacia === "perdido" && !motivo) return { ok: false, error: "Para marcarlo perdido hay que decir el motivo." };
  return { ok: true };
}

export type EstadoFecha = "vencido" | "hoy" | "proximo" | "sin-fecha";

/** Un próximo paso o una tarea contra hoy (YYYY-MM-DD). */
export function estadoFecha(fecha: string | null | undefined, hoy: string): EstadoFecha {
  if (!fecha) return "sin-fecha";
  if (fecha < hoy) return "vencido";
  if (fecha === hoy) return "hoy";
  return "proximo";
}

export interface TareaLigera { id: string; responsable: string; vence: string; estado: string; hora?: string | null }

/** Seguimientos: vencidas, de hoy y próximas, por responsable (las hechas fuera). */
export function agruparTareas<T extends TareaLigera>(tareas: T[], hoy: string) {
  const pendientes = tareas.filter(t => t.estado !== "hecha").sort(ordenTareas);
  const porResponsable = new Map<string, { vencidas: T[]; hoy: T[]; proximas: T[] }>();
  for (const t of pendientes) {
    const g = porResponsable.get(t.responsable) ?? { vencidas: [], hoy: [], proximas: [] };
    const e = estadoFecha(t.vence, hoy);
    (e === "vencido" ? g.vencidas : e === "hoy" ? g.hoy : g.proximas).push(t);
    porResponsable.set(t.responsable, g);
  }
  return Array.from(porResponsable.entries())
    .map(([responsable, g]) => ({ responsable, ...g }))
    .sort((a, b) => b.vencidas.length - a.vencidas.length || a.responsable.localeCompare(b.responsable));
}

export type Plazo = "vencidos" | "hoy" | "manana" | "semana" | "despues";
export const PLAZOS: { clave: Plazo; titulo: string }[] = [
  { clave: "vencidos", titulo: "Vencidos" }, { clave: "hoy", titulo: "Hoy" }, { clave: "manana", titulo: "Mañana" },
  { clave: "semana", titulo: "Esta semana" }, { clave: "despues", titulo: "Más adelante" },
];

/**
 * Los seguimientos pendientes por PRIORIDAD de plazo (Manolo, 4 nov 2026): lo
 * vencido arriba (lo más viejo primero), luego hoy (por hora), mañana, los
 * próximos 7 días y lo demás. Cada sección ordenada por día y hora.
 */
export function agruparPorPlazo<T extends TareaLigera>(tareas: T[], hoy: string): { clave: Plazo; titulo: string; tareas: T[] }[] {
  const manana = sumarDias(hoy, 1), semana = sumarDias(hoy, 7);
  const plazoDe = (v: string): Plazo => v < hoy ? "vencidos" : v === hoy ? "hoy" : v === manana ? "manana" : v <= semana ? "semana" : "despues";
  const pendientes = tareas.filter(t => t.estado !== "hecha").sort(ordenTareas);
  return PLAZOS.map(p => ({ ...p, tareas: pendientes.filter(t => plazoDe(t.vence) === p.clave) })).filter(g => g.tareas.length > 0);
}

function sumarDias(ymd: string, n: number): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Por fecha y, el mismo día, por hora (las de sin hora al final del día). */
export const ordenTareas = (a: TareaLigera, b: TareaLigera) =>
  `${a.vence} ${a.hora ?? "99"}`.localeCompare(`${b.vence} ${b.hora ?? "99"}`);

/** "09:30" válida (24 h) o null. */
export function horaValida(v: unknown): string | null {
  const m = String(v ?? "").trim().match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  return m ? `${m[1].padStart(2, "0")}:${m[2]}` : null;
}

/** Fecha y hora de México de un instante: { hoy: "YYYY-MM-DD", hhmm: "HH:MM" }. */
export function ahoraMX(d: Date = new Date()): { hoy: string; hhmm: string } {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(d);
  const v = (t: string) => p.find(x => x.type === t)?.value ?? "00";
  return { hoy: `${v("year")}-${v("month")}-${v("day")}`, hhmm: `${v("hour") === "24" ? "00" : v("hour")}:${v("minute")}` };
}

/** Horario en que se mandan recordatorios: de 8:00 a 21:00 (hora de México). */
export const HORARIO_AVISOS = { desde: "08:00", hasta: "21:00" } as const;

/**
 * ¿Ya toca avisarle al responsable? Pendiente y sin aviso, y: venció un día
 * anterior, o es de hoy sin hora, o es de hoy y ya llegó su hora (con 5 min
 * de margen). Nunca fuera del horario de avisos.
 */
export function tocaAvisar(t: { vence: string; hora?: string | null; estado: string; avisadaEn?: Date | string | null }, hoy: string, hhmm: string): boolean {
  if (t.estado !== "pendiente" || t.avisadaEn) return false;
  if (hhmm < HORARIO_AVISOS.desde || hhmm >= HORARIO_AVISOS.hasta) return false;
  if (t.vence < hoy) return true;
  if (t.vence > hoy) return false;
  if (!t.hora) return true;
  return t.hora <= sumarMinutos(hhmm, 5);
}

function sumarMinutos(hhmm: string, n: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const t = Math.min(23 * 60 + 59, h * 60 + m + n);
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

/** Los motivos de pérdida de un conjunto, de más a menos. */
export function contarMotivos(guardados: (string | null)[]): { clave: MotivoPerdida; etiqueta: string; n: number }[] {
  const n = new Map<MotivoPerdida, number>();
  for (const g of guardados) { const c = claveMotivo(g); if (c) n.set(c, (n.get(c) ?? 0) + 1); }
  return MOTIVOS_PERDIDA.map(m => ({ clave: m.clave, etiqueta: m.etiqueta.replace(" (explícalo)", ""), n: n.get(m.clave) ?? 0 }))
    .filter(x => x.n > 0).sort((a, b) => b.n - a.n);
}
