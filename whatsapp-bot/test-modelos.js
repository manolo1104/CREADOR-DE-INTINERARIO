// Prueba de lo que se le manda a la API con cada BOT_MODEL y de cuánto cuesta
// cada llamada, SIN red: configModelo y costoDeUso son funciones puras.
//
// 🔴 Por qué existe: una sola expresión (PIENSA_POR_DEFAULT) le mandaba
// `thinking: {type:"disabled"}` también a Sonnet 5.5 y a Opus 5.5, que lo
// rechazan con un 400. Con BOT_MODEL en cualquiera de los dos, CADA mensaje
// del bot habría fallado y nadie se habría dado cuenta hasta producción.
//
// Uso: node test-modelos.js   (gratis: no llama a Anthropic)
const assert = require("assert");
const fs = require("fs");
const path = require("path");

// El .env de quien la corre no debe cambiar el resultado: las variables que
// lee configModelo se quitan antes de cada caso (las lee al llamarse).
const sinBOT_MODEL = !process.env.BOT_MODEL;
delete process.env.BOT_EFFORT;
delete process.env.BOT_MAX_TOKENS;

const { configModelo, costoDeUso, setUsageObserver, MODEL, buildSystemPrompt, tools } = require("./agent");

let fallas = 0;
function prueba(nombre, fn) {
  try { fn(); console.log(`  ✅ ${nombre}`); }
  catch (e) { fallas++; console.log(`  ❌ ${nombre}\n     ${e.message}`); }
}

const HAIKU = "claude-haiku-4-5-20251001";
const SONNET55 = "claude-sonnet-5-5";
const OPUS55 = "claude-opus-5-5";
const FABLE51 = "claude-fable-5-1";

/** USD con tolerancia (costoDeUso redondea a millonésimas). */
const casiIgual = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-6, `${msg}: ${a} ≠ ${b}`);

console.log("\n🧠 Configuración por modelo (lo que se manda a la API)\n");

prueba("Haiku 4.5: sin thinking ni esfuerzo, 2048 tokens (como siempre)", () => {
  const c = configModelo(HAIKU);
  assert.deepEqual(c, { model: HAIKU, max_tokens: 2048 });
  assert.ok(!("thinking" in c), "Haiku no lleva la clave thinking");
  assert.ok(!("output_config" in c), "Haiku no acepta effort");
});

prueba("Haiku 4.5: BOT_EFFORT no le pone esfuerzo (no lo acepta)", () => {
  const c = configModelo(HAIKU, { effort: "high" });
  assert.ok(!("output_config" in c));
  assert.ok(!("thinking" in c));
});

prueba("Sonnet 5.5: between_tools + esfuerzo medium por omisión, 4096", () => {
  const c = configModelo(SONNET55);
  assert.deepEqual(c.thinking, { type: "between_tools" });
  assert.deepEqual(c.output_config, { effort: "medium" });
  assert.equal(c.max_tokens, 4096);
  assert.equal(c.model, SONNET55);
});

prueba("Sonnet 5.5: el esfuerzo pedido manda; xhigh/max bajan a high (between_tools da 400 arriba de high)", () => {
  assert.equal(configModelo(SONNET55, { effort: "low" }).output_config.effort, "low");
  assert.equal(configModelo(SONNET55, { effort: "high" }).output_config.effort, "high");
  assert.equal(configModelo(SONNET55, { effort: "xhigh" }).output_config.effort, "high");
  assert.equal(configModelo(SONNET55, { effort: "max" }).output_config.effort, "high");
  assert.equal(configModelo(SONNET55, { effort: "turbo" }).output_config.effort, "medium", "un esfuerzo que no existe → el de omisión");
});

prueba("Opus 5.5: SIN thinking (razona siempre; disabled = 400) + esfuerzo low, 4096", () => {
  const c = configModelo(OPUS55);
  assert.ok(!("thinking" in c), `Opus 5.5 no debe llevar thinking (llevó ${JSON.stringify(c.thinking)})`);
  assert.deepEqual(c.output_config, { effort: "low" });
  assert.equal(c.max_tokens, 4096);
  assert.equal(configModelo(OPUS55, { effort: "high" }).output_config.effort, "high");
});

prueba("Fable 5.1: igual que Opus 5.5 (sin thinking + esfuerzo)", () => {
  const c = configModelo(FABLE51);
  assert.ok(!("thinking" in c));
  assert.deepEqual(c.output_config, { effort: "low" });
  assert.equal(c.max_tokens, 4096);
});

prueba("Sonnet 5 / Opus 5: thinking disabled, sin esfuerzo", () => {
  for (const id of ["claude-sonnet-5", "claude-opus-5"]) {
    const c = configModelo(id);
    assert.deepEqual(c.thinking, { type: "disabled" }, id);
    assert.ok(!("output_config" in c), `${id} sin output_config`);
    assert.equal(c.max_tokens, 4096, id);
  }
});

prueba("🔴 ningún modelo que lo rechaza recibe thinking:disabled", () => {
  for (const id of [SONNET55, OPUS55, FABLE51]) {
    const c = configModelo(id);
    assert.ok(!(c.thinking && c.thinking.type === "disabled"), `${id} recibió thinking:disabled (= 400 en cada mensaje)`);
  }
});

prueba("un id desconocido: sin thinking ni esfuerzo (nada que dé 400), 4096", () => {
  const c = configModelo("claude-modelo-nuevo-9");
  assert.deepEqual(c, { model: "claude-modelo-nuevo-9", max_tokens: 4096 });
});

prueba("max_tokens: BOT_MAX_TOKENS manda, con tope de 20000 (el SDK 0.37 exige streaming arriba)", () => {
  assert.equal(configModelo(HAIKU, { maxTokens: 3000 }).max_tokens, 3000);
  assert.equal(configModelo(SONNET55, { maxTokens: 8000 }).max_tokens, 8000);
  assert.equal(configModelo(OPUS55, { maxTokens: 50000 }).max_tokens, 20000);
  assert.equal(configModelo(HAIKU, { maxTokens: -5 }).max_tokens, 2048, "uno inválido → el de omisión");
  assert.equal(configModelo(HAIKU, { maxTokens: "nada" }).max_tokens, 2048);
});

prueba("BOT_EFFORT y BOT_MAX_TOKENS del entorno se leen al llamar", () => {
  process.env.BOT_EFFORT = "high";
  process.env.BOT_MAX_TOKENS = "6000";
  try {
    const c = configModelo(SONNET55);
    assert.equal(c.output_config.effort, "high");
    assert.equal(c.max_tokens, 6000);
  } finally {
    delete process.env.BOT_EFFORT;
    delete process.env.BOT_MAX_TOKENS;
  }
});

prueba("los ids del simulador (--modelo) son los del contrato y todos tienen configuración", () => {
  // Se LEE simulador.js como texto: requerirlo levantaría su servidor.
  const src = fs.readFileSync(path.join(__dirname, "simulador.js"), "utf8");
  const bloque = (src.match(/const MODELOS = \{([\s\S]*?)\};/) || [])[1] || "";
  const ids = Object.fromEntries([...bloque.matchAll(/(\w+):\s*"([^"]+)"/g)].map((m) => [m[1], m[2]]));
  assert.deepEqual(ids, { haiku: HAIKU, sonnet: SONNET55, opus: OPUS55, fable: FABLE51 });
  for (const id of Object.values(ids)) assert.equal(configModelo(id).model, id);
});

if (sinBOT_MODEL) {
  prueba("sin BOT_MODEL el bot sigue en Haiku 4.5 (decisión de Manolo)", () => {
    assert.equal(MODEL, HAIKU);
  });
}

console.log("\n💲 Costo de cada llamada (USD)\n");

// Una llamada típica que ESCRIBE la caché (primer mensaje de la plática) y
// otra que la LEE (los siguientes).
const ESCRIBE = { input_tokens: 1000, output_tokens: 500, cache_creation_input_tokens: 15000, cache_read_input_tokens: 0 };
const LEE = { input_tokens: 200, output_tokens: 300, cache_creation_input_tokens: 0, cache_read_input_tokens: 15000 };

prueba("Haiku 4.5: $1 / $5, caché 1 h $2, lectura $0.10", () => {
  casiIgual(costoDeUso(HAIKU, ESCRIBE), (1000 * 1 + 500 * 5 + 15000 * 2) / 1e6, "escribe");
  casiIgual(costoDeUso(HAIKU, LEE), (200 * 1 + 300 * 5 + 15000 * 0.10) / 1e6, "lee");
  casiIgual(costoDeUso("claude-haiku-4-5", LEE), costoDeUso(HAIKU, LEE), "con y sin la fecha del id");
});

prueba("Sonnet 5.5: $2 / $10, caché $4, lectura $0.20", () => {
  casiIgual(costoDeUso(SONNET55, ESCRIBE), (1000 * 2 + 500 * 10 + 15000 * 4) / 1e6, "escribe");
  casiIgual(costoDeUso(SONNET55, LEE), (200 * 2 + 300 * 10 + 15000 * 0.20) / 1e6, "lee");
});

prueba("Opus 5.5: $4 / $20, caché $8, lectura $0.20", () => {
  casiIgual(costoDeUso(OPUS55, ESCRIBE), (1000 * 4 + 500 * 20 + 15000 * 8) / 1e6, "escribe");
  casiIgual(costoDeUso(OPUS55, LEE), (200 * 4 + 300 * 20 + 15000 * 0.20) / 1e6, "lee");
});

prueba("Fable 5.1: $10 / $50, caché $20, lectura $0.25", () => {
  casiIgual(costoDeUso(FABLE51, ESCRIBE), (1000 * 10 + 500 * 50 + 15000 * 20) / 1e6, "escribe");
  casiIgual(costoDeUso(FABLE51, LEE), (200 * 10 + 300 * 50 + 15000 * 0.25) / 1e6, "lee");
});

prueba("Sonnet 5 ($2 / $10) y Opus 5 ($5 / $25, caché $10, lectura $0.50)", () => {
  casiIgual(costoDeUso("claude-sonnet-5", ESCRIBE), (1000 * 2 + 500 * 10 + 15000 * 4) / 1e6, "sonnet 5");
  casiIgual(costoDeUso("claude-opus-5", ESCRIBE), (1000 * 5 + 500 * 25 + 15000 * 10) / 1e6, "opus 5 escribe");
  casiIgual(costoDeUso("claude-opus-5", LEE), (200 * 5 + 300 * 25 + 15000 * 0.50) / 1e6, "opus 5 lee");
});

prueba("caché de 5 min (si la API la reporta): 1.25× la entrada", () => {
  const u = { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 1000, cache_creation: { ephemeral_5m_input_tokens: 1000, ephemeral_1h_input_tokens: 0 } };
  casiIgual(costoDeUso(HAIKU, u), (1000 * 1 * 1.25) / 1e6, "5 min");
});

prueba("el orden de los costos tiene sentido: Haiku < Sonnet 5.5 < Opus 5.5 < Fable 5.1", () => {
  const c = [HAIKU, SONNET55, OPUS55, FABLE51].map((m) => costoDeUso(m, ESCRIBE));
  assert.ok(c[0] < c[1] && c[1] < c[2] && c[2] < c[3], c.join(" · "));
});

prueba("un usage vacío o raro cuesta 0 (y no truena)", () => {
  assert.equal(costoDeUso(HAIKU, {}), 0);
  assert.equal(costoDeUso(HAIKU, null), 0);
  assert.equal(costoDeUso(HAIKU, { input_tokens: "x", output_tokens: -3 }), 0);
});

prueba("setUsageObserver existe y acepta quitar el mirón", () => {
  assert.equal(typeof setUsageObserver, "function");
  setUsageObserver(() => {});
  setUsageObserver(null);
});

console.log("\n📦 El prompt fijo sigue en caché con Haiku\n");

prueba("prompt + herramientas muy arriba del mínimo de caché de Haiku (4,096 tokens)", () => {
  // Sin contar tokens (eso es la API): ~4 caracteres por token en español.
  // 4,096 tokens ≈ 16 mil caracteres; se pide el doble de margen.
  const chars = buildSystemPrompt().length + JSON.stringify(tools).length;
  assert.ok(chars >= 32000, `prompt + herramientas = ${chars} caracteres: podría quedar debajo del mínimo de caché`);
});

console.log(fallas ? `\n❌ ${fallas} prueba(s) fallaron\n` : "\n✅ Todas pasaron\n");
process.exit(fallas ? 1 : 0);
