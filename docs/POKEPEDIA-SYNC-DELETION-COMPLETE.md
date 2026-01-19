# Pokepedia Sync Deletion - Complete

## Summary

Successfully deleted all Pokepedia sync management code. The sync system was defunct and has been completely removed.

---

## Files Deleted

### Components (5 files)
✅ `components/admin/pokepedia-sync-status-new.tsx`
✅ `components/pokepedia-sync-status-readonly.tsx`
✅ `components/pokepedia-sync-provider.tsx`
✅ `components/pokepedia-comprehensive-status.tsx`
✅ `components/admin/sync-status.tsx`

### API Routes (6 files)
✅ `app/api/pokepedia/seed/route.ts`
✅ `app/api/pokepedia/worker/route.ts`
✅ `app/api/pokepedia/status/route.ts`
✅ `app/api/pokepedia/purge/route.ts`
✅ `app/api/sync/pokepedia/route.ts`
✅ `app/api/sync/pokepedia/local/route.ts`
✅ `app/api/sync/pokepedia/test/route.ts`

**Note**: `app/api/pokepedia/query/route.ts` was kept - it's for GraphQL queries, not sync.

### Edge Functions (5 directories)
✅ `supabase/functions/pokepedia-seed/`
✅ `supabase/functions/pokepedia-worker/`
✅ `supabase/functions/pokepedia-worker-improved/`
✅ `supabase/functions/sync-pokepedia/`
✅ `supabase/functions/pokepedia-sprite-worker/`

### Hooks (2 files)
✅ `hooks/use-pokepedia-sync.ts`
✅ `hooks/use-pokepedia-comprehensive-status.ts`

### Library Files (3 files)
✅ `lib/comprehensive-pokepedia-sync.ts`
✅ `lib/pokepedia-client.ts`
✅ `lib/pokepedia-offline-db.ts`

**Note**: `lib/pokeapi-client.ts` was kept - it's a generic PokeAPI client, not sync-specific.

### Scripts (3 files)
✅ `scripts/test-pokepedia-sync.ts`
✅ `scripts/test-pokepedia-sync-complete.ts`
✅ `scripts/build-pokepedia-projections.ts`

### Pages Updated (2 files)
✅ `app/admin/page.tsx` - Removed `PokepediaSyncStatusNew` import and usage
✅ `app/admin/pokepedia-dashboard/page.tsx` - Removed `PokepediaSyncStatus` import and usage

---

## Tables Identified

### Primary Sync Tables
1. `pokeapi_resources` - JSONB cache (14 rows currently)
2. `pokepedia_pokemon` - Normalized projection (0 rows currently)
3. `pokepedia_resource_totals` - Metadata (0 rows currently)
4. `pgmq.pokepedia_ingest` - Queue table

### Comprehensive Sync Tables (24+ tables)
- `types`, `abilities`, `moves`, `items`, `stats`
- `pokemon_species`, `pokemon_comprehensive`
- `pokemon_types`, `pokemon_abilities`, `pokemon_moves`, `pokemon_stats`
- `evolution_chains`, `pokemon_forms`
- `natures`, `egg_groups`, `growth_rates`
- `pokemon_colors`, `pokemon_habitats`, `pokemon_shapes`
- `sync_jobs`

### Tables Actually Used by App
- `pokemon_cache` - Draft system (pokemon_id, name, types)
- `pokemon` - Draft system (UUID id, name, type1, type2)

---

## Database Functions to Drop (Pending Migration)

The following database functions should be dropped via migration:

1. `get_pokepedia_sync_progress()`
2. `get_pokepedia_queue_stats()`
3. `broadcast_pokepedia_sync_progress()`
4. `check_existing_resources()`
5. `pgmq_public_read()` (if pokepedia-specific)
6. `pgmq_public_send_batch()` (if pokepedia-specific)
7. `pgmq_public_delete()` (if pokepedia-specific)

---

## Migrations to Review

The following migrations created pokepedia sync infrastructure and should be reviewed:

1. `20260113010000_create_pokepedia_queue_system.sql`
2. `20260113010001_setup_pokepedia_cron.sql`
3. `20260120000005_fix_pokepedia_function_permissions.sql`
4. `20260120000006_fix_pokepedia_cron_status_columns.sql`
5. `20260120000007_fix_pokepedia_queue_stats_columns.sql`
6. `20260120000015_fix_pokepedia_sync_progress_all_types.sql`
7. `20260120120000_remove_hardcoded_totals.sql`

**Note**: These migrations should be reviewed to determine if they should be:
- Kept (if tables/functions are used elsewhere)
- Reverted (if they only created pokepedia sync infrastructure)
- Modified (if they created shared infrastructure)

---

## Next Steps

1. ✅ **Deletion Complete** - All sync management code removed
2. ⏳ **Create Migration** - Drop pokepedia sync database functions
3. ⏳ **Design New Sync** - Create simple, efficient sync script
4. ⏳ **Implement New Sync** - Build new sync system
5. ⏳ **Update Data Consumers** - Update components/libs to use new tables
6. ⏳ **Test & Verify** - Ensure app still works with new sync

---

## New Sync Approach (Planned)

See `docs/POKEPEDIA-SYNC-DELETION-PLAN.md` for the planned new approach:

- Simple TypeScript script (not Edge Function)
- Direct database writes (no queue)
- Batch processing with clear progress
- Only populate essential tables:
  - `pokemon_cache` (for draft system)
  - `pokemon` (for draft system)
  - `types` (master data)
- Can run locally or via cron
- Clear logging and progress
- Single source of truth

---

## Total Deletion Count

- **Components**: 5 files deleted
- **API Routes**: 6 files deleted
- **Edge Functions**: 5 directories deleted
- **Hooks**: 2 files deleted
- **Library Files**: 3 files deleted
- **Scripts**: 3 files deleted
- **Pages**: 2 files updated

**Total**: ~24 files/directories deleted or updated
