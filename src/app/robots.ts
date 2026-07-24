import type { MetadataRoute } from "next";

// Bots de modelos de lenguaje (LLMs) que queremos permitir explícitamente para
// que el contenido del sitio pueda ser citado/recomendado por asistentes de IA
// (ChatGPT, Claude, Perplexity, Gemini, Apple Intelligence, etc.).
const LLM_BOTS = [
  "GPTBot",            // OpenAI / ChatGPT
  "OAI-SearchBot",     // OpenAI Search
  "ChatGPT-User",      // ChatGPT browsing
  "ClaudeBot",         // Anthropic / Claude
  "anthropic-ai",      // Anthropic (legacy)
  "Claude-Web",        // Claude web
  "PerplexityBot",     // Perplexity
  "Perplexity-User",   // Perplexity browsing
  "Google-Extended",   // Gemini / Vertex (entrenamiento)
  "Applebot-Extended", // Apple Intelligence
  "CCBot",             // Common Crawl (alimenta a varios LLMs)
];

// Rutas privadas/sin valor SEO que ningún bot debe rastrear.
const PRIVATE_PATHS = ["/admin", "/api/", "/planear"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Regla general (Googlebot, Bingbot y cualquier otro)
      {
        userAgent: "*",
        allow: "/",
        disallow: PRIVATE_PATHS,
      },
      // Permitir explícitamente a los crawlers de LLMs todo el contenido público
      {
        userAgent: LLM_BOTS,
        allow: "/",
        disallow: PRIVATE_PATHS,
      },
    ],
    sitemap: [
      "https://www.huasteca-potosina.com/sitemap.xml",
      // Imágenes aparte: Next 14 no emite el campo `images` del sitemap principal.
      "https://www.huasteca-potosina.com/sitemap-imagenes.xml",
    ],
    host: "https://www.huasteca-potosina.com",
  };
}
