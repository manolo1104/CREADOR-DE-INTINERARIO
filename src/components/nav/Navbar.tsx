"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useItinerario } from "@/context/ItinerarioContext";
import { Globe } from "lucide-react";
import { asLocale, localePath, type Locale } from "@/lib/i18n/config";
import { getDict } from "@/lib/i18n/messages";

// Contraparte de idioma para el selector (evita 404: solo rutas core tienen /en).
function counterpartHref(pathname: string, locale: Locale): string {
  if (locale === "en") {
    return pathname.replace(/^\/en/, "") || "/";
  }
  if (pathname === "/") return "/en";
  if (pathname === "/tours" || pathname.startsWith("/tours/")) return "/en" + pathname;
  if (pathname === "/destinos" || pathname.startsWith("/destinos/")) return "/en" + pathname;
  return "/en";
}

export default function Navbar() {
  const { count } = useItinerario();
  const [scrolled, setScrolled] = useState(false);
  const [navbarVisible, setNavbarVisible] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [destinosOpen, setDestinosOpen] = useState(false);
  const pathname = usePathname();
  const lastScrollY = useRef(0);

  const locale: Locale = asLocale(pathname === "/en" || pathname.startsWith("/en/") ? "en" : "es");
  const dict = getDict(locale);
  const lp = (path: string) => localePath(path, locale);
  const switchHref = counterpartHref(pathname, locale);

  const destinosRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => {
      const currentY = window.scrollY;
      setScrolled(currentY > 40);
      if (currentY <= 80 || mobileOpen) {
        setNavbarVisible(true);
      } else if (currentY > lastScrollY.current + 8) {
        setNavbarVisible(false);
      } else if (currentY < lastScrollY.current - 5) {
        setNavbarVisible(true);
      }
      lastScrollY.current = currentY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [mobileOpen]);

  useEffect(() => {
    document.documentElement.style.setProperty("--navbar-offset", navbarVisible ? "64px" : "0px");
  }, [navbarVisible]);

  useEffect(() => {
    setMobileOpen(false);
    setDestinosOpen(false);
  }, [pathname]);

  // Menú móvil abierto: bloquea el scroll del body y permite cerrar con Escape.
  useEffect(() => {
    if (!mobileOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileOpen(false);
        setDestinosOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [mobileOpen]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (destinosRef.current && !destinosRef.current.contains(e.target as Node)) {
        setDestinosOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const navLinkClass = (href: string) =>
    `text-[11px] tracking-[2.5px] uppercase font-dm transition-colors duration-200 nav-link-shimmer ${
      isActive(href) ? "text-lima" : "text-crema/70 hover:text-crema"
    }`;

  return (
    <>
      <a href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:bg-verde-selva focus:text-crema focus:px-4 focus:py-2 focus:text-sm focus:rounded">
        {locale === "en" ? "Skip to main content" : "Saltar al contenido principal"}
      </a>

      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-negro/95 backdrop-blur-md border-b border-white/8 ${scrolled || mobileOpen ? "shadow-lg" : ""} ${navbarVisible ? "translate-y-0" : "-translate-y-full"}`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href={lp("/")} className="flex-shrink-0 group" aria-label="Tours Huasteca Potosina">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logos/huasteca-logo.svg" alt="Tours Huasteca Potosina" width={942} height={267} className="h-11 w-auto transition-opacity duration-200 group-hover:opacity-85" />
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-8">
            <Link href={lp("/")} className={navLinkClass(lp("/"))}>{dict.nav.tours && (locale === "en" ? "Home" : "Inicio")}</Link>

            <Link href={lp("/destinos")} className={navLinkClass(lp("/destinos"))}>{dict.nav.destinos}</Link>

            <Link href={lp("/tours")} className={navLinkClass(lp("/tours"))}>{dict.nav.tours}</Link>

            {/* Secciones solo-ES (aún sin versión en inglés) */}
            {locale === "es" && (
              <>
                <Link href="/paquetes" className={navLinkClass("/paquetes")}>{dict.nav.paquetes}</Link>
                <Link href="/info-practica" className={navLinkClass("/info-practica")}>{dict.nav.infoPractica}</Link>
                <Link href="/nosotros" className={navLinkClass("/nosotros")}>{dict.nav.nosotros}</Link>
                <Link href="/blog" className={navLinkClass("/blog")}>{dict.nav.blog}</Link>
              </>
            )}

            {/* Selector de idioma */}
            <Link href={switchHref} prefetch={false} className="flex items-center gap-1.5 text-[11px] tracking-[2px] uppercase font-dm text-crema/60 hover:text-crema transition-colors" aria-label={dict.switcher.label}>
              <Globe className="w-3.5 h-3.5" aria-hidden="true" />
              {locale === "en" ? "ES" : "EN"}
            </Link>

            <Link href={lp("/tours")} className="relative bg-dorado text-negro px-5 py-2.5 text-[10px] tracking-[2.5px] uppercase font-dm hover:bg-terracota hover:text-crema transition-colors duration-200 font-medium">
              {dict.nav.reservar}
            </Link>
          </div>

          {/* Mobile Hamburger */}
          <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden flex flex-col gap-1.5 p-2 group" aria-label="Menu">
            <span className={`block w-6 h-0.5 bg-crema/80 transition-all duration-300 ${mobileOpen ? "rotate-45 translate-y-2" : ""}`} />
            <span className={`block w-6 h-0.5 bg-crema/80 transition-all duration-300 ${mobileOpen ? "opacity-0" : ""}`} />
            <span className={`block w-6 h-0.5 bg-crema/80 transition-all duration-300 ${mobileOpen ? "-rotate-45 -translate-y-2" : ""}`} />
          </button>
        </div>

        {/* Mobile Menu Panel */}
        <div className={`lg:hidden transition-all duration-300 border-t border-white/8 ${mobileOpen ? "max-h-[calc(100vh-4rem)] overflow-y-auto opacity-100" : "max-h-0 overflow-hidden opacity-0"}`}>
          <div className="px-6 py-6 space-y-1 bg-negro/98">
            <Link href={lp("/")} className="block py-3 text-[11px] tracking-[3px] uppercase font-dm text-crema/70 hover:text-crema border-b border-white/6">
              {locale === "en" ? "Home" : "Inicio"}
            </Link>

            <Link href={lp("/destinos")} className="block py-3 text-[11px] tracking-[3px] uppercase font-dm text-crema/70 hover:text-crema border-b border-white/6">
              {dict.nav.destinos}
            </Link>

            <Link href={lp("/tours")} className="block py-3 text-[11px] tracking-[3px] uppercase font-dm text-crema/70 hover:text-crema border-b border-white/6">
              {dict.nav.tours}
            </Link>

            {locale === "es" && (
              <>
                <Link href="/paquetes" className="block py-3 text-[11px] tracking-[3px] uppercase font-dm text-crema/70 hover:text-crema border-b border-white/6">{dict.nav.paquetes}</Link>
                <Link href="/info-practica" className="block py-3 text-[11px] tracking-[3px] uppercase font-dm text-crema/70 hover:text-crema border-b border-white/6">{dict.nav.infoPractica}</Link>
                <Link href="/nosotros" className="block py-3 text-[11px] tracking-[3px] uppercase font-dm text-crema/70 hover:text-crema border-b border-white/6">{dict.nav.nosotros}</Link>
                <Link href="/blog" className="block py-3 text-[11px] tracking-[3px] uppercase font-dm text-crema/70 hover:text-crema border-b border-white/6">{dict.nav.blog}</Link>
              </>
            )}

            <Link href={switchHref} prefetch={false} className="flex items-center gap-2 py-3 text-[11px] tracking-[3px] uppercase font-dm text-crema/70 hover:text-crema border-b border-white/6">
              <Globe className="w-4 h-4" aria-hidden="true" /> {locale === "en" ? "Español" : "English"}
            </Link>

            <div className="pt-4">
              <Link href={lp("/tours")} className="block text-center bg-dorado text-negro py-4 text-[10px] tracking-[3px] uppercase font-dm hover:bg-terracota hover:text-crema transition-colors font-medium">
                {dict.nav.reservar}
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {destinosOpen && (<div className="fixed inset-0 z-40" onClick={() => setDestinosOpen(false)} />)}
    </>
  );
}
