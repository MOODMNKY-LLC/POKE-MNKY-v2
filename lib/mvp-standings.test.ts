import { describe, expect, it } from "vitest"
import {
  aggregateMvpStats,
  compareMvpLeaderboard,
  mvpStatsForSeason,
  type MvpStatRow,
} from "@/lib/mvp-standings"

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

  it("breaks equal kill totals by Pokémon name A–Z like the sheet MVP Race", () => {
    const tied = [
      { totalKills: 9, name: "Tauros Paldean" },
      { totalKills: 9, name: "Revavroom" },
      { totalKills: 9, name: "Sneasler" },
      { totalKills: 17, name: "Deoxys" },
    ].sort(compareMvpLeaderboard)
    expect(tied.map((row) => row.name)).toEqual([
      "Deoxys",
      "Revavroom",
      "Sneasler",
      "Tauros Paldean",
    ])
  })
})

describe("publicRegularRecord", () => {
  it("prefers regular-season columns for /teams cards", async () => {
    const { publicRegularRecord } = await import("@/lib/teams-public")
    expect(
      publicRegularRecord({
        id: "1",
        name: "Kalamazoo Kangaskhans",
        coach_name: "Andy W",
        division: "Hoenn",
        conference: "Leon",
        wins: 7,
        losses: 3,
        regular_wins: 6,
        regular_losses: 2,
        playoff_wins: 1,
        playoff_losses: 1,
        differential: 20,
        regular_differential: 18,
      }),
    ).toEqual({ wins: 6, losses: 2, differential: 18 })
  })
})
