import { FONDOS, tarjetaOG, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og/tarjeta";

// Igual que /en/nosotros: esta ruta se quedaba sin imagen de Open Graph.
export const runtime = "nodejs";
export const alt = "Huasteca Potosina Travel Guide — How to Get There and When to Go";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return tarjetaOG({
    fondo: FONDOS.practica,
    eyebrow: "Everything to know before you go",
    titulo: "Travel Guide",
    subtitulo: "Huasteca Potosina 2026",
    iconos: [
      ["✈", "Getting there"],
      ["📅", "When to go"],
      ["🏨", "Where to stay"],
      ["💰", "Budget"],
    ],
    pie: { texto: "TOURS HUASTECA POTOSINA · FREE GUIDE" },
  });
}
