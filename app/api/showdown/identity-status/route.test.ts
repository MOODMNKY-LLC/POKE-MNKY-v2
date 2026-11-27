import { describe, expect, it, beforeEach, afterEach } from "vitest"
import { GET } from "./route"

describe("GET /api/showdown/identity-status", () => {
  const prevLegacy = process.env.SHOWDOWN_LEGACY_LOGINSERVER_SYNC
  const prevOauth = process.env.SHOWDOWN_OAUTH_CLIENT_ID
  const prevRedirect = process.env.SHOWDOWN_OAUTH_REDIRECT_URI

  beforeEach(() => {
    delete process.env.SHOWDOWN_LEGACY_LOGINSERVER_SYNC
    delete process.env.SHOWDOWN_OAUTH_CLIENT_ID
    delete process.env.SHOWDOWN_OAUTH_REDIRECT_URI
  })

  afterEach(() => {
    if (prevLegacy === undefined) delete process.env.SHOWDOWN_LEGACY_LOGINSERVER_SYNC
    else process.env.SHOWDOWN_LEGACY_LOGINSERVER_SYNC = prevLegacy
    if (prevOauth === undefined) delete process.env.SHOWDOWN_OAUTH_CLIENT_ID
    else process.env.SHOWDOWN_OAUTH_CLIENT_ID = prevOauth
    if (prevRedirect === undefined) delete process.env.SHOWDOWN_OAUTH_REDIRECT_URI
    else process.env.SHOWDOWN_OAUTH_REDIRECT_URI = prevRedirect
  })

  it("reports oauth available when client id is configured (implemented)", async () => {
    process.env.SHOWDOWN_OAUTH_CLIENT_ID = "should-not-leak"
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.oauth_link_available).toBe(true)
    expect(body.oauth_link_implemented).toBe(true)
    expect(body.legacy_sync_enabled).toBe(false)
    expect(JSON.stringify(body)).not.toContain("should-not-leak")
  })

  it("reports oauth unavailable without client id", async () => {
    const res = await GET()
    const body = await res.json()
    expect(body.oauth_link_available).toBe(false)
    expect(body.oauth_link_implemented).toBe(true)
  })

  it("reports legacy enabled only when server flag is truthy", async () => {
    process.env.SHOWDOWN_LEGACY_LOGINSERVER_SYNC = "true"
    const res = await GET()
    const body = await res.json()
    expect(body.legacy_sync_enabled).toBe(true)
  })
})
