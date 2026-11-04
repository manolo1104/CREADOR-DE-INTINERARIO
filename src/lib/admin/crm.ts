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
