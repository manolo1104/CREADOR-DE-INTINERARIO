/**
 * Los guías reales que salen en las fichas de tour («Quién te guía»).
 *
 * Datos que pasó Manolo el 29 sep 2026; las frases son de redacción nuestra
 * (autorizado por él ese día: «las frases invéntalas de los dos»). Salen en
 * las fichas de tour, en el inicio y, desde el 26 oct 2026 (Manolo: «cambia
 * los nombres por los guías reales»), en /nosotros: historia, línea del
 * tiempo, la foto de «Seguridad primero» y las fichas JSON-LD.
 *
 * `tours` lleva los slugs donde aparece cada guía. Alex y Ángel cubren los
 * acuáticos de ecoturismo (Tamul, Meco, Minas-Micos y Puente de Dios); el
 * buceo, el rafting y el rappel tienen su propio equipo, así que no se
 * prometen caras que ese día no van.
 *
 * 🟢 11 nov 2026 (Manolo): se suma **Erick**, guía desde 2020, español e
 * inglés básico, con su foto. Va en la Olla de la Luz y la Gruta de Xilo
 * porque las reseñas reales lo nombran ahí («la hoya de la luz… nuestro guía
 * erick», Ram; «el último tour con el guía Erick hacía la cueva», Karina).
 * Su frase es redacción nuestra, como las de los otros dos.
 * El mismo día confirmó: apellido Azuara, de Xilitla y con la NOM-09 (solo
 * esa: rescate o primeros auxilios no se le ponen sin que lo diga).
 * Los textos que hablan de TODOS («certificados NOM-09», «de Xilitla») salen
 * de `TODOS_NOM09` y `TODOS_DE_XILITLA`: un guía nuevo sin esos datos los
 * apaga solo, en vez de prometer en su nombre.
 */

export interface Guia {
  nombre: string;
  /** Como lo conocen en el río; se pinta junto al nombre. */
  apodo?: string;
  /** En public/guias/, 720×960 (3:4). */
  foto: string;
  /** Recorte cuadrado de la cara (160×160), para los avatares del inicio. */
  fotoCara: string;
  /** object-position del recorte 4:3 de la tarjeta: dónde queda la cara. */
  fotoPos: string;
  fotoAlt: { es: string; en: string };
  /** Año en que empezó a guiar. */
  desde: number;
  /** De dónde es. Sin el dato confirmado por Manolo, se deja vacío y no se pinta. */
  origen?: string;
  certificaciones: { es: string[]; en: string[] };
  idiomas: { es: string; en: string };
  frase: { es: string; en: string };
  tours: string[];
}

export const ACUATICOS_ECOTURISMO = [
  "expedicion-tamul",
  "cascadas-del-meco",
  "paraiso-escalonado-minas-micos",
  "ruta-acuatica-puente-de-dios",
];

export const GUIAS: Guia[] = [
  {
    nombre: "Alejandro Tafolla Delgado",
    apodo: "Alex",
    foto: "/guias/alex.jpg",
    fotoCara: "/guias/alex-cara.jpg",
    fotoPos: "50% 22%",
    fotoAlt: {
      es: "Alex, guía certificado de Tours Huasteca Potosina, al pie de la Cascada de Tamul",
      en: "Alex, certified Tours Huasteca Potosina guide, at the foot of Tamul Waterfall",
    },
    desde: 2017,
    origen: "Xilitla, S.L.P.",
    certificaciones: {
      es: ["Guía NOM-09 SECTUR", "Rescate acuático", "Primeros auxilios"],
      en: ["NOM-09 SECTUR guide", "Water rescue", "First aid"],
    },
    idiomas: { es: "Español · inglés básico", en: "Spanish · basic English" },
    frase: {
      es: "El río se conoce caminándolo todos los días. Mi trabajo es que tú nada más te ocupes de disfrutarlo.",
      en: "You get to know this river by walking it every day. My job is to make sure enjoying it is all you have to do.",
    },
    tours: ACUATICOS_ECOTURISMO,
  },
  {
    nombre: "Ángel Velazco",
    foto: "/guias/angel.jpg",
    fotoCara: "/guias/angel-cara.jpg",
    fotoPos: "50% 58%",
    fotoAlt: {
      es: "Ángel Velazco, guía certificado de Tours Huasteca Potosina, en kayak por un río de la Huasteca",
      en: "Ángel Velazco, certified Tours Huasteca Potosina guide, kayaking a Huasteca river",
    },
    desde: 2021,
    origen: "Xilitla, S.L.P.",
    certificaciones: {
      es: ["Guía NOM-09 SECTUR", "Primeros auxilios y rescate"],
      en: ["NOM-09 SECTUR guide", "First aid and rescue"],
    },
    idiomas: { es: "Español · inglés básico", en: "Spanish · basic English" },
    frase: {
      es: "Crecí junto a estos ríos y todavía no me toca un día que se repita. Eso es lo que quiero que te lleves.",
      en: "I grew up next to these rivers and no two days out here are ever the same. That's what I want you to take home.",
    },
    tours: ACUATICOS_ECOTURISMO,
  },
  {
    nombre: "Erick Azuara",
    foto: "/guias/erick.jpg",
    fotoCara: "/guias/erick-cara.jpg",
    fotoPos: "47% 40%",
    fotoAlt: {
      es: "Erick Azuara, guía certificado de Tours Huasteca Potosina, sobre las rocas de la sierra con un sótano detrás",
      en: "Erick Azuara, certified Tours Huasteca Potosina guide, on the rocks of the sierra with a sinkhole behind him",
    },
    desde: 2020,
    origen: "Xilitla, S.L.P.",
    certificaciones: {
      es: ["Guía NOM-09 SECTUR"],
      en: ["NOM-09 SECTUR guide"],
    },
    idiomas: { es: "Español · inglés básico", en: "Spanish · basic English" },
    frase: {
      es: "Cada grupo trae su propio ritmo. Yo me acomodo al de ustedes, no al revés: así se disfruta de verdad.",
      en: "Every group brings its own pace. I adjust to yours, not the other way around — that's how you really enjoy it.",
    },
    tours: ["olla-de-la-luz", "gruta-de-xilo"],
  },
];

/** «Alex, Ángel y Erick» / «Alex, Ángel and Erick»: el nombre corto de cada guía. */
export function nombresGuias(en: boolean): string {
  const n = GUIAS.map((g) => g.apodo ?? g.nombre.split(" ")[0]);
  return n.length < 2 ? n.join("") : `${n.slice(0, -1).join(", ")} ${en ? "and" : "y"} ${n[n.length - 1]}`;
}

/** Solo si TODOS tienen la NOM-09 se dice «guías certificados NOM-09» de todos. */
export const TODOS_NOM09 = GUIAS.every((g) => g.certificaciones.es.some((c) => c.includes("NOM-09")));

/** Solo si TODOS son de Xilitla se dice «de Xilitla» de todos. */
export const TODOS_DE_XILITLA = GUIAS.every((g) => g.origen?.startsWith("Xilitla"));

/**
 * Los rappeles en sótanos (27 nov 2026). Los baja un instructor de trabajos
 * verticales que no es del equipo de los acuáticos.
 */
export const RAPPELES_SOTANOS = [
  "rappel-sotano-del-cepillo",
  "rappel-sotano-de-las-huahuas",
  "rappel-sotano-de-las-golondrinas",
];

/**
 * La constancia del instructor de los rappeles en sótanos, según Manolo
 * (27 nov 2026): DC-3 en Trabajos en Altura y/o Acceso con Cuerdas (Trabajos
 * Verticales) bajo la NOM-009-STPS-2011. Es lo ÚNICO que se publica de él
 * mientras no mande sus datos: ni nombre, ni foto, ni años.
 */
export const CONSTANCIA_DC3 = {
  es: "Constancia DC-3 en trabajos en altura y acceso con cuerdas (NOM-009-STPS-2011)",
  en: "DC-3 certificate in work at height and rope access (Mexican standard NOM-009-STPS-2011)",
} as const;

/**
 * 🟡 PREPARADO, VACÍO A PROPÓSITO (27 nov 2026): el instructor de los
 * rappeles en sótanos todavía no manda nombre, foto ni certificaciones.
 * Cuando lleguen, se agrega aquí un `Guia` igual que los de arriba (foto
 * 720×960 en public/guias/, recorte de cara 160×160, `tours: RAPPELES_SOTANOS`
 * y `CONSTANCIA_DC3` en `certificaciones`) y la tarjeta «Quién te guía» de
 * esos tres tours sale sola. Va en su propia lista y NO en `GUIAS` para no
 * tocar /nosotros, el inicio ni las frases de «todos los guías» (TODOS_NOM09).
 * Mientras esté vacía, la ficha pinta solo la constancia, sin cara.
 */
/**
 * Un instructor puede salir en la ficha antes de mandar foto o idiomas
 * (27 nov 2026): sin foto, la tarjeta lleva su inicial; sin certificaciones
 * ni idiomas, no se pinta ningún sello. Nada se inventa en su nombre.
 * `oficio` cambia «Guía desde» por lo que hace (p. ej. «Técnico vertical»).
 */
export type GuiaFicha = Omit<Guia, "foto" | "fotoCara" | "fotoPos" | "fotoAlt" | "idiomas">
  & Partial<Pick<Guia, "foto" | "fotoCara" | "fotoPos" | "fotoAlt" | "idiomas">>
  & { oficio?: { es: string; en: string } };

/** Los cuatro rappeles: la tarjeta dice «Quién te baja». */
export const RAPPELES = ["rappel-tamul", ...RAPPELES_SOTANOS];

export const INSTRUCTORES_RAPPEL: GuiaFicha[] = [
  {
    // 27 nov 2026 (Manolo): «Ignacio Delgado: Nacho. Técnico vertical hace 8
    // años. Cd Valles SLP, 29 años». Hace el descenso de Tamul. 🟡 Faltan su
    // foto, sus certificaciones, sus idiomas y si también baja en los sótanos
    // (entonces se suman RAPPELES_SOTANOS a `tours` y CONSTANCIA_DC3 si es él).
    // La frase es redacción nuestra, como las de los demás. La edad no se publica.
    nombre: "Ignacio Delgado",
    apodo: "Nacho",
    // Su foto (selfie en la pared, 27 nov 2026), mandada por Manolo.
    foto: "/guias/nacho.jpg",
    fotoCara: "/guias/nacho-cara.jpg",
    fotoPos: "30% 45%",
    fotoAlt: {
      es: "Nacho, técnico vertical de Tours Huasteca Potosina, con casco y cuerdas colgado en una pared de roca",
      en: "Nacho, rope access technician at Tours Huasteca Potosina, in a helmet with his ropes on a rock wall",
    },
    desde: 2018,
    origen: "Ciudad Valles, S.L.P.",
    oficio: { es: "Técnico vertical", en: "Rope access technician" },
    certificaciones: { es: [], en: [] },
    frase: {
      es: "Antes de que bajes reviso cada nudo, cada cuerda y tu arnés. Tú solo preocúpate por mirar la cascada.",
      en: "Before you go down I check every knot, every rope and your harness. All you have to do is look at the waterfall.",
    },
    tours: ["rappel-tamul"],
  },
];

/** Los guías que salen en la ficha de un tour. */
export function guiasDeTour(slug: string): GuiaFicha[] {
  return [...GUIAS, ...INSTRUCTORES_RAPPEL].filter((g) => g.tours.includes(slug));
}
