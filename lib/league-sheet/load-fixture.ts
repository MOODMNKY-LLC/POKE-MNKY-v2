import { readFileSync } from "node:fs"
import type { LeagueSheet } from "@/lib/league-sheet/types"

export function loadLeagueSheetFixture(path: string): LeagueSheet {
  const parsed = JSON.parse(readFileSync(path, "utf8")) as LeagueSheet
  if (!parsed.seasonKey || !Array.isArray(parsed.teams) || !Array.isArray(parsed.matches)) {
    throw new Error(`League sheet fixture is missing seasonKey, teams, or matches: ${path}`)
  }
  return parsed
}
