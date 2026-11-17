// Prueba del historial, SIN red:
//  · sanearHistorial: que un error a media herramienta no deje el chat muerto;
//  · el recorte (sessions.recortarHistorial): cuenta mensajes del CLIENTE y
//    siempre deja como primer mensaje un texto suyo. 🔴 El recorte de antes
//    (40 mensajes en total) podía dejar al principio un resultado de
//    herramienta sin su llamada, y la API rechazaba la plática con un 400;
//  · limpiarTurnosCerrados: sin bloques de razonamiento ni texto que el
//    cliente nunca vio en los turnos ya cerrados.
const assert = require("assert");
const { sanearHistorial, limpiarTurnosCerrados } = require("./agent");
const {
  recortarHistorial, esTextoDelCliente, getSession, pushHistory, clearSession,
  MAX_MENSAJES_CLIENTE, DEJA_MENSAJES_CLIENTE,
} = require("./sessions");

let fallas = 0;
function prueba(nombre, fn) {
  try { fn(); console.log(`  ✅ ${nombre}`); }
  catch (e) { fallas++; console.log(`  ❌ ${nombre}\n     ${e.message}`); }
}

const u = (t) => ({ role: "user", content: t });
const a = (t) => ({ role: "assistant", content: t });
const toolUse = (id) => a([{ type: "tool_use", id, name: "obtener_tour", input: {} }]);
const toolRes = (id) => u([{ type: "tool_result", tool_use_id: id, content: "{}" }]);

/** Lo mismo que valida la API: ningún tool_use sin su tool_result y viceversa. */
function esValido(h) {
  if (h.length && h[0].role !== "user") return "empieza con assistant";
  for (let i = 0; i < h.length; i++) {
    const m = h[i];
    const tieneUse = Array.isArray(m.content) && m.content.some((b) => b.type === "tool_use");
    const tieneRes = Array.isArray(m.content) && m.content.some((b) => b.type === "tool_result");
    if (tieneUse) {
      const sig = h[i + 1];
      if (!sig || sig.role !== "user" || !sig.content.some((b) => b.type === "tool_result")) {
        return `tool_use en la posición ${i} sin su tool_result`;
      }
    }
    if (tieneRes) {
      const ant = h[i - 1];
      if (!ant || ant.role !== "assistant" || !ant.content.some((b) => b.type === "tool_use")) {
        return `tool_result en la posición ${i} sin su tool_use`;
      }
    }
  }
  return null;
}

console.log("\n🧹 Reparación del historial\n");

prueba("un historial sano no se toca", () => {
  const h = [u("hola"), a("¿qué fechas?"), u("el sábado"), toolUse("t1"), toolRes("t1"), a("va")];
  const s = { phone: "x@c.us", history: h.slice() };
  sanearHistorial(s);
  assert.equal(s.history.length, 6);
  assert.equal(esValido(s.history), null);
});

prueba("tool_use huérfano (la API tronó a media herramienta) se tira", () => {
  const s = { phone: "x@c.us", history: [
    u("hola"), a("¿fechas?"), u("sábado"),
    toolUse("t1"), toolRes("t1"),
    toolUse("t2"),          // ← aquí tronó, nunca llegó el resultado
    u("¿hola? sigues ahí"), // ← el cliente vuelve a escribir
  ]};
  sanearHistorial(s);
  const err = esValido(s.history);
  assert.equal(err, null, `sigue inválido: ${err}`);
  assert.equal(s.history[s.history.length - 1].content, "¿hola? sigues ahí", "se perdió el mensaje del cliente");
});

prueba("tool_result huérfano (el recorte cortó la pareja) se tira", () => {
  const s = { phone: "x@c.us", history: [
    toolRes("t0"),          // ← el tool_use quedó fuera de un recorte (sesión de antes)
    a("listo"), u("gracias"),
  ]};
  sanearHistorial(s);
  const err = esValido(s.history);
  assert.equal(err, null, `sigue inválido: ${err}`);
  assert.equal(s.history[0].role, "user");
});

prueba("varios tool_use huérfanos seguidos", () => {
  const s = { phone: "x@c.us", history: [u("hola"), toolUse("a"), toolUse("b"), toolUse("c"), u("¿me contestas?")] };
  sanearHistorial(s);
  assert.equal(esValido(s.history), null);
  assert.deepEqual(s.history.map((m) => m.role), ["user", "user"]);
});

prueba("historial vacío no truena", () => {
  const s = { phone: "x@c.us", history: [] };
  sanearHistorial(s);
  assert.deepEqual(s.history, []);
});

prueba("no se pierden los turnos de texto normales", () => {
  const s = { phone: "x@c.us", history: [u("hola"), a("hey"), u("somos 4"), a("va"), toolUse("z")] };
  sanearHistorial(s);
  assert.equal(s.history.length, 4);
  assert.deepEqual(s.history.map((m) => m.content), ["hola", "hey", "somos 4", "va"]);
});

// El tic de Haiku: cierra el turno con la respuesta vacía. Ese turno en el
// historial es un 400 de la API y el chat queda muerto para siempre.
prueba("turno vacío (el modelo no contestó nada) se tira", () => {
  const s = { phone: "x@c.us", history: [u("hola"), { role: "assistant", content: [] }, u("¿bueno?")] };
  sanearHistorial(s);
  assert.equal(s.history.length, 2);
  assert.deepEqual(s.history.map((m) => m.content), ["hola", "¿bueno?"]);
});


// ── El recorte (sessions.recortarHistorial) ─────────────────
console.log("\n✂️  Recorte del historial (cuenta mensajes del cliente)\n");

/** Una plática de `n` mensajes del cliente; cada uno con una herramienta (2 mensajes) y la respuesta. */
function platica(n) {
  const h = [];
  for (let i = 1; i <= n; i++) h.push(u(`mensaje ${i}`), toolUse(`t${i}`), toolRes(`t${i}`), a(`respuesta ${i}`));
  return h;
}
const delCliente = (h) => h.filter(esTextoDelCliente).length;

prueba("debajo del tope no se toca (el MISMO arreglo: no rompe la caché)", () => {
  const h = platica(30);
  assert.equal(recortarHistorial(h, { max: 30, deja: 20 }), h);
});

prueba("pasando de 30 mensajes del cliente deja los últimos 20, y empieza en un texto suyo", () => {
  const h = recortarHistorial(platica(31), { max: 30, deja: 20 });
  assert.equal(delCliente(h), 20);
  assert.equal(h[0].content, "mensaje 12");
  assert.ok(esTextoDelCliente(h[0]), "el primero no es un texto del cliente");
  assert.equal(esValido(h), null);
});

prueba("🔴 las herramientas ya no cuentan: 25 mensajes del cliente con 1 herramienta c/u son 100 mensajes y no se cortan (antes, a 40)", () => {
  const h = platica(25); // 100 mensajes en total, 25 del cliente
  assert.equal(recortarHistorial(h, { max: 30, deja: 20 }).length, 100);
});

prueba("🔴 el caso del 400: un resultado de herramienta huérfano al principio se suelta", () => {
  const h = recortarHistorial([toolRes("t0"), a("listo"), u("hola"), a("hey")], { max: 30, deja: 20 });
  assert.equal(h[0].content, "hola");
  assert.equal(esValido(h), null);
});

prueba("si el corte caería a media herramienta, cae en el siguiente texto del cliente", () => {
  // Turnos sueltos del cliente entre herramientas: ningún corte separa una pareja.
  const h = [];
  for (let i = 1; i <= 35; i++) {
    h.push(u(`m${i}`), toolUse(`a${i}`), toolRes(`a${i}`), toolUse(`b${i}`), toolRes(`b${i}`), a(`r${i}`));
  }
  const r = recortarHistorial(h, { max: 30, deja: 20 });
  assert.ok(esTextoDelCliente(r[0]));
  assert.equal(esValido(r), null);
  assert.equal(delCliente(r), 20);
});

prueba("un mensaje del cliente en bloques de texto también cuenta como suyo", () => {
  const bloques = { role: "user", content: [{ type: "text", text: "hola en bloques" }] };
  assert.equal(esTextoDelCliente(bloques), true);
  assert.equal(esTextoDelCliente(toolRes("x")), false, "un tool_result NO es del cliente");
  assert.equal(esTextoDelCliente(a("hola")), false);
  const r = recortarHistorial([a("línea del equipo"), bloques, a("hey")], { max: 30, deja: 20 });
  assert.equal(r[0], bloques, "lo de antes del primer mensaje del cliente se suelta");
});

prueba("sin un solo mensaje del cliente no se toca (no hay dónde cortar)", () => {
  const h = [a("línea del equipo")];
  assert.equal(recortarHistorial(h, { max: 30, deja: 20 }), h);
});

prueba("red de seguridad por TAMAÑO: suelta lo más viejo, nunca el último mensaje del cliente", () => {
  const grande = "x".repeat(5000);
  const h = [];
  for (let i = 1; i <= 10; i++) {
    h.push(u(`m${i}`), toolUse(`t${i}`), u([{ type: "tool_result", tool_use_id: `t${i}`, content: grande }]), a(`r${i}`));
  }
  const r = recortarHistorial(h, { max: 30, deja: 20, maxCaracteres: 20000 });
  assert.ok(JSON.stringify(r).length <= 20000, `quedó de ${JSON.stringify(r).length} caracteres`);
  assert.ok(esTextoDelCliente(r[0]));
  assert.equal(esValido(r), null);
  assert.equal(r[r.length - 4].content, "m10", "se perdió el último mensaje del cliente");
});

prueba(`pushHistory recorta en BLOQUES: al pasar de ${MAX_MENSAJES_CLIENTE} deja ${DEJA_MENSAJES_CLIENTE} y no vuelve a cortar en el siguiente`, () => {
  const chat = "recorte-historial@c.us";
  clearSession(chat);
  for (let i = 1; i <= MAX_MENSAJES_CLIENTE; i++) { pushHistory(chat, "user", `m${i}`); pushHistory(chat, "assistant", `r${i}`); }
  assert.equal(delCliente(getSession(chat).history), MAX_MENSAJES_CLIENTE, "cortó antes del tope");
  pushHistory(chat, "user", `m${MAX_MENSAJES_CLIENTE + 1}`);
  assert.equal(delCliente(getSession(chat).history), DEJA_MENSAJES_CLIENTE);
  assert.equal(getSession(chat).history[0].role, "user");
  pushHistory(chat, "assistant", "ok");
  pushHistory(chat, "user", "otro más");
  assert.equal(delCliente(getSession(chat).history), DEJA_MENSAJES_CLIENTE + 1, "volvió a cortar en el mensaje siguiente (rompe la caché)");
  clearSession(chat);
});

// ── Razonamiento y texto que el cliente no vio ──────────────
console.log("\n💭 Turnos cerrados: sin razonamiento ni texto entre herramientas\n");

const pensar = (t = "lo pienso") => ({ type: "thinking", thinking: t, signature: "firma" });
const tapado = { type: "redacted_thinking", data: "xxx" };
const texto = (t) => ({ type: "text", text: t });
const usar = (id) => ({ type: "tool_use", id, name: "obtener_tour", input: {} });
const tieneRazonamiento = (h) => h.some((m) => Array.isArray(m.content) && m.content.some((b) => b && (b.type === "thinking" || b.type === "redacted_thinking")));

prueba("un historial sin nada que quitar se devuelve tal cual (el MISMO arreglo)", () => {
  const h = [u("hola"), a("hey"), u("sábado"), toolUse("t1"), toolRes("t1"), a("va")];
  assert.equal(limpiarTurnosCerrados(h), h);
});

prueba("los bloques thinking / redacted_thinking de un turno cerrado se quitan; el texto se queda", () => {
  const h = limpiarTurnosCerrados([u("hola"), a([pensar(), tapado, texto("¡Hola! ¿Para qué fecha?")])]);
  assert.deepEqual(h[1].content, [texto("¡Hola! ¿Para qué fecha?")]);
  assert.ok(!tieneRazonamiento(h));
});

prueba("🔴 turno de herramientas: solo las llamadas (el texto entre herramientas nunca le llegó al cliente)", () => {
  const h = limpiarTurnosCerrados([
    u("¿cuánto el Tamul?"),
    a([pensar(), texto("Como les dije, déjame revisar…"), usar("t1")]),
    u([{ type: "tool_result", tool_use_id: "t1", content: "{}" }]),
    a([texto("Son $2,900 para 2.")]),
  ]);
  assert.deepEqual(h[1].content, [usar("t1")]);
  assert.equal(esValido(h), null);
  assert.ok(!JSON.stringify(h).includes("Como les dije"), "el «como les dije» que el cliente nunca leyó sigue en el historial");
});

prueba("un turno que solo tenía razonamiento se quita (vacío = 400)", () => {
  const h = limpiarTurnosCerrados([u("hola"), a([pensar()]), u("¿bueno?")]);
  assert.deepEqual(h.map((m) => m.role), ["user", "user"]);
});

prueba("sanearHistorial deja el historial válido y sin razonamiento", () => {
  const s = { phone: "x@c.us", history: [
    u("hola"), a([pensar(), texto("¿fechas?")]),
    u("el sábado"), a([pensar(), usar("t1")]), toolRes("t1"),
    a([tapado, texto("Listo")]),
  ]};
  sanearHistorial(s);
  assert.equal(esValido(s.history), null);
  assert.ok(!tieneRazonamiento(s.history));
  assert.equal(s.history.length, 6);
});

console.log(fallas ? `\n❌ ${fallas} prueba(s) fallaron\n` : "\n✅ Todas pasaron\n");
process.exit(fallas ? 1 : 0);
