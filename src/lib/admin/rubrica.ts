// La rúbrica del score de WhatsApp. Puro: lo usan la pantalla, la ruta, el
// agente y las pruebas.
//
// Dos versiones (17 nov 2026):
// - v1 (4 nov): las 14 reglas que Manolo usó cada jueves hasta el 12 nov
//   (`docs/rediseno-panel.md`). Se conserva para leer esas semanas igual.
// - v2 «Estructura de oro» (desde la semana del 16 nov): las 9 etapas que
//   siguen las reservas exitosas en 232 chats reales (PDF «Estructura de oro de
//   reservas por WhatsApp», 16 nov). Pesa más lo que separa una reserva de un
//   chat perdido: el PDF a todo calificado y el seguimiento.
// Puente: la semana base (5–12 nov) se calificó con las dos (80 con v1).
//
// Cada regla vale `puntos` × (chats que la cumplen ÷ chats donde aplica). Si
// una regla no aplicó esa semana (0 chats) se deja fuera y el total se
// reescala a 100. Bandas: 85–100 meta, 70–84 cerca, menos de 70 corregir.

export interface ReglaRubrica { clave: string; texto: string; puntos: number; aplica: string }

export const RUBRICA_V1: ReglaRubrica[] = [
  { clave: "primer-5min",     texto: "Primer mensaje en 5 min o menos",          puntos: 10, aplica: "Solo clientes nuevos" },
  { clave: "se-presenta",     texto: "Se presenta con su nombre",                puntos: 5,  aplica: "Todos" },
  { clave: "cotiza-a-todos",  texto: "Cotiza a todo el que da fecha y personas", puntos: 10, aplica: "Solo clientes nuevos" },
  { clave: "cotiza-30min",    texto: "Cotiza en 30 min o menos",                 puntos: 4,  aplica: "Cotizaciones" },
  { clave: "pdf",             texto: "Cotización en PDF",                        puntos: 4,  aplica: "Cotizaciones" },
  { clave: "pdf-correo",      texto: "PDF también por correo",                   puntos: 4,  aplica: "Cotizaciones" },
  { clave: "anticipo-30",     texto: "Dice el anticipo de 30 %",                 puntos: 4,  aplica: "Cotizaciones (no el tour del mismo día pagado completo)" },
  { clave: "vigencia",        texto: "Dice la vigencia",                         puntos: 4,  aplica: "Cotizaciones (igual que arriba)" },
  { clave: "siguiente-paso",  texto: "Termina con siguiente paso",               puntos: 12, aplica: "Último mensaje de la semana; no cuenta si el tour ya ocurrió" },
  { clave: "link-o-msi",      texto: "Ofrece link de pago o meses sin intereses", puntos: 4, aplica: "Cotizaciones en PDF" },
  { clave: "reserva-avisada", texto: "Reserva confirmada y avisada",             puntos: 4,  aplica: "Reservas" },
  { clave: "seguimiento-d3",  texto: "Seguimiento a más tardar el día 3",        puntos: 25, aplica: "Cotizaciones sin respuesta de clientes nuevos cuyo día 3 ya pasó (si el tour llega antes, antes del tour)" },
  { clave: "llamada-escrito", texto: "Lo hablado por llamada, por escrito",      puntos: 5,  aplica: "Chats con llamada" },
  { clave: "sin-caritas",     texto: "Sin caritas",                              puntos: 5,  aplica: "Todos" },
];

export const RUBRICA_V2: ReglaRubrica[] = [
  { clave: "primer-5min",        texto: "Bienvenida en 5 min o menos",                                                puntos: 10, aplica: "Clientes nuevos que escriben en horario (8:00–20:00); se mide solo" },
  { clave: "se-presenta",        texto: "Se presenta con su nombre",                                                   puntos: 3,  aplica: "Clientes nuevos" },
  { clave: "califica",           texto: "Califica en 2 mensajes o menos: fechas, personas y edades, dónde se hospedan y qué les emociona", puntos: 5, aplica: "Clientes nuevos que no dieron esos datos solos" },
  { clave: "itinerario",         texto: "Propone día por día con 1 a 3 tours (no solo el catálogo)",                   puntos: 7,  aplica: "Chats con fecha y personas" },
  { clave: "cotiza-a-todos",     texto: "Cotización en PDF a todo el que da fecha y personas",                         puntos: 15, aplica: "Chats con fecha y personas" },
  { clave: "cotiza-30min",       texto: "Cotiza en 30 min o menos desde que tiene los datos",                          puntos: 5,  aplica: "Cotizaciones" },
  { clave: "mensaje-cotizacion", texto: "Al cotizar: vigencia, anticipo de 30 % con monto y «¿Te envío los pasos para reservar?»", puntos: 8, aplica: "Cotizaciones" },
  { clave: "pago-completo",      texto: "Datos bancarios, OXXO y liga con tarjeta en el mismo mensaje",                puntos: 5,  aplica: "Chats a los que se mandó cómo pagar" },
  { clave: "confirmacion",       texto: "Comprobante → «Recibí tu comprobante», confirmación PDF, qué llevar y dónde los recogemos", puntos: 7, aplica: "Reservas de la semana" },
  { clave: "seguimiento-d3",     texto: "Seguimiento a tiempo y con algo concreto (3 h, 24 h, 72 h, víspera de vencer)", puntos: 18, aplica: "Propuestas y cotizaciones sin respuesta cuyo día 3 ya pasó" },
  { clave: "resena",             texto: "Después del viaje: «¿Cómo les fue?» y liga de reseña",                        puntos: 5,  aplica: "Reservas cuyo viaje terminó en la semana" },
  { clave: "siguiente-paso",     texto: "Termina con una pregunta que lleva al siguiente paso",                        puntos: 6,  aplica: "Último mensaje de la semana; no cuenta si el tour ya ocurrió o el cliente dijo que no" },
  { clave: "promesas",           texto: "Cumple lo que promete a la hora (o avisa antes)",                             puntos: 3,  aplica: "Chats con una promesa de hora o de «te aviso»" },
  { clave: "forma",              texto: "Lo hablado por llamada, por escrito; nada interno al cliente; sin caritas",   puntos: 3,  aplica: "Todos" },
];

export type VersionRubrica = 1 | 2;
/** La de hoy: la que usan las semanas nuevas y el agente. */
export const VERSION_ACTUAL: VersionRubrica = 2;
export const RUBRICA = RUBRICA_V2;
export const rubricaDe = (v: VersionRubrica): ReglaRubrica[] => (v === 1 ? RUBRICA_V1 : RUBRICA_V2);
export const NOMBRE_VERSION: Record<VersionRubrica, string> = { 1: "Rúbrica anterior (hasta el 12 nov)", 2: "Estructura de oro" };

const SOLO_V1 = new Set(RUBRICA_V1.map(r => r.clave).filter(c => !RUBRICA_V2.some(r => r.clave === c)));
/** Con qué rúbrica se capturó una semana: la marca `_version` o, si no la trae, por sus reglas. */
export function versionDeCaptura(raw: unknown): VersionRubrica {
  if (!raw || typeof raw !== "object") return VERSION_ACTUAL;
  const v = (raw as Record<string, unknown>)._version;
  if (v === 1 || v === 2) return v;
  return Object.keys(raw).some(k => SOLO_V1.has(k)) ? 1 : VERSION_ACTUAL;
}

export const META_SCORE = 85;

/** Lo capturado de una regla: en cuántos chats aplicó y cuántos la cumplieron. */
export interface CapturaRegla { aplican: number; cumplen: number }
export type CapturaRubrica = Record<string, CapturaRegla>;

export interface ResultadoRegla extends ReglaRubrica { aplican: number; cumplen: number; pct: number | null; obtenidos: number | null }
export interface ResultadoScore { score: number | null; reglas: ResultadoRegla[]; puntosAplicables: number; peores: ResultadoRegla[] }

const entero = (v: unknown) => { const n = Math.round(Number(v)); return Number.isFinite(n) && n >= 0 ? Math.min(n, 10_000) : 0; };

/** Limpia lo que llega del navegador: solo reglas conocidas, enteros, y cumplen ≤ aplican. */
export function limpiarCaptura(raw: unknown, version: VersionRubrica = versionDeCaptura(raw)): CapturaRubrica {
  const out: CapturaRubrica = {};
  if (!raw || typeof raw !== "object") return out;
  for (const r of rubricaDe(version)) {
    const v = (raw as Record<string, unknown>)[r.clave] as { aplican?: unknown; cumplen?: unknown } | undefined;
    if (!v || typeof v !== "object") continue;
    const aplican = entero(v.aplican);
    out[r.clave] = { aplican, cumplen: Math.min(entero(v.cumplen), aplican) };
  }
  return out;
}

/** El score de la semana (0–100, reescalado) y lo que más puntos le costó. */
export function calcularScore(captura: CapturaRubrica, version: VersionRubrica = VERSION_ACTUAL): ResultadoScore {
  const reglas = rubricaDe(version).map(r => {
    const c = captura[r.clave];
    const aplican = c?.aplican ?? 0;
    const cumplen = Math.min(c?.cumplen ?? 0, aplican);
    const pct = aplican > 0 ? cumplen / aplican : null;
    return { ...r, aplican, cumplen, pct: pct === null ? null : Math.round(pct * 100), obtenidos: pct === null ? null : r.puntos * pct };
  });
  const aplicables = reglas.filter(r => r.obtenidos !== null);
  const puntosAplicables = aplicables.reduce((t, r) => t + r.puntos, 0);
  const score = puntosAplicables ? Math.round((aplicables.reduce((t, r) => t + (r.obtenidos ?? 0), 0) / puntosAplicables) * 100) : null;
  // Lo que más puntos perdió, para las recomendaciones de la semana.
  const peores = aplicables
    .map(r => ({ r, perdidos: r.puntos - (r.obtenidos ?? 0) }))
    .filter(x => x.perdidos > 0.0001)
    .sort((a, b) => b.perdidos - a.perdidos)
    .slice(0, 3)
    .map(x => x.r);
  return { score, reglas, puntosAplicables, peores };
}

export type BandaScore = "meta" | "cerca" | "corregir";
export function bandaScore(score: number | null): BandaScore | null {
  if (score === null) return null;
  return score >= META_SCORE ? "meta" : score >= 70 ? "cerca" : "corregir";
}
export const ETIQUETA_BANDA: Record<BandaScore, string> = { meta: "Meta cumplida", cerca: "Cerca", corregir: "Hay que corregir" };

/** Recomendaciones propuestas: las 3 reglas que más puntos costaron, con cuántos chats fallaron. */
export function recomendacionesSugeridas(r: ResultadoScore): string[] {
  return r.peores.map(x => `${x.texto}: se cumplió en ${x.cumplen} de ${x.aplican} chats (${x.pct} %). Vale ${x.puntos} puntos.`);
}
