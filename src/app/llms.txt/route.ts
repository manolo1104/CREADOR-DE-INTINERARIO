import { blogParaLlms, buildLlmsTxt } from "@/lib/llmsTxt";

// Igual que sitemap.ts: se arma en cada petición para que no pueda quedar
// congelado con un catálogo viejo.
export const dynamic = "force-dynamic";

export async function GET() {
  // Los artículos del blog salen de la base; si falla, el archivo sale igual
  // sin esa sección (`blogParaLlms` devuelve []). El inglés no los lleva: el
  // blog solo existe en español.
  const blog = await blogParaLlms();
  return new Response(buildLlmsTxt("es", blog), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
