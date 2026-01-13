# Queue System Activation Guide

**Phase 2**: Activate Queue-Based System for Incremental Sync

---

## Prerequisites

✅ Phase 1 Complete (Sprite Mirroring)
- Sprite repository mirroring script created
- Sprite URL resolution updated
- Storage bucket ready

✅ Database Migrations Applied
- `pokeapi_resources` table exists
- `pokepedia_pokemon` table exists
- `pokepedia_assets` table exists
- pgmq queues created (`pokepedia_ingest`, `pokepedia_sprites`)
- Helper functions exist (`get_pokepedia_queue_stats`, etc.)

---

## Activation Steps

### Step 1: Verify System Readiness

Run the activation check script:

```bash
tsx --env-file=.env.local scripts/activate-queue-system.ts
```

This will check:
- ✅ Queues exist
- ✅ Edge Functions are deployed
- ✅ Database tables exist
- ✅ Helper functions exist

### Step 2: Deploy Edge Functions

Deploy the three Edge Functions:

```bash
# Deploy seed function (discovers URLs)
supabase functions deploy pokepedia-seed

# Deploy worker function (processes resources)
supabase functions deploy pokepedia-worker

# Deploy sprite worker function (downloads sprites)
supabase functions deploy pokepedia-sprite-worker
```

**Note**: For production, ensure Edge Function secrets are set:
- `SUPABASE_URL` (auto-set by Supabase)
- `SERVICE_ROLE_KEY` (auto-set by Supabase)

### Step 3: Configure Cron Jobs

The cron jobs need `app.settings` to be configured. You have two options:

#### Option A: Set app.settings (Recommended for Production)

In Supabase Dashboard → Database → SQL Editor:

```sql
-- Set app settings for cron jobs
ALTER DATABASE postgres SET app.settings.supabase_url = 'https://your-project.supabase.co';
ALTER DATABASE postgres SET app.settings.service_role_key = 'your-service-role-key';
```

**Note**: Service role key should be stored securely. Consider using Supabase Secrets instead.

#### Option B: Update Cron Migration (For Local Development)

For local development, the migration already has defaults. For production, update the migration to use environment variables or Supabase Secrets.

### Step 4: Test the System

#### 4.1 Test Seed Function

Manually trigger seed for a small resource type:

```bash
curl -X POST https://your-project.supabase.co/functions/v1/pokepedia-seed \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "resourceTypes": ["type"],
    "limit": 50
  }'
```

**Expected**: Returns `{ ok: true, totalEnqueued: 20, perType: { type: 20 } }`

#### 4.2 Check Queue Depth

```sql
SELECT * FROM get_pokepedia_queue_stats();
```

**Expected**: `pokepedia_ingest` queue should have messages.

#### 4.3 Test Worker Function

Manually trigger worker:

```bash
curl -X POST https://your-project.supabase.co/functions/v1/pokepedia-worker \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "batchSize": 5,
    "concurrency": 2
  }'
```

**Expected**: Processes messages and stores in `pokeapi_resources` table.

#### 4.4 Verify Data

```sql
-- Check resources stored
SELECT resource_type, COUNT(*) 
FROM pokeapi_resources 
GROUP BY resource_type;

-- Check Pokemon projection
SELECT COUNT(*) FROM pokepedia_pokemon;

-- Check queue depth
SELECT * FROM get_pokepedia_queue_stats();
```

### Step 5: Enable Cron Jobs

Once testing is successful, enable cron jobs:

```sql
-- Check if cron jobs exist
SELECT * FROM get_pokepedia_cron_status();

-- If they don't exist, run the migration
-- supabase db push (will apply 20260113010001_setup_pokepedia_cron.sql)
```

**Cron Schedule**:
- `pokepedia-worker`: Every minute (drains `pokepedia_ingest` queue)
- `pokepedia-sprite-worker`: Every 2 minutes (drains `pokepedia_sprites` queue)

### Step 6: Monitor in Admin Dashboard

Navigate to `/admin` and check the Pokepedia Sync Status component:
- Queue depth for both queues
- Sync progress by resource type
- Cron job status
- Manual trigger buttons

---

## Workflow Overview

```
1. Seed Function (pokepedia-seed)
   ↓
   Discovers all PokeAPI resource URLs
   ↓
   Enqueues to pokepedia_ingest queue
   ↓
2. Worker Function (pokepedia-worker) [runs every minute]
   ↓
   Reads messages from pokepedia_ingest
   ↓
   Fetches resources from PokeAPI
   ↓
   Stores in pokeapi_resources (JSONB cache)
   ↓
   Updates pokepedia_pokemon projection
   ↓
   Enqueues sprites to pokepedia_sprites
   ↓
3. Sprite Worker (pokepedia-sprite-worker) [runs every 2 minutes]
   ↓
   Reads messages from pokepedia_sprites
   ↓
   Downloads sprites
   ↓
   Uploads to Supabase Storage
   ↓
   Records in pokepedia_assets
```

---

## Troubleshooting

### Queues Don't Exist

```sql
-- Create queues manually
SELECT pgmq.create('pokepedia_ingest');
SELECT pgmq.create('pokepedia_sprites');
```

### Edge Functions Return 404

- Verify functions are deployed: `supabase functions list`
- Check function URLs match your project
- Verify service role key is correct

### Cron Jobs Not Running

- Check `app.settings` are configured
- Verify pg_cron extension is enabled: `SELECT * FROM pg_extension WHERE extname = 'pg_cron';`
- Check cron job status: `SELECT * FROM get_pokepedia_cron_status();`
- View cron logs: `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;`

### Queue Messages Not Processing

- Check queue depth: `SELECT * FROM get_pokepedia_queue_stats();`
- Verify worker function is being called (check Edge Function logs)
- Check for errors in `pokeapi_resources` inserts
- Verify RLS policies allow service role writes

### High Queue Depth

- Increase worker concurrency: `{ "concurrency": 8 }`
- Increase batch size: `{ "batchSize": 20 }`
- Run worker more frequently (adjust cron schedule)

---

## Performance Tuning

### Worker Configuration

Default settings:
- `batchSize`: 10 messages per invocation
- `concurrency`: 4 parallel fetches
- `visibilityTimeout`: 300 seconds

For faster processing:
```json
{
  "batchSize": 20,
  "concurrency": 8,
  "visibilityTimeout": 600
}
```

### Sprite Worker Configuration

Default settings:
- `batchSize`: 10 messages per invocation
- `concurrency`: 3 parallel downloads
- `visibilityTimeout`: 600 seconds

For faster sprite syncing:
```json
{
  "batchSize": 15,
  "concurrency": 5,
  "visibilityTimeout": 900
}
```

---

## Monitoring

### Queue Metrics

```sql
-- Get queue depth and age
SELECT * FROM get_pokepedia_queue_stats();

-- Get detailed queue metrics
SELECT * FROM pgmq.metrics('pokepedia_ingest');
SELECT * FROM pgmq.metrics('pokepedia_sprites');
```

### Sync Progress

```sql
-- Get progress by resource type
SELECT * FROM get_pokepedia_sync_progress();

-- Count resources by type
SELECT resource_type, COUNT(*) 
FROM pokeapi_resources 
GROUP BY resource_type 
ORDER BY COUNT(*) DESC;
```

### Cron Status

```sql
-- Check cron job status
SELECT * FROM get_pokepedia_cron_status();

-- View recent cron runs
SELECT * FROM cron.job_run_details 
WHERE jobname IN ('pokepedia-worker', 'pokepedia-sprite-worker')
ORDER BY start_time DESC 
LIMIT 20;
```

---

## Next Steps After Activation

1. ✅ Run initial seed for all resource types
2. ✅ Monitor queue depth and processing rate
3. ✅ Verify data completeness in `pokeapi_resources`
4. ✅ Test sprite syncing (if Phase 1 not complete)
5. ✅ Proceed to Phase 3: Bulk Import Implementation

---

## Rollback Plan

If issues occur, you can:

1. **Disable cron jobs**:
   ```sql
   SELECT unschedule_pokepedia_cron();
   ```

2. **Clear queues** (if needed):
   ```sql
   -- Note: This will delete all pending messages
   -- Only do this if you want to start fresh
   SELECT pgmq.archive('pokepedia_ingest', 0);
   SELECT pgmq.archive('pokepedia_sprites', 0);
   ```

3. **Fall back to sync-pokepedia Edge Function**:
   - The current `sync-pokepedia` function remains available
   - Can coexist with queue system during transition

---

**Status**: Ready for Activation
