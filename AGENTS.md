# POKE MNKY v3 - Agent Instructions

## OpenAI Developer Documentation

Always use the OpenAI developer documentation MCP server (`openaiDeveloperDocs`) if you need to work with the OpenAI API, ChatGPT Apps SDK, Codex, Responses API, Agents SDK, or related OpenAI documentation without me having to explicitly ask.

## OpenClaw agent: Ollama / model & quota choices

The **POKE MNKY** OpenClaw agent’s instructions (including which **Ollama** cloud models to prefer for day-to-day chat vs. “heavy” work) live in the monorepo at `../AGENTS.md` and `../../workspaces/poke-mnky/AGENTS.md` under **“Model choice, `/model`, and Ollama Cloud”**. When helping the human pick a model or limit burn, use that table; the default **daily driver** is **`ollama/gemma3:12b-cloud`**, not large Qwen/Kimi, unless the task needs it. Official plan limits: [Ollama Cloud](https://ollama.com/cloud).

## Project Overview

POKE MNKY is a comprehensive Pokémon Draft League Management Platform built with:
- **Next.js 16** (App Router) with React 19.2
- **TypeScript** for type safety
- **Supabase** (PostgreSQL) for database
- **OpenAI GPT-4.1 & GPT-5.2** for AI features
- **Pokémon Showdown** integration for battle simulation
- **Discord** integration for workflows

## Code Style & Standards

### TypeScript
- Use TypeScript for all new files
- Prefer explicit types over `any`
- Use interfaces for object shapes, types for unions/primitives
- Export types from `lib/types.ts` or component files

### React & Next.js
- Use functional components with hooks
- Prefer Server Components (default) - only use `"use client"` when needed
- Use App Router patterns (`app/` directory)
- API routes in `app/api/` directory
- Use `next/dynamic` with `ssr: false` for client-only components that cause HMR issues

### Styling
- Use Tailwind CSS for styling
- Use `cn()` utility for conditional classes
- Follow existing component patterns in `components/ui/`
- Use theme-aware colors (support dark/light mode)

### File Organization
- Components: `components/` directory
- Utilities: `lib/` directory
- API Routes: `app/api/` directory
- Types: `lib/types.ts` or co-located with components
- Hooks: `hooks/` directory

## Architecture Patterns

### Database (Supabase)
- Use Supabase client from `lib/supabase/client.ts` (client-side)
- Use Supabase admin client for API routes (server-side)
- Follow RLS (Row Level Security) policies
- Use service role key only for admin operations in API routes

### AI Features
- AI routes in `app/api/ai/` directory
- Agent implementations in `lib/agents/`
- Use Vercel AI SDK (`@ai-sdk/react`) for chat interfaces
- MCP tools available via `poke-mnky-draft-pool` MCP server

### Authentication
- Supabase Auth for user authentication
- Check authentication in API routes using `createServerClient`
- Pass `isAuthenticated` prop to components when needed

## Common Patterns

### API Routes
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Handle request
}
```

### Client Components
- Use `"use client"` directive
- Use hooks (`useState`, `useEffect`, etc.)
- Cannot use async/await directly in component body
- Use `useChat` from `@ai-sdk/react` for chat interfaces

### Server Components
- Default in App Router
- Can use async/await
- Can directly access database
- Cannot use hooks or browser APIs

## MCP Servers Available

- **poke-mnky-draft-pool**: Draft pool and team data access
- **openaiDeveloperDocs**: OpenAI documentation (use when working with OpenAI APIs)
- **supabase**: Supabase MCP server
- **supabase-local**: Local Supabase instance

## Important Notes

- **Never commit** `.env.local` or secrets
- **Always check** authentication before accessing protected resources
- **Use environment variables** for all URLs and API keys
- **Ops webhooks (optional):** `N8N_WEBHOOK_URL` and/or `OPENCLAW_ALERT_WEBHOOK_URL` — see `.env.example` and `lib/ops-alerts.ts`; set in Vercel for production. OpenClaw `/hooks/*` expects Bearer auth matching `hooks.token` (often forwarded via n8n).
- **Follow existing patterns** - check similar files before creating new ones
- **Test API routes** locally before deploying
- **Handle errors gracefully** in both UI and API routes

## When Working With

### AI Assistant Components
- Located in `components/ai/`
- Use `UnifiedAssistantPopup` for chat interface
- Support both authenticated (League Mode) and unauthenticated (General) users
- Background avatar uses `PokeMnkyPremium` (gold-black palette)

### Database Operations
- Always use Supabase client/server utilities
- Check RLS policies before bypassing with service role
- Use transactions for multi-step operations

### Showdown Integration
- Server API at `10.3.0.119:8000` (LAN) or production URL
- Use `SHOWDOWN_API_KEY` for authentication
- Validate teams before battle creation

## Best Practices

- **Keep components focused** - single responsibility
- **Reuse existing components** - check `components/ui/` first
- **Use TypeScript strictly** - avoid `any` types
- **Handle loading states** - show feedback during async operations
- **Error handling** - always catch and display errors appropriately
- **Accessibility** - use semantic HTML and ARIA labels
- **Performance** - use Server Components when possible, lazy load heavy components

## Learned User Preferences

- For broad analysis, end-to-end simulation design, admin guides, or multi-surface planning, follow the `deep-thinking` Cursor rule and use `.cursor/` resources when the user steers that way.
- Requests to ship often mean run `pnpm build`, then commit and push when the working tree is ready.
- When implementing an attached plan, do not edit the plan file; advance existing todos and mark them in progress instead of recreating them.
- Treat documents in `hand-offs/` as primary inputs for scoped updates and planning.
- For app-wide gap or functional audits, cross-check routes/APIs against Supabase and record findings in `docs/APP-FUNCTIONAL-AUDIT.md` rather than only ad-hoc notes.
- For Discord/auth/webhook integration work, validate end-to-end with smoke scripts and update `docs/DISCORD-INTEGRATION-VERIFY.md` when behavior changes.

## Learned Workspace Facts

- In-app AI: all `/api/ai/*` proxy via `lib/openclaw/` (native WebSocket; `@openclaw/sdk` not on npm). Gateway `wss://aab-openclaw.moodmnky.com` (443); HTTP hooks `https://aab-openclaw.moodmnky.com/hooks/...`. `OPENCLAW_GATEWAY_TOKEN` = host `gateway.auth.token` (not `hooks.token`). If WebSocket handshake returns empty scopes (`operator.write` denied), chat uses HTTPS `/v1/chat/completions` with the same token (`lib/openclaw/http-chat.ts`; `AI_CHAT_PROVIDER=openclaw` blocks OpenAI fallback). Local WSS behind SSL inspection: `OPENCLAW_GATEWAY_INSECURE_SKIP_TLS_VERIFY=true` only (never production).
- `lib/ops-alerts.ts` POSTs JSON to `N8N_WEBHOOK_URL` and optionally `OPENCLAW_ALERT_WEBHOOK_URL` without an `Authorization` header. OpenClaw `/hooks/*` expects `Authorization: Bearer` matching OpenClaw `hooks.token`; production often chains app → n8n Webhook → HTTP Request to OpenClaw with Bearer supplied from n8n. Smoke-test with `scripts/test-ops-webhook-e2e.ts`.
- Cursor merges user-level `%USERPROFILE%\.cursor\mcp.json` with the project `.cursor/mcp.json`; an empty or truncated user file can break MCP with JSON parse errors.
- Cursor MCP server `poke-mnky-n8n` uses Docker image `ghcr.io/czlonkowski/n8n-mcp`; set `N8N_API_URL` and `N8N_API_KEY` in `.cursor/mcp.json` for n8n REST API access from MCP tools (separate from app webhook URLs).
- On Windows with Norton/corporate SSL inspection: `git config --global http.sslBackend schannel` (unset `http.sslCAInfo`); npm/pnpm `cafile` and `NODE_EXTRA_CA_CERTS` → `%USERPROFILE%\.certs\norton-web-mail-shield-root.pem` fixes `UNABLE_TO_VERIFY_LEAF_SIGNATURE` on registry/npm; `experimental.turbopackUseSystemTlsCerts: true` in `next.config.mjs` for Google Fonts.
- Supabase CLI browser OAuth often fails on Windows/corporate networks; use a dashboard personal access token with `supabase login --token` (optional `SUPABASE_ACCESS_TOKEN` in `.env.local`, never commit).
- To align local Postgres with linked prod when local migration history is ahead: park migrations not on remote under `supabase/migrations/_held_local_only_not_on_prod/`, then `supabase db pull` and `supabase db reset`; prod **row data**: `pnpm db:sync:prod-data`. If Supabase MCP `apply_migration` timestamp differs from the repo file, rename the local migration to match `schema_migrations` before `db push`. After `db reset --linked`, orphan versions without repo files block `migration up` — `supabase migration repair --local --status reverted <version>` then `supabase migration up --local` (avoid `--include-all` for routine dev). `ECONNREFUSED` on `127.0.0.1:65432` → Docker Desktop + `supabase start`.
- Homepage draft countdown: `seasons.draft_open_at` / `draft_close_at`, Chicago `America/Chicago` (`lib/league-countdown.ts`); admin **League → Countdown** at `/admin/league#countdown`; `/api/homepage/next-event` for the landing page.
- League **teams** repopulate via Admin → **Google Sheets** → sync (`POST /api/sync/google-sheets`). Wide spreadsheet **Data** tab uses index-based columns in `lib/google-sheets-data-tab.ts` (duplicate header labels break SOS/division if mapped by name).
- Discord: bots/slash commands use Supabase Edge Function `discord-interactions` (not serverless Next.js). In-app paths include `lib/discord-notifications.ts`, `discord_webhooks`, and `POST /api/discord/sync-my-profile`. `DISCORD_BOT_INTERNAL_SECRET` is app-generated (`mnky_` + random hex), not from the Discord portal — same value in app, bot host, and Vercel; sent as `x-internal-bot-secret` for `POST /api/ai/parse-result`. Local OAuth: `http://127.0.0.1:3000`, callback `app/auth/callback/route.ts` (PKCE); seeded `discord_id` conflicts need `20260519210000_fix_handle_new_user_discord_upsert.sql`. Smoke-test with `scripts/test-discord-integration-verify.ts` and `docs/DISCORD-INTEGRATION-VERIFY.md`.
- In-app draft ops: Admin **Generate** reads `pokemon_master` (not `draft_pool`); empty master → 0 inserts — backfill via `supabase/migrations/20260520152635_backfill_pokemon_master_from_draft_pool.sql` or `scripts/backfill-pokemon-master.ts`. Leave **Game** empty unless `pokemon_games` is populated (game_code filter otherwise returns 0). **Publish** copies `season_draft_pool` → `draft_pool` (not legacy board rows). Draft UI “sign in with a league team” = logged-in user with `profiles.team_id` (coach assignment or dashboard **Your teams → Set as current**). Operator guide `docs/DRAFT-IN-APP-OPERATIONS.md`; live picks via `POST /api/draft/pick-by-name`; Notion/n8n legacy (`DRAFT_PUSH_TO_NOTION` off by default).
- CI/deploy: `baseline-browser-mapping` must match npm (^2.10.23, not 2.10.30); GitHub e2e build needs `SUPABASE_SERVICE_ROLE_KEY` placeholder in `.github/workflows/test.yml`. `vercel login` fails locally with the same TLS issue; Git/Vercel dashboard deploy still works. Vercel KV `internal-*.upstash.io` hostnames only resolve on Vercel; local dev skips Redis when only internal `KV_*` URLs (`lib/cache/redis.ts`).

## References

- Project README: `README.md`
- Project Rules: `.cursor/rules/`
- API Documentation: `docs/API-ENDPOINTS-FOR-NEXTJS-APP.md`
- Architecture: `docs/COMPREHENSIVE-ARCHITECTURE-REVIEW.md`
