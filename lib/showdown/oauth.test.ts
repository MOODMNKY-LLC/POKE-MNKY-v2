import { describe, expect, it } from "vitest"
import {
  buildAuthorizeUrl,
  getShowdownOauthPrerequisites,
  normalizeOauthUserParam,
  SHOWDOWN_OAUTH_CLIENT_FORM,
  toOauthChallstr,
} from "./oauth"
import { PS_LOGINSERVER_PUBLIC_KEY_ID } from "./assertion"
import {
  createOauthBindingPayload,
  parseOauthBindingCookie,
  redirectUriWithState,
  signOauthBinding,
} from "./oauth-binding"

describe("showdown oauth helpers", () => {
  it("builds the official authorize URL", () => {
    const url = buildAuthorizeUrl({
      clientId: "demo-client",
      redirectUri: "https://example.com/api/showdown/oauth/callback?state=abc",
      challenge: toOauthChallstr("deadbeef"),
    })
    expect(url).toContain("play.pokemonshowdown.com/api/oauth/authorize")
    expect(url).toContain("client_id=demo-client")
    expect(url).toContain(`challenge=${PS_LOGINSERVER_PUBLIC_KEY_ID}%7Cdeadbeef`)
  })

  it("normalizes OAuth user params into userids (never sole proof)", () => {
    expect(normalizeOauthUserParam("Zarel")).toBe("zarel")
    expect(normalizeOauthUserParam("")).toBeNull()
  })

  it("appends state onto the registered redirect URI", () => {
    const withState = redirectUriWithState(
      "https://example.com/api/showdown/oauth/callback",
      "abc123",
    )
    expect(withState).toContain("state=abc123")
  })

  it("reports blocked prerequisites when client id / redirect / binding missing", () => {
    const prereq = getShowdownOauthPrerequisites({})
    expect(prereq.ready).toBe(false)
    expect(prereq.client_id_configured).toBe(false)
    expect(prereq.redirect_uri_configured).toBe(false)
    expect(prereq.binding_secret_configured).toBe(false)
    expect(prereq.registration_form).toBe(SHOWDOWN_OAUTH_CLIENT_FORM)
    expect(prereq.blocked_reasons.length).toBeGreaterThan(0)
  })

  it("signs and verifies binding cookies; rejects tampering and expiry", () => {
    const secret = "binding-secret"
    const payload = createOauthBindingPayload({
      leagueUserId: "u1",
      state: "s1",
      challenge: "c1",
      nowSec: 1000,
      maxAgeSec: 60,
    })
    const cookie = signOauthBinding(payload, secret)
    expect(parseOauthBindingCookie(cookie, secret, 1010).ok).toBe(true)
    expect(parseOauthBindingCookie(cookie, "wrong", 1010).ok).toBe(false)
    expect(parseOauthBindingCookie(cookie + "x", secret, 1010).ok).toBe(false)
    expect(parseOauthBindingCookie(cookie, secret, 1100).ok).toBe(false)
  })
})
