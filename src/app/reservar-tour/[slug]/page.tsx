"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { TOURS_DB } from "@/lib/tours";
import {
  saveTourBookingState, formatMXN, calcTourTotal,
  validatePromoCode, formatTourDate,
} from "@/lib/tourBooking";
import { TourCalendar } from "@/components/booking/TourCalendar";
import { ViewersCounter } from "@/components/booking/ViewersCounter";
import { ChevronLeft, Clock, Users, Shield, Star, Lock } from "lucide-react";
import { trackDateSelected, trackPromoApplied } from "@/lib/analytics";

export default function ReservarTourPage() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const tour   = TOURS_DB.find((t) => t.slug === params.slug);

  const [tourDate,       setTourDate]       = useState("");
  const [adults,         setAdults]         = useState(2);
  const [childrenMid,    setChildrenMid]    = useState(0); // 6–10 años → 70%
  const [childrenSmall,  setChildrenSmall]  = useState(0); // <6 años   → 50%
  const [promoInput,     setPromoInput]     = useState("");
  const [promoCode,      setPromoCode]      = useState("");
  const [promoDiscount,  setPromoDiscount]  = useState(0);
  const [promoMsg,       setPromoMsg]       = useState("");
  const [promoError,     setPromoError]     = useState("");
  const [promoShake,     setPromoShake]     = useState(false);
  const [paymentMode,    setPaymentMode]    = useState<"deposit" | "full">("deposit");

  const children = childrenMid + childrenSmall;
  const notFound = !tour;
  const { subtotal, discount, total, childPriceMid, childPriceSmall } = calcTourTotal(
    tour?.precio ?? 0, adults, childrenMid, childrenSmall, promoDiscount
  );
  const deposit = Math.round(total * 0.3);
  const chargeAmount = paymentMode === "deposit" ? deposit : total;

  if (notFound || !tour) {
    return (
      <main className="min-h-screen bg-crema flex items-center justify-center px-6 pt-24">
        <div className="text-center">
          <p className="font-cormorant text-verde-profundo text-2xl mb-4">Tour no encontrado</p>
          <Link href="/tours" className="text-verde-selva underline font-dm text-sm">Ver todos los tours</Link>
        </div>
      </main>
    );
  }

  function applyPromo() {
    setPromoError(""); setPromoMsg("");
    const result = validatePromoCode(promoInput);
    if (!result.valid) {
      setPromoError(result.msg);
      setPromoShake(true);
      setTimeout(() => setPromoShake(false), 500);
      return;
    }
    setPromoCode(promoInput.trim().toUpperCase());
    setPromoDiscount(result.discount);
    setPromoMsg(result.msg);
    trackPromoApplied(promoInput.trim().toUpperCase(), result.discount);
  }

  function removePromo() {
    setPromoCode(""); setPromoDiscount(0);
    setPromoMsg(""); setPromoError(""); setPromoInput("");
  }

  function handleContinue() {
    if (!tourDate || !tour) return;
    saveTourBookingState({
      tourId:        tour.id,
      tourSlug:      tour.slug,
      tourName:      tour.nombre,
      tourImage:     tour.imagen_hero,
      tourDuration:  tour.duracion_hrs,
      priceAdult:    tour.precio,
      tourDate,
      adults,
      children,
      childrenMid,
      childrenSmall,
      promoCode,
      promoDiscount,
      subtotal,
      total,
      chargeAmount,
      paymentMode,
      sessionId: crypto.randomUUID(),
    });
    router.push(`/reservar-tour/${tour.slug}/checkout`);
  }

  const canContinue = !!tourDate && adults >= 1;

  return (
    <main className="min-h-screen bg-crema pt-24 pb-20">

      {/* Breadcrumb */}
      <div className="max-w-5xl mx-auto px-6 mb-8">
        <Link href={`/tours/${tour.slug}`} className="inline-flex items-center gap-1.5 text-negro/50 hover:text-verde-selva text-xs font-dm tracking-[1px] uppercase transition-colors">
          <ChevronLeft className="w-3 h-3" />
          Volver al tour
        </Link>
      </div>

      {/* Stepper */}
      <div className="max-w-5xl mx-auto px-6 mb-10">
        <div className="flex items-center gap-3">
          {["Seleccionar", "Pagar", "Confirmado"].map((s, i) => (
            <div key={s} className="flex items-center gap-3">
              <div className={`flex items-center gap-2 ${i === 0 ? "text-verde-selva" : "text-negro/30"}`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-dm font-medium ${i === 0 ? "bg-verde-selva text-white" : "border border-negro/20 text-negro/30"}`}>
                  {i + 1}
                </span>
                <span className="text-[11px] tracking-[1px] uppercase font-dm hidden sm:block">{s}</span>
              </div>
              {i < 2 && <div className="h-px w-8 bg-negro/15" />}
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 items-start">

        {/* ── FORMULARIO ── */}
        <div className="space-y-6">

          {/* Calendario */}
          <section className="bg-white border border-negro/8 p-6">
            <h2 className="font-cormorant text-verde-profundo text-xl mb-5">Selecciona la fecha</h2>
            <TourCalendar
              value={tourDate}
              onChange={(ymd) => {
                setTourDate(ymd);
                if (ymd) trackDateSelected(tour.nombre, ymd);
              }}
            />
          </section>

          {/* Participantes */}
          <section className="bg-white border border-negro/8 p-6">
            <h2 className="font-cormorant text-verde-profundo text-xl mb-5">Participantes</h2>
            <div className="space-y-5">
              {/* Adultos */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-dm text-sm text-negro/80">Adultos</p>
                  <p className="font-dm text-xs text-negro/40">{formatMXN(tour.precio)} por persona</p>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => setAdults(Math.max(1, adults - 1))}
                    className="w-9 h-9 border border-negro/20 flex items-center justify-center text-negro/60 hover:border-verde-selva hover:text-verde-selva transition-colors font-dm text-lg leading-none"
                    aria-label="Reducir adultos">−</button>
                  <span className="w-8 text-center font-dm text-negro">{adults}</span>
                  <button onClick={() => setAdults(Math.min(tour.groupMax, adults + 1))}
                    className="w-9 h-9 border border-negro/20 flex items-center justify-center text-negro/60 hover:border-verde-selva hover:text-verde-selva transition-colors font-dm text-lg leading-none"
                    aria-label="Aumentar adultos">+</button>
                </div>
              </div>
              {/* Niños */}
              {/* Niños 6–10 años */}
              <div className="flex items-center justify-between border-t border-negro/6 pt-5">
                <div>
                  <p className="font-dm text-sm text-negro/80">Niños 6–10 años</p>
                  <p className="font-dm text-xs text-negro/40">{formatMXN(childPriceMid)} por persona · 70 % del precio</p>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => setChildrenMid(Math.max(0, childrenMid - 1))}
                    className="w-9 h-9 border border-negro/20 flex items-center justify-center text-negro/60 hover:border-verde-selva hover:text-verde-selva transition-colors font-dm text-lg leading-none"
                    aria-label="Reducir niños 6–10">−</button>
                  <span className="w-8 text-center font-dm text-negro">{childrenMid}</span>
                  <button onClick={() => setChildrenMid(Math.min(tour.groupMax - adults - childrenSmall, childrenMid + 1))}
                    className="w-9 h-9 border border-negro/20 flex items-center justify-center text-negro/60 hover:border-verde-selva hover:text-verde-selva transition-colors font-dm text-lg leading-none"
                    aria-label="Aumentar niños 6–10">+</button>
                </div>
              </div>

              {/* Niños menores de 6 */}
              <div className="flex items-center justify-between border-t border-negro/6 pt-5">
                <div>
                  <p className="font-dm text-sm text-negro/80">Niños menores de 6</p>
                  <p className="font-dm text-xs text-negro/40">{formatMXN(childPriceSmall)} por persona · 50 % del precio</p>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => setChildrenSmall(Math.max(0, childrenSmall - 1))}
                    className="w-9 h-9 border border-negro/20 flex items-center justify-center text-negro/60 hover:border-verde-selva hover:text-verde-selva transition-colors font-dm text-lg leading-none"
                    aria-label="Reducir niños menores de 6">−</button>
                  <span className="w-8 text-center font-dm text-negro">{childrenSmall}</span>
                  <button onClick={() => setChildrenSmall(Math.min(tour.groupMax - adults - childrenMid, childrenSmall + 1))}
                    className="w-9 h-9 border border-negro/20 flex items-center justify-center text-negro/60 hover:border-verde-selva hover:text-verde-selva transition-colors font-dm text-lg leading-none"
                    aria-label="Aumentar niños menores de 6">+</button>
                </div>
              </div>
              <p className="text-xs text-negro/40 font-dm">Bebés menores de 3 años: entrada gratuita (no cuentan como participantes)</p>
              <p className="text-xs text-negro/40 font-dm">Máximo {tour.groupMax} participantes por tour</p>
            </div>
          </section>

          {/* Código de descuento */}
          <section className="bg-white border border-negro/8 p-6">
            <h2 className="font-cormorant text-verde-profundo text-xl mb-5">Código de descuento</h2>
            {promoCode ? (
              <div className="flex items-center justify-between bg-verde-selva/10 border border-verde-selva/30 px-4 py-3 animate-fade-in">
                <p className="font-dm text-sm text-verde-selva">{promoMsg}</p>
                <button onClick={removePromo} className="text-xs text-negro/40 hover:text-terracota font-dm transition-colors">Quitar</button>
              </div>
            ) : (
              <div className={`flex gap-3 ${promoShake ? "animate-shake" : ""}`}>
                <input
                  type="text"
                  placeholder="Tu código aquí"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && applyPromo()}
                  className="flex-1 border border-negro/20 bg-crema px-4 py-2.5 font-dm text-sm uppercase tracking-[1px] focus:outline-none focus:border-verde-selva transition-colors"
                />
                <button onClick={applyPromo}
                  className="px-5 py-2.5 bg-verde-profundo text-crema text-xs font-dm tracking-[1.5px] uppercase hover:bg-verde-selva transition-colors">
                  Aplicar
                </button>
              </div>
            )}
            {promoError && <p className="mt-2 text-terracota text-xs font-dm" role="alert">{promoError}</p>}
          </section>

          {/* ── MEJORA 11 — Modalidad de pago ── */}
          <section className="bg-white border border-negro/8 p-6">
            <h2 className="font-cormorant text-verde-profundo text-xl mb-5">Modalidad de pago</h2>
            <div className="space-y-3">

              {/* Opción A: Depósito */}
              <label className={`flex items-start gap-4 border p-4 cursor-pointer transition-all duration-200 ${
                paymentMode === "deposit"
                  ? "border-verde-selva bg-verde-selva/5 -translate-y-0.5 shadow-sm"
                  : "border-negro/15 hover:border-negro/30"
              }`}>
                <input
                  type="radio"
                  name="paymentMode"
                  value="deposit"
                  checked={paymentMode === "deposit"}
                  onChange={() => setPaymentMode("deposit")}
                  className="sr-only"
                />
                <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors ${
                  paymentMode === "deposit" ? "border-verde-selva" : "border-negro/25"
                }`}>
                  {paymentMode === "deposit" && (
                    <div className="w-2.5 h-2.5 rounded-full bg-verde-selva" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-dm text-sm font-medium text-negro/85">
                      Reserva con {formatMXN(deposit)} MXN
                    </span>
                    <span className="bg-verde-selva/15 text-verde-selva text-[9px] font-dm font-bold tracking-[1px] uppercase px-2 py-0.5">
                      RECOMENDADO
                    </span>
                  </div>
                  <p className="text-xs text-negro/50 font-dm mt-1">
                    30% ahora · Paga el resto al llegar · Sin riesgo · Cancelación gratuita 48h
                  </p>
                </div>
              </label>

              {/* Opción B: Total */}
              <label className={`flex items-start gap-4 border p-4 cursor-pointer transition-all duration-200 ${
                paymentMode === "full"
                  ? "border-verde-selva bg-verde-selva/5 -translate-y-0.5 shadow-sm"
                  : "border-negro/15 hover:border-negro/30"
              }`}>
                <input
                  type="radio"
                  name="paymentMode"
                  value="full"
                  checked={paymentMode === "full"}
                  onChange={() => setPaymentMode("full")}
                  className="sr-only"
                />
                <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors ${
                  paymentMode === "full" ? "border-verde-selva" : "border-negro/25"
                }`}>
                  {paymentMode === "full" && (
                    <div className="w-2.5 h-2.5 rounded-full bg-verde-selva" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-dm text-sm font-medium text-negro/85">
                    Pago completo — {formatMXN(total)} MXN
                  </p>
                  <p className="text-xs text-negro/50 font-dm mt-1">
                    Sin pendientes · Misma cancelación gratuita con 48h
                  </p>
                </div>
              </label>
            </div>
            <p className="mt-3 text-[10px] text-negro/40 font-dm">
              ✓ El pago restante se cobra el día del tour o puedes pagarlo antes desde tu confirmación.
            </p>
          </section>

        </div>

        {/* ── SIDEBAR ── */}
        <aside className="lg:sticky lg:top-24 space-y-4">

          {/* Tour card */}
          <div className="bg-white border border-negro/8 overflow-hidden">
            {tour.imagen_hero && (
              <div className="aspect-video overflow-hidden">
                <img src={tour.imagen_hero} alt={tour.nombre} loading="lazy" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="p-5">
              <p className="text-[9px] tracking-[2px] uppercase text-verde-selva/70 font-dm mb-2">{tour.tipo}</p>
              <h3 className="font-cormorant text-verde-profundo text-lg leading-snug mb-2">{tour.nombre}</h3>

              {/* Mejora 7B — Viewers counter */}
              <div className="mb-3">
                <ViewersCounter />
              </div>

              <div className="flex flex-wrap gap-3 text-xs font-dm text-negro/50">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{tour.duracion_hrs}h</span>
                <span className="flex items-center gap-1"><Users className="w-3 h-3" />Máx. {tour.groupMax}</span>
                <span className="flex items-center gap-1"><Star className="w-3 h-3 text-dorado" />4.9</span>
              </div>
            </div>
          </div>

          {/* Desglose de precio */}
          <div className="bg-white border border-negro/8 p-5">
            <h3 className="font-cormorant text-verde-profundo text-lg mb-4">Resumen del pago</h3>
            <div className="space-y-3 text-sm font-dm">
              <div className="flex justify-between text-negro/70">
                <span>{adults} adulto{adults !== 1 ? "s" : ""} × {formatMXN(tour.precio)}</span>
                <span>{formatMXN(tour.precio * adults)}</span>
              </div>
              {childrenMid > 0 && (
                <div className="flex justify-between text-negro/70">
                  <span>{childrenMid} niño{childrenMid !== 1 ? "s" : ""} 6–10 años × {formatMXN(childPriceMid)}</span>
                  <span>{formatMXN(childPriceMid * childrenMid)}</span>
                </div>
              )}
              {childrenSmall > 0 && (
                <div className="flex justify-between text-negro/70">
                  <span>{childrenSmall} niño{childrenSmall !== 1 ? "s" : ""} &lt;6 años × {formatMXN(childPriceSmall)}</span>
                  <span>{formatMXN(childPriceSmall * childrenSmall)}</span>
                </div>
              )}
              {discount > 0 && (
                <div className="flex justify-between text-verde-selva border-t border-negro/6 pt-3">
                  <span>Descuento ({promoDiscount}%)</span>
                  <span>−{formatMXN(discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-medium text-negro border-t border-negro/10 pt-3 text-base">
                <span>Total completo</span>
                <span key={total} className="font-cormorant text-xl text-dorado animate-price-bump">{formatMXN(total)} MXN</span>
              </div>
              {paymentMode === "deposit" && (
                <div className="flex justify-between text-verde-selva font-medium bg-verde-selva/8 border border-verde-selva/20 px-3 py-2">
                  <span className="text-xs">Pagas ahora (30%)</span>
                  <span className="font-cormorant text-base">{formatMXN(deposit)} MXN</span>
                </div>
              )}
            </div>

            {/* Incluye */}
            <div className="mt-5 border-t border-negro/6 pt-4">
              <p className="text-[9px] tracking-[2px] uppercase text-negro/40 font-dm mb-3">Incluido</p>
              <ul className="space-y-1.5">
                {tour.incluye.slice(0, 5).map((item) => (
                  <li key={item} className="flex items-start gap-2 text-xs font-dm text-negro/60">
                    <span className="text-verde-selva flex-shrink-0 mt-0.5">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Garantías */}
            <div className="mt-4 flex items-start gap-2 text-xs font-dm text-negro/50">
              <Shield className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-verde-selva" />
              <span>Pago 100% seguro · Stripe · TLS cifrado</span>
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={handleContinue}
            disabled={!canContinue}
            className="w-full bg-verde-selva text-crema py-4 text-sm tracking-[2px] uppercase font-dm hover:bg-verde-vivo transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {canContinue ? (
              <>
                <Lock className="w-3.5 h-3.5" />
                {paymentMode === "deposit"
                  ? `Reservar con ${formatMXN(deposit)} MXN →`
                  : `Pagar ${formatMXN(total)} MXN completo →`}
              </>
            ) : (
              "Selecciona una fecha para continuar"
            )}
          </button>

          {!canContinue && !tourDate && (
            <p className="text-center text-xs text-negro/40 font-dm">Elige la fecha del tour para continuar</p>
          )}
        </aside>
      </div>
    </main>
  );
}
