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

/**
 * ÚNICA fuente de verdad de la forma de una URL de artículo.
 *
 * 18 de los 40 slugs de la base arrastran sufijo de año y `next.config.mjs` los
 * redirige (308) a la versión sin año. Escribir `/blog/${post.slug}` a mano
 * dejaba el `canonical` de esos 18 apuntando a una redirección — y Google
 * descarta un canonical que redirige — mientras el sitemap sí los normalizaba.
 * Todo lo que imprima una URL de blog (canonical, JSON-LD, enlaces internos,
 * los dos sitemaps) tiene que pasar por aquí.
 */
export function urlBlog(slug: string): string {
  return `/blog/${normalizaSlugBlog(slug)}`;
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

// ── Artículo → qué se le vende ───────────────────────────────────────────────

/**
 * `MAPA` sólo llega hasta la ficha de destino, que tampoco cobra. Este segundo
 * mapa lleva el artículo hasta lo que SÍ se compra: un tour concreto, un
 * paquete concreto, o el catálogo cuando el artículo es transversal (clima,
 * cómo llegar, cuánto cuesta) y no habla de un solo lugar.
 *
 * Los `href` están verificados contra `TOURS_DB` (`src/lib/tours.ts`) y
 * `PAQUETES_DB` (`src/lib/paquetes.ts`): `expedicion-tamul`,
 * `ruta-acuatica-puente-de-dios`, `paraiso-escalonado-minas-micos`, `familiar`.
 * Ojo: los slugs de URL de los tours NO son sus `id` (`expedicion-tamul` vs
 * `tour-tamul`).
 *
 * Cada `href` apunta al slug VIVO, nunca a uno redirigido. La línea de paquetes
 * se rehízo entera: los tres de antes (`aventura`, `completo`, `gran-huasteca`)
 * ya no existen y `next.config.mjs` los redirige (301) a los cinco nuevos. Un
 * 301 no rompe nada para el visitante, pero un enlace interno que pasa por una
 * redirección es exactamente lo que esta fase vino a quitar del blog: aquí se
 * escribe el destino final.
 *
 * Ahora sí existe un paquete hecho para familias —`familiar`, cuyos `perfiles`
 * dicen "Familias con niños" y cuyos tres recorridos son de dificultad baja—,
 * así que ahí van los dos artículos de niños.
 */
export interface OfertaBlog {
  /** Ruta interna ya verificada. */
  href: string;
  /** Ancla descriptiva: dice a dónde lleva sin leer lo de alrededor. */
  ancla: string;
  /** Media línea de contexto bajo el enlace. */
  nota: string;
}

const TOUR_TAMUL: OfertaBlog = {
  href: "/tours/expedicion-tamul",
  ancla: "Ver la Expedición Tamul — sótano, cañón y cascada",
  nota: "Un día completo, lancha incluida. Salidas todos los días.",
};
const TOUR_PUENTE_DIOS: OfertaBlog = {
  href: "/tours/ruta-acuatica-puente-de-dios",
  ancla: "Ver la Ruta Acuática al Puente de Dios",
  nota: "Puente de Dios más Siete Cascadas o Tamasopo, en un solo día.",
};
const TOUR_MICOS: OfertaBlog = {
  href: "/tours/paraiso-escalonado-minas-micos",
  ancla: "Ver el tour a Cascadas de Micos y Minas Viejas",
  nota: "Las dos cascadas escalonadas en el mismo recorrido.",
};
const CATALOGO_TOURS: OfertaBlog = {
  href: "/tours",
  ancla: "Ver los tours guiados de la Huasteca Potosina",
  nota: "Diez recorridos con guía certificado, entradas y transporte.",
};
const CATALOGO_PAQUETES: OfertaBlog = {
  href: "/paquetes",
  ancla: "Paquetes todo incluido con hotel en Xilitla",
  nota: "De 3 a 6 días: hotel, tours y transporte a cada tour en un solo precio.",
};
const PAQUETE_FAMILIAS: OfertaBlog = {
  href: "/paquetes/familiar",
  ancla: "Paquete Familiar Huasteca — 4 días con hotel y 3 de tour",
  nota: "Los tres recorridos son de dificultad baja: sin caminatas largas ni descensos.",
};
const PRECIOS: OfertaBlog = {
  href: "/precios",
  ancla: "Precios de tours y paquetes, actualizados",
  nota: "Qué incluye cada uno y qué no, sin letras chiquitas.",
};

/** Clave = slug ya normalizado (sin sufijo de año). */
const OFERTAS: Record<string, OfertaBlog[]> = {
  "mejor-epoca-para-visitar-la-huasteca-potosina": [CATALOGO_TOURS, CATALOGO_PAQUETES],
  "cascada-de-tamul-la-guia-definitiva-para-visitarla": [TOUR_TAMUL],
  "cascada-tamul-como-llegar": [TOUR_TAMUL],
  "puente-de-dios-tamasopo-el-portal-de-luz-de-la-huasteca": [TOUR_PUENTE_DIOS],
  "cascadas-de-micos-guia-completa-para-tu-visita": [TOUR_MICOS],
  "como-llegar-a-xilitla-rutas-desde-cdmx-monterrey-y-slp": [CATALOGO_PAQUETES],
  "itinerario-huasteca-potosina-3-dias-3-dias-en-la-huasteca-po": [CATALOGO_PAQUETES],
  "itinerario-xilitla-itinerario-perfecto-de-3-dias-en-xilitla": [CATALOGO_PAQUETES],
  "huasteca-potosina-con-ninos-la-ruta-familiar-perfecta": [PAQUETE_FAMILIAS],
  "xilitla-con-ninos-actividades-para-ninos-en-xilitla-viajando": [PAQUETE_FAMILIAS],
  "cuanto-cuesta-huasteca-potosina": [PRECIOS, CATALOGO_PAQUETES],
};

/** Qué se le ofrece a este artículo. Vacío = no hay oferta específica. */
export function ofertasDeBlog(slug: string): OfertaBlog[] {
  return OFERTAS[normalizaSlugBlog(slug)] ?? [];
}
