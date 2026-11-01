/** @type {import('next').NextConfig} */
const nextConfig = {
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
  // Transpile packages to prevent Turbopack HMR issues
  // This includes them more "natively" in the build, reducing module factory errors
  // streamdown stays out of optimizePackageImports; StreamdownWrapper lazy-loads it.
  transpilePackages: ['streamdown', 'lucide-react'],
  // Turbopack is the default bundler in Next.js 16.
  // Next 16.4 dropped experimental.turbopackUseSystemTlsCerts (the config schema
  // rejects unknown keys). Corporate TLS inspection should use NODE_EXTRA_CA_CERTS.
  turbopack: {},
  async redirects() {
    return [{ source: "/bracket", destination: "/playoffs", permanent: false }]
  },
}

export default nextConfig
