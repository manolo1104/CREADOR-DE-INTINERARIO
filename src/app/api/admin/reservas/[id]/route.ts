import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { origenValido } from "@/lib/origenReserva";
import { tipoFolio } from "@/lib/admin/folio";
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
import { leadDesdeReserva, leadTrasCancelarReserva, leadTrasReactivarReserva, recalcularLead } from "@/lib/admin/crmDatos";
import { motivoNoSeElimina } from "@/lib/admin/borrarReserva";
import { asegurarHistorico, sincronizarDeposito } from "@/lib/admin/cobros";
import { cobradoAFijarAntesDeEditar, montoCobrado } from "@/lib/admin/dinero";
import { apagarLigasDe } from "@/lib/admin/linksPago";
import { lineasDe } from "@/lib/admin/reserva";
import { NO_CUENTAN, explicarSinLugar, pedidosQueCrecen, pedidosSinCupo } from "@/lib/cupoTour";
import { avisoSobrecupo } from "@/lib/cotizaciones/reglasConversion";
import { identidadDePaqueteAlEditar, notasConAviso, totalParaGuardar } from "@/lib/admin/reservaEdicion";
import { getPaquete } from "@/lib/paquetes";
import { claveDeSalida, diasDeTourDe } from "@/lib/admin/salidas";
import { reflejarGuiaEnSalidas } from "@/lib/admin/registroSalidaDatos";
import { sesionVeCostos } from "@/lib/admin/permisos";
import { conservarCostosExtras, sinCostosDeExtras } from "@/lib/admin/extras";
import { leerPreciosExtras } from "@/lib/admin/preciosExtras";

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
    // 🔴 El total es un entero ≥ 0 (lote 5, 5 nov 2026): un NaN del cuadro
    // viajaba como null y salía «Error interno» sin decir qué pasaba.
    if (data.totalAmount !== undefined) {
      const total = totalParaGuardar(data.totalAmount);
      if (total === null) {
        return NextResponse.json({ error: "El total de la reserva no es válido. Revisa los renglones y el precio antes de guardar." }, { status: 400 });
      }
      data.totalAmount = total;
    }
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
    // «Web» = compró en el sitio (folio HP del checkout). Una reserva hecha en
    // el panel no se vuelve «web» al editarla: una pestaña abierta antes del
    // 18 nov no conoce «por confirmar» y lo mandaba como «web» (19 nov 2026).
    if (antes && data.origen === "web" && antes.origen !== "web" && tipoFolio(antes.confirmationNumber) !== "web") delete data.origen;
    // Quien no ve costos no los cambia: cada extra conserva el que tenía (lote 8, 10 nov 2026).
    const veCostosQuien = await sesionVeCostos(sesion);
    if (data.extraItems !== undefined && !veCostosQuien) {
      data.extraItems = conservarCostosExtras(data.extraItems, antes?.extraItems, await leerPreciosExtras());
    }

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
    // 🔴 Una reserva de paquete sigue siendo ese paquete (lote 5, 5 nov 2026):
    // el cuadro mandaba el slug, el id y el nombre del primer tour, y el
    // paquete dejaba de contar en su cupo y su correo enlazaba a /tours/….
    if (antes && !antes.salidaId && getPaquete(antes.tourSlug)) {
      Object.assign(data, identidadDePaqueteAlEditar(antes, data));
    }
    // 🔴 Mover de fecha o sumar personas revisa el cupo, como al reactivar
    // (lote 5, 5 nov 2026): antes se guardaba sin preguntar y quedaban 14 en
    // una salida de 12, o dos grupos en el Edén el mismo día. Pregunta y, si se
    // guarda de todos modos (a veces se suma una unidad), queda la nota.
    // Antes del código de cumpleaños: un 409 aquí no deja nada canjeado.
    if (antes && !antes.salidaId && !NO_CUENTAN.includes(antes.status) && data.status !== "cancelled") {
      const crecen = pedidosQueCrecen(antes, {
        tourSlug:  String(data.tourSlug ?? antes.tourSlug),
        tourDate:  String(data.tourDate ?? antes.tourDate),
        adults:    Number(data.adults ?? antes.adults),
        children:  Number(data.children ?? antes.children),
        lineItems: data.lineItems !== undefined ? data.lineItems : antes.lineItems,
      });
      const sinLugar = crecen.length ? await pedidosSinCupo(crecen, { excluirReserva: antes.id }).catch(() => []) : [];
      if (sinLugar.length && body.forzarCupo !== true) {
        return NextResponse.json({
          error: `Ya no cabe: ${sinLugar.map(explicarSinLugar).join("; ")}. ¿Guardar de todos modos?`,
          sePuedeForzar: true,
        }, { status: 409 });
      }
      if (sinLugar.length) {
        data.notes = notasConAviso(data.notes !== undefined ? String(data.notes ?? "") : antes.notes, avisoSobrecupo(sinLugar, "editada en el panel"));
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
    // 🔴 Reactivar no revisaba el cupo (revisión del 4 nov 2026): una salida llena
    // se sobrevendía sin aviso. Ahora se pregunta; con `forzarCupo` se reactiva
    // igual (a veces se suma una camioneta). Los lugares del viaje CDMX tienen su
    // propio cupo: también se pide confirmar.
    if (reactiva && antes && body.forzarCupo !== true) {
      if (antes.salidaId) {
        return NextResponse.json({ error: "Es un lugar del viaje CDMX: revisa en Viaje CDMX que todavía haya lugar antes de reactivarlo.", sePuedeForzar: true }, { status: 409 });
      }
      const lineas = lineasDe(antes as never).filter(l => l.tourSlug && l.tourDate);
      const pedidos = (lineas.length ? lineas : [{ tourSlug: antes.tourSlug, tourDate: antes.tourDate, adults: antes.adults, childrenMid: antes.children, childrenSmall: 0 }])
        .map(l => ({ slug: String(l.tourSlug), fecha: String(l.tourDate), personas: Number(l.adults || 0) + Number((l as { childrenMid?: number }).childrenMid || 0) + Number((l as { childrenSmall?: number }).childrenSmall || 0) + Number((l as { infants?: number }).infants || 0) }));
      const sinLugar = await pedidosSinCupo(pedidos).catch(() => []);
      if (sinLugar.length) {
        return NextResponse.json({
          error: `Ya no cabe: ${sinLugar.map(s => `${s.slug} el ${s.fecha} (${s.personas} pers., ${s.estado === "cerrada" ? "fecha cerrada" : "sin lugar"})`).join("; ")}. ¿Reactivarla de todos modos?`,
          sePuedeForzar: true,
        }, { status: 409 });
      }
    }
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
    // 🔴 Cambia el total de una reserva sin renglones de cobro (reservas#5, 5 nov
    // 2026): lo que ya figura cobrado se fija ANTES con el total de antes. Una
    // vieja pagada por Stripe con depósito 0 cuenta como pagada al 100 % del
    // total VIGENTE: sin esto quedaba «pagada» sin cobrar lo que se sumó.
    if (antes && antes.status !== "cancelled" && data.totalAmount !== undefined) {
      const renglones = await prisma.movimiento.count({ where: { reservaId: antes.id, tipo: "cobro" } });
      if (cobradoAFijarAntesDeEditar(antes, Number(data.totalAmount) || 0, renglones) > 0) await asegurarHistorico(antes.id);
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
    // Su lead: cancelar su única reserva viva lo pierde con ese motivo; si le
    // queda otra, se pone al día con lo que sigue vivo (5 nov 2026).
    if (cancela) await leadTrasCancelarReserva(updated.id, sesion?.nombre ?? "Desconocido");
    // 🔴 Cancelada, sus ligas sin pagar —la del saldo y la del anticipo de su
    // cotización— dejan de poder pagarse (lote 3, 5 nov 2026). Antes el cliente
    // podía pagar una reserva cancelada y la regla pedía recordárselo. No lanza.
    const ligas = cancela
      ? await apagarLigasDe({ reservaIds: [updated.id], cotizacionIds: [updated.cotizacionId] }, `se canceló la reserva ${updated.confirmationNumber}`)
      : { apagadas: 0, fallidas: 0 };
    // El estado de pago lo dicen los cobros (revisión del 4 nov 2026): tras cambiar
    // el total, reactivarla o ponerle un estado a mano, se recalcula pagada ↔
    // pendiente. Solo si su dinero ya vive en cobros (las históricas no se tocan).
    if (updated.status !== "cancelled") {
      if ((await prisma.movimiento.count({ where: { reservaId: updated.id, tipo: "cobro" } })) > 0) await sincronizarDeposito(updated.id);
      else if (updated.status === "paid" || updated.status === "pending") {
        // Sin renglones de cobro, lo dice lo que figura cobrado (montoCobrado): ya
        // no se puede dejar «pagada» con $0 ni «pendiente» una liquidada.
        const debe = montoCobrado(updated) >= updated.totalAmount && updated.totalAmount > 0 ? "paid" : "pending";
        if (debe !== updated.status) await prisma.tourBooking.update({ where: { id: updated.id }, data: { status: debe } });
      }
    }
    // Un solo guía (lote 6, 10 nov 2026): el que se asigna aquí se refleja en
    // sus salidas (Salidas del día, Inicio, correo de las 7:30). No lanza.
    // Revisión (10 nov 2026): solo de hoy en adelante y sin pisar la salida que ya tiene otro guía.
    if (antes && (antes.guia ?? "").trim() !== (updated.guia ?? "").trim() && !NO_CUENTAN.includes(updated.status)) {
      const hoy = hoyMX();
      await reflejarGuiaEnSalidas(Array.from(new Set(diasDeTourDe(updated).filter(d => d.fecha >= hoy).map(claveDeSalida))), updated.guia, antes.guia);
    }
    // Reactivada: su lead se pone al día con TODAS sus reservas vivas, ya con el
    // dinero recalculado (si se perdió por ella, vuelve).
    if (reactiva) await leadTrasReactivarReserva(updated.id);
    // Editada (total, pagos, fechas): su lead se pone al día según el dinero.
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
    // Lo que quedó de verdad (el estado pudo cambiar al recalcular con los cobros).
    const final = (await prisma.tourBooking.findUnique({ where: { id: updated.id } })) ?? updated;
    return NextResponse.json({ ok: true, ligasApagadas: ligas.apagadas, updated: veCostosQuien ? final : sinCostosDeExtras(final) });
  } catch (e: any) {
    console.error("admin/reservas/[id]:", e?.message);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

/**
 * Eliminar una reserva (20 nov 2026, «habilita la eliminación de reservas»).
 * Del 3 al 20 nov no se borraban: se cancelaban con motivo, porque al borrarlas
 * la línea base decía «0 canceladas» aunque sí las hubo. Ahora se elimina SOLO
 * la que no tiene dinero vivo (pruebas, duplicados, errores de captura): la que
 * tiene cobros o gastos sin anular, una liga pagada o un pago en el sitio sigue
 * cancelándose con motivo (`motivoNoSeElimina`), para que Cobros y el corte
 * nunca se descuadren. Solo quien puede anular cobros (Manolo y socios).
 *
 * Todo en una transacción: sus comprobantes, sus cobros ya anulados, sus
 * seguimientos automáticos pendientes, su lugar apartado (se libera), sus ligas
 * sin pagar (se apagan en Stripe antes) y la cotización que la originó vuelve a
 * «Enviada» para poder borrarla o convertirla otra vez. Las encuestas se van solas
 * (cascada). Después el lead se recalcula y queda un renglón en la bitácora.
 */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const sesion = await sesionActual();
  if (!sesion || !puedeHacer(sesion.rol, "anularMovimiento")) {
    return NextResponse.json({ error: "Solo Manolo o un socio pueden eliminar reservas." }, { status: 403 });
  }
  const b = await prisma.tourBooking.findUnique({ where: { id: params.id } }).catch(() => null);
  if (!b) return NextResponse.json({ error: "Esa reserva ya no existe (alguien más la eliminó)." }, { status: 404 });

  const hechos = async () => {
    const [movimientosVivos, ligasPagadas] = await Promise.all([
      prisma.movimiento.count({ where: { reservaId: b.id, anulado: false } }),
      prisma.linkPago.count({ where: { reservaId: b.id, estado: "pagado" } }),
    ]);
    return { cobrado: montoCobrado(b), movimientosVivos, ligasPagadas, pagoStripe: !!b.stripePaymentIntentId };
  };
  const motivo = motivoNoSeElimina(await hechos());
  if (motivo) return NextResponse.json({ error: motivo }, { status: 409 });

  // Las ligas activas se apagan en Stripe antes (fuera de la transacción: llama a Stripe).
  await apagarLigasDe({ reservaIds: [b.id] }, `se eliminó la reserva ${b.confirmationNumber}`);

  try {
    await prisma.$transaction(async tx => {
      // Otra vez adentro: un pago pudo llegar mientras se apagaban las ligas.
      const [vivos, pagadas, fresca] = await Promise.all([
        tx.movimiento.count({ where: { reservaId: b.id, anulado: false } }),
        tx.linkPago.count({ where: { reservaId: b.id, estado: "pagado" } }),
        tx.tourBooking.findUnique({ where: { id: b.id } }),
      ]);
      if (!fresca) throw new Error("ya-no-existe");
      const otra = motivoNoSeElimina({ cobrado: montoCobrado(fresca), movimientosVivos: vivos, ligasPagadas: pagadas, pagoStripe: !!fresca.stripePaymentIntentId });
      if (otra) throw new Error(`no-se-elimina:${otra}`);

      await tx.evidencia.deleteMany({ where: { bookingId: b.id } });
      await tx.movimiento.deleteMany({ where: { reservaId: b.id, anulado: true } });
      await tx.linkPago.updateMany({ where: { reservaId: b.id }, data: { reservaId: null } });
      await tx.apartadoSalida.updateMany({ where: { bookingId: b.id }, data: { bookingId: null, estado: "liberado" } });
      await tx.tarea.deleteMany({ where: { estado: "pendiente", claveRegla: { contains: b.id } } });
      if (b.cotizacionId) {
        await tx.tourQuote.updateMany({ where: { id: b.cotizacionId, status: "aceptada" }, data: { status: "enviada", aceptadaEn: null } });
      }
      await tx.tourBooking.delete({ where: { id: b.id } });
    });
  } catch (e) {
    const m = (e as Error)?.message ?? "";
    if (m === "ya-no-existe") return NextResponse.json({ error: "Esa reserva ya no existe (alguien más la eliminó)." }, { status: 404 });
    if (m.startsWith("no-se-elimina:")) return NextResponse.json({ error: m.slice("no-se-elimina:".length) }, { status: 409 });
    console.error("eliminar reserva:", m);
    return NextResponse.json({ error: "No se pudo eliminar la reserva" }, { status: 500 });
  }

  await registrarEnBitacora({
    accion:     "eliminó",
    entidad:    "reserva",
    referencia: b.confirmationNumber,
    resumen:    `Eliminó la reserva ${b.confirmationNumber} de ${b.customerName} (${b.tourName}, ${b.tourDate}, total ${pesos(b.totalAmount)}, sin dinero cobrado)`,
  });
  if (b.oportunidadId) {
    await recalcularLead(b.oportunidadId, `se eliminó la reserva ${b.confirmationNumber}`).catch(e => console.error("recalcularLead tras eliminar:", (e as Error)?.message));
  }
  return NextResponse.json({ ok: true, folio: b.confirmationNumber });
}
