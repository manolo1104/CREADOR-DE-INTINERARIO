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
function sembrado(semilla: number) {
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
  // Rejilla suelta: se reparte por celdas y se desordena dentro de cada una,
  // así no se apelotonan ni dejan un cuadrante vacío.
  const filas = Math.ceil(total / cols);
  return Array.from({ length: total }, (_, i) => {
    const cx = i % cols;
    const cy = Math.floor(i / cols);
    return {
      Icon: ICONOS[Math.floor(r() * ICONOS.length)],
      left: ((cx + 0.1 + r() * 0.8) / cols) * 100,
      top: ((cy + 0.1 + r() * 0.8) / filas) * 100,
      size: 22 + Math.round(r() * 32),
      rot: Math.round((r() - 0.5) * 50),
      op: 0.17 + r() * 0.15,
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
