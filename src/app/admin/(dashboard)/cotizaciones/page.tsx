import { prisma } from "@/lib/prisma";
import { leerPreciosExtras } from "@/lib/admin/preciosExtras";
import { sesionActual } from "@/lib/admin/sesion";
import { ESTADOS_RESERVA_MUERTA } from "@/lib/cotizaciones/reglasEnvio";
import { metaDe } from "@/lib/admin/reserva";
import CotizacionesClient, { type InicioCotizaciones, type LeadsDeCotizaciones } from "./CotizacionesClient";

export const dynamic = "force-dynamic";

const param = (v: string | string[] | undefined) => (typeof v === "string" && v.length <= 60 ? v : null);

/**
 * Desde la ficha de un lead se llega con `?editar=`, `?convertir=` o
 * `?nueva=1`, más `&lead=`: se abre directo lo pedido y hay un botón para
 * volver a la ficha (3 nov 2026).
 */
export default async function CotizacionesPage({ searchParams = {} }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const leadId = param(searchParams.lead);
  const [quotes, presetsExtras, sesion, guias, lead] = await Promise.all([
    prisma.tourQuote.findMany({ orderBy: { createdAt: "desc" } }),
    leerPreciosExtras(),
    sesionActual(),
    prisma.tourBooking.findMany({ where: { guia: { not: null } }, select: { guia: true }, distinct: ["guia"], take: 50 }).catch(() => []),
    leadId ? prisma.oportunidad.findUnique({ where: { id: leadId }, include: { contacto: true } }).catch(() => null) : null,
  ]);
  // El canal y el idioma del lead de cada cotización: se sugieren al convertirla.
  const ids = Array.from(new Set(quotes.map(q => q.oportunidadId).filter((x): x is string => !!x)));
  const ops = ids.length ? await prisma.oportunidad.findMany({ where: { id: { in: ids } }, select: { id: true, canal: true, contacto: { select: { idioma: true } } } }).catch(() => []) : [];
  const leads: LeadsDeCotizaciones = Object.fromEntries(ops.map(o => [o.id, { canal: o.canal, idioma: o.contacto.idioma }]));
  // Cotizaciones cuya liga de pago YA se pagó y todavía no tienen reserva (caso de Erick, 4 nov 2026):
  // quedan «aceptadas» pero se pueden convertir, y el anticipo pagado entra solo como cobro.
  const ligasPagadas = await prisma.linkPago.findMany({ where: { estado: "pagado", reservaId: null, cotizacionId: { not: null } }, select: { cotizacionId: true, montoPagado: true, monto: true } }).catch(() => []);
  const pagadasSinReserva: Record<string, number> = {};
  for (const l of ligasPagadas) pagadasSinReserva[l.cotizacionId!] = (pagadasSinReserva[l.cotizacionId!] ?? 0) + (l.montoPagado ?? l.monto);
  // La reserva viva de cada aceptada (lote 4, 5 nov 2026): «Editar» la abre
  // para ver y dice qué reserva cambiar; sin reserva se ofrece «Regresar a Enviada».
  const aceptadas = quotes.filter(q => q.status === "aceptada");
  const reservasVivas = aceptadas.length
    ? await prisma.tourBooking.findMany({
        where:  { cotizacionId: { in: aceptadas.map(q => q.id) }, status: { notIn: [...ESTADOS_RESERVA_MUERTA] } },
        select: { cotizacionId: true, confirmationNumber: true },
      }).catch(() => [])
    : [];
  const reservasDeCotizaciones: Record<string, string> = {};
  for (const r of reservasVivas) if (r.cotizacionId) reservasDeCotizaciones[r.cotizacionId] = r.confirmationNumber;
  // Las convertidas antes del 4 nov 2026 no guardan `cotizacionId`: su reserva
  // dice de qué cotización viene en el `_meta` (`cotizacionOrigen`).
  const sinFolio = aceptadas.filter(q => !reservasDeCotizaciones[q.id]);
  if (sinFolio.length) {
    const porFolio = new Map(sinFolio.map(q => [q.quoteNumber, q.id]));
    const viejas = await prisma.tourBooking.findMany({
      where:  { status: { notIn: [...ESTADOS_RESERVA_MUERTA] }, OR: sinFolio.map(q => ({ lineItems: { array_contains: [{ cotizacionOrigen: q.quoteNumber }] } })) },
      select: { confirmationNumber: true, lineItems: true },
    }).catch(() => []);
    for (const b of viejas) {
      const id = porFolio.get(String(metaDe(b).cotizacionOrigen ?? ""));
      if (id && !reservasDeCotizaciones[id]) reservasDeCotizaciones[id] = b.confirmationNumber;
    }
  }
  const inicio: InicioCotizaciones = {
    editar: param(searchParams.editar), convertir: param(searchParams.convertir), nueva: searchParams.nueva === "1",
    lead: lead ? { id: lead.id, nombre: lead.contacto.nombre, telefono: lead.contacto.telefono, correo: lead.contacto.correo } : null,
  };
  return (
    <CotizacionesClient
      initialQuotes={quotes} presetsExtras={presetsExtras} quien={sesion?.nombre ?? "Admin"}
      guiasConocidos={guias.map(g => (g.guia ?? "").trim()).filter(Boolean)} leads={leads} inicio={inicio} pagadasSinReserva={pagadasSinReserva}
      reservasDeCotizaciones={reservasDeCotizaciones}
    />
  );
}
