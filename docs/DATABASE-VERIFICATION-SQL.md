# Database Verification - Direct SQL Queries

Run these queries directly in **Supabase SQL Editor** to verify views and functions work correctly.

## ✅ Step 1: Verify Views Exist

```sql
-- Check if all views were created
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'pokemon_unified',
    'pokemon_with_all_data', 
    'draft_pool_comprehensive'
  )
ORDER BY table_name;
```

**Expected Result**: Should show all 3 views

---

## ✅ Step 2: Verify Functions Exist

```sql
-- Check if helper functions exist
SELECT 
  proname AS function_name,
  pg_get_function_arguments(oid) AS arguments
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname IN (
    'get_pokemon_by_id',
    'get_pokemon_by_name',
    'search_pokemon',
    'get_pokemon_for_draft',
    'populate_types_from_pokeapi',
    'populate_abilities_from_pokeapi',
    'populate_moves_from_pokeapi',
    'populate_all_master_tables_from_pokeapi'
  )
ORDER BY proname;
```

**Expected Result**: Should show all 8 functions

---

## ✅ Step 3: Check Source Data

```sql
-- Check pokeapi_resources
SELECT 
  resource_type,
  COUNT(*) as count
FROM pokeapi_resources
GROUP BY resource_type
ORDER BY count DESC
LIMIT 20;
```

**Expected**: Should show Pokemon resources (you mentioned 1,351)

```sql
-- Check pokepedia_pokemon projection
SELECT COUNT(*) as pokemon_count FROM pokepedia_pokemon;
```

**Expected**: Should show count of Pokemon (may be 0 if projections not built)

```sql
-- Check pokemon_showdown
SELECT COUNT(*) as showdown_count FROM pokemon_showdown;
```

**Expected**: Should show ~1,515 records (verified ✅)

---

## ✅ Step 4: Test pokemon_unified View

```sql
-- Count records in unified view
SELECT COUNT(*) as total FROM pokemon_unified;
```

**Expected**: Should show count (may be 0 if pokepedia_pokemon is empty)

```sql
-- Test with specific Pokemon (Pikachu = 25)
SELECT 
  pokemon_id,
  name,
  sprite_official_artwork_path,
  types,
  abilities,
  hp, atk, def, spa, spd, spe,
  showdown_tier,
  generation
FROM pokemon_unified
WHERE pokemon_id = 25
LIMIT 1;
```

**Expected**: Should return Pikachu data if pokepedia_pokemon has data

```sql
-- Test view with Showdown-only data (if pokepedia_pokemon is empty)
SELECT 
  pokemon_id,
  name,
  showdown_id,
  types,
  abilities,
  hp, atk, def, spa, spd, spe,
  showdown_tier
FROM pokemon_unified
WHERE showdown_id IS NOT NULL
LIMIT 5;
```

**Expected**: Should return Showdown Pokemon data even if PokéAPI data missing

---

## ✅ Step 5: Test Helper Functions

```sql
-- Test get_pokemon_by_id
SELECT * FROM get_pokemon_by_id(25);
```

**Expected**: Should return Pikachu data

```sql
-- Test get_pokemon_by_name (fuzzy matching)
SELECT * FROM get_pokemon_by_name('Pikachu');
SELECT * FROM get_pokemon_by_name('pikachu');  -- lowercase
SELECT * FROM get_pokemon_by_name('Pikachu-Gmax');  -- forme
```

**Expected**: Should return Pokemon data with fuzzy matching

```sql
-- Test search_pokemon with filters
SELECT * FROM search_pokemon(
  'pika',           -- search_query
  'electric',       -- type_filter
  NULL,             -- ability_filter
  NULL,             -- tier_filter
  1,                -- generation_filter
  10                -- limit_count
);
```

**Expected**: Should return Pokemon matching search and type filter

```sql
-- Test search by tier
SELECT * FROM search_pokemon(
  NULL,    -- search_query
  NULL,    -- type_filter
  NULL,    -- ability_filter
  'OU',    -- tier_filter
  NULL,    -- generation_filter
  20       -- limit_count
);
```

**Expected**: Should return OU tier Pokemon

---

## ✅ Step 6: Test Draft Pool Views

```sql
-- Check draft_pool_comprehensive view
SELECT COUNT(*) FROM draft_pool_comprehensive;
```

**Expected**: Should return count of draft pool entries

```sql
-- Test draft pool with Pokemon data
SELECT 
  pokemon_name,
  point_value,
  sprite_official_artwork_path,
  types,
  abilities,
  hp, atk, def, spa, spd, spe,
  showdown_tier
FROM draft_pool_comprehensive
WHERE status = 'available'
LIMIT 10;
```

**Expected**: Should return draft pool Pokemon with complete data

---

## ✅ Step 7: Test Master Table Population

```sql
-- Check current master table counts
SELECT 
  'types' as table_name, COUNT(*) as count FROM types
UNION ALL
SELECT 'abilities', COUNT(*) FROM abilities
UNION ALL
SELECT 'moves', COUNT(*) FROM moves
UNION ALL
SELECT 'pokemon_types', COUNT(*) FROM pokemon_types
UNION ALL
SELECT 'pokemon_abilities', COUNT(*) FROM pokemon_abilities
UNION ALL
SELECT 'pokemon_moves', COUNT(*) FROM pokemon_moves;
```

**Expected**: Shows current counts (may be 0 if not populated)

```sql
-- Test populate function (if pokeapi_resources has data)
SELECT * FROM populate_types_from_pokeapi();
```

**Expected**: Should return `{inserted: X, updated: Y, errors: Z}`

---

## ✅ Step 8: Verify View Structure

```sql
-- Check pokemon_unified view columns
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'pokemon_unified'
ORDER BY ordinal_position;
```

**Expected**: Should show all columns (pokemon_id, name, types, abilities, hp, etc.)

---

## 🔧 Troubleshooting

### If views return "schema cache" errors:

**PostgREST needs to refresh its schema cache**. This happens automatically, but you can:

1. **Wait 2-5 minutes** - PostgREST auto-refreshes periodically
2. **Restart Supabase** (if local): `supabase stop && supabase start`
3. **Force refresh** (if you have admin access): 
   ```sql
   NOTIFY pgrst, 'reload schema';
   ```

### If pokemon_unified returns 0 records:

1. **Check if pokepedia_pokemon has data**:
   ```sql
   SELECT COUNT(*) FROM pokepedia_pokemon;
   ```

2. **If empty, build projections**:
   ```bash
   pnpm tsx scripts/build-pokepedia-projections.ts
   ```

3. **Check if Showdown data exists**:
   ```sql
   SELECT COUNT(*) FROM pokemon_showdown;
   ```

### If helper functions return "not found":

1. **Verify functions exist**:
   ```sql
   SELECT proname FROM pg_proc WHERE proname LIKE 'get_pokemon%';
   ```

2. **Check permissions**:
   ```sql
   SELECT 
     p.proname,
     pg_get_function_identity_arguments(p.oid) as args,
     a.rolname as grantee
   FROM pg_proc p
   JOIN pg_proc_acl pa ON p.oid = pa.oid
   JOIN pg_authid a ON pa.grantee = a.oid
   WHERE p.proname = 'get_pokemon_by_id';
   ```

3. **Grant permissions if needed**:
   ```sql
   GRANT EXECUTE ON FUNCTION get_pokemon_by_id(INTEGER) TO authenticated;
   GRANT EXECUTE ON FUNCTION get_pokemon_by_name(TEXT) TO authenticated;
   GRANT EXECUTE ON FUNCTION search_pokemon(TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER) TO authenticated;
   ```

---

## 📊 Expected Results Summary

After running all queries, you should see:

- ✅ **Views exist**: All 3 views in information_schema
- ✅ **Functions exist**: All 8 functions in pg_proc
- ✅ **pokemon_unified works**: Returns data (may be 0 if pokepedia_pokemon empty)
- ✅ **Helper functions work**: Return Pokemon data
- ✅ **Showdown data**: ~1,515 Pokemon records
- ⚠️ **PokéAPI data**: May need to build projections first

---

## 🎯 Next Steps After Verification

1. **If pokepedia_pokemon is empty**: Build projections from `pokeapi_resources`
2. **If master tables are empty**: Run `populate_all_master_tables_from_pokeapi()`
3. **If views work**: Start using them in your app!
4. **If PostgREST cache issues**: Wait a few minutes or restart Supabase

See `docs/APP-INTEGRATION-GUIDE.md` for how to use these in your app!
