import { formatMXN } from "@/lib/tourBooking";
import { C, boton, bajoBoton, nota, shellCorreo } from "./emailLayout";

/**
 * El aviso diario al equipo (oct 2026): qué cotizaciones vencen hoy y mañana,
 * cuáles vencieron ayer y qué borradores siguen sin mandarse.
 *
 * Llega a los dos buzones del equipo (`correosEquipo()`), uno de ellos el del
 * celular, así que está pensado para leerse en el teléfono: cada cotización
 * trae su WhatsApp ya escrito. Si no hay nada pendiente, no se manda.
 *
 * Armado aparte del envío para poder verlo sin mandarlo (`?dry=1` del cron).
 */

export interface FilaResumen {
  folio:     string;
  cliente:   string;
  tour:      string;
  tourDate:  string;
  total:     number;
  /** El WhatsApp con el recordatorio ya escrito; sin teléfono, `null`. */
  waUrl:     string | null;
  /** «Recordado hoy», si alguien ya le escribió desde el panel. */
  recordado?: string | null;
}

export interface Resumen {
  vencenHoy:      FilaResumen[];
  vencenManana:   FilaResumen[];
  vencieronAyer:  FilaResumen[];
  borradores:     FilaResumen[];
}

const PANEL = "https://www.huasteca-potosina.com/admin/cotizaciones";

export function hayAlgo(r: Resumen): boolean {
  return r.vencenHoy.length + r.vencenManana.length + r.vencieronAyer.length + r.borradores.length > 0;
}

function fechaCorta(ymd: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return "sin fecha";
  return new Date(`${ymd}T12:00:00`).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" });
}

function bloque(titulo: string, explica: string, filas: FilaResumen[], conWa: boolean): string {
  if (!filas.length) return "";
  const renglones = filas.map((f) => {
    const wa = conWa && f.waUrl
      ? `<a href="${f.waUrl}" style="display:inline-block;margin-top:6px;padding:7px 12px;background-color:#25D366;color:#ffffff;font-family:'DM Sans',Arial;font-size:12px;font-weight:500;text-decoration:none;">Recordarle por WhatsApp</a>`
      : conWa
        ? `<span style="display:inline-block;margin-top:6px;font-family:'DM Sans',Arial;font-size:12px;color:#9a8a6a;">Sin teléfono: solo por correo</span>`
        : "";
    const rec = f.recordado
      ? `<span style="font-family:'DM Sans',Arial;font-size:12px;color:#40916C;"> · ✓ recordado ${f.recordado}</span>`
      : "";
    return `
      <tr><td style="padding:12px 0;border-bottom:1px solid #ece4cf;">
        <p style="margin:0;font-family:'DM Sans',Arial;font-size:14px;color:${C.oscuro};font-weight:500;">${f.cliente}${rec}</p>
        <p style="margin:2px 0 0;font-family:'DM Sans',Arial;font-size:12px;color:#6a6a5a;">${f.tour} · ${fechaCorta(f.tourDate)} · ${formatMXN(f.total)} · ${f.folio}</p>
        ${wa}
      </td></tr>`;
  }).join("");
  return `
    <p style="margin:26px 0 2px;font-family:'DM Sans',Arial;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#8a7a5a;">${titulo} · ${filas.length}</p>
    <p style="margin:0 0 6px;font-family:'DM Sans',Arial;font-size:12px;color:#9a8a6a;">${explica}</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">${renglones}</table>`;
}

export function buildResumenCotizacionesHtml(r: Resumen): { subject: string; html: string } {
  const urgentes = r.vencenHoy.length + r.vencenManana.length;
  const subject = urgentes
    ? `🔔 ${urgentes} ${urgentes === 1 ? "cotización vence" : "cotizaciones vencen"} hoy o mañana`
    : r.vencieronAyer.length
      ? `Cotizaciones: ${r.vencieronAyer.length} vencieron ayer`
      : `Cotizaciones: ${r.borradores.length} sin enviar`;

  const html = shellCorreo({
    locale: "es",
    preheader: "Aviso interno · Tours Huasteca Potosina",
    eyebrow: "Cotizaciones del día",
    h1a: urgentes ? `${urgentes} por vencer` : "Sin urgentes",
    h1b: urgentes ? "toca recordar" : "hoy",
    entradilla: "Un recordatorio a tiempo por WhatsApp es lo que más cierra. A quien dejó correo, el sistema ya le avisa solo un día antes.",
    cuerpo: [
      bloque("Vencen hoy", "Último día para apartar con el precio cotizado.", r.vencenHoy, true),
      bloque("Vencen mañana", "Buen momento para escribirles.", r.vencenManana, true),
      bloque("Vencieron ayer", "Ya pasaron a Vencidas. Si alguien sigue interesado, en el panel se le pone otra fecha.", r.vencieronAyer, false),
      bloque("Borradores sin enviar", "Se armaron hace más de un día y el cliente todavía no las tiene.", r.borradores, false),
      `<div style="height:28px"></div>`,
      boton(PANEL, "Abrir cotizaciones en el panel", "verde"),
      bajoBoton("Desde el panel el recordatorio queda marcado como enviado."),
      nota("Este aviso sale una vez al día y solo cuando hay algo pendiente.", C.texto, "24px 0 0 0"),
    ].join(""),
  });

  return { subject, html };
}
