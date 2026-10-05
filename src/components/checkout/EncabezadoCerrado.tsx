"use client";

import Link from "next/link";
import { Lock, MessageCircle } from "lucide-react";
import { useLocale } from "@/lib/i18n/useLocale";
import { getBooking } from "@/lib/i18n/booking";
import { waLink } from "@/lib/whatsapp";
import { trackTourEvent } from "@/lib/tourTracker";

/**
 * El encabezado del checkout: logo, «Pago seguro» y ayuda por WhatsApp. Nada más.
 *
 * El menú del sitio (Inicio, Destinos, Tours, Blog…) son siete salidas del
 * embudo justo donde menos conviene. Los checkouts que convierten (GetYourGuide,
 * Viator, Xola) son «cerrados»: lo único que queda a mano es pagar o preguntar.
 * El menú se esconde por CSS mientras este componente está montado (ver
 * `data-checkout-cerrado` en `globals.css`).
 */
export function EncabezadoCerrado() {
  const { locale, lp } = useLocale();
  const t = getBooking(locale).checkout;
  return (
    <header className="bg-negro text-crema border-b border-white/8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
        <Link href={lp("/")} aria-label="Tours Huasteca Potosina" className="flex-shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logos/huasteca-logo.svg" alt="Tours Huasteca Potosina" width={942} height={267} className="h-8 w-auto" />
        </Link>
        <span className="inline-flex items-center gap-1.5 font-dm text-[10px] sm:text-[11px] tracking-[1.5px] uppercase text-crema/75">
          <Lock className="w-3.5 h-3.5 text-lima" aria-hidden="true" />
          {t.pagoSeguro}
        </span>
        <a
          href={waLink(t.waDudas)}
          target="_blank"
          rel="noopener noreferrer"
          data-wa-manual="1"
          onClick={() => trackTourEvent("WHATSAPP_CLICK", { origen: "checkout_encabezado" })}
          className="inline-flex items-center gap-1.5 font-dm text-[12px] text-crema/80 hover:text-crema transition-colors"
        >
          <MessageCircle className="w-4 h-4 text-[#25D366]" aria-hidden="true" />
          <span className="hidden sm:inline">{t.dudasWhatsapp}</span> WhatsApp
        </a>
      </div>
    </header>
  );
}
