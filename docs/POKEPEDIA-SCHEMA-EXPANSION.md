# Poképedia Schema Expansion

## Overview

Expanded `pokepedia_pokemon` projection table to include commonly queried fields for better performance and filtering capabilities.

## Schema Changes

### New Columns Added

#### Types
- `types` (JSONB) - Array of type names: `["grass", "poison"]`
- `type_primary` (TEXT) - Primary type for fast filtering
- `type_secondary` (TEXT) - Secondary type (nullable for single-type Pokemon)

#### Base Stats
- `base_stats` (JSONB) - Object with all base stats:
  \`\`\`json
  {
    "hp": 45,
    "attack": 49,
    "defense": 49,
    "special-attack": 65,
    "special-defense": 65,
    "speed": 45
  }
  \`\`\`
- `total_base_stat` (INTEGER) - Sum of all base stats (for sorting by total power)

#### Abilities
- `abilities` (JSONB) - Array of ability objects:
  \`\`\`json
  [
    {"name": "overgrow", "is_hidden": false, "slot": 1},
    {"name": "chlorophyll", "is_hidden": true, "slot": 3}
  ]
  \`\`\`
- `ability_primary` (TEXT) - Primary ability name
- `ability_hidden` (TEXT) - Hidden ability name (nullable)

#### Ordering and Generation
- `order` (INTEGER) - National Dex order (for sorting)
- `generation` (INTEGER) - Generation number (1-9, calculated from order)

#### Cries
- `cry_latest_path` (TEXT) - Path to latest cry audio file in storage
- `cry_legacy_path` (TEXT) - Path to legacy cry audio file in storage

#### Counts
- `moves_count` (INTEGER) - Total number of moves this Pokemon can learn
- `forms_count` (INTEGER) - Number of forms this Pokemon has

## Indexes Added

### Single Column Indexes
- `pokepedia_pokemon_type_primary_idx` - Fast filtering by primary type
- `pokepedia_pokemon_type_secondary_idx` - Fast filtering by secondary type
- `pokepedia_pokemon_total_base_stat_idx` - Fast sorting by total stats
- `pokepedia_pokemon_generation_idx` - Fast filtering by generation
- `pokepedia_pokemon_order_idx` - Fast sorting by National Dex order
- `pokepedia_pokemon_ability_primary_idx` - Fast filtering by primary ability

### GIN Indexes (JSONB)
- `pokepedia_pokemon_types_gin` - Query types array efficiently
- `pokepedia_pokemon_abilities_gin` - Query abilities array efficiently
- `pokepedia_pokemon_base_stats_gin` - Query base stats efficiently

## Query Examples

### Filter by Type
\`\`\`sql
-- Single type
SELECT * FROM pokepedia_pokemon WHERE type_primary = 'fire';

-- Dual type
SELECT * FROM pokepedia_pokemon 
WHERE type_primary = 'fire' AND type_secondary = 'flying';

-- Any type (using JSONB)
SELECT * FROM pokepedia_pokemon 
WHERE types @> '["fire"]'::jsonb;
\`\`\`

### Filter by Ability
\`\`\`sql
-- Primary ability
SELECT * FROM pokepedia_pokemon WHERE ability_primary = 'intimidate';

-- Hidden ability
SELECT * FROM pokepedia_pokemon WHERE ability_hidden = 'moxie';

-- Any ability (using JSONB)
SELECT * FROM pokepedia_pokemon 
WHERE abilities @> '[{"name": "intimidate"}]'::jsonb;
\`\`\`

### Sort by Stats
\`\`\`sql
-- Sort by total base stat
SELECT * FROM pokepedia_pokemon 
ORDER BY total_base_stat DESC;

-- Filter and sort
SELECT * FROM pokepedia_pokemon 
WHERE type_primary = 'dragon'
ORDER BY total_base_stat DESC
LIMIT 10;
\`\`\`

### Filter by Generation
\`\`\`sql
SELECT * FROM pokepedia_pokemon 
WHERE generation = 1
ORDER BY "order";
\`\`\`

### Complex Queries
\`\`\`sql
-- Find all Fire-type Pokemon with high attack
SELECT * FROM pokepedia_pokemon 
WHERE type_primary = 'fire'
  AND (base_stats->>'attack')::int > 100
ORDER BY total_base_stat DESC;
\`\`\`

## Migration

Run the migration:
\`\`\`bash
supabase db push
\`\`\`

Or apply manually:
\`\`\`bash
psql -f supabase/migrations/20260113030000_expand_pokepedia_pokemon_projection.sql
\`\`\`

## Rebuild Projections

After migration, rebuild projections to populate new fields:
\`\`\`bash
pnpm tsx scripts/build-pokepedia-projections.ts
\`\`\`

## Benefits

1. **Fast Filtering**: Indexed columns enable fast type/ability/generation filtering
2. **Fast Sorting**: Indexed `total_base_stat` and `order` for efficient sorting
3. **Flexible Queries**: JSONB fields still allow complex queries when needed
4. **Better UX**: Common queries (filter by type, sort by stats) are now fast
5. **Future-Proof**: Can still query full JSONB for complex use cases

## Trade-offs

- **Storage**: Additional columns increase table size (~20-30% larger)
- **Maintenance**: More fields to extract and maintain
- **Flexibility**: JSONB still available for complex queries

## Next Steps

1. ✅ Migration created
2. ✅ Extraction script updated
3. ⏳ Run migration
4. ⏳ Rebuild projections
5. ⏳ Test queries
6. ⏳ Update UI to use new fields
