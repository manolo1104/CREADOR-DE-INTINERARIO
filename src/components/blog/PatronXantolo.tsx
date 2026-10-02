import {
  Flower2, Flower, Flame, Skull, Drama, Music, Guitar, Moon, MoonStar,
  Sparkles, Star, Church, Coffee, Croissant, Candy, Leaf,
} from "lucide-react";
import { sembrado } from "@/components/PatronDestinos";

/**
 * Fondo de los bloques de Xantolo del artículo: iconos de temporada esparcidos
 * (pedido de Manolo, 2 oct 2026: «iconos de temporada de fondo, un patrón
 * aleatorio»).
 *
 * Mismo método que `PatronDestinos`: parece al azar pero sale de un generador
 * con semilla, porque con `Math.random()` el servidor y el navegador dibujarían
 * posiciones distintas y la hidratación truena. Rejilla tipo ladrillo con un
 * temblor chico para que nadie se toque (la queja del 29 sep con el de
 * destinos) y vecinos sin repetir icono.
 *
 * Los iconos son de la librería del proyecto. Sin fantasmas ni calabazas: eso
 * es Halloween, no Xantolo. Va muy tenue para que el texto se siga leyendo.
 */

/** Cempasúchil, velas, calaveras, máscaras de comparsa, huapango, noche, procesión, atole, pan, dulces y la hoja del tamal. */
const ICONOS = [
  Flower2, Flame, Skull, Drama, Music, Moon, Church, Coffee,
  Flower, Sparkles, Croissant, Guitar, MoonStar, Candy, Leaf, Star,
];

const COLS = 9;
const FILAS = 12;

const PIEZAS = (() => {
  const r = sembrado(20261101);
  return Array.from({ length: COLS * FILAS }, (_, i) => {
    const cx = i % COLS;
    const cy = Math.floor(i / COLS);
    const corrimiento = cy % 2 === 0 ? 0 : 0.5;
    return {
      // Paso de 5 en una lista de 16 (primos entre sí): ningún vecino de fila
      // ni de columna repite icono.
      Icon: ICONOS[(cx * 5 + cy * 3) % ICONOS.length],
      left: ((cx + corrimiento + 0.5 + (r() - 0.5) * 0.4) / COLS) * 100,
      top: ((cy + 0.5 + (r() - 0.5) * 0.4) / FILAS) * 100,
      size: 18 + Math.round(r() * 12),
      rot: Math.round((r() - 0.5) * 36),
      op: 0.07 + r() * 0.07,
    };
  });
})();

export function PatronXantolo({ color = "#f29422" }: { color?: string }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {PIEZAS.map((p, i) => (
        <p.Icon
          key={i}
          className="absolute"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: p.size,
            height: p.size,
            color,
            opacity: p.op,
            transform: `translate(-50%, -50%) rotate(${p.rot}deg)`,
          }}
          strokeWidth={1.4}
        />
      ))}
    </div>
  );
}
