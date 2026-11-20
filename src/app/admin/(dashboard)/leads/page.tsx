import { TOURS_LISTA } from "@/lib/tours";
import { codigoDeTour } from "@/lib/admin/coloresTour";
import { usuariosAdmin } from "@/lib/admin/usuarios";
import { sesionActual } from "@/lib/admin/sesion";
import { listarPipeline, tareasPendientes } from "@/lib/admin/crmDatos";
import { DIAS_TABLERO_CERRADOS, cerradoHaceMenosDe } from "@/lib/admin/crm";
import { resenasDeLeads } from "@/lib/admin/resenaLeadDatos";
import { hoyMX } from "@/lib/dates";
import LeadsClient from "./LeadsClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Leads — Admin" };

export default async function LeadsPage() {
  const [leads, sesion, tareas] = await Promise.all([listarPipeline(), sesionActual(), tareasPendientes()]);
  // La reseña de Google de los Operado que se ven en su columna (19 nov 2026):
  // de una vez para todos, para su botón «Pedir reseña».
  const ahora = new Date();
  const resenas = await resenasDeLeads(leads.filter(l => l.etapa === "operado" && cerradoHaceMenosDe(l.cerradoEn, ahora, DIAS_TABLERO_CERRADOS)).map(l => l.id));
  const tours = [...TOURS_LISTA.map(t => ({ slug: t.slug, codigo: codigoDeTour(t.slug), nombre: t.nombre })), { slug: "__personalizado", codigo: "OTR", nombre: "Salida a medida" }];
  const responsables = usuariosAdmin().filter(u => u.rol !== "guia").map(u => u.nombre);
  return <LeadsClient leads={leads} tareas={tareas.filter(t => t.estado !== "hecha")} tours={tours} responsables={responsables} quien={sesion?.nombre ?? ""} hoy={hoyMX()} resenas={resenas} />;
}
