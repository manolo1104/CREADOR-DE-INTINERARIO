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
 * 🔴 Faltan su apellido, de dónde es y sus certificaciones: sin el dato no se
 * promete. Por eso `origen` es opcional y los textos que hablan de TODOS
 * («certificados NOM-09», «de Xilitla») salen de `TODOS_NOM09` y
 * `TODOS_DE_XILITLA`: cuando Manolo lo confirme, basta llenarlo aquí.
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

const ACUATICOS_ECOTURISMO = [
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
    nombre: "Erick",
    foto: "/guias/erick.jpg",
    fotoCara: "/guias/erick-cara.jpg",
    fotoPos: "47% 40%",
    fotoAlt: {
      es: "Erick, guía de Tours Huasteca Potosina, sobre las rocas de la sierra con un sótano detrás",
      en: "Erick, Tours Huasteca Potosina guide, on the rocks of the sierra with a sinkhole behind him",
    },
    desde: 2020,
    // Sin origen ni certificaciones hasta que Manolo los confirme (11 nov 2026).
    certificaciones: { es: [], en: [] },
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

/** Los guías que salen en la ficha de un tour. */
export function guiasDeTour(slug: string): Guia[] {
  return GUIAS.filter((g) => g.tours.includes(slug));
}
