import { afterEach, describe, expect, it, vi } from "vitest"
import {
  fetchPublicLadder,
  fetchPublicShowdownUser,
  publicReplayViewerUrl,
  searchPublicReplays,
  toShowdownUserid,
} from "./public-web-api"

describe("public-web-api helpers", () => {
  it("normalizes showdown userids", () => {
    expect(toShowdownUserid("Zarel")).toBe("zarel")
    expect(toShowdownUserid("  Foo Bar  ")).toBe("foobar")
  })

  it("builds official replay viewer URLs", () => {
    expect(publicReplayViewerUrl("gen9ou-1")).toBe("https://replay.pokemonshowdown.com/gen9ou-1")
  })
})

describe("public-web-api fetch (mocked)", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("parses a public user profile JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          username: "Zarel",
          userid: "zarel",
          ratings: { gen9ou: { elo: 1500 } },
        }),
      ),
    )
    const user = await fetchPublicShowdownUser("zarel")
    expect(user.userid).toBe("zarel")
    expect(user.ratings?.gen9ou?.elo).toBe(1500)
  })

  it("parses a public ladder JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          formatid: "gen9ou",
          format: "[Gen 9] OU",
          toplist: [{ userid: "a", username: "A", elo: 1600 }],
        }),
      ),
    )
    const ladder = await fetchPublicLadder("gen9ou")
    expect(ladder.formatid).toBe("gen9ou")
    expect(ladder.toplist).toHaveLength(1)
  })

  it("filters private hits and reports hasMore from a 51-result page", async () => {
    const hits = Array.from({ length: 51 }, (_, i) => ({
      id: `gen9ou-${i}`,
      uploadtime: 1_700_000_000 - i,
      format: "gen9ou",
      players: ["a", "b"],
      private: i === 0 ? 1 : 0,
      password: null,
    }))
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json(hits)),
    )
    const first = await searchPublicReplays({ user: "zarel" })
    expect(first.hasMore).toBe(true)
    expect(first.hits.every((hit) => !hit.private && !hit.password)).toBe(true)
    expect(first.hits.length).toBe(49) // 50 page slice minus 1 private
  })
})

const runLive = process.env.SHOWDOWN_PUBLIC_API_LIVE === "1"

describe.runIf(runLive)("public-web-api live probes (opt-in)", () => {
  it(
    "loads a public user profile JSON",
    async () => {
      const user = await fetchPublicShowdownUser("zarel")
      expect(user.userid).toBe("zarel")
    },
    20_000,
  )

  it(
    "loads a public ladder JSON",
    async () => {
      const ladder = await fetchPublicLadder("gen9ou")
      expect(ladder.formatid).toBe("gen9ou")
      expect(ladder.toplist.length).toBeGreaterThan(0)
    },
    20_000,
  )

  it(
    "searches public replays",
    async () => {
      const first = await searchPublicReplays({ user: "zarel" })
      expect(first.hits.length).toBeGreaterThan(0)
    },
    30_000,
  )
})
