/**
 * Qué se vende de verdad: lee TODAS las reservas y saca los patrones.
 *
 * SOLO LECTURA. No escribe una sola fila.
 *
 * Contesta dos preguntas: cómo son las reservas que entran (cuánta gente, con
 * o sin hotel, cuántos recorridos, por dónde llegan) y qué paquetes han
 * funcionado de verdad.
 *
 * Uso: npx tsx src/scripts/analisis-reservas.ts
 */
import { cargarEnv } from "./_env";
cargarEnv();

import { PrismaClient } from "@prisma/client";
import { grupoDe, lineasDe, metaDe } from "../lib/admin/reserva";

const prisma = new PrismaClient();

const mxn = (n: number) => `$${Math.round(n).toLocaleString("es-MX")}`;
const pct = (n: number, de: number) => (de ? `${Math.round((n / de) * 100)}%` : "0%");

/** Una tabla de frecuencias, ordenada de más a menos. */
function top(mapa: Map<string, number>, total: number, cuantos = 8): string[] {
  return Array.from(mapa.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, cuantos)
    .map(([k, v]) => `   ${String(v).padStart(4)}  ${pct(v, total).padStart(4)}  ${k}`);
}

function suma(mapa: Map<string, number>, clave: string, cuanto = 1) {
  mapa.set(clave, (mapa.get(clave) ?? 0) + cuanto);
}

async function main() {
  const todas = await prisma.tourBooking.findMany({ orderBy: { createdAt: "asc" } });

  // Las canceladas no dicen qué funciona: se miran aparte.
  const reservas = todas.filter((b) => b.status !== "cancelled");
  const canceladas = todas.length - reservas.length;

  console.log(`\n${"=".repeat(70)}`);
  console.log(`RESERVAS: ${todas.length} en total · ${reservas.length} vivas · ${canceladas} canceladas`);
  if (reservas.length) {
    console.log(`Desde ${reservas[0].createdAt.toISOString().slice(0, 10)} hasta ${reservas[reservas.length - 1].createdAt.toISOString().slice(0, 10)}`);
  }
  console.log("=".repeat(70));

  const porOrigen   = new Map<string, number>();
  const porPersonas = new Map<string, number>();
  const porNTours   = new Map<string, number>();
  const porTour     = new Map<string, number>();
  const porHotel    = new Map<string, number>();
  const porNoches   = new Map<string, number>();
  const porHab      = new Map<string, number>();
  const porMes      = new Map<string, number>();
  const porDiaSem   = new Map<string, number>();
  const porMetodo   = new Map<string, number>();
  const porPaquete  = new Map<string, number>();
  const ingresoPaquete = new Map<string, number>();
  const porAnticipo = new Map<string, number>();

  let ingresoTotal = 0;
  const anticipos: number[] = [];
  const grupos: number[] = [];
  const tickets: number[] = [];
  const anticipacion: number[] = [];
  let conNinos = 0;

  const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

  for (const b of reservas) {
    const meta   = metaDe(b as never);
    const lineas = lineasDe(b as never);
    const grupo  = grupoDe(b as never);
    const pkgs   = Array.isArray((b as { packageItems?: unknown }).packageItems)
      ? ((b as unknown as { packageItems: Record<string, unknown>[] }).packageItems).filter((p) => p && !p._meta)
      : [];

    ingresoTotal += b.totalAmount;
    tickets.push(b.totalAmount);

    suma(porOrigen, String((b as unknown as { origen?: string }).origen ?? "sin dato"));
    suma(porMetodo, b.stripePaymentIntentId ? "pagó en línea" : String(meta.metodoPago ?? "sin dato"));

    // ── Tamaño del grupo ──
    const total = grupo.total || 0;
    if (total > 0) {
      grupos.push(total);
      suma(porPersonas, total <= 8 ? `${total} persona${total !== 1 ? "s" : ""}` : "9 o más");
    }
    if (grupo.ninos > 0) conNinos++;

    // ── Recorridos ──
    const n = lineas.length;
    suma(porNTours, n === 0 ? "sin recorrido" : n === 1 ? "1 recorrido" : `${n} recorridos`);
    for (const l of lineas) {
      const nombre = (l.tourName || l.tourSlug || "sin nombre").split(" — ")[0].trim();
      suma(porTour, nombre);
    }

    // ── Hospedaje ──
    if (pkgs.length) {
      suma(porHotel, "CON hotel");
      const noches = Math.max(...pkgs.map((p) => Number(p.noches) || 0));
      suma(porNoches, `${noches} noche${noches !== 1 ? "s" : ""}`);
      for (const p of pkgs) suma(porHab, String(p.habitacion ?? "sin dato"));
    } else {
      suma(porHotel, "solo recorridos");
    }

    // ── Cuándo ──
    const fecha = b.tourDate || b.createdAt.toISOString().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      suma(porMes, fecha.slice(0, 7));
      suma(porDiaSem, DIAS[new Date(fecha + "T12:00:00").getDay()]);
      const dias = Math.round(
        (new Date(fecha + "T12:00:00").getTime() - b.createdAt.getTime()) / 86400000,
      );
      if (dias >= 0 && dias < 400) anticipacion.push(dias);
    }

    // ── Anticipo ──
    const dep = (b as unknown as { depositoPagado?: number }).depositoPagado ?? 0;
    const pagado = dep > 0 ? dep : b.stripePaymentIntentId ? b.totalAmount : 0;
    if (b.totalAmount > 0) {
      const p = Math.round((pagado / b.totalAmount) * 100);
      anticipos.push(p);
      suma(porAnticipo, p >= 100 ? "pagó todo" : p >= 45 ? "50% aprox." : p >= 25 ? "30% aprox." : p > 0 ? "menos del 25%" : "nada registrado");
    }

    // ── Paquetes ──
    if (/^Paquete/i.test(b.tourName)) {
      const nombre = b.tourName.replace(/^Paquete\s*[·:]\s*/i, "").trim();
      suma(porPaquete, nombre);
      ingresoPaquete.set(nombre, (ingresoPaquete.get(nombre) ?? 0) + b.totalAmount);
    }
  }

  const mediana = (a: number[]) => {
    if (!a.length) return 0;
    const s = [...a].sort((x, y) => x - y);
    return s[Math.floor(s.length / 2)];
  };

  const bloque = (titulo: string, lineas: string[]) => {
    console.log(`\n── ${titulo} ${"─".repeat(Math.max(0, 62 - titulo.length))}`);
    if (!lineas.length) console.log("   (sin datos)");
    else lineas.forEach((l) => console.log(l));
  };

  const T = reservas.length;

  bloque("POR DÓNDE ENTRAN", top(porOrigen, T));
  bloque("CUÁNTA GENTE VIENE", top(porPersonas, T, 9));
  console.log(`   mediana: ${mediana(grupos)} personas · con niños: ${conNinos} (${pct(conNinos, T)})`);
  bloque("CUÁNTOS RECORRIDOS LLEVAN", top(porNTours, T));
  bloque("QUÉ RECORRIDOS SE VENDEN", top(porTour, T, 12));
  bloque("¿CON HOTEL?", top(porHotel, T));
  bloque("CUÁNTAS NOCHES (de los que llevan hotel)", top(porNoches, T));
  bloque("QUÉ HABITACIÓN", top(porHab, T));
  bloque("CUÁNDO VIAJAN (mes del tour)", top(porMes, T, 12));
  bloque("QUÉ DÍA SALEN", top(porDiaSem, T, 7));
  bloque("CÓMO PAGAN", top(porMetodo, T));
  bloque("CUÁNTO ADELANTAN", top(porAnticipo, T));

  bloque("PAQUETES QUE SE HAN VENDIDO", [
    ...Array.from(porPaquete.entries())
      .sort((a, b) => (ingresoPaquete.get(b[0]) ?? 0) - (ingresoPaquete.get(a[0]) ?? 0))
      .map(([k, v]) => `   ${String(v).padStart(4)}  ${mxn(ingresoPaquete.get(k) ?? 0).padStart(12)}  ${k}`),
  ]);

  console.log(`\n── EL DINERO ${"─".repeat(50)}`);
  console.log(`   ingreso total:      ${mxn(ingresoTotal)}`);
  console.log(`   ticket mediano:     ${mxn(mediana(tickets))}`);
  console.log(`   ticket promedio:    ${mxn(ingresoTotal / (T || 1))}`);
  console.log(`   anticipo mediano:   ${mediana(anticipos)}%`);
  console.log(`   se reserva con:     ${mediana(anticipacion)} días de anticipación (mediana)`);
  console.log("");
}

main()
  .catch((e) => { console.error("ERROR:", e?.message ?? e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
