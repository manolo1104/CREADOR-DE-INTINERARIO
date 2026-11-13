import { describe, expect, it } from "vitest";
import { RUBRICA, bandaScore, calcularScore, limpiarCaptura, recomendacionesSugeridas } from "../rubrica";

describe("rúbrica del score de WhatsApp", () => {
  it("son las 14 reglas del prompt y suman 100 puntos", () => {
    expect(RUBRICA).toHaveLength(14);
    expect(RUBRICA.reduce((t, r) => t + r.puntos, 0)).toBe(100);
  });

  it("todo cumplido = 100; nada capturado = sin score", () => {
    const todo = Object.fromEntries(RUBRICA.map(r => [r.clave, { aplican: 4, cumplen: 4 }]));
    expect(calcularScore(todo).score).toBe(100);
    expect(calcularScore({}).score).toBeNull();
  });

  it("una regla que no aplicó se deja fuera y el total se reescala a 100", () => {
    // Solo dos reglas aplicaron: seguimiento día 3 (25 pts) al 50 % y sin caritas (5 pts) al 100 %.
    const r = calcularScore({ "seguimiento-d3": { aplican: 4, cumplen: 2 }, "sin-caritas": { aplican: 10, cumplen: 10 } });
    expect(r.puntosAplicables).toBe(30);
    expect(r.score).toBe(58); // (12.5 + 5) / 30 = 58.3 %
    expect(r.peores[0].clave).toBe("seguimiento-d3");
  });

  it("bandas: 85 meta, 70–84 cerca, < 70 corregir", () => {
    expect(bandaScore(85)).toBe("meta");
    expect(bandaScore(84)).toBe("cerca");
    expect(bandaScore(70)).toBe("cerca");
    expect(bandaScore(69)).toBe("corregir");
    expect(bandaScore(null)).toBeNull();
  });

  it("lo que llega del navegador se limpia: reglas desconocidas fuera, cumplen nunca pasa de aplican", () => {
    const c = limpiarCaptura({ "sin-caritas": { aplican: "5", cumplen: 9 }, "inventada": { aplican: 3, cumplen: 3 }, "pdf": { aplican: -2, cumplen: 1 } });
    expect(c).toEqual({ "sin-caritas": { aplican: 5, cumplen: 5 }, "pdf": { aplican: 0, cumplen: 0 } });
  });

  it("las recomendaciones salen de lo que más puntos costó", () => {
    const r = calcularScore({ "primer-5min": { aplican: 10, cumplen: 6 }, "siguiente-paso": { aplican: 8, cumplen: 4 }, "se-presenta": { aplican: 10, cumplen: 10 } });
    const rec = recomendacionesSugeridas(r);
    expect(rec[0]).toContain("Termina con siguiente paso: se cumplió en 4 de 8 chats (50 %)");
    expect(rec).toHaveLength(2);
  });
});
