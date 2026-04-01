export interface Destino {
  id: string;
  slug: string;
  nombre: string;
  zona: string;
  tipo: string;
  emoji: string;
  descripcion: string;
  duracion_hrs: number;
  precio_entrada: string;
  dificultad: string;
  ideal_para: string[];
  horario: string;
  dias_abierto: string;
  mejor_hora: string;
  temporada_ideal: string;
  advertencias: string;
  como_llegar: string;
  que_llevar: string[];
  datos_curiosos: string[];
  errores_comunes: string[];
  lat: number;
  lng: number;
  imagen_hero: string;
  imagen_galeria: string[];
  seo?: {
    metaTitle: string;
    metaDescription: string;
    keywords: string[];
    faqPrincipales: { pregunta: string; respuesta: string }[];
  };
}

export const DESTINOS_DB: Destino[] = [
  // ─── DESTINOS ORIGINALES (8) ───────────────────────────────────────────────
  {
    id: "xilitla_pozas", slug: "las-pozas-jardin-surrealista",
    nombre: "Las Pozas (Jardín Surrealista)", zona: "Xilitla", tipo: "Arte & Naturaleza", emoji: "🏛️",
    descripcion: "El icónico jardín surrealista de Edward James: esculturas de concreto entre cascadas y selva tropical.",
    duracion_hrs: 4, precio_entrada: "$180 MXN", dificultad: "media",
    ideal_para: ["fotografia", "pareja", "solo", "cultura"],
    horario: "09:00–18:00", dias_abierto: "Miércoles a Lunes (cerrado martes)",
    mejor_hora: "09:00–11:00", temporada_ideal: "Nov–Mar",
    advertencias: "Comprar ticket digital antes. Cerrado martes.",
    como_llegar: "1h 45min desde Valles · Taxi $1,200 · Bus $110",
    que_llevar: ["calzado antiderrapante", "repelente biodegradable"],
    datos_curiosos: ["Fue plantación de orquídeas", "Edward James nunca vivió en las estructuras"],
    errores_comunes: ["Llegar sin reservación", "Calzado liso"],
    lat: 21.3972, lng: -98.9939,
    imagen_hero: "/imagenes/las-pozas-jardin-surrealista/hero.webp",
    imagen_galeria: [
      "/imagenes/las-pozas-jardin-surrealista/gallery-1.jpg",
      "/imagenes/las-pozas-jardin-surrealista/gallery-2.jpg",
    ],
  },
  {
    id: "cascada_tamul", slug: "cascada-de-tamul",
    nombre: "Cascada de Tamul", zona: "Aquismón", tipo: "Aventura", emoji: "🌈",
    descripcion: "La cascada más alta de SLP (105m), accesible remando por el río Tampaón. Espectacular caída turquesa.",
    duracion_hrs: 5, precio_entrada: "$220 MXN + $300 panga p/p", dificultad: "alta",
    ideal_para: ["aventura", "fotografia", "amigos"],
    horario: "08:00–17:00", dias_abierto: "Lun-Dom",
    mejor_hora: "08:00", temporada_ideal: "Ene–Abr",
    advertencias: "Lancheros dejan de salir a las 2 PM. SOLO EFECTIVO.",
    como_llegar: "45 min desde Valles → Tanchachín + lancha",
    que_llevar: ["chaleco salvavidas", "aqua shoes", "agua 2L"],
    datos_curiosos: ["105m de caída", "En octubre: agua turquesa + follaje naranja"],
    errores_comunes: ["Llegar tarde", "No llevar efectivo"],
    lat: 21.8014, lng: -99.1794,
    imagen_hero: "/imagenes/cascada-de-tamul/hero.jpg",
    imagen_galeria: [
      "/imagenes/cascada-de-tamul/gallery-1.jpg",
      "/imagenes/cascada-de-tamul/gallery-2.webp",
    ],
  },
  {
    id: "sotano_golondrinas", slug: "sotano-de-las-golondrinas",
    nombre: "Sótano de las Golondrinas", zona: "Aquismón", tipo: "Extrema", emoji: "🐦",
    descripcion: "Abismo kárstico de 333m. Santuario de vencejos con vuelo espiral al amanecer.",
    duracion_hrs: 3, precio_entrada: "$100 MXN", dificultad: "media",
    ideal_para: ["fotografia", "naturaleza", "solo"],
    horario: "06:00–18:00", dias_abierto: "Lunes a Domingo",
    mejor_hora: "05:45 AM", temporada_ideal: "Nov–Mar",
    advertencias: "568 escalones para bajar; subida AGOTADORA.",
    como_llegar: "1h 15min desde Valles por sierra",
    que_llevar: ["chamarra", "lámpara", "calzado tenis"],
    datos_curiosos: ["Las aves son VENCEJOS, no golondrinas", "Fondo = 3 campos de fútbol"],
    errores_comunes: ["Llegar a las 9 AM cuando aves ya salieron"],
    lat: 21.6001, lng: -99.0989,
    imagen_hero: "/imagenes/sotano-de-las-golondrinas/hero.jpg",
    imagen_galeria: [
      "/imagenes/sotano-de-las-golondrinas/gallery-1.avif",
      "/imagenes/sotano-de-las-golondrinas/gallery-2.avif",
    ],
  },
  {
    id: "cascada_micos", slug: "cascadas-de-micos",
    nombre: "Cascadas de Micos", zona: "Ciudad Valles", tipo: "Aventura", emoji: "💦",
    descripcion: "Serie de 7 cascadas con circuito de saltos, tirolesa, kayak y skybike.",
    duracion_hrs: 4, precio_entrada: "$100 MXN", dificultad: "media",
    ideal_para: ["amigos", "aventura"],
    horario: "08:00–18:00", dias_abierto: "Lunes a Domingo",
    mejor_hora: "09:00 AM", temporada_ideal: "Todo el año",
    advertencias: "Chaleco y casco OBLIGATORIO.",
    como_llegar: "20 min desde Valles · Combis $35 MXN c/30 min",
    que_llevar: ["aqua shoes", "ropa dry-fit"],
    datos_curiosos: ["El río más versátil de la zona"],
    errores_comunes: ["No ajustar bien el chaleco"],
    lat: 21.9958, lng: -99.1678,
    imagen_hero: "/imagenes/cascadas-de-micos/hero.jpg",
    imagen_galeria: [
      "/imagenes/cascadas-de-micos/gallery-1.webp",
      "/imagenes/cascadas-de-micos/gallery-2.jpg",
    ],
  },
  {
    id: "cascada_puente_dios", slug: "puente-de-dios-tamasopo",
    nombre: "Puente de Dios (Tamasopo)", zona: "Tamasopo", tipo: "Naturaleza", emoji: "🌀",
    descripcion: "Poza azul cobalto bajo puente natural. La luz entra a la cueva entre 11:00–13:00.",
    duracion_hrs: 3.5, precio_entrada: "$150 MXN", dificultad: "media",
    ideal_para: ["pareja", "fotografia"],
    horario: "08:00–17:00", dias_abierto: "Lunes a Domingo",
    mejor_hora: "11:00–13:00", temporada_ideal: "Ene–May",
    advertencias: "Corrientes fuertes; seguir cuerda de seguridad.",
    como_llegar: "1h desde Valles por autopista a SLP",
    que_llevar: ["aqua shoes OBLIGATORIOS", "chaleco"],
    datos_curiosos: ["Efecto de luz en la cueva único en México"],
    errores_comunes: ["No usar aqua shoes (piedras MUY resbalosas)"],
    lat: 21.9214, lng: -99.4217,
    imagen_hero: "/imagenes/puente-de-dios-tamasopo/hero.jpg",
    imagen_galeria: [
      "/imagenes/puente-de-dios-tamasopo/gallery-1.jpg",
      "/imagenes/puente-de-dios-tamasopo/gallery-2.jpg",
    ],
  },
  {
    id: "tamtoc", slug: "zona-arqueologica-tamtoc",
    nombre: "Zona Arqueológica Tamtoc", zona: "Tamuín", tipo: "Arqueología", emoji: "🗿",
    descripcion: "El asentamiento prehispánico más importante de la cultura Huasteca.",
    duracion_hrs: 3, precio_entrada: "$95 MXN", dificultad: "baja",
    ideal_para: ["historia", "cultura", "familia"],
    horario: "09:00–17:00", dias_abierto: "Martes a Domingo",
    mejor_hora: "09:00 AM", temporada_ideal: "Dic–Feb",
    advertencias: "POCA sombra. Puede superar 45°C en mayo.",
    como_llegar: "45 min desde Valles",
    que_llevar: ["sombrero", "agua abundante", "protector solar"],
    datos_curiosos: ["Monumento 32 pesa 30 toneladas"],
    errores_comunes: ["No llevar agua", "Ir sin guía"],
    lat: 22.2131, lng: -98.8158,
    imagen_hero: "/imagenes/zona-arqueologica-tamtoc/hero.jpg",
    imagen_galeria: [
      "/imagenes/zona-arqueologica-tamtoc/gallery-1.jpg",
      "/imagenes/zona-arqueologica-tamtoc/gallery-2.jpg",
    ],
  },
  {
    id: "cascada_tamasopo", slug: "cascadas-de-tamasopo",
    nombre: "Cascadas de Tamasopo", zona: "Tamasopo", tipo: "Naturaleza", emoji: "🏊",
    descripcion: "Paraíso de agua azul turquesa con pozas para nadar, ideal para familias.",
    duracion_hrs: 4, precio_entrada: "$60 MXN", dificultad: "baja",
    ideal_para: ["familia", "relajacion", "fotografia"],
    horario: "08:00–17:00", dias_abierto: "Lunes a Domingo",
    mejor_hora: "10:00–14:00", temporada_ideal: "Nov–May",
    advertencias: "SOLO bloqueador biodegradable.",
    como_llegar: "45 min desde Valles por autopista",
    que_llevar: ["traje de baño", "bloqueador biodegradable"],
    datos_curiosos: ["Las pozas cambian de color según la estación"],
    errores_comunes: ["Usar bloqueador químico"],
    lat: 21.92, lng: -99.39,
    imagen_hero: "/imagenes/cascadas-de-tamasopo/hero.jpg",
    imagen_galeria: [
      "/imagenes/cascadas-de-tamasopo/gallery-1.jpg",
      "/imagenes/cascadas-de-tamasopo/gallery-2.webp",
    ],
  },
  {
    id: "balneario_taninul", slug: "balneario-taninul",
    nombre: "Balneario Taninul", zona: "Ciudad Valles", tipo: "Naturaleza", emoji: "♨️",
    descripcion: "Aguas termales sulfurosas (36°C constante) y lodo terapéutico.",
    duracion_hrs: 4, precio_entrada: "$150 MXN", dificultad: "baja",
    ideal_para: ["familia", "pareja", "relajacion"],
    horario: "07:00–20:00", dias_abierto: "Lunes a Domingo",
    mejor_hora: "08:00 o 18:00", temporada_ideal: "Dic–Ene",
    advertencias: "NO llevar joyería de plata (azufre la oscurece).",
    como_llegar: "15 min desde Valles",
    que_llevar: ["traje de baño", "sandalias", "toalla"],
    datos_curiosos: ["Agua mantiene 36°C constante todo el año"],
    errores_comunes: ["Llevar joyería de plata"],
    lat: 21.9452, lng: -98.8895,
    imagen_hero: "/imagenes/balneario-taninul/hero.webp",
    imagen_galeria: [],
  },

  // ─── NUEVOS DESTINOS (9) ────────────────────────────────────────────────────

  // 1. Cascadas de Minas Viejas
  {
    id: "cascadas-minas-viejas",
    slug: "cascadas-minas-viejas",
    nombre: "Cascadas de Minas Viejas",
    zona: "El Naranjo",
    tipo: "Aventura",
    emoji: "🌊",
    descripcion: "Dos caídas gemelas de 50 m con pozas color turquesa rodeadas de selva preservada.",
    duracion_hrs: 4,
    precio_entrada: "$100 MXN",
    dificultad: "baja",
    ideal_para: ["natacion", "aventura", "familia", "fotografia"],
    horario: "08:00–18:00",
    dias_abierto: "Lunes a Domingo",
    mejor_hora: "08:00–10:00",
    temporada_ideal: "Oct–May",
    advertencias: "Respetar las zonas de nado señalizadas — hay corrientes fuertes en el canal central. El camino de acceso puede ser lodoso en temporada de lluvias. Solo efectivo.",
    como_llegar: "105 min desde Valles · Carretera 70 norte → desvío El Naranjo por Carr. 80",
    que_llevar: ["calzado acuático o tenis que puedan mojarse", "bloqueador solar biodegradable (obligatorio)", "cambio de ropa seca", "efectivo (sin cajero en la zona)", "repelente natural"],
    datos_curiosos: [
      "Consideradas de las cascadas con el agua más azul de toda la región por alta concentración de minerales kársticos.",
      "El nombre viene de una antigua explotación minera del siglo XIX en el ejido.",
    ],
    errores_comunes: ["Llegar sin efectivo", "Ir en temporada de lluvias sin verificar acceso"],
    lat: 22.576111,
    lng: -99.280556,
    imagen_hero: "",
    imagen_galeria: [],
    seo: {
      metaTitle: "Guía Cascadas Minas Viejas 2026 | El Naranjo SLP",
      metaDescription: "Descubre las Cascadas de Minas Viejas en 2026: precios, horarios, cómo llegar y consejos para ver el turquesa más intenso de la Huasteca Potosina. ¡Planea ya!",
      keywords: ["minas viejas cascadas", "el naranjo san luis potosi", "cascadas huasteca potosina", "minas viejas 2026", "pozas turquesa slp"],
      faqPrincipales: [
        {
          pregunta: "¿Cuánto cuesta la entrada a Minas Viejas en 2026?",
          respuesta: "El costo aproximado es de $100 MXN por persona. Solo efectivo, no hay cajero en la zona.",
        },
        {
          pregunta: "¿Se puede nadar en las Cascadas de Minas Viejas?",
          respuesta: "Sí, hay pozas designadas con aguas tranquilas para nadar. Usa bloqueador biodegradable obligatoriamente.",
        },
        {
          pregunta: "¿Cómo llegar a Minas Viejas desde Ciudad Valles?",
          respuesta: "Toma la carretera 70 norte y desvíate hacia El Naranjo por la 80. Son aproximadamente 95 km y 1 hora 45 minutos en auto.",
        },
      ],
    },
  },

  // 2. Manantial de la Media Luna
  {
    id: "laguna-media-luna",
    slug: "laguna-media-luna",
    nombre: "Manantial de la Media Luna",
    zona: "Rioverde",
    tipo: "Bienestar",
    emoji: "🌙",
    descripcion: "Manantial termal cristalino con visibilidad de 30 m y vestigios prehispánicos sumergidos.",
    duracion_hrs: 6,
    precio_entrada: "$150 MXN",
    dificultad: "baja",
    ideal_para: ["buceo", "snorkel", "fotografia", "pareja"],
    horario: "08:00–18:30",
    dias_abierto: "Lunes a Domingo",
    mejor_hora: "09:00–11:00",
    temporada_ideal: "Todo el año",
    advertencias: "No tocar el fondo para no levantar sedimentos. Chaleco salvavidas obligatorio para no-buceadores. Bloqueador no biodegradable estrictamente prohibido.",
    como_llegar: "120 min desde Valles · Carretera 70 poniente hasta Rioverde, seguir señales al Ejido El Jabalí",
    que_llevar: ["equipo de snorkel (o rentar en sitio)", "traje de baño", "toalla", "googles de natación", "efectivo"],
    datos_curiosos: [
      "Se han encontrado ofrendas prehispánicas y posibles restos de mamut en el fondo del manantial.",
      "El nombre 'Media Luna' viene de la forma semicircular perfecta del espejo de agua.",
    ],
    errores_comunes: ["No reservar en temporada alta (cupo limitado)", "Llevar bloqueador químico"],
    lat: 21.859722,
    lng: -100.012500,
    imagen_hero: "",
    imagen_galeria: [],
    seo: {
      metaTitle: "Laguna Media Luna Rioverde 2026 | Guía de Viaje",
      metaDescription: "Visita el Manantial de la Media Luna en 2026: buceo, snorkel y aguas termales a 27°C en San Luis Potosí. Precios, reservaciones y cómo llegar desde Ciudad Valles.",
      keywords: ["laguna media luna rioverde", "manantial san luis potosi", "buceo media luna", "que hacer en rioverde", "media luna 2026"],
      faqPrincipales: [
        {
          pregunta: "¿Qué temperatura tiene el agua de la Media Luna?",
          respuesta: "El agua se mantiene constante entre 27°C y 29°C durante todo el año, independientemente de la temporada.",
        },
        {
          pregunta: "¿Es necesario saber bucear para disfrutar la Media Luna?",
          respuesta: "No, puedes practicar snorkel o nadar con googles y ver el fondo cristalino desde la superficie.",
        },
        {
          pregunta: "¿Hay límite de personas en la Media Luna?",
          respuesta: "Sí, el acceso está controlado para preservar el ecosistema. Se recomienda reservar en temporada alta.",
        },
      ],
    },
  },

  // 3. Cascada El Aguacate
  {
    id: "cascada-el-aguacate",
    slug: "cascada-el-aguacate",
    nombre: "Cascada El Aguacate",
    zona: "Aquismón",
    tipo: "Aventura",
    emoji: "🌿",
    descripcion: "Caída de 70 m entre cañones de selva densa — uno de los secretos mejor guardados de Aquismón.",
    duracion_hrs: 3,
    precio_entrada: "$50 MXN",
    dificultad: "media",
    ideal_para: ["senderismo", "fotografia", "naturaleza", "aventura"],
    horario: "09:00–17:00",
    dias_abierto: "Lunes a Domingo",
    mejor_hora: "15:00–16:30",
    temporada_ideal: "Dic–Abr",
    advertencias: "Senderos resbaladizos — especialmente en el descenso hacia la poza. Sin señal de celular en toda la ruta. Guía local obligatorio. Coordenadas aproximadas — verificar GPS antes de ir.",
    como_llegar: "70 min desde Valles · Carretera 85 sur → desvío al Ejido El Aguacate antes de Aquismón",
    que_llevar: ["calzado de montaña con suela de agarre (obligatorio)", "bastones de trekking (recomendado)", "agua suficiente para 4 horas", "repelente natural", "bloqueador biodegradable"],
    datos_curiosos: [
      "Es una de las cascadas más altas y menos documentadas de la zona de Aquismón.",
      "Los guías locales la llaman 'la cascada que los turistas aún no descubrieron'.",
    ],
    errores_comunes: ["No contratar guía local", "Ir con calzado inadecuado"],
    lat: 21.668240,
    lng: -99.081560,
    imagen_hero: "",
    imagen_galeria: [],
    seo: {
      metaTitle: "Cascada El Aguacate Aquismón 2026 | Guía Huasteca",
      metaDescription: "Cascada El Aguacate en Aquismón: 70 metros de caída, sendero de selva y pozas naturales. Guía 2026 con precios, cómo llegar y lo que nadie te cuenta. ¡Descúbrela!",
      keywords: ["cascada el aguacate aquismón", "cascadas secretas huasteca potosina", "senderismo aquismón", "cascadas slp 2026", "turismo aventura san luis potosi"],
      faqPrincipales: [
        {
          pregunta: "¿Es difícil llegar a la Cascada El Aguacate?",
          respuesta: "La caminata es de dificultad media — unos 45 minutos por sendero de selva. Se requiere calzado de montaña y guía local obligatorio.",
        },
        {
          pregunta: "¿Hay baños en la Cascada El Aguacate?",
          respuesta: "Las instalaciones son mínimas. Hay baños básicos en la comunidad ejidal a la entrada.",
        },
        {
          pregunta: "¿Es apto para niños la Cascada El Aguacate?",
          respuesta: "Se recomienda para niños mayores de 10 años con experiencia en caminata. El terreno es irregular y hay tramos empinados.",
        },
      ],
    },
  },

  // 4. Cascada El Salto
  {
    id: "cascada-el-salto",
    slug: "cascada-el-salto",
    nombre: "Cascada El Salto",
    zona: "El Naranjo",
    tipo: "Naturaleza",
    emoji: "💧",
    descripcion: "Pared de roca kárstica de 70 m con pozas turquesas permanentes — con o sin cascada es espectacular.",
    duracion_hrs: 3,
    precio_entrada: "$50 MXN",
    dificultad: "baja",
    ideal_para: ["natacion", "fotografia", "familia"],
    horario: "08:00–17:30",
    dias_abierto: "Lunes a Domingo",
    mejor_hora: "Mañana temprana",
    temporada_ideal: "Sep–Oct (cascada activa) · pozas todo el año",
    advertencias: "Piso extremadamente resbaladizo en las pozas — accidentes frecuentes sin calzado adecuado. La cascada principal puede estar completamente seca la mayor parte del año.",
    como_llegar: "110 min desde Valles · Desde El Naranjo, carretera hacia Ciudad del Maíz, 8 km · Acceso pavimentado",
    que_llevar: ["calzado acuático — el piso cerca de las pozas es muy resbaladizo", "ropa ligera y traje de baño", "protección solar", "comida (sin restaurantes en el sitio)", "efectivo"],
    datos_curiosos: [
      "El flujo se desvía artificialmente hacia una planta hidroeléctrica — por eso la cascada 'desaparece' en temporada seca.",
      "En septiembre de 2024, las lluvias excepcionales la activaron por 3 semanas continuas.",
    ],
    errores_comunes: ["Ir esperando ver la cascada sin verificar antes", "No llevar calzado antiderrapante"],
    lat: 22.592500,
    lng: -99.308333,
    imagen_hero: "",
    imagen_galeria: [],
    seo: {
      metaTitle: "Cascada El Salto El Naranjo 2026 | Guía Completa",
      metaDescription: "Todo sobre Cascada El Salto en El Naranjo, SLP: cuándo cae de verdad, precios 2026, pozas turquesas y cómo combinarla con El Meco en un solo día. ¡Entra!",
      keywords: ["cascada el salto el naranjo", "pozas azules el naranjo slp", "cascadas huasteca potosina 2026", "turismo el naranjo san luis potosi", "cascada el salto slp"],
      faqPrincipales: [
        {
          pregunta: "¿Por qué no tiene agua la Cascada El Salto?",
          respuesta: "El flujo se desvía a una planta hidroeléctrica. Solo cae con lluvias excepcionales, principalmente en septiembre y octubre.",
        },
        {
          pregunta: "¿Se puede nadar si la cascada El Salto no tiene agua?",
          respuesta: "Sí, las pozas naturales mantienen agua turquesa cristalina todo el año, con o sin la caída activa.",
        },
        {
          pregunta: "¿Hay restaurantes cerca de Cascada El Salto?",
          respuesta: "No en el sitio, pero en El Naranjo (a 8 km) hay varios restaurantes con comida típica huasteca.",
        },
      ],
    },
  },

  // 5. Cascada El Meco
  {
    id: "cascada-el-meco",
    slug: "cascada-el-meco",
    nombre: "Cascada El Meco",
    zona: "El Naranjo",
    tipo: "Aventura",
    emoji: "🦜",
    descripcion: "Cascada constante de 35 m sobre roca caliza — la única de El Naranjo que cae todo el año.",
    duracion_hrs: 2,
    precio_entrada: "$60 MXN",
    dificultad: "baja",
    ideal_para: ["fotografia", "familia", "pareja"],
    horario: "08:00–18:00",
    dias_abierto: "Lunes a Domingo",
    mejor_hora: "17:00–18:00",
    temporada_ideal: "Nov–May",
    advertencias: "Corrientes fuertes en el centro del río — no nadar fuera de las zonas permitidas. La panga no opera si el río está crecido.",
    como_llegar: "105 min desde Valles · Desde El Naranjo, 5 km señalizados hacia el embarcadero",
    que_llevar: ["cámara o teléfono con funda impermeable", "repelente natural", "ropa cómoda", "efectivo para la panga y restaurantes"],
    datos_curiosos: [
      "Su nombre proviene de los monos 'mecos' (monos araña) que habitaban la zona antes de la deforestación del siglo XX.",
      "Es la única cascada permanente del municipio de El Naranjo — cae todo el año sin importar la temporada.",
    ],
    errores_comunes: ["Ir sin efectivo para la panga (~$150 MXN)", "No preguntar si la panga opera ese día"],
    lat: 22.585556,
    lng: -99.300556,
    imagen_hero: "",
    imagen_galeria: [],
    seo: {
      metaTitle: "Cascada El Meco El Naranjo 2026 | Mirador y Pangas",
      metaDescription: "Cascada El Meco en El Naranjo: la única cascada permanente de la zona. Guía 2026 con precios de panga, rappel, restaurantes con vista y cómo llegar. ¡Descúbrela!",
      keywords: ["cascada el meco el naranjo", "paseo en panga huasteca", "el meco san luis potosi 2026", "cascadas permanentes huasteca", "que hacer en el naranjo slp"],
      faqPrincipales: [
        {
          pregunta: "¿El mirador de Cascada El Meco es gratuito?",
          respuesta: "Sí, el mirador desde la carretera es completamente gratuito. El acceso al río y las pangas tienen costo adicional (~$60 MXN entrada, ~$150 MXN panga).",
        },
        {
          pregunta: "¿Se puede hacer rappel en Cascada El Meco?",
          respuesta: "Sí, hay operadores locales certificados que ofrecen rappel en la cascada. Consulta directamente en el sitio.",
        },
        {
          pregunta: "¿Hay restaurantes con vista a Cascada El Meco?",
          respuesta: "Sí, varios restaurantes tienen terrazas sobre el río con vista directa a la cascada — una de las mejores experiencias de El Naranjo.",
        },
      ],
    },
  },

  // 6. Sótano de las Huahuas
  {
    id: "sotano-de-las-huahuas",
    slug: "sotano-de-las-huahuas",
    nombre: "Sótano de las Huahuas",
    zona: "Aquismón",
    tipo: "Extrema",
    emoji: "🕳️",
    descripcion: "Abismo de 478 m donde miles de loros y vencejos dibujan espirales al amanecer y atardecer.",
    duracion_hrs: 3,
    precio_entrada: "$60 MXN",
    dificultad: "media",
    ideal_para: ["fotografia", "naturaleza", "aventura"],
    horario: "06:00–19:00",
    dias_abierto: "Lunes a Domingo",
    mejor_hora: "17:30–18:30",
    temporada_ideal: "Mar–Oct",
    advertencias: "Caminata de subida intensa — no apta para personas con problemas de rodillas. No acercarse al borde sin guía. Sin señal de celular en todo el trayecto.",
    como_llegar: "75 min desde Valles · Carretera 85 sur → desvío hacia San Pedro de las Anonas · Terracería final",
    que_llevar: ["lámpara de mano o frontal", "calzado de montaña con agarre", "binoculares", "cámara con teleobjetivo", "agua y snacks", "ropa abrigadora para el amanecer"],
    datos_curiosos: [
      "Con 478 metros de profundidad, es uno de los abismos kársticos más profundos de México.",
      "Los lugareños llaman 'huahuas' a los loros verdes en lengua Tének — de ahí el nombre.",
    ],
    errores_comunes: ["Llegar tarde sin tiempo para ver el vuelo", "No llevar guía — el borde no tiene barandales"],
    lat: 21.603889,
    lng: -99.043889,
    imagen_hero: "",
    imagen_galeria: [],
    seo: {
      metaTitle: "Sótano de las Huahuas 2026 | Espectáculo de Aves",
      metaDescription: "Sótano de las Huahuas en Aquismón: 478 m de profundidad y miles de loros en espiral al atardecer. Guía 2026 con horarios, caminata y diferencias con las Golondrinas.",
      keywords: ["sótano de las huahuas aquismón", "abismo loros huasteca potosina", "senderismo aquismón slp", "huahuas 2026", "sotanos huasteca potosina"],
      faqPrincipales: [
        {
          pregunta: "¿A qué hora salen las aves del Sótano de las Huahuas?",
          respuesta: "Los loros salen al amanecer (6:00–7:00 AM) y regresan al atardecer (18:00–19:00 PM). El atardecer suele ser más espectacular por la luz.",
        },
        {
          pregunta: "¿En qué se diferencia el Sótano de las Huahuas del Sótano de las Golondrinas?",
          respuesta: "Las Golondrinas (333 m) tiene vencejos y el vuelo icónico es al amanecer. Las Huahuas (478 m) alberga loros verdes y el mejor espectáculo es al atardecer. Son experiencias distintas.",
        },
        {
          pregunta: "¿Es difícil la caminata al Sótano de las Huahuas?",
          respuesta: "La caminata de subida es de 30–40 minutos de intensidad media. Requiere calzado de montaña. No es apta para personas con problemas serios de movilidad.",
        },
      ],
    },
  },

  // 7. Cuevas de Mantetzulel
  {
    id: "cuevas-de-mantetzulel",
    slug: "cuevas-de-mantetzulel",
    nombre: "Cuevas de Mantetzulel",
    zona: "Aquismón",
    tipo: "Naturaleza",
    emoji: "🌅",
    descripcion: "Cuatro cuevas sagradas con techos colapsados — la luz entra desde arriba como columnas sólidas.",
    duracion_hrs: 4,
    precio_entrada: "$70 MXN",
    dificultad: "media",
    ideal_para: ["fotografia", "cultura", "naturaleza"],
    horario: "09:00–17:00",
    dias_abierto: "Lunes a Domingo",
    mejor_hora: "11:00–13:00",
    temporada_ideal: "Oct–May",
    advertencias: "Senderos muy resbaladizos después de lluvia — posponer si hubo lluvia reciente. Sin señal de celular. Guía comunitario obligatorio. Coordenadas aproximadas — verificar GPS antes de ir.",
    como_llegar: "70 min desde Valles · Desde Aquismón, 12 km hacia comunidad Mantetzulel · Últimos 5 km terracería",
    que_llevar: ["calzado con suela antideslizante (obligatorio)", "linterna o frontal", "repelente natural", "ropa que no importe ensuciar", "agua para 4 horas"],
    datos_curiosos: [
      "Los habitantes Tének consideran estas cuevas como portales de curación — aún se realizan ceremonias tradicionales.",
      "La Cueva del Espíritu Santo no es un túnel: es una bóveda abierta al cielo con 30 metros de altura.",
    ],
    errores_comunes: ["Ir sin guía comunitario", "Visitar después de lluvia reciente (senderos peligrosos)"],
    lat: 21.631450,
    lng: -99.064820,
    imagen_hero: "",
    imagen_galeria: [],
    seo: {
      metaTitle: "Cuevas de Mantetzulel Aquismón 2026 | Guía Completa",
      metaDescription: "Cuevas de Mantetzulel en Aquismón: bóvedas sagradas con luz cenital y turismo comunitario Tének. Guía 2026 con precios, caminata y el mejor horario para la foto perfecta.",
      keywords: ["cuevas mantetzulel aquismón", "espeleología huasteca potosina", "turismo comunitario tének slp", "mantetzulel 2026", "cuevas sagradas san luis potosi"],
      faqPrincipales: [
        {
          pregunta: "¿Cuántas cuevas se visitan en Mantetzulel?",
          respuesta: "El recorrido estándar visita 2 cuevas grandes. Con tiempo y condición física se pueden explorar las 4 cavidades del conjunto.",
        },
        {
          pregunta: "¿Hay murciélagos en las Cuevas de Mantetzulel?",
          respuesta: "Sí, habitan en las zonas altas de las bóvedas, pero no representan riesgo para los visitantes con guía.",
        },
        {
          pregunta: "¿Se necesita equipo especial para visitar Mantetzulel?",
          respuesta: "No equipo de espeleología avanzada. Solo calzado antideslizante, linterna y ropa que pueda ensuciarse.",
        },
      ],
    },
  },

  // 8. Nacimiento de Tambaque
  {
    id: "nacimiento-tambaque",
    slug: "nacimiento-tambaque",
    nombre: "Nacimiento de Tambaque",
    zona: "Aquismón",
    tipo: "Naturaleza",
    emoji: "💎",
    descripcion: "El punto exacto donde el agua brota de la sierra — pozas cristalinas casi sin turistas.",
    duracion_hrs: 3,
    precio_entrada: "$40 MXN",
    dificultad: "baja",
    ideal_para: ["natacion", "familia", "relajacion"],
    horario: "08:00–18:00",
    dias_abierto: "Lunes a Domingo",
    mejor_hora: "09:00–11:00",
    temporada_ideal: "Oct–May",
    advertencias: "Hay zonas profundas cerca del nacimiento — precaución con niños. Pocas opciones de comida en el sitio.",
    como_llegar: "60 min desde Valles · Carretera 85 sur, desvío señalizado hacia Tambaque antes de Aquismón · Acceso pavimentado",
    que_llevar: ["traje de baño", "sandalias acuáticas", "googles para ver el nacimiento bajo el agua", "comida y agua propias", "efectivo"],
    datos_curiosos: [
      "Tambaque significa 'lugar donde el agua cae bajito' en lengua Tének.",
      "El agua brota a temperatura constante todo el año — más fría que el resto de los ríos huastecos.",
    ],
    errores_comunes: ["No llevar googles (pierdes el momento más especial)", "Ir sin comida propia"],
    lat: 21.616667,
    lng: -99.016667,
    imagen_hero: "",
    imagen_galeria: [],
    seo: {
      metaTitle: "Nacimiento de Tambaque 2026 | Aquismón SLP",
      metaDescription: "Nacimiento de Tambaque en Aquismón: donde el agua brota de la sierra en pozas cristalinas. El destino más tranquilo de la Huasteca Potosina. Guía 2026 completa.",
      keywords: ["tambaque aquismón", "nacimiento agua huasteca potosina", "pozas cristalinas slp 2026", "turismo tranquilo huasteca", "tambaque san luis potosi"],
      faqPrincipales: [
        {
          pregunta: "¿Qué tan profunda es el agua en Tambaque?",
          respuesta: "Hay pozas de diversas profundidades: desde muy bajas (menos de 1 m) hasta pozas de hasta 3 metros. Preguntar a los locales antes de nadar.",
        },
        {
          pregunta: "¿Hay asadores en Tambaque?",
          respuesta: "Sí, hay palapas con fogones y áreas para picnic. Lleva tu propia comida.",
        },
        {
          pregunta: "¿El camino a Tambaque está pavimentado?",
          respuesta: "Sí, el acceso es pavimentado y transitable para cualquier tipo de vehículo.",
        },
      ],
    },
  },

  // 9. Nacimiento de Huichihuayán
  {
    id: "nacimiento-huichihuayan",
    slug: "nacimiento-huichihuayan",
    nombre: "Nacimiento de Huichihuayán",
    zona: "Huehuetlán",
    tipo: "Naturaleza",
    emoji: "🐟",
    descripcion: "Río cristalino que nace de una cueva — tan claro que se ven los peces en el fondo desde la orilla.",
    duracion_hrs: 3,
    precio_entrada: "$30 MXN",
    dificultad: "baja",
    ideal_para: ["natacion", "familia", "fotografia"],
    horario: "08:30–18:00",
    dias_abierto: "Lunes a Domingo",
    mejor_hora: "15:00–17:00",
    temporada_ideal: "Todo el año",
    advertencias: "Hay zonas profundas cerca del nacimiento — precaución con niños. Destino poco documentado — verificar condiciones antes de ir.",
    como_llegar: "80 min desde Valles · Carretera 85 sur hacia Tamazunchale · Desvío a Huehuetlán · Señales al nacimiento desde el centro del pueblo",
    que_llevar: ["traje de baño", "sandalias acuáticas", "alimentos (opciones limitadas en el sitio)", "googles de natación"],
    datos_curiosos: [
      "Huichihuayán es uno de los pueblos más activos en la preservación de la danza de los Voladores de Palo.",
      "El agua es tan cristalina que la comunidad local la usa directamente para consumo humano.",
    ],
    errores_comunes: ["No preguntar en el pueblo sobre la danza de Voladores", "No llevar googles para ver los peces"],
    lat: 21.483333,
    lng: -98.966667,
    imagen_hero: "",
    imagen_galeria: [],
    seo: {
      metaTitle: "Nacimiento de Huichihuayán 2026 | Huehuetlán SLP",
      metaDescription: "Nacimiento de Huichihuayán en Huehuetlán: río cristalino con peces visibles y la danza de los Voladores. El destino más auténtico del sur de la Huasteca. Guía 2026 completa.",
      keywords: ["nacimiento huichihuayán huehuetlán", "rio cristalino huasteca potosina", "voladores huichihuayan", "turismo huehuetlán slp 2026", "destinos sur huasteca potosina"],
      faqPrincipales: [
        {
          pregunta: "¿El agua de Huichihuayán está fría?",
          respuesta: "Es fresca y agradable, no tan fría como Tambaque. El clima cálido de la zona la mantiene a una temperatura ideal para nadar.",
        },
        {
          pregunta: "¿Se puede rentar chaleco en Huichihuayán?",
          respuesta: "Sí, hay puestos locales que rentan chalecos y llantas a precios accesibles.",
        },
        {
          pregunta: "¿Qué son los Voladores de Huichihuayán?",
          respuesta: "Es una danza ritual prehispánica declarada Patrimonio de la Humanidad por la UNESCO. En Huichihuayán se practica activamente — pregunta en el pueblo si hay presentación.",
        },
      ],
    },
  },
];
