import Link from "next/link";
import { salidaPorClave } from "@/lib/admin/salidasDia";
import { sesionActual } from "@/lib/admin/sesion";
import { seccionesDe } from "@/lib/admin/permisos";
import { numerosDeSalida } from "@/lib/admin/salidas";
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
  // 🔴 Costos, margen y la parte de cada socio solo para quien ve el Cotizador
  // (revisión del 4 nov 2026): a Operación se le quitó el Cotizador justo por
  // eso, y el guía no ve dinero. Se quitan ANTES de mandarlos al navegador.
  const verDinero = !!sesion && sesion.rol !== "guia" && (await seccionesDe(sesion)).includes("cotizador");
  const datos = verDinero ? salida : { ...salida, conceptos: [], precioPorPax: 0, numeros: numerosDeSalida(0, salida.personas, []) };
  return (
    <div className="mx-auto max-w-5xl p-4 pb-16 sm:p-6 md:p-8">
      <Link href={`/admin/salidas-dia?fecha=${salida.fecha}`} className="panel-foco text-[12.5px] font-dm text-[var(--panel-tinta-media)] hover:text-[var(--panel-tinta)]">← Salidas del {salida.fecha.slice(8)}/{salida.fecha.slice(5, 7)}</Link>
      <SalidaDetalleClient inicial={datos} quien={sesion?.nombre ?? ""} puedeAsignar={!!sesion && sesion.rol !== "guia"} verDinero={verDinero} />
    </div>
  );
}
