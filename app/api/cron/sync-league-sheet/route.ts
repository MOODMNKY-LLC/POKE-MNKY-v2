/**
 * Recurring league-sheet sync. Vercel cron sends Authorization: Bearer CRON_SECRET.
 * An admin session may call ?dry_run=1. Apply stays on the cron secret or the admin POST.
 *
 * Schedule in vercel.json is daily at 06:15 UTC so a Hobby project can deploy it.
 */

import { revalidatePath } from "next/cache"
import { NextResponse } from "next/server"
import { requireLeagueAdmin } from "@/lib/admin-api-auth"
import { authorizeSheetSync } from "@/lib/sheet-sync/auth"
import { applySheetSync, planSheetSync } from "@/lib/sheet-sync/execute"
import { loadSheetBundleFromGoogle } from "@/lib/sheet-sync/read"
import { createServiceRoleClient } from "@/lib/supabase/service"

export const revalidate = 0
export const maxDuration = 120

async function lastAppliedVersion(supabase: ReturnType<typeof createServiceRoleClient>, seasonId: string) {
  const { data } = await supabase
    .from("sheet_sync_runs")
    .select("sheet_version")
    .eq("season_id", seasonId)
    .in("status", ["applied", "no_changes"])
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data as { sheet_version?: string | null } | null)?.sheet_version ?? null
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const dryRun = url.searchParams.get("dry_run") === "1"
  const cronOk = authorizeSheetSync({
    authorization: request.headers.get("authorization"),
    cronSecret: process.env.CRON_SECRET,
    isAdmin: false,
    dryRun,
  })
  let adminOk = false
  if (!cronOk && dryRun) {
    const admin = await requireLeagueAdmin()
    adminOk = !("response" in admin)
  }
  if (!cronOk && !adminOk) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const supabase = createServiceRoleClient()
    let season: {
      id: string
      season_id: string | null
      start_date: string | null
      is_sandbox?: boolean
    } | null = null
    let seasonError: { message?: string; code?: string } | null = null
    {
      const full = await supabase
        .from("seasons")
        .select("id, season_id, start_date, is_sandbox")
        .eq("sheet_sync_enabled", true)
        .maybeSingle()
      if (full.error?.code === "42703") {
        const legacy = await supabase
          .from("seasons")
          .select("id, season_id, start_date")
          .eq("sheet_sync_enabled", true)
          .maybeSingle()
        season = legacy.data as typeof season
        seasonError = legacy.error
      } else {
        season = full.data as typeof season
        seasonError = full.error
      }
    }
    if (seasonError || !season?.id) {
      return NextResponse.json({ success: false, error: seasonError?.message ?? "No sheet_sync_enabled season" }, { status: 409 })
    }
    // Defense: sandbox seasons cannot be sheet-synced (DB CHECK + explicit guard).
    if (season.is_sandbox === true) {
      return NextResponse.json(
        { success: false, error: "Sandbox seasons cannot be sheet-synced" },
        { status: 409 },
      )
    }

    const bundle = await loadSheetBundleFromGoogle()
    const previous = await lastAppliedVersion(supabase, season.id)
    if (bundle.version && previous && bundle.version === previous) {
      await supabase.from("sheet_sync_runs").insert({
        season_id: season.id,
        season_key: season.season_id,
        status: "unchanged",
        trigger: request.headers.get("x-sheet-sync-trigger") === "manual" || adminOk ? "manual" : "cron",
        mode: dryRun ? "dry_run" : "apply",
        sheet_version: bundle.version,
        sheet_modified_time: bundle.modifiedTime,
        dry_run: true,
        changes_planned: 0,
        changes_applied: 0,
        finished_at: new Date().toISOString(),
      })
      return NextResponse.json({ success: true, status: "unchanged" })
    }

    const nameOf = (value: unknown) => {
      const row = Array.isArray(value) ? value[0] : value
      return (row as { name?: string } | null)?.name ?? null
    }
    const [teams, matches, picks, stats, audits, seeds] = await Promise.all([
      supabase.from("teams").select("name, coach_name, team_number, division, conference, is_bye, is_active, regular_wins, regular_losses, regular_differential, wins, losses, differential, playoff_wins, playoff_losses, playoff_differential, strength_of_schedule, streak_type, current_streak").eq("season_id", season.id),
      supabase.from("matches").select("week, team1_score, team2_score, status, is_playoff, playoff_round, outcome_type, notes, source, team1:team1_id(name), team2:team2_id(name), winner:winner_id(name)").eq("season_id", season.id),
      supabase.from("draft_picks").select("status, acquisition, draft_round, pick_number, points_snapshot, start_date, end_date, is_tera_captain, notes, source, team:team_id(name), pokemon:pokemon_id(name)").eq("season_id", season.id),
      supabase.from("pokemon_stats").select("kills, source, team:team_id(name), pokemon:pokemon_id(name), matches!inner(week, season_id, team1:team1_id(name), team2:team2_id(name))").eq("matches.season_id", season.id),
      supabase.from("transaction_audit").select("action, source_key, payload, team:team_id(name)").eq("season_id", season.id).in("action", ["free_agency_add", "free_agency_add_drop", "drop"]),
      supabase.from("playoff_seeds").select("seed, team_name, round1_bye, is_division_winner").eq("season_id", season.id),
    ])
    for (const result of [teams, matches, picks, stats, audits, seeds]) {
      if (result.error) throw new Error(result.error.message)
    }
    const current = {
      season: { key: season.season_id as string, startDate: season.start_date as string, endDate: season.start_date as string },
      teams: (teams.data ?? []).map((team) => ({
        name: team.name,
        coach: team.coach_name,
        teamNumber: team.team_number,
        division: team.division,
        conference: team.conference,
        isBye: team.is_bye,
        isActive: team.is_active,
        regularWins: team.regular_wins,
        regularLosses: team.regular_losses,
        regularDiff: team.regular_differential,
        wins: team.wins,
        losses: team.losses,
        differential: team.differential,
        playoffWins: team.playoff_wins,
        playoffLosses: team.playoff_losses,
        playoffDiff: team.playoff_differential,
        sos: Number(team.strength_of_schedule ?? 0),
        streakType: team.streak_type,
        streakLen: team.current_streak,
      })),
      matches: (matches.data ?? []).map((match) => ({
        week: match.week,
        team1: nameOf(match.team1) ?? "",
        team2: nameOf(match.team2) ?? "",
        score1: match.team1_score ?? 0,
        score2: match.team2_score ?? 0,
        status: match.status,
        winner: nameOf(match.winner),
        isPlayoff: match.is_playoff,
        playoffRound: match.playoff_round,
        outcomeType: match.outcome_type,
        notes: match.notes,
        source: match.source,
      })),
      picks: (picks.data ?? []).map((pick) => ({
        team: nameOf(pick.team) ?? "",
        pokemon: nameOf(pick.pokemon) ?? "",
        status: pick.status,
        acquisition: pick.acquisition,
        round: pick.draft_round,
        pick: pick.pick_number,
        points: pick.points_snapshot ?? 0,
        tera: pick.is_tera_captain,
        start: pick.start_date ? String(pick.start_date).slice(0, 10) : null,
        end: pick.end_date ? String(pick.end_date).slice(0, 10) : null,
        notes: pick.notes,
        source: pick.source,
      })),
      stats: (stats.data ?? []).map((row) => {
        const match = Array.isArray(row.matches) ? row.matches[0] : row.matches
        return {
          week: match?.week ?? 0,
          team1: nameOf(match?.team1) ?? "",
          team2: nameOf(match?.team2) ?? "",
          team: nameOf(row.team) ?? "",
          pokemon: nameOf(row.pokemon) ?? "",
          kills: row.kills ?? 0,
          source: row.source,
        }
      }),
      audits: (audits.data ?? []).map((row) => {
        const payload = (row.payload ?? {}) as Record<string, unknown>
        return {
          sourceKey: row.source_key as string,
          team: nameOf(row.team) ?? "",
          action: row.action,
          add: (payload.add as string | null) ?? null,
          drop: (payload.drop as string | null) ?? null,
          rawAdd: (payload.raw_add as string | null) ?? null,
          rawDrop: (payload.raw_drop as string | null) ?? null,
          effectiveWeek: (payload.effective_week_inferred as number | null) ?? null,
          sourceText: (payload.source as string | null) ?? null,
        }
      }),
      seeds: (seeds.data ?? []).map((row) => ({
        seed: row.seed,
        team: row.team_name,
        round1Bye: row.round1_bye,
        divisionWinner: row.is_division_winner,
      })),
    }
    const plan = planSheetSync(bundle.tabs, current)
    const applied = await applySheetSync(supabase, season.id, plan, dryRun || plan.status !== "applied")
    await supabase.from("sheet_sync_runs").insert({
      season_id: season.id,
      season_key: season.season_id,
      status: plan.status === "applied" ? applied.status : plan.status,
      trigger: request.headers.get("x-sheet-sync-trigger") === "manual" || adminOk ? "manual" : "cron",
      mode: dryRun ? "dry_run" : "apply",
      sheet_version: bundle.version,
      sheet_modified_time: bundle.modifiedTime,
      dry_run: dryRun,
      changes_planned: plan.changes.length,
      changes_applied: applied.status === "applied" ? plan.changes.length : 0,
      counts: plan.counts,
      changes: plan.changes.slice(0, 2000),
      summary: { counts: plan.counts, reason: plan.reason },
      error: plan.reason,
      finished_at: new Date().toISOString(),
    })
    if (applied.status === "applied") {
      for (const path of ["/standings", "/mvp", "/teams", "/playoffs", "/schedule"]) revalidatePath(path)
    }
    return NextResponse.json({ success: plan.status !== "failed", status: plan.status, counts: plan.counts, reason: plan.reason })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sheet sync failed"
    console.error("[sync-league-sheet]", message)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const admin = await requireLeagueAdmin()
  if ("response" in admin) return admin.response
  const body = (await request.json().catch(() => ({}))) as { dryRun?: boolean }
  const dryRun = body.dryRun !== false
  const headers = new Headers(request.headers)
  if (process.env.CRON_SECRET) headers.set("authorization", `Bearer ${process.env.CRON_SECRET}`)
  headers.set("x-sheet-sync-trigger", "manual")
  const url = new URL(request.url)
  url.searchParams.set("dry_run", dryRun ? "1" : "0")
  return GET(new Request(url, { headers, method: "GET" }))
}
