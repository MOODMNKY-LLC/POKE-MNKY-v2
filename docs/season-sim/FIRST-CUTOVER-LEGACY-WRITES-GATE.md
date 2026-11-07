# First cutover — legacy simulation writes gate (schema-independent)

**Status:** Prepared patch only. **Not** authorization to merge, deploy, apply SQL, or set flags.  
**Baseline:** production tip `ffd9d6dfd89fa03ac040841ec064cb2e372a8ca1` (`main` / #31).  
**Relationship to PR36:** Separate hotfix. Does **not** rewrite `135d45c` or the seven simulator SQL files.

## Outcome

With `SIM_LEGACY_SIMULATION_WRITES` unset/false (default):

- All supported **legacy simulation mutation** HTTP paths return **410** *before* auth DB work / service-role writes (including **n8n → `POST /api/admin/simulation/full-run`** via `SIMULATION_API_KEY`).
- `recordSimulationRun` / `updateSimulationRun` throw before constructing the service-role client.
- Mock Draft Demo CLI scripts (`seed|run|reset-mock-draft`) assert the same gate.
- **Unaffected:** `GET /api/admin/simulation/status`, ordinary league/admin/read paths, guides.

## Inventoried callers (production baseline)

| Path | Role |
|---|---|
| `POST /api/admin/simulation/seed` | mutation |
| `POST /api/admin/simulation/draft` | mutation |
| `POST /api/admin/simulation/schedule` | mutation |
| `POST /api/admin/simulation/playoffs` | mutation |
| `POST /api/admin/simulation/run-results` | mutation |
| `POST /api/admin/simulation/full-run` | mutation (+ n8n) |
| `POST /api/admin/simulation/reset` | mutation |
| `POST /api/draft/mock/run` | Mock Draft Demo mutation |
| `lib/league-simulation/simulation-engine.ts` `recordSimulationRun` / `updateSimulationRun` | shared writers |
| `scripts/seed-mock-draft.ts`, `run-mock-draft.ts`, `reset-mock-draft.ts` | CLI mutations |
| `lib/n8n/workflow-manager.ts` simulation workflow | **calls** full-run only (blocked at route) |
| `GET /api/admin/simulation/status` | **read — not gated** |

Older Mock Draft Demo mutation surface is accepted as disabled under this gate.

## Quiescence / rollout note (gate ≠ drain)

1. Deploying this app revision with the flag **unset** fail-closes **new** requests that hit gated entrypoints.
2. The gate **does not**:
   - cancel HTTP requests already past the check on older instances
   - drain n8n queue / cron already mid-flight
   - revoke `SIMULATION_API_KEY` or n8n credentials (out of scope; do not solve secret admin / n8n auth here)
3. Feasible verification after an **approved** deploy (coordinator-owned):
   - Confirm Vercel env: `SIM_LEGACY_SIMULATION_WRITES` absent or not truthy
   - `POST /api/admin/simulation/full-run` (with or without API key) → **410** + `LEGACY_SIM_WRITES_DISABLED`
   - `POST /api/admin/simulation/seed` (authenticated) → **410**
   - `GET /api/admin/simulation/status` still **200** for authorized admin/commissioner
   - Optional: observe n8n workflow executions fail on 410 (requires n8n UI/API access — external)
4. Keep flag **off** through seven-SQL apply window unless a separate emergency approval sets it.

## Out of scope / external blockers

- Production merge/deploy/SQL apply/flag enable
- n8n credential rotation / workflow deactivation (needs n8n API/UI access)
- Proving zero in-flight requests without Vercel/log access at cutover time
- PR36 simulator stack / seven SQL content
