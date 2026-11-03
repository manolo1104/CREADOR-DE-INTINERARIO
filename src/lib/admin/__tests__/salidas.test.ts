import { describe, expect, it } from "vitest";
import {
  agruparSalidas, claveDeSalida, diasDeTourDe, diasEnRango, resumirSalidas, type ReservaParaSalidas,
} from "../salidas";

// Un noviembre como el de la línea base del 3 nov 2026: 20 reservas que generan
// 31 días de tour, que agrupados por tour y día son 27 salidas; 8 salidas
// regulares con 2 personas o menos. (Datos inventados con esa misma forma.)
const T = {
  TAM: "expedicion-tamul", MIN: "paraiso-escalonado-minas-micos", ACU: "ruta-acuatica-puente-de-dios",
  SUR: "ruta-surrealista-edward-james", MEC: "cascadas-del-meco", AMA: "amanecer-de-nubes", RAF: "rafting-rio-tampaon",
  GRU: "gruta-de-xilo", CAF: "travesia-del-cafe", RZR: "rzr-xilitla", OTR: "__personalizado",
};
type L = [slug: string, fecha: string, adultos: number, nombre?: string];
let n = 0;
function reserva(cliente: string, lineas: L[], extra: Partial<ReservaParaSalidas> = {}): ReservaParaSalidas {
  n++;
  const [slug0, fecha0, adultos0] = lineas[0];
  return {
    confirmationNumber: `HP-M-TEST${String(n).padStart(4, "0")}`,
    customerName: cliente, tourSlug: slug0, tourName: lineas[0][3] ?? slug0, tourDate: fecha0,
    adults: adultos0, children: 0, totalAmount: lineas.length * 3100,
    lineItems: lineas.map(([tourSlug, tourDate, adults, tourName]) => ({ tourSlug, tourName: tourName ?? tourSlug, tourDate, adults, childrenMid: 0, childrenSmall: 0, subtotal: 3100 })),
    ...extra,
  };
}
const noviembre: ReservaParaSalidas[] = [
  reserva("Brenda",  [[T.TAM, "2026-11-01", 4]]),
  reserva("Milena",  [[T.MIN, "2026-11-01", 3]]),
  // Reserva vieja sin renglones: el tour principal cuenta como su único día.
  reserva("Arturo",  [[T.TAM, "2026-11-01", 1]], { lineItems: undefined }),
  reserva("Óscar",   [[T.TAM, "2026-11-03", 1]]),
  reserva("Hwang",   [[T.TAM, "2026-11-03", 2], [T.MEC, "2026-11-04", 2]]),
  reserva("Tania",   [[T.TAM, "2026-11-03", 1]]),
  reserva("Herminio",[[T.MIN, "2026-11-04", 2], [T.ACU, "2026-11-05", 2], [T.SUR, "2026-11-06", 2]]),
  reserva("Taupin",  [[T.TAM, "2026-11-06", 2]]),
  reserva("Janet",   [[T.TAM, "2026-11-07", 2]]),
  reserva("Janet",   [[T.TAM, "2026-11-07", 2]]),
  reserva("Javier",  [[T.OTR, "2026-11-08", 2, "Micos privado"], [T.OTR, "2026-11-09", 2, "Micos privado"]]),
  reserva("Deirdre", [[T.TAM, "2026-11-09", 5], [T.GRU, "2026-11-10", 5]]),
  // El RZR va por vehículo: adultos 0 y el grupo en el `_meta`.
  reserva("Araceli", [[T.TAM, "2026-11-14", 2], [T.AMA, "2026-11-15", 2], [T.RZR, "2026-11-15", 0]], {
    lineItems: [
      { _meta: true, numPersonas: 2 },
      { tourSlug: T.TAM, tourName: "Tamul", tourDate: "2026-11-14", adults: 2, subtotal: 3100 },
      { tourSlug: T.AMA, tourName: "Amanecer", tourDate: "2026-11-15", adults: 2, subtotal: 3100 },
      { tourSlug: T.RZR, tourName: "RZR", tourDate: "2026-11-15", adults: 0, unidades: 1, subtotal: 4500 },
    ],
  }),
  reserva("Amy",     [[T.SUR, "2026-11-20", 3]]),
  reserva("Fabián",  [[T.RZR, "2026-11-20", 2]]),
  reserva("Avishag", [[T.OTR, "2026-11-20", 1, "Tirolesas"]]),
  reserva("Paula",   [[T.OTR, "2026-11-20", 2, "Puente de Dios privado"]]),
  reserva("María",   [[T.TAM, "2026-11-21", 4], [T.MIN, "2026-11-22", 4]]),
  reserva("Gerardo", [[T.RAF, "2026-11-23", 8], [T.CAF, "2026-11-24", 8]]),
  reserva("Eduardo", [[T.OTR, "2026-11-28", 2, "Sótano privado"], [T.RZR, "2026-11-28", 2], [T.TAM, "2026-11-29", 2]]),
];

describe("diasDeTourDe", () => {
  it("un renglón por tour con fecha; sin renglones, el tour principal", () => {
    expect(diasDeTourDe(noviembre[6]).map(d => `${d.fecha} ${d.slug}`)).toEqual([
      `2026-11-04 ${T.MIN}`, `2026-11-05 ${T.ACU}`, `2026-11-06 ${T.SUR}`,
    ]);
    expect(diasDeTourDe(noviembre[2])).toHaveLength(1);
    expect(diasDeTourDe(noviembre[2])[0].personas).toBe(1);
  });
  it("el RZR por vehículo toma las personas del _meta, no 0", () => {
    const rzr = diasDeTourDe(noviembre[12]).find(d => d.slug === T.RZR);
    expect(rzr?.personas).toBe(2);
  });
});

describe("claveDeSalida", () => {
  it("mismo tour y día = misma salida", () => {
    expect(claveDeSalida({ fecha: "2026-11-07", slug: T.TAM, nombre: "Tamul" }))
      .toBe(claveDeSalida({ fecha: "2026-11-07", slug: T.TAM, nombre: "Expedición Tamul" }));
  });
  it("dos salidas a medida el mismo día con distinto nombre NO son la misma", () => {
    expect(claveDeSalida({ fecha: "2026-11-20", slug: T.OTR, nombre: "Tirolesas" }))
      .not.toBe(claveDeSalida({ fecha: "2026-11-20", slug: T.OTR, nombre: "Puente de Dios privado" }));
  });
});

describe("noviembre de la línea base: 20 reservas → 31 días de tour → 27 salidas", () => {
  const dias = diasEnRango(noviembre, "2026-11-01", "2026-11-30");
  const r = resumirSalidas(dias);
  it("cuenta reservas, días y salidas", () => {
    expect(r.reservas).toBe(20);
    expect(r.diasDeTour).toBe(31);
    expect(r.salidas).toBe(27);
  });
  it("8 salidas regulares con 2 personas o menos; RZR y a medida no cuentan", () => {
    expect(r.regularesBajoMinimo).toBe(8);
    expect(r.regulares).toBe(19);
    expect(r.paxPorSalida).toBe(3.1);
  });
  it("Janet dos veces el mismo día es una salida de 4 con 2 reservas", () => {
    const s = agruparSalidas(dias).find(x => x.fecha === "2026-11-07" && x.slug === T.TAM);
    expect(s?.personas).toBe(4);
    expect(s?.reservas).toBe(2);
    expect(s?.codigo).toBe("TAM");
    expect(s?.clientes).toEqual(["Janet"]);
  });
  it("fuera del rango no entra nada", () => {
    expect(diasEnRango(noviembre, "2026-12-01", "2026-12-31")).toHaveLength(0);
  });
});

describe("salidas fijas, estado y números (PR 1.2)", () => {
  it("estado por personas y cupo; números y simulador con los costos de Tamul", async () => {
    const { estadoDeSalida, numerosDeSalida, simularMargen } = await import("../salidas");
    expect(estadoDeSalida({ personas: 4, aMedida: false }, 12)).toBe("en-meta");
    expect(estadoDeSalida({ personas: 2, aMedida: false }, 12)).toBe("bajo-minimo");
    expect(estadoDeSalida({ personas: 12, aMedida: false }, 12)).toBe("lleno");
    expect(estadoDeSalida({ personas: 1, aMedida: true }, null)).toBe("a-medida");

    // Tamul del prompt: $1,400/pax; fijo $1,200 (gasolina + guía); $395/pax.
    const tamul = [
      { concepto: "Gasolina", monto: 400, tipo: "fijo" as const }, { concepto: "Guía", monto: 800, tipo: "fijo" as const },
      { concepto: "Entradas", monto: 45, tipo: "persona" as const }, { concepto: "Canoa", monto: 200, tipo: "persona" as const }, { concepto: "Desayuno", monto: 150, tipo: "persona" as const },
    ];
    const n = numerosDeSalida(1400 * 4, 4, tamul);
    expect(n).toMatchObject({ ingreso: 5600, costoFijo: 1200, costoPorPax: 395, costos: 2780, margen: 2820, margenPct: 50, parteSocio: 1410, conCostos: true });
    expect(numerosDeSalida(3100, 2, []).conCostos).toBe(false);
    const sim = simularMargen(1400, tamul, 6);
    expect(sim.map(x => x.margen)).toEqual([-195, 810, 1815, 2820, 3825, 4830]);
  });
});
