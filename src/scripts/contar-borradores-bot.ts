/**
 * contar-borradores-bot.ts — ¿cuántas «reservas» borrador dejó el bot viejo?
 *
 * Hasta oct 2026 `/api/bot/quote` guardaba cada cotización del bot como una
 * RESERVA (TourBooking) con status «borrador» y folio HP…, en vez de una
 * cotización. Nadie las pagó, pero cuentan en Reservas, el Calendario, los
 * tours de hoy, «pendiente de cobro», Clientes y Finanzas. Este script solo
 * las CUENTA y las LISTA para decidir qué hacer con ellas (cancelarlas o
 * pasarlas a cotización): no cambia nada.
 *
 * SOLO LECTURA. No escribe, no borra, no manda correos.
 *
 * Uso (desde la carpeta del sitio):
 *   npx tsx src/scripts/contar-borradores-bot.ts
 *
 * Lee la base de DATABASE_URL (del entorno o de .env.local) y la dice antes de
 * empezar: si ahí está la de producción, cuenta las de producción. No lista
 * nombres ni teléfonos de clientes, solo folios, fechas y montos.
 */

import { PrismaClient } from "@prisma/client";
import { cargarEnv, describeBase } from "./_env";

cargarEnv();

const prisma = new PrismaClient();

const mxn = (n: number) => "$" + Math.round(n).toLocaleString("es-MX");

const fechaMX = (d: Date) =>
  d.toLocaleDateString("es-MX", { timeZone: "America/Mexico_City", day: "2-digit", month: "short", year: "numeric" });

async function main() {
  console.log(`\n🗄️  Base: ${describeBase()}`);

  const borradores = await prisma.tourBooking.findMany({
    where:   { status: "borrador" },
    orderBy: { createdAt: "asc" },
    select:  {
      confirmationNumber: true,
      createdAt:          true,
      tourDate:           true,
      totalAmount:        true,
      origen:             true,
      depositoPagado:     true,
    },
  });

  console.log(`\n📋 Reservas con status «borrador»: ${borradores.length}\n`);
  if (borradores.length === 0) {
    console.log("   (ninguna: no hay nada que limpiar)\n");
    return;
  }

  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
  const fila = (folio: string, creada: string, fecha: string, total: string, origen: string) =>
    `   ${folio.padEnd(16)}  ${creada.padEnd(13)}  ${fecha.padEnd(21)}  ${total.padStart(10)}  ${origen}`;
  console.log(fila("Folio", "Creada", "Fecha del tour", "Total", "Origen"));
  console.log(fila("─".repeat(16), "─".repeat(13), "─".repeat(21), "─".repeat(10), "─".repeat(8)));
  for (const b of borradores) {
    const yaPaso = b.tourDate && b.tourDate < hoy ? " (ya pasó)" : "";
    console.log(
      fila(b.confirmationNumber, fechaMX(b.createdAt), `${b.tourDate || "sin fecha"}${yaPaso}`, mxn(b.totalAmount), b.origen)
      + (b.depositoPagado > 0 ? `   ⚠️ tiene ${mxn(b.depositoPagado)} registrados` : ""),
    );
  }

  const total = borradores.reduce((s, b) => s + b.totalAmount, 0);
  const pasadas = borradores.filter((b) => b.tourDate && b.tourDate < hoy).length;
  const conDinero = borradores.filter((b) => b.depositoPagado > 0).length;
  const porOrigen = borradores.reduce<Record<string, number>>((m, b) => {
    m[b.origen] = (m[b.origen] ?? 0) + 1;
    return m;
  }, {});

  console.log("\n── Resumen ──────────────────────────────────");
  console.log(`   Total:              ${borradores.length} «reservas» por ${mxn(total)} que nadie ha pagado`);
  console.log(`   Con el tour ya pasado: ${pasadas}`);
  console.log(`   Por origen:         ${Object.entries(porOrigen).map(([o, n]) => `${o} ${n}`).join(" · ")}`);
  if (conDinero) {
    console.log(`   ⚠️ ${conDinero} tienen dinero registrado: esas NO se tocan sin revisarlas una por una.`);
  }
  console.log("\n   Este script no cambió nada. Qué hacer con ellas se decide aparte.\n");
}

main()
  .catch((e) => {
    console.error("❌", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
