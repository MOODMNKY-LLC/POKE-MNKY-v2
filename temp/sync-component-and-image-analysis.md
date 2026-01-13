# Sync Component & Pokemon Image Analysis

**Date:** January 13, 2026  
**Status:** Analysis Complete - Implementation Ready

---

## 🔍 Analysis Summary

### 1. Sync Component (`PokepediaSyncProvider`)

**Current State:**
- Wraps entire app in root layout (`app/layout.tsx`)
- Auto-starts sync on mount (`autoStart={true}`)
- Shows banner for all statuses except completed with 100% progress
- Syncs Pokemon DATA (not sprites) from Supabase to IndexedDB for offline access
- Uses `usePokepediaSync` hook which checks IndexedDB and triggers background sync

**Purpose:**
- Offline-first Pokemon data access
- Progressive sync: Master data → Critical Pokemon (1-50) → Background sync
- Keeps local IndexedDB in sync with Supabase `pokepedia_pokemon` table

**Is It Still Needed?**
- ✅ **YES** - If offline access is desired
- ⚠️ **MAYBE** - If database is already populated and we're not actively syncing
- ❌ **NO** - If offline access isn't needed

**Recommendation:**
1. **Refactor to be smarter**: Only show banner when sync is actually needed or running
2. **Check local status first**: Don't auto-start if IndexedDB already has data
3. **Make it optional**: Add prop to disable auto-start, or check if sync is needed before showing

**Implementation Options:**
- Option A: Keep but make smarter (check local status before showing)
- Option B: Make it admin-only (move to admin dashboard)
- Option C: Remove if offline access isn't needed

---

### 2. Pokemon Image Issue on Landing Page

**Problem:**
- `PokemonShowcase` renders `PokemonSprite` with only `name` prop (e.g., "charizard")
- `PokemonSprite` falls back to constructing GitHub URL: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/charizard.png`
- This doesn't work because PokeAPI uses IDs, not names in URLs

**Root Cause:**
- `PokemonSprite` needs either `pokemonId` or `pokemon` object to construct correct URL
- When only `name` is provided, it tries to use name directly in GitHub URL
- MinIO has sprites at `sprites/pokemon/{id}.png` but `getFallbackSpriteUrl` uses wrong path structure

**Actual MinIO Path Structure:**
- Regular: `sprites/pokemon/{id}.png` (e.g., `sprites/pokemon/6.png` for Charizard)
- Shiny: `sprites/pokemon/shiny/{id}.png`
- Back: `sprites/pokemon/back/{id}.png`

**Current `getFallbackSpriteUrl` Path Structure (WRONG):**
- Uses: `sprites/pokemon/{id}/front_default.png` ❌
- Should use: `sprites/pokemon/{id}.png` ✅

**Solution:**
1. Fix `getFallbackSpriteUrl` to use correct MinIO path structure
2. Update `PokemonShowcase` to pass `pokemonId` prop (create name-to-ID mapping)
3. Or update `PokemonSprite` to fetch Pokemon data by name to get ID

**Featured Pokemon Name-to-ID Mapping:**
```typescript
const FEATURED_POKEMON_IDS = {
  charizard: 6,
  garchomp: 445,
  metagross: 376,
  greninja: 658,
  mimikyu: 778,
  corviknight: 823,
}
```

---

## 🛠️ Implementation Plan

### Step 1: Fix `getFallbackSpriteUrl` Path Structure

**File:** `lib/pokemon-utils.ts`

**Current (WRONG):**
```typescript
const storagePath = shiny
  ? `sprites/pokemon/${pokemonId}/front_shiny.png`
  : `sprites/pokemon/${pokemonId}/front_default.png`
```

**Should be:**
```typescript
const storagePath = shiny
  ? `sprites/pokemon/shiny/${pokemonId}.png`
  : `sprites/pokemon/${pokemonId}.png`
```

**Also handle back mode:**
```typescript
let storagePath: string
if (mode === "back") {
  storagePath = `sprites/pokemon/back/${pokemonId}.png`
} else if (shiny) {
  storagePath = `sprites/pokemon/shiny/${pokemonId}.png`
} else {
  storagePath = `sprites/pokemon/${pokemonId}.png`
}
```

### Step 2: Update `PokemonShowcase` to Pass `pokemonId`

**File:** `components/pokemon-showcase.tsx`

**Add name-to-ID mapping:**
```typescript
const FEATURED_POKEMON_IDS: Record<string, number> = {
  charizard: 6,
  garchomp: 445,
  metagross: 376,
  greninja: 658,
  mimikyu: 778,
  corviknight: 823,
}
```

**Update PokemonSprite call:**
```typescript
<PokemonSprite 
  name={pokemon.name} 
  pokemonId={FEATURED_POKEMON_IDS[pokemon.name.toLowerCase()]} 
  size="xl" 
  className="drop-shadow-2xl animate-scale-in" 
/>
```

### Step 3: Refactor Sync Component (Optional)

**File:** `components/pokepedia-sync-provider.tsx`

**Option A: Check local status before showing**
```typescript
const shouldShowBanner = 
  syncState.status === "syncing" || 
  syncState.status === "stopped" ||
  (syncState.status === "idle" && syncState.localCount === 0)
```

**Option B: Make autoStart conditional**
```typescript
// Only auto-start if IndexedDB is empty
useEffect(() => {
  if (!autoStart) return
  
  checkLocalStatus().then(({ needsSync }) => {
    if (needsSync && syncState.localCount === 0) {
      startSync()
    }
  })
}, [autoStart, checkLocalStatus, startSync, syncState.localCount])
```

---

## ✅ Next Steps

1. ✅ Fix `getFallbackSpriteUrl` path structure
2. ✅ Update `PokemonShowcase` with name-to-ID mapping
3. ⏳ Refactor sync component (optional, based on user preference)
4. ⏳ Test Pokemon images on landing page
5. ⏳ Verify MinIO URLs work correctly

---

**Last Updated:** January 13, 2026  
**Status:** Ready for Implementation
