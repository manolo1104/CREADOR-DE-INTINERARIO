import { NextRequest, NextResponse } from "next/server";
import { TOURS_DB } from "@/lib/tours";
import { TOUR_ACTIVITIES } from "@/lib/tourActivities";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

function fallbackMatch(intereses: string[], grupo: string, actividad: string, destino: string) {
  const scores: Record<string, number> = {
    "tour-tamul":        0,
    "tour-edward-james": 0,
    "tour-meco":         0,
    "tour-minas-micos":  0,
    "tour-puente-dios":  0,
  };

  if (intereses.some((i) => ["Fotografía perfecta", "Cascadas turquesas"].includes(i))) {
    scores["tour-meco"]        += 3;
    scores["tour-minas-micos"] += 2;
  }
  if (intereses.includes("Aventura extrema")) {
    scores["tour-tamul"]       += 3;
    scores["tour-puente-dios"] += 2;
  }
  if (intereses.some((i) => ["Arte y cultura"].includes(i))) {
    scores["tour-edward-james"] += 3;
  }
  if (intereses.includes("Relax total")) {
    scores["tour-minas-micos"] += 2;
    scores["tour-meco"]        += 1;
  }
  if (grupo === "Familia con niños") {
    scores["tour-minas-micos"] += 2;
    scores["tour-meco"]        += 1;
    scores["tour-tamul"]       -= 1;
  }
  if (grupo === "Con amigos") {
    scores["tour-tamul"]       += 2;
    scores["tour-puente-dios"] += 1;
  }
  if (grupo === "En pareja") {
    scores["tour-edward-james"] += 1;
    scores["tour-meco"]         += 1;
  }
  if (actividad === "Intenso") {
    scores["tour-tamul"]       += 2;
    scores["tour-puente-dios"] += 1;
  }
  if (actividad === "Tranquilo") {
    scores["tour-minas-micos"] += 2;
    scores["tour-edward-james"]+= 1;
  }
  // Bonus for matching destino
  if (destino.includes("Tamul") || destino.includes("Huahuas"))    scores["tour-tamul"]       += 4;
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
  Tipo: ${t.tipo} | Dificultad: ${t.dificultad} | Duración: ${t.duracion_hrs}h | Precio: $${t.precio} MXN
  Destinos: ${t.destinos.join(", ")}
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
        messages:   [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) throw new Error(`Anthropic ${res.status}`);

    const data   = await res.json();
    const text   = data.content?.[0]?.text ?? "";
    const result = JSON.parse(text);

    return NextResponse.json(result);
  } catch {
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
