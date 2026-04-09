export interface Tour {
  id:          string;
  nombre:      string;
  slug:        string;
  tagline:     string;
  descripcion: string;
  destinos:    string[];
  incluye:     string[];
  precio:      number;
  emoji:       string;
  tipo:        string;
  dificultad:  "baja" | "media" | "alta";
  imagen_hero: string;
  imagenes:    string[];
}

export const TOURS_DB: Tour[] = [
  {
    id:      "tour-tamul",
    slug:    "expedicion-tamul",
    emoji:   "🌊",
    tipo:    "Aventura & Naturaleza",
    dificultad: "media",
    nombre:  "Expedición Tamul — Sótano, Cañón & Cueva del Agua",
    tagline: "El tour más completo de la Huasteca en un solo día",
    descripcion:
      "Presenecia el vuelo circular de miles de pericos al amanecer en el Sótano de las Huahuas, navega en canoa por el Cañón del Tampaón hasta la cascada más alta de México y termina sumergiéndote en la magia subterránea de la Cueva del Agua. Una jornada que redefine lo que la naturaleza puede ofrecerte.",
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
    precio: 1450,
    imagen_hero: "/imagenes/cascada-de-tamul/hero.jpg",
    imagenes: [
      "/imagenes/cascada-de-tamul/hero.jpg",
      "/imagenes/sotano-de-las-huahuas/hero.jpg",
    ],
  },
  {
    id:      "tour-edward-james",
    slug:    "ruta-surrealista-edward-james",
    emoji:   "🌿",
    tipo:    "Cultura & Naturaleza",
    dificultad: "baja",
    nombre:  "Ruta Surrealista — Edward James, Manantiales & Selva",
    tagline: "Arte, agua y misterio en un recorrido de contrastes únicos",
    descripcion:
      "El jardín escultórico más enigmático del mundo, las aguas cristalinas del Nacimiento de Huichihuayán, la penumbra viva de la Cueva de las Quilas y la arquitectura colonial del Castillo de la Salud. Cultura y naturaleza que se funden en un solo día extraordinario.",
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
    precio: 1300,
    imagen_hero: "/imagenes/nacimiento-huichihuayan/hero.jpg",
    imagenes: [
      "/imagenes/nacimiento-huichihuayan/hero.jpg",
      "/imagenes/xilitla-pueblo-magico/hero.jpg",
    ],
  },
  {
    id:      "tour-meco",
    slug:    "cascadas-del-meco",
    emoji:   "💧",
    tipo:    "Cascadas & Fotografía",
    dificultad: "baja",
    nombre:  "Cascadas del Meco — Turquesas, Mirador & El Gran Salto",
    tagline: "Tres caídas de agua, tres emociones distintas",
    descripcion:
      "Recorre las pozas turquesa de la Cascada del Meco, asciende al mirador panorámico para una perspectiva que te dejará sin aliento y cierra el día ante la imponente Cascada del Salto. El recorrido más fotogénico y accesible de toda la región.",
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
    precio: 1600,
    imagen_hero: "/imagenes/cascada-el-salto/hero.jpg",
    imagenes: [
      "/imagenes/cascada-el-salto/hero.jpg",
    ],
  },
  {
    id:      "tour-minas-micos",
    slug:    "paraiso-escalonado-minas-micos",
    emoji:   "🏞️",
    tipo:    "Cascadas & Bienestar",
    dificultad: "baja",
    nombre:  "Paraíso Escalonado — Minas Viejas & Cascadas de Micos",
    tagline: "Dos joyas naturales, un día perfecto para desconectar",
    descripcion:
      "Minas Viejas despliega sus terrazas de travertino color jade que parecen pintadas a mano; las Cascadas de Micos encadenan pozas turquesa entre la selva tropical. El tour ideal para quienes buscan belleza auténtica, aguas cristalinas y momentos de paz lejos del ruido.",
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
    precio: 1500,
    imagen_hero: "/imagenes/cascadas-minas-viejas/hero.jpg",
    imagenes: [
      "/imagenes/cascadas-minas-viejas/hero.jpg",
      "/imagenes/cascadas-de-micos/hero.jpg",
    ],
  },
  {
    id:      "tour-puente-dios",
    slug:    "ruta-acuatica-puente-de-dios",
    emoji:   "🌀",
    tipo:    "Aventura Acuática",
    dificultad: "media",
    nombre:  "Ruta Acuática — Puente de Dios, Hacienda & Siete Cascadas",
    tagline: "El recorrido más refrescante y completo de la región",
    descripcion:
      "Atraviesa la cueva natural del Puente de Dios con el río fluyendo a tus pies, explora la Hacienda Los Gómez y desciende por las Siete Cascadas en secuencia. Las pozas cristalinas de Tamasopo esperan a quienes quieran prolongar la aventura — parada opcional para los más exploradores.",
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
    precio: 1500,
    imagen_hero: "/imagenes/puente-de-dios-tamasopo/hero.jpg",
    imagenes: [
      "/imagenes/puente-de-dios-tamasopo/hero.jpg",
      "/imagenes/cascadas-de-tamasopo/hero.jpg",
    ],
  },
];
