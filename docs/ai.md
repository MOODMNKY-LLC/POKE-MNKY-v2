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

When `OPENCLAW_GATEWAY_*` / `AI_CHAT_PROVIDER=openclaw` is set, chat-style routes prefer the OpenClaw gateway (`lib/openclaw/`). See `.env.example` and `AGENTS.md`.
