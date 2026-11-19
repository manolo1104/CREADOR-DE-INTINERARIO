// Historial de conversación, datos del cliente y FICHA DEL VIAJE, por chat.
//
// La clave es el chatId TAL CUAL llega de WhatsApp ("…@c.us" o "…@lid"): en
// un chat @lid sus dígitos NO son un teléfono, por eso el teléfono real viaja
// aparte en `telefono` (lo resuelve index.js con getContactLidAndPhone).
//
// Las sesiones viven en estado.js: sobreviven a reinicios y despliegues
// cuando index.js llama `estado.iniciar()`. Sin eso (test-chat.js, el
// simulador) se quedan en memoria, como antes.
//
// Forma de una sesión:
//   { phone (= chatId), history: [], lastFolio, locale ("es"|"en"|null),
//     telefono (dígitos reales | null), nombre, zonaHospedaje,
//     escalacion: null | {motivo, modo, urgencia, resumen, folio, at},
//     saldoPendiente (lo que debe de lastFolio según la última confirmación;
//       0 = liquidado, null = no se sabe: una cotización aún sin pagar),
//     botAt (última vez que el bot le contestó; null si nunca),
//     ficha (la ficha del viaje, abajo; siempre un objeto),
//     createdAt, updatedAt }
//
// Ficha del viaje: lo que YA quedó confirmado con el cliente. 🔴 El bot veía
// solo los últimos 40 mensajes y en plena cotización eso eran 5–10 del
// cliente: olvidaba el tour, la fecha o la zona que ya le habían dicho. La
// ficha la llena el CÓDIGO, nunca el modelo: agent.js con lo que entra y sale
// de las herramientas, e index.js con el comprobante y el /confirma. El modelo
// la lee en cada turno (fichaComoTexto), aunque el historial se haya recortado.
//   { recorridos: [{slug, nombre, fecha, adultos, ninosMid, ninosSmall,
//                   ruta, vehiculo, unidades, hora}],
//       (RZR: `adultos` = total de personas; se cobra por vehículo, sin niños)
//       SOLO lo que cotizó el servidor (o el folio que trajo el cliente).
//     zonaHospedaje, hotel: {habitacion, checkin, checkout, huespedes} | null,
//       (`hotel` solo de una cotización CON hospedaje)
//     nombre, correo, folioVigente, foliosReemplazados: [],
//     comprobanteRecibido, pagoValidado, reservaFolio,
//     consultados: [recorridos]   precios que solo consultó (calcular_precio,
//                                 cotizar_rzr): platicado, SIN confirmar
//     fechasDichas: ["AAAA-MM-DD"] fechas que dio (validar_fecha) sin tour
//     hotelConsultado: {checkin, checkout, huespedes} | null  vio cuartos
//                                 (disponibilidad): NO dijo que se queda
//     opciones: [{folio, recorridos, hotel}]  otras cotizaciones vivas a la
//                                 vez (cotizadas aparte): siguen valiendo
//     actualizado (ms del último cambio | null) }
// 🔴 Antes lo que solo se consultó se guardaba como «viaje confirmado»: un
// precio que el bot dio para comparar, o los cuartos que revisó, salían en la
// ficha como si el cliente ya los hubiera elegido, y el bot recotizaba con un
// hotel que nadie aceptó.

const estado = require("./estado");

/** Entero > 0 de una variable de entorno; si no viene o no sirve, el de omisión. */
function enteroDeEnv(nombre, porOmision) {
  const n = parseInt(process.env[nombre], 10);
  return Number.isFinite(n) && n > 0 ? n : porOmision;
}

// ── Tope del historial ────────────────────────────────────────
// 🔴 Eran 40 MENSAJES en total y cada herramienta suma 2 (su llamada y su
// resultado). Ahora se cuentan los mensajes del CLIENTE. Y se recorta en
// bloques: al pasar de 30 se queda con los últimos 20. Un recorte en cada
// mensaje cambiaría el principio del historial cada vez y el caché del prompt
// no se aprovecharía nunca; así se rompe una vez cada 10 mensajes del cliente.
const MAX_MENSAJES_CLIENTE = enteroDeEnv("BOT_MAX_MENSAJES_CLIENTE", 30);
const DEJA_MENSAJES_CLIENTE = Math.min(
  MAX_MENSAJES_CLIENTE,
  enteroDeEnv("BOT_DEJA_MENSAJES_CLIENTE", Math.max(1, Math.round((MAX_MENSAJES_CLIENTE * 2) / 3))),
);
// Red de seguridad por TAMAÑO: los resultados de las herramientas pesan
// (la ficha de un tour son miles de caracteres) y una plática con muchas
// consultas podría pasarse del contexto del modelo, que contesta con un 400 y
// deja el chat muerto. ~400 mil caracteres son ~100 mil tokens: sobra para 30
// mensajes normales; solo se nota en una plática fuera de lo común.
const MAX_CARACTERES_HISTORIAL = enteroDeEnv("BOT_MAX_CARACTERES_HISTORIAL", 400000);

const CAMPOS_NULOS = ["lastFolio", "locale", "telefono", "nombre", "zonaHospedaje", "escalacion", "saldoPendiente", "botAt"];

function nuevaSesion(chatId) {
  const ahora = Date.now();
  return {
    phone: chatId,
    history: [],
    lastFolio: null,
    locale: null,
    telefono: null,
    nombre: null,
    zonaHospedaje: null,
    escalacion: null,
    saldoPendiente: null,
    botAt: null,
    ficha: fichaVacia(),
    createdAt: ahora,
    updatedAt: ahora,
  };
}

// Una sesión guardada por una versión anterior del bot no trae los campos
// nuevos: se completan para que nadie lea `undefined`. La ficha también (las
// sesiones de antes de la fase 2 no la tienen).
function completar(s, chatId) {
  if (!Array.isArray(s.history)) s.history = [];
  if (!s.phone) s.phone = chatId;
  for (const k of CAMPOS_NULOS) if (s[k] === undefined) s[k] = null;
  s.ficha = completarFicha(s.ficha);
  if (!s.createdAt) s.createdAt = Date.now();
  if (!s.updatedAt) s.updatedAt = s.createdAt;
  return s;
}

/** La sesión del chat; la crea si no existe. */
function getSession(chatId) {
  let s = estado.sesion(chatId);
  if (!s) s = estado.ponerSesion(chatId, nuevaSesion(chatId));
  else completar(s, chatId);
  // agent.js escribe directo sobre la sesión (history, lastFolio…), así que
  // cada acceso agenda el guardado. Es barato: se escribe a lo más cada 5 s.
  estado.marcarCambio();
  return s;
}

/** La sesión si ya existe, SIN crearla (para preguntar «¿el bot ya habló con este chat?»). */
function sesionExistente(chatId) {
  const s = estado.sesion(chatId);
  return s ? completar(s, chatId) : null;
}

// ══════════════════════════════════════════════════════════════
// HISTORIAL
// ══════════════════════════════════════════════════════════════

/**
 * ¿Es un mensaje escrito por el cliente? Un turno de texto del lado del
 * usuario, no un resultado de herramienta. (Las notas «[sistema] …» de
 * index.js también cuentan: se juntan con lo que escribe el cliente.)
 */
function esTextoDelCliente(m) {
  if (!m || m.role !== "user") return false;
  if (typeof m.content === "string") return m.content.trim() !== "";
  return Array.isArray(m.content) &&
    !m.content.some((b) => b && b.type === "tool_result") &&
    m.content.some((b) => b && b.type === "text" && String(b.text || "").trim() !== "");
}

function indicesDelCliente(history) {
  const idx = [];
  history.forEach((m, i) => { if (esTextoDelCliente(m)) idx.push(i); });
  return idx;
}

/**
 * El historial recortado (función pura; devuelve el MISMO arreglo si no hay
 * nada que recortar):
 *  · Siempre empieza en un mensaje del cliente. 🔴 El recorte de antes podía
 *    dejar al principio un resultado de herramienta sin su llamada, y la API
 *    rechazaba la conversación entera con un 400.
 *  · Pasando de `max` mensajes del cliente se queda con los últimos `deja`.
 *  · Si aun así pesa más de `maxCaracteres`, suelta el tercio más viejo de los
 *    mensajes del cliente hasta que quepa (nunca el último).
 * Como cada corte cae en un mensaje del cliente, nunca separa una llamada de
 * herramienta de su resultado.
 */
function recortarHistorial(history, {
  max = MAX_MENSAJES_CLIENTE,
  deja = DEJA_MENSAJES_CLIENTE,
  maxCaracteres = MAX_CARACTERES_HISTORIAL,
} = {}) {
  const h = Array.isArray(history) ? history : [];
  const idx = indicesDelCliente(h);
  // Sin un solo mensaje del cliente no hay dónde cortar (p. ej. un historial
  // que solo tiene la línea que escribió el equipo): se deja como está.
  if (!idx.length) return h;
  const tope = Math.max(1, Number(max) || MAX_MENSAJES_CLIENTE);
  const quedan = Math.max(1, Math.min(Number(deja) || DEJA_MENSAJES_CLIENTE, tope));
  const inicio = idx.length > tope ? idx[idx.length - quedan] : idx[0];
  let out = inicio > 0 ? h.slice(inicio) : h;

  if (maxCaracteres > 0) {
    let tam = JSON.stringify(out).length;
    while (tam > maxCaracteres) {
      const deCliente = indicesDelCliente(out);
      if (deCliente.length <= 1) break;
      const quita = Math.min(deCliente.length - 1, Math.max(1, Math.floor(deCliente.length / 3)));
      out = out.slice(deCliente[quita]);
      tam = JSON.stringify(out).length;
    }
  }
  return out;
}

function pushHistory(chatId, role, content) {
  const s = getSession(chatId);
  const last = s.history[s.history.length - 1];
  // Fusiona mensajes de texto consecutivos del mismo rol para mantener la
  // alternancia que exige la API (útil cuando el bot "lee" durante una pausa:
  // varios mensajes del cliente o del dueño seguidos se juntan en un turno).
  if (last && last.role === role && typeof last.content === "string" && typeof content === "string") {
    last.content += "\n" + content;
  } else {
    s.history.push({ role, content });
  }
  s.history = recortarHistorial(s.history);
  s.updatedAt = Date.now();
  estado.marcarCambio();
}

/**
 * Cambia la última respuesta del bot en el historial por lo que de verdad se
 * mandó. Para cuando index.js retoca la respuesta después de que agent.js la
 * guardó (p. ej. le quita la petición de comprobante porque el cliente lo
 * mandó mientras el modelo contestaba): el modelo debe recordar lo que el
 * cliente LEYÓ, no lo que el modelo escribió.
 *   · `textoOriginal` (lo que devolvió processMessage): si viene, solo se
 *     sustituye ESE pedazo; así no se pisa un acuse que se haya pegado detrás.
 *   · `textoEnviado` vacío = no se mandó nada: ese pedazo se quita.
 * Solo mira el ÚLTIMO mensaje, y solo si es del bot. Devuelve si cambió algo.
 */
function corregirUltimaRespuesta(chatId, textoEnviado, textoOriginal) {
  const enviado = String(textoEnviado == null ? "" : textoEnviado).trim();
  const original = textoOriginal == null ? "" : String(textoOriginal).trim();
  const s = sesionExistente(chatId);
  if (!s || !s.history.length) return false;
  const i = s.history.length - 1;
  const m = s.history[i];
  if (!m || m.role !== "assistant" || typeof m.content !== "string") return false;
  if (original && !m.content.includes(original)) return false;
  const nuevo = (original ? m.content.replace(original, enviado) : enviado).replace(/\n{3,}/g, "\n\n").trim();
  if (nuevo === m.content) return false;
  if (nuevo) m.content = nuevo;
  else s.history.splice(i, 1);
  s.updatedAt = Date.now();
  estado.marcarCambio();
  return true;
}

function clearSession(chatId) {
  estado.quitarSesion(chatId);
}

// ══════════════════════════════════════════════════════════════
// FICHA DEL VIAJE
// ══════════════════════════════════════════════════════════════
const CLAVES_RECORRIDO = ["slug", "nombre", "fecha", "adultos", "ninosMid", "ninosSmall", "bebes", "ruta", "vehiculo", "unidades", "hora"];
// Un viaje real lleva pocos recorridos; el tope evita que una plática de
// muchas consultas llene la ficha de tours que solo se preguntaron.
const MAX_RECORRIDOS = 8;
const MAX_FOLIOS_REEMPLAZADOS = 10;
// Lo platicado sin cotizar: los más recientes bastan.
const MAX_CONSULTADOS = 6;
const MAX_FECHAS_DICHAS = 6;
// Cotizaciones vivas a la vez además de la vigente (opciones para comparar,
// otra persona, un extra): más de eso ya lo ve el equipo.
const MAX_OPCIONES = 3;

function fichaVacia() {
  return {
    recorridos: [],
    zonaHospedaje: null,
    hotelRecogida: null,
    hotel: null,
    nombre: null,
    correo: null,
    folioVigente: null,
    foliosReemplazados: [],
    comprobanteRecibido: false,
    pagoValidado: false,
    reservaFolio: null,
    consultados: [],
    fechasDichas: [],
    hotelConsultado: null,
    opciones: [],
    actualizado: null,
  };
}

const esObjeto = (x) => Boolean(x) && typeof x === "object" && !Array.isArray(x);

/** Le pone a una ficha guardada (o a nada) los campos que le falten, en el mismo objeto. */
function completarFicha(f) {
  if (!esObjeto(f)) return fichaVacia();
  const base = fichaVacia();
  for (const [k, v] of Object.entries(base)) if (f[k] === undefined) f[k] = v;
  for (const k of ["recorridos", "foliosReemplazados", "consultados", "fechasDichas", "opciones"]) {
    if (!Array.isArray(f[k])) f[k] = [];
  }
  if (f.hotel !== null && !esObjeto(f.hotel)) f.hotel = null;
  if (f.hotelConsultado !== null && !esObjeto(f.hotelConsultado)) f.hotelConsultado = null;
  f.comprobanteRecibido = f.comprobanteRecibido === true;
  f.pagoValidado = f.pagoValidado === true;
  return f;
}

// ── Normalización (la ficha guarda siempre los mismos tipos) ──
/**
 * Texto de UNA línea y con tope. El nombre, el correo, la zona o el cuarto
 * salen de lo que escribió el cliente (vía el modelo) y el modelo los relee en
 * cada turno: sin saltos de línea, corchetes ni comillas angulares, nadie
 * puede colar ahí un renglón que parezca «[sistema] …» o una regla nueva.
 */
function texto(v, max = 120) {
  const s = String(v == null ? "" : v)
    .replace(/[\u0000-\u001f\u007f\u2028\u2029]+/g, " ")
    .replace(/[[\]{}<>«»`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return s ? s.slice(0, max) : null;
}
/** "2026-10-29" (o el principio de "2026-10-29T…") → "2026-10-29"; lo demás, null. */
function fechaYMD(v) {
  const m = String(v == null ? "" : v).trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}
/** Entero ≥ 0, o null si no vino (un 0 que sí vino se queda: "cero niños"). */
function cantidad(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
function horaHHMM(v) {
  const m = String(v == null ? "" : v).trim().match(/^(\d{1,2}):(\d{2})/);
  return m ? `${m[1].padStart(2, "0")}:${m[2]}` : null;
}
/** Folio en mayúsculas ("cot-ab12" → "COT-AB12"), o null. */
function folioNormal(v) {
  const s = String(v == null ? "" : v).trim().toUpperCase();
  return /^[A-Z0-9][A-Z0-9-]{2,39}$/.test(s) ? s : null;
}
/** ¿Folio de COTIZACIÓN? (COT-… o HP-P-…). Las reservas son HP-M-… o HP…. */
function esFolioCotizacion(v) {
  const f = folioNormal(v);
  return Boolean(f) && /^(COT-|HP-P-)/.test(f);
}

function normalizarRecorrido(r) {
  const o = esObjeto(r) ? r : {};
  const slug = texto(o.slug, 80);
  return {
    slug: slug ? slug.toLowerCase() : null,
    nombre: texto(o.nombre, 120),
    fecha: fechaYMD(o.fecha),
    adultos: cantidad(o.adultos),
    ninosMid: cantidad(o.ninosMid),
    ninosSmall: cantidad(o.ninosSmall),
    bebes: cantidad(o.bebes),
    ruta: texto(o.ruta, 60),
    vehiculo: texto(o.vehiculo, 60),
    unidades: cantidad(o.unidades),
    hora: horaHHMM(o.hora),
  };
}

/** Lo nuevo manda; lo que no trae se conserva del mismo recorrido. */
function combinarRecorrido(viejo, nuevo) {
  const out = {};
  for (const k of CLAVES_RECORRIDO) out[k] = nuevo[k] !== null && nuevo[k] !== undefined ? nuevo[k] : (viejo[k] ?? null);
  return out;
}

/** Tope de recorridos: primero se van los más viejos que no tienen fecha. */
function limitarRecorridos(lista) {
  const out = lista.slice();
  while (out.length > MAX_RECORRIDOS) {
    const sinFecha = out.findIndex((r) => !r.fecha);
    out.splice(sinFecha >= 0 ? sinFecha : 0, 1);
  }
  return out;
}

/**
 * Un tour que solo se CONSULTÓ (calcular_precio, cotizar_rzr), a la lista de
 * lo platicado: se actualiza el del MISMO tour (otra fecha u otra gente) o se
 * agrega; el más reciente queda al final. A propósito no se sustituye por
 * fecha: dos tours el mismo día pueden ser dos opciones que se comparan, o dos
 * recorridos de verdad (el café y el RZR, la Ruta Surrealista y la Gruta de
 * Xilo en la noche). 🔴 Antes otro tour el mismo día borraba al anterior, y
 * lo consultado salía en la ficha como «viaje confirmado».
 */
function ponerConsultado(lista, nuevo) {
  const r = normalizarRecorrido(nuevo);
  if (!r.slug && !r.nombre) return lista;
  const out = lista.map(normalizarRecorrido);
  const i = out.findIndex((x) => (r.slug ? x.slug === r.slug : !x.slug && x.nombre === r.nombre));
  if (i >= 0) {
    const combinado = combinarRecorrido(out[i], r);
    out.splice(i, 1);
    out.push(combinado);
  } else {
    out.push(r);
  }
  return out.slice(-MAX_CONSULTADOS);
}

/** Una fecha que dio el cliente (validar_fecha) y todavía no es de ningún tour: se guardan todas, sin repetir. */
function ponerFecha(lista, ymd) {
  const y = fechaYMD(ymd);
  if (!y) return lista;
  const out = lista.map(fechaYMD).filter(Boolean);
  if (!out.includes(y)) out.push(y);
  return out.slice(-MAX_FECHAS_DICHAS);
}

/** El hotel de la ficha; con las mismas fechas conserva lo que no venga (el cuarto que ya eligió). */
function normalizarHotel(h, previo) {
  const o = esObjeto(h) ? h : {};
  const r = {
    habitacion: texto(o.habitacion, 80),
    checkin: fechaYMD(o.checkin),
    checkout: fechaYMD(o.checkout),
    huespedes: cantidad(o.huespedes),
  };
  if (esObjeto(previo) && previo.checkin === r.checkin && previo.checkout === r.checkout) {
    if (!r.habitacion) r.habitacion = previo.habitacion || null;
    if (r.huespedes === null) r.huespedes = cantidad(previo.huespedes);
  }
  return r.habitacion || r.checkin || r.checkout ? r : null;
}

/** Una cotización viva además de la vigente: su folio, sus recorridos y su hotel. null si no es un folio. */
function normalizarOpcion(o) {
  const x = esObjeto(o) ? o : {};
  const folio = folioNormal(x.folio);
  if (!folio) return null;
  return {
    folio,
    recorridos: limitarRecorridos((Array.isArray(x.recorridos) ? x.recorridos : []).map(normalizarRecorrido).filter((r) => r.slug || r.nombre || r.fecha)),
    hotel: x.hotel ? normalizarHotel(x.hotel) : null,
  };
}

/** Lo que cuenta para «¿cambió la ficha?» (sin la marca de tiempo). */
function huella(f) {
  const { actualizado, ...resto } = f;
  return JSON.stringify(resto);
}

/**
 * Aplica cambios a una ficha (función pura sobre el objeto que recibe; lo
 * devuelve). Claves que entiende:
 *   recorridos: [...]   reemplaza la lista completa (lo que COTIZÓ el servidor);
 *                       lo platicado de esos mismos tours y fechas se limpia
 *   consultado: {...}   un tour que solo se consultó (ver ponerConsultado);
 *                       `recorrido` es el nombre de antes: solo con fecha va
 *                       a fechasDichas
 *   fechaDicha: "AAAA-MM-DD"        una fecha que dio, sin tour
 *   hotel: {...}|null   el de la cotización (null = ya no lleva hotel)
 *   hotelConsultado: {...}|null     los cuartos que consultó (no los eligió)
 *   zonaHospedaje, nombre, correo   (un texto vacío no borra; null sí)
 *   folioVigente, reservaFolio      (folios; null los borra)
 *   folioReemplazado: "COT-…" o foliosReemplazados: [...]   (se agregan, sin repetir)
 *   opcion: {folio, recorridos, hotel}   otra cotización que sigue viva
 *   elegirOpcion: "COT-…"           el cliente eligió esa opción: pasa a ser la
 *                                   vigente y la vigente queda como opción
 *   comprobanteRecibido, pagoValidado   (booleanos)
 * Lo demás se ignora. `actualizado` cambia solo si algo cambió.
 */
function aplicarCambiosFicha(ficha, cambios = {}) {
  const f = completarFicha(ficha);
  const c = esObjeto(cambios) ? cambios : {};
  const antes = huella(f);

  // El cliente eligió una de las opciones vivas: se intercambia con la vigente
  // (su viaje y su hotel incluidos), ANTES de aplicar lo demás.
  const elegida = folioNormal(c.elegirOpcion);
  if (elegida && elegida !== f.folioVigente) {
    const k = f.opciones.findIndex((o) => o && folioNormal(o.folio) === elegida);
    if (k >= 0) {
      const o = normalizarOpcion(f.opciones[k]);
      f.opciones.splice(k, 1);
      if (f.folioVigente) f.opciones.push({ folio: f.folioVigente, recorridos: f.recorridos, hotel: f.hotel });
      f.folioVigente = o.folio;
      f.recorridos = o.recorridos;
      f.hotel = o.hotel;
    }
  }

  if (Array.isArray(c.recorridos)) {
    f.recorridos = limitarRecorridos(c.recorridos.map(normalizarRecorrido).filter((r) => r.slug || r.nombre || r.fecha));
    // Lo que ya quedó cotizado deja de ser «platicado».
    const slugs = new Set(f.recorridos.map((r) => r.slug).filter(Boolean));
    const fechas = new Set(f.recorridos.map((r) => r.fecha).filter(Boolean));
    f.consultados = f.consultados.map(normalizarRecorrido).filter((r) => !(r.slug && slugs.has(r.slug)));
    f.fechasDichas = f.fechasDichas.map(fechaYMD).filter((y) => y && !fechas.has(y));
  }
  const consultado = esObjeto(c.consultado) ? c.consultado : esObjeto(c.recorrido) ? c.recorrido : null;
  if (consultado) {
    const r = normalizarRecorrido(consultado);
    if (r.slug || r.nombre) f.consultados = ponerConsultado(f.consultados, r);
    else if (r.fecha) f.fechasDichas = ponerFecha(f.fechasDichas, r.fecha);
  }
  if (c.fechaDicha !== undefined) f.fechasDichas = ponerFecha(f.fechasDichas, c.fechaDicha);

  for (const [k, max] of [["zonaHospedaje", 80], ["hotelRecogida", 120], ["nombre", 120], ["correo", 160]]) {
    if (c[k] === null) f[k] = null;
    else if (c[k] !== undefined) {
      const v = texto(c[k], max);
      if (v) f[k] = v;
    }
  }
  if (c.hotel !== undefined) {
    f.hotel = c.hotel ? normalizarHotel(c.hotel, f.hotel) : null;
    // Ya cotizado con hotel: los cuartos que solo consultó ya no importan.
    if (f.hotel) {
      f.hotelConsultado = null;
      f.fechasDichas = f.fechasDichas.filter((y) => y !== f.hotel.checkin && y !== f.hotel.checkout);
    }
  }
  if (c.hotelConsultado !== undefined) {
    f.hotelConsultado = c.hotelConsultado ? normalizarHotel({ ...c.hotelConsultado, habitacion: null }) : null;
  }
  if (c.folioVigente !== undefined) f.folioVigente = folioNormal(c.folioVigente);
  if (c.reservaFolio !== undefined) f.reservaFolio = folioNormal(c.reservaFolio);

  const reemplazados = [
    ...(Array.isArray(c.foliosReemplazados) ? c.foliosReemplazados : []),
    ...(c.folioReemplazado ? [c.folioReemplazado] : []),
  ].map(folioNormal).filter(Boolean);
  for (const x of reemplazados) if (!f.foliosReemplazados.includes(x)) f.foliosReemplazados.push(x);
  // El vigente nunca está entre los reemplazados, y solo se guardan los últimos.
  f.foliosReemplazados = f.foliosReemplazados.filter((x) => x !== f.folioVigente).slice(-MAX_FOLIOS_REEMPLAZADOS);

  if (c.opcion !== undefined) {
    const o = normalizarOpcion(c.opcion);
    if (o) f.opciones = [...f.opciones.filter((x) => x && folioNormal(x.folio) !== o.folio), o];
  }
  // Una opción nunca es la vigente ni una ya reemplazada; solo las últimas.
  f.opciones = f.opciones
    .map(normalizarOpcion)
    .filter((o) => o && o.folio !== f.folioVigente && !f.foliosReemplazados.includes(o.folio))
    .slice(-MAX_OPCIONES);

  if (typeof c.comprobanteRecibido === "boolean") f.comprobanteRecibido = c.comprobanteRecibido;
  if (typeof c.pagoValidado === "boolean") f.pagoValidado = c.pagoValidado;

  if (huella(f) !== antes) f.actualizado = Date.now();
  return f;
}

/** Aplica `cambios` a la ficha del chat (ver aplicarCambiosFicha) y la devuelve. */
function actualizarFicha(chatId, cambios = {}) {
  if (!chatId) return null;
  const s = getSession(chatId);
  s.ficha = aplicarCambiosFicha(s.ficha, cambios);
  if (s.ficha.actualizado && s.ficha.actualizado >= s.updatedAt) s.updatedAt = s.ficha.actualizado;
  estado.marcarCambio();
  return s.ficha;
}

/**
 * Llegó un comprobante ligado a `folio` (lo llama index.js). Desde aquí el bot
 * no recotiza: un cambio lo hace el equipo. Sin folio no se marca nada: una
 * foto suelta sin cotización no debe frenar la venta de nadie.
 */
function marcarComprobanteEnFicha(chatId, folio) {
  const f = folioNormal(folio);
  if (!chatId || !f) return null;
  return actualizarFicha(chatId, {
    comprobanteRecibido: true,
    ...(esFolioCotizacion(f) ? cotizacionPagada(chatId, f) : { reservaFolio: f }),
  });
}

/** El equipo validó el pago con /confirma (lo llama index.js): `folio` el que se confirmó, `reservaFolio` la reserva HP-M-. */
function marcarPagoEnFicha(chatId, folio, reservaFolio) {
  const f = folioNormal(folio);
  const r = folioNormal(reservaFolio) || (f && !esFolioCotizacion(f) ? f : null);
  if (!chatId || (!f && !r)) return null;
  return actualizarFicha(chatId, {
    pagoValidado: true,
    ...(f && esFolioCotizacion(f) ? cotizacionPagada(chatId, f) : {}),
    ...(r ? { reservaFolio: r } : {}),
  });
}

/**
 * Qué hacer en la ficha con la cotización a la que llegó un pago: una de las
 * opciones vivas → es la que eligió (pasa a vigente con su viaje); una ya
 * reemplazada → la vigente se queda (el comprobante de la vieja lo ve el
 * equipo: su /confirma avisa que la reemplazó otra); cualquier otra → vigente.
 * 🔴 Antes un comprobante de la vieja la volvía «vigente» y la sacaba de las
 * reemplazadas: el bot hablaba de un folio que ya no vale.
 */
function cotizacionPagada(chatId, folio) {
  const s = sesionExistente(chatId);
  const f = s ? s.ficha : null;
  if (f && (f.opciones || []).some((o) => o && folioNormal(o.folio) === folio)) return { elegirOpcion: folio };
  if (f && (f.foliosReemplazados || []).includes(folio)) return {};
  return { folioVigente: folio };
}

function fichaEstaVacia(f) {
  return !f || (
    !(f.recorridos && f.recorridos.length) && !f.zonaHospedaje && !f.hotelRecogida && !f.hotel && !f.nombre && !f.correo &&
    !f.folioVigente && !f.reservaFolio && !f.comprobanteRecibido && !f.pagoValidado &&
    !(f.foliosReemplazados && f.foliosReemplazados.length) &&
    !(f.consultados && f.consultados.length) && !(f.fechasDichas && f.fechasDichas.length) &&
    !f.hotelConsultado && !(f.opciones && f.opciones.length)
  );
}

// ── La ficha como la lee el modelo ────────────────────────────
function fechaTexto(ymd, locale) {
  const [y, m, d] = String(ymd).split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  if (Number.isNaN(dt.getTime())) return ymd;
  const larga = dt.toLocaleDateString(locale === "en" ? "en-US" : "es-MX", {
    weekday: "long", day: "numeric", month: "long", timeZone: "UTC",
  });
  return `${larga} (${ymd})`;
}

function plural(n, uno, varios) {
  return `${n} ${n === 1 ? uno : varios}`;
}

function unirConY(partes) {
  if (partes.length <= 1) return partes.join("");
  return `${partes.slice(0, -1).join(", ")} y ${partes[partes.length - 1]}`;
}

function personasTexto(r) {
  if (r.ruta || r.vehiculo) return r.adultos ? plural(r.adultos, "persona", "personas") : "";
  const partes = [];
  if (r.adultos) partes.push(plural(r.adultos, "adulto", "adultos"));
  // Regla de niños del 17 nov 2026 (src/lib/ninos.ts); el tramo de 6 a 10 solo en fichas viejas.
  if (r.ninosMid) partes.push(`${plural(r.ninosMid, "niño", "niños")} de 6 a 10`);
  if (r.ninosSmall) partes.push(`${plural(r.ninosSmall, "niño", "niños")} de 4 a 7`);
  if (r.bebes) partes.push(`${plural(r.bebes, "bebé", "bebés")} (gratis)`);
  return unirConY(partes);
}

function recorridoTexto(r) {
  const nombre = r.nombre ? String(r.nombre).split("—")[0].trim() : null;
  const partes = [
    nombre ? `${nombre}${r.slug ? ` [${r.slug}]` : ""}` : `[${r.slug}]`,
    r.ruta ? `ruta ${r.ruta}` : null,
    r.vehiculo ? `${r.unidades || 1} × ${r.vehiculo}` : null,
    r.hora ? `inicio ${r.hora}` : null,
    personasTexto(r) || null,
  ];
  return partes.filter(Boolean).join(" · ");
}

/** "cuarto Bromelias 1 · llegada 2026-10-28 · salida 2026-10-30 · 2 huéspedes". */
function hotelTexto(h, { conCuarto = true } = {}) {
  return [
    conCuarto ? (h.habitacion ? `cuarto «${h.habitacion}»` : "cuarto por elegir") : null,
    h.checkin ? `llegada ${h.checkin}` : null,
    h.checkout ? `salida ${h.checkout}` : null,
    h.huespedes ? plural(h.huespedes, "huésped", "huéspedes") : null,
  ].filter(Boolean).join(" · ");
}

const porFecha = (a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0);

/** Los recorridos con tour, en orden de fecha (los que no tienen fecha al final). */
function recorridosEnOrden(lista) {
  const conTour = (Array.isArray(lista) ? lista : []).map(normalizarRecorrido).filter((r) => r.slug || r.nombre);
  return [...conTour.filter((r) => r.fecha).sort(porFecha), ...conTour.filter((r) => !r.fecha)];
}

/**
 * La ficha en pocas líneas para el modelo, o "" si está vacía. agent.js la
 * pone en el mensaje del cliente que abre el turno, y ahí se queda en todas
 * las llamadas de ese turno. Determinista a propósito: sin horas ni marcas de
 * tiempo, el mismo texto para la misma ficha.
 * Lo que dio el cliente (nombre, zona, cuarto) va entre «» y en una sola
 * línea: es un dato, no una instrucción.
 */
function fichaComoTexto(ficha, locale = "es") {
  const f = esObjeto(ficha) ? ficha : null;
  if (fichaEstaVacia(f)) return "";
  const loc = locale === "en" ? "en" : "es";
  const linea = (r) => `${r.fecha ? fechaTexto(r.fecha, loc) : "sin fecha"}: ${recorridoTexto(r)}`;

  const L = ["[Ficha del viaje — datos ya confirmados con el cliente; si el cliente cambia algo, manda lo nuevo]"];
  const viaje = recorridosEnOrden(f.recorridos);
  if (viaje.length) {
    L.push(f.folioVigente || f.reservaFolio ? "• Viaje cotizado:" : "• Viaje:");
    for (const r of viaje) L.push(`  – ${linea(r)}`);
  }
  if (f.hotel) L.push(`• Hotel con nosotros (va en la cotización): ${hotelTexto(f.hotel)}`);
  if (f.zonaHospedaje) L.push(`• Se hospedan en: «${f.zonaHospedaje}»`);
  // El hotel exacto se pide DESPUÉS del pago (Manolo, 18 nov 2026) y queda en la reserva.
  if (f.hotelRecogida) L.push(`• Hotel donde pasamos por ellos: «${f.hotelRecogida}» (ya anotado en su reserva)`);
  if (f.nombre || f.correo) L.push(`• Cliente: ${[f.nombre ? `«${f.nombre}»` : null, f.correo].filter(Boolean).join(" · ")}`);

  const reemplazos = (f.foliosReemplazados || []).length ? ` (reemplazó a ${f.foliosReemplazados.join(", ")}, que ya no valen)` : "";
  if (f.pagoValidado) {
    L.push(`• Pago VALIDADO por el equipo${f.reservaFolio ? ` · reserva ${f.reservaFolio}` : ""}${f.folioVigente ? ` · cotización ${f.folioVigente}` : ""}. Ya está reservado: un cambio ya no lo cotizas tú (CAMBIOS C3).`);
  } else if (f.comprobanteRecibido) {
    L.push(`• Comprobante RECIBIDO${f.folioVigente ? ` de ${f.folioVigente}` : f.reservaFolio ? ` de ${f.reservaFolio}` : ""}: el equipo lo está validando. No le pidas pago ni comprobante; un cambio ya no lo cotizas tú (CAMBIOS C3).`);
  } else if (f.folioVigente) {
    L.push(`• Cotización vigente: ${f.folioVigente}${reemplazos}. Sin pago todavía: nada está apartado.`);
  } else if (reemplazos) {
    L.push(`• Cotizaciones dadas de baja: ${f.foliosReemplazados.join(", ")}.`);
  }

  // Otras cotizaciones que siguen valiendo (cotizadas aparte).
  for (const o of (Array.isArray(f.opciones) ? f.opciones : []).map(normalizarOpcion).filter(Boolean)) {
    const que = [...recorridosEnOrden(o.recorridos).map(linea), o.hotel ? `hotel: ${hotelTexto(o.hotel)}` : null].filter(Boolean).join(" | ");
    L.push(`• También sigue viva la ${o.folio} (cotizada aparte)${que ? `: ${que}` : ""}.`);
  }

  // Lo platicado: solo consultó precios o cuartos. NO es lo que eligió.
  const consultados = recorridosEnOrden(f.consultados);
  const fechas = (Array.isArray(f.fechasDichas) ? f.fechasDichas : []).map(fechaYMD).filter(Boolean).sort();
  const hc = esObjeto(f.hotelConsultado) ? f.hotelConsultado : null;
  if (consultados.length || fechas.length || hc) {
    L.push("• Platicado, SIN cotizar (solo consultó; no lo des por elegido):");
    for (const r of consultados) L.push(`  – ${linea(r)}`);
    if (fechas.length) L.push(`  – Fechas que mencionó: ${fechas.map((y) => fechaTexto(y, loc)).join(", ")}`);
    if (hc) L.push(`  – Vio cuartos del hotel (${hotelTexto(hc, { conCuarto: false }) || "sin fechas"}): NO ha dicho que se queda con nosotros.`);
  }
  return L.join("\n");
}

module.exports = {
  getSession, pushHistory, clearSession, sesionExistente,
  // Ficha del viaje (fase 2)
  actualizarFicha, marcarComprobanteEnFicha, marcarPagoEnFicha, fichaComoTexto,
  fichaVacia, corregirUltimaRespuesta,
  // Para agent.js y las pruebas sin red
  recortarHistorial, aplicarCambiosFicha, esTextoDelCliente, esFolioCotizacion, folioNormal,
  MAX_MENSAJES_CLIENTE, DEJA_MENSAJES_CLIENTE, MAX_CARACTERES_HISTORIAL,
};
