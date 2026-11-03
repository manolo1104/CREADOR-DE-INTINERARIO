import { describe, expect, it } from "vitest";
import { calcularScorecard, numeroSemana, type EntradaScorecard } from "../scorecard";

const base: EntradaScorecard = {
  leadsNuevos: 76, respuestas5min: 51, leadsCotizados: 44, cotizadosDelPanel: 40, score: 75, resenasNuevas: 2,
  reservasCreadas: 23, conAnticipo: 20, vendidoSemana: 60_000, vendidoMes: 238_889,
  salidas: 27, personas: 76, ingresoConCostos: 37_730, margenConCostos: 11_318, salidasConCostos: 8, reservasOperadas: 10,
};

describe("scorecard semanal (fórmulas del prompt)", () => {
  it("lead → reserva 30 % con 23 de 76; debajo de la meta de 40 %", () => {
    const s = calcularScorecard(base);
    const k = Object.fromEntries(s.kpis.map(k => [k.clave, k]));
    expect(k.conversion.valor).toBe("30 %");
    expect(k.conversion.estado).toEqual({ tono: "problema", texto: "Debajo de meta" });
    expect(k.respuesta.valor).toBe("67 %");
    expect(k.leads.contexto).toContain("44 cotizados (58 %");
    expect(k.pax.valor).toBe("2.8");
    expect(k.margen.valor).toBe("30 %");
    expect(k.score.estado.texto).toBe("Cerca");
    expect(k.resenas.valor).toBe("20 %");
    expect(k.vendido.contexto).toContain("$238,889 de $310,000");
  });
  it("sin revisión capturada, los KPI de leads dicen «Sin capturar» y los cotizados salen del panel", () => {
    const s = calcularScorecard({ ...base, leadsNuevos: null, respuestas5min: null, leadsCotizados: null, score: null, resenasNuevas: null });
    const k = Object.fromEntries(s.kpis.map(k => [k.clave, k]));
    expect(k.leads.conDato).toBe(false);
    expect(k.conversion.valor).toBe("—");
    expect(s.embudo[1].n).toBe(40);
    expect(k.pax.conDato).toBe(true);
  });
  it("el embudo señala la mayor caída", () => {
    const s = calcularScorecard(base);
    expect(s.embudo.map(p => p.n)).toEqual([76, 44, 23, 20]);
    expect(s.mayorCaida).toContain("entre cotizados y reservaron");
  });
  it("semana ISO", () => {
    expect(numeroSemana("2026-11-02")).toBe(45);
    expect(numeroSemana("2026-01-05")).toBe(2);
  });
});
