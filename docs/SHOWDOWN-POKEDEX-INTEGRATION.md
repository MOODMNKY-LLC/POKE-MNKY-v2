# Pokémon Showdown Pokedex Integration

This document describes the integration of Pokémon Showdown's `pokedex.json` into the POKE-MNKY Supabase database.

## Overview

We integrate Showdown's canonical Pokémon data to provide:
- **Battle-format metadata** (tiers, base stats, abilities)
- **Forme support** (Galar, Alola, Mega, etc.)
- **Traceability** (raw JSON storage for audit/debugging)
- **Query optimization** (relational tables for fast lookups)

## Architecture

### Data Flow

```
pokedex.json (Showdown)
    ↓
showdown_pokedex_raw (raw JSON storage)
    ↓
pokemon_showdown (relational table)
pokemon_showdown_types (junction table)
pokemon_showdown_abilities (junction table)
    ↓
draft_pool_with_showdown (view for integration)
```

### Tables

#### `showdown_pokedex_raw`
- **Purpose**: Raw JSON storage for traceability
- **Key**: `showdown_id` (e.g., "mrmimegalar")
- **Fields**: `payload` (full JSON), `source_version`, `fetched_at`, `etag`

#### `pokemon_showdown`
- **Purpose**: Query-optimized Pokémon data
- **Key**: `showdown_id`
- **Fields**: dex_num, name, base stats (hp/atk/def/spa/spd/spe), tier, forme, etc.

#### `pokemon_showdown_types`
- **Purpose**: Many-to-many relationship for types
- **Key**: `(showdown_id, slot)`
- **Fields**: `slot` (1 or 2), `type`
- **Note**: Named to avoid conflict with existing `pokemon_types` table (PokéAPI)

#### `pokemon_showdown_abilities`
- **Purpose**: Many-to-many relationship for abilities
- **Key**: `(showdown_id, slot)`
- **Fields**: `slot` ("0", "1", "H"), `ability`
- **Note**: Named to avoid conflict with existing `pokemon_abilities` table (PokéAPI)

## Usage

### Initial Setup

1. **Run the migration**:
   ```bash
   # If using Supabase CLI locally
   supabase migration up
   
   # Or apply manually via Supabase Dashboard SQL Editor
   # File: supabase/migrations/20260120000000_create_showdown_pokedex_tables.sql
   ```

2. **Run the ingest script**:
   ```bash
   tsx scripts/ingest-showdown-pokedex.ts
   ```

   Or add to `package.json`:
   ```json
   {
     "scripts": {
       "ingest:showdown": "tsx scripts/ingest-showdown-pokedex.ts"
     }
   }
   ```

### Querying Data

#### Get Showdown data for a draft pool Pokémon

```sql
SELECT 
  dp.pokemon_name,
  dp.point_value,
  ps.tier AS showdown_tier,
  ps.hp, ps.atk, ps.def, ps.spa, ps.spd, ps.spe,
  ps.types,
  ps.abilities
FROM draft_pool_with_showdown dp
WHERE dp.season_id = 'your-season-id'
  AND dp.status = 'available';
```

#### Find Pokémon by Showdown tier

```sql
SELECT 
  ps.name,
  ps.tier,
  dp.point_value
FROM pokemon_showdown ps
LEFT JOIN draft_pool dp ON lower(dp.pokemon_name) = lower(ps.name)
WHERE ps.tier = 'OU'
  AND dp.season_id = 'your-season-id';
```

#### Get all formes of a base species

```sql
SELECT 
  showdown_id,
  name,
  forme,
  tier
FROM pokemon_showdown
WHERE base_species = 'charizard'
ORDER BY forme NULLS FIRST;
```

### Using Helper Functions

#### Normalize Showdown ID to name format

```sql
SELECT public.normalize_showdown_id_to_name('mrmimegalar');
-- Returns: "Mr. Mime-Galar"
```

#### Find Showdown entry by pokemon_name (fuzzy matching)

```sql
SELECT * FROM public.find_showdown_entry_by_name('Mr. Mime-Galar');
```

## Integration with Existing Tables

### Linking to `draft_pool`

The `draft_pool_with_showdown` view automatically joins:
- `draft_pool` (league-specific data)
- `pokemon_showdown` (Showdown battle metadata)
- `pokemon_types` (aggregated)
- `pokemon_abilities` (aggregated)

**Note**: Name matching uses fuzzy logic:
- Exact match: `"Pikachu"` = `"Pikachu"`
- Hyphenated: `"Mr. Mime-Galar"` = `"mrmimegalar"`
- Spaced: `"Flutter Mane"` = `"fluttermane"`

### Linking to `pokemon_cache`

Showdown's `dex_num` field corresponds to PokéAPI's `pokemon_id`:

```sql
SELECT 
  pc.pokemon_id,
  pc.name AS pokeapi_name,
  ps.showdown_id,
  ps.name AS showdown_name,
  ps.tier
FROM pokemon_cache pc
LEFT JOIN pokemon_showdown ps ON ps.dex_num = pc.pokemon_id
WHERE pc.pokemon_id = 25; -- Pikachu
```

**Note**: Formes complicate this mapping (e.g., "Pikachu" vs "Pikachu-Alola"). Use `base_species` for base form matching.

## Scheduled Updates

The system now supports both **automatic cron-based updates** and **manual triggers** from the admin panel.

### Option A: Edge Function + Cron (Recommended - Already Configured)

The migration `20260120000001_setup_showdown_pokedex_cron.sql` sets up a cron job that runs weekly:

- **Schedule**: Every Sunday at 2 AM UTC (`0 2 * * 0`)
- **Edge Function**: `ingest-showdown-pokedex`
- **Automatic**: No manual intervention needed

To verify the cron job is running:
```sql
SELECT * FROM public.get_showdown_pokedex_cron_status();
```

### Option B: Manual Trigger from Admin Panel

1. Navigate to `/admin` in your application
2. Find the "Showdown Competitive Database" card
3. Click "Update Competitive Database" button
4. Monitor progress in real-time

The admin panel component (`components/admin/showdown-pokedex-sync.tsx`) provides:
- One-click manual sync
- Real-time status updates
- Last sync timestamp
- Ingestion summary (processed count, errors, duration)

### Option C: API Route (Programmatic)

Call the API route directly:

```bash
POST /api/admin/showdown-pokedex/ingest
```

**Note**: Requires authentication (admin access recommended).

### Legacy: Manual Script Execution

You can still run the script manually if needed:

```bash
npm run ingest:showdown
# or
tsx scripts/ingest-showdown-pokedex.ts
```

**Note**: The Edge Function approach (Option A) is recommended for production as it:
- Runs serverless (no server maintenance)
- Automatically scheduled
- Can be triggered manually via admin panel
- Provides better error handling and logging

## Data Mapping Notes

### Showdown ID Format
- Lowercase, no spaces: `"mrmimegalar"`
- Forme suffixes: `galar`, `alola`, `hisui`, `mega`, `megax`, `megay`
- Special cases: `nidoranf`, `nidoranm`, `mimejr`, `typenull`

### Name Normalization
- Showdown: `"mrmimegalar"` → Display: `"Mr. Mime-Galar"`
- Showdown: `"fluttermane"` → Display: `"Flutter Mane"`
- Use `normalize_showdown_id_to_name()` function for conversion

### Tiers
- Showdown tiers are Smogon/battle-format oriented (e.g., "OU", "UU", "Illegal")
- **Do not confuse** with league draft point tiers (12-20 points)
- Showdown tier is metadata; league point_value is the actual draft cost

### Base Stats
- Stored as individual columns: `hp`, `atk`, `def`, `spa`, `spd`, `spe`
- Total BST can be calculated: `hp + atk + def + spa + spd + spe`
- Useful for filtering/searching by stat ranges

## Troubleshooting

### Name Matching Issues

If `draft_pool_with_showdown` view isn't matching Pokémon:

1. **Check name format**:
   ```sql
   SELECT DISTINCT pokemon_name FROM draft_pool LIMIT 10;
   SELECT DISTINCT name FROM pokemon_showdown LIMIT 10;
   ```

2. **Try manual matching**:
   ```sql
   SELECT * FROM public.find_showdown_entry_by_name('Your Pokemon Name');
   ```

3. **Update view logic** if needed (add more fuzzy matching patterns)

### Missing Data

If some Pokémon are missing:

1. **Check raw storage**:
   ```sql
   SELECT showdown_id FROM showdown_pokedex_raw WHERE showdown_id = 'missing-pokemon';
   ```

2. **Verify JSON structure**:
   ```sql
   SELECT payload FROM showdown_pokedex_raw WHERE showdown_id = 'missing-pokemon';
   ```

3. **Re-run ingest** for specific entries (modify script to accept `--pokemon` flag)

### Performance

If queries are slow:

1. **Check indexes**:
   ```sql
   \d+ pokemon_showdown
   \d+ pokemon_showdown_types
   \d+ pokemon_showdown_abilities
   ```

2. **Use the view** (`draft_pool_with_showdown`) instead of manual joins

3. **Add composite indexes** if needed:
   ```sql
   CREATE INDEX idx_pokemon_showdown_name_tier ON pokemon_showdown(name, tier);
   ```

## Future Enhancements

- [ ] Add evolution chain queries (using `evolution_data` JSONB)
- [ ] Add move data integration (from Showdown's `moves.json`)
- [ ] Add item data integration (from Showdown's `items.json`)
- [ ] Create materialized view for common queries
- [ ] Add full-text search on Pokémon names
- [ ] Add generation calculation from `dex_num`
- [ ] Add sprite URL mapping (Showdown sprites vs PokéAPI sprites)

## References

- **Showdown Pokedex**: https://play.pokemonshowdown.com/data/pokedex.json
- **Showdown Data Docs**: https://github.com/smogon/pokemon-showdown/tree/master/data
- **Migration File**: `supabase/migrations/20260120000000_create_showdown_pokedex_tables.sql`
- **Ingest Script**: `scripts/ingest-showdown-pokedex.ts`
