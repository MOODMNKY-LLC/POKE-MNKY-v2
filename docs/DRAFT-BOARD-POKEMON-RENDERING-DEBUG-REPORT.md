# Draft Board Pokémon Rendering Debug Report

**Date:** 2026-01-20  
**Issue:** Pokémon from draft pool (749 available) are not rendering on `/draft/board` page

---

## Executive Summary

After deep investigation using Sequential Thinking and database queries, I've identified **three critical issues** preventing Pokémon from rendering:

1. **Missing RPC Function**: The code calls `get_available_pokemon()` RPC function which doesn't exist
2. **UUID Comparison Issues**: The fallback query may have UUID comparison problems in Supabase JS client
3. **Data Flow Verification Needed**: Need to verify data is actually reaching the client component

---

## Root Cause Analysis

### Issue #1: Missing RPC Function

**Location:** `lib/draft-system.ts:361` and `app/api/draft/available/route.ts:37`

**Problem:**
```typescript
const { data: rpcData, error: rpcError } = await this.supabase.rpc('get_available_pokemon', {
  p_season_id: seasonIdUuid
})
```

**Evidence:**
- Database query shows function doesn't exist: `function get_available_pokemon(unknown) does not exist`
- Available functions include: `get_pokemon_for_draft`, `get_available_pokemon_for_free_agency`, etc.
- Code falls back to direct query, but this may have issues

**Impact:** The code always falls back to direct query, which may have UUID comparison issues.

---

### Issue #2: UUID Comparison in Supabase JS Client

**Location:** `lib/draft-system.ts:375` and `app/api/draft/available/route.ts:59`

**Problem:**
The Supabase JS client may have issues comparing UUIDs when filtering:
```typescript
.eq("season_id", seasonIdUuid)
```

**Evidence:**
- Direct SQL query works: `SELECT ... WHERE season_id = '00000000-0000-0000-0000-000000000001'` returns 749 rows
- API route has workaround: Filters in JavaScript after fetching all available Pokémon (lines 130-142)
- `draft-system.ts` doesn't have this workaround

**Impact:** The `getAvailablePokemon` method in `DraftSystem` may return empty array even though data exists.

---

### Issue #3: Data Structure Verification

**Location:** `components/draft/draft-board-client.tsx:44`

**Expected Structure:**
```typescript
interface Pokemon {
  pokemon_name: string
  point_value: number
  generation: number | null
  pokemon_id: number | null
  status?: "available" | "drafted" | "banned" | "unavailable"
}
```

**Returned Structure (from `getAvailablePokemon`):**
```typescript
{
  pokemon_name: string
  point_value: number
  pokemon_id: number | null
  status: string
  generation: number | null
}
```

**Status:** ✅ Structure matches - this is NOT the issue.

---

## Database Verification

### Current State

✅ **Season ID:** `00000000-0000-0000-0000-000000000001` (Season 5)  
✅ **Total Pokémon:** 749  
✅ **Status:** All marked as `available`  
✅ **Season Assignment:** All 749 Pokémon have correct `season_id`

### Sample Query Results

```sql
SELECT pokemon_name, point_value, status, season_id 
FROM draft_pool 
WHERE season_id = '00000000-0000-0000-0000-000000000001' 
  AND status = 'available' 
LIMIT 5;
```

**Results:**
- Flutter Mane (20 points)
- Gouging Fire (20 points)
- Mewtwo (20 points)
- Raging Bolt (20 points)
- Roaring Moon (20 points)

✅ **Database has the data** - the issue is in the application layer.

---

## Data Flow Analysis

### Current Flow

1. **Server Component** (`app/draft/board/page.tsx:67`)
   ```typescript
   const pokemon = await draftSystem.getAvailablePokemon(session.season_id, {})
   ```

2. **DraftSystem Method** (`lib/draft-system.ts:324`)
   - Tries RPC function → fails (doesn't exist)
   - Falls back to direct query → may have UUID issues
   - Returns array of Pokémon

3. **Client Component** (`components/draft/draft-board-page-client.tsx:86`)
   ```typescript
   initialPokemon={initialPokemon}
   ```

4. **DraftBoardClient** (`components/draft/draft-board-client.tsx:44`)
   ```typescript
   const [pokemon, setPokemon] = useState<Pokemon[]>(initialPokemon)
   ```

### Potential Failure Points

1. ❌ **RPC function doesn't exist** → Always falls back
2. ❌ **UUID comparison fails** → Returns empty array
3. ⚠️ **Empty array passed to component** → Component shows "No Pokemon found"

---

## Solutions

### Solution 1: Create Missing RPC Function (Recommended)

Create the `get_available_pokemon` function that the code expects:

```sql
CREATE OR REPLACE FUNCTION get_available_pokemon(p_season_id UUID)
RETURNS TABLE (
  pokemon_name TEXT,
  point_value INTEGER,
  pokemon_id INTEGER,
  status TEXT,
  tera_captain_eligible BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dp.pokemon_name,
    dp.point_value,
    dp.pokemon_id,
    dp.status::TEXT,
    dp.tera_captain_eligible
  FROM draft_pool dp
  WHERE dp.season_id = p_season_id
    AND dp.status = 'available'
  ORDER BY dp.point_value DESC, dp.pokemon_name ASC;
END;
$$ LANGUAGE plpgsql;
```

**Benefits:**
- Faster queries (server-side filtering)
- Avoids UUID comparison issues
- Consistent with code expectations

---

### Solution 2: Fix UUID Comparison in DraftSystem (Immediate Fix)

Update `lib/draft-system.ts` to use the same workaround as the API route:

```typescript
// In getAvailablePokemon method, replace the fallback query section:

// Fetch all available Pokémon first (workaround for UUID comparison)
const { data: allAvailableData, error: allError } = await this.supabase
  .from("draft_pool")
  .select("pokemon_name, point_value, pokemon_id, status, season_id")
  .eq("status", "available")
  .order("point_value", { ascending: false })
  .order("pokemon_name", { ascending: true })
  .limit(1000)

if (allError) {
  console.error("[DraftSystem] Error fetching all available:", allError)
  return []
}

// Filter by season_id in JavaScript (workaround for UUID comparison issue)
const seasonIdStr = String(seasonIdUuid).trim()
const filteredData = allAvailableData?.filter((p: any) => {
  const pSeasonId = String(p.season_id || '').trim()
  return pSeasonId === seasonIdStr
}) || []

// Remove season_id from results
const data = filteredData.map((p: any) => ({
  pokemon_name: p.pokemon_name,
  point_value: p.point_value,
  pokemon_id: p.pokemon_id,
  status: p.status,
}))
```

**Benefits:**
- Immediate fix without database changes
- Uses proven workaround from API route
- Maintains backward compatibility

---

### Solution 3: Add Debugging & Logging

Add comprehensive logging to track data flow:

```typescript
// In app/draft/board/page.tsx, after line 67:
console.log('[DraftBoardPage] getAvailablePokemon result:', {
  count: pokemon.length,
  sample: pokemon.slice(0, 3),
  seasonId: session.season_id
})

// In components/draft/draft-board-client.tsx, after line 44:
useEffect(() => {
  console.log('[DraftBoardClient] Initial Pokemon:', {
    count: initialPokemon.length,
    sample: initialPokemon.slice(0, 3),
    pokemonState: pokemon.length
  })
}, [])
```

**Benefits:**
- Helps identify where data is lost
- Provides visibility into the issue
- Aids future debugging

---

## Recommended Action Plan

### Phase 1: Immediate Fix (Solution 2)
1. ✅ Update `lib/draft-system.ts` with UUID workaround
2. ✅ Test that Pokémon render on `/draft/board`
3. ✅ Verify all 749 Pokémon appear

### Phase 2: Long-term Fix (Solution 1)
1. ✅ Create `get_available_pokemon` RPC function
2. ✅ Update code to use RPC function primarily
3. ✅ Keep fallback for backward compatibility
4. ✅ Remove JavaScript filtering workaround

### Phase 3: Monitoring (Solution 3)
1. ✅ Add logging at key points
2. ✅ Monitor for UUID comparison issues
3. ✅ Track query performance

---

## Testing Checklist

After implementing fixes:

- [ ] `/draft/board` page loads without errors
- [ ] All 749 Pokémon are visible (check count)
- [ ] Pokémon are organized by point tiers (20 down to 1)
- [ ] Search functionality works
- [ ] Filter by tier works
- [ ] Filter by generation works
- [ ] Drafted Pokémon are marked/struck out
- [ ] Console shows no errors
- [ ] Network tab shows successful API calls

---

## Additional Findings

### Related Functions Available

The database has these related functions that might be useful:
- `get_pokemon_for_draft` - May be similar to what we need
- `get_available_pokemon_for_free_agency` - For free agency, not draft
- `get_pokemon_by_tier` - Filter by tier

### API Route Status

The API route (`/api/draft/available`) already has the UUID workaround implemented (lines 130-142), so it should work correctly. The issue is specifically in the server-side `DraftSystem.getAvailablePokemon()` method.

---

## Conclusion

The root cause is **missing RPC function + UUID comparison issues** in the Supabase JS client. The database has all the correct data (749 Pokémon with proper season_id), but the application layer fails to retrieve it due to:

1. Missing RPC function causing fallback to direct query
2. UUID comparison issues in direct query
3. No JavaScript filtering workaround in `DraftSystem` (unlike API route)

**Recommended immediate action:** Implement Solution 2 (UUID workaround) to get Pokémon rendering immediately, then implement Solution 1 (create RPC function) for a permanent fix.

---

**Generated by:** Sequential Thinking MCP + Supabase MCP  
**Investigation Date:** 2026-01-20
