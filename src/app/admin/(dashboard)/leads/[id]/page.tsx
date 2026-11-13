import Link from "next/link";
import { TOURS_LISTA } from "@/lib/tours";
import { codigoDeTour } from "@/lib/admin/coloresTour";
import { usuariosAdmin } from "@/lib/admin/usuarios";
import { fichaOportunidad } from "@/lib/admin/crmDatos";
import { hoyMX } from "@/lib/dates";
import { EstadoVacio } from "@/components/admin/ui/EstadoVacio";
import FichaLeadClient from "./FichaLeadClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Lead — Admin" };

export default async function FichaLeadPage({ params }: { params: { id: string } }) {
  const ficha = await fichaOportunidad(params.id);
  if (!ficha) {
    return (
      <div className="mx-auto max-w-5xl p-4 sm:p-6 md:p-8">
        <EstadoVacio titulo="Ese lead no existe" texto="Puede que lo hayan borrado o que el enlace esté incompleto." accion={{ href: "/admin/leads", etiqueta: "Volver a Leads" }} />
      </div>
    );
  }
  const tours = [...TOURS_LISTA.map(t => ({ slug: t.slug, codigo: codigoDeTour(t.slug), nombre: t.nombre })), { slug: "__personalizado", codigo: "OTR", nombre: "Salida a medida" }];
  const responsables = usuariosAdmin().filter(u => u.rol !== "guia").map(u => u.nombre);
  return (
    <div className="mx-auto max-w-6xl p-4 pb-16 sm:p-6 md:p-8">
      <Link href="/admin/leads" className="panel-foco text-[12.5px] font-dm text-[var(--panel-tinta-media)] hover:text-[var(--panel-tinta)]">← Leads</Link>
      <FichaLeadClient ficha={ficha} tours={tours} responsables={responsables} hoy={hoyMX()} />
    </div>
  );
}
