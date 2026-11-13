/**
 * corregir-canal-historico.ts — el canal de las reservas de ANTES del 28 oct 2026.
 *
 * Línea base (3 nov 2026): Ventas decía Web 90 / WhatsApp 7, pero por el folio
 * solo 16 se crearon en un pago de la web y 81 se capturaron a mano. El campo
 * `origen` nació con default «web» y el formulario no obligaba a elegirlo hasta
 * el 28 oct. Regla:
 *   - folio web (HP + base36)            → se queda «web» (sí pagó en línea);
 *   - folio manual (HP-M-) capturado antes del 28 oct con origen «web»
 *                                        → «por_confirmar»;
 *   - cualquier origen distinto de «web» → se respeta (alguien ya lo eligió).
 *
 * Uso (desde la carpeta del repo):
 *   npx tsx src/scripts/corregir-canal-historico.ts            # ensayo: solo cuenta
 *   npx tsx src/scripts/corregir-canal-historico.ts --aplicar  # escribe
 * Idempotente: la segunda corrida no encuentra nada que cambiar.
 */
import { PrismaClient } from "@prisma/client";
import { cargarEnv, describeBase } from "./_env";
import { tipoFolio } from "../lib/admin/folio";
import { ORIGEN_POR_CONFIRMAR } from "../lib/origenReserva";
import { registrarEnBitacora, SISTEMA } from "../lib/admin/bitacora";

cargarEnv();
const prisma = new PrismaClient();

/** Desde cuándo el formulario del panel obliga a elegir el canal. */
const ORIGEN_OBLIGATORIO_DESDE = new Date("2026-10-28T00:00:00-06:00");

async function main() {
  const aplicar = process.argv.includes("--aplicar");
  console.log(describeBase());
  console.log(aplicar ? "MODO: aplicar (escribe en la base)" : "MODO: ensayo (no escribe nada)");

  const reservas = await prisma.tourBooking.findMany({
    select: { id: true, confirmationNumber: true, origen: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  const antes: Record<string, number> = {};
  for (const r of reservas) antes[r.origen] = (antes[r.origen] ?? 0) + 1;
  console.log("Antes:", antes);

  const porConfirmar = reservas.filter(r =>
    r.origen === "web" && tipoFolio(r.confirmationNumber) === "manual" && r.createdAt < ORIGEN_OBLIGATORIO_DESDE,
  );
  const webReal = reservas.filter(r => r.origen === "web" && tipoFolio(r.confirmationNumber) === "web").length;
  const raros = reservas.filter(r => r.origen === "web" && tipoFolio(r.confirmationNumber) === "otro");
  console.log(`Web que sí pagó en línea (se queda): ${webReal}`);
  console.log(`Manual antes del 28 oct marcada «web» → por_confirmar: ${porConfirmar.length}`);
  if (raros.length) console.log(`⚠️ Folios que no reconozco (se dejan como están): ${raros.map(r => r.confirmationNumber).join(", ")}`);

  if (!aplicar || porConfirmar.length === 0) {
    console.log(aplicar ? "Nada que cambiar." : "Ensayo terminado. Corre con --aplicar para escribir.");
    return;
  }
  const r = await prisma.tourBooking.updateMany({
    where: { id: { in: porConfirmar.map(x => x.id) } },
    data:  { origen: ORIGEN_POR_CONFIRMAR },
  });
  await registrarEnBitacora({
    accion:  "modificó",
    entidad: "reserva",
    actor:   SISTEMA,
    resumen: `Canal histórico corregido: ${r.count} reservas capturadas a mano antes del 28 oct pasan de «web» a «por confirmar»`,
  });
  const despues: Record<string, number> = {};
  for (const x of await prisma.tourBooking.findMany({ select: { origen: true } })) despues[x.origen] = (despues[x.origen] ?? 0) + 1;
  console.log(`Cambiadas: ${r.count}`);
  console.log("Después:", despues);
}

main()
  .catch(e => { console.error("ERROR:", e?.message ?? e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
