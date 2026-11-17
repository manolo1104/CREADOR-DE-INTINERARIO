// ════════════════════════════════════════════════════════════════════
// PRUEBA (gratis, sin modelo): el pago entre dos personas.
//
// Caso de las pruebas de Manolo (17 nov 2026): una liga por persona; Laura
// paga su mitad con la liga y Jorge la otra mitad por transferencia.
//  · El comprobante de Jorge se liga a la RESERVA en que se convirtió la
//    cotización y se espera su mitad (antes: «sin cotización» y el bot le
//    pedía el folio).
//  · /confirma de la reserva por el mismo monto, por transferencia, SÍ se
//    registra (antes: «pago repetido» porque la liga cobró lo mismo).
//
//   node test-pago-dividido.js
// ════════════════════════════════════════════════════════════════════
const assert = require("assert");
const os = require("os");
const path = require("path");
const fs = require("fs");
const { crearSitioSimulado } = require("./sitio-simulado");
const medios = require("./medios");

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
  const sitio = crearSitioSimulado({ hoy: () => "2026-11-17" });
  const api = sitio.api;
  const q = await api.crearCotizacion({ tourSlug: "expedicion-tamul", tourDate: "2026-12-19", adults: 2, customerName: "Laura Prueba", waChatId: "laura@c.us" });
  const cot = q.data.folio;
  const anticipo = q.data.anticipo;
  const l = await api.ligasPorPersona(cot, 2);
  const [p1, p2] = l.data.ligas;

  await prueba("las dos ligas suman el anticipo", () => {
    assert.strictEqual(p1.monto + p2.monto, anticipo);
  });

  const pago = await sitio.pagarLiga(cot);
  const reserva = pago.reservaFolio;
  await prueba("la primera liga convierte la cotización en reserva", () => {
    assert.ok(pago.ok, pago.error);
    assert.match(reserva, /^HP-M-/);
  });

  const avisos = [];
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pago-dividido-"));
  const almacen = { comprobantesDe: () => [], guardarComprobante: () => {}, anotarComprobante: () => {} };
  const procesador = medios.createProofProcessor({ api, almacen, dir, enviarAlDueno: async (c) => { avisos.push(c); return true; }, log: { log() {}, warn() {}, error() {} } });
  const foto = { mimetype: "image/png", data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", filename: "jorge.png" };

  for (const [como, folioSesion] of [["con el folio COT viejo en la sesión", cot], ["con la reserva en la sesión", reserva]]) {
    avisos.length = 0;
    const r = await procesador.process({ chatId: `jorge-${como}@c.us`, nombre: "Jorge", sessionFolio: folioSesion, media: foto, mimetype: foto.mimetype, caption: "" });
    await prueba(`el comprobante de Jorge se liga a la reserva (${como})`, () => {
      assert.strictEqual(r.folio, reserva);
      assert.ok(r.cotizacion, "sin cotización");
      assert.strictEqual(r.cotizacion.esperado, p2.monto, `se esperaba ${p2.monto} (la parte que falta) y salió ${r.cotizacion.esperado}`);
      assert.ok(!/folio/i.test(r.ackText || "") || r.ackText.includes(reserva), `el acuse pide folio: ${r.ackText}`);
    });
  }

  const c1 = await api.confirmarReserva(reserva, p2.monto, { metodo: "transferencia" });
  await prueba("/confirma de la reserva por transferencia, mismo monto que la liga: SÍ se registra", () => {
    assert.ok(c1.ok, JSON.stringify(c1.data));
    assert.strictEqual(c1.data.cobroRegistrado, p2.monto);
    assert.strictEqual(c1.data.pagado, anticipo);
  });

  const c2 = await api.confirmarReserva(reserva, p2.monto, { metodo: "transferencia" });
  await prueba("el mismo /confirma otra vez sí se frena como repetido y dice cómo forzarlo", () => {
    assert.ok(!c2.ok);
    assert.match(c2.data.error, /forzar/);
  });

  const c3 = await api.confirmarReserva(reserva, p2.monto, { metodo: "transferencia", forzar: true });
  await prueba("con «forzar» se registra", () => {
    assert.ok(c3.ok, JSON.stringify(c3.data));
  });

  // «¿Cómo les fue?» solo con la reserva concretada y un pago registrado (17 nov 2026).
  const seguimiento = require("./seguimiento");
  const sinPagar = await api.crearCotizacion({ tourSlug: "expedicion-tamul", tourDate: "2026-12-19", adults: 2, customerName: "Sin Pago" });
  await prueba("post-viaje: una cotización que nunca se pagó NO pregunta «¿cómo les fue?»", async () => {
    const v = await seguimiento.viajeConPago(api, sinPagar.data.folio);
    assert.strictEqual(v.ok, false);
  });
  await prueba("post-viaje: la reserva con pago (liga o transferencia) sí, desde la COT o la HP-M", async () => {
    assert.deepStrictEqual(await seguimiento.viajeConPago(api, cot), { ok: true, reserva });
    assert.deepStrictEqual(await seguimiento.viajeConPago(api, reserva), { ok: true, reserva });
  });
  await prueba("post-viaje: si el sitio no contesta, no decide (se reintenta)", async () => {
    const caido = { consultarReserva: async () => ({ ok: false, status: 0, data: {} }) };
    assert.strictEqual(await seguimiento.viajeConPago(caido, cot), null);
  });

  fs.rmSync(dir, { recursive: true, force: true });
  console.log(fallas ? `\n❌ ${fallas} fallaron` : "\n✅ Todas pasaron");
  process.exit(fallas ? 1 : 0);
})();
