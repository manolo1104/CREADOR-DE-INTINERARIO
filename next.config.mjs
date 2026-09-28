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
        // Vídeos de portada: pesan 1-3 MB y hoy se servían con `max-age=0`, así
        // que cada visita del mismo teléfono se los volvía a bajar.
        //
        // 🔴 Inmutable porque el nombre lleva versión (`-v1`): un vídeo nuevo se
        // sube con otro nombre, NUNCA encima del anterior. Sobrescribir dejaría
        // a quien ya visitó el sitio viendo el viejo durante un año — es el
        // mismo problema que ya pasó con las imágenes de next/image.
        source: "/videos/:path*",
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
      // ── Ligas cortas de la campaña del curso ────────────────────────────
      // Van a mano en mensajes de WhatsApp y en 26 correos: /taller se teclea
      // y se dicta mucho mejor que /curso/webinar. Son redirects y no
      // rewrites a propósito: el navbar del sitio se apaga con
      // `pathname.startsWith("/curso")`, y con un rewrite la URL seguiría
      // siendo /taller, así que el navbar volvería a aparecer encima del
      // embudo.
      { source: "/taller", destination: "/curso/webinar", permanent: false },
      { source: "/calculadora", destination: "/curso/calculadora", permanent: false },

      // ── Paquetes viejos → paquetes por tipo de viajero ───────────────────
      // El 10 sep 2026 los tres paquetes dejaron de ordenarse por duración
      // (aventura / completo / gran-huasteca) y pasaron a ordenarse por quién
      // viaja. Sus direcciones llevaban meses indexadas y salían en enlaces de
      // WhatsApp y correos, así que se redirigen al equivalente más cercano en
      // vez de dejarlas en 404. Permanentes (301) porque no van a volver.
      // 23 sep 2026: "Aventura Extrema" se reemplaza por el "Paquete Aventura"
      // (rafting + RZR + salto en Micos) y se queda con la dirección corta, así
      // que la redirección vieja SE QUITA: si se dejara, el paquete sería
      // inalcanzable, porque las redirecciones se evalúan antes que las páginas.
      { source: "/paquetes/aventura-extrema",    destination: "/paquetes/aventura",    permanent: true },
      { source: "/en/paquetes/aventura-extrema", destination: "/en/paquetes/aventura", permanent: true },
      { source: "/paquetes/completo",      destination: "/paquetes/gran-huasteca",    permanent: true },
      { source: "/en/paquetes/completo",      destination: "/en/paquetes/gran-huasteca",    permanent: true },

      // ── 23 sep 2026: el Familiar pasa a llamarse Gran Huasteca ───────────
      // `gran-huasteca` era el nombre de un paquete retirado y redirigía al
      // Odisea. Esa redirección SE QUITA porque ahora la dirección tiene dueño:
      // si se dejara, el paquete renombrado sería inalcanzable —las
      // redirecciones se evalúan antes que las páginas— y nadie vería por qué.
      { source: "/paquetes/familiar",    destination: "/paquetes/gran-huasteca",   permanent: true },
      { source: "/en/paquetes/familiar", destination: "/en/paquetes/gran-huasteca", permanent: true },

      // "Tu Huasteca" se retiró el 23 sep 2026. El que más se le parece es el
      // Odisea: varios días de tours saliendo del mismo hotel.
      { source: "/paquetes/tu-huasteca",    destination: "/paquetes/odisea-huasteca",    permanent: true },
      { source: "/en/paquetes/tu-huasteca", destination: "/en/paquetes/odisea-huasteca", permanent: true },

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
