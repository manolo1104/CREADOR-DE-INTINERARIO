// Pruebas SIN red ni API (16 nov 2026, «Tének»): etapas, seguimiento, el
// mensaje de pago único y los adjuntos. Corre con: node test-seguimiento.js
const assert = require("assert");
const { etapaDe } = require("./etapas");
const seguimiento = require("./seguimiento");
const { decidirSeguimiento, notaParaElModelo, textoPostViaje, PASOS_MS } = seguimiento;
const { mensajeDatosPago } = require("./payment");
const adjuntos = require("./adjuntos");

let fallas = 0;
function prueba(nombre, fn) {
  try { fn(); console.log(`  ✅ ${nombre}`); }
  catch (e) { fallas++; console.log(`  ❌ ${nombre}\n     ${e.message}`); }
}

const HORA = 3600 * 1000;
// Un martes a las 12:00 de México (18:00 UTC): en horario.
const MEDIODIA = Date.parse("2026-11-17T18:00:00Z");
const NOCHE = Date.parse("2026-11-18T04:00:00Z"); // 10 pm de México

function sesion(extra = {}) {
  return {
    phone: "x@c.us", history: [{ role: "user", content: "hola" }, { role: "assistant", content: "¡Hola!" }],
    botAt: MEDIODIA - 4 * HORA, clienteAt: MEDIODIA - 300 * HORA, locale: "es",
    ficha: { recorridos: [], consultados: [{ slug: "expedicion-tamul" }], fechasDichas: ["2026-11-28"], folioVigente: null },
    ...extra,
  };
}

console.log("\n🧭 Etapas\n");

prueba("sin datos es nuevo; con fecha, calificado; con precio consultado, propuesta", () => {
  assert.equal(etapaDe({ ficha: {} }), "nuevo");
  assert.equal(etapaDe({ ficha: { fechasDichas: ["2026-11-28"] } }), "calificado");
  assert.equal(etapaDe({ ficha: { consultados: [{}] } }), "propuesta");
});
prueba("con folio, cotizado; con datos de pago mandados, pago pendiente", () => {
  assert.equal(etapaDe({ ficha: { folioVigente: "COT-1" } }), "cotizado");
  assert.equal(etapaDe({ ficha: { folioVigente: "COT-1" }, pagoMandadoAt: 1 }), "pago_pendiente");
});
prueba("comprobante, confirmado y post-viaje", () => {
  assert.equal(etapaDe({ ficha: { folioVigente: "COT-1", comprobanteRecibido: true } }), "comprobante");
  const f = { pagoValidado: true, recorridos: [{ fecha: "2026-11-20" }] };
  assert.equal(etapaDe({ ficha: f }, new Date("2026-11-18T18:00:00Z")), "confirmado");
  assert.equal(etapaDe({ ficha: f }, new Date("2026-11-21T18:00:00Z")), "post_viaje");
});

console.log("\n🔔 Seguimiento\n");

prueba("a las 3 h sin respuesta, el primer recordatorio", () => {
  const d = decidirSeguimiento(sesion({ botAt: MEDIODIA - 3.1 * HORA }), { ahora: MEDIODIA });
  assert.deepEqual(d, { accion: "recordar", paso: 1, saltados: 0 });
});
prueba("antes de las 3 h, nada", () => {
  assert.equal(decidirSeguimiento(sesion({ botAt: MEDIODIA - 2 * HORA }), { ahora: MEDIODIA }).accion, "nada");
});
prueba("si el último mensaje es del cliente, nada (lo contesta el bot normal)", () => {
  assert.equal(decidirSeguimiento(sesion({ clienteAt: MEDIODIA - HORA }), { ahora: MEDIODIA }).accion, "nada");
});
prueba("fuera de horario (10 pm), nada", () => {
  assert.equal(decidirSeguimiento(sesion({ botAt: NOCHE - 4 * HORA, clienteAt: NOCHE - 5 * HORA }), { ahora: NOCHE }).motivo, "fuera de horario");
});
prueba("en pausa o escalado al equipo, nada", () => {
  assert.equal(decidirSeguimiento(sesion(), { ahora: MEDIODIA, pausa: true }).accion, "nada");
  assert.equal(decidirSeguimiento(sesion({ escalacion: { modo: "pasar" } }), { ahora: MEDIODIA }).accion, "nada");
});
prueba("si dijo que no, nada", () => {
  const s = sesion();
  s.history.push({ role: "user", content: "No, gracias, ya no me interesa" });
  s.history.push({ role: "assistant", content: "¡Claro!" });
  assert.equal(decidirSeguimiento(s, { ahora: MEDIODIA }).motivo, "dijo que no");
});
prueba("segundo a las 24 h y tercero a las 72 h, contados desde la base", () => {
  const base = MEDIODIA - 25 * HORA;
  const s = sesion({ botAt: MEDIODIA - 22 * HORA, seguimiento: { base, enviados: [base + 3 * HORA] } });
  assert.deepEqual(decidirSeguimiento(s, { ahora: MEDIODIA }), { accion: "recordar", paso: 2, saltados: 0 });
  const s3 = sesion({ botAt: MEDIODIA - 40 * HORA, seguimiento: { base: MEDIODIA - 73 * HORA, enviados: [1, 2].map((i) => MEDIODIA - 73 * HORA + i) } });
  assert.deepEqual(decidirSeguimiento(s3, { ahora: MEDIODIA }), { accion: "recordar", paso: 3, saltados: 0 });
});
prueba("después del tercero, ya no se escribe", () => {
  const base = MEDIODIA - 80 * HORA;
  const s = sesion({ botAt: MEDIODIA - 20 * HORA, seguimiento: { base, enviados: [base + 1, base + 2, base + 3] } });
  assert.equal(decidirSeguimiento(s, { ahora: MEDIODIA }).motivo, "ya van los 3");
});
prueba("un día antes de que venza la cotización: «vence mañana», aunque ya salieron los 3", () => {
  const base = MEDIODIA - 140 * HORA;
  const s = sesion({
    // revisadoPagoAt: la revisión de la liga (cada 15 min) ya se hizo en este tick.
    botAt: MEDIODIA - 70 * HORA, seguimiento: { base, enviados: [base + 1, base + 2, base + 3], revisadoPagoAt: MEDIODIA },
    ficha: { recorridos: [{ slug: "expedicion-tamul", fecha: "2026-12-19" }], folioVigente: "COT-1", fechasDichas: [] },
    venceCotizacion: { folio: "COT-1", venceEl: "2026-11-18" },
  });
  assert.deepEqual(decidirSeguimiento(s, { ahora: MEDIODIA }), { accion: "vence_manana", folio: "COT-1", venceEl: "2026-11-18" });
  s.seguimiento.venceAvisado = "COT-1";
  assert.equal(decidirSeguimiento(s, { ahora: MEDIODIA }).accion, "nada", "solo una vez por folio");
  const otroDia = sesion({ ficha: s.ficha, venceCotizacion: { folio: "COT-1", venceEl: "2026-11-20" } });
  assert.notEqual(decidirSeguimiento(otroDia, { ahora: MEDIODIA }).accion, "vence_manana", "faltan 3 días: todavía no");
});
prueba("vigencia corta (24 h / 72 h): sin recordatorios fuera de la vigencia, «vence hoy» y nada al vencer", () => {
  const ficha = { recorridos: [{ slug: "expedicion-tamul", fecha: "2026-11-20" }], folioVigente: "COT-2", fechasDichas: [] };
  const seg = { revisadoPagoAt: MEDIODIA };
  // Vence HOY (24 h) y ya pasaron 6 h desde nuestro último mensaje: «vence hoy».
  const hoy = sesion({ botAt: MEDIODIA - 7 * HORA, ficha, seguimiento: { ...seg }, venceCotizacion: { folio: "COT-2", venceEl: "2026-11-17" } });
  assert.deepEqual(decidirSeguimiento(hoy, { ahora: MEDIODIA }), { accion: "vence_manana", folio: "COT-2", venceEl: "2026-11-17" });
  // Menos de 6 h desde nuestro último mensaje: todavía no (como el correo).
  const pronto = sesion({ botAt: MEDIODIA - 2 * HORA, ficha, seguimiento: { ...seg }, venceCotizacion: { folio: "COT-2", venceEl: "2026-11-17" } });
  assert.notEqual(decidirSeguimiento(pronto, { ahora: MEDIODIA }).accion, "vence_manana");
  // Ya se avisó: no salen más recordatorios.
  const avisado = sesion({ botAt: MEDIODIA - 30 * HORA, ficha, seguimiento: { ...seg, venceAvisado: "COT-2" }, venceCotizacion: { folio: "COT-2", venceEl: "2026-11-18" } });
  assert.equal(decidirSeguimiento(avisado, { ahora: MEDIODIA }).motivo, "ya se avisó que vence");
  // Ya venció: nada.
  const vencida = sesion({ botAt: MEDIODIA - 30 * HORA, ficha, seguimiento: { ...seg }, venceCotizacion: { folio: "COT-2", venceEl: "2026-11-16" } });
  assert.equal(decidirSeguimiento(vencida, { ahora: MEDIODIA }).motivo, "la cotización ya venció");
});
prueba("el de los 3 días ya no se despide (la cotización sigue viva)", () => {
  const n = seguimiento.notaParaElModelo(3, sesion());
  assert.ok(!/último recordatorio/i.test(n));
  assert.match(seguimiento.notaVenceManana(sesion(), { folio: "COT-1", venceEl: "2026-11-18" }), /vence MAÑANA/);
});
prueba("post-viaje en singular para quien viajó solo", () => {
  const solo = seguimiento.textoPostViaje({ locale: "es", nombre: "Ana", ficha: { recorridos: [{ nombre: "Expedición Tamul", adultos: 1 }] } });
  assert.match(solo, /¿Cómo te fue/);
  const dos = seguimiento.textoPostViaje({ locale: "es", nombre: "Ana", ficha: { recorridos: [{ nombre: "Expedición Tamul", adultos: 2 }] } });
  assert.match(dos, /¿Cómo les fue/);
});
prueba("con el bot apagado varios días, sale UNO (el más reciente) y cuenta los brincados", () => {
  const s = sesion({ botAt: MEDIODIA - 80 * HORA });
  assert.deepEqual(decidirSeguimiento(s, { ahora: MEDIODIA }), { accion: "recordar", paso: 3, saltados: 2 });
});
prueba("la hora acordada manda sobre el calendario", () => {
  const s = sesion({ seguimiento: { agendado: { at: MEDIODIA - 60 * 1000, creado: MEDIODIA - 20 * HORA } } });
  assert.equal(decidirSeguimiento(s, { ahora: MEDIODIA }).accion, "agendado");
  const t = sesion({ seguimiento: { agendado: { at: MEDIODIA + HORA, creado: MEDIODIA - HORA } } });
  assert.equal(decidirSeguimiento(t, { ahora: MEDIODIA }).motivo, "hay uno agendado");
});
prueba("con cotización viva, primero revisa si ya pagó con la liga (cada 15 min)", () => {
  const s = sesion({ ficha: { folioVigente: "COT-9" } });
  assert.deepEqual(decidirSeguimiento(s, { ahora: MEDIODIA }), { accion: "revisar_pago", folio: "COT-9" });
  s.seguimiento = { revisadoPagoAt: MEDIODIA - 5 * 60 * 1000 };
  assert.equal(decidirSeguimiento(s, { ahora: MEDIODIA }).accion, "recordar");
});
prueba("confirmado no recibe recordatorios; post-viaje al día siguiente del tour, una vez", () => {
  const f = { pagoValidado: true, reservaFolio: "HP-M-1", recorridos: [{ fecha: "2026-11-16", nombre: "Expedición Tamul — Tamul" }] };
  assert.equal(decidirSeguimiento(sesion({ ficha: f }), { ahora: Date.parse("2026-11-16T18:00:00Z") }).accion, "nada");
  assert.deepEqual(decidirSeguimiento(sesion({ ficha: f }), { ahora: MEDIODIA }), { accion: "post_viaje", folio: "HP-M-1" });
  // Con solo la cotización (el pago lo registró Erick en el panel): sale el folio para verificarlo con el sitio.
  const cot = { folioVigente: "COT-9", recorridos: [{ fecha: "2026-11-16", nombre: "Expedición Tamul" }] };
  assert.deepEqual(decidirSeguimiento(sesion({ ficha: cot }), { ahora: MEDIODIA }), { accion: "post_viaje", folio: "COT-9" });
  assert.equal(decidirSeguimiento(sesion({ ficha: f, seguimiento: { postViajeAt: 1 } }), { ahora: MEDIODIA }).accion, "nada");
});
prueba("revisión: chat de hace 20 días no recibe recordatorio (plática vieja)", () => {
  const s = sesion({ botAt: MEDIODIA - 20 * 24 * HORA, clienteAt: MEDIODIA - 21 * 24 * HORA });
  assert.equal(decidirSeguimiento(s, { ahora: MEDIODIA }).motivo, "plática vieja");
});
prueba("revisión: si el viaje ya pasó, no se recuerda la cotización", () => {
  const s = sesion({ ficha: { consultados: [{}], fechasDichas: ["2026-11-14"] } });
  assert.equal(decidirSeguimiento(s, { ahora: MEDIODIA }).motivo, "el viaje ya pasó");
});
prueba("revisión: plática de antes de Tének (sin clienteAt) no recibe recordatorio", () => {
  const s = sesion({ clienteAt: undefined });
  assert.equal(decidirSeguimiento(s, { ahora: MEDIODIA }).motivo, "plática anterior al seguimiento");
});
prueba("revisión: si Erick escribió a mano o se pasó al equipo, el bot no escribe encima", () => {
  assert.equal(decidirSeguimiento(sesion({ humanoAt: MEDIODIA - 2 * HORA }), { ahora: MEDIODIA }).motivo, "lo atiende el equipo");
  assert.equal(decidirSeguimiento(sesion({ escaladoAt: MEDIODIA - 3.5 * HORA }), { ahora: MEDIODIA }).motivo, "lo atiende el equipo");
  // Si el cliente volvió a escribir después y el bot contestó, el seguimiento sigue.
  const s = sesion({ humanoAt: MEDIODIA - 10 * HORA, clienteAt: MEDIODIA - 5 * HORA, botAt: MEDIODIA - 4 * HORA });
  assert.equal(decidirSeguimiento(s, { ahora: MEDIODIA }).accion, "recordar");
});
prueba("revisión: la hora acordada también vale si apenas está calificado", () => {
  const s = sesion({ ficha: { fechasDichas: ["2026-11-28"] }, seguimiento: { agendado: { at: MEDIODIA - 60000, creado: MEDIODIA - 5 * HORA } } });
  assert.equal(decidirSeguimiento(s, { ahora: MEDIODIA }).accion, "agendado");
});
prueba("la nota para el modelo pide algo concreto y prohíbe el «¿qué te pareció?»", () => {
  const n = notaParaElModelo(2, sesion());
  assert.ok(/^\[sistema\] SEGUIMIENTO/.test(n) && /qué te pareció/.test(n) && /un día/.test(n));
});
prueba("post-viaje con nombre y tour corto", () => {
  const t = textoPostViaje({ nombre: "Ana López", locale: "es", ficha: { recorridos: [{ nombre: "Expedición Tamul — Tamul, Cueva del Agua" }] } });
  assert.equal(t, "¡Hola Ana! 🌿 ¿Cómo les fue en Expedición Tamul? Nos encantaría saber cómo la pasaron.");
});
prueba("los pasos son 3 h, 24 h y 72 h (decisión de Manolo)", () => {
  assert.deepEqual(PASOS_MS.map((x) => x / HORA), [3, 24, 72]);
});

console.log("\n💳 Mensaje de pago único\n");

prueba("banco + OXXO + liga de tarjeta juntos, con monto, folio y la espera del comprobante", () => {
  const m = mensajeDatosPago({ folio: "COT-5", monto: 930, locale: "es", liga: "https://buy.stripe.com/x" });
  assert.ok(/CLABE/.test(m) && /OXXO/.test(m) && /buy\.stripe\.com\/x/.test(m) && /\$930 MXN/.test(m) && /COT-5/.test(m));
  assert.ok(/sin comisión/.test(m) && /Quedo en espera de tu comprobante/.test(m));
});
prueba("una liga por persona, solo las que faltan", () => {
  const m = mensajeDatosPago({ folio: "COT-5", locale: "es", ligas: [
    { parte: 1, de: 2, url: "https://buy.stripe.com/a", monto: 465, pagada: true },
    { parte: 2, de: 2, url: "https://buy.stripe.com/b", monto: 465 },
  ] });
  assert.ok(!m.includes("stripe.com/a") && m.includes("Parte 2/2 · $465 MXN\nhttps://buy.stripe.com/b"));
});
prueba("fuera de producción usa datos de mentira (nunca los reales en el repo)", () => {
  assert.ok(mensajeDatosPago({ folio: "COT-5" }).includes("000000000000000000"));
});

console.log("\n📎 Adjuntos\n");

prueba("fotos primero, PDF después; sin repetir; la cola se vacía al tomarla", () => {
  adjuntos.encolar("c1", { tipo: "pdf", folio: "COT-1", nombre: "a.pdf" });
  adjuntos.encolar("c1", { tipo: "foto", url: "u1" });
  adjuntos.encolar("c1", { tipo: "foto", url: "u1" });
  const t = adjuntos.tomar("c1");
  assert.deepEqual(t.map((a) => a.tipo), ["foto", "pdf"]);
  assert.equal(adjuntos.tomar("c1").length, 0);
});
prueba("nombre del archivo según folio e idioma", () => {
  assert.equal(adjuntos.nombrePdf("cot-12"), "Cotización COT-12.pdf");
  assert.equal(adjuntos.nombrePdf("HP-M-3", "en"), "Booking confirmation HP-M-3.pdf");
});

console.log("\n🔗 Enlaces intactos (el «_» se borraba)\n");
{
  process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "x";
  const { sanitizeLinks, toWhatsAppFormat } = require("./agent");
  const f = (t) => sanitizeLinks(toWhatsAppFormat(t));
  prueba("el enlace de reseñas de Google conserva su «_»", () => {
    assert.equal(f("Tu reseña: https://g.page/r/CZg8hdQa_GI9EBM/review"), "Tu reseña: https://g.page/r/CZg8hdQa_GI9EBM/review");
  });
  prueba("asteriscos y guiones pegados al enlace sí se quitan", () => {
    assert.equal(f("*https://buy.stripe.com/test_COT-1*"), "https://buy.stripe.com/test_COT-1");
    assert.equal(f("_https://x.com/a_b_."), "https://x.com/a_b.");
  });
  prueba("[texto](url) queda como «texto: url» con su «_»", () => {
    assert.equal(f("[pago](https://buy.stripe.com/abc_d)"), "pago: https://buy.stripe.com/abc_d");
  });
}

console.log("\n🔎 Lectura del comprobante (aviso al dueño)\n");
const { textoLecturaComprobante } = require("./medios");

prueba("monto que cuadra y concepto con el folio", () => {
  const t = textoLecturaComprobante({ esComprobante: true, monto: 930, banco: "BBVA", concepto: "COT-1234" }, { folio: "COT-1234", esperado: 930 });
  assert.ok(/\$930/.test(t) && /cuadra/.test(t) && !/no trae el folio/.test(t) && /confírmalo en tu banco/.test(t));
});
prueba("monto distinto y concepto sin folio: los dos avisos", () => {
  const t = textoLecturaComprobante({ esComprobante: true, monto: 500, concepto: "tour" }, { folio: "COT-1234", esperado: 930 });
  assert.ok(/se esperaba \$930/.test(t) && /no trae el folio/.test(t));
});
prueba("si no parece comprobante lo dice; sin lectura, nada", () => {
  assert.ok(/NO parece un comprobante/.test(textoLecturaComprobante({ esComprobante: false }, { folio: "COT-1" })));
  assert.equal(textoLecturaComprobante(null, {}), null);
});

console.log(fallas ? `\n❌ ${fallas} fallaron\n` : "\n✅ Todas pasaron\n");
process.exit(fallas ? 1 : 0);
