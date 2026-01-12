# Poképedia Sync System Overhaul

Complete overhaul of the PokéAPI to Supabase sync process using queue-based architecture.

## 🎯 Overview

This overhaul implements a robust, scalable queue-based sync system that:
- Uses **pgmq queues** for reliable background processing
- Stores **canonical JSONB cache** for complete data coverage
- Maintains **normalized tables** for fast queries
- Downloads **sprites to Supabase Storage** for local serving
- Provides **real-time monitoring** via admin dashboard

## 🏗️ Architecture

### Components

1. **pokepedia-seed** Edge Function
   - Discovers all PokéAPI resource URLs
   - Enqueues URLs respecting dependency ordering
   - Processes phases: master → reference → species → pokemon → relationships

2. **pokepedia-worker** Edge Function
   - Processes queue messages from `pokepedia_ingest`
   - Fetches resources from PokéAPI
   - Stores in `pokeapi_resources` (JSONB cache)
   - Updates `pokepedia_pokemon` projection table
   - Enqueues sprite URLs to `pokepedia_sprites` queue

3. **pokepedia-sprite-worker** Edge Function
   - Processes sprite download jobs from `pokepedia_sprites`
   - Downloads sprites from PokéAPI
   - Uploads to Supabase Storage bucket `pokedex-sprites`
   - Records metadata in `pokepedia_assets` table

### Database Schema

#### `pokeapi_resources` (Canonical JSONB Cache)
- Stores complete PokéAPI responses for any endpoint
- Indexed for fast lookups by resource_type, resource_key, name
- GIN index for JSONB queries

#### `pokepedia_pokemon` (Projection Table)
- Fast lookup table for Pokédex listing/search
- Contains essential fields: id, name, height, weight, sprites
- Optimized for UI queries

#### `pokepedia_assets` (Sprite Metadata)
- Tracks sprites stored in Supabase Storage
- Links source URLs to storage paths
- Prevents duplicate downloads

### Queues

- **pokepedia_ingest**: Resource URLs to process
- **pokepedia_sprites**: Sprite URLs to download

## 🚀 Usage

### 1. Seed the Queue

```bash
# Via Edge Function
curl -X POST http://127.0.0.1:54321/functions/v1/pokepedia-seed \
  -H "Authorization: Bearer <service-role-key>" \
  -H "Content-Type: application/json" \
  -d '{"limit": 200}'
```

Or use the admin dashboard: `/admin` → Poképedia Sync Status → "Seed Queue"

### 2. Process Resources

Workers run automatically via cron (every minute), or trigger manually:

```bash
# Process resource queue
curl -X POST http://127.0.0.1:54321/functions/v1/pokepedia-worker \
  -H "Authorization: Bearer <service-role-key>" \
  -H "Content-Type: application/json" \
  -d '{"batchSize": 10, "concurrency": 4}'

# Process sprite queue
curl -X POST http://127.0.0.1:54321/functions/v1/pokepedia-sprite-worker \
  -H "Authorization: Bearer <service-role-key>" \
  -H "Content-Type: application/json" \
  -d '{"batchSize": 10, "concurrency": 3}'
```

### 3. Monitor Progress

Visit `/admin` and view the "Poképedia Sync Status" card:
- Overall progress percentage
- Queue depths
- Progress by resource type
- Cron job status

## 📊 Monitoring Functions

### `get_pokepedia_queue_stats()`
Returns queue depths for monitoring.

### `get_pokepedia_sync_progress()`
Returns sync progress by resource type (synced vs estimated total).

## 🔧 Setup

### 1. Apply Migrations

```bash
supabase db push
```

### 2. Create Storage Bucket

In Supabase Dashboard → Storage:
- Create bucket: `pokedex-sprites`
- Set to **Public**

### 3. Set Edge Function Secrets

```bash
supabase secrets set SERVICE_ROLE_KEY="your-service-role-key"
supabase secrets set POKEAPI_BASE_URL="https://pokeapi.co/api/v2"
```

### 4. Deploy Edge Functions

```bash
supabase functions deploy pokepedia-seed --no-verify-jwt
supabase functions deploy pokepedia-worker --no-verify-jwt
supabase functions deploy pokepedia-sprite-worker --no-verify-jwt
```

### 5. Setup Cron Jobs

Cron jobs are configured in migration `20260113010001_setup_pokepedia_cron.sql`.

For local development, cron jobs may not work. Use manual triggers or the admin dashboard.

## 📝 Migration Files

- `20260113010000_create_pokepedia_queue_system.sql` - Tables, queues, functions
- `20260113010001_setup_pokepedia_cron.sql` - Cron job configuration

## 🎨 Admin Dashboard

The admin dashboard (`/admin`) includes:
- Real-time queue depth monitoring
- Sync progress by resource type
- Manual trigger buttons
- Cron job status

Component: `components/admin/pokepedia-sync-status.tsx`

## 🔄 Workflow

1. **Seed**: Run `pokepedia-seed` to discover and enqueue all resource URLs
2. **Process**: Workers automatically process queues (via cron or manual trigger)
3. **Sprites**: Sprite worker downloads and stores sprites in Storage
4. **Monitor**: Use admin dashboard to track progress

## 📚 Documentation

- `supabase/functions/pokepedia-seed/README.md`
- `supabase/functions/pokepedia-worker/README.md`
- `supabase/functions/pokepedia-sprite-worker/README.md`

## ✅ Benefits

1. **Reliability**: Queue-based processing prevents data loss
2. **Scalability**: Can process millions of resources without timeouts
3. **Completeness**: JSONB cache stores everything, normalized tables for speed
4. **Monitoring**: Real-time visibility into sync progress
5. **Resumability**: Failed jobs can be retried without starting over
6. **Sprite Management**: Local sprite serving via Supabase Storage

## 🔮 Future Enhancements

- Add normalized table writes to worker (currently only JSONB cache)
- Implement retry logic for failed messages
- Add dead-letter queue for permanently failed items
- Create sprite variant selection logic
- Add incremental sync (only fetch changed resources)
