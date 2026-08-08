// ════════════════════════════════════════════════════════════════════
// Pruebas del bot — SIN WhatsApp.
//  Parte 1: unitarias deterministas (no usan red).
//  Parte 2: conversaciones reales con Claude, pero con api-client MOCKEADO
//           (no escribe en la base ni necesita el sitio corriendo).
// Uso:  ANTHROPIC_API_KEY=... node test-chat.js
// ════════════════════════════════════════════════════════════════════

require("dotenv").config();
const { recomendarLocal, needsHuman, processMessage, setApiClient, sanitizeLinks, toWhatsAppFormat, executeTool } = require("./agent");
const { calcPrecio, findTour, TOURS } = require("./catalog");
const { PAQUETES, DESTINOS, DESTINO_TOUR, findPaquete, findDestino } = require("./knowledge");

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

/** Fecha en lenguaje natural a N días de hoy (para que las pruebas no caduquen). */
function fechaFutura(dias) {
  const d = new Date(Date.now() + dias * 86400000);
  const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  return `${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
}

async function run() {
  // ─────────────── PARTE 1: UNITARIAS ───────────────
  console.log("\n=== Parte 1: unitarias (deterministas) ===\n");

  console.log("calcPrecio (por persona):");
  ok(calcPrecio(1600, 2, 0, 0).total === 3200, "Meco 2 adultos = $3,200");
  ok(calcPrecio(1600, 2, 1, 0).total === 3200 + 1120, "2 adultos + 1 niño(6-10) = 70%");
  ok(calcPrecio(1600, 1, 0, 1).total === 1600 + 800, "1 adulto + 1 menor de 6 = 50%");

  console.log("recomendarLocal:");
  ok(recomendarLocal({ intereses: ["aventura extrema"], actividad: "intenso", destino: "rzr por xilitla" })[0].slug === "rzr-xilitla", "destino RZR explícito → RZR primero");
  ok(recomendarLocal({ intereses: ["aventura extrema"], actividad: "intenso", grupo: "amigos" })[0].slug === "rappel-tamul", "amigos + extrema → rappel primero");
  ok(recomendarLocal({ grupo: "familia con niños", actividad: "tranquilo", intereses: ["relax"] }).every((t) => t.slug !== "rappel-tamul"), "familia con niños → rappel NO aparece en top 2");
  ok(recomendarLocal({ intereses: ["arte y cultura"] })[0].slug === "ruta-surrealista-edward-james", "arte y cultura → Edward James");

  console.log("needsHuman:");
  ok(needsHuman("quiero hablar con un humano") === true, "'hablar con un humano' → true");
  ok(needsHuman("me pasas con un asesor?") === true, "'asesor' → true");
  ok(needsHuman("hola quiero info de un tour") === false, "mensaje normal → false");

  console.log("conocimiento (paquetes/destinos):");
  ok(PAQUETES.length === 3, "hay 3 paquetes");
  ok(DESTINOS.length === 41, "hay 41 destinos");
  ok(findPaquete("aventura").precio === 9000, "Paquete Aventura = $9,000");
  ok(findPaquete("gran-huasteca").precio === 15500, "Paquete Gran Huasteca = $15,500");
  ok(!findPaquete("esencial"), "el paquete 'Esencial' ya NO existe");
  ok(findDestino("las pozas").precioEntrada === "$180 MXN", "Las Pozas entrada $180");
  ok((DESTINO_TOUR["cascada-de-tamul"] || []).some((r) => r.slug === "rappel-tamul"), "Tamul → cross-sell tour vendible");

  console.log("herramientas (deterministas):");
  const rzrOk = await executeTool("cotizar_rzr", { ruta: "Nanacatli", vehiculo: "RZR 500" });
  ok(rzrOk.ok === true && rzrOk.total === 1600, "cotizar_rzr Nanacatli + RZR 500 = $1,600/vehículo");
  const rzrTop = await executeTool("cotizar_rzr", { ruta: "Nacimiento", vehiculo: "Polaris Pro S" });
  ok(rzrTop.total === 7000, "cotizar_rzr Nacimiento + Polaris Pro S = $7,000/vehículo");
  const cpRzr = await executeTool("calcular_precio", { slug: "rzr-xilitla", adultos: 2 });
  ok(Boolean(cpRzr.error), "calcular_precio rechaza el RZR (es por vehículo)");
  const ccRzr = await executeTool("crear_cotizacion", { slug: "rzr-xilitla", tourDate: "2026-09-01", adultos: 2, nombre: "Test" });
  ok(Boolean(ccRzr.error), "crear_cotizacion bloquea el RZR (se confirma por WhatsApp)");
  const buceo = await executeTool("calcular_precio", { slug: "buceo-media-luna", adultos: 1, ninosMid: 1 });
  ok(Boolean(buceo.error), "buceo rechaza niños (solo +10 años)");
  const raft = await executeTool("calcular_precio", { slug: "rafting-rio-tampaon", adultos: 2 });
  ok(raft.total === 3900, "rafting 2 adultos = $3,900 ($1,950 c/u)");

  console.log("honestidad — hechos cerrados por tour:");
  const rappel = await executeTool("obtener_tour", { slug: "rappel-tamul" });
  ok(rappel.transporte.incluido === false, "rappel: NO incluye transporte (no prometer recogida)");
  ok(rappel.alimentos.desayuno === false && rappel.alimentos.comida === false, "rappel: no incluye ningún alimento");
  const acuatica = await executeTool("obtener_tour", { slug: "ruta-acuatica-puente-de-dios" });
  ok(acuatica.alimentos.desayuno === true && acuatica.alimentos.comida === false, "ruta acuática: desayuno SÍ, comida de mediodía NO");
  ok(TOURS.every((t) => !/profesional/i.test(t.incluyeSiempre.join(" "))), "'incluyeSiempre' no dice 'profesional'");
  ok(TOURS.every((t) => t.alimentos && t.alimentos.comida === false), "NINGÚN tour incluye comida de mediodía");
  ok(TOURS.filter((t) => t.transporte.incluido).length === 6, "solo 6 de los 9 tours incluyen traslado");

  console.log("destinos completos:");
  const meco = await executeTool("obtener_tour", { slug: "cascadas-del-meco" });
  ok(meco.destinos.length === 3, "el Meco expone sus 3 destinos");
  const rzr = await executeTool("obtener_tour", { slug: "rzr-xilitla" });
  ok(rzr.rutas.every((r) => r.destinos.length > 0), "cada ruta del RZR llega con SUS destinos (antes se borraban)");

  console.log("cotizar_rzr filtra por capacidad:");
  const rzr4 = await executeTool("cotizar_rzr", { ruta: "Nacimiento", personas: 4 });
  ok(rzr4.opciones.every((o) => o.plazas >= 4), "con 4 personas no ofrece unidades de 2 plazas");
  ok(rzr4.opciones.length > 0 && rzr4.opciones[0].precio <= rzr4.opciones[rzr4.opciones.length - 1].precio, "ordena las unidades de menor a mayor precio");
  ok(Boolean((await executeTool("cotizar_rzr", { ruta: "Nanacatli", personas: 20 })).error), "avisa cuando el grupo no cabe en una sola unidad");

  console.log("findDestino no devuelve el destino equivocado:");
  ok(findDestino("cueva de las quilas") === null, "'cueva de las quilas' NO devuelve la Cueva del Salitre");
  ok(findDestino("cascada bonita") === null, "'cascada bonita' NO devuelve la Cascada de Tamul");
  ok(findDestino("laguna escondida") === null, "'laguna escondida' NO devuelve la Laguna de los Suspiros");
  ok((findDestino("tamul") || {}).slug === "cascada-de-tamul", "'tamul' sí encuentra la Cascada de Tamul");
  ok((findDestino("edward james") || {}).slug === "las-pozas-jardin-surrealista", "'edward james' encuentra Las Pozas (alias)");
  ok((findDestino("castillo de la salud") || {}).slug === "castillo-de-la-salud", "'castillo de la salud' encuentra su ficha real");

  console.log("toWhatsAppFormat (markdown → WhatsApp):");
  ok(toWhatsAppFormat("**Total: $4,590**") === "*Total: $4,590*", "`**negritas**` → `*negritas*`");
  ok(toWhatsAppFormat("### Paquete") === "*Paquete*", "`### título` → negrita");
  ok(!/\*\*/.test(toWhatsAppFormat("**a** y **b**\n\n---\n\n- item")), "no queda ningún ** en la salida");
  ok(toWhatsAppFormat("- uno\n- dos").includes("• uno"), "viñetas markdown → •");

  console.log("sanitizeLinks (links sin asteriscos):");
  ok(sanitizeLinks("Reserva: *https://www.huasteca-potosina.com/reservar-tour/rzr-xilitla*") === "Reserva: https://www.huasteca-potosina.com/reservar-tour/rzr-xilitla", "quita asteriscos pegados al link");
  ok(!/\*https?:|https?:[^\s]*\*/.test(sanitizeLinks("ve a *https://x.com/a* ya")), "no queda ningún * pegado a una URL");
  ok(sanitizeLinks("texto *en negritas* normal").includes("*en negritas*"), "respeta negritas que no son links");

  // ─────────────── PARTE 2: CONVERSACIONES ───────────────
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log("\n⚠️  Sin ANTHROPIC_API_KEY — se omiten las pruebas de conversación.\n");
    return done();
  }

  console.log("\n=== Parte 2: conversaciones (Claude real, api mockeada) ===\n");

  // Escenario A: precio del RZR (por vehículo — puede dar "desde $1,600" o pedir ruta/vehículo)
  await scenario("Precio RZR (por vehículo)", "5211111111@c.us", [
    "Hola! cuánto cuesta el recorrido en RZR para 2 personas?",
  ], (last) => {
    const n = norm(last);
    soft(/1[.,]?600/.test(last) || n.includes("ruta") || n.includes("vehiculo") || n.includes("unidad"), "da 'desde $1,600' o pregunta ruta/vehículo");
    soft(n.includes("vehiculo") || n.includes("unidad") || n.includes("por rzr") || n.includes("no es por persona") || /1[.,]?600/.test(last), "trata el RZR como por vehículo");
  });

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

  // Escenario D: cotización por transferencia (multi-turno) — tour por persona
  // La fecha se calcula siempre a futuro: con una fecha fija el test caducaba
  // y el bot la rechazaba (correctamente), haciendo fallar la prueba sola.
  calls.quote.length = 0;
  await scenario("Cotización por transferencia", "5214444444@c.us", [
    "Quiero la Expedición Tamul para 2 adultos",
    `El ${fechaFutura(60)}`,
    "Prefiero pagar por transferencia. Mi nombre es Juan Pérez, juan@correo.com",
  ], (last) => {
    soft(calls.quote.length >= 1, "llamó a crear_cotizacion");
    soft(/HPTEST123/.test(last), "el mensaje final incluye el folio HPTEST123");
  });

  // Escenario E: link de pago con tarjeta
  await scenario("Link de pago (tarjeta)", "5215555555@c.us", [
    "Quiero las Cascadas del Meco para 2, prefiero pagar con tarjeta en línea",
  ], (last) => soft(/huasteca-potosina\.com\/reservar-tour\/cascadas-del-meco/.test(last), "manda el link de reservar-tour del Meco"));

  // Escenario F: paquetes
  await scenario("Paquetes", "5216666666@c.us", [
    "¿Qué paquetes manejan?",
  ], (last) => {
    const n = norm(last);
    soft(n.includes("aventura") || n.includes("completo") || n.includes("gran huasteca"), "menciona algún paquete por nombre");
    soft(/9[.,]?000|12[.,]?200|15[.,]?500/.test(last), "incluye algún precio de paquete");
    soft(!n.includes("esencial"), "NO menciona el paquete 'Esencial' (ya no existe)");
  });

  // Escenario G: destino con datos prácticos
  await scenario("Destino — Las Pozas", "5217777777@c.us", [
    "¿cuánto cuesta entrar a Las Pozas de Xilitla y cómo llego?",
  ], (last) => {
    soft(/180/.test(last), "da la entrada de $180");
    soft(/valles|xilitla|1\s?h|hora/i.test(last), "menciona cómo llegar");
  });

  // Escenario H: destino con cross-sell a tour
  await scenario("Destino con cross-sell — Tamul", "5218888888@c.us", [
    "quiero conocer la Cascada de Tamul, ¿qué me recomiendas?",
  ], (last) => {
    const n = norm(last);
    soft(n.includes("tamul"), "habla de la Cascada de Tamul");
    soft(n.includes("expedicion") || n.includes("rappel") || n.includes("tour"), "ofrece un tour que la visita");
  });

  // Escenario I: fotos — nunca "profesionales"
  await scenario("Fotos: sin prometer 'profesional'", "5219999999@c.us", [
    "Las fotos que toman son profesionales? me las dan?",
  ], (last) => {
    // Negarlo ("NO es una sesión fotográfica profesional") es la respuesta correcta;
    // lo que no puede es afirmarlo. Miramos si la oración que dice "profesional"
    // trae una negación.
    const afirmaProfesional = last
      .split(/(?<=[.!?\n])/)
      .some((frase) => /profesional/i.test(frase) && !/\bno\b|\bni\b|\bsin\b|\btampoco\b/i.test(frase));
    soft(!afirmaProfesional, "NO afirma que las fotos sean 'profesionales'");
    soft(/foto/i.test(last) && /(guía|guia|recorrido)/i.test(last), "las describe como las que toma el guía en el recorrido");
  });

  // Escenario J: comidas — ningún tour es todo incluido
  await scenario("Comidas: solo desayuno", "5210101010@c.us", [
    "Oye y la comida está incluida en los tours? o es todo incluido?",
  ], (last) => {
    const n = norm(last);
    soft(n.includes("desayuno"), "menciona que lo incluido es el desayuno");
    // "NO es todo incluido" es la respuesta correcta; lo que no puede es afirmarlo.
    soft(!/(?<!\bno,? )(?<!\bno es )(?<!\bno está )\bs[íi],?\s+(es\s+)?todo inclu/i.test(last), "NO afirma que sea 'todo incluido'");
    soft(n.includes("comida de mediodia") || n.includes("no inclu"), "aclara que la comida de mediodía no va incluida");
  });

  // Escenario K: transporte — no prometer recogida donde no la hay
  await scenario("Transporte: no prometer de más", "5210202020@c.us", [
    "Todos los tours incluyen que pasen por mí a mi hotel verdad? el rappel también?",
  ], (last) => {
    const n = norm(last);
    soft(n.includes("rappel") && (n.includes("no inclu") || n.includes("embarcadero") || n.includes("costo adicional")), "aclara que en el rappel NO pasan por el cliente");
    soft(!/todos los tours inclu[yi]/i.test(last), "NO afirma que todos incluyen traslado");
  });

  // Escenario L: destinos completos al presentar un tour
  await scenario("Destinos completos", "5210303030@c.us", [
    "Cuéntame de la ruta surrealista de Edward James",
  ], (last) => {
    const n = norm(last);
    const esperados = ["pozas", "huichihuayan", "quilas", "castillo"];
    const faltan = esperados.filter((d) => !n.includes(d));
    soft(faltan.length === 0, `nombra los 4 destinos del tour${faltan.length ? ` (faltaron: ${faltan.join(", ")})` : ""}`);
  });

  // Escenario M: formato WhatsApp, no markdown
  await scenario("Formato WhatsApp", "5210404040@c.us", [
    "Dame el detalle completo del Paquete Gran Huasteca",
  ], (last) => {
    ok(!/\*\*/.test(last), "la respuesta NO lleva ** (markdown) al cliente");
    ok(!/^\s*#{1,6}\s/m.test(last), "la respuesta NO lleva ### (markdown) al cliente");
  });

  // Escenario N: lugar del que NO tenemos ficha — no inventarlo
  await scenario("Lugar sin ficha: no inventar", "5210505050@c.us", [
    "Qué me puedes contar de la Cueva de las Quilas? qué se ve ahí?",
  ], (last) => {
    const n = norm(last);
    // Ofrecer OTRA cueva, bien etiquetada, es válido. El bug es pasar la ficha
    // del Salitre como si fuera la de las Quilas — es decir, sin admitir antes
    // que ese destino no lo tenemos.
    const admite = /no (lo )?(tengo|encuentro|cuento|aparece)|no (esta|figura) (registrad|en nuestro)|no lo tengo registrad/.test(n);
    soft(admite, "admite que no tiene la ficha de ese lugar");
    soft(!n.includes("salitre") || admite, "no pasa la ficha del Salitre como si fuera la de las Quilas");
  });

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
