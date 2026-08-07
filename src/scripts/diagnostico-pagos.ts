/**
 * diagnostico-pagos.ts — ¿por qué murieron los intentos de pago?
 *
 * Lista los PaymentIntents recientes de Stripe con su estado real y, sobre
 * todo, el motivo exacto del fallo (last_payment_error). Sirve para dejar de
 * adivinar: dice si el pago se cayó por el banco, por 3D Secure, o porque el
 * cliente eligió un método que exige redirección (OXXO / SPEI).
 *
 * Uso:  npx tsx src/scripts/diagnostico-pagos.ts [días]   (por defecto 30)
 */

import Stripe from "stripe";
import { cargarEnv } from "./_env";

const mxn = (centavos: number) =>
  "$" + (centavos / 100).toLocaleString("es-MX", { maximumFractionDigits: 0 }) + " MXN";

const fecha = (unix: number) =>
  new Date(unix * 1000).toLocaleString("es-MX", { timeZone: "America/Mexico_City" });

const ICONO: Record<string, string> = {
  succeeded:               "✅",
  processing:              "⏳",
  requires_payment_method: "❌",
  requires_action:         "🔐",
  requires_confirmation:   "🟡",
  requires_capture:        "🟠",
  canceled:                "🚫",
};

async function main() {
  cargarEnv();

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.error("Falta STRIPE_SECRET_KEY (ponla en .env.local o en el entorno).");
    process.exit(1);
  }

  const dias = Number(process.argv[2]) || 30;
  const desde = Math.floor(Date.now() / 1000) - dias * 24 * 60 * 60;

  const stripe = new Stripe(key, { apiVersion: "2024-06-20" });

  console.log(`\n💳  Intentos de pago de los últimos ${dias} días`);
  console.log(`    Cuenta: ${key.startsWith("sk_live") ? "LIVE" : "TEST"}\n`);

  const todos: Stripe.PaymentIntent[] = [];
  for await (const pi of stripe.paymentIntents.list({ created: { gte: desde }, limit: 100 })) {
    todos.push(pi);
  }

  if (todos.length === 0) {
    console.log("    (ninguno)\n");
    return;
  }

  // Solo los que nacieron en el sitio. Los demás (payment links, cobros
  // manuales desde el panel de Stripe) no dicen nada del embudo web.
  const intents = todos.filter((pi) => pi.metadata?.source === "huasteca-potosina.com");
  const externos = todos.filter((pi) => pi.metadata?.source !== "huasteca-potosina.com");

  const porEstado: Record<string, number> = {};
  const porMotivo: Record<string, number> = {};
  let montoPerdido = 0;

  for (const pi of intents.reverse()) {
    porEstado[pi.status] = (porEstado[pi.status] || 0) + 1;

    const meta = pi.metadata || {};
    const err  = pi.last_payment_error;
    const pmTipos = pi.payment_method_types.join(", ");

    console.log(`${ICONO[pi.status] ?? "•"}  ${pi.status.toUpperCase()}  ${mxn(pi.amount)}  ${pi.id}`);
    console.log(`    ${fecha(pi.created)}`);
    if (meta.tourName) console.log(`    Tour:     ${meta.tourName}${meta.tourDate ? ` · ${meta.tourDate}` : ""}`);
    const quien = [meta.customerName, meta.customerEmail || pi.receipt_email].filter(Boolean).join(" · ");
    if (quien) console.log(`    Cliente:  ${quien}`);
    console.log(`    Métodos:  ${pmTipos}`);

    if (err) {
      const motivo = err.decline_code || err.code || err.type || "desconocido";
      porMotivo[motivo] = (porMotivo[motivo] || 0) + 1;
      console.log(`    ⚠️  Falló:  ${motivo}`);
      if (err.message) console.log(`        «${err.message}»`);
      if (err.payment_method?.type) console.log(`        método usado: ${err.payment_method.type}`);
    }

    if (pi.status !== "succeeded" && pi.status !== "processing") {
      montoPerdido += pi.amount;
    }

    console.log("");
  }

  console.log("─".repeat(60));
  console.log("RESUMEN");
  for (const [estado, n] of Object.entries(porEstado).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${ICONO[estado] ?? "•"}  ${estado.padEnd(24)} ${n}`);
  }
  if (Object.keys(porMotivo).length) {
    console.log("\nMOTIVOS DE FALLO");
    for (const [motivo, n] of Object.entries(porMotivo).sort((a, b) => b[1] - a[1])) {
      console.log(`  ⚠️   ${motivo.padEnd(24)} ${n}`);
    }
  }
  const exitosos = porEstado.succeeded || 0;
  console.log(`\n  Conversión web:  ${exitosos}/${intents.length} (${((exitosos / intents.length) * 100).toFixed(1)}%)`);
  console.log(`  Sin cobrar:      ${mxn(montoPerdido)}`);

  // `requires_payment_method` SIN last_payment_error = la tarjeta nunca se
  // envió a Stripe. El PaymentIntent se crea al abrir /checkout, así que esos
  // son "abrió el checkout y no le dio a pagar", no "le rechazaron la tarjeta".
  const sinIntentar = intents.filter(
    (pi) => pi.status === "requires_payment_method" && !pi.last_payment_error,
  ).length;
  if (sinIntentar) {
    console.log(
      `\n  ⓘ  ${sinIntentar} abrieron el checkout y NUNCA enviaron una tarjeta`,
    );
    console.log(`     (cero rechazos del banco: el problema está antes del cobro)`);
  }

  if (externos.length) {
    const okExt = externos.filter((pi) => pi.status === "succeeded").length;
    console.log(
      `\n  Fuera del sitio: ${externos.length} intento(s), ${okExt} cobrado(s)` +
      `  ← links de pago / cobros manuales`,
    );
  }

  await revisarWebhooks(stripe);
  console.log("");
}

/**
 * Sin un endpoint de webhook registrado para el sitio, Stripe no le avisa a
 * nadie cuando un pago se acredita o falla: se pierde la red de seguridad que
 * registra la reserva si el cliente cierra la pestaña, y los pagos rechazados
 * nunca quedan anotados.
 */
async function revisarWebhooks(stripe: Stripe) {
  console.log("\n" + "─".repeat(60));
  console.log("WEBHOOKS");
  try {
    const eps = await stripe.webhookEndpoints.list({ limit: 100 });
    const delSitio = eps.data.filter((e) => e.url.includes("huasteca-potosina.com"));

    if (delSitio.length === 0) {
      console.log("  ⛔ NO hay endpoint registrado para huasteca-potosina.com");
      console.log("     Stripe nunca avisa de pagos acreditados ni rechazados.");
      console.log("     Debería existir: https://www.huasteca-potosina.com/api/stripe-webhook");
    } else {
      for (const e of delSitio) {
        console.log(`  ${e.status === "enabled" ? "✅" : "⛔"} ${e.url}  (${e.status})`);
        console.log(`     escucha: ${e.enabled_events.join(", ")}`);
      }
    }

    const ajenos = eps.data.filter((e) => !e.url.includes("huasteca-potosina.com"));
    if (ajenos.length) {
      console.log(`\n  ⚠️  ${ajenos.length} endpoint(s) de OTROS proyectos en esta misma cuenta:`);
      for (const e of ajenos) console.log(`     ${e.status === "enabled" ? "•" : "⛔"} ${e.url}`);
    }
  } catch (e) {
    console.log("  (no se pudieron leer los webhooks:", e instanceof Error ? e.message : e, ")");
  }
}

main().catch((e) => {
  console.error("Error:", e instanceof Error ? e.message : e);
  process.exit(1);
});
