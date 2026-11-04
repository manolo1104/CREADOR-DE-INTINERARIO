// La rúbrica del score de WhatsApp (Fase 3 del rediseño, 4 nov 2026). Es la
// que Manolo ya usa cada jueves: se respeta tal cual para poder comparar
// semanas (`docs/rediseno-panel.md`, «Rúbrica del score de WhatsApp»).
// Puro: lo usan la pantalla, la ruta y las pruebas.
//
// Cada regla vale `puntos` × (chats que la cumplen ÷ chats donde aplica). Si
// una regla no aplicó esa semana (0 chats) se deja fuera y el total se
// reescala a 100. Bandas: 85–100 meta, 70–84 cerca, menos de 70 corregir.

export interface ReglaRubrica { clave: string; texto: string; puntos: number; aplica: string }

export const RUBRICA: ReglaRubrica[] = [
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

export const META_SCORE = 85;

/** Lo capturado de una regla: en cuántos chats aplicó y cuántos la cumplieron. */
export interface CapturaRegla { aplican: number; cumplen: number }
export type CapturaRubrica = Record<string, CapturaRegla>;

export interface ResultadoRegla extends ReglaRubrica { aplican: number; cumplen: number; pct: number | null; obtenidos: number | null }
export interface ResultadoScore { score: number | null; reglas: ResultadoRegla[]; puntosAplicables: number; peores: ResultadoRegla[] }

const entero = (v: unknown) => { const n = Math.round(Number(v)); return Number.isFinite(n) && n >= 0 ? Math.min(n, 10_000) : 0; };

/** Limpia lo que llega del navegador: solo reglas conocidas, enteros, y cumplen ≤ aplican. */
export function limpiarCaptura(raw: unknown): CapturaRubrica {
  const out: CapturaRubrica = {};
  if (!raw || typeof raw !== "object") return out;
  for (const r of RUBRICA) {
    const v = (raw as Record<string, unknown>)[r.clave] as { aplican?: unknown; cumplen?: unknown } | undefined;
    if (!v || typeof v !== "object") continue;
    const aplican = entero(v.aplican);
    out[r.clave] = { aplican, cumplen: Math.min(entero(v.cumplen), aplican) };
  }
  return out;
}

/** El score de la semana (0–100, reescalado) y lo que más puntos le costó. */
export function calcularScore(captura: CapturaRubrica): ResultadoScore {
  const reglas = RUBRICA.map(r => {
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
