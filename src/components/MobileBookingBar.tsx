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
}

export function MobileBookingBar({ tourSlug, precio, tourId, tourName, precioUnidad, waHref }: Props) {
  const esVehiculo = precioUnidad === "vehiculo";
  const track = () => {
    trackBeginCheckout({ tourId: tourId ?? tourSlug, tourName: tourName ?? tourSlug, price: precio, source: "mobile_bar" });
    trackTourEvent("CHECKOUT_STARTED", { tour: tourId ?? tourSlug, tour_name: tourName ?? tourSlug, amount: precio, source: "mobile_bar" });
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
      {esVehiculo && waHref ? (
        <a href={waHref} target="_blank" rel="noopener noreferrer" onClick={track} className={ctaClass}>
          <Lock className="w-3.5 h-3.5" aria-hidden="true" />
          Reservar
        </a>
      ) : (
        <Link href={`/reservar-tour/${tourSlug}`} onClick={track} className={ctaClass}>
          <Lock className="w-3.5 h-3.5" aria-hidden="true" />
          Reservar
        </Link>
      )}
    </div>
  );
}
