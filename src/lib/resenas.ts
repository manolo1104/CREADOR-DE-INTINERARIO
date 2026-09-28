/**
 * La calificación y el número de reseñas del negocio en Google. UNA sola vez.
 *
 * 🔴 Por qué existe este archivo (28 sep 2026)
 *
 * La cifra estaba escrita a mano en más de cuarenta sitios —páginas, imágenes
 * de compartir, `llms.txt`, diccionarios de idioma y el JSON-LD de la
 * organización— y ninguna versión coincidía con otra:
 *
 *   · Google real .................. 4.7 · 161
 *   · Portada, /tours, OG, JSON-LD .. 4.9 · 492
 *   · Suma de los 11 tours .......... 757
 *   · Suma de los 20 destinos ....... 1,188
 *   · Repartidas entre 3 guías ...... 1,084
 *
 * Son datos estructurados: es exactamente lo que Google contrasta contra el
 * perfil real del negocio. Ahora todo sale de aquí y corregir la cifra es una
 * línea. Es el mismo remedio que `GRUPO_MAX` en `tours.ts`.
 *
 * ⚠️ REGLA: estas reseñas son del NEGOCIO, no de un recorrido concreto. No se
 * reparten ni se atribuyen por tour ni por destino — 161 reseñas no pueden
 * aparecer once veces. Un recorrido sin historial se anuncia como nuevo, no
 * con un número inventado.
 */

/** Calificación media en Google. Se actualiza mirando el perfil real. */
export const GOOGLE_RATING = 4.7;

/** Número de reseñas en Google. Se actualiza mirando el perfil real. */
export const GOOGLE_RESENAS = 161;

/** "4.7 · 161 reseñas de Google" / "4.7 · 161 Google reviews". */
export function resenasTexto(en = false): string {
  return en
    ? `${GOOGLE_RATING} · ${GOOGLE_RESENAS} Google reviews`
    : `${GOOGLE_RATING} · ${GOOGLE_RESENAS} reseñas de Google`;
}
