"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements, PaymentElement,
  useStripe, useElements,
} from "@stripe/react-stripe-js";
import { loadTourBookingState, clearTourBookingState, formatMXN, formatTourDate } from "@/lib/tourBooking";
import type { TourBookingState } from "@/lib/tourBooking";
import { TOURS_DB } from "@/lib/tours";
import { trackPurchase } from "@/lib/analytics";
import { ReviewsCarousel } from "@/components/booking/ReviewsCarousel";
import { GuideCard } from "@/components/booking/GuideCard";
import { ChevronLeft, Lock, ShieldCheck, Clock, Users, MessageCircle, CreditCard, CalendarCheck, Award, Phone, Mail } from "lucide-react";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
  "pk_live_51SuFNKPRwYk9rOzoUc56CjtGJ2VdnUkHvRNlP6N6EXX2PHdemLg0oHcOhXTUyv1jl1XHKvxcMfoIJErQSBBp4ojT00UPdWzcaR"
);

const WA_NUMBER = "524891251458";

// ── Formulario ────────────────────────────────────────────────────────────────

function CheckoutForm({ booking, clientSecret, paymentIntentId }: {
  booking: TourBookingState;
  clientSecret: string;
  paymentIntentId: string;
}) {
  const stripe   = useStripe();
  const elements = useElements();
  const router   = useRouter();

  const [name,           setName]           = useState("");
  const [email,          setEmail]          = useState("");
  const [phone,          setPhone]          = useState("");
  const [hotelOption,    setHotelOption]    = useState<"paraiso" | "otro" | "pordefinir">("paraiso");
  const [otroHotel,      setOtroHotel]      = useState("");
  const [notes,          setNotes]          = useState("");
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState("");
  const [pickupError,    setPickupError]    = useState("");

  // Construye el texto de pickup según la opción
  const pickupLocation = hotelOption === "paraiso"
    ? "Hotel Paraíso Encantado Xilitla"
    : hotelOption === "pordefinir"
    ? "Por definir — te contactaremos para coordinarlo"
    : otroHotel.trim();

  const isDeposit   = booking.paymentMode === "deposit";
  const chargeAmt   = booking.chargeAmount ?? booking.total;
  const remaining   = booking.total - chargeAmt;

  const waDoubtsMsg = encodeURIComponent(
    `Hola, estoy a punto de reservar el tour "${booking.tourName}" y tengo una pregunta antes de pagar.`
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setPickupError("");
    if (!name.trim() || !email.trim()) {
      setError("Nombre y correo son obligatorios.");
      return;
    }
    if (hotelOption === "otro" && !otroHotel.trim()) {
      setPickupError("Por favor indícanos el nombre de tu hotel o dirección 🙂");
      return;
    }

    setLoading(true);
    setError("");

    const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        payment_method_data: { billing_details: { name: name.trim(), email: email.trim() } },
      },
      redirect: "if_required",
    });

    if (stripeError) {
      setError(stripeError.message || "Error al procesar el pago. Intenta de nuevo.");
      setLoading(false);
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      try {
        const res = await fetch("/api/tours/send-confirmation", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email:            email.trim(),
            customerName:     name.trim(),
            customerPhone:    phone.trim() || null,
            notes:            [
              pickupLocation.trim() ? `Recogida: ${pickupLocation.trim()}` : null,
              notes.trim() || null,
            ].filter(Boolean).join(" | ") || null,
            totalAmount:      chargeAmt,
            paymentIntentId,
            tourId:           booking.tourId,
            tourName:         booking.tourName,
            tourSlug:         booking.tourSlug,
            tourDate:         booking.tourDate,
            adults:           booking.adults,
            children:         booking.children,
            promoCode:        booking.promoCode || null,
            promoDiscount:    booking.promoDiscount || 0,
          }),
        });
        const data = await res.json();
        const confirmationNumber = data.confirmationNumber || "HP" + Date.now().toString(36).toUpperCase();

        trackPurchase({
          confirmationNumber,
          tourId:   booking.tourId,
          tourName: booking.tourName,
          total:    chargeAmt,
          adults:   booking.adults,
          children: booking.children,
        });

        sessionStorage.setItem("hp_tour_confirmation", JSON.stringify({
          confirmationNumber,
          ...booking,
          customerName:  name.trim(),
          customerEmail: email.trim(),
        }));
        clearTourBookingState();
        router.push("/reservar-tour/confirmacion");
      } catch {
        setError("Pago procesado, pero hubo un error enviando la confirmación. Guarda tu referencia: " + paymentIntentId);
        setLoading(false);
      }
    } else {
      setError("El pago no fue completado. Intenta de nuevo.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Mejora 13A — WhatsApp strip encima del form */}
      <div className="flex items-center justify-between bg-verde-selva/8 border border-verde-selva/20 px-4 py-3">
        <div>
          <p className="text-[10px] tracking-[1px] uppercase text-negro/45 font-dm">¿Dudas antes de pagar?</p>
          <a
            href={`https://wa.me/${WA_NUMBER}?text=${waDoubtsMsg}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm font-dm text-verde-selva hover:text-verde-vivo transition-colors font-medium"
          >
            <MessageCircle className="w-4 h-4" />
            Escríbenos · +52 489 125 1458
          </a>
        </div>
        <p className="text-[10px] text-negro/35 font-dm text-right hidden sm:block">
          Respuesta en menos<br />de 1 hora · Lun–Dom
        </p>
      </div>

      {/* Datos del contacto */}
      <section className="bg-white border border-negro/8 p-6">
        <h2 className="font-cormorant text-verde-profundo text-xl mb-5">Datos de contacto</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] tracking-[2px] uppercase text-negro/50 font-dm mb-1.5">
              Nombre completo *
            </label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Juan García" required
              className="w-full border border-negro/20 bg-crema px-4 py-3 font-dm text-sm text-negro focus:outline-none focus:border-verde-selva transition-colors"
            />
          </div>
          <div>
            <label className="block text-[10px] tracking-[2px] uppercase text-negro/50 font-dm mb-1.5">
              Correo electrónico *
            </label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="juan@correo.com" required
              className="w-full border border-negro/20 bg-crema px-4 py-3 font-dm text-sm text-negro focus:outline-none focus:border-verde-selva transition-colors"
            />
            <p className="mt-1.5 text-xs text-negro/40 font-dm">La confirmación se envía a este correo</p>
          </div>
          <div>
            <label className="block text-[10px] tracking-[2px] uppercase text-negro/50 font-dm mb-1.5">
              WhatsApp / Teléfono
            </label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="+52 489 123 4567"
              className="w-full border border-negro/20 bg-crema px-4 py-3 font-dm text-sm text-negro focus:outline-none focus:border-verde-selva transition-colors"
            />
          </div>

          {/* Mejora 7 — Hotel de recogida con selector */}
          <div>
            <label className="block text-[10px] tracking-[2px] uppercase text-negro/50 font-dm mb-2">
              Hotel de recogida *
            </label>

            {/* Opción rápida: Paraíso Encantado */}
            <button
              type="button"
              onClick={() => { setHotelOption("paraiso"); setPickupError(""); }}
              className={`w-full flex items-center gap-3 border px-4 py-3 mb-2 text-left transition-colors ${
                hotelOption === "paraiso"
                  ? "border-verde-selva bg-verde-selva/5"
                  : "border-negro/15 hover:border-negro/30"
              }`}
            >
              <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                hotelOption === "paraiso" ? "border-verde-selva" : "border-negro/25"
              }`}>
                {hotelOption === "paraiso" && <div className="w-2 h-2 rounded-full bg-verde-selva" />}
              </div>
              <div>
                <p className="font-dm text-sm text-negro/85 font-medium leading-none">Hotel Paraíso Encantado Xilitla</p>
                <p className="text-[10px] text-negro/45 font-dm mt-0.5">Xilitla, San Luis Potosí</p>
              </div>
            </button>

            {/* Opción: otro hotel */}
            <button
              type="button"
              onClick={() => { setHotelOption("otro"); setPickupError(""); }}
              className={`w-full flex items-center gap-3 border px-4 py-3 text-left transition-colors ${
                hotelOption === "otro"
                  ? "border-verde-selva bg-verde-selva/5"
                  : "border-negro/15 hover:border-negro/30"
              }`}
            >
              <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                hotelOption === "otro" ? "border-verde-selva" : "border-negro/25"
              }`}>
                {hotelOption === "otro" && <div className="w-2 h-2 rounded-full bg-verde-selva" />}
              </div>
              <p className="font-dm text-sm text-negro/85">Otro hotel o dirección</p>
            </button>

            {/* Opción: por definir */}
            <button
              type="button"
              onClick={() => { setHotelOption("pordefinir"); setPickupError(""); }}
              className={`w-full flex items-center gap-3 border px-4 py-3 text-left transition-colors ${
                hotelOption === "pordefinir"
                  ? "border-verde-selva bg-verde-selva/5"
                  : "border-negro/15 hover:border-negro/30"
              }`}
            >
              <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                hotelOption === "pordefinir" ? "border-verde-selva" : "border-negro/25"
              }`}>
                {hotelOption === "pordefinir" && <div className="w-2 h-2 rounded-full bg-verde-selva" />}
              </div>
              <div>
                <p className="font-dm text-sm text-negro/85">Por definir</p>
                <p className="text-[10px] text-negro/45 font-dm mt-0.5">Te contactaremos para coordinarlo</p>
              </div>
            </button>

            {hotelOption === "otro" && (
              <textarea
                value={otroHotel}
                onChange={(e) => { setOtroHotel(e.target.value); setPickupError(""); }}
                placeholder="Nombre del hotel y ciudad · Ej. Hotel Valles, Ciudad Valles SLP"
                rows={2}
                className={`mt-2 w-full border px-4 py-3 font-dm text-sm text-negro focus:outline-none transition-colors resize-none bg-crema ${
                  pickupError ? "border-terracota" : "border-negro/20 focus:border-verde-selva"
                }`}
              />
            )}

            {pickupError ? (
              <p className="mt-1.5 text-xs text-terracota font-dm" role="alert">{pickupError}</p>
            ) : (
              <p className="mt-2 text-[10px] text-negro/40 font-dm">
                Pasamos a recogerte a tu hospedaje. Respuesta por WhatsApp para coordinar hora exacta.
              </p>
            )}
          </div>

          {/* Notas especiales */}
          <div>
            <label className="block text-[10px] tracking-[2px] uppercase text-negro/50 font-dm mb-1.5">
              Notas especiales
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Alergias, restricciones alimentarias, necesidades especiales..."
              rows={3}
              className="w-full border border-negro/20 bg-crema px-4 py-3 font-dm text-sm text-negro focus:outline-none focus:border-verde-selva transition-colors resize-none"
            />
          </div>
        </div>
      </section>

      {/* Pago */}
      <section className="bg-white border border-negro/8 p-6">
        <div className="flex items-center gap-2 mb-5">
          <Lock className="w-4 h-4 text-verde-selva" />
          <h2 className="font-cormorant text-verde-profundo text-xl">Información de pago</h2>
        </div>
        {isDeposit && (
          <div className="mb-4 bg-verde-selva/8 border border-verde-selva/20 px-4 py-3">
            <p className="text-xs font-dm text-verde-selva">
              ✓ Depósito de reserva (30%) — {formatMXN(chargeAmt)} MXN.
              El resto ({formatMXN(remaining)} MXN) se paga el día del tour.
            </p>
          </div>
        )}
        <PaymentElement options={{ layout: "tabs" }} />
      </section>

      {error && (
        <div className="bg-terracota/10 border border-terracota/30 px-4 py-3">
          <p className="text-terracota font-dm text-sm" role="alert">{error}</p>
        </div>
      )}

      {/* Mejora 13B — micro-copy arriba del botón */}
      <div className="text-center text-[10px] text-negro/40 font-dm">
        🔒 Pago seguro · ¿Prefieres otro medio?{" "}
        <a
          href={`https://wa.me/${WA_NUMBER}?text=${waDoubtsMsg}`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-verde-selva transition-colors"
        >
          Escríbenos al +52 489 125 1458
        </a>
      </div>

      <button
        type="submit"
        disabled={loading || !stripe}
        className="w-full bg-verde-selva text-crema py-4 text-sm tracking-[2px] uppercase font-dm hover:bg-verde-vivo transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <span className="inline-block w-4 h-4 border-2 border-crema/30 border-t-crema rounded-full animate-spin" />
            Procesando pago...
          </>
        ) : (
          <>
            <Lock className="w-3.5 h-3.5" />
            {isDeposit ? `Reservar con ${formatMXN(chargeAmt)} MXN` : `Pagar ${formatMXN(chargeAmt)} MXN`}
          </>
        )}
      </button>

      <div className="flex items-center justify-center gap-2 text-xs font-dm text-negro/40">
        <ShieldCheck className="w-4 h-4 text-verde-selva" />
        Pago cifrado con TLS · Procesado por Stripe
      </div>
    </form>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function CheckoutTourPage() {
  const router  = useRouter();
  const params  = useParams<{ slug: string }>();
  const [booking, setBooking]           = useState<TourBookingState | null>(null);
  const [clientSecret, setClientSecret] = useState("");
  const [paymentIntentId, setPIId]      = useState("");
  const [loadingPI, setLoadingPI]       = useState(true);
  const [piError, setPiError]           = useState("");

  useEffect(() => {
    const state = loadTourBookingState();
    if (!state || state.tourSlug !== params.slug) {
      router.replace(`/reservar-tour/${params.slug}`);
      return;
    }
    setBooking(state);

    const chargeAmt = state.chargeAmount ?? state.total;

    fetch("/api/tours/create-payment-intent", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: chargeAmt,
        tourDetails: {
          tourId:   state.tourId,
          tourName: state.tourName,
          tourDate: state.tourDate,
          adults:   state.adults,
          children: state.children,
        },
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setPiError(d.error); return; }
        setClientSecret(d.clientSecret);
        setPIId(d.paymentIntentId);
      })
      .catch(() => setPiError("Error de conexión. Recarga la página."))
      .finally(() => setLoadingPI(false));
  }, [params.slug]);

  if (!booking) return null;

  const tourData = TOURS_DB.find((t) => t.id === booking.tourId || t.slug === booking.tourSlug);

  const stripeOptions = {
    clientSecret,
    appearance: {
      theme: "stripe" as const,
      variables: {
        colorPrimary:    "#3a6b1a",
        colorBackground: "#f4edd8",
        colorText:       "#1a2e1a",
        colorDanger:     "#9a4a1e",
        fontFamily:      "DM Sans, sans-serif",
        borderRadius:    "0px",
        spacingUnit:     "4px",
      },
    },
  };

  const chargeAmt = booking.chargeAmount ?? booking.total;
  const isDeposit = booking.paymentMode === "deposit";

  return (
    <main className="min-h-screen bg-crema pt-24 pb-20">

      {/* Breadcrumb + Teléfono visible */}
      <div className="max-w-5xl mx-auto px-6 mb-8 flex items-center justify-between gap-4 flex-wrap">
        <Link href={`/reservar-tour/${params.slug}`}
          className="inline-flex items-center gap-1.5 text-negro/50 hover:text-verde-selva text-xs font-dm tracking-[1px] uppercase transition-colors">
          <ChevronLeft className="w-3 h-3" />
          Atrás
        </Link>
        {/* Mejora 8 — Teléfono siempre visible */}
        <a
          href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(`Hola, tengo una pregunta sobre mi reserva del tour "${booking?.tourName ?? ""}".`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-verde-selva hover:text-verde-vivo transition-colors group"
        >
          <MessageCircle className="w-4 h-4" />
          <span className="font-dm text-sm font-medium">+52 489 125 1458</span>
          <span className="hidden sm:block text-[10px] text-negro/40 font-dm group-hover:text-negro/60 transition-colors">
            · ¿Dudas? Escríbenos
          </span>
        </a>
      </div>

      {/* Stepper */}
      <div className="max-w-5xl mx-auto px-6 mb-10">
        <div className="flex items-center gap-3">
          {["Seleccionar", "Pagar", "Confirmado"].map((s, i) => (
            <div key={s} className="flex items-center gap-3">
              <div className={`flex items-center gap-2 ${i === 1 ? "text-verde-selva" : "text-negro/30"}`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-dm font-medium ${
                  i === 1 ? "bg-verde-selva text-white" : i === 0 ? "bg-negro/10 text-negro/40" : "border border-negro/20 text-negro/30"
                }`}>
                  {i === 0 ? "✓" : i + 1}
                </span>
                <span className="text-[11px] tracking-[1px] uppercase font-dm hidden sm:block">{s}</span>
              </div>
              {i < 2 && <div className="h-px w-8 bg-negro/15" />}
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 items-start">

        {/* ── FORMULARIO ── */}
        <div>
          {loadingPI ? (
            <div className="bg-white border border-negro/8 p-8 text-center">
              <div className="inline-block w-6 h-6 border-2 border-verde-selva/20 border-t-verde-selva rounded-full animate-spin mb-4" />
              <p className="font-dm text-sm text-negro/50">Preparando pago seguro...</p>
            </div>
          ) : piError ? (
            <div className="bg-white border border-terracota/20 p-6">
              <p className="text-terracota font-dm text-sm mb-4">{piError}</p>
              <button onClick={() => window.location.reload()}
                className="text-xs tracking-[1px] uppercase font-dm text-verde-selva border-b border-verde-selva/30">
                Reintentar
              </button>
            </div>
          ) : clientSecret ? (
            <Elements stripe={stripePromise} options={stripeOptions}>
              <CheckoutForm booking={booking} clientSecret={clientSecret} paymentIntentId={paymentIntentId} />
            </Elements>
          ) : null}
        </div>

        {/* ── SIDEBAR ── */}
        <aside className="lg:sticky lg:top-24 space-y-4">

          {/* Resumen */}
          <div className="bg-white border border-negro/8 p-5 space-y-4">
            <h3 className="font-cormorant text-verde-profundo text-lg">Tu reserva</h3>
            <div className="space-y-2 text-sm font-dm">
              <p className="text-negro/80 font-medium leading-snug">{booking.tourName}</p>
              <p className="text-negro/50">{formatTourDate(booking.tourDate)}</p>
              <div className="flex gap-4 text-negro/50 text-xs">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{booking.tourDuration}h</span>
                <span className="flex items-center gap-1"><Users className="w-3 h-3" />{booking.adults + booking.children} personas</span>
              </div>
            </div>
            <div className="border-t border-negro/8 pt-4 space-y-2 text-sm font-dm">
              <div className="flex justify-between text-negro/60">
                <span>{booking.adults} adulto{booking.adults !== 1 ? "s" : ""}</span>
                <span>{formatMXN(booking.priceAdult * booking.adults)}</span>
              </div>
              {booking.children > 0 && (
                <div className="flex justify-between text-negro/60">
                  <span>{booking.children} niño{booking.children !== 1 ? "s" : ""}</span>
                  <span>{formatMXN(Math.round(booking.priceAdult * 0.6) * booking.children)}</span>
                </div>
              )}
              {booking.promoDiscount > 0 && (
                <div className="flex justify-between text-verde-selva">
                  <span>Descuento {booking.promoDiscount}%</span>
                  <span>−{formatMXN(booking.subtotal - booking.total)}</span>
                </div>
              )}
              <div className="flex justify-between font-medium text-negro border-t border-negro/10 pt-2">
                <span>Total</span>
                <span className="font-cormorant text-xl text-dorado">{formatMXN(booking.total)} MXN</span>
              </div>
              {isDeposit && (
                <div className="flex justify-between text-verde-selva font-medium bg-verde-selva/8 border border-verde-selva/20 px-3 py-2 text-xs">
                  <span>Cobro ahora (30%)</span>
                  <span className="font-cormorant text-sm">{formatMXN(chargeAmt)} MXN</span>
                </div>
              )}
            </div>
            <div className="border-t border-negro/8 pt-4">
              <p className="text-[9px] tracking-[2px] uppercase text-negro/30 font-dm mb-2">Todo incluido</p>
              <ul className="space-y-1 text-xs font-dm text-negro/55">
                {(tourData?.incluye ?? [
                  "Transporte desde tu hotel",
                  "Guía certificado NOM-09 SECTUR",
                  "Entradas a todas las atracciones",
                  "Desayuno con platillos típicos",
                  "Equipo de seguridad completo",
                  "Fotografías y video del recorrido",
                ]).map((item) => (
                  <li key={item} className="flex items-start gap-1.5">
                    <span className="text-verde-selva flex-shrink-0 mt-0.5">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Mejora 9 — Foto del guía */}
          <GuideCard guiaIndex={
            booking.tourId === "tour-tamul" || booking.tourId === "tour-puente-dios" ? 1 :
            booking.tourId === "tour-meco"  || booking.tourId === "tour-minas-micos" ? 2 : 0
          } />

          {/* Mejora 6 — Reviews en rotación */}
          <ReviewsCarousel />

          {/* Garantías */}
          <div className="bg-white border border-negro/8 p-5">
            <p className="text-[9px] tracking-[2px] uppercase text-negro/40 font-dm mb-3">Reserva con confianza</p>
            <ul className="space-y-2">
              {[
                { Icon: CreditCard,    text: "Pago 100% seguro · Stripe" },
                { Icon: CalendarCheck, text: "Cancelación gratuita con 48h" },
                { Icon: Award,         text: "Guías NOM-09 SECTUR" },
                { Icon: Phone,         text: "Respuesta en menos de 1 hora" },
                { Icon: Mail,          text: "Confirmación por correo inmediata" },
              ].map(({ Icon, text }) => (
                <li key={text} className="flex items-center gap-2 text-xs font-dm text-negro/65">
                  <Icon className="w-3.5 h-3.5 text-verde-selva flex-shrink-0" aria-hidden="true" />
                  {text}
                </li>
              ))}
            </ul>
          </div>

          {/* Badges */}
          <div className="flex items-center justify-center gap-5 py-1 opacity-65">
            <img src="/badges/tripadvisor.svg" alt="TripAdvisor" loading="lazy" className="h-6 w-auto" />
            <img src="/badges/travellers-choice.svg" alt="Travellers Choice" loading="lazy" className="h-6 w-auto" />
            <img src="/badges/top-rated-google.svg" alt="Top Rated Google" loading="lazy" className="h-6 w-auto" />
          </div>

        </aside>
      </div>
    </main>
  );
}
