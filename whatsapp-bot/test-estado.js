// Prueba de estado.js (la memoria que sobrevive a reinicios) y de sessions.js.
// Todo en una carpeta temporal del sistema: NUNCA toca el archivo del bot
// (.wwebjs_auth/estado-bot.json). Usa crearAlmacen, no el almacén del bot.
// Uso: node test-estado.js
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { crearAlmacen } = require("./estado");

let fallas = 0;
async function prueba(nombre, fn) {
  try { await fn(); console.log(`  ✅ ${nombre}`); }
  catch (e) { fallas++; console.log(`  ❌ ${nombre}\n     ${e.message}`); }
}

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
/** Espera a que se cumpla `cond` o se acabe el plazo. Devuelve si se cumplió. */
async function hasta(cond, plazoMs) {
  const fin = Date.now() + plazoMs;
  while (Date.now() < fin) { if (cond()) return true; await dormir(5); }
  return cond();
}

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "bot-estado-"));
const DIA = 24 * 60 * 60 * 1000;
const ESPERA = 40; // debounce de las pruebas: «5 s» → 40 ms

/** Un almacén en su propia carpeta, con reloj que se puede adelantar y log que se guarda. */
function nuevo(nombre, { debounceMs = ESPERA } = {}) {
  const dir = path.join(TMP, nombre);
  fs.mkdirSync(dir, { recursive: true });
  const reloj = { t: Date.parse("2026-11-10T18:00:00Z") };
  const avisos = [];
  const log = { log: (...a) => avisos.push(a.join(" ")), warn: (...a) => avisos.push(a.join(" ")) };
  const ruta = path.join(dir, "estado-bot.json");
  const comprobantesDir = path.join(dir, "comprobantes");
  const almacen = crearAlmacen({ ruta, comprobantesDir, debounceMs, log, ahora: () => reloj.t });
  return { almacen, ruta, dir, comprobantesDir, reloj, avisos, log };
}

const sesion = (t, extra = {}) => ({ phone: "x", history: [{ role: "user", content: "hola" }], createdAt: t, updatedAt: t, ...extra });
const leer = (ruta) => JSON.parse(fs.readFileSync(ruta, "utf8"));

(async () => {
  console.log("\n💾 Memoria del bot (estado.js) y sesiones\n");

  await prueba("sin iniciar() NO escribe a disco (test-chat y el simulador no ensucian)", async () => {
    const { almacen, ruta, reloj } = nuevo("sin-iniciar");
    almacen.ponerSesion("a@c.us", sesion(reloj.t));
    almacen.pausar("a@c.us", { hasta: null, motivo: "comando" });
    await dormir(ESPERA * 3);
    assert.equal(fs.existsSync(ruta), false, "escribió sin iniciar()");
    assert.equal(almacen.sesion("a@c.us").history.length, 1, "en memoria sí está");
  });

  await prueba("iniciar() sin archivo arranca vacío y guarda a los pocos ms del cambio", async () => {
    const { almacen, ruta, reloj } = nuevo("iniciar");
    const r = almacen.iniciar({ cierre: false });
    assert.deepEqual([r.sesiones, r.pausas, r.comprobantes], [0, 0, 0]);
    almacen.ponerSesion("a@c.us", sesion(reloj.t));
    assert.equal(fs.existsSync(ruta), false, "no espera: escribió en el acto");
    assert.ok(await hasta(() => fs.existsSync(ruta), ESPERA * 10), "nunca guardó");
    const d = leer(ruta);
    assert.equal(d.version, 1);
    assert.ok(d.sesiones["a@c.us"], "falta la sesión");
    assert.ok(typeof d.guardadoAt === "string");
  });

  await prueba("con cambios seguidos guarda a tiempo (la espera NO se reinicia con cada cambio)", async () => {
    const { almacen, ruta, reloj } = nuevo("seguidos");
    almacen.iniciar({ cierre: false });
    const inicio = Date.now();
    let guardo = false;
    // Un cambio cada 10 ms durante 6 esperas: con una espera que se reiniciara, nunca guardaría.
    while (Date.now() - inicio < ESPERA * 6) {
      almacen.ponerSesion(`c${Date.now()}@c.us`, sesion(reloj.t));
      if (fs.existsSync(ruta)) { guardo = true; break; }
      await dormir(10);
    }
    assert.ok(guardo, "no guardó mientras llegaban cambios");
  });

  await prueba("guardarAhora: escritura atómica, sin temporales sueltos", () => {
    const { almacen, ruta, dir, reloj } = nuevo("atomica");
    almacen.activar();
    almacen.ponerSesion("a@c.us", sesion(reloj.t));
    assert.equal(almacen.guardarAhora(), true);
    assert.ok(leer(ruta).sesiones["a@c.us"]);
    assert.deepEqual(fs.readdirSync(dir).filter((f) => f.includes(".tmp-")), [], "quedó un temporal");
  });

  await prueba("recarga: sesiones, pausas y comprobantes vuelven después de un reinicio", () => {
    const a = nuevo("recarga");
    a.almacen.activar();
    a.almacen.ponerSesion("a@c.us", sesion(a.reloj.t, { lastFolio: "COT-PRUEBA1" }));
    a.almacen.pausar("a@c.us", { hasta: a.reloj.t + DIA, motivo: "cancelacion", modo: "escalacion", telefono: "520000000001" });
    a.almacen.agregarComprobante("cot-prueba1", { path: path.join(a.comprobantesDir, "COT-PRUEBA1-1.png"), mimetype: "image/png", chatId: "a@c.us", at: a.reloj.t });
    assert.equal(a.almacen.guardarAhora(), true);

    const b = crearAlmacen({ ruta: a.ruta, comprobantesDir: a.comprobantesDir, log: a.log, ahora: () => a.reloj.t });
    const r = b.cargar();
    assert.deepEqual([r.sesiones, r.pausas, r.comprobantes], [1, 1, 1]);
    assert.equal(b.sesion("a@c.us").lastFolio, "COT-PRUEBA1");
    assert.equal(b.pausaVigente("a@c.us").motivo, "cancelacion");
    assert.equal(b.pausa("a@c.us").telefono, "520000000001");
    assert.equal(b.ultimoComprobante("COT-PRUEBA1").chatId, "a@c.us");
  });

  await prueba("archivo dañado: se aparta como .corrupto-<fecha> y arranca vacío (no tumba el bot)", () => {
    const { almacen, ruta, dir, avisos } = nuevo("danado");
    fs.writeFileSync(ruta, "{esto no es json");
    const r = almacen.cargar();
    assert.deepEqual([r.sesiones, r.pausas, r.comprobantes], [0, 0, 0]);
    assert.equal(fs.existsSync(ruta), false, "el dañado sigue en su lugar");
    const apartados = fs.readdirSync(dir).filter((f) => f.startsWith("estado-bot.json.corrupto-"));
    assert.equal(apartados.length, 1, "no lo apartó");
    assert.equal(fs.readFileSync(path.join(dir, apartados[0]), "utf8"), "{esto no es json", "lo apartado no es el original");
    assert.ok(avisos.some((a) => /dañado/.test(a)), "no avisó en el log");
  });

  await prueba("un JSON que no es objeto también se aparta", () => {
    const { almacen, ruta, dir } = nuevo("arreglo");
    fs.writeFileSync(ruta, "[1,2,3]");
    almacen.cargar();
    assert.equal(fs.readdirSync(dir).filter((f) => f.includes(".corrupto-")).length, 1);
  });

  await prueba("una entrada rara no cuesta las demás", () => {
    const { almacen, ruta, reloj } = nuevo("raras");
    fs.writeFileSync(ruta, JSON.stringify({
      version: 1,
      sesiones: { "buena@c.us": sesion(reloj.t), "mala@c.us": { phone: "mala" }, "nula@c.us": null },
      pausas: { "a@c.us": { hasta: null, desde: reloj.t }, "b@c.us": { hasta: "mañana" } },
      comprobantes: { "COT-A": [{ path: "/tmp/x.png", at: reloj.t }, { sinPath: true }], "COT-B": "no es lista" },
    }));
    const r = almacen.cargar();
    assert.deepEqual([r.sesiones, r.pausas, r.comprobantes], [1, 1, 1]);
    assert.ok(almacen.sesion("buena@c.us"));
    assert.equal(almacen.sesion("mala@c.us"), null);
  });

  await prueba("pausas: vigente, vencida y «hasta /reanuda»", () => {
    const { almacen, reloj } = nuevo("pausas");
    almacen.pausar("a@c.us", { hasta: reloj.t + 2 * 60 * 60 * 1000, motivo: "humano", modo: "humano" });
    almacen.pausar("b@c.us", { hasta: null, motivo: "queja_incidente", modo: "escalacion" });
    assert.ok(almacen.pausaVigente("a@c.us"));
    assert.ok(almacen.pausaVigente("b@c.us"));
    reloj.t += 3 * 60 * 60 * 1000;
    assert.equal(almacen.pausaVigente("a@c.us"), null, "la de 2 h ya venció");
    assert.ok(almacen.pausa("a@c.us"), "la vencida se sigue viendo (para la nota de «el equipo atendió»)");
    assert.ok(almacen.pausaVigente("b@c.us"), "«hasta /reanuda» no vence sola");
    assert.equal(almacen.quitarPausa("b@c.us"), true);
    assert.equal(almacen.quitarPausa("b@c.us"), false);
    assert.equal(almacen.pausaVigente("b@c.us"), null);
    assert.equal(almacen.pausar("c@c.us", { hasta: undefined }).hasta, null, "sin hasta = hasta /reanuda");
  });

  await prueba("poda de 30 días: sesiones, pausas y comprobantes (con su archivo)", () => {
    const { almacen, reloj, comprobantesDir, dir } = nuevo("poda");
    fs.mkdirSync(comprobantesDir, { recursive: true });
    const viejo = path.join(comprobantesDir, "COT-VIEJO-1.png");
    const nuevoArchivo = path.join(comprobantesDir, "COT-NUEVO-1.png");
    const afuera = path.join(dir, "fuera-de-la-carpeta.png");
    for (const f of [viejo, nuevoArchivo, afuera]) fs.writeFileSync(f, "x");
    const hace = (dias) => reloj.t - dias * DIA;

    almacen.ponerSesion("vieja@c.us", sesion(hace(31)));
    almacen.ponerSesion("nueva@c.us", sesion(hace(2)));
    almacen.pausar("vencida-ayer@c.us", { hasta: hace(0.5), desde: hace(1) });
    almacen.pausar("vencida-antier@c.us", { hasta: hace(2), desde: hace(3) });
    almacen.pausar("reanuda-vieja@c.us", { hasta: null, desde: hace(31) });
    almacen.pausar("reanuda-nueva@c.us", { hasta: null, desde: hace(5) });
    almacen.agregarComprobante("COT-VIEJO", { path: viejo, at: hace(31) });
    almacen.agregarComprobante("COT-NUEVO", { path: nuevoArchivo, at: hace(1) });
    almacen.agregarComprobante("COT-AFUERA", { path: afuera, at: hace(31) });

    assert.equal(almacen.podar(), true);
    assert.equal(almacen.sesion("vieja@c.us"), null);
    assert.ok(almacen.sesion("nueva@c.us"));
    assert.ok(almacen.pausa("vencida-ayer@c.us"), "una pausa vencida se guarda un día más");
    assert.equal(almacen.pausa("vencida-antier@c.us"), null);
    assert.equal(almacen.pausa("reanuda-vieja@c.us"), null);
    assert.ok(almacen.pausa("reanuda-nueva@c.us"));
    assert.deepEqual(almacen.comprobantesDe("COT-VIEJO"), []);
    assert.equal(almacen.comprobantesDe("COT-NUEVO").length, 1);
    assert.equal(fs.existsSync(viejo), false, "no borró el archivo del comprobante viejo");
    assert.equal(fs.existsSync(nuevoArchivo), true);
    assert.equal(fs.existsSync(afuera), true, "🔴 borró un archivo FUERA de la carpeta de comprobantes");
    assert.equal(almacen.podar(), false, "la segunda poda no debería cambiar nada");
  });

  await prueba("comprobantes: cuenta, copia y folio sin importar mayúsculas", () => {
    const { almacen } = nuevo("comprobantes");
    assert.equal(almacen.agregarComprobante("cot-x1", { path: "/a.png" }), 1);
    assert.equal(almacen.agregarComprobante("COT-X1", { path: "/b.pdf", chatId: "a@lid" }), 2);
    assert.equal(almacen.agregarComprobante("", { path: "/c.png" }), 0, "sin folio no se anota");
    assert.equal(almacen.agregarComprobante("COT-X1", {}), 0, "sin path no se anota");
    const lista = almacen.comprobantesDe("Cot-X1");
    assert.equal(lista.length, 2);
    lista.pop();
    assert.equal(almacen.comprobantesDe("COT-X1").length, 2, "comprobantesDe debe devolver una copia");
    assert.equal(almacen.ultimoComprobante("COT-X1").chatId, "a@lid");
    assert.equal(almacen.ultimoComprobante("COT-NADA"), null);
  });

  await prueba("si no se puede escribir, guardarAhora devuelve false (no lanza)", () => {
    const { dir, log } = nuevo("sin-permiso");
    const estorbo = path.join(dir, "soy-un-archivo");
    fs.writeFileSync(estorbo, "x");
    // La «carpeta» del JSON es un archivo: mkdir y write fallan.
    const almacen = crearAlmacen({ ruta: path.join(estorbo, "estado.json"), comprobantesDir: path.join(dir, "c"), log });
    almacen.activar();
    almacen.ponerSesion("a@c.us", sesion(Date.now()));
    assert.equal(almacen.guardarAhora(), false);
  });

  await prueba("sesiones() y pausas() son el objeto vivo (para /status y /reanuda)", () => {
    const { almacen, reloj } = nuevo("vivo");
    almacen.ponerSesion("a@c.us", sesion(reloj.t));
    almacen.pausar("a@c.us", { hasta: null });
    assert.ok(almacen.sesiones()["a@c.us"]);
    assert.ok(almacen.pausas()["a@c.us"]);
    assert.equal(almacen.quitarSesion("a@c.us"), true);
    assert.equal(almacen.sesiones()["a@c.us"], undefined);
  });

  // sessions.js usa el almacén del bot, que en las pruebas vive SOLO en
  // memoria (nadie llama iniciar()): no escribe a disco.
  const {
    getSession, pushHistory, clearSession, sesionExistente,
    esTextoDelCliente, MAX_MENSAJES_CLIENTE, DEJA_MENSAJES_CLIENTE,
  } = require("./sessions");
  const estado = require("./estado");

  await prueba("sessions: forma de la sesión del CONTRATO", () => {
    clearSession("ses1@c.us");
    assert.equal(sesionExistente("ses1@c.us"), null, "sesionExistente no debe crear");
    const s = getSession("ses1@c.us");
    for (const k of ["lastFolio", "locale", "telefono", "nombre", "zonaHospedaje", "escalacion", "saldoPendiente", "botAt"]) {
      assert.ok(k in s && s[k] === null, `falta ${k} (o no es null)`);
    }
    assert.equal(s.phone, "ses1@c.us");
    assert.deepEqual(s.history, []);
    assert.ok(sesionExistente("ses1@c.us"));
    assert.doesNotThrow(() => JSON.parse(JSON.stringify(s)), "la sesión debe poder guardarse en JSON");
  });

  await prueba("sessions: una sesión de una versión anterior se completa", () => {
    estado.ponerSesion("vieja@c.us", { history: [{ role: "user", content: "hola" }] });
    const s = getSession("vieja@c.us");
    assert.equal(s.phone, "vieja@c.us");
    assert.equal(s.locale, null);
    assert.equal(s.escalacion, null);
    assert.equal(s.history.length, 1);
    clearSession("vieja@c.us");
  });

  // El tope cuenta mensajes del CLIENTE (fase 2): al pasar de MAX se queda
  // con los últimos DEJA, y siempre empieza en uno suyo. 🔴 Esta prueba
  // esperaba los 40 mensajes TOTALES de antes y fallaba con la regla nueva.
  await prueba("sessions: junta textos seguidos del mismo rol y recorta por mensajes del CLIENTE", () => {
    clearSession("ses2@c.us");
    pushHistory("ses2@c.us", "user", "hola");
    pushHistory("ses2@c.us", "user", "somos 4");
    assert.equal(getSession("ses2@c.us").history.length, 1);
    assert.equal(getSession("ses2@c.us").history[0].content, "hola\nsomos 4");
    // Con el «hola», MAX + 1 mensajes del cliente: se pasa del tope en el último.
    for (let i = 0; i < MAX_MENSAJES_CLIENTE; i++) {
      pushHistory("ses2@c.us", "assistant", `r${i}`);
      pushHistory("ses2@c.us", "user", `m${i}`);
    }
    const h = getSession("ses2@c.us").history;
    assert.equal(h.filter(esTextoDelCliente).length, DEJA_MENSAJES_CLIENTE, `quedan ${h.filter(esTextoDelCliente).length} del cliente`);
    assert.equal(h[0].role, "user", "siempre empieza en un mensaje del cliente");
    assert.equal(h[h.length - 1].content, `m${MAX_MENSAJES_CLIENTE - 1}`, "lo último se queda");
    clearSession("ses2@c.us");
    assert.equal(sesionExistente("ses2@c.us"), null);
  });

  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* el sistema lo limpia */ }
  console.log(fallas ? `\n❌ ${fallas} prueba(s) fallaron\n` : "\n✅ Todas pasaron\n");
  process.exit(fallas ? 1 : 0);
})();
