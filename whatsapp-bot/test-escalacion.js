// Prueba de cuándo y cómo el bot pasa un chat al equipo, y de /confirma,
// SIN WhatsApp, sin red y sin el modelo.
//   · la regla rápida (needsHuman) y la herramienta escalar_a_humano;
//   · el aviso que le llega al dueño y los textos que recibe el cliente al
//     confirmar su pago;
//   · cómo se lee /confirma <folio> <monto> [método].
// `require("./index")` NO arranca WhatsApp (solo lo hace `node index.js`):
// da las funciones puras que exporta.
// Uso: node test-escalacion.js
const assert = require("assert");

let fallas = 0;
async function prueba(nombre, fn) {
  try { await fn(); console.log(`  ✅ ${nombre}`); }
  catch (e) { fallas++; console.log(`  ❌ ${nombre}\n     ${e.message}`); }
}

const { needsHuman, executeTool, tools } = require("./agent");
const { getSession, clearSession } = require("./sessions");
const horario = require("./horario");

let idx = null;
try {
  idx = require("./index");
} catch (e) {
  console.log(`  ❌ no pude cargar index.js sin arrancar WhatsApp: ${e.message}`);
  fallas++;
}

(async () => {
  console.log("\n🙋 Escalación al equipo y /confirma\n");

  await prueba("needsHuman: lo que SÍ es pedir una persona o una llamada", () => {
    for (const t of [
      "quiero hablar con un humano", "me pasas con un asesor?", "quiero hablar con una persona",
      "llámame porfa", "llamame cuando puedas", "márcame al rato", "¿me puedes marcar?", "¿me pueden llamar mañana?",
      "prefiero una llamada", "quiero hablar con el dueño", "call me please", "can I talk to a real person?",
    ]) assert.equal(needsHuman(t), true, `«${t}» debería pasar a una persona`);
  });

  await prueba("needsHuman: lo que NO (antes callaba al bot a media venta)", () => {
    for (const t of [
      "soy agente de viajes", "soy el encargado del grupo", "el dueño del hotel nos recomendó",
      "el operador del autobús llega a las 8", "hola, quiero info de un tour", "somos 4 personas",
      "la persona que nos recomendó dijo que es bonito", "I'd like to book a tour",
      "soy asesor de viajes, tengo 12 personas", "¿hay señal para hacer una llamada en Xilitla?",
    ]) assert.equal(needsHuman(t), false, `«${t}» NO debería escalar`);
  });

  await prueba("escalar_a_humano está entre las herramientas, con sus motivos", () => {
    const t = tools.find((x) => x.name === "escalar_a_humano");
    assert.ok(t, "falta la herramienta");
    const motivos = t.input_schema.properties.motivo.enum;
    for (const m of ["pide_humano", "llamada", "cancelacion", "queja_incidente", "para_hoy", "para_manana", "grupo", "pregunta_sin_respuesta"]) {
      assert.ok(motivos.includes(m), `falta el motivo ${m}`);
    }
    assert.deepEqual(t.input_schema.properties.modo.enum, ["pasar", "avisar"]);
    assert.ok(tools.find((x) => x.name === "consultar_politica"), "falta consultar_politica");
  });

  await prueba("escalar_a_humano deja session.escalacion con la forma del contrato", async () => {
    const chat = "esc-forma@c.us";
    clearSession(chat);
    getSession(chat).lastFolio = "cot-abc1";
    const r = await executeTool("escalar_a_humano", { motivo: "llamada", modo: "pasar", urgencia: "hoy", resumen: "Quiere que le marquen a las 5 pm." }, chat);
    assert.equal(r.ok, true);
    assert.equal(r.modo, "pasar");
    assert.equal(r.mensajeCliente, horario.mensajeEspera({ urgencia: "hoy", locale: "es" }), "el tiempo prometido no sale de horario.js");
    assert.ok(/no sigas vendiendo/i.test(r.instruccion));
    const e = getSession(chat).escalacion;
    assert.deepEqual(Object.keys(e).sort(), ["at", "folio", "modo", "motivo", "resumen", "urgencia"]);
    assert.equal(e.folio, "COT-ABC1", "sin folio usa el de la sesión, en mayúsculas");
    assert.equal(typeof e.at, "number");
    assert.doesNotThrow(() => JSON.stringify(e), "se guarda en el archivo de memoria");
  });

  await prueba("escalar_a_humano: valores raros → otro / avisar / normal", async () => {
    const chat = "esc-raro@c.us";
    clearSession(chat);
    await executeTool("escalar_a_humano", { motivo: "inventado", modo: "quien-sabe", urgencia: "ya", resumen: "" }, chat);
    const e = getSession(chat).escalacion;
    assert.deepEqual([e.motivo, e.modo, e.urgencia, e.resumen, e.folio], ["otro", "avisar", "normal", "(sin resumen)", null]);
  });

  await prueba("escalar_a_humano: dos casos en el mismo turno = UN aviso con lo más grave", async () => {
    const chat = "esc-junta@c.us";
    clearSession(chat);
    await executeTool("escalar_a_humano", { motivo: "grupo", modo: "avisar", urgencia: "hoy", resumen: "Son 16." }, chat);
    await executeTool("escalar_a_humano", { motivo: "descuento", modo: "avisar", urgencia: "normal", resumen: "Pide descuento." }, chat);
    let e = getSession(chat).escalacion;
    assert.equal(e.motivo, "grupo");
    assert.equal(e.urgencia, "hoy");
    assert.ok(e.resumen.includes("Son 16.") && e.resumen.includes("Pide descuento."), "se perdió uno de los resúmenes");
    await executeTool("escalar_a_humano", { motivo: "queja_incidente", modo: "pasar", urgencia: "urgente", resumen: "Molesto." }, chat);
    e = getSession(chat).escalacion;
    assert.deepEqual([e.motivo, e.modo, e.urgencia], ["queja_incidente", "pasar", "urgente"]);
  });

  await prueba("escalar_a_humano en inglés: el mensaje de espera sale en inglés", async () => {
    const chat = "esc-en@c.us";
    clearSession(chat);
    getSession(chat).locale = "en";
    const r = await executeTool("escalar_a_humano", { motivo: "otro", modo: "pasar", urgencia: "normal", resumen: "x" }, chat);
    assert.equal(r.mensajeCliente, horario.mensajeEspera({ urgencia: "normal", locale: "en" }));
  });

  if (!idx) return fin();

  await prueba("🔴 un texto del bot nunca se lee como comando del negocio", () => {
    // Una respuesta del modelo «/confirma COT-X 1» volvía por message_create
    // como fromMe y se ejecutaba: el bot se confirmaba un pago solo.
    const t = idx.sinComando("/confirma COT-ABC123 1");
    assert.ok(!t.trim().startsWith("/"), "sale con la marca invisible delante");
    assert.equal(idx.sinComando("Hola, ¿cómo estás?"), "Hola, ¿cómo estás?", "lo demás no se toca");
    idx.anotarTextoDelBot(t);
    assert.ok(idx.esTextoDelBot(t), "con la marca");
    assert.ok(idx.esTextoDelBot("/confirma COT-ABC123 1"), "y aunque WhatsApp le quite la marca");
    assert.ok(!idx.esTextoDelBot("/confirma COT-ABC123 930"), "un comando distinto sí es del equipo");
  });

  await prueba("extraerComando: el /confirma copiado a media línea o en el pie de la foto", () => {
    assert.equal(idx.extraerComando("/confirma COT-X1 930"), "/confirma COT-X1 930");
    assert.equal(idx.extraerComando("Comprobante COT-X1 · /confirma COT-X1 930"), "/confirma COT-X1 930");
    assert.equal(idx.extraerComando("🧾 *[HOY] Comprobante de pago*\nRevisa tu banco y, si ya entró:\n👉 /confirma COT-X1 930\n_(cambia el monto)_"), "/confirma COT-X1 930");
    assert.equal(idx.extraerComando("ok, ya lo vi"), null);
    assert.equal(idx.extraerComando("visita https://x.com/confirma"), null, "una URL no es un comando");
  });

  await prueba("MOTIVOS_HASTA_REANUDA: queja, cancelación, molesto y cambio después de pagar", () => {
    for (const m of ["queja_incidente", "cancelacion", "cliente_molesto", "cambio_post_pago"]) assert.ok(idx.MOTIVOS_HASTA_REANUDA.has(m), m);
    for (const m of ["pide_humano", "llamada", "para_hoy", "falla_bot"]) assert.ok(!idx.MOTIVOS_HASTA_REANUDA.has(m), `${m} no debería esperar /reanuda`);
  });

  await prueba("aviso al dueño: [URGENTE|HOY|NORMAL] motivo · nombre · wa.me · folio, tour, fecha, personas · estado", () => {
    const a = idx.textoAvisoEscalacion({
      motivo: "queja_incidente", urgencia: "urgente", resumen: "El guía no llega a las 8:40.",
      nombre: "Ana Prueba", telefono: "520000000001",
      cotizacion: { folio: "HP-M-X1", tourName: "Expedición Tamul", tourDate: "2026-11-20", adults: 2, children: 1 },
      textoCliente: "son las 8:40 y el guía no llega", respuestaBot: "Ya le avisé al equipo.",
      estadoTxt: "⏸️ *Estado:* bot en pausa en este chat hasta que escribas /reanuda 520000000001",
    });
    const l = a.split("\n");
    assert.equal(l[0], "🚨 *[URGENTE]* Queja o incidente");
    assert.equal(l[1], "👤 Ana Prueba");
    assert.equal(l[2], "📱 wa.me/520000000001");
    assert.ok(l[3].startsWith("📋 HP-M-X1 · Expedición Tamul · ") && l[3].endsWith("2 adultos + 1 niño"), l[3]);
    assert.ok(a.includes("Qué pidió:* El guía no llega"));
    assert.ok(a.includes("Su último mensaje:* «son las 8:40"));
    assert.ok(a.includes("Qué le dijo el bot:* «Ya le avisé"));
    assert.ok(a.endsWith("/reanuda 520000000001"), "el estado va al final");
    const hoy = idx.textoAvisoEscalacion({ motivo: "para_hoy", urgencia: "hoy", folio: "COT-Y1" });
    assert.ok(hoy.startsWith("🔔 *[HOY]* Quiere el tour para HOY"));
    assert.ok(hoy.includes("📋 COT-Y1"), "sin datos de la cotización, al menos el folio");
    assert.ok(hoy.includes("número no visible"), "sin teléfono (chat @lid) no inventa un wa.me");
    assert.ok(idx.textoAvisoEscalacion({ motivo: "otro", urgencia: "normal" }).startsWith("📝 *[NORMAL]*"));
  });

  await prueba("etiquetaMotivo: conocidas en español; desconocidas legibles", () => {
    assert.equal(idx.etiquetaMotivo("pide_humano"), "Pide hablar con una persona");
    assert.equal(idx.etiquetaMotivo("falla_bot"), "El bot no pudo responder");
    assert.equal(idx.etiquetaMotivo("algo_nuevo_raro"), "algo nuevo raro");
  });

  await prueba("duracionTexto: lo que dice el aviso de la pausa", () => {
    assert.equal(idx.duracionTexto(2 * 60 * 60 * 1000), "2 h");
    assert.equal(idx.duracionTexto(12 * 60 * 60 * 1000), "12 h");
    assert.equal(idx.duracionTexto(90 * 60 * 1000), "1 h 30 min");
    assert.equal(idx.duracionTexto(10 * 60 * 1000), "10 min");
    assert.equal(idx.duracionTexto(1000), "1 min");
  });

  await prueba("parsearConfirma: folio, monto y método en cualquier orden", () => {
    assert.deepEqual(idx.parsearConfirma("COT-ABC123 930"), { folio: "COT-ABC123", monto: 930, metodo: "transferencia", forzar: false });
    assert.deepEqual(idx.parsearConfirma("930 cot-abc123 oxxo"), { folio: "COT-ABC123", monto: 930, metodo: "deposito", forzar: false });
    assert.deepEqual(idx.parsearConfirma("$1,550 HP-M-XYZ12 efectivo"), { folio: "HP-M-XYZ12", monto: 1550, metodo: "efectivo", forzar: false });
    assert.equal(idx.parsearConfirma("COT-ABC123 930 depósito").metodo, "deposito", "con acento también");
    assert.equal(idx.parsearConfirma("COT-ABC123 930 liga").metodo, "stripe");
    assert.equal(idx.parsearConfirma("COT-ABC123 930 transferencia forzar").forzar, true);
  });

  await prueba("parsearConfirma: sin monto o con algo raro → error con el uso", () => {
    assert.ok(/Falta el monto/.test(idx.parsearConfirma("COT-ABC123").error), "el monto es obligatorio");
    assert.ok(/Falta el monto/.test(idx.parsearConfirma("COT-ABC123 0").error));
    assert.ok(/No entendí «mañana»/.test(idx.parsearConfirma("COT-ABC123 930 mañana").error));
    assert.ok(/Uso: \/confirma/.test(idx.parsearConfirma("").error));
    assert.ok(/Uso: \/confirma/.test(idx.parsearConfirma("930").error), "sin folio");
  });

  await prueba("parsearMonto: formatos de México", () => {
    assert.equal(idx.parsearMonto("930"), 930);
    assert.equal(idx.parsearMonto("$1,550"), 1550);
    assert.equal(idx.parsearMonto("1.550"), 1550);
    assert.equal(idx.parsearMonto("1,550.75"), 1551);
    assert.equal(idx.parsearMonto("930.50"), 931);
    assert.equal(idx.parsearMonto("930,5"), 931);
    assert.equal(idx.parsearMonto("mil"), null);
  });

  await prueba("teléfonos: 521… → 52…, y se comparan sin fallar por formato", () => {
    assert.equal(idx.normalizarTelefono("5210000000001"), "520000000001");
    assert.equal(idx.normalizarTelefono("+52 1 000 000 0001"), "520000000001");
    assert.equal(idx.normalizarTelefono("15550000001"), "15550000001", "un número de EE. UU. no se toca");
    assert.ok(idx.mxVariants("0000000001").includes("520000000001"));
    assert.ok(idx.mismoNumero("5210000000001", "0000000001"));
    assert.ok(idx.mismoNumero("520000000001", "5210000000001"));
    assert.ok(!idx.mismoNumero("520000000001", "520000000002"));
    assert.ok(!idx.mismoNumero("", "520000000001"));
  });

  await prueba("resumirError: el dueño entiende qué pasó", () => {
    assert.ok(/saldo/.test(idx.resumirError(new Error("Your credit balance is too low to access the API"))));
    assert.ok(/429/.test(idx.resumirError(new Error("429 rate_limit_error"))));
    assert.ok(/temporal del servidor/.test(idx.resumirError(new Error("529 overloaded_error"))));
    assert.ok(/red/.test(idx.resumirError(new Error("fetch failed"))));
    assert.equal(idx.resumirError(new Error("algo distinto\nsegunda línea")), "algo distinto");
  });

  const confirmado = {
    folio: "COT-X1", reservaFolio: "HP-M-X1", customerName: "laura prueba",
    recorridos: [{ nombre: "Expedición Tamul", fecha: "2026-11-20", salida: "8:00 AM", recogida: "Pasamos por ti a tu hospedaje en Ciudad Valles", queLlevar: ["traje de baño", "toalla"] }],
    adults: 2, children: 1, totalAmount: 3100, pagado: 930, saldo: 2170, liquidado: false, esPaquete: false, pideHospedaje: true,
  };

  await prueba("confirmación al cliente: folio, recorrido, qué llevar, pagado y saldo (sin tarjeta)", () => {
    const t = idx.textoConfirmacionCliente(confirmado, "es");
    assert.ok(t.includes("¡Listo, Laura! Tu reserva quedó confirmada."));
    assert.ok(t.includes("HP-M-X1"), "debe llevar el folio de la RESERVA");
    assert.ok(t.includes("Expedición Tamul") && t.includes("8:00 AM") && t.includes("Ciudad Valles"));
    assert.ok(t.includes("Qué llevar: traje de baño, toalla"));
    assert.ok(t.includes("2 adultos + 1 niño"));
    assert.ok(t.includes("3,100") && t.includes("930") && t.includes("2,170"));
    assert.ok(/efectivo o transferencia/.test(t), "el saldo es en efectivo o transferencia");
    assert.ok(!/tarjeta/i.test(t), "el guía no cobra con tarjeta");
    assert.ok(!/calzado cerrado/i.test(t), "ya no es la lista fija de antes");
    assert.ok(t.includes("¿En qué hotel se hospedan?"), "pide el hospedaje si falta");
  });

  await prueba("confirmación: paquete (saldo al check-in), dos recorridos con la misma lista, liquidada, inglés", () => {
    const dos = idx.textoConfirmacionCliente({
      ...confirmado, esPaquete: true, pideHospedaje: false,
      recorridos: [confirmado.recorridos[0], { ...confirmado.recorridos[0], nombre: "Cascadas del Meco", fecha: "2026-11-21" }],
    }, "es");
    assert.equal((dos.match(/Qué llevar/g) || []).length, 1, "la misma lista va una sola vez");
    assert.ok(/check-in/.test(dos));
    assert.ok(!/¿En qué hotel/.test(dos));
    const liq = idx.textoConfirmacionCliente({ ...confirmado, pagado: 3100, saldo: 0, liquidado: true }, "es");
    assert.ok(/no queda nada pendiente/.test(liq));
    const en = idx.textoConfirmacionCliente(confirmado, "en");
    assert.ok(/All set, Laura! Your booking is confirmed\./.test(en) && /Balance/.test(en) && /What to bring/.test(en));
  });

  await prueba("pago registrado (el saldo de una reserva que ya existía)", () => {
    const t = idx.textoPagoRegistrado({ ...confirmado, pagado: 3100, saldo: 0, liquidado: true }, "es");
    assert.ok(t.includes("Registramos tu pago") && t.includes("HP-M-X1") && /no queda nada pendiente/.test(t));
    assert.ok(!/quedó confirmada/.test(t), "no repite la confirmación completa");
  });

  fin();
})();

function fin() {
  // Lo que NO se puede probar aquí: aplicarEscalacion, pausar, pasarPorRegla y
  // confirmarPago viven dentro de index.js atados al cliente de WhatsApp y no
  // se exportan. Para probarlos sin WhatsApp habría que exportarlos con el
  // envío al dueño, el api y el almacén inyectables.
  console.log(fallas ? `\n❌ ${fallas} prueba(s) fallaron\n` : "\n✅ Todas pasaron\n");
  process.exit(fallas ? 1 : 0);
}
