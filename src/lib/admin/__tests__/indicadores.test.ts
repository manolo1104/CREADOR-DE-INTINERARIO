import { describe, expect, it } from "vitest";
import { leerPeriodo, periodoDe, serieDe, cohorteMadura } from "../indicadores/periodo";
import { seccionDePagina } from "../indicadores/secciones";
import { estadoContraMeta, formatear, pct } from "../indicadores/estado";
import { KPI, KPIS, OBJETIVOS } from "../indicadores/catalogo";
import { calcularDemanda, type DatosDemanda } from "../indicadores/demanda";
import { calificadosSinCotizar, leadReserva, pdfACalificados, seguimientoATiempo, type DatosComercial, type LeadCohorte } from "../indicadores/comercial";
import { pidioResena, resenaPedida } from "../indicadores/servicio";
import { aTiempo, calcularOperacion, type DatosOperacion } from "../indicadores/operacion";
import { clasificar, cobradoPorTour } from "../indicadores/producto";
import { datosConfiables } from "../indicadores/datos";
import { tasa } from "../indicadores/util";
import { canalDe } from "@/lib/ga4Datos";
import { reglaCorteLunes, reglaLecturaGoogle } from "../automatizaciones";
import { calcularScorecard, type EntradaScorecard } from "../scorecard";
import type { ValorKpi } from "../indicadores/tipos";

const HOY = "2026-11-04";
const val = (vs: ValorKpi[], k: string) => vs.find(v => v.clave === k)!;

describe("periodos (lunes a domingo, hora de México)", () => {
  it("la semana del 4 nov va del lunes 2 al domingo 8 y está en curso", () => {
    const p = periodoDe("semana", HOY, HOY);
    expect([p.desde, p.hasta, p.enCurso, p.siguiente]).toEqual(["2026-11-02", "2026-11-08", true, null]);
    expect(p.etiqueta).toBe("Semana 45 · 2–8 nov");
  });
  it("28 días al 3 nov = 7 oct – 3 nov: el periodo de la línea base del documento", () => {
    const p = leerPeriodo({ p: "28d" }, "semana", HOY);
    expect([p.desde, p.hasta]).toEqual(["2026-10-07", "2026-11-03"]);
  });
  it("lo inválido cae al periodo de omisión y nada empieza en el futuro", () => {
    expect(leerPeriodo({ p: "toString", f: "2027-01-01" }, "mes", HOY).desde).toBe("2026-11-01");
    expect(serieDe(periodoDe("mes", HOY, HOY), HOY, 8).map(x => x.corta)).toEqual(["abr", "may", "jun", "jul", "ago", "sep", "oct", "nov"]);
  });
  it("una cohorte madura 14 días después de terminar", () => {
    expect(cohorteMadura(periodoDe("semana", "2026-10-19", HOY), HOY)).toBe(false);
    expect(cohorteMadura(periodoDe("semana", "2026-10-12", HOY), HOY)).toBe(true);
  });
});

describe("secciones del sitio (calibradas el 4 nov contra GA4)", () => {
  it.each([
    ["/", "inicio"], ["/en", "ingles"], ["/en/tours/expedicion-tamul", "ingles"], ["/tours", "tours"],
    ["/tours-en-xilitla", "tours"], ["/tours/expedicion-tamul/", "tours"], ["/blog/xantolo-guia", "blog"],
    ["/experiencias", "otras"], ["/reservar-tour/abc", "reservar"], ["/destinos/la-trinidad-xilitla", "destinos"],
    ["/viaje-cdmx-xilitla", "viaje"], ["/info-practica", "guias"],
  ])("%s → %s", (path, sec) => expect(seccionDePagina(path)).toBe(sec));
});

describe("canales de GA4", () => {
  it("asistentes de IA, Maps por UTM y Google orgánico", () => {
    expect(canalDe("AI Assistant", "chatgpt.com", "(not set)")).toBe("ia");
    expect(canalDe("Referral", "perplexity.ai", "(referral)")).toBe("ia");
    expect(canalDe("Organic Search", "google", "perfil-maps")).toBe("maps");
    expect(canalDe("Organic Search", "google", "(organic)")).toBe("seo");
  });
});

describe("estado contra la meta", () => {
  const v = (clave: string, valor: number | null): ValorKpi => ({ clave, valor, calidad: "exacto" });
  it("tasa de contacto: 2.2 % debajo, 3 % cerca, 3.5 % en meta", () => {
    expect(estadoContraMeta(KPI["tasa-contacto"], v("tasa-contacto", 2.2), "28d")?.texto).toBe("Debajo de meta");
    expect(estadoContraMeta(KPI["tasa-contacto"], v("tasa-contacto", 3.0), "28d")?.texto).toBe("Cerca de meta");
    expect(estadoContraMeta(KPI["tasa-contacto"], v("tasa-contacto", 3.5), "semana")?.texto).toBe("En meta");
  });
  it("menos es mejor: saldos vencidos $0 en meta; peso de Google 81 % cerca de «menos de 75 %»", () => {
    expect(estadoContraMeta(KPI["saldos-vencidos"], v("saldos-vencidos", 0), "semana")?.tono).toBe("bien");
    expect(estadoContraMeta(KPI["saldos-vencidos"], v("saldos-vencidos", 5750), "semana")?.tono).toBe("problema");
    expect(estadoContraMeta(KPI["peso-organico"], v("peso-organico", 81), "mes")?.texto).toBe("Cerca de meta");
  });
  it("un conteo solo se juzga en el periodo de su meta (43 reservas es por mes)", () => {
    expect(estadoContraMeta(KPI["reservas-mes"], v("reservas-mes", 10), "semana")).toEqual({ tono: "neutro", texto: "Meta por mes" });
    expect(estadoContraMeta(KPI["reservas-mes"], v("reservas-mes", 43), "mes")?.texto).toBe("En meta");
  });
  it("formato: % con un decimal si es chico, pesos y por mil", () => {
    expect([formatear("pct", 2.19), formatear("pct", 30.3), formatear("pesos", 7239), formatear("porMil", 2.68), formatear("dec", 2.8)]).toEqual(["2.2 %", "30 %", "$7,239", "2.7", "2.8"]);
    expect(pct(134, 6121)).toBe(2.2);
  });
  it("el catálogo: 7 objetivos con su KPI y claves únicas", () => {
    expect(new Set(KPIS.map(k => k.clave)).size).toBe(KPIS.length);
    expect(OBJETIVOS.every(o => KPI[o.kpi]?.objetivo === o.n)).toBe(true);
  });
});

describe("demanda: la línea base del documento sale exacta (7 oct – 3 nov)", () => {
  const p = periodoDe("28d", "2026-11-03", HOY);
  const datos: DatosDemanda = {
    ga4: { ok: true, datos: {
      sesiones: 6121, vistas: 9439, leidoEn: "2026-11-04T12:00:00Z",
      eventos: { whatsapp_contact: { n: 98, personas: 91 }, generate_lead: { n: 31, personas: 29 }, purchase: { n: 5, personas: 5 }, begin_checkout: { n: 103, personas: 66 }, view_item: { n: 711, personas: 379 } },
      canales: [{ canal: "seo", sesiones: 4955, contactos: 99 }, { canal: "directo", sesiones: 926, contactos: 13 }],
      paginas: [
        { path: "/", vistas: 1423, whatsapp: 17, formularios: 0 },
        { path: "/tours/expedicion-tamul", vistas: 772, whatsapp: 27, formularios: 0 },
        { path: "/blog/xantolo", vistas: 4142, whatsapp: 11, formularios: 16 },
      ],
    } },
    serieGa4: { ok: false, motivo: "prueba" },
    reservasWeb: ["2026-10-10", "2026-10-15", "2026-10-20", "2026-10-25", "2026-11-01", "2026-11-04"],
    leads: [{ ymd: "2026-10-10", canal: "whatsapp" }, { ymd: "2026-10-11", canal: "por_confirmar" }],
    clicsPanel: 97, busquedas: [], sinLugar: 0, gsc: null, gscAnterior: null,
  };
  const m = calcularDemanda(datos, p, [p]);
  it("tasa de contacto 2.2 %, Tours 35, Blog 2.7, pago 5 de 66, Google orgánico 81 %", () => {
    expect(val(m.valores, "tasa-contacto").valor).toBe(2.2);
    expect(val(m.valores, "contactos-mil-tours").valor).toBe(35);
    expect(val(m.valores, "contactos-mil-blog").valor).toBe(2.7);
    expect(val(m.valores, "conversion-pago").detalle).toBe("5 de 66 personas que iniciaron el pago");
    expect(val(m.valores, "peso-organico").valor).toBe(81);
  });
  it("reservas web del periodo, leads con canal y el cruce GA4 contra panel", () => {
    expect(val(m.valores, "reservas-web").valor).toBe(5);
    expect(val(m.valores, "leads-canal").valor).toBe(50);
    expect(m.detalle.cruce).toMatchObject({ comprasGa4: 5, reservasWeb: 5, whatsappGa4: 98, clicsPanel: 97, diferenciaPct: -1 });
  });
  it("sin GA4 no truena: cada KPI dice por qué no hay dato", () => {
    const sin = calcularDemanda({ ...datos, ga4: { ok: false, motivo: "Falta GA4_PROPERTY_ID" } }, p, [p]);
    expect(val(sin.valores, "tasa-contacto")).toMatchObject({ valor: null, calidad: "sin-dato", nota: "Falta GA4_PROPERTY_ID" });
    expect(val(sin.valores, "reservas-web").valor).toBe(5);
  });
});

describe("comercial: cohortes y seguimiento", () => {
  // Lote 9: «reservó» = reserva viva con dinero (`pagoEn`), dentro de los 14 días.
  const lead = (i: number, ymd: string, reservo: boolean): LeadCohorte => ({
    id: `l${i}`, ymd, canal: "whatsapp", responsable: "Erick", etapa: reservo ? "anticipo" : "cotizado",
    historial: [{ nueva: "nuevo", en: 0 }], pagoEn: reservo ? Date.parse(`${ymd}T20:00:00Z`) : null, cotizacionEn: null,
  });
  const base = (leads: LeadCohorte[]): DatosComercial => ({
    leads, seguimiento: [], cotizaciones: [], revisiones: [], chats: [], reservas: [], saldos: [], perdidos: [], ahora: Date.parse("2026-11-04T18:00:00Z"), hoy: HOY,
  });
  it("Lead → reserva = 23 de 76 → 30 % (la base), y preliminar si la cohorte tiene menos de 14 días", () => {
    const leads = Array.from({ length: 76 }, (_, i) => lead(i, "2026-10-08", i < 23));
    const madura = leadReserva(base(leads), periodoDe("28d", "2026-10-21", HOY));
    expect([madura.valor, madura.detalle, madura.preliminar]).toEqual([30.3, "23 de 76 leads", false]);
    expect(leadReserva(base(leads.map(l => ({ ...l, ymd: "2026-11-02" }))), periodoDe("semana", HOY, HOY)).preliminar).toBe(true);
  });
  it("si la revisión del jueves cuenta más leads que el CRM, sale «aproximado»", () => {
    const d = { ...base([lead(1, "2026-10-20", true)]), revisiones: [{ semana: "2026-10-19", leadsNuevos: 25, respuestas5min: 17, score: 75 }] };
    expect(leadReserva(d, periodoDe("semana", "2026-10-19", HOY)).calidad).toBe("aproximado");
  });
  it("seguimiento a tiempo: mensaje a las 30 h sí; a las 80 h no; quien pagó a las 10 h no lo necesitaba", () => {
    const t0 = Date.parse("2026-10-20T16:00:00Z"), h = 3_600_000;
    const caso = (leadId: string, extra: Partial<DatosComercial["seguimiento"][number]>) => ({ leadId, cotizadoEn: t0, pagoEn: null, conChat: true, salientes: [], tareasHechas: [], ...extra });
    const d = { ...base([]), seguimiento: [caso("a", { salientes: [t0 + 30 * h] }), caso("b", { salientes: [t0 + 80 * h] }), caso("c", { pagoEn: t0 + 10 * h }), caso("d", { tareasHechas: [t0 + 50 * h] })] };
    expect(seguimientoATiempo(d, periodoDe("semana", "2026-10-19", HOY))).toMatchObject({ valor: 66.7, detalle: "2 de 3 que lo necesitaban" });
  });
  it("PDF a todo calificado: solo cuentan los que llegaron a calificado; el que cotizó cuenta aunque no pasara por la etapa", () => {
    const h = (nueva: string, ymd: string) => ({ nueva, en: Date.parse(`${ymd}T18:00:00Z`) });
    const l = (id: string, etapa: string, historial: { nueva: string; en: number }[], cotizacionEn: number | null = null): LeadCohorte =>
      ({ id, ymd: "2026-10-20", canal: "whatsapp", responsable: "Erick", etapa, historial, pagoEn: null, cotizacionEn });
    const leads = [
      l("a", "cotizado", [h("nuevo", "2026-10-20"), h("calificado", "2026-10-20"), h("cotizado", "2026-10-21")]),
      l("b", "calificado", [h("nuevo", "2026-10-20"), h("calificado", "2026-10-20")]),
      l("c", "nuevo", [h("nuevo", "2026-10-20")]), // nunca dio fecha y personas: no cuenta
      l("d", "seguimiento", [h("nuevo", "2026-10-20")], Date.parse("2026-10-22T18:00:00Z")),
    ];
    expect(pdfACalificados(base(leads), periodoDe("semana", "2026-10-19", HOY))).toMatchObject({ valor: 66.7, detalle: "2 de 3 leads calificados" });
    // Calificados sin cotización hoy: «b» lleva días en calificado; uno de hace 2 h todavía no cuenta.
    const reciente = { ...l("e", "calificado", [h("nuevo", "2026-11-04")]), ymd: "2026-11-04", historial: [{ nueva: "calificado", en: Date.parse("2026-11-04T16:00:00Z") }] };
    expect(calificadosSinCotizar(base([...leads, reciente])).valor).toBe(1);
  });
});

describe("servicio: reseña pedida por WhatsApp", () => {
  it("cuenta la liga o la palabra entre el último día del tour y 14 días después", () => {
    expect(pidioResena([{ ymd: "2026-11-10", texto: "¿Nos dejas tu reseña? https://g.page/r/abc/review" }], "2026-11-08")).toBe(true);
    expect(pidioResena([{ ymd: "2026-11-07", texto: "Déjanos tu reseña" }], "2026-11-08")).toBe(false); // antes del viaje
    expect(pidioResena([{ ymd: "2026-11-30", texto: "Déjanos tu reseña" }], "2026-11-08")).toBe(false); // ya muy tarde
    const d = { hoy: HOY, operadas: [
      { ultimoDia: "2026-10-20", conCheckin: false, resenaPedida: true },
      { ultimoDia: "2026-10-21", conCheckin: false, resenaPedida: false },
      { ultimoDia: "2026-10-22", conCheckin: false, resenaPedida: null }, // sin chat en la Bandeja
    ] };
    expect(resenaPedida(d, periodoDe("semana", "2026-10-19", HOY))).toMatchObject({ valor: 50, calidad: "aproximado" });
  });
});

describe("operación: corte a tiempo, margen y salidas", () => {
  it("a tiempo = el corte se hizo a más tardar el lunes siguiente a las 23:59 de México", () => {
    expect(aTiempo("2026-10-19", Date.parse("2026-10-26T23:00:00-06:00"))).toBe(true);
    expect(aTiempo("2026-10-19", Date.parse("2026-10-27T09:00:00-06:00"))).toBe(false);
    expect(aTiempo("2026-10-19", undefined)).toBe(false);
  });
  it("el único corte (19–25 oct) da el 30 % de la base: 11,388 ÷ 37,730", () => {
    const d: DatosOperacion = {
      salidas: [
        { clave: "2026-10-20|expedicion-tamul", fecha: "2026-10-20", codigo: "TAM", tourNombre: "Tamul", personas: 2, aMedida: false, bajoMinimo: true, checklist: { hechos: 7, total: 7 }, incidencias: [] },
        { clave: "2026-10-21|cascadas-del-meco", fecha: "2026-10-21", codigo: "MEC", tourNombre: "Meco", personas: 4, aMedida: false, bajoMinimo: false, checklist: { hechos: 3, total: 7 }, incidencias: [{ id: "i", tipo: "recogida", gravedad: "media", causa: "tarde", accion: "", por: "Guía", en: "" }] },
      ],
      cortes: [{ semana: "2026-10-19", ventas: 37730, utilidad: 11388, estado: "cerrado" }],
      primerCierre: { "2026-10-19": Date.parse("2026-10-26T18:00:00-06:00") },
      reservas: [], hoy: HOY,
    };
    const p = periodoDe("semana", "2026-10-19", HOY);
    const m = calcularOperacion(d, p, [p]);
    expect(val(m.valores, "margen").valor).toBe(30.2);
    expect(val(m.valores, "cortes-tiempo").valor).toBe(100);
    expect(val(m.valores, "pax-salida").valor).toBe(3);
    expect(val(m.valores, "bajo-minimo").valor).toBe(1);
    expect(val(m.valores, "checklist").detalle).toBe("1 de 2 salidas");
    expect(val(m.valores, "incidencias").valor).toBe(50);
  });
});

describe("producto y datos", () => {
  it("clasificación: falta medir, a revisar, estrella y complemento", () => {
    expect([clasificar(null, 20, 5), clasificar(15, 20, 5), clasificar(35, 2, 5), clasificar(35, 6, 5), clasificar(25, 6, 5)])
      .toEqual(["falta-medir", "a-revisar", "a-revisar", "estrella", "complemento"]);
  });
  it("lo cobrado se reparte entre los tours por el peso de cada renglón (como Ventas)", () => {
    const m = cobradoPorTour({ ymd: HOY, cobrado: 3000, conHotel: false, lineas: [{ slug: "expedicion-tamul", subtotal: 3100 }, { slug: "cascadas-del-meco", subtotal: 3100 }] });
    expect([m.get("expedicion-tamul"), m.get("cascadas-del-meco")]).toEqual([1500, 1500]);
  });
  it("datos confiables: sin canal o capturada después del tour no cuentan", () => {
    const v = datosConfiables([{ ymd: HOY, conCanal: true, antesDelTour: true }, { ymd: HOY, conCanal: false, antesDelTour: true }, { ymd: HOY, conCanal: true, antesDelTour: false }], periodoDe("semana", HOY, HOY));
    expect([v.valor, v.nota]).toEqual([33.3, "1 sin canal · 1 capturada después del tour"]);
  });
  it("una tasa sin casos es «sin dato», no 0 %", () => {
    expect(tasa("x", 0, 0)).toMatchObject({ valor: null, calidad: "sin-dato" });
  });
});

describe("recordatorios de los datos que se capturan a mano", () => {
  it("lectura de Google: tarea si la última tiene más de 6 días, una por semana", () => {
    // 29 oct → 4 nov = 6 días: todavía vale. 28 oct → 4 nov = 7: toca anotar otra.
    expect(reglaLecturaGoogle("2026-10-29", HOY, "2026-11-02")).toEqual([]);
    expect(reglaLecturaGoogle("2026-10-28", HOY, "2026-11-02")[0]).toMatchObject({ claveRegla: "lectura-google:2026-11-02", responsable: "Manolo", vence: HOY });
    expect(reglaLecturaGoogle(null, HOY, "2026-11-02")).toHaveLength(1);
  });
  it("corte del lunes: a Martín, vence el lunes siguiente; nada si ya está cerrado o es de antes del corte", () => {
    expect(reglaCorteLunes(false, "2026-10-26", "2026-10-19")[0]).toMatchObject({ claveRegla: "corte-lunes:2026-10-26", responsable: "Martín", vence: "2026-11-02" });
    expect(reglaCorteLunes(true, "2026-10-26", "2026-10-19")).toEqual([]);
    expect(reglaCorteLunes(false, "2026-10-12", "2026-10-19")).toEqual([]);
  });
});

describe("scorecard de Inicio con la misma fórmula que Embudo", () => {
  const base: EntradaScorecard = {
    leadsNuevos: 25, respuestas5min: null, leadsCotizados: null, cotizadosDelPanel: 0, score: null, resenasNuevas: null,
    reservasCreadas: 10, conAnticipo: 0, vendidoSemana: 0, vendidoMes: 0, salidas: 0, personas: 0,
    ingresoConCostos: 0, margenConCostos: 0, salidasConCostos: 0, reservasOperadas: 0,
  };
  it("con leads en el CRM, Lead → reserva sale por cohorte; sin ellos, como antes", () => {
    const kv = (clave: string, valor: number, detalle: string): ValorKpi => ({ clave, valor, detalle, calidad: "exacto", preliminar: true });
    const con = calcularScorecard({ ...base, comercial: {
      leads: 20, leadReserva: kv("lead-reserva", 30, "6 de 20 leads"), leadsCotizados: kv("leads-cotizados", 60, "12 de 20 leads"),
      respuesta5: { clave: "respuesta-5min", valor: null, calidad: "sin-dato" }, embudo: [],
    } });
    expect(con.kpis.find(k => k.clave === "conversion")?.valor).toBe("30 %");
    const sin = calcularScorecard(base);
    expect(sin.kpis.find(k => k.clave === "conversion")?.valor).toBe("40 %");
  });
});
