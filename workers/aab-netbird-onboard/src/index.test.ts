import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import worker from "./index"
import type { Env, KVLike } from "./types"
import { SIGNATURE_HEADER, TIMESTAMP_HEADER, signBody } from "./worker-signing"

const SECRET = "test-signing-secret"
const NETBIRD_BASE = "https://netbird.test"
const GROUP_ID = "grp-league"
const NETBIRD_TOKEN = "test-netbird-token-value"
const EMAIL = "member@example.test"
const REQUEST_ID = "11111111-1111-4111-8111-111111111111"
const DISCORD_ID = "1".repeat(18)
const ADMIN_ONE = "2".repeat(18)
const ADMIN_TWO = "3".repeat(18)

function makeKv(): KVLike & { store: Map<string, string> } {
  const store = new Map<string, string>()
  return {
    store,
    get: async (key) => store.get(key) ?? null,
    put: async (key, value) => {
      store.set(key, value)
    },
    delete: async (key) => {
      store.delete(key)
    },
  }
}

function makeEnv(overrides: Partial<Env> = {}): Env & { ONBOARD_KV: ReturnType<typeof makeKv> } {
  return {
    ONBOARDING_ENABLED: "true",
    NETBIRD_API_BASE: NETBIRD_BASE,
    NETBIRD_LEAGUE_GROUP_ID: GROUP_ID,
    INVITE_TTL_SECONDS: "259200",
    DAILY_INVITE_CAP: "20",
    NETBIRD_API_TOKEN: NETBIRD_TOKEN,
    DISCORD_BOT_TOKEN: "test-bot-token",
    SIGNING_SECRET: SECRET,
    ONBOARD_KV: makeKv(),
    ...overrides,
  } as Env & { ONBOARD_KV: ReturnType<typeof makeKv> }
}

async function signedRequest(
  path: string,
  payload: unknown,
  options: { secret?: string; timestamp?: string; signature?: string; method?: string } = {},
): Promise<Request> {
  const body = JSON.stringify(payload)
  const timestamp = options.timestamp ?? Math.floor(Date.now() / 1000).toString()
  const signature = options.signature ?? (await signBody(options.secret ?? SECRET, timestamp, body))
  return new Request(`https://worker.test${path}`, {
    method: options.method ?? "POST",
    headers: { "content-type": "application/json", [TIMESTAMP_HEADER]: timestamp, [SIGNATURE_HEADER]: signature },
    body: options.method === "GET" ? undefined : body,
  })
}

interface RecordedCall {
  method: string
  url: string
  headers: Record<string, string>
  body: Record<string, unknown> | null
}

type Responder = (call: RecordedCall) => Response | undefined

function stubFetch(responders: Record<string, Responder>) {
  const calls: RecordedCall[] = []
  const impl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = (init?.method ?? "GET").toUpperCase()
    const headers = Object.fromEntries(Object.entries((init?.headers as Record<string, string>) ?? {}))
    const body = typeof init?.body === "string" ? (JSON.parse(init.body) as Record<string, unknown>) : null
    const call: RecordedCall = { method, url, headers, body }
    calls.push(call)
    const key = `${method} ${new URL(url).pathname}`
    const responder = responders[key]
    const response = responder?.(call)
    if (response) return response
    return new Response(JSON.stringify({ message: `unexpected ${key}` }), { status: 500 })
  })
  vi.stubGlobal("fetch", impl)
  return calls
}

const ok = (body: unknown, status = 200): Responder => () =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
const fail = (status: number, body: unknown = { message: "boom" }): Responder => () =>
  new Response(JSON.stringify(body), { status })

const discordOk: Record<string, Responder> = {
  "POST /api/v10/users/@me/channels": (call) => new Response(JSON.stringify({ id: `chan-${call.body?.recipient_id}` })),
  [`POST /api/v10/channels/chan-${DISCORD_ID}/messages`]: ok({ id: "m1" }),
  [`POST /api/v10/channels/chan-${ADMIN_ONE}/messages`]: ok({ id: "m2" }),
  [`POST /api/v10/channels/chan-${ADMIN_TWO}/messages`]: ok({ id: "m3" }),
}

const invitePayload = { request_id: REQUEST_ID, email: EMAIL, name: "Ash Ketchum", discord_id: DISCORD_ID }

const newInviteNetbird: Record<string, Responder> = {
  "GET /api/users": ok([{ id: "u1", email: "someone-else@example.test", role: "admin" }]),
  "GET /api/users/invites": ok([]),
  "POST /api/users/invites": ok({
    id: "inv-1",
    invite_token: "nbi_abc123",
    expires_at: "2026-11-29T10:00:00Z",
  }),
}

async function post(env: Env, path: string, payload: unknown, options?: Parameters<typeof signedRequest>[2]) {
  const response = await worker.fetch(await signedRequest(path, payload, options), env)
  return { response, body: (await response.json()) as Record<string, unknown> }
}

describe("aab-netbird-onboard: request gate", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {})
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("rejects a bad signature with 401 and calls nothing", async () => {
    const calls = stubFetch({})
    const { response } = await post(makeEnv(), "/invite", invitePayload, { secret: "wrong-secret" })
    expect(response.status).toBe(401)
    expect(calls).toHaveLength(0)
  })

  it("rejects a request with missing signature headers", async () => {
    stubFetch({})
    const request = new Request("https://worker.test/invite", { method: "POST", body: JSON.stringify(invitePayload) })
    const response = await worker.fetch(request, makeEnv())
    expect(response.status).toBe(401)
  })

  it("rejects a replayed request older than 5 minutes", async () => {
    stubFetch({})
    const old = (Math.floor(Date.now() / 1000) - 6 * 60).toString()
    const { response } = await post(makeEnv(), "/invite", invitePayload, { timestamp: old })
    expect(response.status).toBe(401)
  })

  it("rejects a body that was changed after signing", async () => {
    stubFetch({})
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const signature = await signBody(SECRET, timestamp, JSON.stringify(invitePayload))
    const tampered = new Request("https://worker.test/invite", {
      method: "POST",
      headers: { [TIMESTAMP_HEADER]: timestamp, [SIGNATURE_HEADER]: signature },
      body: JSON.stringify({ ...invitePayload, email: "attacker@example.test" }),
    })
    expect((await worker.fetch(tampered, makeEnv())).status).toBe(401)
  })

  it("answers 503 when the kill switch is off, even with a valid signature, and calls nothing", async () => {
    const calls = stubFetch({})
    for (const value of [undefined, "false", "TRUE", "1", ""]) {
      const { response } = await post(makeEnv({ ONBOARDING_ENABLED: value }), "/invite", invitePayload)
      expect(response.status).toBe(503)
    }
    expect(calls).toHaveLength(0)
  })

  it("answers 503 when no signing secret is configured", async () => {
    stubFetch({})
    const { response } = await post(makeEnv({ SIGNING_SECRET: undefined }), "/invite", invitePayload)
    expect(response.status).toBe(503)
  })

  it("only accepts POST on known paths", async () => {
    stubFetch({})
    const get = await worker.fetch(await signedRequest("/invite", {}, { method: "GET" }), makeEnv())
    expect(get.status).toBe(405)
    const unknown = await worker.fetch(await signedRequest("/nope", {}), makeEnv())
    expect(unknown.status).toBe(404)
  })
})

describe("aab-netbird-onboard: /invite", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {})
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("refuses to run when the league group id is empty", async () => {
    const calls = stubFetch({})
    const { response, body } = await post(makeEnv({ NETBIRD_LEAGUE_GROUP_ID: "" }), "/invite", invitePayload)
    expect(response.status).toBe(503)
    expect(body.status).toBe("error")
    expect(calls).toHaveLength(0)
  })

  it("creates a new invite as role user in only the league group and DMs the link", async () => {
    const calls = stubFetch({ ...newInviteNetbird, ...discordOk })
    const { response, body } = await post(makeEnv(), "/invite", invitePayload)

    expect(response.status).toBe(200)
    expect(body).toMatchObject({
      status: "invited",
      invite_id: "inv-1",
      invite_url: `${NETBIRD_BASE}/invite?token=nbi_abc123`,
      expires_at: "2026-11-29T10:00:00Z",
      delivered_via: ["discord"],
    })

    const create = calls.find((call) => call.method === "POST" && call.url.endsWith("/api/users/invites"))
    expect(create?.body).toEqual({
      email: EMAIL,
      name: "Ash Ketchum",
      role: "user",
      auto_groups: [GROUP_ID],
      expires_in: 259200,
    })
    expect(create?.headers.Authorization).toBe(`Token ${NETBIRD_TOKEN}`)

    const dm = calls.find((call) => call.url.includes("/channels/chan-") && call.url.endsWith("/messages"))
    const content = String(dm?.body?.content)
    expect(content).toContain(`${NETBIRD_BASE}/invite?token=nbi_abc123`)
    expect(content).toContain("https://netbird.moodmnky.com")
    expect(content).toContain("Continue with Email")
    expect(content).toContain("https://poke-mnky.moodmnky.com/dashboard/guides/netbird")
    expect(dm?.body?.allowed_mentions).toEqual({ parse: [] })
  })

  it("regenerates an existing pending invite instead of creating another", async () => {
    const calls = stubFetch({
      "GET /api/users": ok([]),
      "GET /api/users/invites": ok([
        { id: "inv-old", email: EMAIL.toUpperCase(), expired: false, expires_at: "2099-01-01T00:00:00Z" },
      ]),
      "POST /api/users/invites/inv-old/regenerate": ok({
        invite_token: "nbi_new",
        invite_expires_at: "2026-11-30T10:00:00Z",
      }),
      ...discordOk,
    })
    const { body } = await post(makeEnv(), "/invite", invitePayload)

    expect(body).toMatchObject({
      status: "invited",
      invite_id: "inv-old",
      invite_url: `${NETBIRD_BASE}/invite?token=nbi_new`,
      expires_at: "2026-11-30T10:00:00Z",
    })
    expect(calls.some((call) => call.method === "POST" && call.url.endsWith("/api/users/invites"))).toBe(false)
    const regenerate = calls.find((call) => call.url.endsWith("/regenerate"))
    expect(regenerate?.body).toEqual({ expires_in: 259200 })
  })

  it("creates a new invite when the only existing one for that email is expired", async () => {
    const calls = stubFetch({
      ...newInviteNetbird,
      "GET /api/users/invites": ok([{ id: "inv-expired", email: EMAIL, expired: true }]),
    })
    const { body } = await post(makeEnv(), "/invite", { ...invitePayload, discord_id: null })
    expect(body.status).toBe("invited")
    expect(calls.some((call) => call.url.endsWith("/regenerate"))).toBe(false)
  })

  it("returns already_member and creates nothing when a user with that email exists", async () => {
    const calls = stubFetch({
      "GET /api/users": ok([{ id: "u9", email: EMAIL.toUpperCase(), role: "user" }]),
    })
    const { response, body } = await post(makeEnv(), "/invite", invitePayload)
    expect(response.status).toBe(200)
    expect(body).toEqual({ status: "already_member" })
    expect(calls.filter((call) => call.method !== "GET")).toHaveLength(0)
  })

  it("treats a 409 from NetBird as already_member", async () => {
    stubFetch({ ...newInviteNetbird, "POST /api/users/invites": fail(409, { message: "exists" }) })
    const { response, body } = await post(makeEnv(), "/invite", invitePayload)
    expect(response.status).toBe(200)
    expect(body).toEqual({ status: "already_member" })
  })

  it("returns a sanitized 502 error when NetBird fails", async () => {
    stubFetch({
      "GET /api/users": fail(503, { message: `down for ${EMAIL} at https://netbird.test/x with ${NETBIRD_TOKEN}` }),
    })
    const { response, body } = await post(makeEnv(), "/invite", invitePayload)
    expect(response.status).toBe(502)
    expect(body.status).toBe("error")
    const text = JSON.stringify(body)
    expect(text).not.toContain(EMAIL)
    expect(text).not.toContain(NETBIRD_TOKEN)
    expect(text).not.toContain("https://")
    expect(text).toContain("HTTP 503")
  })

  it("still reports invited, with no delivery channel, when the Discord DM fails", async () => {
    stubFetch({
      ...newInviteNetbird,
      "POST /api/v10/users/@me/channels": fail(403, { message: "Cannot send messages to this user" }),
    })
    const { response, body } = await post(makeEnv(), "/invite", invitePayload)
    expect(response.status).toBe(200)
    expect(body).toMatchObject({ status: "invited", delivered_via: [] })
  })

  it("skips Discord when there is no discord_id or no bot token", async () => {
    const calls = stubFetch(newInviteNetbird)
    const noId = await post(makeEnv(), "/invite", { ...invitePayload, discord_id: null })
    expect(noId.body.delivered_via).toEqual([])
    const noToken = await post(makeEnv({ DISCORD_BOT_TOKEN: undefined }), "/invite", {
      ...invitePayload,
      request_id: "22222222-2222-4222-8222-222222222222",
    })
    expect(noToken.body.delivered_via).toEqual([])
    expect(calls.some((call) => call.url.includes("discord.com"))).toBe(false)
  })

  it("is idempotent by request_id: a replay returns the same invite without calling NetBird again", async () => {
    const env = makeEnv()
    const calls = stubFetch({ ...newInviteNetbird, ...discordOk })
    const first = await post(env, "/invite", invitePayload)
    const callsAfterFirst = calls.length
    const second = await post(env, "/invite", invitePayload)
    expect(second.body).toEqual(first.body)
    expect(calls).toHaveLength(callsAfterFirst)
  })

  it("stops at the daily cap but still replays an invite that already exists", async () => {
    const env = makeEnv({ DAILY_INVITE_CAP: "1" })
    const calls = stubFetch(newInviteNetbird)
    const first = await post(env, "/invite", invitePayload)
    expect(first.body.status).toBe("invited")

    const second = await post(env, "/invite", {
      ...invitePayload,
      request_id: "33333333-3333-4333-8333-333333333333",
      email: "other@example.test",
    })
    expect(second.response.status).toBe(429)
    expect(second.body.status).toBe("error")

    const callsBefore = calls.length
    const replay = await post(env, "/invite", invitePayload)
    expect(replay.body).toEqual(first.body)
    expect(calls).toHaveLength(callsBefore)
  })

  it("rejects an invalid email or request id", async () => {
    stubFetch({})
    expect((await post(makeEnv(), "/invite", { ...invitePayload, email: "not-an-email" })).response.status).toBe(400)
    expect((await post(makeEnv(), "/invite", { ...invitePayload, request_id: "x" })).response.status).toBe(400)
  })

  it("never logs emails, tokens or invite links", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {})
    stubFetch({ ...newInviteNetbird, ...discordOk })
    await post(makeEnv(), "/invite", invitePayload)
    const logged = JSON.stringify(log.mock.calls)
    expect(logged).toContain(REQUEST_ID)
    for (const secret of [EMAIL, "nbi_abc123", NETBIRD_TOKEN, SECRET, "test-bot-token", "/invite?token="]) {
      expect(logged).not.toContain(secret)
    }
  })
})

describe("aab-netbird-onboard: /revoke", () => {
  const revokePayload = { request_id: REQUEST_ID, invite_id: "inv-1", email: EMAIL }

  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {})
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("deletes a pending invite and does not touch users", async () => {
    const calls = stubFetch({
      "GET /api/users/invites": ok([{ id: "inv-1", email: EMAIL }]),
      "DELETE /api/users/invites/inv-1": () => new Response(null, { status: 200 }),
    })
    const { response, body } = await post(makeEnv(), "/revoke", revokePayload)
    expect(response.status).toBe(200)
    expect(body).toMatchObject({ status: "revoked", method: "invite_deleted" })
    expect(calls.some((call) => call.url.endsWith("/api/users"))).toBe(false)
  })

  it("blocks an accepted user, preserving role and groups, and never deletes the user", async () => {
    const calls = stubFetch({
      "GET /api/users/invites": ok([]),
      "GET /api/users": ok([{ id: "auth0|abc", email: EMAIL, role: "user", auto_groups: [GROUP_ID, "grp-extra"] }]),
      "PUT /api/users/auth0%7Cabc": ok({ id: "auth0|abc" }),
    })
    const { body } = await post(makeEnv(), "/revoke", revokePayload)
    expect(body).toMatchObject({ status: "revoked", method: "user_blocked" })

    const put = calls.find((call) => call.method === "PUT")
    expect(put?.body).toEqual({ role: "user", auto_groups: [GROUP_ID, "grp-extra"], is_blocked: true })
    expect(calls.some((call) => call.method === "DELETE")).toBe(false)
  })

  it("refuses to block an admin or service account", async () => {
    const calls = stubFetch({
      "GET /api/users/invites": ok([]),
      "GET /api/users": ok([{ id: "u-admin", email: EMAIL, role: "admin", auto_groups: [] }]),
    })
    const { response, body } = await post(makeEnv(), "/revoke", revokePayload)
    expect(response.status).toBe(403)
    expect(body.status).toBe("error")
    expect(calls.some((call) => call.method === "PUT")).toBe(false)
  })

  it("succeeds quietly when there is nothing left to revoke", async () => {
    stubFetch({ "GET /api/users/invites": ok([]), "GET /api/users": ok([]) })
    const { response, body } = await post(makeEnv(), "/revoke", { ...revokePayload, invite_id: null })
    expect(response.status).toBe(200)
    expect(body).toMatchObject({ status: "revoked", method: "nothing_found" })
  })

  it("forgets the cached invite so a later resend creates a fresh one", async () => {
    const env = makeEnv()
    stubFetch({
      ...newInviteNetbird,
      "GET /api/users/invites": ok([]),
      "GET /api/users": ok([]),
    })
    await post(env, "/invite", { ...invitePayload, discord_id: null })
    expect(env.ONBOARD_KV.store.has(`invite:${REQUEST_ID}`)).toBe(true)
    await post(env, "/revoke", { ...revokePayload, invite_id: null })
    expect(env.ONBOARD_KV.store.has(`invite:${REQUEST_ID}`)).toBe(false)
  })

  it("answers 503 when the kill switch is off", async () => {
    const calls = stubFetch({})
    const { response } = await post(makeEnv({ ONBOARDING_ENABLED: "false" }), "/revoke", revokePayload)
    expect(response.status).toBe(503)
    expect(calls).toHaveLength(0)
  })
})

describe("aab-netbird-onboard: /notify-admins", () => {
  const notifyPayload = {
    request_id: REQUEST_ID,
    requester_name: "Ash Ketchum",
    source: "discord",
    admin_discord_ids: [ADMIN_ONE, ADMIN_TWO],
  }

  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {})
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("DMs every admin an Approve and Deny message with the agreed custom ids", async () => {
    const calls = stubFetch(discordOk)
    const { response, body } = await post(makeEnv(), "/notify-admins", notifyPayload)
    expect(response.status).toBe(200)
    expect(body).toMatchObject({ status: "ok", notified: 2, failed: 0 })

    const messages = calls.filter((call) => call.url.endsWith("/messages"))
    expect(messages).toHaveLength(2)
    const row = (messages[0].body?.components as Array<{ components: Array<{ custom_id: string }> }>)[0]
    expect(row.components.map((button) => button.custom_id)).toEqual([
      `nbreq:approve:${REQUEST_ID}`,
      `nbreq:deny:${REQUEST_ID}`,
    ])
    expect(messages[0].body?.allowed_mentions).toEqual({ parse: [] })
  })

  it("counts an admin who cannot be reached and still reports ok when someone was notified", async () => {
    stubFetch({
      ...discordOk,
      [`POST /api/v10/channels/chan-${ADMIN_TWO}/messages`]: fail(403),
    })
    const { body } = await post(makeEnv(), "/notify-admins", notifyPayload)
    expect(body).toMatchObject({ status: "ok", notified: 1, failed: 1 })
  })

  it("reports an error when nobody could be reached", async () => {
    stubFetch({ "POST /api/v10/users/@me/channels": fail(500) })
    const { body } = await post(makeEnv(), "/notify-admins", notifyPayload)
    expect(body.status).toBe("error")
  })

  it("does not DM twice for the same request", async () => {
    const env = makeEnv()
    const calls = stubFetch(discordOk)
    await post(env, "/notify-admins", notifyPayload)
    const afterFirst = calls.length
    const second = await post(env, "/notify-admins", notifyPayload)
    expect(second.body).toMatchObject({ status: "ok", already_sent: true })
    expect(calls).toHaveLength(afterFirst)
  })

  it("requires admin ids and a bot token", async () => {
    stubFetch({})
    expect((await post(makeEnv(), "/notify-admins", { ...notifyPayload, admin_discord_ids: [] })).response.status).toBe(400)
    expect((await post(makeEnv({ DISCORD_BOT_TOKEN: undefined }), "/notify-admins", notifyPayload)).response.status).toBe(
      503,
    )
  })
})
