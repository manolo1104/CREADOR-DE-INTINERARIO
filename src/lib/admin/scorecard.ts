// El scorecard semanal (prompt del rediseño, 3 nov 2026): 8 KPI con su meta,
// el embudo de la semana y dónde está la mayor caída. Puro: recibe los
// conteos ya hechos (`scorecardDatos.ts` los junta) y devuelve lo que se pinta.
// Las fórmulas son las del prompt y no se cambian sin anotarlo aquí.

import type { TonoEstado } from "@/components/admin/ui/ChipEstado";
import type { ValorKpi } from "./indicadores/tipos";

export interface EntradaScorecard {
  /** Lo capturado en la revisión del jueves (null = no se ha capturado). */
  leadsNuevos: number | null;
  respuestas5min: number | null;
  /** De la Bandeja (Fase 2.3): chats nuevos en horario y cuántos se contestaron en 5 min. Se usa si la revisión no trae el número. */
  respuestaBandeja?: { en5: number; enHorario: number } | null;
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
  /**
   * Lote 9 (10 nov 2026): lo comercial de la semana calculado con las MISMAS
   * funciones de «Embudo comercial» (`indicadores/comercial.ts`): la cohorte
   * de leads, Lead → reserva, leads cotizados, primer mensaje en 5 min y el
   * embudo. Si viene con leads, manda; si no, se usa la revisión del jueves.
   */
  comercial?: { leads: number; leadReserva: ValorKpi; leadsCotizados: ValorKpi; respuesta5: ValorKpi; embudo: PasoEmbudo[] } | null;
  /** El corte de la semana (lote 9): de aquí sale «Margen del corte», el KPI oficial con meta (lleva Stripe y hosting). */
  corte?: { ventas: number; utilidad: number; cerrado: boolean } | null;
  /** Reseñas con la fórmula de «Experiencia» (lote 9): lecturas de Google de lunes a lunes. */
  resenas?: ValorKpi | null;
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
  // 4 nov 2026: «Calidad» pasó a llamarse «Servicio» (menú por categorías) y el
  // score del operador es Comercial, como en el plan As Is / To Be.
  area: "Embudo" | "Comercial" | "Operación" | "Dinero" | "Servicio";
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

/** «23 de 76 leads» y su nota, para el contexto de una tarjeta. */
const detalleDe = (v: ValorKpi) => [v.detalle, v.preliminar ? "preliminar: la cohorte tiene menos de 14 días" : ""].filter(Boolean).join(" · ");

export function calcularScorecard(e: EntradaScorecard): Scorecard {
  const com = e.comercial && e.comercial.leads > 0 ? e.comercial : null;
  const leads = com ? com.leads : e.leadsNuevos;
  const cotizados = e.leadsCotizados ?? e.cotizadosDelPanel;
  const kpis: Kpi[] = [];

  // 1. Leads nuevos: la cohorte del CRM con «Leads cotizados» de Embudo (lote 9); sin ella, lo capturado.
  if (com) {
    const lc = com.leadsCotizados;
    kpis.push({
      clave: "leads", etiqueta: "Leads nuevos", area: "Embudo",
      valor: String(com.leads),
      contexto: lc.valor === null ? "Sin leads en el CRM" : `${Math.round(lc.valor)} % cotizados (${detalleDe(lc)}) · meta ${METAS.leadsCotizados} %`,
      estado: lc.valor === null ? sinDato : contraMeta(lc.valor, METAS.leadsCotizados),
      conDato: true,
    });
  } else kpis.push({
    clave: "leads", etiqueta: "Leads nuevos", area: "Embudo",
    valor: leads === null ? "—" : String(leads),
    contexto: leads === null ? "Captúralo en la revisión del jueves" : `${cotizados} cotizados (${pct(cotizados, leads)} %, meta ${METAS.leadsCotizados} %)`,
    estado: leads === null ? sinDato : contraMeta(pct(cotizados, leads), METAS.leadsCotizados),
    conDato: leads !== null,
  });
  // 2. Primer mensaje en 5 min: la fórmula de Embudo (Bandeja primero, revisión de respaldo; lote 9).
  const r5c = e.comercial?.respuesta5 && e.comercial.respuesta5.valor !== null ? e.comercial.respuesta5 : null;
  if (r5c) {
    kpis.push({
      clave: "respuesta", etiqueta: "Primer mensaje en 5 min", area: "Embudo",
      valor: `${Math.round(r5c.valor!)} %`,
      contexto: `${r5c.detalle ?? ""}${r5c.calidad === "aproximado" ? " (revisión del jueves)" : ""} · meta ${METAS.respuesta5min} %`,
      estado: contraMeta(r5c.valor!, METAS.respuesta5min),
      conDato: true,
    });
  }
  const deBandeja = e.respuestas5min === null && !!e.respuestaBandeja && e.respuestaBandeja.enHorario > 0;
  const r5 = deBandeja ? pct(e.respuestaBandeja!.en5, e.respuestaBandeja!.enHorario) : e.leadsNuevos !== null && e.respuestas5min !== null ? pct(e.respuestas5min, e.leadsNuevos) : null;
  if (!r5c) kpis.push({
    clave: "respuesta", etiqueta: "Primer mensaje en 5 min", area: "Embudo",
    valor: r5 === null ? "—" : `${r5} %`,
    contexto: r5 === null ? "De la revisión del jueves" : deBandeja ? `${e.respuestaBandeja!.en5} de ${e.respuestaBandeja!.enHorario} chats nuevos en horario (Bandeja) · meta ${METAS.respuesta5min} %` : `${e.respuestas5min} de ${e.leadsNuevos} leads · meta ${METAS.respuesta5min} %`,
    estado: r5 === null ? sinDato : contraMeta(r5, METAS.respuesta5min),
    conDato: r5 !== null,
  });
  // 3. Lead → reserva. Con leads en el CRM, la de «Embudo comercial» (cohorte
  // cerrada a 14 días y «reservó» = reserva viva con dinero; lote 9); sin
  // ellos, como antes: reservas de la semana ÷ leads de la revisión del jueves.
  const lr = com?.leadReserva ?? null;
  const conv = lr ? (lr.valor === null ? null : Math.round(lr.valor)) : leads !== null && leads > 0 ? pct(e.reservasCreadas, leads) : null;
  kpis.push({
    clave: "conversion", etiqueta: "Lead → reserva", area: "Comercial",
    valor: conv === null ? "—" : `${conv} %`,
    contexto: lr
      ? `${(lr.detalle ?? "").replace(/ leads$/, "")} leads de la semana reservaron con dinero${lr.preliminar ? " (preliminar: la cohorte tiene menos de 14 días)" : ""} · meta ${METAS.leadReserva} %`
      : conv === null ? `${e.reservasCreadas} reservas esta semana; faltan los leads` : `${e.reservasCreadas} reservas de ${leads} leads · meta ${METAS.leadReserva} %`,
    estado: conv === null ? sinDato : contraMeta(conv, METAS.leadReserva),
    conDato: conv !== null,
  });
  // 4. Personas por salida (sin viaje CDMX, RZR, buceo, a medida ni conceptos: los filtra quien llama, lote 9).
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
  // 6. Margen del corte: el KPI OFICIAL con meta (lote 9, 10 nov 2026). Sale
  // del corte cerrado de la semana y ya lleva Stripe y hosting; antes la meta
  // del 35 % se juzgaba con el margen estimado por salida, que no los lleva.
  const c = e.corte && e.corte.cerrado && e.corte.ventas > 0 ? e.corte : null;
  const margenCorte = c ? pct(c.utilidad, c.ventas) : null;
  kpis.push({
    clave: "margen", etiqueta: "Margen del corte", area: "Dinero",
    valor: margenCorte === null ? "—" : `${margenCorte} %`,
    contexto: c ? `${pesos(c.utilidad)} de ${pesos(c.ventas)} del corte (con comisiones) · meta ${METAS.margen} %` : "El corte de esta semana no está cerrado",
    estado: margenCorte === null ? { tono: "neutro", texto: "Corte sin cerrar" } : contraMeta(margenCorte, METAS.margen),
    conDato: margenCorte !== null,
  });
  // 6b. Margen estimado por salida: informativo, SIN meta (lote 9). Ingreso
  // después de descuentos y del total editado; sin comisiones.
  const margen = e.ingresoConCostos > 0 ? pct(e.margenConCostos, e.ingresoConCostos) : null;
  kpis.push({
    clave: "margen-estimado", etiqueta: "Margen estimado por salida", area: "Dinero",
    valor: margen === null ? "—" : `${margen} %`,
    contexto: margen === null ? "Ninguna salida con costos capturados" : `${pesos(e.margenConCostos)} en ${e.salidasConCostos} de ${e.salidas} salidas con costos · sin comisiones`,
    estado: { tono: "neutro", texto: margen === null ? "Faltan costos" : "Estimado · sin meta" },
    conDato: margen !== null,
  });
  // 7. Score WhatsApp.
  kpis.push({
    clave: "score", etiqueta: "Score WhatsApp", area: "Comercial",
    valor: e.score === null ? "—" : `${e.score} / 100`,
    contexto: e.score === null ? "De la revisión del jueves" : `Meta ${METAS.score}`,
    estado: e.score === null ? sinDato : e.score >= 85 ? { tono: "bien", texto: "Meta cumplida" } : e.score >= 70 ? { tono: "atencion", texto: "Cerca" } : { tono: "problema", texto: "Hay que corregir" },
    conDato: e.score !== null,
  });
  // 8. Reseñas: la fórmula de «Experiencia» (lecturas de Google de lunes a
  // lunes, lote 9); sin lecturas, lo capturado en la revisión.
  const rs = e.resenas && e.resenas.valor !== null ? e.resenas : null;
  if (rs) {
    kpis.push({
      clave: "resenas", etiqueta: "Reseñas", area: "Servicio",
      valor: `${Math.round(rs.valor!)} %`,
      contexto: `${rs.detalle ?? ""}${rs.calidad === "aproximado" && rs.nota ? ` (${rs.nota})` : ""} · meta ${METAS.resenas} %`,
      estado: contraMeta(rs.valor!, METAS.resenas),
      conDato: true,
    });
  }
  const tasa = e.resenasNuevas !== null && e.reservasOperadas > 0 ? pct(e.resenasNuevas, e.reservasOperadas) : null;
  if (!rs) kpis.push({
    clave: "resenas", etiqueta: "Reseñas", area: "Servicio",
    valor: tasa === null ? "—" : `${tasa} %`,
    contexto: tasa === null ? (e.reservasOperadas === 0 ? "Sin reservas operadas esta semana" : "Anota las reseñas nuevas de Google") : `${e.resenasNuevas} reseñas de ${e.reservasOperadas} reservas operadas · meta ${METAS.resenas} %`,
    estado: tasa === null ? sinDato : contraMeta(tasa, METAS.resenas),
    conDato: tasa !== null,
  });

  // Embudo: el de «Embudo comercial» si hay cohorte (lote 9; «reservaron» ya
  // es con dinero); si no, Leads → Cotizados → Reserva → Anticipo pagado.
  const pasos: PasoEmbudo[] = com ? com.embudo : [
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
