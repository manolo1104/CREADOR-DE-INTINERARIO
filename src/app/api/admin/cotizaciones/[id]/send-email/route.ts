import { NextRequest, NextResponse } from "next/server";
import { enviarCotizacionPorCorreo } from "@/lib/cotizaciones/enviar";
import { mensajeTrasEnviarCorreo } from "@/lib/cotizaciones/reglasEnvio";
import { leadDesdeCotizacion } from "@/lib/admin/crmDatos";
import { sesionActual } from "@/lib/admin/sesion";
import { enmascararTexto } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  // El cuerpo vive en `src/lib/cotizaciones/enviar.ts`: el bot de WhatsApp
  // manda EL MISMO correo y arranca EL MISMO seguimiento. Sin actor: la
  // bitácora toma a quien tiene la sesión del panel abierta, como siempre.
  const r = await enviarCotizacionPorCorreo(params.id);
  if (!r.ok) {
    console.error("admin/cotizaciones send-email:", enmascararTexto(String(r.error ?? "")));
    return NextResponse.json({ error: "No se pudo enviar el email" }, { status: 500 });
  }
  // Mandada AL CLIENTE → su lead pasa a Cotizado (3 nov 2026). Una copia o un
  // correo que solo le llegó al equipo no mueven nada (lote 4, 5 nov 2026).
  if (r.emailEnviado && !r.copia) {
    await leadDesdeCotizacion(params.id, "cotizado", (await sesionActual())?.nombre ?? "Desconocido", "cotización enviada por correo");
  }
  // Lo que pasó de verdad, y la cotización como quedó: la pantalla la pone en
  // su lista. Sin esto, editarla después le borraba la fecha límite.
  return NextResponse.json({
    ok: true, seguimiento: r.seguimiento, emailEnviado: r.emailEnviado, copia: r.copia ?? null,
    soloEquipo: r.soloEquipo === true, status: r.status, lineItems: r.lineItems,
    mensaje: mensajeTrasEnviarCorreo(r),
  });
}
