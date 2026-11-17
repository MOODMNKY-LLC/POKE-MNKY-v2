import crypto from "crypto"
import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { syncNotionToSupabase, createClient, insertSingle } = vi.hoisted(() => ({
  syncNotionToSupabase: vi.fn(),
  createClient: vi.fn(),
  insertSingle: vi.fn(),
}))

vi.mock("@/lib/sync/notion-sync-worker", () => ({ syncNotionToSupabase }))
vi.mock("@supabase/supabase-js", () => ({ createClient }))
vi.mock("@/lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))
vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>()
  return {
    ...actual,
    // Run the deferred callback inline so the sync mock is observable.
    after: (cb: () => Promise<void>) => {
      void cb()
    },
  }
})

import { POST } from "./route"

const SECRET = "webhook-secret"
const DRAFT_BOARD_DATABASE_ID = "5e58ccd73ceb44ed83de826b51cf5c36"

function sign(body: string, secret = SECRET) {
  return `sha256=${crypto.createHmac("sha256", secret).update(body).digest("hex")}`
}

function webhookRequest(body: string, signature?: string) {
  const headers: Record<string, string> = { "content-type": "application/json" }
  if (signature !== undefined) headers["x-notion-signature"] = signature
  return new NextRequest("http://localhost/api/webhooks/notion", {
    method: "POST",
    headers,
    body,
  })
}

const eventBody = JSON.stringify({
  type: "page.properties_updated",
  data: { database_id: DRAFT_BOARD_DATABASE_ID },
})

describe("POST /api/webhooks/notion", () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
    insertSingle.mockResolvedValue({ data: { job_id: "job-1" }, error: null })
    createClient.mockReturnValue({
      from: () => ({
        insert: () => ({ select: () => ({ single: insertSingle }) }),
        update: () => ({ eq: () => Promise.resolve({ error: null }) }),
      }),
    })
    syncNotionToSupabase.mockResolvedValue({ success: true, stats: { draft_board: { synced: 1, failed: 0 } } })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe("flag off", () => {
    it("returns 410 even for a validly signed event, with no sync or client", async () => {
      vi.stubEnv("NOTION_PULL_SYNC_ENABLED", "")
      vi.stubEnv("NOTION_WEBHOOK_SECRET", SECRET)

      const res = await POST(webhookRequest(eventBody, sign(eventBody)))

      expect(res.status).toBe(410)
      expect((await res.json()).code).toBe("NOTION_PULL_SYNC_DISABLED")
      expect(syncNotionToSupabase).not.toHaveBeenCalled()
      expect(createClient).not.toHaveBeenCalled()
    })

    it("returns 410 for the verification payload too", async () => {
      vi.stubEnv("NOTION_PULL_SYNC_ENABLED", "")
      const res = await POST(webhookRequest(JSON.stringify({ verification_token: "tok" })))
      expect(res.status).toBe(410)
    })
  })

  describe("flag on", () => {
    beforeEach(() => {
      vi.stubEnv("NOTION_PULL_SYNC_ENABLED", "true")
      vi.stubEnv("NOTION_WEBHOOK_SECRET", SECRET)
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://supabase.test")
      vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role")
    })

    it("rejects an event with no signature (401)", async () => {
      const res = await POST(webhookRequest(eventBody))
      expect(res.status).toBe(401)
      expect(syncNotionToSupabase).not.toHaveBeenCalled()
      expect(createClient).not.toHaveBeenCalled()
    })

    it("rejects an event with a bad signature (401)", async () => {
      const res = await POST(webhookRequest(eventBody, sign(eventBody, "wrong-secret")))
      expect(res.status).toBe(401)
      expect(syncNotionToSupabase).not.toHaveBeenCalled()
      expect(createClient).not.toHaveBeenCalled()
    })

    it("rejects a signature of the wrong length without throwing (401)", async () => {
      const res = await POST(webhookRequest(eventBody, "sha256=abc"))
      expect(res.status).toBe(401)
      expect(syncNotionToSupabase).not.toHaveBeenCalled()
    })

    it("processes a validly signed draft-board event", async () => {
      const res = await POST(webhookRequest(eventBody, sign(eventBody)))
      expect(res.status).toBe(200)
      await vi.waitFor(() => expect(syncNotionToSupabase).toHaveBeenCalledTimes(1))
    })

    it("ignores a validly signed event for another database without syncing", async () => {
      const body = JSON.stringify({ type: "page.created", data: { database_id: "other" } })
      const res = await POST(webhookRequest(body, sign(body)))
      expect(res.status).toBe(200)
      expect(syncNotionToSupabase).not.toHaveBeenCalled()
    })

    it("answers the verification_token payload with 200 and never syncs", async () => {
      const res = await POST(webhookRequest(JSON.stringify({ verification_token: "tok" })))
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ verification_token: "tok" })
      expect(syncNotionToSupabase).not.toHaveBeenCalled()
      expect(createClient).not.toHaveBeenCalled()
    })

    it("returns 500 when NOTION_WEBHOOK_SECRET is unset", async () => {
      vi.stubEnv("NOTION_WEBHOOK_SECRET", "")
      const res = await POST(webhookRequest(eventBody, sign(eventBody)))
      expect(res.status).toBe(500)
      expect(syncNotionToSupabase).not.toHaveBeenCalled()
      expect(createClient).not.toHaveBeenCalled()
    })
  })
})
