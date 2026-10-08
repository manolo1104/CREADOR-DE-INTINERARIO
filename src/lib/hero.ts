/**
 * El tamaño del H1 del inicio, en un solo sitio.
 *
 * 🔴 Por qué existe (7 oct 2026)
 *
 * El H1 son dos renglones en dos archivos distintos: «La Huasteca» en
 * `app/page.tsx` y «Potosina» en `components/HeroTypewriter.tsx`, que es cliente
 * porque la palabra se escribe sola. Los dos llevaban el tamaño escrito a mano
 * (`clamp(64px,12vw,130px)`), así que cambiar uno dejaba el H1 con dos alturas.
 *
 * Y había que cambiarlo: a 390×844 (un iPhone en vertical) dos renglones de
 * 130 px, más un párrafo de cuatro líneas, las estrellas, los visitantes en
 * vivo, el clima y una fila de estadísticas dejaban los botones de reservar
 * debajo del pliegue. En la primera pantalla no había nada accionable.
 *
 * 🔴 8 oct: Manolo lo quiso más grande («haz más grande lo de Huasteca con sus
 * letras de abajo»). De `clamp(2.5rem,6vw,4.5rem)` —40 a 72 px— a 52 a 104.
 * Sigue muy por debajo de los 130 px de antes, que son los que tiraban el
 * buscador debajo del pliegue, y la holgura con el menú fijo se volvió a medir
 * después de subirlo.
 */
export const TAMANO_H1_HERO = "clamp(3.25rem,8.5vw,6.5rem)";
