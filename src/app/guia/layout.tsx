import type { Metadata } from "next";
import { SITE } from "@/lib/i18n/config";

// `guia/page.tsx` es un componente cliente ("use client") y por eso no puede
// exportar `metadata`. Este layout le da a /guia su metadata, su canonical, su
// imagen para los previews de WhatsApp y su schema.org de producto.
const URL = `${SITE}/guia`;
const OG = `${SITE}/imagenes/sotano-de-las-golondrinas/hero.jpg`;

export const metadata: Metadata = {
  title: "Guía de la Huasteca Potosina 2026 — PDF Descargable | $49 MXN",
  description:
    "La guía que un amigo local te daría: 8 destinos con precios y horarios reales, 3 itinerarios probados (3, 5 y 7 días), presupuesto, cómo llegar y checklist. Edición 2026.",
  keywords: [
    "guía huasteca potosina",
    "guía de viaje huasteca potosina pdf",
    "itinerario huasteca potosina",
    "cuánto cuesta viajar a la huasteca potosina",
    "qué hacer en la huasteca potosina",
  ],
  alternates: { canonical: URL },
  openGraph: {
    title: "Guía de la Huasteca Potosina 2026 — La guía que sí funciona",
    description:
      "8 destinos con horarios y precios reales, 3 itinerarios probados, presupuesto y checklist. Edición 2026.",
    url: URL,
    siteName: "Tours Huasteca Potosina",
    locale: "es_MX",
    type: "website",
    images: [{ url: OG, width: 1200, height: 630, alt: "Guía de viaje de la Huasteca Potosina 2026" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Guía de la Huasteca Potosina 2026",
    description: "8 destinos, 3 itinerarios probados, presupuesto y checklist. Edición 2026.",
    images: [OG],
  },
};

// FAQs = las MISMAS que se ven en la página (Google exige que el contenido del
// schema sea visible). Si cambian en page.tsx, actualizar aquí.
const FAQS = [
  { q: "¿En qué formato la recibo?", a: "Es un documento digital que abres en cualquier celular o computadora. Para guardarlo como PDF usa Ctrl/Cmd + P → Guardar como PDF." },
  { q: "¿Cómo me llega después de pagar?", a: "Al instante: la descargas en la pantalla de confirmación y además te enviamos el enlace de descarga a tu correo para que la tengas siempre." },
  { q: "Nunca he ido a la Huasteca, ¿me sirve?", a: "Está hecha justo para eso. Te lleva de la mano desde cómo llegar y cuánto gastar hasta qué hacer cada día, con horarios y errores que debes evitar." },
  { q: "¿Tiene garantía?", a: "Sí, 7 días. Si no te sirve, escríbenos y te devolvemos tu dinero, sin preguntas." },
  { q: "¿Está actualizada?", a: "Es la edición 2026, con precios, horarios y contactos vigentes." },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Product",
      name: "Guía de la Huasteca Potosina 2026",
      description:
        "Guía de viaje digital de la Huasteca Potosina: 8 destinos con precios y horarios reales, 3 itinerarios (3, 5 y 7 días), presupuesto por tipo de viajero, cómo llegar desde CDMX, Monterrey, Guadalajara y Tampico, checklist de empaque y contactos por municipio.",
      url: URL,
      image: OG,
      category: "Guía de viaje digital",
      brand: { "@type": "Brand", name: "Tours Huasteca Potosina" },
      offers: {
        "@type": "Offer",
        price: "49",
        priceCurrency: "MXN",
        availability: "https://schema.org/InStock",
        url: URL,
        seller: { "@type": "TouristAgency", name: "Tours Huasteca Potosina", url: SITE },
        hasMerchantReturnPolicy: {
          "@type": "MerchantReturnPolicy",
          applicableCountry: "MX",
          returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
          merchantReturnDays: 7,
          returnMethod: "https://schema.org/ReturnByMail",
          returnFees: "https://schema.org/FreeReturn",
        },
      },
    },
    {
      "@type": "FAQPage",
      inLanguage: "es-MX",
      mainEntity: FAQS.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Inicio", item: SITE },
        { "@type": "ListItem", position: 2, name: "Guía de la Huasteca Potosina", item: URL },
      ],
    },
  ],
};

export default function GuiaLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {children}
    </>
  );
}
