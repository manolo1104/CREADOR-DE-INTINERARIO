/**
 * Comprueba que TODA liga e imagen de los 33 correos del curso responda.
 *
 * Un enlace roto se ve exactamente igual que uno bueno hasta que alguien lo
 * pulsa, y una imagen con 200 y content-type text/html es la página de error:
 * el mismo hueco gris que si no existiera. Por eso se mira el tipo, no sólo
 * el código.
 *
 *   npx tsx src/scripts/verificar-enlaces-curso.ts [host]
 *
 * Sale con código 1 si algo no responde, para poder encadenarlo.
 */

import { cargarEnv } from "./_env";
import { CORREOS_ALUMNO, CORREOS_PROSPECTO } from "../lib/cursoEmail";
import type { CursoLead } from "@prisma/client";
cargarEnv();

const HOST = process.argv[2] || "http://localhost:3007";
const LEAD = {
  id: "x", email: "prueba@ejemplo.mx", nombre: "Manolo", whatsapp: "4891251458",
  tipoNegocio: "Agencia", ciudad: "Ciudad Valles", origen: "webinar", webinar: true,
  correosEnviados: [], checkoutIniciadoAt: new Date(), compro: false, comproAt: null,
  montoMxn: null, stripeSessionId: null, status: "activo",
  createdAt: new Date("2026-09-02"), updatedAt: new Date(),
} as CursoLead;

async function main() {
  const cx = { lead: LEAD, ahora: new Date("2026-09-11T09:00:00-06:00"), pagados: 7 };
  const urls = new Map<string, string[]>();
  for (const c of [...CORREOS_PROSPECTO, ...CORREOS_ALUMNO]) {
    const { html } = c.build(cx);
    for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const u = m[1];
      if (u.startsWith("mailto:") || u.startsWith("#")) continue;
      if (!urls.has(u)) urls.set(u, []);
      urls.get(u)!.push(c.id);
    }
  }

  let malos = 0;
  for (const [u, ids] of [...urls].sort()) {
    const abs = u.startsWith("http") ? u : HOST + u;
    const externo = !abs.includes("localhost") && !abs.includes("huasteca-potosina");
    if (externo) { console.log(`  ·   externo  ${abs.slice(0, 72)}  [${ids.join(",")}]`); continue; }
    const dir = abs.replace("https://www.huasteca-potosina.com", HOST).replace("https://huasteca-potosina.com", HOST);
    try {
      const r = await fetch(dir, { redirect: "manual" });
      const tipo = r.headers.get("content-type") || "";
      const esImg = /\.(jpg|png|webp|avif|gif)/i.test(dir);
      const mal = r.status >= 400 || (esImg && tipo.includes("text/html"));
      if (mal) malos++;
      console.log(`  ${mal ? "❌" : "✅"} ${String(r.status).padEnd(4)} ${dir.slice(0, 68)}  [${ids.join(",")}]`);
    } catch (e) {
      malos++;
      console.log(`  ❌ ---  ${dir.slice(0, 68)}  ${e instanceof Error ? e.message : ""}`);
    }
  }
  console.log(`\n${malos === 0 ? "✅ Todas las ligas propias responden." : `❌ ${malos} rotas.`}`);
  process.exit(malos ? 1 : 0);
}
main();
