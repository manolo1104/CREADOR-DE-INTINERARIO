import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";
import { BlogFilters } from "@/components/BlogFilters";

const SITE = "https://www.huasteca-potosina.com";

export const metadata: Metadata = {
  title: "Blog Huasteca Potosina — Guías de Viaje, Rutas e Itinerarios 2026",
  description: "Guías completas para planear tu viaje a la Huasteca Potosina: mejores épocas, itinerarios de 3-7 días, cascadas, gastronomía y consejos de guías locales.",
  openGraph: {
    title: "Blog Huasteca Potosina — Guías de Viaje 2026",
    description: "Itinerarios, mejores épocas, cascadas y consejos de guías locales. Todo gratis.",
    url: `${SITE}/blog`,
    siteName: "Tours Huasteca Potosina",
    locale: "es_MX",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Blog Huasteca Potosina — Guías de Viaje 2026",
    description: "Itinerarios detallados, mejores épocas y consejos de guías locales.",
  },
  alternates: { canonical: `${SITE}/blog` },
};

export const dynamic = "force-dynamic";

async function getPosts() {
  try {
    return await prisma.blogPost.findMany({
      where: { published: true },
      orderBy: { publishedAt: "desc" },
      select: {
        slug: true, title: true, excerpt: true, coverImageUrl: true,
        coverImageAlt: true, tags: true, readingTime: true, publishedAt: true, focusKeyword: true,
      },
    });
  } catch {
    return [];
  }
}

export default async function BlogPage({ searchParams }: { searchParams?: { q?: string } }) {
  const posts = await getPosts();
  const initialQuery = searchParams?.q || "";

  const itemListSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: "Blog de Viajes — Guías & Rutas Huasteca Potosina",
        url: `${SITE}/blog`,
        description: "Guías completas, rutas y consejos para explorar la Huasteca Potosina.",
        publisher: { "@type": "Organization", name: "Tours Huasteca Potosina", url: SITE },
      },
      {
        "@type": "ItemList",
        name: "Artículos del Blog",
        url: `${SITE}/blog`,
        numberOfItems: posts.length,
        itemListElement: posts.map((p, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: p.title,
          url: `${SITE}/blog/${p.slug}`,
          description: p.excerpt.slice(0, 155),
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Inicio", item: SITE },
          { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE}/blog` },
        ],
      },
    ],
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: itemListSchema }} />
      <main className="min-h-screen bg-negro pt-24 pb-20">
        {/* Hero */}
        <section className="max-w-5xl mx-auto px-6 text-center mb-12">
          <p className="text-[10px] tracking-[4px] uppercase text-lima/70 font-dm mb-4">✦ Huasteca Potosina · Blog de Viajes</p>
          <h1 className="font-cormorant font-light text-crema mb-6 leading-tight" style={{ fontSize: "clamp(32px,5vw,60px)" }}>
            Guías & Rutas para Explorar<br />
            <span className="text-lima">la Huasteca Potosina</span>
          </h1>
          <p className="text-crema/60 font-dm font-light text-lg max-w-2xl mx-auto mb-8">
            Cascadas turquesas, cañones imposibles, selva viva. Todo lo que necesitas saber para planear tu viaje perfecto.
          </p>
          <Link href="/recomendar" className="inline-flex items-center gap-2 bg-verde-selva text-crema px-6 py-3 text-[10px] tracking-[2.5px] uppercase font-dm hover:bg-verde-vivo transition-colors">
            ✦ Recomendador IA — ¿Qué tour es para mí? →
          </Link>
        </section>

        {/* Filters + Grid */}
        {posts.length === 0 ? (
          <div className="max-w-2xl mx-auto px-6 text-center py-20">
            <p className="text-crema/40 font-dm text-lg">Próximamente — El primer artículo está en camino.</p>
          </div>
        ) : (
          <section className="max-w-6xl mx-auto px-6">
            <BlogFilters posts={posts} featuredPost={posts[0] ?? null} initialQuery={initialQuery} />
          </section>
        )}

        {/* CTA final */}
        <section className="max-w-2xl mx-auto px-6 text-center mt-20 py-16 border-t border-white/8">
          <p className="text-[10px] tracking-[4px] uppercase text-lima/60 font-dm mb-4">✦ Tecnología IA</p>
          <h2 className="font-cormorant font-light text-crema text-3xl mb-4">¿Listo para planear tu viaje?</h2>
          <p className="text-crema/50 font-dm font-light mb-8">Dinos cuántos días tienes y la IA crea tu itinerario personalizado en 2 minutos. Gratis, sin registro.</p>
          <Link href="/recomendar" className="inline-flex items-center gap-2 bg-verde-selva text-crema px-8 py-4 text-[10px] tracking-[2.5px] uppercase font-dm hover:bg-verde-vivo transition-colors">
            Encontrar mi tour perfecto →
          </Link>
        </section>
      </main>
    </>
  );
}
