import type { Destino } from "./destinos";
import type { Locale } from "./i18n/config";

/**
 * Texto alternativo de las fotos de las galerías de destinos.
 *
 * Antes se generaba así: `${destino.nombre} — foto 2`, `— foto 3`, `— foto 4`…
 * para las ~110 imágenes de los 41 destinos, en los dos idiomas. Para Google
 * Imágenes eso no dice nada (el nombre ya está en el título de la página y en
 * el `<h1>`), y para alguien que navega con lector de pantalla, menos.
 *
 * La regla que se sigue aquí: **no inventar qué se ve en la foto**. Solo se
 * describe cuando hay una fuente real que lo diga, y hay una: el nombre del
 * archivo. Casi medio centenar de fotos se subieron con nombre descriptivo
 * (`arcos.jpg`, `puerta-luna.jpg`, `sotano-niebla.jpg`, `textiles.jpg`), y ese
 * nombre lo puso quien tenía la foto delante. Cuando el archivo se llama
 * `gallery-4.jpg` no se sabe qué hay dentro, así que el alt se limita a los
 * datos verificables del destino: cómo se llama y en qué municipio está.
 */

/** Frases por nombre de archivo. `{n}` es el nombre del destino. */
const VOCABULARIO: Record<string, { es: string; en: string }> = {
  "aerea":              { es: "Vista aérea de {n}",                        en: "Aerial view of {n}" },
  "aereo":              { es: "Vista aérea de {n}",                        en: "Aerial view of {n}" },
  "arco-rappel":        { es: "El arco natural donde se hace rappel en {n}", en: "The natural arch used for rappelling at {n}" },
  "arcos":              { es: "Los arcos de concreto de {n}",              en: "The concrete arches at {n}" },
  "atardecer":          { es: "Atardecer en {n}",                          en: "Sunset at {n}" },
  "aves-cielo":         { es: "Aves volando sobre {n}",                    en: "Birds flying over {n}" },
  "borde":              { es: "El borde del precipicio en {n}",            en: "The edge of the drop at {n}" },
  "bosque-arroyo":      { es: "El bosque y el arroyo de {n}",              en: "The forest and stream at {n}" },
  "cabana-turquesa":    { es: "Cabaña junto al agua turquesa de {n}",      en: "A cabin beside the turquoise water at {n}" },
  "campamento":         { es: "El campamento de {n}",                      en: "The campsite at {n}" },
  // Ojo con la redundancia: hay destinos que YA se llaman "Cascada de …", así
  // que estas frases evitan repetir la palabra ("la cascada de Cascada de Tamul").
  "cascada-caida":      { es: "La caída de agua en {n}",                   en: "The falling water at {n}" },
  "cascada-cauce":      { es: "El cauce del agua en {n}",                  en: "The water's course at {n}" },
  "cascada-lateral":    { es: "Una caída lateral en {n}",                  en: "A side fall at {n}" },
  "chica-roca":         { es: "Una visitante sobre las rocas de {n}",      en: "A visitor on the rocks at {n}" },
  "cueva-mirador":      { es: "El mirador de la cueva de {n}",             en: "The cave lookout at {n}" },
  "danza-listones":     { es: "Danza de listones en {n}",                  en: "Ribbon dance at {n}" },
  "familia":            { es: "Una familia en {n}",                        en: "A family at {n}" },
  "familia-rapidos":    { es: "Una familia en los rápidos de {n}",         en: "A family in the rapids at {n}" },
  "familia-turquesa":   { es: "Una familia en el agua turquesa de {n}",    en: "A family in the turquoise water at {n}" },
  "grupo-cascada":      { es: "Un grupo frente a la caída de agua en {n}", en: "A group in front of the falls at {n}" },
  "grupo-piedra":       { es: "Un grupo sobre las rocas de {n}",           en: "A group on the rocks at {n}" },
  "guerra-agua":        { es: "Visitantes jugando en el agua de {n}",      en: "Visitors playing in the water at {n}" },
  "huapango":           { es: "Huapango huasteco en {n}",                  en: "Huapango dancing at {n}" },
  "interior":           { es: "El interior de {n}",                        en: "Inside {n}" },
  "jardin-piedra":      { es: "El jardín de piedra de {n}",                en: "The stone garden at {n}" },
  "jardin-surrealista": { es: "El jardín surrealista de {n}",              en: "The surrealist garden at {n}" },
  "letras":             { es: "Las letras monumentales de {n}",            en: "The monumental letters at {n}" },
  "mar-de-nubes":       { es: "El mar de nubes sobre {n}",                 en: "The sea of clouds over {n}" },
  "mirador":            { es: "El mirador de {n}",                         en: "The lookout at {n}" },
  "pericos":            { es: "Pericos en {n}",                            en: "Parakeets at {n}" },
  "plaza":              { es: "La plaza principal de {n}",                 en: "The main square of {n}" },
  "portal-rojo":        { es: "El portal rojo de {n}",                     en: "The red portal at {n}" },
  "puerta-luna":        { es: "La puerta de la luna de {n}",               en: "The moon gate at {n}" },
  "rappel":             { es: "Rappel en {n}",                             en: "Rappelling at {n}" },
  "rio":                { es: "El río en {n}",                             en: "The river at {n}" },
  "rocas-musgo":        { es: "Las rocas cubiertas de musgo de {n}",       en: "The moss-covered rocks at {n}" },
  "sotano-niebla":      { es: "El sótano entre la niebla en {n}",          en: "The sinkhole in the mist at {n}" },
  "textiles":           { es: "Textiles artesanales en {n}",               en: "Handmade textiles at {n}" },
  "tianguis":           { es: "El tianguis de {n}",                        en: "The street market at {n}" },
  "vista-abajo":        { es: "La vista desde lo alto de {n}",             en: "The view from the top of {n}" },
};

/** `/imagenes/cascada-de-tamul/mirador.jpg` → `mirador` */
function nombreArchivo(src: string): string {
  const ultimo = src.split("/").pop() ?? "";
  return ultimo.replace(/\.(jpe?g|png|webp|avif)$/i, "").toLowerCase();
}

/** ¿El archivo dice algo de su contenido, o es un `gallery-4` cualquiera? */
export function esNombreDescriptivo(src: string): boolean {
  return nombreArchivo(src) in VOCABULARIO;
}

/**
 * Alt de UNA foto de la galería de un destino.
 *
 * `indice` y `total` solo se usan cuando el archivo no dice nada: sirven para
 * que un lector de pantalla no anuncie seis veces exactamente el mismo texto.
 * Se omiten si la galería tiene una sola foto genérica.
 */
export function altFotoDestino(
  destino: Pick<Destino, "nombre" | "zona">,
  src: string,
  locale: Locale = "es",
  indice?: number,
  total?: number,
): string {
  const frase = VOCABULARIO[nombreArchivo(src)];
  const en = locale === "en";

  if (frase) {
    // El municipio se añade solo si no está ya dentro del nombre del destino
    // (hay fichas que se llaman "Tancanhuitz" y su zona es "Tancanhuitz").
    const base = (en ? frase.en : frase.es).replace("{n}", destino.nombre);
    if (destino.nombre.includes(destino.zona)) return base;
    return en ? `${base}, in ${destino.zona}` : `${base}, en ${destino.zona}`;
  }

  const base = destino.nombre.includes(destino.zona)
    ? `${destino.nombre}, Huasteca Potosina`
    : en
      ? `${destino.nombre}, in ${destino.zona}, Huasteca Potosina`
      : `${destino.nombre}, en ${destino.zona}, Huasteca Potosina`;

  return indice && total && total > 1 ? `${base} (${indice}/${total})` : base;
}

/**
 * Alts de una galería completa. Numera SOLO las fotos sin nombre descriptivo,
 * que son las que de otro modo quedarían con texto idéntico entre sí.
 */
export function altsGaleriaDestino(
  destino: Pick<Destino, "nombre" | "zona">,
  fotos: string[],
  locale: Locale = "es",
): string[] {
  const genericas = fotos.filter((f) => !esNombreDescriptivo(f)).length;
  let n = 0;
  return fotos.map((src) => {
    if (esNombreDescriptivo(src)) return altFotoDestino(destino, src, locale);
    n += 1;
    return altFotoDestino(destino, src, locale, n, genericas);
  });
}
