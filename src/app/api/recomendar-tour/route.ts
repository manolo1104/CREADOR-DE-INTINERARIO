import { NextRequest, NextResponse } from "next/server";
import { TOURS_DB } from "@/lib/tours";
import { PAQUETES_DB, type Paquete } from "@/lib/paquetes";
import { TOUR_ACTIVITIES } from "@/lib/tourActivities";
import { rateLimit } from "@/lib/rateLimit";
// alias: en este archivo `actividad` ya es el nivel de actividad del formulario
import { actividad as logActividad, nombreCorto, logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { registrarLead, esEmailValido } from "@/lib/leads";
import { sendBrevoEmail } from "@/lib/brevo";
import { buildLeadSequenceEmail } from "@/lib/leadSequenceEmail";

export const runtime = "nodejs";

// id del tour → nombre legible (corto) para el log
const nombreDe = (id: string): string =>
  nombreCorto(TOURS_DB.find((t) => t.id === id)?.nombre) || id;

// id del tour → slug (la secuencia de correos trabaja con slugs)
const slugDe = (id: string): string | null =>
  TOURS_DB.find((t) => t.id === id)?.slug ?? null;

/**
 * Registra al lead con su recomendación y le manda el primer correo al momento.
 * Se llama sin `await`: si algo falla aquí, el usuario igual ve su resultado.
 */
async function arrancarSecuencia(
  email: unknown,
  ctx: {
    origen?: unknown; grupo?: unknown; intereses?: unknown; dias?: unknown;
    primaryId: string; secondaryId: string; paquete: Paquete | null;
  },
) {
  if (!esEmailValido(email)) return;
  try {
    const { esNuevo } = (await registrarLead(email, "Recomendador", {
      grupo:          typeof ctx.grupo  === "string" ? ctx.grupo  : null,
      dias:           typeof ctx.dias   === "string" ? ctx.dias   : null,
      origen:         typeof ctx.origen === "string" ? ctx.origen : null,
      intereses:      Array.isArray(ctx.intereses) ? ctx.intereses.map(String) : [],
      tourPrincipal:  slugDe(ctx.primaryId),
      tourSecundario: slugDe(ctx.secondaryId),
      paquete:        ctx.paquete?.slug ?? null,
    })) ?? { esNuevo: false };

    // El primer correo solo se manda una vez, aunque use el recomendador varias.
    if (!esNuevo) return;

    const contenido = buildLeadSequenceEmail({
      paso: 1,
      grupo: typeof ctx.grupo === "string" ? ctx.grupo : null,
      dias:  typeof ctx.dias  === "string" ? ctx.dias  : null,
      tourPrincipal:  slugDe(ctx.primaryId),
      tourSecundario: slugDe(ctx.secondaryId),
    });
    if (!contenido) return;

    await sendBrevoEmail({ to: [{ email }], subject: contenido.subject, htmlContent: contenido.html });
    await prisma.lead.updateMany({
      where: { email, fuente: "Recomendador" },
      data:  { emailsSent: 1, lastEmailAt: new Date() },
    });
    logActividad("📧  SECUENCIA 1/4", email, nombreDe(ctx.primaryId));
  } catch (e) {
    logger.error("secuencia_lead_paso1_failed", {
      reason: e instanceof Error ? e.message : "desconocido",
    });
  }
}

/**
 * Selección DETERMINÍSTICA del paquete por días disponibles (la IA solo redacta el porqué):
 * 1-2 días → sin paquete (tours sueltos) · 3 → Aventura · 4 → Completo · 5+ → Gran Huasteca.
 * `dias` llega como texto del wizard ("3 días", "5 o más días").
 */
function paqueteForDias(dias: string | undefined): Paquete | null {
  if (!dias) return null;
  const n = parseInt(dias, 10);
  if (!Number.isFinite(n) || n < 3) return null;
  // Paquete con `dias` más cercano sin pasarse; 5+ cae al más largo.
  const sorted = [...PAQUETES_DB].sort((a, b) => a.dias - b.dias);
  let mejor = sorted[0];
  for (const p of sorted) if (p.dias <= n) mejor = p;
  return mejor;
}

/** Pulls clean JSON out of a model response that may include ```json fences or prose. */
function extractJson(raw: string): string {
  let s = raw.trim();
  // Drop leading/trailing markdown code fences if present.
  s = s.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const first = s.indexOf("{");
  const last  = s.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    return s.slice(first, last + 1);
  }
  return s;
}

function fallbackMatch(intereses: string[], grupo: string, actividad: string, destino: string) {
  const scores: Record<string, number> = {
    "tour-rzr-xilitla":  0,
    "tour-rappel-tamul": 0,
    "tour-rafting-tampaon": 0,
    "tour-tamul":        0,
    "tour-edward-james": 0,
    "tour-meco":         0,
    "tour-minas-micos":  0,
    "tour-puente-dios":  0,
    "tour-buceo-media-luna": 0,
  };

  if (intereses.some((i) => ["Fotografía perfecta", "Cascadas turquesas"].includes(i))) {
    scores["tour-meco"]         += 3;
    scores["tour-minas-micos"]  += 2;
    scores["tour-rappel-tamul"] += 1;
    scores["tour-rafting-tampaon"] += 1;
    scores["tour-buceo-media-luna"] += 1;
  }
  if (intereses.includes("Aventura extrema")) {
    scores["tour-rappel-tamul"] += 4;
    scores["tour-rafting-tampaon"] += 4;
    scores["tour-tamul"]        += 3;
    scores["tour-rzr-xilitla"]  += 3;
    scores["tour-puente-dios"]  += 2;
  }
  if (intereses.some((i) => ["Arte y cultura"].includes(i))) {
    scores["tour-edward-james"] += 3;
  }
  if (intereses.includes("Relax total")) {
    scores["tour-minas-micos"]  += 2;
    scores["tour-meco"]         += 1;
    scores["tour-buceo-media-luna"] += 2;
    scores["tour-rappel-tamul"] -= 2;
    scores["tour-rafting-tampaon"] -= 2;
    scores["tour-rzr-xilitla"]  -= 1;
  }
  if (grupo === "Familia con niños") {
    scores["tour-minas-micos"]  += 2;
    scores["tour-rzr-xilitla"]  += 2;
    scores["tour-meco"]         += 1;
    scores["tour-tamul"]        -= 1;
    scores["tour-rappel-tamul"] -= 3;
    scores["tour-rafting-tampaon"] -= 2;
    scores["tour-buceo-media-luna"] -= 2;  // edad mínima 10 años
  }
  if (grupo === "Con amigos") {
    scores["tour-rzr-xilitla"]  += 3;
    scores["tour-rafting-tampaon"] += 3;
    scores["tour-rappel-tamul"] += 2;
    scores["tour-tamul"]        += 2;
    scores["tour-puente-dios"]  += 1;
  }
  if (grupo === "En pareja") {
    scores["tour-edward-james"] += 1;
    scores["tour-meco"]         += 1;
    scores["tour-rappel-tamul"] += 1;
    scores["tour-rzr-xilitla"]  += 1;
    scores["tour-buceo-media-luna"] += 2;
  }
  if (grupo === "Solo/Sola") {
    scores["tour-rappel-tamul"] += 1;
    scores["tour-buceo-media-luna"] += 2;
  }
  if (actividad === "Intenso") {
    scores["tour-rappel-tamul"] += 3;
    scores["tour-rafting-tampaon"] += 3;
    scores["tour-rzr-xilitla"]  += 2;
    scores["tour-tamul"]        += 2;
    scores["tour-puente-dios"]  += 1;
  }
  if (actividad === "Moderado") {
    scores["tour-rzr-xilitla"]  += 1;
    scores["tour-buceo-media-luna"] += 1;
  }
  if (actividad === "Tranquilo") {
    scores["tour-minas-micos"]  += 2;
    scores["tour-edward-james"] += 1;
    scores["tour-buceo-media-luna"] += 2;
    scores["tour-rappel-tamul"] -= 2;
    scores["tour-rafting-tampaon"] -= 2;
    scores["tour-rzr-xilitla"]  -= 1;
  }
  // Bonus for matching destino
  if (destino.includes("RZR") || destino.includes("off-road") || destino.includes("Nanacatli")) scores["tour-rzr-xilitla"] += 4;
  if (destino.includes("Tamul"))                                  { scores["tour-tamul"] += 4; scores["tour-rappel-tamul"] += 3; }
  if (destino.includes("Tampaón") || destino.toLowerCase().includes("rafting")) scores["tour-rafting-tampaon"] += 4;
  if (destino.includes("Huahuas") || destino.includes("Golondrinas")) scores["tour-tamul"] += 4;
  if (destino.includes("Pozas") || destino.includes("Edward"))     scores["tour-edward-james"]+= 4;
  if (destino.includes("Meco"))                                    scores["tour-meco"]        += 4;
  if (destino.includes("Minas") || destino.includes("Micos"))      scores["tour-minas-micos"] += 4;
  if (destino.includes("Puente") || destino.includes("Tamasopo"))  scores["tour-puente-dios"] += 4;
  if (destino.includes("Media Luna") || destino.toLowerCase().includes("buceo") || destino.includes("Rioverde")) scores["tour-buceo-media-luna"] += 4;

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  return { primaryId: sorted[0][0], secondaryId: sorted[1][0] };
}

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { key: "recomendar-tour", limit: 15, windowMs: 60_000 });
  if (limited) return limited;

  const { origen, grupo, intereses, actividad, destino, dias, email } = await req.json();

  const paquete = paqueteForDias(dias);
  // Texto de respaldo del paquete (se usa si no hay IA o si la IA no redacta el suyo).
  const paqueteFallback = paquete
    ? {
        slug:   paquete.slug,
        reason: `${paquete.subtitulo}. Con ${dias} te alcanza perfecto para este plan: ${paquete.duracion} con hospedaje en el Hotel Paraíso Encantado de Xilitla, tours guiados y transporte coordinado — tú solo te preocupas por llegar.`,
      }
    : null;

  const toursInfo = TOURS_DB.map(
    (t) =>
      `ID: ${t.id}
  Nombre: ${t.nombre}
  Tipo: ${t.tipo} | Dificultad: ${t.dificultad} | Duración: ${t.duracion_hrs}h | Precio: $${t.precio} MXN ${t.precioUnidad === "vehiculo" ? "POR VEHÍCULO (desde; según ruta y unidad)" : "por persona"}
  Destinos: ${t.destinos.join(", ")}
  Incluye: ${t.incluye.join("; ")}
  ${TOUR_ACTIVITIES[t.id] ?? ""}`
  ).join("\n\n---\n\n");

  const destinoLine = destino && destino !== "Sin preferencia — sorpréndeme"
    ? `- Destino que no se puede perder: ${destino}`
    : "- Abierto a cualquier destino";

  // Contextual nudge based on origin
  const origenNudge =
    origen.includes("CDMX") || origen.includes("Ciudad de México")
      ? "Para alguien de CDMX, la Huasteca funciona como el escape perfecto al verde, al agua y al silencio — lo opuesto a la ciudad."
      : origen.includes("Monterrey")
        ? "Para alguien de Monterrey, la Huasteca es el destino natural más cercano con agua cristalina de verdad."
        : origen.includes("Guadalajara")
          ? "Para alguien de Guadalajara, la Huasteca ofrece una naturaleza completamente diferente a lo conocido — selva tropical, ríos turquesa y cañones."
          : `Para alguien que viene desde ${origen}, la Huasteca representa una naturaleza que no existe en ningún otro lugar de México.`;

  const prompt = `Eres el mejor asesor de ventas de experiencias en la Huasteca Potosina. Tu misión es crear una recomendación tan personal y vivid que el viajero sienta que este tour fue diseñado exactamente para él.

PERFIL COMPLETO DEL VIAJERO:
- Origen: ${origen}
- Viaja: ${grupo}
- Días disponibles para el viaje: ${dias || "no especificado"}
- Le emociona: ${intereses.join(", ")}
- Nivel de actividad: ${actividad}
${destinoLine}

CONTEXTO DE VENTA:
${origenNudge}

TOURS DISPONIBLES (con actividades específicas):
${toursInfo}
${paquete ? `
PAQUETE RECOMENDADO PARA SUS DÍAS (ya seleccionado, NO lo cambies):
- Nombre: ${paquete.nombre} (${paquete.duracion})
- Slug: ${paquete.slug}
- Precio: $${paquete.precio.toLocaleString("es-MX")} MXN ${paquete.precioLabel} (2 personas)
- Incluye: ${paquete.incluye.slice(0, 6).join("; ")}
- Itinerario: ${paquete.itinerario.map((d, i) => `Día ${i + 1}: ${d.titulo}`).join(" · ")}
- Hospedaje: Hotel Paraíso Encantado, Xilitla` : ""}

REGLAS DE SELECCIÓN (haz esto ANTES de redactar):
- Si el viajero mencionó un DESTINO específico que "no se puede perder" (es decir, distinto de "Abierto a cualquier destino"), el tour PRINCIPAL DEBE ser el que cubra ese destino. Esto manda por encima de todo lo demás. La única excepción es la seguridad: nunca pongas una experiencia de dificultad alta o aventura extrema como principal para una "Familia con niños"; en ese caso elige la alternativa segura más parecida y explícalo.
- Solo cuando NO haya un destino específico, elige el tour cuya combinación de tipo, dificultad, destinos y actividades encaje mejor con el perfil, ponderando con fuerza los INTERESES.
- En ausencia de destino, si le emociona la "Aventura extrema" o su nivel es "Intenso", prioriza la experiencia más adrenalínica que encaje (p. ej. el rappel frente a la Cascada de Tamul o el recorrido en RZR) por encima de los tours contemplativos.
- NUNCA recomiendes una experiencia de dificultad alta o de aventura extrema como opción principal para una "Familia con niños"; para familias prioriza tours seguros y aptos para todos.
- El catálogo mezcla tours de día completo y actividades enfocadas (como el rappel). Sé HONESTO con lo que cada una incluye: si una experiencia NO incluye transporte o alimentos, no la describas como "todo incluido" ni prometas traslados o comidas que no existen. Apóyate en el campo "Incluye".

REGLAS DE REDACCIÓN:
1. La "reason" debe tener 5-7 oraciones. ESTRUCTURA OBLIGATORIA:
   - Oración 1: Conecta su origen + grupo con el tour ("Para [grupo] que viene de [ciudad], este tour es...")
   - Oración 2-3: Describe 2-3 momentos específicos del tour usando los detalles de actividades (sótano, canoa, clavados, agua turquesa, etc.) con lenguaje sensorial — colores, sonidos, sensaciones físicas.
   - Oración 4: Justifica por qué encaja con sus INTERESES específicos (si le gustan las fotos, menciona el ángulo perfecto; si le gusta aventura, el clavado; si relax, las pozas tranquilas).
   - Oración 5: Si mencionó un destino, confirma que el tour lo cubre o explica por qué esta alternativa es igual o mejor.
   - Oración 6-7: Cierre emocional + urgencia sutil ("Este es uno de los tours que más se llenan los fines de semana — reservar con anticipación garantiza tu lugar").
2. El "highlight" es una frase de máximo 10 palabras que capture POR QUÉ es perfecto PARA ELLOS.
3. Para el tour secundario: 2-3 oraciones explicando qué lo diferencia y por qué también encaja.
4. Tono: cálido, experto, como un amigo local — no un folleto turístico. Nada genérico.${paquete ? `
5. Como el viajero tiene ${dias}, TAMBIÉN redacta "paqueteReason": 3-4 oraciones vendiendo el paquete indicado arriba como EL plan completo para sus días — conecta su perfil (grupo, intereses, origen) con el itinerario día por día y el hospedaje en Xilitla, y menciona que todo va coordinado (tours + hotel + transporte local). Sé honesto: el precio es por pareja. Los tours primary/secondary deben ser los que más encajen con su perfil DE ENTRE los incluidos en el itinerario del paquete cuando sea posible.` : ""}

Responde ÚNICAMENTE con JSON válido (sin markdown, sin texto antes ni después):
{
  "primary": {
    "tourId": "<id exacto del tour>",
    "reason": "<5-7 oraciones siguiendo la estructura — personal, vivid, con urgencia>",
    "highlight": "<frase de impacto ≤10 palabras>"
  },
  "secondary": {
    "tourId": "<id del segundo mejor tour>",
    "reason": "<2-3 oraciones diferenciando y conectando con su perfil>"
  }${paquete ? `,
  "paqueteReason": "<3-4 oraciones vendiendo el paquete como plan completo para sus días>"` : ""}
}`;

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    const { primaryId, secondaryId } = fallbackMatch(intereses, grupo, actividad, destino ?? "");
    const primary   = TOURS_DB.find((t) => t.id === primaryId)!;
    const secondary = TOURS_DB.find((t) => t.id === secondaryId)!;
    return NextResponse.json({
      primary: {
        tourId:    primaryId,
        reason:    primary.descripcionLarga?.split("\n\n")[0] ?? primary.descripcion,
        highlight: primary.tagline,
      },
      secondary: {
        tourId: secondaryId,
        reason: secondary.descripcion,
      },
      paquete: paqueteFallback,
    });
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model:      "claude-haiku-4-5-20251001",
        max_tokens: 1200,
        messages:   [
          { role: "user",      content: prompt },
          // Prefill the assistant turn with "{" so the model is forced to
          // continue valid JSON instead of wrapping it in ```json fences.
          { role: "assistant", content: "{" },
        ],
      }),
    });

    if (!res.ok) throw new Error(`Anthropic ${res.status}`);

    const data   = await res.json();
    // Re-add the prefilled "{" and strip any stray markdown fences, then
    // slice from the first "{" to the last "}" before parsing — robust to
    // models that occasionally add prose or code fences around the JSON.
    const raw    = "{" + (data.content?.[0]?.text ?? "");
    const result = JSON.parse(extractJson(raw));

    // La IA a veces alucina IDs (p. ej. "tour-micos" en vez de "tour-minas-micos").
    // Se validan contra TOURS_DB: exacto → corrección difusa → respaldo por puntajes.
    const fb = fallbackMatch(intereses, grupo, actividad, destino ?? "");
    const resolveTourId = (id: unknown, respaldo: string): string => {
      if (typeof id !== "string" || !id) return respaldo;
      if (TOURS_DB.some((t) => t.id === id)) return id;
      const stem = id.replace(/^tour-/, "");
      const fuzzy = TOURS_DB.find((t) => t.id.includes(stem) || stem.includes(t.id.replace(/^tour-/, "")));
      return fuzzy?.id ?? respaldo;
    };
    const primaryId = resolveTourId(result?.primary?.tourId, fb.primaryId);
    let secondaryId = resolveTourId(result?.secondary?.tourId, fb.secondaryId);
    if (secondaryId === primaryId) secondaryId = fb.secondaryId !== primaryId ? fb.secondaryId : fb.primaryId;

    // El slug del paquete lo decide el servidor (determinístico por días);
    // la IA solo aporta la redacción personalizada.
    logActividad(
      "✨  RECOMENDACIÓN LISTA",
      grupo,
      origen ? `desde ${origen}` : undefined,
      dias,
      Array.isArray(intereses) ? `quiere: ${intereses.join(", ")}` : undefined,
      actividad,
      `→ ${nombreDe(primaryId)}`,
      `(2º ${nombreDe(secondaryId)})`,
      paquete ? `+ ${paquete.nombre}` : undefined,
      typeof email === "string" && email ? email : undefined,
    );

    // Guarda al lead CON su recomendación y arranca la secuencia. Antes el
    // correo solo se anotaba en una hoja y nadie le volvía a escribir.
    void arrancarSecuencia(email, { origen, grupo, intereses, dias, primaryId, secondaryId, paquete });

    return NextResponse.json({
      ...result,
      primary:   { ...result.primary,   tourId: primaryId },
      secondary: { ...result.secondary, tourId: secondaryId },
      paquete: paquete
        ? { slug: paquete.slug, reason: result.paqueteReason || paqueteFallback!.reason }
        : null,
    });
  } catch (err) {
    console.error("recomendar-tour: usando respaldo —", err);
    const { primaryId, secondaryId } = fallbackMatch(intereses, grupo, actividad, destino ?? "");
    const primary   = TOURS_DB.find((t) => t.id === primaryId)!;
    const secondary = TOURS_DB.find((t) => t.id === secondaryId)!;
    logActividad(
      "✨  RECOMENDACIÓN LISTA",
      grupo,
      origen ? `desde ${origen}` : undefined,
      dias,
      Array.isArray(intereses) ? `quiere: ${intereses.join(", ")}` : undefined,
      actividad,
      `→ ${nombreDe(primaryId)}`,
      `(2º ${nombreDe(secondaryId)})`,
      paquete ? `+ ${paquete.nombre}` : undefined,
      typeof email === "string" && email ? email : undefined,
    );
    return NextResponse.json({
      primary: {
        tourId:    primaryId,
        reason:    primary.descripcionLarga?.split("\n\n")[0] ?? primary.descripcion,
        highlight: primary.tagline,
      },
      secondary: {
        tourId: secondaryId,
        reason: secondary.descripcion,
      },
      paquete: paqueteFallback,
    });
  }
}
