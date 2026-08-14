import { TOURS_DB } from "@/lib/tours";
import { FONDOS, tarjetaOG, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og/tarjeta";

// Se pasa a la tarjeta compartida (`src/lib/og/tarjeta.tsx`). De paso desaparecen
// las cinco cajitas vacías que salían donde debían ir las estrellas y los dos
// rombos "✦" del renglón superior: `next/og` no tiene esos caracteres en su
// fuente, así que en producción se veían como tofu. Ahora las estrellas se dibujan.
export const runtime = "nodejs";
export const alt = "Tours Guiados Huasteca Potosina — Transporte, Desayuno & Guía Certificado";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return tarjetaOG({
    fondo: FONDOS.tours,
    eyebrow: "San Luis Potosí · México",
    titulo: `${TOURS_DB.length} Tours Guiados`,
    subtitulo: "Huasteca Potosina",
    pills: ["Transporte incluido", "Desayuno típico", "Guías NOM-09", "Máx. 12 personas"],
    estrellas: "4.9 · 492 reseñas · Mejor Tour Operador Norteamérica",
  });
}
