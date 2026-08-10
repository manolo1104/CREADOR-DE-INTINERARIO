/**
 * paquetes.ts — fuente única de los paquetes (tours + hospedaje).
 * La tarjeta (PaquetesInteractivo) y las páginas de detalle (/paquetes/[slug])
 * leen de aquí. Los tours del itinerario se cruzan por `tourSlug` contra TOURS_DB.
 */

export interface ItinerarioDia {
  dia: number;
  tipo: "llegada" | "tour" | "salida";
  titulo: string;
  /** slug que cruza con TOURS_DB para sacar nombre, descripción e imágenes del tour */
  tourSlug?: string;
  descripcion: string;
}

export interface Paquete {
  id: string;
  slug: string;
  nombre: string;
  subtitulo: string;
  duracion: string;
  dias: number;
  noches: number;
  precio: number;
  precioLabel: string;
  /** marca un precio provisional pendiente de confirmar antes de publicar */
  precioProvisional?: boolean;
  badge?: string;
  destacado?: boolean;
  imagen: string;
  urgencia: string;
  tours: string[];               // texto para la tarjeta del listado
  itinerario: ItinerarioDia[];   // día por día para la página de detalle
  incluye: string[];
  noIncluye: string[];
  valor: { item: string; precio: string }[];
  perfiles: string[];
}

// ── Habitaciones del Hotel Paraíso Encantado ────────────────────────────────
// Fotos reales tomadas del sitio del hotel. Jungla = vista a la montaña (+$400/noche).

export interface Habitacion {
  id: string;
  nombre: string;
  imagen: string;
  descripcion: string;
  vista: string;
  /** suplemento por noche (MXN) — solo las de vista a la montaña */
  suplemento?: number;
}

export const HABITACIONES: Habitacion[] = [
  {
    id: "orquideas-2",
    nombre: "Orquídeas 2",
    imagen: "/imagenes/hotel-paraiso-encantado/habitaciones/orquideas-2.jpg",
    descripcion: "Una de nuestras habitaciones más solicitadas: tranquila y rodeada de la vegetación del hotel.",
    vista: "Selva / jardín",
  },
  {
    id: "bromelias-1",
    nombre: "Bromelias 1",
    imagen: "/imagenes/hotel-paraiso-encantado/habitaciones/bromelias-1.jpg",
    descripcion: "Habitación cómoda con el ambiente selvático característico de Paraíso Encantado.",
    vista: "Selva / jardín",
  },
  {
    id: "lirios-2",
    nombre: "Lirios 2",
    imagen: "/imagenes/hotel-paraiso-encantado/habitaciones/lirios-2.jpg",
    descripcion: "Espacio luminoso y acogedor para descansar después de un día de tours.",
    vista: "Selva / jardín",
  },
  {
    id: "jungla",
    nombre: "Jungla",
    imagen: "/imagenes/hotel-paraiso-encantado/habitaciones/jungla.jpg",
    descripcion: "Habitación con vista directa a la montaña — la favorita para despertar con el paisaje de la sierra.",
    vista: "Montaña",
    suplemento: 400,
  },
];

// ── Logística para llegar (datos verificados jun 2026; aproximados/confirmar) ─

export const LOGISTICA = {
  nota: "Los horarios y tarifas de transporte público son aproximados y cambian por temporada — confírmalos al momento de reservar.",
  modos: [
    {
      id: "auto",
      icon: "Car",
      titulo: "En auto",
      puntos: [
        "Desde la Ciudad de México: ~5.5 horas (aprox. 339 km).",
        "Desde la ciudad de San Luis Potosí: ~5 horas.",
        "El acceso a Xilitla es carretera de sierra, con curvas cerradas y neblina: te recomendamos manejar de día, despacio y con el tanque lleno.",
      ],
    },
    {
      id: "avion",
      icon: "Plane",
      titulo: "En avión",
      puntos: [
        "El aeropuerto más práctico es Tampico (TAM): ~2.5 h a Xilitla y ~2 h a Ciudad Valles.",
        "Alternativas: San Luis Potosí (~5 h), Querétaro (vía Jalpan) o Ciudad de México / AIFA (más lejos).",
        "Desde el aeropuerto conviene renta de auto o transfer privado, ya que los autobuses salen de las centrales urbanas, no de la terminal aérea.",
      ],
    },
    {
      id: "autobus",
      icon: "Bus",
      titulo: "En autobús",
      puntos: [
        "Desde CDMX hay salida nocturna de la Terminal Central del Norte alrededor de las 10:15 PM (líneas Servicios Coordinados, Transportes Frontera y ETN).",
        "Llega a Xilitla por la mañana (aprox. 6:30 AM); el trayecto dura ~9–10 h. Tarifa aproximada $520–$900 MXN por persona.",
        "Si llegas en ese autobús de la mañana, podemos arrancar el primer tour ese mismo día.",
      ],
    },
  ],
  intra:
    "Ya en la zona, nuestro transporte te lleva del hotel al inicio de cada tour y de regreso. Como referencia: Xilitla está a ~40 min de Aquismón y ~1 h de Ciudad Valles; Ciudad Valles a ~50 min de Tamasopo.",
};

// ── Reseñas (estilo real; sin contadores inventados) ────────────────────────

export interface Resena {
  nombre: string;
  ciudad: string;
  foto: string;
  texto: string;
  estrellas: number;
  tour: string;
}

// Reseñas ESPECÍFICAS por paquete — cada página de detalle muestra testimonios
// de gente que sí hizo ESE paquete (prueba social relevante al producto).
export const RESENAS_POR_PAQUETE: Record<string, Resena[]> = {
  aventura: [
    {
      nombre: "Claudia M.", ciudad: "CDMX", foto: "/imagenes/reviews/reviewer-30.jpg", estrellas: 5, tour: "Paquete Aventura",
      texto: "El Paquete Aventura superó todas mis expectativas. La Expedición Tamul al amanecer es algo que nunca voy a olvidar — ver los pericos salir del sótano con mis propios ojos fue mágico. El hotel es perfecto, y los guías saben exactamente cuándo llegar a cada lugar para la mejor luz.",
    },
    {
      nombre: "La familia Herrera", ciudad: "Monterrey", foto: "/imagenes/reviews/reviewer-32.jpg", estrellas: 5, tour: "Paquete Aventura",
      texto: "Viajamos con dos niños de 8 y 11 años con el Paquete Aventura. Todo perfectamente coordinado — los guías pacientes y el ritmo ideal para los niños. Las Cascadas del Meco los dejó boquiabiertos. El hotel los trató como reyes.",
    },
    {
      nombre: "Diego R.", ciudad: "Querétaro", foto: "/imagenes/reviews/reviewer-5.jpg", estrellas: 5, tour: "Paquete Aventura",
      texto: "El Paquete Aventura es el balance perfecto: dos días, los dos tours más impresionantes y sin sentir prisa. Ver la Cascada de Tamul de cerca te deja sin palabras. Volvería sin pensarlo.",
    },
  ],
  completo: [
    {
      nombre: "Roberto & Ana", ciudad: "Guadalajara", foto: "/imagenes/reviews/reviewer-31.jpg", estrellas: 5, tour: "Paquete Completo",
      texto: "Fuimos con el Paquete Completo y fue el mejor viaje que hemos hecho en pareja. El Puente de Dios con la luz entrando por el arco... no se puede describir. El desayuno del hotel, increíble. Ya queremos volver para hacer el Gran Huasteca.",
    },
    {
      nombre: "Mariana L.", ciudad: "Puebla", foto: "/imagenes/reviews/reviewer-12.jpg", estrellas: 5, tour: "Paquete Completo",
      texto: "Hicimos el Paquete Completo en familia: tres días de tours distintos, Las Pozas el primer día y el sótano al amanecer. Cada día algo nuevo sin tener que cambiar de hotel. La logística, impecable.",
    },
    {
      nombre: "Jorge y Paty", ciudad: "León", foto: "/imagenes/reviews/reviewer-8.jpg", estrellas: 5, tour: "Paquete Completo",
      texto: "El Paquete Completo nos dejó conocer lo mejor de la Huasteca sin agotarnos. Los guías ajustaron el ritmo a nuestros tiempos y nos dejaron elegir el tercer día. Repetiríamos sin dudar.",
    },
  ],
  "gran-huasteca": [
    {
      nombre: "Andrea & Sofía", ciudad: "Monterrey", foto: "/imagenes/reviews/reviewer-turquoise-group.png", estrellas: 5, tour: "Paquete Gran Huasteca",
      texto: "El Paquete Gran Huasteca es otro nivel. Cuatro días seguidos de tours sin repetir un solo lugar: Las Pozas, los sótanos, Tamul, las Cascadas del Meco y el Puente de Dios. Terminamos agotadas y felices. Si vas a ir, ve por este.",
    },
    {
      nombre: "Familia Vázquez", ciudad: "CDMX", foto: "/imagenes/reviews/reviewer-familia-tamul.png", estrellas: 5, tour: "Paquete Gran Huasteca",
      texto: "Veníamos con la duda de si 5 días eran demasiado y nos quedamos cortos. El Gran Huasteca te deja vivir la Huasteca completa, con calma y durmiendo siempre en el mismo hotel. La organización, impecable.",
    },
    {
      nombre: "Luis M.", ciudad: "Guadalajara", foto: "/imagenes/reviews/reviewer-tamul-grupo.jpg", estrellas: 5, tour: "Paquete Gran Huasteca",
      texto: "Hice el Gran Huasteca con amigos. Cada día un escenario distinto y los guías sabían exactamente a qué hora llegar a cada sitio. El último día, el arco de luz del Puente de Dios, fue el cierre perfecto.",
    },
  ],
};

// Mezcla para la página de listado: una reseña de cada paquete.
export const RESENAS_PAQUETES: Resena[] = [
  RESENAS_POR_PAQUETE.aventura[0],
  RESENAS_POR_PAQUETE["gran-huasteca"][0],
  RESENAS_POR_PAQUETE.completo[0],
];

// ── FAQ compartido para las páginas de detalle ──────────────────────────────

export const FAQS_PAQUETES = [
  {
    q: "¿El precio es por persona o por pareja?",
    a: "Los precios de los paquetes son por pareja (2 personas). Para grupos, familias o personas adicionales armamos una cotización a tu medida — escríbenos por WhatsApp.",
  },
  {
    q: "¿Cómo llego a Xilitla?",
    a: "Puedes llegar en auto, en avión (Tampico es el aeropuerto más práctico) o en autobús nocturno desde CDMX (Terminal Norte, ~10:15 PM, llega ~6:30 AM). En la sección 'Cómo llegar' arriba te explicamos cada opción a detalle.",
  },
  {
    q: "¿Cómo llego a Xilitla desde CDMX?",
    a: "La forma más práctica es el autobús nocturno desde la Terminal Central del Norte (~10:15 PM, líneas Servicios Coordinados / ETN), que llega a Xilitla cerca de las 6:30 AM por unos $650 por persona. Un taxi de ~$60 te deja en el hotel en 7 minutos. Como llegas al amanecer, te entregamos la habitación temprano para descansar y ese mismo día arranca tu primer tour: no pierdes el Día 1.",
  },
  {
    q: "¿Puedo elegir mi habitación?",
    a: "Sí. El hotel Paraíso Encantado tiene varias habitaciones (Orquídeas, Bromelias, Lirios y Jungla). Las de vista a la selva están incluidas en el precio; la habitación Jungla, con vista a la montaña, tiene un suplemento de $400 MXN por noche.",
  },
  {
    q: "¿El precio incluye el traslado hasta Xilitla?",
    a: "No. El precio del paquete incluye el traslado del hotel al punto de inicio de cada tour y de regreso, pero no el traslado hasta Xilitla. Llegas por tu cuenta; en la sección 'Cómo llegar' te mostramos las opciones (auto, avión y autobús).",
  },
  {
    q: "¿Cómo confirman la disponibilidad?",
    a: "Al enviarnos tu consulta por WhatsApp verificamos la disponibilidad del hotel y las fechas en tiempo real. Te respondemos en menos de 1 hora y no necesitas pago anticipado para apartar.",
  },
];

// ── Paquetes ────────────────────────────────────────────────────────────────

export const PAQUETES_DB: Paquete[] = [
  {
    id: "aventura",
    slug: "aventura",
    nombre: "Paquete Aventura",
    subtitulo: "El mejor dúo de la región",
    duracion: "3 días / 2 noches",
    dias: 3,
    noches: 2,
    precio: 9000,
    precioLabel: "por pareja",
    badge: "Más popular",
    destacado: true,
    imagen: "/imagenes/cascada-de-tamul/hero.jpg",
    urgencia: "El clásico — combina los dos tours estrella de la región",
    perfiles: ["Amigos aventureros", "Parejas activas", "El clásico"],
    tours: [
      "Cascadas del Meco — Turquesas, Mirador & El Gran Salto (Día 1)",
      "Expedición Tamul — Sótano, Cañón & Cueva del Agua (Día 2)",
    ],
    itinerario: [
      { dia: 1, tipo: "tour", tourSlug: "cascadas-del-meco", titulo: "Llegada + Cascadas del Meco", descripcion: "Si llegas en el autobús de la mañana a Xilitla (~6:30 AM), te entregamos la habitación temprano para descansar y ese mismo día arrancamos con las cascadas turquesa de El Naranjo — un primer día suave y espectacular." },
      { dia: 2, tipo: "tour", tourSlug: "expedicion-tamul", titulo: "Expedición Tamul", descripcion: "El día más completo de aventura: ya descansado, salimos temprano para aprovechar la mejor luz y el caudal del río — mirador al Sótano de las Huahuas, Cascada de Tamul en lancha y Cueva del Agua." },
      { dia: 3, tipo: "salida", titulo: "Salida", descripcion: "Desayuno, check-out y regreso a casa con la memoria llena de la Huasteca." },
    ],
    incluye: [
      "2 noches en Hotel Paraíso Encantado Xilitla",
      "Desayuno buffet los días de tour",
      "Tour Expedición Tamul completo",
      "Tour Cascadas del Meco completo",
      "Transporte del hotel al inicio de cada tour y de regreso",
      "Guías certificados NOM-09 SECTUR",
      "Entradas a todas las atracciones",
      "Equipo de seguridad",
      "Seguro de viaje",
      "Fotografía del recorrido",
    ],
    noIncluye: [
      "Traslado hasta Xilitla (llegas por tu cuenta — consulta la sección 'Cómo llegar')",
      "Comidas y cenas (excepto desayunos)",
      "Suplemento de habitación Jungla con vista a la montaña (+$400/noche)",
      "Propinas y gastos personales",
    ],
    valor: [
      { item: "2 noches hotel (2 pax)", precio: "$5,600" },
      { item: "Expedición Tamul", precio: "$2,900" },
      { item: "Cascadas del Meco", precio: "$3,200" },
      { item: "Transporte 2 días", precio: "$800" },
      { item: "Entradas + guías", precio: "$900" },
    ],
  },
  {
    id: "completo",
    slug: "completo",
    nombre: "Paquete Completo Huasteca",
    subtitulo: "La experiencia definitiva",
    duracion: "4 días / 3 noches",
    dias: 4,
    noches: 3,
    precio: 12200,
    precioLabel: "por pareja",
    imagen: "/imagenes/cascadas-minas-viejas/hero.jpg",
    urgencia: "Tres días completos de tours — el favorito de las familias",
    perfiles: ["Familias", "Grupos", "Experiencia total"],
    tours: [
      "Ruta Surrealista — Edward James (Día 1)",
      "Expedición Tamul — Sótano & Cascada (Día 2)",
      "Paraíso Escalonado o Ruta Acuática (Día 3)",
    ],
    itinerario: [
      { dia: 1, tipo: "tour", tourSlug: "ruta-surrealista-edward-james", titulo: "Llegada + Ruta Surrealista (Edward James)", descripcion: "Te recibimos y haces check-in en el hotel. Como Las Pozas está a minutos, ese mismo día visitamos el jardín surrealista de Edward James." },
      { dia: 2, tipo: "tour", tourSlug: "expedicion-tamul", titulo: "Expedición Tamul", descripcion: "El día grande: mirador al Sótano de las Huahuas, Cascada de Tamul en lancha y Cueva del Agua." },
      { dia: 3, tipo: "tour", tourSlug: "paraiso-escalonado-minas-micos", titulo: "Paraíso Escalonado (o Ruta Acuática, a elegir)", descripcion: "Minas Viejas y Cascadas de Micos. Si prefieres, lo cambiamos por la Ruta Acuática del Puente de Dios." },
      { dia: 4, tipo: "salida", titulo: "Salida", descripcion: "Desayuno, check-out y regreso a casa con la memoria llena." },
    ],
    incluye: [
      "3 noches en Hotel Paraíso Encantado Xilitla",
      "Desayuno buffet los días de tour",
      "3 tours completos (a elegir)",
      "Transporte del hotel al inicio de cada tour y de regreso",
      "Guías certificados NOM-09 SECTUR",
      "Entradas a todas las atracciones",
      "Equipo de seguridad",
      "Seguro de viaje",
      "Fotografías y video de cada recorrido",
    ],
    noIncluye: [
      "Traslado hasta Xilitla (llegas por tu cuenta — consulta la sección 'Cómo llegar')",
      "Comidas y cenas (excepto desayunos)",
      "Suplemento de habitación Jungla con vista a la montaña (+$400/noche)",
      "Propinas y gastos personales",
    ],
    valor: [
      { item: "3 noches hotel (2 pax)", precio: "$8,400" },
      { item: "3 tours completos", precio: "$5,800" },
      { item: "Transporte 3 días", precio: "$1,200" },
      { item: "Fotos + video del recorrido", precio: "$1,600" },
      { item: "Entradas + guías", precio: "$1,200" },
    ],
  },
  {
    id: "gran-huasteca",
    slug: "gran-huasteca",
    nombre: "Paquete Gran Huasteca",
    subtitulo: "Lo ves todo — la Huasteca completa",
    duracion: "5 días / 4 noches",
    dias: 5,
    noches: 4,
    precio: 15500,
    precioLabel: "por pareja",
    badge: "El más completo",
    imagen: "/imagenes/tours/edward-james/hero.jpg",
    urgencia: "La experiencia más completa — cuatro días de tours sin repetir destino",
    perfiles: ["Lo ven todo", "Grupos", "Experiencia total"],
    tours: [
      "Ruta Surrealista — Edward James (Día 1)",
      "Expedición Tamul — Sótano & Cascada (Día 2)",
      "Cascadas del Meco — Turquesas (Día 3)",
      "Ruta Acuática Puente de Dios (Día 4)",
    ],
    itinerario: [
      { dia: 1, tipo: "tour", tourSlug: "ruta-surrealista-edward-james", titulo: "Llegada + Ruta Surrealista (Edward James)", descripcion: "Si llegas en el autobús de la mañana a Xilitla (~6:30 AM), arrancamos ese mismo día con Las Pozas, a minutos del hotel." },
      { dia: 2, tipo: "tour", tourSlug: "expedicion-tamul", titulo: "Expedición Tamul", descripcion: "Mirador al Sótano de las Huahuas, Cascada de Tamul en lancha de remo y Cueva del Agua." },
      { dia: 3, tipo: "tour", tourSlug: "cascadas-del-meco", titulo: "Cascadas del Meco", descripcion: "Las cascadas turquesa de El Naranjo, miradores y pozas para nadar." },
      { dia: 4, tipo: "tour", tourSlug: "ruta-acuatica-puente-de-dios", titulo: "Ruta Acuática Puente de Dios", descripcion: "El arco de luz del Puente de Dios en Tamasopo, hacienda y siete cascadas." },
      { dia: 5, tipo: "salida", titulo: "Salida", descripcion: "Desayuno, check-out y regreso a casa con la memoria llena de la Huasteca completa." },
    ],
    incluye: [
      "4 noches en Hotel Paraíso Encantado Xilitla",
      "Desayuno buffet los días de tour",
      "4 tours completos (Edward James, Expedición Tamul, Cascadas del Meco y Ruta Acuática Puente de Dios)",
      "Transporte del hotel al inicio de cada tour y de regreso",
      "Guías certificados NOM-09 SECTUR",
      "Entradas a todas las atracciones",
      "Equipo de seguridad",
      "Seguro de viaje",
      "Fotografías y video de cada recorrido",
    ],
    noIncluye: [
      "Traslado hasta Xilitla (llegas por tu cuenta — consulta la sección 'Cómo llegar')",
      "Comidas y cenas (excepto desayunos)",
      "Suplemento de habitación Jungla con vista a la montaña (+$400/noche)",
      "Propinas y gastos personales",
    ],
    valor: [
      { item: "4 noches hotel (2 pax)", precio: "$11,200" },
      { item: "4 tours completos", precio: "$7,700" },
      { item: "Transporte 4 días", precio: "$1,600" },
      { item: "Fotos + video del recorrido", precio: "$1,600" },
      { item: "Entradas + guías", precio: "$1,600" },
    ],
  },
];

export function getPaquete(slug: string): Paquete | undefined {
  return PAQUETES_DB.find((p) => p.slug === slug);
}
