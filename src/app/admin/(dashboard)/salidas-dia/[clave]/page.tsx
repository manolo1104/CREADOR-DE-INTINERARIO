import Link from "next/link";
import { salidaPorClave } from "@/lib/admin/salidasDia";
import { sesionActual } from "@/lib/admin/sesion";
import { seccionesDe } from "@/lib/admin/permisos";
import { esDeOficina, veCostos } from "@/lib/admin/usuarios";
import { fechaVisibleAlGuia, salidaParaNavegador } from "@/lib/admin/vistaGuia";
import { hoyMX } from "@/lib/dates";
import { EstadoVacio } from "@/components/admin/ui/EstadoVacio";
import SalidaDetalleClient from "./SalidaDetalleClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Salida — Admin" };

export default async function SalidaDetallePage({ params, searchParams }: { params: { clave: string }; searchParams?: { de?: string } }) {
  const clave = decodeURIComponent(params.clave);
  const [salida, sesion] = await Promise.all([salidaPorClave(clave), sesionActual()]);
  // El guía ve de ayer a 7 días adelante (lote 8, 10 nov 2026): fuera de eso, como si no existiera.
  const esGuia = !!sesion && !esDeOficina(sesion.rol);
  if (!salida || (esGuia && !fechaVisibleAlGuia(salida.fecha, hoyMX()))) {
    return (
      <div className="mx-auto max-w-5xl p-4 sm:p-6 md:p-8">
        <EstadoVacio titulo="Esa salida no existe" texto="No hay reservas con ese tour en esa fecha, o la reserva se canceló." accion={{ href: "/admin/salidas-dia", etiqueta: "Volver a Salidas del día" }} />
      </div>
    );
  }
  // 🔴 Costos, margen y la parte de cada socio solo para quien ve el Cotizador
  // (revisión del 4 nov 2026): a Operación se le quitó el Cotizador justo por
  // eso, y el guía no ve dinero. Se quitan ANTES de mandarlos al navegador.
  const verDinero = !!sesion && veCostos(sesion.rol, await seccionesDe(sesion));
  // `ingresoExtras` también es dinero de la salida (revisión del lote 7, 10 nov 2026).
  // Al guía tampoco le llega lo cobrado de cada reserva (lote 8): `vistaGuia.ts`.
  const datos = salidaParaNavegador(salida, { verDinero, esGuia: !sesion || esGuia });
  return (
    <div className="mx-auto max-w-5xl p-4 pb-16 sm:p-6 md:p-8">
      {/* Desde el Calendario, «regresar» vuelve al Calendario con ese día abierto (Manolo, 4 nov 2026). */}
      {searchParams?.de === "calendario"
        ? <Link href={`/admin/calendario?dia=${salida.fecha}`} className="panel-foco text-[12.5px] font-dm text-[var(--panel-tinta-media)] hover:text-[var(--panel-tinta)]">← Calendario · {salida.fecha.slice(8)}/{salida.fecha.slice(5, 7)}</Link>
        : <Link href={`/admin/salidas-dia?fecha=${salida.fecha}`} className="panel-foco text-[12.5px] font-dm text-[var(--panel-tinta-media)] hover:text-[var(--panel-tinta)]">← Salidas del {salida.fecha.slice(8)}/{salida.fecha.slice(5, 7)}</Link>}
      <SalidaDetalleClient inicial={datos} quien={sesion?.nombre ?? ""} puedeAsignar={!!sesion && esDeOficina(sesion.rol)} verDinero={verDinero} />
    </div>
  );
}
