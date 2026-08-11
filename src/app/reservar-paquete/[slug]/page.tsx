"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { getPaquete } from "@/lib/paquetes";
import { minBookingDate } from "@/lib/tourBooking";
import { ChevronLeft, Lock, ShieldCheck, MessageCircle, Check, CalendarCheck } from "lucide-react";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
  "pk_live_51SuFNKPRwYk9rOzoUc56CjtGJ2VdnUkHvRNlP6N6EXX2PHdemLg0oHcOhXTUyv1jl1XHKvxcMfoIJErQSBBp4ojT00UPdWzcaR"
);

const WA_NUMBER = "524891251458";
const fmx = (n: number) => `$${Math.round(n).toLocaleString("es-MX")}`;
const PCT_OPTIONS = [
  { pct: 10,  label: "Aparta tu lugar", sub: "Anticipo del 10%" },
  { pct: 50,  label: "Mitad ahora",     sub: "50% hoy, 50% después" },
  { pct: 100, label: "Pago completo",   sub: "Liquida el 100%" },
] as const;

// ── Paso de pago (Stripe) ─────────────────────────────────────────────────────
function PayStage({ paquete, form, clientSecret, paymentIntentId, cobrado, onDone }: any) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true); setError("");
    const { error: sErr, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { payment_method_data: { billing_details: { name: form.name, email: form.email } } },
      redirect: "if_required",
    });
    if (sErr) { setError(sErr.message || "Error al procesar el pago."); setLoading(false); return; }
    if (paymentIntent?.status === "succeeded") {
      try {
        const res = await fetch("/api/paquetes/send-confirmation", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: form.email, customerName: form.name, customerPhone: form.phone || null,
            notes: form.notes || null, paymentIntentId,
            slug: paquete.slug, pct: form.pct, personas: form.personas, fecha: form.fecha,
          }),
        });
        const data = await res.json();
        onDone(data.confirmationNumber || "HP");
      } catch {
        onDone("HP");
      }
    } else {
      setError("El pago no fue completado. Intenta de nuevo.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handlePay} className="space-y-6">
      <section className="bg-white border border-negro/8 p-6">
        <div className="flex items-center gap-2 mb-5">
          <Lock className="w-4 h-4 text-verde-selva" />
          <h2 className="font-cormorant text-verde-profundo text-xl">Información de pago</h2>
        </div>
        <PaymentElement options={{ layout: "tabs", wallets: { applePay: "auto", googlePay: "auto" } }} />
      </section>
      {error && <div className="bg-terracota/10 border border-terracota/30 px-4 py-3"><p className="text-terracota font-dm text-sm">{error}</p></div>}
      <button type="submit" disabled={loading || !stripe}
        className="w-full bg-verde-selva text-crema py-4 text-sm tracking-[2px] uppercase font-dm hover:bg-verde-vivo transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
        {loading ? "Procesando pago..." : <><Lock className="w-3.5 h-3.5" />{`Pagar ${fmx(cobrado)} MXN`}</>}
      </button>
      <div className="flex items-center justify-center gap-2 text-xs font-dm text-negro/40">
        <ShieldCheck className="w-4 h-4 text-verde-selva" /> Pago cifrado con TLS · Procesado por Stripe
      </div>
    </form>
  );
}

// ── Página ────────────────────────────────────────────────────────────────────
export default function ReservarPaquetePage() {
  const params = useParams<{ slug: string }>();
  const paquete = getPaquete(params.slug);

  const [fecha, setFecha]       = useState("");
  const [personas, setPersonas] = useState("2");
  // El default arranca en el compromiso MÁS BAJO. Venía en 50 % con el 10 %
  // justo al lado: en un paquete de $15,500 eso es pedirle al cliente $7,750
  // de entrada en la primera pantalla. El que quiera pagar más lo elige.
  const [pct, setPct]           = useState<10 | 50 | 100>(10);
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [phone, setPhone]       = useState("");
  const [notes, setNotes]       = useState("");
  const [showNotes, setShowNotes] = useState(false);

  const [stage, setStage]           = useState<"form" | "pay" | "done">("form");
  const [clientSecret, setCS]       = useState("");
  const [paymentIntentId, setPIId]  = useState("");
  const [cobrado, setCobrado]       = useState(0);
  const [confNum, setConfNum]       = useState("");
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");

  const minDate = useMemo(() => minBookingDate(), []);

  if (!paquete) {
    return (
      <main className="min-h-screen bg-crema flex items-center justify-center px-6 pt-24">
        <div className="text-center">
          <p className="font-cormorant text-verde-profundo text-2xl mb-4">Paquete no encontrado</p>
          <Link href="/paquetes" className="text-verde-selva underline font-dm text-sm">Ver todos los paquetes</Link>
        </div>
      </main>
    );
  }

  const chargeAmt = Math.round(paquete.precio * pct / 100);
  const pendiente = paquete.precio - chargeAmt;

  async function goToPay() {
    setError("");
    if (!name.trim() || !email.trim()) { setError("Nombre y correo son obligatorios."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError("El correo no tiene un formato válido."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/paquetes/create-payment-intent", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerEmail: email.trim(), customerName: name.trim(),
          paqueteDetails: { slug: paquete!.slug, pct, personas, fecha },
        }),
      });
      const d = await res.json();
      if (d.error) { setError(d.error); setLoading(false); return; }
      setCS(d.clientSecret); setPIId(d.paymentIntentId); setCobrado(d.amount);
      setStage("pay");
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    }
    setLoading(false);
  }

  const stripeOptions = {
    clientSecret,
    locale: "es-419" as const,
    appearance: { theme: "stripe" as const, variables: { colorPrimary: "#3a6b1a", colorBackground: "#f4edd8", colorText: "#1a2e1a", fontFamily: "DM Sans, sans-serif", borderRadius: "0px" } },
  };

  const form = { name: name.trim(), email: email.trim(), phone: phone.trim(), notes: notes.trim(), pct, personas, fecha };

  return (
    <main className="min-h-screen bg-crema pt-24 pb-20">
      <div className="max-w-3xl mx-auto px-6 mb-8 flex items-center justify-between gap-4 flex-wrap">
        <Link href={`/paquetes/${paquete.slug}`} className="inline-flex items-center gap-1.5 text-negro/50 hover:text-verde-selva text-xs font-dm tracking-[1px] uppercase transition-colors">
          <ChevronLeft className="w-3 h-3" /> Volver al paquete
        </Link>
        <a href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(`Hola, quiero reservar el ${paquete.nombre}.`)}`} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 text-verde-selva hover:text-verde-vivo transition-colors">
          <MessageCircle className="w-4 h-4" /><span className="font-dm text-sm font-medium">+52 489 125 1458</span>
        </a>
      </div>

      <div className="max-w-3xl mx-auto px-6">
        {/* Resumen del paquete */}
        <div className="bg-white border border-negro/8 p-5 mb-6 flex items-center gap-4">
          {paquete.imagen && <img src={paquete.imagen} alt={paquete.nombre} className="w-20 h-20 object-cover flex-shrink-0" loading="lazy" />}
          <div className="flex-1 min-w-0">
            <p className="text-[9px] tracking-[2px] uppercase text-verde-selva/70 font-dm mb-1">{paquete.duracion}</p>
            <h1 className="font-cormorant text-verde-profundo text-xl leading-snug">{paquete.nombre}</h1>
            <p className="font-dm text-sm text-negro/50 mt-1">{fmx(paquete.precio)} MXN <span className="text-negro/40">{paquete.precioLabel}</span></p>
          </div>
        </div>

        {stage === "done" ? (
          <div className="bg-white border border-verde-selva/30 p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-verde-selva/10 flex items-center justify-center mx-auto mb-4">
              <Check className="w-7 h-7 text-verde-selva" />
            </div>
            <h2 className="font-cormorant text-verde-profundo text-2xl mb-2">¡Reserva confirmada!</h2>
            <p className="font-dm text-sm text-negro/60 mb-1">Tu confirmación es <strong className="text-negro">{confNum}</strong></p>
            <p className="font-dm text-sm text-negro/60 mb-6">Te enviamos los detalles por correo. {pendiente > 0 ? `Pagaste ${fmx(chargeAmt)} (${pct}%); el saldo de ${fmx(pendiente)} se cubre después.` : "Pagaste el 100%."} Te contactamos por WhatsApp para coordinar.</p>
            <Link href="/paquetes" className="text-verde-selva underline font-dm text-sm">Ver más paquetes</Link>
          </div>
        ) : stage === "pay" && clientSecret ? (
          <Elements stripe={stripePromise} options={stripeOptions}>
            <PayStage paquete={paquete} form={form} clientSecret={clientSecret} paymentIntentId={paymentIntentId} cobrado={cobrado}
              onDone={(cn: string) => { setConfNum(cn); setStage("done"); }} />
          </Elements>
        ) : (
          <div className="space-y-6">
            {/* Fecha + personas */}
            <section className="bg-white border border-negro/8 p-6">
              <h2 className="font-cormorant text-verde-profundo text-xl mb-5">Fecha y personas</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] tracking-[2px] uppercase text-negro/50 font-dm mb-1.5">Fecha tentativa de llegada</label>
                  <input type="date" value={fecha} min={minDate} onChange={(e) => setFecha(e.target.value)}
                    className="w-full border border-negro/20 bg-crema px-4 py-3 font-dm text-sm text-negro focus:outline-none focus:border-verde-selva transition-colors" />
                </div>
                <div>
                  <label className="block text-[10px] tracking-[2px] uppercase text-negro/50 font-dm mb-1.5">Número de personas</label>
                  <input type="number" min={1} max={30} value={personas} onChange={(e) => setPersonas(e.target.value)}
                    className="w-full border border-negro/20 bg-crema px-4 py-3 font-dm text-sm text-negro focus:outline-none focus:border-verde-selva transition-colors" />
                  <p className="mt-1.5 text-[10px] text-negro/40 font-dm">El precio es {paquete.precioLabel}. Si son más personas, ajustamos por WhatsApp.</p>
                </div>
              </div>
            </section>

            {/* Cuánto pagar */}
            <section className="bg-white border border-negro/8 p-6">
              <h2 className="font-cormorant text-verde-profundo text-xl mb-1">¿Cuánto quieres pagar hoy?</h2>
              <p className="font-dm text-xs text-negro/45 mb-5">Tú eliges. El resto se cubre antes o durante tu llegada.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {PCT_OPTIONS.map((o) => {
                  const active = pct === o.pct;
                  const amt = Math.round(paquete.precio * o.pct / 100);
                  return (
                    <button key={o.pct} type="button" onClick={() => setPct(o.pct)}
                      className={`text-left border p-4 transition-colors ${active ? "border-verde-selva bg-verde-selva/5" : "border-negro/15 hover:border-negro/30"}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${active ? "border-verde-selva" : "border-negro/25"}`}>
                          {active && <div className="w-2 h-2 rounded-full bg-verde-selva" />}
                        </div>
                        <span className="font-dm text-sm text-negro/85 font-medium">{o.pct}%</span>
                      </div>
                      <p className="font-cormorant text-dorado text-lg leading-none mb-1">{fmx(amt)}</p>
                      <p className="text-[10px] text-negro/45 font-dm">{o.sub}</p>
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 flex justify-between text-sm font-dm border-t border-negro/8 pt-4">
                <span className="text-negro/60">Pagas hoy ({pct}%)</span>
                <span className="font-cormorant text-xl text-dorado">{fmx(chargeAmt)} MXN</span>
              </div>
              {pendiente > 0 && (
                <div className="flex justify-between text-xs font-dm text-negro/45 mt-1">
                  <span>Saldo pendiente</span><span>{fmx(pendiente)} MXN</span>
                </div>
              )}
            </section>

            {/* Contacto */}
            <section className="bg-white border border-negro/8 p-6">
              <h2 className="font-cormorant text-verde-profundo text-xl mb-5">Datos de contacto</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] tracking-[2px] uppercase text-negro/50 font-dm mb-1.5">Nombre completo *</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Juan García"
                    className="w-full border border-negro/20 bg-crema px-4 py-3 font-dm text-sm text-negro focus:outline-none focus:border-verde-selva transition-colors" />
                </div>
                <div>
                  <label className="block text-[10px] tracking-[2px] uppercase text-negro/50 font-dm mb-1.5">Correo electrónico *</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="juan@correo.com"
                    className="w-full border border-negro/20 bg-crema px-4 py-3 font-dm text-sm text-negro focus:outline-none focus:border-verde-selva transition-colors" />
                  <p className="mt-1.5 text-xs text-negro/40 font-dm">La confirmación se envía a este correo</p>
                </div>
                <div>
                  <label className="block text-[10px] tracking-[2px] uppercase text-negro/50 font-dm mb-1.5">WhatsApp / Teléfono</label>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+52 489 123 4567"
                    className="w-full border border-negro/20 bg-crema px-4 py-3 font-dm text-sm text-negro focus:outline-none focus:border-verde-selva transition-colors" />
                </div>
                {showNotes ? (
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Preferencias de habitación, alergias, necesidades especiales..."
                    className="w-full border border-negro/20 bg-crema px-4 py-3 font-dm text-sm text-negro focus:outline-none focus:border-verde-selva transition-colors resize-none" />
                ) : (
                  <button type="button" onClick={() => setShowNotes(true)} className="text-xs font-dm text-verde-selva hover:text-verde-vivo underline underline-offset-2">
                    + Agregar una nota
                  </button>
                )}
              </div>
            </section>

            {error && <div className="bg-terracota/10 border border-terracota/30 px-4 py-3"><p className="text-terracota font-dm text-sm">{error}</p></div>}

            <button onClick={goToPay} disabled={loading}
              className="w-full bg-verde-selva text-crema py-4 text-sm tracking-[2px] uppercase font-dm hover:bg-verde-vivo transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? "Preparando pago seguro..." : <><Lock className="w-3.5 h-3.5" />{`Continuar — pagar ${fmx(chargeAmt)} MXN`}</>}
            </button>
            <div className="flex items-center justify-center gap-2 text-xs font-dm text-negro/40">
              <CalendarCheck className="w-4 h-4 text-verde-selva" /> Cancelación flexible · Te contactamos para coordinar fechas
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
