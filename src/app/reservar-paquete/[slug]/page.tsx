"use client";

import { useState, useMemo, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { getPaquete, HABITACIONES } from "@/lib/paquetes";
import { computePaqueteCharge, toursDelPaquete, MAX_PERSONAS_PAQUETE, MAX_POR_HABITACION, PCTS_PAQUETE, type PctPaquete } from "@/lib/paquetePricing";
import { waLink } from "@/lib/whatsapp";
import { ResumenReserva } from "@/components/booking/ResumenReserva";
import { minBookingDate } from "@/lib/tourBooking";
import { HABITACIONES_HOTEL, SERVICIOS_HOTEL } from "@/lib/habitaciones";
import { GaleriaHabitacion } from "@/components/booking/GaleriaHabitacion";
import { BotonCompartir } from "@/components/booking/BotonCompartir";
import { ChevronLeft, Lock, ShieldCheck, MessageCircle, Check, CalendarCheck, Clock, MapPin, Hotel, Expand } from "lucide-react";
import { useLocale } from "@/lib/i18n/useLocale";
import { getPaqueteCheckoutUI } from "@/lib/i18n/paquetes.en";
import { localizePaquete, getLocalizedHabitaciones } from "@/lib/i18n/paquetes.en";
import { serviciosHotel, vistaHabitacion, caracteristicasHabitacion } from "@/lib/habitaciones";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
  "pk_live_51SuFNKPRwYk9rOzoUc56CjtGJ2VdnUkHvRNlP6N6EXX2PHdemLg0oHcOhXTUyv1jl1XHKvxcMfoIJErQSBBp4ojT00UPdWzcaR"
);

const WA_NUMBER = "524891251458";
const fmx = (n: number) => `$${Math.round(n).toLocaleString("es-MX")}`;
/**
 * Los porcentajes no dependen del idioma; sus etiquetas sí (ver el diccionario).
 * La lista sale de `paquetePricing`, que es la misma que valida el servidor: si
 * se escribieran por separado volverían a divergir, y esa divergencia dejó el
 * 30 % —la opción por defecto— devolviendo 400 durante nueve días.
 */
const PCT_VALUES = PCTS_PAQUETE;

// ── Paso de pago (Stripe) ─────────────────────────────────────────────────────
function PayStage({ paquete, form, clientSecret, paymentIntentId, cobrado, onDone }: any) {
  const stripe = useStripe();
  const elements = useElements();
  const { locale } = useLocale();
  const t = getPaqueteCheckoutUI(locale);
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
    if (sErr) { setError(sErr.message || t.errPago); setLoading(false); return; }
    if (paymentIntent?.status === "succeeded") {
      try {
        const res = await fetch("/api/paquetes/send-confirmation", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: form.email, customerName: form.name, customerPhone: form.phone || null,
            notes: form.notes || null, paymentIntentId,
            slug: paquete.slug, pct: form.pct, personas: form.personas, fecha: form.fecha,
            // El idioma viaja con la reserva para que la confirmación salga en
            // el idioma en que el cliente compró.
            locale,
          }),
        });
        const data = await res.json();
        onDone(data.confirmationNumber || "HP");
      } catch {
        onDone("HP");
      }
    } else {
      setError(t.errPagoIncompleto);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handlePay} className="space-y-6">
      <section className="bg-white border border-negro/8 p-6">
        <div className="flex items-center gap-2 mb-5">
          <Lock className="w-4 h-4 text-verde-selva" />
          <h2 className="font-cormorant text-verde-profundo text-xl">{t.infoPago}</h2>
        </div>
        <PaymentElement options={{ layout: "tabs", wallets: { applePay: "auto", googlePay: "auto" } }} />
      </section>
      {error && <div className="bg-terracota/10 border border-terracota/30 px-4 py-3"><p className="text-terracota font-dm text-sm">{error}</p></div>}
      <button type="submit" disabled={loading || !stripe}
        className="w-full bg-verde-selva text-crema py-4 text-sm tracking-[2px] uppercase font-dm hover:bg-verde-vivo transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
        {loading ? t.procesandoPago : <><Lock className="w-3.5 h-3.5" />{t.pagar(fmx(cobrado))}</>}
      </button>
      <div className="flex items-center justify-center gap-2 text-xs font-dm text-negro/40">
        <ShieldCheck className="w-4 h-4 text-verde-selva" /> {t.pagoCifrado}
      </div>
    </form>
  );
}

// ── Página ────────────────────────────────────────────────────────────────────
export default function ReservarPaquetePage() {
  const params = useParams<{ slug: string }>();
  const { locale, lp } = useLocale();
  const t = getPaqueteCheckoutUI(locale);
  const base = getPaquete(params.slug);
  const paquete = base ? localizePaquete(base, locale) : undefined;
  const HABITACIONES_LOC = getLocalizedHabitaciones(locale);

  const [fecha, setFecha]       = useState("");
  const [personas, setPersonas] = useState(2);            // adultos
  const [childrenMid,   setChildrenMid]   = useState(0);  // 6–10 años → 70 %
  const [childrenSmall, setChildrenSmall] = useState(0);  // menores de 6 → 50 %
  const [vistaMontana,  setVistaMontana]  = useState(false);
  // ⚠️ Cuando el cliente ya eligió habitación concreta, MANDA ella: la vista y
  // la tarifa salen de ese cuarto, no de la casilla de arriba. Si aún no elige,
  // se usa la casilla para que el precio no aparezca vacío.
  /** El día que el cliente elige, cuando el paquete lo ofrece. */
  const [tourElegido,   setTourElegido]   = useState<string>("");
  /** Cómo se reparte la gente entre habitaciones. */
  const [repartoHab,    setRepartoHab]    = useState<number[]>([]);
  /** Llegar la víspera: el día 1 es día de tour y se sale a las 8:30–9:00. */
  const [nocheExtra,    setNocheExtra]    = useState(false);
  /** La habitación concreta que eligió. Vacío = todavía no elige. */
  const [habitacionId,  setHabitacionId]  = useState<string>("");
  /** Cuarto abierto en la galería a pantalla completa. */
  const [galeria,       setGaleria]       = useState<string | null>(null);
  // El default arranca en el compromiso MÁS BAJO de los tres. El mínimo subió
  // de 10 % a 30 % (decisión de Manolo, 12 ago 2026): el 10 % no cubría ni la
  // primera noche de hotel del paquete.
  const [pct, setPct]           = useState<PctPaquete>(PCTS_PAQUETE[0]);
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
  const habElegida  = HABITACIONES_HOTEL.find((h) => h.id === habitacionId);
  const vistaReal   = habElegida ? habElegida.vistaMontana : vistaMontana;

  // ── Reparto por habitación ────────────────────────────────────────────────
  const totalHuespedes        = personas + childrenMid + childrenSmall;
  const habitacionesNecesarias = Math.max(1, Math.ceil(totalHuespedes / MAX_POR_HABITACION));

  /**
   * El reparto actual. Arranca lo más parejo posible —que suele ser lo más
   * barato— y el cliente lo ajusta: la tarifa del hotel depende de cuánta gente
   * duerme en cada habitación, así que 3+2 y 4+1 no cuestan lo mismo.
   */
  const reparto = (() => {
    const suma = repartoHab.reduce((a, b) => a + b, 0);
    if (repartoHab.length === habitacionesNecesarias && suma === totalHuespedes) return repartoHab;
    const base = Math.floor(totalHuespedes / habitacionesNecesarias);
    const resto = totalHuespedes % habitacionesNecesarias;
    return Array.from({ length: habitacionesNecesarias }, (_, i) => base + (i < resto ? 1 : 0));
  })();

  /** Mueve una persona de una habitación a otra sin perder ni inventar gente. */
  function moverPersona(idx: number, delta: number) {
    const nuevo = [...reparto];
    const destino = nuevo[idx] + delta;
    if (destino < 1 || destino > MAX_POR_HABITACION) return;
    // Se compensa en otra habitación para que el total no cambie.
    const otra = nuevo.findIndex((n, i) => i !== idx && (delta > 0 ? n > 1 : n < MAX_POR_HABITACION));
    if (otra < 0) return;
    nuevo[idx] = destino;
    nuevo[otra] -= delta;
    setRepartoHab(nuevo);
  }

  const cotizacion = computePaqueteCharge({ slug: paquete.slug, personas, childrenMid, childrenSmall, vistaMontana: vistaReal, reparto, nocheExtra, pct });
  const totalReal  = cotizacion?.total  ?? paquete.precio;
  const chargeAmt  = cotizacion?.charge ?? Math.round(paquete.precio * pct / 100);
  const pendiente  = totalReal - chargeAmt;
  const toursIncluidos = toursDelPaquete(paquete);

  async function goToPay() {
    setError("");
    // Sin cotización no hay precio que cobrar: seguir enseñaba el importe de
    // respaldo (`paquete.precio × pct`), que no es lo que el servidor cobraría.
    if (!cotizacion) { setError(t.errGrupoNoCotizable(MAX_PERSONAS_PAQUETE)); return; }
    if (!name.trim() || !email.trim()) { setError(t.errNombreCorreo); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError(t.errCorreoInvalido); return; }
    // Un paquete con día "a elegir" y sin elegir no se puede operar: el equipo
    // no sabría a dónde llevarlo el día 3.
    if (!habitacionId) {
      setError(t.errHabitacion);
      return;
    }
    if (paquete!.eleccionTour && !tourElegido) {
      setError(t.errEleccion(paquete!.eleccionTour.dia));
      return;
    }
    setLoading(true);

    // Rescate: ya tenemos nombre y correo pero todavía no ha pagado. Va sin
    // await para no retrasarle el pago, y su fallo nunca lo bloquea.
    fetch("/api/paquetes/guardar-carrito", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim(), phone: phone.trim(), slug: paquete!.slug,
        personas, childrenMid, childrenSmall, vistaMontana, fecha, reparto, tourElegido, nocheExtra, habitacionId,
        // Para que el correo de rescate salga en el idioma del cliente.
        locale,
      }),
    }).catch(() => {});

    try {
      const res = await fetch("/api/paquetes/create-payment-intent", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerEmail: email.trim(), customerName: name.trim(),
          paqueteDetails: { slug: paquete!.slug, pct, personas, childrenMid, childrenSmall, vistaMontana, fecha, reparto, tourElegido, nocheExtra, habitacionId },
        }),
      });
      const d = await res.json();
      if (d.error) { setError(d.error); setLoading(false); return; }
      setCS(d.clientSecret); setPIId(d.paymentIntentId); setCobrado(d.amount);
      setStage("pay");
    } catch {
      setError(t.errConexion);
    }
    setLoading(false);
  }

  const stripeOptions = {
    clientSecret,
    locale: (locale === "en" ? "en" : "es-419") as "en" | "es-419",
    appearance: { theme: "stripe" as const, variables: { colorPrimary: "#3a6b1a", colorBackground: "#f4edd8", colorText: "#1a2e1a", fontFamily: "DM Sans, sans-serif", borderRadius: "0px" } },
  };

  const form = { name: name.trim(), email: email.trim(), phone: phone.trim(), notes: notes.trim(), pct, personas, childrenMid, childrenSmall, vistaMontana, fecha };

  return (
    <main className="min-h-screen bg-crema pt-24 pb-20">
      <div className="max-w-3xl mx-auto px-6 mb-8 flex items-center justify-between gap-4 flex-wrap">
        <Link href={lp(`/paquetes/${paquete.slug}`)} className="inline-flex items-center gap-1.5 text-negro/50 hover:text-verde-selva text-xs font-dm tracking-[1px] uppercase transition-colors">
          <ChevronLeft className="w-3 h-3" /> {t.volverAlPaquete}
        </Link>
        <a href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(t.waReservar(paquete.nombre))}`} target="_blank" rel="noopener noreferrer"
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
          {/* Compartir el paquete con quien decide, ya con lo que lleva
            configurado —fecha, gente, habitación— en el texto del mensaje.
            El enlace es la ficha del paquete: el checkout no guarda estado en
            la URL, así que prometer que se abre "tal cual" sería mentira. */}
          <BotonCompartir
            titulo={paquete.nombre}
            texto={[
              `${paquete.nombre} — ${paquete.duracion}`,
              fecha ? t.compartirSalida(fecha) : "",
              t.compartirPersonas(personas, childrenMid + childrenSmall),
              habElegida ? t.compartirHabitacion(habElegida.nombre) : "",
              tourElegido ? t.compartirDia(paquete.eleccionTour!.dia, paquete.eleccionTour?.opciones.find((o) => o.slug === tourElegido)?.nombre ?? "") : "",
              nocheExtra ? t.compartirNocheExtra : "",
              t.compartirTotal(fmx(totalReal)),
            ].filter(Boolean).join("\n")}
            origen="paquete"
            className="flex-shrink-0 self-start border border-verde-selva/40 text-verde-selva px-3 py-2 hover:bg-verde-selva/8"
            obtenerUrl={() => `https://www.huasteca-potosina.com${lp(`/paquetes/${paquete.slug}`)}`}
          />
        </div>

        {stage === "done" ? (
          <div className="bg-white border border-verde-selva/30 p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-verde-selva/10 flex items-center justify-center mx-auto mb-4">
              <Check className="w-7 h-7 text-verde-selva" />
            </div>
            <h2 className="font-cormorant text-verde-profundo text-2xl mb-2">{t.reservaConfirmada}</h2>
            <p className="font-dm text-sm text-negro/60 mb-1">{t.tuConfirmacionEs} <strong className="text-negro">{confNum}</strong></p>
            <p className="font-dm text-sm text-negro/60 mb-6">{t.detallesPorCorreo} {pendiente > 0 ? t.pagasteParcial(fmx(chargeAmt), pct, fmx(pendiente)) : t.pagaste100} {t.teContactamos}</p>
            <Link href={lp("/paquetes")} className="text-verde-selva underline font-dm text-sm">{t.verMasPaquetes}</Link>
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
              <h2 className="font-cormorant text-verde-profundo text-xl mb-5">{t.fechaYPersonas}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] tracking-[2px] uppercase text-negro/50 font-dm mb-1.5">{t.fechaInicio}</label>
                  <input type="date" value={fecha} min={minDate} onChange={(e) => setFecha(e.target.value)}
                    className="w-full border border-negro/20 bg-crema px-4 py-3 font-dm text-sm text-negro focus:outline-none focus:border-verde-selva transition-colors" />
                  <p className="mt-1.5 text-[11px] text-negro/50 font-dm">
                    {t.salimosA}<strong className="text-negro/75">{t.salimosAFuerte}</strong>{t.salimosACola}
                  </p>
                </div>
                <div>
                  <label className="block text-[10px] tracking-[2px] uppercase text-negro/50 font-dm mb-1.5">{t.numeroPersonas}</label>
                  <div className="flex items-center gap-3">
                    <button type="button" aria-label={t.menosPersonas}
                      onClick={() => setPersonas((n) => Math.max(2, n - 1))}
                      className="w-11 h-11 border border-negro/20 text-negro/60 hover:border-verde-selva transition-colors">−</button>
                    <span className="font-dm text-lg text-negro/85 w-8 text-center">{personas}</span>
                    <button type="button" aria-label={t.masPersonas}
                      disabled={totalHuespedes >= MAX_PERSONAS_PAQUETE}
                      onClick={() => setPersonas((n) => Math.min(MAX_PERSONAS_PAQUETE, n + 1))}
                      className="w-11 h-11 border border-negro/20 text-negro/60 hover:border-verde-selva transition-colors disabled:opacity-40">+</button>
                  </div>
                  {/* El desglose se enseña siempre que haya extras: si el precio
                      sube, el cliente tiene que ver POR QUÉ sube.
                      ⚠️ La condición miraba `personas > 2`, y `personas` son
                      solo los ADULTOS: con 2 adultos y 2 niños el precio saltaba
                      de $12,500 a $19,670 sin una sola línea que lo explicara.
                      Ahora se dispara con los extras de verdad. */}
                  {cotizacion && (cotizacion.extraHotel > 0 || cotizacion.extraTours > 0) ? (
                    <div className="mt-3 border-t border-negro/8 pt-3 space-y-1">
                      <p className="flex justify-between font-dm text-[12px] text-negro/55">
                        <span>{t.paqueteBase}</span><span>{fmx(cotizacion.base)}</span>
                      </p>
                      {cotizacion.extraHotel > 0 && (
                        <p className="flex justify-between font-dm text-[12px] text-negro/55">
                          <span>{t.resumenHotelExtra(cotizacion.nochesTotales, cotizacion.habitaciones, habElegida?.nombre ?? "")}</span>
                          <span>+{fmx(cotizacion.extraHotel)}</span>
                        </p>
                      )}
                      {cotizacion.extraTours > 0 && (
                        <p className="flex justify-between font-dm text-[12px] text-negro/55">
                          <span>{t.resumenToursExtra(cotizacion.personas - 2)}</span>
                          <span>+{fmx(cotizacion.extraTours)}</span>
                        </p>
                      )}
                      <p className="flex justify-between font-dm text-[13px] text-negro/85 font-medium pt-1">
                        <span>{t.totalDelViaje}</span><span>{fmx(cotizacion.total)} MXN</span>
                      </p>
                    </div>
                  ) : (
                    <p className="mt-1.5 text-[10px] text-negro/40 font-dm">
                      {t.precioCubre2}
                    </p>
                  )}
                  {/* Menores, con la misma escala que los tours sueltos. */}
                  <div className="mt-4 space-y-2.5 border-t border-negro/8 pt-3">
                    {[
                      { label: t.ninos610, nota: t.ninos610Nota, v: childrenMid,   set: setChildrenMid },
                      { label: t.menores6, nota: t.menores6Nota, v: childrenSmall, set: setChildrenSmall },
                    ].map((c) => (
                      <div key={c.label} className="flex items-center justify-between">
                        <span className="font-dm text-[12px] text-negro/65">
                          {c.label} <span className="text-negro/35">· {c.nota}</span>
                        </span>
                        <span className="flex items-center gap-2">
                          <button type="button" aria-label={t.menosDe(c.label)}
                            onClick={() => c.set((n: number) => Math.max(0, n - 1))}
                            className="w-8 h-8 border border-negro/20 text-negro/60 hover:border-verde-selva">−</button>
                          <span className="font-dm text-sm text-negro/80 w-5 text-center">{c.v}</span>
                          {/* Los menores también cuentan para el tope. Sin
                            esto se podían poner 12 adultos y 3 niños: el
                            servidor rechazaba la reserva y, mientras tanto, la
                            pantalla enseñaba un precio de respaldo inventado. */}
                          <button type="button" aria-label={t.masDe(c.label)}
                            disabled={totalHuespedes >= MAX_PERSONAS_PAQUETE}
                            onClick={() => c.set((n: number) => n + 1)}
                            className="w-8 h-8 border border-negro/20 text-negro/60 hover:border-verde-selva disabled:opacity-40 disabled:hover:border-negro/20">+</button>
                        </span>
                      </div>
                    ))}
                    <p className="font-dm text-[10px] text-negro/35 leading-snug">
                      {t.bebesNota}
                    </p>
                  </div>

                  {personas >= MAX_PERSONAS_PAQUETE && (
                    <p className="mt-2 text-[11px] font-dm text-negro/55">
                      {t.sonMasDe(MAX_PERSONAS_PAQUETE)}{" "}
                      <a href={waLink(t.waGrupoGrande(personas + 1, paquete.nombre))}
                         target="_blank" rel="noopener noreferrer"
                         className="text-verde-selva underline underline-offset-2">{t.cotizamosWhatsapp}</a>.
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* Qué incluye este viaje — antes el checkout de paquetes no decía
                NADA: ni itinerario, ni horario, ni qué va incluido. El cliente
                soltaba miles de pesos a ciegas. */}
            <section className="bg-white border border-negro/8 p-6">
              <h2 className="font-cormorant text-verde-profundo text-xl mb-1">{t.tuViajeDiaPorDia}</h2>
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
                  <span>{t.salimosCadaDia}<strong className="text-negro/85">{t.salimosCadaDiaFuerte}</strong>{t.salimosCadaDiaCola}</span>
                </p>
                <p className="flex items-start gap-2.5 font-dm text-[12px] text-negro/65">
                  <MapPin className="w-4 h-4 text-verde-selva flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{t.pasamosPorTi}<strong className="text-negro/85">{t.pasamosPorTiFuerte}</strong>{t.pasamosPorTiCola}</span>
                </p>
                <p className="flex items-start gap-2.5 font-dm text-[12px] text-negro/65">
                  <Hotel className="w-4 h-4 text-verde-selva flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{t.nochesEnHotel(paquete.noches)}</span>
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 mt-5 pt-4 border-t border-negro/8">
                <p className="sm:col-span-2 text-[10px] tracking-[2px] uppercase text-negro/40 font-dm mb-1">{t.incluido}</p>
                {paquete.incluye.map((x) => (
                  <p key={x} className="flex items-start gap-2 font-dm text-[12px] text-negro/60">
                    <Check className="w-3.5 h-3.5 text-verde-selva flex-shrink-0 mt-0.5" aria-hidden="true" />
                    {x}
                  </p>
                ))}
              </div>

              {paquete.noIncluye.length > 0 && (
                <div className="mt-5 pt-4 border-t border-negro/8">
                  <p className="text-[10px] tracking-[2px] uppercase text-negro/40 font-dm mb-2">{t.noIncluido}</p>
                  {paquete.noIncluye.map((x) => (
                    <p key={x} className="font-dm text-[12px] text-negro/45 leading-snug">· {x}</p>
                  ))}
                </div>
              )}

              {toursIncluidos.length > 0 && (
                <p className="mt-5 pt-4 border-t border-negro/8 font-dm text-[11px] text-negro/45">
                  {t.cadaPersonaSuma(
                    fmx(toursIncluidos.reduce((a, x) => a + x.precio, 0)),
                    toursIncluidos.map((x) => x.nombre.split("—")[0].trim()).join(", "),
                  )}
                </p>
              )}
            </section>

            {/* Elección de tour, cuando el paquete la ofrece.
              El itinerario del Completo decía "Paraíso Escalonado (o Ruta
              Acuática, a elegir)" y no había ningún sitio donde elegir: el
              cliente pagaba un día "a elegir" sin elegirlo, y al equipo le
              llegaba la reserva sin saber a dónde llevarlo. Los dos valen lo
              mismo, así que la elección no mueve el precio. */}
            {paquete.eleccionTour && (
              <section className="bg-white border border-negro/8 p-6">
                <h2 className="font-cormorant text-verde-profundo text-xl mb-1">{paquete.eleccionTour.titulo}</h2>
                <p className="font-dm text-xs text-negro/45 mb-5">
                  {t.eleccionDia(paquete.eleccionTour.dia)}
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {paquete.eleccionTour.opciones.map((o) => {
                    const activa = tourElegido === o.slug;
                    return (
                      <button key={o.slug} type="button" onClick={() => setTourElegido(o.slug)}
                        className={`text-left border p-4 transition-colors ${activa ? "border-verde-selva bg-verde-selva/5" : "border-negro/15 hover:border-negro/30"}`}>
                        <span className="flex items-start gap-2">
                          <span className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${activa ? "border-verde-selva" : "border-negro/25"}`}>
                            {activa && <span className="w-2 h-2 rounded-full bg-verde-selva" />}
                          </span>
                          <span className="min-w-0">
                            <span className="block font-dm text-sm text-negro/85 font-medium leading-snug">{o.nombre}</span>
                            {o.nota && <span className="block font-dm text-[11px] text-negro/50 leading-snug mt-0.5">{o.nota}</span>}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                {!tourElegido && (
                  <p className="font-dm text-[11px] text-terracota mt-3">{t.eleccionElige}</p>
                )}
              </section>
            )}

            {/* El día 1 es día de TOUR.
              Se sale del hotel entre 8:30 y 9:00, así que quien llega esa
              misma mañana tiene que estar en Xilitla antes de las 9 — con seis
              horas de carretera de por medio, eso significa salir de madrugada.
              Manolo lo advertía a mano por WhatsApp en cada venta; aquí sale
              solo, con la salida a un clic. */}
            <section className="bg-white border border-negro/8 p-6">
              <h2 className="font-cormorant text-verde-profundo text-xl mb-1">{t.cuandoLlegas}</h2>
              <p className="font-dm text-xs text-negro/45 mb-4">
                {t.cuandoLlegasSub}
              </p>
              <div className="space-y-2.5">
                {[
                  { extra: false, t: t.llegoMismoDia, s: t.llegoMismoDiaSub },
                  { extra: true,  t: t.llegoDiaAntes,  s: t.llegoDiaAntesSub },
                ].map((o) => {
                  const activa = nocheExtra === o.extra;
                  const dif = o.extra && cotizacion
                    ? (computePaqueteCharge({ slug: paquete.slug, personas, childrenMid, childrenSmall, vistaMontana, reparto, nocheExtra: true, pct })?.total ?? 0)
                      - (computePaqueteCharge({ slug: paquete.slug, personas, childrenMid, childrenSmall, vistaMontana, reparto, nocheExtra: false, pct })?.total ?? 0)
                    : 0;
                  return (
                    <button key={o.t} type="button" onClick={() => setNocheExtra(o.extra)}
                      className={`w-full text-left border p-4 transition-colors ${activa ? "border-verde-selva bg-verde-selva/5" : "border-negro/15 hover:border-negro/30"}`}>
                      <span className="flex items-start gap-2">
                        <span className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${activa ? "border-verde-selva" : "border-negro/25"}`}>
                          {activa && <span className="w-2 h-2 rounded-full bg-verde-selva" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-3">
                            <span className="font-dm text-sm text-negro/85 font-medium">{o.t}</span>
                            {o.extra && dif > 0 && (
                              <span className="font-dm text-[12px] text-dorado whitespace-nowrap">+{fmx(dif)}</span>
                            )}
                          </span>
                          <span className="block font-dm text-[11px] text-negro/50 leading-snug mt-0.5">{o.s}</span>
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
              {nocheExtra && fecha && (
                <p className="font-dm text-[12px] text-verde-selva mt-3 border-t border-negro/8 pt-3">
                  {/* La entrada es el día ANTERIOR al primer tour: esa es toda
                    la gracia de la noche extra. */}
                  {t.entrasEl((() => {
                    const d = new Date(`${fecha}T12:00:00`);
                    d.setDate(d.getDate() - 1);
                    const f = d.toLocaleDateString(locale === "en" ? "en-US" : "es-MX", { weekday: "long", day: "numeric", month: "long" });
                    return f.charAt(0).toUpperCase() + f.slice(1);
                  })())}
                </p>
              )}
            </section>

            <GaleriaHabitacion
              habitacion={HABITACIONES_HOTEL.find((h) => h.id === galeria) ?? null}
              abierta={!!galeria}
              onCerrar={() => setGaleria(null)}
            />

            {/* Habitación */}
            <section className="bg-white border border-negro/8 p-6">
              <h2 className="font-cormorant text-verde-profundo text-xl mb-1">{t.tuHabitacion}</h2>
              <p className="font-dm text-xs text-negro/45 mb-5">
                {t.nochesEnHotel(paquete.noches)}
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  { m: false, t: t.vistaSelva,   s: t.vistaSelvaSub },
                  { m: true,  t: t.vistaMontana, s: t.vistaMontanaSub },
                ].map((o) => {
                  const activa = vistaMontana === o.m;
                  // La diferencia se calcula con las tarifas reales, así que
                  // sube según cuánta gente duerma en la habitación.
                  const dif = o.m && cotizacion
                    ? (computePaqueteCharge({ slug: paquete.slug, personas, childrenMid, childrenSmall, vistaMontana: true, reparto, nocheExtra, pct })?.total ?? 0)
                      - (computePaqueteCharge({ slug: paquete.slug, personas, childrenMid, childrenSmall, vistaMontana: false, reparto, nocheExtra, pct })?.total ?? 0)
                    : 0;
                  return (
                    <button key={o.t} type="button"
                      onClick={() => {
                        setVistaMontana(o.m);
                        // Si la habitación ya elegida es del otro grupo, se
                        // suelta: si no, quedaba seleccionada una Jungla fuera
                        // de la lista visible, el precio se cobraba como Jungla
                        // y la pantalla decía "vista a la selva".
                        if (habElegida && habElegida.vistaMontana !== o.m) setHabitacionId("");
                      }}
                      className={`text-left border p-4 transition-colors ${activa ? "border-verde-selva bg-verde-selva/5" : "border-negro/15 hover:border-negro/30"}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${activa ? "border-verde-selva" : "border-negro/25"}`}>
                          {activa && <span className="w-2 h-2 rounded-full bg-verde-selva" />}
                        </span>
                        <span className="font-dm text-sm text-negro/85 font-medium">{o.t}</span>
                      </div>
                      <p className="font-dm text-[11px] text-negro/50 leading-snug">{o.s}</p>
                      {o.m && dif > 0 && (
                        <p className="font-dm text-[12px] text-dorado mt-1.5">{t.porLasNoches(fmx(dif), paquete.noches)}</p>
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
                      {grupo.length === 1 ? t.laHabitacion : t.eligeTuHabitacion}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {grupo.map((h) => {
                        // Cabe el grupo entero en esta habitación, o hacen falta
                        // varias y entonces el cupo no descarta ninguna.
                        const cabe = habitacionesNecesarias > 1 || totalHuespedes <= h.maxHuespedes;
                        const elegida = habitacionId === h.id;
                        return (
                          <button
                            key={h.id}
                            type="button"
                            disabled={!cabe}
                            onClick={() => { setHabitacionId(h.id); setVistaMontana(h.vistaMontana); }}
                            aria-pressed={elegida}
                            className={`text-left border overflow-hidden transition-colors ${
                              elegida ? "border-verde-selva ring-2 ring-verde-selva/25"
                              : cabe   ? "border-negro/10 hover:border-verde-selva/50"
                                       : "border-negro/10 opacity-40 cursor-not-allowed"
                            }`}
                          >
                            <span className="relative block aspect-[4/3] bg-negro/5">
                              <Image src={h.imagen} alt={h.nombre} fill className="object-cover" sizes="(max-width:640px) 45vw, 200px" />
                              {elegida && (
                                <span className="absolute top-1.5 right-1.5 bg-verde-selva text-crema text-[9px] tracking-[1px] uppercase px-1.5 py-0.5">
                                  {t.elegida}
                                </span>
                              )}
                              {/* Ver la habitación a detalle sin elegirla: mirar
                                y decidir son dos cosas distintas. */}
                              <span
                                role="button"
                                tabIndex={0}
                                aria-label={t.verFotosDe(h.nombre)}
                                onClick={(e) => { e.stopPropagation(); setGaleria(h.id); }}
                                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); setGaleria(h.id); } }}
                                className="absolute bottom-1.5 right-1.5 w-7 h-7 flex items-center justify-center bg-negro/55 hover:bg-negro/75 text-crema transition-colors cursor-pointer"
                              >
                                <Expand className="w-3.5 h-3.5" aria-hidden="true" />
                              </span>
                            </span>
                            <span className="block p-2.5">
                              <span className="block font-dm text-[12px] text-negro/85 leading-tight">{h.nombre}</span>
                              <span className="block font-dm text-[11px] text-negro/45 leading-snug mt-0.5">
                                {t.hastaPersonas(h.maxHuespedes)} · {vistaHabitacion(h.vista, locale)}
                              </span>
                              <span className="block font-dm text-[10px] text-negro/40 leading-snug mt-1">
                                {caracteristicasHabitacion(h.caracteristicas, locale).slice(0, 3).join(" · ")}
                              </span>
                              {!cabe && (
                                <span className="block font-dm text-[10px] text-terracota mt-1">
                                  {t.noCaben(totalHuespedes)}
                                </span>
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <p className="font-dm text-[11px] text-negro/45 mt-3">
                      {habitacionId
                        ? t.habitacionApartada
                        : t.eligeUnaParaContinuar}
                    </p>
                  </div>
                );
              })()}

              {/* Cómo se reparten entre habitaciones.
                Con más de 4 hace falta más de una, y el reparto NO da igual: la
                tarifa del hotel cambia según cuánta gente duerme en cada
                habitación, así que 4+1 y 3+2 no cuestan lo mismo. Antes esto se
                decidía solo (ceil(personas/4)) y el cliente ni lo veía. */}
              {totalHuespedes > MAX_POR_HABITACION && (
                <div className="mt-5 pt-5 border-t border-negro/8">
                  <p className="font-dm text-[11px] tracking-[1.5px] uppercase text-negro/40 mb-1">
                    {t.comoSeReparten}
                  </p>
                  <p className="font-dm text-[12px] text-negro/55 mb-3">
                    {t.repartoTexto(totalHuespedes, MAX_POR_HABITACION, habitacionesNecesarias)}
                  </p>
                  <div className="space-y-2">
                    {reparto.map((n, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-3 border border-negro/10 px-3 py-2.5">
                        <span className="font-dm text-[13px] text-negro/70">{t.habitacionN(idx + 1)}</span>
                        <span className="flex items-center gap-2">
                          <button type="button" aria-label={t.menosEnHabitacion(idx + 1)}
                            onClick={() => moverPersona(idx, -1)}
                            className="w-8 h-8 border border-negro/20 text-negro/60 hover:border-verde-selva text-sm leading-none">−</button>
                          <span className="font-dm text-[13px] text-negro/85 w-16 text-center tabular-nums">
                            {t.personasN(n)}
                          </span>
                          <button type="button" aria-label={t.masEnHabitacion(idx + 1)}
                            onClick={() => moverPersona(idx, 1)}
                            className="w-8 h-8 border border-negro/20 text-negro/60 hover:border-verde-selva text-sm leading-none">+</button>
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="font-dm text-[11px] text-negro/40 mt-2">
                    {t.precioYaCuenta}
                  </p>
                </div>
              )}
            </section>

            {/* El hotel: las dudas de siempre —dónde está, si hay alberca, si hay
              estacionamiento— resueltas antes de pedirle la tarjeta, no después
              por WhatsApp. */}
            <section className="bg-white border border-negro/8 p-6">
              <h2 className="font-cormorant text-verde-profundo text-xl mb-1">{t.elHotel}</h2>
              <p className="font-dm text-xs text-negro/45 mb-4">
                {t.elHotelSub}
              </p>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-2">
                {serviciosHotel(locale).map((s) => (
                  <li key={s} className="flex items-start gap-2 font-dm text-[12px] text-negro/70">
                    <Check className="w-3.5 h-3.5 text-verde-selva flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <span className="leading-snug">{s}</span>
                  </li>
                ))}
              </ul>
              <p className="font-dm text-[11px] text-negro/45 mt-4 pt-4 border-t border-negro/8">
                {t.elHotelNota}
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
                    t.adultos(personas),
                    childrenMid   ? t.ninos610Resumen(childrenMid) : "",
                    childrenSmall ? t.menores6Resumen(childrenSmall) : "",
                    // Con la noche extra sube la noche Y el día: se entra la
                    // víspera. Dejar los días del catálogo daba "5 días / 5
                    // noches", que no existe.
                    t.diasNoches(paquete.dias + (nocheExtra ? 1 : 0), cotizacion.nochesTotales),
                    // La habitación REAL que eligió, no la casilla de vista: si
                    // cambia de opinión y vuelve a "selva" con una Jungla ya
                    // elegida, el precio es el de Jungla y el resumen decía
                    // "vista a la selva".
                    habElegida?.nombre ?? (vistaReal ? t.habJungla : t.habSelva),
                    nocheExtra ? t.resumenNocheExtra : "",
                  ].filter(Boolean).join(" · "),
                  // El renglón principal es el precio PUBLICADO; lo que se suma
                  // encima va desglosado abajo. Los tres importes suman exacto
                  // el total, sin restas frágiles entre escenarios.
                  subtotal: cotizacion.base,
                  incluye:  paquete.incluye,
                  addOns: [
                    ...(cotizacion.extraHotel > 0 ? [{
                      nombre:   t.resumenHotelExtra(
                        cotizacion.nochesTotales,
                        cotizacion.habitaciones,
                        habElegida?.nombre ?? "",
                      ),
                      subtotal: cotizacion.extraHotel,
                    }] : []),
                    ...(cotizacion.extraTours > 0 ? [{
                      nombre:   t.resumenToursExtra(cotizacion.personas - 2),
                      subtotal: cotizacion.extraTours,
                    }] : []),
                  ],
                }]}
                total={cotizacion.total}
                pagaHoy={cotizacion.charge}
                saldo={cotizacion.saldo}
                pct={pct}
              />
            )}

            {/* Cuánto pagar */}
            <section className="bg-white border border-negro/8 p-6">
              <h2 className="font-cormorant text-verde-profundo text-xl mb-1">{t.cuantoPagarHoy}</h2>
              <p className="font-dm text-xs text-negro/45 mb-5">{t.cuantoPagarHoySub}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {PCT_VALUES.map((valor, i) => {
                  const o = { pct: valor, ...t.pctOpciones[i] };
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
                <span className="text-negro/60">{t.pagasHoy(pct)}</span>
                <span className="font-cormorant text-xl text-dorado">{fmx(chargeAmt)} MXN</span>
              </div>
              {pendiente > 0 && (
                <div className="flex justify-between text-xs font-dm text-negro/45 mt-1">
                  <span>{t.saldoPendiente}</span><span>{fmx(pendiente)} MXN</span>
                </div>
              )}
            </section>

            {/* Contacto */}
            <section className="bg-white border border-negro/8 p-6">
              <h2 className="font-cormorant text-verde-profundo text-xl mb-5">{t.datosContacto}</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] tracking-[2px] uppercase text-negro/50 font-dm mb-1.5">{t.nombreCompleto}</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={t.nombrePlaceholder}
                    className="w-full border border-negro/20 bg-crema px-4 py-3 font-dm text-sm text-negro focus:outline-none focus:border-verde-selva transition-colors" />
                </div>
                <div>
                  <label className="block text-[10px] tracking-[2px] uppercase text-negro/50 font-dm mb-1.5">{t.correo}</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.correoPlaceholder}
                    className="w-full border border-negro/20 bg-crema px-4 py-3 font-dm text-sm text-negro focus:outline-none focus:border-verde-selva transition-colors" />
                  <p className="mt-1.5 text-xs text-negro/40 font-dm">{t.confirmacionSeEnvia}</p>
                </div>
                <div>
                  <label className="block text-[10px] tracking-[2px] uppercase text-negro/50 font-dm mb-1.5">{t.whatsappTelefono}</label>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t.telefonoPlaceholder}
                    className="w-full border border-negro/20 bg-crema px-4 py-3 font-dm text-sm text-negro focus:outline-none focus:border-verde-selva transition-colors" />
                </div>
                {showNotes ? (
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder={t.notaPlaceholder}
                    className="w-full border border-negro/20 bg-crema px-4 py-3 font-dm text-sm text-negro focus:outline-none focus:border-verde-selva transition-colors resize-none" />
                ) : (
                  <button type="button" onClick={() => setShowNotes(true)} className="text-xs font-dm text-verde-selva hover:text-verde-vivo underline underline-offset-2">
                    {t.agregarNota}
                  </button>
                )}
              </div>
            </section>

            {error && <div className="bg-terracota/10 border border-terracota/30 px-4 py-3"><p className="text-terracota font-dm text-sm">{error}</p></div>}

            <button onClick={goToPay} disabled={loading}
              className="w-full bg-verde-selva text-crema py-4 text-sm tracking-[2px] uppercase font-dm hover:bg-verde-vivo transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? t.preparandoPago : <><Lock className="w-3.5 h-3.5" />{t.continuarPagar(fmx(chargeAmt))}</>}
            </button>
            <div className="flex items-center justify-center gap-2 text-xs font-dm text-negro/40">
              <CalendarCheck className="w-4 h-4 text-verde-selva" /> {t.cancelacionFlexible}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
