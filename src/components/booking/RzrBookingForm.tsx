"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveTourBookingState, formatMXN } from "@/lib/tourBooking";
import { agregarAlCarrito } from "@/lib/carrito";
import { itemDesdeTour } from "@/lib/carritoItems";
import { computeVehiculoCharge, vehiculoBookingName } from "@/lib/tourPricing";
import type { Tour } from "@/lib/tours";
import { TourCalendar } from "@/components/booking/TourCalendar";
import { ViewersCounter } from "@/components/booking/ViewersCounter";
import { Clock, Shield, Star, Lock } from "lucide-react";
import { trackDateSelected } from "@/lib/analytics";

/** Flujo de reserva en línea para tours cobrados POR VEHÍCULO (RZR): el cliente
 *  elige ruta + vehículo + unidades y paga con tarjeta. El precio sale de la
 *  matriz flota×ruta y el servidor lo recalcula al crear el PaymentIntent. */
export function RzrBookingForm({ tour }: { tour: Tour }) {
  const router = useRouter();
  const rutas = tour.rutas ?? [];
  const flota = tour.flota ?? [];

  const [tourDate,       setTourDate]       = useState("");
  const [rutaNombre,     setRutaNombre]     = useState(rutas[0]?.nombre ?? "");
  const [vehiculoNombre, setVehiculoNombre] = useState(flota[0]?.nombre ?? "");
  const [unidades,       setUnidades]       = useState(1);
  // Cuánto se paga hoy: 30 % (aparta tu lugar) o 100 %.
  const [pct,            setPct]            = useState(30);

  const rutaIdx  = rutas.findIndex((r) => r.nombre === rutaNombre);
  const ruta     = rutas[rutaIdx];
  const vehiculo = flota.find((v) => v.nombre === vehiculoNombre);
  const precioUnidad = vehiculo && rutaIdx >= 0 ? (vehiculo.precios[rutaIdx] ?? 0) : 0;
  const total = precioUnidad * unidades;
  const chargeAmount = pct === 100 ? total : Math.round((total * pct) / 100);
  const saldo = total - chargeAmount;

  const canContinue = !!tourDate && rutaIdx >= 0 && !!vehiculo && total > 0;

  function handleContinue() {
    if (!canContinue || !ruta || !vehiculo) return;
    // Recalcula con la misma función del servidor (autoridad de precio compartida).
    const veh = computeVehiculoCharge({ tourSlug: tour.slug, ruta: ruta.nombre, vehiculo: vehiculo.nombre, unidades, pct });
    if (!veh) return;
    const name = vehiculoBookingName(tour, ruta.nombre, vehiculo.nombre, unidades);
    saveTourBookingState({
      tourId:        tour.id,
      tourSlug:      tour.slug,
      tourName:      name,
      tourImage:     tour.imagen_hero,
      tourDuration:  ruta.duracion_hrs,
      priceAdult:    precioUnidad,
      tourDate,
      adults:        unidades,
      children:      0,
      childrenMid:   0,
      childrenSmall: 0,
      promoCode:     "",
      promoDiscount: 0,
      subtotal:      veh.total,
      total:         veh.total,
      chargeAmount:  veh.charge,
      pct:           veh.pct,
      saldo:         veh.saldo,
      paymentMode:   veh.pct === 100 ? "full" : "deposit",
      sessionId:     crypto.randomUUID(),
      ruta:          ruta.nombre,
      vehiculo:      vehiculo.nombre,
      unidades,
    });
    router.push(`/reservar-tour/${tour.slug}/checkout`);
  }

  function handleAgregarYSeguir() {
    if (!canContinue || !ruta || !vehiculo) return;
    const veh = computeVehiculoCharge({ tourSlug: tour.slug, ruta: ruta.nombre, vehiculo: vehiculo.nombre, unidades, pct: 100 });
    if (!veh) return;
    // Los campos comunes salen de `itemDesdeTour` (una sola definición de cómo
    // nace un renglón); aquí solo se encima lo que el cliente ya configuró.
    agregarAlCarrito(itemDesdeTour(tour, {
      tourName: vehiculoBookingName(tour, ruta.nombre, vehiculo.nombre, unidades),
      tourDate,
      adults:   unidades,
      ruta:     ruta.nombre,
      vehiculo: vehiculo.nombre,
      unidades,
      total:    veh.total,
    }));
    router.push("/reservar#catalogo");
  }

  return (
    <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 items-start">

      {/* ── FORMULARIO ── */}
      <div className="space-y-6">

        {/* Fecha */}
        <section className="bg-white border border-negro/8 p-6">
          <h2 className="font-cormorant text-verde-profundo text-xl mb-5">Selecciona la fecha</h2>
          <TourCalendar
            value={tourDate}
            onChange={(ymd) => { setTourDate(ymd); if (ymd) trackDateSelected(tour.nombre, ymd); }}
          />
        </section>

        {/* Ruta */}
        <section className="bg-white border border-negro/8 p-6">
          <h2 className="font-cormorant text-verde-profundo text-xl mb-1">Elige tu ruta</h2>
          <p className="font-dm text-xs text-negro/45 mb-5">El precio depende de la ruta y del vehículo. Todas incluyen gasolina, equipo y guía.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {rutas.map((r) => {
              const active = r.nombre === rutaNombre;
              const veh = flota.find((v) => v.nombre === vehiculoNombre);
              const idx = rutas.findIndex((x) => x.nombre === r.nombre);
              const desde = veh ? veh.precios[idx] : r.desde;
              return (
                <button key={r.nombre} type="button" onClick={() => setRutaNombre(r.nombre)}
                  className={`text-left border p-4 transition-colors ${active ? "border-verde-selva bg-verde-selva/5" : "border-negro/15 hover:border-negro/30"}`}>
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <span className="font-cormorant text-verde-profundo text-base leading-tight">{r.nombre}</span>
                    <span className="text-[10px] text-negro/40 font-dm flex-shrink-0 flex items-center gap-1"><Clock className="w-3 h-3" />{r.duracion_hrs} h</span>
                  </div>
                  {r.destinos && r.destinos.length > 0 && (
                    <p className="text-[10px] text-negro/45 font-dm leading-snug mb-1.5">{r.destinos.slice(0, 3).join(" · ")}…</p>
                  )}
                  <p className="text-[11px] font-dm text-dorado">Desde {formatMXN(desde)} MXN por vehículo</p>
                </button>
              );
            })}
          </div>
          {ruta?.incluye && ruta.incluye.length > 0 && (
            <ul className="mt-3 space-y-1">
              {ruta.incluye.map((it) => (
                <li key={it} className="flex items-start gap-1.5 text-xs font-dm text-verde-selva">
                  <span className="flex-shrink-0">✓</span>{it}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Vehículo */}
        <section className="bg-white border border-negro/8 p-6">
          <h2 className="font-cormorant text-verde-profundo text-xl mb-5">Elige tu vehículo</h2>
          <div className="space-y-2.5">
            {flota.map((v) => {
              const active = v.nombre === vehiculoNombre;
              const precio = rutaIdx >= 0 ? v.precios[rutaIdx] : 0;
              return (
                <button key={v.nombre} type="button" onClick={() => setVehiculoNombre(v.nombre)}
                  className={`w-full flex items-center gap-3 border px-4 py-3 text-left transition-colors ${active ? "border-verde-selva bg-verde-selva/5" : "border-negro/15 hover:border-negro/30"}`}>
                  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${active ? "border-verde-selva" : "border-negro/25"}`}>
                    {active && <div className="w-2 h-2 rounded-full bg-verde-selva" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-dm text-sm text-negro/85 font-medium leading-none">{v.nombre}</p>
                    <p className="text-[10px] text-negro/45 font-dm mt-0.5">{v.capacidad}</p>
                  </div>
                  <span className="font-cormorant text-dorado text-base flex-shrink-0">{formatMXN(precio)}</span>
                </button>
              );
            })}
          </div>

          {/* Unidades */}
          <div className="flex items-center justify-between border-t border-negro/6 pt-5 mt-5">
            <div>
              <p className="font-dm text-sm text-negro/80">¿Cuántos vehículos?</p>
              <p className="font-dm text-xs text-negro/40">Si son un grupo grande, aparta varias unidades</p>
            </div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setUnidades(Math.max(1, unidades - 1))}
                className="w-9 h-9 border border-negro/20 flex items-center justify-center text-negro/60 hover:border-verde-selva hover:text-verde-selva transition-colors font-dm text-lg leading-none"
                aria-label="Reducir vehículos">−</button>
              <span className="w-8 text-center font-dm text-negro">{unidades}</span>
              <button type="button" onClick={() => setUnidades(Math.min(10, unidades + 1))}
                className="w-9 h-9 border border-negro/20 flex items-center justify-center text-negro/60 hover:border-verde-selva hover:text-verde-selva transition-colors font-dm text-lg leading-none"
                aria-label="Aumentar vehículos">+</button>
            </div>
          </div>
        </section>
      </div>

      {/* ── SIDEBAR ── */}
      <aside className="lg:sticky lg:top-24 space-y-4">
        <div className="bg-white border border-negro/8 overflow-hidden">
          {tour.imagen_hero && (
            <div className="aspect-video overflow-hidden">
              <img src={tour.imagen_hero} alt={tour.nombre} loading="lazy" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="p-5">
            <p className="text-[9px] tracking-[2px] uppercase text-verde-selva/70 font-dm mb-2">{tour.tipo}</p>
            <h3 className="font-cormorant text-verde-profundo text-lg leading-snug mb-2">{tour.nombre}</h3>
            <div className="mb-3"><ViewersCounter /></div>
            <div className="flex flex-wrap gap-3 text-xs font-dm text-negro/50">
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{ruta?.duracion_hrs ?? tour.duracion_hrs}h</span>
              <span className="flex items-center gap-1"><Star className="w-3 h-3 text-dorado" />4.9</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-negro/8 p-5">
          <h3 className="font-cormorant text-verde-profundo text-lg mb-4">Resumen del pago</h3>
          <div className="space-y-3 text-sm font-dm">
            <div className="flex justify-between text-negro/70"><span>Ruta</span><span className="text-right">{rutaNombre.replace(/^Ruta\s/, "")}</span></div>
            <div className="flex justify-between text-negro/70"><span>Vehículo</span><span className="text-right">{vehiculoNombre}</span></div>
            <div className="flex justify-between text-negro/70">
              <span>{unidades} vehículo{unidades !== 1 ? "s" : ""} × {formatMXN(precioUnidad)}</span>
              <span>{formatMXN(total)}</span>
            </div>
            <div className="flex justify-between font-medium text-negro border-t border-negro/10 pt-3 text-base">
              <span>Total</span>
              <span key={total} className="font-cormorant text-xl text-dorado animate-price-bump">{formatMXN(total)} MXN</span>
            </div>
          </div>

          {/* Cuánto pagar hoy — el anticipo baja la barrera de entrada */}
          <div className="mt-5 border-t border-negro/6 pt-4">
            <p className="text-[9px] tracking-[2px] uppercase text-negro/40 font-dm mb-3">Cuánto pagas hoy</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { valor: 30,  titulo: "Aparta tu lugar", sub: "30 % hoy" },
                { valor: 100, titulo: "Pago completo",   sub: "Liquida todo" },
              ].map((op) => (
                <button
                  key={op.valor}
                  type="button"
                  onClick={() => setPct(op.valor)}
                  aria-pressed={pct === op.valor}
                  className={`text-left px-3 py-2.5 border transition-colors ${
                    pct === op.valor
                      ? "border-verde-selva bg-verde-selva/8"
                      : "border-negro/15 hover:border-negro/30"
                  }`}
                >
                  <span className="block font-dm text-xs font-medium text-negro">{op.titulo}</span>
                  <span className="block font-dm text-[11px] text-negro/50 mt-0.5">{op.sub}</span>
                </button>
              ))}
            </div>
            <div className="mt-3 flex justify-between items-baseline">
              <span className="font-dm text-sm text-negro/70">Pagas ahora</span>
              <span key={chargeAmount} className="font-cormorant text-xl text-verde-profundo animate-price-bump">
                {formatMXN(chargeAmount)} MXN
              </span>
            </div>
            {saldo > 0 && (
              <p className="mt-1.5 font-dm text-xs text-negro/50">
                Saldo de <strong className="text-negro/70">{formatMXN(saldo)} MXN</strong> el día del tour,
                en efectivo o con tarjeta.
              </p>
            )}
          </div>

          <div className="mt-5 border-t border-negro/6 pt-4">
            <p className="text-[9px] tracking-[2px] uppercase text-negro/40 font-dm mb-3">Incluido</p>
            <ul className="space-y-1.5">
              {tour.incluye.slice(0, 5).map((item) => (
                <li key={item} className="flex items-start gap-2 text-xs font-dm text-negro/60">
                  <span className="text-verde-selva flex-shrink-0 mt-0.5">✓</span>{item}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4 flex items-start gap-2 text-xs font-dm text-negro/50">
            <Shield className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-verde-selva" />
            <span>Pago 100% seguro · Stripe · TLS cifrado</span>
          </div>
        </div>

        <button
          onClick={handleContinue}
          disabled={!canContinue}
          className="w-full bg-verde-selva text-crema py-4 text-sm tracking-[2px] uppercase font-dm hover:bg-verde-vivo transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {canContinue ? (<><Lock className="w-3.5 h-3.5" />{`Pagar ${formatMXN(chargeAmount)} MXN →`}</>) : "Selecciona una fecha para continuar"}
        </button>
        {/* El carrito estaba escondido: solo aparecía DESPUÉS de elegir fecha, así
            que nadie descubría que se podían apartar varios días. Ahora se ve
            siempre y explica qué le falta. */}
        <button
          onClick={handleAgregarYSeguir}
          disabled={!canContinue}
          className="w-full border border-verde-selva/40 text-verde-selva hover:bg-verde-selva/8 py-3 text-[11px] tracking-[2px] uppercase font-dm transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
        >
          ＋ Agregar al carrito y elegir otro día
        </button>
        {!tourDate && <p className="text-center text-xs text-negro/40 font-dm">Elige la fecha del recorrido para continuar</p>}
      </aside>
    </div>
  );
}
