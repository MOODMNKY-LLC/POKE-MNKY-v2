# Draft Board Data Flow - Step-by-Step Debugging

**Date**: January 19, 2026  
**Issue**: Pokemon not rendering in Draft Board

---

## 📊 Expected Data Flow

```
1. User visits /dashboard/draft/board
   ↓
2. DraftTabsSection renders (client component)
   ↓
3. DraftBoardSection mounts (client component)
   ↓
4. DraftBoardSection useEffect runs:
   a. Creates Supabase client
   b. Fetches current season: SELECT id FROM seasons WHERE is_current = true
   c. Sets seasonId state: "00000000-0000-0000-0000-000000000001"
   d. Fetches /api/draft/status
   e. If no session: Renders DraftBoard in view-only mode with seasonId
   f. If session exists: Renders DraftBoard with session.season_id
   ↓
5. DraftBoard component receives seasonId prop
   ↓
6. DraftBoard useEffect triggers (when seasonId changes):
   a. Checks if seasonId exists
   b. Fetches: GET /api/draft/available?limit=500&season_id=00000000-0000-0000-0000-000000000001
   ↓
7. API Route (/api/draft/available):
   a. Extracts season_id from query params
   b. Creates DraftSystem instance
   c. Calls draftSystem.getAvailablePokemon(seasonId)
   ↓
8. DraftSystem.getAvailablePokemon():
   a. Queries: SELECT pokemon_name, point_value, pokemon_id, status 
              FROM draft_pool 
              WHERE season_id = '...' AND status = 'available'
   b. Fetches generation from pokemon_cache
   c. Returns array of Pokemon objects
   ↓
9. API returns: { success: true, pokemon: [...], total: 749 }
   ↓
10. DraftBoard receives response:
    a. Sets pokemon state: [749 Pokemon]
    b. Filters Pokemon (by search, tier, generation)
    c. Organizes by point tier
    d. Renders PointTierSection for each tier
    ↓
11. PointTierSection renders DraftPokemonCard for each Pokemon
```

---

## 🔍 Debugging Checklist

### Step 1: Check Browser Console Logs

Open DevTools Console (F12) and look for these logs in order:

#### ✅ Expected Logs:

1. **`[DraftBoardSection]`** logs:
   ```
   [DraftBoardSection] No active session, but seasonId is: 00000000-0000-0000-0000-000000000001
   ```
   OR
   ```
   [DraftBoardSection] Active session found: { id: "...", season_id: "..." }
   ```

2. **`[DraftBoard]`** logs:
   ```
   [DraftBoard] Fetching Pokemon for season: 00000000-0000-0000-0000-000000000001
   [DraftBoard] API response: { success: true, count: 749 }
   [DraftBoard] Setting Pokemon: 749 Sample: [{ pokemon_name: "Flutter Mane", ... }, ...]
   [DraftBoard] Pokemon state: { total: 749, filtered: 749, searchQuery: "", selectedTier: "all", selectedGeneration: "all", sample: [...] }
   ```

#### ❌ If Missing/Incorrect:

- **No `[DraftBoardSection]` logs**: Component not mounting
- **`[DraftBoard] No seasonId provided`**: seasonId not being passed
- **`[DraftBoard] API response: { success: true, count: 0 }`**: API returning empty array
- **`[DraftBoard] Pokemon state: { total: 749, filtered: 0 }`**: Filters removing all Pokemon

---

### Step 2: Check Network Tab

Open DevTools Network tab (F12 → Network):

1. **Look for**: `/api/draft/available?limit=500&season_id=...`
2. **Check**:
   - ✅ Status: `200 OK`
   - ✅ Request URL: Contains correct `season_id`
   - ✅ Response: `{ success: true, pokemon: [...], total: 749 }`

#### ❌ If Error:

- **404**: Route not found
- **500**: Server error (check server logs)
- **No request**: Component not making API call

---

### Step 3: Test API Route Directly

**In Browser Console**:
```javascript
// Test the API route directly
fetch('/api/draft/available?limit=500&season_id=00000000-0000-0000-0000-000000000001')
  .then(r => r.json())
  .then(data => {
    console.log('✅ API Response:', data)
    console.log('✅ Pokemon Count:', data.pokemon?.length || 0)
    console.log('✅ Sample Pokemon:', data.pokemon?.slice(0, 5))
  })
  .catch(err => {
    console.error('❌ API Error:', err)
  })
```

**Expected Result**:
```json
{
  "success": true,
  "pokemon": [
    {
      "pokemon_name": "Flutter Mane",
      "point_value": 20,
      "pokemon_id": null,
      "status": "available",
      "generation": null
    },
    ...
  ],
  "total": 749
}
```

---

### Step 4: Check Component Props

**Add temporary logging to DraftBoard component**:

```typescript
// In components/draft/draft-board.tsx, add at the top of the component:
console.log('[DraftBoard] Props received:', {
  sessionId,
  currentTeamId,
  seasonId,
  isYourTurn
})
```

**Expected**:
```javascript
{
  sessionId: "" or "uuid-here",
  currentTeamId: null or "uuid-here",
  seasonId: "00000000-0000-0000-0000-000000000001",
  isYourTurn: false
}
```

---

### Step 5: Check Server Logs

**Look for these logs in your terminal/server console**:

```
[API /draft/available] Found 749 Pokemon for season 00000000-0000-0000-0000-000000000001
[DraftSystem] Found 749 Pokemon from draft_pool for season 00000000-0000-0000-0000-000000000001
```

**If you see**:
```
[API /draft/available] No Pokemon found for season ...
[DraftSystem] No Pokemon found for season ...
```
→ Check database query is working

---

### Step 6: Check Database Directly

**Using Supabase MCP**:
```sql
-- Verify season exists
SELECT id, name, is_current FROM seasons WHERE is_current = true;

-- Verify Pokemon exist for that season
SELECT COUNT(*) FROM draft_pool 
WHERE season_id = '00000000-0000-0000-0000-000000000001' 
  AND status = 'available';

-- Sample Pokemon
SELECT pokemon_name, point_value, status 
FROM draft_pool 
WHERE season_id = '00000000-0000-0000-0000-000000000001' 
  AND status = 'available'
LIMIT 5;
```

---

## 🐛 Common Issues & Solutions

### Issue 1: `seasonId` is `null`

**Symptoms**:
- Console: `[DraftBoard] No seasonId provided, skipping fetch`
- UI: "Season ID: Not provided"

**Check**:
1. Is `DraftBoardSection` fetching season correctly?
2. Is `seasonId` state being set?
3. Is `seasonId` being passed to `DraftBoard`?

**Fix**:
- Check `DraftBoardSection` useEffect is running
- Verify Supabase client is initialized
- Check RLS policies allow reading `seasons` table

---

### Issue 2: API Returns Empty Array

**Symptoms**:
- Console: `[DraftBoard] API response: { success: true, count: 0 }`
- Server logs: `[DraftSystem] No Pokemon found for season ...`

**Check**:
1. Is `seasonId` correct in API request?
2. Does database have Pokemon for that season?
3. Is `DraftSystem` query working?

**Fix**:
- Verify `seasonId` matches database UUID exactly
- Check `draft_pool` table has rows for that `season_id`
- Test query directly in Supabase SQL editor

---

### Issue 3: Pokemon Loaded But Not Rendering

**Symptoms**:
- Console: `[DraftBoard] Setting Pokemon: 749`
- Console: `[DraftBoard] Pokemon state: { total: 749, filtered: 0 }`
- UI: Empty board

**Cause**: Filters are removing all Pokemon

**Check**:
1. What are filter values?
2. Do Pokemon have `generation: null`? (would filter out if generation filter is set)
3. Is `selectedTier` accidentally set to a specific tier?

**Fix**:
- Clear all filters: Set `selectedTier="all"`, `selectedGeneration="all"`, `searchQuery=""`
- Check if Pokemon have `generation: null` (would need to fix generation lookup)

---

### Issue 4: Component Not Rendering

**Symptoms**:
- No console logs at all
- Component shows loading skeleton forever

**Check**:
1. Is `DraftBoardSection` being rendered?
2. Is `mounted` state stuck at `false`?
3. Are there JavaScript errors?

**Fix**:
- Check browser console for errors
- Verify component is imported correctly
- Check if `useEffect` dependencies are correct

---

## 🔧 Quick Fixes

### Fix 1: Force Re-render with seasonId

**Add to DraftBoard component**:
```typescript
// Force fetch if seasonId changes
useEffect(() => {
  console.log('[DraftBoard] seasonId changed:', seasonId)
  if (seasonId) {
    // Trigger fetch
  }
}, [seasonId])
```

### Fix 2: Add Error Boundary

**Wrap DraftBoardSection**:
```tsx
<ErrorBoundary fallback={<div>Error loading draft board</div>}>
  <DraftBoardSection />
</ErrorBoundary>
```

### Fix 3: Add Loading State

**Show loading indicator**:
```tsx
{loading && <div>Loading Pokemon...</div>}
{pokemon.length === 0 && !loading && <div>No Pokemon found</div>}
```

---

## 📝 Next Steps

1. **Open browser console** and check for logs
2. **Test API route** directly in console
3. **Check Network tab** for API request
4. **Verify seasonId** is being passed correctly
5. **Check server logs** for API route execution
6. **Test database query** directly

---

**Last Updated**: January 19, 2026  
**Status**: 🔍 Active Debugging
