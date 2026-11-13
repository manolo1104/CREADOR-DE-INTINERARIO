/**
 * «Próximas temporadas» del inicio (12 nov 2026): que las pasadas se escondan
 * solas, que la de hoy salga «en curso» y que el agua diga lo mismo que la
 * franja del río. La fecha va en hora de México: 18:00 UTC = 12:00 en Xilitla.
 */
import { describe, expect, it } from "vitest";
import { TEMPORADAS, proximasTemporadas, fechasDeTemporada } from "@/lib/temporadasProximas";

const el = (iso: string) => new Date(`${iso}T18:00:00Z`);

describe("próximas temporadas", () => {
  it("el 12 nov 2026 la primera es el puente de la Revolución y caben 5", () => {
    const t = proximasTemporadas(5, el("2026-11-12"));
    expect(t).toHaveLength(5);
    expect(t[0].id).toBe("puente-revolucion-2026");
    expect(t[0].enCurso).toBe(false);
  });

  it("pasado el puente (17 nov) la primera es diciembre", () => {
    const t = proximasTemporadas(5, el("2026-11-17"));
    expect(t[0].id).toBe("vacaciones-diciembre-2026");
    expect(t.some((x) => x.id === "puente-revolucion-2026")).toBe(false);
  });

  it("el último día todavía cuenta (16 nov, en curso)", () => {
    const [t] = proximasTemporadas(1, el("2026-11-16"));
    expect(t.id).toBe("puente-revolucion-2026");
    expect(t.enCurso).toBe(true);
  });

  it("el 25 mar 2027 Semana Santa sale en curso, con el agua más turquesa", () => {
    const [t] = proximasTemporadas(1, el("2027-03-25"));
    expect(t.id).toBe("semana-santa-2027");
    expect(t.enCurso).toBe(true);
    expect(t.agua).toBe("turquesa");
  });

  it("el verano es de caudal y diciembre de agua clara (la regla del río)", () => {
    const todas = proximasTemporadas(TEMPORADAS.length, el("2026-11-01"));
    expect(todas.find((x) => x.id === "verano-2027")?.agua).toBe("caudal");
    expect(todas.find((x) => x.id === "vacaciones-diciembre-2026")?.agua).toBe("clara");
  });

  it("cuando ya pasaron todas, no queda ninguna (y la sección no se pinta)", () => {
    expect(proximasTemporadas(5, el("2030-01-01"))).toHaveLength(0);
  });

  it("cada temporada termina el mismo día o después de empezar", () => {
    for (const t of TEMPORADAS) expect(t.hasta >= t.desde, t.id).toBe(true);
  });

  it("las fechas se leen bien en los dos idiomas", () => {
    const rev = TEMPORADAS.find((x) => x.id === "puente-revolucion-2026")!;
    const dic = TEMPORADAS.find((x) => x.id === "vacaciones-diciembre-2026")!;
    expect(fechasDeTemporada(rev, "es")).toBe("14 – 16 nov");
    expect(fechasDeTemporada(dic, "es")).toBe("19 dic – 6 ene");
    expect(fechasDeTemporada(dic, "en")).toBe("Dec 19 – Jan 6");
  });
});
