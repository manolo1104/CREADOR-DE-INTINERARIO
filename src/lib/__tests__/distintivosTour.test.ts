import { describe, expect, it } from "vitest";
import { contarReservasPorTour, distintivosDeTours } from "@/lib/distintivosTour";
import { TOURS_DB } from "@/lib/tours";

// 13 nov 2026: /reservar por los más reservados y con distintivos sacados de datos.

describe("reservas por recorrido: cuenta TODOS los del carrito", () => {
  it("🔴 el Meco cuenta aunque no sea el primero del carrito; una vez por reserva", () => {
    const r = contarReservasPorTour([
      { tourSlug: "expedicion-tamul", lineItems: [{ _meta: true }, { tourSlug: "expedicion-tamul" }, { tourSlug: "cascadas-del-meco" }] },
      { tourSlug: "cascadas-del-meco", lineItems: [{ tourSlug: "cascadas-del-meco" }, { tourSlug: "cascadas-del-meco" }] },
      // Reserva vieja sin renglones: su tour principal.
      { tourSlug: "expedicion-tamul", lineItems: null },
    ]);
    expect(r).toEqual({ "expedicion-tamul": 2, "cascadas-del-meco": 2 });
  });
});

describe("distintivos de las tarjetas", () => {
  const tours = [
    { slug: "a", dificultad: "media" }, { slug: "b", dificultad: "baja" }, { slug: "c", dificultad: "baja", soloAdultos: true },
    { slug: "d", dificultad: "alta" }, { slug: "e", dificultad: "media" }, { slug: "f", dificultad: "baja" },
  ];
  const conteo = { a: 30, b: 12, c: 9, d: 20, e: 2 };

  it("el más reservado; «primera vez» = los 3 más reservados que cualquiera puede hacer", () => {
    const d = distintivosDeTours(tours, conteo, "a");
    expect(d.a).toEqual(["masReservado"]);
    expect(d.b).toEqual(["primeraVez", "conNinos"]);
    expect(d.c).toEqual(["primeraVez"]); // solo adultos: sin «con niños»
    expect(d.e).toEqual(["primeraVez"]);
    expect(d.d).toEqual(["aventura"]);   // alta: nunca «primera vez»
    expect(d.f).toEqual(["conNinos"]);   // sin reservas: sin «primera vez»
  });
  it("sin estadísticas no se inventa «primera vez»; lo de la ficha sí sale", () => {
    const d = distintivosDeTours(tours, null, null);
    expect(Object.values(d).flat()).not.toContain("primeraVez");
    expect(d.d).toEqual(["aventura"]);
  });
  it("con el catálogo real: nunca más de 2 por tarjeta", () => {
    const d = distintivosDeTours(TOURS_DB, Object.fromEntries(TOURS_DB.map((t, i) => [t.slug, 50 - i])), TOURS_DB[0].slug);
    for (const lista of Object.values(d)) expect(lista.length).toBeLessThanOrEqual(2);
    expect(Object.values(d).flat().filter((x) => x === "primeraVez")).toHaveLength(3);
  });
});
