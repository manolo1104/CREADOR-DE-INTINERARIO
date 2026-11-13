import { describe, expect, it } from "vitest";
import { metadataPaquete, pctDelPaqueteEnCarrito, validarPedidoPaquete } from "@/lib/cobroPaquete";
import { computePaqueteCharge } from "@/lib/paquetePricing";
import { PAQUETES_DB } from "@/lib/paquetes";
import { peorEstado, toursDePaquete } from "@/lib/cupoTour";
import { productoDelPago } from "@/lib/reservaWeb";
import { MSI_DESDE } from "@/lib/stripeMsi";
import { cotizarPedido, pedidoInicial } from "@/lib/paqueteCarrito";

// 13 nov 2026: los paquetes pasan al checkout del carrito (mismo Stripe, mismo
// anticipo que los tours: 30 % o todo). Ejemplo de Manolo: Gran Huasteca para
// 2, $12,290 → anticipo $3,687, resto $8,603 al llegar.

const MANANA = (() => { const d = new Date(Date.now() + 3 * 864e5); return d.toISOString().slice(0, 10); })();
const gran = PAQUETES_DB.find((p) => p.slug === "gran-huasteca")!;

describe("validarPedidoPaquete", () => {
  it("Gran Huasteca para 2: total = el del motor de paquetes y anticipo 30 %", () => {
    const v = validarPedidoPaquete({ slug: "gran-huasteca", fecha: MANANA, adultos: 2 }, false);
    expect(v.ok).toBe(true);
    if (!v.ok) return;
    const motor = computePaqueteCharge({ slug: "gran-huasteca", personas: 2, pct: 100, fecha: MANANA })!;
    expect(v.cobro.total).toBe(motor.total);
    expect(v.pct).toBe(30);
    expect(v.cobrar).toBe(computePaqueteCharge({ slug: "gran-huasteca", personas: 2, pct: 30, fecha: MANANA })!.charge);
    expect(v.saldo).toBe(v.cobro.total - v.cobrar);
  });
  it("«pagar todo» solo desde el umbral de meses sin intereses", () => {
    expect(pctDelPaqueteEnCarrito(MSI_DESDE, true)).toBe(100);
    expect(pctDelPaqueteEnCarrito(MSI_DESDE - 1, true)).toBe(30);
    expect(pctDelPaqueteEnCarrito(MSI_DESDE + 5000, false)).toBe(30);
  });
  it("sin fecha, fecha pasada, paquete inventado o más de 12: no se cobra", () => {
    expect(validarPedidoPaquete({ slug: "gran-huasteca", adultos: 2 }, false)).toMatchObject({ ok: false, status: 400 });
    expect(validarPedidoPaquete({ slug: "gran-huasteca", fecha: "2020-01-01", adultos: 2 }, false)).toMatchObject({ ok: false });
    expect(validarPedidoPaquete({ slug: "no-existe", fecha: MANANA, adultos: 2 }, false)).toMatchObject({ ok: false });
    expect(validarPedidoPaquete({ slug: "gran-huasteca", fecha: MANANA, adultos: 13 }, false)).toMatchObject({ ok: false });
  });
  it("una habitación que el paquete no ofrece no cambia el precio a escondidas", () => {
    const v = validarPedidoPaquete({ slug: "gran-huasteca", fecha: MANANA, adultos: 2, habitacionId: "no-existe" }, false);
    expect(v.ok && v.cobro.vistaMontana).toBe(false);
  });
});

describe("metadata del cobro de paquete", () => {
  const v = validarPedidoPaquete({ slug: "gran-huasteca", fecha: MANANA, adultos: 3, childrenMid: 1, nocheExtra: true }, false);
  if (!v.ok) throw new Error("pedido de prueba inválido");
  const m = metadataPaquete(v, { customerEmail: "a@b.com", customerName: "Ana", customerPhone: "4891234567", notas: "", locale: "es", gaClientId: "", sid: "s1", equipo: {} });

  it("trae las llaves que lee registrarReservaPaquete y la pantalla lo ve como paquete", () => {
    for (const k of ["tourSlug", "tourDate", "totalCompleto", "paquetePct", "adults", "childrenMid", "childrenSmall", "children",
      "habitacion", "nocheExtra", "nochesHotel", "repartoHab", "tourElegido", "customerPhone", "notasCliente", "conTour", "recogida",
      "recogidaCliente", "extraTraslado", "importeHotel"]) expect(m).toHaveProperty(k);
    expect(productoDelPago(m)).toBe("paquete");
    expect(m.carrito).toBe("paquete");
    expect(m.nocheExtra.startsWith("sí")).toBe(true);
  });
  it("cabe en Stripe: máximo 50 llaves y 500 caracteres por valor", () => {
    expect(Object.keys(m).length).toBeLessThanOrEqual(50);
    for (const val of Object.values(m)) expect(val.length).toBeLessThanOrEqual(500);
  });
});

describe("lo que se pinta = lo que se cobra", () => {
  it("cotizarPedido da el mismo total y anticipo que el servidor", () => {
    const pedido = { ...pedidoInicial("gran-huasteca"), fecha: MANANA, adultos: 4 };
    const c = cotizarPedido(pedido, false, false)!;
    const v = validarPedidoPaquete({ slug: "gran-huasteca", fecha: MANANA, adultos: 4 }, false);
    expect(v.ok && [v.cobro.total, v.cobrar]).toEqual([c.completo.total, c.hoy]);
  });
});

describe("disponibilidad del paquete: manda su peor día", () => {
  it("peorEstado", () => {
    expect(peorEstado(["libre", "casi-lleno", "con-reservas"])).toBe("casi-lleno");
    expect(peorEstado(["libre", undefined, "cerrada"])).toBe("cerrada");
    expect(peorEstado([])).toBe("libre");
  });
  it("las fechas de los recorridos salen del día 1", () => {
    const dias = toursDePaquete(gran, "2026-12-01", []);
    expect(dias.length).toBeGreaterThan(0);
    expect(dias[0].fecha >= "2026-12-01").toBe(true);
  });
});
