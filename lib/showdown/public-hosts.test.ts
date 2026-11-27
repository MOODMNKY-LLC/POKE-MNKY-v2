import { describe, expect, it } from "vitest"
import {
  getDamageCalcUrl,
  getPublicBattleRoomUrl,
  getPublicReplayViewerUrl,
  getShowdownClientUrl,
  PUBLIC_DAMAGE_CALC_URL,
  PUBLIC_SHOWDOWN_CLIENT_URL,
  PUBLIC_SHOWDOWN_REPLAY_URL,
} from "./public-hosts"

describe("public showdown hosts", () => {
  it("keeps public battle links and ignores synthetic and retired rooms", () => {
    const battleUrl = `${PUBLIC_SHOWDOWN_CLIENT_URL}/battle-gen9ou-123`
    expect(getPublicBattleRoomUrl(battleUrl)).toBe(battleUrl)
    expect(getPublicBattleRoomUrl(`${battleUrl}-abc123pw`)).toBe(`${battleUrl}-abc123pw`)
    expect(getPublicBattleRoomUrl(`${PUBLIC_SHOWDOWN_CLIENT_URL}/battle-gen9avgatbest-battle-match-123`)).toBeUndefined()
    expect(getPublicBattleRoomUrl("https://aab-play.moodmnky.com/battle-gen9ou-123")).toBeUndefined()
    expect(getPublicBattleRoomUrl("invalid")).toBeUndefined()
  })

  it("defaults to official public Showdown and calc URLs", () => {
    expect(getShowdownClientUrl({})).toBe(PUBLIC_SHOWDOWN_CLIENT_URL)
    expect(getDamageCalcUrl({})).toBe(PUBLIC_DAMAGE_CALC_URL)
    expect(getPublicReplayViewerUrl("gen9ou-1", {})).toBe(`${PUBLIC_SHOWDOWN_REPLAY_URL}/gen9ou-1`)
  })

  it("ignores retired aab-* defaults and falls back to public hosts", () => {
    expect(
      getShowdownClientUrl({ NEXT_PUBLIC_SHOWDOWN_CLIENT_URL: "https://aab-play.moodmnky.com" }),
    ).toBe(PUBLIC_SHOWDOWN_CLIENT_URL)
    expect(getDamageCalcUrl({ NEXT_PUBLIC_DAMAGE_CALC_URL: "https://aab-calc.moodmnky.com" })).toBe(
      PUBLIC_DAMAGE_CALC_URL,
    )
  })

  it("honors non-retired env overrides", () => {
    expect(
      getShowdownClientUrl({ NEXT_PUBLIC_SHOWDOWN_CLIENT_URL: "https://play.pokemonshowdown.com" }),
    ).toBe("https://play.pokemonshowdown.com")
  })
})
