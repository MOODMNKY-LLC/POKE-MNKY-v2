import { describe, expect, it, beforeEach, afterEach } from "vitest"
import { GET } from "./route"

describe("GET /api/showdown/identity-status", () => {
  const prevLegacy = process.env.SHOWDOWN_LEGACY_LOGINSERVER_SYNC
  const prevOauth = process.env.SHOWDOWN_OAUTH_CLIENT_ID
  const prevRedirect = process.env.SHOWDOWN_OAUTH_REDIRECT_URI
  const prevBinding = process.env.SHOWDOWN_OAUTH_BINDING_SECRET
  const prevService = process.env.SUPABASE_SERVICE_ROLE_KEY

  beforeEach(() => {
    delete process.env.SHOWDOWN_LEGACY_LOGINSERVER_SYNC
    delete process.env.SHOWDOWN_OAUTH_CLIENT_ID
    delete process.env.SHOWDOWN_OAUTH_REDIRECT_URI
    delete process.env.SHOWDOWN_OAUTH_BINDING_SECRET
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
  })

  afterEach(() => {
    if (prevLegacy === undefined) delete process.env.SHOWDOWN_LEGACY_LOGINSERVER_SYNC
    else process.env.SHOWDOWN_LEGACY_LOGINSERVER_SYNC = prevLegacy
    if (prevOauth === undefined) delete process.env.SHOWDOWN_OAUTH_CLIENT_ID
    else process.env.SHOWDOWN_OAUTH_CLIENT_ID = prevOauth
    if (prevRedirect === undefined) delete process.env.SHOWDOWN_OAUTH_REDIRECT_URI
    else process.env.SHOWDOWN_OAUTH_REDIRECT_URI = prevRedirect
    if (prevBinding === undefined) delete process.env.SHOWDOWN_OAUTH_BINDING_SECRET
    else process.env.SHOWDOWN_OAUTH_BINDING_SECRET = prevBinding
    if (prevService === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY
    else process.env.SUPABASE_SERVICE_ROLE_KEY = prevService
  })

  it("reports oauth available only when client id, redirect, and binding secret are set", async () => {
    process.env.SHOWDOWN_OAUTH_CLIENT_ID = "should-not-leak"
    process.env.SHOWDOWN_OAUTH_REDIRECT_URI =
      "https://example.com/api/showdown/oauth/callback"
    process.env.SHOWDOWN_OAUTH_BINDING_SECRET = "binding-should-not-leak"
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.oauth_link_available).toBe(true)
    expect(body.oauth_link_implemented).toBe(true)
    expect(body.legacy_sync_enabled).toBe(false)
    expect(body.oauth_prerequisites.binding_secret_configured).toBe(true)
    expect(JSON.stringify(body)).not.toContain("should-not-leak")
    expect(JSON.stringify(body)).not.toContain("binding-should-not-leak")
  })

  it("reports oauth unavailable without client id", async () => {
    const res = await GET()
    const body = await res.json()
    expect(body.oauth_link_available).toBe(false)
    expect(body.oauth_link_implemented).toBe(true)
  })

  it("reports oauth unavailable when only client id is set", async () => {
    process.env.SHOWDOWN_OAUTH_CLIENT_ID = "should-not-leak"
    const res = await GET()
    const body = await res.json()
    expect(body.oauth_link_available).toBe(false)
  })

  it("reports legacy enabled only when server flag is truthy", async () => {
    process.env.SHOWDOWN_LEGACY_LOGINSERVER_SYNC = "true"
    const res = await GET()
    const body = await res.json()
    expect(body.legacy_sync_enabled).toBe(true)
  })
})
