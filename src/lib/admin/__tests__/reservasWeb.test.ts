import { describe, expect, it } from "vitest";
import { addDaysYMD, hoyMX } from "@/lib/dates";
import { tarifarRecorridos, nombreZona, type LineaCarrito } from "@/lib/tourPricing";
import { cotizarHabitaciones } from "@/lib/habitaciones";
import { computePaqueteCharge } from "@/lib/paquetePricing";
import { metadataDeRenglones, reconstruirLineas, MAX_RENGLONES_META } from "@/lib/webhookRecuperacion";
import {
  armarReservaWeb, correoParaContacto, importeHotelDePaquete, productoDelPago, renglonHotelCarrito,
} from "@/lib/reservaWeb";
import {
  esConceptoSinTour, habitacionesParaEditar, identidadDePaqueteAlEditar, importeDeConcepto, importeHabitacion,
  lineaParaGuardar, notasConAviso, totalParaGuardar,
} from "@/lib/admin/reservaEdicion";
import { explicarSinLugar, pedidosQueCrecen, salidasDeReserva } from "@/lib/cupoTour";
import { buildTourEmailHtml } from "@/lib/tourEmail";
import { motivoSinEnvio } from "@/lib/encuestas/encuesta";
import { topeDeApartados, MAX_APARTADOS_POR_CONEXION } from "@/lib/viajeCdmx/apartar";
import { hotelDeLaNota, propuestaHotel, type ReservaParaCorregir } from "@/lib/admin/correccionHotelWeb";

// Lote 5 de la auditoría (5 nov 2026): reservas y venta web. Aquí, las reglas;
// las rutas con la base se prueban con un script contra la base local.

const dia = (n: number) => addDaysYMD(hoyMX(), n);

/**
 * La metadata que escribe `carrito-payment-intent` para estos renglones (el
 * compacto `slug|fecha|adultos|niños|subtotal` y lo demás), con el hotel y el
 * traslado si se piden.
 */
function metadataDelCarrito(lineItems: LineaCarrito[], extra: { hotel?: Record<string, unknown>; traslado?: Record<string, unknown>; total?: number; zona?: "valles" | "xilitla" } = {}): Record<string, string> {
  const total = extra.total ?? lineItems.reduce((s, l) => s + l.subtotal, 0) + Number(extra.hotel?.total ?? 0) + Number(extra.traslado?.total ?? 0);
  return {
    customerEmail: "ana@prueba.local", customerName: "Ana Prueba", carrito: "1",
    tourId: lineItems[0].tourId, tourName: lineItems.length === 1 ? lineItems[0].tourName : `${lineItems.length} recorridos · ${lineItems.length} días`,
    tourSlug: lineItems[0].tourSlug, tourDate: lineItems[0].tourDate,
    adults: String(lineItems.reduce((s, l) => s + l.adults, 0)),
    children: String(lineItems.reduce((s, l) => s + l.children, 0)),
    items: lineItems.map((l) => `${l.tourSlug}|${l.tourDate}|${l.adults}|${l.children}|${l.subtotal}`).join(";").slice(0, 480),
    addOns: lineItems.flatMap((l) => (l.addOns ?? []).map((a) => `${l.tourSlug}:${a.nombre} x${a.cantidad}`)).join("; "),
    viajeroSolo: lineItems.filter((l) => l.viajeroSolo).map((l) => `${l.tourSlug} ${l.tourDate}`).join("; "),
    hospedaje: extra.hotel ? `${extra.hotel.habitacion} · ${extra.hotel.noches} noches · ${extra.hotel.huespedes} huéspedes · $${extra.hotel.total}` : "",
    traslado: extra.traslado ? `${extra.traslado.ciudad} → Xilitla · ${extra.traslado.personas} pax · $${extra.traslado.total}` : "",
    hospedajeData: extra.hotel ? JSON.stringify(extra.hotel) : "",
    trasladoData: extra.traslado ? JSON.stringify(extra.traslado) : "",
    totalCompleto: String(total), pctPagado: "30", saldo: "0", locale: "es", idiomaTour: "es",
    source: "huasteca-potosina.com", gaClientId: "", sid: "", apartadoId: "",
    customerPhone: "4891234567", recogida: "Hotel Paraíso Encantado",
    zonaHospedaje: extra.zona ? nombreZona(extra.zona) : "",
    cargoValles: String(lineItems.reduce((s, l) => s + (l.cargoValles ?? 0), 0)),
    ...metadataDeRenglones(lineItems),
  };
}

function carrito(items: unknown[], zona?: "valles" | "xilitla"): LineaCarrito[] {
  const t = tarifarRecorridos(items, { zona });
  if (!t.ok) throw new Error(t.error);
  return t.lineItems;
}

// Un carrito con todo lo que la metadata vieja perdía: elección, actividad
// extra, menores de los dos tramos, Valles, descuento por varios y un RZR.
const CARRITO = () => carrito([
  { tourSlug: "ruta-acuatica-puente-de-dios", tourDate: dia(30), adults: 2, childrenMid: 1, childrenSmall: 1, eleccion: "tamasopo" },
  { tourSlug: "paraiso-escalonado-minas-micos", tourDate: dia(31), adults: 2, childrenMid: 1, childrenSmall: 1, addOns: [{ id: "salto-7-cascadas", cantidad: 2 }] },
  { tourSlug: "ruta-surrealista-edward-james", tourDate: dia(32), adults: 2, childrenMid: 1, childrenSmall: 1 },
  { tourSlug: "rzr-xilitla", tourDate: dia(33), ruta: "Ruta Miradores", vehiculo: "Defender", unidades: 2 },
], "valles");

describe("la reserva de un pago de la web sale de la metadata, no del navegador (web#3, web#4, reservas#3, web#1)", () => {
  it("🔴 el webhook rehace los recorridos IGUAL que la pantalla: elección, actividades, menores, Valles y RZR (web#4)", () => {
    const lineItems = CARRITO();
    const meta = metadataDelCarrito(lineItems, { zona: "valles" });
    expect(reconstruirLineas(meta)).toEqual(lineItems);
    // Lo que antes se perdía, dicho en concreto:
    const r = reconstruirLineas(meta);
    expect(r[0].eleccion).toBe("Cascadas de Tamasopo");
    expect(r[1].addOns?.[0]).toMatchObject({ id: "salto-7-cascadas", cantidad: 2, subtotal: 700 });
    expect(r[2].addOns?.some((a) => a.id === "traslado-valles" && a.subtotal === 400)).toBe(true);
    expect(r[2].tourName).toContain("desde Ciudad Valles");
    expect(r[3]).toMatchObject({ ruta: "Ruta Miradores", vehiculo: "Defender", unidades: 2 });
  });

  it("🔴 el grupo es el máximo por recorrido: 2 adultos y 2 niños en 3 tours ya no son 6 adultos (web#4)", () => {
    const lineItems = CARRITO().slice(0, 3);
    const meta = metadataDelCarrito(lineItems);
    expect(meta.adults).toBe("6"); // la suma que escribe la metadata
    const r = armarReservaWeb(meta, 1000);
    expect(r.adults).toBe(2);
    expect(r.children).toBe(2);
  });

  it("🔴 el hotel pagado en el carrito queda en la reserva con su importe (reservas#3, web#1)", () => {
    const lineItems = CARRITO().slice(0, 2);
    const q = cotizarHabitaciones([{ habitacionId: "lirios-1", huespedes: 2 }, { habitacionId: "orquideas-2", huespedes: 2 }], 2);
    expect(q.ok).toBe(true);
    const hotel = { habitacion: "Lirios 1 (2) + Orquídeas 2 (2)", noches: 2, huespedes: 4, total: q.total, ahorro: 0, checkin: dia(29), checkout: dia(31) };
    const meta = metadataDelCarrito(lineItems, { hotel });
    const r = armarReservaWeb(meta, 3000);
    expect(r.packageItems).toEqual([{
      hotel: "Hotel Paraíso Encantado", habitacion: hotel.habitacion, noches: 2, habitaciones: 2,
      checkin: dia(29), checkout: dia(31), subtotal: q.total,
    }]);
    // El total de la reserva = recorridos + hotel: el corte separa justo esto.
    expect(r.totalAmount).toBe(lineItems.reduce((s, l) => s + l.subtotal, 0) + Number(q.total));
  });

  it("el traslado desde otra ciudad es un renglón más, y el idioma, la zona, el teléfono y la recogida vienen de la metadata", () => {
    const lineItems = CARRITO().slice(0, 1);
    const meta = { ...metadataDelCarrito(lineItems, { traslado: { ciudad: "Monterrey", personas: 4, total: 9800 }, zona: "valles" }), locale: "en", idiomaTour: "en" };
    const r = armarReservaWeb(meta, 5000);
    expect(r.lineas.at(-1)).toEqual({ tourName: "Transfer Monterrey → Xilitla (round trip)", tourDate: lineItems[0].tourDate, adults: 4, children: 0, subtotal: 9800 });
    expect(r.meta).toEqual({ _meta: true, locale: "en", zonaHospedaje: "Ciudad Valles" });
    expect(r.idiomaTour).toBe("en");
    expect(r.telefono).toBe("4891234567");
    expect(r.recogida).toBe("Hotel Paraíso Encantado");
    expect(r.notasEquipo.some((n) => n.includes("eligió: Cascadas de Tamasopo"))).toBe(true);
    expect(r.notasEquipo.some((n) => n.startsWith("TRASLADO: Monterrey"))).toBe(true);
  });

  it("un cobro de ANTES (sin lineaN) se rehace como siempre", () => {
    const lineItems = CARRITO().slice(0, 2);
    const meta = metadataDelCarrito(lineItems);
    for (let i = 1; i <= MAX_RENGLONES_META; i++) delete meta[`linea${i}`];
    const r = reconstruirLineas(meta);
    expect(r).toEqual(lineItems.map((l) => ({
      tourSlug: l.tourSlug, tourName: r.find((x) => x.tourSlug === l.tourSlug)!.tourName, tourDate: l.tourDate,
      adults: l.adults, children: l.children, subtotal: l.subtotal,
    })));
    expect(r[0].tourId).toBeUndefined();
  });

  it("un carrito lleno cabe en la metadata de Stripe (50 llaves, 500 caracteres por valor)", () => {
    const ocho = carrito(Array.from({ length: 8 }, (_, i) => ({
      tourSlug: i % 2 ? "ruta-surrealista-edward-james" : "ruta-acuatica-puente-de-dios", tourDate: dia(40 + i),
      adults: 3, childrenMid: 2, childrenSmall: 1, eleccion: "siete-cascadas",
    })), "valles");
    const meta = metadataDelCarrito(ocho, { hotel: { habitacion: "Lirios 1 (2)", noches: 3, huespedes: 2, total: 5400, checkin: dia(39), checkout: dia(42) }, traslado: { ciudad: "Monterrey", personas: 6, total: 9800 } });
    expect(Object.keys(meta).length).toBeLessThanOrEqual(50);
    for (const v of Object.values(meta)) expect(v.length).toBeLessThanOrEqual(500);
    expect(reconstruirLineas(meta)).toEqual(ocho);
  });

  it("el RZR comprado solo guarda su renglón de vehículo, y el recorrido suelto solo sus columnas", () => {
    const rzr = armarReservaWeb({
      source: "huasteca-potosina.com", tourId: "tour-rzr-xilitla", tourSlug: "rzr-xilitla", tourName: "RZR — Ruta Miradores · Defender ×2",
      tourDate: dia(20), adults: "2", children: "0", ruta: "Ruta Miradores", vehiculo: "Defender", unidades: "2", totalCompleto: "6000",
    }, 1800);
    expect(rzr.lineas).toEqual([{
      tourSlug: "rzr-xilitla", tourName: "RZR — Ruta Miradores · Defender ×2", tourDate: dia(20), ruta: "Ruta Miradores", vehiculo: "Defender",
      unidades: 2, adults: 2, children: 0, childrenMid: 0, childrenSmall: 0, subtotal: 6000,
    }]);
    expect(rzr.saldo).toBe(4200);
    const suelto = armarReservaWeb({
      source: "huasteca-potosina.com", tourId: "tour-tamul", tourSlug: "expedicion-tamul", tourName: "Expedición Tamul",
      tourDate: dia(20), adults: "3", children: "1", totalCompleto: "4000", promoCode: "HUASTECA10", promoDiscount: "10",
    }, 4000);
    expect(suelto.lineas).toEqual([]);
    expect([suelto.adults, suelto.children, suelto.promoCode, suelto.promoDiscount, suelto.saldo]).toEqual([3, 1, "HUASTECA10", 10, 0]);
  });

  it("🔴 cada pantalla acepta solo SU producto: Kora, un paquete o el viaje no se vuelven reserva de tour (web#3)", () => {
    const tour = { source: "huasteca-potosina.com", tourId: "tour-tamul" };
    expect(productoDelPago(tour)).toBe("tour");
    expect(productoDelPago({ ...tour, carrito: "1" })).toBe("tour");
    expect(productoDelPago({ ...tour, producto: "paquete" })).toBe("paquete");
    expect(productoDelPago({ ...tour, producto: "viaje-cdmx" })).toBe("viaje-cdmx");
    expect(productoDelPago({ ...tour, producto: "curso_ia" })).toBe("ajeno");
    expect(productoDelPago({ tourId: "x" })).toBe("ajeno"); // Kora: sin la marca del sitio
    expect(productoDelPago({ source: "huasteca-potosina.com" })).toBe("ajeno");
    expect(productoDelPago(null)).toBe("ajeno");
  });

  it("el renglón del hotel sin habitación no se inventa", () => {
    expect(renglonHotelCarrito(null)).toBeUndefined();
    expect(renglonHotelCarrito({ total: 3000 })).toBeUndefined();
  });
});

describe("el hotel de un paquete lleva su importe (reservas#3, web#1)", () => {
  const pedir = (extra: Record<string, unknown> = {}) => computePaqueteCharge({ slug: "gran-huasteca", personas: 3, childrenMid: 1, pct: 30, fecha: dia(45), ...extra });

  it("computePaqueteCharge dice cuánto es de hotel, nunca más que el paquete", () => {
    const c = pedir()!;
    expect(c.importeHotel).toBeGreaterThan(0);
    expect(c.importeHotel).toBeLessThan(c.total);
  });

  it("los cobros nuevos lo traen en la metadata; los viejos se recalculan solo si dan el MISMO total", () => {
    const c = pedir({ nocheExtra: true })!;
    const meta: Record<string, string> = {
      tourSlug: "gran-huasteca", adults: "3", childrenMid: "1", childrenSmall: "0", habitacion: "Vista a la selva",
      repartoHab: "", nocheExtra: "sí — entra la víspera, check-in 3 PM", tourElegido: "", paquetePct: "30",
      tourDate: dia(45), conTour: "no", extraTraslado: "0", totalCompleto: String(c.total),
    };
    expect(importeHotelDePaquete({ ...meta, importeHotel: "4321" })).toBe(4321);
    expect(importeHotelDePaquete(meta)).toBe(c.importeHotel);
    // Si la tarifa cambió desde el cobro, no se adivina.
    expect(importeHotelDePaquete({ ...meta, totalCompleto: String(c.total + 500) })).toBeNull();
  });
});

describe("editar una reserva de la web sin romperla (reservas#9)", () => {
  it("🔴 la habitación de la web (sin precio por noche) vuelve con su importe exacto, nunca NaN", () => {
    const [h] = habitacionesParaEditar([{ hotel: "Hotel Paraíso Encantado", habitacion: "Lirios 1 (2) + Orquídeas 2 (2)", noches: 2, habitaciones: 2, subtotal: 6300 }]);
    expect(h.precioPorNoche).toBe(1575);
    expect(importeHabitacion(h)).toBe(6300);
    const [raro] = habitacionesParaEditar([{ habitacion: "Jungla", noches: 3, habitaciones: 1, subtotal: 1000 }]);
    expect(importeHabitacion(raro)).toBe(1000);
    const [sinNada] = habitacionesParaEditar([{ habitacion: "Habitación", noches: 2, habitaciones: 1 }]);
    expect(importeHabitacion(sinNada)).toBe(0);
    expect(importeHabitacion({ precioPorNoche: undefined, noches: 2, habitaciones: 1 })).toBe(0);
    // La del panel se queda con su precio por noche.
    expect(habitacionesParaEditar([{ precioPorNoche: 1800, noches: 2, habitaciones: 1, subtotal: 3600 }])[0].precioPorNoche).toBe(1800);
  });

  it("🔴 el traslado de la web (sin recorrido) se puede guardar con lo que se cobró", () => {
    const traslado = { tourSlug: "", tourName: "Traslado Monterrey → Xilitla (ida y vuelta)", tourDate: dia(10), subtotal: 9800 };
    expect(esConceptoSinTour(traslado)).toBe(true);
    expect(importeDeConcepto(traslado)).toBe(9800);
    expect(esConceptoSinTour({ tourSlug: "", tourName: "  " })).toBe(false);
    expect(esConceptoSinTour({ tourSlug: "expedicion-tamul", tourName: "Expedición Tamul" })).toBe(false);
  });

  it("🔴 un paquete sigue siendo el paquete: slug, id y nombre se quedan; la fecha se mueve solo con sus recorridos", () => {
    const antes = {
      tourId: "gran-huasteca", tourSlug: "gran-huasteca", tourName: "Paquete · Gran Huasteca", tourDate: "2026-12-10",
      lineItems: [{ tourSlug: "expedicion-tamul", tourDate: "2026-12-11" }, { tourSlug: "cascadas-del-meco", tourDate: "2026-12-12" }, { _meta: true }],
    };
    const soloGuia = identidadDePaqueteAlEditar(antes, {
      tourId: "expedicion-tamul", tourSlug: "expedicion-tamul", tourName: "Expedición Tamul + Cascadas del Meco", tourDate: "2026-12-11",
      lineItems: antes.lineItems,
    });
    expect(soloGuia).toEqual({ tourId: "gran-huasteca", tourSlug: "gran-huasteca", tourName: "Paquete · Gran Huasteca", tourDate: "2026-12-10" });
    const movido = identidadDePaqueteAlEditar(antes, {
      tourDate: "2026-12-14", lineItems: [{ tourSlug: "expedicion-tamul", tourDate: "2026-12-14" }, { tourSlug: "cascadas-del-meco", tourDate: "2026-12-15" }],
    });
    expect(movido).toEqual({ tourDate: "2026-12-13" });
    expect(identidadDePaqueteAlEditar(antes, { guia: "Ángel" })).toEqual({});
  });

  it("el total que se guarda es un entero ≥ 0; lo demás no llega a la base", () => {
    expect(totalParaGuardar(4500)).toBe(4500);
    expect(totalParaGuardar("4500.4")).toBe(4500);
    expect(totalParaGuardar(0)).toBe(0);
    for (const malo of [null, NaN, -1, "abc", "", undefined, Infinity, true]) expect(totalParaGuardar(malo)).toBeNull();
  });
});

describe("los niños del carrito no se cuentan doble (reservas#10)", () => {
  const renglon = { tourSlug: "expedicion-tamul", tourName: "Expedición Tamul", tourDate: "2026-12-01", adults: 2, children: 2, childrenMid: 1, childrenSmall: 1, subtotal: 5000 };

  it("🔴 el correo dice «4 personas» a una familia de 2 adultos y 2 niños", () => {
    const html = buildTourEmailHtml({
      customerName: "Ana", confirmationNumber: "HPPRUEBA01", tourName: "2 recorridos", tourDate: "2026-12-01", tourSlug: "",
      adults: 2, children: 2, totalAmount: 10000,
      lineItems: [renglon, { ...renglon, tourSlug: "cascadas-del-meco", tourName: "Cascadas del Meco", tourDate: "2026-12-02" }],
    });
    expect(html).toContain("Grupo de 4 personas");
    expect(html).not.toContain("6 personas");
  });

  it("🔴 quitar a los niños en Editar los quita también del cupo y de la salida", () => {
    const editado = lineaParaGuardar({ ...renglon, childrenMid: 0, childrenSmall: 0 });
    expect(editado.children).toBe(0);
    expect(salidasDeReserva({ tourSlug: "", tourDate: "", adults: 2, children: 0, lineItems: [editado] })[0].personas).toBe(2);
    // Antes: el `children: 2` viejo seguía ocupando dos lugares.
    expect(salidasDeReserva({ tourSlug: "", tourDate: "", adults: 2, children: 0, lineItems: [{ ...renglon, childrenMid: 0, childrenSmall: 0 }] })[0].personas).toBe(4);
    // Un renglón del panel (sin `children`) se queda igual.
    expect("children" in lineaParaGuardar({ adults: 2, childrenMid: 1, childrenSmall: 0 })).toBe(false);
  });
});

describe("Editar revisa el cupo antes de guardar (reservas#8)", () => {
  const reserva = (lineas: Record<string, unknown>[]) => ({ tourSlug: "", tourDate: "", adults: 0, children: 0, lineItems: [{ _meta: true }, ...lineas] });
  const tamul = (fecha: string, adults: number, extra: Record<string, unknown> = {}) => ({ tourSlug: "expedicion-tamul", tourDate: fecha, adults, childrenMid: 0, childrenSmall: 0, ...extra });

  it("🔴 moverla de día o sumar gente pide el lugar de ese día, con TODA su gente", () => {
    const antes = reserva([tamul("2026-11-21", 4)]);
    expect(pedidosQueCrecen(antes, reserva([tamul("2026-11-22", 4)]))).toEqual([{ slug: "expedicion-tamul", fecha: "2026-11-22", personas: 4 }]);
    expect(pedidosQueCrecen(antes, reserva([tamul("2026-11-21", 6)]))).toEqual([{ slug: "expedicion-tamul", fecha: "2026-11-21", personas: 6 }]);
  });

  it("el guía, el nombre, quitar gente o el RZR no piden nada", () => {
    const antes = reserva([tamul("2026-11-21", 4)]);
    expect(pedidosQueCrecen(antes, antes)).toEqual([]);
    expect(pedidosQueCrecen(antes, reserva([tamul("2026-11-21", 3)]))).toEqual([]);
    // Las columnas de una reserva vieja sin renglones también cuentan.
    expect(pedidosQueCrecen({ tourSlug: "eden-en-el-jardin", tourDate: "2026-11-21", adults: 2, children: 0 }, { tourSlug: "eden-en-el-jardin", tourDate: "2026-11-21", adults: 2, children: 0 })).toEqual([]);
  });

  it("🔴 en el Edén el aviso dice que el día ya es de otro grupo", () => {
    expect(explicarSinLugar({ slug: "eden-en-el-jardin", fecha: "2026-11-21", personas: 2, estado: "sin-cupo" })).toContain("ese día ya es de otro grupo");
    expect(explicarSinLugar({ slug: "expedicion-tamul", fecha: "2026-11-22", personas: 14, estado: "no-cabe" })).toContain("sin lugar");
    expect(explicarSinLugar({ slug: "expedicion-tamul", fecha: "2026-11-22", personas: 4, estado: "cerrada" })).toContain("fecha cerrada");
  });

  it("la nota de sobrecupo va una vez", () => {
    expect(notasConAviso("Llegan tarde", "⚠️ SOBRECUPO (x)")).toBe("⚠️ SOBRECUPO (x)\nLlegan tarde");
    expect(notasConAviso("⚠️ SOBRECUPO (x)\nLlegan tarde", "⚠️ SOBRECUPO (x)")).toBe("⚠️ SOBRECUPO (x)\nLlegan tarde");
    expect(notasConAviso(null, null)).toBeNull();
  });
});

describe("a una reserva cancelada no se le manda nada (reservas#11)", () => {
  it("🔴 ni confirmación ni check-in a una cancelada o a un borrador", () => {
    expect(motivoSinEnvio("cancelled", "confirmacion")).toBe("Esta reserva está cancelada: no se le manda la confirmación.");
    expect(motivoSinEnvio("cancelled", "checkin")).toBe("Esta reserva está cancelada: no se le manda el check-in.");
    expect(motivoSinEnvio("borrador", "confirmacion")).toContain("borrador");
    expect(motivoSinEnvio("pending", "confirmacion")).toBeNull();
    expect(motivoSinEnvio("paid", "checkin")).toBeNull();
  });
});

describe("viaje CDMX: apartar no le quita el pago a otra persona de la misma red (web#7)", () => {
  it("🔴 dos amigas en el mismo Wi-Fi apartan cada una lo suyo", () => {
    expect(topeDeApartados(["bety@x.com"], "ana@x.com")).toBeNull();
    expect(topeDeApartados(["bety@x.com", "carla@x.com"], "ana@x.com")).toBeNull();
  });
  it("la misma persona sigue con su tope de 2, y una red no puede apartar sin fin", () => {
    expect(topeDeApartados(["ana@x.com", "ANA@x.com"], "ana@x.com")).toContain("Ya tienes un apartado");
    expect(topeDeApartados(Array.from({ length: MAX_APARTADOS_POR_CONEXION }, (_, i) => `p${i}@x.com`), "nueva@x.com")).toContain("desde esta conexión");
  });
});

describe("el CRM no junta clientes por el correo de relleno (web#4)", () => {
  it("🔴 «pendiente@desconocido» no es un correo para buscar o crear el contacto", () => {
    expect(correoParaContacto("pendiente@desconocido")).toBeNull();
    expect(correoParaContacto("algo@prueba.invalid")).toBeNull();
    expect(correoParaContacto("")).toBeNull();
    expect(correoParaContacto(" ana@correo.mx ")).toBe("ana@correo.mx");
  });
});

describe("corrección de las reservas ya hechas: el hotel con su importe (reservas#3, web#1)", () => {
  const base: ReservaParaCorregir = {
    id: "r1", confirmationNumber: "HPMHI1A2B3", tourSlug: "expedicion-tamul", totalAmount: 12000, status: "pending",
    notes: "Recogida: Hotel X | Reserva de 2 recorridos en un solo pago. | Hospedaje: Lirios 1 (2), 2 noche(s), 2 huésped(es) — entrada 2026-11-20, salida 2026-11-22.",
    lineItems: [{ tourSlug: "expedicion-tamul", tourDate: "2026-11-20", subtotal: 5000 }, { tourSlug: "cascadas-del-meco", tourDate: "2026-11-21", subtotal: 3400 }, { _meta: true }],
    packageItems: null, stripePaymentIntentId: "pi_123",
  };

  it("lee la nota de la pantalla y la del webhook", () => {
    expect(hotelDeLaNota(base.notes)).toEqual({ habitacion: "Lirios 1 (2)", noches: 2, huespedes: 2, importe: null, checkin: "2026-11-20", checkout: "2026-11-22" });
    expect(hotelDeLaNota("x | Hospedaje: Lirios 1 (2) · 2 noches · 2 huéspedes · $3600 | y")).toMatchObject({ habitacion: "Lirios 1 (2)", noches: 2, importe: 3600 });
    expect(hotelDeLaNota("sin hotel")).toBeNull();
  });

  it("🔴 con la metadata de Stripe, el hotel exacto del cobro", () => {
    const p = propuestaHotel(base, { hospedajeData: JSON.stringify({ habitacion: "Lirios 1 (2)", noches: 2, huespedes: 2, total: 3600, checkin: "2026-11-20", checkout: "2026-11-22" }) });
    expect(p).toMatchObject({ accion: "corregir", fuente: "stripe", importe: 3600 });
  });

  it("sin Stripe, de la nota: el total menos lo que suman sus recorridos", () => {
    const p = propuestaHotel(base, null);
    expect(p).toMatchObject({ accion: "corregir", fuente: "nota", importe: 3600 });
    if (p.accion === "corregir") expect(p.packageItems[0]).toMatchObject({ hotel: "Hotel Paraíso Encantado", habitacion: "Lirios 1 (2)", subtotal: 3600, checkin: "2026-11-20" });
  });

  it("lo que no cuadra se revisa a mano; lo que ya está bien o no es de la web no se toca", () => {
    expect(propuestaHotel({ ...base, totalAmount: 8400 }, null).accion).toBe("revisar");
    expect(propuestaHotel({ ...base, packageItems: [{ hotel: "Hotel Paraíso Encantado", habitacion: "Lirios 1 (2)", subtotal: 3600 }] }, null).accion).toBe("nada");
    expect(propuestaHotel({ ...base, confirmationNumber: "HP-M-MHI1A2B3C1" }, null).accion).toBe("nada");
    expect(propuestaHotel({ ...base, notes: "sin hotel" }, null).accion).toBe("nada");
  });

  it("🔴 el paquete toma su hotel del recálculo que da el total cobrado; si no da, a revisar", () => {
    const c = computePaqueteCharge({ slug: "gran-huasteca", personas: 2, pct: 30, fecha: "2026-12-10" })!;
    const paquete: ReservaParaCorregir = {
      ...base, tourSlug: "gran-huasteca", totalAmount: c.total, notes: "Paquete: Gran Huasteca",
      packageItems: [{ hotel: "Hotel Paraíso Encantado", habitacion: "Vista a la selva", noches: 3, habitaciones: 1, checkin: "2026-12-10", checkout: "2026-12-13" }],
    };
    const meta = { tourSlug: "gran-huasteca", adults: "2", childrenMid: "0", childrenSmall: "0", habitacion: "Vista a la selva", nocheExtra: "no", paquetePct: "30", tourDate: "2026-12-10", totalCompleto: String(c.total) };
    const p = propuestaHotel(paquete, meta);
    expect(p).toMatchObject({ accion: "corregir", fuente: "stripe", importe: c.importeHotel });
    expect(propuestaHotel(paquete, { ...meta, totalCompleto: String(c.total - 1) }).accion).toBe("revisar");
    expect(propuestaHotel(paquete, null).accion).toBe("revisar");
  });
});
