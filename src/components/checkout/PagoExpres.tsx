"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Elements, ExpressCheckoutElement, useElements, useStripe } from "@stripe/react-stripe-js";
import type { StripeExpressCheckoutElementConfirmEvent } from "@stripe/stripe-js";
import { stripePromise, APARIENCIA_STRIPE } from "@/lib/stripeCliente";
import { trackTourEvent } from "@/lib/tourTracker";
import { cerrarCompraCarrito } from "@/components/carrito/cerrarCompra";
import type { CarritoCheckout } from "@/components/carrito/useCarritoCheckout";

/**
 * Pago exprés en el paso 1 (13 nov 2026, auditoría: «para un solo tour, ofrece
 * Apple Pay o Google Pay desde el paso 1»).
 *
 * Con UN recorrido listo (`expresDisponible`), la billetera cobra el anticipo
 * de una vez y da nombre, correo y teléfono: se salta los pasos 2 y 3. El
 * cobro lo crea el MISMO servidor (`carrito-payment-intent`, con toda su
 * metadata) y la compra se cierra con `cerrarCompraCarrito`, igual que con
 * tarjeta: misma reserva, mismas notas y mismo correo.
 *
 * Solo se pinta si el navegador TIENE Apple Pay o Google Pay; si no, no deja
 * ni el hueco. Apple Pay además pide el dominio registrado en Stripe.
 */
export function PagoExpres({ c }: { c: CarritoCheckout }) {
  if (!c.expresDisponible) return null;
  // `key`: si cambia el anticipo (otra fecha, más personas) el botón se arma de
  // nuevo con el monto bueno; la billetera enseña ese monto.
  return (
    <Elements
      key={c.anticipo}
      stripe={stripePromise}
      options={{ mode: "payment", amount: c.anticipo * 100, currency: "mxn", locale: c.locale, appearance: APARIENCIA_STRIPE }}
    >
      <BotonesExpres c={c} />
    </Elements>
  );
}

function BotonesExpres({ c }: { c: CarritoCheckout }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [hay, setHay] = useState(false);
  const [error, setError] = useState("");
  const [cerrando, setCerrando] = useState(false);
  const dinero = (n: number) => `$${n.toLocaleString(c.en ? "en-US" : "es-MX")}`;

  async function confirmar(ev: StripeExpressCheckoutElementConfirmEvent) {
    if (!stripe || !elements) return;
    setError("");
    const { error: errEnvio } = await elements.submit();
    if (errEnvio) { setError(errEnvio.message || ""); ev.paymentFailed({ reason: "fail" }); return; }

    const b = ev.billingDetails;
    const contacto = { name: (b?.name || "").trim(), email: (b?.email || "").trim(), phone: (b?.phone || "").trim() };
    if (!contacto.name || !contacto.email) {
      ev.paymentFailed({ reason: "invalid_payment_data" });
      setError(c.en ? "We need your name and email: continue below." : "Necesitamos tu nombre y correo: continúa abajo.");
      return;
    }
    const { cobro, error: errCobro } = await c.cobroExpres(contacto);
    // 🔴 La billetera ya enseñó un monto: si el servidor calcula otro (cambió
    // la promo o el cupo), no se cobra uno distinto al que la persona aprobó.
    if (!cobro || cobro.amount !== c.anticipo) {
      ev.paymentFailed({ reason: "fail" });
      setError(errCobro || (c.en ? "The amount changed: continue below to see it." : "El monto cambió: continúa abajo para verlo."));
      return;
    }
    trackTourEvent("PAGO_EXPRES", { tipo: ev.expressPaymentType, amount: cobro.amount, paymentIntentId: cobro.paymentIntentId });
    const { error: errPago, paymentIntent } = await stripe.confirmPayment({
      elements,
      clientSecret: cobro.clientSecret,
      confirmParams: { return_url: `${window.location.origin}${c.lp("/reservar-tour/confirmacion")}` },
      redirect: "if_required",
    });
    if (errPago) {
      trackTourEvent("PAGO_FALLIDO", { carrito: true, expres: true, amount: cobro.amount, code: errPago.code, message: errPago.message, paymentIntentId: cobro.paymentIntentId });
      setError(errPago.message || (c.en ? "The payment didn't go through." : "El pago no pasó."));
      return;
    }
    if (paymentIntent?.status === "succeeded") {
      setCerrando(true);
      c.setName(contacto.name); c.setEmail(contacto.email); c.setPhone(contacto.phone);
      await cerrarCompraCarrito({
        cobro,
        datos: { ...contacto, pickup: c.pickup, guiaIngles: c.guiaIngles },
        locale: c.locale,
        onListo: () => c.setItems([]),
        irA: (ruta) => router.push(c.lp(ruta)),
      });
    }
  }

  return (
    <div className={hay ? "mt-5" : "hidden"} aria-hidden={!hay}>
      <p className="mb-2 font-dm text-[11px] tracking-[1.5px] uppercase text-negro/45">
        {c.en ? `Pay in one tap · ${dinero(c.anticipo)} MXN today` : `Aparta en un toque · ${dinero(c.anticipo)} hoy`}
      </p>
      <ExpressCheckoutElement
        options={{
          emailRequired: true,
          phoneNumberRequired: true,
          buttonType: { applePay: "book", googlePay: "book" },
          buttonHeight: 48,
          paymentMethods: { applePay: "auto", googlePay: "auto", link: "never", paypal: "never", amazonPay: "never" },
        }}
        onReady={({ availablePaymentMethods }) => setHay(!!(availablePaymentMethods?.applePay || availablePaymentMethods?.googlePay))}
        onConfirm={confirmar}
      />
      {cerrando && <p role="status" className="mt-2 font-dm text-[12px] text-verde-selva">{c.en ? "Paid! Confirming your booking…" : "¡Pagado! Confirmando tu reserva…"}</p>}
      {error && <p role="alert" className="mt-2 font-dm text-[12px] text-terracota">{error}</p>}
      <p className="mt-3 flex items-center gap-3 font-dm text-[11px] text-negro/40">
        <span className="h-px flex-1 bg-negro/10" />
        {c.en ? "or continue with card" : "o continúa con tarjeta"}
        <span className="h-px flex-1 bg-negro/10" />
      </p>
    </div>
  );
}
