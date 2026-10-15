/**
 * Pruebas del viaje CDMX–Xilitla con Stripe en MODO PRUEBA. Lo llama
 * `probar-viaje-cdmx.ts stripe` (que ya revisó que la base sea local y la llave
 * sea `sk_test_…`).
 *
 * Con `VIAJE_URL` (un servidor local con las mismas llaves de prueba y
 * `STRIPE_WEBHOOK_SECRET`) prueba además la carrera por HTTP y el webhook firmado.
 */
import { prisma } from "@/lib/prisma";

const DIA = 86_400_000;
let fallas = 0;
function ok(cond: boolean, que: string) {
  if (cond) console.log(`  ✅ ${que}`);
  else { fallas++; console.log(`  ❌ ${que}`); }
}
const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function salidaDePrueba(fecha: string, ocupados: number) {
  const vieja = await prisma.salidaGrupal.findUnique({ where: { fechaSalida: fecha } });
  if (vieja) {
    const reservas = await prisma.tourBooking.findMany({ where: { salidaId: vieja.id }, select: { id: true } });
    await prisma.movimiento.deleteMany({ where: { reservaId: { in: reservas.map((r) => r.id) } } });
    await prisma.apartadoSalida.deleteMany({ where: { salidaId: vieja.id } });
    await prisma.tourBooking.deleteMany({ where: { salidaId: vieja.id } });
    await prisma.salidaGrupal.delete({ where: { id: vieja.id } });
  }
  const s = await prisma.salidaGrupal.create({
    data: {
      fechaSalida: fecha, fechaRegreso: fecha, capacidad: 14, minimo: 8, precio: 6000, precioPreventa: null,
      abreEl: new Date(Date.now() - DIA), fechaCorte: new Date(Date.now() + 40 * DIA), estado: "publicada",
    },
  });
  for (let i = 0; i < ocupados; i++) {
    await prisma.tourBooking.create({
      data: {
        confirmationNumber: `PRUEBA-ST-${s.id}-${i}`, tourId: "viaje-cdmx-xilitla", tourName: "Prueba", tourSlug: "viaje-cdmx-xilitla",
        tourDate: fecha, adults: 1, totalAmount: 6000, customerName: `Ocupante ${i}`, customerEmail: `o${i}@prueba.local`, status: "paid", salidaId: s.id,
      },
    });
  }
  return s;
}

const persona = (salidaId: string, i: number, extra: Record<string, unknown> = {}) => ({
  salidaId, personas: 1, nombre: `Comprador ${i}`, email: `c${i}@example.com`, telefono: "4891234567", huella: `st-${i}-${Math.random()}`, ...extra,
});

export async function parteStripe(): Promise<number> {
  const { stripe } = await import("@/lib/stripe");
  const { apartarLugares, crearCobroDelApartado, revisarApartado, registrarFichaOxxo, soltarPorCobro } = await import("@/lib/viajeCdmx/apartar");
  const { confirmarPasaje } = await import("@/lib/viajeCdmx/confirmar");
  const { ocupacion } = await import("@/lib/viajeCdmx/cupo");

  // ── Tarjeta aprobada + pantalla y webhook a la vez + webhook repetido ──
  console.log("\n▶ Tarjeta aprobada: pantalla, webhook y conciliación a la vez");
  const s = await salidaDePrueba("2099-05-01", 10);
  const a1 = await apartarLugares(persona(s.id, 1));
  const pi1 = await crearCobroDelApartado(a1);
  ok(pi1.payment_method_types.includes("card"), `cobro creado con ${pi1.payment_method_types.join(", ")}`);
  const pagado = await stripe.paymentIntents.confirm(pi1.id, { payment_method: "pm_card_visa", return_url: "https://example.com" });
  ok(pagado.status === "succeeded", `la tarjeta 4242 pasa (${pagado.status})`);
  const res = await Promise.all([
    confirmarPasaje(pagado, "pantalla"), confirmarPasaje(pagado, "webhook"), confirmarPasaje(pagado, "conciliacion"),
    confirmarPasaje(pagado, "webhook"), confirmarPasaje(pagado, "webhook"),
  ]);
  ok(res.filter((r) => r.estado === "creada").length === 1, `solo uno la crea (${res.map((r) => r.estado).join(", ")})`);
  const reservas = await prisma.tourBooking.findMany({ where: { stripePaymentIntentId: pi1.id } });
  ok(reservas.length === 1, `1 reserva (${reservas.length})`);
  const cobros = await prisma.movimiento.count({ where: { reservaId: reservas[0]?.id, tipo: "cobro", anulado: false } });
  ok(cobros === 1, `1 renglón de cobro (${cobros})`);
  ok(reservas[0]?.depositoPagado === a1.montos.anticipo && reservas[0]?.status === "pending", `anticipo ${reservas[0]?.depositoPagado} y estado «pending» con saldo`);
  const h1 = await prisma.apartadoSalida.findUnique({ where: { id: a1.apartado.id } });
  ok(h1?.estado === "pagado" && h1.bookingId === reservas[0]?.id, "el apartado quedó «pagado» y ligado a su reserva");
  const o1 = await ocupacion(prisma, s.id);
  ok(o1.ocupados === 11 && o1.enPago === 0, `ocupados 11, nadie pagando (${o1.ocupados}/${o1.enPago})`);

  // ── Tarjeta rechazada: el lugar sigue apartado para reintentar ──
  console.log("\n▶ Tarjeta rechazada");
  const a2 = await apartarLugares(persona(s.id, 2));
  const pi2 = await crearCobroDelApartado(a2);
  let rechazo = "";
  try {
    await stripe.paymentIntents.confirm(pi2.id, { payment_method: "pm_card_chargeDeclined", return_url: "https://example.com" });
  } catch (e) {
    rechazo = (e as { code?: string }).code ?? "error";
  }
  ok(rechazo === "card_declined", `Stripe la rechaza (${rechazo})`);
  ok((await revisarApartado(a2.apartado.id)) === "sigue", "el apartado sigue vivo para reintentar");
  const reintento = await stripe.paymentIntents.confirm(pi2.id, { payment_method: "pm_card_visa", return_url: "https://example.com" });
  ok(reintento.status === "succeeded", "el reintento con otra tarjeta pasa sobre el MISMO cobro");
  await confirmarPasaje(reintento, "pantalla");

  // ── Vence sin pagar: se cancela el cobro y vuelve el lugar ──
  console.log("\n▶ Apartado que vence sin pagar");
  const a3 = await apartarLugares(persona(s.id, 3));
  const pi3 = await crearCobroDelApartado(a3);
  await prisma.apartadoSalida.update({ where: { id: a3.apartado.id }, data: { expiraEl: new Date(Date.now() - 1000) } });
  ok((await revisarApartado(a3.apartado.id)) === "liberado", "la revisión lo libera");
  ok((await stripe.paymentIntents.retrieve(pi3.id)).status === "canceled", "y su cobro quedó CANCELADO en Stripe (ya no se puede pagar tarde)");

  // ── Pago tardío sin lugar: se guarda con SOBRECUPO ──
  console.log("\n▶ Pago que llega cuando ya no hay lugar");
  const lleno = await salidaDePrueba("2099-05-02", 13);
  const a4 = await apartarLugares(persona(lleno.id, 4));
  const pi4 = await crearCobroDelApartado(a4);
  const p4 = await stripe.paymentIntents.confirm(pi4.id, { payment_method: "pm_card_visa", return_url: "https://example.com" });
  // Su apartado vence y alguien del panel vende el último asiento antes de que se confirme.
  await prisma.apartadoSalida.update({ where: { id: a4.apartado.id }, data: { expiraEl: new Date(Date.now() - 1000) } });
  await prisma.tourBooking.create({ data: { confirmationNumber: `PRUEBA-ST-OTRO-${Date.now()}`, tourId: "viaje-cdmx-xilitla", tourName: "x", tourSlug: "viaje-cdmx-xilitla", tourDate: lleno.fechaSalida, adults: 1, totalAmount: 6000, customerName: "Otro", customerEmail: "otro@prueba.local", status: "paid", salidaId: lleno.id } });
  const r4 = await confirmarPasaje(p4, "webhook");
  ok(r4.estado === "creada" && r4.sobrecupo, "la reserva se guarda IGUAL, marcada con sobrecupo");
  ok(/SOBRECUPO/.test(JSON.stringify(r4.estado === "creada" ? r4.reserva.lineItems : "")), "y la nota «⚠️ SOBRECUPO» está en sus notas internas");

  // ── OXXO ──
  console.log("\n▶ OXXO (si está activo en el modo de prueba)");
  const so = await salidaDePrueba("2099-05-03", 0);
  const a5 = await apartarLugares(persona(so.id, 5));
  ok(a5.oxxo, "con lugar de sobra se ofrece OXXO");
  const pi5 = await crearCobroDelApartado(a5);
  if (!pi5.payment_method_types.includes("oxxo")) {
    console.log("  ⚠️  OXXO no está activo en el modo de prueba de la cuenta: se cobró con tarjeta. Actívalo y vuelve a correr.");
  } else {
    const f = await stripe.paymentIntents.confirm(pi5.id, {
      payment_method_data: { type: "oxxo", billing_details: { name: "Prueba OXXO", email: "succeed_immediately@example.com" } },
    });
    ok(f.status === "requires_action" && !!f.next_action?.oxxo_display_details, `la ficha se crea (${f.status})`);
    const ficha = await registrarFichaOxxo(f);
    ok(ficha.estado === "ficha" && ficha.apartado.expiraEl.getTime() > Date.now() + 20 * 3_600_000, "el apartado se alarga hasta que OXXO pueda confirmar");
    let pagadoOxxo = f;
    for (let i = 0; i < 20 && pagadoOxxo.status !== "succeeded"; i++) {
      await espera(2000);
      pagadoOxxo = await stripe.paymentIntents.retrieve(pi5.id);
    }
    ok(pagadoOxxo.status === "succeeded", `la ficha de prueba se paga sola (${pagadoOxxo.status})`);
    if (pagadoOxxo.status === "succeeded") {
      const r5 = await confirmarPasaje(pagadoOxxo, "webhook");
      ok(r5.estado === "creada", "y se vuelve reserva");
    }

    const a6 = await apartarLugares(persona(so.id, 6));
    const pi6 = await crearCobroDelApartado(a6);
    const f6 = await stripe.paymentIntents.confirm(pi6.id, {
      payment_method_data: { type: "oxxo", billing_details: { name: "Prueba OXXO vencida", email: "expire_immediately@example.com" } },
    });
    await registrarFichaOxxo(f6);
    let vencida = f6;
    for (let i = 0; i < 20 && vencida.status === "requires_action"; i++) {
      await espera(2000);
      vencida = await stripe.paymentIntents.retrieve(pi6.id);
    }
    // El webhook de una ficha vencida llega como payment_failed: lo que hace el sitio entonces.
    const solto = await soltarPorCobro(vencida);
    ok(solto, `ficha vencida (${vencida.status}): el lugar vuelve`);
  }

  // ── Por HTTP, contra un servidor local ──
  const URL_BASE = process.env.VIAJE_URL;
  if (URL_BASE) {
    console.log(`\n▶ HTTP contra ${URL_BASE}: 30 compradores por el último lugar`);
    const ultima = await salidaDePrueba("2099-05-04", 13);
    const antes = Date.now();
    const respuestas = await Promise.all(Array.from({ length: 30 }, (_, i) =>
      fetch(`${URL_BASE}/api/viaje-cdmx/apartar`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": `10.9.${Math.floor(i / 250)}.${i % 250}` },
        body: JSON.stringify({ salidaId: ultima.id, personas: 1, nombre: `Http ${i}`, email: `http${i}@example.com`, telefono: "4891234567", aceptaTerminos: true }),
      }).then((r) => r.status)));
    const c = respuestas.reduce<Record<number, number>>((m, x) => ({ ...m, [x]: (m[x] ?? 0) + 1 }), {});
    ok(c[200] === 1 && c[409] === 29, `1 pasa y 29 «sin lugar» (${JSON.stringify(c)})`);
    const pis = await stripe.paymentIntents.search({ query: `metadata['salidaId']:'${ultima.id}'` }).catch(() => null);
    if (pis) ok(pis.data.length === 1, `1 cobro en Stripe (${pis.data.length}) en ${Math.round((Date.now() - antes) / 1000)} s`);

    const secreto = process.env.STRIPE_WEBHOOK_SECRET;
    const h = await prisma.apartadoSalida.findFirst({ where: { salidaId: ultima.id, estado: "activo" } });
    if (secreto && h?.paymentIntentId) {
      console.log("\n▶ Webhook firmado + pantalla a la vez, y el webhook repetido 3 veces");
      const p = await stripe.paymentIntents.confirm(h.paymentIntentId, { payment_method: "pm_card_visa", return_url: "https://example.com" });
      const evento = JSON.stringify({ id: `evt_prueba_${Date.now()}`, object: "event", type: "payment_intent.succeeded", data: { object: p } });
      const firma = () => stripe.webhooks.generateTestHeaderString({ payload: evento, secret: secreto });
      const golpe = () => fetch(`${URL_BASE}/api/stripe-webhook`, { method: "POST", headers: { "Content-Type": "application/json", "stripe-signature": firma() }, body: evento }).then((r) => r.status);
      const conf = () => fetch(`${URL_BASE}/api/viaje-cdmx/confirmar`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paymentIntentId: p.id }) }).then((r) => r.status);
      const st = await Promise.all([golpe(), conf(), golpe(), golpe()]);
      ok(st.every((x) => x === 200), `todas responden 200 (${st.join(", ")})`);
      const n = await prisma.tourBooking.count({ where: { stripePaymentIntentId: p.id } });
      ok(n === 1, `1 sola reserva (${n})`);
      const malFirmado = await fetch(`${URL_BASE}/api/stripe-webhook`, { method: "POST", headers: { "Content-Type": "application/json", "stripe-signature": "t=1,v1=falsa" }, body: evento }).then((r) => r.status);
      ok(malFirmado === 400, `un webhook sin firma válida se rechaza (${malFirmado})`);
    }
  } else {
    console.log("\n(sin VIAJE_URL: la parte por HTTP no corrió)");
  }

  return fallas;
}
