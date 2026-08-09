/**
 * verificar-seguimiento.ts — ensayo EN SECO del cron de recordatorios.
 *
 * Corre exactamente los mismos filtros que `/api/cron/recuperar-carritos`
 * (importados de `lib/cartFollowUp`, no copiados) contra la base de producción
 * y dice a quién le escribiría. NO envía nada. NO escribe nada.
 *
 * Existe porque aquí `push` a main es producción directa: es la única forma de
 * ver el efecto de un cambio en el filtro ANTES de que le llegue a un cliente.
 *
 * Uso:  npx tsx src/scripts/verificar-seguimiento.ts
 */

import { PrismaClient } from "@prisma/client";
import { cargarEnv } from "./_env";
import {
  DIAS_VIGENCIA,
  ESTADO_MANUAL,
  filtroDemasiadoViejos,
  filtroFechaPasada,
  filtroPendientes,
  minFechaTour,
} from "../lib/cartFollowUp";

cargarEnv();

const prisma = new PrismaClient();

const mxn = (n: number) => "$" + n.toLocaleString("es-MX");

async function main() {
  const ahora   = new Date();
  const margen  = 5 * 60 * 1000;
  const hace1h  = new Date(ahora.getTime() -  1 * 60 * 60 * 1000 + margen);
  const hace24h = new Date(ahora.getTime() - 24 * 60 * 60 * 1000 + margen);
  const hace72h = new Date(ahora.getTime() - 72 * 60 * 60 * 1000 + margen);
  const hace14d = new Date(ahora.getTime() - DIAS_VIGENCIA * 24 * 60 * 60 * 1000);
  const minFecha = minFechaTour();

  console.log(`\n🔍  ENSAYO EN SECO — no se envía ni se escribe nada`);
  console.log(`    Fecha mínima de tour vendible: ${minFecha}\n`);

  // 1. Los que el cron expiraría por fecha pasada.
  const porFecha = await prisma.abandonedCart.findMany({ where: filtroFechaPasada(minFecha) });
  console.log("─".repeat(70));
  console.log(`EXPIRARÍA POR FECHA PASADA  (${porFecha.length})\n`);
  for (const c of porFecha) {
    console.log(`  ⚫  ${mxn(c.total).padStart(8)}  ${c.customerEmail}`);
    console.log(`      ${c.tourName}  ·  ${c.tourDate}  ·  ${c.emailsSent} recordatorio(s) ya enviados`);
  }
  if (!porFecha.length) console.log("  (ninguno)");

  // 2. Los que expiraría por antigüedad.
  const viejos = await prisma.abandonedCart.findMany({ where: filtroDemasiadoViejos(hace14d) });
  console.log(`\nEXPIRARÍA POR ANTIGÜEDAD >${DIAS_VIGENCIA}d  (${viejos.length})\n`);
  for (const c of viejos) {
    console.log(`  ⚫  ${mxn(c.total).padStart(8)}  ${c.customerEmail}  ·  ${c.tourDate}`);
  }
  if (!viejos.length) console.log("  (ninguno)");

  // 3. A quién le enviaría, y qué correo exactamente.
  //    Se replica aquí la elección de paso del cron (líneas 62-64 de la ruta).
  const candidatos = await prisma.abandonedCart.findMany({
    where:   filtroPendientes(minFecha, hace1h),
    orderBy: { createdAt: "asc" },
    take:    100,
  });

  const aEnviar: string[] = [];
  for (const c of candidatos) {
    const yaReservo = await prisma.tourBooking.findFirst({
      where: { customerEmail: c.customerEmail, tourSlug: c.tourSlug, tourDate: c.tourDate },
    });
    if (yaReservo) {
      aEnviar.push(`  ✅  ${c.customerEmail} — ya reservó, se marcaría "converted" (sin correo)`);
      continue;
    }
    let tipo: string | null = null;
    if      (c.emailsSent === 0) tipo = "recordatorio1";
    else if (c.emailsSent === 1 && (!c.lastEmailAt || c.lastEmailAt < hace24h)) tipo = "recordatorio2";
    else if (c.emailsSent === 2 && (!c.lastEmailAt || c.lastEmailAt < hace72h)) tipo = "recordatorio3";
    if (!tipo) {
      aEnviar.push(`  ⏸️   ${c.customerEmail} — todavía no toca (esperando la ventana)`);
      continue;
    }
    aEnviar.push(`  📧  ${mxn(c.total).padStart(8)}  ${c.customerEmail} → ${tipo}  (tour ${c.tourDate})`);
  }

  console.log(`\n${"─".repeat(70)}`);
  console.log(`ENVIARÍA CORREO  (${aEnviar.filter((l) => l.includes("📧")).length})\n`);
  if (!aEnviar.length) console.log("  (nadie: ningún candidato pasa el filtro)");
  for (const l of aEnviar) console.log(l);

  // 4. Los excluidos a mano, para que nunca desaparezcan del radar.
  const aMano = await prisma.abandonedCart.findMany({ where: { status: ESTADO_MANUAL } });
  console.log(`\n${"─".repeat(70)}`);
  console.log(`EXCLUIDOS A PROPÓSITO — los lleva Manolo  (${aMano.length})\n`);
  for (const c of aMano) {
    console.log(`  🙋  ${mxn(c.total).padStart(8)}  ${c.customerEmail}  ·  ${c.tourName}  ·  ${c.tourDate}`);
  }
  if (!aMano.length) console.log("  (ninguno)");
  console.log("");
}

main()
  .catch((e) => {
    console.error("Error:", e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
