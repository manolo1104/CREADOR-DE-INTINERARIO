import type { Metadata } from "next";
import { headers } from "next/headers";
import { DESTINOS_DB } from "@/lib/destinos";
import DestinosClient from "./DestinosClient";
import { asLocale, localePath, buildAlternates, SITE } from "@/lib/i18n/config";
import { localizeDestino } from "@/lib/i18n/localize";

export function generateMetadata(): Metadata {
  const locale = asLocale(headers().get("x-locale"));
  const n = DESTINOS_DB.length;
  const title = locale === "en"
    ? `${n} Destinations in the Huasteca Potosina — Waterfalls, Canyons, Art & Archaeology`
    : `${n} Destinos en la Huasteca Potosina — Cascadas, Cañones, Arte y Arqueología`;
  const description = locale === "en"
    ? `Explore the ${n} unique destinations of the Huasteca Potosina: Tamul Waterfall, Cave of Swallows, Las Pozas, Puente de Dios and more. Complete guide with hours and prices.`
    : `Explora los ${n} destinos únicos de la Huasteca Potosina: Cascada de Tamul, Sótano de las Golondrinas, Las Pozas, Puente de Dios y más. Guía completa con horarios y precios.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE}${localePath("/destinos", locale)}`,
      siteName: "Tours Huasteca Potosina",
      locale: locale === "en" ? "en_US" : "es_MX",
      type: "website",
      images: [{ url: `${SITE}/og-image.jpg`, width: 1200, height: 630, alt: "Destinos Huasteca Potosina" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${SITE}/og-image.jpg`],
    },
    alternates: buildAlternates("/destinos", locale),
  };
}

export default function DestinosPage() {
  const locale = asLocale(headers().get("x-locale"));
  const n = DESTINOS_DB.length;

  const destinosListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: locale === "en" ? "Huasteca Potosina Destinations" : "Destinos Huasteca Potosina",
    url: `${SITE}${localePath("/destinos", locale)}`,
    inLanguage: locale === "en" ? "en" : "es-MX",
    numberOfItems: n,
    itemListElement: DESTINOS_DB.map((base, i) => {
      const d = localizeDestino(base, locale);
      return {
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "TouristAttraction",
          name: d.nombre,
          description: d.descripcion,
          url: `${SITE}${localePath(`/destinos/${d.slug}`, locale)}`,
          image: d.imagen_hero ? (d.imagen_hero.startsWith("http") ? d.imagen_hero : `${SITE}${d.imagen_hero}`) : undefined,
          address: { "@type": "PostalAddress", addressLocality: d.zona, addressRegion: "San Luis Potosí", addressCountry: "MX" },
        },
      };
    }),
  };

  return (
    <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(destinosListSchema) }} />
    <main className="min-h-screen">
      <section className="bg-gradient-to-b from-verde-profundo/80 via-verde-profundo/30 to-negro px-6 pt-32 pb-16 text-center">
        <p className="reveal-fade text-[10px] tracking-[4px] uppercase text-verde-vivo mb-4 font-dm">
          San Luis Potosí · {locale === "en" ? "Mexico" : "México"}
        </p>
        <h1 className="reveal-up font-cormorant font-light text-crema mb-5" style={{ fontSize: "clamp(42px,7vw,80px)" }}>
          {locale === "en" ? <>Explore the <em className="shimmer-gold">Destinations</em></> : <>Explora los <em className="shimmer-gold">Destinos</em></>}
        </h1>
        <p className="reveal-up text-crema/55 font-dm text-sm max-w-lg mx-auto leading-relaxed" style={{ animationDelay: "80ms" }}>
          {locale === "en"
            ? `${n} unique destinations in the Huasteca Potosina. Waterfalls, pools, canyons, art and ancestral culture across one of Mexico's most diverse landscapes.`
            : `${n} destinos únicos en la Huasteca Potosina. Cascadas, pozas, cañones, arte y cultura ancestral en uno de los paisajes más diversos de México.`}
        </p>
      </section>

      <DestinosClient />
    </main>
    </>
  );
}
