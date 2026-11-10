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
import { avisoSoloLectura, lineItemsAlEditar, puedeRegresarAEnviada } from "@/lib/cotizaciones/reglasEnvio";
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

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    // Solo actualizar campos permitidos que vengan en el body (update parcial).
    const data: Record<string, unknown> = {};
    for (const k of QUOTE_FIELDS) {
      if (body[k] !== undefined) data[k] = body[k];
    }
    const antes = await prisma.tourQuote.findUnique({ where: { id: params.id } });
    if (!antes) return NextResponse.json({ error: "Esa cotización ya no existe." }, { status: 404 });
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
    // Marcada «Enviada» a mano por primera vez: desde ahí cuenta «Cotización →
    // reserva» (lote 9, 10 nov 2026). Si ya tenía fecha de envío, no se mueve.
    if (data.status === "enviada" && !antes?.enviadaEn) data.enviadaEn = new Date();
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
    // editarla; si quedó «enviada», sube a Cotizado. Nunca baja una etapa.
    // Si se editaron los datos (no solo el estado), lo que dice la cotización
    // pasa al lead: total, fecha, personas, tours y contacto.
    const editoDatos = ["totalAmount", "tourDate", "lineItems", "adults", "children", "customerName", "customerEmail", "customerPhone", "tourName"].some(k => data[k] !== undefined);
    await leadDesdeCotizacion(quote.id, quote.status === "enviada" ? "cotizado" : "calificado",
      (await sesionActual())?.nombre ?? "Desconocido",
      regresada ? `cotización ${quote.quoteNumber} regresó a Enviada` : quote.status === "enviada" ? `cotización ${quote.quoteNumber} enviada` : `cotización ${quote.quoteNumber} editada`, editoDatos);
    // El estado y los `lineItems` como quedaron: el panel los pone en su lista (lote 4).
    return NextResponse.json({ ok: true, status: quote.status, lineItems: quote.lineItems });
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
      if (antes?.oportunidadId) lead = await leadTrasBorrarCotizacion(antes.oportunidadId, antes.quoteNumber, (await sesionActual())?.nombre ?? "Desconocido");
      ligas = await apagarLigasDe({ cotizacionIds: [params.id] }, `se borró la cotización${antes ? ` ${antes.quoteNumber}` : ""}`);
      for (const l of pagosSueltos) {
        await crearSeguimientoUnico({
          titulo: tituloLigaSinDestino({ tipo: "cotizacion-borrada" }, { titulo: l.titulo, cliente: l.cliente ?? antes?.customerName, monto: l.montoPagado ?? l.monto }),
          clave: `liga-sin-destino:${l.id}`, regla: "liga-sin-destino", creadaPor: "Cotizaciones",
        }).catch(e => console.error("seguimiento de liga pagada sin reserva:", (e as Error)?.message));
      }
    } else {
      // Una aceptada no se marca vencida (lote 4, 5 nov 2026): ya es venta.
      // El panel ya no ofrece el botón; esto frena una pestaña vieja.
      if (antes?.status === "aceptada") {
        const reserva = await reservaVivaDeCotizacion(antes);
        return NextResponse.json({ error: avisoSoloLectura(antes, reserva?.confirmationNumber ?? null) }, { status: 409 });
      }
      await prisma.tourQuote.update({ where: { id: params.id }, data: { status: "expirada" } });
      ligas = await apagarLigasDe({ cotizacionIds: [params.id] }, "la cotización venció");
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
    return NextResponse.json({ ok: true, lead, ligasApagadas: ligas.apagadas, pagosSinReserva: pagosSueltos.length });
  } catch (e: any) {
    console.error("admin/cotizaciones DELETE:", e?.message);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
