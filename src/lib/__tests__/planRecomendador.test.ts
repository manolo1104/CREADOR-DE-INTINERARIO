import { describe, expect, it } from "vitest";
import { comoLlegar, diasDe, personasDeGrupo, totalEstimado } from "@/lib/planRecomendador";
import { TOURS_DB } from "@/lib/tours";
import { PAQUETES_DB } from "@/lib/paquetes";
import { computePaqueteCharge } from "@/lib/paquetePricing";
import { totalRecorrido } from "@/lib/tourBooking";
import { AUTOBUS_CDMX } from "@/lib/ciudadesOrigen";

// 13 nov 2026: el resultado del recomendador dice cómo llegar, el viaje grupal y un total estimado.

const tamul = TOURS_DB.find((t) => t.slug === "expedicion-tamul")!;
const meco = TOURS_DB.find((t) => t.slug === "cascadas-del-meco")!;

describe("plan del recomendador", () => {
  it("personas y días salen de las respuestas", () => {
    expect(personasDeGrupo("En pareja")).toEqual({ adultos: 2, ninos: 0 });
    expect(personasDeGrupo("Familia con niños")).toEqual({ adultos: 2, ninos: 2 });
    expect(diasDe("5 o más días")).toBe(5);
    expect(diasDe("1 día")).toBe(1);
  });
  it("cómo llegar: con datos de su ciudad, o nada inventado", () => {
    const cdmx = comoLlegar("Ciudad de México", 2)!;
    expect(cdmx.auto).toBe("7 h");
    expect(cdmx.km).toBe("350 km");
    expect(cdmx.traslado).toBeGreaterThan(0);
    expect(comoLlegar("Guadalajara", 2)).toBeNull();
  });
  it("1 día desde Guadalajara: solo el recorrido (sin hotel ni transporte inventado)", () => {
    const r = totalEstimado({ dias: "1 día", grupo: "En pareja", origen: "Guadalajara", principal: tamul });
    expect(r.lineas).toHaveLength(1);
    expect(r.total).toBe(totalRecorrido(tamul, 2, 0));
  });
  it("2 días desde CDMX: dos recorridos + 1 noche de hotel + autobús ida y vuelta", () => {
    const r = totalEstimado({ dias: "2 días", grupo: "En pareja", origen: "Ciudad de México", principal: tamul, secundario: meco });
    expect(r.lineas.map((l) => l.concepto)).toEqual(["Expedición Tamul", "Cascadas del Meco", "Hotel, 1 noche (desde)", "Autobús ida y vuelta desde CDMX (desde)"]);
    expect(r.lineas[3].monto).toBe(AUTOBUS_CDMX.min * 2 * 2);
    // El traslado privado NO se suma (va como opción en «Cómo llegar»).
    expect(r.lineas.some((l) => /privado/i.test(l.concepto))).toBe(false);
  });
  it("3+ días con paquete: el paquete para el grupo (por pareja) en lugar de recorridos y hotel", () => {
    const p = PAQUETES_DB[0];
    const r = totalEstimado({ dias: "3 días", grupo: "En pareja", origen: "Monterrey", principal: tamul, paquete: { slug: p.slug, nombre: p.nombre } });
    expect(r.lineas).toHaveLength(1);
    expect(r.total).toBe(computePaqueteCharge({ slug: p.slug, personas: 2, pct: 100 })!.total);
  });
});
