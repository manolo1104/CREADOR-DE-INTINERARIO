// Solo servidor: los recordatorios de seguimiento (Manolo, 3 nov 2026: «poder
// agendar el próximo seguimiento y que le llegue un recordatorio a Erick»).
// Correo al responsable a la hora agendada; sin hora, a primera hora del día.
// Por WhatsApp todavía no: eso necesita la conexión con Meta (Fase 2.3).
//
// Lo dispara el propio servidor cada 5 minutos (`src/instrumentation.ts`) y,
// de respaldo, el cron horario de GitHub. Los dos pueden coincidir: cada tarea
// se RECLAMA en la base antes de mandar (avisadaEn), así que sale una sola vez.
import { prisma } from "@/lib/prisma";
import { correosEquipo, sendBrevoEmail } from "@/lib/brevo";
import { usuariosAdmin } from "./usuarios";
import { ahoraMX, tocaAvisar } from "./crm";

const BASE_URL = "https://www.huasteca-potosina.com";

/**
 * A quién le llega: `ADMIN_EMAIL_<USUARIO>` (ADMIN_EMAIL_ERICK, …_MARTIN,
 * …_MANOLO). Sin esa variable, a los correos del equipo (`ADMIN_EMAIL_TOURS`,
 * que incluye el del celular del negocio).
 */
export function correoDe(responsable: string): { email: string }[] {
  const u = usuariosAdmin().find(x => x.nombre.toLowerCase() === responsable.trim().toLowerCase());
  const propio = u ? process.env[`ADMIN_EMAIL_${u.user.toUpperCase()}`] : undefined;
  return propio ? [{ email: propio }] : correosEquipo();
}

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

interface TareaAviso { id: string; titulo: string; vence: string; hora: string | null; oportunidadId: string | null; cliente: string | null; telefono: string | null }

/** El correo: un renglón por seguimiento, con la ficha y el WhatsApp del cliente a un toque. */
export function correoRecordatorio(responsable: string, tareas: TareaAviso[], hoy: string): { subject: string; htmlContent: string; textContent: string } {
  const una = tareas.length === 1 ? tareas[0] : null;
  const subject = una
    ? `Seguimiento${una.hora ? ` ${una.hora}` : ""}${una.cliente ? ` · ${una.cliente}` : ""}: ${una.titulo}`.slice(0, 140)
    : `${tareas.length} seguimientos para ti`;
  const cuando = (t: TareaAviso) => (t.vence < hoy ? `Vencido (${t.vence})` : t.hora ? `Hoy ${t.hora}` : "Hoy");
  const filas = tareas.map(t => {
    const ficha = t.oportunidadId ? `${BASE_URL}/admin/leads/${t.oportunidadId}` : `${BASE_URL}/admin/seguimientos`;
    const wa = t.telefono ? `https://wa.me/${t.telefono.replace(/\D/g, "")}` : null;
    return `<tr><td style="padding:12px 0;border-bottom:1px solid #E6E4DF">
      <div style="font-size:12px;color:${t.vence < hoy ? "#A33A26" : "#66655F"};font-weight:600">${esc(cuando(t))}</div>
      <div style="font-size:16px;color:#1C1C1A;font-weight:600;margin:2px 0">${esc(t.titulo)}</div>
      ${t.cliente ? `<div style="font-size:14px;color:#3B3A35">${esc(t.cliente)}</div>` : ""}
      <div style="margin-top:8px"><a href="${ficha}" style="display:inline-block;background:#1F3B2D;color:#fff;text-decoration:none;padding:9px 14px;border-radius:8px;font-size:14px;font-weight:600">Abrir ficha</a>
      ${wa ? `&nbsp;<a href="${wa}" style="display:inline-block;border:1px solid #2E6B45;color:#2E6B45;text-decoration:none;padding:8px 14px;border-radius:8px;font-size:14px;font-weight:600">WhatsApp del cliente</a>` : ""}</div>
    </td></tr>`;
  }).join("");
  const htmlContent = `<!doctype html><html lang="es"><body bgcolor="#F5F5F3" style="margin:0;background:#F5F5F3;font-family:Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" bgcolor="#F5F5F3" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
  <table role="presentation" width="100%" style="max-width:560px;background:#FFFFFF;border:1px solid #E6E4DF;border-radius:12px" cellpadding="0" cellspacing="0"><tr><td style="padding:24px">
  <div style="font-size:11px;letter-spacing:2px;color:#66655F">PANEL HUASTECA · SEGUIMIENTOS</div>
  <div style="font-size:22px;color:#1C1C1A;margin:6px 0 4px">Hola ${esc(responsable)}, te toca:</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${filas}</table>
  <div style="font-size:12px;color:#66655F;margin-top:16px">Al terminar, márcalo hecho en el panel o pósponlo: así no vuelve a salir.</div>
  </td></tr></table></td></tr></table></body></html>`;
  const textContent = `Hola ${responsable}, te toca:\n\n` + tareas.map(t => `- ${cuando(t)}: ${t.titulo}${t.cliente ? ` (${t.cliente})` : ""}\n  ${t.oportunidadId ? `${BASE_URL}/admin/leads/${t.oportunidadId}` : `${BASE_URL}/admin/seguimientos`}`).join("\n");
  return { subject, htmlContent, textContent };
}

/** Manda lo que ya toca. Idempotente: cada tarea se reclama antes de enviar y se suelta si el envío falla. */
export async function enviarRecordatorios(ahora: Date = new Date()): Promise<{ enviados: number; tareas: number; errores: string[] }> {
  const { hoy, hhmm } = ahoraMX(ahora);
  const candidatas = await prisma.tarea.findMany({
    where: { estado: "pendiente", avisadaEn: null, vence: { lte: hoy } },
    include: { oportunidad: { include: { contacto: { select: { nombre: true, telefono: true } } } } },
    orderBy: [{ vence: "asc" }, { hora: "asc" }], take: 200,
  });
  const listas = candidatas.filter(t => tocaAvisar(t, hoy, hhmm));
  const porResponsable = new Map<string, typeof listas>();
  for (const t of listas) porResponsable.set(t.responsable, [...(porResponsable.get(t.responsable) ?? []), t]);

  let enviados = 0, tareas = 0;
  const errores: string[] = [];
  for (const [responsable, ts] of Array.from(porResponsable.entries())) {
    const reclamadas: typeof ts = [];
    for (const t of ts) {
      const r = await prisma.tarea.updateMany({ where: { id: t.id, avisadaEn: null, estado: "pendiente" }, data: { avisadaEn: ahora } });
      if (r.count === 1) reclamadas.push(t);
    }
    if (!reclamadas.length) continue;
    try {
      const correo = correoRecordatorio(responsable, reclamadas.map(t => ({
        id: t.id, titulo: t.titulo, vence: t.vence, hora: t.hora, oportunidadId: t.oportunidadId,
        cliente: t.oportunidad?.contacto.nombre ?? null, telefono: t.oportunidad?.contacto.telefono ?? null,
      })), hoy);
      await sendBrevoEmail({ to: correoDe(responsable), ...correo, senderName: "Panel Huasteca" });
      enviados++; tareas += reclamadas.length;
    } catch (e) {
      errores.push(`${responsable}: ${(e as Error)?.message}`);
      await prisma.tarea.updateMany({ where: { id: { in: reclamadas.map(t => t.id) } }, data: { avisadaEn: null } });
    }
  }
  return { enviados, tareas, errores };
}
