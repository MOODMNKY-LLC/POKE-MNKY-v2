# provisional_demo_v0 — API contract (sanitized)

**Status:** In-repo contract for local disposable / future cleared disposable remote.  
**Not** production authorization. Flags default OFF.  
**Machine-readable shapes:** `docs/season-sim/FRONTEND-API-CONTRACT.v0.json` (v0 UI must consume this; do not invent routes).

## Auth

| Caller | Mechanism |
|---|---|
| Operator (Matt) | Session cookie + UUID on `SIM_DEMO_OPERATOR_ALLOWLIST` when gate ON. **League admin not required.** Allowlist does **not** grant other `/api/admin/*` league powers. |
| Gate OFF (dev only) | `requireLeagueAdmin` fallback |
| Worker | `x-simulation-worker-key` |
| Anon / non-allowlisted | 401/403; no public seed/reset |

## Endpoints

| Method | Path | Notes |
|---|---|---|
| POST | `/api/admin/simulation/runs` | Optional `schedule_weeks`, `playoff_size`, `team_count`, `total_rounds`, `master_seed` |
| GET | `/api/admin/simulation/runs/[id]` | `{ progress, draft, season }` |
| POST | `…/advance` | units: `pick`\|`round`\|`match`\|`week`\|`playoff_round`\|`season`\|`foundation` |
| POST | `…/pause` \| `…/resume` \| `…/cancel` | Lifecycle |
| POST | `…/reset` | Scoped UUID domain reset; bumps `domain_epoch` |
| POST | `/api/admin/simulation/worker/tick` | `max_steps≤50` |

## Units

1. Draft `pick`/`round` → paused `awaiting=schedule`
2. Season path → schedule → statistical results → standings → playoffs → champion → `completed`
3. Fidelity `statistical_seeded` only

## Kill switch

Unset `SIM_SANDBOX_V2` / `SIM_WORKER_TICK_ENABLED`; stop disposable stack; never touch prod.
