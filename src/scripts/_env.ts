/**
 * Carga .env.local en process.env. `npx tsx` no lo hace solo (a diferencia de
 * `next dev`), así que todo script que toque Stripe o la base de datos lo llama
 * antes de crear su cliente.
 */
import { readFileSync } from "fs";
import { join } from "path";

export function cargarEnv(archivo = ".env.local") {
  try {
    const texto = readFileSync(join(process.cwd(), archivo), "utf8");
    for (const linea of texto.split("\n")) {
      const limpia = linea.trim();
      if (!limpia || limpia.charAt(0) === "#") continue;
      const i = limpia.indexOf("=");
      if (i < 0) continue;
      const clave = limpia.slice(0, i).trim();
      // Los `\$` escapados del .env se devuelven a su forma literal: los hashes
      // bcrypt están hechos de `$` y llegarían mutilados.
      const valor = limpia.slice(i + 1).trim().replace(/^["']|["']$/g, "").replace(/\\\$/g, "$");
      if (!process.env[clave]) process.env[clave] = valor;
    }
  } catch {
    // sin .env.local: se usan las variables del entorno
  }
}

/**
 * A qué base de datos va a escribir un script, sin enseñar la contraseña.
 * Va impreso antes de tocar nada: un script que escribe en producción tiene
 * que decirlo, no dejarlo a la suerte de qué .env.local haya en la carpeta.
 */
export function describeBase(): string {
  const url = process.env.DATABASE_URL ?? "";
  try {
    const u = new URL(url);
    const local = u.hostname === "localhost" || u.hostname.startsWith("127.");
    return `${u.hostname}:${u.port}${u.pathname}  ${local ? "(base local)" : "\u26a0\ufe0f  PRODUCCIÓN"}`;
  } catch {
    return "sin DATABASE_URL";
  }
}
