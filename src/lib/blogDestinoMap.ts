/**
 * Relación artículo del blog → ficha de destino.
 *
 * El sitio tenía 14 pares de páginas peleando por la misma consulta: cada
 * destino estrella tiene un artículo gemelo (`/destinos/cascada-de-tamul` vs
 * `/blog/cascada-de-tamul-la-guia-definitiva-para-visitarla`). Google elige una
 * y entierra la otra, y en Tamul eligió el blog — la página que NO vende.
 *
 * NO se resuelve con `canonical` del blog al destino. Se midió el texto visible
 * de los dos lados y el blog es entre 2,800 y 5,000 caracteres MÁS largo en
 * todos los pares: canonicalizar consolidaría hacia la página más débil y
 * tiraría el posicionamiento que ya existe.
 *
 * Se resuelve dando a cada página un trabajo distinto y enlazándolas:
 *   - el blog conserva la consulta informativa y ahora lleva el camino de
 *     reserva (ficha del destino + los tours que SÍ visitan ese lugar);
 *   - la ficha conserva la consulta práctica y enlaza a la guía a fondo.
 *
 * Los tours se sacan de `toursQueIncluyen()` (tourMapping.ts), no de una
 * heurística: así el artículo de Tamul ofrece los tours que van a Tamul.
 */

export interface BlogDestino {
  /** Slug de la ficha en DESTINOS_DB. */
  destino: string;
  /**
   * Artículos comparativos (X vs Y): no tienen un destino "principal", así que
   * enlazan a los dos y no reciben tratamiento de página secundaria.
   */
  comparativa?: string[];
}

/**
 * La clave es el slug tal como vive en la base. Varios arrastran sufijo de año;
 * `next.config.mjs` los redirige a la versión sin año, así que se registran las
 * dos formas con `normalizaSlugBlog()`.
 */
const MAPA: Record<string, BlogDestino> = {
  "cascada-de-tamul-la-guia-definitiva-para-visitarla": { destino: "cascada-de-tamul" },
  "cascadas-de-micos-guia-completa-para-tu-visita": { destino: "cascadas-de-micos" },
  "puente-de-dios-tamasopo-el-portal-de-luz-de-la-huasteca": { destino: "puente-de-dios-tamasopo" },
  "cascada-los-comales-mas-alla-del-castillo-3-cascadas-secretas-cerca-de": { destino: "cascada-los-comales" },
  "rafting-rio-tampaon-rafting-en-el-rio-tampaon-la-experiencia-definitiv": { destino: "rio-tampaon-rafting" },
  "sotano-de-las-golondrinas-la-cueva-mas-profunda-de-mexico": { destino: "sotano-de-las-golondrinas" },
  "nacimiento-de-huichihuayan-la-joya-escondida-de-la-huasteca": { destino: "nacimiento-huichihuayan" },
  "zona-arqueologica-tamtoc-zona-arqueologica-de-tamtoc-histori": { destino: "zona-arqueologica-tamtoc" },
  "museo-leonora-carrington-leonora-carrington-en-xilitla-guia-para-visit": { destino: "museo-leonora-carrington-xilitla" },
  "las-pozas-xilitla-las-pozas-de-edward-james-todo-lo-que-nece": { destino: "las-pozas-jardin-surrealista" },
  "boletos-las-pozas-preguntas-frecuentes-sobre-el-jardin-de-edward-james": { destino: "las-pozas-jardin-surrealista" },

  // Comparativa legítima: responde "¿cuál de los dos visito?", que ninguna de
  // las dos fichas puede responder. Se queda autónoma y enlaza a ambas.
  "sotano-de-las-golondrinas-vs-sotano-de-las-huahuas-cual-visitar": {
    destino: "sotano-de-las-golondrinas",
    comparativa: ["sotano-de-las-golondrinas", "sotano-de-las-huahuas"],
  },
};

/** Quita el sufijo de año, igual que los redirects de next.config.mjs. */
export function normalizaSlugBlog(slug: string): string {
  return slug.replace(/-20\d{2}$/, "");
}

export function destinoDeBlog(slug: string): BlogDestino | undefined {
  return MAPA[slug] ?? MAPA[normalizaSlugBlog(slug)];
}

/** Índice inverso: qué artículo desarrolla a fondo esta ficha de destino. */
const POR_DESTINO: Record<string, string> = (() => {
  const out: Record<string, string> = {};
  for (const [blog, info] of Object.entries(MAPA)) {
    // Las comparativas no son "la guía" de ninguna ficha.
    if (info.comparativa) continue;
    // Si un destino tiene dos artículos, gana el primero declarado.
    out[info.destino] ??= blog;
  }
  return out;
})();

export function blogDeDestino(destinoSlug: string): string | undefined {
  return POR_DESTINO[destinoSlug];
}
