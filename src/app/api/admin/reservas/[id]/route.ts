import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { origenValido } from "@/lib/origenReserva";
import {
  registrarEnBitacora, camposCambiados, ETIQUETAS_RESERVA, pesos,
} from "@/lib/admin/bitacora";
import { sesionActual } from "@/lib/admin/sesion";
import { puedeHacer } from "@/lib/admin/usuarios";
import { anularCobro } from "@/lib/admin/cobros";

export const dynamic = "force-dynamic";

const BOOKING_FIELDS = [
  "tourId", "tourName", "tourSlug", "tourDate", "adults", "children",
  "totalAmount", "depositoPagado", "promoCode", "promoDiscount",
  "customerName", "customerEmail", "customerPhone", "notes",
  "lineItems", "packageItems", "extraItems", "status",
  "pagoProveedor", "pagoProveedorMonto", "pagoProveedorFecha", "pagoProveedorNota",
  "guia", "idiomaTour",
] as const;

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    // Solo actualizar campos permitidos que vengan en el body (update parcial).
    const data: Record<string, unknown> = { updatedAt: new Date() };
    for (const k of BOOKING_FIELDS) {
      if (body[k] !== undefined) data[k] = body[k];
    }
    // El resto de la lista se copia tal cual; el origen no, porque alimenta el
    // desglose de ingresos y una cadena libre lo convertiría en otra columna
    // sin agrupar.
    if (body.origen !== undefined) data.origen = origenValido(body.origen);
    // 🔴 Lo cobrado sale de los renglones de cobro (`cobros.ts`), con método y
    // comprobante. La pantalla ya no lo manda, pero la API lo aceptaba de
    // cualquier rol: se podía «cobrar» o «des-cobrar» sin dejar renglón. Solo
    // un socio o el dueño lo corrigen a mano.
    const sesion = await sesionActual();
    if (data.depositoPagado !== undefined && !(sesion && puedeHacer(sesion.rol, "anularMovimiento"))) {
      delete data.depositoPagado;
    }
    // Foto de cómo estaba ANTES, para poder contar qué cambió en la bitácora.
    const antes = await prisma.tourBooking.findUnique({ where: { id: params.id } });

    // 🔴 Un lugar del viaje CDMX–Xilitla solo cambia de fecha o de personas
    // desde Salidas, que pasa por el candado del cupo. Desde aquí se podría
    // mover a alguien a una salida llena sin que nada lo frenara.
    if (antes?.salidaId) {
      const cambia = (k: "tourDate" | "adults" | "children") => data[k] !== undefined && data[k] !== antes[k];
      if (cambia("tourDate") || cambia("adults") || cambia("children")) {
        return NextResponse.json(
          { error: "Esta reserva es del viaje CDMX–Xilitla: la fecha y las personas se cambian desde Salidas → Mover." },
          { status: 409 },
        );
      }
      delete data.tourId; delete data.tourName; delete data.tourSlug;
      // Del `lineItems` que mande el panel solo se toma el `_meta` (notas,
      // método): el renglón del viaje se queda como estaba.
      if (data.lineItems !== undefined) {
        const nuevoMeta = Array.isArray(data.lineItems) ? (data.lineItems as any[]).find((l) => l && l._meta) : null;
        const viejas = Array.isArray(antes.lineItems) ? (antes.lineItems as any[]) : [];
        data.lineItems = [
          { ...(viejas.find((l) => l && l._meta) ?? { _meta: true }), ...(nuevoMeta ?? {}), salidaId: antes.salidaId },
          ...viejas.filter((l) => l && !l._meta),
        ];
      }
    }
    const updated = await prisma.tourBooking.update({
      where: { id: params.id },
      data,
    });

    const cambios = camposCambiados(antes as any, data, ETIQUETAS_RESERVA);
    if (cambios.length) {
      await registrarEnBitacora({
        accion:     "modificó",
        entidad:    "reserva",
        referencia: updated.confirmationNumber,
        resumen:    `Reserva ${updated.confirmationNumber} — ${updated.customerName}: ${cambios.map(c => c.campo).join(", ")}`,
        detalle:    cambios,
      });
    }
    return NextResponse.json({ ok: true, updated });
  } catch (e: any) {
    console.error("admin/reservas/[id]:", e?.message);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Eliminación completa de la base de datos. La evidencia del pago al
    // proveedor vive en otra tabla sin llave foránea, así que se borra a mano:
    // si no, quedarían bytes huérfanos ocupando espacio para siempre.
    // Se lee antes de borrar: después ya no hay a quién nombrar en la bitácora.
    const antes = await prisma.tourBooking.findUnique({ where: { id: params.id } });

    // 🔴 Los cobros no tienen llave foránea: al borrar la reserva quedaban
    // huérfanos, seguían contando como efectivo en mano en los cortes y
    // desaparecían de Finanzas. Si tiene cobros vivos, solo un socio o el dueño
    // la borra, y sus cobros se ANULAN con motivo (queda rastro); Operación la
    // cancela en vez de borrarla.
    const sesion = await sesionActual();
    const cobrosVivos = await prisma.movimiento.findMany({
      where:  { reservaId: params.id, tipo: "cobro", anulado: false },
      select: { id: true },
    });
    if (cobrosVivos.length) {
      if (!sesion || !puedeHacer(sesion.rol, "anularMovimiento")) {
        return NextResponse.json(
          { error: "Esta reserva tiene cobros registrados. Cámbiala a «cancelada» o pídele a un socio que la elimine." },
          { status: 403 },
        );
      }
      for (const c of cobrosVivos) {
        await anularCobro(c.id, `Reserva ${antes?.confirmationNumber ?? params.id} eliminada`, sesion.nombre);
      }
    }

    await prisma.evidencia.deleteMany({ where: { bookingId: params.id } });
    await prisma.tourBooking.delete({ where: { id: params.id } });

    await registrarEnBitacora({
      accion:     "eliminó",
      entidad:    "reserva",
      referencia: antes?.confirmationNumber,
      resumen:    antes
        ? `Reserva ${antes.confirmationNumber} — ${antes.customerName}, ${antes.tourName || "sin tour"} el ${antes.tourDate || "sin fecha"}, ${pesos(antes.totalAmount)}`
        : `Reserva ${params.id} (ya no estaba en la base)`,
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("admin/reservas/[id]:", e?.message);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
