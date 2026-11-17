import { NextRequest, NextResponse } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { createClient, createServerClient, getUser, leagueAdminDeniedResponse } = vi.hoisted(() => ({
  createClient: vi.fn(),
  createServerClient: vi.fn(),
  getUser: vi.fn(),
  leagueAdminDeniedResponse: vi.fn(),
}))

vi.mock("@supabase/supabase-js", () => ({ createClient }))
vi.mock("@/lib/supabase/server", () => ({ createServerClient }))
vi.mock("@/lib/admin-api-auth", () => ({ leagueAdminDeniedResponse }))

import { GET } from "./route"

const RAW_DB_ERROR = "relation sync_jobs exploded: raw-db-error-sentinel"

function statusRequest(query = "") {
  return new NextRequest(`http://localhost/api/sync/notion/status${query}`)
}

function mockJobsQuery(result: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(result),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
  }
  createClient.mockReturnValue({ from: vi.fn().mockReturnValue(chain) })
}

describe("GET /api/sync/notion/status", () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
    vi.spyOn(console, "error").mockImplementation(() => {})
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://supabase.test")
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role")
    vi.stubEnv("NOTION_PULL_SYNC_ENABLED", "true")
    createServerClient.mockResolvedValue({ auth: { getUser } })
    getUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null })
    leagueAdminDeniedResponse.mockResolvedValue(null)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it("401 for anonymous: no pull_sync_enabled, no jobs, no service-role client, no admin check", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null })

    const res = await GET(statusRequest())
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body).toEqual({ error: "Unauthorized" })
    expect(body).not.toHaveProperty("pull_sync_enabled")
    expect(body).not.toHaveProperty("jobs")
    expect(leagueAdminDeniedResponse).not.toHaveBeenCalled()
    expect(createClient).not.toHaveBeenCalled()
  })

  it("401 when getUser returns an error", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "x" } }, error: new Error("jwt expired") })
    const res = await GET(statusRequest())
    expect(res.status).toBe(401)
    expect(createClient).not.toHaveBeenCalled()
  })

  it("403 for a signed-in non-admin, with no DB read and no pull_sync_enabled", async () => {
    leagueAdminDeniedResponse.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }))

    const res = await GET(statusRequest())
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(leagueAdminDeniedResponse).toHaveBeenCalledWith("admin-1")
    expect(body).not.toHaveProperty("pull_sync_enabled")
    expect(body).not.toHaveProperty("jobs")
    expect(createClient).not.toHaveBeenCalled()
  })

  it("200 for an admin with sanitized jobs and pull_sync_enabled", async () => {
    mockJobsQuery({
      data: [
        {
          job_id: "job-1",
          status: "completed",
          actor_user_id: "user-1",
          request_ip: "203.0.113.7",
          notion_event_id: "evt-1",
        },
      ],
      error: null,
    })

    const res = await GET(statusRequest("?limit=1"))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.pull_sync_enabled).toBe(true)
    expect(body.jobs).toEqual([{ job_id: "job-1", status: "completed" }])
    const text = JSON.stringify(body)
    for (const key of ["actor_user_id", "request_ip", "notion_event_id", "203.0.113.7"]) {
      expect(text).not.toContain(key)
    }
  })

  it("reports pull_sync_enabled false for an admin when the flag is off", async () => {
    vi.stubEnv("NOTION_PULL_SYNC_ENABLED", "")
    mockJobsQuery({ data: [], error: null })
    const body = await (await GET(statusRequest())).json()
    expect(body.pull_sync_enabled).toBe(false)
  })

  it("sanitizes a single job lookup", async () => {
    mockJobsQuery({
      data: { job_id: "job-1", actor_user_id: "user-1", request_ip: "203.0.113.7", notion_event_id: "e" },
      error: null,
    })
    const body = await (await GET(statusRequest("?job_id=job-1"))).json()
    expect(body.job).toEqual({ job_id: "job-1" })
  })

  it("500 with a generic message on a DB error (no raw error text)", async () => {
    mockJobsQuery({ data: null, error: { message: RAW_DB_ERROR } })

    const res = await GET(statusRequest())
    const text = await res.text()

    expect(res.status).toBe(500)
    expect(JSON.parse(text).error).toBe("Failed to fetch jobs")
    expect(text).not.toContain(RAW_DB_ERROR)
  })

  it("500 with a generic message when something throws (no raw error text)", async () => {
    createServerClient.mockRejectedValue(new Error(RAW_DB_ERROR))

    const res = await GET(statusRequest())
    const text = await res.text()

    expect(res.status).toBe(500)
    expect(JSON.parse(text).error).toBe("Internal server error")
    expect(text).not.toContain(RAW_DB_ERROR)
    expect(createClient).not.toHaveBeenCalled()
  })
})
