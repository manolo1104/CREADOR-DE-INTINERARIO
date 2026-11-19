import { describe, expect, it } from "vitest";
import { autoenlaza, yaEnlazaA, MAX_NUEVOS } from "@/lib/blogAutoenlaces";
import { cambiaImagenes } from "@/lib/blogSeo";

describe("autoenlaza (19 nov 2026)", () => {
  it("enlaza la primera mención de un lugar a su página dueña, solo dentro de <p>", () => {
    const html = `<h2>Minas Viejas</h2><p>Las Cascadas de Minas Viejas están cerca. Minas Viejas otra vez.</p>`;
    const out = autoenlaza(html, "otro-articulo");
    expect(out).toContain(`<h2>Minas Viejas</h2>`);
    expect(out.match(/href="\/destinos\/cascadas-minas-viejas"/g)).toHaveLength(1);
    expect(out).toContain(`Las Cascadas de <a href="/destinos/cascadas-minas-viejas">Minas Viejas</a>`);
  });

  it("no enlaza si el artículo ya enlaza a esa página, ni dentro de otro enlace", () => {
    const ya = `<p>Ve a <a href="https://www.huasteca-potosina.com/destinos/la-trinidad-xilitla">la ficha</a>. La Trinidad es bonita.</p>`;
    expect(autoenlaza(ya, "x").match(/la-trinidad-xilitla/g)).toHaveLength(1);
    const dentro = `<p><a href="/tours">Tour a La Trinidad</a></p>`;
    expect(autoenlaza(dentro, "x")).not.toContain("la-trinidad-xilitla");
  });

  it("no se enlaza a sí mismo", () => {
    const html = `<p>La Cascada de Tamul es la más alta.</p>`;
    expect(autoenlaza(html, "cascada-de-tamul-la-guia-definitiva-para-visitarla-2026")).not.toContain("cascada-de-tamul-la-guia");
  });

  it("«Siete Cascadas de Tamasopo» no se confunde con las Cascadas de Tamasopo", () => {
    expect(autoenlaza(`<p>Las Siete Cascadas de Tamasopo.</p>`, "x")).not.toContain("/destinos/cascadas-de-tamasopo");
    expect(autoenlaza(`<p>Las Cascadas de Tamasopo.</p>`, "x")).toContain("/destinos/cascadas-de-tamasopo");
  });

  it("la frase larga gana a la palabra suelta y no se parte", () => {
    const out = autoenlaza(`<p>Qué hacer en Xilitla en un fin de semana.</p>`, "x");
    expect(out).toContain(`<a href="/blog/hacer-guia-definitiva-para-visitar-xilitla-todo-lo-que-necesitas-saber">Qué hacer en Xilitla</a>`);
    expect(out).not.toContain("/destinos/xilitla-pueblo-magico");
  });

  it("la marca «Tours Huasteca Potosina» no se enlaza al inicio; la región sí", () => {
    expect(autoenlaza(`<p>Somos Tours Huasteca Potosina.</p>`, "x")).not.toContain(`href="/"`);
    expect(autoenlaza(`<p>Bienvenido a la Huasteca Potosina.</p>`, "x")).toContain(`<a href="/">Huasteca Potosina</a>`);
  });

  it("como mucho MAX_NUEVOS lugares por artículo, y el inicio no cuenta para el tope", () => {
    const lugares = [
      "Puente de Dios", "Xantolo", "Sótano de las Golondrinas", "Cascadas de Micos", "Cascada El Meco", "Minas Viejas",
      "Las Pozas", "Huichihuayán", "La Trinidad", "Tambaque", "Taninul", "Tamtoc", "Aquismón",
    ];
    const html = `<p>${lugares.join(", ")} y la Huasteca Potosina.</p>`;
    const out = autoenlaza(html, "x");
    const enlaces = out.match(/<a href="[^"]+">/g) ?? [];
    expect(enlaces.filter((a) => a !== `<a href="/">`)).toHaveLength(MAX_NUEVOS);
    expect(out).toContain(`<a href="/">Huasteca Potosina</a>`);
  });

  it("un ancla del propio artículo (#seccion) no cuenta como enlace al inicio", () => {
    expect(yaEnlazaA(`<a href="#como-llegar">x</a>`, "/")).toBe(false);
    expect(yaEnlazaA(`<a href="https://www.huasteca-potosina.com/">x</a>`, "/")).toBe(true);
    expect(yaEnlazaA(`<a href="/">x</a>`, "/")).toBe(true);
  });
});

describe("cambiaImagenes (fotos del cuerpo por su ruta)", () => {
  const fig = (src: string) =>
    `<p>Antes.</p><figure>\n  <img src="https://www.huasteca-potosina.com${src}" alt="viejo alt" loading="lazy" width="900" height="500" />\n  <figcaption>Pie viejo</figcaption>\n</figure><p>Después.</p>`;

  it("cambia foto, alt y pie sin tocar lo demás", () => {
    const out = cambiaImagenes(fig("/imagenes/a/x.jpg"), [
      { de: "/imagenes/a/x.jpg", a: "/imagenes/b/y.jpg", alt: `Alt "nuevo"`, pie: "Pie con $1,550 MXN" },
    ]);
    expect(out).toContain(`src="https://www.huasteca-potosina.com/imagenes/b/y.jpg"`);
    expect(out).toContain(`alt="Alt &quot;nuevo&quot;"`);
    expect(out).toContain(`<figcaption>Pie con $1,550 MXN</figcaption>`);
    expect(out).toContain(`loading="lazy" width="900" height="500"`);
    expect(out.startsWith("<p>Antes.</p>")).toBe(true);
  });

  it("con `quitar`, quita la figura entera", () => {
    const out = cambiaImagenes(fig("/imagenes/a/x.jpg"), [{ de: "/imagenes/a/x.jpg", quitar: true }]);
    expect(out).toBe("<p>Antes.</p><p>Después.</p>");
  });

  it("sin `a` ni `quitar`, se queda la foto y solo cambia el alt", () => {
    const out = cambiaImagenes(fig("/imagenes/a/x.jpg"), [{ de: "/imagenes/a/x.jpg", alt: "Nuevo" }]);
    expect(out).toContain(`src="https://www.huasteca-potosina.com/imagenes/a/x.jpg" alt="Nuevo"`);
    expect(out).toContain("<figcaption>Pie viejo</figcaption>");
  });

  it("no cruza a otra figura", () => {
    const html = `<figure><img src="/imagenes/otra.jpg" alt="o" /><figcaption>otra</figcaption></figure>${fig("/imagenes/a/x.jpg")}`;
    const out = cambiaImagenes(html, [{ de: "/imagenes/a/x.jpg", quitar: true }]);
    expect(out).toContain(`/imagenes/otra.jpg`);
    expect(out).not.toContain(`/imagenes/a/x.jpg`);
  });
});
