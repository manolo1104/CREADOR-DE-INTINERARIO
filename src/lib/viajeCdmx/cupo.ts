/**
 * El cupo del viaje CDMX–Xilitla y su candado.
 *
 * 🔴 Lugares libres = capacidad − personas con anticipo pagado − apartados vivos.
 * Nada más: ni números fijos ni aleatorios.
 *
 * 🔴 EL CANDADO. Todo lo que gasta o libera un lugar de una salida —apartar,
 * confirmar un pago, la venta por WhatsApp del panel, mover a alguien de
 * fecha— corre dentro de `conSalidaBloqueada`, que toma un `FOR UPDATE` sobre
 * la fila de esa salida. Dos compradores del último lugar hacen fila ahí: el
 * segundo cuenta DESPUÉS de que el primero dejó su apartado guardado, y ya no
 * cabe. Postgres está en READ COMMITTED, así que cada consulta dentro del
 * candado ve lo que el anterior ya confirmó.
 *
 * Antes de esto ningún producto del sitio tenía candado (15 oct 2026): las
 * reservas se revisaban al crear el cobro y nada impedía que dos pasaran a la
 * vez. El patrón es el mismo de `cotizaciones/convertir.ts`.
 */
import type { Prisma, SalidaGrupal } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Un error con su respuesta HTTP: la ruta lo convierte tal cual. */
export class ErrorViaje extends Error {
  constructor(
    public status: number,
    public codigo: string,
    mensaje: string,
    public extra: Record<string, unknown> = {},
  ) {
    super(mensaje);
  }
}

type Tx = Prisma.TransactionClient;

/** Reservas que ocupan lugar: todas menos las canceladas. */
const NO_OCUPAN = ["cancelled", "borrador"];

/**
 * Corre `fn` con la salida bloqueada. Una salida a la vez por fila; las demás
 * salidas no esperan. Si el candado tarda más de 4 s, falla con 503 y el
 * cliente reintenta: mejor eso que una fila de compradores colgados.
 */
export async function conSalidaBloqueada<T>(
  salidaId: string,
  fn: (tx: Tx, salida: SalidaGrupal) => Promise<T>,
): Promise<T> {
  try {
    return await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SET LOCAL lock_timeout = '4s'`;
      const filas = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "SalidaGrupal" WHERE id = ${salidaId} FOR UPDATE`;
      if (!filas.length) throw new ErrorViaje(404, "sin-salida", "Esa salida no existe.");
      const salida = await tx.salidaGrupal.findUniqueOrThrow({ where: { id: salidaId } });
      return fn(tx, salida);
    }, { maxWait: 5000, timeout: 10000 });
  } catch (e) {
    if (e instanceof ErrorViaje) throw e;
    const msg = e instanceof Error ? e.message : String(e);
    // 55P03 = lock_not_available; P2028 = la transacción de Prisma no arrancó a tiempo.
    if (/lock timeout|55P03|P2028|Transaction already closed|Unable to start a transaction/i.test(msg)) {
      throw new ErrorViaje(503, "ocupado", "Hay mucha gente apartando en este momento. Intenta de nuevo en unos segundos.");
    }
    throw e;
  }
}

/**
 * Bloquea VARIAS salidas, siempre en el mismo orden (por id): dos «mover» que
 * se cruzan entre las mismas dos fechas no se esperan uno al otro para siempre.
 */
export async function conSalidasBloqueadas<T>(
  ids: string[],
  fn: (tx: Tx, salidas: Map<string, SalidaGrupal>) => Promise<T>,
): Promise<T> {
  const orden = Array.from(new Set(ids)).sort();
  try {
    return await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SET LOCAL lock_timeout = '4s'`;
      const salidas = new Map<string, SalidaGrupal>();
      for (const id of orden) {
        const filas = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "SalidaGrupal" WHERE id = ${id} FOR UPDATE`;
        if (!filas.length) throw new ErrorViaje(404, "sin-salida", "Esa salida no existe.");
        salidas.set(id, await tx.salidaGrupal.findUniqueOrThrow({ where: { id } }));
      }
      return fn(tx, salidas);
    }, { maxWait: 5000, timeout: 10000 });
  } catch (e) {
    if (e instanceof ErrorViaje) throw e;
    const msg = e instanceof Error ? e.message : String(e);
    if (/lock timeout|55P03|P2028|Transaction already closed|Unable to start a transaction/i.test(msg)) {
      throw new ErrorViaje(503, "ocupado", "El sistema está ocupado. Intenta de nuevo en unos segundos.");
    }
    throw e;
  }
}

export interface Ocupacion {
  /** Personas con reserva (anticipo pagado o venta del panel). */
  confirmados: number;
  /** Personas con un apartado vivo: están pagando ahora mismo. */
  enPago: number;
  ocupados: number;
}

/**
 * Cuánto está ocupado. Dentro del candado se le pasa `tx`; fuera (la página),
 * `prisma`, sabiendo que es una foto que puede cambiar al segundo siguiente.
 * `excluirApartado`: el apartado de quien está confirmando no se cuenta dos
 * veces (como apartado y como su propia reserva).
 */
export async function ocupacion(
  db: Tx | typeof prisma,
  salidaId: string,
  ahora: Date = new Date(),
  excluirApartado?: string,
): Promise<Ocupacion> {
  const [reservas, apartados] = await Promise.all([
    db.tourBooking.aggregate({
      _sum: { adults: true, children: true },
      where: { salidaId, status: { notIn: NO_OCUPAN } },
    }),
    db.apartadoSalida.aggregate({
      _sum: { personas: true },
      where: {
        salidaId,
        estado: "activo",
        expiraEl: { gt: ahora },
        ...(excluirApartado ? { id: { not: excluirApartado } } : {}),
      },
    }),
  ]);
  const confirmados = (reservas._sum.adults ?? 0) + (reservas._sum.children ?? 0);
  const enPago = apartados._sum.personas ?? 0;
  return { confirmados, enPago, ocupados: confirmados + enPago };
}

/** La ocupación de varias salidas de una vez, para el calendario. Sin candado. */
export async function ocupacionDeVarias(ids: string[], ahora: Date = new Date()): Promise<Map<string, Ocupacion>> {
  const out = new Map<string, Ocupacion>(ids.map((id) => [id, { confirmados: 0, enPago: 0, ocupados: 0 }]));
  if (!ids.length) return out;
  const [reservas, apartados] = await Promise.all([
    prisma.tourBooking.groupBy({
      by: ["salidaId"],
      _sum: { adults: true, children: true },
      where: { salidaId: { in: ids }, status: { notIn: NO_OCUPAN } },
    }),
    prisma.apartadoSalida.groupBy({
      by: ["salidaId"],
      _sum: { personas: true },
      where: { salidaId: { in: ids }, estado: "activo", expiraEl: { gt: ahora } },
    }),
  ]);
  for (const r of reservas) {
    const o = out.get(r.salidaId as string);
    if (o) o.confirmados = (r._sum.adults ?? 0) + (r._sum.children ?? 0);
  }
  for (const a of apartados) {
    const o = out.get(a.salidaId);
    if (o) o.enPago = a._sum.personas ?? 0;
  }
  for (const o of Array.from(out.values())) o.ocupados = o.confirmados + o.enPago;
  return out;
}

/** Libres, nunca negativo. */
export function libres(capacidad: number, o: Ocupacion): number {
  return Math.max(0, capacidad - o.ocupados);
}
