/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  /* Separate caches so demo (:3000) and prototype lane (:3001) don't stomp each other. */
  distDir: process.env.PROTOTYPE_LANE === '1' ? '.next-prototype' : '.next',
  experimental: {
    serverComponentsExternalPackages: ['@cursor/sdk'],
  },
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'raw.githubusercontent.com',
        pathname: '/luukhopman/football-logos/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
}

module.exports = nextConfig
