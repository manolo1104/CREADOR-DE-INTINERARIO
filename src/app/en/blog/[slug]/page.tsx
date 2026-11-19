import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPostEn, listPostsEn, urlBlogEn, type PostEn } from "@/lib/blogEn";
import { urlBlog, destinoDeBlog } from "@/lib/blogDestinoMap";
import { DESTINOS_DB } from "@/lib/destinos";
import { PROSE_ARTICULO } from "@/components/blog/estilosArticulo";
import { TOURS_DB, etiquetaUnidad, tourDurTexto, type Tour } from "@/lib/tours";
import { localizeTour, localizeDestino } from "@/lib/i18n/localize";
import { AvisoTemporadaBlog, PreguntaWhatsappBlog, CierreWhatsappBlog } from "@/components/blog/CtaWhatsappBlog";
import { lugarEnFraseEn } from "@/lib/blogCtaWhatsapp";
import { horaEnLista } from "@/lib/recogidaTexto";
import { SITE } from "@/lib/i18n/config";
import { ORG_REF, buildBreadcrumbNode } from "@/lib/jsonld";

/**
 * Un artículo del blog en INGLÉS (10 nov 2026).
 *
 * No es un re-export de `/blog/[slug]` como el resto de `/en`: el español sale
 * de la base y pasa por una docena de arreglos en español al vuelo
 * (`PROMESAS_FALSAS`, `AUTOENLACES`, `blogSeo.ts`…). El inglés se tradujo YA
 * corregido y vive en archivos (`src/lib/blogEn.ts`), así que esta plantilla
 * solo pinta: mismo diseño (`PROSE_ARTICULO`), mismas salidas a la venta
 * (tarjeta del tour, catálogo, reservar), y su propio marcado en inglés.
 *
 * 🔴 Nunca se publica aquí el `schemaMarkup` guardado en la base: está en
 * español (`es-MX`).
 */

export const revalidate = 3600;

export function generateStaticParams() {
  return listPostsEn().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = getPostEn(params.slug);
  if (!post) return { title: "Article not found", robots: { index: false } };

  const canonical = `${SITE}${urlBlogEn(post.slug)}`;
  const espanol = `${SITE}${urlBlog(post.slugEs)}`;
  const imagen = post.coverImageUrl ?? undefined;

  return {
    title: post.metaTitle,
    description: post.metaDescription,
    keywords: post.keywords.join(", "),
    openGraph: {
      title: post.metaTitle,
      description: post.metaDescription,
      url: canonical,
      siteName: "Huasteca Potosina Tours",
      locale: "en_US",
      alternateLocale: ["es_MX"],
      type: "article",
      publishedTime: post.datePublished,
      modifiedTime: post.dateModified,
      authors: ["Manolo Covarrubias"],
      section: post.seccion,
      images: imagen ? [{ url: imagen, width: 1200, height: 630, alt: post.coverImageAlt || post.title }] : [],
    },
    twitter: { card: "summary_large_image", title: post.metaTitle, description: post.metaDescription, images: imagen ? [imagen] : [] },
    // Par explícito (slugs distintos en cada idioma): `buildAlternates` supone
    // la misma ruta en los dos y aquí no lo es.
    alternates: {
      canonical,
      languages: { "es-MX": espanol, en: canonical, "x-default": espanol },
    },
  };
}

/** Las preguntas del artículo (bloques `<details>`), para el FAQPage. */
function preguntasDe(html: string): { q: string; a: string }[] {
  const re = /<details[^>]*>[\s\S]*?<summary[^>]*>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/gi;
  const out: { q: string; a: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const q = m[1].replace(/<[^>]+>/g, "").trim();
    const a = m[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    if (q && a) out.push({ q, a });
  }
  return out;
}

/** Índice: los `<h2>` con `id` (la traducción conserva los del español). */
function indiceDe(html: string): { id: string; texto: string }[] {
  const re = /<h2[^>]*\sid="([^"]+)"[^>]*>([\s\S]*?)<\/h2>/gi;
  const out: { id: string; texto: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) out.push({ id: m[1], texto: m[2].replace(/<[^>]+>/g, "").trim() });
  return out;
}

const fechaLarga = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "America/Mexico_City" });

function relacionados(post: PostEn): PostEn[] {
  const otros = listPostsEn().filter((p) => p.slug !== post.slug);
  const misma = otros.filter((p) => p.seccion === post.seccion);
  return [...misma, ...otros.filter((p) => p.seccion !== post.seccion)].slice(0, 3);
}

export default function BlogPostEnPage({ params }: { params: { slug: string } }) {
  const post = getPostEn(params.slug);
  if (!post) notFound();

  const url = `${SITE}${urlBlogEn(post.slug)}`;
  const tours = post.tours
    .map((s) => TOURS_DB.find((t) => t.slug === s))
    .filter((t): t is Tour => Boolean(t))
    .map((t) => localizeTour(t, "en"));
  const faqs = preguntasDe(post.contentHtml);
  const indice = indiceDe(post.contentHtml);
  const otros = relacionados(post);
  const actualizado = new Date(post.dateModified).getTime() - new Date(post.datePublished).getTime() > 86_400_000;
  const palabras = post.contentHtml.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
  const d = destinoDeBlog(post.slugEs);
  const lugar = d && !d.comparativa ? DESTINOS_DB.find((x) => x.slug === d.destino) : undefined;

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        headline: post.title,
        description: post.metaDescription,
        inLanguage: "en",
        datePublished: post.datePublished,
        dateModified: post.dateModified,
        wordCount: palabras,
        author: {
          "@type": "Person",
          name: "Manolo Covarrubias",
          url: `${SITE}/en/nosotros`,
          image: `${SITE}/imagenes/guias/manolo-covarrubias.jpg`,
        },
        publisher: ORG_REF,
        image: post.coverImageUrl ? { "@type": "ImageObject", url: post.coverImageUrl, description: post.coverImageAlt } : undefined,
        url,
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
        isPartOf: { "@type": "Blog", name: "Huasteca Potosina Tours blog", url: `${SITE}/en/blog` },
        // El lugar del que trata, con su ficha en inglés (mismo criterio que /blog/[slug]).
        about: lugar
          ? {
              "@type": "TouristAttraction",
              name: lugar.nombre,
              url: `${SITE}/en/destinos/${lugar.slug}`,
              geo: { "@type": "GeoCoordinates", latitude: lugar.lat, longitude: lugar.lng },
              containedInPlace: { "@type": "Place", name: `${lugar.zona}, San Luis Potosí, Mexico` },
            }
          : undefined,
        articleSection: post.seccion,
        keywords: post.keywords.join(", "),
        // La versión original: la traducción no se presenta como otra obra.
        translationOfWork: { "@type": "BlogPosting", url: `${SITE}${urlBlog(post.slugEs)}`, inLanguage: "es-MX" },
      },
      buildBreadcrumbNode(
        [
          { name: "Blog", path: "/blog" },
          { name: post.seccion, path: `/blog/${post.slug}` },
        ],
        "en",
      ),
      ...(faqs.length > 0
        ? [{
            "@type": "FAQPage",
            mainEntity: faqs.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
          }]
        : []),
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <main className="min-h-screen bg-crema pb-20 pt-[calc(var(--navbar-alto,64px)+20px)] sm:pt-[calc(var(--navbar-alto,64px)+36px)]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <header className="mb-10 sm:mb-12">
            <nav aria-label="Breadcrumb" className="mb-5 font-dm text-[13px] text-negro/50">
              <Link href="/en" className="hover:text-verde-selva">Home</Link>
              <span className="mx-2" aria-hidden="true">/</span>
              <Link href="/en/blog" className="hover:text-verde-selva">Blog</Link>
              <span className="mx-2" aria-hidden="true">/</span>
              <span className="text-negro/70">{post.seccion}</span>
            </nav>
            <h1 className="max-w-[22ch] font-cormorant text-[2.4rem] font-normal leading-[1.08] text-verde-profundo sm:text-[3.4rem]">
              {post.title}
            </h1>
            <p className="mt-4 font-dm text-[15px] text-negro/55">
              By Manolo Covarrubias · {fechaLarga(post.datePublished)}
              {actualizado && <> · Updated {fechaLarga(post.dateModified)}</>} · {post.readingTime} min read
            </p>
            <p className="mt-2 font-dm text-[13px] text-negro/45">
              Translated from the original Spanish article.{" "}
              <a href={urlBlog(post.slugEs)} hrefLang="es" lang="es" className="underline underline-offset-4 hover:text-verde-selva">
                Leer en español
              </a>
            </p>
            {post.coverImageUrl && (
              <div className="mt-8 overflow-hidden rounded-2xl bg-negro/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={post.coverImageUrl}
                  alt={post.coverImageAlt}
                  width={1600}
                  height={900}
                  className="aspect-[16/9] w-full object-cover"
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                />
              </div>
            )}
          </header>

          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
            <article className="min-w-0 max-w-[68ch]">
              {indice.length >= 3 && (
                <nav aria-label="In this article" className="mb-10 rounded-2xl border border-negro/10 bg-white p-6">
                  <p className="mb-3 font-dm text-[13px] font-medium text-verde-selva">In this article</p>
                  <ol className="space-y-2 font-dm text-[15px] text-negro/70">
                    {indice.map((h) => (
                      <li key={h.id}>
                        <a href={`#${h.id}`} className="hover:text-verde-selva">{h.texto}</a>
                      </li>
                    ))}
                  </ol>
                </nav>
              )}
              {/* WhatsApp por temporada, con la demanda REAL del recorrido (19 nov 2026). */}
              <AvisoTemporadaBlog titulo={post.title} tour={tours[0]} idioma="en" />
              {tours[0] && <TarjetaTourEn tour={tours[0]} className="mb-10 lg:hidden" />}
              <div className={PROSE_ARTICULO} dangerouslySetInnerHTML={{ __html: post.contentHtml }} />
              <PreguntaWhatsappBlog
                titulo={post.title}
                lugar={lugar ? lugarEnFraseEn(localizeDestino(lugar, "en").nombre) : "the Huasteca Potosina"}
                idioma="en"
              />
            </article>

            <aside className="hidden lg:block">
              <div className="sticky top-28 space-y-5">
                {tours[0] && <TarjetaTourEn tour={tours[0]} />}
                <div className="rounded-2xl border border-negro/10 bg-white p-5">
                  <p className="font-cormorant text-xl leading-snug text-verde-profundo">Plan your trip with local guides</p>
                  <p className="mt-2 font-dm text-[14px] leading-relaxed text-negro/60">
                    Guided tours from Xilitla and Ciudad Valles, with hotel pickup on most of them.
                  </p>
                  <Link href="/en/tours" className="mt-4 inline-flex font-dm text-sm text-verde-selva underline underline-offset-4 hover:text-terracota">
                    See all tours
                  </Link>
                </div>
              </div>
            </aside>
          </div>

          {tours.length > 1 && (
            <section className="mt-16">
              <h2 className="mb-6 font-cormorant text-3xl text-verde-profundo">Related tours</h2>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {tours.map((t) => <TarjetaTourEn key={t.slug} tour={t} />)}
              </div>
            </section>
          )}

          {otros.length > 0 && (
            <section className="mt-16">
              <h2 className="mb-6 font-cormorant text-3xl text-verde-profundo">Keep reading</h2>
              <div className="grid gap-5 sm:grid-cols-3">
                {otros.map((p) => (
                  <Link key={p.slug} href={urlBlogEn(p.slug)} className="group rounded-2xl border border-negro/10 bg-white p-5 transition-colors hover:border-verde-selva/40">
                    <p className="font-dm text-[12px] text-verde-selva">{p.seccion}</p>
                    <p className="mt-2 font-cormorant text-xl leading-snug text-verde-profundo group-hover:text-verde-selva">{p.title}</p>
                    <p className="mt-2 font-dm text-[14px] leading-relaxed text-negro/55 line-clamp-3">{p.excerpt}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section className="mt-16 rounded-2xl bg-verde-profundo px-6 py-10 text-center sm:px-10">
            <p className="font-cormorant text-3xl text-crema">Ready to see it in person?</p>
            <p className="mx-auto mt-3 max-w-xl font-dm text-[15px] leading-relaxed text-crema/70">
              Small-group tours with certified guides. Prices in Mexican pesos (MXN), paid online or on WhatsApp.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/en/tours" className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-dorado px-7 font-dm text-[15px] font-medium text-negro hover:bg-lima">
                Browse tours
              </Link>
              <Link href="/en/reservar" className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-crema/40 px-7 font-dm text-[15px] font-medium text-crema hover:border-crema">
                Check dates
              </Link>
            </div>
            <CierreWhatsappBlog titulo={post.title} tour={tours[0]} idioma="en" />
          </section>
        </div>
      </main>
    </>
  );
}

const tieneDesde = (t: Tour) => t.precioUnidad === "grupo" || (t.rutas?.length ?? 0) > 0;

/** La tarjeta del tour relacionado, en inglés: mismos dos enlaces que la española (carrito y ficha). */
function TarjetaTourEn({ tour, className = "" }: { tour: Tour; className?: string }) {
  const hora = horaEnLista(tour, true);
  const salida = hora ? (/^\d/.test(hora) ? `Departs ${hora}` : hora.charAt(0).toUpperCase() + hora.slice(1)) : "";
  return (
    <div className={`rounded-2xl border border-negro/10 bg-white p-5 ${className}`}>
      <p className="mb-3 font-dm text-[13px] font-medium text-verde-selva">Related tour</p>
      {tour.imagen_hero && (
        <div className="relative mb-4 aspect-video overflow-hidden rounded-xl bg-negro/5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={tour.imagen_hero} alt={tour.nombre} className="h-full w-full object-cover" loading="lazy" />
        </div>
      )}
      <p className="font-cormorant text-xl leading-snug text-verde-profundo">{tour.nombre}</p>
      <p className="mt-1 mb-3 font-dm text-[13px] text-negro/50">
        {[tourDurTexto(tour, " h"), salida].filter(Boolean).join(", ")}
      </p>
      <p className="mb-4 font-cormorant text-2xl leading-none text-dorado">
        {tieneDesde(tour) && <span className="mr-1 font-dm text-[12px] text-negro/50">from</span>}
        ${tour.precio.toLocaleString("en-US")}
        <span className="ml-1 font-dm text-[12px] text-negro/50">MXN {etiquetaUnidad(tour, true)}</span>
      </p>
      <div className="flex flex-col gap-2.5">
        <Link
          href={`/en/reservar/carrito?agregar=${tour.slug}`}
          className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-dorado px-5 font-dm text-[15px] font-medium text-negro transition-[background-color,transform] duration-200 hover:bg-lima active:scale-[0.98]"
        >
          Book
        </Link>
        <Link
          href={`/en/tours/${tour.slug}`}
          className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-negro/20 px-5 font-dm text-sm font-medium text-verde-profundo transition-colors hover:border-verde-selva hover:text-verde-selva"
        >
          See full tour
        </Link>
      </div>
    </div>
  );
}
