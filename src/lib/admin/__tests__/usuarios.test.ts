import { describe, expect, it } from "vitest";
import {
  GRUPOS_MENU, PESTANAS, SECCIONES_POR_ROL, primeraPagina, puedeHacer, rolDesdeToken, seccionRestringida, seccionesValidas,
} from "../usuarios";

describe("menú por áreas (rediseño, 3 nov 2026)", () => {
  it("los grupos van en el orden del prompt y cada pestaña tiene página propia", () => {
    expect(GRUPOS_MENU).toEqual(["Hoy", "Comercial", "Operación", "Dinero", "Calidad", "Agente", "Control"]);
    const paginas = PESTANAS.map(p => p.pagina);
    expect(new Set(paginas).size).toBe(paginas.length);
    expect(new Set(PESTANAS.map(p => p.seccion)).size).toBe(PESTANAS.length);
  });
  it("las secciones nuevas llevan la marca «Nuevo»; las de siempre no", () => {
    const nuevas = PESTANAS.filter(p => p.nueva).map(p => p.seccion);
    expect(nuevas).toEqual(["bandeja", "leads", "seguimientos", "salidas-dia", "rutas", "proveedores", "rentabilidad", "score", "agente"]);
  });
});

describe("rutas restringidas", () => {
  it("cada página del menú está cerrada a su sección (Inicio solo exacto)", () => {
    for (const p of PESTANAS) expect(seccionRestringida(p.pagina)).toBe(p.seccion);
    expect(seccionRestringida("/admin/")).toBe("inicio");
    expect(seccionRestringida("/admin/login")).toBeNull();
  });
  it("«/admin/salidas-dia» no es «/admin/salidas» (el viaje CDMX)", () => {
    expect(seccionRestringida("/admin/salidas-dia")).toBe("salidas-dia");
    expect(seccionRestringida("/admin/salidas-dia/2026-11-05")).toBe("salidas-dia");
    expect(seccionRestringida("/admin/salidas/abc")).toBe("salidas");
  });
});

describe("roles", () => {
  it("el guía ve solo sus salidas y el calendario, y no toca dinero", () => {
    expect(seccionesValidas("guia", undefined)).toEqual(["calendario", "salidas-dia"]);
    expect(primeraPagina(seccionesValidas("guia", undefined))).toBe("/admin/calendario");
    expect(puedeHacer("guia", "registrarCobro")).toBe(false);
    expect(rolDesdeToken("guia")).toBe("guia");
  });
  it("operación gana lo comercial; el socio, rutas, proveedores y rentabilidad; el dueño, el agente", () => {
    expect(SECCIONES_POR_ROL.operacion).toEqual(expect.arrayContaining(["bandeja", "leads", "seguimientos", "salidas-dia", "score"]));
    expect(SECCIONES_POR_ROL.operacion).not.toContain("rentabilidad");
    expect(SECCIONES_POR_ROL.socio).toEqual(expect.arrayContaining(["rutas", "proveedores", "rentabilidad", "cortes"]));
    expect(SECCIONES_POR_ROL.socio).not.toContain("agente");
    expect(seccionesValidas("dueno", undefined)).toHaveLength(PESTANAS.length);
  });
  it("nadie fuera del dueño ve Inicio, ni aunque se lo guarden", () => {
    expect(seccionesValidas("operacion", ["inicio", "reservas"])).toEqual(["reservas"]);
    expect(rolDesdeToken("cualquier cosa")).toBe("dueno");
  });
});
