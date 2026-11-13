import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ligaParaCorreo } from "@/lib/cotizaciones/enviar";

export const dynamic = "force-dynamic";

/**
 * La liga de pago de la cotización (la misma del correo y sus recordatorios),
 * para el recordatorio por WhatsApp del panel (13 nov 2026). La hace si no la
 * tiene; `{ url: null }` si la cotización ya no cobra (aceptada, vencida, ya es
 * reserva) o no hay Stripe. Protegida por el middleware de `/api/admin`.
 */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const q = await prisma.tourQuote.findUnique({ where: { id: params.id }, select: { id: true, customerEmail: true } });
    if (!q) return NextResponse.json({ error: "No existe esa cotización" }, { status: 404 });
    const liga = await ligaParaCorreo(q.id, q.customerEmail);
    return NextResponse.json({ url: liga?.url ?? null, monto: liga?.monto ?? null });
  } catch (e: unknown) {
    console.error("admin/cotizaciones liga:", e instanceof Error ? e.message : e);
    return NextResponse.json({ url: null }, { status: 500 });
  }
}
