# Pending simulator-only migration manifest (PR36)

**Status:** Plan artifact for an *approved* future apply — **NOT** authorization to migrate, enable flags, deploy, or write production.  
**Inventory basis:** sanitized read-only prod inventory 2026-11-07 (~12:33–12:40 ICT). Re-compare if tip/SQL changes.  
**Guard fix:** `SEASON_SIM_PG_URL` query-host bypass closed in-repo (`pg-disposable-target` + Client from validated fields only).  
**Rehearsal:** ordered migration rehearsal on a disposable **restored** schema with the **actual** admin helper is **explicitly NOT performed / unverified**. Do not treat CI disposable bootstrap as that rehearsal.  
**Backup logs:** prior full restore logs were deleted with disposable workdirs; do **not** claim retained full restore logs. Peer-reported Mac snapshot / row-count summary only.  
**Legacy compatibility (app-side, seven SQL unchanged):** `ensureMockDraftDemoSandboxSeason` **never converts** an existing nonsandbox/`current`/`live`/`sheet` season and **never clears live flags** (name-only read→UPDATE by id removed). Supported path: **reuse** a single already-sandbox clean demo row, or **create** when no name match exists; otherwise **fail closed**. Attach trigger / claim / step / reset against genuine nonsandbox seasons stay intact. No writer retirement inferred. **No SQL content change → no rehash of the seven-file table below; no changed-migration / scoped-rollback rehearsal beyond existing §5.** Historical GitGuardian remains a separate release-path gate when required.

**Legacy-writer quiescence (schema → compatible-app window):** `SIM_SANDBOX_V2` / worker flags **OFF** do **not** disable old `/api/admin/simulation/{seed,draft,…}` writers — only `SIM_LEGACY_SIMULATION_WRITES` (default off → HTTP 410) does. After #1–#7 apply, a historical nonsandbox row still named `Mock Draft Demo` is **not** auto-promoted; enabling legacy writes against it fails closed until a dedicated sandbox demo exists (create-only when the name is free, or ops-owned rename outside this document). §5 policy rollback restores legacy RLS posture on `simulation_runs` but **does not** remove `is_sandbox` / attach triggers / sandbox CHECKs — treat constraint/trigger presence as sticky across policy rollback.

---

## 0. Exact target identities (from inventory — verify again at apply)

| Field | Value |
|---|---|
| Supabase project | `chmrszrwlfeqovwxyrmt` (`poke-mnky-db`) |
| Applied migration records | **198**; latest **`20261102150000`** (`team_rosters_realtime_publication`) |
| Pending simulator SQL versions in repo vs ledger | **exactly seven** (none unrelated found in that comparison) |
| Prod Vercel project / team | `prj_vaC0p4lYOlmn16tMUMaVnWFB7rhz` / `team_4VdnVxvnFkQg6uxXYa1mNpsN` |
| Latest READY production deployment (API) | `dpl_9UQXDDXhVgrmnjCkzAQmxoT3Mxkx` · app SHA **`ffd9d6dfd89fa03ac040841ec064cb2e372a8ca1`** (#31) |
| Custom-domain alias | **not independently verified** — READY record ≠ proven live alias |
| Admin helper (installed) | `user_has_role_or_higher` — SECURITY DEFINER, `search_path=public,extensions,pg_temp`; hierarchy **admin=4 / commissioner=3 / coach=2 / spectator=1**; **commissioner is NOT admin threshold** |
| Realtime | App publication has `draft_pool`, `draft_sessions`, `team_rosters`, `draft_budgets` — **none** of the 12 sim tables |
| DB writers matching sim identifiers | None found via narrow identifier regex (does **not** prove absence of dynamic/external writers) |

---

## 1. Live affected state (why apply is not “create-only”)

| Object | Live state |
|---|---|
| `public.simulation_runs` | **Exists** (owner `postgres`). RLS **ON**, FORCE **OFF**. Legacy columns: `id, season_id, status, started_at, completed_at, config, error_message, created_at`. Authenticated **SELECT/INSERT/UPDATE/DELETE**. **Four** permissive admin policies (see §5). |
| Other 11 inventoried sim tables | **Absent** |
| Public `sim_*` mutation RPCs / new helpers | **Absent** |
| `public.seasons.is_sandbox` | **Absent** — migration #1 adds `NOT NULL DEFAULT false` + index/constraint/trigger (**alters shared `seasons`**) |

Foundation (#2–#3) **alters** legacy `simulation_runs` (columns/defaults/FKs/status check/sandbox trigger) and creates children — not greenfield-only. Final #7 drops **ALL** policies on the 12 tables (including the legacy four), revokes authenticated DML, sets **FORCE RLS**.

Capture / preserve pre-apply inventories: `tables-before.json`, `functions-before.json` (actual helper ACL), `pg_policies` for `simulation_runs`. **Flags-off / prior app alone cannot restore dropped policies.**

---

## 2. Ordered apply set (seven files only)

Approve **these exact files and content hashes**. Never blanket-push unrelated pending migrations.

| # | Version / file | SHA-256 | Notes vs live |
|---|---|---|---|
| 1 | `20261106130021_season_sim_sandbox_isolation.sql` | `7bb2f60f6b12f41c9a89b48aa1b996ae9b90e8eed5f9f2104bf90fdf689095c1` | Adds `seasons.is_sandbox` |
| 2 | `20261106130022_season_sim_run_foundation.sql` | `81e39c890eadcaf4f2098864159d8a30f89c8975e9837779e4cb058bc56f628b` | Alters legacy `simulation_runs`; creates children |
| 3 | `20261106132402_season_sim_foundation_hardening.sql` | `51fe69179591d09bd8656891595bddb81d21c4d65b74ac5d2461d92023c4db18` | Replaces legacy 4 policies with admin select/write; lease RPCs |
| 4 | `20261107023900_season_sim_draft_domain.sql` | `7bb65161dc1d73688565519d6d455a4f7a30dfe3d18fa1a199fb4a6228b4c149` | Draft tables + pick RPC |
| 5 | `20261107025000_season_sim_foundation_cursor_preserve.sql` | `674ec0c2663d7f46a56c0a0a24bfed45872e34ac54da9dce65f3cb4a187788da` | Cursor preserve |
| 6 | `20261107033000_season_sim_season_path.sql` | `dd716161adc2187949f23db38d587006330f54ade4cbdfda9a72af4340c9e135` | Matches/standings/outcomes + reset |
| 7 | `20261107045000_season_sim_shared_db_rls_harden.sql` | `e64abf127456eb02911ba73a749633c7aeb9a9a20213128986b780d53031a849` | Drop ALL policies; FORCE RLS; owner/admin SELECT; service_role-only mutation EXECUTE |

Re-hash after any SQL edit:

```bash
sha256sum supabase/migrations/20261106130021_season_sim_sandbox_isolation.sql \
  supabase/migrations/20261106130022_season_sim_run_foundation.sql \
  supabase/migrations/20261106132402_season_sim_foundation_hardening.sql \
  supabase/migrations/20261107023900_season_sim_draft_domain.sql \
  supabase/migrations/20261107025000_season_sim_foundation_cursor_preserve.sql \
  supabase/migrations/20261107033000_season_sim_season_path.sql \
  supabase/migrations/20261107045000_season_sim_shared_db_rls_harden.sql
```

If a version is already in remote `schema_migrations`, skip that file. On this inventory, **all seven are absent**.

**Do not leave production on intermediate foundation policies (#3) as a released state** without an explicit ops decision — plan for a single approved window that reaches #7, or an approved abort that restores §5 legacy posture on `simulation_runs`.

---

## 3. Transaction / locking / abort plan (operator-approved before apply)

**Not a lock-window guarantee.** Inventory sampled **no** relation locks on `seasons` / `simulation_runs` at that moment only.

### 3.1 Session guards (recommended)

```sql
-- Session-local; tune with approver. Abort rather than wait unboundedly.
SET lock_timeout = '5s';
SET statement_timeout = '120s';
SET idle_in_transaction_session_timeout = '60s';
```

### 3.2 Expected lock classes (illustrative)

| Step | Objects | Typical lock impact |
|---|---|---|
| #1 `is_sandbox` | `seasons` | `ALTER TABLE` → ACCESS EXCLUSIVE; constraint/index work scans rows |
| #2–#3 foundation | `simulation_runs` (+ new children) | ACCESS EXCLUSIVE on alters; CREATE INDEX blocks writers; status-check replace scans rows |
| #4–#6 | new tables / RPCs | Mostly CREATE; lower contention if no concurrent writers to new names |
| #7 harden | 12 tables (only existing ones when partially applied) | Policy drop/create + FORCE RLS → AccessExclusive-class relation locks |

**No concurrent-index substitution** without reviewed revised SQL. Prefer low-traffic window.

### 3.3 Apply strategy (choose one; document in approval)

**A — Single migration client session (preferred if tooling allows):** apply #1→#7 in one controlled session with timeouts; on any error **ABORT** that session’s open transaction if the tool wraps each file in a transaction, then execute **§5 scoped rollback** for any committed files (Supabase CLI typically records each file separately — treat each file as its own commit boundary unless ops uses a wrapping transaction tool).

**B — File-at-a-time with abort checklist:** after each successful file, verify `schema_migrations` head; on failure at file *k*:

1. Stop; do not continue to *k+1*
2. If *k* ≥ 1 and `seasons.is_sandbox` exists / `simulation_runs` policies changed: run **§5** (and any additional approved downs for committed intermediate files)
3. Record failed version, error, and locks observed

**Ledger recording:** confirm with ops whether each file is one `schema_migrations` insert (usual) vs a wrapping multi-file transaction (unusual). **Do not invent a multi-file atomic apply** without approved tooling.

### 3.4 Abort triggers

- `lock_timeout` / `statement_timeout` / deadlock
- Preflight in #7: `SIM_RLS_POLICY_RECONCILE_FAILED`
- Unexpected missing prerequisite (e.g. `user_has_role_or_higher` ACL/definition mismatch vs inventory)
- Any unapproved object outside the seven-file set

---

## 4. Prerequisites before #1

1. Read-only reconfirm: 198 migrations, head `20261102150000`, seven pending versions still absent  
2. Reconfirm `simulation_runs` four policies + grants + RLS ON / FORCE OFF match `tables-before.json`  
3. Reconfirm actual `user_has_role_or_higher` (admin threshold **excludes** commissioner)  
4. Effective app config: simulator flags/worker/cron **disabled** (DB metadata cannot prove this)  
5. Approved backup attestation on Mac (summary only here; **full restore logs not retained**)  
6. **Restored-schema ordered rehearsal still unverified** — remaining gate before apply  

---

## 5. Scoped rollback — legacy `simulation_runs` only (no data drop)

**Purpose:** restore **pre-#1 / inventory** posture on the **existing** legacy table after a failed or aborted apply that changed its policies/grants/FORCE.  

**Does NOT:** `DROP TABLE`, truncate rows, delete seasons, or blanket-drop the new 11 tables (those may be left in place empty; dropping them is a separate approved decision).  

**Does NOT:** claim that disabling flags or redeploying `ffd9d6d` restores policies.

Executable companion: `docs/season-sim/ROLLBACK-scoped-legacy-simulation-runs.md`  
Source of policy text: live inventory ≡ authored in `20261029030000_security_tier2_rls_remaining_public_tables.sql` (four named policies). Prefer captured `tables-before.json` if it differs.

If abort occurs **after** #3’s “admins select/write simulation_runs” replacement but **before** #7, still use §5 to return to the **four** inventory policies (not leave the intermediate two-policy shape) unless ops explicitly accepts foundation hardening as the rollback target.

If new child tables (#2–#6) were created and must be removed, that requires a **separate** approved down (not this scoped script).

---

## 6. Evidence honesty

| Claim | Status |
|---|---|
| Query `?host=` / parser override bypass closed | In-repo guard + no-connect regressions |
| Disposable CI / local PG + HTTP + browser | Separate evidence; not prod apply |
| HTTP **83/83** on browser stack | Includes **explicit skip** of short-TTL expiry suite (`RS-40plus_expiry_suite_skipped`); **not** exhaustive expiry proof |
| Persona isolation | SET ROLE + JWT + HTTP 403 — **not** suite pass counts alone |
| Restored-schema ordered rehearsal | **Not performed / unverified** |
| Full restore logs retained | **No** (deleted with disposable dirs) |
| Live apply / flags / deploy / merge | **Not authorized by this document** |
| Seven SQL rehash after tip compat work | **Not required** — SQL files unchanged; app-only Mock Draft Demo resolve (reuse/create/refuse) + nonsandbox claim/step/reset denial probe |
| Nonsandbox-linked run mutation denial (claim/step/reset) | Disposable PG probe (`nonsandbox-run-mutation-denial.pg.test.ts`); accepted; not a restored-schema rehearsal substitute |
| Name-match conversion / live-flag clear | **Removed** — focused unit refusals (`mock-draft-demo-season.test.ts`) prove no `seasons` UPDATE on ambiguity/current/live/sheet/association/nonsandbox/race class |
