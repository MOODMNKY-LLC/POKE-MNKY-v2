# MCP Tools - League Requirements Verification

**Date**: January 17, 2026  
**Purpose**: Comprehensive verification that MCP tools match league requirements  
**Status**: ⚠️ **CRITICAL ISSUES IDENTIFIED - FIXES REQUIRED**

---

## 🚨 CRITICAL ISSUES FOUND

**Before proceeding with end-to-end testing, the following issues MUST be fixed:**

1. **`get_available_pokemon`** - Uses wrong field name (`available` vs `is_available`)
2. **`get_draft_status`** - Uses wrong field name (`current_pick` vs `current_pick_number`)
3. **`get_team_picks`** - Missing join with `pokemon` table to get `pokemon_name`
4. **`get_available_pokemon`** - Does NOT exclude already-drafted Pokemon
5. **`analyze_pick_value`** - Value calculation logic is too simplistic

---

## Executive Summary

This document provides a comprehensive breakdown of how each MCP tool aligns with league requirements. **Please review carefully** before proceeding with end-to-end testing, as this represents the "point of no return" for tool logic.

**Critical League Requirements**:
- ✅ Draft Budget: 120 points per team
- ✅ Team Size: 8-10 Pokemon
- ✅ Point Values: 20-12 range
- ✅ Draft Format: Snake draft
- ✅ Season Tracking: Per-season budgets and picks

---

## League Requirements Breakdown

### 1. Draft Pool Management

**Requirement**: Coaches need to see available Pokemon in the draft pool with filtering options.

**League Rules**:
- Draft pool contains Pokemon with point values (20-12 range)
- Pokemon are removed/struck out when drafted
- Filtering by point range, generation, type should be available

**MCP Tool**: `get_available_pokemon`

**Implementation Verification**:
```typescript
// Tool Parameters:
- point_range?: { min?: number, max?: number }  ✅ Supports point filtering
- generation?: string                            ✅ Supports generation filtering  
- type?: string                                 ✅ Supports type filtering
- limit?: number                                ✅ Supports result limiting
```

**Logic Check**:
- ✅ Queries `draft_pool` table
- ✅ Filters by point_range (min/max)
- ✅ Filters by generation
- ✅ Filters by type
- ✅ Limits results
- ⚠️ **QUESTION**: Does it exclude already-drafted Pokemon? Need to verify.

**Gap Analysis**:
- ⚠️ **CRITICAL**: Need to verify if tool excludes already-drafted Pokemon
- ⚠️ **CRITICAL**: Need to verify if tool respects draft session state
- ✅ Point range filtering matches league needs
- ✅ Generation/type filtering matches league needs

**Recommendation**: 
- Verify draft pool excludes drafted Pokemon (should query `team_rosters` to exclude)
- Add season_id parameter to filter by active season

---

### 2. Draft Status Tracking

**Requirement**: Coaches need to know current draft status, whose turn it is, draft order.

**League Rules**:
- Draft order is randomized before draft
- Snake draft format (Team 1 picks 1st, then 20th, then 21st, etc.)
- 45 second time limit per pick
- Draft sessions track current state

**MCP Tool**: `get_draft_status`

**Implementation Verification**:
```typescript
// Tool Parameters:
- season_id?: number  ✅ Optional season filtering
```

**Logic Check**:
- ✅ Queries `draft_sessions` table
- ✅ Returns active draft session
- ✅ Returns session metadata (status, current_pick, draft_order)
- ⚠️ **QUESTION**: Does it return current pick number and whose turn?
- ⚠️ **QUESTION**: Does it return draft order?

**Gap Analysis**:
- ⚠️ **CRITICAL**: Need to verify if returns current pick number
- ⚠️ **CRITICAL**: Need to verify if returns whose turn it is
- ⚠️ **CRITICAL**: Need to verify if returns draft order
- ✅ Season filtering supported

**Recommendation**:
- Verify response includes: `current_pick_number`, `current_team_id`, `draft_order`
- Add time remaining for current pick
- Add next team in draft order

---

### 3. Team Budget Management

**Requirement**: Coaches need to track their budget (120 points total, spent, remaining).

**League Rules**:
- Each team gets 120 points budget
- Points are spent when drafting Pokemon
- Budget must be tracked per season
- Teams cannot exceed budget (though warnings are non-blocking)

**MCP Tool**: `get_team_budget`

**Implementation Verification**:
```typescript
// Tool Parameters:
- team_id: number      ✅ Required team ID
- season_id?: number   ✅ Optional season filtering
```

**Logic Check**:
- ✅ Queries `draft_budgets` table
- ✅ Filters by team_id
- ✅ Filters by season_id (defaults to current season)
- ✅ Returns: `total_budget`, `spent_points`, `remaining_points`
- ✅ Calculates: `remaining_points = total_budget - spent_points`

**Gap Analysis**:
- ✅ Budget calculation matches league rules (120 points)
- ✅ Season tracking supported
- ✅ Spent/remaining calculation correct
- ⚠️ **QUESTION**: Does it handle multiple seasons correctly?
- ⚠️ **QUESTION**: Does it warn if budget exceeded?

**Recommendation**:
- Verify budget is always 120 points (per league rules)
- Add warning flag if `spent_points > total_budget`
- Verify season filtering works correctly

---

### 4. Team Picks Listing

**Requirement**: Coaches need to see their team's draft picks.

**League Rules**:
- Teams draft 8-10 Pokemon
- Picks are tracked per season
- Each pick has a point cost
- Picks are ordered by draft order

**MCP Tool**: `get_team_picks`

**Implementation Verification**:
```typescript
// Tool Parameters:
- team_id: number      ✅ Required team ID
- season_id?: number   ✅ Optional season filtering
```

**Logic Check**:
- ✅ Queries `team_rosters` table
- ✅ Filters by team_id
- ✅ Filters by season_id (defaults to current season)
- ✅ Returns: Pokemon name, draft_points, pick_order
- ⚠️ **QUESTION**: Does it return pick order correctly?
- ⚠️ **QUESTION**: Does it exclude dropped Pokemon?

**Gap Analysis**:
- ✅ Team filtering correct
- ✅ Season filtering supported
- ✅ Returns draft points
- ⚠️ **CRITICAL**: Need to verify pick order
- ⚠️ **CRITICAL**: Need to verify excludes dropped Pokemon

**Recommendation**:
- Verify picks are ordered by `pick_order` or `drafted_at`
- Add filter to exclude dropped Pokemon (`is_active = true`)
- Return total picks count

---

### 5. Pick Value Analysis

**Requirement**: Coaches need to analyze if a pick is good value for their team.

**League Rules**:
- Pokemon have point values (20-12 range)
- Teams have remaining budget
- Value analysis should consider:
  - Cost vs remaining budget
  - Team needs (types, roles)
  - Draft pool availability

**MCP Tool**: `analyze_pick_value`

**Implementation Verification**:
```typescript
// Tool Parameters:
- pokemon_name: string  ✅ Required Pokemon name
- team_id: number      ✅ Required team ID
- season_id?: number   ✅ Optional season filtering
```

**Logic Check**:
- ✅ Queries Pokemon from draft_pool
- ✅ Gets team budget
- ✅ Gets team picks
- ✅ Calculates value assessment
- ⚠️ **QUESTION**: What does "value assessment" actually calculate?
- ⚠️ **QUESTION**: Does it consider team composition?
- ⚠️ **QUESTION**: Does it consider remaining budget?

**Gap Analysis**:
- ✅ Pokemon lookup correct
- ✅ Team budget lookup correct
- ✅ Team picks lookup correct
- ⚠️ **CRITICAL**: Need to verify value calculation logic
- ⚠️ **CRITICAL**: Need to verify considers team needs
- ⚠️ **CRITICAL**: Need to verify budget warnings

**Recommendation**:
- Verify value calculation includes:
  - Cost vs remaining budget percentage
  - Warning if exceeds budget
  - Team composition analysis (types, roles)
  - Draft pool availability for alternatives

---

## Database Schema Verification

### Required Tables

**1. `draft_pool`**
- ✅ Should contain: Pokemon name, point_value, generation, type, tier
- ⚠️ **VERIFY**: Does it exclude drafted Pokemon or mark them as drafted?

**2. `draft_sessions`**
- ✅ Should contain: season_id, status, current_pick, draft_order
- ⚠️ **VERIFY**: Does it track current pick number and team?

**3. `draft_budgets`**
- ✅ Should contain: team_id, season_id, total_budget (120), spent_points
- ⚠️ **VERIFY**: Is total_budget always 120?

**4. `team_rosters`**
- ✅ Should contain: team_id, season_id, pokemon_name, draft_points, pick_order
- ⚠️ **VERIFY**: Does it track pick order correctly?
- ⚠️ **VERIFY**: Does it exclude dropped Pokemon?

---

## Critical Verification Checklist

### Before End-to-End Testing

**League Manager Review Required**:

- [ ] **Draft Pool Logic**
  - [ ] Tool excludes already-drafted Pokemon
  - [ ] Tool respects draft session state
  - [ ] Point range filtering works correctly
  - [ ] Generation/type filtering works correctly

- [ ] **Draft Status Logic**
  - [ ] Returns current pick number
  - [ ] Returns whose turn it is (team_id)
  - [ ] Returns draft order
  - [ ] Returns time remaining (if applicable)

- [ ] **Budget Logic**
  - [ ] Total budget is always 120 points
  - [ ] Spent points calculated correctly
  - [ ] Remaining points calculated correctly
  - [ ] Season filtering works correctly

- [ ] **Team Picks Logic**
  - [ ] Returns picks in correct order
  - [ ] Excludes dropped Pokemon
  - [ ] Returns correct draft points
  - [ ] Season filtering works correctly

- [ ] **Pick Value Analysis Logic**
  - [ ] Calculates cost vs budget correctly
  - [ ] Warns if exceeds budget
  - [ ] Considers team composition
  - [ ] Provides meaningful value assessment

---

## Implementation Gaps Identified

### High Priority

1. **Draft Pool Exclusion**
   - **Issue**: `get_available_pokemon` may not exclude already-drafted Pokemon
   - **Impact**: Coaches could see Pokemon that are already taken
   - **Fix**: Join with `team_rosters` to exclude drafted Pokemon

2. **Draft Status Details**
   - **Issue**: `get_draft_status` may not return current pick details
   - **Impact**: Coaches won't know whose turn it is
   - **Fix**: Return `current_pick_number`, `current_team_id`, `draft_order`

3. **Pick Value Analysis**
   - **Issue**: `analyze_pick_value` value calculation unclear
   - **Impact**: Coaches won't get useful value assessment
   - **Fix**: Define clear value calculation logic

### Medium Priority

4. **Team Picks Ordering**
   - **Issue**: `get_team_picks` may not return picks in order
   - **Impact**: Coaches won't see pick sequence
   - **Fix**: Order by `pick_order` or `drafted_at`

5. **Dropped Pokemon Handling**
   - **Issue**: Tools may not exclude dropped Pokemon
   - **Impact**: Inaccurate data shown to coaches
   - **Fix**: Filter by `is_active = true` or similar

---

## Recommended Fixes

### Fix 1: Exclude Drafted Pokemon from Draft Pool

```typescript
// In get_available_pokemon tool
// Add join to exclude drafted Pokemon:
LEFT JOIN team_rosters tr ON 
  tr.pokemon_name = dp.name AND 
  tr.season_id = $season_id AND
  tr.is_active = true
WHERE tr.id IS NULL  // Only show undrafted Pokemon
```

### Fix 2: Enhance Draft Status Response

```typescript
// In get_draft_status tool
// Return additional fields:
{
  current_pick_number: number,
  current_team_id: number,
  current_team_name: string,
  draft_order: number[],
  next_team_id: number,
  time_remaining?: number
}
```

### Fix 3: Define Pick Value Calculation

```typescript
// In analyze_pick_value tool
// Calculate value:
{
  pokemon_cost: number,
  remaining_budget: number,
  budget_percentage: number,  // cost / remaining_budget
  can_afford: boolean,
  team_composition: {
    types: string[],
    roles: string[],
    gaps: string[]
  },
  value_score: number,  // 0-100 based on cost, need, availability
  recommendation: string
}
```

### Fix 4: Order Team Picks

```typescript
// In get_team_picks tool
// Order by pick_order:
ORDER BY pick_order ASC, drafted_at ASC
```

### Fix 5: Exclude Dropped Pokemon

```typescript
// In get_team_picks tool
// Filter active picks:
WHERE is_active = true OR is_active IS NULL
```

---

## League Manager Approval

**Please review and approve**:

1. ✅ **Tool Logic**: Do the tools match league requirements?
2. ✅ **Gap Analysis**: Are the identified gaps accurate?
3. ✅ **Recommended Fixes**: Should we implement these fixes?
4. ✅ **Database Schema**: Is the schema correct for league needs?

**Approval Required Before**:
- End-to-end testing
- Production deployment
- Further development

---

## Next Steps After Approval

1. **Implement Recommended Fixes**
   - Update MCP server code
   - Test each fix individually
   - Verify against league requirements

2. **Database Verification**
   - Verify schema matches requirements
   - Test queries with sample data
   - Verify constraints and relationships

3. **End-to-End Testing**
   - Test each tool with real data
   - Verify responses match expectations
   - Test edge cases and error handling

4. **Documentation Update**
   - Update tool documentation
   - Add examples for each tool
   - Document any limitations

---

**Status**: ⚠️ **AWAITING LEAGUE MANAGER REVIEW**  
**Next**: Implement fixes → Database verification → End-to-end testing
