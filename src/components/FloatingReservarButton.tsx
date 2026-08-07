"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { trackCtaClick } from "@/lib/analytics";
import { waLink, WA_MESSAGES } from "@/lib/whatsapp";
import { toursQueIncluyen } from "@/lib/tourMapping";

const LOCK_SVG = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
    className="w-5 h-5 flex-shrink-0" aria-hidden="true">
    <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3A5.25 5.25 0 0012 1.5zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
  </svg>
);

const WA_SVG = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
    className="w-6 h-6 flex-shrink-0" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.532 5.86L.054 23.447a.75.75 0 0 0 .916.99l5.764-1.511A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.693 9.693 0 0 1-4.953-1.357l-.355-.211-3.68.965.981-3.585-.232-.369A9.712 9.712 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
  </svg>
);

export function FloatingReservarButton() {
  const pathname = usePathname();
  if (pathname === "/planear" || pathname === "/recomendar") return null;

  // Detecta páginas de detalle de tour (ES y EN). Ahí ya existe la MobileBookingBar
  // fija abajo en móvil (que ya incluye WhatsApp), así que ocultamos los flotantes
  // en móvil para no encimarlos.
  const tourSlugMatch = pathname.match(/^\/(?:en\/)?tours\/([^/]+)$/);

  // En un destino con tour propio también se monta la MobileBookingBar, así que
  // aplica la misma regla. Y de paso el botón deja de mandar al catálogo
  // genérico: lleva al tour concreto que visita ese destino.
  const destinoSlugMatch = pathname.match(/^\/(?:en\/)?destinos\/([^/]+)$/);
  const tourDelDestino = destinoSlugMatch
    ? toursQueIncluyen(destinoSlugMatch[1])[0]
    : undefined;

  const conBarraInferior = !!tourSlugMatch || !!tourDelDestino;
  const href = tourSlugMatch
    ? `/reservar-tour/${tourSlugMatch[1]}`
    : tourDelDestino
      ? `/tours/${tourDelDestino.slug}`
      : "/tours";
  const waHref = waLink(WA_MESSAGES.flotante);
  const visibility = conBarraInferior ? "hidden lg:flex" : "flex";

  return (
    <>
      {/* WhatsApp: el canal #1 de conversión, siempre a un tap (encima del botón Reservar) */}
      <a
        href={waHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Escribir por WhatsApp"
        onClick={() => trackCtaClick("floating_whatsapp", waHref)}
        className={`fixed right-6 z-50 items-center justify-center
                   bg-[#25D366] hover:bg-[#1ebe5b] text-white
                   w-[52px] h-[52px] rounded-full shadow-xl shadow-black/40
                   transition-all duration-300 hover:scale-105
                   bottom-[86px] ${visibility}`}
      >
        {WA_SVG}
      </a>
      <Link
        href={href}
        aria-label="Reservar tour"
        onClick={() => trackCtaClick("floating_button", href)}
        className={`fixed bottom-6 right-6 z-50 items-center gap-2.5
                   bg-dorado hover:bg-terracota text-negro hover:text-crema
                   pl-4 pr-5 py-3.5 rounded-full shadow-xl shadow-black/40
                   transition-all duration-300 hover:scale-105
                   ${visibility}`}
      >
        {LOCK_SVG}
        <span className="hidden sm:block text-[11px] tracking-[1.5px] uppercase font-dm font-medium">
          Reservar tour
        </span>
      </Link>
    </>
  );
}
