# Edge Function Analysis & Connectivity Test

## Edge Function: `sync-pokepedia`

### What It Does

The edge function (`supabase/functions/sync-pokepedia/index.ts`) is a comprehensive Pokepedia sync system that:

1. **Processes Sync Jobs in Chunks**
   - Handles chunked processing to respect Edge Function timeout limits
   - Processes one chunk per invocation (default: 50 items per chunk)
   - Can process multiple chunks in a loop if `continueUntilComplete: true`

2. **Sync Phases**
   - **master**: Types, abilities, moves, stats, egg-groups, growth-rates
   - **reference**: Generations, pokemon-colors, pokemon-habitats, pokemon-shapes
   - **species**: Pokemon species (depends on reference data)
   - **pokemon**: Pokemon data (depends on species)
   - **evolution-chain**: Evolution chain data
   - **items**: Item data
   - **berries**: Berry data
   - **pokemon-form**: Pokemon form data
   - And more...

3. **Updates sync_jobs Table**
   - Tracks progress: `current_chunk`, `total_chunks`, `progress_percent`
   - Updates `pokemon_synced` count
   - Updates `last_heartbeat` timestamp (every chunk)
   - Marks as `completed` when all chunks processed

4. **Broadcasts via Realtime**
   - Sends `sync_progress` events
   - Sends `sync_complete` events

### Configuration

**Environment Variables Required**:
- `SUPABASE_URL` - Supabase project URL (auto-populated by CLI)
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (auto-populated by CLI)
- `POKEAPI_BASE_URL` - PokeAPI base URL (defaults to https://pokeapi.co/api/v2)

**Local Development**:
- Edge Function runs via: `supabase functions serve sync-pokepedia --no-verify-jwt`
- Uses Docker network hostname `kong:8000` when containerized
- Uses `127.0.0.1:54321` when running locally

### How It's Triggered

1. **Manual Trigger** (via API route):
   - POST to `/api/sync/pokepedia`
   - Body: `{ action: "start", phase: "master", priority: "standard", continueUntilComplete: true }`
   - Creates new sync job or continues existing one

2. **Cron Trigger**:
   - Processes next chunk of active job
   - Runs every 5 minutes (if configured)

### Connectivity Test

**Test Endpoint**: `/api/sync/pokepedia/test`

**What It Tests**:
1. Database connectivity (queries `sync_jobs` table)
2. Edge Function accessibility (calls edge function endpoint)
3. Configuration (checks env variables)

**Expected Response**:
\`\`\`json
{
  "connected": true,
  "database": {
    "connected": true,
    "canQuery": true
  },
  "edgeFunction": {
    "url": "http://localhost:54321/functions/v1/sync-pokepedia",
    "accessible": true,
    "status": 200,
    "isLocal": true
  }
}
\`\`\`

### Proper Configuration Checklist

- ✅ Edge Function file exists: `supabase/functions/sync-pokepedia/index.ts`
- ✅ API route exists: `app/api/sync/pokepedia/route.ts`
- ✅ Environment variables set: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- ⚠️ Edge Function running locally: `supabase functions serve sync-pokepedia --no-verify-jwt`
- ⚠️ Edge Function deployed (production): Deployed via `supabase functions deploy sync-pokepedia`

### Common Issues

1. **Edge Function Not Running Locally**
   - Error: "Edge Function call failed: fetch failed"
   - Solution: Run `supabase functions serve sync-pokepedia --no-verify-jwt`

2. **Missing Environment Variables**
   - Error: "Missing Supabase configuration"
   - Solution: Check `.env.local` has `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

3. **Wrong URL for Local Development**
   - Error: Connection refused
   - Solution: Ensure using `127.0.0.1:54321` or `localhost:54321` (not `kong:8000` from client)

---

**Status**: Edge Function properly configured, connectivity test endpoint created at `/api/sync/pokepedia/test`
