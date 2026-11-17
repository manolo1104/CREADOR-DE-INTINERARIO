// La regla de niños de Manolo (17 nov 2026, «en todos lados»): 3 años o menos
// gratis, de 4 a 7 el 50 %, de 8 en adelante adulto. Los ejemplos en pesos
// del plan aprobado, por tipo de recorrido.
import { describe, expect, it } from "vitest";
import { computeTourCharge } from "@/lib/tourPricing";
import { totalRecorrido } from "@/lib/tourBooking";
import { calcTourLine } from "@/lib/admin/lineasPrecio";
import { subtotalPanel } from "@/lib/cotizaciones/armar";
import { TOURS_DB, tourEnFecha } from "@/lib/tours";
import { REGLA_NINOS, lugaresQueOcupan, personasQuePagan, precioNino, textoNinos } from "@/lib/ninos";

const FECHA = "2026-12-12"; // sin promo de temporada
const tamul = () => tourEnFecha(TOURS_DB.find((t) => t.slug === "expedicion-tamul")!, FECHA);

describe("regla de niños: ≤3 gratis, 4–7 al 50 %, 8+ adulto", () => {
  it("Tamul: 2 adultos + niña de 5 + bebé de 2 = $3,750 (antes $4,500); anticipo $1,125", () => {
    // Pagan 3 → escalón de 3 ($1,500 por cabeza); la niña $750; el bebé $0.
    const c = computeTourCharge({ tourSlug: "expedicion-tamul", adults: 2, childrenMid: 0, childrenSmall: 1, infants: 1, tourDate: FECHA, pct: 30 });
    expect(c?.total).toBe(3750);
    expect(c?.charge).toBe(1125);
  });

  it("el bebé no mueve el escalón por tamaño de grupo", () => {
    // 2 adultos + bebé: siguen siendo 2 que pagan → $1,550 por cabeza.
    expect(totalRecorrido(tamul(), 2, 0, 0, 0, null, 1)).toBe(3100);
    expect(totalRecorrido(tamul(), 2, 0, 0)).toBe(3100);
  });

  it("de 8 en adelante paga como adulto: un niño de 9 = $1,550 (antes 70 % = $1,085)", () => {
    expect(totalRecorrido(tamul(), 2, 0, 0)).toBe(3100);   // 2 adultos
    expect(totalRecorrido(tamul(), 1, 0, 0) + 1550).toBe(3100); // el de 9 entra como adulto
  });

  it("los bebés ocupan lugar: cuentan para el cupo de la salida", () => {
    const max = tamul().groupMax;
    expect(computeTourCharge({ tourSlug: "expedicion-tamul", adults: max - 1, childrenMid: 0, childrenSmall: 0, infants: 1, tourDate: FECHA })).not.toBeNull();
    expect(computeTourCharge({ tourSlug: "expedicion-tamul", adults: max - 1, childrenMid: 0, childrenSmall: 0, infants: 2, tourDate: FECHA })).toBeNull();
  });

  it("tarifa por GRUPO (Edén): ahí el bebé sí cuenta como persona", () => {
    const eden = tourEnFecha(TOURS_DB.find((t) => t.slug === "eden-en-el-jardin")!, FECHA);
    const dos = totalRecorrido(eden, 2, 0, 0);
    const dosMasBebe = totalRecorrido(eden, 2, 0, 0, 0, null, 1);
    expect(dosMasBebe).toBe(totalRecorrido(eden, 3, 0, 0));
    expect(dosMasBebe).toBeGreaterThan(dos);
  });

  it("panel y cotización del bot cobran lo mismo que la web", () => {
    const linea = { tourSlug: "expedicion-tamul", tourName: "", tourDate: FECHA, adults: 2, childrenMid: 0, childrenSmall: 1, infants: 1, subtotal: 0 };
    // El panel no lleva promo: escalón de 3 = $1,500.
    expect(calcTourLine(linea)).toBe(3750);
    expect(subtotalPanel(linea)).toBe(3750);
  });

  it("los registros viejos con el tramo de 6 a 10 se siguen leyendo al 70 %", () => {
    expect(totalRecorrido(tamul(), 2, 1, 0)).toBe(1500 * 2 + 1050);
  });

  it("utilidades: quién paga, quién ocupa lugar y cómo se dice", () => {
    expect(personasQuePagan(2, 1)).toBe(3);
    expect(lugaresQueOcupan(2, 1, 1)).toBe(4);
    expect(precioNino(1550)).toBe(775);
    expect(textoNinos(1, 2)).toBe("1 niño de 4 a 7, 2 bebés (gratis)");
    expect(REGLA_NINOS.es).toMatch(/4 a 7 años pagan el 50 %.*3 años o menos van gratis.*8 en adelante/);
  });
});
