// Lote 9 de la auditoría (10 nov 2026): indicadores y que todo se nutra solo.
import { describe, expect, it } from "vitest";
import { TOURS_LISTA } from "@/lib/tours";
import { periodoDe } from "../indicadores/periodo";
import {
  calcularComercial, cierreCohorte, cotizo, fechaDeEnvio, leadReserva, leadsCotizados, nacioComprado, reservo,
  type DatosComercial, type LeadCohorte,
} from "../indicadores/comercial";
import { calcularPrecio, listaDeRenglon, precioDeReserva, type ReservaParaPrecio } from "../indicadores/precio";
import { calcularOperacion, type DatosOperacion, type SalidaK } from "../indicadores/operacion";
import { nuevasResenas, resenasDe } from "../indicadores/servicio";
import { estadoCorreos, estadoPuente, estadoStripe, faltanLlavesCompraGA4 } from "../indicadores/fuentes";
import { horasDeCache } from "../indicadores/ga4";
import { factorDeTotal } from "../reserva";
import { primerMensajeEn5, salioAlCliente } from "../bandeja";
import { avisoReporteJueves, decidirReporte, leerEstadoReporte, primerMensajeDelChat } from "../agente/calidadReglas";
import { correoResumen, reglaRevisionJueves, reglaToursSinCostos, yaNoAplica } from "../automatizaciones";
import { calcularScorecard, type EntradaScorecard } from "../scorecard";
import type { ValorKpi } from "../indicadores/tipos";

const HOY = "2026-11-10";
const val = (vs: ValorKpi[], k: string) => vs.find(v => v.clave === k)!;
const ms = (iso: string) => Date.parse(iso);

// ── Cohortes del Embudo y de Inicio ─────────────────────────────────────────
describe("cohortes: sin comprados ni importados, «reservó» con dinero y cerradas a 14 días", () => {
  const lead = (id: string, ymd: string, extra: Partial<LeadCohorte> = {}): LeadCohorte => ({
    id, ymd, canal: "whatsapp", responsable: "Erick", etapa: "nuevo",
    historial: [{ nueva: "nuevo", en: ms(`${ymd}T16:00:00Z`) }], pagoEn: null, cotizacionEn: null, ...extra,
  });
  const base = (leads: LeadCohorte[], hoy = HOY): DatosComercial => ({
    leads, seguimiento: [], cotizaciones: [], revisiones: [], chats: [], reservas: [], saldos: [], perdidos: [], ahora: ms(`${hoy}T18:00:00Z`), hoy,
  });
  const semana = periodoDe("semana", "2026-10-19", HOY); // 19–25 oct: madura el 8 nov

  it("los nacidos de una reserva y los de la importación inicial no entran a la cohorte", () => {
    const d = base([
      lead("a", "2026-10-20", { pagoEn: ms("2026-10-21T18:00:00Z") }),
      lead("b", "2026-10-20"),
      lead("c", "2026-10-20", { pagoEn: ms("2026-10-20T18:00:00Z"), fuera: "comprado" }),
      lead("d", "2026-10-21", { fuera: "importado" }),
    ]);
    expect(leadReserva(d, semana)).toMatchObject({ valor: 50, detalle: "1 de 2 leads" });
    expect(calcularComercial(d, semana, [semana]).detalle.leadsCrm).toBe(2);
  });

  it("nació comprado = su primera reserva se capturó antes que el lead", () => {
    expect(nacioComprado(ms("2026-10-20T16:00:05Z"), [ms("2026-10-20T16:00:00Z")])).toBe(true);
    expect(nacioComprado(ms("2026-10-20T16:00:00Z"), [ms("2026-10-22T10:00:00Z")])).toBe(false);
    expect(nacioComprado(ms("2026-10-20T16:00:00Z"), [])).toBe(false);
  });

  it("«reservó» pide dinero cobrado: llegar a Anticipo sin una reserva pagada ya no cuenta", () => {
    const sinDinero = lead("x", "2026-10-20", { etapa: "anticipo", historial: [{ nueva: "anticipo", en: ms("2026-10-21T16:00:00Z") }] });
    expect(reservo(sinDinero)).toBe(false);
    expect(reservo({ ...sinDinero, pagoEn: ms("2026-10-21T16:00:00Z") })).toBe(true);
  });

  it("una cohorte madura ya no sube: lo que pagó después del día 14 no cuenta", () => {
    const corte = cierreCohorte(semana); // 8 nov 23:59 de México
    expect(corte).toBe(ms("2026-11-08T23:59:59.999-06:00"));
    const d = base([
      lead("a", "2026-10-20", { pagoEn: ms("2026-11-08T20:00:00-06:00") }),
      lead("b", "2026-10-20", { pagoEn: ms("2026-11-09T09:00:00-06:00") }),
    ]);
    expect(leadReserva(d, semana)).toMatchObject({ valor: 50, preliminar: false });
    // Cotizado también se corta ahí (antes se daba por final a los 3 días y seguía subiendo).
    const tarde = lead("c", "2026-10-20", { cotizacionEn: ms("2026-11-09T09:00:00-06:00") });
    expect(cotizo(tarde, corte)).toBe(false);
    expect(leadsCotizados(base([tarde], "2026-10-30"), semana).preliminar).toBe(true);
  });

  it("Inicio usa la MISMA cohorte: el embudo de la semana sale de Embudo", () => {
    const d = base([lead("a", "2026-10-20", { pagoEn: ms("2026-10-22T16:00:00Z") }), lead("b", "2026-10-21", { cotizacionEn: ms("2026-10-21T18:00:00Z") }), lead("c", "2026-10-22")]);
    const m = calcularComercial(d, semana, [semana]);
    expect(m.detalle.embudo.map(e => e.n)).toEqual([3, 2, 1]);
    const s = calcularScorecard({
      ...entradaBase, leadsNuevos: 25,
      comercial: { leads: 3, leadReserva: val(m.valores, "lead-reserva"), leadsCotizados: val(m.valores, "leads-cotizados"), respuesta5: val(m.valores, "respuesta-5min"), embudo: m.detalle.embudo },
    });
    const k = Object.fromEntries(s.kpis.map(x => [x.clave, x]));
    expect(k.leads.valor).toBe("3");
    expect(k.conversion.valor).toBe("33 %");
    expect(s.embudo.map(p => p.n)).toEqual([3, 2, 1]);
  });
});

// ── Cotización → reserva desde que se envió ─────────────────────────────────
describe("cotización → reserva cuenta desde el envío", () => {
  const creada = new Date("2026-10-01T16:00:00Z");
  it("la fecha de envío: la guardada, la Bitácora, el seguimiento o (aproximada) cuando se creó", () => {
    const enviada = new Date("2026-10-05T16:00:00Z");
    expect(fechaDeEnvio({ enviadaEn: enviada, createdAt: creada })).toEqual({ en: enviada, aproximada: false });
    expect(fechaDeEnvio({ enviadaEn: null, createdAt: creada }, new Date("2026-10-03T16:00:00Z"))).toEqual({ en: new Date("2026-10-03T16:00:00Z"), aproximada: false });
    expect(fechaDeEnvio({ enviadaEn: null, createdAt: creada, lineItems: [{ _meta: true, seqDesde: "2026-10-04T16:00:00.000Z" }] })).toEqual({ en: new Date("2026-10-04T16:00:00.000Z"), aproximada: true });
    expect(fechaDeEnvio({ enviadaEn: null, createdAt: creada, lineItems: [] })).toEqual({ en: creada, aproximada: true });
  });
  it("un borrador viejo que se envió y se aceptó a los 10 días SÍ cuenta (antes se medía desde el borrador)", () => {
    const enviada = ms("2026-10-20T16:00:00Z");
    const d: DatosComercial = {
      leads: [], seguimiento: [], revisiones: [], chats: [], reservas: [], saldos: [], perdidos: [], ahora: ms(`${HOY}T18:00:00Z`), hoy: HOY,
      cotizaciones: [
        { ymd: "2026-10-20", enviada, total: 5000, status: "aceptada", aceptadaEn: enviada + 10 * 86_400_000, aproximada: false },
        { ymd: "2026-10-21", enviada: enviada + 86_400_000, total: 5000, status: "enviada", aceptadaEn: null, aproximada: false, envioAproximado: true },
      ],
    };
    const p = periodoDe("semana", "2026-10-19", HOY);
    const v = val(calcularComercial(d, p, [p]).valores, "cotizacion-reserva");
    expect(v).toMatchObject({ valor: 50, calidad: "aproximado" });
    expect(v.nota).toContain("sin fecha de envío");
  });
});

// ── Precios: la opción elegida y los descuentos reales ──────────────────────
describe("precios con la opción elegida y descuentos reales", () => {
  const ACU = TOURS_LISTA.find(t => t.slug === "ruta-acuatica-puente-de-dios")!;
  const fecha = "2026-10-20";
  const reserva = (lineItems: unknown[], extra: Partial<ReservaParaPrecio> = {}): ReservaParaPrecio => ({
    createdAt: new Date(`${fecha}T16:00:00Z`), origen: "whatsapp", totalAmount: 0, promoDiscount: 0, lineItems,
    tourSlug: ACU.slug, tourName: ACU.nombre, tourDate: fecha, adults: 2, children: 0, ...extra,
  });

  it("🔴 Ruta Acuática con Tamasopo cobrada a lista ya NO sale «arriba de lista»", () => {
    const linea = { tourSlug: ACU.slug, tourName: ACU.nombre, tourDate: fecha, adults: 2, childrenMid: 0, childrenSmall: 0, eleccion: "tamasopo" };
    const conTamasopo = listaDeRenglon(ACU, linea);
    expect(conTamasopo - listaDeRenglon(ACU, { ...linea, eleccion: "siete-cascadas" })).toBe(300);
    const r = precioDeReserva(reserva([{ ...linea, subtotal: conTamasopo }], { totalAmount: conTamasopo }));
    const p = periodoDe("mes", fecha, HOY);
    expect(val(calcularPrecio({ lineas: r.lineas, reservas: [r.reserva], perdidos: [], cotizaciones: [] }, p, [p]).valores, "realizacion-precio").valor).toBe(100);
  });

  it("lo vendido es lo cobrado: un 10 % de descuento baja la realización a 90 %", () => {
    const linea = { tourSlug: ACU.slug, tourName: ACU.nombre, tourDate: fecha, adults: 2, childrenMid: 0, childrenSmall: 0, eleccion: "siete-cascadas" };
    const lista = listaDeRenglon(ACU, linea);
    const r = precioDeReserva(reserva([{ _meta: true, descuento: { tipo: "percent", valor: 10 } }, { ...linea, subtotal: lista }], { totalAmount: Math.round(lista * 0.9) }));
    expect(r.lineas[0].subtotal).toBe(Math.round(lista * 0.9));
    expect(r.reserva.descuento).toBe(Math.round(lista * 0.1));
  });

  it("🔴 el código de cumpleaños ya va como descuento: se cuenta UNA vez, no dos", () => {
    const linea = { tourSlug: ACU.slug, tourName: ACU.nombre, tourDate: fecha, adults: 2, childrenMid: 0, childrenSmall: 0, subtotal: 2000 };
    const r = precioDeReserva(reserva([{ _meta: true, codigoCumple: "CUMPLE-ABC123", descuento: { tipo: "fixed", valor: 200 } }, linea], { totalAmount: 1800 }));
    expect(r.reserva.descuento).toBe(200);
  });

  it("el descuento en % se calcula sobre lo mismo que el panel (tours + hotel + extras)", () => {
    const linea = { tourSlug: ACU.slug, tourName: ACU.nombre, tourDate: fecha, adults: 2, childrenMid: 0, childrenSmall: 0, subtotal: 2000 };
    const r = precioDeReserva(reserva([{ _meta: true, descuento: { tipo: "percent", valor: 10 } }, linea], { totalAmount: 2700, packageItems: [{ subtotal: 1000 }] }));
    expect(r.reserva.descuento).toBe(300);
  });
});

describe("el ingreso de un renglón después de descuentos y del total editado", () => {
  const b = (totalAmount: number, lineItems: unknown[], extra: Record<string, unknown> = {}) => ({ totalAmount, lineItems, ...extra });
  it("descuento, total editado hacia arriba, hotel y extras", () => {
    expect(factorDeTotal(b(900, [{ tourSlug: "x", subtotal: 1000 }]))).toBe(0.9);
    expect(factorDeTotal(b(1100, [{ tourSlug: "x", subtotal: 1000 }]))).toBe(1.1);
    expect(factorDeTotal(b(2700, [{ _meta: true }, { tourSlug: "x", subtotal: 2000 }], { packageItems: [{ subtotal: 1000 }] }))).toBe(0.9);
  });
  it("sin renglones o con un renglón sin subtotal (reservas viejas) no se toca", () => {
    expect(factorDeTotal(b(900, []))).toBe(1);
    expect(factorDeTotal(b(900, [{ tourSlug: "x" }]))).toBe(1);
  });
});

// ── Ocupación: personas por salida y los dos márgenes ───────────────────────
describe("ocupación: personas por salida regulares y margen del corte aparte del estimado", () => {
  const salida = (clave: string, personas: number, aMedida: boolean, extra: Partial<SalidaK> = {}): SalidaK => ({
    clave, fecha: "2026-10-20", codigo: "TAM", tourNombre: "x", personas, aMedida, bajoMinimo: personas <= 2, checklist: { hechos: 0, total: 0 }, incidencias: [], ...extra,
  });
  const d: DatosOperacion = {
    salidas: [
      salida("a", 4, false, { ingreso: 10_000, margen: 3_000, conCostos: true }),
      salida("b", 2, false, { ingreso: 5_000, margen: 1_000, conCostos: true }),
      salida("rzr", 1, true, { ingreso: 4_000, margen: 3_000, conCostos: true }),
      salida("cdmx", 20, true),
    ],
    cortes: [{ semana: "2026-10-19", ventas: 37730, utilidad: 11388, estado: "cerrado" }],
    primerCierre: {}, reservas: [], hoy: HOY,
  };
  const p = periodoDe("semana", "2026-10-19", HOY);
  const m = calcularOperacion(d, p, [p]);
  it("sin viaje CDMX, RZR, buceo, a medida ni conceptos: 6 personas en 2 salidas", () => {
    expect(val(m.valores, "pax-salida")).toMatchObject({ valor: 3, detalle: "6 personas en 2 salidas" });
    expect(m.detalle.semanas[0]).toMatchObject({ salidas: 2, paxPorSalida: 3 });
  });
  it("el margen del corte (oficial) y el estimado por salida (informativo) van separados", () => {
    expect(val(m.valores, "margen").valor).toBe(30.2);
    expect(val(m.valores, "margen-salidas")).toMatchObject({ valor: 26.7, calidad: "aproximado" });
  });
});

// ── Scorecard de Inicio ─────────────────────────────────────────────────────
const entradaBase: EntradaScorecard = {
  leadsNuevos: null, respuestas5min: null, leadsCotizados: null, cotizadosDelPanel: 0, score: null, resenasNuevas: null,
  reservasCreadas: 0, conAnticipo: 0, vendidoSemana: 0, vendidoMes: 0, salidas: 0, personas: 0,
  ingresoConCostos: 0, margenConCostos: 0, salidasConCostos: 0, reservasOperadas: 0,
};
describe("scorecard: margen del corte con meta y el estimado sin meta", () => {
  it("con el corte cerrado manda el del corte; el estimado no se juzga contra 35 %", () => {
    const s = calcularScorecard({ ...entradaBase, corte: { ventas: 37730, utilidad: 11388, cerrado: true }, ingresoConCostos: 10_000, margenConCostos: 2_000, salidasConCostos: 3, salidas: 5 });
    const k = Object.fromEntries(s.kpis.map(x => [x.clave, x]));
    expect([k.margen.etiqueta, k.margen.valor, k.margen.estado.texto]).toEqual(["Margen del corte", "30 %", "Cerca de meta"]);
    expect([k["margen-estimado"].valor, k["margen-estimado"].estado]).toEqual(["20 %", { tono: "neutro", texto: "Estimado · sin meta" }]);
  });
  it("con el corte sin cerrar no hay margen oficial", () => {
    const k = Object.fromEntries(calcularScorecard({ ...entradaBase, corte: { ventas: 1000, utilidad: 300, cerrado: false } }).kpis.map(x => [x.clave, x]));
    expect([k.margen.valor, k.margen.estado.texto]).toEqual(["—", "Corte sin cerrar"]);
  });
  it("las reseñas usan la fórmula de Experiencia", () => {
    const resenas: ValorKpi = { clave: "resenas", valor: 25, detalle: "2 de 8 reservas operadas", calidad: "exacto" };
    const k = Object.fromEntries(calcularScorecard({ ...entradaBase, resenas }).kpis.map(x => [x.clave, x]));
    expect(k.resenas.valor).toBe("25 %");
  });
});

// ── Reseñas: de la lectura del lunes a la del lunes siguiente ───────────────
describe("reseñas alineadas a la lectura del lunes", () => {
  const google = [
    { fecha: "2026-10-12", rating: 4.9, total: 100, por: "M" },
    { fecha: "2026-10-19", rating: 4.9, total: 104, por: "M" },
    { fecha: "2026-10-26", rating: 4.9, total: 110, por: "M" },
  ];
  const p = periodoDe("semana", "2026-10-19", HOY);
  it("🔴 la semana del 19 oct son las del lunes 19 al lunes 26 (6), no las de la semana anterior (4)", () => {
    expect(nuevasResenas(google, p)?.nuevas).toBe(6);
    const v = resenasDe({ google, operadas: [{ ultimoDia: "2026-10-20", conCheckin: false }, { ultimoDia: "2026-10-24", conCheckin: false }, { ultimoDia: "2026-10-22", conCheckin: false }], hoy: HOY }, p);
    expect(v).toMatchObject({ valor: 200, detalle: "6 de 3 reservas operadas", calidad: "exacto" });
  });
  it("sin la lectura del lunes siguiente (semana en curso) es «sin dato», no 0", () => {
    const enCurso = periodoDe("semana", "2026-10-26", "2026-10-28");
    expect(nuevasResenas(google, enCurso)).toBeNull();
    expect(resenasDe({ google, operadas: [{ ultimoDia: "2026-10-26", conCheckin: false }], hoy: "2026-10-28" }, enCurso).valor).toBeNull();
  });
});

// ── Un mensaje que no salió no es respuesta ─────────────────────────────────
describe("un mensaje que no salió no cuenta como respuesta a tiempo", () => {
  const t0 = new Date("2026-10-20T16:00:00Z"); // 10:00 en México
  const en = (min: number) => new Date(t0.getTime() + min * 60_000);
  it("falló a los 2 min y salió bien a los 20: no está en 5 min", () => {
    const chat = [{ direccion: "entra", fecha: t0 }, { direccion: "sale", fecha: en(2), estado: "fallo" }, { direccion: "sale", fecha: en(20), estado: "enviado" }];
    expect(primerMensajeEn5([chat], en(-60), en(60))).toEqual({ nuevas: 1, enHorario: 1, en5: 0 });
    expect(primerMensajeDelChat(chat, en(-60), en(60))).toEqual({ aplica: true, cumple: false });
    expect(primerMensajeEn5([[chat[0], { direccion: "sale", fecha: en(2), estado: "entregado" }]], en(-60), en(60)).en5).toBe(1);
  });
  it("pendiente o en envío tampoco; sin estado (los de antes) sí", () => {
    expect([salioAlCliente({ direccion: "sale", estado: "pendiente" }), salioAlCliente({ direccion: "sale", estado: "enviando" }), salioAlCliente({ direccion: "sale" }), salioAlCliente({ direccion: "entra", estado: "enviado" })])
      .toEqual([false, false, true, false]);
  });
});

// ── Metas → Fuentes ─────────────────────────────────────────────────────────
describe("Metas → Fuentes ya no dice «Bien» siempre", () => {
  const ahora = new Date("2026-11-10T18:00:00Z");
  const hace = (min: number) => new Date(ahora.getTime() - min * 60_000);
  it("el puente: «conectado» guardado pero sin latido en 15 min = se cayó", () => {
    expect(estadoPuente({ estado: "conectado", en: hace(6).toISOString() }, hace(30), ahora).estado).toBe("ok");
    const caido = estadoPuente({ estado: "conectado", en: hace(3 * 60).toISOString() }, hace(30), ahora);
    expect(caido.estado).toBe("falla");
    expect(caido.detalle).toContain("no da señales desde hace 3 h");
    expect(estadoPuente(null, null, ahora).estado).toBe("falla");
  });
  it("Stripe: sin secreto falla; sin avisos, atención; reserva web sin aviso, falla; al día, bien", () => {
    expect(estadoStripe({ secreto: false, ultimoWebhook: null, ultimaReservaWeb: null, ahora }).estado).toBe("falla");
    expect(estadoStripe({ secreto: true, ultimoWebhook: null, ultimaReservaWeb: hace(600), ahora }).estado).toBe("atencion");
    expect(estadoStripe({ secreto: true, ultimoWebhook: hace(3000), ultimaReservaWeb: hace(600), ahora }).estado).toBe("falla");
    expect(estadoStripe({ secreto: true, ultimoWebhook: hace(599), ultimaReservaWeb: hace(600), ahora }).estado).toBe("ok");
  });
  it("las llaves con las que el servidor le cuenta las compras a GA4", () => {
    expect(faltanLlavesCompraGA4({ NEXT_PUBLIC_GA4_ID: "G-1", GA4_API_SECRET: "" })).toEqual(["GA4_API_SECRET"]);
    expect(faltanLlavesCompraGA4({ NEXT_PUBLIC_GA4_ID: "G-1", GA4_API_SECRET: "x" })).toEqual([]);
  });
  it("los correos personales: avisa quién no tiene el suyo (el guía no cuenta)", () => {
    const equipo = [{ user: "manolo", nombre: "Manolo", rol: "dueno" }, { user: "erick", nombre: "Erick", rol: "operacion" }, { user: "guia", nombre: "Guía", rol: "guia" }];
    const f = estadoCorreos({ ADMIN_EMAIL_MANOLO: "m@x.com" }, equipo);
    expect(f.estado).toBe("atencion");
    expect(f.arreglo).toContain("ADMIN_EMAIL_ERICK");
    expect(f.arreglo).not.toContain("GUIA");
    expect(estadoCorreos({ ADMIN_EMAIL_MANOLO: "m", ADMIN_EMAIL_ERICK: "e" }, equipo).estado).toBe("ok");
  });
});

// ── Caché de GA4 ────────────────────────────────────────────────────────────
describe("caché de GA4: 30 días solo con datos completos", () => {
  it("🔴 una lectura hecha cuando el rango era reciente sigue valiendo 3 h aunque el rango ya sea viejo", () => {
    const rango = [{ desde: "2026-10-01", hasta: "2026-10-28" }];
    expect(horasDeCache(rango, "2026-10-29T18:00:00Z")).toBe(3);
    expect(horasDeCache(rango, "2026-10-31T18:00:00Z")).toBe(24 * 30);
  });
});

// ── Recordatorios nuevos ────────────────────────────────────────────────────
describe("recordatorios: revisión del jueves y tours sin costos", () => {
  it("revisión del jueves: desde el jueves y solo si no se ha guardado", () => {
    expect(reglaRevisionJueves(false, "2026-11-11", "2026-11-09")).toEqual([]);
    expect(reglaRevisionJueves(false, "2026-11-12", "2026-11-09")[0]).toMatchObject({ claveRegla: "revision-jueves:2026-11-09", responsable: "Manolo", vence: "2026-11-12" });
    expect(reglaRevisionJueves(true, "2026-11-13", "2026-11-09")).toEqual([]);
    expect(yaNoAplica("revision-jueves", { revisionGuardada: true }, HOY)).toBe(true);
    expect(yaNoAplica("revision-jueves", { revisionGuardada: undefined }, HOY)).toBe(false);
  });
  it("tours sin costos: una al mes, a quien captura costos, con sus códigos", () => {
    const t = reglaToursSinCostos([{ codigo: "TAM" }, { codigo: "MEC" }], HOY);
    expect(t[0]).toMatchObject({ claveRegla: "tours-sin-costos:2026-11", responsable: "Martín" });
    expect(t[0].titulo).toContain("2 tours (TAM, MEC)");
    expect(reglaToursSinCostos([], HOY)).toEqual([]);
    expect(yaNoAplica("tours-sin-costos", { toursSinCostos: 0 }, HOY)).toBe(true);
    expect(yaNoAplica("tours-sin-costos", { toursSinCostos: 2, deOtroMes: true }, HOY)).toBe(true);
    expect(yaNoAplica("tours-sin-costos", { toursSinCostos: undefined }, HOY)).toBe(false);
  });
});

// ── Reporte de los jueves ───────────────────────────────────────────────────
describe("reporte de los jueves: hasta 3 intentos con 1 h entre ellos y aviso si no salió", () => {
  const ahora = new Date("2026-11-12T15:00:00Z");
  it("reintenta a la hora, no cada minuto, y se detiene al tercero", () => {
    expect(decidirReporte(null, ahora)).toBe("correr");
    expect(decidirReporte({ intentos: 1, ultimoIntento: new Date(ahora.getTime() - 20 * 60_000).toISOString(), listo: false }, ahora)).toBe("esperar");
    expect(decidirReporte({ intentos: 1, ultimoIntento: new Date(ahora.getTime() - 61 * 60_000).toISOString(), listo: false }, ahora)).toBe("correr");
    expect(decidirReporte({ intentos: 3, ultimoIntento: "2026-11-12T10:00:00Z", listo: false }, ahora)).toBe("agotado");
    expect(decidirReporte({ intentos: 1, ultimoIntento: null, listo: true }, ahora)).toBe("listo");
  });
  it("lo guardado con el formato de antes (solo una fecha) es un reporte que ya salió", () => {
    expect(leerEstadoReporte("2026-11-05T13:00:00.000Z")).toEqual({ intentos: 1, ultimoIntento: null, listo: true });
    expect(leerEstadoReporte(null)).toBeNull();
  });
  it("el aviso sale del viernes en adelante si no salió", () => {
    const agotado = { intentos: 3, ultimoIntento: "2026-11-12T15:00:00Z", listo: false };
    expect(avisoReporteJueves(agotado, "2026-11-12", "2026-11-09", "2026-11-12")).toBeNull();
    expect(avisoReporteJueves(agotado, "2026-11-13", "2026-11-09", "2026-11-12")).toContain("falló 3 veces");
    expect(avisoReporteJueves(null, "2026-11-13", "2026-11-09", "2026-11-12")).toContain("no se corrió");
    expect(avisoReporteJueves({ ...agotado, listo: true }, "2026-11-13", "2026-11-09", "2026-11-12")).toBeNull();
  });
  it("el resumen de las 7:30 lleva el aviso primero", () => {
    const c = correoResumen("Manolo", "2026-11-13", [], [], [], ["El reporte de los jueves no salió"]);
    expect(c.subject).toContain("1 aviso");
    expect(c.htmlContent).toContain("AVISOS");
    expect(c.textContent).toContain("Avisos:\n- El reporte de los jueves no salió");
  });
});
