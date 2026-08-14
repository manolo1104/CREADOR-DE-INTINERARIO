import { FONDOS, tarjetaOG, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og/tarjeta";

// /en/nosotros no tenía NINGUNA imagen de Open Graph: la página define
// `openGraph` sin `images`, lo que anula el respaldo del layout, y la tarjeta
// española vive en otro segmento del árbol. Compartir el enlace daba un
// recuadro vacío.
export const runtime = "nodejs";
export const alt = "About Us — NOM-09 Certified Local Guides | Huasteca Potosina Tours";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return tarjetaOG({
    fondo: FONDOS.equipo,
    eyebrow: "A family business since 2019",
    titulo: "Local Guides",
    subtitulo: "NOM-09 certified",
    cifras: [
      // "★" se rasteriza como una caja vacía en `next/og`: se escribe la cifra.
      ["4.9/5", "Google"],
      ["492", "Reviews"],
      ["6+", "Years"],
      ["0", "Incidents"],
    ],
    pie: { texto: "TOURS HUASTECA POTOSINA · XILITLA, SAN LUIS POTOSÍ" },
  });
}
