/**
 * Estado del río que anuncia la banda del sitio (BandaRio).
 *
 * Manolo lo fija desde el panel (clave `rio_estado` de la tabla `Config`);
 * en "auto" —o si la tabla aún no existe— manda la temporada: jun–oct es
 * época de lluvia (caudal alto, agua con sedimento) y nov–may el agua va
 * turquesa. Es la misma lectura de temporada que usa el resto del sitio
 * (`temporada.ts`), reducida a lo único que la banda necesita.
 */

export type RioEstado = "turquesa" | "caudal";

/** Lo que guarda el panel. "auto" delega en la temporada. */
export type RioConfig = {
  estado: RioEstado | "auto";
  /** Una línea opcional de Manolo ("Tamul navegable desde el sábado"). */
  nota?: string;
};

export const RIO_CONFIG_KEY = "rio_estado";

/** Mes actual en la Huasteca (Railway corre en UTC). */
function mesEnMexico(ahora?: Date): number {
  const iso = (ahora ?? new Date()).toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
  return Number(iso.split("-")[1]);
}

/** El estado que dicta la temporada: jun–oct caudal alto, nov–may turquesa. */
export function rioPorTemporada(ahora?: Date): RioEstado {
  const mes = mesEnMexico(ahora);
  return mes >= 6 && mes <= 10 ? "caudal" : "turquesa";
}

/** Normaliza lo que venga del panel o de la BD a un RioConfig válido. */
export function normalizarRioConfig(crudo: unknown): RioConfig {
  const o = (typeof crudo === "object" && crudo !== null ? crudo : {}) as Record<string, unknown>;
  const estado = o.estado === "turquesa" || o.estado === "caudal" ? o.estado : "auto";
  const nota = typeof o.nota === "string" && o.nota.trim() ? o.nota.trim().slice(0, 140) : undefined;
  return { estado, nota };
}
