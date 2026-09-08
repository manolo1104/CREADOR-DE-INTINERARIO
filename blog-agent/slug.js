/**
 * Generación y validación del slug de un artículo.
 *
 * Vivía dentro de `index.js`, pero `content-strategy.js` necesita el MISMO slug
 * para saber si un tema ya está publicado, y no puede importarlo de ahí:
 * `index.js` no exporta nada y ejecuta `main()` en el top level, así que
 * importarlo dispararía una publicación entera como efecto secundario.
 *
 * Que los dos lados usen esta función es lo que impide el fallo del 26 ago –
 * 6 sep 2026: el agente eligió cuatro temas ya publicados, generó el mismo slug
 * —es determinista— y `POST /api/blog/create` hace *upsert* por slug, así que
 * sobrescribió cuatro artículos indexados sin que nada fallara.
 */

export function normalizeStr(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    // Escrito con escapes a propósito: son marcas combinantes invisibles y en
    // literal cualquier editor puede comérselas sin que se note.
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export const MAX_SLUG = 70;

export function slugWords(slug) {
  return slug.split("-").filter(Boolean);
}

/** Recorta sin partir palabras: siempre corta en un guion, nunca a media sílaba. */
export function truncateAtWord(slug, max) {
  if (slug.length <= max) return slug;
  const cut = slug.slice(0, max + 1);
  const lastDash = cut.lastIndexOf("-");
  const trimmed = lastDash > 0 ? cut.slice(0, lastDash) : slug.slice(0, max);
  return trimmed.replace(/-+$/, "");
}

/** Palabras vacías: no aportan SEO, afean el final de un slug recortado y no
 *  deben anteponerse sueltas ("con-actividades-…", "hacer-en-guia-…"). */
export const STOP_WORDS = new Set([
  "de", "del", "en", "el", "la", "los", "las", "un", "una", "unos", "unas",
  "y", "o", "a", "al", "con", "por", "para", "su", "sus", "que", "es", "lo",
  "mi", "tu", "se", "no", "si", "como", "mas",
]);

/** La keyword está cubierta si todas sus palabras CON CONTENIDO aparecen en el
 *  slug. Las vacías se ignoran: exigirlas abortaba publicaciones válidas. */
export function coversKeyword(slug, keywordSlug) {
  const words = new Set(slugWords(slug));
  return slugWords(keywordSlug)
    .filter((w) => !STOP_WORDS.has(w))
    .every((w) => words.has(w));
}

export function trimStopWords(slug) {
  const words = slugWords(slug);
  while (words.length > 1 && STOP_WORDS.has(words[words.length - 1])) words.pop();
  return words.join("-");
}

export function generateSlug(title, primaryKeyword, _year) {
  // No incluir el año en el slug — SEO atemporal
  const keywordSlug = normalizeStr(primaryKeyword);
  const titleSlug   = normalizeStr(title);

  // Se antepone SOLO lo que falta de la keyword, no la keyword entera.
  // Anteponerla completa duplicaba términos que el título ya traía:
  // "seguridad-xilitla-consejos-de-seguridad-…" o
  // "museo-leonora-carrington-leonora-carrington-en-xilitla-…".
  const enTitulo = new Set(slugWords(titleSlug));
  const faltantes = slugWords(keywordSlug).filter(
    (w) => !enTitulo.has(w) && !STOP_WORDS.has(w)
  );

  let finalSlug = faltantes.length
    ? `${faltantes.join("-")}-${titleSlug}`
    : titleSlug;

  // Antes: .slice(0, 70) cortaba a media palabra y dejaba en producción slugs
  // como "…guia-para-visit" o "…la-mejor-epoca-par".
  finalSlug = trimStopWords(truncateAtWord(finalSlug, MAX_SLUG));

  // Si el recorte se llevó parte de la keyword, se reconstruye con la keyword
  // al frente para que sobreviva al límite de longitud.
  if (!coversKeyword(finalSlug, keywordSlug)) {
    const kw = slugWords(keywordSlug);
    const resto = slugWords(titleSlug).filter((w) => !kw.includes(w)).join("-");
    finalSlug = trimStopWords(truncateAtWord(`${keywordSlug}-${resto}`, MAX_SLUG));
  }

  return finalSlug;
}

export function validateSlug(slug, primaryKeyword) {
  // Validación por palabras, coherente con generateSlug. Antes exigía la frase
  // contigua, lo que abortaba la publicación cuando el título traía las
  // palabras de la keyword en otro orden.
  if (!coversKeyword(slug, normalizeStr(primaryKeyword))) {
    throw new Error(
      `SLUG INVÁLIDO: "${slug}" no contiene la keyword "${primaryKeyword}". Abortando publicación.`
    );
  }
  return true;
}
