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
7. `20261108150450` … hash `e64abf12…1a849` (revokes authenticated DML/TRUNCATE; FORCE RLS — PR39-class ACL)

Replay files `20261107102017` / `20261108014024` must remain applied; **do not revert**.

## Staged execution (parent / coordinator)

1. **Confirm DB 200** + head `20261108014024` on `chmrszrwlfeqovwxyrmt` (this agent’s Supabase MCP only sees `MNKY_MIND` — cannot verify).
2. **Review+merge** release PR (rebased sim stack + retimed seven) to `main` → GitHub Deploy-to-production applies **only** the seven pending sim versions (no older-than-head versions).
3. **Hold flags:** all four gates above stay false; verify legacy routes still 410; v2 routes 503/disabled.
4. **Readonly ACL spot-check** on new sim tables: authenticated lacks INSERT/UPDATE/DELETE/TRUNCATE; mutation RPCs service_role-only.
5. **Optional disposable restored-schema rehearsal** before step 2 if required by prior security acceptance (prior Mac encrypt backup stays on Mac; synthetic fixtures only otherwise).
6. **Only after safety verify:** enable `SIM_SANDBOX_V2` (then worker if needed). Never re-enable legacy writes for official seasons.

## Rollback (flags / schema)

- **Immediate:** keep/ensure `SIM_SANDBOX_V2=false`, `SIM_WORKER_TICK_ENABLED=false`, `SIM_LEGACY_SIMULATION_WRITES=false`.
- **Schema abort:** scoped §5 restore of legacy `simulation_runs` policies only; sticky `is_sandbox`/triggers remain (documented). Do not drop replay grants migrations.

## Blockers (actual)

1. Supabase MCP connector ≠ poke-mnky project → parent must confirm migration ledger 200/`20261108014024`.
2. Old stacked PR33 is CONFLICTING vs main → merge **release-preflight** PR, not raw 33→36 chain.
3. Production mutation / flag enable remains coordinator-only under t108u.
