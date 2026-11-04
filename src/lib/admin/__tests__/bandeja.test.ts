import { describe, expect, it } from "vitest";
import { esChatIndividual, origenDelPrimerMensaje, primerMensajeEn5, telefonoDeChat, tipoDeMensaje } from "../bandeja";

const TOURS = [{ slug: "tamul", nombre: "Expedición Tamul" }, { slug: "edward-james", nombre: "Ruta Surrealista Edward James" }];

describe("Bandeja: quién escribe", () => {
  it("solo chats individuales (ni grupos, ni estados, ni canales)", () => {
    expect(esChatIndividual("5214891234567@c.us")).toBe(true);
    expect(esChatIndividual("123456789012345@lid")).toBe(true);
    expect(esChatIndividual("120363@g.us")).toBe(false);
    expect(esChatIndividual("status@broadcast")).toBe(false);
    expect(esChatIndividual("1203@newsletter")).toBe(false);
  });
  it("el teléfono de un @c.us sale del id (sin el 1 viejo); el de un @lid solo si el puente lo resolvió", () => {
    expect(telefonoDeChat("5214891234567@c.us")).toBe("+524891234567");
    expect(telefonoDeChat("15551234567@c.us")).toBe("+15551234567");
    expect(telefonoDeChat("98765432109876@lid")).toBeNull();
    expect(telefonoDeChat("98765432109876@lid", "524891234567")).toBe("+524891234567");
  });
  it("tipos de whatsapp-web.js a los nuestros", () => {
    expect(tipoDeMensaje("chat")).toBe("texto");
    expect(tipoDeMensaje("ptt")).toBe("audio");
    expect(tipoDeMensaje("image")).toBe("imagen");
    expect(tipoDeMensaje("vcard")).toBe("otro");
  });
});

describe("Bandeja: de dónde viene el primer mensaje", () => {
  it("el botón del sitio → canal «WhatsApp del sitio» y el tour que nombra", () => {
    expect(origenDelPrimerMensaje('Hola, me interesa el tour "Expedición Tamul" para 2 adultos. Total estimado: $3,000 MXN.', TOURS)).toEqual({ canal: "whatsapp_sitio", tours: ["tamul"] });
    expect(origenDelPrimerMensaje("Hola, quiero información sobre los tours de la Huasteca.", TOURS)).toEqual({ canal: "whatsapp_sitio", tours: [] });
  });
  it("un mensaje escrito a mano → WhatsApp (y el tour si lo nombra, con o sin acentos)", () => {
    expect(origenDelPrimerMensaje("buenas, precio de la expedicion tamul?", TOURS)).toEqual({ canal: "whatsapp", tours: ["tamul"] });
    expect(origenDelPrimerMensaje("Hola", TOURS)).toEqual({ canal: "whatsapp", tours: [] });
  });
});

describe("KPI primer mensaje en 5 min", () => {
  const t = (iso: string) => new Date(iso);
  const desde = t("2026-11-02T06:00:00Z"), hasta = t("2026-11-09T05:59:59Z"); // semana lun–dom en México
  it("cuenta solo chats NUEVOS de la semana; en horario (8–20 h MX) y contestados en ≤ 5 min", () => {
    const r = primerMensajeEn5([
      // 10:00 MX, contestado a los 3 min → cuenta
      [{ direccion: "entra", fecha: t("2026-11-03T16:00:00Z") }, { direccion: "sale", fecha: t("2026-11-03T16:03:00Z") }],
      // 10:00 MX, contestado a los 12 min → en horario pero tarde
      [{ direccion: "entra", fecha: t("2026-11-04T16:00:00Z") }, { direccion: "sale", fecha: t("2026-11-04T16:12:00Z") }],
      // 23:00 MX → fuera de horario (nuevo, pero no cuenta para el %)
      [{ direccion: "entra", fecha: t("2026-11-05T05:00:00Z") }, { direccion: "sale", fecha: t("2026-11-05T14:00:00Z") }],
      // Ya le habíamos escrito antes → no es cliente nuevo
      [{ direccion: "sale", fecha: t("2026-11-03T15:00:00Z") }, { direccion: "entra", fecha: t("2026-11-03T16:00:00Z") }],
      // Su primer mensaje fue la semana pasada → no es de esta semana
      [{ direccion: "entra", fecha: t("2026-10-28T16:00:00Z") }, { direccion: "entra", fecha: t("2026-11-03T16:00:00Z") }],
      // Viene del historial importado → no se mide
      [{ direccion: "entra", fecha: t("2026-11-03T16:00:00Z"), importado: true }],
    ], desde, hasta);
    expect(r).toEqual({ nuevas: 3, enHorario: 2, en5: 1 });
  });
});
