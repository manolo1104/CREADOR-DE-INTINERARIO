/**
 * SOLO LECTURA. Compara los KPIs del panel contra la línea base del documento
 * «Plan As Is / To Be» (4 nov 2026), con las MISMAS funciones que usan las
 * pestañas de indicadores. Sirve para la revisión de la semana 2 del plan («que
 * la medición sea confiable») y para volver a medir cuando se quiera.
 *
 * Funciona contra la base de producción aunque todavía no tenga las columnas
 * nuevas: solo pide columnas que ya existen (select explícito) y no toca nada.
 * No imprime datos de clientes, solo totales.
 *
 *   npx tsx --env-file=<ruta>/.env.local src/scripts/medir-linea-base.ts
 */
import type { TourBooking } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hoyMX, ymdMX, addDaysYMD } from "@/lib/dates";
import { tipoFolio } from "@/lib/admin/folio";
import { grupoDe, incluyeHotel, lineasDe } from "@/lib/admin/reserva";
import { montoCobrado, saldoPendiente } from "@/lib/admin/dinero";
import { agruparClientes } from "@/lib/admin/clientes";
import { agruparSalidas, diasDeTourDe, diasEnRango } from "@/lib/admin/salidas";
import { cobradoPorTour, TAMUL } from "@/lib/admin/indicadores/producto";
import { cuenta } from "@/lib/admin/indicadores/util";
import { describeBase } from "./_env";

const SELECT = {
  id: true, confirmationNumber: true, tourSlug: true, tourName: true, tourDate: true, adults: true, children: true,
  totalAmount: true, lineItems: true, packageItems: true, depositoPagado: true, stripePaymentIntentId: true,
  status: true, origen: true, customerName: true, customerEmail: true, customerPhone: true, createdAt: true,
} as const;

type Fila = { kpi: string; documento: string; panel: string; ok: boolean | null };
const filas: Fila[] = [];
const anota = (kpi: string, documento: string, panel: string, ok: boolean | null) => filas.push({ kpi, documento, panel, ok });
const pesos = (n: number) => `$${Math.round(n).toLocaleString("es-MX")}`;
const r1 = (n: number) => Math.round(n * 10) / 10;

async function main() {
  console.log(`Base: ${describeBase()}  ·  solo lectura\n`);
  const todas = (await prisma.tourBooking.findMany({ select: SELECT })).filter(b => cuenta(b.status));
  const hoy = hoyMX();

  // ── Comercial · octubre (por fecha de captura) ──
  const oct = todas.filter(b => ymdMX(b.createdAt).startsWith("2026-10"));
  const vendido = oct.reduce((t, b) => t + b.totalAmount, 0);
  anota("Reservas · octubre", "33", String(oct.length), oct.length === 33);
  anota("Vendido · octubre", "$238,889", pesos(vendido), vendido === 238889);
  anota("Ticket promedio · octubre", "$7,239", oct.length ? pesos(vendido / oct.length) : "—", oct.length ? Math.abs(vendido / oct.length - 7239) < 1 : null);

  // ── Operación · octubre: tamaño del grupo y anticipación ──
  const pax = oct.map(b => grupoDe(b).total);
  const unoODos = pax.filter(n => n <= 2).length;
  anota("Personas por reserva · octubre", "2.6 (64 % con 1 o 2)", oct.length ? `${r1(pax.reduce((t, n) => t + n, 0) / oct.length)} (${Math.round((unoODos / oct.length) * 100)} %)` : "—", null);
  const mismoDia = oct.filter(b => (diasDeTourDe(b).map(d => d.fecha).sort()[0] ?? b.tourDate) <= addDaysYMD(ymdMX(b.createdAt), 1)).length;
  anota("Reservas para hoy o mañana · octubre", "14 de 33", `${mismoDia} de ${oct.length}`, mismoDia === 14);

  // ── Saldos vencidos (al día de hoy) ──
  const vencidas = todas.filter(b => saldoPendiente(b) > 0 && (diasDeTourDe(b).map(d => d.fecha).sort().at(-1) ?? b.tourDate) < hoy);
  const saldo = vencidas.reduce((t, b) => t + saldoPendiente(b), 0);
  anota(`Saldos vencidos (al ${hoy})`, "$5,750 (al 3 nov)", `${pesos(saldo)} en ${vencidas.length}`, saldo === 5750);

  // ── Operación · noviembre: salidas (tour + día) ──
  const salidas = agruparSalidas(diasEnRango(todas, "2026-11-01", "2026-11-30"));
  const paxNov = salidas.reduce((t, s) => t + s.personas, 0);
  const bajo = salidas.filter(s => !s.aMedida && s.personas <= 2).length;
  anota("Personas por salida · noviembre", "2.8", salidas.length ? String(r1(paxNov / salidas.length)) : "—", salidas.length ? Math.abs(r1(paxNov / salidas.length) - 2.8) <= 0.1 : null);
  anota("Salidas bajo mínimo · noviembre", "8", String(bajo), bajo === 8);

  // ── Producto · de mayo al 3 nov ──
  const hasta3 = todas.filter(b => ymdMX(b.createdAt) <= "2026-11-03");
  const conTamul = hasta3.filter(b => (lineasDe(b).length ? lineasDe(b).some(l => l.tourSlug === TAMUL) : b.tourSlug === TAMUL)).length;
  let cobrado = 0, cobradoTamul = 0;
  for (const b of hasta3) {
    const ls = lineasDe(b);
    const r = { ymd: "", conHotel: false, cobrado: montoCobrado(b), lineas: ls.length ? ls.map(l => ({ slug: l.tourSlug ?? "", subtotal: Number(l.subtotal) || 0 })) : [{ slug: b.tourSlug, subtotal: b.totalAmount }] };
    cobrado += r.cobrado; cobradoTamul += cobradoPorTour(r).get(TAMUL) ?? 0;
  }
  anota("Reservas con Tamul", "53 de 97", `${conTamul} de ${hasta3.length}`, conTamul === 53 && hasta3.length === 97);
  anota("Peso de Tamul en lo cobrado", "35 %", cobrado ? `${Math.round((cobradoTamul / cobrado) * 100)} %` : "—", cobrado ? Math.round((cobradoTamul / cobrado) * 100) === 35 : null);
  const hotel = hasta3.filter(incluyeHotel).length;
  anota("Reservas con hotel", "7 de 97", `${hotel} de ${hasta3.length}`, hotel === 7);

  // ── Servicio: clientes que vuelven ──
  const clientes = agruparClientes(hasta3 as unknown as TourBooking[]);
  const repiten = clientes.filter(c => c.totalReservas > 1).length;
  anota("Clientes que vuelven", "2 de 95", `${repiten} de ${clientes.length}`, repiten === 2 && clientes.length === 95);

  // ── Demanda: reservas web del 7 oct al 3 nov ──
  const web = todas.filter(b => tipoFolio(b.confirmationNumber) === "web" && ymdMX(b.createdAt) >= "2026-10-07" && ymdMX(b.createdAt) <= "2026-11-03").length;
  anota("Reservas pagadas en la web · 7 oct – 3 nov", "5", String(web), web === 5);

  // ── Operación: el corte del 19–25 oct ──
  const corte = await prisma.corteSemanal.findUnique({ where: { semana: "2026-10-19" }, select: { ventas: true, utilidad: true, estado: true } }).catch(() => null);
  anota("Margen del corte 19–25 oct", "30 %", corte && corte.ventas ? `${r1((corte.utilidad / corte.ventas) * 100)} % (${pesos(corte.utilidad)} de ${pesos(corte.ventas)})` : "sin corte", corte && corte.ventas ? Math.round((corte.utilidad / corte.ventas) * 100) === 30 : null);

  const ancho = Math.max(...filas.map(f => f.kpi.length));
  for (const f of filas) console.log(`${f.ok === null ? "·" : f.ok ? "✓" : "✗"} ${f.kpi.padEnd(ancho)}  documento: ${f.documento.padEnd(20)} panel: ${f.panel}`);
  const malos = filas.filter(f => f.ok === false).length;
  console.log(`\n${malos === 0 ? "Todo cuadra con el documento." : `${malos} no cuadran: si los datos cambiaron desde el 3 nov (cobros registrados, reservas nuevas o canceladas), es normal.`}`);
}

main().then(() => prisma.$disconnect()).catch(async e => { console.error("Error:", (e as Error).message); await prisma.$disconnect(); process.exit(1); });
