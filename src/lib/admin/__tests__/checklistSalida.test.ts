import { describe, expect, it } from "vitest";
import { avanceChecklist, checklistDe, limpiarChecklist, paraGuardar } from "../checklistSalida";

describe("checklist antes de salir", () => {
  it("Tamul = base + canoas y desayunos; lo guardado solo marca", () => {
    const items = checklistDe("expedicion-tamul", [{ clave: "canoas", hecho: true, por: "Martín", en: "2026-11-04T10:00:00Z" }]);
    expect(items.map(i => i.clave)).toEqual(["vehiculo", "equipo", "botiquin", "lista-guia", "proveedores", "confirmacion-24h", "rio-clima", "canoas", "desayunos"]);
    expect(items.find(i => i.clave === "canoas")).toMatchObject({ hecho: true, por: "Martín" });
    expect(avanceChecklist(items)).toEqual({ hechos: 1, total: 9 });
  });
  it("los puntos propios de una salida se conservan; la basura no entra", () => {
    const items = checklistDe("gruta-de-xilo", [{ clave: "x-1", texto: "Llevar lámpara extra", hecho: false, propio: true }, { clave: "", texto: "nada" }, 7]);
    expect(items.at(-1)).toMatchObject({ clave: "x-1", texto: "Llevar lámpara extra", propio: true });
    expect(limpiarChecklist("no es lista")).toEqual([]);
  });
  it("paraGuardar deja solo lo marcado y lo propio, sin el texto base", () => {
    const items = checklistDe("expedicion-tamul", []);
    items[0].hecho = true;
    const g = paraGuardar([...items, { clave: "x-2", texto: "Pasar por hielo", hecho: false, propio: true }]);
    expect(g).toEqual([{ clave: "vehiculo", texto: "", hecho: true, por: undefined, en: undefined }, { clave: "x-2", texto: "Pasar por hielo", hecho: false, propio: true }]);
  });
});
