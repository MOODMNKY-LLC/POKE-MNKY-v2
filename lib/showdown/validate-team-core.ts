/**
 * Season-aware Showdown team validation against a coach's drafted roster.
 * Fail-closed: requires explicit season_id for roster checks; never equates
 * teams.coach_id with auth.users.id.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import {
  parseShowdownTeam,
  validateTeamAgainstRoster,
  type LeagueRules,
  type ParsedTeam,
} from "@/lib/team-parser"
import { resolveCoachTeamForSeason } from "@/lib/coach-team-context"
import { getTeamRosterPicks } from "@/lib/team-roster-display"

export type ValidateTeamCheckMode = "parse" | "roster"

export type ValidateTeamInput = {
  team_text: string
  /** Required for roster checks. UUID of seasons.id. */
  season_id?: string | null
  /** Optional: must match the coach's team for season_id or request fails. */
  team_id?: string | null
  check?: ValidateTeamCheckMode
}

export type ValidateTeamSuccess = {
  ok: true
  parse_ok: boolean
  roster_checked: boolean
  roster_valid: boolean | null
  /** True only when roster was checked and passed — never from parse alone. */
  fully_validated: boolean
  errors: string[]
  parsed: ParsedTeam
  season_id: string | null
  team_id: string | null
  coach_id: string | null
  roster_size: number | null
}

export type ValidateTeamFailure = {
  ok: false
  status: number
  error: string
  code?: string
  parse_ok?: boolean
  errors?: string[]
}

export type ValidateTeamResult = ValidateTeamSuccess | ValidateTeamFailure

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isUuid(value: string): boolean {
  return UUID_RE.test(value)
}

const DEFAULT_LEAGUE_RULES: LeagueRules = {
  teamSize: { min: 6, max: 10 },
  maxLevel: 50,
}

/**
 * Pure-ish orchestration for validate-team. Caller supplies an authenticated
 * userId and a Supabase client (service role OK server-side only).
 */
export async function validateShowdownTeamForCoach(
  supabase: SupabaseClient,
  userId: string,
  input: ValidateTeamInput,
  leagueRules: LeagueRules = DEFAULT_LEAGUE_RULES,
): Promise<ValidateTeamResult> {
  const teamText = input.team_text?.trim() ?? ""
  if (!teamText) {
    return {
      ok: false,
      status: 400,
      error: "team_text is required",
      code: "TEAM_TEXT_REQUIRED",
    }
  }

  const mode: ValidateTeamCheckMode = input.check === "parse" ? "parse" : "roster"

  const parsed = parseShowdownTeam(teamText)
  if (parsed.errors.length > 0) {
    return {
      ok: false,
      status: 400,
      error: "Failed to parse team",
      code: "PARSE_FAILED",
      parse_ok: false,
      errors: parsed.errors,
    }
  }

  if (mode === "parse") {
    return {
      ok: true,
      parse_ok: true,
      roster_checked: false,
      roster_valid: null,
      fully_validated: false,
      errors: [],
      parsed,
      season_id: null,
      team_id: null,
      coach_id: null,
      roster_size: null,
    }
  }

  const seasonId = input.season_id?.trim() || null
  if (!seasonId || !isUuid(seasonId)) {
    return {
      ok: false,
      status: 400,
      error:
        "season_id is required for roster validation (explicit season — will not infer from is_current).",
      code: "SEASON_ID_REQUIRED",
      parse_ok: true,
      errors: ["Provide season_id to validate against your drafted roster."],
    }
  }

  const { data: season, error: seasonError } = await supabase
    .from("seasons")
    .select("id")
    .eq("id", seasonId)
    .maybeSingle()

  if (seasonError) {
    return {
      ok: false,
      status: 500,
      error: "Failed to verify season",
      code: "SEASON_LOOKUP_FAILED",
      parse_ok: true,
    }
  }
  if (!season) {
    return {
      ok: false,
      status: 400,
      error: "Invalid season_id",
      code: "INVALID_SEASON",
      parse_ok: true,
    }
  }

  const { team, coachId } = await resolveCoachTeamForSeason(
    supabase,
    userId,
    seasonId,
  )

  if (!coachId) {
    return {
      ok: false,
      status: 404,
      error: "Coach record not found for this user.",
      code: "COACH_NOT_FOUND",
      parse_ok: true,
    }
  }

  if (!team) {
    return {
      ok: false,
      status: 404,
      error:
        "No league team for this coach in the requested season. Claim or link a team for that season first.",
      code: "TEAM_NOT_FOUND",
      parse_ok: true,
    }
  }

  const requestedTeamId = input.team_id?.trim() || null
  if (requestedTeamId) {
    if (!isUuid(requestedTeamId)) {
      return {
        ok: false,
        status: 400,
        error: "Invalid team_id",
        code: "INVALID_TEAM_ID",
        parse_ok: true,
      }
    }
    if (requestedTeamId !== team.id) {
      return {
        ok: false,
        status: 403,
        error: "team_id does not belong to this coach for the requested season.",
        code: "FOREIGN_TEAM",
        parse_ok: true,
      }
    }
  }

  let rosterEntries: { pokemon_id: number; pokemon_name: string }[] = []
  try {
    const picks = await getTeamRosterPicks(supabase, team.id, seasonId)
    rosterEntries = picks
      .filter((p) => p.pokemon?.name)
      .map((p, index) => {
        const numericId = Number(p.pokemon_id)
        return {
          // RosterEntry historically used number; draft pokemon ids may be uuid strings.
          pokemon_id: Number.isFinite(numericId) ? numericId : index + 1,
          pokemon_name: p.pokemon.name,
        }
      })
  } catch {
    return {
      ok: false,
      status: 500,
      error: "Failed to fetch roster",
      code: "ROSTER_FETCH_FAILED",
      parse_ok: true,
    }
  }

  if (rosterEntries.length === 0) {
    return {
      ok: true,
      parse_ok: true,
      roster_checked: true,
      roster_valid: false,
      fully_validated: false,
      errors: [
        "No drafted roster found for this team/season. Draft Pokemon before roster validation.",
      ],
      parsed,
      season_id: seasonId,
      team_id: team.id,
      coach_id: coachId,
      roster_size: 0,
    }
  }

  const validation = await validateTeamAgainstRoster(
    parsed,
    rosterEntries,
    leagueRules,
  )

  return {
    ok: true,
    parse_ok: true,
    roster_checked: true,
    roster_valid: validation.valid,
    fully_validated: validation.valid,
    errors: validation.errors,
    parsed,
    season_id: seasonId,
    team_id: team.id,
    coach_id: coachId,
    roster_size: rosterEntries.length,
  }
}
