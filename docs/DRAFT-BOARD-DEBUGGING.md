# Draft Board Pokemon Rendering Debugging Guide

**Date**: January 19, 2026  
**Status**: 🔍 **DEBUGGING IN PROGRESS**

---

## 🐛 Issue

Pokemon from `draft_pool` are not rendering in the Draft Board component, even though:
- ✅ Database has 749 Pokemon
- ✅ All Pokemon have `status = 'available'`
- ✅ All Pokemon are linked to Season 5 (`00000000-0000-0000-0000-000000000001`)

---

## ✅ Database Verification

**Query Results**:
```sql
-- Total Pokemon
SELECT COUNT(*) FROM draft_pool;
-- Result: 749 Pokemon

-- Available Pokemon for Season 5
SELECT COUNT(*) FROM draft_pool 
WHERE season_id = '00000000-0000-0000-0000-000000000001' 
  AND status = 'available';
-- Result: 749 Pokemon

-- Sample Pokemon
SELECT pokemon_name, point_value, status 
FROM draft_pool 
WHERE season_id = '00000000-0000-0000-0000-000000000001' 
  AND status = 'available'
LIMIT 5;
-- Result: Flutter Mane (20), Gouging Fire (20), Mewtwo (20), etc.
```

**Database Status**: ✅ **POPULATED AND CORRECT**

---

## 🔍 Debugging Steps

### Step 1: Check Browser Console

Open browser DevTools (F12) and look for these logs:

1. **`[DraftBoardSection]`** logs:
   - Should show: `"Rendering view-only board with seasonId: 00000000-0000-0000-0000-000000000001"`
   - If missing: `seasonId` is not being set

2. **`[DraftBoard]`** logs:
   - Should show: `"Fetching Pokemon for season: 00000000-0000-0000-0000-000000000001"`
   - Should show: `"API response: { success: true, count: 749 }"`
   - Should show: `"Setting Pokemon: 749"`
   - Should show: `"Pokemon state: { total: 749, filtered: 749, ... }"`

3. **`[API /draft/available]`** logs (server-side):
   - Should show: `"Found 749 Pokemon for season 00000000-0000-0000-0000-000000000001"`
   - If shows 0: Check `[DraftSystem]` logs for query errors

4. **`[DraftSystem]`** logs (server-side):
   - Should show: `"Found 749 Pokemon from draft_pool for season 00000000-0000-0000-0000-000000000001"`
   - If shows error: Check RLS policies or query syntax

### Step 2: Test API Route Directly

**In Browser Console**:
```javascript
// Test the API route
fetch('/api/draft/available?limit=500&season_id=00000000-0000-0000-0000-000000000001')
  .then(r => r.json())
  .then(data => {
    console.log('API Response:', data)
    console.log('Pokemon Count:', data.pokemon?.length || 0)
    console.log('Sample Pokemon:', data.pokemon?.slice(0, 5))
  })
```

**Expected Result**:
```json
{
  "success": true,
  "pokemon": [
    { "pokemon_name": "Flutter Mane", "point_value": 20, ... },
    ...
  ],
  "total": 749
}
```

**If Error**:
- Check Network tab for HTTP status code
- Check server logs for `[API /draft/available]` errors
- Verify `seasonId` parameter is correct

### Step 3: Check Component Props

**In Browser Console**:
```javascript
// Check if DraftBoard is receiving correct props
// Add this temporarily to DraftBoard component:
console.log('[DraftBoard] Props:', { sessionId, currentTeamId, seasonId, isYourTurn })
```

**Expected**:
- `seasonId`: `"00000000-0000-0000-0000-000000000001"`
- `sessionId`: `""` (empty string if no session)
- `currentTeamId`: `null` or UUID
- `isYourTurn`: `false`

### Step 4: Check Filtering Logic

The component filters Pokemon by:
- **Search Query**: `searchQuery` (default: `""`)
- **Point Tier**: `selectedTier` (default: `"all"`)
- **Generation**: `selectedGeneration` (default: `"all"`)

**If Pokemon are loaded but not showing**:
- Check if filters are accidentally set
- Check console for: `"Pokemon state: { total: 749, filtered: 0, ... }"`
- If `filtered: 0`, filters are removing all Pokemon

---

## 🔧 Common Issues & Fixes

### Issue 1: `seasonId` is `null` or `undefined`

**Symptoms**:
- Console shows: `"[DraftBoard] No seasonId provided, skipping fetch"`
- UI shows: `"Season ID: Not provided"`

**Fix**:
- Check `DraftBoardSection` is setting `seasonId` correctly
- Verify current season exists: `SELECT * FROM seasons WHERE is_current = true`

### Issue 2: API Returns Empty Array

**Symptoms**:
- Console shows: `"[DraftBoard] API response: { success: true, count: 0 }"`
- Server logs show: `"[DraftSystem] No Pokemon found for season ..."`

**Possible Causes**:
1. **Wrong season_id**: API is querying different season
2. **RLS Policy Issue**: Service role client not working correctly
3. **Query Error**: Check `[DraftSystem]` error logs

**Fix**:
- Verify `seasonId` matches database: `00000000-0000-0000-0000-000000000001`
- Check API route is using `createServiceRoleClient()` (bypasses RLS)
- Test query directly in Supabase SQL editor

### Issue 3: Pokemon Loaded But Not Rendering

**Symptoms**:
- Console shows: `"[DraftBoard] Setting Pokemon: 749"`
- Console shows: `"Pokemon state: { total: 749, filtered: 0 }"`
- UI shows empty board

**Cause**: Filters are removing all Pokemon

**Fix**:
- Check `selectedTier`, `selectedGeneration`, `searchQuery` values
- Clear all filters: Set to `"all"` and empty string
- Check if `generation` is `null` for all Pokemon (would filter out if generation filter is set)

### Issue 4: API Route Returns Error

**Symptoms**:
- Console shows: `"[DraftBoard] API returned error: ..."`
- Network tab shows HTTP error status

**Fix**:
- Check server logs for full error message
- Verify `DraftSystem.getAvailablePokemon()` is working
- Test query directly: `SELECT * FROM draft_pool WHERE season_id = '...' AND status = 'available'`

---

## 📊 Data Flow Diagram

```
User visits /dashboard/draft/board
  ↓
DraftBoardSection component mounts
  ↓
Fetches current season from Supabase
  ↓
Sets seasonId state: "00000000-0000-0000-0000-000000000001"
  ↓
Renders DraftBoard with seasonId prop
  ↓
DraftBoard useEffect triggers
  ↓
Fetches: GET /api/draft/available?season_id=00000000-0000-0000-0000-000000000001
  ↓
API Route: app/api/draft/available/route.ts
  ↓
Calls: DraftSystem.getAvailablePokemon(seasonId)
  ↓
Queries: SELECT * FROM draft_pool WHERE season_id = ... AND status = 'available'
  ↓
Returns: Array of 749 Pokemon
  ↓
API returns: { success: true, pokemon: [...], total: 749 }
  ↓
DraftBoard receives response
  ↓
Sets pokemon state: [749 Pokemon]
  ↓
Filters Pokemon (by search, tier, generation)
  ↓
Renders PointTierSection for each tier (20 → 1)
  ↓
Each tier renders DraftPokemonCard for each Pokemon
```

---

## 🧪 Test Checklist

- [ ] Database has Pokemon (✅ Verified: 749 Pokemon)
- [ ] Current season exists (✅ Verified: Season 5)
- [ ] `seasonId` is set in `DraftBoardSection` (Check console logs)
- [ ] API route receives correct `seasonId` (Check Network tab)
- [ ] API route returns Pokemon (Check API response)
- [ ] `DraftBoard` receives Pokemon array (Check console logs)
- [ ] Filters are not removing all Pokemon (Check `filteredPokemon.length`)
- [ ] `PointTierSection` components render (Check DOM)
- [ ] `DraftPokemonCard` components render (Check DOM)

---

## 🔍 Next Steps

1. **Open browser console** and check for `[DraftBoard]` logs
2. **Test API route** directly in browser console
3. **Check Network tab** for `/api/draft/available` request
4. **Verify `seasonId`** is being passed correctly
5. **Check filters** aren't accidentally removing all Pokemon

---

**Last Updated**: January 19, 2026  
**Status**: 🔍 Debugging Active
