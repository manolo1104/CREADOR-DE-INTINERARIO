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

function findDestino(q) {
  const s = String(q || "").toLowerCase().trim();
  return (
    DESTINOS.find((d) => d.slug === s) ||
    DESTINOS.find((d) => d.nombre.toLowerCase() === s) ||
    DESTINOS.find((d) => d.nombre.toLowerCase().includes(s)) ||
    DESTINOS.find((d) =>
      s &&
      d.nombre
        .toLowerCase()
        .split(/[ (—-]/)
        .some((w) => w.length > 3 && s.includes(w))
    ) ||
    null
  );
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
