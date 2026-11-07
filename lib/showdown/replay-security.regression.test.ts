import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { validateOfficialReplayUrl } from "./replay-url"
import { fetchOfficialPublicReplayJson } from "./replay-fetch"
import {
  assertCallerOwnsMatchSide,
  hashReplayContent,
} from "./replay-archive"
import { resetReplayRateLimitForTests } from "./replay-rate-limit"

vi.mock("@/lib/coach-team-context", () => ({
  resolveCoachTeamForSeason: vi.fn(),
}))

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: vi.fn(async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) },
  })),
}))

vi.mock("@/lib/supabase/service", () => ({
  createServiceRoleClient: vi.fn(() => ({})),
}))

const previewOfficialPublicReplay = vi.fn()
const archiveOfficialPublicReplay = vi.fn()
const assertCallerOwnsMatchSideMock = vi.fn()
const linkArchiveToMatch = vi.fn()

vi.mock("./replay-archive", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./replay-archive")>()
  return {
    ...actual,
    previewOfficialPublicReplay: (...args: unknown[]) =>
      previewOfficialPublicReplay(...args),
    archiveOfficialPublicReplay: (...args: unknown[]) =>
      archiveOfficialPublicReplay(...args),
    // keep real assertCallerOwnsMatchSide for ownership tests via direct import
    linkArchiveToMatch: (...args: unknown[]) => linkArchiveToMatch(...args),
  }
})

import { resolveCoachTeamForSeason } from "@/lib/coach-team-context"
import { POST as previewPost } from "@/app/api/replays/preview/route"
import { POST as importPost } from "@/app/api/replays/import/route"

describe("Phase1 security regressions", () => {
  beforeEach(() => {
    delete process.env.REPLAY_INGEST_ENABLED
    previewOfficialPublicReplay.mockReset()
    archiveOfficialPublicReplay.mockReset()
    assertCallerOwnsMatchSideMock.mockReset()
    linkArchiveToMatch.mockReset()
    resetReplayRateLimitForTests()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("rejects SSRF-ish hosts, credentials, and path traversal", () => {
    const cases = [
      "https://127.0.0.1/gen9ou-1",
      "https://[::1]/gen9ou-1",
      "https://user:pass@replay.pokemonshowdown.com/gen9ou-1",
      "https://replay.pokemonshowdown.com/../etc/passwd",
      "https://replay.pokemonshowdown.com.evil.com/gen9ou-1",
      "https://evil.com/replay.pokemonshowdown.com/gen9ou-1",
    ]
    for (const u of cases) {
      expect(validateOfficialReplayUrl(u).ok, u).toBe(false)
    }
  })

  it("rejects redirect hop leaving allowlisted host", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 302,
        headers: {
          get: (h: string) =>
            h.toLowerCase() === "location"
              ? "https://evil.example/gen9ou-1.json"
              : null,
        },
        arrayBuffer: async () => new ArrayBuffer(0),
      })),
    )
    const r = await fetchOfficialPublicReplayJson(
      "https://replay.pokemonshowdown.com/gen9ou-1",
    )
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.code).toBe("FETCH_REDIRECT_DENIED")
  })

  it("rejects unknown visibility and private!=0 (incl. unlisted-like)", async () => {
    for (const privateVal of [undefined, 1, 2, true, "1"]) {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => ({
          ok: true,
          status: 200,
          headers: { get: () => null },
          arrayBuffer: async () =>
            new TextEncoder().encode(
              JSON.stringify({
                id: "gen9ou-1",
                ...(privateVal === undefined ? {} : { private: privateVal }),
                log: "|win|A|",
              }),
            ),
        })),
      )
      const r = await fetchOfficialPublicReplayJson(
        "https://replay.pokemonshowdown.com/gen9ou-1",
      )
      expect(r.ok, `private=${String(privateVal)}`).toBe(false)
    }
  })

  it("feature OFF never invokes preview fetch helper", async () => {
    const res = await previewPost(
      new NextRequest("http://localhost/api/replays/preview", {
        method: "POST",
        body: JSON.stringify({
          url: "https://replay.pokemonshowdown.com/gen9ou-1",
        }),
      }),
    )
    expect(res.status).toBe(410)
    expect(previewOfficialPublicReplay).not.toHaveBeenCalled()
  })

  it("rejects foreign-season / missing team via ownership helper", async () => {
    vi.mocked(resolveCoachTeamForSeason).mockResolvedValue({
      team: null,
      coachId: "c1",
    })
    const matchApi = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(async () => ({
        data: {
          id: "m1",
          season_id: "s-other",
          team1_id: "t1",
          team2_id: "t2",
        },
        error: null,
      })),
    }
    const supabase = { from: vi.fn(() => matchApi) }
    const r = await assertCallerOwnsMatchSide(supabase as never, "u1", "m1")
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.code).toBe("NO_TEAM")
  })

  it("content hash binds source + parser/fetch versions", () => {
    const a = hashReplayContent("|win|A|", "gen9ou-1")
    const b = hashReplayContent("|win|A|", "gen9ou-2")
    expect(a).not.toBe(b)
    expect(a).toMatch(/^[a-f0-9]{64}$/)
  })

  it("import disabled path does not archive", async () => {
    const res = await importPost(
      new NextRequest("http://localhost/api/replays/import", {
        method: "POST",
        body: JSON.stringify({
          url: "https://replay.pokemonshowdown.com/gen9ou-1",
          match_id: "m1",
          confirm: true,
        }),
      }),
    )
    expect(res.status).toBe(410)
    expect(archiveOfficialPublicReplay).not.toHaveBeenCalled()
  })
})
