/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["leaflet", "react-leaflet"],
  compress: true,
  images: {
    // AVIF/WebP reducen peso de imágenes ~30-50% → mejor LCP (factor de ranking).
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    remotePatterns: [
      { protocol: 'https', hostname: '**.unsplash.com' },
      { protocol: 'https', hostname: '**.githubusercontent.com' },
    ],
  },
  async headers() {
    return [
      {
        // Cabeceras de seguridad/rendimiento para todo el sitio.
        source: "/:path*",
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "origin-when-cross-origin" },
        ],
      },
      {
        // Caché agresiva e inmutable para imágenes estáticas (1 año).
        source: "/imagenes/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        // Caché para logos y favicon.
        source: "/logos/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // ── Apex sin www → www ───────────────────────────────────────────────
      // Todo el sitio se declara canónico en `www` (canonical, hreflang y
      // sitemap), así que el apex NO debe servir una segunda copia: redirige.
      //
      // Hasta el 16 ago 2026 el apex apuntaba al redireccionador de URL de
      // Namecheap (192.64.119.2), que SOLO habla HTTP: en el puerto 443 no
      // había nada escuchando y `connect` daba timeout. Como Chrome y Safari
      // prueban HTTPS primero, quien tecleaba "huasteca-potosina.com" a secas
      // veía una página colgada, y cualquier enlace al apex moría ahí.
      //
      // Este redirect solo entra en juego cuando el apex apunte a Railway
      // (registro ALIAS en Namecheap + el dominio dado de alta en Railway).
      // Mientras tanto es inofensivo: nadie llega con ese Host.
      {
        source: "/:path*",
        has: [{ type: "host", value: "huasteca-potosina.com" }],
        destination: "https://www.huasteca-potosina.com/:path*",
        permanent: true,
      },

      // ── Tour slug fixes ──────────────────────────────────────────────────
      { source: "/tours/ruta-surrealista",  destination: "/tours/ruta-surrealista-edward-james",    permanent: true },
      { source: "/tours/paraiso-escalonado",destination: "/tours/paraiso-escalonado-minas-micos",   permanent: true },
      { source: "/tours/ruta-acuatica",     destination: "/tours/ruta-acuatica-puente-de-dios",     permanent: true },

      // ── Blog: redirige URLs con año (/blog/slug-2026 → /blog/slug) ──────
      // Patrones genéricos para cualquier año 202x o 203x
      {
        source: "/blog/:slug(.*)-2026",
        destination: "/blog/:slug",
        permanent: true,
      },
      {
        source: "/blog/:slug(.*)-2025",
        destination: "/blog/:slug",
        permanent: true,
      },
      {
        source: "/blog/:slug(.*)-2027",
        destination: "/blog/:slug",
        permanent: true,
      },
      // Slugs publicados específicos (por si el patrón genérico no captura)
      { source: "/blog/comida-tipica-la-historia-detras-del-zacahuil-el-platillo-gi-2026",     destination: "/blog/comida-tipica-la-historia-detras-del-zacahuil-el-platillo-gi",     permanent: true },
      { source: "/blog/restaurantes-en-xilitla-gastronomia-potosina-los-mejores-pla-2026",     destination: "/blog/restaurantes-en-xilitla-gastronomia-potosina-los-mejores-pla",     permanent: true },
      { source: "/blog/itinerario-xilitla-itinerario-perfecto-de-3-dias-en-xilitla-2026",      destination: "/blog/itinerario-xilitla-itinerario-perfecto-de-3-dias-en-xilitla",      permanent: true },
      { source: "/blog/xilitla-con-ninos-actividades-para-ninos-en-xilitla-viajando-2026",     destination: "/blog/xilitla-con-ninos-actividades-para-ninos-en-xilitla-viajando",     permanent: true },
      { source: "/blog/opiniones-resena-lo-que-dicen-nuestros-huespedes-de-paraiso-2026",      destination: "/blog/opiniones-resena-lo-que-dicen-nuestros-huespedes-de-paraiso",      permanent: true },
    ];
  },
};

export default nextConfig;
