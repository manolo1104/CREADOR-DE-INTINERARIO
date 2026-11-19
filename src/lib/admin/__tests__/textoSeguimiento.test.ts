import { describe, expect, it } from "vitest";
import { fechaLegible, nombreCortoTour, tituloLegible } from "../textoSeguimiento";

describe("el texto de un seguimiento en pantalla", () => {
  it("la fecha AAAA-MM-DD se lee como «sáb 21 nov»", () => {
    expect(fechaLegible("2026-11-21")).toBe("sáb 21 nov");
    expect(fechaLegible("2026-11-18")).toBe("mié 18 nov");
    expect(fechaLegible("2027-01-01")).toBe("vie 1 ene");
    expect(fechaLegible("2026-02-30")).toBe("2026-02-30");
    expect(fechaLegible("mañana")).toBe("mañana");
  });

  it("el nombre corto del tour es lo de antes de la raya", () => {
    expect(nombreCortoTour("Expedición Tamul — Tamul, Cueva del Agua y Sótano")).toBe("Expedición Tamul");
    expect(nombreCortoTour("Gruta de Xilo")).toBe("Gruta de Xilo");
  });

  it("la confirmación de 48 h queda corta (la de la captura del 19 nov)", () => {
    expect(tituloLegible("Confirmar Expedición Tamul — Tamul, Cueva del Agua y Sótano del 2026-11-21 (3 reservas, 7 pax): punto de encuentro, hora y qué llevar"))
      .toBe("Confirmar Expedición Tamul del sáb 21 nov (3 reservas, 7 pax): punto de encuentro, hora y qué llevar");
  });

  it("el mínimo y la salida cancelada también", () => {
    expect(tituloLegible("Ruta Surrealista — Edward James, Manantiales, Cuevas y Las Pozas del 2026-11-20 va con 2 de 4 mínimo: confirmar que corre, juntarla con otra fecha o reembolsar"))
      .toBe("Ruta Surrealista del vie 20 nov va con 2 de 4 mínimo: confirmar que corre, juntarla con otra fecha o reembolsar");
    expect(tituloLegible("Se canceló la salida de Cascadas del Meco — Meco, Mirador y El Gran Salto del 2026-11-22 y tiene 1 reserva activa (HP-M-X): avisar"))
      .toBe("Se canceló la salida de Cascadas del Meco del dom 22 nov y tiene 1 reserva activa (HP-M-X): avisar");
  });

  it("lo que no trae tour ni fecha queda igual; las semanas, con fecha legible", () => {
    expect(tituloLegible("Saldo de $150 de HPMU8KA26H (Ivan Rangel): cobrarlo o registrarlo en Reservas"))
      .toBe("Saldo de $150 de HPMU8KA26H (Ivan Rangel): cobrarlo o registrarlo en Reservas");
    expect(tituloLegible("Cerrar el corte de la semana del 2026-11-09 (Corte semanal → Hacer corte)"))
      .toBe("Cerrar el corte de la semana del lun 9 nov (Corte semanal → Hacer corte)");
  });
});
