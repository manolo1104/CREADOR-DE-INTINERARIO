import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { conMeta } from "@/lib/quoteFollowUp";
import { registrarEnBitacora } from "@/lib/admin/bitacora";
import { marcarEnviadaPorWhatsapp } from "@/lib/cotizaciones/enviar";

export const dynamic = "force-dynamic";

/**
 * Anota lo que el equipo hizo por WhatsApp con una cotización. El WhatsApp lo
 * abre el propio navegador (wa.me); aquí solo queda la marca, igual que en
 * Reseñas (`/api/admin/reservas/[id]/resena-whatsapp`).
 *
 * - `tipo: "envio"`: la mandó por WhatsApp. Pasa a Enviada y nace su fecha
 *   límite (la que se escribió en el mensaje, `venceEl`). Antes se quedaba en
 *   «Sin enviar» aunque el cliente ya la tuviera. La regla vive en
 *   `src/lib/cotizaciones/enviar.ts` porque el bot la usa igual.
 * - `tipo: "recordatorio"`: le recordó que está por vencer.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json().catch(() => ({}));
    const tipo = body?.tipo === "recordatorio" ? "recordatorio" : body?.tipo === "envio" ? "envio" : null;
    if (!tipo) return NextResponse.json({ error: "Falta el tipo" }, { status: 400 });

    if (tipo === "recordatorio") {
      const q = await prisma.tourQuote.findUniqueOrThrow({ where: { id: params.id } });
      const ahora = new Date().toISOString();
      const lineItems = conMeta(q.lineItems, { recordadoWaAt: ahora });
      await prisma.tourQuote.update({ where: { id: q.id }, data: { lineItems: lineItems as never } });
      await registrarEnBitacora({
        accion:     "envió",
        entidad:    "cotización",
        referencia: q.quoteNumber,
        resumen:    `Recordó por WhatsApp la cotización ${q.quoteNumber} a ${q.customerName}`,
      });
      return NextResponse.json({ ok: true, status: q.status, lineItems });
    }

    const r = await marcarEnviadaPorWhatsapp(params.id, body?.venceEl);
    if (!r.ok) throw new Error(r.error);
    return NextResponse.json({ ok: true, status: r.status, lineItems: r.lineItems });
  } catch (e: unknown) {
    console.error("admin/cotizaciones whatsapp:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "No se pudo anotar" }, { status: 500 });
  }
}
