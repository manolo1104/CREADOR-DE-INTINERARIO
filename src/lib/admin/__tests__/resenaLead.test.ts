import { describe, expect, it } from "vitest";
import { GOOGLE_REVIEW_URL } from "@/lib/reviewRequest";
import {
  CALIFICACION_BAJA, DIAS_DE_UN_VIAJE, RE_RESENA, avisosResena, conPeticionDelPanel, estadoResenaLead, peticionesDelChat,
  preguntaAntesDePedir, reservaViajo, textoPeticion, viajeQueTermino, type MensajeDelChat, type ReservaParaResena,
} from "../resenaLead";
import { addDaysYMD } from "@/lib/dates";
import { avisoAntesDeMover } from "@/app/admin/(dashboard)/leads/etapas";

// «Pedir reseña por WhatsApp» desde la ficha del lead y su tarjeta (19 nov
// 2026, Manolo: «integra un acceso rápido para mandar pedir reseña a wpp»).
// Un clic abre WhatsApp con el mensaje listo; aquí, a qué viaje, con qué
// mensaje y si ya se pidió (correo, botón del panel, bot o celular).

const HOY = "2026-11-23"; // lunes: el viaje fue el fin de semana

const r = (x: Partial<ReservaParaResena> = {}): ReservaParaResena => ({
  id: "b1", folio: "HP-M-AAA111", status: "paid", depositoPagado: 1500, ultimoDia: "2026-11-22", todoCancelado: false,
  tour: "Expedición Tamul", correoEn: null, whatsappEn: null, calificacion: null, telefono: null,
  ...x,
});

const m = (x: Partial<MensajeDelChat> = {}): MensajeDelChat => ({
  fecha: "2026-11-23T16:00:00Z", texto: "Hola", direccion: "sale", estado: "entregado", desde: "app", por: null,
  ...x,
});

const lead = (x: Partial<Parameters<typeof estadoResenaLead>[0]> = {}) => ({
  nombre: "ANA LÓPEZ", telefono: "+524891234567", idioma: "es", reservas: [r()], mensajes: [] as MensajeDelChat[],
  ...x,
});

describe("qué reservas cuentan (las mismas reglas que el correo automático)", () => {
  it("pagada y con su último día antes de hoy: viajó", () => {
    expect(reservaViajo(r(), HOY)).toBe(true);
  });
  it("el viaje que termina HOY todavía no: el lead pasa a Operado mañana a las 00:00", () => {
    expect(reservaViajo(r({ ultimoDia: HOY }), HOY)).toBe(false);
    expect(reservaViajo(r({ ultimoDia: "2026-11-29" }), HOY)).toBe(false);
  });
  it("cancelada o borrador: no", () => {
    expect(reservaViajo(r({ status: "cancelled" }), HOY)).toBe(false);
    expect(reservaViajo(r({ status: "borrador" }), HOY)).toBe(false);
  });
  it("pendiente solo si dejó anticipo (sin él no hay prueba de que viajó)", () => {
    expect(reservaViajo(r({ status: "pending", depositoPagado: 0 }), HOY)).toBe(false);
    expect(reservaViajo(r({ status: "pending", depositoPagado: 500 }), HOY)).toBe(true);
  });
  it("con TODAS sus salidas canceladas no hizo ningún tour: no se le pide", () => {
    expect(reservaViajo(r({ todoCancelado: true }), HOY)).toBe(false);
  });
  it("sin fecha válida: no", () => {
    expect(reservaViajo(r({ ultimoDia: null }), HOY)).toBe(false);
    expect(reservaViajo(r({ ultimoDia: "pronto" }), HOY)).toBe(false);
  });
});

describe("el viaje que acaba de terminar", () => {
  it("dos reservas del mismo fin de semana son un viaje: se anotan las dos", () => {
    const v = viajeQueTermino([r({ id: "sab", ultimoDia: "2026-11-21" }), r({ id: "dom", ultimoDia: "2026-11-22" })], HOY)!;
    expect(v.reservas.map(x => x.id).sort()).toEqual(["dom", "sab"]);
    expect(v).toEqual(expect.objectContaining({ desde: "2026-11-21", hasta: "2026-11-22" }));
  });
  it(`una reserva de más de ${DIAS_DE_UN_VIAJE} días antes es OTRO viaje: no entra`, () => {
    const viejo = addDaysYMD("2026-11-22", -(DIAS_DE_UN_VIAJE + 1));
    const v = viajeQueTermino([r({ id: "viejo", ultimoDia: viejo }), r({ id: "nuevo" })], HOY)!;
    expect(v.reservas.map(x => x.id)).toEqual(["nuevo"]);
  });
  it("lo que no cuenta (cancelada, futura) no mueve el viaje", () => {
    const v = viajeQueTermino([r({ id: "ok" }), r({ id: "futura", ultimoDia: "2026-12-05" }), r({ id: "cancelada", status: "cancelled", ultimoDia: "2026-11-22" })], HOY)!;
    expect(v.reservas.map(x => x.id)).toEqual(["ok"]);
  });
  it("sin ninguna reserva que haya viajado: no hay nada que pedir", () => {
    expect(viajeQueTermino([], HOY)).toBeNull();
    expect(viajeQueTermino([r({ ultimoDia: "2026-12-05" })], HOY)).toBeNull();
    expect(estadoResenaLead(lead({ reservas: [r({ status: "cancelled" })] }), HOY)).toBeNull();
  });
});

describe("el mensaje y el enlace de WhatsApp", () => {
  it("en español: nombre de pila, el tour entre comillas y la liga de Google", () => {
    const e = estadoResenaLead(lead(), HOY)!;
    expect(e.idioma).toBe("es");
    expect(e.mensaje.startsWith("¡Hola Ana!")).toBe(true);
    expect(e.mensaje).toContain("«Expedición Tamul»");
    expect(e.mensaje).toContain(GOOGLE_REVIEW_URL);
    expect(e.waUrl?.startsWith("https://wa.me/524891234567?text=")).toBe(true);
    expect(decodeURIComponent(e.waUrl!.split("?text=")[1])).toBe(e.mensaje);
    expect(e.reservaIds).toEqual(["b1"]);
    expect(e.ultimoDia).toBe("2026-11-22");
  });
  it("en inglés si el contacto es en inglés (el nombre del tour ya llega traducido)", () => {
    const e = estadoResenaLead(lead({ idioma: "en", reservas: [r({ tour: "Tamul Expedition" })] }), HOY)!;
    expect(e.idioma).toBe("en");
    expect(e.mensaje.startsWith("Hi Ana!")).toBe(true);
    expect(e.mensaje).toContain("“Tamul Expedition”");
  });
  it("un viaje con dos tours los nombra a los dos", () => {
    const reservas = [r({ id: "a", tour: "Expedición Tamul", ultimoDia: "2026-11-21" }), r({ id: "b", tour: "Xilitla Surrealista" })];
    expect(estadoResenaLead(lead({ reservas }), HOY)!.mensaje).toContain("«Expedición Tamul y Xilitla Surrealista»");
    expect(estadoResenaLead(lead({ reservas, idioma: "en" }), HOY)!.mensaje).toContain("“Expedición Tamul and Xilitla Surrealista”");
  });
  it("sin teléfono del contacto usa el de la reserva; sin ninguno que sirva, no hay botón (pero sí el estado)", () => {
    expect(estadoResenaLead(lead({ telefono: null, reservas: [r({ telefono: "489 123 4567" })] }), HOY)!.waUrl?.startsWith("https://wa.me/524891234567?")).toBe(true);
    const sin = estadoResenaLead(lead({ telefono: null, reservas: [r({ telefono: "123" })] }), HOY)!;
    expect(sin.waUrl).toBeNull();
    expect(sin.reservaIds).toEqual(["b1"]);
  });
  it("🔴 el mensaje del botón, en los dos idiomas, cuenta en el KPI «Reseña pedida» cuando sale por el número del negocio", () => {
    expect(RE_RESENA.test(estadoResenaLead(lead(), HOY)!.mensaje)).toBe(true);
    expect(RE_RESENA.test(estadoResenaLead(lead({ idioma: "en" }), HOY)!.mensaje)).toBe(true);
  });
});

describe("¿ya se le pidió? (correo, botón del panel, bot o celular)", () => {
  it("nadie la ha pedido", () => {
    const e = estadoResenaLead(lead(), HOY)!;
    expect(e.porWhatsapp).toBeNull();
    expect(e.porCorreo).toBeNull();
    expect(preguntaAntesDePedir(e)).toBeNull();
  });
  it("con el botón de WhatsApp del panel (o el de Reseñas)", () => {
    const e = estadoResenaLead(lead({ reservas: [r({ whatsappEn: "2026-11-22T20:00:00Z" })] }), HOY)!;
    expect(e.porWhatsapp).toEqual({ via: "whatsapp", en: "2026-11-22T20:00:00Z", quien: null });
    expect(textoPeticion(e.porWhatsapp!)).toBe("Reseña pedida por WhatsApp el 22 nov");
  });
  it("un mensaje con la liga que salió del celular o del bot (llegan igual a la Bandeja)", () => {
    const e = estadoResenaLead(lead({ mensajes: [m({ texto: `¿Nos dejas tu reseña? ${GOOGLE_REVIEW_URL}` })] }), HOY)!;
    expect(e.porWhatsapp?.quien).toBe("desde el celular o el bot");
    expect(textoPeticion(e.porWhatsapp!)).toBe("Reseña pedida por WhatsApp el 23 nov · desde el celular o el bot");
  });
  it("uno que se mandó desde el panel dice quién", () => {
    const e = estadoResenaLead(lead({ mensajes: [m({ texto: "¿Nos regalas una reseña en Google?", desde: "panel", por: "Erick" })] }), HOY)!;
    expect(e.porWhatsapp?.quien).toBe("Erick");
  });
  it("solo cuenta lo que SALIÓ desde que terminó el viaje (hora de México)", () => {
    const pide = "¿Nos regalas una reseña en Google?";
    // Sábado 21, 11 p. m. en México (domingo 05:00 UTC): antes del último día (22).
    expect(peticionesDelChat([m({ texto: pide, fecha: "2026-11-22T05:00:00Z" })], "2026-11-22").resena).toBeNull();
    // Domingo 22, 00:30 en México: ya cuenta.
    expect(peticionesDelChat([m({ texto: pide, fecha: "2026-11-22T06:30:00Z" })], "2026-11-22").resena).not.toBeNull();
    for (const estado of ["fallo", "pendiente", "enviando"]) {
      expect(peticionesDelChat([m({ texto: pide, estado })], "2026-11-22").resena).toBeNull();
    }
    // Lo que escribió el cliente no es una petición nuestra.
    expect(peticionesDelChat([m({ texto: "ya dejé la reseña", direccion: "entra", desde: "cliente" })], "2026-11-22").resena).toBeNull();
  });
  it("si hay marca y mensaje, manda el más reciente", () => {
    const e = estadoResenaLead(lead({
      reservas: [r({ whatsappEn: "2026-11-22T20:00:00Z" })],
      mensajes: [m({ texto: "Una reseña nos ayuda mucho", desde: "panel", por: "Erick", fecha: "2026-11-23T15:00:00Z" })],
    }), HOY)!;
    expect(e.porWhatsapp).toEqual({ via: "whatsapp", en: "2026-11-23T15:00:00.000Z", quien: "Erick" });
  });
  it("el correo automático se dice aparte: no cuenta como pedida por WhatsApp", () => {
    const e = estadoResenaLead(lead({ reservas: [r({ correoEn: "2026-11-23T16:00:00Z" })] }), HOY)!;
    expect(e.porWhatsapp).toBeNull();
    expect(textoPeticion(e.porCorreo!)).toBe("Le llegó el correo para dejar su reseña el 23 nov");
  });
  it("«¿cómo les fue?» sin la liga no es la reseña, pero se avisa; con la liga, sí es", () => {
    const como = estadoResenaLead(lead({ mensajes: [m({ texto: "¡Hola Ana! ¿Cómo les fue en el tour?" })] }), HOY)!;
    expect(como.porWhatsapp).toBeNull();
    expect(como.comoLesFue).toBe("2026-11-23T16:00:00.000Z");
    expect(avisosResena(como).join(" ")).toContain("«¿cómo les fue?»");
    const conLiga = estadoResenaLead(lead({ mensajes: [m({ texto: `¿Cómo les fue? Si les gustó: ${GOOGLE_REVIEW_URL}` })] }), HOY)!;
    expect(conLiga.porWhatsapp).not.toBeNull();
    expect(avisosResena(conLiga)).toEqual([]);
  });
});

describe("avisos y la pregunta antes de pedirla otra vez", () => {
  it(`con ${CALIFICACION_BAJA} de 5 o menos en la encuesta se avisa, y el botón sigue (Google prohíbe pedirla solo a los contentos)`, () => {
    const baja = estadoResenaLead(lead({ reservas: [r({ id: "a", calificacion: 5, ultimoDia: "2026-11-21" }), r({ id: "b", calificacion: 2 })] }), HOY)!;
    expect(baja.calificacion).toBe(2);
    expect(avisosResena(baja)[0]).toContain("2 de 5");
    expect(baja.waUrl).not.toBeNull();
    expect(avisosResena(estadoResenaLead(lead({ reservas: [r({ calificacion: 4 })] }), HOY)!)).toEqual([]);
  });
  it("si ya se pidió por WhatsApp, se pregunta antes de abrirlo otra vez", () => {
    const e = estadoResenaLead(lead({ reservas: [r({ whatsappEn: "2026-11-22T20:00:00Z" })] }), HOY)!;
    expect(preguntaAntesDePedir(e)).toBe("Reseña pedida por WhatsApp el 22 nov. ¿Abrir WhatsApp para pedírsela otra vez?");
  });
  it("🔴 calificó bajo: el toque (también el de la tarjeta) lo dice antes de abrir WhatsApp, con el correo que ya le llegó (revisión del 20 nov 2026)", () => {
    const e = estadoResenaLead(lead({ reservas: [r({ calificacion: 2, correoEn: "2026-11-23T15:00:00Z" })] }), HOY)!;
    const pregunta = preguntaAntesDePedir(e)!;
    expect(pregunta).toContain("2 de 5");
    expect(pregunta).toContain("Le llegó el correo para dejar su reseña el 23 nov.");
    expect(pregunta.endsWith("¿Abrir WhatsApp para pedírsela?")).toBe(true);
  });
  it("ya se le preguntó «¿cómo les fue?»: también pregunta antes", () => {
    const e = estadoResenaLead(lead({ mensajes: [m({ texto: "¡Hola Ana! ¿Cómo les fue en el tour?" })] }), HOY)!;
    expect(preguntaAntesDePedir(e)).toContain("«¿cómo les fue?»");
  });
  it("solo el correo automático (lo normal al día siguiente) y contento: se abre directo, sin preguntar", () => {
    const e = estadoResenaLead(lead({ reservas: [r({ calificacion: 5, correoEn: "2026-11-23T16:00:00Z" })] }), HOY)!;
    expect(preguntaAntesDePedir(e)).toBeNull();
  });
  it("al tocar el botón se ve pedida en el momento, con quién la pidió", () => {
    const e = conPeticionDelPanel(estadoResenaLead(lead(), HOY)!, "2026-11-23T17:00:00Z", "Erick");
    expect(e.porWhatsapp).toEqual({ via: "whatsapp", en: "2026-11-23T17:00:00Z", quien: "Erick" });
    expect(conPeticionDelPanel(e, "2026-11-23T17:00:00Z", "  ").porWhatsapp?.quien).toBeNull();
  });
});

// Mover un lead a mano (19 nov 2026): el tablero, la ficha y la Bandeja
// preguntan lo mismo (`avisoAntesDeMover`, en leads/etapas.tsx). Va aquí
// porque el tablero de Operado y su reseña salieron en el mismo cambio.
describe("mover un lead a mano: qué se pregunta antes", () => {
  const ana = { nombre: "Ana", etapa: "confirmado", ultimoDia: "2026-11-22", saldo: 0 };
  it("a Operado con el viaje ya pasado y todo cobrado: se mueve directo", () => {
    expect(avisoAntesDeMover(ana, "operado", HOY)).toBeNull();
  });
  it("a Operado con el viaje hoy o más adelante: pregunta (Operado es «ya viajó»)", () => {
    expect(avisoAntesDeMover({ ...ana, ultimoDia: HOY }, "operado", HOY)).toContain("todavía no pasa (es hoy)");
    expect(avisoAntesDeMover({ ...ana, ultimoDia: "2026-11-29" }, "operado", HOY)).toContain("todavía no pasa");
  });
  it("a Operado debiendo dinero: pregunta y dice cuánto falta", () => {
    const aviso = avisoAntesDeMover({ ...ana, saldo: 1500 }, "operado", HOY);
    expect(aviso).toContain("Todavía falta cobrarle $1,500.");
    expect(aviso).toContain("¿Pasarlo a Operado de todos modos?");
  });
  it("sacarlo de Operado o de Perdido es reabrirlo: pregunta", () => {
    expect(avisoAntesDeMover({ ...ana, etapa: "perdido" }, "cotizado", HOY)).toBe("Ana está en Perdido. ¿Reabrirlo en Cotizado?");
    expect(avisoAntesDeMover({ ...ana, etapa: "operado" }, "confirmado", HOY)).toBe("Ana está en Operado. ¿Reabrirlo en Confirmado?");
  });
  it("a Perdido no pregunta (su cuadro pide el motivo); entre etapas abiertas, tampoco", () => {
    expect(avisoAntesDeMover(ana, "perdido", HOY)).toBeNull();
    expect(avisoAntesDeMover({ ...ana, etapa: "cotizado" }, "seguimiento", HOY)).toBeNull();
    expect(avisoAntesDeMover(ana, "confirmado", HOY)).toBeNull();
  });
});
