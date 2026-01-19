# Pokepedia Sync - Complete Inventory

## Tables Intended to Be Populated

### Primary Sync Tables (Queue-Based)
1. ✅ **`pokeapi_resources`** - JSONB cache (14 rows currently)
2. ✅ **`pokepedia_pokemon`** - Normalized projection (0 rows currently)
3. ✅ **`pokepedia_resource_totals`** - Metadata (0 rows currently)
4. ✅ **`pgmq.pokepedia_ingest`** - Queue table

### Comprehensive Sync Tables
5. ✅ **`types`** - Master data
6. ✅ **`abilities`** - Master data
7. ✅ **`moves`** - Master data
8. ✅ **`items`** - Master data
9. ✅ **`stats`** - Master data
10. ✅ **`pokemon_species`** - Species data
11. ✅ **`pokemon_comprehensive`** - Comprehensive Pokemon
12. ✅ **`pokemon_types`** - Junction table
13. ✅ **`pokemon_abilities`** - Junction table
14. ✅ **`pokemon_moves`** - Junction table
15. ✅ **`pokemon_stats`** - Junction table
16. ✅ **`evolution_chains`** - Evolution data
17. ✅ **`pokemon_forms`** - Form variants
18. ✅ **`natures`** - Natures
19. ✅ **`egg_groups`** - Egg groups
20. ✅ **`growth_rates`** - Growth rates
21. ✅ **`pokemon_colors`** - Colors
22. ✅ **`pokemon_habitats`** - Habitats
23. ✅ **`pokemon_shapes`** - Shapes
24. ✅ **`sync_jobs`** - Job tracking

### Tables Actually Used by App
- ✅ **`pokemon_cache`** - Draft system (pokemon_id, name, types)
- ✅ **`pokemon`** - Draft system (UUID id, name, type1, type2)

---

## Files to DELETE

### Components (5 files)
1. `components/admin/pokepedia-sync-status-new.tsx`
2. `components/admin/pokepedia-sync-status-readonly.tsx`
3. `components/pokepedia-sync-provider.tsx`
4. `components/pokepedia-comprehensive-status.tsx`
5. `components/admin/sync-status.tsx` (if pokepedia-specific)

### API Routes (8 files)
1. `app/api/pokepedia/seed/route.ts`
2. `app/api/pokepedia/worker/route.ts`
3. `app/api/pokepedia/status/route.ts`
4. `app/api/pokepedia/purge/route.ts`
5. `app/api/pokepedia/query/route.ts` (if sync-related)
6. `app/api/sync/pokepedia/route.ts`
7. `app/api/sync/pokepedia/local/route.ts`
8. `app/api/sync/pokepedia/test/route.ts`

### Edge Functions (5 directories)
1. `supabase/functions/pokepedia-seed/`
2. `supabase/functions/pokepedia-worker/`
3. `supabase/functions/pokepedia-worker-improved/` (if exists)
4. `supabase/functions/sync-pokepedia/`
5. `supabase/functions/pokepedia-sprite-worker/` (if sync-related)

### Hooks (2 files)
1. `hooks/use-pokepedia-sync.ts`
2. `hooks/use-pokepedia-comprehensive-status.ts`

### Library Files (4 files)
1. `lib/comprehensive-pokepedia-sync.ts`
2. `lib/pokepedia-client.ts` (if sync-specific)
3. `lib/pokepedia-offline-db.ts` (if sync-specific)
4. `lib/pokeapi-client.ts` (if sync-specific)

### Scripts (3 files)
1. `scripts/test-pokepedia-sync.ts`
2. `scripts/test-pokepedia-sync-complete.ts`
3. `scripts/build-pokepedia-projections.ts` (if sync-specific)

### Pages to Update (2 files)
1. `app/admin/page.tsx` - Remove `PokepediaSyncStatusNew` import and usage
2. `app/admin/pokepedia-dashboard/page.tsx` - Remove `PokepediaSyncStatus` import and usage

---

## Database Functions to Drop

1. `get_pokepedia_sync_progress()`
2. `get_pokepedia_queue_stats()`
3. `broadcast_pokepedia_sync_progress()`
4. `check_existing_resources()`
5. `pgmq_public_read()` (if pokepedia-specific)
6. `pgmq_public_send_batch()` (if pokepedia-specific)
7. `pgmq_public_delete()` (if pokepedia-specific)

---

## Migrations to Review/Delete

1. `20260113010000_create_pokepedia_queue_system.sql`
2. `20260113010001_setup_pokepedia_cron.sql`
3. `20260120000005_fix_pokepedia_function_permissions.sql`
4. `20260120000006_fix_pokepedia_cron_status_columns.sql`
5. `20260120000007_fix_pokepedia_queue_stats_columns.sql`
6. `20260120000015_fix_pokepedia_sync_progress_all_types.sql`
7. `20260120120000_remove_hardcoded_totals.sql`

---

## Summary

- **Tables**: 24+ tables intended, but only 2-3 actually needed by app
- **Components**: 5 sync management components to delete
- **API Routes**: 8 routes to delete
- **Edge Functions**: 5 functions to delete
- **Hooks**: 2 hooks to delete
- **Library Files**: 4 files to delete
- **Scripts**: 3 scripts to delete
- **Pages**: 2 pages need import removal
- **Database Functions**: 7 functions to drop
- **Migrations**: 7 migrations to review/delete

**Total Files to Delete**: ~35+ files
**Total Directories to Delete**: 5 Edge Function directories
