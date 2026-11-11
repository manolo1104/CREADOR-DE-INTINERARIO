/**
 * Guardas del sitio en inglés (10 nov 2026). Lo que aquí se prueba se rompía
 * en silencio: una página /en con un párrafo en español, una reseña sin
 * traducir o un artículo del blog emparejado con un archivo que no existe no
 * dan error en ningún lado; solo se ven mal o devuelven 404.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { RESENAS_REALES } from "@/lib/resenasReales";
import { resenasRealesPara } from "@/lib/i18n/resenasReales.en";
import { NARRATIVA_DESTINO } from "@/lib/destinoData";
import { NARRATIVA_DESTINO_EN } from "@/lib/i18n/narrativasDestino.en";
import PARES from "@/content/blog-en/pares.json";
import { enlacesAIngles } from "../../../blog-agent/traducir-en.js";

describe("reseñas reales en inglés", () => {
  it("cada reseña real tiene su traducción (si no, saldría en español en /en)", () => {
    const en = resenasRealesPara("en");
    expect(en).toHaveLength(RESENAS_REALES.length);
    for (const r of en) {
      expect(r.traducida, r.autor).toBe(true);
      expect(r.original).not.toBe(r.texto);
    }
  });

  it("en español no cambia nada", () => {
    const es = resenasRealesPara("es");
    es.forEach((r, i) => {
      expect(r.texto).toBe(RESENAS_REALES[i].texto);
      expect(r.traducida).toBe(false);
    });
  });
});

describe("narrativas de destinos", () => {
  it("las mismas llaves en los dos idiomas", () => {
    expect(Object.keys(NARRATIVA_DESTINO_EN).sort()).toEqual(Object.keys(NARRATIVA_DESTINO).sort());
  });
});

describe("blog en inglés (src/content/blog-en)", () => {
  const pares = PARES as Record<string, string>;
  const dir = path.join(process.cwd(), "src", "content", "blog-en", "posts");
  const archivos = fs.readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""));

  it("cada par tiene su archivo y cada archivo su par", () => {
    expect(archivos.sort()).toEqual(Object.keys(pares).sort());
  });

  it("los slugs en inglés no se repiten y coinciden con su archivo", () => {
    expect(new Set(Object.values(pares)).size).toBe(Object.values(pares).length);
    for (const es of archivos) {
      const post = JSON.parse(fs.readFileSync(path.join(dir, `${es}.json`), "utf-8"));
      expect(post.slugEs).toBe(es);
      expect(post.slug).toBe(pares[es]);
      expect(post.metaTitle.length).toBeLessThanOrEqual(60);
      expect(post.contentHtml).not.toMatch(/href="\/blog\/[^"]+"(?! hreflang="es")/);
    }
  });
});

describe("enlaces del artículo traducido", () => {
  const html = (h: string) => `<a href="${h}">x</a>`;
  const pares = { "mejor-epoca": "best-time" };

  it("pasa a /en lo que existe en inglés", () => {
    expect(enlacesAIngles(html("/tours/expedicion-tamul"), pares)).toBe(html("/en/tours/expedicion-tamul"));
    expect(enlacesAIngles(html("https://www.huasteca-potosina.com/destinos/cascada-de-tamul"), pares)).toBe(html("/en/destinos/cascada-de-tamul"));
    expect(enlacesAIngles(html("/"), pares)).toBe(html("/en"));
    expect(enlacesAIngles(html("/blog/mejor-epoca#clima"), pares)).toBe(html("/en/blog/best-time#clima"));
  });

  it("deja lo que solo existe en español, las anclas y lo externo", () => {
    expect(enlacesAIngles(html("/desde/cdmx"), pares)).toBe(html("/desde/cdmx"));
    expect(enlacesAIngles(html("#faq"), pares)).toBe(html("#faq"));
    expect(enlacesAIngles(html("https://www.paraisoencantado.com/"), pares)).toBe(html("https://www.paraisoencantado.com/"));
    expect(enlacesAIngles(html("/blog/sin-traducir"), pares)).toBe('<a href="/blog/sin-traducir" hreflang="es">x</a>');
    // Xantolo solo se vende en español: al catálogo en inglés.
    expect(enlacesAIngles(html("/paquetes/noche-de-xantolo"), pares)).toBe(html("/en/paquetes"));
  });
});
