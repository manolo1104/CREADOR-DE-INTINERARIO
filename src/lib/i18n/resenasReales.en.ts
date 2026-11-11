/**
 * Las reseñas REALES (`resenasReales.ts`) para las páginas en inglés.
 *
 * 🔴 Por qué existe (10 nov 2026): la auditoría del sitio vivo encontró reseñas
 * en español, sin `lang="es"`, en 30 de las 76 páginas en inglés. Un lector de
 * Houston no las entiende y Google ve una página «en inglés» con párrafos en
 * español.
 *
 * Reglas, las mismas de `resenasReales.ts`:
 *  · El original NO se toca: se enseña siempre, con `lang="es"`, debajo de la
 *    traducción («See original»). La traducción va rotulada como traducción,
 *    igual que hace Google Maps.
 *  · Solo se traducen reseñas REALES. Las de `tourReviews.ts` y
 *    `REVIEWS_POR_DESTINO` (`destinoData.ts`) NO están en el perfil de Google
 *    (ver la memoria de reseñas inventadas): en inglés no se traducen ni se
 *    enseñan; en su lugar va esta lista.
 *  · Traducción fiel, sin pulir lo que dijo la persona más allá de lo que
 *    exige el inglés (la ortografía del original no se «corrige» en inglés
 *    inventando matices).
 */

import { RESENAS_REALES, type ResenaReal } from "@/lib/resenasReales";
import type { Locale } from "@/lib/i18n/config";

/** Traducción por autor (el autor es único en la lista). */
const TRADUCCION_EN: Record<string, { texto: string; fecha: string; recorrido?: string }> = {
  "jetsay martinez": {
    fecha: "September 2026",
    texto:
      "We loved it — you don't have to worry about anything, they take care of everything. Everyone was very kind and helpful; we couldn't even find a taxi and they drove us to the bus station. They lent us a room to change and recommended good restaurants. And the dreamlike landscapes — photos don't do them justice. We'll definitely be back.",
  },
  "Miguel Peres": {
    fecha: "August 2026",
    texto: "Very good service and an excellent guide, I enjoyed it so much 🌟…",
  },
  "Erika Martínez": {
    fecha: "2021",
    texto:
      "Quick response, kindness and excellent service. Both the person who handled our special request and Pedro, the guide assigned to us, were always kind and patient, and they shared very interesting facts about the places we visited. We will definitely contact them again when we have the chance.",
  },
  "Wendy Haro": {
    fecha: "2019",
    recorrido: "Surrealist Garden",
    texto:
      "Highly recommended agency. We took the Surrealist Garden tour with them and didn't have to stand in the long lines to get into the garden. The guys who went with us give very good explanations and background on the place, and they're very kind.",
  },
  "Arturo García": {
    fecha: "2020",
    texto: "Excellent service. Very well-prepared and experienced guides.",
  },
  "Patricia Alvarado": {
    fecha: "2019",
    texto:
      "It's a fantastic place, there's so much to see — lots of rivers, waterfalls, lagoons, and everything is clean. It's beautiful to see the places so well preserved, the guides are trained and kind, and there's a very warm atmosphere throughout. Well done for your effort.",
  },
};

export interface ResenaParaPagina {
  autor: string;
  /** Lo que se lee primero: la traducción en inglés, o el original en español. */
  texto: string;
  fecha: string;
  estrellas: number;
  recorrido?: string;
  foto?: string;
  /** true = `texto` es traducción; enseñar el rótulo y `original` con lang="es". */
  traducida: boolean;
  /** El texto literal de Google (siempre en español en esta lista). */
  original: string;
}

/**
 * Reseñas reales listas para pintar. En inglés vienen traducidas y con su
 * original; en español, tal cual. `n` corta la lista (las primeras son las más
 * recientes con texto).
 */
export function resenasRealesPara(locale: Locale, n = RESENAS_REALES.length): ResenaParaPagina[] {
  return RESENAS_REALES.slice(0, n).map((r: ResenaReal) => {
    const en = locale === "en" ? TRADUCCION_EN[r.autor] : undefined;
    return {
      autor: r.autor,
      texto: en?.texto ?? r.texto,
      fecha: en?.fecha ?? r.fecha,
      estrellas: r.estrellas,
      recorrido: en?.recorrido ?? r.recorrido,
      foto: r.foto,
      traducida: Boolean(en),
      original: r.texto,
    };
  });
}

/** Rótulos de la traducción (los usa cada página con su propio diseño). */
export const ROTULO_TRADUCCION = {
  traducida: "Translated from Spanish · Google review",
  verOriginal: "See original (Spanish)",
} as const;
