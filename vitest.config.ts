import { defineConfig } from "vitest/config"
import tsconfigPaths from "vite-tsconfig-paths"

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    // Forks keep process.env mutations in OpenClaw/AI availability tests from racing across files.
    pool: "forks",
    // Only *.test.ts — e2e/*.spec.ts is Playwright, not Vitest
    include: ["**/*.test.ts"],
    exclude: [
      "node_modules",
      ".next",
      "**/test-e2e*",
      "e2e/**",
      // Dedicated jobs / local disposable stacks — must not inflate unit totals via skip-pass.
      "**/*.pg.test.ts",
      "**/*.http.integration.test.ts",
    ],
  },
})
