import {
  Anchor, Backpack, Binoculars, Bird, Bug, Camera, Cloud, CloudRain, Coffee,
  Compass, Droplet, Droplets, Feather, Fish, Flower2, Footprints, Leaf,
  LifeBuoy, Map, MapPin, Moon, Mountain, MountainSnow, Palmtree, Route,
  Sailboat, Shell, Ship, Snail, Sparkles, Sprout, Sun, Sunrise, Sunset,
  Telescope, Tent, TreePine, Trees, Turtle, Umbrella, Waves, Waypoints, Wind,
} from "lucide-react";

/**
 * Fondo de la zona de paquetes: iconos de lo que se visita, esparcidos.
 *
 * Las posiciones parecen al azar pero NO lo son: salen de un generador con
 * semilla fija. Con `Math.random()` el servidor y el navegador dibujarían
 * posiciones distintas y React se quejaría de que el HTML no coincide al
 * hidratar. Con semilla, las dos mitades calculan lo mismo.
 *
 * Los iconos vienen de la librería que el proyecto ya usa; ninguno está
 * dibujado a mano.
 */

/** Agua, selva, sierra, fauna, cultura cafetalera y viaje: lo que hay en la Huasteca. */
const ICONOS = [
  Waves, Droplet, Droplets, CloudRain, LifeBuoy, Sailboat, Ship, Anchor, Fish, Shell,
  Mountain, MountainSnow, TreePine, Trees, Palmtree, Leaf, Sprout, Flower2,
  Bird, Feather, Turtle, Snail, Bug,
  Coffee, Sun, Sunrise, Sunset, Moon, Cloud, Wind,
  Compass, Map, MapPin, Route, Waypoints, Tent, Backpack, Binoculars, Telescope,
  Camera, Footprints, Umbrella, Sparkles,
];

/** PRNG con semilla (mulberry32): mismo resultado en servidor y navegador. */
export function sembrado(semilla: number) {
  return () => {
    semilla |= 0;
    semilla = (semilla + 0x6d2b79f5) | 0;
    let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sembrar(total: number, cols: number) {
  const r = sembrado(20260910);
  // Rejilla con medio paso de corrimiento por fila (como ladrillos) y un
  // temblor CHICO alrededor del centro de cada celda. Antes el temblor era del
  // 80 % de la celda: dos vecinos podían caer pegados y la celda de al lado
  // quedar vacía, y el "patrón" se leía como manchas (la queja de Manolo,
  // 29 sep 2026). Con ±20 % nadie se toca y el ritmo se ve a propósito.
  const filas = Math.ceil(total / cols);
  return Array.from({ length: total }, (_, i) => {
    const cx = i % cols;
    const cy = Math.floor(i / cols);
    const corrimiento = cy % 2 === 0 ? 0 : 0.5;
    return {
      Icon: ICONOS[(cy * cols + cx * 7) % ICONOS.length],
      left: ((cx + corrimiento + 0.5 + (r() - 0.5) * 0.4) / cols) * 100,
      top: ((cy + 0.5 + (r() - 0.5) * 0.4) / filas) * 100,
      size: 24 + Math.round(r() * 14),
      rot: Math.round((r() - 0.5) * 30),
      op: 0.14 + r() * 0.08,
    };
  });
}

const PIEZAS = sembrar(300, 14);

export function PatronDestinos({
  className = "",
  color = "text-verde-profundo",
}: {
  className?: string;
  /** Clase de color de los iconos. Oscuro por defecto: el patrón vive sobre fondo claro. */
  color?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      {PIEZAS.map((p, i) => (
        <p.Icon
          key={i}
          className={`absolute ${color}`}
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: p.size,
            height: p.size,
            opacity: p.op,
            transform: `rotate(${p.rot}deg)`,
          }}
          strokeWidth={1.4}
        />
      ))}
    </div>
  );
}
