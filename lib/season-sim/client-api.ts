/**
 * Same-origin client for Season Simulator v2 endpoints.
 * Auth is the existing session cookie (credentials: 'include').
 * Operator ticks use owner-scoped /runs/[id]/tick — never the worker secret.
 */

export type RunPhase = "configured" | "draft" | "regular" | "playoffs" | "complete"

export type RunStatus =
  | "configured"
  | "queued"
  | "running"
  | "paused"
  | "blocked"
  | "cancel_requested"
  | "cancelled"
  | "failed"
  | "completed"
  | "archived"

export interface Progress {
  run_id: string
  season_id: string | null
  phase: RunPhase
  status: RunStatus
  step_seq: number
  event_seq: number
  run_version: number
  seed_frozen: boolean
  active_command_id: string | null
  blocked_reason: string | null
  error_code: string | null
  error_message: string | null
  cursor: Record<string, unknown>
  config: Record<string, unknown>
}

export interface DraftBudget {
  team_id: string
  total_points: number
  spent_points: number
  remaining_points: number
}

export interface DraftPick {
  pick_number: number
  round: number
  team_id: string
  pokemon_name: string
  point_value: number
  step_seq: number
  decision_id: string | null
}

export interface DraftDecision {
  step_seq: number | null
  source: string
  answer: unknown
}

export interface DraftEvidence {
  pool_available: number
  pool_drafted: number
  pick_count: number
  total_picks_expected: number
  budgets: DraftBudget[]
  roster_picks: DraftPick[]
  decisions: DraftDecision[]
  cursor_pick_number: number
  cursor_agrees_with_picks: boolean
  decisions_agree_with_picks: boolean
}

export interface StandingRow {
  team_id: string
  wins: number
  losses: number
  differential: number
  seed: number | null
  display_name?: string | null
}

export interface SeatRow {
  team_id: string
  seat_index: number
  display_name: string
}

export interface MatchRow {
  id: string
  week: number
  match_index: number
  team1_id: string
  team2_id: string
  team1_name: string | null
  team2_name: string | null
  winner_id: string | null
  team1_score: number | null
  team2_score: number | null
  differential: number | null
  status: string
  is_playoff: boolean
  playoff_round: number | null
  fidelity: string | null
}

export interface SeasonEvidence {
  match_total: number
  match_completed: number
  match_scheduled: number
  regular_completed: number
  playoff_completed: number
  standings: StandingRow[]
  seats?: SeatRow[]
  matches?: MatchRow[]
  champion_team_id: string | null
  champion_display_name?: string | null
  fidelity: string | null
  disclaimer: string | null
}

export interface RunDetail {
  progress: Progress
  draft: DraftEvidence
  season: SeasonEvidence
}

export type SelectorDraft = "random" | "heuristic"

export interface CreateRunBody {
  master_seed?: string
  team_count?: number
  total_rounds?: number
  budget_total?: number
  schedule_weeks?: number
  playoff_size?: number
  selector_draft?: SelectorDraft
  queue_immediately?: boolean
}

export interface CreateRunResponse {
  run: Progress
  season_id: string
  team_ids: string[]
  rules_label: "provisional_demo_v0"
  note: string
}

export type AdvanceUnit =
  | "pick"
  | "round"
  | "match"
  | "week"
  | "playoff_round"
  | "season"

export const DRAFT_UNITS: AdvanceUnit[] = ["pick", "round"]
export const SEASON_UNITS: AdvanceUnit[] = [
  "match",
  "week",
  "playoff_round",
  "season",
]

export interface CommandAccepted {
  command_id: string
  run_id: string
  run_version: number
  expected_cursor: { step_seq: number }
  status: string
  replayed?: boolean
}

export type ControlAction = "pause" | "resume" | "cancel"

export interface ResetResponse {
  ok: boolean
  reason: "DOMAIN_RESET"
  run_id: string
  status: string
  phase?: string
  note: string
}

export interface OperatorTickResponse {
  ok: boolean
  run_id: string
  worker_id: string
  results: unknown
  note?: string
}

export interface ApiSuccess<T> {
  ok: true
  status: number
  data: T
}

export interface ApiFailure {
  ok: false
  status: number
  code: string | null
  error: string
}

export type ApiResult<T> = ApiSuccess<T> | ApiFailure

export const SANDBOX_DISABLED_CODE = "SIM_SANDBOX_V2_DISABLED"
export const WORKER_TICK_DISABLED_CODE = "SIM_WORKER_TICK_DISABLED"

const BASE = "/api/admin/simulation"

async function request<T>(
  path: string,
  init: { method: "GET" | "POST"; body?: unknown },
): Promise<ApiResult<T>> {
  try {
    const hasBody = init.body !== undefined
    const res = await fetch(`${BASE}${path}`, {
      method: init.method,
      credentials: "include",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(hasBody ? { "Content-Type": "application/json" } : {}),
      },
      body: hasBody ? JSON.stringify(init.body) : undefined,
    })

    let json: unknown = null
    try {
      json = await res.json()
    } catch {
      json = null
    }

    if (res.ok) {
      return { ok: true, status: res.status, data: json as T }
    }

    const body = (json ?? {}) as { error?: unknown; code?: unknown }
    return {
      ok: false,
      status: res.status,
      code: typeof body.code === "string" ? body.code : null,
      error:
        typeof body.error === "string" && body.error
          ? body.error
          : res.statusText || `Request failed (HTTP ${res.status})`,
    }
  } catch (err) {
    return {
      ok: false,
      status: 0,
      code: "NETWORK_ERROR",
      error: err instanceof Error ? err.message : "Network request failed",
    }
  }
}

const runPath = (runId: string) => `/runs/${encodeURIComponent(runId)}`

export function createRun(body: CreateRunBody) {
  return request<CreateRunResponse>("/runs", { method: "POST", body })
}

export function getRun(runId: string) {
  return request<RunDetail>(runPath(runId), { method: "GET" })
}

function guard(progress: Progress) {
  return {
    command_id: crypto.randomUUID(),
    expected_step_seq: progress.step_seq,
    expected_run_version: progress.run_version,
  }
}

export function advanceRun(progress: Progress, unit: AdvanceUnit, n: number) {
  return request<CommandAccepted>(`${runPath(progress.run_id)}/advance`, {
    method: "POST",
    body: { ...guard(progress), unit, n },
  })
}

export function controlRun(progress: Progress, action: ControlAction) {
  return request<CommandAccepted>(`${runPath(progress.run_id)}/${action}`, {
    method: "POST",
    body: guard(progress),
  })
}

export function resetRun(runId: string) {
  return request<ResetResponse>(`${runPath(runId)}/reset`, { method: "POST" })
}

/** Owner-scoped operator tick (server holds worker secret). */
export function operatorTick(runId: string, maxSteps = 25) {
  return request<OperatorTickResponse>(`${runPath(runId)}/tick`, {
    method: "POST",
    body: {
      worker_id: `ui-${crypto.randomUUID().slice(0, 8)}`,
      max_steps: maxSteps,
    },
  })
}

/** @deprecated Prefer operatorTick — kept as alias for console hook. */
export function workerTick(runId: string, maxSteps = 25) {
  return operatorTick(runId, maxSteps)
}

export type AccessIssue = "disabled" | "unauthorized"

export function classifyAccess(failure: ApiFailure): AccessIssue | null {
  if (failure.status === 503 && failure.code === SANDBOX_DISABLED_CODE)
    return "disabled"
  if (failure.status === 401 || failure.status === 403) return "unauthorized"
  return null
}

export const isStale = (failure: ApiFailure) => failure.status === 409

export function teamLabel(
  teamId: string,
  seats?: SeatRow[] | null,
  standings?: StandingRow[] | null,
): string {
  const fromSeat = seats?.find((s) => s.team_id === teamId)?.display_name
  if (fromSeat) return fromSeat
  const fromStanding = standings?.find((s) => s.team_id === teamId)?.display_name
  if (fromStanding) return fromStanding
  return `Team ${teamId.slice(0, 6)}`
}

export const shortRunId = (runId: string) => runId.slice(0, 8)

export function cursorFlag(progress: Progress, key: string): boolean {
  return progress.cursor[key] === true
}

export function cursorText(progress: Progress, key: string): string | null {
  const value = progress.cursor[key]
  return typeof value === "string" && value ? value : null
}

export function configValue(progress: Progress, key: string): string | null {
  const value = progress.config[key]
  if (value === undefined || value === null || value === "") return null
  return String(value)
}

export function randomSeed(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
}

const LAST_RUN_KEY = "season-sim-v2:last-run-id"

export function loadLastRunId(): string | null {
  try {
    return window.localStorage.getItem(LAST_RUN_KEY)
  } catch {
    return null
  }
}

export function saveLastRunId(runId: string) {
  try {
    window.localStorage.setItem(LAST_RUN_KEY, runId)
  } catch {
    // storage unavailable
  }
}
