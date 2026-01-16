/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Exclude discord.js from server-side bundling (uses native modules)
  serverExternalPackages: ['discord.js'],
}

export default nextConfig
