/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Requerido en Next.js 13.x para server actions ("use server")
    serverActions: true,
  },
  env: {
    // Inyectado en build time — fuerza al browser a descargar el SW actualizado en cada deploy
    NEXT_PUBLIC_BUILD_ID: Date.now().toString(),
  },
}

module.exports = nextConfig
