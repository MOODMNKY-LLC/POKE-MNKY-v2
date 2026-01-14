# Sync-Pokepedia Edge Function Analysis

**Date:** January 14, 2026  
**Status:** Analysis Complete

---

## Executive Summary

After analyzing the current sync infrastructure, the **`sync-pokepedia` edge function appears to be DEPRECATED** and can likely be removed. The application has migrated to a newer queue-based architecture that is more efficient and scalable.

---

## Current Sync Architecture

### NEW System (Active) ✅
**Edge Functions:**
- `pokepedia-seed` - Discovers and enqueues resource URLs
- `pokepedia-worker` - Processes queue messages, stores in `pokeapi_resources` (JSONB cache)
- `pokepedia-sprite-worker` - Downloads sprites to Supabase Storage

**Database Tables:**
- `pokeapi_resources` - Canonical JSONB cache for all PokéAPI resources
- `pokepedia_pokemon` - Fast projection table for UI queries
- `pokepedia_assets` - Sprite metadata

**Queues:**
- `pokepedia_ingest` - Resource URLs to process
- `pokepedia_sprites` - Sprite URLs to download

**Status:** ✅ **ACTIVE** - Used by admin dashboard (`components/admin/pokepedia-sync-status.tsx`)

---

### OLD System (Deprecated) ❌
**Edge Function:**
- `sync-pokepedia` - Chunked processing, uses `pokemon_comprehensive` table

**Database Tables:**
- `pokemon_comprehensive` - Legacy table (may still exist)
- `sync_jobs` - Tracks sync progress (used by old system)

**Status:** ❌ **DEPRECATED** - Still referenced in `hooks/use-pokepedia-sync.ts` but uses old architecture

---

## Evidence of Deprecation

### 1. Hook Still Uses Old System
**File:** `hooks/use-pokepedia-sync.ts`
- Line 511: Queries `pokemon_comprehensive` table
- Line 316: Triggers `/api/sync/pokepedia` (old edge function)
- Uses `sync_jobs` table for progress tracking

### 2. New System is Active
**File:** `components/admin/pokepedia-sync-status.tsx`
- Uses NEW queue-based system
- Queries `pokeapi_resources`, `pokepedia_pokemon` tables
- Calls `/api/pokepedia/seed`, `/api/pokepedia/worker` (new edge functions)

### 3. Comprehensive Status Hook Uses Both
**File:** `hooks/use-pokepedia-comprehensive-status.ts`
- Line 132: Tries `pokepedia_pokemon` first (NEW)
- Line 133: Falls back to `pokemon_comprehensive` (OLD)
- This suggests migration is in progress

---

## Recommendation

### Option 1: Complete Migration (Recommended)
1. ✅ **Remove `sync-pokepedia` edge function** - No longer needed
2. ✅ **Update `use-pokepedia-sync.ts`** - Remove references to old system
3. ✅ **Migrate any remaining data** from `pokemon_comprehensive` to `pokepedia_pokemon`
4. ✅ **Remove `sync_jobs` table** (or repurpose for new system if needed)
5. ✅ **Remove cron jobs** for old edge function

### Option 2: Keep for Backward Compatibility (Not Recommended)
- Maintains two sync systems
- Increases complexity
- Confusing for developers
- Higher maintenance burden

---

## Migration Checklist

If removing `sync-pokepedia`:

- [ ] Verify all data is in new tables (`pokeapi_resources`, `pokepedia_pokemon`)
- [ ] Update `use-pokepedia-sync.ts` to use new system or remove entirely
- [ ] Remove `sync-pokepedia` edge function
- [ ] Remove cron jobs for old edge function
- [ ] Update documentation
- [ ] Remove `/api/sync/pokepedia` route (if exists)

---

## Current State

**What's Using Old System:**
- `hooks/use-pokepedia-sync.ts` - Client-side sync hook
- `components/pokepedia-sync-provider.tsx` - Wraps app, uses old hook
- Banner/status indicators in header

**What's Using New System:**
- `components/admin/pokepedia-sync-status.tsx` - Admin dashboard
- `hooks/use-pokepedia-comprehensive-status.ts` - Status checking (prefers new)

---

## Conclusion

The `sync-pokepedia` edge function is **DEPRECATED** and should be removed after verifying data migration is complete. The new queue-based system (`pokepedia-seed`, `pokepedia-worker`, `pokepedia-sprite-worker`) is the active and recommended approach.

**Action Items:**
1. Verify data migration is complete
2. Update `use-pokepedia-sync.ts` to use new system or remove
3. Remove old edge function and related code
4. Update documentation
