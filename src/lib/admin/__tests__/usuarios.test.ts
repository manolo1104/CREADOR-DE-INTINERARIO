import { describe, expect, it } from "vitest";
import {
  GRUPOS_MENU, PESTANAS, SECCIONES_POR_ROL, primeraPagina, puedeHacer, rolDesdeToken, seccionRestringida, seccionesValidas,
} from "../usuarios";

describe("menú por áreas (rediseño, 3 nov 2026)", () => {
  it("los grupos van en el orden del prompt y cada pestaña tiene página propia", () => {
    // 4 nov 2026: por frente de medición del plan As Is / To Be.
    expect(GRUPOS_MENU).toEqual(["Hoy", "Demanda", "Comercial", "Operación", "Producto y precio", "Servicio", "Dinero", "Agente", "Control"]);
    const paginas = PESTANAS.map(p => p.pagina);
    expect(new Set(paginas).size).toBe(paginas.length);
    expect(new Set(PESTANAS.map(p => p.seccion)).size).toBe(PESTANAS.length);
  });
  it("las secciones nuevas llevan la marca «Nuevo»; las de siempre no", () => {
    const nuevas = PESTANAS.filter(p => p.nueva).map(p => p.seccion);
    expect(nuevas).toEqual(["metas", "demanda", "bandeja", "leads", "seguimientos", "score", "embudo", "salidas-dia", "rutas", "proveedores", "ocupacion", "portafolio", "precios", "experiencia", "rentabilidad", "agente"]);
  });
  it("las pestañas de indicadores: el socio ve todas; operación solo Experiencia; el guía ninguna", () => {
    const kpis = ["metas", "demanda", "embudo", "ocupacion", "portafolio", "precios", "experiencia"] as const;
    expect(SECCIONES_POR_ROL.socio).toEqual(expect.arrayContaining([...kpis]));
    expect(SECCIONES_POR_ROL.operacion.filter(s => (kpis as readonly string[]).includes(s))).toEqual(["experiencia"]);
    expect(SECCIONES_POR_ROL.guia.filter(s => (kpis as readonly string[]).includes(s))).toEqual([]);
  });
  it("las pestañas de indicadores no son portada: el socio y operación siguen entrando a la Bandeja", () => {
    expect(primeraPagina(seccionesValidas("socio", undefined))).toBe("/admin/bandeja");
    expect(primeraPagina(seccionesValidas("operacion", undefined))).toBe("/admin/bandeja");
    expect(primeraPagina(["metas"])).toBe("/admin/metas");
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
  it("el guía ve solo sus salidas del día, y no toca dinero", () => {
    expect(seccionesValidas("guia", undefined)).toEqual(["salidas-dia"]);
    expect(primeraPagina(seccionesValidas("guia", undefined))).toBe("/admin/salidas-dia");
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
