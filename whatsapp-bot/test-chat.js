// ════════════════════════════════════════════════════════════════════
// Pruebas del bot — SIN WhatsApp.
//  Parte 1: unitarias deterministas (no usan red).
//  Parte 2: conversaciones reales con Claude, pero con api-client MOCKEADO
//           (no escribe en la base ni necesita el sitio corriendo).
// Uso:  ANTHROPIC_API_KEY=... node test-chat.js
// ════════════════════════════════════════════════════════════════════

require("dotenv").config();
const { recomendarLocal, needsHuman, processMessage, setApiClient } = require("./agent");
const { calcPrecio, findTour } = require("./catalog");

let pass = 0, fail = 0, warn = 0;
const ok = (cond, name) => { if (cond) { pass++; console.log(`  ✅ ${name}`); } else { fail++; console.log(`  ❌ ${name}`); } };
const soft = (cond, name) => { if (cond) { pass++; console.log(`  ✅ ${name}`); } else { warn++; console.log(`  ⚠️  ${name} (revisar — depende del modelo)`); } };

// ── Mock del cliente HTTP al sitio ────────────────────────────
const calls = { quote: [], confirm: [], lookup: [] };
setApiClient({
  crearCotizacion: async (p) => {
    calls.quote.push(p);
    const t = findTour(p.tourSlug);
    const { total } = calcPrecio(t.precio, p.adults, p.childrenMid || 0, p.childrenSmall || 0);
    return { ok: true, status: 200, data: { folio: "HPTEST123", total, moneda: "MXN", tourName: t.nombre, tourDate: p.tourDate, datosBanco: { banco: "BBVA", titular: "Tours Huasteca", clabe: "012...", cuenta: "123" }, linkPago: `https://www.huasteca-potosina.com/reservar-tour/${t.slug}` } };
  },
  confirmarReserva: async (folio) => { calls.confirm.push(folio); return { ok: true, status: 200, data: { folio, tourName: "X", tourDate: "2026-07-01", adults: 2, children: 0, totalAmount: 1600, customerName: "Test", customerPhone: "5210000000" } }; },
  consultarReserva: async (folio) => { calls.lookup.push(folio); return { ok: true, status: 200, data: { folio, status: "pending", tourName: "Recorrido en RZR por Xilitla — Ruta Nanacatli", tourDate: "2026-07-01", adults: 2, children: 0, totalAmount: 1600 } }; },
});

const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

async function run() {
  // ─────────────── PARTE 1: UNITARIAS ───────────────
  console.log("\n=== Parte 1: unitarias (deterministas) ===\n");

  console.log("calcPrecio:");
  ok(calcPrecio(800, 2, 0, 0).total === 1600, "RZR 2 adultos = $1,600");
  ok(calcPrecio(800, 2, 1, 0).total === 1600 + 560, "RZR 2 adultos + 1 niño(6-10) = $2,160 (70%)");
  ok(calcPrecio(800, 1, 0, 1).total === 800 + 400, "RZR 1 adulto + 1 menor de 6 = $1,200 (50%)");

  console.log("recomendarLocal:");
  ok(recomendarLocal({ intereses: ["aventura extrema"], actividad: "intenso", destino: "rzr por xilitla" })[0].slug === "rzr-xilitla", "destino RZR explícito → RZR primero");
  ok(recomendarLocal({ intereses: ["aventura extrema"], actividad: "intenso", grupo: "amigos" })[0].slug === "rappel-tamul", "amigos + extrema → rappel primero");
  ok(recomendarLocal({ grupo: "familia con niños", actividad: "tranquilo", intereses: ["relax"] }).every((t) => t.slug !== "rappel-tamul"), "familia con niños → rappel NO aparece en top 2");
  ok(recomendarLocal({ intereses: ["arte y cultura"] })[0].slug === "ruta-surrealista-edward-james", "arte y cultura → Edward James");

  console.log("needsHuman:");
  ok(needsHuman("quiero hablar con un humano") === true, "'hablar con un humano' → true");
  ok(needsHuman("me pasas con un asesor?") === true, "'asesor' → true");
  ok(needsHuman("hola quiero info de un tour") === false, "mensaje normal → false");

  // ─────────────── PARTE 2: CONVERSACIONES ───────────────
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log("\n⚠️  Sin ANTHROPIC_API_KEY — se omiten las pruebas de conversación.\n");
    return done();
  }

  console.log("\n=== Parte 2: conversaciones (Claude real, api mockeada) ===\n");

  // Escenario A: precio del RZR
  await scenario("Precio RZR (2 adultos)", "5211111111@c.us", [
    "Hola! cuánto cuesta el recorrido en RZR para 2 personas?",
  ], (last) => soft(/1[.,]?600/.test(last) || /800.*(cada|persona|c\/u)/.test(norm(last)), "menciona $1,600 (o $800/persona)"));

  // Escenario B: honestidad del rappel
  await scenario("Rappel — honestidad transporte", "5212222222@c.us", [
    "el rappel de tamul incluye transporte y comida?",
  ], (last) => {
    const n = norm(last);
    soft(n.includes("transporte") && (n.includes("no inclu") || n.includes("costo adicional") || n.includes("no esta inclu")), "aclara que NO incluye transporte");
  });

  // Escenario C: familia → no rappel
  await scenario("Familia con niños", "5213333333@c.us", [
    "Vamos en familia, 2 adultos y 2 niños de 7 y 9 años, algo tranquilo y bonito para nadar",
  ], (last) => {
    const n = norm(last);
    soft(!n.includes("rappel"), "no recomienda rappel a familia con niños");
    soft(n.includes("minas") || n.includes("micos") || n.includes("meco") || n.includes("cascada"), "sugiere un tour de cascadas/familiar");
  });

  // Escenario D: cotización por transferencia (multi-turno)
  calls.quote.length = 0;
  await scenario("Cotización por transferencia", "5214444444@c.us", [
    "Quiero el RZR para 2 adultos",
    "El 15 de julio de 2026",
    "Prefiero pagar por transferencia. Mi nombre es Juan Pérez",
  ], (last) => {
    soft(calls.quote.length >= 1, "llamó a crear_cotizacion");
    soft(/HPTEST123/.test(last), "el mensaje final incluye el folio HPTEST123");
  });

  // Escenario E: link de pago con tarjeta
  await scenario("Link de pago (tarjeta)", "5215555555@c.us", [
    "Quiero las Cascadas del Meco para 2, prefiero pagar con tarjeta en línea",
  ], (last) => soft(/huasteca-potosina\.com\/reservar-tour\/cascadas-del-meco/.test(last), "manda el link de reservar-tour del Meco"));

  done();
}

async function scenario(name, phone, turns, check) {
  console.log(`\n— ${name} —`);
  let last = "";
  for (const t of turns) {
    console.log(`  👤 ${t}`);
    last = await processMessage(phone, t);
    console.log(`  🤖 ${last.replace(/\n/g, " ").substring(0, 220)}`);
  }
  try { check(last); } catch (e) { fail++; console.log(`  ❌ check lanzó error: ${e.message}`); }
}

function done() {
  console.log(`\n════════════════════════════════════\nRESULTADO: ${pass} ✅ · ${warn} ⚠️ · ${fail} ❌\n════════════════════════════════════\n`);
  process.exit(fail > 0 ? 1 : 0);
}

run().catch((e) => { console.error("Error fatal en pruebas:", e); process.exit(1); });
