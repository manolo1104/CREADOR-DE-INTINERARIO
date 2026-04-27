"use client";

import { useState } from "react";
import Link from "next/link";
import { waLink, WA_MESSAGES } from "@/lib/whatsapp";

interface Props {
  tourName:  string;
  precioBase: number;
  tourSlug?:  string;
}

const WA_SVG = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
    className="w-4 h-4 flex-shrink-0" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.532 5.86L.054 23.447a.75.75 0 0 0 .916.99l5.764-1.511A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.693 9.693 0 0 1-4.953-1.357l-.355-.211-3.68.965.981-3.585-.232-.369A9.712 9.712 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
  </svg>
);

function Counter({
  label, value, min, max, onChange,
}: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-crema/60 font-dm">{label}</span>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label={`Reducir ${label}`}
          className="gloss-selector-light w-7 h-7 rounded-full border border-crema/25 flex items-center justify-center text-crema/70 hover:border-verde-vivo hover:text-crema disabled:opacity-30 transition-colors text-sm"
        >
          −
        </button>
        <span className="text-crema font-dm text-sm w-4 text-center">{value}</span>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          aria-label={`Aumentar ${label}`}
          className="gloss-selector-light w-7 h-7 rounded-full border border-crema/25 flex items-center justify-center text-crema/70 hover:border-verde-vivo hover:text-crema disabled:opacity-30 transition-colors text-sm"
        >
          +
        </button>
      </div>
    </div>
  );
}

/** ISO date → "lunes 14 de julio de 2026" */
function formatFecha(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-MX", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

/** Today in YYYY-MM-DD for min attribute */
function today(): string {
  return new Date().toISOString().split("T")[0];
}

export function TourCalculadora({ tourName, precioBase, tourSlug }: Props) {
  const [adultos, setAdultos] = useState(2);
  const [ninos, setNinos]     = useState(0);
  const [fecha, setFecha]     = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");

  const precioNino = Math.round(precioBase * 0.6);
  const total      = adultos * precioBase + ninos * precioNino;

  const waMsg = (() => {
    const base = WA_MESSAGES.tour(tourName, adultos, ninos, total);
    return fecha ? `${base} Fecha deseada: ${formatFecha(fecha)}.` : base;
  })();

  async function handleStripeCheckout() {
    setCheckoutLoading(true);
    setCheckoutError("");

    try {
      const res = await fetch("/api/cobrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monto: String(total),
          descripcion: `Reserva tour: ${tourName}`,
          producto: "tour_booking",
          metadata: {
            tour: tourName,
            adultos: String(adultos),
            ninos: String(ninos),
            fecha_preferida: fecha || "sin_fecha",
          },
        }),
      });

      const data: { url?: string; error?: string } = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }

      setCheckoutError(data.error || "No se pudo iniciar el pago con Stripe.");
    } catch {
      setCheckoutError("Error de conexión al iniciar pago.");
    } finally {
      setCheckoutLoading(false);
    }
  }

  return (
    <div className="gloss-surface-light border border-crema/20 p-4 space-y-3">
      <p className="text-[9px] tracking-[2px] uppercase text-crema/35 font-dm">
        Booking summary
      </p>

      {/* Fecha */}
      <div className="space-y-1">
        <label className="text-xs text-crema/60 font-dm block">
          Fecha preferida
        </label>
        <input
          type="date"
          value={fecha}
          min={today()}
          onChange={(e) => setFecha(e.target.value)}
          className="gloss-selector-light w-full border border-crema/25 text-crema font-dm text-xs px-3 py-2
                     focus:outline-none focus:border-verde-vivo transition-colors
                     [color-scheme:dark] cursor-pointer"
        />
        {fecha && (
          <p className="text-[10px] text-verde-vivo font-dm capitalize">
            {formatFecha(fecha)}
          </p>
        )}
      </div>

      <Counter label="Adultos" value={adultos} min={1} max={15} onChange={setAdultos} />
      <Counter
        label={`Niños 4–12 años ($${precioNino.toLocaleString("es-MX")} c/u)`}
        value={ninos} min={0} max={10} onChange={setNinos}
      />

      {ninos === 0 && (
        <p className="text-[10px] text-crema/30 font-dm">
          Menores de 4 años: gratis · Agrega niños para ver descuento
        </p>
      )}

      <div className="border-t border-white/10 pt-3 flex items-end justify-between">
        <div>
          <p className="text-[9px] tracking-[1px] uppercase text-crema/35 font-dm">Total estimado</p>
          <p className="font-cormorant text-dorado text-2xl leading-none">
            ${total.toLocaleString("es-MX")}
            <span className="font-dm text-[10px] text-crema/40 ml-1 font-normal">MXN</span>
          </p>
        </div>
        <p className="text-[9px] text-verde-vivo font-dm">
          {adultos} adulto{adultos > 1 ? "s" : ""}
          {ninos > 0 ? ` · ${ninos} niño${ninos > 1 ? "s" : ""}` : ""}
        </p>
      </div>

      <a
        href={waLink(waMsg)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full bg-[#25D366] hover:bg-[#20ba59]
                   text-white py-3.5 text-[11px] tracking-[2px] uppercase font-dm
                   transition-colors duration-200"
      >
        {WA_SVG}
        Reservar por WhatsApp
      </a>

      {tourSlug ? (
        <Link
          href={`/reservar-tour/${tourSlug}`}
          className="flex items-center justify-center gap-2 w-full bg-dorado hover:bg-terracota text-negro py-3.5 text-[11px] tracking-[2px] uppercase font-dm transition-colors duration-200 font-medium"
        >
          Reservar con tarjeta →
        </Link>
      ) : (
        <button
          onClick={handleStripeCheckout}
          disabled={checkoutLoading || total <= 0}
          className="w-full border border-agua/45 bg-agua/12 hover:bg-agua/20 text-agua py-3.5 text-[11px] tracking-[2px] uppercase font-dm transition-colors disabled:opacity-50"
        >
          {checkoutLoading ? "Redirigiendo..." : "Pagar con tarjeta"}
        </button>
      )}

      {checkoutError && (
        <p className="text-[11px] text-terracota/85 font-dm text-center">{checkoutError}</p>
      )}

      <p className="text-center text-[10px] text-crema/25 font-dm">
        ✓ Cancelación gratuita con 48h de anticipación
      </p>
    </div>
  );
}
