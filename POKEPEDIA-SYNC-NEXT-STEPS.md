# Poképedia Sync - Next Steps & Verification

## ✅ Completed Setup

### Database ✅
- ✅ Tables created: `pokeapi_resources`, `pokepedia_pokemon`, `pokepedia_assets`
- ✅ Queues created: `pokepedia_ingest`, `pokepedia_sprites`
- ✅ Wrapper functions: `pgmq_public.send_batch()`, `pgmq_public.read()`, `pgmq_public.delete()`
- ✅ Monitoring functions: `get_pokepedia_queue_stats()`, `get_pokepedia_sync_progress()`

### Edge Functions ✅
- ✅ `pokepedia-seed` - Deployed to remote
- ✅ `pokepedia-worker` - Deployed to remote
- ✅ `pokepedia-sprite-worker` - Deployed to remote

### API Routes ✅
- ✅ `/api/pokepedia/seed` - Server-side proxy
- ✅ `/api/pokepedia/worker` - Server-side proxy
- ✅ `/api/pokepedia/sprite-worker` - Server-side proxy

### Admin Dashboard ✅
- ✅ Component integrated into `/admin`
- ✅ Uses API routes (works locally and remotely)

### Storage ✅
- ✅ Bucket configured in `config.toml`: `pokedex-sprites` (public)

### Secrets ✅
- ✅ `SERVICE_ROLE_KEY` set locally

## 🧪 Testing Instructions

### Option 1: Via Admin Dashboard (Recommended)

1. **Start your Next.js dev server:**
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

2. **Visit Admin Dashboard:**
   - Navigate to `http://127.0.0.1:3000/admin`
   - Scroll to "Poképedia Sync Status" card

3. **Test Seed:**
   - Click "Seed Queue" button
   - Wait a few seconds
   - Click "Refresh" to see queue depth increase

4. **Test Worker:**
   - Click "Process Worker" button
   - Monitor "Processed" count
   - Check "Progress by Resource Type"

5. **Monitor Progress:**
   - Dashboard auto-refreshes every 5 seconds
   - Watch queue depths decrease
   - Watch sync progress increase

### Option 2: Via API Routes

**Test Seed:**
```bash
curl -X POST http://127.0.0.1:3000/api/pokepedia/seed \
  -H "Content-Type: application/json" \
  -d '{"resourceTypes": ["type"], "limit": 20}'
```

**Test Worker:**
```bash
curl -X POST http://127.0.0.1:3000/api/pokepedia/worker \
  -H "Content-Type: application/json" \
  -d '{"batchSize": 5, "concurrency": 2}'
```

**Test Sprite Worker:**
```bash
curl -X POST http://127.0.0.1:3000/api/pokepedia/sprite-worker \
  -H "Content-Type: application/json" \
  -d '{"batchSize": 5, "concurrency": 2}'
```

### Option 3: Direct Edge Function Calls (Remote)

If testing against remote deployment:

```bash
# Seed
curl -X POST https://chmrszrwlfeqovwxyrmt.supabase.co/functions/v1/pokepedia-seed \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"resourceTypes": ["type"], "limit": 20}'

# Worker
curl -X POST https://chmrszrwlfeqovwxyrmt.supabase.co/functions/v1/pokepedia-worker \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"batchSize": 5, "concurrency": 2}'
```

## 🔍 Verification Queries

### Check Queue Depths
```sql
SELECT * FROM get_pokepedia_queue_stats();
```

### Check Sync Progress
```sql
SELECT * FROM get_pokepedia_sync_progress();
```

### Check Synced Resources
```sql
SELECT resource_type, COUNT(*) 
FROM pokeapi_resources 
GROUP BY resource_type 
ORDER BY resource_type;
```

### Check Pokemon Projection
```sql
SELECT COUNT(*) FROM pokepedia_pokemon;
SELECT * FROM pokepedia_pokemon LIMIT 10;
```

### Check Sprite Assets
```sql
SELECT COUNT(*) FROM pokepedia_assets;
SELECT * FROM pokepedia_assets LIMIT 10;
```

## 🚀 Production Deployment Checklist

### Local Testing ✅
- [x] Tables created
- [x] Queues created
- [x] Functions deployed
- [x] API routes created
- [x] Admin dashboard integrated
- [x] Storage bucket configured
- [x] Secrets set

### Remote Deployment
- [ ] Push migrations: `supabase db push`
- [ ] Deploy functions: `supabase functions deploy pokepedia-seed --no-verify-jwt` (repeat for worker, sprite-worker)
- [ ] Set secrets: `supabase secrets set SERVICE_ROLE_KEY="..." --project-ref <ref>`
- [ ] Create Storage bucket via Dashboard
- [ ] Verify cron jobs are scheduled (migration `20260113010001_setup_pokepedia_cron.sql`)

### Testing Production
- [ ] Test seed function (small scale first)
- [ ] Test worker function
- [ ] Monitor queue depths
- [ ] Verify data in tables
- [ ] Test sprite worker
- [ ] Verify sprites in Storage

## 📊 Expected Timeline

### Small Test (type resource only - 20 items):
- Seed: < 1 second
- Worker: ~5-10 seconds
- Total: < 15 seconds

### Full Sync (all resources - ~15,000 items):
- Seed: ~30-60 seconds
- Worker: ~2-4 hours (depending on rate limits)
- Sprite Worker: ~1-2 hours
- Total: ~3-6 hours

## 🎯 Success Indicators

✅ Seed enqueues URLs correctly
✅ Worker processes messages
✅ Data appears in `pokeapi_resources`
✅ Pokemon projection table updates
✅ Sprites are enqueued
✅ Sprite worker downloads sprites
✅ Admin dashboard shows progress
✅ Queue depths decrease over time

## 🔧 Troubleshooting

### Functions Return 404
- **Local**: Ensure Next.js dev server is running
- **Remote**: Check function deployment status in Dashboard

### Queue Functions Error
- Verify `pgmq_public` schema exists
- Check wrapper functions are created
- Re-run migration if needed

### Storage Upload Fails
- Verify bucket exists: `SELECT * FROM storage.buckets WHERE name = 'pokedex-sprites'`
- Check bucket is public
- Verify service role key has Storage permissions

### No Data Synced
- Check queue has messages: `SELECT COUNT(*) FROM pgmq.q_pokepedia_ingest`
- Check worker logs in Edge Function logs
- Verify PokéAPI is accessible

## 📝 Notes

- **Local Development**: Use API routes (`/api/pokepedia/*`) - they work with local Supabase
- **Remote Deployment**: Functions are deployed and can be called directly or via API routes
- **Cron Jobs**: Configured in migration but may need manual setup in production Dashboard
- **Storage**: Bucket must be created manually in Dashboard for remote (configured in config.toml for local)

## 🎉 Ready to Test!

Everything is set up and ready. Start with a small test (type resource only) to verify the flow, then proceed with full sync.

Visit `/admin` to use the dashboard, or use the API routes for programmatic testing.
