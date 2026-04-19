# POKE MNKY v3 - Agent Instructions

## OpenAI Developer Documentation

Always use the OpenAI developer documentation MCP server (`openaiDeveloperDocs`) if you need to work with the OpenAI API, ChatGPT Apps SDK, Codex, Responses API, Agents SDK, or related OpenAI documentation without me having to explicitly ask.

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

## Learned Workspace Facts

- OpenClaw: MCP uses `openclaw mcp serve` against `wss://aab-openclaw.moodmnky.com` (TLS/443); HTTP hooks are at `https://aab-openclaw.moodmnky.com/hooks/...` (443). Raw gateway port 18789 is not reachable from the public internet.
- OpenClaw may require gateway pairing before the MCP bridge connects; keep gateway tokens only in gitignored local files, not in tracked documentation.
- Cursor merges user-level `%USERPROFILE%\.cursor\mcp.json` with the project `.cursor/mcp.json`; an empty or truncated user file can break MCP with JSON parse errors.
- Cursor MCP server `poke-mnky-n8n` uses Docker image `ghcr.io/czlonkowski/n8n-mcp`; set `N8N_API_URL` and `N8N_API_KEY` in `.cursor/mcp.json` for n8n REST API access from MCP tools (separate from app webhook URLs).
- `lib/ops-alerts.ts` POSTs JSON to `N8N_WEBHOOK_URL` and optionally `OPENCLAW_ALERT_WEBHOOK_URL` without an `Authorization` header. OpenClaw `/hooks/*` expects `Authorization: Bearer` matching OpenClaw `hooks.token`; production often chains app → n8n Webhook → HTTP Request to OpenClaw with Bearer supplied from n8n.
- `scripts/test-ops-webhook-e2e.ts` smoke-tests configured ops webhook URLs.

## References

- Project README: `README.md`
- Project Rules: `.cursor/rules/`
- API Documentation: `docs/API-ENDPOINTS-FOR-NEXTJS-APP.md`
- Architecture: `docs/COMPREHENSIVE-ARCHITECTURE-REVIEW.md`
