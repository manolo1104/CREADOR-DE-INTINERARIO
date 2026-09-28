// Prueba de la espera por ráfaga (buffer.js), SIN levantar WhatsApp.
// Los tiempos van 100x acelerados: 30 s → 300 ms, 90 s → 900 ms.
const assert = require("assert");
const { crearGestorDeRafagas } = require("./buffer");

const ESPERA = 300;   // "30 s"
const TOPE = 900;     // "90 s"
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
/** Espera a que se cumpla `cond` o se acabe el plazo. Devuelve si se cumplió. */
async function hasta(cond, plazoMs) {
  const fin = Date.now() + plazoMs;
  while (Date.now() < fin) { if (cond()) return true; await dormir(10); }
  return cond();
}

let fallas = 0;
async function prueba(nombre, fn) {
  try { await fn(); console.log(`  ✅ ${nombre}`); }
  catch (e) { fallas++; console.log(`  ❌ ${nombre}\n     ${e.message}`); }
}

/** Gestor de mentiras: guarda cada respuesta en vez de mandarla por WhatsApp. */
function banco({ tardaMs = 0 } = {}) {
  const respuestas = [];
  const gestor = crearGestorDeRafagas({
    debounceMs: ESPERA,
    maxMs: TOPE,
    responder: async (chatId, texto, info) => {
      const arrancoEn = Date.now();
      if (tardaMs) await dormir(tardaMs);
      respuestas.push({ chatId, texto, mensajes: info.mensajes, arrancoEn });
    },
  });
  return { gestor, respuestas };
}

(async () => {
  console.log("\n⏱️  Espera por ráfaga de mensajes\n");

  await prueba("un solo mensaje → una respuesta, después de la espera", async () => {
    const { gestor, respuestas } = banco();
    gestor.recibir("ana@c.us", "hola");
    await dormir(ESPERA * 0.5);
    assert.equal(respuestas.length, 0, "contestó ANTES de que terminara la espera");
    await dormir(ESPERA);
    assert.equal(respuestas.length, 1);
    assert.equal(respuestas[0].texto, "hola");
  });

  await prueba("ráfaga de 4 → UNA respuesta con los 4 juntos", async () => {
    const { gestor, respuestas } = banco();
    gestor.recibir("beto@c.us", "hola");
    await dormir(ESPERA * 0.4);
    gestor.recibir("beto@c.us", "somos 4");
    await dormir(ESPERA * 0.4);
    gestor.recibir("beto@c.us", "para el sábado");
    await dormir(ESPERA * 0.4);
    gestor.recibir("beto@c.us", "cuánto sale?");
    // Aún no debe haber contestado: cada mensaje reinició el reloj.
    assert.equal(respuestas.length, 0, "contestó a media ráfaga");
    await dormir(ESPERA * 1.5);
    assert.equal(respuestas.length, 1, `esperaba 1 respuesta, hubo ${respuestas.length}`);
    assert.equal(respuestas[0].mensajes, 4);
    assert.equal(respuestas[0].texto, "hola\nsomos 4\npara el sábado\ncuánto sale?");
  });

  await prueba("cliente que no para de escribir → el tope dispara", async () => {
    const { gestor, respuestas } = banco();
    // Escribe cada 0.8 de la espera: la ventana deslizante nunca cerraría sola.
    gestor.recibir("caro@c.us", "...");
    const arranque = Date.now();
    const golpes = setInterval(() => gestor.recibir("caro@c.us", "..."), ESPERA * 0.8);
    await dormir(TOPE * 1.4);
    clearInterval(golpes);
    assert.equal(respuestas.length, 1, `el tope no disparó (respuestas: ${respuestas.length})`);
    const tardo = respuestas[0].arrancoEn - arranque;
    assert.ok(tardo <= TOPE * 1.25, `disparó a los ${tardo}ms, el tope era ${TOPE}ms`);
  });

  await prueba("mensaje que llega MIENTRAS responde → no arranca dos a la vez", async () => {
    // El responder tarda 3 esperas completas, como el modelo con herramientas.
    const { gestor, respuestas } = banco({ tardaMs: ESPERA * 3 });
    gestor.recibir("dani@c.us", "hola");
    await dormir(ESPERA * 1.3);            // ya arrancó a responder
    assert.equal(gestor.ocupado("dani@c.us"), true, "debería estar ocupado");
    gestor.recibir("dani@c.us", "ah y somos 6");
    await dormir(ESPERA * 1.2);
    assert.equal(respuestas.length, 0, "arrancó una segunda respuesta en paralelo");
    // Termina la primera, arranca el reloj de la segunda y contesta. Van EN
    // SERIE, así que hay que esperar a que la primera acabe + la nueva espera
    // + lo que tarde la segunda.
    const llegaron = await hasta(() => respuestas.length === 2, ESPERA * 12);
    assert.ok(llegaron, `esperaba 2 respuestas en serie, hubo ${respuestas.length}`);
    assert.equal(respuestas[0].texto, "hola");
    assert.equal(respuestas[1].texto, "ah y somos 6");
    assert.ok(respuestas[1].arrancoEn > respuestas[0].arrancoEn, "se encimaron");
  });

  await prueba("dos clientes distintos no se estorban", async () => {
    const { gestor, respuestas } = banco({ tardaMs: ESPERA });
    gestor.recibir("eva@c.us", "hola");
    gestor.recibir("fabi@c.us", "buenas");
    await dormir(ESPERA * 2.5);
    assert.equal(respuestas.length, 2);
    assert.deepEqual(respuestas.map((r) => r.chatId).sort(), ["eva@c.us", "fabi@c.us"]);
  });

  await prueba("si un humano toma el chat, la ráfaga se descarta", async () => {
    const { gestor, respuestas } = banco();
    gestor.recibir("gera@c.us", "hola");
    await dormir(ESPERA * 0.4);
    gestor.descartar("gera@c.us");
    await dormir(ESPERA * 2);
    assert.equal(respuestas.length, 0, "contestó aunque el chat lo tomó un humano");
  });

  console.log(fallas ? `\n❌ ${fallas} prueba(s) fallaron\n` : "\n✅ Todas pasaron\n");
  process.exit(fallas ? 1 : 0);
})();
