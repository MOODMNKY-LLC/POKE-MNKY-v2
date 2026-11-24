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

`npm run test:aab-notion` checks role denial, ignored page ids, dropped child links, a missing token, and prompt text that asks for the token. A live Notion read still needs the two integrations.
