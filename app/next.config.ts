import path from 'path';
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mover el directorio de build/caché a un path local para evitar
  // el problema de filesystem lento en unidades de red o HDD externo.
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  // Fix: Turbopack resuelve @import "tailwindcss" desde el workspace root
  // (CValleTienda) en vez de desde el proyecto (CValleTienda/app).
  // El alias fuerza la resolución al path correcto.
  turbopack: {
    resolveAlias: {
      tailwindcss: path.join(__dirname, 'node_modules/tailwindcss'),
    },
  },
};

export default nextConfig;
