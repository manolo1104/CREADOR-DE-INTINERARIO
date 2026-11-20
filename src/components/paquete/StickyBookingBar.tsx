"use client";

import { useEffect, useState } from "react";
import { trackTourEvent } from "@/lib/tourTracker";
import { EVENTO_COTIZAR, ID_COTIZADOR } from "./BookingWidget";

/**
 * Barra fija del celular en la ficha de paquete (20 nov 2026). Sustituye a la
 * global, que en esta página llevaba al catálogo de TOURS (`conBarraPropia` la
 * apaga aquí). Se esconde mientras el cotizador está en pantalla: no tapa lo
 * que ya se está usando. Deja su propio hueco al final para no tapar el pie.
 */
export function StickyBookingBar({
  precio, unidad, slug, waHref, t,
}: {
  precio: string;
  unidad: string;
  slug: string;
  waHref: string;
  t: { desde: string; reservar: string; whatsapp: string };
}) {
  const [cotizadorVisible, setCotizadorVisible] = useState(false);

  useEffect(() => {
    const el = document.getElementById(ID_COTIZADOR);
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => setCotizadorVisible(e.isIntersecting), { threshold: 0.15 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <>
      <div aria-hidden="true" className="h-[calc(72px+env(safe-area-inset-bottom))] lg:hidden" />
      <div
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-negro/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md transition-transform duration-300 ease-smooth-out motion-reduce:transition-none lg:hidden ${
          cotizadorVisible ? "translate-y-full" : "translate-y-0"
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-dm text-[11px] text-crema/55">{t.desde}</p>
            <p className="truncate font-dm text-crema">
              <span className="font-cormorant text-[24px] leading-none text-dorado">{precio}</span>
              <span className="text-[11px] text-crema/60"> MXN {unidad}</span>
            </p>
          </div>
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackTourEvent("WHATSAPP_PACKAGE_CLICK", { slug, origen: "barra-movil" })}
            aria-label={t.whatsapp}
            className="tactil flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-[#25D366]/50 text-[#25D366]"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true"><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.532 5.86L.054 23.447a.75.75 0 0 0 .916.99l5.764-1.511A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm5.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/></svg>
          </a>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent(EVENTO_COTIZAR, { detail: {} }))}
            className="tactil inline-flex min-h-[48px] items-center rounded-xl bg-dorado px-5 font-dm text-[12px] font-medium uppercase tracking-[1.5px] text-negro"
          >
            {t.reservar}
          </button>
        </div>
      </div>
    </>
  );
}
