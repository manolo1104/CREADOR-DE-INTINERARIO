import { NextRequest, NextResponse } from "next/server";
import { enviarConfirmacionReserva } from "@/lib/cotizaciones/convertir";
import { sesionActual } from "@/lib/admin/sesion";
import { enmascararTexto } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * Manda el correo de confirmación de una reserva (botón de Reservas y, desde
 * el 19 nov 2026, «Mandar confirmación» en la ficha del lead).
 *
 * Contesta `{ ok: true, destinatario, enviadaEn }`: a qué correo salió y
 * cuándo (ISO), lo mismo que la ficha lee después de la bitácora. Errores:
 * 400 sin correo válido, 409 cancelada o borrador, 500 si Brevo no lo aceptó.
 * Preguntar antes de reenviar es cosa de la pantalla: aquí cada POST manda uno.
 */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  // El cuerpo vive en `src/lib/cotizaciones/convertir.ts`: cuando Manolo
  // confirma un pago por WhatsApp, el cliente recibe EL MISMO correo de
  // confirmación que cuando se manda desde aquí.
  // Quién lo mandó, para la bitácora y para cerrar su tarea «mándale la confirmación».
  const s = await sesionActual().catch(() => null);
  const actor = s ? { usuario: s.user, nombre: s.nombre, rol: s.rol } : undefined;
  const r = await enviarConfirmacionReserva(params.id, actor);
  if (r.motivo === "sin-correo") {
    return NextResponse.json({ error: "Esta reserva no tiene un email válido del cliente." }, { status: 400 });
  }
  // Cancelada (o borrador): no se le confirma nada al cliente (lote 5, 5 nov 2026).
  if (r.motivo === "cancelada") return NextResponse.json({ error: r.error }, { status: 409 });
  if (!r.ok) {
    console.error("admin/reservas send-email:", enmascararTexto(String(r.error ?? "")));
    return NextResponse.json({ error: "No se pudo enviar el email" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, destinatario: r.destinatario, enviadaEn: r.enviadaEn ?? new Date().toISOString() });
}
