/**
 * Le pone un renglón de cobro a cada reserva que ya tenía dinero cobrado.
 *
 *   npx tsx src/scripts/backfill-cobros.ts            → enseña qué haría
 *   npx tsx src/scripts/backfill-cobros.ts --aplicar   → lo guarda
 *
 * Antes de los cobros con método, lo cobrado vivía en un solo número
 * (`TourBooking.depositoPagado`) y en un texto libre dentro del `_meta`. El
 * panel ya se cura solo reserva por reserva (`asegurarHistorico` en
 * `cobros.ts`), pero mientras nadie toque una reserva vieja su dinero aparece
 * en el corte como "sin desglose". Esto lo resuelve de golpe.
 *
 * Con qué método se marca cada uno, en orden:
 *   1. tiene `stripePaymentIntentId` → liga de pago / tarjeta
 *   2. lo que diga el `_meta.metodoPago` que se capturaba a mano
 *   3. si no hay nada → "otro"
 *
 * NO inventa importes: el renglón vale exactamente lo que ya decía
 * `depositoPagado`, así que ninguna cifra del panel cambia al correrlo.
 * Tampoco toca las reservas que ya tienen cobros.
 */
import { cargarEnv, describeBase } from "./_env";

cargarEnv();

import { PrismaClient } from "@prisma/client";
import { metodoHistorico, etiquetaMetodo } from "../lib/admin/cobros";

const prisma = new PrismaClient();

const pesos = (n: number) => `$${n.toLocaleString("es-MX")}`;

async function main() {
  const aplicar = process.argv.includes("--aplicar");
  console.log(`\nBase de datos: ${describeBase()}`);

  const reservas = await prisma.tourBooking.findMany({
    where:  { status: { not: "cancelled" } },
    select: {
      id: true, confirmationNumber: true, customerName: true, tourDate: true,
      createdAt: true, totalAmount: true, depositoPagado: true,
      stripePaymentIntentId: true, lineItems: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const conCobros = new Set(
    (await prisma.movimiento.findMany({
      where:  { tipo: "cobro" },
      select: { reservaId: true },
    })).map(m => m.reservaId),
  );

  const pendientes = reservas
    .map(r => {
      // Mismo criterio que `montoCobrado()`: una reserva pagada por Stripe
      // puede tener el depósito en cero y estar cobrada al 100%.
      const monto = r.depositoPagado > 0
        ? r.depositoPagado
        : (r.stripePaymentIntentId ? r.totalAmount : 0);
      return { ...r, monto };
    })
    .filter(r => r.monto > 0 && !conCobros.has(r.id));

  console.log(`\n${reservas.length} reserva(s) vivas · ${pendientes.length} sin desglose de cobro\n`);
  if (pendientes.length === 0) {
    console.log("Todo el dinero cobrado ya tiene su renglón. No hay nada que hacer.");
    await prisma.$disconnect();
    return;
  }

  const porMetodo: Record<string, { n: number; monto: number }> = {};
  for (const r of pendientes) {
    const metodo = metodoHistorico(r.stripePaymentIntentId, r.lineItems);
    (porMetodo[metodo] ??= { n: 0, monto: 0 });
    porMetodo[metodo].n     += 1;
    porMetodo[metodo].monto += r.monto;
    console.log(`  ${r.confirmationNumber.padEnd(16)} ${pesos(r.monto).padStart(10)}  ${etiquetaMetodo(metodo).padEnd(14)} ${r.customerName}`);
  }

  console.log("\nResumen:");
  for (const [metodo, v] of Object.entries(porMetodo)) {
    console.log(`  ${etiquetaMetodo(metodo).padEnd(14)} ${String(v.n).padStart(4)} cobro(s)  ${pesos(v.monto)}`);
  }
  const total = pendientes.reduce((s, r) => s + r.monto, 0);
  console.log(`  ${"TOTAL".padEnd(14)} ${String(pendientes.length).padStart(4)} cobro(s)  ${pesos(total)}`);

  if (!aplicar) {
    console.log("\nEnsayo. Vuelve a correrlo con --aplicar para guardarlo.\n");
    await prisma.$disconnect();
    return;
  }

  await prisma.movimiento.createMany({
    data: pendientes.map(r => ({
      // La fecha del tour, o la de captura si no hay: es lo más cerca que se
      // puede estar de cuándo entró el dinero sin inventarlo.
      fecha:      r.tourDate || r.createdAt.toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" }),
      tipo:       "cobro",
      categoria:  "cobro",
      concepto:   "Cobro anterior al desglose",
      monto:      r.monto,
      reservaId:  r.id,
      metodoPago: metodoHistorico(r.stripePaymentIntentId, r.lineItems),
      proveedor:  r.customerName,
      nota:       "Creado por backfill-cobros: no se sabe quién lo recibió ni hay comprobante.",
      pagado:     true,
      creadoPor:  "Sistema",
      // A propósito sin `recibidoPor`: marcarlos como efectivo de alguien haría
      // que el corte le reclamara a esa persona dinero de hace meses.
    })),
  });

  console.log(`\n✅ ${pendientes.length} renglón(es) de cobro creados por ${pesos(total)}.`);
  console.log("   Ninguna cifra del panel cambia: `depositoPagado` ya valía eso.\n");
  await prisma.$disconnect();
}

main().catch(async e => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
