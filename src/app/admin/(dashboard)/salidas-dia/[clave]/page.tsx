import Link from "next/link";
import { salidaPorClave } from "@/lib/admin/salidasDia";
import { sesionActual } from "@/lib/admin/sesion";
import { EstadoVacio } from "@/components/admin/ui/EstadoVacio";
import SalidaDetalleClient from "./SalidaDetalleClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Salida — Admin" };

export default async function SalidaDetallePage({ params }: { params: { clave: string } }) {
  const clave = decodeURIComponent(params.clave);
  const [salida, sesion] = await Promise.all([salidaPorClave(clave), sesionActual()]);
  if (!salida) {
    return (
      <div className="mx-auto max-w-5xl p-4 sm:p-6 md:p-8">
        <EstadoVacio titulo="Esa salida no existe" texto="No hay reservas con ese tour en esa fecha, o la reserva se canceló." accion={{ href: "/admin/salidas-dia", etiqueta: "Volver a Salidas del día" }} />
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-5xl p-4 pb-16 sm:p-6 md:p-8">
      <Link href={`/admin/salidas-dia?fecha=${salida.fecha}`} className="panel-foco text-[12.5px] font-dm text-[var(--panel-tinta-media)] hover:text-[var(--panel-tinta)]">← Salidas del {salida.fecha.slice(8)}/{salida.fecha.slice(5, 7)}</Link>
      <SalidaDetalleClient inicial={salida} quien={sesion?.nombre ?? ""} puedeAsignar={!!sesion && sesion.rol !== "guia"} />
    </div>
  );
}
