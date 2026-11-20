import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { TOURS_LISTA } from "@/lib/tours";
import { codigoDeTour } from "@/lib/admin/coloresTour";
import { usuariosAdmin } from "@/lib/admin/usuarios";
import { sesionActual } from "@/lib/admin/sesion";
import { seccionesDe } from "@/lib/admin/permisos";
import { fichaOportunidad } from "@/lib/admin/crmDatos";
import { confirmacionesDelLead } from "@/lib/admin/confirmacionReservaDatos";
import { resenaDelLead } from "@/lib/admin/resenaLeadDatos";
import { reservaVivaDeCotizacion } from "@/lib/cotizaciones/estadoCotizacion";
import { hoyMX } from "@/lib/dates";
import { EstadoVacio } from "@/components/admin/ui/EstadoVacio";
import FichaLeadClient from "./FichaLeadClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Lead — Admin" };

/**
 * El folio de la reserva VIVA que salió de cada cotización del lead (19 nov
 * 2026): esas no se eliminan (el servidor contesta 409), así que la ficha no
 * ofrece «Eliminar». Las mismas tres fuentes que revisa el servidor
 * (`reservaVivaDeCotizacion`); un lead tiene pocas cotizaciones.
 */
async function reservasDeSusCotizaciones(oportunidadId: string): Promise<Record<string, string>> {
  try {
    const cotizaciones = await prisma.tourQuote.findMany({ where: { oportunidadId }, select: { id: true, quoteNumber: true, packageItems: true } });
    const pares = await Promise.all(cotizaciones.map(async q => [q.id, (await reservaVivaDeCotizacion(q).catch(() => null))?.confirmationNumber ?? null] as const));
    return Object.fromEntries(pares.filter((p): p is readonly [string, string] => !!p[1]));
  } catch (e) {
    console.error("ficha del lead, reservas de sus cotizaciones:", e instanceof Error ? e.message : String(e));
    return {};
  }
}

export default async function FichaLeadPage({ params }: { params: { id: string } }) {
  // La confirmación por correo de cada reserva (19 nov 2026) solo lee y nunca falla: va en paralelo.
  const [ficha, sesion, confirmaciones] = await Promise.all([fichaOportunidad(params.id), sesionActual(), confirmacionesDelLead(params.id)]);
  if (!ficha) {
    return (
      <div className="mx-auto max-w-5xl p-4 sm:p-6 md:p-8">
        <EstadoVacio titulo="Ese lead no existe" texto="Puede que lo hayan borrado o que el enlace esté incompleto." accion={{ href: "/admin/leads", etiqueta: "Volver a Leads" }} />
      </div>
    );
  }
  const [secciones, resena, reservasDeCotizaciones] = await Promise.all([
    sesion ? seccionesDe(sesion) : Promise.resolve([] as string[]),
    // «Pedir reseña por WhatsApp» solo en Operado (19 nov 2026).
    ficha.etapa === "operado" ? resenaDelLead(ficha.id) : Promise.resolve(null),
    ficha.cotizaciones.length ? reservasDeSusCotizaciones(ficha.id) : Promise.resolve({} as Record<string, string>),
  ]);
  const tours = [...TOURS_LISTA.map(t => ({ slug: t.slug, codigo: codigoDeTour(t.slug), nombre: t.nombre })), { slug: "__personalizado", codigo: "OTR", nombre: "Salida a medida" }];
  const responsables = usuariosAdmin().filter(u => u.rol !== "guia").map(u => u.nombre);
  return (
    <div className="mx-auto max-w-6xl p-4 pb-16 sm:p-6 md:p-8">
      <Link href="/admin/leads" className="panel-foco text-[12.5px] font-dm text-[var(--panel-tinta-media)] hover:text-[var(--panel-tinta)]">← Leads</Link>
      <FichaLeadClient ficha={ficha} tours={tours} responsables={responsables} hoy={hoyMX()} quien={sesion?.nombre ?? ""}
        confirmaciones={confirmaciones} resena={resena} reservasDeCotizaciones={reservasDeCotizaciones}
        // Eliminar una cotización llama a su API, que exige la pestaña Cotizaciones (sin ella contesta 403).
        puedeBorrarCotizaciones={secciones.includes("cotizaciones")} />
    </div>
  );
}
