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
const FAQS_PAQUETES = DATA.faqsPaquetes;
const DESTINOS = DATA.destinos;
const DESTINO_TOUR = DATA.destinoTour; // slug destino → [{ nombre, slug }] de tours nuestros
const INFO = DATA.info;

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

module.exports = {
  PAQUETES,
  HABITACIONES,
  LOGISTICA,
  FAQS_PAQUETES,
  DESTINOS,
  DESTINO_TOUR,
  INFO,
  findPaquete,
  findDestino,
};
