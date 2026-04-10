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
  emoji:            string;
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
    id:               "tour-tamul",
    slug:             "expedicion-tamul",
    emoji:            "🌊",
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
    urgencia:         "🔥 El más reservado — se llena los fines de semana",
    descripcion:
      "Presencia el vuelo circular de miles de pericos al amanecer en el Sótano de las Huahuas, navega en canoa por el Cañón del Tampaón hasta la cascada más alta de México y termina sumergiéndote en la magia subterránea de la Cueva del Agua. Una jornada que redefine lo que la naturaleza puede ofrecerte.",
    descripcionLarga:
      "El amanecer más épico de la Huasteca comienza antes de que salga el sol. Mientras México todavía duerme, estarás de pie en el borde del Sótano de las Huahuas, presenciando uno de los espectáculos naturales más extraordinarios de América: miles de pericos y loros que emergen en espiral desde las profundidades de la tierra, tiñendo el cielo de verde y amarillo en un vuelo circular que dura más de cuarenta minutos.\n\nDespués, la canoa te llevará por el Cañón del Tampaón, un corredor de roca caliza de 80 metros de altura donde el silencio solo se rompe por el sonido del remo sobre el agua. Al fondo del cañón, la Cascada de Tamul —la más alta de México con sus 105 metros— se desploma sobre el río con una fuerza que se siente en el pecho antes de verla. Nuestros guías conocen el ángulo exacto y la hora precisa para que la foto sea perfecta.\n\nCerramos en la Cueva del Agua, un cenote subterráneo donde la luz entra en haces perfectos y el agua alcanza tonalidades de turquesa imposible. Quienes hacen este tour siempre vuelven. Y siempre traen a alguien más.",
    destinos: [
      "Sótano de las Huahuas + show de pericos",
      "Cascada de Tamul (paseo en canoa)",
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
    imagen_hero: "/imagenes/cascada-de-tamul/hero.jpg",
    imagenes: [
      "/imagenes/cascada-de-tamul/hero.jpg",
      "/imagenes/sotano-de-las-huahuas/hero.jpg",
    ],
    gallery: [
      { src: "/imagenes/cascada-de-tamul/hero.jpg",       alt: "Cascada de Tamul — 105 metros de caída libre sobre el río Tampaón" },
      { src: "/imagenes/sotano-de-las-huahuas/hero.jpg",  alt: "Miles de pericos emergiendo en espiral del Sótano de las Huahuas al amanecer" },
      { src: "/imagenes/cascada-de-tamul/hero.jpg",       alt: "Paseo en canoa por el Cañón del Tampaón con paredes de 80 metros", hasRealPeople: true, caption: "Recorrido en canoa incluido" },
      { src: "/imagenes/sotano-de-las-huahuas/hero.jpg",  alt: "Vista panorámica del Sótano de las Huahuas desde el mirador", hasRealPeople: true },
      { src: "/imagenes/cascadas-de-tamasopo/hero.jpg",   alt: "Aguas turquesas de la Cueva del Agua" },
      { src: "/imagenes/cascada-de-tamul/hero.jpg",       alt: "El Cañón del Tampaón al atardecer desde la canoa" },
    ],
  },
  {
    id:               "tour-edward-james",
    slug:             "ruta-surrealista-edward-james",
    emoji:            "🌿",
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
    urgencia:         "⚡ Alta demanda en temporada nov–mar",
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
    imagen_hero: "/imagenes/nacimiento-huichihuayan/hero.jpg",
    imagenes: [
      "/imagenes/nacimiento-huichihuayan/hero.jpg",
      "/imagenes/xilitla-pueblo-magico/hero.jpg",
    ],
    gallery: [
      { src: "/imagenes/nacimiento-huichihuayan/hero.jpg", alt: "Nacimiento de Huichihuayán — aguas cristalinas que brotan a 22°C" },
      { src: "/imagenes/xilitla-pueblo-magico/hero.jpg",   alt: "Las Pozas de Edward James — esculturas surrealistas en la selva tropical" },
      { src: "/imagenes/nacimiento-huichihuayan/hero.jpg", alt: "Visitantes flotando en el Nacimiento de Huichihuayán", hasRealPeople: true, caption: "📸 Foto real del recorrido" },
      { src: "/imagenes/xilitla-pueblo-magico/hero.jpg",   alt: "Escaleras al cielo de Edward James en Las Pozas de Xilitla" },
      { src: "/imagenes/nacimiento-huichihuayan/hero.jpg", alt: "Interior de la Cueva de las Quilas", hasRealPeople: true },
      { src: "/imagenes/xilitla-pueblo-magico/hero.jpg",   alt: "Pueblo Mágico de Xilitla con arquitectura colonial y selva al fondo" },
    ],
  },
  {
    id:               "tour-meco",
    slug:             "cascadas-del-meco",
    emoji:            "💧",
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
    urgencia:         "📸 Favorito de fotógrafos — cupos limitados",
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
    imagen_hero: "/imagenes/cascada-el-salto/hero.jpg",
    imagenes: ["/imagenes/cascada-el-salto/hero.jpg"],
    gallery: [
      { src: "/imagenes/cascada-el-salto/hero.jpg",       alt: "Cascada del Salto — 40 metros de caída libre en la Huasteca" },
      { src: "/imagenes/cascada-el-salto/hero.jpg",       alt: "Pozas turquesas de la Cascada del Meco a las 10 AM con luz perfecta" },
      { src: "/imagenes/cascadas-de-tamasopo/hero.jpg",   alt: "Mirador panorámico del Meco con vista a la selva potosina" },
      { src: "/imagenes/cascada-el-salto/hero.jpg",       alt: "Fotógrafo capturando el color turquesa neón del Meco", hasRealPeople: true, caption: "📸 Foto real del recorrido" },
      { src: "/imagenes/cascadas-de-tamasopo/hero.jpg",   alt: "Pozas en cascada conectadas de la Cascada del Meco" },
      { src: "/imagenes/cascada-el-salto/hero.jpg",       alt: "Vista desde el mirador panorámico hacia la selva", hasRealPeople: true },
    ],
  },
  {
    id:               "tour-minas-micos",
    slug:             "paraiso-escalonado-minas-micos",
    emoji:            "🏞️",
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
    urgencia:         "👨‍👩‍👧 Ideal para familias — reserva con anticipación",
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
    imagen_hero: "/imagenes/cascadas-minas-viejas/hero.jpg",
    imagenes: [
      "/imagenes/cascadas-minas-viejas/hero.jpg",
      "/imagenes/cascadas-de-micos/hero.jpg",
    ],
    gallery: [
      { src: "/imagenes/cascadas-minas-viejas/hero.jpg",  alt: "Terrazas de travertino de Minas Viejas con agua color jade" },
      { src: "/imagenes/cascadas-de-micos/hero.jpg",      alt: "Cascadas de Micos — siete caídas de agua en secuencia en la selva" },
      { src: "/imagenes/cascadas-minas-viejas/hero.jpg",  alt: "Familia nadando en las terrazas de Minas Viejas", hasRealPeople: true, caption: "📸 Foto real del recorrido familiar" },
      { src: "/imagenes/cascadas-de-micos/hero.jpg",      alt: "Pozas turquesas de Micos con chalecos salvavidas incluidos", hasRealPeople: true },
      { src: "/imagenes/cascadas-minas-viejas/hero.jpg",  alt: "Detalle del agua turquesa sobre el travertino de Minas Viejas" },
      { src: "/imagenes/cascadas-de-micos/hero.jpg",      alt: "Vista de las Cascadas de Micos rodeadas de selva potosina" },
    ],
  },
  {
    id:               "tour-puente-dios",
    slug:             "ruta-acuatica-puente-de-dios",
    emoji:            "🌀",
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
    urgencia:         "🌊 El más completo — últimos lugares disponibles",
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
    imagen_hero: "/imagenes/puente-de-dios-tamasopo/hero.jpg",
    imagenes: [
      "/imagenes/puente-de-dios-tamasopo/hero.jpg",
      "/imagenes/cascadas-de-tamasopo/hero.jpg",
    ],
    gallery: [
      { src: "/imagenes/puente-de-dios-tamasopo/hero.jpg", alt: "Puente de Dios — arco de roca natural con luz solar sobre el río" },
      { src: "/imagenes/cascadas-de-tamasopo/hero.jpg",    alt: "Cascadas de Tamasopo — pozas cristalinas en secuencia" },
      { src: "/imagenes/puente-de-dios-tamasopo/hero.jpg", alt: "Cruzando el Puente de Dios con el río a los pies", hasRealPeople: true, caption: "📸 Foto real del recorrido" },
      { src: "/imagenes/cascadas-de-tamasopo/hero.jpg",    alt: "Siete Cascadas de Tamasopo en cascada perfecta" },
      { src: "/imagenes/puente-de-dios-tamasopo/hero.jpg", alt: "Interior del Puente de Dios con haces de luz sobre el agua", hasRealPeople: true, caption: "La luz perfecta entre las 11 y 13 horas" },
      { src: "/imagenes/cascadas-de-tamasopo/hero.jpg",    alt: "Hacienda Los Gómez — arquitectura colonial en la Huasteca" },
    ],
  },
];
