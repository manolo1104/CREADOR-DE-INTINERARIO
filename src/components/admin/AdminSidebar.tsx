"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { BookOpen, FileText, TrendingUp, Users, Menu, X, LogOut, MapPin, Calendar, LayoutDashboard, Volume2, VolumeX, Calculator, GraduationCap, ScrollText, Wallet, Link2 } from "lucide-react";
import { isSfxMuted, setSfxMuted, playClick } from "@/lib/admin/sfx";
import { puedeVer, type RolAdmin, type SeccionAdmin } from "@/lib/admin/usuarios";

interface ItemNav {
  href: string; icon: typeof BookOpen; label: string;
  seccion: SeccionAdmin; exact?: boolean;
}

// El menú se agrupa por el trabajo que se hace, no por orden de llegada: lo
// del día a día arriba, el dinero en medio, lo de vigilancia abajo. Una lista
// plana de diez destinos obliga a leerla entera cada vez.
const GRUPOS: { titulo: string; items: ItemNav[] }[] = [
  {
    titulo: "Operación",
    items: [
      { href: "/admin",              icon: LayoutDashboard, label: "Inicio",       seccion: "inicio", exact: true },
      { href: "/admin/reservas",     icon: BookOpen,        label: "Reservas",     seccion: "reservas"      },
      { href: "/admin/calendario",   icon: Calendar,        label: "Calendario",   seccion: "calendario"    },
      { href: "/admin/cotizaciones", icon: FileText,        label: "Cotizaciones", seccion: "cotizaciones"  },
      { href: "/admin/cobros",       icon: Link2,           label: "Cobros",       seccion: "cobros"        },
      { href: "/admin/clientes",     icon: Users,           label: "Clientes",     seccion: "clientes"      },
    ],
  },
  {
    titulo: "Dinero",
    items: [
      { href: "/admin/finanzas",     icon: Wallet,          label: "Finanzas",     seccion: "finanzas"      },
      { href: "/admin/cotizador",    icon: Calculator,      label: "Cotizador",    seccion: "cotizador"     },
      { href: "/admin/ingresos",     icon: TrendingUp,      label: "Ventas",       seccion: "ingresos"      },
    ],
  },
  {
    titulo: "Control",
    items: [
      { href: "/admin/bitacora",     icon: ScrollText,      label: "Bitácora",     seccion: "bitacora"      },
      { href: "/admin/curso",        icon: GraduationCap,   label: "Curso IA",     seccion: "curso"         },
    ],
  },
];

const ETIQUETA_ROL: Record<string, string> = {
  dueno: "Dueño", socio: "Socio", operacion: "Operación",
};

export default function AdminSidebar({ rol = "dueno", nombre = "" }: { rol?: RolAdmin; nombre?: string }) {
  const pathname = usePathname();
  const router   = useRouter();
  const [open, setOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  useEffect(() => { setMuted(isSfxMuted()); }, []);
  function toggleMute() { const m = !muted; setMuted(m); setSfxMuted(m); }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  }

  const navItems = (
    <nav className="flex-1 px-3 py-3 overflow-y-auto">
      {GRUPOS.map(grupo => {
        const visibles = grupo.items.filter(({ seccion }) => puedeVer(rol, seccion));
        if (visibles.length === 0) return null;
        return (
          <div key={grupo.titulo} className="mb-4 last:mb-0">
            <p className="panel-eyebrow px-3 mb-1.5">{grupo.titulo}</p>
            <div className="space-y-0.5">
              {visibles.map(({ href, icon: Icon, label, exact }) => {
                const active = exact ? pathname === href : pathname.startsWith(href);
                return (
                  <Link key={href} href={href} onClick={() => { playClick(); setOpen(false); }}
                    aria-current={active ? "page" : undefined}
                    className={`group relative flex items-center gap-2.5 pl-3 pr-2.5 py-2 text-[13px] font-dm rounded-[7px] panel-pulsable panel-foco ${
                      active
                        ? "bg-white text-[#16362a] font-medium shadow-[0_1px_2px_rgba(22,54,42,0.06)] ring-1 ring-[rgba(27,67,50,0.10)]"
                        : "text-[rgba(22,54,42,0.60)] hover:text-[#16362a] hover:bg-white/55"
                    }`}
                  >
                    {/* La marca del activo va pegada al borde izquierdo: el ojo
                        la encuentra sin recorrer la fila entera. */}
                    <span aria-hidden
                      className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full bg-[#1B4332] transition-all duration-150 ${
                        active ? "h-5 opacity-100" : "h-0 opacity-0"
                      }`} />
                    <Icon className={`w-[15px] h-[15px] flex-shrink-0 ${active ? "text-[#1B4332]" : "text-[rgba(22,54,42,0.51)] group-hover:text-[#1B4332]"}`} strokeWidth={1.75} />
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );

  // Vidrio SOLO aquí y en el encabezado: son las superficies que flotan sobre
  // el contenido. Sobre las tablas el desenfoque pelearía con las cifras.
  const sidebarClass = "panel-glass-cromo flex flex-col w-[232px] border-r min-h-screen sticky top-0 h-screen";

  return (
    <>
      {/* Desktop */}
      <aside className={`hidden md:flex ${sidebarClass}`}>
        <div className="px-4 pt-5 pb-4">
          <Link href="/admin" className="block panel-foco rounded-[7px]">
            <div className="font-cormorant text-[#16362a] text-[19px] leading-none tracking-[3px] uppercase">Huasteca</div>
            <div className="panel-eyebrow mt-1.5">Panel interno</div>
          </Link>
        </div>
        {navItems}
        <div className="px-3 pb-3 pt-2">
          <div className="flex items-center gap-1 px-1 mb-2">
            <Link href="/" target="_blank" title="Ver el sitio público"
              className="flex items-center gap-2 px-2 py-1.5 text-[11px] font-dm text-[rgba(22,54,42,0.51)] hover:text-[#16362a] hover:bg-white/60 rounded-[7px] panel-pulsable panel-foco">
              <MapPin className="w-3.5 h-3.5" strokeWidth={1.75} />Ver sitio
            </Link>
            <button onClick={toggleMute} title={muted ? "Activar sonidos" : "Silenciar sonidos"}
              aria-label={muted ? "Activar sonidos" : "Silenciar sonidos"}
              className="ml-auto p-1.5 text-[rgba(22,54,42,0.35)] hover:text-[#16362a] hover:bg-white/60 rounded-[7px] panel-pulsable panel-foco">
              {muted ? <VolumeX className="w-3.5 h-3.5" strokeWidth={1.75} /> : <Volume2 className="w-3.5 h-3.5" strokeWidth={1.75} />}
            </button>
          </div>

          {/* Quién está dentro, y la salida. Cerrar sesión va separado del resto:
              es la única acción de aquí que interrumpe el trabajo. */}
          <div className="panel-card flex items-center gap-2.5 px-2.5 py-2">
            <span className="w-7 h-7 rounded-full bg-[#1B4332] text-white grid place-items-center text-[11px] font-dm font-medium flex-shrink-0">
              {(nombre || "?").charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[12px] font-dm text-[#16362a] truncate leading-tight">{nombre || "Sesión"}</span>
              <span className="block text-[10px] font-dm text-[rgba(22,54,42,0.51)] capitalize leading-tight">{ETIQUETA_ROL[rol] ?? rol}</span>
            </span>
            <button onClick={logout} title="Cerrar sesión" aria-label="Cerrar sesión"
              className="p-1.5 text-[rgba(22,54,42,0.35)] hover:text-[#b8413f] hover:bg-[#b8413f]/8 rounded-[7px] panel-pulsable panel-foco flex-shrink-0">
              <LogOut className="w-3.5 h-3.5" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-[#1B4332]/10 flex items-center justify-between px-4 h-14 shadow-sm">
        <div className="font-cormorant text-[#1B4332] text-lg tracking-[3px] uppercase">HUASTECA</div>
        <button onClick={() => setOpen(!open)} className="text-[#1B4332]/60 hover:text-[#1B4332] p-1">
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40 bg-white pt-14 flex flex-col">
          {navItems}
          <div className="px-3 py-4 border-t border-[#1B4332]/10">
            <button onClick={toggleMute}
              className="flex items-center gap-3 px-3 py-2.5 text-sm font-dm text-[#1B4332]/40 hover:text-[#1B4332]/70 transition-colors">
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}{muted ? "Sonidos: off" : "Sonidos: on"}
            </button>
            <button onClick={logout}
              className="flex items-center gap-3 px-3 py-2.5 text-sm font-dm text-[#1B4332]/40 hover:text-[#C9484A] transition-colors">
              <LogOut className="w-4 h-4" />Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </>
  );
}
