// Lote 6 (10 nov 2026): Operación — salidas, guía, mínimos, checklist.
import { describe, expect, it } from "vitest";
import {
  agruparSalidas, bajoMinimoRentable, diasDeTourDe, diasEnRango, emparejarRegistros, estadoDeSalida, guiaDeSalida,
  minimoDelTour, minimoParaJuntar, numerosDeFicha, numerosDeSalida, pagoEnSalida, resumirSalidas, salidaCancelada,
  salidaYaOperada, type ReservaParaSalidas,
} from "../salidas";
import { sugerenciasDeAgrupar } from "../agrupar";
import { reglaMinimo, tareaSalidaCancelada, yaNoAplica, RESPONSABLE_OPERACION } from "../automatizaciones";
import { aplicarAlRegistro } from "../registroSalida";
import { NO_CUENTAN } from "@/lib/cupoTour";

const RAF = "rafting-rio-tampaon", RAP = "rappel-tamul", TAM = "expedicion-tamul", EDEN = "eden-en-el-jardin", RZR = "rzr-xilitla", OTR = "__personalizado";

const reserva = (folio: string, lineas: Record<string, unknown>[], extra: Partial<ReservaParaSalidas> = {}): ReservaParaSalidas => ({
  confirmationNumber: folio, customerName: folio, tourSlug: String(lineas[0]?.tourSlug ?? ""), tourName: String(lineas[0]?.tourName ?? ""),
  tourDate: String(lineas[0]?.tourDate ?? ""), adults: 0, children: 0, totalAmount: 9000, lineItems: lineas, ...extra,
});

describe("un solo guía por salida", () => {
  it("manda el de la salida; si no tiene, el que comparten sus reservas", () => {
    expect(guiaDeSalida("Ángel", [{ folio: "HP-1", guia: "Ángel" }])).toEqual({ guia: "Ángel", deReservas: false, aviso: null });
    expect(guiaDeSalida(null, [{ folio: "HP-1", guia: "Alex" }, { folio: "HP-2", guia: "alex " }, { folio: "HP-3", guia: null }]))
      .toEqual({ guia: "Alex", deReservas: true, aviso: null });
    expect(guiaDeSalida("", [])).toEqual({ guia: "", deReservas: false, aviso: null });
  });
  it("si las reservas traen guías distintos, no se adivina: se avisa", () => {
    const g = guiaDeSalida(null, [{ folio: "HP-1", guia: "Alex" }, { folio: "HP-2", guia: "Ángel" }]);
    expect(g.guia).toBe("");
    expect(g.aviso).toContain("Alex en HP-1");
    expect(g.aviso).toContain("Ángel en HP-2");
  });
  it("con guía en la salida, avisa la reserva que dice otro", () => {
    const g = guiaDeSalida("Ángel", [{ folio: "HP-1", guia: "Ángel" }, { folio: "HP-2", guia: "Alex" }]);
    expect(g.guia).toBe("Ángel");
    expect(g.aviso).toContain("HP-2 dice Alex");
  });
});

describe("mínimo del tour vs. mínimo de rentabilidad", () => {
  it("el mínimo del tour sale de groupMin; 1–2 o sin dato no cuentan", () => {
    expect(minimoDelTour(RAF)).toBe(5);
    expect(minimoDelTour(RAP)).toBe(4);
    expect(minimoDelTour(TAM)).toBeNull();
    expect(minimoDelTour(EDEN)).toBeNull();
    expect(minimoDelTour("no-existe")).toBeNull();
    expect(minimoParaJuntar(RAF)).toBe(5);
    expect(minimoParaJuntar(TAM)).toBe(3);
  });
  it("un rafting de 4 «no llega al mínimo» (antes salía «En meta»); uno de 2 también, y además cuenta como bajo mínimo rentable", () => {
    expect(estadoDeSalida({ slug: RAF, personas: 4, aMedida: false }, 8)).toBe("no-llega");
    expect(estadoDeSalida({ slug: RAF, personas: 5, aMedida: false }, 8)).toBe("en-meta");
    expect(estadoDeSalida({ slug: RAF, personas: 2, aMedida: false }, 8)).toBe("no-llega");
    expect(bajoMinimoRentable({ slug: RAF, personas: 2, aMedida: false })).toBe(true);
    expect(bajoMinimoRentable({ slug: RAF, personas: 4, aMedida: false })).toBe(false);
    expect(estadoDeSalida({ slug: RAP, personas: 3, aMedida: false }, 10)).toBe("no-llega");
    expect(estadoDeSalida({ slug: TAM, personas: 2, aMedida: false }, 12)).toBe("bajo-minimo");
    expect(estadoDeSalida({ slug: TAM, personas: 3, aMedida: false }, 12)).toBe("en-meta");
  });
  it("regla minimo-7d: a una semana o menos y por debajo → tarea a Operación; no si ya la confirmaron, ni hoy, ni a 8 días", () => {
    const hoy = "2026-11-10";
    const s = (clave: string, fecha: string, personas: number, minimo: number | null, estado = "programada") => ({ clave, fecha, tour: "Rafting en el Tampaón", personas, minimo, estado });
    const ts = reglaMinimo([
      s("A", "2026-11-17", 3, 5), s("B", "2026-11-18", 3, 5), s("C", "2026-11-12", 5, 5), s("D", "2026-11-12", 2, null),
      s("E", "2026-11-13", 3, 5, "confirmada"), s("F", "2026-11-10", 3, 5), s("G", "2026-11-14", 4, 5, "cancelada"),
    ], hoy);
    expect(ts.map(t => t.claveRegla)).toEqual(["minimo-7d:A"]);
    expect(ts[0]).toMatchObject({ responsable: RESPONSABLE_OPERACION, vence: hoy, salidaClave: "A" });
    expect(ts[0].titulo).toContain("3 de 5 mínimo");
  });
  it("se cierra sola si llegó al mínimo, si la confirmaron, si se canceló o si ya pasó", () => {
    const hoy = "2026-11-10";
    expect(yaNoAplica("minimo-7d", { fechaSalida: "2026-11-15", minimoResuelto: true }, hoy)).toBe(true);
    expect(yaNoAplica("minimo-7d", { fechaSalida: "2026-11-15", salidaCancelada: true }, hoy)).toBe(true);
    expect(yaNoAplica("minimo-7d", { fechaSalida: "2026-11-09" }, hoy)).toBe(true);
    expect(yaNoAplica("minimo-7d", { fechaSalida: "2026-11-15", minimoResuelto: false, salidaCancelada: false }, hoy)).toBe(false);
    // Sin poder leer la salida, no se cierra.
    expect(yaNoAplica("minimo-7d", { fechaSalida: "2026-11-15" }, hoy)).toBe(false);
  });
  it("«Juntar salidas» usa el mismo mínimo: dos raftings de 4 y 3 se proponen (antes no, porque los dos pasaban de 3)", () => {
    const s = (clave: string, fecha: string, personas: number, slug = RAF) => ({ clave, fecha, slug, tour: "Rafting en el Tampaón", personas, clientes: [clave], folios: [clave], aMedida: false, tipo: "fija" });
    const o = { hoy: "2026-11-04", cupoDe: () => 8, costoFijoDe: () => 1500 };
    const r = sugerenciasDeAgrupar([s("A", "2026-11-14", 4), s("B", "2026-11-15", 3)], o);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ juntas: 7, mover: { clave: "B" }, hacia: { clave: "A" } });
    // Uno ya en su mínimo y el otro abajo: también, si caben (se mueve el chico); los dos en su mínimo, no.
    expect(sugerenciasDeAgrupar([s("A", "2026-11-14", 5), s("B", "2026-11-15", 3)], o)[0]?.mover.clave).toBe("B");
    expect(sugerenciasDeAgrupar([s("A", "2026-11-14", 5), s("B", "2026-11-15", 4)], o)).toHaveLength(0); // 9 no caben en 8
    expect(sugerenciasDeAgrupar([s("A", "2026-11-14", 5), s("B", "2026-11-15", 5)], { ...o, cupoDe: () => 12 })).toHaveLength(0);
  });
});

describe("el Edén en el Jardín es salida privada", () => {
  it("ni «Bajo mínimo» ni meta, aunque vaya una persona", () => {
    expect(estadoDeSalida({ slug: EDEN, personas: 1, aMedida: false }, 7)).toBe("privada");
    expect(bajoMinimoRentable({ slug: EDEN, personas: 1, aMedida: false })).toBe(false);
    const dias = diasEnRango([reserva("HP-E1", [{ tourSlug: EDEN, tourName: "Edén", tourDate: "2026-11-20", adults: 2, subtotal: 3150 }])], "2026-11-01", "2026-11-30");
    expect(resumirSalidas(dias)).toMatchObject({ regulares: 0, regularesBajoMinimo: 0 });
  });
  it("nunca se propone juntarlo", () => {
    const s = (clave: string, fecha: string) => ({ clave, fecha, slug: EDEN, tour: "El Edén en el Jardín", personas: 2, clientes: [clave], folios: [clave], aMedida: false, tipo: "fija" });
    expect(sugerenciasDeAgrupar([s("A", "2026-11-14"), s("B", "2026-11-15")], { hoy: "2026-11-04", cupoDe: () => 7, costoFijoDe: () => null })).toHaveLength(0);
  });
});

describe("RZR con varios renglones: el grupo y los costos una sola vez", () => {
  it("dos vehículos de un grupo de 4 son un día de tour de 4 (antes 8, o dos salidas de 4)", () => {
    const b = reserva("HP-RZR", [
      { _meta: true, numPersonas: 4 },
      { tourSlug: RZR, tourName: "Recorrido en RZR — Nanacatli · RZR 500", tourDate: "2026-11-15", adults: 0, unidades: 1, subtotal: 1600 },
      { tourSlug: RZR, tourName: "Recorrido en RZR — Nanacatli · Defender", tourDate: "2026-11-15", adults: 0, unidades: 1, subtotal: 2200 },
    ]);
    const dias = diasDeTourDe(b);
    expect(dias).toHaveLength(1);
    expect(dias[0]).toMatchObject({ personas: 4, monto: 3800 });
    const [s] = agruparSalidas(dias);
    expect(s).toMatchObject({ personas: 4, reservas: 1, folios: ["HP-RZR"] });
  });
  it("dos renglones del mismo tour con gente se suman; dos personalizados distintos siguen separados", () => {
    const b = reserva("HP-2", [
      { tourSlug: TAM, tourName: "Tamul", tourDate: "2026-11-15", adults: 2, subtotal: 2800 },
      { tourSlug: TAM, tourName: "Tamul", tourDate: "2026-11-15", adults: 3, subtotal: 4200 },
      { tourSlug: OTR, tourName: "Micos privado", tourDate: "2026-11-16", adults: 2, subtotal: 3000 },
      { tourSlug: OTR, tourName: "Sótano privado", tourDate: "2026-11-16", adults: 2, subtotal: 3000 },
    ]);
    const dias = diasDeTourDe(b);
    expect(dias.map(d => `${d.fecha} ${d.slug} ${d.personas}`)).toEqual([`2026-11-15 ${TAM} 5`, `2026-11-16 ${OTR} 2`, `2026-11-16 ${OTR} 2`]);
  });
});

describe("Salida cancelada y operada", () => {
  it("cancelada no cuenta; operada cuenta como pasada aunque sea hoy", () => {
    expect(salidaCancelada("cancelada")).toBe(true);
    expect(salidaCancelada("programada")).toBe(false);
    expect(salidaYaOperada({ fecha: "2026-11-10", estado: "operada" }, "2026-11-10")).toBe(true);
    expect(salidaYaOperada({ fecha: "2026-11-10", estado: "confirmada" }, "2026-11-10")).toBe(false);
    expect(salidaYaOperada({ fecha: "2026-11-09" }, "2026-11-10")).toBe(true);
  });
  it("la confirmación de 48 h y «Juntar» de una salida cancelada se cierran solas", () => {
    expect(yaNoAplica("salida-48h", { fechaSalida: "2026-11-12", salidaCancelada: true }, "2026-11-10")).toBe(true);
    expect(yaNoAplica("agrupar-salidas", { fechaSalida: "2026-11-12", salidaCancelada: true }, "2026-11-10")).toBe(true);
    expect(yaNoAplica("salida-48h", { fechaSalida: "2026-11-12", salidaCancelada: false }, "2026-11-10")).toBe(false);
  });
  it("cancelarla con reservas activas no frena nada: deja un seguimiento a Operación", () => {
    const t = tareaSalidaCancelada({ clave: "2026-11-15|rafting-rio-tampaon", fecha: "2026-11-15", tour: "Rafting", folios: ["HP-1", "HP-2"] }, "2026-11-10");
    expect(t).toMatchObject({ claveRegla: "salida-cancelada:2026-11-15|rafting-rio-tampaon", responsable: RESPONSABLE_OPERACION, vence: "2026-11-10" });
    expect(t?.titulo).toContain("2 reservas activas (HP-1, HP-2)");
    expect(tareaSalidaCancelada({ clave: "x", fecha: "2026-11-15", tour: "Rafting", folios: [] }, "2026-11-10")).toBeNull();
  });
});

describe("el registro de la salida no se pierde si cambia su clave", () => {
  const reg = (id: string, clave: string, folios?: string[]) => ({ id, clave, fecha: clave.slice(0, 10), tourSlug: clave.split("|")[1], folios });
  const sal = (clave: string, folios: string[]) => ({ clave, fecha: clave.slice(0, 10), slug: clave.split("|")[1], folios });
  it("con su clave, el suyo", () => {
    const m = emparejarRegistros([sal("2026-11-20|__personalizado|micos", ["HP-1"])], [reg("r1", "2026-11-20|__personalizado|micos")]);
    expect(m.get("2026-11-20|__personalizado|micos")?.id).toBe("r1");
  });
  it("se renombró el tour a medida: se reconoce por sus reservas", () => {
    const m = emparejarRegistros(
      [sal("2026-11-20|__personalizado|micos privado", ["HP-1"]), sal("2026-11-20|__personalizado|sotano", ["HP-2"])],
      [reg("r1", "2026-11-20|__personalizado|micos", ["HP-1"]), reg("r2", "2026-11-20|__personalizado|cueva", ["HP-9"])],
    );
    expect(m.get("2026-11-20|__personalizado|micos privado")?.id).toBe("r1");
    // El de otras reservas no se le pega a nadie.
    expect(m.get("2026-11-20|__personalizado|sotano")).toBeUndefined();
  });
  it("los de antes (sin reservas guardadas): solo si no hay duda, uno y uno el mismo día y tour", () => {
    const uno = emparejarRegistros([sal("2026-11-20|rzr-xilitla|rzr nanacatli · defender", ["HP-1"])], [reg("r1", "2026-11-20|rzr-xilitla|rzr nanacatli · rzr 500")]);
    expect(uno.size).toBe(1);
    const dudoso = emparejarRegistros(
      [sal("2026-11-20|__personalizado|a", ["HP-1"]), sal("2026-11-20|__personalizado|b", ["HP-2"])],
      [reg("r1", "2026-11-20|__personalizado|viejo")],
    );
    expect(dudoso.size).toBe(0);
  });
  it("un cambio de fecha NO se lleva el registro (lo marcado era de ese día)", () => {
    const m = emparejarRegistros([sal("2026-11-21|__personalizado|micos", ["HP-1"])], [reg("r1", "2026-11-20|__personalizado|micos", ["HP-1"])]);
    expect(m.size).toBe(0);
  });
});

describe("el saldo se cobra en sitio solo el primer día del viaje", () => {
  it("primer día: cobrar; otro día: no; sin saldo o de OTA: nada que cobrar", () => {
    expect(pagoEnSalida({ saldo: 1500, canal: "whatsapp", fecha: "2026-11-14", primerDia: "2026-11-14" })).toBe("saldo");
    expect(pagoEnSalida({ saldo: 1500, canal: "whatsapp", fecha: "2026-11-15", primerDia: "2026-11-14" })).toBe("saldo-otro-dia");
    expect(pagoEnSalida({ saldo: 0, canal: "whatsapp", fecha: "2026-11-14", primerDia: "2026-11-14" })).toBe("pagado");
    expect(pagoEnSalida({ saldo: 1500, canal: "ota", fecha: "2026-11-14", primerDia: "2026-11-14" })).toBe("ota");
  });
});

describe("la ficha usa los números del servidor", () => {
  it("con costos del corte, «Números de la salida» son los del corte; el Cotizador solo simula", () => {
    const cotizador = [{ concepto: "Guía", monto: 800, tipo: "fijo" as const }, { concepto: "Entradas", monto: 100, tipo: "persona" as const }];
    const delCorte = numerosDeSalida(5600, 4, [{ concepto: "Costos del corte", monto: 3000, tipo: "fijo" }]);
    const f = numerosDeFicha({ numeros: delCorte, conceptos: cotizador, precioPorPax: 1400 });
    expect(f.numeros.costos).toBe(3000);
    expect(f.numeros.margen).toBe(2600);
    expect(f.simulacion[3].costos).toBe(1200); // 4 pax con el Cotizador: 800 + 4 × 100
    expect(f.simulacionConCostos).toBe(true);
  });
});

describe("checklist e incidencias sin pisarse", () => {
  const c = (quien: string, idNuevo = "n1") => ({ tourSlug: TAM, quien, rol: "operacion", ahora: new Date("2026-11-10T14:00:00Z"), idNuevo });
  it("marcar un punto se aplica sobre lo guardado: lo que marcó otro se queda", () => {
    const guardado = [{ clave: "vehiculo", texto: "", hecho: true, por: "Erick", en: "2026-11-10T13:00:00Z" }];
    const r = aplicarAlRegistro({ checklist: guardado }, { marcar: { clave: "botiquin", hecho: true } }, c("Guía"));
    if ("error" in r) throw new Error(r.error);
    const lista = r.data.checklist as { clave: string; hecho: boolean; por?: string }[];
    expect(lista.find(i => i.clave === "vehiculo")).toMatchObject({ hecho: true, por: "Erick" });
    expect(lista.find(i => i.clave === "botiquin")).toMatchObject({ hecho: true, por: "Guía" });
  });
  it("dos puntos propios agregados a la vez no chocan (clave única) y una incidencia nueva no borra la anterior", () => {
    const r1 = aplicarAlRegistro(null, { agregar: "Llevar hielera" }, c("Erick", "a1"));
    if ("error" in r1) throw new Error(r1.error);
    const r2 = aplicarAlRegistro({ checklist: r1.data.checklist }, { agregar: "Llevar cuerda" }, c("Martín", "b2"));
    if ("error" in r2) throw new Error(r2.error);
    expect((r2.data.checklist as { texto: string }[]).filter(i => i.texto).map(i => i.texto)).toEqual(["Llevar hielera", "Llevar cuerda"]);
    const previa = [{ id: "i-1", tipo: "clima", gravedad: "leve", causa: "Llovió", accion: "", por: "Guía", en: "2026-11-10T12:00:00Z" }];
    const r3 = aplicarAlRegistro({ incidencias: previa }, { incidencia: { tipo: "recogida", causa: "Llegó tarde la camioneta" } }, c("Erick", "z9"));
    if ("error" in r3) throw new Error(r3.error);
    expect((r3.data.incidencias as { id: string }[]).map(i => i.id)).toEqual(["i-1", "i-z9"]);
  });
  it("el guía no asigna guía, estado ni tipo, ni quita incidencias", () => {
    const g = { ...c("Guía"), rol: "guia" };
    expect(aplicarAlRegistro(null, { estado: "cancelada" }, g)).toMatchObject({ status: 403 });
    expect(aplicarAlRegistro(null, { quitarIncidencia: "i-1" }, g)).toMatchObject({ status: 403 });
    expect(aplicarAlRegistro(null, { notas: "Río alto" }, g)).toMatchObject({ data: { notas: "Río alto" } });
    expect(aplicarAlRegistro(null, { estado: "rara" }, c("Erick"))).toMatchObject({ status: 400 });
  });
});

describe("los borrador del bot viejo no son ventas", () => {
  it("el mismo criterio que el corte: canceladas y borradores fuera", () => {
    expect(NO_CUENTAN).toEqual(["cancelled", "borrador"]);
  });
});
