export interface GalleryImage {
  src: string;
  alt: string;
  hasRealPeople?: boolean;
  caption?: string;
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
  precioOriginal:   number;
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
  gallery:          GalleryImage[];
}

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
    nombre:           "Recorrido en RZR por Xilitla — Ruta Nanacatli",
    tagline:          "Maneja tu propio todoterreno entre selva, ríos y barro hasta una cascada escondida",
    precio:           800,
    precioOriginal:   1100,
    urgencia:         "Flota limitada — los fines de semana se aparta con anticipación",
    descripcion:      "Maneja tu propio RZR por la selva húmeda de Xilitla: cruza ríos de agua cristalina, atraviesa el barro y llega a la escondida Cascada Nanacatli. La aventura off-road favorita de quienes visitan la Huasteca por primera vez — adrenalina pura, sin necesidad de experiencia.",
    descripcionLarga: "Pocas formas de conocer la Huasteca son tan divertidas como ir al volante de tu propio vehículo todoterreno. La Ruta Nanacatli es nuestra más popular y la favorita de quienes llegan por primera vez: dos horas de selva húmeda, ríos cristalinos y barro, con la adrenalina garantizada de principio a fin.\n\nNos encontramos en nuestra base en Xilitla, donde te entregamos casco y goggles y te damos un briefing de manejo. No necesitas experiencia: el RZR es fácil de controlar y un guía instructor abre la ruta delante de ti todo el tiempo, marcando el camino y resolviendo cualquier obstáculo. Tú solo te concentras en disfrutar.\n\nDesde los primeros metros te adentras en la selva: el verde se cierra a los lados, el camino se vuelve terracería y lodo, y empiezan los cruces de ríos de agua cristalina donde el agua salpica por todos lados. El recorrido termina en la Cascada Nanacatli, un rincón al que es casi imposible llegar sin estos vehículos — el premio perfecto después del trayecto.\n\nLa actividad dura aproximadamente 2 horas e incluye el vehículo con gasolina, el equipo de seguridad y el guía. No incluye transporte hasta Xilitla ni alimentos. Te recomendamos ropa que se pueda ensuciar y mojar, calzado cerrado y una muda de cambio: vas a salir con barro y con una sonrisa difícil de borrar.",
    destinos: [
      "Base en Xilitla (punto de encuentro)",
      "Selva húmeda y terracería de Xilitla",
      "Cruces de ríos de agua cristalina",
      "Cascada Nanacatli",
    ],
    incluye: [
      "Vehículo RZR todoterreno con gasolina incluida",
      "Casco y goggles de seguridad para cada tripulante",
      "Guía instructor que abre y marca la ruta",
      "Briefing de manejo — apto para principiantes",
      "Recorrido por selva, cruce de ríos y llegada a la Cascada Nanacatli",
    ],
    imagen_hero: "/imagenes/tours/rzr-xilitla/hero.jpg",
    imagenes: ["/imagenes/tours/rzr-xilitla/hero.jpg", "/imagenes/tours/rzr-xilitla/gallery-1.jpg"],
    gallery: [
      { src: "/imagenes/tours/rzr-xilitla/hero.jpg",      alt: "Vehículo RZR todoterreno avanzando por un camino de terracería entre la selva, levantando polvo durante el recorrido off-road en Xilitla", hasRealPeople: true },
      { src: "/imagenes/tours/rzr-xilitla/gallery-1.jpg", alt: "RZR derrapando y levantando tierra en pleno campo verde durante la aventura off-road en la Huasteca Potosina", hasRealPeople: true },
      { src: "/imagenes/tours/rzr-xilitla/gallery-2.jpg", alt: "Vehículo todoterreno RZR de frente sobre un camino de terracería rodeado de naturaleza", hasRealPeople: false },
      { src: "/imagenes/tours/rzr-xilitla/gallery-3.jpg", alt: "Cascada alta cayendo entre las paredes verdes de un cañón selvático de la Huasteca Potosina", hasRealPeople: false },
      { src: "/imagenes/tours/rzr-xilitla/gallery-4.jpg", alt: "Cascada escondida entre la selva con su poza al pie, premio final del recorrido en RZR", hasRealPeople: false },
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
      "Hay pocos lugares en el mundo donde puedas colgarte de una cuerda frente a una de las cascadas más altas de su país. La Cascada de Tamul —105 metros de agua desplomándose sobre el Río Tampaón— es el telón de fondo de esta experiencia, y desde el momento en que te asomas al borde del cañón entiendes por qué quienes la hacen no dejan de hablar de ella.\n\nEmpezamos en el embarcadero del río, nuestro punto de encuentro, donde te entregamos el equipo completo y nuestros guías de alta montaña te dan el briefing de técnica. No necesitas experiencia previa: el primer descenso es guiado paso a paso y la mayoría de nuestros visitantes nunca habían tocado una cuerda antes. Lo único que necesitas son ganas.\n\nUna vez asegurado al arnés, comienzas a bajar por la pared de roca caliza tapizada de vegetación, con la cascada a un costado lanzando su rocío fresco sobre ti y el agua turquesa del río esperándote abajo. El sonido es ensordecedor, el paisaje es irreal y, durante esos minutos, no existe nada más en el mundo. Nuestro fotógrafo te sigue desde el aire con dron y desde tierra, así que cada segundo queda registrado en foto y video —incluido en tu reserva, sin costo extra.\n\nLa actividad dura entre 3 y 5 horas según el grupo y el clima. El precio incluye todo el equipo de seguridad y la documentación profesional, pero no incluye transporte ni alimentos: el transporte hasta el embarcadero lo coordinamos aparte con un costo adicional, o puedes llegar por tu cuenta. Si buscas la historia que vas a contar el resto de tu vida, empieza aquí.",
    destinos: [
      "Embarcadero del Río Tampaón (punto de encuentro)",
      "Pared de rappel frente a la Cascada de Tamul",
      "Cañón del Río Tampaón",
    ],
    incluye: [
      "Equipo completo de rappel y seguridad (arnés, casco, guantes y cuerdas profesionales)",
      "Guías de alta montaña certificados",
      "Briefing y técnica de descenso — apto para principiantes",
      "Fotografías y video con dron del descenso",
      "Punto de encuentro en el embarcadero del río",
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
    id:               "tour-tamul",
    slug:             "expedicion-tamul",
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
    precio:           1450,
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
      "Desayuno con platillos típicos de la región",
      "Entradas a todos los parques",
      "Paseo en canoa por el Cañón del Tampaón",
      "Guía certificado NOM-09",
      "Transporte desde tu hospedaje",
      "Equipo de seguridad completo",
      "Fotografías y video del recorrido",
      "Botiquín de primeros auxilios",
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
    precio:           1300,
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
      "Transporte desde tu hotel",
      "Entradas a todas las atracciones",
      "Desayuno buffet",
      "Guías especializados en historia y cultura",
      "Equipo de seguridad",
      "Fotografías del tour",
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
    precio:           1600,
    precioOriginal:   2300,
    urgencia:         "Favorito de fotógrafos — cupos limitados",
    descripcion:
      "Recorre las pozas turquesa de la Cascada del Meco, asciende al mirador panorámico para una perspectiva que te dejará sin aliento y cierra el día ante la imponente Cascada del Salto. El recorrido más fotogénico y accesible de toda la región.",
    descripcionLarga:
      "Hay un momento específico, alrededor de las 10 AM, cuando la luz del sol entra en ángulo perfecto sobre las pozas de la Cascada del Meco y el agua se vuelve literalmente turquesa neón. Los fotógrafos profesionales saben de ese momento. Nosotros también, y llegamos exactamente a esa hora.\n\nEl Meco es quizás el tour más fotogénico de toda la región. Tres caídas de agua distintas —tres texturas, tres alturas, tres tipos de poza— y un mirador panorámico desde donde la selva se extiende hasta donde alcanza la vista. No hay toboganes de plástico, no hay música de bocina. Solo naturaleza auténtica, agua perfecta y un guía que sabe exactamente dónde pararte para la mejor foto de tu vida.\n\nLa Cascada del Salto cierra el día con 40 metros de caída libre que se escuchan antes de verse. Si buscas el recorrido perfecto para alguien que nunca ha visto una cascada de verdad —o para alguien que ya las ha visto todas y busca algo diferente—, este es el tour.",
    destinos: [
      "Cascada del Meco",
      "Mirador Panorámico del Meco",
      "Cascada del Salto",
    ],
    incluye: [
      "Transporte desde tu hotel",
      "Entradas a todas las atracciones",
      "Desayuno buffet",
      "Guías especializados",
      "Equipo de seguridad",
      "Fotografías del tour",
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
    precio:           1500,
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
      "Transporte desde tu hotel",
      "Entradas a todas las atracciones",
      "Desayuno buffet",
      "Guías especializados",
      "Equipo de seguridad",
      "Fotografías del tour",
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
    precio:           1500,
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
      "Transporte desde tu hotel",
      "Entradas a todas las atracciones",
      "Desayuno buffet",
      "Guías especializados",
      "Equipo de seguridad",
      "Fotografías del tour",
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
];
