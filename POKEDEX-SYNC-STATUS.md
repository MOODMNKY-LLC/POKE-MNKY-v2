# Pokedex Sync Status & Next Steps

## ✅ Current Status

### Pokemon Cache (`pokemon_cache` table)
- ✅ **1,025 Pokemon** synced and cached
- ✅ **100% have sprites**
- ✅ **100% have ability_details**
- ✅ **100% have move_details**
- ✅ **100% have generation data**
- ⚠️ **Schema cache issue**: PostgREST can't see table (needs refresh)

### Comprehensive Pokedex Schema
- ✅ **Migration created**: `20260112000003_create_comprehensive_pokedex.sql`
- ✅ **Sync system built**: `lib/pokedex-sync.ts`
- ✅ **Scripts created**: `scripts/comprehensive-pokedex-sync.ts`
- ⏳ **Migration applied**: Needs verification
- ⏳ **Data synced**: Not yet started

---

## 🎯 How Pokemon Caching Works

### Current System (`pokemon_cache`)

**Location**: `lib/pokemon-api-enhanced.ts`

**Function**: `getPokemonDataExtended(nameOrId, includeMoveDetails)`

**Process**:
1. Check `pokemon_cache` table for existing data
2. If `expires_at > now()`, return cached data
3. If cache miss, fetch from PokeAPI `/pokemon/{id}`
4. Fetch ability details from `/ability/{id}` (first 3 abilities)
5. Optionally fetch move details from `/move/{id}` (top 20 moves)
6. Store in `pokemon_cache` with 30-day expiration
7. Return data

**What's Cached**:
- Basic info (name, id, height, weight)
- Stats (HP, Attack, Defense, SpA, SpD, Speed)
- Types (array)
- Abilities (array + details)
- Moves (array + details)
- Sprites (all variants)
- Generation (calculated)

**What's Missing**:
- Items / Held items
- Evolution chains
- Forms / Varieties
- Species data (egg groups, gender rate, etc.)
- Location data

**Storage Location**: `public.pokemon_cache` table in Supabase

---

### Comprehensive System (New Schema)

**Location**: `lib/pokedex-sync.ts`

**Function**: `syncComprehensivePokedex(options)`

**Process**:
1. **Phase 1**: Sync master data (types, abilities, moves, items, stats, generations)
2. **Phase 2**: Sync Pokemon species (1-1025)
3. **Phase 3**: Sync Pokemon (1-1025) + relationships
4. **Phase 4**: Sync evolution chains

**What Gets Cached**:
- ✅ **Everything** from PokeAPI
- ✅ All Pokemon endpoints
- ✅ All relationships (normalized)
- ✅ Full-text search indexes

**Storage Location**: 15 normalized tables in Supabase:
- `pokemon_comprehensive` (main Pokemon data)
- `pokemon_species` (species info)
- `types`, `abilities`, `moves`, `items`, `stats`, `generations` (master data)
- `pokemon_abilities`, `pokemon_moves`, `pokemon_types`, `pokemon_items`, `pokemon_stats_comprehensive` (relationships)
- `evolution_chains`, `pokemon_forms` (additional data)

---

## 🔧 Why Pokemon Might Be Missing Locally

### Issue 1: Schema Cache (Most Likely)
**Problem**: PostgREST can't see `pokemon_cache` table

**Symptoms**:
- Direct SQL queries work (shows 1,025 Pokemon)
- Supabase client queries fail (PGRST205 error)

**Solution**:
```bash
supabase stop
supabase start
```

**Verify**:
```sql
SELECT COUNT(*) FROM pokemon_cache;
-- Should return 1025
```

---

### Issue 2: Different Database Instance
**Problem**: Verification script queries wrong database

**Check**:
```bash
# Check environment variables
echo $NEXT_PUBLIC_SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY
```

**Should point to**:
- Local: `http://127.0.0.1:54321`
- Or your remote Supabase project URL

---

### Issue 3: Data Expired
**Problem**: `expires_at < now()`

**Check**:
```sql
SELECT COUNT(*) 
FROM pokemon_cache 
WHERE expires_at > NOW();
```

**Solution**: Re-run sync script

---

## 🚀 Next Steps

### Step 1: Refresh Schema Cache 🔴 CRITICAL
```bash
supabase stop
supabase start
```

**Wait**: 30-60 seconds

**Verify**:
```sql
SELECT COUNT(*) FROM pokemon_cache;
SELECT COUNT(*) FROM draft_pool;
```

---

### Step 2: Verify Current Cache
```sql
-- Check pokemon_cache
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN generation IS NOT NULL THEN 1 END) as with_gen,
  COUNT(CASE WHEN sprites IS NOT NULL THEN 1 END) as with_sprites
FROM pokemon_cache;

-- Sample Pokemon
SELECT pokemon_id, name, generation 
FROM pokemon_cache 
ORDER BY pokemon_id 
LIMIT 10;
```

---

### Step 3: Apply Comprehensive Schema (Optional)
```bash
# Migration already created
# Verify tables exist:
npx tsx -e "
import { createServiceRoleClient } from './lib/supabase/service';
const supabase = createServiceRoleClient();
const { data } = await supabase.from('types').select('type_id').limit(1);
console.log('Types table exists:', !!data);
"
```

---

### Step 4: Sync Comprehensive Pokedex (Optional)
```bash
# Step 1: Master data (~30 min)
npx tsx scripts/comprehensive-pokedex-sync.ts master

# Step 2: Pokemon data (~3 hours)
npx tsx scripts/comprehensive-pokedex-sync.ts pokemon 1 1025

# Step 3: Evolution chains (~10 min)
npx tsx scripts/comprehensive-pokedex-sync.ts evolution
```

---

## 📊 Data Verification Queries

### Current Cache (`pokemon_cache`)
```sql
-- Total Pokemon
SELECT COUNT(*) FROM pokemon_cache;

-- By generation
SELECT generation, COUNT(*) 
FROM pokemon_cache 
GROUP BY generation 
ORDER BY generation;

-- Data completeness
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN sprites IS NOT NULL THEN 1 END) as with_sprites,
  COUNT(CASE WHEN ability_details IS NOT NULL THEN 1 END) as with_abilities,
  COUNT(CASE WHEN move_details IS NOT NULL THEN 1 END) as with_moves,
  COUNT(CASE WHEN generation IS NOT NULL THEN 1 END) as with_generation
FROM pokemon_cache;
```

### Comprehensive Pokedex (New Schema)
```sql
-- Master data counts
SELECT 
  (SELECT COUNT(*) FROM types) as types,
  (SELECT COUNT(*) FROM abilities) as abilities,
  (SELECT COUNT(*) FROM moves) as moves,
  (SELECT COUNT(*) FROM items) as items,
  (SELECT COUNT(*) FROM stats) as stats,
  (SELECT COUNT(*) FROM generations) as generations;

-- Pokemon data counts
SELECT 
  (SELECT COUNT(*) FROM pokemon_species) as species,
  (SELECT COUNT(*) FROM pokemon_comprehensive) as pokemon,
  (SELECT COUNT(*) FROM evolution_chains) as evolution_chains;

-- Relationship counts
SELECT 
  (SELECT COUNT(*) FROM pokemon_abilities) as pokemon_abilities,
  (SELECT COUNT(*) FROM pokemon_moves) as pokemon_moves,
  (SELECT COUNT(*) FROM pokemon_types) as pokemon_types,
  (SELECT COUNT(*) FROM pokemon_items) as pokemon_items,
  (SELECT COUNT(*) FROM pokemon_stats_comprehensive) as pokemon_stats;
```

---

## 🎯 Summary

### Current System
- ✅ **Working**: `pokemon_cache` has 1,025 Pokemon
- ⚠️ **Issue**: Schema cache needs refresh
- ✅ **Data**: Complete for current use case

### Comprehensive System
- ✅ **Ready**: Migration and sync system built
- ⏳ **Pending**: Apply migration and run sync
- 🎯 **Goal**: Complete Pokedex with all PokeAPI data

---

**Status**: Current cache working, comprehensive system ready for deployment

**Next**: Refresh schema cache, then optionally sync comprehensive Pokedex
