/**
 * Catálogo de habitaciones del Hotel Paraíso Encantado.
 *
 * Copiado del sistema de reservas del propio hotel (`~/Desktop/mi-hotel`,
 * `lib/booking.ts` → `BOOKING_ROOMS`), que es donde el hotel cobra de verdad.
 * Antes esto vivía como dos tablas de tarifas —"estándar" y "montaña"— que
 * aproximaban el precio de todas las habitaciones por igual. Eso funcionaba
 * mientras solo se ofrecían cuatro; con nueve deja de ser cierto.
 *
 * ⚠️ DIFERENCIA CON LO QUE DIJO MANOLO (11 ago 2026): él dio la Jungla a
 * $1,900 / $2,400. El sistema del hotel la cobra a $2,000 / $2,500. Aquí se usa
 * la del hotel para no cobrar de menos. Si la buena es la otra, se cambia solo
 * este archivo.
 *
 * `tarifas` es el precio de la habitación COMPLETA por noche según cuánta gente
 * duerma en ella, no un precio por persona.
 */

export interface Habitacion {
  id:          string;
  nombre:      string;
  descripcion: string;
  categoria:   string;
  /** Texto de la vista, para agrupar y para que el cliente sepa qué compra. */
  vista:       string;
  vistaMontana: boolean;
  maxHuespedes: number;
  /** Precio de la habitación por noche, por número de huéspedes. */
  tarifas:     Record<number, number>;
  caracteristicas: string[];
  imagen:      string;
}

/**
 * Lo que ofrece el hotel, para que el cliente sepa qué está comprando.
 *
 * Vive aquí y no en una pantalla concreta: lo enseñan el carrito y el checkout
 * de paquetes, y dos listas separadas acaban diciendo cosas distintas del mismo
 * hotel.
 */
export const SERVICIOS_HOTEL = [
  "Estacionamiento",
  "Alberca",
  "WiFi",
  "Aire acondicionado",
  "Restaurante",
  "A 7 min del centro de Xilitla",
] as const;

const IMG = "/imagenes/hotel-paraiso-encantado/habitaciones";

export const HABITACIONES_HOTEL: Habitacion[] = [
  {
    id: "orquideas-2",
    nombre: "Orquídeas 2",
    descripcion: "Confort superior en cama King Size con perspectiva elevada de la selva.",
    categoria: "Suite King",
    vista: "Selva / jardín",
    vistaMontana: false,
    maxHuespedes: 2,
    tarifas: { 1: 1500, 2: 1500 },
    caracteristicas: ["1 cama King Size", "Baño completo", "WiFi", "Aire acondicionado", "28 m²"],
    imagen: `${IMG}/orquideas-2.jpg`,
  },
  {
    id: "lirios-1",
    nombre: "Lirios 1",
    descripcion: "Desconexión total y descanso reparador en un espacio abrazado por la vegetación.",
    categoria: "Suite doble",
    vista: "Selva / jardín",
    vistaMontana: false,
    maxHuespedes: 4,
    tarifas: { 1: 1500, 2: 1500, 3: 1900, 4: 1900 },
    caracteristicas: ["2 camas matrimoniales", "Baño completo", "WiFi", "Aire acondicionado", "30 m²"],
    imagen: `${IMG}/lirios-1.jpg`,
  },
  {
    id: "lirios-2",
    nombre: "Lirios 2",
    descripcion: "Un rincón de paz y silencio absoluto con balcón privado hacia los jardines.",
    categoria: "Suite doble",
    vista: "Selva / jardín",
    vistaMontana: false,
    maxHuespedes: 4,
    tarifas: { 1: 1500, 2: 1500, 3: 1900, 4: 1900 },
    caracteristicas: ["2 camas matrimoniales", "Balcón privado", "Baño completo", "WiFi", "30 m²"],
    imagen: `${IMG}/lirios-2.jpg`,
  },
  {
    id: "bromelias-1",
    nombre: "Bromelias 1",
    descripcion: "Habitación cómoda con el ambiente selvático característico del hotel y acceso directo a la piscina spa.",
    categoria: "Suite doble",
    vista: "Selva / jardín",
    vistaMontana: false,
    maxHuespedes: 4,
    tarifas: { 1: 1500, 2: 1500, 3: 1900, 4: 1900 },
    caracteristicas: ["2 camas matrimoniales", "Acceso a piscina spa", "Baño completo", "WiFi"],
    imagen: `${IMG}/bromelias-1.jpg`,
  },
  {
    id: "helechos-1",
    nombre: "Helechos 1",
    descripcion: "El espacio perfecto para la familia, con tres camas matrimoniales y acceso a la piscina.",
    categoria: "Suite familiar",
    vista: "Terraza con vista a la piscina",
    vistaMontana: false,
    maxHuespedes: 6,
    tarifas: { 1: 1900, 2: 1900, 3: 2400, 4: 2400, 5: 2700, 6: 3000 },
    caracteristicas: ["3 camas matrimoniales", "Terraza con vista a piscina", "Baño completo", "Aire acondicionado", "65 m²"],
    imagen: `${IMG}/helechos-1.jpg`,
  },
  {
    id: "helechos-2",
    nombre: "Helechos 2",
    descripcion: "El refugio ideal para grupos: cuatro camas matrimoniales y vistas a la naturaleza.",
    categoria: "Suite familiar",
    vista: "Terraza con vista a la piscina",
    vistaMontana: false,
    maxHuespedes: 6,
    tarifas: { 1: 1900, 2: 1900, 3: 2400, 4: 2400, 5: 2700, 6: 3000 },
    caracteristicas: ["4 camas matrimoniales", "Terraza con vista a piscina", "Baño completo", "Aire acondicionado", "70 m²"],
    imagen: `${IMG}/helechos-2.jpg`,
  },
  {
    id: "jungla",
    nombre: "Jungla",
    descripcion: "Vista directa a la montaña — la favorita para despertar con el paisaje de la sierra.",
    categoria: "Suite con vista a la montaña",
    vista: "Montaña",
    vistaMontana: true,
    maxHuespedes: 4,
    tarifas: { 1: 2000, 2: 2000, 3: 2500, 4: 2500 },
    caracteristicas: ["2 camas matrimoniales", "Vista a la sierra", "Baño completo", "WiFi", "Aire acondicionado"],
    imagen: `${IMG}/jungla.jpg`,
  },
  {
    id: "flor-de-liz-2",
    nombre: "Suite Flor de Liz 2",
    descripcion: "Relajación profunda con tu propio spa privado y atardeceres incomparables sobre el pueblo.",
    categoria: "Suite con spa privado",
    vista: "Montaña",
    vistaMontana: true,
    maxHuespedes: 4,
    tarifas: { 1: 2000, 2: 2000, 3: 2500, 4: 2500 },
    caracteristicas: ["2 camas matrimoniales", "Spa privado al aire libre", "Terraza con vista", "Baño completo", "Aire acondicionado"],
    imagen: `${IMG}/flor-de-liz-2.jpg`,
  },
  {
    id: "lindavista",
    nombre: "Suite LindaVista",
    descripcion: "Vistas panorámicas a la montaña y spa privado al aire libre para detener el tiempo.",
    categoria: "Suite con spa privado",
    vista: "Montaña",
    vistaMontana: true,
    maxHuespedes: 4,
    tarifas: { 1: 2000, 2: 2000, 3: 2500, 4: 2500 },
    caracteristicas: ["2 camas matrimoniales", "Spa privado al aire libre", "Terraza panorámica", "Baño completo", "Aire acondicionado"],
    imagen: `${IMG}/lindavista.jpg`,
  },
];

export function getHabitacion(id: string): Habitacion | undefined {
  return HABITACIONES_HOTEL.find((h) => h.id === id || h.nombre === id);
}

/** Precio de una habitación por noche, con esa ocupación. `null` si no cabe. */
export function tarifaNoche(hab: Habitacion, huespedes: number): number | null {
  const n = Math.max(1, Math.floor(huespedes));
  if (n > hab.maxHuespedes) return null;
  return hab.tarifas[n] ?? hab.tarifas[hab.maxHuespedes] ?? null;
}

/** Cada 3.ª noche va gratis (decisión de Manolo, 12 ago 2026). */
export function nochesGratis(noches: number): number {
  return Math.floor(Math.max(0, noches) / 3);
}

export interface CotizacionHabitaciones {
  ok:            boolean;
  error?:        string;
  total?:        number;
  totalSinPromo?: number;
  ahorro?:       number;
  nochesGratis?: number;
  desglose?:     { habitacion: string; huespedes: number; porNoche: number; subtotal: number }[];
}

/**
 * Cotiza una o varias habitaciones. Cada renglón lleva su habitación y cuánta
 * gente duerme en ella: con cinco personas el cliente decide el reparto (3+2 o
 * 4+1), porque el precio no es el mismo y sabe mejor que nosotros cómo quiere
 * dormir.
 */
export function cotizarHabitaciones(
  seleccion: { habitacionId: string; huespedes: number }[],
  noches: number,
): CotizacionHabitaciones {
  const n = Math.floor(noches);
  if (n <= 0)              return { ok: false, error: "Faltan las noches." };
  if (seleccion.length === 0) return { ok: false, error: "Falta elegir la habitación." };

  const gratis = nochesGratis(n);
  const cobradas = n - gratis;

  const desglose: NonNullable<CotizacionHabitaciones["desglose"]> = [];
  for (const s of seleccion) {
    const hab = getHabitacion(s.habitacionId);
    if (!hab) return { ok: false, error: "Habitación no encontrada." };
    const porNoche = tarifaNoche(hab, s.huespedes);
    if (porNoche === null) {
      return { ok: false, error: `${hab.nombre} admite hasta ${hab.maxHuespedes} personas.` };
    }
    desglose.push({ habitacion: hab.nombre, huespedes: s.huespedes, porNoche, subtotal: porNoche * cobradas });
  }

  const total         = desglose.reduce((s, d) => s + d.subtotal, 0);
  const totalSinPromo = desglose.reduce((s, d) => s + d.porNoche * n, 0);

  return { ok: true, total, totalSinPromo, ahorro: totalSinPromo - total, nochesGratis: gratis, desglose };
}
