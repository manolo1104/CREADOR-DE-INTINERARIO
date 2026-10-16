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
  /**
   * La foto de perfil que el propio autor tiene en Google (lh3.googleusercontent),
   * tal cual la enseña Google junto a su reseña. Se enlaza, no se copia al repo
   * (es público); si un día deja de cargar, sale la inicial (`AvatarResena`).
   */
  foto?: string;
}

/**
 * 🟢 Copiadas del perfil de Google el 16 oct 2026 (Google Maps → Huasteca
 * Potosina Tours → Opiniones), literales, con la ortografía de quien las
 * escribió. Google enseña fechas relativas («hace 5 años»): aquí van como mes y
 * año para las recientes y como año para las viejas, contadas desde ese día.
 *
 * Por qué estas seis: son las de 5 estrellas que hablan del SERVICIO (guías,
 * atención, logística). Las dos primeras son las únicas recientes con texto; la
 * mayoría del perfil es de 2019. Se dejó fuera la del propio Manolo (2018): una
 * reseña del dueño a su negocio no es prueba de nada.
 */
export const RESENAS_REALES: ResenaReal[] = [
  {
    autor: "jetsay martinez",
    fecha: "Septiembre 2026",
    texto: "Nos encantó, ya no tienes que preocuparte por nada ellos se encargan de todo. Muy amables y serviciales todos, incluso no encontrábamos taxi y nos llevaron a la terminal de autobuses. Nos prestaron habitación para cambiarnos, nos recomendaron buenos restaurantes. Y los paisajes de ensueño, las fotos no les hacen justicia. Sin duda volveremos.",
    estrellas: 5,
    foto: "https://lh3.googleusercontent.com/a-/ALV-UjUdyaV6bxlbiRo7iMhnNREKotBRt_5HPJ5UG-Z17U1ORVm1OuLZ",
  },
  {
    autor: "Miguel Peres",
    fecha: "Agosto 2026",
    texto: "Muy buen servicio y exelente guía lo disfrute demaciado🌟…",
    estrellas: 5,
    foto: "https://lh3.googleusercontent.com/a-/ALV-UjUxQS25tcsLx7yOsu7xGwvqSZ1V3zguoQBk_3T6vprjatyMeW80",
  },
  {
    autor: "Erika Martínez",
    fecha: "2021",
    texto: "Pronta respuesta, amabilidad y excelente servicio. Tanto quien atendió nuestra solicitud especial como Pedro, el guía que nos asignaron, fueron siempre amables y pacientes, además de brindarnos datos muy interesantes sobre los lugares que visitamos. Sin duda volveremos a contactarlos cuando tengamos la oportunidad.",
    estrellas: 5,
    foto: "https://lh3.googleusercontent.com/a-/ALV-UjUU1Uzw9o-arip0-mGOxRVR9d5c-PEdmcoD5Yi-mPLKrPDf3qBgFw",
  },
  {
    autor: "Wendy Haro",
    fecha: "2019",
    texto: "Muy recomendable agencia, tomamos el tour del Jardín surrealista con ellos, y no hubo necesidad de hacer las largas filas para el ingreso al jardín, además de los chicos que nos acompañaron dan muy buenas explicaciones y reseñas del lugar, y muy amables.",
    estrellas: 5,
    recorrido: "Jardín Surrealista",
    foto: "https://lh3.googleusercontent.com/a-/ALV-UjWpRdkJDJnwlj32iZFgiGv72H1StzV7BI9hsLRHdTyrSRb-rw",
  },
  {
    autor: "Arturo García",
    fecha: "2020",
    texto: "Excelente servicio. Guías muy bien preparados y experimentados.",
    estrellas: 5,
    foto: "https://lh3.googleusercontent.com/a-/ALV-UjWIDJJxwWNr_gdXrK6Y8q3qzd4QZ4dh5bCF4tgtHvf8cAAI_oHc",
  },
  {
    autor: "Patricia Alvarado",
    fecha: "2019",
    texto: "Es un lugar fantástico, hay mucho que ver muchos ríos, cascadas, lagunas y todo limpio es hermoso ver los lugares tan bien conservados, los guías capacitados y amables y todo es con un ambiente de cordialidad muy bien por su esfuerzo",
    estrellas: 5,
    foto: "https://lh3.googleusercontent.com/a-/ALV-UjW_tRx71H5gyEmNyn8vUa6nN8fdtV5vLxyCYa3yrguXHwaFRJrgxw",
  },
];
