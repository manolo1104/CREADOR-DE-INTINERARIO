import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { asLocale, buildAlternates, localePath, localeUrl, SITE } from "@/lib/i18n/config";
import { buildBreadcrumbNode } from "@/lib/jsonld";
import { getCreditos } from "@/lib/i18n/creditos.en";

/**
 * Créditos de fotografía, en español y en inglés (/en desde el 10 nov 2026).
 * El texto que rodea la lista vive en `src/lib/i18n/creditos.en.ts`.
 */

const RUTA = "/creditos";

export function generateMetadata(): Metadata {
  const locale = asLocale(headers().get("x-locale"));
  const t = getCreditos(locale);
  return {
    title: t.metaTitle,
    description: t.metaDescription,
    alternates: buildAlternates(RUTA, locale),
    robots: { index: true, follow: true },
    // No declaraba `openGraph` y heredaba el del layout: og:url al inicio (no
    // al canonical), og:title genérico del sitio (auditoría del 10 nov).
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

// Fotos de Wikimedia Commons con licencia CC que EXIGEN atribución.
// Mantener en sync con las imágenes de public/imagenes/<destino>/.
// El autor y la licencia no se traducen (tienen que coincidir con Commons);
// solo el nombre del lugar, y la licencia CC0 que traía "dominio público".
const CREDITOS_CC: {
  destino: string;
  destinoEn: string;
  slug: string;
  autor: string;
  licencia: string;
  licenciaEn?: string;
  licenciaUrl: string;
}[] = [
  { destino: "Aquismón Pueblo Mágico (Parroquia de San Miguel Arcángel)", destinoEn: "Aquismón, Pueblo Mágico (San Miguel Arcángel Parish Church)", slug: "aquismon-pueblo-magico", autor: "Patricia Alzuarte Díaz", licencia: "CC BY-SA 3.0", licenciaUrl: "https://creativecommons.org/licenses/by-sa/3.0/" },
  { destino: "Zona Arqueológica Tamohí / El Consuelo", destinoEn: "Tamohí / El Consuelo Archaeological Site", slug: "zona-arqueologica-tamohi-el-consuelo", autor: "Ricardosanluis", licencia: "CC BY-SA 3.0", licenciaUrl: "https://creativecommons.org/licenses/by-sa/3.0/" },
  { destino: "Templo de San Juan Bautista (Coxcatlán)", destinoEn: "Church of San Juan Bautista (Coxcatlán)", slug: "templo-san-juan-bautista-coxcatlan", autor: "Patricia Alzuarte Díaz", licencia: "CC BY-SA 3.0", licenciaUrl: "https://creativecommons.org/licenses/by-sa/3.0/" },
  { destino: "Sótano de las Huahuas", destinoEn: "Sótano de las Huahuas", slug: "sotano-de-las-huahuas", autor: "panza.rayada (Panoramio)", licencia: "CC BY-SA 3.0", licenciaUrl: "https://creativecommons.org/licenses/by-sa/3.0/" },
  { destino: "Río Tampaón", destinoEn: "Tampaón River", slug: "rio-tampaon-rafting", autor: "Comisión Mexicana de Filmaciones (F. Uriegas)", licencia: "CC BY-SA 2.0", licenciaUrl: "https://creativecommons.org/licenses/by-sa/2.0/" },
  { destino: "Cascada El Trampolín (Tamasopo)", destinoEn: "El Trampolín Waterfall (Tamasopo)", slug: "cascada-el-trampolin-tamasopo", autor: "Juan Carlos Fonseca Mata", licencia: "CC BY-SA 4.0", licenciaUrl: "https://creativecommons.org/licenses/by-sa/4.0/" },
  { destino: "Cascada Los Comales (imagen representativa)", destinoEn: "Los Comales Waterfall (representative image)", slug: "cascada-los-comales", autor: "Pintsmasher", licencia: "CC BY 3.0", licenciaUrl: "https://creativecommons.org/licenses/by/3.0/" },
  { destino: "Tancanhuitz (imagen representativa)", destinoEn: "Tancanhuitz (representative image)", slug: "tancanhuitz", autor: "Diego Delso", licencia: "CC BY-SA", licenciaUrl: "https://creativecommons.org/licenses/by-sa/4.0/" },
  { destino: "San Martín Chalchicuautla (imagen representativa)", destinoEn: "San Martín Chalchicuautla (representative image)", slug: "san-martin-chalchicuautla", autor: "Zahira Arias", licencia: "CC BY-SA 4.0", licenciaUrl: "https://creativecommons.org/licenses/by-sa/4.0/" },
  { destino: "San Vicente Tancuayalab (imagen representativa)", destinoEn: "San Vicente Tancuayalab (representative image)", slug: "san-vicente-tancuayalab", autor: "Oscaraleman2018", licencia: "CC BY-SA 4.0", licenciaUrl: "https://creativecommons.org/licenses/by-sa/4.0/" },
  { destino: "Tanlajás (imagen representativa)", destinoEn: "Tanlajás (representative image)", slug: "tanlajas", autor: "AlejandroLinaresGarcia", licencia: "CC BY-SA 4.0", licenciaUrl: "https://creativecommons.org/licenses/by-sa/4.0/" },
  { destino: "Texquitote (imagen representativa)", destinoEn: "Texquitote (representative image)", slug: "texquitote", autor: "Wikimedia Commons", licencia: "CC0 (dominio público)", licenciaEn: "CC0 (public domain)", licenciaUrl: "https://creativecommons.org/publicdomain/zero/1.0/" },
];

export default function CreditosPage() {
  const locale = asLocale(headers().get("x-locale"));
  const t = getCreditos(locale);
  const en = locale === "en";

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
      buildBreadcrumbNode([{ name: t.breadcrumbSchema, path: RUTA }], locale),
    ],
  };

  return (
    <main id="main-content" className="min-h-screen bg-negro pt-28 pb-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="max-w-3xl mx-auto px-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-[9px] tracking-[3px] uppercase font-dm text-crema/30 mb-8">
          <Link href={localePath("/", locale)} className="hover:text-crema/60 transition-colors">{t.breadcrumbHome}</Link>
          <span>/</span>
          <span className="text-verde-vivo/70">{t.breadcrumbActual}</span>
        </nav>

        <p className="text-[10px] tracking-[4px] uppercase text-verde-vivo font-dm mb-4">{t.eyebrow}</p>
        <h1 className="font-cormorant font-light text-crema leading-tight mb-6" style={{ fontSize: "clamp(34px,5vw,56px)" }}>
          {t.h1}
        </h1>
        <p className="text-crema/60 font-dm text-base leading-relaxed mb-6 max-w-2xl">
          {t.introPre}
          <Link href={t.introHref} className="text-verde-vivo hover:text-lima transition-colors">{t.introLink}</Link>
          {t.introPost}
        </p>
        <p className="text-crema/40 font-dm text-sm leading-relaxed mb-14 max-w-2xl">{t.nota}</p>

        <div className="divide-y divide-white/8 border-t border-white/8">
          {CREDITOS_CC.map((c) => (
            <div key={c.slug} className="py-5 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 sm:gap-6">
              <div>
                <p className="font-dm text-crema/85 text-sm md:text-[15px]">{en ? c.destinoEn : c.destino}</p>
                <p className="font-dm text-crema/45 text-xs mt-0.5">{t.fotoPre}{c.autor}</p>
              </div>
              <a
                href={c.licenciaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 font-dm text-xs text-verde-vivo/80 hover:text-lima transition-colors"
              >
                {en ? (c.licenciaEn ?? c.licencia) : c.licencia}
              </a>
            </div>
          ))}
        </div>

        <p className="text-crema/35 font-dm text-xs leading-relaxed mt-12 max-w-2xl">{t.contacto}</p>
      </div>
    </main>
  );
}
