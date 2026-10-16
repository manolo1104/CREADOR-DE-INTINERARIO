import { buildLlmsFullTxt } from "@/lib/llmsTxt";
import { viajeCdmxParaLlms } from "@/lib/viajeCdmx/llms";

// Gemelo en inglés de `/llms-full.txt`. Ver la nota en `en/llms.txt/route.ts`.
export const dynamic = "force-dynamic";

export async function GET() {
  const viaje = await viajeCdmxParaLlms("en");
  return new Response(buildLlmsFullTxt("en", [], viaje), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
