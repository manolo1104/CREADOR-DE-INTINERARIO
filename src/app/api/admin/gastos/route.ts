import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sesionActual } from "@/lib/admin/sesion";
import { registrarEnBitacora, pesos } from "@/lib/admin/bitacora";
import { hoyMX } from "@/lib/dates";

export const dynamic = "force-dynamic";

const ES_FECHA = /^\d{4}-\d{2}-\d{2}$/;

// GET → los gastos de un rango (para el corte).
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const desde = searchParams.get("desde") || hoyMX();
    const hasta = searchParams.get("hasta") || hoyMX();
    const gastos = await prisma.gastoCorte.findMany({
      where:   { fecha: { gte: desde, lte: hasta } },
      orderBy: { fecha: "asc" },
    });
    return NextResponse.json(gastos);
  } catch (e: any) {
    console.error("admin/gastos GET:", e?.message);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// POST → capturar un gasto a mano.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const concepto = String(body?.concepto ?? "").trim().slice(0, 120);
    const monto    = Math.round(Number(body?.monto) || 0);
    const fecha    = String(body?.fecha ?? "");

    if (!concepto) return NextResponse.json({ error: "Falta el concepto" }, { status: 400 });
    if (monto <= 0) return NextResponse.json({ error: "El monto tiene que ser mayor a cero" }, { status: 400 });
    if (!ES_FECHA.test(fecha)) return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });

    // Si viene ligado a una salida, la reserva tiene que existir: un id
    // inventado dejaría el costo fuera de todos los cortes, sin avisar.
    const reservaId = body?.reservaId ? String(body.reservaId) : null;
    let folio: string | null = null;
    if (reservaId) {
      const reserva = await prisma.tourBooking.findUnique({
        where:  { id: reservaId },
        select: { confirmationNumber: true },
      });
      if (!reserva) return NextResponse.json({ error: "Esa reserva no existe" }, { status: 400 });
      folio = reserva.confirmationNumber;
    }

    const sesion = await sesionActual();
    const gasto = await prisma.gastoCorte.create({
      data: {
        fecha, concepto, monto, reservaId,
        nota:      body?.nota ? String(body.nota).slice(0, 300) : null,
        creadoPor: sesion?.nombre ?? null,
      },
    });

    await registrarEnBitacora({
      accion:     "creó",
      entidad:    "costo",
      referencia: folio ?? undefined,
      resumen:    folio
        ? `Costo "${concepto}" por ${pesos(monto)} en la reserva ${folio}`
        : `Gasto "${concepto}" por ${pesos(monto)} con fecha ${fecha}`,
    });

    return NextResponse.json({ ok: true, gasto });
  } catch (e: any) {
    console.error("admin/gastos POST:", e?.message);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// DELETE ?id=... → borrar un gasto capturado por error.
export async function DELETE(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Falta el id" }, { status: 400 });

    const antes = await prisma.gastoCorte.findUnique({ where: { id } });
    await prisma.gastoCorte.delete({ where: { id } });

    await registrarEnBitacora({
      accion:  "eliminó",
      entidad: "costo",
      resumen: antes
        ? `${antes.reservaId ? "Costo" : "Gasto"} "${antes.concepto}" de ${pesos(antes.monto)} (${antes.fecha})`
        : `Gasto ${id} (ya no estaba en la base)`,
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("admin/gastos DELETE:", e?.message);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
