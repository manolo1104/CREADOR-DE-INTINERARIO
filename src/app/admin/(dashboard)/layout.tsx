import AdminSidebar from "@/components/admin/AdminSidebar";
import NewBookingWatcher from "@/components/admin/NewBookingWatcher";
import { sesionActual } from "@/lib/admin/sesion";

export const metadata = { title: "Admin — Tours Huasteca Potosina" };
export const dynamic = "force-dynamic"; // el menú depende de quién entró

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const sesion = await sesionActual();

  return (
    // El fondo no es un gris plano: lleva un velo verde muy tenue arriba, que
    // separa el lienzo de las tarjetas blancas sin que se note de dónde viene.
    <div className="min-h-screen flex bg-[var(--panel-fondo)]">
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0
        bg-[radial-gradient(1100px_520px_at_18%_-8%,rgba(27,67,50,0.07),transparent_62%),radial-gradient(760px_420px_at_100%_0%,rgba(82,183,136,0.06),transparent_60%)]" />

      <AdminSidebar rol={sesion?.rol ?? "operacion"} nombre={sesion?.nombre ?? ""} />
      <NewBookingWatcher />

      <main className="relative z-10 flex-1 min-w-0 overflow-auto pt-14 md:pt-0">
        {children}
      </main>
    </div>
  );
}
