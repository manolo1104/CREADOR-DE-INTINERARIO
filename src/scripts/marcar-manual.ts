/**
 * marcar-manual.ts — saca un carrito de la automatización.
 *
 * Lo marca como "manual": el cron deja de escribirle POR COMPLETO y el cliente
 * queda enteramente a cargo de Manolo. Se usa cuando la venta vale más que el
 * correo genérico — el canal personal cierra ~25% contra ~2.5% del sitio.
 *
 * El carrito NO desaparece: `carritos-abandonados.ts` lo muestra en su propia
 * sección "TÚ LOS LLEVAS A MANO", con los días que faltan para el tour.
 *
 * Uso:  npx tsx src/scripts/marcar-manual.ts <correo> [--deshacer]
 *
 * ⚠️  Escribe en la base de PRODUCCIÓN. Pide confirmación antes de hacerlo.
 */

import { createInterface } from "readline";
import { PrismaClient } from "@prisma/client";
import { cargarEnv } from "./_env";
import { ESTADO_MANUAL, ESTADOS_VIVOS } from "../lib/cartFollowUp";

cargarEnv();

const prisma = new PrismaClient();

const mxn = (n: number) => "$" + n.toLocaleString("es-MX");

function preguntar(texto: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((res) => rl.question(texto, (r) => { rl.close(); res(r); }));
}

async function main() {
  const args = process.argv.slice(2);
  const deshacer = args.includes("--deshacer");
  const email = args.find((a) => !a.startsWith("--"));

  if (!email) {
    console.error("\nFalta el correo.\n  npx tsx src/scripts/marcar-manual.ts <correo> [--deshacer]\n");
    process.exit(1);
  }

  // Al deshacer buscamos los "manual"; al marcar, los que siguen vivos.
  const buscados = deshacer ? [ESTADO_MANUAL] : [...ESTADOS_VIVOS];
  const carritos = await prisma.abandonedCart.findMany({
    where:   { customerEmail: email, status: { in: buscados } },
    orderBy: { createdAt: "desc" },
  });

  if (!carritos.length) {
    console.log(
      `\nNo hay carritos de ${email} en estado ${buscados.join(" / ")}.\n` +
      `(Corre 'npx tsx src/scripts/carritos-abandonados.ts' para ver todos.)\n`,
    );
    return;
  }

  const destino = deshacer ? "open" : ESTADO_MANUAL;
  const accion = deshacer
    ? "DEVOLVER a la secuencia automática"
    : "SACAR de la secuencia automática";

  console.log(`\n${accion}:\n`);
  for (const c of carritos) {
    const personas = c.adults + c.childrenMid + c.childrenSmall;
    console.log(`  ${mxn(c.total).padStart(8)}  ${c.tourName}`);
    console.log(`            ${c.tourDate}  ·  ${personas} persona(s)  ·  ${c.emailsSent} recordatorio(s)`);
    console.log(`            ${c.status}  →  ${destino}\n`);
  }

  const r = (await preguntar(`¿Confirmas? Esto escribe en PRODUCCIÓN. (escribe "si"): `)).trim().toLowerCase();
  if (r !== "si" && r !== "sí") {
    console.log("\nCancelado. No se escribió nada.\n");
    return;
  }

  const { count } = await prisma.abandonedCart.updateMany({
    where: { id: { in: carritos.map((c) => c.id) } },
    data:  { status: destino },
  });

  console.log(`\n✅ ${count} carrito(s) → ${destino}\n`);
  if (!deshacer) {
    console.log(`   El sistema ya NO le escribe a ${email}. Es todo tuyo.`);
    console.log(`   Para revertir: npx tsx src/scripts/marcar-manual.ts ${email} --deshacer\n`);
  }
}

main()
  .catch((e) => {
    console.error("Error:", e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
