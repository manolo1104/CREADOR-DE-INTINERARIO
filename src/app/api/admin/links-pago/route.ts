import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sesionActual } from "@/lib/admin/sesion";
import { registrarEnBitacora, pesos } from "@/lib/admin/bitacora";
import { crearLinkDePago, cancelarLinkDePago } from "@/lib/admin/linksPago";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET → los cobros, del más reciente al más viejo.
export async function GET() {
  try {
    const links = await prisma.linkPago.findMany({
      orderBy: { createdAt: "desc" },
      take: 120,
    });

    // El folio de la reserva, para poder decir "es el saldo de HP-123".
    const ids = links.map(l => l.reservaId).filter(Boolean) as string[];
    const reservas = ids.length
      ? await prisma.tourBooking.findMany({
          where:  { id: { in: ids } },
          select: { id: true, confirmationNumber: true, customerName: true },
        })
      : [];
    const folios: Record<string, { folio: string; cliente: string }> = {};
    for (const r of reservas) folios[r.id] = { folio: r.confirmationNumber, cliente: r.customerName };

    return NextResponse.json(links.map(l => ({
      ...l,
      folio:          l.reservaId ? folios[l.reservaId]?.folio ?? null : null,
      clienteReserva: l.reservaId ? folios[l.reservaId]?.cliente ?? null : null,
    })));
  } catch (e: any) {
    logger.error("links_pago_get_failed", { reason: e?.message });
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// POST → crear el cobro en Stripe.
export async function POST(req: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Los pagos no están configurados. Falta la clave de Stripe." },
        { status: 503 },
      );
    }

    const sesion = await sesionActual();
    if (!sesion) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const b = await req.json();
    const link = await crearLinkDePago(
      {
        titulo:    String(b?.titulo ?? ""),
        detalle:   b?.detalle ? String(b.detalle) : undefined,
        monto:     Number(b?.monto),
        cliente:   b?.cliente ? String(b.cliente) : undefined,
        nota:      b?.nota ? String(b.nota) : undefined,
        reservaId:    b?.reservaId ? String(b.reservaId) : undefined,
        cotizacionId: b?.cotizacionId ? String(b.cotizacionId) : undefined,
      },
      sesion.nombre,
    );

    await registrarEnBitacora({
      accion:  "creó",
      entidad: "cobro",
      resumen: `Liga de pago "${link.titulo}" por ${pesos(link.monto)}`,
    });

    return NextResponse.json({ ok: true, link });
  } catch (e: any) {
    // Los errores de validación son para el usuario; los de Stripe, para el log.
    const mensaje = e?.message ?? "No se pudo crear el cobro";
    const esDeUsuario = /monto|título|reserva|Escribe/i.test(mensaje);
    if (!esDeUsuario) logger.error("links_pago_create_failed", { reason: mensaje });
    return NextResponse.json(
      { error: esDeUsuario ? mensaje : "No se pudo crear el cobro. Revisa el log." },
      { status: esDeUsuario ? 400 : 500 },
    );
  }
}

// PATCH → cancelar un cobro que ya no debe pagarse.
export async function PATCH(req: NextRequest) {
  try {
    const sesion = await sesionActual();
    if (!sesion) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await req.json();
    const antes = await prisma.linkPago.findUnique({ where: { id: String(id) } });
    await cancelarLinkDePago(String(id));

    await registrarEnBitacora({
      accion:  "eliminó",
      entidad: "cobro",
      resumen: antes
        ? `Liga de pago "${antes.titulo}" de ${pesos(antes.monto)} cancelada`
        : `Liga de pago ${id} cancelada`,
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "No se pudo cancelar" }, { status: 400 });
  }
}
