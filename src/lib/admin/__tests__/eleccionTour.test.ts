import { describe, expect, it } from "vitest";
import { addDaysYMD, hoyMX } from "@/lib/dates";
import { TOURS_DB, extraDeEleccion, opcionDeEleccion } from "@/lib/tours";
import { totalRecorrido } from "@/lib/tourBooking";
import { computeTourCharge, tarifarRecorridos } from "@/lib/tourPricing";
import { retarifarItem } from "@/lib/carritoItems";
import { localizeTour } from "@/lib/i18n/localize";
import { calcTourLine, eleccionPorOmision, type LineItem } from "@/components/admin/ReservaModal";
import { subtotalPanel } from "@/lib/cotizaciones/armar";

// Manolo, 5 nov 2026: la Ruta Acuática deja de prometer Tamasopo. Puente de
// Dios va siempre y el cliente elige Siete Cascadas (sin extra) o Tamasopo
// (+$230 por persona, dentro del precio por cabeza: el menor paga su 70 %/50 %).
// Y la Ruta Surrealista sube $100 por persona (1,500 · 1,450 · 1,400).

const ACU  = "ruta-acuatica-puente-de-dios";
const SUR  = "ruta-surrealista-edward-james";
const tour = (slug: string) => TOURS_DB.find((t) => t.slug === slug)!;
const dia  = (n: number) => addDaysYMD(hoyMX(), n);

const linea = (extra: Partial<LineItem>): LineItem => ({
  tourSlug: ACU, tourName: "", tourDate: "", adults: 2, childrenMid: 0, childrenSmall: 0, subtotal: 0, ...extra,
});

describe("la opción elegida de la Ruta Acuática", () => {
  it("Tamasopo suma $230; Siete Cascadas, nada; se reconoce por id y por nombre en español", () => {
    expect(extraDeEleccion(tour(ACU), "tamasopo")).toBe(230);
    expect(extraDeEleccion(tour(ACU), "Cascadas de Tamasopo")).toBe(230);
    expect(extraDeEleccion(tour(ACU), "siete-cascadas")).toBe(0);
    expect(extraDeEleccion(tour(ACU), "Hacienda Los Gómez + Siete Cascadas")).toBe(0);
    expect(extraDeEleccion(tour(ACU), undefined)).toBe(0);
    expect(extraDeEleccion(tour(ACU), "inventada")).toBe(0);
    // Un tour sin elección nunca suma, le manden lo que le manden.
    expect(extraDeEleccion(tour(SUR), "tamasopo")).toBe(0);
  });

  it("el nombre ya no promete Tamasopo y la URL no cambia", () => {
    expect(tour(ACU).nombre).toBe("Ruta Acuática — Puente de Dios + Siete Cascadas o Tamasopo");
    expect(localizeTour(tour(ACU), "en").nombre).toBe("Water Route — Puente de Dios + Seven Waterfalls or Tamasopo");
    expect(tour(ACU).slug).toBe(ACU);
  });

  it("en inglés la opción conserva su id y su extra (el carrito guarda el id)", () => {
    const en = localizeTour(tour(ACU), "en");
    const tam = en.eleccion!.opciones.find((o) => o.id === "tamasopo")!;
    expect(tam.nombre).toBe("Tamasopo Waterfalls");
    expect(tam.extraPorPersona).toBe(230);
    expect(opcionDeEleccion(tour(ACU), tam.id)?.nombre).toBe("Cascadas de Tamasopo");
  });

  it("los casos en pesos del plan (web y Stripe: totalRecorrido)", () => {
    expect(totalRecorrido(tour(ACU), 2)).toBe(3200);                                // Siete Cascadas o sin elegir
    expect(totalRecorrido(tour(ACU), 2, 0, 0, 0, "siete-cascadas")).toBe(3200);
    expect(totalRecorrido(tour(ACU), 2, 0, 0, 0, "tamasopo")).toBe(3660);           // 1,830 × 2
    expect(totalRecorrido(tour(ACU), 6, 0, 0, 0, "tamasopo")).toBe(10380);           // 1,730 × 6
    expect(totalRecorrido(tour(ACU), 2, 1, 0, 0, "tamasopo")).toBe(4806);           // 1,780 × 2 + 70 % de 1,780
  });

  it("el servidor cobra lo mismo que se pinta, y un valor inventado no suma", () => {
    const base = { tourSlug: ACU, adults: 2, childrenMid: 0, childrenSmall: 0, tourDate: dia(20) };
    expect(computeTourCharge({ ...base, eleccion: "tamasopo" })!.total).toBe(3660);
    expect(computeTourCharge({ ...base, eleccion: "Cascadas de Tamasopo" })!.total).toBe(3660);
    expect(computeTourCharge({ ...base, eleccion: "siete-cascadas" })!.total).toBe(3200);
    expect(computeTourCharge({ ...base, eleccion: "lo-que-sea" })!.total).toBe(3200);
  });

  it("🔴 el carrito (id «tamasopo», el que guarda también en inglés) llega a la reserva con su nombre y su extra", () => {
    const t = tarifarRecorridos([{ tourSlug: ACU, tourDate: dia(20), adults: 2, childrenMid: 0, childrenSmall: 0, eleccion: "tamasopo" }]);
    if (!t.ok) throw new Error(t.error);
    expect(t.lineItems[0].subtotal).toBe(3660);
    expect(t.lineItems[0].eleccion).toBe("Cascadas de Tamasopo");
    // Y lo que pinta el renglón del carrito antes de pagar es lo mismo.
    const item = { tourId: tour(ACU).id, tourSlug: ACU, tourName: "", tourImage: "", tourDate: dia(20),
      adults: 2, childrenMid: 0, childrenSmall: 0, eleccion: "tamasopo", total: 3200 };
    expect(retarifarItem(item).total).toBe(3660);
  });

  it("en el panel: la cotización y la copia de las cotizaciones armadas suman igual", () => {
    expect(calcTourLine(linea({}))).toBe(3200);
    expect(calcTourLine(linea({ eleccion: "Hacienda Los Gómez + Siete Cascadas" }))).toBe(3200);
    expect(calcTourLine(linea({ eleccion: "Cascadas de Tamasopo" }))).toBe(3660);
    expect(calcTourLine(linea({ adults: 6, eleccion: "Cascadas de Tamasopo" }))).toBe(10380);
    expect(calcTourLine(linea({ childrenMid: 1, eleccion: "Cascadas de Tamasopo" }))).toBe(4806);
    expect(subtotalPanel(linea({ eleccion: "Cascadas de Tamasopo" }))).toBe(3660);
    expect(subtotalPanel(linea({}))).toBe(3200);
  });

  it("al agregar la Acuática en el panel entra marcada Siete Cascadas (sin extra); otro tour, nada", () => {
    expect(eleccionPorOmision(ACU)).toBe("Hacienda Los Gómez + Siete Cascadas");
    expect(eleccionPorOmision(SUR)).toBeUndefined();
  });
});

describe("Ruta Surrealista +$100 por persona", () => {
  it("1,500 · 1,450 · 1,400 según el grupo, en la web y en el panel", () => {
    expect(tour(SUR).precio).toBe(1500);
    expect(totalRecorrido(tour(SUR), 2)).toBe(3000);
    expect(totalRecorrido(tour(SUR), 4)).toBe(5800);
    expect(totalRecorrido(tour(SUR), 6)).toBe(8400);
    expect(calcTourLine(linea({ tourSlug: SUR }))).toBe(3000);
    expect(subtotalPanel(linea({ tourSlug: SUR, adults: 4 }))).toBe(5800);
  });
});
