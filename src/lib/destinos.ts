import { TOURS_DB, conPrecio } from "./tours";
import { enAuto, enAutobus, horasEnPalabras, MINUTOS_VALLES_XILITLA } from "./tiemposDeViaje";

/**
 * Lo que cobra HOY un recorrido del catálogo, para los destinos cuya "entrada"
 * es el tour mismo (al río Tampaón no se entra suelto: se baja con operadora).
 *
 * 🔴 28 sep 2026 — el rafting tenía tres precios escritos a mano y ninguno era
 * el del checkout: $1,950 en la ficha, $1,850 en inglés (también en su FAQPage
 * y en /en/llms.txt) y un rango inventado de "$1,450–$1,890" en las dos
 * metadescripciones. Ahora sale de `TOURS_DB`, igual que las descripciones de
 * los tours (`conPrecio`).
 *
 * Un slug mal escrito revienta al cargar el módulo, a propósito (mismo criterio
 * que `blogSeo.ts`): mejor un error en `next build` que "undefined MXN".
 */
function precioDeTour(slug: string): number {
  const t = TOURS_DB.find((x) => x.slug === slug);
  if (!t) throw new Error(`destinos: el recorrido "${slug}" no existe en TOURS_DB`);
  return t.precio;
}

/** El tour completo de rafting en el Tampaón (MXN). Lo usa también `i18n/destinos.en.ts`. */
export const PRECIO_TOUR_RAFTING = precioDeTour("rafting-rio-tampaon");

export interface Destino {
  id: string;
  slug: string;
  nombre: string;
  zona: string;
  tipo: string;
  icon: string;
  descripcion: string;
  duracion_hrs: number;
  /** Lo que se le enseña al visitante, con formato y matices ("$220 MXN + $300 panga p/p"). */
  precio_entrada: string;
  /**
   * La MISMA entrada, en pesos y como número. Es la única fuente del precio que
   * se le declara a Google en el JSON-LD (`buildDestinationJsonLd`).
   *
   * 🔴 Existe porque ese precio se sacaba parseando el texto de arriba con un
   * `\d+`: en "$1,950 MXN" la expresión se paraba en la coma de millares y el
   * rafting del río Tampaón le publicaba a Google una entrada de **1 peso**
   * cobrando 1,950. El museo Leonora Carrington se declaraba gratis porque su
   * texto termina en "menores de 12 años gratis".
   *
   * `0` = acceso libre de verdad. Se deja SIN PONER cuando no hay una tarifa por
   * persona clara (cuotas por grupo, rangos, "consultar"): entonces la ficha no
   * publica oferta, que es mejor que publicar un precio inventado.
   */
  precio_entrada_mxn?: number;
  /**
   * Slug del tour de `TOURS_DB` cuando la "entrada" de la ficha ES ese tour y
   * no una taquilla (el rafting). La ficha deja entonces de decir "este es el
   * costo si vienes por tu cuenta; en nuestros tours las entradas ya van
   * incluidas", que bajo "$1,950 MXN (tour completo…)" se contradecía solo.
   */
  entradaEsTour?: string;
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

/**
 * 🔴 Cómo se entra HOY a Las Pozas (portada oficial laspozasxilitla.org.mx,
 * leída el 19 oct 2026): POR AHORA NO HAY VENTA EN LÍNEA. El turno se reserva
 * sin costo en el sistema oficial (hasta 60 días antes) y se paga SOLO en la
 * taquilla de la entrada del jardín, el día de la visita, en efectivo o con
 * tarjeta. La guía es obligatoria. Quien llega tarde pierde el turno.
 *
 * La página «Planea tu visita» del mismo sitio sigue enseñando el esquema de
 * principios de 2026 ($170 en línea / $180 en taquilla): está vieja, y diez
 * artículos del blog la habían copiado. Evidencia en
 * ~/Documents/paraiso-medicion/seo-oct19/evidencia/las-pozas-boletos-19oct.md.
 *
 * Lo usan la ficha del jardín (abajo, y su traducción) y las correcciones del
 * blog (`blogSeo.ts`): si el jardín cambia una tarifa o el horario, se cambia
 * AQUÍ y todo lo demás lo sigue.
 */
export const POZAS_ACCESO = {
  /** El sistema donde se reserva el turno (la portada oficial enlaza aquí). */
  reservaUrl: "https://boletos.laspozasxilitla.org.mx/guest",
  reservaHastaDias: 60,
  /** MXN por adulto. */
  adulto: 180,
  /** MXN: niños de 6 a 12 años y adultos de 65 o más. Los menores de 6 no pagan. */
  reducida: 120,
  /** MXN por persona: guía obligatoria en español / en otro idioma. */
  guiaEspanol: 30,
  guiaOtroIdioma: 60,
  abre: "9:00",
  cierra: "18:00",
  ultimoAcceso: "16:00",
  /** Minutos antes del turno: si llegas tarde, lo pierdes. */
  llegarAntesMin: 10,
} as const;

export const DESTINOS_DB: Destino[] = [
  // ─── DESTINOS ORIGINALES (8) ───────────────────────────────────────────────
  {
    id: "xilitla_pozas", slug: "las-pozas-jardin-surrealista",
    nombre: "Las Pozas (Jardín Surrealista)", zona: "Xilitla", tipo: "Arte & Naturaleza", icon: "Landmark",
    descripcion: "El icónico jardín surrealista de Edward James: esculturas de concreto entre cascadas y selva tropical.",
    duracion_hrs: 2, precio_entrada: "$180 MXN", precio_entrada_mxn: 180, dificultad: "media",
    ideal_para: ["fotografia", "pareja", "solo", "cultura"],
    horario: "09:00–18:00", dias_abierto: "Miércoles a Lunes (cerrado martes)",
    mejor_hora: "09:00–11:00", temporada_ideal: "Nov–Mar",
    // 🔴 Decía «Comprar ticket digital antes»: no hay venta en línea (ver
    // `POZAS_ACCESO`). Sin «efectivo» a propósito: `faqPrecioDestino`
    // (jsonld.ts) lo lee como «solo efectivo», y la taquilla acepta tarjeta.
    advertencias: "Reservar tu turno en línea (se paga en taquilla). Cerrado martes.",
    como_llegar: "1h 30min desde Valles · Taxi $1,200 · Bus $110",
    que_llevar: ["calzado antiderrapante", "repelente biodegradable"],
    datos_curiosos: ["Fue plantación de orquídeas", "Edward James nunca vivió en las estructuras"],
    errores_comunes: ["Llegar sin reservación", "Calzado liso"],
    lat: 21.3973, lng: -98.9964,
    imagen_hero: "/imagenes/las-pozas-jardin-surrealista/hero.jpg",
    imagen_galeria: [
      "/imagenes/las-pozas-jardin-surrealista/gallery-1.jpg",
      "/imagenes/las-pozas-jardin-surrealista/gallery-2.jpg",
      "/imagenes/las-pozas-jardin-surrealista/arcos.jpg",
      "/imagenes/las-pozas-jardin-surrealista/puerta-luna.jpg",
      "/imagenes/las-pozas-jardin-surrealista/gallery-7.jpg",
      "/imagenes/las-pozas-jardin-surrealista/gallery-6.jpg",
      "/imagenes/las-pozas-jardin-surrealista/gallery-8.jpg",
    ],
    seo: {
      // Fase 3 SEO (10 nov 2026): precio, boletos y horario son del artículo
      // de boletos (posición 5.6–7.3) y la visita, de la guía del blog; esta
      // ficha (posición 13) queda como tarjeta práctica: dónde está, cómo
      // llegar y qué tour va, y enlaza a los dos (`GUIAS_BLOG_DESTINO`).
      // Era "Las Pozas de Xilitla 2026 | Horarios, Precio y Cómo Llegar".
      metaTitle: "Las Pozas, Xilitla: ubicación, cómo llegar y tours 2026",
      metaDescription: "Las Pozas, el jardín surrealista de Edward James en Xilitla: cómo llegar desde Ciudad Valles (1 h 30 min), la mejor hora para entrar, qué llevar y tours.",
      keywords: ["las pozas xilitla", "jardín surrealista edward james", "las pozas precio", "las pozas horario", "qué hacer en xilitla"],
      faqPrincipales: [
        // 🔴 19 oct 2026: «Conviene comprar el boleto digital» era el esquema
        // viejo. `blogSeo.ts` pega esta respuesta en «¿Cuánto cuesta la Huasteca?».
        {
          pregunta: "¿Qué días abre Las Pozas y cuánto cuesta?",
          respuesta:
            `Abre de miércoles a lunes de ${POZAS_ACCESO.abre} a ${POZAS_ACCESO.cierra}, con último acceso a las ${POZAS_ACCESO.ultimoAcceso}, y cierra los martes. ` +
            `La entrada cuesta $${POZAS_ACCESO.adulto} MXN por adulto y $${POZAS_ACCESO.reducida} MXN para niños de 6 a 12 años y mayores de 65 (los menores de 6 no pagan), más la guía obligatoria: $${POZAS_ACCESO.guiaEspanol} MXN por persona en español. ` +
            "Por ahora no hay venta en línea: reservas tu turno sin costo en el sistema oficial y pagas en la taquilla del jardín el día de tu visita.",
        },
        { pregunta: "¿Cuánto tiempo se necesita para recorrer Las Pozas?", respuesta: "Unas 4 horas para recorrerlo con calma. La mejor hora para entrar es entre 09:00 y 11:00, cuando hay menos gente y mejor luz para fotos." },
        { pregunta: "¿Cuánto tiempo se necesita para recorrer Las Pozas?", respuesta: "El recorrido guiado oficial dura cerca de hora y media, en grupos de hasta 25 personas. Entra temprano, entre 9:00 y 11:00, para tener menos gente." },
      ],
    },
  },
  {
    id: "cascada_tamul", slug: "cascada-de-tamul",
    nombre: "Cascada de Tamul", zona: "Aquismón", tipo: "Aventura", icon: "Waves",
    descripcion: "La cascada más alta de San Luis Potosí (unos 105 m), a la que se llega remando en canoa por el cañón del río Tampaón.",
    duracion_hrs: 5, precio_entrada: "Canoa ~$2,000 por embarcación (hasta 10 personas) + embarcadero $10–$50 p/p", dificultad: "alta",
    ideal_para: ["aventura", "fotografia", "amigos"],
    horario: "08:00–18:00", dias_abierto: "Lun-Dom",
    mejor_hora: "08:00", temporada_ideal: "Nov–Feb",
    advertencias: "Sal del embarcadero antes de las 11:00: el paseo en canoa dura unas 3 horas. Solo efectivo: no hay cajero en los embarcaderos. Protección Civil cierra el río cuando crece.",
    como_llegar: "~1 h desde Valles → embarcadero La Morena o Tanchachín + canoa a remo",
    que_llevar: ["efectivo (no hay cajero)", "zapatos acuáticos que sujeten el pie", "agua 2 L", "bolsa seca para el celular"],
    datos_curiosos: ["Unos 105 m de caída: el río Gallinas se desploma al cañón del Santa María, que aguas abajo se llama Tampaón", "En secas fuertes (abril–mayo) la cascada puede quedarse casi sin agua: pasó en 2024, 2025 y 2026"],
    errores_comunes: ["Salir del embarcadero después del mediodía", "No llevar efectivo", "Ir en abril o mayo esperando la cascada llena"],
    lat: 21.8014, lng: -99.1794,
    imagen_hero: "/imagenes/cascada-de-tamul/hero.jpg",
    imagen_galeria: [
      "/imagenes/cascada-de-tamul/vista-abajo.jpg",
      "/imagenes/cascada-de-tamul/chica-roca.jpg",
      "/imagenes/cascada-de-tamul/grupo-piedra.jpg",
      "/imagenes/cascada-de-tamul/guerra-agua.jpg",
      "/imagenes/cascada-de-tamul/grupo-cascada.jpg",
      "/imagenes/cascada-de-tamul/cascada-lateral.jpg",
    ],
    seo: {
      // Fase 3 SEO (10 nov 2026): el dueño de «cascada de tamul» es el artículo
      // del blog (28k impresiones contra 907); la ficha se queda con lo
      // práctico: entrada, panga y horario. Enlaza a la guía («Guía a fondo»).
      // Era "Cascada de Tamul 2026 | Precio, Horarios y Cómo Llegar".
      metaTitle: "Cascada de Tamul 2026: precio de la canoa, horario y acceso",
      // ≤155: con 178 el corte de Google se comía "Salidas hasta las 2 PM", el dato
      // que deja sin paseo a quien llega tarde.
      metaDescription: "Cascada de 105 m en Aquismón. La canoa cuesta ~$2,000 por embarcación (hasta 10) o ~$200 c/u si se llena; solo efectivo. Sal antes de las 11:00.",
      keywords: ["cascada de tamul", "tamul precio", "cómo llegar a tamul", "tamul huasteca potosina", "paseo en panga tamul"],
      faqPrincipales: [{"pregunta": "¿Cuánto cuesta ir a la Cascada de Tamul?", "respuesta": "La canoa se cobra por embarcación: unos $2,000 MXN por canoa (caben hasta 10 personas, con chaleco incluido), o unos $200 por persona cuando se completa el grupo. Aparte, el embarcadero cobra de $10 a $50 por persona. Solo efectivo: no hay cajero en el embarcadero."}, {"pregunta": "¿A qué hora hay que llegar a Tamul?", "respuesta": "Los embarcaderos abren hacia las 8:00. Sal antes de las 11:00: el paseo en canoa dura unas 3 horas entre la ida remando, la cascada y el regreso."}, {"pregunta": "¿Qué tan alta es la Cascada de Tamul?", "respuesta": "Unos 105 metros, la más alta de San Luis Potosí. Se ve con agua de noviembre a febrero; en abril y mayo puede quedarse casi seca por el estiaje."}],
    },
  },
  // 🟢 20 nov 2026 (auditoría de Destinos): la Cueva del Agua va incluida en
  // la Expedición Tamul, la mencionan los viajeros y la venden las OTAs, pero no
  // tenía ficha. Se llega solo en canoa, en el mismo paseo a Tamul.
  // 🔴 Coordenadas APROXIMADAS (no hay fuente pública con las exactas): en el
  // cañón, aguas abajo de la cascada. Corregirlas cuando un guía las marque.
  {
    id: "cueva_del_agua", slug: "cueva-del-agua",
    nombre: "Cueva del Agua", zona: "Aquismón", tipo: "Aventura", icon: "Waves",
    descripcion: "Poza de agua azul y fría dentro de una cueva junto al río Tampaón: la parada para nadar y echarse clavados en el paseo en canoa a Tamul.",
    duracion_hrs: 1, precio_entrada: "Incluida en la renta de la canoa a Tamul (sin cobro aparte documentado)", dificultad: "alta",
    ideal_para: ["natacion", "aventura", "amigos", "fotografia"],
    horario: "08:00–18:00", dias_abierto: "Lun-Dom",
    mejor_hora: "Media mañana", temporada_ideal: "Nov–Feb",
    advertencias: "Solo se llega en canoa por el río, en el paseo a Tamul. Se nada con chaleco: es muy profunda y las rocas resbalan. En temporada alta se llena y el agua se enturbia.",
    como_llegar: "~1 h desde Valles → embarcadero La Morena o Tanchachín + canoa a remo",
    que_llevar: ["zapatos acuáticos", "bolsa seca para el celular", "efectivo para la canoa"],
    datos_curiosos: ["Se sube un tramo corto de escalones desde la orilla del río hasta la poza", "Cuando Tamul se queda sin agua en secas, los lancheros ofrecen el paseo solo hasta aquí"],
    errores_comunes: ["Nadar sin chaleco", "Pensar que se llega a pie"],
    lat: 21.8, lng: -99.168,
    imagen_hero: "/imagenes/tours/tamul/cueva-del-agua-poza-azul.jpg",
    imagen_galeria: [
      "/imagenes/tours/tamul/cueva-del-agua-nado.jpg",
      "/imagenes/tours/tamul/cueva-del-agua-clavados.jpg",
      "/imagenes/tours/tamul/cueva-del-agua-nadando.jpg",
      "/imagenes/tours/tamul/puente-colgante-cueva-del-agua.jpg",
    ],
    seo: {
      metaTitle: "Cueva del Agua, Aquismón: cómo llegar y nadar en 2026",
      metaDescription: "Poza azul dentro de una cueva junto al río Tampaón, parada del paseo en canoa a Tamul. Solo se llega por el río; se nada con chaleco. Precios y consejos.",
      keywords: ["cueva del agua", "cueva del agua tamul", "cueva del agua aquismón", "cenote huasteca potosina"],
      faqPrincipales: [],
    },
  },
  {
    id: "sotano_golondrinas", slug: "sotano-de-las-golondrinas",
    nombre: "Sótano de las Golondrinas", zona: "Aquismón", tipo: "Extrema", icon: "Bird",
    // Las aves dan función doble: salen al amanecer y regresan al atardecer
    // (confirmado por Manolo el 10 nov 2026; aquí solo se hablaba del amanecer).
    descripcion: "Abismo kárstico de 376 m de caída libre (hasta 512 m de profundidad). Santuario de vencejos que salen en espiral al amanecer y regresan al atardecer.",
    duracion_hrs: 3, precio_entrada: "$100 MXN", precio_entrada_mxn: 100, dificultad: "alta",
    ideal_para: ["fotografia", "naturaleza", "solo"],
    horario: "05:00–18:00", dias_abierto: "Lunes a Domingo",
    mejor_hora: "05:45 AM", temporada_ideal: "Nov–Mar",
    advertencias: "Más de 500 escalones (las cifras van de 526 a 686): bajar es fácil, subir toma unos 40 min. Prohibidos los drones y las luces hacia el fondo; silencio durante la salida de las aves. Solo efectivo.",
    como_llegar: "~1h 30min desde Valles por la sierra (vía Aquismón y Tamapatz)",
    que_llevar: ["chamarra", "lámpara (sin apuntar al fondo)", "tenis con buen agarre", "efectivo (no hay cajero en la sierra)"],
    datos_curiosos: ["Las aves son vencejos de collar blanco y pericos verdes, no golondrinas", "Es Monumento Natural estatal y lo administra la comunidad de Unión de Guadalupe"],
    errores_comunes: ["Llegar a las 9 AM cuando aves ya salieron"],
    lat: 21.6001, lng: -99.0989,
    imagen_hero: "/imagenes/sotano-de-las-golondrinas/hero.jpg",
    imagen_galeria: [
      "/imagenes/sotano-de-las-golondrinas/gallery-1.avif",
      "/imagenes/sotano-de-las-golondrinas/aerea.jpg",
      "/imagenes/sotano-de-las-golondrinas/rappel.jpg",
      "/imagenes/sotano-de-las-golondrinas/interior.jpg",
      "/imagenes/sotano-de-las-golondrinas/aves-cielo.jpg",
    ],
    seo: {
      metaTitle: "Sótano de las Golondrinas 2026 | Horario del Vuelo y Precio",
      metaDescription: "Abismo de 376 m de caída libre (hasta 512 m de fondo) en Aquismón. Entrada $100 MXN. Los vencejos salen al amanecer (llega 5:45 AM) y vuelven al atardecer.",
      keywords: ["sótano de las golondrinas", "golondrinas horario", "sótano de las golondrinas precio", "vuelo de las aves aquismón", "qué hora ver las golondrinas"],
      faqPrincipales: [{"pregunta": "¿A qué hora salen las aves del Sótano de las Golondrinas?", "respuesta": "Hay dos momentos: al amanecer salen en espiral (más o menos de 6:00 a 8:30, más tarde si hay niebla) y al atardecer regresan al sótano. Para ver la salida hay que estar en el borde antes de las 6:00: si llegas a las 9:00, las aves ya salieron."}, {"pregunta": "¿Qué tan profundo es el Sótano de las Golondrinas?", "respuesta": "Tiene 376 metros de caída libre y unos 512 metros de profundidad total; la boca mide unos 60 metros de ancho."}, {"pregunta": "¿Qué tan pesada es la bajada?", "respuesta": "Son más de 500 escalones hasta el borde. Bajar es fácil; la subida de regreso toma unos 40 minutos. Lleva tenis, chamarra y lámpara para la hora del amanecer."}],
    },
  },
  {
    id: "cascada_micos", slug: "cascadas-de-micos",
    nombre: "Cascadas de Micos", zona: "Ciudad Valles", tipo: "Aventura", icon: "Droplets",
    descripcion: "Serie de 7 cascadas con circuito de saltos, tirolesa, kayak y skybike.",
    duracion_hrs: 4, precio_entrada: "$100 MXN", precio_entrada_mxn: 100, dificultad: "media",
    ideal_para: ["amigos", "aventura"],
    horario: "07:00–19:00", dias_abierto: "Lunes a Domingo",
    mejor_hora: "09:00 AM", temporada_ideal: "Todo el año",
    advertencias: "Los 7 saltos (de 2 a 8 m) se hacen solo con guía, chaleco y casco, y desde 6 años; una vez que empiezas, se sale por las cascadas. Chaleco obligatorio en el agua. Protección Civil cierra el paraje cuando el río crece.",
    como_llegar: "30 min desde Valles · ~24 km por la carretera a El Naranjo (ejido Los Platanitos)",
    que_llevar: ["aqua shoes", "ropa dry-fit"],
    datos_curiosos: ["El río más versátil de la zona"],
    errores_comunes: ["No ajustar bien el chaleco"],
    lat: 22.1036, lng: -99.156,
    imagen_hero: "/imagenes/cascadas-de-micos/hero.jpg",
    imagen_galeria: [
      "/imagenes/cascadas-de-micos/gallery-1.jpg",
      "/imagenes/cascadas-de-micos/gallery-2.jpg",
      "/imagenes/cascadas-de-micos/gallery-3.jpg",
      "/imagenes/cascadas-de-micos/gallery-4.jpg",
      "/imagenes/cascadas-de-micos/gallery-5.jpg",
    ],
    seo: {
      // Fase 3 SEO (10 nov 2026): el dueño de «cascadas de micos» es el
      // artículo del blog (guía de saltos); la ficha se queda con entrada y
      // horario, y enlaza a la guía («Guía a fondo»).
      // Era "Cascadas de Micos 2026 | Precio, Saltos y Cómo Llegar".
      metaTitle: "Cascadas de Micos: precio de entrada y horario 2026",
      metaDescription: "Siete cascadas con saltos, tirolesa, kayak y skybike a 30 min de Ciudad Valles. Entrada ~$100 MXN con chaleco y estacionamiento; abre diario de 7:00 a 19:00.",
      keywords: ["cascadas de micos", "micos precio", "saltos en micos", "cascadas de micos ciudad valles", "qué hacer en ciudad valles"],
      faqPrincipales: [
        { pregunta: "¿Cuánto cuesta entrar a las Cascadas de Micos?", respuesta: "La entrada cuesta unos $100 MXN e incluye chaleco y estacionamiento; abre todos los días de 7:00 a 19:00. El circuito de saltos con guía y las demás actividades (tirolesa, kayak, skybike) se pagan aparte." },
        { pregunta: "¿Son seguros los saltos de Micos?", respuesta: "Se hacen solo con guía, chaleco y casco, y desde los 6 años. Son 7 saltos de 2 a 8 metros; una vez que empiezas, solo se sale por las cascadas, así que hay que saber nadar." },
        { pregunta: "¿Cómo llegar a Micos desde Ciudad Valles?", respuesta: "Son unos 24 km por la carretera a El Naranjo, cerca de 30 minutos en auto. No hay una ruta de transporte directa confirmada: los colectivos van hacia El Platanito." },
      ],
    },
  },
  {
    id: "cascada_puente_dios", slug: "puente-de-dios-tamasopo",
    nombre: "Puente de Dios (Tamasopo)", zona: "Tamasopo", tipo: "Naturaleza", icon: "MountainSnow",
    descripcion: "Poza azul cobalto bajo puente natural. La luz entra a la cueva entre 11:00–13:00.",
    duracion_hrs: 3.5, precio_entrada: "$150 MXN", precio_entrada_mxn: 150, dificultad: "media",
    ideal_para: ["pareja", "fotografia"],
    horario: "08:00–18:00", dias_abierto: "Lunes a Domingo",
    mejor_hora: "11:00–13:00", temporada_ideal: "Nov–Abr",
    advertencias: "Unos 300 escalones de bajada. Chaleco obligatorio para entrar al agua; a la cueva se cruza la corriente sujetándose de cuerdas, y con el río crecido no se entra. No se recomienda para menores de 5 años ni para quien no sabe nadar.",
    como_llegar: "1h desde Valles por autopista a SLP",
    que_llevar: ["aqua shoes OBLIGATORIOS", "chaleco"],
    datos_curiosos: ["Efecto de luz en la cueva único en México"],
    errores_comunes: ["No usar aqua shoes (piedras MUY resbalosas)"],
    lat: 21.9214, lng: -99.4217,
    imagen_hero: "/imagenes/puente-de-dios-tamasopo/hero.jpg",
    imagen_galeria: [
      "/imagenes/puente-de-dios-tamasopo/gallery-1.jpg",
      "/imagenes/puente-de-dios-tamasopo/gallery-2.jpg",
      "/imagenes/puente-de-dios-tamasopo/gallery-9.jpg",
      "/imagenes/puente-de-dios-tamasopo/gallery-10.jpg",
      "/imagenes/puente-de-dios-tamasopo/gallery-11.jpg",
      "/imagenes/puente-de-dios-tamasopo/gallery-12.jpg",
      "/imagenes/puente-de-dios-tamasopo/gallery-13.jpg",
      "/imagenes/puente-de-dios-tamasopo/gallery-14.jpg",
      "/imagenes/puente-de-dios-tamasopo/gallery-15.jpg",
    ],
    seo: {
      // ≤60: con 72 el "$150" caía justo donde Google corta el título.
      metaTitle: "Puente de Dios Tamasopo 2026 | Precio $150 MXN y Horarios",
      metaDescription: "Visita la poza azul cobalto del Puente de Dios en Tamasopo, SLP. El sol entra por el arco natural entre 11–13h. Entrada $150 MXN, 1h desde Ciudad Valles.",
      keywords: ["puente de dios tamasopo", "poza azul tamasopo", "tamasopo san luis potosi", "puente natural huasteca potosina", "como llegar puente de dios desde ciudad valles"],
      faqPrincipales: [
        { pregunta: "¿A qué hora entra la luz solar al Puente de Dios?", respuesta: "El efecto de luz azul cobalto ocurre entre las 11:00 y las 13:00 horas, cuando el sol entra perpendicular al arco natural. Fuera de ese horario la poza sigue siendo hermosa pero sin el efecto de luz." },
        { pregunta: "¿Cuánto cuesta la entrada al Puente de Dios Tamasopo?", respuesta: "La entrada al Puente de Dios cuesta $150 MXN por persona (2026). Solo se acepta efectivo. Se recomienda llevar cambio." },
        { pregunta: "¿Cómo llegar al Puente de Dios desde Ciudad Valles?", respuesta: "Toma la autopista Ciudad Valles–San Luis Potosí por aproximadamente 1 hora. El desvío a Tamasopo está bien señalizado. El acceso al parque es por terracería corta desde el pueblo." },
      ],
    },
  },
  {
    id: "tamtoc", slug: "zona-arqueologica-tamtoc",
    nombre: "Zona Arqueológica Tamtoc", zona: "Tamuín", tipo: "Arqueología", icon: "BookOpen",
    descripcion: "El asentamiento prehispánico más importante de la cultura Huasteca.",
    duracion_hrs: 3, precio_entrada: "Nacionales $80 · extranjeros $145 · domingo gratis para nacionales con identificación", dificultad: "baja",
    ideal_para: ["historia", "cultura", "familia"],
    horario: "09:00–18:00", dias_abierto: "Solo domingos",
    mejor_hora: "09:00 AM", temporada_ideal: "Dic–Feb",
    advertencias: "Confirma los días con el Centro INAH SLP (444 813 4831): la ficha oficial del INAH (ene 2026) dice que por ahora solo abre los domingos, de 9:00 a 18:00, aunque en 2025 se anunció apertura diaria. INAPAM, menores de 13 y estudiantes no pagan. Poca sombra; puede superar 45°C en mayo.",
    como_llegar: "55 min desde Valles · ~52 km por la carretera 70 rumbo a Tamuín",
    que_llevar: ["sombrero", "agua abundante", "protector solar"],
    datos_curiosos: ["Monumento 32 pesa 30 toneladas"],
    errores_comunes: ["No llevar agua", "Ir sin guía"],
    lat: 21.9242, lng: -98.8143,
    imagen_hero: "/imagenes/zona-arqueologica-tamtoc/hero.jpg",
    imagen_galeria: [
      "/imagenes/zona-arqueologica-tamtoc/gallery-1.jpg",
      "/imagenes/zona-arqueologica-tamtoc/gallery-2.jpg",
    ],
    seo: {
      metaTitle: "Zona Arqueológica Tamtoc 2026 | Solo Domingos y Cómo Llegar",
      metaDescription: "Tamtoc, el sitio más importante de la cultura huasteca, a 55 min de Ciudad Valles. Nacionales $80, extranjeros $145; confirma días: el INAH dice solo domingos.",
      keywords: ["zona arqueologica tamtoc", "tamtoc tamuín san luis potosi", "cultura huasteca arqueologia", "que visitar en tamuín", "monumentos huastecos mexico"],
      faqPrincipales: [
        { pregunta: "¿Qué es el Monumento 32 de Tamtoc?", respuesta: "El Monumento 32 es una figura femenina de 30 toneladas tallada en piedra, considerada la representación más importante de la cultura Huasteca. Mide más de 4 metros de altura y ha permanecido en el mismo punto desde hace siglos." },
        { pregunta: "¿Cuándo abre la Zona Arqueológica Tamtoc?", respuesta: "La ficha oficial del INAH (enero de 2026) dice que por ahora solo abre los domingos, de 9:00 a 18:00, con último acceso a las 17:00. La entrada es $80 para nacionales (gratis en domingo con identificación) y $145 para extranjeros. Confirma con el Centro INAH San Luis Potosí (444 813 4831) antes de viajar." },
        { pregunta: "¿Cuánto tiempo se necesita para recorrer Tamtoc?", respuesta: "El recorrido completo toma entre 2.5 y 3 horas. Se recomienda llegar a las 9 AM antes de que el sol esté en su punto más alto, ya que hay poca sombra y en verano las temperaturas superan los 40°C." },
      ],
    },
  },
  {
    id: "cascada_tamasopo", slug: "cascadas-de-tamasopo",
    nombre: "Cascadas de Tamasopo", zona: "Tamasopo", tipo: "Naturaleza", icon: "Droplet",
    descripcion: "Paraíso de agua azul turquesa con pozas para nadar, ideal para familias.",
    duracion_hrs: 4, precio_entrada: "$200 MXN", precio_entrada_mxn: 200, dificultad: "baja",
    ideal_para: ["familia", "relajacion", "fotografia"],
    horario: "08:00–18:00", dias_abierto: "Lunes a Domingo",
    mejor_hora: "10:00–14:00", temporada_ideal: "Nov–May",
    advertencias: "Último acceso por la tarde (15:00 según el sistema de reservas oficial) y sin reingreso. No se entra con comida, bebida, hieleras ni chaleco propio: el chaleco se renta ($15 la hora o $60 el día). Estacionamiento $100. No hay cajero.",
    como_llegar: "~1 h desde Valles · Fed. 70 → Tamasopo → km 2 de la carretera a Agua Buena",
    que_llevar: ["traje de baño", "bloqueador biodegradable"],
    datos_curiosos: ["Las pozas cambian de color según la estación"],
    errores_comunes: ["Usar bloqueador químico"],
    lat: 21.92, lng: -99.39,
    imagen_hero: "/imagenes/cascadas-de-tamasopo/hero.jpg",
    imagen_galeria: [
      "/imagenes/cascadas-de-tamasopo/gallery-1.jpg",
      "/imagenes/cascadas-de-tamasopo/gallery-2.webp",
      "/imagenes/cascadas-de-tamasopo/gallery-13.jpg",
      "/imagenes/cascadas-de-tamasopo/gallery-14.jpg",
      "/imagenes/cascadas-de-tamasopo/gallery-15.jpg",
    ],
    seo: {
      metaTitle: "Cascadas de Tamasopo 2026 | Precio, Horarios y Pozas",
      metaDescription: "Pozas turquesa para nadar en familia en Tamasopo. Entrada $200 MXN desde marzo 2026 (INAPAM $150) + estacionamiento $100; chaleco se renta ahí. A 1 h de Valles.",
      keywords: ["cascadas de tamasopo", "tamasopo precio", "cascadas de tamasopo horario", "qué hacer en tamasopo", "pozas para nadar huasteca potosina"],
      faqPrincipales: [
        { pregunta: "¿Cuánto cuesta la entrada a las Cascadas de Tamasopo?", respuesta: "$200 MXN por persona desde el 1 de marzo de 2026; INAPAM $150 y menores de 3 años gratis. Aparte: $100 de estacionamiento y la renta del chaleco ($15 la hora o $60 el día)." },
        { pregunta: "¿Se puede nadar en las Cascadas de Tamasopo?", respuesta: "Sí, con chaleco (se renta en la entrada; no dejan pasar el propio). «La Playita» tiene un frente poco profundo para niños; la Poza del mecate pasa de 8 m de fondo." },
        { pregunta: "¿Puedo llevar comida a las Cascadas de Tamasopo?", respuesta: "No: el parque no deja entrar con comida, bebida ni hieleras. Adentro hay restaurantes y tienda." },
      ],
    },
  },

  {
    id: "siete-cascadas-tamasopo", slug: "siete-cascadas-tamasopo",
    nombre: "Siete Cascadas de Tamasopo", zona: "Tamasopo", tipo: "Naturaleza & Aventura", icon: "Droplets",
    descripcion: "Escalera natural de siete cascadas turquesas en secuencia, donde se salta de poza en poza con chaleco, casco y guía. Hay saltos para todos los niveles — y quien no quiere saltar disfruta nadando en las pozas cristalinas.",
    duracion_hrs: 3, precio_entrada: "Se visita con guía y equipo (chaleco/casco) — consultar tarifa", dificultad: "media",
    ideal_para: ["aventura", "natacion", "familia", "fotografia"],
    horario: "Visita de día con guía", dias_abierto: "Lunes a Domingo",
    mejor_hora: "Media mañana", temporada_ideal: "Todo el año; mayor caudal en temporada de lluvias",
    advertencias: "Los saltos se hacen SIEMPRE con chaleco, casco y guía. Rocas resbalosas: calzado acuático obligatorio. Quien no quiera saltar puede disfrutar nadando. Coordenadas aproximadas — verificar GPS antes de ir.",
    como_llegar: "En Tamasopo, junto a la ruta del Puente de Dios (~1 h de Ciudad Valles por la autopista a San Luis Potosí)",
    que_llevar: ["calzado acuático (obligatorio)", "traje de baño", "cambio de ropa seca", "efectivo", "bloqueador biodegradable"],
    datos_curiosos: ["Son siete caídas en secuencia que se recorren saltando de poza en poza.", "Suele combinarse con el Puente de Dios y la Hacienda Los Gómez en la Ruta Acuática de Tamasopo."],
    errores_comunes: ["Intentar los saltos sin guía o sin equipo", "Ir con calzado liso"],
    lat: 21.93, lng: -99.40,
    imagen_hero: "/imagenes/siete-cascadas-tamasopo/hero.jpg",
    imagen_galeria: [
      "/imagenes/siete-cascadas-tamasopo/gallery-1.jpg",
      "/imagenes/siete-cascadas-tamasopo/gallery-2.jpg",
      "/imagenes/siete-cascadas-tamasopo/gallery-3.jpg",
      "/imagenes/siete-cascadas-tamasopo/gallery-4.jpg",
      "/imagenes/siete-cascadas-tamasopo/gallery-5.jpg",
    ],
    seo: {
      metaTitle: "Siete Cascadas de Tamasopo 2026 | Saltos y Pozas Turquesa",
      metaDescription: "Siete cascadas turquesas en escalera en Tamasopo: saltas de poza en poza con chaleco, casco y guía. Saltos para todos los niveles y pozas claras para nadar.",
      keywords: ["siete cascadas tamasopo", "7 cascadas tamasopo", "saltos en tamasopo", "que hacer en tamasopo", "ruta acuática huasteca potosina"],
      faqPrincipales: [
        { pregunta: "¿Qué son las Siete Cascadas de Tamasopo?", respuesta: "Una escalera natural de siete cascadas turquesas en secuencia, donde se salta de poza en poza con chaleco, casco y guía. Hay saltos para todos los niveles y pozas cristalinas para quienes prefieren solo nadar." },
        { pregunta: "¿Es obligatorio saltar?", respuesta: "No. Los saltos son opcionales y siempre se hacen con equipo (chaleco y casco) y guía; quien no quiere saltar puede disfrutar nadando y caminando entre las pozas." },
      ],
    },
  },

  {
    id: "hacienda-los-gomez-tamasopo", slug: "hacienda-los-gomez-tamasopo",
    nombre: "Hacienda Los Gómez", zona: "Tamasopo", tipo: "Naturaleza", icon: "Trees",
    descripcion: "Paraje natural de Tamasopo a orillas del río, con pequeñas cascadas, pozas de agua turquesa y grandes sabinos que dan sombra; un rincón tranquilo para nadar y descansar, parte de la Ruta Acuática del Puente de Dios.",
    duracion_hrs: 2, precio_entrada: "Consultar acceso localmente", dificultad: "baja",
    ideal_para: ["natacion", "relajacion", "familia", "fotografia"],
    horario: "Visita de día", dias_abierto: "Consultar localmente",
    mejor_hora: "Tarde (luz dorada entre los árboles)", temporada_ideal: "Todo el año; mayor caudal en temporada de lluvias",
    advertencias: "Es un paraje natural con infraestructura sencilla; los datos de acceso y tarifa se confirman localmente. Rocas resbalosas cerca del agua. Coordenadas aproximadas — verificar GPS antes de ir.",
    como_llegar: "En Tamasopo, dentro de la Ruta Acuática del Puente de Dios (~1 h de Ciudad Valles por la autopista a San Luis Potosí)",
    que_llevar: ["traje de baño", "calzado acuático", "toalla", "efectivo", "bloqueador biodegradable"],
    datos_curiosos: ["Grandes sabinos (ahuehuetes) dan sombra a las pozas y crecen dentro del agua.", "Suele visitarse junto al Puente de Dios y las Siete Cascadas en la Ruta Acuática de Tamasopo."],
    errores_comunes: ["Ir sin confirmar acceso y horario localmente", "Olvidar el calzado acuático"],
    lat: 21.93, lng: -99.40,
    imagen_hero: "/imagenes/hacienda-los-gomez-tamasopo/hero.jpg",
    imagen_galeria: [
      "/imagenes/hacienda-los-gomez-tamasopo/gallery-1.jpg",
      "/imagenes/hacienda-los-gomez-tamasopo/gallery-2.jpg",
      "/imagenes/hacienda-los-gomez-tamasopo/gallery-3.jpg",
    ],
    seo: {
      metaTitle: "Hacienda Los Gómez Tamasopo 2026 | Cascadas y Pozas Turquesa",
      metaDescription: "Paraje en Tamasopo con pequeñas cascadas, pozas de agua turquesa y grandes sabinos, parte de la Ruta Acuática del Puente de Dios. Qué es y cómo visitarlo.",
      keywords: ["hacienda los gómez", "hacienda los gomez tamasopo", "ruta acuática tamasopo", "pozas turquesa tamasopo", "que hacer en tamasopo"],
      faqPrincipales: [
        { pregunta: "¿Qué es Hacienda Los Gómez?", respuesta: "Un paraje natural a orillas del río en Tamasopo, con pequeñas cascadas, pozas de agua turquesa y grandes sabinos de sombra, ideal para nadar y descansar." },
        { pregunta: "¿Dónde está y cómo se visita?", respuesta: "Está en Tamasopo, dentro de la Ruta Acuática del Puente de Dios (~1 h de Ciudad Valles). Suele visitarse en el mismo recorrido que el Puente de Dios y las Siete Cascadas." },
      ],
    },
  },
  {
    id: "balneario_taninul", slug: "balneario-taninul",
    nombre: "Balneario Taninul", zona: "Ciudad Valles", tipo: "Naturaleza", icon: "Thermometer",
    // 38 °C: lo confirmó Manolo el 10 nov 2026. Aquí decía 36 y la narrativa,
    // 38. Ficha congelada: de ella solo se cambió ese número.
    descripcion: "Aguas termales sulfurosas (38°C constante) y lodo terapéutico.",
    duracion_hrs: 4, precio_entrada: "$150 MXN", precio_entrada_mxn: 150, dificultad: "baja",
    ideal_para: ["familia", "pareja", "relajacion"],
    horario: "07:00–20:00", dias_abierto: "Lunes a Domingo",
    mejor_hora: "08:00 o 18:00", temporada_ideal: "Dic–Ene",
    advertencias: "NO llevar joyería de plata (azufre la oscurece).",
    como_llegar: "25 min desde Valles por la carretera 70 rumbo a Tamuín",
    que_llevar: ["traje de baño", "sandalias", "toalla"],
    datos_curiosos: ["Agua mantiene 38°C constante todo el año"],
    errores_comunes: ["Llevar joyería de plata"],
    lat: 21.9452, lng: -98.8895,
    imagen_hero: "/imagenes/balneario-taninul/hero.webp",
    imagen_galeria: [],
    seo: {
      metaTitle: "Balneario Taninul, Ciudad Valles: aguas termales 2026",
      metaDescription: "Aguas termales sulfurosas y lodo terapéutico en el Hotel Spa Taninul, a unos 25 minutos de Ciudad Valles. Pase de día, horario y qué llevar: confírmalos antes.",
      keywords: ["balneario taninul", "aguas termales ciudad valles", "taninul san luis potosi", "balneario sulfuroso huasteca", "termas ciudad valles 2026"],
      faqPrincipales: [
        { pregunta: "¿A qué temperatura están las aguas de Taninul?", respuesta: "Las aguas termales del Balneario Taninul mantienen una temperatura constante de 38°C todo el año, gracias a su origen sulfuroso natural. Es ideal para relajación muscular y tratamientos de lodo terapéutico." },
        { pregunta: "¿Por qué no se puede llevar joyería de plata a Taninul?", respuesta: "El agua de Taninul contiene azufre natural que reacciona con la plata y la oscurece de forma permanente en minutos. Se recomienda dejar cualquier joya de plata en el hotel antes de visitar." },
        { pregunta: "¿Cómo llegar al Balneario Taninul desde Ciudad Valles?", respuesta: "Está a unos 25 minutos de Ciudad Valles por la carretera 70 rumbo a Tamuín; el acceso está señalizado. También se llega en taxi desde el centro de Valles." },
      ],
    },
  },

  // ─── NUEVOS DESTINOS — TANDA 1 (8 sin Tambaque) ────────────────────────────

  {
    id: "cascadas-minas-viejas",
    slug: "cascadas-minas-viejas",
    nombre: "Cascadas de Minas Viejas",
    zona: "El Naranjo",
    tipo: "Aventura",
    icon: "Waves",
    descripcion: "Dos caídas gemelas de 50 m con pozas color turquesa rodeadas de selva preservada.",
    duracion_hrs: 4,
    precio_entrada: "$100 MXN (niños e INAPAM $50; incluye chaleco)",
    precio_entrada_mxn: 100,
    dificultad: "media",
    ideal_para: ["natacion", "aventura", "familia", "fotografia"],
    horario: "08:00–18:00",
    dias_abierto: "Lunes a Domingo",
    mejor_hora: "08:00–10:00",
    temporada_ideal: "Oct–May",
    advertencias: "Unos 200 escalones con barandal para bajar a la poza. Chaleco obligatorio en las pozas y nado solo donde indican los salvavidas. Estacionamiento aparte (~$50). En lluvias el agua se pone café y Protección Civil puede cerrar.",
    como_llegar: "~1h 45min desde Valles · ~70 km por La Hincada hacia El Naranjo, desvío a Minas Viejas",
    que_llevar: ["calzado acuático o tenis que puedan mojarse", "bloqueador solar biodegradable (obligatorio)", "cambio de ropa seca", "efectivo (sin cajero en la zona)", "repelente natural"],
    datos_curiosos: [
      "Consideradas de las cascadas con el agua más azul de toda la región por alta concentración de minerales kársticos.",
      "El nombre viene de una antigua explotación minera del siglo XIX en el ejido.",
    ],
    errores_comunes: ["Llegar sin efectivo", "Ir en temporada de lluvias sin verificar acceso"],
    lat: 22.3758,
    lng: -99.3178,
    imagen_hero: "/imagenes/cascadas-minas-viejas/hero.jpg",
    imagen_galeria: [
      "/imagenes/cascadas-minas-viejas/gallery-1.jpg",
      "/imagenes/cascadas-minas-viejas/gallery-2.jpg",
      "/imagenes/cascadas-minas-viejas/gallery-3.jpg",
      "/imagenes/cascadas-minas-viejas/gallery-4.jpg",
      "/imagenes/cascadas-minas-viejas/gallery-5.jpg",
      "/imagenes/cascadas-minas-viejas/gallery-6.jpg",
    ],
    seo: {
      // Fase 3 SEO (10 nov 2026): la ficha es la DUEÑA de «minas viejas»; el
      // artículo del blog se queda con la experiencia (pozas, rappel). La meta
      // vieja era genérica («¡Planea ya!»): ahora lleva los datos de la ficha.
      // Era "Guía Cascadas Minas Viejas 2026 | El Naranjo SLP".
      metaTitle: "Cascadas de Minas Viejas 2026: precio, horario y cómo llegar",
      metaDescription: "Minas Viejas, El Naranjo: dos caídas de 50 m sobre una poza azul. Entrada $100 MXN (niños e INAPAM $50) con chaleco; de 8:00 a 18:00, a 1 h 45 min de Valles.",
      keywords: ["minas viejas cascadas", "el naranjo san luis potosi", "cascadas huasteca potosina", "minas viejas 2026", "pozas turquesa slp"],
      faqPrincipales: [
        { pregunta: "¿Cuánto cuesta la entrada a Minas Viejas en 2026?", respuesta: "$100 MXN por adulto y $50 para niños y adultos mayores con INAPAM; incluye chaleco y sanitarios. El estacionamiento se paga aparte (unos $50)." },
        { pregunta: "¿Se puede nadar en las Cascadas de Minas Viejas?", respuesta: "Sí, con chaleco, en la poza principal y en las de abajo, donde indiquen los salvavidas. El agua está fría (unos 21 °C)." },
        { pregunta: "¿Cómo llegar a Minas Viejas desde Ciudad Valles?", respuesta: "Son unos 70 km por La Hincada hacia El Naranjo, cerca de 1 h 45 min en auto. Desde el pueblo de El Naranjo son unos 20 km." },
      ],
    },
  },

  {
    id: "laguna-media-luna",
    slug: "laguna-media-luna",
    nombre: "Manantial de la Media Luna",
    zona: "Rioverde",
    tipo: "Bienestar",
    icon: "Droplet",
    descripcion: "Manantial de agua tibia (27–30 °C) y cristalina, de un azul intenso: uno de los mejores lugares de México para bucear y hacer snorkel en agua dulce.",
    duracion_hrs: 6,
    precio_entrada: "$150 MXN (niños de 3 a 9 y adultos mayores $80) + chaleco obligatorio $50–80 + estacionamiento $50",
    precio_entrada_mxn: 150,
    dificultad: "baja",
    ideal_para: ["buceo", "snorkel", "fotografia", "pareja"],
    horario: "08:00–18:00",
    dias_abierto: "Lunes a Domingo",
    mejor_hora: "09:00–11:00",
    temporada_ideal: "Todo el año",
    advertencias: "Chaleco obligatorio para todos los que no buceen (se renta en el lugar). No tocar el fondo para no levantar sedimento. Prohibido el bloqueador no biodegradable. Solo efectivo.",
    como_llegar: "120 min desde Valles · Carretera 70 poniente hasta Rioverde → señales al Ejido El Jabalí",
    que_llevar: ["equipo de snorkel (o rentar en sitio)", "traje de baño", "toalla", "googles de natación", "efectivo"],
    datos_curiosos: [
      "El nombre 'Media Luna' viene de la forma semicircular perfecta del espejo de agua.",
      "Es uno de los pocos lugares de México donde puedes hacer tu primera inmersión de buceo en agua dulce cristalina.",
    ],
    errores_comunes: ["No reservar en temporada alta (cupo limitado)", "Llevar bloqueador químico"],
    lat: 21.8605,
    lng: -100.0278,
    imagen_hero: "/imagenes/laguna-media-luna/hero.jpg",
    imagen_galeria: [
      "/imagenes/laguna-media-luna/gallery-1.avif",
      "/imagenes/laguna-media-luna/gallery-2.webp",
    ],
    seo: {
      metaTitle: "Laguna Media Luna Rioverde 2026 | Guía de Viaje",
      metaDescription: "Manantial de agua tibia (27–30 °C) y cristalina en Rioverde para snorkel y buceo. Entrada $150 MXN + chaleco obligatorio y estacionamiento; solo efectivo.",
      keywords: ["laguna media luna rioverde", "manantial san luis potosi", "buceo media luna", "que hacer en rioverde", "media luna 2026"],
      faqPrincipales: [
        { pregunta: "¿El agua de la Media Luna es fría o templada?", respuesta: "Es tibia: de 27 a 30 °C todo el año. Se puede nadar y hacer snorkel cómodamente sin traje de neopreno." },
        { pregunta: "¿Es necesario saber bucear para disfrutar la Media Luna?", respuesta: "No, puedes practicar snorkel o nadar con googles y ver el fondo cristalino desde la superficie." },
        { pregunta: "¿Hay límite de personas en la Media Luna?", respuesta: "Sí: en Semana Santa y puentes cierran el acceso cuando se llena el cupo. Llega antes de las 9:00." },
      ],
    },
  },

  {
    id: "cascada-el-aguacate",
    slug: "cascada-el-aguacate",
    nombre: "Cascada El Aguacate",
    zona: "Tamasopo",
    tipo: "Aventura",
    icon: "Leaf",
    descripcion: "Caída de ~75 m entre cañones de selva densa — la segunda cascada más alta de la Huasteca y uno de los secretos mejor guardados de Tamasopo.",
    duracion_hrs: 3,
    precio_entrada: "$90 MXN",
    precio_entrada_mxn: 90,
    dificultad: "alta",
    ideal_para: ["senderismo", "fotografia", "naturaleza", "aventura"],
    horario: "09:00–17:00",
    dias_abierto: "Lunes a Domingo",
    mejor_hora: "15:00–16:30",
    temporada_ideal: "Dic–Abr",
    advertencias: "Se bajan más de 170 escalones (menos de 10 min; unos 20 de subida). Bajo la caída no se nada: solo en la poza de río arriba y con chaleco. Sin señal de celular. Coordenadas aproximadas: verifica el GPS antes de ir.",
    como_llegar: "~1h 30min desde Valles · ~25 km al norte de Tamasopo; los últimos 5 km son de terracería",
    que_llevar: ["calzado de montaña con suela de agarre (obligatorio)", "bastones de trekking (recomendado)", "agua suficiente para 4 horas", "repelente natural", "bloqueador biodegradable"],
    datos_curiosos: [
      "Es la segunda cascada más alta de la Huasteca (~75 m), solo después de Tamul, y de las menos documentadas de Tamasopo.",
      "Los guías locales la llaman 'la cascada que los turistas aún no descubrieron'.",
    ],
    errores_comunes: ["Nadar bajo la caída", "Ir con calzado liso"],
    lat: 22.13,
    lng: -99.31,
    imagen_hero: "/imagenes/cascada-el-aguacate/hero.jpg",
    imagen_galeria: [
      "/imagenes/cascada-el-aguacate/gallery-1.webp",
      "/imagenes/cascada-el-aguacate/gallery-2.jpg",
    ],
    seo: {
      metaTitle: "Cascada El Aguacate Tamasopo 2026 | Guía Huasteca",
      metaDescription: "Cascada El Aguacate, Tamasopo: ~75 m de caída y una poza para nadar con chaleco. Entrada $90 MXN; se bajan 170+ escalones. A ~1 h 30 min de Ciudad Valles.",
      keywords: ["cascada el aguacate tamasopo", "cascadas secretas huasteca potosina", "senderismo tamasopo", "cascadas slp 2026", "turismo aventura san luis potosi"],
      faqPrincipales: [
        { pregunta: "¿Es difícil llegar a la Cascada El Aguacate?", respuesta: "Se bajan más de 170 escalones en menos de 10 minutos; la subida toma unos 20. Está unos 25 km al norte de Tamasopo y los últimos 5 km son de terracería. El guía no es obligatorio." },
        { pregunta: "¿Hay baños en la Cascada El Aguacate?", respuesta: "Las instalaciones son mínimas. Hay baños básicos en la comunidad ejidal a la entrada." },
        { pregunta: "¿Es apto para niños la Cascada El Aguacate?", respuesta: "Se recomienda para niños mayores de 10 años con experiencia en caminata. El terreno es irregular y hay tramos empinados." },
      ],
    },
  },

  {
    id: "cascada-el-salto",
    slug: "cascada-el-salto",
    nombre: "Cascada El Salto",
    zona: "El Naranjo",
    tipo: "Naturaleza",
    icon: "Droplet",
    descripcion: "Pared de roca kárstica de 70 m con pozas turquesas permanentes — con o sin cascada es espectacular.",
    duracion_hrs: 3,
    precio_entrada: "$50 MXN",
    precio_entrada_mxn: 50,
    dificultad: "baja",
    ideal_para: ["natacion", "fotografia", "familia"],
    horario: "08:00–17:30",
    dias_abierto: "Lunes a Domingo",
    mejor_hora: "Mañana temprana",
    temporada_ideal: "Jul–Sep (cascada activa) · pozas todo el año",
    advertencias: "La caída principal se desvía a la hidroeléctrica Camilo Arriaga: en secas está seca o casi seca y solo cae en lluvias (jul–sep). Piedras muy resbalosas en las pozas. Con la cascada activa no se permite acercarse a la orilla.",
    como_llegar: "110 min desde Valles · Desde El Naranjo, ~15 km hacia Ciudad del Maíz; último tramo de terracería (el GPS puede mandarte a la reja de la hidroeléctrica: no es ahí)",
    que_llevar: ["calzado acuático — piso muy resbaladizo", "ropa ligera y traje de baño", "protección solar", "comida (sin restaurantes en el sitio)", "efectivo"],
    datos_curiosos: [
      "El flujo se desvía artificialmente hacia una planta hidroeléctrica — por eso la cascada 'desaparece' en temporada seca.",
      "En septiembre de 2024, las lluvias excepcionales la activaron por 3 semanas continuas.",
    ],
    errores_comunes: ["Ir esperando ver la cascada sin verificar antes", "No llevar calzado antiderrapante"],
    lat: 22.5858,
    lng: -99.3836,
    imagen_hero: "/imagenes/cascada-el-salto/hero.jpg",
    imagen_galeria: [
      "/imagenes/cascada-el-salto/gallery-1.jpg",
      "/imagenes/cascada-el-salto/gallery-2.jpg",
      "/imagenes/cascada-el-salto/gallery-3.jpg",
    ],
    seo: {
      metaTitle: "Cascada El Salto El Naranjo 2026 | Guía Completa",
      metaDescription: "Todo sobre Cascada El Salto en El Naranjo, SLP: cuándo cae de verdad, precios 2026, pozas turquesas y cómo combinarla con El Meco en un solo día. ¡Entra!",
      keywords: ["cascada el salto el naranjo", "pozas azules el naranjo slp", "cascadas huasteca potosina 2026", "turismo el naranjo san luis potosi", "cascada el salto slp"],
      faqPrincipales: [
        { pregunta: "¿Por qué no tiene agua la Cascada El Salto?", respuesta: "El río se desvía a la hidroeléctrica Camilo Arriaga, junto a la cascada. En secas la caída está seca o casi seca; cae en temporada de lluvias (julio a septiembre, a veces octubre)." },
        { pregunta: "¿Se puede nadar si la cascada El Salto no tiene agua?", respuesta: "Sí, las pozas naturales mantienen agua turquesa cristalina todo el año, con o sin la caída activa." },
        { pregunta: "¿Hay restaurantes cerca de Cascada El Salto?", respuesta: "Hay puestos pequeños de comida en el mirador. Restaurantes, en El Meco y en El Naranjo (a unos 15 km)." },
      ],
    },
  },

  {
    id: "cascada-el-meco",
    slug: "cascada-el-meco",
    nombre: "Cascada El Meco",
    zona: "El Naranjo",
    tipo: "Aventura",
    icon: "Bird",
    descripcion: "Cascada constante de 35 m sobre roca caliza — la única de El Naranjo que cae todo el año.",
    duracion_hrs: 2,
    precio_entrada: "$60 MXN",
    precio_entrada_mxn: 60,
    dificultad: "baja",
    ideal_para: ["fotografia", "familia", "pareja"],
    horario: "08:00–18:00",
    dias_abierto: "Lunes a Domingo",
    mejor_hora: "17:00–18:00",
    temporada_ideal: "Nov–May",
    advertencias: "Al pie de la cascada la corriente es muy fuerte: ahí no se nada. La panga (~$150 p/p) no opera con el río crecido. Sin señal de celular; solo efectivo.",
    como_llegar: "105 min desde Valles · Desde El Naranjo, ~10 km por la carretera 80 hacia Ciudad del Maíz",
    que_llevar: ["cámara o teléfono con funda impermeable", "repelente natural", "ropa cómoda", "efectivo para panga y restaurantes"],
    datos_curiosos: [
      "Su nombre proviene de los monos 'mecos' (monos araña) que habitaban la zona antes de la deforestación del siglo XX.",
      "Es la única cascada permanente del municipio de El Naranjo — cae todo el año sin importar la temporada.",
    ],
    errores_comunes: ["Ir sin efectivo para la panga (~$150 MXN)", "No preguntar si la panga opera ese día"],
    lat: 22.5641,
    lng: -99.3568,
    imagen_hero: "/imagenes/cascada-el-meco/hero.jpg",
    imagen_galeria: [
      "/imagenes/cascada-el-meco/gallery-1.jpg",
      "/imagenes/cascada-el-meco/gallery-2.jpg",
      "/imagenes/cascada-el-meco/gallery-3.jpg",
      "/imagenes/cascada-el-meco/gallery-4.jpg",
      "/imagenes/cascada-el-meco/gallery-5.jpg",
      "/imagenes/cascada-el-meco/gallery-6.jpg",
      "/imagenes/cascada-el-meco/gallery-7.jpg",
    ],
    seo: {
      metaTitle: "Cascada El Meco El Naranjo 2026 | Mirador y Pangas",
      metaDescription: "Cascada El Meco en El Naranjo: 35 m de caída que no se seca. Mirador gratis, entrada a parajes $60–70 y panga ~$150 MXN; solo efectivo. Cómo llegar en 2026.",
      keywords: ["cascada el meco el naranjo", "paseo en panga huasteca", "el meco san luis potosi 2026", "cascadas permanentes huasteca", "que hacer en el naranjo slp"],
      faqPrincipales: [
        { pregunta: "¿El mirador de Cascada El Meco es gratuito?", respuesta: "Sí, el mirador desde la carretera es completamente gratuito. El acceso al río y las pangas tienen costo adicional (~$60 MXN entrada, ~$150 MXN panga)." },
        { pregunta: "¿Se puede hacer rappel en Cascada El Meco?", respuesta: "Sí: los centros ecoturísticos de la zona ofrecen rappel y tubing por unos $200 a $280. Pregunta en el lugar." },
        { pregunta: "¿Hay restaurantes con vista a Cascada El Meco?", respuesta: "Sí, varios restaurantes tienen terrazas sobre el río con vista directa a la cascada — una de las mejores experiencias de El Naranjo." },
      ],
    },
  },

  {
    id: "sotano-de-las-huahuas",
    slug: "sotano-de-las-huahuas",
    nombre: "Sótano de las Huahuas",
    zona: "Aquismón",
    tipo: "Extrema",
    icon: "MountainSnow",
    descripcion: "Abismo de 478 m donde miles de aves —loros y vencejos— dibujan espirales al amanecer y atardecer.",
    duracion_hrs: 3,
    precio_entrada: "$100 MXN",
    precio_entrada_mxn: 100,
    dificultad: "alta",
    ideal_para: ["fotografia", "naturaleza", "aventura"],
    horario: "06:00–18:00",
    dias_abierto: "Lunes a Domingo",
    mejor_hora: "17:30–18:30",
    temporada_ideal: "Nov–Abr",
    advertencias: "Alrededor de 1.2 km de sendero y más de 800 escalones hasta el mirador: no apto para rodillas delicadas. Prohibidos drones y mascotas. Sin señal de celular. Solo efectivo.",
    como_llegar: "75 min desde Valles · Fed. 85 → Aquismón → San Isidro Tampaxal (17–19 km al norte de Aquismón) · tramo final de terracería",
    que_llevar: ["lámpara de mano o frontal", "calzado de montaña con agarre", "binoculares", "cámara con teleobjetivo", "agua y snacks", "ropa abrigadora para el amanecer"],
    datos_curiosos: [
      "Con 478 metros de profundidad, es uno de los abismos kársticos más profundos de México.",
      "Los lugareños llaman 'huahuas' a los loros verdes en lengua Tének — de ahí el nombre.",
    ],
    errores_comunes: ["Llegar tarde sin tiempo para ver el vuelo", "No llevar guía — el borde no tiene barandales"],
    lat: 21.603889,
    lng: -99.043889,
    imagen_hero: "/imagenes/sotano-de-las-huahuas/hero.jpg",
    imagen_galeria: [
      "/imagenes/sotano-de-las-huahuas/gallery-1.jpg",
      "/imagenes/sotano-de-las-huahuas/borde.jpg",
      "/imagenes/sotano-de-las-huahuas/pericos.jpg",
    ],
    seo: {
      metaTitle: "Sótano de las Huahuas 2026 | Espectáculo de Aves",
      metaDescription: "Sótano de las Huahuas (Aquismón): abismo de 478 m donde vencejos y pericos salen al amanecer y vuelven al atardecer. Cooperación ~$100; 800+ escalones.",
      keywords: ["sótano de las huahuas aquismón", "abismo de aves huasteca potosina", "senderismo aquismón slp", "huahuas 2026", "sotanos huasteca potosina"],
      faqPrincipales: [
        { pregunta: "¿A qué hora salen las aves del Sótano de las Huahuas?", respuesta: "Al amanecer salen y al atardecer regresan. Conviene llegar al mirador una hora antes de que se ponga el sol; con lluvia o niebla casi no se ven." },
        // 10 nov 2026: decía que en Golondrinas el vuelo «es al amanecer» y en
        // Huahuas «al atardecer». Manolo confirmó que en los DOS las aves salen
        // al amanecer y regresan al atardecer.
        { pregunta: "¿En qué se diferencia el Sótano de las Huahuas del Sótano de las Golondrinas?", respuesta: "En los dos las aves salen al amanecer y regresan al atardecer. Las Golondrinas (376 m de caída libre) es casa de vencejos; Las Huahuas (478 m) alberga miles de aves, loros verdes y vencejos. Son experiencias distintas." },
        { pregunta: "¿Es difícil la caminata al Sótano de las Huahuas?", respuesta: "Sí: son alrededor de 1.2 km de sendero por la selva y más de 800 escalones hasta el mirador. No es apta para rodillas delicadas." },
      ],
    },
  },

  {
    id: "cuevas-de-mantetzulel",
    slug: "cuevas-de-mantetzulel",
    nombre: "Cuevas de Mantetzulel",
    zona: "Aquismón",
    tipo: "Naturaleza",
    icon: "Sun",
    descripcion: "Tres cuevas sagradas de los tének con techos colapsados: la luz entra desde arriba como columnas sólidas.",
    duracion_hrs: 4,
    precio_entrada: "$35 MXN + guía comunitario ~$350 por grupo",
    precio_entrada_mxn: 35,
    dificultad: "media",
    ideal_para: ["fotografia", "cultura", "naturaleza"],
    horario: "09:00–17:00",
    dias_abierto: "Lunes a Domingo",
    mejor_hora: "11:00–13:00",
    temporada_ideal: "Oct–May",
    advertencias: "Senderos muy resbaladizos después de lluvia: pospón si llovió. Sin señal de celular. Se entra con guía comunitario (prestan linterna). Coordenadas aproximadas: verifica el GPS antes de ir.",
    como_llegar: "70 min desde Valles · Desde Aquismón, ~8 km (20 min) hasta la comunidad de Mantetzulel",
    que_llevar: ["calzado con suela antideslizante (obligatorio)", "linterna o frontal", "repelente natural", "ropa que no importe ensuciar", "agua para 4 horas"],
    datos_curiosos: [
      "Los habitantes Tének consideran estas cuevas como portales de curación — aún se realizan ceremonias tradicionales.",
      "La Cueva del Espíritu Santo no es un túnel: es una bóveda abierta al cielo con 30 metros de altura.",
    ],
    errores_comunes: ["Ir sin guía comunitario", "Visitar después de lluvia reciente (senderos peligrosos)"],
    lat: 21.631450,
    lng: -99.064820,
    imagen_hero: "/imagenes/cuevas-de-mantetzulel/hero.jpg",
    imagen_galeria: [
      "/imagenes/cuevas-de-mantetzulel/gallery-1.jpg",
    ],
    seo: {
      metaTitle: "Cuevas de Mantetzulel Aquismón 2026 | Guía Completa",
      metaDescription: "Cuevas de Mantetzulel en Aquismón: tres bóvedas sagradas tének con luz cenital. Entrada $35 MXN + guía comunitario ~$350 por grupo; a 20 min de Aquismón.",
      keywords: ["cuevas mantetzulel aquismón", "espeleología huasteca potosina", "turismo comunitario tének slp", "mantetzulel 2026", "cuevas sagradas san luis potosi"],
      faqPrincipales: [
        { pregunta: "¿Cuántas cuevas se visitan en Mantetzulel?", respuesta: "Tres cuevas, con guía comunitario. Los guías prestan linterna." },
        { pregunta: "¿Hay murciélagos en las Cuevas de Mantetzulel?", respuesta: "Sí, habitan en las zonas altas de las bóvedas, pero no representan riesgo para los visitantes con guía." },
        { pregunta: "¿Se necesita equipo especial para visitar Mantetzulel?", respuesta: "No equipo de espeleología avanzada. Solo calzado antideslizante, linterna y ropa que pueda ensuciarse." },
      ],
    },
  },

  {
    id: "nacimiento-huichihuayan",
    slug: "nacimiento-huichihuayan",
    nombre: "Nacimiento de Huichihuayán",
    // Es del municipio de Huehuetlán, cerca de Xilitla (confirmado por Manolo
    // el 10 nov 2026; aquí decía Xilitla). 🔴 Por eso ya no sale en la lista
    // de lugares de Xilitla de /tours-en-xilitla (`zona === "Xilitla"`).
    zona: "Huehuetlán",
    tipo: "Naturaleza",
    icon: "Waves",
    descripcion: "Río cristalino que nace de una cueva — tan claro que se ven los peces en el fondo desde la orilla.",
    duracion_hrs: 3,
    precio_entrada: "~$50 MXN",
    precio_entrada_mxn: 50,
    dificultad: "baja",
    ideal_para: ["natacion", "familia", "fotografia"],
    horario: "08:30–18:00",
    dias_abierto: "Lunes a Domingo",
    mejor_hora: "15:00–17:00",
    temporada_ideal: "Todo el año",
    advertencias: "El agua sale helada del nacimiento y hay zonas profundas cerca de la boca: precaución con niños. Hay comida, palapas y vestidores en el lugar.",
    como_llegar: "80 min desde Valles · Carretera 85 sur hacia Tamazunchale · Desvío a Huehuetlán",
    que_llevar: ["traje de baño", "sandalias acuáticas", "googles de natación", "efectivo"],
    datos_curiosos: ["El río brota de una cueva al pie de la sierra y corre tan claro que se ven los peces desde la orilla.", "Está a unos 15 minutos de Xilitla: se combina con Las Pozas el mismo día."],
    errores_comunes: ["Meterse de golpe al agua helada", "No llevar googles para ver los peces"],
    lat: 21.4588,
    lng: -98.9769,
    imagen_hero: "/imagenes/nacimiento-huichihuayan/hero.jpg",
    imagen_galeria: [
      "/imagenes/nacimiento-huichihuayan/rocas-musgo.jpg",
      "/imagenes/nacimiento-huichihuayan/aereo.jpg",
      "/imagenes/nacimiento-huichihuayan/rio.jpg",
    ],
    seo: {
      // Fase 3 SEO (10 nov 2026): la ficha es la DUEÑA del nombre del lugar
      // (posición 2.9); el artículo del blog se queda con la experiencia.
      // Era "Nacimiento de Huichihuayán 2026 | Huehuetlán SLP".
      metaTitle: "Nacimiento de Huichihuayán: entrada, horario y cómo llegar",
      metaDescription: "Nacimiento de Huichihuayán en Huehuetlán: río cristalino que brota de una cueva, con peces a la vista. Entrada ~$50 MXN; a 15 min de Xilitla y 80 de Valles.",
      keywords: ["nacimiento huichihuayán huehuetlán", "rio cristalino huasteca potosina", "voladores huichihuayan", "turismo huehuetlán slp 2026", "destinos sur huasteca potosina"],
      faqPrincipales: [
        { pregunta: "¿El agua de Huichihuayán está fría?", respuesta: "Sí, sale helada del nacimiento: entra poco a poco." },
        { pregunta: "¿Se puede rentar chaleco en Huichihuayán?", respuesta: "Sí, hay puestos locales que rentan chalecos y llantas a precios accesibles." },
        { pregunta: "¿Hay comida y vestidores en Huichihuayán?", respuesta: "Sí: hay comida, palapas y vestidores en el lugar." },
      ],
    },
  },

  // ─── NUEVOS DESTINOS — TANDA 2 (4 del PDF) ─────────────────────────────────

  // nacimiento-tambaque — versión corregida con datos del PDF
  // Precio: $10 MXN · Coords exactas · Horario 09:00 · Estacionamiento $30 MXN extra
  {
    id: "nacimiento-tambaque",
    slug: "nacimiento-tambaque",
    nombre: "Nacimiento de Tambaque",
    zona: "Aquismón",
    tipo: "Naturaleza",
    icon: "Droplet",
    descripcion: "Oasis donde el río Coy brota de la Sierra de Tanchanaco en pozas de azul cristalino, con corriente casi nula.",
    duracion_hrs: 3,
    precio_entrada: "$10 MXN",
    precio_entrada_mxn: 10,
    dificultad: "baja",
    ideal_para: ["natacion", "familia", "relajacion"],
    horario: "09:00–18:00",
    dias_abierto: "Lunes a Domingo",
    mejor_hora: "09:00–11:00",
    temporada_ideal: "Oct–May",
    advertencias: "Temperatura del agua muy fría (nace de acuífero subterráneo) — choque térmico si entras rápido. Piso resbaladizo dentro del agua — calzado acuático obligatorio. Estacionamiento $30 MXN adicional.",
    como_llegar: "55 min desde Valles · Carretera 85 sur → Crucero San Pedro de las Anonas · 100% pavimentado",
    que_llevar: ["aquashoes o calzado acuático", "efectivo en denominaciones bajas (sin cajero ni terminal)", "comida propia (opciones solo fines de semana)", "protector solar biodegradable", "repelente natural"],
    datos_curiosos: [
      "En 1950 el nacimiento se secó completamente. El 10 de mayo de 1951, tras una gran tormenta, brotó con tal fuerza que llenó el balneario en una sola noche — los locales lo recuerdan como 'el milagro de Tambaque'.",
      "Tambaque significa 'lugar de agua bajita' en lengua Tének, referencia a la poca profundidad de sus pozas.",
    ],
    errores_comunes: ["No llevar calzado acuático (piso con algas muy resbaladizo)", "Entrar al agua rápido sin aclimatarse (choque térmico)"],
    lat: 21.687222,
    lng: -99.042778,
    imagen_hero: "/imagenes/nacimiento-tambaque/hero.webp",
    imagen_galeria: [
      "/imagenes/nacimiento-tambaque/gallery-1.webp",
      "/imagenes/nacimiento-tambaque/gallery-2.webp",
    ],
    seo: {
      metaTitle: "Balneario Tambaque Aquismón 2026 | Guía, Precios y Cómo Llegar",
      metaDescription: "Descubre el Nacimiento de Tambaque en Aquismón, SLP. Paraíso de aguas cristalinas ideal para familias. Precios 2026, ubicación exacta y mejores consejos de viaje.",
      keywords: ["balneario tambaque slp", "nacimiento de tambaque aquismón", "qué hacer en aquismón huasteca", "aguas cristalinas san luis potosí", "turismo aquismón 2026"],
      faqPrincipales: [
        { pregunta: "¿Qué significa Tambaque?", respuesta: "En lengua huasteca Tének significa 'lugar de agua bajita', referencia a la poca profundidad de sus pozas — ideal para niños y no nadadores." },
        { pregunta: "¿Pueden entrar niños pequeños a Tambaque?", respuesta: "Es el paraje más recomendado de la Huasteca para niños pequeños: corriente casi nula, agua playita y senderos seguros con andadores de piedra." },
        { pregunta: "¿Hay comida en Tambaque?", respuesta: "Los fines de semana y temporada alta hay venta de comida típica: enchiladas huastecas, boles y tamales. Entre semana se recomienda llevar alimentos propios." },
      ],
    },
  },

  {
    id: "voladores-tamaleton",
    slug: "voladores-tamaleton",
    nombre: "Voladores de Tamaletón",
    zona: "Tancanhuitz",
    tipo: "Arte & Cultura",
    icon: "Wind",
    descripcion: "El ritual prehispánico más antiguo de la Huasteca — 5 hombres vuelan desde un mástil de 30 m en honor al sol.",
    duracion_hrs: 4,
    precio_entrada: "$100 MXN",
    precio_entrada_mxn: 100,
    dificultad: "baja",
    ideal_para: ["cultura", "fotografia", "historia"],
    horario: "09:00–17:00",
    dias_abierto: "Jueves a Domingo (mayor actividad) · Lun-Mié menor actividad",
    mejor_hora: "11:30–13:30",
    temporada_ideal: "Dic–Feb",
    advertencias: "El vuelo se cancela con lluvia o viento — no garantizado para visitantes individuales sin grupo de 30+. Sin señal telefónica en la parte alta de Tamaletón. No conducir de noche hacia Tancanhuitz.",
    como_llegar: "52 min desde Valles · Carretera 85 sur → Crucero Aquismón → Tancanhuitz → Centro Ceremonial",
    que_llevar: ["efectivo (sin cajeros en Tamaletón)", "ropa cómoda para calor", "cámara fotográfica", "agua suficiente", "respeto y disposición para el silencio durante los rezos"],
    datos_curiosos: [
      "El ritual suma exactamente 52 vueltas (13 × 4 danzantes) — el número del 'Siglo Indígena' o ciclo del Fuego Nuevo mesoamericano.",
      "Bajudh (Jacinta) fue la primera mujer en convertirse en voladora oficial de Tamaletón, rompiendo siglos de prohibición.",
    ],
    errores_comunes: ["Llegar esperando vuelo garantizado sin grupo previo", "No llevar efectivo"],
    lat: 21.592222,
    lng: -98.964722,
    imagen_hero: "/imagenes/voladores-tamaleton/hero.jpg",
    imagen_galeria: [
      "/imagenes/voladores-tamaleton/gallery-1.jpg",
      "/imagenes/voladores-tamaleton/gallery-2.jpg",
    ],
    seo: {
      metaTitle: "Voladores de Tamaletón 2026 | Guía del Ritual Sagrado Teenek",
      metaDescription: "Centro Ceremonial Tamaletón en Tancanhuitz: el ritual de los Voladores tének. Entrada $100 MXN, a 52 min de Ciudad Valles; más actividad de jueves a domingo.",
      keywords: ["voladores de tamaletón", "huasteca potosina turismo cultural 2026", "danza del gavilán tancanhuitz", "tancanhuitz san luis potosí", "cultura tének huasteca"],
      faqPrincipales: [
        { pregunta: "¿Los Voladores de Tamaletón son lo mismo que los de Papantla?", respuesta: "No. Aunque comparten el concepto del vuelo, Tamaletón pertenece a la etnia Tének, usa vestimenta de manta blanca con plumas naturales y tiene origen histórico independiente vinculado al gavilán sagrado, no al quetzal." },
        { pregunta: "¿Pueden volar mujeres en Tamaletón?", respuesta: "Sí. Tamaletón hizo historia con Bajudh (Jacinta), la primera mujer en romper la prohibición patriarcal y convertirse en voladora oficial." },
        { pregunta: "¿Está garantizado ver el vuelo si voy por mi cuenta?", respuesta: "No. El ritual se programa solo para grupos de 30+ personas o en fechas festivas. Los visitantes individuales pueden ver el mástil y el museo, pero no tienen garantizado presenciar el vuelo." },
      ],
    },
  },

  {
    id: "rio-tampaon-rafting",
    slug: "rio-tampaon-rafting",
    nombre: "Río Tampaón — Rafting Clase III",
    zona: "Aquismón",
    tipo: "Aventura",
    icon: "Anchor",
    descripcion: "14 km de rápidos Clase III en aguas turquesa por un cañón de 500 m — uno de los 10 ríos más escénicos de Norteamérica.",
    duracion_hrs: 7,
    precio_entrada: conPrecio("{precio} (tour completo, con traslado y comida)", PRECIO_TOUR_RAFTING),
    precio_entrada_mxn: PRECIO_TOUR_RAFTING,
    entradaEsTour: "rafting-rio-tampaon",
    dificultad: "alta",
    ideal_para: ["aventura", "amigos", "fotografia"],
    horario: "09:00–18:00",
    dias_abierto: "Lunes a Domingo (reservación requerida)",
    mejor_hora: "11:00–13:00",
    temporada_ideal: "Nov–Mar",
    advertencias: "Nunca navegar por cuenta propia en jul-ago — crecidas repentinas de varios metros en minutos. Guías NO pueden suministrar medicamentos — llevar los propios. Solo efectivo en Tanchachín.",
    como_llegar: "45 min desde Valles · Carretera 70 → desvío Ejido Tanchachín · Últimos 18 km terracería transitable",
    que_llevar: ["calcetines de algodón dentro del calzado acuático (evitan ampollas)", "doble muda de ropa seca en el vehículo", "bloqueador 100% biodegradable (obligatorio)", "GoPro con soporte de pecho o casco únicamente", "medicamentos propios"],
    datos_curiosos: [
      "El agua turquesa proviene de la alta concentración de minerales kársticos en el lecho — el mismo mecanismo que colorea las cascadas de Tamul.",
      "El rápido 'La Tumba' ocurre donde las paredes del cañón se cierran tanto que el eco desaparece — el silencio absoluto antes del rápido más técnico del descenso.",
    ],
    errores_comunes: ["Ir sin reservación en temporada alta", "Llevar bloqueador convencional (prohibido y multa)"],
    lat: 22.063222,
    lng: -99.010389,
    imagen_hero: "/imagenes/rio-tampaon-rafting/hero.jpg",
    imagen_galeria: [
      "/imagenes/rio-tampaon-rafting/gallery-1.jpg",
      "/imagenes/rio-tampaon-rafting/gallery-2.jpg",
      "/imagenes/rio-tampaon-rafting/familia-turquesa.jpg",
      "/imagenes/rio-tampaon-rafting/familia-rapidos.jpg",
      "/imagenes/rio-tampaon-rafting/gallery-7.jpg",
      "/imagenes/rio-tampaon-rafting/tour-4.jpg",
      "/imagenes/rio-tampaon-rafting/tour-1.jpg",
    ],
    seo: {
      metaTitle: "Rafting Río Tampaón 2026 | Guía Experta Huasteca Potosina",
      // El precio sale del tour (`PRECIO_TOUR_RAFTING`): el "$1,450–$1,890" que
      // había aquí no era ninguna tarifa nuestra.
      metaDescription: conPrecio("Vive el mejor rafting de México en el Río Tampaón. Tour completo {precio} con traslado y comida, logística desde Ciudad Valles y consejos de seguridad.", PRECIO_TOUR_RAFTING),
      keywords: ["rafting huasteca potosina 2026", "río tampaón rápidos clase III", "tours ciudad valles rafting", "precio rafting río tampaón", "mejor época rafting san luis potosí"],
      faqPrincipales: [
        { pregunta: "¿Es seguro hacer rafting en el Río Tampaón si no sé nadar?", respuesta: "Sí, siempre que uses el equipo de flotación de alta calidad de las operadoras certificadas. Debes informar al guía antes de subir para ubicarte estratégicamente en la balsa." },
        { pregunta: "¿Qué pasa si mi tour de rafting se cancela por el nivel del río?", respuesta: "La mayoría de operadoras ofrecen cambio de actividad a un río más tranquilo (como Micos) o reprogramación. Los reembolsos totales dependen de qué tan anticipado se confirme la inviabilidad del descenso." },
        { pregunta: "¿Puedo llevar mi cámara GoPro al rafting en el Tampaón?", respuesta: "Sí, con soporte de pecho o casco únicamente. Está prohibido llevarla en la mano — ambas manos deben estar libres para remar y sujetarse de las cuerdas de seguridad." },
      ],
    },
  },

  {
    id: "xilitla-pueblo-magico",
    slug: "xilitla-pueblo-magico",
    nombre: "Xilitla — Pueblo Mágico Surrealista",
    zona: "Xilitla",
    tipo: "Arte & Cultura",
    icon: "Landmark",
    descripcion: "Donde el concreto cobra vida y la selva se vuelve geométrica — Las Pozas de Edward James y 3 museos de clase mundial.",
    duracion_hrs: 8,
    precio_entrada: "$180 MXN (Las Pozas adulto)",
    precio_entrada_mxn: 180,
    dificultad: "media",
    ideal_para: ["cultura", "fotografia", "pareja"],
    horario: "09:00–18:00",
    dias_abierto: "Miércoles a Lunes — Las Pozas CIERRA los martes",
    mejor_hora: "08:30–10:00",
    temporada_ideal: "Nov–Mar",
    advertencias: "No manejar hacia Xilitla después de las 18:00 — carreteras sin iluminación y neblina densa. Cajeros pueden quedarse sin fondos en puentes. Reservación hasta 60 días antes en temporada alta. Guía obligatorio en Las Pozas (+$30 MXN).",
    como_llegar: "90 min desde Valles · Carretera 85 sur → desvío Carr. 120 hacia Xilitla · 100% pavimentado",
    que_llevar: ["calzado suela de goma con tracción profunda (trail running)", "ropa oscura o colores tierra (musgo mancha permanentemente)", "efectivo suficiente (cajeros pueden vaciarse)", "reservación anticipada de Las Pozas", "paraguas o impermeable ligero"],
    datos_curiosos: [
      "La helada de 1962 mató miles de orquídeas de Edward James — decidió construir flores de concreto que 'nunca morirían'. De ahí nacieron Las Pozas.",
      "Edward James financió a Salvador Dalí y René Magritte, y mantuvo correspondencia con Frank Lloyd Wright — influencias visibles en la escala y fantasía de Las Pozas.",
    ],
    errores_comunes: ["Llegar martes (Las Pozas CERRADO — error muy frecuente)", "No reservar con anticipación en temporada alta"],
    lat: 21.385278,
    lng: -98.989444,
    imagen_hero: "/imagenes/xilitla-pueblo-magico/gallery-2.jpg",
    imagen_galeria: [
      "/imagenes/xilitla-pueblo-magico/gallery-1.jpg",
      "/imagenes/xilitla-pueblo-magico/hero.jpg",
      "/imagenes/xilitla-pueblo-magico/plaza.jpg",
      "/imagenes/xilitla-pueblo-magico/textiles.jpg",
      "/imagenes/xilitla-pueblo-magico/jardin-surrealista.jpg",
      "/imagenes/xilitla-pueblo-magico/mirador.jpg",
      "/imagenes/xilitla-pueblo-magico/huapango.jpg",
      "/imagenes/xilitla-pueblo-magico/danza-listones.jpg",
      "/imagenes/xilitla-pueblo-magico/tianguis.jpg",
    ],
    seo: {
      // Fase 3 SEO (10 nov 2026): la ficha es la DUEÑA de «xilitla» (2,983
      // impresiones en la posición 10.4 y 0 clics). «Qué hacer en Xilitla» es
      // del artículo de la guía y «clima en Xilitla», del del clima: esta ficha
      // los enlaza (`GUIAS_BLOG_DESTINO`) y se queda con el pueblo, cómo
      // llegar y dónde dormir. Era "Xilitla Huasteca Potosina 2026 | Guía de
      // Viaje Completa".
      metaTitle: "Xilitla, Pueblo Mágico 2026: guía y cómo llegar",
      metaDescription: "Xilitla, el Pueblo Mágico surrealista de la Huasteca Potosina: Las Pozas ($180 MXN), museos, cómo llegar (1 h 30 min desde Ciudad Valles) y dónde dormir.",
      keywords: ["xilitla", "xilitla pueblo mágico", "xilitla san luis potosí 2026", "cómo llegar a xilitla", "dónde dormir en xilitla", "pueblos mágicos huasteca potosina"],
      faqPrincipales: [
        { pregunta: "¿Cuánto tiempo se necesita para recorrer Xilitla?", respuesta: "Mínimo 2 días: el primero para Las Pozas completo y la Cascada Los Comales, el segundo para los museos del centro y el Huapango dominical en la plaza." },
        { pregunta: "¿Es seguro viajar a Xilitla en 2026?", respuesta: "Sí, es seguro siempre que se transite de día. El principal riesgo no es la violencia sino las condiciones de las carreteras de sierra: neblina densa, curvas cerradas y falta de iluminación nocturna." },
        // «Adultos mayores con INAPAM» no es la regla del jardín (65 o más; la
        // INAPAM se da desde los 60): las cifras salen de `POZAS_ACCESO`.
        { pregunta: "¿Cuánto cuesta la entrada a Las Pozas de Xilitla en 2026?", respuesta: `Adultos: $${POZAS_ACCESO.adulto} MXN. Niños de 6 a 12 años y mayores de 65: $${POZAS_ACCESO.reducida} MXN. Menores de 6 años: gratis. Guía obligatoria adicional: $${POZAS_ACCESO.guiaEspanol} MXN por persona en español.` },
        // Fase 3 (10 nov 2026): la ficha era delgada (~1,236 palabras) para ser
        // la dueña de «xilitla». Los tiempos salen de `tiemposDeViaje.ts`, los
        // de Manolo; nada de «qué hacer», que es del artículo del blog.
        {
          pregunta: "¿Cómo llegar a Xilitla desde la Ciudad de México, Monterrey o San Luis Potosí?",
          respuesta:
            `En auto son unas ${enAuto("cdmx")} desde la Ciudad de México, ${enAuto("monterrey")} desde Monterrey, ${enAuto("tampico")} desde Tampico y ${enAuto("san-luis-potosi")} desde San Luis Potosí, que va por Rioverde y Jalpan sin pasar por Ciudad Valles. ` +
            `Desde Ciudad Valles es ${horasEnPalabras(MINUTOS_VALLES_XILITLA)} por carretera de sierra, toda pavimentada. En autobús, de la Ciudad de México a Xilitla son ${enAutobus("cdmx", "xilitla")}. ` +
            "Llega de día: después de las 18:00 la carretera no tiene iluminación y suele haber neblina.",
        },
        {
          pregunta: "¿Dónde dormir en Xilitla?",
          respuesta:
            "En el pueblo o sobre el camino a Las Pozas, para no manejar de noche por la sierra y llegar a tiempo al jardín, que no tiene estacionamiento y donde quien llega tarde pierde su turno. " +
            "El Hotel Paraíso Encantado está a unos minutos a pie de la entrada de Las Pozas.",
        },
      ],
    },
  },

  // ─── EXPANSIÓN VERIFICADA — nuevos destinos (jun 2026, fuentes oficiales) ───

  {
    id: "aquismon-pueblo-magico", slug: "aquismon-pueblo-magico",
    nombre: "Aquismón — Pueblo Mágico", zona: "Aquismón", tipo: "Arte & Cultura", icon: "Landmark",
    descripcion: "Pueblo Mágico de mayoría tének y puerta de entrada a Tamul, los sótanos y el río Tampaón. Su Parroquia de San Miguel Arcángel se levanta sobre un basamento huasteco.",
    duracion_hrs: 3, precio_entrada: "Acceso libre", precio_entrada_mxn: 0, dificultad: "baja",
    ideal_para: ["cultura", "fotografia", "familia"],
    horario: "Abierto todo el día", dias_abierto: "Lunes a Domingo (tianguis los sábados)",
    mejor_hora: "Mañana", temporada_ideal: "Oct–Mar",
    advertencias: "El pueblo es la base; los grandes atractivos (Tamul, Sótano de las Golondrinas y de las Huahuas, Cueva del Agua) están a varios km y requieren transporte, guía o lancha aparte.",
    como_llegar: "~1 h desde Ciudad Valles (~55 km al sur) por la Carr. 85",
    que_llevar: ["efectivo", "sombrero", "calzado cómodo", "cámara"],
    datos_curiosos: ["Nombrado Pueblo Mágico el 11 de octubre de 2018, el tercero de San Luis Potosí.", "Su nombre tének significa 'árbol al pie de un pozo'."],
    errores_comunes: ["Creer que Tamul o las cuevas están en el pueblo (están a varios km)", "No confirmar el día del tianguis"],
    lat: 21.6198, lng: -99.0177,
    imagen_hero: "/imagenes/aquismon-pueblo-magico/hero.jpg", imagen_galeria: [],
    seo: {
      metaTitle: "Aquismón Pueblo Mágico 2026 | Qué Ver y Cómo Llegar",
      metaDescription: "Aquismón, Pueblo Mágico tének y puerta a Tamul y los sótanos. Qué ver, su Parroquia de San Miguel Arcángel y cómo llegar desde Ciudad Valles (~1 h).",
      keywords: ["aquismón pueblo mágico", "que ver en aquismón", "aquismón san luis potosí", "puerta a tamul", "huasteca potosina pueblos mágicos"],
      faqPrincipales: [
        { pregunta: "¿Por qué es Pueblo Mágico Aquismón?", respuesta: "Recibió el nombramiento el 11 de octubre de 2018 por su cultura tének viva, su arquitectura y ser la puerta de entrada a maravillas naturales como la Cascada de Tamul y el Sótano de las Golondrinas." },
        { pregunta: "¿Tamul y los sótanos están en el pueblo de Aquismón?", respuesta: "No. El pueblo es la base, pero los atractivos naturales están a varios kilómetros y requieren transporte y, en el caso de Tamul, un recorrido en lancha de remo con guía." },
      ],
    },
  },

  {
    id: "rio-axtla-el-chalan", slug: "rio-axtla-el-chalan",
    nombre: "Río Axtla y 'el Chalán'", zona: "Axtla de Terrazas", tipo: "Naturaleza", icon: "Waves",
    descripcion: "Río de aguas cristalinas con pozas para nadar, cuyo emblema es 'el chalán': una vieja balsa de fierro que cruza el río jalada a mano desde hace más de 50 años.",
    duracion_hrs: 3, precio_entrada: "Acceso libre (cruce en chalán: cuota simbólica)", precio_entrada_mxn: 0, dificultad: "baja",
    ideal_para: ["natacion", "familia", "relajacion"],
    horario: "Visita de día", dias_abierto: "Lunes a Domingo (tianguis dominicales en la ribera)",
    mejor_hora: "Media mañana", temporada_ideal: "Mar–Jun (aguas claras)",
    // Lluvias de julio a octubre, la temporada de temporada.ts (7 oct 2026):
    // decía «~jun–oct» y su propia temporada ideal pone junio con aguas claras.
    advertencias: "En temporada de lluvias (~jul–oct) el río crece y se vuelve peligroso: evita nadar con el río crecido. Sin horarios ni precios oficiales; confirma con turismo municipal.",
    como_llegar: "~1h 30 desde Ciudad Valles (~82 km) por la federal 85 sur; desde el centro de Axtla, ~15 min al río",
    que_llevar: ["traje de baño", "sandalias acuáticas", "efectivo", "bloqueador biodegradable"],
    datos_curiosos: ["El 'chalán' de fierro opera desde hace más de 50 años y es símbolo de Axtla.", "El río se forma por la unión de los ríos Huichihuayán y Tancuilín."],
    errores_comunes: ["Nadar con el río crecido", "No llevar efectivo para el chalán"],
    seo: {
      metaTitle: "Río Axtla y 'el Chalán' 2026 | Pozas para Nadar Gratis",
      metaDescription: "Acceso libre. Río cristalino en Axtla de Terrazas con pozas para nadar y 'el chalán', la balsa de fierro que cruza el río jalada a mano hace más de 50 años.",
      keywords: ["río axtla", "el chalán axtla", "qué hacer en axtla de terrazas", "pozas para nadar huasteca potosina"],
      faqPrincipales: [],
    },
    lat: 21.4333, lng: -98.8833,
    imagen_hero: "/imagenes/rio-axtla-el-chalan/hero.jpg", imagen_galeria: ["/imagenes/rio-axtla-el-chalan/gallery-1.jpg", "/imagenes/rio-axtla-el-chalan/gallery-2.jpg", "/imagenes/rio-axtla-el-chalan/gallery-3.jpg", "/imagenes/rio-axtla-el-chalan/gallery-4.jpg"],
  },

  {
    id: "castillo-de-la-salud", slug: "castillo-de-la-salud",
    nombre: "Castillo de la Salud 'Beto Ramón'", zona: "Axtla de Terrazas", tipo: "Bienestar", icon: "Castle",
    descripcion: "Recinto surrealista de medicina tradicional construido en 1974 por el herbolario náhuatl Don Beto Ramón, con un jardín de cientos de plantas medicinales y espacios para limpias y consultas.",
    duracion_hrs: 2, precio_entrada: "$20 MXN general / $10 MXN niños y adultos mayores (guiada $30/$20 MXN)", precio_entrada_mxn: 20, dificultad: "baja",
    ideal_para: ["bienestar", "cultura", "fotografia"],
    horario: "08:00–18:00 (limpias y masajes hasta las 16:00)", dias_abierto: "Lunes a Domingo",
    mejor_hora: "Mañana", temporada_ideal: "Todo el año",
    advertencias: "Es medicina tradicional y herbolaria, NO una clínica certificada: no sustituye la atención médica profesional. Confirma precios y horarios antes de ir. Tramo final por caminos rurales.",
    como_llegar: "~1h 30 desde Ciudad Valles (~83 km); el castillo está a ~4 km de la plaza de Axtla, en Aguacatitla. Desde Xilitla, ~25 km",
    que_llevar: ["efectivo", "calzado cómodo", "cámara", "agua"],
    datos_curiosos: ["Su arquitectura mezcla simbolismo náhuatl con pasajes bíblicos (Torre de Babel, Arca de Noé, Ojo de Dios).", "Don Beto Ramón falleció en 2004 y dejó más de 150 fórmulas de herbolaria que aún se usan."],
    errores_comunes: ["Tomarlo como sustituto de un médico", "No confirmar horario de limpias y masajes"],
    lat: 21.4300, lng: -98.8800,
    imagen_hero: "/imagenes/castillo-de-la-salud/hero.jpg", imagen_galeria: ["/imagenes/castillo-de-la-salud/gallery-5.jpg", "/imagenes/castillo-de-la-salud/gallery-6.jpg"],
    seo: {
      metaTitle: "Castillo de la Salud 'Beto Ramón' Axtla 2026 | Guía",
      metaDescription: "Castillo de la Salud de Don Beto Ramón en Axtla: arquitectura surrealista, jardín medicinal y herbolaria. Entrada $20 MXN, abre de 08:00 a 18:00.",
      keywords: ["castillo de la salud beto ramón", "axtla de terrazas turismo", "herbolaria huasteca potosina", "beto ramón curandero", "que hacer en axtla"],
      faqPrincipales: [
        { pregunta: "¿Cuánto cuesta entrar al Castillo de la Salud?", respuesta: "La entrada general es de ~$20 MXN ($10 niños y adultos mayores). La visita guiada cuesta ~$30 ($20 reducida). Abre todos los días de 8:00 a 18:00." },
        { pregunta: "¿El Castillo de la Salud ofrece consultas?", respuesta: "Sí, mantiene la tradición de herbolaria de Don Beto Ramón con limpias, masajes y consultas. Es medicina tradicional y no sustituye la atención médica profesional." },
      ],
    },
  },

  {
    id: "cascada-los-comales", slug: "cascada-los-comales",
    nombre: "Cascada Los Comales", zona: "Xilitla", tipo: "Naturaleza", icon: "Droplet",
    descripcion: "Cascada de aguas semicálidas entre selva tropical, a unos pasos de la entrada de Las Pozas, con pozas para nadar y temazcal medicinal.",
    duracion_hrs: 2, precio_entrada: "Cuota local (~$20 MXN, confirmar en sitio)", precio_entrada_mxn: 20, dificultad: "media",
    ideal_para: ["naturaleza", "fotografia", "bienestar"],
    horario: "Visita de día", dias_abierto: "Cierra martes (igual que Las Pozas)",
    mejor_hora: "Mañana", temporada_ideal: "Nov–May",
    advertencias: "Se suele visitar el mismo día que Las Pozas (está a ~50 m de su entrada). Senderos resbalosos en lluvia. El temazcal requiere reservación. Precio y horarios no publicados oficialmente: confirma por teléfono.",
    como_llegar: "~1h 30min desde Ciudad Valles por la Carr. 120 a Xilitla; la cascada está junto a la entrada de Las Pozas",
    que_llevar: ["traje de baño", "calzado antiderrapante", "repelente biodegradable", "efectivo"],
    datos_curiosos: ["Está a unos 50 m de la entrada de Las Pozas: muchos la visitan el mismo día.", "Su temazcal de uso medicinal recibe grupos pequeños (cupo limitado)."],
    errores_comunes: ["Ir en martes (zona de Las Pozas con cierres)", "No llevar efectivo"],
    lat: 21.3970, lng: -98.9970,
    imagen_hero: "/imagenes/cascada-los-comales/hero.jpg",
    imagen_galeria: [
      "/imagenes/cascada-los-comales/jardin-piedra.jpg",
      "/imagenes/cascada-los-comales/portal-rojo.jpg",
      "/imagenes/cascada-los-comales/cascada-cauce.jpg",
      "/imagenes/cascada-los-comales/cascada-caida.jpg",
      "/imagenes/cascada-los-comales/familia.jpg",
    ],
    seo: {
      metaTitle: "Cascada Los Comales Xilitla 2026 | Junto a Las Pozas",
      metaDescription: "Cascada Los Comales, a unos pasos de Las Pozas de Edward James en Xilitla: pozas para nadar, temazcal medicinal y selva tropical. Cómo llegar y consejos 2026.",
      keywords: ["cascada los comales xilitla", "que hacer en xilitla", "las pozas xilitla cascada", "temazcal xilitla", "huasteca potosina cascadas"],
      faqPrincipales: [
        { pregunta: "¿Dónde está la Cascada Los Comales?", respuesta: "Está en Xilitla, a unos 50 metros de la entrada de Las Pozas (Jardín de Edward James), por lo que suele visitarse el mismo día." },
        { pregunta: "¿Se puede nadar en Los Comales?", respuesta: "Sí, forma pozas de aguas semicálidas aptas para nadar. Lleva calzado antiderrapante porque las rocas son resbalosas." },
      ],
    },
  },

  {
    id: "cascada-el-trampolin-tamasopo", slug: "cascada-el-trampolin-tamasopo",
    nombre: "El Trampolín (Tamasopo)", zona: "Tamasopo", tipo: "Naturaleza", icon: "Droplet",
    descripcion: "Tramo público y gratuito del río Agua Buena, con agua turquesa, mini cascadas, pozas y cuerdas en los árboles para lanzarse al agua.",
    duracion_hrs: 3, precio_entrada: "Acceso libre (posible cuota de estacionamiento)", precio_entrada_mxn: 0, dificultad: "media",
    ideal_para: ["natacion", "aventura", "amigos"],
    horario: "Visita de día (sin horario formal)", dias_abierto: "Lunes a Domingo",
    mejor_hora: "Media mañana", temporada_ideal: "Nov–May",
    advertencias: "Es DISTINTO del parque de pago 'Cascadas de Tamasopo'. Sin vigilancia formal: verifica la profundidad antes de saltar. Terreno lodoso y resbaloso. Usa chaleco.",
    como_llegar: "~1 h–1h 15 desde Ciudad Valles; ~4–5 km del centro de Tamasopo por la carretera a Agua Buena",
    que_llevar: ["traje de baño", "calzado acuático", "chaleco salvavidas", "efectivo"],
    datos_curiosos: ["Es un tramo gratuito del río Agua Buena, no el parque de pago de las Cascadas de Tamasopo.", "El paraje se extiende unos 2 km a lo largo del río."],
    errores_comunes: ["Confundirlo con el parque de pago de Tamasopo", "Saltar sin medir la profundidad"],
    seo: {
      metaTitle: "El Trampolín, Tamasopo | Río Gratuito con Pozas Turquesa",
      metaDescription: "Tramo público y gratuito del río Agua Buena en Tamasopo: agua turquesa, mini cascadas, pozas y cuerdas para lanzarse. No es el parque de pago de Tamasopo.",
      keywords: ["el trampolín tamasopo", "río agua buena tamasopo", "cascadas gratis huasteca potosina", "qué hacer en tamasopo"],
      faqPrincipales: [
        { pregunta: "¿El Trampolín es lo mismo que las Cascadas de Tamasopo?", respuesta: "No. El Trampolín es un tramo público y gratuito del río Agua Buena; las Cascadas de Tamasopo son un parque de pago distinto. Es la confusión más común de los visitantes." },
      ],
    },
    lat: 21.9163, lng: -99.4090,
    imagen_hero: "/imagenes/cascada-el-trampolin-tamasopo/hero.jpg", imagen_galeria: ["/imagenes/cascada-el-trampolin-tamasopo/gallery-1.jpg", "/imagenes/cascada-el-trampolin-tamasopo/gallery-2.jpg", "/imagenes/cascada-el-trampolin-tamasopo/gallery-3.jpg", "/imagenes/cascada-el-trampolin-tamasopo/gallery-4.jpg", "/imagenes/cascada-el-trampolin-tamasopo/gallery-5.jpg", "/imagenes/cascada-el-trampolin-tamasopo/gallery-6.jpg"],
  },

  {
    id: "zona-arqueologica-tamohi-el-consuelo", slug: "zona-arqueologica-tamohi-el-consuelo",
    nombre: "Zona Arqueológica Tamohí (El Consuelo)", zona: "Tamuín", tipo: "Arqueología", icon: "BookOpen",
    descripcion: "Centro huasteco prehispánico de ~210 hectáreas a orillas del río Tampaón, con plataformas y basamentos. Aquí se halló en 1917 'El Adolescente Huasteco'.",
    duracion_hrs: 2, precio_entrada: "Acceso libre (uso de videocámara $45 MXN)", precio_entrada_mxn: 0, dificultad: "baja",
    ideal_para: ["historia", "cultura", "familia"],
    horario: "09:00–18:00 (último acceso 17:00)", dias_abierto: "Lunes a Domingo",
    mejor_hora: "09:00 AM", temporada_ideal: "Nov–Mar",
    advertencias: "El 'Adolescente Huasteco' original NO está en el sitio: se exhibe en el Museo Nacional de Antropología (CDMX). Clima caluroso y húmedo; menos equipado que Tamtoc.",
    como_llegar: "~40–50 min desde Ciudad Valles por la federal 70 hacia El Consuelo (sitio a ~5.75 km de la carretera)",
    que_llevar: ["sombrero", "agua abundante", "protector solar", "calzado cómodo"],
    datos_curiosos: ["'Tamohí' significa 'lugar de la efervescencia' en tének; es un sitio DISTINTO de Tamtoc.", "Aquí se descubrió en 1917 'El Adolescente Huasteco', hoy en el Museo Nacional de Antropología."],
    errores_comunes: ["Confundirlo con Tamtoc", "Esperar ver el 'Adolescente' original en el sitio"],
    lat: 21.95315, lng: -98.74938,
    imagen_hero: "/imagenes/zona-arqueologica-tamohi-el-consuelo/hero.jpg", imagen_galeria: [],
    seo: {
      metaTitle: "Zona Arqueológica Tamohí / El Consuelo 2026 | Tamuín SLP",
      metaDescription: "Tamohí (El Consuelo), ciudad huasteca junto al río Tampaón en Tamuín, donde se halló 'El Adolescente Huasteco'. Entrada gratuita, abre de 09:00 a 18:00.",
      keywords: ["tamohí el consuelo tamuín", "adolescente huasteco", "zona arqueológica tamuín", "huasteca arqueología slp", "inah tamohí"],
      faqPrincipales: [
        { pregunta: "¿Cuánto cuesta entrar a Tamohí / El Consuelo?", respuesta: "El acceso es gratuito según el INAH; solo se cobra una cuota por uso de videocámara (~$45 MXN). Abre de 9:00 a 18:00, con último acceso a las 17:00." },
        { pregunta: "¿Es lo mismo Tamohí que Tamtoc?", respuesta: "No. Son dos zonas arqueológicas huastecas distintas en Tamuín. En Tamohí (El Consuelo) se halló 'El Adolescente Huasteco' en 1917." },
      ],
    },
  },

  {
    id: "templo-san-juan-bautista-coxcatlan", slug: "templo-san-juan-bautista-coxcatlan",
    nombre: "Templo de San Juan Bautista (Coxcatlán)", zona: "Coxcatlán", tipo: "Arte & Cultura", icon: "Church",
    descripcion: "Templo y ex convento del siglo XVI, considerado uno de los más antiguos de la Huasteca Potosina, frente a la plaza principal de Coxcatlán.",
    duracion_hrs: 1, precio_entrada: "Acceso libre", precio_entrada_mxn: 0, dificultad: "baja",
    ideal_para: ["cultura", "historia", "fotografia"],
    horario: "Abierto todo el día (templo en uso)", dias_abierto: "Lunes a Domingo",
    mejor_hora: "Mañana", temporada_ideal: "Todo el año (más animado en Xantolo, 1–2 nov)",
    advertencias: "Las fechas de construcción (1522–1523) provienen de tradición local y prensa, no de cédula INAH verificada. Horarios de visita no publicados: confirma localmente.",
    como_llegar: "~1.5–2 h al sur de Ciudad Valles; en el centro de la cabecera de Coxcatlán, frente a la plaza",
    que_llevar: ["calzado cómodo", "cámara", "efectivo"],
    datos_curiosos: ["Se le considera una de las construcciones religiosas más antiguas de la Huasteca Potosina.", "Su construcción habría usado piedra unida con mezcla que incluía conchas marinas molidas."],
    errores_comunes: ["Dar por hecho horarios de visita", "Ir esperando un museo (es templo en uso)"],
    seo: {
      metaTitle: "Templo de San Juan Bautista, Coxcatlán | Siglo XVI",
      metaDescription: "Templo y ex convento del siglo XVI frente a la plaza de Coxcatlán, de los más antiguos de la Huasteca Potosina. Acceso libre; es un templo en uso, no un museo.",
      keywords: ["templo san juan bautista coxcatlán", "ex convento coxcatlán", "qué ver en coxcatlán", "iglesias antiguas huasteca potosina"],
      faqPrincipales: [],
    },
    lat: 21.53861, lng: -98.90528,
    imagen_hero: "/imagenes/templo-san-juan-bautista-coxcatlan/hero.jpg", imagen_galeria: [],
  },

  {
    id: "cascada-rancho-el-zapote-poza-azul-coxcatlan", slug: "cascada-rancho-el-zapote-poza-azul-coxcatlan",
    nombre: "Cascada del Rancho El Zapote (Poza Azul)", zona: "Coxcatlán", tipo: "Naturaleza", icon: "Droplet",
    descripcion: "Cascada y poza de aguas turquesa conocida localmente como 'poza azul', uno de los rincones naturales menos masificados de la Huasteca Potosina.",
    duracion_hrs: 2, precio_entrada: "Sin tarifa oficial publicada (confirmar en sitio)", dificultad: "media",
    ideal_para: ["natacion", "naturaleza", "fotografia"],
    horario: "Visita de día (sin horario formal)", dias_abierto: "Consultar localmente",
    mejor_hora: "Media mañana", temporada_ideal: "Secas (el agua se enturbia con las lluvias)",
    advertencias: "Sitio poco documentado: precio, horario y ubicación exacta no verificados oficialmente. El acceso puede ser por rancho privado; confirma localmente.",
    como_llegar: "A ~11 min de la cabecera de Coxcatlán, que está ~1.5–2 h al sur de Ciudad Valles",
    que_llevar: ["traje de baño", "calzado acuático", "efectivo", "agua"],
    datos_curiosos: ["El estado la promociona por su 'vibrante color turquesa' y por estar a solo ~11 min de la cabecera."],
    errores_comunes: ["Confundirla con la Poza de Rosendo (otro sitio)", "Ir en lluvias (agua turbia)"],
    seo: {
      metaTitle: "Cascada del Rancho El Zapote (Poza Azul), Coxcatlán",
      metaDescription: "Cascada y poza turquesa en Coxcatlán conocida como 'poza azul', de los rincones menos masificados de la Huasteca. Poco documentada: confirma acceso y tarifa.",
      keywords: ["poza azul coxcatlán", "cascada rancho el zapote", "qué hacer en coxcatlán", "cascadas poco conocidas huasteca potosina"],
      faqPrincipales: [],
    },
    lat: 21.53861, lng: -98.90528,
    imagen_hero: "/imagenes/cascada-rancho-el-zapote-poza-azul-coxcatlan/hero.jpg", imagen_galeria: ["/imagenes/cascada-rancho-el-zapote-poza-azul-coxcatlan/gallery-1.jpg", "/imagenes/cascada-rancho-el-zapote-poza-azul-coxcatlan/gallery-2.jpg"],
  },

  {
    id: "ruinas-de-el-jopoy-coxcatlan", slug: "ruinas-de-el-jopoy-coxcatlan",
    nombre: "Ruinas de El Jopoy", zona: "Coxcatlán", tipo: "Arqueología", icon: "BookOpen",
    descripcion: "Restos de una ermita colonial de muros de piedra y grandes arcos, señalada como una de las primeras construcciones religiosas españolas de la Huasteca Potosina; hoy en ruinas y usada como panteón comunitario.",
    duracion_hrs: 1, precio_entrada: "Acceso libre", precio_entrada_mxn: 0, dificultad: "baja",
    ideal_para: ["historia", "cultura"],
    horario: "Acceso libre (sin horario formal)", dias_abierto: "Lunes a Domingo",
    mejor_hora: "Mañana", temporada_ideal: "Cobra vida el 1–2 de noviembre (Día de Muertos)",
    advertencias: "Sitio abandonado, sin techo y en deterioro, que funciona como cementerio: respeta el lugar. Autoría y fechas (atribuidas a Cortés, 1522–23) provienen de prensa y tradición, no de cédula INAH. Camino rural; conviene guía local.",
    como_llegar: "A ~8.4 km de la cabecera de Coxcatlán (localidad El Jopoy); Coxcatlán está ~1.5–2 h al sur de Ciudad Valles",
    que_llevar: ["calzado de campo", "agua", "efectivo", "respeto (es panteón)"],
    datos_curiosos: ["Se le señala como una de las primeras ermitas de la Huasteca Potosina.", "El INAH realizó exploraciones preliminares hacia 2009."],
    errores_comunes: ["Faltar al respeto (es cementerio activo)", "Ir sin guía local"],
    seo: {
      metaTitle: "Ruinas de El Jopoy, Coxcatlán | Ermita Colonial en Ruinas",
      metaDescription: "Restos de una ermita colonial de muros de piedra y grandes arcos en Coxcatlán, hoy panteón comunitario. Acceso libre; cobra vida el 1 y 2 de noviembre.",
      keywords: ["ruinas de el jopoy", "el jopoy coxcatlán", "ermita colonial huasteca potosina", "qué hacer en coxcatlán"],
      faqPrincipales: [],
    },
    lat: 21.53861, lng: -98.90528,
    imagen_hero: "/imagenes/ruinas-de-el-jopoy-coxcatlan/hero.jpg", imagen_galeria: ["/imagenes/ruinas-de-el-jopoy-coxcatlan/gallery-1.jpg", "/imagenes/ruinas-de-el-jopoy-coxcatlan/gallery-2.jpg", "/imagenes/ruinas-de-el-jopoy-coxcatlan/gallery-3.jpg"],
  },

  {
    id: "tancanhuitz", slug: "tancanhuitz",
    nombre: "Tancanhuitz (Ciudad Santos)", zona: "Tancanhuitz", tipo: "Arte & Cultura", icon: "Landmark",
    descripcion: "Cabecera tének-nahua célebre por su parroquia de San Miguel Arcángel, a la que se sube por una larga escalinata (la 'Iglesia de los 149 Escalones'), y por su fuerte tradición de Xantolo, huapango y danzas indígenas.",
    duracion_hrs: 3, precio_entrada: "Acceso libre", precio_entrada_mxn: 0, dificultad: "media",
    ideal_para: ["cultura", "historia", "fotografia"],
    horario: "Abierto todo el día", dias_abierto: "Lunes a Domingo",
    mejor_hora: "Mañana", temporada_ideal: "Xantolo (fin oct–inicio nov) y fiesta de San Miguel (25–29 sep)",
    advertencias: "La experiencia cultural alcanza su pico en fechas específicas; fuera de ellas el pueblo es tranquilo. El '149' es el nombre tradicional de la escalinata, no un conteo medido. Carreteras de montaña.",
    como_llegar: "~50–55 min al sur de Ciudad Valles (~54–56 km)",
    que_llevar: ["calzado cómodo", "agua", "cámara", "efectivo"],
    datos_curiosos: ["Su parroquia se popularizó como la 'Iglesia de los 149 Escalones'.", "Forma parte de la Ruta Xantolo de la Huasteca Potosina."],
    errores_comunes: ["Ir fuera de temporada esperando las danzas", "Subestimar la escalinata"],
    seo: {
      metaTitle: "Tancanhuitz | La Iglesia de los 149 Escalones y el Xantolo",
      metaDescription: "Cabecera tének-nahua con su parroquia de San Miguel Arcángel en lo alto de una larga escalinata, y uno de los Xantolos más vivos de la Huasteca. Acceso libre.",
      keywords: ["tancanhuitz", "iglesia 149 escalones", "xantolo tancanhuitz", "ciudad santos san luis potosí"],
      faqPrincipales: [],
    },
    lat: 21.5972, lng: -98.9667,
    imagen_hero: "/imagenes/tancanhuitz/hero.jpg", imagen_galeria: [],
  },

  {
    id: "san-martin-chalchicuautla", slug: "san-martin-chalchicuautla",
    nombre: "San Martín Chalchicuautla", zona: "San Martín Chalchicuautla", tipo: "Arte & Cultura", icon: "Wind",
    descripcion: "Municipio conocido como la 'Cuna del Xantolo', donde el Día de Muertos se vive con hondas raíces nahuas del 31 de octubre al 2 de noviembre. Cerca está la Cascada del Manantial.",
    duracion_hrs: 3, precio_entrada: "Acceso libre", precio_entrada_mxn: 0, dificultad: "baja",
    ideal_para: ["cultura", "fotografia"],
    horario: "Abierto todo el día", dias_abierto: "Lunes a Domingo",
    mejor_hora: "Mañana", temporada_ideal: "Xantolo: 31 oct–2 nov",
    advertencias: "La experiencia alcanza su máximo en el Xantolo; fuera de esas fechas el pueblo es tranquilo. Datos de la Cascada del Manantial (costo, horario, acceso) no verificados. Carretera de montaña.",
    como_llegar: "~26 km (30–35 min) desde Tamazunchale; desde Ciudad Valles ~1.5–2 h pasando por Tamazunchale",
    que_llevar: ["calzado cómodo", "cámara", "efectivo", "agua"],
    datos_curiosos: ["Reconocido como la 'Cuna del Xantolo' potosino: comparsas de 'viejos' enmascarados bailan huapango.", "Su gastronomía de temporada incluye zacahuil, bocoles y queso de bola."],
    errores_comunes: ["Visitar fuera del Xantolo esperando las comparsas", "Dar por segura la apertura de la cascada"],
    seo: {
      metaTitle: "San Martín Chalchicuautla | La Cuna del Xantolo",
      metaDescription: "La 'Cuna del Xantolo': del 31 de octubre al 2 de noviembre el Día de Muertos se vive aquí con hondas raíces nahuas. Cerca está la Cascada del Manantial.",
      keywords: ["san martín chalchicuautla", "cuna del xantolo", "xantolo huasteca potosina", "día de muertos san luis potosí"],
      faqPrincipales: [],
    },
    lat: 21.3833, lng: -98.6500,
    imagen_hero: "/imagenes/san-martin-chalchicuautla/hero.jpg", imagen_galeria: [],
  },

  {
    id: "san-vicente-tancuayalab", slug: "san-vicente-tancuayalab",
    nombre: "San Vicente Tancuayalab", zona: "San Vicente Tancuayalab", tipo: "Arte & Cultura", icon: "Landmark",
    descripcion: "Pueblo huasteco reconocido como 'cuna del Día de Muertos' en San Luis Potosí, fundado por misioneros franciscanos en el siglo XVI cerca del río Moctezuma.",
    duracion_hrs: 2, precio_entrada: "Acceso libre", precio_entrada_mxn: 0, dificultad: "baja",
    ideal_para: ["cultura", "historia"],
    horario: "Abierto todo el día", dias_abierto: "Lunes a Domingo",
    mejor_hora: "Mañana", temporada_ideal: "Xantolo / Día de Muertos (fin oct–2 nov)",
    advertencias: "La experiencia cultural alcanza su pico en el Xantolo; fuera de esas fechas el pueblo es tranquilo.",
    como_llegar: "~1h 12 en auto desde Ciudad Valles (~70 km)",
    que_llevar: ["calzado cómodo", "cámara", "efectivo", "agua"],
    datos_curiosos: ["'Tancuayalab' significa en huasteco 'lugar del bastón de mando'.", "Se fundó como 'San Francisco Tancuayalab' en el siglo XVI y se trasladó a su ubicación actual en 1767."],
    errores_comunes: ["Ir fuera del Xantolo esperando las festividades", "Subestimar el calor"],
    seo: {
      metaTitle: "San Vicente Tancuayalab | Cuna del Día de Muertos en SLP",
      metaDescription: "Acceso libre. Pueblo huasteco reconocido como 'cuna del Día de Muertos' en San Luis Potosí, fundado por franciscanos en el siglo XVI cerca del río Moctezuma.",
      keywords: ["san vicente tancuayalab", "cuna del día de muertos san luis potosí", "xantolo huasteca potosina", "pueblos de la huasteca potosina"],
      faqPrincipales: [],
    },
    lat: 21.71806, lng: -98.58806,
    imagen_hero: "/imagenes/san-vicente-tancuayalab/hero.jpg", imagen_galeria: [],
  },

  {
    id: "tanlajas", slug: "tanlajas",
    nombre: "Tanlajás", zona: "Tanlajás", tipo: "Arte & Cultura", icon: "Wind",
    descripcion: "Pueblo de raíces tének conocido por su gastronomía regional (zacahuiles, bocoles, cecina) y por la 'Toreada de los Diablos', un ritual ancestral en el que enmascarados con cuernos y pieles recrean la lucha entre el bien y el mal.",
    duracion_hrs: 2, precio_entrada: "Acceso libre", precio_entrada_mxn: 0, dificultad: "baja",
    ideal_para: ["cultura", "gastronomia", "fotografia"],
    horario: "Abierto todo el día", dias_abierto: "Lunes a Domingo",
    mejor_hora: "Mañana", temporada_ideal: "Semana Santa (Toreada de los Diablos) y fiesta de Santa Ana (25–26 jul)",
    advertencias: "La 'Toreada de los Diablos' se celebra en SEMANA SANTA (no en Día de Muertos). Para vivir el ritual hay que ir en esas fechas; incluye latigazos reales de cuero crudo.",
    como_llegar: "~49–50 km (50–60 min) al sureste de Ciudad Valles",
    que_llevar: ["calzado cómodo", "efectivo", "cámara", "apetito (gastronomía local)"],
    datos_curiosos: ["Su nombre tének significa 'lugar de lajas' (piedras planas).", "En la Toreada los 'diablos' usan máscaras de madera talladas a mano y un chirrión (látigo de cuero)."],
    errores_comunes: ["Ir esperando la Toreada en Día de Muertos (es Semana Santa)"],
    seo: {
      metaTitle: "Tanlajás | La Toreada de los Diablos y Cocina Tének",
      metaDescription: "Pueblo tének de zacahuiles, bocoles y cecina, y de la 'Toreada de los Diablos', el ritual de enmascarados que se celebra en Semana Santa.",
      keywords: ["tanlajás", "toreada de los diablos", "zacahuil huasteca potosina", "cultura tének"],
      faqPrincipales: [
        { pregunta: "¿Cuándo es la Toreada de los Diablos de Tanlajás?", respuesta: "Se celebra en Semana Santa, no en Día de Muertos. Es el error más común al planear la visita." },
      ],
    },
    lat: 21.665833, lng: -98.887778,
    imagen_hero: "/imagenes/tanlajas/hero.jpg", imagen_galeria: [],
  },

  {
    id: "texquitote", slug: "texquitote",
    nombre: "Texquitote — cuna del son huasteco", zona: "Matlapa", tipo: "Arte & Cultura", icon: "Music",
    descripcion: "Comunidad nahua reconocida como la cuna de la laudería del son huasteco, donde alrededor de 40 lauderos construyen a mano jaranas, quintas huapangueras, violines, conchas de armadillo y arpas.",
    duracion_hrs: 3, precio_entrada: "Acceso libre (visitar talleres puede requerir acuerdo con el artesano)", precio_entrada_mxn: 0, dificultad: "baja",
    ideal_para: ["cultura", "musica", "artesania"],
    horario: "Talleres particulares (sin horario formal)", dias_abierto: "Contactar a un laudero por anticipado",
    mejor_hora: "Mañana", temporada_ideal: "Época seca (nov–abr) para los caminos rurales",
    advertencias: "Es una comunidad indígena habitada, no un atractivo montado: llega con respeto y contacta a un laudero por anticipado. Caminos finales de terracería. Hay dos localidades homónimas (Primero y Segundo): confirma el destino.",
    como_llegar: "~20–30 min desde Tamazunchale (hub más cercano); desde Ciudad Valles ~2.5–3 h al sur por la federal 85 hasta Matlapa",
    que_llevar: ["efectivo", "calzado de campo", "cámara", "respeto por la comunidad"],
    datos_curiosos: ["En Texquitote se originó la 'quinta huapanguera', la guitarra de cinco cuerdas del huapango huasteco.", "Las conchas para el son aún se elaboran con caparazón de armadillo."],
    errores_comunes: ["Llegar sin contactar a un laudero", "Confundir Texquitote Primero con Segundo"],
    seo: {
      metaTitle: "Texquitote, Matlapa | Cuna de la Laudería del Son Huasteco",
      metaDescription: "Comunidad nahua donde unos 40 lauderos hacen a mano jaranas, quintas huapangueras, violines y arpas del son huasteco. Talleres particulares: avisa antes.",
      keywords: ["texquitote", "laudería son huasteco", "jarana huasteca", "quinta huapanguera", "artesanías huasteca potosina"],
      faqPrincipales: [
        { pregunta: "¿Se puede visitar un taller de lauderos en Texquitote?", respuesta: "Sí, pero los talleres son particulares y no tienen horario formal: hay que contactar antes a un laudero para acordar la visita." },
      ],
    },
    lat: 21.295278, lng: -98.816667,
    imagen_hero: "/imagenes/texquitote/hero.jpg", imagen_galeria: [],
  },

  {
    id: "laguna-de-los-suspiros", slug: "laguna-de-los-suspiros",
    nombre: "Laguna de los Suspiros", zona: "Ébano", tipo: "Naturaleza", icon: "Droplet",
    descripcion: "Laguna en el ejido de Plan de Iguala cuyo emblema es un majestuoso higuerón (ficus) de unos 200 años, cuyas enormes raíces forman dos 'puertas' naturales.",
    duracion_hrs: 2, precio_entrada: "Sin tarifa oficial publicada", dificultad: "baja",
    ideal_para: ["naturaleza", "fotografia", "familia"],
    horario: "Visita de día (sin horario formal)", dias_abierto: "Consultar localmente",
    mejor_hora: "Mañana o atardecer", temporada_ideal: "Consultar (el nivel del agua varía con la sequía)",
    advertencias: "Sitio rústico de turismo incipiente, sin servicios formales verificados. El nivel del agua de las lagunas de Ébano baja con la sequía. No confundir con la Laguna Marland (otra laguna de Ébano).",
    como_llegar: "~1h 20–1h 45 desde Ciudad Valles vía Tamuín y Ébano (~70–75 km); en el ejido Plan de Iguala",
    que_llevar: ["repelente", "agua", "cámara", "efectivo"],
    datos_curiosos: ["Su higuerón tiene unos 200 años y sus raíces forman dos grandes 'puertas' naturales, su rasgo más fotografiado.", "La Secretaría de Turismo de SLP ha promovido la laguna como opción de paseo."],
    errores_comunes: ["Esperar servicios turísticos formales", "Confundirla con la Laguna Marland"],
    seo: {
      metaTitle: "Laguna de los Suspiros, Ébano | El Higuerón de 200 Años",
      metaDescription: "Laguna del ejido Plan de Iguala (Ébano) cuyo emblema es un higuerón de unos 200 años, con raíces que forman dos 'puertas' naturales. Sin servicios formales.",
      keywords: ["laguna de los suspiros", "ébano san luis potosí", "higuerón laguna de los suspiros", "qué hacer en ébano"],
      faqPrincipales: [],
    },
    lat: 22.0375, lng: -98.464167,
    imagen_hero: "/imagenes/laguna-de-los-suspiros/hero.jpg", imagen_galeria: ["/imagenes/laguna-de-los-suspiros/gallery-1.jpg", "/imagenes/laguna-de-los-suspiros/gallery-2.jpg", "/imagenes/laguna-de-los-suspiros/gallery-3.jpg", "/imagenes/laguna-de-los-suspiros/gallery-4.jpg"],
  },

  {
    id: "la-trinidad-xilitla", slug: "la-trinidad-xilitla",
    nombre: "La Trinidad — Bosque de Niebla de Xilitla", zona: "Xilitla", tipo: "Naturaleza & Bosque", icon: "TreePine",
    // El Cerro del Pilón no salía en esta ficha aunque el Amanecer de Nubes
    // sube hasta su cima cruzando este bosque (ver `tour-amanecer-nubes` en
    // tours.ts): quien busca "cerro del pilón" o "mar de nubes xilitla" no
    // encontraba el lugar desde el que se camina.
    // 🔴 "Suele haber" mar de nubes, nunca "se ve": depende del clima y no se
    // promete (tourRequisitos.ts). Y la subida guiada es NUESTRO recorrido, que
    // se paga aparte: la FAQ de costos no puede meterla en la lista de lo que
    // cubre la entrada de la comunidad.
    descripcion: "Comunidad náhuatl a unos 14 km de Xilitla, enclavada en uno de los bosques de niebla mejor conservados de la Huasteca (pino-encino, ~1,950 m). Tiene cabañas de madera para parejas y grupos, zona para acampar, fogatas y asadores, además de senderos para caminar a miradores, pozas, cuevas y sótanos. Por este bosque sube también el sendero a la cima del Cerro del Pilón, donde al amanecer suele haber mar de nubes.",
    duracion_hrs: 6, precio_entrada: "$100 MXN por persona (entrada); cabañas para parejas y grupos desde $700 hasta $2,500 MXN aparte", precio_entrada_mxn: 100, dificultad: "media",
    ideal_para: ["naturaleza", "senderismo", "familia", "camping"],
    horario: "Visita y recorridos durante el día (reservar con la comunidad)", dias_abierto: "Todo el año (reservar por anticipado)",
    // Lluvias de julio a octubre, como temporada.ts (7 oct 2026; decía jun–oct).
    mejor_hora: "Amanecer (para la niebla)", temporada_ideal: "Todo el año; la niebla es más densa en lluvias (jul–oct)",
    advertencias: "La subida es muy empinada y hay tramos de terracería quebrada: se recomienda un vehículo que no sea muy bajo, para que no pegue. Maneja de día. Arriba hace frío (es bosque de niebla): lleva abrigo aunque en Xilitla haga calor. Es una comunidad habitada; llega con respeto y reserva por anticipado.",
    como_llegar: "~14 km al oeste de Xilitla (8.7 km en línea recta); entre 45 minutos y 1 hora por camino de sierra que asciende a ~1,950 m. El tramo final es una subida muy empinada y de terracería quebrada, así que conviene un auto con buena altura libre (que no sea muy bajo).",
    que_llevar: ["abrigo (arriba hace frío)", "calzado de senderismo", "comida para asar (hay fogatas y asadores)", "cámara", "efectivo"],
    datos_curiosos: ["Es una comunidad náhuatl de unos 96 habitantes en lo alto de la Sierra Gorda.", "Hay cabañas de madera para parejas y grupos (aprox. $700 a $2,500), zona para acampar, fogatas y asadores donde puedes asar tu comida.", "El bosque alberga osos hormigueros de monte, coatíes, pavas cojolitas y madroños enormes."],
    errores_comunes: ["Subir en un auto muy bajo (la terracería quebrada y la pendiente lo raspan)", "Subestimar el frío y la humedad del bosque de niebla", "Llegar sin reservar la cabaña o el campamento"],
    lat: 21.4047, lng: -99.0715,
    imagen_hero: "/imagenes/la-trinidad-xilitla/sotano-niebla.jpg",
    imagen_galeria: [
      "/imagenes/la-trinidad-xilitla/cueva-mirador.jpg",
      "/imagenes/la-trinidad-xilitla/campamento.jpg",
      "/imagenes/la-trinidad-xilitla/cabana-turquesa.jpg",
      "/imagenes/la-trinidad-xilitla/mar-de-nubes.jpg",
      "/imagenes/la-trinidad-xilitla/letras.jpg",
      "/imagenes/la-trinidad-xilitla/bosque-arroyo.jpg",
      "/imagenes/la-trinidad-xilitla/arco-rappel.jpg",
      "/imagenes/la-trinidad-xilitla/atardecer.jpg",
    ],
    seo: {
      metaTitle: "La Trinidad Xilitla 2026 | Bosque de Niebla en la Sierra",
      metaDescription: "La Trinidad, bosque de niebla a 14 km de Xilitla y a 1,950 m: senderos, pozas, cabañas y la subida al Cerro del Pilón. Cómo llegar, costos y qué hacer.",
      keywords: ["la trinidad xilitla", "bosque de niebla huasteca potosina", "cerro del pilón xilitla", "mar de nubes xilitla", "que hacer en xilitla", "ecoturismo xilitla", "cabañas xilitla sierra gorda"],
      faqPrincipales: [
        { pregunta: "¿Cómo llegar a La Trinidad desde Xilitla?", respuesta: "La Trinidad está a unos 14 km al oeste de Xilitla por un camino de sierra que asciende hasta cerca de los 1,950 m de altitud. El trayecto toma entre 45 minutos y 1 hora. El tramo final es una subida muy empinada y de terracería quebrada, por lo que conviene manejar de día y en un auto que no sea muy bajo, para que no pegue." },
        { pregunta: "¿Qué se puede hacer en La Trinidad y cuánto cuesta?", respuesta: "La entrada cuesta $100 por persona. Puedes caminar por senderos a miradores, pozas, cuevas y sótanos (como la Olla de la Luz), hospedarte en cabañas de madera para parejas o grupos (aprox. $700 a $2,500 según el tamaño), acampar, hacer fogatas y asar tu comida. Subir de madrugada con guía a la cima del Cerro del Pilón no entra en esa cuota: es nuestro recorrido Amanecer de Nubes, que se reserva aparte, ya incluye las entradas y llega a la cima al amanecer, cuando suele haber mar de nubes (depende del clima). Arriba hace frío, así que lleva abrigo." },
        { pregunta: "¿Cuándo es mejor visitar el bosque de niebla de La Trinidad?", respuesta: "Se puede visitar todo el año. La niebla característica es más densa en la temporada de lluvias (de julio a octubre). Por la altitud el clima es fresco y húmedo, así que conviene llevar abrigo aunque en Xilitla haga calor." },
      ],
    },
  },

  {
    id: "olla-de-la-luz", slug: "olla-de-la-luz",
    nombre: "Olla de la Luz — Cerro de la Luz", zona: "Xilitla", tipo: "Naturaleza & Sótano", icon: "Aperture",
    // ⚠️ Las medidas son las que da el operador (28 sep 2026), que es quien
    // lleva grupos ahí. La página del ayuntamiento de Xilitla publica otras
    // (~800 m de diámetro y +120 m de caída) y es lo que decía este archivo
    // hasta hoy. Si alguna vez hay un levantamiento topográfico, se cambia aquí
    // y en todas las líneas que las repiten (ES, EN, destinoData.ts y el tour
    // en tours.ts): `grep -rn "233" src/lib` las encuentra.
    //
    // "Hoya de la Luz" es la otra forma en que se escribe (prensa y guías de
    // viaje la usan muy a menudo). Se dice en la descripción visible y en
    // una FAQ, no solo en `keywords`: Google ignora esa etiqueta y quien busca
    // "hoya" tiene que leer que es el mismo lugar.
    //
    // El title es de CONSULTA ("cómo llegar"), no de venta: el de
    // /tours/olla-de-la-luz empieza con las mismas palabras y es el que debe
    // quedarse con quien busca contratar. Dos títulos casi iguales competían.
    descripcion: "La Olla de la Luz, también conocida como Hoya de la Luz, es un enorme sótano de 233 m de diámetro con un tiro vertical de 193 m de profundidad, coronado por el Cerro de la Luz, el punto más alto del municipio de Xilitla. Se llega tras un recorrido por el bosque de niebla desde La Trinidad.",
    duracion_hrs: 5, precio_entrada: "Recorrido guiado desde La Trinidad (~$150–$250 MXN por grupo)", dificultad: "alta",
    ideal_para: ["naturaleza", "senderismo", "aventura", "fotografia"],
    horario: "Recorridos durante el día (con guía de La Trinidad)", dias_abierto: "Todo el año (reservar por anticipado)",
    mejor_hora: "Media mañana", temporada_ideal: "Época seca (nov–may) para los caminos del bosque",
    advertencias: "Es indispensable ir con guía local de La Trinidad — no se puede llegar por cuenta propia. Requiere caminata por el bosque de niebla en altura (1,950–2,300 m). Es un abismo profundo: no te acerques al borde sin guía.",
    como_llegar: "A unos 5 km de La Trinidad (que está a ~14 km de Xilitla), subiendo hacia el Cerro de la Luz; el acceso final es a pie con guía de la comunidad",
    que_llevar: ["calzado de senderismo", "abrigo o impermeable", "agua y snacks", "cámara", "efectivo"],
    datos_curiosos: ["El Cerro de la Luz que lo corona es el punto más alto del municipio de Xilitla, con elevaciones de hasta ~2,300 m.", "El sótano mide 233 m de diámetro y su tiro vertical cae 193 m."],
    errores_comunes: ["Intentar llegar sin guía local", "No considerar la altitud y el frío del bosque de niebla"],
    lat: 21.42, lng: -99.055,
    imagen_hero: "/imagenes/olla-de-la-luz/hero.jpg", imagen_galeria: ["/imagenes/olla-de-la-luz/gallery-1.jpg", "/imagenes/olla-de-la-luz/gallery-2.jpg", "/imagenes/olla-de-la-luz/gallery-3.jpg", "/imagenes/olla-de-la-luz/gallery-4.jpg"],
    seo: {
      metaTitle: "Olla de la Luz (Hoya de la Luz): cómo llegar desde Xilitla",
      metaDescription: "Olla de la Luz (Hoya de la Luz): sótano de 233 m de diámetro y 193 m de profundidad en el bosque de niebla de Xilitla. Se llega con guía desde La Trinidad.",
      keywords: ["olla de la luz xilitla", "hoya de la luz", "hoya de la luz xilitla", "cerro de la luz xilitla", "sotano xilitla", "bosque de niebla la trinidad"],
      faqPrincipales: [
        { pregunta: "¿Qué es la Olla de la Luz?", respuesta: "Es un gran sótano (dolina) de 233 metros de diámetro con un tiro vertical de 193 metros de profundidad, ubicado en lo alto del bosque de niebla de Xilitla y coronado por el Cerro de la Luz." },
        { pregunta: "¿Es lo mismo la Olla de la Luz que la Hoya de la Luz?", respuesta: "Sí. «Olla de la Luz» y «Hoya de la Luz» son dos formas de escribir el mismo sótano: el de 233 metros de diámetro y 193 de profundidad que se abre en el bosque de niebla de La Trinidad, en Xilitla, coronado por el Cerro de la Luz. Solo se llega con guía de la comunidad." },
        { pregunta: "¿Cómo se llega a la Olla de la Luz?", respuesta: "Solo con guía local de La Trinidad: la visita es obligatoriamente guiada, no se puede llegar por cuenta propia. Se accede a pie, a unos 5 km de La Trinidad, subiendo hacia el Cerro de la Luz. La Trinidad está a unos 14 km de Xilitla." },
        { pregunta: "¿Qué tan alto está?", respuesta: "El recorrido se mueve entre los 1,950 y los 2,300 metros sobre el nivel del mar, por lo que el clima es fresco y húmedo; conviene llevar abrigo y calzado de senderismo." },
      ],
    },
  },

  {
    id: "cueva-del-salitre", slug: "cueva-del-salitre",
    nombre: "Cueva del Salitre — Xilitla", zona: "Xilitla", tipo: "Cueva & Aventura", icon: "Mountain",
    descripcion: "Caverna escondida entre la selva de Xilitla, de unos 100 m de boca por 300 m de fondo. Sus paredes son un destino popular de espeleología, rappel y escalada (cinco rutas equipadas), a pocos minutos del centro del Pueblo Mágico.",
    duracion_hrs: 2, precio_entrada: "$50 MXN por persona (entrada propia del sitio)", precio_entrada_mxn: 50, dificultad: "alta",
    ideal_para: ["aventura", "espeleologia", "escalada", "amigos"],
    horario: "Horario diurno (consultar en el acceso)", dias_abierto: "Todo el año (puede inundarse en lluvias)",
    mejor_hora: "Mañana", temporada_ideal: "Época seca (nov–may); en lluvias suele filtrarse agua e inundarse",
    advertencias: "En temporada de lluvias la cueva puede inundarse por filtraciones. La espeleología, el rappel y la escalada requieren equipo y guía; no entres a las zonas técnicas sin experiencia.",
    como_llegar: "Desde el centro de Xilitla por la carretera federal 120 rumbo a Huichihuayán, a pocos minutos del pueblo. El sitio ya cuenta con su propia entrada (acceso especial), con un sendero corto de unos 10 minutos hasta la cueva.",
    que_llevar: ["lámpara o frontal", "calzado cerrado con agarre", "ropa que se pueda ensuciar", "efectivo", "agua"],
    datos_curiosos: ["Su nombre viene de la humedad ('salitre') que escurre por sus paredes.", "Tiene cinco rutas de escalada equipadas, favoritas de los escaladores de la región."],
    errores_comunes: ["Visitarla en plena temporada de lluvias (riesgo de inundación)", "Entrar a las zonas técnicas sin equipo ni guía"],
    lat: 21.3846, lng: -98.9889,
    imagen_hero: "/imagenes/cueva-del-salitre/hero.jpg", imagen_galeria: ["/imagenes/cueva-del-salitre/gallery-1.jpg", "/imagenes/cueva-del-salitre/gallery-2.jpg", "/imagenes/cueva-del-salitre/gallery-3.jpg", "/imagenes/cueva-del-salitre/gallery-4.jpg", "/imagenes/cueva-del-salitre/gallery-5.jpg", "/imagenes/cueva-del-salitre/gallery-6.jpg", "/imagenes/cueva-del-salitre/gallery-7.jpg", "/imagenes/cueva-del-salitre/gallery-8.jpg", "/imagenes/cueva-del-salitre/gallery-9.jpg"],
    seo: {
      metaTitle: "Cueva del Salitre Xilitla 2026 | Espeleología y Rappel",
      metaDescription: "Cueva del Salitre, Xilitla: entrada $50. Boca de ~100 m por 300 de fondo, con espeleología, rappel y cinco rutas de escalada. Cómo llegar y qué llevar.",
      keywords: ["cueva del salitre xilitla", "espeleologia xilitla", "rappel xilitla", "escalada huasteca potosina", "que hacer en xilitla"],
      faqPrincipales: [
        { pregunta: "¿Cuánto cuesta entrar a la Cueva del Salitre?", respuesta: "La entrada cuesta $50 pesos por persona. El sitio ya cuenta con su propia entrada (acceso especial), sobre la carretera federal 120 rumbo a Huichihuayán, a pocos minutos del centro de Xilitla, con un sendero corto hasta la cueva." },
        { pregunta: "¿Qué actividades se pueden hacer en la Cueva del Salitre?", respuesta: "Es un sitio popular de espeleología, rappel y escalada en roca: sus paredes tienen cinco rutas equipadas. También se puede recorrer a pie tras un sendero corto de unos 10 minutos." },
        { pregunta: "¿Cuál es la mejor época para visitarla?", respuesta: "La época seca (de noviembre a mayo). En temporada de lluvias suele filtrarse agua e incluso inundarse, por lo que conviene evitarla." },
      ],
    },
  },

  {
    id: "museo-leonora-carrington-xilitla", slug: "museo-leonora-carrington-xilitla",
    nombre: "Museo Leonora Carrington — Xilitla", zona: "Xilitla", tipo: "Arte & Cultura", icon: "Palette",
    descripcion: "Museo dedicado a la artista surrealista Leonora Carrington, amiga de Edward James, en pleno centro de Xilitla. Exhibe escultura, litografía y dibujo de la autora, además de un espacio de difusión del surrealismo.",
    duracion_hrs: 1, precio_entrada: "General $50 MXN · estudiantes, maestros y adultos mayores con credencial $25 MXN · menores de 12 años gratis", precio_entrada_mxn: 50, dificultad: "baja",
    ideal_para: ["cultura", "arte", "familia", "pareja"],
    horario: "Martes a domingo, 11:00–17:00 (último acceso 16:30)", dias_abierto: "Martes a domingo (cerrado lunes)",
    mejor_hora: "Mañana", temporada_ideal: "Todo el año",
    advertencias: "No confundir con el Museo Leonora Carrington de la ciudad de San Luis Potosí (Centro de las Artes): son dos museos distintos. Se combina muy bien con Las Pozas de Edward James el mismo día.",
    como_llegar: "En el centro de Xilitla, calle Corregidora #103, a pasos de la plaza principal; se llega a pie desde cualquier punto del Pueblo Mágico",
    que_llevar: ["cámara", "efectivo", "calzado cómodo"],
    datos_curiosos: ["Leonora Carrington (1917–2011) fue una de las grandes figuras del surrealismo y amiga de Edward James, creador de Las Pozas.", "Visitar el museo y Las Pozas el mismo día es la combinación surrealista clásica de Xilitla."],
    errores_comunes: ["Confundirlo con el Museo Leonora Carrington de la ciudad de San Luis Potosí", "Llegar en lunes, cuando suele estar cerrado"],
    lat: 21.3854, lng: -98.9908,
    imagen_hero: "", imagen_galeria: [
      "/imagenes/museo-leonora-carrington-xilitla/gallery-1.jpg",
      "/imagenes/museo-leonora-carrington-xilitla/gallery-2.jpg",
      "/imagenes/museo-leonora-carrington-xilitla/gallery-3.jpg",
      "/imagenes/museo-leonora-carrington-xilitla/gallery-4.jpg",
      "/imagenes/museo-leonora-carrington-xilitla/gallery-5.jpg",
    ],
    seo: {
      metaTitle: "Museo Leonora Carrington Xilitla | Horario y Precios 2026",
      metaDescription: "Museo Leonora Carrington en el centro de Xilitla: escultura, litografía y dibujo de la surrealista amiga de Edward James. Entrada $50 MXN, de martes a domingo.",
      keywords: ["museo leonora carrington xilitla", "leonora carrington xilitla", "que hacer en xilitla", "surrealismo xilitla", "museos huasteca potosina"],
      faqPrincipales: [
        { pregunta: "¿Cuál es el horario del Museo Leonora Carrington en Xilitla?", respuesta: "Abre de martes a domingo, de 11:00 a 17:00 horas (último acceso a las 16:30); cierra los lunes." },
        { pregunta: "¿Cuánto cuesta la entrada al museo?", respuesta: "La entrada general cuesta $50 pesos; estudiantes, maestros y adultos mayores con credencial pagan $25, y los menores de 12 años entran gratis." },
        { pregunta: "¿Está relacionado con Las Pozas de Edward James?", respuesta: "Sí. Leonora Carrington fue amiga de Edward James, el creador de Las Pozas. Visitar el museo y Las Pozas el mismo día es la combinación surrealista clásica de Xilitla." },
      ],
    },
  },
];
