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
  // Disable source maps in development (Webpack compatibility)
  // This fixes "Invalid source map" errors on Windows when using Webpack
  // Note: This only applies when using Webpack (--webpack flag or dev:webpack script)
  // Turbopack source maps are handled differently and may show harmless warnings
  webpack: (config, { dev }) => {
    if (dev) {
      config.devtool = false
    }
    return config
  },
  // Turbopack configuration
  // Turbopack is the default bundler in Next.js 16
  turbopack: {},
  // Experimental features to help with module resolution
  experimental: {
    // Optimize package imports to reduce bundle size and HMR issues
    // This helps Next.js only load the modules we actually use from streamdown
    optimizePackageImports: ['streamdown'],
  },
}

export default nextConfig
