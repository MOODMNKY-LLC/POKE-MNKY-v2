# Landing Page Performance Optimization

## Problem Analysis

The landing page (`/`) was experiencing significant performance issues:
- **Slow loading**: Multiple sequential API calls (27+ individual database queries)
- **Screen jumps**: Dynamic resizing as Pokemon data loaded
- **Layout shifts**: Cards resizing without fixed dimensions
- **Network overhead**: Each PokemonCompactCard made its own database query

## Root Cause

The `PokemonStarterShowcase` component rendered 27 starter Pokemon, and each `PokemonCompactCard` called `usePokemonData(pokemonId)` individually, resulting in:
- 27 separate Supabase queries
- No batching or caching
- Dynamic content loading causing layout shifts
- Images loading without proper dimensions

## Optimizations Implemented

### 1. Batch Fetching Hook (`hooks/use-pokemon-batch.ts`)
**Created**: New hook that fetches all Pokemon data in a single query
- Uses `.in("id", pokemonIds)` to fetch all Pokemon at once
- Reduces 27 queries to 1 query
- Returns a Map for O(1) lookup

### 2. Updated PokemonStarterShowcase Component
**Changes**:
- Uses `usePokemonBatch` to fetch all starter Pokemon data at once
- Passes pre-fetched data to `PokemonCompactCard` via `pokemonData` prop
- Eliminates individual API calls per card

### 3. Updated PokemonCompactCard Component
**Changes**:
- Accepts optional `pokemonData` prop for pre-fetched data
- Falls back to individual fetch only if data not provided (backward compatibility)
- Fixed dimensions: `minHeight: "200px"`, `width: "180px"` to prevent layout shifts
- Loading state only shows if data wasn't provided

### 4. Image Loading Optimization (`components/pokemon-sprite.tsx`)
**Changes**:
- Added `loading="lazy"` for non-artwork images
- Added `sizes` attribute for proper responsive image sizing
- Artwork images use `loading="eager"` and `priority={true}`

## Performance Improvements

### Before:
- **27 database queries** (one per Pokemon)
- **Dynamic layout shifts** as cards load
- **Slow initial render** waiting for all queries
- **Network overhead** from multiple requests

### After:
- **1 database query** (batch fetch all Pokemon)
- **Fixed dimensions** prevent layout shifts
- **Faster initial render** with single query
- **Reduced network overhead** from batching

## Expected Results

1. **Faster page load**: Single query vs 27 queries
2. **No layout shifts**: Fixed card dimensions
3. **Smoother scrolling**: Lazy-loaded images
4. **Better UX**: Cards appear faster with batch loading

## Files Modified

1. `hooks/use-pokemon-batch.ts` - NEW: Batch fetching hook
2. `components/pokemon-starter-showcase.tsx` - Uses batch fetching
3. `components/pokemon-compact-card.tsx` - Accepts pre-fetched data, fixed dimensions
4. `components/pokemon-sprite.tsx` - Optimized image loading

## Testing Recommendations

1. **Network tab**: Verify single query instead of 27
2. **Performance tab**: Check for reduced layout shifts
3. **Lighthouse**: Verify improved performance score
4. **Visual testing**: Ensure no layout jumps during load

## Future Optimizations

1. **React Query/SWR**: Add caching layer for Pokemon data
2. **Virtual scrolling**: For very long lists
3. **Image preloading**: Preload critical Pokemon images
4. **Service Worker**: Cache Pokemon data offline
