// Pruebas GRATIS (sin modelo ni WhatsApp) de a quién le habla el bot
// (18 nov 2026, Manolo: «que el bot solo responda mensajes de chats no
// registrados»).   node test-guardados.js
const assert = require("assert");
const g = require("./guardados");
let ok = 0;
const prueba = (nombre, fn) => { fn(); ok++; console.log(`✓ ${nombre}`); };

prueba("RESPOND_MODE: por omisión y con cualquier valor raro es «strangers»; solo «all» lo apaga", () => {
  assert.strictEqual(g.modoRespuesta(undefined), "strangers");
  assert.strictEqual(g.modoRespuesta(""), "strangers");
  assert.strictEqual(g.modoRespuesta("strangers"), "strangers");
  assert.strictEqual(g.modoRespuesta("todos"), "strangers", "un valor mal escrito no abre la puerta a los guardados");
  assert.strictEqual(g.modoRespuesta(" ALL "), "all");
});

prueba("chat @c.us: manda lo que dice su contacto", () => {
  assert.strictEqual(g.decidirGuardado({ esLid: false, delChat: true }), true);
  assert.strictEqual(g.decidirGuardado({ esLid: false, delChat: false }), false);
  assert.strictEqual(g.decidirGuardado({ esLid: false, delChat: null }), null, "WhatsApp no contestó");
});

prueba("chat @lid: «no guardado» del chat no basta; manda el contacto de su teléfono real", () => {
  assert.strictEqual(g.decidirGuardado({ esLid: true, delChat: false, delTelefono: true }), true, "el número sí está en la agenda");
  assert.strictEqual(g.decidirGuardado({ esLid: true, delChat: false, delTelefono: false }), false);
  assert.strictEqual(g.decidirGuardado({ esLid: true, delChat: false, delTelefono: null }), null, "sin teléfono resuelto no se sabe");
  assert.strictEqual(g.decidirGuardado({ esLid: true, delChat: true, delTelefono: null }), true, "si el chat dice guardado, es guardado");
  assert.strictEqual(g.decidirGuardado({ esLid: true }), null);
});

prueba("mensaje que llega: no guardado → contesta", () => {
  assert.strictEqual(g.decidirEntrante({ modo: "strangers", guardado: false }), "contestar");
});

prueba("mensaje que llega: guardado → NO contesta, aunque el bot ya platicara con él (se avisa una vez)", () => {
  assert.strictEqual(g.decidirEntrante({ modo: "strangers", guardado: true }), "ignorar");
  assert.strictEqual(g.decidirEntrante({ modo: "strangers", guardado: true, platicabaConElBot: true }), "ignorar_y_avisar");
  assert.strictEqual(g.decidirEntrante({ modo: "strangers", guardado: true, platicabaConElBot: true, yaAvisado: true }), "ignorar", "el aviso al dueño sale una sola vez");
});

prueba("mensaje que llega y no se pudo saber si está guardado → contesta (prospecto nuevo)", () => {
  assert.strictEqual(g.decidirEntrante({ modo: "strangers", guardado: null }), "contestar");
});

prueba("números de prueba (ALWAYS_RESPOND) y RESPOND_MODE=all sí contestan a guardados", () => {
  assert.strictEqual(g.decidirEntrante({ modo: "strangers", guardado: true, siempre: true }), "contestar");
  assert.strictEqual(g.decidirEntrante({ modo: "all", guardado: true, platicabaConElBot: true }), "contestar");
});

prueba("lo que el bot manda por su cuenta: guardado → no se manda; no guardado → sí", () => {
  assert.strictEqual(g.decidirPropio({ modo: "strangers", guardado: true }), "no_mandar");
  assert.strictEqual(g.decidirPropio({ modo: "strangers", guardado: false }), "mandar");
});

prueba("lo que el bot manda por su cuenta y no se pudo saber → espera a la siguiente vuelta (no arriesga)", () => {
  assert.strictEqual(g.decidirPropio({ modo: "strangers", guardado: null }), "esperar");
});

prueba("por su cuenta: números de prueba y RESPOND_MODE=all sí mandan", () => {
  assert.strictEqual(g.decidirPropio({ modo: "strangers", guardado: true, siempre: true }), "mandar");
  assert.strictEqual(g.decidirPropio({ modo: "all", guardado: null }), "mandar");
});

prueba("«solo conectar» se prende solo con BOT_SOLO_CONECTAR=1", () => {
  assert.strictEqual(g.soloConectar("1"), true);
  assert.strictEqual(g.soloConectar(" 1 "), true);
  assert.strictEqual(g.soloConectar("0"), false);
  assert.strictEqual(g.soloConectar(""), false);
  assert.strictEqual(g.soloConectar(undefined), false);
  assert.strictEqual(g.soloConectar("true"), false, "solo 1, para no prenderlo por error");
});

prueba("en «solo conectar» solo pasan /status y /help (o /ayuda)", () => {
  assert.strictEqual(g.comandoPermitidoSoloConectar("/status"), true);
  assert.strictEqual(g.comandoPermitidoSoloConectar("/STATUS"), true);
  assert.strictEqual(g.comandoPermitidoSoloConectar("/help"), true);
  assert.strictEqual(g.comandoPermitidoSoloConectar("/ayuda"), true);
  assert.strictEqual(g.comandoPermitidoSoloConectar("/confirma COT-ABC 930"), false, "nada de confirmar pagos");
  assert.strictEqual(g.comandoPermitidoSoloConectar("/reanuda 4891234567"), false);
  assert.strictEqual(g.comandoPermitidoSoloConectar("/statusx"), false);
  assert.strictEqual(g.comandoPermitidoSoloConectar(""), false);
});

console.log(`\n${ok} pruebas OK`);
