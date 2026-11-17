// ════════════════════════════════════════════════════════════════════
// CATÁLOGO — Tours Huasteca Potosina (huasteca-potosina.com)
// La "educación" del bot. Los DATOS vienen de data.json, que se genera
// automáticamente desde la fuente de la verdad del sitio (src/lib/*) con:
//     npx tsx src/scripts/export-bot-data.ts
// NO edites los datos aquí — cambia el sitio y regenera data.json.
// Precios POR PERSONA (MXN), salvo el RZR (por vehículo).
// Niños 6–10 = 70 %, menores de 6 = 50 %.
//
// ⚠️ El precio que vale es el del SITIO (/api/bot/precio): las cuentas de
// aquí son el RESPALDO para cuando el sitio no contesta, y copian sus reglas
// (promo por fecha del tour, grupos bajo el mínimo) para que la cifra de referencia no
// se aleje de la que va a salir en la cotización.
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

// ── Precio por FECHA del tour ────────────────────────────────────────
// 🔴 data.json congelaba el precio del día del export: la promo de temporada
// baja se le quedaba puesta a un tour del 20 de noviembre, y después del 29 de
// octubre seguía viva hasta que alguien re-exportara. Ahora `precio` es el de
// LISTA y `promo` trae {precio, vence}: la promo aplica si el TOUR cae hasta
// `vence`, igual que `precioDeFecha` del sitio. Con un data.json anterior (sin
// esos campos) todo vuelve a `precio`, como antes.

/** Hoy en México (AAAA-MM-DD). El contenedor corre en UTC: de 6 pm a medianoche ya es "mañana" allá. */
function hoyMX(ahora = Date.now()) {
  return new Date(ahora).toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
}

/** Precio de lista por persona. */
function precioLista(t) {
  return t && typeof t.precioLista === "number" ? t.precioLista : t ? t.precio : 0;
}

/** La promo del tour ({precio, vence}) si data.json la trae bien formada; si no, null. */
function promoDe(t) {
  const p = t && t.promo;
  return p && typeof p.precio === "number" && /^\d{4}-\d{2}-\d{2}$/.test(String(p.vence || "")) ? p : null;
}

/** ¿Un tour en esta fecha lleva la promo? Sin fecha, lo que se anuncia HOY (como `fechaConPromo` del sitio). */
function promoAplica(t, fecha) {
  const p = promoDe(t);
  if (!p) return false;
  return (fecha || hoyMX()) <= p.vence;
}

/** Precio por persona de un tour EN UNA FECHA: el de lista, o el de promo si el tour cae dentro. */
function precioEnFecha(t, fecha) {
  return promoAplica(t, fecha) ? promoDe(t).precio : precioLista(t);
}

// ── Precio por tamaño del grupo (espejo de `precioPorCabeza` de tours.ts) ──
// Decisión de Manolo (6 oct 2026): en los recorridos con `escalaPersona` el
// precio por persona baja desde 3 personas. Cada escalón es un DESCUENTO en
// pesos que se resta al precio de lista; gana el más alto que no pase del
// número de personas (un grupo de 5 paga el de 3). El escalón lo deciden TODAS
// las cabezas —los niños también ocupan lugar— y luego los menores pagan su
// 70 / 50 % sobre ese precio.
// 🔴 La escalera NO se encima con la promo de temporada baja: si la fecha del
// recorrido lleva promo, manda la promo y no se resta escalón (sumadas, un
// Tamul de 6 quedaba por debajo del costo del proveedor). Un grupo bajo el
// mínimo paga lo mismo que cualquier grupo de su tamaño (ver abajo).

/** El escalón de descuento por persona que le toca a un grupo de `personas`, en MXN. */
function descuentoPorGrupo(t, personas) {
  const tabla = t && Array.isArray(t.escalaPersona) ? t.escalaPersona : null;
  if (!tabla || !tabla.length) return 0;
  const n = Math.max(1, Math.floor(Number(personas)) || 1);
  return tabla.reduce((mejor, e) => (n >= e.desde && e.menos > mejor ? e.menos : mejor), 0);
}

/** Lo que paga CADA persona de un grupo de `personas` en esa fecha: la promo si aplica; si no, lista menos el escalón. */
function precioPorCabezaEnFecha(t, fecha, personas) {
  if (promoAplica(t, fecha)) return promoDe(t).precio;
  return precioLista(t) - descuentoPorGrupo(t, personas);
}

// ── Grupo bajo el mínimo (espejo de tourBooking.ts) ──────────────────
// Decisión de Manolo (8 oct 2026), reemplaza a la del 1 oct («viajero solo
// paga el precio de dos menos $2»): quien va BAJO el mínimo de personas de un
// recorrido por persona —una persona sola, o tres en el rafting que pide
// cinco— paga su lugar a TARIFA NORMAL (la misma escalera por grupo y la misma
// promo de la fecha que cualquiera) y se suma a una salida compartida. El
// equipo le confirma la salida `CONFIRMA_SALIDA_DIAS` días antes; si no se
// junta el mínimo, se le devuelve el 100 %. El Edén (tarifa por grupo) y el
// RZR (por vehículo) quedan fuera: ahí el mínimo sigue siendo mínimo.
// La marca del sitio se sigue llamando `viajeroSolo`, aunque ya quiere decir
// «va bajo el mínimo».
const CONFIRMA_SALIDA_DIAS = (DATA.empresa && Number(DATA.empresa.confirmaSalidaDias)) || 7;

function aceptaViajeroSolo(t) {
  return Boolean(t) && t.precioUnidad !== "vehiculo" &&
    !(Array.isArray(t.tarifaGrupo) && t.tarifaGrupo.length);
}

/** ¿Este grupo va bajo el mínimo del tour y aun así se puede vender? */
function vaBajoElMinimo(t, personas) {
  return aceptaViajeroSolo(t) && typeof t.groupMin === "number" && personas >= 1 && personas < t.groupMin;
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
  hoyMX,
  precioLista,
  promoDe,
  promoAplica,
  precioEnFecha,
  descuentoPorGrupo,
  precioPorCabezaEnFecha,
  aceptaViajeroSolo,
  vaBajoElMinimo,
  CONFIRMA_SALIDA_DIAS,
};
