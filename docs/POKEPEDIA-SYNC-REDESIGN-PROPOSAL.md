# PokéPedia Sync Redesign Proposal

**Date**: January 20, 2026  
**Status**: 🔄 **PROPOSED SOLUTION**  
**Priority**: 🔴 **CRITICAL**

---

## 🎯 Executive Summary

**Problem**: Current sync system fails with 40-44 errors per chunk, syncing 0 items due to rate limiting.

**Solution**: Switch to existing pgmq-based queue system with sequential processing and intelligent rate limiting.

**Expected Results**:
- ✅ Reliable sync (no rate limit errors)
- ✅ ~200-400 items/min throughput
- ✅ Complete sync in 10-20 minutes
- ✅ Can resume after failures
- ✅ Better error tracking

---

## 🔍 Root Cause Analysis

### Current System Issues

1. **Too Many Concurrent Requests**
   - Processes 4 endpoints in parallel (Group 1)
   - Each endpoint processes 10+ items concurrently
   - Total: 40+ simultaneous requests
   - **Result**: Rate limiting from PokeAPI

2. **No Rate Limiting**
   - No delays between batches
   - No adaptive backoff
   - **Result**: Consistent failures

3. **Edge Function Timeout Limits**
   - 50-second timeout forces chunking
   - Chunks too large (20-100 items)
   - **Result**: Timeouts and failures

4. **Poor Error Handling**
   - Errors counted but not logged
   - No per-item error tracking
   - **Result**: Cannot debug issues

### Research Findings

**PokeAPI Rate Limits**:
- REST API: No official limits, but recommends caching
- GraphQL: 100 requests/hour/IP
- Best practice: Cache resources, respect rate limits

**Best Practices**:
- Sequential processing with delays (200-500ms)
- Exponential backoff on errors
- ETag caching (304 Not Modified)
- Queue-based processing
- Batch database inserts

---

## 💡 Proposed Solution

### Architecture: Queue-Based Sequential Sync

**Use existing pgmq infrastructure** (already exists in codebase!)

```
┌─────────────────┐
│  Seed Function  │─── Fetches resource lists, enqueues URLs
│ pokepedia-seed  │    (Fast: ~1-2 minutes)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  pgmq Queue     │─── Stores resource URLs
│ pokepedia_ingest│    (Persistent, resumable)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Worker Function │─── Processes items sequentially
│pokepedia-worker │    (Controlled rate: 1 req/300ms)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Database      │─── Stores synced data
│pokeapi_resources│    (Batch inserts every 20 items)
└─────────────────┘
```

### Key Improvements

1. **Sequential Processing**
   - Process 1 item at a time
   - 300ms delay between requests
   - Natural rate limiting (~200 req/min)

2. **ETag Caching**
   - Check ETag before fetching
   - Skip unchanged resources (304)
   - Reduces API calls by 50-80%

3. **Better Error Handling**
   - Log errors per item
   - Retry with exponential backoff
   - Continue processing other items

4. **Resumable**
   - Queue persists failures
   - Can resume after Edge Function restart
   - No data loss

---

## 🚀 Implementation Plan

### Phase 1: Improve Existing Worker (Quick Fix)

**File**: `supabase/functions/pokepedia-worker/index.ts`

**Changes**:
1. **Remove concurrency**: Process items sequentially
2. **Add rate limiting**: 300ms delay between requests
3. **Improve ETag support**: Check cache before fetching
4. **Better error logging**: Log errors to sync_jobs.error_log
5. **Batch inserts**: Collect 20 items, insert together

**Expected Time**: 30 minutes  
**Impact**: Immediate improvement, uses existing infrastructure

### Phase 2: Improve Seed Function (Enhancement)

**File**: `supabase/functions/pokepedia-seed/index.ts`

**Changes**:
1. **Add priority**: Enqueue master data first
2. **Better resource discovery**: Fetch all resource types
3. **Skip existing**: Check if already synced

**Expected Time**: 20 minutes  
**Impact**: Faster initial sync, better organization

### Phase 3: Add Monitoring (Optional)

**New**: Add sync status tracking

**Changes**:
1. Track queue depth
2. Monitor sync progress
3. Alert on failures

**Expected Time**: 30 minutes  
**Impact**: Better visibility

---

## 📊 Comparison: Current vs Proposed

| Metric | Current System | Proposed System |
|--------|---------------|-----------------|
| **Concurrency** | 40+ simultaneous | 1 sequential |
| **Rate Limiting** | None | 300ms delay |
| **Error Rate** | 40-44/chunk | 0-1% |
| **Items Synced** | 0/min | ~200/min |
| **Completion Time** | Never | 10-20 min |
| **Resumable** | No | Yes |
| **Error Tracking** | None | Per-item |
| **ETag Support** | Partial | Full |

---

## 🔧 Technical Details

### Worker Function Changes

```typescript
// OLD: Concurrent processing
await withConcurrency(messages, concurrency, async (msg) => {
  // Process in parallel
});

// NEW: Sequential processing with rate limiting
for (const msg of messages) {
  // Process one at a time
  await processMessage(msg);
  await delay(300); // Rate limiting
}
```

### Rate Limiting Strategy

```typescript
const RATE_LIMIT_MS = 300; // 200 requests/minute
const BATCH_SIZE = 20; // Items to collect before DB insert

let batch: any[] = [];

for (const msg of messages) {
  const result = await processMessage(msg);
  batch.push(result);
  
  // Batch insert every 20 items
  if (batch.length >= BATCH_SIZE) {
    await batchInsert(batch);
    batch = [];
  }
  
  // Rate limiting delay
  await delay(RATE_LIMIT_MS);
}
```

### ETag Optimization

```typescript
// Check ETag cache before fetching
const cachedEtag = await getCachedETag(url);

if (cachedEtag) {
  const response = await fetch(url, {
    headers: { 'If-None-Match': cachedEtag }
  });
  
  if (response.status === 304) {
    // Resource unchanged, skip fetch
    return { cached: true };
  }
}

// Fetch and store ETag
const response = await fetch(url);
const etag = response.headers.get('ETag');
await storeCachedETag(url, etag);
```

### Error Logging

```typescript
const errors: Array<{ url: string; error: string }> = [];

try {
  await processMessage(msg);
} catch (error) {
  errors.push({
    url: msg.url,
    error: error.message
  });
  
  // Log to sync_jobs.error_log
  await logError(jobId, errors);
}
```

---

## 📈 Expected Performance

### Throughput Calculation

**Sequential Processing**:
- 1 request per 300ms = 200 requests/minute
- With ETag caching (50% hit rate) = 100 API calls/minute
- Effective throughput: ~100-200 items/minute

**Total Items to Sync**:
- Master data: ~200 items (types, abilities, moves, stats)
- Reference data: ~50 items (generations, colors, habitats)
- Pokemon: ~1,351 items
- **Total**: ~1,600 items

**Estimated Time**:
- Without caching: ~8 minutes
- With 50% caching: ~4-6 minutes
- **Realistic**: 10-20 minutes (including retries, DB inserts)

### Comparison to Current

**Current**: 0 items/min (failing)  
**Proposed**: 100-200 items/min (working)  
**Improvement**: ∞ (from failing to working)

---

## ✅ Benefits

1. **Reliability**: Sequential processing avoids rate limits
2. **Speed**: Actually completes (vs current: never completes)
3. **Resumable**: Queue persists, can resume after failures
4. **Better Errors**: Per-item error tracking
5. **Efficient**: ETag caching reduces API calls
6. **Simple**: Uses existing pgmq infrastructure
7. **Maintainable**: Simpler code, easier to debug

---

## 🚨 Migration Path

### Step 1: Stop Current Sync
```sql
-- Mark current sync job as failed
UPDATE sync_jobs 
SET status = 'failed', 
    error_log = '{"reason": "Migrating to queue-based sync"}'
WHERE sync_type = 'pokepedia' AND status = 'running';
```

### Step 2: Deploy Improved Worker
- Update `pokepedia-worker` with sequential processing
- Deploy Edge Function
- Test with small batch

### Step 3: Seed Queue
```bash
# Trigger seed function
curl -X POST http://localhost:54321/functions/v1/pokepedia-seed \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"resourceTypes": ["type", "ability", "move", "pokemon"]}'
```

### Step 4: Process Queue
```bash
# Trigger worker (will process sequentially)
curl -X POST http://localhost:54321/functions/v1/pokepedia-worker \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"batchSize": 1, "concurrency": 1}'
```

### Step 5: Monitor Progress
```sql
-- Check queue depth
SELECT COUNT(*) FROM pgmq.pokepedia_ingest;

-- Check sync progress
SELECT COUNT(*) FROM pokeapi_resources;
```

---

## 📋 Implementation Checklist

### Phase 1: Quick Fix (30 min)
- [ ] Update `pokepedia-worker` to process sequentially
- [ ] Add 300ms delay between requests
- [ ] Improve ETag checking
- [ ] Add error logging
- [ ] Test with small batch

### Phase 2: Enhancements (20 min)
- [ ] Improve seed function
- [ ] Add priority queuing
- [ ] Better resource discovery
- [ ] Skip already-synced items

### Phase 3: Monitoring (30 min)
- [ ] Add queue depth tracking
- [ ] Add sync progress monitoring
- [ ] Add error alerting

---

## 🎯 Success Criteria

1. ✅ Sync completes successfully
2. ✅ No rate limit errors
3. ✅ All resources synced
4. ✅ Error rate < 1%
5. ✅ Completion time < 20 minutes
6. ✅ Can resume after failures

---

## 📚 References

- **PokeAPI Docs**: https://pokeapi.co/docs/v2
- **Rate Limiting Best Practices**: Research findings
- **pgmq Documentation**: Existing in codebase
- **Current Worker**: `supabase/functions/pokepedia-worker/index.ts`
- **Current Seed**: `supabase/functions/pokepedia-seed/index.ts`

---

## 🚀 Next Steps

1. **Review this proposal** - Confirm approach
2. **Implement Phase 1** - Quick fix to existing worker
3. **Test** - Verify sync works
4. **Deploy** - Roll out to production
5. **Monitor** - Track performance

---

**Recommendation**: Implement Phase 1 immediately (30 min fix) to get sync working, then enhance with Phase 2-3.
