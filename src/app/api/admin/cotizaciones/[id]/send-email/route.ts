import { NextRequest, NextResponse } from "next/server";
import { enviarCotizacionPorCorreo } from "@/lib/cotizaciones/enviar";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  // El cuerpo vive en `src/lib/cotizaciones/enviar.ts`: el bot de WhatsApp
  // manda EL MISMO correo y arranca EL MISMO seguimiento. Sin actor: la
  // bitácora toma a quien tiene la sesión del panel abierta, como siempre.
  const r = await enviarCotizacionPorCorreo(params.id);
  if (!r.ok) {
    console.error("admin/cotizaciones send-email:", r.error);
    return NextResponse.json({ error: "No se pudo enviar el email" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, seguimiento: r.seguimiento });
}
