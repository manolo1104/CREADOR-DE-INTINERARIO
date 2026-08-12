"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { ChevronLeft, Lock, Trash2, MapPin, Clock, ShieldCheck, Star, Users, AlertCircle, MessageCircle } from "lucide-react";
import {
  leerCarrito, quitarDelCarrito, vaciarCarrito, resumirCarrito,
  actualizarItem, agregarAlCarrito, personasDeItem, ANTICIPO_PCT, type CarritoItem,
} from "@/lib/carrito";
import { HABITACIONES_HOTEL, cotizarHabitaciones, getHabitacion, tarifaNoche } from "@/lib/habitaciones";
import { formatMXN, formatTourDate, minBookingDate, calcTourTotal } from "@/lib/tourBooking";
import { TOURS_DB, INCLUYE_SIEMPRE } from "@/lib/tours";
import { TOUR_REVIEWS, GOOGLE_MAPS_REVIEWS_URL } from "@/lib/tourReviews";
import { ResumenReserva } from "@/components/booking/ResumenReserva";
import { RescatePopup } from "@/components/carrito/RescatePopup";
import { trackTourEvent, sessionId } from "@/lib/tourTracker";
import { trackPurchase } from "@/lib/analytics";

/**
 * Las dudas que de verdad frenan el pago. Todas las respuestas salen de lo que
 * el sitio ya afirma (política de cancelación, fichas de tour): aquí no se
 * inventa ninguna condición nueva.
 */
/** Lo que ofrece el hotel, para que el cliente sepa qué está comprando. */
const SERVICIOS_HOTEL = [
  "Estacionamiento",
  "Alberca",
  "WiFi",
  "Aire acondicionado",
  "Restaurante",
  "A 7 min del centro de Xilitla",
] as const;

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
  hospedaje: { habitacion: string; noches: number; huespedes: number; total: number; ahorro: number } | null;
}

// ── Formulario de pago ───────────────────────────────────────────────────────

function PagoCarrito({ cobro, datos, onListo }: {
  cobro: Cobro;
  datos: { name: string; email: string; phone: string; pickup: string; checkin?: string; checkout?: string };
  onListo: () => void;
}) {
  const stripe   = useStripe();
  const elements = useElements();
  const router   = useRouter();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const waPagoAlterno = `https://wa.me/524891251458?text=${encodeURIComponent(
    [
      "Hola, quiero apartar este viaje pero prefiero pagar por transferencia SPEI u OXXO.",
      "",
      ...cobro.lineItems.map(
        (l) => `• ${l.tourName.split("—")[0].trim()} — ${formatTourDate(l.tourDate)} — ${l.adults + l.children} persona(s) — $${l.subtotal.toLocaleString("es-MX")}`,
      ),
      "",
      ...(cobro.hospedaje
        ? [
            "",
            `Hospedaje: ${cobro.hospedaje.habitacion} — ${cobro.hospedaje.noches} noche(s) — ${cobro.hospedaje.huespedes} huésped(es) — $${cobro.hospedaje.total.toLocaleString("es-MX")}`,
            ...(cobro.hospedaje.ahorro > 0
              ? [`(ya con la 3.ª noche gratis: ahorro de $${cobro.hospedaje.ahorro.toLocaleString("es-MX")})`]
              : []),
          ]
        : []),
      "",
      `Total del viaje: $${cobro.total.toLocaleString("es-MX")} MXN`,
      `Anticipo (30 %): $${cobro.amount.toLocaleString("es-MX")} MXN`,
      `Saldo el día del primer recorrido: $${cobro.saldo.toLocaleString("es-MX")} MXN`,
      "",
      `A nombre de: ${datos.name || "(pendiente)"}`,
      datos.email  ? `Correo: ${datos.email}` : "",
      datos.pickup ? `Me hospedo en: ${datos.pickup}` : "",
    ].filter(Boolean).join("\n"),
  )}`;

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
              cobro.hospedaje
                ? `Hospedaje: ${cobro.hospedaje.habitacion}, ${cobro.hospedaje.noches} noche(s), ${cobro.hospedaje.huespedes} huésped(es)${datos.checkin ? ` — entrada ${datos.checkin}` : ""}${datos.checkout ? `, salida ${datos.checkout}` : ""}.`
                : null,
            ].filter(Boolean).join(" | "),
            totalAmount:     cobro.amount,
            paymentIntentId: cobro.paymentIntentId,
            tourName:        resumen,
            tourDate:        primero.tourDate,
            adults:          cobro.lineItems.reduce((s, l) => s + l.adults, 0),
            children:        cobro.lineItems.reduce((s, l) => s + l.children, 0),
            // El hospedaje entra como un renglón más: el cliente lo PAGÓ, así
            // que tiene que aparecer en su confirmación. Antes se cobraba y el
            // correo no lo mencionaba.
            lineItems: [
              ...cobro.lineItems,
              ...(cobro.hospedaje
                ? [{
                    tourName: `Hospedaje · ${cobro.hospedaje.habitacion}`,
                    tourDate: datos.checkin || primero.tourDate,
                    adults:   cobro.hospedaje.huespedes,
                    children: 0,
                    subtotal: cobro.hospedaje.total,
                  }]
                : []),
            ],
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

      {/* Salida para quien no quiere teclear su tarjeta. El motor solo acepta
          tarjeta, y mucha gente en México prefiere SPEI u OXXO: sin esta puerta
          esa venta se perdía en silencio. El mensaje va con TODO el detalle
          para que nadie tenga que volver a preguntarlo por chat. */}
      <div className="border-t border-negro/10 pt-4">
        <p className="text-center font-dm text-[12px] text-negro/50 mb-3">
          ¿Prefieres transferencia SPEI u OXXO?
        </p>
        <a
          href={waPagoAlterno}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackTourEvent("WHATSAPP_CLICK", { origen: "carrito_pago_alterno", amount: cobro.amount, recorridos: cobro.lineItems.length })}
          className="flex items-center justify-center gap-2.5 w-full border border-[#25D366]/60 hover:border-[#25D366] text-[#25D366] hover:bg-[#25D366]/8 py-3.5 text-[11px] tracking-[2px] uppercase font-dm transition-all"
        >
          <MessageCircle className="w-4 h-4" aria-hidden="true" />
          Apartar por WhatsApp
        </a>
        <p className="text-center font-dm text-[10px] text-negro/35 mt-2">
          Te mandamos los datos y apartamos tus lugares al recibir el comprobante.
        </p>
      </div>
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
  // Hospedaje opcional en el Hotel Paraíso Encantado. Apagado por defecto:
  // muchos ya vienen con hotel, y la promesa del sitio es justo que no hace
  // falta hospedarse con nosotros.
  const [mostrarLista, setMostrarLista] = useState(false);
  // Apartado temporal: al pasar al pago se reservan los lugares 15 minutos.
  // No es un truco de urgencia inventado — es el tiempo real que se sostiene
  // un cupo sin cobrar, y decirlo evita que alguien deje la pestaña abierta
  // media hora y llegue a pagar algo que ya se ocupó.
  const [expiraEn, setExpiraEn] = useState<number | null>(null);
  const [restante, setRestante] = useState(0);
  const [conHotel,    setConHotel]    = useState(false);
  // Una entrada por habitación, con cuánta gente duerme en cada una. Con más
  // gente de la que cabe en una, el cliente decide el reparto (3+2 o 4+1):
  // el precio cambia según eso y él sabe mejor cómo quiere dormir.
  const [habs, setHabs] = useState<{ habitacionId: string; huespedes: number }[]>([
    { habitacionId: "lirios-1", huespedes: 2 },
  ]);
  const [detalleHab, setDetalleHab] = useState<string | null>(null);
  const [checkin,     setCheckin]     = useState("");
  const [checkout,    setCheckout]    = useState("");
  const [error,  setError]  = useState("");
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    setMontado(true);
    setItems(leerCarrito());
  }, []);

  // Al activar el hospedaje se proponen fechas a partir de los recorridos ya
  // elegidos: se llega la víspera del primero y se sale el día después del
  // último. Es lo que hace casi todo el mundo, y evita que arranque vacío.
  useEffect(() => {
    if (!conHotel || checkin || checkout) return;
    const fechas = items.map((i) => i.tourDate).filter(Boolean).sort();
    if (fechas.length === 0) return;
    const dia = (f: string, delta: number) => {
      const d = new Date(`${f}T00:00:00`);
      d.setDate(d.getDate() + delta);
      return d.toISOString().slice(0, 10);
    };
    setCheckin(dia(fechas[0], -1));
    setCheckout(dia(fechas[fechas.length - 1], 1));
  }, [conHotel, items, checkin, checkout]);

  // Cuenta atrás del apartado.
  useEffect(() => {
    if (!expiraEn) return;
    const tick = () => setRestante(Math.max(0, Math.ceil((expiraEn - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiraEn]);

  const minDate = minBookingDate();

  // Las noches salen del calendario, no de un contador suelto: el cliente
  // piensa en "llego el 15 y me voy el 18", no en "tres noches".
  const noches = (() => {
    if (!checkin || !checkout) return 0;
    const ms = new Date(`${checkout}T00:00:00`).getTime() - new Date(`${checkin}T00:00:00`).getTime();
    return Math.max(0, Math.round(ms / 86_400_000));
  })();

  const huespedes  = habs.reduce((s, h) => s + h.huespedes, 0);
  const hotelQuote = conHotel && noches > 0 ? cotizarHabitaciones(habs, noches) : null;
  const totalHotel = hotelQuote?.ok ? hotelQuote.total ?? 0 : 0;

  // Si reserva el hotel con nosotros, la recogida es aquí: se llena solo para
  // que no tenga que escribirlo, y se puede editar si prefiere otra cosa.
  useEffect(() => {
    if (!conHotel || !hotelQuote?.ok) return;
    const nombres = (hotelQuote.desglose ?? []).map((d) => d.habitacion).join(" + ");
    setPickup(`Hotel Paraíso Encantado, Xilitla${nombres ? ` — ${nombres}` : ""}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conHotel, JSON.stringify(habs), hotelQuote?.ok]);

  // Testimonios de los recorridos que ESTA persona lleva en el carrito: una
  // reseña del tour que ya eligió pesa más que una genérica.
  const resenas = Array.from(
    new Map(
      items
        .flatMap((i) => TOUR_REVIEWS[(TOURS_DB.find((t) => t.slug === i.tourSlug)?.id ?? "") as keyof typeof TOUR_REVIEWS] ?? [])
        .map((r) => [r.nombre + r.texto.slice(0, 12), r] as const),
    ).values(),
  ).slice(0, 3);
  // El hotel entra en el total y, por tanto, en el anticipo del 30 %. El
  // servidor vuelve a cotizarlo con `cotizarHospedaje`, así que esto es solo
  // lo que se pinta.
  const resumen  = resumirCarrito(items);
  const dias     = resumen.dias;
  const total    = resumen.total + totalHotel;
  const anticipo = Math.round((total * ANTICIPO_PCT) / 100);
  const saldo    = total - anticipo;

  // Mensaje del rescate: lleva lo que el cliente ya eligió para que no tenga
  // que repetirlo. Sin esto el chat arranca con "hola" y se pierde el contexto.
  const waRescate = `https://wa.me/524891251458?text=${encodeURIComponent(
    [
      "Hola, estoy armando mi viaje en la página y tengo una duda:",
      "",
      ...items.map((i) => `• ${i.tourName.split("—")[0].trim()}${i.tourDate ? ` — ${i.tourDate}` : " — (sin fecha)"}`),
      ...(conHotel && hotelQuote?.ok
        ? [`• Hospedaje: ${(hotelQuote.desglose ?? []).map((d) => d.habitacion).join(" + ")}${noches ? ` — ${noches} noche(s)` : ""}`]
        : []),
      "",
      `Total estimado: $${total.toLocaleString("es-MX")} MXN`,
    ].join("\n"),
  )}`;


  function quitar(uid: string) {
    setItems(quitarDelCarrito(uid));
    // Si se vacía el carrito a media captura, el cobro creado deja de valer.
    setCobro(null);
  }

  function cambiar(uid: string, cambios: Partial<CarritoItem>) {
    // Dos recorridos no pueden caer el mismo día: cada uno ocupa la jornada
    // completa (salen a las 8 y vuelven por la tarde). Si se dejara pasar, el
    // cliente pagaría dos tours que es físicamente imposible hacer, y la
    // reclamación llega el mismo día de la salida.
    if (cambios.tourDate) {
      const chocaCon = items.find(
        (x) => x.uid !== uid && x.tourDate === cambios.tourDate,
      );
      if (chocaCon) {
        setError(
          `Ya tienes "${chocaCon.tourName.split("—")[0].trim()}" ese día. Cada recorrido ocupa el día completo: elige otra fecha.`,
        );
        return;
      }
    }
    setError("");
    setItems(actualizarItem(uid, cambios));
    setCobro(null); // cualquier cambio invalida el importe ya calculado
  }

  /**
   * Activa, quita o cambia la cantidad de una actividad opcional. Igual que con
   * las personas, aquí solo se recalcula lo que se PINTA: el importe que se
   * cobra lo vuelve a sacar `computeTourCharge` en el servidor.
   */
  function cambiarAddOn(i: CarritoItem, id: string, cantidad: number) {
    const tour = TOURS_DB.find((t) => t.slug === i.tourSlug);
    const cat  = tour?.addOns?.find((a) => a.id === id);
    if (!tour || !cat) return;
    const otros   = (i.addOns ?? []).filter((a) => a.id !== id);
    const nuevos  = cantidad > 0 ? [...otros, { id, cantidad }] : otros;
    const { total: base } = calcTourTotal(tour.precio, i.adults, i.childrenMid, i.childrenSmall, 0);
    const extras = nuevos.reduce((s, a) => {
      const c = tour.addOns?.find((x) => x.id === a.id);
      return s + (c ? c.precio * a.cantidad : 0);
    }, 0);
    cambiar(i.uid, { addOns: nuevos, total: base + extras });
  }

  /**
   * Cambia ruta, vehículo o unidades de un tour cobrado por vehículo y vuelve a
   * sacar el precio de la matriz flota × ruta — la misma que usa el servidor en
   * `computeVehiculoCharge`.
   */
  /** Agrega un recorrido desde la lista, sin fecha: se elige aquí mismo. */
  function agregarDelCatalogo(slug: string) {
    const t = TOURS_DB.find((x) => x.slug === slug);
    if (!t) return;
    const porVehiculo = t.precioUnidad === "vehiculo";
    const ruta = t.rutas?.[0];
    const veh  = t.flota?.[0];
    setItems(
      agregarAlCarrito({
        tourId: t.id, tourSlug: t.slug, tourName: t.nombre, tourImage: t.imagen_hero,
        tourDate: "",
        adults: porVehiculo ? 1 : 2,
        childrenMid: 0, childrenSmall: 0,
        ...(porVehiculo && ruta && veh
          ? { ruta: ruta.nombre, vehiculo: veh.nombre, unidades: 1, total: veh.precios[0] ?? ruta.desde }
          : { total: t.precio * 2 }),
      }),
    );
    setCobro(null);
  }

  function cambiarVehiculo(i: CarritoItem, cambios: { ruta?: string; vehiculo?: string; unidades?: number }) {
    const tour = TOURS_DB.find((t) => t.slug === i.tourSlug);
    if (!tour?.rutas || !tour?.flota) return;
    const ruta     = cambios.ruta     ?? i.ruta ?? tour.rutas[0].nombre;
    const vehiculo = cambios.vehiculo ?? i.vehiculo ?? tour.flota[0].nombre;
    const unidades = cambios.unidades ?? i.unidades ?? 1;
    const idxRuta  = tour.rutas.findIndex((r) => r.nombre === ruta);
    const veh      = tour.flota.find((v) => v.nombre === vehiculo);
    if (idxRuta < 0 || !veh) return;
    cambiar(i.uid, { ruta, vehiculo, unidades, total: (veh.precios[idxRuta] ?? 0) * unidades });
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
    // Los add-ons se topan a la gente que va: si el grupo baja, la actividad
    // opcional no puede quedar contratada para más personas de las que quedan.
    const addOns = (i.addOns ?? [])
      .map((a) => ({ ...a, cantidad: Math.min(a.cantidad, adultos + i.childrenMid + i.childrenSmall) }))
      .filter((a) => a.cantidad > 0);
    const extras = addOns.reduce((s, a) => {
      const c = tour.addOns?.find((x) => x.id === a.id);
      return s + (c ? c.precio * a.cantidad : 0);
    }, 0);
    cambiar(i.uid, { adults: adultos, addOns, total: total + extras });
  }

  // Sin fecha no se puede cobrar: el servidor la valida, pero es mejor decirlo
  // aquí que dejar que el pago falle con un error genérico.
  const sinFechaItems = items.filter((i) => !i.tourDate);
  const conFechaItems = [...items]
    .filter((i) => i.tourDate)
    .sort((a, b) => a.tourDate.localeCompare(b.tourDate));
  const sinFecha = sinFechaItems.length;

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
          hospedaje: conHotel
            ? { habitaciones: habs, noches, checkin, checkout }
            : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo iniciar el pago.");
        setCargando(false);
        return;
      }
      setCobro(data);
      setExpiraEn(Date.now() + 15 * 60 * 1000);
    } catch {
      setError("No se pudo conectar. Revisa tu internet e intenta de nuevo.");
    }
    setCargando(false);
  }

  const Renglon = (i: CarritoItem) => (
    // La `key` incluye la fecha a propósito: al ponerle día a un recorrido,
    // React lo remonta en su grupo nuevo y la animación de entrada lo acompaña
    // hasta su lugar. Es el efecto de la lista que pasó Manolo, hecho con la
    // animación que el proyecto ya tiene en tailwind.config, sin librería.
    <div key={i.uid + i.tourDate} className="animate-slide-up flex gap-4 border border-negro/10 bg-white p-4">
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
                        // Ruta, vehículo y unidades se eligen AQUÍ. Antes el
                        // RZR ni entraba al carrito: el botón del catálogo
                        // mandaba a la ficha y rompía el flujo a la mitad.
                        <span className="flex flex-wrap items-center gap-2">
                          <select
                            value={i.ruta}
                            onChange={(e) => cambiarVehiculo(i, { ruta: e.target.value })}
                            aria-label={`Ruta de ${i.tourName}`}
                            className="border border-negro/15 bg-white px-2 py-1.5 font-dm text-[12px] text-negro"
                          >
                            {(TOURS_DB.find((t) => t.slug === i.tourSlug)?.rutas ?? []).map((r) => (
                              <option key={r.nombre} value={r.nombre}>{r.nombre}</option>
                            ))}
                          </select>
                          <select
                            value={i.vehiculo}
                            onChange={(e) => cambiarVehiculo(i, { vehiculo: e.target.value })}
                            aria-label={`Vehículo de ${i.tourName}`}
                            className="border border-negro/15 bg-white px-2 py-1.5 font-dm text-[12px] text-negro"
                          >
                            {(TOURS_DB.find((t) => t.slug === i.tourSlug)?.flota ?? []).map((v) => (
                              <option key={v.nombre} value={v.nombre}>{v.nombre}</option>
                            ))}
                          </select>
                          <span className="flex items-center gap-2">
                            <button type="button" aria-label="Menos unidades"
                              onClick={() => cambiarVehiculo(i, { unidades: Math.max(1, (i.unidades ?? 1) - 1) })}
                              className="w-7 h-7 border border-negro/20 text-negro/60 hover:border-verde-selva text-sm">−</button>
                            <span className="font-dm text-[12px] text-negro/70">{i.unidades} unidad{(i.unidades ?? 1) > 1 ? "es" : ""}</span>
                            <button type="button" aria-label="Más unidades"
                              onClick={() => cambiarVehiculo(i, { unidades: (i.unidades ?? 1) + 1 })}
                              className="w-7 h-7 border border-negro/20 text-negro/60 hover:border-verde-selva text-sm">+</button>
                          </span>
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
  
                    {/* Actividades opcionales del recorrido. Se agregan aquí
                      porque al meter un tour desde el catálogo nunca se pasa
                      por el paso 1, que es donde vivía la única forma de
                      contratarlas: el Salto de las 7 Cascadas quedaba invisible
                      para quien usaba el carrito. */}
                  {(() => {
                    const t = TOURS_DB.find((x) => x.slug === i.tourSlug);
                    const pax = personasDeItem(i);
                    return (t?.addOns ?? []).map((a) => {
                      const puestos = i.addOns?.find((x) => x.id === a.id)?.cantidad ?? 0;
                      const activo  = puestos > 0;
                      return (
                        <div key={a.id} className={`mt-2 border p-2.5 ${activo ? "border-verde-selva/50 bg-verde-selva/5" : "border-negro/10"}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-dm text-[12px] text-negro/80">{a.nombre}</p>
                              <p className="font-dm text-[11px] text-negro/45 leading-snug">{a.descripcion}</p>
                              <p className="font-dm text-[11px] text-verde-selva mt-0.5">+{formatMXN(a.precio)} por persona</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => cambiarAddOn(i, a.id, activo ? 0 : pax)}
                              className={`flex-shrink-0 text-[9px] tracking-[1.5px] uppercase font-dm px-2.5 py-1.5 border transition-colors ${
                                activo ? "border-verde-selva bg-verde-selva text-crema" : "border-negro/25 text-negro/60 hover:border-verde-selva"
                              }`}
                            >
                              {activo ? "Quitar" : "Agregar"}
                            </button>
                          </div>
                          {activo && (
                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-negro/8">
                              <span className="font-dm text-[11px] text-negro/55">¿Cuántos lo hacen?</span>
                              <span className="flex items-center gap-2">
                                <button type="button" aria-label="Menos" onClick={() => cambiarAddOn(i, a.id, Math.max(0, puestos - 1))}
                                  className="w-7 h-7 border border-negro/20 text-negro/60 hover:border-verde-selva text-sm">−</button>
                                <span className="font-dm text-[12px] text-negro/70 w-4 text-center">{puestos}</span>
                                <button type="button" aria-label="Más" onClick={() => cambiarAddOn(i, a.id, Math.min(pax, puestos + 1))}
                                  className="w-7 h-7 border border-negro/20 text-negro/60 hover:border-verde-selva text-sm">+</button>
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}

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
  );
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
        {/* A los 3 minutos sin cerrar la reserva. Se apaga solo cuando el
          cliente ya está en la pantalla de pago. */}
      <RescatePopup activo={items.length > 0 && !cobro} mensaje={waRescate} />
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

      {/* Dónde va y cuánto falta. Sin esto el carrito parecía un formulario sin
          fin: no había forma de saber si faltaban dos pantallas o diez. */}
      <div className="max-w-5xl mx-auto px-6 mb-8">
        <div className="flex items-center gap-2 sm:gap-3">
          {["Tu viaje", "Tus datos", "Pago"].map((etiqueta, n) => {
            const paso    = cobro ? 3 : (name.trim() && email.trim() ? 2 : 1);
            const hecho   = n + 1 < paso;
            const actual  = n + 1 === paso;
            return (
              <div key={etiqueta} className="flex items-center gap-2 sm:gap-3">
                <div className={`flex items-center gap-2 ${actual ? "text-verde-selva" : hecho ? "text-verde-selva/70" : "text-negro/30"}`}>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-dm font-medium ${
                    actual ? "bg-verde-selva text-white" : hecho ? "bg-verde-selva/20 text-verde-selva" : "border border-negro/20"
                  }`}>
                    {hecho ? "✓" : n + 1}
                  </span>
                  <span className="text-[11px] tracking-[1px] uppercase font-dm hidden sm:block">{etiqueta}</span>
                </div>
                {n < 2 && <div className={`h-px w-6 sm:w-10 ${hecho ? "bg-verde-selva/40" : "bg-negro/15"}`} />}
              </div>
            );
          })}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 grid lg:grid-cols-[1fr_380px] gap-10 items-start">

        {/* ── Renglones ── */}
        <div>
          <h1 className="font-cormorant font-light text-verde-profundo text-3xl mb-1">Tu viaje</h1>
          <p className="font-dm text-negro/50 text-sm mb-6">
            {items.length} {items.length === 1 ? "recorrido" : "recorridos"} · {dias} {dias === 1 ? "día" : "días"}
          </p>

          <div className="space-y-3">
          {/* Dos grupos: primero lo que BLOQUEA el pago (recorridos sin
              fecha, que entran así al agregarlos desde el catálogo) y después
              el itinerario ordenado por día. Antes salían en el orden en que
              se agregaron, así que un viaje de cuatro días se leía descolocado
              y no había forma de ver qué faltaba. */}
          {error && (
            <p className="mb-4 border border-terracota/40 bg-terracota/8 px-3 py-2.5 font-dm text-[12px] text-terracota">
              {error}
            </p>
          )}

          {sinFechaItems.length > 0 && (
            <div className="mb-6">
              <p className="flex items-center gap-2 font-dm text-[11px] tracking-[1.5px] uppercase text-terracota mb-2">
                <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
                Falta la fecha ({sinFechaItems.length})
              </p>
              <div className="space-y-3">
                {sinFechaItems.map((i) => Renglon(i))}
              </div>
            </div>
          )}

          {conFechaItems.length > 0 && (
            <div>
              {sinFechaItems.length > 0 && (
                <p className="font-dm text-[11px] tracking-[1.5px] uppercase text-negro/40 mb-2">
                  Tu itinerario
                </p>
              )}
              <div className="space-y-3">
                {conFechaItems.map((i) => Renglon(i))}
              </div>
            </div>
          )}
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

          {/* Agregar otro recorrido sin salir del carrito: antes había que
              volver al catálogo, buscarlo y regresar. */}
          <div className="mt-5">
            <button
              type="button"
              onClick={() => setMostrarLista((v) => !v)}
              aria-expanded={mostrarLista}
              className="w-full border border-dashed border-verde-selva/40 text-verde-selva hover:bg-verde-selva/5 py-3 text-[11px] tracking-[2px] uppercase font-dm transition-colors"
            >
              ＋ Agregar otro recorrido
            </button>

            {mostrarLista && (
              <div className="mt-3 border border-negro/10 bg-white divide-y divide-negro/8 max-h-80 overflow-y-auto">
                {TOURS_DB.filter((t) => !items.some((i) => i.tourSlug === t.slug)).map((t) => (
                  <button
                    key={t.slug}
                    type="button"
                    onClick={() => { agregarDelCatalogo(t.slug); setMostrarLista(false); }}
                    className="w-full flex items-center gap-3 p-3 hover:bg-verde-selva/5 text-left transition-colors"
                  >
                    <span className="relative w-14 h-11 flex-shrink-0 overflow-hidden">
                      <Image src={t.imagen_hero} alt="" fill className="object-cover" sizes="56px" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-dm text-[13px] text-negro/85 truncate">{t.nombre.split("—")[0].trim()}</span>
                      <span className="block font-dm text-[11px] text-negro/45">
                        {formatMXN(t.precio)} {t.precioUnidad === "vehiculo" ? "por vehículo" : "por persona"}
                      </span>
                    </span>
                    <span className="flex-shrink-0 text-verde-selva font-dm text-lg" aria-hidden="true">+</span>
                  </button>
                ))}
                {TOURS_DB.every((t) => items.some((i) => i.tourSlug === t.slug)) && (
                  <p className="p-4 font-dm text-[12px] text-negro/45 text-center">
                    Ya tienes todos los recorridos en el carrito.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ── HOSPEDAJE OPCIONAL ─────────────────────────────────────────
              Apagado por defecto y dicho con todas sus letras: la promesa del
              sitio es que pasamos por ti a CUALQUIER hospedaje, y muchos ya
              vienen con hotel. Ofrecerlo sin presionar es la diferencia entre
              un extra y una molestia. */}
          <section className="mt-8 border border-negro/10 bg-white p-5">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={conHotel}
                onChange={(e) => { setConHotel(e.target.checked); setCobro(null); }}
                className="mt-1 w-4 h-4 accent-verde-selva"
              />
              <span>
                <span className="block font-cormorant text-verde-profundo text-xl">
                  ¿Quieres que también te hospedemos?
                </span>
                <span className="block font-dm text-[12px] text-negro/50 mt-0.5">
                  En nuestro Hotel Paraíso Encantado, en Xilitla. Es opcional: pasamos por ti aunque te quedes en otro lado.
                </span>
              </span>
            </label>

            {conHotel && (
              <div className="mt-5 space-y-4">
                <div className="grid sm:grid-cols-2 gap-3">
                  {HABITACIONES_HOTEL.map((h) => {
                    const idx    = habs.findIndex((x) => x.habitacionId === h.id);
                    const activa = idx >= 0;
                    return (
                      <div key={h.id} className={`border overflow-hidden transition-colors ${activa ? "border-verde-selva" : "border-negro/12"}`}>
                        <button
                          type="button"
                          onClick={() => {
                            setCobro(null);
                            setHabs((prev) =>
                              activa
                                ? prev.filter((x) => x.habitacionId !== h.id)
                                : [...prev, { habitacionId: h.id, huespedes: Math.min(2, h.maxHuespedes) }],
                            );
                          }}
                          className="w-full text-left"
                        >
                          <span className="relative block h-28">
                            <Image src={h.imagen} alt={h.nombre} fill className="object-cover" sizes="(max-width: 640px) 100vw, 300px" />
                            {activa && (
                              <span className="absolute inset-0 bg-verde-selva/25 flex items-center justify-center">
                                <span className="bg-verde-selva text-crema text-[9px] tracking-[2px] uppercase font-dm px-2 py-1">Elegida</span>
                              </span>
                            )}
                            {h.vistaMontana && (
                              <span className="absolute top-2 left-2 bg-dorado text-negro text-[8px] tracking-[1px] uppercase font-dm px-1.5 py-0.5">
                                Vista a la montaña
                              </span>
                            )}
                          </span>
                          <span className="block px-3 pt-3">
                            <span className="block font-dm text-[13px] text-negro/85">{h.nombre}</span>
                            <span className="block font-dm text-[11px] text-negro/45 leading-snug mt-0.5">
                              {h.vista} · hasta {h.maxHuespedes} personas · desde {formatMXN(h.tarifas[2] ?? h.tarifas[1])}/noche
                            </span>
                          </span>
                        </button>

                        {/* Cuánta gente duerme AQUÍ. Con cinco personas hacen
                            falta dos habitaciones, y el reparto lo decide el
                            cliente porque cambia el precio. */}
                        {activa && (
                          <div className="flex items-center justify-between px-3 py-2 border-t border-negro/8 mt-2">
                            <span className="font-dm text-[11px] text-negro/55">Duermen aquí</span>
                            <span className="flex items-center gap-2">
                              <button type="button" aria-label={`Menos huéspedes en ${h.nombre}`}
                                onClick={() => { setCobro(null); setHabs((prev) => prev.map((x) => x.habitacionId === h.id ? { ...x, huespedes: Math.max(1, x.huespedes - 1) } : x)); }}
                                className="w-7 h-7 border border-negro/20 text-negro/60 hover:border-verde-selva text-sm">−</button>
                              <span className="font-dm text-[12px] text-negro/80 w-4 text-center">{habs[idx].huespedes}</span>
                              <button type="button" aria-label={`Más huéspedes en ${h.nombre}`}
                                onClick={() => { setCobro(null); setHabs((prev) => prev.map((x) => x.habitacionId === h.id ? { ...x, huespedes: Math.min(h.maxHuespedes, x.huespedes + 1) } : x)); }}
                                disabled={habs[idx].huespedes >= h.maxHuespedes}
                                className="w-7 h-7 border border-negro/20 text-negro/60 hover:border-verde-selva text-sm disabled:opacity-30">+</button>
                            </span>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => setDetalleHab(detalleHab === h.id ? null : h.id)}
                          aria-expanded={detalleHab === h.id}
                          className="w-full px-3 py-2 border-t border-negro/8 font-dm text-[11px] text-verde-selva hover:bg-verde-selva/5 transition-colors text-left"
                        >
                          {detalleHab === h.id ? "Ocultar detalles" : "Ver más detalles"}
                        </button>

                        {detalleHab === h.id && (
                          <div className="px-3 pb-3 space-y-2">
                            <p className="font-dm text-[12px] text-negro/60 leading-snug">{h.descripcion}</p>
                            <p className="font-dm text-[11px] tracking-[1.5px] uppercase text-negro/35">{h.categoria}</p>
                            <ul className="space-y-0.5">
                              {h.caracteristicas.map((c) => (
                                <li key={c} className="font-dm text-[12px] text-negro/55">· {c}</li>
                              ))}
                            </ul>
                            <div className="border-t border-negro/8 pt-2">
                              <p className="font-dm text-[10px] tracking-[1.5px] uppercase text-negro/35 mb-1">Precio por noche</p>
                              {Object.entries(h.tarifas)
                                .filter(([n]) => Number(n) >= 2)
                                .map(([n, precio]) => (
                                  <p key={n} className="flex justify-between font-dm text-[12px] text-negro/55">
                                    <span>{n} persona{Number(n) > 1 ? "s" : ""}</span>
                                    <span>{formatMXN(precio as number)}</span>
                                  </p>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {habs.length === 0 && (
                  <p className="font-dm text-[12px] text-terracota">Elige al menos una habitación.</p>
                )}

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-dm text-[11px] tracking-[1.5px] uppercase text-negro/45 mb-1.5">
                      Entrada
                    </label>
                    <input
                      type="date" value={checkin} min={minDate}
                      onChange={(e) => { setCheckin(e.target.value); setCobro(null); }}
                      className="w-full border border-negro/15 bg-white px-3 py-2.5 font-dm text-sm text-negro focus:border-verde-selva outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-dm text-[11px] tracking-[1.5px] uppercase text-negro/45 mb-1.5">
                      Salida
                    </label>
                    <input
                      type="date" value={checkout} min={checkin || minDate}
                      onChange={(e) => { setCheckout(e.target.value); setCobro(null); }}
                      className="w-full border border-negro/15 bg-white px-3 py-2.5 font-dm text-sm text-negro focus:border-verde-selva outline-none"
                    />
                  </div>
                </div>

                {/* El total de huéspedes ya no se pone aquí: sale de sumar lo
                    que el cliente asignó a cada habitación. Con cinco personas
                    eso obliga a elegir dos habitaciones, que es la verdad
                    operativa: ninguna admite cinco. */}
                <p className="font-dm text-[12px] text-negro/55">
                  {huespedes} huésped{huespedes !== 1 ? "es" : ""} en {habs.length} habitación{habs.length !== 1 ? "es" : ""}
                </p>

                {checkin && checkout && noches <= 0 && (
                  <p className="font-dm text-[12px] text-terracota">
                    La salida tiene que ser al menos un día después de la entrada.
                  </p>
                )}

                {hotelQuote && !hotelQuote.ok && (
                  <p className="font-dm text-[12px] text-terracota">{hotelQuote.error}</p>
                )}

                {hotelQuote?.ok && (
                  <div className="border-t border-negro/8 pt-3 space-y-1">
                    <p className="flex justify-between font-dm text-[13px] text-negro/70">
                      <span>{noches} noche{noches > 1 ? "s" : ""} · {huespedes} huésped{huespedes > 1 ? "es" : ""} · {hotelQuote.desglose?.length} habitación{(hotelQuote.desglose?.length ?? 1) > 1 ? "es" : ""}</span>
                      <span className="whitespace-nowrap">
                        {/* El precio tachado hace visible el descuento. Antes
                            solo se veía el total ya rebajado, así que la
                            promoción no se notaba y no empujaba a nadie a
                            quedarse la tercera noche. */}
                        {(hotelQuote.nochesGratis ?? 0) > 0 && (
                          <span className="text-negro/35 line-through mr-2">{formatMXN(hotelQuote.totalSinPromo ?? 0)}</span>
                        )}
                        <strong>{formatMXN(totalHotel)} MXN</strong>
                      </span>
                    </p>
                    {(hotelQuote.nochesGratis ?? 0) > 0 && (
                      <p className="font-dm text-[12px] text-verde-selva bg-verde-selva/8 border border-verde-selva/25 px-2.5 py-1.5">
                        🎁 {hotelQuote.nochesGratis === 1 ? "La 3.ª noche va gratis" : `${hotelQuote.nochesGratis} noches gratis`}: te ahorras {formatMXN(hotelQuote.ahorro ?? 0)}.
                      </p>
                    )}
                    {noches === 2 && (
                      <p className="font-dm text-[12px] text-dorado">
                        Si te quedas una noche más, <strong>la 3.ª va gratis</strong> — pagarías lo mismo.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* ── HOSPEDAJE OPCIONAL ─────────────────────────────────────────
              Apagado por defecto y dicho con todas sus letras: la promesa del
              sitio es que pasamos por ti a CUALQUIER hospedaje, y muchos ya
              vienen con hotel. Ofrecerlo sin presionar es la diferencia entre
              un extra y una molestia. */}
          <section className="mt-8 border border-negro/10 bg-white p-5">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={conHotel}
                onChange={(e) => { setConHotel(e.target.checked); setCobro(null); }}
                className="mt-1 w-4 h-4 accent-verde-selva"
              />
              <span>
                <span className="block font-cormorant text-verde-profundo text-xl">
                  ¿Quieres que también te hospedemos?
                </span>
                <span className="block font-dm text-[12px] text-negro/50 mt-0.5">
                  En nuestro Hotel Paraíso Encantado, en Xilitla. Es opcional: pasamos por ti aunque te quedes en otro lado.
                </span>
              </span>
            </label>

            {conHotel && (
              <div className="mt-5 space-y-4">
                <div className="grid sm:grid-cols-2 gap-3">
                  {HABITACIONES_HOTEL.map((h) => {
                    const idx    = habs.findIndex((x) => x.habitacionId === h.id);
                    const activa = idx >= 0;
                    return (
                      <div key={h.id} className={`border overflow-hidden transition-colors ${activa ? "border-verde-selva" : "border-negro/12"}`}>
                        <button
                          type="button"
                          onClick={() => {
                            setCobro(null);
                            setHabs((prev) =>
                              activa
                                ? prev.filter((x) => x.habitacionId !== h.id)
                                : [...prev, { habitacionId: h.id, huespedes: Math.min(2, h.maxHuespedes) }],
                            );
                          }}
                          className="w-full text-left"
                        >
                          <span className="relative block h-28">
                            <Image src={h.imagen} alt={h.nombre} fill className="object-cover" sizes="(max-width: 640px) 100vw, 300px" />
                            {activa && (
                              <span className="absolute inset-0 bg-verde-selva/25 flex items-center justify-center">
                                <span className="bg-verde-selva text-crema text-[9px] tracking-[2px] uppercase font-dm px-2 py-1">Elegida</span>
                              </span>
                            )}
                            {h.vistaMontana && (
                              <span className="absolute top-2 left-2 bg-dorado text-negro text-[8px] tracking-[1px] uppercase font-dm px-1.5 py-0.5">
                                Vista a la montaña
                              </span>
                            )}
                          </span>
                          <span className="block px-3 pt-3">
                            <span className="block font-dm text-[13px] text-negro/85">{h.nombre}</span>
                            <span className="block font-dm text-[11px] text-negro/45 leading-snug mt-0.5">
                              {h.vista} · hasta {h.maxHuespedes} personas · desde {formatMXN(h.tarifas[2] ?? h.tarifas[1])}/noche
                            </span>
                          </span>
                        </button>

                        {/* Cuánta gente duerme AQUÍ. Con cinco personas hacen
                            falta dos habitaciones, y el reparto lo decide el
                            cliente porque cambia el precio. */}
                        {activa && (
                          <div className="flex items-center justify-between px-3 py-2 border-t border-negro/8 mt-2">
                            <span className="font-dm text-[11px] text-negro/55">Duermen aquí</span>
                            <span className="flex items-center gap-2">
                              <button type="button" aria-label={`Menos huéspedes en ${h.nombre}`}
                                onClick={() => { setCobro(null); setHabs((prev) => prev.map((x) => x.habitacionId === h.id ? { ...x, huespedes: Math.max(1, x.huespedes - 1) } : x)); }}
                                className="w-7 h-7 border border-negro/20 text-negro/60 hover:border-verde-selva text-sm">−</button>
                              <span className="font-dm text-[12px] text-negro/80 w-4 text-center">{habs[idx].huespedes}</span>
                              <button type="button" aria-label={`Más huéspedes en ${h.nombre}`}
                                onClick={() => { setCobro(null); setHabs((prev) => prev.map((x) => x.habitacionId === h.id ? { ...x, huespedes: Math.min(h.maxHuespedes, x.huespedes + 1) } : x)); }}
                                disabled={habs[idx].huespedes >= h.maxHuespedes}
                                className="w-7 h-7 border border-negro/20 text-negro/60 hover:border-verde-selva text-sm disabled:opacity-30">+</button>
                            </span>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => setDetalleHab(detalleHab === h.id ? null : h.id)}
                          aria-expanded={detalleHab === h.id}
                          className="w-full px-3 py-2 border-t border-negro/8 font-dm text-[11px] text-verde-selva hover:bg-verde-selva/5 transition-colors text-left"
                        >
                          {detalleHab === h.id ? "Ocultar detalles" : "Ver más detalles"}
                        </button>

                        {detalleHab === h.id && (
                          <div className="px-3 pb-3 space-y-2">
                            <p className="font-dm text-[12px] text-negro/60 leading-snug">{h.descripcion}</p>
                            <p className="font-dm text-[11px] tracking-[1.5px] uppercase text-negro/35">{h.categoria}</p>
                            <ul className="space-y-0.5">
                              {h.caracteristicas.map((c) => (
                                <li key={c} className="font-dm text-[12px] text-negro/55">· {c}</li>
                              ))}
                            </ul>
                            <div className="border-t border-negro/8 pt-2">
                              <p className="font-dm text-[10px] tracking-[1.5px] uppercase text-negro/35 mb-1">Precio por noche</p>
                              {Object.entries(h.tarifas)
                                .filter(([n]) => Number(n) >= 2)
                                .map(([n, precio]) => (
                                  <p key={n} className="flex justify-between font-dm text-[12px] text-negro/55">
                                    <span>{n} persona{Number(n) > 1 ? "s" : ""}</span>
                                    <span>{formatMXN(precio as number)}</span>
                                  </p>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {habs.length === 0 && (
                  <p className="font-dm text-[12px] text-terracota">Elige al menos una habitación.</p>
                )}

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-dm text-[11px] tracking-[1.5px] uppercase text-negro/45 mb-1.5">
                      Entrada
                    </label>
                    <input
                      type="date" value={checkin} min={minDate}
                      onChange={(e) => { setCheckin(e.target.value); setCobro(null); }}
                      className="w-full border border-negro/15 bg-white px-3 py-2.5 font-dm text-sm text-negro focus:border-verde-selva outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-dm text-[11px] tracking-[1.5px] uppercase text-negro/45 mb-1.5">
                      Salida
                    </label>
                    <input
                      type="date" value={checkout} min={checkin || minDate}
                      onChange={(e) => { setCheckout(e.target.value); setCobro(null); }}
                      className="w-full border border-negro/15 bg-white px-3 py-2.5 font-dm text-sm text-negro focus:border-verde-selva outline-none"
                    />
                  </div>
                </div>

                {/* El total de huéspedes ya no se pone aquí: sale de sumar lo
                    que el cliente asignó a cada habitación. Con cinco personas
                    eso obliga a elegir dos habitaciones, que es la verdad
                    operativa: ninguna admite cinco. */}
                <p className="font-dm text-[12px] text-negro/55">
                  {huespedes} huésped{huespedes !== 1 ? "es" : ""} en {habs.length} habitación{habs.length !== 1 ? "es" : ""}
                </p>

                {checkin && checkout && noches <= 0 && (
                  <p className="font-dm text-[12px] text-terracota">
                    La salida tiene que ser al menos un día después de la entrada.
                  </p>
                )}

                {hotelQuote && !hotelQuote.ok && (
                  <p className="font-dm text-[12px] text-terracota">{hotelQuote.error}</p>
                )}

                {hotelQuote?.ok && (
                  <div className="border-t border-negro/8 pt-3 space-y-1">
                    <p className="flex justify-between font-dm text-[13px] text-negro/70">
                      <span>{noches} noche{noches > 1 ? "s" : ""} · {huespedes} huésped{huespedes > 1 ? "es" : ""} · {hotelQuote.desglose?.length} habitación{(hotelQuote.desglose?.length ?? 1) > 1 ? "es" : ""}</span>
                      <span className="whitespace-nowrap">
                        {/* El precio tachado hace visible el descuento. Antes
                            solo se veía el total ya rebajado, así que la
                            promoción no se notaba y no empujaba a nadie a
                            quedarse la tercera noche. */}
                        {(hotelQuote.nochesGratis ?? 0) > 0 && (
                          <span className="text-negro/35 line-through mr-2">{formatMXN(hotelQuote.totalSinPromo ?? 0)}</span>
                        )}
                        <strong>{formatMXN(totalHotel)} MXN</strong>
                      </span>
                    </p>
                    {(hotelQuote.nochesGratis ?? 0) > 0 && (
                      <p className="font-dm text-[12px] text-verde-selva bg-verde-selva/8 border border-verde-selva/25 px-2.5 py-1.5">
                        🎁 {hotelQuote.nochesGratis === 1 ? "La 3.ª noche va gratis" : `${hotelQuote.nochesGratis} noches gratis`}: te ahorras {formatMXN(hotelQuote.ahorro ?? 0)}.
                      </p>
                    )}
                    {noches === 2 && (
                      <p className="font-dm text-[12px] text-dorado">
                        Si te quedas una noche más, <strong>la 3.ª va gratis</strong> — pagarías lo mismo.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>

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

        </div>

        {/* ── Resumen y pago ── */}
        <aside className="border border-negro/10 bg-white p-6 lg:sticky lg:top-24">
          {/* Mismo resumen que el checkout de un tour: qué se aparta, qué va
              incluido en cada recorrido, la logística y los números. */}
          <ResumenReserva
            items={[...items.map((i) => {
              const t = TOURS_DB.find((x) => x.slug === i.tourSlug);
              return {
                nombre:  i.tourName,
                fecha:   i.tourDate,
                detalle: i.unidades
                  ? `${i.ruta} · ${i.unidades} × ${i.vehiculo}`
                  : `${personasDeItem(i)} ${personasDeItem(i) === 1 ? "persona" : "personas"}`,
                subtotal: i.total,
                incluye:  [...(t?.incluye ?? []), ...INCLUYE_SIEMPRE],
                eleccion: i.eleccion,
              };
            }), ...(hotelQuote?.ok ? [{
              nombre:  `Hospedaje · Hotel Paraíso Encantado`,
              // Fechas de verdad, no "Falta la fecha": el hospedaje va de un
              // día a otro y ya se eligieron arriba.
              fechaTexto: `${formatTourDate(checkin)} → ${formatTourDate(checkout)} · ${noches} noche${noches > 1 ? "s" : ""}`,
              // Qué habitación y cuánta gente duerme en cada una.
              detalle: (hotelQuote.desglose ?? [])
                .map((d) => `${d.habitacion} (${d.huespedes} persona${d.huespedes > 1 ? "s" : ""})`)
                .join(" + "),
              extras:  [...SERVICIOS_HOTEL],
              subtotal: totalHotel,
              incluye: [
                ...(hotelQuote.desglose ?? []).map(
                  (d) => `${d.habitacion} · ${d.huespedes} persona${d.huespedes > 1 ? "s" : ""} · ${formatMXN(d.porNoche)}/noche`,
                ),
                ...((hotelQuote.nochesGratis ?? 0) > 0
                  ? [`${hotelQuote.nochesGratis} noche${(hotelQuote.nochesGratis ?? 0) > 1 ? "s" : ""} gratis — te ahorras ${formatMXN(hotelQuote.ahorro ?? 0)}`]
                  : []),
                ...SERVICIOS_HOTEL,
              ],
            }] : [])]}
            total={total}
            pagaHoy={anticipo}
            saldo={saldo}
            pct={30}
          />

          {!cobro ? (
            <div className="pt-4 space-y-3">
              <input
                value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Nombre completo *"
                className="w-full border border-negro/15 bg-white px-3 py-3 font-dm text-sm text-negro placeholder:text-negro/40 focus:border-verde-selva outline-none"
              />
              <input
                value={email} onChange={(e) => setEmail(e.target.value)}
                type="email" placeholder="Correo electrónico *"
                className="w-full border border-negro/15 bg-white px-3 py-3 font-dm text-sm text-negro placeholder:text-negro/40 focus:border-verde-selva outline-none"
              />
              <input
                value={phone} onChange={(e) => setPhone(e.target.value)}
                type="tel" placeholder="WhatsApp (opcional)"
                className="w-full border border-negro/15 bg-white px-3 py-3 font-dm text-sm text-negro placeholder:text-negro/40 focus:border-verde-selva outline-none"
              />
              <input
                value={pickup} onChange={(e) => setPickup(e.target.value)}
                placeholder="¿Dónde te hospedas? (Xilitla o Cd. Valles)"
                className="w-full border border-negro/15 bg-white px-3 py-3 font-dm text-sm text-negro placeholder:text-negro/40 focus:border-verde-selva outline-none"
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
              {restante > 0 ? (
                <p className="mb-3 flex items-center gap-2 border border-dorado/35 bg-dorado/10 px-3 py-2.5 font-dm text-[12px] text-negro/70">
                  <Clock className="w-4 h-4 text-dorado flex-shrink-0" aria-hidden="true" />
                  <span>
                    Te apartamos tus lugares{conHotel && hotelQuote?.ok ? " y la habitación" : ""} por{" "}
                    <strong className="text-negro tabular-nums">
                      {Math.floor(restante / 60)}:{String(restante % 60).padStart(2, "0")}
                    </strong>
                  </span>
                </p>
              ) : (
                expiraEn !== null && (
                  <p className="mb-3 border border-terracota/40 bg-terracota/8 px-3 py-2.5 font-dm text-[12px] text-terracota">
                    Se acabó el apartado. Puedes seguir pagando, pero vuelve a revisar el resumen por si algo cambió.
                  </p>
                )
              )}
              <Elements stripe={stripePromise} options={{ clientSecret: cobro.clientSecret, locale: "es" }}>
                <PagoCarrito cobro={cobro} datos={{ name, email, phone, pickup, checkin, checkout }} onListo={() => setItems([])} />
              </Elements>
            </div>
          )}
        </aside>
      </div>

      {/* La prueba social y las preguntas van al FINAL, a lo ancho: arriba
          empujaban el resumen y el pago fuera de la pantalla justo cuando el
          cliente iba a decidir. Quedan en el orden en que hacen falta —primero
          "otros ya lo hicieron", luego las dudas concretas. */}
      <div className="max-w-5xl mx-auto px-6">

          {/* ── PREGUNTAS DE ÚLTIMO MINUTO ─────────────────────────────────
            Las dudas que frenan el pago. Todas las respuestas salen de lo que
            el sitio ya dice en la política de cancelación y en las fichas. */}
        <section className="mt-14">
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
    </main>
  );
}
