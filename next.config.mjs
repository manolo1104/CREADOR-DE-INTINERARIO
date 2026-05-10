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
      {
        source: "/tours/ruta-surrealista",
        destination: "/tours/ruta-surrealista-edward-james",
        permanent: true,
      },
      {
        source: "/tours/paraiso-escalonado",
        destination: "/tours/paraiso-escalonado-minas-micos",
        permanent: true,
      },
      {
        source: "/tours/ruta-acuatica",
        destination: "/tours/ruta-acuatica-puente-de-dios",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
