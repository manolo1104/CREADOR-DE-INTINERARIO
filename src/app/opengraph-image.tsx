import { FONDOS, tarjetaOG, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og/tarjeta";

// La home nunca tuvo tarjeta propia: al compartirla salía el `og-image.jpg`
// genérico, una foto sin texto. Ahora la portada dice de qué va el sitio.
export const runtime = "nodejs";
export const alt = "Tours Huasteca Potosina — Cascadas, Cuevas & Aventura | México";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return tarjetaOG({
    fondo: FONDOS.tours,
    eyebrow: "San Luis Potosí · México",
    titulo: "Huasteca Potosina",
    subtitulo: "Cascadas, sótanos y selva",
    pills: ["Cascadas turquesas", "Jardín surrealista", "Guías NOM-09", "Todo incluido"],
    estrellas: "4.9 · 492 reseñas · Mejor Tour Operador Norteamérica",
  });
}
