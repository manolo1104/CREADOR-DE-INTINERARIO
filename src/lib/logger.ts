type LogLevel = "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  event: string;
  [key: string]: unknown;
}

function log(level: LogLevel, event: string, data?: Record<string, unknown>) {
  const entry: LogEntry = {
    level,
    event,
    ts: new Date().toISOString(),
    ...data,
  };
  // Railway captura stdout — JSON estructurado para fácil búsqueda
  console.log(JSON.stringify(entry));
}

export const logger = {
  info: (event: string, data?: Record<string, unknown>) =>
    log("info", event, data),
  warn: (event: string, data?: Record<string, unknown>) =>
    log("warn", event, data),
  error: (event: string, data?: Record<string, unknown>) =>
    log("error", event, data),
};

// ─────────────────────────────────────────────────────────────
// Actividad del cliente — una línea LEGIBLE para escanear en los
// logs de Railway (además del JSON estructurado de arriba, que se
// usa para errores/depuración). Ejemplo de salida:
//   [12:34:07]  ✅  RESERVÓ  ·  Expedición Tamul  ·  2 adultos  ·  $2,900  ·  Juan Pérez  ·  15 ago  ·  #a1b2c
// Los campos vacíos/undefined se omiten solos, así una misma
// etiqueta se ve limpia aunque falte algún dato.
// ─────────────────────────────────────────────────────────────
export function actividad(
  etiqueta: string,
  ...campos: Array<string | number | null | undefined | false>
): void {
  let hora: string;
  try {
    hora = new Date().toLocaleTimeString("es-MX", {
      timeZone: "America/Mexico_City",
      hour12: false,
    });
  } catch {
    hora = new Date().toISOString().slice(11, 19);
  }
  const partes = campos.filter(
    (c): c is string | number =>
      c !== null && c !== undefined && c !== false && c !== "",
  );
  console.log(`[${hora}]  ${[etiqueta, ...partes].join("  ·  ")}`);
}

// Formatea pesos mexicanos para los logs: 2900 → "$2,900"
export function mxn(n: number | undefined | null): string {
  if (n == null || Number.isNaN(Number(n))) return "";
  return "$" + Math.round(Number(n)).toLocaleString("es-MX");
}

// Nombre corto del tour para el log (recorta el subtítulo de marketing):
// "Expedición Tamul — Sótano, Cañón & Cueva del Agua" → "Expedición Tamul"
export function nombreCorto(n: string | undefined | null): string {
  if (!n) return "";
  return String(n).split(/\s[—–-]\s/)[0].trim();
}
