import { describe, expect, it, vi, afterEach } from "vitest";
import { SignJWT } from "jose";
import { readdirSync, statSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import {
  API_GUIA_BASE, APIS_POR_SECCION, PESTANAS, SECCIONES_POR_ROL, administraSalidasCdmx, apiPermitidaAlGuia, decisionApiPanel,
  esDeOficina, seccionRestringida, seccionesValidas, veCostos, type SeccionAdmin,
} from "../usuarios";
import { claveConfigurada, huellaDeClave, sesionVigente } from "../huellaClave";
import { createToken, verifyToken } from "../auth";
import { fechaParaGuia, fechaVisibleAlGuia, reservaParaGuia, salidaParaNavegador, ventanaDelGuia } from "../vistaGuia";
import { conservarCostosExtras, extrasSinCosto, presetsSinCosto, sinCostosDeExtras, type PresetExtra } from "../extras";
import { tituloAgrupar, type SugerenciaAgrupar } from "../agrupar";
import { aplicarAlRegistro } from "../registroSalida";
import { origenWebDeClic, leerOrigenWeb } from "../origenWeb";
import type { SalidaOperativa } from "../salidasDia";
import {
  JS_GUARDA, JS_URL_PRIVADA, datosSinPrivados, tieneParamsPrivados, textoSinPrivados, urlSinPrivados,
} from "@/lib/medicionPrivada";
import { MARCA_EQUIPO, metadataDelEquipo, pagoDelEquipo, visitaDelEquipo } from "@/lib/equipoInterno";
import { actividad, enmascararCorreo, enmascararTexto, logger, nombreParaLog } from "@/lib/logger";

// Lote 8 de la auditoría (10 nov 2026): exposición de datos y permisos. Aquí,
// las reglas puras: el middleware, lo que llega al navegador del guía y de
// Erick, lo que reciben GA4/Clarity/los logs y la huella del guía.

const sesion = (rol: "dueno" | "socio" | "operacion" | "guia", secciones?: SeccionAdmin[]) =>
  ({ rol, secciones: secciones ?? seccionesValidas(rol, undefined) });

describe("middleware: la lista blanca del guía vale SIEMPRE", () => {
  it("sin sesión, 401; el guía con su pestaña de siempre solo llega a sus APIs", () => {
    expect(decisionApiPanel("/api/admin/reservas", null)).toBe(401);
    const g = sesion("guia");
    expect(decisionApiPanel("/api/admin/salidas-dia", g)).toBeNull();
    expect(decisionApiPanel("/api/admin/sesion", g)).toBeNull();
    expect(decisionApiPanel("/api/admin/tareas", g)).toBeNull();
    for (const api of ["/api/admin/reservas", "/api/admin/reservas/abc", "/api/admin/cotizaciones", "/api/admin/leads", "/api/admin/clientes", "/api/admin/evidencia", "/api/admin/salidas"]) {
      expect(decisionApiPanel(api, g)).toBe(403);
    }
  });
  it("🔴 abrirle una pestaña más ya no le quita el candado: con Fotos sigue sin ver reservas", () => {
    // Antes: con cualquier pestaña fuera de «salidas-dia/calendario» el middleware le quitaba la lista blanca.
    const g = sesion("guia", ["salidas-dia", "fotos"]);
    expect(decisionApiPanel("/api/admin/reservas", g)).toBe(403);
    expect(decisionApiPanel("/api/admin/cotizaciones/x/convertir", g)).toBe(403);
    expect(decisionApiPanel("/api/admin/salidas-dia", g)).toBeNull();
  });
  it("con Reseñas gana solo las APIs de Reseñas (pedirla por WhatsApp), no la lista de reservas", () => {
    const g = sesion("guia", ["salidas-dia", "resenas"]);
    expect(decisionApiPanel("/api/admin/resenas/google", g)).toBeNull();
    expect(decisionApiPanel("/api/admin/reservas/abc/resena-whatsapp", g)).toBeNull();
    expect(decisionApiPanel("/api/admin/reservas", g)).toBe(403);
    expect(decisionApiPanel("/api/admin/reservas/abc", g)).toBe(403);
    expect(decisionApiPanel("/api/admin/reservas/abc/cobros", g)).toBe(403);
  });
  it("con Calendario: cerrar días, cobros y check-in de una reserva; no la lista completa", () => {
    const g = sesion("guia", ["salidas-dia", "calendario"]);
    expect(decisionApiPanel("/api/admin/fechas-cerradas", g)).toBeNull();
    expect(decisionApiPanel("/api/admin/reservas/abc/cobros", g)).toBeNull();
    expect(decisionApiPanel("/api/admin/reservas/abc/checkin", g)).toBeNull();
    expect(decisionApiPanel("/api/admin/reservas", g)).toBe(403);
  });
  it("una pestaña que no tiene sigue cerrada aunque su API esté en la lista del guía", () => {
    expect(apiPermitidaAlGuia("/api/admin/kpis", ["ingresos"])).toBe(true);
    expect(decisionApiPanel("/api/admin/kpis", sesion("guia", ["salidas-dia"]))).toBe(403);
  });
});

describe("middleware: nadie de la oficina pierde lo que usa hoy", () => {
  it("Erick (Operación) sigue cotizando, convirtiendo, cobrando y operando", () => {
    const e = sesion("operacion");
    for (const api of [
      "/api/admin/reservas", "/api/admin/reservas/abc", "/api/admin/reservas/abc/cobros", "/api/admin/cotizaciones",
      "/api/admin/cotizaciones/abc/convertir", "/api/admin/cotizaciones/abc/pdf", "/api/admin/codigos-cumple/validar",
      "/api/admin/evidencia/abc", "/api/admin/fechas-cerradas", "/api/admin/salidas", "/api/admin/salidas/acciones",
      "/api/admin/links-pago", "/api/admin/bandeja", "/api/admin/leads/abc", "/api/admin/tareas", "/api/admin/salidas-dia",
      "/api/admin/salidas-dia/confirmaciones", "/api/admin/clientes", "/api/admin/resenas/google", "/api/admin/score",
    ]) expect([api, decisionApiPanel(api, e)]).toEqual([api, null]);
  });
  it("las APIs sueltas ya tienen dueño: cupo de eventos, río y migración solo Inicio; el viaje CDMX su pestaña", () => {
    expect(seccionRestringida("/api/admin/cupo-paquete")).toBe("inicio");
    expect(seccionRestringida("/api/admin/rio-estado")).toBe("inicio");
    expect(seccionRestringida("/api/admin/migrate-images")).toBe("inicio");
    expect(seccionRestringida("/api/admin/fechas-cerradas")).toBe("calendario");
    expect(seccionRestringida("/api/admin/salidas")).toBe("salidas");
    expect(seccionRestringida("/api/admin/salidas/acciones")).toBe("salidas");
    expect(seccionRestringida("/api/admin/salidas-dia")).toBe("salidas-dia");
    expect(seccionRestringida("/api/admin/cotizaciones/x/convertir")).toBe("cotizaciones");
    expect(decisionApiPanel("/api/admin/cupo-paquete", sesion("socio"))).toBe(403);
    expect(decisionApiPanel("/api/admin/rio-estado", sesion("operacion"))).toBe(403);
    expect(decisionApiPanel("/api/admin/cupo-paquete", sesion("dueno"))).toBeNull();
    // Si Manolo le quita a Erick el Viaje CDMX, ya no llega a su API.
    expect(decisionApiPanel("/api/admin/salidas", sesion("operacion", ["reservas"]))).toBe(403);
  });

  // Recorre TODAS las rutas bajo src/app/api/admin y las compara con el mapa de permisos.
  const raiz = fileURLToPath(new URL("../../../app/api/admin", import.meta.url));
  const rutas: string[] = [];
  const recorrer = (dir: string) => {
    for (const n of readdirSync(dir)) {
      const p = join(dir, n);
      if (statSync(p).isDirectory()) recorrer(p);
      else if (n === "route.ts") rutas.push("/api/admin" + dir.slice(raiz.length).replace(/\[[^\]]+\]/g, "x"));
    }
  };
  recorrer(raiz);
  const PUBLICAS = ["/api/admin/login", "/api/admin/logout"];
  // Las que usan varias pestañas a la vez (Reservas, Calendario, Cotizaciones, Viaje CDMX…): las cuida cada handler.
  // + verificar un cobro y los bancos de Banxico (12 nov 2026): el cuadro de cobros de Reservas, Calendario, Cotizaciones, Viaje CDMX y Cobros.
  // + el PDF de verdad de la confirmación y la cotización (27 nov 2026): Reservas y Cotizaciones.
  const COMPARTIDAS = ["/api/admin/reservas", "/api/admin/evidencia", "/api/admin/codigos-cumple", "/api/admin/tareas", "/api/admin/sesion", "/api/admin/cobros", "/api/admin/banxico", "/api/admin/documento"];
  it(`cada una de las ${rutas.length} APIs del panel es pública, de una pestaña o compartida a propósito`, () => {
    expect(rutas.length).toBeGreaterThan(40);
    const sueltas = rutas.filter(r => !PUBLICAS.includes(r) && !seccionRestringida(r) && !COMPARTIDAS.some(c => r === c || r.startsWith(`${c}/`)));
    expect(sueltas).toEqual([]);
  });
  it("y cada una está en el mapa sección → APIs (si Manolo le abre esa pestaña al guía, la usa)", () => {
    const todas = PESTANAS.map(p => p.seccion);
    const fuera = rutas.filter(r => !PUBLICAS.includes(r) && !apiPermitidaAlGuia(r, todas));
    expect(fuera).toEqual([]);
    expect(API_GUIA_BASE).toEqual(["/api/admin/salidas-dia", "/api/admin/sesion", "/api/admin/tareas"]);
    expect(Object.keys(APIS_POR_SECCION).sort()).toEqual([...todas].sort());
  });
});

describe("listas blancas por rol", () => {
  it("oficina = Manolo, Martín y Erick; salidas CDMX = Manolo y Martín; costos = quien tiene el Cotizador", () => {
    expect(esDeOficina("guia")).toBe(false);
    expect(["dueno", "socio", "operacion"].every(r => esDeOficina(r as "dueno"))).toBe(true);
    expect(administraSalidasCdmx("operacion")).toBe(false);
    expect(administraSalidasCdmx("guia")).toBe(false); // antes la API solo frenaba a Operación
    expect(administraSalidasCdmx("socio")).toBe(true);
    expect(veCostos("operacion", SECCIONES_POR_ROL.operacion)).toBe(false);
    expect(veCostos("socio", SECCIONES_POR_ROL.socio)).toBe(true);
    expect(veCostos("operacion", [...SECCIONES_POR_ROL.operacion, "cotizador"])).toBe(true);
    expect(veCostos("guia", ["cotizador"])).toBe(false);
  });
  it("en la salida, asignar guía/estado es de la oficina: un rol desconocido tampoco", () => {
    const c = (rol: string) => ({ tourSlug: "tamul", quien: "X", rol, ahora: new Date("2026-11-10T14:00:00Z"), idNuevo: "n1" });
    expect(aplicarAlRegistro(null, { guia: "Pepe" }, c("otro"))).toMatchObject({ status: 403 });
    expect(aplicarAlRegistro(null, { quitarIncidencia: "i-1" }, c("otro"))).toMatchObject({ status: 403 });
    expect(aplicarAlRegistro(null, { guia: "Pepe" }, c("socio"))).toMatchObject({ data: { guia: "Pepe" } });
  });
});

describe("la cuenta compartida del guía: cambiar su contraseña corta las sesiones", () => {
  const secreto = new TextEncoder().encode("secreto-de-prueba-lote-8");
  it("la huella cambia con la contraseña, no la revela y prefiere el hash", async () => {
    const a = await huellaDeClave(secreto, "clave-1");
    expect(a).toBe(await huellaDeClave(secreto, "clave-1"));
    expect(a).not.toBe(await huellaDeClave(secreto, "clave-2"));
    expect(a).not.toContain("clave");
    const u = { envPassword: "P", envPasswordHash: "H" };
    expect(claveConfigurada(u, { P: "texto", H: "$2a$hash" })).toBe("$2a$hash");
    expect(claveConfigurada(u, { P: "texto" })).toBe("texto");
    expect(claveConfigurada(u, {})).toBe("");
  });
  it("solo al guía se le pide: sin huella o con la de antes, fuera; los demás no cambian", () => {
    expect(sesionVigente("guia", "h1", "h1")).toBe(true);
    expect(sesionVigente("guia", "h1", "h2")).toBe(false);
    expect(sesionVigente("guia", undefined, "h1")).toBe(false);
    expect(sesionVigente("guia", "h1", null)).toBe(false);
    expect(sesionVigente("operacion", undefined, "h1")).toBe(true);
    expect(sesionVigente("dueno", undefined, null)).toBe(true);
  });
  it("de punta a punta: la sesión del guía deja de valer al cambiar ADMIN_PASSWORD_GUIA; la de Erick sigue", async () => {
    const antes = { ...process.env };
    try {
      process.env.ADMIN_JWT_SECRET = "secreto-de-prueba-lote-8";
      process.env.ADMIN_PASSWORD_GUIA = "vieja";
      delete process.env.ADMIN_PASSWORD_HASH_GUIA;
      process.env.ADMIN_PASSWORD_ERICK = "erick-1";
      const guia = { user: "guia", nombre: "Guía", rol: "guia" as const, envPassword: "ADMIN_PASSWORD_GUIA", envPasswordHash: "ADMIN_PASSWORD_HASH_GUIA" };
      const erick = { user: "erick", nombre: "Erick", rol: "operacion" as const, envPassword: "ADMIN_PASSWORD_ERICK", envPasswordHash: "ADMIN_PASSWORD_HASH_ERICK" };
      const tGuia = await createToken(guia, ["salidas-dia"]);
      const tErick = await createToken(erick, ["bandeja"]);
      expect((await verifyToken(tGuia)).user).toBe("guia");
      process.env.ADMIN_PASSWORD_GUIA = "nueva";
      process.env.ADMIN_PASSWORD_ERICK = "erick-2";
      await expect(verifyToken(tGuia)).rejects.toThrow();
      expect((await verifyToken(tErick)).user).toBe("erick");
      // Al volver a entrar con la nueva, vale.
      expect((await verifyToken(await createToken(guia, ["salidas-dia"]))).user).toBe("guia");
    } finally {
      process.env = antes;
    }
  });
  it("revisión (10 nov 2026): al subir, las sesiones YA abiertas de Manolo, Martín y Erick siguen; solo el guía vuelve a entrar una vez", async () => {
    const antes = { ...process.env };
    try {
      process.env.ADMIN_JWT_SECRET = "secreto-de-prueba-lote-8";
      process.env.ADMIN_PASSWORD_GUIA = "la-de-siempre";
      // Firmadas como antes del lote 8: sin huella (y la más vieja, sin rol).
      const vieja = (p: Record<string, unknown>) => new SignJWT({ role: "admin", ...p })
        .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("7d").sign(secreto);
      expect((await verifyToken(await vieja({ user: "manolo", nombre: "Manolo" }))).user).toBe("manolo");
      expect((await verifyToken(await vieja({ user: "martin", rol: "socio", nombre: "Martín", secciones: ["cortes"] }))).user).toBe("martin");
      expect((await verifyToken(await vieja({ user: "erick", rol: "operacion", nombre: "Erick", secciones: ["bandeja"] }))).user).toBe("erick");
      await expect(verifyToken(await vieja({ user: "guia", rol: "guia", nombre: "Guía", secciones: ["salidas-dia"] }))).rejects.toThrow();
    } finally {
      process.env = antes;
    }
  });
});

describe("lo que llega al navegador del guía: de ayer a 7 días y sin dinero", () => {
  const hoy = "2026-11-10";
  it("ventana de ayer a 7 días adelante; una fecha fuera se lleva a la orilla", () => {
    expect(ventanaDelGuia(hoy)).toEqual({ desde: "2026-11-09", hasta: "2026-11-17" });
    expect(fechaVisibleAlGuia("2026-11-09", hoy)).toBe(true);
    expect(fechaVisibleAlGuia("2026-11-17", hoy)).toBe(true);
    expect(fechaVisibleAlGuia("2026-11-08", hoy)).toBe(false);
    expect(fechaVisibleAlGuia("2026-11-18", hoy)).toBe(false);
    expect(fechaParaGuia("2026-10-01", hoy)).toBe("2026-11-09");
    expect(fechaParaGuia("2027-01-01", hoy)).toBe("2026-11-17");
    expect(fechaParaGuia("basura", hoy)).toBe(hoy);
    expect(fechaParaGuia("2026-11-12", hoy)).toBe("2026-11-12");
  });
  const salida = {
    clave: "2026-11-10|tamul", fecha: "2026-11-10", slug: "tamul", codigo: "TAM", nombre: "Tamul", personas: 4, reservas: 2,
    folios: ["A", "B"], clientes: ["Ana", "Beto"], monto: 5800, aMedida: false, tourNombre: "Tamul", cupo: 12, minimo: 3,
    estadoPax: "en-meta", registro: { tipo: "fija", guia: "", vehiculo: "", estado: "programada", notas: "" }, guiaDeReservas: false,
    avisoGuia: null, checklist: [], incidencias: [], conceptos: [{ concepto: "Lancha", monto: 800, tipo: "fijo" }], fuenteCostos: "corte",
    semanaCorte: "2026-11-09", ingresoExtras: 300, numeros: { ingreso: 5800, pax: 4, costoFijo: 800, costoPorPax: 0, costos: 800, margen: 5000, margenPct: 86, parteSocio: 2500, conCostos: true },
    precioPorPax: 1450, protocolo: null,
    pasajeros: [
      { bookingId: "1", folio: "A", cliente: "Ana", personas: 2, canal: "web", pago: "saldo", saldo: 2030, primerDia: "2026-11-10", telefono: "4811234567", hospedaje: null, notas: "", idioma: "es", monto: 2900 },
      { bookingId: "2", folio: "B", cliente: "Beto", personas: 2, canal: "web", pago: "pagado", saldo: 0, primerDia: "2026-11-10", telefono: "", hospedaje: null, notas: "", idioma: "es", monto: 2900 },
      { bookingId: "3", folio: "C", cliente: "Caro", personas: 1, canal: "whatsapp", pago: "saldo-otro-dia", saldo: 900, primerDia: "2026-11-09", telefono: "", hospedaje: null, notas: "", idioma: "es", monto: 900 },
    ],
  } as unknown as SalidaOperativa;
  it("al guía no le llega lo cobrado ni costos; solo el saldo que cobra HOY en sitio", () => {
    const g = salidaParaNavegador(salida, { verDinero: false, esGuia: true });
    expect(g.monto).toBe(0);
    expect(g.conceptos).toEqual([]);
    expect(g.numeros.ingreso).toBe(0);
    expect(g.numeros.margen).toBe(0);
    expect(g.ingresoExtras).toBe(0);
    expect(g.precioPorPax).toBe(0);
    expect(g.fuenteCostos).toBeNull();
    expect(g.pasajeros.map(p => p.monto)).toEqual([0, 0, 0]);
    expect(g.pasajeros.map(p => p.saldo)).toEqual([2030, 0, 0]);
    // Lo de su trabajo se queda: quién, cuántos, teléfono.
    expect(g.pasajeros[0]).toMatchObject({ cliente: "Ana", personas: 2, telefono: "4811234567", pago: "saldo" });
    // Y no se toca el original.
    expect(salida.pasajeros[0].monto).toBe(2900);
  });
  it("a Erick (sin Cotizador) le quita costos y margen, no lo cobrado; a quien ve costos, todo", () => {
    const e = salidaParaNavegador(salida, { verDinero: false, esGuia: false });
    expect(e.conceptos).toEqual([]);
    expect(e.numeros.margen).toBe(0);
    expect(e.pasajeros[0].monto).toBe(2900);
    expect(salidaParaNavegador(salida, { verDinero: true, esGuia: false })).toBe(salida);
  });
  it("la lista de reservas para el guía: sin importes ni contacto", () => {
    const r = reservaParaGuia({ id: "1", confirmationNumber: "HP-1", customerName: "Ana", tourName: "Tamul", tourSlug: "tamul", tourDate: "2026-11-10", adults: 2, children: 0, status: "confirmed", createdAt: "2026-11-01", totalAmount: 5800, depositoPagado: 1740, customerEmail: "ana@x.com", customerPhone: "481" } as never);
    expect(Object.keys(r).sort()).toEqual(["adults", "children", "confirmationNumber", "createdAt", "customerName", "id", "status", "tourDate", "tourName", "tourSlug"]);
  });
});

describe("Erick no ve ni cambia lo que nos cuestan los extras", () => {
  const presets: PresetExtra[] = [
    { concepto: "Comida", detalle: "", precio: 200, costo: 120, porPersona: true },
    { concepto: "Transporte", detalle: "", precio: 3000, costo: 2000, porPersona: false },
  ];
  const guardados = [
    { concepto: "Comida", detalle: "", cantidad: 4, precioUnitario: 200, incluido: false, costoUnitario: 150, subtotal: 800 },
    { concepto: "Comida", detalle: "Día 2", cantidad: 4, precioUnitario: 200, incluido: false, costoUnitario: 130, subtotal: 800 },
  ];
  it("al navegador le llega el precio al cliente, sin el costo", () => {
    const x = extrasSinCosto(guardados) as { costoUnitario: number; precioUnitario: number }[];
    expect(x.map(e => e.costoUnitario)).toEqual([0, 0]);
    expect(x.map(e => e.precioUnitario)).toEqual([200, 200]);
    expect(presetsSinCosto(presets).map(p => [p.precio, p.costo])).toEqual([[200, 0], [3000, 0]]);
    const q = sinCostosDeExtras({ id: "q", totalAmount: 5000, extraItems: guardados });
    expect((q.extraItems as { costoUnitario: number }[])[0].costoUnitario).toBe(0);
    expect(q.totalAmount).toBe(5000);
    const sinExtras: { id: string; extraItems?: unknown } = { id: "sin" };
    expect(sinCostosDeExtras(sinExtras)).toEqual({ id: "sin" });
    expect(extrasSinCosto(null)).toBeNull();
  });
  it("al guardar, cada extra conserva su costo (por concepto y en orden); uno nuevo toma el del Cotizador", () => {
    // Erick cambia el precio de la 2.ª comida y agrega transporte; su navegador manda costo 0 (no lo ve).
    const nuevos = [
      { ...guardados[0], costoUnitario: 0 },
      { ...guardados[1], precioUnitario: 250, costoUnitario: 0 },
      { concepto: "transporte ", detalle: "", cantidad: 1, precioUnitario: 3500, incluido: false, costoUnitario: 999, subtotal: 3500 },
      { concepto: "Hielera", detalle: "", cantidad: 1, precioUnitario: 100, incluido: false, costoUnitario: 50, subtotal: 100 },
    ];
    const r = conservarCostosExtras(nuevos, guardados, presets) as { costoUnitario: number; precioUnitario: number }[];
    expect(r.map(e => e.costoUnitario)).toEqual([150, 130, 2000, 0]);
    expect(r.map(e => e.precioUnitario)).toEqual([200, 250, 3500, 100]);
  });
  it("revisión (10 nov 2026): si borra la 1.ª «Comida», la que queda conserva SU costo, no el de la borrada", () => {
    const soloDia2 = [{ ...guardados[1], costoUnitario: 0 }];
    expect((conservarCostosExtras(soloDia2, guardados, presets) as { costoUnitario: number }[]).map(e => e.costoUnitario)).toEqual([130]);
    // Cambia el detalle de la 1.ª: sin pareja exacta, se queda con la libre del mismo concepto.
    const otroDetalle = [{ ...guardados[0], detalle: "Día 1", costoUnitario: 0 }, { ...guardados[1], costoUnitario: 0 }];
    expect((conservarCostosExtras(otroDetalle, guardados, presets) as { costoUnitario: number }[]).map(e => e.costoUnitario)).toEqual([150, 130]);
    // Sin nada guardado (cotización nueva), el del Cotizador.
    expect((conservarCostosExtras(soloDia2, null, presets) as { costoUnitario: number }[]).map(e => e.costoUnitario)).toEqual([120]);
  });
});

describe("Juntar salidas: el seguimiento no lleva costos", () => {
  it("sin «ahorro ~$X» en el título (lo lee Erick y le llega por correo)", () => {
    const s: SugerenciaAgrupar = {
      slug: "tamul", tour: "Tamul — Cascada", juntas: 4, dias: 1, ahorro: 1200, avisos: [],
      mover: { clave: "a", fecha: "2026-11-15", personas: 2, clientes: ["POZAS 2"], folios: ["X"] },
      hacia: { clave: "b", fecha: "2026-11-14", personas: 2, clientes: ["POZAS 1"] },
    };
    expect(tituloAgrupar(s)).not.toMatch(/ahorro|\$/);
    expect(tituloAgrupar(s)).toContain("4 pax en una sola salida");
  });
});

describe("GA4 y Clarity no reciben correos ni tokens", () => {
  const B = "https://www.huasteca-potosina.com";
  it("la dirección sin los parámetros privados; lo demás se queda", () => {
    expect(urlSinPrivados(`${B}/baja?t=YW5hQHguY29t.abc`)).toBe(`${B}/baja`);
    expect(urlSinPrivados(`${B}/reservar/carrito?agregar=tamul&recuperar=tok123&utm_source=brevo`)).toBe(`${B}/reservar/carrito?agregar=tamul&utm_source=brevo`);
    expect(urlSinPrivados(`${B}/reservar-tour/confirmacion?payment_intent=pi_1&payment_intent_client_secret=pi_1_secret_x&redirect_status=succeeded`))
      .toBe(`${B}/reservar-tour/confirmacion?redirect_status=succeeded`);
    expect(urlSinPrivados(`${B}/tours?utm_source=google`)).toBe(`${B}/tours?utm_source=google`);
    expect(tieneParamsPrivados(`${B}/confirmacion-tour?session_id=cs_1`)).toBe(true);
    expect(tieneParamsPrivados(`${B}/tours`)).toBe(false);
  });
  it("el script del navegador limpia igual que el servidor", () => {
    const limpia = new Function("location", `${JS_URL_PRIVADA}; return [hpLimpia, hpPrivada];`)({ href: `${B}/` }) as [(u: string) => string, (u: string) => boolean];
    for (const u of [`${B}/baja?t=abc`, `${B}/reservar/carrito?recuperar=x&agregar=y`, `${B}/x?payment_intent=1&payment_intent_client_secret=2`, `${B}/tours?utm_source=g`, `${B}/?email=a%40b.com&tel=481`]) {
      expect(limpia[0](u)).toBe(urlSinPrivados(u));
      expect(limpia[1](u)).toBe(tieneParamsPrivados(u));
    }
  });
  // Corre el `GUARDA` con un navegador de mentira: «mide» = pasó la guarda.
  const correr = (pathname: string, o: { host?: string; ls?: Record<string, string>; cookie?: string } = {}) => {
    const ls: Record<string, string> = { ...(o.ls ?? {}) };
    const doc = { cookie: o.cookie ?? "" };
    const localStorage = { getItem: (k: string) => ls[k] ?? null, setItem: (k: string, v: string) => { ls[k] = v; } };
    const r = new Function("location", "localStorage", "document", `${JS_GUARDA}; return "mide";`)({ hostname: o.host ?? "www.huasteca-potosina.com", pathname }, localStorage, doc);
    return { mide: r === "mide", ls, cookie: doc.cookie };
  };
  it("la baja, el check-in y la encuesta no se miden; tampoco localhost", () => {
    expect(correr("/baja").mide).toBe(false);
    expect(correr("/checkin/tok").mide).toBe(false);
    expect(correr("/opina/tok").mide).toBe(false);
    expect(correr("/tours", { host: "localhost" }).mide).toBe(false);
    expect(correr("/tours").mide).toBe(true);
    expect(correr("/bajada-del-rio").mide).toBe(true);
  });
  it("una sola marca del equipo: el panel la pone en los dos lados y cualquiera de los dos basta", () => {
    const panel = correr("/admin/bandeja");
    expect(panel.mide).toBe(false);
    expect(panel.ls[MARCA_EQUIPO]).toBe("1");
    expect(panel.cookie).toContain(`${MARCA_EQUIPO}=1`);
    const conCookie = correr("/tours", { cookie: `otra=1; ${MARCA_EQUIPO}=1` });
    expect(conCookie.mide).toBe(false);
    expect(conCookie.ls[MARCA_EQUIPO]).toBe("1");
    const conLs = correr("/tours", { ls: { [MARCA_EQUIPO]: "1" } });
    expect(conLs.mide).toBe(false);
    expect(conLs.cookie).toContain(`${MARCA_EQUIPO}=1`);
  });
  it("el servidor aplica la misma regla: marca o página del panel; el pago del equipo no va a GA4", () => {
    expect(visitaDelEquipo({ marca: "1", ruta: "/tours" })).toBe(true);
    expect(visitaDelEquipo({ ruta: "/admin/leads" })).toBe(true);
    expect(visitaDelEquipo({ marca: undefined, ruta: "/tours" })).toBe(false);
    expect(metadataDelEquipo(true)).toEqual({ interno: "1" });
    expect(metadataDelEquipo(false)).toEqual({});
    expect(pagoDelEquipo({ interno: "1" })).toBe(true);
    expect(pagoDelEquipo({})).toBe(false);
  });
});

describe("el token de /checkin y /opina no se guarda", () => {
  it("ni en la ruta ni en los datos del evento ni en el origen web del lead", () => {
    expect(textoSinPrivados("/checkin/abc123XYZ")).toBe("/checkin");
    expect(textoSinPrivados("/opina/tok?c=4")).toBe("/opina?c=4");
    expect(textoSinPrivados("/baja?t=xx")).toBe("/baja");
    expect(textoSinPrivados("/r?a=1&t=x&b=2")).toBe("/r?a=1&b=2");
    expect(textoSinPrivados("/r?t=1&token=2")).toBe("/r");
    expect(textoSinPrivados("/tours/tamul")).toBe("/tours/tamul");
    expect(datosSinPrivados({ landing: "/checkin/tok1", n: 3, sub: { url: "https://x.com/opina/tok2" }, l: ["/checkin/t3"] }))
      .toEqual({ landing: "/checkin", n: 3, sub: { url: "https://x.com/opina" }, l: ["/checkin"] });
    const o = origenWebDeClic("K7Q2M", { path: "/tours/tamul", data: { landing: "/checkin/secreto", pagina: "/opina/otro" } });
    expect(o.landing).toBe("/checkin");
    expect(o.pagina).toBe("/tours/tamul");
    expect(leerOrigenWeb({ ref: "K7Q2M", landing: "/opina/llave", pagina: "/checkin/llave" })).toMatchObject({ landing: "/opina", pagina: "/checkin" });
  });
});

describe("los logs no imprimen correo, teléfono ni nombre completo", () => {
  afterEach(() => vi.restoreAllMocks());
  it("correo, teléfono y nombre enmascarados; folios, fechas, ids y montos no", () => {
    expect(enmascararCorreo("juan.perez@gmail.com")).toBe("ju***@gmail.com");
    expect(enmascararTexto("de ana@correo.com.mx y 481 123 4567")).toBe("de an***@correo.com.mx y ***4567");
    expect(enmascararTexto("+52 1 481-123-4567")).toBe("***4567");
    expect(enmascararTexto("5214811234567")).toBe("***4567");
    for (const sano of ["HP-M-MUU6NNN9", "2026-11-10", "pi_3NxY1234567890", "$12,000 de $15,500", "#a1b2c", "2026-11-10 2026-11-12", "1731254400000", "15 ago"]) {
      expect(enmascararTexto(sano)).toBe(sano);
    }
    expect(nombreParaLog("Juan Pérez López")).toBe("Juan P.");
    expect(nombreParaLog("Ana")).toBe("Ana");
    expect(nombreParaLog("  ")).toBe("");
  });
  it("actividad y logger salen ya enmascarados", () => {
    const salida: string[] = [];
    vi.spyOn(console, "log").mockImplementation((m: unknown) => { salida.push(String(m)); });
    actividad("✅  RESERVÓ", "Tamul", nombreParaLog("María López"), "maria@x.com", "4811234567", "HP-M-ABC123");
    logger.error("correo_fallo", { email: "maria@x.com", customerName: "María López", reason: "rechazado maria@x.com" });
    expect(salida[0]).toContain("María L.");
    expect(salida[0]).toContain("ma***@x.com");
    expect(salida[0]).toContain("***4567");
    expect(salida[0]).toContain("HP-M-ABC123");
    expect(salida[0]).not.toContain("maria@x.com");
    expect(salida[1]).not.toContain("maria@x.com");
    expect(salida[1]).not.toContain("López");
    expect(JSON.parse(salida[1])).toMatchObject({ event: "correo_fallo", email: "ma***@x.com", customerName: "María L." });
  });
});
