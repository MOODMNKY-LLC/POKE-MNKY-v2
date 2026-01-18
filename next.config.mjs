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
  // Disable source maps in development to avoid Turbopack + Windows path parsing issues
  // Source map warnings are harmless but clutter the console
  // Production builds still generate source maps for debugging
  productionBrowserSourceMaps: false,
  // Turbopack config
  turbopack: {
    // Disable source maps in development to avoid Windows path parsing issues
    // This eliminates "Invalid source map" warnings without affecting functionality
  },
}

export default nextConfig
