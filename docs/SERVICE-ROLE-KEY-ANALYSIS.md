# Service Role Key vs Anon Key Analysis

## ✅ Assessment Complete

### Current Implementation

**Client-Side GraphQL** (`lib/supabase/graphql-client.ts`):
- Uses `NEXT_PUBLIC_SUPABASE_ANON_KEY` ✅ CORRECT
- Runs in browser (client-side)
- Respects RLS policies

**Server-Side GraphQL** (`lib/supabase/graphql-server-client.ts`):
- Uses `SUPABASE_SERVICE_ROLE_KEY` ✅ CORRECT
- Runs on server (API routes, Edge Functions)
- Bypasses RLS policies

## Key Differences

| Aspect | Anon Key (Client) | Service Role Key (Server) |
|--------|------------------|---------------------------|
| **Location** | Browser (exposed) | Server (secret) |
| **RLS** | ✅ Respects policies | ❌ Bypasses policies |
| **Security** | ✅ Safe to expose | ⚠️ Must be kept secret |
| **Use Case** | Client queries | Server operations |
| **Performance** | Good | Better (no RLS checks) |

## Architecture Decision

### ✅ **Hybrid Approach Implemented**

1. **Client-Side** (Browser):
   - Uses **anon key** via `graphql-client.ts`
   - Respects RLS policies
   - Safe for public exposure

2. **Server-Side** (API Routes):
   - Uses **service role key** via `graphql-server-client.ts`
   - Bypasses RLS for sync operations
   - Keeps key secret (never exposed to client)

3. **Progressive Fallback**:
   ```
   Client Hook
     ↓
   Try: Server-side GraphQL API (service role) ← BEST
     ↓ (if fails)
   Try: Client-side GraphQL (anon key) ← GOOD
     ↓ (if fails)
   Fallback: REST API (anon key) ← SAFE
   ```

## Benefits

### ✅ **Security**
- Service role key never exposed to client
- Anon key safe for browser use
- Proper separation of concerns

### ✅ **Performance**
- Server-side GraphQL bypasses RLS (faster)
- Client-side GraphQL respects RLS (secure)
- Progressive fallback ensures reliability

### ✅ **Flexibility**
- Works with or without RLS policies
- Handles both authenticated and anonymous users
- Graceful degradation

## Implementation

### Server-Side GraphQL Client
- **File**: `lib/supabase/graphql-server-client.ts`
- **Key**: `SUPABASE_SERVICE_ROLE_KEY`
- **Usage**: API routes, Edge Functions, Server Components

### Client-Side GraphQL Client
- **File**: `lib/supabase/graphql-client.ts`
- **Key**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Usage**: React hooks, client components

### API Route Wrapper
- **File**: `app/api/pokepedia/query/route.ts`
- **Purpose**: Expose server-side GraphQL to client safely
- **Security**: Service role key stays on server

## Conclusion

✅ **Current implementation is CORRECT**:
- Client-side uses anon key (safe, respects RLS)
- Server-side uses service role key (powerful, secure)
- Progressive fallback ensures reliability

✅ **No changes needed** - Architecture is optimal!
