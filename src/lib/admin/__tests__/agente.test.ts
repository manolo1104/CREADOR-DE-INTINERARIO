import { describe, expect, it } from "vitest";
import { cabeEnTope, costoDe, mesMX, RESERVA_USD } from "../agente/costos";
import { aplicarExtraccion, mismoTexto, transcripcion } from "../agente/copilotoReglas";

describe("agente: lo que cuesta y el tope", () => {
  it("costo por modelo con los precios oficiales (por millón de tokens)", () => {
    // Haiku 5.5: $0.10 entrada / $0.50 salida → 3,000 + 400 tokens = $0.0005
    expect(costoDe("claude-haiku-5-5", { input_tokens: 3000, output_tokens: 400 })).toBeCloseTo(0.0005, 6);
    // Opus 5.5: $4 / $20 → 4,000 + 600 tokens = $0.028
    expect(costoDe("claude-opus-5-5", { input_tokens: 4000, output_tokens: 600 })).toBeCloseTo(0.028, 6);
    // Caché: leer = 0.1×, escribir = 1.25× la entrada
    expect(costoDe("claude-opus-5-5", { cache_read_input_tokens: 1_000_000 })).toBeCloseTo(0.4, 6);
    expect(costoDe("claude-opus-5-5", { cache_creation_input_tokens: 1_000_000 })).toBeCloseTo(5, 6);
  });
  it("un modelo desconocido se cobra al precio más alto (mejor pasarse del cálculo que del tope)", () => {
    expect(costoDe("modelo-nuevo", { input_tokens: 1_000_000 })).toBe(10);
  });
  it("tope: no se llama si la reserva no cabe; tope 0 = apagado", () => {
    expect(cabeEnTope(9.99, 10, "extraer")).toBe(true);
    expect(cabeEnTope(9.99, 10, "responder")).toBe(false);
    expect(cabeEnTope(10 - RESERVA_USD.responder, 10, "responder")).toBe(true);
    expect(cabeEnTope(0, 0, "extraer")).toBe(false);
  });
  it("el mes es el de México (el 1 a las 00:30 en México sigue siendo… el día 1)", () => {
    expect(mesMX(new Date("2026-12-01T06:30:00Z"))).toBe("2026-12");
    expect(mesMX(new Date("2026-12-01T05:30:00Z"))).toBe("2026-11");
  });
});

describe("agente: lo que llena solo", () => {
  const SLUGS = ["tamul", "edward-james"];
  const vacio = { tours: [], fechaViaje: null, pax: null, perfil: null, quiereHospedaje: null };
  it("llena lo vacío con datos válidos", () => {
    const r = aplicarExtraccion(vacio, { tours: ["tamul", "inventado"], fechaViaje: "2026-11-20", pax: 4, perfil: "familia", quiereHospedaje: true }, "2026-11-04", SLUGS);
    expect(r.data).toEqual({ tours: ["tamul"], fechaViaje: "2026-11-20", pax: 4, perfil: "familia", quiereHospedaje: true });
    expect(r.cambios).toHaveLength(5);
  });
  it("nunca pisa lo que una persona ya escribió", () => {
    const r = aplicarExtraccion({ tours: ["edward-james"], fechaViaje: "2026-12-01", pax: 2, perfil: "pareja", quiereHospedaje: false },
      { tours: ["tamul"], fechaViaje: "2026-11-20", pax: 4, perfil: "familia", quiereHospedaje: true }, "2026-11-04", SLUGS);
    expect(r.data).toEqual({});
  });
  it("descarta fechas pasadas o imposibles y personas fuera de rango", () => {
    expect(aplicarExtraccion(vacio, { fechaViaje: "2026-10-01" }, "2026-11-04", SLUGS).data).toEqual({});
    expect(aplicarExtraccion(vacio, { fechaViaje: "2026-02-30" }, "2026-01-04", SLUGS).data).toEqual({});
    expect(aplicarExtraccion(vacio, { pax: 0 }, "2026-11-04", SLUGS).data).toEqual({});
    expect(aplicarExtraccion(vacio, { pax: 2.5 }, "2026-11-04", SLUGS).data).toEqual({});
    expect(aplicarExtraccion(vacio, { perfil: "otro" as never }, "2026-11-04", SLUGS).data).toEqual({});
  });
});

describe("agente: el chat que se le manda y la medición", () => {
  it("se recorta por el principio: lo último es lo que importa", () => {
    const ms = Array.from({ length: 50 }, (_, i) => ({ direccion: i % 2 ? "sale" : "entra", texto: `mensaje ${i} ${"x".repeat(80)}`, tipo: "texto", fecha: new Date(Date.UTC(2026, 10, 4, 16, i)).toISOString() }));
    const t = transcripcion(ms, 1000);
    expect(t.length).toBeLessThanOrEqual(1000);
    expect(t).toContain("mensaje 49");
    expect(t).not.toContain("mensaje 0 ");
    expect(t.split("\n").at(-1)).toMatch(/^\[\d\d\/\d\d,? \d\d:\d\d\] Equipo: mensaje 49/);
  });
  it("aprobada sin cambios = mismo texto aunque cambien espacios", () => {
    expect(mismoTexto("Hola  Ana,\nsí hay lugar.", "Hola Ana, sí hay lugar.")).toBe(true);
    expect(mismoTexto("Hola Ana", "Hola Ana!")).toBe(false);
  });
});

import { textoConfirmacion, textoProveedor } from "../agente/confirmaciones";
describe("preparación de salidas: confirmación de 48 h", () => {
  const base = { nombre: "Lucía Pérez", idioma: "es", tour: "Expedición Tamul", fecha: "2026-11-14", hora: "08:00", punto: "Plaza de Ciudad Valles", queLlevar: ["Ropa que se moje", "", "Bloqueador"], saldo: 1500, operador: "Erick" };
  it("en español: nombre de pila, día, hora, punto, qué llevar, saldo y pregunta final (sin caritas)", () => {
    const t = textoConfirmacion(base);
    expect(t).toContain("Hola Lucía, soy Erick de Huasteca Potosina Tours");
    expect(t).toContain("sábado, 14 de noviembre a las 08:00");
    expect(textoConfirmacion({ ...base, hora: "entre 8:00 y 9:00 AM" })).toContain("14 de noviembre, entre 8:00 y 9:00 AM.");
    expect(t).toContain("Punto de encuentro: Plaza de Ciudad Valles.");
    expect(t).toContain("Qué llevar: Ropa que se moje, Bloqueador.");
    expect(t).toContain("El saldo de $1,500 se paga en sitio.");
    expect(t.trim().endsWith("?")).toBe(true);
    expect(/[\uD800-\uDFFF\u2600-\u27BF]/.test(t)).toBe(false); // sin emojis
  });
  it("sin saldo no lo menciona; en inglés para clientes en inglés", () => {
    expect(textoConfirmacion({ ...base, saldo: 0 })).not.toContain("saldo");
    expect(textoConfirmacion({ ...base, idioma: "en" })).toContain("Hi Lucía, this is Erick");
  });
  it("al proveedor: día y personas", () => {
    expect(textoProveedor({ contacto: "Don Pepe Martínez", nombre: "Lanchas" }, "Expedición Tamul", "2026-11-14", 6)).toBe("Hola Don, te confirmo Expedición Tamul el sábado, 14 de noviembre: 6 personas. ¿Todo listo de tu lado?");
  });
});

import { primerMensajeDelChat, sumarRevisiones } from "../agente/calidadReglas";
describe("score automático", () => {
  it("suma las revisiones por regla (solo cuentan los chats donde aplica)", () => {
    const c = sumarRevisiones([
      { "sin-caritas": { aplica: true, cumple: true }, "seguimiento-d3": { aplica: true, cumple: false } },
      { "sin-caritas": { aplica: true, cumple: false }, "seguimiento-d3": { aplica: false, cumple: false } },
    ]);
    expect(c).toEqual({ "sin-caritas": { aplican: 2, cumplen: 1 }, "seguimiento-d3": { aplican: 1, cumplen: 0 } });
  });
  it("el primer mensaje en 5 min se mide con la hora real, no lo adivina Claude", () => {
    const d = new Date("2026-11-02T06:00:00Z"), h = new Date("2026-11-09T05:59:59Z");
    expect(primerMensajeDelChat([{ direccion: "entra", fecha: new Date("2026-11-03T16:00:00Z") }, { direccion: "sale", fecha: new Date("2026-11-03T16:04:00Z") }], d, h)).toEqual({ aplica: true, cumple: true });
    expect(primerMensajeDelChat([{ direccion: "entra", fecha: new Date("2026-11-03T16:00:00Z") }, { direccion: "sale", fecha: new Date("2026-11-03T16:09:00Z") }], d, h)).toEqual({ aplica: true, cumple: false });
    expect(primerMensajeDelChat([{ direccion: "entra", fecha: new Date("2026-11-04T05:00:00Z") }], d, h).aplica).toBe(false); // 23:00 MX
  });
});
