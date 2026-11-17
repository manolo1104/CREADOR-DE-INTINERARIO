// ════════════════════════════════════════════════════════════════════
// Memoria del bot que sobrevive a reinicios y despliegues.
//
// Antes las conversaciones y las pausas vivían solo en memoria: cada
// despliegue (y Railway despliega con cada push) borraba lo hablado con todos
// los clientes, el folio que estaban por pagar, y soltaba las pausas — el bot
// volvía a contestar encima del equipo en chats que una persona ya atendía.
//
// Aquí se guarda, en UN archivo JSON del volumen persistente
// (ESTADO_PATH, por omisión ./.wwebjs_auth/estado-bot.json):
//   · sesiones      { chatId: {phone, history, lastFolio, locale, …} }
//   · pausas        { chatId: {hasta (ms | null = hasta /reanuda), motivo, modo, desde, telefono?, humanoAt?} }
//   · comprobantes  { folio: [{path, mimetype, filename, at, chatId}] }
//
// Reglas:
//   · Escribe a los 5 s del primer cambio sin guardar (no en cada mensaje) y
//     al apagarse (SIGTERM de Railway, Ctrl+C, salida normal).
//   · Escritura atómica: archivo temporal + rename. Un apagón a media
//     escritura deja el archivo anterior intacto, nunca uno a medias.
//   · Un archivo dañado NUNCA tumba el bot: se aparta como
//     .corrupto-<fecha> y se arranca vacío.
//   · Lo de más de 30 días se poda (y su archivo de comprobante se borra).
//
// Sin `iniciar()` todo vive solo en memoria: así test-chat.js y el simulador
// usan las mismas sesiones sin ensuciar el archivo de producción.
// ════════════════════════════════════════════════════════════════════

const fs = require("fs");
const path = require("path");

const DIR_VOLUMEN = path.join(__dirname, ".wwebjs_auth");
const ESTADO_PATH = path.resolve(process.env.ESTADO_PATH || path.join(DIR_VOLUMEN, "estado-bot.json"));
const COMPROBANTES_DIR = path.resolve(process.env.COMPROBANTES_DIR || path.join(DIR_VOLUMEN, "comprobantes"));
const DIA_MS = 24 * 60 * 60 * 1000;
const RETENCION_MS = 30 * DIA_MS;
const VERSION = 1;

function vacio() {
  return { version: VERSION, guardadoAt: null, sesiones: {}, pausas: {}, comprobantes: {} };
}

function esObjeto(x) {
  return Boolean(x) && typeof x === "object" && !Array.isArray(x);
}

/** `at` llega como milisegundos (lo nuevo) o como texto ISO; lo raro cuenta como viejo. */
function msDe(x) {
  if (typeof x === "number" && Number.isFinite(x)) return x;
  const t = Date.parse(x);
  return Number.isFinite(t) ? t : 0;
}

/**
 * Crea un almacén independiente. El bot usa el de abajo (`module.exports`);
 * las pruebas crean el suyo con una ruta temporal.
 *
 * @param {object} [opts]
 * @param {string} [opts.ruta]            Archivo JSON (ESTADO_PATH).
 * @param {string} [opts.comprobantesDir] Solo se borran al podar archivos de AQUÍ adentro.
 * @param {number} [opts.debounceMs]      Espera antes de escribir (5 s).
 * @param {number} [opts.retencionMs]     Lo más viejo que esto se poda (30 días).
 * @param {() => number} [opts.ahora]     Reloj (las pruebas lo adelantan).
 */
function crearAlmacen({
  ruta = ESTADO_PATH,
  comprobantesDir = COMPROBANTES_DIR,
  debounceMs = 5000,
  retencionMs = RETENCION_MS,
  log = console,
  ahora = () => Date.now(),
} = {}) {
  ruta = path.resolve(ruta);
  const dirComprobantes = comprobantesDir ? path.resolve(comprobantesDir) : null;
  let datos = vacio();
  let activo = false;     // ¿se escribe a disco? (solo después de iniciar/activar)
  let sucio = false;      // hay cambios sin guardar
  let timer = null;
  let cierreInstalado = false;

  const avisar = (...a) => { try { (log.warn || log.log).call(log, ...a); } catch { /* sin log */ } };

  function resumen() {
    const comprobantes = Object.values(datos.comprobantes).reduce((n, l) => n + (Array.isArray(l) ? l.length : 0), 0);
    return {
      ruta,
      sesiones: Object.keys(datos.sesiones).length,
      pausas: Object.keys(datos.pausas).length,
      comprobantes,
    };
  }

  // El archivo dañado se aparta (no se borra: puede servir para recuperar a
  // mano una conversación) y el bot sigue con la memoria vacía.
  function apartarDanado(motivo) {
    const fecha = new Date(ahora()).toISOString().replace(/[:.]/g, "-");
    const destino = `${ruta}.corrupto-${fecha}`;
    try {
      fs.renameSync(ruta, destino);
      avisar(`⚠️ estado: ${ruta} estaba dañado (${motivo}); lo aparté como ${path.basename(destino)} y arranco con la memoria vacía.`);
    } catch (e) {
      avisar(`⚠️ estado: ${ruta} estaba dañado (${motivo}) y no pude apartarlo: ${e.message}. Arranco con la memoria vacía.`);
    }
  }

  /** Lee el archivo. Si no existe, memoria vacía; si está dañado, lo aparta. Nunca lanza. */
  function cargar() {
    datos = vacio();
    let crudo;
    try {
      crudo = fs.readFileSync(ruta, "utf8");
    } catch (e) {
      if (e.code !== "ENOENT") avisar(`⚠️ estado: no pude leer ${ruta}: ${e.message}. Arranco con la memoria vacía.`);
      return resumen();
    }
    let leido = null;
    try { leido = JSON.parse(crudo); } catch (e) { leido = e; }
    if (!esObjeto(leido) || leido instanceof Error) {
      apartarDanado(leido instanceof Error ? "JSON inválido" : "no es un objeto");
      return resumen();
    }
    // Cada sección se revisa por separado: una pausa rara no debe costar
    // todas las conversaciones.
    if (esObjeto(leido.sesiones)) {
      for (const [id, s] of Object.entries(leido.sesiones)) {
        if (esObjeto(s) && Array.isArray(s.history)) datos.sesiones[id] = s;
      }
    }
    if (esObjeto(leido.pausas)) {
      for (const [id, p] of Object.entries(leido.pausas)) {
        if (esObjeto(p) && (p.hasta === null || Number.isFinite(Number(p.hasta)))) datos.pausas[id] = p;
      }
    }
    if (esObjeto(leido.comprobantes)) {
      for (const [folio, lista] of Object.entries(leido.comprobantes)) {
        if (!Array.isArray(lista)) continue;
        const buenos = lista.filter((c) => esObjeto(c) && typeof c.path === "string");
        if (buenos.length) datos.comprobantes[folio] = buenos;
      }
    }
    if (podar()) sucio = true;
    return resumen();
  }

  function borrarArchivo(p) {
    if (!dirComprobantes || typeof p !== "string") return;
    const abs = path.resolve(p);
    // Solo lo que el bot guardó en su carpeta: el JSON no decide qué se borra del disco.
    if (!abs.startsWith(dirComprobantes + path.sep)) return;
    try { fs.unlinkSync(abs); } catch (e) {
      if (e.code !== "ENOENT") avisar(`⚠️ estado: no pude borrar ${path.basename(abs)}: ${e.message}`);
    }
  }

  /** Quita lo viejo. Devuelve true si cambió algo. */
  function podar() {
    const t = ahora();
    const limite = t - retencionMs;
    let cambio = false;
    for (const [id, s] of Object.entries(datos.sesiones)) {
      if (msDe(s.updatedAt || s.createdAt) < limite) { delete datos.sesiones[id]; cambio = true; }
    }
    for (const [id, p] of Object.entries(datos.pausas)) {
      // Una pausa vencida se queda un día más: index.js la usa para avisarle
      // al modelo que el equipo atendió el chat. Una «hasta /reanuda» se
      // olvida a los 30 días, como todo lo demás.
      const vieja = p.hasta === null || p.hasta === undefined
        ? msDe(p.desde) < limite
        : msDe(p.hasta) + DIA_MS < t;
      if (vieja) { delete datos.pausas[id]; cambio = true; }
    }
    for (const [folio, lista] of Object.entries(datos.comprobantes)) {
      const vivos = [];
      for (const c of lista) {
        if (msDe(c.at) < limite) { borrarArchivo(c.path); cambio = true; } else vivos.push(c);
      }
      if (vivos.length) datos.comprobantes[folio] = vivos;
      else { delete datos.comprobantes[folio]; cambio = true; }
    }
    return cambio;
  }

  /** Escribe YA (temporal + rename). Devuelve si se pudo; nunca lanza. */
  function guardarAhora() {
    if (timer) { clearTimeout(timer); timer = null; }
    const tmp = `${ruta}.tmp-${process.pid}`;
    try {
      podar();
      fs.mkdirSync(path.dirname(ruta), { recursive: true });
      datos.guardadoAt = new Date(ahora()).toISOString();
      fs.writeFileSync(tmp, JSON.stringify(datos));
      fs.renameSync(tmp, ruta);
      sucio = false;
      return true;
    } catch (e) {
      avisar(`⚠️ estado: no pude guardar ${ruta}: ${e.message}`);
      try { fs.unlinkSync(tmp); } catch { /* no había temporal */ }
      return false;
    }
  }

  /**
   * Avisa que algo cambió. Se guarda a los `debounceMs` del PRIMER cambio
   * pendiente (no se reinicia con cada uno): con mensajes seguidos, una
   * espera que se reiniciara no guardaría nunca.
   */
  function marcarCambio() {
    sucio = true;
    if (!activo || timer) return;
    timer = setTimeout(() => {
      timer = null;
      if (sucio) guardarAhora();
    }, debounceMs);
    if (timer.unref) timer.unref();
  }

  /** A partir de aquí los cambios se escriben a disco. */
  function activar() {
    activo = true;
    if (sucio) marcarCambio();
  }

  /** Guarda al apagarse: SIGTERM (Railway al desplegar), SIGINT (Ctrl+C) y salida normal. */
  function instalarCierre() {
    if (cierreInstalado) return;
    cierreInstalado = true;
    const alSalir = () => { if (activo && sucio) guardarAhora(); };
    // `exit` es síncrono y corre aun tras un process.exit(1): guardarAhora también lo es.
    process.on("exit", alSalir);
    process.on("beforeExit", alSalir);
    for (const senal of ["SIGTERM", "SIGINT"]) {
      process.once(senal, () => {
        console.log(`💾 ${senal}: guardo la memoria del bot.`);
        if (activo) guardarAhora();
        // Si nadie más escucha la señal (aún no arranca Chromium, o es una
        // prueba), se apaga aquí, como haría Node solo. Si la escucha puppeteer,
        // él cierra el navegador con calma: matarlo de golpe puede dañar la
        // sesión de WhatsApp y obligar a escanear el QR otra vez.
        if (process.listenerCount(senal) === 0) process.exit(0);
      });
    }
  }

  /** Lo que hace index.js al arrancar: cargar + escribir cambios + guardar al apagarse. */
  function iniciar({ cierre = true } = {}) {
    const r = cargar();
    activar();
    if (cierre) instalarCierre();
    return r;
  }

  // ── Sesiones ───────────────────────────────────────────────
  function sesion(chatId) {
    return datos.sesiones[chatId] || null;
  }
  function ponerSesion(chatId, s) {
    datos.sesiones[chatId] = s;
    marcarCambio();
    return s;
  }
  function quitarSesion(chatId) {
    const habia = Object.prototype.hasOwnProperty.call(datos.sesiones, chatId);
    delete datos.sesiones[chatId];
    marcarCambio();
    return habia;
  }
  /** El objeto vivo { chatId: sesión } (para recorrerlo; no reemplazarlo). */
  function sesiones() {
    return datos.sesiones;
  }

  // ── Pausas ─────────────────────────────────────────────────
  /** La pausa guardada TAL CUAL, aunque ya haya vencido (quien llama decide). */
  function pausa(chatId) {
    return datos.pausas[chatId] || null;
  }
  /** La pausa solo si sigue en pie (hasta === null o en el futuro). */
  function pausaVigente(chatId) {
    const p = datos.pausas[chatId];
    if (!p) return null;
    return p.hasta === null || p.hasta === undefined || Number(p.hasta) > ahora() ? p : null;
  }
  /**
   * @param {{hasta:number|null, motivo?:string, modo?:string, desde?:number, telefono?:string, humanoAt?:number}} p
   * `humanoAt`: cuándo escribió alguien del equipo en el chat (una pausa «hasta
   * /reanuda» no cambia de modo, y sin esto no se sabría que ya la atendieron).
   */
  function pausar(chatId, p = {}) {
    const entrada = {
      hasta: p.hasta === null || p.hasta === undefined ? null : Number(p.hasta),
      motivo: p.motivo || null,
      modo: p.modo || null,
      desde: Number(p.desde) || ahora(),
    };
    if (p.telefono) entrada.telefono = String(p.telefono);
    if (Number(p.humanoAt) > 0) entrada.humanoAt = Number(p.humanoAt);
    datos.pausas[chatId] = entrada;
    marcarCambio();
    return entrada;
  }
  function quitarPausa(chatId) {
    const habia = Object.prototype.hasOwnProperty.call(datos.pausas, chatId);
    delete datos.pausas[chatId];
    if (habia) marcarCambio();
    return habia;
  }
  /** El objeto vivo { chatId: pausa } (incluye vencidas de menos de un día). */
  function pausas() {
    return datos.pausas;
  }

  // ── Comprobantes ───────────────────────────────────────────
  /** Anota un archivo del folio. Devuelve cuántos lleva ese folio (este incluido). */
  function agregarComprobante(folio, c = {}) {
    const k = String(folio || "").trim().toUpperCase();
    if (!k || typeof c.path !== "string") return 0;
    const lista = datos.comprobantes[k] || (datos.comprobantes[k] = []);
    lista.push({
      path: c.path,
      mimetype: c.mimetype || "",
      filename: c.filename || path.basename(c.path),
      at: Number(c.at) || ahora(),
      chatId: c.chatId || null,
    });
    marcarCambio();
    return lista.length;
  }
  function comprobantesDe(folio) {
    const k = String(folio || "").trim().toUpperCase();
    return (datos.comprobantes[k] || []).slice();
  }
  function ultimoComprobante(folio) {
    const lista = comprobantesDe(folio);
    return lista.length ? lista[lista.length - 1] : null;
  }

  return {
    ruta,
    comprobantesDir: dirComprobantes,
    cargar,
    activar,
    instalarCierre,
    iniciar,
    marcarCambio,
    guardarAhora,
    podar,
    resumen,
    sesion,
    ponerSesion,
    quitarSesion,
    sesiones,
    pausa,
    pausaVigente,
    pausar,
    quitarPausa,
    pausas,
    agregarComprobante,
    comprobantesDe,
    ultimoComprobante,
  };
}

// El almacén del bot. Nace vacío y en memoria; index.js llama `iniciar()`.
const almacen = crearAlmacen();

module.exports = {
  ...almacen,
  crearAlmacen,
  ESTADO_PATH,
  COMPROBANTES_DIR,
  RETENCION_MS,
};
