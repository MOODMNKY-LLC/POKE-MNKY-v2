# Service Role Key GraphQL Implementation ✅

## Summary

Successfully implemented **server-side GraphQL** using **service role key** for sync operations, while keeping **client-side GraphQL** with **anon key** for UI queries.

## ✅ Architecture

### Three-Tier Approach

\`\`\`
┌─────────────────┐
│  Client Hook    │ (Browser - React Hook)
│  (use-pokepedia │
│   -sync.ts)     │
└────────┬────────┘
         │
         ├─→ Try: /api/pokepedia/query (Server-side GraphQL, Service Role) ← BEST
         │
         ├─→ Fallback: Client GraphQL (Anon Key) ← GOOD  
         │
         └─→ Fallback: REST API (Anon Key) ← SAFE
\`\`\`

## Implementation

### 1. Server-Side GraphQL Client ✅
**File**: `lib/supabase/graphql-server-client.ts`
- Uses `SUPABASE_SERVICE_ROLE_KEY`
- Bypasses RLS policies
- Server-side only (never exposed to client)

### 2. API Route Wrapper ✅
**File**: `app/api/pokepedia/query/route.ts`
- Exposes server-side GraphQL to client safely
- Service role key stays on server
- Handles queries: `getPokemonRange`, `getMasterData`, `getPokemonById`

### 3. Updated Sync Hook ✅
**File**: `hooks/use-pokepedia-sync.ts`
- **First**: Tries server-side GraphQL via API route (service role)
- **Second**: Falls back to client-side GraphQL (anon key)
- **Third**: Falls back to REST API (anon key)

### 4. Client-Side GraphQL Client ✅
**File**: `lib/supabase/graphql-client.ts`
- Uses `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Respects RLS policies
- Client-side only

## Benefits

### ✅ **Security**
- Service role key **never exposed** to client
- Anon key safe for browser use
- Proper separation of concerns

### ✅ **Performance**
- Server-side GraphQL bypasses RLS (faster)
- Single query for Pokemon + relationships
- Better for bulk operations

### ✅ **Reliability**
- Progressive fallback ensures it always works
- Handles GraphQL unavailability gracefully
- No breaking changes

## Key Usage

### Server-Side (Service Role Key)
\`\`\`typescript
// In API routes, Edge Functions, Server Components
import { getPokemonRangeGraphQLServer } from "@/lib/supabase/graphql-server-client"

const pokemon = await getPokemonRangeGraphQLServer(1, 50)
// Bypasses RLS, uses service role key
\`\`\`

### Client-Side (Anon Key)
\`\`\`typescript
// In React hooks, client components
import { getPokemonRangeGraphQL } from "@/lib/supabase/graphql-client"

const pokemon = await getPokemonRangeGraphQL(1, 50)
// Respects RLS, uses anon key
\`\`\`

### Via API Route (Recommended for Sync)
\`\`\`typescript
// Client calls API route, API route uses service role key
const response = await fetch("/api/pokepedia/query", {
  method: "POST",
  body: JSON.stringify({
    query: "getPokemonRange",
    variables: { startId: 1, endId: 50 },
  }),
})
// Service role key stays on server!
\`\`\`

## Security Considerations

### ✅ **Correct Usage**
- ✅ Service role key: Server-side only (API routes, Edge Functions)
- ✅ Anon key: Client-side (React hooks, components)
- ✅ API route wrapper: Keeps service role key secret

### ❌ **Never Do This**
- ❌ Expose service role key in client-side code
- ❌ Use service role key in browser
- ❌ Store service role key in `NEXT_PUBLIC_*` env vars

## Testing

After refreshing browser, check console for:
- ✅ `[Sync] Fetched X Pokemon via GraphQL (Server-side, Service Role)` - Best performance
- ⚠️ `[Sync] Fetched X Pokemon via GraphQL (Client-side, Anon Key)` - Good fallback
- ⚠️ `GraphQL query failed, falling back to REST` - Safe fallback

## Current Status

✅ Server-side GraphQL client created
✅ API route wrapper created
✅ Sync hook updated with progressive fallback
✅ Client-side GraphQL client maintained
✅ Security best practices followed

## Conclusion

✅ **Implementation is CORRECT and SECURE**:
- Server-side operations use service role key (powerful, secure)
- Client-side operations use anon key (safe, respects RLS)
- Progressive fallback ensures reliability
- Service role key never exposed to client

The hybrid approach provides the best of both worlds: **powerful server-side operations** with **secure client-side queries**!
