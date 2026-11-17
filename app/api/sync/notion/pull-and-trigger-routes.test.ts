import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { startNotionSyncJob, createServerClient, leagueAdminDeniedResponse, getUser } = vi.hoisted(() => ({
  startNotionSyncJob: vi.fn(),
  createServerClient: vi.fn(),
  leagueAdminDeniedResponse: vi.fn(),
  getUser: vi.fn(),
}))

vi.mock("@/lib/sync/notion-sync-job", () => ({ startNotionSyncJob }))
vi.mock("@/lib/supabase/server", () => ({ createServerClient }))
vi.mock("@/lib/admin-api-auth", () => ({ leagueAdminDeniedResponse }))
vi.mock("@/lib/sync/notion-sync-worker", () => ({ syncNotionToSupabase: vi.fn() }))

import { POST as pullPost } from "./pull/route"
import { POST as incrementalPost } from "./pull/incremental/route"
import { POST as triggerPost } from "@/app/api/admin/trigger-notion-sync/route"

const SECRET = "sync-secret"

function post(path: string, body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
  vi.stubEnv("NOTION_PULL_SYNC_ENABLED", "true")
  vi.stubEnv("NOTION_SYNC_SECRET", SECRET)
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://supabase.test")
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role")
  startNotionSyncJob.mockResolvedValue({ kind: "started", jobId: "job-1" })
  getUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null })
  createServerClient.mockResolvedValue({ auth: { getUser } })
  leagueAdminDeniedResponse.mockResolvedValue(null)
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("POST /api/sync/notion/pull (bearer)", () => {
  const path = "/api/sync/notion/pull"

  it.each([
    ["missing header", undefined],
    ["wrong token", "Bearer nope"],
    ["lowercase scheme", `bearer ${SECRET}`],
    ["double space", `Bearer  ${SECRET}`],
    ["trailing junk", `Bearer ${SECRET} x`],
    ["raw secret without scheme", SECRET],
    ["empty token", "Bearer "],
  ])("401 for %s", async (_label, auth) => {
    const res = await pullPost(post(path, {}, auth ? { authorization: auth } : {}))
    expect(res.status).toBe(401)
    expect(startNotionSyncJob).not.toHaveBeenCalled()
  })

  it("401 when NOTION_SYNC_SECRET is unset or empty, even with an empty/any token", async () => {
    vi.stubEnv("NOTION_SYNC_SECRET", "")
    for (const auth of ["Bearer ", "Bearer anything", "Bearer "]) {
      const res = await pullPost(post(path, {}, { authorization: auth }))
      expect(res.status).toBe(401)
    }
    expect(startNotionSyncJob).not.toHaveBeenCalled()
  })

  it("starts a job with source 'bearer' and never allows large prunes from the body", async () => {
    const res = await pullPost(
      post(path, { scope: ["draft_board"], incremental: false, allowLargePrune: true }, {
        authorization: `Bearer ${SECRET}`,
        "x-forwarded-for": "203.0.113.5",
      }),
    )
    expect(res.status).toBe(200)
    const input = startNotionSyncJob.mock.calls[0]![0]
    expect(input.source).toBe("bearer")
    expect(input.requestIp).toBe("203.0.113.5")
    expect(input.options.allowLargePrune).toBe(false)
    expect(input.actorUserId ?? null).toBeNull()
  })

  it("records source 'n8n' when the n8n marker header is present", async () => {
    await pullPost(post(path, {}, { authorization: `Bearer ${SECRET}`, "x-sync-source": "n8n" }))
    expect(startNotionSyncJob.mock.calls[0]![0].source).toBe("n8n")
  })

  it("409 when a draft_board sync is already running", async () => {
    startNotionSyncJob.mockResolvedValue({ kind: "busy" })
    const res = await pullPost(post(path, { scope: ["draft_board"] }, { authorization: `Bearer ${SECRET}` }))
    expect(res.status).toBe(409)
    expect((await res.json()).code).toBe("SYNC_ALREADY_RUNNING")
  })
})

describe("POST /api/sync/notion/pull/incremental (bearer)", () => {
  it("401 without a valid strict bearer token and never starts a job", async () => {
    for (const auth of [undefined, "Bearer wrong", `Bearer  ${SECRET}`, SECRET]) {
      const res = await incrementalPost(post("/api/sync/notion/pull/incremental", {}, auth ? { authorization: auth } : {}))
      expect(res.status).toBe(401)
    }
    vi.stubEnv("NOTION_SYNC_SECRET", "")
    const res = await incrementalPost(post("/api/sync/notion/pull/incremental", {}, { authorization: "Bearer " }))
    expect(res.status).toBe(401)
    expect(startNotionSyncJob).not.toHaveBeenCalled()
  })
})

describe("POST /api/admin/trigger-notion-sync", () => {
  const path = "/api/admin/trigger-notion-sync"

  it("401 when not signed in", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null })
    const res = await triggerPost(post(path, {}))
    expect(res.status).toBe(401)
    expect(startNotionSyncJob).not.toHaveBeenCalled()
  })

  it("returns the admin denial for non-admins without starting a job", async () => {
    leagueAdminDeniedResponse.mockResolvedValue(new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }))
    const res = await triggerPost(post(path, {}))
    expect(res.status).toBe(403)
    expect(startNotionSyncJob).not.toHaveBeenCalled()
  })

  it("defaults to an incremental draft_board sync attributed to the admin (admin_ui)", async () => {
    const res = await triggerPost(post(path, {}, { "x-real-ip": "198.51.100.8" }))
    expect(res.status).toBe(200)
    const input = startNotionSyncJob.mock.calls[0]![0]
    expect(input.source).toBe("admin_ui")
    expect(input.actorUserId).toBe("admin-1")
    expect(input.requestIp).toBe("198.51.100.8")
    expect(input.options.scope).toEqual(["draft_board"])
    expect(input.options.incremental).toBe(true)
    expect(input.options.allowLargePrune).toBe(false)
  })

  it.each([
    [["pokemon"]],
    [["draft_board", "moves"]],
    [[]],
    ["draft_board"],
  ])("400 for scope %j", async (scope) => {
    const res = await triggerPost(post(path, { scope }))
    expect(res.status).toBe(400)
    expect(startNotionSyncJob).not.toHaveBeenCalled()
  })

  it("400 for a full sync without confirm: 'full'", async () => {
    for (const body of [{ incremental: false }, { incremental: false, confirm: "yes" }, { incremental: false, confirm: true }]) {
      const res = await triggerPost(post(path, body))
      expect(res.status, JSON.stringify(body)).toBe(400)
    }
    expect(startNotionSyncJob).not.toHaveBeenCalled()
  })

  it("400 for a non-boolean incremental", async () => {
    const res = await triggerPost(post(path, { incremental: "false" }))
    expect(res.status).toBe(400)
  })

  it("allows a confirmed full sync, and only that path may set allowLargePrune", async () => {
    const res = await triggerPost(post(path, { incremental: false, confirm: "full", allowLargePrune: true }))
    expect(res.status).toBe(200)
    expect(startNotionSyncJob.mock.calls[0]![0].options).toMatchObject({ incremental: false, allowLargePrune: true })
  })

  it("ignores allowLargePrune on an incremental sync, even with confirm", async () => {
    await triggerPost(post(path, { confirm: "full", allowLargePrune: true }))
    expect(startNotionSyncJob.mock.calls[0]![0].options.allowLargePrune).toBe(false)
  })

  it("confirmed full without allowLargePrune keeps the guard on", async () => {
    await triggerPost(post(path, { incremental: false, confirm: "full" }))
    expect(startNotionSyncJob.mock.calls[0]![0].options.allowLargePrune).toBe(false)
  })

  it("409 when a draft_board sync is already running", async () => {
    startNotionSyncJob.mockResolvedValue({ kind: "busy" })
    const res = await triggerPost(post(path, {}))
    expect(res.status).toBe(409)
  })
})
