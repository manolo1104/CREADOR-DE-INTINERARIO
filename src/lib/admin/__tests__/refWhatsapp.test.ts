import { describe, expect, it } from "vitest";
import { agregarRef, canalDeVisita, nuevaRef, refDelTexto } from "@/lib/refWhatsapp";
import { leerOrigenWeb, origenWebDeClic } from "../origenWeb";
import { origenDelPrimerMensaje } from "../bandeja";

describe("código de referencia del WhatsApp (clic del sitio → lead de la Bandeja)", () => {
  it("el código: 5 caracteres sin 0/O/1/I", () => {
    const r = nuevaRef();
    expect(r).toMatch(/^[A-HJ-NP-Z2-9]{5}$/);
  });
  it("se agrega al final del mensaje prellenado y no se duplica en un segundo clic", () => {
    const url = "https://wa.me/524891090388?text=Hola%2C%20me%20interesa%20el%20tour%20%22Expedici%C3%B3n%20Tamul%22";
    const una = agregarRef(url, "K7Q2M");
    expect(decodeURIComponent(una.split("text=")[1])).toBe('Hola, me interesa el tour "Expedición Tamul" (ref. K7Q2M)');
    const dos = agregarRef(una, "P3RXT");
    expect(decodeURIComponent(dos.split("text=")[1])).toBe('Hola, me interesa el tour "Expedición Tamul" (ref. P3RXT)');
  });
  it("si el mensaje termina en «Me hospedo en: », el código va antes: el cliente sigue escribiendo donde debe", () => {
    const url = `https://wa.me/524891090388?text=${encodeURIComponent("Hola, me interesa el tour. ¿Qué fechas tienen? Me hospedo en: ")}`;
    const t = decodeURIComponent(agregarRef(url, "K7Q2M").split("text=")[1]);
    expect(t).toBe("Hola, me interesa el tour. ¿Qué fechas tienen? (ref. K7Q2M) Me hospedo en: ");
    expect(decodeURIComponent(agregarRef(agregarRef(url, "K7Q2M"), "P3RXT").split("text=")[1])).toBe("Hola, me interesa el tour. ¿Qué fechas tienen? (ref. P3RXT) Me hospedo en: ");
  });
  it("una liga sin mensaje prellenado no se toca (no se le inventa texto al cliente)", () => {
    expect(agregarRef("https://wa.me/524891090388", "K7Q2M")).toBe("https://wa.me/524891090388");
  });
  it("la Bandeja lo lee del mensaje, aunque el cliente lo deje sin punto o en minúsculas", () => {
    expect(refDelTexto('Hola, me interesa el tour "Expedición Tamul" (ref. K7Q2M)')).toBe("K7Q2M");
    expect(refDelTexto("hola ref k7q2m gracias")).toBe("K7Q2M");
    expect(refDelTexto("Hola, ¿tienen lugar el sábado?")).toBeNull();
  });
  it("el mensaje con código sigue reconociéndose como «del sitio» y con su tour", () => {
    const o = origenDelPrimerMensaje('Hola, me interesa el tour "Expedición Tamul" para 2 adultos (ref. K7Q2M)', [{ slug: "expedicion-tamul", nombre: "Expedición Tamul" }]);
    expect(o).toEqual({ canal: "whatsapp_sitio", tours: ["expedicion-tamul"] });
  });
});

describe("de dónde llegó la visita", () => {
  it.each([
    [{ fuente: "google", medio: "organic", campana: "perfil-maps", referrer: null }, "maps"],
    [{ fuente: "instagram", medio: "social", campana: "bio", referrer: null }, "redes"],
    [{ fuente: null, medio: null, campana: null, referrer: "l.instagram.com" }, "redes"],
    [{ fuente: null, medio: null, campana: null, referrer: "www.google.com" }, "seo"],
    [{ fuente: null, medio: null, campana: null, referrer: "chatgpt.com" }, "ia"],
    [{ fuente: "gclid", medio: null, campana: null, referrer: null }, "publicidad"],
    [{ fuente: "brevo", medio: "email", campana: "xantolo", referrer: null }, "correo"],
    [{ fuente: null, medio: null, campana: null, referrer: "hotelparaisoencantado.com" }, "referidos"],
    [{ fuente: null, medio: null, campana: null, referrer: null }, "directo"],
  ] as const)("%o → %s", (o, canal) => expect(canalDeVisita(o)).toBe(canal));
});

describe("el origen web del lead", () => {
  it("con el clic: página, primera página, canal y tour", () => {
    const o = origenWebDeClic("K7Q2M", {
      path: "/tours/expedicion-tamul", tourSlug: "expedicion-tamul", createdAt: new Date("2026-11-04T18:00:00Z"),
      data: { ref: "K7Q2M", landing: "/blog/xantolo", fuente: "instagram", medio: "social", campana: "bio" },
    });
    expect(o).toMatchObject({ pagina: "/tours/expedicion-tamul", landing: "/blog/xantolo", canal: "redes", tour: "expedicion-tamul", conClic: true });
    expect(leerOrigenWeb(JSON.parse(JSON.stringify(o)))).toEqual(o);
  });
  it("sin el clic (bloqueador o código viejo): queda el código, sin inventar canal", () => {
    expect(origenWebDeClic("K7Q2M", null)).toMatchObject({ ref: "K7Q2M", canal: "otro", conClic: false, pagina: null });
    expect(leerOrigenWeb({ algo: 1 })).toBeNull();
  });
});
