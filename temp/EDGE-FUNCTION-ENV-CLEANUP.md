# Edge Function Environment Variables Cleanup

## Issue

We created a `.env` file at `supabase/functions/.env` with `SUPABASE_` prefixed variables, but these are **automatically injected** by the Supabase CLI and should not be manually set.

## Root Cause

According to the [Writing Supabase Edge Functions rule](.cursor/rules/writing-supabase-edge-functions.mdc):

> **Following environment variables (ie. secrets) are pre-populated in both local and hosted Supabase environments. Users don't need to manually set them:**
> - SUPABASE_URL
> - SUPABASE_PUBLISHABLE_OR_ANON_KEY
> - SUPABASE_SERVICE_ROLE_KEY
> - SUPABASE_DB_URL

The CLI correctly skips these variables when found in `.env` files (hence the "Env name cannot start with SUPABASE_, skipping" messages), but we shouldn't have them there in the first place.

## Solution

**Removed** `supabase/functions/.env` file since it only contained auto-injected variables.

## Why This Works

1. **Auto-Injection**: Supabase CLI automatically injects `SUPABASE_` prefixed variables
2. **No Manual Setup Needed**: Edge Functions automatically receive these values
3. **Correct Behavior**: The "skipping" messages are actually confirming correct behavior
4. **Cleaner Setup**: No need for redundant `.env` file

## For Custom Environment Variables

If you need to set **custom** environment variables (not `SUPABASE_` prefixed), you can:

1. Create a `.env` file with your custom variables
2. Use `supabase secrets set --env-file path/to/env-file` to set them

Example:
\`\`\`bash
# Custom variables only (no SUPABASE_ prefix)
MY_API_KEY=abc123
EXTERNAL_SERVICE_URL=https://api.example.com
\`\`\`

## Reference

- [Writing Supabase Edge Functions Rule](.cursor/rules/writing-supabase-edge-functions.mdc)
- Variables prefixed with `SUPABASE_` are auto-injected
- Only custom variables need to be set manually
