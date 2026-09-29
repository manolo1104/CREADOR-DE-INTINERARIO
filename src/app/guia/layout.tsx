import type { Metadata } from "next";
import { SITE } from "@/lib/i18n/config";
import { ORG_REF } from "@/lib/jsonld";

// Este layout le da a /guia su metadata, su canonical, su imagen para los
// previews de WhatsApp y su schema.org de producto. (Nació porque la página era
// un componente cliente; ya no lo es, pero la metadata se quedó aquí.)
//
// 🔴 28 sep 2026 — La guía pasa a ser GRATIS a cambio del correo (decisión de
// Manolo), igual que en el inicio. Aquí se vendía a $49 con un «$199» tachado
// y «sube pronto» sin fecha, mientras la portada la regalaba: el mismo producto
// con dos precios. Se entrega el mismo PDF que en el inicio
// (`/guia-huasteca-potosina.pdf`, 13 páginas, itinerario de 5 días), así que
// todo lo que se describe aquí es lo que trae ESE archivo. /guia/descarga se
// queda para quien la compró antes.
// 🔴 Sin «costos por parada»: las entradas del PDF no cuadran con `DESTINOS_DB`
// (ver page.tsx); se promete solo el gasto aproximado por día.
const URL = `${SITE}/guia`;
const OG = `${SITE}/imagenes/sotano-de-las-golondrinas/hero.jpg`;

export const metadata: Metadata = {
  title: "Guía de la Huasteca Potosina 2026 en PDF, gratis",
  description:
    "Gratis a cambio de tu correo: itinerario de 5 días por la Huasteca con horarios de luz, gasto aproximado por día, cómo llegar, dónde dormir y checklist.",
  keywords: [
    "guía huasteca potosina",
    "guía de viaje huasteca potosina pdf",
    "itinerario huasteca potosina",
    "cuánto cuesta viajar a la huasteca potosina",
    "qué hacer en la huasteca potosina",
  ],
  alternates: { canonical: URL },
  openGraph: {
    title: "Guía de la Huasteca Potosina 2026 en PDF, gratis",
    description:
      "Itinerario de 5 días con horarios de luz, gasto aproximado por día, cómo llegar, dónde dormir y checklist. Gratis a cambio de tu correo.",
    url: URL,
    siteName: "Tours Huasteca Potosina",
    locale: "es_MX",
    type: "website",
    images: [{ url: OG, width: 1200, height: 630, alt: "Guía de viaje de la Huasteca Potosina 2026" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Guía de la Huasteca Potosina 2026 en PDF, gratis",
    description: "Itinerario de 5 días, horarios de luz y checklist. Gratis a cambio de tu correo.",
    images: [OG],
  },
};

// FAQs = las MISMAS que se ven en la página (Google exige que el contenido del
// schema sea visible). Si cambian en page.tsx, actualizar aquí.
const FAQS = [
  { q: "¿Cuánto cuesta?", a: "Nada. Es gratis: solo te pedimos tu correo. Sin pago y sin tarjeta." },
  { q: "¿Cómo me llega?", a: "Al instante: escribes tu correo y la descarga empieza sola en tu celular o computadora." },
  { q: "¿En qué formato la recibo?", a: "En PDF, de 13 páginas. Lo abres en cualquier celular o computadora y lo guardas para consultarlo durante el viaje." },
  { q: "Nunca he ido a la Huasteca, ¿me sirve?", a: "Está hecha justo para eso. Te lleva de la mano desde cómo llegar y cuánto gastar hasta qué hacer cada día, con horarios y errores que debes evitar." },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Product",
      name: "Guía de la Huasteca Potosina 2026",
      description:
        "Guía de viaje de la Huasteca Potosina en PDF (13 páginas, edición 2026): itinerario de 5 días con horario de mejor luz, duración y dificultad de cada día, gasto aproximado si vas por tu cuenta, cómo llegar sin tour, mejor temporada, dónde dormir, checklist de empaque, vocabulario y comida huasteca.",
      url: URL,
      image: OG,
      category: "Guía de viaje digital",
      brand: { "@type": "Brand", name: "Tours Huasteca Potosina" },
      // Gratis: precio 0 en MXN, como se ve en la página. Sin política de
      // devolución (no hay nada que devolver) y el vendedor es LA organización
      // de todo el sitio (`ORG_REF`), no una TouristAgency suelta sin @id.
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "MXN",
        availability: "https://schema.org/InStock",
        url: URL,
        seller: ORG_REF,
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
