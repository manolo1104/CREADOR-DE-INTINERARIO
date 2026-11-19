import { describe, expect, it } from "vitest";
import {
  temporadaParaAviso,
  inicioDeConteo,
  fraseDemanda,
  textoFaltan,
  lugarEnFrase,
  fraseDemandaEn,
  textoFaltanEn,
  mensajeTemporadaEn,
  mensajeTemporada,
  mensajeCierre,
  VENTANA_AVISO_DIAS,
} from "@/lib/blogCtaWhatsapp";

// Mediodía en México, para que la fecha no cambie por la zona horaria.
const enMexico = (ymd: string) => new Date(`${ymd}T12:00:00-06:00`);

describe("temporadaParaAviso", () => {
  it("el 19 nov 2026 avisa de las vacaciones de diciembre, a 30 días", () => {
    const t = temporadaParaAviso(enMexico("2026-11-19"));
    expect(t?.id).toBe("vacaciones-diciembre-2026");
    expect(t?.faltan).toBe(30);
    expect(t?.enCurso).toBe(false);
  });

  it("dentro de la temporada dice que está en curso y cuenta desde hoy", () => {
    const t = temporadaParaAviso(enMexico("2026-12-24"));
    expect(t?.id).toBe("vacaciones-diciembre-2026");
    expect(t?.enCurso).toBe(true);
    expect(inicioDeConteo(t!, enMexico("2026-12-24"))).toBe("2026-12-24");
  });

  it(`no avisa si la siguiente temporada está a más de ${VENTANA_AVISO_DIAS} días`, () => {
    // Del 30 ago 2027 al Xantolo 2027 (31 oct) hay 62 días: sí. Del 30 ago al
    // fin de verano ya pasó. Probamos una fecha a >75 días de la siguiente.
    expect(temporadaParaAviso(enMexico("2027-08-10"))?.id).toBe("verano-2027");
    const lejos = temporadaParaAviso(enMexico("2027-08-30"));
    expect(lejos === null || lejos.faltan <= VENTANA_AVISO_DIAS).toBe(true);
  });
});

describe("fraseDemanda (solo con reservas reales)", () => {
  it("sin ninguna reserva no dice nada", () => {
    expect(fraseDemanda({ "2026-12-20": "libre", "2026-12-21": "libre", "2026-12-22": "cerrada" }, "Expedición Tamul")).toBeNull();
  });

  it("con reservas, las cuenta", () => {
    expect(fraseDemanda({ a: "con-reservas", b: "libre", c: "con-reservas" }, "Expedición Tamul")).toBe(
      "Expedición Tamul ya tiene reservas en 2 fechas de esta temporada.",
    );
  });

  it("casi llenas ganan a «con reservas»; llenas ganan a todo", () => {
    expect(fraseDemanda({ a: "casi-lleno", b: "con-reservas" }, "Ruta Surrealista")).toBe(
      "Ruta Surrealista: 1 fecha de esta temporada está casi llena.",
    );
    expect(fraseDemanda({ a: "sin-cupo", b: "casi-lleno", c: "casi-lleno" }, "Ruta Surrealista")).toBe(
      "Ruta Surrealista: 1 fecha de esta temporada ya está llena y 2 están casi llenas.",
    );
  });
});

describe("textos", () => {
  it("cuenta regresiva en singular y plural", () => {
    expect(textoFaltan(30)).toBe("Faltan 30 días");
    expect(textoFaltan(1)).toBe("Falta 1 día");
    expect(textoFaltan(0)).toBe("Empieza hoy");
  });

  it("los mensajes dicen de qué artículo viene y piden los datos para cotizar", () => {
    const m = mensajeTemporada("Cascada de Tamul: guía", "vacaciones de diciembre", "19 dic – 6 ene", "Expedición Tamul");
    expect(m).toContain("«Cascada de Tamul: guía»");
    expect(m).toContain("vacaciones de diciembre (19 dic – 6 ene)");
    expect(m).toContain("Me interesa Expedición Tamul.");
    expect(m).toContain("· Cuántos somos:");
    expect(mensajeCierre("X")).toContain("armar mi viaje");
    expect(mensajeCierre("X", "Ruta Surrealista")).toContain("reservar Ruta Surrealista");
  });

  it("el lugar lleva su artículo y pierde el paréntesis", () => {
    expect(lugarEnFrase("Cascada de Tamul")).toBe("la Cascada de Tamul");
    expect(lugarEnFrase("Sótano de las Golondrinas")).toBe("el Sótano de las Golondrinas");
    expect(lugarEnFrase("Las Pozas (Jardín Surrealista)")).toBe("Las Pozas");
    expect(lugarEnFrase("Puente de Dios (Tamasopo)")).toBe("Puente de Dios");
    expect(lugarEnFrase("Xilitla")).toBe("Xilitla");
  });

  it("inglés: demanda solo con reservas, cuenta regresiva y mensaje", () => {
    expect(fraseDemandaEn({ a: "libre" }, "Tamul Expedition")).toBeNull();
    expect(fraseDemandaEn({ a: "casi-lleno", b: "casi-lleno" }, "Tamul Expedition")).toBe(
      "Tamul Expedition: 2 dates this season are almost full.",
    );
    expect(textoFaltanEn(30)).toBe("30 days to go");
    expect(mensajeTemporadaEn("T", "December holidays", "Dec 19 – Jan 6")).toContain("during the December holidays (Dec 19 – Jan 6)");
    expect(mensajeTemporadaEn("T", "Xantolo (Day of the Dead)", "Oct 31 – Nov 2")).toContain("during Xantolo");
  });
});
