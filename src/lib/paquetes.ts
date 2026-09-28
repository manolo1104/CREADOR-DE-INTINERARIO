/**
 * paquetes.ts — fuente única de los paquetes (tours + hospedaje).
 * La tarjeta (PaquetesInteractivo) y las páginas de detalle (/paquetes/[slug])
 * leen de aquí. Los tours del itinerario se cruzan por `tourSlug` contra TOURS_DB.
 */
import { TRASLADOS, precioBase } from "./traslados";
import { TOURS_DB, tourCollage } from "./tours";
import { HABITACIONES_HOTEL } from "./habitaciones";

export interface ItinerarioDia {
  dia: number;
  tipo: "llegada" | "tour" | "salida";
  titulo: string;
  /** slug que cruza con TOURS_DB para sacar nombre, descripción e imágenes del tour */
  tourSlug?: string;
  /**
   * Fotos del día cuando NO es un tour del catálogo.
   *
   * El día 1 de la Luna de Miel visita un solo lugar —el jardín de Edward
   * James— y no el recorrido completo que lo incluye. Colgarle el `tourSlug`
   * de la Ruta Surrealista prometería cuatro paradas que no se hacen, y
   * dejarlo pelado deja el día sin una sola imagen.
   */
  fotos?: string[];
  /** Página de destino a la que enlaza el día, cuando no hay tour. */
  destinoSlug?: string;
  /**
   * SOLO para tours cobrados POR VEHÍCULO (el RZR): qué ruta incluye el
   * paquete. Es dato de DINERO, no de texto: la Ruta Nanacatli cuesta $1,600 y
   * la Nacimiento $3,800, así que sin esto no se puede decir cuánto costaría
   * suelto. Tiene que coincidir exactamente con el nombre en `TOURS_DB.rutas`.
   */
  rutaVehiculo?: string;
  /**
   * Actividades opcionales del tour que el paquete YA incluye en su precio
   * (ej. el Salto de las 7 Cascadas). Son los `id` del catálogo de add-ons.
   */
  addOns?: string[];
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
  /**
   * Qué habitación cubre YA el precio publicado.
   *
   * Por omisión es la de vista a la selva, y elegir la Jungla suma su
   * diferencia. La Luna de Miel es al revés: su precio ya incluye la suite
   * Jungla, y sin decirlo aquí el motor cobraba la diferencia OTRA VEZ — la
   * ficha prometía la Jungla incluida y el checkout le sumaba $400 por noche.
   */
  habitacionIncluida?: "selva" | "montana";
  /**
   * Las habitaciones que ofrece ESTE paquete, por id y en orden: la primera es
   * la que se asigna. Sin esto se ofrecen las cuatro de siempre.
   *
   * La Luna de Miel se vende con la suite Jungla puesta: no es una lista donde
   * escoger, es una habitación y su reemplazo.
   */
  habitaciones?: string[];
  badge?: string;
  destacado?: boolean;
  imagen: string;
  /** Logotipo propio del paquete, sin fondo. Ver `scripts/README-logos.md`. */
  logo?: string;
  /**
   * Una sección de fotos que es SÓLO de este paquete.
   *
   * La cena romántica de la Luna de Miel no es un tour ni es el hotel: no cabe
   * en el itinerario ni en la galería de habitaciones, y contarla sólo con un
   * renglón de "qué incluye" desperdicia lo que de verdad la vende, que son
   * las fotos.
   */
  galeriaExtra?: {
    /** El día del itinerario dentro del que se pinta. */
    dia: number;
    titulo: string;
    texto: string;
    fotos: { src: string; alt: string }[];
  };
  /**
   * Collage de la tarjeta y del hero: una foto por tour incluido, en el orden
   * del itinerario.
   *
   * Normalmente NO hace falta escribirlo: `collagePaquete()` lo saca solo de
   * los tours del paquete, tomando la primera foto del collage de cada uno —la
   * de su destino principal—. Se escribe a mano sólo cuando la elección tiene
   * que ser otra, y entonces el porqué va en un comentario.
   */
  collage?: string[];
  urgencia: string;
  tours: string[];               // texto para la tarjeta del listado
  /**
   * Un día del itinerario que el cliente ELIGE. Los dos tours valen lo mismo,
   * así que la elección no mueve el precio — pero el equipo necesita saber a
   * dónde lo lleva, y hasta ahora el itinerario decía "o Ruta Acuática, a
   * elegir" sin que hubiera ningún sitio donde elegir.
   */
  eleccionTour?: {
    /**
     * El día del itinerario que se elige. Cuando el paquete entero es a la
     * carta —"Tu Huasteca"— no hay un día concreto: se eligen todos, y por eso
     * el día se omite.
     */
    dia?: number;
    /** Cuántos recorridos elige el cliente. Uno, si no se dice. */
    cuantos?: number;
    titulo: string;
    opciones: { slug: string; nombre: string; nota?: string }[];
  };
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
  /** Las fotos del cuarto, tal como las enseña el sitio del hotel. */
  galeria?: string[];
  descripcion: string;
  vista: string;
  /** suplemento por noche (MXN) — solo las de vista a la montaña */
  suplemento?: number;
}

/**
 * Las fotos NO se escriben aquí: salen del catálogo del hotel
 * (`habitaciones.ts`), que a su vez copia las del sitio de Paraíso Encantado.
 * Escribirlas dos veces acababa con el paquete enseñando una foto del cuarto y
 * el checkout otra distinta del mismo cuarto.
 */
function fotosDe(id: string): Pick<Habitacion, "imagen" | "galeria"> {
  const h = HABITACIONES_HOTEL.find((x) => x.id === id);
  return { imagen: h?.imagen ?? "", galeria: h?.galeria };
}

export const HABITACIONES: Habitacion[] = [
  {
    id: "orquideas-2",
    nombre: "Orquídeas 2",
    ...fotosDe("orquideas-2"),
    descripcion: "Una de nuestras habitaciones más solicitadas: tranquila y rodeada de la vegetación del hotel.",
    vista: "Selva / jardín",
  },
  {
    id: "bromelias-1",
    nombre: "Bromelias 1",
    ...fotosDe("bromelias-1"),
    descripcion: "Habitación cómoda con el ambiente selvático característico de Paraíso Encantado.",
    vista: "Selva / jardín",
  },
  {
    id: "lirios-2",
    nombre: "Lirios 2",
    ...fotosDe("lirios-2"),
    descripcion: "Espacio luminoso y acogedor para descansar después de un día de tours.",
    vista: "Selva / jardín",
  },
  {
    id: "jungla",
    nombre: "Jungla",
    ...fotosDe("jungla"),
    descripcion: "Suite con terraza privada, vista directa a la montaña y piscina de spa al exterior — la favorita para despertar con el paisaje de la sierra.",
    vista: "Montaña",
    suplemento: 400,
  },
  {
    // El reemplazo de la Jungla cuando no hay fechas: misma tarifa, misma
    // categoría y las mismas prestaciones (terraza con vista y spa privado al
    // aire libre). Confirmado por Manolo el 10 sep 2026.
    id: "flor-de-liz-2",
    nombre: "Suite Flor de Liz 2",
    ...fotosDe("flor-de-liz-2"),
    descripcion: "Terraza con vista al pueblo y spa privado al aire libre — las mismas prestaciones que la Jungla.",
    vista: "Montaña",
    suplemento: 400,
  },
];

/**
 * Las habitaciones que ofrece un paquete, en orden: la PRIMERA es la asignada.
 *
 * Por omisión son las tres de vista a la selva más la Jungla, que es lo que se
 * ha vendido siempre. La Luna de Miel es distinta: su habitación no se elige,
 * ya viene puesta, y lo único que hay detrás es el reemplazo por si esa suite
 * no tiene fechas.
 */
const HABITACIONES_POR_DEFECTO = ["orquideas-2", "bromelias-1", "lirios-2", "jungla"];

export function habitacionesDePaquete(p: Pick<Paquete, "habitaciones">): Habitacion[] {
  return (p.habitaciones ?? HABITACIONES_POR_DEFECTO)
    .map((id) => HABITACIONES.find((h) => h.id === id))
    .filter((h): h is Habitacion => !!h);
}

/** El paquete no deja elegir habitación: la trae asignada. */
export function habitacionAsignada(p: Pick<Paquete, "habitaciones">): boolean {
  return !!p.habitaciones?.length;
}

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

/**
 * La lista de traslados con su precio, en el idioma pedido.
 *
 * Vive aquí y no dentro del texto de la FAQ porque la MISMA frase se arma en
 * español y en inglés: si cada versión la construyera por su cuenta, un cambio
 * de precio en `TRASLADOS` acabaría reflejado en un idioma y en el otro no.
 */
export function TRASLADOS_TEXTO(locale: "es" | "en" = "es"): string {
  return TRASLADOS.map((r) => {
    const precio = `$${precioBase(r).toLocaleString(locale === "en" ? "en-US" : "es-MX")}`;
    return locale === "en"
      ? `${r.ciudad} (from ${precio} round trip per vehicle)`
      : `${r.ciudad} (desde ${precio} redondo por vehículo)`;
  }).join(", ");
}

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
    a: "Sí. El hotel Paraíso Encantado tiene varias habitaciones (Orquídeas, Bromelias, Lirios y Jungla). Las de vista a la selva están incluidas en el precio; la suite Jungla, con vista a la montaña, tiene un suplemento de $400 MXN por noche. En el paquete Luna de Miel la Jungla ya va incluida, sin suplemento.",
  },
  {
    q: "¿El precio incluye el traslado hasta Xilitla?",
    a: `No viene incluido, pero sí lo hacemos aparte: tenemos traslado privado desde ${TRASLADOS_TEXTO("es")}. El precio del paquete sí cubre el traslado del hotel al punto de inicio de cada tour y de regreso. Si prefieres llegar por tu cuenta, en la sección 'Cómo llegar' están las opciones de auto, avión y autobús.`,
  },
  {
    q: "¿Cómo confirman la disponibilidad?",
    a: "Al enviarnos tu consulta por WhatsApp verificamos la disponibilidad del hotel y las fechas en tiempo real. Te respondemos en menos de 1 hora y no necesitas pago anticipado para apartar.",
  },
];

// ── Paquetes ────────────────────────────────────────────────────────────────

/**
 * Los paquetes ya no se ordenan por cuántos días duran, sino por QUIÉN viaja:
 * pareja, familia, quien busca adrenalina y quien quiere verlo todo. Los tres
 * anteriores (aventura, completo, gran-huasteca) se retiran; sus direcciones
 * redirigen al equivalente nuevo desde `next.config.mjs`.
 *
 * PRECIOS PROVISIONALES. El desglose de `valor` sale de precios de lista
 * reales: hotel $2,800 la noche por pareja, tours al precio del catálogo,
 * transporte $400 el día de tour, entradas y guías $400 el día, y fotos y
 * video $1,600. El precio final se dejó anclado a la escalera que ya cobrabas,
 * para no subirle el precio a nadie sin decirlo — como el desglose ahora usa
 * precios reales y antes estaban por debajo, el ahorro anunciado sube del 30 %
 * al 40 %. Si prefieres que el ahorro vuelva a leerse ~35 %, hay que subir cada
 * paquete un 12-14 %.
 */
export const PAQUETES_DB: Paquete[] = [
  {
    id: "luna-de-miel",
    slug: "luna-de-miel",
    nombre: "Luna de Miel",
    subtitulo: "La Huasteca de a dos, sin prisa",
    duracion: "3 días / 2 noches",
    dias: 3,
    noches: 2,
    precio: 9800,
    precioProvisional: true,
    precioLabel: "por pareja",
    badge: "Lunamieleros",
    // El precio publicado YA cubre la suite Jungla: no se vuelve a cobrar.
    habitacionIncluida: "montana",
    // La Jungla va asignada; la Flor de Liz 2 es el reemplazo si no hay fechas.
    habitaciones: ["jungla", "flor-de-liz-2"],
    /**
     * A mano porque el día 1 dejó de ser un tour del catálogo: derivándolo
     * saldría sólo la foto de Tamul y el jardín —que es medio paquete— no
     * aparecería en el hero.
     */
    collage: [
      "/imagenes/las-pozas-jardin-surrealista/hero.jpg",
      "/imagenes/tours/tamul/hero.jpg",
      // La cena cierra el collage porque cierra el viaje: es lo que distingue
      // a este paquete de cualquier otro que haga los mismos dos días.
      "/imagenes/hotel-paraiso-encantado/cena-romantica/vino-terraza.jpg",
    ],
    imagen: "/imagenes/cascadas-minas-viejas/hero-new.jpg",
    urgencia: "Incluye la suite Jungla con piscina de spa y la cena romántica de la segunda noche",
    perfiles: ["Recién casados", "Parejas", "Aniversarios", "Ritmo tranquilo"],
    tours: [
      "Las Pozas, el jardín surrealista de Edward James (Día 1)",
      "Expedición Tamul — Tamul, Cueva del Agua y Sótano (Día 2)",
    ],
    galeriaExtra: {
      dia: 2,
      titulo: "La segunda noche",
      texto: "Mientras están en Tamul, el equipo del hotel prepara la habitación: pétalos, velas y las luces encendidas. Al volver, la mesa ya está puesta en la terraza privada, con el pueblo de Xilitla alumbrado abajo, su botella lista y la cena emplatándose.",
      fotos: [
        { src: "/imagenes/hotel-paraiso-encantado/cena-romantica/habitacion.jpg", alt: "Cama de la suite Jungla preparada con pétalos de rosa, luces de corazones y toallas dobladas en forma de cisnes" },
        { src: "/imagenes/hotel-paraiso-encantado/cena-romantica/mesa-terraza.jpg", alt: "Mesa de la terraza privada al anochecer con velas, rosas y dos copas de vino, con las luces de Xilitla al fondo" },
        { src: "/imagenes/hotel-paraiso-encantado/cena-romantica/vino-terraza.jpg", alt: "Botella de vino en hielera junto a la mesa de la terraza, con velas encendidas y la sierra de noche" },
      ],
    },
    itinerario: [
      {
        dia: 1, tipo: "llegada", titulo: "Llegada, check-in y el jardín de Edward James",
        destinoSlug: "las-pozas-jardin-surrealista",
        fotos: [
          "/imagenes/las-pozas-jardin-surrealista/hero.jpg",
          "/imagenes/las-pozas-jardin-surrealista/arcos.jpg",
          "/imagenes/las-pozas-jardin-surrealista/puerta-luna.jpg",
        ],
        descripcion: "Llegan, hacen check-in y el único plan del día es Las Pozas, el jardín escultórico que Edward James levantó en la selva. Nada más: ni madrugar ni carretera. El jardín recibe de 9 de la mañana a 4 de la tarde y el último recorrido guiado sale justo a las 4 y dura dos horas, así que llegar a media tarde tampoco les quita el día.",
      },
      { dia: 2, tipo: "tour", tourSlug: "expedicion-tamul", titulo: "Expedición Tamul y cena romántica", descripcion: "El día grande: canoa por el Cañón del Tampaón hasta los 105 metros de la Cascada de Tamul, clavados en la Cueva del Agua y el Sótano de las Huahuas al atardecer, cuando salen las aves. Al volver, la habitación los espera con velas y pétalos, su botella lista y la cena emplatándose: un platillo formal en la terraza privada." },
      { dia: 3, tipo: "salida", titulo: "Salida", descripcion: "Desayuno y camino a casa. El desayuno buffet va incluido solo los días de tour." },
    ],
    incluye: [
      "2 noches en la suite Jungla del Hotel Paraíso Encantado, con terraza privada, vista a la montaña y piscina de spa al exterior",
      "Desayuno buffet los días de tour",
      "Cena romántica la segunda noche: platillo formal y botella de vino",
      "La habitación preparada con velas y pétalos para esa noche",
      "Entrada y recorrido guiado en Las Pozas, el jardín de Edward James",
      "Tour Expedición Tamul completo, de día entero",
      "Transporte del hotel a Las Pozas y al inicio del tour del día 2, ida y vuelta",
      "Guías certificados NOM-09 SECTUR",
      "Entradas a todas las atracciones",
      "Equipo de seguridad",
      "Seguro de viaje",
      "Fotografía y video del recorrido",
    ],
    noIncluye: [
      "Traslado hasta Xilitla (llegas por tu cuenta — consulta la sección 'Cómo llegar')",
      "Comidas y cenas, salvo los desayunos y la cena romántica del día 2",
      "Propinas y gastos personales",
    ],
    // Falta el costo de la cena romántica con vino y el arreglo de la
    // habitación: Manolo todavía no lo da, y no se inventa una cifra.
    valor: [
      { item: "2 noches suite Jungla (2 pax)", precio: "$3,800" },
      { item: "Expedición Tamul (2 pax)", precio: "$3,100" },
      { item: "Transporte 2 días", precio: "$800" },
      { item: "Entradas + guías", precio: "$800" },
      { item: "Fotografía y video del recorrido", precio: "$1,600" },
    ],
  },
  {
    id: "inmersion-huasteca",
    slug: "inmersion-huasteca",
    nombre: "Inmersión Huasteca: Tamul & Surrealismo",
    subtitulo: "La cascada más alta y el jardín más enigmático, en tres días",
    duracion: "3 días / 2 noches",
    dias: 3,
    noches: 2,
    // Precio del cartel de promoción (Manolo, 23 sep 2026). Con 2 noches queda
    // a $201 de lo que cuesta suelto, así que la tarjeta NO enseña ahorro:
    // `ahorroPaquete` sólo lo anuncia a partir de $500.
    precio: 8699,
    precioLabel: "por pareja",
    // El texto original pedía "🔥 El paquete más reservado por parejas". No se
    // puso: el paquete se estrena hoy y nadie lo ha reservado todavía. El día
    // que sea verdad, se cambia aquí.
    badge: "Nuevo",
    imagen: "/imagenes/cascada-de-tamul/gallery-1.jpg",
    // Las tres fotos que cuentan el paquete: la panga frente a Tamul, el
    // castillo de Edward James y el cuarto donde se duerme.
    collage: [
      "/imagenes/cascada-de-tamul/gallery-1.jpg",
      "/imagenes/las-pozas-jardin-surrealista/gallery-1.jpg",
      "/imagenes/hotel-paraiso-encantado/habitaciones/lirios-1/01.jpg",
      "/imagenes/cascada-de-tamul/grupo-cascada.jpg",
    ],
    urgencia: "Los dos recorridos que todo el mundo quiere ver, en el viaje más corto del catálogo",
    perfiles: ["Parejas", "Primera vez en la Huasteca", "Ritmo tranquilo"],
    tours: [
      "Ruta Surrealista — Edward James, Manantiales, Cuevas y Castillo (Día 1)",
      "Expedición Tamul — Tamul, Cueva del Agua y Sótano (Día 2)",
    ],
    itinerario: [
      { dia: 1, tipo: "tour", tourSlug: "ruta-surrealista-edward-james", titulo: "Llegada + Ruta Surrealista", descripcion: "Si llegas en el autobús de la mañana, entregamos la habitación temprano y salimos el mismo día. El jardín de Edward James, los manantiales de Huichihuayán, la Cueva de las Quilas y el Castillo de la Salud: ocho horas de caminar poco y mirar mucho, y todo del lado de Xilitla." },
      { dia: 2, tipo: "tour", tourSlug: "expedicion-tamul", titulo: "Expedición Tamul", descripcion: "El día grande: canoa remontando el cañón hasta quedar frente a la caída de 105 metros, la Cueva del Agua y, al atardecer, el Sótano de las Huahuas. Son 9 horas y se sale temprano." },
      { dia: 3, tipo: "salida", titulo: "Salida", descripcion: "Desayuno, check-out y camino a casa." },
    ],
    incluye: [
      "2 noches en Hotel Paraíso Encantado Xilitla, habitación King con vista a la selva",
      "Desayuno los días de tour",
      "Tour Expedición Tamul completo (12 horas)",
      "Tour Ruta Surrealista completo (8 horas)",
      "Transporte del hotel al inicio de cada tour y de regreso",
      "Guías certificados NOM-09 SECTUR",
      "Entradas a todas las atracciones",
      "Equipo de seguridad y chaleco salvavidas",
      "Seguro de viaje",
      "Fotografía y video del recorrido",
    ],
    noIncluye: [
      "Traslado hasta Xilitla (llegas por tu cuenta, consulta la sección 'Cómo llegar')",
      "Comidas y cenas (excepto desayunos)",
      "Habitación con vista a la montaña (escríbenos y te cotizamos el cambio)",
      "Propinas y gastos personales",
    ],
    valor: [
      { item: "2 noches hotel (2 pax)", precio: "$3,000" },
      { item: "Expedición Tamul (2 pax)", precio: "$3,100" },
      { item: "Ruta Surrealista (2 pax)", precio: "$2,800" },
    ],
  },
  {
    id: "gran-huasteca",
    slug: "gran-huasteca",
    nombre: "Gran Huasteca",
    subtitulo: "Los tres imperdibles de la región, en un solo viaje",
    duracion: "4 días / 3 noches",
    dias: 4,
    noches: 3,
    precio: 12490,
    precioLabel: "por pareja",
    // 🔴 Antes decía "Más popular" con CERO paquetes vendidos en 57 reservas.
    // La etiqueta describe lo que el paquete ES, no una popularidad inventada.
    badge: "Los 3 imperdibles",
    destacado: true,
    imagen: "/imagenes/cascada-de-tamul/gallery-1.jpg",
    collage: [
      "/imagenes/cascada-de-tamul/gallery-1.jpg",
      "/imagenes/cascada-el-meco/hero.jpg",
      "/imagenes/las-pozas-jardin-surrealista/gallery-1.jpg",
      "/imagenes/hotel-paraiso-encantado/habitaciones/lirios-1/01.jpg",
    ],
    urgencia: "Los tres recorridos que más pide la gente: Tamul va en 7 de cada 10 reservas",
    perfiles: ["Parejas", "Primera vez en la Huasteca", "Lo esencial"],
    tours: [
      "Ruta Surrealista — Edward James, Manantiales, Cuevas y Castillo (Día 1)",
      "Expedición Tamul — Tamul, Cueva del Agua y Sótano (Día 2)",
      "Cascadas del Meco — Meco, Mirador Panorámico y El Gran Salto (Día 3)",
    ],
    itinerario: [
      { dia: 1, tipo: "tour", tourSlug: "ruta-surrealista-edward-james", titulo: "Llegada + Ruta Surrealista", descripcion: "Si llegas en el autobús de la mañana, entregamos la habitación temprano y salimos el mismo día. Este recorrido es el que queda del lado de Xilitla —el jardín de Edward James, los manantiales de Huichihuayán, la Cueva de las Quilas y el Castillo de la Salud—, así que el día de llegada no se va en carretera." },
      { dia: 2, tipo: "tour", tourSlug: "expedicion-tamul", titulo: "Expedición Tamul", descripcion: "El día grande: canoa remontando el cañón hasta quedar frente a la caída de 105 metros, la Cueva del Agua al regreso y el Sótano de las Huahuas al atardecer, cuando las aves vuelven a meterse. Doce horas que terminan con el mejor rato del día." },
      { dia: 3, tipo: "tour", tourSlug: "cascadas-del-meco", titulo: "Cascadas del Meco", descripcion: "Se sale temprano a propósito: el agua del Meco es turquesa a media mañana y pierde el color con el sol alto. Mirador panorámico, las pozas y el cierre en la Cascada del Salto." },
      { dia: 4, tipo: "salida", titulo: "Salida", descripcion: "Desayuno, check-out y camino a casa." },
    ],
    incluye: [
      "3 noches en Hotel Paraíso Encantado Xilitla, habitación King con vista a la selva",
      "Desayuno los días de tour",
      "Tour Ruta Surrealista completo",
      "Tour Expedición Tamul completo",
      "Tour Cascadas del Meco completo",
      "Traslados del hotel al inicio de cada tour y de regreso",
      "Guías certificados NOM-09 SECTUR",
      "Entradas a todas las atracciones",
      "Equipo de seguridad y chaleco salvavidas",
      "Seguro de viaje",
      "Fotografía y video del recorrido",
    ],
    noIncluye: [
      "Traslado hasta Xilitla (llegas por tu cuenta, consulta la sección 'Cómo llegar')",
      "Comidas y cenas (excepto desayunos)",
      "Habitación con vista a la montaña (escríbenos y te cotizamos el cambio)",
      "Propinas y gastos personales",
    ],
    valor: [
      { item: "3 noches hotel (2 pax)", precio: "$4,500" },
      { item: "Expedición Tamul (2 pax)", precio: "$3,100" },
      { item: "Cascadas del Meco (2 pax)", precio: "$3,400" },
      { item: "Ruta Surrealista (2 pax)", precio: "$2,800" },
    ],
  },
  {
    id: "aventura",
    slug: "aventura",
    nombre: "Paquete Aventura",
    subtitulo: "Rafting, RZR y el salto de cascadas en Micos",
    duracion: "4 días / 3 noches",
    dias: 4,
    noches: 3,
    precio: 13590,
    precioLabel: "por pareja",
    badge: "Adrenalina",
    imagen: "/imagenes/rio-tampaon-rafting/gallery-1.jpg",
    collage: [
      "/imagenes/rio-tampaon-rafting/gallery-1.jpg",
      "/imagenes/cascadas-de-micos/gallery-1.jpg",
      "/imagenes/cascadas-minas-viejas/gallery-1.jpg",
      "/imagenes/hotel-paraiso-encantado/habitaciones/lirios-1/01.jpg",
    ],
    urgencia: "Rafting clase III y saltos de altura: pide buena condición física y no tenerle miedo al agua",
    perfiles: ["Adrenalina", "Amigos", "Buena condición física"],
    tours: [
      "Recorrido en RZR — Ruta Miradores, 3 h (Día 1)",
      "Paraíso Escalonado — Minas Viejas, Micos y el Salto de las 7 Cascadas (Día 2)",
      "Rafting en el Río Tampaón — Rápidos Clase III (Día 3)",
    ],
    itinerario: [
      { dia: 1, tipo: "tour", tourSlug: "rzr-xilitla", rutaVehiculo: "Ruta Miradores", titulo: "Llegada + RZR por la sierra", descripcion: "El RZR sale de Xilitla, a minutos del hotel, así que es lo único que cabe el día que llegas sin que se te vaya la tarde en carretera. Tres horas por la Ruta Miradores: los puntos más altos de la sierra, la Aldea Nanacatli y la selva hasta donde alcanza la vista." },
      { dia: 2, tipo: "tour", tourSlug: "paraiso-escalonado-minas-micos", addOns: ["salto-7-cascadas"], titulo: "Minas Viejas, Micos y el Salto de las 7 Cascadas", descripcion: "Las terrazas de Minas Viejas por la mañana y las siete caídas de Micos por la tarde, donde se salta de una poza a la siguiente con guía de rescate en el agua. Saltar o no lo decides tú en el borde: tu lugar va apartado de todos modos." },
      { dia: 3, tipo: "tour", tourSlug: "rafting-rio-tampaon", titulo: "Rafting en el Tampaón", descripcion: "Catorce kilómetros de rápidos clase III por el cañón del Tampaón, incluido el rápido de La Tumba, el más técnico del descenso. Se sale temprano y se vuelve a media tarde, con la noche todavía por delante para no salir manejando cansado." },
      { dia: 4, tipo: "salida", titulo: "Salida", descripcion: "Desayuno, check-out y camino a casa." },
    ],
    incluye: [
      "3 noches en Hotel Paraíso Encantado Xilitla, habitación King con vista a la selva",
      "Desayuno los días de tour",
      "Recorrido en RZR, Ruta Miradores de 3 horas (un vehículo para los dos)",
      "Tour Paraíso Escalonado completo",
      "Salto de las 7 Cascadas en Micos, con guía de rescate en el agua",
      "Rafting en el Río Tampaón completo, clase III",
      "Traslados del hotel al inicio de cada actividad y de regreso",
      "Guías certificados NOM-09 SECTUR",
      "Entradas a todas las atracciones",
      "Equipo de seguridad: casco, chaleco salvavidas y remo",
      "Seguro de viaje",
      "Fotografía y video del recorrido",
    ],
    noIncluye: [
      "Traslado hasta Xilitla (llegas por tu cuenta, consulta la sección 'Cómo llegar')",
      "Comidas y cenas (excepto desayunos)",
      "Habitación con vista a la montaña (escríbenos y te cotizamos el cambio)",
      "Propinas y gastos personales",
    ],
    valor: [
      { item: "3 noches hotel (2 pax)", precio: "$4,500" },
      { item: "Rafting Río Tampaón (2 pax)", precio: "$3,900" },
      { item: "Paraíso Escalonado + Salto (2 pax)", precio: "$3,900" },
      { item: "RZR Ruta Miradores (1 vehículo)", precio: "$2,600" },
    ],
  },
  {
    id: "odisea-huasteca",
    slug: "odisea-huasteca",
    nombre: "Odisea Huasteca",
    subtitulo: "Cuatro días de tour sin repetir un solo lugar",
    duracion: "5 días / 4 noches",
    dias: 5,
    noches: 4,
    precio: 16500,
    precioLabel: "por pareja",
    badge: "Lo ves todo",
    imagen: "/imagenes/cascadas-de-micos/gallery-1.jpg",
    collage: [
      "/imagenes/cascada-de-tamul/gallery-1.jpg",
      "/imagenes/las-pozas-jardin-surrealista/gallery-1.jpg",
      "/imagenes/cascada-el-meco/hero.jpg",
      "/imagenes/cascadas-de-micos/gallery-1.jpg",
    ],
    urgencia: "Cuatro días de tour y una sola maleta: se duerme siempre en el mismo hotel",
    perfiles: ["Lo ven todo", "Primera vez en la Huasteca", "Sin repetir destino"],
    tours: [
      "Ruta Surrealista — Edward James, Manantiales, Cuevas y Castillo (Día 1)",
      "Expedición Tamul — Tamul, Cueva del Agua y Sótano (Día 2)",
      "Cascadas del Meco — Meco, Mirador Panorámico y El Gran Salto (Día 3)",
      "Paraíso Escalonado — Minas Viejas & Cascadas de Micos (Día 4)",
    ],
    itinerario: [
      { dia: 1, tipo: "tour", tourSlug: "ruta-surrealista-edward-james", titulo: "Llegada + Ruta Surrealista", descripcion: "El recorrido que queda del lado de Xilitla, para que el día de llegada no se vaya en carretera: el jardín de Edward James, los manantiales de Huichihuayán, la Cueva de las Quilas y el Castillo de la Salud." },
      { dia: 2, tipo: "tour", tourSlug: "expedicion-tamul", titulo: "Expedición Tamul", descripcion: "Canoa remontando el cañón hasta quedar frente a la caída de 105 metros, la Cueva del Agua al regreso y el Sótano de las Huahuas al atardecer, cuando las aves vuelven a meterse." },
      { dia: 3, tipo: "tour", tourSlug: "cascadas-del-meco", titulo: "Cascadas del Meco", descripcion: "Se sale temprano a propósito: el agua del Meco es turquesa a media mañana y pierde el color con el sol alto. Mirador panorámico, las pozas y el cierre en la Cascada del Salto." },
      { dia: 4, tipo: "tour", tourSlug: "paraiso-escalonado-minas-micos", titulo: "Minas Viejas y Cascadas de Micos", descripcion: "El día de agua tranquila para cerrar: las terrazas de Minas Viejas, que son escalones naturales con poza en cada nivel, y las siete caídas de Micos." },
      { dia: 5, tipo: "salida", titulo: "Salida", descripcion: "Desayuno, check-out y camino a casa." },
    ],
    incluye: [
      "4 noches en Hotel Paraíso Encantado Xilitla, habitación King con vista a la selva",
      "Desayuno los días de tour",
      "Tour Ruta Surrealista completo",
      "Tour Expedición Tamul completo",
      "Tour Cascadas del Meco completo",
      "Tour Paraíso Escalonado completo",
      "Traslados del hotel al inicio de cada tour y de regreso",
      "Guías certificados NOM-09 SECTUR",
      "Entradas a todas las atracciones",
      "Equipo de seguridad y chaleco salvavidas",
      "Seguro de viaje",
      "Fotografía y video de cada recorrido",
    ],
    noIncluye: [
      "Traslado hasta Xilitla (llegas por tu cuenta, consulta la sección 'Cómo llegar')",
      "Comidas y cenas (excepto desayunos)",
      "Habitación con vista a la montaña (escríbenos y te cotizamos el cambio)",
      "Propinas y gastos personales",
    ],
    valor: [
      { item: "4 noches hotel (2 pax)", precio: "$6,000" },
      { item: "Expedición Tamul (2 pax)", precio: "$3,100" },
      { item: "Cascadas del Meco (2 pax)", precio: "$3,400" },
      { item: "Paraíso Escalonado (2 pax)", precio: "$3,200" },
      { item: "Ruta Surrealista (2 pax)", precio: "$2,800" },
    ],
  },
];

/**
 * Las fotos del collage de un paquete: una por recorrido, la del destino
 * principal de cada uno, en el orden en que se visitan.
 *
 * Se deriva de los tours en lugar de escribirse a mano para que no se desfase:
 * cuando a un tour le cambian la foto de portada, el paquete que lo incluye la
 * cambia con él. Un paquete puede traer su propia lista curada y entonces manda
 * esa.
 *
 * Tope de cuatro, que es lo que sabe dibujar `TourCollage`. Con más recorridos
 * se quedan los CUATRO PRIMEROS del itinerario, que son los que mandan: la
 * Odisea deja fuera la finca de café, que es el cierre tranquilo del viaje y no
 * lo que lo vende.
 */
export function collagePaquete(p: Paquete): string[] {
  if (p.collage?.length) return p.collage.slice(0, 4);

  // A la carta: el itinerario no nombra tours, así que las fotos salen de la
  // lista entre la que elige el cliente.
  const slugs = p.itinerario.some((d) => d.tourSlug)
    ? p.itinerario.map((d) => d.tourSlug).filter((x): x is string => !!x)
    : (p.eleccionTour?.opciones ?? []).map((o) => o.slug);

  const fotos: string[] = [];
  for (const slug of slugs) {
    const tour = TOURS_DB.find((t) => t.slug === slug);
    const foto = tour && tourCollage(tour)[0]?.src;
    // Sin repetir: dos recorridos que comparten destino no deben pintar la
    // misma franja dos veces.
    if (foto && !fotos.includes(foto)) fotos.push(foto);
    if (fotos.length === 4) break;
  }
  return fotos.length ? fotos : [p.imagen];
}

export function getPaquete(slug: string): Paquete | undefined {
  return PAQUETES_DB.find((p) => p.slug === slug);
}
