"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { ChevronLeft, Lock, Trash2, MapPin, Clock, ShieldCheck, Star, Users, AlertCircle, MessageCircle, Expand, Share2 } from "lucide-react";
import {
  leerCarrito, quitarDelCarrito, vaciarCarrito, resumirCarrito,
  actualizarItem, agregarAlCarrito, personasDeItem, ANTICIPO_PCT, pctACobrar, type CarritoItem,
} from "@/lib/carrito";
import { itemDesdeSlug } from "@/lib/carritoItems";
import { validarCarrito, type FalloCarrito } from "@/lib/carritoValidacion";
import { leerExtras, guardarExtras, limpiarExtras } from "@/lib/carritoExtras";
import { TRASLADOS, getTraslado, tarifaTraslado, precioBase } from "@/lib/traslados";
import { HABITACIONES_HOTEL, serviciosHotel, vistaHabitacion, cotizarHabitaciones, getHabitacion, tarifaNoche } from "@/lib/habitaciones";
import { formatMXN, formatTourDate, minBookingDate, calcTourTotal } from "@/lib/tourBooking";
import { TOURS_DB, incluyeDeTour } from "@/lib/tours";
import { useLocale } from "@/lib/i18n/useLocale";
import { getBooking } from "@/lib/i18n/booking";
import { localizeTour } from "@/lib/i18n/localize";
import type { Locale } from "@/lib/i18n/config";
import { TOUR_REVIEWS, GOOGLE_MAPS_REVIEWS_URL } from "@/lib/tourReviews";
import { ResumenReserva } from "@/components/booking/ResumenReserva";
import { TourCalendar } from "@/components/booking/TourCalendar";
import { RescatePopup } from "@/components/carrito/RescatePopup";
import { GaleriaHabitacion } from "@/components/booking/GaleriaHabitacion";
import { BotonCompartir } from "@/components/booking/BotonCompartir";
import { trackTourEvent, sessionId } from "@/lib/tourTracker";
import { trackPurchase } from "@/lib/analytics";

/**
 * Las dudas que de verdad frenan el pago viven en `i18n/booking.ts`
 * (`carrito.faq`). Todas las respuestas salen de lo que el sitio ya afirma
 * (política de cancelación, fichas de tour): ahí no se inventa ninguna
 * condición nueva.
 */

/**
 * El nombre corto de un recorrido en el idioma del visitante.
 *
 * El carrito guarda `tourName` en ESPAÑOL —se escribe al agregarlo, desde
 * `TOURS_DB`— así que en `/en` hay que volver a resolverlo por slug. Sin esto,
 * un carrito en inglés listaba los recorridos con su nombre en español.
 */
function nombreCorto(slug: string, guardado: string, locale: Locale): string {
  const t = TOURS_DB.find((x) => x.slug === slug);
  return (t ? localizeTour(t, locale).nombre : guardado).split("—")[0].trim();
}

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
  lineItems: { tourSlug?: string; tourName: string; tourDate: string; adults: number; children: number; childrenMid?: number; childrenSmall?: number; subtotal: number; eleccion?: string; addOns?: { id: string; nombre: string; cantidad: number; precio: number; subtotal: number }[] }[];
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
  const { locale, lp } = useLocale();
  const t   = getBooking(locale).carrito;
  const dinero = (n: number) => `$${n.toLocaleString(locale === "en" ? "en-US" : "es-MX")}`;
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const wa = t.waPagoAlterno;
  const waPagoAlterno = `https://wa.me/524891251458?text=${encodeURIComponent(
    [
      wa.intro,
      "",
      ...cobro.lineItems.map((l) =>
        wa.linea(
          nombreCorto(l.tourSlug ?? "", l.tourName, locale),
          formatTourDate(l.tourDate, locale),
          l.adults + l.children,
          dinero(l.subtotal),
        ),
      ),
      "",
      ...(cobro.hospedaje
        ? [
            "",
            wa.hospedaje(cobro.hospedaje.habitacion, cobro.hospedaje.noches, cobro.hospedaje.huespedes, dinero(cobro.hospedaje.total)),
            ...(cobro.hospedaje.ahorro > 0 ? [wa.terceraGratis(dinero(cobro.hospedaje.ahorro))] : []),
          ]
        : []),
      "",
      wa.totalViaje(dinero(cobro.total)),
      wa.anticipo(dinero(cobro.amount)),
      wa.saldo(dinero(cobro.saldo)),
      "",
      wa.aNombreDe(datos.name || wa.pendiente),
      datos.email  ? wa.correo(datos.email) : "",
      datos.pickup ? wa.meHospedoEn(datos.pickup) : "",
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
        return_url: `${window.location.origin}${lp("/reservar-tour/confirmacion")}`,
      },
      redirect: "if_required",
    });

    if (stripeError) {
      trackTourEvent("PAGO_FALLIDO", {
        carrito: true, amount: cobro.amount,
        code: stripeError.code, decline_code: stripeError.decline_code,
        message: stripeError.message, paymentIntentId: cobro.paymentIntentId,
      });
      setError(stripeError.message || t.errorPago);
      setLoading(false);
      return;
    }

    if (paymentIntent?.status === "processing") {
      trackTourEvent("PAGO_EN_PROCESO", { carrito: true, amount: cobro.amount, paymentIntentId: cobro.paymentIntentId });
      setError(t.pagoEnProceso);
      setLoading(false);
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      const primero = cobro.lineItems[0];
      const resumen = t.recorridosResumen(cobro.lineItems.length);
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
            locale,
            // ⚠️ Las notas las lee el EQUIPO en Xilitla, no el cliente: van
            // siempre en español aunque la reserva venga de /en. Lo que sí se
            // añade es el aviso de que el cliente habla inglés, que es
            // justamente lo que el equipo necesita saber antes de llamarle.
            notes: [
              t.notas.idiomaCliente || null,
              datos.pickup.trim() ? t.notas.recogida(datos.pickup.trim()) : null,
              t.notas.reservaVarios(cobro.lineItems.length),
              // Sin esto, el equipo recibía la Ruta Acuática sin saber si el
              // cliente eligió las Siete Cascadas o Tamasopo.
              ...cobro.lineItems
                .filter((l) => l.eleccion)
                .map((l) => t.notas.eligio(l.tourName.split("—")[0].trim(), l.eleccion!)),
              // La actividad opcional se COBRA y hay que operarla: el Salto de
              // las 7 Cascadas necesita guía de rescate. Sin esta línea el
              // equipo en Xilitla no se enteraba de que estaba contratada.
              ...cobro.lineItems
                .filter((l) => (l.addOns ?? []).length > 0)
                .map((l) => t.notas.extras(
                  l.tourName.split("—")[0].trim(),
                  (l.addOns ?? []).map((a) => `${a.nombre} x${a.cantidad}`).join(", "),
                )),
              cobro.hospedaje
                ? t.notas.hospedaje(cobro.hospedaje.habitacion, cobro.hospedaje.noches, cobro.hospedaje.huespedes, datos.checkin || "", datos.checkout || "")
                : null,
              // El traslado hay que operarlo: sin esto el equipo cobraba un
              // viaje desde otra ciudad y no se enteraba de que existía.
              cobro.traslado
                ? t.notas.traslado(cobro.traslado.ciudad, cobro.traslado.personas)
                : null,
            ].filter(Boolean).join(" | "),
            totalAmount:     cobro.amount,
            paymentIntentId: cobro.paymentIntentId,
            // Con UN solo recorrido se guarda su nombre real, no el resumen:
            // "1 recorridos" acababa en el panel y en el correo del cliente
            // como si fuera el nombre del tour. Con varios sí va el resumen,
            // porque el detalle vive en `lineItems`.
            tourName:        cobro.lineItems.length === 1
              ? (cobro.lineItems[0].tourName || resumen)
              : resumen,
            // Faltaba por completo: sin slug, el correo no sabía qué tour era y
            // caía a la lista genérica de "todo incluido".
            tourSlug:        primero.tourSlug,
            tourId:          (primero as any).tourId || primero.tourSlug,
            tourDate:        primero.tourDate,
            // El mismo grupo va a todos los recorridos: se guarda el grupo, no
            // la suma por tour (2 personas en 3 tours daban 6 adultos).
            adults:          Math.max(...cobro.lineItems.map((l) => l.adults || 0), 0) || 1,
            children:        Math.max(...cobro.lineItems.map((l) => l.children || 0), 0),
            // El hospedaje entra como un renglón más: el cliente lo PAGÓ, así
            // que tiene que aparecer en su confirmación. Antes se cobraba y el
            // correo no lo mencionaba.
            lineItems: [
              ...cobro.lineItems,
              ...(cobro.traslado
                ? [{
                    tourName: t.trasladoRenglon(cobro.traslado.ciudad),
                    tourDate: primero.tourDate,
                    adults:   cobro.traslado.personas,
                    children: 0,
                    subtotal: cobro.traslado.total,
                  }]
                : []),
            ],
            // El hospedaje va por `packageItems`, NO como un renglón de tour.
            // El correo tiene un bloque propio para el hotel que pinta noches y
            // entrada → salida; metiéndolo entre los tours salía como "Hospedaje
            // · Lirios 1 — 4 personas" y el cliente no veía ni cuántas noches
            // había pagado ni qué día se iba.
            packageItems: cobro.hospedaje
              ? [{
                  hotel:        "Hotel Paraíso Encantado",
                  habitacion:   cobro.hospedaje.habitacion,
                  noches:       cobro.hospedaje.noches,
                  habitaciones: cobro.hospedaje.habitacion.split(" + ").length,
                  checkin:      datos.checkin || "",
                  checkout:     datos.checkout || "",
                  subtotal:     cobro.hospedaje.total,
                }]
              : undefined,
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
          // La pantalla de éxito la ve el CLIENTE: aquí los nombres sí van en
          // su idioma, al revés que las notas del equipo de arriba.
          ...cobro.lineItems.map((l) => ({
            tourName: nombreCorto(l.tourSlug ?? "", l.tourName, locale), tourDate: l.tourDate,
            adults: l.adults, children: l.children, subtotal: l.subtotal,
          })),
          ...(cobro.traslado
            ? [{
                tourName: t.trasladoRenglon(cobro.traslado.ciudad),
                tourDate: primero.tourDate,
                adults:   cobro.traslado.personas,
                children: 0,
                subtotal: cobro.traslado.total,
              }]
            : []),
          ...(cobro.hospedaje
            ? [{
                tourName: t.hospedajeRenglon(cobro.hospedaje.habitacion),
                tourDate: datos.checkin || primero.tourDate,
                adults:   cobro.hospedaje.huespedes,
                children: 0,
                subtotal: cobro.hospedaje.total,
              }]
            : []),
        ],
      }));
      vaciarCarrito();
      limpiarExtras();
      onListo();
      router.push(lp("/reservar-tour/confirmacion"));
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
        {loading ? t.procesando : t.pagar(formatMXN(cobro.amount))}
      </button>
      <p className="text-center text-[11px] font-dm text-negro/45">
        {t.pagoCifrado(formatMXN(cobro.saldo))}
      </p>

      {/* Salida para quien no quiere teclear su tarjeta. El motor solo acepta
          tarjeta, y mucha gente en México prefiere SPEI u OXXO: sin esta puerta
          esa venta se perdía en silencio. El mensaje va con TODO el detalle
          para que nadie tenga que volver a preguntarlo por chat. */}
      <div className="border-t border-negro/10 pt-4">
        <p className="text-center font-dm text-[12px] text-negro/50 mb-3">
          {t.prefieresTransferencia}
        </p>
        <a
          href={waPagoAlterno}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackTourEvent("WHATSAPP_CLICK", { origen: "carrito_pago_alterno", amount: cobro.amount, recorridos: cobro.lineItems.length })}
          className="flex items-center justify-center gap-2.5 w-full border border-[#25D366]/60 hover:border-[#25D366] text-[#25D366] hover:bg-[#25D366]/8 py-3.5 text-[11px] tracking-[2px] uppercase font-dm transition-all"
        >
          <MessageCircle className="w-4 h-4" aria-hidden="true" />
          {t.apartarPorWhatsapp}
        </a>
        <p className="text-center font-dm text-[10px] text-negro/35 mt-2">
          {t.mandamosDatos}
        </p>
      </div>
    </form>
  );
}

// ── Página ───────────────────────────────────────────────────────────────────

export default function CarritoPage() {
  const { locale, en, lp } = useLocale();
  const t = getBooking(locale).carrito;
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
  /** Ya se restauró lo guardado; hasta entonces no se escribe nada. */
  const [extrasListos, setExtrasListos] = useState(false);
  const [paxTraslado,    setPaxTraslado]    = useState(2);
  // Una entrada por habitación, con cuánta gente duerme en cada una. Con más
  // gente de la que cabe en una, el cliente decide el reparto (3+2 o 4+1):
  // el precio cambia según eso y él sabe mejor cómo quiere dormir.
  const [habs, setHabs] = useState<{ habitacionId: string; huespedes: number }[]>([
    { habitacionId: "lirios-1", huespedes: 2 },
  ]);
  /** Cuarto abierto en la galería a pantalla completa. */
  const [galeria, setGaleria] = useState<string | null>(null);
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
  /** Lo que le falta al carrito, por renglón. Se llena al intentar pagar. */
  const [fallos, setFallos] = useState<FalloCarrito[]>([]);
  /** Renglón al que se acaba de llevar la vista por un fallo. */
  const [resaltado, setResaltado] = useState<string | null>(null);
  /** "Guárdalo y decide luego": la salida secundaria, para no perder el lead. */
  const [correoGuardar, setCorreoGuardar] = useState("");
  const [guardando,     setGuardando]     = useState(false);
  const [guardado,      setGuardado]      = useState(false);
  const [errorGuardar,  setErrorGuardar]  = useState("");

  useEffect(() => {
    setMontado(true);
    void hidratarDesdeUrl();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Deja el carrito listo a partir de la URL: restaura una cotización guardada y
   * mete el recorrido que venga pedido. Es lo primero que corre al montar.
   */
  async function hidratarDesdeUrl() {
    // `?agregar=<slug>` es cómo entra un recorrido desde el resto del sitio.
    // Las páginas de tour, destino, blog y precios se pintan en el servidor y
    // ahí no existe `localStorage`, así que en vez de que cada botón sepa
    // escribir el carrito, mandan la intención en la URL y ese trabajo pasa
    // aquí, en el único sitio que toca el carrito.
    const params = new URLSearchParams(window.location.search);
    // `getAll` y no `get`: el correo del plan por día manda el viaje entero
    // (`?agregar=a&agregar=b&agregar=c`) y con `get` solo entraba el primero —
    // la persona llegaba a un carrito con un tercio de lo que le prometimos.
    // Un solo `agregar` sigue funcionando igual: es un arreglo de uno.
    const pedidos = params.getAll("agregar").filter(Boolean);
    const token   = params.get("recuperar");

    let carrito = leerCarrito();

    // `?recuperar=<token>` es el link de los correos de rescate. Va PRIMERO y
    // luego `?agregar`, porque los links viejos traen los dos con el mismo tour:
    // `/reservar-tour/<slug>?recuperar=<t>` redirige aquí como
    // `?agregar=<slug>&recuperar=<t>`. Al revés, el tour entraría sin fecha por
    // `agregar` y otra vez con su fecha real al restaurar —`agregarAlCarrito`
    // deduplica por slug+fecha, así que NO los uniría— y el cliente vería el
    // mismo recorrido dos veces y el doble de total.
    if (token) {
      try {
        const r = await fetch(`/api/tours/carrito/${token}`);
        const c = r.ok ? await r.json() : null;
        if (c && !c.error) {
          if (c.email) setEmail(c.email);
          // Se FUSIONA con lo que ya tenga: puede haber armado un carrito nuevo
          // antes de abrir el correo, y reemplazarlo sería borrarle trabajo.
          // `carritoJson` guarda { items, hospedaje, traslado }; los tokens
          // viejos guardaban solo el array de recorridos.
          const guardado = Array.isArray(c.items) ? { items: c.items, hospedaje: null, traslado: null } : (c.items ?? null);
          if (guardado?.hospedaje?.habitaciones?.length) {
            setConHotel(true);
            setHabs(guardado.hospedaje.habitaciones);
            if (guardado.hospedaje.checkin)  setCheckin(guardado.hospedaje.checkin);
            if (guardado.hospedaje.checkout) setCheckout(guardado.hospedaje.checkout);
          }
          if (guardado?.traslado?.ciudad) {
            setConTraslado(true);
            setCiudadTraslado(guardado.traslado.ciudad);
            if (guardado.traslado.personas) setPaxTraslado(Number(guardado.traslado.personas));
          }
          const restaurados: CarritoItem[] = Array.isArray(guardado?.items) && guardado.items.length
            ? guardado.items
            : (c.tourSlug
                ? [itemDesdeSlug(c.tourSlug, {
                    tourDate:      c.tourDate || "",
                    adults:        typeof c.adults === "number" ? c.adults : undefined,
                    childrenMid:   typeof c.childrenMid === "number" ? c.childrenMid : undefined,
                    childrenSmall: typeof c.childrenSmall === "number" ? c.childrenSmall : undefined,
                  })].filter(Boolean) as CarritoItem[]
                : []);
          for (const it of restaurados) {
            const yaEsta = carrito.some(
              (x) => x.tourSlug === it.tourSlug && x.tourDate === it.tourDate,
            );
            if (!yaEsta) carrito = agregarAlCarrito({ ...it, uid: undefined } as never);
          }
          trackTourEvent("CARRITO_RECUPERADO", { recorridos: restaurados.length });
        }
      } catch { /* si no se puede restaurar, el carrito local sigue intacto */ }
    }

    if (pedidos.length) {
      // Se resalta el PRIMERO que de verdad entró. Con un plan de varios días,
      // llevar la vista al último renglón deja los otros fuera de pantalla.
      let aResaltar: string | null = null;
      for (const pedido of pedidos) {
        const yaEsta = carrito.find((i) => i.tourSlug === pedido);
        if (yaEsta) {
          // No se duplica: quien vuelve a pulsar "Reservar" del mismo tour
          // quiere verlo, no llevarlo dos veces. Se le lleva al renglón.
          aResaltar ??= yaEsta.uid;
          continue;
        }
        const nuevo = itemDesdeSlug(pedido);
        if (nuevo) {
          carrito = agregarAlCarrito(nuevo);
          aResaltar ??= carrito[carrito.length - 1]?.uid ?? null;
        }
      }
      setRecienLlegado(aResaltar);
      // Se limpia la URL para que recargar no vuelva a hacer lo mismo.
      window.history.replaceState({}, "", lp("/reservar/carrito"));
    }
    // Lo que eligió y no son recorridos: hospedaje, traslado y sus datos. Vivía
    // solo en memoria, así que salir a mirar otro tour y volver lo borraba todo.
    const ex = leerExtras();
    setConHotel(ex.conHotel);
    setHabs(ex.habs);
    setCheckin(ex.checkin);
    setCheckout(ex.checkout);
    setConTraslado(ex.conTraslado);
    if (ex.ciudadTraslado) setCiudadTraslado(ex.ciudadTraslado);
    setPaxTraslado(ex.paxTraslado);
    if (ex.name)   setName(ex.name);
    if (ex.email)  setEmail(ex.email);
    if (ex.phone)  setPhone(ex.phone);
    if (ex.pickup) setPickup(ex.pickup);
    setExtrasListos(true);

    setItems(carrito);
    setHidratando(false);
    trackTourEvent("BOOKING_PAGE_VIEW", { carrito: true, recorridos: carrito.length });
  }

  // Guarda la elección en cuanto cambia. La guarda de `extrasListos` evita que
  // el primer render —con los valores por defecto— pise lo que ya había
  // guardado antes de que termine de restaurarse.
  useEffect(() => {
    if (!extrasListos) return;
    guardarExtras({
      conHotel, habs, checkin, checkout,
      conTraslado, ciudadTraslado, paxTraslado,
      name, email, phone, pickup,
    });
  }, [extrasListos, conHotel, habs, checkin, checkout, conTraslado, ciudadTraslado, paxTraslado, name, email, phone, pickup]);

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

  const hotelQuote = conHotel && noches > 0 ? cotizarHabitaciones(habs, noches, locale) : null;
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
  // Un solo día de recorrido se cobra completo; con hospedaje vuelve al 30 %.
  // El servidor aplica exactamente la misma regla en `carrito-payment-intent`.
  const pctHoy   = pctACobrar(dias, totalHotel > 0);
  const anticipo = Math.round((total * pctHoy) / 100);
  const saldo    = total - anticipo;

  // Mensaje del rescate: lleva lo que el cliente ya eligió para que no tenga
  // que repetirlo. Sin esto el chat arranca con "hola" y se pierde el contexto.
  const waRescate = `https://wa.me/524891251458?text=${encodeURIComponent(
    [
      t.waRescate.intro,
      "",
      ...items.map((i) => `• ${nombreCorto(i.tourSlug, i.tourName, locale)}${i.tourDate ? ` — ${i.tourDate}` : t.waRescate.sinFecha}`),
      ...(conHotel && hotelQuote?.ok
        ? [t.waRescate.hospedaje((hotelQuote.desglose ?? []).map((d) => d.habitacion).join(" + "), noches)]
        : []),
      "",
      t.waRescate.totalEstimado(`$${total.toLocaleString(en ? "en-US" : "es-MX")}`),
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
        setError(t.yaTienesEseDiaError(nombreCorto(chocaCon.tourSlug, chocaCon.tourName, locale)));
        return;
      }
    }
    setError("");
    const nuevos = actualizarItem(uid, cambios);
    setItems(nuevos);
    // Si ya se había intentado pagar, el aviso se actualiza en vivo: arreglar el
    // renglón lo apaga sin tener que volver a pulsar el botón.
    setFallos((f) => (f.length ? validarCarrito(nuevos, locale) : f));
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

  /**
   * Guarda el carrito y manda la cotización por correo.
   *
   * Es la fuga más cara que tenía el motor: quien se iba sin pagar no dejaba
   * rastro, y la secuencia de tres recordatorios que ya existe no tenía a quién
   * escribirle.
   */
  async function guardarCotizacion() {
    const correo = correoGuardar.trim() || email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      setErrorGuardar(t.correoInvalido);
      return;
    }
    setGuardando(true);
    setErrorGuardar("");
    try {
      const r = await fetch("/api/tours/guardar-carrito", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: correo, phone: phone || null, items,
          // El idioma viaja con la cotización: define en qué idioma salen el
          // correo inmediato y los tres recordatorios del cron.
          locale,
          // El hospedaje y el traslado también: sin esto la cotización llegaba
          // sin lo que más sube el ticket, y al volver por el link se perdía.
          hospedaje: conHotel ? { habitaciones: habs, noches, checkin, checkout } : null,
          traslado: conTraslado && rutaTraslado && precioDelTraslado !== null
            ? { ciudad: rutaTraslado.slug, personas: paxTraslado }
            : null,
        }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) {
        setErrorGuardar(d?.error || t.noSePudoGuardar);
      } else {
        setGuardado(true);
        trackTourEvent("LEAD_CARRITO_GUARDADO", { recorridos: items.length, amount: total });
      }
    } catch {
      setErrorGuardar(t.sinConexion);
    }
    setGuardando(false);
  }

  /** Lleva la vista al renglón que falla y lo resalta. */
  function irAlRenglon(uid: string) {
    renglonRefs.current[uid]?.scrollIntoView({ behavior: "smooth", block: "center" });
    setResaltado(uid);
    setTimeout(() => setResaltado((r) => (r === uid ? null : r)), 2600);
  }

  async function irAlPago() {
    const fallos = validarCarrito(items, locale);
    setFallos(fallos);
    if (fallos.length > 0) {
      // El aviso ya NO se queda solo junto al botón: se lleva a la persona al
      // recorrido que lo causa, que es lo único accionable.
      setError("");
      irAlRenglon(fallos[0].uid);
      return;
    }
    if (!name.trim() || !email.trim()) {
      setError(t.necesitamosNombreCorreo);
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
          // Solo si hay tarifa para ese grupo. Arriba de 12 no la hay y se
          // cotiza a mano: mandarlo igual hacía que el servidor rechazara el
          // pago ENTERO, no solo el traslado.
          traslado: conTraslado && rutaTraslado && precioDelTraslado !== null
            ? { ciudad: rutaTraslado.slug, personas: paxTraslado }
            : null,
          // El idioma viaja hasta la metadata de Stripe: si el cliente cierra la
          // pestaña, el webhook levanta la reserva y necesita saber en qué
          // idioma mandarle su confirmación.
          locale,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t.noSePudoIniciar);
        setCargando(false);
        return;
      }
      setCobro(data);
      setExpiraEn(Date.now() + 15 * 60 * 1000);
    } catch {
      setError(t.noSePudoConectar);
    }
    setCargando(false);
  }

  const Renglon = (i: CarritoItem) => (
    // La `key` incluye la fecha a propósito: al ponerle día a un recorrido,
    // React lo remonta en su grupo nuevo y la animación de entrada lo acompaña
    // hasta su lugar. Es el efecto de la lista que pasó Manolo, hecho con la
    // animación que el proyecto ya tiene en tailwind.config, sin librería.
    // ⚠️ La `key` era `i.uid + i.tourDate` para que React remontara el renglón
    // al fecharlo y se disparara `animate-slide-up`. Con el calendario dentro,
    // ese remonte destruye la hoja ABIERTA en el mismo instante en que se elige
    // el día. La animación se sacrifica; el calendario no.
    <div
      key={i.uid}
      ref={(el) => { renglonRefs.current[i.uid] = el; }}
      className={`animate-slide-up flex gap-3 sm:gap-4 border bg-white p-3 sm:p-4 transition-colors duration-500 ${
        resaltado === i.uid
          ? "border-terracota ring-2 ring-terracota/25"
          : recienLlegado === i.uid
            ? "border-verde-selva ring-2 ring-verde-selva/25"
            : "border-negro/10"
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
                        {nombreCorto(i.tourSlug, i.tourName, locale)}
                      </p>
                      <span className="flex items-center gap-2 flex-shrink-0">
                        {/* Cuando el carrito lleva varios recorridos, este
                          renglón puede venir rebajado. Se enseña el precio de
                          antes tachado: un descuento que no se ve no convence
                          a nadie de agregar el siguiente. */}
                        {resumen.descuentoPorItem[i.uid] ? (
                          <span className="flex flex-col items-end leading-none">
                            <span className="flex items-baseline gap-1.5">
                              <s className="font-dm text-[11px] text-negro/35">{formatMXN(i.total)}</s>
                              <span className="font-cormorant text-dorado text-lg sm:text-xl whitespace-nowrap">
                                {formatMXN(Math.round(i.total * (100 - resumen.descuentoPorItem[i.uid]) / 100))}
                              </span>
                            </span>
                            <span className="mt-1 font-dm text-[9px] tracking-[1px] uppercase text-verde-selva bg-verde-selva/10 px-1.5 py-0.5">
                              −{resumen.descuentoPorItem[i.uid]} %
                            </span>
                          </span>
                        ) : (
                          <span className="font-cormorant text-dorado text-lg sm:text-xl whitespace-nowrap">{formatMXN(i.total)}</span>
                        )}
                        <button
                          onClick={() => quitar(i.uid)}
                          aria-label={t.quitar(nombreCorto(i.tourSlug, i.tourName, locale))}
                          className="w-8 h-8 -mr-1.5 flex items-center justify-center text-negro/30 hover:text-terracota transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </span>
                    </div>
  
                    {/* La fecha se edita AQUÍ: los recorridos que se agregan desde
                        el catálogo llegan sin ella, y sin esto el carrito no se
                        podría pagar nunca. */}
                    <div className="mt-2 max-w-[280px]">
                      {/* El MISMO calendario del flujo de un tour, en modo
                        compacto: botón que abre una hoja. Aquí había un
                        `<input type="date">` del navegador —el widget más frío
                        que existe— mientras el otro flujo tenía atajos de los
                        próximos días y dos meses a la vista. Era la misma
                        decisión con dos experiencias distintas.
                        Los días que ya ocupa otro recorrido salen tachados:
                        cada tour se lleva el día completo, y antes eso se
                        descubría con un error DESPUÉS de elegir. */}
                      <TourCalendar
                        modo="compact"
                        value={i.tourDate}
                        onChange={(ymd) => {
                          cambiar(i.uid, { tourDate: ymd });
                          if (ymd) trackTourEvent("DATE_SELECTED", { fecha: ymd, tour: i.tourSlug, carrito: true });
                        }}
                        fechasBloqueadas={items.filter((x) => x.uid !== i.uid && x.tourDate).map((x) => x.tourDate)}
                        motivoBloqueo={(ymd) => {
                          const otro = items.find((x) => x.uid !== i.uid && x.tourDate === ymd);
                          return otro ? t.yaTienesEseDia(nombreCorto(otro.tourSlug, otro.tourName, locale)) : t.diaOcupado;
                        }}
                        titulo={t.fechaDe(nombreCorto(i.tourSlug, i.tourName, locale))}
                        placeholder={t.eligeLaFecha}
                        permitirLimpiar
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {i.unidades ? (
                        // Ruta, vehículo y unidades se eligen AQUÍ. Antes el
                        // RZR ni entraba al carrito: el botón del catálogo
                        // mandaba a la ficha y rompía el flujo a la mitad.
                        <span className="flex flex-wrap items-center gap-2">
                          <select
                            value={i.ruta}
                            onChange={(e) => cambiarVehiculo(i, { ruta: e.target.value })}
                            aria-label={t.rutaDe(nombreCorto(i.tourSlug, i.tourName, locale))}
                            className="border border-negro/15 bg-white px-2 py-1.5 font-dm text-[12px] text-negro"
                          >
                            {(TOURS_DB.find((t) => t.slug === i.tourSlug)?.rutas ?? []).map((r) => (
                              <option key={r.nombre} value={r.nombre}>{r.nombre}</option>
                            ))}
                          </select>
                          <select
                            value={i.vehiculo}
                            onChange={(e) => cambiarVehiculo(i, { vehiculo: e.target.value })}
                            aria-label={t.vehiculoDe(nombreCorto(i.tourSlug, i.tourName, locale))}
                            className="border border-negro/15 bg-white px-2 py-1.5 font-dm text-[12px] text-negro"
                          >
                            {(TOURS_DB.find((t) => t.slug === i.tourSlug)?.flota ?? []).map((v) => (
                              <option key={v.nombre} value={v.nombre}>{v.nombre}</option>
                            ))}
                          </select>
                          <span className="flex items-center gap-2">
                            <button type="button" aria-label={t.menosUnidades}
                              onClick={() => cambiarVehiculo(i, { unidades: Math.max(1, (i.unidades ?? 1) - 1) })}
                              className="w-7 h-7 border border-negro/20 text-negro/60 hover:border-verde-selva text-sm">−</button>
                            <span className="font-dm text-[12px] text-negro/70">{t.unidades(i.unidades ?? 1)}</span>
                            <button type="button" aria-label={t.masUnidades}
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
                            { campo: "adults"        as const, etiqueta: t.adultos,    singular: t.adulto,     nota: "" },
                            { campo: "childrenMid"   as const, etiqueta: t.de6a10,     singular: t.de6a10,     nota: "70 %" },
                            { campo: "childrenSmall" as const, etiqueta: t.menoresDe6, singular: t.menorDe6,   nota: "50 %" },
                          ])
                            // El buceo en Media Luna es solo para adultos y el
                            // servidor rechaza la reserva con menores. Enseñar
                            // los contadores ahí sería dejar que el cliente
                            // arme su grupo, vea un precio y el pago le falle
                            // con un error genérico.
                            .filter(({ campo }) => campo === "adults" || !TOURS_DB.find((t) => t.slug === i.tourSlug)?.soloAdultos)
                            .map(({ campo, etiqueta, singular, nota }) => (
                            <span key={campo} className="flex items-center gap-1.5">
                              <button type="button" aria-label={t.menos(etiqueta, nombreCorto(i.tourSlug, i.tourName, locale))}
                                onClick={() => cambiarPersonas(i, campo, -1)}
                                className="w-8 h-8 border border-negro/20 text-negro/60 hover:border-verde-selva text-sm leading-none">−</button>
                              <span className="font-dm text-[11px] text-negro/65 whitespace-nowrap">
                                {i[campo] ?? 0} {(i[campo] ?? 0) === 1 ? singular : etiqueta}
                                {nota && <span className="text-negro/35"> ({nota})</span>}
                              </span>
                              <button type="button" aria-label={t.mas(etiqueta, nombreCorto(i.tourSlug, i.tourName, locale))}
                                onClick={() => cambiarPersonas(i, campo, 1)}
                                className="w-8 h-8 border border-negro/20 text-negro/60 hover:border-verde-selva text-sm leading-none">+</button>
                            </span>
                          ))}
                        </span>
                      )}
                    </div>

                    {TOURS_DB.find((t) => t.slug === i.tourSlug)?.soloAdultos && (
                      <p className="font-dm text-[11px] text-negro/40 mt-1">
                        {t.soloMayores}
                      </p>
                    )}
  
                    {/* Lo que le falta a ESTE recorrido, dentro de su tarjeta.
                      Solo después de intentar pagar: recibir el carrito lleno
                      de avisos en rojo antes de tocar nada es hostil. */}
                    {fallos.filter((f) => f.uid === i.uid).map((f) => (
                      <p key={f.campo} className="font-dm text-[11px] text-terracota mt-1.5 flex items-start gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-px" aria-hidden="true" />
                        <span>{f.mensaje}</span>
                      </p>
                    ))}

                    {/* Elección obligatoria del recorrido (Ruta Acuática: el día
                      no da para las dos mitades).
                      ⚠️ El carrito PINTABA esta elección si ya venía puesta,
                      pero no tenía dónde elegirla y no la mandaba al servidor:
                      quien reservaba por aquí compraba un día prometido como
                      "lo decides al reservar" sin decidir nada, y al equipo le
                      llegaba la reserva sin saber a dónde llevarlo. */}
                    {(() => {
                      const base = TOURS_DB.find((x) => x.slug === i.tourSlug);
                      const tour = base ? localizeTour(base, locale) : undefined;
                      if (!tour?.eleccion) return null;
                      return (
                        <div className={`mt-2.5 border p-2.5 ${i.eleccion ? "border-negro/10" : "border-terracota/40 bg-terracota/5"}`}>
                          <p className="font-dm text-[11px] text-negro/70 mb-2">{tour.eleccion.titulo}</p>
                          <div className="space-y-1.5">
                            {tour.eleccion.opciones.map((o) => {
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
                        </div>
                      );
                    })()}

                    {/* El grupo no llega al mínimo del recorrido. Antes esto no
                      se decía en el carrito: el renglón se veía normal, con su
                      precio, y el error salía hasta el cobro, genérico y sin
                      señalar cuál era. La salida por WhatsApp existe porque el
                      equipo sí suma gente suelta a otro grupo. */}
                    {(() => {
                      const tour = TOURS_DB.find((x) => x.slug === i.tourSlug);
                      if (!tour || i.unidades || personasDeItem(i) >= tour.groupMin) return null;
                      return (
                        <div className="mt-2 border border-terracota/40 bg-terracota/5 p-2.5">
                          <p className="font-dm text-[11px] text-negro/70 leading-snug">
                            {t.saleAPartirDeIntro}<strong>{t.saleAPartirDe(tour.groupMin)}</strong>. {t.vanMenos}{" "}
                            <a
                              href={`https://wa.me/524891251458?text=${encodeURIComponent(
                                t.waGrupoMinimo(personasDeItem(i), nombreCorto(i.tourSlug, i.tourName, locale)),
                              )}`}
                              target="_blank" rel="noopener noreferrer"
                              onClick={() => trackTourEvent("WHATSAPP_CLICK", { origen: "carrito_grupo_minimo", tour: i.tourSlug })}
                              className="text-verde-selva underline underline-offset-2"
                            >
                              {t.escribenosYLosSumamos}
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
                    const base = TOURS_DB.find((x) => x.slug === i.tourSlug);
                    const tour = base ? localizeTour(base, locale) : undefined;
                    const pax = personasDeItem(i);
                    return (tour?.addOns ?? []).map((a) => {
                      const puestos = i.addOns?.find((x) => x.id === a.id)?.cantidad ?? 0;
                      const activo  = puestos > 0;
                      return (
                        <div key={a.id} className={`mt-2 border p-2.5 ${activo ? "border-verde-selva/50 bg-verde-selva/5" : "border-negro/10"}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-dm text-[12px] text-negro/80">{a.nombre}</p>
                              <p className="font-dm text-[11px] text-negro/45 leading-snug">{a.descripcion}</p>
                              <p className="font-dm text-[11px] text-verde-selva mt-0.5">+{formatMXN(a.precio)} {t.porPersonaExtra}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => cambiarAddOn(i, a.id, activo ? 0 : pax)}
                              className={`flex-shrink-0 text-[9px] tracking-[1.5px] uppercase font-dm px-2.5 py-1.5 border transition-colors ${
                                activo ? "border-verde-selva bg-verde-selva text-crema" : "border-negro/25 text-negro/60 hover:border-verde-selva"
                              }`}
                            >
                              {activo ? t.quitarAddOn : t.agregarAddOn}
                            </button>
                          </div>
                          {activo && (
                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-negro/8">
                              <span className="font-dm text-[11px] text-negro/55">{t.cuantosLoHacen}</span>
                              <span className="flex items-center gap-2">
                                <button type="button" aria-label={t.menosUnidades} onClick={() => cambiarAddOn(i, a.id, Math.max(0, puestos - 1))}
                                  className="w-7 h-7 border border-negro/20 text-negro/60 hover:border-verde-selva text-sm">−</button>
                                <span className="font-dm text-[12px] text-negro/70 w-4 text-center">{puestos}</span>
                                <button type="button" aria-label={t.masUnidades} onClick={() => cambiarAddOn(i, a.id, Math.min(pax, puestos + 1))}
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
                      const base = TOURS_DB.find((x) => x.slug === i.tourSlug);
                      const tour = base ? localizeTour(base, locale) : undefined;
                      if (!tour) return null;
                      return (
                        <details className="mt-2 group">
                          <summary className="cursor-pointer list-none font-dm text-[11px] text-verde-selva hover:text-verde-vivo transition-colors">
                            {t.queIncluyeYSeVisita}
                            <span className="ml-1 inline-block transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                          </summary>
                          <div className="mt-2.5 space-y-2.5 border-l-2 border-verde-selva/20 pl-3">
                            <p className="font-dm text-[12px] text-negro/55 leading-snug">{tour.descripcion}</p>
                            {tour.destinos?.length > 0 && (
                              <div>
                                <p className="font-dm text-[10px] tracking-[1.5px] uppercase text-negro/35 mb-1">{t.seVisita}</p>
                                {tour.destinos.map((d) => (
                                  <p key={d} className="font-dm text-[12px] text-negro/60 leading-snug">· {d}</p>
                                ))}
                              </div>
                            )}
                            <div>
                              <p className="font-dm text-[10px] tracking-[1.5px] uppercase text-negro/35 mb-1">{t.incluye}</p>
                              {incluyeDeTour(tour, locale).map((x) => (
                                <p key={x} className="font-dm text-[12px] text-negro/60 leading-snug">✓ {x}</p>
                              ))}
                            </div>
                            <p className="font-dm text-[11px] text-negro/40">
                              {t.duracionGrupo(tour.duracion_hrs, tour.groupMin, tour.groupMax)}
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
          <h1 className="font-cormorant font-light text-verde-profundo text-3xl mb-4">{t.vacioTitulo}</h1>
          <p className="font-dm text-negro/55 text-sm mb-8">
            {t.vacioTexto}
          </p>
          <Link href={lp("/reservar")} className="inline-block bg-verde-selva text-crema px-8 py-4 text-[11px] tracking-[2px] uppercase font-dm hover:bg-verde-vivo transition-colors">
            {t.verRecorridos}
          </Link>
        </div>
      </main>
    );
  }

  return (
    // `pb-36` en móvil: la barra fija de abajo tapaba el final de las preguntas.
    <main className="min-h-screen bg-crema pt-24 pb-36 lg:pb-20">
      <div className="max-w-5xl mx-auto px-6 mb-8">
        <Link href={lp("/reservar")} className="inline-flex items-center gap-1.5 text-negro/50 hover:text-verde-selva text-xs font-dm tracking-[1px] uppercase transition-colors">
          <ChevronLeft className="w-3 h-3" />
          {t.seguirEligiendo}
        </Link>
      </div>

      {/* Dónde va y cuánto falta. Sin esto el carrito parecía un formulario sin
          fin: no había forma de saber si faltaban dos pantallas o diez. */}
      <div className="max-w-5xl mx-auto px-6 mb-8">
        <div className="flex items-center gap-2 sm:gap-3">
          {t.pasos.map((etiqueta, n) => {
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

      {/* `min-w-0` en el grid Y en sus hijos.
        Sin él, un hijo de grid tiene `min-width: auto` y se niega a encoger por
        debajo del ancho mínimo de su contenido: en un teléfono de 360 px la
        columna se quedaba en 373 y TODO el carrito salía cortado por la derecha
        —el título, los precios, los botones—. Se veía bien a 390 px, que es
        justo el tamaño con el que se probó. */}
      <div className="max-w-5xl mx-auto px-6 grid lg:grid-cols-[1fr_380px] gap-10 items-start min-w-0">

        {/* ── Renglones ── */}
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-3">
          <h1 className="font-cormorant font-light text-verde-profundo text-3xl mb-1 min-w-0">{t.tuViaje}</h1>
          {/* Compartirlo con quien decide. El carrito vive en ESTE navegador,
            así que el enlace se genera guardándolo en el servidor. */}
          <BotonCompartir
            titulo={t.compartirTitulo}
            texto={t.compartirTexto(items.length, formatMXN(total))}
            origen="carrito"
            className="flex-shrink-0 border border-verde-selva/40 text-verde-selva px-3 py-2 hover:bg-verde-selva/8"
            obtenerUrl={async () => {
              const r = await fetch("/api/tours/compartir", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  items,
                  hospedaje: conHotel ? { habitaciones: habs, noches, checkin, checkout } : null,
                  traslado: conTraslado && rutaTraslado && precioDelTraslado !== null
                    ? { ciudad: rutaTraslado.slug, personas: paxTraslado } : null,
                }),
              });
              const d = await r.json().catch(() => null);
              return r.ok ? d?.url ?? null : null;
            }}
          />
        </div>
          <p className="font-dm text-negro/50 text-sm mb-4">
            {t.conteo(items.length, dias)}
          </p>

          {/* ── FRANJA DE CONFIANZA ────────────────────────────────────────
            La página del dinero era la ÚNICA sin una sola señal de confianza a
            la vista: la calificación, las credenciales y los testimonios viven
            al final del documento, después del formulario y del pago. En un
            teléfono eso son varias pantallas de scroll que casi nadie recorre,
            así que quien llegaba aquí desde Google decidía pagarle a un
            desconocido sin ver un solo motivo para hacerlo.

            Va compacta —una franja, no un bloque— justo por lo que decía el
            comentario de abajo: un módulo alto aquí empuja el resumen y el
            botón de pagar fuera de la pantalla. Las reseñas largas se quedan
            donde están. */}
          <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-negro/8 py-2.5">
            <a
              href={GOOGLE_MAPS_REVIEWS_URL}
              target="_blank" rel="noopener noreferrer"
              className="group inline-flex items-center gap-1.5"
            >
              <span className="flex gap-0.5" aria-hidden="true">
                {[...Array(5)].map((_, k) => <Star key={k} className="w-3 h-3 fill-dorado text-dorado" />)}
              </span>
              <span className="font-dm text-[12px] text-negro/70">
                <strong className="text-negro">4.9</strong> · {t.resenasGoogle}
              </span>
            </a>
            <span className="inline-flex items-center gap-1.5 font-dm text-[12px] text-negro/55">
              <ShieldCheck className="w-3.5 h-3.5 text-verde-selva flex-shrink-0" aria-hidden="true" />
              {t.confianzaCancelas}
            </span>
            <span className="inline-flex items-center gap-1.5 font-dm text-[12px] text-negro/55">
              <Lock className="w-3.5 h-3.5 text-verde-selva flex-shrink-0" aria-hidden="true" />
              {t.confianzaPago(pctHoy)}
            </span>
          </div>

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
              {/* Neutral mientras la persona todavía está armando su viaje. Los
                recorridos sin fecha se agrupan arriba porque son los que tiene
                que atender, pero recibirla con un encabezado en rojo antes de
                que toque nada la trata como si ya se hubiera equivocado. Se
                pone en rojo cuando intenta pagar y de verdad falta algo. */}
              <p className={`flex items-center gap-2 font-dm text-[11px] tracking-[1.5px] uppercase mb-2 transition-colors ${
                fallos.length > 0 ? "text-terracota" : "text-negro/40"
              }`}>
                <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
                {sinFechaItems.length === 1 ? t.eligeElDia : t.eligeElDiaN(sinFechaItems.length)}
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
                  {t.tuItinerario}
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
                <strong className="text-negro/85">{t.pasamosPorTiFuerte1}</strong>{t.pasamosPorTi}
                <strong className="text-negro/85">{t.pasamosPorTiFuerte2}</strong>{t.pasamosPorTiCola}
              </span>
            </p>
            <p className="flex items-start gap-2.5 font-dm text-[13px] text-negro/70">
              <Clock className="w-4 h-4 text-verde-selva flex-shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                <strong className="text-negro/85">{t.salimosEntreFuerte}</strong>{t.salimosEntre}
              </span>
            </p>
            <p className="flex items-start gap-2.5 font-dm text-[13px] text-negro/70">
              <ShieldCheck className="w-4 h-4 text-verde-selva flex-shrink-0 mt-0.5" aria-hidden="true" />
              <span>{t.cancelacionGratuita}</span>
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
              {t.agregarOtroRecorrido}
              <span className="block mt-1 font-dm text-[11px] tracking-normal normal-case text-verde-selva">
                {items.length === 1 ? t.gancho2doRecorrido : t.gancho3erRecorrido}
              </span>
            </button>

            {mostrarLista && (
              <div className="mt-3 border border-negro/10 bg-white divide-y divide-negro/8 max-h-80 overflow-y-auto">
                {TOURS_DB.filter((x) => !items.some((i) => i.tourSlug === x.slug))
                  .map((x) => localizeTour(x, locale))
                  .map((x) => (
                  <button
                    key={x.slug}
                    type="button"
                    onClick={() => { agregarDelCatalogo(x.slug); setMostrarLista(false); }}
                    className="w-full flex items-center gap-3 p-3 hover:bg-verde-selva/5 text-left transition-colors"
                  >
                    <span className="relative w-14 h-11 flex-shrink-0 overflow-hidden">
                      <Image src={x.imagen_hero} alt="" fill className="object-cover" sizes="56px" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-dm text-[13px] text-negro/85 truncate">{x.nombre.split("—")[0].trim()}</span>
                      <span className="block font-dm text-[11px] text-negro/45">
                        {formatMXN(x.precio)} {x.precioUnidad === "vehiculo" ? t.porVehiculo : t.porPersona}
                      </span>
                    </span>
                    <span className="flex-shrink-0 text-verde-selva font-dm text-lg" aria-hidden="true">+</span>
                  </button>
                ))}
                {TOURS_DB.every((x) => items.some((i) => i.tourSlug === x.slug)) && (
                  <p className="p-4 font-dm text-[12px] text-negro/45 text-center">
                    {t.yaTienesTodos}
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
                  {t.hospedajeTitulo}
                </span>
                <span className="block font-dm text-[12px] text-negro/50 mt-0.5">
                  {t.hospedajeSub}
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
                                <span className="bg-verde-selva text-crema text-[9px] tracking-[2px] uppercase font-dm px-2 py-1">{t.elegida}</span>
                              </span>
                            )}
                            {h.vistaMontana && (
                              <span className="absolute top-2 left-2 bg-dorado text-negro text-[8px] tracking-[1px] uppercase font-dm px-1.5 py-0.5">
                                {t.vistaMontana}
                              </span>
                            )}
                          </span>
                          <span className="block px-3 pt-3">
                            <span className="block font-dm text-[13px] text-negro/85">{h.nombre}</span>
                            <span className="block font-dm text-[11px] text-negro/45 leading-snug mt-0.5">
                              {vistaHabitacion(h.vista, locale)} · {t.hastaPersonasDesde(h.maxHuespedes, formatMXN(h.tarifas[2] ?? h.tarifas[1]))}
                            </span>
                          </span>
                        </button>

                        {/* Cuánta gente duerme AQUÍ. Con cinco personas hacen
                            falta dos habitaciones, y el reparto lo decide el
                            cliente porque cambia el precio. */}
                        {activa && (
                          <div className="flex items-center justify-between px-3 py-2 border-t border-negro/8 mt-2">
                            <span className="font-dm text-[11px] text-negro/55">{t.duermenAqui}</span>
                            <span className="flex items-center gap-2">
                              <button type="button" aria-label={t.menosHuespedes(h.nombre)}
                                onClick={() => { setCobro(null); setHabs((prev) => prev.map((x) => x.habitacionId === h.id ? { ...x, huespedes: Math.max(1, x.huespedes - 1) } : x)); }}
                                className="w-7 h-7 border border-negro/20 text-negro/60 hover:border-verde-selva text-sm">−</button>
                              <span className="font-dm text-[12px] text-negro/80 w-4 text-center">{habs[idx].huespedes}</span>
                              <button type="button" aria-label={t.masHuespedes(h.nombre)}
                                onClick={() => { setCobro(null); setHabs((prev) => prev.map((x) => x.habitacionId === h.id ? { ...x, huespedes: Math.min(h.maxHuespedes, x.huespedes + 1) } : x)); }}
                                disabled={habs[idx].huespedes >= h.maxHuespedes}
                                className="w-7 h-7 border border-negro/20 text-negro/60 hover:border-verde-selva text-sm disabled:opacity-30">+</button>
                            </span>
                          </div>
                        )}

                        {/* Abre la galería a pantalla completa. Antes desplegaba
                          una lista de texto debajo: se apartan tres noches sin
                          haber visto bien el cuarto. */}
                        <button
                          type="button"
                          onClick={() => setGaleria(h.id)}
                          className="w-full flex items-center gap-1.5 px-3 py-2 border-t border-negro/8 font-dm text-[11px] text-verde-selva hover:bg-verde-selva/5 transition-colors text-left"
                        >
                          <Expand className="w-3 h-3" aria-hidden="true" />
                          {t.verFotosYDetalles}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {habs.length === 0 && (
                  <p className="font-dm text-[12px] text-terracota">{t.eligeAlMenosUna}</p>
                )}

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-dm text-[11px] tracking-[1.5px] uppercase text-negro/45 mb-1.5">
                      {t.entrada}
                    </label>
                    <input
                      type="date" value={checkin} min={minDate}
                      onChange={(e) => { setCheckin(e.target.value); setCobro(null); }}
                      className="w-full border border-negro/15 bg-white px-3 py-2.5 font-dm text-sm text-negro focus:border-verde-selva outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-dm text-[11px] tracking-[1.5px] uppercase text-negro/45 mb-1.5">
                      {t.salida}
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
                  {t.huespedesEnHabitaciones(huespedes, habs.length)}
                </p>

                {checkin && checkout && noches <= 0 && (
                  <p className="font-dm text-[12px] text-terracota">
                    {t.salidaDespuesDeEntrada}
                  </p>
                )}

                {hotelQuote && !hotelQuote.ok && (
                  <p className="font-dm text-[12px] text-terracota">{hotelQuote.error}</p>
                )}

                {hotelQuote?.ok && (
                  <div className="border-t border-negro/8 pt-3 space-y-1">
                    <p className="flex justify-between font-dm text-[13px] text-negro/70">
                      <span>{t.resumenNoches(noches, huespedes, hotelQuote.desglose?.length ?? 1)}</span>
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
                        {t.nochesGratis(hotelQuote.nochesGratis ?? 0, formatMXN(hotelQuote.ahorro ?? 0))}
                      </p>
                    )}
                    {noches === 2 && (
                      <p className="font-dm text-[12px] text-dorado">
                        {t.terceraNocheGratisAviso}
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
                  {t.trasladoTitulo}
                </span>
                <span className="block font-dm text-[12px] text-negro/50 mt-0.5">
                  {t.trasladoSub}
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
                          {t.desdeRedondo(formatMXN(precioBase(r)))}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {rutaTraslado && (
                  <>
                    <div className="flex items-center justify-between gap-3 border-t border-negro/8 pt-3">
                      <span className="font-dm text-[12px] text-negro/60">{t.cuantosViajan}</span>
                      <span className="flex items-center gap-2">
                        <button type="button" aria-label={t.menosPasajeros}
                          onClick={() => { setPaxTraslado((n) => Math.max(1, n - 1)); setCobro(null); }}
                          className="w-8 h-8 border border-negro/20 text-negro/60 hover:border-verde-selva text-sm leading-none">−</button>
                        <span className="font-dm text-[13px] text-negro/80 w-6 text-center tabular-nums">{paxTraslado}</span>
                        <button type="button" aria-label={t.masPasajeros}
                          onClick={() => { setPaxTraslado((n) => Math.min(20, n + 1)); setCobro(null); }}
                          className="w-8 h-8 border border-negro/20 text-negro/60 hover:border-verde-selva text-sm leading-none">+</button>
                      </span>
                    </div>

                    {precioDelTraslado !== null ? (
                      <p className="flex justify-between font-dm text-[13px] text-negro/70 border-t border-negro/8 pt-3">
                        <span>{t.trasladoLinea(rutaTraslado.ciudad, paxTraslado)}</span>
                        <strong className="whitespace-nowrap">{formatMXN(precioDelTraslado)} MXN</strong>
                      </p>
                    ) : (
                      <p className="font-dm text-[12px] text-terracota">
                        {t.trasladoGrupoGrande(paxTraslado)}
                        <a
                          href={`https://wa.me/524891251458?text=${encodeURIComponent(
                            t.waTrasladoGrande(paxTraslado, rutaTraslado.ciudad),
                          )}`}
                          target="_blank" rel="noopener noreferrer"
                          onClick={() => trackTourEvent("WHATSAPP_CLICK", { origen: "carrito_traslado_grupo_grande", ciudad: rutaTraslado.slug, personas: paxTraslado })}
                          className="underline underline-offset-2"
                        >
                          {t.escribenosPorWhatsapp}
                        </a>{t.trasladoSigueSin}
                      </p>
                    )}
                    <p className="font-dm text-[11px] text-negro/40">
                      {t.trasladoPorVehiculo}
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
        <aside className="min-w-0 border border-negro/10 bg-white p-6 lg:sticky lg:top-24">
          {/* Mismo resumen que el checkout de un tour: qué se aparta, qué va
              incluido en cada recorrido, la logística y los números. */}
          <ResumenReserva
            items={[...items.map((i) => {
              const base = TOURS_DB.find((x) => x.slug === i.tourSlug);
              const tour = base ? localizeTour(base, locale) : undefined;
              return {
                nombre:  nombreCorto(i.tourSlug, i.tourName, locale),
                fecha:   i.tourDate,
                detalle: i.unidades
                  ? `${i.ruta} · ${i.unidades} × ${i.vehiculo}`
                  : t.personas(personasDeItem(i)),
                subtotal: i.total,
                incluye:  incluyeDeTour({ incluye: tour?.incluye ?? [] }, locale),
                eleccion: i.eleccion,
                // Las actividades opcionales se cobran, así que tienen que
                // verse en el resumen. Se contratan en el renglón de arriba y
                // no aparecían por ningún lado antes de pagar.
                addOns: (i.addOns ?? []).map((a) => {
                  const cat = tour?.addOns?.find((x) => x.id === a.id);
                  return {
                    nombre:   cat?.nombre ?? a.id,
                    cantidad: a.cantidad,
                    subtotal: (cat?.precio ?? 0) * a.cantidad,
                  };
                }),
              };
            }), ...(hotelQuote?.ok ? [{
              nombre:  t.hospedajeRenglon("Hotel Paraíso Encantado"),
              // Fechas de verdad, no "Falta la fecha": el hospedaje va de un
              // día a otro y ya se eligieron arriba.
              fechaTexto: `${formatTourDate(checkin, locale)} → ${formatTourDate(checkout, locale)} · ${t.noches(noches)}`,
              // Qué habitación y cuánta gente duerme en cada una.
              detalle: (hotelQuote.desglose ?? [])
                .map((d) => `${d.habitacion} (${t.personas(d.huespedes)})`)
                .join(" + "),
              extras:  serviciosHotel(locale),
              subtotal: totalHotel,
              incluye: [
                ...(hotelQuote.desglose ?? []).map(
                  (d) => `${d.habitacion} · ${t.personas(d.huespedes)} · ${t.porNoche(formatMXN(d.porNoche))}`,
                ),
                ...((hotelQuote.nochesGratis ?? 0) > 0
                  ? [t.nochesGratisLinea(hotelQuote.nochesGratis ?? 0, formatMXN(hotelQuote.ahorro ?? 0))]
                  : []),
                ...serviciosHotel(locale),
              ],
            }] : [])]}
            total={total}
            pagaHoy={anticipo}
            saldo={saldo}
            pct={pctHoy}
            ahorroMultiple={resumen.ahorroMultiple}
          />

          {!cobro ? (
            <div className="pt-4 space-y-3">
              <input
                ref={nombreRef}
                value={name} onChange={(e) => setName(e.target.value)}
                placeholder={t.nombreCompleto}
                className="w-full border border-negro/15 bg-white px-3 py-3 font-dm text-sm text-negro placeholder:text-negro/40 focus:border-verde-selva outline-none"
              />
              <input
                value={email} onChange={(e) => setEmail(e.target.value)}
                type="email" placeholder={t.correoElectronico}
                className="w-full border border-negro/15 bg-white px-3 py-3 font-dm text-sm text-negro placeholder:text-negro/40 focus:border-verde-selva outline-none"
              />
              <input
                value={phone} onChange={(e) => setPhone(e.target.value)}
                type="tel" placeholder={t.whatsappOpcional}
                className="w-full border border-negro/15 bg-white px-3 py-3 font-dm text-sm text-negro placeholder:text-negro/40 focus:border-verde-selva outline-none"
              />
              <input
                value={pickup} onChange={(e) => setPickup(e.target.value)}
                placeholder={t.dondeTeHospedas}
                className="w-full border border-negro/15 bg-white px-3 py-3 font-dm text-sm text-negro placeholder:text-negro/40 focus:border-verde-selva outline-none"
              />
              {error && <p className="text-sm font-dm text-terracota">{error}</p>}

              {/* Resumen accionable. En escritorio esta columna es `sticky`, así
                que la persona está mirando AQUÍ cuando pulsa: dejar el aviso
                solo dentro del renglón —que puede estar fuera de pantalla— no
                sirve. Dice qué falta y lleva ahí. */}
              {fallos.length > 0 && (
                <div className="border border-terracota/40 bg-terracota/5 p-3">
                  <p className="flex items-start gap-1.5 font-dm text-[12px] text-terracota">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-px" aria-hidden="true" />
                    <span>
                      {fallos.length === 1
                        ? fallos[0].mensajeLargo
                        : t.faltanDatos(fallos.length, fallos[0].mensajeLargo)}
                    </span>
                  </p>
                  <button
                    type="button"
                    onClick={() => irAlRenglon(fallos[0].uid)}
                    className="mt-2 font-dm text-[12px] text-verde-selva underline underline-offset-2 hover:text-verde-vivo transition-colors"
                  >
                    {t.llevameAhi}
                  </button>
                </div>
              )}

              <button
                onClick={irAlPago}
                disabled={cargando}
                className="w-full bg-verde-selva text-crema py-4 text-sm tracking-[2px] uppercase font-dm hover:bg-verde-vivo transition-colors disabled:opacity-40"
              >
                {cargando ? t.unMomento : t.continuarAlPago}
              </button>

              {/* La salida secundaria. Va DEBAJO del botón de pagar a propósito:
                arriba le canibaliza el clic al CTA principal.
                Existe porque hasta ahora quien se iba del carrito sin pagar no
                dejaba rastro, y la secuencia de tres recordatorios que ya está
                montada no tenía a quién escribirle. */}
              <div className="pt-4 border-t border-negro/10">
                {guardado ? (
                  <p className="font-dm text-[12px] text-verde-selva bg-verde-selva/8 border border-verde-selva/25 px-3 py-2.5">
                    {t.cotizacionEnviada}
                  </p>
                ) : (
                  <>
                    <p className="font-dm text-[12px] text-negro/55 mb-2">
                      {t.todaviaLoPiensas}
                    </p>
                    <div className="flex gap-2">
                      <input
                        value={correoGuardar || email}
                        onChange={(e) => { setCorreoGuardar(e.target.value); setErrorGuardar(""); }}
                        type="email"
                        placeholder={t.tuCorreoPlaceholder}
                        className="flex-1 min-w-0 border border-negro/15 bg-white px-3 py-2.5 font-dm text-[13px] text-negro placeholder:text-negro/35 focus:border-verde-selva outline-none"
                      />
                      <button
                        type="button"
                        onClick={guardarCotizacion}
                        disabled={guardando}
                        className="flex-shrink-0 border border-verde-selva text-verde-selva px-4 text-[11px] tracking-[1.5px] uppercase font-dm hover:bg-verde-selva/8 transition-colors disabled:opacity-40"
                      >
                        {guardando ? "…" : t.enviar}
                      </button>
                    </div>
                    {errorGuardar && <p className="font-dm text-[11px] text-terracota mt-1.5">{errorGuardar}</p>}
                    <p className="font-dm text-[11px] text-negro/35 mt-1.5">
                      {t.sinCompromiso}
                    </p>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="pt-4">
              {restante > 0 ? (
                <p className="mb-3 flex items-center gap-2 border border-dorado/35 bg-dorado/10 px-3 py-2.5 font-dm text-[12px] text-negro/70">
                  <Clock className="w-4 h-4 text-dorado flex-shrink-0" aria-hidden="true" />
                  <span>
                    {conHotel && hotelQuote?.ok ? t.apartadoActivoHabitacion : t.apartadoActivo}{" "}
                    <strong className="text-negro tabular-nums">
                      {Math.floor(restante / 60)}:{String(restante % 60).padStart(2, "0")}
                    </strong>
                  </span>
                </p>
              ) : (
                expiraEn !== null && (
                  <p className="mb-3 border border-terracota/40 bg-terracota/8 px-3 py-2.5 font-dm text-[12px] text-terracota">
                    {t.apartadoVencido}
                  </p>
                )
              )}
              <Elements stripe={stripePromise} options={{ clientSecret: cobro.clientSecret, locale }}>
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
                    <strong className="text-negro">4.9</strong> · {t.resenasGoogle}
                  </span>
                  <span className="font-dm text-[11px] text-negro/40 group-hover:text-verde-selva transition-colors">{t.verlas}</span>
                </a>
                <p className="flex items-center gap-2 font-dm text-[12px] text-negro/50 mb-4">
                  <Users className="w-3.5 h-3.5 text-verde-selva" aria-hidden="true" />
                  {t.credenciales}
                </p>

                {resenas.length > 0 && (
                  <div className="space-y-3 border-t border-negro/8 pt-4">
                    {t.resenasEnEspanol && (
                      <p className="font-dm text-[11px] text-negro/40 italic">{t.resenasEnEspanol}</p>
                    )}
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
          <h2 className="font-cormorant text-verde-profundo text-xl mb-3">{t.antesDePagar}</h2>
          <div className="divide-y divide-negro/10 border-y border-negro/10">
            {t.faq.map((f) => (
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
            {t.otraDuda}{" "}
            <a href={`https://wa.me/524891251458?text=${encodeURIComponent(t.waDudaAntesDePagar)}`}
               target="_blank" rel="noopener noreferrer"
               className="text-verde-selva underline underline-offset-2">{t.escribenosWhatsapp}</a>{t.antesDePagarCola}
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
            <p className="font-dm text-[10px] tracking-[1.5px] uppercase text-negro/45 leading-none">{t.pagasHoy}</p>
            <p className="font-cormorant text-dorado text-xl leading-tight">{formatMXN(anticipo)} MXN</p>
            {resumen.ahorroMultiple > 0 && (
              <p className="font-dm text-[10px] text-verde-selva leading-none mt-0.5 truncate">
                {t.ahorroMultiple(formatMXN(resumen.ahorroMultiple))}
              </p>
            )}
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
            {cargando ? t.unMomento : t.continuar}
          </button>
        </div>
      )}

      {/* A los 3 minutos sin cerrar la reserva. Se apaga solo cuando el cliente
        ya está en la pantalla de pago.
        ⚠️ Vive aquí, en el árbol del carrito CON recorridos. Estuvo colgado del
        `return` del carrito vacío, donde su propia condición (`items.length > 0`)
        no podía cumplirse nunca: no se mostró una sola vez desde que se creó. */}
      <GaleriaHabitacion
        habitacion={HABITACIONES_HOTEL.find((h) => h.id === galeria) ?? null}
        abierta={!!galeria}
        onCerrar={() => setGaleria(null)}
      />

      <RescatePopup activo={items.length > 0 && !cobro} mensaje={waRescate} />
    </main>
  );
}
