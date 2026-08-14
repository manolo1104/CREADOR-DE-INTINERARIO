import { buildLlmsTxt } from "@/lib/llmsTxt";

// Gemelo en inglés de `/llms.txt`. Existe porque el sitio ya está traducido
// pero este archivo no lo estaba: un asistente respondiendo en inglés leía el
// catálogo en español. Las rutas no se heredan entre árboles, así que se
// declara aquí igual que los layouts de /en.
export const dynamic = "force-dynamic";

export function GET() {
  return new Response(buildLlmsTxt("en"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
