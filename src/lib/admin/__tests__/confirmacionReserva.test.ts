import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import {
  CONFIRMACION_DESDE, ESTADOS_PENDIENTES, HORAS_DUDA_TRAS_CORTE, PREFIJO_CONFIRMACION,
  claveTareaConfirmacion, confirmacionPendiente, corteMX, correoUsable, creadaCercaDelCorte, diaCortoMX, diaHoraMX, estadoConfirmacion, eventoConfirmacionEnviada,
  leerRenglonConfirmacion, preguntaAntesDeMandar, resumenConfirmacion, sePuedeMandarConfirmacion, textoConfirmacion, ultimoDiaReserva,
  type HechosConfirmacion,
} from "../confirmacionReserva";
import { tituloTareaLigaPagada } from "@/lib/cotizaciones/reglasConversion";

// «Falta mandar la confirmación por correo» en la ficha del lead (19 nov 2026).
// Sin columna nueva: la fuente es el renglón de la bitácora que deja CADA
// camino que manda el correo. Aquí, las reglas; la lectura de la base vive en
// `confirmacionReservaDatos.ts`.

const HOY = "2026-11-21";
// Relativas al corte: al subirlo se le pone el momento del deploy y estas pruebas siguen valiendo.
const DESPUES = new Date(CONFIRMACION_DESDE.getTime() + 60 * 60 * 1000);       // creada después del corte
const ANTES = new Date(CONFIRMACION_DESDE.getTime() - 10 * 24 * 60 * 60 * 1000); // creada antes del corte
// «20 nov», o «20 nov a las 15:00» cuando el corte sea la hora del deploy.
const CORTE = corteMX();

const h = (x: Partial<HechosConfirmacion> = {}): HechosConfirmacion => ({
  status: "pending", cobrado: 1200, customerEmail: "ana@correo.com", createdAt: DESPUES, ultimoDia: "2026-11-28", enviadaEn: null,
  ...x,
});

describe("estado de la confirmación (estadoConfirmacion)", () => {
  it("pagó algo, tiene correo y nadie se la mandó: falta", () => {
    expect(estadoConfirmacion(h(), HOY)).toBe("falta");
    // Un anticipo basta: la regla mira el dinero, no la etapa del lead.
    expect(estadoConfirmacion(h({ cobrado: 1 }), HOY)).toBe("falta");
    expect(estadoConfirmacion(h({ status: "paid", cobrado: 4000 }), HOY)).toBe("falta");
  });
  it("con el renglón de la bitácora: enviada", () => {
    expect(estadoConfirmacion(h({ enviadaEn: "2026-11-21T16:00:00Z" }), HOY)).toBe("enviada");
    expect(estadoConfirmacion(h({ enviadaEn: new Date("2026-11-21T16:00:00Z") }), HOY)).toBe("enviada");
  });
  it("sin dinero no hay nada que confirmar todavía: sin-pago (aunque ya se hubiera mandado)", () => {
    expect(estadoConfirmacion(h({ cobrado: 0 }), HOY)).toBe("sin-pago");
    expect(estadoConfirmacion(h({ cobrado: 0, enviadaEn: DESPUES }), HOY)).toBe("sin-pago");
    expect(estadoConfirmacion(h({ cobrado: Number.NaN }), HOY)).toBe("sin-pago");
  });
  it("cancelada o borrador: no-aplica, con dinero o sin él", () => {
    expect(estadoConfirmacion(h({ status: "cancelled" }), HOY)).toBe("no-aplica");
    expect(estadoConfirmacion(h({ status: "borrador", cobrado: 0 }), HOY)).toBe("no-aplica");
  });
  it("el viaje ya pasó: no-aplica; el mismo día del viaje todavía cuenta", () => {
    expect(estadoConfirmacion(h({ ultimoDia: "2026-11-20" }), HOY)).toBe("no-aplica");
    expect(estadoConfirmacion(h({ ultimoDia: HOY }), HOY)).toBe("falta");
    // Sin fecha no se adivina que ya pasó.
    expect(estadoConfirmacion(h({ ultimoDia: null }), HOY)).toBe("falta");
  });
  it("🔴 reservas de antes del corte sin registro: sin-dato, nunca una alarma falsa", () => {
    expect(estadoConfirmacion(h({ createdAt: ANTES }), HOY)).toBe("sin-dato");
    // La fecha también llega como texto (del navegador).
    expect(estadoConfirmacion(h({ createdAt: ANTES.toISOString() }), HOY)).toBe("sin-dato");
    // Antes del corte y sin correo: tampoco se sabe (pudo confirmarse por WhatsApp).
    expect(estadoConfirmacion(h({ createdAt: ANTES, customerEmail: "" }), HOY)).toBe("sin-dato");
    // Pero si el panel sí dejó su renglón, se sabe.
    expect(estadoConfirmacion(h({ createdAt: ANTES, enviadaEn: "2026-11-12T18:00:00Z" }), HOY)).toBe("enviada");
  });
  it("el corte se puede mover (el momento del deploy)", () => {
    expect(estadoConfirmacion(h({ createdAt: ANTES }), HOY, new Date(ANTES.getTime() - 60_000))).toBe("falta");
    expect(estadoConfirmacion(h({ createdAt: DESPUES }), HOY, new Date(DESPUES.getTime() + 60_000))).toBe("sin-dato");
  });
  it("sin un correo que sirva: sin-correo", () => {
    expect(estadoConfirmacion(h({ customerEmail: "" }), HOY)).toBe("sin-correo");
    expect(estadoConfirmacion(h({ customerEmail: null }), HOY)).toBe("sin-correo");
    expect(estadoConfirmacion(h({ customerEmail: "sin arroba" }), HOY)).toBe("sin-correo");
    // El que dejan las reservas recuperadas por el webhook.
    expect(estadoConfirmacion(h({ customerEmail: "pendiente@desconocido" }), HOY)).toBe("sin-correo");
  });
  it("lo que se marca en la ficha: falta y sin-correo", () => {
    expect([...ESTADOS_PENDIENTES]).toEqual(["falta", "sin-correo"]);
    expect(confirmacionPendiente("falta")).toBe(true);
    expect(confirmacionPendiente("sin-correo")).toBe(true);
    for (const e of ["no-aplica", "sin-pago", "enviada", "sin-dato"] as const) expect(confirmacionPendiente(e)).toBe(false);
  });
});

describe("el corte (CONFIRMACION_DESDE)", () => {
  it("es una fecha válida y no anterior al 19 nov 2026, cuando los cinco caminos empezaron a anotar (al subirlo va el momento del deploy)", () => {
    expect(Number.isNaN(CONFIRMACION_DESDE.getTime())).toBe(false);
    expect(CONFIRMACION_DESDE.getTime()).toBeGreaterThanOrEqual(new Date("2026-11-19T00:00:00-06:00").getTime());
  });
});

describe("último día del viaje (ultimoDiaReserva)", () => {
  it("el más tardío de sus renglones y de la cabecera", () => {
    expect(ultimoDiaReserva({
      tourDate: "2026-11-27", tourSlug: "tamul",
      lineItems: [{ _meta: true, locale: "es" }, { tourSlug: "tamul", tourDate: "2026-11-27" }, { tourSlug: "ruta-surrealista", tourDate: "2026-11-29" }],
    })).toBe("2026-11-29");
  });
  it("🔴 el viaje CDMX regresa el domingo: su viernes de salida + 2", () => {
    expect(ultimoDiaReserva({ tourDate: "2026-11-27", tourSlug: "viaje-cdmx-xilitla", lineItems: [{ _meta: true }, { tourSlug: "viaje-cdmx-xilitla", tourDate: "2026-11-27" }] }))
      .toBe("2026-11-29");
  });
  it("sin fechas que sirvan: null", () => {
    expect(ultimoDiaReserva({ tourDate: "", tourSlug: "tamul", lineItems: [{ _meta: true, tourDate: "2026-12-01" }] })).toBeNull();
    expect(ultimoDiaReserva({ tourDate: "por definir", lineItems: null })).toBeNull();
  });
});

describe("correo que sirve (correoUsable)", () => {
  it("la misma regla del envío", () => {
    expect(correoUsable("ana@correo.com")).toBe(true);
    expect(correoUsable("")).toBe(false);
    expect(correoUsable(null)).toBe(false);
    expect(correoUsable(undefined)).toBe(false);
    expect(correoUsable("ana.correo.com")).toBe(false);
    expect(correoUsable("pendiente@desconocido")).toBe(false);
  });
});

describe("el renglón de la bitácora (uno solo para todos los que mandan)", () => {
  it("🔴 es EXACTAMENTE el que ya dejaba el panel: los renglones de antes también cuentan", () => {
    expect(resumenConfirmacion({ folio: "HP-M-A", destinatario: "ana@correo.com", cliente: "Ana López" }))
      .toBe("Correo de confirmación de HP-M-A a ana@correo.com (Ana López)");
    expect(PREFIJO_CONFIRMACION).toBe("Correo de confirmación de ");
  });
  it("evento: envió · reserva · el folio de referencia; sin actor pone a quien tenga la sesión", () => {
    const sistema = { usuario: "sistema", nombre: "Sitio web", rol: "sistema" };
    expect(eventoConfirmacionEnviada({ folio: "HP1", destinatario: "a@b.mx", cliente: "Ana", actor: sistema })).toEqual({
      accion: "envió", entidad: "reserva", referencia: "HP1", resumen: "Correo de confirmación de HP1 a a@b.mx (Ana)", actor: sistema,
    });
    expect("actor" in eventoConfirmacionEnviada({ folio: "HP1", destinatario: "a@b.mx", cliente: "Ana" })).toBe(false);
  });
  it("se lee de vuelta: folio y a quién salió", () => {
    const resumen = resumenConfirmacion({ folio: "HP-M-MUU6NNN9AB", destinatario: "ana@correo.com", cliente: "Ana López" });
    expect(leerRenglonConfirmacion({ referencia: "HP-M-MUU6NNN9AB", resumen })).toEqual({ folio: "HP-M-MUU6NNN9AB", destinatario: "ana@correo.com" });
    // Un nombre con paréntesis no confunde el correo.
    expect(leerRenglonConfirmacion({ referencia: "HP1", resumen: resumenConfirmacion({ folio: "HP1", destinatario: "a@b.mx", cliente: "Ana (mamá de Leo)" }) }))
      .toEqual({ folio: "HP1", destinatario: "a@b.mx" });
  });
  it("el check-in, la reseña o el renglón de otro folio no son una confirmación", () => {
    expect(leerRenglonConfirmacion({ referencia: "HP1", resumen: "Pidió reseña de Google por WhatsApp a Ana (HP1)" })).toBeNull();
    expect(leerRenglonConfirmacion({ referencia: "HP1", resumen: "Check-in de HP1 a a@b.mx" })).toBeNull();
    expect(leerRenglonConfirmacion({ referencia: "HP2", resumen: resumenConfirmacion({ folio: "HP1", destinatario: "a@b.mx", cliente: "Ana" }) })).toBeNull();
  });
  it("la tarea que deja la liga pagada cuando el correo no salió", () => {
    expect(claveTareaConfirmacion("ck123")).toBe("confirmacion-liga:ck123");
  });
});

describe("lo que dice la ficha del lead", () => {
  it("el día en hora de México", () => {
    // 18 nov a las 11 PM de México = 19 nov en UTC.
    expect(diaCortoMX("2026-11-19T05:00:00Z")).toBe("18 nov");
    expect(diaCortoMX(new Date("2026-01-02T18:00:00Z"))).toBe("2 ene");
  });
  it("el día y la hora en hora de México (24 h, como los seguimientos)", () => {
    expect(diaHoraMX("2026-11-20T16:15:00Z")).toBe("20 nov a las 10:15");
    // Medianoche es 00:00, nunca «24:00»; y las 11:30 PM de México ya son otro día en UTC.
    expect(diaHoraMX(new Date("2026-11-20T06:00:00Z"))).toBe("20 nov a las 00:00");
    expect(diaHoraMX("2026-11-21T05:30:00Z")).toBe("20 nov a las 23:30");
    expect(diaHoraMX("2026-11-20T07:15:00Z")).toBe("20 nov a la 01:15");
    expect(diaHoraMX("no es fecha")).toBe("");
  });
  it("el corte: solo el día si fue a medianoche; con la hora si es la del deploy (revisión del 20 nov 2026)", () => {
    expect(corteMX(new Date("2026-11-20T00:00:00-06:00"))).toBe("20 nov");
    // Una reserva del 20 nov a las 9:00 con el corte a las 15:00 no es «de antes del 20 nov».
    expect(corteMX(new Date("2026-11-20T15:00:00-06:00"))).toBe("20 nov a las 15:00");
  });
  it("un renglón por estado; nada cuando no hay nada que decir", () => {
    expect(textoConfirmacion({ estado: "enviada", enviadaEn: "2026-11-18T18:00:00Z", destinatario: "ana@correo.com", correo: "ana@correo.com" }))
      .toBe("Confirmación enviada por correo el 18 nov a ana@correo.com");
    expect(textoConfirmacion({ estado: "falta", enviadaEn: null, destinatario: null })).toBe("Falta mandar la confirmación por correo");
    expect(textoConfirmacion({ estado: "sin-correo", enviadaEn: null, destinatario: null })).toContain("no tiene un correo");
    expect(textoConfirmacion({ estado: "sin-dato", enviadaEn: null, destinatario: null })).toBe(`Confirmación: sin dato (reserva de antes del ${CORTE})`);
    expect(textoConfirmacion({ estado: "sin-pago", enviadaEn: null, destinatario: null })).toBe("");
    expect(textoConfirmacion({ estado: "no-aplica", enviadaEn: "2026-11-18T18:00:00Z", destinatario: "a@b.mx" })).toBe("");
  });
  it("si se corrigió el correo después de mandarla, lo dice", () => {
    expect(textoConfirmacion({ estado: "enviada", enviadaEn: "2026-11-18T18:00:00Z", destinatario: "ana@gmial.com", correo: "ana@gmail.com" }))
      .toBe("Confirmación enviada por correo el 18 nov a ana@gmial.com (su correo ahora es ana@gmail.com)");
    // Mayúsculas o espacios no son otro correo.
    expect(textoConfirmacion({ estado: "enviada", enviadaEn: null, destinatario: "Ana@Correo.com", correo: "ana@correo.com " }))
      .toBe("Confirmación enviada por correo a Ana@Correo.com");
  });
  it("el botón «Mandar confirmación»: con dinero, viaje por delante y un correo que sirva", () => {
    expect(sePuedeMandarConfirmacion({ estado: "falta", correo: "ana@correo.com" })).toBe(true);
    expect(sePuedeMandarConfirmacion({ estado: "enviada", correo: "ana@correo.com" })).toBe(true);
    expect(sePuedeMandarConfirmacion({ estado: "sin-dato", correo: "ana@correo.com" })).toBe(true);
    expect(sePuedeMandarConfirmacion({ estado: "sin-dato", correo: null })).toBe(false);
    for (const e of ["sin-correo", "sin-pago", "no-aplica"] as const) expect(sePuedeMandarConfirmacion({ estado: e, correo: "ana@correo.com" })).toBe(false);
  });
  it("🔴 pregunta antes de mandarla otra vez (le llega al cliente y al equipo en copia)", () => {
    expect(preguntaAntesDeMandar({ estado: "enviada", enviadaEn: "2026-11-18T18:00:00Z", destinatario: "ana@correo.com", correo: "ana@correo.com" }))
      .toBe("Ya se le mandó la confirmación el 18 nov a ana@correo.com. ¿Mandarla otra vez a ana@correo.com?");
    expect(preguntaAntesDeMandar({ estado: "sin-dato", enviadaEn: null, destinatario: null, correo: "ana@correo.com" }))
      .toBe(`Esta reserva es de antes del ${CORTE} y no hay registro de si se le mandó la confirmación. ¿Mandarla a ana@correo.com?`);
    expect(preguntaAntesDeMandar({ estado: "falta", enviadaEn: null, destinatario: null, correo: "ana@correo.com" })).toBeNull();
  });
  it("🔴 «falta» de una reserva creada justo después del corte también pregunta: el servidor viejo pudo mandarla sin anotarla (revisión del 20 nov 2026)", () => {
    const cerca = new Date(CONFIRMACION_DESDE.getTime() + 30 * 60_000);
    const pregunta = preguntaAntesDeMandar({ estado: "falta", enviadaEn: null, destinatario: null, correo: "ana@correo.com", creadaEn: cerca.toISOString() });
    // Dice el día Y la hora, y que pudo salir sin quedar anotada; ya no «puede que ya le haya llegado».
    expect(pregunta).toBe(`Esta reserva se hizo el ${diaHoraMX(cerca)}, justo cuando el panel empezó a anotar las confirmaciones: la suya pudo salir sin quedar anotada. ¿Mandarla a ana@correo.com?`);
    expect(pregunta).toMatch(/ a las? \d\d:\d\d/);
    expect(creadaCercaDelCorte(cerca)).toBe(true);
    expect(creadaCercaDelCorte(CONFIRMACION_DESDE)).toBe(true);
  });
  it("🔴 la duda dura 2 horas, solo el cambio de servidor del deploy: antes eran 48 y CADA reserva nueva preguntaba (revisión del 20 nov 2026)", () => {
    expect(HORAS_DUDA_TRAS_CORTE).toBe(2);
    // Una que el panel acaba de hacer al día siguiente: un solo toque, como siempre.
    const manana = new Date(CONFIRMACION_DESDE.getTime() + 26 * 3_600_000);
    expect(creadaCercaDelCorte(manana)).toBe(false);
    expect(preguntaAntesDeMandar({ estado: "falta", enviadaEn: null, destinatario: null, correo: "ana@correo.com", creadaEn: manana })).toBeNull();
    // Justo al cumplirse las 2 horas ya no pregunta; un minuto antes, sí.
    const limite = new Date(CONFIRMACION_DESDE.getTime() + HORAS_DUDA_TRAS_CORTE * 3_600_000);
    expect(creadaCercaDelCorte(limite)).toBe(false);
    expect(creadaCercaDelCorte(new Date(limite.getTime() - 60_000))).toBe(true);
    // Antes del corte no hay duda: es «sin dato», y esa pregunta es otra.
    expect(creadaCercaDelCorte(ANTES)).toBe(false);
    expect(estadoConfirmacion(h({ createdAt: new Date(CONFIRMACION_DESDE.getTime() - 60_000) }), HOY)).toBe("sin-dato");
  });
});

describe("el seguimiento de la liga pagada ya no pide mandarla dos veces", () => {
  it("si la liga ya mandó la confirmación, no dice «Mándale la confirmación»", () => {
    const t = tituloTareaLigaPagada({ cliente: "Ana López", folio: "HP-M-A", monto: 1500, revisar: [], confirmacionEnviada: true });
    expect(t).toBe("Pagó la liga: Ana López ya tiene la reserva HP-M-A ($1,500). Su confirmación ya le llegó por correo: revisa guía y recogida.");
    expect(t).not.toContain("Mándale la confirmación");
  });
  it("si no salió, sigue pidiéndola como siempre", () => {
    expect(tituloTareaLigaPagada({ cliente: "Ana López", folio: "HP-M-A", monto: 1500, revisar: [], confirmacionEnviada: false }))
      .toBe("Pagó la liga: Ana López ya tiene la reserva HP-M-A ($1,500). Mándale la confirmación y revisa guía y recogida.");
  });
  it("con algo que revisar y el correo ya enviado: no dice «antes de confirmarle»", () => {
    const t = tituloTareaLigaPagada({ cliente: "Ana", folio: "HP-M-A", monto: 1500, revisar: ["TAM 20 nov sin lugar"], confirmacionEnviada: true });
    expect(t).toBe("⚠️ Pagó la liga: Ana ya tiene la reserva HP-M-A ($1,500). Su confirmación ya le llegó por correo, pero revisa: TAM 20 nov sin lugar.");
    const largo = tituloTareaLigaPagada({ cliente: "Ana López", folio: "HP-M-A", monto: 1500, revisar: Array.from({ length: 12 }, (_, i) => `aviso largo número ${i}`), confirmacionEnviada: true });
    expect(largo.length).toBeLessThanOrEqual(200);
  });
});

describe("todos los que mandan la confirmación dejan el MISMO renglón", () => {
  const raiz = fileURLToPath(new URL("../../../", import.meta.url));
  const leer = (p: string) => readFileSync(raiz + p, "utf8");
  // Los cinco caminos que le mandan al cliente su confirmación.
  const QUE_MANDAN = [
    "lib/cotizaciones/convertir.ts",          // botón del panel, liga pagada y /confirma
    "app/api/tours/send-confirmation/route.ts", // checkout del sitio
    "lib/recuperarPago.ts",                    // webhook y conciliación
    "lib/reservaPaquete.ts",                   // paquetes
    "lib/viajeCdmx/confirmar.ts",              // viaje CDMX
  ];
  it.each(QUE_MANDAN)("%s anota el envío con anotarConfirmacionEnviada", (p) => {
    expect(leer(p)).toMatch(/await anotarConfirmacionEnviada\(/);
  });
  it("nadie arma el texto del renglón a mano", () => {
    for (const p of [...QUE_MANDAN, "lib/admin/linksPago.ts", "app/api/admin/reservas/[id]/send-email/route.ts"]) {
      expect(leer(p)).not.toContain("Correo de confirmación de ${");
    }
  });
});
