import { describe, expect, it } from "vitest";
import { motivoNoSeElimina } from "../borrarReserva";

const sinNada = { cobrado: 0, movimientosVivos: 0, ligasPagadas: 0, pagoStripe: false };

describe("eliminar una reserva (20 nov 2026)", () => {
  it("una prueba, un duplicado o un error sin dinero se elimina", () => {
    expect(motivoNoSeElimina(sinNada)).toBeNull();
  });
  it("con lo cobrado > 0 no se elimina y dice cuánto", () => {
    expect(motivoNoSeElimina({ ...sinNada, cobrado: 930 })).toContain("$930 cobrados");
  });
  it("con un cobro o gasto sin anular no se elimina, aunque lo cobrado diga 0", () => {
    expect(motivoNoSeElimina({ ...sinNada, movimientosVivos: 1 })).toContain("anúlalos primero");
  });
  it("con una liga pagada no se elimina", () => {
    expect(motivoNoSeElimina({ ...sinNada, ligasPagadas: 1 })).toContain("liga de pago ya pagada");
  });
  it("pagada en el sitio con tarjeta no se elimina", () => {
    expect(motivoNoSeElimina({ ...sinNada, pagoStripe: true })).toContain("Stripe");
  });
});
