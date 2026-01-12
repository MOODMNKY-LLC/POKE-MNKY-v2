# Edge Function Environment File Location Fix

## Issue Found in Supabase Documentation

According to the [Supabase Edge Functions Environment Variables documentation](https://supabase.com/docs/guides/functions/secrets):

> In development, you can load environment variables in two ways:
> 1. **Through an `.env` file placed at `supabase/functions/.env`, which is automatically loaded on `supabase start`**
> 2. Through the `--env-file` option for `supabase functions serve`. This allows you to use custom file names like `.env.local` to distinguish between different environments.

## Problem

We created `supabase/.env.local`, but according to the docs:
- The default location should be `supabase/functions/.env` (automatically loaded)
- OR use `--env-file` with a path **relative to `supabase/functions/` directory**

## Solution

### Option 1: Use Default Location (Recommended)

Created `supabase/functions/.env` with local values. This file is **automatically loaded** when you run:

```bash
supabase functions serve sync-pokepedia --no-verify-jwt
```

**No `--env-file` flag needed!**

### Option 2: Use Custom File with `--env-file`

If you want to use a custom file name (like `.env.local`), place it in `supabase/functions/` and use:

```bash
supabase functions serve sync-pokepedia --no-verify-jwt --env-file .env.local
```

**Note**: The `--env-file` path is **relative to `supabase/functions/` directory**, not the project root.

## Files Created

- ✅ `supabase/functions/.env` - Default location (automatically loaded)
- ✅ `supabase/.env.local` - Alternative location (requires `--env-file` flag)

## Next Steps

1. **Restart Edge Function** (no `--env-file` flag needed if using `supabase/functions/.env`):
   ```bash
   supabase functions serve sync-pokepedia --no-verify-jwt
   ```

2. **Verify in logs** that it's using `http://127.0.0.1:54321` instead of `http://kong:8000`

3. **Check database validation** - should see the same 4 jobs as direct queries

## Reference

- [Supabase Edge Functions Environment Variables](https://supabase.com/docs/guides/functions/secrets)
- Default `.env` location: `supabase/functions/.env`
- `--env-file` paths are relative to `supabase/functions/` directory
