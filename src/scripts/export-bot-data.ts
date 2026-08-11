/**
 * export-bot-data.ts — genera el "cerebro" del bot de WhatsApp desde la
 * fuente de la verdad del sitio (src/lib/*), para que NUNCA se desincronice.
 *
 * Uso:  npx tsx src/scripts/export-bot-data.ts
 * Salida:  whatsapp-bot/data.json  (lo consumen catalog.js y knowledge.js)
 *
 * Cada vez que cambien tours.ts, paquetes.ts, destinos.ts o tourMapping.ts,
 * vuelve a correr este script para actualizar al bot.
 */

import { writeFileSync } from "fs";
import { join } from "path";
import { TOURS_DB, tourDurTexto } from "../lib/tours";
import { PAQUETES_DB, HABITACIONES, LOGISTICA, FAQS_PAQUETES } from "../lib/paquetes";
import { DESTINOS_DB } from "../lib/destinos";
import { DESTINO_EN_TOURS } from "../lib/tourMapping";

// ── Capa curada (lo que la fuente del sitio no expresa en datos) ─────────────
// Se mantiene aquí, cerca de la generación, y es lo único que se edita a mano.

const NO_INCLUYE: Record<string, string[]> = {
  "rzr-xilitla": ["Transporte hasta Xilitla", "Alimentos"],
  "rappel-tamul": ["Transporte hasta el embarcadero del Río Tampaón (se coordina aparte, con costo adicional)", "Alimentos"],
  "rafting-rio-tampaon": ["Comida de mediodía (solo el desayuno buffet está incluido)", "Bebidas alcohólicas", "Propinas y gastos personales"],
  "expedicion-tamul": ["Comida de mediodía", "Propinas y gastos personales"],
  "ruta-surrealista-edward-james": ["Comida de mediodía", "Propinas y gastos personales"],
  "cascadas-del-meco": ["Comida de mediodía", "Propinas y gastos personales"],
  "paraiso-escalonado-minas-micos": ["Comida de mediodía", "Propinas y gastos personales"],
  "ruta-acuatica-puente-de-dios": ["Comida de mediodía", "Propinas y gastos personales"],
  "buceo-media-luna": ["Transporte hasta la Laguna de la Media Luna (Rioverde)", "Entrada al parque (se paga allá)", "Alimentos — no se incluye ninguna comida, pero en la laguna hay puestos y restaurantes donde comprar", "Traje de baño y toalla"],
};

// ── Hechos que el bot NO debe deducir ni suponer ─────────────────────────────
// Antes el bot leía "incluye"/"noIncluye" y sacaba conclusiones propias: llegó a
// prometer recogida en el hotel para el rappel (no la hay) y comida para la Ruta
// Acuática (tampoco). Ahora cada tour trae la respuesta ya escrita y literal.

/** ¿Pasamos por el cliente a su hospedaje? Respuesta cerrada por tour. */
const TRANSPORTE: Record<string, { incluido: boolean; detalle: string }> = {
  "rzr-xilitla": { incluido: false, detalle: "NO incluye transporte. El recorrido sale de nuestra base en Xilitla y el cliente llega por su cuenta hasta allá." },
  "rappel-tamul": { incluido: false, detalle: "NO incluye transporte. El punto de encuentro es el embarcadero del Río Tampaón: el cliente llega por su cuenta, o lo coordinamos aparte CON COSTO ADICIONAL. Nunca prometas recogida en el hospedaje para este tour." },
  "buceo-media-luna": { incluido: false, detalle: "NO incluye transporte. La actividad es en la Laguna de la Media Luna (Rioverde) y el cliente llega por su cuenta." },
  "rafting-rio-tampaon": { incluido: true, detalle: "SÍ incluye traslado redondo: pasamos por el cliente a su hospedaje en Ciudad Valles o Xilitla." },
  "expedicion-tamul": { incluido: true, detalle: "SÍ incluye traslado redondo: pasamos por el cliente a su hospedaje en Xilitla o Ciudad Valles." },
  "ruta-surrealista-edward-james": { incluido: true, detalle: "SÍ incluye traslado redondo: pasamos por el cliente a su hospedaje en Xilitla o Ciudad Valles." },
  "cascadas-del-meco": { incluido: true, detalle: "SÍ incluye traslado redondo: pasamos por el cliente a su hospedaje en Xilitla o Ciudad Valles." },
  "paraiso-escalonado-minas-micos": { incluido: true, detalle: "SÍ incluye traslado redondo: pasamos por el cliente a su hospedaje en Xilitla o Ciudad Valles." },
  "ruta-acuatica-puente-de-dios": { incluido: true, detalle: "SÍ incluye traslado redondo: pasamos por el cliente a su hospedaje en Xilitla o Ciudad Valles." },
  // Único tour con traslado incluido pero SOLO dentro de Xilitla: el camino a
  // la finca se hace en RZR y no se sale a Ciudad Valles.
  "travesia-del-cafe": { incluido: true, detalle: "SÍ incluye traslado redondo, pero SOLO desde un hospedaje dentro de Xilitla — el camino a la finca se hace en RZR. A diferencia del resto de los tours, NO se recoge en Ciudad Valles." },
};

/** Qué comida se incluye. NINGÚN tour es "todo incluido". */
const ALIMENTOS: Record<string, { desayuno: boolean; comida: boolean; detalle: string }> = {
  "rzr-xilitla": { desayuno: false, comida: false, detalle: "NO incluye ningún alimento." },
  "rappel-tamul": { desayuno: false, comida: false, detalle: "NO incluye ningún alimento." },
  "buceo-media-luna": { desayuno: false, comida: false, detalle: "NO incluye ningún alimento. En la laguna hay puestos y restaurantes donde comprar." },
  "rafting-rio-tampaon": { desayuno: true, comida: false, detalle: "Incluye SOLO el desayuno buffet. NO es en el hotel: se hace una parada camino a los destinos, en El Taco Loco, con platillos típicos de la región y guisados. La comida de mediodía NO está incluida." },
  "expedicion-tamul": { desayuno: true, comida: false, detalle: "Incluye SOLO el desayuno buffet. NO es en el hotel: se hace una parada camino a los destinos, en El Taco Loco, con platillos típicos de la región y guisados. La comida de mediodía NO está incluida." },
  "ruta-surrealista-edward-james": { desayuno: true, comida: false, detalle: "Incluye SOLO el desayuno buffet. NO es en el hotel: se hace una parada camino a los destinos, en El Taco Loco, con platillos típicos de la región y guisados. La comida de mediodía NO está incluida." },
  "cascadas-del-meco": { desayuno: true, comida: false, detalle: "Incluye SOLO el desayuno buffet. NO es en el hotel: se hace una parada camino a los destinos, en El Taco Loco, con platillos típicos de la región y guisados. La comida de mediodía NO está incluida." },
  "paraiso-escalonado-minas-micos": { desayuno: true, comida: false, detalle: "Incluye SOLO el desayuno buffet. NO es en el hotel: se hace una parada camino a los destinos, en El Taco Loco, con platillos típicos de la región y guisados. La comida de mediodía NO está incluida." },
  "ruta-acuatica-puente-de-dios": { desayuno: true, comida: false, detalle: "Incluye SOLO el desayuno buffet. NO es en el hotel: se hace una parada camino a los destinos, en El Taco Loco, con platillos típicos de la región y guisados. La comida de mediodía NO está incluida." },
  // Medio día: no lleva desayuno. Sí incluye la cata de café de la finca, que
  // no es un alimento del paquete sino parte del recorrido.
  "travesia-del-cafe": { desayuno: false, comida: false, detalle: "NO incluye desayuno ni comida. Sí incluye la cata de café recién tostado como parte del recorrido." },
};

/** Qué material visual se entrega. Nunca se describe como "profesional". */
const FOTOS: Record<string, string> = {
  "rappel-tamul": "Fotos y video del descenso que toma el guía, incluyendo tomas aéreas con dron. Se entregan sin costo extra. NO las describas como 'profesionales'.",
};
const FOTOS_DEFAULT =
  "Fotos y video del recorrido que va tomando tu guía durante el día, sin costo extra. NO las describas como 'profesionales' ni prometas un fotógrafo dedicado, sesión, edición ni entrega en un plazo determinado.";

const IDEAL_PARA: Record<string, string[]> = {
  "rzr-xilitla": ["amigos", "familias", "primerizos", "aventura off-road"],
  "rappel-tamul": ["aventura extrema", "adrenalina", "amigos"],
  "rafting-rio-tampaon": ["aventura", "amigos", "grupos", "adrenalina moderada"],
  "expedicion-tamul": ["el más completo", "parejas", "primera vez", "naturaleza"],
  "ruta-surrealista-edward-james": ["arte y cultura", "parejas", "fotografía", "ritmo tranquilo"],
  "cascadas-del-meco": ["fotografía", "cascadas turquesas", "parejas", "familias"],
  "paraiso-escalonado-minas-micos": ["familias con niños", "relax", "cascadas turquesas", "ritmo tranquilo"],
  "ruta-acuatica-puente-de-dios": ["aventura", "amigos", "nadar", "cascadas"],
  "buceo-media-luna": ["primera vez buceando", "mayores de 10 años", "aventura acuática"],
  "travesia-del-cafe": ["familias", "medio día", "el más económico", "cultura y sabor", "ritmo tranquilo"],
};

// Lo que se incluye SIEMPRE en todos los tours (decisión del dueño, ago-2026).
const INCLUYE_SIEMPRE = [
  "Seguro de viaje para todos los integrantes",
  "Fotografías y video del recorrido que toma tu guía",
];

// Páginas de las habitaciones del Hotel Paraíso Encantado (para compartir con el cliente).
const HOTEL_HABITACIONES_URL = "https://www.paraisoencantado.com/habitaciones";
const HAB_URL: Record<string, string> = {
  "orquideas-2": "https://www.paraisoencantado.com/habitaciones/orquideas-2",
  "bromelias-1": "https://www.paraisoencantado.com/habitaciones/bromelias",
  "lirios-2": "https://www.paraisoencantado.com/habitaciones/lirios-2",
  "jungla": "https://www.paraisoencantado.com/habitaciones/jungla",
};
// Nombre EXACTO de la habitación en el sistema del hotel (para /api/check-availability).
const HAB_HOTEL_NOMBRE: Record<string, string> = {
  "orquideas-2": "Orquídeas 2",
  "bromelias-1": "Bromelias",
  "lirios-2": "Lirios 2",
  "jungla": "Jungla",
};

/** Formatea una hora decimal (8.5 → "8:30 AM"). */
function fmtHora(dec: number): string {
  let h = Math.floor(dec);
  const m = Math.round((dec - h) * 60);
  const ampm = h >= 12 ? "PM" : "AM";
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

/** Horario aproximado de inicio y fin del recorrido (salida estándar 8:30 AM). */
function horarioTour(t: (typeof TOURS_DB)[number]): string {
  if (t.precioUnidad === "vehiculo") {
    return "Inicia por la mañana (aprox. 8:30–9:00 AM); la hora de término depende de la ruta: Nanacatli ~2 h, Miradores ~3 h, Nacimiento y Trinidad ~5 h.";
  }
  if (t.duracionRango) {
    const [a, b] = t.duracionRango;
    return `Inicia aprox. 8:30 AM y dura entre ${a} y ${b} horas (día completo). Los horarios exactos se confirman al reservar.`;
  }
  const inicio = 8.5; // 8:30 AM
  const fin = inicio + t.duracion_hrs;
  return `Inicia aprox. 8:30 AM y termina aprox. ${fmtHora(fin)} (~${t.duracion_hrs} h). Los horarios exactos se confirman al reservar.`;
}

/** Punto de encuentro derivado de los destinos/incluye de cada tour. */
function puntoEncuentro(t: (typeof TOURS_DB)[number]): string {
  const marcado = t.destinos.find((d) => /\(punto de encuentro\)/i.test(d));
  if (marcado) return marcado.replace(/\s*\(punto de encuentro\)/i, "").trim();
  const incl = t.incluye.join(" · ");
  if (/(transporte|traslado)[^.]*desde tu (hotel|hospedaje)/i.test(incl)) {
    return "Pasamos por ti a tu hospedaje en Xilitla o Ciudad Valles (traslado redondo incluido; no necesitas hospedarte con nosotros)";
  }
  return t.destinos[0] || "Se coordina por WhatsApp";
}

// ── Tours ────────────────────────────────────────────────────────────────────
const empresa = {
  nombre: "Tours Huasteca Potosina",
  sitio: "https://www.huasteca-potosina.com",
  zona: "Huasteca Potosina, San Luis Potosí, México (Xilitla, Aquismón, Ciudad Valles, Tamasopo, El Naranjo, Rioverde)",
  salida: "8:00–9:00 AM. No hay un punto de salida único: pasamos por el cliente a SU hospedaje (hotel, hostal, cabaña o Airbnb) en Xilitla o en Ciudad Valles, con traslado redondo incluido. NO hace falta que se hospede en nuestro hotel. Excepciones: el RZR sale de nuestra base en Xilitla (el transporte hasta Xilitla no se incluye) y el buceo en Media Luna se encuentra en la laguna, en Rioverde.",
  cancelacion: "Cancela gratis hasta 48 h antes.",
  ninos: "Niños 6–10 años: 70 % del precio adulto. Menores de 6: 50 %. (No aplica a tours por vehículo ni al buceo, que es solo para mayores de 10.)",
};

const tours = TOURS_DB.map((t) => ({
  id: t.id,
  slug: t.slug,
  nombre: t.nombre,
  tipo: t.tipo,
  dificultad: t.dificultad,
  duracionHrs: t.duracion_hrs,
  duracionTexto: tourDurTexto(t, " h"),
  precio: t.precio,
  precioUnidad: t.precioUnidad || "persona",
  groupMin: t.groupMin,
  groupMax: t.groupMax,
  soloAdultos: Boolean(t.soloAdultos),
  privateAvailable: Boolean(t.privateAvailable),
  privateMinPrice: t.privateMinPrice ?? null,
  tagline: t.tagline,
  pitch: t.descripcion,
  url: `${empresa.sitio}/tours/${t.slug}`,
  destinos: t.destinos,
  incluye: t.incluye,
  noIncluye: NO_INCLUYE[t.slug] || [],
  puntoEncuentro: puntoEncuentro(t),
  horario: horarioTour(t),
  // Hechos cerrados: el bot los repite tal cual, no los deduce.
  transporte: TRANSPORTE[t.slug] || { incluido: false, detalle: "Confírmalo con el equipo." },
  alimentos: ALIMENTOS[t.slug] || { desayuno: false, comida: false, detalle: "Confírmalo con el equipo." },
  fotos: FOTOS[t.slug] || FOTOS_DEFAULT,
  incluyeSiempre: INCLUYE_SIEMPRE,
  idealPara: IDEAL_PARA[t.slug] || [],
  urgencia: t.urgencia || null,
  // Solo para tours cobrados por vehículo (RZR): rutas + flota con matriz de precios.
  rutas: t.rutas
    ? t.rutas.map((r) => ({
        nombre: r.nombre,
        duracionHrs: r.duracion_hrs,
        desde: r.desde,
        descripcion: r.descripcion,
        destinos: r.destinos || [],
        incluye: r.incluye || [],
      }))
    : null,
  flota: t.flota
    ? t.flota.map((v) => ({
        nombre: v.nombre,
        capacidad: v.capacidad,
        descripcion: v.descripcion,
        // precios[i] corresponde a rutas[i]
        precios: v.precios,
      }))
    : null,
}));

// ── Paquetes ─────────────────────────────────────────────────────────────────
const paquetes = PAQUETES_DB.map((p) => ({
  id: p.id,
  slug: p.slug,
  nombre: p.nombre,
  subtitulo: p.subtitulo,
  duracion: p.duracion,
  dias: p.dias,
  noches: p.noches,
  precio: p.precio,
  precioLabel: p.precioLabel,
  badge: p.badge || null,
  perfiles: p.perfiles,
  tours: p.tours,
  itinerario: p.itinerario.map((d) => ({
    dia: d.dia,
    tipo: d.tipo,
    titulo: d.titulo,
    tourSlug: d.tourSlug || null,
    descripcion: d.descripcion,
  })),
  incluye: p.incluye,
  noIncluye: p.noIncluye,
  valor: p.valor,
}));

const habitaciones = HABITACIONES.map((h) => ({
  nombre: h.nombre,
  vista: h.vista,
  suplemento: h.suplemento ?? 0,
  descripcion: h.descripcion,
  url: HAB_URL[h.id] || HOTEL_HABITACIONES_URL,
  hotelNombre: HAB_HOTEL_NOMBRE[h.id] || h.nombre,
}));

// ── Destinos (41) ────────────────────────────────────────────────────────────
const destinos = DESTINOS_DB.map((d) => ({
  slug: d.slug,
  nombre: d.nombre,
  zona: d.zona,
  tipo: d.tipo,
  descripcion: d.descripcion,
  precioEntrada: d.precio_entrada,
  dificultad: d.dificultad,
  duracionHrs: d.duracion_hrs,
  horario: d.horario,
  diasAbierto: d.dias_abierto,
  mejorHora: d.mejor_hora,
  temporadaIdeal: d.temporada_ideal,
  comoLlegar: d.como_llegar,
  queLlevar: d.que_llevar,
  advertencias: d.advertencias,
  datosCuriosos: d.datos_curiosos,
  erroresComunes: d.errores_comunes,
  idealPara: d.ideal_para,
}));

// destino slug → tours nuestros que DE VERDAD lo visitan.
// Los marcados "cerca" van aparte: son de la misma zona pero no entran al
// itinerario, y el bot no debe ofrecerlos como si lo incluyeran.
const destinoTour: Record<string, { nombre: string; slug: string }[]> = {};
const destinoTourCerca: Record<string, { nombre: string; slug: string }[]> = {};
for (const [slug, arr] of Object.entries(DESTINO_EN_TOURS)) {
  const incluyen = arr.filter((t) => t.relacion !== "cerca").map(({ nombre, slug: s }) => ({ nombre, slug: s }));
  const cercanos = arr.filter((t) => t.relacion === "cerca").map(({ nombre, slug: s }) => ({ nombre, slug: s }));
  if (incluyen.length) destinoTour[slug] = incluyen;
  if (cercanos.length) destinoTourCerca[slug] = cercanos;
}

// ── Info general del negocio ─────────────────────────────────────────────────
const zonas = Array.from(new Set(destinos.map((d) => d.zona))).sort();

const info = {
  empresa: empresa.nombre,
  sitio: empresa.sitio,
  zonas,
  incluyeSiempre: INCLUYE_SIEMPRE,
  fotos: FOTOS_DEFAULT,
  alimentos:
    "NINGÚN tour es 'todo incluido'. La regla es: los tours de día completo incluyen SOLO el desayuno buffet; la comida de mediodía NUNCA está incluida en ningún tour. El RZR, el rappel y el buceo no incluyen ningún alimento. Los paquetes incluyen SOLO los desayunos del hotel: comidas y cenas van por cuenta del cliente.",
  transporte:
    "El traslado redondo desde el hospedaje (Xilitla o Ciudad Valles) SÍ está incluido en: rafting, expedición Tamul, ruta surrealista, cascadas del Meco, paraíso escalonado y ruta acuática. NO está incluido en: RZR (sale de la base en Xilitla), rappel en Tamul (punto de encuentro en el embarcadero; se coordina aparte con costo adicional) ni buceo en Media Luna (el cliente llega a Rioverde). Nunca digas 'todos los tours incluyen transporte'.",
  hotelHabitacionesUrl: HOTEL_HABITACIONES_URL,
  mejorTemporada:
    "La temporada seca (noviembre a abril) suele tener el agua más turquesa y los caminos en mejores condiciones. En lluvias (jul–sep) algunos ríos crecen y ciertas salidas (rafting) dependen del nivel del agua.",
  salida: empresa.salida,
  ninos: empresa.ninos,
  cancelacion: empresa.cancelacion,
  pagoTours:
    "Los tours cobrados por persona se pagan con tarjeta en línea (confirmación instantánea) o por transferencia (cotización con folio). El RZR (por vehículo) y los paquetes se confirman por WhatsApp con el equipo.",
  pagoEntradas:
    "Si visitas los destinos por tu cuenta, la entrada suele ser SOLO EFECTIVO y muchos sitios no tienen cajero cerca.",
  paquetes:
    "Los paquetes combinan tours + hospedaje en el Hotel Paraíso Encantado (Xilitla) y se confirman por WhatsApp según disponibilidad del hotel (sin pago automático). El precio es por pareja (2 personas).",
};

// ── Escribir ─────────────────────────────────────────────────────────────────
const out = {
  generatedAt: new Date().toISOString(),
  _nota: "Generado por src/scripts/export-bot-data.ts — NO editar a mano. Cambia la fuente (src/lib/*) y vuelve a correr el script.",
  empresa,
  tours,
  paquetes,
  habitaciones,
  logistica: LOGISTICA,
  faqsPaquetes: FAQS_PAQUETES,
  destinos,
  destinoTour,
  destinoTourCerca,
  info,
};

const dest = join(process.cwd(), "whatsapp-bot", "data.json");
writeFileSync(dest, JSON.stringify(out, null, 2) + "\n", "utf8");

console.log(
  `✅ data.json generado: ${tours.length} tours, ${paquetes.length} paquetes, ${destinos.length} destinos → ${dest}`
);
