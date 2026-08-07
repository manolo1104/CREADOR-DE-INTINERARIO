"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { trackBeginCheckout } from "@/lib/analytics";
import { trackTourEvent } from "@/lib/tourTracker";

interface Props {
  tourSlug: string;
  precio:   number;
  tourId?:  string;
  tourName?: string;
  /** "vehiculo" = precio por vehículo; se reserva por WhatsApp (waHref) en vez del flujo online. */
  precioUnidad?: "persona" | "vehiculo";
  waHref?:  string;
  /** De dónde sale la barra, para poder medir aparte la de tours y la de destinos. */
  source?:  "mobile_bar" | "destino_bar";
}

export function MobileBookingBar({ tourSlug, precio, tourId, tourName, precioUnidad, waHref, source = "mobile_bar" }: Props) {
  const esVehiculo = precioUnidad === "vehiculo";
  const track = () => {
    trackBeginCheckout({ tourId: tourId ?? tourSlug, tourName: tourName ?? tourSlug, price: precio, source });
    trackTourEvent("CHECKOUT_STARTED", { tour: tourId ?? tourSlug, tour_name: tourName ?? tourSlug, amount: precio, source });
  };
  const trackWa = () => {
    trackTourEvent("WHATSAPP_CLICK", { tour: tourId ?? tourSlug, tour_name: tourName ?? tourSlug, amount: precio, context: source });
  };
  const ctaClass = "flex items-center gap-2 bg-verde-selva hover:bg-verde-vivo text-crema px-5 py-3 text-[11px] tracking-[2px] uppercase font-dm transition-colors font-medium flex-shrink-0";

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-negro/97 backdrop-blur-sm px-4 py-3 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-[9px] tracking-[2px] uppercase text-crema/40 font-dm">Desde</p>
        <p className="font-cormorant text-dorado text-xl leading-none">
          ${precio.toLocaleString("es-MX")}
          <span className="font-dm text-[10px] text-crema/40 ml-1 font-normal">
            {esVehiculo ? "MXN/vehículo" : "MXN/persona"}
          </span>
        </p>
      </div>
      {waHref && (
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={trackWa}
          aria-label="Preguntar por WhatsApp"
          className="flex items-center justify-center w-11 h-11 bg-[#25D366] text-white flex-shrink-0 hover:brightness-110 transition-all"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </a>
      )}
      <Link href={`/reservar-tour/${tourSlug}`} onClick={track} className={ctaClass}>
        <Lock className="w-3.5 h-3.5" aria-hidden="true" />
        Reservar
      </Link>
    </div>
  );
}
