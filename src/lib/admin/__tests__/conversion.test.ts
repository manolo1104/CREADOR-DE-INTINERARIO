import { describe, expect, it } from "vitest";
import {
  avisoSobrecupo, etiquetasSinLugar, fechaCorta, idiomaTourDeConversion, pasoTrasConvertir,
  pedidosDeCupo, tituloTareaLigaPagada,
} from "@/lib/cotizaciones/reglasConversion";
import { pickupConDato, pickupParaFormulario, PICKUP_POR_DEFECTO } from "@/lib/admin/hospedaje";
import { buildTourEmailHtml } from "@/lib/tourEmail";

// Lote 1 de la auditoría (5 nov 2026): «Convertir a reserva» del panel, la
// liga pagada y el punto de recogida. Lo que toca la base se prueba aparte
// con un script contra la base local; aquí, las reglas.

describe("qué hace el panel después de convertir (pasoTrasConvertir)", () => {
  const base = { folio: "HP-M-A", total: 5000, cancelada: false, abonadoPorLiga: 0 };

  it("🔴 la liga ya la convirtió y abonó $1,500: dice cuál es y NO vuelve a proponer el anticipo", () => {
    const p = pasoTrasConvertir({ ...base, nueva: false, yaPago: true, cobrado: 1500 });
    expect(p.abrirCobro).toBe(false);
    expect(p.mensaje).toContain("ya es la reserva HP-M-A");
    expect(p.mensaje).toContain("$1,500");
    expect(p.mensaje).toContain("no lo vuelvas a capturar");
  });

  it("ya era reserva pero sin dinero y el cliente dice que pagó: sí abre el cobro (nada se había registrado)", () => {
    const p = pasoTrasConvertir({ ...base, nueva: false, yaPago: true, cobrado: 0 });
    expect(p.abrirCobro).toBe(true);
    expect(p.mensaje).toContain("no se creó otra");
  });

  it("ya era reserva y está cancelada: no abre nada y lo dice", () => {
    const p = pasoTrasConvertir({ ...base, nueva: false, yaPago: true, cobrado: 0, cancelada: true });
    expect(p.abrirCobro).toBe(false);
    expect(p.mensaje).toContain("cancelada");
  });

  it("nueva y ya pagó: abre «Registrar cobro»", () => {
    const p = pasoTrasConvertir({ ...base, nueva: true, yaPago: true, cobrado: 0 });
    expect(p).toEqual({ abrirCobro: true, mensaje: "Reserva creada · HP-M-A. Registra el pago para terminar." });
  });

  it("nueva y todavía no paga: queda pendiente, sin cobro", () => {
    const p = pasoTrasConvertir({ ...base, nueva: true, yaPago: false, cobrado: 0 });
    expect(p.abrirCobro).toBe(false);
    expect(p.mensaje).toContain("queda pendiente de pago");
  });

  it("nueva con $1,500 abonados por la liga: si ya pagó abre el cobro solo por lo demás; si no, solo lo dice", () => {
    const pago = pasoTrasConvertir({ ...base, nueva: true, yaPago: true, cobrado: 1500, abonadoPorLiga: 1500 });
    expect(pago.abrirCobro).toBe(true);
    expect(pago.mensaje).toContain("registra solo lo demás");
    const sin = pasoTrasConvertir({ ...base, nueva: true, yaPago: false, cobrado: 1500, abonadoPorLiga: 1500 });
    expect(sin.abrirCobro).toBe(false);
    expect(sin.mensaje).toContain("ya cobrados por la liga de pago");
  });

  it("nueva y la liga ya cubrió todo: no abre el cobro aunque diga que pagó", () => {
    const p = pasoTrasConvertir({ ...base, nueva: true, yaPago: true, cobrado: 5000, abonadoPorLiga: 5000 });
    expect(p.abrirCobro).toBe(false);
  });
});

describe("cupo al convertir (pedidosDeCupo, avisoSobrecupo)", () => {
  it("cada línea de tour con su gente (adultos + 6-10 + menores de 6); el _meta y las líneas sin fecha no cuentan", () => {
    const lineas = [
      { _meta: true, venceEl: "2026-11-18" },
      { tourSlug: "expedicion-tamul", tourDate: "2026-11-20", adults: 2, childrenMid: 1, childrenSmall: 1 },
      { tourSlug: "cascadas-del-meco", tourDate: "", adults: 2 },
    ];
    expect(pedidosDeCupo(lineas, {})).toEqual([{ slug: "expedicion-tamul", fecha: "2026-11-20", personas: 4 }]);
  });

  it("cotización vieja sin líneas: el tour y la fecha de la cabecera", () => {
    expect(pedidosDeCupo([], { tourSlug: "expedicion-tamul", tourDate: "2026-11-20", adults: 3, children: 1 }))
      .toEqual([{ slug: "expedicion-tamul", fecha: "2026-11-20", personas: 4 }]);
    expect(pedidosDeCupo(null, {})).toEqual([]);
  });

  it("sin problemas no hay aviso; con fecha llena o cerrada, la nota ⚠️ SOBRECUPO y las etiquetas cortas", () => {
    expect(avisoSobrecupo([], "al convertir la cotización COT-1")).toBeNull();
    const sinLugar = [
      { slug: "expedicion-tamul", fecha: "2026-11-20", personas: 4, estado: "sin-cupo" as const },
      { slug: "cascadas-del-meco", fecha: "2026-11-21", personas: 2, estado: "cerrada" as const },
    ];
    expect(avisoSobrecupo(sinLugar, "al convertir la cotización COT-1")).toBe(
      "⚠️ SOBRECUPO (al convertir la cotización COT-1): expedicion-tamul el 2026-11-20 (4 pers., sin lugar); cascadas-del-meco el 2026-11-21 (2 pers., fecha cerrada). Mover de fecha o sumar unidad.",
    );
    expect(etiquetasSinLugar(sinLugar)).toEqual(["TAM 20 nov sin lugar", "MEC 21 nov fecha cerrada"]);
  });

  it("fechaCorta no depende del idioma del servidor", () => {
    expect(fechaCorta("2026-11-20")).toBe("20 nov");
    expect(fechaCorta("2027-01-05")).toBe("5 ene");
    expect(fechaCorta("mañana")).toBe("mañana");
  });
});

describe("idioma del guía al convertir (idiomaTourDeConversion)", () => {
  it("lo elegido en el panel manda", () => {
    expect(idiomaTourDeConversion({ elegido: "es", idiomaContacto: "en", locale: "en" })).toBe("es");
    expect(idiomaTourDeConversion({ elegido: "en" })).toBe("en");
  });
  it("🔴 la liga pagada (nadie eligió): inglés si lo dice el contacto o la cotización; antes nacía siempre «es»", () => {
    expect(idiomaTourDeConversion({ idiomaContacto: "en" })).toBe("en");
    // El «es» del contacto es su valor por omisión: no tapa la cotización en inglés.
    expect(idiomaTourDeConversion({ idiomaContacto: "es", locale: "en" })).toBe("en");
    expect(idiomaTourDeConversion({ idiomaContacto: "es", locale: "es" })).toBe("es");
    expect(idiomaTourDeConversion({})).toBe("es");
  });
});

describe("seguimiento de la liga pagada (tituloTareaLigaPagada)", () => {
  it("sin nada raro: el de siempre", () => {
    expect(tituloTareaLigaPagada({ cliente: "Ana López", folio: "HP-M-A", monto: 1500, revisar: [] }))
      .toBe("Pagó la liga: Ana López ya tiene la reserva HP-M-A ($1,500). Mándale la confirmación y revisa guía y recogida.");
  });
  it("🔴 con lo que no cuadró: empieza con ⚠️ y lo dice (el cliente ya pagó; decide una persona)", () => {
    const t = tituloTareaLigaPagada({ cliente: "Ana López", folio: "HP-M-A", monto: 1500, revisar: ["estaba vencida desde el 2 nov", "TAM 20 nov sin lugar"] });
    expect(t.startsWith("⚠️ Pagó la liga: Ana López ya tiene la reserva HP-M-A ($1,500).")).toBe(true);
    expect(t).toContain("Antes de confirmarle revisa: estaba vencida desde el 2 nov; TAM 20 nov sin lugar.");
    // Sin doble signo al final.
    expect(tituloTareaLigaPagada({ cliente: "Ana", folio: "HP-M-A", monto: 1500, revisar: ["ya tenía $1,500 antes de la liga: ¿pago repetido?"] }))
      .toMatch(/¿pago repetido\?$/);
  });
  it("nunca pasa de 200 caracteres (el título de una tarea)", () => {
    const t = tituloTareaLigaPagada({ cliente: "Ana López", folio: "HP-M-A", monto: 1500, revisar: Array.from({ length: 12 }, (_, i) => `aviso largo número ${i}`) });
    expect(t.length).toBeLessThanOrEqual(200);
    expect(t.endsWith("…")).toBe(true);
  });
});

describe("lugar de recogida: el «Lobby de tu hotel en Xilitla» no es un dato", () => {
  it("pickupConDato: ni vacío, ni el lobby que ponía el panel, ni «por definir»", () => {
    expect(pickupConDato(PICKUP_POR_DEFECTO)).toBeNull();
    expect(pickupConDato("  lobby de tu hotel en  XILITLA ")).toBeNull();
    expect(pickupConDato("")).toBeNull();
    expect(pickupConDato(undefined)).toBeNull();
    expect(pickupConDato("Por definir — te contactaremos por WhatsApp")).toBeNull();
    expect(pickupConDato("Hotel Taninul, Cd. Valles")).toBe("Hotel Taninul, Cd. Valles");
  });
  it("pickupParaFormulario: al editar una reserva el campo sale vacío si solo tenía el lobby", () => {
    expect(pickupParaFormulario(PICKUP_POR_DEFECTO)).toBe("");
    expect(pickupParaFormulario(undefined)).toBe("");
    expect(pickupParaFormulario("Hotel Taninul, Cd. Valles")).toBe("Hotel Taninul, Cd. Valles");
  });
  it("🔴 el correo del RZR con el lobby guardado da el punto de encuentro real (la base), no el lobby", () => {
    const base = { customerName: "Prueba", confirmationNumber: "HP-M-PRUEBA", tourName: "RZR", tourDate: "2026-11-20", tourSlug: "rzr-xilitla", adults: 2, children: 0, totalAmount: 3000 };
    const conLobby = buildTourEmailHtml({ ...base, pickupLugar: PICKUP_POR_DEFECTO });
    expect(conLobby).not.toContain("Lobby de tu hotel");
    expect(conLobby).toContain("nuestra base en Xilitla");
    // Igual que si no se hubiera escrito nada.
    expect(conLobby).toBe(buildTourEmailHtml(base));
    // Lo que sí se anotó se sigue imprimiendo.
    expect(buildTourEmailHtml({ ...base, pickupLugar: "Hotel Taninul, Cd. Valles" })).toContain("Hotel Taninul, Cd. Valles");
  });
});
