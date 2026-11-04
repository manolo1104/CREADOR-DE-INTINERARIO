import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TOURS_LISTA } from "@/lib/tours";
import { partesRecogida } from "@/lib/tours";
import { etiquetaServicio, type Parada } from "@/lib/admin/rutas";
import RutaClient from "./RutaClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ruta — Admin" };

export default async function RutaPage({ params }: { params: { slug: string } }) {
  const tour = TOURS_LISTA.find(t => t.slug === params.slug);
  if (!tour) notFound();
  const [r, proveedores] = await Promise.all([
    prisma.rutaTour.findUnique({ where: { tourSlug: tour.slug } }),
    prisma.proveedor.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }),
  ]);
  const p = partesRecogida(tour, false);
  return (
    <div className="mx-auto max-w-4xl p-4 pb-16 sm:p-6 md:p-8">
      <Link href="/admin/rutas" className="panel-foco text-[12.5px] font-dm text-[var(--panel-tinta-media)] hover:text-[var(--panel-tinta)]">← Rutas y protocolos</Link>
      <RutaClient slug={tour.slug} nombre={tour.nombre} encuentroCatalogo={p ? `${p.lugar}${p.hora ? `, ${p.hora}` : ""}` : ""}
        proveedores={proveedores.map(x => ({ id: x.id, nombre: x.nombre, servicio: etiquetaServicio(x.servicio), sugerido: x.tours.includes(tour.slug) }))}
        inicial={{
          paradas: Array.isArray(r?.paradas) ? (r!.paradas as unknown as Parada[]) : [],
          puntoEncuentro: r?.puntoEncuentro ?? "", guion: r?.guion ?? "", seguridad: r?.seguridad ?? "", planB: r?.planB ?? "",
          queLlevar: r?.queLlevar ?? "", notas: r?.notas ?? "", proveedores: r?.proveedores ?? [],
        }}
        actualizado={r ? `${r.actualizadoPor ?? ""} · ${r.updatedAt.toLocaleDateString("es-MX", { day: "numeric", month: "short", timeZone: "America/Mexico_City" })}` : null} />
    </div>
  );
}
