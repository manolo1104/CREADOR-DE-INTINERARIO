import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { leadDesdeCotizacion } from "@/lib/admin/crmDatos";
import { registrarEnBitacora } from "@/lib/admin/bitacora";
import { sesionActual } from "@/lib/admin/sesion";

export const dynamic = "force-dynamic";

/**
 * POST — se descargó el PDF de la cotización (lo llama el panel al abrirlo).
 * Descargarlo es para mandarlo: su lead pasa a Cotizado (Manolo, 3 nov 2026).
 * No cambia el estado de la cotización: «enviada» sigue siendo correo o WhatsApp.
 */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const q = await prisma.tourQuote.findUnique({ where: { id: params.id }, select: { id: true, quoteNumber: true } });
  if (!q) return NextResponse.json({ error: "Esa cotización no existe." }, { status: 404 });
  const quien = (await sesionActual())?.nombre ?? "Desconocido";
  const oportunidadId = await leadDesdeCotizacion(q.id, "cotizado", quien, `PDF de la cotización ${q.quoteNumber} descargado`);
  await registrarEnBitacora({ accion: "envió", entidad: "cotización", referencia: q.quoteNumber, resumen: `Descargó el PDF de la cotización ${q.quoteNumber}` });
  return NextResponse.json({ ok: true, oportunidadId });
}
