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
  "luna-de-miel": [
    {
      nombre: "Claudia M.", ciudad: "CDMX", foto: "/imagenes/reviews/reviewer-30.jpg", estrellas: 5, tour: "Luna de Miel",
      texto: "La Luna de Miel superó todas mis expectativas. El primer día es solo Las Pozas, con toda la calma, y el segundo la Expedición Tamul: ver a los miles de loros entrar en espiral al sótano al atardecer fue mágico. Al volver, la habitación ya estaba con velas y la cena puesta en la terraza.",
    },
    {
      nombre: "Roberto & Ana", ciudad: "Guadalajara", foto: "/imagenes/reviews/reviewer-31.jpg", estrellas: 5, tour: "Luna de Miel",
      texto: "Fuimos con la Luna de Miel y fue el mejor viaje que hemos hecho en pareja. El jardín de Edward James, con la luz cayendo entre los arcos... no se puede describir. La suite tiene su propia piscina y la cena en la terraza fue el cierre perfecto. Ya queremos volver para hacer la Odisea Huasteca.",
    },
  ],
  familiar: [
    {
      nombre: "La familia Herrera", ciudad: "Monterrey", foto: "/imagenes/reviews/reviewer-32.jpg", estrellas: 5, tour: "Paquete Familiar",
      texto: "Viajamos con dos niños de 8 y 11 años con el Paquete Familiar. Todo perfectamente coordinado — los guías pacientes y el ritmo ideal para los niños. Las Cascadas del Meco los dejaron boquiabiertos y en Micos se metieron al agua con chaleco sin un solo susto. El hotel los trató como reyes.",
    },
    {
      nombre: "Mariana L.", ciudad: "Puebla", foto: "/imagenes/reviews/reviewer-12.jpg", estrellas: 5, tour: "Paquete Familiar",
      texto: "Hicimos el Paquete Familiar: tres días de tours distintos, el Meco el primero y el jardín de Edward James el segundo, que fue el que más les gustó a los niños. Ninguna caminata larga y cada día algo nuevo sin cambiar de hotel. La logística, impecable.",
    },
  ],
  "aventura-extrema": [
    {
      nombre: "Diego R.", ciudad: "Querétaro", foto: "/imagenes/reviews/reviewer-5.jpg", estrellas: 5, tour: "Aventura Extrema",
      texto: "Aventura Extrema son tres días de tour y cada uno más fuerte que el anterior. El primer día ves la Cascada de Tamul desde la canoa y el tercero bajas por esa misma pared colgado de la cuerda. Te deja sin palabras. Volvería sin pensarlo.",
    },
    {
      nombre: "Luis M.", ciudad: "Guadalajara", foto: "/imagenes/reviews/reviewer-tamul-grupo.jpg", estrellas: 5, tour: "Aventura Extrema",
      texto: "Hice Aventura Extrema con amigos. Los rápidos Clase III del Tampaón nos dejaron muertos de risa y al día siguiente ya estábamos en el rappel frente a Tamul, con un guía en la cuerda todo el tiempo. Pide condición física, pero se puede sin experiencia previa.",
    },
  ],
  "tu-huasteca": [
    {
      nombre: "Andrea & Sofía", ciudad: "Monterrey", foto: "/imagenes/reviews/reviewer-turquoise-group.png", estrellas: 5, tour: "Tu Huasteca",
      texto: "Tu Huasteca es otro nivel. Cuatro días seguidos de tour y los elegimos nosotras: el jardín de Edward James, Tamul, el Puente de Dios y las Cascadas del Meco. Terminamos agotadas y felices. Si vas a ir, ve por este.",
    },
    {
      nombre: "Jorge y Paty", ciudad: "León", foto: "/imagenes/reviews/reviewer-8.jpg", estrellas: 5, tour: "Tu Huasteca",
      texto: "Con Tu Huasteca armamos el viaje a nuestra medida: elegimos los cuatro recorridos al reservar y cambiamos uno una semana antes sin ningún problema. Salimos del mismo hotel los cuatro días, sin rehacer maletas. Repetiríamos sin dudar.",
    },
  ],
  "odisea-huasteca": [
    {
      nombre: "Familia Vázquez", ciudad: "CDMX", foto: "/imagenes/reviews/reviewer-familia-tamul.png", estrellas: 5, tour: "Odisea Huasteca",
      texto: "Veníamos con la duda de si cinco días de tour eran demasiados y nos quedamos cortos. La Odisea Huasteca te deja vivir la Huasteca completa, con calma y durmiendo siempre en el mismo hotel. El día a elegir lo usamos en el Puente de Dios. La organización, impecable.",
    },
    {
      nombre: "Gerardo P.", ciudad: "Aguascalientes", foto: "/imagenes/reviews/reviewer-23.jpg", estrellas: 5, tour: "Odisea Huasteca",
      texto: "Era nuestra primera vez en la Huasteca y no queríamos volver con la lista a medias. Cinco días de tour y ninguno se parece al anterior: Edward James, Tamul con los pericos, Minas Viejas y Micos. Cerrar en la finca de café fue el descanso que no sabíamos que necesitábamos.",
    },
  ],
};

/**
 * Mezcla para la página de listado. La rejilla es de TRES columnas, así que no
 * caben los cinco paquetes: se escoge un testimonio por PERFIL DE VIAJERO, que
 * es el criterio con el que está ordenado el catálogo — pareja, familia y el
 * que viene a verlo todo.
 */
export const RESENAS_PAQUETES: Resena[] = [
  RESENAS_POR_PAQUETE["luna-de-miel"][0],
  RESENAS_POR_PAQUETE.familiar[0],
  RESENAS_POR_PAQUETE["odisea-huasteca"][1],
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
      { dia: 2, tipo: "tour", tourSlug: "expedicion-tamul", titulo: "Expedición Tamul y cena romántica", descripcion: "El día grande: canoa por el Cañón del Tampaón hasta los 105 metros de la Cascada de Tamul, clavados en la Cueva del Agua y el Sótano de las Huahuas al atardecer, cuando salen los pericos. Al volver, la habitación los espera con velas y pétalos, su botella lista y la cena emplatándose: un platillo formal en la terraza privada." },
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
    id: "familiar",
    slug: "familiar",
    nombre: "Paquete Familiar",
    subtitulo: "Tres días que los niños sí aguantan",
    duracion: "4 días / 3 noches",
    dias: 4,
    noches: 3,
    precio: 12500,
    precioProvisional: true,
    precioLabel: "por pareja",
    badge: "Más popular",
    destacado: true,
    imagen: "/imagenes/cascada-el-meco/hero.jpg",
    urgencia: "Los tres tours son de dificultad baja: sin caminatas largas ni descensos",
    perfiles: ["Familias con niños", "Grupos", "Dificultad baja"],
    tours: [
      "Cascadas del Meco — Meco, Mirador Panorámico y El Gran Salto (Día 1)",
      "Ruta Surrealista — Edward James, Manantiales, Cuevas y Castillo (Día 2)",
      "Paraíso Escalonado — Minas Viejas & Cascadas de Micos (Día 3)",
    ],
    itinerario: [
      { dia: 1, tipo: "tour", tourSlug: "cascadas-del-meco", titulo: "Llegada + Cascadas del Meco", descripcion: "Si llegan en el autobús de la mañana, entregamos la habitación temprano y salimos el mismo día. Pozas turquesa, mirador panorámico y chaleco para todos: el primer día es el que engancha a los niños." },
      { dia: 2, tipo: "tour", tourSlug: "ruta-surrealista-edward-james", titulo: "Las Pozas de Edward James", descripcion: "Un día de caminar poco y mirar mucho: el jardín de escaleras que no llevan a ningún lado suele ser el recuerdo que más cuentan los niños al volver. Cierra en los manantiales de Huichihuayán." },
      { dia: 3, tipo: "tour", tourSlug: "paraiso-escalonado-minas-micos", titulo: "Minas Viejas y Cascadas de Micos", descripcion: "El día de agua tranquila. Las terrazas de Minas Viejas son escalones naturales con poza en cada nivel, y en Micos se nada con chaleco. Sin exigencia física." },
      { dia: 4, tipo: "salida", titulo: "Salida", descripcion: "Desayuno, check-out y camino a casa." },
    ],
    incluye: [
      "3 noches en Hotel Paraíso Encantado Xilitla",
      "Desayuno buffet los días de tour",
      "Tour Cascadas del Meco completo",
      "Tour Ruta Surrealista completo",
      "Tour Paraíso Escalonado completo",
      "Transporte del hotel al inicio de cada tour y de regreso",
      "Guías certificados NOM-09 SECTUR",
      "Entradas a todas las atracciones",
      "Chalecos salvavidas para toda la familia",
      "Seguro de viaje",
      "Fotografía y video del recorrido",
    ],
    noIncluye: [
      "Traslado hasta Xilitla (llegas por tu cuenta — consulta la sección 'Cómo llegar')",
      "Los niños se cotizan aparte: de 6 a 10 años pagan el 70 % y menores de 6 el 50 % de la parte de tours",
      "Habitación adicional o cama extra para los niños (escríbenos y te la cotizamos)",
      "Comidas y cenas (excepto desayunos)",
      "Suplemento de habitación Jungla con vista a la montaña (+$400/noche)",
      "Propinas y gastos personales",
    ],
    valor: [
      { item: "3 noches hotel (2 pax)", precio: "$8,400" },
      { item: "Cascadas del Meco (2 pax)", precio: "$3,400" },
      { item: "Ruta Surrealista (2 pax)", precio: "$2,800" },
      { item: "Paraíso Escalonado (2 pax)", precio: "$3,200" },
      { item: "Transporte 3 días", precio: "$1,200" },
      { item: "Entradas + guías", precio: "$1,200" },
      { item: "Fotografía y video del recorrido", precio: "$1,600" },
    ],
  },
  {
    id: "aventura-extrema",
    slug: "aventura-extrema",
    nombre: "Aventura Extrema",
    subtitulo: "Cuerda, rápidos y la caída más alta de México",
    duracion: "4 días / 3 noches",
    dias: 4,
    noches: 3,
    precio: 13500,
    precioProvisional: true,
    precioLabel: "por pareja",
    badge: "Adrenalina",
    imagen: "/imagenes/tours/rappel-tamul/hero.jpg",
    urgencia: "Rappel y rafting piden buena condición física y edad mínima",
    perfiles: ["Amigos aventureros", "Adrenalina", "Buena condición física"],
    tours: [
      "Expedición Tamul — Tamul, Cueva del Agua y Sótano (Día 1)",
      "Rafting en el Río Tampaón — Rápidos Clase III (Día 2)",
      "Rappel en la Cascada de Tamul (Día 3)",
    ],
    itinerario: [
      { dia: 1, tipo: "tour", tourSlug: "expedicion-tamul", titulo: "Llegada + Expedición Tamul", descripcion: "El día que sirve de reconocimiento: navegas el Cañón del Tampaón hasta la Cascada de Tamul y ves desde abajo la pared por la que vas a bajar el día 3. Clavados en la Cueva del Agua y el Sótano de las Huahuas al atardecer." },
      { dia: 2, tipo: "tour", tourSlug: "rafting-rio-tampaon", titulo: "Rafting en el Río Tampaón", descripcion: "Rápidos Clase III en el mismo río, con el cañón cerrándose sobre la balsa. Casco, chaleco y guía de río en cada embarcación." },
      { dia: 3, tipo: "tour", tourSlug: "rappel-tamul", titulo: "Rappel en la Cascada de Tamul", descripcion: "El descenso frente a la caída más alta de México. Se baja con equipo certificado y guía en la cuerda; no hace falta experiencia previa, pero sí no tenerle miedo al vacío." },
      { dia: 4, tipo: "salida", titulo: "Salida", descripcion: "Desayuno, check-out y camino a casa." },
    ],
    incluye: [
      "3 noches en Hotel Paraíso Encantado Xilitla",
      "Desayuno buffet los días de tour",
      "Tour Expedición Tamul completo",
      "Tour Rafting en el Río Tampaón completo",
      "Tour Rappel en la Cascada de Tamul completo",
      "Transporte del hotel al inicio de cada tour y de regreso",
      "Guías certificados NOM-09 SECTUR y guía de cuerda en el rappel",
      "Entradas a todas las atracciones",
      "Equipo de seguridad: arnés, casco y chaleco",
      "Seguro de viaje",
      "Fotografía y video del recorrido",
    ],
    noIncluye: [
      "Traslado hasta Xilitla (llegas por tu cuenta — consulta la sección 'Cómo llegar')",
      "Comidas y cenas (excepto desayunos)",
      "Suplemento de habitación Jungla con vista a la montaña (+$400/noche)",
      "Propinas y gastos personales",
    ],
    valor: [
      { item: "3 noches hotel (2 pax)", precio: "$8,400" },
      { item: "Expedición Tamul (2 pax)", precio: "$3,100" },
      { item: "Rafting Río Tampaón (2 pax)", precio: "$3,900" },
      { item: "Rappel Cascada de Tamul (2 pax)", precio: "$3,400" },
      { item: "Transporte 3 días", precio: "$1,200" },
      { item: "Entradas, guías y equipo de seguridad", precio: "$1,200" },
      { item: "Fotografía y video del recorrido", precio: "$1,600" },
    ],
  },
  {
    id: "tu-huasteca",
    slug: "tu-huasteca",
    nombre: "Tu Huasteca",
    subtitulo: "Cuatro días de tour que eliges tú",
    duracion: "5 días / 4 noches",
    dias: 5,
    noches: 4,
    precio: 18000,
    precioProvisional: true,
    precioLabel: "por pareja",
    badge: "Tú lo armas",
    /**
     * Curado a mano, en contra de lo que saldría solo. Derivarlo de la lista
     * de opciones pondría primero la Ruta Surrealista, que es la de orden
     * alfabético del catálogo, no la que vende: Tamul es el recorrido más
     * reservado de todos y por eso abre el collage.
     */
    collage: [
      "/imagenes/tours/tamul/hero.jpg",
      "/imagenes/tours/edward-james/gallery-2.jpg",
      "/imagenes/puente-de-dios-tamasopo/gallery-10.jpg",
      "/imagenes/cascadas-minas-viejas/hero-new.jpg",
    ],
    imagen: "/imagenes/tours/tamul/hero.jpg",
    urgencia: "El único paquete donde el itinerario lo decides tú, recorrido por recorrido",
    perfiles: ["Tú eliges", "Segunda visita", "Grupos de amigos"],
    tours: [
      "Cuatro recorridos completos, a elegir de una lista de seis",
      "Se eligen al reservar y se pueden cambiar hasta 7 días antes",
    ],
    /**
     * A la carta: ningún día del itinerario nombra un tour, porque los nombra
     * el cliente. `toursDelPaquete` lo detecta por eso mismo y cobra los
     * boletos de la gente extra con los recorridos que de verdad eligió.
     *
     * Los seis de la lista cuestan entre $1,400 y $1,700 por persona: el
     * abanico es de $300, que el precio del paquete absorbe sin letra chica.
     * El rafting ($1,950) y el RZR (que se cobra por vehículo) se quedan
     * fuera a propósito — meterlos obligaría a cobrar un suplemento y el
     * paquete dejaría de tener un solo precio.
     */
    eleccionTour: {
      cuantos: 4,
      titulo: "Elige tus cuatro recorridos",
      opciones: [
        { slug: "ruta-surrealista-edward-james", nombre: "Ruta Surrealista", nota: "El jardín de Edward James, los manantiales de Huichihuayán y la Cueva de las Quilas" },
        { slug: "expedicion-tamul", nombre: "Expedición Tamul", nota: "Canoa por el cañón hasta la caída de 105 metros y el sótano de los pericos al atardecer" },
        { slug: "paraiso-escalonado-minas-micos", nombre: "Paraíso Escalonado", nota: "Las terrazas de Minas Viejas y las siete caídas de Micos" },
        { slug: "ruta-acuatica-puente-de-dios", nombre: "Ruta Acuática", nota: "La cueva del Puente de Dios y las cascadas de Tamasopo" },
        { slug: "cascadas-del-meco", nombre: "Cascadas del Meco", nota: "Tres caídas de agua, el mirador panorámico y El Gran Salto" },
        { slug: "rappel-tamul", nombre: "Rappel en la Cascada de Tamul", nota: "Descenso con cuerda frente a la caída más alta de México. Pide no tenerle miedo al vacío" },
      ],
    },
    itinerario: [
      { dia: 1, tipo: "tour", titulo: "Llegada + tu primer recorrido", descripcion: "Si llegas en el autobús de la mañana, te entregamos la habitación temprano y salimos ese mismo día: el día 1 ya es día de tour. Cuál de los cuatro va primero lo acomodamos contigo según el clima y la distancia." },
      { dia: 2, tipo: "tour", titulo: "Tu segundo recorrido", descripcion: "Ordenamos los cuatro para que no hagas dos días largos seguidos: Tamul y el rappel son los que más piden madrugar, así que rara vez caen pegados." },
      { dia: 3, tipo: "tour", titulo: "Tu tercer recorrido", descripcion: "Sales del mismo hotel todos los días. No hay maletas que rehacer ni check-outs de por medio." },
      { dia: 4, tipo: "tour", titulo: "Tu cuarto recorrido", descripcion: "El último día de tour lo dejamos del lado de Xilitla siempre que se pueda, para que la vuelta al hotel sea corta." },
      { dia: 5, tipo: "salida", titulo: "Salida", descripcion: "Desayuno, check-out y camino a casa." },
    ],
    incluye: [
      "4 noches en Hotel Paraíso Encantado Xilitla",
      "Desayuno buffet los días de tour",
      "4 recorridos completos, elegidos por ti de una lista de seis",
      "Transporte del hotel al inicio de cada tour y de regreso",
      "Guías certificados NOM-09 SECTUR",
      "Entradas a todas las atracciones",
      "Equipo de seguridad",
      "Seguro de viaje",
      "Fotografía y video de cada recorrido",
    ],
    noIncluye: [
      "Traslado hasta Xilitla (llegas por tu cuenta — consulta la sección 'Cómo llegar')",
      "Rafting en el Río Tampaón y recorridos en RZR: se contratan aparte y te los cotizamos",
      "Comidas y cenas (excepto desayunos)",
      "Suplemento de habitación Jungla con vista a la montaña (+$400/noche)",
      "Propinas y gastos personales",
    ],
    valor: [
      { item: "4 noches hotel (2 pax)", precio: "$11,200" },
      { item: "4 recorridos a elegir (2 pax)", precio: "$12,800" },
      { item: "Transporte 4 días", precio: "$1,600" },
      { item: "Entradas + guías", precio: "$1,600" },
      { item: "Fotografía y video del recorrido", precio: "$1,600" },
    ],
  },
  {
    id: "odisea-huasteca",
    slug: "odisea-huasteca",
    nombre: "Odisea Huasteca",
    subtitulo: "Cinco días de tours sin repetir un solo lugar",
    duracion: "6 días / 5 noches",
    dias: 6,
    noches: 5,
    precio: 20500,
    precioProvisional: true,
    precioLabel: "por pareja",
    badge: "Lo ves todo",
    imagen: "/imagenes/puente-de-dios-tamasopo/hero-new.webp",
    urgencia: "Cinco días de tours y una sola maleta: se duerme siempre en el mismo hotel",
    perfiles: ["Lo ven todo", "Primera vez en la Huasteca", "Sin repetir destino"],
    eleccionTour: {
      dia: 4,
      titulo: "El día 4 lo eliges tú",
      opciones: [
        { slug: "ruta-acuatica-puente-de-dios", nombre: "Ruta Acuática — Puente de Dios", nota: "La cueva natural con el río pasándote por los pies" },
        { slug: "cascadas-del-meco", nombre: "Cascadas del Meco", nota: "Tres caídas de agua y el mirador panorámico" },
      ],
    },
    tours: [
      "Ruta Surrealista — Edward James, Manantiales, Cuevas y Castillo (Día 1)",
      "Expedición Tamul — Tamul, Cueva del Agua y Sótano (Día 2)",
      "Paraíso Escalonado — Minas Viejas & Cascadas de Micos (Día 3)",
      "Ruta Acuática o Cascadas del Meco, a elegir (Día 4)",
      "Travesía del Café — Finca Cafetalera de Xilitla (Día 5)",
    ],
    itinerario: [
      { dia: 1, tipo: "tour", tourSlug: "ruta-surrealista-edward-james", titulo: "Llegada + Las Pozas de Edward James", descripcion: "Arrancamos por lo más cercano al hotel y lo menos exigente: el jardín surrealista, los manantiales de Huichihuayán y la Cueva de las Quilas." },
      { dia: 2, tipo: "tour", tourSlug: "expedicion-tamul", titulo: "Expedición Tamul", descripcion: "El día grande. Canoa por el Cañón del Tampaón hasta la Cascada de Tamul, clavados en la Cueva del Agua y el Sótano de las Huahuas al atardecer, cuando salen los pericos." },
      { dia: 3, tipo: "tour", tourSlug: "paraiso-escalonado-minas-micos", titulo: "Minas Viejas y Cascadas de Micos", descripcion: "Día de agua y descanso después del día más largo: terrazas de travertino en Minas Viejas y las siete caídas de Micos." },
      { dia: 4, tipo: "tour", tourSlug: "ruta-acuatica-puente-de-dios", titulo: "El día que eliges", descripcion: "Puente de Dios, la cueva natural con el río corriendo por dentro, o las Cascadas del Meco con su mirador. Los dos cuestan lo mismo, así que la elección no mueve el precio: elige el que te falte." },
      { dia: 5, tipo: "tour", tourSlug: "travesia-del-cafe", titulo: "Travesía del Café", descripcion: "El cierre tranquilo: una finca cafetalera de la sierra de Xilitla, de la mata a la taza, para bajar el ritmo antes de manejar de vuelta." },
      { dia: 6, tipo: "salida", titulo: "Salida", descripcion: "Desayuno, check-out y camino a casa." },
    ],
    incluye: [
      "5 noches en Hotel Paraíso Encantado Xilitla",
      "Desayuno buffet los días de tour",
      "5 tours completos sin repetir destino",
      "Un día a elegir entre Ruta Acuática y Cascadas del Meco",
      "Transporte del hotel al inicio de cada tour y de regreso",
      "Guías certificados NOM-09 SECTUR",
      "Entradas a todas las atracciones",
      "Equipo de seguridad",
      "Seguro de viaje",
      "Fotografía y video de cada recorrido",
    ],
    noIncluye: [
      "Traslado hasta Xilitla (llegas por tu cuenta — consulta la sección 'Cómo llegar')",
      "Comidas y cenas (excepto desayunos)",
      "Suplemento de habitación Jungla con vista a la montaña (+$400/noche)",
      "Propinas y gastos personales",
    ],
    valor: [
      { item: "5 noches hotel (2 pax)", precio: "$14,000" },
      { item: "Ruta Surrealista (2 pax)", precio: "$2,800" },
      { item: "Expedición Tamul (2 pax)", precio: "$3,100" },
      { item: "Paraíso Escalonado (2 pax)", precio: "$3,200" },
      { item: "Día a elegir (2 pax)", precio: "$3,200" },
      { item: "Travesía del Café (2 pax)", precio: "$1,800" },
      { item: "Transporte 5 días", precio: "$2,000" },
      { item: "Entradas + guías", precio: "$2,000" },
      { item: "Fotografía y video del recorrido", precio: "$1,600" },
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
