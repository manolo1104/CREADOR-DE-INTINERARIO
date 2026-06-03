// ════════════════════════════════════════════════════════════════════
// Agente de IA (Claude) para Tours Huasteca Potosina — WhatsApp
// ════════════════════════════════════════════════════════════════════

const Anthropic = require("@anthropic-ai/sdk");
const { TOURS, EMPRESA, SALIDA, findTour, calcPrecio } = require("./catalog");
const { PAQUETES, DESTINOS, DESTINO_TOUR, INFO, findPaquete, findDestino } = require("./knowledge");
const { getSession, pushHistory } = require("./sessions");

const MODEL = process.env.BOT_MODEL || "claude-haiku-4-5-20251001";

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

// ── Detección de petición de humano ───────────────────────────
const HUMAN_REGEX = /\b(humano|asesor|agente|ejecutivo|persona real|operador|encargad[oa]|due[ñn]o)\b|hablar con (alguien|una persona|un humano)/i;
function needsHuman(text = "") {
  return HUMAN_REGEX.test(String(text).toLowerCase());
}

// ── Scoring local de recomendación (espejo del sitio) ─────────
function recomendarLocal({ intereses = [], grupo = "", actividad = "", destino = "" }) {
  const ints = intereses.map((i) => String(i).toLowerCase());
  const has = (kw) => ints.some((i) => i.includes(kw));
  const scores = Object.fromEntries(TOURS.map((t) => [t.slug, 0]));
  const add = (slug, n) => { if (scores[slug] !== undefined) scores[slug] += n; };

  if (has("foto") || has("turques") || has("cascada")) { add("cascadas-del-meco", 3); add("paraiso-escalonado-minas-micos", 2); add("rzr-xilitla", 1); }
  if (has("extrem") || has("adrenalin") || has("aventura")) { add("rappel-tamul", 4); add("expedicion-tamul", 3); add("rzr-xilitla", 3); add("ruta-acuatica-puente-de-dios", 2); }
  if (has("arte") || has("cultura")) { add("ruta-surrealista-edward-james", 3); }
  if (has("relax") || has("paz") || has("desconect")) { add("paraiso-escalonado-minas-micos", 2); add("cascadas-del-meco", 1); }

  const g = String(grupo).toLowerCase();
  if (g.includes("familia") || g.includes("niñ") || g.includes("nin")) { add("paraiso-escalonado-minas-micos", 3); add("rzr-xilitla", 2); add("cascadas-del-meco", 1); add("rappel-tamul", -4); }
  if (g.includes("amig")) { add("rzr-xilitla", 3); add("rappel-tamul", 2); add("expedicion-tamul", 2); add("ruta-acuatica-puente-de-dios", 1); }
  if (g.includes("pareja")) { add("ruta-surrealista-edward-james", 1); add("cascadas-del-meco", 1); add("expedicion-tamul", 1); }

  const a = String(actividad).toLowerCase();
  if (a.includes("intens")) { add("rappel-tamul", 3); add("rzr-xilitla", 2); add("expedicion-tamul", 2); add("ruta-acuatica-puente-de-dios", 1); }
  if (a.includes("moder")) { add("rzr-xilitla", 1); add("expedicion-tamul", 1); }
  if (a.includes("tranquil")) { add("paraiso-escalonado-minas-micos", 2); add("ruta-surrealista-edward-james", 1); add("rappel-tamul", -2); }

  const d = String(destino).toLowerCase();
  if (d.includes("rzr") || d.includes("off-road") || d.includes("nanacatli")) add("rzr-xilitla", 4);
  if (d.includes("tamul")) { add("expedicion-tamul", 4); add("rappel-tamul", 3); }
  if (d.includes("pozas") || d.includes("edward") || d.includes("xilitla")) add("ruta-surrealista-edward-james", 3);
  if (d.includes("meco")) add("cascadas-del-meco", 4);
  if (d.includes("minas") || d.includes("micos")) add("paraiso-escalonado-minas-micos", 4);
  if (d.includes("puente") || d.includes("tamasopo")) add("ruta-acuatica-puente-de-dios", 4);

  const ordenados = Object.entries(scores).sort((x, y) => y[1] - x[1]).map(([slug]) => findTour(slug));
  return ordenados.slice(0, 2).map((t) => ({
    slug: t.slug, nombre: t.nombre, precio: t.precio, tagline: t.tagline, pitch: t.pitch, duracionHrs: t.duracionHrs,
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
        intereses: { type: "array", items: { type: "string" }, description: "Ej: ['aventura extrema','fotografía','relax','cascadas']" },
        grupo: { type: "string", description: "Ej: 'familia con niños', 'amigos', 'pareja', 'solo'" },
        actividad: { type: "string", description: "Nivel de energía: 'tranquilo', 'moderado' o 'intenso'" },
        destino: { type: "string", description: "Lugar específico que el cliente quiere (opcional)" },
      },
      required: [],
    },
  },
  {
    name: "obtener_tour",
    description: "Devuelve todos los detalles de un tour: precio por persona, qué incluye, qué NO incluye, duración, dificultad, punto de encuentro y destinos.",
    input_schema: {
      type: "object",
      properties: { slug: { type: "string", description: "slug del tour, ej: 'rzr-xilitla'" } },
      required: ["slug"],
    },
  },
  {
    name: "calcular_precio",
    description: "Calcula el precio total para un grupo. Niños 6–10 pagan 70%, menores de 6 pagan 50%.",
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
    name: "crear_cotizacion",
    description: "Crea una reserva PENDIENTE de pago con folio para pagar por transferencia. Úsala SOLO cuando el cliente ya confirmó tour, fecha (YYYY-MM-DD), personas y dio su nombre. Devuelve folio, total y datos bancarios.",
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
    name: "enviar_link_pago",
    description: "Devuelve el link del sitio para reservar y pagar con tarjeta (confirmación instantánea). Úsalo cuando el cliente prefiere pagar con tarjeta en línea.",
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
    name: "listar_paquetes",
    description: "Lista los paquetes (tours + hotel) con su precio. Úsala cuando pregunten por paquetes, promociones o planes de varios días.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "obtener_paquete",
    description: "Detalle de un paquete: qué incluye, tours, duración y precio.",
    input_schema: {
      type: "object",
      properties: { id: { type: "string", description: "id o nombre: esencial, aventura, completo" } },
      required: ["id"],
    },
  },
  {
    name: "listar_destinos",
    description: "Lista los destinos de la Huasteca que conocemos, opcionalmente por zona (Xilitla, Aquismón, Ciudad Valles, Tamasopo, El Naranjo, etc.).",
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
      return {
        slug: t.slug, nombre: t.nombre, tipo: t.tipo, dificultad: t.dificultad,
        duracionHrs: t.duracionHrs, precioPorPersona: t.precio, moneda: "MXN",
        minPersonas: t.groupMin, maxPersonas: t.groupMax,
        incluye: t.incluye, noIncluye: t.noIncluye,
        puntoEncuentro: t.puntoEncuentro, salida: SALIDA, destinos: t.destinos,
        idealPara: t.idealPara, cancelacion: EMPRESA.cancelacion,
      };
    }

    case "calcular_precio": {
      const t = findTour(input.slug);
      if (!t) return { error: `No existe el tour "${input.slug}".` };
      const adultos = Math.max(0, parseInt(input.adultos, 10) || 0);
      const mid = Math.max(0, parseInt(input.ninosMid, 10) || 0);
      const small = Math.max(0, parseInt(input.ninosSmall, 10) || 0);
      const totalPersonas = adultos + mid + small;
      if (totalPersonas < t.groupMin) return { error: `Este tour requiere mínimo ${t.groupMin} personas.` };
      const { total, precioMid, precioSmall } = calcPrecio(t.precio, adultos, mid, small);
      return {
        tour: t.nombre, precioAdulto: t.precio, precioNino6a10: precioMid, precioMenor6: precioSmall,
        adultos, ninosMid: mid, ninosSmall: small, totalPersonas, total, moneda: "MXN",
      };
    }

    case "crear_cotizacion": {
      const t = findTour(input.slug);
      if (!t) return { error: `No existe el tour "${input.slug}".` };
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

    case "enviar_link_pago": {
      const t = findTour(input.slug);
      if (!t) return { error: `No existe el tour "${input.slug}".` };
      return { link: `${EMPRESA.sitio}/reservar-tour/${t.slug}`, tour: t.nombre };
    }

    case "consultar_reserva": {
      const res = await api.consultarReserva(String(input.folio || "").trim().toUpperCase());
      if (!res.ok) return { error: res.data?.error || "No encontré esa reserva." };
      return res.data;
    }

    case "listar_paquetes":
      return {
        paquetes: PAQUETES.map((p) => ({ id: p.id, nombre: p.nombre, duracion: p.duracion, precio: p.precio, precioLabel: p.precioLabel, badge: p.badge || null, perfiles: p.perfiles })),
        nota: INFO.paquetes,
      };

    case "obtener_paquete": {
      const p = findPaquete(input.id);
      if (!p) return { error: `No existe ese paquete. Opciones: ${PAQUETES.map((x) => x.id).join(", ")}` };
      return { ...p, nota: INFO.paquetes };
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
      const tourSlugs = DESTINO_TOUR[d.slug] || [];
      const toursQueLoVisitan = tourSlugs
        .map((s) => { const t = findTour(s); return t ? { slug: t.slug, nombre: t.nombre, precioPorPersona: t.precio } : null; })
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
  return TOURS.map((t) =>
    `• *${t.nombre}* (slug: ${t.slug})\n` +
    `  ${t.tipo} · dificultad ${t.dificultad} · ${t.duracionHrs} h · desde $${t.precio.toLocaleString("es-MX")} MXN/persona · ${t.groupMin}–${t.groupMax} pers.\n` +
    `  ${t.pitch}\n` +
    `  Incluye: ${t.incluye.join(", ")}.\n` +
    `  NO incluye: ${t.noIncluye.join(", ")}.\n` +
    `  Punto de encuentro: ${t.puntoEncuentro}.`
  ).join("\n\n");
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

function buildSystemPrompt() {
  return `Eres el asistente de WhatsApp de *${EMPRESA.nombre}* (${EMPRESA.sitio}), operador de turismo en la ${EMPRESA.zona}. 🌿💦🏞️

Tu misión: asesorar con calidez, recomendar el tour ideal y CERRAR la reserva. Eres entusiasta y conoces la Huasteca de memoria, pero SIEMPRE honesto: nunca inventas precios, fechas, disponibilidad ni lo que incluye un tour.

━━━━━━━━━━━━━━━━━━━━━━━━
🗺️ NUESTROS 7 TOURS
━━━━━━━━━━━━━━━━━━━━━━━━
${catalogoTexto()}

━━━━━━━━━━━━━━━━━━━━━━━━
💰 PRECIOS Y CONDICIONES
━━━━━━━━━━━━━━━━━━━━━━━━
• Todos los precios son *POR PERSONA* en MXN. ${EMPRESA.ninos}
• Salida estándar: *${EMPRESA.salida}*. ${EMPRESA.cancelacion}
• El RZR y el Rappel NO incluyen transporte ni alimentos — NO los ofrezcas como "todo incluido". Los demás tours incluyen transporte desde el hotel y desayuno.
• Para precios exactos usa la herramienta *calcular_precio*. Para detalles usa *obtener_tour*. NUNCA inventes montos.

━━━━━━━━━━━━━━━━━━━━━━━━
🎒 PAQUETES (tours + hotel)
━━━━━━━━━━━━━━━━━━━━━━━━
${paquetesTexto()}
Incluyen hospedaje en el *Hotel Paraíso Encantado* (Xilitla). Para el detalle usa *obtener_paquete* (o *listar_paquetes*). La reserva de paquetes se confirma por aquí según disponibilidad del hotel — NO hay pago automático: toma los datos y ofrece confirmar con el equipo.

━━━━━━━━━━━━━━━━━━━━━━━━
📍 DESTINOS QUE CONOCEMOS
━━━━━━━━━━━━━━━━━━━━━━━━
Podemos asesorar sobre estos lugares (entrada, cómo llegar, mejor hora, qué llevar, datos curiosos). Para el detalle usa *obtener_destino*; para la lista usa *listar_destinos*. NUNCA inventes datos de un destino — usa la herramienta. Si el destino tiene un tour nuestro que lo visita, ofrécelo (precio por persona + reserva).
${destinosTexto()}

━━━━━━━━━━━━━━━━━━━━━━━━
🎯 FORMAS DE RESERVAR (ofrece las dos)
━━━━━━━━━━━━━━━━━━━━━━━━
1. *Tarjeta en línea* (confirmación instantánea): usa *enviar_link_pago* y manda el link del sitio. Escribe el link como URL simple en su propia línea, SIN asteriscos, negritas, paréntesis ni formato — el cliente debe poder tocarlo.
2. *Transferencia*: usa *crear_cotizacion* (solo cuando ya tengas tour + fecha + personas + nombre). Devuelve un *folio* y datos bancarios; el cliente transfiere y manda su comprobante por este chat. El dueño confirma después.

━━━━━━━━━━━━━━━━━━━━━━━━
📋 FLUJO
━━━━━━━━━━━━━━━━━━━━━━━━
1. Saluda cálido. Si no sabe qué quiere, pregunta (¿con quién viaja?, ¿qué le emociona?) y usa *recomendar_tour*.
2. Presenta el tour con su gancho y precio por persona (usa *calcular_precio* con el tamaño real del grupo).
3. Pregunta *fecha* (debe ser a partir de mañana) y *cuántas personas* (adultos / niños 6–10 / menores de 6).
4. Pregunta cómo prefiere pagar: tarjeta (link) o transferencia (cotización con folio).
5. Si transferencia: pide *nombre completo*, crea la cotización, manda folio + datos bancarios, pide el comprobante.
6. Confirma datos importantes en cada paso. Menciona el folio cuando exista.

━━━━━━━━━━━━━━━━━━━━━━━━
🧭 REGLAS
━━━━━━━━━━━━━━━━━━━━━━━━
• Responde SIEMPRE en español, cálido y breve (es WhatsApp). Usa *negritas* estilo WhatsApp, no markdown.
• NUNCA afirmes cifras específicas (alturas, profundidades, distancias, precios, horarios) de memoria. Usa exactamente lo que devuelven las herramientas; si no tienes el dato, dilo sin inventar. (Ej.: la altura de la Cascada de Tamul es la que diga la herramienta, no la adivines.)
• No uses emojis en exceso, solo donde den impacto.
• Si el cliente pide hablar con un *humano/asesor*, dile con gusto que lo conectas con el equipo y deja de insistir en vender.
• Si preguntan por el *hotel* o algo que no sea estos tours, acláralo amablemente: aquí solo agendamos tours de la Huasteca.
• Si no hay datos suficientes, pregunta — no asumas. Nunca prometas algo que el catálogo no dice.`;
}

// ══════════════════════════════════════════════════════════════
// PROCESAR MENSAJE (loop agéntico)
// ══════════════════════════════════════════════════════════════
async function processMessage(phone, message) {
  pushHistory(phone, "user", message);
  const session = getSession(phone);

  let response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: buildSystemPrompt(),
    tools,
    messages: session.history,
  });

  let guard = 0;
  while (response.stop_reason === "tool_use" && guard++ < 6) {
    session.history.push({ role: "assistant", content: response.content });

    const toolResults = [];
    for (const block of response.content) {
      if (block.type === "tool_use") {
        const result = await executeTool(block.name, block.input || {}, phone);
        if (block.name === "crear_cotizacion" && result && result.folio) {
          session.lastFolio = result.folio;
        }
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(result) });
      }
    }
    session.history.push({ role: "user", content: toolResults });

    response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: buildSystemPrompt(),
      tools,
      messages: session.history,
    });
  }

  const textBlock = response.content.find((b) => b.type === "text");
  const reply = (textBlock && textBlock.text) || "Disculpa, tuve un problemita. ¿Me lo repites? 🙏";
  session.history.push({ role: "assistant", content: response.content });
  return sanitizeLinks(reply);
}

module.exports = { processMessage, buildSystemPrompt, recomendarLocal, executeTool, needsHuman, setApiClient, sanitizeLinks, tools };
