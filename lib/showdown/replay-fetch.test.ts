import { describe, expect, it, vi, afterEach } from "vitest"
import { fetchOfficialPublicReplayJson } from "./replay-fetch"

describe("fetchOfficialPublicReplayJson visibility", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("rejects when private field missing (not inferred public)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        headers: { get: () => null },
        arrayBuffer: async () =>
          new TextEncoder().encode(
            JSON.stringify({ id: "gen9ou-1", log: "|win|A|" }),
          ),
      })),
    )

    const r = await fetchOfficialPublicReplayJson(
      "https://replay.pokemonshowdown.com/gen9ou-1",
    )
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.code).toBe("VISIBILITY_UNKNOWN")
  })

  it("rejects private=1", async () => {
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
              private: 1,
              log: "|win|A|",
            }),
          ),
      })),
    )
    const r = await fetchOfficialPublicReplayJson(
      "https://replay.pokemonshowdown.com/gen9ou-1",
    )
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.code).toBe("VISIBILITY_NOT_PUBLIC")
  })

  it("accepts private:0 public", async () => {
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
              private: 0,
              log: "|player|p1|A|\n|win|A|",
              players: ["A", "B"],
            }),
          ),
      })),
    )
    const r = await fetchOfficialPublicReplayJson(
      "https://replay.pokemonshowdown.com/gen9ou-1",
    )
    expect(r.ok).toBe(true)
  })
})
