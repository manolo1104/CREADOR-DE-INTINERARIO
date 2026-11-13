import { PAQUETES_DB } from "@/lib/paquetes";
import { DESAYUNOS, NOCHES_TEXTO, REGRESO_TEXTO } from "@/lib/viajeCdmx/config";
import { enAuto, enAutobus, MINUTOS_VALLES_XILITLA, horasEnPalabras, tiempoDesde, distancia } from "@/lib/tiemposDeViaje";
import { DESTINOS_DB } from "@/lib/destinos";
import { TOURS_DB } from "@/lib/tours";
import { etiquetaTramo, getTraslado, precioBase } from "@/lib/traslados";
import { tiempoDesdeValles } from "@/lib/tiemposADestinos";
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
 * San Luis Potosí entró el 10 nov 2026 (806 impresiones en el puesto 7.3, sin
 * página): sus dos tiempos son de Manolo y viven en `tiemposDeViaje.ts`, y el
 * traslado en `traslados.ts`. Guadalajara (146 impresiones) SIGUE fuera:
 * `tiemposDeViaje.ts` no tiene su tiempo a propósito, y la única cifra que
 * anda en el código («7–8 h» en el PDF de /api/pdf/guia) está escrita a mano.
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
  /**
   * Title y description propios, para las ciudades cuyo nombre no cabe en el
   * armado de la plantilla: «Huasteca Potosina desde San Luis Potosí — Cómo
   * Llegar y Qué Reservar 2026» mide 73 y Google corta en ~60. Solo las
   * ciudades nuevas lo usan: CDMX y Monterrey conservan el suyo tal cual
   * (/desde/monterrey es página congelada).
   */
  metaTitle?: string;
  metaDescription?: string;
}

/**
 * Lo que la entrada de San Luis Potosí dice con datos (10 nov 2026). Todo sale
 * del código: los tiempos de ciudad a ciudad de `tiemposDeViaje.ts` (Manolo),
 * los de Ciudad Valles a cada lugar del `como_llegar` de su ficha, el traslado
 * de `traslados.ts` y los paquetes de `PAQUETES_DB`. Si una ficha deja de
 * decirlo, la frase que lo usa se calla en vez de inventar.
 */
const SLP = tiempoDesde("san-luis-potosi");
const desdeValles = (slug: string) => {
  const d = DESTINOS_DB.find((x) => x.slug === slug);
  return d ? tiempoDesdeValles(d) : null;
};
const SLP_MICOS = desdeValles("cascadas-de-micos");
const SLP_TAMUL = desdeValles("cascada-de-tamul");
const SLP_PUENTE = desdeValles("puente-de-dios-tamasopo");
const ACUATICA = TOURS_DB.find((t) => t.slug === "ruta-acuatica-puente-de-dios");
const TRASLADO_SLP = getTraslado("san-luis-potosi");
const TRASLADO_TAMPICO = getTraslado("tampico");
const PAQUETES_POR_DIAS = [...PAQUETES_DB].sort((a, b) => a.dias - b.dias);
const PAQ_CORTO = PAQUETES_POR_DIAS[0];
const PAQ_LARGO = PAQUETES_POR_DIAS[PAQUETES_POR_DIAS.length - 1];
const PAQUETES_EN_XILITLA = PAQUETES_DB.every((p) => p.incluye.some((i) => /Paraíso Encantado/i.test(i)));

export const CIUDADES_ORIGEN: CiudadOrigen[] = [
  {
    slug: "cdmx",
    nombre: "CDMX",
    // El título armado medía 64 caracteres y Google lo cortaba (auditoría 10 nov 2026).
    metaTitle: "Huasteca Potosina desde CDMX: cómo llegar y viaje 2026",
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
          `${enAuto("cdmx")} (aprox. ${distancia("cdmx")}). El tramo final es carretera de sierra con curvas cerradas y neblina: conviene manejar de día.`,
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
      {
        // «vuelos a xilitla» / «aeropuerto más cercano»: 330 impresiones en 6
        // meses y 0 clics (10 nov 2026). Va al final, sin tocar las de arriba.
        // Que Xilitla no tiene aeropuerto lo dice /en/from («There's no airport
        // in the Huasteca itself»); Tampico y San Luis Potosí, `LOGISTICA`.
        q: "¿Hay vuelos de la CDMX a Xilitla?",
        a:
          `No: Xilitla no tiene aeropuerto. El más práctico es Tampico (TAM), a ${enAuto("tampico")} en auto de Xilitla y ${enAuto("tampico", "valles")} de Ciudad Valles; la otra opción es volar a San Luis Potosí, a ${enAuto("san-luis-potosi")} de Xilitla. ` +
          "Desde el aeropuerto conviene rentar auto o pedir un traslado privado" +
          (TRASLADO_TAMPICO
            ? `: desde Tampico tenemos traslado redondo a Xilitla desde $${precioBase(TRASLADO_TAMPICO).toLocaleString("es-MX")} MXN por vehículo. `
            : ". ") +
          `Aun así, viniendo de la CDMX lo más práctico suele ser el autobús nocturno, que te deja directo en Xilitla en ${enAutobus("cdmx", "xilitla")}.`,
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
  {
    // 10 nov 2026: 806 impresiones en el puesto 7.3 sin página propia. Sin
    // autobús a propósito: `tiemposDeViaje.ts` no trae ninguno desde San Luis
    // Potosí y mejor callar que inventar una corrida.
    slug: "san-luis-potosi",
    nombre: "San Luis Potosí",
    nombreLargo: "la ciudad de San Luis Potosí",
    baseRecomendada: "Ciudad Valles",
    razonBase:
      `Desde la capital, Ciudad Valles es lo que queda más cerca: ${enAuto("san-luis-potosi", "valles")} por la autopista, que pasa por el desvío a Tamasopo, donde está el Puente de Dios.` +
      (SLP_MICOS && SLP_TAMUL ? ` Desde Valles, Micos está a ${SLP_MICOS} y Tamul a ${SLP_TAMUL}.` : "") +
      ` Si vienes por Las Pozas de Edward James, Xilitla está a ${enAuto("san-luis-potosi")} de la capital porque se llega por Rioverde y Jalpan; en muchos de nuestros recorridos pasamos por ti en cualquiera de las dos.`,
    llegadas: [
      {
        modo: "En auto, a Ciudad Valles",
        detalle:
          `${enAuto("san-luis-potosi", "valles")}${SLP?.km ? ` (${SLP.km} km)` : ""} por la autopista San Luis Potosí–Ciudad Valles. En el camino está el desvío a Tamasopo` +
          (SLP_PUENTE ? `: el Puente de Dios queda a ${SLP_PUENTE} de Ciudad Valles.` : "."),
      },
      {
        modo: "En auto, a Xilitla",
        detalle:
          `${enAuto("san-luis-potosi")}. No es la misma ruta: a Xilitla se va por Rioverde y Jalpan, sin pasar por Ciudad Valles. El acceso a Xilitla es carretera de sierra, con curvas cerradas y neblina: conviene manejar de día.`,
      },
    ],
    // El más corto: San Luis Potosí es el origen más cercano de los tres.
    paqueteSugerido: "inmersion-huasteca",
    metaTitle: "Huasteca Potosina desde San Luis Potosí: cómo llegar",
    metaDescription:
      `De San Luis Potosí a Ciudad Valles son ${enAuto("san-luis-potosi", "valles")} y a Xilitla ${enAuto("san-luis-potosi")}. Cómo llegar en auto, traslado privado, dónde quedarte y qué tours reservar.`,
    faqs: [
      {
        q: "¿Cuánto se hace de San Luis Potosí a la Huasteca Potosina?",
        a:
          `A Ciudad Valles, la puerta de entrada de la región, son ${enAuto("san-luis-potosi", "valles")} en auto${SLP?.km ? ` (${SLP.km} km)` : ""}. ` +
          `A Xilitla, ${enAuto("san-luis-potosi")}: se va por Rioverde y Jalpan, no pasando por Ciudad Valles. ` +
          `Entre Ciudad Valles y Xilitla hay ${horasEnPalabras(MINUTOS_VALLES_XILITLA)} de sierra.`,
      },
      {
        q: "¿Me conviene quedarme en Ciudad Valles o en Xilitla viniendo de San Luis Potosí?",
        a:
          "Si vienes por las cascadas, Ciudad Valles: llegas antes" +
          (SLP_MICOS && SLP_TAMUL ? ` y desde ahí Micos queda a ${SLP_MICOS} y Tamul a ${SLP_TAMUL}` : "") +
          ". Si vienes por Las Pozas de Edward James, Xilitla, donde está el jardín. En muchos de nuestros recorridos pasamos por ti en cualquiera de las dos.",
      },
      ...(SLP_PUENTE
        ? [{
            q: "¿Paso por Tamasopo y el Puente de Dios en el camino?",
            a:
              `Sí, si vas a Ciudad Valles: la autopista desde San Luis Potosí pasa por el desvío a Tamasopo, y el Puente de Dios queda a ${SLP_PUENTE} de Ciudad Valles.` +
              (ACUATICA ? ` Nuestra ${ACUATICA.nombreCorto} lo recorre con guía y pasa por ti a tu hospedaje en Xilitla o Ciudad Valles.` : ""),
          }]
        : []),
      ...(TRASLADO_SLP
        ? [{
            q: "¿Hay traslado de San Luis Potosí a la Huasteca?",
            a:
              "Sí: traslado privado redondo desde la ciudad de San Luis Potosí hasta Xilitla, por vehículo y no por persona. " +
              `Para ${etiquetaTramo(TRASLADO_SLP.tarifas[0])} cuesta $${precioBase(TRASLADO_SLP).toLocaleString("es-MX")} MXN el viaje redondo; las tarifas para grupos más grandes están arriba, en «O te llevamos nosotros».`,
          }]
        : []),
      {
        q: "¿Cuántos días necesito viniendo de San Luis Potosí?",
        a:
          `Depende de lo que quieras ver. Nuestro paquete más corto, ${PAQ_CORTO.nombre}, es de ${PAQ_CORTO.dias} días y ${PAQ_CORTO.noches} noches con ${PAQ_CORTO.tours.length} recorridos completos; el más largo, ${PAQ_LARGO.nombre}, es de ${PAQ_LARGO.dias} días con ${PAQ_LARGO.tours.length}.` +
          (PAQUETES_EN_XILITLA ? ` Todos duermen en nuestro hotel de Xilitla, a ${enAuto("san-luis-potosi")} de San Luis Potosí.` : ""),
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
