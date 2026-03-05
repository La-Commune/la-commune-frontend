/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    // Inyectado en build time — fuerza al browser a descargar el SW actualizado en cada deploy
    NEXT_PUBLIC_BUILD_ID: Date.now().toString(),
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion", "recharts"],
  },
}

module.exports = nextConfig
