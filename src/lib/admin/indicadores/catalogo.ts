// El catálogo de indicadores: los KPIs del documento «Plan As Is / To Be»
// (4 nov 2026), con su fórmula, fuente, línea base y metas.
//
// Línea base ANTES del panel (17 nov 2026, doc «Línea base y tablero de
// métricas»): lo de WhatsApp se midió POR CHAT en el export de 232 chats
// reales (18 sep–16 nov) con el script `wa_linea_base.py`, porque con la
// Bandeja en vivo cada chat será un lead. Las tasas con cohorte de 14 días
// usan los chats que empezaron del 21 sep al 1 nov; las de rapidez, los del
// 19 oct al 15 nov. Las metas que cambiaron con la base nueva son las de la
// «Estructura de oro» y las decide Manolo. Es la ÚNICA lista:
// las pestañas, la de Metas y las pruebas salen de aquí.
//
// Reglas del documento que viven en estas definiciones:
// - «Cada uno tiene una sola fórmula y una sola fuente».
// - «La semana va de lunes a domingo, en hora de México».
// - «En temporada alta se juzgan tasas, no totales» → los conteos llevan su
//   periodo de meta y solo se juzgan en él.
// Lo marcado «info» no tiene meta en el documento (p. ej. todo Precio): se mide
// para fijarla después con datos.

import type { DefKpi, Frente } from "./tipos";

export const PAGINA_FRENTE: Record<Frente, string> = {
  demanda: "/admin/demanda",
  comercial: "/admin/embudo",
  operacion: "/admin/ocupacion",
  producto: "/admin/portafolio",
  precio: "/admin/precios",
  servicio: "/admin/experiencia",
  datos: "/admin/metas",
};

export const ETIQUETA_FRENTE: Record<Frente, string> = {
  demanda: "Demanda y canales",
  comercial: "Comercial",
  operacion: "Operación",
  producto: "Producto",
  precio: "Precio",
  servicio: "Servicio",
  datos: "Datos confiables",
};

type SinPagina = Omit<DefKpi, "pagina">;
const k = (d: SinPagina): DefKpi => ({ ...d, pagina: PAGINA_FRENTE[d.frente] });

export const KPIS: DefKpi[] = [
  // ── Demanda y canales (GA4 + panel) ────────────────────────────────────────
  k({ clave: "sesiones", frente: "demanda", nombre: "Sesiones", fuente: "GA4", frecuencia: "semanal",
      formula: "Sesiones del periodo; el desglose por canal va en la tabla.", unidad: "num", tipo: "conteo", direccion: "info",
      base: { texto: "6,121 en 28 días (7 oct – 3 nov)", valor: 6121 } }),
  k({ clave: "tasa-contacto", frente: "demanda", nombre: "Tasa de contacto del sitio", fuente: "GA4", frecuencia: "semanal",
      formula: "(Contactos por WhatsApp + formularios + compras) ÷ sesiones.", unidad: "pct", tipo: "tasa", direccion: "subir",
      base: { texto: "2.2 % (134 de 6,121)", valor: 2.2 }, meta: { valor: 3.5, texto: "3.5 %" }, metaSS: { valor: 4, texto: "4 %" }, objetivo: 1 }),
  k({ clave: "contactos-mil-tours", frente: "demanda", nombre: "Contactos por 1,000 vistas · Tours", fuente: "GA4", frecuencia: "semanal",
      formula: "Contactos por WhatsApp en las páginas de tours ÷ sus vistas × 1,000.", unidad: "porMil", tipo: "tasa", direccion: "subir",
      base: { texto: "35", valor: 35 }, meta: { valor: 40, texto: "40" } }),
  k({ clave: "contactos-mil-blog", frente: "demanda", nombre: "Contactos por 1,000 vistas · Blog", fuente: "GA4", frecuencia: "semanal",
      formula: "Contactos por WhatsApp en los artículos del blog ÷ sus vistas × 1,000.", unidad: "porMil", tipo: "tasa", direccion: "subir",
      base: { texto: "2.7", valor: 2.7 }, meta: { valor: 6, texto: "6" } }),
  k({ clave: "conversion-pago", frente: "demanda", nombre: "Conversión del pago en línea", fuente: "GA4", frecuencia: "semanal",
      formula: "Compras ÷ personas que inician el pago.", unidad: "pct", tipo: "tasa", direccion: "subir",
      base: { texto: "8 % (5 de 66)", valor: 8 }, meta: { valor: 25, texto: "25 %" }, metaSS: { valor: 30, texto: "30 %" }, objetivo: 3 }),
  k({ clave: "reservas-web", frente: "demanda", nombre: "Reservas pagadas en la web", fuente: "Panel", frecuencia: "semanal",
      formula: "Reservas creadas por el pago en línea (folio web), sin canceladas.", unidad: "num", tipo: "conteo", direccion: "subir",
      base: { texto: "5 en 28 días", valor: 5 }, meta: { valor: 16, texto: "16 en 28 días" }, periodoMeta: "28d" }),
  k({ clave: "peso-organico", frente: "demanda", nombre: "Peso de Google orgánico", fuente: "GA4", frecuencia: "mensual",
      formula: "Sesiones de búsqueda orgánica ÷ sesiones.", unidad: "pct", tipo: "tasa", direccion: "bajar",
      base: { texto: "81 %", valor: 81 }, meta: { valor: 75, texto: "menos de 75 %" } }),
  k({ clave: "leads-canal", frente: "demanda", nombre: "Leads con canal de origen", fuente: "CRM", frecuencia: "semanal",
      formula: "Leads nuevos con canal registrado (no «por confirmar») ÷ leads nuevos.", unidad: "pct", tipo: "tasa", direccion: "subir",
      base: { texto: "Sin dato" }, meta: { valor: 100, texto: "100 %" } }),

  // ── Comercial (CRM, Bandeja, cotizaciones y reservas) ──────────────────────
  k({ clave: "lead-reserva", frente: "comercial", nombre: "Lead → reserva", fuente: "CRM", frecuencia: "semanal",
      formula: "Leads que entraron en el periodo y tienen una reserva viva con dinero cobrado ÷ leads nuevos del periodo. Cohorte cerrada 14 días después: lo que pasa más tarde ya no cuenta. Sin los leads que nacieron de una reserva ni los importados.",
      unidad: "pct", tipo: "tasa", direccion: "subir",
      base: { texto: "21 % por chat (32 de 155 · chats del 21 sep–1 nov)", valor: 21 }, meta: { valor: 30, texto: "30 %" }, metaSS: { valor: 30, texto: "30 %" }, objetivo: 2 }),
  k({ clave: "respuesta-5min", frente: "comercial", nombre: "Primer mensaje en 5 min", fuente: "Bandeja", frecuencia: "semanal",
      formula: "Chats nuevos que escribieron en horario (8:00–20:00) y recibieron respuesta en 5 min o menos ÷ chats nuevos en horario.",
      unidad: "pct", tipo: "tasa", direccion: "subir",
      base: { texto: "72 % (43 de 60 chats nuevos en horario · 19 oct–15 nov)", valor: 72 }, meta: { valor: 90, texto: "90 %" } }),
  k({ clave: "leads-cotizados", frente: "comercial", nombre: "Leads cotizados", fuente: "CRM", frecuencia: "semanal",
      formula: "Leads que entraron en el periodo y llegaron a cotizado o más (o se les envió una cotización) en los 14 días siguientes ÷ leads nuevos del periodo. Sin los nacidos de una reserva ni los importados.", unidad: "pct", tipo: "tasa", direccion: "subir",
      base: { texto: "35 % por chat (55 de 155 · chats del 21 sep–1 nov)", valor: 35 }, meta: { valor: 60, texto: "60 %" } }),
  k({ clave: "pdf-calificados", frente: "comercial", nombre: "PDF a todo calificado", fuente: "CRM", frecuencia: "semanal",
      formula: "Leads que entraron en el periodo y llegaron a calificado (tour, fecha y personas): cuántos recibieron su cotización en PDF en los 14 días siguientes. Con PDF reserva el 47 %; sin PDF, el 6 %.", unidad: "pct", tipo: "tasa", direccion: "subir",
      base: { texto: "45 % por chat (55 de 123 · chats del 21 sep–1 nov)", valor: 45 }, meta: { valor: 100, texto: "100 % (todo calificado recibe PDF)" } }),
  k({ clave: "calificados-sin-cotizar", frente: "comercial", nombre: "Calificados sin cotización", fuente: "CRM", frecuencia: "diaria",
      formula: "Hoy: leads de las últimas 8 semanas que llevan más de 24 h en «Calificado» sin cotización.", unidad: "num", tipo: "conteo", direccion: "bajar",
      base: { texto: "93 chats calificados sin PDF ni reserva (18 sep–16 nov)", valor: 93 }, meta: { valor: 0, texto: "0" } }),
  k({ clave: "cotizacion-reserva", frente: "comercial", nombre: "Cotización → reserva (número)", fuente: "Panel", frecuencia: "semanal",
      formula: "Cotizaciones que salieron al cliente en el periodo (por su fecha de envío; sin borradores) y se aceptaron en 14 días o menos desde el envío ÷ cotizaciones enviadas.", unidad: "pct", tipo: "tasa", direccion: "subir",
      base: { texto: "47 % (26 de 55 PDF por chat · 21 sep–1 nov)", valor: 47 }, meta: { valor: 55, texto: "55 %" } }),
  k({ clave: "cotizacion-reserva-monto", frente: "comercial", nombre: "Cotización → reserva (monto)", fuente: "Panel", frecuencia: "semanal",
      formula: "Monto de las cotizaciones aceptadas en 14 días o menos desde su envío ÷ monto de las enviadas en el periodo.", unidad: "pct", tipo: "tasa", direccion: "subir",
      base: { texto: "23 %", valor: 23 }, meta: { valor: 35, texto: "35 %" } }),
  k({ clave: "seguimiento", frente: "comercial", nombre: "Seguimiento a tiempo", fuente: "CRM", frecuencia: "semanal",
      formula: "Leads que pasaron a cotizado y a las 72 h no habían pagado: cuántos recibieron seguimiento (mensaje enviado desde la Bandeja o tarea marcada hecha) entre 1 y 72 h ÷ los que lo necesitaban.",
      unidad: "pct", tipo: "tasa", direccion: "subir",
      base: { texto: "87 % (26 de 30 cotizados · 19 oct–15 nov)", valor: 87 }, meta: { valor: 95, texto: "95 %" } }),
  k({ clave: "score", frente: "comercial", nombre: "Score del operador", fuente: "Revisión del jueves", frecuencia: "semanal",
      formula: "Rúbrica «Estructura de oro» (14 reglas, 100 puntos) sobre los chats de la semana. Hasta el 12 nov se usó la rúbrica anterior.", unidad: "pct", tipo: "promedio", direccion: "subir",
      base: { texto: "80 con la rúbrica anterior (5–12 nov) · ver doc para la v2", valor: 80 }, meta: { valor: 85, texto: "85" } }),
  k({ clave: "reservas-mes", frente: "comercial", nombre: "Reservas", fuente: "Panel", frecuencia: "mensual",
      formula: "Reservas capturadas en el periodo (por fecha de captura), sin canceladas ni borradores.", unidad: "num", tipo: "conteo", direccion: "subir",
      base: { texto: "33 en octubre", valor: 33 }, meta: { valor: 43, texto: "43 al mes" }, periodoMeta: "mes" }),
  k({ clave: "vendido-mes", frente: "comercial", nombre: "Vendido", fuente: "Panel", frecuencia: "mensual",
      formula: "Suma del total de las reservas capturadas en el periodo.", unidad: "pesos", tipo: "monto", direccion: "subir",
      base: { texto: "$238,889 en octubre", valor: 238889 }, meta: { valor: 310000, texto: "$310,000 al mes" }, periodoMeta: "mes" }),
  k({ clave: "ticket", frente: "comercial", nombre: "Ticket promedio", fuente: "Panel", frecuencia: "mensual",
      formula: "Vendido ÷ reservas del periodo.", unidad: "pesos", tipo: "promedio", direccion: "subir",
      base: { texto: "$7,239", valor: 7239 }, meta: { valor: 8000, texto: "$8,000" } }),
  k({ clave: "saldos-vencidos", frente: "comercial", nombre: "Saldos vencidos", fuente: "Panel", frecuencia: "diaria",
      formula: "Saldo pendiente de las reservas cuyo último día de tour ya pasó, al día de hoy.", unidad: "pesos", tipo: "monto", direccion: "bajar",
      base: { texto: "$5,750", valor: 5750 }, meta: { valor: 0, texto: "$0" } }),

  // ── Operación (salidas, corte y bitácora) ──────────────────────────────────
  k({ clave: "pax-salida", frente: "operacion", nombre: "Personas por salida", fuente: "Panel", frecuencia: "semanal",
      formula: "Personas ÷ salidas (tour + día) de los tours regulares con fecha en el periodo; sin viaje CDMX, RZR, buceo, salidas a medida ni renglones de concepto.", unidad: "dec", tipo: "promedio", direccion: "subir",
      base: { texto: "2.8 (noviembre)", valor: 2.8 }, meta: { valor: 3.5, texto: "3.5" }, metaSS: { valor: 4, texto: "4.0" }, objetivo: 4 }),
  k({ clave: "bajo-minimo", frente: "operacion", nombre: "Salidas bajo mínimo", fuente: "Panel", frecuencia: "semanal",
      formula: "Salidas regulares (no a medida) con 2 personas o menos.", unidad: "num", tipo: "conteo", direccion: "bajar",
      base: { texto: "8 en noviembre", valor: 8 }, meta: { valor: 3, texto: "3 o menos al mes" }, periodoMeta: "mes" }),
  // Lote 9 (10 nov 2026): el oficial es el del corte (con comisiones); el
  // estimado por salida va aparte y sin meta.
  k({ clave: "margen", frente: "operacion", nombre: "Margen del corte", fuente: "Corte semanal", frecuencia: "semanal",
      formula: "Utilidad ÷ ventas de los cortes CERRADOS de las semanas del periodo (ya descontadas las comisiones de Stripe y el hosting).", unidad: "pct", tipo: "tasa", direccion: "subir",
      base: { texto: "30 % (19–25 oct, único corte)", valor: 30 }, meta: { valor: 35, texto: "35 %" } }),
  k({ clave: "margen-salidas", frente: "operacion", nombre: "Margen estimado por salida", fuente: "Panel", frecuencia: "semanal",
      formula: "(Ingreso − costos) ÷ ingreso de las salidas regulares con costos (los del corte o, si no, los del Cotizador). El ingreso es lo cobrado de cada renglón, después de descuentos y del total editado. Sin comisiones: es una estimación.", unidad: "pct", tipo: "tasa", direccion: "info",
      base: { texto: "Sin medir" } }),
  k({ clave: "cortes-tiempo", frente: "operacion", nombre: "Cortes cerrados a tiempo", fuente: "Bitácora", frecuencia: "semanal",
      formula: "Semanas terminadas cuyo corte se hizo por primera vez a más tardar el lunes siguiente ÷ semanas terminadas.", unidad: "pct", tipo: "tasa", direccion: "subir",
      base: { texto: "1 corte cerrado" }, meta: { valor: 100, texto: "100 %" } }),
  k({ clave: "checklist", frente: "operacion", nombre: "Checklist completo", fuente: "Panel", frecuencia: "semanal",
      formula: "Salidas que ya pasaron con el checklist completo ÷ salidas que ya pasaron.", unidad: "pct", tipo: "tasa", direccion: "subir",
      base: { texto: "Sin medir" }, meta: { valor: 100, texto: "100 %" } }),
  k({ clave: "incidencias", frente: "operacion", nombre: "Salidas con incidencia", fuente: "Panel", frecuencia: "mensual",
      formula: "Salidas que ya pasaron con al menos una incidencia anotada ÷ salidas que ya pasaron.", unidad: "pct", tipo: "tasa", direccion: "bajar",
      base: { texto: "Sin medir" }, meta: { valor: 5, texto: "menos de 5 %" } }),
  k({ clave: "pax-reserva", frente: "operacion", nombre: "Personas por reserva", fuente: "Panel", frecuencia: "mensual",
      formula: "Personas ÷ reservas capturadas en el periodo (tamaño del grupo).", unidad: "dec", tipo: "promedio", direccion: "info",
      base: { texto: "2.6 (64 % con 1 o 2 personas)", valor: 2.6 } }),
  k({ clave: "mismo-dia", frente: "operacion", nombre: "Reservas para hoy o mañana", fuente: "Panel", frecuencia: "mensual",
      formula: "Reservas capturadas el mismo día del tour o el anterior ÷ reservas capturadas.", unidad: "pct", tipo: "tasa", direccion: "info",
      base: { texto: "42 % (14 de 33)", valor: 42 } }),

  // ── Producto ───────────────────────────────────────────────────────────────
  k({ clave: "tours-margen", frente: "producto", nombre: "Tours con margen medido", fuente: "Cotizador", frecuencia: "mensual",
      formula: "Tours activos del catálogo (sin RZR ni salidas a medida) con costos capturados en el Cotizador ÷ tours activos.", unidad: "pct", tipo: "tasa", direccion: "subir",
      base: { texto: "1 de 11", valor: 9 }, meta: { valor: 100, texto: "todos" }, metaSS: { valor: 100, texto: "todos" }, objetivo: 5 }),
  k({ clave: "reservas-hotel", frente: "producto", nombre: "Reservas con hotel", fuente: "Panel", frecuencia: "mensual",
      formula: "Reservas con noches de hotel vendidas (renglón de hotel o viaje CDMX) ÷ reservas capturadas.", unidad: "pct", tipo: "tasa", direccion: "subir",
      base: { texto: "7 % (7 de 97)", valor: 7 }, meta: { valor: 12, texto: "12 %" } }),
  k({ clave: "peso-tamul", frente: "producto", nombre: "Peso de Tamul en lo cobrado", fuente: "Panel", frecuencia: "mensual",
      formula: "Cobrado de Tamul (repartido por renglón, como en Ventas) ÷ cobrado total.", unidad: "pct", tipo: "tasa", direccion: "info",
      base: { texto: "35 % (may–nov)", valor: 35 } }),
  k({ clave: "hospedaje-ofrecido", frente: "producto", nombre: "Cotizaciones de 2+ días con hospedaje", fuente: "Panel", frecuencia: "mensual",
      formula: "Cotizaciones con tours en 2 o más días que incluyen hotel ÷ cotizaciones con tours en 2 o más días.", unidad: "pct", tipo: "tasa", direccion: "info",
      base: { texto: "Sin medir" } }),

  // ── Precio (informativo: el documento no trae metas de precio) ─────────────
  k({ clave: "realizacion-precio", frente: "precio", nombre: "Realización de precio", fuente: "Panel", frecuencia: "mensual",
      formula: "Lo vendido en tours por persona ÷ su precio de lista para ese tamaño de grupo y fecha.", unidad: "pct", tipo: "tasa", direccion: "info",
      base: { texto: "Sin medir" } }),
  k({ clave: "precio-persona", frente: "precio", nombre: "Precio promedio por persona", fuente: "Panel", frecuencia: "mensual",
      formula: "Lo vendido en tours que se cobran por persona ÷ personas.", unidad: "pesos", tipo: "promedio", direccion: "info",
      base: { texto: "Sin medir" } }),
  k({ clave: "reservas-con-descuento", frente: "precio", nombre: "Reservas con descuento", fuente: "Panel", frecuencia: "mensual",
      formula: "Reservas con descuento manual, código web o código de cumpleaños ÷ reservas.", unidad: "pct", tipo: "tasa", direccion: "info",
      base: { texto: "Sin medir" } }),
  k({ clave: "descuento-promedio", frente: "precio", nombre: "Descuento sobre la venta", fuente: "Panel", frecuencia: "mensual",
      formula: "Pesos descontados ÷ venta antes de descuento.", unidad: "pct", tipo: "tasa", direccion: "info",
      base: { texto: "Sin medir" } }),
  k({ clave: "perdidas-precio", frente: "precio", nombre: "Pérdidas por precio", fuente: "CRM", frecuencia: "mensual",
      formula: "Leads que se perdieron en el periodo con motivo «precio» ÷ leads perdidos.", unidad: "pct", tipo: "tasa", direccion: "info",
      base: { texto: "Sin medir" } }),

  // ── Servicio ───────────────────────────────────────────────────────────────
  k({ clave: "resenas", frente: "servicio", nombre: "Reseñas", fuente: "Google (lectura a mano)", frecuencia: "semanal",
      formula: "Reseñas nuevas de Google (de la lectura del lunes en que empieza el periodo a la del lunes siguiente a que termina) ÷ reservas operadas (su último día de tour cae en el periodo).", unidad: "pct", tipo: "tasa", direccion: "subir",
      base: { texto: "Sin medir" }, meta: { valor: 40, texto: "40 %" }, metaSS: { valor: 40, texto: "40 %" }, objetivo: 6 }),
  k({ clave: "resena-pedida", frente: "servicio", nombre: "Reseña pedida", fuente: "Bandeja", frecuencia: "semanal",
      formula: "Reservas cuyo viaje terminó en el periodo y que tienen chat en la Bandeja: a cuántas les escribimos la liga o la palabra «reseña» desde el último día del tour hasta 14 días después.", unidad: "pct", tipo: "tasa", direccion: "subir",
      base: { texto: "39 % (19 de 49 reservas por chat · 18 sep–16 nov)", valor: 39 }, meta: { valor: 100, texto: "100 %" } }),
  k({ clave: "nps", frente: "servicio", nombre: "Recomendación (NPS)", fuente: "Encuesta", frecuencia: "mensual",
      formula: "% que da 9–10 − % que da 0–6 a «¿nos recomendarías?», de las encuestas contestadas en el periodo.", unidad: "num", tipo: "promedio", direccion: "info",
      base: { texto: "Sin medir" } }),
  k({ clave: "respuesta-encuesta", frente: "servicio", nombre: "Encuestas contestadas", fuente: "Encuesta", frecuencia: "mensual",
      formula: "Encuestas contestadas ÷ encuestas enviadas en el periodo.", unidad: "pct", tipo: "tasa", direccion: "subir",
      base: { texto: "0 de 9", valor: 0 }, meta: { valor: 30, texto: "30 % (para que el NPS valga)" } }),
  k({ clave: "vuelven", frente: "servicio", nombre: "Clientes que vuelven", fuente: "Panel", frecuencia: "mensual",
      formula: "Clientes con 2 o más reservas ÷ clientes (todas las reservas hasta el fin del periodo).", unidad: "pct", tipo: "tasa", direccion: "subir",
      base: { texto: "2 % (2 de 95)", valor: 2 }, meta: { valor: 4, texto: "4 %" } }),
  k({ clave: "checkin", frente: "servicio", nombre: "Check-in contestado", fuente: "Panel", frecuencia: "mensual",
      formula: "Reservas operadas en el periodo con check-in contestado ÷ reservas operadas.", unidad: "pct", tipo: "tasa", direccion: "info",
      base: { texto: "0 de 97", valor: 0 } }),

  // ── Datos confiables (objetivo 7) ──────────────────────────────────────────
  k({ clave: "datos-confiables", frente: "datos", nombre: "Reservas con canal y fecha correctos", fuente: "Panel", frecuencia: "semanal",
      formula: "Reservas capturadas en el periodo con canal (no «por confirmar») y capturadas ANTES del tour ÷ reservas capturadas.", unidad: "pct", tipo: "tasa", direccion: "subir",
      base: { texto: "Sin dato confiable" }, meta: { valor: 100, texto: "100 %" }, metaSS: { valor: 100, texto: "100 %" }, objetivo: 7 }),
];

export const KPI: Record<string, DefKpi> = Object.fromEntries(KPIS.map(d => [d.clave, d]));

export const kpisDe = (frente: Frente) => KPIS.filter(d => d.frente === frente);

/** Los 7 objetivos del documento, con su indicador principal. */
export const OBJETIVOS: { n: number; titulo: string; kpi: string }[] = [
  { n: 1, titulo: "Convertir más visitas de la web en contactos", kpi: "tasa-contacto" },
  { n: 2, titulo: "Convertir más contactos en reservas", kpi: "lead-reserva" },
  { n: 3, titulo: "Que el pago en línea funcione", kpi: "conversion-pago" },
  { n: 4, titulo: "Llenar mejor cada salida", kpi: "pax-salida" },
  { n: 5, titulo: "Saber cuánto deja cada tour", kpi: "tours-margen" },
  { n: 6, titulo: "Que el cliente regrese y recomiende", kpi: "resenas" },
  { n: 7, titulo: "Tener datos confiables", kpi: "datos-confiables" },
];
