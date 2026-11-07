import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { GET } from "./route"

describe("GET /api/showdown/identity-status", () => {
  const prevLegacy = process.env.SHOWDOWN_LEGACY_LOGINSERVER_SYNC
  const prevOauth = process.env.SHOWDOWN_OAUTH_CLIENT_ID

  beforeEach(() => {
    delete process.env.SHOWDOWN_LEGACY_LOGINSERVER_SYNC
    delete process.env.SHOWDOWN_OAUTH_CLIENT_ID
  })

  afterEach(() => {
    if (prevLegacy === undefined) delete process.env.SHOWDOWN_LEGACY_LOGINSERVER_SYNC
    else process.env.SHOWDOWN_LEGACY_LOGINSERVER_SYNC = prevLegacy
    if (prevOauth === undefined) delete process.env.SHOWDOWN_OAUTH_CLIENT_ID
    else process.env.SHOWDOWN_OAUTH_CLIENT_ID = prevOauth
  })

  it("returns unavailable oauth even if CLIENT_ID is set (unimplemented)", async () => {
    process.env.SHOWDOWN_OAUTH_CLIENT_ID = "should-not-enable-link"
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.oauth_link_available).toBe(false)
    expect(body.oauth_link_implemented).toBe(false)
    expect(body.legacy_sync_enabled).toBe(false)
    expect(JSON.stringify(body)).not.toContain("should-not-enable-link")
    expect(JSON.stringify(body)).not.toContain("SHOWDOWN_OAUTH_CLIENT_ID")
  })

  it("reports legacy enabled only when server flag is truthy", async () => {
    process.env.SHOWDOWN_LEGACY_LOGINSERVER_SYNC = "true"
    const res = await GET()
    const body = await res.json()
    expect(body.legacy_sync_enabled).toBe(true)
  })
})
