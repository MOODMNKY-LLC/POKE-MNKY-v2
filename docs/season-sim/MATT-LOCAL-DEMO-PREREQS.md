# Matt local-demo prerequisites & blockers (sanitized)

## Safe path TODAY

**Local disposable only** until GROK proves a remote project is isolated from prod Supabase/OAuth/webhooks.

1. Bring up: `pnpm test:season-sim-real-server-stack` / `./scripts/season-sim/bring-up-real-server-stack.sh`
2. Observe via screen share or SSH tunnel to loopback — **not** ordinary Vercel Preview
3. Create disposable GoTrue admin; put that UUID in `SIM_DEMO_OPERATOR_ALLOWLIST`; set `SIM_DEMO_OPERATOR_GATE=true`
4. Enable only process-local: `SIM_SANDBOX_V2=true`, `SIM_WORKER_TICK_ENABLED=true`, fresh `SIMULATION_WORKER_KEY`
5. Compact fixture: `fixtures/season-sim/provisional-demo-v0.compact.json` (2 teams × 2 rounds × 2 weeks)
6. Flow: create → advance `pick`×N → advance `season` (repeat ticks until `completed`) → optional `reset` → replay
7. Tear down containers; scrub env; no prod writes

## Blockers for remote preview

| Blocker | Why |
|---|---|
| Vercel Preview may use prod Supabase | Isolation unproven |
| No dedicated disposable remote project | Ops/GROK provision required |
| PR33 GG required red | No merge / prod deploy bypass |
| Live migration / flag enable / access grants | **Not authorized** |
| Browser E2E on exact remote head | Needs cleared disposable domain first |

## Capabilities shipped in-repo (season-path branch)

- Allowlist gate on sim mutation routes
- Season path worker (schedule → statistical → playoffs → champion)
- Scoped UUID reset + domain_epoch replay
- Progress evidence includes `season`
- CI Test workflow triggers include draft-domain base for stacked PR

## Not claimed

- Production wire-up
- Paid inference / Showdown battles
- Ordinary preview = safe demo host
