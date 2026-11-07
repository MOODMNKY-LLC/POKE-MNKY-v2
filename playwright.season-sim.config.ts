import { defineConfig, devices } from "@playwright/test"
import path from "node:path"

/**
 * Browser acceptance against an already-running disposable real-server stack.
 * No webServer — bring-up script owns Next + GoTrue + DB.
 *
 * Env (set by scripts/season-sim/bring-up-real-server-stack.sh):
 *   BASE_URL / APP_BASE_URL
 *   NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   SEASON_SIM_NONADMIN_EMAIL / SEASON_SIM_NONADMIN_PASSWORD
 *   SEASON_SIM_OUTSIDER_EMAIL / SEASON_SIM_OUTSIDER_PASSWORD (optional)
 *   SEASON_SIM_FLAGS_OFF_URL (optional second Next with flags OFF for 503)
 *   SEASON_SIM_BROWSER_ARTIFACT_DIR
 */

const baseURL = (
  process.env.BASE_URL ??
  process.env.APP_BASE_URL ??
  "http://127.0.0.1:3010"
).replace(/\/$/, "")

const artifactDir =
  process.env.SEASON_SIM_BROWSER_ARTIFACT_DIR ??
  path.join("/opt/cursor/artifacts", "season-sim-browser")
// Playwright rmdir(outputDir) fails with ENOTEMPTY on fuse.agent-store
// artifact mounts. Keep traces/videos on a real local filesystem; curated
// screenshots still go to artifactDir via the spec's shot() helper.
const playwrightOutputDir =
  process.env.SEASON_SIM_PLAYWRIGHT_OUTPUT_DIR ??
  path.join("/tmp", "season-sim-browser-playwright-output")

export default defineConfig({
  testDir: "./e2e",
  testMatch: /season-sim-demo-browser\.spec\.ts/,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  // Champion path + reset is long; leave headroom so context teardown
  // (trace finalize) cannot consume the entire budget after assertions pass.
  timeout: 15 * 60 * 1000,
  expect: { timeout: 30_000 },
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: path.join(playwrightOutputDir, "html-report") }],
  ],
  outputDir: path.join(playwrightOutputDir, "test-results"),
  use: {
    baseURL,
    // Full-run tracing made successful champion tests fail in After Hooks
    // ("Tearing down context exceeded the test timeout"). Keep artifacts on failure.
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    locale: "en-US",
  },
  projects: [
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
    {
      name: "mobile-390",
      use: {
        ...devices["Pixel 7"],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
})
