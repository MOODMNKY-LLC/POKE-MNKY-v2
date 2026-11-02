# Jev pilot harness

Offline evaluation of TypeSafe **Jev** (System One) on anonymized Discord battle-result fixtures (`fixtures/s7-battle-results.anon.json`). Flags only — not wired into live parse or Discord bots.

## Providers (env-picked)

Prefer `@typesafe-ai/sdk` with a configurable `baseURL`. **Default to Vercel AI Gateway when its credentials are present.**

| Priority | Provider | `baseURL` | Auth | Default model |
| --- | --- | --- | --- | --- |
| 1 | Vercel AI Gateway | `https://ai-gateway.vercel.sh/typesafe` | `AI_GATEWAY_API_KEY` or `VERCEL_OIDC_TOKEN` | `typesafe-ai/jev` |
| 2 | OpenRouter | `https://openrouter.ai/api` (path `/v1/systemone`) | `OPENROUTER_API_KEY` | `typesafe/jev-1.13` (or `~typesafe/jev-latest`) |
| 3 | TypeSafe direct | `https://api.typesafe.ai` (path `/v1/systemone`) | `TYPESAFE_API_KEY` (legacy alias: `JEV_API_KEY`) | `jev-1.13.0` |

Optional overrides:

- `JEV_PROVIDER=vercel-ai-gateway|openrouter|typesafe` — force a route (still needs that route’s key)
- `JEV_MODEL=` — override model id for the selected provider
- `JEV_BASE_URL=` — override API root (SDK appends `/v1/systemone`)

All keys are documented as empty placeholders in `.env.example`. Never commit secrets.

## Questions

For each fixture message:

1. **choice** `message_class` — `result` / `trade` / `fa_request` / `question` / `other`
2. **noul** `needs_organizer_review` — likely rule issue needing organizer review
3. **noul** `score_winner_consistent` — stated score and winner consistent with the text

Gold labels come from fixture `is_result` and `expected.flag` / score fields.

## Run

```bash
# With Gateway (preferred when Simeon has a Vercel key / OIDC):
AI_GATEWAY_API_KEY=… pnpm jev:pilot

# Or OpenRouter:
OPENROUTER_API_KEY=… pnpm jev:pilot

# Or TypeSafe direct:
TYPESAFE_API_KEY=… pnpm jev:pilot
```

If no credentials are set, the script exits 0, prints how to configure providers, and writes a placeholder to `docs/reviews/jev-pilot-results.md`.

## Optional app util

`lib/ai/jev.ts` exposes the same provider resolution behind `JEV_FLAGS_ENABLED=false` (default). It is **not** imported by any live API route yet.
