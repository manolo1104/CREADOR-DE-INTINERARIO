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

export interface TareaLigera { id: string; responsable: string; vence: string; estado: string }

/** Seguimientos: vencidas, de hoy y próximas, por responsable (las hechas fuera). */
export function agruparTareas<T extends TareaLigera>(tareas: T[], hoy: string) {
  const pendientes = tareas.filter(t => t.estado !== "hecha").sort((a, b) => a.vence.localeCompare(b.vence));
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

/** Los motivos de pérdida de un conjunto, de más a menos. */
export function contarMotivos(guardados: (string | null)[]): { clave: MotivoPerdida; etiqueta: string; n: number }[] {
  const n = new Map<MotivoPerdida, number>();
  for (const g of guardados) { const c = claveMotivo(g); if (c) n.set(c, (n.get(c) ?? 0) + 1); }
  return MOTIVOS_PERDIDA.map(m => ({ clave: m.clave, etiqueta: m.etiqueta.replace(" (explícalo)", ""), n: n.get(m.clave) ?? 0 }))
    .filter(x => x.n > 0).sort((a, b) => b.n - a.n);
}
