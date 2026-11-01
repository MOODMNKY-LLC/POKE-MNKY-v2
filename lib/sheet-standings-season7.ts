/**
 * Season 7 regular-season totals copied from the league sheet dry run.
 * Overall order and seeds differ: Daycare is 4th overall, Boise is the 4th seed
 * because Boise won its division and seeds 5–12 do not re-apply overall SOS.
 */
import type { RankableTeam } from "@/lib/sheet-standings"

export type Season7Standing = RankableTeam & { division: string; conference: string }

export const SEASON_7_STANDINGS: Season7Standing[] = [
  { team: "Alabama Donphans", coach: "Jordan", division: "Kanto", conference: "Lance", gp: 8, wins: 4, losses: 4, differential: 8, sos: 0.5, streakLetter: "W", streakLen: 2 },
  { team: "Boise State Mudsdales", coach: "Fouster", division: "Johto", conference: "Lance", gp: 8, wins: 5, losses: 3, differential: 0, sos: 0.3958, streakLetter: "W", streakLen: 1 },
  { team: "Kalamazoo Kangaskhans", coach: "Andy W", division: "Hoenn", conference: "Leon", gp: 8, wins: 6, losses: 2, differential: 18, sos: 0.4583, streakLetter: "L", streakLen: 1 },
  { team: "Saint Charles Sliders", coach: "Saint Charles", division: "Kanto", conference: "Lance", gp: 8, wins: 5, losses: 3, differential: 10, sos: 0.42, streakLetter: "W", streakLen: 1 },
  { team: "Twin River Tyranitar", coach: "Twin River", division: "Kanto", conference: "Lance", gp: 8, wins: 2, losses: 6, differential: -17, sos: 0.58, streakLetter: "L", streakLen: 1 },
  { team: "Krazy Kecleons", coach: "Krazy", division: "Johto", conference: "Lance", gp: 8, wins: 4, losses: 4, differential: 3, sos: 0.54, streakLetter: "L", streakLen: 1 },
  { team: "Manchester Milcerys", coach: "Manchester", division: "Johto", conference: "Lance", gp: 8, wins: 3, losses: 5, differential: -16, sos: 0.54, streakLetter: "L", streakLen: 1 },
  { team: "Daycare Dittos", coach: "Daycare", division: "Hoenn", conference: "Leon", gp: 8, wins: 5, losses: 3, differential: 3, sos: 0.46, streakLetter: "W", streakLen: 1 },
  { team: "Leicester Lycanrocs", coach: "Leicester", division: "Sinnoh", conference: "Leon", gp: 8, wins: 5, losses: 3, differential: 11, sos: 0.46, streakLetter: "W", streakLen: 1 },
  { team: "Michigan Meowscaradas", coach: "Michigan", division: "Sinnoh", conference: "Leon", gp: 8, wins: 1, losses: 7, differential: -20, sos: 0.59, streakLetter: "L", streakLen: 4 },
  { team: "Bye 1", coach: "", division: "Hoenn", conference: "Leon", gp: 8, wins: 0, losses: 8, differential: 0, sos: 0, streakLetter: "L", streakLen: 8, isBye: true },
  { team: "Bye 2", coach: "", division: "Sinnoh", conference: "Leon", gp: 8, wins: 0, losses: 8, differential: 0, sos: 0, streakLetter: "L", streakLen: 8, isBye: true },
]

export const SEASON_7_OVERALL_ORDER = [
  "Kalamazoo Kangaskhans",
  "Leicester Lycanrocs",
  "Saint Charles Sliders",
  "Daycare Dittos",
  "Boise State Mudsdales",
  "Alabama Donphans",
  "Krazy Kecleons",
  "Manchester Milcerys",
  "Twin River Tyranitar",
  "Michigan Meowscaradas",
  "Bye 1",
  "Bye 2",
]

export const SEASON_7_SEED_ORDER = [
  "Kalamazoo Kangaskhans",
  "Leicester Lycanrocs",
  "Saint Charles Sliders",
  "Boise State Mudsdales",
  "Daycare Dittos",
  "Alabama Donphans",
  "Krazy Kecleons",
  "Manchester Milcerys",
  "Twin River Tyranitar",
  "Michigan Meowscaradas",
  "Bye 1",
  "Bye 2",
]

export const SEASON_7_DIVISIONS: Record<string, string[]> = {
  Kanto: ["Saint Charles Sliders", "Alabama Donphans", "Twin River Tyranitar"],
  Johto: ["Boise State Mudsdales", "Krazy Kecleons", "Manchester Milcerys"],
  Hoenn: ["Kalamazoo Kangaskhans", "Daycare Dittos", "Bye 1"],
  Sinnoh: ["Leicester Lycanrocs", "Michigan Meowscaradas", "Bye 2"],
}
