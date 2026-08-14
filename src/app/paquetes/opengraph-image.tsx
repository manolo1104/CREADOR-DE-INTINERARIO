import { PAQUETES_DB } from "@/lib/paquetes";
import { FONDOS, tarjetaOG, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og/tarjeta";

// La única sección de catálogo que no tenía tarjeta propia: al compartir
// /paquetes salía el `og-image.jpg` genérico del sitio.
export const runtime = "nodejs";
export const alt = "Paquetes Huasteca Potosina — Tours + Hotel en Xilitla, Todo Incluido";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

const noches = PAQUETES_DB.map((p) => p.noches);

export default function Image() {
  return tarjetaOG({
    fondo: FONDOS.destinos,
    eyebrow: "Xilitla · San Luis Potosí",
    titulo: `${PAQUETES_DB.length} Paquetes`,
    subtitulo: "Tours + hotel, todo incluido",
    pills: [
      `${Math.min(...noches)} a ${Math.max(...noches)} noches`,
      "Hotel propio en Xilitla",
      "Desayunos incluidos",
      "Guías NOM-09",
    ],
    pie: { texto: "TOURS HUASTECA POTOSINA · HUASTECA-POTOSINA.COM" },
  });
}
