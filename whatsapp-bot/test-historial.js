// Prueba de sanearHistorial: que un error a media herramienta no deje el chat
// muerto, y que el recorte a 40 turnos no rompa una pareja tool_use/tool_result.
const assert = require("assert");
const { sanearHistorial } = require("./agent");

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
    toolRes("t0"),          // ← el tool_use quedó fuera del recorte de 40
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

console.log(fallas ? `\n❌ ${fallas} prueba(s) fallaron\n` : "\n✅ Todas pasaron\n");
process.exit(fallas ? 1 : 0);
