import { DESTINOS_DB } from "./destinos";

export interface DestinoEnMapa {
  nombre: string;
  slug: string;
  lat: number;
  lng: number;
  dia: number;
  orden: number;
  imagen_hero: string;
}

function normalizar(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function extraerDestinosDelItinerario(itinerary: string): DestinoEnMapa[] {
  const resultado: DestinoEnMapa[] = [];
  const lineas = itinerary.split("\n");

  let diaActual = 0;
  let ordenEnDia = 0;
  // Track combos of dia+slug to deduplicate
  const vistos = new Set<string>();

  for (const linea of lineas) {
    // Detect day headers: "Día 1", "DÍA 2", "Day 3", "## Día 1", etc.
    const matchDia = linea.match(/d[íi]a\s+(\d+)/i) ?? linea.match(/day\s+(\d+)/i);
    if (matchDia) {
      diaActual = parseInt(matchDia[1], 10);
      ordenEnDia = 0;
      continue;
    }

    if (diaActual === 0) continue;

    const lineaNorm = normalizar(linea);

    for (const d of DESTINOS_DB) {
      const key = `${diaActual}-${d.slug}`;
      if (vistos.has(key)) continue;

      const nombreNorm = normalizar(d.nombre);
      const slugNorm = normalizar(d.slug).replace(/-/g, " ");

      if (lineaNorm.includes(nombreNorm) || lineaNorm.includes(slugNorm)) {
        ordenEnDia += 1;
        resultado.push({
          nombre: d.nombre,
          slug: d.slug,
          lat: d.lat,
          lng: d.lng,
          dia: diaActual,
          orden: ordenEnDia,
          imagen_hero: d.imagen_hero,
        });
        vistos.add(key);
      }
    }
  }

  return resultado;
}
