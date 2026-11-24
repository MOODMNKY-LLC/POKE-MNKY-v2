# AAB Notion knowledge (read-only)

Observed 2026-11-24. The app remains the source of truth for draft pools, rosters, matches, and standings. Notion is the human governance layer. This adapter does not write to Notion and does not re-enable Notion → app pull sync.

## Runtimes

OpenClaw `2026.11.5` has `openclaw mcp` but no built-in page allowlist. OpenMausBot `0.1.180` reports `GET /api/connectors` as `configured: false` and `services: {}`. Neither native connector can limit a token to these pages, so both run `agents/aab-notion` over stdio.

The token is read from a file outside the prompt. The tool list does not accept a page id. Child pages and linked pages are omitted. Claw's tool list has no commissioner, roadmap, or announcement tool.

| Role | Secret name | Infisical path |
|------|-------------|----------------|
| Claw | `NOTION_CLAW_READONLY_TOKEN` | `mnky-lab` `/services/mnky-agent-stack/poke` |
| Maus | `NOTION_MAUS_READONLY_TOKEN` | same folder, separate value |

Neither secret exists yet. Share each internal integration only with the pages in `agents/aab-notion/catalog.mjs` for that role. Do not share Average At Best HQ with the Claw integration.

## Authority

Rule pages are classified `confirmed_rule`. The seasons archive is `historical`. Open questions are `governance_mixed`: that page records both resolved decisions and open items, and it is Maus-only. Season 8 live results stay in the app. A sentence on a Notion page does not change a roster.

Jev stays a separate flag-only helper (`lib/ai/jev.ts`, default off). Roadmap rows for rules lookup, recaps, scheduling, free agency, and kill checks are `Backlog`. This adapter covers read-only rules lookup. It does not rename Jev or mark those rows Done.

`lib/sync/notion-pull-sync-gate.ts` returns HTTP 410 unless `NOTION_PULL_SYNC_ENABLED` is set. Do not set it. The app → Notion mirror spec is unbuilt and stays backlog until draft-pool phase 5 and a published pool.

## Weekly Recaps schema proposal (not applied)

Data source `7d83e48d-83a3-4ab8-92d1-c389422a68ca` has no rows. `Season` only offers Season 1. `Author` includes `AI (GPT-5.2)`. Proposed options, after approval: seasons through the current season, and author `POKE MNKY` instead of a model name. No schema edit in this pass. No draft rows were created.

## Tests

`npm run test:aab-notion` checks role denial, ignored page ids, dropped child links, a missing token, prompt text that asks for the token, and the Maus-only fixture. A live Notion read still needs the two integrations.

## Native attach (2026-11-24)

Codex's MCP client writes newline-delimited JSON. A server that answers only with `Content-Length` stays at startup status `starting` and never appears in the native tool list. `server.mjs` answers in the same framing it receives.

OpenMausBot's Codex home `/data/.openmausbot/providers/codex-own/<hash>/codex/config.toml` is a symlink to `/data/.codex/config.toml`. The native worker reads that file. `aab-notion` is registered there as stdio `node` plus the server path, role, token-file path, and fixture-file path. The bot record's `mcpServers` list stays empty; this process does not use the in-app connector registry.

`aab_fixture_canary` is Maus-only. It reads `AAB_FIXTURE_FILE` and returns that file. On 2026-11-24 the native chat message `52d013ba-83e3-433a-aa6f-2fc74c97b65f` produced `mcpToolCall` server `aab-notion` tool `aab_fixture_canary`. Reply `7ffde1c7-22ab-471d-85bf-8f277bc23a74` matched the file. The file is mode `600` and its value is not stored in git or Notion. Claw cannot call the tool.

The server directory on the Maus data volume is `/data/.openmausbot/aab-notion/`. Recreating the container keeps that volume. A new volume needs the same files from this repo and the same `config.toml` block.

## App route

`AAB_KNOWLEDGE_ENABLED` defaults off. While it is off, `GET` and `POST /api/ai/aab-knowledge` return 404. When it is on, the route requires a Supabase session, reads `profiles.role`, and allows Claw tool names to coaches and spectators. Commissioners and admins may name the Maus tools except the fixture. Page ids are ignored. The body is source identity plus `not_configured` until a separate app reader is approved. The route does not call the operator Codex gateway and does not read the runtime token files.

The existing assistant stays mounted. `components/ai/aab-knowledge-card.tsx` renders only when `NEXT_PUBLIC_AAB_KNOWLEDGE_ENABLED` is `true`. Leave both flags unset in production until the operator accepts the preview.
