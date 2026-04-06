"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const DESTINOS_NAV = [
  { emoji: "🏛️", nombre: "Las Pozas (Jardín Surrealista)", slug: "las-pozas-jardin-surrealista" },
  { emoji: "🌈", nombre: "Cascada de Tamul", slug: "cascada-de-tamul" },
  { emoji: "🐦", nombre: "Sótano de las Golondrinas", slug: "sotano-de-las-golondrinas" },
  { emoji: "💦", nombre: "Cascadas de Micos", slug: "cascadas-de-micos" },
  { emoji: "🌀", nombre: "Puente de Dios", slug: "puente-de-dios-tamasopo" },
  { emoji: "🗿", nombre: "Zona Arqueológica Tamtoc", slug: "zona-arqueologica-tamtoc" },
  { emoji: "🏊", nombre: "Cascadas de Tamasopo", slug: "cascadas-de-tamasopo" },
  { emoji: "♨️", nombre: "Balneario Taninul", slug: "balneario-taninul" },
];

const EXPERIENCIAS_NAV = [
  { label: "Cascadas & Pozas", href: "/experiencias?tipo=cascadas" },
  { label: "Aventura Extrema", href: "/experiencias?tipo=aventura" },
  { label: "Cultura & Historia", href: "/experiencias?tipo=cultura" },
  { label: "Naturaleza & Bienestar", href: "/experiencias?tipo=naturaleza" },
  { label: "Fotografía", href: "/experiencias?tipo=fotografia" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [destinosOpen, setDestinosOpen] = useState(false);
  const [experienciasOpen, setExperienciasOpen] = useState(false);
  const pathname = usePathname();

  const destinosRef = useRef<HTMLDivElement>(null);
  const experienciasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
    setDestinosOpen(false);
    setExperienciasOpen(false);
  }, [pathname]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (destinosRef.current && !destinosRef.current.contains(e.target as Node)) {
        setDestinosOpen(false);
      }
      if (experienciasRef.current && !experienciasRef.current.contains(e.target as Node)) {
        setExperienciasOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const navLinkClass = (href: string) =>
    `text-[11px] tracking-[2.5px] uppercase font-dm transition-colors duration-200 ${
      isActive(href) ? "text-lima" : "text-crema/70 hover:text-crema"
    }`;

  return (
    <>
      {/* Skip to content — visible on focus for keyboard/screen-reader users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:bg-verde-selva focus:text-crema focus:px-4 focus:py-2 focus:text-sm focus:rounded"
      >
        Saltar al contenido principal
      </a>

      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled || mobileOpen
            ? "bg-negro/95 backdrop-blur-md border-b border-white/8 shadow-lg"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex flex-col leading-none group">
            <span className="font-cormorant text-crema text-xl font-light tracking-[4px] uppercase group-hover:text-dorado transition-colors duration-200">
              HUASTECA
            </span>
            <span className="text-[9px] tracking-[3px] uppercase text-verde-vivo font-dm mt-0.5">
              Potosina
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-8">
            <Link href="/" className={navLinkClass("/")}>
              Inicio
            </Link>

            {/* Destinos Dropdown */}
            <div ref={destinosRef} className="relative">
              <button
                onClick={() => {
                  setDestinosOpen(!destinosOpen);
                  setExperienciasOpen(false);
                }}
                aria-expanded={destinosOpen}
                aria-controls="destinos-menu"
                aria-haspopup="true"
                className={`text-xs tracking-[2px] uppercase font-dm transition-colors duration-200 flex items-center gap-1.5 ${
                  isActive("/destinos") ? "text-lima" : "text-crema/70 hover:text-crema"
                }`}
              >
                Destinos
                <svg
                  className={`w-3 h-3 transition-transform duration-200 ${destinosOpen ? "rotate-180" : ""}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {destinosOpen && (
                <div id="destinos-menu" role="menu" aria-label="Menú de destinos" className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-72 bg-negro/98 backdrop-blur-md border border-white/12 shadow-2xl py-2">
                  <div className="px-4 py-2 border-b border-white/8 mb-1">
                    <Link
                      href="/destinos"
                      className="text-[9px] tracking-[3px] uppercase text-verde-vivo hover:text-lima transition-colors"
                    >
                      Ver todos los destinos →
                    </Link>
                  </div>
                  {DESTINOS_NAV.map((d) => (
                    <Link
                      key={d.slug}
                      href={`/destinos/${d.slug}`}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-verde-profundo/50 transition-colors group"
                    >
                      <span className="text-lg">{d.emoji}</span>
                      <span className="text-[12px] text-crema/75 group-hover:text-crema transition-colors font-dm">
                        {d.nombre}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Experiencias Dropdown */}
            <div ref={experienciasRef} className="relative">
              <button
                onClick={() => {
                  setExperienciasOpen(!experienciasOpen);
                  setDestinosOpen(false);
                }}
                aria-expanded={experienciasOpen}
                aria-controls="experiencias-menu"
                aria-haspopup="true"
                className={`text-xs tracking-[2px] uppercase font-dm transition-colors duration-200 flex items-center gap-1.5 ${
                  isActive("/experiencias") ? "text-lima" : "text-crema/70 hover:text-crema"
                }`}
              >
                Experiencias
                <svg
                  className={`w-3 h-3 transition-transform duration-200 ${experienciasOpen ? "rotate-180" : ""}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {experienciasOpen && (
                <div id="experiencias-menu" role="menu" aria-label="Menú de experiencias" className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-56 bg-negro/98 backdrop-blur-md border border-white/12 shadow-2xl py-2">
                  {EXPERIENCIAS_NAV.map((e) => (
                    <Link
                      key={e.href}
                      href={e.href}
                      className="block px-4 py-2.5 text-[12px] text-crema/75 hover:text-crema hover:bg-verde-profundo/50 transition-colors font-dm"
                    >
                      {e.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <Link href="/info-practica" className={navLinkClass("/info-practica")}>
              Info Práctica
            </Link>

            <Link href="/blog" className={navLinkClass("/blog")}>
              Blog
            </Link>

            <Link
              href="/planear"
              className="bg-verde-selva text-crema px-5 py-2.5 text-[10px] tracking-[2.5px] uppercase font-dm hover:bg-verde-vivo transition-colors duration-200"
            >
              Planear mi Viaje
            </Link>
          </div>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden flex flex-col gap-1.5 p-2 group"
            aria-label="Menú"
          >
            <span
              className={`block w-6 h-0.5 bg-crema/80 transition-all duration-300 ${
                mobileOpen ? "rotate-45 translate-y-2" : ""
              }`}
            />
            <span
              className={`block w-6 h-0.5 bg-crema/80 transition-all duration-300 ${
                mobileOpen ? "opacity-0" : ""
              }`}
            />
            <span
              className={`block w-6 h-0.5 bg-crema/80 transition-all duration-300 ${
                mobileOpen ? "-rotate-45 -translate-y-2" : ""
              }`}
            />
          </button>
        </div>

        {/* Mobile Menu Panel */}
        <div
          className={`lg:hidden overflow-hidden transition-all duration-300 border-t border-white/8 ${
            mobileOpen ? "max-h-screen opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="px-6 py-6 space-y-1 bg-negro/98">
            <Link
              href="/"
              className="block py-3 text-[11px] tracking-[3px] uppercase font-dm text-crema/70 hover:text-crema border-b border-white/6"
            >
              Inicio
            </Link>

            {/* Mobile Destinos */}
            <div className="border-b border-white/6">
              <button
                onClick={() => setDestinosOpen(!destinosOpen)}
                className="flex items-center justify-between w-full py-3 text-[11px] tracking-[3px] uppercase font-dm text-crema/70 hover:text-crema"
              >
                Destinos
                <svg
                  className={`w-3 h-3 transition-transform ${destinosOpen ? "rotate-180" : ""}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {destinosOpen && (
                <div className="pb-3 space-y-1 pl-3">
                  <Link href="/destinos" className="block py-2 text-[10px] tracking-[2px] uppercase text-verde-vivo hover:text-lima">
                    Ver todos →
                  </Link>
                  {DESTINOS_NAV.map((d) => (
                    <Link
                      key={d.slug}
                      href={`/destinos/${d.slug}`}
                      className="flex items-center gap-2.5 py-2 text-sm text-crema/60 hover:text-crema"
                    >
                      <span>{d.emoji}</span>
                      <span>{d.nombre}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Mobile Experiencias */}
            <div className="border-b border-white/6">
              <button
                onClick={() => setExperienciasOpen(!experienciasOpen)}
                className="flex items-center justify-between w-full py-3 text-[11px] tracking-[3px] uppercase font-dm text-crema/70 hover:text-crema"
              >
                Experiencias
                <svg
                  className={`w-3 h-3 transition-transform ${experienciasOpen ? "rotate-180" : ""}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {experienciasOpen && (
                <div className="pb-3 space-y-1 pl-3">
                  {EXPERIENCIAS_NAV.map((e) => (
                    <Link
                      key={e.href}
                      href={e.href}
                      className="block py-2 text-sm text-crema/60 hover:text-crema"
                    >
                      {e.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <Link
              href="/info-practica"
              className="block py-3 text-[11px] tracking-[3px] uppercase font-dm text-crema/70 hover:text-crema border-b border-white/6"
            >
              Info Práctica
            </Link>

            <Link
              href="/blog"
              className="block py-3 text-[11px] tracking-[3px] uppercase font-dm text-crema/70 hover:text-crema border-b border-white/6"
            >
              Blog
            </Link>

            <div className="pt-4">
              <Link
                href="/planear"
                className="block text-center bg-verde-selva text-crema py-4 text-[10px] tracking-[3px] uppercase font-dm hover:bg-verde-vivo transition-colors"
              >
                Planear mi Viaje
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Overlay to close dropdowns */}
      {(destinosOpen || experienciasOpen) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setDestinosOpen(false);
            setExperienciasOpen(false);
          }}
        />
      )}
    </>
  );
}
