import { FONDOS, tarjetaOG, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og/tarjeta";

// La tarjeta que sale al mandar una comparación por WhatsApp. Sin emojis ni
// símbolos raros: `next/og` no los trae en su fuente y un emoji aquí tumba el
// build entero ("fetch failed"). `runtime` va literal: Next lo lee del código.
export const runtime = "nodejs";
export const alt = "Compara recorridos y paquetes de la Huasteca Potosina lado a lado";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return tarjetaOG({
    fondo: FONDOS.tours,
    eyebrow: "Huasteca Potosina",
    titulo: "Compara recorridos",
    subtitulo: "lado a lado",
    pills: ["Precio para tu grupo", "Duración", "Qué incluye", "Qué visitas"],
  });
}
