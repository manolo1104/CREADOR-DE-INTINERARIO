// El scorecard semanal (prompt del rediseño, 3 nov 2026): 8 KPI con su meta,
// el embudo de la semana y dónde está la mayor caída. Puro: recibe los
// conteos ya hechos (`scorecardDatos.ts` los junta) y devuelve lo que se pinta.
// Las fórmulas son las del prompt y no se cambian sin anotarlo aquí.

import type { TonoEstado } from "@/components/admin/ui/ChipEstado";

export interface EntradaScorecard {
  /** Lo capturado en la revisión del jueves (null = no se ha capturado). */
  leadsNuevos: number | null;
  respuestas5min: number | null;
  /** Clientes cotizados: capturado, o contado del panel si no. */
  leadsCotizados: number | null;
  cotizadosDelPanel: number;
  score: number | null;
  resenasNuevas: number | null;
  /** Reservas CREADAS en la semana (por fecha de captura). */
  reservasCreadas: number;
  /** De esas, cuántas ya tienen anticipo o pago. */
  conAnticipo: number;
  vendidoSemana: number;
  vendidoMes: number;
  /** Salidas OPERADAS en la semana (por fecha de tour). */
  salidas: number;
  personas: number;
  /** Solo las salidas con costos capturados. */
  ingresoConCostos: number;
  margenConCostos: number;
  salidasConCostos: number;
  /** Reservas cuyo último tour cayó en la semana (para la tasa de reseñas). */
  reservasOperadas: number;
}

export const METAS = {
  leadReserva: 40,      // %
  respuesta5min: 90,    // %
  leadsCotizados: 80,   // %
  paxPorSalida: 3.5,
  vendidoMes: 310_000,
  margen: 35,           // %
  score: 85,
  resenas: 40,          // %
} as const;

export interface Kpi {
  clave: string;
  etiqueta: string;
  area: "Embudo" | "Comercial" | "Operación" | "Dinero" | "Calidad";
  valor: string;
  contexto: string;
  estado: { tono: TonoEstado; texto: string };
  /** Falso cuando el dato aún no existe (no se capturó la revisión). */
  conDato: boolean;
}

export interface PasoEmbudo { etiqueta: string; n: number; conversion: number | null }

export interface Scorecard {
  kpis: Kpi[];
  embudo: PasoEmbudo[];
  /** El paso con la mayor caída, en palabras; null si no hay datos. */
  mayorCaida: string | null;
}

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
const pesos = (n: number) => `$${Math.round(n).toLocaleString("es-MX")}`;
const sinDato = { tono: "neutro" as TonoEstado, texto: "Sin capturar" };

/** Contra una meta «más es mejor»: en meta desde la meta, cerca desde el 85 % de la meta. */
function contraMeta(valor: number, meta: number): { tono: TonoEstado; texto: string } {
  if (valor >= meta) return { tono: "bien", texto: "En meta" };
  if (valor >= meta * 0.85) return { tono: "atencion", texto: "Cerca de meta" };
  return { tono: "problema", texto: "Debajo de meta" };
}

export function calcularScorecard(e: EntradaScorecard): Scorecard {
  const leads = e.leadsNuevos;
  const cotizados = e.leadsCotizados ?? e.cotizadosDelPanel;
  const kpis: Kpi[] = [];

  // 1. Leads nuevos (capturado).
  kpis.push({
    clave: "leads", etiqueta: "Leads nuevos", area: "Embudo",
    valor: leads === null ? "—" : String(leads),
    contexto: leads === null ? "Captúralo en la revisión del jueves" : `${cotizados} cotizados (${pct(cotizados, leads)} %, meta ${METAS.leadsCotizados} %)`,
    estado: leads === null ? sinDato : contraMeta(pct(cotizados, leads), METAS.leadsCotizados),
    conDato: leads !== null,
  });
  // 2. Primer mensaje en 5 min.
  const r5 = leads !== null && e.respuestas5min !== null ? pct(e.respuestas5min, leads) : null;
  kpis.push({
    clave: "respuesta", etiqueta: "Primer mensaje en 5 min", area: "Embudo",
    valor: r5 === null ? "—" : `${r5} %`,
    contexto: r5 === null ? "De la revisión del jueves" : `${e.respuestas5min} de ${leads} leads · meta ${METAS.respuesta5min} %`,
    estado: r5 === null ? sinDato : contraMeta(r5, METAS.respuesta5min),
    conDato: r5 !== null,
  });
  // 3. Lead → reserva.
  const conv = leads !== null && leads > 0 ? pct(e.reservasCreadas, leads) : null;
  kpis.push({
    clave: "conversion", etiqueta: "Lead → reserva", area: "Comercial",
    valor: conv === null ? "—" : `${conv} %`,
    contexto: conv === null ? `${e.reservasCreadas} reservas esta semana; faltan los leads` : `${e.reservasCreadas} reservas de ${leads} leads · meta ${METAS.leadReserva} %`,
    estado: conv === null ? sinDato : contraMeta(conv, METAS.leadReserva),
    conDato: conv !== null,
  });
  // 4. Personas por salida.
  const pax = e.salidas > 0 ? Math.round((e.personas / e.salidas) * 10) / 10 : 0;
  kpis.push({
    clave: "pax", etiqueta: "Personas por salida", area: "Operación",
    valor: e.salidas > 0 ? String(pax) : "—",
    contexto: e.salidas > 0 ? `${e.personas} personas en ${e.salidas} salidas · meta ${METAS.paxPorSalida}` : "Sin salidas esta semana",
    estado: e.salidas > 0 ? contraMeta(pax, METAS.paxPorSalida) : { tono: "neutro", texto: "Sin salidas" },
    conDato: e.salidas > 0,
  });
  // 5. Vendido.
  kpis.push({
    clave: "vendido", etiqueta: "Vendido en la semana", area: "Dinero",
    valor: pesos(e.vendidoSemana),
    contexto: `${e.reservasCreadas} reservas · mes: ${pesos(e.vendidoMes)} de ${pesos(METAS.vendidoMes)}`,
    estado: contraMeta(e.vendidoMes, METAS.vendidoMes).tono === "bien" ? { tono: "bien", texto: "Mes en meta" } : { tono: "neutro", texto: `${pct(e.vendidoMes, METAS.vendidoMes)} % de la meta del mes` },
    conDato: true,
  });
  // 6. Margen de contribución (solo salidas con costos).
  const margen = e.ingresoConCostos > 0 ? pct(e.margenConCostos, e.ingresoConCostos) : null;
  kpis.push({
    clave: "margen", etiqueta: "Margen de contribución", area: "Dinero",
    valor: margen === null ? "—" : `${margen} %`,
    contexto: margen === null ? "Ninguna salida con costos capturados" : `${pesos(e.margenConCostos)} en ${e.salidasConCostos} de ${e.salidas} salidas con costos · meta ${METAS.margen} %`,
    estado: margen === null ? { tono: "neutro", texto: "Faltan costos" } : contraMeta(margen, METAS.margen),
    conDato: margen !== null,
  });
  // 7. Score WhatsApp.
  kpis.push({
    clave: "score", etiqueta: "Score WhatsApp", area: "Calidad",
    valor: e.score === null ? "—" : `${e.score} / 100`,
    contexto: e.score === null ? "De la revisión del jueves" : `Meta ${METAS.score}`,
    estado: e.score === null ? sinDato : e.score >= 85 ? { tono: "bien", texto: "Meta cumplida" } : e.score >= 70 ? { tono: "atencion", texto: "Cerca" } : { tono: "problema", texto: "Hay que corregir" },
    conDato: e.score !== null,
  });
  // 8. Reseñas.
  const tasa = e.resenasNuevas !== null && e.reservasOperadas > 0 ? pct(e.resenasNuevas, e.reservasOperadas) : null;
  kpis.push({
    clave: "resenas", etiqueta: "Reseñas", area: "Calidad",
    valor: tasa === null ? "—" : `${tasa} %`,
    contexto: tasa === null ? (e.reservasOperadas === 0 ? "Sin reservas operadas esta semana" : "Anota las reseñas nuevas de Google") : `${e.resenasNuevas} reseñas de ${e.reservasOperadas} reservas operadas · meta ${METAS.resenas} %`,
    estado: tasa === null ? sinDato : contraMeta(tasa, METAS.resenas),
    conDato: tasa !== null,
  });

  // Embudo: Leads → Cotizados → Reserva → Anticipo pagado.
  const pasos: PasoEmbudo[] = [
    { etiqueta: "Leads", n: leads ?? 0, conversion: null },
    { etiqueta: "Cotizados", n: cotizados, conversion: leads ? pct(cotizados, leads) : null },
    { etiqueta: "Reservaron", n: e.reservasCreadas, conversion: cotizados ? pct(e.reservasCreadas, cotizados) : null },
    { etiqueta: "Anticipo pagado", n: e.conAnticipo, conversion: e.reservasCreadas ? pct(e.conAnticipo, e.reservasCreadas) : null },
  ];
  let mayorCaida: string | null = null;
  let peor = 101;
  for (let i = 1; i < pasos.length; i++) {
    const c = pasos[i].conversion;
    if (c !== null && c < peor) { peor = c; mayorCaida = `entre ${pasos[i - 1].etiqueta.toLowerCase()} y ${pasos[i].etiqueta.toLowerCase()}: ${pasos[i - 1].n - pasos[i].n} se quedan en el camino (${100 - c} %)`; }
  }
  return { kpis, embudo: pasos, mayorCaida };
}

/** El número de semana ISO de un lunes YYYY-MM-DD. */
export function numeroSemana(lunes: string): number {
  const d = new Date(`${lunes}T12:00:00Z`);
  const jueves = new Date(d); jueves.setUTCDate(d.getUTCDate() + 3);
  const inicioAnio = new Date(Date.UTC(jueves.getUTCFullYear(), 0, 1));
  return Math.ceil((((jueves.getTime() - inicioAnio.getTime()) / 86400000) + 1) / 7);
}
