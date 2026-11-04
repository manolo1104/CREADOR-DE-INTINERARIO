import { describe, expect, it } from "vitest";
import { resumenLead, type CotizacionCruda, type ReservaCruda } from "../resumenLead";

const cot = (x: Partial<CotizacionCruda> = {}): CotizacionCruda => ({
  id: "q1", quoteNumber: "COT-1", status: "enviada", totalAmount: 4000, tourName: "Ruta Surrealista", tourSlug: "ruta-surrealista",
  tourDate: "2026-11-20", adults: 2, children: 0, notes: null, createdAt: "2026-11-01T18:00:00Z",
  lineItems: [{ _meta: true, venceEl: "2026-11-05" }, { tourSlug: "ruta-surrealista", tourName: "Ruta Surrealista", tourDate: "2026-11-20", adults: 2, childrenMid: 1, childrenSmall: 0 }],
  packageItems: [{ _meta: true, anticipo: 1200, zonaHospedaje: "Ciudad Valles", notasInternas: "Pidió precio de grupo", descuento: { tipo: "percent", valor: 10 } },
    { hotel: "Paraíso Encantado", habitacion: "Suite", noches: 2 }],
  extraItems: [{ concepto: "Desayuno", cantidad: 3, precioUnitario: 150 }],
  ...x,
});
const res = (x: Partial<ReservaCruda> = {}): ReservaCruda => ({
  id: "r1", confirmationNumber: "HP-M-1", status: "pending", totalAmount: 4000, depositoPagado: 1200, stripePaymentIntentId: null,
  tourName: "Ruta Surrealista", tourDate: "2026-11-20", adults: 2, children: 1, notes: null, guia: "Beto", idiomaTour: "es",
  createdAt: "2026-11-03T18:00:00Z", packageItems: [], extraItems: [],
  lineItems: [{ _meta: true, anticipoAcordado: 1200, pickupLugar: "Hotel Valles, Ciudad Valles", zonaHospedaje: "Ciudad Valles" },
    { tourSlug: "ruta-surrealista", tourName: "Ruta Surrealista", tourDate: "2026-11-20", adults: 2, childrenMid: 1 }],
  ...x,
});

describe("resumen del lead", () => {
  it("con solo cotización: anticipo acordado, de dónde sale, vence, hospedaje y extras", () => {
    const r = resumenLead([cot()], [], "2026-11-04");
    expect(r.fuente).toEqual({ tipo: "cotizacion", id: "q1", folio: "COT-1" });
    expect(r.anticipo).toEqual({ acordado: 1200, esPorOmision: false, cobrado: null, falta: null });
    expect(r.saleDe).toBe("Ciudad Valles");
    expect(r.cotizacion?.vence).toBe("2026-11-05");
    expect(r.cotizacion?.estado).toBe("por-vencer");
    expect(r.hospedaje).toEqual(["Paraíso Encantado · 2 noches · Suite"]);
    expect(r.extras).toEqual(["Desayuno × 3"]);
    expect(r.descuento).toBe("10 %");
    expect(r.grupo).toBe("2 adultos · 1 niño (6–10)");
    expect(r.notasInternas).toBe("Pidió precio de grupo");
  });
  it("sin anticipo pactado usa el 30 %", () => {
    const r = resumenLead([cot({ packageItems: [{ _meta: true }] })], [], "2026-11-04");
    expect(r.anticipo).toMatchObject({ acordado: 1200, esPorOmision: true });
  });
  it("con reserva: manda la reserva (cobrado, falta, punto de encuentro, guía)", () => {
    const r = resumenLead([cot({ status: "aceptada" })], [res()], "2026-11-04");
    expect(r.fuente?.tipo).toBe("reserva");
    expect(r.anticipo).toEqual({ acordado: 1200, esPorOmision: false, cobrado: 1200, falta: 2800 });
    expect(r.reserva).toMatchObject({ encuentro: "Hotel Valles, Ciudad Valles", guia: "Beto" });
  });
  it("una reserva cancelada no cuenta", () => {
    const r = resumenLead([cot()], [res({ status: "cancelled" })], "2026-11-04");
    expect(r.fuente?.tipo).toBe("cotizacion");
    expect(r.reserva).toBeNull();
  });
});
