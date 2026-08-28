/**
 * probar-propuesta-instantanea.ts — ¿sale la propuesta del recomendador EN EL
 * MOMENTO, una sola vez, y se recupera si Brevo falla?
 *
 * Nace de un fallo que estuvo vivo semanas sin dar un solo error: el formulario
 * del recomendador llamaba a `/api/guardar-email` antes de pedir la
 * recomendación, esa llamada creaba la fila del lead, y entonces
 * `/api/recomendar-tour` ya no veía a la persona como nueva y NO le mandaba su
 * propuesta. Le llegaba en la siguiente corrida del cron horario — hasta una
 * hora después de pedirla, y con el correo del "paso 1" como si nada.
 *
 * No se veía porque no fallaba: el correo salía, solo que tarde.
 *
 * ── Cómo se prueba sin mandar nada y sin tocar producción ──────────────────
 *
 * Base de datos: Postgres LOCAL y vacío (ver receta abajo). Brevo: se
 * intercepta `globalThis.fetch`, así que no sale ni un correo y además se puede
 * contar cuántos envíos se intentaron y forzar un fallo del proveedor.
 *
 *   export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"
 *   initdb -D /tmp/pgdata-huasteca -U postgres --auth=trust
 *   pg_ctl -D /tmp/pgdata-huasteca -o "-p 5440 -k /tmp" -l /tmp/pg.log start
 *   createdb -h 127.0.0.1 -p 5440 -U postgres huasteca_prueba
 *   DATABASE_URL="postgresql://postgres@127.0.0.1:5440/huasteca_prueba" \
 *     npx prisma db push --skip-generate
 *   DATABASE_URL="postgresql://postgres@127.0.0.1:5440/huasteca_prueba" \
 *     npx tsx src/scripts/probar-propuesta-instantanea.ts
 *
 * Sale con código 1 si alguna prueba falla.
 */

const LOCAL = "postgresql://postgres@127.0.0.1:5440/huasteca_prueba";

if (!process.env.DATABASE_URL) process.env.DATABASE_URL = LOCAL;
if (!/127\.0\.0\.1|localhost/.test(process.env.DATABASE_URL)) {
  // Esta prueba ESCRIBE. Contra la base de producción sería inaceptable.
  console.error("\n✗ DATABASE_URL no apunta a una base local. Abortado.\n");
  process.exit(1);
}
process.env.BREVO_API_KEY = "llave-de-prueba-nunca-usada";
// Firma el enlace de baja del pie. En producción es `ADMIN_JWT_SECRET`, que ya
// es obligatoria; aquí da igual el valor, solo que exista.
process.env.BAJA_SECRET = "prueba-de-secuencia";
process.env.GOOGLE_SHEETS_ID = "";

// ── El interceptor de Brevo ────────────────────────────────────────────────
// `sendBrevoEmail` usa el `fetch` global. Cambiarlo aquí es lo que permite
// probar el envío de verdad —el mismo builder, el mismo asunto— sin que salga
// ni un correo, y poder simular una caída del proveedor.
const enviados: { to: string; subject: string }[] = [];
let brevoFalla = false;
const fetchReal = globalThis.fetch;
globalThis.fetch = (async (entrada: any, init?: any) => {
  const url = typeof entrada === "string" ? entrada : entrada?.url ?? "";
  if (url.includes("api.brevo.com")) {
    const cuerpo = JSON.parse(String(init?.body ?? "{}"));
    if (brevoFalla) return new Response("cuota agotada", { status: 402 });
    enviados.push({ to: cuerpo.to?.[0]?.email ?? "", subject: cuerpo.subject ?? "" });
    return new Response(JSON.stringify({ messageId: "prueba" }), {
      status: 201, headers: { "content-type": "application/json" },
    });
  }
  return fetchReal(entrada, init);
}) as typeof fetch;

import { prisma } from "../lib/prisma";
import { arrancarSecuenciaRecomendador, FUENTE_RECOMENDADOR } from "../lib/leadSequenceStart";

const CTX = {
  grupo:          "En pareja",
  dias:           "3 días",
  origen:         "Ciudad de México",
  intereses:      ["Cascadas turquesas", "Fotografía perfecta"],
  tourPrincipal:  "expedicion-tamul",
  tourSecundario: "ruta-acuatica-puente-de-dios",
  paquete:        "aventura",
};

let fallos = 0;
function comprobar(nombre: string, ok: boolean, detalle = "") {
  console.log(`  ${ok ? "✅" : "❌"}  ${nombre}${detalle ? `  · ${detalle}` : ""}`);
  if (!ok) fallos++;
}

const leadDe = (email: string) =>
  prisma.lead.findUnique({ where: { email_fuente: { email, fuente: FUENTE_RECOMENDADOR } } });

async function main() {
  await prisma.lead.deleteMany({});
  console.log("\n  Base local limpia. Brevo interceptado (no sale ningún correo).\n");

  // ── 1. El camino normal ────────────────────────────────────────────────
  console.log("  1 · Alguien nuevo termina el recomendador");
  const r1 = await arrancarSecuenciaRecomendador("nueva@ejemplo.com", CTX);
  const l1 = await leadDe("nueva@ejemplo.com");
  comprobar("manda la propuesta al instante", r1.enviado, enviados[0]?.subject);
  comprobar("el lead queda en emailsSent = 1", l1?.emailsSent === 1, `emailsSent=${l1?.emailsSent}`);
  comprobar("guarda SU recomendación, no una de relleno", l1?.tourPrincipal === "expedicion-tamul", String(l1?.tourPrincipal));

  // ── 2. EL FALLO: la fila ya existe porque otra llamada la creó ─────────
  // Es exactamente lo que hacía `/api/guardar-email` desde el propio
  // formulario, con la misma fuente y un tour de relleno. Antes del arreglo
  // esto dejaba a la persona SIN propuesta al instante.
  console.log("\n  2 · La fila ya existía (la carrera que rompía el envío)");
  enviados.length = 0;
  await prisma.lead.create({
    data: { email: "carrera@ejemplo.com", fuente: FUENTE_RECOMENDADOR, tourPrincipal: "expedicion-tamul", emailsSent: 0 },
  });
  const r2 = await arrancarSecuenciaRecomendador("carrera@ejemplo.com", CTX);
  const l2 = await leadDe("carrera@ejemplo.com");
  comprobar("manda igual, aunque la fila ya estuviera creada", r2.enviado, `motivo=${r2.motivo ?? "—"}`);
  comprobar("y la deja en emailsSent = 1", l2?.emailsSent === 1, `emailsSent=${l2?.emailsSent}`);

  // ── 3. Que no se repita ────────────────────────────────────────────────
  console.log("\n  3 · La misma persona usa el recomendador otra vez");
  enviados.length = 0;
  const r3 = await arrancarSecuenciaRecomendador("nueva@ejemplo.com", { ...CTX, tourPrincipal: "cascadas-del-meco" });
  comprobar("NO le manda un segundo paso 1", !r3.enviado && r3.motivo === "ya-enviado", `motivo=${r3.motivo}`);
  comprobar("no se intentó ningún envío", enviados.length === 0, `envíos=${enviados.length}`);
  const l3 = await leadDe("nueva@ejemplo.com");
  comprobar("pero sí actualiza su contexto nuevo", l3?.tourPrincipal === "cascadas-del-meco", String(l3?.tourPrincipal));

  // ── 4. La carrera con el cron horario ──────────────────────────────────
  // El cron mira el mismo `emailsSent: 0`. Si el apartado no fuera atómico,
  // dos procesos a la vez mandarían la propuesta dos veces.
  console.log("\n  4 · Dos procesos a la vez sobre el mismo lead");
  enviados.length = 0;
  const a_la_vez = await Promise.all([
    arrancarSecuenciaRecomendador("simultanea@ejemplo.com", CTX),
    arrancarSecuenciaRecomendador("simultanea@ejemplo.com", CTX),
    arrancarSecuenciaRecomendador("simultanea@ejemplo.com", CTX),
  ]);
  comprobar("exactamente UN envío", enviados.length === 1, `envíos=${enviados.length}`);
  comprobar("solo una llamada dice haber enviado", a_la_vez.filter((r) => r.enviado).length === 1);

  // ── 5. Si Brevo se cae ─────────────────────────────────────────────────
  console.log("\n  5 · Brevo contesta error (cuota agotada)");
  enviados.length = 0;
  brevoFalla = true;
  const r5 = await arrancarSecuenciaRecomendador("caida@ejemplo.com", CTX);
  brevoFalla = false;
  const l5 = await leadDe("caida@ejemplo.com");
  comprobar("informa que no se envió", !r5.enviado, `motivo=${r5.motivo}`);
  comprobar("devuelve el contador a 0 para que el cron reintente", l5?.emailsSent === 0, `emailsSent=${l5?.emailsSent}`);
  comprobar("el lead sigue activo", l5?.status === "activo", String(l5?.status));

  // Y el reintento funciona de verdad.
  const r5b = await arrancarSecuenciaRecomendador("caida@ejemplo.com", CTX);
  comprobar("al reintentar, sí sale", r5b.enviado);

  // ── 6. Sin tour no se inventa un correo ────────────────────────────────
  console.log("\n  6 · Sin tour recomendado");
  enviados.length = 0;
  const r6 = await arrancarSecuenciaRecomendador("sintour@ejemplo.com", { ...CTX, tourPrincipal: null });
  const l6 = await leadDe("sintour@ejemplo.com");
  comprobar("no manda nada", !r6.enviado && r6.motivo === "sin-tour", `motivo=${r6.motivo}`);
  comprobar("y no gasta el paso 1", l6?.emailsSent === 0, `emailsSent=${l6?.emailsSent}`);

  // ── 7. El correo es el de verdad ───────────────────────────────────────
  console.log("\n  7 · Lo que se mandó");
  enviados.length = 0;
  await arrancarSecuenciaRecomendador("contenido@ejemplo.com", CTX);
  const correo = enviados[0];
  comprobar("va a la persona correcta", correo?.to === "contenido@ejemplo.com", correo?.to);
  comprobar("con un asunto real, no vacío", !!correo?.subject && !/undefined|NaN/.test(correo.subject), correo?.subject);

  await prisma.lead.deleteMany({});
  await prisma.$disconnect();

  console.log(fallos ? `\n  ❌ ${fallos} comprobación(es) fallaron\n` : "\n  ✅ Todo correcto: la propuesta sale al instante, una sola vez.\n");
  process.exit(fallos ? 1 : 0);
}

main().catch(async (e) => {
  console.error("\n✗ Falló:", e instanceof Error ? e.message : e);
  await prisma.$disconnect();
  process.exit(1);
});
