require("dotenv").config();
const { buildSystemPrompt, tools } = require("./agent");
const Anthropic = require("@anthropic-ai/sdk");
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.BOT_MODEL || "claude-haiku-4-5";

(async () => {
  const sys = buildSystemPrompt();
  console.log(`Prompt: ${sys.length} caracteres, ${sys.split("\n").length} líneas`);
  const r = await client.messages.countTokens({
    model: MODEL,
    system: sys,
    tools,
    messages: [{ role: "user", content: "hola" }],
  });
  console.log(`Modelo: ${MODEL}`);
  console.log(`Prefijo cacheable (prompt + ${tools.length} herramientas): ${r.input_tokens} tokens`);
  console.log(r.input_tokens >= 4096
    ? "✅ Arriba del mínimo de caché de Haiku 4.5 (4,096) — el caché SÍ va a funcionar"
    : "🔴 DEBAJO de 4,096: con Haiku el caché NO guarda nada y cada mensaje se paga completo");
  // Sanidad: que no quedaran interpolaciones sin resolver ni markdown prohibido
  for (const [nombre, re] of [["${ sin resolver", /\$\{/], ["dobles asteriscos", /\*\*/], ["títulos ###", /^###/m]]) {
    if (re.test(sys)) console.log(`⚠️  el prompt contiene ${nombre}`);
  }
})().catch((e) => { console.error("❌", e.message); process.exit(1); });
