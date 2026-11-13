import { describe, expect, it } from "vitest";
import { fechaDeFolio, tipoFolio } from "../folio";

const ms = Date.UTC(2026, 9, 20, 15, 30); // 20 oct 2026 15:30 UTC
const b36 = ms.toString(36).toUpperCase();

describe("tipoFolio: el canal según el número de confirmación", () => {
  it("HP-M- + 8 + 2 = capturada a mano en el panel", () => {
    expect(tipoFolio(`HP-M-${b36}AB`)).toBe("manual");
    expect(tipoFolio("HP-M-MV9VL30V")).toBe("manual");
  });
  it("HP + 8 (paquetes, pagos rescatados) y HP + 8 + 2 (viaje CDMX) = pago web", () => {
    expect(tipoFolio(`HP${b36}`)).toBe("web");
    expect(tipoFolio(`HP${b36}Q7`)).toBe("web");
  });
  it("COT- y HP-P son cotizaciones; lo demás, otro", () => {
    expect(tipoFolio(`COT-${b36}X1`)).toBe("cotizacion");
    expect(tipoFolio("HP-P1A2B3C4D")).toBe("cotizacion");
    expect(tipoFolio("")).toBe("otro");
    expect(tipoFolio("ABC123")).toBe("otro");
  });
  it("no distingue mayúsculas ni espacios", () => {
    expect(tipoFolio(`  hp-m-${b36.toLowerCase()}ab `)).toBe("manual");
  });
});

describe("fechaDeFolio: la hora de creación viene dentro del folio", () => {
  it("recupera el instante exacto de un folio manual y de uno web", () => {
    expect(fechaDeFolio(`HP-M-${b36}AB`)?.getTime()).toBe(ms);
    expect(fechaDeFolio(`HP${b36}`)?.getTime()).toBe(ms);
    expect(fechaDeFolio(`HP${b36}Q7`)?.getTime()).toBe(ms);
  });
  it("un folio real de octubre de 2026 cae en octubre de 2026", () => {
    const d = fechaDeFolio("HP-M-MV9VL30V");
    expect(d?.toISOString().slice(0, 7)).toBe("2026-10");
  });
  it("sin folio reconocible no inventa fecha", () => {
    expect(fechaDeFolio("COT-ABC")).toBeNull();
    expect(fechaDeFolio("")).toBeNull();
    expect(fechaDeFolio("HP00000001")).toBeNull(); // 1970: fuera de 2020–2100
  });
});
