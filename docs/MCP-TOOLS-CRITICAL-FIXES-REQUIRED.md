# MCP Tools - Critical Fixes Required

**Date**: January 17, 2026  
**Status**: 🚨 **CRITICAL - MUST FIX BEFORE END-TO-END TESTING**

---

## Executive Summary

After comprehensive analysis of the MCP server implementation against league requirements, **5 critical issues** have been identified that **MUST be fixed** before proceeding with end-to-end testing. These issues would cause incorrect data to be returned to coaches and AI agents.

---

## 🚨 Critical Issues

### Issue #1: Wrong Field Name in `get_available_pokemon`

**Location**: `tools/mcp-servers/draft-pool-server/src/index.ts` (Line ~50)

**Problem**:
```typescript
.eq('available', true)  // ❌ WRONG - field doesn't exist
```

**Database Schema**:
```sql
is_available BOOLEAN DEFAULT true  // ✅ CORRECT field name
```

**Impact**: 
- Tool will fail to query draft pool
- No Pokemon will be returned
- Coaches cannot see available Pokemon

**Fix Required**:
```typescript
.eq('is_available', true)  // ✅ CORRECT
```

---

### Issue #2: Wrong Field Name in `get_draft_status`

**Location**: `tools/mcp-servers/draft-pool-server/src/index.ts` (Line ~120)

**Problem**:
```typescript
current_pick: session.current_pick || 0,  // ❌ WRONG - field doesn't exist
```

**Database Schema**:
```sql
current_pick_number INTEGER DEFAULT 1  // ✅ CORRECT field name
```

**Impact**:
- Draft status will show incorrect pick number (always 0)
- Coaches won't know which pick we're on
- Draft tracking will be broken

**Fix Required**:
```typescript
current_pick: session.current_pick_number || 0,  // ✅ CORRECT
```

---

### Issue #3: Missing Join in `get_team_picks`

**Location**: `tools/mcp-servers/draft-pool-server/src/index.ts` (Line ~220)

**Problem**:
```typescript
.select('pokemon_name, draft_points, draft_round, draft_order')  // ❌ pokemon_name doesn't exist in team_rosters
```

**Database Schema**:
```sql
-- team_rosters table:
team_id UUID
pokemon_id UUID  -- References pokemon.id
draft_points INTEGER
draft_round INTEGER
draft_order INTEGER
-- NO pokemon_name field!

-- pokemon table:
id UUID
name TEXT  -- ✅ Pokemon name is here
```

**Impact**:
- Tool will return empty/null Pokemon names
- Coaches cannot see their picks
- Team roster queries will fail

**Fix Required**:
```typescript
.select('pokemon(name), draft_points, draft_round, draft_order')
// OR join explicitly:
.from('team_rosters')
.select('pokemon(name), draft_points, draft_round, draft_order')
```

---

### Issue #4: Does NOT Exclude Drafted Pokemon

**Location**: `tools/mcp-servers/draft-pool-server/src/index.ts` (Line ~50)

**Problem**:
```typescript
// Only filters by is_available flag
// But doesn't verify Pokemon isn't already in team_rosters
```

**League Requirement**:
- Drafted Pokemon should be removed from available pool
- Once drafted, Pokemon should not appear in `get_available_pokemon`

**Impact**:
- Coaches will see Pokemon that are already drafted
- Confusion during draft
- Potential duplicate picks

**Fix Required**:
```typescript
// Add LEFT JOIN to exclude drafted Pokemon
.leftJoin('team_rosters', 'team_rosters.pokemon_id', '=', 'draft_pool.pokemon_id')
.whereNull('team_rosters.id')  // Only show undrafted Pokemon
// OR use a subquery to exclude drafted Pokemon IDs
```

---

### Issue #5: Overly Simplistic Value Analysis

**Location**: `tools/mcp-servers/draft-pool-server/src/index.ts` (Line ~350)

**Problem**:
```typescript
// Simple value assessment (can be enhanced with AI)
let value_assessment = 'fair';
if (pokemon.point_value <= 14 && remaining >= pokemon.point_value) {
  value_assessment = 'good';
} else if (pokemon.point_value >= 18) {
  value_assessment = 'expensive';
}
```

**League Requirement**:
- Value analysis should consider:
  - Team composition (types, roles)
  - Remaining budget percentage
  - Draft pool availability
  - Team needs

**Impact**:
- Value assessment is not useful
- Coaches won't get meaningful recommendations
- AI agents can't make good decisions

**Fix Required**:
```typescript
// Enhanced value calculation:
// 1. Calculate budget percentage
const budget_percentage = (pokemon.point_value / remaining) * 100;

// 2. Get team composition
const teamTypes = picks.map(p => p.types).flat();
const typeCoverage = calculateTypeCoverage(pokemon.types, teamTypes);

// 3. Check draft pool availability
const alternatives = await getAlternativesInRange(pokemon.point_value);

// 4. Calculate value score
const value_score = calculateValueScore({
  cost: pokemon.point_value,
  budget_percentage,
  type_coverage: typeCoverage,
  alternatives_count: alternatives.length,
  remaining_budget: remaining
});
```

---

## ✅ Verified Correct Implementations

### `get_team_budget` ✅

**Status**: ✅ **CORRECT**

**Verification**:
- ✅ Uses correct table (`draft_budgets`)
- ✅ Uses correct field names (`total_points`, `spent_points`)
- ✅ Calculates `remaining_points` correctly
- ✅ Handles season filtering correctly
- ✅ Defaults to 120 points (matches league rules)

**No changes needed.**

---

## 📋 Complete Fix List

### File: `tools/mcp-servers/draft-pool-server/src/index.ts`

**Fix 1** (Line ~50):
```typescript
// BEFORE:
.eq('available', true)

// AFTER:
.eq('is_available', true)
```

**Fix 2** (Line ~120):
```typescript
// BEFORE:
current_pick: session.current_pick || 0,

// AFTER:
current_pick: session.current_pick_number || 0,
```

**Fix 3** (Line ~220):
```typescript
// BEFORE:
.select('pokemon_name, draft_points, draft_round, draft_order')

// AFTER:
.select('pokemon(name), draft_points, draft_round, draft_order')
// OR use explicit join:
.from('team_rosters')
.select(`
  pokemon!inner(name),
  draft_points,
  draft_round,
  draft_order
`)
```

**Fix 4** (Line ~50):
```typescript
// BEFORE:
let query = supabase
  .from('draft_pool')
  .select('pokemon_name, point_value, generation, available')
  .eq('available', true)
  .limit(limit);

// AFTER:
let query = supabase
  .from('draft_pool')
  .select('pokemon_name, point_value, generation, is_available')
  .eq('is_available', true)
  .limit(limit);

// Then add exclusion of drafted Pokemon:
// Option A: Use a subquery
const { data: draftedPokemonIds } = await supabase
  .from('team_rosters')
  .select('pokemon_id')
  .not('pokemon_id', 'is', null);

const draftedIds = draftedPokemonIds?.map(p => p.pokemon_id) || [];
if (draftedIds.length > 0) {
  query = query.not('pokemon_id', 'in', `(${draftedIds.join(',')})`);
}

// Option B: Use a LEFT JOIN (if Supabase supports)
// This would require a more complex query structure
```

**Fix 5** (Line ~350):
```typescript
// BEFORE: Simple value assessment

// AFTER: Enhanced value assessment
// (See detailed implementation above)
```

---

## 🔍 Database Schema Verification

### Verified Schema Matches

✅ **`draft_pool`**:
- `pokemon_name` ✅
- `point_value` ✅ (12-20 range)
- `is_available` ✅ (not `available`)
- `generation` ✅

✅ **`draft_sessions`**:
- `current_pick_number` ✅ (not `current_pick`)
- `current_round` ✅
- `current_team_id` ✅
- `status` ✅

✅ **`draft_budgets`**:
- `total_points` ✅ (defaults to 120)
- `spent_points` ✅
- `remaining_points` ✅ (computed)

✅ **`team_rosters`**:
- `team_id` ✅
- `pokemon_id` ✅ (references `pokemon.id`)
- `draft_points` ✅
- `draft_round` ✅
- `draft_order` ✅
- **NO `pokemon_name` field** ⚠️ (must join with `pokemon` table)

✅ **`pokemon`**:
- `id` ✅
- `name` ✅ (Pokemon name)

---

## 🎯 League Requirements Checklist

### Draft Pool Management

- [x] **Requirement**: Filter by point range (12-20)
  - ✅ **Status**: Implemented correctly (after Fix 1)
  - ⚠️ **Issue**: Field name wrong (Fix 1)

- [x] **Requirement**: Filter by generation
  - ✅ **Status**: Implemented correctly

- [x] **Requirement**: Filter by type
  - ⚠️ **Status**: Placeholder implementation (needs join with `pokemon` table)

- [ ] **Requirement**: Exclude already-drafted Pokemon
  - ❌ **Status**: **NOT IMPLEMENTED** (Fix 4 required)

### Draft Status Tracking

- [x] **Requirement**: Return current pick number
  - ⚠️ **Status**: Wrong field name (Fix 2 required)

- [x] **Requirement**: Return current round
  - ✅ **Status**: Implemented correctly

- [x] **Requirement**: Return whose turn it is
  - ✅ **Status**: Implemented correctly (`current_team_id`)

- [ ] **Requirement**: Return draft order
  - ⚠️ **Status**: Not explicitly returned (should add to response)

### Team Budget Management

- [x] **Requirement**: Return total budget (120 points)
  - ✅ **Status**: Implemented correctly

- [x] **Requirement**: Return spent points
  - ✅ **Status**: Implemented correctly

- [x] **Requirement**: Return remaining points
  - ✅ **Status**: Calculated correctly

- [x] **Requirement**: Season filtering
  - ✅ **Status**: Implemented correctly

### Team Picks Listing

- [x] **Requirement**: Return team's picks
  - ⚠️ **Status**: Missing Pokemon name (Fix 3 required)

- [x] **Requirement**: Return draft points
  - ✅ **Status**: Implemented correctly

- [x] **Requirement**: Return pick order
  - ✅ **Status**: Implemented correctly (`draft_order`)

- [x] **Requirement**: Season filtering
  - ✅ **Status**: Implemented correctly

### Pick Value Analysis

- [x] **Requirement**: Check if affordable
  - ✅ **Status**: Implemented correctly

- [ ] **Requirement**: Consider team composition
  - ❌ **Status**: **NOT IMPLEMENTED** (Fix 5 required)

- [ ] **Requirement**: Consider draft pool availability
  - ❌ **Status**: **NOT IMPLEMENTED** (Fix 5 required)

- [ ] **Requirement**: Provide meaningful value assessment
  - ⚠️ **Status**: Too simplistic (Fix 5 required)

---

## 📝 Implementation Plan

### Step 1: Fix Critical Field Names (Fixes 1 & 2)

**Priority**: 🔴 **CRITICAL**  
**Time**: 5 minutes  
**Risk**: Low

1. Fix `available` → `is_available`
2. Fix `current_pick` → `current_pick_number`
3. Test queries work

### Step 2: Fix Team Picks Join (Fix 3)

**Priority**: 🔴 **CRITICAL**  
**Time**: 15 minutes  
**Risk**: Medium

1. Add join with `pokemon` table
2. Update select to use `pokemon(name)`
3. Test returns Pokemon names correctly

### Step 3: Exclude Drafted Pokemon (Fix 4)

**Priority**: 🔴 **CRITICAL**  
**Time**: 30 minutes  
**Risk**: Medium

1. Add subquery to get drafted Pokemon IDs
2. Exclude from draft pool query
3. Test only shows available Pokemon

### Step 4: Enhance Value Analysis (Fix 5)

**Priority**: 🟡 **HIGH**  
**Time**: 1-2 hours  
**Risk**: Low

1. Add team composition analysis
2. Add draft pool availability check
3. Enhance value calculation logic
4. Test provides meaningful recommendations

---

## ✅ Verification After Fixes

### Test Cases

1. **`get_available_pokemon`**:
   - [ ] Returns only Pokemon with `is_available = true`
   - [ ] Excludes Pokemon already in `team_rosters`
   - [ ] Filters by point range correctly
   - [ ] Filters by generation correctly

2. **`get_draft_status`**:
   - [ ] Returns correct `current_pick_number`
   - [ ] Returns correct `current_round`
   - [ ] Returns correct `current_team_id`

3. **`get_team_picks`**:
   - [ ] Returns Pokemon names (not null)
   - [ ] Returns picks in correct order
   - [ ] Returns correct draft points

4. **`analyze_pick_value`**:
   - [ ] Provides meaningful value assessment
   - [ ] Considers team composition
   - [ ] Considers draft pool availability

---

## 🚀 Next Steps

1. **Fix Issues 1-3** (Critical field names and joins)
2. **Test fixes** with sample data
3. **Fix Issue 4** (Exclude drafted Pokemon)
4. **Test Issue 4** with draft scenario
5. **Fix Issue 5** (Enhance value analysis)
6. **Comprehensive testing** with league manager
7. **End-to-end testing** with OpenAI Responses API

---

**Status**: 🚨 **CRITICAL FIXES REQUIRED**  
**Blocking**: End-to-end testing  
**Estimated Fix Time**: 2-3 hours  
**Risk Level**: Medium (database queries, need testing)
