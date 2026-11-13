// El «resultado completo» del recomendador (13 nov 2026, auditoría: «usa la
// ciudad de origen para mostrar cómo llegar, el viaje grupal si aplica y un
// total estimado del viaje»). Todo sale de las fuentes de siempre —tiempos de
// viaje, traslados, precios de tours, hotel y paquetes—: aquí no se escribe un
// solo número a mano. Puro, para probarlo.

import { enAuto, enAutobus, distancia } from "@/lib/tiemposDeViaje";
import { precioTraslado } from "@/lib/traslados";
import { totalRecorrido } from "@/lib/tourBooking";
import { computePaqueteCharge } from "@/lib/paquetePricing";
import { HABITACIONES_HOTEL } from "@/lib/habitaciones";
import type { Tour } from "@/lib/tours";
import { AUTOBUS_CDMX } from "@/lib/ciudadesOrigen";

/** Las ciudades del recomendador que tienen datos (tiempos, traslado). Las demás, por WhatsApp. */
export const ORIGEN_A_SLUG: Record<string, string> = {
  "Ciudad de México": "cdmx",
  "Monterrey": "monterrey",
  "San Luis Potosí": "san-luis-potosi",
  "Tampico": "tampico",
};

/** Cuántos van, según «¿con quién viajas?». Familia = 2 adultos + 2 niños de 6 a 10. */
export function personasDeGrupo(grupo: string): { adultos: number; ninos: number } {
  if (/solo|sola/i.test(grupo)) return { adultos: 1, ninos: 0 };
  if (/pareja/i.test(grupo)) return { adultos: 2, ninos: 0 };
  if (/familia/i.test(grupo)) return { adultos: 2, ninos: 2 };
  return { adultos: 4, ninos: 0 };
}

/** «3 días» → 3; «5 o más días» → 5. */
export function diasDe(texto: string): number {
  const n = parseInt(texto, 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 5) : 1;
}

export interface ComoLlegar {
  slug: string;
  auto: string;
  km: string;
  bus: string;
  /** Traslado privado ida y vuelta para el grupo, si hay tarifa. */
  traslado: number | null;
}

export function comoLlegar(origen: string, personas: number): ComoLlegar | null {
  const slug = ORIGEN_A_SLUG[origen];
  if (!slug) return null;
  return {
    slug,
    auto: enAuto(slug, "xilitla"),
    km: distancia(slug, "xilitla"),
    bus: enAutobus(slug, "xilitla") || enAutobus(slug, "valles"),
    traslado: precioTraslado(slug, personas),
  };
}

export interface LineaEstimado { concepto: string; monto: number }

/**
 * El total estimado del viaje para el grupo: el paquete recomendado (3+ días),
 * o los recorridos + hotel «desde»; más el transporte más común: el autobús
 * ida y vuelta desde CDMX (la única ciudad con tarifa de autobús publicada).
 * El traslado privado NO se suma: para una pareja duplicaba el viaje; va como
 * opción en «Cómo llegar». Es una ESTIMACIÓN: el precio final lo da el carrito.
 */
export function totalEstimado(p: {
  dias: string; grupo: string; origen: string;
  principal: Pick<Tour, "nombre" | "precio" | "precioLista" | "tarifaGrupo" | "escalaPersona" | "groupMin" | "precioUnidad" | "eleccion"> | null;
  secundario?: Pick<Tour, "nombre" | "precio" | "precioLista" | "tarifaGrupo" | "escalaPersona" | "groupMin" | "precioUnidad" | "eleccion"> | null;
  paquete?: { slug: string; nombre: string } | null;
}): { lineas: LineaEstimado[]; total: number; personas: number } {
  const { adultos, ninos } = personasDeGrupo(p.grupo);
  const personas = adultos + ninos;
  const dias = diasDe(p.dias);
  const lineas: LineaEstimado[] = [];

  const paquete = p.paquete && dias >= 3
    ? computePaqueteCharge({ slug: p.paquete.slug, personas: Math.max(2, adultos), childrenMid: ninos, pct: 100 })
    : null;
  if (paquete && p.paquete) {
    lineas.push({ concepto: `${p.paquete.nombre} (hotel, recorridos y desayunos)`, monto: paquete.total });
  } else {
    if (p.principal) lineas.push({ concepto: p.principal.nombre.split("—")[0].trim(), monto: totalRecorrido(p.principal, adultos, ninos) });
    if (p.secundario && dias >= 2) lineas.push({ concepto: p.secundario.nombre.split("—")[0].trim(), monto: totalRecorrido(p.secundario, adultos, ninos) });
    const noches = dias - 1;
    if (noches > 0) {
      const desde = Math.min(...HABITACIONES_HOTEL.flatMap((h) => Object.values(h.tarifas)));
      const cuartos = Math.ceil(personas / 4);
      lineas.push({ concepto: `Hotel, ${noches} noche${noches > 1 ? "s" : ""} (desde)`, monto: desde * noches * cuartos });
    }
  }
  if (ORIGEN_A_SLUG[p.origen] === "cdmx") {
    lineas.push({ concepto: "Autobús ida y vuelta desde CDMX (desde)", monto: AUTOBUS_CDMX.min * 2 * personas });
  }
  return { lineas, total: lineas.reduce((s, l) => s + l.monto, 0), personas };
}
