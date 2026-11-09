/**
 * Worker-side provisional season path (schedule → statistical results → playoffs → champion).
 * Lease must already be held. Uses operation_key idempotency via simulation_steps.
 * Fidelity: statistical_seeded only. No Discord/email/sheet side effects.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import type { SimRunConfig } from "@/lib/season-sim/config"
import {
  STATISTICAL_DISCLAIMER,
  STATISTICAL_FIDELITY,
  buildNextPlayoffRound,
  buildPlayoffRound1,
  buildRegularSchedule,
  computeSimStandings,
  generateSeededStatisticalResult,
  rejectShowdownBattleFidelity,
} from "@/lib/season-sim/season-domain"
import { domainOperationKey } from "@/lib/season-sim/operation-key"
import { createSubstreamPrng, bumpCounter, type RngCounters } from "@/lib/season-sim/prng"
import type { SimRunRow } from "@/lib/season-sim/types"

type ServiceClient = SupabaseClient

export type SeasonPathTickResult = {
  run_id: string
  claimed: boolean
  reason?: string
  steps_applied: number
  run_status: string
  step_seq: number
  run_version: number
}

async function stepExists(
  supabase: ServiceClient,
  runId: string,
  operationKey: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("simulation_steps")
    .select("id")
    .eq("run_id", runId)
    .eq("operation_key", operationKey)
    .maybeSingle()
  return Boolean(data?.id)
}

async function recordStepEvent(
  supabase: ServiceClient,
  args: {
    run: SimRunRow
    operationKey: string
    kind: string
    commandId: string | null
    output: Record<string, unknown>
    decisionSource: string
    eventType: string
    cursorPatch: Record<string, unknown>
    status?: string
    phase?: string
    clearLease?: boolean
  },
): Promise<{ step_seq: number; run_version: number }> {
  const nextSeq = args.run.step_seq + 1
  const nextEvent = args.run.event_seq + 1
  await supabase.from("simulation_steps").insert({
    run_id: args.run.id,
    season_id: args.run.season_id,
    command_id: args.commandId,
    step_seq: nextSeq,
    operation_key: args.operationKey,
    kind: args.kind,
    status: "applied",
    output: args.output,
    decision_source: args.decisionSource,
  })
  await supabase.from("simulation_events").insert({
    run_id: args.run.id,
    season_id: args.run.season_id,
    event_seq: nextEvent,
    event_type: args.eventType,
    step_seq: nextSeq,
    command_id: args.commandId,
    provenance: { source: args.decisionSource },
    payload_sanitized: {
      ...args.output,
      disclaimer: STATISTICAL_DISCLAIMER,
      fidelity: STATISTICAL_FIDELITY,
    },
  })
  const cursor = {
    ...(args.run.cursor ?? {}),
    step_seq: nextSeq,
    ...args.cursorPatch,
  }
  const patch: Record<string, unknown> = {
    step_seq: nextSeq,
    event_seq: nextEvent,
    cursor,
    run_version: args.run.run_version + 1,
    updated_at: new Date().toISOString(),
    heartbeat_at: new Date().toISOString(),
    status: args.status ?? "running",
    phase: args.phase ?? args.run.phase,
    blocked_reason: null,
    error_code: null,
    error_message: null,
  }
  if (args.clearLease) {
    patch.lease_owner = null
    patch.lease_token = null
    patch.lease_expires_at = null
    patch.active_command_id = null
  } else {
    patch.lease_expires_at = new Date(Date.now() + 30_000).toISOString()
  }
  await supabase.from("simulation_runs").update(patch).eq("id", args.run.id)
  return { step_seq: nextSeq, run_version: args.run.run_version + 1 }
}

async function refreshStandings(
  supabase: ServiceClient,
  runId: string,
  seasonId: string,
  teamIds: string[],
): Promise<ReturnType<typeof computeSimStandings>> {
  const { data: matches } = await supabase
    .from("sim_matches")
    .select(
      "team1_id, team2_id, winner_id, team1_score, team2_score, differential, is_playoff, status",
    )
    .eq("run_id", runId)
    .eq("status", "completed")
  const standings = computeSimStandings(
    teamIds,
    (matches ?? []).map((m) => ({
      team1_id: String(m.team1_id),
      team2_id: String(m.team2_id),
      winner_id: (m.winner_id as string | null) ?? null,
      team1_score: m.team1_score as number | null,
      team2_score: m.team2_score as number | null,
      differential: m.differential as number | null,
      is_playoff: Boolean(m.is_playoff),
    })),
  )
  for (const row of standings) {
    await supabase.from("sim_standings").upsert(
      {
        run_id: runId,
        season_id: seasonId,
        team_id: row.team_id,
        wins: row.wins,
        losses: row.losses,
        differential: row.differential,
        playoff_wins: row.playoff_wins,
        playoff_losses: row.playoff_losses,
        playoff_differential: row.playoff_differential,
        seed: row.seed,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "run_id,team_id" },
    )
  }
  return standings
}

export async function driveSeasonPathUnit(
  supabase: ServiceClient,
  args: {
    run: SimRunRow
    runId: string
    leaseToken: string
    workerId: string
    maxSteps: number
    unit: "match" | "week" | "playoff_round" | "season"
    n: number
    commandId: string | null
    commandRowId?: string
    getRun: (supabase: ServiceClient, runId: string) => Promise<SimRunRow>
  },
): Promise<SeasonPathTickResult> {
  let run = args.run
  const config = (run.config ?? {}) as SimRunConfig
  const fidelityCheck = rejectShowdownBattleFidelity(
    String(config.fidelity ?? STATISTICAL_FIDELITY),
  )
  if (!fidelityCheck.ok) {
    await supabase
      .from("simulation_runs")
      .update({
        status: "blocked",
        blocked_reason: fidelityCheck.code,
        error_code: fidelityCheck.code,
        error_message: fidelityCheck.message,
        lease_owner: null,
        lease_token: null,
        lease_expires_at: null,
        active_command_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", args.runId)
    return {
      run_id: args.runId,
      claimed: true,
      steps_applied: 0,
      run_status: "blocked",
      step_seq: run.step_seq,
      run_version: run.run_version,
      reason: fidelityCheck.code,
    }
  }

  if (!run.cursor?.draft_complete) {
    return {
      run_id: args.runId,
      claimed: true,
      steps_applied: 0,
      run_status: run.status,
      step_seq: run.step_seq,
      run_version: run.run_version,
      reason: "DRAFT_INCOMPLETE",
    }
  }

  const { data: seats } = await supabase
    .from("sim_bot_seats")
    .select("team_id, seat_index")
    .eq("run_id", args.runId)
    .order("seat_index", { ascending: true })
  const teamIds = (seats ?? [])
    .map((s) => s.team_id as string | null)
    .filter((id): id is string => Boolean(id))

  if (teamIds.length < 2) {
    return {
      run_id: args.runId,
      claimed: true,
      steps_applied: 0,
      run_status: "blocked",
      step_seq: run.step_seq,
      run_version: run.run_version,
      reason: "INFEASIBLE_SEATS",
    }
  }

  let stepsApplied = 0
  let counters = (run.rng_counters ?? {}) as RngCounters
  const weeks = Number(config.schedule_weeks ?? 3)
  const playoffSize = Math.min(
    Number(config.playoff_size ?? 4),
    teamIds.length,
  )

  const finishCommand = async (status: string) => {
    if (!args.commandRowId) return
    await supabase
      .from("simulation_commands")
      .update({
        status: status === "cancelled" ? "cancelled" : "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("run_id", args.runId)
      .eq("command_id", args.commandRowId)
  }

  // 1) Seed schedule once
  const { count: matchCount } = await supabase
    .from("sim_matches")
    .select("id", { count: "exact", head: true })
    .eq("run_id", args.runId)
    .eq("is_playoff", false)

  if ((matchCount ?? 0) === 0) {
    const opKey = domainOperationKey(run.cursor, "season_schedule:regular")
    if (!(await stepExists(supabase, args.runId, opKey))) {
      const schedule = buildRegularSchedule({ teamIds, weeks })
      if (!schedule.length) {
        return {
          run_id: args.runId,
          claimed: true,
          steps_applied: 0,
          run_status: "blocked",
          step_seq: run.step_seq,
          run_version: run.run_version,
          reason: "SCHEDULE_EMPTY",
        }
      }
      await supabase.from("sim_matches").insert(
        schedule.map((m) => ({
          run_id: args.runId,
          season_id: run.season_id,
          week: m.week,
          match_index: m.match_index,
          team1_id: m.team1_id,
          team2_id: m.team2_id,
          is_playoff: false,
          playoff_round: null,
          status: "scheduled",
          fidelity: STATISTICAL_FIDELITY,
        })),
      )
      await recordStepEvent(supabase, {
        run,
        operationKey: opKey,
        kind: "season_schedule",
        commandId: args.commandId,
        output: {
          weeks,
          match_count: schedule.length,
          worker_id: args.workerId,
        },
        decisionSource: "system",
        eventType: "season.schedule_seeded",
        cursorPatch: {
          awaiting: "regular",
          schedule_weeks: weeks,
          draft_complete: true,
        },
        phase: "regular",
        status: "running",
      })
      stepsApplied += 1
      run = await args.getRun(supabase, args.runId)
    }
  }

  const resolveOneMatch = async (match: {
    id: string
    week: number
    match_index: number
    team1_id: string
    team2_id: string
    is_playoff: boolean
    playoff_round: number | null
  }): Promise<boolean> => {
    const opKey = domainOperationKey(
      run.cursor,
      match.is_playoff
        ? `playoff_result:${match.playoff_round}:${match.match_index}`
        : `match_result:${match.week}:${match.match_index}`,
    )
    if (await stepExists(supabase, args.runId, opKey)) return false

    const bumped = bumpCounter(counters, "statistical_outcomes")
    counters = bumped.next
    const prng = createSubstreamPrng(
      run.master_seed ?? "0",
      "statistical_outcomes",
      bumped.counter,
    )
    const result = generateSeededStatisticalResult({
      team1_id: match.team1_id,
      team2_id: match.team2_id,
      prng,
    })
    await supabase
      .from("sim_matches")
      .update({
        status: "completed",
        winner_id: result.winner_id,
        team1_score: result.team1_score,
        team2_score: result.team2_score,
        differential: result.differential,
        fidelity: STATISTICAL_FIDELITY,
        step_seq: run.step_seq + 1,
      })
      .eq("id", match.id)

    await supabase.from("simulation_decisions").insert({
      run_id: args.runId,
      season_id: run.season_id,
      step_seq: run.step_seq + 1,
      source: "rng",
      answer: {
        decision_type: "statistical_match_result",
        ...result,
        week: match.week,
        match_index: match.match_index,
        is_playoff: match.is_playoff,
        playoff_round: match.playoff_round,
        disclaimer: STATISTICAL_DISCLAIMER,
      },
    })

    await recordStepEvent(supabase, {
      run,
      operationKey: opKey,
      kind: match.is_playoff ? "playoff_result" : "match_result",
      commandId: args.commandId,
      output: {
        match_id: match.id,
        week: match.week,
        match_index: match.match_index,
        winner_id: result.winner_id,
        fidelity: STATISTICAL_FIDELITY,
        rng_counter: bumped.counter,
      },
      decisionSource: "rng",
      eventType: match.is_playoff
        ? "season.playoff_result"
        : "season.match_result",
      cursorPatch: {
        awaiting: match.is_playoff ? "playoffs" : "regular",
        last_week: match.week,
        last_match_index: match.match_index,
        draft_complete: true,
      },
      phase: match.is_playoff ? "playoffs" : "regular",
      status: "running",
    })
    await supabase
      .from("simulation_runs")
      .update({ rng_counters: counters, updated_at: new Date().toISOString() })
      .eq("id", args.runId)
      .eq("lease_token", args.leaseToken)

    run = await args.getRun(supabase, args.runId)
    await refreshStandings(supabase, args.runId, run.season_id!, teamIds)
    return true
  }

  const loadScheduled = async (opts: {
    playoff: boolean
    week?: number
    playoffRound?: number
    limit: number
  }) => {
    let q = supabase
      .from("sim_matches")
      .select(
        "id, week, match_index, team1_id, team2_id, is_playoff, playoff_round, status",
      )
      .eq("run_id", args.runId)
      .eq("status", "scheduled")
      .eq("is_playoff", opts.playoff)
      .order("week", { ascending: true })
      .order("match_index", { ascending: true })
      .limit(opts.limit)
    if (opts.week != null) q = q.eq("week", opts.week)
    if (opts.playoffRound != null) q = q.eq("playoff_round", opts.playoffRound)
    const { data } = await q
    return (data ?? []) as Array<{
      id: string
      week: number
      match_index: number
      team1_id: string
      team2_id: string
      is_playoff: boolean
      playoff_round: number | null
    }>
  }

  // Regular season resolution
  const wantRegular =
    args.unit === "match" ||
    args.unit === "week" ||
    args.unit === "season"

  if (wantRegular) {
    while (stepsApplied < args.maxSteps) {
      const { count: remainingRegular } = await supabase
        .from("sim_matches")
        .select("id", { count: "exact", head: true })
        .eq("run_id", args.runId)
        .eq("is_playoff", false)
        .eq("status", "scheduled")
      if ((remainingRegular ?? 0) === 0) break

      let batch = await loadScheduled({
        playoff: false,
        limit: args.unit === "match" ? 1 : 50,
      })
      if (args.unit === "week" && batch[0]) {
        batch = await loadScheduled({
          playoff: false,
          week: batch[0].week,
          limit: 50,
        })
      }
      if (!batch.length) break

      let progressed = false
      for (const m of batch) {
        if (stepsApplied >= args.maxSteps) break
        if (args.unit === "match" && progressed) break
        const did = await resolveOneMatch(m)
        if (did) {
          stepsApplied += 1
          progressed = true
        }
      }
      if (!progressed) break
      if (args.unit === "match" || args.unit === "week") break
    }
  }

  // Playoffs when regular done (or unit playoff_round / season)
  const { count: leftRegular } = await supabase
    .from("sim_matches")
    .select("id", { count: "exact", head: true })
    .eq("run_id", args.runId)
    .eq("is_playoff", false)
    .eq("status", "scheduled")

  const enterPlayoffs =
    (leftRegular ?? 0) === 0 &&
    (args.unit === "playoff_round" ||
      args.unit === "season" ||
      (args.unit === "week" && stepsApplied === 0) ||
      (args.unit === "match" && stepsApplied === 0))

  if (enterPlayoffs && stepsApplied < args.maxSteps) {
    const { count: playoffCount } = await supabase
      .from("sim_matches")
      .select("id", { count: "exact", head: true })
      .eq("run_id", args.runId)
      .eq("is_playoff", true)

    if ((playoffCount ?? 0) === 0) {
      const opKey = domainOperationKey(run.cursor, "playoff_bracket:round1")
      if (!(await stepExists(supabase, args.runId, opKey))) {
        const standings = await refreshStandings(
          supabase,
          args.runId,
          run.season_id!,
          teamIds,
        )
        const r1 = buildPlayoffRound1({
          standings,
          topN: playoffSize,
          baseWeek: weeks + 1,
        })
        if (!r1.length) {
          return {
            run_id: args.runId,
            claimed: true,
            steps_applied: stepsApplied,
            run_status: "blocked",
            step_seq: run.step_seq,
            run_version: run.run_version,
            reason: "PLAYOFF_BRACKET_EMPTY",
          }
        }
        await supabase.from("sim_matches").insert(
          r1.map((m) => ({
            run_id: args.runId,
            season_id: run.season_id,
            week: m.week,
            match_index: m.match_index,
            team1_id: m.team1_id,
            team2_id: m.team2_id,
            is_playoff: true,
            playoff_round: m.playoff_round,
            status: "scheduled",
            fidelity: STATISTICAL_FIDELITY,
          })),
        )
        await recordStepEvent(supabase, {
          run,
          operationKey: opKey,
          kind: "playoff_bracket",
          commandId: args.commandId,
          output: { round: 1, matches: r1.length, playoff_size: playoffSize },
          decisionSource: "system",
          eventType: "season.playoff_bracket",
          cursorPatch: {
            awaiting: "playoffs",
            playoff_round: 1,
            draft_complete: true,
          },
          phase: "playoffs",
          status: "running",
        })
        stepsApplied += 1
        run = await args.getRun(supabase, args.runId)
      }
    }

    while (stepsApplied < args.maxSteps) {
      const scheduledPo = await loadScheduled({ playoff: true, limit: 50 })
      if (!scheduledPo.length) {
        // Advance bracket or crown champion
        const { data: completedPo } = await supabase
          .from("sim_matches")
          .select("week, match_index, winner_id, playoff_round, status")
          .eq("run_id", args.runId)
          .eq("is_playoff", true)
          .eq("status", "completed")
          .order("playoff_round", { ascending: false })
          .order("match_index", { ascending: true })

        const maxRound = Math.max(
          0,
          ...(completedPo ?? []).map((m) => Number(m.playoff_round ?? 0)),
        )
        const lastRound = (completedPo ?? []).filter(
          (m) => Number(m.playoff_round) === maxRound,
        )
        if (lastRound.length === 1 && lastRound[0]?.winner_id) {
          const opKey = domainOperationKey(run.cursor, "season_champion")
          if (!(await stepExists(supabase, args.runId, opKey))) {
            const championId = String(lastRound[0].winner_id)
            await supabase.from("sim_season_outcomes").upsert({
              run_id: args.runId,
              season_id: run.season_id,
              champion_team_id: championId,
              fidelity: STATISTICAL_FIDELITY,
              disclaimer: STATISTICAL_DISCLAIMER,
              completed_at: new Date().toISOString(),
            })
            await recordStepEvent(supabase, {
              run,
              operationKey: opKey,
              kind: "season_champion",
              commandId: args.commandId,
              output: {
                champion_team_id: championId,
                fidelity: STATISTICAL_FIDELITY,
              },
              decisionSource: "system",
              eventType: "season.champion",
              cursorPatch: {
                awaiting: null,
                draft_complete: true,
                champion_team_id: championId,
                complete: true,
              },
              phase: "complete",
              status: "completed",
              clearLease: true,
            })
            await supabase
              .from("simulation_runs")
              .update({
                completed_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("id", args.runId)
            stepsApplied += 1
            await finishCommand("completed")
            const after = await args.getRun(supabase, args.runId)
            return {
              run_id: args.runId,
              claimed: true,
              steps_applied: stepsApplied,
              run_status: after.status,
              step_seq: after.step_seq,
              run_version: after.run_version,
              reason: "SEASON_COMPLETE",
            }
          }
          break
        }

        const next = buildNextPlayoffRound({
          priorRoundMatches: lastRound.map((m) => ({
            match_index: Number(m.match_index),
            winner_id: (m.winner_id as string | null) ?? null,
            playoff_round: Number(m.playoff_round),
            week: Number(m.week),
          })),
          nextRound: maxRound + 1,
          nextWeek: weeks + maxRound + 1,
        })
        if (!next.length) break
        const opKey = domainOperationKey(
          run.cursor,
          `playoff_bracket:round${maxRound + 1}`,
        )
        if (await stepExists(supabase, args.runId, opKey)) break
        await supabase.from("sim_matches").insert(
          next.map((m) => ({
            run_id: args.runId,
            season_id: run.season_id,
            week: m.week,
            match_index: m.match_index,
            team1_id: m.team1_id,
            team2_id: m.team2_id,
            is_playoff: true,
            playoff_round: m.playoff_round,
            status: "scheduled",
            fidelity: STATISTICAL_FIDELITY,
          })),
        )
        await recordStepEvent(supabase, {
          run,
          operationKey: opKey,
          kind: "playoff_bracket",
          commandId: args.commandId,
          output: { round: maxRound + 1, matches: next.length },
          decisionSource: "system",
          eventType: "season.playoff_bracket",
          cursorPatch: {
            awaiting: "playoffs",
            playoff_round: maxRound + 1,
            draft_complete: true,
          },
          phase: "playoffs",
          status: "running",
        })
        stepsApplied += 1
        run = await args.getRun(supabase, args.runId)
        continue
      }

      let batch = scheduledPo
      if (args.unit === "match") batch = scheduledPo.slice(0, 1)
      if (args.unit === "playoff_round" && scheduledPo[0]) {
        batch = await loadScheduled({
          playoff: true,
          playoffRound: Number(scheduledPo[0].playoff_round ?? 1),
          limit: 50,
        })
      }
      let progressed = false
      for (const m of batch) {
        if (stepsApplied >= args.maxSteps) break
        const did = await resolveOneMatch(m)
        if (did) {
          stepsApplied += 1
          progressed = true
        }
        if (args.unit === "match") break
      }
      if (!progressed) break
      if (args.unit === "match" || args.unit === "playoff_round") break
    }
  }

  run = await args.getRun(supabase, args.runId)
  if (run.status === "completed") {
    await finishCommand("completed")
  } else if (args.commandRowId && stepsApplied > 0) {
    await finishCommand("completed")
    await supabase
      .from("simulation_runs")
      .update({
        active_command_id: null,
        status: run.status === "running" ? "paused" : run.status,
        lease_owner: null,
        lease_token: null,
        lease_expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", args.runId)
      .eq("lease_token", args.leaseToken)
  }

  const after = await args.getRun(supabase, args.runId)
  return {
    run_id: args.runId,
    claimed: true,
    steps_applied: stepsApplied,
    run_status: after.status,
    step_seq: after.step_seq,
    run_version: after.run_version,
    reason:
      after.status === "completed"
        ? "SEASON_COMPLETE"
        : after.cursor?.awaiting
          ? `AWAITING_${String(after.cursor.awaiting).toUpperCase()}`
          : undefined,
  }
}
