// ──────────────────────────────────────────────────────────────────────────
// VISTA PREVIA LOCAL DE CAMBIOS DE IMÁGENES EN BLOGS  ·  SOLO DESARROLLO
// ──────────────────────────────────────────────────────────────────────────
// Este archivo sirve para 2 cosas:
//   1. Ver en localhost las imágenes nuevas ANTES de tocar el sitio en vivo.
//   2. Llevar el registro de los cambios pendientes para aplicarlos de golpe
//      a la base de datos de producción + subir los archivos al final.
//
// Los overrides SOLO se aplican cuando NODE_ENV !== "production"
// (es decir, en `npm run dev`). En el sitio en vivo este archivo no hace nada.
//
// Cuando se aprueben todos los cambios:
//   - Se suben los archivos de imagen nuevos (public/imagenes/blog/<slug>/...)
//   - Se aplican estas mismas ediciones a la base de datos de producción
//   - Se elimina este archivo y su uso en page.tsx
// ──────────────────────────────────────────────────────────────────────────

export type BlogImageEdit = {
  coverImageUrl?: string;
  coverImageAlt?: string;
  /** Reemplazos dentro del HTML del contenido (imagen dos, etc.) */
  contentReplace?: { from: string; to: string }[];
};

// Clave = slug TAL CUAL está guardado en la base de datos (con sufijo de año si aplica).
export const BLOG_IMAGE_EDITS: Record<string, BlogImageEdit> = {
  // Gastronomía Potosina (Papán Huasteco) — solo cambia el hero (mismo archivo).
  "restaurantes-en-xilitla-gastronomia-potosina-los-mejores-pla-2026": {
    coverImageUrl: "/imagenes/blog/gastronomia/hero.jpg",
    coverImageAlt:
      "Platillos típicos de la cocina huasteca: enchiladas potosinas, zacahuil y bocoles servidos en Papán Huasteco, Xilitla",
  },

  // Itinerario Xilitla 3 días — fotos propias de Las Pozas (hero + imagen dos).
  "itinerario-xilitla-itinerario-perfecto-de-3-dias-en-xilitla-2026": {
    coverImageUrl: "/imagenes/blog/itinerario-xilitla/hero.jpg",
    coverImageAlt:
      "Arcos surrealistas y escalinatas entre la selva en Las Pozas de Edward James, Xilitla",
    contentReplace: [
      {
        from: "https://www.huasteca-potosina.com/imagenes/nacimiento-huichihuayan/gallery-1.jpg",
        to: "/imagenes/blog/itinerario-xilitla/imagen-2.jpg",
      },
    ],
  },

  // Actividades para niños en Xilitla — fotos propias (antes prestaba las de gastronomía).
  "xilitla-con-ninos-actividades-para-ninos-en-xilitla-viajando-2026": {
    coverImageUrl: "/imagenes/blog/xilitla-con-ninos/hero.jpg",
    coverImageAlt:
      "Familia con cascos y arneses lista para tirolesa en la selva de Xilitla, Huasteca Potosina",
    contentReplace: [
      {
        from: "https://www.huasteca-potosina.com/imagenes/blog/gastronomia/gallery-1.webp",
        to: "/imagenes/blog/xilitla-con-ninos/imagen-2.jpg",
      },
    ],
  },

  // Reseñas de huéspedes de Paraíso Encantado — hero: huésped en balcón con vista a la selva; imagen dos: escalera de talavera.
  "opiniones-resena-lo-que-dicen-nuestros-huespedes-de-paraiso-2026": {
    coverImageUrl: "/imagenes/blog/opiniones-resena/hero.jpg",
    coverImageAlt:
      "Huésped en el balcón de Paraíso Encantado con vista panorámica a la selva de Xilitla",
    contentReplace: [
      {
        from: "https://www.huasteca-potosina.com/imagenes/blog/resena-paraiso/gallery-1.webp",
        to: "/imagenes/blog/opiniones-resena/imagen-2.jpg",
      },
    ],
  },

  // Desayunos en Xilitla (Papán Huasteco) — hero: taza de barro en el café; imagen dos: desayuno huasteco.
  "desayunos-xilitla-desayunos-en-xilitla-empieza-tu-dia-con-la-mejor-vis": {
    coverImageUrl: "/imagenes/blog/desayunos-xilitla/hero.jpg",
    coverImageAlt:
      "Taza de café de barro sobre la mesa del restaurante Papán Huasteco en Xilitla, con vista a la selva",
    contentReplace: [
      {
        from: "https://www.huasteca-potosina.com/imagenes/papan-huasteco/gallery-1.jpg",
        to: "/imagenes/blog/desayunos-xilitla/imagen-2.jpg",
      },
    ],
  },

  // FAQ Boletos Las Pozas — hero: columnas del jardín surrealista; imagen dos: grupo de visitantes en el castillo.
  "boletos-las-pozas-preguntas-frecuentes-sobre-el-jardin-de-edward-james": {
    coverImageUrl: "/imagenes/blog/boletos-las-pozas/hero.jpg",
    coverImageAlt:
      "Columnas surrealistas del jardín de Edward James en Las Pozas, Xilitla, rodeadas de selva",
    contentReplace: [
      {
        from: "https://www.huasteca-potosina.com/imagenes/castillo-de-la-salud/gallery-1.jpg",
        to: "/imagenes/blog/boletos-las-pozas/imagen-2.jpg",
      },
    ],
  },

  // Seguridad en Xilitla — hero: carretera de montaña con moto; imagen dos: auto en carretera sinuosa de la sierra.
  "seguridad-xilitla-consejos-de-seguridad-para-viajar-por-carretera-en-l": {
    coverImageUrl: "/imagenes/blog/seguridad-xilitla/hero.jpg",
    coverImageAlt:
      "Carretera de montaña hacia la Huasteca Potosina con motocicleta y señalización vial bajo cielo despejado",
    contentReplace: [
      {
        from: "https://www.huasteca-potosina.com/imagenes/castillo-de-la-salud/gallery-1.jpg",
        to: "/imagenes/blog/seguridad-xilitla/imagen-2.jpg",
      },
    ],
  },

  // ¿Cómo llegar a Xilitla? — hero: viajeras en carretera de montaña; imagen dos: carretera aérea hacia Xilitla.
  "como-llegar-a-xilitla-rutas-desde-cdmx-monterrey-y-slp": {
    coverImageUrl: "/imagenes/blog/como-llegar-xilitla/hero.jpg",
    coverImageAlt:
      "Dos viajeras en una carretera de montaña con vista a la sierra rumbo a Xilitla, Huasteca Potosina",
    contentReplace: [
      {
        from: "https://www.huasteca-potosina.com/imagenes/cascada-de-tamul/gallery-1.jpg",
        to: "/imagenes/blog/como-llegar-xilitla/imagen-2.jpg",
      },
    ],
  },

  // Puente de Dios Tamasopo — hero: cascada en la cueva con visitantes; imagen dos: cascada entre la selva.
  "puente-de-dios-tamasopo-el-portal-de-luz-de-la-huasteca": {
    coverImageUrl: "/imagenes/blog/puente-de-dios/hero.jpg",
    coverImageAlt:
      "Cascada del Puente de Dios en Tamasopo iluminada por rayos de luz dentro de la cueva, con visitantes en las rocas",
    contentReplace: [
      {
        from: "https://www.huasteca-potosina.com/imagenes/cascada-el-salto/gallery-1.jpg",
        to: "/imagenes/blog/puente-de-dios/imagen-2.jpg",
      },
    ],
  },

  // El clima en Xilitla / mejor temporada — hero: cascada panorámica; imagen dos: cascada de la Huasteca.
  "mejor-temporada-para-ir-el-clima-en-xilitla-cual-es-la-mejor-epoca-par": {
    coverImageUrl: "/imagenes/blog/clima-xilitla/hero.jpg",
    coverImageAlt:
      "Cascada caudalosa entre paredes de roca y selva en la Huasteca Potosina, cerca de Xilitla",
    contentReplace: [
      {
        from: "https://www.huasteca-potosina.com/imagenes/estaciones-huasteca/gallery-1.jpg",
        to: "/imagenes/blog/clima-xilitla/imagen-2.jpg",
      },
    ],
  },

  // Rafting Río Tampaón — solo cambia la imagen dos (el hero se queda igual).
  "rafting-rio-tampaon-rafting-en-el-rio-tampaon-la-experiencia-definitiv": {
    contentReplace: [
      {
        from: "https://www.huasteca-potosina.com/imagenes/cascada-de-tamul/gallery-1.jpg",
        to: "/imagenes/blog/rafting-tampaon/imagen-2.jpg",
      },
    ],
  },

  // Cascadas de Micos — hero: bici-tirolesa sobre las cascadas; imagen dos: saltos en las cascadas.
  "cascadas-de-micos-guia-completa-para-tu-visita": {
    coverImageUrl: "/imagenes/blog/cascadas-micos/hero.jpg",
    coverImageAlt:
      "Tirolesa en bicicleta sobre las aguas turquesa de las Cascadas de Micos, Huasteca Potosina",
    contentReplace: [
      {
        from: "https://www.huasteca-potosina.com/imagenes/balneario-taninul/gallery-1.webp",
        to: "/imagenes/blog/cascadas-micos/imagen-2.jpg",
      },
    ],
  },

  // Mitos y Leyendas de Xilitla — hero: obra de Leonora Carrington; imagen dos: ex-convento de San Agustín.
  "historia-de-xilitla-mitos-y-leyendas-de-xilitla-el-misticismo-de-la-hu": {
    coverImageUrl: "/imagenes/blog/mitos-xilitla/hero.jpg",
    coverImageAlt:
      "Escultura surrealista de Leonora Carrington en Xilitla, evocando los mitos y leyendas de la Huasteca",
    contentReplace: [
      {
        from: "https://www.huasteca-potosina.com/imagenes/castillo-de-la-salud/gallery-1.jpg",
        to: "/imagenes/blog/mitos-xilitla/imagen-2.jpg",
      },
    ],
  },

  // Hoteles con encanto (Paraíso Encantado) — hero: balcón con arcos y vista a la selva; imagen dos: terraza con sillones.
  "hotel-en-xilitla-hoteles-con-encanto-en-xilitla-por-que-elegir-paraiso": {
    coverImageUrl: "/imagenes/blog/hotel-xilitla/hero.jpg",
    coverImageAlt:
      "Balcón con arcos de Paraíso Encantado y vista a la selva y la sierra de Xilitla",
    contentReplace: [
      {
        from: "https://www.huasteca-potosina.com/imagenes/papan-huasteco/gallery-1.jpg",
        to: "/imagenes/blog/hotel-xilitla/imagen-2.jpg",
      },
    ],
  },

  // ¿Qué llevar en tu equipaje? — hero: grupo en la cascada; imagen dos: viajera frente a la cascada de Tamul.
  "equipaje-que-llevar-en-tu-maleta-para-la-selva-potosina-checklist": {
    coverImageUrl: "/imagenes/blog/equipaje/hero.jpg",
    coverImageAlt:
      "Grupo de viajeros con chalecos salvavidas sobre una roca junto a una cascada en la selva potosina",
    contentReplace: [
      {
        from: "https://www.huasteca-potosina.com/imagenes/cascada-de-tamul/gallery-1.jpg",
        to: "/imagenes/blog/equipaje/imagen-2.jpg",
      },
    ],
  },

  // Cascada de Tamul — solo cambia la imagen dos (el hero se queda igual).
  "cascada-de-tamul-la-guia-definitiva-para-visitarla": {
    contentReplace: [
      {
        from: "https://www.huasteca-potosina.com/imagenes/puente-de-dios-tamasopo/gallery-1.jpg",
        to: "/imagenes/blog/cascada-tamul/imagen-2.jpg",
      },
    ],
  },

  // 3 Cascadas secretas (Los Comales) — hero: viajero bajo una cascada en la selva; imagen dos: cascada turquesa entre vegetación.
  "cascada-los-comales-mas-alla-del-castillo-3-cascadas-secretas-cerca-de": {
    coverImageUrl: "/imagenes/blog/cascadas-secretas/hero.jpg",
    coverImageAlt:
      "Viajero con los brazos abiertos frente a una cascada escondida entre la selva cerca de Xilitla",
    contentReplace: [
      {
        from: "https://www.huasteca-potosina.com/imagenes/cascada-de-tamul/gallery-1.jpg",
        to: "/imagenes/blog/cascadas-secretas/imagen-2.jpg",
      },
    ],
  },

  // Top 5 lugares para fotos (Paraíso Encantado) — solo cambia el hero (alberca y áreas del hotel).
  "fotos-xilitla-top-5-lugares-instagrammeables-dentro-de-paraiso-encanta": {
    coverImageUrl: "/imagenes/blog/fotos-xilitla/hero.jpg",
    coverImageAlt:
      "Alberca turquesa rodeada de la arquitectura y la vegetación de Paraíso Encantado en Xilitla",
  },
};

/**
 * Aplica los overrides de vista previa a un post (mutando una copia).
 * No hace nada en producción.
 */
export function applyBlogImageEditsPreview<
  T extends { slug: string; coverImageUrl?: string | null; coverImageAlt?: string | null; content?: string | null }
>(post: T): T {
  if (process.env.NODE_ENV === "production") return post;
  const edit = BLOG_IMAGE_EDITS[post.slug];
  if (!edit) return post;

  const next: T = { ...post };
  if (edit.coverImageUrl !== undefined) next.coverImageUrl = edit.coverImageUrl;
  if (edit.coverImageAlt !== undefined) next.coverImageAlt = edit.coverImageAlt;
  if (edit.contentReplace && next.content) {
    let c = next.content;
    for (const { from, to } of edit.contentReplace) c = c.split(from).join(to);
    next.content = c;
  }
  return next;
}
