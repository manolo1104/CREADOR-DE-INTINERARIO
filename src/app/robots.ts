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
  "Google-Extended",     // Gemini / Vertex (entrenamiento)
  "Applebot-Extended",   // Apple Intelligence
  "meta-externalagent",  // Meta AI (Llama / Meta AI en WhatsApp e Instagram)
  "Bytespider",          // ByteDance / TikTok AI
  "Amazonbot",           // Amazon (Alexa / Rufus)
  "YouBot",              // You.com
  "cohere-ai",           // Cohere
  "CCBot",               // Common Crawl (alimenta a varios LLMs)
];

// Rutas privadas/sin valor SEO que ningún bot debe rastrear.
//
// OJO con lo que NO está aquí:
// - `/planear` se quitó a propósito. Estaba bloqueada Y aun así indexada (41
//   impresiones, posición 18,41). Bloquear en robots.txt impide RASTREAR, no
//   INDEXAR: mientras Google no pueda entrar, tampoco puede leer el noindex y
//   la URL se queda en el índice para siempre. Ahora entra, lee el
//   `robots: { index: false }` de src/app/planear/page.tsx y la saca.
//   Si algún día se vuelve a encender el generador, el camino inverso es
//   quitar ese noindex, NO volver a poner el Disallow.
// - `/_next/image` tampoco: todas las fotos del sitio se sirven por ahí
//   (next/image), así que bloquearlo dejaría a Googlebot-Image sin poder
//   descargar las imágenes tal y como aparecen en las páginas.
const PRIVATE_PATHS = ["/admin", "/api/"];

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
