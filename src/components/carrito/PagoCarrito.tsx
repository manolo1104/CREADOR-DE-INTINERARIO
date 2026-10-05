"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Lock, MessageCircle } from "lucide-react";
import { vaciarCarrito } from "@/lib/carrito";
import { limpiarExtras } from "@/lib/carritoExtras";
import { formatMXN, formatTourDate } from "@/lib/tourBooking";
import { useLocale } from "@/lib/i18n/useLocale";
import { getBooking } from "@/lib/i18n/booking";
import { trackTourEvent, marcarPasoClarity } from "@/lib/tourTracker";
import { trackPurchase } from "@/lib/analytics";
import { nombreCorto, type Cobro } from "@/components/carrito/carritoComun";
import { guardarConfirmacion } from "@/lib/checkout/confirmacion";

// ── Formulario de pago del carrito ───────────────────────────────────────────

export function PagoCarrito({ cobro, datos, onListo, formId }: {
  /** Para que la barra fija del celular pueda enviar este formulario. */
  formId?: string;
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

  // El formulario de pago está en pantalla: la grabación de Clarity se marca
  // como «6·pantalla_de_pago» (el servidor ya cuenta el paso por su lado).
  useEffect(() => {
    marcarPasoClarity("PAYMENT_INITIATED", { amount: cobro.amount });
  }, [cobro.amount]);

  const wa = t.waPagoAlterno;
  const waPagoAlterno = `https://wa.me/524891090388?text=${encodeURIComponent(
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
              // Va UNA persona: pagó la tarifa de viajero solo y el equipo tiene
              // que sumarla a un grupo armado para esa fecha.
              ...cobro.lineItems
                .filter((l) => l.viajeroSolo)
                .map((l) => t.notas.viajeroSolo(l.tourName.split("—")[0].trim(), l.tourDate)),
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

      // Solo se cuenta la venta si tenemos el FOLIO. Antes, cuando el correo
      // fallaba, se mandaba el id del PaymentIntent como número de transacción
      // — y el servidor manda el folio: eran dos identificadores distintos para
      // la misma venta, así que GA4 no podía deduplicarlos y la contaba dos
      // veces. Sin folio no se manda nada: el webhook la registra igual, con el
      // número bueno.
      if (confirmationNumber) trackPurchase({
        confirmationNumber,
        tourId:   primero.tourName,
        tourName: resumen,
        total:    cobro.amount,
        adults:   totalAdultos,
        children: totalNinos,
      });
      trackTourEvent("BOOKING_CONFIRMED", { carrito: true, amount: cobro.amount, total: cobro.total });

      // La forma la dicta `ConfirmationData` (`lib/checkout/confirmacion.ts`):
      // el carrito escribía sus propios nombres y la pantalla de éxito enseñaba
      // el TOTAL donde va lo COBRADO. Ahora un campo mal escrito no compila.
      guardarConfirmacion({
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
      });
      vaciarCarrito();
      limpiarExtras();
      onListo();
      router.push(lp("/reservar-tour/confirmacion"));
    }
  }

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-4">
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
          data-wa-manual="1"
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
