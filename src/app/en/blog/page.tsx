import Link from "next/link";
import type { Metadata } from "next";
import { listPostsEn, urlBlogEn } from "@/lib/blogEn";
import { SITE } from "@/lib/i18n/config";
import { ORG_REF, buildBreadcrumbNode } from "@/lib/jsonld";

/**
 * Índice del blog en inglés (10 nov 2026). Lista solo los artículos ya
 * traducidos (`src/content/blog-en`). Mientras no haya ninguno, la página no se
 * indexa: un índice vacío es contenido delgado.
 */

export const revalidate = 3600;

const TITULO = "Huasteca Potosina Travel Blog: Guides & Tips";
const DESCRIPCION =
  "Travel guides to the Huasteca Potosina written by local guides: best time to visit, waterfalls, getting there, costs and day-by-day itineraries.";

export function generateMetadata(): Metadata {
  const hay = listPostsEn().length > 0;
  return {
    title: TITULO,
    description: DESCRIPCION,
    robots: hay ? undefined : { index: false, follow: true },
    openGraph: {
      title: TITULO,
      description: DESCRIPCION,
      url: `${SITE}/en/blog`,
      siteName: "Huasteca Potosina Tours",
      locale: "en_US",
      type: "website",
    },
    alternates: {
      canonical: `${SITE}/en/blog`,
      languages: { "es-MX": `${SITE}/blog`, en: `${SITE}/en/blog`, "x-default": `${SITE}/blog` },
    },
  };
}

const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "America/Mexico_City" });

export default function BlogEnPage() {
  const posts = listPostsEn();

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: TITULO,
        description: DESCRIPCION,
        url: `${SITE}/en/blog`,
        inLanguage: "en",
        publisher: ORG_REF,
        mainEntity: {
          "@type": "ItemList",
          itemListElement: posts.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE}${urlBlogEn(p.slug)}`, name: p.title })),
        },
      },
      buildBreadcrumbNode([{ name: "Blog", path: "/blog" }], "en"),
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <main className="min-h-screen bg-crema pb-20 pt-[calc(var(--navbar-alto,64px)+28px)] sm:pt-[calc(var(--navbar-alto,64px)+44px)]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <header className="mb-10 max-w-3xl">
            <h1 className="font-cormorant text-[2.4rem] font-normal leading-[1.08] text-verde-profundo sm:text-[3.4rem]">
              Huasteca Potosina travel guides
            </h1>
            <p className="mt-4 font-dm text-[17px] leading-relaxed text-negro/65">
              Written by the guides who run our tours in Xilitla and Ciudad Valles: when to go, how to get there,
              what each waterfall is really like, and what it costs. Prices are in Mexican pesos (MXN).
            </p>
          </header>

          {posts.length === 0 ? (
            <p className="font-dm text-negro/60">
              Our guides are translating the articles. Meanwhile, see the{" "}
              <Link href="/en/info-practica" className="text-verde-selva underline underline-offset-4">practical guide</Link>{" "}
              or <Link href="/en/destinos" className="text-verde-selva underline underline-offset-4">all destinations</Link>.
            </p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((p) => (
                <Link
                  key={p.slug}
                  href={urlBlogEn(p.slug)}
                  className="group overflow-hidden rounded-2xl border border-negro/10 bg-white transition-colors hover:border-verde-selva/40"
                >
                  {p.coverImageUrl && (
                    <div className="aspect-[16/10] overflow-hidden bg-negro/5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.coverImageUrl} alt={p.coverImageAlt} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                    </div>
                  )}
                  <div className="p-5">
                    <p className="font-dm text-[12px] text-verde-selva">{p.seccion} · {p.readingTime} min read</p>
                    <h2 className="mt-2 font-cormorant text-2xl leading-snug text-verde-profundo group-hover:text-verde-selva">{p.title}</h2>
                    <p className="mt-2 font-dm text-[14px] leading-relaxed text-negro/60 line-clamp-3">{p.excerpt}</p>
                    <p className="mt-3 font-dm text-[12px] text-negro/40">{fecha(p.datePublished)}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
