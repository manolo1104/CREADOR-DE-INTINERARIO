// Prueba de medios.js: fotos, PDF y comprobantes, SIN WhatsApp ni red.
// El sitio, el almacén y el WhatsApp del dueño son de mentiras; los archivos
// van a una carpeta temporal del sistema que se borra al final.
// Uso: node test-medios.js
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const medios = require("./medios");
const { crearAlmacen } = require("./estado");
const { fechaMexico, sumarDias } = require("./horario");

let fallas = 0;
async function prueba(nombre, fn) {
  try { await fn(); console.log(`  ✅ ${nombre}`); }
  catch (e) { fallas++; console.log(`  ❌ ${nombre}\n     ${e.message}`); }
}

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "bot-medios-"));
const silencio = { log() {}, warn() {} };
// Un PNG de 1×1: basta para que el archivo exista y se pueda comparar.
const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const foto = (filename = "IMG_2034.jpg") => ({ mimetype: "image/png", data: PNG, filename });

// Fechas relativas al reloj fijo de las pruebas (hora de México).
const AHORA = Date.parse("2026-11-10T18:00:00Z"); // 12:00 del 10 nov en México
const HOY = fechaMexico(new Date(AHORA));

/** Una cotización como la devuelve /api/bot/booking/[folio]. */
function vistaCotizacion(extra = {}) {
  return {
    tipo: "cotizacion", folio: "COT-PRUEBA1", status: "enviada", tourName: "Expedición Tamul",
    tourDate: sumarDias(HOY, 9), total: 3100, anticipo: 930, saldo: 2170, venceEl: sumarDias(HOY, 2),
    customerName: "Laura Prueba", ...extra,
  };
}

/** Un api-client de mentiras: guarda cada consulta y contesta lo que se le diga. */
function apiFalsa({ porFolio = {}, activa = null, lanza = false } = {}) {
  const llamadas = { consultar: [], activa: [] };
  return {
    llamadas,
    async consultarReserva(folio) {
      llamadas.consultar.push(folio);
      if (lanza) throw new Error("sitio caído");
      const d = porFolio[folio];
      return d ? { ok: true, status: 200, data: d } : { ok: false, status: 404, data: { error: "no existe" } };
    },
    async cotizacionActiva(q) {
      llamadas.activa.push(q);
      if (lanza) throw new Error("sitio caído");
      return activa ? { ok: true, status: 200, data: activa } : { ok: false, status: 404, data: { error: "no hay" } };
    },
  };
}

/** El WhatsApp del dueño, de mentiras: guarda lo que le llegaría. */
function duenoFalso({ falla = false } = {}) {
  const recibidos = [];
  return {
    recibidos,
    enviar: async (contenido, opciones) => {
      if (falla) throw new Error("WhatsApp no conectado");
      recibidos.push({ contenido, opciones });
      return true;
    },
  };
}

(async () => {
  console.log("\n🧾 Fotos, PDF y comprobantes (medios.js)\n");

  await prueba("mediaKind: imagen, PDF y lo demás", () => {
    assert.equal(medios.mediaKind("image/jpeg"), "image");
    assert.equal(medios.mediaKind("application/pdf"), "pdf");
    assert.equal(medios.mediaKind("application/pdf; charset=binary"), "pdf");
    assert.equal(medios.mediaKind("video/mp4"), null);
    assert.equal(medios.mediaKind(""), null);
  });

  await prueba("limpiarPie: el nombre del archivo no lo escribió el cliente", () => {
    assert.equal(medios.limpiarPie("IMG_2034.jpg"), "");
    assert.equal(medios.limpiarPie("comprobante.pdf"), "");
    assert.equal(medios.limpiarPie("  ya quedó el pago  "), "ya quedó el pago");
  });

  await prueba("classifyIncomingMedia: qué es comprobante y qué no", () => {
    const c = medios.classifyIncomingMedia;
    assert.equal(c({ mimetype: "image/jpeg" }), "proof", "foto sin texto = comprobante");
    assert.equal(c({ mimetype: "application/pdf", caption: "IMG_2034.pdf" }), "proof", "PDF con solo el nombre = comprobante");
    assert.equal(c({ mimetype: "image/jpeg", caption: "ya pagué 🙌" }), "proof");
    assert.equal(c({ mimetype: "image/jpeg", caption: "here is the receipt" }), "proof", "en inglés también");
    assert.equal(c({ mimetype: "image/webp", messageType: "sticker" }), "unsupported", "un sticker NO es comprobante");
    assert.equal(c({ mimetype: "application/pdf", caption: "mi constancia de situación fiscal" }), "text", "constancia fiscal = trámite, no pago");
    assert.equal(c({ mimetype: "image/jpeg", caption: "te mando el comprobante, ¿me facturan?" }), "proof", "pago + factura = pago");
    assert.equal(c({ mimetype: "image/jpeg", caption: "¿esta cascada está en el tour?" }), "text", "foto con una pregunta = texto");
    assert.equal(c({ mimetype: "image/jpeg", caption: "¿esta cascada está en el tour?", hasPendingQuote: true }), "text", "una pregunta que no es del pago se contesta aunque haya cotización pendiente");
    assert.equal(c({ mimetype: "image/jpeg", caption: "¿es aquí el punto de encuentro?", hasPendingQuote: true }), "text");
    assert.equal(c({ mimetype: "image/jpeg", caption: "¿ya les llegó?", hasPendingQuote: true }), "proof", "«¿ya les llegó?» es del pago");
    assert.equal(c({ mimetype: "image/jpeg", caption: "¿así está bien?", hasPendingQuote: true }), "proof");
    assert.equal(c({ mimetype: "image/jpeg", caption: "mira nada más", hasPendingQuote: true }), "proof", "con cotización pendiente, una foto con texto suelto sigue siendo comprobante");
    assert.equal(c({ mimetype: "image/jpeg", caption: "¡Gracias, les comparto las fotos!", hasPendingQuote: false }), "text", "sin nada que pagar, las fotos del paseo son texto");
    assert.equal(c({ mimetype: "video/mp4" }), "unsupported");
    assert.equal(c({ mimetype: "video/mp4", caption: "así se ve el río hoy?" }), "text");
  });

  await prueba("PAYMENT_RE: «ya pagué» sí; «página» y «pagar» no", () => {
    assert.ok(medios.PAYMENT_RE.test("ya pagué"));
    assert.ok(medios.PAYMENT_RE.test("listo, ya está la transferencia"));
    assert.ok(!medios.PAYMENT_RE.test("vi la página"));
    assert.ok(!medios.PAYMENT_RE.test("¿cómo puedo pagar?"));
  });

  await prueba("isPaymentChatterOnly: «ya pagué, gracias» no necesita al modelo", () => {
    assert.equal(medios.isPaymentChatterOnly(["ya pagué", "muchas gracias!! 🙏"]), true);
    assert.equal(medios.isPaymentChatterOnly(["here is the receipt, thanks"]), true);
    assert.equal(medios.isPaymentChatterOnly(["ya pagué, ¿a qué hora pasan por nosotros?"]), false, "una pregunta sí se contesta");
    assert.equal(medios.isPaymentChatterOnly(["ya pagué", "y somos 3 al final"]), false, "otro tema sí se contesta");
  });

  await prueba("idiomaProbable / idiomaDeSesion", () => {
    assert.equal(medios.idiomaProbable("Hi! How much is the tour for tomorrow?"), "en");
    assert.equal(medios.idiomaProbable("Hola, ¿cuánto cuesta para mañana?"), "es");
    assert.equal(medios.idiomaProbable("ok"), null);
    assert.equal(medios.idiomaDeSesion({ locale: "en", history: [] }), "en");
    assert.equal(medios.idiomaDeSesion({ history: [{ role: "user", content: "Hello, we would like to book please" }] }), "en");
    assert.equal(medios.idiomaDeSesion(null), "es");
  });

  await prueba("normalizarCotizacion: cotización, reserva (saldo) y vencida", () => {
    const c = medios.normalizarCotizacion(vistaCotizacion());
    assert.equal(c.tipo, "cotizacion");
    assert.equal(c.esperado, 930, "de una cotización se espera el anticipo");
    assert.equal(c.vigente, true);
    const sinAnticipo = medios.normalizarCotizacion(vistaCotizacion({ anticipo: undefined, saldo: undefined }));
    assert.equal(sinAnticipo.anticipo, Math.round(3100 * 0.3), "si el sitio no manda el anticipo, 30 %");
    const r = medios.normalizarCotizacion({ tipo: "reserva", folio: "HP-M-PRUEBA1", totalAmount: 3100, pagado: 930, saldo: 2170, status: "paid" });
    assert.equal(r.tipo, "reserva");
    assert.equal(r.esperado, 2170, "de una reserva se espera el saldo");
    const liquidada = medios.normalizarCotizacion({ tipo: "reserva", folio: "HP-M-PRUEBA2", totalAmount: 3100, pagado: 3100, saldo: 0, status: "paid" });
    assert.equal(liquidada.vigente, false, "una reserva liquidada no espera ningún pago");
    const v = medios.normalizarCotizacion(vistaCotizacion({ status: "expirada" }));
    assert.equal(v.vencida, true);
    assert.equal(v.vigente, false);
    assert.equal(medios.normalizarCotizacion(null), null);
    assert.equal(medios.normalizarCotizacion({ total: 5 }), null, "sin folio no hay cotización");
  });

  await prueba("urgenciaDeFecha: mañana es URGENTE (reloj fijo)", () => {
    assert.equal(medios.urgenciaDeFecha(sumarDias(HOY, 1), AHORA), "URGENTE");
    assert.equal(medios.urgenciaDeFecha(HOY, AHORA), "URGENTE");
    assert.equal(medios.urgenciaDeFecha(sumarDias(HOY, 5), AHORA), "HOY");
    assert.equal(medios.urgenciaDeFecha("", AHORA), "HOY");
  });

  await prueba("acuse al cliente: folio, total, anticipo y saldo — y NUNCA «confirmada»", () => {
    const cot = medios.normalizarCotizacion(vistaCotizacion());
    const es = medios.textoAcuseComprobante(cot, { nombre: "laura" });
    assert.ok(es.includes("COT-PRUEBA1"));
    assert.ok(es.includes("¡Gracias, Laura!"), "saluda con el primer nombre");
    for (const n of ["3,100", "930", "2,170"]) assert.ok(es.includes(n), `falta ${n}`);
    assert.ok(/efectivo o transferencia/.test(es), "el saldo se paga en efectivo o transferencia");
    assert.ok(!/confirmad[ao]/i.test(es), "dice «confirmada»");
    const en = medios.textoAcuseComprobante(cot, { locale: "en" });
    assert.ok(/We received your payment receipt/.test(en) && /Deposit to book/.test(en));
    assert.ok(!/confirmed/i.test(en), "dice «confirmed»");
    const paquete = medios.textoAcuseComprobante({ ...cot, esPaquete: true });
    assert.ok(/check-in/.test(paquete), "en paquete el saldo es al check-in");
  });

  await prueba("aviso al dueño: urgencia, wa.me, montos y el comando listo", () => {
    const cot = medios.normalizarCotizacion(vistaCotizacion({ tourDate: sumarDias(HOY, 1) }));
    const a = medios.textoAvisoComprobante(cot, { nombre: "Lau", telefono: "520000000001", kind: "image", n: 1, ahora: AHORA });
    assert.ok(a.includes("[URGENTE]"), "el tour es mañana");
    assert.ok(a.includes("wa.me/520000000001"));
    assert.ok(a.includes("👤 Laura Prueba (WhatsApp: Lau)"));
    assert.ok(a.includes("/confirma COT-PRUEBA1 930"), "el comando con el anticipo");
    const sinTel = medios.textoAvisoComprobante(cot, { kind: "pdf", n: 2, ahora: AHORA, descargado: false });
    assert.ok(sinTel.includes("número no visible"), "un @lid sin teléfono no inventa un wa.me");
    assert.ok(sinTel.includes("archivo #2") && sinTel.includes("No pude descargar"));
    const vencida = medios.textoAvisoComprobante(medios.normalizarCotizacion(vistaCotizacion({ status: "expirada" })), { ahora: AHORA });
    assert.ok(vencida.includes("VENCIDA"));
    const saldo = medios.textoAvisoComprobante(medios.normalizarCotizacion({ tipo: "reserva", folio: "HP-M-X1", totalAmount: 3100, pagado: 930, saldo: 2170 }), { ahora: AHORA });
    assert.ok(saldo.includes("/confirma HP-M-X1 2170"), "del saldo, el comando con el saldo");
    assert.equal(medios.captionComprobante(cot, 2), "Comprobante COT-PRUEBA1 (#2) · /confirma COT-PRUEBA1 930");
  });

  await prueba("ubicación, audio y archivo no soportado (es / en)", () => {
    assert.equal(
      medios.textoUbicacion({ latitude: 21.38, longitude: -98.99, name: "Hotel X" }),
      "[ubicación compartida: Hotel X · https://maps.google.com/?q=21.38,-98.99]",
    );
    assert.equal(medios.textoUbicacion({}), "[ubicación compartida: sin datos]");
    assert.ok(/audios/.test(medios.textoAudio("es")) && /voice messages/.test(medios.textoAudio("en")));
    assert.ok(/texto, fotos o PDF/.test(medios.textoArchivoNoSoportado("es")));
  });

  await prueba("notaHistorialComprobante: el modelo no vuelve a cobrar", () => {
    const n = medios.notaHistorialComprobante("COT-PRUEBA1");
    assert.ok(n.startsWith("[sistema]") && n.includes("COT-PRUEBA1") && /No le pidas pagar de nuevo/.test(n));
    assert.ok(/mientras el equipo atendía/.test(medios.notaHistorialComprobante("COT-PRUEBA1", { enPausa: true })));
    assert.ok(/sin cotización ligada/.test(medios.notaHistorialComprobante(null)));
  });

  await prueba("prepararRafaga: comprobante + «ya pagué» = solo el acuse", () => {
    const p = medios.prepararRafaga([
      { tipo: "comprobante", folio: "COT-PRUEBA1", ackText: "ACUSE", duplicado: false },
      { tipo: "texto", texto: "ya pagué" },
      { tipo: "texto", texto: "gracias!" },
    ]);
    assert.equal(p.acuse, "ACUSE");
    assert.equal(p.soloCharla, true);
    assert.equal(p.llamarModelo, false);
    assert.deepEqual(p.folios, ["COT-PRUEBA1"]);
    assert.equal(p.notas.length, 1);
  });

  await prueba("prepararRafaga: comprobante + una pregunta = acuse y modelo", () => {
    const p = medios.prepararRafaga([
      { tipo: "comprobante", folio: "COT-PRUEBA1", ackText: "ACUSE", duplicado: false },
      { tipo: "texto", texto: "¿a qué hora pasan por nosotros?" },
    ]);
    assert.equal(p.acuse, "ACUSE");
    assert.equal(p.llamarModelo, true);
    assert.equal(p.textoUnido, "¿a qué hora pasan por nosotros?");
  });

  await prueba("prepararRafaga: varios archivos = UN acuse, el completo", () => {
    const p = medios.prepararRafaga([
      { tipo: "comprobante", folio: "COT-PRUEBA1", ackText: "CORTO", duplicado: true },
      { tipo: "comprobante", folio: "COT-PRUEBA1", ackText: "COMPLETO", duplicado: false },
    ]);
    assert.equal(p.acuse, "COMPLETO");
    assert.equal(p.llamarModelo, false, "sin texto no hay nada que preguntarle al modelo");
    const soloTexto = medios.prepararRafaga([{ tipo: "texto", texto: "hola" }]);
    assert.equal(soloTexto.acuse, null);
    assert.equal(soloTexto.soloCharla, false, "sin comprobante no es «charla de pago»");
    assert.equal(soloTexto.llamarModelo, true);
  });

  await prueba("guardarComprobante: <FOLIO>-<n>.<ext> y queda en el almacén", () => {
    const dir = path.join(TMP, "guardar");
    const almacen = crearAlmacen({ ruta: path.join(TMP, "guardar.json"), comprobantesDir: dir, log: silencio });
    const r1 = medios.guardarComprobante({ dir, folio: "cot-prueba1", media: foto(), chatId: "a@c.us", almacen, ahora: AHORA, log: silencio });
    assert.equal(path.basename(r1.path), "COT-PRUEBA1-1.png");
    assert.equal(fs.readFileSync(r1.path).toString("base64"), PNG, "el archivo no es el que llegó");
    const r2 = medios.guardarComprobante({ dir, folio: "COT-PRUEBA1", media: { ...foto(), mimetype: "application/pdf" }, almacen, log: silencio });
    assert.equal(path.basename(r2.path), "COT-PRUEBA1-2.pdf");
    assert.equal(almacen.comprobantesDe("COT-PRUEBA1").length, 2);
    assert.equal(almacen.ultimoComprobante("COT-PRUEBA1").chatId, null);
    assert.equal(medios.guardarComprobante({ dir: null, folio: "X", media: foto() }), null, "sin carpeta no guarda");
    assert.equal(medios.guardarComprobante({ dir, folio: "X", media: null }), null, "sin archivo no guarda");
  });

  await prueba("extensionDe", () => {
    assert.equal(medios.extensionDe("image/jpeg"), "jpg");
    assert.equal(medios.extensionDe("application/pdf"), "pdf");
    assert.equal(medios.extensionDe("", "recibo.HEIC"), "heic");
    assert.equal(medios.extensionDe("", "sinextension"), "bin");
  });

  await prueba("buscarCotizacion: folio de la sesión → cotización activa → vencida de respaldo", async () => {
    const viva = vistaCotizacion();
    let api = apiFalsa({ porFolio: { "COT-PRUEBA1": viva } });
    let c = await medios.buscarCotizacion({ api, chatId: "a@c.us", sessionFolio: "COT-PRUEBA1", log: silencio });
    assert.equal(c.folio, "COT-PRUEBA1");
    assert.equal(api.llamadas.activa.length, 0, "con el folio de la sesión no hace falta buscar más");

    api = apiFalsa({ activa: { ...viva, folio: "COT-OTRA" } });
    c = await medios.buscarCotizacion({ api, chatId: "a@c.us", telefono: "520000000001", log: silencio });
    assert.equal(c.folio, "COT-OTRA");
    assert.deepEqual(api.llamadas.activa[0], { chatId: "a@c.us", telefono: "520000000001" });

    api = apiFalsa({ porFolio: { "COT-PRUEBA1": vistaCotizacion({ status: "expirada" }) } });
    c = await medios.buscarCotizacion({ api, chatId: "a@c.us", sessionFolio: "COT-PRUEBA1", log: silencio });
    assert.equal(c.vencida, true, "si no hay otra, la vencida de la sesión (el aviso lo marca)");

    c = await medios.buscarCotizacion({ api: apiFalsa({ lanza: true }), chatId: "a@c.us", sessionFolio: "COT-X", log: silencio });
    assert.equal(c, null, "si el sitio truena, null (no lanza)");
  });

  await prueba("procesador: aviso + archivo al dueño, acuse completo, archivo guardado", async () => {
    let t = AHORA;
    const dir = path.join(TMP, "proc1");
    const almacen = crearAlmacen({ ruta: path.join(TMP, "proc1.json"), comprobantesDir: dir, log: silencio });
    const dueno = duenoFalso();
    const p = medios.createProofProcessor({
      api: apiFalsa({ porFolio: { "COT-PRUEBA1": vistaCotizacion() } }),
      almacen, enviarAlDueno: dueno.enviar, dir, log: silencio, now: () => t,
    });
    const args = { chatId: "a@c.us", nombre: "Lau", telefono: "520000000001", sessionFolio: "COT-PRUEBA1", media: foto(), mimetype: "image/png" };

    const r1 = await p.process(args);
    assert.equal(r1.folio, "COT-PRUEBA1");
    assert.equal(r1.duplicate, false);
    assert.ok(r1.ackText.includes("Recibimos tu comprobante"));
    assert.equal(dueno.recibidos.length, 2, "aviso de texto + el archivo");
    assert.ok(String(dueno.recibidos[0].contenido).includes("/confirma COT-PRUEBA1 930"));
    assert.equal(dueno.recibidos[1].opciones.caption, "Comprobante COT-PRUEBA1 · /confirma COT-PRUEBA1 930");
    assert.ok(fs.existsSync(r1.archivo.path), "el archivo quedó guardado");
    assert.equal(almacen.ultimoComprobante("COT-PRUEBA1").chatId, "a@c.us", "/confirma sabe a qué chat contestar");

    // Segundo archivo a los 3 min (el anticipo en dos transferencias): sin aviso nuevo.
    t += 3 * 60 * 1000;
    const r2 = await p.process(args);
    assert.equal(r2.duplicate, true);
    assert.ok(r2.ackText.includes("Recibí también este archivo"));
    assert.equal(dueno.recibidos.length, 3, "solo llega el archivo, sin otro aviso");
    assert.equal(dueno.recibidos[2].opciones.caption, "Comprobante COT-PRUEBA1 (#2) · /confirma COT-PRUEBA1 930");

    // A los 11 min del primero ya es un aviso nuevo.
    t = AHORA + 11 * 60 * 1000;
    const r3 = await p.process(args);
    assert.equal(r3.duplicate, false);
    assert.equal(dueno.recibidos.length, 5);
  });

  await prueba("procesador: en pausa avisa al dueño pero NO le contesta al cliente", async () => {
    const dueno = duenoFalso();
    const p = medios.createProofProcessor({
      api: apiFalsa({ porFolio: { "COT-PRUEBA1": vistaCotizacion() } }), enviarAlDueno: dueno.enviar, log: silencio, now: () => AHORA,
    });
    const r = await p.process({ chatId: "b@c.us", sessionFolio: "COT-PRUEBA1", media: foto(), mimetype: "image/png", paused: true });
    assert.equal(r.ackText, null);
    assert.equal(dueno.recibidos.length, 2);
    assert.equal(r.archivo, null, "sin carpeta no se guarda");
  });

  await prueba("procesador: sin cotización avisa 1 vez cada 30 min por chat", async () => {
    let t = AHORA;
    const dueno = duenoFalso();
    const p = medios.createProofProcessor({ api: apiFalsa(), enviarAlDueno: dueno.enviar, log: silencio, now: () => t });
    const args = { chatId: "c@lid", nombre: "Pepe", media: foto(), mimetype: "image/png", caption: "ahí va" };
    const r1 = await p.process(args);
    assert.equal(r1.folio, null);
    assert.ok(r1.ackText.includes("compárteme tu folio"));
    assert.ok(String(dueno.recibidos[0].contenido).includes("Archivo sin cotización ligada"));
    assert.ok(String(dueno.recibidos[0].contenido).includes("número no visible"), "chat @lid sin teléfono");
    assert.equal(dueno.recibidos.length, 2);
    t += 10 * 60 * 1000;
    const r2 = await p.process(args);
    assert.equal(r2.duplicate, true);
    assert.equal(dueno.recibidos.length, 3, "solo el archivo, sin otro aviso");
    t += 25 * 60 * 1000;
    await p.process(args);
    assert.equal(dueno.recibidos.length, 5, "pasados 30 min, aviso nuevo");
  });

  await prueba("procesador: si el WhatsApp del dueño falla, el cliente igual recibe su acuse", async () => {
    const p = medios.createProofProcessor({
      api: apiFalsa({ porFolio: { "COT-PRUEBA1": vistaCotizacion() } }),
      enviarAlDueno: duenoFalso({ falla: true }).enviar, log: silencio, now: () => AHORA,
    });
    const r = await p.process({ chatId: "d@c.us", sessionFolio: "COT-PRUEBA1", media: foto(), mimetype: "image/png" });
    assert.ok(r.ackText && r.ackText.includes("COT-PRUEBA1"));
  });

  await prueba("procesador: el saldo de una reserva HP-M- espera el saldo", async () => {
    const dueno = duenoFalso();
    const p = medios.createProofProcessor({
      api: apiFalsa({ porFolio: { "HP-M-PRUEBA1": { tipo: "reserva", folio: "HP-M-PRUEBA1", totalAmount: 3100, pagado: 930, saldo: 2170, status: "paid", tourName: "Expedición Tamul" } } }),
      enviarAlDueno: dueno.enviar, log: silencio, now: () => AHORA,
    });
    const r = await p.process({ chatId: "e@c.us", sessionFolio: "HP-M-PRUEBA1", media: foto(), mimetype: "image/png" });
    assert.ok(String(dueno.recibidos[0].contenido).includes("/confirma HP-M-PRUEBA1 2170"));
    assert.ok(/en cuanto quede registrado/.test(r.ackText), "del saldo no promete «tu confirmación»");
  });

  // ── Orden del comprobante (prueba de Manolo, 6 oct) ─────────
  // El cliente escribió «ahorita hago el pago», mandó la foto y siguió
  // escribiendo. Salía el acuse y DESPUÉS el bot decía «cuando hagas la
  // transferencia, mándanos el comprobante»: el modelo leía el texto como lo
  // último, sin saber que el comprobante ya había llegado.
  console.log("\n🧾 Orden del comprobante y respuesta filtrada\n");

  const NOTA_CONTRATO = "DESPUÉS de esos mensajes el cliente mandó el comprobante de COT-PRUEBA1 y ya recibió su acuse; no le pidas comprobante ni pago.";
  const comp = (extra = {}) => ({ tipo: "comprobante", folio: "COT-PRUEBA1", ackText: "ACUSE", duplicado: false, ...extra });

  await prueba("misma ráfaga: texto de antes → nota del comprobante EN SU LUGAR → texto de después", () => {
    const p = medios.prepararRafaga([
      { tipo: "texto", texto: "ahorita hago el pago" },
      comp(),
      { tipo: "texto", texto: "¿a qué hora pasan por nosotros?" },
    ]);
    const t = p.textoParaModelo;
    const iAntes = t.indexOf("ahorita hago el pago");
    const iNota = t.indexOf(NOTA_CONTRATO);
    const iDespues = t.indexOf("¿a qué hora pasan por nosotros?");
    assert.ok(iAntes >= 0 && iNota >= 0 && iDespues >= 0, `falta algo en: ${t}`);
    assert.ok(iAntes < iNota && iNota < iDespues, `fuera de orden: ${t}`);
    assert.deepEqual(p.acuses, ["ACUSE"], "el acuse sale antes que nada");
    assert.equal(p.huboComprobante, true);
    assert.equal(p.soloComprobantes, false);
    assert.equal(p.llamarModelo, true, "hay una pregunta: va al modelo");
    assert.equal(p.textoUnido, "ahorita hago el pago\n¿a qué hora pasan por nosotros?", "textoUnido = solo lo que escribió");
  });

  await prueba("la nota va TODA entre corchetes (no voltea a español el idioma de un cliente en inglés)", () => {
    const p = medios.prepararRafaga([{ tipo: "texto", texto: "I'll pay now" }, comp()]);
    const nota = p.textoParaModelo.split("\n").find((l) => l.startsWith("[sistema]"));
    assert.ok(nota, p.textoParaModelo);
    assert.ok(/^\[sistema\] \[[^\]]*\]$/.test(nota), `la nota no va entre corchetes: ${nota}`);
  });

  await prueba("🔴 «ahorita hago el pago» + la foto = solo el acuse (no se llama al modelo)", () => {
    const p = medios.prepararRafaga([{ tipo: "texto", texto: "ahorita hago el pago" }, comp()]);
    assert.equal(p.soloCharla, true);
    assert.equal(p.llamarModelo, false);
    assert.ok(p.textoParaModelo.indexOf("ahorita hago el pago") < p.textoParaModelo.indexOf("[sistema]"), "en el historial, lo suyo va primero");
  });

  await prueba("solo la foto: soloComprobantes, la nota dice que el cliente la mandó (sin «después»)", () => {
    const p = medios.prepararRafaga([comp()]);
    assert.equal(p.soloComprobantes, true);
    assert.equal(p.llamarModelo, false);
    assert.ok(p.textoParaModelo.startsWith("[sistema] [El cliente mandó el comprobante de COT-PRUEBA1"), p.textoParaModelo);
  });

  await prueba("sin comprobante: solo sus textos, en orden, y sin acuses", () => {
    const p = medios.prepararRafaga([{ tipo: "texto", texto: "hola" }, { tipo: "texto", texto: "somos 4" }]);
    assert.equal(p.textoParaModelo, "hola\nsomos 4");
    assert.deepEqual(p.acuses, []);
    assert.equal(p.huboComprobante, false);
  });

  await prueba("un acuse por folio; si hay folio, el «no encontré tu cotización» sobra", () => {
    const p = medios.prepararRafaga([
      comp({ folio: null, ackText: "SIN-COTIZACION" }),
      comp({ folio: "COT-A", ackText: "ACUSE-A" }),
      comp({ folio: "COT-B", ackText: "ACUSE-B" }),
    ]);
    assert.deepEqual(p.acuses, ["ACUSE-A", "ACUSE-B"]);
  });

  await prueba("buffer: el comprobante que entró TARDE (descarga) queda donde llegó, por llegoAt", () => {
    const { ordenarPorLlegada } = require("./buffer");
    const lista = ordenarPorLlegada([
      { tipo: "texto", texto: "va, ahorita pago", llegoAt: 1000 },
      { tipo: "texto", texto: "listo, ¿a qué hora pasan?", llegoAt: 3000 },
      comp({ llegoAt: 2000 }), // la foto llegó antes del «listo», pero se terminó de procesar después
    ]);
    assert.deepEqual(lista.map((e) => e.tipo), ["texto", "comprobante", "texto"]);
    const t = medios.prepararRafaga(lista).textoParaModelo;
    assert.ok(t.indexOf("[sistema]") < t.indexOf("listo, ¿a qué hora pasan?"));
  });

  await prueba("foto MIENTRAS el modelo responde: la respuesta en curso lo sabe y sale filtrada; el acuse no espera otros 15 s", async () => {
    const { crearGestorDeRafagas } = require("./buffer");
    const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
    const ESPERA = 400; // «15 s», acelerado
    const despachos = [];
    let respuestaQueSalio = null;
    let gestor = null;
    gestor = crearGestorDeRafagas({
      debounceMs: ESPERA,
      maxMs: ESPERA * 5,
      esperaComprobantesMs: 20, // «3 s»
      responder: async (chatId, texto, info) => {
        despachos.push({ at: Date.now(), tipos: info.elementos.map((e) => e.tipo) });
        if (despachos.length > 1) return;
        // El «modelo» tarda; a media respuesta llega la foto.
        await dormir(60);
        gestor.recibirElemento(chatId, comp());
        await dormir(60);
        // Lo que hace index.js: ¿llegó un comprobante que esta respuesta no conoce?
        const llego = gestor.elementosEnEspera(chatId).some((e) => e.tipo === "comprobante");
        const delModelo = "¡Va, Laura! Pasamos por ustedes a las 7:30.\nCuando hagas la transferencia, mándanos el comprobante por aquí. 🙌";
        respuestaQueSalio = llego ? medios.filtrarRespuestaTrasComprobante(delModelo) : delModelo;
      },
    });
    gestor.recibir("mientras@c.us", "ahorita hago el pago, ¿a qué hora pasan?");
    const fin = Date.now() + ESPERA * 4;
    while (despachos.length < 2 && Date.now() < fin) await dormir(10);
    assert.equal(despachos.length, 2, "la ráfaga del comprobante nunca salió");
    assert.deepEqual(despachos[1].tipos, ["comprobante"]);
    assert.ok(despachos[1].at - despachos[0].at < ESPERA, `el acuse esperó ${despachos[1].at - despachos[0].at} ms (la espera normal es ${ESPERA})`);
    assert.ok(respuestaQueSalio && /7:30/.test(respuestaQueSalio), `se perdió lo que sí contestaba: ${respuestaQueSalio}`);
    assert.ok(!/transferencia|comprobante/i.test(respuestaQueSalio), `salió pidiendo el comprobante: ${respuestaQueSalio}`);
  });

  await prueba("filtrarRespuestaTrasComprobante: quita lo que pide el comprobante o el pago, frase por frase", () => {
    const f = medios.filtrarRespuestaTrasComprobante;
    const r1 = f("¡Gracias, Ana! Cuando hagas la transferencia, mándanos el comprobante 🙌");
    assert.ok(/Gracias, Ana/.test(r1) && !/transferencia|comprobante/i.test(r1), r1);
    assert.equal(f("Cuando hagas la transferencia mándanos el comprobante y te confirmo."), "", "si no queda nada, no se manda nada");
    assert.equal(f("¿Ya hiciste la transferencia?"), "");
    assert.ok(!/c[oó]mo prefieres pagar/i.test(f("Perfecto. ¿Cómo prefieres pagar?")));
    assert.ok(!/send us the receipt/i.test(f("Thanks! Once you pay, please send us the receipt.")));
  });

  await prueba("filtrarRespuestaTrasComprobante: quita el bloque de datos de pago completo (es y en)", () => {
    const { PAGO, mensajeDatosPago } = require("./payment");
    for (const locale of ["es", "en"]) {
      const r = medios.filtrarRespuestaTrasComprobante(`¡Listo, Laura! 🙌\n\n${mensajeDatosPago({ folio: "COT-PRUEBA1", monto: 930, locale })}`);
      assert.ok(/Listo, Laura/.test(r), `${locale}: se perdió el saludo: ${r}`);
      assert.ok(!r.includes(PAGO.clabe) && !/CLABE|OXXO|930/.test(r), `${locale}: quedaron datos de pago: ${r}`);
    }
  });

  await prueba("filtrarRespuestaTrasComprobante: respeta acuse, saldo, tranquilidad y lo que no es del pago", () => {
    const f = medios.filtrarRespuestaTrasComprobante;
    for (const t of [
      "Recibimos tu comprobante, el equipo lo está validando.",
      "El resto, $2,170, se paga el día del tour.",
      "No tienes que volver a pagar nada.",
      "¿Les mando los datos del hotel?",
      "Pasamos por ustedes a las 7:30 en su hotel. 🌿",
    ]) {
      assert.equal(f(t), t, `cambió: ${t}`);
    }
  });

  await prueba("corregirRespuestaEnHistorial: el historial guarda lo que de verdad salió", () => {
    const original = "¡Va, Ana! Pasamos a las 7:30. Cuando hagas la transferencia, mándanos el comprobante.";
    const h1 = [{ role: "user", content: "ok" }, { role: "assistant", content: original }];
    assert.equal(medios.corregirRespuestaEnHistorial(h1, original, "¡Va, Ana! Pasamos a las 7:30."), true);
    assert.equal(h1[1].content, "¡Va, Ana! Pasamos a las 7:30.");
    const h2 = [{ role: "user", content: "ok" }, { role: "assistant", content: original }];
    assert.equal(medios.corregirRespuestaEnHistorial(h2, original, ""), true);
    assert.equal(h2.length, 1, "si no salió nada, el turno se quita");
    const h3 = [{ role: "user", content: "ok" }, { role: "assistant", content: "otra cosa que no tiene que ver con esto" }];
    assert.equal(medios.corregirRespuestaEnHistorial(h3, original, "x"), false, "no toca una respuesta que no es esa");
    assert.equal(medios.corregirRespuestaEnHistorial([{ role: "user", content: original }], original, "x"), false, "solo corrige un turno del bot");
  });

  await prueba("esCharlaTrasAcuse: «listo, gracias» justo tras el acuse no llama al modelo; una pregunta sí", () => {
    const ahora = 1_000_000;
    const acuse = { at: ahora - 30_000, texto: "ACUSE" };
    const hist = [{ role: "user", content: "[sistema] [El cliente mandó…]" }, { role: "assistant", content: "ACUSE" }];
    const listo = medios.prepararRafaga([{ tipo: "texto", texto: "listo, gracias 🙏" }]);
    assert.equal(medios.esCharlaTrasAcuse(listo, acuse, hist, ahora), true);
    const pregunta = medios.prepararRafaga([{ tipo: "texto", texto: "¿a qué hora pasan?" }]);
    assert.equal(medios.esCharlaTrasAcuse(pregunta, acuse, hist, ahora), false);
    assert.equal(medios.esCharlaTrasAcuse(listo, { ...acuse, at: ahora - medios.CHARLA_TRAS_ACUSE_MS - 1 }, hist, ahora), false, "pasado el plazo, ya no");
    const otroTurno = [...hist, { role: "user", content: "x" }, { role: "assistant", content: "¿Te mando la ubicación?" }];
    assert.equal(medios.esCharlaTrasAcuse(listo, acuse, otroTurno, ahora), false, "si después habló el modelo, «listo» es una respuesta");
  });

  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* el sistema lo limpia */ }
  console.log(fallas ? `\n❌ ${fallas} prueba(s) fallaron\n` : "\n✅ Todas pasaron\n");
  process.exit(fallas ? 1 : 0);
})();
