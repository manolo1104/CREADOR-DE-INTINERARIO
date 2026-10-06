"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Globe } from "lucide-react";
import { asLocale, localePath, type Locale } from "@/lib/i18n/config";
import { getDict } from "@/lib/i18n/messages";
import { BandaRio } from "@/components/BandaRio";

// Páginas españolas que SÍ tienen pareja en /en (la misma que declara su
// hreflang). Antes solo estaban el inicio, /tours y /destinos: en /precios,
// /paquetes o /reservar el botón "English" mandaba al inicio en inglés y el
// visitante perdía la página que estaba leyendo.
// 🔴 Tiene que coincidir con `bilingualStatic` y las fichas de
// src/app/sitemap.ts. No se importa de ahí porque ese archivo carga Prisma y
// este es un componente de cliente. El carrito entra aunque no esté en el
// sitemap: los dos idiomas leen el mismo carrito guardado en el navegador.
const ES_CON_EN = new Set([
  "/", "/tours", "/destinos", "/paquetes", "/precios", "/reservar", "/reservar/carrito",
  "/info-practica", "/nosotros", "/contacto", "/preguntas-frecuentes", "/experiencias",
  "/viaje-septiembre", "/comparar",
]);
// Fichas: toda ficha de tour, destino o paquete existe en los dos idiomas.
const FICHAS_CON_EN = /^\/(?:tours|destinos|paquetes)\/[^/]+$/;
// Solo existen en inglés (sala de prensa y landings de ciudades de EE. UU.):
// quitarles el /en daba 404, así que el botón "Español" lleva al inicio.
const SOLO_EN = /^\/en\/(?:press|from)(?:\/|$)/;

// Contraparte de idioma para el selector (sin pareja → inicio del otro idioma,
// nunca un 404).
function counterpartHref(pathname: string, locale: Locale): string {
  if (locale === "en") {
    if (SOLO_EN.test(pathname)) return "/";
    return pathname.replace(/^\/en/, "") || "/";
  }
  if (pathname === "/") return "/en";
  if (ES_CON_EN.has(pathname) || FICHAS_CON_EN.test(pathname)) return "/en" + pathname;
  return "/en";
}

export default function Navbar() {
  // (El contador del itinerario se importaba aquí pero nunca se renderizó.
  //  El contexto sigue disponible en @/context/ItinerarioContext por si algún
  //  día se construye la página que muestre la lista.)
  const [scrolled, setScrolled] = useState(false);
  const [navbarVisible, setNavbarVisible] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [destinosOpen, setDestinosOpen] = useState(false);
  const pathname = usePathname();
  const lastScrollY = useRef(0);

  const locale: Locale = asLocale(pathname === "/en" || pathname.startsWith("/en/") ? "en" : "es");
  const dict = getDict(locale);
  const lp = (path: string) => localePath(path, locale);
  // El motor de reservas ya existe en los dos idiomas: /en/reservar, el carrito
  // y la confirmación están traducidos. El botón lleva al motor en ambos.
  // (Antes en inglés iba a /en/tours porque /en/reservar daba 404: el visitante
  // que pulsaba "Book" volvía al catálogo y no había forma de reservar.)
  // 🔴 28 sep 2026 — en la ficha de un tour, "Reservar" mandaba al catálogo
  // genérico y se perdía el contexto: el visitante que ya está leyendo la
  // Expedición Tamul acababa en una lista de once recorridos. En esas páginas
  // el botón baja al módulo de reserva de ESE tour, que ya trae calendario,
  // personas y total. En el resto del sitio sigue yendo al motor.
  const enFichaDeTour = /^\/(?:en\/)?tours\/[^/]+$/.test(pathname);
  const reservarHref = enFichaDeTour ? "#reservar-este-tour" : lp("/reservar");
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

  // La altura REAL del menú, no 64 px fijos.
  // 🔴 2 oct 2026: la banda del estado del río vive DENTRO del menú (para
  // esconderse con él) y lo hace 28 a 43 px más alto, pero `--navbar-offset`
  // seguía en 64. Todo lo que se pega debajo del menú —el subnav de /tours, el
  // índice de /info-practica, el encabezado del comparador— quedaba tapado
  // esos píxeles cada vez que el menú reaparecía al subir. Se mide con
  // ResizeObserver porque la banda llega después (pide el estado al servidor).
  // Con el menú móvil abierto no se mide: crece a toda la pantalla y ese alto
  // no es el que tapa nada.
  const navRef = useRef<HTMLElement>(null);
  const mobileOpenRef = useRef(false);
  const [altoNav, setAltoNav] = useState(64);
  useEffect(() => {
    mobileOpenRef.current = mobileOpen;
  }, [mobileOpen]);
  useEffect(() => {
    const nav = navRef.current;
    if (!nav || typeof ResizeObserver === "undefined") return;
    const medir = () => {
      if (mobileOpenRef.current) return;
      const alto = Math.round(nav.getBoundingClientRect().height);
      if (alto > 0) setAltoNav(alto);
    };
    const ro = new ResizeObserver(medir);
    ro.observe(nav);
    medir();
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty("--navbar-offset", navbarVisible ? `${altoNav}px` : "0px");
  }, [navbarVisible, altoNav]);

  // El alto del menú aunque esté escondido: lo usa lo que vive DENTRO del
  // hero (los badges de la ficha de tour) y no debe brincar al esconderse.
  useEffect(() => {
    document.documentElement.style.setProperty("--navbar-alto", `${altoNav}px`);
  }, [altoNav]);

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

      {/* `data-navbar-sitio`: el checkout cerrado lo esconde por CSS (globals.css). */}
      <nav ref={navRef} data-navbar-sitio className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-negro/95 backdrop-blur-md border-b border-white/8 ${scrolled || mobileOpen ? "shadow-lg" : ""} ${navbarVisible ? "translate-y-0" : "-translate-y-full"}`}>
        {/* Estado del río: dentro del contenedor fijo para esconderse con él. */}
        <BandaRio />
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href={lp("/")} className="flex-shrink-0 group" aria-label="Tours Huasteca Potosina">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logos/huasteca-logo.svg" alt="Tours Huasteca Potosina" width={942} height={267} className="h-11 w-auto transition-opacity duration-200 group-hover:opacity-85" />
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-5 xl:gap-7">
            <Link href={lp("/")} className={navLinkClass(lp("/"))}>{dict.nav.tours && (locale === "en" ? "Home" : "Inicio")}</Link>

            <Link href={lp("/destinos")} className={navLinkClass(lp("/destinos"))}>{dict.nav.destinos}</Link>

            <Link href={lp("/tours")} className={navLinkClass(lp("/tours"))}>{dict.nav.tours}</Link>

            {/* Paquetes ya existe en los dos idiomas (/en/paquetes y su ficha). */}
            <Link href={lp("/paquetes")} className={navLinkClass(lp("/paquetes"))}>{dict.nav.paquetes}</Link>
            {/* "Nosotros" y "Precios" salieron de la barra (Manolo, 1 oct 2026).
                Las páginas siguen vivas: /precios está en el pie (SiteFooter);
                /nosotros, en el pie solo en inglés. */}
            <Link href={lp("/info-practica")} className={navLinkClass(lp("/info-practica"))}>{dict.nav.infoPractica}</Link>

            {/* Secciones solo-ES (aún sin versión en inglés) */}
            {locale === "es" && (
              <>
                <Link href="/blog" className={navLinkClass("/blog")}>{dict.nav.blog}</Link>
                {/* "Contacto" vive solo en el pie (SiteFooter). El navbar tenía 9
                    enlaces y el CTA de Reservar se perdía entre ellos. */}
              </>
            )}

            {/* Selector de idioma */}
            <Link href={switchHref} prefetch={false} className="flex items-center gap-1.5 text-[11px] tracking-[2px] uppercase font-dm text-crema/60 hover:text-crema transition-colors" aria-label={dict.switcher.label}>
              <Globe className="w-3.5 h-3.5" aria-hidden="true" />
              {locale === "en" ? "ES" : "EN"}
            </Link>

            <Link href={reservarHref} className="relative bg-dorado text-negro px-5 py-2.5 text-[10px] tracking-[2.5px] uppercase font-dm hover:bg-terracota hover:text-crema transition-colors duration-200 font-medium">
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

            <Link href={lp("/paquetes")} className="block py-3 text-[11px] tracking-[3px] uppercase font-dm text-crema/70 hover:text-crema border-b border-white/6">
              {dict.nav.paquetes}
            </Link>
            <Link href={lp("/info-practica")} className="block py-3 text-[11px] tracking-[3px] uppercase font-dm text-crema/70 hover:text-crema border-b border-white/6">
              {dict.nav.infoPractica}
            </Link>
            <Link href={lp("/tours")} className="block py-3 text-[11px] tracking-[3px] uppercase font-dm text-crema/70 hover:text-crema border-b border-white/6">
              {dict.nav.tours}
            </Link>

            {locale === "es" && (
              <>
                <Link href="/preguntas-frecuentes" className="block py-3 text-[11px] tracking-[3px] uppercase font-dm text-crema/70 hover:text-crema border-b border-white/6">Preguntas frecuentes</Link>

                <Link href="/blog" className="block py-3 text-[11px] tracking-[3px] uppercase font-dm text-crema/70 hover:text-crema border-b border-white/6">{dict.nav.blog}</Link>
              </>
            )}

            <Link href={switchHref} prefetch={false} className="flex items-center gap-2 py-3 text-[11px] tracking-[3px] uppercase font-dm text-crema/70 hover:text-crema border-b border-white/6">
              <Globe className="w-4 h-4" aria-hidden="true" /> {locale === "en" ? "Español" : "English"}
            </Link>

            <div className="pt-4">
              <Link href={reservarHref} className="block text-center bg-dorado text-negro py-4 text-[10px] tracking-[3px] uppercase font-dm hover:bg-terracota hover:text-crema transition-colors font-medium">
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
