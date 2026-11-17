// La base de lo que contesta el equipo (Erick), 17 nov 2026: que no meta
// precios inventados, otras marcas, datos de clientes ni números de cuenta.
import { describe, expect, it } from "vitest";
import { RESPUESTAS_EQUIPO, TEMAS_RESPUESTA } from "@/lib/bot/respuestasEquipo";
import { TOURS_DB, TOURS_RETIRADOS } from "@/lib/tours";

const MOTIVOS = new Set([
  "cambio_post_pago", "cancelacion", "descuento", "fuera_catalogo", "traslado_sin_tarifa",
  "hotel", "salud", "pregunta_sin_respuesta", "factura", "recogida", "clima", "grupo", "otro",
]);
// Las ÚNICAS cifras en pesos que puede decir esta base (las de los tours salen
// de la lista del sitio): tope de OXXO, seguro opcional, guía en inglés del
// Jardín, entrada a la Aldea Nanacatli, taxi de la central y el autobús.
const CIFRAS_PERMITIDAS = new Set(["5,000", "80", "500", "50", "70", "650"]);

const texto = (r: (typeof RESPUESTAS_EQUIPO)[number]) => [r.respuesta, r.nota ?? "", ...r.preguntas].join(" ");

describe("respuestas del equipo", () => {
  it("ids únicos, tema conocido y al menos una pregunta", () => {
    const ids = RESPUESTAS_EQUIPO.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const r of RESPUESTAS_EQUIPO) {
      expect(TEMAS_RESPUESTA[r.tema], r.id).toBeTruthy();
      expect(r.preguntas.length, r.id).toBeGreaterThan(0);
      expect(r.respuesta.length, r.id).toBeLessThan(700);
    }
  });

  it("los tours existen y ninguno está retirado", () => {
    const vigentes = new Set(TOURS_DB.map((t) => t.slug));
    for (const r of RESPUESTAS_EQUIPO) {
      for (const slug of r.tours ?? []) {
        expect(vigentes.has(slug), `${r.id}: ${slug}`).toBe(true);
        expect(TOURS_RETIRADOS.has(slug), `${r.id}: ${slug}`).toBe(false);
      }
      expect(texto(r), r.id).not.toMatch(/buceo|media luna|instagrameable/i);
    }
  });

  it("los motivos de escalación existen en el bot", () => {
    for (const r of RESPUESTAS_EQUIPO) {
      if (r.alEquipo) expect(MOTIVOS.has(r.alEquipo.motivo), r.id).toBe(true);
    }
  });

  it("sin precios de tours: solo las cifras fijas confirmadas", () => {
    for (const r of RESPUESTAS_EQUIPO) {
      for (const m of Array.from(texto(r).matchAll(/\$\s?([\d,]+)/g))) {
        expect(CIFRAS_PERMITIDAS.has(m[1]), `${r.id}: $${m[1]}`).toBe(true);
      }
    }
  });

  it("una sola marca y el dominio correcto", () => {
    for (const r of RESPUESTAS_EQUIPO) {
      expect(texto(r), r.id).not.toMatch(/sorprendente|xilitla 4x4|huastecapotosina\.com/i);
    }
  });

  it("sin números de cuenta, tarjetas ni teléfonos (el repo es público)", () => {
    for (const r of RESPUESTAS_EQUIPO) {
      expect(texto(r), r.id).not.toMatch(/\d{10,}|\d{4}[ -]\d{4}[ -]\d{4}|clabe\s*:?\s*\d/i);
    }
  });

  it("nada de descuentos prometidos: siempre al equipo", () => {
    for (const r of RESPUESTAS_EQUIPO) {
      if (/descuento/i.test(r.preguntas.join(" ")) && !/niño|grupo/i.test(r.id)) {
        expect(r.alEquipo?.motivo ?? "", r.id).toMatch(/descuento|grupo|otro/);
      }
      expect(r.respuesta, r.id).not.toMatch(/\d+\s?%\s+de descuento/i);
    }
  });
});
