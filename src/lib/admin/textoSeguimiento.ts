// El texto de un seguimiento tal como se lee en pantalla (19 nov 2026).
//
// Las reglas automáticas escriben el nombre COMPLETO del tour y la fecha en
// AAAA-MM-DD («Confirmar Expedición Tamul — Tamul, Cueva del Agua y Sótano del
// 2026-11-21 (…)»): en una columna angosta del panel eso eran diez renglones.
// Aquí se acorta al mostrarlo, así también se ven bien los que ya están
// guardados. Lo guardado no se toca.

const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** «Expedición Tamul — Tamul, Cueva del Agua y Sótano» → «Expedición Tamul». */
export function nombreCortoTour(nombre: string): string {
  const corto = String(nombre || "").split("—")[0].trim();
  return corto || String(nombre || "");
}

/** 2026-11-21 → «sáb 21 nov». Lo que no sea una fecha AAAA-MM-DD válida, tal cual. */
export function fechaLegible(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd || ""));
  if (!m) return String(ymd || "");
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  if (d.getUTCMonth() !== Number(m[2]) - 1) return String(ymd);
  return `${DIAS[d.getUTCDay()]} ${d.getUTCDate()} ${MESES[d.getUTCMonth()]}`;
}

/**
 * El título para la pantalla: sin el subtítulo largo del tour y con las
 * fechas legibles. «Confirmar Expedición Tamul — Tamul, Cueva del Agua y Sótano
 * del 2026-11-21 (3 reservas, 7 pax): …» → «Confirmar Expedición Tamul del sáb
 * 21 nov (3 reservas, 7 pax): …».
 */
export function tituloLegible(titulo: string): string {
  return String(titulo || "")
    .replace(/ — [^—]*? (del \d{4}-\d{2}-\d{2})/g, " $1")
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, (f) => fechaLegible(f));
}
