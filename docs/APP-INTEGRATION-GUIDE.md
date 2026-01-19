# App Integration Guide - Using Optimized Database Features

## Overview

Now that we have unified views, helper functions, and populated master tables, here's how to integrate them into your app for better performance and comprehensive data access.

## 🎯 Key Benefits

1. **Single Query**: Get complete Pokemon data (PokéAPI + Showdown) in one query
2. **Type-Safe**: Uses validated, synced data
3. **Fast**: Optimized views with strategic indexes
4. **Comprehensive**: All Pokemon data in one place

## 📊 Available Resources

### Views
- `pokemon_unified` - Complete Pokemon data from both sources
- `pokemon_with_all_data` - Includes normalized relationships
- `draft_pool_comprehensive` - Enhanced draft pool with all data

### Helper Functions
- `get_pokemon_by_id(pokemon_id)` - Get Pokemon by ID
- `get_pokemon_by_name(pokemon_name)` - Get Pokemon by name (fuzzy)
- `search_pokemon(query, filters)` - Search with filters
- `get_pokemon_for_draft(season_id)` - Get draft Pokemon

## 🔄 Migration Strategy

### Phase 1: Update API Routes

Replace existing Pokemon queries with unified views:

**Before:**
```typescript
// app/api/pokemon/[id]/route.ts
const { data: pokemon } = await supabase
  .from('pokepedia_pokemon')
  .select('*')
  .eq('id', id)
  .single()

// Then separately fetch Showdown data
const { data: showdown } = await supabase
  .from('pokemon_showdown')
  .select('*')
  .eq('dex_num', id)
  .single()

// Merge manually
const merged = { ...pokemon, ...showdown }
```

**After:**
```typescript
// app/api/pokemon/[id]/route.ts
const { data: pokemon } = await supabase
  .from('pokemon_unified')
  .select('*')
  .eq('pokemon_id', id)
  .single()

// Or use helper function
const { data: pokemon } = await supabase
  .rpc('get_pokemon_by_id', { pokemon_id_param: id })
  .single()
```

### Phase 2: Update Components

**Before:**
```typescript
// components/pokemon-card.tsx
const [pokemon, setPokemon] = useState(null)
const [showdown, setShowdown] = useState(null)

useEffect(() => {
  // Fetch PokéAPI data
  supabase.from('pokepedia_pokemon')
    .select('*')
    .eq('id', pokemonId)
    .single()
    .then(({ data }) => setPokemon(data))
  
  // Fetch Showdown data
  supabase.from('pokemon_showdown')
    .select('*')
    .eq('dex_num', pokemonId)
    .single()
    .then(({ data }) => setShowdown(data))
}, [pokemonId])
```

**After:**
```typescript
// components/pokemon-card.tsx
const [pokemon, setPokemon] = useState(null)

useEffect(() => {
  supabase
    .from('pokemon_unified')
    .select('*')
    .eq('pokemon_id', pokemonId)
    .single()
    .then(({ data }) => setPokemon(data))
}, [pokemonId])
```

### Phase 3: Update Draft Board

**Before:**
```typescript
// components/draft/draft-board.tsx
const { data: draftPool } = await supabase
  .from('draft_pool')
  .select('*')
  .eq('season_id', seasonId)

// Then fetch Pokemon data separately for each
```

**After:**
```typescript
// components/draft/draft-board.tsx
const { data: draftPool } = await supabase
  .from('draft_pool_comprehensive')
  .select('*')
  .eq('season_id', seasonId)
  .eq('status', 'available')

// All Pokemon data (sprites, types, abilities, stats, tiers) included!
```

## 💡 Usage Examples

### Example 1: Pokemon Detail Page

```typescript
// app/pokemon/[id]/page.tsx
export default async function PokemonPage({ params }: { params: { id: string } }) {
  const supabase = createServerClient()
  
  const { data: pokemon } = await supabase
    .from('pokemon_unified')
    .select(`
      pokemon_id,
      name,
      sprite_official_artwork_path,
      types,
      abilities,
      hp, atk, def, spa, spd, spe,
      showdown_tier,
      generation,
      base_experience,
      height,
      weight
    `)
    .eq('pokemon_id', parseInt(params.id))
    .single()

  if (!pokemon) {
    return <div>Pokemon not found</div>
  }

  return (
    <div>
      <img src={pokemon.sprite_official_artwork_path} alt={pokemon.name} />
      <h1>{pokemon.name}</h1>
      <div>Types: {pokemon.types?.join(', ')}</div>
      <div>Tier: {pokemon.showdown_tier}</div>
      <div>Stats: HP {pokemon.hp} / Atk {pokemon.atk} / Def {pokemon.def}</div>
    </div>
  )
}
```

### Example 2: Pokemon Search

```typescript
// app/api/pokemon/search/route.ts
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')
  const type = searchParams.get('type')
  const tier = searchParams.get('tier')
  const generation = searchParams.get('generation')

  const supabase = createServerClient()

  const { data: results } = await supabase
    .rpc('search_pokemon', {
      search_query: query || null,
      type_filter: type || null,
      tier_filter: tier || null,
      generation_filter: generation ? parseInt(generation) : null,
      limit_count: 50
    })

  return NextResponse.json({ results })
}
```

### Example 3: Draft Pool with Complete Data

```typescript
// app/api/draft/pool/route.ts
export async function GET(request: NextRequest) {
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
    .order('pokemon_name')

  return NextResponse.json({ pool })
}
```

### Example 4: Type Filtering

```typescript
// components/pokemon-type-filter.tsx
export function PokemonTypeFilter({ onFilter }: { onFilter: (type: string) => void }) {
  const [types, setTypes] = useState<string[]>([])

  useEffect(() => {
    // Get unique types from unified view
    supabase
      .from('pokemon_unified')
      .select('type_primary, type_secondary')
      .then(({ data }) => {
        const uniqueTypes = new Set<string>()
        data?.forEach(p => {
          if (p.type_primary) uniqueTypes.add(p.type_primary)
          if (p.type_secondary) uniqueTypes.add(p.type_secondary)
        })
        setTypes(Array.from(uniqueTypes).sort())
      })
  }, [])

  return (
    <select onChange={(e) => onFilter(e.target.value)}>
      <option value="">All Types</option>
      {types.map(type => (
        <option key={type} value={type}>{type}</option>
      ))}
    </select>
  )
}
```

## 🚀 Performance Tips

### 1. Use Specific Column Selection

**Avoid:**
```typescript
.select('*') // Fetches all columns
```

**Prefer:**
```typescript
.select('pokemon_id, name, sprite_official_artwork_path, types, abilities, hp, atk, def')
```

### 2. Use Helper Functions for Common Queries

Helper functions are optimized and cached:
```typescript
// Fast - uses optimized function
const { data } = await supabase.rpc('get_pokemon_by_id', { pokemon_id_param: 25 })
```

### 3. Leverage Indexes

The views have indexes on commonly queried fields:
- `pokemon_id` / `dex_num`
- `name`
- `type_primary` / `type_secondary`
- `generation`
- `showdown_tier`

### 4. Batch Queries

For multiple Pokemon, use `IN` clause:
```typescript
const { data } = await supabase
  .from('pokemon_unified')
  .select('*')
  .in('pokemon_id', [1, 4, 7, 25, 150])
```

## 🔍 Testing Checklist

- [ ] Verify `pokemon_unified` view returns data
- [ ] Test `get_pokemon_by_id()` function
- [ ] Test `get_pokemon_by_name()` with various name formats
- [ ] Test `search_pokemon()` with different filters
- [ ] Verify `draft_pool_comprehensive` includes all expected fields
- [ ] Check query performance (should be faster than before)
- [ ] Verify sprites, types, abilities are populated correctly
- [ ] Test Showdown tier data is included

## 📝 Migration Checklist

1. **Identify all Pokemon queries** in your codebase
2. **Replace with unified views** one component at a time
3. **Test each change** before moving to the next
4. **Update TypeScript types** if needed
5. **Monitor performance** improvements
6. **Update documentation** for your team

## 🐛 Troubleshooting

### View returns empty results
- Check if `pokepedia_pokemon` and `pokemon_showdown` have data
- Verify the JOIN conditions match your data
- Check for NULL values in join columns

### Helper function not found
- Verify function exists: `SELECT proname FROM pg_proc WHERE proname = 'get_pokemon_by_id'`
- Check permissions: Functions should be granted to `authenticated` role
- Try querying the view directly instead

### Performance issues
- Use specific column selection instead of `*`
- Add indexes if querying by custom fields
- Consider materialized views for frequently accessed data

## 📚 Next Steps

1. **Start with one component** - Update Pokemon detail page first
2. **Measure performance** - Compare before/after query times
3. **Iterate** - Update other components gradually
4. **Optimize** - Add materialized views if needed
5. **Document** - Update your team's coding guidelines

## 🎉 Benefits Realized

After migration, you'll have:
- ✅ Faster page loads (single query vs multiple)
- ✅ Richer data (PokéAPI + Showdown combined)
- ✅ Better UX (complete Pokemon info immediately)
- ✅ Easier maintenance (one source of truth)
- ✅ Type safety (validated data)
