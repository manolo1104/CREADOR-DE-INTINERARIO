import { describe, expect, it } from "vitest";
import { avanceRuta, limpiarParadas, limpiarProveedor, limpiarRuta } from "../rutas";

describe("rutas y protocolos", () => {
  it("paradas: hora válida o vacía, sin lugar se descarta, en su orden", () => {
    expect(limpiarParadas([{ hora: "8:00", lugar: "Encuentro", detalle: "Lobby" }, { hora: "25:00", lugar: "Tamul" }, { hora: "10:00", lugar: "" }]))
      .toEqual([{ hora: "08:00", lugar: "Encuentro", detalle: "Lobby" }, { hora: "", lugar: "Tamul", detalle: "" }]);
  });
  it("solo guarda proveedores que existen", () => {
    expect(limpiarRuta({ proveedores: ["p1", "inventado", "p1"] }, ["p1", "p2"]).proveedores).toEqual(["p1"]);
  });
  it("el avance dice qué le falta a la ficha", () => {
    expect(avanceRuta(null)).toMatchObject({ hechos: 0, total: 7 });
    const r = avanceRuta({ paradas: [{ hora: "", lugar: "x", detalle: "" }], planB: "río crecido: …", proveedores: [] });
    expect(r.hechos).toBe(2);
    expect(r.falta).toContain("proveedores");
  });
});

describe("proveedores", () => {
  it("pide nombre, valida teléfono y correo, y limpia precios y tours", () => {
    expect(() => limpiarProveedor({ nombre: "" }, [])).toThrow("nombre");
    expect(() => limpiarProveedor({ nombre: "Canoas", telefono: "123" }, [])).toThrow("teléfono");
    expect(() => limpiarProveedor({ nombre: "Canoas", correo: "no-es-correo" }, [])).toThrow("correo");
    const p = limpiarProveedor({ nombre: " Canoas Tamul ", servicio: "canoas", telefono: "481 123 4567", precios: [{ concepto: "Canoa", precio: "350", porPersona: true }, { concepto: "" }], tours: ["tamul", "otro"] }, ["tamul"]);
    expect(p).toMatchObject({ nombre: "Canoas Tamul", servicio: "canoas", telefono: "+524811234567", tours: ["tamul"], activo: true });
    expect(p.precios).toEqual([{ temporada: "Todo el año", concepto: "Canoa", precio: 350, porPersona: true }]);
  });
});
