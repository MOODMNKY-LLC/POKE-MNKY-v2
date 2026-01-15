# Comprehensive Pokedex Implementation Guide

## 🎯 Objective

Build a complete, comprehensive Pokedex in Supabase that caches **ALL** Pokemon data from PokeAPI, enabling:
- Low-latency access to Pokemon data
- Semantic search capabilities  
- Virtual Pokedex experience
- Complete data for building Pokemon-related components

---

## 📊 Current System Analysis

### How Pokemon Caching Currently Works

**Current Flow**:
\`\`\`
App Request → getPokemonDataExtended()
    ↓
Check pokemon_cache (expires_at > now?)
    ↓
Cache Hit? → Return ✅
    ↓ No
Fetch from PokeAPI /pokemon/{id}
    ↓
Fetch ability details (/ability/{id})
    ↓
Fetch move details (/move/{id}) [optional]
    ↓
Store in pokemon_cache
    ↓
Return ✅
\`\`\`

**Current Data** (`pokemon_cache`):
- ✅ 1,025 Pokemon synced
- ✅ Basic info, stats, types, abilities, moves
- ✅ Sprites, ability_details, move_details
- ✅ Generation data
- ❌ Missing: Items, evolution chains, forms, species data

**Current Issue**: PostgREST schema cache (same as `draft_pool`)

---

## 🏗️ Comprehensive Pokedex Architecture

### New Normalized Schema (15 Tables)

**Master Data**:
- `types` - All Pokemon types
- `abilities` - All abilities
- `moves` - All moves (900+)
- `items` - All items (2000+)
- `stats` - All stat types
- `generations` - Generation data

**Pokemon Core**:
- `pokemon_comprehensive` - Individual Pokemon
- `pokemon_species` - Species info (evolution, breeding)
- `evolution_chains` - Evolution data
- `pokemon_forms` - Form variations

**Relationships**:
- `pokemon_abilities` - Pokemon ↔ Abilities
- `pokemon_moves` - Pokemon ↔ Moves
- `pokemon_types` - Pokemon ↔ Types
- `pokemon_items` - Pokemon ↔ Held Items
- `pokemon_stats_comprehensive` - Pokemon ↔ Stats

### Why Normalized?

1. **Efficient Queries**: "Find all Pokemon with ability X" is fast
2. **Complete Data**: All PokeAPI endpoints cached
3. **Searchable**: Full-text search indexes
4. **Extensible**: Easy to add new properties
5. **Relationships**: Proper many-to-many relationships

---

## 🚀 Implementation Steps

### Step 1: Apply Migration ✅

Migration created: `20260112000003_create_comprehensive_pokedex.sql`

**Apply**:
\`\`\`bash
# Already applied via MCP
# Or manually:
supabase migration up
\`\`\`

**Verify**:
\`\`\`sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('types', 'abilities', 'moves', 'items', 'stats', 'generations', 'pokemon_species', 'pokemon_comprehensive')
ORDER BY table_name;
\`\`\`

### Step 2: Sync Master Data

\`\`\`bash
npx tsx scripts/comprehensive-pokedex-sync.ts master
\`\`\`

**What it syncs**:
- Types (~20 items)
- Abilities (~367 items)
- Moves (~937 items)
- Items (~2000+ items)
- Stats (~8 items)
- Generations (~9 items)

**Estimated Time**: ~30 minutes

### Step 3: Sync Pokemon Data

\`\`\`bash
npx tsx scripts/comprehensive-pokedex-sync.ts pokemon 1 1025
\`\`\`

**What it syncs**:
- Pokemon Species (1-1025)
- Pokemon (1-1025)
- All relationships (abilities, moves, types, items, stats)

**Estimated Time**: ~3 hours

### Step 4: Sync Evolution Chains

\`\`\`bash
npx tsx scripts/comprehensive-pokedex-sync.ts evolution
\`\`\`

**Estimated Time**: ~10 minutes

### Step 5: Verify Data

\`\`\`sql
-- Check counts
SELECT 
  (SELECT COUNT(*) FROM types) as types,
  (SELECT COUNT(*) FROM abilities) as abilities,
  (SELECT COUNT(*) FROM moves) as moves,
  (SELECT COUNT(*) FROM items) as items,
  (SELECT COUNT(*) FROM stats) as stats,
  (SELECT COUNT(*) FROM generations) as generations,
  (SELECT COUNT(*) FROM pokemon_species) as species,
  (SELECT COUNT(*) FROM pokemon_comprehensive) as pokemon,
  (SELECT COUNT(*) FROM evolution_chains) as evolution_chains,
  (SELECT COUNT(*) FROM pokemon_abilities) as pokemon_abilities,
  (SELECT COUNT(*) FROM pokemon_moves) as pokemon_moves,
  (SELECT COUNT(*) FROM pokemon_types) as pokemon_types,
  (SELECT COUNT(*) FROM pokemon_items) as pokemon_items,
  (SELECT COUNT(*) FROM pokemon_stats_comprehensive) as pokemon_stats;
\`\`\`

---

## 📝 What Gets Cached

### Complete Data Coverage

#### From `/pokemon/{id}`:
- ✅ Basic info (id, name, height, weight, base_experience)
- ✅ Stats (HP, Attack, Defense, SpA, SpD, Speed)
- ✅ Types
- ✅ Abilities (with hidden flag, slot)
- ✅ Moves (with learn methods, levels)
- ✅ **Held items** (with rarity, versions) ← NEW
- ✅ Sprites (all variants)
- ✅ Forms
- ✅ Location area encounters URL

#### From `/pokemon-species/{id}`:
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

#### From `/ability/{id}`:
- ✅ Effect entries (English)
- ✅ Flavor text entries
- ✅ Generation
- ✅ Pokemon that have this ability

#### From `/move/{id}`:
- ✅ Power, accuracy, PP, priority
- ✅ Type
- ✅ Damage class (physical/special/status)
- ✅ Effect entries
- ✅ Stat changes
- ✅ Meta (ailment, category, etc.)
- ✅ Pokemon that learn this move

#### From `/item/{id}`:
- ✅ Cost, fling power
- ✅ Attributes
- ✅ Category
- ✅ Effect entries
- ✅ Flavor text entries
- ✅ Sprites
- ✅ Pokemon that hold this item

#### From `/type/{id}`:
- ✅ Damage relations (double_damage_from/to, etc.)
- ✅ Game indices
- ✅ Generation
- ✅ Move damage class

#### From `/evolution-chain/{id}`:
- ✅ Full evolution chain structure
- ✅ Baby trigger item
- ✅ Evolution conditions

---

## 🔍 Query Examples

### Find Pokemon by Ability
\`\`\`sql
SELECT p.name, p.pokemon_id
FROM pokemon_comprehensive p
JOIN pokemon_abilities pa ON p.pokemon_id = pa.pokemon_id
JOIN abilities a ON pa.ability_id = a.ability_id
WHERE a.name = 'intimidate';
\`\`\`

### Find Pokemon by Type
\`\`\`sql
SELECT p.name, p.pokemon_id
FROM pokemon_comprehensive p
JOIN pokemon_types pt ON p.pokemon_id = pt.pokemon_id
JOIN types t ON pt.type_id = t.type_id
WHERE t.name = 'fire';
\`\`\`

### Find Pokemon by Move
\`\`\`sql
SELECT DISTINCT p.name, p.pokemon_id
FROM pokemon_comprehensive p
JOIN pokemon_moves pm ON p.pokemon_id = pm.pokemon_id
JOIN moves m ON pm.move_id = m.move_id
WHERE m.name = 'thunderbolt';
\`\`\`

### Semantic Search
\`\`\`sql
SELECT name, pokemon_id
FROM pokemon_comprehensive
WHERE to_tsvector('english', name) @@ to_tsquery('pika*');
\`\`\`

### Complete Pokemon Data
\`\`\`sql
SELECT 
  p.*,
  ps.*,
  json_agg(DISTINCT t.name) as types,
  json_agg(DISTINCT a.name) as abilities,
  json_agg(DISTINCT m.name) as moves,
  json_agg(DISTINCT i.name) as held_items
FROM pokemon_comprehensive p
JOIN pokemon_species ps ON p.species_id = ps.species_id
LEFT JOIN pokemon_types pt ON p.pokemon_id = pt.pokemon_id
LEFT JOIN types t ON pt.type_id = t.type_id
LEFT JOIN pokemon_abilities pa ON p.pokemon_id = pa.pokemon_id
LEFT JOIN abilities a ON pa.ability_id = a.ability_id
LEFT JOIN pokemon_moves pm ON p.pokemon_id = pm.pokemon_id
LEFT JOIN moves m ON pm.move_id = m.move_id
LEFT JOIN pokemon_items pi ON p.pokemon_id = pi.pokemon_id
LEFT JOIN items i ON pi.item_id = i.item_id
WHERE p.pokemon_id = 25
GROUP BY p.id, ps.id;
\`\`\`

---

## 🔄 Periodic Refresh (Cron Job)

### Setup Cron Job

**File**: `app/api/cron/sync-pokedex/route.ts`

\`\`\`typescript
import { NextResponse } from "next/server"
import { syncComprehensivePokedex } from "@/lib/pokedex-sync"

export const revalidate = 0
export const maxDuration = 300

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Incremental sync: Only sync Pokemon (master data rarely changes)
    await syncComprehensivePokedex({
      phases: ["pokemon"],
      pokemonRange: { start: 1, end: 1025 },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
\`\`\`

**Vercel Cron** (`vercel.json`):
\`\`\`json
{
  "crons": [{
    "path": "/api/cron/sync-pokedex",
    "schedule": "0 3 * * *"
  }]
}
\`\`\`

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

## 📊 Comparison: Current vs Comprehensive

| Feature | Current (`pokemon_cache`) | Comprehensive (New Schema) |
|---------|--------------------------|---------------------------|
| **Data Completeness** | Partial | Complete |
| **Schema** | Denormalized | Normalized |
| **Relationships** | ❌ No | ✅ Yes |
| **Search** | Basic | Full-text semantic |
| **Items** | ❌ Missing | ✅ Complete |
| **Evolution Chains** | ❌ Missing | ✅ Complete |
| **Forms** | ❌ Missing | ✅ Complete |
| **Species Data** | ❌ Missing | ✅ Complete |
| **Query Performance** | Medium | Fast (indexed) |

---

**Status**: Architecture complete, migration ready, sync system built

**Next**: Apply migration, run sync, verify data!
