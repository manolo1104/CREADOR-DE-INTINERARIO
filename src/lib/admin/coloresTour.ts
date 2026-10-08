/**
 * El color y el código de cada recorrido, para TODO el panel.
 *
 * Vive aquí y no dentro de una pantalla para que el calendario, las reservas,
 * las cotizaciones y los cobros digan lo mismo: el mismo azul y el mismo "TAM"
 * en todas. Si alguna pantalla se inventa su color, el panel deja de servir
 * para control — que es justo para lo que se usa.
 */
import { TOURS_LISTA } from "@/lib/tours";

/**
 * Un color propio para cada recorrido, y un código de tres letras.
 *
 * 🔴 Antes eran 10 colores repartidos por índice (`PALETTE[i % 10]`): con 15
 * recorridos en el catálogo, CINCO compartían color con otro, y seis de los diez
 * eran verdes. En una celda de 90 px el color era el único dato que decía qué
 * recorrido era, así que dos salidas distintas se leían igual.
 *
 * Los colores no se eligieron a ojo: salen de una búsqueda sobre el espacio
 * OKLCH que maximiza la distancia perceptual mínima entre los 15, con tres
 * restricciones — franja de luminosidad, croma suficiente para que no lean gris
 * y contraste ≥ 3:1 contra el blanco del panel. El validador de la skill de
 * dataviz los aprueba en esas tres.
 *
 * 🔴 Lo que NO se puede: con 15 colores el peor par queda en ΔE 13.5 y el piso
 * recomendado es 15 — está calculado, no es flojera: el máximo alcanzable con
 * estas restricciones ronda 13.5-14. Por eso el color NO va solo: cada salida
 * lleva además su código de tres letras, que es lo que de verdad lo distingue
 * (y lo único que funciona para quien no distingue colores).
 *
 * Van por slug y no por índice a propósito: agregar un recorrido al catálogo ya
 * no le cambia el color a los demás.
 */
export const TOURS_COLOR: Record<string, { color: string; codigo: string }> = {
  "expedicion-tamul":              { color: "#0016f7", codigo: "TAM" },
  "rappel-tamul":                  { color: "#ba0d01", codigo: "RAP" },
  "rafting-rio-tampaon":           { color: "#0f90fe", codigo: "RAF" },
  "ruta-surrealista-edward-james": { color: "#904e8b", codigo: "SUR" },
  "cascadas-del-meco":             { color: "#0aa424", codigo: "MEC" },
  "paraiso-escalonado-minas-micos":{ color: "#f6600c", codigo: "MIN" },
  "ruta-acuatica-puente-de-dios":  { color: "#08569a", codigo: "ACU" },
  "rzr-xilitla":                   { color: "#9f6e00", codigo: "RZR" },
  "eden-en-el-jardin":             { color: "#920afc", codigo: "EDE" },
  "buceo-media-luna":              { color: "#f60370", codigo: "BUC" },
  "travesia-del-cafe":             { color: "#3b6209", codigo: "CAF" },
  "gruta-de-xilo":                 { color: "#612db6", codigo: "GRU" },
  "amanecer-de-nubes":             { color: "#fb2af4", codigo: "AMA" },
  "olla-de-la-luz":                { color: "#cc77a4", codigo: "OLL" },
  "huasteca-instagrameable":       { color: "#ab73fd", codigo: "INS" },
};

/**
 * Lo que no es un recorrido del catálogo va en gris, a propósito: una salida a
 * medida escrita a mano en el panel (`__personalizado`, ver `ReservaModal`) no
 * compite por un color con los quince, se distingue por NO tener uno.
 */
export const OTRO = { color: "#6b7280", codigo: "OTR" };
const deTour = (slug: string) => TOURS_COLOR[slug] ?? OTRO;
export function colorDeTour(slug: string) { return deTour(slug).color; }
export function codigoDeTour(slug: string) { return deTour(slug).codigo; }
export function nombreDeTour(slug: string) {
  const delCatalogo = TOURS_LISTA.find(t => t.slug === slug);
  if (delCatalogo) return delCatalogo.nombre;
  // El slug reservado del panel para una salida a medida; el resto, legible.
  if (slug === "__personalizado") return "Salida a medida (escrita a mano)";
  return slug.replace(/^_+/, "").replace(/-/g, " ");
}
