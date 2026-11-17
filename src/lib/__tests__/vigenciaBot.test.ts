// Vigencia de las cotizaciones del bot y secuencia de correos alineada con
// WhatsApp (Manolo, 17 nov 2026).
import { describe, expect, it } from "vitest";
import { calcularVencimiento, vigenciaBotPara } from "@/lib/vencimientoCotizacion";
import { ESPERA_HORAS, siguientePaso } from "@/lib/quoteFollowUp";

describe("vigenciaBotPara: según qué tan cerca está el primer tour", () => {
  const hoy = "2026-11-17";
  it("menos de 72 horas → 24 horas", () => {
    expect(vigenciaBotPara("2026-11-17", hoy)).toBe("24h");
    expect(vigenciaBotPara("2026-11-19", hoy)).toBe("24h");
  });
  it("de 3 a 14 días (p. ej. a 10 días) → 72 horas", () => {
    expect(vigenciaBotPara("2026-11-20", hoy)).toBe("72h");
    expect(vigenciaBotPara("2026-11-27", hoy)).toBe("72h");
    expect(vigenciaBotPara("2026-12-01", hoy)).toBe("72h");
  });
  it("15 días o más → 7 días; sin fecha, 7 días", () => {
    expect(vigenciaBotPara("2026-12-02", hoy)).toBe("7dias");
    expect(vigenciaBotPara(null, hoy)).toBe("7dias");
  });
  it("con varios tours manda el primero", () => {
    expect(vigenciaBotPara(["2026-12-20", "2026-11-18", null], hoy)).toBe("24h");
  });
  it("la fecha límite sigue topada en la víspera", () => {
    expect(calcularVencimiento("2026-11-17T18:00:00Z", "72h", "2026-11-20")).toBe("2026-11-19");
    expect(calcularVencimiento("2026-11-17T18:00:00Z", "72h", "2026-11-27")).toBe("2026-11-20");
  });
});

describe("secuencia de correos: 3 h, 24 h y 72 h, dentro de la vigencia", () => {
  const enviada = "2026-11-17T17:00:00Z"; // 11 am de México
  const meta = (seqPaso: number) => ({ seqDesde: enviada, seqPaso, seqEstado: "activo" });
  const en = (h: number) => new Date(Date.parse(enviada) + h * 3600_000);

  it("los mismos tiempos que WhatsApp", () => {
    expect(ESPERA_HORAS).toEqual({ 2: 3, 3: 24, 4: 72 });
  });
  it("el primer recordatorio sale a las 3 h, no a la hora", () => {
    expect(siguientePaso(meta(1), "2026-12-19", en(1), "2026-11-24")).toBeNull();
    expect(siguientePaso(meta(1), "2026-12-19", en(3), "2026-11-24")).toEqual({ paso: 2 });
  });
  it("un tour cercano ya no cancela la secuencia entera: sale lo que cabe en la vigencia", () => {
    // Tour el 20, vigencia 72 h topada en la víspera (19): salen 3 h y 24 h; el de 72 h ya no.
    expect(siguientePaso(meta(1), "2026-11-20", en(3), "2026-11-19")).toEqual({ paso: 2 });
    expect(siguientePaso(meta(2), "2026-11-20", en(24), "2026-11-19")).toEqual({ paso: 3 });
    expect(siguientePaso(meta(3), "2026-11-20", en(30), "2026-11-19")).toEqual({ corte: "terminado" });
  });
});
