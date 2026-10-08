// Solo servidor: cuenta el cupo en la base antes de apartar.
import { TOURS_DB } from "./tours";
import { MAX_ITEMS } from "./carrito";
import { addDaysYMD, hoyMX } from "./dates";
import { cupoDeTour, mensajeSinCupo, pedidosSinCupo, RANGO_MAX_DIAS, type SinCupo } from "./cupoTour";
import {
  apartadosVigentes, esIdApartado, guardarApartado, huellaIp, liberarApartado, nuevoIdApartado,
  type LineaApartada,
} from "./apartadosAlmacen";

/**
 * Apartar los lugares de un carrito por 15 minutos (el almacén y el porqué:
 * `lib/apartadosAlmacen.ts`). Lo llama `/api/tours/apartar` cada vez que el
 * carrito cambia de fecha, de gente o de recorridos, con el mismo id.
 *
 * Todo o nada: si un solo recorrido ya no cabe en su fecha, no se aparta
 * ninguno, se suelta lo que este id tuviera (ya no es el viaje que está
 * armando) y el cliente recibe el mismo mensaje que le daría el cobro, con los
 * días cercanos que sí tienen lugar. Apartar la mitad del viaje le pondría un
 * reloj que no cubre lo que va a pagar.
 */

/**
 * Apartados vivos por conexión: tres alcanzan para un cliente con dos o tres
 * pestañas; más ya es alguien bloqueando el calendario de los demás. Se cuenta
 * por la huella de la IP que ve `rateLimit`.
 */
const MAX_POR_IP = 3;

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Un renglón listo para apartar, con el cupo de su salida. */
type Linea = LineaApartada & { cupo: number };

export type ResultadoApartar =
  | { ok: true; id: string; vence: number }
  | { ok: false; sinCupo: SinCupo[]; mensajes: string[] }
  | { ok: false; error: string; status: number };

/**
 * Los renglones que se pueden apartar, juntos por recorrido y fecha (dos
 * renglones de 6 no caben donde quedan 8). Lo que no tiene forma de renglón es
 * un error; lo que simplemente no se aparta se ignora: el RZR (va por
 * vehículo, sin cupo por fecha), un renglón sin fecha todavía o con una que ya
 * no se vende.
 */
function normalizar(crudas: unknown): { lineas: Linea[] } | { error: string } {
  if (!Array.isArray(crudas)) return { error: "Faltan los recorridos." };
  if (crudas.length > MAX_ITEMS) return { error: `Máximo ${MAX_ITEMS} recorridos.` };
  const hoy = hoyMX();
  const tope = addDaysYMD(hoy, RANGO_MAX_DIAS);
  const juntas = new Map<string, Linea>();
  for (const cruda of crudas) {
    const r = (cruda && typeof cruda === "object" && !Array.isArray(cruda) ? cruda : {}) as Record<string, unknown>;
    const { slug, fecha, personas } = r;
    if (
      typeof slug !== "string" || slug.length > 80 || typeof fecha !== "string" ||
      typeof personas !== "number" || !Number.isInteger(personas) || personas < 1 || personas > 99
    ) {
      return { error: "Recorrido inválido." };
    }
    if (!fecha) continue;
    // Un día que existe (2026-02-30 no).
    if (!FECHA.test(fecha) || addDaysYMD(fecha, 0) !== fecha) return { error: "Fecha inválida." };
    const tour = TOURS_DB.find((t) => t.slug === slug);
    const cupo = tour ? cupoDeTour(tour) : null;
    if (cupo === null || fecha < hoy || fecha > tope) continue;
    const k = `${slug}|${fecha}`;
    juntas.set(k, { slug, fecha, personas: (juntas.get(k)?.personas ?? 0) + personas, cupo });
  }
  return { lineas: Array.from(juntas.values()) };
}

/**
 * Un apartado a la vez. Contar y guardar son dos pasos: si dos clientes piden
 * los últimos lugares al mismo tiempo, los dos contarían «caben» y los dos
 * guardarían. El sitio corre en UN solo servidor (el mismo supuesto de
 * `rateLimit`), así que basta una fila en memoria; con varias instancias haría
 * falta un candado en la base.
 */
let enCurso: Promise<unknown> = Promise.resolve();
function enFila<T>(tarea: () => Promise<T>): Promise<T> {
  const esta = enCurso.then(tarea, tarea);
  enCurso = esta.catch(() => undefined);
  return esta;
}

export async function apartar({ id, lineas: crudas, ip, locale = "es" }: {
  /** El que ya tiene este carrito, para reemplazarlo; sin él se crea uno. */
  id?: string;
  lineas: unknown;
  ip: string;
  locale?: "es" | "en";
}): Promise<ResultadoApartar> {
  const n = normalizar(crudas);
  if ("error" in n) return { ok: false, error: n.error, status: 400 };
  if (!n.lineas.length) return { ok: false, error: "No hay recorridos con fecha que apartar.", status: 400 };
  const propio = esIdApartado(id) ? id : undefined;
  const huella = huellaIp(ip);

  return enFila(async (): Promise<ResultadoApartar> => {
    const deEsaIp = (await apartadosVigentes(propio)).filter((a) => a.ip === huella).length;
    if (deEsaIp >= MAX_POR_IP) {
      return { ok: false, error: "Ya tienes otros lugares apartados. Termina ese pago o espera unos minutos.", status: 429 };
    }

    // La misma cuenta que el cobro, sin los lugares que este carrito ya tiene.
    const sinCupo = await pedidosSinCupo(n.lineas, { excluirApartado: propio });
    if (sinCupo.length) {
      if (propio) await liberarApartado(propio);
      return { ok: false, sinCupo, mensajes: sinCupo.map((s) => mensajeSinCupo(s, locale)) };
    }
    // Nunca más gente de la que cabe en la salida. Con la base sana esto ya lo
    // dijo `pedidosSinCupo`; si no pudo contar, deja pasar (es la regla del
    // cobro) y aquí se frena: un apartado sin contar no se guarda.
    if (n.lineas.some((l) => l.personas > l.cupo)) {
      return { ok: false, error: "No se pudo apartar. Intenta de nuevo.", status: 503 };
    }

    const nuevo = propio ?? nuevoIdApartado();
    const vence = await guardarApartado(nuevo, n.lineas.map(({ slug, fecha, personas }) => ({ slug, fecha, personas })), huella);
    return vence
      ? { ok: true, id: nuevo, vence }
      : { ok: false, error: "No se pudo apartar. Intenta de nuevo.", status: 503 };
  });
}
