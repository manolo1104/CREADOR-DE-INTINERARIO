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
import { ESTADO_MANUAL } from "../lib/cartFollowUp";

cargarEnv();

const prisma = new PrismaClient();

const mxn = (n: number) => "$" + n.toLocaleString("es-MX");

const ICONO: Record<string, string> = {
  open:      "🟢",
  recovered: "🔵",
  manual:    "🙋",
  converted: "✅",
  expired:   "⚫",
};

/** Días que faltan para el tour (negativo = ya pasó). `tourDate` es String ISO. */
function diasParaTour(tourDate: string): number {
  const hoyMX = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
  return Math.round(
    (new Date(`${tourDate}T00:00:00`).getTime() - new Date(`${hoyMX}T00:00:00`).getTime()) /
      86_400_000,
  );
}

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

  // Sacados de la automatización a propósito. Van PRIMERO y en su propia
  // sección: excluirlos de los correos no puede volverlos invisibles — un
  // cliente que desaparece del radar es justo el fallo que estamos corrigiendo.
  const aMano = carritos.filter((c) => c.status === ESTADO_MANUAL);

  if (aMano.length) {
    console.log("─".repeat(70));
    console.log("🙋  TÚ LOS LLEVAS A MANO  (el sistema NO les escribe)\n");
    for (const c of aMano) {
      const dias = (Date.now() - c.createdAt.getTime()) / 86_400_000;
      const faltan = diasParaTour(c.tourDate);
      const personas = c.adults + c.childrenMid + c.childrenSmall;
      const cuando =
        faltan < 0 ? `la fecha pasó hace ${-faltan} d` :
        faltan === 0 ? "¡ES HOY!" :
        `faltan ${faltan} d`;
      console.log(`  🙋  ${mxn(c.total).padStart(8)}  ${c.customerEmail}`);
      console.log(
        `      ${c.tourName}  ·  ${c.tourDate}  ·  ${personas} persona${personas !== 1 ? "s" : ""}`,
      );
      console.log(
        `      ⏳ ${cuando}  ·  guardado hace ${dias.toFixed(1)} d` +
          (c.customerPhone ? `  ·  tel ${c.customerPhone}` : ""),
      );
      console.log("");
    }
    console.log(`  💰 A tu cargo: ${mxn(aMano.reduce((a, c) => a + c.total, 0))} MXN\n`);
  }

  // Los que valen una llamada: eligieron todo, dejaron correo y no reservaron.
  const candidatos = carritos.filter(
    (c) => c.status !== "converted" && c.status !== "expired" && c.status !== ESTADO_MANUAL,
  );

  // ⚠️ CRUCE OBLIGATORIO CONTRA RESERVAS. El estado del carrito NO prueba que no
  // haya venta: las reservas hechas a mano desde el panel (prefijo HP-M-) no
  // pasan por `send-confirmation`, que es quien marca el carrito "converted".
  // Sin este cruce el script reporta como "dinero en riesgo" a gente que ya
  // pagó — pasó el 8 ago 2026 con un carrito de $4,810 que sí estaba vendido.
  const fantasmas: typeof carritos = [];
  const pendientes: typeof carritos = [];
  for (const c of candidatos) {
    const reserva = await prisma.tourBooking.findFirst({
      where:  { customerEmail: c.customerEmail, tourSlug: c.tourSlug, tourDate: c.tourDate },
      select: { confirmationNumber: true, status: true },
    });
    if (reserva) {
      fantasmas.push(c);
      console.log(
        `  ✅ ${c.customerEmail} YA RESERVÓ (${reserva.confirmationNumber}, ${reserva.status}) — ` +
        `carrito sin cerrar, NO lo persigas\n`,
      );
    } else {
      pendientes.push(c);
    }
  }
  if (fantasmas.length) {
    console.log(
      `   ${fantasmas.length} carrito(s) son fantasmas de ventas ya cerradas. ` +
      `El cron los marca "converted" en ≤1 h.\n`,
    );
  }

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
