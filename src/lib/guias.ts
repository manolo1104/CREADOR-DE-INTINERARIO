/**
 * Los guías reales que salen en las fichas de tour («Quién te guía»).
 *
 * Datos que pasó Manolo el 29 sep 2026; las frases son de redacción nuestra
 * (autorizado por él ese día: «las frases invéntalas de los dos»). SOLO se
 * pintan en las fichas de tour — decisión explícita: /nosotros no se toca.
 *
 * `tours` lleva los slugs donde aparece cada guía. Hoy los dos cubren los
 * acuáticos de ecoturismo (Tamul, Meco, Minas-Micos y Puente de Dios); la
 * Olla es de montaña y el buceo, el rafting y el rappel tienen su propio
 * equipo, así que no se prometen caras que ese día no van.
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
  origen: string;
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
    idiomas: { es: "Español", en: "Spanish" },
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
    idiomas: { es: "Español", en: "Spanish" },
    frase: {
      es: "Crecí junto a estos ríos y todavía no me toca un día que se repita. Eso es lo que quiero que te lleves.",
      en: "I grew up next to these rivers and no two days out here are ever the same. That's what I want you to take home.",
    },
    tours: ACUATICOS_ECOTURISMO,
  },
];

/** Los guías que salen en la ficha de un tour. */
export function guiasDeTour(slug: string): Guia[] {
  return GUIAS.filter((g) => g.tours.includes(slug));
}
