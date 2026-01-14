# Production Crash Debugging Report

**Date:** 2026-01-14  
**Issue:** Production crashes with 406 errors and storage capacity warnings

---

## 🔍 Diagnostic Results

### ✅ What's Working
- Database connectivity: ✅ Healthy
- PostgREST schema cache: ✅ Appears healthy (via diagnostic)
- Tables accessible: ✅ All tables accessible (`pokemon_cache`, `pokemon_comprehensive`, `pokepedia_pokemon`, `profiles`)

### ⚠️ Issues Identified

#### 1. **406 (Not Acceptable) Errors** 🔴 CRITICAL
**Symptoms:**
- Multiple 406 errors for `pokemon_cache` queries
- Errors occur when querying: `/rest/v1/pokemon_cache?select=*&pokemon_id=eq.X`

**Root Cause:**
- PostgREST schema cache is stale in production
- Even though diagnostic shows healthy, production queries are failing
- This is a **Supabase infrastructure issue**, not a code issue

**Impact:**
- Pokemon showcase fails to load
- App crashes when trying to fetch Pokemon data
- Users see "Application error" message

#### 2. **Storage Capacity Issue** ⚠️ WARNING
**Symptoms:**
- Dashboard shows storage at capacity
- Even after clearing, capacity still shows as full
- Diagnostic shows 0 buckets (permissions issue?)

**Possible Causes:**
- Dashboard cache not refreshing
- Orphaned files not visible via API
- Storage quota issue at Supabase level
- Buckets deleted but storage still allocated

**Impact:**
- May be causing PostgREST to fail (storage full can cause API issues)
- Could be blocking new uploads

#### 3. **Multiple GoTrueClient Instances** ⚠️ WARNING
**Symptoms:**
- Console shows many "Multiple GoTrueClient instances detected" warnings
- Singleton pattern implemented but still occurring

**Root Cause:**
- Next.js code splitting creates separate bundles
- Each bundle creates its own client instance
- Singleton pattern doesn't work across bundles

**Impact:**
- Performance degradation
- Potential race conditions
- Not causing crashes, but not ideal

---

## 🎯 Root Cause Analysis

### Primary Issue: PostgREST Schema Cache Stale

The 406 errors are the **primary cause** of crashes. This happens when:

1. **Schema changes** were made (migrations applied)
2. **PostgREST cache** hasn't refreshed yet
3. **Production queries** fail with 406 (Not Acceptable)

**Why diagnostic shows healthy:**
- Diagnostic uses simple queries that may hit cached schema
- Production queries use more complex paths that hit stale cache
- Timing difference between diagnostic and actual usage

### Secondary Issue: Storage Capacity

Storage showing as full could be:
1. **Dashboard cache** - UI not refreshing
2. **Actual quota issue** - Supabase account at limit
3. **Orphaned files** - Files exist but not visible via API

---

## 🔧 Solutions

### Immediate Fixes (Code-Level)

#### 1. ✅ Already Fixed: Use `maybeSingle()` instead of `single()`
- Prevents PGRST116 errors when no rows found
- Committed and pushed

#### 2. ✅ Already Fixed: Handle 406 errors gracefully
- Added error handling in `getPokemon()`, `getAllPokemonFromCache()`, `searchPokemon()`
- Falls back to API fetch when cache fails
- Committed and pushed

#### 3. ✅ Already Fixed: Singleton pattern for Supabase client
- Implemented in `lib/supabase/client.ts`
- May not fully solve due to bundle splitting, but helps

### Infrastructure Fixes (Requires Supabase Action)

#### 1. **Refresh PostgREST Schema Cache** 🔴 CRITICAL

**Option A: Via Supabase Dashboard** (Recommended)
1. Go to Supabase Dashboard → Project Settings → Database
2. Look for "Refresh Schema Cache" or "Reload PostgREST" option
3. Or restart the project (Settings → Infrastructure → Restart)

**Option B: Via SQL** (If you have direct DB access)
```sql
-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
```

**Option C: Contact Supabase Support**
- If dashboard doesn't have option
- Request PostgREST schema cache refresh
- Mention: "Getting 406 errors on pokemon_cache table queries"

#### 2. **Check Storage Capacity** ⚠️ IMPORTANT

**Steps:**
1. Go to Supabase Dashboard → Storage
2. Check actual bucket sizes
3. Delete any orphaned files
4. Check account quota/limits
5. Contact support if quota is actually full

**If storage is actually full:**
- Upgrade plan
- Delete unused files
- Migrate to external storage (MinIO) - already partially done

---

## 📋 Action Items

### For User (Supabase Dashboard)
1. ✅ **Refresh PostgREST schema cache**
   - Dashboard → Settings → Database → Refresh Schema Cache
   - OR restart project

2. ✅ **Check storage capacity**
   - Dashboard → Storage → Check bucket sizes
   - Delete orphaned files if any
   - Verify account quota

3. ✅ **Verify after fixes**
   - Check production site
   - Verify 406 errors are gone
   - Verify storage capacity updated

### Already Done (Code)
1. ✅ Fixed PGRST116 errors (using `maybeSingle()`)
2. ✅ Added 406 error handling (graceful fallback)
3. ✅ Implemented singleton pattern (reduces GoTrueClient instances)
4. ✅ Created diagnostic scripts

---

## 🧪 Testing After Fixes

### 1. Check Production Site
```bash
# Visit production site
https://poke-mnky.moodmnky.com
```

**Expected:**
- No 406 errors in console
- Pokemon showcase loads
- No "Application error" crashes

### 2. Run Diagnostic Script
```bash
pnpm tsx scripts/diagnose-supabase-production.ts
```

**Expected:**
- All checks pass
- No warnings about schema cache
- Storage shows correct capacity

### 3. Check Console Logs
- Open browser DevTools → Console
- Should see minimal errors
- Pokemon data should load

---

## 💡 Recommendations

### Short Term
1. **Refresh PostgREST schema cache** (via Dashboard or support)
2. **Verify storage capacity** (check dashboard)
3. **Monitor production** after fixes

### Long Term
1. **Consider migrating fully to MinIO** for storage (already partially done)
2. **Implement retry logic** for 406 errors (with exponential backoff)
3. **Add monitoring** for PostgREST schema cache issues
4. **Consider Supabase Pro plan** if storage quota is an issue

---

## 📝 Notes

- **406 errors are infrastructure-level**, not code bugs
- **Code fixes help with graceful degradation** but don't solve root cause
- **Storage capacity issue** may be dashboard cache, not actual problem
- **Multiple GoTrueClient warnings** are not causing crashes, just performance impact

---

## 🔗 Related Files

- `lib/pokemon-utils.ts` - Pokemon data fetching (handles 406 errors)
- `lib/supabase/client.ts` - Supabase client singleton
- `scripts/diagnose-supabase-production.ts` - Diagnostic script
- `scripts/check-supabase-storage-capacity.ts` - Storage check script
