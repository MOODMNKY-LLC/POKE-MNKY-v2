import { describe, expect, it } from "vitest"
import { aggregateMvpStats, mvpStatsForSeason, type MvpStatRow } from "@/lib/mvp-standings"

const rows: MvpStatRow[] = [
  { pokemonId: "deoxys", teamId: "kalamazoo", kills: 10, seasonId: "s7" },
  { pokemonId: "deoxys", teamId: "kalamazoo", kills: 7, seasonId: "s7" },
  { pokemonId: "chi-yu", teamId: "leicester", kills: 16, seasonId: "s7" },
  { pokemonId: "deoxys", teamId: "other", kills: 9, seasonId: "s8" },
  { pokemonId: "chi-yu", teamId: "leicester", kills: 4, seasonId: "s8" },
]

describe("mvp season filter", () => {
  it("keeps each row's kills and appearance when a season is selected", () => {
    const season7 = mvpStatsForSeason(rows, "s7")
    const totals = aggregateMvpStats(season7)

    expect(season7.map((row) => row.kills)).toEqual([10, 7, 16])
    expect(totals).toEqual([
      { pokemonId: "deoxys", teamId: "kalamazoo", totalKills: 17, matches: 2 },
      { pokemonId: "chi-yu", teamId: "leicester", totalKills: 16, matches: 1 },
    ])
  })

  it("does not mix another season into the selected totals", () => {
    const all = aggregateMvpStats(rows)
    const season7 = aggregateMvpStats(mvpStatsForSeason(rows, "s7"))
    const season8 = aggregateMvpStats(mvpStatsForSeason(rows, "s8"))

    expect(all.find((row) => row.pokemonId === "deoxys")?.totalKills).toBe(26)
    expect(season7.find((row) => row.pokemonId === "deoxys")?.totalKills).toBe(17)
    expect(season8.find((row) => row.pokemonId === "deoxys")?.matches).toBe(1)
    expect(season8.find((row) => row.pokemonId === "deoxys")?.totalKills).toBe(9)
  })
})
