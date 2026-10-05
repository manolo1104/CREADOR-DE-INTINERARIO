export interface GalleryImage {
  src: string;
  alt: string;
  hasRealPeople?: boolean;
  caption?: string;
}

/**
 * Tours donde el día NO da para todo y el cliente elige una parte del
 * recorrido al reservar. Su elección viaja a la reserva para que la operación
 * la vea sin tener que perseguirlo por WhatsApp.
 */
export interface TourEleccion {
  titulo:   string;
  opciones: { id: string; nombre: string; nota?: string }[];
}

/**
 * Un momento del día, para la sección "Tu día, hora por hora".
 *
 * Es lo que más pesa en la decisión de comprar un recorrido y lo que el sitio
 * no tenía: la ficha decía cuánto dura y qué lugares visita, pero no en qué
 * orden ni a qué hora, así que quien compara con GetYourGuide o Viator —donde
 * el itinerario por horas es lo primero que se ve— no tenía con qué.
 *
 * ⚠️ Las horas son APROXIMADAS y se validan con el guía antes de publicarlas.
 * Un recorrido sin `itinerario` no pinta la sección: no se rellena a medias.
 */
export interface TourMomento {
  /** "8:00", "8:00–9:00". Tal cual se enseña. */
  hora:    string;
  /** Titular corto del momento: "Recogida", "Canoa a Tamul". */
  momento: string;
  /** Dos o tres líneas en segunda persona, como el resto de la ficha. */
  texto:   string;
  /** Foto de la galería del propio tour. Opcional: no todos los momentos tienen. */
  foto?:   string;
}

/** Actividad opcional que se puede sumar a un tour al reservar. */
export interface TourAddOn {
  id:          string;
  nombre:      string;
  descripcion: string;
  /** MXN por persona que lo tome (no por reserva). */
  precio:      number;
}

/** Ruta off-road disponible en tours cobrados por vehículo (ej. RZR). */
export interface TourRuta {
  nombre:       string;
  duracion_hrs: number;
  descripcion:  string;
  desde:        number;     // precio del vehículo más accesible en esta ruta (MXN)
  destinos?:    string[];   // lugares que se visitan en este recorrido
  incluye?:     string[];   // extras específicos de esta ruta (ej. kayak en Nacimiento)
}

/** Vehículo de la flota; `precios` va en el MISMO orden que el array `rutas` del tour. */
export interface TourVehiculo {
  nombre:      string;
  capacidad:   string;
  descripcion: string;
  precios:     number[];
}

/**
 * Lo que va incluido en TODOS los recorridos sin excepción (decisión del dueño,
 * ago-2026). No está en el `incluye` de cada tour, así que cualquier código que
 * calcule "qué incluye" debe sumarlo — si no, acaba diciéndole al cliente que
 * un tour no tiene seguro de viaje cuando sí lo tiene.
 */
export const INCLUYE_SIEMPRE = [
  "Seguro de viaje para todos los integrantes",
  "Fotografías y video del recorrido que toma tu guía",
] as const;

/**
 * Lo mismo en inglés. Vive aquí y no en `i18n/booking.ts` para que nadie pueda
 * cambiar una lista sin ver la otra: son la misma promesa al cliente.
 */
export const INCLUYE_SIEMPRE_EN = [
  "Travel insurance for everyone in the group",
  "Photos and video of the tour, taken by your guide",
] as const;

/** Clave de comparación: sin mayúsculas, sin acentos y sin puntuación. */
export function claveIncluye(x: string): string {
  return x
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Lo que incluye un recorrido: su propio `incluye` más `INCLUYE_SIEMPRE`, ya sin
 * repeticiones.
 *
 * Todo el que quiera pintar "qué incluye" tiene que pasar por aquí. Cuando se
 * concatenaban a pelo, 5 de los 10 tours le decían al cliente dos veces "Seguro
 * de viaje para todos los integrantes" —porque también lo traían en su propio
 * `incluye`— y Tamul prometía las fotos dos veces con distinto texto. Una lista
 * que se repite no se lee como generosa, se lee como descuidada, y aparecía en
 * la pantalla de reserva, en el carrito, en el correo y en el cerebro del bot.
 *
 * Se descartan también los casi-duplicados por prefijo: entre "Fotografías y
 * video del recorrido" y "Fotografías y video del recorrido que toma tu guía"
 * gana la larga, que es la que dice quién las toma.
 *
 * ⚠️ En inglés hay que pasarle un tour YA localizado (`localizeTour`) Y el
 * locale: el `incluye` propio del tour viene de `tours.en.ts`, pero las dos
 * líneas de `INCLUYE_SIEMPRE` viven aquí y hay que traducirlas también. Sin el
 * segundo argumento, la lista salía en inglés con dos renglones en español
 * justo en la pantalla de pago.
 */
export function incluyeDeTour(t: Pick<Tour, "incluye">, locale: "es" | "en" = "es"): string[] {
  const salida: string[] = [];
  const siempre = locale === "en" ? INCLUYE_SIEMPRE_EN : INCLUYE_SIEMPRE;
  for (const item of [...(t.incluye ?? []), ...siempre]) {
    const texto = item.trim();
    if (!texto) continue;
    const clave = claveIncluye(texto);
    if (!clave) continue;

    const iguales = salida.findIndex((y) => claveIncluye(y) === clave);
    if (iguales >= 0) continue;

    // Uno contiene al otro: se queda el más específico.
    const contenido = salida.findIndex((y) => {
      const cy = claveIncluye(y);
      return cy.startsWith(clave) || clave.startsWith(cy);
    });
    if (contenido >= 0) {
      if (clave.length > claveIncluye(salida[contenido]).length) salida[contenido] = texto;
      continue;
    }
    salida.push(texto);
  }
  return salida;
}

/**
 * Lo que incluye ESTE recorrido y no todos: `incluyeDeTour` menos lo que ya
 * cubre `INCLUYE_SIEMPRE`.
 *
 * Es para quien presenta las dos listas por separado —el cerebro del bot las
 * manda como `incluye` e `incluyeSiempre`, y las dice en dos frases distintas—.
 * Sin esto, el bot le repetía al cliente "seguro de viaje" en las dos.
 */
export function incluyePropioDeTour(t: Pick<Tour, "incluye">): string[] {
  const siempre = new Set(INCLUYE_SIEMPRE.map(claveIncluye));
  return incluyeDeTour(t).filter((x) => !siempre.has(claveIncluye(x)));
}

export type TourCategoria = "ecoturismo" | "aventura" | "extremo";

/** Las tres familias de /tours, en el orden en que se muestran. */
export const TOUR_CATEGORIAS: { id: TourCategoria; label: string; labelEn: string; desc: string; descEn: string }[] = [
  { id: "ecoturismo", label: "Ecoturismo",             labelEn: "Ecotourism",
    desc: "Cascadas, selva y cultura a ritmo tranquilo.",
    descEn: "Waterfalls, jungle and culture at an easy pace." },
  { id: "aventura",   label: "Aventura",               labelEn: "Adventure",
    desc: "Canoa, kayak, buceo y off-road. Te vas a mojar.",
    descEn: "Canoe, kayak, diving and off-road. You will get wet." },
  { id: "extremo",    label: "Actividades extremas",   labelEn: "Extreme activities",
    desc: "Cuerda, casco y rápidos. Para quien busca adrenalina.",
    descEn: "Ropes, helmets and rapids. For the adrenaline seekers." },
];

/**
 * Cómo llega el cliente al recorrido.
 *
 * 🔴 Existe porque esto se decidía con `tourId === "..."` en CUATRO sitios
 * —`TourDeparture`, el punto de salida de la ficha, las dos preguntas
 * frecuentes y el cerebro del bot— y las listas ya se habían desincronizado:
 * la ficha del Edén prometía recogida "en Xilitla o Ciudad Valles" mientras su
 * propia pregunta frecuente, 300 px más abajo en la MISMA página, decía "solo
 * desde Xilitla". Con el cuarto caso especial (la Gruta de Xilo) encadenar otro
 * `&&` dejaba de ser sostenible.
 */
export type RecogidaTipo =
  /** Pasamos por él a su hospedaje, en Xilitla o en Ciudad Valles. El caso de siempre. */
  | "hospedaje"
  /** Pasamos por él SOLO si se hospeda en Xilitla; desde Valles llega por su cuenta al pueblo. */
  | "hospedaje-xilitla"
  /** Nos vemos en nuestra base de Xilitla. El transporte hasta Xilitla no se incluye. */
  | "base-xilitla"
  /** Nos vemos en el destino mismo (la laguna de la Media Luna, en Rioverde). */
  | "en-sitio";

export interface TourRecogida {
  tipo: RecogidaTipo;
  /**
   * A qué hora arranca, en decimal y reloj de 24 h: 8 = 8:00 AM, 19 = 7:00 PM,
   * 8.5 = 8:30 AM.
   *
   * 🔴 Vive al lado de `duracion_hrs` a propósito. El regreso se calcula
   * sumando la duración a esta hora, y cuando la hora estaba clavada a las 8:00
   * de la mañana dentro de `TourDeparture`, un recorrido NOCTURNO de 3 h
   * anunciaba "Regreso aprox. 11:00 AM". Quien escriba la duración de un tour
   * de noche ve este campo en la línea de al lado.
   */
  horaInicio?: number;
  /** Ancho de la ventana de salida, en horas. 1 → "Entre 8:00 y 9:00 AM". 0 → hora exacta. */
  ventanaHrs?: number;
  /** El vehículo, cuando NO es la unidad de siempre. */
  vehiculo?: { es: string; en: string };
  /** Qué hace quien se hospeda fuera de la zona de recogida. */
  nota?: { es: string; en: string };
  /**
   * Dónde nos vemos, para `en-sitio`. Sin esto, cada pantalla escribía a mano
   * "la Laguna de la Media Luna" y el primer recorrido en sitio distinto habría
   * heredado ese lugar.
   */
  lugar?: { es: string; en: string };
  /**
   * La hora cuando NO es una ventana: horarios fijos que pone un tercero (el
   * jardín de Las Pozas para el Edén). Gana a `horaInicio` en todo lo que se
   * pinta, porque "entre 7 y 8" contradice a su propia pregunta frecuente.
   */
  horaTexto?: { es: string; en: string };
}

/**
 * Lo que la ficha le dice a Google y a los buscadores de IA cuando lo generado
 * no alcanza: el título que la gente sí escribe ("Hoya de la Luz", "Cerro del
 * Pilón") y los otros nombres con que se conoce el lugar.
 *
 * 🔴 El texto escrito aquí NO lleva horas ni precios a mano: usa `{precio}` y
 * `{salida}`, que `conDatos()` resuelve desde el catálogo. Las horas de los
 * tres recorridos nuevos se inventaron una vez y se publicaron; que no vuelva a
 * pasar por un texto de SEO que nadie relee.
 */
export interface TourSeo {
  /** Cabeza del <title>. El sufijo con el precio lo sigue poniendo la plantilla. */
  titulo?: { es: string; en: string };
  /** Meta description completa (≤155). */
  descripcion?: { es: string; en: string };
  /** Otros nombres del lugar o del recorrido → `alternateName` en el JSON-LD. */
  alias?: string[];
}
export interface Tour {
  id:               string;
  nombre:           string;
  /**
   * El nombre sin el detalle que va tras el guion largo: "Expedición Tamul"
   * en vez de "Expedición Tamul — Tamul, Cueva del Agua y Sótano".
   *
   * 🔴 Hace falta porque el nombre completo se colaba en sitios donde no cabe
   * o no encaja: el `<title>` salía de 69 caracteres (Google corta en ~60) con
   * "Tamul" repetido dos veces, y las preguntas frecuentes quedaban como
   * "¿Qué incluye el Expedición Tamul — Tamul, Cueva del Agua y Sótano?".
   *
   * Además el repo derivaba esto mismo a mano en **más de treinta sitios**,
   * cada uno con su variante del separador (`split("—")` y `split(" — ")`,
   * unos con `.trim()` y otros no). Los que tienen el objeto del catálogo
   * delante usan ya este campo; los que solo reciben el nombre guardado en la
   * base —los correos, el carrito, el panel— pasan por `nombreCortoDe()`, que
   * es la misma regla escrita una vez.
   */
  nombreCorto:      string;
  /**
   * El artículo que le corresponde en español, para las frases generadas
   * ("¿Qué incluye **la** Expedición Tamul?"). Cadena vacía cuando el nombre
   * ya lo trae —"El Edén en el Jardín"— o cuando no lo lleva.
   * En inglés siempre es "the", así que no se traduce.
   */
  articulo:         "el" | "la" | "los" | "las" | "";
  slug:             string;
  tagline:          string;
  descripcion:      string;
  descripcionLarga: string;
  destinos:         string[];
  incluye:          string[];
  precio:           number;
  /** Rango de duración a mostrar (ej. [8,10] → "8–10 horas"). Si no, se usa duracion_hrs. */
  duracionRango?:   [number, number];
  /**
   * Lleva el sello de la Garantía Huasteca: los destinos más impresionantes y
   * populares de la región, los imperdibles, con servicio impecable y calidad
   * garantizada.
   *
   * Es un campo y no una lista de slugs sueltos porque el sello sale en la
   * tarjeta Y en la ficha: con una lista habría que acordarse de los dos sitios.
   */
  garantiaHuasteca?: boolean;
  /** Cómo llega el cliente. Sin esto: recogida en su hospedaje, Xilitla o Valles, 8–9 AM. */
  recogida?:        TourRecogida;
  /** Título, descripción y alias para buscadores. Ver `TourSeo`. */
  seo?:             TourSeo;
  /**
   * Precio anterior, para tacharlo junto al actual.
   *
   * Vaciado el 18 ago 2026: seis de los diez tours traían aquí un número fijo
   * que producía un "26 % OFF" permanente, sin fecha de vencimiento y sin que
   * ese precio se hubiera cobrado nunca. Un descuento que no vence le enseña al
   * visitante que esperar no cuesta nada —lo contrario de la urgencia— y en
   * México un "precio anterior" que nunca existió puede leerse como publicidad
   * engañosa. El descuento ahora vive donde está el dinero: en el segundo y el
   * tercer recorrido (`descuentoPorPosicion`).
   *
   * Volvió a ponerse en seis recorridos, y el 28 sep 2026 se le puso FECHA DE
   * FIN (`PROMO_VENCE`). Nada que lo pinte debe leer este campo a pelo: hay que
   * pasar por `precioTachado()`, que lo apaga solo cuando la promoción termina.
   */
  precioOriginal?:  number;
  /**
   * El precio de LISTA, sin la promo de temporada baja. Lo llena `TOURS_DB`;
   * sirve para cobrar cada recorrido según SU fecha (`precioDeFecha`).
   */
  precioLista?:     number;
  /**
   * Cómo se cobra el recorrido:
   *
   *   · "persona"  (default) — precio por cabeza, con tarifa de niño.
   *   · "vehiculo" — el precio es de la unidad (RZR); su propio formulario.
   *   · "grupo"    — una sola tarifa para TODO el grupo, que sube por escalones
   *     según cuánta gente va. Es como cobra la Fundación Las Pozas la
   *     experiencia privada: un grupo de 7 no paga siete veces, paga $4,160.
   *
   * Quien pinte un precio tiene que pasar por `etiquetaUnidad()`: escribir
   * "por persona" junto a una tarifa de grupo anuncia siete veces el precio.
   */
  precioUnidad?:    "persona" | "vehiculo" | "grupo";
  /**
   * Escalones de la tarifa de grupo, en MXN y por el GRUPO COMPLETO:
   * el índice 0 es una persona, el 1 son dos, y así hasta `groupMax`.
   * Solo tiene sentido con `precioUnidad: "grupo"`; `precio` guarda el primer
   * escalón para que el "desde" del catálogo siga saliendo de un solo sitio.
   */
  tarifaGrupo?:     number[];
  /**
   * Qué pasa si el cliente cancela, cuando NO aplica la promesa del sitio
   * ("cancelación gratuita 48 h antes, reembolso completo").
   *
   * 🔴 Existe por el Edén en el Jardín: la Fundación Las Pozas NO reembolsa
   * nunca —solo permite cambiar la fecha con 5 días de anticipación— y el
   * sitio prometía lo contrario en la ficha, en el JSON-LD de las FAQ y en el
   * sello de confianza. Prometer un reembolso que el proveedor no devuelve lo
   * paga la operadora de su bolsa.
   */
  cancelacion?:     { es: string; en: string };
  /**
   * Sello de exclusividad en el hero: este recorrido no se consigue con otra
   * operadora de la zona.
   *
   * ⚠️ Es una afirmación pública y comprobable. Se pone SOLO cuando el trato
   * con el proveedor lo respalda; si el proveedor vende la misma experiencia
   * por su cuenta, el sello se cae solo en cuanto alguien lo busca —el mismo
   * problema que el «ahorro» inventado de los paquetes—. Sin este campo, el
   * hero no pinta nada.
   */
  exclusivo?:       { es: string; en: string };
  rutas?:           TourRuta[];
  flota?:           TourVehiculo[];
  duracion_hrs:     number;
  icon:             string;
  tipo:             string;
  /** Familia bajo la que se agrupa el tour en /tours. `tipo` sigue siendo el
   *  subtítulo libre de la tarjeta; esto es la pestaña a la que pertenece. */
  categoria:        TourCategoria;
  dificultad:       "baja" | "media" | "alta";
  imagen_hero:      string;
  /**
   * `object-position` de la foto en el hero de la ficha. El hero de escritorio
   * mide ≈2.7:1, así que de una foto VERTICAL solo se ve una franja; sin esto
   * es la del centro. Ej.: "50% 28%" sube la franja hacia la cascada.
   */
  posicionHero?:    string;
  /** Foto de la tarjeta grande de «favoritos» en /tours. Sin esto, `imagen_hero`.
   *  (Las tarjetas del inicio y de la rejilla de /tours salen de `collage[0]`.) */
  imagenTarjeta?:   string;
  /**
   * Corte VERTICAL (720×1280) para el fondo del hero, y SOLO en teléfonos.
   * Sin esto, el hero usa `imagen_hero` y se comporta igual que siempre.
   *
   * ⚠️ El nombre lleva "Movil" a propósito: en escritorio y en tableta se sigue
   * viendo la foto, siempre. Un archivo apaisado aquí NO se va a ver en
   * escritorio, y la caja del hero de una tableta (768×614) se come el 55 % de
   * un cuadro vertical. Ver `src/components/HeroTourMedia.tsx`.
   *
   * Clips CORTOS y MUDOS (10–20 s, sin pista de audio: un MP4 con audio, aunque
   * vaya en silencio, puede robarle a iOS el control de la música del usuario).
   * El nombre lleva versión (`-v1`) porque /videos se sirve con caché inmutable
   * de un año: un vídeo nuevo va con otro nombre, nunca encima.
   */
  videoHeroMovil?:  string;
  /**
   * Logotipo propio del tour (letras con el paisaje dentro), sin fondo.
   * ⚠️ Desde el 28 sep 2026 solo se PINTA en el inicio (`conLogo` en
   * `TourCard`). En /tours y /experiencias ya no sale. Y el sello que
   * llevaba la tarjeta ya no es `TourEmblem` —que dibujaba el lugar y quedó
   * sin usar— sino el de la Garantía Huasteca, que va por `garantiaHuasteca`.
   * Cómo se prepara uno nuevo: `scripts/README-logos.md`.
   */
  logo?:            string;
  /**
   * Las fotos del collage de la tarjeta, UNA POR DESTINO y en el mismo orden
   * que `destinos`. Sin esto se tomaban las primeras de la galería, que suelen
   * ser tres fotos del mismo sitio: la tarjeta enseñaba tres veces la cascada
   * y ninguna de la cueva ni del sótano.
   *
   * Una entrada puede ser la ruta sola o `{ src, pos }`, donde `pos` mueve el
   * encuadre dentro de la franja (`object-position`) para que no se quede
   * fuera lo que da sentido a la foto.
   */
  collage?:         (string | { src: string; pos?: string })[];
  imagenes:         string[];
  urgencia?:        string;
  reviewCount:      number;
  groupMin:         number;
  groupMax:         number;
  privateAvailable: boolean;
  /** true = actividad solo para adultos/edad mínima alta (oculta selectores de niños en la reserva). */
  soloAdultos?:     boolean;
  gallery:          GalleryImage[];
  /** Actividades opcionales que se ofrecen al reservar este tour. */
  addOns?:          TourAddOn[];
  /** El día hora por hora. Sin esto, la sección no se pinta. */
  itinerario?:      TourMomento[];
  /** Elección obligatoria al reservar (ej. Ruta Acuática). */
  eleccion?:        TourEleccion;
}

/**
 * Lo que cuesta el GRUPO COMPLETO con `personas` dentro, para los recorridos de
 * tarifa por escalones. `null` si el recorrido no se cobra así.
 *
 * Una sola definición para el navegador y para el servidor: el módulo de
 * reserva pinta con esto y `computeTourCharge` vuelve a cobrarlo con esto. Si
 * cada uno hiciera su cuenta, el cliente vería un total y pagaría otro.
 */
export function precioGrupo(t: Pick<Tour, "tarifaGrupo">, personas: number): number | null {
  const tabla = t.tarifaGrupo;
  if (!tabla?.length) return null;
  const n = Math.min(Math.max(1, Math.floor(personas) || 1), tabla.length);
  return tabla[n - 1] ?? null;
}

/**
 * ¿Se cobra por cabeza? Las listas que hablan de "precio por persona" —la tabla
 * de /precios, el rango "desde X hasta Y"— tienen que filtrar con esto y no con
 * `!== "vehiculo"`: una tarifa de grupo de $2,990 metida ahí subía el techo del
 * rango y anunciaba por cabeza lo que cuesta el grupo entero.
 */
export function esPorPersona(t: Pick<Tour, "precioUnidad">): boolean {
  return t.precioUnidad === undefined || t.precioUnidad === "persona";
}

/**
 * Último día de RECORRIDO con la promo de temporada baja (inclusive).
 *
 * 🔴 4 oct 2026, Manolo: la promo depende de la FECHA DEL TOUR, no del día en
 * que se compra. Un recorrido el 29 de octubre lleva el descuento; uno el 5 de
 * noviembre paga precio normal aunque se reserve hoy (es lo mismo que ya hacía
 * el panel). Y el cambio es automático: nadie tiene que desplegar el 30.
 *
 * 🔴 Existe porque el "10 % OFF" no tenía fecha. Un descuento que no vence no
 * es una promoción, es el precio de siempre con un adorno: le enseña al
 * visitante que esperar no cuesta nada —justo lo contrario de la urgencia que
 * busca— y en México un "precio anterior" permanente puede leerse como
 * publicidad engañosa. Para prorrogarlo basta con mover esta fecha; para
 * retirarlo, ponerle una pasada.
 */
export const PROMO_VENCE = "2026-10-29";

/**
 * Promo de temporada baja (decisión de Manolo, 29 sep 2026): $100 menos POR
 * PERSONA en estos seis recorridos, para recorridos hasta el 29 oct.
 *
 * - Lo que se COBRA sale de `precioDeFecha(tour, fecha)`: con la fecha del
 *   recorrido, no con la de hoy (decisión del 4 oct).
 * - Lo que se ANUNCIA («desde», tachado, descripciones, JSON-LD) sale de
 *   `TOURS_DB[i].precio`, que es un getter: vale el precio con promo mientras
 *   todavía se pueda reservar una fecha con promo, y el de lista después, sin
 *   reiniciar el proceso. Las páginas estáticas que lo pintan se regeneran
 *   cada hora (`revalidate`).
 */
export const PROMO_TEMPORADA = {
  monto: 100,
  hastaTexto: { es: "29 de octubre", en: "October 29" },
  tours: new Set([
    "expedicion-tamul",
    "cascadas-del-meco",
    "paraiso-escalonado-minas-micos",
    "ruta-acuatica-puente-de-dios",
    "ruta-surrealista-edward-james",
    "rafting-rio-tampaon",
  ]),
} as const;

/** ¿Sigue viva la promoción hoy, en horario de México? (Para anunciarla.) */
export function promoVigente(): boolean {
  const hoyMX = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
  return hoyMX <= PROMO_VENCE;
}

/** ¿Un recorrido en esta fecha lleva la promo? Sin fecha, lo que se anuncia hoy. */
export function fechaConPromo(fecha?: string | null): boolean {
  return fecha ? fecha <= PROMO_VENCE : promoVigente();
}

/**
 * Lo que cuesta por persona un recorrido EN UNA FECHA: el de lista, menos la
 * promo de temporada baja si el recorrido cae hasta el 29 de octubre. Es el
 * precio que cobran el carrito, el checkout de un tour y los paquetes.
 */
export function precioDeFecha(t: Pick<Tour, "slug" | "precio" | "precioLista">, fecha?: string | null): number {
  const lista = t.precioLista ?? t.precio;
  const enPromo = (PROMO_TEMPORADA.tours as ReadonlySet<string>).has(t.slug) && fechaConPromo(fecha);
  return enPromo ? lista - PROMO_TEMPORADA.monto : lista;
}

/**
 * El mismo recorrido con `precio` resuelto para una fecha, para pasárselo a
 * `totalRecorrido` y a todo lo que lee `precio`. Sin fecha (un renglón del
 * carrito que todavía no la elige) vale lo que se anuncia hoy.
 */
export function tourEnFecha<T extends Tour>(t: T, fecha?: string | null): T {
  return { ...t, precio: precioDeFecha(t, fecha) };
}

/**
 * Lo que ahorra HOY este recorrido, para pintar la insignia de temporada baja.
 * Sale de la diferencia real precio/precioOriginal, no de una cifra aparte.
 */
export function promoDe(t: Pick<Tour, "precio" | "precioOriginal">): { monto: number; hastaTexto: { es: string; en: string } } | null {
  const tachado = precioTachado(t);
  return tachado ? { monto: tachado - t.precio, hastaTexto: PROMO_TEMPORADA.hastaTexto } : null;
}

/**
 * El precio anterior que se tacha, o `null` si no hay que enseñar ninguno.
 *
 * Es el ÚNICO camino permitido para pintar un descuento: devuelve null cuando
 * la promoción ha vencido, así que las cuatro pantallas que lo muestran se
 * apagan solas el 2 de noviembre sin que nadie tenga que acordarse.
 */
export function precioTachado(t: Pick<Tour, "precio" | "precioOriginal">): number | null {
  if (!t.precioOriginal || t.precioOriginal <= t.precio) return null;
  return promoVigente() ? t.precioOriginal : null;
}

/**
 * El nombre corto a partir de un nombre guardado (reservas, correos, carrito),
 * donde no hay objeto del catálogo del que leer `nombreCorto`.
 *
 * Acepta las dos formas del separador que conviven en los datos viejos: el
 * guion largo con espacios y sin ellos.
 */
export function nombreCortoDe(nombre: string): string {
  return nombre.split("—")[0].trim();
}

/** Qué se escribe junto al precio: "por persona", "por vehículo" o "por grupo". */
export function etiquetaUnidad(t: Pick<Tour, "precioUnidad">, en = false): string {
  if (t.precioUnidad === "vehiculo") return en ? "per vehicle" : "por vehículo";
  if (t.precioUnidad === "grupo")    return en ? "per group"   : "por grupo";
  return en ? "per person" : "por persona";
}

/** [min, max] de duración para mostrar: usa duracionRango, o el rango de las rutas (RZR), o el número. */
export function tourDurRange(t: Pick<Tour, "duracionRango" | "rutas" | "duracion_hrs">): [number, number] {
  if (t.duracionRango) return t.duracionRango;
  if (t.rutas && t.rutas.length) {
    const hs = t.rutas.map((r) => r.duracion_hrs);
    return [Math.min(...hs), Math.max(...hs)];
  }
  return [t.duracion_hrs, t.duracion_hrs];
}

/** Texto corto de duración: "9h" o "8–10h". */
export function tourDurTexto(t: Pick<Tour, "duracionRango" | "rutas" | "duracion_hrs">, unidad = "h"): string {
  const [a, b] = tourDurRange(t);
  return a === b ? `${a}${unidad}` : `${a}–${b}${unidad}`;
}

/** Lo que se asume cuando un tour no declara `recogida`: lo que hacen casi todos. */
const RECOGIDA_DEFAULT = { tipo: "hospedaje" as RecogidaTipo, horaInicio: 8, ventanaHrs: 1 };

/** La recogida de un tour con los valores por defecto ya aplicados. */
export function recogidaDeTour(t: Pick<Tour, "recogida">) {
  const r = t.recogida;
  return {
    tipo:       r?.tipo       ?? RECOGIDA_DEFAULT.tipo,
    horaInicio: r?.horaInicio ?? RECOGIDA_DEFAULT.horaInicio,
    ventanaHrs: r?.ventanaHrs ?? RECOGIDA_DEFAULT.ventanaHrs,
    vehiculo:   r?.vehiculo,
    nota:       r?.nota,
    lugar:      r?.lugar,
    horaTexto:  r?.horaTexto,
  };
}

/**
 * Una hora decimal en reloj de 12 h: 8 → "8:00 AM", 20.5 → "8:30 PM".
 * Da la vuelta a medianoche, que es justo lo que hace falta para los recorridos
 * de noche. (Era `fmtHora` dentro de `export-bot-data.ts`; vive aquí para que
 * el sitio y el bot no puedan decir horas distintas.)
 */
export function fmtHora12(dec: number): string {
  const t = ((dec % 24) + 24) % 24;
  const h = Math.floor(t);
  const m = Math.round((t - h) * 60);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

/**
 * Junta dos horas en un rango quitando el meridiano del primero SOLO si
 * coincide con el del segundo.
 *
 * 🔴 El código anterior lo quitaba siempre (`.replace(/ (AM|PM)–/, "–")`), así
 * que un rango de 11:00 AM a 1:00 PM salía como "11:00–1:00 PM", que cualquiera
 * lee como las once de la noche.
 */
function rango12(a: string, b: string, sep: string): string {
  const aCorto = a.slice(-2) === b.slice(-2) ? a.slice(0, -3) : a;
  return `${aCorto}${sep}${b}`;
}

/** "Entre 8:00 y 9:00 AM" · "A las 7:00 PM" cuando la ventana es de cero. */
export function ventanaSalida(t: Pick<Tour, "recogida">, en: boolean): string {
  const { horaInicio, ventanaHrs, horaTexto } = recogidaDeTour(t);
  if (horaTexto) return en ? horaTexto.en : horaTexto.es;
  if (ventanaHrs <= 0) {
    return en ? `At ${fmtHora12(horaInicio)}` : `A las ${fmtHora12(horaInicio)}`;
  }
  const rango = rango12(fmtHora12(horaInicio), fmtHora12(horaInicio + ventanaHrs), en ? " and " : " y ");
  return en ? `Between ${rango}` : `Entre ${rango}`;
}

/**
 * Hora de regreso: la de salida más la duración real del recorrido.
 *
 * 🔴 Estaba clavada en "6:00–7:00 PM" para los once tours; al corregir Tamul a
 * 12–13 h prometía las siete cuando el recorrido termina a las nueve. Después
 * pasó a derivarse, pero sumando siempre desde las 8:00 AM, así que un tour
 * NOCTURNO de 3 h anunciaba un regreso a las 11 de la mañana.
 */
export function regresoDeTour(
  t: Pick<Tour, "recogida" | "duracionRango" | "rutas" | "duracion_hrs">,
  en: boolean,
): string {
  const { horaInicio, horaTexto } = recogidaDeTour(t);
  const [durMin, durMax] = tourDurRange(t);
  // Con horarios fijos que cambian según el día no hay UNA hora de regreso:
  // se dice cuánto dura desde que empieza.
  if (horaTexto) {
    const dur = durMin === durMax ? `${durMax}` : `${durMin}–${durMax}`;
    // Va debajo de "Regreso aprox.": el "aprox." ya lo pone la etiqueta.
    return en ? `${dur} h after the start` : `${dur} h después de empezar`;
  }
  const finMax = horaInicio + durMax;
  const siguiente = finMax >= 24 ? (en ? " (next day)" : " (del día siguiente)") : "";
  const a = fmtHora12(horaInicio + durMin);
  if (durMin === durMax) return a + siguiente;
  return rango12(a, fmtHora12(finMax), "–") + siguiente;
}

/**
 * La hora de salida en corto y sin verbo, para etiquetas y listas: "7:00 PM",
 * "3:00–4:00 AM", "8:00–9:00 AM". `null` cuando no hay hora pública (el buceo:
 * se llega por cuenta propia a la laguna).
 */
export function salidaCorta(t: Pick<Tour, "recogida">, en = false): string | null {
  const { tipo, horaInicio, ventanaHrs, horaTexto } = recogidaDeTour(t);
  if (horaTexto) return en ? horaTexto.en : horaTexto.es;
  if (tipo === "en-sitio") return null;
  if (ventanaHrs <= 0) return fmtHora12(horaInicio);
  return rango12(fmtHora12(horaInicio), fmtHora12(horaInicio + ventanaHrs), "–");
}

/** Las piezas con que se arma cualquier frase de recogida. */
export interface PartesRecogida {
  tipo: RecogidaTipo;
  /** Para media frase: "a las 7:00 PM" · "entre 3:00 y 4:00 AM" · null si no hay hora pública. */
  hora: string | null;
  /** "tu hospedaje en Xilitla" · "tu hospedaje en Xilitla o Ciudad Valles" · "nuestra base en Xilitla" · el lugar en sitio. */
  lugar: string;
  /** "RZR" cuando no es la camioneta de siempre. */
  vehiculo: string | null;
  /** Qué pasa con Ciudad Valles cuando solo recogemos en Xilitla. Sin montos: se cotiza. */
  valles: string | null;
  /** ¿El precio incluye que pasemos por él? */
  incluyeTraslado: boolean;
}

/**
 * Cómo llega el cliente a ESTE recorrido, en piezas.
 *
 * 🔴 Existe porque el resto del sitio decía "pasamos por ti entre las 8:00 y
 * las 9:00 AM en Xilitla o Ciudad Valles" para TODOS los recorridos: la frase
 * de la ficha, el pago, el correo de confirmación y el bot. Con la Gruta de
 * Xilo —que sale a las 7 de la NOCHE y solo recoge en Xilitla— eso mandaba al
 * cliente a esperar de mañana y le prometía gratis un traslado desde Valles
 * que se cobra aparte. `TourDeparture` ya leía `recogida`; lo demás, no.
 */
export function partesRecogida(t: Pick<Tour, "recogida">, en: boolean): PartesRecogida {
  const rec = recogidaDeTour(t);
  const v = ventanaSalida(t, en);
  const hora = rec.tipo === "en-sitio"
    ? null
    : rec.horaTexto
      // Horario fijo que pone un tercero: pasamos por él a tiempo para esa hora.
      ? (en ? `in time for its fixed start (${rec.horaTexto.en})` : `a tiempo para su horario fijo (${rec.horaTexto.es})`)
      : v.charAt(0).toLowerCase() + v.slice(1);
  const lugar =
    rec.tipo === "hospedaje"
      ? (en ? "your lodging in Xilitla or Ciudad Valles" : "tu hospedaje en Xilitla o Ciudad Valles")
    : rec.tipo === "hospedaje-xilitla"
      ? (en ? "your lodging in Xilitla" : "tu hospedaje en Xilitla")
    : rec.tipo === "base-xilitla"
      ? (en ? "our base in Xilitla" : "nuestra base en Xilitla")
      : (rec.lugar ? (en ? rec.lugar.en : rec.lugar.es) : (en ? "the meeting point of the tour" : "el punto de encuentro del recorrido"));
  return {
    tipo: rec.tipo,
    hora,
    lugar,
    vehiculo: rec.vehiculo ? (en ? rec.vehiculo.en : rec.vehiculo.es) : null,
    valles: rec.tipo === "hospedaje-xilitla"
      ? (en
          ? "From Ciudad Valles the transfer costs extra — we'll quote it on WhatsApp."
          : "Desde Ciudad Valles el traslado tiene costo adicional: te lo cotizamos por WhatsApp.")
      : null,
    incluyeTraslado: rec.tipo === "hospedaje" || rec.tipo === "hospedaje-xilitla",
  };
}

/**
 * La recogida de un recorrido en una o dos frases completas, en segunda
 * persona. Es lo que se le dice al cliente en el pago, en el correo y en el
 * bot:
 *
 *   Gruta:  "Pasamos por ti a tu hospedaje en Xilitla, en RZR, a las 7:00 PM.
 *            Desde Ciudad Valles el traslado tiene costo adicional: te lo
 *            cotizamos por WhatsApp."
 *   Tamul:  "Pasamos por ti a tu hospedaje en Xilitla o Ciudad Valles entre
 *            8:00 y 9:00 AM."
 *   RZR:    "Nos vemos en nuestra base en Xilitla entre 8:00 y 9:00 AM. El
 *            transporte hasta Xilitla no está incluido."
 *   Buceo:  "Nos vemos en la entrada de la Laguna de la Media Luna, en
 *            Rioverde; llegas por tu cuenta."
 */
export function fraseRecogida(t: Pick<Tour, "recogida">, en: boolean): string {
  const p = partesRecogida(t, en);
  const hora = p.hora ? ` ${p.hora}` : "";
  const veh = p.vehiculo ? (en ? `, in an ${p.vehiculo},` : `, en ${p.vehiculo},`) : "";
  if (p.tipo === "en-sitio") {
    return en ? `We meet at ${p.lugar}; you make your own way there.` : `Nos vemos en ${p.lugar}; llegas por tu cuenta.`;
  }
  if (p.tipo === "base-xilitla") {
    return en
      ? `We meet at ${p.lugar}${hora}. Transport to Xilitla isn't included.`
      : `Nos vemos en ${p.lugar}${hora}. El transporte hasta Xilitla no está incluido.`;
  }
  const base = en ? `We pick you up at ${p.lugar}${veh}${hora}.` : `Pasamos por ti a ${p.lugar}${veh}${hora}.`;
  return p.valles ? `${base} ${p.valles}` : base;
}

/**
 * Resuelve `{precio}` y `{salida}` en un texto escrito a mano (SEO, preguntas
 * frecuentes) con los datos del catálogo. Así el texto no puede quedarse con
 * una hora o un precio viejos cuando cambie el recorrido.
 */
export function conDatos(texto: string, t: Pick<Tour, "precio" | "recogida">, locale: "es" | "en" = "es"): string {
  return conPrecio(texto, t.precio, locale).replace(/\{salida\}/g, salidaCorta(t, locale === "en") ?? "");
}

/**
 * Las imágenes del collage de la tarjeta en /tours: una por parada del
 * recorrido y en el orden en que se visitan.
 *
 * Si el tour trae `collage` (la lista curada a mano) se usa esa. Si no, se cae
 * al hero más la galería, que era lo único que había antes y solía dar tres
 * fotos del mismo sitio.
 */
export function tourCollage(
  t: Pick<Tour, "imagen_hero" | "imagenes" | "gallery" | "destinos" | "collage">,
): { src: string; alt?: string; pos?: string }[] {
  const alts = new Map((t.gallery ?? []).map((g) => [g.src, g.alt]));

  // Hasta CUATRO cuando la lista está curada a mano: hay recorridos de cuatro
  // paradas. El relleno automático de abajo se queda en tres, porque ahí las
  // fotos salen de la galería y la cuarta suele repetir sitio.
  if (t.collage?.length) {
    return t.collage.slice(0, 4).map((e) => {
      const { src, pos } = typeof e === "string" ? { src: e, pos: undefined } : e;
      return { src, alt: alts.get(src), pos };
    });
  }

  const vistos = new Set<string>();
  const pool: { src: string; alt?: string }[] = [];
  const meter = (src?: string) => {
    if (!src || vistos.has(src)) return;
    vistos.add(src);
    pool.push({ src, alt: alts.get(src) });
  };
  meter(t.imagen_hero);
  for (const g of t.gallery ?? []) meter(g.src);
  for (const src of t.imagenes ?? []) meter(src);

  const quiere = (t.destinos?.length ?? 0) >= 3 ? 3 : 2;
  return pool.slice(0, Math.min(quiere, pool.length));
}

/**
 * Orden real de venta, del panel de admin (corte del 10 sep 2026): reservas
 * pagadas e ingreso por tour. Manda en /tours dentro de cada categoría y en
 * todo lo que muestre "destacados".
 *
 *   expedicion-tamul                 37   $170,373
 *   cascadas-del-meco                21   $109,990
 *   ruta-surrealista-edward-james    16   $54,370
 *   ruta-acuatica-puente-de-dios     12   $57,256
 *   paraiso-escalonado-minas-micos    8   $32,817
 *   rzr-xilitla                       2   $7,600
 *   travesia-del-cafe                 0
 *
 * Los tres que no aparecen en el corte (rappel, rafting, buceo) van al final.
 * Antes esta lista se había escrito a mano y ponía el RZR entre los cuatro
 * destacados con 2 reservas, por delante de las Cascadas del Meco con 21.
 */
export const TOURS_RANKING = [
  "expedicion-tamul",
  "cascadas-del-meco",
  "ruta-surrealista-edward-james",
  "ruta-acuatica-puente-de-dios",
  "paraiso-escalonado-minas-micos",
  "rzr-xilitla",
  "travesia-del-cafe",
] as const;

/** Posición en el ranking; lo que no vendió nada va al final, no al principio. */
export function rankTour(slug: string): number {
  const i = (TOURS_RANKING as readonly string[]).indexOf(slug);
  return i === -1 ? TOURS_RANKING.length : i;
}

/** Los cuatro que más venden. Se derivan del ranking: una sola fuente. */
export const TOURS_DESTACADOS: readonly string[] = TOURS_RANKING.slice(0, 4);

/**
 * El catálogo EN CRUDO. No se exporta a propósito: las descripciones todavía
 * traen el marcador `{precio}` sin resolver. Lo que consume el sitio es
 * `TOURS_DB`, más abajo, que es este mismo catálogo con los precios ya puestos.
 */
const TOURS_RAW: Tour[] = [
  {
    id:               "tour-rzr-xilitla",
    slug:             "rzr-xilitla",
    categoria:        "aventura",
    icon:             "Compass",
    tipo:             "Aventura Off-Road",
    dificultad:       "media",
    duracion_hrs:     2,
    /* Nos vemos en la base de Xilitla: el cliente llega por su cuenta. */
    recogida:         { tipo: "base-xilitla" },
    reviewCount:      86,
    groupMin:         2,
    groupMax:         6,
    privateAvailable: false,
    nombre:           "Recorrido en RZR por Xilitla — Elige tu Ruta Off-Road",
    nombreCorto:      "Recorrido en RZR por Xilitla",
    articulo:         "el",
    tagline:          "Maneja tu propio todoterreno entre selva, ríos y barro — 4 rutas, de 2 a 5 horas",
    precio:           1600,
    precioUnidad:     "vehiculo",
    urgencia:         "Precio por vehículo, no por persona — 4 rutas para elegir",
    // El "desde" va como `{precio}` y no escrito a mano (lo resuelve
    // `conPrecio`): `precio` ES la tarifa más baja de la flota, el RZR 500 en
    // la Ruta Nanacatli. Si cambia, las dos descripciones cambian con él.
    descripcion:      "Maneja tu propio vehículo todoterreno por la selva húmeda de Xilitla: cruza ríos de agua cristalina, atraviesa el barro y elige entre 4 rutas — la Aldea Nanacatli (el pueblo de casitas de hongos), los miradores de la sierra, un nacimiento escondido en la selva (con kayak) o el bosque de niebla de La Trinidad. El precio es por vehículo (desde {precio}), no por persona.",
    descripcionLarga: "Pocas formas de conocer la Huasteca son tan divertidas como ir al volante de tu propio vehículo todoterreno. Tenemos 4 rutas distintas: la Nanacatli (2 h, la más popular, llega a la Aldea Nanacatli, un pueblo de casitas de hongos gigantes conocido como 'la aldea de los pitufos'), la de Miradores (3 h, vistas panorámicas de la sierra), la del Nacimiento (5 h, un nacimiento de agua cristalina en lo profundo de la selva donde te prestamos kayak y chaleco salvavidas) y la de Trinidad (5 h, sube al bosque de niebla de La Trinidad, un pueblo serrano preservado en el tiempo).\n\nNos encontramos en nuestra base en Xilitla, donde te entregamos casco y goggles y te damos un briefing de manejo. No necesitas experiencia: los vehículos son fáciles de controlar y un guía instructor abre la ruta delante de ti todo el tiempo, marcando el camino y resolviendo cualquier obstáculo. Tú solo te concentras en disfrutar.\n\nEl precio es POR VEHÍCULO, no por persona, y depende de la ruta y de la unidad que elijas: desde el RZR 500 para pareja ({precio} la Ruta Nanacatli) hasta el Defender Familiar para 6 adultos y 2 niños o el Polaris Pro S premium. Todas las unidades incluyen gasolina, equipo de seguridad y guía. No incluye transporte hasta Xilitla ni alimentos.\n\nTe recomendamos ropa que se pueda ensuciar y mojar, calzado cerrado y una muda de cambio: vas a salir con barro y con una sonrisa difícil de borrar.",
    rutas: [
      { nombre: "Ruta Nanacatli",  duracion_hrs: 2, desde: 1600, descripcion: "La más popular de Xilitla y perfecta para primerizos. Te adentras en la selva húmeda, cruzas ríos de agua cristalina y llegas a la Aldea Nanacatli, un pintoresco pueblo de casitas de hongos gigantes —la famosa 'aldea de los pitufos'—, ideal para fotos. Barro, naturaleza y adrenalina en dos horas.",
        destinos: ["Aldea Nanacatli (aldea de los pitufos)", "Mirador Xilitla", "Túnel Tlahuilapa", "Camino Antiguo a las Pozas", "Xilitla Pueblo Mágico", "Jardín Surrealista (por fuera)"] },
      { nombre: "Ruta Miradores",  duracion_hrs: 3, desde: 2600, descripcion: "Sube a los puntos más altos de la sierra y contempla vistas panorámicas que te quitarán el aliento. La Huasteca Potosina desde las alturas, con la selva extendiéndose hasta donde alcanza la vista, pasando también por la Aldea Nanacatli. Perfecta para fotos épicas.",
        destinos: ["Aldea Nanacatli (aldea de los pitufos)", "Mirador Xilitla", "Mirador Cerro Quebrado", "Túnel Tlahuilapa", "Camino Antiguo a las Pozas", "Xilitla Pueblo Mágico", "Jardín Surrealista (por fuera)"] },
      { nombre: "Ruta Nacimiento", duracion_hrs: 5, desde: 3800, descripcion: "La aventura más completa. Llegas a un nacimiento de agua cristalina escondido en lo profundo de la selva —el Nacimiento Xilitla-Huichihuayán— y ahí te prestamos kayak y chaleco salvavidas para que disfrutes el agua. En el camino visitas la Cueva de las Quilas y varios miradores. Un paraíso secreto imposible de alcanzar sin estos vehículos.",
        incluye: ["Préstamo de kayak y chaleco salvavidas para la actividad en el nacimiento"],
        destinos: ["Nacimiento Xilitla-Huichihuayán", "Cueva de las Quilas", "Mirador Xilitla", "Túnel Tlahuilapa", "Camino Antiguo a las Pozas", "Xilitla Pueblo Mágico", "Jardín Surrealista (por fuera)"] },
      { nombre: "Ruta Trinidad",   duracion_hrs: 5, desde: 3800, descripcion: "Historia, cultura y naturaleza en un solo recorrido. Caminos de sierra que suben hasta el bosque de niebla de La Trinidad, un pueblo serrano preservado en el tiempo, con parada en la Aldea Nanacatli (la aldea de los pitufos) y en varios miradores. El recorrido más alto y verde de Xilitla.",
        destinos: ["Bosque de niebla La Trinidad", "Aldea Nanacatli (aldea de los pitufos)", "Mirador Xilitla", "Túnel Tlahuilapa", "Camino Antiguo a las Pozas", "Xilitla Pueblo Mágico", "Jardín Surrealista (por fuera)"] },
    ],
    flota: [
      { nombre: "RZR 500",           capacidad: "2 adultos + 1 niño",  descripcion: "Ágil, deportivo y lleno de carácter. Ideal para parejas o familia pequeña.",                          precios: [1600, 2600, 3800, 3800] },
      { nombre: "Can-Am 800",        capacidad: "2 adultos",           descripcion: "La bestia canadiense. Potencia brutal para dos aventureros que buscan emociones extremas.",          precios: [1600, 2600, 3800, 3800] },
      { nombre: "RZR 900",           capacidad: "4 adultos",           descripcion: "El doble de potencia, el doble de emoción. Para grupos de 4 que no le temen a nada.",                precios: [1900, 2800, 4500, 4500] },
      { nombre: "Defender",          capacidad: "6 adultos",           descripcion: "Robusto, confiable y espacioso. Comodidad sin sacrificar aventura.",                                 precios: [2200, 3000, 5000, 5000] },
      { nombre: "Defender Familiar", capacidad: "6 adultos + 2 niños", descripcion: "El más grande de la flota. Diseñado para familias completas o grupos.",                              precios: [2500, 3400, 6000, 6000] },
      { nombre: "Maverick X3",       capacidad: "4 adultos",           descripcion: "El más rápido y adrenalínico. Suspensión de competencia para amantes de la velocidad.",              precios: [2500, 3500, 5500, 5500] },
      { nombre: "Polaris Pro S",     capacidad: "4 adultos",           descripcion: "La experiencia premium. Tecnología de punta, potencia extraordinaria y acabados de lujo.",           precios: [3500, 4500, 7000, 7000] },
    ],
    destinos: [
      "Base en Xilitla (punto de encuentro)",
      "Aldea Nanacatli — casitas de hongos (Ruta Nanacatli · 2 h)",
      "Miradores de la sierra (Ruta Miradores · 3 h)",
      "Nacimiento escondido con kayak (Ruta Nacimiento · 5 h)",
      "Bosque de niebla de La Trinidad (Ruta Trinidad · 5 h)",
    ],
    incluye: [
      "Vehículo todoterreno con gasolina incluida",
      "Casco y goggles de seguridad para cada tripulante",
      "Guía instructor que abre y marca la ruta",
      "Briefing de manejo — apto para principiantes",
      "4 rutas a elegir: Nanacatli, Miradores, Nacimiento o Trinidad",
    ],
    imagen_hero: "/imagenes/tours/rzr-xilitla/hero.jpg",
    collage: [
      "/imagenes/tours/rzr-xilitla/gallery-3.jpg",
      "/imagenes/tours/rzr-xilitla/gallery-1.jpg",
      "/imagenes/tours/rzr-xilitla/gallery-2.jpg",
    ],
    imagenes: ["/imagenes/tours/rzr-xilitla/hero.jpg", "/imagenes/tours/rzr-xilitla/gallery-1.jpg"],
    gallery: [
      { src: "/imagenes/tours/rzr-xilitla/gallery-1.jpg", alt: "Grupo de amigos posando sobre un RZR Pro en un mirador de montaña durante el recorrido off-road en Xilitla", hasRealPeople: true },
      { src: "/imagenes/tours/rzr-xilitla/gallery-2.jpg", alt: "Vehículo todoterreno RZR Pro de perfil con las montañas verdes de Xilitla al fondo", hasRealPeople: false },
      { src: "/imagenes/tours/rzr-xilitla/gallery-3.jpg", alt: "Vehículo todoterreno Polaris en el punto de salida del recorrido off-road, con guías y banderas de la base en Xilitla", hasRealPeople: true },
      { src: "/imagenes/tours/rzr-xilitla/gallery-4.jpg", alt: "Vehículo Can-Am Maverick X3 con neumáticos de barro listo en el punto de encuentro del tour off-road", hasRealPeople: false },
    ],
  },
  {
    id:               "tour-rappel-tamul",
    slug:             "rappel-tamul",
    categoria:        "extremo",
    icon:             "Mountain",
    tipo:             "Aventura Extrema",
    dificultad:       "alta",
    duracion_hrs:     5,
    reviewCount:      58,
    groupMin:         4,
    groupMax:         10,
    privateAvailable: false,
    nombre:           "Rappel en la Cascada de Tamul — Descenso Frente a la Cascada Más Alta de San Luis Potosí",
    nombreCorto:      "Rappel en la Cascada de Tamul",
    articulo:         "el",
    tagline:          "Adrenalina pura colgado de la pared, frente a 105 metros de agua",
    precio:           1700,
    // 🔴 Decía "máximo 8 personas por día" justo debajo del "máximo 10 personas
    // por salida" que la ficha lee de `groupMax`: dos cupos distintos en la
    // misma pantalla. La urgencia ya no lleva cifra; el cupo sale solo de
    // `groupMax`. (Pendiente de Manolo: si el tope real es 8, se baja ahí.)
    urgencia:         "Grupo chico por seguridad — se reserva con anticipación",
    descripcion:
      "Desciende en rappel por la pared del cañón del Tampaón con la Cascada de Tamul rugiendo a tu lado. Equipo profesional, guías certificados y la fotografía aérea con dron que demuestra que sí lo hiciste. La experiencia más extrema de la Huasteca Potosina, apta también para quienes nunca han hecho rappel.",
    descripcionLarga:
      "Hay pocos lugares en el mundo donde puedas colgarte de una cuerda frente a una cascada de 105 metros. La Cascada de Tamul —105 metros de agua desplomándose sobre el Río Tampaón— es el telón de fondo de esta experiencia, y desde el momento en que te asomas al borde del cañón entiendes por qué quienes la hacen no dejan de hablar de ella.\n\nTe recogemos en Ciudad Valles y empezamos en el embarcadero del río, donde te entregamos el equipo completo y nuestros guías de alta montaña te dan el briefing de técnica. No necesitas experiencia previa: el primer descenso es guiado paso a paso y la mayoría de nuestros visitantes nunca habían tocado una cuerda antes. Lo único que necesitas son ganas.\n\nUna vez asegurado al arnés, comienzas a bajar por la pared de roca caliza tapizada de vegetación, con la cascada a un costado lanzando su rocío fresco sobre ti y el agua turquesa del río esperándote abajo. El sonido es ensordecedor, el paisaje es irreal y, durante esos minutos, no existe nada más en el mundo. Nuestro fotógrafo te sigue desde el aire con dron y desde tierra, así que cada segundo queda registrado en foto y video —incluido en tu reserva, sin costo extra.\n\nLa actividad dura entre 3 y 5 horas según el grupo y el clima. El precio incluye el traslado desde Ciudad Valles, todo el equipo de seguridad, el video con dron y las fotografías con cámaras de acción; no incluye alimentos. Si buscas la historia que vas a contar el resto de tu vida, empieza aquí.",
    destinos: [
      "Embarcadero del Río Tampaón (inicio del descenso)",
      "Pared de rappel frente a la Cascada de Tamul",
      "Cañón del Río Tampaón",
    ],
    incluye: [
      "Traslado desde Ciudad Valles",
      "Equipo completo de rappel y seguridad (arnés, casco, guantes y cuerdas profesionales)",
      "Guías de alta montaña certificados",
      "Briefing y técnica de descenso — apto para principiantes",
      "Video con dron del descenso",
      "Fotografía con cámaras de acción",
    ],
    imagen_hero: "/imagenes/tours/rappel-tamul/hero.jpg",
    itinerario: [
      { hora: "8:00–9:00 AM", momento: "Recogida",
        texto: "Pasamos por ti a tu hospedaje y salimos rumbo al embarcadero del Río Tampaón." },
      { hora: "10:00 AM", momento: "Embarcadero del Tampaón",
        texto: "Llegas al río y conoces a los guías de alta montaña que van a bajar contigo. Aquí se queda lo que no baja a la pared." },
      { hora: "10:30 AM", momento: "Equipo y briefing",
        texto: "Arnés, casco y guantes, y la técnica de descenso practicada en seco antes de asomarte. No necesitas experiencia: el primer rappel es 100 % guiado." },
      { hora: "11:30 AM", momento: "El descenso",
        texto: "Bajas la pared del cañón con la Cascada de Tamul enfrente, la más alta de San Luis Potosí. El dron graba desde el aire y las cámaras de acción desde el casco.",
        foto: "/imagenes/tours/rappel-tamul/hero.jpg" },
      { hora: "12:00 PM", momento: "Frente a la cortina de agua",
        texto: "El tramo en el que la pared se tapiza de vegetación y el ruido del agua tapa todo lo demás.",
        foto: "/imagenes/tours/rappel-tamul/gallery-1.jpg" },
      { hora: "12:30 PM", momento: "El cañón desde abajo",
        texto: "Con los pies en el suelo, el río turquesa y la pared que acabas de bajar se ven de otra manera.",
        foto: "/imagenes/tours/rappel-tamul/gallery-4.jpg" },
      { hora: "1:00 PM", momento: "Regreso",
        texto: "De vuelta a tu hospedaje." },
    ],
    collage: [
      "/imagenes/tours/rappel-tamul/gallery-4.jpg",
      "/imagenes/tours/rappel-tamul/hero.jpg",
      "/imagenes/tours/rappel-tamul/gallery-3.jpg",
    ],
    imagenes: [
      "/imagenes/tours/rappel-tamul/hero.jpg",
      "/imagenes/tours/rappel-tamul/gallery-6.jpg",
    ],
    gallery: [
      { src: "/imagenes/tours/rappel-tamul/hero.jpg",      alt: "Rapelista con cámara en el casco sonriendo en plena pared del cañón, con la Cascada de Tamul desplomándose al fondo — Huasteca Potosina", hasRealPeople: true },
      { src: "/imagenes/tours/rappel-tamul/gallery-1.jpg", alt: "Rapelista apoyado en la pared tapizada de vegetación junto a la cortina de agua de la Cascada de Tamul con el cañón turquesa al fondo", hasRealPeople: true },
      { src: "/imagenes/tours/rappel-tamul/gallery-2.jpg", alt: "Aventurero recostado en el arnés mirando hacia arriba durante el descenso en rappel frente a la Cascada de Tamul", hasRealPeople: true },
      { src: "/imagenes/tours/rappel-tamul/gallery-3.jpg", alt: "Mujer con casco blanco extendiendo los brazos en rappel sobre el río turquesa del Tampaón con la cascada al fondo", hasRealPeople: true },
      { src: "/imagenes/tours/rappel-tamul/gallery-4.jpg", alt: "Vista amplia del descenso en rappel sobre la imponente Cascada de Tamul — la más alta de San Luis Potosí", hasRealPeople: true },
      { src: "/imagenes/tours/rappel-tamul/gallery-5.jpg", alt: "Rapelista de espaldas descendiendo la pared del cañón del Tampaón junto a la cortina de agua de Tamul", hasRealPeople: true },
      { src: "/imagenes/tours/rappel-tamul/gallery-6.jpg", alt: "Mujer con casco sonriendo y haciendo pulgar arriba en rappel, con pájaros volando frente a la Cascada de Tamul", hasRealPeople: true },
    ],
  },
  {
    id:               "tour-rafting-tampaon",
    slug:             "rafting-rio-tampaon",
    categoria:        "extremo",
    icon:             "Waves",
    tipo:             "Rafting & Adrenalina",
    dificultad:       "media",
    duracion_hrs:     7,
    reviewCount:      47,
    // La balsa no sale con menos de 4. Antes decía 2 y solo el bot respetaba el
    // mínimo: por la web se podía pagar un rafting para 2 y luego había que
    // llamar al cliente a reprogramar o devolverle el dinero.
    groupMin:         5,
    groupMax:         8,
    privateAvailable: false,
    nombre:           "Rafting en el Río Tampaón — Rápidos Clase III en Agua Turquesa",
    nombreCorto:      "Rafting en el Río Tampaón",
    articulo:         "el",
    tagline:          "14 km de rápidos entre las paredes del cañón, en uno de los ríos más escénicos de Norteamérica",
    precio:           1950,
    urgencia:         "Sujeto al nivel del río — la salida se confirma al reservar",
    descripcion:
      "Rema 14 kilómetros de rápidos Clase III sobre el agua turquesa del Río Tampaón, flanqueado por las paredes de un cañón imponente. Pasamos por ti a tu hospedaje en Ciudad Valles o Xilitla (traslado redondo), con equipo completo, guía certificado y comida incluida que eliges antes o después de la actividad. No necesitas experiencia ni saber nadar — hay rutas para principiantes y avanzados.",
    descripcionLarga:
      "El Río Tampaón está considerado uno de los 10 ríos más escénicos de Norteamérica, y basta el primer rápido para entender por qué: agua turquesa —coloreada por los mismos minerales kársticos que pintan la Cascada de Tamul—, paredes de cañón que se cierran sobre el río y una selva que se asoma desde lo alto de la roca.\n\nEl día empieza en la puerta de tu hospedaje: pasamos por ti a Ciudad Valles o Xilitla, con traslado redondo incluido. En el embarcadero te entregamos el equipo completo —balsa profesional, remo, casco y chaleco salvavidas— y el guía te da el briefing de seguridad y técnica de remado. No necesitas experiencia ni saber nadar: hay rutas para diferentes niveles, los rápidos Clase III son el punto perfecto entre emoción de verdad y seguridad para principiantes, y el guía va dentro de la balsa contigo todo el descenso.\n\nSon 14 kilómetros de descenso alternando rápidos con tramos tranquilos para nadar y admirar el cañón. El momento más esperado es el rápido de 'La Tumba', donde las paredes se cierran tanto que el eco desaparece — un silencio absoluto justo antes del tramo más técnico del río. Vas a salir empapado, con los brazos cansados y con ganas de volver a subirte. Tu reserva incluye la comida, y tú decides cuándo: puedes tomarla antes de salir para arrancar con energía, o dejarla para después del descenso.\n\nLa mejor temporada es de noviembre a marzo, cuando el agua alcanza su color más intenso. En temporada de lluvias (julio–septiembre) la salida depende del nivel del río: si no es seguro navegar, te lo decimos con anticipación y reprogramamos o te proponemos una actividad alternativa. Tu seguridad va primero, siempre.",
    destinos: [
      "Traslado redondo desde tu hospedaje (Ciudad Valles o Xilitla)",
      "Embarcadero del Río Tampaón",
      "14 km de rápidos Clase III por el Río Tampaón",
      "Cañón del Tampaón — paredes de roca y agua turquesa",
      "Rápido 'La Tumba' — el más técnico del descenso",
      "Tramos tranquilos para nadar en el río",
    ],
    incluye: [
      "Traslado redondo desde tu hospedaje en Ciudad Valles o Xilitla",
      "Comida incluida — la eliges antes o después de la actividad",
      "Entradas a todas las atracciones",
      "Balsa profesional, remo, casco y chaleco salvavidas",
      "Guía certificado en aguas rápidas dentro de tu balsa",
      "Briefing de seguridad y técnica de remado — rutas para principiantes y avanzados",
      "Botiquín de primeros auxilios",
      "Seguro de actividad",
      "Descenso de 14 km por los rápidos del Tampaón",
      "Paradas para nadar en los tramos tranquilos del cañón",
    ],
    imagen_hero: "/imagenes/rio-tampaon-rafting/gallery-5.webp",
    itinerario: [
      { hora: "8:00–9:00 AM", momento: "Recogida",
        texto: "Pasamos por ti a tu hospedaje en Ciudad Valles o Xilitla." },
      { hora: "9:30 AM", momento: "Embarcadero del Tampaón",
        texto: "Dejas tus cosas y conoces al guía certificado que va DENTRO de tu balsa todo el descenso, no en otra." },
      { hora: "10:00 AM", momento: "Briefing y remada de práctica",
        texto: "Casco, chaleco y remo. Las órdenes de remada se practican en agua tranquila antes de entrar a los rápidos. No necesitas saber nadar." },
      { hora: "10:45 AM", momento: "Primeros rápidos",
        texto: "Arrancan los 14 kilómetros de descenso. Los primeros rápidos son los que te enseñan a leer el río.",
        foto: "/imagenes/rio-tampaon-rafting/tour-4.jpg" },
      { hora: "12:00 PM", momento: "«La Tumba»",
        texto: "El rápido más técnico del recorrido. Es donde el guía deja de sugerir y empieza a mandar.",
        foto: "/imagenes/rio-tampaon-rafting/tour-1.jpg" },
      { hora: "1:00 PM", momento: "Tramo tranquilo: a nadar",
        texto: "El cañón se abre, el agua se calma y el guía deja que te tires de la balsa a nadar entre las paredes de roca.",
        foto: "/imagenes/rio-tampaon-rafting/gallery-9.jpg" },
      { hora: "2:00 PM", momento: "La comida",
        texto: "Va incluida y tú eliges si la tomas antes o después del descenso. Si la dejaste para el final, es aquí." },
      { hora: "3:00 PM", momento: "Regreso",
        texto: "De vuelta a tu hospedaje." },
    ],
    collage: [
      "/imagenes/rio-tampaon-rafting/tour-1.jpg",
      "/imagenes/rio-tampaon-rafting/gallery-8.jpg",
      "/imagenes/rio-tampaon-rafting/tour-2.jpg",
    ],
    imagenes: [
      "/imagenes/rio-tampaon-rafting/gallery-5.webp",
      "/imagenes/rio-tampaon-rafting/tour-1.jpg",
    ],
    gallery: [
      { src: "/imagenes/rio-tampaon-rafting/tour-1.jpg",     alt: "Tripulación celebrando con el puño en alto mientras su balsa roja cruza un rápido del Río Tampaón", hasRealPeople: true },
      { src: "/imagenes/rio-tampaon-rafting/tour-2.jpg",     alt: "Balsa roja con su tripulación posando bajo la cortina de una cascada en el Río Tampaón", hasRealPeople: true },
      { src: "/imagenes/rio-tampaon-rafting/tour-3.jpg",     alt: "Grupo levantando los remos para celebrar tras superar un rápido del Río Tampaón", hasRealPeople: true },
      { src: "/imagenes/rio-tampaon-rafting/tour-4.jpg",     alt: "Balsa azul cubierta por la salpicadura de un rápido Clase III en el Río Tampaón", hasRealPeople: true },
      { src: "/imagenes/rio-tampaon-rafting/gallery-8.jpg",  alt: "Balsas rojas descendiendo los rápidos turquesa del Río Tampaón entre las paredes del cañón", hasRealPeople: true },
      { src: "/imagenes/rio-tampaon-rafting/gallery-4.jpg",  alt: "Familia remando en una balsa amarilla sobre el agua turquesa del Río Tampaón", hasRealPeople: true },
      { src: "/imagenes/rio-tampaon-rafting/gallery-9.jpg",  alt: "Flotilla de balsas navegando el agua turquesa del Cañón del Tampaón bajo las paredes de roca" },
      { src: "/imagenes/rio-tampaon-rafting/gallery-1.jpg",  alt: "Balsa de rafting entrando a un rápido de agua turquesa vista desde arriba — Río Tampaón", hasRealPeople: true },
    ],
  },
  {
    id:               "tour-tamul",
    slug:             "expedicion-tamul",
    categoria:        "ecoturismo",
    duracionRango:    [12, 13],
    icon:             "Waves",
    tipo:             "Aventura & Naturaleza",
    dificultad:       "media",
    duracion_hrs:     12,
    garantiaHuasteca: true,
    reviewCount:      127,
    groupMin:         2,
    groupMax:         14,
    privateAvailable: true,
    nombre:           "Expedición Tamul — Tamul, Cueva del Agua y Sótano",
    nombreCorto:      "Expedición Tamul",
    articulo:         "la",
    // La revisión de conversión (sep 2026): los tours de 8 h desde Valles solo
    // llevan a la cascada; la tarjeta tiene que decir POR QUÉ este vale más.
    tagline:          "Tres maravillas en un día: Tamul en canoa, el cenote de la Cueva del Agua y las Huahuas al atardecer",
    precio:           1550,
    urgencia:         "El más reservado — se llena los fines de semana",
    descripcion:
      "Navega en canoa por el Cañón del Tampaón hasta la Cascada de Tamul —la más alta de San Luis Potosí—, nada y échate clavados en el cenote de la Cueva del Agua al regreso, y cierra el día asomado al abismo del Sótano de las Huahuas al atardecer, cuando miles de aves vuelven y se lanzan en picada al fondo.",
    descripcionLarga:
      "La Expedición Tamul es el tour más completo de la Huasteca en un solo día: salimos por la mañana —sin madrugadas extremas— y el día está armado para terminar justo a la hora del mejor espectáculo.\n\nLa canoa te lleva por el Cañón del Tampaón, un corredor de roca caliza de 80 metros de altura donde el silencio solo se rompe por el sonido del remo sobre el agua. Al fondo del cañón, la Cascada de Tamul —la más alta de San Luis Potosí con sus 105 metros— se desploma sobre el río con una fuerza que se siente en el pecho antes de verla.\n\nDe regreso bajas de la canoa y subes a la Cueva del Agua: un cenote donde la luz entra en haces perfectos y el agua alcanza un turquesa imposible. Aquí sí te metes —se nada y se echan clavados—, y es el momento favorito de casi todos los que hacen este tour. Arriba hay puestos con snacks y bebidas frías por si quieres un refrigerio; la comida del día viene después, ya saliendo de Tamul, y no va incluida.\n\nCerramos en el Sótano de las Huahuas, un abismo de 478 metros, y llegamos a propósito al atardecer: es la hora en que miles de aves —loros y vencejos— vuelven a casa y se dejan caer en picada dentro del abismo, en espiral, hasta desaparecer. Es de esas cosas que no se explican con una foto. Quienes hacen este tour siempre vuelven, y siempre traen a alguien más.",
    // En el orden REAL del día: la Cueva del Agua es parada del mismo paseo en
    // canoa, al regreso, y el Sótano se deja para el atardecer por las aves.
    destinos: [
      "Cascada de Tamul (paseo en canoa)",
      "Cenote Cueva del Agua (al regreso — se nada y se echan clavados)",
      "Sótano de las Huahuas al atardecer (regreso de las aves)",
    ],
    incluye: [
      "Traslado redondo desde tu hospedaje en Xilitla o Ciudad Valles, en unidad cómoda con aire acondicionado",
      "Desayuno buffet camino a los destinos, en El Taco Loco: platillos típicos de la región y guisados",
      "Entradas a todas las atracciones",
      "Guía certificado NOM-09 SECTUR",
      "Equipo de seguridad (chalecos, cascos y lo necesario para cada actividad)",
      "Fotografías y video del recorrido",
      "Botiquín de primeros auxilios",
      "Seguro de viaje para todos los integrantes",
      "Paseo en canoa por el Cañón del Tampaón",
    ],
    // El día hora por hora. Las horas salen de la operación real y hay que
    // revalidarlas con el guía cada temporada: en lluvias el río manda.
    // Ojo con los dos datos que aquí se corrigieron respecto al borrador: el
    // abismo son 478 m (los 512 son del Sótano de las Golondrinas, que no
    // operamos) y las aves se nombran como aves, no como pericos.
    itinerario: [
      { hora: "8:00–9:00 AM", momento: "Recogida",
        texto: "Pasamos por ti a tu hotel, cabaña o Airbnb en Xilitla o Ciudad Valles. No necesitas hospedarte con nosotros.",
        foto: "/imagenes/tours/tamul/recogida-hotel.jpg" },
      { hora: "9:30 AM", momento: "Desayuno",
        texto: "Buffet de platillos huastecos en El Taco Loco, camino al río. Va incluido." },
      { hora: "11:00 AM", momento: "Canoa a Tamul",
        texto: "Entras al Cañón del Tampaón en canoa: silencio, el remo sobre el agua y, al fondo, una cascada de 105 metros que se siente en el pecho antes de verla.",
        foto: "/imagenes/tours/tamul/canoa-tamul-al-fondo.jpg" },
      { hora: "12:30 PM", momento: "Fotos frente a la cascada",
        texto: "Bajas a las piedras del cañón, justo enfrente de la caída, y ahí se toma la foto que todos acaban enseñando al volver. Sin prisa: es el momento del día que más se repite en las cámaras.",
        foto: "/imagenes/tours/tamul/grupo-frente-a-tamul.jpg" },
      { hora: "1:30 PM", momento: "Cueva del Agua",
        texto: "De regreso bajas de la canoa y subes al cenote de la Cueva del Agua: haces de luz, agua turquesa, y aquí sí te metes —se nada y se echan clavados—. Arriba hay puestos con snacks y bebidas frías por si quieres un refrigerio. El momento favorito de casi todos.",
        foto: "/imagenes/tours/tamul/cueva-del-agua-clavados.jpg" },
      { hora: "3:00 PM", momento: "Comida y camino",
        texto: "La comida del día, ya saliendo de Tamul. No va incluida, así que eliges tú dónde y cuánto gastar. Después, el traslado al Sótano de las Huahuas." },
      { hora: "5:30 PM", momento: "Sótano de las Huahuas",
        texto: "Unos 20 minutos de caminata hasta el borde de un abismo de 478 metros. Ahí esperas el atardecer.",
        foto: "/imagenes/tours/tamul/gallery-6.jpg" },
      { hora: "6:00 PM", momento: "El espectáculo",
        texto: "Miles de aves —loros y vencejos— regresan y se dejan caer en espiral hasta desaparecer. Es el final del día y lo que todos acaban grabando.",
        foto: "/imagenes/sotano-de-las-huahuas/hero.jpg" },
      { hora: "8:00–9:00 PM", momento: "Regreso",
        texto: "Te dejamos en tu hospedaje, cansado y feliz." },
    ],
    // Fotos de un grupo real del tour (30 sep 2026). Las de antes llevaban la
    // marca ✦ de Gemini —eran generadas con IA— y salían con la etiqueta
    // «Foto real» de la galería.
    // Elegida por Manolo (30 sep). Es vertical: en escritorio se sube la franja
    // para que se vea la cascada y no solo el agua.
    imagen_hero: "/imagenes/tours/tamul/grupo-frente-a-tamul.jpg",
    posicionHero: "50% 28%",
    // 15 s con videos de ese mismo grupo: Tamul → cortina de agua → canoa →
    // clavado → Cueva del Agua → grupo frente a Tamul (proyecto Remotion en
    // ~/Desktop/HUASTECA-VIDEO-HERO, composición `TamulMovil`).
    videoHeroMovil: "/videos/tours/expedicion-tamul-v1.mp4",
    logo: "/imagenes/tours/logos/expedicion-tamul-v3.webp",
    // La pareja frente a Tamul: la elige Manolo para las tarjetas del inicio y
    // de /tours (30 sep). La ficha conserva el grupo de portada.
    imagenTarjeta: "/imagenes/cascada-de-tamul/gallery-6.jpg",
    collage: [
      { src: "/imagenes/cascada-de-tamul/gallery-6.jpg", pos: "50% 45%" },
      "/imagenes/tours/tamul/canoa-entre-cascadas.jpg",
      "/imagenes/tours/tamul/cueva-del-agua-clavados.jpg",
      "/imagenes/tours/tamul/gallery-6.jpg",
    ],
    imagenes: [
      "/imagenes/tours/tamul/canoa-entre-cascadas.jpg",
      "/imagenes/tours/tamul/canoa-tamul-al-fondo.jpg",
    ],
    gallery: [
      { src: "/imagenes/tours/tamul/canoa-entre-cascadas.jpg",    alt: "Grupo remando en canoa por el Río Tampaón, entre cascadas y agua turquesa", hasRealPeople: true },
      { src: "/imagenes/cascada-de-tamul/gallery-6.jpg",         alt: "Pareja de la mano sobre una roca del Río Tampaón, mirando la Cascada de Tamul", hasRealPeople: true },
      { src: "/imagenes/tours/tamul/canoa-tamul-al-fondo.jpg",    alt: "Canoa en el Cañón del Tampaón con la Cascada de Tamul al fondo", hasRealPeople: true },
      { src: "/imagenes/tours/tamul/grupo-frente-a-tamul.jpg",    alt: "Grupo sobre las piedras del cañón, justo enfrente de la Cascada de Tamul", hasRealPeople: true },
      { src: "/imagenes/tours/tamul/pareja-frente-a-tamul.jpg",   alt: "Pareja sobre una roca en el Río Tampaón con la Cascada de Tamul detrás", hasRealPeople: true },
      { src: "/imagenes/tours/tamul/cueva-del-agua-clavados.jpg", alt: "Clavados desde la pared de roca en la Cueva del Agua", hasRealPeople: true },
      { src: "/imagenes/tours/tamul/cueva-del-agua-nado.jpg",     alt: "Nadando en el agua turquesa de la Cueva del Agua", hasRealPeople: true },
      { src: "/imagenes/tours/tamul/cascada-del-tampaon.jpg",     alt: "Viajero sobre una de las cascadas que caen al Río Tampaón", hasRealPeople: true },
      { src: "/imagenes/tours/tamul/gallery-6.jpg", alt: "Asomándose al borde del Sótano de las Huahuas — 478 metros de profundidad", hasRealPeople: true },
      { src: "/imagenes/tours/tamul/gallery-extra-1.jpg", alt: "Viajera sentada en las rocas del Cañón del Tampaón señalando la Cascada de Tamul", hasRealPeople: true },
      { src: "/imagenes/tours/tamul/gallery-extra-2.jpg", alt: "Aguas turquesas del Río Tampaón con vegetación colgante — Expedición Tamul" },
      { src: "/imagenes/tours/tamul/gallery-extra-3.jpg", alt: "Grupo de turistas remando en canoas en el Río Tampaón con batalla de agua", hasRealPeople: true },
    ],
  },
  {
    id:               "tour-edward-james",
    slug:             "ruta-surrealista-edward-james",
    categoria:        "ecoturismo",
    duracionRango:    [8, 10],
    icon:             "Leaf",
    tipo:             "Cultura & Naturaleza",
    dificultad:       "baja",
    duracion_hrs:     8,
    reviewCount:      84,
    groupMin:         2,
    groupMax:         14,
    privateAvailable: true,
    nombre:           "Ruta Surrealista — Edward James, Manantiales, Cuevas y Castillo",
    nombreCorto:      "Ruta Surrealista",
    articulo:         "la",
    tagline:          "Arte, agua y misterio en un recorrido de contrastes únicos",
    precio:           1400,
    urgencia:         "Cuatro paradas con entradas incluidas — reserva con anticipación",
    descripcion:
      "El jardín escultórico más enigmático del mundo, las aguas cristalinas del Nacimiento de Huichihuayán, la penumbra viva de la Cueva de las Quilas y el Castillo de la Salud de Don Beto Ramón, el otro surrealismo de la Huasteca. Cultura y naturaleza que se funden en un solo día extraordinario.",
    descripcionLarga:
      "Imagina caminar por un jardín diseñado por un poeta inglés excéntrico en medio de la selva tropical mexicana. Las esculturas de concreto de Edward James —columnatas infinitas, escaleras que suben al cielo sin llegar a ningún lado, flores de piedra de cuatro metros— emergen entre la vegetación como un sueño que alguien olvidó borrar. Las Pozas de Xilitla no tienen comparación en ningún rincón del planeta.\n\nEl Nacimiento de Huichihuayán te recibirá después con sus aguas que brotan directamente de la tierra a temperatura perfecta —ni fría ni caliente, exactamente a 22°C—, enmarcado por palmas y helechos en un silencio que contrasta completamente con el caos visual de Las Pozas.\n\nLa Cueva de las Quilas suma una experiencia subterránea que pocos conocen: estalactitas, murciélagos y un eco que amplifica cada sonido hasta convertirlo en algo místico.\n\nY cerramos en el Castillo de la Salud, en Axtla: un recinto que el herbolario náhuatl Don Beto Ramón levantó en 1974, con su arquitectura mezclando simbolismo náhuatl y pasajes bíblicos, y un jardín de cientos de plantas medicinales. Es el otro surrealismo de la Huasteca —el que no vino de Europa, sino de aquí— y verlo el mismo día que Las Pozas es lo que le da sentido al recorrido completo. Este tour no es solo turismo. Es una forma diferente de ver el mundo.",
    destinos: [
      "Jardín Surrealista Edward James (Las Pozas)",
      "Nacimiento de Huichihuayán",
      "Cueva de las Quilas",
      "Castillo de la Salud",
    ],
    incluye: [
      "Traslado redondo desde tu hospedaje en Xilitla o Ciudad Valles, en unidad cómoda con aire acondicionado",
      "Desayuno buffet camino a los destinos, en El Taco Loco: platillos típicos de la región y guisados",
      "Entradas a todas las atracciones",
      "Guía certificado NOM-09 SECTUR, especializado en historia y cultura",
      "Equipo de seguridad (chalecos, cascos y lo necesario para cada actividad)",
      "Botiquín de primeros auxilios",
      "Seguro de viaje para todos los integrantes",
    ],
    imagen_hero: "/imagenes/tours/edward-james/hero.jpg",
    itinerario: [
      { hora: "8:00–9:00 AM", momento: "Recogida",
        texto: "Pasamos por ti a tu hospedaje en Xilitla o Ciudad Valles, en unidad con aire acondicionado." },
      { hora: "9:30 AM", momento: "Desayuno",
        texto: "Buffet de platillos huastecos y guisados en El Taco Loco, camino a los destinos. Va incluido." },
      { hora: "11:00 AM", momento: "Las Pozas",
        texto: "El jardín surrealista de Edward James: escaleras que no llevan a ningún lado, columnas de concreto asomando entre la selva y unas dos horas para recorrerlo con guía.",
        foto: "/imagenes/tours/edward-james/gallery-2.jpg" },
      { hora: "1:30 PM", momento: "Nacimiento de Huichihuayán",
        texto: "Agua turquesa saliendo de la roca, con los rayos de luz entrando entre la selva. Aquí sí te metes.",
        foto: "/imagenes/tours/edward-james/gallery-4.jpg" },
      { hora: "2:45 PM", momento: "Cueva de las Quilas",
        texto: "Se entra a la cueva por un cañón estrecho donde la luz cae desde arriba. El cambio de temperatura se siente al cruzar la boca.",
        foto: "/imagenes/tours/edward-james/gallery-6.jpg" },
      { hora: "3:45 PM", momento: "Castillo de la Salud",
        texto: "Torres de colores levantadas entre la selva huasteca, la última parada del día y la más fotogénica al atardecer.",
        foto: "/imagenes/tours/edward-james/gallery-7.jpg" },
      { hora: "4:00–6:00 PM", momento: "Regreso",
        texto: "Te dejamos en tu hospedaje." },
    ],
    logo: "/imagenes/tours/logos/ruta-surrealista-edward-james.webp",
    // Cuatro paradas, cuatro fotos, en el orden en que se visitan: Las Pozas,
    // Huichihuayán, la Cueva de las Quilas y el Castillo de la Salud.
    collage: [
      "/imagenes/tours/edward-james/gallery-2.jpg",
      "/imagenes/tours/edward-james/gallery-4.jpg",
      "/imagenes/tours/edward-james/gallery-6.jpg",
      "/imagenes/tours/edward-james/gallery-3.jpg",
    ],
    imagenes: [
      "/imagenes/tours/edward-james/hero.jpg",
      "/imagenes/tours/edward-james/gallery-1.jpg",
    ],
    gallery: [
      { src: "/imagenes/tours/edward-james/gallery-1.jpg",  alt: "Escultura surrealista de Edward James — color y musgo en Las Pozas de Xilitla", hasRealPeople: true },
      { src: "/imagenes/tours/edward-james/gallery-2.jpg",  alt: "Torres de concreto de Las Pozas emergiendo entre la selva con cielo azul" },
      { src: "/imagenes/tours/edward-james/gallery-3.jpg",  alt: "Pareja en el Castillo de la Salud — arquitectura colorida de Tamul", hasRealPeople: true },
      { src: "/imagenes/tours/edward-james/gallery-4.jpg",  alt: "Poza turquesa del Nacimiento de Huichihuayán con rayos de luz natural" },
      { src: "/imagenes/tours/edward-james/gallery-5.jpg",  alt: "Portal circular de Las Pozas — sendero de adoquín entre helechos y selva" },
      { src: "/imagenes/tours/edward-james/gallery-6.jpg",  alt: "Interior de la Cueva de las Quilas — hombre admirando la formación rocosa", hasRealPeople: true },
      { src: "/imagenes/tours/edward-james/gallery-7.jpg",  alt: "Castillo de la Salud — vista aérea de torres coloridas entre selva huasteca" },
      { src: "/imagenes/tours/edward-james/gallery-8.jpg",  alt: "Estructura principal de Las Pozas rodeada de vegetación exuberante" },
      { src: "/imagenes/tours/edward-james/gallery-9.jpg",  alt: "Cañón oscuro con luz entrando desde arriba — Cueva de las Quilas", hasRealPeople: true },
      { src: "/imagenes/tours/edward-james/gallery-10.jpg", alt: "Río turquesa del Nacimiento de Huichihuayán entre piedras y selva verde" },
    ],
  },
  {
    id:               "tour-eden-jardin",
    slug:             "eden-en-el-jardin",
    categoria:        "ecoturismo",
    icon:             "Sparkles",
    tipo:             "Experiencia Privada",
    dificultad:       "baja",
    duracion_hrs:     3,
    // 🔴 ARREGLO (28 sep): este recorrido NO se recoge en Ciudad Valles. Su
    // propio `incluye` dice "Traslado redondo desde tu hospedaje EN XILITLA" y
    // su pregunta frecuente decía "solo desde Xilitla". Pero `TourDeparture` lo
    // mandaba al caso por defecto y, 300 px más arriba en la MISMA página, le
    // prometía al cliente recogida en Valles. Las dos afirmaciones convivían
    // desde el 25 de sep.
    recogida: {
      tipo:       "hospedaje-xilitla",
      horaInicio: 7,   // solo respaldo: `horaTexto` le gana en todo lo que se pinta
      ventanaHrs: 1,
      // Los horarios los pone el jardín, no nosotros: son los mismos de su
      // pregunta frecuente ("¿A qué hora empieza?") y del bot. Sin esto el pago
      // y el correo decían "entre 7:00 y 8:00 AM" a quien apartó las 5 PM.
      horaTexto: {
        es: "8:00 AM lun, mié, jue y vie · 7:00 AM sáb y dom · 5:00 PM de mié a lun",
        en: "8:00 AM Mon, Wed, Thu & Fri · 7:00 AM Sat & Sun · 5:00 PM Wed–Mon",
      },
      // 🔴 Sin hora: esta nota se pega a "¿Dónde es el punto de salida?" y justo
      // debajo va "¿A qué hora empieza?" con los tres horarios. Decía "entre las
      // 7 y las 8" y la misma página daba dos horarios distintos.
      nota: {
        es: "El traslado incluido es solo dentro de Xilitla y el horario lo fija el jardín. Si te hospedas en Ciudad Valles, escríbenos y lo cotizamos aparte.",
        en: "The included transfer only covers Xilitla, and the garden sets the schedule. If you're staying in Ciudad Valles, message us and we'll quote it separately.",
      },
    },
    // Sin reseñas: es nuevo. `reviewCount: 0` apaga el aggregateRating del
    // JSON-LD y el bloque de opiniones — no se inventa una calificación.
    reviewCount:      0,
    groupMin:         1,
    groupMax:         7,
    // Ya ES privado: ofrecer "también en privado" encima sería absurdo.
    privateAvailable: false,
    nombre:           "El Edén en el Jardín — Experiencia Privada en Las Pozas",
    nombreCorto:      "El Edén en el Jardín",
    articulo:         "",
    // Lo que se teclea es "Las Pozas" + "en privado": "El Edén en el Jardín" es
    // el nombre de la experiencia y nadie lo busca todavía. La meta dice "por
    // grupo" porque `precio` es el primer escalón del GRUPO.
    // 🔴 Nada de "antes de que abra" aquí: también hay salida a las 5 PM, y a
    // esa hora no se entra antes de la apertura. Google lo enseñaría a todos.
    // 🔴 La cabeza española no pasa de 40: el precio es un RANGO (`tarifaGrupo`)
    // y el sufijo lleva "desde"; con 42 la plantilla tiraba el precio entero.
    seo: {
      titulo: {
        es: "Las Pozas en privado, Xilitla",
        en: "Las Pozas Private Experience, Xilitla",
      },
      descripcion: {
        es: "Las Pozas en privado: el jardín de Edward James solo para tu grupo, con guía propio y recintos cerrados al público. Desde {precio} por grupo.",
        en: "Las Pozas private experience: Edward James's garden just for your group, with your own guide and areas closed to the public. From {precio} per group.",
      },
      alias: ["Las Pozas en privado"],
    },
    tagline:          "El jardín de Edward James para ustedes solos, antes de que abra al público",
    precio:           2990,
    precioUnidad:     "grupo",
    // Escalones de la Fundación Las Pozas + nuestro margen. El grupo completo:
    // 1 persona $2,990 … 7 personas $4,160. Cupo máximo 7 por reglamento.
    tarifaGrupo:      [2990, 3150, 3320, 3480, 3770, 3970, 4160],
    urgencia:         "Una sola experiencia al día — resérvala con anticipación",
    exclusivo: {
      es: "Exclusiva de Tours Huasteca Potosina",
      en: "Only with Tours Huasteca Potosina",
    },
    cancelacion: {
      es: "Esta experiencia no tiene reembolso: una vez apartada, ese día queda cerrado para todos los demás. Lo que sí puedes hacer es cambiarla avisando con 5 días o más de anticipación, conservando el monto completo durante los 6 meses siguientes. Si el clima obliga a suspender, se reprograma sin costo.",
      en: "This experience is non-refundable: once it's booked, that day is closed to everyone else. You can move it instead by telling us 5 or more days ahead, keeping the full amount valid for 6 months. If the weather forces a cancellation, we reschedule at no cost.",
    },
    descripcion:
      "Las Pozas sin nadie más: entras una hora antes de que abra, con guía propio y acceso a rincones cerrados al público. Tres horas en el jardín de Edward James a tu ritmo, incluidos los niveles altos del Palacio de Bambú y la Casa Estudio donde todavía se conserva un poema escrito de su puño y letra. Grupo de hasta 7 personas, tarifa del grupo completo.",
    descripcionLarga:
      "Hay una hora en Las Pozas que casi nadie ha visto. Entre las siete y las ocho de la mañana el jardín todavía está cerrado al público: la neblina no ha terminado de subir del río, los pájaros son lo único que se oye y las escaleras que no llevan a ninguna parte se quedan quietas, sin una sola fila esperando para la foto. El Edén en el Jardín es esa hora, y las dos que le siguen.\n\nNo es el recorrido de siempre, más temprano. Es una experiencia privada dentro del Jardín Escultórico Edward James —Monumento Artístico declarado Patrimonio Nacional por el INBAL— para tu grupo y nadie más, con un guía del propio jardín que camina a tu ritmo. Se abren recintos que no forman parte de la visita general y se sube a los niveles superiores del Palacio de Bambú, desde donde el jardín deja de verse por abajo y se entiende de golpe: la selva entera con la arquitectura surrealista creciendo dentro.\n\nEl momento que la gente recuerda es otro. En la Casa Estudio, la cabaña donde Edward James se quedaba a descansar, todavía se conserva un poema escrito de su puño y letra. Nadie lo ha retirado ni lo ha puesto detrás de un cristal. Es el tipo de detalle que no sale en ninguna guía, porque casi nadie llega hasta ahí.\n\nLas tres horas incluyen la ruta de senderismo, la entrada al jardín y el traslado redondo desde tu hospedaje en Xilitla. Se opera una sola experiencia al día y el cupo máximo es de siete personas. La tarifa es del grupo completo, no por cabeza: entre más van, menos le toca a cada uno.",
    destinos: [
      "Jardín Escultórico Edward James (Las Pozas)",
      "Palacio de Bambú — niveles superiores",
      "Casa Estudio de Edward James",
      "Ruta de senderismo del jardín",
    ],
    incluye: [
      "Traslado redondo desde tu hospedaje en Xilitla",
      "Entrada al Jardín Escultórico Edward James",
      "Acceso una hora antes de la apertura general, con el jardín vacío",
      "Guía propio del jardín, en español o en inglés (francés e italiano bajo solicitud)",
      "Acceso a recintos cerrados al público general, como la Casa Estudio",
      "Acceso a los niveles superiores del Palacio de Bambú",
      "Entrada a la ruta de senderismo",
    ],
    // 🔴 El hero se elige por dónde cae el TEXTO, no solo por la foto. La
    // panorámica del Palacio de Bambú (gallery-4) tiene cielo y verde claro
    // justo detrás del título y el precio, y el degradado del hero no alcanza a
    // separarlos: se leía mal. Esta trae vegetación densa a la izquierda y luz
    // cálida, que es además la promesa del recorrido (el jardín vacío al
    // amanecer). Comprobado en el navegador, no en el diff.
    imagen_hero: "/imagenes/las-pozas-jardin-surrealista/hero.jpg",
    itinerario: [
      { hora: "7:00–8:00 AM", momento: "Recogida en Xilitla",
        texto: "Pasamos por ti a tu hospedaje. La hora exacta la fija el jardín y te la confirmamos al apartar la fecha." },
      { hora: "7:30 AM", momento: "El jardín vacío",
        texto: "Entras una hora antes de que abra al público. Es la única parte del día en que Las Pozas no tiene a nadie más dentro.",
        foto: "/imagenes/las-pozas-jardin-surrealista/hero.jpg" },
      { hora: "8:15 AM", momento: "Palacio de Bambú",
        texto: "Subes a los niveles superiores, que en la visita general están cerrados. Desde arriba se entiende la escala de lo que construyó Edward James.",
        foto: "/imagenes/las-pozas-jardin-surrealista/gallery-6.jpg" },
      { hora: "9:00 AM", momento: "Casa Estudio",
        texto: "El recinto donde se conserva un poema escrito de su puño y letra. No entra el público general.",
        foto: "/imagenes/las-pozas-jardin-surrealista/gallery-7.jpg" },
      { hora: "9:30 AM", momento: "Ruta de senderismo",
        texto: "El cierre por el sendero del jardín, ya con la luz alta entre los helechos.",
        foto: "/imagenes/las-pozas-jardin-surrealista/gallery-8.jpg" },
      { hora: "10:00 AM", momento: "Regreso",
        texto: "Te dejamos en tu hospedaje en Xilitla." },
    ],
    // Una foto por parada, en el orden en que se recorren: el jardín, el
    // Palacio de Bambú, la Casa Estudio y el sendero.
    collage: [
      "/imagenes/las-pozas-jardin-surrealista/gallery-4.webp",
      "/imagenes/las-pozas-jardin-surrealista/gallery-2.jpg",
      "/imagenes/las-pozas-jardin-surrealista/gallery-7.jpg",
      "/imagenes/las-pozas-jardin-surrealista/puerta-luna.jpg",
    ],
    imagenes: ["/imagenes/las-pozas-jardin-surrealista/hero.jpg"],
    gallery: [
      { src: "/imagenes/las-pozas-jardin-surrealista/hero.jpg",         alt: "Las Pozas de Xilitla vacío con la luz cálida de la mañana, antes de abrir al público" },
      { src: "/imagenes/las-pozas-jardin-surrealista/puerta-luna.jpg",  alt: "Visitante cruzando sola el portal circular de Las Pozas por el sendero de adoquín", hasRealPeople: true },
      { src: "/imagenes/las-pozas-jardin-surrealista/gallery-2.jpg",    alt: "Bajo el Palacio de Bambú: columnas de concreto y una figura recortada en el arco", hasRealPeople: true },
      { src: "/imagenes/las-pozas-jardin-surrealista/gallery-7.jpg",    alt: "Casa Estudio de Edward James cubierta de vegetación, donde se conserva su poema" },
      { src: "/imagenes/las-pozas-jardin-surrealista/gallery-8.jpg",    alt: "Escalera y arcos surrealistas de Las Pozas con una visitante subiendo entre helechos", hasRealPeople: true },
      { src: "/imagenes/las-pozas-jardin-surrealista/gallery-13.jpg",   alt: "Dos visitantes sentados en lo alto de una estructura del jardín, sin nadie más alrededor", hasRealPeople: true },
      { src: "/imagenes/las-pozas-jardin-surrealista/gallery-6.jpg",    alt: "Visitante con sombrero frente a las columnatas del Palacio de Bambú en Las Pozas", hasRealPeople: true },
      { src: "/imagenes/las-pozas-jardin-surrealista/gallery-12.jpg",   alt: "Esculturas de colores de Las Pozas rodeadas de selva en Xilitla" },
      { src: "/imagenes/las-pozas-jardin-surrealista/gallery-1.jpg",    alt: "Torres y escaleras de caracol de Las Pozas recortadas contra el cielo azul" },
      { src: "/imagenes/las-pozas-jardin-surrealista/gallery-11.webp",  alt: "Vista amplia del Jardín Escultórico Edward James entre la selva de Xilitla" },
    ],
  },
  {
    id:               "tour-meco",
    slug:             "cascadas-del-meco",
    categoria:        "ecoturismo",
    icon:             "Droplet",
    tipo:             "Cascadas & Fotografía",
    dificultad:       "baja",
    // Regreso al hospedaje a las 8 de la noche (Manolo, 28 sep): saliendo a
    // las 8 de la mañana son 12 h, no las 10 que decía.
    duracion_hrs:     12,
    garantiaHuasteca: true,
    reviewCount:      96,
    groupMin:         2,
    groupMax:         14,
    privateAvailable: true,
    nombre:           "Cascadas del Meco — Meco, Mirador Panorámico y El Gran Salto",
    nombreCorto:      "Cascadas del Meco",
    articulo:         "las",
    tagline:          "Tres caídas de agua, tres emociones distintas",
    precio:           1700,
    urgencia:         "Favorito de fotógrafos — tres paradas en un solo día",
    descripcion:
      "Recorre las pozas turquesa de la Cascada del Meco, asciende al mirador panorámico para una perspectiva que te dejará sin aliento y cierra el día ante la imponente Cascada del Salto. El recorrido más fotogénico y accesible de toda la región.",
    descripcionLarga:
      "Hay un momento específico, alrededor de las 10 AM, cuando la luz del sol entra en ángulo perfecto sobre las pozas de la Cascada del Meco y el agua se vuelve literalmente turquesa neón. Los fotógrafos profesionales saben de ese momento. Nosotros también, y llegamos exactamente a esa hora.\n\nEl Meco es quizás el tour más fotogénico de toda la región. Tres caídas de agua distintas —tres texturas, tres alturas, tres tipos de poza— y un mirador panorámico desde donde la selva se extiende hasta donde alcanza la vista. No hay toboganes de plástico, no hay música de bocina. Solo naturaleza auténtica, agua perfecta y un guía que sabe exactamente dónde pararte para la mejor foto de tu vida.\n\nLa Cascada del Salto cierra el día con 40 metros de caída libre que se escuchan antes de verse. Si buscas el recorrido perfecto para alguien que nunca ha visto una cascada de verdad —o para alguien que ya las ha visto todas y busca algo diferente—, este es el tour.",
    destinos: [
      "Cascada del Meco",
      "Mirador Panorámico del Meco",
      "Cascada El Salto",
    ],
    incluye: [
      "Traslado redondo desde tu hospedaje en Xilitla o Ciudad Valles, en unidad cómoda con aire acondicionado",
      "Desayuno buffet camino a los destinos, en El Taco Loco: platillos típicos de la región y guisados",
      "Entradas a todas las atracciones",
      "Guía certificado NOM-09 SECTUR",
      "Equipo de seguridad (chalecos, cascos y lo necesario para cada actividad)",
      "Botiquín de primeros auxilios",
      "Seguro de viaje para todos los integrantes",
    ],
    imagen_hero: "/imagenes/cascada-el-meco/hero.jpg",
    itinerario: [
      { hora: "8:00–9:00 AM", momento: "Recogida",
        texto: "Pasamos por ti a tu hospedaje en Xilitla o Ciudad Valles, en unidad con aire acondicionado." },
      { hora: "9:30 AM", momento: "Desayuno",
        texto: "Buffet de platillos huastecos y guisados en El Taco Loco, camino a los destinos. Va incluido." },
      { hora: "10:30 AM", momento: "Cascada del Meco",
        texto: "Llegas cuando el sol entra en ángulo sobre las pozas y el agua se pone turquesa. Se recorre en panga y se nada, con chaleco incluido.",
        foto: "/imagenes/cascada-el-meco/hero.jpg" },
      { hora: "1:00 PM", momento: "Mirador panorámico",
        texto: "Caminata corta y plana hasta el mirador: desde arriba se ven las cascadas escalonadas completas. Apta para adultos mayores.",
        foto: "/imagenes/cascada-el-meco/gallery-5.jpg" },
      { hora: "2:30 PM", momento: "Comida",
        texto: "La comida del día. No va incluida, así que eliges tú dónde y cuánto gastar." },
      { hora: "4:00 PM", momento: "Cascada El Salto",
        texto: "El cierre: una caída doble sobre pozas escalonadas. A esta hora suele salir el arcoíris en la niebla de la caída.",
        // Era `cascada-el-meco/gallery-6` (las pangas frente al Meco, no El
        // Salto; lo cachó Manolo, 29 sep 2026). Las gallery-3/4 de El Salto
        // traen marca de agua de otro sitio: no usar.
        foto: "/imagenes/cascada-el-salto/hero.jpg" },
      { hora: "8:00 PM", momento: "Regreso",
        texto: "Te dejamos en tu hospedaje." },
    ],
    logo: "/imagenes/tours/logos/cascadas-del-meco.webp",
    collage: [
      "/imagenes/cascada-el-meco/gallery-3.jpg",
      // Corrida a la derecha: la chica sentada en el borde está en ese lado y
      // centrada se quedaba fuera de la franja.
      { src: "/imagenes/cascada-el-meco/gallery-7.jpg", pos: "68% center" },
      "/imagenes/cascada-el-salto/gallery-2.jpg",
    ],
    imagenes: ["/imagenes/cascada-el-meco/hero.jpg"],
    gallery: [
      { src: "/imagenes/cascada-el-meco/hero.jpg",        alt: "Dos turistas en paddleboard frente a la Cascada del Meco — aguas turquesas de la Huasteca Potosina", hasRealPeople: true },
      { src: "/imagenes/cascada-el-meco/gallery-1.jpg",   alt: "Viajero frente a la Cascada del Meco — caída escalonada sobre agua turquesa", hasRealPeople: true },
      { src: "/imagenes/cascada-el-meco/gallery-2.jpg",   alt: "Joven clavándose desde las rocas de la Cascada del Meco — agua turquesa", hasRealPeople: true },
      { src: "/imagenes/cascada-el-meco/gallery-3.jpg",   alt: "Panga con viajeros llegando a la Cascada del Meco por el río turquesa", hasRealPeople: true },
      { src: "/imagenes/cascada-el-meco/gallery-4.jpg",   alt: "Dos personas saludando al pie de la Cascada del Meco — agua turquesa", hasRealPeople: true },
      { src: "/imagenes/cascada-el-meco/gallery-5.jpg",   alt: "Turista en el mirador panorámico del Meco — vista de las cascadas escalonadas", hasRealPeople: true },
      { src: "/imagenes/cascada-el-meco/gallery-6.jpg",   alt: "Pangas de colores frente a la Cascada del Meco — agua turquesa de la Huasteca", hasRealPeople: true },
      { src: "/imagenes/cascada-el-meco/gallery-7.jpg",   alt: "Familia disfrutando las pozas sobre la Cascada del Meco — ideal para todas las edades", hasRealPeople: true },
      { src: "/imagenes/cascada-el-meco/gallery-8.jpg",   alt: "Panga en canoa acercándose a la Cascada del Meco por aguas turquesas", hasRealPeople: true },
      { src: "/imagenes/cascada-el-meco/gallery-9.jpg",   alt: "Cascada del Salto — toma cinematográfica con largos tiempos de exposición" },
      { src: "/imagenes/cascada-el-meco/gallery-10.jpg",  alt: "Segunda panga acercándose a la Cascada del Meco — recorrido fluvial turquesa", hasRealPeople: true },
      { src: "/imagenes/cascada-el-meco/gallery-11.jpg",  alt: "Mujer en paddleboard en la Cascada del Meco — actividad acuática en la Huasteca", hasRealPeople: true },
      { src: "/imagenes/cascada-el-meco/gallery-12.jpg",  alt: "Padre e hija disfrutando el río turquesa en la Huasteca Potosina", hasRealPeople: true },
      { src: "/imagenes/cascada-el-meco/gallery-13.jpg",  alt: "Flotilla de pangas frente a la Cascada del Meco — tour grupal con chalecos salvavidas", hasRealPeople: true },
    ],
  },
  {
    id:               "tour-minas-micos",
    slug:             "paraiso-escalonado-minas-micos",
    categoria:        "ecoturismo",
    icon:             "Mountain",
    tipo:             "Cascadas & Bienestar",
    dificultad:       "baja",
    // Regreso al hospedaje entre las 7 y las 8 de la noche (Manolo, 28 sep):
    // saliendo a las 8 de la mañana son 11-12 h, no las 10 que decía.
    duracion_hrs:     12,
    duracionRango:    [11, 12],
    reviewCount:      112,
    groupMin:         2,
    groupMax:         14,
    privateAvailable: true,
    nombre:           "Paraíso Escalonado — Minas Viejas & Cascadas de Micos",
    nombreCorto:      "Paraíso Escalonado",
    articulo:         "el",
    tagline:          "Dos joyas naturales, un día perfecto para desconectar",
    precio:           1600,
    urgencia:         "Ideal para familias — reserva con anticipación",
    descripcion:
      "Minas Viejas despliega sus terrazas de travertino color jade que parecen pintadas a mano; las Cascadas de Micos encadenan pozas turquesa entre la selva tropical. El tour ideal para quienes buscan belleza auténtica, aguas cristalinas y momentos de paz lejos del ruido.",
    descripcionLarga:
      "El color del agua de Minas Viejas no existe en ninguna paleta de colores de diseño gráfico. Es un verde-turquesa-jade que los geólogos explican por los minerales disueltos en el agua durante siglos, pero que los fotógrafos sencillamente llaman imposible. Las terrazas naturales de travertino se forman gota a gota durante miles de años, creando escalones perfectos donde el agua fluye en cascada suave y puedes nadar en cada nivel.\n\nFlota en agua cristalina con la selva cerrándose sobre ti, sin ruido, sin multitudes, sin artificios. Solo la naturaleza funcionando exactamente como siempre ha funcionado.\n\nLas Cascadas de Micos completan el día con siete caídas de agua en secuencia, cada una diferente. Es el tour favorito de las familias con niños —dificultad baja, chalecos para todos, guía paciente— y de quienes buscan un día de desconexión total que no requiere estar en forma. Dos destinos únicos, un solo día, recuerdos para toda la vida.",
    destinos: [
      "Cascadas de Minas Viejas",
      "Cascadas de Micos",
    ],
    incluye: [
      "Traslado redondo desde tu hospedaje en Xilitla o Ciudad Valles, en unidad cómoda con aire acondicionado",
      "Desayuno buffet camino a los destinos, en El Taco Loco: platillos típicos de la región y guisados",
      "Entradas a todas las atracciones",
      "Guía certificado NOM-09 SECTUR",
      "Equipo de seguridad (chalecos, cascos y lo necesario para cada actividad)",
      "Botiquín de primeros auxilios",
      "Seguro de viaje para todos los integrantes",
    ],
    // Actividad opcional del Paraíso Escalonado. El precio autoritativo vive
    // aquí y `computeTourCharge` lo vuelve a leer al cobrar: del cliente solo
    // se acepta el id y a cuánta gente se le suma.
    addOns: [
      {
        id:          "salto-7-cascadas",
        nombre:      "Salto de las 7 Cascadas",
        descripcion: "Salto guiado en las Cascadas de Micos, con seguro y guía certificado en actividades extremas y rescate.",
        precio:      350,
      },
    ],
    imagen_hero: "/imagenes/cascadas-minas-viejas/hero-new.jpg",
    itinerario: [
      { hora: "8:00–9:00 AM", momento: "Recogida",
        texto: "Pasamos por ti a tu hospedaje en Xilitla o Ciudad Valles, en unidad con aire acondicionado." },
      { hora: "9:30 AM", momento: "Desayuno",
        texto: "Buffet de platillos huastecos y guisados en El Taco Loco, camino a los destinos. Va incluido." },
      { hora: "11:00 AM", momento: "Cascadas de Minas Viejas",
        texto: "Una caída triple sobre pozas color jade, con puente de madera para cruzarlas. Hay chalecos para todos y el agua está entre 18 y 22 °C: refrescante, no helada.",
        foto: "/imagenes/cascadas-minas-viejas/hero-new.jpg" },
      { hora: "1:00 PM", momento: "Comida",
        texto: "La comida del día. No va incluida, así que eliges tú dónde y cuánto gastar." },
      { hora: "3:00 PM", momento: "Cascadas de Micos",
        texto: "Las pozas escalonadas de Micos, una detrás de otra. Es el tramo del día donde más se mete la gente al agua.",
        foto: "/imagenes/cascadas-minas-viejas/gallery-new-9.jpg" },
      { hora: "7:00–8:00 PM", momento: "Regreso",
        texto: "Te dejamos en tu hospedaje." },
    ],
    logo: "/imagenes/tours/logos/paraiso-escalonado-minas-micos.webp",
    collage: [
      "/imagenes/cascadas-minas-viejas/hero-new.jpg",
      "/imagenes/cascadas-minas-viejas/gallery-new-8.jpg",
    ],
    imagenes: [
      "/imagenes/cascadas-minas-viejas/hero-new.jpg",
      "/imagenes/cascadas-minas-viejas/gallery-new-1.jpg",
    ],
    gallery: [
      { src: "/imagenes/cascadas-minas-viejas/hero-new.jpg",     alt: "Vista aérea de Cascadas Minas Viejas — caída triple sobre pozas turquesas en la Huasteca Potosina" },
      { src: "/imagenes/cascadas-minas-viejas/gallery-new-1.jpg", alt: "Cascadas Minas Viejas cinematográficas con puente de madera y pozas color jade", hasRealPeople: true },
      { src: "/imagenes/cascadas-minas-viejas/gallery-new-2.jpg", alt: "Chica posando frente a la cascada principal de Minas Viejas — agua turquesa", hasRealPeople: true },
      { src: "/imagenes/cascadas-minas-viejas/gallery-new-3.jpg", alt: "Turista sonriendo con chaleco salvavidas en Minas Viejas — Huasteca Potosina", hasRealPeople: true },
      { src: "/imagenes/cascadas-minas-viejas/gallery-new-4.jpg", alt: "Pareja romántica besándose frente a la cascada de Minas Viejas — tour en pareja", hasRealPeople: true },
      { src: "/imagenes/cascadas-minas-viejas/gallery-new-5.jpg", alt: "Clavado desde las cascadas de Micos — aventura extrema en la Huasteca Potosina", hasRealPeople: true },
      { src: "/imagenes/cascadas-minas-viejas/gallery-new-6.jpg", alt: "Grupo saltando en familia desde las cascadas de Micos — diversión para todos", hasRealPeople: true },
      { src: "/imagenes/cascadas-minas-viejas/gallery-new-7.jpg", alt: "Dos amigas posando con cascos y chalecos en Minas Viejas — turismo de aventura", hasRealPeople: true },
      { src: "/imagenes/cascadas-minas-viejas/gallery-new-8.jpg", alt: "Skybike en Cascadas de Micos — ciclismo aéreo sobre pozas turquesas", hasRealPeople: true },
      { src: "/imagenes/cascadas-minas-viejas/gallery-new-9.jpg", alt: "Vista aérea de las Cascadas de Micos — pozas escalonadas turquesas desde drone", hasRealPeople: true },
      { src: "/imagenes/cascadas-minas-viejas/gallery-new-10.jpg", alt: "Pareja abrazada señalando la cascada de Minas Viejas — momento romántico en la Huasteca", hasRealPeople: true },
      { src: "/imagenes/cascadas-minas-viejas/gallery-new-11.jpg", alt: "Turista observando la cascada desde las rocas del cañón de Puente de Dios", hasRealPeople: true },
    ],
  },
  {
    id:               "tour-puente-dios",
    slug:             "ruta-acuatica-puente-de-dios",
    categoria:        "ecoturismo",
    icon:             "Anchor",
    tipo:             "Aventura Acuática",
    dificultad:       "media",
    // Regreso al hospedaje entre las 7 y las 8 de la noche (Manolo, 28 sep):
    // saliendo a las 8 de la mañana son 11-12 h, no las 10 que decía.
    duracion_hrs:     12,
    duracionRango:    [11, 12],
    reviewCount:      73,
    groupMin:         2,
    groupMax:         14,
    privateAvailable: true,
    nombre:           "Ruta Acuática — Puente de Dios & Cascadas de Tamasopo",
    nombreCorto:      "Ruta Acuática",
    articulo:         "la",
    tagline:          "El recorrido más refrescante y completo de la región",
    precio:           1600,
    // 🔴 Decía "últimos lugares disponibles" siempre, sin importar el cupo real:
    // escasez inventada. Como en el Rappel, la urgencia no dice cuántos quedan.
    urgencia:         "El más completo — se aparta con anticipación",
    descripcion:
      "Atraviesa la cueva natural del Puente de Dios con el río fluyendo a tus pies. Después eliges: Hacienda Los Gómez con las Siete Cascadas —están en el mismo lugar y se ven las dos—, o las pozas cristalinas de las Cascadas de Tamasopo. En un día da para uno de los dos, no para ambos.",
    descripcionLarga:
      "El Puente de Dios es un arco de roca natural de 15 metros de altura por donde el río fluye, y hay un momento cada día —entre las 11 y las 13 horas— cuando la luz del sol entra perpendicular y convierte el agua en cristal líquido. Nosotros llegamos a esa hora. Siempre.\n\nEntrar al Puente de Dios es una experiencia sensorial completa: el sonido del agua amplificado por la cueva, el frío del interior, la luz que entra por el arco como un faro natural, la textura de la piedra bajo los pies. No es solo una foto. Es un momento que se graba en la memoria.\n\nLa segunda mitad del día la eliges tú, y te lo decimos claro porque el tiempo no da para las dos: o la Hacienda Los Gómez con las Siete Cascadas —que están en el mismo sitio, así que ahí se ven las dos cosas—, o las Cascadas de Tamasopo. Si es tu primera vez en la Huasteca, la mayoría se va por las Siete Cascadas; Tamasopo es la opción de quien busca pozas más abiertas para nadar con calma.\n\nSea cual sea, lo decides al reservar y nosotros armamos el día alrededor de esa elección, con la seguridad de que cada paso lo guía alguien que conoce estos ríos de memoria.",
    eleccion: {
      titulo: "El día no da para las dos. ¿Cuál prefieres?",
      opciones: [
        { id: "siete-cascadas", nombre: "Hacienda Los Gómez + Siete Cascadas", nota: "Están en el mismo lugar, así que ves las dos. La opción de la mayoría." },
        { id: "tamasopo",       nombre: "Cascadas de Tamasopo",                nota: "Pozas más abiertas, para nadar con calma." },
      ],
    },
    // El día NO da para todo: Puente de Dios va siempre y después se elige.
    // Hacienda Los Gómez y Siete Cascadas están en el mismo lugar, así que
    // esas dos van juntas o no van.
    destinos: [
      "Puente de Dios",
      "A elegir: Hacienda Los Gómez + Siete Cascadas (mismo lugar)",
      "A elegir: Cascadas de Tamasopo",
    ],
    incluye: [
      "Traslado redondo desde tu hospedaje en Xilitla o Ciudad Valles, en unidad cómoda con aire acondicionado",
      "Desayuno buffet camino a los destinos, en El Taco Loco: platillos típicos de la región y guisados",
      "Entradas a todas las atracciones",
      "Guía certificado NOM-09 SECTUR",
      "Equipo de seguridad (chalecos, cascos y lo necesario para cada actividad)",
      "Botiquín de primeros auxilios",
      "Seguro de viaje para todos los integrantes",
    ],
    imagen_hero: "/imagenes/puente-de-dios-tamasopo/hero-new.webp",
    itinerario: [
      { hora: "8:00–9:00 AM", momento: "Recogida",
        texto: "Pasamos por ti a tu hospedaje en Xilitla o Ciudad Valles, en unidad con aire acondicionado." },
      { hora: "9:30 AM", momento: "Desayuno",
        texto: "Buffet de platillos huastecos y guisados en El Taco Loco, camino a los destinos. Va incluido." },
      { hora: "11:00 AM", momento: "Puente de Dios",
        texto: "Se baja por escalones hasta el cañón. Dentro el chaleco es obligatorio y el agua está entre 18 y 22 °C. Cuenta con la bajada si te cuestan las escaleras.",
        foto: "/imagenes/puente-de-dios-tamasopo/hero-new.webp" },
      { hora: "1:30 PM", momento: "Comida",
        texto: "La comida del día. No va incluida, así que eliges tú dónde y cuánto gastar." },
      { hora: "3:00 PM", momento: "Lo que elegiste al reservar",
        texto: "O la Hacienda Los Gómez con las Siete Cascadas, que están en el mismo lugar, o las Cascadas de Tamasopo con su tobogán natural de travertino. Se visita una de las dos, la que hayas escogido.",
        foto: "/imagenes/puente-de-dios-tamasopo/gallery-new-10.jpg" },
      { hora: "7:00–8:00 PM", momento: "Regreso",
        texto: "Te dejamos en tu hospedaje." },
    ],
    logo: "/imagenes/tours/logos/ruta-acuatica-puente-de-dios.webp",
    collage: [
      "/imagenes/puente-de-dios-tamasopo/gallery-13.jpg",
      "/imagenes/puente-de-dios-tamasopo/gallery-new-14.jpg",
      "/imagenes/puente-de-dios-tamasopo/gallery-new-1.jpg",
    ],
    imagenes: [
      "/imagenes/puente-de-dios-tamasopo/hero-new.webp",
      "/imagenes/puente-de-dios-tamasopo/gallery-new-1.jpg",
    ],
    gallery: [
      { src: "/imagenes/puente-de-dios-tamasopo/hero-new.webp",    alt: "Chica con brazos abiertos frente a la cascada del Puente de Dios — Ruta Acuática Huasteca Potosina", hasRealPeople: true },
      { src: "/imagenes/puente-de-dios-tamasopo/gallery-new-1.jpg", alt: "Turista sentada con chaleco amarillo en las rocas del Río Tampaón con cascada al fondo", hasRealPeople: true },
      { src: "/imagenes/puente-de-dios-tamasopo/gallery-new-2.jpg", alt: "Chica con brazos abiertos frente a cascada turquesa — Hacienda Los Gómez", hasRealPeople: true },
      { src: "/imagenes/puente-de-dios-tamasopo/gallery-new-3.webp", alt: "Mujer de espaldas frente a gran cascada blanca — Ruta Acuática Huasteca", hasRealPeople: true },
      { src: "/imagenes/puente-de-dios-tamasopo/gallery-new-4.jpg", alt: "Grupo de turistas en actividad de cuerdas sobre el río — Siete Cascadas Tamasopo", hasRealPeople: true },
      { src: "/imagenes/puente-de-dios-tamasopo/gallery-new-5.jpg", alt: "Turista de pie observando la cascada del Puente de Dios desde las rocas del cañón", hasRealPeople: true },
      { src: "/imagenes/puente-de-dios-tamasopo/gallery-new-6.jpg", alt: "Familia internacional nadando en la Cueva del Agua — Expedición Ruta Acuática", hasRealPeople: true },
      { src: "/imagenes/puente-de-dios-tamasopo/gallery-new-7.jpg", alt: "Mujer sonriendo con chaleco en la Hacienda Los Gómez con cascada de fondo", hasRealPeople: true },
      { src: "/imagenes/puente-de-dios-tamasopo/gallery-new-8.jpg", alt: "Grupo de amigos dentro de cueva con agua turquesa — Ruta Acuática Huasteca", hasRealPeople: true },
      { src: "/imagenes/puente-de-dios-tamasopo/gallery-new-9.jpg", alt: "Turista posando en el letrero de Tamasopo con cascada al fondo", hasRealPeople: true },
      { src: "/imagenes/puente-de-dios-tamasopo/gallery-new-10.jpg", alt: "Dos mujeres sonriendo en el agua frente a las Siete Cascadas de Tamasopo", hasRealPeople: true },
      { src: "/imagenes/puente-de-dios-tamasopo/gallery-new-11.jpg", alt: "Grupo de cuatro personas abrazados frente a las Cascadas de Tamasopo", hasRealPeople: true },
      { src: "/imagenes/puente-de-dios-tamasopo/gallery-new-12.jpg", alt: "Familia de cinco nadando en las pozas turquesas de Tamasopo", hasRealPeople: true },
      { src: "/imagenes/puente-de-dios-tamasopo/gallery-new-13.jpg", alt: "Pareja internacional saludando en el mirador del Puente de Dios", hasRealPeople: true },
      { src: "/imagenes/puente-de-dios-tamasopo/gallery-new-14.jpg", alt: "Mujer saltando desde cuerda al agua turquesa del Puente de Dios", hasRealPeople: true },
      { src: "/imagenes/puente-de-dios-tamasopo/gallery-new-15.jpg", alt: "Turista en el tobogán natural de travertino de Tamasopo", hasRealPeople: true },
      { src: "/imagenes/puente-de-dios-tamasopo/gallery-new-16.jpg", alt: "Dos chicas en la poza circular de Tamasopo — pozas escalonadas con selva", hasRealPeople: true },
      { src: "/imagenes/puente-de-dios-tamasopo/gallery-new-17.jpg", alt: "Hombre saltando al vacío sobre poza azul del Puente de Dios — aventura extrema", hasRealPeople: true },
    ],
  },
  {
    id:               "tour-buceo-media-luna",
    slug:             "buceo-media-luna",
    categoria:        "aventura",
    icon:             "Anchor",
    tipo:             "Buceo & Naturaleza",
    dificultad:       "baja",
    duracion_hrs:     4,
    /* Nos vemos en la laguna misma, en Rioverde. */
    recogida:         {
      tipo:  "en-sitio",
      lugar: {
        es: "la entrada de la Laguna de la Media Luna, en Rioverde",
        en: "the entrance of the Media Luna Lagoon, in Rioverde",
      },
    },
    reviewCount:      31,
    groupMin:         2,
    groupMax:         10,
    privateAvailable: false,
    soloAdultos:      true,
    nombre:           "Descubre el Buceo en la Laguna de la Media Luna — Tu Primera Inmersión con Instructor PADI",
    nombreCorto:      "Buceo en la Media Luna",
    articulo:         "el",
    tagline:          "Respira bajo el agua por primera vez en las aguas frescas y cristalinas de la Media Luna — sin experiencia previa",
    precio:           1300,
    urgencia:         "Primera inmersión con instructor PADI — se reserva con anticipación",
    descripcion:
      "Vive tu primera experiencia de buceo con equipo SCUBA en la Laguna de la Media Luna, en Rioverde, de aguas frescas y cristalinas. Respirar bajo el agua nunca fue tan fácil: no necesitas experiencia previa, solo ganas. Un instructor certificado PADI te acompaña paso a paso — primero practicas en aguas poco profundas y, cuando estés listo, desciendes entre 5 y 10 metros. Son 4 horas de capacitación e incluye el equipo de buceo y las fotografías digitales de tu inmersión. {precio} por persona.",
    descripcionLarga:
      "Respirar bajo el agua nunca había sido tan fácil y accesible: el requisito más importante es tu deseo de hacerlo, el resto corre por nuestra cuenta. Este es un programa 'Descubre el Buceo' (Discover Scuba Diving) diseñado para que logres tu sueño de descubrir el buceo aunque nunca hayas puesto un tanque en la espalda.\n\nLo hacemos en la Laguna de la Media Luna, en Rioverde, San Luis Potosí, de aguas frescas y cristalinas — un lugar ideal para vivir tu primera inmersión con calma y seguridad.\n\nSe requieren solamente 4 horas de capacitación. Durante ese tiempo aprendes los principios básicos del buceo con equipo SCUBA, incluyendo el equipo y las técnicas de buceo. Primero recibes una breve orientación de un instructor certificado PADI; después pones a prueba tus habilidades en aguas poco profundas, ganando confianza y seguridad, y cuando estés listo desciendes entre 5 y 10 metros por debajo de la superficie, siempre acompañado.\n\nTu día incluye el instructor PADI, el equipo de buceo y las fotografías digitales del recuerdo. Solo necesitas traer traje de baño, toalla y dinero para la entrada al parque. Es una actividad para mayores de 10 años con buena salud; no es apta para personas con problemas respiratorios, cardiovasculares o afecciones de oído, ni para mujeres embarazadas, y no puedes bucear bajo efectos de alcohol o drogas.\n\n¡Diversión y aventura bajo el agua! Si siempre quisiste saber qué se siente respirar bajo el agua, este es tu momento.",
    destinos: [
      "Laguna de la Media Luna (Rioverde, San Luis Potosí)",
      "Orientación con instructor certificado PADI",
      "Práctica de habilidades en aguas poco profundas",
      "Inmersión de 5 a 10 metros por debajo de la superficie",
    ],
    incluye: [
      "Instructor certificado PADI",
      "Equipo completo de buceo (SCUBA)",
      "4 horas de capacitación y práctica",
      "Fotografías digitales de tu inmersión",
      "Inmersión guiada de 5 a 10 metros de profundidad",
    ],
    imagen_hero: "/imagenes/tours/buceo-media-luna/hero.jpg",
    itinerario: [
      { hora: "8:00–9:00 AM", momento: "Punto de encuentro",
        texto: "Nos vemos en la entrada de la Laguna de la Media Luna, en Rioverde. Llegas por tu cuenta y la entrada al parque se paga ahí, en efectivo." },
      { hora: "9:15 AM", momento: "Orientación",
        texto: "Tu instructor certificado PADI te explica el equipo SCUBA pieza por pieza y cómo respirar bajo el agua. Aquí no hay prisa." },
      { hora: "10:00 AM", momento: "Práctica en aguas poco profundas",
        texto: "Las habilidades básicas donde haces pie: vaciar la máscara, recuperar el regulador, controlar la flotación." },
      { hora: "11:00 AM", momento: "La inmersión",
        texto: "Bajas de 5 a 10 metros con tu instructor al lado, entre los sabinos sumergidos y el agua cristalina de la laguna. Las fotos van incluidas.",
        foto: "/imagenes/tours/buceo-media-luna/hero.jpg" },
      { hora: "12:00 PM", momento: "Cierre",
        texto: "Se entrega el equipo y te quedas con las fotos digitales de tu primera inmersión." },
    ],
    collage: [
      "/imagenes/tours/buceo-media-luna/gallery-3.jpg",
      "/imagenes/tours/buceo-media-luna/hero.jpg",
      "/imagenes/tours/buceo-media-luna/gallery-2.jpg",
    ],
    imagenes: [
      "/imagenes/tours/buceo-media-luna/hero.jpg",
      "/imagenes/tours/buceo-media-luna/gallery-1.jpg",
    ],
    gallery: [
      { src: "/imagenes/tours/buceo-media-luna/hero.jpg",      alt: "Grupo de buzos con equipo SCUBA junto a una escultura sumergida en las aguas cristalinas de la Laguna de la Media Luna, uno haciendo la señal de OK", hasRealPeople: true },
      { src: "/imagenes/tours/buceo-media-luna/gallery-1.jpg", alt: "Tres buzos posando junto a una figura sumergida entre la vegetación acuática de la Laguna de la Media Luna en Rioverde", hasRealPeople: true },
      { src: "/imagenes/tours/buceo-media-luna/gallery-2.jpg", alt: "Dos buzos haciendo pulgar arriba mientras flotan sobre el fondo cristalino de la Laguna de la Media Luna", hasRealPeople: true },
      { src: "/imagenes/tours/buceo-media-luna/gallery-3.jpg", alt: "Buceadores en la superficie de la Laguna de la Media Luna rodeados de sabinos y cielo abierto tras su inmersión", hasRealPeople: true },
    ],
  },
  {
    id:               "tour-travesia-cafe",
    slug:             "travesia-del-cafe",
    categoria:        "ecoturismo",
    icon:             "Leaf",
    tipo:             "Cultura & Sabor",
    dificultad:       "baja",
    // Dura de 2 h y media a 3, no 5 (Manolo, 28 sep).
    duracion_hrs:     3,
    duracionRango:    [2.5, 3],
    // 🔴 ARREGLO (28 sep): mismo fallo que el Edén. Su `incluye` y su
    // descripción dicen "desde tu hospedaje EN XILITLA … en RZR", pero como no
    // figuraba en la lista de casos especiales de `TourDeparture`, la ficha
    // prometía recogida en Ciudad Valles y una camioneta.
    recogida: {
      tipo:     "hospedaje-xilitla",
      vehiculo: { es: "RZR", en: "RZR (side-by-side)" },
      nota: {
        es: "¿Te hospedas en Ciudad Valles? La subida a la finca se hace en RZR desde Xilitla. Sí podemos ir por ti hasta allá con un costo extra de traslado: escríbenos y te lo cotizamos.",
        en: "Staying in Ciudad Valles? The ride up to the farm leaves from Xilitla in an RZR. We can come and get you there for an extra transfer fee — message us and we'll quote it.",
      },
    },
    reviewCount:      43,
    groupMin:         2,
    groupMax:         12,
    privateAvailable: false,
    nombre:           "Travesía del Café — Finca Cafetalera de Xilitla en RZR",
    nombreCorto:      "Travesía del Café",
    articulo:         "la",
    tagline:          "El sabor de Xilitla, desde la mata hasta la taza",
    precio:           900,
    precioUnidad:     "persona",
    urgencia:         "Grupos pequeños en finca — se reserva con anticipación",
    descripcion:
      "Súbete a un RZR y sube a los cafetales de Xilitla. Caminas entre las matas con quien las cosecha, ves cómo se despulpa, se seca y se tuesta el grano, y cierras con una cata de café recién tostado. Una experiencia de sabor y tradición, apta para toda la familia. {precio} por persona.",
    descripcionLarga:
      "Xilitla huele a café mucho antes de que llegues a la finca. La sierra que rodea al pueblo está sembrada de cafetales bajo sombra, y esta travesía te lleva justo ahí: al lugar donde nace la taza que te tomas por la mañana.\n\nEl trayecto ya es parte de la experiencia. Te recogemos en tu hospedaje en Xilitla y subimos a la finca en RZR, por los caminos de terracería que atraviesan la selva húmeda — el mismo tipo de vehículo de nuestros recorridos off-road, pero aquí el destino es un cafetal.\n\nEn la finca te recibe la familia cafetalera. Caminas entre las matas, aprendes a distinguir el grano maduro del que todavía no lo está, y sigues el proceso completo: la cosecha a mano, el despulpado, el patio de secado donde el grano se extiende al sol y se remueve durante días, y por último el tostado en el tambor, cuando el olor lo llena todo.\n\nEl final es la cata. Frente a los platos con el grano verde, el tostado y el molido, aprendes a oler y a probar como lo hacen los catadores, y te sirven el café de esa misma finca. Muchos se van con un paquete bajo el brazo.\n\nEs un recorrido tranquilo, sin exigencia física, ideal para ir en pareja, con amigos o con la familia. Dura entre dos horas y media y tres, y sale con un mínimo de 2 personas.",
    destinos: [
      "Cafetal bajo sombra de la sierra de Xilitla",
      "Patio de secado del grano",
      "Tostaduría artesanal",
      "Barra de cata",
    ],
    incluye: [
      "Traslado redondo desde tu hospedaje en Xilitla — el camino a la finca se hace en RZR",
      "Entradas y acceso a la finca cafetalera",
      "Recorrido guiado por el cafetal y por todo el proceso del café",
      "Cata de café recién tostado",
    ],
    imagen_hero: "/imagenes/tours/travesia-del-cafe/hero.jpg",
    itinerario: [
      { hora: "8:00–9:00 AM", momento: "Recogida",
        texto: "Pasamos por ti a tu hospedaje en Xilitla. El camino a la finca se hace en RZR, así que sales del pueblo ya en el vehículo." },
      { hora: "8:20 AM", momento: "Subida a la finca",
        texto: "Caminos de terracería entre la selva húmeda hasta el cafetal bajo sombra. El trayecto ya es parte de la experiencia." },
      { hora: "8:50 AM", momento: "El cafetal",
        texto: "Caminas entre las matas con la familia cafetalera y aprendes a distinguir el grano maduro del que todavía no lo está.",
        foto: "/imagenes/tours/travesia-del-cafe/hero.jpg" },
      { hora: "9:25 AM", momento: "El patio de secado",
        texto: "Donde el grano se extiende al sol y se remueve durante días. Aquí se ve por qué el café tarda tanto en llegar a la taza.",
        foto: "/imagenes/tours/travesia-del-cafe/gallery-7.jpg" },
      { hora: "9:50 AM", momento: "La tostaduría",
        texto: "El tambor girando y el olor llenándolo todo. Es el momento en que la finca huele a lo que te vas a tomar.",
        foto: "/imagenes/tours/travesia-del-cafe/gallery-2.jpg" },
      { hora: "10:15 AM", momento: "La cata",
        texto: "Frente a los platos con el grano verde, el tostado y el molido, aprendes a oler y a probar como lo hacen los catadores. Muchos se van con un paquete bajo el brazo.",
        foto: "/imagenes/tours/travesia-del-cafe/gallery-6.jpg" },
      { hora: "10:30–11:00 AM", momento: "Regreso",
        texto: "De vuelta a tu hospedaje en Xilitla." },
    ],
    logo: "/imagenes/tours/logos/travesia-del-cafe.webp",
    collage: [
      "/imagenes/tours/travesia-del-cafe/hero.jpg",
      "/imagenes/tours/travesia-del-cafe/gallery-7.jpg",
      "/imagenes/tours/travesia-del-cafe/gallery-2.jpg",
    ],
    imagenes: [
      "/imagenes/tours/travesia-del-cafe/hero.jpg",
      "/imagenes/tours/travesia-del-cafe/gallery-1.jpg",
    ],
    gallery: [
      { src: "/imagenes/tours/travesia-del-cafe/hero.jpg",      alt: "Caficultor cosechando a mano los granos rojos y maduros de una mata de café en la sierra de Xilitla", hasRealPeople: true },
      { src: "/imagenes/tours/travesia-del-cafe/gallery-1.jpg", alt: "Grupo de visitantes probando café recién servido junto al tostador de la finca cafetalera de Xilitla", hasRealPeople: true },
      { src: "/imagenes/tours/travesia-del-cafe/gallery-2.jpg", alt: "Anfitriona con poncho amarillo mostrando una pala con granos de café recién tostados sobre el tambor enfriador", hasRealPeople: true },
      { src: "/imagenes/tours/travesia-del-cafe/gallery-3.jpg", alt: "Cuatro visitantes con ponchos y sombreros de palma posando bajo un árbol enorme en medio del cafetal", hasRealPeople: true },
      { src: "/imagenes/tours/travesia-del-cafe/gallery-4.jpg", alt: "El caficultor explicando el secado del grano al grupo de visitantes, en cuclillas junto al patio de secado", hasRealPeople: true },
      { src: "/imagenes/tours/travesia-del-cafe/gallery-5.jpg", alt: "Visitantes escuchando la historia de la familia cafetalera dentro de la tostaduría, con las fotos antiguas colgadas del techo", hasRealPeople: true },
      { src: "/imagenes/tours/travesia-del-cafe/gallery-6.jpg", alt: "Brindis con tazas de café durante la cata, con los platos de grano verde, tostado y molido sobre la barra", hasRealPeople: true },
      { src: "/imagenes/tours/travesia-del-cafe/gallery-7.jpg", alt: "Dos visitantes separando granos de café a mano en el patio de secado de la finca", hasRealPeople: true },
    ],
  },

  {
    id:               "tour-gruta-xilo",
    slug:             "gruta-de-xilo",
    categoria:        "aventura",
    icon:             "Compass",
    tipo:             "Cueva & Noche",
    dificultad:       "media",
    duracion_hrs:     3,
    recogida: {
      // Pasamos por él a su hospedaje en Xilitla. Desde Ciudad Valles también
      // vamos, pero con costo adicional que se cotiza por WhatsApp (decisión de
      // Manolo, 28 sep: sin monto publicado).
      tipo:       "hospedaje-xilitla",
      // Confirmado por Manolo el 28 sep: es de NOCHE y la recogida es a las
      // 7 PM. Sin este número la ficha sumaba las 3 h a las 8:00 AM y
      // prometía "Regreso aprox. 11:00 AM".
      horaInicio: 19,
      ventanaHrs: 0,
      vehiculo:   { es: "RZR", en: "RZR (side-by-side)" },
      nota: {
        es: "¿Te hospedas en Ciudad Valles? El traslado incluido es dentro de Xilitla; desde Ciudad Valles también vamos por ti, con costo adicional: escríbenos por WhatsApp y te lo cotizamos.",
        en: "Staying in Ciudad Valles? The included transfer covers Xilitla; we can also pick you up in Ciudad Valles at an additional cost — message us on WhatsApp and we'll quote it.",
      },
    },
    // Recorrido nuevo: sin reseñas propias. `reviewCount: 0` apaga el
    // aggregateRating del JSON-LD y el bloque de opiniones — no se inventa
    // una calificación (ver src/lib/resenas.ts).
    reviewCount:      0,
    groupMin:         2,
    groupMax:         8,
    privateAvailable: true,
    nombre:           "Gruta de Xilo — Recorrido Nocturno por la Cueva de Xilitla",
    nombreCorto:      "Gruta de Xilo",
    articulo:         "la",
    // También se busca en plural ("Grutas de Xilo") y como "tour nocturno".
    // 🔴 La cabeza del título NO pasa de 46: con el sufijo más corto de la
    // plantilla (" | $900 MXN") queda en 57, y si el precio sube a cuatro
    // cifras sigue cabiendo en 59 sin que la plantilla la recorte.
    seo: {
      titulo: {
        es: "Gruta de Xilo: Tour Nocturno en Cueva, Xilitla",
        en: "Xilo Cave Night Tour, Xilitla",
      },
      descripcion: {
        es: "Gruta de Xilo, tour nocturno en Xilitla: unos 900 m entre estalactitas hasta pozas de agua cristalina, con casco, lámpara y guía. {precio} por persona.",
        en: "Xilo Cave night tour in Xilitla: about 900 m among stalactites to pools of crystal-clear water, with helmet, headlamp and guide. {precio} per person.",
      },
      alias: ["Grutas de Xilo"],
    },
    tagline:          "Novecientos metros bajo la sierra, de noche",
    precio:           900,
    precioUnidad:     "persona",
    urgencia:         "Salida nocturna — se reserva con anticipación",
    descripcion:
      "Una caminata de 15 a 20 minutos por la selva te deja en la boca de la gruta, ya de noche. Adentro recorres unos 900 metros entre estalactitas y estalagmitas que tardaron millones de años en formarse, y el recorrido cierra en unos jacuzzis naturales de agua cristalina dentro de la cueva. Vas con casco, lámpara y guía acreditado. {precio} por persona.",
    descripcionLarga:
      "Casi todos los recorridos de la Huasteca se hacen de día. Este no. La Gruta de Xilo —también la encontrarás como Grutas de Xilo— se camina de noche, y esa es la mitad de la experiencia: sin el ruido ni el calor del día, lo único que existe es el círculo de luz de tu lámpara y lo que alcanza a iluminar.\n\nEl casco y la lámpara frontal te los entregamos al inicio, cuando pasamos por ti. Luego viene una caminata de 15 a 20 minutos por la selva hasta la entrada de la gruta; ahí el guía explica por dónde se pisa y se entra.\n\nAdentro son unos 900 metros de recorrido. Las paredes son un catálogo de formaciones: estalactitas que cuelgan de la bóveda, estalagmitas que suben desde el piso, columnas donde las dos se encontraron después de millones de años de gota a gota. Hay tramos amplios donde se camina de pie y tramos donde hay que agacharse; se avanza despacio, en grupo chico.\n\nAl final del recorrido están los jacuzzis: pozas de agua cristalina formadas dentro de la propia gruta. Ahí se hace una dinámica de introspección — apagar las lámparas, quedarse en silencio unos minutos y escuchar la cueva. Es el momento que la gente recuerda.\n\nDura unas 3 horas en total y es de noche. Pasamos por ti a tu hospedaje en Xilitla en RZR; si te quedas en Ciudad Valles también vamos por ti, con costo adicional que te cotizamos por WhatsApp. Lleva calzado cerrado que se pueda mojar y ropa de cambio.",
    destinos: [
      "Selva de Xilitla (caminata de acceso)",
      "Gruta de Xilo",
      "Jacuzzis naturales de la gruta",
    ],
    incluye: [
      // "Traslado redondo" y no "Recogida": la meta descripción, la frase del
      // precio y el bot buscaban la palabra "traslado" y, al no hallarla,
      // decían que este recorrido no llevaba transporte.
      "Traslado redondo en RZR desde tu hospedaje en Xilitla",
      "Taquillas y acceso a la gruta",
      "Casco y lámpara frontal para cada persona",
      "Guía acreditado NOM-09 SECTUR",
      "Botiquín de primeros auxilios",
    ],
    // 🔴 La portada se eligió por dónde cae el TEXTO: el título y el precio
    // caen abajo a la izquierda, donde esta toma tiene roca oscura. Las otras
    // candidatas tenían formaciones pálidas justo ahí y el título se perdía.
    imagen_hero: "/imagenes/tours/gruta-de-xilo/hero.jpg",
    itinerario: [
      { hora: "7:00 PM", momento: "Recogida",
        texto: "Pasamos por ti a tu hospedaje en Xilitla, en el propio RZR, y ahí mismo te entregamos tu casco y tu lámpara frontal. Ya está oscureciendo." },
      { hora: "7:30 PM", momento: "Caminata por la selva",
        texto: "De 15 a 20 minutos a pie, ya con la lámpara encendida, hasta la boca de la gruta." },
      { hora: "8:00 PM", momento: "Entras a la cueva",
        texto: "El guía explica por dónde se pisa y se entra. A partir de aquí lo único que existe es el círculo de luz de tu lámpara." },
      { hora: "8:45 PM", momento: "Las formaciones",
        texto: "Unos 900 metros entre estalactitas, estalagmitas y columnas donde las dos se encontraron después de millones de años de gota a gota.",
        foto: "/imagenes/tours/gruta-de-xilo/gallery-2.jpg" },
      { hora: "9:30 PM", momento: "Los jacuzzis y el silencio",
        texto: "El final del recorrido son pozas de agua cristalina formadas dentro de la gruta. Ahí se apagan las lámparas unos minutos para escuchar la cueva. Es el momento que la gente recuerda.",
        foto: "/imagenes/tours/gruta-de-xilo/gallery-5.jpg" },
      { hora: "10:00 PM", momento: "Regreso",
        texto: "De vuelta a tu hospedaje en Xilitla." },
    ],
    collage: [
      "/imagenes/tours/gruta-de-xilo/hero.jpg",
      "/imagenes/tours/gruta-de-xilo/gallery-2.jpg",
      "/imagenes/tours/gruta-de-xilo/gallery-5.jpg",
    ],
    imagenes: [
      "/imagenes/tours/gruta-de-xilo/hero.jpg",
      "/imagenes/tours/gruta-de-xilo/gallery-1.jpg",
    ],
    gallery: [
      { src: "/imagenes/tours/gruta-de-xilo/hero.jpg",      alt: "Grupo avanzando con lámparas frontales por un pasaje inundado de la Gruta de Xilo, con los reflejos en el agua", hasRealPeople: true },
      { src: "/imagenes/tours/gruta-de-xilo/gallery-1.jpg", alt: "Visitante sentado sobre una formación rocosa mirando la bóveda de la gruta, iluminado solo por su lámpara", hasRealPeople: true },
      { src: "/imagenes/tours/gruta-de-xilo/gallery-2.jpg", alt: "Visitante con los brazos abiertos frente a las columnas de la Gruta de Xilo, que lo superan varias veces en altura", hasRealPeople: true },
      { src: "/imagenes/tours/gruta-de-xilo/gallery-3.jpg", alt: "Pareja con casco en cuclillas entre dos columnas de piedra formadas gota a gota dentro de la gruta", hasRealPeople: true },
      { src: "/imagenes/tours/gruta-de-xilo/gallery-4.jpg", alt: "Guía y visitante de pie sobre una colada de piedra en el agua, al fondo de la Gruta de Xilo", hasRealPeople: true },
      { src: "/imagenes/tours/gruta-de-xilo/gallery-5.jpg", alt: "Pareja sobre una roca en uno de los jacuzzis naturales de agua cristalina del final del recorrido", hasRealPeople: true },
    ],
  },

  {
    id:               "tour-amanecer-nubes",
    slug:             "amanecer-de-nubes",
    categoria:        "aventura",
    icon:             "Mountain",
    tipo:             "Senderismo & Amanecer",
    dificultad:       "media",
    duracion_hrs:     8,
    duracionRango:    [7, 8],
    recogida: {
      tipo: "hospedaje-xilitla",
      // Confirmado por Manolo el 28 sep: recogida entre 3 y 4 AM, para llegar a
      // la cima antes del amanecer; con 7-8 h vuelve a media mañana.
      horaInicio: 3,
      ventanaHrs: 1,
      nota: {
        es: "¿Te hospedas en Ciudad Valles? La salida es de madrugada desde Xilitla. Sí podemos ir por ti hasta allá con un costo extra de traslado: escríbenos y te lo cotizamos.",
        en: "Staying in Ciudad Valles? We leave from Xilitla in the small hours. We can come and get you there for an extra transfer fee — message us and we'll quote it.",
      },
    },
    reviewCount:      0,
    groupMin:         2,
    groupMax:         12,
    privateAvailable: true,
    nombre:           "Amanecer de Nubes — Senderismo al Cerro del Pilón",
    nombreCorto:      "Amanecer de Nubes",
    articulo:         "el",
    // "Amanecer de Nubes" es nombre de casa: lo que se teclea es el lugar
    // ("Cerro del Pilón", "mar de nubes", "La Trinidad"). Ese lugar ya va en el
    // título y en la meta.
    // 🔴 Los alias salen como `alternateName` del TouristTrip y como "También
    // se le conoce como" en llms.txt: son otros nombres del RECORRIDO, no del
    // cerro. "Cerro del Pilón" a secas confundía el viaje con el lugar.
    // 🔴 La meta dice "suele haber" mar de nubes, no lo promete: depende del
    // clima (ver `tourRequisitos.ts`).
    seo: {
      titulo: {
        es: "Amanecer en el Cerro del Pilón, Xilitla",
        en: "Sea of Clouds Sunrise Hike, Xilitla",
      },
      descripcion: {
        es: "Amanecer en el Cerro del Pilón, Xilitla: senderismo de madrugada desde La Trinidad a la cima, donde suele haber mar de nubes. {precio} por persona.",
        en: "Sea of clouds sunrise hike to Cerro del Pilón, Xilitla: a pre-dawn climb from La Trinidad to a summit often above the clouds. {precio} per person.",
      },
      alias: ["Senderismo al Cerro del Pilón", "Amanecer en el Cerro del Pilón"],
    },
    tagline:          "Llegar a la cima antes que el sol",
    precio:           1700,
    precioUnidad:     "persona",
    urgencia:         "Salida de madrugada — se reserva con un día de anticipación",
    descripcion:
      "Mientras el resto de la Huasteca duerme, tú vas subiendo. Senderismo de madrugada por el bosque de la Trinidad hasta la cima del Cerro del Pilón, para llegar justo cuando sale el sol, muchas veces por encima del mar de nubes que cubre la sierra. Entre 7 y 8 horas, con guía acreditado y traslado desde tu hospedaje. {precio} por persona.",
    descripcionLarga:
      "Hay un momento, arriba del Cerro del Pilón, en el que el cielo se pone naranja y abajo no se ve la tierra: solo una capa de nubes que tapa los valles de un lado al otro del horizonte. Dura unos minutos. Para verlo hay que estar arriba antes de que amanezca, y por eso este recorrido empieza de madrugada.\n\nSalimos de noche desde tu hospedaje en Xilitla y subimos al bosque de la Trinidad, el bosque de niebla que corona la sierra a casi 2,000 metros. De ahí arranca la caminata: sendero entre pinos y encinos, con lámpara frontal, en subida constante y a oscuras. No hace falta experiencia de montaña, pero sí condición para caminar varias horas en pendiente.\n\nLa llegada a la cima se calcula para coincidir con el amanecer. Primero se pone azul, luego naranja, y cuando el sol rompe el horizonte el mar de nubes se enciende por abajo. Ahí se para todo: se toman fotos, se desayuna algo y se deja que pase.\n\nLa bajada se hace ya con luz, que es cuando se ve el bosque por el que subiste a ciegas: los madroños, los helechos, la niebla colgada entre los árboles.\n\nEn total son entre 7 y 8 horas contando el traslado. Arriba hace frío de verdad aunque en Xilitla haga calor: lleva chamarra, calzado de montaña con agarre y lámpara. Nosotros ponemos el equipo de seguridad y el guía acreditado.",
    destinos: [
      "Bosque de niebla de La Trinidad",
      "Cerro del Pilón",
      "Mirador del mar de nubes",
    ],
    incluye: [
      "Traslado redondo desde tu hospedaje en Xilitla",
      "Taquillas y entradas",
      "Equipo de seguridad",
      "Guía acreditado NOM-09 SECTUR",
      "Botiquín de primeros auxilios",
    ],
    imagen_hero: "/imagenes/tours/amanecer-de-nubes/hero.jpg",
    itinerario: [
      { hora: "3:00–4:00 AM", momento: "Recogida",
        texto: "Pasamos por ti a tu hospedaje en Xilitla, de noche cerrada. Lleva chamarra: arriba el clima es otro." },
      { hora: "4:30 AM", momento: "Subida a La Trinidad",
        texto: "Camino de sierra hasta el bosque de niebla, a casi 2,000 metros. Se sube de noche y con las ventanas empañadas." },
      { hora: "5:00 AM", momento: "Arranca la caminata",
        texto: "Sendero entre pinos y encinos, con lámpara frontal y en subida constante. No hace falta experiencia de montaña, pero sí condición." },
      { hora: "6:45 AM", momento: "La cima",
        texto: "Llegas al Cerro del Pilón todavía a oscuras. Los últimos metros son de roca y hay tiempo de acomodarse antes de que salga el sol.",
        foto: "/imagenes/tours/amanecer-de-nubes/gallery-2.jpg" },
      { hora: "7:00 AM", momento: "El amanecer",
        texto: "Primero se pone azul, luego naranja, y cuando el sol rompe el horizonte el mar de nubes se enciende por abajo. Dura unos minutos y ahí se para todo.",
        foto: "/imagenes/tours/amanecer-de-nubes/hero.jpg" },
      { hora: "8:30 AM", momento: "La bajada, ya con luz",
        texto: "Es cuando por fin ves el bosque por el que subiste a ciegas: los madroños, los helechos y la niebla colgada entre los árboles.",
        foto: "/imagenes/tours/amanecer-de-nubes/gallery-7.jpg" },
      { hora: "10:00–11:00 AM", momento: "Regreso",
        texto: "Te dejamos en tu hospedaje. Te queda el día entero por delante." },
    ],
    collage: [
      "/imagenes/tours/amanecer-de-nubes/gallery-7.jpg",
      "/imagenes/tours/amanecer-de-nubes/gallery-2.jpg",
      "/imagenes/tours/amanecer-de-nubes/hero.jpg",
    ],
    imagenes: [
      "/imagenes/tours/amanecer-de-nubes/hero.jpg",
      "/imagenes/tours/amanecer-de-nubes/gallery-1.jpg",
    ],
    gallery: [
      { src: "/imagenes/tours/amanecer-de-nubes/hero.jpg",      alt: "Guía en la cima del Cerro del Pilón viendo salir el sol sobre el mar de nubes que cubre la sierra", hasRealPeople: true },
      { src: "/imagenes/tours/amanecer-de-nubes/gallery-1.jpg", alt: "Excursionista sentado en una roca de la cima, de espaldas, frente al amanecer sobre las nubes", hasRealPeople: true },
      { src: "/imagenes/tours/amanecer-de-nubes/gallery-2.jpg", alt: "Dos siluetas de pie sobre la roca más alta del Cerro del Pilón, recortadas contra el sol que sale", hasRealPeople: true },
      { src: "/imagenes/tours/amanecer-de-nubes/gallery-3.jpg", alt: "Pareja con casco y lámpara frontal en la cima, con el mar de nubes y el cielo morado detrás", hasRealPeople: true },
      { src: "/imagenes/tours/amanecer-de-nubes/gallery-4.jpg", alt: "Los rayos del sol abriéndose sobre el mar de nubes y las montañas de la Huasteca Potosina" },
      { src: "/imagenes/tours/amanecer-de-nubes/gallery-5.jpg", alt: "Pareja descansando sobre las rocas de la cima con la franja naranja del amanecer al fondo", hasRealPeople: true },
      { src: "/imagenes/tours/amanecer-de-nubes/gallery-6.jpg", alt: "Excursionista de espaldas con su mochila viendo romper el amanecer desde el sendero de la cima", hasRealPeople: true },
      { src: "/imagenes/tours/amanecer-de-nubes/gallery-7.jpg", alt: "Pinos del bosque de niebla de la Trinidad recortados contra la primera luz naranja del día" },
    ],
  },

  {
    id:               "tour-olla-de-la-luz",
    slug:             "olla-de-la-luz",
    categoria:        "ecoturismo",
    icon:             "Mountain",
    tipo:             "Sótano & Bosque de Niebla",
    dificultad:       "media",
    duracion_hrs:     9,
    duracionRango:    [8, 9],
    recogida: {
      tipo: "hospedaje-xilitla",
      // Confirmado por Manolo el 28 sep: recogida entre 7 y 8 AM. Con 8-9 h
      // vuelve entre las 3 y las 4 de la tarde, con luz para bajar la sierra.
      horaInicio: 7,
      ventanaHrs: 1,
      nota: {
        es: "¿Te hospedas en Ciudad Valles? El traslado incluido es solo dentro de Xilitla, pero sí podemos ir por ti hasta allá con un costo extra de traslado: escríbenos y te lo cotizamos.",
        en: "Staying in Ciudad Valles? The included transfer only covers Xilitla, but we can come and get you there for an extra transfer fee — message us and we'll quote it.",
      },
    },
    reviewCount:      0,
    groupMin:         2,
    groupMax:         14,
    privateAvailable: true,
    nombre:           "Olla de la Luz — El Sótano del Bosque de Niebla de Xilitla",
    nombreCorto:      "Olla de la Luz",
    articulo:         "la",
    // Medios y guías de viaje lo escriben muy a menudo "Hoya de la Luz" (el
    // ayuntamiento usa "Olla"): los dos títulos llevan los dos nombres, y
    // "Olla" primero porque es el del H1 y el del carrito. `destinos.ts` ya lo
    // tenía entre sus keywords.
    seo: {
      titulo: {
        es: "Olla de la Luz (Hoya de la Luz), Xilitla",
        en: "Olla de la Luz (Hoya de la Luz) Hike, Xilitla",
      },
      descripcion: {
        es: "Olla de la Luz (Hoya de la Luz), Xilitla: caminata guiada por el bosque de niebla de La Trinidad hasta un sótano de 193 m. {precio} por persona.",
        en: "Olla de la Luz (Hoya de la Luz), Xilitla: a guided hike through the La Trinidad cloud forest to the rim of a 193 m sinkhole. {precio} per person.",
      },
      alias: ["Hoya de la Luz"],
    },
    tagline:          "Un abismo donde la luz entra como cascada",
    precio:           1800,
    precioUnidad:     "persona",
    urgencia:         "Solo se entra con guía de la comunidad — se reserva con anticipación",
    descripcion:
      "A 14 km de Xilitla, en lo más alto de la comunidad de la Trinidad, se abre un sótano vertical de 193 metros de profundidad y 233 de diámetro, rodeado de bosque de niebla, pinos, cedros y orquídeas. Se llega tras una caminata guiada de unas 2 horas entre bosque, llanos y miradores. Entre 8 y 9 horas. {precio} por persona.",
    descripcionLarga:
      "La Olla de la Luz —también la verás escrita Hoya de la Luz— es de esos lugares que no se entienden en una foto. Es un sótano vertical de 193 metros de profundidad y 233 de diámetro abierto en lo alto de la sierra de Xilitla: un hueco en el bosque tan grande que en su fondo creció otro bosque, y tan hondo que la luz del sol solo entra por completo unas horas al día.\n\nPara llegar hay que subir primero a La Trinidad, la comunidad náhuatl que vive a unos 14 km de Xilitla, en uno de los bosques de niebla mejor conservados de la Huasteca. La carretera sube casi 2,000 metros por camino de sierra, y cuando llegas el clima ya es otro: fresco, húmedo, con la niebla enredada entre los pinos.\n\nDe ahí arranca la caminata, de unas 2 horas, con guía de la propia comunidad — es la única manera de entrar. Se atraviesan tramos de bosque cerrado, llanos abiertos y varios miradores. El camino pasa entre pinos, cedros y orquídeas, y si hay suerte se cruzan coatíes o se oyen las pavas.\n\nY entonces el bosque se abre. Asomarse al borde de la Olla de la Luz es la clase de vista que recalibra la escala de las cosas: la pared de roca cayendo a plomo, las copas de los árboles allá abajo como brócoli, y el silencio. El guía te enseña dónde pararse y dónde no.\n\nSon entre 8 y 9 horas contando traslados. Lleva calzado de senderismo, chamarra o impermeable, agua y algo de comer. Arriba hace frío aunque en Xilitla estés sudando.",
    destinos: [
      "La Trinidad — Bosque de Niebla de Xilitla",
      "Miradores del Cerro de la Luz",
      "Olla de la Luz",
    ],
    incluye: [
      "Traslado redondo desde tu hospedaje en Xilitla",
      "Caminata guiada de unas 2 horas entre bosque, llanos y miradores",
      "Guía acreditado NOM-09 SECTUR",
      "Equipo de seguridad",
    ],
    imagen_hero: "/imagenes/tours/olla-de-la-luz/hero.jpg",
    itinerario: [
      { hora: "7:00–8:00 AM", momento: "Recogida",
        texto: "Pasamos por ti a tu hospedaje en Xilitla. Lleva calzado de senderismo y chamarra o impermeable." },
      { hora: "8:30 AM", momento: "Subida a La Trinidad",
        texto: "Unos 14 km de camino de sierra hasta la comunidad náhuatl que vive en lo alto del bosque de niebla. Al llegar el clima ya es otro: fresco y húmedo." },
      { hora: "9:30 AM", momento: "Arranca la caminata",
        texto: "Con guía de la propia comunidad, que es la única manera de entrar. El sendero atraviesa bosque cerrado y llanos abiertos.",
        foto: "/imagenes/tours/olla-de-la-luz/gallery-4.jpg" },
      { hora: "11:00 AM", momento: "Los miradores",
        texto: "El camino pasa entre pinos, cedros y orquídeas, con varias paradas de mirador. Con suerte se cruzan coatíes o se oyen las pavas." },
      { hora: "11:45 AM", momento: "La Olla de la Luz",
        texto: "El bosque se abre de golpe: 233 metros de diámetro, 193 de caída y otro bosque creciendo en el fondo. El guía te enseña dónde pararte y dónde no.",
        foto: "/imagenes/tours/olla-de-la-luz/gallery-1.jpg" },
      { hora: "1:00 PM", momento: "Camino de regreso",
        texto: "Se deshace el sendero con la luz alta, que es cuando el bosque de niebla enseña lo verde que es.",
        foto: "/imagenes/tours/olla-de-la-luz/gallery-2.jpg" },
      { hora: "3:00–4:00 PM", momento: "Regreso",
        texto: "Te dejamos en tu hospedaje en Xilitla." },
    ],
    // Primer recorrido del sitio con vídeo de portada. Vertical y de 12 s: se
    // pinta SOLO en teléfono (`HeroTourMedia`), que es ~75 % del tráfico. En
    // escritorio ni se descarga y se queda `imagen_hero`.
    videoHeroMovil: "/videos/tours/olla-de-la-luz-v1.mp4",
    collage: [
      "/imagenes/tours/olla-de-la-luz/gallery-4.jpg",
      "/imagenes/tours/olla-de-la-luz/gallery-3.jpg",
      "/imagenes/tours/olla-de-la-luz/hero.jpg",
    ],
    imagenes: [
      "/imagenes/tours/olla-de-la-luz/hero.jpg",
      "/imagenes/tours/olla-de-la-luz/gallery-1.jpg",
    ],
    gallery: [
      { src: "/imagenes/tours/olla-de-la-luz/hero.jpg",      alt: "La pared vertical de la Olla de la Luz cayendo a plomo hacia el bosque que creció en su fondo" },
      { src: "/imagenes/tours/olla-de-la-luz/gallery-1.jpg", alt: "La boca de la Olla de la Luz desde el mirador, con la sierra y el mar de nubes al fondo" },
      { src: "/imagenes/tours/olla-de-la-luz/gallery-2.jpg", alt: "Vista desde el borde hacia el fondo del sótano, donde las copas de los árboles parecen musgo" },
      { src: "/imagenes/tours/olla-de-la-luz/gallery-3.jpg", alt: "Guía de pie sobre las rocas kársticas del borde de la Olla de la Luz, entre la niebla del bosque", hasRealPeople: true },
      { src: "/imagenes/tours/olla-de-la-luz/gallery-4.jpg", alt: "Grupo caminando en fila por el sendero del bosque de niebla de la Trinidad rumbo al sótano", hasRealPeople: true },
      { src: "/imagenes/tours/olla-de-la-luz/gallery-5.jpg", alt: "Grupo completo posando sobre las rocas del borde de la Olla de la Luz al terminar la caminata", hasRealPeople: true },
    ],
  },
];

/**
 * El precio escrito DENTRO de una descripción se pone como `{precio}` y se
 * sustituye aquí con el campo `precio` del propio recorrido.
 *
 * 🔴 Nació de un desfase real: la descripción del buceo decía "$1,200 MXN por
 * persona" y el campo cobraba $1,300 quince palabras más abajo. Ese $1,200
 * viajaba además a la vista previa de WhatsApp y Facebook, porque la
 * metadescripción de /tours/[slug] sale de `descripcion`. Con el marcador ya no
 * hay dos números que mantener de acuerdo: hay uno, el que cobra el checkout.
 *
 * El formato replica `fmtMoney` de `i18n/format.ts` a propósito: esto es la capa
 * de datos y no debe importar la de idioma.
 */
export function conPrecio(texto: string, precio: number, locale: "es" | "en" = "es"): string {
  const fmt = `$${precio.toLocaleString(locale === "en" ? "en-US" : "es-MX")} MXN`;
  return texto.replace(/\{precio\}/g, fmt);
}

/**
 * El catálogo que ve todo el sitio: el de arriba, con sus precios resueltos y
 * la promo de temporada baja aplicada.
 *
 * `precio`, `precioOriginal` y las descripciones son GETTERS: se calculan cada
 * vez que se leen, así que el 30 de octubre vuelven solos al precio de lista
 * aunque el proceso lleve semanas arriba. (Antes eran valores fijos al
 * arrancar y había que desplegar ese día.) `precio` es lo que se ANUNCIA; lo
 * que se cobra depende de la fecha del recorrido: `precioDeFecha`.
 */
export const TOURS_DB: Tour[] = TOURS_RAW.map((t) => {
  const enPromo = () => promoVigente() && (PROMO_TEMPORADA.tours as ReadonlySet<string>).has(t.slug);
  const precio = () => (enPromo() ? t.precio - PROMO_TEMPORADA.monto : t.precio);
  const tour: Tour = { ...t, precioLista: t.precio };
  Object.defineProperties(tour, {
    precio:           { get: precio, enumerable: true },
    precioOriginal:   { get: () => (enPromo() ? t.precio : t.precioOriginal), enumerable: true },
    descripcion:      { get: () => conPrecio(t.descripcion, precio()), enumerable: true },
    descripcionLarga: { get: () => (t.descripcionLarga ? conPrecio(t.descripcionLarga, precio()) : t.descripcionLarga), enumerable: true },
  });
  return tour;
});

/**
 * El mismo catálogo con los precios de LISTA, sin la promo de temporada baja.
 *
 * Es el que lee el panel (cotizador, cotizaciones y reservas). Decisión de
 * Manolo (1 oct 2026): el panel tomaba TOURS_DB y cotizaba con el −$100 ya
 * restado para cualquier fecha, aunque el recorrido cayera después del 29 de
 * octubre. Ahí se cotiza siempre al precio normal y el descuento lo pone él a
 * mano (campo Descuento en cotizaciones, total editable en reservas).
 */
export const TOURS_LISTA: Tour[] = TOURS_RAW.map((t) => ({
  ...t,
  descripcion: conPrecio(t.descripcion, t.precio),
  descripcionLarga: t.descripcionLarga ? conPrecio(t.descripcionLarga, t.precio) : t.descripcionLarga,
}));

/**
 * El grupo más grande que sacamos, leído del catálogo.
 *
 * 🔴 Estaba escrito a mano ("máximo 12 personas") en 16 lugares del sitio: la
 * página de tours, las FAQ, nosotros, info práctica, contacto, las imágenes de
 * compartir y hasta la página de sustentabilidad, que lo presentaba como un
 * compromiso ambiental. Al subir el cupo a 14 todos esos textos quedaron
 * mintiendo a la vez, y alguien podía reservar 14 en línea leyendo que el
 * máximo eran 12. Es el mismo error que ya había pasado con los precios.
 *
 * Ahora sale de aquí: se cambia `groupMax` de un recorrido y el sitio entero
 * se entera solo.
 */
/**
 * Lo que cuesta de más llevar el recorrido en privado, por persona (MXN).
 *
 * 🔴 28 sep 2026 — antes cada tour traía un `privateMinPrice` suelto (de $7,000
 * a $8,500) que se publicaba como "desde X por el grupo completo". No es así
 * como se cobra: el privado es el precio normal del recorrido **más $250 por
 * cabeza**. Con la Expedición Tamul para dos, lo que el sitio anunciaba
 * ($8,500) era más del doble de lo que realmente cuesta ($3,600).
 */
export const PRIVADO_EXTRA_POR_PERSONA = 250;

export const GRUPO_MAX = Math.max(...TOURS_DB.map((t) => t.groupMax));

/** El grupo mínimo con el que sale un recorrido. */
export const GRUPO_MIN = Math.min(...TOURS_DB.map((t) => t.groupMin));

