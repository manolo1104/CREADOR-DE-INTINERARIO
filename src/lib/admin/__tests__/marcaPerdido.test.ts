import { describe, expect, it } from "vitest";
import {
  ETAPA_PERDIDO, LARGO_MOTIVO_CHIP, esCotizacionPerdida, esLeadPerdido, leadsDeCotizaciones, marcaPerdido,
} from "@/lib/cotizaciones/marcaPerdido";

// La marca «Perdido» de las cotizaciones (19 nov 2026, pedido de Manolo): sale
// de la etapa de su lead, nunca de un campo guardado en la cotización.

describe("marcaPerdido: el chip sale de la etapa del lead", () => {
  it("sin lead (las de antes del CRM) o con el lead abierto, no hay marca", () => {
    expect(marcaPerdido(null)).toBeNull();
    expect(marcaPerdido(undefined)).toBeNull();
    expect(marcaPerdido({})).toBeNull();
    for (const etapa of ["nuevo", "calificado", "cotizado", "seguimiento", "confirmado", "operado"]) {
      expect(marcaPerdido({ etapa, motivoPerdida: null })).toBeNull();
    }
  });

  it("🔴 un motivo que se quedó guardado en un lead que ya regresó NO lo marca: manda la etapa", () => {
    expect(marcaPerdido({ etapa: "confirmado", motivoPerdida: "precio" })).toBeNull();
    // El nombre viejo de «Anticipo pagado» tampoco es Perdido.
    expect(marcaPerdido({ etapa: "anticipo", motivoPerdida: "precio" })).toBeNull();
  });

  it("Perdido con su motivo, con las palabras de la lista de motivos", () => {
    expect(marcaPerdido({ etapa: "perdido", motivoPerdida: "precio" })?.texto).toBe("Perdido · Precio");
    expect(marcaPerdido({ etapa: "perdido", motivoPerdida: "no-contesto" })?.texto).toBe("Perdido · No contestó tras cotizar");
    expect(marcaPerdido({ etapa: "perdido", motivoPerdida: "otro-operador" })?.motivo).toBe("Se fue con otro operador");
    // «Otro» sin «(explícalo)» y con el detalle que escribió quien lo marcó.
    expect(marcaPerdido({ etapa: "perdido", motivoPerdida: "otro: se casó" })?.texto).toBe("Perdido · Otro: se casó");
    expect(marcaPerdido({ etapa: "perdido", motivoPerdida: "precio: le pareció caro el RZR" })?.motivo).toBe("Precio: le pareció caro el RZR");
  });

  it("Perdido sin motivo guardado: solo «Perdido»", () => {
    const m = marcaPerdido({ etapa: "perdido", motivoPerdida: null });
    expect(m).toEqual(expect.objectContaining({ texto: "Perdido", motivo: null }));
    expect(m?.ayuda.startsWith("Su lead está Perdido.")).toBe(true);
    expect(marcaPerdido({ etapa: "perdido", motivoPerdida: "   " })?.texto).toBe("Perdido");
  });

  it("un motivo largo se recorta en el chip y va completo en la ayuda", () => {
    const largo = "otro: reserva HP-M-ABC123 cancelada — el cliente se enfermó y ya no pudo viajar con su familia";
    const m = marcaPerdido({ etapa: "perdido", motivoPerdida: largo })!;
    expect(m.texto.startsWith("Perdido · Otro: reserva HP-M-ABC123")).toBe(true);
    expect(m.texto.endsWith("…")).toBe(true);
    expect(m.texto.length).toBeLessThanOrEqual("Perdido · ".length + LARGO_MOTIVO_CHIP);
    expect(m.motivo).toBe("Otro: reserva HP-M-ABC123 cancelada — el cliente se enfermó y ya no pudo viajar con su familia");
    expect(m.ayuda).toContain(m.motivo!);
  });

  it("los saltos de línea y espacios de más del detalle no rompen el chip", () => {
    expect(marcaPerdido({ etapa: "perdido", motivoPerdida: "otro:  le\n pareció   lejos " })?.texto).toBe("Perdido · Otro: le pareció lejos");
  });

  it("la ayuda dice qué pasa: sin correos automáticos y la liga sigue sirviendo (solo si la cotización sigue viva)", () => {
    const enviada = marcaPerdido({ etapa: "perdido", motivoPerdida: "precio" }, "enviada")!;
    expect(enviada.ayuda).toContain("correos automáticos");
    expect(enviada.ayuda).toContain("si paga, el lead regresa solo");
    // Sin decir el estado, se explica como viva.
    expect(marcaPerdido({ etapa: "perdido", motivoPerdida: "precio" })!.ayuda).toContain("correos automáticos");
    expect(marcaPerdido({ etapa: "perdido", motivoPerdida: "precio" }, "borrador")!.ayuda).toContain("correos automáticos");
    // A una vencida o aceptada ya no le iban a llegar correos: solo el motivo.
    expect(marcaPerdido({ etapa: "perdido", motivoPerdida: "precio" }, "expirada")!.ayuda).toBe("Su lead está Perdido (Precio).");
    expect(marcaPerdido({ etapa: "perdido", motivoPerdida: "precio" }, "aceptada")!.ayuda).toBe("Su lead está Perdido (Precio).");
    // El chip es el mismo en cualquier estado.
    expect(marcaPerdido({ etapa: "perdido", motivoPerdida: "precio" }, "expirada")!.texto).toBe("Perdido · Precio");
  });
});

describe("crons: qué cotizaciones son de un lead Perdido", () => {
  it("esLeadPerdido solo con la etapa «perdido»", () => {
    expect(ETAPA_PERDIDO).toBe("perdido");
    expect(esLeadPerdido({ etapa: "perdido" })).toBe(true);
    expect(esLeadPerdido({ etapa: "operado" })).toBe(false);
    expect(esLeadPerdido(null)).toBe(false);
  });

  it("leadsDeCotizaciones: los ids sin repetir y sin las que no tienen lead", () => {
    expect(leadsDeCotizaciones([
      { oportunidadId: "a" }, { oportunidadId: null }, { oportunidadId: "b" }, { oportunidadId: "a" }, {}, { oportunidadId: "" },
    ])).toEqual(["a", "b"]);
    expect(leadsDeCotizaciones([])).toEqual([]);
  });

  it("esCotizacionPerdida: la de un lead del conjunto; sin lead, nunca", () => {
    const perdidos = new Set(["a"]);
    expect(esCotizacionPerdida({ oportunidadId: "a" }, perdidos)).toBe(true);
    expect(esCotizacionPerdida({ oportunidadId: "b" }, perdidos)).toBe(false);
    expect(esCotizacionPerdida({ oportunidadId: null }, perdidos)).toBe(false);
    expect(esCotizacionPerdida({}, new Set<string>())).toBe(false);
  });
});
