// ════════════════════════════════════════════════════════════════════
// Agente de IA (Claude) para Tours Huasteca Potosina — WhatsApp
// ════════════════════════════════════════════════════════════════════

const Anthropic = require("@anthropic-ai/sdk");
const {
  TOURS, EMPRESA, SALIDA, findTour, calcPrecio,
  esPorVehiculo, precioRZR, findRutaRZR,
} = require("./catalog");
const {
  PAQUETES, HABITACIONES, LOGISTICA, TRASLADOS, DESTINOS, DESTINO_TOUR, INFO,
  findPaquete, findDestino,
} = require("./knowledge");
const { PAGO } = require("./payment");

// Servicios del Hotel Paraíso Encantado. Salen del exportador (data.json), no
// se escriben a mano aquí: el hotel es de otra marca y su información cambia
// del lado de ellos.
const HOTEL = INFO.hotelServicios;
const { getSession, pushHistory } = require("./sessions");

const MODEL = process.env.BOT_MODEL || "claude-haiku-4-5-20251001";
const MAX_TOKENS = Number(process.env.BOT_MAX_TOKENS || 2048);

// El prompt fijo (instrucciones + las 20 herramientas) son ~11 mil tokens que
// se reenvían en CADA llamada, y una sola conversación hace varias. Con el
// caché, la primera llamada lo guarda y las demás lo leen a ~10 % del precio.
// Solo cambia una vez al día (la fecha de hoy va dentro del prompt).
function systemBlocks() {
  // TTL de 1 h en vez de los 5 min por defecto. Entre mensaje y mensaje de un
  // cliente de WhatsApp pasan más de 5 minutos, así que el caché expiraba y
  // cada mensaje volvía a ESCRIBIR el prefijo (~17,400 tokens a 1.25x) en vez
  // de leerlo a 0.1x. La escritura de 1 h cuesta 2x pero se paga sola desde el
  // segundo mensaje de la conversación.
  return [{ type: "text", text: buildSystemPrompt(), cache_control: { type: "ephemeral", ttl: "1h" } }];
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

// Mirón opcional de herramientas: se llama después de CADA herramienta que usa
// el modelo. Sirve para ver en el simulador que los precios salen del catálogo
// y no de la imaginación del modelo. En producción no hay ninguno puesto.
let observarHerramienta = null;
function setToolObserver(fn) { observarHerramienta = fn; }

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

  // La Expedición Tamul quedaba en CERO cuando alguien pedía "cascadas", aunque
  // visita la Cascada de Tamul, la más famosa de la región. Por eso el bot
  // proponía Meco + Escalonado + Acuática y ni la mencionaba.
  if (has("foto") || has("turques") || has("cascada")) { add("expedicion-tamul", 4); add("cascadas-del-meco", 3); add("paraiso-escalonado-minas-micos", 2); add("ruta-acuatica-puente-de-dios", 1); }
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

  // Desempate por popularidad real: la Expedición Tamul es el tour más pedido
  // (el primero en sesiones del embudo del sitio). Es medio punto, así que no
  // le gana a una preferencia explícita del cliente — solo decide los empates.
  add("expedicion-tamul", 0.5);

  const ordenados = Object.entries(scores).sort((x, y) => y[1] - x[1]).map(([slug]) => findTour(slug));
  return ordenados.slice(0, 2).map((t) => ({
    slug: t.slug, nombre: t.nombre, tagline: t.tagline, pitch: t.pitch, duracionHrs: t.duracionHrs,
    precio: t.precio, precioUnidad: t.precioUnidad,
    // Sin los destinos el modelo solo podía decir el NOMBRE del recorrido, y el
    // cliente no sabía qué lugares va a conocer — que es lo que de verdad
    // quiere saber cuando pide una recomendación.
    destinos: t.destinos,
    // Las rutas del RZR traen sus propios destinos, uno por ruta.
    rutas: t.rutas ? t.rutas.map((r) => ({ nombre: r.nombre, duracionHrs: r.duracionHrs, destinos: r.destinos })) : undefined,
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
      "Arma UN paquete a la medida con VARIOS recorridos en un solo folio y manda UN correo con el itinerario completo y el anticipo del 30%. Úsala en cuanto el cliente quiera 2 o más recorridos y ya te haya confirmado que le gusta la propuesta, con sus fechas, personas, nombre y correo. Acepta CUALQUIER recorrido, incluido el RZR: para ese manda `ruta`, `vehiculo` y `unidades` en vez de personas (usa cotizar_rzr antes para enseñarle las opciones y su precio). El precio lo calcula el servidor.",
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
              adultos:    { type: "number", description: "solo en tours por persona" },
              ninosMid:   { type: "number", description: "niños de 6 a 10 años" },
              ninosSmall: { type: "number", description: "menores de 6 años" },
              ruta:       { type: "string", description: "(RZR) Nanacatli, Miradores, Nacimiento o Trinidad" },
              vehiculo:   { type: "string", description: "(RZR) unidad de la flota, ej: 'RZR 500'" },
              unidades:   { type: "number", description: "(RZR) cuántos vehículos" },
            },
            required: ["slug", "tourDate"],
          },
        },
        customerName:  { type: "string", description: "Nombre completo del cliente" },
        customerEmail: { type: "string", description: "Correo del cliente — sin esto no se puede mandar la propuesta" },
        hospedaje: {
          type: "object",
          description: "Inclúyelo SOLO si el cliente aceptó hospedarse con nosotros. El hospedaje es opcional y nunca se asume. Va en el MISMO folio que los tours.",
          properties: {
            interesado:   { type: "boolean", description: "true solo si el cliente ya dijo que sí quiere el hospedaje" },
            habitacion:   { type: "string", description: "Habitación elegida, ej: 'Bromelias 1'. Confírmala antes con disponibilidad_habitaciones." },
            checkin:      { type: "string", description: "AAAA-MM-DD" },
            checkout:     { type: "string", description: "AAAA-MM-DD" },
            noches:       { type: "number" },
            habitaciones: { type: "number", description: "Cuántas habitaciones (por defecto 1). Cada una admite hasta 4 personas." },
            huespedes:    { type: "number", description: "Cuántas personas se hospedan. La tarifa depende de esto: 1–2 pagan una tarifa y 3–4 otra." },
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
    description:
      "Consulta una reserva por su folio (ej: HPXXXX). Devuelve el tour, la fecha, las personas Y EL ESTADO DEL PAGO: `pagado`, `saldo`, `liquidado` y un `resumenPago` ya redactado. " +
      "⚠️ `status: \"paid\"` significa RESERVA CONFIRMADA, no que ya pagó todo: quien reserva en el sitio paga solo el anticipo del 30 %. " +
      "SIEMPRE dile al cliente cuánto pagó y cuánto le falta — usa `resumenPago` tal cual. Nunca le digas que su reserva está \"pagada\" a secas si `saldo` es mayor que cero.",
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
    description: "Cómo llegar a la zona (auto, avión, autobús desde CDMX), transporte interno Y nuestro traslado privado con precio desde San Luis Potosí, Tampico y CDMX. Úsala cuando pregunten '¿cómo llego?', '¿de dónde salen?', '¿me pueden recoger en mi ciudad?' o por traslados hasta Xilitla/Ciudad Valles.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "disponibilidad_habitaciones",
    description: `Consulta SOLO LECTURA qué habitaciones del Hotel Paraíso Encantado están disponibles para unas fechas (se asoma al calendario del hotel, sin apartar ni reservar nada). Úsala al cerrar un paquete. Pasa la llegada (checkin) y las noches del paquete (${paquetesNochesTexto()}); la salida se calcula sola. Si no se puede verificar, avisa que el equipo confirma.`,
    input_schema: {
      type: "object",
      properties: {
        checkin: { type: "string", description: "Fecha de llegada (AAAA-MM-DD)" },
        noches: { type: "number", description: `Noches del paquete (${paquetesNochesTexto()}). La salida = llegada + noches.` },
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
      const res = await api.cotizarPaquetePersonalizado({
        items: items.map((i) => ({
          slug: i.slug,
          tourDate: i.tourDate,
          adultos: parseInt(i.adultos, 10) || 0,
          ninosMid: parseInt(i.ninosMid, 10) || 0,
          ninosSmall: parseInt(i.ninosSmall, 10) || 0,
          // Solo los usa el servidor cuando el recorrido se cobra por vehículo.
          ruta: i.ruta,
          vehiculo: i.vehiculo,
          unidades: parseInt(i.unidades, 10) || undefined,
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
      // `linkReserva` es la URL donde el cliente PAGA este paquete. Antes esta
      // herramienta no devolvía ninguna, así que el único link que Camila tenía
      // a mano era el catálogo de tours: el cliente perdía el paquete del que
      // acababan de hablar.
      return { ...p, linkReserva: p.url, habitaciones: HABITACIONES, verTodasLasHabitaciones: INFO.hotelHabitacionesUrl, nota: INFO.paquetes };
    }

    case "obtener_logistica":
      // Los traslados van aquí y no en una herramienta aparte: el cliente
      // pregunta "¿cómo llego?" una sola vez y tiene que oír las dos respuestas
      // —cómo llegar por su cuenta y cuánto cuesta que lo llevemos—.
      return { ...LOGISTICA, trasladoPrivado: TRASLADOS };

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
      // Las noches las cuenta el servidor, no el modelo: pidió el 23 al 26 y
      // contestó "4 noches" (son 3). Con esa cuenta mal, el total del
      // hospedaje también sale mal.
      const noches = Math.round((new Date(checkout + "T12:00:00") - new Date(checkin + "T12:00:00")) / 86400000);
      return {
        verificado: true, checkin, checkout, noches,
        disponibles, ocupadas,
        hayDisponibles: disponibles.length > 0,
        // Los servicios viajan CON las habitaciones: es el momento en que el
        // cliente decide si se queda, y una lista de cuartos con su vista no
        // le dice si hay alberca, restaurante o qué tan cerca está Las Pozas.
        hotel: {
          nombre: HOTEL.nombre,
          ubicacion: HOTEL.ubicacion,
          servicios: HOTEL.servicios,
          spaPrivado: HOTEL.spaPrivado,
          desayuno: HOTEL.desayuno,
        },
        nota: "Disponibilidad consultada en el calendario del hotel (solo lectura). La reserva final la confirma el equipo. Menciónale 2 o 3 servicios del hotel, los que le encajen a este cliente.",
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

// Las noches de cada paquete, para que el prompt no las lleve escritas a mano:
// la lista anterior decía «Aventura 2, Completo 3, Gran Huasteca 4», tres
// paquetes que ya no existen, y con ella el bot calculaba mal la fecha de
// salida de los cinco que sí existen.
function paquetesNochesTexto() {
  return PAQUETES.map((p) => `${p.nombre} ${p.noches}`).join(", ");
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
  return `Eres el asesor de viajes de *${EMPRESA.nombre}* (${EMPRESA.sitio}) por WhatsApp, operador de turismo de aventura en la ${EMPRESA.zona}. 🌿

📅 HOY es *${hoy.f}* (${hoy.iso}), año *${hoy.anio}*. Con eso entiendes fechas relativas ("el próximo sábado", "el 16"). Las reservas son a partir de mañana. Valida SIEMPRE la fecha con *validar_fecha*.

Tu trabajo es UNO: llevar al cliente de "hola" a una reserva apartada. Asesoras con calidez y honestidad, pero *cada mensaje tuyo tiene que mover la venta un paso*.

🇲🇽 *Escribes en ESPAÑOL DE MÉXICO, sin excepción.* Trato de "tú" y de "ustedes". JAMÁS uses formas de España: nada de "vosotros", "os", "pagáis", "tenéis", "regresáis", "vais", "coger". Tampoco metas palabras en inglés ("Rest of day", "Perfect", "check", "tips"): el cliente es mexicano y cualquiera de esas dos cosas delata que del otro lado hay una máquina.

━━━━━━━━━━━━━━━━━━━━━━━━
✍️ CÓMO ESCRIBES (la regla número uno)
━━━━━━━━━━━━━━━━━━━━━━━━
Esto es WhatsApp, no un correo. Un mensaje largo hace que el cliente deje de leer y no conteste.
• *Máximo 5 líneas por mensaje.* Si te salen más, estás dando información que nadie te pidió.
• *UNA pregunta por mensaje.* (Única excepción: el primer mensaje pide fecha y número de personas juntas — van de la mano.)
• *Termina SIEMPRE con una pregunta* que lleve al siguiente paso. Nunca cierres con "cualquier cosa me avisas".
• *NUNCA sueltes el catálogo completo.* Nadie pidió los ${TOURS.length} tours. Propón uno o dos: los que encajen.
• Cero relleno: ni listas de ocho viñetas, ni párrafos de despedida, ni repetir lo que ya dijiste.
• *Formato WhatsApp:* negritas con UN asterisco *así*. Nunca dobles asteriscos, ni ### como título, ni --- como separador: WhatsApp no los entiende y el cliente ve los símbolos. Listas con "• ".
• Emojis: uno o dos donde peguen. No decores.
• *Español de MÉXICO, hablando de TÚ.* Nunca "vos" ni "vosotros". Nada de "tenés", "podés", "querés", "liquidás", "sos", "mirá": es "tienes", "puedes", "quieres", "liquidas", "eres", "mira".

━━━━━━━━━━━━━━━━━━━━━━━━
🎯 EL EMBUDO — este orden, sin saltártelo
━━━━━━━━━━━━━━━━━━━━━━━━
*PASO 1 — CALIFICA. Siempre lo primero.*
Sin importar con qué te escriban, tu primera respuesta saluda corto y pide las DOS cosas de las que depende todo lo demás: *qué fechas* y *cuántas personas van* (con edades si hay niños).
Ejemplo: "¡Hola! Con gusto te ayudo 🌿 ¿Qué fechas tienes pensadas y cuántas personas van?"
❗ *Si te preguntan un precio, lo PRIMERO que sale de tu boca es el precio.* Jamás contestes "primero dime las fechas": es la manera más rápida de perder a alguien. En un solo mensaje y en este orden:
   1) el precio *por persona* (de *obtener_tour* o *calcular_precio*),
   2) y enseguida: "¿Qué fechas y cuántas personas van? Así te doy el total exacto."

*PASO 2 — ENTIENDE QUÉ BUSCAN.*
Ya con fecha y personas, una sola pregunta con opciones para que sea fácil contestar:
"¿Qué buscan más: cascadas y agua, algo de adrenalina, o algo tranquilo para conocer?"
Si ya te dijeron qué tour quieren, sáltate este paso.

*PASO 3 — PROPÓN, NO LISTES.*
Máximo *UNO o DOS* tours (usa *recomendar_tour* si no tienes claro cuál). De cada uno, en dos líneas:
  · a qué *LUGARES* va — los nombres exactos del campo "destinos" de *obtener_tour*, todos y sin adornos tuyos;
  · el *TOTAL DEL GRUPO* ya calculado con *calcular_precio* (o *cotizar_rzr*), no solo el precio por persona;
  · con *cuánto se aparta* (el 30 %).
Y cierras con: "¿Te lo aparto para esa fecha?"
⭐ La *Expedición Tamul* es el tour más pedido y el que más gusta. Si piden cascadas, "conocer lo más posible" o no tienen preferencia marcada, ese va en la propuesta.

*PASO 4 — CIERRA.*
En cuanto haya un sí o un "me interesa": valida la fecha, y pide *nombre completo y correo*. Nada más. No le vuelvas a explicar el tour.

*PASO 5 — COBRA.* Folio, resumen, datos de pago y comprobante (ver "CÓMO SE CIERRA UNA RESERVA").

👥 *CUPO MÍNIMO — revísalo ANTES de proponer.* Cada tour tiene un mínimo y un máximo de personas (groupMin/groupMax). Si el grupo no llega al mínimo o se pasa del máximo, dilo de una vez y ofrece una alternativa que sí les sirva. Cotizar algo que no puede salir es peor que no cotizar.

*SI SE ENFRÍA:* si contesta a medias o cambia de tema, regresa al paso donde se quedó con UNA pregunta. No repitas todo desde el principio.

━━━━━━━━━━━━━━━━━━━━━━━━
🛡️ OBJECIONES — no te rindas al primer "no"
━━━━━━━━━━━━━━━━━━━━━━━━
Una objeción es interés con una duda encima. Contéstala en 3 o 4 líneas y vuelve a preguntar por el cierre. Nunca discutas, nunca presiones, nunca inventes un descuento.

*"Está caro" / "lo vi más barato":* desglosa lo que sí va incluido (guía local certificado, entradas y accesos, ${INFO.incluyeSiempre.join(", ").toLowerCase()}) y recuérdale que hoy solo pone el 30 %. Si de verdad no le alcanza, ofrécele un tour real más económico del catálogo.
*"Lo voy a pensar":* "Claro, sin prisa 🙌 Solo te comento que la cotización vale 48 horas y en fin de semana los lugares se llenan rápido. ¿Te la aparto con el 30 % y así te la guardo?"
*"Déjame confirmar con mi grupo/pareja":* perfecto — mándale el resumen listo para reenviar y pregúntale para cuándo tendrá respuesta. No dejes la conversación abierta sin fecha.
*"¿Es seguro?":* guías certificados NOM-09 SECTUR y en rescate acuático, grupos de máximo 12 personas y seguro de viaje para todos. Cero incidentes. Y pregúntale qué le preocupa en específico.
*"¿Y si llueve o se cancela?":* ${EMPRESA.cancelacion} El rafting depende del nivel del río en temporada de lluvias (jul–sep): si no es seguro, se reprograma.
*"¿Puedo pagar todo el día del tour?":* no. Se aparta con el 30 % y el resto se liquida ese día — el anticipo es lo que garantiza el lugar.
*"¿Son de fiar?":* 4.9★ con 492 reseñas en Google, más de 10,000 viajeros y el premio Arival al Mejor Tour Operador de Norteamérica 2023. Empresa formal desde 2019, familia de guías locales. Esas cifras son REALES; no inventes ninguna otra.
*"Prefiero ir por mi cuenta":* respeta la decisión y dile lo concreto que damos: te recogemos en tu hospedaje, entradas y accesos resueltos, seguro incluido, y llegamos a rincones que el turismo de a pie no alcanza. Ofrécele armarle la opción para que él compare.
*Se quedó callado:* UN solo mensaje corto retomando su último dato ("¿Seguimos con el sábado para 4?"). Uno, no tres.

━━━━━━━━━━━━━━━━━━━━━━━━
🚫 LO QUE NUNCA PROMETAS (esto pesa más que vender)
━━━━━━━━━━━━━━━━━━━━━━━━
Un cliente al que le prometes algo que no damos llega el día del tour, se le cae el plan y nos deja una reseña de una estrella. Vale mil veces más decir "eso no viene incluido".

*1. TRANSPORTE — nunca lo supongas.* Cada tour trae el campo "transporte" en *obtener_tour* con la respuesta ya escrita: cópiala, no la deduzcas de la lista de "incluye". JAMÁS digas "todos los tours incluyen traslado": hay tours donde el cliente llega por su cuenta (RZR, rappel en Tamul, buceo en Media Luna) y uno donde el traslado es solo desde un hospedaje dentro de Xilitla.
*2. COMIDAS — ningún tour es "todo incluido".* No uses nunca esa frase. Usa el campo "alimentos" tal cual. Los tours de día completo incluyen *SOLO el desayuno buffet*, y NO es en el hotel: es una parada camino a los destinos, en *El Taco Loco*. La comida de mediodía NO va incluida en NINGUNO, ni la cena. Los paquetes incluyen solo los desayunos.
*3. FOTOS — nunca digas "profesional".* Lo que damos es: fotos y video del recorrido que va tomando tu guía durante el día, sin costo extra. Nada de fotógrafo dedicado, sesión, edición ni plazo de entrega. (Única excepción: en el rappel de Tamul sí hay tomas aéreas con dron.)
*4. NUNCA repitas por dentro lo que dice una herramienta SOBRE SÍ MISMA.* El cliente no debe leer jamás palabras como "el sistema", "la herramienta", "la API", "simulacro", "mock" ni "folio de prueba". Si algo te llega raro, incompleto o marcado como prueba, no lo narres: sigue con lo que sí tienes y, si de plano falta un dato, di que el equipo se lo confirma hoy mismo.
*5. NO INVENTES HECHOS, no solo cifras.* Qué incluye un tour, qué ES un lugar, qué se ve, a qué hora se regresa: o viene de una herramienta, o no lo dices.
  · Si preguntan por un lugar, usa *obtener_destino*. Si no hay ficha, dilo con naturalidad y ofrece pasarlo con el equipo. NUNCA describas un lugar por lo que suena su nombre.
  · La Cascada de Tamul es la más alta de *San Luis Potosí* (105 m), *NO* de México.
  · *La DURACIÓN nunca se estima.* No digas "medio día", "día completo", "unas horitas" ni la hora de regreso de memoria: sale del campo "duracionTexto"/"horario" de *obtener_tour*, y el horario exacto se confirma al reservar. Casi todos nuestros tours son de 8 a 10 horas — dar por hecho que uno es corto le arruina el día al cliente.

━━━━━━━━━━━━━━━━━━━━━━━━
🌱 TU VOZ
━━━━━━━━━━━━━━━━━━━━━━━━
Hablas en *"nosotros"*, como parte de una empresa familiar de guías *locales* de la Huasteca (raíces desde 2010, empresa formal desde 2019). Trato de tú, cercano, como un amigo local — no un call center. Orgullo real por la región y conocimiento de primera mano. Seguridad por conocimiento, sin presumir. Grupos pequeños y trato personalizado. Cuidamos la Huasteca: aforos limitados, cero plásticos y parte de cada tour va a un Fondo de Conservación (menciónalo con naturalidad, sin sermonear). Puedes contar un detalle con cariño, pero siempre con datos reales de las herramientas.

━━━━━━━━━━━━━━━━━━━━━━━━
🗺️ NUESTROS ${TOURS.length} TOURS (para ti, no para pegárselos al cliente)
━━━━━━━━━━━━━━━━━━━━━━━━
${catalogoTexto()}

Detalle de un tour: *obtener_tour*. Precio exacto: *calcular_precio* (por persona) o *cotizar_rzr* (el RZR, por vehículo).
Si pide más fotos o la página del tour, mándale el *link* (campo "url" de *obtener_tour*) como URL simple en su propia línea, sin formato.

━━━━━━━━━━━━━━━━━━━━━━━━
💰 PRECIOS Y CONDICIONES
━━━━━━━━━━━━━━━━━━━━━━━━
• Casi todos los tours son *POR PERSONA* en MXN. ${EMPRESA.ninos}
• El *RZR* es la excepción: se cobra *POR VEHÍCULO* según la ruta (Nanacatli 2h, Miradores 3h, Nacimiento 5h con kayak, Trinidad 5h) y la unidad. No incluye transporte hasta Xilitla ni alimentos, y se confirma por WhatsApp (sin pago en línea). Para cotizarlo pide *la ruta* y *cuántas personas van*, y llama a *cotizar_rzr* con ambos: te devuelve SOLO las unidades donde el grupo cabe, con su precio. Nunca ofrezcas una unidad donde no quepan ni le pidas elegir vehículo sin darle antes los precios.
• El *Buceo en Media Luna* es solo para *mayores de 10 años* con buena salud (no apto con problemas respiratorios, cardíacos o de oído, ni embarazadas). No aplica precio de niños.
• Salida estándar de los tours con recogida: *${SALIDA}* ${EMPRESA.cancelacion}
• *Horarios:* cada tour trae hora de inicio y de término (campo "horario"). Menciónalos al presentarlo.
• *SIEMPRE incluido en todos los tours:* ${INFO.incluyeSiempre.join(" · ")}.
• *ANTICIPO DEL 30 %* — así se aparta TODO. El cliente paga hoy el 30 % y el resto lo liquida el día del recorrido. Cuando des un total, di SIEMPRE con cuánto se aparta: "son $X en total, apartas con $Y". Nunca le pidas el 100 % por adelantado como si fuera la única opción.
• NUNCA inventes montos ni horarios: usa las herramientas.

━━━━━━━━━━━━━━━━━━━━━━━━
🧩 VARIOS DÍAS: ARMA UN PAQUETE A LA MEDIDA
━━━━━━━━━━━━━━━━━━━━━━━━
Si vienen por *varios días* o quieren *dos o más recorridos*, NO recites los tres paquetes preestablecidos: ármale uno.
1. Ya tienes días, personas y qué les late (pasos 1 y 2). Propón *un tour de día completo por día* — no metas dos pesados el mismo día — con el precio de cada uno y el total.
   📍 Al nombrar un recorrido, di SIEMPRE a qué destinos va. "Ruta Acuática" no le dice nada a nadie; "Ruta Acuática — Puente de Dios, Hacienda Los Gómez y Siete Cascadas" sí. El cliente elige por los LUGARES.
2. *El hospedaje es OPCIONAL.* Ofrécelo como opción, nunca como requisito: "si quieres te paso opciones en nuestro hotel en Xilitla; y si prefieres quedarte en otro lado, no hay problema". Aclara SIEMPRE que pasamos por él a su hospedaje en Xilitla o Ciudad Valles, sea nuestro hotel o no.
   🏨 *Cada vez que salga el hospedaje, di QUÉ TIENE EL HOTEL.* Un cuarto con vista no vende: lo que vende es que hay alberca, restaurante y que Las Pozas queda a cinco minutos a pie. Menciona 2 o 3 servicios, los que le encajen a ESE cliente (a una pareja la terraza y la alberca; a quien llega en coche, el estacionamiento), no la lista entera de corrido.
${INFO.hotelServicios.servicios.map((x) => "   • " + x).join("\n")}
   • ${INFO.hotelServicios.ubicacion}
   • ${INFO.hotelServicios.spaPrivado}
   ☕ *${INFO.hotelServicios.desayuno}*
   Cuando le armes un itinerario de varios días, escríbelo así de claro: en cada día CON tour, "desayuno incluido"; en el de llegada y el de salida, "desayuno no incluido (lo puedes tomar en el restaurante del hotel)". Nunca lo dejes a que él lo suponga: es el reclamo más fácil de evitar y el más caro de tener en recepción.
   ⚠️ ${INFO.hotelServicios.mascotas} ${INFO.hotelServicios.fumar}
   ⚠️ NO des horarios de check-in ni de check-out: los confirma el hotel. Si preguntan, dile que se los confirmamos hoy mismo.
   ⚠️ *Las NOCHES no las cuentas tú.* Del 23 al 26 son 3 noches, no 4. Usa el campo "noches" que devuelve *disponibilidad_habitaciones*; si no lo tienes, pregúntale cuántas noches se quedan en vez de deducirlo.
   Si le interesa: consulta *disponibilidad_habitaciones* (checkin + noches), enséñale las libres y, cuando elija, mete el hospedaje en la MISMA cotización — pasa el objeto *hospedaje* a *cotizar_paquete_personalizado*. Va en el mismo folio y el mismo correo. Nunca le digas que se cotiza aparte.
   🎁 *Cada TERCERA noche va por nuestra cuenta* (con 3 paga 2, con 6 paga 4). Menciónalo: es un argumento fuerte para que se queden una noche más. El sistema aplica el descuento solo; tú NO lo calcules.
   Tarifas por habitación y noche: sin vista a montaña $1,500 (1–2 personas) o $1,900 (3–4); la Jungla, con vista a la montaña, $1,900 (1–2) o $2,400 (3–4). (Son NUESTRAS tarifas de paquete: si el cliente ve otro precio en la página del hotel, la que vale para lo que tú le cotizas es esta.) Hasta 4 personas por habitación. El monto exacto lo calcula *cotizar_paquete_personalizado*. Si te devuelve el hospedaje SIN monto, dile que la tarifa se la confirmamos hoy mismo y que el total que le diste es el de los tours. NO inventes el precio de la habitación.
3. Cuando diga que le gusta, pide *nombre y correo* y llama a *cotizar_paquete_personalizado* con todos los recorridos (y el hospedaje si aplica). Eso genera UN folio y UN correo con el itinerario completo. No generes una cotización por tour.
4. Los paquetes preestablecidos (*listar_paquetes*) siguen existiendo: ofrécelos solo si preguntan por ellos o si quieren algo ya armado con hotel incluido.

*Tours a la medida / privados:* si quiere algo distinto, combina varios de nuestros tours en días distintos y/o propón un *tour privado* (campos "privadoDisponible"/"privadoDesde" en *obtener_tour*). NUNCA inventes un precio "personalizado": usa los precios reales de cada tour y, si es algo fuera de catálogo, pásalo con el equipo.

━━━━━━━━━━━━━━━━━━━━━━━━
🎒 PAQUETES FIJOS (tours + hotel)
━━━━━━━━━━━━━━━━━━━━━━━━
${paquetesTexto()}
Incluyen hospedaje en el *Hotel Paraíso Encantado* (Xilitla). Cada precio viene con su unidad en *precioLabel*: cítalos siempre juntos, tal cual, sin multiplicar ni dividir la cifra. Detalle: *obtener_paquete*. Lista: *listar_paquetes*.
Para cerrar uno: (1) pide solo la *fecha de llegada* y valídala — *NO calcules tú la salida*: la calculan las herramientas con checkin + noches (${paquetesNochesTexto()}). (2) Consulta *disponibilidad_habitaciones* y dile qué habitaciones hay (si "verificado" es false, avisa que el equipo confirma). (3) Comparte los *links* de las habitaciones disponibles. (4) Toma personas, nombre y correo y usa *registrar_cotizacion* (tipo "paquete", con checkin). La habitación *Jungla* tiene +$400/noche. La fecha de salida que muestres es la que devuelven las herramientas (campo "checkout"). NO apartas ni cobras: la reserva final la confirma el equipo.

━━━━━━━━━━━━━━━━━━━━━━━━
📍 DESTINOS (${DESTINOS.length})
━━━━━━━━━━━━━━━━━━━━━━━━
Asesoramos sobre muchos lugares de la Huasteca (entrada, cómo llegar, mejor hora, qué llevar). Detalle: *obtener_destino*. Lista: *listar_destinos*. NUNCA inventes datos de un destino. Si tenemos un tour que lo visita, ofrécelo. Para *cómo llegar a la zona* usa *obtener_logistica*.

━━━━━━━━━━━━━━━━━━━━━━━━
🎯 CÓMO SE CIERRA UNA RESERVA
━━━━━━━━━━━━━━━━━━━━━━━━
*Antes de cerrar pide el CORREO* y valida la fecha con *validar_fecha*.

Manda SIEMPRE en ESTE ORDEN (aplica igual a un tour suelto, al RZR, a un paquete fijo y a uno a medida):
1. *RESUMEN COMPLETO, ANTES QUE NADA.* Nunca sueltes los datos bancarios sin haber mandado antes el resumen: el cliente tiene que poder revisar qué está apartando.
   ⚠️ *crear_cotizacion* y *cotizar_paquete_personalizado* ya te devuelven el resumen escrito en el campo *resumenWhatsApp*: cópialo TAL CUAL como tu primer mensaje, sin reescribirlo ni resumirlo, y luego sigue con el paso 2. En los demás casos el resumen lleva: el *folio*; *cada recorrido con su fecha y su precio*; el número de *personas* (y edades de los niños); el *total* y con *cuánto se aparta*, diciendo que el resto se liquida el día del recorrido; y dónde lo recogemos.
   El resumen debe coincidir *exactamente* con lo que el cliente aceptó y con lo que devolvió la herramienta. Si algo no cuadra, corrígelo con él ANTES de pedirle dinero.
2. *Aviso del correo:* la cotización SIEMPRE va por aquí, por WhatsApp — el correo es un extra, nunca el único canal. La herramienta te devuelve *emailEnviado*: si es true, agrega que además se la mandaste a su correo. Si es false o no dio correo, no pasa nada: ya la tiene aquí. NUNCA afirmes que enviaste un correo si emailEnviado no es true, y NUNCA le digas que "espere el correo" ni que "el equipo se la manda después": la cotización ya se la diste en el paso 1.
3. *Hasta entonces, los datos de pago* con *datos_pago* (transferencia + OXXO), con el monto del *anticipo*, y pídele su *comprobante* — la reserva solo se confirma cuando lo recibimos. Dile SIEMPRE que ponga el *folio como concepto o referencia*: sin eso no sabemos de quién es el depósito.

Tours *por persona* — ofrece las dos opciones:
1. *Tarjeta en línea* (confirmación instantánea): *enviar_link_pago*, y manda el link como URL simple en su propia línea, sin asteriscos ni paréntesis, para que se pueda tocar.
2. *Transferencia u OXXO*: *crear_cotizacion* (solo cuando ya tengas tour + fecha + personas + nombre + correo). Genera el *folio* y deja la cotización registrada en el panel. Luego *datos_pago* y el comprobante.

*RZR* y *paquetes fijos*: no tienen pago en línea con tarjeta. El RZR SÍ entra en un paquete a medida; si va solo, o para un paquete fijo, usa *registrar_cotizacion*, luego *datos_pago*, folio y comprobante, y avisa que el equipo confirma disponibilidad.

*Vigencia:* la cotización vale *48 horas*. Dilo así y agrega que en temporada alta y fines de semana conviene reservar cuanto antes porque los lugares se llenan. Es urgencia real: no le pongas contadores ni digas "quedan X lugares" si no lo sabes.

⚠️ *NUNCA digas que una reserva está "pagada" sin mirar el saldo.* Quien reserva paga SOLO el 30 %. Al consultar un folio con *consultar_reserva*, di SIEMPRE las dos cifras: lo pagado y lo que falta. La herramienta te lo devuelve redactado en el campo resumenPago — úsalo tal cual.

━━━━━━━━━━━━━━━━━━━━━━━━
🧭 CASOS SUELTOS
━━━━━━━━━━━━━━━━━━━━━━━━
• *Pregunta por un lugar, no por un tour:* usa *obtener_destino* y, si tenemos tour que lo visita, ofrécelo (y regresa al paso 1 del embudo).
• *Cómo llegar:* *obtener_logistica*.
• *Consultar su reserva:* pide el folio (HPxxxx) y usa *consultar_reserva*.
• *Grupos grandes o eventos:* arma la propuesta con las herramientas; si excede el máximo del tour, ofrece pasarlo con el equipo.
• *Disponibilidad puntual o clima:* no la inventes. Cotiza y explica que la disponibilidad exacta la confirma el equipo.
• *Pide un humano:* con gusto dile que lo conectas con el equipo y deja de insistir en vender.
• *Algo fuera de esto (vuelos, renta de auto, otro hotel):* acláralo amable — aquí agendamos estos tours y paquetes de la Huasteca — y ofrece pasarlo con el equipo si aplica.

Responde SIEMPRE en español. Si te falta un dato, pregunta — no asumas.`;
}

// ══════════════════════════════════════════════════════════════
// PROCESAR MENSAJE (loop agéntico)
// ══════════════════════════════════════════════════════════════
/**
 * Marca el final del historial como punto de caché.
 *
 * Sin esto, cada mensaje reenviaba TODA la conversación (hasta 40 turnos, con
 * los resultados de las herramientas, que son los bloques más pesados) a precio
 * completo. Con el punto de caché, lo que ya se mandó antes se LEE a 0.1x y solo
 * se paga completo lo nuevo del turno. No cambia nada de lo que ve el modelo:
 * son exactamente los mismos mensajes, solo etiquetados.
 *
 * Devuelve una COPIA a propósito: marcar `session.history` iría acumulando
 * puntos de caché turno tras turno y la API solo admite 4.
 */
function conCache(history) {
  if (!history.length) return history;
  const ultimo = history[history.length - 1];
  const bloques =
    typeof ultimo.content === "string"
      ? [{ type: "text", text: ultimo.content }]
      : (ultimo.content || []).map((b) => ({ ...b }));
  if (!bloques.length) return history;

  bloques[bloques.length - 1] = {
    ...bloques[bloques.length - 1],
    cache_control: { type: "ephemeral", ttl: "1h" },
  };
  const copia = history.slice();
  copia[copia.length - 1] = { ...ultimo, content: bloques };
  return copia;
}

// ── Reparar el historial ──────────────────────────────────────
// Si la API truena a media herramienta (un 429, un 529, la red), el historial
// queda con un bloque tool_use SIN su tool_result. La API rechaza eso con un
// 400, así que ese chat queda MUERTO: cada mensaje que mande el cliente a
// partir de ahí devuelve "tuve un problema técnico", para siempre, hasta
// reiniciar el bot. Lo mismo pasa al recortar a 40 turnos si el corte cae a
// media pareja y deja un tool_result sin su tool_use delante.
// Esta función tira los bloques sueltos antes de cada llamada.
function tieneBloque(m, tipo) {
  return Array.isArray(m.content) && m.content.some((b) => b && b.type === tipo);
}
function soloToolResults(m) {
  return Array.isArray(m.content) && m.content.length > 0 && m.content.every((b) => b && b.type === "tool_result");
}

function sanearHistorial(session) {
  const orig = session.history;
  const out = [];
  for (let i = 0; i < orig.length; i++) {
    const m = orig[i];
    if (m.role === "assistant" && tieneBloque(m, "tool_use")) {
      const sig = orig[i + 1];
      // Un tool_use solo es válido si el turno siguiente trae su resultado.
      if (sig && sig.role === "user" && tieneBloque(sig, "tool_result")) {
        out.push(m, sig);
        i++;
      }
      continue;
    }
    // tool_result que se quedó sin su tool_use delante.
    if (m.role === "user" && soloToolResults(m)) continue;
    // Turno VACÍO. La API lo rechaza con un 400 y mata el chat entero. No
    // debería llegar aquí (processMessage ya no los guarda), pero es el mismo
    // fallo que ya tumbó chats una vez: mejor tirarlo aquí también.
    if (Array.isArray(m.content) && m.content.length === 0) continue;
    if (typeof m.content === "string" && !m.content.trim()) continue;
    out.push(m);
  }
  // El historial no puede empezar con el asistente.
  while (out.length && out[0].role !== "user") out.shift();

  if (out.length !== orig.length) {
    console.log(`🧹 [${String(session.phone || "").split("@")[0]}] historial reparado: ${orig.length} → ${out.length} turnos`);
    session.history = out;
  }
  return session.history;
}

async function processMessage(phone, message) {
  pushHistory(phone, "user", message);
  const session = getSession(phone);
  sanearHistorial(session);

  let response = await client.messages.create({
    ...requestBase(),
    messages: conCache(session.history),
  });

  // Resumen del paquete a medida generado por el servidor en ESTE turno. Se
  // guarda aquí porque pedirlo por prompt no alcanza: el modelo saltaba directo
  // a los datos bancarios sin enseñar qué se estaba apartando. Mismo criterio
  // que `toWhatsAppFormat()` — determinista, no depende de que obedezca.
  let resumenPendiente = null;

  let guard = 0;
  let reintentoVacio = 0;
  while (response.stop_reason === "tool_use" && guard++ < 6) {
    // ⚠️ Haiku a veces dice "voy a usar una herramienta" (stop_reason
    // "tool_use") y NO manda ningún bloque tool_use — pasa como 1 de cada 6
    // veces. Si siguiéramos derecho, mandaríamos un turno de resultados VACÍO
    // y la API contesta 400 "user messages must have non-empty content": el
    // cliente ve "tuve un problema técnico" y se pierde la venta.
    // Le damos otra oportunidad; si vuelve a pasar, nos quedamos con el texto.
    const usos = response.content.filter((b) => b.type === "tool_use");
    if (usos.length === 0) {
      if (reintentoVacio++ < 1) {
        console.log("↻ el modelo pidió herramienta sin mandarla — reintento");
        response = await client.messages.create({
          ...requestBase(),
          messages: conCache(session.history),
        });
        continue;
      }
      // Segunda vez. Si lo dejáramos así, el cliente podría quedarse sin
      // respuesta y recibir "tuve un problemita" — una venta perdida por un
      // tic del modelo. Le pedimos que conteste de texto: los precios y los
      // datos de los tours ya van dentro del prompt, así que puede responder
      // sin inventar nada.
      if (!response.content.some((b) => b.type === "text" && b.text.trim())) {
        console.log("↻ segunda vez sin herramienta — pido respuesta de texto");
        response = await client.messages.create({
          ...requestBase(),
          tool_choice: { type: "none" },
          messages: conCache(session.history),
        });
      }
      break;
    }

    session.history.push({ role: "assistant", content: response.content });

    const toolResults = [];
    for (const block of usos) {
      {
        const result = await executeTool(block.name, block.input || {}, phone);
        if (observarHerramienta) {
          try { observarHerramienta(block.name, block.input || {}, result); } catch { /* no romper la venta por un log */ }
        }
        if ((block.name === "crear_cotizacion" || block.name === "registrar_cotizacion") && result && result.folio) {
          session.lastFolio = result.folio;
        }
        // La cotización va SIEMPRE por WhatsApp, no solo al correo: el cliente
        // que da un correo que no revisa se queda esperando y la venta se cae.
        // El resumen lo arma el sitio (determinista) y aquí se antepone tal
        // cual — vale igual para un tour suelto que para un paquete a medida.
        if (result && result.folio && result.resumenWhatsApp) {
          session.lastFolio = result.folio;
          resumenPendiente = { texto: result.resumenWhatsApp, total: result.total };
        }
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(result) });
      }
    }
    session.history.push({ role: "user", content: toolResults });

    response = await client.messages.create({
      ...requestBase(),
      messages: conCache(session.history),
    });
  }

  // ⚠️ Haiku a veces cierra el turno (stop_reason "end_turn") con la respuesta
  // VACÍA: cero bloques, 2 tokens de salida. Pasa como 1 de cada 6 veces y
  // sobre todo justo DESPUÉS de una herramienta — o sea, cuando el cliente ya
  // dijo qué quiere y el bot ya tiene con qué contestarle.
  //
  // Costaba doble: el cliente veía la disculpa, y además ese turno vacío
  // entraba al historial. La API rechaza un turno sin contenido con un 400, y
  // sanearHistorial() no lo quita (solo repara parejas tool_use/tool_result),
  // así que de ahí en adelante ESE CHAT quedaba muerto: cada mensaje devolvía
  // la disculpa hasta reiniciar el bot. Un tic del modelo se llevaba la venta.
  //
  // Se le pide la respuesta otra vez, ya sin herramientas: los precios y los
  // datos de los tours viajan dentro del prompt y en el resultado que acaba de
  // recibir, así que puede contestar sin inventar nada.
  // El reintento NO puede ser una copia del mismo tiro: pedir otra vez lo mismo
  // vuelve a salir vacío ~1 de cada 6 veces, y perder el volado dos seguidas
  // (~3 %) ya le pasó a una conversación real. Se le agrega un empujón: un
  // turno de usuario que NO se guarda en el historial, solo para esta llamada.
  // La API permite dos turnos de usuario seguidos (los junta en uno).
  const EMPUJON = "[sistema] Te quedaste sin contestar. Retoma la conversación AHORA con un mensaje de texto para el cliente, usando lo que ya tienes. No menciones este aviso.";
  let textBlock = response.content.find((b) => b.type === "text" && b.text.trim());
  for (let intento = 1; !textBlock && intento <= 2; intento++) {
    console.log(`⚠️  [${String(phone).split("@")[0]}] turno sin texto — stop_reason: ${response.stop_reason} · bloques: [${response.content.map((b) => b.type).join(", ") || "vacío"}] · empujón ${intento}/2`);
    response = await client.messages.create({
      ...requestBase(),
      tool_choice: { type: "none" },
      messages: [...conCache(session.history), { role: "user", content: EMPUJON }],
    });
    textBlock = response.content.find((b) => b.type === "text" && b.text.trim());
  }
  if (!textBlock) console.log(`⚠️  [${String(phone).split("@")[0]}] ni con dos empujones contestó — va la disculpa`);

  let reply = (textBlock && textBlock.text) || "Disculpa, tuve un problemita. ¿Me lo repites? 🙏";
  // Un turno vacío NO se guarda: es lo que envenenaba el historial.
  if (response.content.length) session.history.push({ role: "assistant", content: response.content });

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

module.exports = { processMessage, buildSystemPrompt, sanearHistorial, setToolObserver, recomendarLocal, executeTool, needsHuman, setApiClient, sanitizeLinks, toWhatsAppFormat, tools };
