# In-app AI endpoints

Short inventory of remaining `/api/ai/*` routes after the AI trim. MCP tool mode is **off by default** (`AI_MCP_TOOLS_ENABLED` unset/false). Token costs are rough order-of-magnitude for a typical call (input + output), not guarantees.

| Endpoint | Model (OpenAI path) | Purpose | ~Tokens / call |
|----------|---------------------|---------|----------------|
| `POST /api/ai/assistant` | Request `model` or `gpt-4o` | General unified assistant (OpenClaw primary when configured) | 1.5k–6k |
| `POST /api/ai/draft-assistant` | `AI_MODELS.STRATEGY_COACH` (`gpt-4o`) | Live draft picks / budget / roster balance | 2k–8k |
| `POST /api/ai/battle-strategy` | `AI_MODELS.BATTLE_CHOICE` (`gpt-4.1`) | Matchup / Showdown turn advice | 1.5k–5k |
| `POST /api/ai/free-agency` | `AI_MODELS.STRATEGY_COACH` (`gpt-4o`) | Trades / FA / roster transactions | 2k–6k |
| `POST /api/ai/pokedex` | `AI_MODELS.POKEDEX_QA` (`gpt-4.1`) | Pokédex Q&A (`get_pokemon` tool; optional MCP when flagged) | 1k–4k |
| `POST /api/ai/weekly-recap` | `AI_MODELS.WEEKLY_RECAP` (`gpt-4o`) | Commissioner-style weekly recap from DB stats | 2k–5k |
| `POST /api/ai/parse-result` | `AI_MODELS.RESULT_PARSER` (`gpt-4.1`) | Gated Discord/text match-result parse → DB write | 0.8k–2k |
| `POST /api/ai/draft-board-analysis` | `AI_MODELS.DRAFT_BOARD_ANALYSIS` (`gpt-5.2-chat-latest`) | Admin/deep draft-board analysis | 4k–15k |
| `POST /api/ai/sql` | (route-specific) | Constrained SQL / data helper (admin) | varies |

## Removed

- `/api/ai/coach` — orphan strategic coach route (no live UI).
- `/api/ai/pokedex-v2` — merged into `/api/ai/pokedex` (useChat + legacy `{ query }` body).

## MCP tools

- Env: `AI_MCP_TOOLS_ENABLED=true` plus `MCP_DRAFT_POOL_SERVER_URL` / `MCP_API_KEY`.
- Client must also send `mcpEnabled: true` (assistant popup toggle defaults off).
- Without the env flag, MCP tools are never attached even if the client asks.

## OpenClaw

League chat uses the OpenClaw gateway only when `OPENCLAW_GATEWAY_URL`, `OPENCLAW_AGENT_ID`, and an auth mode are all set. There is no default host or agent id. Set `OPENCLAW_AGENT_ID=aab-member` for the member agent. Auth is Cloudflare Access when both `OPENCLAW_CF_ACCESS_CLIENT_ID` and `OPENCLAW_CF_ACCESS_CLIENT_SECRET` are set (those requests send the Access service-token headers and do not send `Authorization`). Otherwise a legacy `OPENCLAW_GATEWAY_TOKEN` is a bearer token. A URL and agent id with neither auth mode — including a stale gateway host — fail closed: `enabled` is false and chat is not called.

The Access path is `POST {OPENCLAW_GATEWAY_URL}/v1/chat/completions` with `model` `openclaw/<OPENCLAW_AGENT_ID>`. `GET /api/openclaw/health` reports `authMode` and `enabled` only. In `cf-access` mode it reports `configured` and does not open a WebSocket or call the model.

If the URL, agent id, or auth is unset, the five member routes return HTTP 503 `{ error: "unavailable", message: "AI chat is unavailable right now" }` and do not call the gateway. The Ask POKE MNKY dock then uses sources-only `/api/ai/aab-knowledge` when that flag is on. `AI_CHAT_PROVIDER=openclaw` still blocks the OpenAI fallback. A configured OpenClaw path does not require `OPENAI_API_KEY`.

Limits, before the gateway is called: a user message longer than `AI_CHAT_MAX_MESSAGE_CHARS` (default 2,000) is rejected, and history is trimmed to the last `AI_CHAT_MAX_HISTORY` turns (default 10) plus the server system prompt. Requests that pass validation are counted per coach (`AI_CHAT_LIMIT_PER_HOUR` default 20 rolling hours, `AI_CHAT_LIMIT_PER_DAY` default 100 America/New_York days) and app-wide (`AI_CHAT_LIMIT_GLOBAL_PER_DAY` default 300 per New York day). Over the limit is HTTP 429 `{ code: "rate_limited", scope, retryAfter }`. The counter is `public.ai_chat_usage` via `consume_ai_chat_quota` (service role only; the migration is additive). A limiter store error is HTTP 503 `{ code: "chat_unavailable" }` so a broken counter cannot turn into unlimited use. Preview has none of the `OPENCLAW_*` variables, so chat stays unavailable there.

## OpenAI key absent

Production does not set `OPENAI_API_KEY` (removed 2026-11-25). Chat routes (`assistant`, `draft-assistant`, `battle-strategy`, `free-agency`, `pokedex`) keep using OpenClaw when that gateway is fully configured. If it is not, the Ask POKE MNKY dock uses sources-only league knowledge when that flag is on, and otherwise shows "AI chat is unavailable right now". The other chat composers stay on the disabled state from the OpenAI-absent work.

These routes are OpenAI-only. With the key absent they return HTTP 503 `{ error: "unavailable", message: "OpenAI is not configured" }` and the controls that call them are disabled:

- `POST /api/ai/weekly-recap`
- `POST /api/ai/parse-result`
- `POST /api/ai/draft-board-analysis`
- `POST /api/ai/sql`
- `POST /api/battle/[id]/step` when `use_ai` is set (a manual choice still applies)
