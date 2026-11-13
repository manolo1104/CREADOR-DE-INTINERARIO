import { prisma } from "@/lib/prisma";
import { TOURS_LISTA } from "@/lib/tours";
import type { PrecioProveedor } from "@/lib/admin/rutas";
import ProveedoresClient from "./ProveedoresClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Proveedores — Admin" };

/** El catálogo de proveedores (Fase 1, 4 nov 2026): contacto, precio pactado por temporada y en qué tours participan. */
export default async function ProveedoresPage() {
  const ps = await prisma.proveedor.findMany({ orderBy: [{ activo: "desc" }, { nombre: "asc" }] });
  return (
    <ProveedoresClient tours={TOURS_LISTA.map(t => ({ slug: t.slug, nombre: t.nombre }))}
      inicial={ps.map(p => ({ id: p.id, nombre: p.nombre, servicio: p.servicio, contacto: p.contacto ?? "", telefono: p.telefono ?? "", correo: p.correo ?? "", precios: (Array.isArray(p.precios) ? p.precios : []) as unknown as PrecioProveedor[], tours: p.tours, notas: p.notas ?? "", activo: p.activo }))} />
  );
}
