import type { SupabaseClient } from "@supabase/supabase-js"
import { notifyMatchResult } from "@/lib/discord-notifications"
import { updateStandingsFromMatches } from "@/lib/league-simulation/standings-updater"
import { logActivity } from "@/lib/rbac"
import { createServiceRoleClient } from "@/lib/supabase/service"
import {
  hasAnyRole,
  UserRole,
  canManageTeam,
} from "@/lib/rbac"
import {
  matchSubmitBodySchema,
  type MatchSubmitBody,
} from "@/lib/validation/match-submit"

export type CompleteMatchResult = {
  match_id: string
  season_id: string
  standings_updated: number
  discord_notified: boolean
  discord_error?: string
}

export async function resolveCurrentSeasonId(
  supabase: SupabaseClient
): Promise<string | null> {
  const { data: current } = await supabase
    .from("seasons")
    .select("id")
    .eq("is_current", true)
    .maybeSingle()

  if (current?.id) return current.id

  const { data: season7 } = await supabase
    .from("seasons")
    .select("id")
    .or("name.eq.Season 7,season_id.eq.AABPBL-Season-7-2027")
    .maybeSingle()

  if (season7?.id) return season7.id

  const { data: recent } = await supabase
    .from("seasons")
    .select("id")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  return recent?.id ?? null
}

export async function assertCanSubmitMatch(
  supabase: SupabaseClient,
  userId: string,
  team1Id: string,
  team2Id: string
): Promise<void> {
  if (
    await hasAnyRole(supabase, userId, [
      UserRole.ADMIN,
      UserRole.COMMISSIONER,
    ])
  ) {
    return
  }

  const canTeam1 = await canManageTeam(supabase, userId, team1Id)
  const canTeam2 = await canManageTeam(supabase, userId, team2Id)

  if (!canTeam1 && !canTeam2) {
    throw new Error("You are not authorized to submit results for this matchup")
  }
}

export async function finalizeMatchAfterInsert(
  matchId: string,
  seasonId: string,
  submittedBy: string | null
): Promise<{
  standings_updated: number
  discord_notified: boolean
  discord_error?: string
}> {
  const supabase = createServiceRoleClient()

  const { updated } = await updateStandingsFromMatches(supabase, seasonId)

  let discord_notified = false
  let discord_error: string | undefined

  try {
    await notifyMatchResult(matchId)
    discord_notified = true
  } catch (err) {
    discord_error =
      err instanceof Error ? err.message : "Discord notification failed"
    console.error("[match-result-complete] Discord notify failed:", err)
  }

  if (submittedBy) {
    try {
      await logActivity(supabase, submittedBy, "match_submitted", {
        resource_type: "match",
        resource_id: matchId,
        season_id: seasonId,
      })
    } catch (err) {
      console.error("[match-result-complete] Activity log failed:", err)
    }
  }

  return { standings_updated: updated, discord_notified, discord_error }
}

/**
 * Insert or update a completed match, then refresh standings, Discord, and activity log.
 */
export async function completeMatchResult(
  input: MatchSubmitBody,
  submittedBy: string | null,
  authSupabase?: SupabaseClient
): Promise<CompleteMatchResult> {
  const parsed = matchSubmitBodySchema.parse(input)
  const supabase = createServiceRoleClient()

  if (authSupabase && submittedBy) {
    await assertCanSubmitMatch(
      authSupabase,
      submittedBy,
      parsed.team1_id,
      parsed.team2_id
    )
  }

  const seasonId =
    parsed.season_id ?? (await resolveCurrentSeasonId(supabase))

  if (!seasonId) {
    throw new Error("No current season configured")
  }

  const differential =
    parsed.differential ??
    Math.abs(parsed.team1_score - parsed.team2_score)

  const row = {
    week: parsed.week,
    team1_id: parsed.team1_id,
    team2_id: parsed.team2_id,
    winner_id: parsed.winner_id,
    team1_score: parsed.team1_score,
    team2_score: parsed.team2_score,
    differential,
    status: "completed" as const,
    season_id: seasonId,
    replay_url: parsed.replay_url ?? null,
    notes: parsed.notes ?? null,
    submitted_by: submittedBy,
    played_at: new Date().toISOString(),
  }

  let matchId: string

  if (parsed.match_id) {
    const { data: match, error } = await supabase
      .from("matches")
      .update(row)
      .eq("id", parsed.match_id)
      .select("id")
      .single()

    if (error) throw new Error(error.message)
    matchId = match.id
  } else {
    const { data: match, error } = await supabase
      .from("matches")
      .insert(row)
      .select("id")
      .single()

    if (error) throw new Error(error.message)
    matchId = match.id
  }

  const sideEffects = await finalizeMatchAfterInsert(
    matchId,
    seasonId,
    submittedBy
  )

  return {
    match_id: matchId,
    season_id: seasonId,
    ...sideEffects,
  }
}
