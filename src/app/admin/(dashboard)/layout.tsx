import { headers } from "next/headers";
import { redirect } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";
import NewBookingWatcher from "@/components/admin/NewBookingWatcher";
import SeguimientoWatcher from "@/components/admin/SeguimientoWatcher";
import { sesionActual } from "@/lib/admin/sesion";
import { seccionesDe } from "@/lib/admin/permisos";
import { esDeOficina, primeraPagina, seccionRestringida } from "@/lib/admin/usuarios";
import { contadoresCrm } from "@/lib/admin/crmDatos";
import { noLeidosBandeja } from "@/lib/admin/bandejaDatos";

export const metadata = { title: "Admin — Tours Huasteca Potosina" };
export const dynamic = "force-dynamic"; // el menú depende de quién entró

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const sesion = await sesionActual();
  // Lo que ve HOY, leído de la base: si Manolo le acaba de quitar esta pestaña,
  // la sesión todavía la trae y el middleware la dejó pasar. Aquí no pasa.
  const secciones = sesion ? await seccionesDe(sesion) : [];
  const seccion = seccionRestringida(headers().get("x-pathname") ?? "");
  if (seccion && !secciones.includes(seccion)) redirect(primeraPagina(secciones) ?? "/admin/login");
  // Leads abiertos y seguimientos vencidos, junto a su pestaña (Fase 2).
  const contadores = {
    ...(secciones.includes("leads") || secciones.includes("seguimientos") ? await contadoresCrm() : { leads: 0, vencidos: 0 }),
    bandeja: secciones.includes("bandeja") ? await noLeidosBandeja() : 0,
  };

  return (
    // El fondo no es un gris plano: lleva un velo verde muy tenue arriba, que
    // separa el lienzo de las tarjetas blancas sin que se note de dónde viene.
    <div className="min-h-screen flex bg-[var(--panel-fondo)]">
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0
        bg-[radial-gradient(1100px_520px_at_18%_-8%,rgba(27,67,50,0.07),transparent_62%),radial-gradient(760px_420px_at_100%_0%,rgba(82,183,136,0.06),transparent_60%)]" />

      <AdminSidebar rol={sesion?.rol ?? "operacion"} nombre={sesion?.nombre ?? ""} secciones={secciones} contadores={contadores} />
      {/* Lista blanca (lote 8, 10 nov 2026): los avisos de reservas y seguimientos, solo a la oficina. */}
      {sesion && esDeOficina(sesion.rol) && <NewBookingWatcher />}
      {sesion && esDeOficina(sesion.rol) && <SeguimientoWatcher />}

      {/* La tinta del panel va aquí: lo que no pone color hereda la del sitio
          público (clara) y se lee lavado. */}
      <main className="relative z-10 flex-1 min-w-0 overflow-auto pt-14 md:pt-0 text-[var(--panel-tinta)]">
        {children}
      </main>
    </div>
  );
}
