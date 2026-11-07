# provisional_demo_v0 — API contract (sanitized)

**Status:** In-repo contract for local disposable / future cleared disposable remote.  
**Not** production authorization. Flags default OFF.

## Auth

| Caller | Mechanism |
|---|---|
| Operator (Matt) | Session cookie; league admin **and** (when gate on) `SIM_DEMO_OPERATOR_ALLOWLIST` |
| Worker | `x-simulation-worker-key: <SIMULATION_WORKER_KEY>` |
| Anon / non-allowlisted | 401/403 on mutations; no public seed/reset |

## Endpoints

| Method | Path | Unit / body notes |
|---|---|---|
| POST | `/api/admin/simulation/runs` | Create sandbox season + run; synthetic seats; optional `schedule_weeks`, `playoff_size`, `team_count`, `total_rounds`, `master_seed` |
| GET | `/api/admin/simulation/runs/[id]` | `progress` + `draft` + `season` evidence |
| POST | `/api/admin/simulation/runs/[id]/advance` | `{ command_id, unit, n, expected_step_seq, expected_run_version }` — units: `pick`\|`round`\|`match`\|`week`\|`playoff_round`\|`season`\|`foundation` |
| POST | `/api/admin/simulation/runs/[id]/pause` \| `resume` \| `cancel` | Lifecycle |
| POST | `/api/admin/simulation/runs/[id]/reset` | Scoped UUID domain reset (sim_* only); bumps `domain_epoch` |
| POST | `/api/admin/simulation/worker/tick` | `{ run_id, worker_id, max_steps≤50 }` — lease claim + apply |

## Units (provisional)

1. **Draft:** `pick` / `round` → on last pick: `paused`, `cursor.draft_complete=true`, `awaiting=schedule`
2. **Season path:** `match` / `week` / `playoff_round` / `season` → schedule seed → statistical results → standings → playoffs → `sim_season_outcomes` champion → `completed` / `phase=complete`
3. **Fidelity:** `statistical_seeded` only; `showdown_battle` → blocked

## Labels

- `rules_version`: `provisional_demo_v0`
- Draft rosters ≠ battle sets
- Paid inference OFF; no Discord/email/sheet side effects on sandbox

## Kill switch

Unset `SIM_SANDBOX_V2` / `SIM_WORKER_TICK_ENABLED`; stop disposable stack; never touch prod.
