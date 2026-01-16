# Next Steps Execution Plan - Homepage Performance Optimization

> **Date**: 2026-01-17  
> **Status**: Ready for Execution

---

## Executive Summary

This document provides a comprehensive, step-by-step execution plan for deploying and verifying the homepage performance optimizations. All code changes are complete; this guide focuses on deployment, testing, and validation.

---

## Phase 1: Immediate Actions (Do Now)

### Step 1.1: Install Dependencies

**Command:**
```bash
pnpm install
```

**What it does:**
- Installs `@vercel/kv` package for Redis caching
- Updates `package.json` with verification scripts

**Verification:**
```bash
# Check if package is installed
pnpm list @vercel/kv
```

**Expected Result:** Package listed in dependencies

---

### Step 1.2: Run Database Migration

**Option A: Supabase CLI (Recommended)**
```bash
supabase migration up
```

**Option B: Supabase Dashboard**
1. Go to: Supabase Dashboard → SQL Editor
2. Open: `supabase/migrations/20260117000003_homepage_performance_indexes.sql`
3. Copy entire contents
4. Paste into SQL Editor
5. Click "Run"

**Option C: Supabase MCP**
- If you have Supabase MCP configured, migrations run automatically
- Check Supabase dashboard to verify

**Verification:**
```bash
# Run verification script
pnpm verify:optimizations
```

**Or manually check:**
```sql
-- In Supabase SQL Editor
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

**Expected Result:** 7 indexes should exist

---

### Step 1.3: Verify Code Changes

**Check ISR Configuration:**
```bash
# Verify app/page.tsx has revalidate export
grep "export const revalidate" app/page.tsx
```

**Expected:** Should show `export const revalidate = 60`

**Check Redis Utility:**
```bash
# Verify Redis cache utility exists
ls lib/cache/redis.ts
```

**Expected:** File should exist

---

## Phase 2: Vercel KV Setup (Redis)

### Step 2.1: Create Vercel KV Database

**Steps:**
1. Go to: https://vercel.com/dashboard
2. Select your project: `poke-mnky-v2`
3. Click: **Storage** tab (left sidebar)
4. Click: **Create Database** button
5. Select: **KV** (Key-Value Database)
6. Configure:
   - **Name**: `poke-mnky-cache`
   - **Region**: Choose closest to users (e.g., `us-east-1`)
7. Click: **Create**

**What Happens:**
- Vercel automatically creates KV database
- Environment variables (`KV_URL`, `KV_REST_API_TOKEN`) are automatically added
- No manual configuration needed!

**Verification:**
- Go to: Vercel Dashboard → Your Project → Settings → Environment Variables
- Check: `KV_URL` and `KV_REST_API_TOKEN` should be listed

---

### Step 2.2: Test Redis Connection (After Deployment)

**After deploying to Vercel:**
1. Visit your homepage
2. Check Vercel function logs
3. Look for: Redis connection messages

**Or test locally:**
```bash
# Set environment variables (get from Vercel dashboard)
export KV_URL=your-kv-url
export KV_REST_API_TOKEN=your-token

# Run performance test
pnpm test:performance
```

---

## Phase 3: Deploy to Production

### Step 3.1: Commit Changes

```bash
git add .
git commit -m "feat: Add homepage performance optimizations

- Add database indexes for homepage queries
- Implement ISR caching (60s revalidate)
- Add Redis caching layer (Vercel KV)
- Optimize queries (select only needed columns)
- Add verification and testing scripts"
git push
```

### Step 3.2: Deploy

**Automatic (if Git integration enabled):**
- Push triggers automatic deployment
- Monitor: Vercel Dashboard → Deployments

**Manual:**
```bash
vercel --prod
```

### Step 3.3: Monitor Deployment

**Watch for:**
- ✅ Build completes successfully
- ✅ No errors in build logs
- ✅ Environment variables are available
- ✅ Deployment is live

---

## Phase 4: Verification & Testing

### Step 4.1: Run Verification Script

**After deployment:**
```bash
# Pull production environment variables
vercel env pull .env.production

# Run verification
pnpm verify:optimizations
```

**Expected Output:**
```
✅ Index: idx_teams_wins_desc: EXISTS (or warning if can't verify)
✅ Teams Query: 250ms (target: <500ms)
✅ ISR Configured: revalidate=60
✅ Redis: Configured and accessible
✅ All critical checks passed!
```

### Step 4.2: Performance Testing

**Run Performance Test:**
```bash
pnpm test:performance
```

**Expected Results:**
- Without Cache: 1000-2000ms (baseline)
- With Cache (Hit): < 100ms (optimized)
- Improvement: 80-95% faster

### Step 4.3: Manual Testing

**Test Homepage:**
1. Visit: `https://poke-mnky.moodmnky.com`
2. **First Load**: May take 1-2 seconds (uncached)
3. **Second Load**: Should be < 500ms (cached)
4. **After 60 seconds**: Refresh, should see updated data (ISR)

**Check Browser DevTools:**
- Network tab: Should show fast responses
- No timeout errors
- Data loads correctly

---

## Phase 5: Monitoring Setup

### Step 5.1: Vercel Analytics

**Enable:**
1. Vercel Dashboard → Your Project → Analytics
2. Enable **Web Analytics**
3. Monitor:
   - Page Load Times
   - First Contentful Paint
   - Largest Contentful Paint

**Target Metrics:**
- FCP: < 1 second
- LCP: < 2.5 seconds
- TTFB: < 200ms

### Step 5.2: Vercel KV Monitoring

**Monitor:**
1. Vercel Dashboard → Storage → Your KV Database
2. Check:
   - **Operations**: Read/write counts
   - **Memory Usage**: Should be minimal
   - **Hit Rate**: Should increase over time

**Target:** > 90% cache hit rate after warm-up

### Step 5.3: Supabase Monitoring

**Monitor:**
1. Supabase Dashboard → Database → Query Performance
2. Check:
   - **Query Time**: Should be < 500ms
   - **Query Frequency**: Should drop significantly
   - **Index Usage**: Verify indexes are being used

**Target:** 90%+ reduction in query frequency

---

## Phase 6: Validation Checklist

### ✅ Pre-Deployment Checklist

- [ ] Dependencies installed (`pnpm install`)
- [ ] Code changes reviewed
- [ ] Migration file created
- [ ] Verification scripts created

### ✅ Deployment Checklist

- [ ] Database migration executed
- [ ] Indexes verified (7 indexes exist)
- [ ] Vercel KV database created
- [ ] Environment variables set
- [ ] Code deployed to Vercel
- [ ] Build successful

### ✅ Post-Deployment Checklist

- [ ] Verification script passes
- [ ] Performance test shows improvements
- [ ] Homepage loads correctly
- [ ] Cache working (check logs)
- [ ] ISR revalidating (check after 60s)
- [ ] Monitoring enabled

### ✅ Performance Validation

- [ ] Page load time < 500ms (cached)
- [ ] Database queries reduced by 90%+
- [ ] Query times < 500ms
- [ ] Cache hit rate > 90%
- [ ] No timeout errors

---

## Phase 7: Troubleshooting Guide

### Issue: Migration Fails

**Symptoms:**
- Migration errors in Supabase
- Indexes not created

**Solutions:**
1. Check Supabase logs for specific error
2. Verify you have permissions to create indexes
3. Run migration manually in SQL Editor
4. Check for conflicting indexes

### Issue: ISR Not Working

**Symptoms:**
- Page always dynamic
- No caching

**Solutions:**
1. Verify `revalidate` export exists
2. Check Next.js build logs
3. Ensure production build (not dev)
4. Remove `force-dynamic` if present

### Issue: Redis Not Connecting

**Symptoms:**
- Cache always misses
- Redis errors in logs

**Solutions:**
1. Verify `KV_URL` and `KV_REST_API_TOKEN` in Vercel
2. Check Vercel KV database is created
3. Verify `@vercel/kv` package installed
4. Check Redis utility code

### Issue: Queries Still Slow

**Symptoms:**
- Queries > 1 second
- Indexes exist but not used

**Solutions:**
1. Run `ANALYZE` on tables:
   ```sql
   ANALYZE teams;
   ANALYZE matches;
   ANALYZE pokemon_stats;
   ```
2. Check query execution plans
3. Verify indexes are being used

---

## Phase 8: Success Metrics

### Before Optimization

**Baseline (Record These):**
- Page Load Time: _____ seconds
- Database Queries/Request: _____
- Average Query Time: _____ ms
- Cache Hit Rate: 0%

### After Optimization

**Target Metrics:**
- Page Load Time: < 0.5 seconds (cached)
- Database Queries/Request: < 0.1 (90%+ reduction)
- Average Query Time: < 500ms
- Cache Hit Rate: > 90%

### Calculate Improvements

```
Performance Improvement = ((Before - After) / Before) × 100%
Expected: 80-95% improvement
```

---

## Phase 9: Long-Term Maintenance

### Weekly Tasks

- [ ] Monitor cache hit rates
- [ ] Check query performance
- [ ] Review error logs
- [ ] Verify ISR revalidation

### Monthly Tasks

- [ ] Analyze index usage
- [ ] Optimize cache TTLs if needed
- [ ] Review query performance
- [ ] Update documentation

### Quarterly Tasks

- [ ] Review and optimize indexes
- [ ] Analyze cache effectiveness
- [ ] Plan further optimizations
- [ ] Update performance targets

---

## Quick Command Reference

```bash
# Install dependencies
pnpm install

# Run migration
supabase migration up

# Verify optimizations
pnpm verify:optimizations

# Test performance
pnpm test:performance

# Deploy to Vercel
vercel --prod

# Check environment variables
vercel env ls

# Pull production env vars
vercel env pull .env.production
```

---

## Support Resources

- **Vercel KV Docs**: https://vercel.com/docs/storage/vercel-kv
- **Next.js ISR**: https://nextjs.org/docs/app/building-your-application/data-fetching/incremental-static-regeneration
- **Supabase Indexing**: https://supabase.com/docs/guides/database/postgres/indexes
- **Performance Guide**: `docs/HOMEPAGE-PERFORMANCE-OPTIMIZATION.md`

---

## Conclusion

All code changes are complete and ready for deployment. Follow this guide step-by-step to:

1. ✅ Deploy database indexes
2. ✅ Set up Vercel KV (Redis)
3. ✅ Deploy optimized code
4. ✅ Verify everything works
5. ✅ Monitor performance

**Expected Result:** 5-10x faster homepage with 90%+ reduction in database load! 🚀
