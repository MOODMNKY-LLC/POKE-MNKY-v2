export type SimRunStatus =
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

export type SimPhase =
  | "configured"
  | "draft"
  | "regular"
  | "playoffs"
  | "complete"

export type SimCommandType =
  | "queue"
  | "advance"
  | "pause"
  | "resume"
  | "cancel"

export type SimAdvanceUnit =
  | "foundation"
  | "pick"
  | "round"
  | "match"
  | "week"
  | "playoff_round"
  | "season"

export type SimRunRow = {
  id: string
  season_id: string | null
  owner_user_id: string | null
  status: string
  phase: string
  run_version: number
  step_seq: number
  event_seq: number
  master_seed: string | null
  rng_algorithm: string
  rng_algorithm_version: string
  rng_counters: Record<string, number>
  cursor: Record<string, unknown>
  config: Record<string, unknown>
  rules_snapshot: Record<string, unknown>
  config_frozen_at: string | null
  lease_owner: string | null
  lease_token: string | null
  lease_expires_at: string | null
  active_command_id: string | null
  blocked_reason: string | null
  error_code: string | null
  error_message: string | null
  started_at: string
  completed_at: string | null
  updated_at?: string
}

export type SimProgressResponse = {
  run_id: string
  season_id: string | null
  phase: string
  status: string
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

export type SimCommandAcceptResponse = {
  command_id: string
  run_id: string
  run_version: number
  expected_cursor: { step_seq: number }
  status: string
  replayed?: boolean
}
