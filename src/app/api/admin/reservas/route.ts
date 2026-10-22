import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cerrarCarritosDe, toursDeReserva } from "@/lib/cerrarCarrito";
import { origenValido } from "@/lib/origenReserva";
import { registrarEnBitacora, pesos } from "@/lib/admin/bitacora";
import { sesionActual } from "@/lib/admin/sesion";
import { sellarEnLineItems, resumenEvento } from "@/lib/admin/descuento";
import { codigoCumpleAlGuardar, liberarCodigoCumple } from "@/lib/encuestas/cumple";
import { hoyMX } from "@/lib/dates";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.toLowerCase() || "";
    const bookings = await prisma.tourBooking.findMany({ orderBy: { createdAt: "desc" } });
    const filtered = bookings.filter(b => !search ||
      [b.customerName, b.customerEmail, b.confirmationNumber, b.tourName]
        .some(v => v?.toLowerCase().includes(search))
    );
    return NextResponse.json(filtered);
  } catch (e: any) { console.error("admin/reservas:", e?.message); return NextResponse.json({ error: "Error interno" }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body?.confirmationNumber || !body?.customerName) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
    }
    // El descuento se sella aquí con quién lo puso (ver `descuento.ts`).
    const sesion = await sesionActual();
    const sellado = sellarEnLineItems(body.lineItems, null, sesion?.nombre ?? "Desconocido");
    // El código de cumpleaños se canjea ANTES de crear: si ya se usó, no se
    // guarda una reserva con un descuento que no le toca.
    const folio = String(body.confirmationNumber);
    const cumple = await codigoCumpleAlGuardar(sellado.lineItems, null, folio, hoyMX());
    if (!cumple.ok) return NextResponse.json({ error: cumple.error }, { status: 409 });
    // Whitelist de campos permitidos (evita asignación masiva de columnas inesperadas).
    const booking = await prisma.tourBooking.create({
      data: {
        confirmationNumber:    String(body.confirmationNumber),
        tourId:                body.tourId    ?? "",
        tourName:              body.tourName  ?? "",
        tourSlug:              body.tourSlug  ?? "",
        tourDate:              body.tourDate  ?? "",
        adults:                Number(body.adults)   || 1,
        children:              Number(body.children) || 0,
        totalAmount:           Math.round(Number(body.totalAmount) || 0),
        depositoPagado:        Math.round(Number(body.depositoPagado) || 0),
        promoCode:             body.promoCode || null,
        promoDiscount:         Number(body.promoDiscount) || 0,
        stripePaymentIntentId: body.stripePaymentIntentId || null,
        customerName:          String(body.customerName),
        customerEmail:         body.customerEmail || "",
        customerPhone:         body.customerPhone || null,
        notes:                 body.notes || null,
        lineItems:             (sellado.lineItems as any) ?? undefined,
        packageItems:          body.packageItems ?? undefined,
        extraItems:            body.extraItems   ?? undefined,
        status:                body.status || "paid",
        guia:                  body.guia ? String(body.guia).slice(0, 80) : null,
        idiomaTour:            body.idiomaTour === "en" ? "en" : "es",
        // Una reserva capturada a mano casi nunca entró por la web: por eso el
        // formulario la marca y aquí solo se normaliza.
        origen:                origenValido(body.origen),
      },
    }).catch(async (e) => {
      // No se creó: el código vuelve a quedar libre.
      if (cumple.canjeado) await liberarCodigoCumple(cumple.canjeado, folio);
      throw e;
    });
    // La venta ya está cerrada: apaga el carrito abandonado que la originó.
    // Sin esto el cron de recuperación le sigue escribiendo "¿Apartamos tu
    // lugar?" a alguien que ya pagó — y este panel es justo por donde entran
    // las ventas de los links de pago manuales.
    const cerrados = await cerrarCarritosDe(booking.customerEmail, toursDeReserva(body));
    if (cerrados) {
      console.log(`🛟  admin/reservas: ${cerrados} carrito(s) cerrados para ${booking.customerEmail}`);
    }

    await registrarEnBitacora({
      accion:     "creó",
      entidad:    "reserva",
      referencia: booking.confirmationNumber,
      resumen:    `Reserva ${booking.confirmationNumber} — ${booking.customerName}, ${booking.tourName || "sin tour"} el ${booking.tourDate || "sin fecha"}, ${pesos(booking.totalAmount)}`
        + (sellado.evento ? ` · ${resumenEvento(sellado.evento)}` : "")
        + (cumple.resumen ? ` · ${cumple.resumen}` : ""),
    });

    return NextResponse.json({ ok: true, id: booking.id, carritosCerrados: cerrados });
  } catch (e: any) { console.error("admin/reservas:", e?.message); return NextResponse.json({ error: "Error interno" }, { status: 500 }); }
}
