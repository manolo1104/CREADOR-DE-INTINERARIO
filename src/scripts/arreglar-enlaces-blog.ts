/**
 * arreglar-enlaces-blog.ts — devolver al sitio los clics que el blog regalaba.
 *
 * "Mejor época para visitar la Huasteca Potosina" es el artículo más leído del
 * negocio: 1,035 clics de Google en seis meses, el 23 % de todo el tráfico
 * orgánico. Su CTA "Reservar ahora" llevaba a `booking-paraisoencantado.up.
 * railway.app`, y el resto del cuerpo a `paraisoencantado.com/habitaciones`,
 * `/itinerarios` y `/blog`. Es decir: el mejor tráfico de Tours Huasteca salía
 * del embudo y aterrizaba en OTRA marca, con otro motor de reservas.
 *
 * La auditoría CRO lo generalizó a "el blog manda fuera del sitio". No es así:
 * de los 39 artículos publicados, éste era el único. Pero era justo el que
 * importaba, así que el script barre TODOS y arregla el que encuentre.
 *
 * El hotel se sigue nombrando en el texto —es el diferenciador del negocio y
 * mencionarlo suma—; lo que no puede es llevarse el clic.
 *
 * ⚠️ La fuente de verdad es Postgres, no `BLOGS/*.html`: esos archivos son
 * copias congeladas del momento de publicación (`saveLocalHTML` en
 * `blog-agent/index.js`) y editarlos no cambia NADA en el sitio.
 *
 *   npx tsx src/scripts/arreglar-enlaces-blog.ts            (en seco: solo enseña)
 *   npx tsx src/scripts/arreglar-enlaces-blog.ts --aplicar  (escribe en la base)
 *
 * Sale con código 1 si en seco encuentra algo por arreglar, para poder colgarlo
 * de una comprobación automática.
 */

import { cargarEnv } from "./_env";

cargarEnv();

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * De dónde a dónde. El orden importa: se aplican en secuencia, así que las
 * rutas largas van ANTES que el dominio a secas, o `paraisoencantado.com`
 * se comería el principio de `paraisoencantado.com/habitaciones` y dejaría
 * un `/habitaciones` colgando que aquí no existe.
 */
const REEMPLAZOS: { de: RegExp; a: string; porque: string }[] = [
  {
    de: /https?:\/\/booking-paraisoencantado\.up\.railway\.app\/?/gi,
    a: "/tours",
    porque: "El CTA de reservar llevaba al motor del hotel",
  },
  {
    de: /https?:\/\/(?:www\.)?paraisoencantado\.com\/habitaciones\/?/gi,
    a: "/paquetes",
    porque: "Quien busca dónde dormir aquí compra tours + hotel",
  },
  {
    de: /https?:\/\/(?:www\.)?paraisoencantado\.com\/itinerarios\/?/gi,
    a: "/tours",
    porque: "El itinerario del hotel es el catálogo de recorridos de aquí",
  },
  {
    de: /https?:\/\/(?:www\.)?paraisoencantado\.com\/blog\/?/gi,
    a: "/blog",
    porque: "El blog propio, no el del hotel",
  },
  {
    de: /https?:\/\/(?:www\.)?paraisoencantado\.com\/?(?=["'\s])/gi,
    a: "/",
    porque: "Portada",
  },
];

/**
 * Los campos que guardan HTML. `schemaMarkup` queda FUERA a propósito: es
 * JSON-LD y ahí una ruta relativa como `/tours` no es un enlace, es un dato
 * inválido. Se trata aparte, en `arreglarSchema`.
 */
const CAMPOS = ["content", "authorBio"] as const;
type Campo = (typeof CAMPOS)[number];

const SITE = "https://www.huasteca-potosina.com";

/**
 * Quién firma el artículo, para los buscadores y para los asistentes de IA.
 *
 * El artículo más leído declaraba `author` y `publisher` = "Hotel Paraíso
 * Encantado" con su dominio: le estaba diciendo a Google que el mejor
 * contenido de huasteca-potosina.com lo publica otra empresa. Son dos marcas
 * distintas y el blog vive en la de tours.
 *
 * Los valores no se inventan: son los que ya usan los otros artículos que sí
 * están bien firmados (`hospedaje-cerca-de-cascadas-huasteca-2026`).
 */
const AUTOR_BUENO = {
  "@type": "Person",
  name: "Manolo Covarrubias",
  jobTitle: "Promotor Turístico Huasteca Potosina",
};
const EDITOR_BUENO = {
  "@type": "Organization",
  name: "Huasteca Potosina",
  url: SITE,
};

/** Devuelve el JSON-LD corregido, o null si no había nada que tocar. */
function arreglarSchema(bruto: string | null): { nuevo: string; cambios: string[] } | null {
  if (!bruto) return null;
  let j: Record<string, unknown>;
  try {
    j = JSON.parse(bruto);
  } catch {
    // Un JSON-LD que no parsea ya está roto para Google; no lo empeoramos a
    // ciegas con reemplazos de texto.
    return { nuevo: bruto, cambios: ["⚠️ schemaMarkup no es JSON válido — se deja intacto"] };
  }
  const cambios: string[] = [];
  for (const clave of ["author", "publisher"] as const) {
    const v = j[clave] as { name?: string } | undefined;
    if (!v?.name || !/paraíso encantado/i.test(v.name)) continue;
    j[clave] = clave === "author" ? AUTOR_BUENO : EDITOR_BUENO;
    cambios.push(`${clave}: «${v.name}» → «${(j[clave] as { name: string }).name}»  (el blog es de Tours, no del hotel)`);
  }
  return cambios.length ? { nuevo: JSON.stringify(j), cambios } : null;
}

function arreglar(texto: string): { nuevo: string; cambios: string[] } {
  const cambios: string[] = [];
  let nuevo = texto;
  for (const r of REEMPLAZOS) {
    const encontrados = nuevo.match(r.de);
    if (!encontrados?.length) continue;
    cambios.push(`${encontrados.length}× ${encontrados[0]} → ${r.a}  (${r.porque})`);
    nuevo = nuevo.replace(r.de, r.a);
  }
  return { nuevo, cambios };
}

async function main() {
  const aplicar = process.argv.includes("--aplicar");
  const posts = await prisma.blogPost.findMany({
    select: { id: true, slug: true, title: true, content: true, authorBio: true, schemaMarkup: true },
  });

  console.log(`\n${posts.length} artículos en la base.${aplicar ? "" : "  (en seco — nada se escribe)"}\n`);

  let tocados = 0;

  for (const post of posts) {
    const data: Record<string, string> = {};
    const detalle: string[] = [];

    for (const campo of CAMPOS) {
      const actual = post[campo];
      if (!actual) continue;
      const { nuevo, cambios } = arreglar(actual);
      if (!cambios.length) continue;
      data[campo] = nuevo;
      detalle.push(...cambios.map((c) => `    [${campo}] ${c}`));
    }

    const schema = arreglarSchema(post.schemaMarkup);
    if (schema) {
      data.schemaMarkup = schema.nuevo;
      detalle.push(...schema.cambios.map((c) => `    [schemaMarkup] ${c}`));
    }

    if (!detalle.length) continue;
    tocados++;

    console.log(`  ${post.slug}`);
    console.log(`  «${post.title}»`);
    console.log(detalle.join("\n"));

    if (aplicar) {
      await prisma.blogPost.update({ where: { id: post.id }, data });
      console.log("    ✓ guardado");
    }
    console.log("");
  }

  if (!tocados) {
    console.log("Ningún artículo manda su tráfico fuera del sitio. Nada que hacer.\n");
    return;
  }

  if (aplicar) {
    console.log(`Listo: ${tocados} artículo${tocados === 1 ? "" : "s"} corregido${tocados === 1 ? "" : "s"}.`);
    console.log("Next cachea el blog por ruta: si no se ve el cambio, revalida /blog/<slug>.\n");
  } else {
    console.log(`${tocados} artículo${tocados === 1 ? "" : "s"} por corregir. Vuelve a correrlo con --aplicar.\n`);
    process.exitCode = 1;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
