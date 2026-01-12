# Comprehensive Pokedex Sync Guide

## 🎯 Overview

This guide explains how the comprehensive Pokemon caching system works and how to use it to build a complete Pokedex in Supabase.

---

## 📊 Current System Analysis

### How Pokemon Caching Currently Works

**Current Flow**:
1. **API Call**: `getPokemonDataExtended()` from `lib/pokemon-api-enhanced.ts`
2. **Cache Check**: Queries `pokemon_cache` table for existing data
3. **Cache Hit**: Returns cached data if `expires_at` > now
4. **Cache Miss**: Fetches from PokeAPI `/pokemon/{id}` endpoint
5. **Store**: Upserts data to `pokemon_cache` table
6. **Expiration**: Data expires after 30 days

**Current Data Stored** (in `pokemon_cache`):
- ✅ Basic info (name, id, height, weight)
- ✅ Stats (HP, Attack, Defense, etc.)
- ✅ Types (array)
- ✅ Abilities (array + details)
- ✅ Moves (array + top 20 details)
- ✅ Sprites (all variants)
- ✅ Generation (calculated)
- ✅ Draft cost & tier (calculated)
- ❌ **Missing**: Items, held items, evolution chains, forms, species data, location data

**Current Limitations**:
1. **Denormalized**: All data in one table (hard to query relationships)
2. **Incomplete**: Only uses `/pokemon` endpoint, missing many endpoints
3. **No Relationships**: Can't efficiently query "all Pokemon with ability X"
4. **Limited Search**: No semantic search capabilities
5. **Schema Cache Issue**: PostgREST can't see tables (needs refresh)

---

## 🏗️ Comprehensive Pokedex Architecture

### New Normalized Schema

**Master Data Tables**:
- `types` - All Pokemon types with damage relations
- `abilities` - All abilities with effects
- `moves` - All moves with power, accuracy, effects
- `items` - All items (held items, berries, etc.)
- `stats` - All stat types (HP, Attack, etc.)
- `generations` - Generation master data

**Pokemon Core Tables**:
- `pokemon` - Individual Pokemon instances
- `pokemon_species` - Species information (evolution, breeding, etc.)
- `evolution_chains` - Evolution chain data
- `pokemon_forms` - Form variations (regional, mega, etc.)

**Relationship Tables**:
- `pokemon_abilities` - Pokemon ↔ Abilities (many-to-many)
- `pokemon_moves` - Pokemon ↔ Moves (many-to-many)
- `pokemon_types` - Pokemon ↔ Types (many-to-many)
- `pokemon_items` - Pokemon ↔ Held Items (many-to-many)
- `pokemon_stats` - Pokemon ↔ Stats (many-to-many)

### Benefits

1. **Complete Data**: All PokeAPI endpoints cached
2. **Normalized**: Efficient queries and relationships
3. **Searchable**: Full-text search indexes
4. **Relationship Queries**: "Find all Pokemon with ability X" instantly
5. **Low Latency**: No external API calls during app usage
6. **Extensible**: Easy to add new Pokemon properties

---

## 🔄 Sync Strategy

### Phase 1: Master Data (One-time, ~30 minutes)
```bash
npx tsx scripts/comprehensive-pokedex-sync.ts master
```

**Syncs**:
- Types (~20 items)
- Abilities (~300+ items)
- Moves (~900+ items)
- Items (~2000+ items)
- Stats (~8 items)
- Generations (~9 items)

**Estimated Time**: ~30 minutes

### Phase 2: Pokemon Data (Bulk, ~3 hours)
```bash
npx tsx scripts/comprehensive-pokedex-sync.ts pokemon 1 1025
```

**Syncs**:
- Pokemon Species (1-1025)
- Pokemon (1-1025)
- All relationships (abilities, moves, types, items, stats)

**Estimated Time**: ~3 hours (100ms rate limit × 1025 Pokemon)

### Phase 3: Evolution Chains (One-time, ~10 minutes)
```bash
npx tsx scripts/comprehensive-pokedex-sync.ts evolution
```

**Syncs**:
- Evolution chains (from species data)

**Estimated Time**: ~10 minutes

### Full Sync (Everything)
```bash
npx tsx scripts/comprehensive-pokedex-sync.ts all
```

**Estimated Total Time**: ~3.5-4 hours

---

## 📝 Data Completeness

### What Gets Cached

#### From `/pokemon/{id}` Endpoint:
- ✅ Basic info (id, name, height, weight, base_experience)
- ✅ Stats (HP, Attack, Defense, SpA, SpD, Speed)
- ✅ Types
- ✅ Abilities (with hidden flag, slot)
- ✅ Moves (with learn methods, levels)
- ✅ Held items (with rarity, versions)
- ✅ Sprites (all variants)
- ✅ Forms
- ✅ Location area encounters URL

#### From `/pokemon-species/{id}` Endpoint:
- ✅ Evolution chain ID
- ✅ Egg groups
- ✅ Gender rate
- ✅ Capture rate
- ✅ Base happiness
- ✅ Growth rate
- ✅ Habitat
- ✅ Color
- ✅ Shape
- ✅ Flavor text entries
- ✅ Genera
- ✅ Pokedex numbers
- ✅ Varieties

#### From `/ability/{id}` Endpoint:
- ✅ Effect entries (English)
- ✅ Flavor text entries
- ✅ Generation
- ✅ Pokemon that have this ability

#### From `/move/{id}` Endpoint:
- ✅ Power, accuracy, PP, priority
- ✅ Type
- ✅ Damage class (physical/special/status)
- ✅ Effect entries
- ✅ Stat changes
- ✅ Meta (ailment, category, etc.)
- ✅ Pokemon that learn this move

#### From `/item/{id}` Endpoint:
- ✅ Cost, fling power
- ✅ Attributes
- ✅ Category
- ✅ Effect entries
- ✅ Flavor text entries
- ✅ Sprites
- ✅ Pokemon that hold this item

#### From `/type/{id}` Endpoint:
- ✅ Damage relations (double_damage_from/to, half_damage_from/to, etc.)
- ✅ Game indices
- ✅ Generation
- ✅ Move damage class

#### From `/evolution-chain/{id}` Endpoint:
- ✅ Full evolution chain structure
- ✅ Baby trigger item
- ✅ Evolution conditions

---

## 🚀 Usage Examples

### Query Examples

**Find all Pokemon with a specific ability**:
```sql
SELECT p.name, p.pokemon_id
FROM pokemon p
JOIN pokemon_abilities pa ON p.pokemon_id = pa.pokemon_id
JOIN abilities a ON pa.ability_id = a.ability_id
WHERE a.name = 'intimidate';
```

**Find all Fire-type Pokemon**:
```sql
SELECT p.name, p.pokemon_id
FROM pokemon p
JOIN pokemon_types pt ON p.pokemon_id = pt.pokemon_id
JOIN types t ON pt.type_id = t.type_id
WHERE t.name = 'fire';
```

**Find all Pokemon that learn a specific move**:
```sql
SELECT DISTINCT p.name, p.pokemon_id
FROM pokemon p
JOIN pokemon_moves pm ON p.pokemon_id = pm.pokemon_id
JOIN moves m ON pm.move_id = m.move_id
WHERE m.name = 'thunderbolt';
```

**Semantic search**:
```sql
SELECT name, pokemon_id
FROM pokemon
WHERE to_tsvector('english', name) @@ to_tsquery('pika*');
```

**Get complete Pokemon data**:
```sql
SELECT 
  p.*,
  ps.*,
  json_agg(DISTINCT t.name) as types,
  json_agg(DISTINCT a.name) as abilities,
  json_agg(DISTINCT m.name) as moves
FROM pokemon p
JOIN pokemon_species ps ON p.species_id = ps.species_id
LEFT JOIN pokemon_types pt ON p.pokemon_id = pt.pokemon_id
LEFT JOIN types t ON pt.type_id = t.type_id
LEFT JOIN pokemon_abilities pa ON p.pokemon_id = pa.pokemon_id
LEFT JOIN abilities a ON pa.ability_id = a.ability_id
LEFT JOIN pokemon_moves pm ON p.pokemon_id = pm.pokemon_id
LEFT JOIN moves m ON pm.move_id = m.move_id
WHERE p.pokemon_id = 25
GROUP BY p.id, ps.id;
```

---

## 🔧 Setup & Execution

### Step 1: Apply Migration
```bash
# Migration already applied via MCP
# Or manually:
supabase migration up
```

### Step 2: Sync Master Data
```bash
npx tsx scripts/comprehensive-pokedex-sync.ts master
```

**Expected**: ~30 minutes, syncs all master data

### Step 3: Sync Pokemon Data
```bash
npx tsx scripts/comprehensive-pokedex-sync.ts pokemon 1 1025
```

**Expected**: ~3 hours, syncs all Pokemon + relationships

### Step 4: Sync Evolution Chains
```bash
npx tsx scripts/comprehensive-pokedex-sync.ts evolution
```

**Expected**: ~10 minutes

### Step 5: Verify Data
```sql
-- Check counts
SELECT 
  (SELECT COUNT(*) FROM types) as types,
  (SELECT COUNT(*) FROM abilities) as abilities,
  (SELECT COUNT(*) FROM moves) as moves,
  (SELECT COUNT(*) FROM items) as items,
  (SELECT COUNT(*) FROM stats) as stats,
  (SELECT COUNT(*) FROM generations) as generations,
  (SELECT COUNT(*) FROM pokemon_species) as species,
  (SELECT COUNT(*) FROM pokemon) as pokemon,
  (SELECT COUNT(*) FROM evolution_chains) as evolution_chains;
```

---

## 🔄 Periodic Refresh (Cron Job)

### Setup Cron Job

**File**: `app/api/cron/sync-pokedex/route.ts`

```typescript
import { NextResponse } from "next/server"
import { syncComprehensivePokedex } from "@/lib/pokedex-sync"

export const revalidate = 0
export const maxDuration = 300 // 5 minutes

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Sync only expired/missing data (incremental)
    await syncComprehensivePokedex({
      phases: ["pokemon"], // Only sync Pokemon (master data rarely changes)
      pokemonRange: { start: 1, end: 1025 },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
```

**Vercel Cron** (`vercel.json`):
```json
{
  "crons": [{
    "path": "/api/cron/sync-pokedex",
    "schedule": "0 3 * * *" // Daily at 3 AM
  }]
}
```

---

## 📊 Current vs Comprehensive Comparison

| Feature | Current (`pokemon_cache`) | Comprehensive (New Schema) |
|---------|--------------------------|---------------------------|
| **Data Completeness** | Partial (Pokemon endpoint only) | Complete (All endpoints) |
| **Schema** | Denormalized (single table) | Normalized (15+ tables) |
| **Relationships** | ❌ No | ✅ Yes (many-to-many) |
| **Search** | Basic (name only) | Full-text semantic search |
| **Items** | ❌ Missing | ✅ Complete |
| **Evolution Chains** | ❌ Missing | ✅ Complete |
| **Forms** | ❌ Missing | ✅ Complete |
| **Species Data** | ❌ Missing | ✅ Complete |
| **Query Performance** | Medium | Fast (indexed) |
| **Extensibility** | Limited | High |

---

## 🎯 Migration Path

### Option 1: Keep Both (Recommended)
- Keep `pokemon_cache` for backward compatibility
- Use new schema for new features
- Gradually migrate queries to new schema

### Option 2: Migrate Data
- Copy data from `pokemon_cache` to new schema
- Update all queries to use new schema
- Deprecate `pokemon_cache`

### Option 3: Hybrid
- Use `pokemon_cache` for quick lookups
- Use new schema for relationship queries
- Sync both systems

---

## ✅ Verification Checklist

After sync, verify:

- [ ] Master data synced (types, abilities, moves, items, stats, generations)
- [ ] Pokemon species synced (1-1025)
- [ ] Pokemon synced (1-1025)
- [ ] Relationships synced (abilities, moves, types, items, stats)
- [ ] Evolution chains synced
- [ ] Indexes created
- [ ] RLS policies enabled
- [ ] Search indexes working
- [ ] Sample queries return correct results

---

**Status**: Architecture designed, migration created, sync system ready

**Next**: Run sync to populate comprehensive Pokedex!
