import type { Metadata } from "next";
import { RecommenderShell } from "@/components/recommender/RecommenderShell";
import { SITE } from "@/lib/i18n/config";

const URL = `${SITE}/recomendar`;

export const metadata: Metadata = {
  title: "¿Qué tour es para ti? — Recomendador IA | Huasteca Potosina",
  description:
    "Responde 4 preguntas y nuestra IA encuentra el tour perfecto para tu grupo, intereses y nivel de actividad. Recomendación personalizada gratuita.",
  keywords: [
    "qué tour hacer en la huasteca potosina",
    "recomendador de tours",
    "mejor tour huasteca potosina",
    "qué visitar en la huasteca potosina",
  ],
  alternates: { canonical: URL },
  openGraph: {
    title: "¿Qué tour es para ti? — Recomendador IA",
    description:
      "Responde 4 preguntas y encuentra el tour perfecto para tu grupo en la Huasteca Potosina. Gratis.",
    url: URL,
    siteName: "Tours Huasteca Potosina",
    locale: "es_MX",
    type: "website",
    images: [{ url: `${SITE}/og-image.jpg`, width: 1200, height: 800, alt: "Recomendador de tours de la Huasteca Potosina" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "¿Qué tour es para ti? — Recomendador IA",
    description: "Responde 4 preguntas y encuentra tu tour ideal en la Huasteca Potosina.",
    images: [`${SITE}/og-image.jpg`],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: "Recomendador de tours de la Huasteca Potosina",
      url: URL,
      applicationCategory: "TravelApplication",
      operatingSystem: "Web",
      inLanguage: "es-MX",
      description:
        "Herramienta gratuita que recomienda el tour ideal de la Huasteca Potosina según grupo, intereses y nivel de actividad.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "MXN" },
      provider: { "@type": "TouristAgency", name: "Tours Huasteca Potosina", url: SITE },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Inicio", item: SITE },
        { "@type": "ListItem", position: 2, name: "Recomendador de tours", item: URL },
      ],
    },
  ],
};

export default function RecomendarPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <RecommenderShell />
    </>
  );
}
