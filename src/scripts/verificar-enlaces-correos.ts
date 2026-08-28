/**
 * verificar-enlaces-correos.ts — ¿algún enlace de algún correo lleva a un 404?
 *
 * Existe por un caso real: la vista previa del boletín llevaba tres artículos
 * de blog inventados. Los correos se veían impecables, se revisaron, se dieron
 * por buenos — y los tres enlaces daban "página no encontrada" en producción.
 * Nadie lo vio porque revisar un correo es mirarlo, y un enlace roto se ve
 * exactamente igual que uno bueno hasta que alguien lo pulsa.
 *
 * `verificar-imagenes.ts` hace esto con los assets del sitio contra `public/`.
 * Éste lo hace con los CORREOS contra un servidor de verdad, que es donde hay
 * que hacerlo: un correo se manda una vez y no se puede corregir después.
 *
 *   npx tsx src/scripts/verificar-enlaces-correos.ts                 (producción)
 *   npx tsx src/scripts/verificar-enlaces-correos.ts http://localhost:3000
 *   npx tsx src/scripts/verificar-enlaces-correos.ts --sin-externos  (sin wa.me ni Google)
 *
 * Sale con código 1 si algo está roto. Sirve para colgarlo del CI.
 */

import { cargarEnv } from "./_env";

cargarEnv();
// Firmar la baja necesita secreto. Aquí da igual cuál sea: no se comprueba la
// firma, solo que el enlace exista y que `/baja` conteste.
if (!process.env.BAJA_SECRET && !process.env.ADMIN_JWT_SECRET) {
  process.env.BAJA_SECRET = "verificacion-de-enlaces";
}

import { correos } from "./previsualizar-en-navegador";

const PROD = "https://www.huasteca-potosina.com";
const args = process.argv.slice(2);
const SIN_EXTERNOS = args.indexOf("--sin-externos") >= 0;
const HOST = (args.filter((a) => a.charAt(0) !== "-")[0] ?? PROD).replace(/\/$/, "");

type Uso = { url: string; correos: Set<string>; imagen: boolean };

// ── 1. Sacar todo lo enlazable de los 25 correos ────────────────────────────

const lista = correos();
const usos = new Map<string, Uso>();

/** Los archivos de vista previa se llaman `correo-NN`: dos correos con el mismo
 *  `n` se pisan y la revisión los da por buenos sin haberlos visto nunca. */
const numeros = new Map<number, string[]>();

for (const c of lista) {
  numeros.set(c.n, (numeros.get(c.n) ?? []).concat(c.nombre));
  const etiqueta = `${c.n} ${c.nombre}`;

  const anota = (bruto: string, imagen: boolean) => {
    if (!bruto || bruto.indexOf("mailto:") === 0 || bruto.indexOf("tel:") === 0) return;
    // El correo apunta a producción; se reapunta al host que se esté probando.
    const url = bruto.split(PROD).join(HOST);
    const previo = usos.get(url);
    if (previo) { previo.correos.add(etiqueta); previo.imagen = previo.imagen || imagen; }
    else usos.set(url, { url, correos: new Set([etiqueta]), imagen });
  };

  const hrefs = c.html.match(/href="([^"]+)"/g) ?? [];
  for (const h of hrefs) anota(h.slice(6, -1).replace(/&amp;/g, "&"), false);

  const imgs = c.html.match(/<img[^>]+src="([^"]+)"/g) ?? [];
  for (const i of imgs) anota((i.match(/src="([^"]+)"/) ?? ["", ""])[1], true);
}

// ── 2. Comprobarlo contra el servidor ───────────────────────────────────────

/**
 * `HEAD` no vale: varias rutas de Next contestan 405 o no lo implementan. Se
 * pide `GET` y se tira el cuerpo.
 *
 * Y NO se sigue la redirección de golpe: un 308 es una respuesta distinta de un
 * 200 y hay que verla. En un correo importa —hay filtros corporativos y clientes
 * que no siguen redirecciones— y además delata que se está mandando la URL
 * vieja de algo. Se sigue después, a mano, para saber dónde acaba.
 */
async function estado(url: string): Promise<{ code: number; tipo: string; final?: string }> {
  try {
    const r = await fetch(url, { redirect: "manual", headers: { "user-agent": "verificador-de-correos" } });
    const tipo = r.headers.get("content-type") ?? "";
    if (r.status >= 300 && r.status < 400) {
      const destino = r.headers.get("location") ?? "";
      const abs = destino.indexOf("http") === 0 ? destino : HOST + destino;
      try {
        const r2 = await fetch(abs, { redirect: "follow", headers: { "user-agent": "verificador-de-correos" } });
        return { code: r.status, tipo, final: `${r2.status} ${abs}` };
      } catch { return { code: r.status, tipo, final: `sin respuesta ${abs}` }; }
    }
    return { code: r.status, tipo };
  } catch (e) {
    return { code: 0, tipo: e instanceof Error ? e.message : "sin conexión" };
  }
}

async function main() {
  console.log(`\n  Correos: ${lista.length}   ·   Host: ${HOST}`);
  console.log(`  Enlaces e imágenes únicos: ${usos.size}\n`);

  const rotos: string[] = [];
  const avisos: string[] = [];

  // Números repetidos: la trampa que ya costó una revisión falsa.
  for (const [n, nombres] of Array.from(numeros.entries())) {
    if (nombres.length > 1) rotos.push(`Dos correos con el número ${n}: ${nombres.join(" / ")} — uno pisa al otro`);
  }

  const pendientes = Array.from(usos.values());
  for (const u of pendientes) {
    const externo = u.url.indexOf(HOST) !== 0;
    if (externo && SIN_EXTERNOS) { console.log(`  ·    (omitido) ${u.url.slice(0, 88)}`); continue; }

    const { code, tipo, final } = await estado(u.url);
    const quien = Array.from(u.correos).join(", ");
    const corto = u.url.length > 84 ? u.url.slice(0, 84) + "…" : u.url;

    if (code === 200) {
      // Una imagen que contesta 200 con `text/html` es la página de error del
      // servidor: en el correo sale el mismo hueco gris que si no existiera.
      if (u.imagen && tipo.indexOf("image/") !== 0) {
        rotos.push(`${u.url} → 200 pero ${tipo || "sin tipo"} (se esperaba una imagen) · ${quien}`);
        console.log(`  ⚠️  ${code}  ${corto}  [${tipo}]`);
      } else {
        console.log(`  ✅  ${code}  ${corto}`);
      }
    } else if (code >= 300 && code < 400) {
      // `wa.me` y `g.page` SIEMPRE redirigen: es como funcionan. Anotarlo cada
      // vez llenaría el informe de seis avisos que nadie va a arreglar nunca,
      // y un informe con ruido fijo se deja de leer. Solo importa la
      // redirección en nuestro dominio: ahí sí significa que el correo lleva
      // la URL vieja de algo.
      const nuestro = u.url.indexOf(HOST) === 0;
      if (nuestro) avisos.push(`${u.url} → ${code} → ${final} · ${quien}`);
      console.log(`  ${nuestro ? "↪️ " : "✅"}  ${code}  ${corto}   →  ${(final ?? "").slice(0, 70)}`);
    } else {
      rotos.push(`${u.url} → ${code || "sin respuesta"} ${tipo} · ${quien}`);
      console.log(`  ❌  ${code || "---"}  ${corto}   ← ${quien}`);
    }
  }

  if (avisos.length) {
    console.log(`\n  ${avisos.length} enlace(s) con rodeo — llegan, pero por una redirección:`);
    for (const a of avisos) console.log(`    ↪️  ${a}`);
    console.log(`  En un correo conviene mandar la URL final: hay filtros que no siguen redirecciones.`);
  }

  if (rotos.length) {
    console.log(`\n  ❌ ${rotos.length} problema(s):`);
    for (const r of rotos) console.log(`    · ${r}`);
    console.log("");
    process.exit(1);
  }

  console.log(`\n  ✅ Los ${usos.size} enlaces e imágenes de los ${lista.length} correos responden.\n`);
}

main().catch((e) => {
  console.error("\n✗ Falló:", e instanceof Error ? e.message : e);
  process.exit(1);
});
