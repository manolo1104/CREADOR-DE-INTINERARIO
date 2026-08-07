// ════════════════════════════════════════════════════════════════════
// CATÁLOGO — Tours Huasteca Potosina (huasteca-potosina.com)
// La "educación" del bot. Los DATOS vienen de data.json, que se genera
// automáticamente desde la fuente de la verdad del sitio (src/lib/*) con:
//     npx tsx src/scripts/export-bot-data.ts
// NO edites los datos aquí — cambia el sitio y regenera data.json.
// Precios POR PERSONA (MXN), salvo el RZR (por vehículo).
// Niños 6–10 = 70 %, menores de 6 = 50 %.
// ════════════════════════════════════════════════════════════════════

const DATA = require("./data.json");

const TOURS = DATA.tours;
const EMPRESA = {
  nombre: DATA.empresa.nombre,
  sitio: DATA.empresa.sitio,
  zona: DATA.empresa.zona,
  salida: DATA.empresa.salida,
  cancelacion: DATA.empresa.cancelacion,
  ninos: DATA.empresa.ninos,
};
const SALIDA = DATA.empresa.salida;

function findTour(slugOrId) {
  const q = String(slugOrId || "").toLowerCase().trim();
  return TOURS.find((t) => t.slug === q || t.id === q) || null;
}

/** true si el tour se cobra por vehículo (RZR) en vez de por persona. */
function esPorVehiculo(t) {
  return t && t.precioUnidad === "vehiculo";
}

/** Precio total por persona (misma lógica de dos niveles que el sitio). */
function calcPrecio(precioAdulto, adultos, ninosMid = 0, ninosSmall = 0) {
  const mid = Math.round(precioAdulto * 0.7);
  const small = Math.round(precioAdulto * 0.5);
  const total = precioAdulto * adultos + mid * ninosMid + small * ninosSmall;
  return { total, precioMid: mid, precioSmall: small };
}

// ── RZR (cobro por vehículo) ─────────────────────────────────────────
function findRutaRZR(tour, q) {
  if (!tour || !tour.rutas) return -1;
  const s = String(q || "").toLowerCase().trim();
  return tour.rutas.findIndex(
    (r) => r.nombre.toLowerCase() === s || r.nombre.toLowerCase().includes(s) || (s && s.includes(r.nombre.toLowerCase().replace("ruta ", "")))
  );
}
function findVehiculoRZR(tour, q) {
  if (!tour || !tour.flota) return null;
  const s = String(q || "").toLowerCase().trim();
  return (
    tour.flota.find((v) => v.nombre.toLowerCase() === s) ||
    tour.flota.find((v) => v.nombre.toLowerCase().includes(s) || (s && s.includes(v.nombre.toLowerCase()))) ||
    null
  );
}

/**
 * Precio del RZR = flota[vehiculo].precios[indiceRuta].
 * Devuelve { ok, total, ruta, vehiculo, ... } o { ok:false, error }.
 */
function precioRZR(tour, rutaQuery, vehiculoQuery) {
  if (!esPorVehiculo(tour) || !tour.rutas || !tour.flota) {
    return { ok: false, error: "Este tour no se cobra por vehículo." };
  }
  const ri = findRutaRZR(tour, rutaQuery);
  if (ri < 0) {
    return { ok: false, error: `Ruta no encontrada. Opciones: ${tour.rutas.map((r) => r.nombre).join(", ")}.` };
  }
  const v = findVehiculoRZR(tour, vehiculoQuery);
  if (!v) {
    return { ok: false, error: `Vehículo no encontrado. Flota: ${tour.flota.map((x) => x.nombre).join(", ")}.` };
  }
  const ruta = tour.rutas[ri];
  return {
    ok: true,
    total: v.precios[ri],
    moneda: "MXN",
    porUnidad: "vehículo",
    ruta: ruta.nombre,
    rutaDuracionHrs: ruta.duracionHrs,
    vehiculo: v.nombre,
    capacidad: v.capacidad,
  };
}

module.exports = {
  TOURS,
  EMPRESA,
  SALIDA,
  findTour,
  calcPrecio,
  esPorVehiculo,
  precioRZR,
  findRutaRZR,
  findVehiculoRZR,
};
