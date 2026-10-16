/**
 * abrir-salidas-viaje-cdmx.ts — abre las salidas de noviembre y diciembre del
 * viaje CDMX–Xilitla con lo que decidió Manolo el 16 oct 2026: 2 días y 1
 * noche (viernes a la medianoche → domingo en la noche), $4,990 por persona en
 * cuarto compartido (el privado con cama king suma `SUPLEMENTO_PRIVADO`),
 * sin preventa, a la venta desde hoy, corte y saldo 14 días antes.
 *
 * Hace lo mismo que el formulario de Panel → Viaje CDMX (`crearSalida` /
 * `editarSalida`, con sus mismas validaciones): si la fecha ya existe la
 * actualiza, si no, la crea. Repetirlo no duplica nada (la fecha es única).
 *
 * Uso:
 *   npx tsx src/scripts/abrir-salidas-viaje-cdmx.ts           ENSAYO: dice qué haría. No escribe.
 *   npx tsx src/scripts/abrir-salidas-viaje-cdmx.ts --abrir   Escribe.
 *
 * La base sale de DATABASE_URL o, si no está, de .env.local. Lo primero que
 * imprime es a qué base va: si dice PRODUCCIÓN, es producción.
 */
import { cargarEnv, describeBase } from "./_env";

cargarEnv();

const SALIDAS = [
  { fechaSalida: "2026-11-20", fechaRegreso: "2026-11-22", fechaCorte: "2026-11-06" },
  { fechaSalida: "2026-12-11", fechaRegreso: "2026-12-13", fechaCorte: "2026-11-27" },
];
const COMUN = {
  precio: 4990,
  precioPreventa: null,
  finPreventa: null,
  saldoDiasAntes: 14,
  capacidad: 14,
  minimo: 8,
  estado: "publicada",
};

async function main() {
  const escribir = process.argv.includes("--abrir");
  console.log(`Base: ${describeBase()}`);
  console.log(escribir ? "Modo: ESCRIBE\n" : "Modo: ensayo (no escribe nada; agrega --abrir)\n");

  // Después de cargar el .env: el cliente de Prisma lee DATABASE_URL al crearse.
  const { prisma } = await import("@/lib/prisma");
  const { crearSalida, editarSalida } = await import("@/lib/viajeCdmx/admin");
  const { hoyMX } = await import("@/lib/dates");

  for (const s of SALIDAS) {
    const datos = { ...s, ...COMUN, abreEl: hoyMX() };
    const previa = await prisma.salidaGrupal.findUnique({ where: { fechaSalida: s.fechaSalida } });
    const que = previa ? `actualizar (hoy: $${previa.precio}, regreso ${previa.fechaRegreso}, ${previa.estado})` : "crear";
    console.log(`${s.fechaSalida} → ${s.fechaRegreso} · $${COMUN.precio} · corte ${s.fechaCorte} · abre ${datos.abreEl}: ${que}`);
    if (!escribir) continue;
    const r = previa ? (await editarSalida(previa.id, datos)).despues : await crearSalida(datos);
    console.log(`   ✓ ${r.estado} · id ${r.id}`);
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
