// Lote 2 de la auditoría (5 nov 2026): el lead se mueve con los hechos.
// Las reglas puras que usan el CRM y la Bandeja; lo que toca la base se prueba
// aparte, contra la base local (auditoria/e2e/lote2-leads.ts).
import { describe, expect, it } from "vitest";
import {
  avisoLeadExistente, canalTrasReserva, cerradoHaceMenosDe, completarLead, enLista, etapaPorHechos, fechasDelViaje,
  leadVacio, loQueMandaLaCotizacion, montoPorHechos, viajeYaPaso, type DatosCaptura,
} from "../crm";
import { cotizacionViva } from "../resumenLead";
import { completarOrigenWeb, esTextoDelSitio, reintentoQueRevisaLead, salienteMarcaLeido, textoDeOrigen } from "../bandeja";
import { HECHA_POR_REGLA, tituloConsultaNueva, yaNoAplica } from "../automatizaciones";
import { refDelTexto } from "@/lib/refWhatsapp";

const HOY = "2026-11-05";
const r = (cobrado: number, total: number, ultimoDia: string | null = "2026-11-20") => ({ cobrado, total, ultimoDia });

describe("la etapa que dicen las reservas vivas (etapaPorHechos)", () => {
  it("pago web de alguien en Cotizado: pasa a Anticipo pagado (cobros#2, crm#1, reservas#7)", () => {
    expect(etapaPorHechos({ etapa: "cotizado", reservas: [r(1500, 5000)], hoy: HOY, revivir: true })).toBe("anticipo");
    expect(etapaPorHechos({ etapa: "nuevo", reservas: [r(5000, 5000)], hoy: HOY, revivir: true })).toBe("confirmado");
    // Antes del dinero solo sube: una reserva sin pago lo deja En seguimiento.
    expect(etapaPorHechos({ etapa: "calificado", reservas: [r(0, 5000)], hoy: HOY, revivir: false })).toBe("seguimiento");
  });
  it("cancelar una de dos reservas recalcula con lo que sigue vivo (reservas#6)", () => {
    // HP-1 liquidada + HP-2 sin pago = Anticipo. Se cancela HP-2: queda solo la liquidada.
    expect(etapaPorHechos({ etapa: "anticipo", reservas: [r(3200, 3200), r(0, 4500)], hoy: HOY, revivir: false })).toBe("anticipo");
    expect(etapaPorHechos({ etapa: "anticipo", reservas: [r(3200, 3200)], hoy: HOY, revivir: false })).toBe("confirmado");
    // Al revés: se cancela la pagada y queda la de $0 → En seguimiento (ya no se opera sola).
    expect(etapaPorHechos({ etapa: "anticipo", reservas: [r(0, 4500)], hoy: HOY, revivir: false })).toBe("seguimiento");
  });
  it("sin reservas vivas el dinero no dice nada: se queda donde está", () => {
    expect(etapaPorHechos({ etapa: "anticipo", reservas: [], hoy: HOY, revivir: true })).toBe("anticipo");
    expect(etapaPorHechos({ etapa: "seguimiento", reservas: [], hoy: HOY, revivir: false })).toBe("seguimiento");
  });
  it("Perdido vuelve solo con un hecho nuevo", () => {
    expect(etapaPorHechos({ etapa: "perdido", reservas: [r(1500, 5000)], hoy: HOY, revivir: true })).toBe("anticipo");
    expect(etapaPorHechos({ etapa: "perdido", reservas: [r(1500, 5000)], hoy: HOY, revivir: false })).toBe("perdido");
  });
  it("Operado vuelve solo con un hecho nuevo Y un viaje que todavía no pasa (crm#6)", () => {
    expect(etapaPorHechos({ etapa: "operado", reservas: [r(1000, 3000, "2026-12-15")], hoy: HOY, revivir: true })).toBe("anticipo");
    // El saldo que se cobra después del viaje no lo saca de Operado.
    expect(etapaPorHechos({ etapa: "operado", reservas: [r(3000, 3000, "2026-11-01")], hoy: HOY, revivir: true })).toBe("operado");
    expect(etapaPorHechos({ etapa: "operado", reservas: [r(1000, 3000, "2026-12-15")], hoy: HOY, revivir: false })).toBe("operado");
  });
});

describe("lo que vale el lead (montoPorHechos)", () => {
  it("la suma de sus reservas vivas", () => {
    expect(montoPorHechos({ reservas: [r(3200, 3200)], cotizacionVigente: 9000, actual: 7700 })).toBe(3200);
  });
  it("sin reservas, su cotización vigente; sin nada, lo que ya tenía", () => {
    expect(montoPorHechos({ reservas: [], cotizacionVigente: 9000, actual: 7700 })).toBe(9000);
    expect(montoPorHechos({ reservas: [], cotizacionVigente: null, actual: 7700 })).toBe(7700);
    expect(montoPorHechos({ reservas: [r(0, 0)], cotizacionVigente: null, actual: 500 })).toBe(500);
  });
});

describe("el canal del lead tras una reserva (canalTrasReserva, crm#9)", () => {
  it("«web» es cómo pagó, no por dónde llegó: no pisa un canal conocido", () => {
    expect(canalTrasReserva("whatsapp_sitio", "web")).toBe("whatsapp_sitio");
    expect(canalTrasReserva("whatsapp", "web")).toBe("whatsapp");
    expect(canalTrasReserva("por_confirmar", "web")).toBe("web");
  });
  it("WhatsApp no le quita el detalle a «WhatsApp del sitio»", () => {
    expect(canalTrasReserva("whatsapp_sitio", "whatsapp")).toBe("whatsapp_sitio");
  });
  it("lo que una persona eligió al capturarla sí manda", () => {
    expect(canalTrasReserva("whatsapp", "telefono")).toBe("telefono");
    expect(canalTrasReserva("web", "whatsapp")).toBe("whatsapp");
    expect(canalTrasReserva("telefono", "por_confirmar")).toBe("telefono");
    expect(canalTrasReserva("telefono", null)).toBe("telefono");
  });
});

describe("lead cerrado hace poco (cerradoHaceMenosDe, crm#4)", () => {
  const ahora = new Date("2026-11-05T18:00:00Z");
  it("menos de 14 días sí; 14 o más, no", () => {
    expect(cerradoHaceMenosDe(new Date("2026-11-02T18:00:00Z"), ahora)).toBe(true);
    expect(cerradoHaceMenosDe(new Date("2026-10-22T18:00:01Z"), ahora)).toBe(true);
    expect(cerradoHaceMenosDe(new Date("2026-10-22T18:00:00Z"), ahora)).toBe(false);
    expect(cerradoHaceMenosDe(null, ahora)).toBe(false);
  });
});

describe("¿ya pasó el viaje? con cotizaciones vivas (fechasDelViaje, crm#6)", () => {
  it("una venta nueva cotizada a futuro no deja operar el lead por la reserva vieja", () => {
    expect(viajeYaPaso(fechasDelViaje(["2026-11-01"], ["2026-11-15"], null), HOY).paso).toBe(false);
    expect(viajeYaPaso(fechasDelViaje(["2026-11-01"], [], null), HOY).paso).toBe(true);
  });
  it("sin reservas ni cotizaciones, la fecha del lead", () => {
    expect(fechasDelViaje([], [], "2026-11-03")).toEqual(["2026-11-03"]);
  });
  it("una cotización viva SIN fecha no le quita al lead su fecha (revisión: nunca pasaba a Operado)", () => {
    expect(fechasDelViaje([], ["", null], "2026-11-03")).toEqual(["2026-11-03"]);
    expect(viajeYaPaso(fechasDelViaje([], [""], "2026-11-03"), HOY).paso).toBe(true);
    expect(fechasDelViaje(["2026-11-01"], ["", "2026-11-15"], "2026-11-03")).toEqual(["2026-11-01", "2026-11-15"]);
  });
});

describe("«Nuevo lead» de alguien con lead abierto (completarLead, crm#5)", () => {
  const vacio: DatosCaptura & { etapa: "nuevo" } = { etapa: "nuevo", tours: [], fechaViaje: null, pax: null, perfil: null, quiereHospedaje: null, monto: null, canal: "whatsapp" };
  const llega: DatosCaptura = { tours: ["expedicion-tamul"], fechaViaje: "2026-11-15", pax: 4, perfil: "familia", quiereHospedaje: true, monto: 6000, canal: "telefono" };
  it("completa lo que falta y aplica Nuevo → Calificado", () => {
    const { data, agregado } = completarLead(vacio, llega);
    expect(data).toEqual({ tours: ["expedicion-tamul"], fechaViaje: "2026-11-15", pax: 4, perfil: "familia", quiereHospedaje: true, monto: 6000, etapa: "calificado" });
    expect(agregado).toEqual(["tours", "fecha del viaje", "personas", "perfil", "hospedaje", "monto estimado"]);
  });
  it("lo que ya tenía no se pisa; la casilla sin marcar no dice «no quiere»", () => {
    const { data, agregado } = completarLead({ ...vacio, etapa: "cotizado", tours: ["puente-de-dios"], fechaViaje: "2026-11-10", pax: 2, monto: 3000 }, { ...llega, quiereHospedaje: false });
    expect(data).toEqual({ perfil: "familia" });
    expect(agregado).toEqual(["perfil"]);
  });
  it("el canal solo se completa si estaba por confirmar", () => {
    expect(completarLead({ ...vacio, canal: "por_confirmar" }, { ...llega, tours: [] }).data.canal).toBe("telefono");
  });
  it("lo que dice la pantalla", () => {
    expect(avisoLeadExistente("Ana", "calificado", ["la nota", "el seguimiento «Mandar cotización»"]))
      .toBe("Ana ya tenía un lead abierto (Calificado): no se creó otro; se le agregó la nota y el seguimiento «Mandar cotización».");
    expect(avisoLeadExistente("Ana", "cotizado", [])).toBe("Ana ya tenía un lead abierto (Cotizado): no se creó otro y no había nada nuevo que agregarle.");
    expect(enLista(["a", "b", "c"])).toBe("a, b y c");
    expect(enLista(["a"])).toBe("a");
  });
});

describe("lo que una cotización puede poner en su lead (loQueMandaLaCotizacion, cotizacion#11)", () => {
  it("con reservas vivas, nada", () => {
    expect(loQueMandaLaCotizacion({ reservasVivas: 1, otrasCotizacionesVivas: 0, sincronizar: true })).toEqual({ monto: "ninguno", pisar: false, llenarVacios: false });
  });
  it("con otra cotización viva, el monto de la vigente y sin pisar fecha ni tours", () => {
    expect(loQueMandaLaCotizacion({ reservasVivas: 0, otrasCotizacionesVivas: 1, sincronizar: true })).toEqual({ monto: "vigente", pisar: false, llenarVacios: true });
  });
  it("al EDITAR la vigente, sus datos sí pasan al lead aunque quede otra viva (revisión: un borrador viejo no vence)", () => {
    expect(loQueMandaLaCotizacion({ reservasVivas: 0, otrasCotizacionesVivas: 1, sincronizar: true, esLaVigente: true })).toEqual({ monto: "vigente", pisar: true, llenarVacios: true });
    // Editar una opción más vieja no pisa; crear o mandar la vigente tampoco (solo llena lo vacío).
    expect(loQueMandaLaCotizacion({ reservasVivas: 0, otrasCotizacionesVivas: 1, sincronizar: true, esLaVigente: false })).toEqual({ monto: "vigente", pisar: false, llenarVacios: true });
    expect(loQueMandaLaCotizacion({ reservasVivas: 0, otrasCotizacionesVivas: 1, sincronizar: false, esLaVigente: true })).toEqual({ monto: "vigente", pisar: false, llenarVacios: true });
    // Con reserva viva, ni la vigente toca nada.
    expect(loQueMandaLaCotizacion({ reservasVivas: 1, otrasCotizacionesVivas: 1, sincronizar: true, esLaVigente: true })).toEqual({ monto: "ninguno", pisar: false, llenarVacios: false });
  });
  it("si es la única, como antes: su total y, al editarla, sus datos", () => {
    expect(loQueMandaLaCotizacion({ reservasVivas: 0, otrasCotizacionesVivas: 0, sincronizar: true })).toEqual({ monto: "esta", pisar: true, llenarVacios: true });
    expect(loQueMandaLaCotizacion({ reservasVivas: 0, otrasCotizacionesVivas: 0, sincronizar: false })).toEqual({ monto: "esta", pisar: false, llenarVacios: true });
  });
});

describe("cotización viva (cotizacionViva)", () => {
  const base = { tourDate: "2026-11-20", lineItems: [{ _meta: true, venceEl: "2026-11-10" }], packageItems: [], createdAt: new Date("2026-11-03T12:00:00Z") };
  it("borrador o enviada sin vencer", () => {
    expect(cotizacionViva({ ...base, status: "borrador" }, HOY)).toBe(true);
    expect(cotizacionViva({ ...base, status: "enviada" }, HOY)).toBe(true);
  });
  it("vencida, aceptada, expirada o archivada, no", () => {
    expect(cotizacionViva({ ...base, status: "enviada" }, "2026-11-11")).toBe(false);
    expect(cotizacionViva({ ...base, status: "aceptada" }, HOY)).toBe(false);
    expect(cotizacionViva({ ...base, status: "expirada" }, HOY)).toBe(false);
    expect(cotizacionViva({ ...base, status: "archivada" }, HOY)).toBe(false);
  });
});

describe("lead vacío para juntarlo (leadVacio, crm#4)", () => {
  it("sin cotizaciones ni reservas y todavía al principio", () => {
    expect(leadVacio({ etapa: "nuevo", cotizaciones: 0, reservas: 0 })).toBe(true);
    expect(leadVacio({ etapa: "calificado", cotizaciones: 0, reservas: 0 })).toBe(true);
    expect(leadVacio({ etapa: "nuevo", cotizaciones: 1, reservas: 0 })).toBe(false);
    expect(leadVacio({ etapa: "seguimiento", cotizaciones: 0, reservas: 0 })).toBe(false);
  });
});

describe("Bandeja: de dónde vino el chat aunque el código llegue en otro mensaje (textoDeOrigen, crm#9)", () => {
  it("gana el mensaje que trae el código, aunque no sea el que dispara el lead", () => {
    expect(textoDeOrigen("somos 4", ['Hola, me interesa el tour "Expedición Tamul" (ref. K7Q2M)', "somos 4"], refDelTexto))
      .toBe('Hola, me interesa el tour "Expedición Tamul" (ref. K7Q2M)');
  });
  it("sin código, el del texto prellenado del sitio; si no, el actual", () => {
    expect(textoDeOrigen("¿precio?", ["Hola, quiero información sobre los tours de la Huasteca."], refDelTexto)).toBe("Hola, quiero información sobre los tours de la Huasteca.");
    expect(textoDeOrigen("¿precio?", ["hola"], refDelTexto)).toBe("¿precio?");
    // «Crear lead» llega sin texto: se lee el chat.
    expect(textoDeOrigen(null, ["hola (ref. ABCDE)"], refDelTexto)).toBe("hola (ref. ABCDE)");
    expect(textoDeOrigen(null, [], refDelTexto)).toBeNull();
  });
  it("texto del sitio", () => {
    expect(esTextoDelSitio("Hola, me interesa el tour Tamul")).toBe(true);
    expect(esTextoDelSitio("hola buenas tardes")).toBe(false);
  });
  it("un lead recién nacido sin código se completa; uno viejo no", () => {
    const ahora = new Date("2026-11-05T18:00:00Z");
    expect(completarOrigenWeb({ creadoPor: "WhatsApp", origenWeb: null, createdAt: new Date("2026-11-05T17:59:50Z") }, ahora)).toBe(true);
    expect(completarOrigenWeb({ creadoPor: "WhatsApp", origenWeb: null, createdAt: new Date("2026-11-04T17:00:00Z") }, ahora)).toBe(false);
    expect(completarOrigenWeb({ creadoPor: "WhatsApp", origenWeb: { ref: "K7Q2M" }, createdAt: ahora }, ahora)).toBe(false);
    expect(completarOrigenWeb({ creadoPor: "Erick", origenWeb: null, createdAt: ahora }, ahora)).toBe(false);
  });
  it("un mensaje repetido revisa el lead solo si es entrante, del cliente y reciente", () => {
    const ahora = new Date("2026-11-05T18:00:00Z");
    expect(reintentoQueRevisaLead({ direccion: "entra", importado: false, fecha: new Date("2026-11-05T17:00:00Z") }, ahora)).toBe(true);
    expect(reintentoQueRevisaLead({ direccion: "sale", importado: false, fecha: new Date("2026-11-05T17:00:00Z") }, ahora)).toBe(false);
    expect(reintentoQueRevisaLead({ direccion: "entra", importado: true, fecha: new Date("2026-11-05T17:00:00Z") }, ahora)).toBe(false);
    expect(reintentoQueRevisaLead({ direccion: "entra", importado: false, fecha: new Date("2026-11-03T17:00:00Z") }, ahora)).toBe(false);
  });
});

describe("Bandeja: un saliente viejo no borra el «no leído» (salienteMarcaLeido, crm#11)", () => {
  it("solo marca leído si es igual o más nuevo que lo último del cliente", () => {
    const entrante = new Date("2026-11-05T16:00:01Z");
    expect(salienteMarcaLeido(new Date("2026-11-05T16:00:00Z"), entrante)).toBe(false);
    expect(salienteMarcaLeido(new Date("2026-11-05T16:00:01Z"), entrante)).toBe(true);
    expect(salienteMarcaLeido(new Date("2026-11-05T16:05:00Z"), entrante)).toBe(true);
    expect(salienteMarcaLeido(new Date("2026-11-05T16:05:00Z"), null)).toBe(true);
  });
});

describe("seguimientos automáticos que ya no aplican (yaNoAplica, crm#7)", () => {
  it("cotización: fuera de Cotizado se cierra", () => {
    expect(yaNoAplica("cotizado-24h", { etapaLead: "anticipo" }, HOY)).toBe(true);
    expect(yaNoAplica("cotizado-24h", { etapaLead: "perdido" }, HOY)).toBe(true);
    expect(yaNoAplica("cotizado-24h", { etapaLead: "cotizado" }, HOY)).toBe(false);
  });
  it("liga: pagada o cancelada se cierra", () => {
    expect(yaNoAplica("liga-24h", { ligaEstado: "pagado" }, HOY)).toBe(true);
    expect(yaNoAplica("liga-24h", { ligaEstado: "cancelado" }, HOY)).toBe(true);
    expect(yaNoAplica("liga-24h", { ligaEstado: null }, HOY)).toBe(true);
    expect(yaNoAplica("liga-24h", { ligaEstado: "activo" }, HOY)).toBe(false);
  });
  it("saldo: cobrado o reserva cancelada se cierra", () => {
    expect(yaNoAplica("saldo-vencido", { saldo: 0 }, HOY)).toBe(true);
    expect(yaNoAplica("saldo-vencido", { saldo: null }, HOY)).toBe(true);
    expect(yaNoAplica("saldo-vencido", { saldo: 500 }, HOY)).toBe(false);
  });
  it("salidas ya pasadas, corte cerrado, lectura hecha, consulta resuelta", () => {
    expect(yaNoAplica("salida-48h", { fechaSalida: "2026-11-04" }, HOY)).toBe(true);
    expect(yaNoAplica("salida-48h", { fechaSalida: HOY }, HOY)).toBe(false);
    expect(yaNoAplica("agrupar-salidas", { fechaSalida: "2026-11-01" }, HOY)).toBe(true);
    expect(yaNoAplica("corte-lunes", { corteCerrado: true }, HOY)).toBe(true);
    expect(yaNoAplica("corte-lunes", { corteCerrado: false }, HOY)).toBe(false);
    expect(yaNoAplica("lectura-google", { lecturaReciente: true }, HOY)).toBe(true);
    expect(yaNoAplica("consulta-nueva", { contactoConLeadAbierto: true }, HOY)).toBe(true);
    expect(yaNoAplica("consulta-nueva", { contactoConLeadAbierto: false }, HOY)).toBe(false);
  });
  it("sin el dato, o si pide que una persona decida, nunca se cierra sola", () => {
    expect(yaNoAplica("cotizado-24h", {}, HOY)).toBe(false);
    expect(yaNoAplica("liga-24h", {}, HOY)).toBe(false);
    expect(yaNoAplica("saldo-vencido", {}, HOY)).toBe(false);
    expect(yaNoAplica("lectura-google", { lecturaReciente: undefined }, HOY)).toBe(false);
    expect(yaNoAplica("liga-pagada", { ligaEstado: "pagado" }, HOY)).toBe(false);
    expect(yaNoAplica(null, {}, HOY)).toBe(false);
  });
  it("quién la cierra y el aviso de consulta nueva", () => {
    expect(HECHA_POR_REGLA).toBe("Regla (ya no aplica)");
    const t = tituloConsultaNueva("Luis Pérez", "Operado");
    expect(t).toContain("Luis Pérez volvió a escribir");
    expect(t.length).toBeLessThanOrEqual(200);
  });
  it("el aviso cuando vuelve por el sitio con su lead Perdido (revisión: antes nacía un lead duplicado)", () => {
    const t = tituloConsultaNueva("Ana López", "Perdido", "web");
    expect(t).toContain("Ana López volvió al sitio");
    expect(t).toContain("si paga en línea, su lead vuelve solo");
    expect(t).not.toContain("WhatsApp");
    expect(t.length).toBeLessThanOrEqual(200);
  });
});
