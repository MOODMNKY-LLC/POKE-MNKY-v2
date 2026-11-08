import { describe, expect, it } from "vitest"
import { validateOfficialReplayUrl } from "./replay-url"

describe("validateOfficialReplayUrl", () => {
  it("accepts official public id URLs", () => {
    const r = validateOfficialReplayUrl(
      "https://replay.pokemonshowdown.com/gen8doublesubers-1097585496",
    )
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.sourceId).toBe("gen8doublesubers-1097585496")
    expect(r.canonicalJsonUrl).toContain(".json")
  })

  it("rejects non-https and foreign hosts", () => {
    expect(
      validateOfficialReplayUrl("http://replay.pokemonshowdown.com/gen9ou-1").ok,
    ).toBe(false)
    expect(
      validateOfficialReplayUrl("https://evil.example/gen9ou-1").ok,
    ).toBe(false)
    expect(
      validateOfficialReplayUrl("https://aab-replay.moodmnky.com/gen9ou-1").ok,
    ).toBe(false)
  })

  it("rejects password private id suffix", () => {
    const r = validateOfficialReplayUrl(
      "https://replay.pokemonshowdown.com/gen7randombattle-956127160-fz0wmd2n1wu7gorbay9jtvqxpc3tkl4pw",
    )
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.code).toBe("URL_PRIVATE_PASSWORD")
  })
})
