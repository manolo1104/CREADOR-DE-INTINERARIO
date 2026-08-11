"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { TOURS_DB, tourDurTexto, INCLUYE_SIEMPRE } from "@/lib/tours";
import {
  saveTourBookingState, formatMXN, calcTourTotal,
  validatePromoCode, formatTourDate,
} from "@/lib/tourBooking";
import { TourCalendar } from "@/components/booking/TourCalendar";
import { ViewersCounter } from "@/components/booking/ViewersCounter";
import { RzrBookingForm } from "@/components/booking/RzrBookingForm";
import { ChevronLeft, Clock, Users, Shield, Star, Lock } from "lucide-react";
import { trackDateSelected, trackPromoApplied } from "@/lib/analytics";
import { trackTourEvent } from "@/lib/tourTracker";

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
  const [showPromo,      setShowPromo]      = useState(false);
  // Cuánto se paga hoy: 30 % (aparta tu lugar) o 100 %.
  const [pct,            setPct]            = useState(30);
  // Captura de correo / carrito abandonado
  const [cartEmail,   setCartEmail]   = useState("");
  const [cartSaved,   setCartSaved]   = useState(false);
  const [savingCart,  setSavingCart]  = useState(false);
  const [cartError,   setCartError]   = useState("");

  // El embudo saltaba de TOUR_PAGE_VIEW (en /tours/[slug]) a DATE_SELECTED
  // (aquí) sin nada en medio: era imposible saber si la gente no llegaba a esta
  // página o llegaba y no elegía fecha. Sin este evento, los dos casos —que
  // piden arreglos opuestos— se veían idénticos.
  const vistaEnviada = useRef(false);
  useEffect(() => {
    if (vistaEnviada.current || !tour) return;
    vistaEnviada.current = true;
    trackTourEvent("BOOKING_PAGE_VIEW", { tour: tour.slug, tour_name: tour.nombre, amount: tour.precio });
    // Una sola vez por montaje; `tour` sale del slug de la ruta y no cambia.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Restaurar desde el link del correo de recuperación (?recuperar=<token>).
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("recuperar");
    if (!token) return;
    fetch(`/api/tours/carrito/${token}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((c) => {
        if (!c || c.error) return;
        if (c.tourDate) setTourDate(c.tourDate);
        if (typeof c.adults === "number") setAdults(c.adults);
        if (typeof c.childrenMid === "number") setChildrenMid(c.childrenMid);
        if (typeof c.childrenSmall === "number") setChildrenSmall(c.childrenSmall);
        if (c.promoCode) { setPromoCode(c.promoCode); setPromoDiscount(c.promoDiscount || 0); setPromoMsg("Código aplicado"); }
        if (c.email) setCartEmail(c.email);
      })
      .catch(() => {});
  }, []);

  const children = childrenMid + childrenSmall;
  const notFound = !tour;
  const { subtotal, discount, total, childPriceMid, childPriceSmall } = calcTourTotal(
    tour?.precio ?? 0, adults, childrenMid, childrenSmall, promoDiscount
  );
  // Anticipo: se cobra el 30 % ahora y el saldo el día del tour. El servidor
  // recalcula el monto en /api/tours/create-payment-intent — esto es solo la UI.
  const chargeAmount = pct === 100 ? total : Math.round((total * pct) / 100);
  const saldo        = total - chargeAmount;

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

  // Tours cobrados POR VEHÍCULO (ej. RZR): flujo de reserva por ruta + vehículo + unidades.
  if (tour.precioUnidad === "vehiculo") {
    return (
      <main className="min-h-screen bg-crema pt-24 pb-20">
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
        <RzrBookingForm tour={tour} />
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
      // El evento existía mapeado pero nadie lo emitía: los cupones que la
      // gente intenta y no existen dicen mucho de dónde viene el tráfico.
      trackTourEvent("PROMO_FAILED", { code: promoInput.trim().toUpperCase(), tourSlug: tour?.slug });
      return;
    }
    setPromoCode(promoInput.trim().toUpperCase());
    setPromoDiscount(result.discount);
    setPromoMsg(result.msg);
    trackPromoApplied(promoInput.trim().toUpperCase(), result.discount);
    trackTourEvent("PROMO_APPLIED", { code: promoInput.trim().toUpperCase(), discountPct: result.discount });
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
      pct,
      saldo,
      paymentMode: pct === 100 ? "full" : "deposit",
      sessionId: crypto.randomUUID(),
    });
    router.push(`/reservar-tour/${tour.slug}/checkout`);
  }

  // Guarda la cotización (carrito) y la envía por correo, para poder retomarla
  // después. Captura el lead aunque el cliente no pague ahora.
  async function saveCart() {
    if (!tour) return;
    const e = cartEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      setCartError("Escribe un correo válido.");
      return;
    }
    setCartError("");
    setSavingCart(true);
    try {
      const res = await fetch("/api/tours/guardar-carrito", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tourSlug: tour.slug, tourId: tour.id, tourDate,
          adults, childrenMid, childrenSmall,
          promoCode: promoCode || undefined,
          email: e,
        }),
      });
      if (res.ok) {
        setCartSaved(true);
      } else {
        const d = await res.json().catch(() => ({}));
        setCartError(d.error || "No se pudo guardar. Intenta de nuevo.");
      }
    } catch {
      setCartError("Error de conexión. Intenta de nuevo.");
    } finally {
      setSavingCart(false);
    }
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
                if (ymd) trackTourEvent("DATE_SELECTED", { fecha: ymd, tour: tour.slug, tour_name: tour.nombre });
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
                  <button onClick={() => setAdults(Math.min(tour.groupMax - children, adults + 1))}
                    className="w-9 h-9 border border-negro/20 flex items-center justify-center text-negro/60 hover:border-verde-selva hover:text-verde-selva transition-colors font-dm text-lg leading-none"
                    aria-label="Aumentar adultos">+</button>
                </div>
              </div>
              {/* Niños — ocultos en actividades solo para adultos (ej. buceo, edad mínima 10) */}
              {!tour.soloAdultos && (
                <>
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
                </>
              )}
              {tour.soloAdultos && (
                <p className="text-xs text-negro/40 font-dm border-t border-negro/6 pt-5">Actividad para mayores de 10 años en buena salud. La entrada al parque se paga aparte en sitio.</p>
              )}
              <p className="text-xs text-negro/40 font-dm">Máximo {tour.groupMax} participantes por tour</p>
            </div>
          </section>

          {/* Código de descuento — colapsado tras un enlace para aligerar */}
          {!showPromo && !promoCode ? (
            <button type="button" onClick={() => setShowPromo(true)}
              className="text-xs font-dm text-verde-selva hover:text-verde-vivo transition-colors underline underline-offset-2">
              ¿Tienes un código de descuento?
            </button>
          ) : (
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
          )}

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
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{tourDurTexto(tour)}</span>
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

            {/* Incluye */}
            <div className="mt-5 border-t border-negro/6 pt-4">
              <p className="text-[9px] tracking-[2px] uppercase text-negro/40 font-dm mb-3">Incluido</p>
              {/*
                Antes esto era `.slice(0, 5)`: el paso 1 enseñaba cinco puntos
                mientras la ficha y el paso 2 enseñaban nueve. Nos estábamos
                subvendiendo justo donde el cliente compara precio contra
                valor. Se listan todos, y el seguro y las fotos —que van en
                TODOS los tours pero no viven en `tour.incluye`— se suman aquí
                para que el paso 1 diga lo mismo que el resto del sitio.
              */}
              <ul className="space-y-1.5">
                {[...tour.incluye, ...INCLUYE_SIEMPRE].map((item) => (
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
                {`Pagar ${formatMXN(chargeAmount)} MXN →`}
              </>
            ) : (
              "Selecciona una fecha para continuar"
            )}
          </button>

          {!canContinue && !tourDate && (
            <p className="text-center text-xs text-negro/40 font-dm">Elige la fecha del tour para continuar</p>
          )}

          {/* Guardar cotización — captura el correo para retomar la reserva después */}
          {tourDate && (
            cartSaved ? (
              <div className="bg-verde-selva/10 border border-verde-selva/25 p-4 text-center">
                <p className="font-dm text-sm text-verde-profundo">
                  ✓ Te enviamos tu cotización a <strong>{cartEmail}</strong>
                </p>
                <p className="font-dm text-xs text-negro/50 mt-1">Retómala cuando quieras desde el enlace del correo.</p>
              </div>
            ) : (
              <div className="bg-white border border-negro/8 p-4">
                <p className="font-dm text-sm text-negro/70 mb-1 font-medium">¿Aún no decides?</p>
                <p className="font-dm text-xs text-negro/45 mb-3">Te enviamos tu cotización y la retomas cuando quieras — sin compromiso.</p>
                <div className="flex gap-2">
                  <input
                    type="email" inputMode="email" autoComplete="email"
                    value={cartEmail}
                    onChange={(e) => { setCartEmail(e.target.value); if (cartError) setCartError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && saveCart()}
                    placeholder="tucorreo@ejemplo.com"
                    aria-label="Tu correo para guardar la cotización"
                    className="flex-1 min-w-0 border border-negro/20 bg-crema px-3 py-2.5 font-dm text-sm text-negro focus:outline-none focus:border-verde-selva transition-colors"
                  />
                  <button
                    type="button" onClick={saveCart} disabled={savingCart}
                    className="px-4 py-2.5 bg-verde-profundo text-crema text-xs font-dm tracking-[1px] uppercase hover:bg-verde-selva transition-colors disabled:opacity-50 flex-shrink-0"
                  >
                    {savingCart ? "…" : "Enviar"}
                  </button>
                </div>
                {cartError && <p className="mt-2 text-terracota text-xs font-dm" role="alert">{cartError}</p>}
              </div>
            )
          )}
        </aside>
      </div>
    </main>
  );
}
