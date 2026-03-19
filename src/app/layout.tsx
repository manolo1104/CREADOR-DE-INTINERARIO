import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import Navbar from "@/components/nav/Navbar";

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

export const metadata: Metadata = {
  title: "Huasteca Potosina — Turismo, Cascadas & Aventura | México",
  description:
    "Descubre la Huasteca Potosina: cascadas turquesas, jardines surrealistas, cañones imposibles y la magia de San Luis Potosí. Planea tu viaje con IA.",
  keywords: [
    "Huasteca Potosina",
    "turismo San Luis Potosí",
    "cascadas México",
    "Xilitla",
    "Ciudad Valles",
    "Las Pozas",
    "Cascada de Tamul",
    "itinerario",
  ],
  openGraph: {
    title: "Huasteca Potosina — La región más extraordinaria de México",
    description:
      "Cascadas turquesas, jardines surrealistas, cañones imposibles. Planea tu viaje perfecto con IA.",
    type: "website",
    locale: "es_MX",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${cormorant.variable} ${dmSans.variable}`}>
      <body>
        <div className="fixed inset-0 -z-10 bg-negro" />
        <Navbar />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
