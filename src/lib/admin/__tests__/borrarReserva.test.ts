import { describe, expect, it } from "vitest";
import { decidirBorrado } from "../borrarReserva";

const sinNada = { cobrado: 0, movimientosVivos: 0, ligasPagadas: 0, pagoStripe: false, enCorteCerrado: null };

describe("eliminar una reserva (20 nov 2026)", () => {
  it("una prueba, un duplicado o un error sin dinero se elimina directo", () => {
    expect(decidirBorrado(sinNada)).toEqual({ tipo: "si" });
  });
  it("con cobros anotados (el bot con /confirma, o a mano) se elimina, pero pregunta diciendo cuánto", () => {
    const d = decidirBorrado({ ...sinNada, cobrado: 930, movimientosVivos: 1 });
    expect(d.tipo).toBe("confirmar");
    expect(d.tipo === "confirmar" && d.aviso).toContain("$930 anotados como cobrados");
  });
  it("con un gasto anotado y $0 cobrado también pregunta", () => {
    expect(decidirBorrado({ ...sinNada, movimientosVivos: 1 }).tipo).toBe("confirmar");
  });
  it("pagada en el sitio con tarjeta nunca se elimina", () => {
    const d = decidirBorrado({ ...sinNada, cobrado: 3100, pagoStripe: true });
    expect(d.tipo).toBe("no");
    expect(d.tipo === "no" && d.motivo).toContain("Stripe");
  });
  it("con una liga pagada nunca se elimina", () => {
    expect(decidirBorrado({ ...sinNada, cobrado: 930, ligasPagadas: 1 }).tipo).toBe("no");
  });
  it("si ya entró en un corte semanal cerrado no se elimina", () => {
    const d = decidirBorrado({ ...sinNada, enCorteCerrado: "2026-11-16" });
    expect(d.tipo === "no" && d.motivo).toContain("2026-11-16");
  });
});
