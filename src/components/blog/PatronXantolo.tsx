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

/**
 * La rejilla se calcula UNA vez por forma (columnas × filas): el artículo usa la
 * alta de 9 × 12 y las franjas anchas del inicio y de /paquetes (15 oct 2026),
 * una baja y ancha para que los iconos no se amontonen en vertical.
 */
type Pieza = { Icon: (typeof ICONOS)[number]; left: number; top: number; size: number; rot: number; op: number };
const rejillas = new Map<string, Pieza[]>();

function piezas(COLS: number, FILAS: number): Pieza[] {
  const clave = `${COLS}x${FILAS}`;
  const hecha = rejillas.get(clave);
  if (hecha) return hecha;
  const r = sembrado(20261101);
  const nuevas = Array.from({ length: COLS * FILAS }, (_, i) => {
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
  rejillas.set(clave, nuevas);
  return nuevas;
}

export function PatronXantolo({
  color = "#f29422",
  cols = 9,
  filas = 12,
  intensidad = 1,
}: {
  color?: string;
  cols?: number;
  filas?: number;
  /** Multiplica la opacidad de cada icono (1 = la del artículo). */
  intensidad?: number;
}) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {piezas(cols, filas).map((p, i) => (
        <p.Icon
          key={i}
          className="absolute"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: p.size,
            height: p.size,
            color,
            opacity: Math.min(0.5, p.op * intensidad),
            transform: `translate(-50%, -50%) rotate(${p.rot}deg)`,
          }}
          strokeWidth={1.4}
        />
      ))}
    </div>
  );
}
