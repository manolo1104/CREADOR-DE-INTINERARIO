/**
 * content-strategy.js
 * Calendario editorial de 90 temas para el blog de Huasteca Potosina.
 * Cada tema tiene keyword principal, secundarios y categoría SEO.
 */

export const TOPICS = [
  // ── DESTINOS PRINCIPALES ──
  {
    title: "Cascada de Tamul: La Guía Definitiva para Visitarla en 2026",
    focusKeyword: "cascada de tamul",
    secondaryKeywords: ["cascada tamul huasteca", "tamul guia", "cascada mas alta mexico", "rio tampaon"],
    category: "Destinos",
  },
  {
    title: "Las Pozas de Edward James: Todo lo que Necesitas Saber",
    focusKeyword: "las pozas xilitla",
    secondaryKeywords: ["jardin surrealista edward james", "las pozas huasteca", "xilitla que ver", "jardin surreal mexico"],
    category: "Destinos",
  },
  {
    title: "Sótano de las Golondrinas: La Cueva más Profunda de México",
    focusKeyword: "sotano de las golondrinas",
    secondaryKeywords: ["vencejos golondrinas", "cueva profunda mexico", "aquismón huasteca", "golondrinas vuelo"],
    category: "Destinos",
  },
  {
    title: "Cascadas de Micos: Guía Completa para tu Visita",
    focusKeyword: "cascadas de micos",
    secondaryKeywords: ["micos ciudad valles", "cascadas micos como llegar", "micos huasteca potosina", "turubas micos"],
    category: "Destinos",
  },
  {
    title: "Puente de Dios Tamasopo: El Portal de Luz de la Huasteca",
    focusKeyword: "puente de dios tamasopo",
    secondaryKeywords: ["puente de dios san luis potosi", "tamasopo turismo", "cascadas tamasopo", "puente natural mexico"],
    category: "Destinos",
  },
  {
    title: "Zona Arqueológica de Tamtoc: Historia Huasteca al Descubierto",
    focusKeyword: "zona arqueologica tamtoc",
    secondaryKeywords: ["tamtoc huasteca", "arqueologia san luis potosi", "culture huasteca", "tamuín turismo"],
    category: "Cultura",
  },
  {
    title: "Cascadas de Tamasopo: Tu Guía para el Día Perfecto",
    focusKeyword: "cascadas de tamasopo",
    secondaryKeywords: ["tamasopo como llegar", "cascadas azules huasteca", "tamasopo san luis potosi"],
    category: "Destinos",
  },
  {
    title: "Balneario Taninul: Aguas Termales en la Huasteca Potosina",
    focusKeyword: "balneario taninul",
    secondaryKeywords: ["taninul aguas termales", "taninul ciudad valles", "termales huasteca", "hotel taninul"],
    category: "Bienestar",
  },

  // ── ITINERARIOS ──
  {
    title: "3 Días en la Huasteca Potosina: El Itinerario Perfecto",
    focusKeyword: "itinerario huasteca potosina 3 dias",
    secondaryKeywords: ["que ver huasteca 3 dias", "huasteca potosina ruta", "viaje huasteca fin de semana"],
    category: "Itinerarios",
  },
  {
    title: "5 Días en la Huasteca Potosina: Ruta Completa 2026",
    focusKeyword: "itinerario huasteca potosina 5 dias",
    secondaryKeywords: ["ruta huasteca 5 dias", "que hacer huasteca semana", "cascadas xilitla golondrinas ruta"],
    category: "Itinerarios",
  },
  {
    title: "Huasteca Potosina en un Fin de Semana: Qué Ver y Hacer",
    focusKeyword: "huasteca potosina fin de semana",
    secondaryKeywords: ["fin de semana huasteca", "2 dias huasteca potosina", "viaje corto huasteca"],
    category: "Itinerarios",
  },
  {
    title: "Itinerario Huasteca Potosina con Niños: La Ruta Familiar",
    focusKeyword: "huasteca potosina con niños",
    secondaryKeywords: ["viaje familiar huasteca", "huasteca niños actividades", "turismo familiar san luis potosi"],
    category: "Itinerarios",
  },
  {
    title: "Ruta Xilitla a Ciudad Valles: Los Mejores Paradas",
    focusKeyword: "ruta xilitla ciudad valles",
    secondaryKeywords: ["xilitla ciudad valles carretera", "paradas huasteca potosina", "ruta huasteca mapa"],
    category: "Itinerarios",
  },
  {
    title: "Huasteca Potosina Semana Santa: Guía para Evitar las Aglomeraciones",
    focusKeyword: "huasteca potosina semana santa",
    secondaryKeywords: ["semana santa san luis potosi", "vacaciones huasteca temporada", "mejor época huasteca"],
    category: "Temporadas",
  },

  // ── CÓMO LLEGAR ──
  {
    title: "Cómo Llegar a la Huasteca Potosina desde CDMX",
    focusKeyword: "como llegar a huasteca potosina desde cdmx",
    secondaryKeywords: ["cdmx huasteca potosina ruta", "autobús huasteca cdmx", "vuelo ciudad valles"],
    category: "Info Práctica",
  },
  {
    title: "Cómo Llegar a Xilitla: Todas las Opciones de Transporte",
    focusKeyword: "como llegar a xilitla",
    secondaryKeywords: ["xilitla transporte", "xilitla autobús", "xilitla desde ciudad valles"],
    category: "Info Práctica",
  },
  {
    title: "Aeropuerto de Ciudad Valles: Tu Puerta de Entrada a la Huasteca",
    focusKeyword: "aeropuerto ciudad valles",
    secondaryKeywords: ["vuelos ciudad valles", "aeropuerto san luis potosi huasteca", "como llegar huasteca avión"],
    category: "Info Práctica",
  },

  // ── PRESUPUESTO ──
  {
    title: "Cuánto Cuesta un Viaje a la Huasteca Potosina: Presupuesto 2026",
    focusKeyword: "cuanto cuesta huasteca potosina",
    secondaryKeywords: ["presupuesto huasteca potosina", "huasteca barata", "precios huasteca 2026"],
    category: "Presupuesto",
  },
  {
    title: "Huasteca Potosina Económica: Cómo Gastar Menos y Disfrutar Más",
    focusKeyword: "huasteca potosina economica",
    secondaryKeywords: ["viaje barato huasteca", "cascadas gratis huasteca", "huasteca bajo presupuesto"],
    category: "Presupuesto",
  },

  // ── DONDE HOSPEDARSE ──
  {
    title: "Dónde Hospedarse en la Huasteca Potosina: Los Mejores Hoteles",
    focusKeyword: "hoteles huasteca potosina",
    secondaryKeywords: ["hospedaje huasteca potosina", "hotel ciudad valles", "hotel xilitla", "hostal huasteca"],
    category: "Hospedaje",
  },
  {
    title: "Los Mejores Hoteles en Xilitla: Boutique, Ecolodges y Más",
    focusKeyword: "hoteles xilitla san luis potosi",
    secondaryKeywords: ["hotel boutique xilitla", "alojamiento xilitla", "xilitla donde dormir"],
    category: "Hospedaje",
  },
  {
    title: "Dónde Dormir Cerca de las Cascadas de la Huasteca",
    focusKeyword: "hospedaje cerca de cascadas huasteca",
    secondaryKeywords: ["hotel cerca micos", "cabaña huasteca potosina", "glamping huasteca"],
    category: "Hospedaje",
  },

  // ── GASTRONOMÍA ──
  {
    title: "Comida Huasteca: Los Platillos que No Puedes Dejar de Probar",
    focusKeyword: "comida huasteca potosina",
    secondaryKeywords: ["gastronomia huasteca", "zacahuil huasteca", "bocoles que son", "tamales huastecos"],
    category: "Gastronomía",
  },
  {
    title: "Restaurantes en Ciudad Valles: Dónde Comer en la Huasteca",
    focusKeyword: "restaurantes ciudad valles",
    secondaryKeywords: ["donde comer ciudad valles", "comida tipica ciudad valles", "mejores restaurantes huasteca"],
    category: "Gastronomía",
  },

  // ── AVENTURA ──
  {
    title: "Aventura en la Huasteca Potosina: Los 10 Planes más Extremos",
    focusKeyword: "aventura huasteca potosina",
    secondaryKeywords: ["rappel huasteca", "rafting rio tampaon", "senderismo huasteca", "adrenalina huasteca"],
    category: "Aventura",
  },
  {
    title: "Rafting en el Río Tampaón: La Experiencia Definitiva de la Huasteca",
    focusKeyword: "rafting rio tampaon",
    secondaryKeywords: ["rafting huasteca potosina", "kayak huasteca", "rio tampaon tour"],
    category: "Aventura",
  },

  // ── NATURALEZA Y FOTOGRAFÍA ──
  {
    title: "Fotografía en la Huasteca Potosina: Los Mejores Spots",
    focusKeyword: "fotografía huasteca potosina",
    secondaryKeywords: ["instagram huasteca", "fotos cascadas mexico", "mejores fotos huasteca"],
    category: "Fotografía",
  },
  {
    title: "La Huasteca Potosina en Temporada de Lluvias: Todo lo que Cambia",
    focusKeyword: "huasteca potosina temporada lluvias",
    secondaryKeywords: ["cuando visitar huasteca", "huasteca junio julio", "cascadas lluvias color"],
    category: "Temporadas",
  },
  {
    title: "Mejores Meses para Visitar la Huasteca Potosina",
    focusKeyword: "mejor epoca huasteca potosina",
    secondaryKeywords: ["cuando ir huasteca", "temporada alta huasteca", "clima huasteca potosina"],
    category: "Info Práctica",
  },

  // ── CULTURA ──
  {
    title: "Cultura Huasteca: Tradiciones, Música y Arte de la Región",
    focusKeyword: "cultura huasteca potosina",
    secondaryKeywords: ["huapango huasteca", "artesanías huastecas", "danza huasteca", "cultura teenek"],
    category: "Cultura",
  },
  {
    title: "Edward James y Xilitla: La Historia del Jardín Surrealista",
    focusKeyword: "edward james xilitla historia",
    secondaryKeywords: ["edward james poeta", "las pozas historia", "surrealismo mexico", "quien fue edward james"],
    category: "Cultura",
  },

  // ── COMPARATIVOS ──
  {
    title: "Huasteca Potosina vs Barranca del Cobre: ¿Cuál Elegir?",
    focusKeyword: "huasteca potosina vs barranca del cobre",
    secondaryKeywords: ["mejores destinos mexico", "naturaleza mexico comparativa", "barranca del cobre turismo"],
    category: "Comparativos",
  },
];

// ── Seleccionar tema del día ───────────────────────────────

export function getDailyTopic(usedSlugs = [], customTitle = null) {
  if (customTitle) {
    // Buscar por título similar
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
    // Todos usados: empezar de nuevo (ciclo)
    console.log("♻️  Todos los temas usados — reiniciando ciclo");
    return TOPICS[Math.floor(Math.random() * TOPICS.length)];
  }

  // Rotar por día del año para consistencia
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  return available[dayOfYear % available.length];
}

export function getUsedSlugs() {
  return [];
}
