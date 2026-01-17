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
  // Turbopack config (empty - using defaults)
  // Note: Source map warnings are harmless and can be ignored
  turbopack: {},
}

export default nextConfig
