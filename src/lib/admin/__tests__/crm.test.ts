import { describe, expect, it } from "vitest";
import {
  agruparTareas, contarMotivos, estadoFecha, etapaPorReglas, etiquetaMotivoPerdida, motivoPerdidaParaGuardar,
  normalizarTelefono, validarCambioEtapa, ETAPAS_PIPELINE, etapaPorCobro, etapaSiguiente, viajeYaPaso,
  COLUMNAS_TABLERO, DIAS_TABLERO_CERRADOS, ETAPAS, ETAPAS_ABIERTAS_BD, ETAPAS_POR_CERRAR, ETAPAS_QUE_SE_OPERAN, clavesEnBD,
  esEtapa, estaAbierta, etapaPorLiga, etiquetaEtapa, normalizarEtapa, ordenEtapa, subirA, type Etapa,
} from "../crm";

describe("teléfonos a E.164", () => {
  it("10 dígitos de México, con o sin 52 / 521 / espacios", () => {
    expect(normalizarTelefono("489 109 0388")).toBe("+524891090388");
    expect(normalizarTelefono("52 489 109 0388")).toBe("+524891090388");
    expect(normalizarTelefono("+521 489 109 0388")).toBe("+524891090388");
    expect(normalizarTelefono("(489) 109-0388")).toBe("+524891090388");
  });
  it("otro país con + se respeta; basura no", () => {
    expect(normalizarTelefono("+1 512 555 0199")).toBe("+15125550199");
    expect(normalizarTelefono("0044 7700 900123")).toBe("+447700900123");
    expect(normalizarTelefono("12345")).toBeNull();
    expect(normalizarTelefono("")).toBeNull();
  });
});

describe("etapas", () => {
  it("las abiertas son 5: «Anticipo pagado» se unió a Confirmado (19 nov 2026)", () => {
    expect(ETAPAS_PIPELINE).toEqual(["nuevo", "calificado", "cotizado", "seguimiento", "confirmado"]);
    expect(ETAPAS.map(e => e.clave)).toEqual(["nuevo", "calificado", "cotizado", "seguimiento", "confirmado", "operado", "perdido"]);
  });
  it("el tablero tiene las 7 columnas completas: las abiertas y al final Operado y Perdido", () => {
    expect(COLUMNAS_TABLERO).toEqual(["nuevo", "calificado", "cotizado", "seguimiento", "confirmado", "operado", "perdido"]);
    expect(DIAS_TABLERO_CERRADOS).toBe(14);
    // Las cerradas son columna, pero NUNCA abiertas (juntar leads, cotización nueva, «¿Consulta nueva?»).
    expect(estaAbierta("operado")).toBe(false);
    expect(estaAbierta("perdido")).toBe(false);
  });
  it("por cerrar = todavía sin dinero; Confirmado (aunque deba saldo) ya no cuenta", () => {
    expect(ETAPAS_POR_CERRAR).toEqual(["nuevo", "calificado", "cotizado", "seguimiento"]);
  });
  it("con tour, fecha y pax, Nuevo sube solo a Calificado; nunca baja ni salta", () => {
    const datos = { tours: ["expedicion-tamul"], fechaViaje: "2026-11-21", pax: 4 };
    expect(etapaPorReglas("nuevo", datos)).toBe("calificado");
    expect(etapaPorReglas("nuevo", { ...datos, pax: null })).toBe("nuevo");
    expect(etapaPorReglas("cotizado", { tours: [], fechaViaje: null, pax: null })).toBe("cotizado");
  });
  it("Perdido exige motivo; «otro» exige detalle", () => {
    expect(validarCambioEtapa("perdido", null)).toEqual({ ok: false, error: "Para marcarlo perdido hay que decir el motivo." });
    expect(validarCambioEtapa("cotizado", null)).toEqual({ ok: true });
    expect(validarCambioEtapa("ganado", null).ok).toBe(false);
    expect(motivoPerdidaParaGuardar("otro", "")).toBeNull();
    expect(motivoPerdidaParaGuardar("precio", "le pareció caro el RZR")).toBe("precio: le pareció caro el RZR");
    expect(etiquetaMotivoPerdida("no-contesto")).toBe("No contestó tras cotizar");
    expect(etiquetaMotivoPerdida("otro: se enfermó")).toBe("Otro: se enfermó");
  });
});

describe("seguimientos", () => {
  it("fechas contra hoy", () => {
    expect(estadoFecha("2026-11-02", "2026-11-03")).toBe("vencido");
    expect(estadoFecha("2026-11-03", "2026-11-03")).toBe("hoy");
    expect(estadoFecha("2026-11-04", "2026-11-03")).toBe("proximo");
    expect(estadoFecha(null, "2026-11-03")).toBe("sin-fecha");
  });
  it("por responsable, quien tiene más vencidas primero; las hechas no cuentan", () => {
    const g = agruparTareas([
      { id: "1", responsable: "Erick", vence: "2026-11-01", estado: "pendiente" },
      { id: "2", responsable: "Erick", vence: "2026-11-03", estado: "pendiente" },
      { id: "3", responsable: "Martín", vence: "2026-11-05", estado: "pendiente" },
      { id: "4", responsable: "Erick", vence: "2026-10-30", estado: "hecha" },
    ], "2026-11-03");
    expect(g.map(x => x.responsable)).toEqual(["Erick", "Martín"]);
    expect(g[0].vencidas.map(t => t.id)).toEqual(["1"]);
    expect(g[0].hoy.map(t => t.id)).toEqual(["2"]);
    expect(g[1].proximas.map(t => t.id)).toEqual(["3"]);
  });
  it("motivos de pérdida del mes, de más a menos", () => {
    expect(contarMotivos(["precio", "no-contesto: 3 días", "precio: caro", null, "basura"])).toEqual([
      { clave: "precio", etiqueta: "Precio", n: 2 }, { clave: "no-contesto", etiqueta: "No contestó tras cotizar", n: 1 },
    ]);
  });
});

describe("recordatorios de seguimiento", () => {
  it("hora válida de 24 h", async () => {
    const { horaValida } = await import("../crm");
    expect(horaValida("9:05")).toBe("09:05");
    expect(horaValida("21:30")).toBe("21:30");
    expect(horaValida("24:00")).toBeNull();
    expect(horaValida("")).toBeNull();
  });
  it("cuándo toca avisar (hora de México, de 8 a 21 h)", async () => {
    const { tocaAvisar } = await import("../crm");
    const t = (vence: string, hora: string | null, extra = {}) => ({ vence, hora, estado: "pendiente", avisadaEn: null, ...extra });
    expect(tocaAvisar(t("2026-11-04", "11:00"), "2026-11-04", "10:50")).toBe(false);
    expect(tocaAvisar(t("2026-11-04", "11:00"), "2026-11-04", "10:56")).toBe(true); // 5 min antes
    expect(tocaAvisar(t("2026-11-04", null), "2026-11-04", "08:00")).toBe(true);    // sin hora: a primera hora
    expect(tocaAvisar(t("2026-11-04", null), "2026-11-04", "07:59")).toBe(false);   // fuera de horario
    expect(tocaAvisar(t("2026-11-02", "18:00"), "2026-11-04", "09:00")).toBe(true); // vencida
    expect(tocaAvisar(t("2026-11-05", null), "2026-11-04", "12:00")).toBe(false);   // mañana
    expect(tocaAvisar(t("2026-11-04", null, { avisadaEn: new Date() }), "2026-11-04", "12:00")).toBe(false);
    expect(tocaAvisar(t("2026-11-04", null, { estado: "hecha" }), "2026-11-04", "12:00")).toBe(false);
  });
  it("hora de México de un instante", async () => {
    const { ahoraMX } = await import("../crm");
    expect(ahoraMX(new Date("2026-11-04T17:30:00Z"))).toEqual({ hoy: "2026-11-04", hhmm: "11:30" });
    expect(ahoraMX(new Date("2026-11-05T03:10:00Z"))).toEqual({ hoy: "2026-11-04", hhmm: "21:10" });
  });
  it("el orden pone la hora: sin hora al final del día", async () => {
    const { ordenTareas } = await import("../crm");
    const ts = [{ id: "a", responsable: "E", estado: "pendiente", vence: "2026-11-04", hora: null }, { id: "b", responsable: "E", estado: "pendiente", vence: "2026-11-04", hora: "16:00" }, { id: "c", responsable: "E", estado: "pendiente", vence: "2026-11-04", hora: "09:30" }];
    expect([...ts].sort(ordenTareas).map(t => t.id)).toEqual(["c", "b", "a"]);
  });
});

describe("etapa por lo cobrado y la siguiente", () => {
  it("sin cobro En seguimiento; con CUALQUIER cobro (anticipo o todo) Confirmado (19 nov 2026)", () => {
    expect(etapaPorCobro(0, 4800)).toBe("seguimiento");
    expect(etapaPorCobro(-50, 4800)).toBe("seguimiento");
    expect(etapaPorCobro(1440, 4800)).toBe("confirmado");
    expect(etapaPorCobro(4800, 4800)).toBe("confirmado");
    expect(etapaPorCobro(5000, 4800)).toBe("confirmado");
    // Una transferencia o efectivo sin total capturado también confirma.
    expect(etapaPorCobro(500, 0)).toBe("confirmado");
  });
  it("la siguiente sigue el camino y para en Operado", () => {
    expect(etapaSiguiente("calificado")).toBe("cotizado");
    expect(etapaSiguiente("seguimiento")).toBe("confirmado");
    expect(etapaSiguiente("confirmado")).toBe("operado");
    // La clave vieja es Confirmado: lo que sigue es Operado.
    expect(etapaSiguiente("anticipo")).toBe("operado");
    expect(etapaSiguiente("operado")).toBeNull();
    expect(etapaSiguiente("perdido")).toBeNull();
  });
  it("la liga de pago: pagada → Confirmado; creada a mano → En seguimiento; la del correo de la cotización → Cotizado", () => {
    expect(etapaPorLiga("pagada", false)).toBe("confirmado");
    expect(etapaPorLiga("pagada", true)).toBe("confirmado");
    expect(etapaPorLiga("creada", false)).toBe("seguimiento");
    expect(etapaPorLiga("creada", true)).toBe("cotizado");
  });
});

describe("la clave vieja «anticipo» se lee como Confirmado (19 nov 2026)", () => {
  const ANTICIPO = "anticipo" as string as Etapa; // así puede venir de la base
  it("normalizarEtapa: la vieja → confirmado; las demás, igual (también las desconocidas)", () => {
    expect(normalizarEtapa("anticipo")).toBe("confirmado");
    for (const e of ETAPAS) expect(normalizarEtapa(e.clave)).toBe(e.clave);
    expect(normalizarEtapa("ganado")).toBe("ganado");
    // Ni «constructor» ni «toString» (llaves del objeto) se cuelan como etapa.
    expect(normalizarEtapa("constructor")).toBe("constructor");
    expect(normalizarEtapa("toString")).toBe("toString");
  });
  it("se ve como Confirmado, va donde Confirmado y sigue abierta", () => {
    expect(etiquetaEtapa("anticipo")).toBe("Confirmado");
    expect(etiquetaEtapa("seguimiento")).toBe("En seguimiento");
    expect(etiquetaEtapa("raro")).toBe("raro");
    expect(ordenEtapa("anticipo")).toBe(ordenEtapa("confirmado"));
    expect(ordenEtapa("anticipo")).toBeGreaterThan(ordenEtapa("seguimiento"));
    // Si se leyera como cerrada, al recalcular se juntaban (y borraban) otros leads del contacto.
    expect(estaAbierta("anticipo")).toBe(true);
  });
  it("🔴 una liga nueva (En seguimiento) ya no BAJA a un lead guardado en «anticipo»; Operado sí lo sube", () => {
    expect(subirA(ANTICIPO, "seguimiento")).toBe("anticipo"); // se queda tal cual: no se reescribe nada
    expect(subirA(ANTICIPO, "cotizado")).toBe("anticipo");
    expect(subirA(ANTICIPO, "confirmado")).toBe("anticipo");
    expect(subirA(ANTICIPO, "operado")).toBe("operado");
    expect(subirA("cotizado", "confirmado")).toBe("confirmado");
    expect(subirA("perdido", "confirmado")).toBe("perdido");
  });
  it("ya no se puede mover a «anticipo» a mano", () => {
    expect(esEtapa("anticipo")).toBe(false);
    expect(validarCambioEtapa("anticipo", null)).toEqual({ ok: false, error: "Esa etapa no existe." });
    expect(validarCambioEtapa("confirmado", null)).toEqual({ ok: true });
  });
  it("los filtros de la base la siguen trayendo (abiertos y los que se operan solos)", () => {
    expect(clavesEnBD("confirmado")).toEqual(["confirmado", "anticipo"]);
    expect(clavesEnBD("cotizado")).toEqual(["cotizado"]);
    expect(ETAPAS_ABIERTAS_BD).toEqual(["nuevo", "calificado", "cotizado", "seguimiento", "confirmado", "anticipo"]);
    expect(ETAPAS_QUE_SE_OPERAN).toEqual(["confirmado", "anticipo"]);
    // Por cerrar NO la trae: un lead que pagó el anticipo ya es Confirmado.
    expect(ETAPAS_POR_CERRAR).not.toContain("anticipo");
  });
});

import { COTIZACION_QUE_SALIO, ENVIO_SE_GUARDA_DESDE_FECHA, cotizacionSalio } from "../crm";
describe("¿la cotización salió al cliente? (revisión del 20 nov 2026)", () => {
  const antes = new Date(ENVIO_SE_GUARDA_DESDE_FECHA.getTime() - 5 * 86_400_000);
  const despues = new Date(ENVIO_SE_GUARDA_DESDE_FECHA.getTime() + 6 * 3_600_000);
  it("producción guarda la fecha de envío desde el 19 nov (el lote 9 se subió el 18 en la noche)", () => {
    expect(ENVIO_SE_GUARDA_DESDE_FECHA.toISOString()).toBe("2026-11-19T06:00:00.000Z");
  });
  it("con fecha de envío, salió (aunque siga en borrador: bajaron su PDF)", () => {
    expect(cotizacionSalio({ enviadaEn: despues, status: "borrador", createdAt: despues })).toBe(true);
  });
  it("🔴 un borrador nuevo que nadie mandó y se marcó vencido (o el del bot que se reemplazó) NO salió", () => {
    expect(cotizacionSalio({ enviadaEn: null, status: "expirada", createdAt: despues })).toBe(false);
    expect(cotizacionSalio({ enviadaEn: null, status: "aceptada", createdAt: despues })).toBe(false);
    expect(cotizacionSalio({ enviadaEn: null, status: "borrador", createdAt: despues })).toBe(false);
  });
  it("las de antes sin fecha guardada: salió si quedó enviada, aceptada o vencida", () => {
    for (const status of ["enviada", "aceptada", "expirada"]) expect(cotizacionSalio({ enviadaEn: null, status, createdAt: antes })).toBe(true);
    expect(cotizacionSalio({ enviadaEn: null, status: "borrador", createdAt: antes })).toBe(false);
    expect(cotizacionSalio({ enviadaEn: null, status: "archivada", createdAt: antes })).toBe(false);
  });
  it("el filtro de Prisma dice lo mismo: el estado solo cuenta para las creadas antes del corte y sin fecha", () => {
    expect(COTIZACION_QUE_SALIO.OR).toEqual([
      { enviadaEn: { not: null } },
      { enviadaEn: null, status: { in: ["enviada", "aceptada", "expirada"] }, createdAt: { lt: ENVIO_SE_GUARDA_DESDE_FECHA } },
    ]);
  });
});

describe("viaje ya pasado → Operado", () => {
  it("al día siguiente del ÚLTIMO tour, no el mismo día", () => {
    expect(viajeYaPaso(["2026-11-03"], "2026-11-03")).toEqual({ paso: false, ultima: "2026-11-03" });
    expect(viajeYaPaso(["2026-11-03"], "2026-11-04")).toEqual({ paso: true, ultima: "2026-11-03" });
    expect(viajeYaPaso(["2026-11-02", "2026-11-05"], "2026-11-04").paso).toBe(false);
  });
  it("el caso de Manolo: tour el sábado 21 → el domingo 22 (desde las 00:00 de México) ya pasó; el sábado todavía no", () => {
    expect(viajeYaPaso(["2026-11-21"], "2026-11-22")).toEqual({ paso: true, ultima: "2026-11-21" });
    expect(viajeYaPaso(["2026-11-21"], "2026-11-21").paso).toBe(false);
  });
  it("sin fecha válida no se mueve", () => {
    expect(viajeYaPaso([null, "", "por definir"], "2026-11-04")).toEqual({ paso: false, ultima: null });
  });
});

import { agruparPorPlazo } from "../crm";
describe("seguimientos por plazo", () => {
  it("vencidos (lo más viejo arriba), hoy por hora, mañana, esta semana y más adelante; sin las hechas", () => {
    const t = (id: string, vence: string, hora: string | null = null, estado = "pendiente") => ({ id, responsable: "Erick", vence, hora, estado });
    const g = agruparPorPlazo([
      t("a", "2026-11-10"), t("b", "2026-11-04", "16:00"), t("c", "2026-11-02"), t("d", "2026-11-04", "09:00"),
      t("e", "2026-11-05"), t("f", "2026-11-30"), t("g", "2026-11-01"), t("h", "2026-11-04", null, "hecha"),
    ], "2026-11-04");
    expect(g.map(x => [x.clave, x.tareas.map(y => y.id).join("")])).toEqual([
      ["vencidos", "gc"], ["hoy", "db"], ["manana", "e"], ["semana", "a"], ["despues", "f"],
    ]);
  });
});

import { pasaAConfirmado, seguimientosQueCierraElPago } from "../crm";
describe("al pagar se cierran los seguimientos vencidos que puso una persona (revisión del 20 nov 2026)", () => {
  const HOY = "2026-11-20";
  // El caso de la revisión: pagó y quedó Confirmado con su «Escribirle…» del lun 16 pendiente.
  const tareas = [
    { id: "escribirle", estado: "pendiente", regla: null, vence: "2026-11-16" },
    { id: "ayer", estado: "pendiente", regla: null, vence: "2026-11-19" },
    { id: "hoy", estado: "pendiente", regla: null, vence: HOY },
    { id: "viernes", estado: "pendiente", regla: null, vence: "2026-11-27" },
    { id: "saldo", estado: "pendiente", regla: "saldo-vencido", vence: "2026-11-10" },
    { id: "liga", estado: "pendiente", regla: "liga-24h", vence: "2026-11-15" },
    { id: "salida", estado: "pendiente", regla: "salida-48h", vence: "2026-11-18" },
    { id: "confirmacion", estado: "pendiente", regla: "liga-pagada", vence: "2026-11-17" },
    { id: "urgente", estado: "pendiente", regla: "agente-urgente", vence: "2026-11-12" },
    { id: "hecha", estado: "hecha", regla: null, vence: "2026-11-14" },
  ];
  const ids = (anterior: string, nueva: string) => seguimientosQueCierraElPago(anterior, nueva, tareas, HOY).map(t => t.id);
  it("de una etapa sin dinero a Confirmado: solo las vencidas sin regla", () => {
    for (const antes of ["nuevo", "calificado", "cotizado", "seguimiento"]) {
      expect(pasaAConfirmado(antes, "confirmado")).toBe(true);
      expect(ids(antes, "confirmado")).toEqual(["escribirle", "ayer"]);
    }
  });
  it("lo de hoy en adelante y las de las reglas (saldo, liga, salida, la confirmación, el agente) no se tocan", () => {
    const cierra = ids("seguimiento", "confirmado");
    for (const id of ["hoy", "viernes", "saldo", "liga", "salida", "confirmacion", "urgente", "hecha"]) expect(cierra).not.toContain(id);
  });
  it("Confirmado → Operado no cierra nada (ya había pagado)", () => {
    expect(pasaAConfirmado("confirmado", "operado")).toBe(false);
    expect(ids("confirmado", "operado")).toEqual([]);
  });
  it("la clave vieja «anticipo» → Confirmado no cierra nada: ya era Confirmado", () => {
    expect(pasaAConfirmado("anticipo", "confirmado")).toBe(false);
    expect(ids("anticipo", "confirmado")).toEqual([]);
    // Y si alguna vez llegara escrita como «anticipo», cuenta como Confirmado.
    expect(pasaAConfirmado("cotizado", "anticipo")).toBe(true);
  });
  it("uno que se daba por perdido y pagó su liga también cierra sus pendientes de venta", () => {
    expect(pasaAConfirmado("perdido", "confirmado")).toBe(true);
    expect(ids("perdido", "confirmado")).toEqual(["escribirle", "ayer"]);
  });
  it("otros cambios no cierran nada: subir sin pagar, Operado que vuelve (otro viaje), o perderlo", () => {
    expect(ids("cotizado", "seguimiento")).toEqual([]);
    expect(ids("operado", "confirmado")).toEqual([]);
    expect(ids("seguimiento", "perdido")).toEqual([]);
    expect(ids("confirmado", "confirmado")).toEqual([]);
  });
  it("una fecha que no sirve no se toma por vencida", () => {
    expect(seguimientosQueCierraElPago("cotizado", "confirmado", [{ id: "x", estado: "pendiente", regla: null, vence: "" }], HOY)).toEqual([]);
  });
});
