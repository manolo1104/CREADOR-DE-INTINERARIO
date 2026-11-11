import { Fragment } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { asLocale, buildAlternates, localeUrl, SITE } from "@/lib/i18n/config";
import { buildBreadcrumbNode } from "@/lib/jsonld";
import { getPrivacidad, type SegAviso } from "@/lib/i18n/privacidad.en";

/**
 * Aviso de Privacidad, en español y en inglés (/en desde el 10 nov 2026: el pie
 * del sitio inglés mandaba al español). Todo el texto vive en
 * `src/lib/i18n/privacidad.en.ts`; manda el español y el inglés lo dice arriba.
 */

const RUTA = "/aviso-de-privacidad";

// Al cambiar el aviso, cambiar también `AVISO_VERSION` de
// `src/lib/encuestas/opciones.ts`: el check-in guarda qué versión aceptó cada quien.
// Las dos fechas son la misma, escrita en cada idioma.
const FECHA = { es: "21 de octubre de 2026", en: "October 21, 2026" };

export function generateMetadata(): Metadata {
  const locale = asLocale(headers().get("x-locale"));
  const t = getPrivacidad(locale);
  return {
    title: t.metaTitle,
    description: t.metaDescription,
    // Indexable, igual que /terminos y /politica-de-cancelacion. Estaba fuera del
    // índice sin motivo declarado, y en un sitio que cobra en línea el aviso de
    // privacidad es una de las páginas que Google busca para confiar en ti.
    alternates: buildAlternates(RUTA, locale),
    robots: { index: true, follow: true },
    // No declaraba `openGraph` y heredaba el del layout, con og:url apuntando
    // al inicio (auditoría del 10 nov). Ahora lleva el suyo, con la foto.
    openGraph: {
      title: t.ogTitle,
      description: t.ogDescription,
      url: localeUrl(RUTA, locale),
      siteName: "Tours Huasteca Potosina",
      locale: locale === "en" ? "en_US" : "es_MX",
      type: "website",
      images: [{ url: `${SITE}/og-image.jpg`, width: 1200, height: 800, alt: t.ogImageAlt }],
    },
  };
}

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-cormorant font-light text-verde-profundo mt-12 mb-4" style={{ fontSize: "clamp(22px,3vw,32px)" }}>
      {children}
    </h2>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-negro/65 font-dm text-sm leading-relaxed mb-4">{children}</p>;
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2 text-negro/65 font-dm text-sm leading-relaxed mb-2">
      <span className="text-verde-selva flex-shrink-0 mt-0.5">•</span>
      <span>{children}</span>
    </li>
  );
}

/** Pinta un trozo del diccionario con las clases que siempre tuvo el aviso. */
function Rico({ segs }: { segs: SegAviso[] }) {
  return (
    <>
      {segs.map((s, i) => {
        if (typeof s === "string") return <Fragment key={i}>{s}</Fragment>;
        if ("b" in s) return <strong key={i}>{s.b}</strong>;
        if ("em" in s) return <em key={i}>{s.em}</em>;
        if ("br" in s) return <br key={i} />;
        return (
          <a
            key={i}
            href={s.href}
            className={s.hover ? "text-verde-selva underline hover:text-verde-vivo transition-colors" : "text-verde-selva underline"}
          >
            {s.a}
          </a>
        );
      })}
    </>
  );
}

export default function AvisoPrivacidadPage() {
  const locale = asLocale(headers().get("x-locale"));
  const t = getPrivacidad(locale);

  // Era una de las dos páginas indexables del sitio sin un solo dato
  // estructurado. Mismo patrón que /creditos y /terminos.
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
    <main id="main-content" className="min-h-screen bg-crema">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Hero */}
      <section className="bg-verde-profundo px-6 pt-36 pb-16 text-center">
        <p className="text-[10px] tracking-[4px] uppercase text-verde-vivo mb-4 font-dm">{t.eyebrow}</p>
        <h1 className="font-cormorant font-light text-crema mb-4" style={{ fontSize: "clamp(32px,5vw,58px)" }}>
          {t.h1}
        </h1>
        <p className="text-crema/50 font-dm text-sm">{t.actualizacionPre}{FECHA[locale]}</p>
      </section>

      {/* Contenido */}
      <article className="max-w-3xl mx-auto px-6 py-16">

        {/* Solo en inglés: manda el texto español. */}
        {t.avisoTraduccion && (
          <p className="font-dm text-xs text-negro/55 border border-negro/10 bg-white px-4 py-3 mb-4">
            {t.avisoTraduccion.antes}
            <Link href={t.avisoTraduccion.href} hrefLang="es" className="underline underline-offset-2 text-verde-selva hover:text-verde-vivo">
              {t.avisoTraduccion.enlace}
            </Link>
            {t.avisoTraduccion.despues}
          </p>
        )}

        {t.secciones.map((s) => (
          <Fragment key={s.h2}>
            <H2>{s.h2}</H2>
            {s.bloques.map((b, i) =>
              "ul" in b ? (
                <ul key={i} className={b.amplio ? "mb-6" : "mb-4"}>
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

        <div className="mt-12 pt-8 border-t border-negro/10">
          <p className="text-negro/40 font-dm text-xs">
            <Rico segs={t.notaLegal} />
          </p>
        </div>

        <div className="mt-8">
          <Link href={t.volver.href} className="text-sm tracking-[2px] uppercase text-verde-selva hover:text-verde-vivo transition-colors border-b border-verde-selva/30 pb-0.5 font-dm">
            {t.volver.label}
          </Link>
        </div>

      </article>
    </main>
  );
}
