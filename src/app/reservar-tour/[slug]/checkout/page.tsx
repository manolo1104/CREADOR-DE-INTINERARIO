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
import { TOURS_DB } from "@/lib/tours";
import { trackPurchase } from "@/lib/analytics";
import { trackTourEvent } from "@/lib/tourTracker";
import { ChevronLeft, Lock, ShieldCheck, Clock, Users, MessageCircle, CreditCard, CalendarCheck, Award, Mail } from "lucide-react";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
  "pk_live_51SuFNKPRwYk9rOzoUc56CjtGJ2VdnUkHvRNlP6N6EXX2PHdemLg0oHcOhXTUyv1jl1XHKvxcMfoIJErQSBBp4ojT00UPdWzcaR"
);

const WA_NUMBER = "524891251458";

// ── Formulario ────────────────────────────────────────────────────────────────

function CheckoutForm({ booking, clientSecret, paymentIntentId, cobro }: {
  booking: TourBookingState;
  clientSecret: string;
  paymentIntentId: string;
  /** Montos AUTORITATIVOS devueltos por el servidor (no los del sessionStorage). */
  cobro: { charge: number; total: number; saldo: number; pct: number };
}) {
  const stripe   = useStripe();
  const elements = useElements();
  const router   = useRouter();

  const [name,           setName]           = useState("");
  const [email,          setEmail]          = useState("");
  const [phone,          setPhone]          = useState("");
  const [pickup,         setPickup]         = useState("");
  const [notes,          setNotes]          = useState("");
  const [showNotes,      setShowNotes]      = useState(false);
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState("");
  const [procesando,     setProcesando]     = useState(false);

  // Hospedaje donde pasamos por el cliente (Xilitla o Ciudad Valles). Opcional:
  // si se deja vacío, la dirección se coordina por WhatsApp.
  const pickupLocation = pickup.trim() || "Por definir — te contactaremos por WhatsApp";

  const chargeAmt   = cobro.charge;

  const waDoubtsMsg = encodeURIComponent(
    `Hola, estoy a punto de reservar el tour "${booking.tourName}" y tengo una pregunta antes de pagar.`
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    if (!name.trim() || !email.trim()) {
      setError("Nombre y correo son obligatorios.");
      return;
    }

    setLoading(true);
    setError("");

    const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        payment_method_data: { billing_details: { name: name.trim(), email: email.trim() } },
        // Red de seguridad: si algún método llegara a exigir redirección, Stripe
        // sabe a dónde regresar en lugar de reventar con un IntegrationError.
        return_url: `${window.location.origin}/reservar-tour/confirmacion`,
      },
      redirect: "if_required",
    });

    if (stripeError) {
      // Sin esto el motivo del fallo moría en un useState y jamás se sabía por
      // qué no cerró la venta.
      trackTourEvent("PAGO_FALLIDO", {
        tour_name:   booking.tourName,
        tourSlug:    booking.tourSlug,
        amount:      chargeAmt,
        code:        stripeError.code,
        decline_code: stripeError.decline_code,
        error_type:  stripeError.type,
        pm_type:     stripeError.payment_method?.type,
        message:     stripeError.message,
        paymentIntentId,
      });
      setError(stripeError.message || "Error al procesar el pago. Intenta de nuevo.");
      setLoading(false);
      return;
    }

    // Pagos que quedan "en proceso" (algunos débitos y wallets): el cobro sí va
    // en camino. Antes caían al else y se les decía que había fallado.
    if (paymentIntent?.status === "processing") {
      trackTourEvent("PAGO_EN_PROCESO", {
        tour_name: booking.tourName, tourSlug: booking.tourSlug,
        amount: chargeAmt, paymentIntentId,
      });
      setError("");
      setProcesando(true);
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
            // Tours por vehículo (RZR): datos de ruta/vehículo + línea para /reservas
            ruta:             booking.ruta || null,
            vehiculo:         booking.vehiculo || null,
            unidades:         booking.unidades || null,
            lineItems:        booking.vehiculo ? [{
              tourSlug: booking.tourSlug,
              tourName: booking.tourName,
              tourDate: booking.tourDate,
              ruta:     booking.ruta,
              vehiculo: booking.vehiculo,
              unidades: booking.unidades,
              adults:   booking.adults,
              childrenMid: 0,
              childrenSmall: 0,
              subtotal: chargeAmt,
            }] : undefined,
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
        trackTourEvent("BOOKING_CONFIRMED", {
          tour_name: booking.tourName,
          tourSlug:  booking.tourSlug,
          amount:    chargeAmt,
          adults:    booking.adults,
          children:  booking.children,
          confirmationNumber,
        });

        sessionStorage.setItem("hp_tour_confirmation", JSON.stringify({
          confirmationNumber,
          ...booking,
          // Montos del servidor, no los estimados en la pantalla anterior.
          total:        cobro.total,
          chargeAmount: cobro.charge,
          paymentMode:  cobro.saldo > 0 ? "deposit" : "full",
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
      trackTourEvent("PAGO_FALLIDO", {
        tour_name: booking.tourName, tourSlug: booking.tourSlug,
        amount: chargeAmt, code: paymentIntent?.status ?? "sin_estado",
        paymentIntentId,
      });
      setError("El pago no fue completado. Intenta de nuevo.");
      setLoading(false);
    }
  }

  if (procesando) {
    return (
      <div className="bg-white border border-negro/8 p-8 text-center">
        <Clock className="w-8 h-8 text-verde-selva mx-auto mb-4" />
        <h2 className="font-cormorant text-verde-profundo text-2xl mb-2">Tu pago está en proceso</h2>
        <p className="font-dm text-sm text-negro/60 leading-relaxed max-w-md mx-auto">
          El banco está confirmando el cobro. En cuanto se acredite te enviamos la
          confirmación a <strong className="text-negro/80">{email.trim()}</strong>. No hace falta
          que pagues de nuevo.
        </p>
        <p className="font-dm text-xs text-negro/40 mt-4">Referencia: {paymentIntentId}</p>
        <a
          href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(`Hola, mi pago del tour "${booking.tourName}" quedó en proceso. Referencia: ${paymentIntentId}`)}`}
          target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 mt-6 text-verde-selva hover:text-verde-vivo font-dm text-sm underline underline-offset-4"
        >
          <MessageCircle className="w-4 h-4" />
          Avísanos por WhatsApp
        </a>
      </div>
    );
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

          {/* Hotel de recogida — un solo campo opcional */}
          <div>
            <label className="block text-[10px] tracking-[2px] uppercase text-negro/50 font-dm mb-1.5">
              Dónde te hospedas <span className="text-negro/35 normal-case tracking-normal">(Xilitla o Ciudad Valles · opcional)</span>
            </label>
            <input type="text" value={pickup} onChange={(e) => setPickup(e.target.value)}
              placeholder="Ej. Hotel Taninul, Ciudad Valles"
              className="w-full border border-negro/20 bg-crema px-4 py-3 font-dm text-sm text-negro focus:outline-none focus:border-verde-selva transition-colors"
            />
            <p className="mt-1.5 text-[10px] text-negro/40 font-dm">
              Pasamos por ti a tu hospedaje en Xilitla o Ciudad Valles — no importa dónde te quedes.
              Si lo dejas en blanco, coordinamos la recogida por WhatsApp.
            </p>
          </div>

          {/* Notas especiales — colapsadas */}
          {showNotes ? (
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
          ) : (
            <button type="button" onClick={() => setShowNotes(true)}
              className="text-xs font-dm text-verde-selva hover:text-verde-vivo transition-colors underline underline-offset-2">
              + Agregar una nota (alergias, necesidades especiales…)
            </button>
          )}
        </div>
      </section>

      {/* Pago */}
      <section className="bg-white border border-negro/8 p-6">
        <div className="flex items-center gap-2 mb-5">
          <Lock className="w-4 h-4 text-verde-selva" />
          <h2 className="font-cormorant text-verde-profundo text-xl">Información de pago</h2>
        </div>
        {/* Apple Pay / Google Pay aparecen aquí automáticamente si están habilitados en
            el panel de Stripe y el dominio está verificado (Settings → Payment methods). */}
        {cobro.saldo > 0 && (
          <div className="mb-5 bg-verde-selva/8 border border-verde-selva/25 px-4 py-3">
            <p className="font-dm text-sm text-verde-profundo">
              Estás apartando tu lugar con el <strong>{cobro.pct} %</strong>.
            </p>
            <p className="font-dm text-xs text-negro/55 mt-1">
              Hoy pagas <strong className="text-negro/75">{formatMXN(cobro.charge)} MXN</strong> ·
              Saldo de <strong className="text-negro/75">{formatMXN(cobro.saldo)} MXN</strong> el
              día del tour, en efectivo o con tarjeta.
            </p>
          </div>
        )}
        <PaymentElement options={{ layout: "tabs", wallets: { applePay: "auto", googlePay: "auto" } }} />
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
            {`Pagar ${formatMXN(chargeAmt)} MXN`}
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
  // Montos autoritativos del servidor; el sessionStorage solo es una pista.
  const [cobro, setCobro] = useState({ charge: 0, total: 0, saldo: 0, pct: 100 });
  const piPedido = useRef(false);

  useEffect(() => {
    const state = loadTourBookingState();
    if (!state || state.tourSlug !== params.slug) {
      router.replace(`/reservar-tour/${params.slug}`);
      return;
    }
    setBooking(state);

    // Un solo PaymentIntent por visita. Sin esta guarda el efecto se ejecuta dos
    // veces (StrictMode en dev, remontajes en producción) y se creaban DOS
    // PaymentIntents por checkout: inflaba las métricas de Stripe y, peor, le
    // cambiaba el clientSecret a <Elements> después de montar — que no lo
    // soporta y deja el formulario de tarjeta en blanco.
    if (piPedido.current) return;
    piPedido.current = true;

    fetch("/api/tours/create-payment-intent", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // El monto lo calcula el servidor a partir de estos datos (no se envía amount).
        tourDetails: {
          tourId:        state.tourId,
          tourSlug:      state.tourSlug,
          tourName:      state.tourName,
          tourDate:      state.tourDate,
          adults:        state.adults,
          childrenMid:   state.childrenMid,
          childrenSmall: state.childrenSmall,
          promoCode:     state.promoCode,
          pct:           state.pct,
          // Tours por vehículo (RZR): el servidor cobra desde la matriz flota×ruta.
          ruta:          state.ruta,
          vehiculo:      state.vehiculo,
          unidades:      state.unidades,
        },
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setPiError(d.error); return; }
        setClientSecret(d.clientSecret);
        setPIId(d.paymentIntentId);
        setCobro({
          charge: d.amount ?? state.total,
          total:  d.total  ?? state.total,
          saldo:  d.saldo  ?? 0,
          pct:    d.pct    ?? 100,
        });
      })
      .catch(() => setPiError("Error de conexión. Recarga la página."))
      .finally(() => setLoadingPI(false));
  }, [params.slug]);

  if (!booking) return null;

  const tourData = TOURS_DB.find((t) => t.id === booking.tourId || t.slug === booking.tourSlug);

  const stripeOptions = {
    clientSecret,
    locale: "es-419" as const,
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
              <CheckoutForm booking={booking} clientSecret={clientSecret} paymentIntentId={paymentIntentId} cobro={cobro} />
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
                {booking.vehiculo ? (
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" />{booking.unidades} vehículo{(booking.unidades ?? 1) !== 1 ? "s" : ""}</span>
                ) : (
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" />{booking.adults + booking.children} personas</span>
                )}
              </div>
            </div>
            <div className="border-t border-negro/8 pt-4 space-y-2 text-sm font-dm">
              {booking.vehiculo ? (
                <>
                  <div className="flex justify-between text-negro/60"><span>Ruta</span><span className="text-right">{(booking.ruta ?? "").replace(/^Ruta\s/, "")}</span></div>
                  <div className="flex justify-between text-negro/60"><span>Vehículo</span><span className="text-right">{booking.vehiculo}</span></div>
                  <div className="flex justify-between text-negro/60">
                    <span>{booking.unidades} vehículo{(booking.unidades ?? 1) !== 1 ? "s" : ""} × {formatMXN(booking.priceAdult)}</span>
                    <span>{formatMXN(booking.total)}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between text-negro/60">
                    <span>{booking.adults} adulto{booking.adults !== 1 ? "s" : ""}</span>
                    <span>{formatMXN(booking.priceAdult * booking.adults)}</span>
                  </div>
                  {booking.childrenMid > 0 && (
                    <div className="flex justify-between text-negro/60">
                      <span>{booking.childrenMid} niño{booking.childrenMid !== 1 ? "s" : ""} 6–10 años</span>
                      <span>{formatMXN(Math.round(booking.priceAdult * 0.7) * booking.childrenMid)}</span>
                    </div>
                  )}
                  {booking.childrenSmall > 0 && (
                    <div className="flex justify-between text-negro/60">
                      <span>{booking.childrenSmall} menor{booking.childrenSmall !== 1 ? "es" : ""} de 6</span>
                      <span>{formatMXN(Math.round(booking.priceAdult * 0.5) * booking.childrenSmall)}</span>
                    </div>
                  )}
                  {booking.promoDiscount > 0 && (
                    <div className="flex justify-between text-verde-selva">
                      <span>Descuento {booking.promoDiscount}%</span>
                      <span>−{formatMXN(booking.subtotal - booking.total)}</span>
                    </div>
                  )}
                </>
              )}
              <div className="flex justify-between font-medium text-negro border-t border-negro/10 pt-2">
                <span>Total</span>
                <span className="font-cormorant text-xl text-dorado">{formatMXN(cobro.total || booking.total)} MXN</span>
              </div>
              {cobro.saldo > 0 && (
                <>
                  <div className="flex justify-between text-verde-profundo font-medium">
                    <span>Pagas hoy ({cobro.pct} %)</span>
                    <span>{formatMXN(cobro.charge)} MXN</span>
                  </div>
                  <div className="flex justify-between text-negro/50 text-xs">
                    <span>Saldo el día del tour</span>
                    <span>{formatMXN(cobro.saldo)} MXN</span>
                  </div>
                </>
              )}
            </div>
            <div className="border-t border-negro/8 pt-4">
              <p className="text-[9px] tracking-[2px] uppercase text-negro/30 font-dm mb-2">Todo incluido</p>
              <ul className="space-y-1 text-xs font-dm text-negro/55">
                {(tourData?.incluye ?? [
                  "Traslado redondo desde tu hospedaje en Xilitla o Ciudad Valles",
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

          {/* Garantías — versión compacta */}
          <div className="bg-white border border-negro/8 p-5">
            <p className="text-[9px] tracking-[2px] uppercase text-negro/40 font-dm mb-3">Reserva con confianza</p>
            <ul className="space-y-2">
              {[
                { Icon: CreditCard,    text: "Pago 100% seguro · Stripe" },
                { Icon: CalendarCheck, text: "Cancelación gratuita con 48h" },
                { Icon: Award,         text: "Guías NOM-09 SECTUR" },
                { Icon: Mail,          text: "Confirmación por correo inmediata" },
              ].map(({ Icon, text }) => (
                <li key={text} className="flex items-center gap-2 text-xs font-dm text-negro/65">
                  <Icon className="w-3.5 h-3.5 text-verde-selva flex-shrink-0" aria-hidden="true" />
                  {text}
                </li>
              ))}
            </ul>
          </div>

        </aside>
      </div>
    </main>
  );
}
