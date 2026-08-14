import type { Metadata } from "next";
import { headers } from "next/headers";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { ItinerarioProvider } from "@/context/ItinerarioContext";
import { PublicShell } from "@/components/NavbarWrapper";
import { Analytics } from "@/components/Analytics";
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
    description: "Descubre la Huasteca Potosina: cascadas turquesas, jardines surrealistas, cañones imposibles. Planea tu viaje con IA. San Luis Potosí, México.",
    ogDescription: "Descubre la Huasteca Potosina: cascadas turquesas, jardines surrealistas, cañones imposibles. Planea tu viaje con IA.",
    twitterDescription: "Cascadas turquesas, jardines surrealistas, cañones imposibles. Planea tu viaje con IA.",
    imageAlt: "Cascadas turquesas de la Huasteca Potosina, México",
    keywords: ["Huasteca Potosina", "turismo San Luis Potosí", "cascadas México", "Xilitla", "Ciudad Valles", "Las Pozas", "Cascada de Tamul", "itinerario"],
  },
  en: {
    title: "Huasteca Potosina Tours — Waterfalls, Caves & Adventure | Mexico",
    description: "Discover the Huasteca Potosina: turquoise waterfalls, a surrealist jungle garden and impossible canyons. Guided tours from Xilitla, San Luis Potosí, Mexico.",
    ogDescription: "Turquoise waterfalls, a surrealist jungle garden and impossible canyons. Guided tours in San Luis Potosí, Mexico.",
    twitterDescription: "Turquoise waterfalls, a surrealist jungle garden and impossible canyons. Guided tours in Mexico.",
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
    twitter: {
      card: "summary_large_image",
      title: f.title,
      description: f.twitterDescription,
      images: ["/og-image.jpg"],
    },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = asLocale(headers().get("x-locale"));
  return (
    <html lang={locale} className={`${cormorant.variable} ${dmSans.variable}`}>
      <head>
        <link rel="icon" href="/favicon.ico?v=2" sizes="32x32" />
        <link rel="icon" href="/favicon.svg?v=2" type="image/svg+xml" />
        <link rel="shortcut icon" href="/favicon.ico?v=2" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=2" />
        <Analytics />
      </head>
      <body>
        <div className="fixed inset-0 -z-10 bg-negro" />
        <ItinerarioProvider>
          <Providers>
            <PublicShell>{children}</PublicShell>
          </Providers>
        </ItinerarioProvider>
      </body>
    </html>
  );
}
