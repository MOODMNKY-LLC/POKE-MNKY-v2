/**
 * CHATGPT-V3 League Engine: Execute pending transactions at midnight Monday EST.
 * Processes pending_transactions where status = 'scheduled' and execute_at <= now.
 * Updates draft_picks, team_roster_versions, and team_transaction_counts.
 */

import { createServiceRoleClient } from "@/lib/supabase/service"

const TRANSACTION_CAP_PER_SEASON = 10

export interface ExecutionResult {
  id: string
  type: string
  status: "executed" | "failed"
  error?: string
}

/**
 * Get next Monday 00:00 EST as ISO string (for scheduling new pending_transactions).
 * EST = UTC-5 (no DST in this context for league consistency).
 */
export function getNextMondayMidnightEST(): Date {
  const now = new Date()
  const estOffsetMs = 5 * 60 * 60 * 1000
  const nowEST = new Date(now.getTime() - estOffsetMs)
  const day = nowEST.getUTCDay()
  let daysUntilMonday = day === 0 ? 1 : day === 1 ? 0 : 8 - day
  if (daysUntilMonday === 0 && nowEST.getUTCHours() >= 0 && nowEST.getUTCMinutes() >= 0) {
    daysUntilMonday = 7
  }
  const monday = new Date(nowEST)
  monday.setUTCDate(nowEST.getUTCDate() + daysUntilMonday)
  monday.setUTCHours(0, 0, 0, 0)
  return new Date(monday.getTime() + estOffsetMs)
}

/**
 * Get current week number for a season (from matchweeks or derived from date).
 * Falls back to week 1 if no matchweeks.
 */
async function getEffectiveWeekForExecution(
  supabase: ReturnType<typeof createServiceRoleClient>,
  seasonId: string,
  executeAt: string
): Promise<number> {
  const executeDate = new Date(executeAt)
  const { data: matchweeks } = await supabase
    .from("matchweeks")
    .select("week_number, start_date, end_date")
    .eq("season_id", seasonId)
    .order("week_number", { ascending: true })

  if (matchweeks && matchweeks.length > 0) {
    for (const mw of matchweeks) {
      const start = new Date(mw.start_date)
      const end = new Date(mw.end_date)
      if (executeDate >= start && executeDate <= end) {
        return mw.week_number
      }
    }
    return (matchweeks[matchweeks.length - 1]?.week_number ?? 1) + 1
  }
  return 1
}

/**
 * Build and upsert team_roster_versions for a season/week from current draft_picks (active).
 */
async function snapshotRostersForWeek(
  supabase: ReturnType<typeof createServiceRoleClient>,
  seasonId: string,
  weekNumber: number
): Promise<void> {
  const { data: picks } = await supabase
    .from("draft_picks")
    .select("team_id, pokemon_id, points_snapshot, is_tera_captain, tera_types")
    .eq("season_id", seasonId)
    .eq("status", "active")

  if (!picks || picks.length === 0) return

  const byTeam = new Map<string, Array<{ pokemon_id: string; points: number; is_tera_captain?: boolean; tera_types?: string[] }>>()
  for (const p of picks) {
    const list = byTeam.get(p.team_id) ?? []
    list.push({
      pokemon_id: p.pokemon_id,
      points: p.points_snapshot ?? 0,
      is_tera_captain: (p as any).is_tera_captain ?? false,
      tera_types: Array.isArray((p as any).tera_types) ? (p as any).tera_types : [],
    })
    byTeam.set(p.team_id, list)
  }

  for (const [teamId, entries] of byTeam) {
    const snapshot = entries.map((e) => ({
      pokemon_id: e.pokemon_id,
      points: e.points,
      is_tera_captain: e.is_tera_captain ?? false,
      tera_types: e.tera_types ?? [],
    }))
    await supabase.from("team_roster_versions").upsert(
      {
        team_id: teamId,
        season_id: seasonId,
        week_number: weekNumber,
        snapshot,
      },
      { onConflict: "team_id,season_id,week_number" }
    )
  }
}

const GRACE_PERIOD_DAYS = 5

/** Returns true if season is within grace period (5 days after draft close); then no transaction cost. */
async function isWithinGracePeriod(
  supabase: ReturnType<typeof createServiceRoleClient>,
  seasonId: string
): Promise<boolean> {
  const { data: season } = await supabase
    .from("seasons")
    .select("draft_close_at")
    .eq("id", seasonId)
    .single()
  const closeAt = (season as any)?.draft_close_at
  if (!closeAt) return false
  const end = new Date(closeAt)
  end.setDate(end.getDate() + GRACE_PERIOD_DAYS)
  return new Date() < end
}

/**
 * Increment transaction count for a team (for add/trade cost). Drops cost 0. Skips during grace period.
 */
async function incrementTransactionCount(
  supabase: ReturnType<typeof createServiceRoleClient>,
  teamId: string,
  seasonId: string,
  delta: number
): Promise<void> {
  if (delta <= 0) return
  const { data: row } = await supabase
    .from("team_transaction_counts")
    .select("transaction_count")
    .eq("team_id", teamId)
    .eq("season_id", seasonId)
    .single()

  const current = row?.transaction_count ?? 0
  await supabase
    .from("team_transaction_counts")
    .upsert(
      {
        team_id: teamId,
        season_id: seasonId,
        transaction_count: Math.min(TRANSACTION_CAP_PER_SEASON, current + delta),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "team_id,season_id" }
    )
}

/**
 * Execute a single free_agency pending_transaction.
 */
async function executeFreeAgency(
  supabase: ReturnType<typeof createServiceRoleClient>,
  payload: {
    team_id: string
    season_id: string
    drop_pokemon_id?: string
    add_pokemon_id?: string
    effective_week_number?: number
  },
  effectiveWeek: number
): Promise<{ ok: boolean; error?: string }> {
  const { team_id, season_id, drop_pokemon_id, add_pokemon_id } = payload

  if (drop_pokemon_id) {
    const { error: dropErr } = await supabase
      .from("draft_picks")
      .update({ status: "dropped", end_date: new Date().toISOString().slice(0, 10) })
      .eq("season_id", season_id)
      .eq("team_id", team_id)
      .eq("pokemon_id", drop_pokemon_id)
      .eq("status", "active")

    if (dropErr) return { ok: false, error: dropErr.message }
  }

  if (add_pokemon_id) {
    const { data: pokemon } = await supabase
      .from("pokemon")
      .select("draft_points")
      .eq("id", add_pokemon_id)
      .single()

    const points = pokemon?.draft_points ?? 0
    const today = new Date().toISOString().slice(0, 10)
    const { data: existing } = await supabase
      .from("draft_picks")
      .select("id")
      .eq("season_id", season_id)
      .eq("pokemon_id", add_pokemon_id)
      .single()

    if (existing) {
      const { error: addErr } = await supabase
        .from("draft_picks")
        .update({
          team_id,
          status: "active",
          acquisition: "free_agency",
          start_date: today,
          end_date: null,
          points_snapshot: points,
        })
        .eq("id", existing.id)
      if (addErr) {
        if (drop_pokemon_id) {
          await supabase
            .from("draft_picks")
            .update({ status: "active", end_date: null })
            .eq("season_id", season_id)
            .eq("team_id", team_id)
            .eq("pokemon_id", drop_pokemon_id)
        }
        return { ok: false, error: addErr.message }
      }
    } else {
      const { error: addErr } = await supabase.from("draft_picks").insert({
        season_id,
        team_id,
        pokemon_id: add_pokemon_id,
        acquisition: "free_agency",
        status: "active",
        points_snapshot: points,
        start_date: today,
      })
      if (addErr) {
        if (drop_pokemon_id) {
          await supabase
            .from("draft_picks")
            .update({ status: "active", end_date: null })
            .eq("season_id", season_id)
            .eq("team_id", team_id)
            .eq("pokemon_id", drop_pokemon_id)
        }
        return { ok: false, error: addErr.message }
      }
    }
    await incrementTransactionCount(supabase, team_id, season_id, 1)
  }

  await snapshotRostersForWeek(supabase, season_id, effectiveWeek)
  return { ok: true }
}

/**
 * Execute a single trade pending_transaction.
 * Payload: { offering_team_id, receiving_team_id, offered_pokemon_ids[], requested_pokemon_ids[], season_id?, league_trade_offer_id?, effective_week_number? }
 * After swapping draft_picks, applies tera_assignment_windows resolution (is_tera_captain + tera_types) when present.
 */
async function executeTrade(
  supabase: ReturnType<typeof createServiceRoleClient>,
  payload: {
    offering_team_id: string
    receiving_team_id: string
    offered_pokemon_ids: string[]
    requested_pokemon_ids: string[]
    season_id?: string
    league_trade_offer_id?: string
    effective_week_number?: number
  },
  seasonId: string,
  effectiveWeek: number
): Promise<{ ok: boolean; error?: string }> {
  const { offering_team_id, receiving_team_id, offered_pokemon_ids, requested_pokemon_ids } =
    payload
  const season = payload.season_id ?? seasonId

  for (const pokemonId of offered_pokemon_ids) {
    const { error: e } = await supabase
      .from("draft_picks")
      .update({ team_id: receiving_team_id })
      .eq("season_id", season)
      .eq("team_id", offering_team_id)
      .eq("pokemon_id", pokemonId)
      .eq("status", "active")
    if (e) return { ok: false, error: `offer swap: ${e.message}` }
  }
  for (const pokemonId of requested_pokemon_ids) {
    const { error: e } = await supabase
      .from("draft_picks")
      .update({ team_id: offering_team_id })
      .eq("season_id", season)
      .eq("team_id", receiving_team_id)
      .eq("pokemon_id", pokemonId)
      .eq("status", "active")
    if (e) return { ok: false, error: `request swap: ${e.message}` }
  }

  if (payload.league_trade_offer_id) {
    const { data: windows } = await supabase
      .from("tera_assignment_windows")
      .select("receiving_team_id, resolution")
      .eq("league_trade_offer_id", payload.league_trade_offer_id)
      .eq("completed", true)
      .not("resolution", "is", null)
    const res = (windows ?? []) as Array<{ receiving_team_id: string; resolution: { assignments?: Array<{ pokemon_id: string; tera_types: string[] }> } }>
    for (const w of res) {
      const assignments = w.resolution?.assignments ?? []
      for (const a of assignments) {
        await supabase
          .from("draft_picks")
          .update({
            is_tera_captain: true,
            tera_types: a.tera_types,
          })
          .eq("season_id", season)
          .eq("team_id", w.receiving_team_id)
          .eq("pokemon_id", a.pokemon_id)
          .eq("status", "active")
      }
    }
  }

  const inGrace = await isWithinGracePeriod(supabase, season)
  if (!inGrace) {
    await incrementTransactionCount(supabase, offering_team_id, season, 1)
    await incrementTransactionCount(supabase, receiving_team_id, season, 1)
  }
  await snapshotRostersForWeek(supabase, season, effectiveWeek)
  return { ok: true }
}

/**
 * Process all due pending_transactions (status = scheduled, execute_at <= now).
 */
export async function executePendingTransactions(): Promise<ExecutionResult[]> {
  const supabase = createServiceRoleClient()
  const now = new Date().toISOString()

  const { data: due, error: fetchErr } = await supabase
    .from("pending_transactions")
    .select("id, type, payload, execute_at, season_id")
    .eq("status", "scheduled")
    .lte("execute_at", now)
    .order("execute_at", { ascending: true })

  if (fetchErr) {
    throw new Error(`Failed to fetch pending_transactions: ${fetchErr.message}`)
  }
  if (!due || due.length === 0) {
    return []
  }

  const results: ExecutionResult[] = []
  for (const row of due) {
    const seasonId = row.season_id
    const effectiveWeek = await getEffectiveWeekForExecution(
      supabase,
      seasonId,
      row.execute_at
    )
    let ok = false
    let errMsg: string | undefined

    if (row.type === "free_agency") {
      const payload = row.payload as {
        team_id: string
        season_id: string
        drop_pokemon_id?: string
        add_pokemon_id?: string
      }
      const res = await executeFreeAgency(supabase, { ...payload, effective_week_number: effectiveWeek }, effectiveWeek)
      ok = res.ok
      errMsg = res.error
    } else if (row.type === "trade") {
      const payload = row.payload as {
        offering_team_id: string
        receiving_team_id: string
        offered_pokemon_ids: string[]
        requested_pokemon_ids: string[]
        season_id?: string
      }
      const res = await executeTrade(
        supabase,
        { ...payload, season_id: seasonId, effective_week_number: effectiveWeek },
        seasonId,
        effectiveWeek
      )
      ok = res.ok
      errMsg = res.error
    } else {
      errMsg = `Unknown type: ${row.type}`
    }

    const status = ok ? "executed" : "failed"
    await supabase
      .from("pending_transactions")
      .update({
        status,
        processed_at: new Date().toISOString(),
        error_message: errMsg ?? null,
      })
      .eq("id", row.id)

    results.push({ id: row.id, type: row.type, status, error: errMsg })
  }

  return results
}
