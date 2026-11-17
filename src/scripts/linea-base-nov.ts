/**
 * SOLO LECTURA. Línea base ANTES del panel nuevo (17 nov 2026): las 4 semanas
 * lunes–domingo del 19 oct al 15 nov, con las mismas fórmulas del panel, más la
 * serie semanal desde el 21 sep para ver cuánto se mueve sola cada cifra.
 *
 * Funciona contra la base de producción aunque todavía no tenga las tablas
 * nuevas del panel: pide solo columnas que ya existen (select explícito), no
 * usa la caché de GA4 en `Config` (INDICADORES_SIN_CACHE) y no escribe nada.
 * Imprime solo totales: ni nombres, ni teléfonos, ni correos.
 *
 *   npx tsx --env-file="<ruta>/.env.local" src/scripts/linea-base-nov.ts
 */
process.env.INDICADORES_SIN_CACHE = "1";

import { prisma } from "@/lib/prisma";
import { hoyMX, ymdMX, addDaysYMD } from "@/lib/dates";
import { tipoFolio } from "@/lib/admin/folio";
import { grupoDe, incluyeHotel } from "@/lib/admin/reserva";
import { montoCobrado, saldoPendiente } from "@/lib/admin/dinero";
import { agruparClientes } from "@/lib/admin/clientes";
import { diasDeTourDe, diasEnRango, resumirSalidas } from "@/lib/admin/salidas";
import { cuenta } from "@/lib/admin/indicadores/util";
import { periodoDe } from "@/lib/admin/indicadores/periodo";
import { medirDemanda } from "@/lib/admin/indicadores/demanda";
import { formatear } from "@/lib/admin/indicadores/estado";
import { KPI } from "@/lib/admin/indicadores/catalogo";
import type { TourBooking } from "@prisma/client";

const DESDE = "2026-10-19", HASTA = "2026-11-15";
const SEMANAS = Array.from({ length: 8 }, (_, i) => addDaysYMD("2026-09-21", i * 7)); // lunes 21 sep … 9 nov

const SELECT = {
  id: true, confirmationNumber: true, tourSlug: true, tourName: true, tourDate: true, adults: true, children: true,
  totalAmount: true, lineItems: true, packageItems: true, depositoPagado: true, stripePaymentIntentId: true,
  status: true, origen: true, customerName: true, customerEmail: true, customerPhone: true, createdAt: true,
} as const;

const pesos = (n: number) => `$${Math.round(n).toLocaleString("es-MX")}`;
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 1000) / 10} % (${a} de ${b})` : "— (0 de 0)");
const r1 = (n: number) => Math.round(n * 10) / 10;
const linea = (k: string, v: string) => console.log(`  ${k.padEnd(46)} ${v}`);
const entre = (ymd: string, a: string, b: string) => ymd >= a && ymd <= b;

async function main() {
  const hoy = hoyMX();
  console.log(`LÍNEA BASE · ${DESDE} a ${HASTA} (4 semanas lun–dom) · corrida el ${hoy} · solo lectura\n`);

  const vivas = (await prisma.tourBooking.findMany({ select: SELECT })).filter(b => cuenta(b.status));
  const todas = await prisma.tourBooking.findMany({ select: { createdAt: true, status: true } });
  const primerDia = (b: (typeof vivas)[number]) => diasDeTourDe(b).map(d => d.fecha).sort()[0] ?? b.tourDate;
  const ultimoDia = (b: (typeof vivas)[number]) => diasDeTourDe(b).map(d => d.fecha).sort().at(-1) ?? b.tourDate;

  // ── 1. Ventas (por fecha de captura) ──
  const ven = vivas.filter(b => entre(ymdMX(b.createdAt), DESDE, HASTA));
  const vendido = ven.reduce((t, b) => t + b.totalAmount, 0);
  const pax = ven.map(b => grupoDe(b).total);
  console.log("1. VENTAS");
  linea("Reservas capturadas", String(ven.length));
  linea("Vendido", pesos(vendido));
  linea("Ticket promedio", ven.length ? pesos(vendido / ven.length) : "—");
  linea("Cobrado de esas reservas (al correr)", pesos(ven.reduce((t, b) => t + montoCobrado(b), 0)));
  linea("Personas por reserva", ven.length ? `${r1(pax.reduce((t, n) => t + n, 0) / ven.length)} · con 1–2 personas ${pct(pax.filter(n => n <= 2).length, ven.length)}` : "—");
  linea("Reservas para hoy o mañana", pct(ven.filter(b => primerDia(b) <= addDaysYMD(ymdMX(b.createdAt), 1)).length, ven.length));
  linea("Reservas con hotel", pct(ven.filter(incluyeHotel).length, ven.length));
  linea("Reservas pagadas en la web (folio web)", String(ven.filter(b => tipoFolio(b.confirmationNumber) === "web").length));
  linea("Canceladas capturadas en la ventana", String(todas.filter(b => b.status === "cancelled" && entre(ymdMX(b.createdAt), DESDE, HASTA)).length));
  const conCanal = ven.filter(b => b.origen && b.origen !== "por_confirmar");
  linea("Con canal registrado", pct(conCanal.length, ven.length));
  linea("Con canal y capturadas antes del tour", pct(conCanal.filter(b => ymdMX(b.createdAt) <= primerDia(b)).length, ven.length));
  const canales = new Map<string, number>();
  for (const b of ven) canales.set(b.origen || "(vacío)", (canales.get(b.origen || "(vacío)") ?? 0) + 1);
  linea("Por canal", Array.from(canales.entries()).sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c} ${n}`).join(" · "));

  // ── 2. Cotizaciones (por fecha de creación; en prod no existe la fecha de envío) ──
  const cots = (await prisma.tourQuote.findMany({ select: { status: true, totalAmount: true, createdAt: true } }))
    .filter(q => entre(ymdMX(q.createdAt), DESDE, HASTA));
  const enviadas = cots.filter(q => ["enviada", "aceptada", "expirada"].includes(q.status));
  const aceptadas = enviadas.filter(q => q.status === "aceptada");
  console.log("\n2. COTIZACIONES DEL PANEL (aproximado: por fecha de creación)");
  linea("Hechas (todas)", String(cots.length));
  linea("Salieron al cliente (enviada/aceptada/vencida)", String(enviadas.length));
  linea("Aceptadas · número", pct(aceptadas.length, enviadas.length));
  const mEnv = enviadas.reduce((t, q) => t + q.totalAmount, 0), mAce = aceptadas.reduce((t, q) => t + q.totalAmount, 0);
  linea("Aceptadas · monto", mEnv ? `${Math.round((mAce / mEnv) * 1000) / 10} % (${pesos(mAce)} de ${pesos(mEnv)})` : "—");

  // ── 3. Operación (salidas por fecha del tour) ──
  const op = resumirSalidas(diasEnRango(vivas as unknown as TourBooking[], DESDE, HASTA));
  console.log("\n3. OPERACIÓN (salidas con fecha en la ventana)");
  linea("Salidas", String(op.salidas));
  linea("Personas por salida (sin a medida)", String(op.paxPorSalida));
  linea("Salidas regulares bajo mínimo", `${op.regularesBajoMinimo} de ${op.regulares}`);
  const vencidas = vivas.filter(b => saldoPendiente(b) > 0 && ultimoDia(b) <= HASTA);
  linea("Saldos vencidos (tour ≤ 15 nov, al correr)", `${pesos(vencidas.reduce((t, b) => t + saldoPendiente(b), 0))} en ${vencidas.length} reservas`);
  const cortes = await prisma.corteSemanal.findMany({ where: { semana: { gte: DESDE, lte: "2026-11-09" } }, select: { semana: true, ventas: true, utilidad: true, estado: true } }).catch(() => []);
  const cerrados = cortes.filter(c => c.estado !== "borrador");
  const vC = cerrados.reduce((t, c) => t + c.ventas, 0), uC = cerrados.reduce((t, c) => t + c.utilidad, 0);
  linea("Cortes en la ventana", cortes.map(c => `${c.semana} ${c.estado}`).join(" · ") || "ninguno");
  linea("Margen de los cortes cerrados", vC ? `${r1((uC / vC) * 100)} % (${pesos(uC)} de ${pesos(vC)})` : "sin cortes cerrados");

  // ── 4. Servicio ──
  const enc = await prisma.encuestaReserva.findMany({ select: { satisfaccionEnviadaEn: true, satisfaccionEn: true, recomendaria: true, calificacion: true } }).catch(() => []);
  const envV = enc.filter(e => e.satisfaccionEnviadaEn && entre(ymdMX(e.satisfaccionEnviadaEn), DESDE, HASTA));
  const cont = envV.filter(e => e.satisfaccionEn);
  const notas = cont.map(e => e.recomendaria).filter((n): n is number => typeof n === "number");
  console.log("\n4. SERVICIO");
  linea("Encuestas de satisfacción contestadas", pct(cont.length, envV.length));
  linea("Recomendación (NPS) de las contestadas", notas.length ? `${Math.round(((notas.filter(n => n >= 9).length - notas.filter(n => n <= 6).length) / notas.length) * 100)} (${notas.length} respuestas)` : "sin respuestas");
  const hasta15 = vivas.filter(b => ymdMX(b.createdAt) <= HASTA);
  const clientes = agruparClientes(hasta15 as unknown as TourBooking[]);
  linea("Clientes que vuelven (todo hasta el 15 nov)", pct(clientes.filter(c => c.totalReservas > 1).length, clientes.length));

  // ── 5. Serie semanal ──
  console.log("\n5. SERIE SEMANAL (lunes): reservas · vendido · personas por salida · bajo mínimo");
  for (const lunes of SEMANAS) {
    const dom = addDaysYMD(lunes, 6);
    const rs = vivas.filter(b => entre(ymdMX(b.createdAt), lunes, dom));
    const s = resumirSalidas(diasEnRango(vivas as unknown as TourBooking[], lunes, dom));
    linea(`${lunes}`, `${rs.length} · ${pesos(rs.reduce((t, b) => t + b.totalAmount, 0))} · ${s.paxPorSalida} · ${s.regularesBajoMinimo}/${s.regulares}`);
  }

  // ── 6. Web (GA4 + Search Console), las mismas fórmulas de «Web y canales» ──
  console.log("\n6. WEB (GA4 y Search Console)");
  const p = periodoDe("28d", HASTA, hoy);
  const serie = SEMANAS.map(l => periodoDe("semana", l, hoy));
  try {
    const m = await medirDemanda(p, serie, hoy);
    for (const v of m.valores) {
      const def = KPI[v.clave];
      if (!def) continue;
      linea(def.nombre, v.valor === null ? `sin dato${v.nota ? ` (${v.nota})` : ""}` : `${formatear(def.unidad, v.valor)}${v.detalle ? ` · ${v.detalle}` : ""}`);
    }
    const g = m.detalle as unknown as Record<string, unknown>;
    const secc = (g.secciones as { etiqueta: string; vistas: number; whatsapp: number; porMil: number | null }[] | undefined) ?? [];
    linea("Por sección: vistas · WhatsApp · por mil", "");
    for (const s of secc.filter(s => s.vistas > 0)) linea(`  ${s.etiqueta}`, `${s.vistas} · ${s.whatsapp} · ${s.porMil ?? "—"}`);
    for (const k of ["canales", "embudo", "cruce", "gsc"]) console.log(`  (${k}) ${JSON.stringify(g[k], (_, val) => (Array.isArray(val) && val.length > 10 ? val.slice(0, 10) : val))}`);
  } catch (e) {
    console.log(`  GA4/Search Console no se pudo leer: ${(e as Error).message}`);
  }
}

main().then(() => prisma.$disconnect()).catch(async e => { console.error("Error:", (e as Error).message); await prisma.$disconnect(); process.exit(1); });
