# POKE MNKY agent architecture (2026-11-24)

**Status:** documented from source + live probes. Not a production cutover.

| Fact | Status | Source |
|------|--------|--------|
| App package name `poke-mnky-v3` @ `3.0.0`; GitHub repo remains `POKE-MNKY-v2` | Verified (repo) | `package.json` @ `7cc88f276904e47995ae2c0f98dfc69feaa6b012` |
| In-app chat defaults gateway `wss://aab-openclaw.moodmnky.com`, agent id `poke-mnky` | Verified (code) | `lib/openclaw/config.ts` |
| Public HTTPS `/healthz` and `/` on that host | **Failed operational** — HTTP **503** (2026-11-24) | curl from DEVOPS |
| Pilot OpenClaw | Verified operational (prior alpha) | Coolify `poke-mnky-pilot` Host `http://poke-pilot.mnky-agents.lab`, agent id **`main`** |
| Pilot OpenMausBot | Verified operational | Coolify `poke-mnky-maus`, Codex CLI ChatGPT login |
| Framework tag | Immutable | `mnky-agent-stack` `v0.1.0-alpha.1` |

## Roles

- **POKE MNKY Claw** (OpenClaw `main` on the pilot): league intelligence, read-only. Not the Vercel production gateway.
- **POKE MNKY Maus** (OpenMausBot): operator project intelligence. No league writes, no Docker socket, no service-role DB.

## Do not cut over

Leave `aab-openclaw.moodmnky.com` and Vercel env unchanged until a separate approval. Prefer **pilot for operator tasks** while the public gateway is 503 and agent ids differ (`poke-mnky` vs `main`).

Missing docs previously cited in `AGENTS.md` (404 at those paths on `7cc88f2`):

| Path | Replacement |
|------|-------------|
| `docs/APP-FUNCTIONAL-AUDIT.md` | Not in tree. Use `docs/CURRENT-STATUS-SUMMARY.md` + this file. |
| `docs/DISCORD-INTEGRATION-VERIFY.md` | Not in tree. Use `docs/DISCORD-INTEGRATION-GUIDE.md` and `scripts/test-discord-integration-verify.ts` if present. |
| `docs/API-ENDPOINTS-FOR-NEXTJS-APP.md` | Not in tree. Routes live under `app/api/`; narrative in `docs/ai.md`. |

## Subscription boundary

Operator Claw/Maus use ChatGPT Codex OAuth inside their containers. The Next.js app must not receive those tokens. Member-facing chat stays on the existing app inference path (`lib/openclaw` + OpenAI routes) until a separate compliant design is approved. Successful operator Codex login does **not** authorize third-party traffic on the operator subscription.
