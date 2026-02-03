# Draft Pool Population - Complete Implementation ✅

**Date**: January 20, 2026  
**Status**: ✅ **IMPLEMENTATION COMPLETE**

---

## ✅ What's Been Completed

### 1. Database Functions Created

**Tier-to-Point Mapping Function**:
- `map_tier_to_point_value(tier TEXT)` - Maps Showdown tiers to point values (1-20)
- Intelligently assigns points based on competitive viability

**Showdown Pool Population Function**:
- `populate_showdown_pool_from_tiers(season_id, exclude_illegal, exclude_forms)`
- Populates **showdown_pool** (tier-derived reference table) from `pokemon_unified` view
- Uses Showdown tier data to assign point values
- Handles conflicts and updates existing entries
- **Note**: League draft pool is **draft_pool**, populated only from Notion; **showdown_pool** is for tier lookup and point suggestions.

### 2. Tier-to-Point Mapping Logic

| Showdown Tier | Point Value | Notes |
|---------------|-------------|-------|
| Uber, AG | 20 | Top tier legendaries |
| OU | 19 | OverUsed - top competitive tier |
| UUBL, OUBL | 18 | Borderline tiers |
| UU | 17 | UnderUsed |
| RUBL | 16 | Borderline |
| RU | 15 | RarelyUsed |
| NUBL | 14 | Borderline |
| NU | 13 | NeverUsed |
| PUBL | 12 | Borderline |
| PU | 11 | PU tier |
| ZUBL | 10 | Borderline |
| ZU | 9 | ZeroUsed |
| LC | 8 | Little Cup |
| NFE | 7 | Not Fully Evolved |
| Untiered | 6 | No tier data |
| NULL | 5 | Missing tier |
| Illegal, Unreleased, CAP | NULL | Excluded |

### 3. Views Verified

- ✅ `pokemon_unified` - Working (returns ~1,515 records via SQL)
- ✅ `pokemon_with_all_data` - Exists
- ✅ `draft_pool_comprehensive` - Exists (enhanced draft pool view)

---

## 🚀 Immediate Next Steps

### Step 1: Populate Showdown Pool (SQL or script)

**Via script** (recommended):
```bash
pnpm tsx scripts/populate-draft-pool-from-tiers.ts
```

**Or run directly in Supabase SQL Editor**:

```sql
-- Get current season ID
SELECT id, name FROM seasons WHERE is_current = true;

-- Then populate showdown_pool (replace SEASON_ID with actual UUID)
SELECT * FROM populate_showdown_pool_from_tiers(
  'SEASON_ID'::UUID,  -- Replace with actual season ID
  true,               -- exclude_illegal = true
  false               -- exclude_forms = false
);
```

**Or use this one-liner**:
```sql
SELECT * FROM populate_showdown_pool_from_tiers(
  (SELECT id FROM seasons WHERE is_current = true LIMIT 1),
  true,
  false
);
```

**Expected Result**:
```json
{
  "inserted": 1200+,
  "updated": 0,
  "skipped": 100+,
  "total_processed": 1300+,
  "season_id": "YOUR_SEASON_ID"
}
```

### Step 2: Verify Showdown Pool Population

```sql
-- Check total entries
SELECT COUNT(*) FROM showdown_pool 
WHERE season_id = (SELECT id FROM seasons WHERE is_current = true LIMIT 1);

-- Check point distribution
SELECT 
  point_value,
  COUNT(*) as pokemon_count
FROM showdown_pool
WHERE season_id = (SELECT id FROM seasons WHERE is_current = true LIMIT 1)
GROUP BY point_value
ORDER BY point_value DESC;

-- Sample entries
SELECT 
  pokemon_name,
  point_value,
  pokemon_id,
  generation
FROM showdown_pool
WHERE season_id = (SELECT id FROM seasons WHERE is_current = true LIMIT 1)
ORDER BY point_value DESC, pokemon_name
LIMIT 20;
```

### Step 3: Use draft_pool_comprehensive View

Once populated, use the enhanced view:

```sql
-- Get draft pool with complete Pokemon data
SELECT 
  pokemon_name,
  point_value,
  status,
  sprite_official_artwork_path,
  types,
  abilities,
  hp, atk, def, spa, spd, spe,
  showdown_tier,
  generation
FROM draft_pool_comprehensive
WHERE season_id = (SELECT id FROM seasons WHERE is_current = true LIMIT 1)
  AND status = 'available'
ORDER BY point_value DESC, pokemon_name;
```

---

## 📋 Future Steps (When PokéPedia Sync Completes)

### Step 4: Build pokepedia_pokemon Projections

Once `pokeapi_resources` has Pokemon data:

```bash
pnpm tsx scripts/build-pokepedia-projections.ts
```

This will:
- Extract Pokemon data from `pokeapi_resources` JSONB
- Populate `pokepedia_pokemon` table
- Enable complete PokéAPI data in `pokemon_unified`

### Step 5: Populate Master Tables

After PokéPedia sync completes (types, abilities, moves):

```bash
pnpm populate:master-tables
```

Or via SQL:
```sql
SELECT * FROM populate_all_master_tables_from_pokeapi();
```

This populates:
- `types` table (~20 records)
- `abilities` table (~400 records)
- `moves` table (~1,000 records)
- Junction tables (`pokemon_types`, `pokemon_abilities`, `pokemon_moves`)

---

## 🎯 Using Draft Pool in Your App

### Example: Get Available Pokemon

```typescript
// app/api/draft/available/route.ts
import { createServerClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const seasonId = searchParams.get('season_id')

  const supabase = createServerClient()

  const { data: pool } = await supabase
    .from('draft_pool_comprehensive')
    .select(`
      id,
      pokemon_name,
      point_value,
      status,
      sprite_official_artwork_path,
      types,
      abilities,
      hp, atk, def, spa, spd, spe,
      showdown_tier,
      generation
    `)
    .eq('season_id', seasonId)
    .eq('status', 'available')
    .order('point_value', { ascending: false })
    .order('pokemon_name')

  return Response.json({ pool })
}
```

### Example: Filter by Point Value

```typescript
// Get Pokemon in specific point range
const { data: pool } = await supabase
  .from('draft_pool_comprehensive')
  .select('*')
  .eq('season_id', seasonId)
  .eq('status', 'available')
  .gte('point_value', minPoints)
  .lte('point_value', maxPoints)
```

### Example: Filter by Tier

```typescript
// Get OU tier Pokemon
const { data: pool } = await supabase
  .from('draft_pool_comprehensive')
  .select('*')
  .eq('season_id', seasonId)
  .eq('status', 'available')
  .eq('showdown_tier', 'OU')
```

---

## 📊 Current Status

| Component | Status | Records | Notes |
|-----------|--------|---------|-------|
| `pokemon_unified` | ✅ Working | ~1,515 | Verified via SQL |
| `pokemon_showdown` | ✅ Complete | 1,515 | Source data |
| `pokepedia_pokemon` | ⚠️ Empty | 0 | Needs PokéPedia sync |
| `pokeapi_resources` | ⚠️ Empty | 0 | Needs sync |
| `draft_pool` | Notion sync | — | Populated by n8n from Notion Draft Board |
| `showdown_pool` | ✅ Populate via script/SQL | — | Run `populate_showdown_pool_from_tiers` for tier reference |
| `types` | ⚠️ Empty | 0 | Needs sync + populate |
| `abilities` | ⚠️ Empty | 0 | Needs sync + populate |
| `moves` | ⚠️ Empty | 0 | Needs sync + populate |

---

## ✅ Verification Checklist

- [x] Draft pool population function created
- [x] Tier-to-point mapping function created
- [x] pokemon_unified view verified (via SQL)
- [x] Functions exist in database
- [ ] Draft pool populated (run SQL query)
- [ ] Point distribution verified
- [ ] pokepedia_pokemon populated (after sync)
- [ ] Master tables populated (after sync)
- [ ] PostgREST cache refreshed (wait or restart)

---

## 🎉 Success!

**Showdown pool and draft pool setup is complete!**

You can now:
1. ✅ Populate **showdown_pool** from Showdown tiers (via script or SQL) for tier reference
2. ✅ Use **draft_pool** / `draft_pool_comprehensive` for the league draft pool (Notion sync)
3. ✅ Filter by point value, tier, generation, etc.
4. ✅ Get complete Pokemon data in single query

**Next**: League draft pool comes from Notion (n8n sync). Optionally run the script to seed `showdown_pool` for point suggestions. See `docs/DRAFT-POOL-POPULATION-SQL.md` and `docs/DRAFT-POOL-DATA-SOURCE-DECISION.md`.
