import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: async () => ({
        data: { user: { id: "user-1" } },
        error: null,
      }),
    },
  })),
}))

vi.mock("@/lib/showdown/sync", () => ({
  syncShowdownAccount: vi.fn(async () => ({
    success: true,
    showdown_username: "testuser",
  })),
}))

import { POST } from "./route"
import { syncShowdownAccount } from "@/lib/showdown/sync"

describe("POST /api/showdown/sync-account", () => {
  const prev = process.env.SHOWDOWN_LEGACY_LOGINSERVER_SYNC

  beforeEach(() => {
    delete process.env.SHOWDOWN_LEGACY_LOGINSERVER_SYNC
    vi.mocked(syncShowdownAccount).mockClear()
  })

  afterEach(() => {
    if (prev === undefined) delete process.env.SHOWDOWN_LEGACY_LOGINSERVER_SYNC
    else process.env.SHOWDOWN_LEGACY_LOGINSERVER_SYNC = prev
  })

  it("returns 410 and does not call sync when legacy flag off", async () => {
    const res = await POST(new NextRequest("http://localhost/api/showdown/sync-account", { method: "POST" }))
    expect(res.status).toBe(410)
    const body = await res.json()
    expect(body.code).toBe("LEGACY_SHOWDOWN_SYNC_DISABLED")
    expect(syncShowdownAccount).not.toHaveBeenCalled()
  })

  it("calls sync when legacy flag enabled", async () => {
    process.env.SHOWDOWN_LEGACY_LOGINSERVER_SYNC = "1"
    const res = await POST(new NextRequest("http://localhost/api/showdown/sync-account", { method: "POST" }))
    expect(res.status).toBe(200)
    expect(syncShowdownAccount).toHaveBeenCalledWith("user-1")
  })
})
