/**
 * Solo LEE: ¿OXXO y SPEI están apagados para los demás cobros?
 *
 *   npx tsx src/scripts/revisar-oxxo-stripe.ts
 *
 * El viaje CDMX pide OXXO por nombre (`payment_method_types`), así que la
 * cuenta necesita el método ACTIVO, pero la configuración POR DEFECTO —la que
 * usan los tours, el carrito, los paquetes y Kora con
 * `automatic_payment_methods`— lo tiene que tener APAGADO. Si sale «🔴», OXXO
 * aparecería en esos cobros: apágalo en Configuración → Métodos de pago.
 */
import Stripe from "stripe";
import { cargarEnv } from "./_env";

cargarEnv();

async function main() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Falta STRIPE_SECRET_KEY");
  const stripe = new Stripe(key, { apiVersion: "2024-06-20" });
  console.log(`Cuenta en modo ${key.startsWith("sk_live_") ? "REAL" : "prueba"}\n`);
  const configs = await stripe.paymentMethodConfigurations.list({ limit: 20 });
  let alerta = false;
  for (const c of configs.data) {
    const ver = (m: "oxxo" | "customer_balance") => {
      const x = (c as unknown as Record<string, { available?: boolean; display_preference?: { value?: string } } | undefined>)[m];
      return x ? `${x.available ? "disponible" : "no disponible"}, ${x.display_preference?.value ?? "?"}` : "sin dato";
    };
    console.log(`${c.is_default ? "★ POR DEFECTO" : "  otra"} · ${c.name} (${c.id})`);
    console.log(`    OXXO: ${ver("oxxo")} · Transferencia (SPEI): ${ver("customer_balance")}`);
    const oxxo = (c as unknown as { oxxo?: { display_preference?: { value?: string } } }).oxxo;
    if (c.is_default && oxxo?.display_preference?.value === "on") alerta = true;
  }
  console.log(alerta
    ? "\n🔴 OXXO está ENCENDIDO en la configuración por defecto: aparece en tours, carrito, paquetes y Kora."
    : "\n✅ La configuración por defecto no ofrece OXXO.");
}

main().catch((e) => { console.error(e?.message ?? e); process.exit(1); });
