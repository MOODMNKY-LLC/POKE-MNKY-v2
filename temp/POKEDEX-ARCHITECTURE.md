# Comprehensive Pokedex Architecture

## 🎯 Objective

Build a complete, comprehensive Pokedex in Supabase that caches ALL Pokemon data from PokeAPI, enabling:
- **Low-latency access** to Pokemon data
- **Semantic search** capabilities
- **Virtual Pokedex** experience
- **Complete data** for building Pokemon-related components

---

## 📊 Current State Analysis

### Current Implementation
- **Table**: `pokemon_cache` (single denormalized table)
- **Data Stored**: Basic Pokemon info, stats, types, abilities, moves (limited)
- **Sync**: Uses `getPokemonDataExtended()` from `/pokemon` endpoint only
- **Missing**: Items, held items, evolution chains, forms, varieties, species data, location data, etc.

### Current Schema (pokemon_cache)
\`\`\`sql
- pokemon_id, name, types[], base_stats{}, abilities[], moves[]
- sprites{}, ability_details[], move_details[]
- generation, draft_cost, tier
- fetched_at, expires_at
\`\`\`

### Issues Identified
1. **Denormalized** - All data in one table (hard to query relationships)
2. **Incomplete** - Missing many PokeAPI endpoints
3. **No relationships** - Can't query "all Pokemon with ability X" efficiently
4. **Limited search** - No semantic search indexes
5. **No versioning** - Can't track data changes over time

---

## 🏗️ Comprehensive Schema Design

### Core Tables

#### 1. `pokemon` (Main Pokemon Data)
\`\`\`sql
- id, pokemon_id, name, base_experience, height, weight, order
- is_default, location_area_encounters_url
- sprites (JSONB), stats (JSONB), types (JSONB)
- species_id (FK), form_id (FK)
- created_at, updated_at
\`\`\`

#### 2. `pokemon_species` (Species Information)
\`\`\`sql
- id, species_id, name, order, gender_rate, capture_rate
- base_happiness, is_baby, is_legendary, is_mythical
- hatch_counter, has_gender_differences, forms_switchable
- growth_rate_id (FK), habitat_id (FK), generation_id (FK)
- evolution_chain_id (FK), color_id (FK), shape_id (FK)
- egg_groups (JSONB), flavor_text_entries (JSONB)
- created_at, updated_at
\`\`\`

#### 3. `pokemon_abilities` (Pokemon-Ability Relationships)
\`\`\`sql
- id, pokemon_id (FK), ability_id (FK)
- is_hidden, slot
- created_at
\`\`\`

#### 4. `abilities` (Ability Master Data)
\`\`\`sql
- id, ability_id, name, is_main_series
- effect_entries (JSONB), flavor_text_entries (JSONB)
- generation_id (FK)
- created_at, updated_at
\`\`\`

#### 5. `pokemon_moves` (Pokemon-Move Relationships)
\`\`\`sql
- id, pokemon_id (FK), move_id (FK)
- version_group_id (FK), move_learn_method_id (FK)
- level_learned_at, order
- created_at
\`\`\`

#### 6. `moves` (Move Master Data)
\`\`\`sql
- id, move_id, name, accuracy, effect_chance, pp, priority, power
- damage_class_id (FK), type_id (FK), target_id (FK)
- effect_entries (JSONB), flavor_text_entries (JSONB)
- stat_changes (JSONB), meta (JSONB)
- generation_id (FK)
- created_at, updated_at
\`\`\`

#### 7. `pokemon_types` (Pokemon-Type Relationships)
\`\`\`sql
- id, pokemon_id (FK), type_id (FK)
- slot
- created_at
\`\`\`

#### 8. `types` (Type Master Data)
\`\`\`sql
- id, type_id, name
- damage_relations (JSONB), game_indices (JSONB)
- generation_id (FK)
- created_at, updated_at
\`\`\`

#### 9. `pokemon_items` (Pokemon-Held Item Relationships)
\`\`\`sql
- id, pokemon_id (FK), item_id (FK)
- version_details (JSONB) -- rarity, version groups
- created_at
\`\`\`

#### 10. `items` (Item Master Data)
\`\`\`sql
- id, item_id, name, cost, fling_power, fling_effect_id (FK)
- attributes (JSONB), category_id (FK), effect_entries (JSONB)
- flavor_text_entries (JSONB), game_indices (JSONB)
- sprites (JSONB), held_by_pokemon (JSONB)
- created_at, updated_at
\`\`\`

#### 11. `evolution_chains` (Evolution Chain Data)
\`\`\`sql
- id, evolution_chain_id, baby_trigger_item_id (FK)
- chain_data (JSONB) -- Full evolution chain structure
- created_at, updated_at
\`\`\`

#### 12. `pokemon_forms` (Form Data)
\`\`\`sql
- id, form_id, name, order, form_order
- is_default, is_battle_only, is_mega
- pokemon_id (FK), version_group_id (FK)
- form_names (JSONB), form_sprites (JSONB)
- created_at, updated_at
\`\`\`

#### 13. `generations` (Generation Master Data)
\`\`\`sql
- id, generation_id, name
- abilities (JSONB), main_region_id (FK), moves (JSONB)
- pokemon_species (JSONB), types (JSONB)
- created_at, updated_at
\`\`\`

#### 14. `pokemon_stats` (Normalized Stats)
\`\`\`sql
- id, pokemon_id (FK), stat_id (FK)
- base_stat, effort
- created_at
\`\`\`

#### 15. `stats` (Stat Master Data)
\`\`\`sql
- id, stat_id, name, is_battle_only
- game_index, move_damage_class_id (FK)
- created_at, updated_at
\`\`\`

---

## 🔄 Sync Strategy

### Phase 1: Master Data (One-time)
1. **Types** - Fetch all types
2. **Abilities** - Fetch all abilities
3. **Moves** - Fetch all moves
4. **Items** - Fetch all items
5. **Stats** - Fetch all stats
6. **Generations** - Fetch all generations

### Phase 2: Pokemon Data (Bulk)
1. **Pokemon Species** - Fetch all species (1-1025+)
2. **Pokemon** - Fetch all Pokemon (1-1025+)
3. **Evolution Chains** - Fetch evolution chains
4. **Forms** - Fetch Pokemon forms

### Phase 3: Relationships (Bulk)
1. **Pokemon-Ability** relationships
2. **Pokemon-Move** relationships
3. **Pokemon-Type** relationships
4. **Pokemon-Item** relationships
5. **Pokemon-Stat** relationships

### Sync Order
\`\`\`
1. Types → 2. Abilities → 3. Moves → 4. Items → 5. Stats → 6. Generations
→ 7. Pokemon Species → 8. Pokemon → 9. Evolution Chains → 10. Forms
→ 11. Relationships (abilities, moves, types, items, stats)
\`\`\`

---

## 🔍 Search & Indexing Strategy

### Full-Text Search Indexes
\`\`\`sql
-- Pokemon name search
CREATE INDEX idx_pokemon_name_fts ON pokemon USING gin(to_tsvector('english', name));

-- Ability search
CREATE INDEX idx_abilities_name_fts ON abilities USING gin(to_tsvector('english', name));

-- Move search
CREATE INDEX idx_moves_name_fts ON moves USING gin(to_tsvector('english', name));

-- Type search
CREATE INDEX idx_types_name_fts ON types USING gin(to_tsvector('english', name));
\`\`\`

### Relationship Indexes
\`\`\`sql
-- Fast Pokemon lookups by type
CREATE INDEX idx_pokemon_types_pokemon ON pokemon_types(pokemon_id);
CREATE INDEX idx_pokemon_types_type ON pokemon_types(type_id);

-- Fast Pokemon lookups by ability
CREATE INDEX idx_pokemon_abilities_pokemon ON pokemon_abilities(pokemon_id);
CREATE INDEX idx_pokemon_abilities_ability ON pokemon_abilities(ability_id);

-- Fast Pokemon lookups by move
CREATE INDEX idx_pokemon_moves_pokemon ON pokemon_moves(pokemon_id);
CREATE INDEX idx_pokemon_moves_move ON pokemon_moves(move_id);
\`\`\`

### Composite Indexes
\`\`\`sql
-- Common query patterns
CREATE INDEX idx_pokemon_species_generation ON pokemon_species(generation_id);
CREATE INDEX idx_pokemon_generation ON pokemon(generation_id);
CREATE INDEX idx_pokemon_is_default ON pokemon(is_default);
\`\`\`

---

## 🚀 Implementation Plan

### Step 1: Create Comprehensive Schema
- [ ] Create migration file with all tables
- [ ] Add foreign keys and constraints
- [ ] Add indexes for search
- [ ] Add RLS policies

### Step 2: Build Sync System
- [ ] Create master data sync (types, abilities, moves, items, stats)
- [ ] Create Pokemon sync (species, Pokemon, forms, evolution chains)
- [ ] Create relationship sync (all many-to-many relationships)
- [ ] Add error handling and retry logic
- [ ] Add progress tracking

### Step 3: Enhance Current Sync Scripts
- [ ] Update `full-sync-pokemon.ts` to use new schema
- [ ] Update `incremental-sync-pokemon.ts` for updates
- [ ] Add relationship sync scripts

### Step 4: Add Search Capabilities
- [ ] Create semantic search functions
- [ ] Add full-text search indexes
- [ ] Create search API endpoints

### Step 5: Set Up Cron Jobs
- [ ] Create cron job for periodic refresh
- [ ] Add notification system for sync status
- [ ] Add monitoring and alerts

---

## 📝 Data Completeness Checklist

### Pokemon Data
- [x] Basic info (name, id, height, weight)
- [x] Stats (HP, Attack, Defense, etc.)
- [x] Types
- [x] Abilities (with details)
- [x] Moves (with details)
- [ ] Held items
- [ ] Forms and varieties
- [ ] Sprites (all variants)
- [ ] Location area encounters
- [ ] Base experience

### Species Data
- [ ] Evolution chain
- [ ] Egg groups
- [ ] Gender rate
- [ ] Capture rate
- [ ] Base happiness
- [ ] Growth rate
- [ ] Habitat
- [ ] Color
- [ ] Shape
- [ ] Flavor text entries
- [ ] Genera

### Relationship Data
- [ ] Pokemon → Abilities
- [ ] Pokemon → Moves (with learn methods)
- [ ] Pokemon → Types
- [ ] Pokemon → Items (held items)
- [ ] Pokemon → Stats
- [ ] Pokemon → Forms
- [ ] Species → Evolution Chain

---

## 🎯 Benefits

1. **Complete Data**: All PokeAPI data cached locally
2. **Fast Queries**: Normalized schema enables efficient queries
3. **Semantic Search**: Full-text search across all Pokemon data
4. **Relationship Queries**: "Find all Pokemon with ability X" instantly
5. **Low Latency**: No external API calls during app usage
6. **Offline Capable**: Complete Pokedex works offline
7. **Version Control**: Track data changes over time
8. **Extensible**: Easy to add new Pokemon properties

---

**Status**: Design complete, ready for implementation

**Next**: Create migration and sync system
