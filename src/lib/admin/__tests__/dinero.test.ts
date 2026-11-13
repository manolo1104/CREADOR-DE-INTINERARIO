import { describe, expect, it } from "vitest";
import { DESDE_DEPOSITO_SIEMPRE, montoCobrado, saldoPendiente } from "../dinero";

const antes   = new Date("2026-08-01T12:00:00-06:00"); // antes del 29 sep 2026
const despues = new Date("2026-10-15T12:00:00-06:00"); // después

describe("montoCobrado: lo que de verdad entró de una reserva", () => {
  it("el anticipo registrado manda, con o sin Stripe", () => {
    expect(montoCobrado({ totalAmount: 7500, depositoPagado: 2250, stripePaymentIntentId: null, createdAt: despues })).toBe(2250);
    expect(montoCobrado({ totalAmount: 3100, depositoPagado: 3100, stripePaymentIntentId: "pi_x", createdAt: antes })).toBe(3100);
  });
  it("una reserva VIEJA pagada por Stripe sin anticipo guardado cuenta como pagada completa", () => {
    expect(montoCobrado({ totalAmount: 3100, depositoPagado: 0, stripePaymentIntentId: "pi_x", createdAt: antes })).toBe(3100);
  });
  it("una reserva NUEVA con Stripe y anticipo en 0 es un reembolso: 0 cobrado", () => {
    expect(DESDE_DEPOSITO_SIEMPRE.toISOString()).toBe("2026-09-29T06:00:00.000Z");
    expect(montoCobrado({ totalAmount: 3100, depositoPagado: 0, stripePaymentIntentId: "pi_x", createdAt: despues })).toBe(0);
  });
  it("capturada a mano sin anticipo: 0, aunque el status diga paid", () => {
    expect(montoCobrado({ totalAmount: 5700, depositoPagado: 0, stripePaymentIntentId: null, createdAt: despues })).toBe(0);
  });
});

describe("saldoPendiente", () => {
  it("total menos cobrado, nunca negativo", () => {
    expect(saldoPendiente({ totalAmount: 7500, depositoPagado: 2250, stripePaymentIntentId: null, createdAt: despues })).toBe(5250);
    expect(saldoPendiente({ totalAmount: 3000, depositoPagado: 3300, stripePaymentIntentId: null, createdAt: despues })).toBe(0);
  });
  it("los dos saldos vencidos de la línea base (3 nov 2026) suman $5,750", () => {
    const rzr = { totalAmount: 5600, depositoPagado: 0, stripePaymentIntentId: null, createdAt: despues };
    const sur = { totalAmount: 2950, depositoPagado: 2800, stripePaymentIntentId: null, createdAt: despues };
    expect(saldoPendiente(rzr) + saldoPendiente(sur)).toBe(5750);
  });
});
