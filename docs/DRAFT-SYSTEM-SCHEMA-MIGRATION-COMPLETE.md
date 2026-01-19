# Draft System Schema Migration - Complete

**Date**: January 19, 2026  
**Status**: ✅ **COMPLETE** - Application code updated to match server-side changes

---

## Summary

All Next.js application code has been updated to use the new schema (`status` enum, `season_id` filtering, denormalized fields) consistent with the server-side changes made to Discord Bot, Open WebUI Pipeline, and MCP Server.

---

## Files Updated

### 1. `lib/draft-system.ts` ✅

**Changes**:
- ✅ `getAvailablePokemon()` - Now requires `seasonId` parameter, uses `status = 'available'` instead of `is_available`
- ✅ `makePick()` - Uses `status = 'available'` and `season_id` filtering, updates denormalized fields (`drafted_by_team_id`, `draft_round`, `draft_pick_number`, `drafted_at`)
- ✅ `getTeamStatus()` - Now uses denormalized fields from `draft_pool` instead of JOINing `team_rosters` with `pokemon_cache` (performance improvement)

**Key Updates**:
```typescript
// OLD:
.eq("is_available", true)

// NEW:
.eq("status", "available")
.eq("season_id", seasonId)

// Update draft_pool:
.update({
  status: "drafted",
  drafted_by_team_id: teamId,
  drafted_at: new Date().toISOString(),
  draft_round: session.current_round,
  draft_pick_number: session.current_pick_number,
})
```

### 2. `app/api/draft/available/route.ts` ✅

**Changes**:
- ✅ Added `season_id` parameter handling (from query param or current season)
- ✅ Passes `seasonId` to `getAvailablePokemon()`
- ✅ Returns `status` field in response

**Key Updates**:
```typescript
// Get season_id (from param or current season)
let seasonId = seasonIdParam
if (!seasonId) {
  const { data: season } = await supabase
    .from("seasons")
    .select("id")
    .eq("is_current", true)
    .single()
  seasonId = season.id
}

const pokemon = await draftSystem.getAvailablePokemon(seasonId, {...})
```

### 3. `app/api/draft/pick/route.ts` ✅

**Status**: Already correct - uses `season_id` from request body and passes to `makePick()`

### 4. `app/api/draft/team-status/route.ts` ✅

**Status**: Already correct - uses `season_id` parameter and passes to `getTeamStatus()`

**Note**: Now benefits from denormalized fields performance improvement in `getTeamStatus()`

### 5. `components/draft/draft-board.tsx` ✅

**Changes**:
- ✅ Added `season_id` to API call: `/api/draft/available?limit=500&season_id=${seasonId}`
- ✅ Updated `fetchDraftedPokemon()` to query `draft_pool` directly using `status = 'drafted'` instead of JOINing `team_rosters`
- ✅ Changed real-time subscription from `broadcast` to `postgres_changes` for better reliability
- ✅ Passes `status` field to child components

**Key Updates**:
```typescript
// OLD: Query team_rosters with JOIN
const { data } = await supabase
  .from("team_rosters")
  .select(`pokemon:pokemon_id (name)`)
  .in("team_id", teamIds)

// NEW: Query draft_pool directly
const { data } = await supabase
  .from("draft_pool")
  .select("pokemon_name")
  .eq("season_id", seasonId)
  .eq("status", "drafted")

// Real-time subscription
const channel = supabase
  .channel(`draft-pool:${seasonId}`)
  .on("postgres_changes", {
    event: "UPDATE",
    schema: "public",
    table: "draft_pool",
    filter: `season_id=eq.${seasonId}`,
  }, ...)
```

### 6. `components/draft/point-tier-section.tsx` ✅

**Changes**:
- ✅ Added `status` field to `Pokemon` interface
- ✅ Passes `status` to `DraftPokemonCard` component
- ✅ Uses `status` field to determine if Pokemon is drafted

### 7. `components/draft/draft-pokemon-card.tsx` ✅

**Changes**:
- ✅ Added `status` field to props interface
- ✅ Displays status badge (Drafted/Banned/Unavailable)
- ✅ Uses `status` field to determine card state
- ✅ Shows appropriate UI for banned Pokemon

**Key Updates**:
```typescript
const status = pokemon.status || (isDrafted ? "drafted" : "available")
const isActuallyDrafted = status === "drafted" || isDrafted
const isBanned = status === "banned"
const isAvailable = status === "available" && !isActuallyDrafted

// Display status badge
{status !== "available" && (
  <Badge variant={status === "drafted" ? "default" : "destructive"}>
    {status === "drafted" ? "Drafted" : status === "banned" ? "Banned" : "Unavailable"}
  </Badge>
)}
```

### 8. `lib/free-agency.ts` ✅

**Changes**:
- ✅ Updated `getAvailablePokemon()` to use `status` enum and `season_id` filtering
- ✅ Includes both `available` and `drafted` status (drafted Pokemon might be free agency eligible if not on rosters)

**Key Updates**:
```typescript
// OLD:
.eq("is_available", true)

// NEW:
.eq("season_id", seasonId)
.in("status", ["available", "drafted"])
```

---

## Verification

### ✅ Schema Consistency

- [x] All queries use `status` enum instead of `is_available`
- [x] All queries filter by `season_id`
- [x] Denormalized fields populated on draft picks
- [x] API routes return `status` field
- [x] Frontend components use `status` field

### ✅ Remaining `is_available` References

**Intentional (Parser Scripts)**:
- `lib/google-sheets-parsers/draft-pool-parser.ts` - Parser script for initial data population (can remain for backward compatibility during migration period)

**All Application Code**: ✅ Updated

---

## Performance Improvements

### 1. Denormalized Fields Usage

**Before**: `getTeamStatus()` JOINed `team_rosters` with `pokemon_cache` to get Pokemon names
```typescript
// Multiple queries + JOIN
const { data: picks } = await supabase.from("team_rosters")...
const { data: pokemonData } = await supabase.from("pokemon_cache")...
```

**After**: Uses denormalized fields directly from `draft_pool`
```typescript
// Single query, no JOINs needed
const { data: picks } = await supabase
  .from("draft_pool")
  .select("pokemon_name, point_value, draft_round, draft_pick_number")
  .eq("drafted_by_team_id", teamId)
  .eq("season_id", seasonId)
  .eq("status", "drafted")
```

**Benefit**: Faster queries, reduced database load

### 2. Real-time Subscriptions

**Before**: Used `broadcast` channels (less reliable)
```typescript
.on("broadcast", { event: "INSERT" }, ...)
```

**After**: Uses `postgres_changes` (more reliable, database-level)
```typescript
.on("postgres_changes", {
  event: "UPDATE",
  schema: "public",
  table: "draft_pool",
  filter: `season_id=eq.${seasonId}`,
}, ...)
```

**Benefit**: More reliable real-time updates, automatic filtering

---

## Testing Checklist

### Backend (DraftSystem)
- [ ] `getAvailablePokemon()` filters by `season_id` correctly
- [ ] `getAvailablePokemon()` uses `status = 'available'`
- [ ] `makePick()` updates `status` to 'drafted'
- [ ] `makePick()` populates denormalized fields
- [ ] `getTeamStatus()` uses denormalized fields (faster)

### API Routes
- [ ] `/api/draft/available` returns `status` field
- [ ] `/api/draft/available` filters by `season_id`
- [ ] `/api/draft/pick` updates denormalized fields
- [ ] `/api/draft/team-status` uses denormalized fields

### Frontend Components
- [ ] Draft board displays Pokemon with correct status
- [ ] Drafted Pokemon show as unavailable
- [ ] Banned Pokemon display correctly
- [ ] Real-time updates work when picks are made
- [ ] Status badges display correctly

---

## Next Steps

1. **Test the updated code** thoroughly
2. **Monitor for any issues** with real-time updates
3. **Verify performance improvements** (denormalized fields)
4. **After verification period** (1-2 weeks), create migration to drop `is_available` column

---

## Rollback Plan

If issues arise:
1. **Database**: Both `is_available` and `status` columns exist (backward compatible)
2. **Code**: Can revert to old queries if needed (though not recommended)
3. **No data loss**: All data preserved in both old and new fields

---

## Related Documentation

- **Server-side Changes**: See Discord Bot, Open WebUI Pipeline, MCP Server updates
- **Implementation Plan**: `docs/DRAFT-SYSTEM-UPDATE-IMPLEMENTATION-PLAN.md`
- **Quick Reference**: `docs/DRAFT-SYSTEM-CODE-CHANGES-QUICK-REFERENCE.md`
- **DRAFTBOARD Spec**: `DRAFTBOARD-COMPREHENSIVE-BREAKDOWN.md`

---

**Status**: ✅ **COMPLETE**  
**Consistency**: ✅ **VERIFIED** - Matches server-side changes  
**Next Review**: After testing period
