import { NextRequest, NextResponse } from "next/server";
import { TOURS_DB } from "@/lib/tours";

export const runtime = "nodejs";

// Rule-based fallback scoring when AI is unavailable
function fallbackMatch(intereses: string[], grupo: string, actividad: string) {
  const scores: Record<string, number> = {
    "tour-tamul":       0,
    "tour-edward-james":0,
    "tour-meco":        0,
    "tour-minas-micos": 0,
    "tour-puente-dios": 0,
  };

  if (intereses.some((i) => ["Fotografía perfecta", "Cascadas turquesas"].includes(i))) {
    scores["tour-meco"]        += 3;
    scores["tour-minas-micos"] += 2;
  }
  if (intereses.includes("Aventura extrema")) {
    scores["tour-tamul"]       += 3;
    scores["tour-puente-dios"] += 2;
  }
  if (intereses.some((i) => ["Arte y cultura", "Historia"].includes(i))) {
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

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  return { primaryId: sorted[0][0], secondaryId: sorted[1][0] };
}

export async function POST(req: NextRequest) {
  const { origen, grupo, intereses, actividad } = await req.json();

  const toursInfo = TOURS_DB.map(
    (t) =>
      `ID: ${t.id} | Nombre: ${t.nombre} | Tipo: ${t.tipo} | Dificultad: ${t.dificultad} | Duración: ${t.duracion_hrs}h | Precio: $${t.precio} MXN | Destinos: ${t.destinos.join(", ")}`
  ).join("\n");

  const prompt = `Eres un asesor de ventas experto de tours en la Huasteca Potosina. Tu objetivo es recomendar el tour perfecto para este viajero y convencerlo de reservarlo.

PERFIL DEL VIAJERO:
- Ciudad de origen: ${origen}
- Viaja: ${grupo}
- Le interesa: ${intereses.join(", ")}
- Nivel de actividad: ${actividad}

TOURS DISPONIBLES:
${toursInfo}

Analiza el perfil y responde ÚNICAMENTE con JSON válido (sin markdown, sin texto extra antes o después):
{
  "primary": {
    "tourId": "<id exacto del tour>",
    "reason": "<2-3 oraciones personalizadas que expliquen POR QUÉ este tour es perfecto para ELLOS específicamente, menciona su origen y tipo de grupo, usa tono emocionante y personal>",
    "highlight": "<frase corta impactante de máximo 8 palabras que capture la esencia de por qué es perfecto para ellos>"
  },
  "secondary": {
    "tourId": "<id del segundo mejor tour>",
    "reason": "<1-2 oraciones explicando por qué también podría gustarles>"
  }
}`;

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    const { primaryId, secondaryId } = fallbackMatch(intereses, grupo, actividad);
    const primary = TOURS_DB.find((t) => t.id === primaryId)!;
    const secondary = TOURS_DB.find((t) => t.id === secondaryId)!;
    return NextResponse.json({
      primary: {
        tourId: primaryId,
        reason: `${primary.descripcion}`,
        highlight: primary.tagline,
      },
      secondary: {
        tourId: secondaryId,
        reason: secondary.tagline,
      },
    });
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":         "application/json",
        "x-api-key":            apiKey,
        "anthropic-version":    "2023-06-01",
      },
      body: JSON.stringify({
        model:      "claude-haiku-4-5-20251001",
        max_tokens: 600,
        messages:   [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) throw new Error(`Anthropic ${res.status}`);

    const data = await res.json();
    const text = data.content?.[0]?.text ?? "";
    const result = JSON.parse(text);

    return NextResponse.json(result);
  } catch {
    const { primaryId, secondaryId } = fallbackMatch(intereses, grupo, actividad);
    const primary   = TOURS_DB.find((t) => t.id === primaryId)!;
    const secondary = TOURS_DB.find((t) => t.id === secondaryId)!;
    return NextResponse.json({
      primary: {
        tourId:    primaryId,
        reason:    primary.descripcion,
        highlight: primary.tagline,
      },
      secondary: {
        tourId: secondaryId,
        reason: secondary.tagline,
      },
    });
  }
}
