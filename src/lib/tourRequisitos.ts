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

  "tour-eden-jardin": {
    // Reemplaza la base: aquí no hay desayuno que excluir ni traslado largo
    // —el precio ya trae el de Xilitla— y sí hay prohibiciones del recinto que
    // no aparecen en ningún otro recorrido. Todo sale del reglamento que la
    // Fundación Las Pozas entrega por escrito, no se inventa nada.
    noIncluye: [
      "Cómo llegar a Xilitla (autobús o vuelo); el traslado dentro de Xilitla sí va incluido",
      "Alimentos y bebidas: la experiencia empieza muy temprano y no lleva desayuno",
      "Propinas (opcionales, siempre agradecidas)",
      "Souvenirs y gastos personales",
      "Peticiones especiales fuera del recorrido, que el jardín cotiza aparte",
    ],
    reemplazaBase: true,
    queLlevar: [
      "Calzado cerrado y con buen agarre: es obligatorio y el sendero amanece húmedo",
      "Ropa adecuada para caminar en selva; el reglamento del jardín exige vestimenta apropiada",
      "Una capa ligera: a las 7 de la mañana la sierra está fresca",
      "Repelente y bloqueador",
      "Cámara o teléfono (drones y tripiés no están permitidos)",
      "Efectivo para gastos personales: en el jardín no hay cajero",
    ],
    requisitos: [
      "Máximo 7 personas por experiencia; no se permite el acceso a más",
      "Hay que ir acompañado del guía en todo momento",
      "En las estructuras clasificadas de riesgo no pueden subir 7 a la vez; en algunas se sube de una en una",
      "No se permiten actividades acuáticas",
      "No se permite el acceso con mascotas, drones ni tripiés",
      "El jardín es Monumento Artístico y Patrimonio Nacional (INBAL): la administración puede negar el ingreso de objetos que considere un riesgo para el patrimonio",
    ],
    edadNota: "No hay edad mínima, pero se camina por escaleras y pisos irregulares durante tres horas y muy temprano. Cuéntanos las edades al reservar y te decimos si conviene.",
  },

  // ── Los tres recorridos nuevos (28 sep 2026) ────────────────────────────
  // Ninguno es de agua abierta, así que la base de "qué llevar" —que es la de
  // ríos y pozas: aqua shoes, traje de baño, bloqueador biodegradable— no
  // aplica. Los tres traen la suya.

  "tour-gruta-xilo": {
    reemplazaBase: false,
    noIncluye: [
      "Ropa de cambio y calzado que se pueda mojar",
      "Cómo llegar a Xilitla (el traslado dentro de Xilitla sí va incluido)",
    ],
    queLlevar: [
      "Calzado cerrado con agarre que se pueda mojar: dentro de la gruta se camina sobre roca húmeda",
      "Una muda completa de ropa seca para el regreso",
      "Ropa que no te importe ensuciar",
      "Chamarra ligera: es de noche y dentro de la cueva refresca",
      "Efectivo para gastos personales",
      "INE o pasaporte vigente",
    ],
    requisitos: [
      "Es un recorrido NOCTURNO: la caminata de acceso son 15 a 20 minutos por la selva, ya oscureciendo",
      "Dentro se recorren unos 900 metros; hay tramos donde se camina de pie y tramos donde hay que agacharse",
      "Casco y lámpara frontal van incluidos y son de uso obligatorio",
      "Si sufres de claustrofobia, este no es tu recorrido",
      "Te recogemos en tu hospedaje en Xilitla; desde Ciudad Valles vamos por ti con un costo extra de traslado, o llegas por tu cuenta",
    ],
    edadNota: "Cuéntanos las edades al reservar. Es una cueva de noche, con piso irregular y agua: para los más chicos conviene que lo valoremos juntos antes de apartar.",
  },

  "tour-amanecer-nubes": {
    reemplazaBase: false,
    noIncluye: [
      "Desayuno: se sale de madrugada, conviene que lleves algo para la cima",
      "Chamarra y calzado de montaña",
    ],
    queLlevar: [
      "Calzado de montaña con buen agarre: se sube de noche y por sendero",
      "Chamarra que corte el viento — arriba hace frío de verdad aunque en Xilitla haga calor",
      "Lámpara frontal (llevamos de repuesto, pero la tuya se agradece)",
      "Agua y algo de comer para desayunar en la cima",
      "Efectivo para gastos personales",
      "INE o pasaporte vigente",
    ],
    requisitos: [
      "Se sale DE MADRUGADA para llegar a la cima antes del amanecer",
      "Son varias horas de caminata en subida constante, buena parte de ellas a oscuras",
      "No hace falta experiencia de montaña, pero sí condición para caminar en pendiente",
      "El mar de nubes depende del clima: es frecuente, pero nadie lo puede garantizar",
      "Te recogemos en tu hospedaje en Xilitla; desde Ciudad Valles vamos por ti con un costo extra de traslado",
    ],
    edadNota: "Sin edad mínima marcada, pero es una caminata larga en pendiente y de madrugada. Cuéntanos las edades al reservar y te decimos si conviene.",
  },

  "tour-olla-de-la-luz": {
    reemplazaBase: false,
    noIncluye: [
      "Alimentos: conviene llevar agua y algo de comer para la caminata",
      "Calzado de senderismo y chamarra o impermeable",
    ],
    queLlevar: [
      "Calzado de senderismo: son unas 2 horas de camino entre bosque, llanos y miradores",
      "Chamarra o impermeable — el bosque de niebla es fresco y húmedo todo el año",
      "Agua y algo de comer",
      "Cámara: los miradores del camino son la mitad del recorrido",
      "Efectivo para gastos personales",
      "INE o pasaporte vigente",
    ],
    requisitos: [
      "Solo se entra con guía de la comunidad de La Trinidad: no se puede llegar por cuenta propia",
      "El recorrido se mueve entre los 1,950 y los 2,300 metros sobre el nivel del mar",
      "Es un abismo de 193 metros: no te acerques al borde sin tu guía",
      "Te recogemos en tu hospedaje en Xilitla; desde Ciudad Valles vamos por ti con un costo extra de traslado",
    ],
    edadNota: "Sin edad mínima marcada, pero son unas 2 horas de caminata en altura y el sótano tiene bordes expuestos. Cuéntanos las edades al reservar.",
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
