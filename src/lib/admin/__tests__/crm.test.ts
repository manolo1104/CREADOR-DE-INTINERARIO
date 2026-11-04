import { describe, expect, it } from "vitest";
import {
  agruparTareas, contarMotivos, estadoFecha, etapaPorReglas, etiquetaMotivoPerdida, motivoPerdidaParaGuardar,
  normalizarTelefono, validarCambioEtapa, ETAPAS_PIPELINE, etapaPorCobro, etapaSiguiente, viajeYaPaso
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

describe("recordatorios de seguimiento", () => {
  it("hora válida de 24 h", async () => {
    const { horaValida } = await import("../crm");
    expect(horaValida("9:05")).toBe("09:05");
    expect(horaValida("21:30")).toBe("21:30");
    expect(horaValida("24:00")).toBeNull();
    expect(horaValida("")).toBeNull();
  });
  it("cuándo toca avisar (hora de México, de 8 a 21 h)", async () => {
    const { tocaAvisar } = await import("../crm");
    const t = (vence: string, hora: string | null, extra = {}) => ({ vence, hora, estado: "pendiente", avisadaEn: null, ...extra });
    expect(tocaAvisar(t("2026-11-04", "11:00"), "2026-11-04", "10:50")).toBe(false);
    expect(tocaAvisar(t("2026-11-04", "11:00"), "2026-11-04", "10:56")).toBe(true); // 5 min antes
    expect(tocaAvisar(t("2026-11-04", null), "2026-11-04", "08:00")).toBe(true);    // sin hora: a primera hora
    expect(tocaAvisar(t("2026-11-04", null), "2026-11-04", "07:59")).toBe(false);   // fuera de horario
    expect(tocaAvisar(t("2026-11-02", "18:00"), "2026-11-04", "09:00")).toBe(true); // vencida
    expect(tocaAvisar(t("2026-11-05", null), "2026-11-04", "12:00")).toBe(false);   // mañana
    expect(tocaAvisar(t("2026-11-04", null, { avisadaEn: new Date() }), "2026-11-04", "12:00")).toBe(false);
    expect(tocaAvisar(t("2026-11-04", null, { estado: "hecha" }), "2026-11-04", "12:00")).toBe(false);
  });
  it("hora de México de un instante", async () => {
    const { ahoraMX } = await import("../crm");
    expect(ahoraMX(new Date("2026-11-04T17:30:00Z"))).toEqual({ hoy: "2026-11-04", hhmm: "11:30" });
    expect(ahoraMX(new Date("2026-11-05T03:10:00Z"))).toEqual({ hoy: "2026-11-04", hhmm: "21:10" });
  });
  it("el orden pone la hora: sin hora al final del día", async () => {
    const { ordenTareas } = await import("../crm");
    const ts = [{ id: "a", responsable: "E", estado: "pendiente", vence: "2026-11-04", hora: null }, { id: "b", responsable: "E", estado: "pendiente", vence: "2026-11-04", hora: "16:00" }, { id: "c", responsable: "E", estado: "pendiente", vence: "2026-11-04", hora: "09:30" }];
    expect([...ts].sort(ordenTareas).map(t => t.id)).toEqual(["c", "b", "a"]);
  });
});

describe("etapa por lo cobrado y la siguiente", () => {
  it("sin cobro En seguimiento, con anticipo Anticipo pagado, liquidada Confirmado", () => {
    expect(etapaPorCobro(0, 4800)).toBe("seguimiento");
    expect(etapaPorCobro(1440, 4800)).toBe("anticipo");
    expect(etapaPorCobro(4800, 4800)).toBe("confirmado");
    expect(etapaPorCobro(5000, 4800)).toBe("confirmado");
  });
  it("la siguiente sigue el camino y para en Operado", () => {
    expect(etapaSiguiente("calificado")).toBe("cotizado");
    expect(etapaSiguiente("anticipo")).toBe("confirmado");
    expect(etapaSiguiente("confirmado")).toBe("operado");
    expect(etapaSiguiente("operado")).toBeNull();
    expect(etapaSiguiente("perdido")).toBeNull();
  });
});

describe("viaje ya pasado → Operado", () => {
  it("al día siguiente del ÚLTIMO tour, no el mismo día", () => {
    expect(viajeYaPaso(["2026-11-03"], "2026-11-03")).toEqual({ paso: false, ultima: "2026-11-03" });
    expect(viajeYaPaso(["2026-11-03"], "2026-11-04")).toEqual({ paso: true, ultima: "2026-11-03" });
    expect(viajeYaPaso(["2026-11-02", "2026-11-05"], "2026-11-04").paso).toBe(false);
  });
  it("sin fecha válida no se mueve", () => {
    expect(viajeYaPaso([null, "", "por definir"], "2026-11-04")).toEqual({ paso: false, ultima: null });
  });
});
