import { buildPreciosMd } from "@/lib/llmsTxt";

// Gemelo en inglés de /precios.md (ver ese archivo).
export const dynamic = "force-dynamic";

export async function GET() {
  return new Response(buildPreciosMd("en"), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
