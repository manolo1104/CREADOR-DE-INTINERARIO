// ════════════════════════════════════════════════════════════════════
// Agente de IA (Claude) para Tours Huasteca Potosina — WhatsApp
// ════════════════════════════════════════════════════════════════════

const Anthropic = require("@anthropic-ai/sdk");
const {
  TOURS, EMPRESA, SALIDA, findTour, calcPrecio,
  esPorVehiculo, precioRZR, findRutaRZR,
} = require("./catalog");
const {
  PAQUETES, HABITACIONES, LOGISTICA, DESTINOS, DESTINO_TOUR, INFO,
  findPaquete, findDestino,
} = require("./knowledge");
const { PAGO } = require("./payment");
const { getSession, pushHistory } = require("./sessions");

const MODEL = process.env.BOT_MODEL || "claude-haiku-4-5-20251001";
const MAX_TOKENS = Number(process.env.BOT_MAX_TOKENS || 2048);

// El prompt fijo (instrucciones + las 20 herramientas) son ~11 mil tokens que
// se reenvían en CADA llamada, y una sola conversación hace varias. Con el
// caché, la primera llamada lo guarda y las demás lo leen a ~10 % del precio.
// Solo cambia una vez al día (la fecha de hoy va dentro del prompt).
function systemBlocks() {
  return [{ type: "text", text: buildSystemPrompt(), cache_control: { type: "ephemeral" } }];
}

// Los modelos nuevos (Sonnet 5, Opus 5) razonan por default, y ese
// razonamiento consume del mismo max_tokens que la respuesta: sin apagarlo, el
// bot se quedaría a media frase en WhatsApp. Haiku 4.5 no acepta este campo.
const PIENSA_POR_DEFAULT = /claude-(sonnet-5|opus-5|opus-4-8|fable-5)/.test(MODEL);
function requestBase() {
  return {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemBlocks(),
    tools,
    ...(PIENSA_POR_DEFAULT ? { thinking: { type: "disabled" } } : {}),
  };
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Cliente HTTP al sitio. Se puede inyectar uno falso en pruebas con setApiClient().
let api = require("./api-client");
function setApiClient(mock) { api = mock; }

// ── Limpieza de links (WhatsApp no debe llevar asteriscos/markdown pegados) ──
function sanitizeLinks(text) {
  if (!text) return text;
  let t = text;
  // Markdown [etiqueta](url) → "etiqueta: url"
  t = t.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, "$1: $2");
  // Quitar * _ ` < pegados ANTES de una URL
  t = t.replace(/[*_`<]+(https?:\/\/[^\s*_`<>]+)/g, "$1");
  // Quitar * _ ` > pegados DESPUÉS de una URL
  t = t.replace(/(https?:\/\/[^\s*_`<>]+)[*_`>]+/g, "$1");
  return t;
}

// ── Markdown → formato de WhatsApp ────────────────────────────
// WhatsApp NO entiende `**negritas**` ni `### títulos`: los muestra con los
// asteriscos y las almohadillas a la vista. El modelo escribe markdown por
// mucho que el prompt se lo prohíba, así que lo convertimos aquí, siempre.
function toWhatsAppFormat(text) {
  if (!text) return text;
  let t = String(text);

  // Encabezados markdown (### Título) → negrita de WhatsApp.
  t = t.replace(/^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/gm, (_, h) => `*${h.replace(/\*+/g, "").trim()}*`);
  // Separadores horizontales (--- o ***) en su propia línea → fuera.
  t = t.replace(/^\s*([-*_])\1{2,}\s*$/gm, "");
  // Negritas: ***x*** y **x** → *x*  ·  __x__ → _x_
  t = t.replace(/\*\*\*(?=\S)([\s\S]+?)(?<=\S)\*\*\*/g, "*$1*");
  t = t.replace(/\*\*(?=\S)([\s\S]+?)(?<=\S)\*\*/g, "*$1*");
  t = t.replace(/___(?=\S)([\s\S]+?)(?<=\S)___/g, "_$1_");
  t = t.replace(/__(?=\S)([\s\S]+?)(?<=\S)__/g, "_$1_");
  // Viñetas markdown al inicio de línea → viñeta real.
  t = t.replace(/^(\s*)[-*+]\s+(?=\S)/gm, "$1• ");
  // Máximo dos saltos de línea seguidos.
  t = t.replace(/\n{3,}/g, "\n\n");

  return t.trim();
}

// ── Detección de petición de humano ───────────────────────────
const HUMAN_REGEX = /\b(humano|asesor|agente|ejecutivo|persona real|operador|encargad[oa]|due[ñn]o)\b|hablar con (alguien|una persona|un humano)/i;
function needsHuman(text = "") {
  return HUMAN_REGEX.test(String(text).toLowerCase());
}

/** Plazas totales de una unidad: "2 adultos + 1 niño" → 3, "6 adultos" → 6. */
function capacidadTotal(txt) {
  const nums = String(txt || "").match(/\d+/g);
  if (!nums) return 0;
  return nums.reduce((a, n) => a + Number(n), 0);
}

/** Suma n días a una fecha AAAA-MM-DD (UTC, sin líos de zona horaria). */
function addDays(dateStr, n) {
  const [y, m, d] = String(dateStr).split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

// ── Scoring local de recomendación (espejo del sitio) ─────────
function recomendarLocal({ intereses = [], grupo = "", actividad = "", destino = "" }) {
  const ints = intereses.map((i) => String(i).toLowerCase());
  const has = (kw) => ints.some((i) => i.includes(kw));
  const scores = Object.fromEntries(TOURS.map((t) => [t.slug, 0]));
  const add = (slug, n) => { if (scores[slug] !== undefined) scores[slug] += n; };

  if (has("foto") || has("turques") || has("cascada")) { add("cascadas-del-meco", 3); add("paraiso-escalonado-minas-micos", 2); add("ruta-acuatica-puente-de-dios", 1); }
  if (has("extrem") || has("adrenalin") || has("aventura")) { add("rappel-tamul", 4); add("rafting-rio-tampaon", 3); add("expedicion-tamul", 3); add("rzr-xilitla", 3); add("ruta-acuatica-puente-de-dios", 2); }
  if (has("agua") || has("nad") || has("rio") || has("río") || has("rafting") || has("kayak") || has("canoa") || has("remar")) { add("rafting-rio-tampaon", 3); add("ruta-acuatica-puente-de-dios", 2); add("expedicion-tamul", 1); }
  if (has("buce") || has("snorkel") || has("scuba")) { add("buceo-media-luna", 5); }
  if (has("off-road") || has("todoterreno") || has("rzr") || has("motos")) { add("rzr-xilitla", 5); }
  if (has("arte") || has("cultura") || has("historia")) { add("ruta-surrealista-edward-james", 3); }
  if (has("relax") || has("paz") || has("desconect")) { add("paraiso-escalonado-minas-micos", 2); add("cascadas-del-meco", 1); }

  const g = String(grupo).toLowerCase();
  if (g.includes("familia") || g.includes("niñ") || g.includes("nin")) { add("paraiso-escalonado-minas-micos", 3); add("cascadas-del-meco", 2); add("rzr-xilitla", 2); add("ruta-acuatica-puente-de-dios", 1); add("rappel-tamul", -4); add("buceo-media-luna", -3); }
  if (g.includes("amig")) { add("rzr-xilitla", 3); add("rafting-rio-tampaon", 3); add("rappel-tamul", 2); add("expedicion-tamul", 2); add("ruta-acuatica-puente-de-dios", 1); }
  if (g.includes("pareja")) { add("ruta-surrealista-edward-james", 1); add("cascadas-del-meco", 1); add("expedicion-tamul", 1); }
  if (g.includes("solo") || g.includes("sola")) { add("buceo-media-luna", 1); add("expedicion-tamul", 1); }

  const a = String(actividad).toLowerCase();
  if (a.includes("intens")) { add("rappel-tamul", 3); add("rafting-rio-tampaon", 2); add("rzr-xilitla", 2); add("expedicion-tamul", 2); add("ruta-acuatica-puente-de-dios", 1); }
  if (a.includes("moder")) { add("rafting-rio-tampaon", 1); add("rzr-xilitla", 1); add("expedicion-tamul", 1); }
  if (a.includes("tranquil")) { add("paraiso-escalonado-minas-micos", 2); add("ruta-surrealista-edward-james", 1); add("cascadas-del-meco", 1); add("rappel-tamul", -2); }

  const d = String(destino).toLowerCase();
  if (d.includes("rzr") || d.includes("off-road") || d.includes("nanacatli") || d.includes("trinidad")) add("rzr-xilitla", 4);
  if (d.includes("tamul")) { add("expedicion-tamul", 4); add("rappel-tamul", 3); }
  if (d.includes("rafting") || d.includes("tampaon") || d.includes("tampaón")) add("rafting-rio-tampaon", 4);
  if (d.includes("pozas") || d.includes("edward") || d.includes("xilitla") || d.includes("surreal")) add("ruta-surrealista-edward-james", 3);
  if (d.includes("meco")) add("cascadas-del-meco", 4);
  if (d.includes("minas") || d.includes("micos")) add("paraiso-escalonado-minas-micos", 4);
  if (d.includes("puente") || d.includes("tamasopo")) add("ruta-acuatica-puente-de-dios", 4);
  if (d.includes("media luna") || d.includes("buce") || d.includes("rioverde")) add("buceo-media-luna", 4);

  const ordenados = Object.entries(scores).sort((x, y) => y[1] - x[1]).map(([slug]) => findTour(slug));
  return ordenados.slice(0, 2).map((t) => ({
    slug: t.slug, nombre: t.nombre, tagline: t.tagline, pitch: t.pitch, duracionHrs: t.duracionHrs,
    precio: t.precio, precioUnidad: t.precioUnidad,
  }));
}

// ══════════════════════════════════════════════════════════════
// HERRAMIENTAS
// ══════════════════════════════════════════════════════════════
const tools = [
  {
    name: "recomendar_tour",
    description: "Recomienda los mejores tours según el perfil del cliente. Úsala cuando el cliente describe qué busca pero no sabe qué tour elegir.",
    input_schema: {
      type: "object",
      properties: {
        intereses: { type: "array", items: { type: "string" }, description: "Ej: ['aventura extrema','fotografía','relax','cascadas','buceo','off-road']" },
        grupo: { type: "string", description: "Ej: 'familia con niños', 'amigos', 'pareja', 'solo'" },
        actividad: { type: "string", description: "Nivel de energía: 'tranquilo', 'moderado' o 'intenso'" },
        destino: { type: "string", description: "Lugar específico que el cliente quiere (opcional)" },
      },
      required: [],
    },
  },
  {
    name: "obtener_tour",
    description: "Devuelve todos los detalles de un tour: precio, qué incluye, qué NO incluye, duración, dificultad, punto de encuentro y destinos. Para el RZR devuelve también sus rutas y su flota con precios por vehículo.",
    input_schema: {
      type: "object",
      properties: { slug: { type: "string", description: "slug del tour, ej: 'rzr-xilitla', 'rafting-rio-tampaon', 'buceo-media-luna'" } },
      required: ["slug"],
    },
  },
  {
    name: "calcular_precio",
    description: "Calcula el precio total de un tour cobrado POR PERSONA para un grupo. Niños 6–10 pagan 70%, menores de 6 pagan 50%. NO sirve para el RZR (por vehículo): para eso usa cotizar_rzr.",
    input_schema: {
      type: "object",
      properties: {
        slug: { type: "string" },
        adultos: { type: "number" },
        ninosMid: { type: "number", description: "niños 6–10 años (default 0)" },
        ninosSmall: { type: "number", description: "menores de 6 años (default 0)" },
      },
      required: ["slug", "adultos"],
    },
  },
  {
    name: "cotizar_rzr",
    description: "Precio del RZR (vehículo todoterreno de Xilitla), que se cobra POR VEHÍCULO según la ruta y la unidad. Pasa SIEMPRE 'personas' si sabes cuántos van: la herramienta devuelve solo las unidades donde el grupo CABE, con su precio, y los destinos de esa ruta. No hace falta que el cliente elija vehículo antes: pide la ruta y las personas, y muéstrale las opciones. El RZR NO tiene pago en línea: se confirma por WhatsApp con el equipo.",
    input_schema: {
      type: "object",
      properties: {
        ruta: { type: "string", description: "Ruta: 'Nanacatli' (2h), 'Miradores' (3h), 'Nacimiento' (5h, con kayak) o 'Trinidad' (5h)" },
        personas: { type: "number", description: "Cuántas personas van (para filtrar las unidades donde caben). Muy recomendable." },
        vehiculo: { type: "string", description: "Unidad de la flota si el cliente ya eligió, ej: 'RZR 900', 'Defender'. Opcional." },
      },
      required: ["ruta"],
    },
  },
  {
    name: "crear_cotizacion",
    description: "Crea una reserva PENDIENTE de pago con folio para pagar por transferencia. Solo para tours cobrados POR PERSONA. Úsala SOLO cuando el cliente ya confirmó tour, fecha (YYYY-MM-DD), personas y dio su nombre. Devuelve folio, total y datos bancarios.",
    input_schema: {
      type: "object",
      properties: {
        slug: { type: "string" },
        tourDate: { type: "string", description: "Fecha en formato YYYY-MM-DD" },
        adultos: { type: "number" },
        ninosMid: { type: "number" },
        ninosSmall: { type: "number" },
        nombre: { type: "string", description: "Nombre completo del cliente" },
        email: { type: "string", description: "Correo del cliente (opcional, para enviar la confirmación)" },
        promoCode: { type: "string", description: "Código promocional (opcional)" },
      },
      required: ["slug", "tourDate", "adultos", "nombre"],
    },
  },
  {
    name: "cotizar_paquete_personalizado",
    description:
      "Arma UN paquete a la medida con VARIOS tours en un solo folio y manda UN correo con el itinerario completo y el anticipo del 30%. Úsala en cuanto el cliente quiera 2 o más recorridos y ya te haya confirmado que le gusta la propuesta, con sus fechas, personas, nombre y correo. NO la uses para el RZR (se cobra por vehículo, cotízalo con cotizar_rzr). El precio lo calcula el servidor.",
    input_schema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          description: "Los recorridos del paquete, uno por objeto.",
          items: {
            type: "object",
            properties: {
              slug:       { type: "string", description: "slug del tour" },
              tourDate:   { type: "string", description: "fecha AAAA-MM-DD" },
              adultos:    { type: "number" },
              ninosMid:   { type: "number", description: "niños de 6 a 10 años" },
              ninosSmall: { type: "number", description: "menores de 6 años" },
            },
            required: ["slug", "tourDate", "adultos"],
          },
        },
        customerName:  { type: "string", description: "Nombre completo del cliente" },
        customerEmail: { type: "string", description: "Correo del cliente — sin esto no se puede mandar la propuesta" },
        hospedaje: {
          type: "object",
          description: "Solo si el cliente pidió opciones de hospedaje. NUNCA lo asumas: el hospedaje es opcional.",
          properties: {
            interesado: { type: "boolean" },
            checkin:    { type: "string", description: "AAAA-MM-DD" },
            checkout:   { type: "string", description: "AAAA-MM-DD" },
            noches:     { type: "number" },
          },
        },
        notes: { type: "string", description: "Peticiones especiales del cliente (opcional)" },
      },
      required: ["items", "customerName", "customerEmail"],
    },
  },
  {
    name: "registrar_cotizacion",
    description: "Registra en el panel central una cotización SIN pago en línea (RZR o paquete) para que no se pierda, y devuelve un folio. Úsala cuando el cliente ya eligió: RZR (ruta+vehículo) o paquete (habitación+fechas) y dio su nombre. El precio lo calcula el servidor.",
    input_schema: {
      type: "object",
      properties: {
        tipo: { type: "string", description: "'rzr' o 'paquete'" },
        nombre: { type: "string", description: "Nombre completo del cliente" },
        correo: { type: "string", description: "Correo del cliente (para la confirmación)" },
        personas: { type: "number", description: "Número de personas" },
        // RZR:
        ruta: { type: "string", description: "(RZR) Nanacatli, Miradores, Nacimiento o Trinidad" },
        vehiculo: { type: "string", description: "(RZR) unidad de la flota, ej: 'RZR 500'" },
        tourDate: { type: "string", description: "(RZR) fecha del recorrido AAAA-MM-DD" },
        // Paquete:
        paqueteSlug: { type: "string", description: "(paquete) aventura, completo o gran-huasteca" },
        habitacion: { type: "string", description: "(paquete) habitación elegida, ej: 'Jungla'" },
        checkin: { type: "string", description: "(paquete) llegada AAAA-MM-DD" },
        checkout: { type: "string", description: "(paquete) salida AAAA-MM-DD" },
        notas: { type: "string", description: "Notas u observaciones (opcional)" },
      },
      required: ["tipo", "nombre"],
    },
  },
  {
    name: "enviar_link_pago",
    description: "Devuelve el link del sitio para reservar y pagar con tarjeta (confirmación instantánea). Solo para tours cobrados por persona. Úsalo cuando el cliente prefiere pagar con tarjeta en línea.",
    input_schema: {
      type: "object",
      properties: { slug: { type: "string" } },
      required: ["slug"],
    },
  },
  {
    name: "consultar_reserva",
    description: "Consulta el estado de una reserva por su folio (ej: HPXXXX).",
    input_schema: {
      type: "object",
      properties: { folio: { type: "string" } },
      required: ["folio"],
    },
  },
  {
    name: "datos_pago",
    description: "Devuelve los datos para pagar por transferencia (banco, titular, CLABE) y por OXXO, más las instrucciones (mandar comprobante; la reserva se confirma al recibirlo). Úsala cuando el cliente va a pagar por transferencia u OXXO.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "validar_fecha",
    description: "Valida una fecha propuesta por el cliente: que tenga formato correcto y sea a partir de mañana. Devuelve el día de la semana. Úsala al tomar la fecha de un tour o paquete, antes de cotizar/cerrar.",
    input_schema: {
      type: "object",
      properties: { fecha: { type: "string", description: "Fecha en formato YYYY-MM-DD" } },
      required: ["fecha"],
    },
  },
  {
    name: "listar_paquetes",
    description: "Lista los paquetes (tours + hotel) con su precio. Úsala cuando pregunten por paquetes, promociones, hospedaje incluido o planes de varios días.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "obtener_paquete",
    description: "Detalle de un paquete: qué incluye, itinerario día por día, qué NO incluye y precio. Ids: aventura, completo, gran-huasteca.",
    input_schema: {
      type: "object",
      properties: { id: { type: "string", description: "id o nombre: aventura, completo, gran-huasteca" } },
      required: ["id"],
    },
  },
  {
    name: "obtener_logistica",
    description: "Cómo llegar a la zona (auto, avión, autobús desde CDMX) y transporte interno. Úsala cuando pregunten '¿cómo llego?', '¿de dónde salen?' o por traslados hasta Xilitla/Ciudad Valles.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "disponibilidad_habitaciones",
    description: "Consulta SOLO LECTURA qué habitaciones del Hotel Paraíso Encantado están disponibles para unas fechas (se asoma al calendario del hotel, sin apartar ni reservar nada). Úsala al cerrar un paquete. Pasa la llegada (checkin) y las noches del paquete (Aventura 2, Completo 3, Gran Huasteca 4); la salida se calcula sola. Si no se puede verificar, avisa que el equipo confirma.",
    input_schema: {
      type: "object",
      properties: {
        checkin: { type: "string", description: "Fecha de llegada (AAAA-MM-DD)" },
        noches: { type: "number", description: "Noches del paquete (Aventura 2, Completo 3, Gran Huasteca 4). La salida = llegada + noches." },
        checkout: { type: "string", description: "Fecha de salida (AAAA-MM-DD). Solo si NO das 'noches'." },
      },
      required: ["checkin"],
    },
  },
  {
    name: "listar_destinos",
    description: "Lista los destinos de la Huasteca que conocemos, opcionalmente por zona (Xilitla, Aquismón, Ciudad Valles, Tamasopo, El Naranjo, Rioverde, etc.).",
    input_schema: {
      type: "object",
      properties: { zona: { type: "string", description: "zona para filtrar (opcional)" } },
      required: [],
    },
  },
  {
    name: "obtener_destino",
    description: "Ficha de un destino: entrada, cómo llegar, mejor hora, qué llevar, advertencias y datos curiosos. Incluye qué tour nuestro lo visita (si aplica).",
    input_schema: {
      type: "object",
      properties: { slug: { type: "string", description: "slug o nombre del destino, ej: 'cascada-de-tamul' o 'las pozas'" } },
      required: ["slug"],
    },
  },
];

// ══════════════════════════════════════════════════════════════
// EJECUCIÓN DE HERRAMIENTAS
// ══════════════════════════════════════════════════════════════
async function executeTool(name, input, phone) {
  switch (name) {
    case "recomendar_tour":
      return { recomendaciones: recomendarLocal(input || {}) };

    case "obtener_tour": {
      const t = findTour(input.slug);
      if (!t) return { error: `No existe el tour "${input.slug}". Tours: ${TOURS.map((x) => x.slug).join(", ")}` };
      const base = {
        slug: t.slug, nombre: t.nombre, tipo: t.tipo, dificultad: t.dificultad,
        duracionHrs: t.duracionHrs, duracion: t.duracionTexto, moneda: "MXN",
        url: t.url,
        minPersonas: t.groupMin, maxPersonas: t.groupMax,
        soloAdultos: t.soloAdultos,
        privadoDisponible: t.privateAvailable, privadoDesde: t.privateMinPrice,
        incluye: t.incluye, incluyeSiempre: t.incluyeSiempre, noIncluye: t.noIncluye,
        puntoEncuentro: t.puntoEncuentro, salida: SALIDA, horario: t.horario, destinos: t.destinos,
        idealPara: t.idealPara, cancelacion: EMPRESA.cancelacion,
        // Hechos cerrados: se responden con estos campos, nunca deduciéndolos.
        transporte: t.transporte, alimentos: t.alimentos, fotos: t.fotos,
      };
      if (esPorVehiculo(t)) {
        return {
          ...base,
          cobro: "por vehículo (no por persona)",
          desde: t.precio,
          nota: "El RZR se confirma por WhatsApp con el equipo; no hay pago en línea. Usa cotizar_rzr para un precio exacto por ruta y vehículo.",
          // Cada ruta lleva SUS destinos: antes se descartaban aquí, así que el
          // bot vendía el RZR sin poder decir por dónde pasa el recorrido.
          rutas: t.rutas.map((r) => ({
            nombre: r.nombre, duracionHrs: r.duracionHrs, desde: r.desde,
            descripcion: r.descripcion, destinos: r.destinos || [],
          })),
          flota: t.flota.map((v) => ({
            nombre: v.nombre,
            capacidad: v.capacidad,
            preciosPorRuta: Object.fromEntries(t.rutas.map((r, i) => [r.nombre, v.precios[i]])),
          })),
        };
      }
      return { ...base, cobro: "por persona", precioPorPersona: t.precio };
    }

    case "calcular_precio": {
      const t = findTour(input.slug);
      if (!t) return { error: `No existe el tour "${input.slug}".` };
      if (esPorVehiculo(t)) {
        return { error: "El RZR se cobra por vehículo, no por persona. Usa cotizar_rzr con la ruta y el vehículo." };
      }
      const adultos = Math.max(0, parseInt(input.adultos, 10) || 0);
      const mid = Math.max(0, parseInt(input.ninosMid, 10) || 0);
      const small = Math.max(0, parseInt(input.ninosSmall, 10) || 0);
      const totalPersonas = adultos + mid + small;
      if (totalPersonas < t.groupMin) return { error: `Este tour requiere mínimo ${t.groupMin} personas.` };
      if (t.soloAdultos && (mid > 0 || small > 0)) {
        return { error: "Esta actividad es solo para mayores de 10 años; no aplica precio de niños." };
      }
      const { total, precioMid, precioSmall } = calcPrecio(t.precio, adultos, mid, small);
      return {
        tour: t.nombre, precioAdulto: t.precio, precioNino6a10: precioMid, precioMenor6: precioSmall,
        adultos, ninosMid: mid, ninosSmall: small, totalPersonas, total, moneda: "MXN",
      };
    }

    case "cotizar_rzr": {
      const t = TOURS.find((x) => esPorVehiculo(x)) || findTour("rzr-xilitla");
      if (!t) return { error: "No hay un tour por vehículo configurado." };

      const personas = Math.max(0, parseInt(input.personas, 10) || 0);
      const ri = findRutaRZR(t, input.ruta);

      // Sin vehículo elegido (o con el grupo por delante): devolvemos la tabla
      // de precios ya filtrada por capacidad, en vez de pedirle al cliente que
      // elija a ciegas entre unidades donde su grupo no cabe.
      if (!input.vehiculo || personas > 0) {
        if (ri < 0) {
          return { error: `Ruta no encontrada. Opciones: ${t.rutas.map((r) => r.nombre).join(", ")}.` };
        }
        const ruta = t.rutas[ri];
        const opciones = t.flota
          .map((v) => ({ nombre: v.nombre, capacidad: v.capacidad, plazas: capacidadTotal(v.capacidad), precio: v.precios[ri] }))
          .filter((v) => personas === 0 || v.plazas >= personas)
          .sort((a, b) => a.precio - b.precio);

        if (personas > 0 && !opciones.length) {
          const max = Math.max(...t.flota.map((v) => capacidadTotal(v.capacidad)));
          return {
            error: `Ninguna unidad sola alcanza para ${personas} personas (la más grande lleva ${max}). Se necesitan varios vehículos: propón la combinación y avisa que el equipo confirma disponibilidad de la flota.`,
          };
        }
        // Si eligió vehículo Y cabe el grupo, damos también el precio exacto.
        const exacto = input.vehiculo ? precioRZR(t, input.ruta, input.vehiculo) : null;
        return {
          tour: t.nombre,
          ruta: ruta.nombre,
          rutaDuracionHrs: ruta.duracionHrs,
          destinosDeLaRuta: ruta.destinos || [],
          personas: personas || null,
          moneda: "MXN",
          porUnidad: "vehículo",
          opciones,
          ...(exacto && exacto.ok ? { seleccion: { vehiculo: exacto.vehiculo, capacidad: exacto.capacidad, total: exacto.total } } : {}),
          nota: "Precio POR VEHÍCULO (no por persona). Muestra solo estas unidades: son las que alcanzan para el grupo. NO incluye transporte hasta Xilitla ni ningún alimento. Se confirma disponibilidad por WhatsApp con el equipo.",
        };
      }

      const r = precioRZR(t, input.ruta, input.vehiculo);
      if (!r.ok) return { error: r.error };
      return {
        ...r,
        tour: t.nombre,
        destinosDeLaRuta: (t.rutas[ri] && t.rutas[ri].destinos) || [],
        nota: "Precio por vehículo. Se confirma disponibilidad por WhatsApp con el equipo (no incluye transporte hasta Xilitla ni alimentos).",
      };
    }

    case "crear_cotizacion": {
      const t = findTour(input.slug);
      if (!t) return { error: `No existe el tour "${input.slug}".` };
      if (esPorVehiculo(t)) {
        return { error: "El RZR se cobra por vehículo y se confirma por WhatsApp con el equipo (no hay cotización con folio ni pago en línea). Da el precio con cotizar_rzr, toma fecha + ruta + vehículo + nombre, y avisa que el equipo confirma disponibilidad." };
      }
      const res = await api.crearCotizacion({
        tourSlug: t.slug,
        tourDate: input.tourDate,
        adults: parseInt(input.adultos, 10) || 0,
        childrenMid: parseInt(input.ninosMid, 10) || 0,
        childrenSmall: parseInt(input.ninosSmall, 10) || 0,
        customerName: input.nombre,
        customerPhone: phone ? String(phone).replace(/\D/g, "") : undefined,
        customerEmail: input.email,
        promoCode: input.promoCode,
      });
      if (!res.ok) return { error: res.data?.error || "No se pudo crear la cotización." };
      return res.data; // { folio, total, datosBanco, linkPago, ... }
    }

    case "cotizar_paquete_personalizado": {
      const items = Array.isArray(input.items) ? input.items : [];
      if (!items.length) return { error: "Necesito al menos un recorrido con su fecha." };
      if (!input.customerEmail) {
        return { error: "Sin correo no puedo mandar la propuesta. Pídeselo al cliente antes de llamar esta herramienta." };
      }
      // El RZR se corta aquí y no en el servidor para poder decirle al modelo
      // qué hacer en vez de solo rechazarlo.
      const rzr = items.find((i) => { const t = findTour(i.slug); return t && esPorVehiculo(t); });
      if (rzr) {
        return { error: "El RZR se cobra por vehículo y no entra en un paquete por persona. Sácalo del paquete, cotiza el resto, y el RZR aparte con cotizar_rzr." };
      }
      const res = await api.cotizarPaquetePersonalizado({
        items: items.map((i) => ({
          slug: i.slug,
          tourDate: i.tourDate,
          adultos: parseInt(i.adultos, 10) || 0,
          ninosMid: parseInt(i.ninosMid, 10) || 0,
          ninosSmall: parseInt(i.ninosSmall, 10) || 0,
        })),
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        customerPhone: phone ? String(phone).replace(/\D/g, "") : undefined,
        hospedaje: input.hospedaje,
        notes: input.notes,
      });
      if (!res.ok) return { error: res.data?.error || "No se pudo armar el paquete." };
      return res.data; // { folio, total, anticipo, saldo, recorridos, emailEnviado, ... }
    }

    case "registrar_cotizacion": {
      const payload = {
        tipo: input.tipo,
        customerName: input.nombre,
        customerEmail: input.correo,
        customerPhone: phone ? String(phone).replace(/\D/g, "") : undefined,
        personas: input.personas,
        notes: input.notas,
        // RZR:
        ruta: input.ruta,
        vehiculo: input.vehiculo,
        tourDate: input.tourDate,
        // Paquete:
        paqueteSlug: input.paqueteSlug,
        habitacion: input.habitacion,
        checkin: input.checkin,
        checkout: input.checkout,
      };
      const res = await api.registrarLead(payload);
      if (!res.ok) return { error: res.data?.error || "No se pudo registrar la cotización." };
      return res.data; // { folio, total, ... }
    }

    case "enviar_link_pago": {
      const t = findTour(input.slug);
      if (!t) return { error: `No existe el tour "${input.slug}".` };
      if (esPorVehiculo(t)) {
        return { error: "El RZR no tiene pago en línea; se confirma por WhatsApp con el equipo." };
      }
      return { link: `${EMPRESA.sitio}/reservar-tour/${t.slug}`, tour: t.nombre };
    }

    case "consultar_reserva": {
      const res = await api.consultarReserva(String(input.folio || "").trim().toUpperCase());
      if (!res.ok) return { error: res.data?.error || "No encontré esa reserva." };
      return res.data;
    }

    case "datos_pago":
      return {
        transferencia: { banco: PAGO.banco, titular: PAGO.titular, clabe: PAGO.clabe },
        oxxo: PAGO.oxxo,
        instrucciones: PAGO.instrucciones,
      };

    case "validar_fecha": {
      const f = String(input.fecha || "").trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(f)) {
        return { valida: false, motivo: "Formato inválido. Pide la fecha como AAAA-MM-DD." };
      }
      const hoy = new Date();
      const manana = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1);
      const [y, m, d] = f.split("-").map(Number);
      const fecha = new Date(y, m - 1, d);
      if (isNaN(fecha.getTime())) return { valida: false, motivo: "No es una fecha real." };
      if (fecha < manana) return { valida: false, motivo: "La fecha debe ser a partir de mañana." };
      const dias = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
      return { valida: true, fecha: f, diaSemana: dias[fecha.getDay()] };
    }

    case "listar_paquetes":
      return {
        paquetes: PAQUETES.map((p) => ({ id: p.id, nombre: p.nombre, duracion: p.duracion, precio: p.precio, precioLabel: p.precioLabel, badge: p.badge || null, perfiles: p.perfiles })),
        nota: INFO.paquetes,
      };

    case "obtener_paquete": {
      const p = findPaquete(input.id);
      if (!p) return { error: `No existe ese paquete. Opciones: ${PAQUETES.map((x) => x.id).join(", ")}` };
      return { ...p, habitaciones: HABITACIONES, verTodasLasHabitaciones: INFO.hotelHabitacionesUrl, nota: INFO.paquetes };
    }

    case "obtener_logistica":
      return { ...LOGISTICA };

    case "disponibilidad_habitaciones": {
      const checkin = String(input.checkin || "").trim();
      const nNoches = parseInt(input.noches, 10) || 0;
      // La salida la calcula el servidor a partir de las noches (no el modelo).
      const checkout = nNoches > 0 && /^\d{4}-\d{2}-\d{2}$/.test(checkin)
        ? addDays(checkin, nNoches)
        : String(input.checkout || "").trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(checkin) || !/^\d{4}-\d{2}-\d{2}$/.test(checkout)) {
        return { error: "Necesito la fecha de llegada (AAAA-MM-DD) y las noches del paquete." };
      }
      if (checkout <= checkin) {
        return { error: "La fecha de salida debe ser posterior a la de llegada." };
      }
      const rooms = HABITACIONES.map((h) => h.hotelNombre);
      const res = await api.checkHotelAvailability(checkin, checkout, rooms);
      if (!res.ok || !res.data || res.data.error || res.data.degraded) {
        return { verificado: false, checkin, checkout, mensaje: "No pude verificar la disponibilidad del hotel en este momento; el equipo la confirma contigo enseguida." };
      }
      const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
      const ocupadasSet = new Set((res.data.unavailableRooms || []).map((r) => norm(r)));
      const disponibles = HABITACIONES
        .filter((h) => !ocupadasSet.has(norm(h.hotelNombre)))
        .map((h) => ({ nombre: h.nombre, vista: h.vista, suplemento: h.suplemento, url: h.url }));
      const ocupadas = HABITACIONES.filter((h) => ocupadasSet.has(norm(h.hotelNombre))).map((h) => h.nombre);
      return {
        verificado: true, checkin, checkout,
        disponibles, ocupadas,
        hayDisponibles: disponibles.length > 0,
        nota: "Disponibilidad consultada en el calendario del hotel (solo lectura). La reserva final la confirma el equipo.",
      };
    }

    case "listar_destinos": {
      let lista = DESTINOS;
      if (input.zona) {
        const z = String(input.zona).toLowerCase();
        const filtrada = DESTINOS.filter((d) => d.zona.toLowerCase().includes(z));
        if (filtrada.length) lista = filtrada;
      }
      return { destinos: lista.map((d) => ({ slug: d.slug, nombre: d.nombre, zona: d.zona, tipo: d.tipo, precioEntrada: d.precioEntrada })) };
    }

    case "obtener_destino": {
      const d = findDestino(input.slug);
      if (!d) return { error: "No encontré ese destino. Usa listar_destinos para ver las opciones." };
      const toursQueLoVisitan = (DESTINO_TOUR[d.slug] || [])
        .map((ref) => { const t = findTour(ref.slug); return t ? { slug: t.slug, nombre: t.nombre, precio: t.precio, precioUnidad: t.precioUnidad } : null; })
        .filter(Boolean);
      return { ...d, toursQueLoVisitan, info: { salida: INFO.salida, pagoEntradas: INFO.pagoEntradas } };
    }

    default:
      return { error: `Herramienta desconocida: ${name}` };
  }
}

// ══════════════════════════════════════════════════════════════
// PROMPT DEL SISTEMA
// ══════════════════════════════════════════════════════════════
function catalogoTexto() {
  return TOURS.map((t) => {
    const precio = esPorVehiculo(t)
      ? `desde $${t.precio.toLocaleString("es-MX")} MXN/*vehículo* (según ruta y unidad)`
      : `$${t.precio.toLocaleString("es-MX")} MXN/persona`;
    return (
      `• *${t.nombre}* (slug: ${t.slug})\n` +
      `  ${t.tipo} · dificultad ${t.dificultad} · ${t.duracionTexto} · ${precio} · ${t.groupMin}–${t.groupMax} pers.${t.soloAdultos ? " · SOLO +10 años" : ""}\n` +
      `  ${t.pitch}`
    );
  }).join("\n\n");
}

function paquetesTexto() {
  return PAQUETES.map((p) =>
    `• *${p.nombre}* — ${p.duracion} — $${p.precio.toLocaleString("es-MX")} ${p.precioLabel}${p.badge ? ` (${p.badge})` : ""}`
  ).join("\n");
}

function destinosTexto() {
  const porZona = {};
  for (const d of DESTINOS) (porZona[d.zona] = porZona[d.zona] || []).push(d.nombre);
  return Object.entries(porZona).map(([z, arr]) => `• ${z}: ${arr.join(" · ")}`).join("\n");
}

function fechaHoyTexto() {
  const ahora = new Date();
  const f = ahora.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "America/Mexico_City" });
  const iso = ahora.toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" }); // YYYY-MM-DD
  return { f, iso, anio: iso.slice(0, 4) };
}

function buildSystemPrompt() {
  const hoy = fechaHoyTexto();
  return `Eres el asistente de WhatsApp de *${EMPRESA.nombre}* (${EMPRESA.sitio}), operador de turismo de aventura en la ${EMPRESA.zona}. 🌿💦🏞️

📅 HOY es *${hoy.f}* (${hoy.iso}). Estamos en el año *${hoy.anio}*. Usa esto para entender fechas relativas (ej. "el próximo sábado", "16 de agosto" = del año en curso o el siguiente si ya pasó). Las reservas son a partir de mañana. Valida siempre las fechas con *validar_fecha*.

Tu misión: asesorar con calidez, recomendar el tour ideal y CERRAR la reserva. Eres entusiasta y conoces la Huasteca de memoria, pero SIEMPRE honesto: nunca inventas precios, fechas, disponibilidad, alturas ni lo que incluye un tour. Cuando necesites un dato exacto, úsalo de las herramientas.

━━━━━━━━━━━━━━━━━━━━━━━━
🌱 TU PERSONALIDAD Y VOZ (así somos — de /nosotros)
━━━━━━━━━━━━━━━━━━━━━━━━
Hablas como parte de una *empresa familiar de guías LOCALES, nacidos y criados en la Huasteca Potosina*. Para nosotros la Huasteca no es un trabajo: es nuestra casa, nuestra familia y nuestro orgullo. Raíces desde 2010, empresa formal desde 2019. Habla siempre en *"nosotros"* y con este espíritu:
• *Orgullo y pasión genuina* por la región, con calidez cercana y trato de tú, como un amigo local que conoce cada rincón, no un call center.
• *Conocimiento local real*: llevamos a la gente a lugares que ningún autobús turístico alcanza — acceso exclusivo, amaneceres, rincones ocultos, senderos que solo un local conoce.
• *Seguridad por conocimiento*: somos guías certificados NOM-09 SECTUR y en rescate acuático; "la adrenalina real viene del conocimiento, no de la imprudencia". Transmite confianza y cero incidentes, sin presumir.
• *Trato personalizado*: grupos pequeños (máximo 12), sin guiones — cada recorrido se adapta al ritmo e intereses del grupo. (Por eso con gusto armamos tours a la medida.)
• *Cuidamos la Huasteca*: aforos limitados, cero plásticos y parte de cada tour va a un Fondo de Conservación de la región. Menciónalo con naturalidad cuando venga al caso, sin sermonear.
• Enamora al viajero con el lugar: puedes contar un detalle o una pequeña historia con cariño, pero SIEMPRE con datos reales de las herramientas — nunca inventes cifras, anécdotas ni nombres.
Cálido, orgulloso, confiable y apasionado por su tierra: esa es la voz.

━━━━━━━━━━━━━━━━━━━━━━━━
🗺️ NUESTROS ${TOURS.length} TOURS
━━━━━━━━━━━━━━━━━━━━━━━━
${catalogoTexto()}

Para el detalle de un tour usa *obtener_tour*. Para el precio exacto usa *calcular_precio* (por persona) o *cotizar_rzr* (el RZR, por vehículo).
Si el cliente pide *más fotos*, ver galería o la página del tour, comparte el *link* del tour (campo "url" de *obtener_tour*), como URL simple en su propia línea, sin formato.

*SIEMPRE que presentes un tour, di a qué lugares se va.* No basta el nombre del tour: enuncia TODOS los destinos del campo "destinos" de *obtener_tour*, con el nombre EXACTO que traen y sin quitar ninguno. Si son muchos, ponlos en una lista corta — pero completa. (Para el RZR, los destinos van por ruta: campo "destinos" dentro de cada ruta.)
*Al listarlos, NO les agregues descripciones ni adjetivos de tu cosecha* (nada de "colonial", "prehispánico", "el más alto"): el nombre solo. Si quieres describir un destino, primero pide su ficha con *obtener_destino* y usa lo que diga. Un adorno inventado es tan grave como un precio inventado.

━━━━━━━━━━━━━━━━━━━━━━━━
🧩 TOURS PERSONALIZADOS / A LA MEDIDA
━━━━━━━━━━━━━━━━━━━━━━━━
Los tours estándar NO son obligatorios. Si el cliente quiere algo *personalizado*, *diferente* o *armar su propio itinerario*, guíalo:
1. Pregúntale sus *preferencias* (qué le emociona: agua, adrenalina, cultura, cascadas, relax; con quién viaja; cuántos días; nivel de intensidad) y usa *recomendar_tour* para proponer una combinación.
2. Puedes combinar varios de nuestros tours en distintos días (arma el itinerario a su gusto) y/o proponer un *tour privado* (varios tours lo ofrecen — campos "privadoDisponible"/"privadoDesde" en *obtener_tour*: unidad privada, a su ritmo, guía a disposición).
3. Da precios reales de cada tour elegido (con las herramientas) y suma. Para un armado a la medida o privado, toma sus datos y avisa que el equipo le confirma la propuesta y disponibilidad.
NUNCA inventes un precio "personalizado": usa los precios reales de cada tour y, si es algo fuera de catálogo, pásalo con el equipo.

━━━━━━━━━━━━━━━━━━━━━━━━
🚫 LO QUE NUNCA DEBES PROMETER (lee esto dos veces)
━━━━━━━━━━━━━━━━━━━━━━━━
Un cliente al que le prometes algo que no damos llega el día del tour, se le cae el plan y nos deja una reseña de una estrella. Vale mil veces más decir "eso no viene incluido" que quedar bien en el chat. Estas cuatro reglas están por encima de vender:

*1. TRANSPORTE — nunca lo supongas.* Cada tour trae el campo "transporte" en *obtener_tour* con la respuesta ya escrita: cópiala, no la deduzcas de la lista de "incluye".
  · SÍ pasamos por el cliente a su hospedaje en: rafting, expedición Tamul, ruta surrealista, cascadas del Meco, paraíso escalonado y ruta acuática.
  · *NO* pasamos por él en: *RZR* (sale de nuestra base en Xilitla), *rappel en Tamul* (el punto de encuentro es el embarcadero; el traslado se coordina aparte y *tiene costo adicional*) y *buceo en Media Luna* (la actividad es en Rioverde y llega por su cuenta).
  · JAMÁS digas "todos los tours incluyen traslado". Es falso en 3 de los 9.

*2. COMIDAS — ningún tour es "todo incluido".* Cada tour trae el campo "alimentos" en *obtener_tour*: úsalo tal cual.
  · Los tours de día completo incluyen *SOLO el desayuno buffet*.
  · La *comida de mediodía NO está incluida en NINGÚN tour*. Ni la cena.
  · El RZR, el rappel y el buceo *no incluyen ningún alimento*.
  · Los paquetes incluyen *solo los desayunos* del hotel; comidas y cenas van por cuenta del cliente.
  · Nunca escribas "todo incluido" ni un encabezado tipo "Todo Incluido" para un tour o un paquete.
  · No inventes dónde puede comer (tienditas, puestos, restaurantes) salvo que el dato venga en la herramienta.

*3. FOTOS Y VIDEO — nunca digas "profesional".* Cada tour trae el campo "fotos". Lo que damos es: *fotos y video del recorrido que va tomando tu guía durante el día, sin costo extra*. NO prometas fotógrafo dedicado, sesión, edición, entrega en un plazo, ni las llames "profesionales". (Única excepción: en el rappel de Tamul sí hay tomas aéreas con dron — puedes mencionarlo, pero tampoco como "profesional".)

*4. NO INVENTES HECHOS, no solo cifras.* Qué incluye un tour, qué ES un lugar, qué se ve, a qué hora se regresa, cómo se entregan las fotos: nada de eso se adivina. O viene de una herramienta, o no lo dices.
  · Si el cliente pregunta por un lugar, usa *obtener_destino*. Si la herramienta no devuelve ficha, di con naturalidad que ese lugar no lo tienes a la mano y ofrece pasarlo con el equipo. *NUNCA describas un lugar por lo que suena su nombre.*
  · La Cascada de Tamul es la más alta de *San Luis Potosí* (105 m), *NO* la más alta de México. No la asciendas.
  · No inventes la hora de regreso: di la duración que trae "horario" y que el horario exacto se confirma al reservar.

━━━━━━━━━━━━━━━━━━━━━━━━
💰 PRECIOS Y CONDICIONES
━━━━━━━━━━━━━━━━━━━━━━━━
• Casi todos los tours son *POR PERSONA* en MXN. ${EMPRESA.ninos}
• El *RZR* es la excepción: se cobra *POR VEHÍCULO* según la ruta (Nanacatli 2h, Miradores 3h, Nacimiento 5h con kayak, Trinidad 5h) y la unidad de la flota. No incluye transporte hasta Xilitla ni alimentos, y se confirma por WhatsApp (sin pago en línea).
  Para cotizarlo pide *la ruta* y *cuántas personas van*, y llama a *cotizar_rzr* con ambos. La herramienta te devuelve SOLO las unidades donde el grupo cabe, con su precio: preséntaselas con nombre, capacidad y precio para que elija. *Nunca ofrezcas una unidad donde el grupo no quepa* ni le pidas elegir vehículo sin haberle dado los precios.
• El *Buceo en Media Luna* es solo para *mayores de 10 años* con buena salud (no apto con problemas respiratorios, cardíacos o de oído, ni embarazadas). No aplica precio de niños.
• El *Rafting* depende del nivel del río en temporada de lluvias (jul–sep): si no es seguro, se reprograma. Incluye traslado redondo y *desayuno buffet* — la comida de mediodía NO va incluida.
• Salida estándar de los tours con recogida: *${SALIDA}*. ${EMPRESA.cancelacion}
• *Horarios:* cada tour tiene una hora de inicio y de término (campo "horario" en *obtener_tour*). Al presentar un tour, MENCIONA a qué hora empieza y a qué hora termina (aprox.).
• *SIEMPRE incluido en todos los tours* (recuérdalo al presentar cualquier tour): *${INFO.incluyeSiempre.join(" · ")}*.
• *ANTICIPO DEL 30 %* — así se aparta TODO (tours sueltos y paquetes a medida). El cliente paga hoy el 30 % y el resto lo liquida el día del recorrido. Cancela gratis hasta 48 h antes con reembolso completo. Cuando des un total, di SIEMPRE con cuánto se aparta: "son $X en total, apartas con $Y". Nunca le pidas el 100 % por adelantado como si fuera la única opción.
• NUNCA inventes montos ni horarios: usa las herramientas.

━━━━━━━━━━━━━━━━━━━━━━━━
🧩 ARMA UN PAQUETE A LA MEDIDA (esto es lo primero que debes intentar)
━━━━━━━━━━━━━━━━━━━━━━━━
Cuando alguien venga por *varios días* o quiera *dos o más recorridos*, NO le recites los tres paquetes preestablecidos. Arma uno para él:
1. Pregunta *cuántos días*, *cuántas personas* (y edades si hay niños) y *qué le late* (cascadas, aventura fuerte, cultura, tranquilo, con niños).
2. Propón un recorrido por día con los tours que de verdad encajan, y di el precio de cada uno y el total. Un tour de día completo por día — no metas dos tours pesados el mismo día.
3. *El hospedaje es OPCIONAL y así se lo dices.* Ofrécelo como opción, nunca como requisito: "si quieres, te paso opciones de hospedaje en nuestro hotel en Xilitla; y si prefieres quedarte en otro lado, no hay problema". Aclara SIEMPRE que *pasamos por él a su hospedaje en Xilitla o en Ciudad Valles, sea nuestro hotel o no*.
4. Cuando te diga que le gusta, pide *nombre y correo* y llama a *cotizar_paquete_personalizado* con todos los recorridos. Eso genera UN folio y le manda UN correo con el itinerario completo y el anticipo. No generes una cotización por tour.
5. Los paquetes preestablecidos (*listar_paquetes*) siguen existiendo: ofrécelos solo si el cliente pregunta por ellos directamente o si quiere algo ya armado con hotel incluido.

━━━━━━━━━━━━━━━━━━━━━━━━
🎒 PAQUETES (tours + hotel)
━━━━━━━━━━━━━━━━━━━━━━━━
${paquetesTexto()}
Incluyen hospedaje en el *Hotel Paraíso Encantado* (Xilitla) y son *por pareja* (2 personas). Para el detalle usa *obtener_paquete*; para la lista, *listar_paquetes*.
Para cerrar un paquete: (1) pregunta solo la *fecha de llegada* (checkin) y valídala con *validar_fecha*. *NO calcules tú la fecha de salida* — la salida = llegada + noches (Aventura 2, Completo 3, Gran Huasteca 4) y la calculan las herramientas; solo pasa *checkin* + *noches*. (2) *consulta la disponibilidad real* con *disponibilidad_habitaciones* (checkin + noches) — se asoma al calendario del hotel y te dice qué habitaciones están libres; dile al cliente cuáles hay para esas fechas (si "verificado" es false, avisa que el equipo confirma). (3) comparte los *links de las habitaciones* disponibles (cada una trae su "url"; también "verTodasLasHabitaciones" de *obtener_paquete*). (4) toma número de personas, nombre y *correo*, y usa *registrar_cotizacion* (tipo "paquete", con checkin — la salida la pone el servidor). La habitación *Jungla* tiene +$400/noche. La fecha de salida que muestres al cliente es la que devuelven las herramientas (campo "checkout"), no la que calcules de memoria. NO apartas ni cobras: solo lectura; la reserva final la confirma el equipo.

━━━━━━━━━━━━━━━━━━━━━━━━
📍 DESTINOS QUE CONOCEMOS (${DESTINOS.length})
━━━━━━━━━━━━━━━━━━━━━━━━
Podemos asesorar sobre muchos lugares de la Huasteca (entrada, cómo llegar, mejor hora, qué llevar, datos curiosos). Para el detalle usa *obtener_destino*; para la lista, *listar_destinos*. NUNCA inventes datos de un destino — usa la herramienta. Si el destino tiene un tour nuestro que lo visita, ofrécelo.
Para *cómo llegar a la zona* (auto/avión/autobús desde CDMX) usa *obtener_logistica*.

━━━━━━━━━━━━━━━━━━━━━━━━
🎯 FORMAS DE RESERVAR
━━━━━━━━━━━━━━━━━━━━━━━━
*Antes de cerrar cualquier reserva pide el CORREO del cliente* (para enviarle la confirmación) y valida la fecha con *validar_fecha*.

*Al cerrar una cotización, manda SIEMPRE por WhatsApp, en ESTE ORDEN. Aplica IGUAL a un tour suelto, al RZR, a un paquete preestablecido y a un paquete a medida (cotizar_paquete_personalizado):*
1. *RESUMEN COMPLETO, ANTES QUE NADA.* Nunca sueltes los datos bancarios sin haber mandado antes el resumen — el cliente tiene que poder revisar qué está apartando.
   ⚠️ *cotizar_paquete_personalizado* ya te devuelve el resumen escrito en el campo *resumenWhatsApp*: **cópialo TAL CUAL como tu primer mensaje**, sin reescribirlo ni resumirlo, y solo después sigue con el paso 2. Para los demás casos, el resumen lleva:
   • el *folio*;
   • *cada recorrido con su fecha y su precio* (en un paquete a medida, día por día, tal como se lo propusiste y él lo aceptó);
   • el número de *personas* (y edades de los niños si las hay);
   • el *total* y con *cuánto se aparta* (anticipo del 30 %), diciendo que el resto se liquida el día del recorrido;
   • dónde lo recogemos (su hospedaje en Xilitla o Ciudad Valles).
   Ese resumen debe coincidir *exactamente* con lo que el cliente aceptó y con lo que devolvió la herramienta. Si algo no cuadra, corrígelo con él ANTES de pedirle dinero.
2. *Aviso del correo*: el sistema intenta enviar la cotización al correo del cliente y te devuelve *emailEnviado*. Si es true, dile que *también se la enviaste a su correo* (menciona el correo). Si es false (o no dio correo), dile que se la dejas por aquí. NUNCA afirmes que enviaste un correo si emailEnviado no es true.
3. *Hasta entonces, la información bancaria* con *datos_pago* (transferencia + OXXO), con el monto del *anticipo*, y pídele su *comprobante* — la reserva solo se confirma cuando lo recibimos.
El correo es un extra, no un sustituto: el resumen y los datos de pago SIEMPRE van también por aquí.

Tours *por persona* — ofrece las dos opciones:
1. *Tarjeta en línea* (confirmación instantánea): usa *enviar_link_pago* y manda el link. Escríbelo como URL simple en su propia línea, SIN asteriscos, negritas ni paréntesis, para que se pueda tocar.
2. *Transferencia u OXXO*: usa *crear_cotizacion* (solo cuando ya tengas tour + fecha + personas + nombre + correo). Genera un *folio* y **deja la cotización registrada en el panel para que no se pierda**. Luego usa *datos_pago* y comparte los datos de *transferencia* (banco, titular, CLABE) y de *OXXO*. Dile que envíe su *comprobante* por este chat: la reserva SOLO queda confirmada cuando lo recibimos.

*RZR* y *paquetes*: no tienen pago en línea. Cuando el cliente ya eligió y dio su nombre + correo, usa *registrar_cotizacion* (tipo "rzr" con ruta+vehículo+fecha, o tipo "paquete" con paqueteSlug+habitación+checkin+checkout): esto **deja la cotización guardada en el panel con un folio** para que no se pierda. Luego comparte *datos_pago* (transferencia u OXXO), menciona el folio y pide el comprobante; avisa que el equipo confirma la disponibilidad.

━━━━━━━━━━━━━━━━━━━━━━━━
📋 QUÉ HACER EN CADA SITUACIÓN
━━━━━━━━━━━━━━━━━━━━━━━━
1. *Saludo / no sabe qué quiere:* saluda cálido y pregunta poco (¿con quién viaja?, ¿qué le emociona: agua, adrenalina, cultura, relax?, ¿cuántos días?). Usa *recomendar_tour*.
2. *Ya sabe el tour:* preséntalo con su gancho + precio (usa la herramienta correcta según por persona o por vehículo).
3. *Quiere cotizar:* pide *fecha* (a partir de mañana) y *cuántas personas* (adultos / niños 6–10 / menores de 6). Para el RZR pide *ruta* y *vehículo*.
4. *Listo para reservar:* valida la fecha (*validar_fecha*), pide el *correo*, pregunta cómo prefiere pagar y ejecuta el flujo (tarjeta con link, o cotización con folio + *datos_pago* para transferencia/OXXO + pedir comprobante). RZR/paquete: toma datos y confirma disponibilidad con el equipo.
5. *Grupos grandes o eventos:* arma la propuesta con las herramientas; si excede el máximo del tour o piden algo a la medida, ofrece pasarlo con el equipo.
6. *Fechas / disponibilidad puntual / clima:* no la inventes. Puedes cotizar y explicar que la disponibilidad exacta la confirma el equipo (sobre todo RZR, paquetes, rafting por nivel del río).
7. *Pregunta por un lugar (no por un tour):* usa *obtener_destino* y, si tenemos tour que lo visita, ofrécelo.
8. *Cómo llegar:* usa *obtener_logistica*.
9. *Consultar una reserva:* pide el folio (HPxxxx) y usa *consultar_reserva*.
10. *Pide un humano/asesor:* con gusto dile que lo conectas con el equipo y deja de insistir en vender.
11. *Pregunta algo fuera de esto (otro hotel, vuelos, renta de auto, etc.):* acláralo amable — aquí agendamos estos tours y paquetes de la Huasteca — y ofrece pasarlo con el equipo si aplica.

━━━━━━━━━━━━━━━━━━━━━━━━
🧭 REGLAS
━━━━━━━━━━━━━━━━━━━━━━━━
• Responde SIEMPRE en español, cálido y breve (es WhatsApp: apunta a 10–15 líneas salvo que te pidan el detalle completo).
• *FORMATO WHATSAPP, NO MARKDOWN.* Negritas con UN asterisco: *así*. Nunca uses \`**doble asterisco**\`, ni \`###\` para títulos, ni \`---\` como separador: WhatsApp no los entiende y el cliente ve los símbolos en pantalla. Para una lista usa "• ".
• NUNCA afirmes cifras específicas (alturas, profundidades, distancias, precios, horarios) de memoria: usa lo que devuelven las herramientas; si no tienes el dato, dilo sin inventar.
• Tampoco afirmes HECHOS de memoria (qué incluye, qué es un lugar, si pasamos por el cliente): revisa la sección "LO QUE NUNCA DEBES PROMETER".
• *Correos:* solo di que enviaste la cotización por correo si la herramienta devolvió *emailEnviado: true*. Si es false o no hay correo, no lo menciones siquiera.
• Confirma los datos clave en cada paso (tour, fecha, personas). Menciona el folio cuando exista.
• No uses emojis en exceso, solo donde den impacto.
• Si no hay datos suficientes, pregunta — no asumas. Nunca prometas algo que el catálogo no dice.`;
}

// ══════════════════════════════════════════════════════════════
// PROCESAR MENSAJE (loop agéntico)
// ══════════════════════════════════════════════════════════════
async function processMessage(phone, message) {
  pushHistory(phone, "user", message);
  const session = getSession(phone);

  let response = await client.messages.create({
    ...requestBase(),
    messages: session.history,
  });

  // Resumen del paquete a medida generado por el servidor en ESTE turno. Se
  // guarda aquí porque pedirlo por prompt no alcanza: el modelo saltaba directo
  // a los datos bancarios sin enseñar qué se estaba apartando. Mismo criterio
  // que `toWhatsAppFormat()` — determinista, no depende de que obedezca.
  let resumenPendiente = null;

  let guard = 0;
  while (response.stop_reason === "tool_use" && guard++ < 6) {
    session.history.push({ role: "assistant", content: response.content });

    const toolResults = [];
    for (const block of response.content) {
      if (block.type === "tool_use") {
        const result = await executeTool(block.name, block.input || {}, phone);
        if ((block.name === "crear_cotizacion" || block.name === "registrar_cotizacion") && result && result.folio) {
          session.lastFolio = result.folio;
        }
        if (block.name === "cotizar_paquete_personalizado" && result && result.folio) {
          session.lastFolio = result.folio;
          if (result.resumenWhatsApp) {
            resumenPendiente = { texto: result.resumenWhatsApp, total: result.total };
          }
        }
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(result) });
      }
    }
    session.history.push({ role: "user", content: toolResults });

    response = await client.messages.create({
      ...requestBase(),
      messages: session.history,
    });
  }

  const textBlock = response.content.find((b) => b.type === "text");
  let reply = (textBlock && textBlock.text) || "Disculpa, tuve un problemita. ¿Me lo repites? 🙏";
  session.history.push({ role: "assistant", content: response.content });

  // Si en este turno se armó un paquete, el resumen va SIEMPRE por delante: el
  // cliente tiene que ver qué aparta antes de leer una CLABE.
  // La señal de "ya lo incluyó" es el TOTAL del viaje, no el folio: el modelo
  // cita el folio junto a los datos bancarios pero omite el desglose, que es
  // justo lo que el cliente necesita revisar.
  if (resumenPendiente) {
    const totalTxt = Number(resumenPendiente.total).toLocaleString("es-MX");
    if (!reply.includes(totalTxt)) {
      reply = `${resumenPendiente.texto}\n\n${reply}`;
    }
  }

  // El orden importa: primero markdown → WhatsApp, luego despegar los links.
  return sanitizeLinks(toWhatsAppFormat(reply));
}

module.exports = { processMessage, buildSystemPrompt, recomendarLocal, executeTool, needsHuman, setApiClient, sanitizeLinks, toWhatsAppFormat, tools };
