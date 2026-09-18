import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  registrarEnBitacora, camposCambiados, ETIQUETAS_COTIZACION, pesos,
} from "@/lib/admin/bitacora";

export const dynamic = "force-dynamic";

const QUOTE_FIELDS = [
  "tourName", "tourSlug", "tourDate", "adults", "children", "totalAmount",
  "customerName", "customerEmail", "customerPhone", "notes",
  "lineItems", "packageItems", "extraItems", "status",
] as const;

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    // Solo actualizar campos permitidos que vengan en el body (update parcial).
    const data: Record<string, unknown> = {};
    for (const k of QUOTE_FIELDS) {
      if (body[k] !== undefined) data[k] = body[k];
    }
    const antes = await prisma.tourQuote.findUnique({ where: { id: params.id } });
    const quote = await prisma.tourQuote.update({ where: { id: params.id }, data });

    const cambios = camposCambiados(antes as any, data, ETIQUETAS_COTIZACION);
    if (cambios.length) {
      await registrarEnBitacora({
        accion:     "modificó",
        entidad:    "cotización",
        referencia: quote.quoteNumber,
        resumen:    `Cotización ${quote.quoteNumber} — ${quote.customerName}: ${cambios.map(c => c.campo).join(", ")}`,
        detalle:    cambios,
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("admin/cotizaciones PATCH:", e?.message);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(req.url);
    const borradoTotal = searchParams.get("hard") === "1";
    const antes = await prisma.tourQuote.findUnique({ where: { id: params.id } });
    if (borradoTotal) {
      await prisma.tourQuote.delete({ where: { id: params.id } });
    } else {
      await prisma.tourQuote.update({ where: { id: params.id }, data: { status: "expirada" } });
    }

    await registrarEnBitacora({
      accion:     borradoTotal ? "eliminó" : "modificó",
      entidad:    "cotización",
      referencia: antes?.quoteNumber,
      resumen:    antes
        ? `Cotización ${antes.quoteNumber} — ${antes.customerName}, ${pesos(antes.totalAmount)}` +
          (borradoTotal ? " (borrada de la base)" : " marcada como expirada")
        : `Cotización ${params.id} (ya no estaba en la base)`,
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("admin/cotizaciones DELETE:", e?.message);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
