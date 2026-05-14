/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["leaflet", "react-leaflet"],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.unsplash.com' },
      { protocol: 'https', hostname: '**.githubusercontent.com' },
    ],
  },
  async redirects() {
    return [
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
