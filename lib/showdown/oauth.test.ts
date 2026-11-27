import { describe, expect, it } from "vitest"
import {
  buildAuthorizeUrl,
  getShowdownOauthPrerequisites,
  normalizeOauthUserParam,
  SHOWDOWN_OAUTH_CLIENT_FORM,
} from "./oauth"

describe("showdown oauth helpers", () => {
  it("builds the official authorize URL", () => {
    const url = buildAuthorizeUrl({
      clientId: "demo-client",
      redirectUri: "https://example.com/api/showdown/oauth/callback",
      challenge: "abc",
    })
    expect(url).toContain("play.pokemonshowdown.com/api/oauth/authorize")
    expect(url).toContain("client_id=demo-client")
    expect(url).toContain("challenge=abc")
  })

  it("normalizes OAuth user params into userids", () => {
    expect(normalizeOauthUserParam("Zarel")).toBe("zarel")
    expect(normalizeOauthUserParam("")).toBeNull()
  })

  it("reports blocked prerequisites when client id / redirect missing", () => {
    const prereq = getShowdownOauthPrerequisites({})
    expect(prereq.ready).toBe(false)
    expect(prereq.client_id_configured).toBe(false)
    expect(prereq.redirect_uri_configured).toBe(false)
    expect(prereq.registration_form).toBe(SHOWDOWN_OAUTH_CLIENT_FORM)
    expect(prereq.blocked_reasons.length).toBeGreaterThan(0)
  })
})
