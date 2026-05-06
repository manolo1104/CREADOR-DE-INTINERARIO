"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Calendar, BookOpen, FileText, TrendingUp, Users, Menu, X, LogOut, MapPin,
} from "lucide-react";

const NAV = [
  { href: "/admin/reservas",    icon: BookOpen,   label: "Reservas"     },
  { href: "/admin/cotizaciones",icon: FileText,   label: "Cotizaciones" },
  { href: "/admin/ingresos",    icon: TrendingUp, label: "Ingresos"     },
  { href: "/admin/clientes",    icon: Users,      label: "Clientes"     },
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
    <nav className="flex-1 px-3 py-4 space-y-1">
      {NAV.map(({ href, icon: Icon, label }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 text-sm font-dm transition-colors rounded-sm ${
              active
                ? "bg-verde-selva/20 text-verde-vivo border-l-2 border-verde-vivo"
                : "text-crema/60 hover:text-crema hover:bg-white/5"
            }`}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-negro border-r border-white/8 min-h-screen">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/8">
          <Link href="/admin/reservas" className="block">
            <div className="font-cormorant text-crema text-lg tracking-[3px] uppercase">HUASTECA</div>
            <div className="text-[8px] tracking-[3px] uppercase text-verde-vivo font-dm mt-0.5">Admin Panel</div>
          </Link>
        </div>

        {navItems}

        {/* Bottom */}
        <div className="px-3 py-4 border-t border-white/8 space-y-1">
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-3 px-3 py-2.5 text-sm font-dm text-crema/40 hover:text-crema/70 transition-colors"
          >
            <MapPin className="w-4 h-4" />
            Ver sitio
          </Link>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-dm text-crema/40 hover:text-terracota transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-negro border-b border-white/8 flex items-center justify-between px-4 h-14">
        <div className="font-cormorant text-crema text-lg tracking-[3px] uppercase">HUASTECA</div>
        <button onClick={() => setOpen(!open)} className="text-crema/60 hover:text-crema p-1">
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40 bg-negro/95 pt-14 flex flex-col">
          {navItems}
          <div className="px-3 py-4 border-t border-white/8">
            <button
              onClick={logout}
              className="flex items-center gap-3 px-3 py-2.5 text-sm font-dm text-crema/40 hover:text-terracota transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </>
  );
}
