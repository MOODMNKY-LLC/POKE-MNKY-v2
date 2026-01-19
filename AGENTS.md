# POKE MNKY - Agent Instructions

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

## References

- Project README: `README.md`
- Project Rules: `.cursor/rules/`
- API Documentation: `docs/API-ENDPOINTS-FOR-NEXTJS-APP.md`
- Architecture: `docs/COMPREHENSIVE-ARCHITECTURE-REVIEW.md`
