// Pruebas GRATIS (sin modelo) de la pausa por mensaje del equipo (18 nov 2026).
//   node test-pausa-humano.js
const assert = require("assert");
const ph = require("./pausaHumano");
let ok = 0;
const prueba = (nombre, fn) => { fn(); ok++; console.log(`✓ ${nombre}`); };

prueba("la pausa por defecto es de 5 minutos y HUMAN_TAKEOVER_MS la cambia", () => {
  assert.strictEqual(ph.msPausaHumano({}), 5 * 60 * 1000);
  assert.strictEqual(ph.msPausaHumano({ HUMAN_TAKEOVER_MS: "60000" }), 60000);
  assert.strictEqual(ph.msPausaHumano({ HUMAN_TAKEOVER_MS: "nada" }), 5 * 60 * 1000);
});

prueba("pendiente = lo último del cliente que nadie contestó", () => {
  const h = [
    { role: "user", content: "Hola, ¿precio de Tamul?" },
    { role: "assistant", content: "¡Hola! Soy Tének…\nHola, soy Erick, te ayudo yo" },
    { role: "user", content: "Somos 4 el sábado\n¿pasan por nosotros al hotel?" },
  ];
  assert.strictEqual(ph.pendienteDelCliente(h), "Somos 4 el sábado\n¿pasan por nosotros al hotel?");
});

prueba("si lo último lo dijo el equipo, no hay nada pendiente (el bot no habla)", () => {
  const h = [{ role: "user", content: "¿Tienen lugar el domingo?" }, { role: "assistant", content: "Sí, te mando la cotización" }];
  assert.strictEqual(ph.pendienteDelCliente(h), null);
});

prueba("las notas [sistema] no cuentan como algo que contestar", () => {
  const h = [{ role: "assistant", content: "Listo" }, { role: "user", content: "[sistema] El equipo atendió este chat en persona." }];
  assert.strictEqual(ph.pendienteDelCliente(h), null);
  const h2 = [{ role: "assistant", content: "Listo" }, { role: "user", content: "[sistema] nota\n¿y el anticipo?" }];
  assert.strictEqual(ph.pendienteDelCliente(h2), "¿y el anticipo?");
});

prueba("solo se retoma sola la pausa que puso una persona, cuando ya venció", () => {
  const ahora = 1_000_000;
  assert.strictEqual(ph.pausaHumanaVencida({ modo: "humano", hasta: ahora - 1 }, ahora), true);
  assert.strictEqual(ph.pausaHumanaVencida({ modo: "humano", hasta: ahora + 60_000 }, ahora), false, "todavía no pasan los 5 min");
  assert.strictEqual(ph.pausaHumanaVencida({ modo: "escalacion", hasta: ahora - 1 }, ahora), false, "una escalación no");
  assert.strictEqual(ph.pausaHumanaVencida({ modo: "falla", hasta: ahora - 1 }, ahora), false, "una falla no");
  assert.strictEqual(ph.pausaHumanaVencida({ modo: "escalacion", humanoAt: 5, hasta: ahora - 1 }, ahora), true, "escalación donde ya escribió el equipo: sí");
  assert.strictEqual(ph.pausaHumanaVencida({ modo: "humano", hasta: null }, ahora), false, "«hasta /reanuda» nunca");
});

prueba("el turno para retomar trae la nota y lo pendiente del cliente", () => {
  const t = ph.textoParaRetomar("¿y el anticipo?", { desdeHora: "10:05", minutos: 5 });
  assert.ok(t.startsWith("[sistema]"));
  assert.ok(t.includes("10:05") && t.includes("5 minutos"));
  assert.ok(t.trim().endsWith("¿y el anticipo?"));
});

console.log(`\n${ok} pruebas OK`);
