/**
 * Aviso al equipo cuando un cliente califica su tour con 3 estrellas o menos
 * (21 oct 2026). Lo que se gana aquí es tiempo: una llamada el mismo día
 * convierte a un inconforme en alguien que se sintió escuchado; una semana
 * después ya escribió en Google.
 */

import type { TourBooking } from "@prisma/client";
import { sendBrevoEmail, correosEquipo } from "@/lib/brevo";
import { C, boton, filaDato, nota, shellCorreo, tabla } from "@/lib/emailLayout";
import { escapeHtml as esc } from "@/lib/escapeHtml";
import { telefonoWhatsapp } from "@/lib/reviewRequest";

export function construirAvisoInconforme(
  b: Pick<TourBooking, "customerName" | "customerPhone" | "customerEmail" | "tourName" | "tourDate" | "confirmationNumber">,
  r: { calificacion: number; recomendaria: number | null; comentario: string | null },
): { subject: string; html: string } {
  const tel = telefonoWhatsapp(b.customerPhone);
  const estrellas = "★".repeat(r.calificacion) + "☆".repeat(5 - r.calificacion);
  const tour = (b.tourName || "").split("—")[0].trim();
  const html = shellCorreo({
    locale: "es",
    preheader: "Aviso interno · encuesta de satisfacción",
    eyebrow: "Cliente inconforme",
    h1a: `${esc(b.customerName)} calificó`,
    h1b: `${estrellas}`,
    entradilla: `Su tour «${esc(tour)}» del ${esc(b.tourDate)}. Escríbele hoy, antes de que lo cuente en otro lado.`,
    cuerpo: [
      tabla([
        filaDato("Folio", esc(b.confirmationNumber), true),
        filaDato("Recomendaría", r.recomendaria === null ? "No contestó" : `${r.recomendaria} / 10`),
        filaDato("Teléfono", esc(b.customerPhone || "—")),
        filaDato("Correo", esc(b.customerEmail || "—")),
      ].join("")),
      r.comentario ? nota(`«${esc(r.comentario)}»`, C.texto, "24px 0 0 0") : "",
      tel ? boton(`https://wa.me/${tel}`, "Escribirle por WhatsApp", "whatsapp") : "",
    ].join(""),
    origen: "Lo manda la encuesta de /opina cuando alguien califica 3 estrellas o menos.",
  });
  return { subject: `⚠️ ${b.customerName} calificó ${r.calificacion}★ el tour ${tour}`, html };
}

export async function avisarClienteInconforme(
  b: TourBooking,
  r: { calificacion: number; recomendaria: number | null; comentario: string | null },
): Promise<void> {
  const to = correosEquipo();
  if (to.length === 0) return;
  const { subject, html } = construirAvisoInconforme(b, r);
  await sendBrevoEmail({ to, subject, htmlContent: html });
}
