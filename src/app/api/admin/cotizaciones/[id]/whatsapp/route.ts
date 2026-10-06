import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { conMeta, metaCotizacion } from "@/lib/quoteFollowUp";
import { calcularVencimiento, vigenciaDe } from "@/lib/vencimientoCotizacion";
import { registrarEnBitacora } from "@/lib/admin/bitacora";
import { hoyMX } from "@/lib/dates";

export const dynamic = "force-dynamic";

const esYMD = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

/**
 * Anota lo que el equipo hizo por WhatsApp con una cotización. El WhatsApp lo
 * abre el propio navegador (wa.me); aquí solo queda la marca, igual que en
 * Reseñas (`/api/admin/reservas/[id]/resena-whatsapp`).
 *
 * - `tipo: "envio"`: la mandó por WhatsApp. Pasa a Enviada y nace su fecha
 *   límite (la que se escribió en el mensaje, `venceEl`). Antes se quedaba en
 *   «Sin enviar» aunque el cliente ya la tuviera.
 * - `tipo: "recordatorio"`: le recordó que está por vencer.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json().catch(() => ({}));
    const tipo = body?.tipo === "recordatorio" ? "recordatorio" : body?.tipo === "envio" ? "envio" : null;
    if (!tipo) return NextResponse.json({ error: "Falta el tipo" }, { status: 400 });

    const q = await prisma.tourQuote.findUniqueOrThrow({ where: { id: params.id } });
    const meta = metaCotizacion(q.lineItems);
    const ahora = new Date().toISOString();

    if (tipo === "recordatorio") {
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

    // Una ya aceptada no regresa a Enviada por abrirle un WhatsApp.
    if (q.status === "aceptada") return NextResponse.json({ ok: true, status: q.status, lineItems: q.lineItems });

    const hoy = hoyMX();
    const sigueEnPie = q.status === "enviada" && esYMD(meta.venceEl) && meta.venceEl >= hoy;
    const venceEl = sigueEnPie
      ? meta.venceEl!
      : esYMD(body?.venceEl) && body.venceEl >= hoy
        ? body.venceEl
        : calcularVencimiento(new Date(), vigenciaDe(q.packageItems), q.tourDate);

    const lineItems = conMeta(q.lineItems, {
      venceEl,
      ...(venceEl !== meta.venceEl ? { recordadoWaAt: undefined, avisoVenceAt: undefined } : {}),
    });
    await prisma.tourQuote.update({
      where: { id: q.id },
      data:  { status: "enviada", lineItems: lineItems as never },
    });
    await registrarEnBitacora({
      accion:     "envió",
      entidad:    "cotización",
      referencia: q.quoteNumber,
      resumen:    `Cotización ${q.quoteNumber} por WhatsApp a ${q.customerName} (vence el ${venceEl})`,
    });
    return NextResponse.json({ ok: true, status: "enviada", lineItems });
  } catch (e: unknown) {
    console.error("admin/cotizaciones whatsapp:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "No se pudo anotar" }, { status: 500 });
  }
}
