/**
 * carritos-abandonados.ts — ¿a quién hay que llamarle hoy?
 *
 * Lista las cotizaciones guardadas que no se convirtieron en reserva, con su
 * correo, el monto en juego y cuántos recordatorios les ha mandado el sistema.
 * Un carrito abandonado es alguien que ya eligió tour, fecha y personas: la
 * llamada personal cierra mucho mejor que cualquier correo automático.
 *
 * Uso:  npx tsx src/scripts/carritos-abandonados.ts
 */

import { PrismaClient } from "@prisma/client";
import { cargarEnv } from "./_env";

cargarEnv();

const prisma = new PrismaClient();

const mxn = (n: number) => "$" + n.toLocaleString("es-MX");

const ICONO: Record<string, string> = {
  open:      "🟢",
  recovered: "🔵",
  converted: "✅",
  expired:   "⚫",
};

async function main() {
  const carritos = await prisma.abandonedCart.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  if (carritos.length === 0) {
    console.log("\n(no hay carritos guardados)\n");
    return;
  }

  const porEstado: Record<string, number> = {};
  for (const c of carritos) porEstado[c.status] = (porEstado[c.status] || 0) + 1;

  console.log(`\n🛟  ${carritos.length} cotizaciones guardadas\n`);
  console.log(
    "   " +
      Object.entries(porEstado)
        .map(([e, n]) => `${ICONO[e] ?? "•"} ${e}: ${n}`)
        .join("   ") +
      "\n",
  );

  // Los que valen una llamada: eligieron todo, dejaron correo y no reservaron.
  const pendientes = carritos.filter((c) => c.status !== "converted" && c.status !== "expired");

  if (pendientes.length) {
    console.log("─".repeat(70));
    console.log("PARA CONTACTAR  (eligieron tour y fecha, no han reservado)\n");
    for (const c of pendientes) {
      const dias = (Date.now() - c.createdAt.getTime()) / 86_400_000;
      const personas = c.adults + c.childrenMid + c.childrenSmall;
      console.log(`  ${ICONO[c.status] ?? "•"}  ${mxn(c.total).padStart(8)}  ${c.customerEmail}`);
      console.log(
        `      ${c.tourName}  ·  ${c.tourDate}  ·  ${personas} persona${personas !== 1 ? "s" : ""}`,
      );
      console.log(
        `      guardado hace ${dias.toFixed(1)} d  ·  ${c.emailsSent} recordatorio(s) enviado(s)` +
          (c.customerPhone ? `  ·  tel ${c.customerPhone}` : ""),
      );
      console.log("");
    }
    const enJuego = pendientes.reduce((a, c) => a + c.total, 0);
    console.log(`  💰 En juego: ${mxn(enJuego)} MXN en ${pendientes.length} cotización(es)\n`);
  } else {
    console.log("   Nada pendiente por contactar.\n");
  }
}

main()
  .catch((e) => {
    console.error("Error:", e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
