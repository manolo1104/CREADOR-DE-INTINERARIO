// Utilidades de fecha en horario de México (America/Mexico_City, UTC−6 todo el año).
// Evita los desfases por usar UTC (toISOString) cerca de la medianoche.

const TZ = "America/Mexico_City";

/** "Hoy" en México como YYYY-MM-DD. */
export function hoyMX(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: TZ });
}

/** Fecha civil (YYYY-MM-DD) de un instante, en horario de México. */
export function ymdMX(d: Date | string | number): string {
  return new Date(d).toLocaleDateString("en-CA", { timeZone: TZ });
}

/** Partes {year, month(0–11), day} de un instante, en horario de México. */
export function partsMX(d: Date | string | number): { year: number; month: number; day: number } {
  const [year, month, day] = ymdMX(d).split("-").map(Number);
  return { year, month: month - 1, day };
}

/** Suma (o resta) días a un YYYY-MM-DD y devuelve YYYY-MM-DD. */
export function addDaysYMD(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().split("T")[0];
}

/** Día de la semana (0=Dom … 6=Sáb) de un YYYY-MM-DD civil. */
export function weekdayYMD(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
}

/** Instante que corresponde al inicio (00:00 MX) del primer día del mes dado. */
export function mxMonthStart(year: number, month0: number): Date {
  // 00:00 en México = 06:00 UTC (UTC−6 fijo).
  return new Date(Date.UTC(year, month0, 1, 6, 0, 0));
}
