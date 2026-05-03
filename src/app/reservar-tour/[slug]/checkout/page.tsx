"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements, PaymentElement,
  useStripe, useElements,
} from "@stripe/react-stripe-js";
import { loadTourBookingState, clearTourBookingState, formatMXN, formatTourDate } from "@/lib/tourBooking";
import type { TourBookingState } from "@/lib/tourBooking";
import { ChevronLeft, Lock, ShieldCheck, Clock, Users } from "lucide-react";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
  "pk_live_51SuFNKPRwYk9rOzoUc56CjtGJ2VdnUkHvRNlP6N6EXX2PHdemLg0oHcOhXTUyv1jl1XHKvxcMfoIJErQSBBp4ojT00UPdWzcaR"
);

// ── Formulario interno (necesita acceso a stripe/elements) ───

function CheckoutForm({ booking, clientSecret, paymentIntentId }: {
  booking: TourBookingState;
  clientSecret: string;
  paymentIntentId: string;
}) {
  const stripe   = useStripe();
  const elements = useElements();
  const router   = useRouter();

  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [phone,    setPhone]    = useState("");
  const [notes,    setNotes]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    if (!name.trim() || !email.trim()) {
      setError("Nombre y correo son obligatorios.");
      return;
    }
    setLoading(true);
    setError("");

    // Confirmar pago con Stripe
    const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { payment_method_data: { billing_details: { name: name.trim(), email: email.trim() } } },
      redirect: "if_required",
    });

    if (stripeError) {
      setError(stripeError.message || "Error al procesar el pago. Intenta de nuevo.");
      setLoading(false);
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      // Llamar a API de confirmación → email + DB
      try {
        const res = await fetch("/api/tours/send-confirmation", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            email:            email.trim(),
            customerName:     name.trim(),
            customerPhone:    phone.trim() || null,
            notes:            notes.trim() || null,
            totalAmount:      booking.total,
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

        // Guardar en sessionStorage para la página de confirmación
        sessionStorage.setItem("hp_tour_confirmation", JSON.stringify({
          confirmationNumber,
          ...booking,
          customerName:  name.trim(),
          customerEmail: email.trim(),
        }));
        clearTourBookingState();
        router.push("/reservar-tour/confirmacion");
      } catch {
        setError("Pago procesado, pero hubo un error enviando la confirmación. Guarda tu número de pago: " + paymentIntentId);
        setLoading(false);
      }
    } else {
      setError("El pago no fue completado. Intenta de nuevo.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Datos del contacto */}
      <section className="bg-white border border-negro/8 p-6">
        <h2 className="font-cormorant text-verde-profundo text-xl mb-5">Datos de contacto</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] tracking-[2px] uppercase text-negro/50 font-dm mb-1.5">
              Nombre completo *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Juan García"
              required
              className="w-full border border-negro/20 bg-crema px-4 py-3 font-dm text-sm text-negro focus:outline-none focus:border-verde-selva transition-colors"
            />
          </div>
          <div>
            <label className="block text-[10px] tracking-[2px] uppercase text-negro/50 font-dm mb-1.5">
              Correo electrónico *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="juan@correo.com"
              required
              className="w-full border border-negro/20 bg-crema px-4 py-3 font-dm text-sm text-negro focus:outline-none focus:border-verde-selva transition-colors"
            />
            <p className="mt-1.5 text-xs text-negro/40 font-dm">La confirmación se envía a este correo</p>
          </div>
          <div>
            <label className="block text-[10px] tracking-[2px] uppercase text-negro/50 font-dm mb-1.5">
              WhatsApp / Teléfono
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+52 489 123 4567"
              className="w-full border border-negro/20 bg-crema px-4 py-3 font-dm text-sm text-negro focus:outline-none focus:border-verde-selva transition-colors"
            />
          </div>
          <div>
            <label className="block text-[10px] tracking-[2px] uppercase text-negro/50 font-dm mb-1.5">
              Notas especiales
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Alergias, necesidades especiales, hotel de recogida..."
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
        <PaymentElement options={{ layout: "tabs" }} />
      </section>

      {error && (
        <div className="bg-terracota/10 border border-terracota/30 px-4 py-3">
          <p className="text-terracota font-dm text-sm" role="alert">{error}</p>
        </div>
      )}

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
            Pagar {formatMXN(booking.total)} MXN
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

// ── Página principal ────────────────────────────────────────

export default function CheckoutTourPage() {
  const router   = useRouter();
  const params   = useParams<{ slug: string }>();
  const [booking, setBooking]             = useState<TourBookingState | null>(null);
  const [clientSecret, setClientSecret]   = useState("");
  const [paymentIntentId, setPIId]        = useState("");
  const [loadingPI, setLoadingPI]         = useState(true);
  const [piError, setPiError]             = useState("");

  useEffect(() => {
    const state = loadTourBookingState();
    if (!state || state.tourSlug !== params.slug) {
      router.replace(`/reservar-tour/${params.slug}`);
      return;
    }
    setBooking(state);

    // Crear PaymentIntent
    fetch("/api/tours/create-payment-intent", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        amount:         state.total,
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

  const stripeOptions = {
    clientSecret,
    appearance: {
      theme: "stripe" as const,
      variables: {
        colorPrimary:      "#3a6b1a",
        colorBackground:   "#f4edd8",
        colorText:         "#1a2e1a",
        colorDanger:       "#9a4a1e",
        fontFamily:        "DM Sans, sans-serif",
        borderRadius:      "0px",
        spacingUnit:       "4px",
      },
    },
  };

  return (
    <main className="min-h-screen bg-crema pt-24 pb-20">

      {/* Breadcrumb */}
      <div className="max-w-5xl mx-auto px-6 mb-8">
        <Link href={`/reservar-tour/${params.slug}`} className="inline-flex items-center gap-1.5 text-negro/50 hover:text-verde-selva text-xs font-dm tracking-[1px] uppercase transition-colors">
          <ChevronLeft className="w-3 h-3" />
          Atrás
        </Link>
      </div>

      {/* Stepper */}
      <div className="max-w-5xl mx-auto px-6 mb-10">
        <div className="flex items-center gap-3">
          {["Seleccionar", "Pagar", "Confirmado"].map((s, i) => (
            <div key={s} className="flex items-center gap-3">
              <div className={`flex items-center gap-2 ${i === 1 ? "text-verde-selva" : "text-negro/30"}`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-dm font-medium ${i === 1 ? "bg-verde-selva text-white" : i === 0 ? "bg-negro/10 text-negro/40" : "border border-negro/20 text-negro/30"}`}>
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
              <button onClick={() => window.location.reload()} className="text-xs tracking-[1px] uppercase font-dm text-verde-selva border-b border-verde-selva/30">
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

          {/* Resumen de reserva */}
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
            </div>
            <div className="border-t border-negro/8 pt-4">
              <p className="text-[9px] tracking-[2px] uppercase text-negro/30 font-dm mb-2">Incluido</p>
              <ul className="space-y-1 text-xs font-dm text-negro/50">
                <li>✓ Transporte desde tu hotel</li>
                <li>✓ Guía certificado NOM-09</li>
                <li>✓ Entradas y desayuno</li>
                <li>✓ Equipo de seguridad</li>
              </ul>
            </div>
          </div>

          {/* Social proof — reseña real */}
          <div className="bg-verde-profundo p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map(i => (
                  <svg key={i} className="w-3.5 h-3.5 text-dorado fill-current" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                  </svg>
                ))}
              </div>
              <span className="font-cormorant text-dorado text-base">4.9</span>
              <span className="text-crema/45 font-dm text-[10px]">· 492 reseñas verificadas</span>
            </div>
            <blockquote className="text-crema/80 font-dm text-xs leading-relaxed italic border-l-2 border-dorado/40 pl-3">
              "El guía conocía cada rincón del Tamul. Nos llevó a miradores que nunca hubiéramos encontrado solos. ¡100% recomendado!"
            </blockquote>
            <p className="text-crema/40 font-dm text-[10px]">— Sandra M. · Ciudad de México</p>
          </div>

          {/* Garantías */}
          <div className="bg-white border border-negro/8 p-5">
            <p className="text-[9px] tracking-[2px] uppercase text-negro/40 font-dm mb-3">Reserva con confianza</p>
            <ul className="space-y-2">
              {[
                { icon: "🔒", text: "Pago 100% seguro · Stripe" },
                { icon: "✅", text: "Cancelación gratuita con 48h" },
                { icon: "🏅", text: "Guías NOM-09 SECTUR" },
                { icon: "📞", text: "Respuesta en menos de 1 hora" },
                { icon: "📧", text: "Confirmación por correo inmediata" },
              ].map(({ icon, text }) => (
                <li key={text} className="flex items-center gap-2 text-xs font-dm text-negro/65">
                  <span>{icon}</span>{text}
                </li>
              ))}
            </ul>
          </div>

          {/* Badges */}
          <div className="flex items-center justify-center gap-5 py-1 opacity-65">
            <img src="/badges/tripadvisor.svg" alt="TripAdvisor" className="h-6 w-auto" />
            <img src="/badges/travellers-choice.svg" alt="Travellers Choice" className="h-6 w-auto" />
            <img src="/badges/top-rated-google.svg" alt="Top Rated Google" className="h-6 w-auto" />
          </div>

        </aside>
      </div>
    </main>
  );
}
