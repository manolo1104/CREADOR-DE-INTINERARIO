import { PAQUETES_DB } from "@/lib/paquetes";
import { DESAYUNOS, NOCHES_TEXTO, REGRESO_TEXTO } from "@/lib/viajeCdmx/config";
import { enAuto, enAutobus, MINUTOS_VALLES_XILITLA, horasEnPalabras } from "@/lib/tiemposDeViaje";
/**
 * Landings por ciudad de origen.
 *
 * Solo se publican ciudades con demanda evidenciada y logística que podamos
 * sostener: Civitatis vende "4 días desde CDMX" y Gaiaxtreme "desde Monterrey".
 * Querétaro y Guadalajara eran una extrapolación sin evidencia y se dejaron
 * fuera a propósito — una landing por ciudad sin datos ciertos de cómo llegar
 * es exactamente el tipo de página inventada que no queremos.
 *
 * Los datos de CDMX salen de `LOGISTICA` en paquetes.ts (ya verificados). Los
 * de Monterrey se corroboraron contra la FAQ de /tours-en-ciudad-valles, que
 * ya declaraba ~6 h en auto.
 *
 * Regla: todo horario y tarifa va marcado como aproximado. Cambian por
 * temporada y el viajero lo comprueba en dos clics.
 */

/**
 * El autobús nocturno CDMX → Xilitla, aproximado y por trayecto. Una sola
 * cifra para /desde/cdmx, la comparación del viaje CDMX–Xilitla y llms.txt:
 * llms.txt decía «$650» y esta página «$520–$900».
 */
export const AUTOBUS_CDMX = { min: 520, max: 900, terminal: "Terminal Central del Norte", hora: "10:15 PM", llega: "6:30 AM" } as const;

export interface CiudadOrigen {
  slug: string;
  nombre: string;
  /** Cómo se nombra en una frase: "desde la Ciudad de México". */
  nombreLargo: string;
  /** Base que le conviene a quien viene de aquí, y por qué. */
  baseRecomendada: "Xilitla" | "Ciudad Valles";
  razonBase: string;
  llegadas: { modo: string; detalle: string }[];
  /** Slug del paquete que mejor le queda a esa distancia. */
  /**
   * Slug de un paquete de `PAQUETES_DB`. Va tipado contra el catálogo a
   * propósito: cuando los paquetes cambiaron el 10 sep 2026 estos campos
   * decían "aventura" y "completo", que dejaron de existir, y el `?? [0]` de
   * `/desde/[ciudad]` hacía caer las dos páginas al primero de la lista sin
   * avisar. Resultado: a quien venía de Monterrey se le ofrecía el paquete de
   * Luna de Miel. Tipado así, el mismo error no compila.
   */
  paqueteSugerido: (typeof PAQUETES_DB)[number]["slug"];
  faqs: { q: string; a: string }[];
}

export const CIUDADES_ORIGEN: CiudadOrigen[] = [
  {
    slug: "cdmx",
    nombre: "CDMX",
    nombreLargo: "la Ciudad de México",
    baseRecomendada: "Xilitla",
    razonBase:
      "El autobús nocturno te deja directo en Xilitla por la mañana, así que no pierdes el primer día. Si llegas en auto, Xilitla también te queda antes que Ciudad Valles viniendo por la 120.",
    llegadas: [
      {
        modo: "En autobús (lo más práctico)",
        detalle:
          `Salida nocturna de la ${AUTOBUS_CDMX.terminal} alrededor de las ${AUTOBUS_CDMX.hora} (Servicios Coordinados, Transportes Frontera, ETN). Llega a Xilitla cerca de las ${AUTOBUS_CDMX.llega}; el trayecto dura ${enAutobus("cdmx", "xilitla")}. Tarifa aproximada $${AUTOBUS_CDMX.min}–$${AUTOBUS_CDMX.max} MXN por persona, por trayecto.`,
      },
      {
        modo: "En auto",
        detalle:
          `${enAuto("cdmx")} (aprox. 339 km). El tramo final es carretera de sierra con curvas cerradas y neblina: conviene manejar de día.`,
      },
      {
        modo: "En avión",
        detalle:
          `El aeropuerto más práctico es Tampico (TAM), a ${enAuto("tampico")} de Xilitla. Desde ahí conviene renta de auto o transfer privado.`,
      },
    ],
    // Coincide con su FAQ («con 3 días y 2 noches alcanzas»).
    paqueteSugerido: "inmersion-huasteca",
    faqs: [
      {
        // El viaje grupal de cada mes (16 oct 2026). Sin precio ni fecha: esta
        // página es estática y la cifra viva está en /viaje-cdmx-xilitla.
        q: "¿Hay tours a la Huasteca Potosina desde CDMX?",
        a: `Sí. Cada mes sale nuestro viaje grupal del Ángel de la Independencia: el viernes a la medianoche en Urvan, ${NOCHES_TEXTO} en nuestro hotel en Xilitla, ${DESAYUNOS} desayunos, Las Pozas de Edward James y la cascada de Tamul con guía, y regresas ${REGRESO_TEXTO}. Las fechas y el precio están en la página del viaje.`,
      },
      {
        q: "¿Pierdo un día viajando desde CDMX?",
        a: "No, si tomas el autobús nocturno. Llegas a Xilitla cerca de las 6:30 AM y ese mismo día arranca el primer recorrido. En los paquetes entregamos la habitación temprano para que descanses antes de salir.",
      },
      {
        q: "¿Cuántos días necesito viniendo desde CDMX?",
        a: `Con 3 días y 2 noches alcanzas para dos o tres recorridos completos sin sentir que solo estuviste en la carretera. Si quieres cubrir tanto el lado de Xilitla como el de Ciudad Valles, mejor 4 o 5. Si solo tienes el fin de semana, nuestro viaje grupal hace dos recorridos completos: sales el viernes a la medianoche y regresas ${REGRESO_TEXTO}.`,
      },
      {
        q: "¿Conviene manejar desde CDMX?",
        a: "Si son varios y quieren moverse por su cuenta, sí. Toma en cuenta que las últimas dos horas son sierra: curvas continuas, neblina frecuente y tramos sin señal. Recomendamos salir temprano para no manejarlas de noche.",
      },
    ],
  },
  {
    slug: "monterrey",
    nombre: "Monterrey",
    nombreLargo: "Monterrey",
    baseRecomendada: "Ciudad Valles",
    razonBase:
      `Viniendo del norte, Ciudad Valles queda antes y es donde te deja el autobús. Desde ahí Micos está a 20 minutos y Tamul a 45. Si quieres Xilitla y Las Pozas, son otra ${horasEnPalabras(MINUTOS_VALLES_XILITLA)} hacia la sierra — también pasamos por ti allá.`,
    llegadas: [
      {
        modo: "En autobús",
        detalle:
          `Salidas desde la Central de Autobuses de Monterrey hacia Ciudad Valles (Transportes Frontera, Grupo Senda). El trayecto ronda ${enAutobus("monterrey", "valles")} y la tarifa arranca alrededor de $630 MXN por persona.`,
      },
      {
        modo: "En auto",
        detalle:
          `${enAuto("monterrey", "valles")} hasta Ciudad Valles. Es el trayecto más cómodo de los dos: carretera de llanura casi todo el camino, sin el tramo de sierra que sí tiene la ruta desde CDMX.`,
      },
      {
        modo: "En avión",
        detalle:
          `Tampico (TAM) es el aeropuerto más cercano, a ${enAuto("tampico", "valles")} de Ciudad Valles. Desde ahí conviene renta de auto o transfer privado.`,
      },
    ],
    // Coincide con su FAQ («con 4 días y 3 noches va cómodo»).
    paqueteSugerido: "gran-huasteca",
    faqs: [
      {
        q: "¿Me conviene quedarme en Ciudad Valles o en Xilitla viniendo de Monterrey?",
        a: `Si vienes por las cascadas y tienes pocos días, Ciudad Valles: llegas antes y los destinos principales quedan a menos de una hora. Si vienes por Las Pozas de Edward James, dormir en Xilitla te ahorra unas ${horasEnPalabras(2 * MINUTOS_VALLES_XILITLA)} de carretera ida y vuelta. Pasamos por ti en las dos.`,
      },
      {
        q: "¿Cuántos días necesito viniendo desde Monterrey?",
        a: "Con 4 días y 3 noches va cómodo: un día se va en llegar y te quedan tres completos de recorridos. Con 3 días alcanza, pero vas justo.",
      },
      {
        q: "¿El camino desde Monterrey es de sierra?",
        a: "No en su mayoría. Hasta Ciudad Valles es carretera de llanura. La sierra empieza si bajas hacia Xilitla, que son unos 100 km más por la carretera 120.",
      },
    ],
  },
];

// 🔴 Los slugs sugeridos eran de paquetes que ya no existen («aventura-extrema»,
// «tu-huasteca»): la página caía en silencio al primero del catálogo y su
// propia FAQ hablaba de otra duración. El tipo es `string`, así que TypeScript
// no lo ve: se revisa aquí y el build se cae si vuelve a pasar.
for (const c of CIUDADES_ORIGEN) {
  if (!PAQUETES_DB.some((p) => p.slug === c.paqueteSugerido)) {
    throw new Error(`ciudadesOrigen: "${c.slug}" sugiere el paquete "${c.paqueteSugerido}", que no existe`);
  }
}


export function getCiudadOrigen(slug: string): CiudadOrigen | undefined {
  return CIUDADES_ORIGEN.find((c) => c.slug === slug);
}
