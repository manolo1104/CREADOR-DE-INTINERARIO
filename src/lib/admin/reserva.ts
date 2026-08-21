// Cómo se lee el tamaño de un grupo, en un solo lugar.
//
// 🔴 El bug que esto arregla: `TourBooking.adults` / `.children` se guardaban
// SUMANDO las líneas de tour. Como el mismo grupo va a todos los tours, una
// reserva de 2 personas con 5 tours quedaba grabada como 10 adultos, y así se
// pintaba en el panel. En producción hay reservas que dicen 27 personas y son 9.
//
// La verdad está en `lineItems`: cada línea trae el grupo COMPLETO para ese
// tour. El tamaño real del grupo es entonces el MÁXIMO por línea, no la suma.
// Los datos viejos no se tocan: se corrigen al leerlos.

export interface LineaTour {
  tourSlug?: string;
  tourName?: string;
  tourDate?: string;
  adults?: number;
  children?: number;       // formato viejo
  childrenMid?: number;
  childrenSmall?: number;
  subtotal?: number;
  /** Elección obligatoria del recorrido (ej. Siete Cascadas o Tamasopo). */
  eleccion?: string;
  /** Actividades opcionales contratadas. Ya vienen con su precio de catálogo. */
  addOns?: { id?: string; nombre?: string; cantidad?: number; subtotal?: number }[];
  _meta?: unknown;
}

/** Lo mínimo que necesitan estos helpers; sirve para TourBooking y TourQuote. */
export interface ConLineas {
  adults: number;
  children: number;
  tourSlug: string;
  tourName: string;
  tourDate: string;
  totalAmount: number;
  lineItems?: unknown;
}

export interface Grupo {
  adultos: number;
  ninosMid: number;    // 6–10 años
  ninosSmall: number;  // menores de 6
  ninos: number;
  total: number;
}

/** Las líneas de tour reales, sin la línea `_meta`. */
export function lineasDe(b: ConLineas): LineaTour[] {
  const raw = b.lineItems;
  if (!Array.isArray(raw)) return [];
  return raw.filter((l: any) => l && !l._meta && (l.tourSlug || l.tourName));
}

/** La línea `_meta` (método de pago, folio, pickup, numPersonas). */
export function metaDe(b: ConLineas): Record<string, any> {
  const raw = b.lineItems;
  if (!Array.isArray(raw)) return {};
  return (raw as any[]).find(l => l && l._meta) || {};
}

const ninosDe = (l: LineaTour) => (l.childrenMid ?? l.children ?? 0) + (l.childrenSmall ?? 0);

/**
 * Tamaño real del grupo. Máximo por línea, no suma.
 * Si todas las líneas van por vehículo (el RZR guarda `adults: 0`) el máximo da
 * cero: ahí sí vale el `numPersonas` que se capturó a mano.
 */
export function grupoDe(b: ConLineas): Grupo {
  const lineas = lineasDe(b);

  if (lineas.length > 0) {
    const adultos    = Math.max(0, ...lineas.map(l => l.adults ?? 0));
    const ninosMid   = Math.max(0, ...lineas.map(l => l.childrenMid ?? l.children ?? 0));
    const ninosSmall = Math.max(0, ...lineas.map(l => l.childrenSmall ?? 0));
    const total      = adultos + ninosMid + ninosSmall;
    if (total > 0) return { adultos, ninosMid, ninosSmall, ninos: ninosMid + ninosSmall, total };

    // Solo líneas por vehículo: el conteo vive en el `_meta`.
    const capturado = Number(metaDe(b).numPersonas) || 0;
    if (capturado > 0) return { adultos: capturado, ninosMid: 0, ninosSmall: 0, ninos: 0, total: capturado };
  }

  // Reserva vieja de un solo tour, sin `lineItems`: las columnas SÍ son el grupo.
  const adultos = b.adults ?? 0;
  const ninos   = b.children ?? 0;
  return { adultos, ninosMid: ninos, ninosSmall: 0, ninos, total: adultos + ninos };
}

/** "2 adultos · 3 niños" — para el PDF y la ficha de detalle. */
export function grupoLargo(g: Grupo): string {
  const partes: string[] = [];
  partes.push(`${g.adultos} ${g.adultos === 1 ? "adulto" : "adultos"}`);
  if (g.ninosMid > 0)   partes.push(`${g.ninosMid} ${g.ninosMid === 1 ? "niño" : "niños"} (6–10)`);
  if (g.ninosSmall > 0) partes.push(`${g.ninosSmall} ${g.ninosSmall === 1 ? "niño" : "niños"} (−6)`);
  return partes.join(" · ");
}

/** "2A" / "2A · 3N" — para las columnas apretadas del listado. */
export function grupoCorto(g: Grupo): string {
  return `${g.adultos}A${g.ninos > 0 ? ` · ${g.ninos}N` : ""}`;
}

/**
 * Lo que se debe GUARDAR en las columnas `adults` / `children` al crear o
 * editar. Recibe las líneas del formulario y el conteo capturado a mano.
 * Devuelve el grupo, nunca la suma por tour.
 */
export function grupoParaGuardar(
  lineas: LineaTour[],
  numPersonasCapturado?: number | string | null,
): { adults: number; children: number } {
  const capturado = Number(numPersonasCapturado) || 0;
  if (lineas.length === 0) return { adults: Math.max(1, capturado), children: 0 };

  const adultos = Math.max(0, ...lineas.map(l => l.adults ?? 0));
  const ninos   = Math.max(0, ...lineas.map(l => ninosDe(l)));
  if (adultos + ninos > 0) return { adults: adultos, children: ninos };

  return { adults: Math.max(1, capturado), children: 0 };
}
