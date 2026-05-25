"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { BookOpen, FileText, TrendingUp, Users, Menu, X, LogOut, MapPin, Calendar, LayoutDashboard } from "lucide-react";

const NAV = [
  { href: "/admin",              icon: LayoutDashboard, label: "Inicio",       exact: true  },
  { href: "/admin/reservas",     icon: BookOpen,        label: "Reservas"                   },
  { href: "/admin/calendario",   icon: Calendar,        label: "Calendario"                 },
  { href: "/admin/cotizaciones", icon: FileText,        label: "Cotizaciones"               },
  { href: "/admin/ingresos",     icon: TrendingUp,      label: "Ingresos"                   },
  { href: "/admin/clientes",     icon: Users,           label: "Clientes"                   },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  }

  const navItems = (
    <nav className="flex-1 px-3 py-4 space-y-0.5">
      {NAV.map(({ href, icon: Icon, label, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link key={href} href={href} onClick={() => setOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 text-sm font-dm transition-colors rounded-sm ${
              active
                ? "bg-[#3a6b1a]/15 text-[#1a2e1a] border-l-2 border-[#3a6b1a] font-medium"
                : "text-[#1a2e1a]/60 hover:text-[#1a2e1a] hover:bg-[#1a2e1a]/5"
            }`}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  const sidebarClass = "flex flex-col w-56 bg-white border-r border-[#1a2e1a]/10 min-h-screen shadow-sm";

  return (
    <>
      {/* Desktop */}
      <aside className={`hidden md:flex ${sidebarClass}`}>
        <div className="px-5 py-5 border-b border-[#1a2e1a]/10">
          <Link href="/admin">
            <div className="font-cormorant text-[#1a2e1a] text-lg tracking-[3px] uppercase">HUASTECA</div>
            <div className="text-[8px] tracking-[3px] uppercase text-[#3a6b1a] font-dm mt-0.5">Admin Panel</div>
          </Link>
        </div>
        {navItems}
        <div className="px-3 py-4 border-t border-[#1a2e1a]/10 space-y-0.5">
          <Link href="/" target="_blank"
            className="flex items-center gap-3 px-3 py-2.5 text-sm font-dm text-[#1a2e1a]/40 hover:text-[#1a2e1a]/70 transition-colors">
            <MapPin className="w-4 h-4" />Ver sitio
          </Link>
          <button onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-dm text-[#1a2e1a]/40 hover:text-[#9a4a1e] transition-colors">
            <LogOut className="w-4 h-4" />Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-[#1a2e1a]/10 flex items-center justify-between px-4 h-14 shadow-sm">
        <div className="font-cormorant text-[#1a2e1a] text-lg tracking-[3px] uppercase">HUASTECA</div>
        <button onClick={() => setOpen(!open)} className="text-[#1a2e1a]/60 hover:text-[#1a2e1a] p-1">
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40 bg-white pt-14 flex flex-col">
          {navItems}
          <div className="px-3 py-4 border-t border-[#1a2e1a]/10">
            <button onClick={logout}
              className="flex items-center gap-3 px-3 py-2.5 text-sm font-dm text-[#1a2e1a]/40 hover:text-[#9a4a1e] transition-colors">
              <LogOut className="w-4 h-4" />Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </>
  );
}
