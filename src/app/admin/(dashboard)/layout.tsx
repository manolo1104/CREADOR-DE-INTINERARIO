import AdminSidebar from "@/components/admin/AdminSidebar";

export const metadata = { title: "Admin — Tours Huasteca Potosina" };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f4edd8] flex">
      <AdminSidebar />
      <main className="flex-1 overflow-auto md:ml-0 pt-14 md:pt-0 bg-[#f4edd8]">
        {children}
      </main>
    </div>
  );
}
