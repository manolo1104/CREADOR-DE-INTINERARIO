import AdminSidebar from "@/components/admin/AdminSidebar";
import NewBookingWatcher from "@/components/admin/NewBookingWatcher";
import { sesionActual } from "@/lib/admin/sesion";

export const metadata = { title: "Admin — Tours Huasteca Potosina" };
export const dynamic = "force-dynamic"; // el menú depende de quién entró

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const sesion = await sesionActual();

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex">
      <AdminSidebar rol={sesion?.rol ?? "operacion"} nombre={sesion?.nombre ?? ""} />
      <NewBookingWatcher />
      <main className="flex-1 overflow-auto md:ml-0 pt-14 md:pt-0 bg-[#FAFAF8]">
        {children}
      </main>
    </div>
  );
}
