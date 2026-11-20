import { describe, it, expect } from "vitest";
import { construirFicha, SLUGS_FICHA } from "@/lib/fichaPaquete";
import { PAQUETES_DB, getPaquete, precioVisible } from "@/lib/paquetes";
import { TOURS_DB } from "@/lib/tours";
import { computePaqueteCharge } from "@/lib/paquetePricing";

/**
 * La ficha de paquete se ARMA con datos del catálogo; estas pruebas cuidan que
 * no enseñe nada que el paquete no tenga (20 nov 2026).
 */
describe("construirFicha", () => {
  it.each(SLUGS_FICHA)("%s se arma en los dos idiomas", (slug) => {
    expect(construirFicha(slug, "es")).not.toBeNull();
    expect(construirFicha(slug, "en")).not.toBeNull();
  });

  it.each(SLUGS_FICHA)("%s: un bloque por día y la última noche es la salida", (slug) => {
    const f = construirFicha(slug, "es")!;
    const p = getPaquete(slug)!;
    expect(f.diasFicha).toHaveLength(p.itinerario.length);
    expect(f.diasFicha.map((d) => d.dia)).toEqual(p.itinerario.map((d) => d.dia));
    expect(f.diasFicha.at(-1)!.noche).toBeNull();
    expect(f.diasFicha.slice(0, -1).every((d) => d.noche)).toBe(true);
  });

  it.each(SLUGS_FICHA)("%s: la fila de 2 adultos es el precio que se anuncia", (slug) => {
    const f = construirFicha(slug, "es")!;
    const dos = f.precios.find((r) => r.adultos === 2)!;
    // El paquete se anuncia por pareja: el total de dos = precioVisible.
    expect(dos.total).toBe(precioVisible(getPaquete(slug)!));
    // Y cada fila es exactamente lo que calcula el motor que cobra.
    for (const r of f.precios) {
      expect(r.total).toBe(computePaqueteCharge({ slug, personas: r.adultos, pct: 100 })!.total);
    }
  });

  it.each(SLUGS_FICHA)("%s: ningún destacado ni parada fuera de su itinerario", (slug) => {
    const f = construirFicha(slug, "es")!;
    const p = getPaquete(slug)!;
    const diasConTour = new Set(p.itinerario.filter((d) => d.tourSlug).map((d) => d.dia));
    for (const d of f.destacados) expect(diasConTour.has(d.dia)).toBe(true);
    for (const x of f.paradas.filter((y) => !y.base)) expect(diasConTour.has(x.dia)).toBe(true);
    expect(f.destacados.length).toBeGreaterThan(0);
    expect(f.destacados.length).toBeLessThanOrEqual(6);
  });

  it.each(SLUGS_FICHA)("%s: las comidas de cada día salen del incluye del tour", (slug) => {
    const f = construirFicha(slug, "es")!;
    for (const d of f.diasFicha) {
      if (!d.tour) { expect(d.comidas).toEqual([]); continue; }
      const t = TOURS_DB.find((x) => x.slug === d.tour!.slug)!;
      const desayuno = t.incluye.some((x) => /^desayuno/i.test(x));
      expect(d.comidas.includes("Desayuno")).toBe(desayuno);
    }
  });

  it("no relaciona el paquete consigo mismo", () => {
    for (const p of PAQUETES_DB) {
      const f = construirFicha(p.slug, "es")!;
      expect(f.relacionados.some((r) => r.tipo === "paquete" && r.slug === p.slug)).toBe(false);
    }
  });

  it("los paquetes de evento no tienen ficha genérica", () => {
    expect(construirFicha("xantolo-2026", "es")).toBeNull();
  });
});
