// Revisión del lote 9 (10 nov 2026): lo que se le escapó al arreglo.
import { describe, expect, it } from "vitest";
import { motivoParaNoLeerChats } from "../agente/copilotoReglas";
import { anotarEnvioAlMarcar, esPrimerEnvio } from "@/lib/cotizaciones/reglasEnvio";

describe("el agente de los chats en el cron no gasta donde no debe", () => {
  const llave = { ANTHROPIC_API_KEY: "sk-ant-x" };
  it("con RECORDATORIOS_INTERNOS=0 (servidor de pruebas) no corre aunque haya llave", () => {
    expect(motivoParaNoLeerChats({ ...llave, RECORDATORIOS_INTERNOS: "0" }, true)).toContain("RECORDATORIOS_INTERNOS=0");
  });
  it("sin llave o apagado no toca nada", () => {
    expect(motivoParaNoLeerChats({}, true)).toContain("llave");
    expect(motivoParaNoLeerChats({ ANTHROPIC_API_KEY: "  " }, true)).toContain("llave");
    expect(motivoParaNoLeerChats(llave, false)).toContain("apagado");
  });
  it("con llave, encendido y el reloj sin apagar, sí corre", () => {
    expect(motivoParaNoLeerChats(llave, true)).toBeNull();
    expect(motivoParaNoLeerChats({ ...llave, RECORDATORIOS_INTERNOS: "1" }, true)).toBeNull();
  });
});

describe("la fecha de envío es la del PRIMER envío, no la de un reenvío", () => {
  const hace = new Date("2026-10-20T16:00:00Z");
  it("un borrador que sale por primera vez la anota", () => {
    expect(esPrimerEnvio({ status: "borrador", enviadaEn: null })).toBe(true);
    expect(anotarEnvioAlMarcar({ status: "borrador", enviadaEn: null }, "enviada")).toBe(true);
  });
  it("reactivar una vencida o regresar una aceptada de antes del lote 9 no la mete en la semana de hoy", () => {
    expect(anotarEnvioAlMarcar({ status: "expirada", enviadaEn: null }, "enviada")).toBe(false);
    expect(anotarEnvioAlMarcar({ status: "aceptada", enviadaEn: null }, "enviada")).toBe(false);
    // Reenviar por correo o WhatsApp, o volver a bajar el PDF, de una que ya salió.
    expect(esPrimerEnvio({ status: "enviada", enviadaEn: null })).toBe(false);
    expect(esPrimerEnvio({ status: "expirada", enviadaEn: null })).toBe(false);
  });
  it("una que ya tiene fecha no se mueve", () => {
    expect(esPrimerEnvio({ status: "borrador", enviadaEn: hace })).toBe(false);
    expect(anotarEnvioAlMarcar({ status: "borrador", enviadaEn: hace }, "enviada")).toBe(false);
    expect(anotarEnvioAlMarcar({ status: "borrador", enviadaEn: null }, "aceptada")).toBe(false);
  });
});
