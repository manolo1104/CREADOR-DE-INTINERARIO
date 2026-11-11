import { Fragment } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { CheckCircle2, AlertTriangle, XCircle, CloudRain, RefreshCw, MessageCircle } from "lucide-react";
import { waLink } from "@/lib/whatsapp";
import { asLocale, buildAlternates, localeUrl, SITE } from "@/lib/i18n/config";
import { buildBreadcrumbNode } from "@/lib/jsonld";
import { getCancelacion } from "@/lib/i18n/cancelacion.en";

/**
 * Política de cancelación y clima, en español y en inglés (/en desde el
 * 10 nov 2026: las fichas EN de los tours mandaban aquí, al español).
 *
 * Todo el texto vive en `src/lib/i18n/cancelacion.en.ts`, los dos idiomas
 * juntos. 🔴 Los recorridos que NO siguen esta política salen del catálogo
 * (`cancelacion` en `tours.ts`), nunca escritos a mano: hoy es El Edén en el
 * Jardín, que la Fundación Las Pozas no reembolsa nunca. Un reembolso que el
 * proveedor no devuelve lo paga la operadora de su bolsa.
 *
 * El idioma llega por el header `x-locale` que pone el middleware, como en
 * /preguntas-frecuentes.
 */

const RUTA = "/politica-de-cancelacion";

export function generateMetadata(): Metadata {
  const locale = asLocale(headers().get("x-locale"));
  const t = getCancelacion(locale);
  return {
    title: t.metaTitle,
    description: t.metaDescription,
    alternates: buildAlternates(RUTA, locale),
    openGraph: {
      title: t.ogTitle,
      description: t.ogDescription,
      url: localeUrl(RUTA, locale),
      siteName: "Tours Huasteca Potosina",
      // Faltaba og:locale (auditoría del 10 nov): sin él, la versión inglesa
      // se anunciaba como español al compartirse.
      locale: locale === "en" ? "en_US" : "es_MX",
      type: "website",
      // Se compartía sin foto: el layout ya no le presta la suya a `twitter`
      // y esta página no tiene `opengraph-image`. Next rellena twitter:image con
      // esta. 1200×800 es la medida REAL del archivo (no 630).
      images: [{ url: `${SITE}/og-image.jpg`, width: 1200, height: 800, alt: t.ogImageAlt }],
    },
  };
}

// Mismo orden que `escala` del diccionario: el icono y el color dependen del
// tramo, no del idioma.
const ESTILO_ESCALA = [
  { Icon: CheckCircle2, color: "text-lima border-lima/40 bg-lima/8" },
  { Icon: AlertTriangle, color: "text-dorado border-dorado/40 bg-dorado/8" },
  { Icon: RefreshCw, color: "text-agua border-agua/40 bg-agua/8" },
  { Icon: XCircle, color: "text-terracota border-terracota/40 bg-terracota/8" },
];

export default function PoliticaCancelacionPage() {
  const locale = asLocale(headers().get("x-locale"));
  const t = getCancelacion(locale);
  const url = localeUrl(RUTA, locale);

  // Llevaba las preguntas pero no las migas, que sí tienen sus dos hermanas
  // legales: sin ellas esta página no declara dónde cuelga del sitio.
  const faqSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: t.webPageName,
        description: t.webPageDescription,
        url,
        inLanguage: t.inLanguage,
        isPartOf: { "@type": "WebSite", name: "Tours Huasteca Potosina", url: SITE },
      },
      buildBreadcrumbNode([{ name: t.breadcrumbActual, path: RUTA }], locale),
      {
        "@type": "FAQPage",
        mainEntity: t.faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };

  return (
    <main className="min-h-screen bg-crema pt-28 pb-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <div className="max-w-3xl mx-auto px-6">
        <p className="text-[10px] tracking-[3px] uppercase font-dm text-verde-selva mb-3">{t.eyebrow}</p>
        <h1 className="font-cormorant font-light text-verde-profundo mb-4" style={{ fontSize: "clamp(32px,6vw,54px)" }}>
          {t.h1Pre}<em className="text-dorado">{t.h1Em}</em>
        </h1>
        {/* Solo en inglés: el texto que obliga es el español, y se dice antes
            de que nadie lea un plazo. */}
        {t.avisoTraduccion && (
          <p className="font-dm text-xs text-negro/55 border border-negro/10 bg-white px-4 py-3 mb-6">
            {t.avisoTraduccion.antes}
            <Link href={t.avisoTraduccion.href} hrefLang="es" className="underline underline-offset-2 text-verde-selva hover:text-verde-vivo">
              {t.avisoTraduccion.enlace}
            </Link>
            {t.avisoTraduccion.despues}
          </p>
        )}
        <p className="font-dm text-negro/60 text-base leading-relaxed mb-4">{t.intro}</p>
        <p className="font-dm text-negro/40 text-xs mb-12">{t.alcance}</p>

        <h2 className="font-cormorant font-light text-verde-profundo text-3xl mb-6">{t.h2SiCancelas}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-14">
          {t.escala.map(({ titulo, sub, detalle }, i) => {
            const { Icon, color } = ESTILO_ESCALA[i];
            return (
              <div key={titulo} className={`border p-5 ${color}`}>
                <Icon className="w-5 h-5 mb-3" aria-hidden="true" />
                <p className="font-dm text-sm font-medium text-negro/80 mb-1">{titulo}</p>
                <p className="font-cormorant text-lg text-verde-profundo leading-tight mb-2">{sub}</p>
                <p className="font-dm text-xs text-negro/55 leading-relaxed">{detalle}</p>
              </div>
            );
          })}
        </div>

        <h2 className="font-cormorant font-light text-verde-profundo text-3xl mb-4">{t.h2SiCancelamos}</h2>
        <div className="border border-verde-selva/30 bg-verde-selva/5 p-6 mb-14">
          <CloudRain className="w-5 h-5 text-verde-selva mb-4" aria-hidden="true" />
          <p className="font-dm text-sm text-negro/70 leading-relaxed mb-4">
            {t.siCancelamosPre}<strong className="text-verde-profundo">{t.siCancelamosStrong}</strong>{t.siCancelamosPost}
          </p>
          <ul className="space-y-2 mb-4">
            {t.opciones.map((o) => (
              <li key={o} className="font-dm text-sm text-negro/65 flex items-start gap-2">
                <span className="text-verde-vivo mt-0.5" aria-hidden="true">→</span>
                {o}
              </li>
            ))}
          </ul>
          <p className="font-dm text-xs text-negro/50 leading-relaxed">{t.decisionGuia}</p>
        </div>

        {/* La garantía de caudal, a la vista: es la promesa del banner del río. */}
        <div className="border border-agua/40 bg-agua/5 p-6 mb-14">
          <h3 className="font-cormorant font-light text-verde-profundo text-2xl mb-3">{t.garantiaTitulo}</h3>
          <p className="font-dm text-sm text-negro/70 leading-relaxed">
            {t.garantiaPre}<strong className="text-verde-profundo">{t.garantiaStrong}</strong>{t.garantiaPost}
          </p>
        </div>

        {/* La excepción, a la vista y no solo dentro de una respuesta: quien
            reserva el Edén tiene que leer ANTES de pagar que no hay reembolso. */}
        {t.excepciones.map((x) => (
          <div key={x.slug} className="border border-terracota/40 bg-terracota/8 p-6 mb-14">
            <XCircle className="w-5 h-5 text-terracota mb-3" aria-hidden="true" />
            <h2 className="font-cormorant font-light text-verde-profundo text-2xl mb-3">{x.titulo}</h2>
            <p className="font-dm text-sm text-negro/70 leading-relaxed mb-3">{x.texto}</p>
            <Link href={x.href} className="font-dm text-xs text-verde-selva underline underline-offset-2 hover:text-verde-vivo">
              {t.excepcionLink}
            </Link>
          </div>
        ))}

        <h2 className="font-cormorant font-light text-verde-profundo text-3xl mb-6">{t.h2Preguntas}</h2>
        <div className="space-y-5 mb-14">
          {t.faqs.map((f) => (
            <div key={f.q} className="border-b border-negro/10 pb-5">
              <h3 className="font-dm text-sm font-medium text-verde-profundo mb-2">{f.q}</h3>
              <p className="font-dm text-sm text-negro/60 leading-relaxed">{f.a}</p>
            </div>
          ))}
        </div>

        <div className="border border-negro/10 bg-white p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5 justify-between">
          <div>
            <p className="font-cormorant text-xl text-verde-profundo mb-1">{t.ayudaTitulo}</p>
            <p className="font-dm text-xs text-negro/55">{t.ayudaTexto}</p>
          </div>
          <a
            href={waLink(t.ayudaWhatsapp)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 inline-flex items-center gap-2 bg-verde-selva text-crema px-6 py-3 text-[10px] tracking-[2px] uppercase font-dm hover:bg-verde-vivo transition-colors"
          >
            <MessageCircle className="w-4 h-4" aria-hidden="true" />
            {t.ayudaBoton}
          </a>
        </div>

        <p className="font-dm text-xs text-negro/40 mt-8">
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
