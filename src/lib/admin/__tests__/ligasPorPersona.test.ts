import { describe, expect, it } from "vitest";
import {
  CREADOR_LIGA_COTIZACION, CREADOR_LIGA_PARTES, decidirLigaDeCotizacion, parteDeTitulo, repartirEnPartes,
} from "@/lib/admin/ligasReglas";

// Una liga por persona (16 nov 2026, «Estructura de oro»).

describe("repartirEnPartes", () => {
  it("reparte parejo y suma exacto", () => {
    expect(repartirEnPartes(930, 2)).toEqual([465, 465]);
    expect(repartirEnPartes(1000, 3)).toEqual([334, 333, 333]);
    expect(repartirEnPartes(1000, 3).reduce((a, b) => a + b, 0)).toBe(1000);
  });
  it("lo que sobra va en las primeras partes", () => {
    expect(repartirEnPartes(1001, 4)).toEqual([251, 250, 250, 250]);
  });
  it("redondea el monto a pesos enteros", () => {
    expect(repartirEnPartes(930.4, 2)).toEqual([465, 465]);
  });
  it("solo de 2 a 12 personas", () => {
    expect(() => repartirEnPartes(1000, 1)).toThrow();
    expect(() => repartirEnPartes(1000, 13)).toThrow();
  });
  it("ninguna parte abajo del mínimo de Stripe", () => {
    expect(() => repartirEnPartes(30, 4)).toThrow(/menos de \$10/);
    expect(repartirEnPartes(40, 4)).toEqual([10, 10, 10, 10]);
  });
});

describe("parteDeTitulo", () => {
  it("lee «Parte 2 de 3 · …»", () => {
    expect(parteDeTitulo("Parte 2 de 3 · Anticipo de Expedición Tamul")).toEqual({ parte: 2, de: 3 });
  });
  it("una liga normal no es parte", () => {
    expect(parteDeTitulo("Anticipo de Expedición Tamul")).toBeNull();
    expect(parteDeTitulo(null)).toBeNull();
  });
});

describe("decidirLigaDeCotizacion con ligas por persona", () => {
  const base = { status: "enviada", reemplazada: false, conReserva: false, monto: 930 };
  it("con partes vivas, el correo ya no crea ni reusa la liga del anticipo completo", () => {
    const d = decidirLigaDeCotizacion({
      ...base,
      ligas: [
        { id: "p1", monto: 465, estado: "activo", creadoPor: CREADOR_LIGA_PARTES },
        { id: "p2", monto: 465, estado: "activo", creadoPor: CREADOR_LIGA_PARTES },
      ],
    });
    expect(d.accion).toBe("nada");
  });
  it("sin partes vivas, todo igual que antes: reusa la automática del mismo monto", () => {
    const d = decidirLigaDeCotizacion({
      ...base,
      ligas: [
        { id: "p1", monto: 465, estado: "cancelado", creadoPor: CREADOR_LIGA_PARTES },
        { id: "a1", monto: 930, estado: "activo", creadoPor: CREADOR_LIGA_COTIZACION },
      ],
    });
    expect(d).toEqual({ accion: "reusar", ligaId: "a1" });
  });
});
