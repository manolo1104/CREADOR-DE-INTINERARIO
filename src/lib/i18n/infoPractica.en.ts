import type { Locale } from "./config";
import type { FAQCategory } from "@/components/FAQAccordion";

/**
 * Traducción de /info-practica, la guía práctica de viaje.
 *
 * Es la página más larga del sitio y la más delicada: lleva distancias de
 * carretera, precios de autobús, presupuestos, horarios y números de emergencia.
 * Por eso todo el copy vive aquí, con una interfaz que obliga a que el inglés
 * tenga EXACTAMENTE las mismas claves — media traducción en esta página no es
 * una frase fea, es alguien que llega a una central a la hora equivocada.
 *
 * ⚠️ Las CIFRAS se copian tal cual del español: kilómetros, temperaturas,
 * precios, teléfonos. Ninguna es nueva.
 *
 * ⚠️ Dos respuestas del FAQ se CORRIGIERON en los dos idiomas (13 ago 2026)
 * porque contradecían al motor de reservas:
 *   · decía que se paga el total al reservar → el carrito cobra 30 %
 *     (`ANTICIPO_PCT` en `lib/carrito.ts`);
 *   · decía "menores de 4 gratis, de 4 a 12 al 60 %" → `calcTourTotal`
 *     (`lib/tourBooking.ts`) cobra 70 % de 6 a 10 años y 50 % a los menores de 6.
 */

export interface Bloque {
  titulo: string;
  items: string[];
}

export interface InfoPracticaContent {
  metaTitle: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  twitterTitle: string;
  twitterDescription: string;

  heroEyebrow: string;
  heroH1a: string;
  heroH1b: string;
  heroIntro: string;
  /** Solo las etiquetas; los `href` (anclas) no cambian. */
  navLabels: string[];

  tituloComoLlegar: string;
  tituloCuandoViajar: string;
  tituloDondeQuedarse: string;
  tituloHotelParaiso: string;
  tituloMapa: string;
  tituloPapan: string;
  tituloPresupuesto: string;
  tituloItinerarios: string;
  tituloQueLlevar: string;
  tituloSeguridad: string;

  // ── Cómo llegar ──
  llegarIntroFuerte: string;
  llegarIntro: string;
  llegarBloques: Bloque[];
  llegarFotoAlt: string;
  llegarFotoPie: string;
  consejoViajero: string;
  llegarConsejo: string;
  reservaTransporte: string;
  afiliados: { nombre: string; sub: string }[];

  // ── Cuándo viajar ──
  cuandoIntro: string;
  fotoSecaAlt: string;
  fotoSecaPie: string;
  fotoVerdeAlt: string;
  fotoVerdePie: string;
  temporadas: { meses: string; etiqueta: string; puntos: string[] }[];
  verToursTemporada: string;
  tablaCabeceras: [string, string, string, string];
  tablaFilas: { mes: string; temp: string; lluvia: string; cascadas: string }[];

  // ── Dónde quedarse ──
  quedarseIntro: string;
  vallesTitulo: string;
  vallesTexto: string;
  vallesItems: string[];
  verEnAirbnb: string;
  verEnBooking: string;
  xilitlaTitulo: string;
  xilitlaTexto1: string;
  xilitlaLasPozas: string;
  xilitlaTexto2: string;
  recomendacionEquipo: string;
  hotelNombre: string;
  hotelTexto: string;
  hotelItems: string[];
  consultarDisponibilidad: string;
  otrasOpciones: string;
  xilitlaOtras: string[];
  xilitlaMicroCta: string;
  tamasopoTitulo: string;
  tamasopoTexto: string;
  tamasopoItems: string[];

  // ── Hotel Paraíso ──
  paraisoIntroA: string;
  paraisoIntroB: string;
  paraisoFotoHeroAlt: string;
  paraisoFotoHabAlt: string;
  paraisoFotoTerrazaAlt: string;
  boutique4: string;
  porQueHospedarte: string;
  paraisoPorQue: string[];
  reservasTitulo: string;
  reservasTexto: string;
  verEnGoogleMaps: string;

  // ── Mapa ──
  mapaIntroA: string;
  mapaXilitla: string;
  mapaIntroB: string;
  mapaIntroC: string;
  mapaPuntos: string[];
  mapaTitle: string;
  mapaDestinos: { label: string; dist: string }[];

  // ── Papán ──
  papanIntroA: string;
  papanNombre: string;
  papanIntroB: string;
  papanNoPerderte: string;
  papanPlatillos: string[];
  papanRazones: string;
  papanRazonesItems: string[];
  papanFotoHeroAlt: string;
  papanFotoPlatillosAlt: string;
  papanFotoFogonAlt: string;

  // ── Presupuesto ──
  presupuestoIntro: string;
  niveles: { nivel: string; rango: string; incluye: string[] }[];
  porDia: string;
  pagosTitulo: string;
  pagosItems: string[];

  // ── Itinerarios ──
  itinerariosIntro: string;
  planes: {
    etiqueta: string;
    dias: string;
    sub: string;
    pasos: { dia: string; lugar: string }[];
    cta: string;
  }[];
  itinerariosPie: string;
  itinerariosPieLink: string;

  // ── Qué llevar ──
  llevarFotoAlt: string;
  llevarFotoPieA: string;
  llevarFotoPieLink: string;
  llevarCategorias: Bloque[];

  // ── Seguridad ──
  emergenciasTitulo: string;
  emergencias: { label: string; num: string }[];
  seguridadBloques: Bloque[];

  // ── FAQ ──
  faqTitulo: string;
  faqIntro: string;
  cancelacion: { titulo: string; sub: string }[];
  faq: FAQCategory[];

  // ── Guía PDF ──
  guiaEyebrow: string;
  guiaH2a: string;
  guiaH2b: string;
  guiaTexto: string;
  guiaItems: string[];
  guiaGarantia: string;
  guiaCta: string;

  // ── CTA final ──
  ctaH2a: string;
  ctaH2b: string;
  ctaTexto: string;
  ctaDestinos: string;
  ctaRecomendar: string;

  // ── ClimaWidget ──
  clima: {
    herramienta: string;
    pregunta: string;
    instruccion: string;
    temperatura: string;
    lluvia: string;
    cascadas: string;
    recomendados: (mes: string) => string;
    seleccionaMes: string;
    lluviaValores: Record<string, string>;
    cascadasValores: Record<string, string>;
    recomendaciones: Record<"ideal" | "buena" | "caluroso" | "lluvia", {
      titulo: string;
      texto: string;
      tours: string[];
    }>;
  };
}

// ─────────────────────────────────────────────────────────────────────────────

const ES: InfoPracticaContent = {
  metaTitle: "Info Práctica — Cómo Llegar, Cuándo ir y Dónde Quedarse | Huasteca Potosina",
  metaDescription:
    "Todo lo que necesitas antes de viajar a la Huasteca Potosina: vuelos desde CDMX, temporadas, hospedaje en Ciudad Valles y Xilitla, presupuesto y consejos locales.",
  ogTitle: "Info Práctica — Guía Completa para viajar a la Huasteca Potosina",
  ogDescription: "Cómo llegar, cuándo ir, dónde quedarse y presupuesto. Todo actualizado 2026.",
  twitterTitle: "Info Práctica — Huasteca Potosina",
  twitterDescription: "Cómo llegar, cuándo ir, dónde quedarse, presupuesto y qué llevar.",

  heroEyebrow: "Todo lo que necesitas saber",
  heroH1a: "Guía Práctica de ",
  heroH1b: "Viaje",
  heroIntro:
    "Todo lo que necesitas para llegar, moverte, hospedarte y disfrutar la Huasteca Potosina sin sorpresas desagradables.",
  navLabels: [
    "Cómo llegar", "Cuándo viajar", "Dónde quedarse", "Hotel Paraíso", "Dónde comer",
    "Presupuesto", "Itinerarios", "Qué llevar", "Mapa", "Seguridad",
  ],

  tituloComoLlegar: "Cómo llegar",
  tituloCuandoViajar: "Cuándo viajar",
  tituloDondeQuedarse: "Dónde quedarse",
  tituloHotelParaiso: "Nuestra base: Hotel Paraíso Encantado",
  tituloMapa: "Mapa de la región",
  tituloPapan: "Dónde comer: Restaurante Papán Huasteco",
  tituloPresupuesto: "Presupuesto diario",
  tituloItinerarios: "Itinerarios sugeridos",
  tituloQueLlevar: "Qué llevar",
  tituloSeguridad: "Seguridad y emergencias",

  llegarIntroFuerte: "Ciudad Valles (SLP)",
  llegarIntro:
    " es la puerta de entrada a la Huasteca Potosina. Desde aquí, todos los destinos principales están a menos de 2 horas.",
  llegarBloques: [
    {
      titulo: "En avión",
      items: [
        "Aeropuerto más cercano: San Luis Potosí (SLP) — 3.5h en coche",
        "Alternativa: Tampico (TAM) — 2h en coche, más conexiones",
        "Desde CDMX: ~1h de vuelo + renta de auto recomendada",
        "Aeroméxico y VivaAerobus operan rutas directas",
      ],
    },
    {
      titulo: "En autobús",
      items: [
        "ADO GL desde CDMX (Terminal Norte) → Ciudad Valles: ~8 horas",
        "Precio aprox: $600–900 MXN por persona (clase ejecutiva)",
        "Salidas frecuentes: 10pm, 11:30pm, 12am (llegada madrugada)",
        "También desde Monterrey: ~4.5h, desde Tampico: ~2h",
      ],
    },
    {
      titulo: "En coche",
      items: [
        "Desde CDMX: 430km por autopista Mex-85 / MEX-70 — ~5.5h",
        "Desde Monterrey: 340km por MEX-85 — ~4h",
        "Desde San Luis Potosí capital: 260km — ~3h",
        "Autopista de cuota recomendada: segura y rápida",
        "Gasolina disponible en Valles. Llenar tanque antes de excursiones",
      ],
    },
    {
      titulo: "Transporte local",
      items: [
        "Combis (minivanes) conectan Valles con Micos, Tamasopo, Tamuín",
        "Precio combi: $35–80 MXN dependiendo la ruta",
        "Taxis colectivos a destinos populares: $50–120 MXN p/p",
        "Renta de auto recomendada para mayor flexibilidad",
        "Moto taxi disponible en zonas rurales (~$30–50 MXN)",
      ],
    },
  ],
  llegarFotoAlt: "Grupo en canoa recorriendo el Cañón del Tampaón — Huasteca Potosina",
  llegarFotoPie: "El río Tampaón es la ruta de acceso a la Cascada de Tamul — 30 min en canoa",
  consejoViajero: "Consejo del viajero",
  llegarConsejo:
    "Si vas en grupo de 4 o más personas, rentar un coche en Valles suele salir más barato que taxis y te da total libertad de horarios. Muchos destinos no tienen transporte regular antes de las 8am.",
  reservaTransporte: "Reserva tu transporte",
  afiliados: [
    { nombre: "ADO · Autobús", sub: "CDMX → Valles desde $600" },
    { nombre: "Rentalcars · Auto", sub: "Valles desde ~$800/día" },
    { nombre: "Kayak · Vuelos", sub: "CDMX → SLP desde $1,200" },
  ],

  cuandoIntro: "La Huasteca recibe visitantes todo el año, pero cada temporada tiene su carácter.",
  fotoSecaAlt: "Cueva del Agua con agua turquesa — temporada seca Nov–Mar",
  fotoSecaPie: "Nov–Mar · Agua turquesa",
  fotoVerdeAlt: "Sótano de las Huahuas con vegetación verde exuberante — temporada lluvias",
  fotoVerdePie: "Jun–Oct · Verde intenso",
  temporadas: [
    {
      meses: "Noviembre — Marzo",
      etiqueta: "Temporada ideal",
      puntos: [
        "Cascadas en su nivel óptimo de caudal y color turquesa",
        "Clima fresco (18–26°C), menos humedad",
        "Sótano de Golondrinas: vencejos activos en sus mejores vuelos",
        "Tamtoc: visitable sin calor extremo",
        "Temporada alta de turismo: reservar hospedaje con anticipación",
      ],
    },
    {
      meses: "Abril — Mayo",
      etiqueta: "Primavera — Transición",
      puntos: [
        "Temperaturas suben (28–38°C), especialmente en Tamuín",
        "Cascadas aún con buen caudal, color intenso",
        "Semana Santa: muy concurrido, precios al alza",
        "Ideal para Tamul y Las Pozas (follaje exuberante)",
      ],
    },
    {
      meses: "Junio — Octubre",
      etiqueta: "Temporada de lluvia",
      puntos: [
        "Lluvias frecuentes (especialmente julio–septiembre)",
        "Vegetación explosivamente verde y fotogénica",
        "Ríos crecidos: algunas actividades acuáticas se suspenden",
        "Menos turistas, precios más bajos",
        "Consultar condiciones antes de ir a Tamul (corrientes peligrosas)",
      ],
    },
  ],
  verToursTemporada: "Ver tours disponibles para esta temporada",
  tablaCabeceras: ["Mes", "Temperatura", "Lluvia", "Cascadas"],
  tablaFilas: [
    { mes: "Ene–Feb", temp: "18–26°C", lluvia: "Poca", cascadas: "Excelente" },
    { mes: "Mar–May", temp: "24–36°C", lluvia: "Moderada", cascadas: "Muy buena" },
    { mes: "Jun–Sep", temp: "26–34°C", lluvia: "Alta", cascadas: "Variable" },
    { mes: "Oct–Nov", temp: "22–30°C", lluvia: "Bajando", cascadas: "Buena" },
    { mes: "Dic", temp: "16–24°C", lluvia: "Poca", cascadas: "Muy buena" },
  ],

  quedarseIntro:
    "Elige tu base según el estilo de viaje. Ciudad Valles tiene la mejor logística; Xilitla y Tamasopo ofrecen inmersión total en la naturaleza.",
  vallesTitulo: "Ciudad Valles · Base logística ideal",
  vallesTexto:
    "El hub perfecto. Acceso a todos los destinos en menos de 2 horas, con la mayor variedad de hospedaje, restaurantes y servicios. Aeropuerto pequeño y terminal ADO.",
  vallesItems: [
    "Hotel Valles: tradicional, alberca, desde $900 MXN/noche",
    "Hotel Casa Real: boutique, céntrico, desde $1,100 MXN/noche",
    "Hostal La Huasteca: viajeros solo/mochilero, desde $280 MXN/cama",
    "Airbnb: casas completas desde $600 MXN/noche",
  ],
  verEnAirbnb: "Ver en Airbnb",
  verEnBooking: "Ver en Booking.com",
  xilitlaTitulo: "Xilitla · Experiencia boutique",
  xilitlaTexto1: "El pueblo mágico más cercano a ",
  xilitlaLasPozas: "Las Pozas de Edward James",
  xilitlaTexto2:
    ". Opciones boutique en casas coloniales con vistas al cañón. Perfecto para 1–2 noches de inmersión cultural.",
  recomendacionEquipo: "Recomendación de nuestro equipo",
  hotelNombre: "Hotel Paraíso Encantado Xilitla",
  hotelTexto:
    "Nuestra base de operaciones y la mejor opción en Xilitla. A 50 metros del Jardín Surrealista, con piscina y restaurante de cocina huasteca. Pasamos por ti aquí —igual que a cualquier hospedaje de Xilitla o Ciudad Valles— sin costo extra.",
  hotelItems: [
    "Recogida en la puerta entre 8:00 y 9:00 AM",
    "Piscina con vista al cañón · Restaurante propio · AC y WiFi",
    "Tarifa especial para viajeros que reservan tours con nosotros",
    "Desde $1,200 MXN/noche (habitación doble)",
  ],
  consultarDisponibilidad: "Consultar disponibilidad →",
  otrasOpciones: "Otras opciones",
  xilitlaOtras: [
    "Castillo El Buen Café: histórico, vista panorámica, desde $1,500 MXN",
    "Posada El Castillo: en la propiedad de Edward James, desde $2,200 MXN",
    "Posada Xilitla: familiar, económica, desde $600 MXN",
  ],
  xilitlaMicroCta: "Reserva el Hotel Paraíso Encantado con tarifa especial al combinar con tour",
  tamasopoTitulo: "Tamasopo · Inmersión en la naturaleza",
  tamasopoTexto:
    "Pequeño pueblo a 10 min de las Cascadas de Tamasopo y Puente de Dios. Opciones rurales y eco-campamentos. Ideal para amantes de la naturaleza.",
  tamasopoItems: [
    "Cabañas Tamasopo: piscina, naturaleza, desde $800 MXN/noche",
    "Eco-camping junto a las cascadas: desde $150 MXN/persona",
    "Posadas familiares: básicas, auténticas, desde $350 MXN/noche",
  ],

  paraisoIntroA: "El ",
  paraisoIntroB:
    " es nuestra casa, a pasos del Jardín Surrealista de Edward James. No hace falta hospedarte aquí para tomar un tour —pasamos por ti a donde te quedes, en Xilitla o en Ciudad Valles—, pero si te quedas con nosotros la logística es más simple y sales por la puerta.",
  paraisoFotoHeroAlt: "Hotel Paraíso Encantado Xilitla — fachada y jardines",
  paraisoFotoHabAlt: "Habitación del Hotel Paraíso Encantado Xilitla",
  paraisoFotoTerrazaAlt: "Terraza con vista al cañón en el Hotel Paraíso Encantado",
  boutique4: "Boutique 4 estrellas",
  porQueHospedarte: "¿Por qué hospedarte aquí?",
  paraisoPorQue: [
    "Sales por la puerta: cero traslado antes de empezar el tour",
    "A 50 metros del Jardín Surrealista de Edward James",
    "Desayuno de cocina huasteca incluido en los tours",
    "Piscina con vista al cañón y zona de selva",
    "Habitaciones con AC, WiFi y baño privado",
    "Recepción 24h para coordinación de logística",
  ],
  reservasTitulo: "Reservas",
  reservasTexto: "Mencionando que vas con nosotros al reservar obtienes tarifa preferencial.",
  verEnGoogleMaps: "Ver en Google Maps →",

  mapaIntroA: "La Huasteca Potosina se concentra alrededor de ",
  mapaXilitla: "Xilitla",
  mapaIntroB: " y ",
  mapaIntroC: ". Todos los destinos principales están a menos de 2 horas entre sí. Puntos clave: ",
  mapaPuntos: ["Cascada de Tamul", "Las Pozas", "Sótano de las Golondrinas", "Puente de Dios"],
  mapaTitle: "Mapa Huasteca Potosina — destinos principales",
  mapaDestinos: [
    { label: "Cascada de Tamul", dist: "1.5h desde Valles" },
    { label: "Las Pozas (Xilitla)", dist: "1h desde Valles" },
    { label: "Sótano de Golondrinas", dist: "1h desde Valles" },
    { label: "Puente de Dios", dist: "45 min desde Valles" },
  ],

  papanIntroA: "En el mismo corazón de Xilitla, el ",
  papanNombre: "Restaurante Papán Huasteco",
  papanIntroB:
    " es nuestra recomendación número uno para cocina regional auténtica. Platillos tradicionales huastecos cocinados en fogón de leña, con ingredientes de la región.",
  papanNoPerderte: "Lo que no debes perderte",
  papanPlatillos: [
    "Zacahuil — el tamal gigante huasteco en hoja de plátano",
    "Bocoles rellenos de frijol y queso fresco",
    "Enchiladas huastecas con carne de cerdo",
    "Café de olla preparado con piloncillo y canela",
    "Agua de tamarindo y jamaica de la región",
  ],
  papanRazones: "Razones para venir",
  papanRazonesItems: [
    "Recetas auténticas de cocineras locales, no fusión turística",
    "Ingredientes frescos de mercado huasteco",
    "Fogón de leña — sabores que no existen en la ciudad",
    "Precios justos: comida completa desde $120 MXN",
    "Perfecto antes o después de visitar Las Pozas",
  ],
  papanFotoHeroAlt: "Restaurante Papán Huasteco — cocina regional auténtica en Xilitla",
  papanFotoPlatillosAlt: "Platillos típicos huastecos — zacahuil y bocoles",
  papanFotoFogonAlt: "Fogón de leña en el Restaurante Papán Huasteco",

  presupuestoIntro:
    "Costos aproximados por persona/día (2026). La Huasteca es sorprendentemente accesible.",
  niveles: [
    {
      nivel: "Económico",
      rango: "$400–600 MXN",
      incluye: [
        "Hospedaje: hostal o camping ($150–200)",
        "Comida: mercado y puestos locales ($100–150)",
        "1 destino por día: $60–220 MXN entrada",
        "Transporte: combis y colectivos ($50–100)",
      ],
    },
    {
      nivel: "Moderado",
      rango: "$800–1,500 MXN",
      incluye: [
        "Hotel 3 estrellas o posada ($400–600)",
        "Restaurantes y cafés ($200–300)",
        "2 destinos por día incluidas actividades",
        "Taxi o renta compartida de auto",
        "Recuerdos y gastos varios",
      ],
    },
    {
      nivel: "Premium",
      rango: "$1,500+ MXN",
      incluye: [
        "Hotel boutique o posada de lujo ($800+)",
        "Restaurante de cocina huasteca gourmet",
        "Tour guiado privado + actividades premium",
        "Renta de coche propia",
        "Spa o experiencias exclusivas",
      ],
    },
  ],
  porDia: "/ día",
  pagosTitulo: "Pagos y efectivo",
  pagosItems: [
    "SIEMPRE llevar efectivo. Muchos destinos solo aceptan efectivo",
    "Cajeros en Ciudad Valles (BBVA, Banamex, HSBC) — surtir antes de salir",
    "Las Pozas y hoteles aceptan tarjeta; Tamul, Golondrinas: solo efectivo",
    "Tipo de cambio: cambiar pesos en Valles, no en aeropuerto",
  ],

  itinerariosIntro:
    "La pregunta más común es: ¿cuántos días necesito y en qué orden? Aquí tres rutas modelo según tu disponibilidad. Todos nuestros tours encajan en cualquiera de estos itinerarios.",
  planes: [
    {
      etiqueta: "Intenso",
      dias: "3 Días",
      sub: "Lo esencial — para fines de semana largos",
      pasos: [
        { dia: "Día 1", lugar: "Llegada a Ciudad Valles · Noche en Valles o Xilitla" },
        { dia: "Día 2", lugar: "Tour Tamul + Sótano de las Huahuas · Salida 8:00–9:00 am · Noche Xilitla" },
        { dia: "Día 3", lugar: "Las Pozas (Edward James) · Regreso tarde" },
      ],
      cta: "Ver tour Tamul →",
    },
    {
      etiqueta: "Ideal",
      dias: "5 Días",
      sub: "Lo recomendado — sin prisas y sin perderte nada",
      pasos: [
        { dia: "Día 1", lugar: "Llegada · Comida en Papán Huasteco · Noche Xilitla" },
        { dia: "Día 2", lugar: "Tour Tamul + Sótano de las Huahuas" },
        { dia: "Día 3", lugar: "Las Pozas de Edward James · Pueblo de Xilitla" },
        { dia: "Día 4", lugar: "Tour Cascada El Meco o Minas Viejas + Micos" },
        { dia: "Día 5", lugar: "Puente de Dios + Tamasopo · Regreso" },
      ],
      cta: "¿Qué tour primero? →",
    },
    {
      etiqueta: "Completo",
      dias: "7 Días",
      sub: "La Huasteca completa — para quienes se quieren perder aquí",
      pasos: [
        { dia: "Día 1", lugar: "Llegada Valles · Explora el centro · Noche Valles" },
        { dia: "Día 2", lugar: "Tour Tamul + Sótano de las Huahuas · Noche Xilitla" },
        { dia: "Día 3", lugar: "Las Pozas · Pueblo Mágico Xilitla · Noche Xilitla" },
        { dia: "Día 4", lugar: "Tour Cascada El Meco · Noche Tamasopo o Valles" },
        { dia: "Día 5", lugar: "Tour Minas Viejas + Micos · Laguna Media Luna" },
        { dia: "Día 6", lugar: "Tour Puente de Dios + Siete Cascadas de Tamasopo" },
        { dia: "Día 7", lugar: "Tamtoc + mercado local + regreso tranquilo" },
      ],
      cta: "Ver todos los tours →",
    },
  ],
  itinerariosPie: "¿No sabes por dónde empezar? ",
  itinerariosPieLink: "Usa el recomendador IA →",

  llevarFotoAlt: "Viajeros disfrutando en las aguas del río Tampaón — equipo básico para la Huasteca",
  llevarFotoPieA: "Aqua shoes y ropa de secado rápido son indispensables en la ",
  llevarFotoPieLink: "Cascada de Tamul",
  llevarCategorias: [
    {
      titulo: "Calzado",
      items: [
        "Aqua shoes INDISPENSABLES para ríos y pozas",
        "Tenis con suela antiderrapante para senderos",
        "Sandalias para hotel/pueblo",
        "Calzado cerrado para Tamtoc (terreno irregular)",
      ],
    },
    {
      titulo: "Ropa",
      items: [
        "Ropa dry-fit o de secado rápido (2–3 mudas)",
        "Traje de baño (llevar 2 si habrá días seguidos de agua)",
        "Camiseta manga larga para sol y repelente",
        "Chamarra ligera para el Sótano de Golondrinas (6°C en el fondo)",
        "Sombrero o gorra imprescindible para Tamtoc y días calurosos",
      ],
    },
    {
      titulo: "Salud y protección",
      items: [
        "Repelente BIODEGRADABLE (obligatorio en pozas y cascadas)",
        "Bloqueador solar BIODEGRADABLE (solo este permitido en agua)",
        "Pastillas potabilizadoras o filtro de agua",
        "Botiquín básico: curitas, antidiarreico, antihistamínico",
        "Medicamento para el mareo si haces lancha en Tamul",
      ],
    },
    {
      titulo: "Documentos y dinero",
      items: [
        "INE o pasaporte vigente",
        "Efectivo en pesos mexicanos (ver sección Presupuesto)",
        "Seguro de viaje recomendado para actividades extremas",
        "Reservaciones descargadas en el celular (sin internet en cascadas)",
        "Número de emergencias guardado: ver sección Seguridad",
      ],
    },
    {
      titulo: "Tecnología",
      items: [
        "Powerbank: muchos sitios sin carga disponible",
        "Funda impermeable para teléfono (esencial en lanchas y pozas)",
        "Cámara de acción (GoPro) si harás actividades acuáticas",
        "Descarga mapas offline de la región antes de salir",
        "Chip local o eSIM: cobertura limitada fuera de Valles",
      ],
    },
    {
      titulo: "Mochila y extras",
      items: [
        "Mochila resistente al agua o bolsas zip-lock para lo electrónico",
        "Botella de agua reutilizable (2L mínimo para días de cascadas)",
        "Snacks energéticos para días largos",
        "Linterna frontal para el Sótano de Golondrinas",
        "Toalla de microfibra de secado rápido",
      ],
    },
  ],

  emergenciasTitulo: "Números de emergencia",
  emergencias: [
    { label: "Emergencias general", num: "911" },
    { label: "Cruz Roja Valles", num: "(481) 382-0119" },
    { label: "IMSS Ciudad Valles", num: "(481) 381-1190" },
    { label: "Bomberos Valles", num: "(481) 382-0123" },
    { label: "Policía Municipal Valles", num: "(481) 382-0066" },
    { label: "Protección Civil SLP", num: "(444) 812-6000" },
  ],
  seguridadBloques: [
    {
      titulo: "Consejos de seguridad general",
      items: [
        "La región es generalmente segura para turistas. Mantén actitud de viajero responsable.",
        "Viaja en grupos y evita excursiones solitarias a cascadas remotas.",
        "Sigue SIEMPRE las indicaciones de guías y personal local en sitios de aventura.",
        "No desobedezcas señales de corriente fuerte o nivel alto de río.",
        "Guarda objetos de valor en el hotel; no los lleves a las cascadas.",
        "Comparte tu itinerario del día con alguien de confianza antes de salir.",
      ],
    },
    {
      titulo: "Seguridad en el agua",
      items: [
        "Chaleco salvavidas OBLIGATORIO en Tamul y actividades de río.",
        "Nunca nadar en zonas con corrientes fuertes sin guía.",
        "Puente de Dios: seguir siempre la cuerda de seguridad instalada.",
        "Consultar caudal de ríos en temporada de lluvia antes de ir.",
        "Habilidades de natación básicas necesarias para Tamul y Puente de Dios.",
        "Tamasopo y Micos: ideales para no nadadores por aguas más tranquilas.",
      ],
    },
    {
      titulo: "Salud",
      items: [
        "Hospital Regional Ciudad Valles: atención de urgencias 24hrs.",
        "Llevar medicamentos básicos: el surtido en zonas rurales es limitado.",
        "Hidratación constante: mínimo 2L diarios, más en días calurosos.",
        "Protección solar rigurosa especialmente en Tamtoc (sin sombra natural).",
        "Diarrea del viajero: beber solo agua embotellada o purificada.",
        "Vacunación: no requerida, pero recomendable hepatitis A y tifoidea.",
      ],
    },
  ],

  faqTitulo: "Preguntas Frecuentes",
  faqIntro: "Todo lo que necesitas saber antes de reservar.",
  cancelacion: [
    { titulo: "+48h de anticipación", sub: "Reembolso completo" },
    { titulo: "-24h de anticipación", sub: "Sin reembolso · Reagendamiento gratuito (1 vez)" },
    { titulo: "No-show", sub: "Sin reembolso" },
  ],
  faq: [
    {
      titulo: "Sobre los tours",
      items: [
        {
          q: "¿Los tours se realizan aunque llueva?",
          a: "Sí, salvo condiciones de alerta meteorológica. La lluvia en la Huasteca es parte de la experiencia y las cascadas lucen más espectaculares. En caso de cancelación por clima extremo, reagendamos sin costo.",
        },
        {
          q: "¿Qué nivel físico se requiere?",
          a: "Depende del tour. Cada ficha indica el nivel (Fácil / Moderado). Los tours Fácil son aptos para toda la familia. Los Moderado requieren poder caminar 3–5 km en terreno irregular.",
        },
        {
          // CORREGIDO (13 ago 2026): antes decía "menores de 4 no pagan" y
          // "de 4 a 12 al 60 %", que no es lo que cobra `calcTourTotal`.
          q: "¿Pueden participar niños?",
          a: "Sí. Los menores de 6 años pagan el 50 % del precio de adulto y los de 6 a 10 años el 70 %. A partir de 11 años pagan tarifa completa. Algunos recorridos son solo para mayores: la ficha de cada tour lo indica.",
        },
        {
          q: "¿Pueden participar personas mayores?",
          a: "Sí, en los tours nivel Fácil. Recomendamos consultarnos si hay condiciones de salud específicas para orientarte al mejor recorrido.",
        },
        {
          q: "¿El guía habla inglés?",
          a: "Nuestros guías están certificados NOM-09 y tenemos guías completamente bilingües disponibles: pídelo al reservar y te asignamos uno.",
        },
        {
          q: "¿Cuántas personas hay en cada tour?",
          a: "Nuestros grupos son pequeños, máximo 12 personas, para garantizar una experiencia personalizada. También ofrecemos tours privados para tu grupo.",
        },
      ],
    },
    {
      titulo: "Reservas y pagos",
      items: [
        {
          q: "¿Cómo reservo mi lugar?",
          a: "Por WhatsApp o con tarjeta de crédito/débito a través de Stripe (pago seguro en línea). Al reservar se confirma tu lugar de inmediato.",
        },
        {
          q: "¿Cuál es la política de cancelación?",
          a: "— Cancelación con 48h o más de anticipación: reembolso completo.\n— Cancelación con menos de 24h: sin reembolso, pero puedes reagendar una vez sin costo adicional.\n— No-show (no presentarse): sin reembolso.\n— Cancelación por parte nuestra (clima extremo u operativo): reembolso completo o reagendamiento sin costo, a tu elección.",
        },
        {
          // CORREGIDO (13 ago 2026): antes decía que se paga el total al
          // reservar; el carrito cobra el 30 % (`ANTICIPO_PCT`).
          q: "¿Necesito pagar el total al reservar?",
          a: "No. Apartas tu lugar con el 30 % del total, pagado en línea de forma segura con tarjeta, y liquidas el resto el día del tour, en efectivo o con tarjeta. Si prefieres otro medio de pago, escríbenos por WhatsApp y lo coordinamos.",
        },
      ],
    },
    {
      titulo: "Logística",
      items: [
        {
          q: "¿Desde dónde salen los tours?",
          a: "No hay un punto de salida único: pasamos por ti a tu hospedaje —hotel, hostal, cabaña o Airbnb— en Xilitla o en Ciudad Valles, y te regresamos al terminar el día. No necesitas hospedarte con nosotros. Las excepciones son el recorrido en RZR (nos vemos en nuestra base de Xilitla) y el buceo en Media Luna (el punto de encuentro es la laguna, en Rioverde).",
        },
        {
          q: "¿A qué hora es la salida?",
          a: "Los tours salen entre las 8:00 y las 9:00 AM; confirmamos tu hora exacta al reservar. Regreso aproximado entre 6:00 y 7:00 PM.",
        },
        {
          q: "¿Qué debo llevar?",
          a: "Ropa cómoda y que puedas mojar, zapatos con agarre (no sandalias de playa), bloqueador solar biodegradable, agua, identificación oficial y ganas de aventura. Todo lo demás lo ponemos nosotros.",
        },
      ],
    },
  ],

  guiaEyebrow: "✦ Guía Definitiva · PDF descargable",
  guiaH2a: "Llévate la guía completa en ",
  guiaH2b: "PDF",
  guiaTexto:
    "Mapa de la región, checklist de equipaje, presupuesto detallado y los 3 itinerarios modelo — todo en un PDF que funciona sin internet, listo para el día del viaje.",
  guiaItems: [
    "Mapa descargable con todos los destinos",
    "Checklist de empaque (no olvides nada)",
    "Presupuesto detallado por tipo de viajero",
    "Itinerarios 3, 5 y 7 días listos para imprimir",
  ],
  guiaGarantia: "Pago seguro · Descarga inmediata · Garantía 7 días",
  guiaCta: "Descargar la guía → $49",

  ctaH2a: "¿Listo para ",
  ctaH2b: "planear tu viaje?",
  ctaTexto:
    "Usa nuestro planificador IA para crear un itinerario personalizado con toda la información práctica que necesitas.",
  ctaDestinos: "Ver destinos",
  ctaRecomendar: "¿Qué tour es para mí? →",

  clima: {
    herramienta: "✦ Herramienta interactiva",
    pregunta: "¿Cuándo vas tú?",
    instruccion: "Selecciona tu mes de viaje y te decimos qué esperar y qué tour encaja mejor.",
    temperatura: "Temperatura",
    lluvia: "Lluvia",
    cascadas: "Cascadas",
    recomendados: (mes) => `Tours recomendados para ${mes}`,
    seleccionaMes: "Selecciona un mes para ver la recomendación personalizada",
    lluviaValores: { Poca: "Poca", Baja: "Baja", Moderada: "Moderada", Alta: "Alta", Bajando: "Bajando" },
    cascadasValores: { Excelente: "Excelente", "Muy buena": "Muy buena", Buena: "Buena", Variable: "Variable" },
    recomendaciones: {
      ideal: {
        titulo: "Temporada ideal — ¡Excelente elección!",
        texto: "Las cascadas están en su caudal óptimo con el agua turquesa característico de la Huasteca. Clima fresco (16–30°C) y agradable. Es temporada alta — reserva hospedaje y tours con anticipación.",
        tours: ["Expedición Tamul + Sótano de las Huahuas", "Ruta Surrealista (Las Pozas)", "Cascadas del Meco"],
      },
      buena: {
        titulo: "Buena temporada — Bien para visitar",
        texto: "El agua conserva su color intenso. Las temperaturas suben — actívate temprano por las mañanas. Ideal para tours con sombra natural como Las Pozas o los ríos. Menos concurrencia que temporada alta.",
        tours: ["Ruta Surrealista (Las Pozas)", "Paraíso Escalonado + Minas Viejas y Micos", "Ruta Acuática Puente de Dios"],
      },
      caluroso: {
        titulo: "Temporada calurosa — Prepárate bien",
        texto: "28–38°C en zonas bajas. Hidratación constante, actívate antes de las 10am. Las pozas se disfrutan mucho — el agua fresca es un alivio. Evita Tamtoc (sin sombra). Lleva sombrero y ropa UV.",
        tours: ["Paraíso Escalonado + Minas Viejas y Micos (pozas frescas)", "Ruta Acuática Puente de Dios"],
      },
      lluvia: {
        titulo: "Temporada de lluvias — Consulta condiciones",
        texto: "Vegetación explosivamente verde y muy fotogénica. Algunos tours de río pueden suspenderse por corrientes altas (especialmente Tamul en septiembre). Menos turistas y precios más bajos. Consulta antes de reservar.",
        tours: ["Ruta Surrealista (Las Pozas — siempre operamos)", "Paraíso Escalonado + Minas Viejas y Micos"],
      },
    },
  },
};

const EN: InfoPracticaContent = {
  // "Practical Info" es calco de "Info Práctica": nadie en EE. UU. busca eso.
  // Un americano busca "travel guide" y "how to get to". El inglés también usa
  // "traveling" con una L, no la grafía británica que traía este bloque.
  metaTitle: "Huasteca Potosina Travel Guide — How to Get There and When to Go",
  metaDescription:
    "Which airport to fly into, how long the drive really is, when the water runs bluest, what to pack and what things cost. Written by guides who live here.",
  ogTitle: "The Huasteca Potosina Travel Guide, Written by Local Guides",
  ogDescription: "Which airport, how long the drive is, when to come and what it costs. Updated for 2026.",
  twitterTitle: "Huasteca Potosina Travel Guide",
  twitterDescription: "Which airport, how long the drive is, when to come, budget and what to pack.",

  heroEyebrow: "Everything you need to know",
  heroH1a: "The Huasteca Potosina ",
  heroH1b: "Travel Guide",
  heroIntro:
    "Everything you need to get here, get around, find a bed and enjoy the Huasteca Potosina without any nasty surprises.",
  navLabels: [
    "Getting there", "When to go", "Where to stay", "Hotel Paraíso", "Where to eat",
    "Budget", "Itineraries", "What to pack", "Map", "Safety",
  ],

  tituloComoLlegar: "Getting there",
  tituloCuandoViajar: "When to go",
  tituloDondeQuedarse: "Where to stay",
  tituloHotelParaiso: "Our base: Hotel Paraíso Encantado",
  tituloMapa: "Map of the region",
  tituloPapan: "Where to eat: Restaurante Papán Huasteco",
  tituloPresupuesto: "Daily budget",
  tituloItinerarios: "Suggested itineraries",
  tituloQueLlevar: "What to pack",
  tituloSeguridad: "Safety and emergencies",

  llegarIntroFuerte: "Ciudad Valles (SLP)",
  llegarIntro:
    " is the gateway to the Huasteca Potosina. From here, every main destination is under 2 hours away.",
  llegarBloques: [
    {
      titulo: "By plane",
      items: [
        "Nearest airport: San Luis Potosí (SLP) — 3.5h by car",
        "Alternative: Tampico (TAM) — 2h by car, more connections",
        "From Mexico City: ~1h flight + a rental car is recommended",
        "Aeroméxico and VivaAerobus run direct routes",
      ],
    },
    {
      titulo: "By bus",
      items: [
        "ADO GL from Mexico City (Terminal Norte) → Ciudad Valles: ~8 hours",
        "Approx. price: $600–900 MXN per person (executive class)",
        "Frequent departures: 10pm, 11:30pm, 12am (arriving before dawn)",
        "Also from Monterrey: ~4.5h, from Tampico: ~2h",
      ],
    },
    {
      titulo: "By car",
      items: [
        "From Mexico City: 430km on the Mex-85 / MEX-70 motorway — ~5.5h",
        "From Monterrey: 340km on the MEX-85 — ~4h",
        "From the city of San Luis Potosí: 260km — ~3h",
        "The toll motorway is recommended: safe and fast",
        "Fuel available in Valles. Fill up before heading out on trips",
      ],
    },
    {
      titulo: "Local transport",
      items: [
        "Combis (minivans) connect Valles with Micos, Tamasopo and Tamuín",
        "Combi fare: $35–80 MXN depending on the route",
        "Shared taxis to popular destinations: $50–120 MXN per person",
        "A rental car is recommended for more flexibility",
        "Moto-taxis available in rural areas (~$30–50 MXN)",
      ],
    },
  ],
  llegarFotoAlt: "Group canoeing through the Tampaón Canyon — Huasteca Potosina",
  llegarFotoPie: "The Tampaón river is the way in to Tamul Waterfall — 30 min by canoe",
  consejoViajero: "Traveller's tip",
  llegarConsejo:
    "If you're in a group of 4 or more, renting a car in Valles usually works out cheaper than taxis and gives you complete freedom over your timings. Many destinations have no regular transport before 8am.",
  reservaTransporte: "Book your transport",
  afiliados: [
    { nombre: "ADO · Bus", sub: "Mexico City → Valles from $600" },
    { nombre: "Rentalcars · Car", sub: "Valles from ~$800/day" },
    { nombre: "Kayak · Flights", sub: "Mexico City → SLP from $1,200" },
  ],

  cuandoIntro: "The Huasteca welcomes visitors all year round, but each season has its own character.",
  fotoSecaAlt: "The Water Cave with turquoise water — dry season Nov–Mar",
  fotoSecaPie: "Nov–Mar · Turquoise water",
  fotoVerdeAlt: "Sótano de las Huahuas with lush green vegetation — rainy season",
  fotoVerdePie: "Jun–Oct · Deep green",
  temporadas: [
    {
      meses: "November — March",
      etiqueta: "The best season",
      puntos: [
        "Waterfalls at their best flow and turquoise color",
        "Cool weather (18–26°C), less humidity",
        "Sótano de Golondrinas: the swifts are at their most active",
        "Tamtoc: visitable without extreme heat",
        "High season: book accommodation well in advance",
      ],
    },
    {
      meses: "April — May",
      etiqueta: "Spring — Transition",
      puntos: [
        "Temperatures rise (28–38°C), especially in Tamuín",
        "Waterfalls still flowing well, with intense color",
        "Holy Week: very busy, prices go up",
        "Ideal for Tamul and Las Pozas (lush foliage)",
      ],
    },
    {
      meses: "June — October",
      etiqueta: "Rainy season",
      puntos: [
        "Frequent rain (especially July–September)",
        "Explosively green, photogenic vegetation",
        "Swollen rivers: some water activities are suspended",
        "Fewer tourists, lower prices",
        "Check conditions before heading to Tamul (dangerous currents)",
      ],
    },
  ],
  verToursTemporada: "See the tours available this season",
  tablaCabeceras: ["Month", "Temperature", "Rain", "Waterfalls"],
  tablaFilas: [
    { mes: "Jan–Feb", temp: "18–26°C", lluvia: "Little", cascadas: "Excellent" },
    { mes: "Mar–May", temp: "24–36°C", lluvia: "Moderate", cascadas: "Very good" },
    { mes: "Jun–Sep", temp: "26–34°C", lluvia: "High", cascadas: "Variable" },
    { mes: "Oct–Nov", temp: "22–30°C", lluvia: "Easing", cascadas: "Good" },
    { mes: "Dec", temp: "16–24°C", lluvia: "Little", cascadas: "Very good" },
  ],

  quedarseIntro:
    "Pick your base according to how you travel. Ciudad Valles has the best logistics; Xilitla and Tamasopo offer full immersion in nature.",
  vallesTitulo: "Ciudad Valles · The best logistical base",
  vallesTexto:
    "The perfect hub. Every destination within 2 hours, with the widest choice of accommodation, restaurants and services. Small airport and an ADO bus terminal.",
  vallesItems: [
    "Hotel Valles: traditional, pool, from $900 MXN/night",
    "Hotel Casa Real: boutique, central, from $1,100 MXN/night",
    "Hostal La Huasteca: solo travellers/backpackers, from $280 MXN/bed",
    "Airbnb: whole houses from $600 MXN/night",
  ],
  verEnAirbnb: "See on Airbnb",
  verEnBooking: "See on Booking.com",
  xilitlaTitulo: "Xilitla · The boutique experience",
  xilitlaTexto1: "The Pueblo Mágico closest to ",
  xilitlaLasPozas: "Edward James's Las Pozas",
  xilitlaTexto2:
    ". Boutique options in colonial houses looking out over the canyon. Perfect for 1–2 nights of cultural immersion.",
  recomendacionEquipo: "Our team's recommendation",
  hotelNombre: "Hotel Paraíso Encantado Xilitla",
  hotelTexto:
    "Our base of operations and the best option in Xilitla. 50 meters from the Surrealist Garden, with a pool and a restaurant serving Huastec cooking. We pick you up here — just as we do at any lodging in Xilitla or Ciudad Valles — at no extra cost.",
  hotelItems: [
    "Door-to-door pickup between 8:00 and 9:00 AM",
    "Pool overlooking the canyon · Its own restaurant · AC and WiFi",
    "Special rate for travellers who book tours with us",
    "From $1,200 MXN/night (double room)",
  ],
  consultarDisponibilidad: "Check availability →",
  otrasOpciones: "Other options",
  xilitlaOtras: [
    "Castillo El Buen Café: historic, panoramic views, from $1,500 MXN",
    "Posada El Castillo: on Edward James's property, from $2,200 MXN",
    "Posada Xilitla: family-run, budget, from $600 MXN",
  ],
  xilitlaMicroCta: "Book Hotel Paraíso Encantado at a special rate when you combine it with a tour",
  tamasopoTitulo: "Tamasopo · Immersed in nature",
  tamasopoTexto:
    "A small town 10 min from the Tamasopo Waterfalls and Puente de Dios. Rural options and eco-campsites. Ideal for nature lovers.",
  tamasopoItems: [
    "Cabañas Tamasopo: pool, nature, from $800 MXN/night",
    "Eco-camping beside the waterfalls: from $150 MXN/person",
    "Family guesthouses: basic, authentic, from $350 MXN/night",
  ],

  paraisoIntroA: "",
  paraisoIntroB:
    " is our home, steps from Edward James's Surrealist Garden. You don't have to stay here to take a tour — we pick you up wherever you're staying, in Xilitla or Ciudad Valles — but if you stay with us the logistics are simpler and you set off straight from the door.",
  paraisoFotoHeroAlt: "Hotel Paraíso Encantado Xilitla — façade and gardens",
  paraisoFotoHabAlt: "A room at Hotel Paraíso Encantado Xilitla",
  paraisoFotoTerrazaAlt: "Terrace overlooking the canyon at Hotel Paraíso Encantado",
  boutique4: "4-star boutique",
  porQueHospedarte: "Why stay here?",
  paraisoPorQue: [
    "Set off from the door: no transfer before the tour even starts",
    "50 meters from Edward James's Surrealist Garden",
    "Huastec breakfast included with the tours",
    "Pool overlooking the canyon and the jungle area",
    "Rooms with AC, WiFi and private bathroom",
    "24h reception to sort out the logistics",
  ],
  reservasTitulo: "Bookings",
  reservasTexto: "Mention that you're traveling with us when you book and you get a preferential rate.",
  verEnGoogleMaps: "See on Google Maps →",

  mapaIntroA: "The Huasteca Potosina is centered around ",
  mapaXilitla: "Xilitla",
  mapaIntroB: " and ",
  mapaIntroC: ". Every main destination is within 2 hours of the others. Key spots: ",
  mapaPuntos: ["Tamul Waterfall", "Las Pozas", "Sótano de las Golondrinas", "Puente de Dios"],
  mapaTitle: "Map of the Huasteca Potosina — main destinations",
  mapaDestinos: [
    { label: "Tamul Waterfall", dist: "1.5h from Valles" },
    { label: "Las Pozas (Xilitla)", dist: "1h from Valles" },
    { label: "Sótano de Golondrinas", dist: "1h from Valles" },
    { label: "Puente de Dios", dist: "45 min from Valles" },
  ],

  papanIntroA: "Right in the heart of Xilitla, ",
  papanNombre: "Restaurante Papán Huasteco",
  papanIntroB:
    " is our number one recommendation for authentic regional cooking. Traditional Huastec dishes cooked over a wood fire, with ingredients from the region.",
  papanNoPerderte: "What you shouldn't miss",
  papanPlatillos: [
    "Zacahuil — the giant Huastec tamal wrapped in banana leaf",
    "Bocoles filled with beans and fresh cheese",
    "Huastec enchiladas with pork",
    "Café de olla brewed with piloncillo and cinnamon",
    "Tamarind and hibiscus waters from the region",
  ],
  papanRazones: "Reasons to come",
  papanRazonesItems: [
    "Authentic recipes from local cooks, not tourist fusion",
    "Fresh ingredients from the Huastec market",
    "Wood-fired cooking — flavours you won't find in the city",
    "Fair prices: a full meal from $120 MXN",
    "Perfect before or after visiting Las Pozas",
  ],
  papanFotoHeroAlt: "Restaurante Papán Huasteco — authentic regional cooking in Xilitla",
  papanFotoPlatillosAlt: "Typical Huastec dishes — zacahuil and bocoles",
  papanFotoFogonAlt: "Wood-fired stove at Restaurante Papán Huasteco",

  presupuestoIntro:
    "Approximate cost per person per day (2026). The Huasteca is surprisingly affordable.",
  niveles: [
    {
      nivel: "Budget",
      rango: "$400–600 MXN",
      incluye: [
        "Lodging: hostel or camping ($150–200)",
        "Food: markets and local stalls ($100–150)",
        "1 destination per day: $60–220 MXN entry",
        "Transport: combis and shared taxis ($50–100)",
      ],
    },
    {
      nivel: "Mid-range",
      rango: "$800–1,500 MXN",
      incluye: [
        "3-star hotel or guesthouse ($400–600)",
        "Restaurants and cafés ($200–300)",
        "2 destinations per day, activities included",
        "Taxi or a shared car rental",
        "Souvenirs and odds and ends",
      ],
    },
    {
      nivel: "Premium",
      rango: "$1,500+ MXN",
      incluye: [
        "Boutique hotel or luxury guesthouse ($800+)",
        "Gourmet Huastec restaurant",
        "Private guided tour + premium activities",
        "Your own rental car",
        "Spa or exclusive experiences",
      ],
    },
  ],
  porDia: "/ day",
  pagosTitulo: "Payments and cash",
  pagosItems: [
    "ALWAYS carry cash. Many destinations take cash only",
    "ATMs in Ciudad Valles (BBVA, Banamex, HSBC) — stock up before heading out",
    "Las Pozas and hotels take cards; Tamul and Golondrinas: cash only",
    "Exchange rate: change money in Valles, not at the airport",
  ],

  itinerariosIntro:
    "The most common question is: how many days do I need, and in what order? Here are three model routes depending on how long you have. All our tours fit into any of them.",
  planes: [
    {
      etiqueta: "Intense",
      dias: "3 Days",
      sub: "The essentials — for a long weekend",
      pasos: [
        { dia: "Day 1", lugar: "Arrive in Ciudad Valles · Night in Valles or Xilitla" },
        { dia: "Day 2", lugar: "Tamul + Sótano de las Huahuas tour · Departure 8:00–9:00 am · Night in Xilitla" },
        { dia: "Day 3", lugar: "Las Pozas (Edward James) · Head back in the afternoon" },
      ],
      cta: "See the Tamul tour →",
    },
    {
      etiqueta: "Ideal",
      dias: "5 Days",
      sub: "What we recommend — unhurried and without missing anything",
      pasos: [
        { dia: "Day 1", lugar: "Arrival · Lunch at Papán Huasteco · Night in Xilitla" },
        { dia: "Day 2", lugar: "Tamul + Sótano de las Huahuas tour" },
        { dia: "Day 3", lugar: "Edward James's Las Pozas · The town of Xilitla" },
        { dia: "Day 4", lugar: "El Meco Waterfall tour, or Minas Viejas + Micos" },
        { dia: "Day 5", lugar: "Puente de Dios + Tamasopo · Head home" },
      ],
      cta: "Which tour first? →",
    },
    {
      etiqueta: "Complete",
      dias: "7 Days",
      sub: "The whole Huasteca — for anyone who wants to get lost here",
      pasos: [
        { dia: "Day 1", lugar: "Arrive in Valles · Explore the center · Night in Valles" },
        { dia: "Day 2", lugar: "Tamul + Sótano de las Huahuas tour · Night in Xilitla" },
        { dia: "Day 3", lugar: "Las Pozas · Xilitla Pueblo Mágico · Night in Xilitla" },
        { dia: "Day 4", lugar: "El Meco Waterfall tour · Night in Tamasopo or Valles" },
        { dia: "Day 5", lugar: "Minas Viejas + Micos tour · Media Luna Lagoon" },
        { dia: "Day 6", lugar: "Puente de Dios + Seven Waterfalls of Tamasopo tour" },
        { dia: "Day 7", lugar: "Tamtoc + local market + an easy trip home" },
      ],
      cta: "See all the tours →",
    },
  ],
  itinerariosPie: "Not sure where to start? ",
  itinerariosPieLink: "Try the AI recommender →",

  llevarFotoAlt: "Travellers in the waters of the Tampaón river — the basic kit for the Huasteca",
  llevarFotoPieA: "Water shoes and quick-dry clothing are essential at ",
  llevarFotoPieLink: "Tamul Waterfall",
  llevarCategorias: [
    {
      titulo: "Footwear",
      items: [
        "Water shoes are ESSENTIAL for rivers and pools",
        "Trainers with non-slip soles for the trails",
        "Sandals for the hotel/town",
        "Closed shoes for Tamtoc (uneven ground)",
      ],
    },
    {
      titulo: "Clothing",
      items: [
        "Dry-fit or quick-dry clothing (2–3 changes)",
        "Swimwear (bring 2 if you have consecutive days in the water)",
        "Long-sleeved top for sun and insects",
        "Light jacket for the Sótano de Golondrinas (6°C at the bottom)",
        "A hat or cap is a must for Tamtoc and hot days",
      ],
    },
    {
      titulo: "Health and protection",
      items: [
        "BIODEGRADABLE insect repellent (required at pools and waterfalls)",
        "BIODEGRADABLE sunscreen (the only kind allowed in the water)",
        "Water purification tablets or a filter",
        "Basic first-aid kit: plasters, anti-diarrhoeal, antihistamine",
        "Motion-sickness medication if you're taking the boat at Tamul",
      ],
    },
    {
      titulo: "Documents and money",
      items: [
        "Valid ID or passport",
        "Cash in Mexican pesos (see the Budget section)",
        "Travel insurance recommended for extreme activities",
        "Bookings downloaded on your phone (no internet at the waterfalls)",
        "Emergency numbers saved: see the Safety section",
      ],
    },
    {
      titulo: "Tech",
      items: [
        "Power bank: many sites have nowhere to charge",
        "Waterproof phone case (essential on boats and in pools)",
        "Action camera (GoPro) if you're doing water activities",
        "Download offline maps of the region before you set off",
        "Local SIM or eSIM: limited coverage outside Valles",
      ],
    },
    {
      titulo: "Bag and extras",
      items: [
        "Waterproof backpack or zip-lock bags for electronics",
        "Reusable water bottle (2L minimum for waterfall days)",
        "Energy snacks for the long days",
        "Head torch for the Sótano de Golondrinas",
        "Quick-dry microfibre towel",
      ],
    },
  ],

  emergenciasTitulo: "Emergency numbers",
  emergencias: [
    { label: "General emergencies", num: "911" },
    { label: "Red Cross, Valles", num: "(481) 382-0119" },
    { label: "IMSS Ciudad Valles", num: "(481) 381-1190" },
    { label: "Fire brigade, Valles", num: "(481) 382-0123" },
    { label: "Municipal police, Valles", num: "(481) 382-0066" },
    { label: "Civil Protection SLP", num: "(444) 812-6000" },
  ],
  seguridadBloques: [
    {
      titulo: "General safety tips",
      items: [
        "The region is generally safe for tourists. Travel responsibly.",
        "Travel in groups and avoid solo trips to remote waterfalls.",
        "ALWAYS follow the instructions of guides and local staff at adventure sites.",
        "Don't ignore signs warning of strong currents or high river levels.",
        "Leave valuables at the hotel; don't take them to the waterfalls.",
        "Share your plan for the day with someone you trust before setting off.",
      ],
    },
    {
      titulo: "Water safety",
      items: [
        "A life vest is MANDATORY at Tamul and on river activities.",
        "Never swim in areas with strong currents without a guide.",
        "Puente de Dios: always follow the installed safety rope.",
        "Check river levels in the rainy season before you go.",
        "Basic swimming ability is needed for Tamul and Puente de Dios.",
        "Tamasopo and Micos: ideal for non-swimmers, with calmer water.",
      ],
    },
    {
      titulo: "Health",
      items: [
        "Hospital Regional Ciudad Valles: 24h emergency care.",
        "Bring basic medication: supplies in rural areas are limited.",
        "Drink constantly: 2L a day minimum, more on hot days.",
        "Strict sun protection, especially at Tamtoc (no natural shade).",
        "Traveller's diarrhoea: drink only bottled or purified water.",
        "Vaccination: not required, but hepatitis A and typhoid are advisable.",
      ],
    },
  ],

  faqTitulo: "Frequently Asked Questions",
  faqIntro: "Everything you need to know before booking.",
  cancelacion: [
    { titulo: "48h or more ahead", sub: "Full refund" },
    { titulo: "Less than 24h ahead", sub: "No refund · Free rescheduling (once)" },
    { titulo: "No-show", sub: "No refund" },
  ],
  faq: [
    {
      titulo: "About the tours",
      items: [
        {
          q: "Do the tours run even if it rains?",
          a: "Yes, unless there's a weather warning. Rain in the Huasteca is part of the experience and the waterfalls look even more spectacular. If we have to cancel for extreme weather, we reschedule at no cost.",
        },
        {
          q: "What level of fitness do I need?",
          a: "It depends on the tour. Each tour page states the level (Easy / Moderate). The Easy tours are suitable for the whole family. The Moderate ones require being able to walk 3–5 km over uneven ground.",
        },
        {
          q: "Can children take part?",
          a: "Yes. Children under 6 pay 50 % of the adult price and those aged 6 to 10 pay 70 %. From 11 upwards it's the full rate. Some tours are adults only: each tour page says so.",
        },
        {
          q: "Can older people take part?",
          a: "Yes, on the Easy tours. If there are specific health conditions, do ask us and we'll point you to the right tour.",
        },
        {
          q: "Does the guide speak English?",
          a: "Our guides are NOM-09 certified and fully bilingual guides are available — just ask when you book and we'll assign one.",
        },
        {
          q: "How many people are on each tour?",
          a: "Our groups are small, a maximum of 12 people, to keep the experience personal. We also offer private tours for your own group.",
        },
      ],
    },
    {
      titulo: "Bookings and payments",
      items: [
        {
          q: "How do I book my place?",
          a: "On WhatsApp or by credit/debit card through Stripe (secure online payment). Your place is confirmed straight away.",
        },
        {
          q: "What's the cancellation policy?",
          a: "— Cancelling 48h or more in advance: full refund.\n— Cancelling less than 24h in advance: no refund, but you can reschedule once at no extra cost.\n— No-show: no refund.\n— If we cancel (extreme weather or operational reasons): full refund or free rescheduling, your choice.",
        },
        {
          q: "Do I have to pay in full when I book?",
          a: "No. You hold your place with 30 % of the total, paid securely online by card, and settle the rest on the day of the tour, in cash or by card. If you'd rather pay another way, message us on WhatsApp and we'll sort it out.",
        },
      ],
    },
    {
      titulo: "Logistics",
      items: [
        {
          q: "Where do the tours leave from?",
          a: "There's no single meeting point: we pick you up at your lodging — hotel, hostel, cabin or Airbnb — in Xilitla or Ciudad Valles, and bring you back at the end of the day. You don't need to stay with us. The exceptions are the RZR ride (we meet at our base in Xilitla) and the Media Luna dive (the meeting point is the lagoon, in Rioverde).",
        },
        {
          q: "What time do they leave?",
          a: "Tours leave between 8:00 and 9:00 AM; we confirm your exact time when you book. You're back around 6:00 to 7:00 PM.",
        },
        {
          q: "What should I bring?",
          a: "Comfortable clothes you don't mind getting wet, shoes with grip (not beach sandals), biodegradable sunscreen, water, official ID and a sense of adventure. We provide everything else.",
        },
      ],
    },
  ],

  guiaEyebrow: "✦ The Definitive Guide · downloadable PDF",
  guiaH2a: "Take the whole guide with you as a ",
  guiaH2b: "PDF",
  guiaTexto:
    "A map of the region, a packing checklist, a detailed budget and the 3 model itineraries — all in a PDF that works without internet, ready for the day you travel.",
  guiaItems: [
    "Downloadable map with every destination",
    "Packing checklist (so you don't forget anything)",
    "Detailed budget by type of traveller",
    "3, 5 and 7-day itineraries ready to print",
  ],
  guiaGarantia: "Secure payment · Instant download · 7-day guarantee",
  guiaCta: "Download the guide → $49",

  ctaH2a: "Ready to ",
  ctaH2b: "plan your trip?",
  ctaTexto:
    "Use our AI planner to build a personalised itinerary with all the practical information you need.",
  ctaDestinos: "See destinations",
  ctaRecomendar: "Which tour is right for me? →",

  clima: {
    herramienta: "✦ Interactive tool",
    pregunta: "When are you going?",
    instruccion: "Pick the month of your trip and we'll tell you what to expect and which tour fits best.",
    temperatura: "Temperature",
    lluvia: "Rain",
    cascadas: "Waterfalls",
    recomendados: (mes) => `Tours we recommend for ${mes}`,
    seleccionaMes: "Pick a month to see a recommendation for your trip",
    lluviaValores: { Poca: "Little", Baja: "Low", Moderada: "Moderate", Alta: "High", Bajando: "Easing" },
    cascadasValores: { Excelente: "Excellent", "Muy buena": "Very good", Buena: "Good", Variable: "Variable" },
    recomendaciones: {
      ideal: {
        titulo: "The best season — excellent choice!",
        texto: "The waterfalls are at their best flow, with the turquoise water the Huasteca is known for. Cool, pleasant weather (16–30°C). It's high season — book accommodation and tours well ahead.",
        tours: ["Tamul Expedition + Sótano de las Huahuas", "Surrealist Route (Las Pozas)", "El Meco Waterfalls"],
      },
      buena: {
        titulo: "Good season — a fine time to visit",
        texto: "The water keeps its intense color. Temperatures are rising — get going early in the mornings. Ideal for tours with natural shade, like Las Pozas or the rivers. Quieter than high season.",
        tours: ["Surrealist Route (Las Pozas)", "Stepped Paradise + Minas Viejas and Micos", "Water Route, Puente de Dios"],
      },
      caluroso: {
        titulo: "Hot season — come prepared",
        texto: "28–38°C in the lowlands. Drink constantly and get going before 10am. The pools are a real pleasure — the cool water is a relief. Avoid Tamtoc (no shade). Bring a hat and UV clothing.",
        tours: ["Stepped Paradise + Minas Viejas and Micos (cool pools)", "Water Route, Puente de Dios"],
      },
      lluvia: {
        titulo: "Rainy season — check conditions",
        texto: "Explosively green and very photogenic vegetation. Some river tours may be suspended because of high currents (especially Tamul in September). Fewer tourists and lower prices. Check with us before booking.",
        tours: ["Surrealist Route (Las Pozas — we always run it)", "Stepped Paradise + Minas Viejas and Micos"],
      },
    },
  },
};

export function getInfoPractica(locale: Locale): InfoPracticaContent {
  return locale === "en" ? EN : ES;
}
