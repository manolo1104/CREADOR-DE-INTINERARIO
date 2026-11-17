// ════════════════════════════════════════════════════════════════════
// El SITIO, fingido: lo que contestan las rutas /api/bot/* sin red ni base.
//
// Lo usan test-chat.js y el simulador (modo simulacro). Antes cada uno tenía
// su propia copia a medias: a test-chat le faltaban 3 funciones y la corrida
// abortaba en cuanto el modelo cotizaba un paquete, y los dos devolvían
// folios HP… con datos bancarios, que el sitio ya no manda.
//
// Reglas de esta simulación:
//   · Las MISMAS funciones que api-client.js, con la misma forma de respuesta
//     ({ ok, status, data }) y los mismos campos del CONTRATO bot ↔ sitio.
//   · Ninguna cifra escrita a mano: los precios salen de data.json con las
//     funciones de catalog.js (precio de lista o de promo según la FECHA del
//     tour, grupo bajo el mínimo, niños al 70 / 50 %, RZR por unidad, tarifa del grupo
//     del Edén). Si el catálogo cambia, la simulación cambia sola.
//   · Lo que el simulacro NO sabe calcular igual que el sitio lo dice en
//     `avisos` y no lo inventa: las tarifas del hotel (no vienen en data.json)
//     y el cargo de hotel por persona extra de un paquete.
//   · Cada llamada queda en `calls` para que las pruebas revisen qué pidió el bot.
//   · Guarda lo que cotiza: consultarReserva, cotizacionActiva y
//     confirmarReserva ven los mismos folios, como en el panel.
//   · Reemplaza como el sitio (fase 2): con `reemplazaA` la cotización vieja
//     del MISMO cliente, en borrador o enviada y sin reserva, queda
//     «expirada» con `reemplazadaPor`; la respuesta trae `reemplazo` y el
//     resumen la línea ♻️. Espejo de puedeReemplazar (src/lib/cotizaciones/
//     armar.ts) con los MISMOS motivos: si allá cambia, cámbialo aquí.
//
// Nada de aquí habla con WhatsApp, con Anthropic ni con el sitio de verdad.
// ════════════════════════════════════════════════════════════════════

const {
  TOURS, EMPRESA, findTour, calcPrecio, esPorVehiculo, precioRZR,
  hoyMX, precioLista, promoDe, promoAplica, precioEnFecha, vaBajoElMinimo,
  descuentoPorGrupo, precioPorCabezaEnFecha,
} = require("./catalog");
const { findPaquete, XANTOLO } = require("./knowledge");
const { sumarDias } = require("./horario");

// El anticipo es el 30 % en todo (decisión de Manolo, 6 oct 2026).
const PCT_ANTICIPO = 30;
// Como vigenciaBotPara del sitio (17 nov 2026): según qué tan cerca está el
// primer tour, 24 h (menos de 3 días), 72 h (menos de 15) o 7 días.
const VIGENCIAS_BOT = { "24h": { dias: 1, es: "24 horas", en: "24 hours" }, "72h": { dias: 3, es: "72 horas", en: "72 hours" }, "7dias": { dias: 7, es: "7 días", en: "7 days" } };
function vigenciaBotPara(primera, hoyYmd) {
  if (!primera || !/^\d{4}-\d{2}-\d{2}$/.test(primera)) return "7dias";
  const dias = Math.round((Date.parse(`${primera}T12:00:00Z`) - Date.parse(`${hoyYmd}T12:00:00Z`)) / 86400000);
  return dias < 3 ? "24h" : dias < 15 ? "72h" : "7dias";
}
const METODOS = new Set(["efectivo", "transferencia", "deposito", "stripe", "otro"]);
const COBRO_REPETIDO_MS = 15 * 60 * 1000; // el sitio rechaza el mismo pago en 15 min
const FACTOR_NINO_MEDIO = 0.7;
const FACTOR_NINO_CHICO = 0.5;

const entero = (v) => Math.max(0, parseInt(v, 10) || 0);
const mx = (n) => `$${Math.round(Number(n) || 0).toLocaleString("es-MX")}`;
const digitos = (s) => String(s || "").replace(/\D/g, "");
const ultimos10 = (s) => digitos(s).slice(-10);
const esIngles = (l) => String(l || "").toLowerCase().startsWith("en");
const anticipoDe = (total) => Math.round((total * PCT_ANTICIPO) / 100);

/** "2 adultos + 1 niño" → 3 plazas. */
function plazasDe(capacidad) {
  return (String(capacidad || "").match(/\d+/g) || []).reduce((a, n) => a + Number(n), 0);
}

function fechaReal(ymd) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd || ""));
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3]);
}

// ── Reemplazo de cotizaciones (espejo de armar.ts) ──────────────────
// Un folio de cotización: COT-… o HP-P… (los del bot de antes, sin guion
// tras la P). Las reservas (HP-M-…, HP + base 36) nunca empiezan con «HP-P».
const RE_FOLIO_COTIZACION = /^(COT-|HP-P)[A-Z0-9-]+$/;
const ESTADOS_REEMPLAZABLES = ["borrador", "enviada"];

/**
 * Un teléfono para comparar (como telefonoComparable del sitio): los 10
 * dígitos de un número de México venga como venga (52…, 521… o los 10 solos)
 * o, de otro país, todos sus dígitos. "" si no es un teléfono.
 */
function telefonoComparable(v) {
  const d = digitos(v);
  if (d.length === 10) return d;
  if (d.length === 12 && d.startsWith("52")) return d.slice(2);
  if (d.length === 13 && d.startsWith("521")) return d.slice(3);
  return d.length >= 11 && d.length <= 15 ? d : "";
}

/** Los teléfonos de una cotización: el suyo y el del chat si es «…@c.us» (un @lid no es teléfono). */
function telefonosDe(reg) {
  const chat = String(reg.waChatId || "");
  const delChat = chat.endsWith("@c.us") ? chat.split("@")[0] : "";
  return [reg.telefono, delChat].map(telefonoComparable).filter(Boolean);
}

/** ¿Son del mismo cliente? El mismo chat, o algún teléfono en común. */
function mismoCliente(a, b) {
  if (a.waChatId && a.waChatId === b.waChatId) return true;
  const deB = telefonosDe(b);
  return telefonosDe(a).some((t) => deB.includes(t));
}

/**
 * ¿`vieja` se puede dar por reemplazada por `nueva`? El MISMO orden y los
 * MISMOS motivos que puedeReemplazar del sitio: la de otro cliente se
 * rechaza antes de mirar nada más (el motivo regresa al bot y no debe
 * contar nada de otro cliente).
 */
/** ¿Las dos traen correo y no es el mismo? Otra persona del mismo chat (como correosDistintos del sitio). */
function correosDistintos(a, b) {
  const ca = String(a.customerEmail || "").trim().toLowerCase();
  const cb = String(b.customerEmail || "").trim().toLowerCase();
  return Boolean(ca && cb && ca !== cb);
}

function puedeReemplazar(vieja, nueva) {
  const folio = String(vieja.folio || "").toUpperCase();
  if (!folio) return { ok: false, motivo: "Falta el folio de la cotización anterior." };
  if (folio === String(nueva.folio || "").toUpperCase()) {
    return { ok: false, motivo: "Es la misma cotización: no hay nada que reemplazar." };
  }
  if (!mismoCliente(vieja, nueva)) return { ok: false, motivo: `La ${folio} es de otro chat y otro teléfono: no se tocó.` };
  if (correosDistintos(vieja, nueva)) return { ok: false, motivo: `La ${folio} es de otra persona (otro correo): no se tocó.` };
  if (vieja.reservaFolio) {
    return { ok: false, motivo: `La ${folio} ya es la reserva ${vieja.reservaFolio}: no se reemplaza. Un cambio después del pago lo ve el equipo.`, pagoEnCurso: true, reservaFolio: vieja.reservaFolio };
  }
  if (vieja.reemplazadaPor) {
    return { ok: false, motivo: `La ${folio} ya había sido reemplazada por la ${vieja.reemplazadaPor}.`, siguiente: String(vieja.reemplazadaPor).toUpperCase() };
  }
  if (vieja.status === "aceptada") {
    return { ok: false, motivo: `La ${folio} está aceptada (pagada o convertida en reserva): no se reemplaza. Un cambio después del pago lo ve el equipo.`, pagoEnCurso: true };
  }
  if (vieja.status === "expirada") return { ok: false, motivo: `La ${folio} ya estaba vencida: no hizo falta reemplazarla.` };
  if (!ESTADOS_REEMPLAZABLES.includes(vieja.status)) {
    return { ok: false, motivo: `La ${folio} está en «${vieja.status}»: solo se reemplaza una cotización en borrador o enviada.` };
  }
  return { ok: true };
}

/** "true"/true → true; lo demás, false (como `booleano` de comunesDelBot). */
const esVerdadero = (v) => v === true || v === "true";

function fechaLarga(ymd, locale = "es") {
  if (!fechaReal(ymd)) return String(ymd || "");
  const [y, m, d] = ymd.split("-").map(Number);
  const txt = new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString(esIngles(locale) ? "en-US" : "es-MX", {
    weekday: "long", day: "numeric", month: "long", timeZone: "UTC",
  });
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

/**
 * Crea un sitio fingido con su propia memoria de folios.
 * @param {object} [opts]
 * @param {() => string} [opts.hoy]    Hoy en México (AAAA-MM-DD). Las pruebas lo fijan.
 * @param {() => number} [opts.ahora]  Reloj en ms (para «pago repetido en 15 min»).
 * @param {string} [opts.prefijo]      Va en los folios: COT-SIM001, HP-M-SIM001.
 * @param {string[]} [opts.habitacionesOcupadas]  Lo que contesta la disponibilidad del hotel.
 */
function crearSitioSimulado({ hoy = () => hoyMX(), ahora = () => Date.now(), prefijo = "SIM", habitacionesOcupadas = [] } = {}) {
  // `reemplazo`: cada intento de reemplazo ({ folioViejo, folioNuevo, ok, motivo? }).
  const calls = { precio: [], quote: [], lead: [], paquete: [], confirm: [], lookup: [], escalacion: [], activa: [], hotel: [], reemplazo: [], documento: [], ligas: [] };
  const cotizaciones = new Map(); // folio → registro
  const reservas = new Map();     // folio → registro
  let consecutivo = 0;
  const nuevoNumero = () => String(++consecutivo).padStart(3, "0");

  const respuesta = (status, data) => ({ ok: status >= 200 && status < 300, status, data });

  // ── La cuenta de un recorrido (espejo de /api/bot/precio) ────────
  /** @returns {{linea:object} | {error:{indice, slug, motivo}}} */
  function precioDeItem(item = {}, indice = 0, { fechaOpcional = false } = {}) {
    const slug = String(item.slug || item.tourSlug || "").trim();
    const falla = (motivo) => ({ error: { indice, slug, motivo } });
    const t = findTour(slug);
    if (!t) return falla(`No existe el tour «${slug}».`);
    const tourDate = String(item.tourDate || item.fecha || "").trim();
    const avisos = [];
    if (tourDate || !fechaOpcional) {
      if (!fechaReal(tourDate)) return falla("Fecha inválida: va en formato AAAA-MM-DD.");
      if (tourDate < hoy()) return falla("Esa fecha ya pasó.");
      if (tourDate === hoy()) avisos.push("Es para HOY: el equipo confirma si hay salida.");
    }

    if (esPorVehiculo(t)) {
      const r = precioRZR(t, item.ruta, item.vehiculo);
      if (!r.ok) return falla(r.error);
      const unidades = Math.max(1, entero(item.unidades) || 1);
      const capacidad = plazasDe(r.capacidad);
      const personas = entero(item.personas);
      if (personas > capacidad * unidades) {
        return falla(`En ${unidades} ${r.vehiculo} caben ${capacidad * unidades} personas y van ${personas}.`);
      }
      const hora = item.hora ? String(item.hora) : undefined;
      if (hora && !(/^\d{2}:\d{2}$/.test(hora) && hora >= "09:00" && hora <= "17:00")) {
        return falla("El RZR arranca entre 9:00 am y 5:00 pm.");
      }
      return {
        linea: {
          slug: t.slug, nombre: t.nombre, tourDate, cobro: "vehiculo",
          personas, adultos: personas, ninosMid: 0, ninosSmall: 0,
          total: r.total * unidades,
          promo: { aplica: false },
          ruta: r.ruta, vehiculo: r.vehiculo, unidades, capacidad, capacidadTexto: r.capacidad,
          ...(hora ? { hora } : {}),
          ...(avisos.length ? { avisos } : {}),
        },
      };
    }

    const adultos = entero(item.adultos ?? item.adults);
    const ninosMid = entero(item.ninosMid ?? item.childrenMid);
    const ninosSmall = entero(item.ninosSmall ?? item.childrenSmall);
    const personas = adultos + ninosMid + ninosSmall;
    if (personas < 1) return falla("Faltan las personas.");

    // El Edén: una tarifa por el grupo completo, por escalones.
    if (Array.isArray(t.tarifaGrupo) && t.tarifaGrupo.length) {
      if (personas > t.tarifaGrupo.length) return falla(`Máximo ${t.tarifaGrupo.length} personas.`);
      return {
        linea: {
          slug: t.slug, nombre: t.nombre, tourDate, cobro: "grupo",
          personas, adultos, ninosMid, ninosSmall,
          total: t.tarifaGrupo[personas - 1],
          promo: { aplica: false },
          ...(avisos.length ? { avisos } : {}),
        },
      };
    }

    // Igual que `esViajeroSolo` del sitio desde el 8 oct: cualquier grupo bajo el
    // mínimo de un tour por persona se vende a tarifa normal.
    const viajeroSolo = vaBajoElMinimo(t, personas);
    if (personas < t.groupMin && !viajeroSolo) return falla(`Este tour sale con mínimo ${t.groupMin} personas.`);
    if (typeof t.groupMax === "number" && personas > t.groupMax) {
      return falla(`Este tour admite máximo ${t.groupMax} personas por salida.`);
    }
    if (t.soloAdultos && (ninosMid || ninosSmall)) return falla("Solo para mayores de 10 años.");
    if (ninosSmall && typeof t.edadMinima === "number" && t.edadMinima >= 6) {
      return falla(`La edad mínima es de ${t.edadMinima} años.`);
    }
    // Como `precioPorCabeza` del sitio: la escalera del tamaño del grupo baja el
    // precio desde 3 personas, salvo que la fecha lleve promo (nunca se suman).
    // Bajo el mínimo se cobra igual que cualquier grupo de su tamaño.
    const fechaDelTour = tourDate || null;
    const conPromo = promoAplica(t, fechaDelTour);
    const porPersona = precioPorCabezaEnFecha(t, fechaDelTour, personas);
    const menosPorGrupo = !conPromo ? descuentoPorGrupo(t, personas) : 0;
    const promo = promoDe(t);
    const total = calcPrecio(porPersona, adultos, ninosMid, ninosSmall).total;
    return {
      linea: {
        slug: t.slug, nombre: t.nombre, tourDate, cobro: "persona",
        personas, adultos, ninosMid, ninosSmall, total, porPersona,
        promo: conPromo
          ? { aplica: true, precioLista: precioLista(t), precioPromo: promo.precio, vence: promo.vence }
          : { aplica: false, precioLista: precioLista(t) },
        ...(viajeroSolo ? { viajeroSolo: true } : {}),
        ...(menosPorGrupo ? { precioDeGrupo: { personas, menosPorPersona: menosPorGrupo } } : {}),
        ...(avisos.length ? { avisos } : {}),
      },
    };
  }

  // ── Un paquete del catálogo ──────────────────────────────────────
  // El precio publicado es POR PAREJA. La persona extra suma sus boletos de
  // los tours del itinerario (en la fecha de cada día, niños al 70 / 50 %).
  // ⚠️ El sitio además cobra el hotel de la 3.ª persona en adelante: esa tabla
  // no viene en data.json, así que aquí NO se suma y se avisa.
  function precioDePaquete(pq = {}) {
    const falla = (motivo) => ({ error: { indice: -1, slug: String(pq.slug || "paquete"), motivo } });
    const esXantolo = /xantolo/i.test(String(pq.slug || "")) && XANTOLO && XANTOLO.paquete;
    const p = esXantolo ? XANTOLO.paquete : findPaquete(pq.slug);
    if (!p) return falla(`No existe el paquete «${pq.slug}».`);
    const fecha = esXantolo ? p.fecha : String(pq.fecha || "").trim();
    if (!fechaReal(fecha)) return falla("Falta la fecha de llegada (AAAA-MM-DD).");
    if (fecha < hoy()) return falla("Esa fecha ya pasó.");
    const adultos = entero(pq.adultos);
    const ninosMid = entero(pq.ninosMid);
    const ninosSmall = entero(pq.ninosSmall);
    if (adultos < 2) return falla("Los paquetes son por pareja: mínimo 2 adultos.");
    const personas = adultos + ninosMid + ninosSmall;
    const dias = (Array.isArray(p.itinerario) ? p.itinerario : []).filter((d) => d && d.tourSlug && findTour(d.tourSlug));
    const boleto = dias.reduce((a, d) => a + precioEnFecha(findTour(d.tourSlug), sumarDias(fecha, (Number(d.dia) || 1) - 1)), 0);
    const extra = (adultos - 2) * boleto + ninosMid * Math.round(boleto * FACTOR_NINO_MEDIO) + ninosSmall * Math.round(boleto * FACTOR_NINO_CHICO);
    // La pareja a precio de lista, o el de temporada si el paquete EMPIEZA
    // hasta que vence la promo (como `precioPaqueteDeFecha` del sitio).
    const lista = Number(p.precioTotalPareja ?? p.precio);
    const promo = !esXantolo && p.promo && typeof p.promo.vence === "string" && fecha <= p.promo.vence
      ? Number(p.promo.precioTotalPareja ?? p.promo.precio)
      : null;
    const total = (promo ?? lista) + extra;
    const noches = Number(p.noches) || 0;
    return {
      paquete: {
        slug: p.slug || p.id, nombre: p.nombre, total, personas, adultos, ninosMid, ninosSmall,
        fecha, checkin: fecha, checkout: noches ? sumarDias(fecha, noches) : "", noches,
        habitacion: pq.habitacion || undefined, habitaciones: Math.max(1, Math.ceil(personas / 4)),
        nocheExtra: Boolean(pq.nocheExtra), evento: Boolean(esXantolo),
        promo: promo !== null ? { aplica: true, precioLista: lista, precioPromo: promo, vence: p.promo.vence } : { aplica: false },
        ...(personas > 2 ? { avisos: ["Simulacro: sin el cargo de hotel por persona extra (el sitio sí lo suma)."] } : {}),
      },
    };
  }

  /** La cuenta completa. Lo que no se puede va en `errores` y no suma. */
  function calcular({ items = [], paquete, hospedaje } = {}, { fechaOpcional = false } = {}) {
    const lineas = [];
    const errores = [];
    (Array.isArray(items) ? items : []).forEach((it, i) => {
      const r = precioDeItem(it, i, { fechaOpcional });
      if (r.error) errores.push(r.error); else lineas.push(r.linea);
    });
    let paq = null;
    if (paquete) {
      const r = precioDePaquete(paquete);
      if (r.error) errores.push(r.error); else paq = r.paquete;
    }
    const total = lineas.reduce((a, l) => a + l.total, 0) + (paq ? paq.total : 0);
    const anticipo = anticipoDe(total);
    return {
      lineas, paquete: paq, hospedaje: hospedaje || null, errores,
      total, anticipo, saldo: total - anticipo,
    };
  }

  // ── El resumen que se pega en WhatsApp (sin datos bancarios) ─────
  // Misma idea que resumenWhatsAppCotizacion del sitio: folio, cada
  // recorrido con su fecha y sus personas, total, anticipo, saldo y vigencia.
  // ⚠️ Nada de «(simulacro…)» aquí dentro: el modelo lo leía y se lo
  // repetía al cliente.
  // `reemplazaA`: el folio que esta cotización YA reemplazó (solo si el
  // reemplazo salió bien). Va justo debajo del encabezado, como en el sitio.
  function resumenWhatsApp(reg, { reemplazaA } = {}) {
    const en = esIngles(reg.locale);
    const personasTxt = (l) => {
      if (l.cobro === "vehiculo") return `${l.unidades} × ${l.vehiculo} · ${l.ruta}${l.hora ? ` · ${en ? "start" : "inicio"} ${l.hora}` : ""}`;
      const partes = [`${l.adultos} ${en ? (l.adultos === 1 ? "adult" : "adults") : (l.adultos === 1 ? "adulto" : "adultos")}`];
      if (l.ninosMid) partes.push(`${l.ninosMid} ${en ? "aged 6–10" : "de 6 a 10 años"}`);
      if (l.ninosSmall) partes.push(`${l.ninosSmall} ${en ? "under 6" : "menores de 6"}`);
      return partes.join(" + ") + (l.viajeroSolo ? (en ? " (solo traveler)" : " (viajero solo)") : "");
    };
    const L = [en ? `📋 *Your quote* · ${reg.folio}` : `📋 *Tu cotización* · folio ${reg.folio}`];
    if (reemplazaA) {
      L.push(en
        ? `♻️ This quote replaces ${reemplazaA}, which is no longer valid.`
        : `♻️ Esta cotización reemplaza a la ${reemplazaA}, que ya no es válida.`);
    }
    for (const l of reg.recorridos) {
      L.push("", `🗺️ *${l.nombre}*${l.tourDate ? ` · ${fechaLarga(l.tourDate, reg.locale)}` : ""}`);
      L.push(`   ${personasTxt(l)} · ${mx(l.total)}${l.promo && l.promo.aplica ? (en ? " (low-season price)" : " (precio de temporada)") : ""}`);
    }
    if (reg.paquete) {
      const p = reg.paquete;
      L.push("", `🏨 *${p.nombre}* · ${fechaLarga(p.fecha, reg.locale)}`);
      L.push(`   ${p.personas} ${en ? "people" : "personas"} · ${mx(p.total)}`);
    }
    if (reg.hospedaje) {
      const h = reg.hospedaje;
      L.push("", en
        ? `🏨 *Hotel:* ${h.habitacion || "room to confirm"} · ${h.noches || "?"} night(s)`
        : `🏨 *Hospedaje:* ${h.habitacion || "habitación por confirmar"} · ${h.noches || "?"} noche(s)`);
    }
    const cuando = reg.esPaquete
      ? (en ? "at hotel check-in" : "al hacer check-in en el hotel")
      : (en ? "before the tour starts, in cash or by bank transfer" : "antes de iniciar el tour, en efectivo o transferencia");
    L.push("", en ? `💰 *Total: ${mx(reg.total)} MXN*` : `💰 *Total: ${mx(reg.total)} MXN*`);
    L.push(en
      ? `You book it with ${mx(reg.anticipo)} (${PCT_ANTICIPO} %) and the rest, ${mx(reg.saldo)}, is paid ${cuando}.`
      : `Apartas con ${mx(reg.anticipo)} (${PCT_ANTICIPO} %) y el resto, ${mx(reg.saldo)}, se paga ${cuando}.`);
    // Como lineaVigencia del sitio: topada en la víspera no dice «7 días».
    const fechaVence = en ? fechaLarga(reg.venceEl, reg.locale) : fechaLarga(reg.venceEl, reg.locale).toLowerCase();
    const primera = [...reg.recorridos.map((l) => l.tourDate), reg.paquete && reg.paquete.fecha].filter(Boolean).sort()[0];
    if (reg.venceEl === hoy()) {
      L.push("", primera === sumarDias(hoy(), 1)
        ? (en ? "⏳ The tour is tomorrow: book it today before 10 pm." : "⏳ El tour es mañana: apártalo hoy antes de las 10 pm.")
        : (en ? "⏳ Valid until today." : "⏳ Vale solo hoy."));
    } else if (primera && reg.venceEl === sumarDias(primera, -1)) {
      L.push("", en
        ? `⏳ Valid until ${fechaVence}, the day before the tour.`
        : `⏳ Vale hasta el ${fechaVence}, la víspera del tour.`);
    } else {
      L.push("", en
        ? `⏳ Valid for ${VIGENCIAS_BOT[reg.vigencia || "7dias"].en}: until ${fechaVence}.`
        : `⏳ Vale ${VIGENCIAS_BOT[reg.vigencia || "7dias"].es}: hasta el ${fechaVence}.`);
    }
    L.push(en ? `🧾 Payment reference: ${reg.folio}` : `🧾 Concepto de tu pago: ${reg.folio}`);
    return L.join("\n");
  }

  // ── Guardar una cotización (COT-) ────────────────────────────────
  const CORREO_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /** Lo común de quote / paquete / lead. @returns {status, data} */
  function cotizar(payload, cuenta, { etiqueta }) {
    // Como el sitio: si la que se iba a reemplazar ya está pagada, NO nace otra.
    const pedidoReemplazo = String(payload.reemplazaA || "").trim().toUpperCase().slice(0, 60);
    if (pedidoReemplazo && !esVerdadero(payload.aparte)) {
      const pago = pagoDeLaAnterior(pedidoReemplazo, payload);
      if (pago) return respuesta(409, { error: pago.motivo, pagoEnCurso: true, folio: pago.folio, reservaFolio: pago.reservaFolio });
    }
    const nombre = String(payload.customerName || "").trim();
    if (!nombre) return respuesta(400, { error: "Falta el nombre del cliente." });
    const correo = String(payload.customerEmail || "").trim();
    if (correo && !CORREO_RE.test(correo)) return respuesta(400, { error: "El correo no parece válido." });
    if (cuenta.errores.length) {
      return respuesta(400, { error: cuenta.errores.map((e) => e.motivo).join(" · "), errores: cuenta.errores });
    }
    if (!cuenta.lineas.length && !cuenta.paquete) return respuesta(400, { error: "No hay nada que cotizar." });

    const locale = esIngles(payload.locale) ? "en" : "es";
    // Lo que manda el bot para dar de baja la anterior (como comunesDelBot).
    const reemplazaA = String(payload.reemplazaA || "").trim().toUpperCase().slice(0, 60);
    const aparte = esVerdadero(payload.aparte);
    const folio = `COT-${prefijo}${nuevoNumero()}`;
    const fechas = [...cuenta.lineas.map((l) => l.tourDate), cuenta.paquete && cuenta.paquete.fecha].filter(Boolean).sort();
    const tourName = cuenta.paquete
      ? cuenta.paquete.nombre
      : cuenta.lineas.length === 1
        ? cuenta.lineas[0].nombre
        : (locale === "en" ? `Custom trip (${cuenta.lineas.length} tours)` : `Viaje a la medida (${cuenta.lineas.length} recorridos)`);
    const adults = cuenta.paquete ? cuenta.paquete.adultos : Math.max(0, ...cuenta.lineas.map((l) => l.adultos));
    const children = cuenta.paquete
      ? cuenta.paquete.ninosMid + cuenta.paquete.ninosSmall
      : Math.max(0, ...cuenta.lineas.map((l) => l.ninosMid + l.ninosSmall));
    const reg = {
      folio, status: "enviada", etiqueta, locale,
      total: cuenta.total, anticipo: cuenta.anticipo, saldo: cuenta.saldo,
      vigencia: vigenciaBotPara(fechas[0], hoy()),
      // Como calcularVencimiento del sitio: la vigencia, pero nunca después de
      // la víspera del primer tour (y nunca antes de hoy).
      venceEl: (() => {
        let v = sumarDias(hoy(), VIGENCIAS_BOT[vigenciaBotPara(fechas[0], hoy())].dias);
        if (fechas[0] && sumarDias(fechas[0], -1) < v) v = sumarDias(fechas[0], -1);
        return v < hoy() ? hoy() : v;
      })(),
      tourName, tourDate: fechas[0] || "",
      adults, children,
      recorridos: cuenta.lineas, paquete: cuenta.paquete || null, hospedaje: cuenta.hospedaje || null,
      esPaquete: Boolean(cuenta.paquete || cuenta.hospedaje),
      customerName: nombre, customerEmail: correo || null,
      telefono: digitos(payload.telefono || payload.customerPhone) || null,
      waChatId: payload.waChatId ? String(payload.waChatId) : null,
      zonaHospedaje: payload.zonaHospedaje || null,
      notasInternas: [
        // Con `aparte` la anterior sigue viva: la nota va primero (como el sitio).
        ...(aparte && reemplazaA ? [`Opción aparte para comparar: la ${reemplazaA} sigue vigente.`] : []),
        ...(payload.notasInternas ? [String(payload.notasInternas)] : []),
      ],
      creadaAt: ahora(),
      reservaFolio: null,
      reemplazadaPor: null,
      seqEstado: null,
    };
    cotizaciones.set(folio, reg);

    // El reemplazo va DESPUÉS de guardar la nueva (en el sitio, también
    // después de mandarla): el cliente nunca se queda sin una cotización válida.
    const reemplazo = reemplazaA ? reemplazar(reemplazaA, reg, { aparte }) : null;

    // Como el sitio desde el 16 nov 2026: la liga de Stripe de ESTE folio, por el anticipo.
    reg.ligaPago = `https://buy.stripe.com/test_${folio}`;
    const linkPago = reg.ligaPago;
    const avisos = [
      ...cuenta.lineas.flatMap((l) => l.avisos || []),
      ...((reg.paquete && reg.paquete.avisos) || []),
      ...(reg.hospedaje ? ["Simulacro: el hospedaje va sin tarifa (no está en data.json); el sitio sí lo cobra."] : []),
    ];
    return respuesta(200, {
      folio, total: reg.total, anticipo: reg.anticipo, saldo: reg.saldo, pctAnticipo: PCT_ANTICIPO, moneda: "MXN",
      venceEl: reg.venceEl, vigencia: reg.vigencia,
      resumenWhatsApp: resumenWhatsApp(reg, reemplazo && reemplazo.ok ? { reemplazaA: reemplazo.folio } : {}),
      emailEnviado: Boolean(correo),
      linkPago,
      linkPagoTipo: "liga",
      linkPagoMonto: reg.anticipo,
      tourName: reg.tourName, tourDate: reg.tourDate,
      personas: reg.recorridos.length === 1 ? reg.recorridos[0].personas : (reg.paquete ? reg.paquete.personas : null),
      recorridos: reg.recorridos,
      ...(reg.hospedaje ? { hospedaje: reg.hospedaje } : {}),
      ...(reg.paquete ? { paquete: reg.paquete } : {}),
      ...(avisos.length ? { avisos } : {}),
      ...(reemplazo ? { reemplazo } : {}),
      // La misma instrucción que cotizarParaBot del sitio.
      instruccion: [
        "Manda `resumenWhatsApp` TAL CUAL como primer mensaje, antes de cualquier dato de pago.",
        reemplazo && reemplazo.ok
          ? `Ya dice que reemplaza a la ${reemplazo.folio}: esa ya no vale; desde ahora habla solo de la ${folio}.`
          : "",
      ].filter(Boolean).join(" "),
    });
  }

  /**
   * Da por reemplazada `folioViejo` por la cotización `nueva` (ya guardada).
   * Espejo de reemplazoDe + reemplazarCotizacion del sitio. Nunca lanza.
   * @returns {{folio:string, ok:true} | {folio:string, ok:false, motivo:string}}
   */
  function reemplazar(folioViejo, nueva, { aparte = false } = {}) {
    const pedido = String(folioViejo || "").trim().toUpperCase();
    let folio = pedido;
    // `folioViejo` en el registro = el que mandó el bot; `folio` en la respuesta = el que se dio de baja.
    const anota = (r) => { calls.reemplazo.push({ folioViejo: pedido, folioNuevo: nueva.folio, ...(folio !== pedido ? { siguioA: folio } : {}), ...r }); return { folio, ...r }; };
    if (aparte) return anota({ ok: false, motivo: `Se cotizó aparte (opción para comparar): la ${folio} sigue vigente.` });
    if (!RE_FOLIO_COTIZACION.test(folio)) {
      return anota({ ok: false, motivo: `«${folio || "(vacío)"}» no es un folio de cotización (COT-… o HP-P…): no se reemplazó nada.` });
    }
    // Como el sitio: si ya la había reemplazado otra, se sigue la cadena (3 saltos).
    for (let salto = 0; ; salto++) {
      const vieja = cotizaciones.get(folio);
      if (!vieja) return anota({ ok: false, motivo: `No existe la cotización ${folio}.` });
      const v = puedeReemplazar(vieja, nueva);
      if (!v.ok && v.siguiente && salto < 3 && RE_FOLIO_COTIZACION.test(v.siguiente)) {
        folio = v.siguiente;
        continue;
      }
      if (!v.ok) {
        const { siguiente: _s, ...sinSiguiente } = v;
        return anota(sinSiguiente);
      }
      // Lo que el sitio le escribe a la vieja: Vencida, sin seguimiento, con
      // quién la reemplazó y la nota interna (la bitácora no se simula).
      vieja.status = "expirada";
      vieja.seqEstado = "terminado";
      vieja.reemplazadaPor = nueva.folio;
      vieja.notasInternas.push(`[Bot · ${hoy()}] Reemplazada por ${nueva.folio}`);
      return anota({ ok: true });
    }
  }

  /**
   * ¿La que se iba a reemplazar ya está pagada? El sitio lo pregunta ANTES de
   * crear la nueva (pagoDeCotizacionAnterior): con reserva o aceptada, 409 y
   * no nace otra. Sigue la cadena; de otro cliente no dice nada.
   */
  function pagoDeLaAnterior(folioViejo, payload) {
    let folio = String(folioViejo || "").trim().toUpperCase();
    if (!RE_FOLIO_COTIZACION.test(folio)) return null;
    const solicitante = {
      folio: "", waChatId: payload.waChatId ? String(payload.waChatId) : null,
      telefono: digitos(payload.telefono || payload.customerPhone) || null,
      customerEmail: String(payload.customerEmail || "").trim() || null,
    };
    for (let salto = 0; salto <= 3; salto++) {
      const q = cotizaciones.get(folio);
      if (!q || !mismoCliente(q, solicitante) || correosDistintos(q, solicitante)) return null;
      if (q.reservaFolio) return { folio, motivo: `La ${folio} ya es la reserva ${q.reservaFolio}: un cambio después del pago lo ve el equipo.`, reservaFolio: q.reservaFolio };
      if (q.status === "aceptada") return { folio, motivo: `La ${folio} ya está aceptada (pagada o convertida en reserva): un cambio después del pago lo ve el equipo.`, reservaFolio: null };
      if (!q.reemplazadaPor) return null;
      folio = String(q.reemplazadaPor).toUpperCase();
    }
    return null;
  }

  function hospedajeDe(h, huespedesPorOmision) {
    if (!h || typeof h !== "object") return null;
    if (!(h.interesado || h.habitacion || h.checkin)) return null;
    const noches = entero(h.noches) || (fechaReal(h.checkin) && fechaReal(h.checkout)
      ? Math.round((Date.parse(`${h.checkout}T12:00:00Z`) - Date.parse(`${h.checkin}T12:00:00Z`)) / 86400000)
      : 0);
    return {
      habitacion: h.habitacion || null, checkin: h.checkin || null, checkout: h.checkout || null,
      noches, habitaciones: Math.max(1, entero(h.habitaciones) || 1), huespedes: entero(h.huespedes) || huespedesPorOmision,
    };
  }

  // ── Vista de un folio (espejo de /api/bot/booking/[folio]) ───────
  function etapaDe(reg) {
    if (reg.reservaFolio) return "aceptada";
    if (reg.status === "enviada" && reg.venceEl < hoy()) return "vencida";
    return reg.status;
  }

  function vistaCotizacion(reg) {
    // Reemplazada (y sin reserva): SIN montos ni fecha límite, como el
    // sitio, para que el bot no repita el anticipo de la que ya no vale.
    if (!reg.reservaFolio && reg.status === "expirada" && reg.reemplazadaPor) {
      return {
        tipo: "cotizacion", folio: reg.folio, status: "expirada", etapa: "vencida",
        reemplazadaPor: reg.reemplazadaPor,
        tourName: reg.tourName, tourDate: reg.tourDate, customerName: reg.customerName, locale: reg.locale,
        resumenPago: `Esta cotización fue reemplazada por ${reg.reemplazadaPor}.`,
      };
    }
    const etapa = etapaDe(reg);
    const status = etapa === "vencida" ? "expirada" : etapa === "aceptada" ? "aceptada" : reg.status;
    const cuando = reg.esPaquete ? "al hacer check-in" : "antes de iniciar el tour, en efectivo o transferencia";
    const resumenPago = reg.reservaFolio
      ? `Esta cotización ya es la reserva ${reg.reservaFolio}.`
      : etapa === "vencida"
        ? `Cotización VENCIDA (valía hasta ${reg.venceEl}) y SIN pago registrado.`
        : `Cotización ENVIADA, todavía SIN pago: total ${mx(reg.total)}. Aparta con ${mx(reg.anticipo)} (${PCT_ANTICIPO} %) y el resto, ${mx(reg.saldo)}, se paga ${cuando}.`;
    return {
      tipo: "cotizacion", folio: reg.folio, status, etapa,
      tourName: reg.tourName, tourDate: reg.tourDate, adults: reg.adults, children: reg.children,
      total: reg.total, anticipo: reg.anticipo, saldo: reg.saldo, pctAnticipo: PCT_ANTICIPO,
      venceEl: reg.venceEl, esPaquete: reg.esPaquete, customerName: reg.customerName,
      locale: reg.locale, reservaFolio: reg.reservaFolio, resumenPago,
      ligaPago: !reg.reservaFolio && etapa !== "vencida" ? reg.ligaPago || null : null,
      ...(reg.ligaPago ? { ligaMonto: reg.anticipo } : {}),
      ...(reg.partes && reg.partes.length ? { partes: reg.partes } : {}),
      pagadaConLiga: reg.pagadaConLiga || 0,
    };
  }

  function vistaReserva(r) {
    const pctPagado = r.totalAmount ? Math.round((r.pagado / r.totalAmount) * 100) : 0;
    // Como el sitio: la reserva trae las ligas por persona de su cotización.
    const cot = r.origen ? cotizaciones.get(r.origen) : null;
    const partes = cot && Array.isArray(cot.partes) && cot.partes.length ? cot.partes : null;
    const cuando = r.esPaquete ? "al hacer check-in" : "antes de iniciar el tour, en efectivo o transferencia";
    return {
      tipo: "reserva", folio: r.folio, tourName: r.tourName, tourSlug: r.tourSlug, tourDate: r.tourDate,
      adults: r.adults, children: r.children, totalAmount: r.totalAmount, status: "paid",
      pagado: r.pagado, saldo: r.saldo, liquidado: r.saldo <= 0, pctPagado, esPaquete: r.esPaquete,
      resumenPago: r.saldo > 0
        ? `Pagado: ${mx(r.pagado)} MXN · Falta: ${mx(r.saldo)} MXN, se paga ${cuando}.`
        : `Pagado completo: ${mx(r.pagado)} MXN.`,
      customerName: r.customerName, customerPhone: r.telefono, createdAt: new Date(r.creadaAt).toISOString(),
      ...(partes ? { partes } : {}),
    };
  }

  function confirmacion(r, { folioPedido, yaConfirmada, cobro, metodo, reservaNueva, comprobante }) {
    const recorridos = (r.recorridos.length ? r.recorridos : []).map((l) => {
      const t = findTour(l.slug) || {};
      return {
        nombre: l.nombre, fecha: l.tourDate,
        salida: t.salida || undefined,
        recogida: t.puntoEncuentro || undefined,
        queLlevar: Array.isArray(t.queLlevar) ? t.queLlevar.slice(0, 6) : [],
      };
    });
    if (r.paquete) recorridos.push({ nombre: r.paquete.nombre, fecha: r.paquete.fecha, queLlevar: [] });
    return {
      folio: folioPedido, reservaFolio: r.folio, status: "paid",
      tourName: r.tourName, tourDate: r.tourDate, adults: r.adults, children: r.children,
      customerName: r.customerName, customerPhone: r.telefono, ...(r.waChatId ? { waChatId: r.waChatId } : {}),
      totalAmount: r.totalAmount, pagado: r.pagado, saldo: r.saldo, liquidado: r.saldo <= 0,
      pctPagado: r.totalAmount ? Math.round((r.pagado / r.totalAmount) * 100) : 0,
      ...(recorridos[0] && recorridos[0].salida ? { salida: recorridos[0].salida } : {}),
      ...(recorridos[0] && recorridos[0].recogida ? { recogida: recorridos[0].recogida } : {}),
      recorridos, esPaquete: r.esPaquete, pideHospedaje: !r.zonaHospedaje, yaConfirmada, locale: r.locale,
      cobroRegistrado: cobro, metodo, reservaNueva, emailEnviado: Boolean(r.customerEmail),
      comprobanteGuardado: Boolean(comprobante && comprobante.base64), avisos: [],
    };
  }

  // ── Las funciones de api-client.js ───────────────────────────────
  const api = {
    async precio(payload = {}) {
      calls.precio.push(payload);
      const items = Array.isArray(payload.items) ? payload.items : [];
      if (!items.length && !payload.paquete && !payload.hospedaje) {
        return respuesta(400, { error: "Manda items, paquete u hospedaje." });
      }
      const c = calcular({ items, paquete: payload.paquete });
      const errores = c.errores.slice();
      if (payload.hospedaje) {
        errores.push({ indice: -1, slug: "hospedaje", motivo: "Simulacro: no tengo las tarifas del hotel; el monto sale en la cotización." });
      }
      return respuesta(200, {
        ok: true, lineas: c.lineas, ...(c.paquete ? { paquete: c.paquete } : {}),
        total: c.total, anticipo: c.anticipo, saldo: c.saldo, pctAnticipo: PCT_ANTICIPO, errores,
      });
    },

    async crearCotizacion(p = {}) {
      calls.quote.push(p);
      const item = { slug: p.tourSlug, tourDate: p.tourDate, adultos: p.adults, ninosMid: p.childrenMid, ninosSmall: p.childrenSmall };
      return cotizar(p, calcular({ items: [item] }), { etiqueta: "quote" });
    },

    async cotizarPaquetePersonalizado(p = {}) {
      calls.paquete.push(p);
      const items = Array.isArray(p.items) ? p.items : [];
      if (!items.length) return respuesta(400, { error: "Necesito al menos un recorrido." });
      const cuenta = calcular({ items });
      const grupo = Math.max(0, ...cuenta.lineas.map((l) => l.personas));
      cuenta.hospedaje = hospedajeDe(p.hospedaje, grupo);
      return cotizar(p, cuenta, { etiqueta: "paquete" });
    },

    async registrarLead(p = {}) {
      calls.lead.push(p);
      const tipo = String(p.tipo || "").toLowerCase();
      if (tipo === "rzr") {
        const rzr = TOURS.find(esPorVehiculo);
        const item = {
          slug: rzr && rzr.slug, tourDate: p.tourDate, ruta: p.ruta, vehiculo: p.vehiculo,
          unidades: p.unidades, personas: p.personas, hora: p.hora,
        };
        return cotizar(p, calcular({ items: [item] }, { fechaOpcional: true }), { etiqueta: "lead-rzr" });
      }
      if (tipo === "paquete") {
        const ninosMid = entero(p.ninosMid);
        const ninosSmall = entero(p.ninosSmall);
        const adultos = entero(p.adultos) || Math.max(0, entero(p.personas) - ninosMid - ninosSmall) || 2;
        const cuenta = calcular({
          paquete: {
            slug: p.paqueteSlug, fecha: p.checkin, adultos, ninosMid, ninosSmall,
            vistaMontana: p.vistaMontana, nocheExtra: p.nocheExtra, habitacion: p.habitacion,
          },
        });
        return cotizar(p, cuenta, { etiqueta: "lead-paquete" });
      }
      return respuesta(400, { error: "tipo debe ser 'rzr' o 'paquete'." });
    },

    async confirmarReserva(folio, montoPagado, extra = {}) {
      const { metodo, comprobante, confirmadoPor, forzar } = extra || {};
      calls.confirm.push({ folio, montoPagado, metodo, comprobante: comprobante ? { mimetype: comprobante.mimetype, filename: comprobante.filename, bytes: String(comprobante.base64 || "").length } : undefined, confirmadoPor, ...(forzar ? { forzar: true } : {}) });
      const f = String(folio || "").trim().toUpperCase();
      const m = metodo || "transferencia";
      if (!METODOS.has(m)) return respuesta(400, { error: `Método de pago desconocido: ${m}.` });
      const monto = montoPagado == null ? null : Number(montoPagado);
      if (monto !== null && !(Number.isFinite(monto) && monto > 0)) return respuesta(400, { error: "El monto no sirve." });

      const cot = cotizaciones.get(f);
      if (cot) {
        if (cot.reservaFolio) {
          const r = reservas.get(cot.reservaFolio);
          return respuesta(409, {
            error: `${f} ya es la reserva ${cot.reservaFolio}: para registrar otro pago usa ese folio.`,
            yaConfirmada: true, folio: f, reservaFolio: cot.reservaFolio,
            totalAmount: r.totalAmount, pagado: r.pagado, saldo: r.saldo, liquidado: r.saldo <= 0,
          });
        }
        // Reemplazada: el MISMO 409 del sitio (convertirCotizacionEnReserva);
        // con «forzar» se convierte igual (el dueño vio que pagó la vieja).
        if (cot.reemplazadaPor && !forzar) {
          return respuesta(409, { error: `La cotización ${f} fue reemplazada por la ${cot.reemplazadaPor} (el cliente cambió algo): confirma la ${cot.reemplazadaPor}. Si de verdad pagó la vieja, repite el /confirma con «forzar» al final.` });
        }
        if (!cot.reemplazadaPor && etapaDe(cot) === "vencida") return respuesta(409, { error: `La cotización ${f} está vencida (valía hasta ${cot.venceEl}).` });
        if (!cot.reemplazadaPor && cot.status === "expirada") return respuesta(409, { error: `La cotización ${f} está vencida.` });
        const pago = monto === null ? cot.anticipo : Math.round(monto);
        const reservaFolio = `HP-M-${prefijo}${nuevoNumero()}`;
        const r = {
          folio: reservaFolio, origen: f, tourName: cot.tourName, tourSlug: (cot.recorridos[0] || {}).slug || null,
          tourDate: cot.tourDate, adults: cot.adults, children: cot.children,
          totalAmount: cot.total, pagado: Math.min(pago, cot.total), saldo: Math.max(0, cot.total - pago),
          esPaquete: cot.esPaquete, recorridos: cot.recorridos, paquete: cot.paquete,
          customerName: cot.customerName, customerEmail: cot.customerEmail, telefono: cot.telefono,
          waChatId: cot.waChatId, zonaHospedaje: cot.zonaHospedaje, locale: cot.locale,
          creadaAt: ahora(), cobros: [{ monto: pago, metodo: m, at: ahora() }], notasInternas: [],
        };
        reservas.set(reservaFolio, r);
        cot.reservaFolio = reservaFolio;
        cot.status = "aceptada";
        return respuesta(200, confirmacion(r, { folioPedido: f, yaConfirmada: false, cobro: r.pagado, metodo: m, reservaNueva: true, comprobante }));
      }

      const r = reservas.get(f);
      if (!r) return respuesta(404, { error: `No encontré el folio ${f}.` });
      const sinDinero = (error) => respuesta(409, {
        error, yaConfirmada: true, folio: f, reservaFolio: f,
        totalAmount: r.totalAmount, pagado: r.pagado, saldo: r.saldo, liquidado: r.saldo <= 0,
      });
      if (r.saldo <= 0) return sinDinero(`${f} ya está liquidada: no registré nada.`);
      if (monto === null) return sinDinero(`${f} ya tiene pago: dime el monto que entró.`);
      // Como el sitio desde el 17 nov: solo cuenta un cobro igual del MISMO
      // método (la liga de una persona y la transferencia de otra no son el
      // mismo pago), y «forzar» lo registra de todos modos.
      const repetido = !forzar && r.cobros.find((c) => c.monto === Math.round(monto) && c.metodo === m && ahora() - c.at < COBRO_REPETIDO_MS);
      if (repetido) return sinDinero(`Ya se había registrado un pago de ${mx(monto)} en ${f} hace unos minutos: no se duplicó. Si de verdad entró OTRO pago igual, repite con «forzar» al final.`);
      const pago = Math.min(Math.round(monto), r.saldo);
      r.cobros.push({ monto: pago, metodo: m, at: ahora() });
      r.pagado += pago;
      r.saldo -= pago;
      return respuesta(200, confirmacion(r, { folioPedido: f, yaConfirmada: true, cobro: pago, metodo: m, reservaNueva: false, comprobante }));
    },

    // El HTML del PDF (en el simulacro, una hoja mínima con el folio).
    async documento(folio) {
      calls.documento.push(folio);
      const f = String(folio || "").trim().toUpperCase();
      if (!cotizaciones.has(f) && !reservas.has(f)) return respuesta(404, { error: `No existe ${f}.` });
      return { ok: true, status: 200, html: `<html><body><h1>${f}</h1></body></html>` };
    },

    // Una liga por persona: el anticipo repartido en partes (como repartirEnPartes del sitio).
    async ligasPorPersona(folio, partes, base = "anticipo") {
      calls.ligas.push({ folio, partes, base });
      const f = String(folio || "").trim().toUpperCase();
      const reg = cotizaciones.get(f);
      if (!reg) return respuesta(404, { error: `No existe la cotización ${f}.` });
      const n = Math.floor(Number(partes));
      if (!(n >= 2 && n <= 12)) return respuesta(400, { error: "`partes` va de 2 a 12." });
      const monto = base === "total" ? reg.total : reg.anticipo;
      const parte = Math.floor(monto / n);
      const sobra = monto - parte * n;
      reg.partes = Array.from({ length: n }, (_, i) => ({ parte: i + 1, de: n, url: `https://buy.stripe.com/test_${f}_${i + 1}`, monto: parte + (i < sobra ? 1 : 0), pagada: false }));
      reg.ligaPago = null;
      return respuesta(200, { folio: f, base, ligas: reg.partes });
    },

    async consultarReserva(folio) {
      calls.lookup.push(folio);
      const f = String(folio || "").trim().toUpperCase();
      if (cotizaciones.has(f)) return respuesta(200, vistaCotizacion(cotizaciones.get(f)));
      if (reservas.has(f)) return respuesta(200, vistaReserva(reservas.get(f)));
      return respuesta(404, { error: "No encontré ese folio." });
    },

    async escalacion(p = {}) {
      calls.escalacion.push(p);
      if (!p.motivo && !p.resumen) return respuesta(400, { ok: false, error: "Falta el motivo." });
      const f = String(p.folio || "").toUpperCase();
      const reg = cotizaciones.get(f) || reservas.get(f) || null;
      if (reg) reg.notasInternas.push(`Bot · ${p.motivo} (${p.urgencia}): ${p.resumen}`);
      return respuesta(200, { ok: true, notaInterna: Boolean(reg) });
    },

    async cotizacionActiva({ chatId, telefono } = {}) {
      calls.activa.push({ chatId, telefono });
      if (!chatId && !telefono) return respuesta(400, { error: "Falta chatId o teléfono." });
      const tel = ultimos10(telefono);
      const limite = ahora() - 30 * 24 * 60 * 60 * 1000;
      const vivas = [...cotizaciones.values()]
        // Una reemplazada nunca es la activa (además ya está expirada).
        .filter((c) => !c.reservaFolio && !c.reemplazadaPor && ["enviada", "borrador"].includes(c.status) && c.creadaAt >= limite)
        .filter((c) => (chatId && c.waChatId === chatId) || (tel && ultimos10(c.telefono) === tel))
        .sort((a, b) => b.creadaAt - a.creadaAt);
      if (!vivas.length) return respuesta(404, { error: "No hay cotización activa de ese chat." });
      const v = vistaCotizacion(vivas[0]);
      return respuesta(200, {
        folio: v.folio, status: v.status, etapa: v.etapa, total: v.total, anticipo: v.anticipo, saldo: v.saldo,
        venceEl: v.venceEl, customerName: v.customerName, tourName: v.tourName, tourDate: v.tourDate,
        adults: v.adults, children: v.children, esPaquete: v.esPaquete, locale: v.locale,
      });
    },

    async checkHotelAvailability(checkin, checkout, rooms) {
      calls.hotel.push({ checkin, checkout, rooms });
      return respuesta(200, { available: true, unavailableRooms: habitacionesOcupadas.slice() });
    },
  };

  /**
   * Lo que haría Stripe al pagarse la liga del folio (solo el simulador):
   * con una liga por persona paga la siguiente parte; la primera que entra
   * convierte la cotización en reserva y las demás se abonan a esa reserva
   * (como convertirPorLigaPagada y abonarLigasDeCotizacion del sitio).
   * @returns {{ ok: boolean, error?: string, folio?: string, reservaFolio?: string, monto?: number }}
   */
  async function pagarLiga(folio) {
    const f = String(folio || "").trim().toUpperCase();
    const cot = cotizaciones.get(f);
    if (!cot) return { ok: false, error: `No existe la cotización ${f}.` };
    const parte = Array.isArray(cot.partes) && cot.partes.length ? cot.partes.find((p) => !p.pagada) : null;
    if (Array.isArray(cot.partes) && cot.partes.length && !parte) return { ok: false, error: `Las ${cot.partes.length} ligas de ${f} ya están pagadas.` };
    if (!parte && !cot.ligaPago) return { ok: false, error: `${f} no tiene liga de pago viva${cot.reservaFolio ? ` (ya es la reserva ${cot.reservaFolio})` : ""}.` };
    const monto = parte ? parte.monto : cot.anticipo;
    if (cot.reservaFolio) {
      // Otra parte de la misma reserva: se abona directo (como el sitio), sin
      // el candado de «pago igual en menos de 15 min» de /confirma: las partes
      // suelen ser del mismo monto.
      const res = reservas.get(cot.reservaFolio);
      if (!res) return { ok: false, error: `No encontré la reserva ${cot.reservaFolio}.` };
      const pago = Math.min(Math.round(monto), res.saldo);
      res.cobros.push({ monto: pago, metodo: "stripe", at: ahora() });
      res.pagado += pago;
      res.saldo -= pago;
    } else {
      const r = await api.confirmarReserva(f, monto, { metodo: "stripe", confirmadoPor: "stripe" });
      if (!r.ok) return { ok: false, error: (r.data && r.data.error) || `respondió ${r.status}` };
    }
    if (parte) parte.pagada = true;
    else cot.ligaPago = null;
    cot.pagadaConLiga = (cot.pagadaConLiga || 0) + 1;
    return { ok: true, folio: f, reservaFolio: cot.reservaFolio, monto };
  }

  /** Vacía el registro de llamadas (los folios se quedan). */
  function reiniciarLlamadas() {
    for (const k of Object.keys(calls)) calls[k].length = 0;
  }

  return { api, calls, cotizaciones, reservas, calcular, reiniciarLlamadas, pagarLiga };
}

module.exports = { crearSitioSimulado, PCT_ANTICIPO, telefonoComparable, puedeReemplazar };
