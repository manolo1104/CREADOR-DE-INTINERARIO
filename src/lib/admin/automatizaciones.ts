// Las reglas que crean seguimientos SOLAS (Fase 3 del rediseño, 4 nov 2026).
// Puro: lo usan el reloj del servidor y las pruebas. Cada regla devuelve
// tareas con una `claveRegla` única: la base no deja crear dos veces la misma
// (aunque el reloj y el cron de respaldo coincidan), y una ya hecha no renace.
//
// Lo que manda mensajes al CLIENTE (confirmaciones de 48/24 h por WhatsApp,
// plantillas de seguimiento) espera la conexión con Meta (Fase 2.3). Mientras,
// estas reglas le dejan la tarea a una persona.
import { addDaysYMD, diffDiasYMD } from "@/lib/dates";

/** Quién recibe lo que no tiene dueño: el operador. */
export const RESPONSABLE_OPERACION = "Erick";
/** Quién registra el dinero: los saldos vencidos son suyos. */
export const RESPONSABLE_COBROS = "Manolo";

export type ReglaClave = "cotizado-24h" | "saldo-vencido" | "liga-24h" | "salida-48h";

export const REGLAS: { clave: ReglaClave; etiqueta: string; detalle: string }[] = [
  { clave: "cotizado-24h", etiqueta: "Cotizado sin respuesta 24 h", detalle: "Lead en Cotizado desde hace 24 h y sin ningún seguimiento pendiente." },
  { clave: "saldo-vencido", etiqueta: "Saldo vencido", detalle: "El tour ya pasó y la reserva tiene saldo sin registrar." },
  { clave: "liga-24h", etiqueta: "Liga de pago sin pagar 24 h", detalle: "Se mandó una liga de pago hace 24 h y no se ha pagado." },
  { clave: "salida-48h", etiqueta: "Confirmar salida (48 h)", detalle: "Pasado mañana sale un tour: confirmar a los clientes punto de encuentro, hora y qué llevar." },
];

export interface TareaPorRegla {
  claveRegla: string;
  regla: ReglaClave;
  titulo: string;
  responsable: string;
  vence: string;
  oportunidadId?: string | null;
  salidaClave?: string | null;
}

export interface LeadCotizado {
  id: string;
  responsable: string | null;
  /** El cambio a Cotizado más reciente (id y cuándo). */
  cotizadoId: string;
  cotizadoEn: Date;
  /** Seguimientos pendientes del lead. */
  pendientes: number;
  cliente: string;
  folio: string | null;
  fechaViaje: string | null;
}

/**
 * Cotizado 24 h sin seguimiento → tarea para hoy (regla del prompt: «Cotizado
 * sin respuesta 24 h → tarea de seguimiento», y «ninguna cotización pasa del día
 * 3 sin seguimiento»). Si el viaje ya pasó, no hay nada que seguir.
 */
export function reglaCotizado(leads: LeadCotizado[], ahora: Date, hoy: string, responsables: string[]): TareaPorRegla[] {
  return leads
    .filter(l => l.pendientes === 0 && ahora.getTime() - l.cotizadoEn.getTime() >= 24 * 3600_000)
    .filter(l => !l.fechaViaje || l.fechaViaje >= hoy)
    .map(l => ({
      claveRegla: `cotizado-24h:${l.cotizadoId}`,
      regla: "cotizado-24h" as const,
      titulo: `Seguimiento a la cotización${l.folio ? ` ${l.folio}` : ""}: ¿la vio? ¿qué le falta para reservar?`,
      responsable: l.responsable && responsables.includes(l.responsable) ? l.responsable : RESPONSABLE_OPERACION,
      vence: hoy,
      oportunidadId: l.id,
    }));
}

export interface ReservaConSaldo {
  id: string;
  folio: string;
  cliente: string;
  ultimoDia: string;
  saldo: number;
  oportunidadId: string | null;
}

/** Tour ya pasado con saldo → tarea de cobrarlo o registrarlo («no hay saldos vencidos sin tarea»). */
export function reglaSaldo(reservas: ReservaConSaldo[], hoy: string): TareaPorRegla[] {
  return reservas
    .filter(r => r.saldo > 0 && /^\d{4}-\d{2}-\d{2}$/.test(r.ultimoDia) && r.ultimoDia < hoy)
    .map(r => ({
      claveRegla: `saldo-vencido:${r.id}`,
      regla: "saldo-vencido" as const,
      titulo: `Saldo de $${Math.round(r.saldo).toLocaleString("es-MX")} de ${r.folio} (${r.cliente}): cobrarlo o registrarlo en Reservas`,
      responsable: RESPONSABLE_COBROS,
      vence: hoy,
      oportunidadId: r.oportunidadId,
    }));
}

export interface LigaActiva {
  id: string;
  titulo: string;
  cliente: string | null;
  monto: number;
  creadaEn: Date;
  creadoPor: string | null;
  oportunidadId: string | null;
}

/** Liga sin pagar 24 h → tarea de recordarle al cliente con fecha límite. */
export function reglaLiga(ligas: LigaActiva[], ahora: Date, hoy: string, responsables: string[]): TareaPorRegla[] {
  return ligas
    .filter(l => ahora.getTime() - l.creadaEn.getTime() >= 24 * 3600_000)
    .map(l => ({
      claveRegla: `liga-24h:${l.id}`,
      regla: "liga-24h" as const,
      titulo: `La liga de pago de $${Math.round(l.monto).toLocaleString("es-MX")}${l.cliente ? ` (${l.cliente})` : ""} no se ha pagado: recordarle con fecha límite`,
      responsable: l.creadoPor && responsables.includes(l.creadoPor) ? l.creadoPor : RESPONSABLE_OPERACION,
      vence: hoy,
      oportunidadId: l.oportunidadId,
    }));
}

export interface SalidaProxima { clave: string; fecha: string; tour: string; personas: number; reservas: number }

/** Pasado mañana (o mañana) sale un tour con gente → tarea de confirmarles, mientras no haya plantillas de WhatsApp. */
export function reglaSalida(salidas: SalidaProxima[], hoy: string): TareaPorRegla[] {
  return salidas
    .filter(s => s.personas > 0 && diffDiasYMD(hoy, s.fecha) >= 1 && diffDiasYMD(hoy, s.fecha) <= 2)
    .map(s => ({
      claveRegla: `salida-48h:${s.clave}`,
      regla: "salida-48h" as const,
      titulo: `Confirmar ${s.tour} del ${s.fecha} (${s.reservas} ${s.reservas === 1 ? "reserva" : "reservas"}, ${s.personas} pax): punto de encuentro, hora y qué llevar`,
      responsable: RESPONSABLE_OPERACION,
      vence: addDaysYMD(s.fecha, -2) < hoy ? hoy : addDaysYMD(s.fecha, -2),
      salidaClave: s.clave,
    }));
}

// ── El correo del resumen diario de las 7:30 (puro: lo prueba Vitest) ─────────

export const BASE_URL = "https://www.huasteca-potosina.com";
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

export interface LineaResumen { titulo: string; cuando: string; cliente: string | null; href: string; rojo?: boolean }

/** El correo del resumen: vencidos, lo de hoy y las salidas de hoy y mañana. */
export function correoResumen(nombre: string, hoy: string, vencidos: LineaResumen[], deHoy: LineaResumen[], salidas: LineaResumen[]) {
  const total = vencidos.length + deHoy.length;
  const subject = `Tu día · ${total} seguimiento${total === 1 ? "" : "s"}${vencidos.length ? ` (${vencidos.length} vencido${vencidos.length === 1 ? "" : "s"})` : ""}${salidas.length ? ` · ${salidas.length} salida${salidas.length === 1 ? "" : "s"}` : ""}`;
  const bloque = (titulo: string, ls: LineaResumen[]) => !ls.length ? "" : `
    <div style="font-size:12px;letter-spacing:1.5px;color:#66655F;margin:18px 0 4px">${esc(titulo.toUpperCase())}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${ls.map(l => `<tr><td style="padding:9px 0;border-bottom:1px solid #E6E4DF">
      <a href="${l.href}" style="color:#1C1C1A;text-decoration:none;font-size:15px;font-weight:600">${esc(l.titulo)}</a>
      <div style="font-size:13px;color:${l.rojo ? "#A33A26" : "#66655F"}">${esc(l.cuando)}${l.cliente ? ` · ${esc(l.cliente)}` : ""}</div></td></tr>`).join("")}</table>`;
  const htmlContent = `<!doctype html><html lang="es"><body bgcolor="#F5F5F3" style="margin:0;background:#F5F5F3;font-family:Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" bgcolor="#F5F5F3" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
  <table role="presentation" width="100%" style="max-width:560px;background:#FFFFFF;border:1px solid #E6E4DF;border-radius:12px" cellpadding="0" cellspacing="0"><tr><td style="padding:24px">
  <div style="font-size:11px;letter-spacing:2px;color:#66655F">PANEL HUASTECA · TU DÍA</div>
  <div style="font-size:22px;color:#1C1C1A;margin:6px 0 4px">Buenos días, ${esc(nombre)}</div>
  ${bloque("Vencidos", vencidos)}${bloque("Para hoy", deHoy)}${bloque("Salidas de hoy y mañana", salidas)}
  <div style="margin-top:20px"><a href="${BASE_URL}/admin/seguimientos" style="display:inline-block;background:#1F3B2D;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-size:14px;font-weight:600">Abrir Seguimientos</a></div>
  </td></tr></table></td></tr></table></body></html>`;
  const linea = (l: LineaResumen) => `- ${l.cuando}: ${l.titulo}${l.cliente ? ` (${l.cliente})` : ""}`;
  const textContent = [`Buenos días, ${nombre}`, vencidos.length ? `\nVencidos:\n${vencidos.map(linea).join("\n")}` : "", deHoy.length ? `\nPara hoy:\n${deHoy.map(linea).join("\n")}` : "", salidas.length ? `\nSalidas:\n${salidas.map(linea).join("\n")}` : "", `\n${BASE_URL}/admin/seguimientos`].join("\n");
  return { subject: subject.slice(0, 140), htmlContent, textContent };
}

