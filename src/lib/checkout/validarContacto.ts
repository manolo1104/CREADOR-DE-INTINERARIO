import type { BookingMessages } from "@/lib/i18n/booking";

export type CampoContacto = "name" | "email" | "phone";
export type ErroresContacto = Partial<Record<CampoContacto, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Los datos de contacto del checkout, con un mensaje concreto por campo.
 *
 * Baymard: el 98 % de los sitios responde «dato inválido» y la persona no sabe
 * qué arreglar. Aquí cada error dice qué falta. El WhatsApp es obligatorio
 * porque es por donde el equipo confirma la hora de recogida; se acepta
 * cualquier formato (con +52, espacios o guiones) mientras traiga entre 10 y
 * 15 dígitos, para que nadie de EE. UU. quede fuera por la lada.
 */
export function validarContacto(
  d: { name: string; email: string; phone: string },
  m: BookingMessages["checkout"],
): ErroresContacto {
  const errores: ErroresContacto = {};
  if (d.name.trim().length < 2) errores.name = m.errNombre;
  if (!EMAIL_RE.test(d.email.trim())) errores.email = m.errCorreo;
  const digitos = d.phone.replace(/\D/g, "").length;
  if (digitos < 10 || digitos > 15) errores.phone = m.errWhatsapp;
  return errores;
}
