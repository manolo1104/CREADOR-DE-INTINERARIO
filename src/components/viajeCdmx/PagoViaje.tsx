"use client";

/**
 * El pago del anticipo. Se carga SOLO cuando alguien llega a este paso
 * (`next/dynamic` en `ReservaViaje`): Stripe.js pesa, y la mayoría del tráfico
 * llega de un anuncio en el celular y nunca pasa del calendario.
 */
import { useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { Lock } from "lucide-react";
import { stripePromise, APARIENCIA_STRIPE } from "@/lib/stripeCliente";
import { hayMsi } from "@/lib/stripeMsi";
import { pesos } from "@/lib/viajeCdmx/precio";
import { VIAJE_RUTA } from "@/lib/viajeCdmx/config";
import { FaltaPara } from "./FaltaPara";

export interface CobroViaje {
  holdId: string;
  paymentIntentId: string;
  clientSecret: string;
  expiraEl: string;
  metodos: string[];
  unitario: number;
  personas: number;
  total: number;
  anticipo: number;
  saldo: number;
  saldoVence: string;
}

export type ResultadoPago =
  | { estado: "pagado"; folio: string; personas: number; total: number; anticipo: number; saldo: number }
  | { estado: "oxxo"; voucherUrl: string | null; vence: string; anticipo: number }
  | { estado: "procesando" };

interface Props {
  cobro: CobroViaje;
  datos: { nombre: string; email: string };
  onResultado: (r: ResultadoPago) => void;
  /** Su lugar se lo llevó otro: hay que volver a elegir. */
  onPerdido: (mensaje: string) => void;
}

export default function PagoViaje(props: Props) {
  return (
    <Elements
      stripe={stripePromise}
      options={{ clientSecret: props.cobro.clientSecret, appearance: APARIENCIA_STRIPE, locale: "es" }}
    >
      <Formulario {...props} />
    </Elements>
  );
}

function Formulario({ cobro, datos, onResultado, onPerdido }: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [expira, setExpira] = useState(cobro.expiraEl);
  const conOxxo = cobro.metodos.includes("oxxo");

  async function pagar(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setEnviando(true);
    setError("");

    // 1) Que su lugar siga siendo suyo ANTES de cobrar.
    const ren = await fetch("/api/viaje-cdmx/apartado", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "renovar", holdId: cobro.holdId, paymentIntentId: cobro.paymentIntentId }),
    }).catch(() => null);
    const rj = ren ? await ren.json().catch(() => ({})) : {};
    if (!ren || !ren.ok) {
      setEnviando(false);
      if (ren && (ren.status === 409 || ren.status === 404)) return onPerdido(rj.error || "Tu apartado venció. Vuelve a elegir la fecha.");
      return setError(rj.error || "No pudimos comprobar tu lugar. Revisa tu conexión e intenta de nuevo.");
    }
    if (rj.expiraEl) setExpira(rj.expiraEl);

    // 2) El cobro. La tarjeta con 3-D Secure y la ficha OXXO se abren aquí mismo.
    const { error: err, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        payment_method_data: { billing_details: { name: datos.nombre, email: datos.email } },
        return_url: `${window.location.origin}${VIAJE_RUTA}/confirmacion`,
      },
      redirect: "if_required",
    });
    if (err) {
      setEnviando(false);
      return setError(err.message || "No se pudo completar el pago. Tu lugar sigue apartado: intenta de nuevo.");
    }

    // 3) El servidor le pregunta a Stripe y arma la reserva.
    const conf = await fetch("/api/viaje-cdmx/confirmar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentIntentId: paymentIntent?.id ?? cobro.paymentIntentId }),
    }).catch(() => null);
    const cj = conf ? await conf.json().catch(() => ({})) : {};
    setEnviando(false);
    if (conf?.status === 409) return onPerdido(cj.error);
    if (cj.estado === "pagado" || cj.estado === "oxxo" || cj.estado === "procesando") return onResultado(cj as ResultadoPago);
    // El pago pasó pero la confirmación no contestó: el webhook la arma igual.
    if (paymentIntent?.status === "succeeded") return onResultado({ estado: "procesando" });
    setError("No pudimos confirmar tu pago. Si se te cobró, tu lugar está seguro: te llega el correo en unos minutos.");
  }

  return (
    <form onSubmit={pagar} className="space-y-4">
      <p className="text-xs font-dm text-verde-profundo/70">
        Tu lugar está apartado mientras pagas
        {" · "}
        <FaltaPara hasta={expira} className="text-verde-profundo font-medium" />
      </p>
      <PaymentElement
        options={{
          layout: { type: "tabs" },
          fields: { billingDetails: { name: "never", email: "never" } },
          wallets: { applePay: "auto", googlePay: "auto" },
        }}
      />
      {conOxxo && (
        <p className="text-xs font-dm text-verde-profundo/60 leading-relaxed">
          Con OXXO te damos una ficha para pagar en efectivo antes de que termine el día siguiente. Tu lugar queda apartado
          hasta que OXXO confirme (hasta un día hábil).
        </p>
      )}
      {hayMsi(cobro.anticipo) && (
        <p className="text-xs font-dm text-verde-profundo/60">Con tarjeta de crédito participante puedes pagar a 3, 6 o 9 meses.</p>
      )}
      {error && <p className="text-sm font-dm text-terracota" role="alert">{error}</p>}
      <button
        type="submit"
        disabled={!stripe || enviando}
        className="w-full min-h-[52px] bg-verde-profundo text-crema hover:bg-verde-selva disabled:opacity-60 text-[12px] tracking-[2px] uppercase font-dm inline-flex items-center justify-center gap-2 transition-colors"
      >
        <Lock className="w-4 h-4" aria-hidden="true" />
        {enviando ? "Procesando…" : `Pagar anticipo · ${pesos(cobro.anticipo)}`}
      </button>
      <p className="text-[11px] font-dm text-verde-profundo/50 text-center">
        Pago seguro con Stripe. Hoy pagas {pesos(cobro.anticipo)}; el resto ({pesos(cobro.saldo)}) antes de la salida.
      </p>
    </form>
  );
}
