# Edge Function Troubleshooting Guide

## 401 Unauthorized Error

If you're getting a `401 Unauthorized` error when calling the Edge Function, follow these steps:

### 1. Check if Edge Function is Running

The Edge Function must be served separately from Supabase:

```bash
# Start the Edge Function
supabase functions serve sync-pokepedia --no-verify-jwt
```

**Important**: The `--no-verify-jwt` flag is required for local development. Without it, the Edge Function gateway will reject requests.

### 2. Verify Supabase is Running

```bash
supabase status
```

You should see:
- Edge Functions URL: `http://127.0.0.1:54321/functions/v1`
- The function should be accessible at: `http://127.0.0.1:54321/functions/v1/sync-pokepedia`

### 3. Check Environment Variables

The Edge Function needs these environment variables:
- `SUPABASE_URL` - Set automatically by Supabase CLI
- `SUPABASE_SERVICE_ROLE_KEY` - Set automatically by Supabase CLI

Verify they're set:
```bash
supabase functions serve sync-pokepedia --no-verify-jwt --env-file .env.local
```

### 4. Test Edge Function Directly

Test if the Edge Function is accessible:

```bash
# Using curl (PowerShell)
$anonKey = "your-anon-key-here"
curl.exe -X POST http://127.0.0.1:54321/functions/v1/sync-pokepedia `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer $anonKey" `
  -d '{\"action\":\"start\",\"phase\":\"master\"}'
```

Or using PowerShell's `Invoke-RestMethod`:
```powershell
$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer YOUR_ANON_KEY_HERE"
}
$body = @{
    action = "start"
    phase = "master"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://127.0.0.1:54321/functions/v1/sync-pokepedia" `
    -Method POST `
    -Headers $headers `
    -Body $body
```

### 5. Check Edge Function Logs

When the Edge Function is running, you should see logs in the terminal where you started it:

```
[Edge Function] Request received: { method: 'POST', url: '...', hasAuth: true }
[Edge Function] Request body: { action: 'start', phase: 'master', ... }
```

If you don't see these logs, the request isn't reaching the Edge Function.

### 6. Common Issues

#### Issue: Edge Function Container Running But Function Not Served

**Symptom**: Docker container exists but function returns 401

**Solution**: 
```bash
# Stop any existing function processes
# Then start fresh
supabase functions serve sync-pokepedia --no-verify-jwt
```

#### Issue: Wrong Auth Key

**Symptom**: 401 error even with function running

**Solution**: 
- For local: Use `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- The API route automatically selects the right key based on environment
- Check `.env.local` has the anon key set

#### Issue: Function Not Found (404)

**Symptom**: 404 instead of 401

**Solution**:
- Verify function name matches: `sync-pokepedia`
- Check function exists: `ls supabase/functions/`
- Restart Supabase: `supabase stop && supabase start`

### 7. Quick Fix Script

If you're still having issues, run this:

```bash
# Stop everything
supabase stop

# Remove Edge Function container
docker rm -f supabase_edge_runtime_POKE-MNKY-v2

# Start Supabase
supabase start

# Start Edge Function in a separate terminal
supabase functions serve sync-pokepedia --no-verify-jwt
```

### 8. Verify in Browser

Open browser console and check:
1. Network tab → Look for request to `/api/sync/pokepedia`
2. Check request headers → Should have `Authorization: Bearer ...`
3. Check response → Should be 200, not 401

## Expected Behavior

When working correctly:
1. Client calls `/api/sync/pokepedia` with `{ action: "start", phase: "master" }`
2. API route calls Edge Function with auth header
3. Edge Function receives request and logs it
4. Edge Function processes sync job
5. Returns `{ success: true, job_id: "..." }`

## Still Having Issues?

1. Check Edge Function logs (terminal where you ran `supabase functions serve`)
2. Check Next.js API route logs (browser console or terminal)
3. Verify environment variables are set correctly
4. Try restarting both Supabase and the Edge Function
