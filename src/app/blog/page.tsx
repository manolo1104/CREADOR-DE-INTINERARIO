import Link from "next/link";
import { prisma } from "@/lib/prisma";

const SITE = "https://www.huasteca-potosina.com";
export const metadata = {
  title: "Blog Huasteca Potosina — Guías, Rutas y Consejos de Viaje",
  description: "Guías completas, rutas y consejos para explorar la Huasteca Potosina: cascadas, Las Pozas, Sótano de las Golondrinas, gastronomía y más.",
  openGraph: {
    title: "Blog Huasteca Potosina — Guías, Rutas y Consejos de Viaje",
    description: "Guías completas, rutas y consejos para explorar la Huasteca Potosina.",
    url: `${SITE}/blog`,
    siteName: "Tours Huasteca Potosina",
    locale: "es_MX",
    type: "website",
    images: [{ url: `${SITE}/og-image.jpg`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", title: "Blog Huasteca Potosina", description: "Guías, rutas y consejos de viaje.", images: [`${SITE}/og-image.jpg`] },
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

export default async function BlogPage() {
  const posts = await getPosts();

  return (
    <main className="min-h-screen bg-crema pt-24 pb-20">
      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 text-center mb-16">
        <p className="text-[10px] tracking-[4px] uppercase text-lima/70 font-dm mb-4">
          ✦ Huasteca Potosina · Blog de Viajes
        </p>
        <h1 className="font-cormorant font-light text-crema mb-6 leading-tight">
          Guías & Rutas para Explorar<br />
          <span className="text-lima">la Huasteca Potosina</span>
        </h1>
        <p className="text-crema/60 font-dm font-light text-lg max-w-2xl mx-auto mb-8">
          Cascadas turquesas, cañones imposibles, selva viva. Todo lo que necesitas saber para planear tu viaje perfecto.
        </p>
        <Link
          href="/planear"
          className="inline-flex items-center gap-2 bg-verde-selva text-crema px-6 py-3 text-[10px] tracking-[2.5px] uppercase font-dm hover:bg-verde-vivo transition-colors"
        >
          Crear mi Itinerario con IA →
        </Link>
      </section>

      {/* Posts grid */}
      {posts.length === 0 ? (
        <div className="max-w-2xl mx-auto px-6 text-center py-20">
          <p className="text-crema/40 font-dm text-lg">Próximamente — El primer artículo está en camino.</p>
        </div>
      ) : (
        <section className="max-w-6xl mx-auto px-6">
          {/* Post destacado */}
          {posts[0] && (
            <Link href={`/blog/${posts[0].slug}`} className="group block mb-12">
              <article className="grid md:grid-cols-2 gap-0 bg-white border border-negro/10 overflow-hidden hover:border-verde-selva/30 shadow-sm transition-colors">
                {posts[0].coverImageUrl && (
                  <div className="aspect-[4/3] md:aspect-auto overflow-hidden">
                    <img
                      src={posts[0].coverImageUrl}
                      alt={posts[0].coverImageAlt || posts[0].title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  </div>
                )}
                <div className="p-8 md:p-12 flex flex-col justify-center">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-[9px] tracking-[3px] uppercase text-lima/70 font-dm">✦ Artículo Destacado</span>
                  </div>
                  <h2 className="font-cormorant text-verde-profundo text-3xl mb-4 leading-tight group-hover:text-dorado transition-colors">
                    {posts[0].title}
                  </h2>
                  <p className="text-negro/60 font-dm text-sm leading-relaxed mb-6">
                    {posts[0].excerpt}
                  </p>
                  <div className="flex items-center gap-4 text-[10px] tracking-[2px] uppercase font-dm text-negro/35">
                    <span>{posts[0].readingTime} min lectura</span>
                    <span>·</span>
                    <span>{new Date(posts[0].publishedAt).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}</span>
                  </div>
                </div>
              </article>
            </Link>
          )}

          {/* Grid de posts */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.slice(1).map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`} className="group">
                <article className="bg-white border border-negro/10 overflow-hidden hover:border-verde-selva/30 shadow-sm transition-colors h-full flex flex-col">
                  {post.coverImageUrl && (
                    <div className="aspect-video overflow-hidden">
                      <img
                        src={post.coverImageUrl}
                        alt={post.coverImageAlt || post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                    </div>
                  )}
                  <div className="p-6 flex flex-col flex-1">
                    {post.tags[0] && (
                      <span className="text-[9px] tracking-[3px] uppercase text-lima/60 font-dm mb-3">{post.tags[0]}</span>
                    )}
                    <h3 className="font-cormorant text-verde-profundo text-xl mb-3 leading-snug group-hover:text-dorado transition-colors flex-1">
                      {post.title}
                    </h3>
                    <p className="text-negro/50 font-dm text-xs leading-relaxed mb-4">
                      {post.excerpt.slice(0, 120)}...
                    </p>
                    <div className="flex items-center gap-3 text-[9px] tracking-[2px] uppercase font-dm text-negro/30 mt-auto">
                      <span>{post.readingTime} min</span>
                      <span>·</span>
                      <span>{new Date(post.publishedAt).toLocaleDateString("es-MX", { month: "short", year: "numeric" })}</span>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* CTA final */}
      <section className="max-w-2xl mx-auto px-6 text-center mt-20 py-16 border-t border-negro/8">
        <p className="text-[10px] tracking-[4px] uppercase text-lima/60 font-dm mb-4">✦ Tecnología IA</p>
        <h2 className="font-cormorant font-light text-verde-profundo text-3xl mb-4">¿Listo para planear tu viaje?</h2>
        <p className="text-negro/60 font-dm mb-8">
          Dinos cuántos días tienes y la IA crea tu itinerario personalizado en 2 minutos. Gratis, sin registro.
        </p>
        <Link
          href="/planear"
          className="inline-flex items-center gap-2 bg-verde-selva text-crema px-8 py-4 text-[10px] tracking-[2.5px] uppercase font-dm hover:bg-verde-vivo transition-colors"
        >
          Crear mi Itinerario Gratis →
        </Link>
      </section>
    </main>
  );
}
