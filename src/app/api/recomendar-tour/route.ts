import { NextRequest, NextResponse } from "next/server";
import { TOURS_DB } from "@/lib/tours";
import { TOUR_ACTIVITIES } from "@/lib/tourActivities";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

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
  };

  if (intereses.some((i) => ["Fotografía perfecta", "Cascadas turquesas"].includes(i))) {
    scores["tour-meco"]         += 3;
    scores["tour-minas-micos"]  += 2;
    scores["tour-rappel-tamul"] += 1;
    scores["tour-rafting-tampaon"] += 1;
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
  }
  if (grupo === "Solo/Sola") {
    scores["tour-rappel-tamul"] += 1;
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
  }
  if (actividad === "Tranquilo") {
    scores["tour-minas-micos"]  += 2;
    scores["tour-edward-james"] += 1;
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

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  return { primaryId: sorted[0][0], secondaryId: sorted[1][0] };
}

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { key: "recomendar-tour", limit: 15, windowMs: 60_000 });
  if (limited) return limited;

  const { origen, grupo, intereses, actividad, destino } = await req.json();

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
- Le emociona: ${intereses.join(", ")}
- Nivel de actividad: ${actividad}
${destinoLine}

CONTEXTO DE VENTA:
${origenNudge}

TOURS DISPONIBLES (con actividades específicas):
${toursInfo}

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
4. Tono: cálido, experto, como un amigo local — no un folleto turístico. Nada genérico.

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
  }
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

    return NextResponse.json(result);
  } catch (err) {
    console.error("recomendar-tour: usando respaldo —", err);
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
    });
  }
}
