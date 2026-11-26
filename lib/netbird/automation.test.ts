import { randomUUID } from "node:crypto"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { SIGNATURE_HEADER, TIMESTAMP_HEADER, verifySignature } from "./worker-signing"

type Row = Record<string, unknown>

interface FakeState {
  tables: Record<string, Row[]>
  rpc: Record<string, (args: Record<string, unknown>) => { data: unknown; error: { message: string } | null }>
  emails: Record<string, string | null>
  adminIds: Set<string>
}

const state: FakeState = vi.hoisted(() => ({
  tables: {},
  rpc: {},
  emails: {},
  adminIds: new Set<string>(),
}))

const OPEN = ["pending", "approved", "invited"]

class Query implements PromiseLike<{ data: unknown; error: { message: string; code?: string } | null }> {
  private op: "select" | "insert" | "update" | "upsert" | "delete" = "select"
  private payload: Row = {}
  private filters: ((row: Row) => boolean)[] = []
  private returning = false

  constructor(private table: string) {
    state.tables[table] ??= []
  }

  select() {
    if (this.op !== "select") this.returning = true
    return this
  }
  insert(payload: Row) {
    this.op = "insert"
    this.payload = payload
    return this
  }
  update(payload: Row) {
    this.op = "update"
    this.payload = payload
    return this
  }
  upsert(payload: Row) {
    this.op = "upsert"
    this.payload = payload
    return this
  }
  delete() {
    this.op = "delete"
    return this
  }
  eq(column: string, value: unknown) {
    this.filters.push((row) => row[column] === value)
    return this
  }
  lt(column: string, value: string) {
    this.filters.push((row) => row[column] != null && String(row[column]) < value)
    return this
  }
  in(column: string, values: unknown[]) {
    this.filters.push((row) => values.includes(row[column]))
    return this
  }
  order() {
    return this
  }
  limit() {
    return this
  }

  private run(): { rows: Row[]; error: { message: string; code?: string } | null } {
    const rows = state.tables[this.table]
    const matching = rows.filter((row) => this.filters.every((f) => f(row)))
    switch (this.op) {
      case "select":
        return { rows: matching, error: null }
      case "insert": {
        if (
          this.table === "netbird_access_requests" &&
          OPEN.includes(String(this.payload.status)) &&
          rows.some((r) => r.user_id === this.payload.user_id && OPEN.includes(String(r.status)))
        ) {
          return { rows: [], error: { message: "duplicate key", code: "23505" } }
        }
        const row: Row = {
          id: randomUUID(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          attempt_count: 0,
          last_error: null,
          display_name: "Test Coach",
          discord_id: "111",
          discord_username: "testcoach",
          role: "coach",
          reviewed_by: null,
          reviewed_at: null,
          invite_expires_at: null,
          delivered_via: null,
          delivered_at: null,
          revoked_at: null,
          revoked_by: null,
          netbird_invite_id: null,
          ...this.payload,
        }
        rows.push(row)
        return { rows: [row], error: null }
      }
      case "update": {
        for (const row of matching) Object.assign(row, this.payload)
        return { rows: matching, error: null }
      }
      case "upsert": {
        const existing = rows.find((r) => r.request_id === this.payload.request_id)
        if (existing) Object.assign(existing, this.payload)
        else rows.push({ ...this.payload })
        return { rows: [this.payload], error: null }
      }
      case "delete":
        state.tables[this.table] = rows.filter((row) => !matching.includes(row))
        return { rows: [], error: null }
    }
  }

  maybeSingle() {
    const { rows, error } = this.run()
    return Promise.resolve({ data: rows[0] ?? null, error })
  }
  single() {
    const { rows, error } = this.run()
    return Promise.resolve({
      data: rows[0] ?? null,
      error: error ?? (rows[0] ? null : { message: "no rows" }),
    })
  }
  then<T1, T2>(
    onfulfilled?: ((value: { data: unknown; error: { message: string; code?: string } | null }) => T1 | PromiseLike<T1>) | null,
    onrejected?: ((reason: unknown) => T2 | PromiseLike<T2>) | null,
  ) {
    const { rows, error } = this.run()
    return Promise.resolve({ data: rows, error }).then(onfulfilled, onrejected)
  }
}

const fakeDb = {
  from: (table: string) => new Query(table),
  rpc: (name: string, args: Record<string, unknown>) => Promise.resolve(state.rpc[name](args)),
  auth: {
    admin: {
      getUserById: (id: string) =>
        Promise.resolve({ data: { user: { id, email: state.emails[id] ?? null } }, error: null }),
    },
  },
}

vi.mock("server-only", () => ({}))
vi.mock("@/lib/supabase/service", () => ({ createServiceRoleClient: () => fakeDb }))
vi.mock("@/lib/admin-api-auth", () => ({
  resolveLeagueAdminAccess: async (userId: string) =>
    state.adminIds.has(userId)
      ? { allowed: true, userId, role: "admin" }
      : { allowed: false, error: "Forbidden", status: 403 },
}))

import {
  approveRequest,
  denyRequest,
  expireStaleInvites,
  isOnboardingEnabled,
  requestAccess,
  resendRequest,
  retryInvite,
  revokeRequest,
  sanitizeError,
} from "./automation"

const SECRET = "unit-test-signing-secret"
const USER = "00000000-0000-4000-8000-000000000001"
const ADMIN = "00000000-0000-4000-8000-0000000000aa"
const COACH_ROW = [{ coach_id: "coach-1", season_id: "season-8" }]

const requests = () => state.tables.netbird_access_requests
const events = () => state.tables.netbird_onboarding_events
const eventActions = () => events().map((e) => e.action)

function workerOk(overrides: Record<string, unknown> = {}) {
  return new Response(
    JSON.stringify({
      status: "invited",
      invite_id: "inv-1",
      invite_url: "https://battle.example.test/join/abc",
      expires_at: "2030-01-01T00:00:00.000Z",
      delivered_via: ["discord_dm"],
      ...overrides,
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  )
}

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  state.tables = {}
  state.emails = { [USER]: "member@example.test" }
  state.adminIds = new Set([ADMIN])
  state.rpc = {
    netbird_onboarding_rate_ok: () => ({ data: true, error: null }),
    netbird_auto_invite_cap_ok: () => ({ data: true, error: null }),
    netbird_current_coach: () => ({ data: [], error: null }),
  }
  vi.stubEnv("NETBIRD_ONBOARDING_ENABLED", "true")
  vi.stubEnv("NETBIRD_ONBOARD_WORKER_URL", "https://worker.example.test")
  vi.stubEnv("NETBIRD_ONBOARD_SIGNING_SECRET", SECRET)
  fetchMock = vi.fn(async () => workerOk())
  vi.stubGlobal("fetch", fetchMock)
  vi.spyOn(console, "error").mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("kill switch", () => {
  it.each([undefined, "", "false", "TRUE", "1", "yes", " true"])("treats %j as OFF", (value) => {
    if (value === undefined) vi.stubEnv("NETBIRD_ONBOARDING_ENABLED", undefined as unknown as string)
    else vi.stubEnv("NETBIRD_ONBOARDING_ENABLED", value)
    expect(isOnboardingEnabled()).toBe(false)
  })

  it("only the exact string true turns it on", () => {
    expect(isOnboardingEnabled()).toBe(true)
  })

  it("blocks member requests and every Worker-calling admin action when OFF", async () => {
    vi.stubEnv("NETBIRD_ONBOARDING_ENABLED", "false")
    state.tables.netbird_access_requests = [{ id: "req-2", user_id: USER, status: "invited" }]

    const results = [
      await requestAccess({ userId: USER, source: "app" }),
      await retryInvite({ userId: USER, source: "app" }),
      await resendRequest("req-2", ADMIN),
    ]
    for (const result of results) {
      expect(result).toMatchObject({ ok: false, code: "disabled" })
    }
    expect(fetchMock).not.toHaveBeenCalled()
    expect(state.tables.netbird_onboarding_events ?? []).toHaveLength(0)
    expect(requests().map((r) => r.status)).toEqual(["invited"])
  })

  it("approve while OFF saves approved without calling the Worker, and Send again works once ON", async () => {
    vi.stubEnv("NETBIRD_ONBOARDING_ENABLED", "false")
    state.tables.netbird_access_requests = [
      { id: "req-1", user_id: USER, status: "pending", decision: "admin", attempt_count: 0, invite_email: "member@example.test" },
    ]

    const approved = await approveRequest("req-1", ADMIN)
    expect(approved).toMatchObject({ ok: true, paused: true, request: { status: "approved", reviewed_by: ADMIN } })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(events()[0]).toMatchObject({ action: "approved", detail: { invite_deferred: true } })

    vi.stubEnv("NETBIRD_ONBOARDING_ENABLED", "true")
    const sent = await resendRequest("req-1", ADMIN)
    expect(sent).toMatchObject({ ok: true, request: { status: "invited" } })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("keeps deny and expiry sweeping available while OFF", async () => {
    vi.stubEnv("NETBIRD_ONBOARDING_ENABLED", "false")
    state.tables.netbird_access_requests = [{ id: "req-1", user_id: USER, status: "pending" }]
    await expect(denyRequest("req-1", ADMIN)).resolves.toMatchObject({ ok: true })
    await expect(expireStaleInvites()).resolves.toBe(0)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe("requestAccess", () => {
  it("auto-approves a current coach and calls the Worker with a signed body", async () => {
    state.rpc.netbird_current_coach = () => ({ data: COACH_ROW, error: null })

    const result = await requestAccess({ userId: USER, source: "app", discordId: "111" })

    expect(result).toMatchObject({ ok: true, created: true })
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe("https://worker.example.test/invite")
    const body = String(init.body)
    expect(JSON.parse(body)).toEqual({
      request_id: requests()[0].id,
      email: "member@example.test",
      name: "Test Coach",
      discord_id: "111",
    })
    const headers = init.headers as Record<string, string>
    await expect(
      verifySignature(SECRET, headers[TIMESTAMP_HEADER], body, headers[SIGNATURE_HEADER]),
    ).resolves.toEqual({ ok: true })

    expect(requests()[0]).toMatchObject({
      status: "invited",
      decision: "auto_coach",
      coach_id: "coach-1",
      season_id: "season-8",
      netbird_invite_id: "inv-1",
      delivered_via: ["discord_dm"],
      attempt_count: 1,
      last_error: null,
    })
    expect(state.tables.netbird_invite_links).toEqual([
      expect.objectContaining({ request_id: requests()[0].id, invite_url: "https://battle.example.test/join/abc" }),
    ])
    expect(eventActions()).toEqual(["request_attempt", "request_created", "auto_approved", "invite_created"])

    // The returned request is member-safe: no admin bookkeeping and no invite URL.
    if (result.ok) {
      expect(result.request).not.toHaveProperty("last_error")
      expect(result.request).not.toHaveProperty("invite_email")
      expect(JSON.stringify(result.request)).not.toContain("battle.example.test")
    }
  })

  it("leaves a non-coach pending and does not call the Worker", async () => {
    const result = await requestAccess({ userId: USER, source: "discord", discordId: "111" })

    expect(result).toMatchObject({ ok: true, created: true, request: { status: "pending", source: "discord" } })
    expect(requests()[0]).toMatchObject({ decision: "admin", status: "pending", coach_id: null })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(eventActions()).toEqual(["request_attempt", "request_created"])
  })

  it("is idempotent: a second request returns the existing open request", async () => {
    const first = await requestAccess({ userId: USER, source: "app" })
    const second = await requestAccess({ userId: USER, source: "discord" })

    expect(requests()).toHaveLength(1)
    expect(second).toMatchObject({ ok: true, created: false })
    if (first.ok && second.ok) expect(second.request.id).toBe(first.request.id)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("returns the rate-limit message and creates nothing when the limit is hit", async () => {
    state.rpc.netbird_onboarding_rate_ok = () => ({ data: false, error: null })

    const result = await requestAccess({ userId: USER, source: "app" })

    expect(result).toMatchObject({ ok: false, code: "rate_limited" })
    expect(requests() ?? []).toHaveLength(0)
    expect(events() ?? []).toHaveLength(0)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("falls back to pending for a coach when the league-wide cap is reached, without rejecting", async () => {
    state.rpc.netbird_current_coach = () => ({ data: COACH_ROW, error: null })
    state.rpc.netbird_auto_invite_cap_ok = () => ({ data: false, error: null })

    const result = await requestAccess({ userId: USER, source: "app" })

    expect(result).toMatchObject({ ok: true, created: true, request: { status: "pending", decision: "admin" } })
    expect(requests()[0]).toMatchObject({ coach_id: "coach-1", season_id: "season-8" })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(eventActions()).toEqual(["request_attempt", "request_created", "auto_cap_reached"])
  })

  it("fails closed to pending when the cap check errors", async () => {
    state.rpc.netbird_current_coach = () => ({ data: COACH_ROW, error: null })
    state.rpc.netbird_auto_invite_cap_ok = () => ({ data: null, error: { message: "boom" } })
    await expect(requestAccess({ userId: USER, source: "app" })).resolves.toMatchObject({
      ok: true,
      request: { status: "pending" },
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("never consults the cap for non-coaches", async () => {
    const cap = vi.fn(() => ({ data: false, error: null }))
    state.rpc.netbird_auto_invite_cap_ok = cap
    await expect(requestAccess({ userId: USER, source: "app" })).resolves.toMatchObject({
      ok: true,
      request: { status: "pending" },
    })
    expect(cap).not.toHaveBeenCalled()
    expect(eventActions()).not.toContain("auto_cap_reached")
  })

  it("does not let a member with a denied or revoked request ask again", async () => {
    state.rpc.netbird_current_coach = () => ({ data: COACH_ROW, error: null })
    state.tables.netbird_access_requests = [{ id: "old", user_id: USER, status: "revoked", created_at: "2026-01-01T00:00:00Z" }]
    await expect(requestAccess({ userId: USER, source: "app" })).resolves.toMatchObject({
      ok: false,
      code: "forbidden",
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("fails closed when the rate limit check errors", async () => {
    state.rpc.netbird_onboarding_rate_ok = () => ({ data: null, error: { message: "boom" } })
    await expect(requestAccess({ userId: USER, source: "app" })).resolves.toMatchObject({ ok: false, code: "error" })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("requires an email address on the account", async () => {
    state.emails[USER] = null
    await expect(requestAccess({ userId: USER, source: "app" })).resolves.toMatchObject({
      ok: false,
      code: "no_email",
    })
    expect(requests() ?? []).toHaveLength(0)
  })

  it("marks the request failed with a sanitized error when the Worker errors", async () => {
    state.rpc.netbird_current_coach = () => ({ data: COACH_ROW, error: null })
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: `bad token ${SECRET} at https://api.example.test/x?k=abc` }), {
        status: 502,
      }),
    )

    const result = await requestAccess({ userId: USER, source: "app" })

    expect(result).toMatchObject({ ok: true, request: { status: "failed" } })
    const lastError = String(requests()[0].last_error)
    expect(lastError).toContain("HTTP 502")
    expect(lastError).not.toContain(SECRET)
    expect(lastError).not.toContain("api.example.test")
    expect(requests()[0].attempt_count).toBe(1)
    expect(eventActions()).toContain("invite_failed")
    expect(state.tables.netbird_invite_links ?? []).toHaveLength(0)
  })

  it("marks the request failed when the Worker reports status error or a network failure", async () => {
    state.rpc.netbird_current_coach = () => ({ data: COACH_ROW, error: null })
    fetchMock.mockResolvedValueOnce(workerOk({ status: "error", error: "NetBird said no" }))
    await requestAccess({ userId: USER, source: "app" })
    expect(requests()[0]).toMatchObject({ status: "failed", last_error: "NetBird said no" })

    state.tables = {}
    fetchMock.mockRejectedValueOnce(Object.assign(new Error("timed out"), { name: "TimeoutError" }))
    await requestAccess({ userId: USER, source: "app" })
    expect(requests()[0]).toMatchObject({ status: "failed", last_error: "The onboarding worker took too long to answer." })
  })

  it("marks the request failed when the Worker is not configured", async () => {
    state.rpc.netbird_current_coach = () => ({ data: COACH_ROW, error: null })
    vi.stubEnv("NETBIRD_ONBOARD_SIGNING_SECRET", "")
    await requestAccess({ userId: USER, source: "app" })
    expect(requests()[0]).toMatchObject({ status: "failed" })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("treats already_member as invited without storing a link", async () => {
    state.rpc.netbird_current_coach = () => ({ data: COACH_ROW, error: null })
    fetchMock.mockResolvedValueOnce(workerOk({ status: "already_member", invite_url: null }))
    await requestAccess({ userId: USER, source: "app" })
    expect(requests()[0]).toMatchObject({ status: "invited", last_error: null })
    expect(state.tables.netbird_invite_links ?? []).toHaveLength(0)
    expect(eventActions()).toContain("already_member")
  })
})

describe("admin actions", () => {
  beforeEach(() => {
    state.tables.netbird_access_requests = [
      { id: "req-1", user_id: USER, status: "pending", decision: "admin", attempt_count: 0, display_name: "Test" },
    ]
  })

  it("rejects non-admins before touching anything", async () => {
    const result = await approveRequest("req-1", "not-an-admin")
    expect(result).toMatchObject({ ok: false, code: "forbidden" })
    expect(requests()[0].status).toBe("pending")
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("approve moves pending to approved, then invited via the Worker", async () => {
    const result = await approveRequest("req-1", ADMIN)
    expect(result).toMatchObject({ ok: true, request: { status: "invited", reviewed_by: ADMIN } })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(eventActions()).toEqual(["approved", "invite_created"])
  })

  it("approve only works from pending", async () => {
    requests()[0].status = "denied"
    await expect(approveRequest("req-1", ADMIN)).resolves.toMatchObject({ ok: false, code: "invalid_state" })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("deny moves pending to denied without calling the Worker, even when onboarding is OFF", async () => {
    vi.stubEnv("NETBIRD_ONBOARDING_ENABLED", "false")
    const result = await denyRequest("req-1", ADMIN)
    expect(result).toMatchObject({ ok: true, request: { status: "denied" } })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(eventActions()).toEqual(["denied"])
  })

  it("resend moves failed back to approved and retries the invite", async () => {
    Object.assign(requests()[0], { status: "failed", last_error: "old", attempt_count: 1, invite_email: "member@example.test" })
    const result = await resendRequest("req-1", ADMIN)
    expect(result).toMatchObject({ ok: true, request: { status: "invited", last_error: null, attempt_count: 2 } })
    expect(eventActions()).toEqual(["resend_requested", "invite_created"])
  })

  it("resend refuses a pending request", async () => {
    await expect(resendRequest("req-1", ADMIN)).resolves.toMatchObject({ ok: false, code: "invalid_state" })
  })

  it("revoke calls /revoke, marks revoked and deletes the stored link", async () => {
    Object.assign(requests()[0], {
      status: "invited",
      netbird_invite_id: "inv-1",
      invite_email: "member@example.test",
    })
    state.tables.netbird_invite_links = [{ request_id: "req-1", invite_url: "https://battle.example.test/join/abc" }]
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ status: "revoked" }), { status: 200 }))

    const result = await revokeRequest("req-1", ADMIN)

    expect(result).toMatchObject({ ok: true, request: { status: "revoked", revoked_by: ADMIN } })
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe("https://worker.example.test/revoke")
    expect(JSON.parse(String(init.body))).toEqual({
      request_id: "req-1",
      invite_id: "inv-1",
      email: "member@example.test",
    })
    expect(state.tables.netbird_invite_links).toHaveLength(0)
    expect(eventActions()).toEqual(["revoked"])
  })

  it("revoke keeps the status when the Worker fails", async () => {
    Object.assign(requests()[0], { status: "invited", invite_email: "member@example.test" })
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 500 }))

    const result = await revokeRequest("req-1", ADMIN)

    expect(result).toMatchObject({ ok: false, code: "error" })
    expect(requests()[0].status).toBe("invited")
    expect(eventActions()).toEqual(["revoke_failed"])
  })

  it("revoke only works from approved or invited", async () => {
    await expect(revokeRequest("req-1", ADMIN)).resolves.toMatchObject({ ok: false, code: "invalid_state" })
  })
})

describe("expireStaleInvites", () => {
  it("expires only invited rows past their expiry and deletes their links", async () => {
    state.tables.netbird_access_requests = [
      { id: "old", user_id: USER, status: "invited", invite_expires_at: "2020-01-01T00:00:00.000Z" },
      { id: "fresh", user_id: "u2", status: "invited", invite_expires_at: "2999-01-01T00:00:00.000Z" },
      { id: "pending", user_id: "u3", status: "pending", invite_expires_at: null },
    ]
    state.tables.netbird_invite_links = [
      { request_id: "old", invite_url: "https://battle.example.test/join/old" },
      { request_id: "fresh", invite_url: "https://battle.example.test/join/fresh" },
    ]

    await expect(expireStaleInvites()).resolves.toBe(1)

    expect(requests().map((r) => [r.id, r.status])).toEqual([
      ["old", "expired"],
      ["fresh", "invited"],
      ["pending", "pending"],
    ])
    expect(state.tables.netbird_invite_links.map((l) => l.request_id)).toEqual(["fresh"])
    expect(eventActions()).toEqual(["invite_expired"])
  })

  it("runs at the start of requestAccess", async () => {
    state.tables.netbird_access_requests = [
      { id: "old", user_id: USER, status: "invited", invite_expires_at: "2020-01-01T00:00:00.000Z", created_at: "2026-01-01T00:00:00Z" },
    ]
    const result = await requestAccess({ userId: USER, source: "app" })
    expect(requests().find((r) => r.id === "old")?.status).toBe("expired")
    // The expired request no longer blocks a fresh one.
    expect(result).toMatchObject({ ok: true, created: true })
  })
})

describe("retryInvite", () => {
  it("resends the member's own failed request in place", async () => {
    state.tables.netbird_access_requests = [
      { id: "req-1", user_id: USER, status: "failed", decision: "auto_coach", attempt_count: 1, last_error: "x", invite_email: "member@example.test", created_at: "2026-01-01T00:00:00Z" },
    ]
    const result = await retryInvite({ userId: USER, source: "app", discordId: "111" })
    expect(result).toMatchObject({ ok: true, created: false, request: { id: "req-1", status: "invited" } })
    expect(requests()).toHaveLength(1)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("respects the per-person limit", async () => {
    state.tables.netbird_access_requests = [
      { id: "req-1", user_id: USER, status: "expired", attempt_count: 1, created_at: "2026-01-01T00:00:00Z" },
    ]
    state.rpc.netbird_onboarding_rate_ok = () => ({ data: false, error: null })
    await expect(retryInvite({ userId: USER, source: "app" })).resolves.toMatchObject({ ok: false, code: "rate_limited" })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(requests()[0].status).toBe("expired")
  })

  it("falls through to a normal request when there is nothing to retry", async () => {
    await expect(retryInvite({ userId: USER, source: "app" })).resolves.toMatchObject({
      ok: true,
      created: true,
      request: { status: "pending" },
    })
  })
})

describe("sanitizeError", () => {
  it("removes secrets, links and long tokens and truncates", () => {
    const text = sanitizeError(`fail ${SECRET} https://x.test/path?token=1 ${"a".repeat(40)} ${"word ".repeat(80)}`, SECRET)
    expect(text).not.toContain(SECRET)
    expect(text).not.toContain("x.test")
    expect(text).not.toContain("a".repeat(40))
    expect(text.length).toBeLessThanOrEqual(200)
  })
})
