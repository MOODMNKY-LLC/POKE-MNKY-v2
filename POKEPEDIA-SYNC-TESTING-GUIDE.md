# Poképedia Sync System - Testing Guide

## ✅ Setup Complete

All components have been created and deployed:

### Database ✅
- ✅ Tables: `pokeapi_resources`, `pokepedia_pokemon`, `pokepedia_assets`
- ✅ Queues: `pokepedia_ingest`, `pokepedia_sprites`
- ✅ Functions: `get_pokepedia_queue_stats()`, `get_pokepedia_sync_progress()`
- ✅ Wrapper functions: `pgmq_public.send_batch()`, `pgmq_public.read()`, `pgmq_public.delete()`

### Edge Functions ✅
- ✅ `pokepedia-seed` - Deployed
- ✅ `pokepedia-worker` - Deployed
- ✅ `pokepedia-sprite-worker` - Deployed

### API Routes ✅
- ✅ `/api/pokepedia/seed` - Proxy to seed function
- ✅ `/api/pokepedia/worker` - Proxy to worker function
- ✅ `/api/pokepedia/sprite-worker` - Proxy to sprite worker function

### Admin Dashboard ✅
- ✅ `PokepediaSyncStatus` component integrated into `/admin`
- ✅ Real-time monitoring
- ✅ Manual trigger buttons

### Storage ✅
- ✅ Bucket configured in `config.toml`: `pokedex-sprites` (public)

## 🧪 Testing Steps

### 1. Verify Setup

Check that everything is in place:

\`\`\`sql
-- Verify tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('pokeapi_resources', 'pokepedia_pokemon', 'pokepedia_assets');

-- Verify queues exist
SELECT queue_name FROM pgmq.list_queues();

-- Verify wrapper functions exist
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'pgmq_public';
\`\`\`

### 2. Test Seed Function (Small Scale)

Start with a small test - seed only the "type" resource (20 items):

**Via Admin Dashboard:**
1. Visit `http://127.0.0.1:3000/admin`
2. Scroll to "Poképedia Sync Status" card
3. Click "Seed Queue" button
4. Monitor queue depth (should show ~20 messages)

**Via API:**
\`\`\`bash
curl -X POST http://127.0.0.1:3000/api/pokepedia/seed \
  -H "Content-Type: application/json" \
  -d '{"resourceTypes": ["type"], "limit": 20}'
\`\`\`

**Verify Queue:**
\`\`\`sql
SELECT COUNT(*) FROM pgmq.q_pokepedia_ingest;
-- Should show ~20 messages
\`\`\`

### 3. Test Worker Function

Process the queued messages:

**Via Admin Dashboard:**
1. Click "Process Worker" button
2. Monitor "Processed" count
3. Check "Progress by Resource Type" section

**Via API:**
\`\`\`bash
curl -X POST http://127.0.0.1:3000/api/pokepedia/worker \
  -H "Content-Type: application/json" \
  -d '{"batchSize": 5, "concurrency": 2}'
\`\`\`

**Verify Data:**
\`\`\`sql
-- Check resources were synced
SELECT resource_type, COUNT(*) 
FROM pokeapi_resources 
GROUP BY resource_type;

-- Check projection table
SELECT COUNT(*) FROM pokepedia_pokemon;
\`\`\`

### 4. Test Full Seed

Once small test works, seed all resources:

**Via Admin Dashboard:**
- Click "Seed Queue" (seeds all resource types)

**Via API:**
\`\`\`bash
curl -X POST http://127.0.0.1:3000/api/pokepedia/seed \
  -H "Content-Type: application/json" \
  -d '{"limit": 200}'
\`\`\`

This will enqueue ~15,000+ resource URLs.

### 5. Monitor Progress

**Via Admin Dashboard:**
- Real-time queue depths
- Progress by resource type
- Overall progress percentage

**Via SQL:**
\`\`\`sql
-- Queue stats
SELECT * FROM get_pokepedia_queue_stats();

-- Sync progress
SELECT * FROM get_pokepedia_sync_progress();
\`\`\`

### 6. Test Sprite Worker

After Pokemon resources are synced, sprites will be enqueued:

**Via Admin Dashboard:**
- Click "Process Sprites" button

**Via API:**
\`\`\`bash
curl -X POST http://127.0.0.1:3000/api/pokepedia/sprite-worker \
  -H "Content-Type: application/json" \
  -d '{"batchSize": 10, "concurrency": 3}'
\`\`\`

**Verify Sprites:**
\`\`\`sql
-- Check assets table
SELECT COUNT(*) FROM pokepedia_assets;

-- Check Storage bucket (via Dashboard or Storage API)
\`\`\`

## 🔍 Troubleshooting

### Edge Functions Not Found (404)

**Local Development:**
- Ensure `supabase start` is running
- Edge Functions are automatically served at `http://127.0.0.1:54321/functions/v1/`
- For local testing, use API routes (`/api/pokepedia/*`) instead

**Remote:**
- Functions are deployed to: `https://chmrszrwlfeqovwxyrmt.supabase.co/functions/v1/`
- Use API routes which handle both local and remote

### Queue Functions Not Found

If `pgmq_public` functions don't exist:
\`\`\`sql
-- Re-run the wrapper function migration
-- See: supabase/migrations/20260113010000_create_pokepedia_queue_system.sql
\`\`\`

### Storage Bucket Not Found

**Local:**
- Bucket is configured in `config.toml`
- Restart Supabase: `supabase stop && supabase start`

**Remote:**
- Create bucket via Dashboard: Storage → New Bucket
- Name: `pokedex-sprites`
- Public: ON

### Service Role Key Issues

**Local:**
- Secret is set: `supabase secrets list`
- Should see `SERVICE_ROLE_KEY`

**Remote:**
- Set via Dashboard: Project Settings → Edge Functions → Secrets
- Or CLI: `supabase secrets set SERVICE_ROLE_KEY="..." --project-ref <ref>`

## 📊 Expected Results

### After Full Seed:
- `pokepedia_ingest` queue: ~15,000+ messages
- Processing time: ~2-4 hours (depending on rate limits)

### After Worker Processing:
- `pokeapi_resources`: ~15,000+ records
- `pokepedia_pokemon`: ~1,025 records (Pokemon only)
- `pokepedia_sprites` queue: ~10,000+ sprite URLs

### After Sprite Worker:
- `pokepedia_assets`: ~10,000+ sprite records
- Storage bucket: ~10,000+ sprite files

## 🎯 Success Criteria

✅ Seed function enqueues URLs correctly
✅ Worker processes messages and stores data
✅ Data appears in `pokeapi_resources` table
✅ Pokemon projection table updates correctly
✅ Sprite URLs are enqueued for Pokemon
✅ Sprite worker downloads and stores sprites
✅ Admin dashboard shows real-time progress
✅ Queue depths decrease as processing continues

## 🚀 Next Steps After Testing

1. **Full Production Sync:**
   - Seed all resource types
   - Let workers process continuously
   - Monitor via admin dashboard

2. **Optimize Performance:**
   - Adjust batch sizes based on performance
   - Tune concurrency limits
   - Monitor queue depths

3. **Add Features:**
   - Incremental sync (only changed resources)
   - Retry logic for failed messages
   - Dead-letter queue for permanent failures
   - Sprite variant selection logic

4. **Production Deployment:**
   - Set up cron jobs (already configured in migration)
   - Monitor via Supabase Dashboard
   - Set up alerts for queue depths
