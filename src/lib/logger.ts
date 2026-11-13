type LogLevel = "info" | "warn" | "error";

// ── Datos de clientes en los logs (lote 8, 10 nov 2026) ─────────────────────
// 🔴 Los logs de Railway los lee cualquiera con acceso al proyecto y se
// guardan días: cada «RESERVÓ», «ABRIÓ EL PAGO» o error de correo imprimía el
// nombre completo, el correo y el teléfono del cliente. Ahora todo lo que pasa
// por `logger` y `actividad` sale enmascarado: «ju***@gmail.com», «***4567» y
// «Juan P.». Para encontrar a alguien, el folio o el id del pago (esos sí
// salen) y el panel.

const RE_CORREO = /([A-Za-z0-9._%+-]{1,64})@([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,})/g;
// Un número de 10 a 13 cifras con o sin «+», espacios, guiones o paréntesis,
// que no sea parte de un folio, un id ni una fecha («pi_3N…», «HP-…», «2026-11-10»).
const RE_TELEFONO = /(?<![\w.\-/:$])\+?\d[\d\s().-]{8,}\d(?![\w-])/g;

/** «juan.perez@gmail.com» → «ju***@gmail.com». */
export function enmascararCorreo(correo: string): string {
  return correo.replace(RE_CORREO, (_m, usuario: string, dominio: string) => `${usuario.slice(0, 2)}***@${dominio}`);
}

/** Correos y teléfonos dentro de cualquier texto, enmascarados. */
export function enmascararTexto(texto: string): string {
  return enmascararCorreo(texto).replace(RE_TELEFONO, m => {
    const cifras = m.replace(/\D/g, "");
    // Una marca de tiempo en milisegundos (13 cifras, «17…») no es un teléfono.
    if (cifras.length < 10 || cifras.length > 13 || (/^\d+$/.test(m) && cifras.length === 13 && !cifras.startsWith("52"))) return m;
    return `***${cifras.slice(-4)}`;
  });
}

/** «Juan Pérez López» → «Juan P.»: el nombre de pila y la inicial. */
export function nombreParaLog(nombre: string | null | undefined): string {
  const partes = String(nombre ?? "").trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return "";
  return partes.length > 1 ? `${partes[0]} ${partes[1][0].toUpperCase()}.` : partes[0];
}

/** Las claves del log estructurado que traen el nombre de un cliente. */
const CLAVES_NOMBRE = new Set(["customerName", "nombre", "cliente", "name"]);

interface LogEntry {
  level: LogLevel;
  event: string;
  [key: string]: unknown;
}

function log(level: LogLevel, event: string, data?: Record<string, unknown>) {
  const datos = data
    ? Object.fromEntries(Object.entries(data).map(([k, v]) => [k, CLAVES_NOMBRE.has(k) && typeof v === "string" ? nombreParaLog(v) : v]))
    : undefined;
  const entry: LogEntry = {
    level,
    event,
    ts: new Date().toISOString(),
    ...datos,
  };
  // Railway captura stdout — JSON estructurado para fácil búsqueda. Sin
  // correos ni teléfonos de clientes (lote 8).
  console.log(enmascararTexto(JSON.stringify(entry)));
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
  // Sin correos ni teléfonos de clientes (lote 8); los nombres los pasa cada
  // llamada por `nombreParaLog`.
  console.log(enmascararTexto(`[${hora}]  ${[etiqueta, ...partes].join("  ·  ")}`));
}

// Formatea pesos mexicanos para los logs: 2900 → "$2,900"
export function mxn(n: number | undefined | null): string {
  if (n == null || Number.isNaN(Number(n))) return "";
  return "$" + Math.round(Number(n)).toLocaleString("es-MX");
}

// Nombre corto del tour para el log (recorta el subtítulo de marketing):
// "Expedición Tamul — Tamul, Cueva del Agua y Sótano" → "Expedición Tamul"
export function nombreCorto(n: string | undefined | null): string {
  if (!n) return "";
  return String(n).split(/\s[—–-]\s/)[0].trim();
}
