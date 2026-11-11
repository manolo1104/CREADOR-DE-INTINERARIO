"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Globe } from "lucide-react";
import { asLocale, localePath, type Locale } from "@/lib/i18n/config";
import { getDict } from "@/lib/i18n/messages";
import { BandaRio } from "@/components/BandaRio";
import { BandaViaje } from "@/components/viajeCdmx/BandaViaje";
import PARES_BLOG from "@/content/blog-en/pares.json";

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
  "/comparar",
  // Traducidas el 10 nov 2026.
  "/politica-de-cancelacion", "/terminos", "/aviso-de-privacidad", "/sustentabilidad-y-conservacion",
  "/grupos", "/creditos",
  "/que-hacer-en-la-huasteca-potosina", "/sobre-la-huasteca-potosina", "/tours-en-xilitla",
  "/tours-en-ciudad-valles", "/xilitla-o-ciudad-valles",
]);
// Fichas: toda ficha de tour, destino o paquete existe en los dos idiomas.
const FICHAS_CON_EN = /^\/(?:tours|destinos|paquetes)\/[^/]+$/;
// …menos las de Xantolo, que solo se venden en español: /en/paquetes/noche-de-xantolo
// daba 404 y /en/paquetes/xantolo-2026 rebota al español. Van al catálogo en inglés.
const FICHAS_SOLO_ES = new Set(["/paquetes/noche-de-xantolo", "/paquetes/xantolo-2026"]);
// Solo existen en inglés (sala de prensa y landings de ciudades de EE. UU.):
// quitarles el /en daba 404, así que el botón "Español" lleva al inicio.
const SOLO_EN = /^\/en\/(?:press|from)(?:\/|$)/;

// «Sustentabilidad» en el menú, de escritorio y de celular (Manolo,
// 7 oct 2026: «súbelo, si no me gusta lo bajamos»). Desde el 10 nov 2026 también
// en inglés (/en/sustentabilidad-y-conservacion). Para BAJARLO basta con poner `false` aquí; con él se va
// también el espaciado más corto que necesita el menú de escritorio.
const MENU_SUSTENTABILIDAD = true;

// Contraparte de idioma para el selector (sin pareja → inicio del otro idioma,
// nunca un 404).
/** Gemelas con slug distinto en cada idioma (el viaje desde CDMX, 16 oct 2026). */
const PARES: Record<string, string> = {
  "/viaje-cdmx-xilitla": "/en/huasteca-potosina-from-mexico-city",
  // Guías nuevas del 10 nov 2026.
  "/donde-hospedarse-en-la-huasteca-potosina": "/en/where-to-stay-in-huasteca-potosina",
  "/cascadas-de-la-huasteca-potosina": "/en/huasteca-potosina-waterfalls",
};
const PARES_EN: Record<string, string> = Object.fromEntries(Object.entries(PARES).map(([es, en]) => [en, es]));

/**
 * Artículos del blog traducidos (10 nov 2026): `{ slug ES: slug EN }`, el mismo
 * archivo que escribe el robot (`src/content/blog-en/pares.json`). Un artículo
 * SIN traducción manda al índice del blog del otro idioma, no al inicio.
 */
const BLOG_ES_EN: Record<string, string> = PARES_BLOG as Record<string, string>;
const BLOG_EN_ES: Record<string, string> = Object.fromEntries(Object.entries(BLOG_ES_EN).map(([es, en]) => [en, es]));

function parBlog(pathname: string): string | null {
  if (pathname === "/blog") return "/en/blog";
  if (pathname === "/en/blog") return "/blog";
  const es = pathname.match(/^\/blog\/([^/]+)$/);
  if (es) {
    const en = BLOG_ES_EN[es[1].replace(/-20\d{2}$/, "")];
    return en ? `/en/blog/${en}` : "/en/blog";
  }
  const en = pathname.match(/^\/en\/blog\/([^/]+)$/);
  if (en) return BLOG_EN_ES[en[1]] ? `/blog/${BLOG_EN_ES[en[1]]}` : "/blog";
  return null;
}

function counterpartHref(pathname: string, locale: Locale): string {
  if (PARES[pathname]) return PARES[pathname];
  if (PARES_EN[pathname]) return PARES_EN[pathname];
  const blog = parBlog(pathname);
  if (blog) return blog;
  if (locale === "en") {
    if (SOLO_EN.test(pathname)) return "/";
    return pathname.replace(/^\/en/, "") || "/";
  }
  if (pathname === "/") return "/en";
  if (FICHAS_SOLO_ES.has(pathname)) return "/en/paquetes";
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

  // El inicio solo se marca en el inicio: "/en" + "/" casaba con TODA página en
  // inglés y «Home» salía encendido en todo el sitio inglés (10 nov 2026).
  const isActive = (href: string) =>
    pathname === href || (href !== "/" && href !== "/en" && pathname.startsWith(href + "/"));
  // Espaciado de letra más corto entre 1024 y 1279 px: ver el comentario del
  // menú de escritorio.
  const navLinkClass = (href: string) =>
    `text-[11px] tracking-[1.5px] xl:tracking-[2.5px] uppercase font-dm transition-colors duration-200 nav-link-shimmer ${
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
        {/* El viaje desde CDMX, justo debajo (17 oct 2026). Su alto lo repone `EspacioBandaViaje`. */}
        <BandaViaje />
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href={lp("/")} className="flex-shrink-0 group" aria-label="Tours Huasteca Potosina">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {/* Logo «versión E» (11 nov 2026). El kit solo trae el apilado, que a
                64 px de barra mediría 76 de ancho (la guía pide 120 mínimo): aquí
                va el horizontal armado con las MISMAS piezas del kit. Entre 1024
                y 1279 baja a 36 px para que el menú no lo toque. */}
            <img src="/logos/huasteca-potosina-tours-horizontal-reverso.svg" alt="Huasteca Potosina Tours" width={916} height={199} className="h-10 lg:h-9 xl:h-11 w-auto transition-opacity duration-200 group-hover:opacity-85" />
          </Link>

          {/* Desktop Nav
              Con «Sustentabilidad» el menú en español mide ~1,030 px con el
              hueco de 20 px y a 1024 se encimaba con el logo (medido con la
              fuente real). Con 14 px cabe desde ~980 px, también en Windows,
              donde la barra de scroll se come 17. Desde 1280 vuelve el de 28.
              🔴 26 oct 2026: con «Nosotros» de vuelta el menú medía 867 px y a
              1024 tocaba el logo (0 px de aire; en Windows, encimado). Entre
              1024 y 1279 los enlaces van con 1.5 px de espaciado de letra y
              12 de hueco: ~782 px, con aire también en Windows. */}
          <div className={`hidden lg:flex items-center ${MENU_SUSTENTABILIDAD ? "gap-3" : "gap-5"} xl:gap-7`}>
            <Link href={lp("/")} className={navLinkClass(lp("/"))}>{dict.nav.tours && (locale === "en" ? "Home" : "Inicio")}</Link>

            <Link href={lp("/destinos")} className={navLinkClass(lp("/destinos"))}>{dict.nav.destinos}</Link>

            <Link href={lp("/tours")} className={navLinkClass(lp("/tours"))}>{dict.nav.tours}</Link>

            {/* Paquetes ya existe en los dos idiomas (/en/paquetes y su ficha). */}
            <Link href={lp("/paquetes")} className={navLinkClass(lp("/paquetes"))}>{dict.nav.paquetes}</Link>
            {/* "Precios" salió de la barra (Manolo, 1 oct 2026) y vive en el pie
                (SiteFooter). "Nosotros" salió ese día y volvió el 26 oct 2026
                (Manolo), en los dos idiomas: /en/nosotros existe. */}
            <Link href={lp("/info-practica")} className={navLinkClass(lp("/info-practica"))}>{dict.nav.infoPractica}</Link>

            <Link href={lp("/nosotros")} className={navLinkClass(lp("/nosotros"))}>{dict.nav.nosotros}</Link>

            {/* Blog y Sustentabilidad: en los dos idiomas desde el 10 nov 2026
                (blog en inglés en /en/blog). "Contacto" vive solo en el pie
                (SiteFooter): con 9 enlaces el CTA de Reservar se perdía. */}
            <Link href={lp("/blog")} className={navLinkClass(lp("/blog"))}>{dict.nav.blog}</Link>
            {MENU_SUSTENTABILIDAD && (
              <Link href={lp("/sustentabilidad-y-conservacion")} className={navLinkClass(lp("/sustentabilidad-y-conservacion"))}>
                {locale === "en" ? "Sustainability" : "Sustentabilidad"}
              </Link>
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
            <Link href={lp("/nosotros")} className="block py-3 text-[11px] tracking-[3px] uppercase font-dm text-crema/70 hover:text-crema border-b border-white/6">
              {dict.nav.nosotros}
            </Link>

            {locale === "es" && (
              <>
                <Link href="/preguntas-frecuentes" className="block py-3 text-[11px] tracking-[3px] uppercase font-dm text-crema/70 hover:text-crema border-b border-white/6">Preguntas frecuentes</Link>

              </>
            )}

            <Link href={lp("/blog")} className="block py-3 text-[11px] tracking-[3px] uppercase font-dm text-crema/70 hover:text-crema border-b border-white/6">{dict.nav.blog}</Link>

            {MENU_SUSTENTABILIDAD && (
              <Link href={lp("/sustentabilidad-y-conservacion")} className="block py-3 text-[11px] tracking-[3px] uppercase font-dm text-crema/70 hover:text-crema border-b border-white/5">
                {locale === "en" ? "Sustainability" : "Sustentabilidad"}
              </Link>
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
