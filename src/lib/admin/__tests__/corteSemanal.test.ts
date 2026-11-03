import { describe, expect, it } from "vitest";
import {
  calcularCorte, comisionDeCobro, etiquetaSemana, lunesDe, repartir, repartirExacto, repartirRzr,
  type CobroSemana, type SalidaCorte,
} from "../corteSemanal";

/** Una tarjeta del corte con lo mínimo que el motor necesita. */
function tarjeta(clave: string, ventas: number, extra: Partial<SalidaCorte> = {}): SalidaCorte {
  const [fecha, id, slug] = clave.split("|");
  return {
    clave, fecha, tour: slug, personas: 2, slug, zona: null, extras: 0, ventas, hospedaje: 0, costosSugeridos: [],
    reserva: { id, folio: `HP-M-${id}`, cliente: id, personas: 2, cobrado: ventas, hospedaje: 0, cobradoReserva: ventas, tours: 1, precioTour: ventas, totalReserva: ventas, saldo: 0 },
    ...extra,
  };
}

describe("el corte cerrado del 19–25 oct 2026 (línea base), paso por paso", () => {
  // Lo cobrado esa semana: $37,730 escritos a mano en «La semana»; $20,762 de
  // ellos por Stripe; $1,600 de un RZR que cobró Martín.
  const cobros: CobroSemana[] = [
    { monto: 20762, recibio: "Manolo", concepto: "pagos por Stripe", stripe: true,  rzr: false },
    { monto: 10768, recibio: "Manolo", concepto: "transferencias",   stripe: false, rzr: false },
    { monto: 4600,  recibio: "Martín", concepto: "efectivo",         stripe: false, rzr: false },
    { monto: 1600,  recibio: "Martín", concepto: "RZR",              stripe: false, rzr: true  },
  ];
  const salidas = [
    tarjeta("2026-10-19|r1|ruta-surrealista-edward-james", 36130),
    tarjeta("2026-10-21|r2|rzr-xilitla", 1600, { rzr: true }),
  ];
  const captura = {
    [salidas[0].clave]: { incluida: true, costos: [{ concepto: "Costos de tours", monto: 24560 }] },
    [salidas[1].clave]: { incluida: true, costos: [] },
  };
  const r = calcularCorte(salidas, captura, cobros);

  it("ventas − costos NO es la utilidad: antes salen Stripe, Railway y lo de Erick", () => {
    expect(r.ventas).toBe(37730);
    expect(r.costos).toBe(24560);
    expect(r.ventas - r.costos).toBe(13170);
    expect(r.comisionStripe).toBe(867);   // 3.6 % + IVA de $20,762
    expect(r.hosting).toBe(755);          // 2 % de $37,730
    expect(r.rzr.vendedor).toBe(160);     // 10 % del RZR de $1,600
    expect(r.quedaReal).toBe(35948);
    expect(r.utilidad).toBe(11388);
    expect(r.margen).toBe(30);
  });
  it("los tours van 50/50 y el RZR 20/80 ya sin Erick", () => {
    expect(r.tours).toEqual({ ventas: 36130, comisionStripe: 867, hosting: 723, costos: 24560, ganancia: 9980 });
    expect(r.rzr).toMatchObject({ cobrado: 1600, hosting: 32, vendedor: 160, queda: 1408, manolo: 282, martin: 1126, costos: 0 });
  });
  it("por eso la parte de Manolo ($5,272) no es la mitad de la utilidad", () => {
    const manolo = r.socios.find(s => s.nombre === "Manolo")!;
    const martin = r.socios.find(s => s.nombre === "Martín")!;
    expect(manolo.monto).toBe(4990 + 282);
    expect(martin.monto).toBe(4990 + 1126);
    expect(manolo.monto + martin.monto).toBe(r.utilidad);
    expect(manolo.hosting).toBe(755);
  });
  it("lo que se le pasa a Martín: costos que pagó + su parte + lo de Erick − lo que cobró", () => {
    expect(r.liquidacion).toEqual({ costosPagados: 24560, ganancia: 4990, rzr: 1126, vendedor: 160, cobro: 6200, pasa: 24636 });
  });
});

describe("piezas del reparto", () => {
  it("repartir: el peso impar va al primero", () => {
    expect(repartir(9980)).toEqual([4990, 4990]);
    expect(repartir(501)).toEqual([251, 250]);
  });
  it("repartirRzr: 10 % de Erick de lo cobrado; 20/80 de lo que queda", () => {
    expect(repartirRzr(10000, 0, 0)).toEqual({ vendedor: 1000, queda: 9000, manolo: 1800, martin: 7200 });
  });
  it("repartirExacto no pierde ni gana un peso", () => {
    const partes = repartirExacto(1000, [3, 3, 3]);
    expect(partes.reduce((a, b) => a + b, 0)).toBe(1000);
    expect(repartirExacto(10, [0, 0])).toEqual([5, 5]);
  });
  it("comisionDeCobro solo descuenta lo que vino por Stripe", () => {
    expect(comisionDeCobro({ monto: 10000, stripe: true })).toBe(418);
    expect(comisionDeCobro({ monto: 10000, stripe: false })).toBe(0);
  });
  it("las semanas van de lunes a domingo", () => {
    expect(lunesDe("2026-11-03")).toBe("2026-11-02");
    expect(lunesDe("2026-11-01")).toBe("2026-10-26");
    expect(etiquetaSemana("2026-10-19")).toBe("19 – 25 oct 2026");
  });
});
