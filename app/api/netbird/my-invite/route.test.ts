import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

type Row = Record<string, unknown>

const state = vi.hoisted(() => ({
  userId: null as string | null,
  requests: [] as Row[],
  links: [] as Row[],
}))

class Query {
  private filters: ((row: Row) => boolean)[] = []
  constructor(private table: "netbird_access_requests" | "netbird_invite_links") {}
  select() {
    return this
  }
  eq(column: string, value: unknown) {
    this.filters.push((row) => row[column] === value)
    return this
  }
  order() {
    return this
  }
  limit() {
    return this
  }
  maybeSingle() {
    const rows = (this.table === "netbird_access_requests" ? state.requests : state.links).filter((row) =>
      this.filters.every((f) => f(row)),
    )
    return Promise.resolve({ data: rows[0] ?? null, error: null })
  }
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: state.userId ? { id: state.userId } : null } }),
    },
  }),
}))
vi.mock("@/lib/supabase/service", () => ({
  createServiceRoleClient: () => ({ from: (table: "netbird_access_requests" | "netbird_invite_links") => new Query(table) }),
}))

import { GET } from "./route"

const OWNER = "11111111-1111-4111-8111-111111111111"
const OTHER = "22222222-2222-4222-8222-222222222222"
const REQUEST_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const URL_TEXT = "https://battle.example.test/join/secret"

function call(requestId?: string) {
  const url = new URL("http://localhost/api/netbird/my-invite")
  if (requestId) url.searchParams.set("request_id", requestId)
  return GET(new NextRequest(url))
}

beforeEach(() => {
  state.userId = OWNER
  state.requests = [{ id: REQUEST_ID, user_id: OWNER, status: "invited" }]
  state.links = [{ request_id: REQUEST_ID, invite_url: URL_TEXT, expires_at: "2999-01-01T00:00:00.000Z" }]
})

describe("GET /api/netbird/my-invite", () => {
  it("returns the owner's link with no-store", async () => {
    const res = await call(REQUEST_ID)
    expect(res.status).toBe(200)
    expect(res.headers.get("Cache-Control")).toBe("no-store")
    await expect(res.json()).resolves.toEqual({ invite_url: URL_TEXT, expires_at: "2999-01-01T00:00:00.000Z" })
  })

  it("works without a request_id by using the latest invited request", async () => {
    const res = await call()
    expect(res.status).toBe(200)
  })

  it("returns 404 for another user's request and never leaks the link", async () => {
    state.userId = OTHER
    const res = await call(REQUEST_ID)
    expect(res.status).toBe(404)
    expect(res.headers.get("Cache-Control")).toBe("no-store")
    expect(JSON.stringify(await res.json())).not.toContain("battle.example.test")
  })

  it("returns 404 when the request is not invited anymore", async () => {
    state.requests[0].status = "revoked"
    expect((await call(REQUEST_ID)).status).toBe(404)
  })

  it("returns 404 when the link is missing or expired", async () => {
    state.links = []
    expect((await call(REQUEST_ID)).status).toBe(404)

    state.links = [{ request_id: REQUEST_ID, invite_url: URL_TEXT, expires_at: "2020-01-01T00:00:00.000Z" }]
    expect((await call(REQUEST_ID)).status).toBe(404)
  })

  it("returns 404 for a malformed request id", async () => {
    expect((await call("not-a-uuid")).status).toBe(404)
  })

  it("returns 401 with no-store when signed out", async () => {
    state.userId = null
    const res = await call(REQUEST_ID)
    expect(res.status).toBe(401)
    expect(res.headers.get("Cache-Control")).toBe("no-store")
  })
})
