export type CoachPoolStatus = "draftable" | "banned"
export type CoachPoolSort = "points-desc" | "points-asc" | "name"
export type CoachPoolStatusFilter = CoachPoolStatus | "all"

export interface CoachPoolEntry {
  id: string
  pokemon_id: number | null
  sheet_name: string
  points: number
  status: CoachPoolStatus
  tera_banned: boolean
  is_effective_tera_ban: boolean
}

export interface CoachPoolRestriction {
  id: string
  pokemon_id: number | null
  sheet_name: string | null
  kind: "move" | "ability" | "combo"
  name: string
  note: string | null
}

export interface CoachPoolFilters {
  search: string
  status: CoachPoolStatusFilter
  minPoints: number
  maxPoints: number
  effectiveTeraBanOnly: boolean
  hasRestrictions: boolean
  sort: CoachPoolSort
}

export function restrictionsForEntry(
  entry: CoachPoolEntry,
  restrictions: CoachPoolRestriction[],
): CoachPoolRestriction[] {
  return restrictions.filter((restriction) => {
    const isGlobal =
      restriction.kind === "combo" ||
      (restriction.pokemon_id === null && restriction.sheet_name === null)

    if (isGlobal) return true
    if (entry.pokemon_id !== null && restriction.pokemon_id !== null) {
      return entry.pokemon_id === restriction.pokemon_id
    }

    return restriction.sheet_name === entry.sheet_name
  })
}

export function hasEntrySpecificRestrictions(
  entry: CoachPoolEntry,
  restrictions: CoachPoolRestriction[],
): boolean {
  return restrictionsForEntry(entry, restrictions).some(
    (restriction) =>
      restriction.kind !== "combo" &&
      !(restriction.pokemon_id === null && restriction.sheet_name === null),
  )
}

export function filterAndSortCoachPool(
  entries: CoachPoolEntry[],
  restrictions: CoachPoolRestriction[],
  filters: CoachPoolFilters,
): CoachPoolEntry[] {
  const search = filters.search.trim().toLocaleLowerCase()

  return entries
    .filter((entry) => {
      if (search && !entry.sheet_name.toLocaleLowerCase().includes(search)) return false
      if (filters.status !== "all" && entry.status !== filters.status) return false
      if (entry.points < filters.minPoints || entry.points > filters.maxPoints) return false
      if (filters.effectiveTeraBanOnly && !entry.is_effective_tera_ban) return false
      if (filters.hasRestrictions && !hasEntrySpecificRestrictions(entry, restrictions)) return false
      return true
    })
    .sort((left, right) => {
      if (filters.sort === "name") {
        return left.sheet_name.localeCompare(right.sheet_name)
      }

      const pointDifference = left.points - right.points
      if (pointDifference !== 0) {
        return filters.sort === "points-asc" ? pointDifference : -pointDifference
      }

      return left.sheet_name.localeCompare(right.sheet_name)
    })
}

export function teraRuleText(entry: Pick<CoachPoolEntry, "tera_banned" | "is_effective_tera_ban">) {
  if (entry.is_effective_tera_ban) {
    return "Cannot Terastallize — on the Tera ban list and valued at 10 pts or less"
  }
  if (entry.tera_banned) {
    return "On the Tera list but Tera-legal above 10 pts"
  }
  return "Eligible to Terastallize"
}

export function restrictionText(restriction: CoachPoolRestriction) {
  if (restriction.kind === "move") return `Banned move: ${restriction.name}`
  if (restriction.kind === "ability") return `Banned ability: ${restriction.name}`
  return restriction.name
}
