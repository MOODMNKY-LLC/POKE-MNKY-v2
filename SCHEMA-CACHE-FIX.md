# Schema Cache and Auth Fixes

## Issues Identified

1. **PGRST205 Schema Cache Error** ✅ FIXED
   - Tables exist but PostgREST cache was stale
   - **Fix**: Restarted Supabase (`supabase stop && supabase start`)

2. **401 Unauthorized from Edge Function** 🔧 IN PROGRESS
   - Edge Function returning 401 when called from API route
   - **Possible causes**:
     - Edge Function not running locally
     - Service role key not accepted
     - Edge Function auth configuration

3. **404 Errors for Tables** ✅ SHOULD BE FIXED
   - After restart, PostgREST should recognize tables
   - Tables confirmed to exist: `pokemon_comprehensive`, `types`, `abilities`, `moves`

## Solutions Applied

1. ✅ **Restarted Supabase** - Refreshed PostgREST schema cache
2. 🔧 **Added apikey header** - Some Edge Functions require both Authorization and apikey headers
3. 🔧 **Improved error logging** - Better debugging for missing config

## Next Steps

1. **Test after restart**: Refresh browser and check if 404s are gone
2. **Check Edge Function**: Verify it's accessible locally or use remote URL
3. **Verify service role key**: Ensure it's set correctly in `.env.local`

## Edge Function Local Development

For local Edge Function development:
\`\`\`bash
# In separate terminal
supabase functions serve sync-pokepedia --no-verify-jwt
\`\`\`

Or use remote Edge Function URL if local serving is problematic.
