/**
 * Cuántos lugares quedan de un evento, sin tocar la base: recibe las reservas y
 * lo anotado a mano, y hace la cuenta. Vive aparte de `cupoPaquete.ts` (que sí
 * lee Prisma) para poder probarla sola y para que el cliente la pueda importar.
 *
 * Dos unidades (4 oct 2026):
 *  - "habitacion" (el paquete con hotel): cada reserva ocupa UN cuarto, sea
 *    una pareja o una familia de cuatro. Además, la salida de la noche tiene
 *    tope de personas (`salidaMaxima`): cuatro familias de cuatro no caben en
 *    una camioneta de doce.
 *  - "persona" (la Noche de Xantolo): cada lugar es un asiento.
 */

export type UnidadCupo = "habitacion" | "persona";

export interface EventoCupo {
  unidad: UnidadCupo;
  cupo: number;
  salidaMaxima: number;
}

/** Lo vendido por fuera del sitio (WhatsApp, en persona), como lo anota el equipo. */
export interface ManualCupo {
  /** En la unidad del evento: cuartos o personas. */
  unidades: number;
  /** Personas de esas ventas (en "persona" es lo mismo que `unidades`). */
  personas: number;
}

export interface LugaresPaquete {
  unidad: UnidadCupo;
  cupo: number;
  /** Vendido en el sitio, en la unidad del evento. */
  enLinea: number;
  /** Vendido por fuera, en la unidad del evento. */
  manual: number;
  /** Personas vendidas por fuera (para el tope de la salida). */
  manualPersonas: number;
  vendidos: number;
  libres: number;
  /** Personas que todavía caben en la salida de la noche. */
  personasLibres: number;
}

/**
 * Lee lo que guarda `Config` para un evento.
 *
 * Formato de hoy: `{"unidades":1,"personas":4}`. Formato viejo (hasta el 4 oct):
 * un número de PERSONAS, cuando el paquete se vendía por pareja; en cuartos eso
 * son `ceil(personas / 2)`.
 */
export function leerManual(valor: string | null | undefined, unidad: UnidadCupo): ManualCupo {
  const texto = (valor ?? "").trim();
  if (!texto) return { unidades: 0, personas: 0 };
  if (texto.startsWith("{")) {
    try {
      const d = JSON.parse(texto) as { unidades?: unknown; personas?: unknown };
      const unidades = Math.max(0, Math.floor(Number(d.unidades) || 0));
      const personas = Math.max(0, Math.floor(Number(d.personas) || 0));
      return unidad === "persona"
        ? { unidades, personas: unidades }
        : { unidades, personas: Math.max(personas, unidades * 2) };
    } catch {
      return { unidades: 0, personas: 0 };
    }
  }
  const personasViejas = Math.max(0, Math.floor(Number(texto) || 0));
  return unidad === "persona"
    ? { unidades: personasViejas, personas: personasViejas }
    : { unidades: Math.ceil(personasViejas / 2), personas: personasViejas };
}

/** Lo que se guarda en `Config`. */
export function escribirManual(m: ManualCupo): string {
  return JSON.stringify({ unidades: m.unidades, personas: m.personas });
}

/**
 * La cuenta. `reservas` son las del sitio que NO están canceladas, con sus
 * adultos y menores.
 */
export function resumirLugares(
  ev: EventoCupo,
  reservas: { adults?: number | null; children?: number | null }[],
  manual: ManualCupo,
): LugaresPaquete {
  const personasEnLinea = reservas.reduce((s, r) => s + (r.adults || 0) + (r.children || 0), 0);
  const enLinea = ev.unidad === "habitacion" ? reservas.length : personasEnLinea;
  const vendidos = enLinea + manual.unidades;
  const personasVendidas = personasEnLinea + manual.personas;
  return {
    unidad: ev.unidad,
    cupo: ev.cupo,
    enLinea,
    manual: manual.unidades,
    manualPersonas: manual.personas,
    vendidos,
    libres: Math.max(0, ev.cupo - vendidos),
    personasLibres: Math.max(0, ev.salidaMaxima - personasVendidas),
  };
}

/** ¿Cabe un grupo de `personas` en lo que queda? */
export function cabeEnCupo(l: LugaresPaquete, personas: number): boolean {
  if (personas < 1) return false;
  if (l.unidad === "habitacion") return l.libres >= 1 && l.personasLibres >= personas;
  return l.libres >= personas;
}

/** «Quedan 3 de 4 cuartos» / «Quedan 9 de 12 lugares». */
export function textoLugares(l: Pick<LugaresPaquete, "unidad" | "libres" | "cupo">): string {
  const cosa = l.unidad === "habitacion"
    ? (l.cupo === 1 ? "cuarto" : "cuartos")
    : (l.cupo === 1 ? "lugar" : "lugares");
  return `Quedan ${l.libres} de ${l.cupo} ${cosa}`;
}
