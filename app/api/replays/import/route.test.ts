import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: vi.fn(async () => ({
    auth: {
      getUser: async () => ({ data: { user: { id: "u1" } } }),
    },
  })),
}))

vi.mock("@/lib/supabase/service", () => ({
  createServiceRoleClient: vi.fn(() => ({})),
}))

vi.mock("@/lib/showdown/replay-archive", () => ({
  assertCallerOwnsMatchSide: vi.fn(),
  archiveOfficialPublicReplay: vi.fn(),
  linkArchiveToMatch: vi.fn(),
}))

import { POST } from "./route"
import {
  assertCallerOwnsMatchSide,
  archiveOfficialPublicReplay,
  linkArchiveToMatch,
} from "@/lib/showdown/replay-archive"

describe("POST /api/replays/import", () => {
  const prev = process.env.REPLAY_INGEST_ENABLED

  beforeEach(() => {
    delete process.env.REPLAY_INGEST_ENABLED
    vi.mocked(assertCallerOwnsMatchSide).mockReset()
    vi.mocked(archiveOfficialPublicReplay).mockReset()
    vi.mocked(linkArchiveToMatch).mockReset()
  })

  afterEach(() => {
    if (prev === undefined) delete process.env.REPLAY_INGEST_ENABLED
    else process.env.REPLAY_INGEST_ENABLED = prev
  })

  it("returns 410 and never archives when disabled", async () => {
    const res = await POST(
      new NextRequest("http://localhost/api/replays/import", {
        method: "POST",
        body: JSON.stringify({
          url: "https://replay.pokemonshowdown.com/x",
          match_id: "m1",
          confirm: true,
        }),
      }),
    )
    expect(res.status).toBe(410)
    expect(assertCallerOwnsMatchSide).not.toHaveBeenCalled()
    expect(archiveOfficialPublicReplay).not.toHaveBeenCalled()
  })

  it("requires confirm and match ownership when enabled", async () => {
    process.env.REPLAY_INGEST_ENABLED = "true"
    const noConfirm = await POST(
      new NextRequest("http://localhost/api/replays/import", {
        method: "POST",
        body: JSON.stringify({ match_id: "m1", url: "https://x" }),
      }),
    )
    expect(noConfirm.status).toBe(400)

    vi.mocked(assertCallerOwnsMatchSide).mockResolvedValue({
      ok: false,
      status: 403,
      error: "Not a participant",
      code: "FOREIGN_MATCH",
    })
    const foreign = await POST(
      new NextRequest("http://localhost/api/replays/import", {
        method: "POST",
        body: JSON.stringify({
          match_id: "m1",
          url: "https://replay.pokemonshowdown.com/gen9ou-1",
          confirm: true,
        }),
      }),
    )
    expect(foreign.status).toBe(403)
    expect(archiveOfficialPublicReplay).not.toHaveBeenCalled()
  })

  it("does not leak archive_id on link ACL failure", async () => {
    process.env.REPLAY_INGEST_ENABLED = "true"
    vi.mocked(assertCallerOwnsMatchSide).mockResolvedValue({
      ok: true,
      ownership: {
        matchId: "m1",
        seasonId: "s1",
        team1Id: "t1",
        team2Id: "t2",
        callerTeamId: "t1",
      },
    })
    vi.mocked(archiveOfficialPublicReplay).mockResolvedValue({
      ok: true,
      archiveId: "secret-arch",
      parseRunId: "pr1",
      deduped: true,
      observation: { winner: "p1" } as never,
      source_id: "gen9ou-1",
    })
    vi.mocked(linkArchiveToMatch).mockResolvedValue({
      ok: false,
      status: 403,
      error: "denied",
      code: "ARCHIVE_ACL_DENIED",
    })

    const res = await POST(
      new NextRequest("http://localhost/api/replays/import", {
        method: "POST",
        body: JSON.stringify({
          match_id: "m1",
          url: "https://replay.pokemonshowdown.com/gen9ou-1",
          confirm: true,
        }),
      }),
    )
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.archive_id).toBeUndefined()
    expect(JSON.stringify(body)).not.toContain("secret-arch")
  })
})
