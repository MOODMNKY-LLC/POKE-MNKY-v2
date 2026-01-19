# Database Optimization Plan - Leveraging Synced Data

## Overview

Now that we have comprehensive, validated data synced from PokéAPI and Pokémon Showdown, we can optimize our database structure and create efficient queries that leverage both sources.

## Current State

### Data Sources
1. **PokéAPI Sync** → `pokeapi_resources` (JSONB) → `pokepedia_pokemon` (projection)
   - Comprehensive Pokemon data (sprites, species, evolution chains)
   - Master data: types, abilities, moves, items, stats
   - Validated with Zod schemas

2. **Showdown Sync** → `showdown_pokedex_raw` (JSONB) → `pokemon_showdown` + junction tables
   - Battle metadata (tiers, competitive stats)
   - Formes and variants
   - Learnsets and abilities

### Existing Tables
- ✅ `pokepedia_pokemon` - Fast projection for UI queries
- ✅ `pokemon_showdown` - Battle metadata
- ✅ `types`, `abilities`, `moves` - Master data tables (may need population)
- ✅ `pokemon_types`, `pokemon_abilities`, `pokemon_moves` - Junction tables
- ✅ `pokemon_comprehensive` - Comprehensive Pokemon table
- ✅ `draft_pool_with_showdown` - View combining draft pool + Showdown data

## Opportunities

### 1. Populate Master Tables from Synced Data

**Problem**: Master tables (`types`, `abilities`, `moves`) exist but may not be fully populated from `pokeapi_resources`.

**Solution**: Create PostgreSQL functions to extract and populate master tables from JSONB data.

**Benefits**:
- No need to re-sync from external APIs
- Uses validated, already-synced data
- Faster than external API calls
- Atomic operations

### 2. Create Unified Pokemon Views

**Problem**: App needs to query both PokéAPI and Showdown data separately.

**Solution**: Create unified views that intelligently merge data from both sources.

**Benefits**:
- Single query for complete Pokemon data
- Automatic name matching (handles formes, variants)
- Fallback logic (PokéAPI → Showdown → defaults)

### 3. Optimize Common Queries

**Problem**: Common queries (Pokemon listing, search, filtering) may be slow.

**Solution**: 
- Create materialized views for frequently accessed data
- Add strategic indexes
- Create helper functions for common patterns

**Benefits**:
- Faster page loads
- Better user experience
- Reduced database load

### 4. Enhance Draft Pool Integration

**Problem**: `draft_pool_with_showdown` only includes Showdown data.

**Solution**: Extend to include PokéAPI data (sprites, types, abilities).

**Benefits**:
- Complete Pokemon data in draft context
- Better UI components
- Richer draft experience

## Implementation Plan

### Phase 1: Populate Master Tables

**Functions to Create**:
1. `populate_types_from_pokeapi()` - Extract types from `pokeapi_resources`
2. `populate_abilities_from_pokeapi()` - Extract abilities from `pokeapi_resources`
3. `populate_moves_from_pokeapi()` - Extract moves from `pokeapi_resources`
4. `populate_pokemon_species_from_pokeapi()` - Extract species data
5. `populate_pokemon_comprehensive_from_pokeapi()` - Extract comprehensive Pokemon data

**Junction Tables**:
6. `populate_pokemon_types_from_pokeapi()` - Populate `pokemon_types`
7. `populate_pokemon_abilities_from_pokeapi()` - Populate `pokemon_abilities`
8. `populate_pokemon_moves_from_pokeapi()` - Populate `pokemon_moves`

### Phase 2: Unified Views

**Views to Create**:
1. `pokemon_unified` - Combines `pokepedia_pokemon` + `pokemon_showdown`
   - Matches by: `pokemon_id` = `dex_num` OR name matching
   - Includes: sprites, types, abilities, stats, tiers
   
2. `pokemon_with_all_data` - Complete Pokemon data with relationships
   - Joins: Pokemon + Types + Abilities + Moves + Species
   - Aggregates: types array, abilities array, moves array

3. `draft_pool_comprehensive` - Enhanced draft pool view
   - Extends `draft_pool_with_showdown`
   - Adds: PokéAPI sprites, types, abilities

### Phase 3: Helper Functions

**Functions to Create**:
1. `get_pokemon_by_id(pokemon_id)` - Get complete Pokemon data by ID
2. `get_pokemon_by_name(pokemon_name)` - Get complete Pokemon data by name (fuzzy matching)
3. `search_pokemon(query, filters)` - Search Pokemon with filters (type, ability, tier, etc.)
4. `get_pokemon_for_draft(season_id)` - Get Pokemon available for draft with all data

### Phase 4: Optimization

**Indexes**:
- Composite indexes on junction tables
- Full-text search indexes on names
- GIN indexes on JSONB columns for filtering

**Materialized Views**:
- `pokemon_list_materialized` - Pre-computed Pokemon list with common fields
- Refresh strategy: On-demand or scheduled

## Benefits Summary

1. **Performance**: Faster queries, reduced API calls
2. **Completeness**: Unified data from both sources
3. **Reliability**: Uses validated, synced data
4. **Maintainability**: Centralized data extraction logic
5. **User Experience**: Faster page loads, richer data

## Next Steps

1. ✅ Create migration for master table population functions
2. ✅ Create migration for unified views
3. ✅ Create migration for helper functions
4. ✅ Test with existing app queries
5. ✅ Update app code to use new views/functions
6. ✅ Monitor performance improvements
