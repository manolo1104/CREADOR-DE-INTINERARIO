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
import { TOURS_DB, TOURS_LISTA, tourDurTexto, PRIVADO_EXTRA_POR_PERSONA, recogidaDeTour, ventanaSalida, regresoDeTour, fraseRecogida, fmtHora12, PROMO_TEMPORADA, PROMO_VENCE, promoVigente } from "../lib/tours";
import { excepcionesSalida } from "../lib/recogidaTexto";
import { INCLUYE_SIEMPRE, incluyePropioDeTour } from "../lib/tours";
import { PAQUETES_DB, HABITACIONES, habitacionesDePaquete, LOGISTICA, precioPaqueteDeFecha, getPaquete, NOCHES_XANTOLO, eventoALaVenta, type Paquete } from "../lib/paquetes";
import { NOCHE_XANTOLO, precioNinoNoche } from "../lib/nocheXantolo";
import { TOUR_FAQS } from "../lib/tourFaqs";
import { getToursFaqs } from "../lib/faqTours";
import { queLlevarDe } from "../lib/tourRequisitos";
import { ANTICIPO_PCT } from "../lib/carrito";
import { CONFIRMA_SALIDA_DIAS } from "../lib/tourBooking";
import { POLITICAS_BOT } from "../lib/bot/politicas";
// 🔴 `FAQS_PAQUETES_ES`, no el `FAQS_PAQUETES` pelado del catálogo: la respuesta
// de «¿el precio es por persona o por pareja?» sigue diciendo allí «son por
// pareja (2 personas)». Camila lee estas FAQ tal cual, así que con la del
// catálogo se contradecía a sí misma dentro del mismo cerebro: la ficha del
// paquete le dice «$6,250 por persona» y la FAQ «los precios son por pareja».
// Es el mismo texto que sirve la web en español (`getLocalizedFaqs("es")`).
import { FAQS_PAQUETES_ES } from "../lib/i18n/paquetes.en";
import { TRASLADOS } from "../lib/traslados";
import { DESTINOS_DB } from "../lib/destinos";
import { DESTINO_EN_TOURS } from "../lib/tourMapping";
import { GOOGLE_RATING, GOOGLE_RESENAS } from "../lib/resenas";
import { TOUR_REQUISITOS } from "../lib/tourRequisitos";
import { fechaInicioTexto } from "../lib/temporada";

// ── Capa curada (lo que la fuente del sitio no expresa en datos) ─────────────
// Se mantiene aquí, cerca de la generación, y es lo único que se edita a mano.

const NO_INCLUYE: Record<string, string[]> = {
  "rzr-xilitla": ["Transporte hasta Xilitla", "Alimentos"],
  // 6 oct 2026, Manolo: el rappel SÍ incluye el traslado desde Ciudad Valles
  // (como dicen su "incluye" y su ficha); lo que no va es llegar hasta Valles.
  "rappel-tamul": ["Cómo llegar hasta Ciudad Valles: de ahí sale la unidad", "Alimentos (no lleva desayuno ni comida)", "Propinas y gastos personales"],
  // 6 oct 2026, Manolo: el rafting SÍ incluye comida. Lo que no lleva es el
  // desayuno buffet de los otros tours (`tourRequisitos.ts`).
  "rafting-rio-tampaon": ["Desayuno: lo que va incluido es una comida, que el cliente elige antes o después del descenso", "Bebidas alcohólicas", "Propinas y gastos personales"],
  "expedicion-tamul": ["Comida de mediodía", "Propinas y gastos personales"],
  "ruta-surrealista-edward-james": ["Comida de mediodía", "Propinas y gastos personales"],
  "cascadas-del-meco": ["Comida de mediodía", "Propinas y gastos personales"],
  "paraiso-escalonado-minas-micos": ["Comida de mediodía", "Propinas y gastos personales"],
  "ruta-acuatica-puente-de-dios": ["Comida de mediodía", "Propinas y gastos personales"],
  "buceo-media-luna": ["Transporte hasta la Laguna de la Media Luna (Rioverde)", "Entrada al parque (se paga allá)", "Alimentos — no se incluye ninguna comida, pero en la laguna hay puestos y restaurantes donde comprar", "Traje de baño y toalla"],
  "eden-en-el-jardin": ["Alimentos y bebidas: empieza muy temprano y no lleva desayuno", "Cómo llegar a Xilitla (el traslado DENTRO de Xilitla sí va incluido)", "Propinas y gastos personales", "Peticiones especiales fuera del recorrido, que el jardín cotiza aparte"],
  "gruta-de-xilo": ["Alimentos y bebidas: es un recorrido de noche y no lleva cena", "Cómo llegar a Xilitla (el traslado DENTRO de Xilitla sí va incluido)", "Ropa de cambio y calzado que se pueda mojar", "Propinas y gastos personales"],
  "amanecer-de-nubes": ["Alimentos: se sale de madrugada y no lleva desayuno", "Cómo llegar a Xilitla (el traslado DENTRO de Xilitla sí va incluido)", "Chamarra y calzado de montaña — arriba hace frío de verdad", "Propinas y gastos personales"],
  "olla-de-la-luz": ["Alimentos: conviene llevar agua y algo de comer para la caminata", "Cómo llegar a Xilitla (el traslado DENTRO de Xilitla sí va incluido)", "Calzado de senderismo y chamarra o impermeable", "Propinas y gastos personales"],
  "huasteca-instagrameable": ["Comida de mediodía: hay parada para comer y se paga en el lugar", "Fotógrafo aparte del guía: las fotos las toma el guía", "Dron y tripié: en Las Pozas están prohibidos", "Propinas y gastos personales"],
};

// ── Hechos que el bot NO debe deducir ni suponer ─────────────────────────────
// Antes el bot leía "incluye"/"noIncluye" y sacaba conclusiones propias: llegó a
// prometer recogida en el hotel para el rappel (no la hay) y comida para la Ruta
// Acuática (tampoco). Ahora cada tour trae la respuesta ya escrita y literal.

/** ¿Pasamos por el cliente a su hospedaje? Respuesta cerrada por tour. */
const TRANSPORTE: Record<string, { incluido: boolean; detalle: string }> = {
  "rzr-xilitla": { incluido: false, detalle: "NO incluye transporte. El recorrido sale de nuestra base en Xilitla y el cliente llega por su cuenta hasta allá." },
  // 6 oct 2026, Manolo: SÍ incluye el traslado desde Ciudad Valles. Antes el
  // bot lo daba como SIN transporte mientras la ficha, su "incluye" y su
  // pregunta frecuente decían lo contrario.
  "rappel-tamul": { incluido: true, detalle: "SÍ incluye el traslado desde Ciudad Valles: pasamos por el cliente a su hospedaje en Ciudad Valles y vamos al embarcadero del Río Tampaón. Si se hospeda en otra zona (por ejemplo Xilitla), la recogida ahí NO está confirmada: dile que el punto de encuentro lo confirma el equipo." },
  "buceo-media-luna": { incluido: false, detalle: "NO incluye transporte. La actividad es en la Laguna de la Media Luna (Rioverde) y el cliente llega por su cuenta." },
  // Sin hora aquí: tiene horarios FIJOS que pone el jardín (campo `horario`),
  // y "empieza entre 7 y 8 AM" contradecía al de las 5 PM.
  "eden-en-el-jardin": { incluido: true, detalle: "SÍ incluye traslado redondo, pero SOLO desde el hospedaje EN XILITLA. Desde Ciudad Valles NO va incluido: se cotiza aparte. Nunca prometas recogida incluida en Ciudad Valles para esta experiencia." },
  "rafting-rio-tampaon": { incluido: true, detalle: "SÍ incluye traslado redondo: pasamos por el cliente a su hospedaje en Ciudad Valles o Xilitla." },
  "expedicion-tamul": { incluido: true, detalle: "SÍ incluye traslado redondo: pasamos por el cliente a su hospedaje en Xilitla o Ciudad Valles." },
  "ruta-surrealista-edward-james": { incluido: true, detalle: "SÍ incluye traslado redondo: pasamos por el cliente a su hospedaje en Xilitla o Ciudad Valles." },
  "cascadas-del-meco": { incluido: true, detalle: "SÍ incluye traslado redondo: pasamos por el cliente a su hospedaje en Xilitla o Ciudad Valles." },
  "paraiso-escalonado-minas-micos": { incluido: true, detalle: "SÍ incluye traslado redondo: pasamos por el cliente a su hospedaje en Xilitla o Ciudad Valles." },
  "ruta-acuatica-puente-de-dios": { incluido: true, detalle: "SÍ incluye traslado redondo: pasamos por el cliente a su hospedaje en Xilitla o Ciudad Valles." },
  // Único tour con traslado incluido pero SOLO dentro de Xilitla: el camino a
  // la finca se hace en RZR y no se sale a Ciudad Valles.
  "travesia-del-cafe": { incluido: true, detalle: "SÍ incluye traslado redondo, pero SOLO desde un hospedaje dentro de Xilitla — el camino a la finca se hace en RZR. Desde Ciudad Valles NO va incluido, pero SÍ podemos ir por el cliente con un COSTO EXTRA de traslado que se cotiza aparte; la otra opción es que suba a Xilitla por su cuenta." },
  "gruta-de-xilo": { incluido: true, detalle: "SÍ incluye traslado redondo, pero SOLO desde un hospedaje dentro de Xilitla, y la recogida se hace EN EL RZR. Es un recorrido NOCTURNO. Desde Ciudad Valles NO va incluido, pero SÍ podemos ir por el cliente con un COSTO EXTRA de traslado que se cotiza aparte; la otra opción es que suba a Xilitla por su cuenta." },
  "amanecer-de-nubes": { incluido: true, detalle: "SÍ incluye traslado redondo, pero SOLO desde un hospedaje dentro de Xilitla. Se sale DE MADRUGADA para llegar a la cima antes del amanecer. Desde Ciudad Valles NO va incluido, pero SÍ podemos ir por el cliente con un COSTO EXTRA de traslado que se cotiza aparte; la otra opción es que suba a Xilitla por su cuenta." },
  "olla-de-la-luz": { incluido: true, detalle: "SÍ incluye traslado redondo, pero SOLO desde un hospedaje dentro de Xilitla. Desde Ciudad Valles NO va incluido, pero SÍ podemos ir por el cliente con un COSTO EXTRA de traslado que se cotiza aparte; la otra opción es que suba a Xilitla por su cuenta." },
  "huasteca-instagrameable": { incluido: true, detalle: "SÍ incluye traslado redondo: pasamos por el cliente a su hospedaje en Xilitla o Ciudad Valles. OJO con la hora: el Día 1 sale a las 6:00 AM y los Días 2 y 3 a las 8:00 AM." },
};

/** Qué comida se incluye. NINGÚN tour es "todo incluido". */
const ALIMENTOS: Record<string, { desayuno: boolean; comida: boolean; detalle: string }> = {
  "rzr-xilitla": { desayuno: false, comida: false, detalle: "NO incluye ningún alimento." },
  "rappel-tamul": { desayuno: false, comida: false, detalle: "NO incluye ningún alimento." },
  "buceo-media-luna": { desayuno: false, comida: false, detalle: "NO incluye ningún alimento. En la laguna hay puestos y restaurantes donde comprar." },
  // 6 oct 2026, Manolo: el rafting incluye COMIDA. Decía "solo desayuno" y
  // contradecía al "incluye" del mismo tour ("Comida incluida — la eliges antes
  // o después de la actividad") y a su pregunta frecuente.
  "rafting-rio-tampaon": { desayuno: false, comida: true, detalle: "SÍ incluye UNA comida, que el cliente elige tomar antes o después del descenso. NO lleva el desayuno buffet de El Taco Loco de los otros tours." },
  "expedicion-tamul": { desayuno: true, comida: false, detalle: "Incluye SOLO el desayuno buffet. NO es en el hotel: se hace una parada camino a los destinos, en El Taco Loco, con platillos típicos de la región y guisados. La comida de mediodía NO está incluida." },
  "ruta-surrealista-edward-james": { desayuno: true, comida: false, detalle: "Incluye SOLO el desayuno buffet. NO es en el hotel: se hace una parada camino a los destinos, en El Taco Loco, con platillos típicos de la región y guisados. La comida de mediodía NO está incluida." },
  "cascadas-del-meco": { desayuno: true, comida: false, detalle: "Incluye SOLO el desayuno buffet. NO es en el hotel: se hace una parada camino a los destinos, en El Taco Loco, con platillos típicos de la región y guisados. La comida de mediodía NO está incluida." },
  "paraiso-escalonado-minas-micos": { desayuno: true, comida: false, detalle: "Incluye SOLO el desayuno buffet. NO es en el hotel: se hace una parada camino a los destinos, en El Taco Loco, con platillos típicos de la región y guisados. La comida de mediodía NO está incluida." },
  "ruta-acuatica-puente-de-dios": { desayuno: true, comida: false, detalle: "Incluye SOLO el desayuno buffet. NO es en el hotel: se hace una parada camino a los destinos, en El Taco Loco, con platillos típicos de la región y guisados. La comida de mediodía NO está incluida." },
  // Medio día: no lleva desayuno. Sí incluye la cata de café de la finca, que
  // no es un alimento del paquete sino parte del recorrido.
  "travesia-del-cafe": { desayuno: false, comida: false, detalle: "NO incluye desayuno ni comida. Sí incluye la cata de café recién tostado como parte del recorrido." },
  "gruta-de-xilo": { desayuno: false, comida: false, detalle: "NO incluye ningún alimento. Es un recorrido de noche de unas 3 horas." },
  "amanecer-de-nubes": { desayuno: false, comida: false, detalle: "NO incluye ningún alimento. Se sale de madrugada: conviene que el cliente lleve algo para desayunar en la cima." },
  "olla-de-la-luz": { desayuno: false, comida: false, detalle: "NO incluye ningún alimento. Conviene que el cliente lleve agua y algo de comer para la caminata." },
  "huasteca-instagrameable": { desayuno: false, comida: false, detalle: "NO incluye alimentos. Hay una parada para comer durante el día y el cliente paga en el lugar." },
};

/** Qué material visual se entrega. Nunca se describe como "profesional". */
const FOTOS: Record<string, string> = {
  // 🔴 El ÚNICO recorrido con promesa de entrega. El número y el plazo tienen
  // que ser los mismos que en `tours.ts` (incluye), en `tourFaqs.ts` y en
  // `lib/bot/politicas.ts` (tema "fotos").
  "huasteca-instagrameable": "Es el recorrido de fotografía: SÍ se promete entrega. De 25 a 30 fotografías EDITADAS, en una carpeta privada, dentro de 3 días. Las toma el guía con una cámara Fujifilm X-T30 II. NO va un fotógrafo aparte del guía y NO hay dron: en Las Pozas están prohibidos el dron y el tripié. El grupo es de máximo 6 personas, y eso es parte de lo que hace posible la entrega.",
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
  "gruta-de-xilo": ["aventura", "cuevas", "recorrido de noche", "parejas", "el más económico"],
  "amanecer-de-nubes": ["senderismo", "amanecer", "montaña", "fotografía", "buena condición física"],
  "olla-de-la-luz": ["senderismo", "bosque de niebla", "sótanos", "naturaleza", "fotografía"],
  "huasteca-instagrameable": ["fotografía", "creadores de contenido", "parejas", "grupo chico", "reels y redes"],
};

// Fuente única en tours.ts — antes había una copia aquí y el endpoint del
// paquete, que lee TOURS_DB, no la veía.

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

/**
 * Horario de inicio y fin del recorrido.
 *
 * 🔴 Antes asumía salida a las 8:30 DE LA MAÑANA para todos. Con la Gruta de
 * Xilo, que es un recorrido NOCTURNO de 3 h, el bot le decía al cliente que
 * "inicia aprox. 8:30 AM y termina aprox. 11:30 AM". Ahora la hora sale del
 * campo `recogida` del catálogo, el mismo que pinta la ficha, y `fmtHora12`
 * también vive en `tours.ts`: el sitio y el bot ya no pueden decir horas
 * distintas.
 */
function horarioTour(t: (typeof TOURS_DB)[number]): string {
  // El Edén no sale como los demás: son horarios fijos que pone el jardín, y de
  // ellos depende que el cliente alcance la hora de acceso previo.
  if (t.id === "tour-eden-jardin") {
    return "Horarios FIJOS que pone el jardín: 8:00 AM lunes, miércoles, jueves y viernes; 7:00 AM sábado y domingo; y 5:00 PM de miércoles a lunes. Dura ~3 h. La hora exacta se confirma al apartar la fecha.";
  }
  // "Entre 8:00 y 9:00 AM" → "entre 8:00 y 9:00 AM", para que encaje detrás de
  // "Sale". Quitar el "Entre" entero dejaba "Sale 8:00 y 9:00 AM".
  const v = ventanaSalida(t, false);
  let salida = v.charAt(0).toLowerCase() + v.slice(1);
  if (t.precioUnidad === "vehiculo") {
    // La hora, del catálogo como la de los demás. Desde el 6 oct la ELIGE el
    // cliente dentro de la ventana (`horaInicio` + `ventanaHrs` del RZR), así
    // que el término se dice por ruta y no como una hora del reloj.
    const rutas = (t.rutas ?? []).map((r) => `${r.nombre.replace(/^Ruta /, "")} ~${r.duracion_hrs} h`).join(", ");
    return `Inicia ${horaAElegir(t)}, en nuestra base de Xilitla; dura según la ruta: ${rutas}.`;
  }
  // En sitio (el buceo) no hay hora pública de salida: el catálogo no la trae,
  // y "sale entre 8 y 9" salía del valor por defecto, no de un dato. Lo mismo
  // con un tour que el bot da como SIN traslado sin que el catálogo lo marque
  // (el rappel): esa ventana es la de RECOGIDA, y el itinerario pone la
  // llegada al embarcadero a las 10 AM.
  if (recogidaDeTour(t).tipo === "en-sitio" || sinTrasladoNoMarcado(t)) {
    return `Dura ~${t.duracion_hrs} h. La hora de encuentro se confirma al reservar.`;
  }
  const regreso = regresoDeTour(t, false);
  // El rappel recoge solo en Ciudad Valles: la hora es la de allá.
  const ciudad = ciudadUnica(t);
  if (ciudad) salida = `${salida} (desde ${ciudad})`;
  if (t.duracionRango) {
    // "2.5 horas" leído en voz alta suena a error. Camila dice "2 horas y media".
    const enHoras = (h: number) =>
      Number.isInteger(h) ? `${h}` : `${Math.floor(h)} horas y media`;
    const [a, b] = t.duracionRango;
    const rango = Number.isInteger(a)
      ? `entre ${a} y ${b} horas`
      : `entre ${enHoras(a)} y ${b} horas`;
    return `Sale ${salida} y dura ${rango}; regresa aprox. ${regreso}. Los horarios exactos se confirman al reservar.`;
  }
  return `Sale ${salida} y termina aprox. ${regreso} (~${t.duracion_hrs} h). Los horarios exactos se confirman al reservar.`;
}

/**
 * Punto de encuentro.
 *
 * 🔴 Antes lo adivinaba con una expresión regular sobre el texto de "incluye",
 * y si no encontraba nada devolvía el PRIMER DESTINO del tour. Con la Gruta de
 * Xilo eso le hacía contestar "Selva de Xilitla (caminata de acceso)" como si
 * fuera un punto de encuentro. Peor: a los tours que solo recogen en Xilitla
 * les contestaba "Xilitla o Ciudad Valles", contradiciendo al campo
 * `transporte` del MISMO objeto. Ahora sale del catálogo.
 */
function puntoEncuentro(t: (typeof TOURS_DB)[number]): string {
  const marcado = t.destinos.find((d) => /\(punto de encuentro\)/i.test(d));
  if (marcado) return marcado.replace(/\s*\(punto de encuentro\)/i, "").trim();
  const rec = recogidaDeTour(t);
  // El rappel cae al "hospedaje" por defecto del catálogo, pero la respuesta
  // cerrada del bot es que NO hay traslado: el mismo objeto decía las dos.
  if (sinTrasladoNoMarcado(t)) return TRANSPORTE[t.slug].detalle;
  const ciudad = ciudadUnica(t);
  if (ciudad) {
    return `Pasamos por ti a tu hospedaje en ${ciudad} (traslado incluido). Si te hospedas en otra zona, el punto de encuentro te lo confirma el equipo.${entregaAlRecoger(t)}`;
  }
  if (rec.tipo === "hospedaje") {
    return `Pasamos por ti a tu hospedaje en Xilitla o Ciudad Valles (traslado redondo incluido; no necesitas hospedarte con nosotros).${entregaAlRecoger(t)}`;
  }
  if (rec.tipo === "hospedaje-xilitla") {
    const veh = rec.vehiculo ? `, en el propio ${rec.vehiculo.es}` : "";
    return `Pasamos por ti a tu hospedaje EN XILITLA${veh} (traslado redondo incluido). Desde Ciudad Valles NO va incluido, pero SÍ podemos ir por el cliente con un COSTO EXTRA de traslado que se cotiza aparte; la otra opción es que suba a Xilitla por su cuenta.${entregaAlRecoger(t)}`;
  }
  if (rec.tipo === "base-xilitla") {
    return "Nuestra base en Xilitla: el cliente llega por su cuenta hasta allá. NO incluye transporte hasta Xilitla.";
  }
  return t.destinos[0] || "Se coordina por WhatsApp";
}

/**
 * Lo que se le entrega al cliente en cuanto pasamos por él, si el itinerario
 * lo dice en su momento de "Recogida".
 *
 * La Gruta de Xilo: casco y lámpara frontal se dan en el propio RZR, al
 * recogerlo (decisión de Manolo, 28 sep) — no en la boca de la cueva. Se lee
 * del itinerario y no se escribe aquí para que no pueda contradecir la ficha.
 */
function entregaAlRecoger(t: (typeof TOURS_DB)[number]): string {
  const m = (t.itinerario ?? []).find((x) => /recogida/i.test(x.momento));
  if (!m) return "";
  const cosas = [
    /casco/i.test(m.texto) ? "el casco" : "",
    /l[áa]mpara/i.test(m.texto) ? "la lámpara frontal" : "",
  ].filter(Boolean);
  return cosas.length
    ? ` Al recogerlo le entregamos ${cosas.join(" y ")}: desde el inicio, no al llegar.`
    : "";
}

/**
 * ¿El bot lo da como SIN traslado (`TRANSPORTE`) aunque el catálogo no declare
 * `recogida` y caiga al "pasamos por ti en Xilitla o Valles" por defecto?
 *
 * Era el rappel hasta el 6 oct 2026, cuando Manolo decidió que SÍ incluye el
 * traslado desde Ciudad Valles (ver `ciudadUnica`). Hoy no aplica a ningún
 * tour; se queda como guarda: si un tour vuelve a quedar sin traslado en
 * `TRANSPORTE` sin que el catálogo lo marque, la respuesta cerrada manda en
 * TODOS los campos (salida, horario, punto de encuentro), porque el bot no
 * puede recibir las dos versiones en la misma ficha.
 */
function sinTrasladoNoMarcado(t: (typeof TOURS_DB)[number]): boolean {
  return TRANSPORTE[t.slug]?.incluido === false && recogidaDeTour(t).tipo === "hospedaje";
}

/**
 * La ÚNICA ciudad donde recogemos, cuando el catálogo cae al "Xilitla o Ciudad
 * Valles" por defecto pero el "incluye" del tour nombra solo una (hoy el
 * rappel: "Traslado desde Ciudad Valles"). Es la misma regla que usa la ficha
 * del tour (`ciudadUnicaDeRecogida` en `components/TourDeparture.tsx`, que no
 * se puede importar aquí porque es un componente del servidor de Next).
 */
function ciudadUnica(t: (typeof TOURS_DB)[number]): "Xilitla" | "Ciudad Valles" | null {
  if (recogidaDeTour(t).tipo !== "hospedaje" || TRANSPORTE[t.slug]?.incluido === false) return null;
  const linea = t.incluye.find((i) => /traslado/i.test(i)) ?? "";
  const xilitla = /xilitla/i.test(linea);
  const valles = /ciudad valles/i.test(linea);
  if (xilitla === valles) return null;
  return xilitla ? "Xilitla" : "Ciudad Valles";
}

/**
 * "a la hora que elijas, entre 9:00 AM y 5:00 PM", leído de la ventana del
 * catálogo (RZR, 6 oct 2026). Se arma con `fmtHora12` para que el bot y la
 * ficha no puedan decir horas distintas.
 */
function horaAElegir(t: (typeof TOURS_DB)[number]): string {
  const { horaInicio, ventanaHrs } = recogidaDeTour(t);
  return `a la hora que elijas, entre ${fmtHora12(horaInicio)} y ${fmtHora12(horaInicio + ventanaHrs)}`;
}

/**
 * Edades mínimas de `tourRequisitos.ts`, salvo las de los `soloAdultos` (el
 * buceo ya va en la frase de niños con su regla). El 2 oct 2026 Manolo fijó 8
 * años para rappel, rafting, Gruta, Amanecer y Olla: sin esto el bot seguía
 * vendiendo esos cinco a cualquier edad mientras la ficha ya decía "desde 8".
 */
function edadesMinimasTexto(): string {
  const porEdad = new Map<number, string[]>();
  for (const t of TOURS_DB) {
    const edad = TOUR_REQUISITOS[t.id]?.edadMinima;
    if (!edad || t.soloAdultos) continue;
    porEdad.set(edad, [...(porEdad.get(edad) ?? []), t.nombreCorto]);
  }
  return Array.from(porEdad)
    .map(([edad, nombres]) => `${nombres.join(", ")}: a partir de ${edad} años.`)
    .join(" ");
}

/**
 * La recogida de UN tour, en la frase que ve el cliente en la ficha y en el
 * correo (`fraseRecogida`).
 *
 * 🔴 Para el rappel anteponía "Entre 8:00 y 9:00 AM" —la ventana por defecto
 * de RECOGIDA— al punto de encuentro en el embarcadero, al que el itinerario
 * llega a las 10: quien fuera por su cuenta llegaría dos horas antes.
 */
function salidaDeTour(t: (typeof TOURS_DB)[number]): string {
  if (sinTrasladoNoMarcado(t)) {
    return `${TRANSPORTE[t.slug].detalle} La hora de encuentro se confirma al reservar.`;
  }
  // RZR: la hora la elige el cliente. `fraseRecogida` diría "entre 9:00 AM y
  // 5:00 PM", que se lee como una ventana en la que lo esperamos.
  if (t.precioUnidad === "vehiculo" && recogidaDeTour(t).tipo === "base-xilitla") {
    return `Nos vemos en nuestra base en Xilitla ${horaAElegir(t)}. El transporte hasta Xilitla no está incluido.`;
  }
  // Rappel: solo Ciudad Valles. Sin esto, la frase del catálogo prometía
  // también Xilitla (es lo mismo que corrige la ficha del tour).
  const ciudad = ciudadUnica(t);
  if (ciudad) {
    return `${fraseRecogida(t, false).replace("tu hospedaje en Xilitla o Ciudad Valles", `tu hospedaje en ${ciudad}`)} Si te hospedas en otra zona, el punto de encuentro te lo confirma el equipo.`;
  }
  return fraseRecogida(t, false);
}

/**
 * Quién incluye traslado y desde dónde, armado del catálogo. La lista anterior
 * estaba escrita a mano y no tenía los cinco recorridos que solo recogen en
 * Xilitla.
 */
function transporteResumen(): string {
  const nombre = (t: (typeof TOURS_DB)[number]) => t.nombreCorto;
  const sin = TOURS_DB.filter((t) => TRANSPORTE[t.slug]?.incluido === false);
  const conTraslado = TOURS_DB.filter((t) => !sin.includes(t));
  const soloXilitla = conTraslado.filter((t) => recogidaDeTour(t).tipo === "hospedaje-xilitla");
  const ambas = conTraslado.filter((t) => recogidaDeTour(t).tipo === "hospedaje" && !ciudadUnica(t));
  // El rappel: traslado incluido, pero solo desde Ciudad Valles.
  const unaCiudad = conTraslado.filter((t) => ciudadUnica(t));
  return [
    `Traslado redondo desde el hospedaje en Xilitla o Ciudad Valles incluido en: ${ambas.map(nombre).join(", ")}.`,
    ...unaCiudad.map((t) => `${nombre(t)}: ${TRANSPORTE[t.slug]?.detalle ?? `traslado incluido solo desde ${ciudadUnica(t)}.`}`),
    soloXilitla.length
      ? `Traslado incluido SOLO desde un hospedaje en Xilitla (desde Ciudad Valles tiene costo adicional que se cotiza por WhatsApp): ${soloXilitla.map(nombre).join(", ")}.`
      : "",
    `NO incluyen traslado: ${sin.map((t) => `${nombre(t)} (${TRANSPORTE[t.slug].detalle.replace(/^NO incluye transporte\.\s*/i, "")})`).join("; ")}.`,
    "Nunca digas 'todos los tours incluyen transporte'.",
  ].filter(Boolean).join(" ");
}

// ── Lo nuevo por tour (6 oct 2026) ───────────────────────────────────────────

/**
 * La promo de temporada de ESTE tour, aparte del precio de lista.
 *
 * 🔴 Antes `precio` era el getter de `TOURS_DB` leído EL DÍA DEL EXPORT: con la
 * promo viva, el bot cotizaba el −$100 también para recorridos después del 29
 * de octubre, que la web cobra a precio de lista; y al terminar la promo la
 * seguía dando hasta que alguien re-exportara. Ahora `precio` es el de lista y
 * la promo va con su fecha de vencimiento: aplica si la FECHA DEL TOUR es
 * igual o anterior a `vence` (la misma regla que `precioDeFecha`).
 */
function promoDeTour(t: (typeof TOURS_DB)[number]): { precio: number; vence: string } | null {
  const enPromo = (PROMO_TEMPORADA.tours as ReadonlySet<string>).has(t.slug);
  if (!enPromo || !promoVigente()) return null;
  return { precio: (t.precioLista ?? t.precio) - PROMO_TEMPORADA.monto, vence: PROMO_VENCE };
}

/**
 * Requisitos que el catálogo no tiene y el equipo SIEMPRE pide (chats de jul–sep
 * 2026): licencia y responsiva en el RZR, responsiva en el rafting. Se suman a
 * los de `tourRequisitos.ts`.
 */
const REQUISITOS_EXTRA: Record<string, string[]> = {
  "rzr-xilitla": ["El conductor presenta su licencia de conducir y todos firman una responsiva"],
  "rafting-rio-tampaon": ["Todos firman una responsiva antes de subir a la balsa"],
  "huasteca-instagrameable": ["El Día 1 NO sale los martes: Las Pozas no abre su horario de las 5:00 PM ese día", "El cliente elige UNO de los tres días al reservar; los tres días se cotizan juntos por WhatsApp"],
};

/**
 * Lo que el bot NO puede afirmar del RZR: si se cruzan ríos. Los chats dicen
 * que no (por conservación) y la ficha dice que sí; hasta que Manolo lo
 * confirme, el bot contesta «te lo confirmo» (`politicas.ts`, tema rzr). Se
 * quita SOLO de lo que lee el bot; la ficha de la web sigue igual.
 */
function sinCruceDeRios(texto: string): string {
  return texto
    .replace(/cruza ríos de agua cristalina, /g, "")
    .replace(/, cruzas ríos de agua cristalina y llegas/g, " y llegas");
}

/**
 * Las preguntas frecuentes del tour (`tourFaqs.ts`), salvo la del guía en
 * inglés: la de Tamul promete «guías completamente bilingües disponibles», y
 * en los chats un guía bilingüe prometido no llegó. Para el bot manda la
 * política (`guia-en-ingles`): inglés básico en salida compartida, bilingüe
 * solo a petición y sin garantizar.
 */
const GUIA_INGLES = POLITICAS_BOT.find((p) => p.tema === "guia-en-ingles")?.texto;
function faqsDeTour(t: (typeof TOURS_DB)[number]): { q: string; a: string }[] {
  return (TOUR_FAQS[t.id] ?? []).map((f) =>
    GUIA_INGLES && /habla inglés/i.test(f.q) ? { q: f.q, a: GUIA_INGLES } : { q: f.q, a: f.a },
  );
}

// ── Tours ────────────────────────────────────────────────────────────────────
const empresa = {
  nombre: "Tours Huasteca Potosina",
  // Días antes del tour en que se le confirma (o se le cancela con reembolso)
  // la salida a quien va bajo el mínimo. El bot lo lee de aquí, no lo escribe.
  confirmaSalidaDias: CONFIRMA_SALIDA_DIAS,
  sitio: "https://www.huasteca-potosina.com",
  zona: "Huasteca Potosina, San Luis Potosí, México (Xilitla, Aquismón, Ciudad Valles, Tamasopo, El Naranjo, Rioverde)",
  // La regla y TODAS sus excepciones, armadas del catálogo. 🔴 Estaba escrita a
  // mano con dos excepciones (RZR y buceo) y le decía al bot "8:00–9:00 AM, en
  // Xilitla o Ciudad Valles" también para la Gruta de Xilo (7 PM, solo
  // Xilitla), el Amanecer de Nubes (3 AM), la Olla de la Luz, el Edén y la
  // Travesía del Café. Para UN tour, el bot usa el `salida` de ese tour.
  // `excepcionesSalida` lee el catálogo, que no marca al rappel; aquí se suma
  // la excepción que sí conoce el bot (ver `sinTrasladoNoMarcado`).
  salida: [
    "No hay un punto de salida único ni hace falta hospedarse en nuestro hotel (hotel, hostal, cabaña o Airbnb, da igual).",
    excepcionesSalida("es"),
    ...TOURS_DB.filter(sinTrasladoNoMarcado).map((t) => `${t.nombreCorto}: ${TRANSPORTE[t.slug].detalle} La hora de encuentro se confirma al reservar.`),
    // El catálogo cuenta al rappel entre "la mayoría" (Xilitla o Valles); su
    // traslado es solo desde Ciudad Valles.
    ...TOURS_DB.filter((t) => ciudadUnica(t)).map((t) => `Excepción: ${t.nombreCorto} recoge solo en ${ciudadUnica(t)}; desde otra zona, el punto de encuentro lo confirma el equipo.`),
    // RZR: la hora la elige el cliente (6 oct 2026).
    ...TOURS_DB.filter((t) => t.precioUnidad === "vehiculo").map((t) => `${t.nombreCorto}: el cliente elige la hora de inicio, ${horaAElegir(t).replace(/^a la hora que elijas, /, "")}.`),
  ].join(" "),
  cancelacion: "Cancela gratis hasta 48 h antes.",
  ninos: [
    "Niños 6–10 años: 70 % del precio adulto. Menores de 6: 50 %. (No aplica a tours por vehículo ni al buceo, que es solo para mayores de 10.)",
    edadesMinimasTexto(),
  ].filter(Boolean).join(" "),
  // 🔴 La calificación del NEGOCIO en Google, de `resenas.ts`. El prompt de
  // Camila decía «4.9★ con 492 reseñas» escrito a mano y juraba que eran
  // cifras reales; así no se vuelve a desfasar del sitio.
  rating: GOOGLE_RATING,
  resenas: GOOGLE_RESENAS,
};

const tours = TOURS_DB.map((t) => ({
  id: t.id,
  slug: t.slug,
  nombre: t.nombre,
  tipo: t.tipo,
  dificultad: t.dificultad,
  duracionHrs: t.duracion_hrs,
  duracionTexto: tourDurTexto(t, " h"),
  // El precio de LISTA (sin la promo de temporada), por compatibilidad con el
  // bot desplegado. La promo va aparte, en `promo`, con su vencimiento.
  precio: t.precioLista ?? t.precio,
  precioLista: t.precioLista ?? t.precio,
  promo: promoDeTour(t),
  precioUnidad: t.precioUnidad || "persona",
  // Tarifa del GRUPO COMPLETO por escalones (índice 0 = 1 persona). Sin esto
  // el bot multiplicaría `precio` por el número de personas y cotizaría el
  // triple de lo que cuesta.
  tarifaGrupo: t.tarifaGrupo ?? null,
  // Escalera por tamaño del grupo (desde 3 personas): descuento en pesos por
  // persona que se resta al precio de LISTA. No se suma a la promo de
  // temporada (ver precioPorCabeza en tours.ts; el bot la copia en catalog.js).
  escalaPersona: t.escalaPersona?.length ? t.escalaPersona : null,
  // Política propia cuando la del sitio (48 h y reembolso) no aplica.
  cancelacion: t.cancelacion?.es ?? null,
  groupMin: t.groupMin,
  groupMax: t.groupMax,
  soloAdultos: Boolean(t.soloAdultos),
  privateAvailable: Boolean(t.privateAvailable),
  // El privado es el precio normal MÁS un recargo por cabeza, no una tarifa aparte.
  privateExtraPorPersona: t.privateAvailable ? PRIVADO_EXTRA_POR_PERSONA : null,
  tagline: t.tagline,
  // Del catálogo de LISTA: el de `TOURS_DB` resuelve `{precio}` con la promo de
  // hoy y contradecía a `precio`.
  pitch: (() => {
    const texto = TOURS_LISTA.find((x) => x.id === t.id)?.descripcion ?? t.descripcion;
    return t.precioUnidad === "vehiculo" ? sinCruceDeRios(texto) : texto;
  })(),
  url: `${empresa.sitio}/tours/${t.slug}`,
  destinos: t.destinos,
  // Solo lo propio: `incluyeSiempre` va aparte y el bot las dice en dos
  // frases. Con la lista cruda repetía "seguro de viaje" en las dos.
  incluye: incluyePropioDeTour(t),
  noIncluye: NO_INCLUYE[t.slug] || [],
  puntoEncuentro: puntoEncuentro(t),
  // La recogida de ESTE tour (dónde, en qué, a qué hora y qué pasa con Valles).
  // Sin esto la herramienta del bot devolvía la salida GLOBAL junto a la ficha
  // de la Gruta, y el modelo elegía la de las 8 de la mañana.
  salida: salidaDeTour(t),
  recogidaTipo: recogidaDeTour(t).tipo,
  horario: horarioTour(t),
  // Hechos cerrados: el bot los repite tal cual, no los deduce.
  transporte: TRANSPORTE[t.slug] || { incluido: false, detalle: "Confírmalo con el equipo." },
  alimentos: ALIMENTOS[t.slug] || { desayuno: false, comida: false, detalle: "Confírmalo con el equipo." },
  fotos: FOTOS[t.slug] || FOTOS_DEFAULT,
  incluyeSiempre: INCLUYE_SIEMPRE,
  idealPara: IDEAL_PARA[t.slug] || [],
  urgencia: t.urgencia || null,
  // Qué llevar, requisitos y edad (`tourRequisitos.ts`, lo mismo que pinta la
  // ficha) y sus preguntas frecuentes. Antes el bot no recibía nada de esto y
  // al confirmar mandaba «ropa cómoda y calzado cerrado» para un tour de río.
  queLlevar: queLlevarDe(t.id),
  requisitos: [...(TOUR_REQUISITOS[t.id]?.requisitos ?? []), ...(REQUISITOS_EXTRA[t.slug] ?? [])],
  edadMinima: TOUR_REQUISITOS[t.id]?.edadMinima ?? null,
  edadNota: TOUR_REQUISITOS[t.id]?.edadNota ?? null,
  faqs: faqsDeTour(t),
  // Solo para tours cobrados por vehículo (RZR): rutas + flota con matriz de precios.
  rutas: t.rutas
    ? t.rutas.map((r) => ({
        nombre: r.nombre,
        duracionHrs: r.duracion_hrs,
        desde: r.desde,
        descripcion: sinCruceDeRios(r.descripcion),
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
/** La cifra que se ENSEÑA de un total de pareja, en la unidad de `precioLabel` (como `precioVisible`). */
const visibleDe = (p: Paquete, totalPareja: number) => (p.precioPorPersona ? Math.round(totalPareja / 2) : totalPareja);

/**
 * La promo de temporada de un paquete, como la de los tours: el precio para
 * paquetes que EMPIEZAN hasta `vence`. 🔴 Antes `precio` salía del getter con
 * la promo del día del export, sin fecha: congelado entre $400 y $800 abajo de
 * la lista, y desde el 30 oct el bot anunciaba un precio y la cotización
 * cobraba otro (mientras nadie re-exportara y desplegara).
 */
function promoDePaquete(p: Paquete): { precio: number; precioTotalPareja: number; vence: string } | null {
  const lista = p.precioLista ?? p.precio;
  const conPromo = precioPaqueteDeFecha(p, PROMO_VENCE);
  if (!promoVigente() || conPromo >= lista) return null;
  return { precio: visibleDe(p, conPromo), precioTotalPareja: conPromo, vence: PROMO_VENCE };
}

const paquetes = PAQUETES_DB.map((p) => ({
  id: p.id,
  slug: p.slug,
  nombre: p.nombre,
  subtitulo: p.subtitulo,
  duracion: p.duracion,
  dias: p.dias,
  noches: p.noches,
  // 🔴 `precio` es la cifra ANUNCIADA y va SIEMPRE con `precioLabel`: Camila
  // cita las dos juntas (agent.js → listar_paquetes). Si aquí fuera el total de
  // la pareja, con la etiqueta «por persona» el bot cobraría el DOBLE.
  // Es la de LISTA: la de temporada va aparte, en `promo`, con su fecha.
  precio: visibleDe(p, p.precioLista ?? p.precio),
  precioLabel: p.precioLabel,
  // El total de la pareja a precio de lista, lo que cobra el motor de reservas
  // sin promo. No se cita al cliente: es la referencia para cuadrar.
  precioTotalPareja: p.precioLista ?? p.precio,
  promo: promoDePaquete(p),
  // La URL donde SE RESERVA este paquete. Sin esto Camila no tenía ningún link
  // que mandar y el cliente acababa en el catálogo de tours, sin su paquete.
  url: `${empresa.sitio}/reservar-paquete/${p.slug}`,
  badge: p.badge || null,
  perfiles: p.perfiles,
  // Las habitaciones que ofrece ESTE paquete, en orden: la primera es la que
  // se asigna. Sin esto Camila ofrecía Orquídeas en la Luna de Miel, que se
  // vende con la suite Jungla puesta.
  habitaciones: habitacionesDePaquete(p).map((h) => h.nombre),
  habitacionAsignada: !!p.habitaciones?.length,
  tours: p.tours,
  // Los recorridos que el cliente ELIGE. Sin esto, de "Tu Huasteca" Camila
  // sabía que son cuatro a elegir y no cuáles, así que no podía contestar la
  // primera pregunta que hace cualquiera: ¿entre qué elijo?
  eleccion: p.eleccionTour
    ? {
        cuantos: p.eleccionTour.cuantos ?? 1,
        dia: p.eleccionTour.dia ?? null,
        opciones: p.eleccionTour.opciones.map((o) => o.nombre),
      }
    : null,
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

/** Las frases de la política de cancelación y lluvia que publica /tours. */
function cancelacionCompleta(): string[] {
  const faq = getToursFaqs("es").find((f) => /llueve|suspende/i.test(f.q));
  if (!faq) return [empresa.cancelacion];
  // Una frase por renglón: el bot cita la que toca sin recitar el párrafo. La
  // política propia de un recorrido (el Edén) va entera en UN renglón con su
  // nombre: partida, «Esta experiencia no tiene reembolso» quedaba sin decir cuál.
  const general = faq.a.split(/\s+La excepción es /)[0];
  const frases = general.split(/(?<=\.)\s+(?=[A-ZÁÉÍÓÚÑ¿])/).map((x) => x.trim()).filter(Boolean);
  const propias = TOURS_DB.filter((t) => t.cancelacion).map((t) => `Excepción, ${t.nombreCorto}: ${t.cancelacion!.es}`);
  return [...frases, ...propias];
}

/** " (hoy todos «por pareja»: …)" o la lista por paquete, según las etiquetas reales. */
function etiquetasPaquetes(): string {
  const labels = Array.from(new Set(paquetes.map((p) => p.precioLabel)));
  if (labels.length === 1 && /pareja/i.test(labels[0])) {
    return ": hoy todos son «por pareja», el total para dos personas que comparten habitación";
  }
  return `: ${paquetes.map((p) => `${p.nombre} ${p.precioLabel}`).join("; ")}`;
}

const info = {
  empresa: empresa.nombre,
  sitio: empresa.sitio,
  zonas,
  incluyeSiempre: INCLUYE_SIEMPRE,
  fotos: FOTOS_DEFAULT,
  // 🔴 Decía "la comida de mediodía NUNCA está incluida en ningún tour": falso
  // para el rafting, que la incluye (Manolo, 6 oct 2026). La excepción sale de
  // `ALIMENTOS`, no se escribe a mano.
  alimentos: [
    "NINGÚN tour es 'todo incluido'. La regla es: los tours de día completo incluyen SOLO el desayuno buffet (parada en El Taco Loco, camino a los destinos); la comida de mediodía no está incluida.",
    ...TOURS_DB.filter((t) => ALIMENTOS[t.slug]?.comida).map((t) => `Excepción: ${t.nombreCorto}. ${ALIMENTOS[t.slug].detalle}`),
    "El RZR, el rappel y el buceo no incluyen ningún alimento. Los paquetes incluyen el desayuno de los días de tour: comidas y cenas van por cuenta del cliente.",
  ].join(" "),
  transporte: transporteResumen(),
  hotelHabitacionesUrl: HOTEL_HABITACIONES_URL,
  // ── Servicios del Hotel Paraíso Encantado ────────────────────────────────
  // Solo lo que está CONFIRMADO en el sitio del hotel y en el cerebro de su
  // propio bot. Lo que aparece en una sola fuente o se contradice entre
  // fuentes (precio de la Jungla) NO se pone aquí: el bot de tours no puede
  // prometer por el hotel lo que el hotel no sostiene. El check-in y el
  // check-out los confirmó Manolo el 6 oct 2026.
  hotelServicios: {
    nombre: "Hotel Paraíso Encantado",
    ubicacion: "En La Conchita, Xilitla, a 400 m (5 min caminando) del Jardín Surrealista de Edward James — Las Pozas.",
    servicios: [
      "Alberca al aire libre para todos los huéspedes (9:00 AM a 9:00 PM)",
      "Restaurante El Papán Huasteco dentro del hotel (8:00 AM a 8:00 PM), cocina huasteca: zacahuil, bocoles, café de olla",
      "WiFi en todo el hotel",
      "Estacionamiento privado gratuito",
      "Aire acondicionado y agua caliente en las habitaciones",
      "Terraza con vista a la sierra y a la selva",
    ],
    spaPrivado: "4 de las 13 suites tienen piscina spa o tina de hidromasaje PRIVADA (no compartida). De las que ofrecemos en los paquetes, la Jungla es la que la trae.",
    // ⚠️ El desayuno del hotel NO va incluido en la tarifa de la habitación.
    // El desayuno que sí incluyen los tours es una parada en El Taco Loco,
    // camino a los destinos — no es en el hotel y solo aplica los días de tour.
    desayuno: "DILO SIEMPRE, sin que lo pregunten: el desayuno va incluido SOLO los días que hay tour de día completo, y es una parada en El Taco Loco camino a los destinos, NO en el hotel. Los días sin tour (el de llegada y el de salida) el desayuno NO está incluido: se paga aparte en el restaurante El Papán Huasteco del hotel, $100–$200 MXN por persona. El rafting no lleva ese desayuno: incluye una comida, antes o después del descenso. El RZR, el rappel y el buceo no incluyen ningún alimento.",
    mascotas: "No se admiten mascotas.",
    fumar: "No se puede fumar dentro de las habitaciones; hay áreas designadas afuera.",
    checkIn: "3:00 pm",
    checkOut: "12:00 pm",
    // Quien llega en el autobús de la mañana pregunta siempre lo mismo.
    llegadaTemprano: "Si llegan antes del check-in (por ejemplo en el autobús de la mañana), se les da la habitación al llegar si ya está libre; si no, dejan las maletas en recepción (ahí quedan seguras) y esperan la camioneta del tour. Se registran solo con el nombre del titular de la reserva.",
  },
  // Las mismas temporadas que publica la web (`faqTours.ts`): aquí decía
  // lluvias de julio a septiembre y la web, de julio a octubre. Desde el 7 oct
  // 2026 es la regla de `temporada.ts`, con su fecha: decía «seca de noviembre
  // a junio, con el agua más turquesa» y junio es de transición.
  mejorTemporada:
    `Se puede venir todo el año. Del ${fechaInicioTexto("es")} a mayo el agua baja clara; el turquesa más intenso es de marzo a mayo, y es cuando más gente hay. Junio es de transición: llegan las primeras lluvias. De julio a octubre las cascadas van a todo caudal y el agua puede bajar con sedimento; el rafting depende del nivel del río ese día y, si el río crece, se reprograma sin costo. Del ${fechaInicioTexto("es")} a diciembre es «la mejor temporada para venir» (aflojan las lluvias, el agua se aclara y todavía no llegan las multitudes de primavera), pero el turquesa más intenso es de marzo a mayo: no lo prometas para esas fechas.`,
  salida: empresa.salida,
  ninos: empresa.ninos,
  cancelacion: empresa.cancelacion,
  // La política completa, la misma que publica /tours (`faqTours.ts`), frase
  // por frase. Antes el bot solo sabía "cancela gratis hasta 48 h antes" y no
  // tenía qué decir de la lluvia, del 50 % ni de la garantía turquesa.
  cancelacionCompleta: cancelacionCompleta(),
  // 🔴 Decía que el RZR y los paquetes "se confirman con el equipo" sin
  // anticipo; todo se aparta con el mismo porcentaje (Manolo, 29 sep).
  pagoTours:
    `Todo (tours, RZR, paquetes y viajes a la medida) se aparta con el ${ANTICIPO_PCT} % de anticipo; el resto se paga el día del tour (en paquetes, al hacer check-in). Por WhatsApp se paga por transferencia a la CLABE o depósito en OXXO, con el folio de la cotización como concepto, o con tarjeta (en la web los tours por persona, o con una liga de pago que manda el equipo). El pago lo valida el equipo: nunca des una reserva por confirmada. Detalles en las políticas «anticipo-y-pago», «saldo» y «metodos-de-pago».`,
  pagoEntradas:
    "Si visitas los destinos por tu cuenta, la entrada suele ser SOLO EFECTIVO y muchos sitios no tienen cajero cerca.",
  // 🔴 Decía "casi todos se anuncian POR PERSONA" mientras el `precioLabel` de
  // los cuatro decía "por pareja". Ahora la frase sale de las etiquetas.
  paquetes:
    `Los paquetes combinan tours + hospedaje en el Hotel Paraíso Encantado (Xilitla), se cotizan según la disponibilidad del hotel y se apartan con el ${ANTICIPO_PCT} % de anticipo. El precio de cada paquete viene con su etiqueta en \`precioLabel\`${etiquetasPaquetes()}. Personas extra y niños se cotizan aparte con la herramienta de precio. Cita la cifra con su etiqueta, tal cual, sin multiplicarla ni dividirla.`,
};

/**
 * Las FAQ de paquetes de la web, salvo una frase: «no necesitas pago anticipado
 * para apartar» contradecía al anticipo que sí se cobra en todo (Manolo, 29
 * sep). Se corrige SOLO en la copia del bot; la de la web la lleva su archivo.
 */
function faqsPaquetes(): { q: string; a: string }[] {
  return FAQS_PAQUETES_ES.map((f) => ({
    q: f.q,
    a: f.a.replace(/\s*y no necesitas pago anticipado para apartar\.?/i, `. Se aparta con el ${ANTICIPO_PCT} % de anticipo.`),
  }));
}

/**
 * Xantolo 2026: la noche sola (`nocheXantolo.ts`) y el paquete con hotel
 * (`xantolo-2026` en `paquetes.ts`). Viven fuera de `PAQUETES_DB` a propósito
 * (no deben salir en los «desde $X»), así que el bot no los conocía aunque la
 * web ya tenía una plantilla de WhatsApp para Xantolo.
 *
 * `null` en cuanto ya no se vende ninguno (`eventoALaVenta`: hasta la víspera),
 * para que el bot no los ofrezca después de la fiesta. El cupo es el TOTAL de
 * cada salida: lo que queda lo cuenta la base al reservar, así que el bot manda
 * el link y no promete lugar.
 */
function xantolo() {
  const paq = getPaquete("xantolo-2026");
  const nochesALaVenta = NOCHES_XANTOLO.filter(eventoALaVenta);
  const paqueteALaVenta = !!paq && eventoALaVenta(paq);
  if (!nochesALaVenta.length && !paqueteALaVenta) return null;
  const reservar = (slug: string) => `${empresa.sitio}/reservar-paquete/${slug}`;
  return {
    nota: "Fechas fijas y cupo limitado. El cupo que queda lo cuenta el sistema en el link de reserva: manda el link y no prometas lugar.",
    noche: {
      nombre: NOCHE_XANTOLO.nombre,
      pagina: `${empresa.sitio}${NOCHE_XANTOLO.pagina}`,
      precioAdulto: NOCHE_XANTOLO.precioAdulto,
      precioNinoMedio: precioNinoNoche("medio"),
      precioNinoChico: precioNinoNoche("chico"),
      ninos: `Niños de 6 a 10 años: $${precioNinoNoche("medio")}; menores de 6: $${precioNinoNoche("chico")}; los bebés menores de 3 no pagan.`,
      horario: NOCHE_XANTOLO.horario,
      horaRecogida: NOCHE_XANTOLO.horaRecogida,
      regreso: NOCHE_XANTOLO.regreso,
      recogida: NOCHE_XANTOLO.recogida,
      queVes: NOCHE_XANTOLO.queVes,
      degustacion: NOCHE_XANTOLO.degustacion,
      incluye: NOCHE_XANTOLO.incluye,
      noIncluye: NOCHE_XANTOLO.noIncluye,
      cancelacion: NOCHE_XANTOLO.cancelacion,
      fechas: NOCHES_XANTOLO.map((n) => ({
        fecha: n.evento!.fecha,
        fechaTexto: n.evento!.fechaTexto,
        cupoTotal: n.evento!.cupo,
        urlReserva: reservar(n.slug),
        aLaVenta: eventoALaVenta(n),
      })),
    },
    paquete: paq
      ? {
          slug: paq.slug,
          nombre: paq.nombre,
          subtitulo: paq.subtitulo,
          fecha: paq.evento?.fecha ?? null,
          fechaTexto: paq.evento?.fechaTexto ?? null,
          precio: paq.precio,
          precioLabel: paq.precioLabel,
          cuartos: paq.evento?.cupo ?? null,
          personasPorCuarto: `${paq.evento?.minAdultos ?? 2} a ${paq.evento?.maxPorReserva ?? 4}`,
          salidaMaxima: paq.evento?.salidaMaxima ?? null,
          personaExtra: paq.evento?.extraEventoPorPersona
            ? `Cada persona más paga su parte de hotel y de la Ruta Surrealista, más $${paq.evento.extraEventoPorPersona.toLocaleString("es-MX")} de la noche con degustación; el total lo calcula la herramienta de precio.`
            : null,
          incluye: paq.incluye,
          noIncluye: paq.noIncluye,
          pagina: `${empresa.sitio}${paq.evento?.pagina ?? `/paquetes/${paq.slug}`}`,
          urlReserva: reservar(paq.slug),
          aLaVenta: paqueteALaVenta,
        }
      : null,
  };
}

// ── Escribir ─────────────────────────────────────────────────────────────────
const out = {
  generatedAt: new Date().toISOString(),
  _nota: "Generado por src/scripts/export-bot-data.ts — NO editar a mano. Cambia la fuente (src/lib/*) y vuelve a correr el script.",
  empresa,
  tours,
  paquetes,
  habitaciones,
  logistica: LOGISTICA,
  // Traslados privados desde la ciudad de origen. Sin esto Camila contestaba
  // que el cliente tiene que llegar por su cuenta, y ahí se perdía la venta de
  // quien no quiere manejar las dos horas de sierra.
  traslados: TRASLADOS.map((r) => ({
    ciudad: r.ciudad,
    nota: "Precio POR VEHÍCULO e IDA Y VUELTA hasta Xilitla, no por persona. Recogida a domicilio.",
    tarifas: r.tarifas.map((t) => ({
      grupo:  t.hasta === null ? `${t.desde} o más personas` : `${t.desde} a ${t.hasta} personas`,
      precio: t.precio,
    })),
  })),
  faqsPaquetes: faqsPaquetes(),
  destinos,
  destinoTour,
  destinoTourCerca,
  info,
  // Lo que el equipo sabe y el catálogo no (`src/lib/bot/politicas.ts`). El bot
  // lo consulta por tema con `consultar_politica`.
  politicas: POLITICAS_BOT,
  xantolo: xantolo(),
};

const dest = join(process.cwd(), "whatsapp-bot", "data.json");
writeFileSync(dest, JSON.stringify(out, null, 2) + "\n", "utf8");

console.log(
  `✅ data.json generado: ${tours.length} tours, ${paquetes.length} paquetes, ${destinos.length} destinos, ${POLITICAS_BOT.length} políticas${out.xantolo ? ", Xantolo" : ""} → ${dest}`
);
