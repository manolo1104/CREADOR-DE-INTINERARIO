/**
 * Pone al día los movimientos capturados ANTES del módulo de Finanzas.
 *
 *   npx tsx src/scripts/normalizar-movimientos.ts            → enseña qué haría
 *   npx tsx src/scripts/normalizar-movimientos.ts --aplicar   → lo guarda
 *
 * Los renglones viejos nacieron sin `tipo` ni `categoria` (la tabla no los
 * tenía), así que al desplegar quedan todos como "gasto" / "otro". Eso importa:
 * un costo que colgaba de una reserva pero dice "gasto" NO se resta a esa
 * salida en el estado de resultados, y el margen de esa reserva sale inflado.
 *
 * Reglas, las mismas que aplica la API al capturar hoy:
 *   · con reserva  → es un COSTO de esa salida, y su categoría se deduce del
 *     concepto ("Lanchero" → actividad, "Gasolina" → gasolina…).
 *   · sin reserva  → es un GASTO general de la empresa.
 *
 * NO borra ni modifica importes, fechas ni conceptos: sólo clasifica.
 */
import { cargarEnv, describeBase } from "./_env";

cargarEnv();

import { PrismaClient } from "@prisma/client";
import { categoriaPorNombre, esDirecta } from "../lib/admin/categorias";

const prisma = new PrismaClient();

async function main() {
  const aplicar = process.argv.includes("--aplicar");
  console.log(`\nBase de datos: ${describeBase()}`);
  const todos = await prisma.movimiento.findMany({ orderBy: { fecha: "asc" } });

  const pendientes = todos.filter(m => {
    const tipoCorrecto = m.reservaId ? "costo" : "gasto";
    const categoriaMal = !m.categoria
      || m.categoria === "otro"
      || (m.reservaId ? !esDirecta(m.categoria) : esDirecta(m.categoria));
    return m.tipo !== tipoCorrecto || categoriaMal;
  });

  console.log(`\n${todos.length} movimiento(s) en la base · ${pendientes.length} por clasificar\n`);
  if (pendientes.length === 0) {
    console.log("Todo está clasificado. No hay nada que hacer.");
    await prisma.$disconnect();
    return;
  }

  for (const m of pendientes) {
    const tipo = m.reservaId ? "costo" : "gasto";
    const categoria = m.reservaId ? categoriaPorNombre(m.concepto) : "otroGeneral";
    const destino = m.reservaId ? `costo de la reserva ${m.reservaId}` : "gasto de la empresa";
    console.log(`  ${m.fecha}  ${m.concepto.slice(0, 34).padEnd(36)} $${String(m.monto).padStart(6)}`);
    console.log(`     ${m.tipo}/${m.categoria}  →  ${tipo}/${categoria}   (${destino})`);

    if (aplicar) {
      await prisma.movimiento.update({ where: { id: m.id }, data: { tipo, categoria } });
    }
  }

  console.log(aplicar
    ? `\n✓ ${pendientes.length} movimiento(s) clasificados. Ningún importe cambió.`
    : "\n(prueba: nada se guardó — corre con --aplicar)");
  await prisma.$disconnect();
}

main().catch(async e => {
  console.error("Error:", e?.message);
  await prisma.$disconnect();
  process.exit(1);
});
