import { Fragment } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { asLocale, buildAlternates, localeUrl, SITE } from "@/lib/i18n/config";
import { buildBreadcrumbNode } from "@/lib/jsonld";
import { getTerminos, type Seg } from "@/lib/i18n/terminos.en";

/**
 * Términos y condiciones, en español y en inglés (/en desde el 10 nov 2026).
 *
 * Todo el texto —y la fecha de la última revisión— vive en
 * `src/lib/i18n/terminos.en.ts`, los dos idiomas juntos. Los números que
 * cambian con el negocio (anticipo, cupo máximo, excepciones) salen de donde
 * vive la regla, no se escriben ahí a mano. El idioma llega por el header
 * `x-locale` del middleware.
 */

const RUTA = "/terminos";

export function generateMetadata(): Metadata {
  const locale = asLocale(headers().get("x-locale"));
  const t = getTerminos(locale);
  return {
    title: t.metaTitle,
    description: t.metaDescription,
    alternates: buildAlternates(RUTA, locale),
    robots: { index: true, follow: true },
    openGraph: {
      title: t.ogTitle,
      description: t.ogDescription,
      url: localeUrl(RUTA, locale),
      siteName: "Tours Huasteca Potosina",
      // Faltaba og:locale (auditoría del 10 nov).
      locale: locale === "en" ? "en_US" : "es_MX",
      type: "website",
      // Se compartía sin foto: el layout ya no le presta la suya a `twitter`
      // y esta página no tiene `opengraph-image`. Next rellena twitter:image con
      // esta. 1200×800 es la medida REAL del archivo (no 630).
      images: [{ url: `${SITE}/og-image.jpg`, width: 1200, height: 800, alt: t.ogImageAlt }],
    },
  };
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="font-cormorant font-light text-verde-profundo text-2xl mt-12 mb-4">{children}</h2>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="font-dm text-sm text-negro/65 leading-relaxed mb-4">{children}</p>;
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li className="font-dm text-sm text-negro/65 leading-relaxed flex items-start gap-2 mb-2">
      <span className="text-verde-vivo mt-0.5 flex-shrink-0" aria-hidden="true">→</span>
      <span>{children}</span>
    </li>
  );
}

/** Pinta un párrafo del diccionario con las clases que siempre tuvo esta página. */
function Rico({ segs }: { segs: Seg[] }) {
  return (
    <>
      {segs.map((s, i) => {
        if (typeof s === "string") return <Fragment key={i}>{s}</Fragment>;
        if ("b" in s) return <strong key={i} className="text-verde-profundo">{s.b}</strong>;
        if ("web" in s) return <span key={i} className="text-verde-profundo">{s.web}</span>;
        if ("mail" in s)
          return (
            <a key={i} href={`mailto:${s.mail}`} className="text-verde-selva underline underline-offset-2">
              {s.mail}
            </a>
          );
        return (
          <Link key={i} href={s.href} className="text-verde-selva underline underline-offset-2">
            {s.link}
          </Link>
        );
      })}
    </>
  );
}

export default function TerminosPage() {
  const locale = asLocale(headers().get("x-locale"));
  const t = getTerminos(locale);

  // Esta página era una de las dos indexables del sitio sin un solo dato
  // estructurado. Mismo patrón que /creditos: la ficha de la página y las migas.
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: t.webPageName,
        description: t.webPageDescription,
        url: localeUrl(RUTA, locale),
        inLanguage: t.inLanguage,
        isPartOf: { "@type": "WebSite", name: "Tours Huasteca Potosina", url: SITE },
      },
      buildBreadcrumbNode([{ name: t.breadcrumbActual, path: RUTA }], locale),
    ],
  };

  return (
    <main className="min-h-screen bg-crema pt-28 pb-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="max-w-3xl mx-auto px-6">
        <p className="text-[10px] tracking-[3px] uppercase font-dm text-verde-selva mb-3">{t.eyebrow}</p>
        <h1 className="font-cormorant font-light text-verde-profundo mb-4" style={{ fontSize: "clamp(32px,6vw,54px)" }}>
          {t.h1Pre}<em className="text-dorado">{t.h1Em}</em>
        </h1>
        <p className="font-dm text-xs text-negro/40 mb-10">{t.ultimaActualizacion}</p>

        {/* Solo en inglés: manda el texto español. */}
        {t.avisoTraduccion && (
          <p className="font-dm text-xs text-negro/55 border border-negro/10 bg-white px-4 py-3 mb-8">
            {t.avisoTraduccion.antes}
            <Link href={t.avisoTraduccion.href} hrefLang="es" className="underline underline-offset-2 text-verde-selva hover:text-verde-vivo">
              {t.avisoTraduccion.enlace}
            </Link>
            {t.avisoTraduccion.despues}
          </p>
        )}

        <P>
          <Rico segs={t.intro} />
        </P>

        {t.secciones.map((s) => (
          <Fragment key={s.h2}>
            <H2>{s.h2}</H2>
            {s.bloques.map((b, i) =>
              "ul" in b ? (
                <ul key={i} className="mb-4">
                  {b.ul.map((li, j) => (
                    <Li key={j}>
                      <Rico segs={li} />
                    </Li>
                  ))}
                </ul>
              ) : (
                <P key={i}>
                  <Rico segs={b.p} />
                </P>
              ),
            )}
          </Fragment>
        ))}

        <p className="font-dm text-xs text-negro/40 mt-12 pt-8 border-t border-negro/10">
          {t.verTambien}{" "}
          {t.verTambienLinks.map((l, i) => (
            <Fragment key={l.href}>
              {i > 0 && " · "}
              <Link href={l.href} className="underline underline-offset-2 hover:text-negro/70">{l.label}</Link>
            </Fragment>
          ))}
        </p>
      </div>
    </main>
  );
}
