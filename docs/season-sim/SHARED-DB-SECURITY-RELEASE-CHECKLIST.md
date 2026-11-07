# Shared-DB security release checklist (plan / tests only)

**Status:** Plan + in-repo evidence requirements — **NOT** authorization to apply migrations, enable flags, seed live Auth, or write production data.  
**Hosting decision (ops):** reuse existing Supabase project `poke-mnky-db` with a **strictly guarded sandbox**, not a new project. Isolation is **shared-DB**, not disposable remote.  
**Backup verification:** researched separately — out of scope here.  
**PR33 GG red:** GROK-owned; tip green **must not** bypass required red on foundation. Focus on implementation/evidence, not historical disposition.

---

## 0. Hold line (until exact plan approved)

| Action | Allowed now? |
|---|---|
| Author additive migrations / RLS / bounds / tests in git | Yes |
| Apply migrations to production / linked remote | **No** |
| Enable `SIM_SANDBOX_V2` / `SIM_WORKER_TICK_ENABLED` on prod Vercel | **No** |
| Seed disposable Auth users / public demo JWTs / rotate prod keys | **No** |
| Discord / email / sheet / cron sandbox processing | **No** |
| Live Matt enablement before HTTPS cookie/CSRF verification | **No** |

---

## 1. Target identity (fill before any apply)

| Field | Value | Notes |
|---|---|---|
| Supabase project ref | `_TBD — ops confirm_` | Must match intended shared DB |
| Deployed app SHA (prior) | `_TBD — `git rev-parse` of last prod deploy_` | Rollback target |
| Applied migration history head | `_TBD — `supabase migration list --linked`_` | Capture before apply |
| Proposed migration files (ordered) | See §4 | Additive only; flags remain OFF |
| Reviewer / approver | GROK + human ops | Written approval required |

---

## 2. Schema / RPC audit (must be covered in plan + tests)

### 2.1 Tables & FKs (sim domain)

- [ ] `simulation_runs` → `seasons(id)`; unique `(id, season_id)`; trigger requires `is_sandbox`
- [ ] Child tables composite FK → `(run_id, season_id)` on `simulation_runs`
- [ ] `sim_bot_seats`, `sim_draft_*`, `sim_matches`, `sim_standings`, `sim_season_outcomes`
- [ ] No FK from sim domain into live `matches` / live results / live standings
- [ ] `sim_reset_run_domain` deletes **only** sim domain rows for `p_run_id` (append-only evidence retained)

### 2.2 SECURITY DEFINER — `search_path` / owner / EXECUTE

| Function | search_path | EXECUTE | Sandbox gate |
|---|---|---|---|
| `sim_private.claim_run_lease` | `public, sim_private` | `service_role` | `is_sandbox_season` |
| `public.sim_claim_run_lease` | wrapper | `service_role` | via private |
| `sim_private.apply_foundation_step` | `public, sim_private` | `service_role` | yes |
| `public.sim_apply_foundation_step` | wrapper | `service_role` | via private |
| `sim_private.apply_draft_pick` | `public, sim_private, pg_temp` | `service_role` | yes |
| `public.sim_apply_draft_pick` | wrapper | `service_role` | via private |
| `public.sim_reset_run_domain` | `public, pg_temp` | `service_role` | `is_sandbox` check |
| `public.is_sandbox_season` | `public` | `authenticated, service_role` | n/a (helper) |
| `public.sim_run_owned_by_caller` | `public, pg_temp` (INVOKER) | `authenticated, service_role` | n/a |
| `public.sim_run_readable_by_caller` | `public, pg_temp` (INVOKER) | `authenticated, service_role` | n/a |

**Tests must assert:** `anon` / `authenticated` cannot EXECUTE mutation RPCs; DEFINER functions keep pinned `search_path` (no mutable `public` alone without `pg_temp` where applicable).

### 2.3 RLS — direct REST + RPC personas

| Persona | PostgREST SELECT sim_* | PostgREST INSERT/UPDATE/DELETE | Mutation RPC |
|---|---|---|---|
| `anon` | deny | deny | deny |
| authenticated outsider (not owner, not admin) | deny | deny | deny |
| allowlisted spectator (not owner, not admin) | deny (DB); app 403 | deny | deny |
| owner (Matt allowlist + owns run) | own rows only | deny (API uses service_role) | deny direct; API OK |
| league admin | select via admin helper | deny direct writes | deny direct |
| `service_role` (API/worker) | bypass RLS | allowed; **app must still assert sandbox + ownership** | allowed |

Migration: `20261107045000_season_sim_shared_db_rls_harden.sql` (authored; **unapplied**).

### 2.4 Owner-scoped app surfaces (despite service-role bypass)

- [ ] list / GET / export evidence — owner or admin
- [ ] advance / pause / resume / cancel / reset — owner or admin
- [ ] owner tick `POST …/runs/[id]/tick` — secret stays server-only; ownership enforced
- [ ] realtime subscriptions (if any) — owner filter; no broadcast of other operators’ runs
- [ ] worker `processWorkerTick` — explicit `assertSeasonIsSandbox` before claim; skip non-sandbox candidates; clamp steps/lease/concurrency

### 2.5 Side effects

- [ ] `shouldEmitLiveSideEffectsForSeason` → false for sandbox
- [ ] No Discord / email / sheet events from sandbox path
- [ ] No cron job processes sandbox runs while flags OFF; when ON, cron must use same sandbox assertions

---

## 3. Non-interference / fencing tests (required evidence)

Use **realistic non-sandbox fixtures** with **immutable sentinels** (checksum or frozen JSON), not empty stubs alone.

| Sentinel | Assert after full-season + reset + concurrent claim/retry |
|---|---|
| Live `seasons` current row | unchanged (`is_current`, name, flags) |
| Live `teams` for current season | unchanged |
| Live matches / results / standings (fixture tables mirroring prod shapes) | unchanged |
| League settings row | unchanged |
| Sibling sandbox run domain | unchanged when resetting another run |

Also cover:

- [ ] Concurrent `sim_claim_run_lease` fencing (exactly one winner)
- [ ] Reset + replay `domain_epoch` / operation_key isolation
- [ ] Retry of same command is idempotent; does not touch live tables

In-repo: `lib/season-sim/shared-db-rls.pg.test.ts` (SET ROLE + JWT personas), `lib/season-sim/noninterference.pg.test.ts` (prefixed sentinel tables only).

**Harness safety:** all season-sim PG suites require `SEASON_SIM_PG_URL` → loopback + disposable DB name marker. **No** `POSTGRES_URL` / `DATABASE_URL` fallback (`lib/season-sim/pg-disposable-target.ts`). Hosted/prod hostnames rejected without connecting.

**Do not treat raw PG suite pass counts as proven persona isolation** unless the SET ROLE cases above are green.

---

## 4. Migration plan (ordered, additive, flags OFF)

**Order (schema before any unconditional `is_sandbox` app code that assumes columns):**

1. Already on stack (prior PRs): isolation → foundation → hardening → draft → cursor preserve → season path  
2. **This PR:** `20261107045000_season_sim_shared_db_rls_harden.sql` — revoke authenticated DML; owner/admin SELECT; re-assert RPC EXECUTE  
3. Defaults / locks / backfills: none required for empty sim tables; if prod already has broad admin write policies, harden migration drops/replaces them **additively**  
4. App deploy with flags **OFF** first; only after RLS evidence + approval, consider flag enablement as a **separate** change  
5. Current-prod compatibility: live seasons without `is_sandbox` treated fail-closed for sandbox writes; live reads filter sandbox out

**Rollback (feature/worker off + prior app):**

1. Unset `SIM_SANDBOX_V2`, `SIM_WORKER_TICK_ENABLED`, clear allowlist if needed  
2. Redeploy prior app SHA  
3. **Do not** drop sim schema; **do not** improvise live restore from sandbox rows  
4. Schema leave-in-place is acceptable; RLS harden can remain (strictest posture)

---

## 5. Resource bounds (shared Postgres)

| Cap | Value |
|---|---|
| `team_count` hard max (create) | 12 |
| `schedule_weeks` | ≤ 18 |
| `playoff_size` | ≤ 8 |
| Estimated regular matches | ≤ 216 |
| Steps / tick | ≤ 50 (default 25) |
| Wall ms / tick (config) | ≤ 15_000 (default 5_000) |
| Runs claimed / tick | ≤ 5 (default 3) |
| Lease ms | ≤ 60_000 |

Enforced in `lib/season-sim/config.ts` (`assertSharedDbResourceBounds`, `clampWorkerTickOptions`).

---

## 6. Auth / Matt enablement (later — not now)

- Existing production Auth/keys remain **untouched**
- **No** disposable fixture users in live Auth  
- **No** public demo JWTs / signing-secret rotation for demo  
- Real least-privilege Matt identity via **established** auth path only  
- Before enablement: verify exact HTTPS cookies, refresh, origin, CSRF on the intended host  
- Gate: `SIM_DEMO_OPERATOR_GATE` + `SIM_DEMO_OPERATOR_ALLOWLIST` (UUID); allowlist ≠ league admin

Demo UI route: `/demo/season-sim` (not full admin chrome). APIs remain allowlist-gated.

---

## 7. CI / required checks

- [ ] All listed season-sim jobs **genuinely execute** (no skip counted as pass when URL provided)  
- [ ] Stacked tip green **cannot** satisfy required status that is red on PR33 foundation  
- [ ] Workflow triggers include stacked bases + this tip branch so jobs actually run  
- [ ] Evidence artifacts sanitized (no secrets, no JWTs, no allowlist identities)

---

## 8. Approval gate

Live writes (migrate / seed / flag enable / Matt prod access) require:

1. This checklist filled with target ref + SHA + migration history  
2. RLS + noninterference tests green on disposable PG  
3. GROK + human written approval of **this exact plan**  
4. Rollback rehearsal understood (§4)

Until then: **hold all live writes.**
