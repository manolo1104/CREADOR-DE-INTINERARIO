// ════════════════════════════════════════════════════════════════════
// CONOCIMIENTO DEL SITIO — Tours Huasteca Potosina
// Paquetes (tours + hotel), destinos e info general.
// Los DATOS vienen de data.json, generado desde la fuente del sitio con:
//     npx tsx src/scripts/export-bot-data.ts
// NO edites datos aquí — cambia el sitio (src/lib/*) y regenera data.json.
// Precios en MXN.
// ════════════════════════════════════════════════════════════════════

const DATA = require("./data.json");

const PAQUETES = DATA.paquetes;
const HABITACIONES = DATA.habitaciones;
const LOGISTICA = DATA.logistica;
// Traslado privado desde la ciudad del cliente hasta Xilitla (ida y vuelta).
const TRASLADOS = DATA.traslados || [];
const FAQS_PAQUETES = DATA.faqsPaquetes;
const DESTINOS = DATA.destinos;
const DESTINO_TOUR = DATA.destinoTour; // slug destino → [{ nombre, slug }] de tours nuestros
const INFO = DATA.info;

// Lo que el equipo contesta en los chats reales y el bot no sabía (pago y
// saldo, clima y río, recogidas especiales, hotel…). Sale de
// src/lib/bot/politicas.ts, ya anonimizado: el repo es público. Con un
// data.json anterior no existe: lista vacía, y consultar_politica escala la
// duda al equipo en vez de inventar la respuesta.
const POLITICAS = (Array.isArray(DATA.politicas) ? DATA.politicas : [])
  .filter((p) => p && p.tema && p.texto);
// Xantolo (noche y paquete del evento, con su cupo y sus links). null si el
// evento ya pasó o el data.json no lo trae.
const XANTOLO = DATA.xantolo && typeof DATA.xantolo === "object" ? DATA.xantolo : null;
// La política completa de cancelación y lluvia (la de la página de FAQ). El
// bot solo sabía "gratis hasta 48 h antes" y contestaba de menos.
const CANCELACION_COMPLETA = Array.isArray(INFO && INFO.cancelacionCompleta) ? INFO.cancelacionCompleta : [];

function findPaquete(q) {
  const s = String(q || "").toLowerCase().trim();
  return (
    PAQUETES.find((p) => p.id === s || p.slug === s) ||
    PAQUETES.find((p) => p.nombre.toLowerCase().includes(s)) ||
    null
  );
}

// ── Búsqueda de destinos ─────────────────────────────────────────────
// El fallback difuso anterior aceptaba CUALQUIER palabra compartida de >3
// letras, así que "cascada del salto" devolvía la ficha de la Cascada de Tamul
// y "cueva de las quilas" la de la Cueva del Salitre. El bot entregaba esos
// datos como verificados. Ahora sólo cuentan las palabras DISTINTIVAS: una
// palabra pesa según en cuántos destinos aparece, y si ninguna es distintiva
// preferimos no devolver nada a devolver el destino equivocado.

const norm = (s) =>
  String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

const palabras = (s) => norm(s).split(/[^a-z0-9]+/).filter((w) => w.length > 3);

// Cuántos destinos usan cada palabra (se calcula una vez al arrancar).
const FRECUENCIA = new Map();
for (const d of DESTINOS) {
  for (const w of new Set(palabras(d.nombre))) {
    FRECUENCIA.set(w, (FRECUENCIA.get(w) || 0) + 1);
  }
}

// Sustantivos de CATEGORÍA: aunque en la base aparezcan una sola vez, no
// identifican nada por sí solos. Sin esto, "cueva de las quilas" caía en la
// Cueva del Salitre sólo por compartir la palabra "cueva".
const GENERICAS = new Set([
  "cueva", "cuevas", "cascada", "cascadas", "laguna", "lagunas", "sotano",
  "poza", "pozas", "nacimiento", "manantial", "mirador", "miradores", "jardin",
  "museo", "puente", "cerro", "parque", "bosque", "aldea", "pueblo", "hacienda",
  "castillo", "grutas", "gruta", "balneario", "cenote", "cañon",
  "canon", "ruinas", "zona", "centro", "santa", "surrealista", "magico",
]);

/** Peso de una palabra: única = 1, poco común = 0.5, genérica o repetida = bajo. */
function peso(w) {
  if (GENERICAS.has(w)) return 0.4;
  const n = FRECUENCIA.get(w) || 0;
  if (n === 1) return 1;
  if (n === 2) return 0.5;
  return 0.15;
}

// Nombres con los que la gente pide un lugar y que no son su nombre oficial.
const ALIAS = {
  "edward james": "las-pozas-jardin-surrealista",
  "jardin surrealista": "las-pozas-jardin-surrealista",
  "jardin escultorico": "las-pozas-jardin-surrealista",
  "huahuas": "sotano-de-las-huahuas",
  "golondrinas": "sotano-de-las-golondrinas",
  "beto ramon": "castillo-de-la-salud",
};

const UMBRAL = 1; // hace falta al menos una palabra realmente distintiva

function findDestino(q) {
  const s = norm(q);
  if (!s) return null;

  for (const [alias, slug] of Object.entries(ALIAS)) {
    if (s.includes(alias)) {
      const d = DESTINOS.find((x) => x.slug === slug);
      if (d) return d;
    }
  }

  const exacto =
    DESTINOS.find((d) => norm(d.slug) === s) ||
    DESTINOS.find((d) => norm(d.nombre) === s) ||
    DESTINOS.find((d) => norm(d.nombre).includes(s) || s.includes(norm(d.nombre)));
  if (exacto) return exacto;

  const consulta = new Set(palabras(s));
  if (!consulta.size) return null;

  let mejor = null;
  let mejorScore = 0;
  for (const d of DESTINOS) {
    let score = 0;
    for (const w of new Set(palabras(d.nombre))) {
      if (consulta.has(w)) score += peso(w);
    }
    if (score > mejorScore) { mejorScore = score; mejor = d; }
  }
  return mejorScore >= UMBRAL ? mejor : null;
}

// ── Búsqueda de políticas ────────────────────────────────────────────
// El modelo pide un tema con sus palabras ("lluvia", "me recogen en
// Tamasopo?", "check in"). Primero el tema exacto del índice del prompt;
// luego las `claves` de cada política (las frases con que preguntan los
// clientes); al final, palabras sueltas del tema y el título. Si nada
// coincide se devuelve vacío: una política equivocada contada como cierta es
// peor que decir "te lo confirmo".

// Palabras que no distinguen un tema de otro. Aquí sí cuentan las de 3 letras
// ("rio", "rzr", "msi"), que la búsqueda de destinos descarta.
const VACIAS = new Set([
  "que", "los", "las", "del", "con", "por", "para", "una", "uno", "unos", "hay", "como",
  "cual", "cuando", "donde", "puedo", "pueden", "puede", "tienen", "tiene", "esta", "este",
  "the", "and", "for", "can", "you", "are", "how", "what", "with", "tour", "tours",
]);
const palabrasPol = (s) =>
  norm(s).split(/[^a-z0-9]+/).filter((w) => w.length >= 3 && !VACIAS.has(w));
// "check-in", "¿cruza ríos?" y "check in" tienen que verse iguales.
const sinGuiones = (s) => norm(s).replace(/[^a-z0-9%&]+/g, " ").replace(/\s+/g, " ").trim();

// Temas que el bot puede contestar con datos que ya trae data.json aunque
// politicas.ts no los tenga (o con un data.json anterior). Van solo a la
// búsqueda: POLITICAS se exporta tal cual viene del sitio.
function politicasDerivadas() {
  const extra = [];
  const tiene = (tema) => POLITICAS.some((p) => sinGuiones(p.tema) === sinGuiones(tema));
  if (CANCELACION_COMPLETA.length && !tiene("cancelacion")) {
    extra.push({
      tema: "cancelacion", titulo: "Cancelación, lluvia y río",
      texto: CANCELACION_COMPLETA.join(" "),
      claves: ["cancelar", "cancelación", "reembolso", "devolución", "lluvia", "reagendar", "cancel", "refund"],
    });
  }
  if (XANTOLO && !tiene("xantolo")) {
    extra.push({
      tema: "xantolo", titulo: "Xantolo 2026 en Xilitla (noche y paquete del evento)",
      texto: "Datos del evento en «datos»: precios, fechas, qué incluye y el link para reservar. El cupo lo cuenta el link: no prometas lugar.",
      claves: ["xantolo", "día de muertos", "dia de muertos", "muertos", "31 de octubre", "1 de noviembre", "noviembre"],
      datos: XANTOLO,
    });
  }
  // «¿Dónde nos quedamos?» La respuesta oficial vive en politicas.ts (tema
  // "donde-hospedarse"). Con un data.json anterior, que no la trae, el bot
  // escalaba la pregunta o brincaba a cotizar: se arma aquí SOLO con lo que
  // data.json ya dice (la regla de recogida, el hotel y los otros hoteles),
  // sin inventar una recomendación.
  if (!tiene("donde-hospedarse")) {
    const hotel = INFO && INFO.hotelServicios;
    const otros = POLITICAS.find((p) => sinGuiones(p.tema) === "hoteles alternativos");
    const texto = [
      "Conviene hospedarse donde salen los tours que van a hacer: cada tour recoge en Xilitla, en Ciudad Valles o en los dos (campo «salida» de obtener_tour), y los que solo recogen en Xilitla llevan costo adicional desde Ciudad Valles, que cotiza el equipo.",
      hotel && hotel.nombre
        ? `Nuestro hotel: ${hotel.nombre}. ${hotel.ubicacion || ""}${Array.isArray(hotel.servicios) && hotel.servicios.length ? ` Tiene: ${hotel.servicios.join("; ")}.` : ""}`
        : null,
      otros ? `Otras opciones: ${otros.texto}` : null,
      "Que haya cuarto libre no lo aparta: se aparta con el anticipo.",
    ].filter(Boolean).join(" ");
    extra.push({
      tema: "donde-hospedarse", titulo: "Dónde hospedarse: zona y hotel",
      texto,
      claves: [
        "dónde nos quedamos", "dónde quedarnos", "dónde nos recomiendan", "dónde hospedarnos", "dónde nos hospedamos",
        "qué zona", "en qué zona", "xilitla o valles", "valles o xilitla", "dónde dormir",
        "where should we stay", "which area", "where to sleep",
      ],
    });
  }
  return extra;
}
const POLITICAS_BUSQUEDA = [...POLITICAS, ...politicasDerivadas()];

/** Hasta `max` políticas que contestan la consulta, de la más a la menos cercana. */
function buscarPoliticas(q, max = 2) {
  const s = sinGuiones(q);
  if (!s) return [];
  const exacta = POLITICAS_BUSQUEDA.find((p) => sinGuiones(p.tema) === s || sinGuiones(p.titulo) === s);
  if (exacta) return [exacta];

  const deLaConsulta = new Set(palabrasPol(s));
  const puntuadas = POLITICAS_BUSQUEDA.map((p) => {
    let score = 0;
    for (const c of p.claves || []) {
      const k = sinGuiones(c);
      if (!k) continue;
      if (` ${s} `.includes(` ${k} `)) score += 3;          // la clave completa, como palabra(s) suelta(s)
      else if (k.length >= 4 && s.includes(k)) score += 2;  // dentro de otra palabra ("lluvias")
      else if (s.length >= 4 && k.includes(s)) score += 1;  // la consulta es un pedazo de la clave
    }
    for (const w of new Set(palabrasPol(`${p.tema} ${p.titulo}`))) {
      if (deLaConsulta.has(w)) score += 1;
    }
    return { p, score };
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score);
  return puntuadas.slice(0, max).map((x) => x.p);
}

// ── Lo que contesta el equipo (Erick) ─────────────────────────────────
// La guía de lo que sabe el bot (17 nov 2026): src/lib/bot/respuestasEquipo.ts,
// exportada a data.json como `respuestas`. Va completa en el prompt; aquí se
// busca para `consultar_politica` y para la ficha de cada tour.
const RESPUESTAS = (Array.isArray(DATA.respuestas) ? DATA.respuestas : [])
  .filter((r) => r && r.id && r.respuesta && Array.isArray(r.preguntas));
const TEMAS_RESPUESTA = (DATA.temasRespuesta && typeof DATA.temasRespuesta === "object") ? DATA.temasRespuesta : {};

/** Lo que se le pasa al modelo de una respuesta (sin las preguntas de ejemplo). */
function respuestaParaModelo(r) {
  return {
    pregunta: r.preguntas[0],
    respuesta: r.respuesta,
    ...(r.alEquipo ? { alEquipo: r.alEquipo } : {}),
    ...(r.nota ? { nota: r.nota } : {}),
  };
}

// «bebés» y «bebé», «ríos» y «río» tienen que verse iguales.
const raiz = (w) => (w.length > 3 ? w.replace(/s$/, "") : w);
const raices = (t) => palabrasPol(t).map(raiz);

/** Hasta `max` respuestas del equipo para la consulta, de la más a la menos cercana. */
function buscarRespuestas(q, max = 3) {
  const deLaConsulta = new Set(raices(q));
  if (!deLaConsulta.size) return [];
  return RESPUESTAS.map((r) => {
    let score = 0;
    const propias = new Set(raices(`${r.id.replace(/-/g, " ")} ${r.preguntas.join(" ")}`));
    for (const w of deLaConsulta) if (propias.has(w)) score += 2;
    const enRespuesta = new Set(raices(r.respuesta));
    for (const w of deLaConsulta) if (!propias.has(w) && enRespuesta.has(w)) score += 1;
    return { r, score };
  })
    .filter((x) => x.score >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((x) => x.r);
}

/** Las respuestas del equipo que hablan de este tour (para obtener_tour). */
function respuestasDeTour(slug) {
  return RESPUESTAS.filter((r) => Array.isArray(r.tours) && r.tours.includes(slug));
}

module.exports = {
  RESPUESTAS,
  TEMAS_RESPUESTA,
  buscarRespuestas,
  respuestasDeTour,
  respuestaParaModelo,
  PAQUETES,
  HABITACIONES,
  LOGISTICA,
  TRASLADOS,
  FAQS_PAQUETES,
  DESTINOS,
  DESTINO_TOUR,
  INFO,
  POLITICAS,
  XANTOLO,
  CANCELACION_COMPLETA,
  findPaquete,
  findDestino,
  buscarPoliticas,
};
