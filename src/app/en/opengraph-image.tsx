import { FONDOS, tarjetaOG, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og/tarjeta";

export const runtime = "nodejs";
export const alt = "Huasteca Potosina Tours — Waterfalls, Caves & Adventure in Mexico";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return tarjetaOG({
    fondo: FONDOS.tours,
    eyebrow: "San Luis Potosí · Mexico",
    titulo: "Huasteca Potosina",
    subtitulo: "Mexico's waterfall country",
    pills: ["Turquoise waterfalls", "Surrealist garden", "Certified guides", "All inclusive"],
    estrellas: "4.9 · 492 reviews · Best Tour Operator, North America",
  });
}
