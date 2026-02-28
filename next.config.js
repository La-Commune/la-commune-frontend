/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["framer-motion"],
  env: {
    // Inyectado en build time — fuerza al browser a descargar el SW actualizado en cada deploy
    NEXT_PUBLIC_BUILD_ID: Date.now().toString(),
  },
}

module.exports = nextConfig
