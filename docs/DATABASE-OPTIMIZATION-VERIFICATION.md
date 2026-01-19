# Database Optimization - Verification & Usage Guide

## ✅ Migrations Applied

Both migrations have been successfully applied:
- ✅ `20260120000018_populate_master_tables_from_sync.sql` - Master table population functions
- ✅ `20260120000019_create_unified_pokemon_views.sql` - Unified views and helper functions

## 📊 Current Status

The population script ran successfully but returned 0 inserted/updated records. This could mean:
1. **Data already populated** - Master tables may already have data
2. **No synced data** - `pokeapi_resources` table may be empty or not synced yet
3. **Functions working correctly** - They're just not finding new data to insert

## 🔍 Verification Steps

### 1. Check if master tables have data

```sql
-- Check counts
SELECT COUNT(*) FROM types;
SELECT COUNT(*) FROM abilities;
SELECT COUNT(*) FROM moves;
SELECT COUNT(*) FROM pokemon_types;
SELECT COUNT(*) FROM pokemon_abilities;
SELECT COUNT(*) FROM pokemon_moves;
```

### 2. Check if pokeapi_resources has data

```sql
-- Check what resource types are synced
SELECT resource_type, COUNT(*) 
FROM pokeapi_resources 
GROUP BY resource_type 
ORDER BY resource_type;

-- Check specific types
SELECT COUNT(*) FROM pokeapi_resources WHERE resource_type = 'type';
SELECT COUNT(*) FROM pokeapi_resources WHERE resource_type = 'ability';
SELECT COUNT(*) FROM pokeapi_resources WHERE resource_type = 'move';
SELECT COUNT(*) FROM pokeapi_resources WHERE resource_type = 'pokemon';
```

### 3. Test the population functions manually

```sql
-- Test individual functions
SELECT * FROM populate_types_from_pokeapi();
SELECT * FROM populate_abilities_from_pokeapi();
SELECT * FROM populate_moves_from_pokeapi();
SELECT * FROM populate_pokemon_types_from_pokeapi();
SELECT * FROM populate_pokemon_abilities_from_pokeapi();
SELECT * FROM populate_pokemon_moves_from_pokeapi();

-- Test master function
SELECT populate_all_master_tables_from_pokeapi();
```

### 4. Test the unified views

```sql
-- Check unified view
SELECT COUNT(*) FROM pokemon_unified;
SELECT * FROM pokemon_unified WHERE pokemon_id = 25 LIMIT 1; -- Pikachu

-- Test helper functions
SELECT * FROM get_pokemon_by_id(25);
SELECT * FROM get_pokemon_by_name('Pikachu');
SELECT * FROM search_pokemon('pika', 'electric', NULL, NULL, NULL, 10);
```

## 🚀 Using in Your App

### Option 1: Use Unified Views Directly

```typescript
// Get Pokemon with all data
const { data: pokemon } = await supabase
  .from('pokemon_unified')
  .select('*')
  .eq('pokemon_id', 25)
  .single()

// Search Pokemon
const { data: results } = await supabase
  .from('pokemon_unified')
  .select('pokemon_id, name, sprite_official_artwork_path, types, abilities, hp, atk, def, spa, spd, spe, showdown_tier')
  .eq('generation', 1)
  .limit(20)
```

### Option 2: Use Helper Functions

```typescript
// Get Pokemon by ID
const { data } = await supabase
  .rpc('get_pokemon_by_id', { pokemon_id_param: 25 })

// Get Pokemon by name (fuzzy matching)
const { data } = await supabase
  .rpc('get_pokemon_by_name', { pokemon_name_param: 'Pikachu' })

// Search with filters
const { data } = await supabase
  .rpc('search_pokemon', {
    search_query: 'pika',
    type_filter: 'electric',
    tier_filter: 'OU',
    generation_filter: 1,
    limit_count: 20
  })

// Get Pokemon for draft
const { data } = await supabase
  .rpc('get_pokemon_for_draft', { season_id_param: seasonId })
```

### Option 3: Use Draft Pool Comprehensive View

```typescript
// Get draft pool with all Pokemon data
const { data: draftPool } = await supabase
  .from('draft_pool_comprehensive')
  .select('*')
  .eq('season_id', seasonId)
  .eq('status', 'available')
  .order('pokemon_name')
```

## 📝 Next Steps

1. **Verify data exists**: Check if `pokeapi_resources` has synced data
2. **Run PokéPedia sync**: If no data, run the PokéPedia sync first
3. **Populate master tables**: Once data is synced, run `pnpm populate:master-tables`
4. **Update app code**: Replace existing queries with new views/functions
5. **Test performance**: Compare query performance before/after

## 🔧 Troubleshooting

### If functions return 0 records:

1. **Check sync status**: Ensure PokéPedia sync has completed
2. **Verify resource types**: Check what's in `pokeapi_resources`
3. **Check function logic**: Review the extraction logic in migration files
4. **Test manually**: Run SQL queries directly to debug

### If views return empty:

1. **Check joins**: Verify `pokepedia_pokemon` and `pokemon_showdown` have data
2. **Check matching logic**: Review the FULL OUTER JOIN conditions
3. **Test individual tables**: Query source tables directly

### If RPC calls fail:

1. **Check permissions**: Ensure functions are granted to `authenticated` role
2. **Check function signatures**: Verify parameter names match
3. **Use views directly**: Fall back to querying views instead of RPC

## 📚 Reference

- **Migration Files**: 
  - `supabase/migrations/20260120000018_populate_master_tables_from_sync.sql`
  - `supabase/migrations/20260120000019_create_unified_pokemon_views.sql`
- **Script**: `scripts/populate-master-tables.ts`
- **Documentation**: `docs/DATABASE-OPTIMIZATION-COMPLETE.md`
