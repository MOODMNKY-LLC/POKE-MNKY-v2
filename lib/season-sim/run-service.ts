import { randomUUID } from "node:crypto"
import type { SupabaseClient } from "@supabase/supabase-js"
import { buildProvisionalDemoConfig } from "@/lib/season-sim/config"
import { hashCommandPayload } from "@/lib/season-sim/payload-hash"
import {
  SIM_PRNG_ALGORITHM,
  SIM_PRNG_ALGORITHM_VERSION,
  createSubstreamPrng,
  generateMasterSeedHex,
  bumpCounter,
  type RngCounters,
} from "@/lib/season-sim/prng"
import { assertSeasonIsSandbox } from "@/lib/season-sim/sandbox-guard"
import type {
  SimAdvanceUnit,
  SimCommandAcceptResponse,
  SimProgressResponse,
  SimRunRow,
} from "@/lib/season-sim/types"

type ServiceClient = SupabaseClient

function asRun(row: Record<string, unknown>): SimRunRow {
  return row as unknown as SimRunRow
}

export function toProgress(run: SimRunRow): SimProgressResponse {
  return {
    run_id: run.id,
    season_id: run.season_id,
    phase: run.phase,
    status: run.status,
    step_seq: run.step_seq,
    event_seq: run.event_seq,
    run_version: run.run_version,
    seed_frozen: Boolean(run.config_frozen_at),
    active_command_id: run.active_command_id,
    blocked_reason: run.blocked_reason,
    error_code: run.error_code,
    error_message: run.error_message,
    cursor: run.cursor ?? { step_seq: run.step_seq },
    config: run.config ?? {},
  }
}

export async function createSandboxSimulationRun(
  supabase: ServiceClient,
  ownerUserId: string,
  options: {
    master_seed?: string
    team_count?: number
    queue_immediately?: boolean
  } = {},
): Promise<{ run: SimRunRow; season_id: string; team_ids: string[] }> {
  const masterSeed = options.master_seed?.trim() || generateMasterSeedHex()
  const config = buildProvisionalDemoConfig({
    master_seed: masterSeed,
    team_count: options.team_count,
  })

  const seasonName = `Sandbox Sim ${new Date().toISOString().slice(0, 19)}Z ${masterSeed.slice(0, 8)}`
  const start = new Date().toISOString().slice(0, 10)
  const end = new Date(Date.now() + 120 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)

  const { data: season, error: seasonError } = await supabase
    .from("seasons")
    .insert({
      name: seasonName,
      is_current: false,
      is_live_competitive: false,
      sheet_sync_enabled: false,
      is_sandbox: true,
      start_date: start,
      end_date: end,
    })
    .select("id")
    .single()

  if (seasonError || !season?.id) {
    throw new Error(`Failed to create sandbox season: ${seasonError?.message}`)
  }

  const teamIds: string[] = []
  for (let i = 0; i < config.team_count; i++) {
    const seat = i + 1
    const name = `${seasonName} · Seat ${String(seat).padStart(2, "0")}`
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .insert({
        name,
        coach_name: `Synthetic Bot ${seat}`,
        division: seat % 2 === 0 ? "Sandbox-B" : "Sandbox-A",
        conference: "Sandbox",
        season_id: season.id,
        coach_id: null,
      })
      .select("id")
      .single()
    if (teamError || !team?.id) {
      throw new Error(`Failed to create synthetic team: ${teamError?.message}`)
    }
    teamIds.push(team.id)
  }

  const queueNow = options.queue_immediately !== false
  const { data: run, error: runError } = await supabase
    .from("simulation_runs")
    .insert({
      season_id: season.id,
      owner_user_id: ownerUserId,
      status: queueNow ? "queued" : "configured",
      phase: "configured",
      config,
      rules_snapshot: {
        rules_version: config.rules_version,
        note: config.rules_label_note,
        roster_min: config.roster_min,
        roster_max: config.roster_max,
        budget_total: config.budget_total,
        bring_n: config.bring_n,
      },
      master_seed: masterSeed,
      rng_algorithm: SIM_PRNG_ALGORITHM,
      rng_algorithm_version: SIM_PRNG_ALGORITHM_VERSION,
      rng_counters: {},
      cursor: { step_seq: 0 },
      step_seq: 0,
      event_seq: 0,
      run_version: 1,
      config_frozen_at: queueNow ? new Date().toISOString() : null,
    })
    .select("*")
    .single()

  if (runError || !run) {
    throw new Error(`Failed to create simulation run: ${runError?.message}`)
  }

  const seats = teamIds.map((teamId, index) => ({
    run_id: run.id,
    season_id: season.id,
    team_id: teamId,
    seat_index: index + 1,
    display_name: `Synthetic Bot ${index + 1}`,
    selector: config.selector_draft,
  }))

  const { error: seatError } = await supabase.from("sim_bot_seats").insert(seats)
  if (seatError) {
    throw new Error(`Failed to create synthetic seats: ${seatError.message}`)
  }

  // Provenance event
  await supabase.from("simulation_events").insert({
    run_id: run.id,
    season_id: season.id,
    event_seq: 1,
    event_type: "run.created",
    provenance: { source: "system", owner_user_id: ownerUserId },
    payload_sanitized: {
      team_count: config.team_count,
      rules_version: config.rules_version,
      queued: queueNow,
    },
  })
  await supabase
    .from("simulation_runs")
    .update({ event_seq: 1, updated_at: new Date().toISOString() })
    .eq("id", run.id)

  const refreshed = await getRun(supabase, run.id)
  return { run: refreshed, season_id: season.id, team_ids: teamIds }
}

export async function getRun(
  supabase: ServiceClient,
  runId: string,
): Promise<SimRunRow> {
  const { data, error } = await supabase
    .from("simulation_runs")
    .select("*")
    .eq("id", runId)
    .maybeSingle()
  if (error || !data) throw new Error(error?.message ?? "Run not found")
  if (data.season_id) {
    await assertSeasonIsSandbox(supabase, data.season_id as string)
  }
  return asRun(data)
}

type CommandConflict = {
  status: 409
  code: string
  message: string
  existing?: SimCommandAcceptResponse
}

export async function acceptCommand(
  supabase: ServiceClient,
  runId: string,
  input: {
    command_id: string
    command_type: "advance" | "pause" | "resume" | "cancel" | "queue"
    unit?: SimAdvanceUnit
    n?: number
    expected_step_seq: number
    expected_run_version: number
    payload?: Record<string, unknown>
  },
): Promise<SimCommandAcceptResponse | CommandConflict> {
  const run = await getRun(supabase, runId)
  if (!run.season_id) {
    return {
      status: 409,
      code: "RUN_MISSING_SEASON",
      message: "Run has no sandbox season_id",
    }
  }

  const payload = {
    command_type: input.command_type,
    unit: input.unit ?? null,
    n: input.n ?? null,
    expected_step_seq: input.expected_step_seq,
    expected_run_version: input.expected_run_version,
    ...(input.payload ?? {}),
  }
  const payloadHash = hashCommandPayload(payload)

  const { data: existing } = await supabase
    .from("simulation_commands")
    .select("*")
    .eq("run_id", runId)
    .eq("command_id", input.command_id)
    .maybeSingle()

  if (existing) {
    if (existing.payload_hash === payloadHash) {
      const response = (existing.response ?? {}) as SimCommandAcceptResponse
      return {
        command_id: input.command_id,
        run_id: runId,
        run_version: response.run_version ?? run.run_version,
        expected_cursor: response.expected_cursor ?? {
          step_seq: existing.expected_step_seq,
        },
        status: existing.status,
        replayed: true,
      }
    }
    return {
      status: 409,
      code: "COMMAND_PAYLOAD_MISMATCH",
      message: "Same command_id with different payload_hash",
    }
  }

  if (input.expected_step_seq !== run.step_seq) {
    return {
      status: 409,
      code: "EXPECTED_CURSOR_MISMATCH",
      message: `expected_step_seq ${input.expected_step_seq} != run.step_seq ${run.step_seq}`,
    }
  }
  if (input.expected_run_version !== run.run_version) {
    return {
      status: 409,
      code: "EXPECTED_VERSION_MISMATCH",
      message: `expected_run_version ${input.expected_run_version} != run.run_version ${run.run_version}`,
    }
  }

  // Lifecycle validation
  const lifecycleError = validateLifecycle(run.status, input.command_type, input.unit)
  if (lifecycleError) {
    return { status: 409, code: lifecycleError.code, message: lifecycleError.message }
  }

  const accept: SimCommandAcceptResponse = {
    command_id: input.command_id,
    run_id: runId,
    run_version: run.run_version + 1,
    expected_cursor: { step_seq: run.step_seq },
    status: "accepted",
  }

  const { error: insertError } = await supabase.from("simulation_commands").insert({
    run_id: runId,
    season_id: run.season_id,
    command_id: input.command_id,
    command_type: input.command_type,
    unit: input.unit ?? null,
    n: input.n ?? null,
    payload,
    payload_hash: payloadHash,
    expected_step_seq: input.expected_step_seq,
    expected_run_version: input.expected_run_version,
    status: "accepted",
    response: accept,
  })
  if (insertError) {
    // Unique race → re-read
    const { data: raced } = await supabase
      .from("simulation_commands")
      .select("*")
      .eq("run_id", runId)
      .eq("command_id", input.command_id)
      .maybeSingle()
    if (raced?.payload_hash === payloadHash) {
      return {
        ...(raced.response as SimCommandAcceptResponse),
        replayed: true,
      }
    }
    throw new Error(insertError.message)
  }

  const patch = buildStatusPatch(run, input.command_type)
  const eventSeq = run.event_seq + 1
  await supabase.from("simulation_events").insert({
    run_id: runId,
    season_id: run.season_id,
    event_seq: eventSeq,
    event_type: `command.${input.command_type}`,
    command_id: input.command_id,
    provenance: { source: "admin" },
    payload_sanitized: {
      unit: input.unit ?? null,
      n: input.n ?? null,
      payload_hash: payloadHash,
    },
  })

  await supabase
    .from("simulation_runs")
    .update({
      ...patch,
      active_command_id:
        input.command_type === "advance" || input.command_type === "queue"
          ? input.command_id
          : null,
      event_seq: eventSeq,
      run_version: run.run_version + 1,
      updated_at: new Date().toISOString(),
      config_frozen_at:
        run.config_frozen_at ??
        (input.command_type === "queue" ? new Date().toISOString() : run.config_frozen_at),
    })
    .eq("id", runId)

  return accept
}

function validateLifecycle(
  status: string,
  commandType: string,
  unit?: SimAdvanceUnit,
): { code: string; message: string } | null {
  if (commandType === "advance") {
    if (!["queued", "running", "paused", "blocked"].includes(status)) {
      return {
        code: "INVALID_STATUS",
        message: `Cannot advance from status ${status}`,
      }
    }
    if (unit && unit !== "foundation") {
      // Allowed to accept command; worker will block unsupported domain — do not fabricate.
      return null
    }
  }
  if (commandType === "pause" && !["queued", "running"].includes(status)) {
    return { code: "INVALID_STATUS", message: `Cannot pause from ${status}` }
  }
  if (commandType === "resume" && !["paused", "blocked"].includes(status)) {
    return { code: "INVALID_STATUS", message: `Cannot resume from ${status}` }
  }
  if (
    commandType === "cancel" &&
    ["cancelled", "completed", "archived", "failed"].includes(status)
  ) {
    return { code: "INVALID_STATUS", message: `Cannot cancel from ${status}` }
  }
  return null
}

function buildStatusPatch(
  run: SimRunRow,
  commandType: "advance" | "pause" | "resume" | "cancel" | "queue",
): Record<string, unknown> {
  switch (commandType) {
    case "queue":
      return { status: "queued", blocked_reason: null, error_code: null }
    case "pause":
      return {
        status: "paused",
        lease_owner: null,
        lease_token: null,
        lease_expires_at: null,
      }
    case "resume":
      return {
        status: "queued",
        blocked_reason: null,
        error_code: null,
        error_message: null,
      }
    case "cancel":
      return { status: "cancel_requested" }
    case "advance":
      return {
        status: run.status === "paused" || run.status === "blocked" ? "queued" : run.status,
        blocked_reason: null,
      }
    default: {
      const _exhaustive: never = commandType
      return _exhaustive
    }
  }
}

export type TickResult = {
  run_id: string
  claimed: boolean
  reason?: string
  steps_applied: number
  run_status: string
  step_seq: number
  run_version: number
}

/**
 * Bounded worker tick: claim lease, process at most maxSteps foundation ops
 * from the active advance command. Unsupported domain units → blocked.
 */
export async function processWorkerTick(
  supabase: ServiceClient,
  options: {
    run_id?: string
    worker_id: string
    max_steps?: number
    lease_ms?: number
  },
): Promise<TickResult[]> {
  const results: TickResult[] = []
  const maxSteps = options.max_steps ?? 25

  let runIds: string[] = []
  if (options.run_id) {
    runIds = [options.run_id]
  } else {
    const { data } = await supabase
      .from("simulation_runs")
      .select("id")
      .in("status", ["queued", "running", "cancel_requested"])
      .order("updated_at", { ascending: true })
      .limit(5)
    runIds = (data ?? []).map((r) => r.id as string)
  }

  for (const runId of runIds) {
    const claimed = await claimViaPublicWrapper(
      supabase,
      runId,
      options.worker_id,
      options.lease_ms ?? 30000,
    )
    if (!claimed) {
      results.push({
        run_id: runId,
        claimed: false,
        reason: "LEASE_HELD_OR_NOT_RUNNABLE",
        steps_applied: 0,
        run_status: "unknown",
        step_seq: 0,
        run_version: 0,
      })
      continue
    }

    results.push(
      await driveRun(
        supabase,
        runId,
        claimed.lease_token,
        options.worker_id,
        maxSteps,
      ),
    )
  }

  return results
}

async function claimViaPublicWrapper(
  supabase: ServiceClient,
  runId: string,
  workerId: string,
  leaseMs: number,
): Promise<{ lease_token: string } | null> {
  const { data, error } = await supabase.rpc("sim_claim_run_lease", {
    p_run_id: runId,
    p_worker_id: workerId,
    p_lease_ms: leaseMs,
  })
  if (error) return null
  const row = Array.isArray(data) ? data[0] : data
  if (!row?.claimed) return null
  return { lease_token: row.lease_token as string }
}

async function driveRun(
  supabase: ServiceClient,
  runId: string,
  leaseToken: string,
  workerId: string,
  maxSteps: number,
): Promise<TickResult> {
  const run = await getRun(supabase, runId)
  let stepsApplied = 0
  let status = run.status
  let stepSeq = run.step_seq
  let runVersion = run.run_version

  if (status === "cancel_requested") {
    const applied = await applyFoundationStepRpc(supabase, {
      runId,
      leaseToken,
      operationKey: `cancel_ack:${run.step_seq}`,
      kind: "command_ack",
      commandId: run.active_command_id,
      output: { worker_id: workerId, action: "cancel" },
    })
    return {
      run_id: runId,
      claimed: true,
      steps_applied: applied.applied ? 1 : 0,
      run_status: applied.run_status,
      step_seq: applied.step_seq,
      run_version: applied.run_version,
      reason: applied.reason,
    }
  }

  const { data: cmd } = run.active_command_id
    ? await supabase
        .from("simulation_commands")
        .select("*")
        .eq("run_id", runId)
        .eq("command_id", run.active_command_id)
        .maybeSingle()
    : { data: null }

  const unit = (cmd?.unit as SimAdvanceUnit | null) ?? "foundation"
  const n = typeof cmd?.n === "number" && cmd.n > 0 ? Math.min(cmd.n, maxSteps) : 1

  if (unit !== "foundation") {
    const applied = await applyFoundationStepRpc(supabase, {
      runId,
      leaseToken,
      operationKey: `unsupported:${unit}:${run.step_seq}`,
      kind: `domain:${unit}`,
      commandId: run.active_command_id,
      output: { deferred: true, unit },
    })
    return {
      run_id: runId,
      claimed: true,
      steps_applied: 0,
      run_status: applied.run_status,
      step_seq: applied.step_seq,
      run_version: applied.run_version,
      reason: applied.reason,
    }
  }

  // Deterministic foundation checkpoints (no champion / season complete).
  let counters = (run.rng_counters ?? {}) as RngCounters
  for (let i = 0; i < n && stepsApplied < maxSteps; i++) {
    const bumped = bumpCounter(counters, "foundation")
    counters = bumped.next
    const prng = createSubstreamPrng(run.master_seed ?? "0", "foundation", bumped.counter)
    const noise = prng.nextUint64().toString(16)

    const operationKey = `foundation_checkpoint:${run.step_seq + stepsApplied + 1}`
    const applied = await applyFoundationStepRpc(supabase, {
      runId,
      leaseToken,
      operationKey,
      kind: "foundation_checkpoint",
      commandId: run.active_command_id,
      output: {
        worker_id: workerId,
        substream: "foundation",
        counter: bumped.counter,
        draw_hex: noise,
      },
    })

    status = applied.run_status
    stepSeq = applied.step_seq
    runVersion = applied.run_version
    if (!applied.applied) {
      return {
        run_id: runId,
        claimed: true,
        steps_applied: stepsApplied,
        run_status: status,
        step_seq: stepSeq,
        run_version: runVersion,
        reason: applied.reason,
      }
    }
    stepsApplied += 1

    await supabase
      .from("simulation_runs")
      .update({ rng_counters: counters, updated_at: new Date().toISOString() })
      .eq("id", runId)
      .eq("lease_token", leaseToken)
  }

  if (cmd && stepsApplied >= n) {
    await supabase
      .from("simulation_commands")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("run_id", runId)
      .eq("command_id", cmd.command_id)

    await supabase
      .from("simulation_runs")
      .update({
        active_command_id: null,
        // Stay queued/running-capable; never mark completed from foundation-only steps.
        status: status === "running" ? "paused" : status,
        lease_owner: null,
        lease_token: null,
        lease_expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", runId)
      .eq("lease_token", leaseToken)

    status = status === "running" ? "paused" : status
  }

  return {
    run_id: runId,
    claimed: true,
    steps_applied: stepsApplied,
    run_status: status,
    step_seq: stepSeq,
    run_version: runVersion,
  }
}

async function applyFoundationStepRpc(
  supabase: ServiceClient,
  args: {
    runId: string
    leaseToken: string
    operationKey: string
    kind: string
    commandId: string | null
    output: Record<string, unknown>
  },
): Promise<{
  applied: boolean
  step_seq: number
  run_version: number
  run_status: string
  reason: string
}> {
  const { data, error } = await supabase.rpc("sim_apply_foundation_step", {
    p_run_id: args.runId,
    p_lease_token: args.leaseToken,
    p_operation_key: args.operationKey,
    p_kind: args.kind,
    p_command_id: args.commandId,
    p_output: args.output,
    p_decision_source: "system",
  })
  if (error) {
    return {
      applied: false,
      step_seq: 0,
      run_version: 0,
      run_status: "failed",
      reason: error.message,
    }
  }
  const row = Array.isArray(data) ? data[0] : data
  return {
    applied: Boolean(row?.applied),
    step_seq: Number(row?.step_seq ?? 0),
    run_version: Number(row?.run_version ?? 0),
    run_status: String(row?.run_status ?? "unknown"),
    reason: String(row?.reason ?? ""),
  }
}

export function newCommandId(): string {
  return randomUUID()
}
