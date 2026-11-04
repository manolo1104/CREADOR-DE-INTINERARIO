import { describe, expect, it } from "vitest";
import { cabeEnTope, costoDe, mesMX, RESERVA_USD } from "../agente/costos";
import { aplicarExtraccion, mismoTexto, transcripcion } from "../agente/copilotoReglas";

describe("agente: lo que cuesta y el tope", () => {
  it("costo por modelo con los precios oficiales (por millón de tokens)", () => {
    // Haiku 5.5: $0.10 entrada / $0.50 salida → 3,000 + 400 tokens = $0.0005
    expect(costoDe("claude-haiku-5-5", { input_tokens: 3000, output_tokens: 400 })).toBeCloseTo(0.0005, 6);
    // Opus 5.5: $4 / $20 → 4,000 + 600 tokens = $0.028
    expect(costoDe("claude-opus-5-5", { input_tokens: 4000, output_tokens: 600 })).toBeCloseTo(0.028, 6);
    // Caché: leer = 0.1×, escribir = 1.25× la entrada
    expect(costoDe("claude-opus-5-5", { cache_read_input_tokens: 1_000_000 })).toBeCloseTo(0.4, 6);
    expect(costoDe("claude-opus-5-5", { cache_creation_input_tokens: 1_000_000 })).toBeCloseTo(5, 6);
  });
  it("un modelo desconocido se cobra al precio más alto (mejor pasarse del cálculo que del tope)", () => {
    expect(costoDe("modelo-nuevo", { input_tokens: 1_000_000 })).toBe(10);
  });
  it("tope: no se llama si la reserva no cabe; tope 0 = apagado", () => {
    expect(cabeEnTope(9.99, 10, "extraer")).toBe(true);
    expect(cabeEnTope(9.99, 10, "responder")).toBe(false);
    expect(cabeEnTope(10 - RESERVA_USD.responder, 10, "responder")).toBe(true);
    expect(cabeEnTope(0, 0, "extraer")).toBe(false);
  });
  it("el mes es el de México (el 1 a las 00:30 en México sigue siendo… el día 1)", () => {
    expect(mesMX(new Date("2026-12-01T06:30:00Z"))).toBe("2026-12");
    expect(mesMX(new Date("2026-12-01T05:30:00Z"))).toBe("2026-11");
  });
});

describe("agente: lo que llena solo", () => {
  const SLUGS = ["tamul", "edward-james"];
  const vacio = { tours: [], fechaViaje: null, pax: null, perfil: null, quiereHospedaje: null };
  it("llena lo vacío con datos válidos", () => {
    const r = aplicarExtraccion(vacio, { tours: ["tamul", "inventado"], fechaViaje: "2026-11-20", pax: 4, perfil: "familia", quiereHospedaje: true }, "2026-11-04", SLUGS);
    expect(r.data).toEqual({ tours: ["tamul"], fechaViaje: "2026-11-20", pax: 4, perfil: "familia", quiereHospedaje: true });
    expect(r.cambios).toHaveLength(5);
  });
  it("nunca pisa lo que una persona ya escribió", () => {
    const r = aplicarExtraccion({ tours: ["edward-james"], fechaViaje: "2026-12-01", pax: 2, perfil: "pareja", quiereHospedaje: false },
      { tours: ["tamul"], fechaViaje: "2026-11-20", pax: 4, perfil: "familia", quiereHospedaje: true }, "2026-11-04", SLUGS);
    expect(r.data).toEqual({});
  });
  it("descarta fechas pasadas o imposibles y personas fuera de rango", () => {
    expect(aplicarExtraccion(vacio, { fechaViaje: "2026-10-01" }, "2026-11-04", SLUGS).data).toEqual({});
    expect(aplicarExtraccion(vacio, { fechaViaje: "2026-02-30" }, "2026-01-04", SLUGS).data).toEqual({});
    expect(aplicarExtraccion(vacio, { pax: 0 }, "2026-11-04", SLUGS).data).toEqual({});
    expect(aplicarExtraccion(vacio, { pax: 2.5 }, "2026-11-04", SLUGS).data).toEqual({});
    expect(aplicarExtraccion(vacio, { perfil: "otro" as never }, "2026-11-04", SLUGS).data).toEqual({});
  });
});

describe("agente: el chat que se le manda y la medición", () => {
  it("se recorta por el principio: lo último es lo que importa", () => {
    const ms = Array.from({ length: 50 }, (_, i) => ({ direccion: i % 2 ? "sale" : "entra", texto: `mensaje ${i} ${"x".repeat(80)}`, tipo: "texto", fecha: new Date(Date.UTC(2026, 10, 4, 16, i)).toISOString() }));
    const t = transcripcion(ms, 1000);
    expect(t.length).toBeLessThanOrEqual(1000);
    expect(t).toContain("mensaje 49");
    expect(t).not.toContain("mensaje 0 ");
    expect(t.split("\n").at(-1)).toMatch(/^\[\d\d\/\d\d,? \d\d:\d\d\] Equipo: mensaje 49/);
  });
  it("aprobada sin cambios = mismo texto aunque cambien espacios", () => {
    expect(mismoTexto("Hola  Ana,\nsí hay lugar.", "Hola Ana, sí hay lugar.")).toBe(true);
    expect(mismoTexto("Hola Ana", "Hola Ana!")).toBe(false);
  });
});
