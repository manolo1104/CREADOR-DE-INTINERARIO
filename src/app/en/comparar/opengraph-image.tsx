import { FONDOS, tarjetaOG, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og/tarjeta";

// La versión en inglés: el segmento español no se hereda bajo /en, y sin
// esta tarjeta /en/comparar se compartiría con un recuadro en español.
export const runtime = "nodejs";
export const alt = "Compare Huasteca Potosina tours and packages side by side";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return tarjetaOG({
    fondo: FONDOS.tours,
    eyebrow: "Huasteca Potosina",
    titulo: "Compare tours",
    subtitulo: "side by side",
    pills: ["Price for your group", "Duration", "What's included", "What you'll see"],
  });
}
