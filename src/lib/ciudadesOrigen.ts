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
  paqueteSugerido: string;
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
          "Salida nocturna de la Terminal Central del Norte alrededor de las 10:15 PM (Servicios Coordinados, Transportes Frontera, ETN). Llega a Xilitla cerca de las 6:30 AM; el trayecto dura ~9–10 h. Tarifa aproximada $520–$900 MXN por persona.",
      },
      {
        modo: "En auto",
        detalle:
          "~5.5–6 horas (aprox. 339 km). El tramo final es carretera de sierra con curvas cerradas y neblina: conviene manejar de día.",
      },
      {
        modo: "En avión",
        detalle:
          "El aeropuerto más práctico es Tampico (TAM), a ~2.5 h de Xilitla. Desde ahí conviene renta de auto o transfer privado.",
      },
    ],
    paqueteSugerido: "aventura",
    faqs: [
      {
        q: "¿Pierdo un día viajando desde CDMX?",
        a: "No, si tomas el autobús nocturno. Llegas a Xilitla cerca de las 6:30 AM y ese mismo día arranca el primer recorrido. En los paquetes entregamos la habitación temprano para que descanses antes de salir.",
      },
      {
        q: "¿Cuántos días necesito viniendo desde CDMX?",
        a: "Con 3 días y 2 noches alcanzas para dos o tres recorridos completos sin sentir que solo estuviste en la carretera. Si quieres cubrir tanto el lado de Xilitla como el de Ciudad Valles, mejor 4 o 5.",
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
      "Viniendo del norte, Ciudad Valles queda antes y es donde te deja el autobús. Desde ahí Micos está a 20 minutos y Tamul a 45. Si quieres Xilitla y Las Pozas, son otras dos horas hacia el sur — también pasamos por ti allá.",
    llegadas: [
      {
        modo: "En autobús",
        detalle:
          "Salidas desde la Central de Autobuses de Monterrey hacia Ciudad Valles (Transportes Frontera, Grupo Senda). El trayecto ronda las 8 horas y la tarifa arranca alrededor de $630 MXN por persona.",
      },
      {
        modo: "En auto",
        detalle:
          "~6 horas hasta Ciudad Valles. Es el trayecto más cómodo de los dos: carretera de llanura casi todo el camino, sin el tramo de sierra que sí tiene la ruta desde CDMX.",
      },
      {
        modo: "En avión",
        detalle:
          "Tampico (TAM) es el aeropuerto más cercano, a ~2 h de Ciudad Valles. Desde ahí conviene renta de auto o transfer privado.",
      },
    ],
    paqueteSugerido: "completo",
    faqs: [
      {
        q: "¿Me conviene quedarme en Ciudad Valles o en Xilitla viniendo de Monterrey?",
        a: "Si vienes por las cascadas y tienes pocos días, Ciudad Valles: llegas antes y los destinos principales quedan a menos de una hora. Si vienes por Las Pozas de Edward James, Xilitla te ahorra casi dos horas de carretera al día. Pasamos por ti en las dos.",
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

export function getCiudadOrigen(slug: string): CiudadOrigen | undefined {
  return CIUDADES_ORIGEN.find((c) => c.slug === slug);
}
