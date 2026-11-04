import { usuariosAdmin } from "@/lib/admin/usuarios";
import { sesionActual } from "@/lib/admin/sesion";
import { tareasPendientes } from "@/lib/admin/crmDatos";
import { hoyMX } from "@/lib/dates";
import SeguimientosClient from "./SeguimientosClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Seguimientos — Admin" };

export default async function SeguimientosPage() {
  const [tareas, sesion] = await Promise.all([tareasPendientes(), sesionActual()]);
  const responsables = usuariosAdmin().filter(u => u.rol !== "guia").map(u => u.nombre);
  return <SeguimientosClient tareas={tareas} responsables={responsables} quien={sesion?.nombre ?? ""} hoy={hoyMX()} />;
}
