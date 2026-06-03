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

export function generateMetadata(): Metadata {
  const locale = asLocale(headers().get("x-locale"));
  return {
    metadataBase: new URL("https://www.huasteca-potosina.com"),
    title: "Tours Huasteca Potosina — Turismo, Cascadas & Aventura | México",
    description: "Descubre la Huasteca Potosina: cascadas turquesas, jardines surrealistas, cañones imposibles. Planea tu viaje con IA. San Luis Potosí, México.",
    keywords: ["Huasteca Potosina","turismo San Luis Potosí","cascadas México","Xilitla","Ciudad Valles","Las Pozas","Cascada de Tamul","itinerario"],
    openGraph: {
      title: "Tours Huasteca Potosina — Turismo, Cascadas & Aventura | México",
      description: "Descubre la Huasteca Potosina: cascadas turquesas, jardines surrealistas, cañones imposibles. Planea tu viaje con IA.",
      url: "https://www.huasteca-potosina.com",
      siteName: "Tours Huasteca Potosina",
      locale: locale === "en" ? "en_US" : "es_MX",
      type: "website",
      images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "Cascadas turquesas de la Huasteca Potosina, México" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Tours Huasteca Potosina — Turismo, Cascadas & Aventura | México",
      description: "Cascadas turquesas, jardines surrealistas, cañones imposibles. Planea tu viaje con IA.",
      images: ["/og-image.jpg"],
    },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = asLocale(headers().get("x-locale"));
  return (
    <html lang={locale} className={`${cormorant.variable} ${dmSans.variable}`}>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="shortcut icon" href="/favicon.svg" />
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
