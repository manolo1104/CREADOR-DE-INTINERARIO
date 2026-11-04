import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  registrarEnBitacora, camposCambiados, ETIQUETAS_COTIZACION, pesos,
} from "@/lib/admin/bitacora";
import { sesionActual } from "@/lib/admin/sesion";
import { sellarEnLineItems, resumenEvento } from "@/lib/admin/descuento";
import { leadDesdeCotizacion, leadTrasBorrarCotizacion } from "@/lib/admin/crmDatos";

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
    // El descuento: sellado con quién y cuándo si cambió (ver `descuento.ts`).
    let eventoDescuento = null;
    // En las cotizaciones el `_meta` de precio va en `packageItems`.
    if (data.packageItems !== undefined) {
      const sesion  = await sesionActual();
      const sellado = sellarEnLineItems(data.packageItems, antes?.packageItems ?? [], sesion?.nombre ?? "Desconocido");
      data.packageItems = sellado.lineItems;
      eventoDescuento = sellado.evento;
    }
    const quote = await prisma.tourQuote.update({ where: { id: params.id }, data });
    if (eventoDescuento) {
      await registrarEnBitacora({
        accion:     "modificó",
        entidad:    "cotización",
        referencia: quote.quoteNumber,
        resumen:    `Cotización ${quote.quoteNumber} — ${quote.customerName}: ${resumenEvento(eventoDescuento)}`,
      });
    }

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
    // Su lead: si la cotización no tenía (las de antes del CRM), nace al
    // editarla; si quedó «enviada», sube a Cotizado. Nunca baja una etapa.
    // Si se editaron los datos (no solo el estado), lo que dice la cotización
    // pasa al lead: total, fecha, personas, tours y contacto.
    const editoDatos = ["totalAmount", "tourDate", "lineItems", "adults", "children", "customerName", "customerEmail", "customerPhone", "tourName"].some(k => data[k] !== undefined);
    await leadDesdeCotizacion(quote.id, quote.status === "enviada" ? "cotizado" : "calificado",
      (await sesionActual())?.nombre ?? "Desconocido", quote.status === "enviada" ? `cotización ${quote.quoteNumber} enviada` : `cotización ${quote.quoteNumber} editada`, editoDatos);
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
    let lead: "borrado" | "actualizado" | null = null;
    if (borradoTotal) {
      await prisma.tourQuote.delete({ where: { id: params.id } });
      // Su lead: se va con ella si solo existía por ella; si no, se anota y se pone al día.
      if (antes?.oportunidadId) lead = await leadTrasBorrarCotizacion(antes.oportunidadId, antes.quoteNumber, (await sesionActual())?.nombre ?? "Desconocido");
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
    return NextResponse.json({ ok: true, lead });
  } catch (e: any) {
    console.error("admin/cotizaciones DELETE:", e?.message);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
