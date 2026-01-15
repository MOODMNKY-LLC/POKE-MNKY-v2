# Edge Function Environment Variables Fix

## Problem

Edge Functions running locally were seeing different data than direct database queries, suggesting they might be connecting to a different database instance.

## Solution from Supabase Documentation

According to Supabase documentation, when developing Edge Functions locally:

1. **Automatic Environment Variables**: Supabase CLI automatically injects `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` when you run `supabase functions serve`

2. **Internal Docker Network**: The `SUPABASE_URL` might be set to `http://kong:8000` (internal Docker network), which is correct but can cause confusion

3. **Override with `--env-file`**: You can explicitly set environment variables using `--env-file` flag to ensure consistent connections

## Implementation

### 1. Created `supabase/.env.local`

This file contains explicit local Supabase values from `supabase status`:

\`\`\`bash
# Local Supabase Edge Function Environment Variables
# Generated from: supabase status
# Use with: supabase functions serve sync-pokepedia --no-verify-jwt --env-file supabase/.env.local

SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=<local-service-role-key>
SUPABASE_ANON_KEY=<local-anon-key>
\`\`\`

### 2. Updated Edge Function Serve Command

**Before:**
\`\`\`bash
supabase functions serve sync-pokepedia --no-verify-jwt
\`\`\`

**After:**
\`\`\`bash
supabase functions serve sync-pokepedia --no-verify-jwt --env-file supabase/.env.local
\`\`\`

## Benefits

1. **Explicit Configuration**: No ambiguity about which database the Edge Function connects to
2. **Consistent URLs**: Uses `http://127.0.0.1:54321` instead of `http://kong:8000` for clarity
3. **Reproducible**: Same environment variables every time you restart the Edge Function
4. **Debugging**: Easier to verify which database instance is being used

## Verification

After restarting with `--env-file`, check Edge Function logs for:

\`\`\`
[Edge Function] Supabase client initialized: {
  url: "http://127.0.0.1:54321",  // ✅ Explicit localhost URL
  urlIsLocal: true,
  isKong: false,  // ✅ Not using internal Docker network URL
  hasServiceKey: true,
  serviceKeyPrefix: "eyJhbGciOiJIUzI1NiIs...",
  serviceKeyLength: 200+,
  serviceKeyLooksValid: true
}
\`\`\`

## References

- [Supabase Edge Functions Local Development](https://supabase.com/docs/guides/functions/development-environment)
- [Supabase Edge Functions Testing Guide](https://supabase.com/docs/guides/functions/unit-test)
