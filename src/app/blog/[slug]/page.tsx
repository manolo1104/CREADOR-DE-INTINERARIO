import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";
import { BlogNewsletterInline } from "@/components/BlogNewsletterInline";
import { GuiaDelLugar } from "@/components/blog/GuiaDelLugar";
import { TOURS_DB } from "@/lib/tours";
import { applyBlogImageEditsPreview } from "@/lib/blogImageEdits";
import { urlBlog, ofertasDeBlog } from "@/lib/blogDestinoMap";

export const dynamic = "force-dynamic";

const SITE = "https://www.huasteca-potosina.com";
const RAILWAY_REGEX = /https:\/\/creador-de-intinerario-production\.up\.railway\.app/gi;

/**
 * `/itinerarios` NUNCA existió: da 404. El contenido guardado en la base la
 * enlaza más de 110 veces desde 37 de los 40 artículos, y encima promete un
 * planificador con IA que está apagado (`/planear` carga, pero su generador,
 * `/api/generate`, devuelve 503). Como el HTML
 * vive en la base y no en el repo, se corrige al vuelo al renderizar: el enlace
 * va a lo que sí se puede comprar y el ancla deja de prometer un itinerario.
 */
const ANCLA_ITINERARIOS = /<a\s+href="[^"]*\/itinerarios\/?(?:\?[^"]*)?"([^>]*)>([\s\S]*?)<\/a>/gi;

/** Dominio dado de baja: el hotel vive en paraisoencantado.com. */
const DOMINIO_MUERTO = /https?:\/\/(?:www\.)?paraisoencantadoxilitla\.lat/gi;

function mayusculaInicial(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function reescribeEnlacesItinerarios(html: string): string {
  return html.replace(ANCLA_ITINERARIOS, (_todo, attrs: string, interior: string, pos: number, completo: string) => {
    const texto = interior.replace(/<[^>]+>/g, "").trim();
    const plano = texto.toLowerCase();
    // Un enlace traía `title="Planea tu itinerario en Xilitla"`: el texto visible
    // quedaba corregido y el tooltip seguía prometiendo el planificador.
    const attrsLimpios = attrs.replace(/\s+title="[^"]*itinerario[^"]*"/gi, "");

    // Botón de caja CTA ("Crear mi itinerario gratis →", "Ver itinerarios →"):
    // el que más se ve y el que más miente. Va al catálogo de paquetes, que es
    // lo que de verdad resuelve "quiero que me armen el viaje".
    if (/crear mi itinerario|ver itinerarios/.test(plano)) {
      const flecha = interior.includes("→") ? " →" : "";
      return `<a href="/paquetes"${attrsLimpios}>Paquetes todo incluido con hotel en Xilitla${flecha}</a>`;
    }

    // Enlaces dentro del texto. Se respeta la forma verbal de la frase que los
    // rodea para no dejar un "puedes reserva…": infinitivo si venía en
    // infinitivo, imperativo si venía en imperativo, sustantivo si no hay verbo.
    let ancla: string;
    if (/^planear\b/.test(plano))      ancla = "reservar tu tour guiado en la Huasteca Potosina";
    else if (/^planea\b/.test(plano))  ancla = "reserva tu tour guiado en la Huasteca Potosina";
    // "Consulta nuestra sección de <a>…</a>": con el ancla posesiva salía
    // "nuestra sección de nuestro catálogo". Si la frase ya trae el posesivo,
    // se usa la variante sin él.
    else if (/nuestr[oa]s?\b[^.<>]{0,40}$/i.test(completo.slice(Math.max(0, pos - 60), pos)))
                                       ancla = "tours guiados por la Huasteca Potosina";
    else                               ancla = "nuestro catálogo de tours guiados";
    if (/^[A-ZÁÉÍÓÚÑ]/.test(texto)) ancla = mayusculaInicial(ancla);
    return `<a href="/tours"${attrsLimpios}>${ancla}</a>`;
  });
}

/**
 * Los dos párrafos de las cajas CTA que venden el planificador apagado. Se
 * aplican ANTES de reescribir los enlaces, porque en 3 artículos la frase lleva
 * el `<a>` dentro (de ahí el `[\s\S]{0,160}?`) y hay que sustituirla entera.
 * Si la base cambia el texto, el `replace` no encuentra nada y no rompe nada.
 */
const PROMESAS_FALSAS: [RegExp, string][] = [
  [
    /Nuestro planificador con IA arma tu recorrido en minutos, con tiempos reales y distancias\./gi,
    "Nosotros armamos el recorrido: hotel en Xilitla, tours y traslados en un solo paquete, con fechas y precio en firme.",
  ],
  [
    /O planea tu propio recorrido con[\s\S]{0,200}?creador de itinerarios[^.]{0,40}?\./gi,
    "O deja que te armemos el viaje completo de varios días.",
  ],
  // 🔴 Estos NO los ve `reescribeEnlacesItinerarios`: su `href` ya era /tours,
  // así que el enlace funciona y lo que miente es el TEXTO. Son cinco en el
  // artículo nº1 (1.106 clics) y prometen un creador de itinerarios que no
  // existe: quien hace clic esperando un planificador aterriza en un catálogo.
  [
    /<a([^>]*href="\/tours"[^>]*)>\s*Crear mi itinerario gratis\s*→?\s*<\/a>/gi,
    '<a$1>Ver los tours guiados de la Huasteca Potosina →</a>',
  ],
  [
    /<a([^>]*href="\/tours"[^>]*)>\s*nuestro creador de itinerarios(?: gratuito)?\s*<\/a>/gi,
    '<a$1>nuestro catálogo de tours guiados</a>',
  ],
  [
    /<a([^>]*href="\/tours"[^>]*)>\s*el creador de itinerarios(?: gratuito)?\s*<\/a>/gi,
    '<a$1>el catálogo de tours guiados</a>',
  ],
  // Variante propia del artículo nº1 (1.106 clics), el que más tráfico recibe.
  [
    /Nuestro creador de itinerarios te arma una ruta personalizada según la temporada que elijas y los días que tengas disponibles\./gi,
    "Te armamos la ruta según la temporada que elijas y los días que tengas: hotel, tours y traslados en un solo paquete.",
  ],
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatSeoTitle(raw: string): string {
  const suffix = " | Huasteca Potosina";
  if (raw.length + suffix.length <= 60) return raw + suffix;
  if (raw.length <= 60) return raw;
  return raw.slice(0, 57) + "…";
}

/**
 * El `@type` que declara el JSON-LD guardado en la fila, o null si no hay, no
 * parsea o no declara ninguno. Sirve para decidir si ese bloque escrito a mano
 * aporta algo que la plantilla no sepa producir; si solo repite Article o
 * BlogPosting, gana la plantilla, que es más completa.
 */
function tipoDeSchema(crudo: string | null | undefined): string | null {
  if (!crudo) return null;
  try {
    const d = JSON.parse(crudo);
    const t = Array.isArray(d) ? d[0]?.["@type"] : d?.["@type"];
    return typeof t === "string" ? t : Array.isArray(t) ? (t[0] ?? null) : null;
  } catch {
    return null;
  }
}

function extractFAQs(html: string): { question: string; answer: string }[] {
  const re = /<details[^>]*>[\s\S]*?<summary[^>]*>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/gi;
  const results: { question: string; answer: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const question = m[1].replace(/<[^>]+>/g, "").trim();
    const answer   = m[2].replace(/<[^>]+>/g, "").trim();
    if (question && answer) results.push({ question, answer });
  }
  return results;
}

/** Split HTML at approximately the midpoint on a clean tag boundary */
function splitAtMidpoint(html: string): [string, string] {
  const mid = Math.floor(html.length / 2);
  for (const marker of ["</p>", "</h2>", "</h3>", "</ul>", "</ol>"]) {
    const idx = html.indexOf(marker, mid);
    if (idx !== -1) return [html.slice(0, idx + marker.length), html.slice(idx + marker.length)];
  }
  return [html, ""];
}

/** Infer the most relevant tour from tags/keyword */
function inferTour(tags: string[], keyword: string) {
  const text = (tags.join(" ") + " " + keyword).toLowerCase();
  if (/rafting|r[aá]pidos/.test(text))                        return TOURS_DB.find((t) => t.id === "tour-rafting-tampaon");
  if (/rzr|off.?road|todoterreno|nanacatli/.test(text))       return TOURS_DB.find((t) => t.id === "tour-rzr-xilitla");
  if (/tamul|tampaon|tampa[oó]n|s[oó]tano.*huah/.test(text)) return TOURS_DB.find((t) => t.id === "tour-tamul");
  if (/edward|pozas|xilitla|surrealista/.test(text))          return TOURS_DB.find((t) => t.id === "tour-edward-james");
  if (/meco|turquesa/.test(text))                             return TOURS_DB.find((t) => t.id === "tour-meco");
  if (/puente de dios|tamasopo/.test(text))                   return TOURS_DB.find((t) => t.id === "tour-puente-dios");
  if (/minas.*viejas|micos/.test(text))                       return TOURS_DB.find((t) => t.id === "tour-minas-micos");
  return TOURS_DB.find((t) => t.id === "tour-tamul") ?? TOURS_DB[0];
}

function isPromocional(tags: string[], title: string) {
  const text = (tags.join(" ") + " " + title).toLowerCase();
  return /para[íi]so encantado|papan huasteco|nuestros hu[eé]spedes|rese[ñn]a.*hotel|opini.*hotel/.test(text);
}

// ── Data fetching ─────────────────────────────────────────────────────────────

async function getPost(slug: string) {
  try {
    // 1. Exact match (clean slug, after migration)
    const exact = await prisma.blogPost.findUnique({ where: { slug, published: true } });
    if (exact) return applyBlogImageEditsPreview(exact);

    // 2. Fallback: try slug + year suffix (slugs generated before migration)
    for (const year of ["2026", "2025", "2024", "2027"]) {
      const withYear = await prisma.blogPost.findUnique({
        where: { slug: `${slug}-${year}`, published: true },
      });
      if (withYear) return applyBlogImageEditsPreview(withYear);
    }

    return null;
  } catch {
    return null;
  }
}

async function getRelatedPosts(slug: string, tags: string[], internalLinks: string[]) {
  try {
    if (internalLinks.length >= 2) {
      const curated = await prisma.blogPost.findMany({
        where:  { published: true, slug: { in: internalLinks } },
        take:   3,
        select: { slug: true, title: true, excerpt: true, coverImageUrl: true, readingTime: true, tags: true },
      });
      if (curated.length >= 2) return curated.map(applyBlogImageEditsPreview);
    }
    const related = await prisma.blogPost.findMany({
      where:   { published: true, slug: { not: slug }, tags: { hasSome: tags } },
      orderBy: { publishedAt: "desc" },
      take:    3,
      select:  { slug: true, title: true, excerpt: true, coverImageUrl: true, readingTime: true, tags: true },
    });
    return related.map(applyBlogImageEditsPreview);
  } catch {
    return [];
  }
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await getPost(params.slug);
  if (!post) return { title: "Artículo no encontrado" };

  const title       = formatSeoTitle(post.metaTitle || post.title);
  const description = (post.metaDescription || post.excerpt || "").slice(0, 155);
  const imageUrl    = post.coverImageUrl || "";

  return {
    title,
    description,
    keywords: [post.focusKeyword, ...post.secondaryKeywords].join(", "),
    openGraph: {
      title,
      description,
      type:          "article",
      publishedTime: post.publishedAt.toISOString(),
      modifiedTime:  post.updatedAt.toISOString(),
      authors:       ["Manolo Covarrubias"],
      section:       post.tags[0] || "Guías de Viaje",
      tags:          [post.focusKeyword, ...post.tags].filter(Boolean),
      images:        imageUrl ? [{ url: imageUrl, width: 1200, height: 630, alt: post.coverImageAlt || title }] : [],
    },
    twitter: { card: "summary_large_image", title, description, images: imageUrl ? [imageUrl] : [] },
    // `urlBlog` y no `post.slug`: 18 slugs arrastran sufijo de año y el
    // canonical apuntaba a una URL que responde 308.
    alternates: { canonical: `${SITE}${urlBlog(post.slug)}` },
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = await getPost(params.slug);
  if (!post) notFound();

  const related    = await getRelatedPosts(post.slug, post.tags, post.internalLinks ?? []);
  const relevantTour = inferTour(post.tags, post.focusKeyword);
  const promoPost  = isPromocional(post.tags, post.title);
  const ofertas    = ofertasDeBlog(post.slug);
  // La URL canónica del artículo, una sola vez: canonical, JSON-LD y migas.
  const urlCanonica = `${SITE}${urlBlog(post.slug)}`;

  // ── Schema: BlogPosting (Article) ────────────────────────────────────────
  //
  // 🔴 El `schemaMarkup` guardado en la fila ya NO sustituye a este bloque: se
  // publica ADEMÁS, y solo si aporta un tipo que la plantilla no produce.
  //
  // Antes sustituía siempre, y tres artículos —los tres de intención
  // comercial— salían peor que los otros 38 (medido el 12 sep 2026 contra las
  // 41 fichas en producción): «cuánto cuesta» y «hospedaje cerca de cascadas»
  // publicaban un `Article` escrito a mano SIN imagen, keywords,
  // articleSection ni mainEntityOfPage; y «mejor época» guardaba un `FAQPage`,
  // que al ocupar esta ranura dejaba al artículo **sin ningún tipo de
  // artículo**: Google no sabía que era un artículo.
  const wordCount = Math.round((post.content || "").replace(/<[^>]+>/g, " ").split(/\s+/).length);
  const tipoGuardado = tipoDeSchema(post.schemaMarkup);
  const blogPostingSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type":    "BlogPosting",
    headline:   post.title,
    datePublished: post.publishedAt.toISOString(),
    dateModified:  post.updatedAt.toISOString(),
    inLanguage:    "es-MX",
    wordCount,
    author: {
      "@type": "Person",
      name:    "Manolo Covarrubias",
      url:     `${SITE}/nosotros`,
      image:   `${SITE}/imagenes/guias/manolo-covarrubias.jpg`,
    },
    publisher: {
      "@type": "Organization",
      name:    "Tours Huasteca Potosina",
      url:     SITE,
      logo:    { "@type": "ImageObject", url: `${SITE}/logos/huasteca-logo.png`, width: 600, height: 600 },
    },
    description:    post.metaDescription || post.excerpt || "",
    image: post.coverImageUrl ? {
      "@type": "ImageObject",
      url:     post.coverImageUrl,
      description: post.coverImageAlt || post.title,
    } : undefined,
    url:            urlCanonica,
    keywords:       [post.focusKeyword, ...post.secondaryKeywords].join(", "),
    articleSection: post.tags[0] || "Turismo",
    mainEntityOfPage: { "@type": "WebPage", "@id": urlCanonica },
  });

  // ── Schema: BreadcrumbList + FAQPage ────────────────────────────────────
  const faqs = extractFAQs(post.content || "");
  const graphNodes: object[] = [
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Inicio", item: SITE },
        { "@type": "ListItem", position: 2, name: "Blog",   item: `${SITE}/blog` },
        { "@type": "ListItem", position: 3, name: post.tags[0] || "Artículo", item: urlCanonica },
      ],
    },
  ];
  if (faqs.length > 0) {
    graphNodes.push({
      "@type":    "FAQPage",
      mainEntity: faqs.map(({ question, answer }) => ({
        "@type":        "Question",
        name:           question,
        acceptedAnswer: { "@type": "Answer", text: answer },
      })),
    });
  }
  const enhancedSchema = JSON.stringify({ "@context": "https://schema.org", "@graph": graphNodes });

  // El bloque guardado a mano se publica solo si aporta un tipo que esta
  // plantilla no emite ya. Así un HowTo o un VideoObject escrito para un
  // artículo concreto sigue saliendo, pero un Article, un BlogPosting o un
  // FAQPage repetido no duplica lo que la plantilla acaba de declarar.
  const yaDeclarados = new Set(
    ["Article", "BlogPosting", "BreadcrumbList", ...(faqs.length > 0 ? ["FAQPage"] : [])],
  );
  const schemaGuardadoExtra =
    post.schemaMarkup && tipoGuardado && !yaDeclarados.has(tipoGuardado) ? post.schemaMarkup : null;

  // ── Content processing ───────────────────────────────────────────────────
  const contenidoBase = (post.content || "")
    .replace(RAILWAY_REGEX, SITE)
    .replace(DOMINIO_MUERTO, "https://paraisoencantado.com")
    .replace(/href="\/planear[^"]*"/gi, `href="${SITE}/planear"`)
    .replace(/<h1[^>]*>/gi, "<h2>")
    .replace(/<\/h1>/gi, "</h2>");

  const fullContent = reescribeEnlacesItinerarios(
    PROMESAS_FALSAS.reduce((html, [busca, pon]) => html.replace(busca, pon), contenidoBase),
  );

  const [contentFirst, contentSecond] = splitAtMidpoint(fullContent);
  const safeSchema = blogPostingSchema.replace(RAILWAY_REGEX, SITE);
  const clusterTag = post.tags[0] || "la Huasteca Potosina";

  // Prose styles shared by both content halves
  const proseClass = `prose prose-invert prose-lg max-w-none
    prose-headings:font-display prose-headings:text-crema prose-headings:font-normal
    prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-6
    prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-4 prose-h3:text-lima
    prose-p:text-crema/70 prose-p:font-dm prose-p:font-light prose-p:leading-relaxed
    prose-a:text-lima prose-a:no-underline hover:prose-a:underline
    prose-strong:text-crema prose-strong:font-medium
    prose-ul:text-crema/70 prose-li:font-dm prose-li:font-light
    prose-blockquote:border-lima/40 prose-blockquote:text-crema/60
    prose-img:rounded-none prose-img:w-full
    prose-figure:my-8
    prose-figcaption:text-crema/40 prose-figcaption:text-xs prose-figcaption:text-center prose-figcaption:mt-2
    [&_.cta-box]:my-10 [&_.cta-box]:p-8 [&_.cta-box]:bg-forest [&_.cta-box]:border [&_.cta-box]:border-lima/20 [&_.cta-box]:text-center
    [&_.cta-block]:my-10 [&_.cta-block]:p-8 [&_.cta-block]:border [&_.cta-block]:border-lima/20 [&_.cta-block]:text-center [&_.cta-block]:rounded-lg
    [&_.cta-tours]:bg-[#00B4D8]/10 [&_.cta-tours]:border-[#00B4D8]/30
    [&_.cta-itinerario]:bg-[#f0f9ff]/5 [&_.cta-itinerario]:border-[#2D6A4F]/30
    [&_.cta-final]:bg-verde-selva [&_.cta-final]:text-crema
    [&_.cta-headline]:font-display [&_.cta-headline]:text-xl [&_.cta-headline]:text-crema [&_.cta-headline]:mb-2 [&_.cta-headline]:font-normal
    [&_.cta-subtext]:text-crema/60 [&_.cta-subtext]:font-dm [&_.cta-subtext]:text-sm [&_.cta-subtext]:mb-4 [&_.cta-subtext]:font-light
    [&_.cta-button]:inline-flex [&_.cta-button]:items-center [&_.cta-button]:gap-2 [&_.cta-button]:px-8 [&_.cta-button]:py-3 [&_.cta-button]:text-xs [&_.cta-button]:tracking-widest [&_.cta-button]:uppercase [&_.cta-button]:font-dm [&_.cta-button]:no-underline [&_.cta-button]:rounded [&_.cta-button]:mx-2 [&_.cta-button]:mt-2
    [&_.cta-button--primary]:bg-[#00B4D8] [&_.cta-button--primary]:text-white [&_.cta-button--primary]:hover:bg-[#0096B7]
    [&_.cta-button--secondary]:bg-transparent [&_.cta-button--secondary]:text-crema [&_.cta-button--secondary]:border [&_.cta-button--secondary]:border-crema/40 [&_.cta-button--secondary]:hover:border-lima/60
    [&_.cta-link]:text-lima [&_.cta-link]:underline
    [&_.tour-cta]:my-8 [&_.tour-cta]:p-5 [&_.tour-cta]:border [&_.tour-cta]:border-verde-selva/30 [&_.tour-cta]:bg-verde-selva/8 [&_.tour-cta]:not-prose
    [&_details]:my-3 [&_details]:border [&_details]:border-white/10 [&_details]:rounded-lg [&_details]:overflow-hidden [&_details]:bg-forest
    [&_details[open]]:border-lima/20
    [&_summary]:cursor-pointer [&_summary]:px-5 [&_summary]:py-4 [&_summary]:text-crema [&_summary]:font-dm [&_summary]:font-medium [&_summary]:text-base [&_summary]:list-none [&_summary]:select-none
    [&_summary::-webkit-details-marker]:hidden [&_summary::marker]:hidden [&_summary]:hover:bg-white/5
    [&_details>p]:px-5 [&_details>p]:pb-4 [&_details>p]:pt-0 [&_details>p]:text-crema/60 [&_details>p]:text-sm [&_details>p]:font-light [&_details>p]:leading-relaxed
    [&_details_strong]:text-crema [&_details_strong]:font-medium`;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeSchema }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: enhancedSchema }} />
      {schemaGuardadoExtra && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: schemaGuardadoExtra.replace(RAILWAY_REGEX, SITE) }}
        />
      )}

      <main className="min-h-screen bg-jungle pt-24 pb-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-12 items-start">

            {/* ── ARTÍCULO PRINCIPAL ── */}
            <article>
              {/* Breadcrumb */}
              <nav className="flex items-center gap-2 text-[9px] tracking-[3px] uppercase font-dm text-crema/30 mb-8">
                <Link href="/" className="hover:text-crema/60 transition-colors">Inicio</Link>
                <span>/</span>
                <Link href="/blog" className="hover:text-crema/60 transition-colors">Blog</Link>
                <span>/</span>
                <span className="text-lima/60">{post.tags[0] || "Guía"}</span>
              </nav>

              {/* Tags + Editorial badge */}
              <div className="flex flex-wrap items-center gap-2 mb-6">
                {post.tags.map(tag => (
                  <span key={tag} className="text-[9px] tracking-[2px] uppercase font-dm text-lima/70 border border-lima/20 px-3 py-1">
                    {tag}
                  </span>
                ))}
                {promoPost && (
                  <span className="text-[9px] tracking-[1.5px] uppercase font-dm text-dorado/70 border border-dorado/30 bg-dorado/5 px-3 py-1 ml-auto">
                    ✦ Contenido propio
                  </span>
                )}
              </div>

              <h1 className="font-display text-4xl md:text-5xl text-crema leading-tight mb-6">{post.title}</h1>

              {/* Meta */}
              <div className="flex flex-wrap items-center gap-3 text-[10px] tracking-[2px] uppercase font-dm text-crema/30 mb-10 pb-8 border-b border-white/8">
                {/* Author */}
                <Link href="/nosotros" className="flex items-center gap-2 hover:text-crema/60 transition-colors group">
                  <img
                    src="/imagenes/guias/manolo-covarrubias.jpg"
                    alt="Manolo Covarrubias"
                    className="w-7 h-7 rounded-full object-cover object-top border border-white/15 group-hover:border-lima/40 transition-colors flex-shrink-0"
                  />
                  <span className="text-crema/50 group-hover:text-crema/80 transition-colors">Manolo Covarrubias</span>
                </Link>
                <span className="text-crema/15">·</span>
                <span>{new Date(post.publishedAt).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}</span>
                <span className="text-crema/15">·</span>
                <span>{post.readingTime} min de lectura</span>
                <span className="text-crema/15 hidden sm:inline">·</span>
                <span className="text-lima/50 hidden sm:inline">{post.focusKeyword}</span>
              </div>

              {/* Hero image */}
              {post.coverImageUrl && (
                <div className="aspect-video overflow-hidden mb-10">
                  <img src={post.coverImageUrl} alt={post.coverImageAlt || post.title} className="w-full h-full object-cover" loading="eager" />
                </div>
              )}

              {/* Content first half */}
              <div className={proseClass} dangerouslySetInnerHTML={{ __html: contentFirst }} />

              {/* El MISMO tour de la barra lateral, dentro del artículo. La
                  barra está oculta por CSS bajo 1024 px y el 88 % del tráfico
                  es móvil: ahí el único enlace a una ficha de tour no existía.
                  `lg:hidden` evita que en escritorio salga dos veces. */}
              {relevantTour && <TarjetaTour tour={relevantTour} className="lg:hidden my-10" />}

              {/* Ficha del lugar + tours que lo visitan. Va a mitad del
                  artículo: es donde el lector ya decidió que quiere ir. */}
              <GuiaDelLugar blogSlug={post.slug} />

              {/* Newsletter inline (a mitad del artículo) */}
              <BlogNewsletterInline />

              {/* Content second half */}
              {contentSecond && (
                <div className={proseClass} dangerouslySetInnerHTML={{ __html: contentSecond }} />
              )}

              {/* Author card — siempre visible */}
              <div className="mt-12 pt-8 border-t border-white/8">
                <div className="flex items-start gap-5">
                  <Link href="/nosotros" className="flex-shrink-0">
                    <img
                      src="/imagenes/guias/manolo-covarrubias.jpg"
                      alt="Manolo Covarrubias — guía local y fundador"
                      className="w-16 h-16 rounded-full object-cover object-top border-2 border-verde-selva/40 hover:border-lima/60 transition-colors"
                    />
                  </Link>
                  <div>
                    <p className="text-[9px] tracking-[2px] uppercase font-dm text-lima/60 mb-1">Escrito por</p>
                    <Link href="/nosotros" className="font-cormorant text-crema text-xl font-light hover:text-lima transition-colors">
                      Manolo Covarrubias
                    </Link>
                    <p className="text-[10px] tracking-[1.5px] uppercase font-dm text-crema/35 mb-2">
                      Guía local · Fundador · Certificado NOM-09
                    </p>
                    <p className="text-crema/45 font-dm font-light text-sm leading-relaxed max-w-md">
                      Nacido en la Huasteca Potosina. Lleva más de 6 años llevando viajeros a los rincones que ningún autobús turístico alcanza.
                      4.9★ en Google · Premio Arival Mejor Tour Operador Norteamérica 2023.
                    </p>
                  </div>
                </div>
              </div>

              {/* CTA final. Cuando el artículo tiene un destino comercial en
                  `ofertasDeBlog` se enlaza ESO y no el catálogo genérico: el
                  lector de Tamul sale al tour de Tamul, no a "ver recorridos". */}
              <div className="my-12 p-8 bg-forest border border-lima/20 text-center">
                <p className="text-[9px] tracking-[3px] uppercase text-lima/70 font-dm mb-3">✦ Salidas todos los días</p>
                <h3 className="font-display text-2xl text-crema mb-3">
                  {ofertas.length ? "De la guía al viaje" : "Reserva tu tour en la Huasteca Potosina"}
                </h3>
                <p className="text-crema/50 font-dm font-light text-sm mb-6">
                  Todo incluido: transporte desde tu hospedaje, guía certificado, entradas y comida.
                  Apartas con el 30 %; los tours de un día se pagan completos. Cancelas gratis hasta 48 h antes.
                </p>
                {ofertas.length > 0 ? (
                  <div className="flex flex-col gap-3 max-w-md mx-auto">
                    {ofertas.map((o) => (
                      <Link
                        key={o.href}
                        href={o.href}
                        className="block border border-dorado/40 hover:border-dorado bg-dorado/5 hover:bg-dorado/10 px-6 py-4 transition-colors text-left"
                      >
                        <span className="block font-dm text-sm text-crema leading-snug">{o.ancla} →</span>
                        <span className="block font-dm font-light text-xs text-crema/45 mt-1">{o.nota}</span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <Link href="/reservar" className="inline-flex items-center gap-2 bg-dorado text-negro px-8 py-3 text-[10px] tracking-[2.5px] uppercase font-dm hover:bg-terracota hover:text-crema transition-colors font-medium">
                    Ver recorridos y reservar →
                  </Link>
                )}
              </div>
            </article>

            {/* ── SIDEBAR STICKY ── */}
            <aside className="lg:sticky lg:top-24 space-y-5 hidden lg:block">

              {/* Tour relevante (escritorio; en móvil va dentro del artículo) */}
              {relevantTour && <TarjetaTour tour={relevantTour} />}

              {/* AI recommender */}
              <div className="border border-white/10 bg-negro/30 p-5 text-center">
                <p className="text-[8px] tracking-[2px] uppercase font-dm text-lima/60 mb-2">✦ IA · 2 min · Gratis</p>
                <p className="font-cormorant text-crema text-base mb-2 leading-snug">¿Cuántos días tienes?</p>
                <p className="text-crema/40 font-dm text-xs mb-4 leading-relaxed">La IA elige el tour perfecto según tu grupo e intereses.</p>
                <Link href="/recomendar" className="block text-center bg-negro/50 border border-lima/25 hover:border-lima/50 text-lima text-[9px] tracking-[2px] uppercase font-dm py-2.5 transition-colors">
                  Recomendador IA →
                </Link>
              </div>

              {/* Related articles */}
              {related.length > 0 && (
                <div className="border border-white/8 bg-negro/20 p-5">
                  <p className="text-[8px] tracking-[2px] uppercase font-dm text-crema/35 mb-4">Artículos relacionados</p>
                  <div className="space-y-4">
                    {related.slice(0, 3).map((r) => (
                      <Link key={r.slug} href={urlBlog(r.slug)} className="group flex gap-3 items-start">
                        {r.coverImageUrl && (
                          <div className="w-14 h-14 overflow-hidden flex-shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={r.coverImageUrl} alt={r.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform" loading="lazy" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-dm text-crema/70 group-hover:text-crema leading-snug line-clamp-2 transition-colors">{r.title}</p>
                          <p className="text-[9px] font-dm text-crema/30 mt-1">{r.readingTime} min</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Back to blog */}
              <Link href="/blog" className="block text-center text-[9px] tracking-[2px] uppercase font-dm text-crema/35 hover:text-crema/60 transition-colors py-2">
                ← Ver todos los artículos
              </Link>
            </aside>
          </div>

          {/* Related articles (mobile — below article) */}
          {related.length > 0 && (
            <section className="mt-16 pt-12 border-t border-white/8 lg:hidden">
              <div className="text-center mb-8">
                <p className="text-[9px] tracking-[3px] uppercase text-lima/50 font-dm mb-2">Clúster de contenido</p>
                <p className="text-[10px] tracking-[4px] uppercase text-crema/30 font-dm">
                  Más guías sobre <span className="text-lima/60">{clusterTag}</span>
                </p>
              </div>
              <div className="grid md:grid-cols-3 gap-6">
                {related.map(p => (
                  <Link key={p.slug} href={urlBlog(p.slug)} className="group">
                    <article className="bg-forest border border-white/8 hover:border-lima/30 transition-colors overflow-hidden h-full flex flex-col">
                      {p.coverImageUrl && (
                        <div className="aspect-video overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={p.coverImageUrl} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" loading="lazy" />
                        </div>
                      )}
                      <div className="p-5 flex flex-col flex-1">
                        {p.tags[0] && <span className="text-[9px] tracking-[2px] uppercase text-lima/50 font-dm mb-2">{p.tags[0]}</span>}
                        <h4 className="font-display text-lg text-crema group-hover:text-lima transition-colors leading-snug mb-2 flex-1">{p.title}</h4>
                        <p className="text-crema/40 font-dm font-light text-xs">{p.readingTime} min lectura</p>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Volver al blog (mobile) */}
          <section className="max-w-2xl mx-auto text-center mt-16 pt-12 border-t border-white/8 lg:hidden">
            <Link href="/blog" className="text-[10px] tracking-[3px] uppercase font-dm text-crema/40 hover:text-crema/70 transition-colors">
              ← Ver todos los artículos
            </Link>
          </section>
        </div>
      </main>
    </>
  );
}

/**
 * La tarjeta del tour relacionado. Vivía suelta dentro de la barra lateral, que
 * es `hidden lg:block`: el único enlace del artículo a una ficha de tour no se
 * veía en móvil, o sea para el 88 % del tráfico. Ahora es un componente y se
 * pinta en los dos sitios, cada uno con su `className` de visibilidad.
 */
function TarjetaTour({
  tour,
  className = "",
}: {
  tour: (typeof TOURS_DB)[number];
  className?: string;
}) {
  return (
    <div className={`border border-verde-selva/25 bg-verde-selva/8 p-5 ${className}`}>
      <p className="text-[8px] tracking-[2px] uppercase font-dm text-verde-vivo mb-3">📍 Tour relacionado</p>
      {tour.imagen_hero && (
        <div className="relative aspect-video overflow-hidden mb-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={tour.imagen_hero} alt={tour.nombre} className="w-full h-full object-cover" loading="lazy" />
        </div>
      )}
      <p className="font-cormorant text-crema text-base leading-snug mb-1">{tour.nombre}</p>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[9px] font-dm text-dorado">★ 4.9</span>
        <span className="text-[9px] font-dm text-crema/40">· Todo incluido</span>
      </div>
      <p className="font-cormorant text-dorado text-lg leading-none mb-3">
        ${tour.precio.toLocaleString("es-MX")}
        <span className="font-dm text-[10px] text-crema/40 ml-1">
          {tour.precioUnidad === "vehiculo" ? "MXN/vehículo" : "MXN/persona"}
        </span>
      </p>
      <div className="space-y-2">
        <Link
          href={`/reservar/carrito?agregar=${tour.slug}`}
          className="block text-center bg-verde-selva hover:bg-verde-vivo text-crema text-[9px] tracking-[2px] uppercase font-dm py-2.5 transition-colors">
          Reservar →
        </Link>
        <Link href={`/tours/${tour.slug}`} className="block text-center border border-white/15 hover:border-verde-selva/40 text-crema/50 hover:text-crema text-[9px] tracking-[2px] uppercase font-dm py-2 transition-colors">
          Ver tour completo
        </Link>
      </div>
    </div>
  );
}
