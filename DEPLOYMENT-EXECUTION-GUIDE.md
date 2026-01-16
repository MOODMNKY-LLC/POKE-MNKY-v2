# Homepage Optimization - Deployment Execution Guide

> **Status**: Ready to Execute  
> **Date**: 2026-01-17

---

## ✅ Step 1: Dependencies Installed

**Status**: ✅ **COMPLETE**

```bash
pnpm install
```

**Result**: `@vercel/kv@1.0.1` installed successfully

---

## 📋 Step 2: Run Database Migration

**Status**: ⏳ **PENDING - Manual Execution Required**

### Option A: Supabase Dashboard (Recommended)

1. **Go to Supabase Dashboard**
   - URL: https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**
   - Click "SQL Editor" in left sidebar
   - Click "New query"

3. **Run Migration**
   - Open file: `supabase/migrations/20260117000003_homepage_performance_indexes.sql`
   - Copy entire contents
   - Paste into SQL Editor
   - Click "Run" (or press Ctrl+Enter)

4. **Verify Indexes Created**
   - Run this query to verify:
   ```sql
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
   - Expected: 7 indexes should be listed

### Option B: Supabase CLI

```bash
supabase migration up
```

**Verification:**
```bash
pnpm verify:optimizations
```

---

## 📋 Step 3: Set Up Vercel KV (Redis)

**Status**: ⏳ **PENDING - Manual Execution Required**

### Steps:

1. **Go to Vercel Dashboard**
   - URL: https://vercel.com/dashboard
   - Select project: `poke-mnky-v2`

2. **Create KV Database**
   - Click **"Storage"** tab (left sidebar)
   - Click **"Create Database"** button
   - Select **"KV"** (Key-Value Database)

3. **Configure KV Database**
   - **Name**: `poke-mnky-cache`
   - **Region**: Choose closest to your users (e.g., `us-east-1`)
   - Click **"Create"**

4. **Verify Environment Variables**
   - Vercel automatically adds:
     - `KV_URL`
     - `KV_REST_API_TOKEN`
   - Check: Settings → Environment Variables
   - These are available automatically in your Next.js app

**Note**: No code changes needed - environment variables are automatically available!

---

## 📋 Step 4: Deploy Code Changes

**Status**: ⏳ **PENDING - Ready to Deploy**

### Check Current Status:

**Latest Deployment**: `dpl_H685752F6jF9D3PBJrbtZxpKEuKZ`
- **State**: READY
- **URL**: `poke-mnky.moodmnky.com`
- **Last Commit**: Mobile responsiveness and PWA optimization

### Deploy Changes:

**Option A: Git Push (Automatic)**
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

**Option B: Manual Deploy**
```bash
vercel --prod
```

**Monitor Deployment:**
- Vercel Dashboard → Deployments
- Watch for build completion
- Verify no errors in build logs

---

## 📋 Step 5: Verify Deployment

**Status**: ⏳ **PENDING - After Deployment**

### Run Verification Script:

```bash
pnpm verify:optimizations
```

**Expected Output:**
```
✅ Index: idx_teams_wins_desc: EXISTS (or warning)
✅ Teams Query: 250ms (target: <500ms)
✅ ISR Configured: revalidate=60
✅ Redis: Configured and accessible
✅ All critical checks passed!
```

### Run Performance Test:

```bash
pnpm test:performance
```

**Expected Results:**
- Without Cache: 1000-2000ms (baseline)
- With Cache (Hit): < 100ms (optimized)
- Improvement: 80-95% faster

### Manual Testing:

1. **Visit Homepage**
   - URL: `https://poke-mnky.moodmnky.com`
   - First load: May take 1-2 seconds
   - Second load: Should be < 500ms (cached)

2. **Check Browser DevTools**
   - Network tab: Fast responses
   - No timeout errors
   - Data loads correctly

3. **Verify ISR Revalidation**
   - Wait 60 seconds
   - Refresh page
   - Data should update (ISR working)

---

## 📊 Monitoring Setup

### Vercel Analytics

1. **Enable Analytics**
   - Vercel Dashboard → Your Project → Analytics
   - Enable "Web Analytics"

2. **Monitor Metrics**
   - Page Load Times
   - First Contentful Paint (FCP)
   - Largest Contentful Paint (LCP)

**Targets:**
- FCP: < 1 second
- LCP: < 2.5 seconds
- TTFB: < 200ms

### Vercel KV Dashboard

1. **Monitor Cache**
   - Vercel Dashboard → Storage → Your KV Database
   - Check:
     - Operations (read/write counts)
     - Memory Usage
     - Hit Rate (should be > 90% after warm-up)

### Supabase Dashboard

1. **Monitor Queries**
   - Supabase Dashboard → Database → Query Performance
   - Check:
     - Query Time (should be < 500ms)
     - Query Frequency (should drop 90%+)
     - Index Usage

---

## 🎯 Success Criteria

### ✅ Deployment Successful When:

- [ ] Database indexes created (7 indexes)
- [ ] Vercel KV database created
- [ ] Environment variables set (KV_URL, KV_REST_API_TOKEN)
- [ ] Code deployed to Vercel
- [ ] Verification script passes
- [ ] Performance test shows improvements
- [ ] Homepage loads correctly
- [ ] Cache working (check logs)
- [ ] ISR revalidating (check after 60s)

### 📈 Expected Performance:

- **Page Load**: < 500ms (cached)
- **Database Queries**: Reduced by 90%+
- **Query Time**: < 500ms
- **Cache Hit Rate**: > 90%

---

## 🆘 Troubleshooting

### Migration Fails

**Check:**
- Supabase logs for specific error
- Permissions to create indexes
- Run migration manually in SQL Editor

### Vercel KV Not Working

**Check:**
- KV_URL and KV_REST_API_TOKEN in environment variables
- Vercel KV database is created
- @vercel/kv package installed

### ISR Not Working

**Check:**
- `revalidate` export exists in app/page.tsx
- Not using `force-dynamic`
- Production build (not dev mode)

### Queries Still Slow

**Check:**
- Indexes exist and are being used
- Run `ANALYZE` on tables
- Check query execution plans

---

## 📚 Quick Reference

**Commands:**
```bash
# Install dependencies
pnpm install

# Verify optimizations
pnpm verify:optimizations

# Test performance
pnpm test:performance

# Deploy
git push
# Or: vercel --prod
```

**Documentation:**
- `docs/HOMEPAGE-PERFORMANCE-OPTIMIZATION.md` - Complete guide
- `docs/ISR-AND-REDIS-EXPLAINED.md` - Simple explanations
- `docs/DEPLOYMENT-AND-VERIFICATION-GUIDE.md` - Detailed steps

---

**Ready to proceed?** Follow steps 2-5 above! 🚀
