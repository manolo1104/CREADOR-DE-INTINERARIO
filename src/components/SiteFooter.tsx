"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AtSign, Share2, Music2 } from "lucide-react";
import { DESTINOS_DB } from "@/lib/destinos";
import { localizeDestino } from "@/lib/i18n/localize";
import { asLocale, localePath, type Locale } from "@/lib/i18n/config";
import { CONTACTO } from "@/lib/contacto";
import { CIUDADES_ORIGEN_EN } from "@/lib/ciudadesOrigenEn";
import { FloatingLeaves } from "@/components/FloatingLeaves";

/**
 * Pie de página del sitio público. Vive en el shell (no en la home) para que
 * las 43 páginas lo tengan: hasta agosto de 2026 solo existía dentro de
 * `app/page.tsx`, lo que dejaba a /tours, /precios, las 41 fichas de destino y
 * los 36 blogs sin aviso de privacidad, sin contacto y sin enlaces internos
 * (por eso /preguntas-frecuentes era una página huérfana).
 */
export function SiteFooter() {
  const pathname = usePathname();
  const locale: Locale = asLocale(pathname === "/en" || pathname.startsWith("/en/") ? "en" : "es");
  const en = locale === "en";
  const lp = (path: string) => localePath(path, locale);

  // En inglés solo enlazamos las rutas que existen bajo /en; mandar a /en/precios
  // sería mandar a un 404.
  const explora = en
    ? [
        { label: "Book a tour", href: lp("/reservar") },
        { label: "All-inclusive packages", href: lp("/paquetes") },
        { label: "Tours", href: lp("/tours") },
        { label: "Destinations", href: lp("/destinos") },
        { label: "Things to do", href: lp("/experiencias") },
        { label: "About us", href: lp("/nosotros") },
        { label: "Travel guide", href: lp("/info-practica") },
        { label: "FAQ", href: lp("/preguntas-frecuentes") },
      ]
    : [
        { label: "Reservar un tour", href: "/reservar" },
        { label: "Precios de tours", href: "/precios" },
        { label: "Preguntas frecuentes", href: "/preguntas-frecuentes" },
        { label: "Qué hacer en la Huasteca", href: "/que-hacer-en-la-huasteca-potosina" },
        { label: "Tours en Ciudad Valles", href: "/tours-en-ciudad-valles" },
        { label: "Info Práctica", href: "/info-practica" },
        { label: "¿Qué tour es para mí?", href: "/recomendar" },
        { label: "Blog", href: "/blog" },
        { label: "Sobre la Huasteca", href: "/sobre-la-huasteca-potosina" },
        { label: "Sustentabilidad", href: "/sustentabilidad-y-conservacion" },
      ];

  const legales = en
    ? [
        // `lp()` y no "/contacto" a secas: sin el prefijo, el pie del sitio
        // inglés devolvía al visitante al sitio español justo en la página
        // donde iba a escribir.
        { label: "Contact", href: lp("/contacto") },
        { label: "Press room", href: "/en/press" },
        // El aviso legal solo existe en español; /en/contacto lo advierte.
        { label: "Privacy Policy", href: "/aviso-de-privacidad" },
      ]
    : [
        { label: "Contacto", href: "/contacto" },
        { label: "Términos y condiciones", href: "/terminos" },
        { label: "Política de cancelación", href: "/politica-de-cancelacion" },
        { label: "Aviso de Privacidad", href: "/aviso-de-privacidad" },
        { label: "Créditos de fotos", href: "/creditos" },
      ];

  return (
    <footer className="relative bg-verde-profundo border-t border-white/8 py-16 px-6 overflow-hidden">
      <FloatingLeaves count={16} />
      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          <div>
            <div className="mb-4">
              <div className="font-cormorant text-crema text-2xl font-light tracking-[4px] uppercase">HUASTECA</div>
              <div className="text-[9px] tracking-[3px] uppercase text-verde-vivo font-dm mt-0.5">Potosina</div>
            </div>
            <p className="text-crema/40 text-xs font-dm leading-relaxed mb-4">
              {en
                ? "Local tour operator based in Xilitla, San Luis Potosí. Our own hotel and restaurant, NOM-09 certified guides, daily departures."
                : "Operadora local con base en Xilitla, San Luis Potosí. Hotel y restaurante propios, guías certificados NOM-09, salidas todos los días."}
            </p>
            <a
              href={CONTACTO.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-xs text-verde-vivo hover:text-lima transition-colors font-dm mb-2"
            >
              WhatsApp: {CONTACTO.telefonoDisplay}
            </a>
            <a
              href={`mailto:${CONTACTO.email}`}
              className="block text-xs text-crema/50 hover:text-crema transition-colors font-dm"
            >
              {CONTACTO.email}
            </a>
          </div>

          <div>
            <h3 className="text-[10px] tracking-[3px] uppercase text-crema/40 font-dm mb-5">
              {en ? "Destinations" : "Destinos"}
            </h3>
            <ul className="space-y-3">
              {DESTINOS_DB.slice(0, 4).map((base) => {
                const d = localizeDestino(base, locale);
                return (
                  <li key={d.slug}>
                    <Link
                      href={lp(`/destinos/${d.slug}`)}
                      className="text-crema/55 hover:text-crema text-sm font-dm transition-colors flex items-center gap-2"
                    >
                      <span className="text-verde-vivo text-xs" aria-hidden="true">→</span>
                      {d.nombre}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          <div>
            <h3 className="text-[10px] tracking-[3px] uppercase text-crema/40 font-dm mb-5">
              {en ? "Explore" : "Explora"}
            </h3>
            <ul className="space-y-3">
              {explora.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-crema/55 hover:text-crema text-sm font-dm transition-colors flex items-center gap-2"
                  >
                    <span className="text-verde-vivo text-xs" aria-hidden="true">→</span>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-[10px] tracking-[3px] uppercase text-crema/40 font-dm mb-5">
              {en ? "Company" : "Empresa"}
            </h3>
            <ul className="space-y-3 mb-6">
              {legales.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-crema/55 hover:text-crema text-sm font-dm transition-colors flex items-center gap-2"
                  >
                    <span className="text-verde-vivo text-xs" aria-hidden="true">→</span>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="flex gap-4 mb-3">
              <a
                href={CONTACTO.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="w-10 h-10 border border-white/20 hover:border-verde-vivo/60 flex items-center justify-center text-crema/50 hover:text-verde-vivo transition-all"
              >
                <Share2 className="w-4 h-4" aria-hidden="true" />
              </a>
              <span className="w-10 h-10 border border-white/8 flex items-center justify-center opacity-35 cursor-not-allowed">
                <AtSign className="w-4 h-4" aria-hidden="true" />
              </span>
              <span className="w-10 h-10 border border-white/8 flex items-center justify-center opacity-35 cursor-not-allowed">
                <Music2 className="w-4 h-4" aria-hidden="true" />
              </span>
            </div>
            <p className="text-[10px] tracking-[1px] text-crema/30 font-dm">
              {en ? "14K followers on Facebook" : "14K seguidores en Facebook"}
            </p>
          </div>
        </div>

        {/* Landings de origen. Sin enlaces internos son páginas huérfanas: el
            sitemap las declara, pero nada del sitio las respalda. */}
        {en && (
          <div className="border-t border-white/8 pt-8 pb-8 mb-2">
            <h3 className="text-[10px] tracking-[3px] uppercase text-crema/40 font-dm mb-4">
              Traveling from
            </h3>
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              {CIUDADES_ORIGEN_EN.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/en/from/${c.slug}`}
                    className="text-crema/55 hover:text-crema text-sm font-dm transition-colors flex items-center gap-2"
                  >
                    <span className="text-verde-vivo text-xs" aria-hidden="true">→</span>
                    {c.nombre}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="border-t border-white/8 pt-8 flex flex-col md:flex-row justify-between items-center gap-3 text-xs text-crema/25 font-dm tracking-wide">
          <span>
            © {new Date().getFullYear()} {CONTACTO.nombreComercial} ·{" "}
            {en ? "All rights reserved" : "Todos los derechos reservados"}
          </span>
          <span>{CONTACTO.ubicacionCorta}</span>
        </div>
      </div>
    </footer>
  );
}
