# Edge Function Docker Networking Fix

## Critical Discovery

After implementing URL normalization, we discovered a **critical Docker networking issue**:

### The Problem

1. **URL Normalization Broke Connection**: When we changed `kong:8000` to `127.0.0.1:54321`, the Edge Function got "Connection refused" errors.

2. **Why This Happened**: Edge Functions run **inside Docker containers**. When the Edge Function tries to connect to `127.0.0.1:54321` from inside the container, it's trying to connect to the container itself, not the host machine.

3. **Docker Networking**: `kong:8000` is the **correct URL** for Edge Functions running in Docker. It uses the Docker network hostname `kong` to reach the Supabase API gateway.

### The Real Issue

The original `kong:8000` URL was correct. The problem wasn't the URL format - it was that the Edge Function was seeing different data (5 jobs) than our direct queries (4 jobs). This suggests:

1. **Different Database Instance**: Edge Function might be connecting to a different Supabase instance
2. **Connection Pooling/Caching**: Stale connections showing old data
3. **Service Role Key Mismatch**: Different service role key connecting to different instance

## Solution

### 1. Keep `kong:8000` for Docker Networking

Reverted URL normalization - `kong:8000` is the correct URL for containerized Edge Functions:

\`\`\`typescript
// IMPORTANT: When Edge Function runs in Docker, kong:8000 is the CORRECT URL
// Edge Function container uses Docker network hostname 'kong' to reach Supabase API gateway
// Using 127.0.0.1:54321 from inside Docker container would try to connect to the container itself, not the host
if (isKong && isLocal) {
  console.log("[Edge Function] Using Docker network URL (kong:8000) - this is correct for containerized Edge Functions")
}
\`\`\`

### 2. Enhanced Service Key Verification

Added verification to ensure the service role key matches expected local format:

\`\`\`typescript
const expectedLocalKeyPrefix = "eyJhbGciOiJIUzI1NiIs"
const expectedLocalKeyLength = 164
const serviceKeyMatchesLocal = supabaseServiceKey && 
  supabaseServiceKey.startsWith(expectedLocalKeyPrefix) &&
  supabaseServiceKey.length === expectedLocalKeyLength
\`\`\`

### 3. Database Connection Error Handling

Added explicit error handling for connection failures:

\`\`\`typescript
if (testError) {
  console.error("[Edge Function] ⚠️ CRITICAL: Database connection failed!", {
    url: supabaseUrl,
    error: testError.message,
    hint: "If using kong:8000, this is correct for Docker. If using 127.0.0.1:54321, Edge Function container cannot reach host - use kong:8000 instead.",
  })
}
\`\`\`

## Why `kong:8000` Works

- **Docker Network**: Edge Function container and Supabase services are on the same Docker network
- **Hostname Resolution**: `kong` is the Docker network hostname for the Supabase API gateway
- **Port Mapping**: `8000` is the internal port on the Docker network
- **Container Isolation**: `127.0.0.1` from inside a container refers to the container itself, not the host

## Next Steps

1. **Verify Service Key**: Check Edge Function logs to ensure `serviceKeyMatchesLocal: true`
2. **Check Database Connection**: Ensure connection test succeeds with `kong:8000`
3. **Compare Data**: After successful connection, compare Edge Function data with direct queries
4. **If Still Mismatched**: Investigate if multiple Supabase instances are running or if there's connection pooling

## Files Changed

- `supabase/functions/sync-pokepedia/index.ts`:
  - Reverted URL normalization (keep `kong:8000` for Docker)
  - Added service key verification
  - Enhanced connection error handling

## Reference

- [Docker Networking](https://docs.docker.com/network/)
- Edge Functions run in Docker containers and use Docker network hostnames
- `kong:8000` is the correct URL for local Edge Functions
