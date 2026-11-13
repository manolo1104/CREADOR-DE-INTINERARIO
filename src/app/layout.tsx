import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { ItinerarioProvider } from "@/context/ItinerarioContext";
import { PublicShell } from "@/components/NavbarWrapper";
import { Analytics } from "@/components/Analytics";
import WhatsAppClickTracker from "@/components/WhatsAppClickTracker";
import { metadataRaiz } from "@/lib/metadataRaiz";

// La itálica se sigue precargando a propósito (7 oct 2026): la segunda línea
// del h1 del inicio («Potosina», HeroTypewriter) es Cormorant 300 itálica, a
// 64–130 px y a la vista desde el primer pintado. next/font precarga por
// llamada, no por estilo: sacarla a una declaración aparte crea OTRA familia,
// y los más de cien <em> e `italic` que viven dentro de `font-cormorant`
// saldrían en itálica falsa (la normal inclinada) sin una regla de CSS que los
// mande a ella.
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

// Sora se mudó al layout de /curso (7 oct 2026): solo la usa el funnel del
// curso, y desde aquí se precargaba en TODAS las páginas de tours.
//
// JetBrains Mono se queda aquí porque no es solo del curso: los folios y
// números de cotización del panel (/admin) van en `font-mono`. Sin la variable
// en <html>, `var(--font-mono)` queda vacía y el folio ni siquiera cae a
// monoespaciada. Va con `preload: false`: ninguna página la precarga y el
// navegador la baja solo donde hay texto que la usa (/admin y /curso).
const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-mono",
  preload: false,
});

/**
 * Metadata de respaldo: la que hereda cualquier ruta que no declare la suya.
 *
 * Estaba escrita en español aunque el locale fuera "en" —solo `openGraph.locale`
 * cambiaba—, así que una ruta inglesa sin metadata propia se anunciaba en
 * español. Le pasaba al 404: `/en/blog` servía "Descubre la Huasteca Potosina…".
 */
export const metadata: Metadata = metadataRaiz("es");

/** Pone `lang="en"` en /en antes de pintar (el HTML en caché es el mismo para los dos idiomas). */
const LANG_EN = `(function(){var p=location.pathname;if(p==="/en"||p.indexOf("/en/")===0)document.documentElement.lang="en"})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning className={`${cormorant.variable} ${dmSans.variable} ${mono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: LANG_EN }} />
        {/* Ícono «versión E» (11 nov 2026): golondrina simplificada del kit; v=3 para que el navegador suelte el viejo. */}
        <link rel="icon" href="/favicon.ico?v=3" sizes="32x32" />
        <link rel="icon" href="/favicon.svg?v=3" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=3" />
        <link rel="manifest" href="/site.webmanifest?v=3" />
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
