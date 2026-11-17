import { describe, expect, it } from "vitest";
import { RUBRICA, RUBRICA_V1, RUBRICA_V2, bandaScore, calcularScore, limpiarCaptura, recomendacionesSugeridas, versionDeCaptura } from "../rubrica";

describe("rúbrica del score de WhatsApp", () => {
  it("las dos versiones son de 14 reglas y suman 100 puntos; la de hoy es la Estructura de oro", () => {
    for (const rub of [RUBRICA_V1, RUBRICA_V2]) {
      expect(rub).toHaveLength(14);
      expect(rub.reduce((t, r) => t + r.puntos, 0)).toBe(100);
    }
    expect(RUBRICA).toBe(RUBRICA_V2);
    // Lo que más pesa en v2: el PDF a todo calificado y el seguimiento.
    const top = [...RUBRICA_V2].sort((a, b) => b.puntos - a.puntos).slice(0, 2).map(r => r.clave);
    expect(top).toEqual(["seguimiento-d3", "cotiza-a-todos"]);
  });

  it("una semana guardada con la rúbrica anterior se sigue leyendo con ella", () => {
    expect(versionDeCaptura({ "sin-caritas": { aplican: 60, cumplen: 59 } })).toBe(1);
    expect(versionDeCaptura({ _version: 1 })).toBe(1);
    expect(versionDeCaptura({ "itinerario": { aplican: 3, cumplen: 1 } })).toBe(2);
    expect(versionDeCaptura(null)).toBe(2);
    // La revisión real del 5–12 nov (PDF de Calificación): 80 con la v1.
    const v1 = { "primer-5min": { aplican: 23, cumplen: 14 }, "se-presenta": { aplican: 36, cumplen: 35 }, "cotiza-a-todos": { aplican: 17, cumplen: 15 },
      "cotiza-30min": { aplican: 17, cumplen: 12 }, "pdf": { aplican: 19, cumplen: 17 }, "pdf-correo": { aplican: 17, cumplen: 17 }, "anticipo-30": { aplican: 17, cumplen: 17 },
      "vigencia": { aplican: 17, cumplen: 16 }, "siguiente-paso": { aplican: 44, cumplen: 34 }, "link-o-msi": { aplican: 29, cumplen: 27 }, "reserva-avisada": { aplican: 7, cumplen: 7 },
      "seguimiento-d3": { aplican: 15, cumplen: 9 }, "llamada-escrito": { aplican: 5, cumplen: 5 }, "sin-caritas": { aplican: 60, cumplen: 59 } };
    expect(calcularScore(limpiarCaptura(v1), versionDeCaptura(v1)).score).toBe(80);
  });

  it("todo cumplido = 100; nada capturado = sin score", () => {
    const todo = Object.fromEntries(RUBRICA.map(r => [r.clave, { aplican: 4, cumplen: 4 }]));
    expect(calcularScore(todo).score).toBe(100);
    const todo1 = Object.fromEntries(RUBRICA_V1.map(r => [r.clave, { aplican: 4, cumplen: 4 }]));
    expect(calcularScore(todo1, 1).score).toBe(100);
    expect(calcularScore({}).score).toBeNull();
  });

  it("una regla que no aplicó se deja fuera y el total se reescala a 100", () => {
    // Solo dos reglas aplicaron: seguimiento día 3 (25 pts) al 50 % y sin caritas (5 pts) al 100 %.
    const r = calcularScore({ "seguimiento-d3": { aplican: 4, cumplen: 2 }, "sin-caritas": { aplican: 10, cumplen: 10 } }, 1);
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
    const r = calcularScore({ "primer-5min": { aplican: 10, cumplen: 6 }, "siguiente-paso": { aplican: 8, cumplen: 4 }, "se-presenta": { aplican: 10, cumplen: 10 } }, 1);
    const rec = recomendacionesSugeridas(r);
    expect(rec[0]).toContain("Termina con siguiente paso: se cumplió en 4 de 8 chats (50 %)");
    expect(rec).toHaveLength(2);
  });
});
