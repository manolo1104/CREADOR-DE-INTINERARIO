import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";
import { BlogFilters } from "@/components/BlogFilters";
import { applyBlogImageEditsPreview } from "@/lib/blogImageEdits";
import { aplicaBlogSeo } from "@/lib/blogSeo";
import { urlBlog } from "@/lib/blogDestinoMap";
import { TOURS_DB } from "@/lib/tours";
import { GOOGLE_RATING, GOOGLE_RESENAS } from "@/lib/resenas";
import { buildOrganizationNode, ORG_REF } from "@/lib/jsonld";

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
    const posts = await prisma.blogPost.findMany({
      where: { published: true },
      orderBy: { publishedAt: "desc" },
      select: {
        slug: true, title: true, excerpt: true, coverImageUrl: true,
        coverImageAlt: true, tags: true, readingTime: true, publishedAt: true, focusKeyword: true,
      },
    });
    // 🔴 Las correcciones de `blogSeo.ts` (precios del catálogo en vez de los
    // inventados del artículo, resúmenes reescritos) solo se aplicaban en la
    // página de cada artículo. El listado leía `excerpt` crudo de la base, así
    // que las tarjetas y el ItemList de /blog seguían anunciando «tours
    // completos por $1,459 MXN», un tour que no existe. Mismo orden que en
    // blog/[slug]: primero las fotos, luego el SEO.
    return posts.map((p) => aplicaBlogSeo(applyBlogImageEditsPreview(p)));
  } catch {
    return [];
  }
}

export default async function BlogPage({ searchParams }: { searchParams?: { q?: string } }) {
  const posts = await getPosts();
  const initialQuery = searchParams?.q || "";
  // Recorridos sin la cancelación gratis de 48 h (hoy el Edén): se nombran en el CTA.
  const sinReembolso = TOURS_DB.filter((t) => t.cancelacion).map((t) => t.nombreCorto);

  const itemListSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: "Blog de Viajes — Guías & Rutas Huasteca Potosina",
        url: `${SITE}/blog`,
        description: "Guías completas, rutas y consejos para explorar la Huasteca Potosina.",
        // La empresa por su @id, no un `Organization` suelto sin identificador
        // (se leía como otra entidad con el mismo nombre). El nodo completo va
        // en este mismo grafo para que la referencia resuelva aquí; su
        // calificación es la que se ve en el CTA de abajo.
        publisher: ORG_REF,
      },
      buildOrganizationNode("es"),
      {
        "@type": "ItemList",
        name: "Artículos del Blog",
        url: `${SITE}/blog`,
        numberOfItems: posts.length,
        itemListElement: posts.map((p, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: p.title,
          url: `${SITE}${urlBlog(p.slug)}`,
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
      <main className="min-h-screen bg-crema pb-20 pt-[calc(var(--navbar-alto,64px)+20px)] sm:pt-[calc(var(--navbar-alto,64px)+36px)]">
        {/* Cabecera: a la izquierda, como el inicio */}
        <section className="mx-auto max-w-6xl px-6">
          <nav aria-label="Ruta" className="mb-6 font-dm text-[13px] text-negro/50">
            <Link href="/" prefetch={false} className="transition-colors hover:text-verde-selva">Inicio</Link>
            <span className="mx-2">/</span>
            <span className="text-negro/70">Blog</span>
          </nav>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <h1
                className="font-cormorant font-light leading-[1.05] text-verde-profundo"
                style={{ fontSize: "clamp(40px,5.4vw,68px)" }}
              >
                Guías para explorar <em className="text-dorado">la Huasteca</em>
              </h1>
              <p className="mt-5 max-w-[58ch] font-dm text-[15px] leading-relaxed text-negro/60 sm:text-base">
                {posts.length > 0 ? `${posts.length} artículos escritos ` : "Artículos escritos "}
                por los guías que viven aquí: cuándo venir, cuánto cuesta, cómo llegar y qué vale la pena
                en cada cascada, sótano y pueblo.
              </p>
            </div>
            <Link
              href="/reservar"
              prefetch={false}
              className="inline-flex min-h-[52px] shrink-0 items-center justify-center rounded-full bg-dorado px-8 font-dm text-[15px] font-medium text-negro transition-[background-color,transform] duration-200 ease-out hover:bg-lima active:scale-[0.98]"
            >
              Ver recorridos y reservar
            </Link>
          </div>
        </section>

        {/* Buscador, categorías y todos los artículos */}
        <section className="mx-auto mt-12 max-w-6xl px-6 sm:mt-14">
          {posts.length === 0 ? (
            <div className="rounded-2xl bg-white px-6 py-16 text-center">
              <p className="font-cormorant text-2xl text-verde-profundo">El primer artículo está en camino.</p>
            </div>
          ) : (
            <BlogFilters posts={posts} featuredPost={posts[0] ?? null} initialQuery={initialQuery} />
          )}
        </section>

        {/* Cierre: el único bloque oscuro de la página */}
        <section aria-label="Reserva tu viaje" className="mx-auto mt-20 max-w-6xl px-6 sm:mt-24">
          <div className="rounded-2xl bg-verde-profundo px-6 py-12 sm:px-12 sm:py-16 lg:px-16">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center lg:gap-16">
              <div className="max-w-2xl">
                <p className="font-dm text-sm text-crema/60">
                  {GOOGLE_RATING} en Google · {GOOGLE_RESENAS} reseñas
                </p>
                <h2
                  className="mt-3 font-cormorant font-light leading-[1.08] text-crema"
                  style={{ fontSize: "clamp(32px,4vw,52px)" }}
                >
                  ¿Listo para <em className="text-dorado">reservar</em> tu viaje?
                </h2>
                {/* Son los recorridos que marque TOURS_DB y no todos llevan
                    traslado ni desayuno. La cancelación gratis tampoco aplica
                    a los que traen su propia `cancelacion`. */}
                <p className="mt-4 max-w-[55ch] font-dm text-[15px] leading-relaxed text-crema/70 sm:text-base">
                  {TOURS_DB.length} recorridos a precio final. Apartas con el 30 % y liquidas el resto el día
                  del tour. Cancelas gratis hasta 48 h antes
                  {sinReembolso.length ? ` (salvo ${sinReembolso.join(", ")})` : ""}.
                </p>
              </div>
              <div className="flex flex-col items-start gap-4 lg:items-end">
                <Link
                  href="/reservar"
                  prefetch={false}
                  className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-dorado px-8 font-dm text-[15px] font-medium text-negro transition-[background-color,transform] duration-200 ease-out hover:bg-lima active:scale-[0.98]"
                >
                  Ver recorridos y reservar
                </Link>
                <Link
                  href="/recomendar"
                  prefetch={false}
                  className="font-dm text-sm text-crema/70 underline decoration-crema/30 underline-offset-4 transition-colors hover:text-crema"
                >
                  ¿No sabes qué tour elegir? Te lo recomendamos
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
