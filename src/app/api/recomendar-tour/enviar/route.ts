/**
 * Mandar por correo el plan que la persona YA está viendo (10 oct 2026).
 *
 * Por qué existe: hasta hoy el recomendador pedía el correo ANTES de enseñar
 * nada —`setStep("correo")` era la única salida de las 7 preguntas— y en nueve
 * días de Clarity 8 personas lo empezaron y solo 2 dejaron su correo; las demás
 * contestaron todo y se fueron. Ahora el plan se enseña primero y el correo se
 * ofrece después, así que hace falta una ruta que arranque la secuencia SIN
 * volver a calcular la recomendación.
 *
 * No se reusa `/api/recomendar-tour` a propósito: eso pagaría una segunda
 * corrida de la IA y podría elegir otros tours, con lo que el correo diría una
 * cosa y la pantalla otra.
 *
 * Los ids llegan del navegador, así que se validan contra `TOURS_DB` y
 * `PAQUETES_DB`: nadie manda un correo con un tour inventado.
 */
import { NextRequest, NextResponse } from "next/server";
import { TOURS_DB } from "@/lib/tours";
import { PAQUETES_DB } from "@/lib/paquetes";
import { rateLimit } from "@/lib/rateLimit";
import { guardarLead, esEmailValido } from "@/lib/leads";
import { arrancarSecuenciaRecomendador, FUENTE_RECOMENDADOR } from "@/lib/leadSequenceStart";
import { razonEmitida } from "@/lib/razonesRecomendador";

export const runtime = "nodejs";

/** id del tour → slug (la secuencia de correos trabaja con slugs). */
const slugDe = (id: unknown): string | null =>
  typeof id === "string" ? TOURS_DB.find((t) => t.id === id)?.slug ?? null : null;

const texto = (v: unknown, max: number): string =>
  typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { key: "recomendar-enviar", limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const email = body.email;
  if (!esEmailValido(email)) {
    return NextResponse.json({ error: "Correo inválido" }, { status: 400 });
  }

  // Sin un tour principal de verdad no hay correo que armar: `buildLeadSequenceEmail`
  // devuelve null y la persona vería «listo» sin recibir nada.
  const tourPrincipal = slugDe(body.primaryId);
  if (!tourPrincipal) {
    return NextResponse.json({ error: "Recomendación inválida" }, { status: 400 });
  }
  const tourSecundario = slugDe(body.secondaryId);
  const paquete = typeof body.paquete === "string"
    ? PAQUETES_DB.find((p) => p.slug === body.paquete)?.slug ?? null
    : null;

  // La libreta, igual que en la ruta que calcula el plan: sin `await`, porque es
  // la libreta y no el producto.
  void guardarLead(email, FUENTE_RECOMENDADOR);

  const r = await arrancarSecuenciaRecomendador(email, {
    grupo:          texto(body.grupo, 30)  || null,
    dias:           texto(body.dias, 20)   || null,
    origen:         texto(body.origen, 60) || null,
    intereses:      Array.isArray(body.intereses)
      ? body.intereses.filter((x): x is string => typeof x === "string").map((x) => x.slice(0, 40)).slice(0, 6)
      : [],
    tourPrincipal,
    tourSecundario,
    paquete,
    // La redacción que la persona está leyendo en pantalla, para que el correo
    // abra con lo mismo. 🔴 Solo si la escribió NUESTRA IA: llega del navegador,
    // y aceptar cualquier texto dejaba mandar correos con nuestro remitente y
    // el mensaje de un tercero (`lib/razonesRecomendador.ts`).
    razonIA:        razonEmitida(body.razonIA),
  });

  // `ya-enviado` no es un fallo: ese correo ya salió antes y la secuencia sigue
  // su curso, así que para la persona está bien. Cualquier otro motivo (no se
  // pudo registrar, Brevo falló) significa que NO le va a llegar nada: decirle
  // «listo» sería mentirle, y se devuelve error para que reintente.
  if (!r.enviado && r.motivo !== "ya-enviado") {
    return NextResponse.json({ error: "No pudimos mandarlo" }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
}
