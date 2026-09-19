/**
 * Captura en el Cotizador los costos de operación de un tour.
 *
 *   npx tsx src/scripts/costos-tours.ts          → enseña lo que haría
 *   npx tsx src/scripts/costos-tours.ts --aplicar → lo guarda de verdad
 *
 * Escribe en la misma tabla que el Cotizador (`TourCosto`), así que después se
 * puede ajustar a mano desde el panel sin tocar este archivo.
 *
 * ⚠️ Los montos con rango (el guía cuesta entre $600 y $800) se capturan en el
 * EXTREMO ALTO a propósito: el margen que enseñe el panel es entonces el peor
 * caso. Un descuento decidido con ese número nunca se queda corto.
 */
import { cargarEnv, describeBase } from "./_env";

cargarEnv();

import { PrismaClient } from "@prisma/client";
import { TOURS_DB } from "../lib/tours";
import { costoDeLinea, type ConceptoCosto } from "../lib/admin/costos";

const prisma = new PrismaClient();

interface CostosDeTour {
  slug: string;
  notas: string;
  conceptos: ConceptoCosto[];
}

const COSTOS: CostosDeTour[] = [
  {
    slug:  "expedicion-tamul",
    notas: "Capturado 19 sep 2026. Guía y gasolina en su tope ($600-800 y $350-400) para que el margen sea el peor caso.",
    conceptos: [
      { concepto: "Guía",                        monto: 800, tipo: "fijo"    },
      { concepto: "Vehículo",                    monto: 500, tipo: "fijo"    },
      { concepto: "Gasolina y casetas",          monto: 400, tipo: "fijo"    },
      { concepto: "Canoa",                       monto: 200, tipo: "persona" },
      { concepto: "Entrada al embarcadero",      monto:  15, tipo: "persona" },
      { concepto: "Entrada Sótano de las Guaguas", monto: 30, tipo: "persona" },
      { concepto: "Desayuno",                    monto: 150, tipo: "persona" },
    ],
  },
];

async function main() {
  const aplicar = process.argv.includes("--aplicar");
  console.log(`\nBase de datos: ${describeBase()}`);

  for (const c of COSTOS) {
    const tour = TOURS_DB.find(t => t.slug === c.slug);
    if (!tour) {
      console.error(`✗ "${c.slug}" no existe en el catálogo. No se toca nada.`);
      process.exitCode = 1;
      continue;
    }

    const precio = Number((tour as any).precio) || 0;
    console.log(`\n${tour.nombre}`);
    console.log(`  Precio de venta: $${precio.toLocaleString("es-MX")} por persona\n`);
    for (const x of c.conceptos) {
      const como = x.tipo === "fijo" ? "por salida" : "por persona";
      console.log(`  ${x.concepto.padEnd(30)} $${String(x.monto).padStart(5)}  ${como}`);
    }

    console.log("\n  Lo que deja según cuánta gente vaya:");
    console.log("  personas   venta      costo    utilidad   margen");
    for (const n of [2, 4, 6, 8, 10]) {
      const venta = precio * n;
      const costo = costoDeLinea(c.conceptos, n);
      const util  = venta - costo;
      const pct   = venta > 0 ? Math.round((util / venta) * 100) : 0;
      const señal = pct < 25 ? "  ← margen bajo" : "";
      console.log(
        `  ${String(n).padStart(5)}    ` +
        `$${String(venta).padStart(7)}  $${String(costo).padStart(7)}  ` +
        `$${String(util).padStart(7)}    ${String(pct).padStart(3)}%${señal}`,
      );
    }

    if (!aplicar) { console.log("\n  (prueba: nada se guardó — corre con --aplicar)"); continue; }

    await prisma.tourCosto.upsert({
      where:  { tourSlug: c.slug },
      create: { tourSlug: c.slug, conceptos: c.conceptos as never, notas: c.notas },
      update: { conceptos: c.conceptos as never, notas: c.notas },
    });
    console.log("\n  ✓ Guardado en el Cotizador");
  }
  await prisma.$disconnect();
}

main().catch(async e => {
  console.error("Error:", e?.message);
  await prisma.$disconnect();
  process.exit(1);
});
