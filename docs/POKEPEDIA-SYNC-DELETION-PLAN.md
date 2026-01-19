# Pokepedia Sync Deletion Plan

## Overview

The Pokepedia sync system is defunct and needs to be completely removed. This document identifies all tables, components, and code related to the sync system that should be deleted, and outlines a new efficient approach.

---

## Tables Intended to Be Populated

### Primary Tables (Queue-Based System)
1. **`pokeapi_resources`** - JSONB cache for all PokeAPI resources
   - Columns: `id`, `resource_type`, `resource_key`, `name`, `url`, `data` (JSONB), `fetched_at`, `updated_at`
   - Status: Currently has 14 rows (all "type" resources)

2. **`pokepedia_pokemon`** - Normalized Pokemon projection
   - Columns: `id`, `name`, `height`, `weight`, `base_experience`, `is_default`, `updated_at`, plus many more
   - Status: Currently empty (0 rows)

3. **`pokepedia_resource_totals`** - Metadata for sync totals
   - Columns: `resource_type`, `total_count`, `last_updated`, `source`
   - Status: Currently empty (0 rows)

4. **`pgmq.pokepedia_ingest`** - Message queue (pgmq extension)
   - Status: Queue table managed by pgmq

### Comprehensive Sync Tables (Additional Targets)
5. **`types`** - Master data table
6. **`abilities`** - Master data table
7. **`moves`** - Master data table
8. **`items`** - Master data table
9. **`stats`** - Master data table
10. **`pokemon_species`** - Pokemon species data
11. **`pokemon_comprehensive`** - Comprehensive Pokemon table
12. **`pokemon_types`** - Junction table (Pokemon ↔ Types)
13. **`pokemon_abilities`** - Junction table (Pokemon ↔ Abilities)
14. **`pokemon_moves`** - Junction table (Pokemon ↔ Moves)
15. **`pokemon_stats`** - Junction table (Pokemon ↔ Stats)
16. **`evolution_chains`** - Evolution chain data
17. **`pokemon_forms`** - Pokemon form variants
18. **`natures`** - Pokemon natures
19. **`egg_groups`** - Egg group data
20. **`growth_rates`** - Growth rate data
21. **`pokemon_colors`** - Pokemon color data
22. **`pokemon_habitats`** - Habitat data
23. **`pokemon_shapes`** - Shape data
24. **`sync_jobs`** - Job tracking table

### Tables Actually Used by App
- **`pokemon_cache`** - Used by draft system (pokemon_id, name, types)
- **`pokemon`** - Used by draft system (UUID id, name, type1, type2)
- **`pokepedia_pokemon`** - Used by pokedex page (if populated)

---

## Components & Code to DELETE

### Frontend Components (Sync Management)
1. **`components/admin/pokepedia-sync-status-new.tsx`** - New sync status component
2. **`components/admin/pokepedia-sync-status-readonly.tsx`** - Readonly sync status
3. **`components/pokepedia-sync-provider.tsx`** - Sync context provider
4. **`components/pokepedia-comprehensive-status.tsx`** - Comprehensive status display
5. **`components/admin/sync-status.tsx`** - Generic sync status (if pokepedia-specific)

### API Routes
1. **`app/api/pokepedia/seed/route.ts`** - Seed queue endpoint
2. **`app/api/pokepedia/worker/route.ts`** - Worker endpoint
3. **`app/api/pokepedia/status/route.ts`** - Status endpoint
4. **`app/api/pokepedia/purge/route.ts`** - Purge endpoint
5. **`app/api/pokepedia/query/route.ts`** - Query endpoint (if sync-related)
6. **`app/api/sync/pokepedia/route.ts`** - Legacy sync route
7. **`app/api/sync/pokepedia/local/route.ts`** - Local sync route
8. **`app/api/sync/pokepedia/test/route.ts`** - Test route

### Edge Functions
1. **`supabase/functions/pokepedia-seed/`** - Seed queue function
2. **`supabase/functions/pokepedia-worker/`** - Worker function
3. **`supabase/functions/pokepedia-worker-improved/`** - Improved worker (if exists)
4. **`supabase/functions/sync-pokepedia/`** - Comprehensive sync function
5. **`supabase/functions/pokepedia-sprite-worker/`** - Sprite worker (if sync-related)

### Hooks
1. **`hooks/use-pokepedia-sync.ts`** - Sync hook
2. **`hooks/use-pokepedia-comprehensive-status.ts`** - Status hook

### Library Files
1. **`lib/comprehensive-pokepedia-sync.ts`** - Comprehensive sync library
2. **`lib/pokepedia-client.ts`** - PokeAPI client wrapper (if sync-specific)
3. **`lib/pokepedia-offline-db.ts`** - Offline database (if sync-specific)
4. **`lib/pokeapi-client.ts`** - PokeAPI client (if sync-specific)

### Scripts
1. **`scripts/test-pokepedia-sync.ts`** - Test script
2. **`scripts/test-pokepedia-sync-complete.ts`** - Complete test script
3. **`scripts/build-pokepedia-projections.ts`** - Projection builder (if sync-specific)

### Database Functions (Migrations)
1. **`get_pokepedia_sync_progress()`** - Progress function
2. **`get_pokepedia_queue_stats()`** - Queue stats function
3. **`broadcast_pokepedia_sync_progress()`** - Progress broadcast function
4. **`check_existing_resources()`** - Resource check function
5. **`pgmq_public_read()`** - Queue read wrapper (if pokepedia-specific)
6. **`pgmq_public_send_batch()`** - Queue send wrapper (if pokepedia-specific)
7. **`pgmq_public_delete()`** - Queue delete wrapper (if pokepedia-specific)

### Migrations to Review/Delete
- `20260113010000_create_pokepedia_queue_system.sql`
- `20260113010001_setup_pokepedia_cron.sql`
- `20260120000005_fix_pokepedia_function_permissions.sql`
- `20260120000006_fix_pokepedia_cron_status_columns.sql`
- `20260120000007_fix_pokepedia_queue_stats_columns.sql`
- `20260120000015_fix_pokepedia_sync_progress_all_types.sql`
- `20260120120000_remove_hardcoded_totals.sql`
- Any other migrations with "pokepedia" in name

### Documentation to Archive
- `docs/POKEPEDIA-TABLES-DOCUMENTATION.md`
- `docs/POKEPEDIA-SYNC-FLOW.md`
- `docs/SYNC-FAILURE-ANALYSIS.md`
- `docs/POKEPEDIA-SYNC-REBUILD-SUMMARY.md`
- `docs/STUCK-VALUES-DIAGNOSIS.md`
- Any other pokepedia sync docs

---

## Components to KEEP (Data Consumers - May Need Updates)

### Frontend Components
1. **`components/pokemon-sprite.tsx`** - Uses pokepedia_pokemon or pokemon_cache
2. **`components/pokemon-type-icon.tsx`** - Uses types table
3. **`components/pokemon-item-icon.tsx`** - Uses items table
4. **`components/pokemon-compact-card.tsx`** - Uses pokemon data
5. **`components/draft/draft-pokemon-card.tsx`** - Uses pokemon data
6. **`components/site-header.tsx`** - May reference pokepedia (check)

### Library Files
1. **`lib/pokemon-utils.ts`** - Queries pokepedia_pokemon, needs update
2. **`lib/pokepedia-adapter.ts`** - Adapts pokepedia_pokemon data, needs update
3. **`lib/draft-system.ts`** - Uses pokemon_cache and pokemon tables
4. **`lib/pokemon-details.ts`** - Uses Pokemon data (may use PokeNode-ts directly)
5. **`lib/pokemon-stats.ts`** - Uses Pokemon stats

### Pages
1. **`app/pokedex/page.tsx`** - Uses getAllPokemonFromCache()
2. **`app/draft/board/page.tsx`** - Uses draft system
3. **`app/admin/page.tsx`** - Imports PokepediaSyncStatusNew (needs removal)
4. **`app/admin/pokepedia-dashboard/page.tsx`** - Imports PokepediaSyncStatus (needs removal)

---

## New Efficient Sync Approach

### Design Principles
1. **Simplicity** - Single script, no queues, no Edge Functions
2. **Direct Writes** - Write directly to database tables
3. **Clear Progress** - Console logging with progress bars
4. **Testable** - Can run locally, easy to debug
5. **Focused** - Only populate tables actually needed by app

### Target Tables (Minimal Set)
1. **`pokemon_cache`** - Essential for draft system
   - Columns: `pokemon_id`, `name`, `types` (array), `sprites`, `base_stats`
   
2. **`pokemon`** - Essential for draft system
   - Columns: `id` (UUID), `name`, `type1`, `type2`

3. **`types`** - Master data (if not already populated)
   - Columns: `type_id`, `name`, `damage_relations`

4. **`pokepedia_pokemon`** - Optional, for pokedex page
   - Can be populated from pokemon_cache if needed

### Implementation Plan
1. **Create `scripts/sync-pokemon-data.ts`**
   - Uses PokeNode-ts MainClient
   - Fetches Pokemon list (1-1025)
   - Batch processes in chunks of 50
   - Writes directly to `pokemon_cache` and `pokemon` tables
   - Populates `types` table if needed
   - Clear progress logging
   - Error handling with retries

2. **Create `scripts/sync-master-data.ts`** (if needed)
   - Syncs types, abilities, moves (master data)
   - Only if app actually needs these

3. **Create migration to clean up**
   - Drop pokepedia sync functions
   - Drop queue tables (if not used elsewhere)
   - Keep table schemas (they define what we need)

4. **Update data consumers**
   - Update `lib/pokemon-utils.ts` to use `pokemon_cache` instead of `pokepedia_pokemon`
   - Update components to use new table structure
   - Remove pokepedia-specific queries

### Benefits
- ✅ Simple, debuggable code
- ✅ No queue complexity
- ✅ No Edge Function overhead
- ✅ Clear progress and logging
- ✅ Can run locally or via cron
- ✅ Only populates what's needed
- ✅ Easy to test and verify

---

## Deletion Checklist

- [ ] Delete all sync management components
- [ ] Delete all sync API routes
- [ ] Delete all sync Edge Functions
- [ ] Delete all sync hooks
- [ ] Delete all sync library files
- [ ] Delete all sync scripts
- [ ] Remove pokepedia sync imports from pages
- [ ] Create migration to drop sync functions
- [ ] Archive sync documentation
- [ ] Purge sync data from tables
- [ ] Create new sync script
- [ ] Update data consumers
- [ ] Test new sync system

---

## Next Steps

1. Execute deletion plan
2. Design new sync script
3. Implement new sync script
4. Test and verify
5. Update documentation
