import { FONDOS, tarjetaOG, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og/tarjeta";

// Pasa a la tarjeta compartida. El "4.9★" salía como "4.9☐": `next/og` no tiene
// la estrella en su fuente. Se escribe "4.9/5", que sí se lee.
export const runtime = "nodejs";
export const alt = "Quiénes Somos — Guías Locales Certificados NOM-09 | Tours Huasteca Potosina";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return tarjetaOG({
    fondo: FONDOS.equipo,
    eyebrow: "Empresa familiar desde 2019",
    titulo: "Guías Locales",
    subtitulo: "Certificados NOM-09",
    cifras: [
      ["4.9/5", "Google"],
      ["492", "Reseñas"],
      ["6+", "Años"],
      ["0", "Incidentes"],
    ],
    pie: { texto: "TOURS HUASTECA POTOSINA · XILITLA, SAN LUIS POTOSÍ" },
  });
}
