import { describe, expect, it } from "vitest";
import {
  accionDeConciliacion, avisoTrasAbonarLiga, cobrosDeLaSesion, cobrosDelPagoWeb, decidirLigaSaldoViaje,
  decidirReembolso, motivoParaApagarLiga, reservasParaPagoRestante, tituloContracargo, tituloLigaDeOtraCuenta, tituloLigaSinDestino,
  tituloReembolso, tituloViajeSinAnticipo, unicoCobroVivoDe, type HechosLiga,
} from "@/lib/admin/ligasReglas";
import {
  dineroAlCrearReserva, evidenciasUsables, puedeAnularCobro, puedeQuitarComprobante, referenciaAlEditar, referenciaDeConcepto,
} from "@/lib/admin/candadosCobro";
import { cobradoAFijarAntesDeEditar } from "@/lib/admin/dinero";
import { avisoDeCobro } from "@/lib/admin/metodosCobro";

// Lote 3 de la auditoría (5 nov 2026): ligas de pago y dinero. Aquí, las
// reglas; lo que toca la base se prueba con un script contra la base local.

const deCotizacion = { reservaId: null, cotizacionId: "cot1" };
const deReserva = { reservaId: "res1", cotizacionId: null };
const viva = { folio: "HP-M-1", status: "pending", total: 5000, cobrado: 1500 };

describe("¿esta liga todavía debe poder pagarse? (motivoParaApagarLiga)", () => {
  it("🔴 la cotización se borró, venció o se archivó: se apaga (cobros#3, conversion#2, cotizacion#2)", () => {
    expect(motivoParaApagarLiga(deCotizacion, { cotizacion: null })).toBe("se borró la cotización");
    expect(motivoParaApagarLiga(deCotizacion, { cotizacion: { status: "expirada" } })).toBe("la cotización venció");
    expect(motivoParaApagarLiga(deCotizacion, { cotizacion: { status: "archivada" } })).toBe("la cotización se archivó");
  });
  it("🔴 la reserva se canceló (o la salida del viaje): se apaga (reservas#4)", () => {
    expect(motivoParaApagarLiga(deReserva, { reserva: { ...viva, status: "cancelled" } })).toBe("se canceló la reserva HP-M-1");
    expect(motivoParaApagarLiga(deReserva, { reserva: { ...viva, salidaCancelada: true } })).toContain("salida del viaje");
    expect(motivoParaApagarLiga(deCotizacion, { cotizacion: { status: "aceptada" }, reserva: { ...viva, status: "cancelled" } })).toBe("se canceló su reserva HP-M-1");
  });
  it("🔴 la reserva quedó pagada por otro medio: la liga del saldo y la del anticipo se apagan", () => {
    expect(motivoParaApagarLiga(deReserva, { reserva: { ...viva, cobrado: 5000 } })).toBe("la reserva HP-M-1 ya está pagada");
    expect(motivoParaApagarLiga(deCotizacion, { cotizacion: { status: "aceptada" }, reserva: { ...viva, cobrado: 5200 } })).toBe("su reserva HP-M-1 ya está pagada");
  });
  it("lo vivo sigue vivo: cotización enviada, reserva con saldo, liga suelta, o un dato que no se pudo leer", () => {
    expect(motivoParaApagarLiga(deCotizacion, { cotizacion: { status: "enviada" } })).toBeNull();
    expect(motivoParaApagarLiga(deCotizacion, { cotizacion: { status: "aceptada" }, reserva: viva })).toBeNull();
    expect(motivoParaApagarLiga(deReserva, { reserva: viva })).toBeNull();
    expect(motivoParaApagarLiga({ reservaId: null, cotizacionId: null }, {})).toBeNull();
    expect(motivoParaApagarLiga(deCotizacion, undefined)).toBeNull();
    expect(motivoParaApagarLiga(deReserva, {})).toBeNull();
  });
  it("una cortesía de $0 no cuenta como «ya pagada»", () => {
    expect(motivoParaApagarLiga(deReserva, { reserva: { ...viva, total: 0, cobrado: 0 } })).toBeNull();
  });
});

describe("una liga pagada que no tenía a dónde ir", () => {
  it("🔴 pagó una reserva cancelada: el pago queda en ella y Manolo decide (reservas#4)", () => {
    const a = avisoTrasAbonarLiga({ folio: "HP-M-1", status: "cancelled", total: 4200, cobradoDespues: 4200 });
    expect(a).toEqual({ tipo: "reserva-cancelada", folio: "HP-M-1" });
    const t = tituloLigaSinDestino(a!, { titulo: "Saldo viaje CDMX", cliente: "Ana López", monto: 4200 });
    expect(t).toContain("CANCELADA HP-M-1");
    expect(t).toContain("$4,200");
    expect(t).toMatch(/devolver|Devuélvelo/);
  });
  it("🔴 pagó una reserva que ya estaba liquidada por transferencia: dice cuánto sobra", () => {
    const a = avisoTrasAbonarLiga({ folio: "HP-M-2", status: "paid", total: 7000, cobradoDespues: 14000 });
    expect(a).toEqual({ tipo: "pagada-de-mas", folio: "HP-M-2", sobra: 7000 });
    expect(tituloLigaSinDestino(a!, { cliente: "Beto", monto: 7000 })).toContain("sobran $7,000");
  });
  it("el pago normal del saldo no avisa nada", () => {
    expect(avisoTrasAbonarLiga({ folio: "HP-M-3", status: "paid", total: 7000, cobradoDespues: 7000 })).toBeNull();
    expect(avisoTrasAbonarLiga({ folio: "HP-M-3", status: "pending", total: 7000, cobradoDespues: 3000 })).toBeNull();
  });
  it("🔴 la cotización se borró: el título lo dice y cabe en 200 aunque el nombre sea larguísimo", () => {
    const largo = "María Guadalupe de los Ángeles Hernández Rodríguez de la Fuente";
    for (const tipo of ["cotizacion-borrada", "reserva-no-existe"] as const) {
      const t = tituloLigaSinDestino({ tipo }, { titulo: "Anticipo 30% de Expedición Tamul y Cascadas de Micos para 6", cliente: largo, monto: 12345 });
      expect(t.length).toBeLessThanOrEqual(200);
      expect(t).toContain("$12,345");
      expect(t).toContain("Stripe");
    }
    expect(tituloLigaSinDestino({ tipo: "cotizacion-borrada" }, { cliente: "Ana", monto: 1500 })).toContain("cotización que ya se borró");
  });
  it("la liga de la cuenta anterior de Stripe se avisa, no se calla (cobros#7)", () => {
    const t = tituloLigaDeOtraCuenta({ titulo: "Saldo Tamul", cliente: "Ana", monto: 2100 });
    expect(t).toContain("cuenta actual de Stripe");
    expect(t.length).toBeLessThanOrEqual(200);
  });
});

describe("la conciliación de ligas (cobros#7)", () => {
  const sesion = { id: "cs_1", montoCentavos: 150000, correo: "a@b.mx", paymentIntentId: "pi_1" };
  it("🔴 Stripe dice que se pagó y el aviso nunca llegó: se registra (aunque aquí ya estuviera apagada)", () => {
    expect(accionDeConciliacion({ estado: "activo", ...deReserva }, [sesion], { reserva: viva })).toEqual({ accion: "registrar", sesion });
    expect(accionDeConciliacion({ estado: "cancelado", ...deCotizacion }, [sesion], { cotizacion: null })).toEqual({ accion: "registrar", sesion });
  });
  it("activa, sin pagar y sin nada que cobrar: se apaga; con algo vivo: se queda", () => {
    expect(accionDeConciliacion({ estado: "activo", ...deCotizacion }, [], { cotizacion: { status: "expirada" } })).toEqual({ accion: "apagar", motivo: "la cotización venció" });
    expect(accionDeConciliacion({ estado: "activo", ...deReserva }, [], { reserva: viva })).toEqual({ accion: "nada" });
    expect(accionDeConciliacion({ estado: "cancelado", ...deReserva }, [], { reserva: { ...viva, status: "cancelled" } })).toEqual({ accion: "nada" });
  });
  it("Stripe no la conoce: si estaba activa es de la otra cuenta; una sesión en $0 no es un pago", () => {
    expect(accionDeConciliacion({ estado: "activo", ...deReserva }, "no-existe", undefined)).toEqual({ accion: "otra-cuenta" });
    expect(accionDeConciliacion({ estado: "cancelado", ...deReserva }, "no-existe", undefined)).toEqual({ accion: "nada" });
    expect(accionDeConciliacion({ estado: "activo", ...deReserva }, [{ ...sesion, montoCentavos: 0 }], { reserva: viva })).toEqual({ accion: "nada" });
  });
});

describe("reembolsos y contracargos de Stripe (cobros#8, web#6)", () => {
  const cobro = { id: "m1", monto: 3600, anulado: false };
  it("🔴 devolución completa de un pago con su cobro: se anula solo y Manolo recibe el aviso", () => {
    const d = decidirReembolso({ cobros: [cobro], cargo: 3600, reembolsado: 3600 });
    expect(d).toEqual({ accion: "anular", cobroId: "m1" });
    expect(tituloReembolso(d, { folio: "HP-1", cliente: "Ana", cargo: 3600, reembolsado: 3600 })).toContain("se anuló solo");
  });
  it("🔴 devolución parcial ($900 de $3,600): no se anula; dice anular y registrar los $2,700 que se quedaron", () => {
    const d = decidirReembolso({ cobros: [cobro], cargo: 3600, reembolsado: 900 });
    expect(d).toEqual({ accion: "avisar", por: "parcial" });
    const t = tituloReembolso(d, { folio: "HP-1", cliente: "Ana", cargo: 3600, reembolsado: 900 })!;
    expect(t).toContain("$900");
    expect(t).toContain("$2,700");
  });
  it("si no hay un único cobro de ese importe, no adivina: avisa", () => {
    expect(decidirReembolso({ cobros: [cobro, { id: "m2", monto: 3600, anulado: false }], cargo: 3600, reembolsado: 3600 })).toEqual({ accion: "avisar", por: "no-cuadra" });
    expect(decidirReembolso({ cobros: [{ id: "m3", monto: 1000, anulado: false }], cargo: 3600, reembolsado: 3600 })).toEqual({ accion: "avisar", por: "no-cuadra" });
    expect(decidirReembolso({ cobros: [], cargo: 3600, reembolsado: 3600 })).toEqual({ accion: "avisar", por: "sin-cobro" });
  });
  it("una reserva con el pago web y el saldo por liga: anula solo el que cuadra con el cargo", () => {
    const d = decidirReembolso({ cobros: [cobro, { id: "m4", monto: 2000, anulado: false }], cargo: 3600, reembolsado: 3600 });
    expect(d).toEqual({ accion: "anular", cobroId: "m1" });
    expect(unicoCobroVivoDe([cobro, { id: "m5", monto: 3600, anulado: true }], 3600)).toEqual(cobro);
  });
  it("ya lo había anulado una persona: nada que hacer ni avisar", () => {
    const d = decidirReembolso({ cobros: [{ ...cobro, anulado: true }], cargo: 3600, reembolsado: 3600 });
    expect(d).toEqual({ accion: "nada" });
    expect(tituloReembolso(d, { folio: "HP-1", cliente: "Ana", cargo: 3600, reembolsado: 3600 })).toBeNull();
  });
  it("contracargo: el plazo para responder va en el aviso", () => {
    const t = tituloContracargo({ folio: "HP-1", cliente: "Ana", monto: 3600, venceEl: "2026-11-20" });
    expect(t).toContain("antes del 20 nov");
    expect(t).toContain("$3,600");
    expect(t.length).toBeLessThanOrEqual(200);
  });
});

describe("Cobros → «Lo que falta de una reserva» (cobros#9)", () => {
  const nueva = new Date("2026-10-20T12:00:00-06:00");
  const vieja = new Date("2026-08-01T12:00:00-06:00");
  const r = (i: number, o: Partial<{ totalAmount: number; depositoPagado: number; stripePaymentIntentId: string | null; createdAt: Date; status: string }> = {}) =>
    ({ id: `r${i}`, totalAmount: 5000, depositoPagado: 5000, stripePaymentIntentId: null, createdAt: nueva, status: "paid", ...o });
  it("🔴 una reserva vieja con saldo aparece aunque haya 70 más recientes pagadas", () => {
    const lista = [...Array.from({ length: 70 }, (_, i) => r(i)), r(99, { depositoPagado: 1500, status: "pending", createdAt: new Date("2026-09-10T12:00:00-06:00") })];
    const out = reservasParaPagoRestante(lista);
    expect(out.map(x => x.id)).toEqual(["r99"]);
    expect(out[0].saldo).toBe(3500);
  });
  it("🔴 con la regla de Reservas: una web reciente con su cobro de Stripe anulado SÍ debe; una vieja pagada por Stripe no", () => {
    const anulada = r(1, { depositoPagado: 0, stripePaymentIntentId: "pi_x", createdAt: nueva, status: "pending" });
    const historica = r(2, { depositoPagado: 0, stripePaymentIntentId: "pi_y", createdAt: vieja });
    expect(reservasParaPagoRestante([anulada, historica]).map(x => x.id)).toEqual(["r1"]);
  });
  it("las canceladas no salen", () => {
    expect(reservasParaPagoRestante([r(1, { depositoPagado: 0, status: "cancelled" })])).toEqual([]);
  });
});

describe("viaje CDMX: la liga del saldo (cobros#5, web#5)", () => {
  const base = { total: 12000, cobrado: 1200, pagoEnLinea: true, correoValido: true, faltanDias: 3, diasAntes: 5, hoy: "2026-11-05", liga: null };
  it("🔴 pagó en línea y su anticipo no quedó registrado: NO se manda la liga por el total, se avisa", () => {
    expect(decidirLigaSaldoViaje({ ...base, cobrado: 0 })).toEqual({ accion: "sin-anticipo" });
    expect(tituloViajeSinAnticipo({ folio: "HPX1", cliente: "Ana" })).toContain("No le mandé la liga");
  });
  it("con su anticipo, la liga es por el saldo (12,000 − 1,200)", () => {
    expect(decidirLigaSaldoViaje(base)).toEqual({ accion: "crear", monto: 10800, apagarLaAnterior: false });
  });
  it("una venta del panel sin pago en línea sí recibe su liga aunque no haya pagado nada", () => {
    expect(decidirLigaSaldoViaje({ ...base, cobrado: 0, pagoEnLinea: false })).toEqual({ accion: "crear", monto: 12000, apagarLaAnterior: false });
  });
  it("🔴 la liga guardada se apagó (lugar cancelado y luego reactivado): se hace otra, no se recuerda la muerta", () => {
    const liga = { monto: 10800, enviada: "2026-11-01", estado: "cancelado" };
    expect(decidirLigaSaldoViaje({ ...base, faltanDias: 0, liga })).toEqual({ accion: "crear", monto: 10800, apagarLaAnterior: false });
  });
  it("cambió el saldo: se apaga la vieja y se hace otra; igual y vence hoy: se recuerda una vez", () => {
    expect(decidirLigaSaldoViaje({ ...base, liga: { monto: 12000, enviada: "2026-11-01", estado: "activo" } })).toEqual({ accion: "crear", monto: 10800, apagarLaAnterior: true });
    expect(decidirLigaSaldoViaje({ ...base, faltanDias: 0, liga: { monto: 10800, enviada: "2026-11-01", estado: "activo" } })).toEqual({ accion: "recordar" });
    expect(decidirLigaSaldoViaje({ ...base, faltanDias: 0, liga: { monto: 10800, enviada: "2026-11-01", recordatorio: "2026-11-04", estado: "activo" } })).toEqual({ accion: "nada" });
  });
  it("una liga pagada con el mismo saldo no se repite; lejos del vencimiento, sin correo o sin saldo: nada", () => {
    expect(decidirLigaSaldoViaje({ ...base, liga: { monto: 10800, enviada: "2026-11-01", estado: "pagado" } })).toEqual({ accion: "nada" });
    expect(decidirLigaSaldoViaje({ ...base, faltanDias: 9 })).toEqual({ accion: "nada" });
    expect(decidirLigaSaldoViaje({ ...base, correoValido: false })).toEqual({ accion: "nada" });
    expect(decidirLigaSaldoViaje({ ...base, cobrado: 11995 })).toEqual({ accion: "nada" });
  });
});

describe("candados del dinero también en la API (cobros#12)", () => {
  const hoy = "2026-11-05";
  it("🔴 «suyo de hoy» se mide con el día en que se capturó, no con la fecha editable del cobro", () => {
    const ayer = new Date("2026-11-04T18:00:00-06:00");
    const hoyMismo = new Date("2026-11-05T09:30:00-06:00");
    expect(puedeAnularCobro({ puedeAnular: false, quien: "Erick", creadoPor: "Erick", creadoEn: hoyMismo, hoy })).toBe(true);
    expect(puedeAnularCobro({ puedeAnular: false, quien: "Erick", creadoPor: "Erick", creadoEn: ayer, hoy })).toBe(false);
    expect(puedeAnularCobro({ puedeAnular: false, quien: "Erick", creadoPor: "Manolo", creadoEn: hoyMismo, hoy })).toBe(false);
    expect(puedeAnularCobro({ puedeAnular: true, quien: "Martín", creadoPor: "Erick", creadoEn: ayer, hoy })).toBe(true);
  });
  it("🔴 el comprobante «obligatorio» tiene que existir, ser de esta reserva y estar libre", () => {
    const enc = [
      { id: "e1", bookingId: "R", movimientoId: null },
      { id: "e2", bookingId: "OTRA", movimientoId: null },
      { id: "e3", bookingId: "R", movimientoId: "cobro-viejo" },
    ];
    expect(evidenciasUsables(["e1", "e2", "e3", "x", 7, "e1"], enc, "R")).toEqual(["e1"]);
    expect(evidenciasUsables(["x"], [], "R")).toEqual([]);
    expect(evidenciasUsables("e1", enc, "R")).toEqual([]);
  });
  it("el comprobante de un cobro ya registrado solo lo quita quien puede anular", () => {
    expect(puedeQuitarComprobante({ movimientoId: "m1", puedeAnular: false })).toBe(false);
    expect(puedeQuitarComprobante({ movimientoId: "m1", puedeAnular: true })).toBe(true);
    expect(puedeQuitarComprobante({ movimientoId: null, puedeAnular: false })).toBe(true);
  });
  it("🔴 Operación no crea una reserva «pagada» con depósito por la API; un socio sí lo corrige", () => {
    expect(dineroAlCrearReserva({ depositoPagado: 5000, status: "paid", totalAmount: 5000 }, false)).toEqual({ depositoPagado: 0, status: "pending" });
    expect(dineroAlCrearReserva({ depositoPagado: 5000, totalAmount: 5000 }, true)).toEqual({ depositoPagado: 5000, status: "paid" });
    expect(dineroAlCrearReserva({ depositoPagado: 1000, status: "pending", totalAmount: 5000 }, true)).toEqual({ depositoPagado: 1000, status: "pending" });
    expect(dineroAlCrearReserva({ totalAmount: 0 }, false)).toEqual({ depositoPagado: 0, status: "pending" });
  });
});

describe("corregir un cobro (cobros#10, cobros#11)", () => {
  it("🔴 la referencia vacía se conserva: corregir quién lo recibió ya no borra el folio ni la sesión de Stripe", () => {
    expect(referenciaAlEditar("SPEI 1234", "")).toBe("SPEI 1234");
    expect(referenciaAlEditar("cs_live_abc", undefined)).toBe("cs_live_abc");
    expect(referenciaAlEditar("SPEI 1234", "  SPEI 5678 ")).toBe("SPEI 5678");
    expect(referenciaAlEditar(null, "")).toBeNull();
  });
  it("la referencia de los cobros viejos sale de su concepto", () => {
    expect(referenciaDeConcepto("Cobro transferencia · 1234")).toBe("1234");
    expect(referenciaDeConcepto("Cobro liga de pago · cs_live_a1 · b")).toBe("cs_live_a1 · b");
    expect(referenciaDeConcepto("Cobro efectivo")).toBeNull();
    expect(referenciaDeConcepto("Cobro anterior al desglose")).toBeNull();
    expect(referenciaDeConcepto("Gasolina · 12")).toBeNull();
  });
  it("🔴 corregir no dice «Cobro registrado» (ni anular): cada acción, su aviso", () => {
    expect(avisoDeCobro("corregido")).not.toContain("registrado");
    expect(avisoDeCobro("corregido")).toContain("el dinero no cambió");
    expect(avisoDeCobro("anulado")).toBe("✅ Cobro anulado");
    expect(avisoDeCobro("registrado")).toBe("✅ Cobro registrado");
  });
});

describe("cambiar el total de una reserva sin renglones de cobro (reservas#5)", () => {
  const vieja = new Date("2026-05-10T12:00:00-06:00");
  const nueva = new Date("2026-10-20T12:00:00-06:00");
  it("🔴 una vieja pagada por Stripe con depósito 0: se fija lo cobrado con el total de ANTES", () => {
    expect(cobradoAFijarAntesDeEditar({ totalAmount: 3100, depositoPagado: 0, stripePaymentIntentId: "pi_x", createdAt: vieja }, 4650, 0)).toBe(3100);
  });
  it("una capturada a mano con anticipo: se fija su anticipo; sin nada cobrado, nada", () => {
    expect(cobradoAFijarAntesDeEditar({ totalAmount: 5000, depositoPagado: 1500, stripePaymentIntentId: null, createdAt: nueva }, 6000, 0)).toBe(1500);
    expect(cobradoAFijarAntesDeEditar({ totalAmount: 5000, depositoPagado: 0, stripePaymentIntentId: null, createdAt: nueva }, 6000, 0)).toBe(0);
  });
  it("si el total no cambia o ya tiene renglones, no hace falta", () => {
    expect(cobradoAFijarAntesDeEditar({ totalAmount: 3100, depositoPagado: 0, stripePaymentIntentId: "pi_x", createdAt: vieja }, 3100, 0)).toBe(0);
    expect(cobradoAFijarAntesDeEditar({ totalAmount: 3100, depositoPagado: 0, stripePaymentIntentId: "pi_x", createdAt: vieja }, 4650, 1)).toBe(0);
  });
});

describe("hechos de ejemplo: el tipo acepta lo que arma la base", () => {
  it("una liga de cotización con su reserva viva", () => {
    const h: HechosLiga = { cotizacion: { status: "aceptada" }, reserva: { folio: "HP-M-9", status: "pending", total: 100, cobrado: 30 } };
    expect(motivoParaApagarLiga(deCotizacion, h)).toBeNull();
  });
});

// ── Revisión del lote 3 (5 nov 2026): lo que se le escapó al arreglo ─────────

// (La baja de correos ya no vence ninguna cotización —lote 4, 5 nov 2026—:
// solo pausa sus correos. Su prueba vive en `cotizacionesEnvio.test.ts`.)

describe("revisión: de qué pago de Stripe es cada cobro (reembolsos)", () => {
  // Así mide una sesión de Stripe (~66): el código de antes guardaba solo 60 en el concepto.
  const sesion = "cs_live_a1B2c3D4e5F6g7H8i9J0kLmNoPqRsTuVwXyZ0123456789abcdefghijklmn";
  const viejo = { id: "v", concepto: `Cobro liga de pago · ${sesion.slice(0, 60)}`, referencia: null, stripeRef: null };
  const nuevo = { id: "n", concepto: `Cobro liga de pago · ${sesion}`, referencia: sesion, stripeRef: "pi_1" };
  const web = { id: "w", concepto: "Cobro liga de pago", referencia: null, stripeRef: null };
  const historico = { id: "h", concepto: "Cobro anterior al desglose", referencia: null, stripeRef: null };
  const spei = { id: "s", concepto: "Cobro transferencia · 123456", referencia: "123456", stripeRef: null };
  it("🔴 el cobro de una liga pagada antes del arreglo se reconoce por su sesión, aunque la guardara recortada", () => {
    expect(cobrosDeLaSesion([viejo, web, historico, spei], sesion).map(c => c.id)).toEqual(["v"]);
    expect(cobrosDeLaSesion([nuevo], sesion).map(c => c.id)).toEqual(["n"]);
    expect(cobrosDeLaSesion([{ ...web, stripeRef: sesion }], sesion).map(c => c.id)).toEqual(["w"]);
    expect(cobrosDeLaSesion([viejo], "cs_live_OTRA_sesion_distinta_de_la_que_se_pago_00000000000000000000")).toEqual([]);
    // Un trozo demasiado corto no basta para decir que es esa sesión.
    expect(cobrosDeLaSesion([{ ...viejo, concepto: "Cobro liga de pago · cs_live_a1" }], sesion)).toEqual([]);
  });
  it("🔴 la devolución del pago del sitio no toma el cobro de una liga de la misma reserva", () => {
    expect(cobrosDelPagoWeb([web, historico, viejo, nuevo]).map(c => c.id)).toEqual(["w", "h"]);
  });
});

describe("revisión: devolución parcial y luego el resto (cobros#8)", () => {
  const original = { id: "m1", monto: 3600, anulado: true };
  it("🔴 ya se había devuelto una parte y lo de ese pago ya está anulado: avisa en vez de callarse", () => {
    const d = decidirReembolso({ cobros: [original], cargo: 3600, reembolsado: 3600, huboParcialAntes: true });
    expect(d).toEqual({ accion: "avisar", por: "resto" });
    const t = tituloReembolso(d, { folio: "HP-1", cliente: "Ana", cargo: 3600, reembolsado: 3600, huboParcialAntes: true })!;
    expect(t).toContain("antes había devuelto una parte");
    expect(t).toContain("$3,600");
    expect(t.length).toBeLessThanOrEqual(200);
  });
  it("sin devolución parcial antes, que ya esté anulado no pide nada (como antes)", () => {
    expect(decidirReembolso({ cobros: [original], cargo: 3600, reembolsado: 3600 })).toEqual({ accion: "nada" });
  });
  it("si el cobro original sigue vivo se anula solo, y el aviso recuerda lo registrado a mano", () => {
    const d = decidirReembolso({ cobros: [{ ...original, anulado: false }], cargo: 3600, reembolsado: 3600, huboParcialAntes: true });
    expect(d).toEqual({ accion: "anular", cobroId: "m1" });
    const t = tituloReembolso(d, { folio: "HP-1", cliente: "María Guadalupe de los Ángeles Hernández", cargo: 3600, reembolsado: 3600, huboParcialAntes: true })!;
    expect(t).toContain("se anuló solo");
    expect(t).toMatch(/a mano/);
    expect(t.length).toBeLessThanOrEqual(200);
  });
  it("una parcial sigue siendo parcial aunque hubiera otra antes", () => {
    expect(decidirReembolso({ cobros: [{ ...original, anulado: false }], cargo: 3600, reembolsado: 1400, huboParcialAntes: true })).toEqual({ accion: "avisar", por: "parcial" });
  });
});
