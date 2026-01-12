# Enhanced Error Logging for Sync Function

## Changes Made

Added comprehensive error logging throughout the sync Edge Function to help debug why data isn't persisting to the database.

## Enhanced Logging Points

### 1. Supabase Client Initialization
**Location:** Edge Function entry point
**Logs:**
- Supabase URL (truncated)
- Whether service role key exists
- Service role key prefix (first 20 chars)

**Example:**
```
[Edge Function] Supabase client initialized: {
  url: "http://127.0.0.1:54321...",
  hasServiceKey: true,
  serviceKeyPrefix: "sb_secret_N7UND0UgjK..."
}
```

### 2. Job Creation
**Location:** `handleManualSync` function
**Enhanced Logs:**
- Full job data being inserted
- Complete error details (code, message, details, hint)
- Warning if job creation returns no data but no error
- Success confirmation with job_id

**Example Error:**
```
[handleManualSync] Error creating job: {
  error: "new row violates row-level security policy",
  code: "42501",
  details: "...",
  hint: "...",
  fullError: {...}
}
```

### 3. Master Data Upserts
**Location:** `syncMasterDataPhase` function
**Enhanced Logs:**
- Record count being upserted
- Table and endpoint name
- Complete error details including RLS error code (42501)
- Verification count after upsert
- Warning if verification count doesn't match upserted count

**Example:**
```
[Master] Upserting 5 records to types (endpoint: type)
[Master] Successfully synced 5/5 type records to types
[Master] Verified: 5 total records in types (expected at least 5)
```

**Example RLS Error:**
```
[Master] Error upserting types: {
  error: "new row violates row-level security policy",
  code: "42501",
  details: "...",
  table: "types",
  recordCount: 5,
  firstRecordId: 1,
  fullError: {...}
}
[Master] PERMISSION DENIED (RLS) for types - check service role key
```

### 4. Job Progress Updates
**Location:** `processChunk` function
**Enhanced Logs:**
- Update data being sent
- Complete error details if update fails
- Warning if update returns no data but no error
- Success confirmation with updated values

**Example:**
```
[processChunk] Updating job edfe096d-fc2f-4ee4-b871-a3daf382a432: {
  current_chunk: 89,
  pokemon_synced: 1300,
  pokemon_failed: 2,
  progress_percent: 45.5,
  last_heartbeat: "2026-01-12T19:30:00.000Z"
}
[processChunk] Job updated successfully: {
  job_id: "edfe096d-fc2f-4ee4-b871-a3daf382a432",
  current_chunk: 89,
  pokemon_synced: 1300
}
```

## What to Look For

### RLS (Row Level Security) Errors
**Error Code:** `42501`
**Message:** "new row violates row-level security policy"

**If you see this:**
- The service role key should bypass RLS, but it's not working
- Check if the Edge Function is actually using the service role key
- Verify RLS policies allow service role access

### Missing Data After Successful Upsert
**Look for:**
```
[Master] Verified: 0 total records in types (expected at least 5)
[Master] WARNING: Verification count (0) is less than upserted count (5) for types
```

**This indicates:**
- Upsert appears to succeed but data isn't actually persisted
- Possible transaction rollback
- Possible RLS blocking reads even if writes succeed

### Job Creation Failures
**Look for:**
```
[handleManualSync] Error creating job: {...}
```

**Common causes:**
- RLS blocking inserts
- Missing required fields
- Check constraint violations
- Database connection issues

### Silent Failures
**Look for:**
```
[handleManualSync] Job creation returned no data but no error
[processChunk] Job update returned no data but no error
```

**This indicates:**
- Database operation completed but returned no data
- Possible issue with `.select()` or `.single()` calls
- May need to check if records actually exist

## Secrets Verification

✅ **Secrets are configured:**
- `SUPABASE_SERVICE_ROLE_KEY` ✓
- `SUPABASE_URL` ✓
- `SERVICE_ROLE_KEY` ✓ (duplicate, but present)

## Next Steps

1. **Run the sync again** and watch the Edge Function logs
2. **Look for RLS errors** (code 42501) - these will tell us if permissions are the issue
3. **Check verification counts** - if they don't match upserted counts, data isn't persisting
4. **Monitor job creation** - if jobs aren't being created, check the error details

## Testing

To test with enhanced logging:

```bash
# Trigger sync with continueUntilComplete
curl -X POST http://127.0.0.1:3000/api/sync/pokepedia \
  -H "Content-Type: application/json" \
  -d '{"action": "start", "phase": "master", "priority": "critical", "continueUntilComplete": true}'
```

Watch the Edge Function logs for:
- `[Edge Function] Supabase client initialized`
- `[handleManualSync] Attempting to create job`
- `[Master] Upserting X records`
- `[Master] Verified: X total records`
- Any error messages with code `42501` (RLS) or other error codes
