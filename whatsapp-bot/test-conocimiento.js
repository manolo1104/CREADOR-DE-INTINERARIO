// ════════════════════════════════════════════════════════════════════
// PRUEBA (gratis, sin modelo): lo que contesta el equipo (Erick) llega al bot.
//
// Base de conocimiento de Manolo (17 nov 2026): src/lib/bot/respuestasEquipo.ts
// → data.json `respuestas`. Aquí se revisa que:
//  · el prompt trae TODAS las respuestas (y sin las reglas viejas que las
//    contradecían: Golondrinas «no lo operamos», RZR «no lo afirmes», seguro
//    para todos, «nunca ofrezcas sumarlos a una salida compartida»);
//  · consultar_politica las encuentra por palabras;
//  · obtener_tour trae las de su tour;
//  · la regla de niños nueva sale en el prompt y en calcular_precio.
//
//   node test-conocimiento.js
// ════════════════════════════════════════════════════════════════════
const assert = require("assert");
const DATA = require("./data.json");
const agente = require("./agent");

let fallas = 0;
async function prueba(nombre, fn) {
  try {
    await fn();
    console.log(`✅ ${nombre}`);
  } catch (e) {
    fallas++;
    console.log(`❌ ${nombre}\n   ${e.message}`);
  }
}

(async () => {
  const prompt = agente.buildSystemPrompt();

  await prueba("data.json trae la base del equipo", () => {
    assert.ok(Array.isArray(DATA.respuestas) && DATA.respuestas.length >= 100, `solo ${DATA.respuestas && DATA.respuestas.length}`);
  });

  await prueba("el prompt trae TODAS las respuestas del equipo", () => {
    const faltan = DATA.respuestas.filter((r) => !prompt.includes(r.respuesta)).map((r) => r.id);
    assert.deepStrictEqual(faltan, []);
  });

  await prueba("sin las reglas viejas que contradecían a Erick", () => {
    for (const re of [/NO lo operamos/, /NO lo afirmes ni lo niegues/, /seguro de viaje para todos/i, /sumarlos a una salida compartida/, /antes de las 10 pm/, /6 a 10 años/, /menores de 6/]) {
      assert.ok(!re.test(prompt), `sigue en el prompt: ${re}`);
    }
  });

  await prueba("la regla de no inventar y la frase de Erick están en el prompt", () => {
    assert.match(prompt, /NO INVENTES NADA/);
    assert.match(prompt, /Déjame confirmarlo con el equipo y te escribo en cuanto me respondan/);
    assert.match(prompt, /LO QUE CONTESTA EL EQUIPO/);
    assert.match(prompt, /Cómo piensa Erick/);
  });

  await prueba("regla de niños nueva en el prompt (4 a 7 al 50 %, 3 o menos gratis)", () => {
    assert.match(prompt, /4 a 7 años pagan el 50 %/);
    assert.match(prompt, /3 años o menos van gratis/);
  });

  const casos = [
    ["oxxo 23,250", "oxxo-tope"],
    ["¿se cruzan ríos en el rzr?", "rzr-rios-velocidad"],
    ["factura", "factura"],
    ["viajo solo", "viajero-solo"],
    ["golondrinas", "golondrinas"],
    ["¿los bebés pagan?", "ninos-precio"],
    ["¿tienen kayak?", "kayak"],
  ];
  for (const [q, id] of casos) {
    await prueba(`consultar_politica «${q}» trae la respuesta del equipo (${id})`, async () => {
      const r = await agente.executeTool("consultar_politica", { tema: q }, "conocimiento@c.us");
      assert.ok(r.encontrado, JSON.stringify(r));
      const textos = (r.loQueContestaElEquipo || []).map((x) => x.respuesta);
      const esperada = DATA.respuestas.find((x) => x.id === id).respuesta;
      assert.ok(textos.includes(esperada), `no la trajo: ${JSON.stringify(textos).slice(0, 300)}`);
    });
  }

  await prueba("consultar_politica sin respuesta escrita → no inventes, pregunta_sin_respuesta", async () => {
    const r = await agente.executeTool("consultar_politica", { tema: "zxqv wpzk" }, "conocimiento@c.us");
    assert.strictEqual(r.encontrado, false);
    assert.match(r.instruccion, /NO la inventes/);
    assert.match(r.instruccion, /pregunta_sin_respuesta/);
  });

  await prueba("obtener_tour (RZR) trae lo que dice el equipo de ese tour", async () => {
    const r = await agente.executeTool("obtener_tour", { slug: "rzr-xilitla" }, "conocimiento@c.us");
    const textos = (r.loQueDiceElEquipo || []).map((x) => x.respuesta).join(" ");
    assert.match(textos, /No se cruzan ríos/);
    assert.match(textos, /cuesta lo mismo/);
  });

  await prueba("calcular_precio: bebés gratis y niños de 4 a 7 al 50 % (Tamul sin fecha, referencia)", async () => {
    const r = await agente.executeTool("calcular_precio", { slug: "expedicion-tamul", adultos: 2, ninosSmall: 1, bebes: 1 }, "conocimiento@c.us");
    assert.ok(!r.error, r.error);
    assert.strictEqual(r.bebes, 1);
    assert.strictEqual(r.ninos4a7, 1);
    assert.strictEqual(r.precioNino4a7, Math.round(r.precioAdulto * 0.5));
    assert.strictEqual(r.total, r.precioAdulto * 2 + r.precioNino4a7);
  });

  await prueba("calcular_precio: 1 adulto + 1 bebé NO llega al mínimo de 2", async () => {
    const r = await agente.executeTool("calcular_precio", { slug: "expedicion-tamul", adultos: 1, bebes: 1 }, "conocimiento@c.us");
    assert.ok(r.error && /mínimo/.test(r.error), JSON.stringify(r));
  });

  console.log(fallas ? `\n❌ ${fallas} fallaron` : "\n✅ Todas pasaron");
  process.exit(fallas ? 1 : 0);
})();
