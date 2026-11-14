import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

/** Recursively collect source files under app/components (browser + RSC surfaces). */
function walkSources(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) {
      if (name === "node_modules" || name === ".next") continue
      walkSources(full, out)
      continue
    }
    if (/\.(ts|tsx)$/.test(name) && !name.endsWith(".d.ts")) out.push(full)
  }
  return out
}

describe("nov14 security call-site audit", () => {
  it("app/components browser surfaces do not call is_admin / is_coach_of_team RPCs", () => {
    const roots = ["app", "components"]
    const hits: string[] = []
    for (const root of roots) {
      for (const file of walkSources(join(process.cwd(), root))) {
        const text = readFileSync(file, "utf8")
        if (
          /\.rpc\(\s*['"]is_admin['"]/.test(text) ||
          /\.rpc\(\s*['"]is_coach_of_team['"]/.test(text)
        ) {
          hits.push(file)
        }
      }
    }
    expect(hits).toEqual([])
  })

  it("sensitive tables are only queried from server/admin/discord/scripts paths", () => {
    const browserRoots = ["app", "components"]
    const allowedPathHints = [
      "/api/admin/",
      "/api/discord/",
      "/api/ai/",
      "lib/admin-api-auth",
      "lib/discord/",
      "lib/sync/",
      "scripts/",
    ]
    const sensitive =
      /\.from\(\s*['"](admin_users|api_keys|discord_guild_config|notion_mappings)['"]/
    const browserHits: string[] = []
    for (const root of browserRoots) {
      for (const file of walkSources(join(process.cwd(), root))) {
        const rel = file.replace(process.cwd() + "/", "")
        const text = readFileSync(file, "utf8")
        if (!sensitive.test(text)) continue
        // Server route handlers / admin UIs that still use browser client would be flagged
        const isServerRoute = rel.includes("/api/")
        const isServerComponent =
          !text.includes('"use client"') && !text.includes("'use client'")
        if (isServerRoute || isServerComponent) continue
        if (allowedPathHints.some((h) => rel.includes(h))) continue
        browserHits.push(rel)
      }
    }
    expect(browserHits).toEqual([])
  })
})
