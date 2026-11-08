# Simulator rollout plan (t108u preflight — no prod mutations)

**Prepared:** release branch `cursor/season-sim-release-preflight-2199` on main `2743893` (#40).  
**Not authorized here:** merge, deploy, SQL apply, flag flip, Vercel env writes.

## Authoritative stack (do not rewrite historical PR tips)

| Ref | Tip | Role |
|---|---|---|
| `main` | `2743893` | Live app+DB path; PR37 gate + PR39/40 replay |
| PR36 tip (preserved) | `135d45c` | Fail-closed Mock Draft Demo resolve; E2E evidence lineage via `4550bda`/`794360a` |
| PR33–35 | stacked under 36 | Still open; **CONFLICTING** vs modern main — use **this** rebased release PR instead of merging old stack onto main |
| PR40 | merged | Do not modify its branch; replay flags stay false |

## Feature gates (keep false until post-schema verify)

| Gate | Default | Meaning |
|---|---|---|
| `SIM_LEGACY_SIMULATION_WRITES` | **false** (PR37 live) | Old Mock Draft Demo /admin/simulation mutations + engine writers → 410 |
| `SIM_SANDBOX_V2` | false | New simulator HTTP APIs |
| `SIM_WORKER_TICK_ENABLED` | false | Worker tick |
| Replay feature flags | false | Unrelated; leave alone |

## Exact seven SQL (content hashes unchanged; versions retimed)

After DB head `20261108014024`:

1. `20261108150121` … hash `7bb2f60f…095c1`
2. `20261108150122` … hash `81e39c89…628b`
3. `20261108150123` … hash `51fe6917…db18`
4. `20261108150239` … hash `7bb65161…c149`
5. `20261108150250` … hash `674ec0c2…88da`
6. `20261108150330` … hash `dd716161…0e135`
7. `20261108150450` … hash `c45e146d…1e9d` (ACL wipe fix; was `e64abf12…1a849`)

Replay files `20261107102017` / `20261108014024` must remain applied; **do not revert**.

## Feature / worker semantics (user-facing)

| Flag | Off (required until post-schema verify) | On (coordinator-only later) |
|---|---|---|
| `SIM_LEGACY_SIMULATION_WRITES` | Legacy Mock Demo routes + `recordSimulationRun` → **410**; name reset permanently retired | Emergency only — still cannot convert/relabel official seasons |
| `SIM_SANDBOX_V2` | New `/api/admin/simulation/runs*` → disabled/503 | Enables create/progress/advance/pause/resume/cancel on **sandbox** seasons only |
| `SIM_WORKER_TICK_ENABLED` | Worker tick HTTP/CLI refused | Allows tick with worker key; still sandbox-gated in RPC/app |
| Replay ingest flags | Remain false | Out of scope for sim rollout |

**Cleanup / test boundaries:** sandbox seasons + sim_* tables only; no official season relabel; no sheet sync; no Mock Draft Demo promote; cancel/reset by run UUID only.

## Production workflow test plan (after approved merge+apply; flags still off first)

1. Confirm Deploy applied versions `20261108150121`…`20261108150450` only (ledger 207).
2. With flags off: legacy seed/full-run → 410; v2 create → disabled; GET status / ordinary admin reads OK.
3. Readonly ACL: authenticated SELECT-only; no TRUNCATE/TRIGGER/MAINTAIN; RPCs service_role-only.
4. Enable `SIM_SANDBOX_V2` only: create sandbox season run → draft→champion→reset on disposable sandbox; prove nonsandbox season attach denied.
5. Optionally enable worker tick against that sandbox run only.
6. Cleanup: cancel/reset sandbox runs; do not touch live competitive seasons.

## Staged execution (parent / coordinator)

1. ~~Confirm DB 200~~ **done** (parent 08:50 ICT).
2. **Review+merge** PR41 after CI green + fresh Auth/browser on this head → Deploy applies seven only.
3. **Hold flags** through schema verify (step 2–3 of workflow above).
4. Enable `SIM_SANDBOX_V2` (then worker) only after ACL/smoke pass.
5. Never re-enable legacy writes for official seasons.

## Rollback (flags / schema)

- **Immediate:** keep/ensure `SIM_SANDBOX_V2=false`, `SIM_WORKER_TICK_ENABLED=false`, `SIM_LEGACY_SIMULATION_WRITES=false`.
- **Schema abort:** scoped §5 restore of legacy `simulation_runs` policies only; sticky `is_sandbox`/triggers remain (documented). Do not drop replay grants migrations.

## Blockers (actual)

1. ~~Parent DB 200 verify~~ cleared.
2. Old stacked PR33 CONFLICTING → merge **PR41**, not 33→36.
3. Fresh Auth API/browser on this head must pass (prior 83/10 not reusable).
4. GitGuardian on PR41 historically failed — confirm pass/waive separately.
5. Production mutation / flag enable remains coordinator-only under t108u.

## Parent DB verify (2026-11-08 08:50 ICT)

- Project `chmrszrwlfeqovwxyrmt`: **200** migrations, head `20261108014024`
- Pending vs ledger: **exactly the seven** retimed sim files (nothing else)
- PR40 replay ACL (72 assertions incl PG17 MAINTAIN): pass
- Prod app READY `2743893`; replay + legacy flags false
- No additional parent DB blocker

## ACL fix on #7 (premerge)

- Incident class: selective REVOKE left default TRUNCATE/TRIGGER/MAINTAIN (PR39)
- Final harden now: `REVOKE ALL` from public/anon/authenticated/service_role → GRANT SELECT authenticated; GRANT select/insert/update/delete service_role
- Content hash #7 changed; #1–#6 hashes unchanged vs accepted `794360a`/`135d45c` seven

| # | New version filename | SHA-256 (raw bytes) | Prior accepted content hash |
|---|---|---|---|
| 1 | `20261108150121_season_sim_sandbox_isolation.sql` | `7bb2f60f6b12f41c9a89b48aa1b996ae9b90e8eed5f9f2104bf90fdf689095c1` | same |
| 2 | `20261108150122_season_sim_run_foundation.sql` | `81e39c890eadcaf4f2098864159d8a30f89c8975e9837779e4cb058bc56f628b` | same |
| 3 | `20261108150123_season_sim_foundation_hardening.sql` | `51fe69179591d09bd8656891595bddb81d21c4d65b74ac5d2461d92023c4db18` | same |
| 4 | `20261108150239_season_sim_draft_domain.sql` | `7bb65161dc1d73688565519d6d455a4f7a30dfe3d18fa1a199fb4a6228b4c149` | same |
| 5 | `20261108150250_season_sim_foundation_cursor_preserve.sql` | `674ec0c2663d7f46a56c0a0a24bfed45872e34ac54da9dce65f3cb4a187788da` | same |
| 6 | `20261108150330_season_sim_season_path.sql` | `dd716161adc2187949f23db38d587006330f54ade4cbdfda9a72af4340c9e135` | same |
| 7 | `20261108150450_season_sim_shared_db_rls_harden.sql` | `c45e146d8ff54a825046241949d31857bf0e6528b6189f6ccf7dcb25db941e9d` | was `e64abf127456eb02911ba73a749633c7aeb9a9a20213128986b780d53031a849` (ACL wipe fix) |
