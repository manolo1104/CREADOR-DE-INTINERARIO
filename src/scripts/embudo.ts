/**
 * embudo.ts — ¿en qué paso se cae la gente?
 *
 * Lee los eventos guardados (tabla TrackEvent) y arma el embudo real: cuántos
 * ven contenido, cuántos llegan al producto, cuántos abren el pago y cuántos
 * reservan. Antes esto era imposible: los eventos solo iban a stdout.
 *
 * Uso:  npx tsx src/scripts/embudo.ts [días]     (por defecto 7)
 */

import { PrismaClient } from "@prisma/client";
import { cargarEnv } from "./_env";

cargarEnv();

const prisma = new PrismaClient();

// Pasos del embudo, en orden. `sesiones` cuenta visitantes distintos, no clics:
// una persona que ve 7 tours es UNA persona interesada, no siete.
const PASOS: Array<{ label: string; events: string[] }> = [
  { label: "Vio un destino",        events: ["DESTINO_PAGE_VIEW"] },
  { label: "Vio el catálogo",       events: ["TOURS_LIST_VIEW"] },
  { label: "Del destino al tour",   events: ["DESTINO_TOUR_CLICK"] },
  { label: "Vio un tour",           events: ["TOUR_PAGE_VIEW"] },
  // Sin este paso no se distinguía "no llega a la página de reserva" de "llega
  // y no elige fecha" — son páginas distintas y piden arreglos opuestos.
  { label: "Abrió la reserva",      events: ["BOOKING_PAGE_VIEW"] },
  { label: "Eligió fecha",          events: ["DATE_SELECTED"] },
  { label: "Inició reserva",        events: ["CHECKOUT_STARTED"] },
  { label: "Llegó al pago",         events: ["PAYMENT_INITIATED"] },
  { label: "Pago fallido",          events: ["PAGO_FALLIDO"] },
  { label: "RESERVÓ",               events: ["BOOKING_CONFIRMED"] },
  // Fuera del embudo lineal: quien se va por WhatsApp no abandona, cambia de
  // canal. Se cuenta aparte para no leerlo como una fuga.
  { label: "· Se fue a WhatsApp",   events: ["WHATSAPP_CLICK"] },
];

async function main() {
  const dias  = Number(process.argv[2]) || 7;
  const desde = new Date(Date.now() - dias * 86_400_000);

  const eventos = await prisma.trackEvent.findMany({
    where:  { createdAt: { gte: desde } },
    select: { event: true, sid: true, device: true, referrer: true, tourSlug: true, amount: true, data: true },
  });

  console.log(`\n📊  Embudo de los últimos ${dias} días\n`);

  if (eventos.length === 0) {
    console.log("    (sin eventos registrados todavía)\n");
    console.log("    Si acabas de desplegar, la tabla se crea al arrancar y se");
    console.log("    llena conforme entre gente al sitio.\n");
    return;
  }

  const sesiones = new Set(eventos.map((e) => e.sid).filter(Boolean)).size;
  console.log(`    ${eventos.length} eventos · ${sesiones} sesiones\n`);

  // ── Embudo ────────────────────────────────────────────────────────────────
  const sesionesPorPaso = PASOS.map((p) => {
    const s = new Set(
      eventos.filter((e) => p.events.includes(e.event)).map((e) => e.sid ?? "?"),
    );
    return { ...p, n: s.size };
  });

  const tope = Math.max(...sesionesPorPaso.map((p) => p.n), 1);
  for (const p of sesionesPorPaso) {
    const pct   = ((p.n / tope) * 100).toFixed(1).padStart(5);
    const barra = "█".repeat(Math.round((p.n / tope) * 30));
    console.log(`    ${p.label.padEnd(22)} ${String(p.n).padStart(5)}  ${pct}%  ${barra}`);
  }

  // ── Dispositivo y origen: lo que antes no se podía saber ──────────────────
  const cuenta = (campo: "device" | "referrer") => {
    const m: Record<string, Set<string>> = {};
    for (const e of eventos) {
      const v = e[campo];
      if (!v) continue;
      (m[v] ??= new Set()).add(e.sid ?? "?");
    }
    return Object.entries(m)
      .map(([k, v]) => [k, v.size] as const)
      .sort((a, b) => b[1] - a[1]);
  };

  const devices = cuenta("device");
  if (devices.length) {
    console.log("\n    DISPOSITIVO");
    for (const [k, n] of devices) console.log(`      ${k.padEnd(14)} ${n} sesiones`);
  }

  const refs = cuenta("referrer").slice(0, 8);
  if (refs.length) {
    console.log("\n    DE DÓNDE LLEGAN");
    for (const [k, n] of refs) console.log(`      ${k.slice(0, 40).padEnd(42)} ${n}`);
  }

  // ── Tours con más interés ─────────────────────────────────────────────────
  const porTour: Record<string, Set<string>> = {};
  for (const e of eventos) {
    if (!e.tourSlug) continue;
    (porTour[e.tourSlug] ??= new Set()).add(e.sid ?? "?");
  }
  const tours = Object.entries(porTour)
    .map(([k, v]) => [k, v.size] as const)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  if (tours.length) {
    console.log("\n    INTERÉS POR TOUR");
    for (const [k, n] of tours) console.log(`      ${k.padEnd(34)} ${n} sesiones`);
  }

  // ── Motivos de pago fallido ───────────────────────────────────────────────
  const fallos = eventos.filter((e) => e.event === "PAGO_FALLIDO");
  if (fallos.length) {
    const motivos: Record<string, number> = {};
    for (const f of fallos) {
      const d = (f.data ?? {}) as Record<string, unknown>;
      const m = String(d.decline_code ?? d.code ?? "desconocido");
      motivos[m] = (motivos[m] || 0) + 1;
    }
    console.log("\n    ❌ POR QUÉ FALLARON LOS PAGOS");
    for (const [m, n] of Object.entries(motivos).sort((a, b) => b[1] - a[1])) {
      console.log(`      ${m.padEnd(34)} ${n}`);
    }
  }

  console.log("");
}

main()
  .catch((e) => {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("does not exist") || msg.includes("TrackEvent")) {
      console.log("\n    La tabla TrackEvent aún no existe en esta base.");
      console.log("    Se crea sola al arrancar en Railway (prisma db push).\n");
      return;
    }
    console.error("Error:", msg);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
