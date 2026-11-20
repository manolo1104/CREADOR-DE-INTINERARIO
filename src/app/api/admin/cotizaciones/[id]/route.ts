import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  registrarEnBitacora, camposCambiados, ETIQUETAS_COTIZACION, pesos,
} from "@/lib/admin/bitacora";
import { sesionActual } from "@/lib/admin/sesion";
import { sellarEnLineItems, resumenEvento } from "@/lib/admin/descuento";
import { leadDesdeCotizacion, leadTrasBorrarCotizacion } from "@/lib/admin/crmDatos";
import { apagarLigasDe, crearSeguimientoUnico } from "@/lib/admin/linksPago";
import { tituloLigaSinDestino } from "@/lib/admin/ligasReglas";
import { anotarEnvioAlMarcar, avisoSoloLectura, lineItemsAlEditar, puedeRegresarAEnviada } from "@/lib/cotizaciones/reglasEnvio";
import { reservaVivaDeCotizacion } from "@/lib/cotizaciones/estadoCotizacion";
import { sesionVeCostos } from "@/lib/admin/permisos";
import { conservarCostosExtras } from "@/lib/admin/extras";
import { leerPreciosExtras } from "@/lib/admin/preciosExtras";

export const dynamic = "force-dynamic";

const QUOTE_FIELDS = [
  "tourName", "tourSlug", "tourDate", "adults", "children", "totalAmount",
  "customerName", "customerEmail", "customerPhone", "notes",
  "lineItems", "packageItems", "extraItems", "status",
] as const;

// 🔴 Ya no existe (19 nov 2026): otra pestaña o alguien más la eliminó. Antes
// el borrado tronaba con «Error interno» (500) y el panel decía «No se pudo
// eliminar» de algo que ya no estaba. Ahora es un 404 con estas palabras.
const YA_NO_EXISTE = "Esa cotización ya no existe: alguien más la eliminó. Recarga la página.";

/** P2025 de Prisma: el registro que se iba a cambiar o borrar ya no está. */
const yaNoEstaba = (e: unknown) => (e as { code?: unknown })?.code === "P2025";

/**
 * Por qué no se elimina una cotización que ya es una reserva viva (19 nov
 * 2026, igual que las reservas, que no se borran desde el 3 nov).
 */
const avisoEsReserva = (folio: string) =>
  `Esta cotización ya es la reserva ${folio}: no se elimina. Si el cliente ya no va, cancela la reserva con su motivo en Reservas.`;

/** Estados en que la cotización sigue viva: editarla lleva su lead a Cotizado. */
const VIVAS_PARA_LEAD = ["borrador", "enviada"];

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    // Solo actualizar campos permitidos que vengan en el body (update parcial).
    const data: Record<string, unknown> = {};
    for (const k of QUOTE_FIELDS) {
      if (body[k] !== undefined) data[k] = body[k];
    }
    const antes = await prisma.tourQuote.findUnique({ where: { id: params.id } });
    if (!antes) return NextResponse.json({ error: YA_NO_EXISTE }, { status: 404 });
    // Quien no ve costos no los cambia: cada extra conserva el que tenía (lote 8, 10 nov 2026).
    if (data.extraItems !== undefined && !(await sesionVeCostos(await sesionActual()))) {
      data.extraItems = conservarCostosExtras(data.extraItems, antes.extraItems, await leerPreciosExtras());
    }

    // 🔴 Una ACEPTADA ya no se edita (lote 4, 5 nov 2026, regla de Manolo): lo
    // que se opera es su reserva, y editarla le pasaba al lead fecha, tours y
    // monto que la reserva no tenía. Lo único que se le puede hacer es
    // «Regresar a Enviada», y solo si no es reserva ni tiene un pago por liga
    // (la que el cron de antes marcó aceptada por la reserva de OTRA cotización).
    let regresada = false;
    if (antes.status === "aceptada") {
      const soloEstado = Object.keys(data).every(k => k === "status") && body.venceEl === undefined;
      if (soloEstado && data.status === "enviada") {
        const reserva = await reservaVivaDeCotizacion(antes);
        const ligaPagada = (await prisma.linkPago.count({ where: { cotizacionId: antes.id, estado: "pagado" } })) > 0;
        const puede = puedeRegresarAEnviada(antes, { reservaFolio: reserva?.confirmationNumber ?? null, ligaPagada });
        if (!puede.ok) return NextResponse.json({ error: puede.motivo }, { status: 409 });
        // Deja de contar en el KPI «Cotización → reserva».
        data.aceptadaEn = null;
        regresada = true;
      } else if (!(soloEstado && (data.status === undefined || data.status === "aceptada"))) {
        const reserva = await reservaVivaDeCotizacion(antes);
        return NextResponse.json({ error: avisoSoloLectura(antes, reserva?.confirmationNumber ?? null) }, { status: 409 });
      }
    }

    // 🔴 El `_meta` de seguimiento lo manda el SERVIDOR (lote 4, 5 nov 2026):
    // del navegador solo se toman los renglones; la fecha límite cambia solo
    // si se movió a propósito (`venceEl`). Ver `lineItemsAlEditar`.
    const venceElNuevo = typeof body.venceEl === "string" ? body.venceEl : null;
    if (data.lineItems !== undefined || venceElNuevo) {
      data.lineItems = lineItemsAlEditar(data.lineItems ?? antes.lineItems, antes.lineItems, venceElNuevo);
    }
    // Cuándo se aceptó (KPI «Cotización → reserva a 14 días», 4 nov 2026): solo
    // la primera vez que pasa a «aceptada»; volver a guardarla no la mueve.
    if (data.status === "aceptada" && antes?.status !== "aceptada") data.aceptadaEn = new Date();
    // Un borrador marcado «Enviada» a mano: desde ahí cuenta «Cotización →
    // reserva» (lote 9, 10 nov 2026). Reactivar una vencida o regresar una
    // aceptada no es su primer envío y no la mueve (revisión del lote 9).
    if (anotarEnvioAlMarcar(antes, data.status)) data.enviadaEn = new Date();
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
    // Vencida o archivada a mano: su liga de anticipo deja de poder pagarse (lote 3, 5 nov 2026).
    if ((quote.status === "expirada" || quote.status === "archivada") && antes?.status !== quote.status) {
      await apagarLigasDe({ cotizacionIds: [quote.id] }, quote.status === "expirada" ? "la cotización venció" : "la cotización se archivó");
    }
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
    // editarla. Si sigue viva (borrador o enviada), sube a Cotizado: regla de
    // Manolo del 19 nov 2026, «si a un lead se le crea una cotización, que
    // pase a cotizado»; antes el borrador lo dejaba en Calificado. Vencida y
    // archivada, como siempre. Nunca baja una etapa (`subirA`). Si se editaron
    // los datos (no solo el estado), lo que dice la cotización pasa al lead:
    // total, fecha, personas, tours y contacto.
    const editoDatos = ["totalAmount", "tourDate", "lineItems", "adults", "children", "customerName", "customerEmail", "customerPhone", "tourName"].some(k => data[k] !== undefined);
    await leadDesdeCotizacion(quote.id, VIVAS_PARA_LEAD.includes(quote.status) ? "cotizado" : "calificado",
      (await sesionActual())?.nombre ?? "Desconocido",
      regresada ? `cotización ${quote.quoteNumber} regresó a Enviada` : quote.status === "enviada" ? `cotización ${quote.quoteNumber} enviada` : `cotización ${quote.quoteNumber} editada`, editoDatos);
    // El estado y los `lineItems` como quedaron: el panel los pone en su lista (lote 4).
    return NextResponse.json({ ok: true, status: quote.status, lineItems: quote.lineItems });
  } catch (e: any) {
    if (yaNoEstaba(e)) return NextResponse.json({ error: YA_NO_EXISTE }, { status: 404 });
    console.error("admin/cotizaciones PATCH:", e?.message);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/cotizaciones/:id          → «Marcar vencida» (status «expirada»)
 * DELETE /api/admin/cotizaciones/:id?hard=1   → eliminarla de la base
 *
 * Contesta (19 nov 2026; lo leen la lista de Cotizaciones y la ficha del lead):
 *  · 200 { ok: true, lead: "borrado" | "actualizado" | null, ligasApagadas, pagosSinReserva }
 *  · 404 { error }: ya no existe (antes era un 500).
 *  · 409 { error, reservaFolio }: con `hard=1`, ya es una reserva viva.
 *  · 409 { error }: sin `hard=1`, una aceptada no se marca vencida.
 *  · 500 { error }.
 */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(req.url);
    const borradoTotal = searchParams.get("hard") === "1";
    const antes = await prisma.tourQuote.findUnique({ where: { id: params.id } });
    if (!antes) return NextResponse.json({ error: YA_NO_EXISTE }, { status: 404 });
    // 🔴 La que ya es una reserva viva NO se elimina (19 nov 2026, decisión de
    // Manolo, igual que las reservas): borrarla dejaba la reserva y su liga
    // apuntando a una cotización que ya no existía, y el KPI «Cotización →
    // reserva» la perdía. Si el cliente ya no va, se cancela la reserva con su
    // motivo. Una aceptada cuya reserva se canceló sí se puede eliminar.
    if (borradoTotal) {
      const reserva = await reservaVivaDeCotizacion(antes);
      if (reserva) {
        return NextResponse.json({ error: avisoEsReserva(reserva.confirmationNumber), reservaFolio: reserva.confirmationNumber }, { status: 409 });
      }
    }
    let lead: "borrado" | "actualizado" | null = null;
    // 🔴 Sus ligas sin pagar se apagan (lote 3 de la auditoría, 5 nov 2026):
    // antes seguían vivas en el chat del cliente y, si las pagaba, el dinero
    // quedaba en Stripe sin reserva ni aviso.
    let ligas = { apagadas: 0, fallidas: 0 };
    // Un pago de su liga que todavía no está en ninguna reserva no se pierde al
    // borrarla: no se frena el borrado, pero Manolo recibe el seguimiento.
    const pagosSueltos = borradoTotal
      ? await prisma.linkPago.findMany({ where: { cotizacionId: params.id, estado: "pagado", reservaId: null } })
      : [];
    if (borradoTotal) {
      await prisma.tourQuote.delete({ where: { id: params.id } });
      // Su lead: se va con ella si solo existía por ella; si no, se anota y se pone al día.
      if (antes.oportunidadId) lead = await leadTrasBorrarCotizacion(antes.oportunidadId, antes.quoteNumber, (await sesionActual())?.nombre ?? "Desconocido");
      ligas = await apagarLigasDe({ cotizacionIds: [params.id] }, `se borró la cotización ${antes.quoteNumber}`);
      for (const l of pagosSueltos) {
        await crearSeguimientoUnico({
          titulo: tituloLigaSinDestino({ tipo: "cotizacion-borrada" }, { titulo: l.titulo, cliente: l.cliente ?? antes.customerName, monto: l.montoPagado ?? l.monto }),
          clave: `liga-sin-destino:${l.id}`, regla: "liga-sin-destino", creadaPor: "Cotizaciones",
        }).catch(e => console.error("seguimiento de liga pagada sin reserva:", (e as Error)?.message));
      }
    } else {
      // Una aceptada no se marca vencida (lote 4, 5 nov 2026): ya es venta.
      // El panel ya no ofrece el botón; esto frena una pestaña vieja.
      if (antes.status === "aceptada") {
        const reserva = await reservaVivaDeCotizacion(antes);
        return NextResponse.json({ error: avisoSoloLectura(antes, reserva?.confirmationNumber ?? null) }, { status: 409 });
      }
      await prisma.tourQuote.update({ where: { id: params.id }, data: { status: "expirada" } });
      ligas = await apagarLigasDe({ cotizacionIds: [params.id] }, "la cotización venció");
    }

    await registrarEnBitacora({
      accion:     borradoTotal ? "eliminó" : "modificó",
      entidad:    "cotización",
      referencia: antes.quoteNumber,
      resumen:    `Cotización ${antes.quoteNumber} — ${antes.customerName}, ${pesos(antes.totalAmount)}` +
        (borradoTotal ? " (borrada de la base)" : " marcada como expirada"),
    });
    return NextResponse.json({ ok: true, lead, ligasApagadas: ligas.apagadas, pagosSinReserva: pagosSueltos.length });
  } catch (e: any) {
    // Alguien más la eliminó entre la lectura y el borrado: 404, no 500.
    if (yaNoEstaba(e)) return NextResponse.json({ error: YA_NO_EXISTE }, { status: 404 });
    console.error("admin/cotizaciones DELETE:", e?.message);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
