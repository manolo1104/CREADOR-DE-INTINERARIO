import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { origenValido } from "@/lib/origenReserva";
import {
  registrarEnBitacora, camposCambiados, ETIQUETAS_RESERVA, pesos,
} from "@/lib/admin/bitacora";
import { sesionActual } from "@/lib/admin/sesion";
import { puedeHacer } from "@/lib/admin/usuarios";
import { sellarEnLineItems, resumenEvento } from "@/lib/admin/descuento";
import {
  canjearCodigoCumple, codigoCumpleAlGuardar, codigoDeLineas, liberarCodigoCumple, liberarCodigosDeFolio,
} from "@/lib/encuestas/cumple";
import { hoyMX } from "@/lib/dates";
import { motivoParaGuardar } from "@/lib/admin/cancelacion";
import { leadDesdeReserva, leadTrasCancelarReserva, leadTrasReactivarReserva } from "@/lib/admin/crmDatos";

export const dynamic = "force-dynamic";

const BOOKING_FIELDS = [
  "tourId", "tourName", "tourSlug", "tourDate", "adults", "children",
  "totalAmount", "depositoPagado", "promoCode", "promoDiscount",
  "customerName", "customerEmail", "customerPhone", "notes",
  "lineItems", "packageItems", "extraItems", "status", "motivoCancelacion",
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
    // El descuento: si cambió, queda sellado con quién y cuándo, y en su
    // historial; si no, se queda el sello de antes (ver `descuento.ts`).
    let eventoDescuento = null;
    if (data.lineItems !== undefined) {
      const sellado = sellarEnLineItems(data.lineItems, antes?.lineItems ?? [], sesion?.nombre ?? "Desconocido");
      data.lineItems = sellado.lineItems;
      eventoDescuento = sellado.evento;
    }
    // El código de cumpleaños: se canjea si es nuevo, se libera si se quitó.
    let resumenCumple: string | null = null;
    let canjeado: string | null = null;
    let porLiberar: string | null = null;
    if (data.lineItems !== undefined && antes) {
      const r = await codigoCumpleAlGuardar(data.lineItems, antes.lineItems, antes.confirmationNumber, hoyMX());
      if (!r.ok) return NextResponse.json({ error: r.error }, { status: 409 });
      ({ resumen: resumenCumple, canjeado, porLiberar } = r);
    }
    // Cancelar suelta el código (el regalo le vuelve a servir al cliente);
    // reactivar una cancelada lo vuelve a tomar, si nadie más lo usó.
    const cancela   = !!antes && data.status === "cancelled" && antes.status !== "cancelled";
    const reactiva  = !!antes && data.status !== undefined && data.status !== "cancelled" && antes.status === "cancelled";
    // Cancelar exige el motivo (3 nov 2026): el panel manda `motivo` + `motivoDetalle`
    // o ya el texto armado en `motivoCancelacion`. Reactivar lo limpia.
    if (cancela) {
      const motivo = typeof data.motivoCancelacion === "string" && data.motivoCancelacion.trim()
        ? String(data.motivoCancelacion).trim().slice(0, 220)
        : motivoParaGuardar(body.motivo, body.motivoDetalle);
      if (!motivo) {
        return NextResponse.json({ error: "Para cancelar hay que decir el motivo." }, { status: 400 });
      }
      data.motivoCancelacion = motivo;
    }
    if (reactiva) data.motivoCancelacion = null;
    if (reactiva && antes) {
      const codigo = codigoDeLineas(data.lineItems !== undefined ? data.lineItems : antes.lineItems);
      if (codigo && codigo !== canjeado) {
        const r = await canjearCodigoCumple(codigo, antes.confirmationNumber, hoyMX());
        if (!r.ok) {
          if (canjeado) await liberarCodigoCumple(canjeado, antes.confirmationNumber);
          return NextResponse.json({ error: `${r.error} Quítalo de la reserva antes de reactivarla.` }, { status: 409 });
        }
        canjeado = codigo;
      }
    }
    const updated = await prisma.tourBooking.update({
      where: { id: params.id },
      data,
    }).catch(async (e) => {
      // No se guardó: el código recién tomado se suelta y el de antes se queda.
      if (canjeado && antes) await liberarCodigoCumple(canjeado, antes.confirmationNumber);
      throw e;
    });
    if (porLiberar) await liberarCodigoCumple(porLiberar, updated.confirmationNumber);
    // Su lead: cancelar su única reserva viva lo pierde con ese motivo; reactivarla lo regresa.
    if (cancela) await leadTrasCancelarReserva(updated.id, sesion?.nombre ?? "Desconocido");
    if (reactiva) await leadTrasReactivarReserva(updated.id);
    // Editada (total, pagos, fechas): su lead se pone al día; nunca baja de etapa.
    if (!cancela && !reactiva && updated.status !== "cancelled") await leadDesdeReserva(updated.id, `reserva ${updated.confirmationNumber} editada`);
    if (cancela && (await liberarCodigosDeFolio(updated.confirmationNumber))) {
      resumenCumple = [resumenCumple, "al cancelarla se liberó su código de cumpleaños"].filter(Boolean).join(" · ");
    }
    if (eventoDescuento || resumenCumple) {
      await registrarEnBitacora({
        accion:     "modificó",
        entidad:    "reserva",
        referencia: updated.confirmationNumber,
        resumen:    `Reserva ${updated.confirmationNumber} — ${updated.customerName}: `
          + [eventoDescuento ? resumenEvento(eventoDescuento) : null, resumenCumple].filter(Boolean).join(" · "),
      });
    }

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

/**
 * Las reservas ya NO se borran (3 nov 2026). Antes esta ruta eliminaba la fila
 * y anulaba sus cobros; en la línea base el panel decía «0 canceladas» aunque
 * sí las hubo, porque se borraban. Ahora se cancelan con motivo y queda el
 * rastro en la reserva y en la bitácora. Se deja la ruta para que un panel
 * viejo en caché reciba una respuesta clara, no un 404.
 */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const antes = await prisma.tourBooking.findUnique({ where: { id: params.id }, select: { confirmationNumber: true } }).catch(() => null);
  await registrarEnBitacora({
    accion:     "modificó",
    entidad:    "reserva",
    referencia: antes?.confirmationNumber ?? params.id,
    resumen:    `Intento de borrar la reserva ${antes?.confirmationNumber ?? params.id}: las reservas no se borran, se cancelan con motivo`,
  });
  return NextResponse.json(
    { error: "Las reservas no se borran: cámbiala a «Cancelada» y di el motivo." },
    { status: 403 },
  );
}
