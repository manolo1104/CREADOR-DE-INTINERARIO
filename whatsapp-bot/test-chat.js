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
  ok(findPaquete("gran-huasteca").precio === 16500, "Paquete Gran Huasteca = $16,500");
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
  const raftChico = await executeTool("calcular_precio", { slug: "rafting-rio-tampaon", adultos: 2 });
  ok(Boolean(raftChico.error), "rafting rechaza 2 personas (el mínimo son 5)");
  const raft = await executeTool("calcular_precio", { slug: "rafting-rio-tampaon", adultos: 5 });
  ok(raft.total === 9750, "rafting 5 adultos = $9,750 ($1,950 c/u)");

  console.log("honestidad — hechos cerrados por tour:");
  const rappel = await executeTool("obtener_tour", { slug: "rappel-tamul" });
  ok(rappel.transporte.incluido === false, "rappel: NO incluye transporte (no prometer recogida)");
  ok(rappel.alimentos.desayuno === false && rappel.alimentos.comida === false, "rappel: no incluye ningún alimento");
  const acuatica = await executeTool("obtener_tour", { slug: "ruta-acuatica-puente-de-dios" });
  ok(acuatica.alimentos.desayuno === true && acuatica.alimentos.comida === false, "ruta acuática: desayuno SÍ, comida de mediodía NO");
  ok(TOURS.every((t) => !/profesional/i.test(t.incluyeSiempre.join(" "))), "'incluyeSiempre' no dice 'profesional'");
  ok(TOURS.every((t) => t.alimentos && t.alimentos.comida === false), "NINGÚN tour incluye comida de mediodía");
  // Se cuenta contra los que NO lo incluyen (RZR, rappel y buceo), que es el
  // hecho que importa y no cambia al agregar tours. La versión anterior fijaba
  // "6 de 9" y caducó en cuanto entró la Travesía del Café.
  const sinTraslado = TOURS.filter((t) => !t.transporte.incluido).map((t) => t.slug).sort();
  ok(
    sinTraslado.join(",") === "buceo-media-luna,rappel-tamul,rzr-xilitla",
    `los únicos 3 tours SIN traslado son RZR, rappel y buceo (${TOURS.length - sinTraslado.length}/${TOURS.length} sí lo incluyen)`,
  );

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


  // ── EMBUDO DE VENTA ─────────────────────────────────────────
  console.log("\n══ embudo de venta ══");

  const lineas = (t) => t.split("\n").filter((l) => l.trim()).length;
  const pidePersonas = (t) => /cu[aá]nt[oa]s? (personas|van|ser[aá]n)|n[uú]mero de personas|para cu[aá]nt/i.test(t);
  const pideFecha = (t) => /qu[eé] fecha|cu[aá]ndo|fechas? tienes|para cu[aá]ndo|qu[eé] d[ií]as?/i.test(t);

  await scenario("Embudo: saludo suelto", "5210000091@c.us", ["hola"], (r) => {
    soft(lineas(r) <= 6, `el saludo cabe en 6 líneas (fueron ${lineas(r)})`);
    ok(pideFecha(r) && pidePersonas(r), "el saludo pide FECHA y PERSONAS de una vez");
    soft(!/•/.test(r) || lineas(r) <= 6, "no le suelta el catálogo de entrada");
  });

  await scenario("Embudo: pregunta de precio directa", "5210000092@c.us", [
    "cuanto cuesta el tour de tamul?",
  ], (r) => {
    ok(/1[,.]?550/.test(r), "da el precio por persona ($1,550), no lo esquiva");
    ok(pideFecha(r) || pidePersonas(r), "y en el mismo mensaje pide fecha o personas");
  });

  await scenario("Embudo: de hola a propuesta con total", "5210000093@c.us", [
    "hola",
    `somos 4 adultos, para el ${fechaFutura(25)}`,
    "queremos cascadas",
  ], (r) => {
    soft(lineas(r) <= 9, `la propuesta cabe en 9 líneas (fueron ${lineas(r)})`);
    ok(/\$\s?[\d,]{4,}/.test(r), "da un TOTAL en pesos, no solo el precio por persona");
    soft(/aparta|anticipo|30\s?%/i.test(r), "menciona con cuánto se aparta");
    ok(/\?/.test(r), "termina preguntando algo (empuja el cierre)");
  });

  await scenario("Embudo: grupo por debajo del mínimo", "5210000094@c.us", [
    `somos 2 personas y queremos hacer rafting el ${fechaFutura(30)}`,
  ], (r) => {
    ok(/m[ií]nimo|5 personas|no pod|necesit/i.test(r), "avisa que el grupo no llega al mínimo del rafting");
    ok(!/\$\s?3[,.]?900/.test(r), "NO cotiza $3,900 para 2 personas (ese tour no sale)");
  });

  // ── OBJECIONES ──────────────────────────────────────────────
  console.log("\n══ objeciones ══");

  await scenario("Objeción: está caro", "5210000095@c.us", [
    `hola, somos 2 para el ${fechaFutura(20)}, queremos la expedición tamul`,
    "uf, está caro",
  ], (r) => {
    ok(/incluye|seguro|gu[ií]a|entrada|desayuno/i.test(r), "desglosa lo que sí va incluido");
    soft(/30\s?%|aparta|anticipo/i.test(r), "recuerda que hoy solo pone el 30 %");
    ok(!/descuento|rebaja|te lo dejo en/i.test(r), "NO inventa un descuento");
  });

  await scenario("Objeción: lo voy a pensar", "5210000096@c.us", [
    `somos 3 para el ${fechaFutura(15)}, la ruta surrealista`,
    "déjame lo pienso y te aviso",
  ], (r) => {
    ok(/48\s?h|48 horas|se llenan|temporada|fin de semana/i.test(r), "usa la vigencia de 48 h o la urgencia real");
    ok(!/[uú]ltimo lugar|quedan \d+ lugares/i.test(r), "NO inventa escasez ('quedan X lugares')");
    soft(/\?/.test(r), "vuelve a preguntar por el cierre");
  });

  await scenario("Objeción: es seguro?", "5210000097@c.us", [
    "oigan y esto es seguro? me da miedo el agua",
  ], (r) => {
    ok(/NOM-?09|certificad|rescate|seguro de viaje/i.test(r), "menciona certificación o seguro");
    soft(/12|grupos peque/i.test(r), "menciona los grupos pequeños");
  });

  await scenario("Objeción: pago todo el día del tour", "5210000098@c.us", [
    `quiero la ruta acuática el ${fechaFutura(18)} para 4`,
    "puedo pagar todo el mero día del tour?",
  ], (r) => {
    ok(/30\s?%|anticipo|aparta/i.test(r), "explica que se aparta con el 30 %");
    ok(!/claro que s[ií].{0,40}el d[ií]a del tour/i.test(r), "NO dice que sí puede pagar todo el día del tour");
  });

  // ── REVISIÓN GLOBAL de todo lo que dijo el bot ──────────────
  console.log("\n══ revisión global de todas las respuestas ══");

  /** Saca el trozo de texto alrededor de lo que falló, para poder arreglarlo. */
  const contexto = (texto, re) => {
    const m = texto.match(re);
    if (!m) return "";
    const i = Math.max(0, m.index - 55);
    return "…" + texto.slice(i, m.index + m[0].length + 55).replace(/\n/g, " ") + "…";
  };
  const detalle = (lista, re) => lista.map((r) => `\n       ${r.escenario}: ${contexto(r.texto, re)}`).join("");

  // Es una empresa mexicana: el voseo suena a bot extranjero.
  // OJO: "liquidas" SIN acento es el tú correcto — solo "liquidás" es voseo.
  const VOSEO = /\b(vos|ten[eé]s|pod[eé]s|quer[eé]s|liquidás|sabés|fijate|contame|decime|vosotros|os invitamos)\b/i;
  const conVoseo = todasLasRespuestas.filter((r) => VOSEO.test(r.texto));
  ok(conVoseo.length === 0, `ninguna respuesta usa voseo${detalle(conVoseo, VOSEO)}`);

  // Casi todos los tours son de 8–10 h. Decir "medio día" le arruina el día al cliente.
  const cortos = new Set(["travesia-del-cafe", "rzr-xilitla"]); // los únicos que sí son cortos
  const largos = TOURS.filter((t) => !cortos.has(t.slug)).map((t) => norm(t.nombre.split("—")[0].trim()));
  const inventaDuracion = todasLasRespuestas.filter((r) => {
    const n = norm(r.texto);
    if (!/medio d[ií]a|unas horitas|par de horas|actividad corta/.test(n)) return false;
    return largos.some((nom) => nom.length > 8 && n.includes(nom));
  });
  ok(inventaDuracion.length === 0, `no llama "medio día" a un tour de 8–10 h${detalle(inventaDuracion, /medio d[ií]a|unas horitas|par de horas|actividad corta/i)}`);

  // Nunca "todo incluido", en ninguna respuesta de toda la corrida.
  const TODO_INC = /todo incluido/i;
  const todoIncluido = todasLasRespuestas.filter((r) => TODO_INC.test(r.texto) && !/no (es|son) "?todo incluido|ning[uú]n (tour|paquete) es/i.test(r.texto));
  ok(todoIncluido.length === 0, `nunca dice "todo incluido"${detalle(todoIncluido, TODO_INC)}`);

  // Markdown que WhatsApp no entiende, en cualquier respuesta.
  const MD = /\*\*|^###|^---$/m;
  const conMarkdown = todasLasRespuestas.filter((r) => MD.test(r.texto));
  ok(conMarkdown.length === 0, `ninguna respuesta lleva markdown (** ### ---)${detalle(conMarkdown, MD)}`);

  console.log(`  (revisadas ${todasLasRespuestas.length} respuestas)`);

  done();
}

// Todo lo que contestó el bot en la corrida, para revisarlo en bloque al final.
const todasLasRespuestas = [];

async function scenario(name, phone, turns, check) {
  console.log(`\n— ${name} —`);
  let last = "";
  for (const t of turns) {
    console.log(`  👤 ${t}`);
    last = await processMessage(phone, t);
    todasLasRespuestas.push({ escenario: name, texto: last });
    console.log(`  🤖 ${last.replace(/\n/g, " ").substring(0, 220)}`);
  }
  try { check(last); } catch (e) { fail++; console.log(`  ❌ check lanzó error: ${e.message}`); }
}

function done() {

  console.log(`\n════════════════════════════════════\nRESULTADO: ${pass} ✅ · ${warn} ⚠️ · ${fail} ❌\n════════════════════════════════════\n`);
  process.exit(fail > 0 ? 1 : 0);
}

run().catch((e) => { console.error("Error fatal en pruebas:", e); process.exit(1); });
