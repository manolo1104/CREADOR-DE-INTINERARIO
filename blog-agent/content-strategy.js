/**
 * content-strategy.js
 * Calendario editorial para el blog de huasteca-potosina.com.
 * Carga temas desde topics.json + FALLBACK_TOPICS estáticos.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Inferir categoría desde texto ──────────────────────────

function inferCategory(titulo, palabrasClave = []) {
  const text = (titulo + " " + palabrasClave.join(" ")).toLowerCase();

  if (/hotel|hospedaje|caba[ñn]a|dormir|glamping/.test(text))                              return "Hospedaje";
  if (/restaurante|comer|gastronom[íi]a|zacahuil|bocoles|platillo|comida/.test(text))      return "Gastronomía";
  if (/itinerario|d[íi]as|ruta|plan|semana/.test(text))                                    return "Itinerarios";
  if (/c[óo]mo llegar|transporte|autobus|aeropuerto|vuelo/.test(text))                     return "Info Práctica";
  if (/cu[áa]nto cuesta|presupuesto|precio|econ[óo]mico/.test(text))                       return "Presupuesto";
  if (/cascada|s[óo]tano|pozas|puente|r[íi]o|laguna|nacimiento|cueva|zona arqueol[óo]gica/.test(text)) return "Destinos";
  if (/cultura|historia|tradici[óo]n|edward james|leonora|leyenda|artesan[íi]a/.test(text)) return "Cultura";
  if (/aventura|rafting|rappel|senderismo|kayak|tirolesa/.test(text))                       return "Aventura";
  if (/fotogr|instagram|spots/.test(text))                                                  return "Fotografía";
  if (/temporada|clima|lluvias|mejor [ée]poca/.test(text))                                  return "Temporadas";
  return "Destinos";
}

// ── Cargar temas desde topics.json ─────────────────────────

function loadTopicsFromJson() {
  try {
    const filePath = path.join(__dirname, "topics.json");
    const raw = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw);

    const topics = [];
    const calendario = data.calendario_editorial || {};

    for (const [, mesData] of Object.entries(calendario)) {
      const articles = mesData?.articulos || [];
      if (!Array.isArray(articles)) continue;
      for (const article of articles) {
        const palabrasClave = article.palabras_clave || [];
        topics.push({
          title: article.title || article.titulo || "",
          focusKeyword: (palabrasClave[0] || "").toLowerCase(),
          secondaryKeywords: palabrasClave.slice(1).map(k => k.toLowerCase()),
          category: inferCategory(article.title || article.titulo || "", palabrasClave),
          id: article.id || undefined,
        });
      }
    }

    return topics;
  } catch {
    return [];
  }
}

// ── Temas de respaldo ───────────────────────────────────────

const FALLBACK_TOPICS = [
  {
    title: "Cascada de Tamul: La Guía Definitiva para Visitarla",
    focusKeyword: "cascada de tamul",
    secondaryKeywords: ["cascada tamul huasteca", "tamul guia", "rio tampaon", "cascada mas alta mexico"],
    category: "Destinos",
  },
  {
    title: "Las Pozas de Edward James: Todo lo que Necesitas Saber",
    focusKeyword: "las pozas xilitla",
    secondaryKeywords: ["jardin surrealista edward james", "las pozas huasteca", "xilitla que ver"],
    category: "Destinos",
  },
  {
    title: "Sótano de las Golondrinas: La Cueva más Profunda de México",
    focusKeyword: "sotano de las golondrinas",
    secondaryKeywords: ["vencejos golondrinas", "cueva profunda mexico", "aquismón huasteca"],
    category: "Destinos",
  },
  {
    title: "Cascadas de Micos: Guía Completa para tu Visita",
    focusKeyword: "cascadas de micos",
    secondaryKeywords: ["micos ciudad valles", "cascadas micos como llegar", "micos huasteca potosina"],
    category: "Destinos",
  },
  {
    title: "Puente de Dios Tamasopo: El Portal de Luz de la Huasteca",
    focusKeyword: "puente de dios tamasopo",
    secondaryKeywords: ["puente de dios san luis potosi", "tamasopo turismo", "cascadas tamasopo"],
    category: "Destinos",
  },
  {
    title: "3 Días en la Huasteca Potosina: El Itinerario Perfecto",
    focusKeyword: "itinerario huasteca potosina 3 dias",
    secondaryKeywords: ["que ver huasteca 3 dias", "huasteca potosina ruta", "viaje huasteca fin de semana"],
    category: "Itinerarios",
  },
  {
    title: "5 Días en la Huasteca Potosina: Ruta Completa",
    focusKeyword: "itinerario huasteca potosina 5 dias",
    secondaryKeywords: ["ruta huasteca 5 dias", "que hacer huasteca semana", "cascadas xilitla golondrinas ruta"],
    category: "Itinerarios",
  },
  {
    title: "Cómo Llegar a la Huasteca Potosina desde CDMX",
    focusKeyword: "como llegar a huasteca potosina desde cdmx",
    secondaryKeywords: ["cdmx huasteca potosina ruta", "autobús huasteca cdmx", "vuelo ciudad valles"],
    category: "Info Práctica",
  },
  {
    title: "Cuánto Cuesta un Viaje a la Huasteca Potosina",
    focusKeyword: "cuanto cuesta huasteca potosina",
    secondaryKeywords: ["presupuesto huasteca potosina", "huasteca barata", "precios huasteca"],
    category: "Presupuesto",
  },
  {
    title: "Comida Huasteca: Los Platillos que No Puedes Dejar de Probar",
    focusKeyword: "comida huasteca potosina",
    secondaryKeywords: ["gastronomia huasteca", "zacahuil huasteca", "bocoles que son", "tamales huastecos"],
    category: "Gastronomía",
  },
  {
    title: "Dónde Hospedarse en la Huasteca Potosina: Los Mejores Hoteles",
    focusKeyword: "hoteles huasteca potosina",
    secondaryKeywords: ["hospedaje huasteca potosina", "hotel ciudad valles", "hotel xilitla", "hostal huasteca"],
    category: "Hospedaje",
  },
  {
    title: "Aventura en la Huasteca Potosina: Los Planes más Extremos",
    focusKeyword: "aventura huasteca potosina",
    secondaryKeywords: ["rappel huasteca", "rafting rio tampaon", "senderismo huasteca", "adrenalina huasteca"],
    category: "Aventura",
  },
  {
    title: "Mejores Meses para Visitar la Huasteca Potosina",
    focusKeyword: "mejor epoca huasteca potosina",
    secondaryKeywords: ["cuando ir huasteca", "temporada alta huasteca", "clima huasteca potosina"],
    category: "Info Práctica",
  },
  {
    title: "Cultura Huasteca: Tradiciones, Música y Arte de la Región",
    focusKeyword: "cultura huasteca potosina",
    secondaryKeywords: ["huapango huasteca", "artesanías huastecas", "danza huasteca", "cultura teenek"],
    category: "Cultura",
  },
  {
    title: "Rafting en el Río Tampaón: La Experiencia Definitiva",
    focusKeyword: "rafting rio tampaon",
    secondaryKeywords: ["rafting huasteca potosina", "kayak huasteca", "rio tampaon tour"],
    category: "Aventura",
  },
  {
    title: "Zona Arqueológica de Tamtoc: Historia Huasteca al Descubierto",
    focusKeyword: "zona arqueologica tamtoc",
    secondaryKeywords: ["tamtoc huasteca", "arqueologia san luis potosi", "cultura huasteca", "tamuín turismo"],
    category: "Cultura",
  },
  {
    title: "Nacimiento de Huichihuayan: La Joya Escondida de la Huasteca",
    focusKeyword: "nacimiento de huichihuayan",
    secondaryKeywords: ["huichihuayan como llegar", "ojo de agua huasteca", "nacimiento agua azul huasteca"],
    category: "Destinos",
  },
  {
    title: "Huasteca Potosina con Niños: La Ruta Familiar Perfecta",
    focusKeyword: "huasteca potosina con niños",
    secondaryKeywords: ["viaje familiar huasteca", "huasteca niños actividades", "turismo familiar san luis potosi"],
    category: "Itinerarios",
  },
];

// ── Corrección 7: Reglas de inferencia de categoría por keywords ──

const CATEGORY_INFERENCE_RULES = [
  { keywords_match: ["café", "gastronomía", "comida", "tamal", "papan", "zacahuil", "bocoles", "restaurante", "platillo"], category: "Café y Gastronomía" },
  { keywords_match: ["cascada", "tamul", "minas viejas", "micos", "puente de dios", "el meco", "el salto", "el aguacate", "tamasopo"], category: "Cascadas" },
  { keywords_match: ["itinerario", "ruta", "días", "fin de semana", "planear"], category: "Itinerarios" },
  { keywords_match: ["tour", "guía", "precio", "costo", "reserva"], category: "Tours" },
  { keywords_match: ["hotel", "hostal", "dormir", "hospedaje", "cabaña", "glamping"], category: "Hospedaje" },
  { keywords_match: ["cómo llegar", "carretera", "autobús", "cdmx", "transporte", "aeropuerto"], category: "Info Práctica" },
  { keywords_match: ["sótano", "golondrinas", "huahuas", "cueva", "espeleología", "mantetzulel"], category: "Aventura Subterránea" },
  { keywords_match: ["rafting", "rappel", "kayak", "tirolesa", "senderismo", "aventura"], category: "Aventura" },
  { keywords_match: ["cultura", "tradición", "huapango", "danza", "artesanía", "teenek", "voladores"], category: "Cultura" },
  { keywords_match: ["xilitla", "edward james", "las pozas", "jardín surrealista"], category: "Xilitla" },
  { keywords_match: ["media luna", "laguna", "buceo", "snorkel", "rioverde"], category: "Lagunas" },
  { keywords_match: ["tamtoc", "arqueología", "zona arqueológica", "tamuín"], category: "Arqueología" },
  { keywords_match: ["temporada", "clima", "lluvias", "mejor época"], category: "Temporadas" },
  { keywords_match: ["presupuesto", "cuánto cuesta", "económico", "barato"], category: "Presupuesto" },
  { keywords_match: ["fotografía", "instagram", "spots", "fotos"], category: "Fotografía" },
];

export function inferCategoryByKeyword(focusKeyword, title, secondaryKeywords = []) {
  const text = [focusKeyword, title, ...secondaryKeywords].join(" ").toLowerCase();

  let bestMatch = null;
  let bestCount = 0;

  for (const rule of CATEGORY_INFERENCE_RULES) {
    const count = rule.keywords_match.filter(kw => text.includes(kw.toLowerCase())).length;
    if (count > bestCount) {
      bestCount = count;
      bestMatch = rule.category;
    }
  }

  return bestMatch || "Huasteca Potosina";
}

// ── Seleccionar tema del día ───────────────────────────────

export function getDailyTopic(usedSlugs = [], customTitle = null) {
  const jsonTopics = loadTopicsFromJson();
  const TOPICS = jsonTopics.length > 0 ? [...jsonTopics, ...FALLBACK_TOPICS] : FALLBACK_TOPICS;

  if (customTitle) {
    const found = TOPICS.find(t =>
      t.title.toLowerCase().includes(customTitle.toLowerCase()) ||
      t.focusKeyword.toLowerCase().includes(customTitle.toLowerCase())
    );
    if (found) return found;
  }

  // Filtrar temas ya usados (por similitud de keyword)
  const available = TOPICS.filter(t => {
    const wouldBeSlug = t.focusKeyword.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    return !usedSlugs.some(s => s.includes(wouldBeSlug) || wouldBeSlug.includes(s.substring(0, 15)));
  });

  if (available.length === 0) {
    console.log("♻️ Todos los temas usados — reiniciando ciclo");
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    return TOPICS[dayOfYear % TOPICS.length];
  }

  // Rotar por día del año para consistencia
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  return available[dayOfYear % available.length];
}

export function getUsedSlugs() {
  return [];
}
