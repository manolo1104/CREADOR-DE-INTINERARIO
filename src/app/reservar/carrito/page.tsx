"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { ChevronLeft, Lock, Trash2, MapPin, Clock, ShieldCheck, Star, Users } from "lucide-react";
import {
  leerCarrito, quitarDelCarrito, vaciarCarrito, resumirCarrito,
  actualizarItem, personasDeItem, type CarritoItem,
} from "@/lib/carrito";
import { formatMXN, formatTourDate, minBookingDate, calcTourTotal } from "@/lib/tourBooking";
import { TOURS_DB, INCLUYE_SIEMPRE } from "@/lib/tours";
import { TOUR_REVIEWS, GOOGLE_MAPS_REVIEWS_URL } from "@/lib/tourReviews";
import { trackTourEvent, sessionId } from "@/lib/tourTracker";
import { trackPurchase } from "@/lib/analytics";

/**
 * Las dudas que de verdad frenan el pago. Todas las respuestas salen de lo que
 * el sitio ya afirma (política de cancelación, fichas de tour): aquí no se
 * inventa ninguna condición nueva.
 */
const FAQ_CARRITO = [
  {
    q: "¿Cuánto pago hoy y cuándo el resto?",
    a: "Hoy apartas con el 30 % del total. El saldo lo liquidas el día del primer recorrido, en efectivo o con tarjeta, al llegar.",
  },
  {
    q: "¿Puedo cancelar?",
    a: "Sí. Cancelación gratuita hasta 48 horas antes, con reembolso completo y sin preguntas.",
  },
  {
    q: "¿De dónde salimos y a qué hora?",
    a: "No hay un punto de salida único: pasamos por ti a tu hospedaje —hotel, hostal, cabaña o Airbnb— en Xilitla o en Ciudad Valles, y te regresamos al terminar. Salimos entre las 8:00 y las 9:00 AM, y la hora exacta de tu recogida la confirmamos por WhatsApp al reservar.",
  },
  {
    q: "¿Necesito hospedarme con ustedes?",
    a: "No. Pasamos por ti donde te estés quedando, sea nuestro hotel o cualquier otro.",
  },
  {
    q: "¿Qué pasa si llueve?",
    a: "Operamos con lluvia ligera. Si hay tormenta eléctrica, reprogramamos sin costo.",
  },
  {
    q: "¿Puedo pagar varios recorridos juntos?",
    a: "Es justo lo que hace este carrito: apartas todos tus días con un solo pago y un solo folio, en vez de reservar uno por uno.",
  },
] as const;

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
  "pk_live_51SuFNKPRwYk9rOzoUc56CjtGJ2VdnUkHvRNlP6N6EXX2PHdemLg0oHcOhXTUyv1jl1XHKvxcMfoIJErQSBBp4ojT00UPdWzcaR"
);

interface Cobro {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  total: number;
  saldo: number;
  lineItems: { tourName: string; tourDate: string; adults: number; children: number; subtotal: number }[];
}

// ── Formulario de pago ───────────────────────────────────────────────────────

function PagoCarrito({ cobro, datos, onListo }: {
  cobro: Cobro;
  datos: { name: string; email: string; phone: string; pickup: string };
  onListo: () => void;
}) {
  const stripe   = useStripe();
  const elements = useElements();
  const router   = useRouter();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setError("");

    const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        payment_method_data: { billing_details: { name: datos.name, email: datos.email } },
        return_url: `${window.location.origin}/reservar-tour/confirmacion`,
      },
      redirect: "if_required",
    });

    if (stripeError) {
      trackTourEvent("PAGO_FALLIDO", {
        carrito: true, amount: cobro.amount,
        code: stripeError.code, decline_code: stripeError.decline_code,
        message: stripeError.message, paymentIntentId: cobro.paymentIntentId,
      });
      setError(stripeError.message || "Error al procesar el pago. Intenta de nuevo.");
      setLoading(false);
      return;
    }

    if (paymentIntent?.status === "processing") {
      trackTourEvent("PAGO_EN_PROCESO", { carrito: true, amount: cobro.amount, paymentIntentId: cobro.paymentIntentId });
      setError("Tu pago está en proceso. En cuanto el banco lo confirme te llega el correo.");
      setLoading(false);
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      const primero = cobro.lineItems[0];
      const resumen = `${cobro.lineItems.length} recorridos`;
      try {
        await fetch("/api/tours/send-confirmation", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email:         datos.email,
            customerName:  datos.name,
            customerPhone: datos.phone || null,
            notes: [
              datos.pickup.trim() ? `Recogida: ${datos.pickup.trim()}` : null,
              `Reserva de ${cobro.lineItems.length} recorridos en un solo pago.`,
            ].filter(Boolean).join(" | "),
            totalAmount:     cobro.amount,
            paymentIntentId: cobro.paymentIntentId,
            tourName:        resumen,
            tourDate:        primero.tourDate,
            adults:          cobro.lineItems.reduce((s, l) => s + l.adults, 0),
            children:        cobro.lineItems.reduce((s, l) => s + l.children, 0),
            lineItems:       cobro.lineItems,
          }),
        });
      } catch {
        // Si el correo falla, el pago YA se hizo. El webhook de Stripe levanta
        // la reserva igual, así que no se le dice al cliente que falló nada.
      }

      trackPurchase({
        confirmationNumber: cobro.paymentIntentId,
        tourId:   primero.tourName,
        tourName: resumen,
        total:    cobro.amount,
        adults:   cobro.lineItems.reduce((s, l) => s + l.adults, 0),
        children: cobro.lineItems.reduce((s, l) => s + l.children, 0),
      });
      trackTourEvent("BOOKING_CONFIRMED", { carrito: true, amount: cobro.amount, total: cobro.total });

      sessionStorage.setItem("hp_tour_confirmation", JSON.stringify({
        tourName: resumen, tourDate: primero.tourDate,
        total: cobro.total, charged: cobro.amount, saldo: cobro.saldo,
        email: datos.email, name: datos.name,
      }));
      vaciarCarrito();
      onListo();
      router.push("/reservar-tour/confirmacion");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement options={{ layout: "tabs" }} />
      {error && <p className="text-sm font-dm text-terracota bg-terracota/10 border border-terracota/30 p-3">{error}</p>}
      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full bg-verde-selva text-crema py-4 text-sm tracking-[2px] uppercase font-dm hover:bg-verde-vivo transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
      >
        <Lock className="w-3.5 h-3.5" />
        {loading ? "Procesando…" : `Pagar ${formatMXN(cobro.amount)} MXN`}
      </button>
      <p className="text-center text-[11px] font-dm text-negro/45">
        Pago cifrado con Stripe · El saldo de {formatMXN(cobro.saldo)} lo liquidas el día del primer recorrido
      </p>
    </form>
  );
}

// ── Página ───────────────────────────────────────────────────────────────────

export default function CarritoPage() {
  const [items, setItems]   = useState<CarritoItem[]>([]);
  const [montado, setMontado] = useState(false);
  const [name,   setName]   = useState("");
  const [email,  setEmail]  = useState("");
  const [phone,  setPhone]  = useState("");
  const [pickup, setPickup] = useState("");
  const [cobro,  setCobro]  = useState<Cobro | null>(null);
  const [error,  setError]  = useState("");
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    setMontado(true);
    setItems(leerCarrito());
  }, []);

  const minDate = minBookingDate();
  // Testimonios de los recorridos que ESTA persona lleva en el carrito: una
  // reseña del tour que ya eligió pesa más que una genérica.
  const resenas = Array.from(
    new Map(
      items
        .flatMap((i) => TOUR_REVIEWS[(TOURS_DB.find((t) => t.slug === i.tourSlug)?.id ?? "") as keyof typeof TOUR_REVIEWS] ?? [])
        .map((r) => [r.nombre + r.texto.slice(0, 12), r] as const),
    ).values(),
  ).slice(0, 3);
  const { total, anticipo, saldo, dias } = resumirCarrito(items);

  function quitar(uid: string) {
    setItems(quitarDelCarrito(uid));
    // Si se vacía el carrito a media captura, el cobro creado deja de valer.
    setCobro(null);
  }

  function cambiar(uid: string, cambios: Partial<CarritoItem>) {
    setItems(actualizarItem(uid, cambios));
    setCobro(null); // cualquier cambio invalida el importe ya calculado
  }

  /** Suma o resta gente y vuelve a calcular el subtotal que se muestra. */
  function cambiarPersonas(i: CarritoItem, delta: number) {
    const tour = TOURS_DB.find((t) => t.slug === i.tourSlug);
    if (!tour) return;
    const adultos = Math.min(
      tour.groupMax - i.childrenMid - i.childrenSmall,
      Math.max(tour.groupMin, i.adults + delta),
    );
    const { total } = calcTourTotal(tour.precio, adultos, i.childrenMid, i.childrenSmall, 0);
    cambiar(i.uid, { adults: adultos, total });
  }

  // Sin fecha no se puede cobrar: el servidor la valida, pero es mejor decirlo
  // aquí que dejar que el pago falle con un error genérico.
  const sinFecha = items.filter((i) => !i.tourDate).length;

  async function irAlPago() {
    if (sinFecha > 0) {
      setError(`Falta la fecha de ${sinFecha} ${sinFecha === 1 ? "recorrido" : "recorridos"}.`);
      return;
    }
    if (!name.trim() || !email.trim()) {
      setError("Necesitamos tu nombre y tu correo para mandarte la confirmación.");
      return;
    }
    setCargando(true);
    setError("");
    try {
      const res = await fetch("/api/tours/carrito-payment-intent", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName:  name.trim(),
          customerEmail: email.trim(),
          sid:           sessionId(),
          items,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo iniciar el pago.");
        setCargando(false);
        return;
      }
      setCobro(data);
    } catch {
      setError("No se pudo conectar. Revisa tu internet e intenta de nuevo.");
    }
    setCargando(false);
  }

  if (!montado) return <main className="min-h-screen bg-crema pt-32" />;

  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-crema pt-32 pb-20 px-6">
        <div className="max-w-lg mx-auto text-center">
          <h1 className="font-cormorant font-light text-verde-profundo text-3xl mb-4">Tu carrito está vacío</h1>
          <p className="font-dm text-negro/55 text-sm mb-8">
            Elige tus recorridos y agrégalos aquí: puedes apartar varios días en un solo pago.
          </p>
          <Link href="/reservar" className="inline-block bg-verde-selva text-crema px-8 py-4 text-[11px] tracking-[2px] uppercase font-dm hover:bg-verde-vivo transition-colors">
            Ver los recorridos
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-crema pt-24 pb-20">
      <div className="max-w-5xl mx-auto px-6 mb-8">
        <Link href="/reservar" className="inline-flex items-center gap-1.5 text-negro/50 hover:text-verde-selva text-xs font-dm tracking-[1px] uppercase transition-colors">
          <ChevronLeft className="w-3 h-3" />
          Seguir eligiendo recorridos
        </Link>
      </div>

      <div className="max-w-5xl mx-auto px-6 grid lg:grid-cols-[1fr_380px] gap-10 items-start">

        {/* ── Renglones ── */}
        <div>
          <h1 className="font-cormorant font-light text-verde-profundo text-3xl mb-1">Tu viaje</h1>
          <p className="font-dm text-negro/50 text-sm mb-6">
            {items.length} {items.length === 1 ? "recorrido" : "recorridos"} · {dias} {dias === 1 ? "día" : "días"}
          </p>

          <div className="space-y-3">
            {items.map((i) => (
              <div key={i.uid} className="flex gap-4 border border-negro/10 bg-white p-4">
                <div className="relative w-24 h-20 flex-shrink-0 overflow-hidden">
                  <Image src={i.tourImage} alt={i.tourName} fill className="object-cover" sizes="96px" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-cormorant text-verde-profundo text-lg leading-tight">
                    {i.tourName.split("—")[0].trim()}
                  </p>

                  {/* La fecha se edita AQUÍ: los recorridos que se agregan desde
                      el catálogo llegan sin ella, y sin esto el carrito no se
                      podría pagar nunca. */}
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    <input
                      type="date"
                      value={i.tourDate}
                      min={minDate}
                      onChange={(e) => cambiar(i.uid, { tourDate: e.target.value })}
                      aria-label={`Fecha de ${i.tourName}`}
                      className={`border px-2 py-1.5 font-dm text-[12px] bg-white transition-colors ${
                        i.tourDate ? "border-negro/15 text-negro/70" : "border-terracota/60 text-terracota"
                      }`}
                    />
                    {i.unidades ? (
                      <span className="font-dm text-[12px] text-negro/50">
                        {i.ruta} · {i.unidades} × {i.vehiculo}
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <button type="button" aria-label="Menos personas"
                          onClick={() => cambiarPersonas(i, -1)}
                          className="w-7 h-7 border border-negro/20 text-negro/60 hover:border-verde-selva text-sm">−</button>
                        <span className="font-dm text-[12px] text-negro/70 w-14 text-center">
                          {personasDeItem(i)} {personasDeItem(i) === 1 ? "persona" : "personas"}
                        </span>
                        <button type="button" aria-label="Más personas"
                          onClick={() => cambiarPersonas(i, 1)}
                          className="w-7 h-7 border border-negro/20 text-negro/60 hover:border-verde-selva text-sm">+</button>
                      </span>
                    )}
                  </div>

                  {!i.tourDate && (
                    <p className="font-dm text-[11px] text-terracota mt-1">Elige la fecha de este recorrido</p>
                  )}

                  {/* Qué se visita y qué incluye, sin salir del carrito. Va
                      plegado para que la lista siga siendo escaneable: quien
                      lleva cuatro recorridos no quiere cuatro fichas abiertas. */}
                  {(() => {
                    const t = TOURS_DB.find((x) => x.slug === i.tourSlug);
                    if (!t) return null;
                    return (
                      <details className="mt-2 group">
                        <summary className="cursor-pointer list-none font-dm text-[11px] text-verde-selva hover:text-verde-vivo transition-colors">
                          Qué incluye y qué se visita
                          <span className="ml-1 inline-block transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                        </summary>
                        <div className="mt-2.5 space-y-2.5 border-l-2 border-verde-selva/20 pl-3">
                          <p className="font-dm text-[12px] text-negro/55 leading-snug">{t.descripcion}</p>
                          {t.destinos?.length > 0 && (
                            <div>
                              <p className="font-dm text-[10px] tracking-[1.5px] uppercase text-negro/35 mb-1">Se visita</p>
                              {t.destinos.map((d) => (
                                <p key={d} className="font-dm text-[12px] text-negro/60 leading-snug">· {d}</p>
                              ))}
                            </div>
                          )}
                          <div>
                            <p className="font-dm text-[10px] tracking-[1.5px] uppercase text-negro/35 mb-1">Incluye</p>
                            {[...t.incluye, ...INCLUYE_SIEMPRE].map((x) => (
                              <p key={x} className="font-dm text-[12px] text-negro/60 leading-snug">✓ {x}</p>
                            ))}
                          </div>
                          <p className="font-dm text-[11px] text-negro/40">
                            {t.duracion_hrs} horas aprox. · grupo de {t.groupMin > 1 ? `${t.groupMin} a ` : "hasta "}{t.groupMax} personas
                          </p>
                        </div>
                      </details>
                    );
                  })()}
                </div>
                <div className="text-right flex-shrink-0 flex flex-col justify-between">
                  <span className="font-cormorant text-dorado text-xl">{formatMXN(i.total)}</span>
                  <button
                    onClick={() => quitar(i.uid)}
                    aria-label={`Quitar ${i.tourName}`}
                    className="text-negro/30 hover:text-terracota transition-colors self-end"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Logística: la duda que más frena en el momento de pagar */}
          <div className="mt-6 border border-verde-selva/25 bg-verde-selva/5 p-5 space-y-3">
            <p className="flex items-start gap-2.5 font-dm text-[13px] text-negro/70">
              <MapPin className="w-4 h-4 text-verde-selva flex-shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                <strong className="text-negro/85">Pasamos por ti a tu hospedaje</strong> —hotel, hostal,
                cabaña o Airbnb— en <strong className="text-negro/85">Xilitla o en Ciudad Valles</strong>, y
                te regresamos al terminar. No necesitas hospedarte con nosotros.
              </span>
            </p>
            <p className="flex items-start gap-2.5 font-dm text-[13px] text-negro/70">
              <Clock className="w-4 h-4 text-verde-selva flex-shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                <strong className="text-negro/85">Salimos entre 8:00 y 9:00 AM</strong>. La hora exacta de
                tu recogida te la confirmamos por WhatsApp al reservar.
              </span>
            </p>
            <p className="flex items-start gap-2.5 font-dm text-[13px] text-negro/70">
              <ShieldCheck className="w-4 h-4 text-verde-selva flex-shrink-0 mt-0.5" aria-hidden="true" />
              <span>Cancelación gratuita hasta 48 h antes, con reembolso completo.</span>
            </p>
          </div>

          {/* ── PRUEBA SOCIAL ──────────────────────────────────────────────
              Cifras reales y verificables: la calificación enlaza a las
              reseñas de Google, y los testimonios son de los recorridos que
              esta persona lleva en el carrito, no de cualquiera. */}
          <section className="mt-8 border border-negro/10 bg-white p-5">
            <a
              href={GOOGLE_MAPS_REVIEWS_URL}
              target="_blank" rel="noopener noreferrer"
              className="group inline-flex items-center gap-2.5 mb-4"
            >
              <span className="flex gap-0.5" aria-hidden="true">
                {[...Array(5)].map((_, k) => <Star key={k} className="w-3.5 h-3.5 fill-dorado text-dorado" />)}
              </span>
              <span className="font-dm text-[13px] text-negro/75">
                <strong className="text-negro">4.9</strong> · 492 reseñas en Google
              </span>
              <span className="font-dm text-[11px] text-negro/40 group-hover:text-verde-selva transition-colors">Verlas →</span>
            </a>
            <p className="flex items-center gap-2 font-dm text-[12px] text-negro/50 mb-4">
              <Users className="w-3.5 h-3.5 text-verde-selva" aria-hidden="true" />
              +10,000 viajeros desde 2019 · Premio Arival 2023 · Guías certificados NOM-09 SECTUR
            </p>

            {resenas.length > 0 && (
              <div className="space-y-3 border-t border-negro/8 pt-4">
                {resenas.map((r) => (
                  <div key={r.nombre + r.texto.slice(0, 12)} className="flex gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={r.foto} alt="" width={32} height={32} loading="lazy" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-dm text-[12px] text-negro/70 leading-snug">“{r.texto}”</p>
                      <p className="font-dm text-[11px] text-negro/40 mt-1">{r.nombre} · {r.ciudad}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── PREGUNTAS DE ÚLTIMO MINUTO ─────────────────────────────────
              Las dudas que frenan el pago. Todas las respuestas salen de lo que
              el sitio ya dice en la política de cancelación y en las fichas. */}
          <section className="mt-6">
            <h2 className="font-cormorant text-verde-profundo text-xl mb-3">Antes de pagar</h2>
            <div className="divide-y divide-negro/10 border-y border-negro/10">
              {FAQ_CARRITO.map((f) => (
                <details key={f.q} className="group py-3.5">
                  <summary className="flex items-start justify-between gap-4 cursor-pointer list-none font-dm text-[13px] text-negro/80">
                    <span>{f.q}</span>
                    <span className="text-verde-selva text-lg leading-none flex-shrink-0 transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                  </summary>
                  <p className="font-dm text-[12px] text-negro/55 leading-relaxed mt-2 pr-6">{f.a}</p>
                </details>
              ))}
            </div>
            <p className="font-dm text-[11px] text-negro/40 mt-3">
              ¿Te quedó otra duda?{" "}
              <a href="https://wa.me/524891251458?text=Hola%2C%20estoy%20por%20pagar%20mi%20carrito%20y%20tengo%20una%20pregunta."
                 target="_blank" rel="noopener noreferrer"
                 className="text-verde-selva underline underline-offset-2">Escríbenos por WhatsApp</a> antes de pagar.
            </p>
          </section>
        </div>

        {/* ── Resumen y pago ── */}
        <aside className="border border-negro/10 bg-white p-6 lg:sticky lg:top-24">
          <div className="space-y-2 pb-4 border-b border-negro/10">
            <p className="flex justify-between font-dm text-sm text-negro/60">
              <span>Total del viaje</span>
              <strong className="text-negro/85">{formatMXN(total)} MXN</strong>
            </p>
            <p className="flex justify-between font-dm text-sm text-negro/60">
              <span>Apartas hoy (30 %)</span>
              <strong className="text-verde-selva">{formatMXN(anticipo)} MXN</strong>
            </p>
            <p className="flex justify-between font-dm text-[12px] text-negro/45">
              <span>Saldo el día del primer recorrido</span>
              <span>{formatMXN(saldo)} MXN</span>
            </p>
          </div>

          {!cobro ? (
            <div className="pt-4 space-y-3">
              <input
                value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Nombre completo *"
                className="w-full border border-negro/15 px-3 py-3 font-dm text-sm focus:border-verde-selva outline-none"
              />
              <input
                value={email} onChange={(e) => setEmail(e.target.value)}
                type="email" placeholder="Correo electrónico *"
                className="w-full border border-negro/15 px-3 py-3 font-dm text-sm focus:border-verde-selva outline-none"
              />
              <input
                value={phone} onChange={(e) => setPhone(e.target.value)}
                type="tel" placeholder="WhatsApp (opcional)"
                className="w-full border border-negro/15 px-3 py-3 font-dm text-sm focus:border-verde-selva outline-none"
              />
              <input
                value={pickup} onChange={(e) => setPickup(e.target.value)}
                placeholder="¿Dónde te hospedas? (Xilitla o Cd. Valles)"
                className="w-full border border-negro/15 px-3 py-3 font-dm text-sm focus:border-verde-selva outline-none"
              />
              {error && <p className="text-sm font-dm text-terracota">{error}</p>}
              <button
                onClick={irAlPago}
                disabled={cargando}
                className="w-full bg-verde-selva text-crema py-4 text-sm tracking-[2px] uppercase font-dm hover:bg-verde-vivo transition-colors disabled:opacity-40"
              >
                {cargando ? "Un momento…" : "Continuar al pago →"}
              </button>
            </div>
          ) : (
            <div className="pt-4">
              <Elements stripe={stripePromise} options={{ clientSecret: cobro.clientSecret, locale: "es" }}>
                <PagoCarrito cobro={cobro} datos={{ name, email, phone, pickup }} onListo={() => setItems([])} />
              </Elements>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
