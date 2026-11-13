// Lote 7 (10 nov 2026): corte semanal y costos reales, sin cambiar la fórmula.
import { describe, expect, it } from "vitest";
import {
  armarTarjetasDelCorte, avisosCuadre, calcularCorte, cambiosDe, claveDeTarjeta, costosRealesPorTarjeta, cuadreCobros,
  cuentasDe, diferenciasDelCorte, juntarCambios, limpiarTarjetas, normalizarCuentas, puedeHacerCorte, sinCambios, tourDeTarjeta,
  type Captura, type CobroSemana, type SalidaCorte,
} from "../corteSemanal";
import { diasDeTourDe, numerosConCorte, viajeConTodoCancelado, claveDeSalida, type ReservaParaSalidas } from "../salidas";
import { filasPorTour, type SalidaParaTour } from "../rentabilidadPorTour";

/** Una tarjeta del corte con lo mínimo que el motor necesita (como en corteSemanal.test.ts). */
function tarjeta(clave: string, ventas: number, extra: Partial<SalidaCorte> = {}): SalidaCorte {
  const [fecha, id, slug] = clave.split("|");
  return {
    clave, fecha, tour: slug, personas: 2, slug, zona: null, extras: 0, ventas, hospedaje: 0,
    costosSugeridos: [{ concepto: "Guía", monto: 800 }],
    reserva: { id, folio: `HP-M-${id}`, cliente: id, personas: 2, cobrado: ventas, hospedaje: 0, cobradoReserva: ventas, tours: 1, precioTour: ventas, totalReserva: ventas, saldo: 0 },
    ...extra,
  };
}
const cobro = (monto: number, extra: Partial<CobroSemana> = {}): CobroSemana =>
  ({ monto, recibio: "Manolo", concepto: "pago", stripe: false, rzr: false, ...extra });

describe("la clave de la tarjeta es la misma en el corte y en los costos de la salida", () => {
  it("los personalizados y los conceptos van por su nombre; los demás, por su tour", () => {
    expect(tourDeTarjeta("expedicion-tamul", "Lo que sea")).toBe("expedicion-tamul");
    expect(tourDeTarjeta("__personalizado", "  Tour   Xilitla ")).toBe("__personalizado:tour xilitla");
    expect(tourDeTarjeta("", "Traslado")).toBe("concepto:traslado");
    expect(claveDeTarjeta("2026-11-02", "r1", "__personalizado", "Cena")).not.toBe(claveDeTarjeta("2026-11-02", "r1", "__personalizado", "Rappel"));
  });
  it("dos personalizados de una reserva el mismo día son dos días de tour; el mismo con otros espacios, uno", () => {
    const b: ReservaParaSalidas = {
      confirmationNumber: "HP-1", tourSlug: "__personalizado", tourName: "", tourDate: "2026-11-02", totalAmount: 5000, adults: 2, children: 0,
      lineItems: [
        { tourSlug: "__personalizado", tourName: "Cena  huasteca", tourDate: "2026-11-02", adults: 2, subtotal: 1000 },
        { tourSlug: "__personalizado", tourName: "Cena huasteca", tourDate: "2026-11-02", adults: 0, subtotal: 500 },
        { tourSlug: "__personalizado", tourName: "Rappel", tourDate: "2026-11-02", adults: 2, subtotal: 2000 },
      ],
    };
    const dias = diasDeTourDe(b);
    expect(dias).toHaveLength(2);
    expect(new Set(dias.map(d => claveDeTarjeta(d.fecha, "r1", d.slug, d.nombre))).size).toBe(2);
  });
  it("un RZR de dos vehículos es UN día y UNA tarjeta, diga lo que diga cada renglón (lote 6)", () => {
    const b: ReservaParaSalidas = {
      confirmationNumber: "HP-2", tourSlug: "rzr-xilitla", tourName: "RZR", tourDate: "2026-11-02", totalAmount: 5000, adults: 4, children: 0,
      lineItems: [
        { tourSlug: "rzr-xilitla", tourName: "RZR 2 plazas", tourDate: "2026-11-02", subtotal: 2000 },
        { tourSlug: "rzr-xilitla", tourName: "RZR 4 plazas", tourDate: "2026-11-02", subtotal: 3000 },
      ],
    };
    const dias = diasDeTourDe(b);
    expect(dias).toHaveLength(1);
    expect(claveDeTarjeta(dias[0].fecha, "r2", dias[0].slug, dias[0].nombre)).toBe(claveDeTarjeta("2026-11-02", "r2", "rzr-xilitla", "RZR 4 plazas"));
  });
});

describe("un corte hecho se calcula con lo que había al hacerlo", () => {
  const congeladas = [
    tarjeta("2026-11-02|r1|expedicion-tamul", 6000, { hospedaje: 1500, reserva: { ...tarjeta("2026-11-02|r1|x", 6000).reserva, hospedaje: 1500 } }),
    tarjeta("2026-11-03|r2|gruta-de-xilo", 3000),
  ];
  // Hoy: r1 pagó su saldo (más venta, más hotel), r2 se canceló y llegó r3.
  const vivas = [
    tarjeta("2026-11-02|r1|expedicion-tamul", 9000, { hospedaje: 2500 }),
    tarjeta("2026-11-04|r3|cascadas-del-meco", 4000),
  ];

  it("ventas y hotel congelados; la cancelada sigue contando; la nueva va aparte", () => {
    const { salidas, nuevas } = armarTarjetasDelCorte(vivas, congeladas, "cerrado");
    expect(salidas.map(s => [s.clave, s.ventas, s.hospedaje, s.trasCorte])).toEqual([
      ["2026-11-02|r1|expedicion-tamul", 6000, 1500, undefined],
      ["2026-11-03|r2|gruta-de-xilo", 3000, 0, "fuera"],
    ]);
    expect(nuevas.map(n => [n.clave, n.trasCorte])).toEqual([["2026-11-04|r3|cascadas-del-meco", "nueva"]]);
  });
  it("el hotel, la ganancia y lo de Martín no se mueven solos", () => {
    const captura: Captura = {
      [congeladas[0].clave]: { incluida: true, costos: [{ concepto: "Guía", monto: 1000 }] },
      [congeladas[1].clave]: { incluida: true, costos: [{ concepto: "Guía", monto: 700 }] },
    };
    const cobros = [cobro(9000)];
    const alCerrar = calcularCorte(congeladas, captura, cobros);
    const hoy = calcularCorte(armarTarjetasDelCorte(vivas, congeladas, "cerrado").salidas, captura, cobros);
    expect(diferenciasDelCorte(alCerrar, hoy)).toEqual([]);
    expect(hoy.hospedaje).toBe(1500);
    expect(hoy.costos).toBe(1700);
    // Con las reservas de hoy, el aviso dice qué cambiaría al rehacerlo.
    const enVivo = calcularCorte(vivas, normalizarCuentas(vivas, captura).captura, cobros);
    const que = diferenciasDelCorte(alCerrar, enVivo).map(d => d.que);
    expect(que).toEqual(expect.arrayContaining(["Hotel", "Ganancia", "Lo que se le pasa a Martín"]));
  });
  it("un borrador o un corte de antes (sin tarjetas guardadas) usa las de hoy", () => {
    expect(armarTarjetasDelCorte(vivas, congeladas, "borrador").salidas).toBe(vivas);
    expect(armarTarjetasDelCorte(vivas, null, "cerrado").salidas).toBe(vivas);
    expect(limpiarTarjetas(null)).toBeNull();
    expect(limpiarTarjetas(JSON.parse(JSON.stringify(congeladas)))?.map(s => s.ventas)).toEqual([6000, 3000]);
  });
});

describe("cuenta junta cuya principal se canceló o cambió de fecha", () => {
  const A = tarjeta("2026-11-02|ra|expedicion-tamul", 5000);
  const B = tarjeta("2026-11-02|rb|expedicion-tamul", 3000);
  const C = tarjeta("2026-11-02|rc|expedicion-tamul", 2000);
  const captura: Captura = {
    [A.clave]: { incluida: true, costos: [{ concepto: "Camioneta", monto: 2400 }], cuenta: A.clave },
    [B.clave]: { incluida: true, costos: [], cuenta: A.clave },
    [C.clave]: { incluida: true, costos: [], cuenta: A.clave },
  };

  it("antes: las demás quedaban en $0; ahora la primera viva toma la cuenta con sus costos", () => {
    const sinA = [B, C];
    expect(calcularCorte(sinA, captura).costos).toBe(0); // el error de antes, sin normalizar
    const { captura: n, heredadas } = normalizarCuentas(sinA, captura);
    expect(heredadas).toEqual([B.clave]);
    expect(n[A.clave]).toBeUndefined();
    expect(n[B.clave]).toEqual({ incluida: true, costos: [{ concepto: "Camioneta", monto: 2400 }], cuenta: B.clave });
    expect(n[C.clave]).toEqual({ incluida: true, costos: [], cuenta: B.clave });
    expect(cuentasDe(sinA, n)).toHaveLength(1);
    expect(calcularCorte(sinA, n).costos).toBe(2400);
  });
  it("si queda una sola, lleva los costos ella sola", () => {
    const { captura: n } = normalizarCuentas([C], { [A.clave]: captura[A.clave], [C.clave]: captura[C.clave] });
    expect(n[C.clave]).toEqual({ incluida: true, costos: [{ concepto: "Camioneta", monto: 2400 }] });
  });
  it("si los costos de la principal ya se perdieron, vuelven a lo del Cotizador (nunca $0)", () => {
    const { captura: n } = normalizarCuentas([B, C], { [B.clave]: captura[B.clave], [C.clave]: captura[C.clave] });
    expect(n).toEqual({});
    expect(calcularCorte([B, C], n).costos).toBe(1600);
  });
  it("con la principal viva no cambia nada", () => {
    const r = normalizarCuentas([A, B, C], captura);
    expect(r.captura).toBe(captura);
    expect(r.heredadas).toEqual([]);
  });
});

describe("costos reales: en borrador solo lo capturado", () => {
  const A = tarjeta("2026-11-02|ra|expedicion-tamul", 5000, { ventaExtras: 400 });
  const B = tarjeta("2026-11-02|rb|expedicion-tamul", 3000);
  it("la tarjeta sin tocar no es «real» (traía los fijos completos del Cotizador)", () => {
    const por = costosRealesPorTarjeta([A, B], { [A.clave]: { incluida: true, costos: [{ concepto: "Guía", monto: 900 }] } });
    expect(Object.keys(por)).toEqual([A.clave]);
    expect(por[A.clave]).toEqual({ incluida: true, costos: 900, ventaExtras: 400 });
  });
  it("una cuenta junta reparte sus costos entre sus tarjetas, sin doble conteo", () => {
    const por = costosRealesPorTarjeta([A, B], {
      [A.clave]: { incluida: true, costos: [{ concepto: "Camioneta", monto: 1600 }], cuenta: A.clave },
      [B.clave]: { incluida: true, costos: [], cuenta: A.clave },
    });
    expect(por[A.clave].costos + por[B.clave].costos).toBe(1600);
    expect(por[A.clave].costos).toBe(1000);
  });
});

describe("los números de la salida: ingreso y costos con el mismo alcance", () => {
  const cot = [{ concepto: "Guía", monto: 800, tipo: "fijo" as const }];
  it("con costos del corte, el ingreso lleva lo cobrado de extras", () => {
    const r = numerosConCorte(5000, 4, cot, [{ costos: 2000, ventaExtras: 600 }, { costos: 500, ventaExtras: 0 }]);
    expect(r.conCorte).toBe(true);
    expect(r.ingresoExtras).toBe(600);
    expect(r.numeros.ingreso).toBe(5600);
    expect(r.numeros.margen).toBe(3100);
  });
  it("si falta una reserva en el corte, o el corte dice $0, se estima con el Cotizador y sin extras", () => {
    expect(numerosConCorte(5000, 4, cot, [{ costos: 2000, ventaExtras: 600 }, undefined])).toMatchObject({ conCorte: false, ingresoExtras: 0, numeros: { ingreso: 5000, costos: 800 } });
    expect(numerosConCorte(5000, 4, cot, [{ costos: 0, ventaExtras: 600 }]).conCorte).toBe(false);
  });
});

describe("guardar por partes: no se pisa lo que otro guardó", () => {
  const k1 = "2026-11-02|r1|expedicion-tamul", k2 = "2026-11-03|r2|gruta-de-xilo";
  const abierto = {
    captura: { [k1]: { incluida: true, costos: [{ concepto: "Guía", monto: 800 }] } } as Captura,
    cobros: [cobro(5000)],
  };
  it("solo manda lo que cambió", () => {
    const c = cambiosDe(abierto, { captura: { ...abierto.captura, [k2]: { incluida: true, costos: [{ concepto: "Lancha", monto: 300 }] } }, cobros: [cobro(5000), cobro(0)] });
    expect(Object.keys(c.captura)).toEqual([k2]);
    expect(c.base[k2]).toBeNull();
    expect(c.cobros).toBeUndefined(); // un renglón en $0 no es un cambio
    expect(sinCambios(cambiosDe(abierto, abierto))).toBe(true);
  });
  it("Manolo cambió una tarjeta y Martín otra: se juntan las dos", () => {
    // Lo guardado ya trae lo de Martín en k1 y un cobro nuevo.
    const guardado = { captura: { [k1]: { incluida: true, costos: [{ concepto: "Guía", monto: 900 }] } } as Captura, cobros: [cobro(5000), cobro(1200)] };
    const mio = cambiosDe(abierto, { captura: { ...abierto.captura, [k2]: { incluida: false, costos: [] } }, cobros: abierto.cobros });
    const r = juntarCambios(guardado, mio);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.captura[k1].costos[0].monto).toBe(900);
    expect(r.captura[k2].incluida).toBe(false);
    expect(r.cobros.map(x => x.monto)).toEqual([5000, 1200]);
  });
  it("los dos cambiaron la misma tarjeta (o los cobros): choque y no se guarda nada", () => {
    const guardado = { captura: { [k1]: { incluida: true, costos: [{ concepto: "Guía", monto: 900 }] } } as Captura, cobros: [cobro(5000), cobro(1200)] };
    const mio = cambiosDe(abierto, { captura: { [k1]: { incluida: true, costos: [{ concepto: "Guía", monto: 1000 }] } }, cobros: [cobro(5000), cobro(700)] });
    const r = juntarCambios(guardado, mio);
    expect(r).toEqual({ ok: false, conflictos: [k1, "cobros"] });
  });
  it("si los dos hicieron el mismo cambio, no es choque; «Separar» borra la tarjeta", () => {
    const guardado = { captura: { [k1]: { incluida: true, costos: [{ concepto: "Guía", monto: 1000 }] } } as Captura, cobros: abierto.cobros };
    const igual = juntarCambios(guardado, cambiosDe(abierto, { captura: { [k1]: { incluida: true, costos: [{ concepto: "Guía", monto: 1000 }] } }, cobros: abierto.cobros }));
    expect(igual.ok).toBe(true);
    const separar = juntarCambios(abierto, cambiosDe(abierto, { captura: {}, cobros: abierto.cobros }));
    expect(separar.ok && separar.captura).toEqual({});
  });
});

describe("el corte se hace cuando termina la semana", () => {
  it("del lunes siguiente en adelante", () => {
    expect(puedeHacerCorte("2026-11-09", "2026-11-10")).toBe(false);
    expect(puedeHacerCorte("2026-11-09", "2026-11-15")).toBe(false);
    expect(puedeHacerCorte("2026-11-09", "2026-11-16")).toBe(true);
  });
});

describe("cuadre de lo escrito con lo registrado en Cobros", () => {
  it("avisa si falta o sobra, y si no cuadra lo de Stripe", () => {
    expect(avisosCuadre(cuadreCobros([cobro(5000, { stripe: true }), cobro(2000)], { total: 7000, stripe: 5000 }))).toEqual([]);
    const falta = avisosCuadre(cuadreCobros([cobro(5000, { stripe: true })], { total: 7000, stripe: 5000 }));
    expect(falta).toHaveLength(1);
    expect(falta[0]).toContain("Faltan $2,000");
    const sobra = avisosCuadre(cuadreCobros([cobro(5000), cobro(5000)], { total: 5000, stripe: 5000 }));
    expect(sobra[0]).toContain("$5,000 más");
    expect(sobra[1]).toContain("Vino de Stripe");
  });
});

describe("Rentabilidad: el margen por tour no depende del orden", () => {
  const s = (margen: number, conCostos: boolean): SalidaParaTour => ({
    slug: "expedicion-tamul", codigo: "TAM", tourNombre: "Tamul", aMedida: false, personas: 4,
    numeros: { ingreso: 4000, margen, conCostos },
  });
  it("con una salida sin costos, el tour no tiene margen, venga primero o al final", () => {
    const a = filasPorTour([s(1000, true), s(4000, false), s(1500, true)])[0];
    const b = filasPorTour([s(4000, false), s(1000, true), s(1500, true)])[0];
    expect(a.margen).toBeNull();
    expect(b.margen).toBeNull();
    expect(a).toEqual(b);
  });
  it("todas con costos: la suma", () => {
    expect(filasPorTour([s(1000, true), s(1500, true)])[0]).toMatchObject({ margen: 2500, margenPct: 31, conCostos: true });
  });
});

describe("revisión del lote 7: cortes hechos antes y choques que no lo son", () => {
  const A = tarjeta("2026-10-21|ra|expedicion-tamul", 5000, { hospedaje: 1000 });
  const B = tarjeta("2026-10-21|rb|expedicion-tamul", 3000);
  const captura: Captura = {
    [A.clave]: { incluida: true, costos: [{ concepto: "Camioneta", monto: 2000 }], cuenta: A.clave },
    [B.clave]: { incluida: true, costos: [], cuenta: A.clave },
  };
  const cobros = [cobro(8000)];

  it("un corte hecho sin tarjetas guardadas: un saldo cobrado después NO avisa (solo lo de siempre)", () => {
    const alCerrar = calcularCorte([A, B], captura, cobros);
    // Hoy A pagó su saldo: su parte de hotel subió. Nadie tocó el corte.
    const hoy = calcularCorte([{ ...A, hospedaje: 1500 }, B], captura, cobros);
    expect(diferenciasDelCorte(alCerrar, hoy).map(d => d.que)).toEqual(expect.arrayContaining(["Hotel", "Ganancia"]));
    expect(diferenciasDelCorte(alCerrar, hoy, { comoAntes: true })).toEqual([]);
    // Lo que avisaba antes sigue avisando: unos costos que cambiaron o una cuenta menos.
    const otrosCostos = calcularCorte([A, B], { ...captura, [A.clave]: { ...captura[A.clave], costos: [{ concepto: "Camioneta", monto: 2500 }] } }, cobros);
    expect(diferenciasDelCorte(alCerrar, otrosCostos, { comoAntes: true }).map(d => d.que)).toEqual(["Costos"]);
    const sinB = calcularCorte([A, tarjeta("2026-10-22|rc|gruta-de-xilo", 1000)], { [A.clave]: { incluida: true, costos: [] } }, cobros);
    expect(diferenciasDelCorte(alCerrar, sinB, { comoAntes: true }).map(d => d.que)).toContain("Cuentas en el corte");
  });

  it("un resumen sin `tarjetas` (de antes del 22 oct) compara cuentas con cuentas: la cuenta junta no avisa", () => {
    const r = calcularCorte([A, B], captura, cobros);
    const { tarjetas: _t, ...viejo } = r;
    expect(r.tarjetas).toBe(2);
    expect(r.salidas).toHaveLength(1);
    expect(diferenciasDelCorte(viejo, r)).toEqual([]);
  });

  it("si otro hizo el corte mientras, la tarjeta que nadie tocó (lo del Cotizador) no es choque", () => {
    const abierto = { captura: {} as Captura, cobros };
    const mio = cambiosDe(abierto, { captura: { [B.clave]: { incluida: true, costos: [{ concepto: "Guía", monto: 650 }] } }, cobros });
    // Al hacer el corte, cada tarjeta sin tocar quedó escrita con lo del Cotizador.
    const trasElCorte = { captura: { [B.clave]: { incluida: true, costos: B.costosSugeridos } } as Captura, cobros };
    const sugerida = (k: string) => (k === B.clave ? { incluida: true, costos: B.costosSugeridos } : null);
    expect(juntarCambios(trasElCorte, mio).ok).toBe(false); // sin saber lo sugerido, choca
    const r = juntarCambios(trasElCorte, mio, sugerida);
    expect(r.ok && r.captura[B.clave].costos[0].monto).toBe(650);
    // Pero si el otro sí la cambió (no es lo del Cotizador), choca.
    const cambiada = { captura: { [B.clave]: { incluida: true, costos: [{ concepto: "Guía", monto: 700 }] } } as Captura, cobros };
    expect(juntarCambios(cambiada, mio, sugerida)).toEqual({ ok: false, conflictos: [B.clave] });
  });

  it("las tarjetas guardadas siempre traen cliente y folio como texto (para ordenarlas)", () => {
    const raro = JSON.parse(JSON.stringify([A, B]));
    delete raro[0].reserva.cliente;
    const limpias = limpiarTarjetas(raro)!;
    expect(limpias[0].reserva.cliente).toBe("");
    expect(() => armarTarjetasDelCorte([], limpias, "cerrado")).not.toThrow();
  });
});

describe("reseña y «¿cómo te fue?»: no si todas sus salidas se cancelaron", () => {
  const b: ReservaParaSalidas = {
    confirmationNumber: "HP-9", tourSlug: "expedicion-tamul", tourName: "Tamul", tourDate: "2026-11-02", totalAmount: 6000, adults: 2, children: 0,
    lineItems: [
      { tourSlug: "expedicion-tamul", tourName: "Tamul", tourDate: "2026-11-02", adults: 2, subtotal: 3000 },
      { tourSlug: "gruta-de-xilo", tourName: "Gruta", tourDate: "2026-11-03", adults: 2, subtotal: 3000 },
    ],
  };
  const claves = diasDeTourDe(b).map(claveDeSalida);
  it("todas canceladas: no; una sí se operó: sí", () => {
    expect(viajeConTodoCancelado(b, new Set(claves))).toBe(true);
    expect(viajeConTodoCancelado(b, new Set([claves[0]]))).toBe(false);
    expect(viajeConTodoCancelado(b, new Set())).toBe(false);
  });
});
