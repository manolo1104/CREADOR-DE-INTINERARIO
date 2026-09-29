import type { Metadata } from "next";
import { headers } from "next/headers";
import { Cormorant_Garamond, DM_Sans, JetBrains_Mono, Sora } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { ItinerarioProvider } from "@/context/ItinerarioContext";
import { PublicShell } from "@/components/NavbarWrapper";
import { Analytics } from "@/components/Analytics";
import WhatsAppClickTracker from "@/components/WhatsAppClickTracker";
import { asLocale } from "@/lib/i18n/config";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500"],
  variable: "--font-dm-sans",
});

// Sólo las usa el funnel del curso (/curso): ahí la piel es negra y técnica,
// no la de la marca de tours. Se cargan aquí porque next/font vive en el
// layout raíz, pero ninguna página de tours las referencia.
const sora = Sora({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
  variable: "--font-sora",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-mono",
});

/**
 * Metadata de respaldo: la que hereda cualquier ruta que no declare la suya.
 *
 * Estaba escrita en español aunque el locale fuera "en" —solo `openGraph.locale`
 * cambiaba—, así que una ruta inglesa sin metadata propia se anunciaba en
 * español. Le pasaba al 404: `/en/blog` servía "Descubre la Huasteca Potosina…".
 */
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

export function generateMetadata(): Metadata {
  const locale = asLocale(headers().get("x-locale"));
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = asLocale(headers().get("x-locale"));
  return (
    <html lang={locale} className={`${cormorant.variable} ${dmSans.variable} ${sora.variable} ${mono.variable}`}>
      <head>
        <link rel="icon" href="/favicon.ico?v=2" sizes="32x32" />
        <link rel="icon" href="/favicon.svg?v=2" type="image/svg+xml" />
        <link rel="shortcut icon" href="/favicon.ico?v=2" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=2" />
        <Analytics />
      </head>
      <body>
        <div className="fixed inset-0 -z-10 bg-negro" />
        {/* Cuenta los clics a WhatsApp de TODO el sitio desde un solo lugar:
            un enlace nuevo queda medido sin que nadie se acuerde de hacerlo. */}
        <WhatsAppClickTracker />
        <ItinerarioProvider>
          <Providers>
            <PublicShell>{children}</PublicShell>
          </Providers>
        </ItinerarioProvider>
      </body>
    </html>
  );
}
