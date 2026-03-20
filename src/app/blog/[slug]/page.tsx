import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";

export const revalidate = 3600;

async function getPost(slug: string) {
  try {
    return await prisma.blogPost.findUnique({ where: { slug, published: true } });
  } catch {
    return null;
  }
}

async function getRelatedPosts(slug: string, tags: string[]) {
  try {
    return await prisma.blogPost.findMany({
      where: { published: true, slug: { not: slug }, tags: { hasSome: tags } },
      orderBy: { publishedAt: "desc" },
      take: 3,
      select: { slug: true, title: true, excerpt: true, coverImageUrl: true, readingTime: true, tags: true },
    });
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await getPost(params.slug);
  if (!post) return { title: "Artículo no encontrado" };
  return {
    title: post.metaTitle || post.title,
    description: post.metaDescription,
    keywords: [post.focusKeyword, ...post.secondaryKeywords].join(", "),
    openGraph: {
      title: post.metaTitle || post.title,
      description: post.metaDescription,
      images: post.coverImageUrl ? [{ url: post.coverImageUrl, alt: post.coverImageAlt || post.title }] : [],
      type: "article",
      publishedTime: post.publishedAt.toISOString(),
    },
  };
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = await getPost(params.slug);
  if (!post) notFound();

  const related = await getRelatedPosts(post.slug, post.tags);

  // Use AI-generated schema markup if available, otherwise fallback
  const schemaMarkup = post.schemaMarkup || JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.metaDescription,
    image: post.coverImageUrl,
    datePublished: post.publishedAt.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    author: {
      "@type": "Person",
      name: "Manolo Covarrubias",
      jobTitle: "Promotor Turístico y Experto en Huasteca Potosina",
    },
    publisher: {
      "@type": "Organization",
      name: "Huasteca Potosina",
      logo: { "@type": "ImageObject", url: "https://creador-de-intinerario-production.up.railway.app/favicon.svg" },
    },
    keywords: [post.focusKeyword, ...post.secondaryKeywords].join(", "),
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: schemaMarkup }} />

      <main className="min-h-screen bg-jungle pt-24 pb-20">
        {/* Hero */}
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

          {/* Title */}
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

          {/* Cover image */}
          {post.coverImageUrl && (
            <div className="aspect-video overflow-hidden mb-10">
              <img
                src={post.coverImageUrl}
                alt={post.coverImageAlt || post.title}
                className="w-full h-full object-cover"
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
              prose-img:rounded-none prose-figure:my-8 prose-figcaption:text-crema/40 prose-figcaption:text-xs prose-figcaption:text-center prose-figcaption:mt-2
              [&_.cta-box]:my-10 [&_.cta-box]:p-8 [&_.cta-box]:bg-forest [&_.cta-box]:border [&_.cta-box]:border-lima/20 [&_.cta-box]:text-center
              [&_.cta-button]:inline-flex [&_.cta-button]:items-center [&_.cta-button]:gap-2 [&_.cta-button]:bg-verde-selva [&_.cta-button]:text-crema [&_.cta-button]:px-8 [&_.cta-button]:py-3 [&_.cta-button]:text-xs [&_.cta-button]:tracking-widest [&_.cta-button]:uppercase [&_.cta-button]:font-dm [&_.cta-button]:no-underline
              [&_.cta-link]:text-lima [&_.cta-link]:underline"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* Author Bio */}
          {post.authorBio && (
            <div
              className="mt-12 pt-8 border-t border-white/8
                [&_.author-bio]:flex [&_.author-bio]:gap-5 [&_.author-bio]:items-start
                [&_.author-bio_img]:rounded-full [&_.author-bio_img]:w-16 [&_.author-bio_img]:h-16 [&_.author-bio_img]:flex-shrink-0
                [&_.author-bio_h4]:font-display [&_.author-bio_h4]:text-crema [&_.author-bio_h4]:text-xl [&_.author-bio_h4]:mb-2 [&_.author-bio_h4]:font-normal
                [&_.author-bio_p]:text-crema/50 [&_.author-bio_p]:font-dm [&_.author-bio_p]:font-light [&_.author-bio_p]:text-sm [&_.author-bio_p]:leading-relaxed [&_.author-bio_p]:mb-3
                [&_.author-bio_a]:text-lima [&_.author-bio_a]:text-xs [&_.author-bio_a]:tracking-widest [&_.author-bio_a]:uppercase [&_.author-bio_a]:font-dm [&_.author-bio_a]:no-underline hover:[&_.author-bio_a]:underline"
              dangerouslySetInnerHTML={{ __html: post.authorBio }}
            />
          )}

          {/* CTA inline */}
          <div className="my-12 p-8 bg-forest border border-lima/20 text-center">
            <p className="text-[9px] tracking-[3px] uppercase text-lima/70 font-dm mb-3">✦ Tecnología IA · Gratis</p>
            <h3 className="font-display text-2xl text-crema mb-3">Planea tu visita a la Huasteca Potosina</h3>
            <p className="text-crema/50 font-dm font-light text-sm mb-6">
              Dinos cuántos días tienes y la IA crea tu itinerario personalizado con rutas reales, tiempos y precios 2026.
            </p>
            <Link
              href="/planear"
              className="inline-flex items-center gap-2 bg-verde-selva text-crema px-8 py-3 text-[10px] tracking-[2.5px] uppercase font-dm hover:bg-verde-vivo transition-colors"
            >
              Crear mi Itinerario Gratis →
            </Link>
          </div>
        </article>

        {/* Posts relacionados */}
        {related.length > 0 && (
          <section className="max-w-5xl mx-auto px-6 mt-16 pt-12 border-t border-white/8">
            <p className="text-[10px] tracking-[4px] uppercase text-crema/30 font-dm text-center mb-10">
              Más guías de la Huasteca Potosina
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              {related.map(p => (
                <Link key={p.slug} href={`/blog/${p.slug}`} className="group">
                  <article className="bg-forest border border-white/8 hover:border-lima/30 transition-colors overflow-hidden">
                    {p.coverImageUrl && (
                      <div className="aspect-video overflow-hidden">
                        <img src={p.coverImageUrl} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                      </div>
                    )}
                    <div className="p-5">
                      <h4 className="font-display text-lg text-crema group-hover:text-lima transition-colors leading-snug mb-2">{p.title}</h4>
                      <p className="text-crema/40 font-dm font-light text-xs">{p.readingTime} min · {p.tags[0]}</p>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* CTA final */}
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
