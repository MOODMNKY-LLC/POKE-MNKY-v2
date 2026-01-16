# Performance Verification Checklist

> **Date**: 2026-01-17  
> **Status**: Ready for Verification

---

## ✅ Pre-Verification Checklist

### Infrastructure Setup

- [x] **Database Indexes**: Created via `supabase db push`
- [x] **Upstash Redis**: Created via Vercel Marketplace
  - Name: `poke-mnky-v2-cache`
  - Eviction: Enabled
  - Connected to project
- [x] **Environment Variables**: Set and pulled locally
  - `KV_URL` ✅
  - `KV_REST_API_TOKEN` ✅
- [x] **Code Deployed**: Latest deployment includes optimizations
  - Deployment: `dpl_4dmrKGHQp1nZxhzfFo2B95fTMXeN`
  - Status: READY
  - Commit: `951aaee` (homepage optimizations)

### Code Verification

- [x] **ISR Configured**: `app/page.tsx` has `revalidate = 60`
- [x] **Redis Caching**: `lib/cache/redis.ts` implemented
- [x] **Query Optimization**: Optimized column selection in queries
- [x] **Package Installed**: `@vercel/kv` in `package.json`

---

## 🧪 Verification Steps

### Step 1: Check Deployment Status

**Verify latest deployment is live:**
- URL: `https://poke-mnky.moodmnky.com`
- Deployment ID: `dpl_4dmrKGHQp1nZxhzfFo2B95fTMXeN`
- Status: Should be READY

**Check:**
```bash
# View deployment details
vercel inspect dpl_4dmrKGHQp1nZxhzfFo2B95fTMXeN
```

---

### Step 2: Test Homepage Performance

**Manual Testing:**

1. **First Load (Cache Miss)**
   - Visit: `https://poke-mnky.moodmnky.com`
   - Open Browser DevTools → Network tab
   - Expected: May take 1-2 seconds (uncached)
   - Check: Data loads correctly (teams, matches, pokemon)

2. **Second Load (Cache Hit)**
   - Refresh the page immediately
   - Expected: Should be < 500ms (cached)
   - Check: Network tab shows fast responses
   - Check: Data still loads correctly

3. **ISR Revalidation Test**
   - Wait 60 seconds
   - Refresh the page
   - Expected: Data updates (ISR revalidation)
   - Check: New data appears after refresh

**Performance Metrics to Check:**
- **First Contentful Paint (FCP)**: Should be < 1s
- **Largest Contentful Paint (LCP)**: Should be < 2.5s
- **Time to First Byte (TTFB)**: Should be < 200ms (cached)
- **Total Load Time**: Should be < 500ms (cached)

---

### Step 3: Verify Cache is Working

**Check Vercel Function Logs:**

1. Go to: Vercel Dashboard → Your Project → Deployments
2. Click on latest deployment
3. Go to **Functions** tab
4. Check logs for:
   - `[v0] Loaded all data from cache` (cache hit)
   - `[v0] Teams query` (cache miss, database query)

**Check Upstash Dashboard:**

1. Go to: Upstash Dashboard → Your Database
2. Check:
   - **Operations**: Should show read/write activity
   - **Memory Usage**: Should be minimal
   - **Keys**: Should show cache keys (`homepage:teams`, etc.)

---

### Step 4: Verify Database Performance

**Check Supabase Dashboard:**

1. Go to: Supabase Dashboard → Database → Query Performance
2. Check:
   - **Query Time**: Should be < 500ms (with indexes)
   - **Query Frequency**: Should drop significantly (90%+ reduction)
   - **Index Usage**: Verify indexes are being used

**Verify Indexes Exist:**

```sql
-- Run in Supabase SQL Editor
SELECT indexname 
FROM pg_indexes 
WHERE indexname IN (
  'idx_teams_wins_desc',
  'idx_matches_playoff_created_desc',
  'idx_matches_created_at_desc',
  'idx_pokemon_stats_kills_desc',
  'idx_matches_team1_id',
  'idx_matches_team2_id',
  'idx_matches_winner_id'
);
```

**Expected**: 7 indexes should be listed

---

### Step 5: Run Verification Scripts

**Local Verification:**

```bash
# Pull latest environment variables
vercel env pull .env.development.local

# Run verification (requires Supabase env vars)
pnpm verify:optimizations

# Run performance test
pnpm test:performance
```

**Expected Results:**
- ✅ ISR Configured: `revalidate=60`
- ✅ Redis: Configured and accessible
- ✅ Performance: 80-95% improvement with cache

---

## 📊 Performance Metrics to Monitor

### Before Optimization (Baseline)

- **Page Load Time**: 2-5 seconds
- **Database Queries**: Every request (4 queries)
- **Query Time**: 1-3 seconds per query
- **Cache Hit Rate**: 0%

### After Optimization (Target)

- **Page Load Time**: < 500ms (cached) / 1-2s (uncached)
- **Database Queries**: Every 60 seconds (ISR) or cache miss
- **Query Time**: 200-500ms per query (with indexes)
- **Cache Hit Rate**: 90%+ (after warm-up)

### Expected Improvements

- ✅ **5-10x faster** page loads (cached)
- ✅ **90%+ reduction** in database queries
- ✅ **50-80% faster** query execution
- ✅ **Better scalability** as data grows

---

## 🔍 Troubleshooting

### Issue: Page Still Slow

**Check:**
1. Is ISR working? Check `app/page.tsx` has `revalidate = 60`
2. Is Redis connected? Check environment variables exist
3. Are indexes created? Verify in Supabase
4. Check Vercel function logs for errors

### Issue: Cache Not Working

**Check:**
1. Environment variables: `vercel env ls | Select-String KV`
2. Redis connection: Check Upstash dashboard
3. Code deployed: Verify latest deployment includes cache code
4. Check logs: Look for cache errors in Vercel functions

### Issue: Database Queries Still Slow

**Check:**
1. Indexes exist: Run verification SQL query
2. Indexes being used: Check Supabase query performance
3. Run ANALYZE: `ANALYZE teams; ANALYZE matches; ANALYZE pokemon_stats;`

---

## 📈 Monitoring Setup

### Vercel Analytics

1. **Enable Analytics**
   - Vercel Dashboard → Your Project → Analytics
   - Enable "Web Analytics"

2. **Monitor Metrics**
   - Page Load Times
   - First Contentful Paint
   - Largest Contentful Paint

### Upstash Dashboard

1. **Monitor Cache**
   - Operations (read/write counts)
   - Memory Usage
   - Hit Rate (should be > 90%)

### Supabase Dashboard

1. **Monitor Queries**
   - Query Time (should be < 500ms)
   - Query Frequency (should drop 90%+)
   - Index Usage

---

## ✅ Success Criteria

### Deployment Successful When:

- [ ] Latest deployment is READY
- [ ] Homepage loads correctly
- [ ] Cache working (check logs)
- [ ] ISR revalidating (check after 60s)
- [ ] Performance improved (5-10x faster)
- [ ] Database queries reduced (90%+)

### Performance Targets Met When:

- [ ] Page load < 500ms (cached)
- [ ] Database queries < 500ms
- [ ] Cache hit rate > 90%
- [ ] No timeout errors
- [ ] Data freshness maintained (60s updates)

---

## 🎯 Next Steps After Verification

1. **Monitor for 24-48 hours**
   - Watch cache hit rates
   - Monitor query performance
   - Check for any errors

2. **Adjust if Needed**
   - Tune ISR revalidate time
   - Adjust cache TTLs
   - Optimize further if needed

3. **Document Results**
   - Record actual performance improvements
   - Note any issues encountered
   - Update documentation

---

**Ready to verify?** Follow steps 1-5 above, then check performance metrics! 🚀
