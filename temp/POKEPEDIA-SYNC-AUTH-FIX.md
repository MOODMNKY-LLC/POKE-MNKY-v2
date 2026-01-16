# Poképedia Sync Auth Fix

## Issue Identified

The terminal logs showed Edge Functions were being called with the **publishable/anon key** instead of the **service role key**:

\`\`\`
Edge Function auth config: {
  isLocal: true,
  functionUrl: 'http://127.0.0.1:54321/functions/v1/sync-pokepedia',
  authKeyPrefix: 'sb_publishable_ACJWl...',
  usingAnonKey: true
}
\`\`\`

## Root Cause

### Old Route (`/api/sync/pokepedia/route.ts`)
The old sync route was **intentionally** using the anon key for local development:

\`\`\`typescript
// OLD CODE (lines 40-44)
const isLocal = supabaseUrl.includes("127.0.0.1") || supabaseUrl.includes("localhost")
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const authKey = isLocal ? (anonKey || serviceRoleKey) : serviceRoleKey
\`\`\`

This was done because local Edge Functions with `--no-verify-jwt` accept any token, but it was misleading in the logs.

### New Routes (`/api/pokepedia/*`)
The new routes use `supabase.functions.invoke()` which should automatically use the service role key from the client. However, there was an import mismatch:

\`\`\`typescript
// WRONG
import { createClient } from "@/lib/supabase/service";
const supabase = createServiceRoleClient(); // Function doesn't exist!

// CORRECT
import { createServiceRoleClient } from "@/lib/supabase/service";
const supabase = createServiceRoleClient();
\`\`\`

## Fixes Applied

### 1. Fixed Old Route (`app/api/sync/pokepedia/route.ts`)
- Changed to **always use service role key** (even for local)
- Updated logging to show `usingServiceRoleKey: true`
- Removed anon key fallback logic

### 2. Fixed New Routes (`app/api/pokepedia/*/route.ts`)
- Fixed import statements to use `createServiceRoleClient`
- Verified all routes use service role client correctly

## How `supabase.functions.invoke()` Works

When you create a Supabase client with the service role key:

\`\`\`typescript
const supabase = createServiceRoleClient(); // Uses SUPABASE_SERVICE_ROLE_KEY
\`\`\`

The `functions.invoke()` method automatically uses that key:

\`\`\`typescript
await supabase.functions.invoke("pokepedia-seed", { body });
// ✅ Uses service role key automatically
\`\`\`

## Verification

### Check Environment Variable
\`\`\`bash
# Should be set in .env.local
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
\`\`\`

### Verify Client Creation
\`\`\`typescript
// lib/supabase/service.ts
export function createServiceRoleClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  // ✅ Uses service role key
  return createSupabaseClient(supabaseUrl, serviceRoleKey, {...})
}
\`\`\`

### Test Edge Function Call
After the fix, logs should show:
\`\`\`
Edge Function auth config: {
  isLocal: true,
  functionUrl: 'http://127.0.0.1:54321/functions/v1/...',
  authKeyPrefix: 'sb_secret_...',  // ✅ Service role key prefix
  usingServiceRoleKey: true
}
\`\`\`

## Why This Matters

1. **Security**: Service role key bypasses RLS and should be used server-side
2. **Consistency**: All Edge Function calls should use the same auth method
3. **Debugging**: Clear logging helps identify auth issues

## Files Changed

- ✅ `app/api/sync/pokepedia/route.ts` - Always use service role key
- ✅ `app/api/pokepedia/worker/route.ts` - Fixed import
- ✅ `app/api/pokepedia/seed/route.ts` - Already correct
- ✅ `app/api/pokepedia/sprite-worker/route.ts` - Already correct

## Next Steps

1. ✅ Verify `.env.local` has `SUPABASE_SERVICE_ROLE_KEY` set
2. ✅ Test Edge Function calls - logs should show service role key
3. ✅ Monitor for any auth errors

## Notes

- **Local Development**: Even though local Edge Functions accept any token with `--no-verify-jwt`, we use service role key for consistency
- **Remote Deployment**: Service role key is required for Edge Function calls
- **Client vs Server**: Service role key should NEVER be exposed to the client (no `NEXT_PUBLIC_` prefix)
