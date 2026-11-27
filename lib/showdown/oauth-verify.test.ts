import { createSign, generateKeyPairSync } from "crypto"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import {
  createOauthBindingPayload,
  signOauthBinding,
} from "./oauth-binding"
import { createMemoryOauthJtiStore } from "./oauth-jti"
import { verifyOauthOwnershipProof } from "./oauth-verify"

const { publicKey, privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
})
const publicKeyPem = publicKey.export({ type: "spki", format: "pem" }).toString()
const privateKeyPem = privateKey.export({ type: "pkcs8", format: "pem" }).toString()

const SECRET = "test-binding-secret-not-for-prod"
const LEAGUE_USER = "league-user-1"
const STATE = "statehexstatehexstatehexstatehex"
const CHALLENGE = "c".repeat(64)
const NOW = 1_700_000_000

function signAssertion(userid = "zarel", challenge = CHALLENGE): string {
  const data = `${challenge},${userid},2,${NOW},sim3.psim.us`
  const signer = createSign("RSA-SHA1")
  signer.update(data)
  signer.end()
  return `${data};${signer.sign(privateKeyPem, "hex")}`
}

function bindingCookie(overrides?: Partial<{ uid: string; state: string; challenge: string }>) {
  const payload = createOauthBindingPayload({
    leagueUserId: overrides?.uid ?? LEAGUE_USER,
    state: overrides?.state ?? STATE,
    challenge: overrides?.challenge ?? CHALLENGE,
    nowSec: NOW,
  })
  return signOauthBinding(payload, SECRET)
}

describe("verifyOauthOwnershipProof", () => {
  it("accepts valid binding + signed assertion and derives userid", () => {
    const result = verifyOauthOwnershipProof({
      leagueUserId: LEAGUE_USER,
      bindingCookie: bindingCookie(),
      bindingSecret: SECRET,
      stateFromQuery: STATE,
      assertion: signAssertion("zarel"),
      userParam: "Zarel",
      nowSec: NOW,
      assertionOptions: { publicKeyPem },
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.userid).toBe("zarel")
  })

  it("rejects invalid proof (bad signature)", () => {
    const result = verifyOauthOwnershipProof({
      leagueUserId: LEAGUE_USER,
      bindingCookie: bindingCookie(),
      bindingSecret: SECRET,
      stateFromQuery: STATE,
      assertion: `${CHALLENGE},zarel,2,${NOW},host;abcd`,
      userParam: null,
      nowSec: NOW,
      assertionOptions: { publicKeyPem },
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe("ASSERTION_SIGNATURE_INVALID")
  })

  it("rejects mismatched league session", () => {
    const result = verifyOauthOwnershipProof({
      leagueUserId: "other-user",
      bindingCookie: bindingCookie(),
      bindingSecret: SECRET,
      stateFromQuery: STATE,
      assertion: signAssertion(),
      userParam: null,
      nowSec: NOW,
      assertionOptions: { publicKeyPem },
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe("BINDING_USER_MISMATCH")
  })

  it("rejects mismatched state", () => {
    const result = verifyOauthOwnershipProof({
      leagueUserId: LEAGUE_USER,
      bindingCookie: bindingCookie(),
      bindingSecret: SECRET,
      stateFromQuery: "wrong-state",
      assertion: signAssertion(),
      userParam: null,
      nowSec: NOW,
      assertionOptions: { publicKeyPem },
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe("BINDING_STATE_MISMATCH")
  })

  it("rejects challenge / identity mismatch between binding and assertion", () => {
    const result = verifyOauthOwnershipProof({
      leagueUserId: LEAGUE_USER,
      bindingCookie: bindingCookie({ challenge: "d".repeat(64) }),
      bindingSecret: SECRET,
      stateFromQuery: STATE,
      assertion: signAssertion("zarel", CHALLENGE),
      userParam: null,
      nowSec: NOW,
      assertionOptions: { publicKeyPem },
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe("ASSERTION_CHALLENGE_MISMATCH")
  })

  it("rejects forged user query param that disagrees with assertion", () => {
    const result = verifyOauthOwnershipProof({
      leagueUserId: LEAGUE_USER,
      bindingCookie: bindingCookie(),
      bindingSecret: SECRET,
      stateFromQuery: STATE,
      assertion: signAssertion("zarel"),
      userParam: "eviluser",
      nowSec: NOW,
      assertionOptions: { publicKeyPem },
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe("OAUTH_USER_PARAM_MISMATCH")
  })

  it("rejects replay after binding cookie is cleared (missing binding)", () => {
    const result = verifyOauthOwnershipProof({
      leagueUserId: LEAGUE_USER,
      bindingCookie: null,
      bindingSecret: SECRET,
      stateFromQuery: STATE,
      assertion: signAssertion(),
      userParam: "zarel",
      nowSec: NOW,
      assertionOptions: { publicKeyPem },
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe("BINDING_MISSING")
  })

  it("rejects signed unregistered userType=1 even with valid binding", () => {
    const data = `${CHALLENGE},freename,1,${NOW},sim3.psim.us`
    const signer = createSign("RSA-SHA1")
    signer.update(data)
    signer.end()
    const assertion = `${data};${signer.sign(privateKeyPem, "hex")}`
    const result = verifyOauthOwnershipProof({
      leagueUserId: LEAGUE_USER,
      bindingCookie: bindingCookie(),
      bindingSecret: SECRET,
      stateFromQuery: STATE,
      assertion,
      userParam: "freename",
      nowSec: NOW,
      assertionOptions: { publicKeyPem },
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe("ASSERTION_UNREGISTERED_USER")
  })

  it("rejects expired binding state", () => {
    const payload = createOauthBindingPayload({
      leagueUserId: LEAGUE_USER,
      state: STATE,
      challenge: CHALLENGE,
      nowSec: NOW,
      maxAgeSec: 60,
    })
    const cookie = signOauthBinding(payload, SECRET)
    const result = verifyOauthOwnershipProof({
      leagueUserId: LEAGUE_USER,
      bindingCookie: cookie,
      bindingSecret: SECRET,
      stateFromQuery: STATE,
      assertion: signAssertion(),
      userParam: "zarel",
      nowSec: NOW + 120,
      assertionOptions: { publicKeyPem },
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe("BINDING_EXPIRED")
  })

  it("consumes JTI server-side so Cookie-header replay fails", async () => {
    const store = createMemoryOauthJtiStore()
    const payload = createOauthBindingPayload({
      leagueUserId: LEAGUE_USER,
      state: STATE,
      challenge: CHALLENGE,
      nowSec: NOW,
    })
    const first = await store.tryConsume({
      jti: payload.jti,
      leagueUserId: LEAGUE_USER,
      expiresAt: new Date(payload.exp * 1000),
    })
    const second = await store.tryConsume({
      jti: payload.jti,
      leagueUserId: LEAGUE_USER,
      expiresAt: new Date(payload.exp * 1000),
    })
    expect(first.ok).toBe(true)
    expect(second.ok).toBe(false)
    if (!second.ok) expect(second.code).toBe("JTI_REPLAY")
  })

  it("allows only one concurrent JTI consumer to succeed", async () => {
    const store = createMemoryOauthJtiStore()
    const payload = createOauthBindingPayload({
      leagueUserId: LEAGUE_USER,
      state: STATE,
      challenge: CHALLENGE,
      nowSec: NOW,
    })
    const params = {
      jti: payload.jti,
      leagueUserId: LEAGUE_USER,
      expiresAt: new Date(payload.exp * 1000),
    }
    const results = await Promise.all([
      store.tryConsume(params),
      store.tryConsume(params),
      store.tryConsume(params),
      store.tryConsume(params),
    ])
    const wins = results.filter((r) => r.ok)
    const losses = results.filter((r) => !r.ok)
    expect(wins).toHaveLength(1)
    expect(losses).toHaveLength(3)
    for (const loss of losses) {
      if (!loss.ok) expect(loss.code).toBe("JTI_REPLAY")
    }
  })
})

describe("oauth callback + unlink routes (mocked provider proof)", () => {
  const profileUpdate = vi.fn()
  const profileSelect = vi.fn()
  const jtiInsert = vi.fn()
  const getUser = vi.fn()

  beforeEach(() => {
    process.env.SHOWDOWN_OAUTH_CLIENT_ID = "test-client"
    process.env.SHOWDOWN_OAUTH_REDIRECT_URI =
      "https://example.com/api/showdown/oauth/callback"
    process.env.SHOWDOWN_OAUTH_BINDING_SECRET = SECRET
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-for-tests"
    profileUpdate.mockReset()
    profileSelect.mockReset()
    jtiInsert.mockReset()
    getUser.mockReset()
    getUser.mockResolvedValue({ data: { user: { id: LEAGUE_USER } } })
    profileSelect.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        neq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        }),
      }),
    })
    profileUpdate.mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })
    jtiInsert.mockResolvedValue({ error: null })
  })

  afterEach(() => {
    delete process.env.SHOWDOWN_OAUTH_CLIENT_ID
    delete process.env.SHOWDOWN_OAUTH_REDIRECT_URI
    delete process.env.SHOWDOWN_OAUTH_BINDING_SECRET
    vi.resetModules()
  })

  async function loadRoutes() {
    vi.resetModules()
    vi.doMock("@/lib/supabase/server", () => ({
      createServerClient: vi.fn(async () => ({
        auth: { getUser },
      })),
    }))
    vi.doMock("@/lib/supabase/service", () => ({
      createServiceRoleClient: vi.fn(() => ({
        from: vi.fn((table: string) => {
          if (table === "showdown_oauth_consumed_jti") {
            return { insert: jtiInsert }
          }
          if (table !== "profiles") throw new Error(`unexpected table ${table}`)
          return {
            select: profileSelect,
            update: profileUpdate,
          }
        }),
      })),
    }))
    const verifyOauthOwnershipProofMock = vi.fn()
    vi.doMock("@/lib/showdown/oauth-verify", () => ({
      verifyOauthOwnershipProof: verifyOauthOwnershipProofMock,
    }))
    const callback = await import("@/app/api/showdown/oauth/callback/route")
    const unlink = await import("@/app/api/showdown/oauth/unlink/route")
    return { callback, unlink, verifyOauthOwnershipProofMock }
  }

  function validProof() {
    return {
      ok: true as const,
      userid: "zarel",
      binding: createOauthBindingPayload({
        leagueUserId: LEAGUE_USER,
        state: STATE,
        challenge: CHALLENGE,
        nowSec: NOW,
      }),
      assertion: {
        ok: true as const,
        userid: "zarel",
        challenge: CHALLENGE,
        userType: "2",
        issuedAtSec: NOW,
        hostname: "sim3.psim.us",
      },
    }
  }

  it("binds profile on valid proof, consumes JTI, and clears binding cookie", async () => {
    const { callback, verifyOauthOwnershipProofMock } = await loadRoutes()
    verifyOauthOwnershipProofMock.mockReturnValue(validProof())

    const cookie = bindingCookie()
    const req = new NextRequest(
      `https://example.com/api/showdown/oauth/callback?assertion=x&state=${STATE}&user=zarel`,
      { headers: { cookie: `ps_oauth_binding=${cookie}` } },
    )
    const res = await callback.GET(req)
    expect(res.status).toBe(307)
    expect(res.headers.get("location")).toContain("showdown_linked=1")
    expect(jtiInsert).toHaveBeenCalled()
    expect(profileUpdate).toHaveBeenCalled()
    const setCookie = res.headers.getSetCookie?.() ?? []
    expect(setCookie.some((c) => c.startsWith("ps_oauth_binding=;"))).toBe(true)
  })

  it("rejects Cookie-header replay when JTI was already consumed", async () => {
    const { callback, verifyOauthOwnershipProofMock } = await loadRoutes()
    verifyOauthOwnershipProofMock.mockReturnValue(validProof())
    jtiInsert.mockResolvedValue({ error: { code: "23505", message: "duplicate" } })

    const req = new NextRequest(
      `https://example.com/api/showdown/oauth/callback?assertion=x&state=${STATE}&user=zarel`,
      { headers: { cookie: `ps_oauth_binding=${bindingCookie()}` } },
    )
    const res = await callback.GET(req)
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.code).toBe("JTI_REPLAY")
    expect(profileUpdate).not.toHaveBeenCalled()
  })

  it("fails closed on invalid proof without updating profile", async () => {
    const { callback, verifyOauthOwnershipProofMock } = await loadRoutes()
    verifyOauthOwnershipProofMock.mockReturnValue({
      ok: false,
      code: "ASSERTION_SIGNATURE_INVALID",
      message: "bad",
      status: 400,
    })
    const req = new NextRequest(
      `https://example.com/api/showdown/oauth/callback?assertion=x&state=${STATE}`,
      { headers: { cookie: `ps_oauth_binding=${bindingCookie()}` } },
    )
    const res = await callback.GET(req)
    expect(res.status).toBe(400)
    expect(jtiInsert).not.toHaveBeenCalled()
    expect(profileUpdate).not.toHaveBeenCalled()
  })

  it("unlinks verified fields for the signed-in user", async () => {
    const { unlink } = await loadRoutes()
    const res = await unlink.DELETE()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.unlinked).toBe(true)
    expect(profileUpdate).toHaveBeenCalledWith({
      showdown_userid: null,
      showdown_linked_at: null,
      showdown_link_method: null,
    })
  })
})
