import { prisma } from "@/lib/prisma";
import { leerPreciosExtras } from "@/lib/admin/preciosExtras";
import { sesionActual } from "@/lib/admin/sesion";
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
  const inicio: InicioCotizaciones = {
    editar: param(searchParams.editar), convertir: param(searchParams.convertir), nueva: searchParams.nueva === "1",
    lead: lead ? { id: lead.id, nombre: lead.contacto.nombre, telefono: lead.contacto.telefono, correo: lead.contacto.correo } : null,
  };
  return (
    <CotizacionesClient
      initialQuotes={quotes} presetsExtras={presetsExtras} quien={sesion?.nombre ?? "Admin"}
      guiasConocidos={guias.map(g => (g.guia ?? "").trim()).filter(Boolean)} leads={leads} inicio={inicio}
    />
  );
}
