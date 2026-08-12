"use client";

import { useState, useEffect, useRef } from "react";
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
import { itemDesdeSlug } from "@/lib/carritoItems";
import { TRASLADOS, getTraslado, tarifaTraslado, precioBase } from "@/lib/traslados";
import { HABITACIONES_HOTEL, SERVICIOS_HOTEL, cotizarHabitaciones, getHabitacion, tarifaNoche } from "@/lib/habitaciones";
import { formatMXN, formatTourDate, minBookingDate, calcTourTotal } from "@/lib/tourBooking";
import { TOURS_DB, incluyeDeTour } from "@/lib/tours";
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
  lineItems: { tourSlug?: string; tourName: string; tourDate: string; adults: number; children: number; subtotal: number; eleccion?: string }[];
  hospedaje: { habitacion: string; noches: number; huespedes: number; total: number; ahorro: number } | null;
  traslado:  { ciudad: string; personas: number; total: number } | null;
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
      // El folio real lo devuelve `send-confirmation`. Antes se ignoraba la
      // respuesta y la pantalla de éxito acababa enseñando `undefined` donde va
      // el número que el cliente tiene que presentarle al guía.
      let confirmationNumber = "";
      try {
        const res = await fetch("/api/tours/send-confirmation", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email:         datos.email,
            customerName:  datos.name,
            customerPhone: datos.phone || null,
            notes: [
              datos.pickup.trim() ? `Recogida: ${datos.pickup.trim()}` : null,
              `Reserva de ${cobro.lineItems.length} recorridos en un solo pago.`,
              // Sin esto, el equipo recibía la Ruta Acuática sin saber si el
              // cliente eligió las Siete Cascadas o Tamasopo.
              ...cobro.lineItems
                .filter((l) => l.eleccion)
                .map((l) => `${l.tourName.split("—")[0].trim()} — eligió: ${l.eleccion}`),
              cobro.hospedaje
                ? `Hospedaje: ${cobro.hospedaje.habitacion}, ${cobro.hospedaje.noches} noche(s), ${cobro.hospedaje.huespedes} huésped(es)${datos.checkin ? ` — entrada ${datos.checkin}` : ""}${datos.checkout ? `, salida ${datos.checkout}` : ""}.`
                : null,
              // El traslado hay que operarlo: sin esto el equipo cobraba un
              // viaje desde otra ciudad y no se enteraba de que existía.
              cobro.traslado
                ? `TRASLADO: ${cobro.traslado.ciudad} → Xilitla, ida y vuelta, ${cobro.traslado.personas} pasajero(s). Falta acordar hora y domicilio de recogida.`
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
              ...(cobro.traslado
                ? [{
                    tourName: `Traslado ${cobro.traslado.ciudad} → Xilitla (ida y vuelta)`,
                    tourDate: primero.tourDate,
                    adults:   cobro.traslado.personas,
                    children: 0,
                    subtotal: cobro.traslado.total,
                  }]
                : []),
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
        const datosRes = await res.json().catch(() => null);
        if (datosRes?.confirmationNumber) confirmationNumber = datosRes.confirmationNumber;
      } catch {
        // Si el correo falla, el pago YA se hizo. El webhook de Stripe levanta
        // la reserva igual, así que no se le dice al cliente que falló nada.
      }

      const totalAdultos = cobro.lineItems.reduce((s, l) => s + l.adults, 0);
      const totalNinos   = cobro.lineItems.reduce((s, l) => s + l.children, 0);

      trackPurchase({
        confirmationNumber: confirmationNumber || cobro.paymentIntentId,
        tourId:   primero.tourName,
        tourName: resumen,
        total:    cobro.amount,
        adults:   totalAdultos,
        children: totalNinos,
      });
      trackTourEvent("BOOKING_CONFIRMED", { carrito: true, amount: cobro.amount, total: cobro.total });

      // ⚠️ Esta forma la dicta `ConfirmationData` en
      // `app/reservar-tour/confirmacion/page.tsx`. El carrito escribía sus
      // propios nombres (`charged`, `name`, `email`) y la pantalla de éxito
      // salía sin nombre, sin folio y —lo peor— enseñando el TOTAL donde va lo
      // COBRADO: le decía al cliente que había pagado el viaje entero cuando
      // solo dio el anticipo. Si cambias un campo aquí, cámbialo allá.
      sessionStorage.setItem("hp_tour_confirmation", JSON.stringify({
        confirmationNumber: confirmationNumber || cobro.paymentIntentId,
        tourName:      resumen,
        tourSlug:      primero.tourSlug ?? "",
        tourDate:      primero.tourDate,
        adults:        totalAdultos,
        children:      totalNinos,
        total:         cobro.total,
        chargeAmount:  cobro.amount,
        paymentMode:   "deposit",
        customerName:  datos.name,
        customerEmail: datos.email,
        // El itinerario completo: un carrito de cuatro días que confirma
        // diciendo solo "4 recorridos" desperdicia el momento de más confianza.
        lineItems: [
          ...cobro.lineItems.map((l) => ({
            tourName: l.tourName, tourDate: l.tourDate,
            adults: l.adults, children: l.children, subtotal: l.subtotal,
          })),
          ...(cobro.traslado
            ? [{
                tourName: `Traslado ${cobro.traslado.ciudad} → Xilitla (ida y vuelta)`,
                tourDate: primero.tourDate,
                adults:   cobro.traslado.personas,
                children: 0,
                subtotal: cobro.traslado.total,
              }]
            : []),
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
  /**
   * Hay un `?agregar` pendiente de resolver. Sin esto, quien llega desde el
   * botón de una ficha de tour ve "Tu carrito está vacío" durante un frame,
   * justo en el aterrizaje que se quiere cuidar.
   */
  const [hidratando, setHidratando] = useState(true);
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
  // Traslado desde la ciudad de origen. Apagado por defecto igual que el hotel:
  // quien llega en su coche no tiene por qué ver un cargo que no pidió.
  const [conTraslado,    setConTraslado]    = useState(false);
  const [ciudadTraslado, setCiudadTraslado] = useState<string>(TRASLADOS[0].slug);
  const [paxTraslado,    setPaxTraslado]    = useState(2);
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
  /** El campo de nombre, para poder llevar ahí desde la barra fija de móvil. */
  const nombreRef = useRef<HTMLInputElement | null>(null);
  /** Cada renglón, para poder llevar la vista al que toca. */
  const renglonRefs = useRef<Record<string, HTMLDivElement | null>>({});
  /** Renglón que acaba de llegar por `?agregar`: se resalta un momento. */
  const [recienLlegado, setRecienLlegado] = useState<string | null>(null);

  useEffect(() => {
    setMontado(true);

    // `?agregar=<slug>` es cómo entra un recorrido desde el resto del sitio.
    // Las páginas de tour, destino, blog y precios se pintan en el servidor y
    // ahí no existe `localStorage`, así que en vez de que cada botón sepa
    // escribir el carrito, mandan la intención en la URL y ese trabajo pasa
    // aquí, en el único sitio que toca el carrito.
    const params = new URLSearchParams(window.location.search);
    const pedido = params.get("agregar");

    let carrito = leerCarrito();
    if (pedido) {
      const yaEsta = carrito.find((i) => i.tourSlug === pedido);
      if (yaEsta) {
        // No se duplica: quien vuelve a pulsar "Reservar" del mismo tour
        // quiere verlo, no llevarlo dos veces. Se le lleva al renglón.
        setRecienLlegado(yaEsta.uid);
      } else {
        const nuevo = itemDesdeSlug(pedido);
        if (nuevo) {
          carrito = agregarAlCarrito(nuevo);
          setRecienLlegado(carrito[carrito.length - 1]?.uid ?? null);
        }
      }
      // Se limpia la URL para que recargar no vuelva a hacer lo mismo.
      window.history.replaceState({}, "", "/reservar/carrito");
    }
    setItems(carrito);
    setHidratando(false);
  }, []);

  // Lleva la vista al recorrido que acaba de entrar y apaga el resalte.
  useEffect(() => {
    if (!recienLlegado) return;
    const nodo = renglonRefs.current[recienLlegado];
    nodo?.scrollIntoView({ behavior: "smooth", block: "center" });
    const id = setTimeout(() => setRecienLlegado(null), 2600);
    return () => clearTimeout(id);
  }, [recienLlegado]);

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
  const rutaTraslado      = conTraslado ? getTraslado(ciudadTraslado) : undefined;
  const precioDelTraslado = rutaTraslado ? (tarifaTraslado(rutaTraslado, paxTraslado)?.precio ?? null) : null;
  const totalTraslado     = precioDelTraslado ?? 0;

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
  const total    = resumen.total + totalHotel + totalTraslado;
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
    const item = itemDesdeSlug(slug);
    if (!item) return;
    setItems(agregarAlCarrito(item));
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
  /**
   * Suma o resta gente de un tramo concreto y recalcula el subtotal.
   *
   * `calcTourTotal` es la MISMA función que usa el servidor, así que los
   * tramos de menor (70 % de 6 a 10 años, 50 % por debajo de 6) salen igual
   * aquí que al cobrar.
   */
  function cambiarPersonas(
    i: CarritoItem,
    campo: "adults" | "childrenMid" | "childrenSmall",
    delta: number,
  ) {
    const tour = TOURS_DB.find((t) => t.slug === i.tourSlug);
    if (!tour) return;

    // Los adultos no pueden bajar del mínimo del tour; los menores sí llegan a
    // cero. Y entre todos no pueden pasar del cupo.
    const piso  = campo === "adults" ? Math.max(1, tour.groupMin) : 0;
    const otros = (["adults", "childrenMid", "childrenSmall"] as const)
      .filter((c) => c !== campo)
      .reduce((s, c) => s + (i[c] ?? 0), 0);
    const valor = Math.min(
      tour.groupMax - otros,
      Math.max(piso, (i[campo] ?? 0) + delta),
    );

    const adultos       = campo === "adults"        ? valor : i.adults;
    const childrenMid   = campo === "childrenMid"   ? valor : i.childrenMid;
    const childrenSmall = campo === "childrenSmall" ? valor : i.childrenSmall;

    // El mínimo del tour (el rafting no sale con menos de 4) cuenta a TODOS los
    // que van, no solo a los adultos.
    if (adultos + childrenMid + childrenSmall < tour.groupMin) return;

    const { total } = calcTourTotal(tour.precio, adultos, childrenMid, childrenSmall, 0);
    // Los add-ons se topan a la gente que va: si el grupo baja, la actividad
    // opcional no puede quedar contratada para más personas de las que quedan.
    const addOns = (i.addOns ?? [])
      .map((a) => ({ ...a, cantidad: Math.min(a.cantidad, adultos + childrenMid + childrenSmall) }))
      .filter((a) => a.cantidad > 0);
    const extras = addOns.reduce((s, a) => {
      const c = tour.addOns?.find((x) => x.id === a.id);
      return s + (c ? c.precio * a.cantidad : 0);
    }, 0);
    cambiar(i.uid, { adults: adultos, childrenMid, childrenSmall, addOns, total: total + extras });
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
    // Un recorrido con elección obligatoria y sin elegir no se puede operar: el
    // equipo no sabría a dónde llevarlo.
    const sinEleccion = items.filter((i) => {
      const t = TOURS_DB.find((x) => x.slug === i.tourSlug);
      return t?.eleccion && !i.eleccion;
    });
    if (sinEleccion.length > 0) {
      setError(`Falta elegir el recorrido de ${sinEleccion[0].tourName.split("—")[0].trim()}.`);
      return;
    }
    const bajoMinimo = items.filter((i) => {
      const t = TOURS_DB.find((x) => x.slug === i.tourSlug);
      return t && !i.unidades && personasDeItem(i) < t.groupMin;
    });
    if (bajoMinimo.length > 0) {
      const t = TOURS_DB.find((x) => x.slug === bajoMinimo[0].tourSlug)!;
      setError(`${t.nombre.split("—")[0].trim()} sale a partir de ${t.groupMin} personas.`);
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
          traslado: conTraslado && rutaTraslado
            ? { ciudad: rutaTraslado.slug, personas: paxTraslado }
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
    <div
      key={i.uid + i.tourDate}
      ref={(el) => { renglonRefs.current[i.uid] = el; }}
      className={`animate-slide-up flex gap-3 sm:gap-4 border bg-white p-3 sm:p-4 transition-colors duration-500 ${
        recienLlegado === i.uid ? "border-verde-selva ring-2 ring-verde-selva/25" : "border-negro/10"
      }`}
    >
                  <div className="relative w-16 h-14 sm:w-24 sm:h-20 flex-shrink-0 overflow-hidden">
                    <Image src={i.tourImage} alt={i.tourName} fill className="object-cover" sizes="(max-width: 640px) 64px, 96px" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {/* Título, precio y papelera en la MISMA línea.
                      El precio vivía en una tercera columna del renglón y en un
                      teléfono no cabía: con la foto, el selector de fecha y los
                      contadores, la fila se pasaba del ancho de la tarjeta y el
                      precio y el bote de basura quedaban cortados contra el
                      borde de la pantalla. El importe es justo el dato que la
                      persona busca al revisar su carrito. */}
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-cormorant text-verde-profundo text-lg leading-tight min-w-0">
                        {i.tourName.split("—")[0].trim()}
                      </p>
                      <span className="flex items-center gap-2 flex-shrink-0">
                        <span className="font-cormorant text-dorado text-lg sm:text-xl whitespace-nowrap">{formatMXN(i.total)}</span>
                        <button
                          onClick={() => quitar(i.uid)}
                          aria-label={`Quitar ${i.tourName}`}
                          className="w-8 h-8 -mr-1.5 flex items-center justify-center text-negro/30 hover:text-terracota transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </span>
                    </div>
  
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
                        // Adultos y menores por separado. Antes solo se podían
                        // sumar adultos, así que una familia con dos niños
                        // pagaba cuatro boletos completos en el carrito y solo
                        // veía la tarifa de menor si entraba por la ficha del
                        // tour. Los tramos son los mismos de siempre:
                        // 6–10 años al 70 %, menores de 6 al 50 %.
                        <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                          {([
                            // `singular` porque con un solo acompañante se leía
                            // "1 adultos" y "1 niños 6–10".
                            { campo: "adults"        as const, etiqueta: "adultos", singular: "adulto", nota: "" },
                            { campo: "childrenMid"   as const, etiqueta: "de 6 a 10 años", singular: "de 6 a 10 años", nota: "70 %" },
                            { campo: "childrenSmall" as const, etiqueta: "menores de 6",   singular: "menor de 6",     nota: "50 %" },
                          ])
                            // El buceo en Media Luna es solo para adultos y el
                            // servidor rechaza la reserva con menores. Enseñar
                            // los contadores ahí sería dejar que el cliente
                            // arme su grupo, vea un precio y el pago le falle
                            // con un error genérico.
                            .filter(({ campo }) => campo === "adults" || !TOURS_DB.find((t) => t.slug === i.tourSlug)?.soloAdultos)
                            .map(({ campo, etiqueta, singular, nota }) => (
                            <span key={campo} className="flex items-center gap-1.5">
                              <button type="button" aria-label={`Menos ${etiqueta} en ${i.tourName}`}
                                onClick={() => cambiarPersonas(i, campo, -1)}
                                className="w-8 h-8 border border-negro/20 text-negro/60 hover:border-verde-selva text-sm leading-none">−</button>
                              <span className="font-dm text-[11px] text-negro/65 whitespace-nowrap">
                                {i[campo] ?? 0} {(i[campo] ?? 0) === 1 ? singular : etiqueta}
                                {nota && <span className="text-negro/35"> ({nota})</span>}
                              </span>
                              <button type="button" aria-label={`Más ${etiqueta} en ${i.tourName}`}
                                onClick={() => cambiarPersonas(i, campo, 1)}
                                className="w-8 h-8 border border-negro/20 text-negro/60 hover:border-verde-selva text-sm leading-none">+</button>
                            </span>
                          ))}
                        </span>
                      )}
                    </div>

                    {TOURS_DB.find((t) => t.slug === i.tourSlug)?.soloAdultos && (
                      <p className="font-dm text-[11px] text-negro/40 mt-1">
                        Este recorrido es solo para mayores de 10 años.
                      </p>
                    )}
  
                    {!i.tourDate && (
                      <p className="font-dm text-[11px] text-terracota mt-1">Elige la fecha de este recorrido</p>
                    )}

                    {/* Elección obligatoria del recorrido (Ruta Acuática: el día
                      no da para las dos mitades).
                      ⚠️ El carrito PINTABA esta elección si ya venía puesta,
                      pero no tenía dónde elegirla y no la mandaba al servidor:
                      quien reservaba por aquí compraba un día prometido como
                      "lo decides al reservar" sin decidir nada, y al equipo le
                      llegaba la reserva sin saber a dónde llevarlo. */}
                    {(() => {
                      const t = TOURS_DB.find((x) => x.slug === i.tourSlug);
                      if (!t?.eleccion) return null;
                      return (
                        <div className={`mt-2.5 border p-2.5 ${i.eleccion ? "border-negro/10" : "border-terracota/40 bg-terracota/5"}`}>
                          <p className="font-dm text-[11px] text-negro/70 mb-2">{t.eleccion.titulo}</p>
                          <div className="space-y-1.5">
                            {t.eleccion.opciones.map((o) => {
                              const activa = i.eleccion === o.nombre;
                              return (
                                <button
                                  key={o.id}
                                  type="button"
                                  onClick={() => cambiar(i.uid, { eleccion: o.nombre })}
                                  aria-pressed={activa}
                                  className={`w-full text-left border p-2 transition-colors ${
                                    activa ? "border-verde-selva bg-verde-selva/8" : "border-negro/15 hover:border-verde-selva/50"
                                  }`}
                                >
                                  <span className="flex items-start gap-2">
                                    <span className={`mt-0.5 w-3 h-3 flex-shrink-0 rounded-full border ${activa ? "border-verde-selva bg-verde-selva" : "border-negro/30"}`} aria-hidden="true" />
                                    <span className="min-w-0">
                                      <span className="block font-dm text-[12px] text-negro/80 leading-snug">{o.nombre}</span>
                                      {o.nota && <span className="block font-dm text-[11px] text-negro/45 leading-snug">{o.nota}</span>}
                                    </span>
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                          {!i.eleccion && (
                            <p className="font-dm text-[11px] text-terracota mt-2">Elige una para poder continuar</p>
                          )}
                        </div>
                      );
                    })()}

                    {/* El grupo no llega al mínimo del recorrido. Antes esto no
                      se decía en el carrito: el renglón se veía normal, con su
                      precio, y el error salía hasta el cobro, genérico y sin
                      señalar cuál era. La salida por WhatsApp existe porque el
                      equipo sí suma gente suelta a otro grupo. */}
                    {(() => {
                      const t = TOURS_DB.find((x) => x.slug === i.tourSlug);
                      if (!t || i.unidades || personasDeItem(i) >= t.groupMin) return null;
                      return (
                        <div className="mt-2 border border-terracota/40 bg-terracota/5 p-2.5">
                          <p className="font-dm text-[11px] text-negro/70 leading-snug">
                            Este recorrido sale a partir de <strong>{t.groupMin} personas</strong>. ¿Van menos?{" "}
                            <a
                              href={`https://wa.me/524891251458?text=${encodeURIComponent(
                                `Hola, somos ${personasDeItem(i)} y nos interesa ${t.nombre.split("—")[0].trim()}. ¿Nos pueden sumar a otro grupo?`,
                              )}`}
                              target="_blank" rel="noopener noreferrer"
                              onClick={() => trackTourEvent("WHATSAPP_CLICK", { origen: "carrito_grupo_minimo", tour: i.tourSlug })}
                              className="text-verde-selva underline underline-offset-2"
                            >
                              Escríbenos y los sumamos a otro grupo
                            </a>.
                          </p>
                        </div>
                      );
                    })()}


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
                              {incluyeDeTour(t).map((x) => (
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
                </div>
  );
  if (!montado || hidratando) return <main className="min-h-screen bg-crema pt-32" />;

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
    // `pb-36` en móvil: la barra fija de abajo tapaba el final de las preguntas.
    <main className="min-h-screen bg-crema pt-24 pb-36 lg:pb-20">
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

          {/* ── TRASLADO DESDE TU CIUDAD ───────────────────────────────────
              El último tramo hasta Xilitla son casi dos horas de sierra con
              curvas y neblina, y era el motivo por el que había gente que no
              venía. Va apagado por defecto, como el hotel: quien llega en su
              coche no tiene por qué ver un cargo que no pidió. */}
          <section className="mt-8 border border-negro/10 bg-white p-5">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={conTraslado}
                onChange={(e) => { setConTraslado(e.target.checked); setCobro(null); }}
                className="mt-1 w-4 h-4 accent-verde-selva"
              />
              <span>
                <span className="block font-cormorant text-verde-profundo text-xl">
                  ¿Te llevamos desde tu ciudad?
                </span>
                <span className="block font-dm text-[12px] text-negro/50 mt-0.5">
                  Traslado privado de ida y vuelta hasta Xilitla. Es opcional: si vienes en tu coche, sáltalo.
                </span>
              </span>
            </label>

            {conTraslado && (
              <div className="mt-5 space-y-4">
                <div className="grid sm:grid-cols-3 gap-2">
                  {TRASLADOS.map((r) => {
                    const activa = ciudadTraslado === r.slug;
                    return (
                      <button
                        key={r.slug}
                        type="button"
                        onClick={() => { setCiudadTraslado(r.slug); setCobro(null); }}
                        className={`text-left border p-3 transition-colors ${
                          activa ? "border-verde-selva bg-verde-selva/5" : "border-negro/15 hover:border-verde-selva/50"
                        }`}
                      >
                        <span className="block font-dm text-[13px] text-negro/85">{r.ciudad}</span>
                        <span className="block font-dm text-[11px] text-negro/45 mt-0.5">
                          desde {formatMXN(precioBase(r))} redondo
                        </span>
                      </button>
                    );
                  })}
                </div>

                {rutaTraslado && (
                  <>
                    <div className="flex items-center justify-between gap-3 border-t border-negro/8 pt-3">
                      <span className="font-dm text-[12px] text-negro/60">¿Cuántos viajan?</span>
                      <span className="flex items-center gap-2">
                        <button type="button" aria-label="Menos pasajeros"
                          onClick={() => { setPaxTraslado((n) => Math.max(1, n - 1)); setCobro(null); }}
                          className="w-8 h-8 border border-negro/20 text-negro/60 hover:border-verde-selva text-sm leading-none">−</button>
                        <span className="font-dm text-[13px] text-negro/80 w-6 text-center tabular-nums">{paxTraslado}</span>
                        <button type="button" aria-label="Más pasajeros"
                          onClick={() => { setPaxTraslado((n) => Math.min(20, n + 1)); setCobro(null); }}
                          className="w-8 h-8 border border-negro/20 text-negro/60 hover:border-verde-selva text-sm leading-none">+</button>
                      </span>
                    </div>

                    {precioDelTraslado !== null ? (
                      <p className="flex justify-between font-dm text-[13px] text-negro/70 border-t border-negro/8 pt-3">
                        <span>{rutaTraslado.ciudad} → Xilitla · ida y vuelta · {paxTraslado} pasajero{paxTraslado !== 1 ? "s" : ""}</span>
                        <strong className="whitespace-nowrap">{formatMXN(precioDelTraslado)} MXN</strong>
                      </p>
                    ) : (
                      <p className="font-dm text-[12px] text-terracota">
                        Para ese grupo lo cotizamos aparte — escríbenos por WhatsApp.
                      </p>
                    )}
                    <p className="font-dm text-[11px] text-negro/40">
                      El precio es por vehículo, no por persona. Te recogemos en tu domicilio y te
                      regresamos al terminar.
                    </p>
                  </>
                )}
              </div>
            )}
          </section>

          {/* ── PRUEBA SOCIAL ──────────────────────────────────────────────
              Cifras reales y verificables: la calificación enlaza a las
              reseñas de Google, y los testimonios son de los recorridos que
              esta persona lleva en el carrito, no de cualquiera. */}

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
                incluye:  incluyeDeTour({ incluye: t?.incluye ?? [] }),
                eleccion: i.eleccion,
                // Las actividades opcionales se cobran, así que tienen que
                // verse en el resumen. Se contratan en el renglón de arriba y
                // no aparecían por ningún lado antes de pagar.
                addOns: (i.addOns ?? []).map((a) => {
                  const cat = t?.addOns?.find((x) => x.id === a.id);
                  return {
                    nombre:   cat?.nombre ?? a.id,
                    cantidad: a.cantidad,
                    subtotal: (cat?.precio ?? 0) * a.cantidad,
                  };
                }),
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
                ref={nombreRef}
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

        {/* Prueba social a lo ancho, DESPUÉS del pago. En un teléfono el
          aside cae debajo de todo, así que con las reseñas aquí arriba había
          que pasar tres testimonios largos antes de ver el total y el botón
          de pagar. */}
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

      {/* ── Barra fija de móvil ────────────────────────────────────────────
        En un teléfono el resumen y el botón viven al fondo de una página de casi
        cuatro mil píxeles: mientras el cliente ajusta fechas y personas no tiene
        a la vista ni lo que va a pagar ni por dónde seguir. Es el mismo patrón
        que las fichas de tour ya usan (`MobileBookingBar`).
        Desaparece al entrar al pago: ahí manda el formulario de la tarjeta. */}
      {!cobro && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-negro/10 bg-crema/95 backdrop-blur-sm px-4 py-3 flex items-center gap-3">
          <div className="min-w-0">
            <p className="font-dm text-[10px] tracking-[1.5px] uppercase text-negro/45 leading-none">Pagas hoy (30 %)</p>
            <p className="font-cormorant text-dorado text-xl leading-tight">{formatMXN(anticipo)} MXN</p>
          </div>
          <button
            type="button"
            onClick={() => {
              // Con los datos puestos, cobra. Si no, lleva al formulario en vez
              // de dejar el aviso de error a dos mil píxeles de distancia.
              if (name.trim() && email.trim()) { irAlPago(); return; }
              nombreRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
              setTimeout(() => nombreRef.current?.focus({ preventScroll: true }), 450);
            }}
            disabled={cargando}
            className="ml-auto flex-shrink-0 bg-verde-selva text-crema px-5 py-3.5 text-[11px] tracking-[2px] uppercase font-dm hover:bg-verde-vivo transition-colors disabled:opacity-40"
          >
            {cargando ? "Un momento…" : "Continuar →"}
          </button>
        </div>
      )}

      {/* A los 3 minutos sin cerrar la reserva. Se apaga solo cuando el cliente
        ya está en la pantalla de pago.
        ⚠️ Vive aquí, en el árbol del carrito CON recorridos. Estuvo colgado del
        `return` del carrito vacío, donde su propia condición (`items.length > 0`)
        no podía cumplirse nunca: no se mostró una sola vez desde que se creó. */}
      <RescatePopup activo={items.length > 0 && !cobro} mensaje={waRescate} />
    </main>
  );
}
