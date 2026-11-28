import { buildPreciosMd } from "@/lib/llmsTxt";

// Precios en Markdown para asistentes de IA (27 nov 2026). Igual que llms.txt:
// se arma en cada petición para que nunca quede con un catálogo viejo.
export const dynamic = "force-dynamic";

export async function GET() {
  return new Response(buildPreciosMd("es"), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
