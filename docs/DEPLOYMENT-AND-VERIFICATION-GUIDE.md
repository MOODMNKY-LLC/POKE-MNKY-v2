# Homepage Optimization - Deployment & Verification Guide

> **Date**: 2026-01-17  
> **Status**: Ready for Deployment

---

## Overview

This guide provides step-by-step instructions for deploying and verifying the homepage performance optimizations. Follow these steps in order to ensure everything is properly configured and working.

---

## Phase 1: Pre-Deployment Checklist

### 1.1 Install Dependencies

```bash
pnpm install
```

**Verify:**
- `@vercel/kv` is installed
- All dependencies resolve without errors

### 1.2 Review Code Changes

**Files Modified:**
- ✅ `app/page.tsx` - ISR + Redis caching + query optimization
- ✅ `lib/cache/redis.ts` - Redis utility (new)
- ✅ `package.json` - Added @vercel/kv dependency

**Files Created:**
- ✅ `supabase/migrations/20260117000003_homepage_performance_indexes.sql` - Database indexes
- ✅ `supabase/migrations/20260117000004_verify_indexes.sql` - Verification queries
- ✅ `scripts/verify-homepage-optimizations.ts` - Verification script
- ✅ `scripts/test-homepage-performance.ts` - Performance testing script

---

## Phase 2: Database Migration

### 2.1 Run Migration Locally (Recommended First)

**Option A: Supabase CLI**
```bash
supabase migration up
```

**Option B: Supabase Dashboard**
1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `supabase/migrations/20260117000003_homepage_performance_indexes.sql`
3. Paste and execute

**Option C: Supabase MCP**
```bash
# If you have Supabase MCP configured
# The migration will be applied automatically
```

### 2.2 Verify Indexes Were Created

**Run Verification Script:**
```bash
pnpm verify:optimizations
```

**Or Manually Check:**
```sql
-- Run in Supabase SQL Editor
SELECT indexname 
FROM pg_indexes 
WHERE indexname LIKE 'idx_%homepage%' 
   OR indexname IN (
     'idx_teams_wins_desc',
     'idx_matches_playoff_created_desc',
     'idx_matches_created_at_desc',
     'idx_pokemon_stats_kills_desc'
   );
```

**Expected Result:** All 7 indexes should exist

### 2.3 Test Index Usage

**Run Verification Queries:**
```bash
# Execute the verification migration
supabase migration up
```

**Or run queries manually:**
```sql
-- Check index usage statistics
SELECT 
  indexname,
  idx_scan as scans,
  idx_tup_read as tuples_read
FROM pg_stat_user_indexes
WHERE indexname LIKE 'idx_%homepage%'
   OR indexname IN (
     'idx_teams_wins_desc',
     'idx_matches_playoff_created_desc'
   );
```

---

## Phase 3: Vercel KV Setup (Redis)

### 3.1 Create Vercel KV Database

1. **Go to Vercel Dashboard**
   - Navigate to your project: `poke-mnky-v2`
   - Click on **Storage** tab
   - Click **Create Database**
   - Select **KV** (Key-Value)

2. **Configure KV Database**
   - **Name**: `poke-mnky-cache` (or your preferred name)
   - **Region**: Choose closest to your users (e.g., `us-east-1`)
   - Click **Create**

3. **Verify Environment Variables**
   - Vercel automatically adds:
     - `KV_URL`
     - `KV_REST_API_TOKEN`
   - These are available in your Next.js app automatically
   - No manual configuration needed!

### 3.2 Test Redis Connection

**After deployment, test Redis:**
```bash
# In your deployed app, Redis will auto-detect if KV_URL is set
# Check logs for: "[Cache] Redis enabled" or similar
```

**Or test locally:**
```bash
# Set environment variables (if testing locally)
export KV_URL=your-kv-url
export KV_REST_API_TOKEN=your-token

# Run performance test
pnpm test:performance
```

---

## Phase 4: Deploy to Vercel

### 4.1 Commit Changes

```bash
git add .
git commit -m "feat: Add homepage performance optimizations (indexes, ISR, Redis)"
git push
```

### 4.2 Deploy

**Option A: Automatic (Git Integration)**
- Push to main branch
- Vercel automatically deploys

**Option B: Manual Deploy**
```bash
vercel --prod
```

### 4.3 Monitor Deployment

**Watch for:**
- ✅ Build succeeds
- ✅ No errors in build logs
- ✅ Environment variables are set (KV_URL, KV_REST_API_TOKEN)

---

## Phase 5: Post-Deployment Verification

### 5.1 Run Verification Script

**In Production:**
```bash
# SSH to Vercel or use Vercel CLI
vercel env pull .env.production

# Run verification
pnpm verify:optimizations
```

**Expected Output:**
```
✅ Index: idx_teams_wins_desc: EXISTS
✅ Index: idx_matches_playoff_created_desc: EXISTS
✅ ISR Configured: revalidate=60
✅ Redis: Configured and accessible
✅ All critical checks passed!
```

### 5.2 Test Performance

**Run Performance Test:**
```bash
pnpm test:performance
```

**Expected Results:**
- Without Cache: 1000-2000ms
- With Cache (Hit): < 100ms
- Performance Improvement: 80-95% faster

### 5.3 Manual Testing

1. **Visit Homepage**
   - URL: `https://poke-mnky.moodmnky.com`
   - Check page load time (should be < 500ms after first load)

2. **Check Network Tab**
   - First load: May see database queries
   - Subsequent loads: Should be instant (cached)

3. **Verify Data Freshness**
   - Wait 60 seconds
   - Refresh page
   - Data should update (ISR revalidation)

---

## Phase 6: Monitoring Setup

### 6.1 Vercel Analytics

**Enable:**
1. Vercel Dashboard → Your Project → Analytics
2. Enable Web Analytics
3. Monitor page load times

**Key Metrics:**
- First Contentful Paint (FCP): Target < 1s
- Largest Contentful Paint (LCP): Target < 2.5s
- Time to First Byte (TTFB): Target < 200ms

### 6.2 Vercel KV Dashboard

**Monitor:**
1. Vercel Dashboard → Storage → Your KV Database
2. Check:
   - **Operations**: Read/write counts
   - **Memory Usage**: Should be minimal
   - **Hit Rate**: Should be > 90% after warm-up

### 6.3 Supabase Dashboard

**Monitor:**
1. Supabase Dashboard → Database → Query Performance
2. Check:
   - **Query Time**: Should be < 500ms
   - **Query Frequency**: Should drop significantly (90%+ reduction)
   - **Index Usage**: Verify indexes are being used

---

## Phase 7: Performance Validation

### 7.1 Baseline Metrics (Before)

**Record these before deployment:**
- Page Load Time: _____ seconds
- Database Queries per Request: _____
- Average Query Time: _____ ms
- Cache Hit Rate: 0%

### 7.2 Optimized Metrics (After)

**Record these after deployment:**
- Page Load Time: _____ seconds (should be < 0.5s cached)
- Database Queries per Request: _____ (should be 0 for cached requests)
- Average Query Time: _____ ms (should be < 500ms)
- Cache Hit Rate: _____ % (should be > 90%)

### 7.3 Calculate Improvements

```
Performance Improvement = ((Before - After) / Before) × 100%
Database Load Reduction = ((Before Queries - After Queries) / Before Queries) × 100%
```

**Expected Results:**
- ✅ 5-10x faster page loads
- ✅ 90%+ reduction in database queries
- ✅ 50-80% faster query execution

---

## Phase 8: Troubleshooting

### Issue: Indexes Not Created

**Symptoms:**
- Verification script shows indexes missing
- Queries still slow

**Solutions:**
1. Check migration ran successfully
2. Verify you have permissions to create indexes
3. Check Supabase logs for errors
4. Run migration manually in SQL Editor

### Issue: ISR Not Working

**Symptoms:**
- Page always dynamic
- No caching happening

**Solutions:**
1. Verify `revalidate` export exists (not `force-dynamic`)
2. Check Next.js build logs
3. Ensure production build (not dev mode)
4. Check Vercel deployment logs

### Issue: Redis Not Working

**Symptoms:**
- Cache always misses
- No Redis connection

**Solutions:**
1. Verify `KV_URL` and `KV_REST_API_TOKEN` in Vercel environment variables
2. Check Vercel KV database is created
3. Verify `@vercel/kv` package is installed
4. Check Redis utility logs

### Issue: Queries Still Slow

**Symptoms:**
- Queries taking > 1 second
- Indexes exist but not used

**Solutions:**
1. Run `ANALYZE` on tables:
   ```sql
   ANALYZE teams;
   ANALYZE matches;
   ANALYZE pokemon_stats;
   ```
2. Check query execution plans:
   ```sql
   EXPLAIN ANALYZE SELECT ... FROM teams ORDER BY wins DESC LIMIT 5;
   ```
3. Verify indexes are being used (should see "Index Scan" not "Seq Scan")

---

## Phase 9: Rollback Plan

### If Issues Occur

**Step 1: Disable ISR (Temporary)**
```typescript
// In app/page.tsx
export const dynamic = 'force-dynamic' // Revert ISR
```

**Step 2: Disable Redis (Temporary)**
```typescript
// In lib/cache/redis.ts
// The code already gracefully falls back if Redis unavailable
// Just ensure KV_URL is not set
```

**Step 3: Keep Indexes**
- Indexes don't hurt performance
- Keep them even if rolling back caching

**Step 4: Monitor**
- Watch for improvements
- Gradually re-enable features

---

## Phase 10: Success Criteria

### ✅ Deployment Successful When:

1. **Database:**
   - ✅ All indexes created
   - ✅ Indexes being used in queries
   - ✅ Query times < 500ms

2. **ISR:**
   - ✅ `revalidate` export set
   - ✅ Pages caching correctly
   - ✅ Revalidation happening every 60s

3. **Redis:**
   - ✅ Vercel KV database created
   - ✅ Environment variables set
   - ✅ Cache hits > 90%

4. **Performance:**
   - ✅ Page load < 500ms (cached)
   - ✅ Database queries reduced by 90%+
   - ✅ No timeout errors

5. **Monitoring:**
   - ✅ Analytics enabled
   - ✅ Metrics being tracked
   - ✅ Alerts configured (optional)

---

## Quick Reference Commands

```bash
# Install dependencies
pnpm install

# Run migration locally
supabase migration up

# Verify optimizations
pnpm verify:optimizations

# Test performance
pnpm test:performance

# Deploy to Vercel
vercel --prod

# Check environment variables
vercel env ls
```

---

## Next Steps After Deployment

1. **Monitor for 24-48 hours**
   - Watch cache hit rates
   - Monitor query performance
   - Check for any errors

2. **Adjust if Needed**
   - Tune ISR revalidate time
   - Adjust cache TTLs
   - Optimize further if needed

3. **Document Learnings**
   - Record actual performance improvements
   - Note any issues encountered
   - Update documentation

---

## Support & Resources

- **Vercel KV Docs**: https://vercel.com/docs/storage/vercel-kv
- **Next.js ISR Docs**: https://nextjs.org/docs/app/building-your-application/data-fetching/incremental-static-regeneration
- **Supabase Indexing**: https://supabase.com/docs/guides/database/postgres/indexes
- **Performance Monitoring**: Vercel Analytics Dashboard

---

**Ready to deploy?** Follow phases 1-10 in order, and you'll have a fully optimized homepage! 🚀
