import { DESTINOS_DB } from "@/lib/destinos";
import { FONDOS, tarjetaOG, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og/tarjeta";

export const runtime = "nodejs";
export const alt = `${DESTINOS_DB.length} Destinations — Waterfalls, Canyons & Art | Huasteca Potosina`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return tarjetaOG({
    fondo: FONDOS.destinos,
    eyebrow: "San Luis Potosí · Mexico",
    titulo: `${DESTINOS_DB.length} Destinations`,
    subtitulo: "Huasteca Potosina",
    pills: ["Turquoise waterfalls", "Karst canyons", "Surrealist gardens", "Archaeology"],
    pie: { texto: "HUASTECA-POTOSINA.COM" },
  });
}
