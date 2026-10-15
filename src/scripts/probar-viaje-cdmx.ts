/**
 * Pruebas del viaje CDMX–Xilitla contra una base LOCAL.
 *
 *   DATABASE_URL="postgresql://postgres@127.0.0.1:5441/viaje_prueba?connection_limit=40" \
 *   STRIPE_SECRET_KEY=sk_test_... npx tsx src/scripts/probar-viaje-cdmx.ts candado
 *
 * Partes:
 *   candado  — la carrera por el último lugar, sin Stripe (50 rondas × 30 compradores)
 *   precio   — preventa, cambio de precio y estados del calendario
 *   mover    — mover de fecha contra apartar el último lugar
 *   stripe   — cobros de PRUEBA de punta a punta (tarjeta, rechazo, OXXO, webhook repetido)
 *   http     — la carrera por HTTP contra un servidor local (VIAJE_URL=http://localhost:3013)
 *
 * 🔴 Se niega a correr contra una base que no sea local o con una llave de
 * Stripe que no sea de prueba: borra y crea filas a lo bruto.
 */
import { prisma } from "@/lib/prisma";

function guardas(necesitaStripe: boolean) {
  const url = process.env.DATABASE_URL ?? "";
  let host = "";
  try { host = new URL(url).hostname; } catch { /* vacío */ }
  if (host !== "localhost" && !host.startsWith("127.")) {
    console.error("🔴 DATABASE_URL no es local. No corro.");
    process.exit(1);
  }
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  if (necesitaStripe && !key.startsWith("sk_test_")) {
    console.error("🔴 Hace falta una llave de PRUEBA (sk_test_…). No corro.");
    process.exit(1);
  }
  if (key && !key.startsWith("sk_test_")) {
    console.error("🔴 La llave de Stripe no es de prueba. No corro.");
    process.exit(1);
  }
}

let fallas = 0;
function ok(cond: boolean, que: string) {
  if (cond) console.log(`  ✅ ${que}`);
  else { fallas++; console.log(`  ❌ ${que}`); }
}

const DIA = 86_400_000;

async function crearSalida(fecha: string, extra: Partial<{ capacidad: number; precio: number; precioPreventa: number | null; abreEl: Date; finPreventa: Date | null; fechaCorte: Date; estado: string }> = {}) {
  await limpiarSalida(fecha);
  const ahora = Date.now();
  return prisma.salidaGrupal.create({
    data: {
      fechaSalida: fecha,
      fechaRegreso: fecha,
      capacidad: extra.capacidad ?? 14,
      minimo: 8,
      precio: extra.precio ?? 6000,
      precioPreventa: extra.precioPreventa === undefined ? 5500 : extra.precioPreventa,
      abreEl: extra.abreEl ?? new Date(ahora - DIA),
      finPreventa: extra.finPreventa === undefined ? new Date(ahora + 10 * DIA) : extra.finPreventa,
      fechaCorte: extra.fechaCorte ?? new Date(ahora + 30 * DIA),
      estado: extra.estado ?? "publicada",
    },
  });
}

async function limpiarSalida(fecha: string) {
  const s = await prisma.salidaGrupal.findUnique({ where: { fechaSalida: fecha } });
  if (!s) return;
  await prisma.apartadoSalida.deleteMany({ where: { salidaId: s.id } });
  await prisma.tourBooking.deleteMany({ where: { salidaId: s.id } });
  await prisma.salidaGrupal.delete({ where: { id: s.id } });
}

async function ocupar(salidaId: string, personas: number, fecha: string) {
  for (let i = 0; i < personas; i++) {
    await prisma.tourBooking.create({
      data: {
        confirmationNumber: `PRUEBA-${salidaId}-${i}-${Math.random().toString(36).slice(2, 8)}`,
        tourId: "viaje-cdmx-xilitla", tourName: "Prueba", tourSlug: "viaje-cdmx-xilitla", tourDate: fecha,
        adults: 1, totalAmount: 6000, customerName: `Ocupante ${i}`, customerEmail: `ocupante${i}@prueba.local`,
        status: "paid", salidaId,
      },
    });
  }
}

const comprador = (salidaId: string, i: number, personas = 1) => ({
  salidaId, personas, nombre: `Comprador ${i}`, email: `c${i}@prueba.local`, huella: `huella-${i}-${Math.random()}`,
});

// ── candado ─────────────────────────────────────────────────────────────────

async function parteCandado() {
  const { apartarLugares } = await import("@/lib/viajeCdmx/apartar");
  const { ErrorViaje, ocupacion } = await import("@/lib/viajeCdmx/cupo");
  console.log("\n▶ Candado: 30 compradores a la vez por el último lugar, 50 rondas");
  const s = await crearSalida("2099-01-01");
  await ocupar(s.id, 13, s.fechaSalida);

  let rondasBien = 0;
  const motivos: Record<string, number> = {};
  for (let ronda = 0; ronda < 50; ronda++) {
    const res = await Promise.allSettled(Array.from({ length: 30 }, (_, i) => apartarLugares(comprador(s.id, i))));
    const ganaron = res.filter((r) => r.status === "fulfilled").length;
    for (const r of res) {
      if (r.status === "rejected") {
        const k = r.reason instanceof ErrorViaje ? `${r.reason.status} ${r.reason.codigo}` : String(r.reason?.message ?? r.reason).slice(0, 60);
        motivos[k] = (motivos[k] ?? 0) + 1;
      }
    }
    const o = await ocupacion(prisma, s.id);
    if (ganaron === 1 && o.ocupados === 14) rondasBien++;
    else console.log(`    ronda ${ronda}: ganaron ${ganaron}, ocupados ${o.ocupados}`);
    await prisma.apartadoSalida.deleteMany({ where: { salidaId: s.id } });
  }
  ok(rondasBien === 50, `50 de 50 rondas con exactamente 1 ganador (${rondasBien})`);
  console.log("    rechazos:", motivos);

  console.log("\n▶ Candado: grupos mezclados con 2 lugares libres, 50 rondas");
  await prisma.tourBooking.deleteMany({ where: { salidaId: s.id } });
  await ocupar(s.id, 12, s.fechaSalida);
  let mezclaBien = 0;
  for (let ronda = 0; ronda < 50; ronda++) {
    const tamanos = [2, 1, 1, 2, 1, 2, 1, 1, 2, 1];
    await Promise.allSettled(tamanos.map((p, i) => apartarLugares(comprador(s.id, i, p))));
    const o = await ocupacion(prisma, s.id);
    if (o.ocupados === 14) mezclaBien++;
    else console.log(`    ronda ${ronda}: ocupados ${o.ocupados}`);
    await prisma.apartadoSalida.deleteMany({ where: { salidaId: s.id } });
  }
  ok(mezclaBien === 50, `50 de 50 rondas llenan exactamente 14, nunca 15 (${mezclaBien})`);

  console.log("\n▶ Un apartado vencido no ocupa lugar");
  await prisma.apartadoSalida.create({
    data: { salidaId: s.id, personas: 2, precioUnitario: 5500, total: 11000, anticipo: 3300, nombre: "Vencido", email: "v@prueba.local", expiraEl: new Date(Date.now() - 1000) },
  });
  const o2 = await ocupacion(prisma, s.id);
  ok(o2.ocupados === 12, `ocupados = 12 con un apartado vencido de 2 (${o2.ocupados})`);
  const a = await apartarLugares(comprador(s.id, 99, 2));
  ok(a.libresDespues === 0, "se pueden apartar los 2 lugares del vencido");

  console.log("\n▶ Una reserva cancelada libera su lugar");
  await prisma.apartadoSalida.deleteMany({ where: { salidaId: s.id } });
  const una = await prisma.tourBooking.findFirstOrThrow({ where: { salidaId: s.id } });
  await prisma.tourBooking.update({ where: { id: una.id }, data: { status: "cancelled" } });
  const o3 = await ocupacion(prisma, s.id);
  ok(o3.confirmados === 11, `confirmados = 11 tras cancelar una (${o3.confirmados})`);

  await limpiarSalida(s.fechaSalida);
}

// ── precio ──────────────────────────────────────────────────────────────────

async function partePrecio() {
  const { apartarLugares } = await import("@/lib/viajeCdmx/apartar");
  const { ErrorViaje } = await import("@/lib/viajeCdmx/cupo");
  const { precioVigente, estadoSalida, montos } = await import("@/lib/viajeCdmx/precio");
  console.log("\n▶ Precio: preventa y su fin");
  const ahora = Date.now();
  const s = await crearSalida("2099-02-01", { finPreventa: new Date(ahora + 2000) });
  ok(precioVigente(s) === 5500, "en preventa vale 5,500");
  ok(estadoSalida(s, 14) === "preventa", "estado «preventa»");
  const m = montos(s, 3);
  const { ANTICIPO_PCT } = await import("@/lib/viajeCdmx/config");
  const anticipoEsperado = Math.round((16500 * ANTICIPO_PCT) / 100);
  ok(m.total === 16500 && m.anticipo === anticipoEsperado && m.saldo === 16500 - anticipoEsperado,
    `3 personas: total 16,500 · anticipo ${ANTICIPO_PCT} % = ${anticipoEsperado} · saldo ${16500 - anticipoEsperado} (${m.total}/${m.anticipo}/${m.saldo})`);
  await new Promise((r) => setTimeout(r, 2500));
  ok(precioVigente(s) === 6000, "al vencer la preventa vale 6,000 sin tocar nada");
  ok(estadoSalida(s, 14) === "disponible", "estado «disponible»");
  try {
    await apartarLugares({ ...comprador(s.id, 1), precioVisto: 5500 });
    ok(false, "quien vio 5,500 tras vencer la preventa recibe «precio-cambio»");
  } catch (e) {
    ok(e instanceof ErrorViaje && e.codigo === "precio-cambio" && e.extra.precioUnitario === 6000, "quien vio 5,500 tras vencer la preventa recibe «precio-cambio» con 6,000");
  }
  const bueno = await apartarLugares({ ...comprador(s.id, 2), precioVisto: 6000 });
  ok(bueno.apartado.precioUnitario === 6000, "con el precio nuevo sí aparta, congelado en 6,000");

  ok(estadoSalida(s, 4) === "ultimos", "4 libres = «últimos lugares»");
  ok(estadoSalida(s, 5) === "disponible", "5 libres = «disponible» (no se inventa urgencia)");
  ok(estadoSalida(s, 0) === "agotado", "0 libres = «agotado»");
  ok(estadoSalida({ ...s, abreEl: new Date(ahora + DIA) }, 14) === "proxima", "antes de abrir = «próxima»");
  ok(estadoSalida({ ...s, fechaCorte: new Date(ahora - 1) }, 14) === "cerrada", "después del corte = «cerrada»");

  console.log("\n▶ Precio: lo que no se vende");
  for (const [que, extra, codigo] of [
    ["salida en borrador", { estado: "borrador" }, "cerrada"],
    ["pasado el corte", { fechaCorte: new Date(ahora - 1000) }, "cerrada"],
    ["antes de abrir", { abreEl: new Date(ahora + DIA) }, "no-abre"],
  ] as const) {
    const x = await crearSalida("2099-02-02", extra as never);
    try {
      await apartarLugares(comprador(x.id, 1));
      ok(false, `${que}: no aparta`);
    } catch (e) {
      ok(e instanceof ErrorViaje && e.codigo === codigo, `${que}: no aparta (${e instanceof ErrorViaje ? e.codigo : e})`);
    }
    await limpiarSalida("2099-02-02");
  }
  try {
    await apartarLugares(comprador(s.id, 3, 9));
    ok(false, "9 personas en un apartado van por WhatsApp");
  } catch (e) {
    ok(e instanceof ErrorViaje && e.codigo === "grupo", "9 personas en un apartado van por WhatsApp");
  }
  await limpiarSalida(s.fechaSalida);
}

// ── mover ───────────────────────────────────────────────────────────────────

async function parteMover() {
  const { apartarLugares } = await import("@/lib/viajeCdmx/apartar");
  const { moverPasajero } = await import("@/lib/viajeCdmx/pasajeros");
  const { ocupacion } = await import("@/lib/viajeCdmx/cupo");
  console.log("\n▶ Mover de fecha contra apartar el último lugar, 30 rondas");
  const origen = await crearSalida("2099-03-01");
  const destino = await crearSalida("2099-03-02");
  let bien = 0;
  for (let ronda = 0; ronda < 30; ronda++) {
    await prisma.tourBooking.deleteMany({ where: { salidaId: { in: [origen.id, destino.id] } } });
    await prisma.apartadoSalida.deleteMany({ where: { salidaId: { in: [origen.id, destino.id] } } });
    await ocupar(destino.id, 13, destino.fechaSalida);
    await ocupar(origen.id, 1, origen.fechaSalida);
    const pasajero = await prisma.tourBooking.findFirstOrThrow({ where: { salidaId: origen.id } });
    await Promise.allSettled([
      moverPasajero(pasajero.id, destino.id, { usuario: "prueba", nombre: "Prueba", rol: "dueno" }),
      apartarLugares(comprador(destino.id, ronda)),
    ]);
    const o = await ocupacion(prisma, destino.id);
    if (o.ocupados === 14) bien++;
    else console.log(`    ronda ${ronda}: destino con ${o.ocupados}`);
  }
  ok(bien === 30, `30 de 30 rondas: el destino nunca pasa de 14 (${bien})`);
  await limpiarSalida(origen.fechaSalida);
  await limpiarSalida(destino.fechaSalida);
}

async function main() {
  const parte = process.argv[2] ?? "candado";
  guardas(parte === "stripe");
  if (!process.env.STRIPE_SECRET_KEY) process.env.STRIPE_SECRET_KEY = "sk_test_sin_llave";
  if (parte === "candado" || parte === "todo") await parteCandado();
  if (parte === "precio" || parte === "todo") await partePrecio();
  if (parte === "mover" || parte === "todo") await parteMover();
  if (parte === "stripe") {
    const { parteStripe } = await import("./probar-viaje-cdmx-stripe");
    fallas += await parteStripe();
  }
  console.log(fallas ? `\n❌ ${fallas} falla(s)` : "\n✅ Todo bien");
  await prisma.$disconnect();
  process.exit(fallas ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
