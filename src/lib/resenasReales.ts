/**
 * Las reseñas REALES del perfil de Google de la operadora.
 *
 * 🔴 Este archivo nace VACÍO a propósito (7 oct 2026).
 *
 * El inicio tenía tres reseñas inventadas —«Carlos M.» de Monterrey, «Ana
 * González» de CDMX y «Sofía R.» de Guadalajara, con caras de banco de
 * imágenes— y estaban debajo de un H2 que decía «161 Reseñas · 4.7 estrellas»:
 * la cifra verdadera de Google envolviendo citas falsas. Mientras esta lista
 * esté vacía, el bloque de prueba social **no pinta ninguna cita**: enseña la
 * calificación real, el enlace al perfil y el muro de fotos de los recorridos.
 * Es mejor un bloque con menos que un bloque con mentiras.
 *
 * ## Cómo se llena
 *
 * 1. Abre el perfil real: `GOOGLE_PERFIL_URL` en `src/lib/resenas.ts`
 *    (https://share.google/YS3dbxN4wrnHZ8lO9 — el de **Huasteca Potosina
 *    Tours**, no el del hotel).
 * 2. Copia cinco o seis reseñas **tal cual se leen**, con el nombre como lo
 *    publicó quien la escribió. Sin corregir la ortografía, sin recortar para
 *    que quepa, sin traducir: si una está en inglés, va en inglés.
 * 3. `fecha` es la que muestra Google («hace 2 meses» → el mes y el año).
 * 4. Si el texto es muy largo, córtalo en una frase completa y acaba en «…».
 *    Nunca lo reescribas.
 *
 * ⚠️ Lo que NO se hace aquí:
 *  · **No se inventa ninguna.** Ni «basada en» una real, ni un resumen.
 *  · **No se le pone foto de archivo a nadie.** Si Google no da la foto, va la
 *    inicial del nombre en un círculo.
 *  · **No se reparten por recorrido.** Son del negocio (ver `resenas.ts`):
 *    161 reseñas no pueden aparecer once veces, y es justo lo que Google
 *    contrasta contra el perfil real.
 *  · **No se tocan `GOOGLE_RATING` ni `GOOGLE_RESENAS`** al añadir una cita:
 *    esos dos números salen del perfil, no de cuántas haya copiadas aquí.
 */

export interface ResenaReal {
  /** El nombre como lo publicó Google. */
  autor: string;
  /** «Agosto 2026» / «August 2026». Lo que muestra el perfil. */
  fecha: string;
  /** El texto, literal. */
  texto: string;
  /** Las estrellas que puso, 1 a 5. */
  estrellas: number;
  /** Qué recorrido menciona, si lo menciona. Solo para el pie de la cita. */
  recorrido?: string;
}

/**
 * Vacío hasta que Manolo pase las del perfil. El bloque de prueba social sabe
 * esconder las citas cuando esto está vacío.
 */
export const RESENAS_REALES: ResenaReal[] = [];
