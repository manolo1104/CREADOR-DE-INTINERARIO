import { NextRequest, NextResponse } from "next/server";
import { sesionActual } from "@/lib/admin/sesion";
import type { Actor } from "@/lib/admin/bitacora";
import { montoCobrado } from "@/lib/admin/dinero";
import { origenValido } from "@/lib/origenReserva";
import { convertirCotizacionEnReserva, esErrorCotizacion } from "@/lib/cotizaciones/convertir";
import { pasoTrasConvertir } from "@/lib/cotizaciones/reglasConversion";

export const dynamic = "force-dynamic";

const texto = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/**
 * «Convertir a reserva» del panel (lote 1 de la auditoría, 5 nov 2026).
 *
 * Antes el navegador creaba la reserva con el POST de Reservas y DESPUÉS
 * marcaba la cotización: una pestaña vieja, dos personas a la vez o la liga
 * pagada que ya la había convertido sola hacían una segunda reserva del mismo
 * viaje, y el anticipo se capturaba otra vez. Ahora la crea el servidor con
 * `convertirCotizacionEnReserva`: candado sobre la cotización, la marca en la
 * misma transacción y, si ya tenía reserva, contesta ESA sin crear otra.
 *
 * Recibe lo que la cotización no trae (por dónde entró, idioma, guía, lugar de
 * recogida y el contacto como quedó en el cuadro) y si ya pagó. Contesta la
 * reserva, lo cobrado y qué sigue (`abrirCobro`, `mensaje`). Si algo no cuadra
 * (vencida, el mismo cliente ya tiene otra reserva…), 409 con `puedeForzar`:
 * quien convierte lo lee y decide «Crear de todos modos» (`forzar`).
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json().catch(() => ({}));
    const sesion = await sesionActual();
    const actor: Actor = sesion
      ? { usuario: sesion.user, nombre: sesion.nombre, rol: sesion.rol }
      : { usuario: "desconocido", nombre: "Desconocido", rol: "?" };
    const yaPago = body?.yaPago === true;

    const conv = await convertirCotizacionEnReserva(params.id, {
      desde:       "panel",
      actor,
      forzar:      body?.forzar === true,
      // El cuadro obliga a elegirlo; si una llamada no lo manda, «por confirmar».
      origen:      origenValido(body?.origen, "por_confirmar"),
      idiomaTour:  body?.idiomaTour === "en" ? "en" : body?.idiomaTour === "es" ? "es" : null,
      guia:        texto(body?.guia, 80) || null,
      pickupLugar: texto(body?.pickupLugar, 200),
      contacto:    {
        nombre:   texto(body?.customerName, 120),
        correo:   texto(body?.customerEmail, 160),
        telefono: texto(body?.customerPhone, 40),
      },
    });

    const b = conv.reserva;
    const cobrado = montoCobrado(b);
    const paso = pasoTrasConvertir({
      nueva: conv.nueva, yaPago, folio: b.confirmationNumber, cobrado, total: b.totalAmount,
      cancelada: b.status === "cancelled", abonadoPorLiga: conv.abonadoPorLiga,
    });
    return NextResponse.json({
      ok:     true,
      nueva:  conv.nueva,
      // Lo que necesita «Registrar cobro» (el `_meta` lleva el anticipo acordado).
      reserva: {
        id: b.id, confirmationNumber: b.confirmationNumber, customerName: b.customerName, status: b.status,
        totalAmount: b.totalAmount, depositoPagado: b.depositoPagado, stripePaymentIntentId: b.stripePaymentIntentId,
        createdAt: b.createdAt, lineItems: b.lineItems,
      },
      cotizacion:     { id: conv.cotizacion.id, status: conv.cotizacion.status },
      cobrado,
      abonadoPorLiga: conv.abonadoPorLiga,
      avisos:         conv.avisos,
      abrirCobro:     paso.abrirCobro,
      mensaje:        paso.mensaje,
    });
  } catch (e: unknown) {
    if (esErrorCotizacion(e)) {
      return NextResponse.json({ error: e.message, puedeForzar: e.status === 409 }, { status: e.status });
    }
    console.error("admin/cotizaciones/convertir:", (e as Error)?.message);
    return NextResponse.json({ error: "No se pudo crear la reserva. Intenta de nuevo." }, { status: 500 });
  }
}
