import { buildLlmsTxt } from "@/lib/llmsTxt";

// Igual que sitemap.ts: se arma en cada petición para que no pueda quedar
// congelado con un catálogo viejo.
export const dynamic = "force-dynamic";

export function GET() {
  return new Response(buildLlmsTxt(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
