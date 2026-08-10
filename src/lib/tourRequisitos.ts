/**
 * Lo que la ficha de tour NO decía: qué NO incluye, qué llevar, y los
 * requisitos físicos y de edad.
 *
 * Hasta agosto de 2026 la ficha solo listaba `incluye`. El "No incluye" vivía
 * suelto en /precios y en /paquetes, el "Qué llevar" en /info-practica, y la
 * edad mínima no existía en ninguna parte — ni siquiera en el rafting Clase III
 * ni en el rappel de 105 m, que es donde más importa.
 *
 * REGLA: aquí no se inventa nada. Cada línea sale de texto ya publicado en el
 * sitio (descripciones de `tours.ts`, respuestas de `tourFaqs.ts`, la sección
 * "No incluye" de /precios o el "Qué llevar" de /info-practica). Cuando un dato
 * no existe —caso de la edad mínima en varios tours— se deja `undefined` y la
 * ficha invita a preguntar, en lugar de publicar un número inventado.
 */

export interface TourRequisitos {
  /** Se suma a NO_INCLUYE_BASE, salvo que `reemplazaBase` sea true. */
  noIncluye?: string[];
  reemplazaBase?: boolean;
  queLlevar?: string[];
  /** Condiciones físicas, de salud o de manejo relevantes para decidir. */
  requisitos?: string[];
  /** Solo si está publicada en algún lado. `undefined` = no hay dato. */
  edadMinima?: number;
  /** Matiz de edad cuando no hay un mínimo duro (recomendaciones). */
  edadNota?: string;
}

/** Aplica a todos los tours de un día. Copiado de la sección "No incluye" de /precios. */
export const NO_INCLUYE_BASE = [
  "Cómo llegar a la Huasteca (autobús o vuelo hasta Ciudad Valles o Xilitla)",
  "Comidas y cenas fuera del desayuno",
  "Propinas (opcionales, siempre agradecidas)",
  "Souvenirs y gastos personales",
];

/** Equipaje mínimo para cualquier recorrido de agua. Resumido de /info-practica. */
export const QUE_LLEVAR_BASE = [
  "Aqua shoes o tenis que se puedan mojar (indispensables en ríos y pozas)",
  "Traje de baño y una muda completa de ropa seca",
  "Ropa de secado rápido y gorra o sombrero",
  "Bloqueador y repelente BIODEGRADABLES (son los únicos permitidos en el agua)",
  "Efectivo para gastos personales: en los parajes no hay cajero",
  "INE o pasaporte vigente",
];

export const TOUR_REQUISITOS: Record<string, TourRequisitos> = {
  "tour-rzr-xilitla": {
    // descripcionLarga: "No incluye transporte hasta Xilitla ni alimentos."
    noIncluye: [
      "Transporte hasta Xilitla (el punto de encuentro es nuestra base)",
      "Alimentos: este recorrido no lleva desayuno incluido",
    ],
    reemplazaBase: true,
    // tourFaqs "¿Qué debo llevar?"
    queLlevar: [
      "Ropa que se pueda ensuciar y mojar",
      "Calzado cerrado",
      "Bloqueador",
      "Una muda de cambio — vas a salir con barro, es parte de la diversión",
    ],
    requisitos: [
      "El conductor debe ser mayor de edad. Si prefieres no manejar, puedes ir de copiloto",
      "No se necesita experiencia: hay briefing de manejo y un guía instructor abre la ruta",
      "Los niños van según el vehículo (el RZR 500 lleva 2 adultos y 1 niño; el Defender Familiar, 6 adultos y 2 niños). Avísanos las edades al reservar",
    ],
  },

  "tour-rappel-tamul": {
    // Su `incluye` y su descripción dicen que el traslado desde Ciudad Valles
    // SÍ va incluido; lo que no va son los alimentos.
    noIncluye: [
      "Alimentos: este recorrido no lleva desayuno ni comida incluidos",
      "Traslado hasta Ciudad Valles, que es de donde sale la unidad",
      "Propinas y gastos personales",
    ],
    reemplazaBase: true,
    queLlevar: [
      "Ropa deportiva cómoda que se pueda mojar",
      "Calzado cerrado con suela firme",
      "Bloqueador",
      "Nosotros ponemos arnés, casco, guantes y cuerdas",
    ],
    requisitos: [
      "No se necesita experiencia previa: el primer descenso es 100 % guiado por guías de alta montaña",
      "Las fotos y el video con dron van incluidos, sin costo extra",
    ],
    edadNota: "Escríbenos antes de reservar si viajas con menores: confirmamos contigo si el descenso es apto según la edad y la complexión.",
  },

  "tour-rafting-tampaon": {
    // OJO: este tour SÍ lleva comida incluida (la eliges antes o después de la
    // actividad), así que no puede heredar el "no incluye comidas" de la base.
    noIncluye: [
      "Cómo llegar a la Huasteca (autobús o vuelo hasta Ciudad Valles o Xilitla)",
      "Desayuno: lo que va incluido es una comida, que eliges antes o después del descenso",
      "Cenas y consumos adicionales",
      "Propinas y gastos personales",
    ],
    reemplazaBase: true,
    queLlevar: [
      "Traje de baño o ropa que se pueda mojar",
      "Calzado acuático o tenis que se puedan mojar, con calcetines para evitar ampollas",
      "Bloqueador biodegradable",
      "Muda completa de ropa seca para el regreso",
    ],
    requisitos: [
      "No necesitas saber nadar: vas con chaleco y casco todo el descenso y el guía certificado va dentro de la balsa",
      "No necesitas experiencia: antes de tocar el agua recibes briefing de seguridad y técnica de remado",
      "La GoPro solo se permite con soporte de pecho o casco: las dos manos deben quedar libres",
      "La salida se confirma según el nivel del río; en temporada de lluvias (julio–septiembre) puede reprogramarse",
    ],
    edadNota: "Escríbenos antes de reservar si viajas con menores: en rápidos Clase III confirmamos contigo si la salida es apta según la edad.",
  },

  "tour-tamul": {
    requisitos: [
      "No necesitas saber nadar: se usa chaleco salvavidas durante toda la travesía",
      "La salida es entre las 8:00 y las 9:00 AM; confirmamos tu hora exacta de recogida al reservar",
      "Si te mareas en lancha, toma tu medicamento antes: el trayecto en canoa es largo",
    ],
  },

  "tour-edward-james": {
    requisitos: [
      "El terreno de Las Pozas es irregular, con escaleras y superficies húmedas",
      "Se pasa alrededor de 2 h en Las Pozas y 1 h en Huichihuayán",
    ],
    edadNota: "Sin restricción de edad. Para menores de 5 años recomendamos cuidado extra por lo irregular del terreno.",
  },

  "tour-meco": {
    requisitos: [
      "Dificultad baja, apto para adultos mayores: el acceso a los miradores es caminata corta y plana",
      "Todas las pozas del recorrido son aptas para nadar, con chaleco incluido",
    ],
  },

  "tour-minas-micos": {
    requisitos: [
      "Es uno de los recorridos más aptos para familias; hay chalecos para todos",
      "El agua está entre 18 y 22 °C: refrescante, no helada",
    ],
  },

  "tour-puente-dios": {
    requisitos: [
      "El chaleco salvavidas es obligatorio dentro del Puente de Dios",
      "El descenso al Puente de Dios es por escalones: cuenta con eso si te cuesta bajar escaleras",
      "El agua está entre 18 y 22 °C",
      "La Hacienda Los Gómez está incluida, sin costo adicional",
    ],
    edadNota: "Recomendamos a partir de 5 años por los escalones de bajada.",
  },

  "tour-buceo-media-luna": {
    // faqEntries de la ficha: "Es una actividad para mayores de 10 años" y
    // "la entrada al parque se paga aparte en sitio".
    noIncluye: [
      "Transporte a la Laguna de la Media Luna, en Rioverde (llegas por tu cuenta)",
      "Entrada al parque, que se paga aparte en sitio",
      "Comidas y gastos personales",
    ],
    reemplazaBase: true,
    // La descripcionLarga de este tour sí publica condiciones de salud reales.
    queLlevar: [
      "Traje de baño",
      "Toalla",
      "Efectivo para la entrada al parque",
    ],
    requisitos: [
      "Actividad para mayores de 10 años con buena salud: no aplica descuento de niños",
      "NO es apta para personas con problemas respiratorios, cardiovasculares o afecciones de oído",
      "NO es apta para mujeres embarazadas",
      "No se puede bucear bajo efectos de alcohol o drogas",
      "No se necesita certificación previa: son 4 horas de capacitación y la inmersión va siempre acompañada por un instructor PADI",
    ],
    edadMinima: 10,
  },

  "tour-travesia-cafe": {
    // Su `incluye` no lleva desayuno y la recogida es solo en Xilitla, no en
    // Ciudad Valles como el resto de los tours.
    noIncluye: [
      "Cómo llegar a Xilitla (la recogida es en tu hospedaje dentro de Xilitla)",
      "Alimentos: este recorrido no lleva desayuno ni comida incluidos",
      "El café que te lleves de la finca",
      "Propinas y gastos personales",
    ],
    reemplazaBase: true,
    queLlevar: [
      "Ropa cómoda y calzado cerrado: el camino a la finca es de terracería",
      "Una capa ligera — en la sierra refresca",
      "Bloqueador y gorra",
      "Efectivo si quieres llevarte café de la finca",
    ],
    requisitos: [
      "Recorrido tranquilo, sin exigencia física: apto para toda la familia",
      "Sale con un mínimo de 2 personas",
    ],
  },
};

/** Lo que NO incluye un tour, ya resuelto contra la base. */
export function noIncluyeDe(tourId: string): string[] {
  const r = TOUR_REQUISITOS[tourId];
  if (!r?.noIncluye) return NO_INCLUYE_BASE;
  return r.reemplazaBase ? r.noIncluye : [...NO_INCLUYE_BASE, ...r.noIncluye];
}

/** Qué llevar: la lista propia del tour si existe, si no la base de agua. */
export function queLlevarDe(tourId: string): string[] {
  return TOUR_REQUISITOS[tourId]?.queLlevar ?? QUE_LLEVAR_BASE;
}
