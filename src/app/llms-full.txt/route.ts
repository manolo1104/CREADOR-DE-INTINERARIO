import { blogParaLlms, buildLlmsFullTxt } from "@/lib/llmsTxt";

export const dynamic = "force-dynamic";

export async function GET() {
  // Ver la nota en `llms.txt/route.ts`: blog de la base, con red si falla.
  const blog = await blogParaLlms();
  return new Response(buildLlmsFullTxt("es", blog), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
