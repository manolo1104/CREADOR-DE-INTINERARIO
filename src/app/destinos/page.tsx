import type { Metadata } from "next";
import { DESTINOS_DB } from "@/lib/destinos";
import DestinosClient from "./DestinosClient";

const SITE = "https://www.huasteca-potosina.com";

export const metadata: Metadata = {
  title: `${DESTINOS_DB.length} Destinos en la Huasteca Potosina — Cascadas, Cañones, Arte y Arqueología`,
  description: `Explora los ${DESTINOS_DB.length} destinos únicos de la Huasteca Potosina: Cascada de Tamul, Sótano de las Golondrinas, Las Pozas, Puente de Dios y más. Guía completa con horarios y precios.`,
  openGraph: {
    title: `${DESTINOS_DB.length} Destinos en la Huasteca Potosina`,
    description: `Cascadas turquesas, cañones, jardines surrealistas y arqueología en un solo destino. ${DESTINOS_DB.length} lugares para explorar en San Luis Potosí, México.`,
    url: `${SITE}/destinos`,
    siteName: "Tours Huasteca Potosina",
    locale: "es_MX",
    type: "website",
    images: [{ url: `${SITE}/og-image.jpg`, width: 1200, height: 630, alt: "Destinos Huasteca Potosina" }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${DESTINOS_DB.length} Destinos — Huasteca Potosina`,
    description: "Cascadas, cañones, jardines surrealistas y arqueología.",
    images: [`${SITE}/og-image.jpg`],
  },
  alternates: { canonical: `${SITE}/destinos` },
};

export default function DestinosPage() {
  return (
    <main className="min-h-screen">
      {/* Hero — rendered on server, no interactivity */}
      <section className="bg-gradient-to-b from-verde-profundo/80 via-verde-profundo/30 to-negro px-6 pt-32 pb-16 text-center">
        <p className="text-[10px] tracking-[4px] uppercase text-verde-vivo mb-4 font-dm">
          San Luis Potosí · México
        </p>
        <h1
          className="font-cormorant font-light text-crema mb-5"
          style={{ fontSize: "clamp(42px,7vw,80px)" }}
        >
          Explora los <em className="text-dorado">Destinos</em>
        </h1>
        <p className="text-crema/55 font-dm text-sm max-w-lg mx-auto leading-relaxed">
          {DESTINOS_DB.length} destinos únicos en la Huasteca Potosina. Cascadas, pozas, cañones,
          arte y cultura ancestral en uno de los paisajes más diversos de México.
        </p>
      </section>

      {/* Interactive filter + grid — client component */}
      <DestinosClient />
    </main>
  );
}
