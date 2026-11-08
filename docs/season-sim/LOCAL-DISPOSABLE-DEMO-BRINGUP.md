# Local disposable Matt demo — bring-up / teardown (sanitized)

**No prod integrations. No public deploy. Fresh credentials only (runtime-generated).**

## Migration order (disposable replay)

Applied by `scripts/season-sim/full-schema-disposable-replay.sh` (Storage image + **all** `supabase/migrations/*.sql` in timestamp order), including:

1. `20261108150121_season_sim_sandbox_isolation.sql`
2. `20261108150122_season_sim_run_foundation.sql`
3. `20261108150123_season_sim_foundation_hardening.sql`
4. `20261108150239_season_sim_draft_domain.sql`
5. `20261108150250_season_sim_foundation_cursor_preserve.sql`
6. `20261108150330_season_sim_season_path.sql` (`sim_matches` / `sim_standings` / `sim_season_outcomes` / `sim_reset_run_domain`)

## One-shot bring-up

```bash
./scripts/season-sim/bring-up-real-server-stack.sh
# or: pnpm test:season-sim-real-server-stack
```

Script generates JWT signing secret + anon/service JWTs + worker key + fixture passwords at runtime (never committed). Starts loopback-only Postgres/GoTrue/PostgREST/gateway/Next. Sets:

| Env **name** | Purpose |
|---|---|
| `SIM_SANDBOX_V2` | Enable v2 sim APIs |
| `SIM_WORKER_TICK_ENABLED` | Enable worker tick |
| `SIMULATION_WORKER_KEY` | Worker shared secret |
| `SIM_DEMO_OPERATOR_GATE` | Force allowlist mode |
| `SIM_DEMO_OPERATOR_ALLOWLIST` | Operator UUIDs (admin fixture + spectator coach) |
| `NEXT_PUBLIC_SUPABASE_URL` | Disposable gateway URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Disposable anon JWT |
| `SUPABASE_SERVICE_ROLE_KEY` | Disposable service_role JWT |

## Operator model

- Matt = authenticated disposable user **on allowlist** (may be `profiles.role=spectator`)
- Allowlist membership ≠ league admin; `/api/admin/seasons/*` still 403 for spectators
- Compact fixture: `fixtures/season-sim/provisional-demo-v0.compact.json`

## Kill / teardown

1. Unset / stop Next (`SIM_SANDBOX_V2` / worker key gone with process)
2. `docker rm -f` stack containers (script default cleans unless `KEEP_STACK=1`)
3. Scrub `/tmp/season-sim-auth-ci` state dir
4. Never rotate prod JWT or delete prod rows “for demo”

## Forbidden

- Ordinary Vercel Preview wired to prod Supabase
- Prod keys, OAuth, Discord/email/sheet webhooks, paid inference
- Live migration / access grants / public environment provision
