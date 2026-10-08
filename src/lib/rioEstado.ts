/**
 * Estado del río que anuncia la banda del sitio (BandaRio).
 *
 * Manolo lo fija desde el panel (clave `rio_estado` de la tabla `Config`);
 * en "auto" —o si la tabla aún no existe— manda la temporada de
 * `temporada.ts`: caudal alto (agua con sedimento) de julio al 29 de octubre y
 * agua turquesa del 30 de octubre a junio.
 *
 * 🔴 Este archivo ya no tiene regla propia de meses. La que tenía (jun–oct
 * caudal) contradecía a temporada.ts en junio y, en octubre, ponía «caudal
 * alto por lluvias» encima de «estamos en la mejor temporada». Si hay que
 * mover una fecha, se mueve en temporada.ts y la franja la sigue sola.
 */
import { rioSegunTemporada } from "@/lib/temporada";

export type RioEstado = "turquesa" | "caudal";

/** Lo que guarda el panel. "auto" delega en la temporada. */
export type RioConfig = {
  estado: RioEstado | "auto";
  /** Una línea opcional de Manolo ("Tamul navegable desde el sábado"). */
  nota?: string;
};

export const RIO_CONFIG_KEY = "rio_estado";

/**
 * El estado que dicta la temporada (lo usan /api/rio-estado en «auto» y el
 * panel para decir qué se anuncia). Se queda con su nombre y su firma; la
 * regla vive en `rioSegunTemporada`.
 */
export function rioPorTemporada(ahora?: Date): RioEstado {
  return rioSegunTemporada(ahora);
}

/** Normaliza lo que venga del panel o de la BD a un RioConfig válido. */
export function normalizarRioConfig(crudo: unknown): RioConfig {
  const o = (typeof crudo === "object" && crudo !== null ? crudo : {}) as Record<string, unknown>;
  const estado = o.estado === "turquesa" || o.estado === "caudal" ? o.estado : "auto";
  const nota = typeof o.nota === "string" && o.nota.trim() ? o.nota.trim().slice(0, 140) : undefined;
  return { estado, nota };
}
