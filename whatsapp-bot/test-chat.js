// ════════════════════════════════════════════════════════════════════
// Pruebas del bot — SIN WhatsApp.
//  Parte 1: deterministas (no usan red ni el modelo).
//  Parte 2: conversaciones reales con Claude, con el SITIO SIMULADO
//           (sitio-simulado.js: no escribe en la base ni necesita el sitio).
// Uso:
//   ANTHROPIC_API_KEY= node test-chat.js   → solo la Parte 1 (gratis)
//   node test-chat.js                      → las dos (gasta API: la corre Manolo)
//
// ok()   = hecho duro (herramienta llamada, cifra, escalación): falla la corrida.
// soft() = estilo, depende del modelo: solo avisa.
// Las cifras esperadas se CALCULAN desde data.json con catalog.js: nunca van
// escritas a mano (dos ya habían caducado con la promo de temporada).
//
// Fase 2 (6 oct): escenarios de la prueba de Manolo con Haiku — cambios que
// REEMPLAZAN la cotización («mejor el domingo y somos 5», agregar y quitar el
// hotel), cambio después del comprobante (no se recotiza: cambio_post_pago),
// «¿dónde nos recomiendan quedarnos?» (se contesta, no se cierra) y, en la
// revisión global, nada «reservado para ustedes», ningún traslado «sin
// costo» y ningún «como les dije». La ficha y el reemplazo sin modelo están
// en test-ficha.js.
// ════════════════════════════════════════════════════════════════════

require("dotenv").config();
const {
  recomendarLocal, needsHuman, processMessage, setApiClient, setToolObserver,
  sanitizeLinks, toWhatsAppFormat, executeTool, validarFecha, normalizarHora,
} = require("./agent");
const {
  calcPrecio, findTour, TOURS, precioRZR, hoyMX, precioLista, promoDe, precioEnFecha,
  aceptaViajeroSolo, precioPorCabezaEnFecha,
} = require("./catalog");
const { PAQUETES, DESTINOS, DESTINO_TOUR, INFO, HABITACIONES, findPaquete, findDestino } = require("./knowledge");
const { PAGO, mensajeDatosPago } = require("./payment");
const { getSession, pushHistory, clearSession, marcarComprobanteEnFicha, marcarPagoEnFicha } = require("./sessions");
const { sumarDias } = require("./horario");
const medios = require("./medios");
const { crearSitioSimulado } = require("./sitio-simulado");

let pass = 0, fail = 0, warn = 0;
const ok = (cond, name) => { if (cond) { pass++; console.log(`  ✅ ${name}`); } else { fail++; console.log(`  ❌ ${name}`); } };
const soft = (cond, name) => { if (cond) { pass++; console.log(`  ✅ ${name}`); } else { warn++; console.log(`  ⚠️  ${name} (revisar — depende del modelo)`); } };

// ── El sitio, simulado (la MISMA simulación que usa el simulador) ──
const sitio = crearSitioSimulado();
const { calls } = sitio;
setApiClient(sitio.api);

// Todas las herramientas que usa el modelo, para revisar qué pidió.
const herramientas = [];
setToolObserver((nombre, entrada, salida) => herramientas.push({ nombre, entrada, salida }));

const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const HOY = hoyMX();
const fechaEn = (dias) => sumarDias(HOY, dias);

/** "2026-10-20" → "20 de octubre de 2026" / "October 20, 2026" (como lo escribe un cliente). */
function fechaNatural(ymd, locale = "es") {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString(locale === "en" ? "en-US" : "es-MX", {
    day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  });
}

/** Un monto en el texto, con o sin separador de miles: 2900 → 2,900 · 2.900 · 2900. */
function montoRe(n) {
  const s = String(Math.round(Number(n))).replace(/\B(?=(\d{3})+(?!\d))/g, "[,.\\s]?");
  return new RegExp(`(?<![\\d])${s}(?![\\d])`);
}
const tieneMonto = (texto, n) => montoRe(n).test(String(texto || ""));

/**
 * ¿El texto AFIRMA algo? Busca la frase y descarta las que lo niegan o lo
 * condicionan («no está confirmada», «queda confirmada cuando validemos»).
 */
const NEGACION = /\b(no|ni|sin|tampoco|nunca|a[uú]n|todav[ií]a|cuando|en cuanto|una vez|apenas|hasta que|para que|si|not|never|once|until|when|after|if)\b/i;
function afirma(texto, re) {
  return String(texto || "").split(/(?<=[.!?\n])/).some((f) => re.test(f) && !NEGACION.test(f));
}
const CONFIRMADA_RE = /(reserva|reservaci[oó]n|lugar|booking|reservation)[^.\n]{0,30}(confirmad|asegurad|confirmed)|\b(qued[oó]|est[aá]|ya est[aá]) confirmad|\bis confirmed\b/i;

// Lo que el bot NUNCA afirma por su cuenta (prueba de Manolo, 6 oct):
// «Lirios 2 está reservada para ustedes» (nada se aparta sin el anticipo
// validado), un traslado «sin costo extra» que ninguna herramienta dijo y un
// «como les dije…» de algo que nunca dijo.
const RESERVADA_RE = /(reservad|apartad)[oa]s?\s+(para|a nombre de)\s+(ustedes|ti|usted)\b|\b(est[aá]n?|qued[oó]|quedaron)\s+(ya\s+)?(reservad|apartad)[oa]s?\b|\b(is|are)\s+(already\s+)?(reserved|booked)\s+for\s+you\b/i;
const SIN_COSTO_TRASLADO_RE = new RegExp(
  "(sin costo|sin cargo|gratis|gratuit[oa]|free of charge|at no (extra )?cost|for free)[^.\\n]{0,60}(traslad|pasamos|llevamos|recog|transport|pick)" +
  "|(traslad|pasamos|llevamos|recog|transport|pick)[^.\\n]{0,60}(sin costo|sin cargo|gratis|gratuit[oa]|free of charge|at no (extra )?cost|for free)",
  "i",
);
/** Los servicios del hotel que SÍ son gratis («estacionamiento gratis») no cuentan como traslado. */
const sinServiciosGratis = (t) => String(t || "").replace(/(estacionamiento|wi-?fi|parking)\s+(gratis|gratuit[oa]|sin costo|free)/gi, "$1");
const COMO_DIJE_RE = /\bcomo (te|les|le) (dije|hab[ií]a dicho|hab[ií]amos dicho)\b|\bas I (said|told you|mentioned)\b/i;

/** El primer día de la semana `dow` (0 = domingo … 6 = sábado) desde `desde`. */
function proximoDia(desde, dow) {
  let f = desde;
  for (let i = 0; i < 7; i++) {
    const [y, m, d] = f.split("-").map(Number);
    if (new Date(Date.UTC(y, m - 1, d)).getUTCDay() === dow) return f;
    f = sumarDias(f, 1);
  }
  return f;
}

const pidePersonas = (t) => /cu[aá]nt[oa]s? (personas|van|ser[aá]n|son)|n[uú]mero de personas|para cu[aá]nt/i.test(t);
const pideFecha = (t) => /qu[eé] fecha|cu[aá]ndo|fechas? tienes|para cu[aá]ndo|qu[eé] d[ií]as?|qu[eé] d[ií]a/i.test(t);
const pideZona = (t) => /hosped|alojad|d[oó]nde (se |te )?(van a |vas a )?(quedan|quedar|hospedan|hospedar)|en qu[eé] (hotel|zona|lugar)|xilitla o (en )?ciudad valles|valles o (en )?xilitla/i.test(t);
const lineas = (t) => String(t || "").split("\n").filter((l) => l.trim()).length;

async function run() {
  // ─────────────── PARTE 1: DETERMINISTAS ───────────────
  console.log("\n=== Parte 1: deterministas (sin red) ===\n");

  const meco = findTour("cascadas-del-meco");
  const tamul = findTour("expedicion-tamul");
  const rafting = findTour("rafting-rio-tampaon");
  const rzrTour = findTour("rzr-xilitla");

  console.log("calcPrecio (por persona, niños al 70 / 50 %):");
  const pl = precioLista(meco);
  ok(calcPrecio(pl, 2, 0, 0).total === pl * 2, `Meco 2 adultos = 2 × ${pl}`);
  ok(calcPrecio(pl, 2, 1, 0).total === pl * 2 + Math.round(pl * 0.7), "2 adultos + 1 niño (6-10) = 70 %");
  ok(calcPrecio(pl, 1, 0, 1).total === pl + Math.round(pl * 0.5), "1 adulto + 1 menor de 6 = 50 %");

  console.log("recomendarLocal:");
  ok(recomendarLocal({ intereses: ["aventura extrema"], actividad: "intenso", destino: "rzr por xilitla" })[0].slug === "rzr-xilitla", "destino RZR explícito → RZR primero");
  ok(recomendarLocal({ intereses: ["aventura extrema"], actividad: "intenso", grupo: "amigos" })[0].slug === "rappel-tamul", "amigos + extrema → rappel primero");
  ok(recomendarLocal({ grupo: "familia con niños", actividad: "tranquilo", intereses: ["relax"] }).every((t) => t.slug !== "rappel-tamul"), "familia con niños → rappel NO aparece en top 2");
  ok(recomendarLocal({ intereses: ["arte y cultura"] })[0].slug === "ruta-surrealista-edward-james", "arte y cultura → Edward James");

  console.log("needsHuman (regla rápida, sin modelo):");
  for (const t of ["quiero hablar con un humano", "me pasas con un asesor?", "llámame porfa", "quiero hablar con una persona", "¿me puedes marcar?", "call me please"]) {
    ok(needsHuman(t) === true, `«${t}» → pasa a una persona`);
  }
  // 🔴 Antes «agente» y «encargado» sueltos callaban al bot a media venta.
  for (const t of ["hola quiero info de un tour", "soy agente de viajes", "soy el encargado del grupo", "el dueño del hotel nos recomendó", "el operador del autobús llega a las 8"]) {
    ok(needsHuman(t) === false, `«${t}» → NO escala`);
  }

  console.log("validar_fecha (hoy de MÉXICO, no del servidor):");
  // 19:00 en México = 01:00 UTC del día siguiente: el servidor ya cree que es «mañana».
  const ahora19 = Date.parse("2026-11-11T01:00:00Z"); // martes 10 nov, 7 pm en México
  const manana = validarFecha("2026-11-11", { ahora: ahora19 });
  ok(manana.valida === true && manana.esManana === true, "«mañana» a las 7 pm de México SÍ se cotiza (esManana)");
  const deHoy = validarFecha("2026-11-10", { ahora: ahora19 });
  ok(deHoy.valida === false && deHoy.escalar === true, "«hoy» no se cotiza solo: escala");
  ok(validarFecha("2026-11-09", { ahora: ahora19 }).valida === false, "ayer ya pasó");
  ok(validarFecha("2026-02-30", { ahora: ahora19 }).valida === false, "30 de febrero no existe");
  ok(normalizarHora("3 pm") === "15:00" && normalizarHora("10") === "10:00", "normalizarHora: «3 pm» → 15:00, «10» → 10:00");

  console.log("conocimiento (paquetes/destinos):");
  ok(PAQUETES.length > 0 && PAQUETES.every((p) => typeof p.precio === "number" && p.precio > 0), "cada paquete trae su precio");
  ok(PAQUETES.every((p) => /pareja/i.test(p.precioLabel || "")), "los paquetes se anuncian «por pareja»");
  ok(!findPaquete("esencial"), "el paquete 'Esencial' ya NO existe");
  ok(DESTINOS.length === 41, "hay 41 destinos");
  const pozas = findDestino("las pozas");
  ok(Boolean(pozas && /\d/.test(pozas.precioEntrada || "")), "Las Pozas trae su precio de entrada");
  ok((DESTINO_TOUR["cascada-de-tamul"] || []).some((r) => r.slug === "rappel-tamul"), "Tamul → cross-sell tour vendible");
  ok(!(DESTINO_TOUR["sotano-de-las-golondrinas"] || []).length, "Golondrinas NO aparece como parte de ningún tour");
  ok(/^3(:00)?\s?pm$/i.test(String(INFO.hotelServicios.checkIn || "").trim()), "hotel: check-in 3 pm");
  ok(/^12(:00)?\s?pm$/i.test(String(INFO.hotelServicios.checkOut || "").trim()), "hotel: check-out 12 pm");

  console.log("herramientas (deterministas):");
  const nanacatli500 = precioRZR(rzrTour, "Nanacatli", "RZR 500");
  const rzrOk = await executeTool("cotizar_rzr", { ruta: "Nanacatli", vehiculo: "RZR 500" });
  ok(rzrOk.ok === true && rzrOk.total === nanacatli500.total, `cotizar_rzr Nanacatli + RZR 500 = $${nanacatli500.total}/vehículo`);
  const nacPro = precioRZR(rzrTour, "Nacimiento", "Polaris Pro S");
  const rzrTop = await executeTool("cotizar_rzr", { ruta: "Nacimiento", vehiculo: "Polaris Pro S" });
  ok(rzrTop.total === nacPro.total, `cotizar_rzr Nacimiento + Polaris Pro S = $${nacPro.total}/vehículo`);
  const rzr2 = await executeTool("cotizar_rzr", { ruta: "Nanacatli", vehiculo: "RZR 500", unidades: 2 });
  ok(rzr2.total === nanacatli500.total * 2, "cotizar_rzr con 2 unidades = 2 × precio");
  ok(Boolean((await executeTool("cotizar_rzr", { ruta: "Nanacatli", hora: "18:00" })).error), "RZR a las 6 pm → error (la hora va de 9 am a 5 pm)");
  ok(!(await executeTool("cotizar_rzr", { ruta: "Nanacatli", hora: "10:00" })).error, "RZR a las 10:00 → sí");
  const cpRzr = await executeTool("calcular_precio", { slug: "rzr-xilitla", adultos: 2 });
  ok(Boolean(cpRzr.error), "calcular_precio rechaza el RZR (es por vehículo)");
  const ccRzr = await executeTool("crear_cotizacion", { slug: "rzr-xilitla", tourDate: fechaEn(20), adultos: 2, nombre: "Test" });
  ok(Boolean(ccRzr.error), "crear_cotizacion manda el RZR a registrar_cotizacion");
  const buceo = await executeTool("calcular_precio", { slug: "buceo-media-luna", adultos: 1, ninosMid: 1 });
  ok(Boolean(buceo.error), "buceo rechaza niños (solo +10 años)");
  const raftChico = await executeTool("calcular_precio", { slug: "rafting-rio-tampaon", adultos: 2 });
  ok(Boolean(raftChico.error), `rafting rechaza 2 personas (el mínimo son ${rafting.groupMin})`);
  // Sin fecha: lo que se anuncia HOY (con la promo si sigue viva).
  const raft = await executeTool("calcular_precio", { slug: "rafting-rio-tampaon", adultos: 5 });
  const raftEsperado = 5 * precioEnFecha(rafting, null);
  ok(raft.total === raftEsperado, `rafting 5 adultos sin fecha = $${raftEsperado} (5 × ${precioEnFecha(rafting, null)})`);

  // Con fecha: el precio lo da el sitio (simulado) y depende de la FECHA DEL TOUR.
  const promoTamul = promoDe(tamul);
  const fechaAntes = promoTamul && fechaEn(3) <= promoTamul.vence ? (fechaEn(10) <= promoTamul.vence ? fechaEn(10) : promoTamul.vence) : null;
  const fechaDespues = promoTamul && promoTamul.vence >= fechaEn(3) ? sumarDias(promoTamul.vence, 7) : fechaEn(30);
  calls.precio.length = 0;
  if (fechaAntes) {
    const antes = await executeTool("calcular_precio", { slug: "expedicion-tamul", adultos: 2, tourDate: fechaAntes });
    ok(antes.total === 2 * promoTamul.precio, `Tamul 2 adultos el ${fechaAntes} (con promo) = $${2 * promoTamul.precio}`);
  } else {
    console.log("  (la promo de Tamul ya no está viva en data.json: se salta «antes de la promo»)");
  }
  const despues = await executeTool("calcular_precio", { slug: "expedicion-tamul", adultos: 2, tourDate: fechaDespues });
  ok(despues.total === 2 * precioLista(tamul), `Tamul 2 adultos el ${fechaDespues} (sin promo) = $${2 * precioLista(tamul)}`);
  ok(calls.precio.length >= 1 && calls.precio.every((p) => p.items[0].tourDate), "calcular_precio con fecha le pregunta al sitio (/api/bot/precio)");
  const fechaMeco = fechaEn(25);
  const solo = await executeTool("calcular_precio", { slug: "cascadas-del-meco", adultos: 1, tourDate: fechaMeco });
  ok(aceptaViajeroSolo(meco) && solo.total === precioPorCabezaEnFecha(meco, fechaMeco, 1) && solo.bajoElMinimo === true,
    `Meco con 1 persona = tarifa normal, salida por confirmar ($${precioPorCabezaEnFecha(meco, fechaMeco, 1)})`);
  const grupo16 = await executeTool("calcular_precio", { slug: "expedicion-tamul", adultos: 16, tourDate: fechaEn(20) });
  ok(Boolean(grupo16.error) && /m[aá]ximo/i.test(grupo16.error), `Tamul con 16 → error de máximo (${tamul.groupMax} por salida)`);

  console.log("cotizaciones contra el sitio simulado:");
  const chatP1 = "parte1-cotiza@c.us";
  clearSession(chatP1);
  const cot = await executeTool("crear_cotizacion", { slug: "expedicion-tamul", tourDate: fechaDespues, adultos: 2, nombre: "Prueba Uno", email: "prueba@test.invalid", zonaHospedaje: "Ciudad Valles" }, chatP1);
  ok(/^COT-/.test(cot.folio || ""), "crear_cotizacion devuelve un folio COT-");
  ok(cot.total === 2 * precioLista(tamul) && cot.anticipo === Math.round(cot.total * 0.3) && cot.saldo === cot.total - cot.anticipo, "total, anticipo (30 %) y saldo cuadran");
  ok(cot.vigencia === "48h" && typeof cot.venceEl === "string", "vigencia de 48 h con fecha límite");
  ok(cot.datosBanco === undefined && !String(cot.resumenWhatsApp || "").includes(PAGO.clabe), "la cotización NO trae datos bancarios");
  const enviado = calls.quote[calls.quote.length - 1] || {};
  ok(enviado.waChatId === chatP1 && enviado.zonaHospedaje === "Ciudad Valles" && enviado.locale === "es", "manda waChatId, zona de hospedaje e idioma");
  ok(getSession(chatP1).lastFolio === cot.folio, "el folio se queda en la sesión");
  const lidChat = "123456789012345@lid";
  clearSession(lidChat);
  await executeTool("crear_cotizacion", { slug: "expedicion-tamul", tourDate: fechaDespues, adultos: 2, nombre: "Prueba Lid" }, lidChat);
  ok(!(calls.quote[calls.quote.length - 1] || {}).telefono, "de un chat @lid NO se inventa teléfono");

  console.log("datos_pago:");
  const dp = await executeTool("datos_pago", { folio: "cot-test1", monto: 930 });
  ok(dp.mensaje.includes(PAGO.clabe) && dp.mensaje.includes("COT-TEST1") && tieneMonto(dp.mensaje, 930), "trae CLABE, el folio como concepto y el monto");
  ok(/OXXO/i.test(dp.mensaje) && /CLABE/.test(dp.mensaje), "aclara CLABE para transferir y tarjeta para OXXO");
  const dpSesion = await executeTool("datos_pago", {}, chatP1);
  ok(dpSesion.folio === cot.folio && dpSesion.monto === cot.anticipo, "sin folio ni monto usa los de la última cotización del chat");
  ok(dp.mensaje === mensajeDatosPago({ folio: "COT-TEST1", monto: 930, locale: "es" }), "es el mensaje de payment.js tal cual");

  console.log("consultar_politica:");
  const polRzr = await executeTool("consultar_politica", { tema: "¿El RZR cruza ríos?" });
  ok(polRzr.encontrado === true && polRzr.politicas[0].tema === "rzr", "«¿El RZR cruza ríos?» → tema rzr");
  ok(/no lo afirmes ni lo niegues|te lo confirmo/i.test(polRzr.politicas[0].texto), "la política del RZR dice que no se afirma lo de los ríos");
  const polTamasopo = await executeTool("consultar_politica", { tema: "¿me recogen en Tamasopo?" });
  ok(polTamasopo.encontrado === true && polTamasopo.politicas.some((p) => /tamasopo no recogemos|en tamasopo no/i.test(p.texto)), "Tamasopo → no recogemos");
  const polNada = await executeTool("consultar_politica", { tema: "zxqw algo random" });
  ok(polNada.encontrado === false && /escalar_a_humano/.test(polNada.instruccion), "sin respuesta → no inventa y escala");

  console.log("honestidad — hechos cerrados por tour:");
  const rappel = await executeTool("obtener_tour", { slug: "rappel-tamul" });
  ok(rappel.transporte.incluido === true && /ciudad valles/i.test(rappel.transporte.detalle || ""), "rappel: SÍ incluye traslado desde Ciudad Valles");
  ok(rappel.alimentos.desayuno === false && rappel.alimentos.comida === false, "rappel: no incluye ningún alimento");
  const raftTour = await executeTool("obtener_tour", { slug: "rafting-rio-tampaon" });
  ok(raftTour.alimentos.comida === true, "rafting: SÍ incluye comida");
  const acuatica = await executeTool("obtener_tour", { slug: "ruta-acuatica-puente-de-dios" });
  ok(acuatica.alimentos.desayuno === true && acuatica.alimentos.comida === false, "ruta acuática: desayuno SÍ, comida de mediodía NO");
  ok(TOURS.every((t) => !/profesional/i.test(t.incluyeSiempre.join(" "))), "'incluyeSiempre' no dice 'profesional'");
  const conComida = TOURS.filter((t) => t.alimentos && t.alimentos.comida).map((t) => t.slug);
  ok(conComida.join(",") === "rafting-rio-tampaon", `solo el rafting incluye comida de mediodía (${conComida.join(", ") || "ninguno"})`);
  // Se cuenta contra los que NO lo incluyen, que es el hecho que importa y no
  // cambia al agregar tours.
  const sinTraslado = TOURS.filter((t) => !t.transporte.incluido).map((t) => t.slug).sort();
  ok(sinTraslado.join(",") === "buceo-media-luna,rzr-xilitla",
    `los únicos tours SIN traslado son el RZR y el buceo (${TOURS.length - sinTraslado.length}/${TOURS.length} sí lo incluyen)`);
  const rzrFicha = await executeTool("obtener_tour", { slug: "rzr-xilitla" });
  ok(/9:00 am a 5:00 pm/i.test(rzrFicha.horaInicio || ""), "RZR: la hora la elige el cliente, de 9 am a 5 pm");

  console.log("destinos completos:");
  const mecoFicha = await executeTool("obtener_tour", { slug: "cascadas-del-meco" });
  ok(mecoFicha.destinos.length === meco.destinos.length && mecoFicha.destinos.length > 0, `el Meco expone sus ${meco.destinos.length} destinos`);
  ok(rzrFicha.rutas.every((r) => r.destinos.length > 0), "cada ruta del RZR llega con SUS destinos");

  console.log("cotizar_rzr filtra por capacidad:");
  const rzr4 = await executeTool("cotizar_rzr", { ruta: "Nacimiento", personas: 4 });
  ok(rzr4.opciones.every((o) => o.plazas >= 4), "con 4 personas no ofrece unidades de 2 plazas");
  ok(rzr4.opciones.length > 0 && rzr4.opciones[0].precio <= rzr4.opciones[rzr4.opciones.length - 1].precio, "ordena las unidades de menor a mayor precio");
  const rzr20 = await executeTool("cotizar_rzr", { ruta: "Nanacatli", personas: 20 });
  ok(Boolean(rzr20.error) && Array.isArray(rzr20.combinaciones) && rzr20.combinaciones.every((c) => c.plazas >= 20),
    "20 personas no caben en una unidad: da combinaciones calculadas por código");

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

  console.log("sitio simulado (lo que también usa el simulador):");
  const sim = crearSitioSimulado({ prefijo: "P1" });
  const q = await sim.api.crearCotizacion({ tourSlug: "cascadas-del-meco", tourDate: fechaEn(30), adults: 2, customerName: "Sim Uno", waChatId: "sim1@c.us" });
  ok(q.ok && /^COT-P1/.test(q.data.folio), "quote → COT-");
  const activa = await sim.api.cotizacionActiva({ chatId: "sim1@c.us" });
  ok(activa.ok && activa.data.folio === q.data.folio, "cotizacion-activa la encuentra por chat");
  const c1 = await sim.api.confirmarReserva(q.data.folio, q.data.anticipo, { metodo: "transferencia" });
  ok(c1.ok && /^HP-M-/.test(c1.data.reservaFolio) && c1.data.yaConfirmada === false && c1.data.saldo === q.data.saldo, "confirm COT- → reserva HP-M- con el anticipo registrado");
  const c2 = await sim.api.confirmarReserva(q.data.folio, q.data.anticipo);
  ok(!c2.ok && c2.status === 409, "confirmar el mismo COT- otra vez → 409 (no mueve dinero)");
  const c3 = await sim.api.confirmarReserva(c1.data.reservaFolio, q.data.saldo, { metodo: "efectivo" });
  ok(c3.ok && c3.data.yaConfirmada === true && c3.data.liquidado === true, "el saldo con el HP-M- → liquidada");
  ok((await sim.api.consultarReserva("NO-EXISTE")).status === 404, "folio que no existe → 404");
  // Reemplazo (fase 2). Los casos completos, con la ficha del bot: test-ficha.js.
  const r1 = await sim.api.crearCotizacion({ tourSlug: "cascadas-del-meco", tourDate: fechaEn(30), adults: 2, customerName: "Sim Dos", waChatId: "sim2@c.us" });
  const r2 = await sim.api.crearCotizacion({ tourSlug: "cascadas-del-meco", tourDate: fechaEn(31), adults: 3, customerName: "Sim Dos", waChatId: "sim2@c.us", reemplazaA: r1.data.folio });
  ok(r2.data.reemplazo && r2.data.reemplazo.ok === true && sim.cotizaciones.get(r1.data.folio).status === "expirada",
    "reemplazaA: la anterior del mismo chat queda expirada");
  ok(String(r2.data.resumenWhatsApp).split("\n")[1] === `♻️ Esta cotización reemplaza a la ${r1.data.folio}, que ya no es válida.`,
    "el resumen lo dice en su 2.ª línea (♻️)");
  const vistaVieja = (await sim.api.consultarReserva(r1.data.folio)).data;
  ok(vistaVieja.reemplazadaPor === r2.data.folio && vistaVieja.total === undefined, "booking de la vieja: reemplazadaPor y sin montos");
  const r3 = await sim.api.crearCotizacion({ tourSlug: "cascadas-del-meco", tourDate: fechaEn(31), adults: 3, customerName: "Otro", waChatId: "otro@c.us", reemplazaA: r2.data.folio });
  ok(r3.data.reemplazo.ok === false && sim.cotizaciones.get(r2.data.folio).status === "enviada", "de OTRO chat no se reemplaza nada");

  // ─────────────── PARTE 2: CONVERSACIONES ───────────────
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log("\n⚠️  Sin ANTHROPIC_API_KEY — se omiten las pruebas de conversación.\n");
    return done();
  }

  console.log("\n=== Parte 2: conversaciones (Claude real, sitio simulado) ===\n");

  // Escenario A: precio del RZR (por vehículo)
  await scenario("Precio RZR (por vehículo)", "5211111111@c.us", [
    "Hola! cuánto cuesta el recorrido en RZR para 2 personas?",
  ], (last) => {
    const n = norm(last);
    soft(tieneMonto(last, rzrTour.precio) || n.includes("ruta") || n.includes("vehiculo") || n.includes("unidad"), `da 'desde $${rzrTour.precio}' o pregunta ruta/vehículo`);
    soft(n.includes("vehiculo") || n.includes("unidad") || n.includes("por rzr") || n.includes("no es por persona") || tieneMonto(last, rzrTour.precio), "trata el RZR como por vehículo");
  });

  // Escenario B: el rappel SÍ trae traslado desde Ciudad Valles (decisión del 6 oct)
  await scenario("Rappel — traslado y comida", "5212222222@c.us", [
    "el rappel de tamul incluye transporte y comida?",
  ], (last) => {
    const n = norm(last);
    soft(n.includes("valles") && /inclu/.test(n), "dice que SÍ incluye el traslado desde Ciudad Valles");
    soft(!afirma(last, /no incluye (el )?(transporte|traslado)/i), "NO dice que el rappel no trae traslado");
    soft(/no inclu|sin (comida|alimentos)|no va incluid/.test(n), "aclara que no incluye comida");
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
  await scenario("Cotización por transferencia", "5214444444@c.us", [
    "Quiero la Expedición Tamul para 2 adultos",
    `El ${fechaNatural(fechaEn(60))}, nos quedamos en Ciudad Valles`,
    "Prefiero pagar por transferencia. Mi nombre es Juan Prueba, juan@test.invalid",
  ], (last, ctx) => {
    ok(ctx.llamadas.quote.length >= 1, "creó la cotización (crear_cotizacion → /api/bot/quote)");
    const folio = ctx.llamadas.quote.length ? [...sitio.cotizaciones.keys()].pop() : null;
    soft(folio && last.includes(folio), "el mensaje final incluye el folio COT-");
    soft(last.includes(PAGO.clabe), "trae la CLABE (datos_pago)");
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
    soft(PAQUETES.some((p) => n.includes(norm(p.nombre).split(" ")[0])), "menciona algún paquete por nombre");
    soft(PAQUETES.some((p) => tieneMonto(last, p.precio) || (p.promo && tieneMonto(last, p.promo.precio))), "incluye algún precio de paquete (el de lista o el de temporada de data.json)");
    soft(!n.includes("esencial"), "NO menciona el paquete 'Esencial' (ya no existe)");
  });

  // Escenario G: destino con datos prácticos
  const entradaPozas = Number(String((findDestino("las pozas") || {}).precioEntrada || "").replace(/\D/g, ""));
  await scenario("Destino — Las Pozas", "5217777777@c.us", [
    "¿cuánto cuesta entrar a Las Pozas de Xilitla y cómo llego?",
  ], (last) => {
    soft(entradaPozas ? tieneMonto(last, entradaPozas) : true, `da la entrada de $${entradaPozas}`);
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
    soft(!afirma(last, /profesional/i), "NO afirma que las fotos sean 'profesionales'");
    soft(/foto/i.test(last) && /(guía|guia|recorrido)/i.test(last), "las describe como las que toma el guía en el recorrido");
  });

  // Escenario J: comidas — ningún tour es todo incluido (el rafting sí trae comida)
  await scenario("Comidas: desayuno (y la comida del rafting)", "5210101010@c.us", [
    "Oye y la comida está incluida en los tours? o es todo incluido?",
  ], (last) => {
    const n = norm(last);
    soft(n.includes("desayuno"), "menciona que lo incluido es el desayuno");
    soft(!afirma(last, /\bs[íi],?\s+(es\s+)?todo inclu/i), "NO afirma que sea 'todo incluido'");
  });

  // Escenario K: transporte — no prometer de más (RZR y buceo no lo traen)
  await scenario("Transporte: no prometer de más", "5210202020@c.us", [
    "Todos los tours incluyen que pasen por mí a mi hotel verdad? el rappel también?",
  ], (last) => {
    const n = norm(last);
    soft(n.includes("rappel") && n.includes("valles"), "en el rappel: el traslado es desde Ciudad Valles");
    soft(!afirma(last, /todos los tours inclu[yi]/i), "NO afirma que todos incluyen traslado");
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
    `Dame el detalle completo del ${findPaquete("gran-huasteca") ? "Paquete Gran Huasteca" : PAQUETES[0].nombre}`,
  ], (last) => {
    ok(!/\*\*/.test(last), "la respuesta NO lleva ** (markdown) al cliente");
    ok(!/^\s*#{1,6}\s/m.test(last), "la respuesta NO lleva ### (markdown) al cliente");
  });

  // Escenario N: lugar del que NO tenemos ficha — no inventarlo
  await scenario("Lugar sin ficha: no inventar", "5210505050@c.us", [
    "Qué me puedes contar de la Cueva de las Quilas? qué se ve ahí?",
  ], (last) => {
    const n = norm(last);
    const admite = /no (lo )?(tengo|encuentro|cuento|aparece)|no (esta|figura) (registrad|en nuestro)|no lo tengo registrad/.test(n);
    soft(admite, "admite que no tiene la ficha de ese lugar");
    soft(!n.includes("salitre") || admite, "no pasa la ficha del Salitre como si fuera la de las Quilas");
  });

  // ── EMBUDO DE VENTA ─────────────────────────────────────────
  console.log("\n══ embudo de venta ══");

  await scenario("Embudo: saludo suelto", "5210000091@c.us", ["hola"], (r) => {
    soft(lineas(r) <= 6, `el saludo cabe en 6 líneas (fueron ${lineas(r)})`);
    ok(pideFecha(r) && pidePersonas(r), "el saludo pide FECHA y PERSONAS de una vez");
    soft(!/•/.test(r) || lineas(r) <= 6, "no le suelta el catálogo de entrada");
  });

  await scenario("Embudo: pregunta de precio directa", "5210000092@c.us", [
    "cuanto cuesta el tour de tamul?",
  ], (r) => {
    const promo = promoDe(tamul);
    ok(tieneMonto(r, precioLista(tamul)) || (promo && tieneMonto(r, promo.precio)), `da el precio por persona ($${precioLista(tamul)}${promo ? ` o $${promo.precio} de temporada` : ""}), no lo esquiva`);
    ok(pideFecha(r) || pidePersonas(r), "y en el mismo mensaje pide fecha o personas");
  });

  await scenario("Embudo: de hola a propuesta con total", "5210000093@c.us", [
    "hola",
    `somos 4 adultos, para el ${fechaNatural(fechaEn(25))}, nos hospedamos en Xilitla`,
    "queremos cascadas",
  ], (r) => {
    soft(lineas(r) <= 9, `la propuesta cabe en 9 líneas (fueron ${lineas(r)})`);
    ok(/\$\s?[\d,]{4,}/.test(r), "da un TOTAL en pesos, no solo el precio por persona");
    soft(/aparta|anticipo|30\s?%/i.test(r), "menciona con cuánto se aparta");
    ok(/\?/.test(r), "termina preguntando algo (empuja el cierre)");
  });

  await scenario("Embudo: grupo por debajo del mínimo", "5210000094@c.us", [
    `somos 2 personas y queremos hacer rafting el ${fechaNatural(fechaEn(30))}`,
  ], (r) => {
    ok(/m[ií]nimo|5 personas|no pod|necesit/i.test(r), "avisa que el grupo no llega al mínimo del rafting");
    ok(!tieneMonto(r, 2 * precioEnFecha(rafting, fechaEn(30))), "NO cotiza el rafting para 2 personas (ese tour no sale)");
  });

  // ── OBJECIONES ──────────────────────────────────────────────
  console.log("\n══ objeciones ══");

  await scenario("Objeción: está caro", "5210000095@c.us", [
    `hola, somos 2 para el ${fechaNatural(fechaEn(20))}, queremos la expedición tamul, nos quedamos en Ciudad Valles`,
    "uf, está caro",
  ], (r) => {
    ok(/incluye|seguro|gu[ií]a|entrada|desayuno/i.test(r), "desglosa lo que sí va incluido");
    soft(/30\s?%|aparta|anticipo/i.test(r), "recuerda que hoy solo pone el 30 %");
    ok(!afirma(r, /descuento|rebaja|te lo dejo en/i), "NO inventa un descuento");
  });

  await scenario("Objeción: lo voy a pensar", "5210000096@c.us", [
    `somos 3 para el ${fechaNatural(fechaEn(15))}, la ruta surrealista, nos quedamos en Xilitla`,
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
    const maxGrupo = Math.max(...TOURS.map((t) => Number(t.groupMax) || 0));
    soft(new RegExp(`\\b${maxGrupo}\\b|grupos peque`, "i").test(r), "menciona los grupos pequeños");
  });

  await scenario("Objeción: pago todo el día del tour", "5210000098@c.us", [
    `quiero la ruta acuática el ${fechaNatural(fechaEn(18))} para 4, nos quedamos en Ciudad Valles`,
    "puedo pagar todo el mero día del tour?",
  ], (r) => {
    ok(/30\s?%|anticipo|aparta/i.test(r), "explica que se aparta con el 30 %");
    ok(!/claro que s[ií].{0,40}el d[ií]a del tour/i.test(r), "NO dice que sí puede pagar todo el día del tour");
  });

  // ── LO QUE PIDE EL PLAN (26 chats reales) ───────────────────
  console.log("\n══ escenarios del plan ══");

  // 1. El mensaje prellenado del botón de WhatsApp de la ficha del tour.
  // Copia del formato de WA_MESSAGES.tour (src/lib/whatsapp.ts): si cambia allá, cámbialo aquí.
  const prellenado = `Hola, me interesa el tour "${tamul.nombre}" para 2 adultos. Total estimado: $${(precioLista(tamul) * 2).toLocaleString("es-MX")} MXN. ¿Tienen disponibilidad?`;
  await scenario("Plan 1: mensaje prellenado del sitio", "5210000201@c.us", [prellenado], (r) => {
    ok(!pidePersonas(r), "NO vuelve a preguntar cuántas personas (ya venía en el mensaje)");
    ok(pideFecha(r), "pide la fecha");
    soft(pideZona(r), "pregunta dónde se hospedan");
  });

  // 2. Zona de hospedaje antes de proponer.
  await scenario("Plan 2: pregunta la zona antes de proponer", "5210000202@c.us", [
    `Hola! somos 4 adultos y queremos conocer cascadas el ${fechaNatural(fechaEn(21))}`,
  ], (r, ctx) => {
    ok(!ctx.llamadas.quote.length && !ctx.llamadas.paquete.length && !ctx.llamadas.lead.length, "no cotiza todavía (le falta la zona)");
    soft(pideZona(r), "pregunta dónde se hospedan");
  });

  // 3. Viajero solo (bajo el mínimo): no se rechaza; paga tarifa normal y la salida se confirma después.
  const fViajero = fechaEn(26);
  const totalViajero = precioPorCabezaEnFecha(meco, fViajero, 1);
  await scenario("Plan 3: viajero solo", "5210000203@c.us", [
    `Hola, voy a ir solo. Quiero las Cascadas del Meco el ${fechaNatural(fViajero)} y me hospedo en Ciudad Valles. ¿Cuánto sale?`,
  ], (r, ctx) => {
    ok(ctx.herramientas.some((h) => h.nombre === "calcular_precio" && h.entrada.slug === "cascadas-del-meco" && Number(h.entrada.adultos) === 1),
      "calculó el precio del Meco para 1 persona");
    ok(tieneMonto(r, totalViajero), `da la tarifa normal de una persona ($${totalViajero})`);
  });

  // 4. Tamul antes / después de que vence la promo (la decide la fecha del TOUR).
  if (fechaAntes) {
    const esperado = 2 * precioEnFecha(tamul, fechaAntes);
    await scenario(`Plan 4a: Tamul el ${fechaAntes} (con promo)`, "5210000204@c.us", [
      `Quiero la Expedición Tamul para 2 adultos el ${fechaNatural(fechaAntes)}, nos quedamos en Xilitla. ¿Cuánto es en total?`,
    ], (r) => ok(tieneMonto(r, esperado), `total con promo = $${esperado}`));
  }
  {
    const esperado = 2 * precioEnFecha(tamul, fechaDespues);
    await scenario(`Plan 4b: Tamul el ${fechaDespues} (sin promo)`, "5210000205@c.us", [
      `Quiero la Expedición Tamul para 2 adultos el ${fechaNatural(fechaDespues)}, nos quedamos en Xilitla. ¿Cuánto es en total?`,
    ], (r) => {
      ok(tieneMonto(r, esperado), `total de lista = $${esperado}`);
      if (promoTamul) ok(!tieneMonto(r, 2 * promoTamul.precio), "NO le aplica la promo a un tour después de que vence");
    });
  }

  // 5. Paquete con niños: el precio de pareja NO es el total.
  const paq = findPaquete("gran-huasteca") || PAQUETES[0];
  const fPaq = fechaEn(40);
  await scenario("Plan 5: paquete 2 adultos + 2 niños", "5210000206@c.us", [
    `Hola, nos interesa el ${paq.nombre} llegando el ${fechaNatural(fPaq)}. Somos 2 adultos y 2 niños, de 8 y de 2 años. ¿Cuánto sería?`,
  ], (r, ctx) => {
    const conNinos = ctx.herramientas.some((h) => ["obtener_paquete", "registrar_cotizacion"].includes(h.nombre) &&
      (Number(h.entrada.ninosMid) || 0) + (Number(h.entrada.ninosSmall) || 0) > 0);
    ok(conNinos, "manda los niños a la cuenta (obtener_paquete / registrar_cotizacion)");
    // El de pareja de lista y, si sigue la promo, el de temporada: ninguno es el total de 4.
    for (const pareja of [paq.precio, paq.promo && paq.promo.precio].filter(Boolean)) {
      ok(!new RegExp(`total[^\\n]{0,40}${montoRe(pareja).source}`, "i").test(r), `NO da el precio de pareja ($${pareja}) como total`);
    }
    const grupo = ctx.herramientas.map((h) => h.salida && h.salida.precioParaElGrupo).find(Boolean);
    soft(grupo && tieneMonto(r, grupo.total), "da el total del grupo que calculó el sitio");
  });

  // 6. Grupo de 16 en un tour de máximo 14: avisa como grupo, sin pasar el chat.
  await scenario("Plan 6: grupo de 16", "5210000207@c.us", [
    `Somos 16 amigos de la oficina y queremos la Expedición Tamul el ${fechaNatural(fechaEn(35))}, nos quedamos en Ciudad Valles. ¿Cuánto sería?`,
  ], (r, ctx) => {
    ok(ctx.escalaciones.some((e) => e.motivo === "grupo"), "avisa al equipo como «grupo»");
    ok(!ctx.escalaciones.some((e) => e.modo === "pasar"), "NO pasa el chat (sigue atendiendo)");
    ok(!ctx.llamadas.quote.some((p) => Number(p.adults) >= 16), "NO cotiza 16 en una salida");
  });

  // 7a. «¿Me puedes marcar?» → la regla rápida pasa el chat sin el modelo.
  await scenario("Plan 7a: «¿me puedes marcar?» (regla rápida)", "5210000208@c.us", [
    "Oye mejor ¿me puedes marcar? para explicarte",
  ], (r, ctx) => {
    ok(ctx.escalaciones.some((e) => e.regla && e.modo === "pasar"), "pasa el chat al equipo sin gastar el modelo");
  });

  // 7b. Una forma de pedir llamada que la regla no ve: la decide el modelo.
  await scenario("Plan 7b: pide llamada con otras palabras", "5210000209@c.us", [
    "Mejor échame un telefonazo y lo platicamos, ¿va?",
  ], (r, ctx) => {
    ok(ctx.escalaciones.some((e) => e.modo === "pasar"), "escalar_a_humano en modo «pasar»");
    soft(ctx.escalaciones.some((e) => ["llamada", "pide_humano"].includes(e.motivo)), "motivo llamada / pide_humano");
    soft(/hora/i.test(r), "pregunta a qué hora le marcan");
  });

  // 8. «Soy agente de viajes» NO es pedir un humano: se cotiza.
  const fAgente = fechaEn(28);
  const ruta = findTour("ruta-surrealista-edward-james");
  await scenario("Plan 8: agente de viajes", "5210000210@c.us", [
    `Hola, soy agente de viajes y tengo 4 clientes que quieren la Ruta Surrealista el ${fechaNatural(fAgente)}, se hospedan en Xilitla. ¿Cuánto sería?`,
  ], (r, ctx) => {
    ok(!ctx.escalaciones.some((e) => e.modo === "pasar"), "NO pasa el chat");
    ok(tieneMonto(r, 4 * precioPorCabezaEnFecha(ruta, fAgente, 4)) || ctx.herramientas.some((h) => h.nombre === "calcular_precio"), "cotiza (calcula el precio de los 4, con el precio de grupo si la fecha no lleva promo)");
    soft(!ctx.escalaciones.length, "ni siquiera avisa: es una venta normal");
  });

  // 9. «El guía no llega»: urgente, pasa el chat, sin prometer compensaciones.
  await scenario("Plan 9: «el guía no llega»", "5210000211@c.us", [
    "Buenos días, son las 8:40 y el guía no llega, estamos esperando en el hotel en Xilitla 😟",
  ], (r, ctx) => {
    ok(ctx.escalaciones.some((e) => e.urgencia === "urgente" && e.modo === "pasar"), "escala URGENTE y pasa el chat");
    soft(ctx.escalaciones.some((e) => e.motivo === "queja_incidente"), "motivo queja_incidente");
    ok(!afirma(r, /descuento|reembols|compensaci[oó]n|cortes[ií]a|gratis|te regalamos|sin costo/i), "NO promete compensación");
  }, { preparar: (chat) => prepararReserva(chat, { tourDate: HOY, zona: "Xilitla" }), reservaPagada: true });

  // 10. Cancelación después de pagar: pasa el chat.
  await scenario("Plan 10: cancelación con anticipo pagado", "5210000212@c.us", [
    "Hola, al final ya no vamos a poder ir 😞 quiero cancelar mi reserva, ¿me regresan el anticipo?",
  ], (r, ctx) => {
    ok(ctx.escalaciones.some((e) => ["cancelacion", "cambio_post_pago"].includes(e.motivo) && e.modo === "pasar"), "escala la cancelación y pasa el chat");
    soft(!afirma(r, /te (regresamos|devolvemos|reembolsamos)/i), "NO promete montos de reembolso");
  }, { preparar: (chat) => prepararReserva(chat, { tourDate: fechaEn(12), zona: "Ciudad Valles" }), reservaPagada: true });

  // 11. En inglés: contesta en inglés, en MXN y con el 30 %.
  await scenario("Plan 11: cliente en inglés", "5210000213@c.us", [
    `Hi! We're 2 adults and we'd like to book the Tamul Expedition on ${fechaNatural(fechaEn(33), "en")}. We're staying in Ciudad Valles. How much would it be?`,
  ], (r) => {
    ok(medios.idiomaProbable(r) === "en", "contesta en inglés");
    ok(getSession("5210000213@c.us").locale === "en", "la sesión queda en inglés (correo y plantillas en inglés)");
    ok(/MXN|pesos/i.test(r), "da el precio en MXN");
    soft(/30\s?%|deposit/i.test(r), "menciona el anticipo del 30 %");
    soft(!afirma(r, /bilingual guide|english[- ]speaking guide|guide (who )?speaks (fluent )?english/i), "NO promete guía bilingüe");
  }, { locale: "en" });

  // 12. Ya mandó el comprobante y pregunta «¿ya quedó?»: nunca «confirmada».
  await scenario("Plan 12: comprobante en el historial + «¿ya quedó?»", "5210000214@c.us", [
    "¿ya quedó mi reserva?",
  ], (r, ctx) => {
    ok(!afirma(r, CONFIRMADA_RE), "NO dice que la reserva ya está confirmada");
    soft(/valid|revis|equipo|verif/i.test(r), "dice que el equipo lo está validando");
    soft(!r.includes(PAGO.clabe) && !ctx.herramientas.some((h) => h.nombre === "datos_pago"), "NO le vuelve a pedir el pago");
  }, { preparar: prepararComprobante });

  // 13. Golondrinas no va dentro de Tamul.
  await scenario("Plan 13: Golondrinas", "5210000215@c.us", [
    "¿La Expedición Tamul pasa por el Sótano de las Golondrinas?",
  ], (r) => {
    ok(!afirma(r, /golondrinas[^.\n]{0,60}(inclu|visita|pasa|conoce|entra)|(inclu|visita|pasa|conoce|entra)[^.\n]{0,60}golondrinas/i), "NO dice que Tamul visite Golondrinas");
    soft(/huahuas|por tu cuenta|aquism[oó]n|cerca/i.test(r), "ofrece lo que sí hay (Huahuas o ir por su cuenta)");
  });

  // 14. Check-in y check-out (datos confirmados del 6 oct, sacados de data.json).
  const horaRe = (txt) => {
    const m = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i.exec(String(txt || "").trim());
    if (!m) return /$^/;
    const h = Number(m[1]);
    const h24 = m[3].toLowerCase() === "pm" && h < 12 ? h + 12 : h;
    return new RegExp(`\\b${h}(:00)?\\s?(${m[3][0]}\\.?\\s?m\\.?|de la (tarde|mañana))|\\b${h24}:00\\b|\\b${h24}\\s?(h|hrs)\\b`, "i");
  };
  await scenario("Plan 14: check-in y check-out", "5210000216@c.us", [
    "Si reservamos el hotel con ustedes, ¿a qué hora es el check-in y el check-out?",
  ], (r) => {
    ok(horaRe(INFO.hotelServicios.checkIn).test(r), `check-in ${INFO.hotelServicios.checkIn}`);
    soft(horaRe(INFO.hotelServicios.checkOut).test(r) || /mediod[ií]a/i.test(r), `check-out ${INFO.hotelServicios.checkOut}`);
  });

  // 15. RZR: hora de inicio a elegir (9–17) y nunca afirmar que cruza ríos.
  await scenario("Plan 15: horario del RZR y los ríos", "5210000217@c.us", [
    "¿A qué hora empieza el recorrido en RZR?",
    "¿y en el RZR cruzamos ríos?",
  ], (r, ctx) => {
    ok(/\b9(:00)?\s?(a\.?\s?m\.?)?[^\n]{0,40}\b(5(:00)?\s?(p\.?\s?m\.?|de la tarde)|17(:00)?)/i.test(ctx.respuestas[0]), "la hora la elige el cliente entre 9 am y 5 pm");
    ok(!afirma(r, /cruza(mos|n|s)? (el |los |un |varios |algunos )?r[ií]os?|s[ií],? (se )?cruza/i), "NO afirma que cruza ríos");
  });

  // 16. «¿Tienen algo para hoy?»: urgente, al equipo.
  await scenario("Plan 16: para hoy", "5210000218@c.us", [
    "Hola! ¿tienen algún tour para hoy? somos 2 y estamos en Ciudad Valles",
  ], (r, ctx) => {
    ok(ctx.escalaciones.some((e) => e.urgencia === "urgente"), "escala URGENTE");
    soft(ctx.escalaciones.some((e) => e.motivo === "para_hoy" && e.modo === "pasar"), "motivo para_hoy, pasando el chat");
    soft(/mañana|tomorrow/i.test(r), "ofrece mañana");
  });

  // 17. Recogida en Tamasopo: no, y una alternativa.
  await scenario("Plan 17: recogida en Tamasopo", "5210000219@c.us", [
    "Nos vamos a hospedar en Tamasopo. ¿Pasan por nosotros para la Expedición Tamul?",
  ], (r) => {
    ok(/no (pasamos|recogemos|tenemos|hay|llegamos|cubrimos|incluye|es posible)|solo (pasamos|recogemos)|[uú]nicamente|por log[ií]stica/i.test(r), "dice que en Tamasopo no recogen");
    soft(/valles|xilitla/i.test(r), "ofrece una alternativa (Ciudad Valles o Xilitla)");
  });

  // ── CAMBIOS Y LA PRUEBA DE MANOLO (fase 2) ──────────────────
  // Con Haiku, el 6 oct: el bot brincó de «¿dónde nos quedamos?» al «¿te lo
  // aparto?», inventó «como les dije» y un traslado «sin costo extra», dijo
  // «Lirios 2 está reservada para ustedes» y, tras el comprobante, pidió el
  // comprobante. Y cada cambio dejaba viva la cotización anterior.
  console.log("\n══ cambios y la prueba de Manolo ══");

  // 18. «Mejor el domingo y somos 5»: la nueva REEMPLAZA a la anterior.
  const sabado = proximoDia(fechaEn(20), 6);
  const domingo = sumarDias(sabado, 1);
  const cambio = {};
  await scenario("Cambio: «mejor el domingo y somos 5»", "5210000301@c.us", [
    `Mejor el domingo ${fechaNatural(domingo)} y somos 5`,
    "Sí, mándame la nueva porfa",
  ], (r, ctx) => {
    const rep = revisarReemplazos(ctx.chatId, cambio.folio);
    console.log(`  🧾 ${cambio.folio} → ${rep.nuevas.join(" → ") || "(ninguna nueva)"}`);
    ok(rep.nuevas.length >= 1, "recotizó con el cambio (otra cotización)");
    ok(rep.rotas.length === 0, `cada cotización nueva reemplazó a la anterior (reemplazaA lo pone el código)${rep.rotas.map((c) => `\n       ${c.folio}: reemplazaA=${c.reemplazaA || "—"} (esperaba ${c.anterior})`).join("")}`);
    ok(rep.vivas.length === 1, `queda UNA sola cotización viva del chat (hay ${rep.vivas.join(", ") || "ninguna"})`);
    const vigente = sitio.cotizaciones.get(rep.nuevas[rep.nuevas.length - 1]) || {};
    ok(vigente.tourDate === domingo && Number(vigente.adults) === 5, "la vigente es la del domingo para 5");
    ok((sitio.cotizaciones.get(cambio.folio) || {}).status === "expirada", "la del sábado quedó expirada (no le llegan sus correos)");
    const f = getSession(ctx.chatId).ficha;
    ok(f.folioVigente === vigente.folio && f.foliosReemplazados.includes(cambio.folio), "la ficha: vigente la nueva, la del sábado en reemplazadas");
    soft(ctx.respuestas.some((t) => t.includes("♻️") || /reemplaza/i.test(t)), "le dice que la nueva reemplaza a la anterior");
    soft(!r.includes(cambio.folio) || /reemplaz|ya no (vale|es v[aá]lida)/i.test(r), "no le pide pagar el folio viejo");
  }, { preparar: (chat) => cotizarPrevio(chat, cambio, { tourDate: sabado, adultos: 4, zona: "Ciudad Valles" }) });

  // 19. Agrega el hotel y luego lo quita: dos reemplazos, una sola viva.
  const fHotel = fechaEn(30);
  const hab = (HABITACIONES[0] || {}).nombre || "Orquídeas 2";
  const conHotel = {};
  await scenario("Cambio: agrega el hotel y luego lo quita", "5210000302@c.us", [
    `¿Nos pueden agregar hotel con ustedes? La habitación ${hab}, llegamos el ${fechaNatural(sumarDias(fHotel, -1))} y nos vamos el ${fechaNatural(sumarDias(fHotel, 1))}, somos los mismos 2`,
    "Sí, mándame la cotización con el hotel",
    "Pensándolo bien, mejor sin hotel, solo el tour. Mándame la cotización sin el hotel",
  ], (r, ctx) => {
    const rep = revisarReemplazos(ctx.chatId, conHotel.folio);
    console.log(`  🧾 ${conHotel.folio} → ${rep.nuevas.join(" → ") || "(ninguna nueva)"}`);
    ok(rep.nuevas.some((folio) => (sitio.cotizaciones.get(folio) || {}).hospedaje), "cotizó CON el hotel");
    ok(rep.rotas.length === 0, `cada cotización nueva reemplazó a la anterior${rep.rotas.map((c) => `\n       ${c.folio}: reemplazaA=${c.reemplazaA || "—"} (esperaba ${c.anterior})`).join("")}`);
    ok(rep.vivas.length === 1, `queda UNA sola cotización viva (hay ${rep.vivas.join(", ") || "ninguna"})`);
    const vigente = sitio.cotizaciones.get(rep.nuevas[rep.nuevas.length - 1]) || {};
    ok(rep.nuevas.length >= 2 && !vigente.hospedaje && !vigente.paquete, "la vigente va SIN hotel");
    ok(getSession(ctx.chatId).ficha.hotel === null, "y la ficha ya no tiene hotel");
    ok(!afirma(ctx.respuestas.join("\n"), RESERVADA_RE), "nunca dice que la habitación quedó reservada/apartada");
  }, { preparar: (chat) => cotizarPrevio(chat, conHotel, { tourDate: fHotel, adultos: 2, zona: "Xilitla" }) });

  // 20. Cambio DESPUÉS del comprobante: no se recotiza, lo ve el equipo.
  await scenario("Cambio después del comprobante", "5210000303@c.us", [
    `Oigan, ¿lo podemos cambiar para el ${fechaNatural(fechaEn(26))}? Ahora somos 3`,
  ], (r, ctx) => {
    const cotizo = ctx.llamadas.quote.length + ctx.llamadas.paquete.length + ctx.llamadas.lead.length;
    ok(cotizo === 0, "NO manda otra cotización (las herramientas de cotizar están bloqueadas)");
    ok(ctx.escalaciones.some((e) => e.motivo === "cambio_post_pago" && e.modo === "pasar"), "escala cambio_post_pago y pasa el chat");
    ok(!r.includes(PAGO.clabe) && !/c[oó]mo prefieres pagar/i.test(r), "NO le vuelve a pedir el pago");
    ok(!afirma(r, CONFIRMADA_RE), "NO dice que ya quedó confirmada");
    soft(/equipo|revis|te (escribe|contacta)|por aqu[ií]/i.test(r), "dice que el equipo lo revisa con él");
  }, { preparar: prepararComprobante });

  // 21. «¿Dónde nos recomiendan quedarnos?»: se contesta; no se cotiza ni se cierra.
  await scenario("Pregunta: «¿dónde nos recomiendan quedarnos?»", "5210000304@c.us", [
    `Hola! Somos 2 adultos y queremos la Expedición Tamul y la Ruta Surrealista, llegamos el ${fechaNatural(fechaEn(24))}`,
    "No conocemos la zona, ¿dónde nos recomiendan quedarnos?",
  ], (r, ctx) => {
    const t2 = ctx.porTurno[1] || { llamadas: {}, herramientas: [] };
    const cotizo = ["quote", "paquete", "lead"].reduce((a, k) => a + (t2.llamadas[k] || []).length, 0);
    ok(cotizo === 0, "en ESE mensaje no cotiza: primero contesta la pregunta");
    ok(t2.herramientas.some((h) => h.nombre === "consultar_politica"), "usa consultar_politica (tema donde-hospedarse)");
    ok(!/\baparto\b|\bse los aparto\b|\bte lo aparto\b/i.test(r) && !afirma(r, /apartad[oa]s?|reservad[oa]s?/i), "no dice «aparto / apartado / reservado»");
    soft(/xilitla/i.test(r) && /valles/i.test(r), "explica Xilitla vs Ciudad Valles según sus tours");
    soft(!tieneMonto(r, 2 * precioEnFecha(tamul, fechaEn(24))), "no brinca al precio en esa respuesta");
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
  // Las reglas del español de México no aplican a las respuestas en inglés.
  const enEspanol = todasLasRespuestas.filter((r) => r.locale !== "en");

  // Es una empresa mexicana: el voseo suena a bot extranjero.
  // OJO: "liquidas" SIN acento es el tú correcto — solo "liquidás" es voseo.
  const VOSEO = /\b(vos|ten[eé]s|pod[eé]s|quer[eé]s|liquidás|sabés|fijate|contame|decime|vosotros|os invitamos)\b/i;
  const conVoseo = enEspanol.filter((r) => VOSEO.test(r.texto));
  ok(conVoseo.length === 0, `ninguna respuesta usa voseo${detalle(conVoseo, VOSEO)}`);

  // Casi todos los tours son de 8–10 h. Decir "medio día" le arruina el día al cliente.
  const cortos = new Set(TOURS.filter((t) => Number(t.duracionHrs) <= 5).map((t) => t.slug));
  const largos = TOURS.filter((t) => !cortos.has(t.slug)).map((t) => norm(t.nombre.split("—")[0].trim()));
  const CORTO_RE = /medio d[ií]a|unas horitas|par de horas|actividad corta/;
  const inventaDuracion = enEspanol.filter((r) => {
    const n = norm(r.texto);
    if (!CORTO_RE.test(n)) return false;
    return largos.some((nom) => nom.length > 8 && n.includes(nom));
  });
  ok(inventaDuracion.length === 0, `no llama "medio día" a un tour de 8–10 h${detalle(inventaDuracion, /medio d[ií]a|unas horitas|par de horas|actividad corta/i)}`);

  // Nunca "todo incluido", en ninguna respuesta de toda la corrida.
  const TODO_INC = /todo incluido|all[- ]inclusive/i;
  const todoIncluido = todasLasRespuestas.filter((r) => afirma(r.texto, TODO_INC) && !/no (es|son) "?todo incluido|ning[uú]n (tour|paquete) es/i.test(r.texto));
  ok(todoIncluido.length === 0, `nunca dice "todo incluido"${detalle(todoIncluido, TODO_INC)}`);

  // Markdown que WhatsApp no entiende, en cualquier respuesta.
  const MD = /\*\*|^###|^---$/m;
  const conMarkdown = todasLasRespuestas.filter((r) => MD.test(r.texto));
  ok(conMarkdown.length === 0, `ninguna respuesta lleva markdown (** ### ---)${detalle(conMarkdown, MD)}`);

  // 🔴 «Reserva confirmada» solo la dice /confirma (cuando Manolo validó el
  // pago). Se exentan los escenarios cuya reserva SÍ está pagada.
  const diceConfirmada = todasLasRespuestas.filter((r) => !r.reservaPagada && afirma(r.texto, CONFIRMADA_RE));
  ok(diceConfirmada.length === 0, `el bot nunca dice «reserva confirmada» por su cuenta${detalle(diceConfirmada, CONFIRMADA_RE)}`);

  // 🔴 Nada queda apartado sin el anticipo validado («Lirios 2 está reservada
  // para ustedes», prueba de Manolo). Se exentan las reservas YA pagadas.
  const reservada = todasLasRespuestas.filter((r) => !r.reservaPagada && afirma(r.texto, RESERVADA_RE));
  ok(reservada.length === 0, `nunca dice «reservada / apartada para ustedes» sin pago${detalle(reservada, RESERVADA_RE)}`);

  // 🔴 Ningún traslado «sin costo» / «gratis» que no diga una herramienta
  // («los pasamos de Valles a Xilitla sin costo extra», inventado). Sin
  // afirma(): «sin» cuenta como negación y la dejaría pasar.
  const trasladoGratis = todasLasRespuestas.filter((r) => SIN_COSTO_TRASLADO_RE.test(sinServiciosGratis(r.texto)));
  ok(trasladoGratis.length === 0, `nunca promete un traslado «sin costo» o «gratis»${detalle(trasladoGratis, SIN_COSTO_TRASLADO_RE)}`);

  // 🔴 «Como les dije…» cuando nunca se lo dijo (prueba de Manolo).
  const comoDije = todasLasRespuestas.filter((r) => COMO_DIJE_RE.test(r.texto));
  ok(comoDije.length === 0, `nunca dice «como te dije / como les dije»${detalle(comoDije, COMO_DIJE_RE)}`);

  console.log(`  (revisadas ${todasLasRespuestas.length} respuestas)`);

  done();
}

// ── Preparación de escenarios ─────────────────────────────────
/** Una reserva ya pagada (anticipo validado con /confirma) en ese chat. */
async function prepararReserva(chatId, { tourDate, zona }) {
  const q = await sitio.api.crearCotizacion({
    tourSlug: "expedicion-tamul", tourDate, adults: 2, customerName: "Ana Prueba",
    customerEmail: "ana@test.invalid", waChatId: chatId, zonaHospedaje: zona,
  });
  if (!q.ok) throw new Error(`no pude preparar la cotización: ${q.data.error}`);
  const c = await sitio.api.confirmarReserva(q.data.folio, q.data.anticipo, { metodo: "transferencia" });
  if (!c.ok) throw new Error(`no pude preparar la reserva: ${c.data.error}`);
  const s = getSession(chatId);
  s.lastFolio = c.data.reservaFolio;
  s.nombre = "Ana Prueba";
  s.zonaHospedaje = zona;
  pushHistory(chatId, "user", `Quiero la Expedición Tamul para 2, nos quedamos en ${zona}`);
  pushHistory(chatId, "assistant", q.data.resumenWhatsApp);
  pushHistory(chatId, "user", `[sistema] El equipo validó el pago de ${q.data.folio} (reserva ${c.data.reservaFolio}): pagado $${c.data.pagado}, saldo $${c.data.saldo}. Ya se le mandó la confirmación.`);
  pushHistory(chatId, "assistant", `¡Listo, Ana! Quedó registrada tu reserva ${c.data.reservaFolio}. Un día antes tu guía te contacta. 🌿`);
  marcarPagoEnFicha(chatId, q.data.folio, c.data.reservaFolio); // lo que hace index.js tras /confirma
}

/**
 * Una cotización con el comprobante YA acusado, como lo deja index.js (fase 2):
 * la cotización sale de la herramienta del bot (llena la ficha), el turno del
 * cliente lleva la nota del comprobante EN SU LUGAR (prepararRafaga), luego el
 * acuse, y la ficha queda con el comprobante recibido.
 */
async function prepararComprobante(chatId) {
  const q = await executeTool("crear_cotizacion", {
    slug: "expedicion-tamul", tourDate: fechaEn(22), adultos: 2, nombre: "Laura Prueba",
    email: "laura@test.invalid", zonaHospedaje: "Xilitla",
  }, chatId);
  if (!q.folio) throw new Error(`no pude preparar la cotización: ${q.error}`);
  const vista = await sitio.api.consultarReserva(q.folio);
  const cot = medios.normalizarCotizacion(vista.data, q.folio);
  const acuse = medios.textoAcuseComprobante(cot, { nombre: "Laura" });
  pushHistory(chatId, "user", "Quiero la Expedición Tamul para 2, nos quedamos en Xilitla. Laura Prueba, laura@test.invalid");
  pushHistory(chatId, "assistant", `${q.resumenWhatsApp}\n\n${mensajeDatosPago({ folio: q.folio, monto: q.anticipo })}`);
  const plan = medios.prepararRafaga([
    { tipo: "texto", texto: "listo, ya pagué" },
    { tipo: "comprobante", folio: q.folio, ackText: acuse, duplicado: false },
  ]);
  pushHistory(chatId, "user", plan.textoParaModelo);
  pushHistory(chatId, "assistant", acuse);
  marcarComprobanteEnFicha(chatId, q.folio);
}

/**
 * Una cotización YA mandada en ese chat, hecha con la herramienta del bot (así
 * la ficha queda como en una plática real). Deja su folio en `destino.folio`.
 */
async function cotizarPrevio(chatId, destino, { slug = "expedicion-tamul", tourDate, adultos, zona }) {
  const t = findTour(slug);
  const q = await executeTool("crear_cotizacion", {
    slug, tourDate, adultos, nombre: "Pedro Prueba", email: "pedro@test.invalid", zonaHospedaje: zona,
  }, chatId);
  if (!q.folio) throw new Error(`no pude preparar la cotización: ${q.error}`);
  destino.folio = q.folio;
  pushHistory(chatId, "user", `Quiero la ${t.nombre.split("—")[0].trim()} para ${adultos} adultos el ${fechaNatural(tourDate)}, nos quedamos en ${zona}. Soy Pedro Prueba, pedro@test.invalid. Mándame la cotización`);
  pushHistory(chatId, "assistant", `${q.resumenWhatsApp}\n\n¿Cómo prefieres pagar: transferencia, OXXO o tarjeta en línea?`);
}

/**
 * Las cotizaciones de un chat desde `folioInicial`: las nuevas, en orden; las
 * que NO reemplazaron a la inmediata anterior (según el sitio simulado), y las
 * que siguen vivas. Con cada cambio del cliente debe quedar UNA viva.
 */
function revisarReemplazos(chatId, folioInicial) {
  const delChat = [...sitio.cotizaciones.values()].filter((c) => c.waChatId === chatId);
  const folios = delChat.map((c) => c.folio);
  const nuevas = folioInicial && folios.includes(folioInicial) ? folios.slice(folios.indexOf(folioInicial) + 1) : folios;
  const rotas = nuevas
    .map((folio, k) => {
      const anterior = k === 0 ? folioInicial : nuevas[k - 1];
      const r = calls.reemplazo.find((x) => x.folioNuevo === folio);
      return { folio, anterior, reemplazaA: r ? r.folioViejo : null, ok: Boolean(r && r.ok) };
    })
    .filter((c) => c.reemplazaA !== c.anterior || !c.ok);
  const vivas = delChat.filter((c) => !c.reservaFolio && ["enviada", "borrador"].includes(c.status)).map((c) => c.folio);
  return { nuevas, rotas, vivas };
}

// ── Correr una conversación ───────────────────────────────────
// Todo lo que contestó el bot en la corrida, para revisarlo en bloque al final.
const todasLasRespuestas = [];

/**
 * Un turno como lo atiende index.js: la regla rápida (needsHuman) pasa el
 * chat SIN el modelo; si no, processMessage. La escalación que deja el modelo
 * en la sesión se recoge y se limpia, como hace aplicarEscalacion.
 */
async function turno(chatId, texto, escalaciones) {
  if (needsHuman(texto)) {
    pushHistory(chatId, "user", texto);
    const respuesta = "¡Claro! 🙌 Ya pasé tu mensaje. Si prefieres que te llamemos, dime a qué hora te queda bien. 🌿";
    pushHistory(chatId, "assistant", respuesta);
    escalaciones.push({ motivo: "pide_humano", modo: "pasar", urgencia: "hoy", regla: true });
    return respuesta;
  }
  const respuesta = await processMessage(chatId, texto);
  const s = getSession(chatId);
  if (s.escalacion) { escalaciones.push(s.escalacion); s.escalacion = null; }
  return respuesta;
}

/** Cuántas llamadas había de cada cosa al arrancar el escenario. */
function marcar() {
  return { calls: Object.fromEntries(Object.entries(calls).map(([k, v]) => [k, v.length])), herramientas: herramientas.length };
}
function desde(m) {
  return {
    llamadas: Object.fromEntries(Object.entries(calls).map(([k, v]) => [k, v.slice(m.calls[k])])),
    herramientas: herramientas.slice(m.herramientas),
  };
}

async function scenario(name, chatId, turns, check, { preparar, locale = "es", reservaPagada = false } = {}) {
  console.log(`\n— ${name} —`);
  clearSession(chatId);
  const escalaciones = [];
  const respuestas = [];
  let last = "";
  try {
    if (preparar) await preparar(chatId);
    const m = marcar();
    // Lo que pidió el bot en CADA mensaje (p. ej. «en ese mensaje no cotizó»).
    const porTurno = [];
    for (const t of turns) {
      console.log(`  👤 ${t}`);
      const mt = marcar();
      last = await turno(chatId, t, escalaciones);
      porTurno.push(desde(mt));
      respuestas.push(last);
      todasLasRespuestas.push({ escenario: name, texto: last, locale, reservaPagada });
      console.log(`  🤖 ${last.replace(/\n/g, " ").substring(0, 220)}`);
    }
    if (escalaciones.length) console.log(`  🙋 escaló: ${escalaciones.map((e) => `${e.motivo}/${e.modo}/${e.urgencia}`).join(", ")}`);
    await check(last, { ...desde(m), escalaciones, respuestas, porTurno, chatId });
  } catch (e) {
    fail++;
    console.log(`  ❌ el escenario lanzó error: ${e.message}`);
  }
}

function done() {
  console.log(`\n════════════════════════════════════\nRESULTADO: ${pass} ✅ · ${warn} ⚠️ · ${fail} ❌\n════════════════════════════════════\n`);
  process.exit(fail > 0 ? 1 : 0);
}

run().catch((e) => { console.error("Error fatal en pruebas:", e); process.exit(1); });
