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
      const valor = limpia.slice(i + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[clave]) process.env[clave] = valor;
    }
  } catch {
    // sin .env.local: se usan las variables del entorno
  }
}
