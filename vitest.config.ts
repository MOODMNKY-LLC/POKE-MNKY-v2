import { defineConfig } from "vitest/config"
import tsconfigPaths from "vite-tsconfig-paths"

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    // Only *.test.ts — e2e/*.spec.ts is Playwright, not Vitest
    include: ["**/*.test.ts"],
    exclude: ["node_modules", ".next", "**/test-e2e*", "e2e/**"],
  },
})
