# PokéPedia Sync Quick Fix Implementation Guide

**Date**: January 20, 2026  
**Status**: 🚀 **READY TO IMPLEMENT**  
**Time Estimate**: 30 minutes

---

## 🎯 Quick Fix Summary

**Problem**: Current sync fails with 40-44 errors per chunk due to rate limiting.

**Solution**: Use improved worker function with sequential processing and rate limiting.

**Expected Result**: Sync completes successfully in 10-20 minutes.

---

## 📋 Implementation Steps

### Step 1: Deploy Improved Worker Function

**Option A: Deploy as new function** (Recommended for testing)
```bash
# Copy improved worker
cp supabase/functions/pokepedia-worker-improved/index.ts supabase/functions/pokepedia-worker-improved/index.ts

# Deploy
supabase functions deploy pokepedia-worker-improved
```

**Option B: Update existing worker** (Production)
```bash
# Backup current worker
cp supabase/functions/pokepedia-worker/index.ts supabase/functions/pokepedia-worker/index.ts.backup

# Replace with improved version
# (Copy improved code to existing file)
```

### Step 2: Seed Queue

```bash
# Trigger seed function to populate queue
curl -X POST http://localhost:54321/functions/v1/pokepedia-seed \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "resourceTypes": ["type", "ability", "move", "stat", "pokemon"],
    "limit": null
  }'
```

**Or via API route**:
```bash
curl -X POST http://localhost:3000/api/pokepedia/seed \
  -H "Content-Type: application/json" \
  -d '{"resourceTypes": ["type", "ability", "move", "stat", "pokemon"]}'
```

### Step 3: Process Queue with Improved Worker

```bash
# Process queue sequentially with rate limiting
curl -X POST http://localhost:54321/functions/v1/pokepedia-worker-improved \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "batchSize": 10,
    "visibilityTimeout": 300,
    "rateLimitMs": 300
  }'
```

**Or via API route** (if created):
```bash
curl -X POST http://localhost:3000/api/pokepedia/worker-improved \
  -H "Content-Type: application/json" \
  -d '{"batchSize": 10, "rateLimitMs": 300}'
```

### Step 4: Monitor Progress

**Check queue depth**:
```sql
SELECT COUNT(*) as queue_depth 
FROM pgmq.pokepedia_ingest;
```

**Check sync progress**:
```sql
SELECT 
  resource_type,
  COUNT(*) as count
FROM pokeapi_resources
GROUP BY resource_type
ORDER BY count DESC;
```

**Check for errors**:
```sql
SELECT 
  resource_type,
  COUNT(*) as count,
  MIN(fetched_at) as first_sync,
  MAX(fetched_at) as last_sync
FROM pokeapi_resources
GROUP BY resource_type;
```

### Step 5: Set Up Cron Job (Optional)

**For continuous processing**, set up a cron job:

```sql
-- Create cron job to process queue every minute
SELECT cron.schedule(
  'pokepedia-worker-improved',
  '* * * * *', -- Every minute
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/pokepedia-worker-improved',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := jsonb_build_object(
      'batchSize', 10,
      'rateLimitMs', 300
    )
  );
  $$
);
```

---

## 🔧 Configuration Options

### Rate Limiting

**Conservative** (200 req/min):
```json
{
  "rateLimitMs": 300
}
```

**Moderate** (300 req/min):
```json
{
  "rateLimitMs": 200
}
```

**Aggressive** (400 req/min):
```json
{
  "rateLimitMs": 150
}
```

### Batch Size

**Small batches** (safer):
```json
{
  "batchSize": 5
}
```

**Medium batches** (balanced):
```json
{
  "batchSize": 10
}
```

**Large batches** (faster):
```json
{
  "batchSize": 20
}
```

---

## 📊 Expected Performance

### Throughput

**Sequential Processing**:
- 1 request per 300ms = 200 requests/minute
- With ETag caching (50% hit rate) = 100 API calls/minute
- Effective throughput: ~100-200 items/minute

### Completion Time

**Total Items**: ~1,600 (master data + Pokemon)

**Estimated Time**:
- Without caching: ~8 minutes
- With 50% caching: ~4-6 minutes
- **Realistic**: 10-20 minutes (including retries, DB inserts)

---

## ✅ Verification

### Check Sync Status

```sql
-- Queue depth (should decrease over time)
SELECT COUNT(*) FROM pgmq.pokepedia_ingest;

-- Synced resources
SELECT 
  resource_type,
  COUNT(*) as count
FROM pokeapi_resources
GROUP BY resource_type;

-- Recent syncs
SELECT 
  resource_type,
  COUNT(*) as count,
  MAX(fetched_at) as last_sync
FROM pokeapi_resources
WHERE fetched_at > NOW() - INTERVAL '1 hour'
GROUP BY resource_type;
```

### Test Small Batch

```bash
# Process just 5 items to verify it works
curl -X POST http://localhost:54321/functions/v1/pokepedia-worker-improved \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"batchSize": 5, "rateLimitMs": 300}'
```

**Expected response**:
```json
{
  "ok": true,
  "processed": 5,
  "failed": 0,
  "rateLimitMs": 300
}
```

---

## 🚨 Troubleshooting

### Issue: Queue Not Emptying

**Check**:
1. Worker function is running
2. No errors in Edge Function logs
3. Rate limit is appropriate

**Fix**:
- Increase `rateLimitMs` if getting errors
- Check Edge Function logs for specific errors
- Verify PokeAPI is accessible

### Issue: Still Getting Errors

**Check**:
1. Rate limit too aggressive
2. Network issues
3. PokeAPI down

**Fix**:
- Increase `rateLimitMs` to 500ms
- Check PokeAPI status
- Verify network connectivity

### Issue: Sync Too Slow

**Check**:
1. Rate limit too conservative
2. ETag caching not working
3. Database inserts slow

**Fix**:
- Decrease `rateLimitMs` to 200ms (if no errors)
- Verify ETag cache is working
- Check database performance

---

## 📈 Monitoring

### Key Metrics

1. **Queue Depth**: Should decrease over time
2. **Processed Items**: Should increase
3. **Error Rate**: Should be < 1%
4. **Completion Time**: Should be < 20 minutes

### Logs to Watch

```bash
# Edge Function logs
supabase functions logs pokepedia-worker-improved --follow

# Look for:
# - "[Worker] Processing X messages"
# - "[ETag] Resource unchanged"
# - "[Worker] Processed: X, Failed: Y"
```

---

## 🎯 Success Criteria

- ✅ Queue empties successfully
- ✅ All resources synced
- ✅ Error rate < 1%
- ✅ Completion time < 20 minutes
- ✅ No rate limit errors

---

## 🚀 Next Steps After Quick Fix

1. **Monitor**: Watch sync complete successfully
2. **Verify**: Check all resources synced
3. **Optimize**: Adjust rate limit if needed
4. **Enhance**: Add Phase 2-3 improvements (see main proposal)

---

**Ready to implement!** Start with Step 1 and work through the steps.
