# Pokepedia Sync Migration and Design - Complete

## Summary

Successfully created migration to drop pokepedia sync functions and designed a new, simple sync approach.

---

## Migration Created

### File: `supabase/migrations/20260122000000_drop_pokepedia_sync_functions.sql`

**Functions Dropped**:
1. ✅ `get_pokepedia_sync_progress()`
2. ✅ `get_pokepedia_queue_stats()`
3. ✅ `get_pokepedia_cron_status()`
4. ✅ `broadcast_pokepedia_sync_progress()`
5. ✅ `notify_pokepedia_progress()`
6. ✅ `unschedule_pokepedia_cron()`
7. ✅ `check_existing_pokeapi_resources()`
8. ✅ `_trigger_pokepedia_worker()`
9. ✅ `_trigger_pokepedia_sprite_worker()`

**Functions Kept**:
- `pgmq_public_read()`, `pgmq_public_send_batch()`, `pgmq_public_delete()` - Generic wrappers, may be used elsewhere

**Tables Kept**:
- `pokeapi_resources` - Contains synced data, may be repurposed
- `pokepedia_pokemon` - Contains synced data, may be repurposed
- `pokepedia_resource_totals` - Contains metadata, may be repurposed

---

## New Sync Design

### Document: `docs/NEW-POKEPEDIA-SYNC-DESIGN.md`

**Key Features**:
- ✅ Simple TypeScript script (not Edge Function)
- ✅ Direct database writes (no queue)
- ✅ Batch processing with clear progress
- ✅ Only populate essential tables:
  - `pokemon_cache` (for draft system)
  - `pokemon` (for draft system)
  - `types` (master data, optional)

**Target Tables**:
1. **`pokemon_cache`** - Already exists with comprehensive schema
   - Primary key: `pokemon_id` (INTEGER)
   - Contains: name, types, base_stats, abilities, moves, sprites, etc.
   - Used by: Draft system, Pokedex page

2. **`pokemon`** - Already exists with UUID schema
   - Primary key: `id` (UUID)
   - Contains: name, type1, type2
   - Used by: Draft system (team_rosters foreign key)

3. **`types`** - Master data table (optional)
   - Used by: Type icons, type effectiveness

**Implementation Plan**:
1. **Phase 1**: Create sync script (`scripts/sync-pokemon-data.ts`)
2. **Phase 2**: Create master data sync script (if needed)
3. **Phase 3**: Ensure database schema is correct
4. **Phase 4**: Update data consumers

---

## Next Steps

1. ✅ **Migration Created** - Ready to apply
2. ⏳ **Apply Migration** - Run migration to drop functions
3. ⏳ **Create Sync Script** - Implement `scripts/sync-pokemon-data.ts`
4. ⏳ **Test Sync Script** - Test with small range (1-10 Pokemon)
5. ⏳ **Run Full Sync** - Sync all 1025 Pokemon
6. ⏳ **Update Data Consumers** - Verify draft system and pokedex work
7. ⏳ **Documentation** - Update README with sync instructions

---

## Migration Application

To apply the migration:

```bash
# Apply migration locally
supabase migration up

# Or apply to remote
supabase db push
```

---

## Sync Script Implementation (Pending)

The sync script will:
- Use PokeNode-ts MainClient for type-safe API access
- Fetch Pokemon 1-1025 from PokeAPI
- Process in batches of 50
- Write directly to `pokemon_cache` and `pokemon` tables
- Show clear progress: `[150/1025] Syncing Mewtwo... (14.6%)`
- Handle errors with retries
- Respect rate limits (100ms between requests)

**Usage**:
```bash
# Sync all Pokemon
npx tsx scripts/sync-pokemon-data.ts

# Sync with custom range
npx tsx scripts/sync-pokemon-data.ts --start 1 --end 100

# Sync with types
npx tsx scripts/sync-pokemon-data.ts --include-types
```

---

## Benefits

1. ✅ **Simpler** - Single script vs multiple Edge Functions + queue
2. ✅ **Debuggable** - Can run locally, see progress in real-time
3. ✅ **Reliable** - No queue complexity, direct database writes
4. ✅ **Faster** - No queue overhead, batch processing
5. ✅ **Maintainable** - Clear code, easy to understand
6. ✅ **Testable** - Can test with small ranges

---

## Files Created

1. ✅ `supabase/migrations/20260122000000_drop_pokepedia_sync_functions.sql`
2. ✅ `docs/NEW-POKEPEDIA-SYNC-DESIGN.md`
3. ✅ `docs/POKEPEDIA-SYNC-MIGRATION-AND-DESIGN-COMPLETE.md`

---

## Status

- ✅ Migration created and ready to apply
- ✅ New sync design documented
- ⏳ Sync script implementation pending (next step)
