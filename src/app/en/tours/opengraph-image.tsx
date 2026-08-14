import { TOURS_DB } from "@/lib/tours";
import { FONDOS, tarjetaOG, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og/tarjeta";

// Este archivo reexportaba la tarjeta española, así que quien compartía
// /en/tours en Twitter o WhatsApp veía un recuadro que decía "Transporte
// incluido · Desayuno típico · Guías NOM-09". Ahora tiene la suya.
export const runtime = "nodejs";
export const alt = "Guided Tours in the Huasteca Potosina — Transport, Breakfast & Certified Guide";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return tarjetaOG({
    fondo: FONDOS.tours,
    eyebrow: "San Luis Potosí · Mexico",
    titulo: `${TOURS_DB.length} Guided Tours`,
    subtitulo: "Huasteca Potosina",
    pills: ["Transport included", "Breakfast included", "Certified guides", "Max. 12 people"],
    estrellas: "4.9 · 492 reviews · Best Tour Operator, North America",
  });
}
