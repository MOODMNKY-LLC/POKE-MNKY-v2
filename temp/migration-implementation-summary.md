# Migration Implementation Summary: pokemon_cache → pokepedia_pokemon

**Status:** Ready for Implementation  
**Priority:** High (Production crashes due to empty pokemon_cache)

---

## ✅ Verification Complete

- ✅ Supabase MCP configured: `https://mcp.supabase.com/mcp?project_ref=chmrszrwlfeqovwxyrmt`
- ✅ `pokepedia_pokemon` has data in production
- ✅ `pokemon_cache` is empty
- ✅ Schema differences identified
- ✅ Migration plan created

---

## 🎯 Key Findings

### Schema Differences

1. **Primary Key:** `pokemon_id` → `id` (same value)
2. **Types:** `string[]` → `JSONB` array (same data, different format)
3. **Base Stats:** Object → `JSONB` object (same data, different format)
4. **Abilities:** `string[]` → `JSONB` array of objects `[{name, is_hidden, slot}]`
5. **Sprites:** URLs → Storage paths (`sprite_front_default_path`, `sprite_official_artwork_path`)
6. **Missing Fields:** `ability_details[]`, `move_details[]`, `moves[]`, `draft_cost`, `tier`, `expires_at`

### Data Availability

- ✅ Basic Pokemon info (name, id, height, weight, base_experience)
- ✅ Types (primary, secondary, full array)
- ✅ Base stats (all 6 stats + total)
- ✅ Abilities (primary, hidden, full array)
- ✅ Sprite paths (front default, official artwork)
- ✅ Generation and order
- ❌ Ability details (need to fetch from `abilities` table or `pokeapi_resources`)
- ❌ Move details (need to fetch from `moves` table or `pokeapi_resources`)
- ❌ Moves list (only `moves_count` available)
- ❌ Draft cost and tier (league-specific, may need separate table)

---

## 🚀 Implementation Steps

### Step 1: Create Adapter Function (NEW FILE)

**File:** `lib/pokepedia-adapter.ts`

**Purpose:** Convert `pokepedia_pokemon` rows to `PokemonDisplayData` format

**Key Functions:**
- `adaptPokepediaToDisplayData()` - Main adapter
- `fetchAbilityDetails()` - Optional: Fetch from `abilities` table
- `fetchMoveDetails()` - Optional: Fetch from `moves` table

### Step 2: Update Core Functions

**Files to Update:**
1. `lib/pokemon-utils.ts`
   - `getPokemon()` - Change table from `pokemon_cache` to `pokepedia_pokemon`
   - `getAllPokemonFromCache()` - Change table and field names
   - `searchPokemon()` - Update filters for new schema

2. `lib/pokemon-api-enhanced.ts`
   - `getPokemonDataExtended()` - Update cache queries

3. `lib/draft-system.ts`
   - Update all `pokemon_cache` queries

4. `lib/google-sheets-parsers/*`
   - Update Pokemon lookups

### Step 3: Handle Missing Fields

**Strategy:**
- **Lazy Loading:** Fetch `ability_details` and `move_details` only when needed
- **Caching:** Cache fetched details in memory or separate table
- **Fallback:** Use PokeAPI if database queries fail

### Step 4: Testing

1. Test adapter with sample data
2. Test all updated functions
3. Test with starter Pokemon (1, 4, 7, etc.)
4. Test search and filtering
5. Test sprite URL generation

### Step 5: Deployment

1. Deploy to staging
2. Test in production
3. Monitor for errors
4. Remove `pokemon_cache` dependency after verification

---

## 📋 Field Mapping Reference

| pokemon_cache | pokepedia_pokemon | Transformation |
|--------------|-------------------|----------------|
| `pokemon_id` | `id` | Direct |
| `name` | `name` | Direct |
| `types[]` | `types` (JSONB) | Parse JSONB array |
| `base_stats{}` | `base_stats` (JSONB) | Parse JSONB object, map keys (`special-attack` → `special_attack`) |
| `abilities[]` | `abilities` (JSONB) | Parse JSONB array, extract `name` field |
| `sprites.front_default` | `sprite_front_default_path` | Use existing `getSpriteUrl()` function |
| `sprites.official_artwork` | `sprite_official_artwork_path` | Use existing `getSpriteUrl()` function |
| `generation` | `generation` | Direct |
| `ability_details[]` | ❌ | Fetch from `abilities` table |
| `move_details[]` | ❌ | Fetch from `moves` table |
| `moves[]` | ❌ | Query `pokemon_moves` table |
| `draft_cost` | ❌ | Calculate or fetch from separate table |
| `tier` | ❌ | Calculate or fetch from separate table |
| `expires_at` | ❌ | Not needed (always current) |

---

## ⚠️ Critical Considerations

1. **Base Stats Key Mapping:**
   - `pokemon_cache`: `"special-attack"`, `"special-defense"`
   - `pokepedia_pokemon`: `"special_attack"`, `"special_defense"`
   - Need to map keys during transformation

2. **Abilities Format:**
   - `pokemon_cache`: `["overgrow", "chlorophyll"]`
   - `pokepedia_pokemon`: `[{name: "overgrow", is_hidden: false, slot: 1}, ...]`
   - Need to extract `name` field

3. **Sprite URLs:**
   - `pokemon_cache`: Full URLs
   - `pokepedia_pokemon`: Storage paths
   - Use existing `getSpriteUrl()` function (already handles this!)

4. **Missing Data:**
   - `ability_details` and `move_details` are optional in `PokemonDisplayData`
   - Can be fetched on-demand when needed
   - Consider caching strategy for performance

---

## 🎯 Success Criteria

- ✅ All Pokemon queries use `pokepedia_pokemon`
- ✅ Starter Pokemon display correctly on homepage
- ✅ Search functionality works
- ✅ Sprite images load correctly
- ✅ No production crashes
- ✅ Performance is acceptable (no significant slowdown)

---

## 📝 Next Actions

1. **Create adapter function** (`lib/pokepedia-adapter.ts`)
2. **Update `getPokemon()`** in `lib/pokemon-utils.ts`
3. **Update `getAllPokemonFromCache()`** in `lib/pokemon-utils.ts`
4. **Update `searchPokemon()`** in `lib/pokemon-utils.ts`
5. **Test with starter Pokemon**
6. **Deploy and verify**

---

**Ready to proceed with implementation!**
