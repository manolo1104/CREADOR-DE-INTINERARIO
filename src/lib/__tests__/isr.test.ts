import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

// 13 nov 2026: las páginas principales se guardan en caché (ISR). Basta UN
// `headers()`, `cookies()` o `force-dynamic` en ellas —o en el layout raíz— para
// que vuelvan a armarse en cada visita sin que nadie lo note. Esta prueba lo nota.

const APP = join(process.cwd(), "src", "app");
const lee = (r: string) => readFileSync(join(APP, r), "utf8");

const PLANTILLAS = [
  "layout.tsx", "not-found.tsx", "PaginaInicio.tsx", "tours/PaginaTours.tsx", "tours/[slug]/PaginaTour.tsx",
  "paquetes/PaginaPaquetes.tsx", "paquetes/[slug]/PaginaPaquete.tsx", "destinos/[slug]/PaginaDestino.tsx", "blog/[slug]/page.tsx",
];
const RUTAS: [string, number][] = [
  ["page.tsx", 300], ["en/page.tsx", 300], ["tours/page.tsx", 3600], ["en/tours/page.tsx", 3600],
  ["tours/[slug]/page.tsx", 3600], ["en/tours/[slug]/page.tsx", 3600], ["paquetes/page.tsx", 300], ["en/paquetes/page.tsx", 300],
  ["paquetes/[slug]/page.tsx", 3600], ["en/paquetes/[slug]/page.tsx", 3600], ["destinos/[slug]/page.tsx", 3600],
  ["en/destinos/[slug]/page.tsx", 3600], ["blog/[slug]/page.tsx", 3600],
];

describe("ISR: las páginas principales no leen la petición", () => {
  it.each(PLANTILLAS)("%s sin headers(), cookies() ni force-dynamic", (r) => {
    const t = lee(r);
    expect(t).not.toMatch(/\bheaders\(\)/);
    expect(t).not.toMatch(/\bcookies\(\)/);
    expect(t).not.toMatch(/force-dynamic/);
  });
  it.each(RUTAS)("%s se rehace cada %i s", (r, s) => {
    expect(lee(r)).toContain(`export const revalidate = ${s};`);
  });
  it("las rutas en inglés pasan «en» y las de español «es»", () => {
    for (const [r] of RUTAS.filter(([x]) => x !== "blog/[slug]/page.tsx")) {
      expect(lee(r)).toContain(r.startsWith("en/") ? 'locale="en"' : 'locale="es"');
    }
  });
});
