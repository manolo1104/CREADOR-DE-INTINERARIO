import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { distancia } from "@/lib/tiemposDeViaje";
import { FAQS_PAQUETES } from "@/lib/paquetes";

// Auditoría del 13 nov 2026: «unifica los datos: kilómetros desde CDMX y anticipo de paquetes».

describe("kilómetros desde CDMX: una sola fuente", () => {
  it("350 km a Xilitla y 410 a Ciudad Valles (OSRM por la Federal 85); en inglés, también en millas", () => {
    expect(distancia("cdmx")).toBe("350 km");
    expect(distancia("cdmx", "valles")).toBe("410 km");
    expect(distancia("cdmx", "xilitla", true)).toBe("217 miles (350 km)");
    expect(distancia("cdmx", "valles", true)).toBe("255 miles (410 km)");
    // Sin dato no se inventa.
    expect(distancia("no-existe")).toBe("");
  });

  it("🔴 ningún archivo del sitio vuelve a escribir 339, 430 o 450 km a mano", () => {
    const raiz = join(process.cwd(), "src");
    const malos: string[] = [];
    const recorrer = (dir: string) => {
      for (const n of readdirSync(dir)) {
        const p = join(dir, n);
        if (statSync(p).isDirectory()) { if (!["__tests__", "erratas"].includes(n)) recorrer(p); continue; }
        if (!/\.(ts|tsx|json)$/.test(n) || n === "blogSeo.ts" || n === "tiemposDeViaje.ts") continue;
        const t = readFileSync(p, "utf8");
        if (/\b(339|430|450) ?km\b/.test(t)) malos.push(p.replace(raiz, "src"));
      }
    };
    recorrer(raiz);
    expect(malos).toEqual([]);
  });
});

describe("anticipo de paquetes", () => {
  it("🔴 ya no dice «sin pago anticipado»: se aparta con el 30 % o se paga todo", () => {
    const texto = FAQS_PAQUETES.map((f) => f.a).join(" ");
    expect(texto).not.toMatch(/sin pago anticipado|no necesitas pago anticipado/i);
    expect(texto).toMatch(/30 %/);
  });
});
