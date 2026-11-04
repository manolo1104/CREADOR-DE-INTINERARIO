import { describe, expect, it } from "vitest";
import { reglaCotizado, reglaLiga, reglaSaldo, reglaSalida, RESPONSABLE_COBROS, RESPONSABLE_OPERACION } from "../automatizaciones";
import { correoResumen } from "../automatizaciones";

const HOY = "2026-11-04";
const AHORA = new Date("2026-11-04T16:00:00Z"); // 10:00 en México
const hace = (h: number) => new Date(AHORA.getTime() - h * 3600_000);
const EQUIPO = ["Manolo", "Martín", "Erick"];

describe("Cotizado 24 h sin seguimiento", () => {
  const base = { id: "L1", responsable: "Martín", cotizadoId: "E1", cotizadoEn: hace(25), pendientes: 0, cliente: "Ana", folio: "COT-1", fechaViaje: "2026-11-20" };
  it("a las 24 h sin nada pendiente → tarea para hoy, a su responsable, una por cada vez que llegó a Cotizado", () => {
    const [t] = reglaCotizado([base], AHORA, HOY, EQUIPO);
    expect(t).toMatchObject({ claveRegla: "cotizado-24h:E1", responsable: "Martín", vence: HOY, oportunidadId: "L1" });
    expect(t.titulo).toContain("COT-1");
  });
  it("antes de 24 h, con un seguimiento pendiente o con el viaje ya pasado, no", () => {
    expect(reglaCotizado([{ ...base, cotizadoEn: hace(20) }], AHORA, HOY, EQUIPO)).toHaveLength(0);
    expect(reglaCotizado([{ ...base, pendientes: 1 }], AHORA, HOY, EQUIPO)).toHaveLength(0);
    expect(reglaCotizado([{ ...base, fechaViaje: "2026-11-01" }], AHORA, HOY, EQUIPO)).toHaveLength(0);
  });
  it("sin responsable del equipo, a Operación", () => {
    expect(reglaCotizado([{ ...base, responsable: "Importación inicial" }], AHORA, HOY, EQUIPO)[0].responsable).toBe(RESPONSABLE_OPERACION);
  });
});

describe("Saldo vencido", () => {
  it("tour pasado con saldo → tarea de cobrarlo o registrarlo (los de la línea base: $5,600 y $150)", () => {
    const ts = reglaSaldo([
      { id: "B1", folio: "HP-1", cliente: "RZR", ultimoDia: "2026-10-17", saldo: 5600, oportunidadId: null },
      { id: "B2", folio: "HP-2", cliente: "SUR", ultimoDia: "2026-10-09", saldo: 150, oportunidadId: "L2" },
      { id: "B3", folio: "HP-3", cliente: "Al día", ultimoDia: "2026-10-09", saldo: 0, oportunidadId: null },
      { id: "B4", folio: "HP-4", cliente: "Futuro", ultimoDia: "2026-11-10", saldo: 900, oportunidadId: null },
      { id: "B5", folio: "HP-5", cliente: "Hoy", ultimoDia: HOY, saldo: 900, oportunidadId: null },
    ], HOY);
    expect(ts.map(t => t.claveRegla)).toEqual(["saldo-vencido:B1", "saldo-vencido:B2"]);
    expect(ts[0]).toMatchObject({ responsable: RESPONSABLE_COBROS, vence: HOY });
    expect(ts[0].titulo).toContain("$5,600");
  });
});

describe("Liga de pago sin pagar 24 h", () => {
  it("a las 24 h → tarea a quien la creó (si es del equipo)", () => {
    const ts = reglaLiga([
      { id: "P1", titulo: "Anticipo", cliente: "Ana", monto: 900, creadaEn: hace(30), creadoPor: "Martín", oportunidadId: "L1" },
      { id: "P2", titulo: "Anticipo", cliente: null, monto: 900, creadaEn: hace(3), creadoPor: "Martín", oportunidadId: null },
      { id: "P3", titulo: "Anticipo", cliente: null, monto: 500, creadaEn: hace(48), creadoPor: null, oportunidadId: null },
    ], AHORA, HOY, EQUIPO);
    expect(ts.map(t => [t.claveRegla, t.responsable])).toEqual([["liga-24h:P1", "Martín"], ["liga-24h:P3", RESPONSABLE_OPERACION]]);
  });
});

describe("Confirmar salida 48 h", () => {
  it("mañana o pasado mañana con gente → tarea a Operación para el día que toca (2 días antes)", () => {
    const ts = reglaSalida([
      { clave: "2026-11-06|tamul", fecha: "2026-11-06", tour: "Tamul", personas: 4, reservas: 2 },
      { clave: "2026-11-05|meco", fecha: "2026-11-05", tour: "Meco", personas: 2, reservas: 1 },
      { clave: "2026-11-07|sotano", fecha: "2026-11-07", tour: "Sótano", personas: 3, reservas: 1 },
      { clave: "2026-11-06|vacia", fecha: "2026-11-06", tour: "Vacía", personas: 0, reservas: 0 },
    ], HOY);
    expect(ts.map(t => [t.claveRegla, t.vence])).toEqual([["salida-48h:2026-11-06|tamul", HOY], ["salida-48h:2026-11-05|meco", HOY]]);
    expect(ts[0]).toMatchObject({ responsable: RESPONSABLE_OPERACION, salidaClave: "2026-11-06|tamul" });
  });
});

describe("Resumen diario", () => {
  it("el asunto dice cuántos seguimientos, cuántos vencidos y cuántas salidas; el HTML escapa los textos", () => {
    const c = correoResumen("Erick", HOY,
      [{ titulo: "Llamar <Ana>", cuando: "Venció el 02/11", cliente: "Ana", href: "#", rojo: true }],
      [{ titulo: "Mandar PDF", cuando: "Hoy", cliente: null, href: "#" }],
      [{ titulo: "Tamul · 4 pax", cuando: "Mañana", cliente: "Sin guía asignado", href: "#", rojo: true }]);
    expect(c.subject).toBe("Tu día · 2 seguimientos (1 vencido) · 1 salida");
    expect(c.htmlContent).toContain("Llamar &lt;Ana&gt;");
    expect(c.textContent).toContain("Venció el 02/11: Llamar <Ana> (Ana)");
  });
});
