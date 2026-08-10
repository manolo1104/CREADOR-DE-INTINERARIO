export interface GalleryImage {
  src: string;
  alt: string;
  hasRealPeople?: boolean;
  caption?: string;
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

export interface Tour {
  id:               string;
  nombre:           string;
  slug:             string;
  tagline:          string;
  descripcion:      string;
  descripcionLarga: string;
  destinos:         string[];
  incluye:          string[];
  precio:           number;
  /** Rango de duración a mostrar (ej. [8,10] → "8–10 horas"). Si no, se usa duracion_hrs. */
  duracionRango?:   [number, number];
  precioOriginal?:  number;
  /** "persona" (default) usa el flujo de reserva online; "vehiculo" se reserva por WhatsApp. */
  precioUnidad?:    "persona" | "vehiculo";
  rutas?:           TourRuta[];
  flota?:           TourVehiculo[];
  duracion_hrs:     number;
  icon:             string;
  tipo:             string;
  dificultad:       "baja" | "media" | "alta";
  imagen_hero:      string;
  imagenes:         string[];
  urgencia?:        string;
  reviewCount:      number;
  groupMin:         number;
  groupMax:         number;
  privateAvailable: boolean;
  privateMinPrice?: number;
  /** true = actividad solo para adultos/edad mínima alta (oculta selectores de niños en la reserva). */
  soloAdultos?:     boolean;
  gallery:          GalleryImage[];
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

/**
 * Los cuatro tours que concentran el interés real de los visitantes (Ruta
 * Surrealista y Tamul solos son ~47 % de las vistas). Se muestran primero en
 * /tours y en /experiencias; los otros cinco siguen existiendo, con su página y
 * su SEO intactos, bajo "Otros recorridos". Menos opciones arriba = más cierre.
 */
export const TOURS_DESTACADOS = [
  "ruta-surrealista-edward-james",
  "expedicion-tamul",
  "rzr-xilitla",
  "paraiso-escalonado-minas-micos",
] as const;

export const TOURS_DB: Tour[] = [
  {
    id:               "tour-rzr-xilitla",
    slug:             "rzr-xilitla",
    icon:             "Compass",
    tipo:             "Aventura Off-Road",
    dificultad:       "media",
    duracion_hrs:     2,
    reviewCount:      86,
    groupMin:         2,
    groupMax:         6,
    privateAvailable: false,
    nombre:           "Recorrido en RZR por Xilitla — Elige tu Ruta Off-Road",
    tagline:          "Maneja tu propio todoterreno entre selva, ríos y barro — 4 rutas, de 2 a 5 horas",
    precio:           1600,
    precioUnidad:     "vehiculo",
    urgencia:         "Flota limitada — los fines de semana se aparta con anticipación",
    descripcion:      "Maneja tu propio vehículo todoterreno por la selva húmeda de Xilitla: cruza ríos de agua cristalina, atraviesa el barro y elige entre 4 rutas — la Aldea Nanacatli (el pueblo de casitas de hongos), los miradores de la sierra, un nacimiento escondido en la selva (con kayak) o el bosque de niebla de La Trinidad. El precio es por vehículo (desde $1,600), no por persona.",
    descripcionLarga: "Pocas formas de conocer la Huasteca son tan divertidas como ir al volante de tu propio vehículo todoterreno. Tenemos 4 rutas distintas: la Nanacatli (2 h, la más popular, llega a la Aldea Nanacatli, un pueblo de casitas de hongos gigantes conocido como 'la aldea de los pitufos'), la de Miradores (3 h, vistas panorámicas de la sierra), la del Nacimiento (5 h, un nacimiento de agua cristalina en lo profundo de la selva donde te prestamos kayak y chaleco salvavidas) y la de Trinidad (5 h, sube al bosque de niebla de La Trinidad, un pueblo serrano preservado en el tiempo).\n\nNos encontramos en nuestra base en Xilitla, donde te entregamos casco y goggles y te damos un briefing de manejo. No necesitas experiencia: los vehículos son fáciles de controlar y un guía instructor abre la ruta delante de ti todo el tiempo, marcando el camino y resolviendo cualquier obstáculo. Tú solo te concentras en disfrutar.\n\nEl precio es POR VEHÍCULO, no por persona, y depende de la ruta y de la unidad que elijas: desde el RZR 500 para pareja ($1,600 la Ruta Nanacatli) hasta el Defender Familiar para 6 adultos y 2 niños o el Polaris Pro S premium. Todas las unidades incluyen gasolina, equipo de seguridad y guía. No incluye transporte hasta Xilitla ni alimentos.\n\nTe recomendamos ropa que se pueda ensuciar y mojar, calzado cerrado y una muda de cambio: vas a salir con barro y con una sonrisa difícil de borrar.",
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
    icon:             "Mountain",
    tipo:             "Aventura Extrema",
    dificultad:       "alta",
    duracion_hrs:     5,
    reviewCount:      58,
    groupMin:         2,
    groupMax:         8,
    privateAvailable: false,
    nombre:           "Rappel en la Cascada de Tamul — Descenso Frente a la Caída Más Alta de México",
    tagline:          "Adrenalina pura colgado de la pared, frente a 105 metros de agua",
    precio:           1700,
    precioOriginal:   2500,
    urgencia:         "Cupo muy limitado — máximo 8 personas por día",
    descripcion:
      "Desciende en rappel por la pared del cañón del Tampaón con la Cascada de Tamul rugiendo a tu lado. Equipo profesional, guías certificados y la fotografía aérea con dron que demuestra que sí lo hiciste. La experiencia más extrema de la Huasteca Potosina, apta también para quienes nunca han hecho rappel.",
    descripcionLarga:
      "Hay pocos lugares en el mundo donde puedas colgarte de una cuerda frente a una de las cascadas más altas de su país. La Cascada de Tamul —105 metros de agua desplomándose sobre el Río Tampaón— es el telón de fondo de esta experiencia, y desde el momento en que te asomas al borde del cañón entiendes por qué quienes la hacen no dejan de hablar de ella.\n\nTe recogemos en Ciudad Valles y empezamos en el embarcadero del río, donde te entregamos el equipo completo y nuestros guías de alta montaña te dan el briefing de técnica. No necesitas experiencia previa: el primer descenso es guiado paso a paso y la mayoría de nuestros visitantes nunca habían tocado una cuerda antes. Lo único que necesitas son ganas.\n\nUna vez asegurado al arnés, comienzas a bajar por la pared de roca caliza tapizada de vegetación, con la cascada a un costado lanzando su rocío fresco sobre ti y el agua turquesa del río esperándote abajo. El sonido es ensordecedor, el paisaje es irreal y, durante esos minutos, no existe nada más en el mundo. Nuestro fotógrafo te sigue desde el aire con dron y desde tierra, así que cada segundo queda registrado en foto y video —incluido en tu reserva, sin costo extra.\n\nLa actividad dura entre 3 y 5 horas según el grupo y el clima. El precio incluye el traslado desde Ciudad Valles, todo el equipo de seguridad, el video con dron y las fotografías con cámaras de acción; no incluye alimentos. Si buscas la historia que vas a contar el resto de tu vida, empieza aquí.",
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
    imagenes: [
      "/imagenes/tours/rappel-tamul/hero.jpg",
      "/imagenes/tours/rappel-tamul/gallery-6.jpg",
    ],
    gallery: [
      { src: "/imagenes/tours/rappel-tamul/hero.jpg",      alt: "Rapelista con cámara en el casco sonriendo en plena pared del cañón, con la Cascada de Tamul desplomándose al fondo — Huasteca Potosina", hasRealPeople: true },
      { src: "/imagenes/tours/rappel-tamul/gallery-1.jpg", alt: "Rapelista apoyado en la pared tapizada de vegetación junto a la cortina de agua de la Cascada de Tamul con el cañón turquesa al fondo", hasRealPeople: true },
      { src: "/imagenes/tours/rappel-tamul/gallery-2.jpg", alt: "Aventurero recostado en el arnés mirando hacia arriba durante el descenso en rappel frente a la Cascada de Tamul", hasRealPeople: true },
      { src: "/imagenes/tours/rappel-tamul/gallery-3.jpg", alt: "Mujer con casco blanco extendiendo los brazos en rappel sobre el río turquesa del Tampaón con la cascada al fondo", hasRealPeople: true },
      { src: "/imagenes/tours/rappel-tamul/gallery-4.jpg", alt: "Vista amplia del descenso en rappel sobre la imponente Cascada de Tamul — la caída más alta de México", hasRealPeople: true },
      { src: "/imagenes/tours/rappel-tamul/gallery-5.jpg", alt: "Rapelista de espaldas descendiendo la pared del cañón del Tampaón junto a la cortina de agua de Tamul", hasRealPeople: true },
      { src: "/imagenes/tours/rappel-tamul/gallery-6.jpg", alt: "Mujer con casco sonriendo y haciendo pulgar arriba en rappel, con pájaros volando frente a la Cascada de Tamul", hasRealPeople: true },
    ],
  },
  {
    id:               "tour-rafting-tampaon",
    slug:             "rafting-rio-tampaon",
    icon:             "Waves",
    tipo:             "Rafting & Adrenalina",
    dificultad:       "media",
    duracion_hrs:     7,
    reviewCount:      47,
    groupMin:         2,
    groupMax:         8,
    privateAvailable: false,
    nombre:           "Rafting en el Río Tampaón — Rápidos Clase III en Agua Turquesa",
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
    duracionRango:    [8, 10],
    icon:             "Waves",
    tipo:             "Aventura & Naturaleza",
    dificultad:       "media",
    duracion_hrs:     9,
    reviewCount:      127,
    groupMin:         2,
    groupMax:         12,
    privateAvailable: true,
    privateMinPrice:  8500,
    nombre:           "Expedición Tamul — Sótano, Cañón & Cueva del Agua",
    tagline:          "El tour más completo de la Huasteca en un solo día",
    precio:           1550,
    precioOriginal:   2100,
    urgencia:         "El más reservado — se llena los fines de semana",
    descripcion:
      "Navega en canoa por el Cañón del Tampaón hasta la Cascada de Tamul —la más alta de México—, asómate al imponente abismo del Sótano de las Huahuas y termina sumergiéndote en la magia subterránea de la Cueva del Agua. Una jornada que redefine lo que la naturaleza puede ofrecerte.",
    descripcionLarga:
      "La Expedición Tamul es el tour más completo de la Huasteca en un solo día: salimos por la mañana —sin madrugadas extremas— para encadenar tres escenarios naturales que parecen de otro planeta, uno tras otro, con la mejor luz sobre el agua turquesa.\n\nLa canoa te llevará por el Cañón del Tampaón, un corredor de roca caliza de 80 metros de altura donde el silencio solo se rompe por el sonido del remo sobre el agua. Al fondo del cañón, la Cascada de Tamul —la más alta de México con sus 105 metros— se desploma sobre el río con una fuerza que se siente en el pecho antes de verla. En el trayecto te asomas también al borde del Sótano de las Huahuas, un abismo de 512 metros que corta la respiración. Nuestros guías conocen el ángulo exacto y la hora precisa para que la foto sea perfecta.\n\nCerramos en la Cueva del Agua, un cenote subterráneo donde la luz entra en haces perfectos y el agua alcanza tonalidades de turquesa imposible. Quienes hacen este tour siempre vuelven. Y siempre traen a alguien más.",
    destinos: [
      "Cascada de Tamul (paseo en canoa)",
      "Sótano de las Huahuas (mirador al abismo de 512 m)",
      "Cenote Cueva del Agua",
    ],
    incluye: [
      "Traslado redondo desde tu hospedaje en Xilitla o Ciudad Valles, en unidad cómoda con aire acondicionado",
      "Desayuno buffet",
      "Entradas a todas las atracciones",
      "Guía certificado NOM-09 SECTUR",
      "Equipo de seguridad (chalecos, cascos y lo necesario para cada actividad)",
      "Fotografías y video del recorrido",
      "Botiquín de primeros auxilios",
      "Seguro de viaje para todos los integrantes",
      "Paseo en canoa por el Cañón del Tampaón",
    ],
    imagen_hero: "/imagenes/tours/tamul/hero.jpg",
    imagenes: [
      "/imagenes/tours/tamul/hero.jpg",
      "/imagenes/tours/tamul/gallery-3.jpg",
    ],
    gallery: [
      { src: "/imagenes/tours/tamul/hero.jpg",      alt: "Vista de la Cascada de Tamul desde el cañón — turistas con chalecos", hasRealPeople: true },
      { src: "/imagenes/tours/tamul/gallery-1.jpg", alt: "Cueva del Agua — haces de luz sobre el cenote turquesa subterráneo", hasRealPeople: true },
      { src: "/imagenes/tours/tamul/gallery-2.jpg", alt: "Clavado desde las piedras en el Cañón del Tampaón", hasRealPeople: true },
      { src: "/imagenes/tours/tamul/gallery-3.jpg", alt: "Canoa feliz en el Cañón del Tampaón — la Cascada de Tamul al fondo", hasRealPeople: true },
      { src: "/imagenes/tours/tamul/gallery-4.jpg", alt: "Guerra de agua entre canoas en el río Tampaón", hasRealPeople: true },
      { src: "/imagenes/tours/tamul/gallery-6.jpg", alt: "Asomándose al borde del Sótano de las Huahuas — 512 metros de profundidad", hasRealPeople: true },
      { src: "/imagenes/tours/tamul/gallery-extra-1.jpg", alt: "Viajera sentada en las rocas del Cañón del Tampaón señalando la Cascada de Tamul", hasRealPeople: true },
      { src: "/imagenes/tours/tamul/gallery-extra-2.jpg", alt: "Aguas turquesas del Río Tampaón con vegetación colgante — Expedición Tamul" },
      { src: "/imagenes/tours/tamul/gallery-extra-3.jpg", alt: "Grupo de turistas remando en canoas en el Río Tampaón con batalla de agua", hasRealPeople: true },
    ],
  },
  {
    id:               "tour-edward-james",
    slug:             "ruta-surrealista-edward-james",
    duracionRango:    [8, 10],
    icon:             "Leaf",
    tipo:             "Cultura & Naturaleza",
    dificultad:       "baja",
    duracion_hrs:     8,
    reviewCount:      84,
    groupMin:         2,
    groupMax:         10,
    privateAvailable: true,
    privateMinPrice:  7500,
    nombre:           "Ruta Surrealista — Edward James, Manantiales & Selva",
    tagline:          "Arte, agua y misterio en un recorrido de contrastes únicos",
    precio:           1400,
    precioOriginal:   1900,
    urgencia:         "Alta demanda en temporada nov–mar",
    descripcion:
      "El jardín escultórico más enigmático del mundo, las aguas cristalinas del Nacimiento de Huichihuayán, la penumbra viva de la Cueva de las Quilas y la arquitectura colonial del Castillo de la Salud. Cultura y naturaleza que se funden en un solo día extraordinario.",
    descripcionLarga:
      "Imagina caminar por un jardín diseñado por un poeta inglés excéntrico en medio de la selva tropical mexicana. Las esculturas de concreto de Edward James —columnatas infinitas, escaleras que suben al cielo sin llegar a ningún lado, flores de piedra de cuatro metros— emergen entre la vegetación como un sueño que alguien olvidó borrar. Las Pozas de Xilitla no tienen comparación en ningún rincón del planeta.\n\nEl Nacimiento de Huichihuayán te recibirá después con sus aguas que brotan directamente de la tierra a temperatura perfecta —ni fría ni caliente, exactamente a 22°C—, enmarcado por palmas y helechos en un silencio que contrasta completamente con el caos visual de Las Pozas.\n\nLa Cueva de las Quilas cierra el recorrido con una experiencia subterránea que pocos conocen: estalactitas, murciélagos y un eco que amplifica cada sonido hasta convertirlo en algo místico. Este tour no es solo turismo. Es una forma diferente de ver el mundo.",
    destinos: [
      "Jardín Surrealista Edward James (Las Pozas)",
      "Nacimiento de Huichihuayán",
      "Cueva de las Quilas",
      "Castillo de la Salud",
    ],
    incluye: [
      "Traslado redondo desde tu hospedaje en Xilitla o Ciudad Valles, en unidad cómoda con aire acondicionado",
      "Desayuno buffet",
      "Entradas a todas las atracciones",
      "Guía certificado NOM-09 SECTUR, especializado en historia y cultura",
      "Equipo de seguridad (chalecos, cascos y lo necesario para cada actividad)",
      "Fotografías del recorrido",
      "Botiquín de primeros auxilios",
      "Seguro de viaje para todos los integrantes",
    ],
    imagen_hero: "/imagenes/tours/edward-james/hero.jpg",
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
    id:               "tour-meco",
    slug:             "cascadas-del-meco",
    duracionRango:    [8, 10],
    icon:             "Droplet",
    tipo:             "Cascadas & Fotografía",
    dificultad:       "baja",
    duracion_hrs:     7,
    reviewCount:      96,
    groupMin:         2,
    groupMax:         8,
    privateAvailable: true,
    privateMinPrice:  7000,
    nombre:           "Cascadas del Meco — Turquesas, Mirador & El Gran Salto",
    tagline:          "Tres caídas de agua, tres emociones distintas",
    precio:           1700,
    precioOriginal:   2300,
    urgencia:         "Favorito de fotógrafos — cupos limitados",
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
      "Desayuno buffet",
      "Entradas a todas las atracciones",
      "Guía certificado NOM-09 SECTUR",
      "Equipo de seguridad (chalecos, cascos y lo necesario para cada actividad)",
      "Fotografías del recorrido",
      "Botiquín de primeros auxilios",
      "Seguro de viaje para todos los integrantes",
    ],
    imagen_hero: "/imagenes/cascada-el-meco/hero.jpg",
    imagenes: ["/imagenes/cascada-el-meco/hero.jpg"],
    gallery: [
      { src: "/imagenes/cascada-el-meco/hero.jpg",        alt: "Dos turistas en paddleboard frente a la Cascada del Meco — aguas turquesas de la Huasteca Potosina", hasRealPeople: true },
      { src: "/imagenes/cascada-el-meco/gallery-1.jpg",   alt: "Cascada del Salto 4K — caída doble con pozas turquesas escalonadas en la Huasteca" },
      { src: "/imagenes/cascada-el-meco/gallery-2.jpg",   alt: "Joven clavándose desde las rocas de la Cascada del Meco — agua turquesa", hasRealPeople: true },
      { src: "/imagenes/cascada-el-meco/gallery-3.jpg",   alt: "Cascada del Salto vista cinematográfica — caída principal con niebla y selva" },
      { src: "/imagenes/cascada-el-meco/gallery-4.jpg",   alt: "Dos personas saludando al pie de la Cascada del Meco — agua turquesa", hasRealPeople: true },
      { src: "/imagenes/cascada-el-meco/gallery-5.jpg",   alt: "Turista en el mirador panorámico del Meco — vista de las cascadas escalonadas", hasRealPeople: true },
      { src: "/imagenes/cascada-el-meco/gallery-6.jpg",   alt: "Cascada del Salto con arcoíris completo — el espectáculo más fotogénico de la Huasteca" },
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
    duracionRango:    [8, 10],
    icon:             "Mountain",
    tipo:             "Cascadas & Bienestar",
    dificultad:       "baja",
    duracion_hrs:     8,
    reviewCount:      112,
    groupMin:         2,
    groupMax:         12,
    privateAvailable: true,
    privateMinPrice:  8000,
    nombre:           "Paraíso Escalonado — Minas Viejas & Cascadas de Micos",
    tagline:          "Dos joyas naturales, un día perfecto para desconectar",
    precio:           1600,
    precioOriginal:   2200,
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
      "Desayuno buffet",
      "Entradas a todas las atracciones",
      "Guía certificado NOM-09 SECTUR",
      "Equipo de seguridad (chalecos, cascos y lo necesario para cada actividad)",
      "Fotografías del recorrido",
      "Botiquín de primeros auxilios",
      "Seguro de viaje para todos los integrantes",
    ],
    imagen_hero: "/imagenes/cascadas-minas-viejas/hero-new.jpg",
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
    duracionRango:    [8, 10],
    icon:             "Anchor",
    tipo:             "Aventura Acuática",
    dificultad:       "media",
    duracion_hrs:     10,
    reviewCount:      73,
    groupMin:         2,
    groupMax:         10,
    privateAvailable: true,
    privateMinPrice:  8500,
    nombre:           "Ruta Acuática — Puente de Dios, Hacienda & Siete Cascadas",
    tagline:          "El recorrido más refrescante y completo de la región",
    precio:           1600,
    precioOriginal:   2200,
    urgencia:         "El más completo — últimos lugares disponibles",
    descripcion:
      "Atraviesa la cueva natural del Puente de Dios con el río fluyendo a tus pies, explora la Hacienda Los Gómez y desciende por las Siete Cascadas en secuencia. Las pozas cristalinas de Tamasopo esperan a quienes quieran prolongar la aventura.",
    descripcionLarga:
      "El Puente de Dios es un arco de roca natural de 15 metros de altura por donde el río fluye, y hay un momento cada día —entre las 11 y las 13 horas— cuando la luz del sol entra perpendicular y convierte el agua en cristal líquido. Nosotros llegamos a esa hora. Siempre.\n\nEntrar al Puente de Dios es una experiencia sensorial completa: el sonido del agua amplificado por la cueva, el frío del interior, la luz que entra por el arco como un faro natural, la textura de la piedra bajo los pies. No es solo una foto. Es un momento que se graba en la memoria.\n\nLa Hacienda Los Gómez, las Siete Cascadas en secuencia y la parada opcional en Tamasopo completan el tour más inmersivo de la región. Para quienes quieren ver todo, moverse mucho y llevar a casa el mayor número de recuerdos posibles, con la seguridad de que cada paso fue guiado por alguien que conoce estos ríos de memoria: este es el tour.",
    destinos: [
      "Puente de Dios",
      "Hacienda Los Gómez",
      "Siete Cascadas",
      "Cascadas de Tamasopo (opcional)",
    ],
    incluye: [
      "Traslado redondo desde tu hospedaje en Xilitla o Ciudad Valles, en unidad cómoda con aire acondicionado",
      "Desayuno buffet",
      "Entradas a todas las atracciones",
      "Guía certificado NOM-09 SECTUR",
      "Equipo de seguridad (chalecos, cascos y lo necesario para cada actividad)",
      "Fotografías del recorrido",
      "Botiquín de primeros auxilios",
      "Seguro de viaje para todos los integrantes",
    ],
    imagen_hero: "/imagenes/puente-de-dios-tamasopo/hero-new.webp",
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
    icon:             "Anchor",
    tipo:             "Buceo & Naturaleza",
    dificultad:       "baja",
    duracion_hrs:     4,
    reviewCount:      31,
    groupMin:         1,
    groupMax:         8,
    privateAvailable: false,
    soloAdultos:      true,
    nombre:           "Descubre el Buceo en la Laguna de la Media Luna — Tu Primera Inmersión con Instructor PADI",
    tagline:          "Respira bajo el agua por primera vez en las aguas frescas y cristalinas de la Media Luna — sin experiencia previa",
    precio:           1300,
    urgencia:         "Cupo limitado por instructor — se aparta con anticipación, sobre todo fines de semana",
    descripcion:
      "Vive tu primera experiencia de buceo con equipo SCUBA en la Laguna de la Media Luna, en Rioverde, de aguas frescas y cristalinas. Respirar bajo el agua nunca fue tan fácil: no necesitas experiencia previa, solo ganas. Un instructor certificado PADI te acompaña paso a paso — primero practicas en aguas poco profundas y, cuando estés listo, desciendes entre 5 y 10 metros. Son 4 horas de capacitación e incluye el equipo de buceo y las fotografías digitales de tu inmersión. $1,200 MXN por persona.",
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
    icon:             "Leaf",
    tipo:             "Cultura & Sabor",
    dificultad:       "baja",
    duracion_hrs:     5,
    reviewCount:      0,
    groupMin:         2,
    groupMax:         12,
    privateAvailable: false,
    nombre:           "Travesía del Café — Finca Cafetalera de Xilitla en RZR",
    tagline:          "El sabor de Xilitla, desde la mata hasta la taza",
    precio:           900,
    precioUnidad:     "persona",
    urgencia:         "Grupos pequeños en finca — se reserva con anticipación",
    descripcion:
      "Súbete a un RZR y sube a los cafetales de Xilitla. Caminas entre las matas con quien las cosecha, ves cómo se despulpa, se seca y se tuesta el grano, y cierras con una cata de café recién tostado. Una experiencia de sabor y tradición, apta para toda la familia. $900 por persona.",
    descripcionLarga:
      "Xilitla huele a café mucho antes de que llegues a la finca. La sierra que rodea al pueblo está sembrada de cafetales bajo sombra, y esta travesía te lleva justo ahí: al lugar donde nace la taza que te tomas por la mañana.\n\nEl trayecto ya es parte de la experiencia. Te recogemos en tu hospedaje en Xilitla y subimos a la finca en RZR, por los caminos de terracería que atraviesan la selva húmeda — el mismo tipo de vehículo de nuestros recorridos off-road, pero aquí el destino es un cafetal.\n\nEn la finca te recibe la familia cafetalera. Caminas entre las matas, aprendes a distinguir el grano maduro del que todavía no lo está, y sigues el proceso completo: la cosecha a mano, el despulpado, el patio de secado donde el grano se extiende al sol y se remueve durante días, y por último el tostado en el tambor, cuando el olor lo llena todo.\n\nEl final es la cata. Frente a los platos con el grano verde, el tostado y el molido, aprendes a oler y a probar como lo hacen los catadores, y te sirven el café de esa misma finca. Muchos se van con un paquete bajo el brazo.\n\nEs un recorrido tranquilo, sin exigencia física, ideal para ir en pareja, con amigos o con la familia. Dura alrededor de 5 horas y sale con un mínimo de 2 personas.",
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
];
