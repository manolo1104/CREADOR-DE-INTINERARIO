/**
 * corregir-hotel-reservas-web.ts — el hotel de las reservas web que quedaron
 * SIN su importe (lote 5 de la auditoría, 5 nov 2026).
 *
 * Hasta el 5 nov 2026, la reserva del carrito con hotel que creaba la pantalla
 * de confirmación no guardaba el hotel, y la de paquete lo guardaba sin
 * importe. El corte reparte 50/50 lo que no es hotel: el dinero del hotel se
 * iba a la ganancia de tours. Este script le pone a cada una su hotel con el
 * importe, tomado del pago en Stripe (o, si no, de la nota «Hospedaje: …»).
 * Lo que no cuadra lo lista para revisarlo a mano; nunca adivina.
 *
 * OJO: cambiar el hotel de una reserva vieja cambia cómo se reparte su dinero
 * en el corte de esa semana si se vuelve a abrir. Correrlo en ensayo primero y
 * revisar la lista con Manolo.
 *
 * Uso (desde la carpeta del repo):
 *   npx tsx src/scripts/corregir-hotel-reservas-web.ts            # ensayo: lista qué cambiaría
 *   npx tsx src/scripts/corregir-hotel-reservas-web.ts --aplicar  # escribe
 * Idempotente: la segunda corrida ya no encuentra qué cambiar.
 */
import Stripe from "stripe";
import { PrismaClient } from "@prisma/client";
import { cargarEnv, describeBase } from "./_env";
import { corregirHotelReservasWeb } from "../lib/admin/correccionHotelWeb";

cargarEnv();
const prisma = new PrismaClient();

async function main() {
  const aplicar = process.argv.includes("--aplicar");
  console.log(describeBase());
  console.log(aplicar ? "MODO: aplicar (escribe en la base)" : "MODO: ensayo (no escribe nada)");

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) console.log("⚠️  Sin STRIPE_SECRET_KEY: solo se usa la nota «Hospedaje: …» de cada reserva.");
  const stripe = key ? new Stripe(key, { apiVersion: "2024-06-20" }) : null;

  const r = await corregirHotelReservasWeb({
    db: prisma,
    aplicar,
    leerMetadata: async (id) => (stripe ? ((await stripe.paymentIntents.retrieve(id)).metadata ?? {}) : null),
    log: (linea) => console.log(linea),
  });

  console.log("");
  console.log(`Revisadas: ${r.revisadas} · ${aplicar ? "corregidas" : "por corregir"}: ${r.corregidas.length} · a revisar a mano: ${r.revisar.length}`);
  if (!aplicar && r.corregidas.length) console.log("Ensayo terminado. Corre con --aplicar para escribir.");
}

main()
  .catch((e) => { console.error("ERROR:", e?.message ?? e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
