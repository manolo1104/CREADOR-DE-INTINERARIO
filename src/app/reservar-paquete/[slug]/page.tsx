"use client";

import { useState, useMemo, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { getPaquete, HABITACIONES } from "@/lib/paquetes";
import { computePaqueteCharge, toursDelPaquete, MAX_PERSONAS_PAQUETE } from "@/lib/paquetePricing";
import { waLink } from "@/lib/whatsapp";
import { ResumenReserva } from "@/components/booking/ResumenReserva";
import { minBookingDate } from "@/lib/tourBooking";
import { HABITACIONES_HOTEL, SERVICIOS_HOTEL } from "@/lib/habitaciones";
import { ChevronLeft, Lock, ShieldCheck, MessageCircle, Check, CalendarCheck, Clock, MapPin, Hotel } from "lucide-react";

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
  const [personas, setPersonas] = useState(2);            // adultos
  const [childrenMid,   setChildrenMid]   = useState(0);  // 6–10 años → 70 %
  const [childrenSmall, setChildrenSmall] = useState(0);  // menores de 6 → 50 %
  const [vistaMontana,  setVistaMontana]  = useState(false);
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

  // Restaurar desde el link del correo de recuperación (?recuperar=<token>),
  // igual que hace la reserva de un tour suelto.
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("recuperar");
    if (!token) return;
    fetch(`/api/tours/carrito/${token}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((c) => {
        if (!c || c.error) return;
        if (c.tourDate) setFecha(c.tourDate);
        if (typeof c.adults === "number" && c.adults >= 2) setPersonas(c.adults);
        if (typeof c.childrenMid === "number") setChildrenMid(c.childrenMid);
        if (typeof c.childrenSmall === "number") setChildrenSmall(c.childrenSmall);
        if (c.email) setEmail(c.email);
      })
      .catch(() => {});
  }, []);

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

  // El precio ya NO es fijo: el publicado cubre a dos personas, y cada persona
  // extra suma hotel y boletos de tour. Se usa la MISMA función que el servidor
  // (`computePaqueteCharge`), así lo que se ve es lo que se cobra.
  const cotizacion = computePaqueteCharge({ slug: paquete.slug, personas, childrenMid, childrenSmall, vistaMontana, pct });
  const totalReal  = cotizacion?.total  ?? paquete.precio;
  const chargeAmt  = cotizacion?.charge ?? Math.round(paquete.precio * pct / 100);
  const pendiente  = totalReal - chargeAmt;
  const toursIncluidos = toursDelPaquete(paquete);

  async function goToPay() {
    setError("");
    if (!name.trim() || !email.trim()) { setError("Nombre y correo son obligatorios."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError("El correo no tiene un formato válido."); return; }
    setLoading(true);

    // Rescate: ya tenemos nombre y correo pero todavía no ha pagado. Va sin
    // await para no retrasarle el pago, y su fallo nunca lo bloquea.
    fetch("/api/paquetes/guardar-carrito", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim(), phone: phone.trim(), slug: paquete!.slug,
        personas, childrenMid, childrenSmall, vistaMontana, fecha,
      }),
    }).catch(() => {});

    try {
      const res = await fetch("/api/paquetes/create-payment-intent", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerEmail: email.trim(), customerName: name.trim(),
          paqueteDetails: { slug: paquete!.slug, pct, personas, childrenMid, childrenSmall, vistaMontana, fecha },
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

  const form = { name: name.trim(), email: email.trim(), phone: phone.trim(), notes: notes.trim(), pct, personas, childrenMid, childrenSmall, vistaMontana, fecha };

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
                  <label className="block text-[10px] tracking-[2px] uppercase text-negro/50 font-dm mb-1.5">Fecha de inicio del tour</label>
                  <input type="date" value={fecha} min={minDate} onChange={(e) => setFecha(e.target.value)}
                    className="w-full border border-negro/20 bg-crema px-4 py-3 font-dm text-sm text-negro focus:outline-none focus:border-verde-selva transition-colors" />
                  <p className="mt-1.5 text-[11px] text-negro/50 font-dm">
                    Salimos a las <strong className="text-negro/75">8:30 AM aprox.</strong> del primer día. Pasamos por ti a tu hospedaje.
                  </p>
                </div>
                <div>
                  <label className="block text-[10px] tracking-[2px] uppercase text-negro/50 font-dm mb-1.5">Número de personas</label>
                  <div className="flex items-center gap-3">
                    <button type="button" aria-label="Menos personas"
                      onClick={() => setPersonas((n) => Math.max(2, n - 1))}
                      className="w-11 h-11 border border-negro/20 text-negro/60 hover:border-verde-selva transition-colors">−</button>
                    <span className="font-dm text-lg text-negro/85 w-8 text-center">{personas}</span>
                    <button type="button" aria-label="Más personas"
                      onClick={() => setPersonas((n) => Math.min(MAX_PERSONAS_PAQUETE, n + 1))}
                      className="w-11 h-11 border border-negro/20 text-negro/60 hover:border-verde-selva transition-colors">+</button>
                  </div>
                  {/* El desglose se enseña siempre que haya extras: si el precio
                      sube, el cliente tiene que ver POR QUÉ sube. */}
                  {cotizacion && personas > 2 ? (
                    <div className="mt-3 border-t border-negro/8 pt-3 space-y-1">
                      <p className="flex justify-between font-dm text-[12px] text-negro/55">
                        <span>Paquete base (2 personas)</span><span>{fmx(cotizacion.base)}</span>
                      </p>
                      {cotizacion.extraHotel > 0 && (
                        <p className="flex justify-between font-dm text-[12px] text-negro/55">
                          <span>Hotel por {personas - 2} persona{personas - 2 > 1 ? "s" : ""} más · {cotizacion.habitaciones} habitación{cotizacion.habitaciones > 1 ? "es" : ""}</span>
                          <span>+{fmx(cotizacion.extraHotel)}</span>
                        </p>
                      )}
                      <p className="flex justify-between font-dm text-[12px] text-negro/55">
                        <span>Tours por {personas - 2} persona{personas - 2 > 1 ? "s" : ""} más</span>
                        <span>+{fmx(cotizacion.extraTours)}</span>
                      </p>
                      <p className="flex justify-between font-dm text-[13px] text-negro/85 font-medium pt-1">
                        <span>Total del viaje</span><span>{fmx(cotizacion.total)} MXN</span>
                      </p>
                    </div>
                  ) : (
                    <p className="mt-1.5 text-[10px] text-negro/40 font-dm">
                      El precio publicado cubre a 2 personas. Cada persona más suma su hotel y sus tours, y lo verás desglosado aquí.
                    </p>
                  )}
                  {/* Menores, con la misma escala que los tours sueltos. */}
                  <div className="mt-4 space-y-2.5 border-t border-negro/8 pt-3">
                    {[
                      { label: "Niños 6–10 años", nota: "70 % del tour", v: childrenMid,   set: setChildrenMid },
                      { label: "Menores de 6",    nota: "50 % del tour", v: childrenSmall, set: setChildrenSmall },
                    ].map((c) => (
                      <div key={c.label} className="flex items-center justify-between">
                        <span className="font-dm text-[12px] text-negro/65">
                          {c.label} <span className="text-negro/35">· {c.nota}</span>
                        </span>
                        <span className="flex items-center gap-2">
                          <button type="button" aria-label={`Menos ${c.label}`}
                            onClick={() => c.set((n: number) => Math.max(0, n - 1))}
                            className="w-8 h-8 border border-negro/20 text-negro/60 hover:border-verde-selva">−</button>
                          <span className="font-dm text-sm text-negro/80 w-5 text-center">{c.v}</span>
                          <button type="button" aria-label={`Más ${c.label}`}
                            onClick={() => c.set((n: number) => n + 1)}
                            className="w-8 h-8 border border-negro/20 text-negro/60 hover:border-verde-selva">+</button>
                        </span>
                      </div>
                    ))}
                    <p className="font-dm text-[10px] text-negro/35 leading-snug">
                      Los bebés menores de 3 no pagan tour. Los menores sí ocupan lugar en la habitación.
                    </p>
                  </div>

                  {personas >= MAX_PERSONAS_PAQUETE && (
                    <p className="mt-2 text-[11px] font-dm text-negro/55">
                      ¿Son más de {MAX_PERSONAS_PAQUETE}?{" "}
                      <a href={waLink(`Hola, somos ${personas + 1} personas y queremos el ${paquete.nombre}. ¿Nos lo cotizan?`)}
                         target="_blank" rel="noopener noreferrer"
                         className="text-verde-selva underline underline-offset-2">Lo cotizamos por WhatsApp</a>.
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* Qué incluye este viaje — antes el checkout de paquetes no decía
                NADA: ni itinerario, ni horario, ni qué va incluido. El cliente
                soltaba miles de pesos a ciegas. */}
            <section className="bg-white border border-negro/8 p-6">
              <h2 className="font-cormorant text-verde-profundo text-xl mb-1">Tu viaje, día por día</h2>
              <p className="font-dm text-xs text-negro/45 mb-5">{paquete.duracion} · {paquete.precioLabel}</p>

              <ol className="space-y-3 mb-6">
                {paquete.itinerario.map((dia, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex-shrink-0 w-7 h-7 border border-verde-selva/30 bg-verde-selva/5 flex items-center justify-center font-cormorant text-verde-selva text-sm">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-dm text-[13px] text-negro/85 leading-snug">{dia.titulo}</p>
                      <p className="font-dm text-[12px] text-negro/50 leading-snug mt-0.5">{dia.descripcion}</p>
                    </div>
                  </li>
                ))}
              </ol>

              <div className="border-t border-negro/8 pt-4 space-y-2.5">
                <p className="flex items-start gap-2.5 font-dm text-[12px] text-negro/65">
                  <Clock className="w-4 h-4 text-verde-selva flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <span>Salimos a las <strong className="text-negro/85">8:30 AM aprox.</strong> cada día de tour.</span>
                </p>
                <p className="flex items-start gap-2.5 font-dm text-[12px] text-negro/65">
                  <MapPin className="w-4 h-4 text-verde-selva flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <span>Pasamos por ti a tu hospedaje en <strong className="text-negro/85">Xilitla o Ciudad Valles</strong> y te regresamos al terminar.</span>
                </p>
                <p className="flex items-start gap-2.5 font-dm text-[12px] text-negro/65">
                  <Hotel className="w-4 h-4 text-verde-selva flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{paquete.noches} noche{paquete.noches > 1 ? "s" : ""} en el Hotel Paraíso Encantado, en Xilitla.</span>
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 mt-5 pt-4 border-t border-negro/8">
                <p className="sm:col-span-2 text-[10px] tracking-[2px] uppercase text-negro/40 font-dm mb-1">Incluido</p>
                {paquete.incluye.map((x) => (
                  <p key={x} className="flex items-start gap-2 font-dm text-[12px] text-negro/60">
                    <Check className="w-3.5 h-3.5 text-verde-selva flex-shrink-0 mt-0.5" aria-hidden="true" />
                    {x}
                  </p>
                ))}
              </div>

              {paquete.noIncluye.length > 0 && (
                <div className="mt-5 pt-4 border-t border-negro/8">
                  <p className="text-[10px] tracking-[2px] uppercase text-negro/40 font-dm mb-2">No incluido</p>
                  {paquete.noIncluye.map((x) => (
                    <p key={x} className="font-dm text-[12px] text-negro/45 leading-snug">· {x}</p>
                  ))}
                </div>
              )}

              {toursIncluidos.length > 0 && (
                <p className="mt-5 pt-4 border-t border-negro/8 font-dm text-[11px] text-negro/45">
                  Cada persona adicional suma {fmx(toursIncluidos.reduce((a, t) => a + t.precio, 0))} de tours
                  ({toursIncluidos.map((t) => t.nombre.split("—")[0].trim()).join(", ")}).
                </p>
              )}
            </section>

            {/* Habitación */}
            <section className="bg-white border border-negro/8 p-6">
              <h2 className="font-cormorant text-verde-profundo text-xl mb-1">Tu habitación</h2>
              <p className="font-dm text-xs text-negro/45 mb-5">
                {paquete.noches} noche{paquete.noches > 1 ? "s" : ""} en el Hotel Paraíso Encantado, en Xilitla.
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  { m: false, t: "Vista a la selva", s: "Incluida en el precio del paquete." },
                  { m: true,  t: "Vista a la montaña", s: "Para despertar con el paisaje de la sierra." },
                ].map((o) => {
                  const activa = vistaMontana === o.m;
                  // La diferencia se calcula con las tarifas reales, así que
                  // sube según cuánta gente duerma en la habitación.
                  const dif = o.m && cotizacion
                    ? (computePaqueteCharge({ slug: paquete.slug, personas, childrenMid, childrenSmall, vistaMontana: true, pct })?.total ?? 0)
                      - (computePaqueteCharge({ slug: paquete.slug, personas, childrenMid, childrenSmall, vistaMontana: false, pct })?.total ?? 0)
                    : 0;
                  return (
                    <button key={o.t} type="button" onClick={() => setVistaMontana(o.m)}
                      className={`text-left border p-4 transition-colors ${activa ? "border-verde-selva bg-verde-selva/5" : "border-negro/15 hover:border-negro/30"}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${activa ? "border-verde-selva" : "border-negro/25"}`}>
                          {activa && <span className="w-2 h-2 rounded-full bg-verde-selva" />}
                        </span>
                        <span className="font-dm text-sm text-negro/85 font-medium">{o.t}</span>
                      </div>
                      <p className="font-dm text-[11px] text-negro/50 leading-snug">{o.s}</p>
                      {o.m && dif > 0 && (
                        <p className="font-dm text-[12px] text-dorado mt-1.5">+{fmx(dif)} MXN por las {paquete.noches} noches</p>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Cuáles son esas habitaciones, de verdad.
                Antes esto era una sola línea de texto ("Orquídeas, Bromelias o
                Lirios") y el cliente estaba apartando tres o cuatro noches sin
                haber visto un cuarto, sin saber cuánta gente cabe ni qué tiene.
                Los datos salen de `HABITACIONES_HOTEL`, que es la copia del
                sistema del hotel — las mismas que vende el carrito. */}
              {(() => {
                // ⚠️ Solo las que el PAQUETE ofrece (`HABITACIONES` de paquetes.ts),
                // no el inventario entero del hotel: el carrito vende las nueve
                // habitaciones, pero el paquete tiene su propia lista —Helechos y
                // las suites cuestan bastante más por noche y no entran en el
                // precio publicado—. La ficha (fotos, cupo, características) se
                // toma de la copia del sistema del hotel, cruzando por id.
                const grupo = HABITACIONES_HOTEL.filter(
                  (h) => HABITACIONES.some((p) => p.id === h.id) && h.vistaMontana === vistaMontana,
                );
                if (grupo.length === 0) return null;
                return (
                  <div className="mt-5 pt-5 border-t border-negro/8">
                    <p className="font-dm text-[11px] tracking-[1.5px] uppercase text-negro/40 mb-3">
                      {grupo.length === 1 ? "La habitación" : `Te asignamos una de estas ${grupo.length}`}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {grupo.map((h) => (
                        <div key={h.id} className="border border-negro/10 overflow-hidden">
                          <div className="relative aspect-[4/3] bg-negro/5">
                            <Image src={h.imagen} alt={h.nombre} fill className="object-cover" sizes="(max-width:640px) 45vw, 200px" />
                          </div>
                          <div className="p-2.5">
                            <p className="font-dm text-[12px] text-negro/85 leading-tight">{h.nombre}</p>
                            <p className="font-dm text-[11px] text-negro/45 leading-snug mt-0.5">
                              Hasta {h.maxHuespedes} persona{h.maxHuespedes > 1 ? "s" : ""} · {h.vista}
                            </p>
                            <p className="font-dm text-[10px] text-negro/40 leading-snug mt-1">
                              {h.caracteristicas.slice(0, 3).join(" · ")}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="font-dm text-[11px] text-negro/45 mt-3">
                      La habitación exacta se confirma por WhatsApp según disponibilidad de tus fechas.
                      {personas > 2 && " Si no caben todos en una, agregamos las que hagan falta y lo verás en el precio."}
                    </p>
                  </div>
                );
              })()}
            </section>

            {/* El hotel: las dudas de siempre —dónde está, si hay alberca, si hay
              estacionamiento— resueltas antes de pedirle la tarjeta, no después
              por WhatsApp. */}
            <section className="bg-white border border-negro/8 p-6">
              <h2 className="font-cormorant text-verde-profundo text-xl mb-1">El hotel</h2>
              <p className="font-dm text-xs text-negro/45 mb-4">
                Hotel Paraíso Encantado, en Xilitla. Es nuestro, así que el hospedaje y los
                recorridos los coordina el mismo equipo.
              </p>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-2">
                {SERVICIOS_HOTEL.map((s) => (
                  <li key={s} className="flex items-start gap-2 font-dm text-[12px] text-negro/70">
                    <Check className="w-3.5 h-3.5 text-verde-selva flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <span className="leading-snug">{s}</span>
                  </li>
                ))}
              </ul>
              <p className="font-dm text-[11px] text-negro/45 mt-4 pt-4 border-t border-negro/8">
                No tienes que hospedarte aquí para hacer los tours, pero en este paquete el
                hotel va incluido. Pasamos por ti en la puerta cada mañana.
              </p>
            </section>

            {/* Resumen antes de pedir los datos: el cliente confirma qué está
                comprando —fechas, gente, habitación, itinerario y precio—
                antes de teclear nada suyo. */}
            {cotizacion && (
              <ResumenReserva
                items={[{
                  nombre:  paquete.nombre,
                  fecha,
                  detalle: [
                    `${personas} adulto${personas > 1 ? "s" : ""}`,
                    childrenMid   ? `${childrenMid} niño${childrenMid > 1 ? "s" : ""} 6–10` : "",
                    childrenSmall ? `${childrenSmall} menor${childrenSmall > 1 ? "es" : ""} de 6` : "",
                    `${paquete.dias} días / ${paquete.noches} noches`,
                    vistaMontana ? "Habitación Jungla" : "Habitación vista a la selva",
                  ].filter(Boolean).join(" · "),
                  subtotal: cotizacion.total,
                  incluye:  paquete.incluye,
                }]}
                total={cotizacion.total}
                pagaHoy={cotizacion.charge}
                saldo={cotizacion.saldo}
                pct={pct}
              />
            )}

            {/* Cuánto pagar */}
            <section className="bg-white border border-negro/8 p-6">
              <h2 className="font-cormorant text-verde-profundo text-xl mb-1">¿Cuánto quieres pagar hoy?</h2>
              <p className="font-dm text-xs text-negro/45 mb-5">Tú eliges. El resto se cubre antes o durante tu llegada.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {PCT_OPTIONS.map((o) => {
                  const active = pct === o.pct;
                  const amt = Math.round(totalReal * o.pct / 100);
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
