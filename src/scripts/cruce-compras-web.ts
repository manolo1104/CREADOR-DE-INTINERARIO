/**
 * cruce-compras-web.ts — ¿cada cobro de Stripe tiene su reserva? (19 nov 2026)
 *
 * SOLO LECTURA. El «Cruce de fuentes» del panel (Web y canales) marcó octubre
 * como «No cuadra»: GA4 vio 4 compras y el panel 3 reservas web. Este script
 * toma los PaymentIntents EXITOSOS de Stripe del periodo y busca de quién es
 * cada uno: una reserva (TourBooking), un apartado del viaje CDMX
 * (ApartadoSalida) o una liga de pago del panel (LinkPago). Lo que no tenga
 * dueño es dinero cobrado sin reserva.
 *
 * No imprime nombres, correos ni teléfonos: solo fecha, monto, folio y estado.
 *
 * Uso (desde la carpeta del repo, con la base y la llave de Stripe de producción):
 *   npx tsx --env-file=<.env con DATABASE_URL y STRIPE_SECRET_KEY> src/scripts/cruce-compras-web.ts 2026-10-01 2026-10-31
 */
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { tipoFolio } from "@/lib/admin/folio";

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const desde = FECHA.test(process.argv[2] ?? "") ? process.argv[2] : "2026-10-01";
const hasta = FECHA.test(process.argv[3] ?? "") ? process.argv[3] : "2026-10-31";
// Días de México (UTC-6, sin horario de verano desde 2022).
const inicio = new Date(`${desde}T06:00:00Z`);
const fin = new Date(new Date(`${hasta}T06:00:00Z`).getTime() + 86_400_000);
const mx = (d: Date) => d.toLocaleString("es-MX", { timeZone: "America/Mexico_City", dateStyle: "short", timeStyle: "short" });
const pesos = (n: number) => `$${Math.round(n).toLocaleString("es-MX")}`;

async function main() {
  const llave = process.env.STRIPE_SECRET_KEY;
  if (!llave) throw new Error("Falta STRIPE_SECRET_KEY");
  const stripe = new Stripe(llave);

  // 1) Los cobros exitosos de Stripe en el periodo.
  const pis: Stripe.PaymentIntent[] = [];
  for await (const pi of stripe.paymentIntents.list({ created: { gte: Math.floor(inicio.getTime() / 1000), lt: Math.floor(fin.getTime() / 1000) }, limit: 100 })) {
    if (pi.status === "succeeded") pis.push(pi);
  }
  const ids = pis.map((p) => p.id);

  // 2) De quién es cada uno.
  const [reservas, apartados, ligas, reservasWeb] = await Promise.all([
    prisma.tourBooking.findMany({ where: { stripePaymentIntentId: { in: ids } }, select: { stripePaymentIntentId: true, confirmationNumber: true, status: true, createdAt: true, tourSlug: true } }),
    prisma.apartadoSalida.findMany({ where: { paymentIntentId: { in: ids } }, select: { paymentIntentId: true, estado: true, bookingId: true, createdAt: true } }),
    prisma.linkPago.findMany({ where: { stripePaymentIntentId: { in: ids } }, select: { stripePaymentIntentId: true, estado: true, reservaId: true, cotizacionId: true } }),
    // Lo que el panel cuenta como «reservas web» del periodo (folio creado por un pago en la web).
    prisma.tourBooking.findMany({ where: { createdAt: { gte: inicio, lt: fin } }, select: { confirmationNumber: true, status: true, createdAt: true, stripePaymentIntentId: true, totalAmount: true, tourSlug: true } }),
  ]);
  const porPI = new Map<string, string>();
  for (const r of reservas) if (r.stripePaymentIntentId) porPI.set(r.stripePaymentIntentId, `reserva ${r.confirmationNumber} (${r.status}, ${r.tourSlug})`);
  for (const a of apartados) if (a.paymentIntentId && !porPI.has(a.paymentIntentId)) porPI.set(a.paymentIntentId, `viaje CDMX (apartado ${a.estado}${a.bookingId ? ", con reserva" : ", SIN reserva"})`);
  for (const l of ligas) if (l.stripePaymentIntentId && !porPI.has(l.stripePaymentIntentId)) porPI.set(l.stripePaymentIntentId, `liga de pago del panel (${l.estado}${l.reservaId ? ", con reserva" : l.cotizacionId ? ", de una cotización" : ""})`);

  // 3) Los que quedaron sin dueño: ¿del curso (CursoLead), de un cobro capturado en
  //    el panel (Movimiento), o de otra página? La sesión de Checkout dice a dónde regresó.
  const huerfanos = pis.filter((p) => !porPI.has(p.id));
  const movs = huerfanos.length
    ? await prisma.movimiento.findMany({ where: { OR: [{ stripeRef: { in: huerfanos.map((p) => p.id) } }, { referencia: { in: huerfanos.map((p) => p.id) } }] }, select: { stripeRef: true, referencia: true, reservaId: true, anulado: true } })
    : [];
  for (const m of movs) {
    const id = m.stripeRef || m.referencia;
    if (id) porPI.set(id, `cobro capturado en el panel${m.reservaId ? " (con reserva)" : ""}${m.anulado ? " · ANULADO" : ""}`);
  }
  const tapar = (v: string) => v.replace(/[^\s@]+@[^\s@]+/g, "«correo»").replace(/\+?\d[\d\s-]{8,}\d/g, "«teléfono»");
  const pista = new Map<string, string>();
  for (const pi of huerfanos) {
    if (porPI.has(pi.id)) continue;
    const partes: string[] = [];
    const ses = (await stripe.checkout.sessions.list({ payment_intent: pi.id, limit: 1 })).data[0];
    if (ses) {
      const curso = await prisma.cursoLead.findFirst({ where: { stripeSessionId: ses.id }, select: { id: true } });
      if (curso) { porPI.set(pi.id, "curso «Turismo con IA» (CursoLead)"); continue; }
      const ligaSes = await prisma.linkPago.findFirst({ where: { stripeSessionId: ses.id }, select: { estado: true, reservaId: true } });
      if (ligaSes) { porPI.set(pi.id, `liga de pago del panel (${ligaSes.estado}${ligaSes.reservaId ? ", con reserva" : ""})`); continue; }
      let regreso = "";
      try { regreso = ses.success_url ? new URL(ses.success_url).host + new URL(ses.success_url).pathname : ""; } catch { /* sin URL */ }
      if (regreso) partes.push(`regresó a ${regreso}`);
      if (ses.payment_link) partes.push(`liga de Stripe ${typeof ses.payment_link === "string" ? ses.payment_link : ses.payment_link.id}`);
      const metaSes = Object.entries(ses.metadata || {}).map(([k, v]) => `${k}=${tapar(String(v)).slice(0, 40)}`);
      if (metaSes.length) partes.push(`datos ${metaSes.join(", ")}`);
    } else {
      partes.push("sin sesión de Checkout (cobro directo o de otro sistema)");
    }
    if (pi.description) partes.push(`descripción «${tapar(pi.description).slice(0, 60)}»`);
    const metaPi = Object.entries(pi.metadata || {}).map(([k, v]) => `${k}=${tapar(String(v)).slice(0, 40)}`);
    if (metaPi.length) partes.push(`datos del pago ${metaPi.join(", ")}`);
    pista.set(pi.id, partes.join(" · "));
  }

  console.log(`\n💳 Cobros EXITOSOS en Stripe del ${desde} al ${hasta}: ${pis.length}\n`);
  let sinDueno = 0;
  for (const pi of pis.sort((a, b) => a.created - b.created)) {
    const de = porPI.get(pi.id);
    if (!de) sinDueno++;
    const origen = String(pi.metadata?.source || pi.metadata?.origen || "");
    console.log(`  ${mx(new Date(pi.created * 1000))} · ${pesos(pi.amount / 100)} · ${de ?? "🔴 SIN RESERVA NI LIGA"}${origen ? ` · origen ${origen}` : ""} · ${pi.id}`);
    if (!de && pista.get(pi.id)) console.log(`      ↳ ${pista.get(pi.id)}`);
  }

  const web = reservasWeb.filter((r) => tipoFolio(r.confirmationNumber) === "web");
  console.log(`\n🧾 Reservas con folio web creadas en el periodo: ${web.length} (el panel cuenta las que no están canceladas ni en borrador)`);
  for (const r of web.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())) {
    console.log(`  ${mx(r.createdAt)} · ${r.confirmationNumber} · ${r.status} · ${pesos(r.totalAmount)} · ${r.tourSlug}${r.stripePaymentIntentId ? "" : " · sin PaymentIntent"}`);
  }
  console.log(`\n${sinDueno ? `🔴 ${sinDueno} cobro(s) de Stripe sin reserva ni liga: revisar en Stripe y en Cobros.` : "✅ Todos los cobros exitosos de Stripe tienen su reserva, viaje o liga."}\n`);
}

main()
  .catch((e) => { console.error("❌", e instanceof Error ? e.message : e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
