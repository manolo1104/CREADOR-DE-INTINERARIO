import { describe, expect, it } from "vitest";
import { fechaMinimaCarrito, limpiarFechasPasadas, type CarritoItem } from "@/lib/carrito";
import { EXTRAS_VACIOS, extrasDeOtraVisita } from "@/lib/carritoExtras";

// Auditoría del 13 nov 2026: el carrito invalida fechas pasadas y ningún extra
// llega premarcado de una visita anterior.

const item = (tourDate: string, tourName = "Expedición Tamul"): CarritoItem => ({
  uid: `u-${tourDate}`, tourId: "t", tourSlug: "expedicion-tamul", tourName, tourImage: "", tourDate,
  adults: 2, childrenMid: 0, childrenSmall: 0, total: 3100,
});

describe("fechas pasadas en el carrito", () => {
  it("la primera fecha válida es MAÑANA en hora de México (también a las 11 pm de allá)", () => {
    expect(fechaMinimaCarrito(new Date("2026-11-13T18:00:00Z"))).toBe("2026-11-14");
    // 23:30 del 13 en México = 05:30 UTC del 14: sigue siendo el 13 allá.
    expect(fechaMinimaCarrito(new Date("2026-11-14T05:30:00Z"))).toBe("2026-11-14");
    // Fin de mes y de año.
    expect(fechaMinimaCarrito(new Date("2026-12-31T18:00:00Z"))).toBe("2027-01-01");
  });
  it("🔴 la fecha que ya pasó (u hoy) se quita y se avisa; el renglón se queda", () => {
    const r = limpiarFechasPasadas([item("2026-11-01"), item("2026-11-13", "Meco"), item("2026-11-20"), item("")], "2026-11-14");
    expect(r.items.map((i) => i.tourDate)).toEqual(["", "", "2026-11-20", ""]);
    expect(r.quitadas).toEqual([{ tourName: "Expedición Tamul", fecha: "2026-11-01" }, { tourName: "Meco", fecha: "2026-11-13" }]);
  });
  it("sin nada viejo, no cambia nada", () => {
    const lista = [item("2026-11-14"), item("")];
    const r = limpiarFechasPasadas(lista, "2026-11-14");
    expect(r.items).toEqual(lista);
    expect(r.quitadas).toEqual([]);
  });
});

describe("🔴 ningún extra premarcado", () => {
  const guardados = { ...EXTRAS_VACIOS, conHotel: true, conTraslado: true, guiaIngles: true, checkin: "2026-11-20", checkout: "2026-11-22", name: "Ana", email: "ana@x.com" };
  it("de OTRA visita: hotel, traslado y guía en inglés llegan apagados; los datos de contacto se quedan", () => {
    const r = extrasDeOtraVisita(guardados, false, "2026-11-13");
    expect([r.conHotel, r.conTraslado, r.guiaIngles]).toEqual([false, false, false]);
    expect([r.name, r.email]).toEqual(["Ana", "ana@x.com"]);
  });
  it("en la MISMA visita se conservan (fue a ver otro tour y regresó)", () => {
    const r = extrasDeOtraVisita(guardados, true, "2026-11-13");
    expect([r.conHotel, r.conTraslado, r.guiaIngles]).toEqual([true, true, true]);
  });
  it("las fechas de hotel que ya pasaron se borran", () => {
    const r = extrasDeOtraVisita({ ...guardados, checkin: "2026-11-10", checkout: "2026-11-12" }, true, "2026-11-13");
    expect([r.checkin, r.checkout]).toEqual(["", ""]);
    // Llegar hoy sí vale; salir hoy ya no.
    const hoy = extrasDeOtraVisita({ ...guardados, checkin: "2026-11-13", checkout: "2026-11-13" }, true, "2026-11-13");
    expect([hoy.checkin, hoy.checkout]).toEqual(["2026-11-13", ""]);
  });
});
