"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Lock, MessageCircle, CreditCard } from "lucide-react";
import { formatMXN, formatTourDate } from "@/lib/tourBooking";
import { useLocale } from "@/lib/i18n/useLocale";
import { getBooking } from "@/lib/i18n/booking";
import { trackTourEvent, marcarPasoClarity } from "@/lib/tourTracker";
import { hayMsi, MSI_PLAZOS } from "@/lib/stripeMsi";
import { nombreCorto, type Cobro } from "@/components/carrito/carritoComun";
import { cerrarCompraCarrito } from "@/components/carrito/cerrarCompra";

// ── Formulario de pago del carrito ───────────────────────────────────────────

export function PagoCarrito({ cobro, datos, onListo, formId }: {
  /** Para que la barra fija del celular pueda enviar este formulario. */
  formId?: string;
  cobro: Cobro;
  datos: { name: string; email: string; phone: string; pickup: string; checkin?: string; checkout?: string; guiaIngles?: boolean };
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
  // El banco rechazó la tarjeta al menos una vez: la salida por WhatsApp sube
  // junto al error. El 16 oct 2026 un visitante lo intentó 3 veces (3 rechazos)
  // y se fue sin ver el bloque de abajo.
  const [rechazada, setRechazada] = useState(false);

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
      if (stripeError.type === "card_error" || stripeError.code === "card_declined") setRechazada(true);
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
      await cerrarCompraCarrito({ cobro, datos, locale, onListo, irA: (ruta) => router.push(lp(ruta)) });
    }
  }

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-4">
      {/* 🔴 Apple Pay y Google Pay: el carrito era el ÚNICO de los tres cobros
          que no los ofrecía —el del RZR y el de paquetes sí—, y es por donde
          pasa casi toda la venta. `auto` los enseña solo si el navegador y la
          tarjeta los tienen. Apple Pay además necesita el dominio verificado en
          el panel de Stripe; sin eso no sale y nada se rompe. */}
      <PaymentElement options={{ layout: "tabs", wallets: { applePay: "auto", googlePay: "auto" } }} />

      {/* Los meses se eligen DENTRO del formulario de Stripe, al teclear la
          tarjeta, así que aquí solo se anuncia que existen: si no, nadie llega
          a verlos. Solo cuando el importe de hoy los habilita. */}
      {hayMsi(cobro.amount) && (
        <p className="flex items-start gap-2 border border-verde-selva/30 bg-verde-selva/5 p-3 font-dm text-[12px] leading-relaxed text-verde-profundo">
          <CreditCard className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-verde-selva" aria-hidden="true" />
          <span>
            <strong className="font-medium">{t.msiTitulo(MSI_PLAZOS.join(", "))}</strong>
            <br />
            <span className="text-negro/55">{t.msiDetalle}</span>
          </span>
        </p>
      )}
      {error && <p className="text-sm font-dm text-terracota bg-terracota/10 border border-terracota/30 p-3">{error}</p>}
      {rechazada && (
        <div className="border border-[#25D366]/50 bg-[#25D366]/8 p-3.5">
          <p className="font-dm text-[12px] leading-snug text-negro/75">{t.tarjetaRechazadaAyuda}</p>
          <a
            href={waPagoAlterno}
            target="_blank"
            rel="noopener noreferrer"
            data-wa-manual="1"
            onClick={() => trackTourEvent("WHATSAPP_CLICK", { origen: "carrito_tarjeta_rechazada", amount: cobro.amount, recorridos: cobro.lineItems.length })}
            className="mt-3 flex w-full items-center justify-center gap-2.5 bg-[#25D366] py-3.5 font-dm text-[11px] uppercase tracking-[2px] text-white transition-[filter] hover:brightness-110"
          >
            <MessageCircle className="w-4 h-4" aria-hidden="true" />
            {t.apartarPorWhatsapp}
          </a>
        </div>
      )}
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
          para que nadie tenga que volver a preguntarlo por chat.

          🔴 8 oct 2026: era una línea de 12 px al final del formulario, debajo
          del botón de pagar y de la letra chica — o sea, invisible. Manolo pidió
          que OXXO «quede claro en la pasarela». Ahora es un bloque con su
          encabezado. Sigue SIN pasar por Stripe a propósito (decisión suya del
          4 oct): OXXO por Stripe cobra hasta tres días después y el webhook del
          sitio todavía no está conectado, así que esa reserva se perdería. */}
      <div className="border-t border-negro/10 pt-4">
        <p className="mb-1 text-center font-dm text-[10px] uppercase tracking-[2px] text-negro/40">
          {t.otrasFormas}
        </p>
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
