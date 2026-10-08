/**
 * Cuánto se hace por carretera hasta la Huasteca. **La única fuente.**
 *
 * Hasta hoy no existía ninguna: las cerca de cuarenta cifras estaban escritas a
 * mano en veinticinco archivos y se contradecían DENTRO DE LA MISMA PANTALLA.
 * En el inicio convivían cuatro números para la Ciudad de México (7 h, 5.5-6 h,
 * 6.5-7 h y 8 h en ADO) y tres para Tampico (3.5 h, 2.5 h y 2 h). En
 * `/en/preguntas-frecuentes` dos respuestas seguidas decían 2.5 h y 2 h del
 * aeropuerto de Tampico a Ciudad Valles. Un cliente que lee de corrido lo ve en
 * un minuto, y lo que aprende es que el sitio no sabe de lo que habla.
 *
 * Ya había pasado antes: el 14 ago 2026 se emparejaron nueve páginas a mano y
 * en seis semanas volvió a desparejarse, porque no quedó ningún sitio donde el
 * número viviera una sola vez. Eso es lo que arregla este archivo.
 *
 * ⚠️ Todo tiempo de carretera que vea un cliente sale de aquí. Si aparece uno
 * escrito a mano en una página, está mal por definición — igual que los
 * importes de `traslados.ts`.
 *
 * ## De dónde salen los números
 *
 * De Manolo, que hace la carretera. Ninguna de las cifras que publicaba el
 * sitio venía de alguien que la hubiera manejado:
 *
 * - `/preguntas-frecuentes` y `/tours-en-ciudad-valles` daban ~9 h a Ciudad
 *   Valles, que es el tiempo del AUTOBÚS colado en la fila del coche.
 * - `/info-practica` daba 5.5 h, y es la página que se presentaba como la guía
 *   «auditada».
 * - El patrón: **todas las fuentes internas se quedaban cortas entre 1 y 1.5 h.**
 *
 * Confirmados el 14 ago, el 23 sep y el 8 oct de 2026. Antes de publicar un
 * tiempo nuevo, se le pregunta a él; no se promedia lo que dicen las otras
 * páginas, porque la vez pasada las dos que se peleaban estaban mal.
 *
 * ## Qué NO está aquí, a propósito
 *
 * - **Querétaro y Guadalajara.** `ciudadesOrigen.ts` las dejó fuera porque eran
 *   una extrapolación sin evidencia. Sigue siendo mejor no decir nada que
 *   inventar un número.
 * - **Los tiempos de vuelo.** No los maneja nadie: los pone la aerolínea.
 */

/** Cada tramo, en horas, tal como se le dice al cliente. */
export interface TiempoDesde {
  /** Coincide con el slug de `traslados.ts` y de la landing `/desde/<slug>`. */
  slug: string;
  ciudad: string;
  ciudadEn: string;
  /** Kilómetros hasta Ciudad Valles, cuando se conocen. */
  km?: number;
  /** En auto hasta Xilitla. */
  autoXilitla: string;
  autoXilitlaEn: string;
  /** En auto hasta Ciudad Valles, la puerta de entrada de la región. */
  autoValles: string;
  autoVallesEn: string;
  /** En autobús hasta Ciudad Valles, si hay salida directa. */
  busValles?: string;
  busVallesEn?: string;
  /** En autobús hasta Xilitla, si hay salida directa. */
  busXilitla?: string;
  busXilitlaEn?: string;
}

/**
 * 🔴 San Luis Potosí no cuadra con la suma (3 h a Valles + 1.5 h de sierra
 * darían 4.5 h, no 5) porque **no es la misma ruta**: a Xilitla se va por
 * Rioverde y Jalpan, no pasando por Ciudad Valles. Los dos números son de
 * Manolo y los dos se publican tal cual.
 */
export const TIEMPOS_DE_VIAJE: TiempoDesde[] = [
  {
    slug: "cdmx",
    ciudad: "Ciudad de México",
    ciudadEn: "Mexico City",
    km: 430,
    autoXilitla: "7 h",
    autoXilitlaEn: "7 h",
    autoValles: "6.5 a 7 h",
    autoVallesEn: "6.5 to 7 h",
    busValles: "~8 h",
    busVallesEn: "~8 h",
    busXilitla: "9 a 10 h",
    busXilitlaEn: "9 to 10 h",
  },
  {
    slug: "san-luis-potosi",
    ciudad: "San Luis Potosí",
    ciudadEn: "San Luis Potosí",
    km: 260,
    autoXilitla: "5 h",
    autoXilitlaEn: "5 h",
    autoValles: "~3 h",
    autoVallesEn: "~3 h",
  },
  {
    slug: "tampico",
    ciudad: "Tampico",
    ciudadEn: "Tampico",
    autoXilitla: "3.5 h",
    autoXilitlaEn: "3.5 h",
    autoValles: "~2 h",
    autoVallesEn: "~2 h",
  },
  {
    slug: "monterrey",
    ciudad: "Monterrey",
    ciudadEn: "Monterrey",
    km: 340,
    autoXilitla: "~7 h",
    autoXilitlaEn: "~7 h",
    autoValles: "~6 h",
    autoVallesEn: "~6 h",
    busValles: "~8 h",
    busVallesEn: "~8 h",
  },
];

export function tiempoDesde(slug: string): TiempoDesde | undefined {
  return TIEMPOS_DE_VIAJE.find((t) => t.slug === slug);
}

/**
 * «7 h» · «6.5 a 7 h». El destino por omisión es Xilitla, que es donde está el
 * hotel y donde empieza la mitad de los recorridos; `valles` es para las
 * páginas que hablan de Ciudad Valles como puerta de entrada.
 */
export function enAuto(slug: string, destino: "xilitla" | "valles" = "xilitla", en = false): string {
  const t = tiempoDesde(slug);
  if (!t) return "";
  if (destino === "valles") return en ? t.autoVallesEn : t.autoValles;
  return en ? t.autoXilitlaEn : t.autoXilitla;
}

/** Devuelve «» cuando esa ciudad no tiene autobús directo, para no inventarlo. */
export function enAutobus(slug: string, destino: "xilitla" | "valles" = "valles", en = false): string {
  const t = tiempoDesde(slug);
  if (!t) return "";
  if (destino === "xilitla") return (en ? t.busXilitlaEn : t.busXilitla) ?? "";
  return (en ? t.busVallesEn : t.busValles) ?? "";
}
