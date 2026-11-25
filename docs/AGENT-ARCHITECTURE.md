# POKE MNKY agent architecture (2026-11-24)

**Status:** documented from source + live probes. Not a production cutover.

| Fact | Status | Source |
|------|--------|--------|
| App package name `poke-mnky-v3` @ `3.0.0`; GitHub repo remains `POKE-MNKY-v2` | Verified (repo) | `package.json` @ `7cc88f276904e47995ae2c0f98dfc69feaa6b012` |
| In-app chat defaults gateway `wss://aab-openclaw.moodmnky.com`, agent id `poke-mnky` | Verified (code) | `lib/openclaw/config.ts` |
| Public HTTPS `/healthz` and `/` on that host | **Failed operational** — HTTP **503** (2026-11-24) | curl from DEVOPS |
| POKE MNKY Claw | Operator dashboard `aab-claw` (the `poke-pilot` hostnames are retired) | Agent id **`main`** |
| POKE MNKY Maus | Operator dashboard `aab-maus.nb` (the `poke-maus` hostnames are retired) | Codex CLI ChatGPT login |
| Framework tag | Immutable | `mnky-agent-stack` `v0.1.0-alpha.1` |

## Roles

- **POKE MNKY Claw** (OpenClaw `main` on `aab-claw`): league intelligence, read-only. Not the Vercel production gateway. Sources-only league knowledge from PR #55 is merged. Production knowledge flags are on as of 2026-11-25.
- **POKE MNKY Maus** (OpenMausBot): operator project intelligence. No league writes, no Docker socket, no service-role DB.

## Do not cut over

Leave `aab-openclaw.moodmnky.com` and Vercel env unchanged until a separate approval. Prefer **pilot for operator tasks** while the public gateway is 503 and agent ids differ (`poke-mnky` vs `main`).

Missing docs previously cited in `AGENTS.md` (404 at those paths on `7cc88f2`):

| Path | Replacement |
|------|-------------|
| `docs/APP-FUNCTIONAL-AUDIT.md` | Not in tree. Use `docs/CURRENT-STATUS-SUMMARY.md` + this file. |
| `docs/DISCORD-INTEGRATION-VERIFY.md` | Not in tree. Use `docs/DISCORD-INTEGRATION-GUIDE.md` and `scripts/test-discord-integration-verify.ts` if present. |
| `docs/API-ENDPOINTS-FOR-NEXTJS-APP.md` | Not in tree. Routes live under `app/api/`; narrative in `docs/ai.md`. |

## What is actually verified (2026-11-24, later pass)

These are separate claims. Identity text is not tool access.

| Claim | Status |
|-------|--------|
| Maus native turn can read a file that was not quoted in the prompt | **PASS.** `POST /api/bots/:id/messages` on loopback, `cwd` = bot workspace, Codex `workspace-write`. Reply contained the file's code and `FILE_OK`. One shell attempt failed; a second succeeded. |
| Maus read `package.json` from GitHub inside that runtime | **PASS.** HTTPS GET of `raw.githubusercontent.com/.../package.json` returned name `poke-mnky-v3`, version `3.0.0`. |
| Maus GitHub write | **Not sent.** No GitHub token is in the container. The model refused the non-GET call, so a live 401 was not observed. |
| Maus Notion | **Not configured.** Connector catalog slug `notion` is `needs-setup`. |
| Claw `web_fetch` of PokéAPI Ditto | **Partial.** `base_experience` 101 from the tool. `types` truncated, reported not verified. |
| Claw league-rule citation | **PASS as repo documentation.** Quoted "Check point budget (120pts)" from `docs/N8N-FREE-AGENCY-WORKFLOW-IMPLEMENTATION.md` and labeled it implementation docs, not a live ruling. |
| Claw live standings | **Not retrieved by the agent.** `GET https://poke-mnky.moodmnky.com/api/standings` is HTTP 200 from the operator workstation and uses the app's server service-role client. The agent did not call it. Do not copy that service-role key into the agent. |
| Production gateway | **503 is Coolify's unconfigured-host page**, fronted by Cloudflare. No DNS record named `aab-openclaw.moodmnky.com`. The name matches wildcard `*.moodmnky.com` → tunnel `318b98bc-72e6-4687-ae1a-9fd719f85b17.cfargotunnel.com` (changed 2026-11-13). This Cloudflare account lists no tunnels. Mood Coolify (`10.1.0.115`) has no matching application. Not restarted. Not retargeted. |

Claw tool policy on the pilot: `tools.profile=messaging`, `alsoAllow=["web_fetch"]`, deny filesystem and exec groups. `web_fetch` blocks private and link-local hosts by default (`dangerouslyAllowPrivateNetwork` left unset). A host allowlist in `TOOLS.md` is model instruction, not a gateway allowlist.

## Subscription boundary

Operator Claw/Maus use ChatGPT Codex OAuth inside their containers. The Next.js app must not receive those tokens. Member-facing chat stays on the existing app inference path (`lib/openclaw` + OpenAI routes) until a separate compliant design is approved. Successful operator Codex login does **not** authorize third-party traffic on the operator subscription.
