# Sanitized deployment boundary — Matt provisional-demo review (GROK MNKY)

**Audience:** GROK MNKY security disposition  
**Authoring agent:** POKÉ MNKY (app)  
**Date (UTC):** 2026-11-07  
**Status:** Requirements / evidence only — **NOT** deployment authorization  
**Scope:** Season-sim provisional statistical demo (sandbox). No production write path authorized.

> Never includes raw secrets, JWTs, passwords, connection strings, or allowlist member identities.

---

## 1. Verdict (fail-closed)

| Question | Answer |
|---|---|
| Is ordinary **Vercel Preview** assumed isolated? | **No.** Preview commonly inherits **production** Supabase URL/keys/OAuth/webhooks. Treat as **prod-adjacent** until proven otherwise. |
| Can we authorize wiring demo flags to production/shared project today? | **No** — not authorized; isolation not proven for remote preview. |
| Safe demo posture for TODAY? | **Synthetic local-only disposable stack** (official images + generated secrets) OR a **new dedicated disposable project** that GROK/ops provisions — never prod keys. |
| PR33 required GG red? | **Do not bypass / merge / ignore.** Disposition remains GROK-owned. |

---

## 2. Boundary requirements (checklist)

### Data & identity
- [ ] Separate disposable Postgres + Auth + Storage (not prod project ref)
- [ ] Synthetic seats / bots only — no real coach PII, no prod row copies
- [ ] No production OAuth client, Discord bot, email provider, sheet sync, or webhook URLs

### Secrets (server-only)
- [ ] Fresh **generated** JWT signing secret (≥32 chars entropy) — **never** public Supabase demo/default signing secret on the internet
- [ ] Fresh anon + service_role JWTs minted for that secret (runtime only; not committed)
- [ ] Service role / worker key / DB passwords: process env or sealed secret store only; never `NEXT_PUBLIC_*`
- [ ] No production keys in demo env files, CI logs, artifacts, or chat

### AuthZ for Matt
- [ ] Authenticated session required (GoTrue / project Auth)
- [ ] **Allowlist** of operator subject IDs (UUID) via server env `SIM_DEMO_OPERATOR_ALLOWLIST` — comma-separated UUIDs
- [ ] When gate ON: allowlisted UUID is enough — **league admin is NOT required**
- [ ] Allowlist membership does **not** grant broad league admin (`/api/admin/seasons/*` etc. still fail closed for spectators)
- [ ] Gate OFF (dev only): `requireLeagueAdmin` fallback
- [ ] Fail closed if allowlist empty while gate mode is on
- [ ] Non-allowlisted authenticated users → 403 on sim routes

### Surface hardening
- [ ] Worker tick requires shared secret header; secret not public
- [ ] No unauthenticated seed/reset/destructive endpoints
- [ ] Scoped UUID reset only (`sim_reset_run_domain`) — name-based Mock Draft reset stays retired (410)
- [ ] Flags default OFF: `SIM_SANDBOX_V2`, `SIM_WORKER_TICK_ENABLED`, `SIM_LEGACY_SIMULATION_WRITES`
- [ ] Crons/notifications/Discord/email/sheet writes: OFF / fail closed on sandbox (`shouldEmitLiveSideEffectsForSeason`)
- [ ] Paid inference / Showdown battle fidelity: OFF for statistical demo (`fidelity=statistical_seeded` only)
- [ ] Documented kill switch: unset flags + tear down disposable stack; no prod project to “turn off”

### Verification bar before calling anything “operational”
- [ ] Exact-head: unit + fixture PG + **real-server-auth** (GoTrue cookies) + domain E2E
- [ ] Authorized staging smoke **only** after GROK clears isolation (not assumed)
- [ ] Browser path against **local disposable** or cleared disposable remote — not prod-pointing preview

---

## 3. Evidence of current app posture (sanitized)

| Control | Observed |
|---|---|
| Feature flags | Default OFF (`lib/season-sim/flags.ts`) |
| Legacy name reset | Permanently 410 |
| Sandbox season live flags | DB + app refuse promote / sheet / set-current |
| Live match Discord/activity | Gated by `shouldEmitLiveSideEffectsForSeason` (sandbox → no emit) |
| Demo operator gate | Code: `lib/season-sim/demo-allowlist.ts` — `SIM_DEMO_OPERATOR_GATE` / `SIM_DEMO_OPERATOR_ALLOWLIST`; mutation routes use `requireSimDemoOperator` |
| Scoped UUID reset | `POST …/runs/[id]/reset` → RPC `sim_reset_run_domain` (service_role); keeps append-only evidence; bumps `domain_epoch` for operation_key replay |
| Season path fidelity | `statistical_seeded` only; Showdown battle fidelity fail-closed |
| Draft → schedule handoff | Draft complete → **paused** + `awaiting=schedule` (not permanent schedule block) |
| Draft PR34 tip CI | Prior tip green; lineage GG red on PR33 still GROK-owned |
| Ordinary Vercel Preview | **Not proven disposable** — may bind prod Supabase; **do not enable flags there** |

Local disposable harness already generates JWT secret + anon/service JWTs at runtime (`bring-up-real-server-stack.sh` + `mint-disposable-jwts.py`); scrubbed on exit. That pattern is the reference for any Matt demo.

---

## 4. Hosting pivot — shared prod DB (guarded sandbox)

Ops direction: reuse existing Supabase project (**poke-mnky-db**) with a **strictly guarded sandbox**, not a new disposable project. That means:

- Ordinary preview still prod-adjacent; flags stay **OFF** until the shared-DB plan is approved.
- Evidence bar shifts to RLS/RPC/noninterference/sentinels + resource bounds (see `SHARED-DB-SECURITY-RELEASE-CHECKLIST.md`).
- **Hold all live writes** (migrate / seed / flag enable / Matt prod Auth) until that exact plan is approved.
- Rollback = feature/worker off + prior app SHA — **not** dropping schema or improvised live restore.
- Existing production Auth/keys untouched — no disposable fixture users in live Auth, no public demo JWTs/rotation.
- Matt = real least-privilege identity via established auth **later**, after HTTPS cookies/refresh/origin/CSRF verified.

### TODAY engineering path (still local for proofs)

1. Disposable PG / real-server stack for tests: `./scripts/season-sim/bring-up-real-server-stack.sh`.
2. Author additive RLS harden + checklist evidence in git; **do not** `db push` to linked prod.
3. Demo UI at `/demo/season-sim` (not full admin); APIs allowlist + owner scoped.
4. PR33 required red remains GROK-owned — tip green must not bypass foundation red.

---

## 5. Kill switch / teardown

| Action | Effect |
|---|---|
| Unset `SIM_SANDBOX_V2` / `SIM_WORKER_TICK_ENABLED` | All v2 sim APIs 503 |
| Unset / rotate `SIMULATION_WORKER_KEY` | Worker ticks fail closed |
| Clear `SIM_DEMO_OPERATOR_ALLOWLIST` while gate mode requires it | Mutations 403 |
| `docker rm` / stop disposable stack | Entire demo DB/auth gone |
| Never: delete prod rows, rotate prod JWT “for demo”, or merge GG-red PR33 |

---

## 6. Missing capabilities / blockers for “remote Matt preview today”

1. **No proven disposable remote project** dedicated to this demo (isolation unproven).
2. **Vercel Preview ≠ sandbox** without env audit by GROK/ops.
3. **Allowlist + gate mode** shipping in season-path PR (code); ops must set Matt’s disposable UUID without using prod identities.
4. **Browser E2E against disposable remote** not run until remote exists.
5. **PR33 GG required red** — merge/prod deploy blocked regardless of tip GG on stacked PRs.
6. **No authorization** for live migration, flag enablement on prod, access grants, or webhook wiring.
7. Exact preview head still needs auth/DB/domain/reset/browser E2E **and** authorized staging smoke **after** isolation proof — not claimed done for remote.

---

## 7. What POKÉ MNKY will / will not do

**Will:** continue in-repo feature/tests; local disposable proofs; sanitized artifacts; allowlist gate code; document Matt local-demo steps.

**Will not:** enable prod flags; apply live migrations; merge GG-red; put demo signing secrets in public artifacts; wire preview to prod Supabase; grant Matt access on prod; investigate/bypass historical GG incidents (GROK owns).

---

## 8. Env var *names* only (no values)

| Name | Role |
|---|---|
| `SIM_SANDBOX_V2` | Master gate for v2 sim APIs |
| `SIM_WORKER_TICK_ENABLED` | Worker tick gate |
| `SIMULATION_WORKER_KEY` | Shared secret header for worker |
| `SIM_DEMO_OPERATOR_GATE` | Force allowlist mode |
| `SIM_DEMO_OPERATOR_ALLOWLIST` | Comma-separated operator UUIDs |
| `NEXT_PUBLIC_SUPABASE_URL` | Must point at **disposable** project only |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Disposable anon JWT |
| `SUPABASE_SERVICE_ROLE_KEY` | Disposable service_role JWT (server-only) |

---

## 9. Handoff to GROK

Please confirm or reject:
1. Local-only Matt demo is acceptable for TODAY’s review, **or**
2. Ops will provision a dedicated disposable project meeting §2, after which POKÉ can document env wiring for a cleared smoke.

Reply with disposition only; no secret material in either direction.
