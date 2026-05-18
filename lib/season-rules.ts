import { createServiceRoleClient } from "@/lib/supabase/service"

export type SeasonRules = {
  seasonId: string
  draftBudget: number | null
  rosterSizeMin: number | null
  rosterSizeMax: number | null
  teraBudget: number | null
  freeAgencyDeadlineWeek: number | null
  rosterLockWeek: number | null
  playoffTeams: number | null
  transactionCap: number | null
  maxTeraCaptains: number | null
  stellarTeraBanned: boolean | null
  teraTypeChangeCost: number | null
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function asBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value
  if (typeof value === "string") {
    if (value.toLowerCase() === "true") return true
    if (value.toLowerCase() === "false") return false
  }
  return null
}

export async function getSeasonRules(seasonId?: string | null): Promise<SeasonRules | null> {
  const supabase = createServiceRoleClient()
  let resolvedSeasonId = seasonId ?? null

  if (!resolvedSeasonId) {
    const { data: season, error: seasonError } = await supabase
      .from("seasons")
      .select("id")
      .eq("is_current", true)
      .maybeSingle()

    if (seasonError || !season) return null
    resolvedSeasonId = season.id
  }

  const { data: rows, error } = await supabase
    .from("season_rules")
    .select("rule_category, rule_key, rule_value")
    .eq("season_id", resolvedSeasonId)

  if (error) return null

  const rules: SeasonRules = {
    seasonId: resolvedSeasonId,
    draftBudget: null,
    rosterSizeMin: null,
    rosterSizeMax: null,
    teraBudget: null,
    freeAgencyDeadlineWeek: null,
    rosterLockWeek: null,
    playoffTeams: null,
    transactionCap: null,
    maxTeraCaptains: null,
    stellarTeraBanned: null,
    teraTypeChangeCost: null,
  }

  for (const row of rows ?? []) {
    const value = row.rule_value
    switch (row.rule_key) {
      case "draft_budget":
        rules.draftBudget = asNumber(value)
        break
      case "roster_size_min":
        rules.rosterSizeMin = asNumber(value)
        break
      case "roster_size_max":
        rules.rosterSizeMax = asNumber(value)
        break
      case "tera_budget":
        rules.teraBudget = asNumber(value)
        break
      case "free_agency_deadline_week":
        rules.freeAgencyDeadlineWeek = asNumber(value)
        break
      case "roster_lock_week":
        rules.rosterLockWeek = asNumber(value)
        break
      case "playoff_teams":
        rules.playoffTeams = asNumber(value)
        break
      case "transaction_cap":
        rules.transactionCap = asNumber(value)
        break
      case "max_tera_captains":
        rules.maxTeraCaptains = asNumber(value)
        break
      case "stellar_tera_banned":
        rules.stellarTeraBanned = asBoolean(value)
        break
      case "tera_type_change_cost":
        rules.teraTypeChangeCost = asNumber(value)
        break
    }
  }

  return rules
}
