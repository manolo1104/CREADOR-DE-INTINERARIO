import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

const SITE = "https://www.huasteca-potosina.com";
const RAILWAY_REGEX = /https:\/\/creador-de-intinerario-production\.up\.railway\.app/gi;

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Trunca el título a ≤60 chars y añade "| Huasteca Potosina" cuando cabe */
function formatSeoTitle(raw: string): string {
  const suffix = " | Huasteca Potosina";
  if (raw.length + suffix.length <= 60) return raw + suffix;
  if (raw.length <= 60) return raw;
  return raw.slice(0, 57) + "…";
}

/** Extrae pares pregunta/respuesta de los <details>/<summary> del HTML del post */
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

// ── Data fetching ─────────────────────────────────────────────────────────────

async function getPost(slug: string) {
  try {
    return await prisma.blogPost.findUnique({ where: { slug, published: true } });
  } catch {
    return null;
  }
}

/**
 * Related posts strategy:
 * 1. Use post.internalLinks (manually curated slugs) when ≥ 2 exist
 * 2. Fall back to tag-based matching
 */
async function getRelatedPosts(
  slug: string,
  tags: string[],
  internalLinks: string[]
): Promise<{ slug: string; title: string; excerpt: string; coverImageUrl: string | null; readingTime: number; tags: string[] }[]> {
  try {
    if (internalLinks.length >= 2) {
      const curated = await prisma.blogPost.findMany({
        where:   { published: true, slug: { in: internalLinks } },
        take:    3,
        select:  { slug: true, title: true, excerpt: true, coverImageUrl: true, readingTime: true, tags: true },
      });
      if (curated.length >= 2) return curated;
    }
    return await prisma.blogPost.findMany({
      where:     { published: true, slug: { not: slug }, tags: { hasSome: tags } },
      orderBy:   { publishedAt: "desc" },
      take:      3,
      select:    { slug: true, title: true, excerpt: true, coverImageUrl: true, readingTime: true, tags: true },
    });
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
      images:        imageUrl ? [{ url: imageUrl, alt: post.coverImageAlt || title }] : [],
    },
    twitter: {
      card:        "summary_large_image",
      title,
      description,
      images:      imageUrl ? [imageUrl] : [],
    },
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = await getPost(params.slug);
  if (!post) notFound();

  const related = await getRelatedPosts(post.slug, post.tags, post.internalLinks ?? []);

  // ── Schema 1: BlogPosting (from DB or fallback) ───────────────────────────
  const blogPostingSchema = post.schemaMarkup || JSON.stringify({
    "@context": "https://schema.org",
    "@type":    "BlogPosting",
    headline:   post.title,
    datePublished: post.publishedAt.toISOString(),
    dateModified:  post.updatedAt.toISOString(),
    author: {
      "@type": "Person",
      name:    "Manolo Covarrubias",
      url:     `${SITE}/nosotros`,
    },
    publisher: {
      "@type": "Organization",
      name:    "Tours Huasteca Potosina",
      url:     SITE,
      logo:    { "@type": "ImageObject", url: `${SITE}/logo.png` },
    },
    description:    post.metaDescription || post.excerpt || "",
    image:          post.coverImageUrl || "",
    url:            `${SITE}/blog/${post.slug}`,
    keywords:       [post.focusKeyword, ...post.secondaryKeywords].join(", "),
    articleSection: post.tags[0] || "Turismo",
    mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE}/blog/${post.slug}` },
  });

  // ── Schema 2: BreadcrumbList + FAQPage (always injected, complementa al anterior) ──
  const faqs     = extractFAQs(post.content || "");
  const graphNodes: object[] = [
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Inicio",     item: SITE },
        { "@type": "ListItem", position: 2, name: "Blog",       item: `${SITE}/blog` },
        { "@type": "ListItem", position: 3, name: post.tags[0] || "Artículo", item: `${SITE}/blog/${post.slug}` },
      ],
    },
  ];
  if (faqs.length > 0) {
    graphNodes.push({
      "@type":      "FAQPage",
      mainEntity:   faqs.map(({ question, answer }) => ({
        "@type":         "Question",
        name:            question,
        acceptedAnswer:  { "@type": "Answer", text: answer },
      })),
    });
  }
  const enhancedSchema = JSON.stringify({ "@context": "https://schema.org", "@graph": graphNodes });

  // ── Content sanitization ─────────────────────────────────────────────────
  const safeContent = (post.content || "")
    .replace(RAILWAY_REGEX, SITE)
    .replace(/href="\/planear[^"]*"/gi, `href="${SITE}/planear"`)
    .replace(/<h1[^>]*>/gi, "<h2>")
    .replace(/<\/h1>/gi,    "</h2>");

  const safeSchema = blogPostingSchema.replace(RAILWAY_REGEX, SITE);

  // Cluster label for related posts section
  const clusterTag = post.tags[0] || "la Huasteca Potosina";

  return (
    <>
      {/* BlogPosting JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeSchema }}
      />
      {/* BreadcrumbList + FAQPage JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: enhancedSchema }}
      />

      <main className="min-h-screen bg-jungle pt-24 pb-20">
        <article className="max-w-3xl mx-auto px-6">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-[9px] tracking-[3px] uppercase font-dm text-crema/30 mb-8">
            <Link href="/" className="hover:text-crema/60 transition-colors">Inicio</Link>
            <span>/</span>
            <Link href="/blog" className="hover:text-crema/60 transition-colors">Blog</Link>
            <span>/</span>
            <span className="text-lima/60">{post.tags[0] || "Guía"}</span>
          </nav>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-6">
            {post.tags.map(tag => (
              <span key={tag} className="text-[9px] tracking-[2px] uppercase font-dm text-lima/70 border border-lima/20 px-3 py-1">
                {tag}
              </span>
            ))}
          </div>

          <h1 className="font-display text-4xl md:text-5xl text-crema leading-tight mb-6">
            {post.title}
          </h1>

          {/* Meta */}
          <div className="flex items-center gap-4 text-[10px] tracking-[2px] uppercase font-dm text-crema/30 mb-10 pb-8 border-b border-white/8">
            <span>{new Date(post.publishedAt).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}</span>
            <span>·</span>
            <span>{post.readingTime} min de lectura</span>
            <span>·</span>
            <span className="text-lima/50">{post.focusKeyword}</span>
          </div>

          {/* Hero image */}
          {post.coverImageUrl && (
            <div className="aspect-video overflow-hidden mb-10">
              <img
                src={post.coverImageUrl}
                alt={post.coverImageAlt || post.title}
                className="w-full h-full object-cover"
                loading="eager"
              />
            </div>
          )}

          {/* Content */}
          <div
            className="prose prose-invert prose-lg max-w-none
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
              [&_.cta-button]:inline-flex [&_.cta-button]:items-center [&_.cta-button]:gap-2 [&_.cta-button]:bg-verde-selva [&_.cta-button]:text-crema [&_.cta-button]:px-8 [&_.cta-button]:py-3 [&_.cta-button]:text-xs [&_.cta-button]:tracking-widest [&_.cta-button]:uppercase [&_.cta-button]:font-dm [&_.cta-button]:no-underline
              [&_.cta-link]:text-lima [&_.cta-link]:underline
              [&_details]:my-3 [&_details]:border [&_details]:border-white/10 [&_details]:rounded-lg [&_details]:overflow-hidden [&_details]:bg-forest
              [&_details[open]]:border-lima/20
              [&_summary]:cursor-pointer [&_summary]:px-5 [&_summary]:py-4 [&_summary]:text-crema [&_summary]:font-dm [&_summary]:font-medium [&_summary]:text-base [&_summary]:list-none [&_summary]:select-none
              [&_summary::-webkit-details-marker]:hidden
              [&_summary::marker]:hidden
              [&_summary]:hover:bg-white/5
              [&_details>p]:px-5 [&_details>p]:pb-4 [&_details>p]:pt-0 [&_details>p]:text-crema/60 [&_details>p]:text-sm [&_details>p]:font-light [&_details>p]:leading-relaxed
              [&_details_strong]:text-crema [&_details_strong]:font-medium"
            dangerouslySetInnerHTML={{ __html: safeContent }}
          />

          {/* Author bio */}
          {post.authorBio && (
            <div
              className="mt-12 pt-8 border-t border-white/8
                [&_.author-bio]:flex [&_.author-bio]:gap-5 [&_.author-bio]:items-start
                [&_.author-bio_img]:rounded-full [&_.author-bio_img]:w-16 [&_.author-bio_img]:h-16 [&_.author-bio_img]:flex-shrink-0 [&_.author-bio_img]:object-cover
                [&_.author-bio_h4]:font-display [&_.author-bio_h4]:text-crema [&_.author-bio_h4]:text-xl [&_.author-bio_h4]:mb-2 [&_.author-bio_h4]:font-normal
                [&_.author-bio_p]:text-crema/50 [&_.author-bio_p]:font-dm [&_.author-bio_p]:font-light [&_.author-bio_p]:text-sm [&_.author-bio_p]:leading-relaxed [&_.author-bio_p]:mb-3
                [&_.author-bio_a]:text-lima [&_.author-bio_a]:text-xs [&_.author-bio_a]:tracking-widest [&_.author-bio_a]:uppercase [&_.author-bio_a]:font-dm [&_.author-bio_a]:no-underline hover:[&_.author-bio_a]:underline"
              dangerouslySetInnerHTML={{ __html: post.authorBio }}
            />
          )}

          {/* CTA */}
          <div className="my-12 p-8 bg-forest border border-lima/20 text-center">
            <p className="text-[9px] tracking-[3px] uppercase text-lima/70 font-dm mb-3">✦ Tecnología IA · Gratis</p>
            <h3 className="font-display text-2xl text-crema mb-3">Planea tu visita a la Huasteca Potosina</h3>
            <p className="text-crema/50 font-dm font-light text-sm mb-6">
              Dinos cuántos días tienes y la IA crea tu itinerario personalizado con rutas reales, tiempos y precios {new Date().getFullYear()}.
            </p>
            <Link
              href="/planear"
              className="inline-flex items-center gap-2 bg-verde-selva text-crema px-8 py-3 text-[10px] tracking-[2.5px] uppercase font-dm hover:bg-verde-vivo transition-colors"
            >
              Crear mi Itinerario Gratis →
            </Link>
          </div>
        </article>

        {/* ── Artículos relacionados (clúster) ── */}
        {related.length > 0 && (
          <section className="max-w-5xl mx-auto px-6 mt-16 pt-12 border-t border-white/8">
            <div className="text-center mb-10">
              <p className="text-[9px] tracking-[3px] uppercase text-lima/50 font-dm mb-2">
                Clúster de contenido
              </p>
              <p className="text-[10px] tracking-[4px] uppercase text-crema/30 font-dm">
                Más guías sobre{" "}
                <span className="text-lima/60">{clusterTag}</span>
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {related.map(p => (
                <Link key={p.slug} href={`/blog/${p.slug}`} className="group">
                  <article className="bg-forest border border-white/8 hover:border-lima/30 transition-colors overflow-hidden h-full flex flex-col">
                    {p.coverImageUrl && (
                      <div className="aspect-video overflow-hidden">
                        <img
                          src={p.coverImageUrl}
                          alt={p.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <div className="p-5 flex flex-col flex-1">
                      {p.tags[0] && (
                        <span className="text-[9px] tracking-[2px] uppercase text-lima/50 font-dm mb-2">{p.tags[0]}</span>
                      )}
                      <h4 className="font-display text-lg text-crema group-hover:text-lima transition-colors leading-snug mb-2 flex-1">{p.title}</h4>
                      <p className="text-crema/40 font-dm font-light text-xs">{p.readingTime} min lectura</p>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Volver al blog */}
        <section className="max-w-2xl mx-auto px-6 text-center mt-16 pt-12 border-t border-white/8">
          <Link
            href="/blog"
            className="text-[10px] tracking-[3px] uppercase font-dm text-crema/40 hover:text-crema/70 transition-colors"
          >
            ← Ver todos los artículos
          </Link>
        </section>
      </main>
    </>
  );
}
