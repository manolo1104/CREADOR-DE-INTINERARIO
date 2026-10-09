// Solo servidor: lee las reservas reales para la prueba social del sitio.
import { prisma } from "./prisma";
import { lineasDe, type ConLineas } from "./admin/reserva";
import { TOURS_DB } from "./tours";

/**
 * Prueba social con las reservas que de verdad entraron.
 *
 * Regla de la casa, la misma que `reservasStats.ts`: aquí no se inventa un
 * número. Si el dato real no da, no se enseña nada.
 *
 * 🔴 Por qué la ventana es ANCHA (90 días y no 45 como en el hotel)
 *
 * El negocio tiene del orden de cincuenta reservas en total y entran unas
 * cuatro o cinco al mes. Con la ventana de 45 días del hotel, el aviso saldría
 * con dos nombres o con ninguno la mayor parte del año. Con 90 hay material, y
 * la antigüedad se dice como es —«hace 3 semanas»—: una reserva de hace tres
 * semanas sigue siendo prueba de que alguien compró, y fingir que fue hace dos
 * horas es justo lo que se ha estado borrando del sitio desde el 28 de
 * septiembre.
 *
 * 🔴 Las reservas del PANEL cuentan igual. No se filtra por `origen`: una
 * reserva cerrada por WhatsApp y dada de alta a mano es tan real como la que
 * pagó sola en la web. Es lo que pidió Manolo el 9 de octubre.
 *
 * Qué NO sale de aquí, nunca: apellido completo, correo, teléfono, monto, ni la
 * fecha del viaje. Solo nombre de pila + inicial, recorrido y hace cuánto.
 */

/** Hasta dónde se mira atrás para juntar reservas recientes. */
const VENTANA_DIAS = 90;

/**
 * Cuántas se mandan al navegador como mucho. El aviso enseña tres por visita;
 * ocho dan variedad entre visitas sin mandar media base al navegador.
 */
const MAX_RECIENTES = 8;

/**
 * Cuántas veces puede salir el MISMO recorrido en la lista.
 *
 * 🔴 Tamul va en ocho de cada veinte reservas (comprobado el 9 oct 2026 con el
 * endpoint contra la base real). Sin tope, el aviso enseñaba «Expedición
 * Tamul» tres veces seguidas y lo que se lee no es «este sitio vende», es «este
 * cartel está en bucle».
 */
const MAX_POR_RECORRIDO = 2;

/**
 * Los títulos que la gente escribe antes de su nombre.
 *
 * 🔴 En la base hay dos reservas a nombre de «Ing. José …» y el aviso decía
 * «Ing. J. reservó…»: el anonimizador tomaba «Ing.» como nombre de pila.
 */
const TITULOS = /^(ing|lic|sr|sra|srta|dr|dra|arq|mtro|mtra|c\.?p|profe?|don|doña)\.?$/i;

/**
 * Las reservas que no cuentan como venta: las canceladas y los «borrador» del
 * bot viejo, que eran cotizaciones grabadas como reserva y nunca se pagaron.
 * Es la misma lista que usa el cupo (`NO_CUENTAN` en `cupoTour.ts`).
 */
const ESTADO_VALIDO = "paid";

export interface ReservaReciente {
  /** Nombre de pila + inicial del apellido: «María G.». */
  nombre: string;
  /** El recorrido, con el nombre corto del catálogo. */
  recorrido: string;
  /** Hace cuántas horas entró la reserva. El texto lo arma el navegador. */
  horas: number;
}

export interface PruebaSocial {
  /** Reservas pagadas en los últimos 30 días (0 = no enseñar nada). */
  count30d: number;
  recientes: ReservaReciente[];
}

export const PRUEBA_SOCIAL_VACIA: PruebaSocial = { count30d: 0, recientes: [] };

/**
 * «MARÍA GUADALUPE PÉREZ LÓPEZ» → «María G.».
 *
 * Copiada del hotel (`app/api/social-proof/route.ts`). Descarta lo que no es un
 * nombre: las pruebas del panel («test», «borrar») y las celdas de una letra.
 * Si el segundo trozo no empieza por letra (un «2», un guion) no se pone
 * inicial: «Ana 2» quedaría como «Ana 2.».
 */
export function anonimizarNombre(completo: string): string | null {
  const limpio = (completo || "").trim().replace(/\s+/g, " ");
  if (limpio.length < 2 || /prueba|test|borrar|n\/a/i.test(limpio)) return null;
  // Fuera los títulos del principio: lo que sigue es el nombre.
  const partes = limpio.split(" ").filter((p, i, arr) => !(TITULOS.test(p) && i < arr.length - 1));
  const primero = partes[0];
  if (!primero || primero.length < 2) return null;
  const cap = primero[0].toUpperCase() + primero.slice(1).toLowerCase();
  const inicial = partes.length > 1 && /^[a-záéíóúñ]/i.test(partes[1])
    ? ` ${partes[1][0].toUpperCase()}.`
    : "";
  return cap + inicial;
}

/**
 * El recorrido que se enseña de una reserva.
 *
 * 🔴 No se puede usar `tourName` tal cual: en los carritos de varios
 * recorridos llega como «Expedición Tamul + Sótano de las Golondrinas + …» y
 * en el aviso no cabe. Y `tourSlug` tampoco basta: según `admin/kpis.ts`, las
 * Cascadas del Meco salen en 18 reservas pero como `tourSlug` solo en 4. Así
 * que se toma la PRIMERA línea del carrito, que sí trae su propio slug, y se
 * resuelve contra el catálogo para que el nombre sea el de hoy y no el que se
 * guardó hace meses.
 */
export function recorridoDeReserva(b: ConLineas): string | null {
  const lineas = lineasDe(b);
  const slug = lineas[0]?.tourSlug ?? b.tourSlug;
  const guardado = lineas[0]?.tourName ?? b.tourName;

  const delCatalogo = slug ? TOURS_DB.find((t) => t.slug === slug) : undefined;
  // El nombre del catálogo (en español: el aviso se traduce con el recorrido
  // ya elegido, y los nombres propios no cambian) o, si el slug ya no existe,
  // lo que se guardó. En los dos casos sin la cola de la coma y sin el « — ».
  const bruto = delCatalogo?.nombre ?? guardado ?? "";
  const corto = bruto.split("—")[0].split(" + ")[0].trim();
  return corto.length > 1 ? corto : null;
}

/**
 * Las reservas recientes y el conteo de 30 días, de una sola consulta.
 *
 * Devuelve `PRUEBA_SOCIAL_VACIA` si la base no contesta: ninguna venta se cae
 * por un adorno, y una página sin aviso es lo mismo que la de hoy.
 */
export async function getPruebaSocial(): Promise<PruebaSocial> {
  try {
    const ahora = Date.now();
    const desde = new Date(ahora - VENTANA_DIAS * 864e5);
    const hace30 = new Date(ahora - 30 * 864e5);

    const reservas = await prisma.tourBooking.findMany({
      where: { status: ESTADO_VALIDO, createdAt: { gte: desde } },
      orderBy: { createdAt: "desc" },
      // Solo las columnas que hacen falta. Ni correo, ni teléfono, ni notas:
      // lo que no se trae no se puede filtrar mal más adelante.
      select: {
        customerName: true,
        createdAt: true,
        tourSlug: true,
        tourName: true,
        lineItems: true,
        // `lineasDe` pide estos tres por el tipo `ConLineas`; no se usan.
        adults: true,
        children: true,
        tourDate: true,
        totalAmount: true,
      },
    });

    let count30d = 0;
    const recientes: ReservaReciente[] = [];
    /**
     * Quién salió ya y cuántas veces salió cada recorrido.
     *
     * 🔴 Las dos repeticiones que esto quita, vistas en la base real:
     *  - la MISMA persona con dos reservas («Ing. José…» compró el RZR y el
     *    rafting): sale una vez, la más reciente;
     *  - el mismo recorrido una y otra vez (Tamul va en 8 de cada 20).
     *
     * Dos avisos que se parecen se leen como inventados, que es exactamente lo
     * que esto viene a evitar. Como la lista va de la más nueva a la más vieja,
     * la que se queda es siempre la más reciente.
     */
    const vistos = new Set<string>();
    const porRecorrido = new Map<string, number>();

    for (const b of reservas) {
      if (b.createdAt >= hace30) count30d++;
      if (recientes.length >= MAX_RECIENTES) continue;

      const nombre = anonimizarNombre(b.customerName);
      const recorrido = recorridoDeReserva(b as ConLineas);
      if (!nombre || !recorrido) continue;

      const clave = nombre.toLowerCase();
      if (vistos.has(clave)) continue;
      const n = porRecorrido.get(recorrido) ?? 0;
      if (n >= MAX_POR_RECORRIDO) continue;

      vistos.add(clave);
      porRecorrido.set(recorrido, n + 1);
      recientes.push({
        nombre,
        recorrido,
        horas: Math.max(1, Math.round((ahora - b.createdAt.getTime()) / 3_600_000)),
      });
    }

    return { count30d, recientes };
  } catch (e) {
    console.error("[prueba-social] la base no contestó:", e);
    return PRUEBA_SOCIAL_VACIA;
  }
}
