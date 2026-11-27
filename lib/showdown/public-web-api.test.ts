import { describe, expect, it } from "vitest"
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

describe("public-web-api live probes", () => {
  it(
    "loads a public user profile JSON",
    async () => {
      const user = await fetchPublicShowdownUser("zarel")
      expect(user.userid).toBe("zarel")
      expect(user.username.toLowerCase()).toContain("zarel")
      expect(user.ratings).toBeTypeOf("object")
    },
    20_000,
  )

  it(
    "loads a public ladder JSON",
    async () => {
      const ladder = await fetchPublicLadder("gen9ou")
      expect(ladder.formatid).toBe("gen9ou")
      expect(Array.isArray(ladder.toplist)).toBe(true)
      expect(ladder.toplist.length).toBeGreaterThan(0)
    },
    20_000,
  )

  it(
    "searches public replays with before-cursor pagination shape",
    async () => {
      const first = await searchPublicReplays({ user: "zarel" })
      expect(first.hits.length).toBeGreaterThan(0)
      expect(first.hits.every((hit) => !hit.private && !hit.password)).toBe(true)
      if (first.hasMore && first.hits.length > 0) {
        const last = first.hits[first.hits.length - 1]
        const next = await searchPublicReplays({
          user: "zarel",
          before: last.uploadtime,
        })
        expect(Array.isArray(next.hits)).toBe(true)
      }
    },
    30_000,
  )
})
