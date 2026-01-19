# Draft Pool Generation Column Fix

**Date**: January 19, 2026  
**Issue**: `column draft_pool.generation does not exist`  
**Status**: ✅ Fixed

---

## Problem

The `generation` column was removed from `draft_pool` table in migration `20260119105458_remote_schema.sql`, but the code was still trying to query it directly, causing errors:

```
Error: column draft_pool.generation does not exist
```

---

## Root Cause

**Migration**: `20260119105458_remote_schema.sql` line 42
```sql
alter table "public"."draft_pool" drop column "generation";
```

**Code Issues**:
1. `lib/draft-system.ts` line 160: `.select("pokemon_name, point_value, generation, status")`
2. `lib/draft-system.ts` line 315: `.select("pokemon_name, point_value, generation, pokemon_id, status")`
3. `lib/draft-system.ts` line 330: `.eq("generation", filters.generation)`
4. `lib/free-agency.ts` line 72: `.select("pokemon_id, pokemon_name, point_value, generation, status")`
5. `lib/free-agency.ts` line 83: `.eq("generation", filters.generation)`

---

## Solution

**Approach**: Fetch generation separately from `pokemon_cache` table

**Why**: 
- `generation` is available in `pokemon_cache` table
- `draft_pool` has `pokemon_id` FK that references `pokemon_cache.pokemon_id`
- Can also match by name as fallback (normalized: "Flutter Mane" → "flutter-mane")

**Implementation**:
1. Query `draft_pool` without generation
2. Batch fetch generation from `pokemon_cache` using `pokemon_id`
3. Fallback: Fetch by normalized name for Pokemon without `pokemon_id`
4. Map results to include generation
5. Filter by generation post-query if needed

---

## Files Fixed

### ✅ `lib/draft-system.ts`

**`getAvailablePokemon` method**:
- ✅ Removed `generation` from select
- ✅ Added batch fetch from `pokemon_cache` by `pokemon_id`
- ✅ Added fallback fetch by normalized name
- ✅ Map results to include generation
- ✅ Post-query filter by generation if specified

**`makePick` method**:
- ✅ Removed `generation` from select (not needed for making picks)

### ✅ `lib/free-agency.ts`

**`getAvailablePokemon` method**:
- ✅ Removed `generation` from select
- ✅ Added batch fetch from `pokemon_cache` by `pokemon_id`
- ✅ Added fallback fetch by normalized name
- ✅ Map results to include generation
- ✅ Post-query filter by generation if specified

---

## Code Changes

### Before (Broken)
```typescript
.select("pokemon_name, point_value, generation, pokemon_id, status")
// Error: generation column doesn't exist
```

### After (Fixed)
```typescript
// Step 1: Query draft_pool without generation
.select("pokemon_name, point_value, pokemon_id, status")

// Step 2: Batch fetch generation from pokemon_cache
const { data: cacheData } = await this.supabase
  .from("pokemon_cache")
  .select("pokemon_id, generation")
  .in("pokemon_id", pokemonIds)

// Step 3: Map results
const mapped = data.map((item) => ({
  ...item,
  generation: generationMap.get(item.pokemon_id) ?? null
}))
```

---

## Performance Considerations

**Optimization**:
- ✅ Batch fetch by `pokemon_id` (single query for all Pokemon with IDs)
- ✅ Batch fetch by name (single query for Pokemon without IDs)
- ✅ Uses Map for O(1) lookup during mapping
- ✅ Only 2 additional queries maximum (by ID + by name)

**Trade-offs**:
- ⚠️ Slightly more complex than direct column access
- ⚠️ Requires 2-3 queries instead of 1
- ✅ Still efficient (batch queries, not per-item)
- ✅ Works correctly with current schema

---

## Testing

### Verify Fix
1. ✅ Test `/api/draft/available` endpoint
2. ✅ Verify generation is returned correctly
3. ✅ Test generation filter works
4. ✅ Test free agency queries work
5. ✅ Verify no errors in console

### Test Commands
```bash
# Test available Pokemon endpoint
curl "http://localhost:3000/api/draft/available?season_id=00000000-0000-0000-0000-000000000001&limit=10"

# Test with generation filter
curl "http://localhost:3000/api/draft/available?season_id=00000000-0000-0000-0000-000000000001&generation=1&limit=10"
```

---

## Related Schema Changes

### Migration History
- ✅ `20260119105458_remote_schema.sql` - Dropped `generation` from `draft_pool`
- ✅ `20260116000009_add_pokemon_id_to_draft_pool.sql` - Added `pokemon_id` FK to `pokemon_cache`
- ✅ `20260119074723_update_get_pokemon_by_tier_function.sql` - Updated function to join with `pokemon_cache`

### Current Schema
**`draft_pool` table**:
- ✅ `pokemon_id` INTEGER (FK to `pokemon_cache.pokemon_id`)
- ❌ `generation` (removed)
- ✅ `pokemon_name` TEXT (for name-based fallback matching)

**`pokemon_cache` table**:
- ✅ `pokemon_id` INTEGER (PK)
- ✅ `name` TEXT (normalized: "flutter-mane")
- ✅ `generation` INTEGER (1-9)

---

## Future Considerations

### Option 1: Add Generation Back to draft_pool
**Pros**: Faster queries, simpler code  
**Cons**: Data duplication, sync issues

### Option 2: Always Use pokemon_id
**Pros**: Single source of truth  
**Cons**: Requires pokemon_id to be populated for all entries

### Option 3: Current Approach (Hybrid)
**Pros**: Works with current schema, handles missing pokemon_id  
**Cons**: Slightly more complex, 2-3 queries

**Recommendation**: Keep current approach until we can ensure all `draft_pool` entries have `pokemon_id` populated.

---

**Last Updated**: January 19, 2026  
**Status**: ✅ Fixed - Generation fetched from pokemon_cache
