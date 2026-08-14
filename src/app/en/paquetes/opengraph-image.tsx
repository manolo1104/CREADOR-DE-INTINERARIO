import { PAQUETES_DB } from "@/lib/paquetes";
import { FONDOS, tarjetaOG, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og/tarjeta";

export const runtime = "nodejs";
export const alt = "Huasteca Potosina Packages — Tours + Hotel in Xilitla, All Inclusive";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

const noches = PAQUETES_DB.map((p) => p.noches);

export default function Image() {
  return tarjetaOG({
    fondo: FONDOS.destinos,
    eyebrow: "Xilitla · San Luis Potosí",
    titulo: `${PAQUETES_DB.length} Packages`,
    subtitulo: "Tours + hotel, all inclusive",
    pills: [
      `${Math.min(...noches)} to ${Math.max(...noches)} nights`,
      "Our own hotel in Xilitla",
      "Breakfasts included",
      "Certified guides",
    ],
    pie: { texto: "HUASTECA POTOSINA TOURS · HUASTECA-POTOSINA.COM" },
  });
}
