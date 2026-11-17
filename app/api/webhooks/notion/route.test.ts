import crypto from "crypto"
import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { startNotionSyncJob, createClient, syncNotionToSupabase } = vi.hoisted(() => ({
  startNotionSyncJob: vi.fn(),
  createClient: vi.fn(),
  syncNotionToSupabase: vi.fn(),
}))

vi.mock("@/lib/sync/notion-sync-job", () => ({ startNotionSyncJob }))
vi.mock("@/lib/sync/notion-sync-worker", () => ({ syncNotionToSupabase }))
vi.mock("@supabase/supabase-js", () => ({ createClient }))
vi.mock("@/lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { POST } from "./route"
import { logger } from "@/lib/logger"

const SECRET = "webhook-secret"
const DATABASE_ID = "5e58ccd73ceb44ed83de826b51cf5c36"
const DATA_SOURCE_ID = "7efba35e-03ef-4597-82ad-1c38e47bd06b"

function sign(body: string, secret = SECRET) {
  return `sha256=${crypto.createHmac("sha256", secret).update(body).digest("hex")}`
}

function webhookRequest(body: string, signature?: string, extraHeaders: Record<string, string> = {}) {
  const headers: Record<string, string> = { "content-type": "application/json", ...extraHeaders }
  if (signature !== undefined) headers["x-notion-signature"] = signature
  return new NextRequest("http://localhost/api/webhooks/notion", { method: "POST", headers, body })
}

function event(overrides: Record<string, unknown> = {}) {
  return {
    id: "evt-1",
    timestamp: new Date().toISOString(),
    type: "page.properties_updated",
    entity: { id: "page-1", type: "page" },
    data: { parent: { id: DATABASE_ID, type: "database" } },
    ...overrides,
  }
}

const signed = (payload: unknown, extraHeaders: Record<string, string> = {}) => {
  const body = JSON.stringify(payload)
  return webhookRequest(body, sign(body), extraHeaders)
}

describe("POST /api/webhooks/notion", () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
    startNotionSyncJob.mockResolvedValue({ kind: "started", jobId: "job-1" })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe("flag off", () => {
    it("returns 410 even for a validly signed event, with no sync or client", async () => {
      vi.stubEnv("NOTION_PULL_SYNC_ENABLED", "")
      vi.stubEnv("NOTION_WEBHOOK_SECRET", SECRET)

      const res = await POST(signed(event()))

      expect(res.status).toBe(410)
      expect((await res.json()).code).toBe("NOTION_PULL_SYNC_DISABLED")
      expect(startNotionSyncJob).not.toHaveBeenCalled()
      expect(createClient).not.toHaveBeenCalled()
    })

    it("returns 410 for the verification payload too, even in setup mode", async () => {
      vi.stubEnv("NOTION_PULL_SYNC_ENABLED", "")
      vi.stubEnv("NOTION_WEBHOOK_SETUP_MODE", "true")
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

    describe("signature (always required)", () => {
      it("401 with no signature header", async () => {
        const res = await POST(webhookRequest(JSON.stringify(event())))
        expect(res.status).toBe(401)
        expect(startNotionSyncJob).not.toHaveBeenCalled()
        expect(createClient).not.toHaveBeenCalled()
      })

      it("401 with a malformed signature (no prefix, short, uppercase hex)", async () => {
        const body = JSON.stringify(event())
        const hex = crypto.createHmac("sha256", SECRET).update(body).digest("hex")
        for (const bad of [hex, "sha256=abc", `sha256=${hex.toUpperCase()}`, `sha256=${hex}00`, ""]) {
          const res = await POST(webhookRequest(body, bad))
          expect(res.status, bad).toBe(401)
        }
        expect(startNotionSyncJob).not.toHaveBeenCalled()
      })

      it("401 with a well-formed but invalid signature", async () => {
        const body = JSON.stringify(event())
        const res = await POST(webhookRequest(body, sign(body, "wrong-secret")))
        expect(res.status).toBe(401)
        expect(startNotionSyncJob).not.toHaveBeenCalled()
      })

      it("401 (not 500) when NOTION_WEBHOOK_SECRET is unset", async () => {
        vi.stubEnv("NOTION_WEBHOOK_SECRET", "")
        const res = await POST(signed(event()))
        expect(res.status).toBe(401)
        expect(startNotionSyncJob).not.toHaveBeenCalled()
      })

      it("HMACs the raw body bytes, not re-serialised JSON", async () => {
        const body = `{ "id": "evt-raw",   "timestamp": "${new Date().toISOString()}", "type": "page.created", "data": {"parent": {"id": "${DATABASE_ID}"}} }`
        const res = await POST(webhookRequest(body, sign(body)))
        expect(res.status).toBe(200)
        const reserialised = JSON.stringify(JSON.parse(body))
        const res2 = await POST(webhookRequest(body, sign(reserialised)))
        expect(res2.status).toBe(401)
      })
    })

    describe("handshake", () => {
      it("401 for an unsigned verification_token when setup mode is off", async () => {
        const res = await POST(webhookRequest(JSON.stringify({ verification_token: "tok" })))
        expect(res.status).toBe(401)
        expect(startNotionSyncJob).not.toHaveBeenCalled()
      })

      it("200 { ok: true } in setup mode, never echoes or logs the token, never syncs", async () => {
        vi.stubEnv("NOTION_WEBHOOK_SETUP_MODE", "1")
        const token = "super-secret-verification-token"
        const res = await POST(webhookRequest(JSON.stringify({ verification_token: token })))

        expect(res.status).toBe(200)
        const text = await res.text()
        expect(JSON.parse(text)).toEqual({ ok: true })
        expect(text).not.toContain(token)
        expect(startNotionSyncJob).not.toHaveBeenCalled()
        expect(createClient).not.toHaveBeenCalled()

        const logged = JSON.stringify([
          (logger.info as ReturnType<typeof vi.fn>).mock.calls,
          (logger.warn as ReturnType<typeof vi.fn>).mock.calls,
          (logger.debug as ReturnType<typeof vi.fn>).mock.calls,
        ])
        expect(logged).not.toContain(token)
        expect(logger.info).toHaveBeenCalled()
      })

      it("setup mode does not bypass the signature for ordinary events", async () => {
        vi.stubEnv("NOTION_WEBHOOK_SETUP_MODE", "true")
        const res = await POST(webhookRequest(JSON.stringify(event())))
        expect(res.status).toBe(401)
      })
    })

    describe("replay protection", () => {
      it("401 when timestamp is missing", async () => {
        const { timestamp: _t, ...noTs } = event()
        const res = await POST(signed(noTs))
        expect(res.status).toBe(401)
        expect(startNotionSyncJob).not.toHaveBeenCalled()
      })

      it("401 when timestamp is older than 5 minutes", async () => {
        const old = new Date(Date.now() - 6 * 60 * 1000).toISOString()
        const res = await POST(signed(event({ timestamp: old })))
        expect(res.status).toBe(401)
        expect(startNotionSyncJob).not.toHaveBeenCalled()
      })

      it("401 when timestamp is more than 5 minutes in the future", async () => {
        const future = new Date(Date.now() + 6 * 60 * 1000).toISOString()
        const res = await POST(signed(event({ timestamp: future })))
        expect(res.status).toBe(401)
      })

      it("accepts a timestamp one minute old", async () => {
        const recent = new Date(Date.now() - 60 * 1000).toISOString()
        const res = await POST(signed(event({ timestamp: recent })))
        expect(res.status).toBe(200)
      })

      it("200 { duplicate: true } when the event id was already recorded", async () => {
        startNotionSyncJob.mockResolvedValue({ kind: "duplicate" })
        const res = await POST(signed(event()))
        expect(res.status).toBe(200)
        expect(await res.json()).toEqual({ duplicate: true })
      })

      it("409 when a draft_board sync is already running", async () => {
        startNotionSyncJob.mockResolvedValue({ kind: "busy" })
        const res = await POST(signed(event()))
        expect(res.status).toBe(409)
        expect((await res.json()).code).toBe("SYNC_ALREADY_RUNNING")
      })
    })

    describe("source allowlist", () => {
      it("syncs for the database id via data.parent.id", async () => {
        const res = await POST(signed(event()))
        expect(res.status).toBe(200)
        expect(startNotionSyncJob).toHaveBeenCalledTimes(1)
      })

      it("syncs for the data source id (dashes, collection:// and upper case normalised)", async () => {
        for (const id of [DATA_SOURCE_ID, `collection://${DATA_SOURCE_ID}`, DATA_SOURCE_ID.toUpperCase()]) {
          startNotionSyncJob.mockClear()
          const res = await POST(signed(event({ data: { parent: { id } } })))
          expect(res.status, id).toBe(200)
          expect(startNotionSyncJob).toHaveBeenCalledTimes(1)
        }
      })

      it("falls back to data.parent.data_source_id, then entity.id, then data.database_id", async () => {
        const shapes = [
          { data: { parent: { data_source_id: DATA_SOURCE_ID } } },
          { data: {}, entity: { id: DATA_SOURCE_ID, type: "data_source" } },
          { data: { database_id: DATABASE_ID }, entity: undefined },
          { data: {}, entity: undefined, database_id: DATABASE_ID },
        ]
        for (const shape of shapes) {
          startNotionSyncJob.mockClear()
          const res = await POST(signed(event(shape)))
          expect(res.status, JSON.stringify(shape)).toBe(200)
          expect(startNotionSyncJob).toHaveBeenCalledTimes(1)
        }
      })

      it("200 { ignored: 'source' } for any other source, no sync", async () => {
        const res = await POST(signed(event({ data: { parent: { id: "some-other-db" } } })))
        expect(res.status).toBe(200)
        expect(await res.json()).toEqual({ ignored: "source" })
        expect(startNotionSyncJob).not.toHaveBeenCalled()
      })

      it("200 { ignored: 'source' } when no source id is present", async () => {
        const res = await POST(signed(event({ data: {}, entity: undefined })))
        expect(res.status).toBe(200)
        expect(await res.json()).toEqual({ ignored: "source" })
      })
    })

    describe("event allowlist", () => {
      it.each([
        "database.content_updated",
        "data_source.content_updated",
        "page.properties_updated",
        "page.created",
      ])("syncs for %s", async (type) => {
        const res = await POST(signed(event({ type })))
        expect(res.status).toBe(200)
        expect(startNotionSyncJob).toHaveBeenCalledTimes(1)
      })

      it("200 { ignored: 'event' } for other event types", async () => {
        const res = await POST(signed(event({ type: "page.deleted" })))
        expect(res.status).toBe(200)
        expect(await res.json()).toEqual({ ignored: "event" })
        expect(startNotionSyncJob).not.toHaveBeenCalled()
      })
    })

    describe("forced incremental draft_board sync", () => {
      it("passes webhook attribution, event id and request ip", async () => {
        const res = await POST(signed(event({ id: "evt-42" }), { "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))
        expect(res.status).toBe(200)
        const input = startNotionSyncJob.mock.calls[0]![0]
        expect(input.source).toBe("webhook")
        expect(input.triggeredBy).toBe("notion_webhook")
        expect(input.notionEventId).toBe("evt-42")
        expect(input.requestIp).toBe("203.0.113.7")
      })

      it("uses x-real-ip when x-forwarded-for is absent", async () => {
        await POST(signed(event(), { "x-real-ip": "198.51.100.4" }))
        expect(startNotionSyncJob.mock.calls[0]![0].requestIp).toBe("198.51.100.4")
      })

      it("ignores body-supplied incremental/scope/dryRun/since/allowLargePrune", async () => {
        await POST(
          signed(
            event({
              incremental: false,
              scope: ["pokemon", "moves"],
              dryRun: true,
              since: "2000-01-01T00:00:00.000Z",
              allowLargePrune: true,
              data: {
                parent: { id: DATABASE_ID },
                incremental: false,
                scope: ["pokemon"],
                allowLargePrune: true,
              },
            }),
          ),
        )
        const { options } = startNotionSyncJob.mock.calls[0]![0]
        expect(options.incremental).toBe(true)
        expect(options.scope).toEqual(["draft_board"])
        expect(options.dryRun).toBe(false)
        expect(options.allowLargePrune).toBe(false)
        expect(options.since).toBeInstanceOf(Date)
        expect(Date.now() - options.since.getTime()).toBeLessThan(10 * 60 * 1000)
      })
    })

    it("500 when Supabase configuration is missing", async () => {
      vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "")
      const res = await POST(signed(event()))
      expect(res.status).toBe(500)
      expect(startNotionSyncJob).not.toHaveBeenCalled()
    })

    it("500 when the job cannot be started", async () => {
      startNotionSyncJob.mockResolvedValue({ kind: "error", message: "boom" })
      const res = await POST(signed(event()))
      expect(res.status).toBe(500)
    })
  })
})
