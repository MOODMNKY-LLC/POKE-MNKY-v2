import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  assertCallerOwnsMatchSide,
  archiveOfficialPublicReplay,
  linkArchiveToMatch,
} from "./replay-archive"

vi.mock("@/lib/coach-team-context", () => ({
  resolveCoachTeamForSeason: vi.fn(),
}))

vi.mock("./replay-fetch", () => ({
  fetchOfficialPublicReplayJson: vi.fn(),
}))

import { resolveCoachTeamForSeason } from "@/lib/coach-team-context"
import { fetchOfficialPublicReplayJson } from "./replay-fetch"

function chain(result: { data: unknown; error?: unknown }) {
  const api: Record<string, unknown> = {}
  const self = () => api
  for (const m of [
    "select",
    "eq",
    "insert",
    "upsert",
    "update",
    "is",
  ]) {
    api[m] = vi.fn(self)
  }
  api.maybeSingle = vi.fn(async () => result)
  api.single = vi.fn(async () => result)
  return api
}

describe("assertCallerOwnsMatchSide", () => {
  beforeEach(() => {
    vi.mocked(resolveCoachTeamForSeason).mockReset()
  })

  it("rejects foreign season team via resolveCoachTeamForSeason", async () => {
    const matchApi = chain({
      data: {
        id: "m1",
        season_id: "s1",
        team1_id: "t1",
        team2_id: "t2",
      },
    })
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "matches") return matchApi
        throw new Error(table)
      }),
    }
    vi.mocked(resolveCoachTeamForSeason).mockResolvedValue({
      team: { id: "t-foreign", name: "X", season_id: "s1", coach_id: "c1" },
      coachId: "c1",
    })

    const r = await assertCallerOwnsMatchSide(supabase as never, "u1", "m1")
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.code).toBe("FOREIGN_MATCH")
    expect(resolveCoachTeamForSeason).toHaveBeenCalledWith(
      supabase,
      "u1",
      "s1",
    )
  })

  it("accepts match participant for season team", async () => {
    const matchApi = chain({
      data: {
        id: "m1",
        season_id: "s1",
        team1_id: "t1",
        team2_id: "t2",
      },
    })
    const supabase = {
      from: vi.fn(() => matchApi),
    }
    vi.mocked(resolveCoachTeamForSeason).mockResolvedValue({
      team: { id: "t1", name: "A", season_id: "s1", coach_id: "c1" },
      coachId: "c1",
    })
    const r = await assertCallerOwnsMatchSide(supabase as never, "u1", "m1")
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.ownership.callerTeamId).toBe("t1")
  })
})

describe("archiveOfficialPublicReplay dedup ACL", () => {
  beforeEach(() => {
    vi.mocked(fetchOfficialPublicReplayJson).mockReset()
  })

  it("does not reuse foreign archive (no existence leak via success)", async () => {
    vi.mocked(fetchOfficialPublicReplayJson).mockResolvedValue({
      ok: true,
      sourceId: "gen9ou-1",
      sourceUrl: "https://replay.pokemonshowdown.com/gen9ou-1",
      json: { id: "gen9ou-1", private: 0, log: "|win|A|" },
      rawJsonText: "{}",
      rawLog: "|win|A|",
    })

    const existingApi = chain({
      data: {
        id: "arch-foreign",
        created_by: "other-user",
        acl_owner_team_id: "other-team",
        season_id: "s1",
      },
    })
    const service = {
      from: vi.fn((table: string) => {
        if (table === "league_replay_archives") return existingApi
        throw new Error(table)
      }),
    }

    const r = await archiveOfficialPublicReplay(service as never, {
      userId: "u1",
      rawUrl: "https://replay.pokemonshowdown.com/gen9ou-1",
      seasonId: "s1",
      aclOwnerTeamId: "t1",
    })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.code).toBe("ARCHIVE_UNAVAILABLE")
  })
})

describe("linkArchiveToMatch ACL", () => {
  it("denies attach when caller is not creator or ACL owner team", async () => {
    const archiveApi = chain({
      data: {
        id: "a1",
        season_id: "s1",
        acl_owner_team_id: "foreign-team",
        created_by: "other",
        visibility: "public",
      },
    })
    const service = {
      from: vi.fn(() => archiveApi),
    }
    const r = await linkArchiveToMatch(service as never, {
      userId: "u1",
      matchId: "m1",
      archiveId: "a1",
      ownership: {
        matchId: "m1",
        seasonId: "s1",
        team1Id: "t1",
        team2Id: "foreign-team",
        callerTeamId: "t1",
      },
    })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.code).toBe("ARCHIVE_ACL_DENIED")
  })
})
