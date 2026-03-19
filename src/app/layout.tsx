import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

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
  title: "Huasteca IA — Tu Itinerario Perfecto",
  description:
    "Planea tu viaje a la Huasteca Potosina con inteligencia artificial. Cascadas, pozas, aventura y cultura en un itinerario personalizado.",
  keywords: ["Huasteca Potosina", "itinerario", "cascadas", "Xilitla", "Ciudad Valles"],
  openGraph: {
    title: "Huasteca IA — Tu Viaje a la Medida",
    description: "Crea tu itinerario perfecto para la Huasteca Potosina con IA.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${cormorant.variable} ${dmSans.variable}`}>
      <body>
        <div className="fixed inset-0 -z-10 bg-negro" />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
