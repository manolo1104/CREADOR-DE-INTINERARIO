import type { Metadata } from "next";
import type { Locale } from "@/lib/i18n/config";

// El respaldo de metadata de TODO el sitio (título, descripción, Open Graph),
// sacado de `src/app/layout.tsx` el 13 nov 2026 para que el layout no lea la
// petición (ISR). El inglés lo pone `src/app/en/layout.tsx`.

const FALLBACK = {
  es: {
    title: "Tours Huasteca Potosina — Turismo, Cascadas & Aventura | México",
    // Sin "Planea tu viaje con IA": /planear está en noindex mientras el
    // generador devuelva 503, y el respaldo lo prometía en cada página que lo
    // heredaba. Ahora dice lo mismo que el inglés.
    description: "Descubre la Huasteca Potosina: cascadas turquesas, jardines surrealistas y cañones imposibles. Tours guiados desde Xilitla, San Luis Potosí, México.",
    ogDescription: "Cascadas turquesas, jardines surrealistas y cañones imposibles. Tours guiados en San Luis Potosí, México.",
    imageAlt: "Cascadas turquesas de la Huasteca Potosina, México",
    keywords: ["Huasteca Potosina", "turismo San Luis Potosí", "cascadas México", "Xilitla", "Ciudad Valles", "Las Pozas", "Cascada de Tamul", "itinerario"],
  },
  en: {
    title: "Huasteca Potosina Tours — Waterfalls, Caves & Adventure | Mexico",
    description: "Discover the Huasteca Potosina: turquoise waterfalls, a surrealist jungle garden and impossible canyons. Guided tours from Xilitla, San Luis Potosí, Mexico.",
    ogDescription: "Turquoise waterfalls, a surrealist jungle garden and impossible canyons. Guided tours in San Luis Potosí, Mexico.",
    imageAlt: "Turquoise waterfalls of the Huasteca Potosina, Mexico",
    keywords: ["Huasteca Potosina", "Mexico waterfalls", "Xilitla", "Las Pozas Edward James", "Tamul waterfall", "San Luis Potosi tours", "Mexico adventure travel"],
  },
} as const;

/**
 * 🔴 13 nov 2026 (ISR): el layout ya NO lee la petición. Leer `x-locale` aquí
 * volvía dinámicas TODAS las páginas del sitio y ninguna se podía guardar en
 * caché. Este respaldo es el español; `src/app/en/layout.tsx` pone el inglés
 * para todo /en (las páginas declaran el suyo de todos modos).
 */
export function metadataRaiz(locale: Locale): Metadata {
  const f = FALLBACK[locale];
  return {
    metadataBase: new URL("https://www.huasteca-potosina.com"),
    title: f.title,
    description: f.description,
    keywords: [...f.keywords],
    openGraph: {
      title: f.title,
      description: f.ogDescription,
      url: "https://www.huasteca-potosina.com",
      siteName: "Tours Huasteca Potosina",
      locale: locale === "en" ? "en_US" : "es_MX",
      type: "website",
      images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: f.imageAlt }],
    },
    // Solo el tipo de tarjeta. Con título, descripción e imagen fijos aquí,
    // toda página que no declarara su propio `twitter` (los 82 destinos,
    // /paquetes, /reservar, /desde/*…) salía en X con los genéricos del sitio
    // en vez de los suyos. Sin ellos, Next rellena cada página con SU og:title,
    // og:description y og:image (resolve-metadata.js, postProcessMetadata).
    // 🔴 No devolver `images` aquí: Next ve un twitter con imágenes heredado y
    // deja de rellenar desde el og en TODO el sitio. La otra cara: una página
    // que declara su propio `openGraph` SIN `images` reemplaza el de aquí
    // entero y sale sin og:image ni twitter:image; se arregla poniendo
    // `images` en el openGraph de esa página (/contacto, /terminos…).
    twitter: { card: "summary_large_image" },
  };
}

