import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { syncNotionToSupabase, createClient, createServerClient, leagueAdminDeniedResponse, createNotionSyncWorkflow } =
  vi.hoisted(() => ({
    syncNotionToSupabase: vi.fn(),
    createClient: vi.fn(),
    createServerClient: vi.fn(),
    leagueAdminDeniedResponse: vi.fn(),
    createNotionSyncWorkflow: vi.fn(),
  }))

vi.mock("@/lib/sync/notion-sync-worker", () => ({ syncNotionToSupabase }))
vi.mock("@supabase/supabase-js", () => ({ createClient }))
vi.mock("@/lib/supabase/server", () => ({ createServerClient }))
vi.mock("@/lib/admin-api-auth", () => ({ leagueAdminDeniedResponse }))
vi.mock("@/lib/n8n/workflow-manager", () => ({ createNotionSyncWorkflow }))
vi.mock("@/lib/discord-notifications", () => ({
  notifyDraftBoardSync: vi.fn(),
  notifyDraftBoardError: vi.fn(),
}))

import { POST as pullPost } from "./pull/route"
import { POST as incrementalPost } from "./pull/incremental/route"
import { POST as triggerPost } from "@/app/api/admin/trigger-notion-sync/route"
import { POST as n8nCreatePost } from "@/app/api/admin/n8n/create-workflow/route"

function req(path: string) {
  return new NextRequest(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer anything" },
    body: JSON.stringify({ scope: ["draft_board"] }),
  })
}

const gatedRoutes: Array<[string, (r: NextRequest) => Promise<Response>, string]> = [
  ["POST /api/sync/notion/pull", pullPost, "/api/sync/notion/pull"],
  ["POST /api/sync/notion/pull/incremental", incrementalPost, "/api/sync/notion/pull/incremental"],
  ["POST /api/admin/trigger-notion-sync", triggerPost, "/api/admin/trigger-notion-sync"],
  ["POST /api/admin/n8n/create-workflow", n8nCreatePost, "/api/admin/n8n/create-workflow"],
]

describe("Notion pull sync routes with NOTION_PULL_SYNC_ENABLED unset", () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    vi.stubEnv("NOTION_PULL_SYNC_ENABLED", "")
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it.each(gatedRoutes)("%s returns 410 before auth or any DB work", async (_name, handler, path) => {
    const res = await handler(req(path))

    expect(res.status).toBe(410)
    const body = await res.json()
    expect(body.code).toBe("NOTION_PULL_SYNC_DISABLED")

    expect(syncNotionToSupabase).not.toHaveBeenCalled()
    expect(createClient).not.toHaveBeenCalled()
    expect(createServerClient).not.toHaveBeenCalled()
    expect(leagueAdminDeniedResponse).not.toHaveBeenCalled()
    expect(createNotionSyncWorkflow).not.toHaveBeenCalled()
  })
})
