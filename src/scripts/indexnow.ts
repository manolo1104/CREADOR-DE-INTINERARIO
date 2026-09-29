/**
 * indexnow.ts — avisa a Bing (y a Yandex, Seznam, Naver…) de las URLs que cambiaron.
 *
 * Bing alimenta a ChatGPT search y a Copilot. Sin IndexNow recoge un precio,
 * un horario o una recogida nuevos solo cuando vuelve a pasar, que pueden ser
 * semanas. Con IndexNow se le avisa el mismo día. (Google NO usa IndexNow:
 * allí se reenvía el sitemap en Search Console.)
 *
 * 🔴 Correrlo DESPUÉS de comprobar que el deploy llegó a producción: un
 * `git push` en verde no es un despliegue (ref_huasteca_despliegue_railway).
 * El propio script lo comprueba: la clave viaja en el mismo build, así que si
 * producción no sirve el archivo de la clave, el deploy no llegó y no envía.
 *
 * Uso:
 *   npx tsx src/scripts/indexnow.ts             ENSAYO: imprime qué mandaría. No envía nada.
 *   npx tsx src/scripts/indexnow.ts --enviar    Envía de verdad.
 * Opciones:
 *   --todas         Todas las URLs del sitemap (la primera vez, o tras un cambio grande).
 *   --dias=N        Ventana de "cambios recientes", catálogo y blog (por defecto 7 días).
 *   --sitemap=URL   Leer otro sitemap, p. ej. http://localhost:3000/sitemap.xml para
 *                   probar el filtro. Con --enviar solo se admite el de producción.
 *
 * Qué manda por defecto:
 *   - Catálogo: SOLO si CATALOGO_ACTUALIZADO (src/lib/catalogoFecha.ts) cae dentro
 *     de los últimos N días, las URLs cuyo <lastmod> es esa fecha: fichas de tour,
 *     destinos, paquetes y sus landings, ES y EN.
 *   - Blog: los artículos con <lastmod> dentro de los últimos N días.
 *
 * Solo hace GET y un POST a IndexNow: no toca la base ni necesita .env.
 */

import { execFileSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { ARCHIVOS_DEL_CATALOGO, CATALOGO_ACTUALIZADO } from "@/lib/catalogoFecha";

const HOST = "www.huasteca-potosina.com";
// La clave es pública a propósito: IndexNow comprueba que el sitio es nuestro
// pidiendo este archivo. Para cambiarla: `openssl rand -hex 16`, renombrar
// public/<clave>.txt (su único contenido es la clave) y cambiarla aquí.
const KEY = "2a0d4d78b31bdce2e0733a209aeddc2b";
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
const SITEMAP_PROD = `https://${HOST}/sitemap.xml`;
const ENDPOINT = "https://api.indexnow.org/indexnow";
// Tope del protocolo por petición.
const MAX_POR_ENVIO = 10000;

// ── Argumentos ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const ENVIAR = args.indexOf("--enviar") >= 0;
const TODAS = args.indexOf("--todas") >= 0;
function valorDe(nombre: string): string | undefined {
  const a = args.filter((x) => x.indexOf(`--${nombre}=`) === 0)[0];
  return a ? a.slice(nombre.length + 3) : undefined;
}
const DIAS = Number(valorDe("dias") ?? 7);
const SITEMAP = valorDe("sitemap") ?? SITEMAP_PROD;

function aborta(msg: string): never {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
}

// ── 1. ¿Se subió la fecha del catálogo? ───────────────────────────────────────
// La guarda que falla sola: si alguien tocó TOURS_DB (o las fichas) en un
// commit posterior a CATALOGO_ACTUALIZADO, el sitemap de producción está
// declarando una fecha vieja. Enviar así avisaría de las URLs, pero dejaría a
// Google con un lastmod que miente; mejor parar y que se suba la fecha.
function revisaFechaCatalogo(): string | null {
  let ultimo = "";
  let sinCommit = "";
  try {
    ultimo = execFileSync("git", ["log", "-1", "--format=%cs", "--", ...ARCHIVOS_DEL_CATALOGO], { encoding: "utf8" }).trim();
    // Sin trim() al principio: la columna de estado (" M") empieza con espacio.
    sinCommit = execFileSync("git", ["status", "--porcelain", "--", ...ARCHIVOS_DEL_CATALOGO], { encoding: "utf8" }).replace(/\s+$/, "");
  } catch {
    console.log("· Sin git a mano: no se pudo comprobar la fecha del catálogo.");
    return null;
  }
  if (sinCommit) {
    console.log("⚠ Hay cambios del catálogo SIN commit (no están en producción todavía):");
    console.log(sinCommit.split("\n").map((l) => `    ${l}`).join("\n"));
  }
  if (ultimo && ultimo > CATALOGO_ACTUALIZADO) {
    return (
      `El catálogo cambió el ${ultimo} (último commit de ${ARCHIVOS_DEL_CATALOGO.join(", ")}), ` +
      `pero CATALOGO_ACTUALIZADO dice ${CATALOGO_ACTUALIZADO}. ` +
      `Súbela en src/lib/catalogoFecha.ts, despliega y vuelve a correr esto.`
    );
  }
  console.log(`✓ Fecha del catálogo al día (${CATALOGO_ACTUALIZADO}; último commit del catálogo: ${ultimo || "?"}).`);
  return null;
}

// ── 2. ¿Producción sirve la clave? ────────────────────────────────────────────
async function revisaClave(): Promise<string | null> {
  const local = join(process.cwd(), "public", `${KEY}.txt`);
  if (!existsSync(local) || readFileSync(local, "utf8").trim() !== KEY) {
    return `No existe public/${KEY}.txt con la clave: IndexNow rechazaría el envío (403).`;
  }
  try {
    const r = await fetch(KEY_LOCATION);
    const cuerpo = (await r.text()).trim();
    if (r.status !== 200 || cuerpo !== KEY) {
      return `${KEY_LOCATION} respondió ${r.status}${r.status === 200 ? " con otro contenido" : ""}: el deploy con la clave no ha llegado a producción.`;
    }
  } catch (e) {
    return `No se pudo leer ${KEY_LOCATION}: ${(e as Error).message}`;
  }
  console.log(`✓ Producción sirve la clave (${KEY_LOCATION}).`);
  return null;
}

// ── 3. Leer el sitemap ────────────────────────────────────────────────────────
type Entrada = { loc: string; lastmod: string | null };

async function leeSitemap(url: string): Promise<Entrada[]> {
  const r = await fetch(url);
  if (!r.ok) aborta(`${url} respondió ${r.status}.`);
  const xml = await r.text();
  const salida: Entrada[] = [];
  // Sin matchAll: el tsconfig no fija target y tsc no deja iterar el resultado.
  const bloque = /<url>([\s\S]*?)<\/url>/g;
  let m: RegExpExecArray | null;
  while ((m = bloque.exec(xml))) {
    const loc = /<loc>([^<]+)<\/loc>/.exec(m[1]);
    const lastmod = /<lastmod>([^<]+)<\/lastmod>/.exec(m[1]);
    if (loc) salida.push({ loc: loc[1].trim().replace(/&amp;/g, "&"), lastmod: lastmod ? lastmod[1].trim() : null });
  }
  return salida;
}

function esDelBlog(loc: string): boolean {
  const path = new URL(loc).pathname;
  return path === "/blog" || path.indexOf("/blog/") === 0;
}

// ── Programa ──────────────────────────────────────────────────────────────────
async function main() {
  console.log(ENVIAR ? "Modo: ENVÍO REAL a IndexNow\n" : "Modo: ENSAYO (no se envía nada; usa --enviar para mandar)\n");
  if (ENVIAR && SITEMAP !== SITEMAP_PROD) aborta("--enviar solo con el sitemap de producción: quita --sitemap.");
  if (!(DIAS >= 0)) aborta("--dias tiene que ser un número.");

  const problemaFecha = revisaFechaCatalogo();
  if (problemaFecha) {
    if (ENVIAR) aborta(problemaFecha);
    console.log(`⚠ ${problemaFecha}`);
  }

  const problemaClave = await revisaClave();
  if (problemaClave) {
    if (ENVIAR) aborta(problemaClave);
    console.log(`⚠ ${problemaClave} (en ensayo se sigue; con --enviar se detendría aquí)`);
  }

  const entradas = await leeSitemap(SITEMAP);
  console.log(`✓ Sitemap leído: ${SITEMAP} (${entradas.length} URLs).`);

  // URLs de otro host → IndexNow responde 422 a TODO el lote. Se descartan.
  const delHost = entradas.filter((e) => {
    try { return new URL(e.loc).host === HOST; } catch { return false; }
  });
  if (delHost.length < entradas.length) {
    console.log(`⚠ ${entradas.length - delHost.length} URLs de otro host descartadas.`);
  }

  let urls: string[];
  if (TODAS) {
    urls = delHost.map((e) => e.loc);
    console.log(`\n--todas: ${urls.length} URLs.`);
  } else {
    // Fecha en hora de México, como CATALOGO_ACTUALIZADO: con toISOString (UTC),
    // después de las 6 PM ya "era mañana" y el catálogo de hoy quedaba fuera.
    const desde = new Date(Date.now() - DIAS * 86400000).toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
    // 🔴 El catálogo entra solo si su fecha cae en la ventana. Sin esto, correr
    // el script el 10 oct para avisar de un blog nuevo reenviaba las ~145 URLs
    // del catálogo del 28 sep, que no cambiaron: IndexNow pide mandar solo lo
    // nuevo o cambiado, y los reenvíos sin cambios gastan cuota y hacen que
    // Bing le haga menos caso a nuestros avisos.
    const catalogoReciente = CATALOGO_ACTUALIZADO >= desde;
    const catalogo = catalogoReciente
      ? delHost.filter(
          (e) => !esDelBlog(e.loc) && e.lastmod !== null && e.lastmod.slice(0, 10) === CATALOGO_ACTUALIZADO,
        )
      : [];
    const blog = delHost.filter(
      (e) => esDelBlog(e.loc) && e.lastmod !== null && e.lastmod.slice(0, 10) >= desde,
    );
    if (!catalogoReciente) {
      console.log(
        `\n· Catálogo sin cambios en los últimos ${DIAS} días (CATALOGO_ACTUALIZADO = ${CATALOGO_ACTUALIZADO}): se omite. ` +
          `Para reenviarlo: --dias más grande o --todas.`,
      );
    } else if (catalogo.length === 0) {
      // Solo tiene sentido exigirlo cuando el catálogo es reciente: es la
      // prueba de que el sitemap de producción ya trae la fecha nueva.
      const msg =
        `El sitemap no tiene ninguna URL con lastmod ${CATALOGO_ACTUALIZADO}: ` +
        `producción sigue en la versión vieja o no se subió CATALOGO_ACTUALIZADO.`;
      if (ENVIAR) aborta(msg);
      console.log(`\n⚠ ${msg}`);
    }
    if (catalogoReciente) console.log(`\nCatálogo (lastmod ${CATALOGO_ACTUALIZADO}): ${catalogo.length} URLs`);
    console.log(`Blog (lastmod desde ${desde}, ${DIAS} días): ${blog.length} URLs`);
    urls = catalogo.concat(blog).map((e) => e.loc);
  }

  if (urls.length === 0) {
    console.log("\nNada que avisar.");
    return;
  }
  for (const u of urls) console.log(`  ${u}`);

  const cuerpoBase = { host: HOST, key: KEY, keyLocation: KEY_LOCATION };
  if (!ENVIAR) {
    console.log(`\nENSAYO: se mandaría POST ${ENDPOINT}`);
    console.log(JSON.stringify({ ...cuerpoBase, urlList: `[${urls.length} URLs]` }, null, 2));
    console.log("\nNo se envió nada. Para enviar: npx tsx src/scripts/indexnow.ts --enviar");
    return;
  }

  let fallos = 0;
  for (let i = 0; i < urls.length; i += MAX_POR_ENVIO) {
    const lote = urls.slice(i, i + MAX_POR_ENVIO);
    const r = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ ...cuerpoBase, urlList: lote }),
    });
    const texto = await r.text().catch(() => "");
    // 200 = recibido; 202 = recibido, la clave se validará después.
    if (r.status === 200 || r.status === 202) {
      console.log(`\n✓ Lote de ${lote.length} URLs aceptado (${r.status}).`);
      continue;
    }
    fallos++;
    const porQue: Record<number, string> = {
      400: "formato inválido",
      403: "clave no válida (¿el archivo de la clave no está en producción?)",
      422: "hay URLs de otro host o la clave no coincide con keyLocation",
      429: "demasiadas peticiones: esperar y reintentar más tarde",
    };
    console.error(`\n✖ Lote de ${lote.length} URLs rechazado: ${r.status} ${porQue[r.status] ?? ""}\n${texto.slice(0, 500)}`);
  }
  if (fallos) process.exit(1);
  console.log("\nListo. Revisa en Bing Webmaster Tools → IndexNow que lleguen los envíos.");
}

main().catch((e) => aborta((e as Error).stack ?? String(e)));
