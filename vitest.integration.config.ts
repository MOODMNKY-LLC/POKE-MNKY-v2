import { defineConfig } from "vitest/config"
import tsconfigPaths from "vite-tsconfig-paths"

/**
 * Dedicated config for disposable-DB integration suites.
 * Kept separate so unit `pnpm test:run` never counts skipped PG/HTTP cases as passes.
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["**/*.pg.test.ts", "**/*.http.integration.test.ts"],
    exclude: ["node_modules", ".next", "e2e/**"],
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
})
