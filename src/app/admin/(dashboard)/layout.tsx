import AdminSidebar from "@/components/admin/AdminSidebar";
import NewBookingWatcher from "@/components/admin/NewBookingWatcher";

export const metadata = { title: "Admin — Tours Huasteca Potosina" };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#FAFAF8] flex">
      <AdminSidebar />
      <NewBookingWatcher />
      <main className="flex-1 overflow-auto md:ml-0 pt-14 md:pt-0 bg-[#FAFAF8]">
        {children}
      </main>
    </div>
  );
}
