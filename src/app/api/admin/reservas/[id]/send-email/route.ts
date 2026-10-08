import { NextRequest, NextResponse } from "next/server";
import { enviarConfirmacionReserva } from "@/lib/cotizaciones/convertir";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  // El cuerpo vive en `src/lib/cotizaciones/convertir.ts`: cuando Manolo
  // confirma un pago por WhatsApp, el cliente recibe EL MISMO correo de
  // confirmación que cuando se manda desde aquí.
  const r = await enviarConfirmacionReserva(params.id);
  if (r.motivo === "sin-correo") {
    return NextResponse.json({ error: "Esta reserva no tiene un email válido del cliente." }, { status: 400 });
  }
  if (!r.ok) {
    console.error("admin/reservas send-email:", r.error);
    return NextResponse.json({ error: "No se pudo enviar el email" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
