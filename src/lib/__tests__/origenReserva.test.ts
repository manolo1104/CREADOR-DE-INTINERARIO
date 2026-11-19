import { describe, expect, it } from "vitest";
import { ORIGENES_CAPTURA, ORIGENES_ELEGIBLES, ORIGEN_ETIQUETA, ORIGEN_POR_CONFIRMAR, origenDeCaptura, origenValido } from "../origenReserva";

// 19 nov 2026: «web» en una reserva = compró en el sitio (la `purchase` de GA4).
// Lo que se hace en el panel (a mano, al convertir, la liga pagada) nunca es «web».
describe("canal de las reservas hechas en el panel", () => {
  it("la captura y la conversión no ofrecen «Web»; los leads sí", () => {
    expect(ORIGENES_CAPTURA).not.toContain("web");
    expect(ORIGENES_CAPTURA).toEqual(["whatsapp", "telefono", "walkin", "ota"]);
    expect(ORIGENES_ELEGIBLES).toContain("web");
  });

  it("«web» que llegue (pestaña vieja, lead de la web en una liga pagada) se guarda como «por confirmar»", () => {
    expect(origenDeCaptura("web")).toBe(ORIGEN_POR_CONFIRMAR);
    expect(origenDeCaptura(" WEB ")).toBe(ORIGEN_POR_CONFIRMAR);
  });

  it("sin dato o con basura → «por confirmar», nunca «web»", () => {
    for (const v of [undefined, null, "", "facebook", 3]) expect(origenDeCaptura(v)).toBe(ORIGEN_POR_CONFIRMAR);
  });

  it("los canales de verdad pasan tal cual", () => {
    for (const o of ["whatsapp", "telefono", "walkin", "ota", "whatsapp_sitio", "por_confirmar"]) expect(origenDeCaptura(o)).toBe(o);
  });

  it("origenValido sigue igual para leer reservas viejas y las compras del sitio", () => {
    expect(origenValido("web")).toBe("web");
    expect(origenValido("raro")).toBe("web");
    expect(origenValido("raro", "por_confirmar")).toBe("por_confirmar");
  });

  it("las etiquetas ya no confunden método de pago con canal", () => {
    expect(ORIGEN_ETIQUETA.web).toBe("Web (compró en el sitio)");
    expect(ORIGEN_ETIQUETA.por_confirmar).not.toMatch(/28 oct/);
  });
});
