import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { TOURS_LISTA } from "@/lib/tours";
import { colorDeTour } from "@/lib/admin/coloresTour";
import { avanceRuta, type RutaGuardable } from "@/lib/admin/rutas";
import { EncabezadoPagina } from "@/components/admin/ui/EncabezadoPagina";

export const dynamic = "force-dynamic";
export const metadata = { title: "Rutas y protocolos — Admin" };

/** Una ficha por tour (Fase 1, 4 nov 2026): la base de la «escuela de guías». Lo que falta se ve. */
export default async function RutasPage() {
  const rutas = await prisma.rutaTour.findMany();
  const filas = TOURS_LISTA.map(t => {
    const r = rutas.find(x => x.tourSlug === t.slug);
    const av = avanceRuta(r ? { ...r, paradas: Array.isArray(r.paradas) ? (r.paradas as unknown as RutaGuardable["paradas"]) : [] } : null);
    return { slug: t.slug, nombre: t.nombre, av, por: r?.actualizadoPor ?? null, en: r?.updatedAt ?? null };
  }).sort((a, b) => a.av.hechos - b.av.hechos || a.nombre.localeCompare(b.nombre));
  const completas = filas.filter(f => f.av.hechos === f.av.total).length;
  return (
    <div className="mx-auto max-w-4xl p-4 pb-12 sm:p-6 md:p-8">
      <EncabezadoPagina titulo="Rutas y protocolos" nueva subtitulo={`${completas} de ${filas.length} tours con la ficha completa · el guía la ve en «Salidas del día»`} />
      <ul className="panel-card divide-y divide-[var(--panel-borde)]">
        {filas.map(f => (
          <li key={f.slug}>
            <Link href={`/admin/rutas/${f.slug}`} className="panel-foco flex items-center gap-3 px-4 py-3 hover:bg-[var(--panel-fondo-velo)]" style={{ borderLeft: `4px solid ${colorDeTour(f.slug)}` }}>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-dm font-medium text-[var(--panel-tinta)]">{f.nombre}</p>
                <p className="truncate text-[12px] font-dm text-[var(--panel-tinta-media)]">{f.av.falta.length ? `Falta: ${f.av.falta.join(", ")}` : "Completa"}{f.por ? ` · ${f.por}` : ""}</p>
              </div>
              <span className={`panel-cifra shrink-0 text-[12.5px] font-dm font-semibold ${f.av.hechos === f.av.total ? "text-[var(--panel-bien)]" : f.av.hechos === 0 ? "text-[var(--panel-tinta-suave)]" : "text-[var(--panel-atencion)]"}`}>{f.av.hechos}/{f.av.total}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
