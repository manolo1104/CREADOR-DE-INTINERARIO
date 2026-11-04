import { describe, expect, it } from "vitest";
import {
  agruparTareas, contarMotivos, estadoFecha, etapaPorReglas, etiquetaMotivoPerdida, motivoPerdidaParaGuardar,
  normalizarTelefono, validarCambioEtapa, ETAPAS_PIPELINE,
} from "../crm";

describe("teléfonos a E.164", () => {
  it("10 dígitos de México, con o sin 52 / 521 / espacios", () => {
    expect(normalizarTelefono("489 109 0388")).toBe("+524891090388");
    expect(normalizarTelefono("52 489 109 0388")).toBe("+524891090388");
    expect(normalizarTelefono("+521 489 109 0388")).toBe("+524891090388");
    expect(normalizarTelefono("(489) 109-0388")).toBe("+524891090388");
  });
  it("otro país con + se respeta; basura no", () => {
    expect(normalizarTelefono("+1 512 555 0199")).toBe("+15125550199");
    expect(normalizarTelefono("0044 7700 900123")).toBe("+447700900123");
    expect(normalizarTelefono("12345")).toBeNull();
    expect(normalizarTelefono("")).toBeNull();
  });
});

describe("etapas", () => {
  it("el pipeline tiene las 6 columnas del prompt", () => {
    expect(ETAPAS_PIPELINE).toEqual(["nuevo", "calificado", "cotizado", "seguimiento", "anticipo", "confirmado"]);
  });
  it("con tour, fecha y pax, Nuevo sube solo a Calificado; nunca baja ni salta", () => {
    const datos = { tours: ["expedicion-tamul"], fechaViaje: "2026-11-21", pax: 4 };
    expect(etapaPorReglas("nuevo", datos)).toBe("calificado");
    expect(etapaPorReglas("nuevo", { ...datos, pax: null })).toBe("nuevo");
    expect(etapaPorReglas("cotizado", { tours: [], fechaViaje: null, pax: null })).toBe("cotizado");
  });
  it("Perdido exige motivo; «otro» exige detalle", () => {
    expect(validarCambioEtapa("perdido", null)).toEqual({ ok: false, error: "Para marcarlo perdido hay que decir el motivo." });
    expect(validarCambioEtapa("cotizado", null)).toEqual({ ok: true });
    expect(validarCambioEtapa("ganado", null).ok).toBe(false);
    expect(motivoPerdidaParaGuardar("otro", "")).toBeNull();
    expect(motivoPerdidaParaGuardar("precio", "le pareció caro el RZR")).toBe("precio: le pareció caro el RZR");
    expect(etiquetaMotivoPerdida("no-contesto")).toBe("No contestó tras cotizar");
    expect(etiquetaMotivoPerdida("otro: se enfermó")).toBe("Otro: se enfermó");
  });
});

describe("seguimientos", () => {
  it("fechas contra hoy", () => {
    expect(estadoFecha("2026-11-02", "2026-11-03")).toBe("vencido");
    expect(estadoFecha("2026-11-03", "2026-11-03")).toBe("hoy");
    expect(estadoFecha("2026-11-04", "2026-11-03")).toBe("proximo");
    expect(estadoFecha(null, "2026-11-03")).toBe("sin-fecha");
  });
  it("por responsable, quien tiene más vencidas primero; las hechas no cuentan", () => {
    const g = agruparTareas([
      { id: "1", responsable: "Erick", vence: "2026-11-01", estado: "pendiente" },
      { id: "2", responsable: "Erick", vence: "2026-11-03", estado: "pendiente" },
      { id: "3", responsable: "Martín", vence: "2026-11-05", estado: "pendiente" },
      { id: "4", responsable: "Erick", vence: "2026-10-30", estado: "hecha" },
    ], "2026-11-03");
    expect(g.map(x => x.responsable)).toEqual(["Erick", "Martín"]);
    expect(g[0].vencidas.map(t => t.id)).toEqual(["1"]);
    expect(g[0].hoy.map(t => t.id)).toEqual(["2"]);
    expect(g[1].proximas.map(t => t.id)).toEqual(["3"]);
  });
  it("motivos de pérdida del mes, de más a menos", () => {
    expect(contarMotivos(["precio", "no-contesto: 3 días", "precio: caro", null, "basura"])).toEqual([
      { clave: "precio", etiqueta: "Precio", n: 2 }, { clave: "no-contesto", etiqueta: "No contestó tras cotizar", n: 1 },
    ]);
  });
});
