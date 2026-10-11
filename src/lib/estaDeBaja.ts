/**
 * ¿Esta persona pidió la baja de los correos de marketing? (11 oct 2026)
 *
 * 🔴 Por qué existe: la baja se guardaba bien, pero casi nadie la consultaba
 * antes de escribir.
 *   - Un lead es único por (correo, fuente): basta con dejar el correo en otro
 *     formulario —o que un tercero lo deje— para que naciera otra fila
 *     «activo» y la secuencia arrancara de cero.
 *   - La secuencia de cotizaciones solo lo revisaba antes de UNO de sus pasos.
 *   - Las búsquedas eran exactas y la baja guarda el correo en minúsculas:
 *     «Ana.Lopez@Gmail.com» pedía la baja, veía «listo» y seguía recibiendo.
 *
 * Una sola regla para todos los envíos de marketing: si en cualquiera de las
 * tablas que la baja marca hay una fila «baja» con ese correo (sin distinguir
 * mayúsculas), no se le escribe. Las confirmaciones de compra NO pasan por aquí:
 * no son publicidad.
 */
import { prisma } from "@/lib/prisma";

/** La fila de lista que deja `/api/baja` como marca permanente. */
export const FUENTE_BAJA = "Baja";

/** El filtro de Prisma para un correo, sin distinguir mayúsculas. */
export function mismoCorreo(email: string) {
  return { equals: email.trim(), mode: "insensitive" as const };
}

export async function estaDeBaja(email: string | null | undefined): Promise<boolean> {
  if (!email || !email.includes("@")) return false;
  const e = mismoCorreo(email);
  const [lead, carrito, curso] = await Promise.all([
    prisma.lead.findFirst({ where: { email: e, status: "baja" }, select: { id: true } }),
    prisma.abandonedCart.findFirst({ where: { customerEmail: e, status: "baja" }, select: { id: true } }),
    prisma.cursoLead.findFirst({ where: { email: e, status: "baja" }, select: { id: true } }),
  ]);
  return !!(lead || carrito || curso);
}
