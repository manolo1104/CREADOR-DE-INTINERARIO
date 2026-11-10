import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registrarEnBitacora, pesos } from "@/lib/admin/bitacora";
import { sesionActual } from "@/lib/admin/sesion";
import { sellarEnLineItems, resumenEvento } from "@/lib/admin/descuento";
import { leadDesdeCotizacion, leadParaCotizacionNueva } from "@/lib/admin/crmDatos";
import { sesionVeCostos } from "@/lib/admin/permisos";
import { conservarCostosExtras, sinCostosDeExtras } from "@/lib/admin/extras";
import { leerPreciosExtras } from "@/lib/admin/preciosExtras";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const quotes = await prisma.tourQuote.findMany({ orderBy: { createdAt: "desc" } });
    // Sin el costo de los extras para quien no ve costos (lote 8, 10 nov 2026).
    if (!(await sesionVeCostos(await sesionActual()))) return NextResponse.json(quotes.map(sinCostosDeExtras));
    return NextResponse.json(quotes);
  } catch (e: any) {
    console.error("admin/cotizaciones GET:", e?.message);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body?.customerName || !body?.tourSlug) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
    }
    const quoteNumber = "COT-" + Date.now().toString(36).toUpperCase();
    // El descuento se sella aquí con quién lo puso (ver `descuento.ts`).
    const sesion  = await sesionActual();
    // En las cotizaciones el `_meta` de precio va en `packageItems`.
    const sellado = sellarEnLineItems(body.packageItems, null, sesion?.nombre ?? "Desconocido");
    // Quien no ve costos no los pone: los extras nuevos toman el del Cotizador (lote 8).
    const extraItems = body.extraItems !== undefined && !(await sesionVeCostos(sesion))
      ? conservarCostosExtras(body.extraItems, null, await leerPreciosExtras())
      : body.extraItems;
    // Whitelist de campos permitidos.
    const quote = await prisma.tourQuote.create({
      data: {
        quoteNumber,
        tourName:      body.tourName  ?? "",
        tourSlug:      body.tourSlug  ?? "",
        tourDate:      body.tourDate  ?? "",
        adults:        Number(body.adults)   || 1,
        children:      Number(body.children) || 0,
        totalAmount:   Math.round(Number(body.totalAmount) || 0),
        customerName:  String(body.customerName),
        customerEmail: body.customerEmail || "",
        customerPhone: body.customerPhone || null,
        notes:         body.notes || null,
        lineItems:     body.lineItems    ?? undefined,
        packageItems:  (sellado.lineItems as any) ?? undefined,
        extraItems:    (extraItems as any) ?? undefined,
        status:        "borrador",
      },
    });
    // Creada desde la ficha de un lead (o la Bandeja): queda enlazada a ese lead
    // si sigue abierto. Si ya está Operado o Perdido, la venta nueva va a un lead
    // abierto de esa persona o a uno nuevo (5 nov 2026). Después de guardar la
    // cotización, para no dejar un lead vacío si guardarla falla.
    const quien = sesion?.nombre ?? "Desconocido";
    const destino = body.oportunidadId ? await leadParaCotizacionNueva(body.oportunidadId, quien).catch(() => null) : null;
    if (destino) await prisma.tourQuote.update({ where: { id: quote.id }, data: { oportunidadId: destino.id } });
    await registrarEnBitacora({
      accion:     "creó",
      entidad:    "cotización",
      referencia: quote.quoteNumber,
      resumen:    `Cotización ${quote.quoteNumber} — ${quote.customerName}, ${quote.tourName || "sin tour"} el ${quote.tourDate || "sin fecha"}, ${pesos(quote.totalAmount)}`
        + (sellado.evento ? ` · ${resumenEvento(sellado.evento)}` : ""),
    });

    // Toda cotización nace con su lead en «Calificado» (3 nov 2026): el de esa
    // persona si ya tenía uno abierto, o uno nuevo con estos datos.
    const oportunidadId = await leadDesdeCotizacion(quote.id, "calificado", quien, `cotización ${quote.quoteNumber} creada`);

    return NextResponse.json({ ok: true, id: quote.id, quoteNumber, oportunidadId, leadNuevo: !!destino?.nuevo });
  } catch (e: any) {
    console.error("admin/cotizaciones POST:", e?.message);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
