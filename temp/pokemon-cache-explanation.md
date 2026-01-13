# Pokemon Cache Explanation

## Why We're Fetching Data (Not Just Images)

The Pokemon showcase cards display **more than just images**:

### Data Needed by Cards:
1. **Name** - Pokemon name (e.g., "Charizard")
2. **ID** - National Dex number (#0006)
3. **Types** - For type badges (Fire, Flying)
4. **Base Stats** - HP, Attack, Defense, Speed (shown in stats grid)
5. **Abilities** - For ability badges
6. **Sprites** - For the artwork image

### Why Caching Exists:
- **Performance**: Avoid repeated PokeAPI calls
- **Rate Limits**: PokeAPI has rate limits
- **Offline Support**: Cache allows offline access
- **Speed**: Database queries are faster than API calls

## Current Behavior

### Before Fix:
- ❌ Always tried to cache (even on client-side)
- ❌ Failed on client-side due to RLS policies
- ❌ Caused console errors

### After Fix:
- ✅ **Server-side**: Caches when `SUPABASE_SERVICE_ROLE_KEY` is set
- ✅ **Client-side**: Skips caching (no errors)
- ✅ **Data still returned**: Cards work even without caching

## What Changed

**File**: `lib/pokemon-api-enhanced.ts`

```typescript
// Only cache if service role key available (server-side)
const shouldCache = !!process.env.SUPABASE_SERVICE_ROLE_KEY || 
                    process.env.ENABLE_POKEMON_CACHE === "true"

if (shouldCache) {
  // Try to cache (non-blocking)
  await supabase.from("pokemon_cache").upsert(extendedData)
} else {
  // Client-side: Skip caching, just return data
}
```

## Result

- ✅ **No more console errors** on client-side
- ✅ **Cards still work** (data is fetched and returned)
- ✅ **Caching only happens server-side** (where it's allowed)
- ✅ **Performance maintained** (server-side caching still works)

---

**Summary**: We fetch Pokemon data because cards need stats/types/abilities, not just images. Caching is now optional and only happens server-side to avoid RLS errors.
