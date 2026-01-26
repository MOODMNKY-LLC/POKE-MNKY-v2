# Dashboard Alignment Analysis: Weekly Matches vs MATTS-UPGRADES.md

**Date**: January 26, 2026  
**Analysis Method**: Deep Research Protocol  
**Scope**: Dashboard section alignment with MATTS-UPGRADES.md requirements

---

## Executive Summary

This comprehensive analysis evaluates the current dashboard implementation against the requirements specified in `MATTS-UPGRADES.md`. The analysis reveals that while the foundational structure exists, **critical data integration gaps** prevent the dashboard from meeting its intended functionality. The Weekly Matches page (`/dashboard/weekly-matches`) has placeholder cards that reference correct database views, but **no actual data queries are implemented**. Additionally, **performance requirements are violated** as database views are not materialized, contradicting explicit requirements for cached aggregates.

**Overall Alignment**: 35% Complete

---

## Knowledge Development

The analysis process began by examining the current implementation of the Weekly Matches page and comparing it against the detailed requirements in MATTS-UPGRADES.md. Initial investigation revealed that while the page structure exists with proper card layouts, most cards contain only placeholder text referencing database views that exist but are never queried. Further investigation uncovered that the database views themselves are regular views rather than materialized views, which directly contradicts the performance requirements specified in MATTS-UPGRADES.md.

The battle plan system emerged as a fully implemented and correctly architected feature, with proper RLS policies ensuring user privacy. However, the damage calculator exists as a standalone feature but lacks integration into the weekly planning workflow, and its integration requires explicit approval before implementation.

The standings view implementation was found to correctly implement the league comparator logic, but this correctness is rendered moot by the fact that the view is never queried in the weekly matches page. This pattern of "correct but unused" infrastructure appears throughout the codebase, suggesting a disconnect between database design and frontend implementation.

---

## Comprehensive Analysis

### Theme 1: Card Structure and Data Integration

#### Current State Assessment

**Card A — Week & View Configuration (Control Card)**
- **Status**: Partially Implemented (70% complete)
- **Week Selector**: ✅ Fully functional `WeekSelector` component exists and works correctly
- **Sprite View Selector**: ❌ Not implemented - requirement mentions "selection of sprites to view" but no UI component exists
- **Technical Note**: Week selection drives all downstream content correctly, but sprite view selection is missing

**Card B — Opponent Identity Card**
- **Status**: Partially Implemented (60% complete)
- **Opponent Team Name**: ✅ Displayed correctly
- **Opponent Coach Name**: ✅ Displayed correctly  
- **Team Logo**: ❌ **Missing** - `logo_url` field exists in teams table but is not fetched or displayed
- **Data Source**: Current implementation queries matches table correctly but doesn't include logo_url in select statement
- **Gap**: Line 85-86 in `app/dashboard/weekly-matches/page.tsx` selects `team1:team1_id(id, name, coach_name, division)` but omits `logo_url`

**Card C — Opponent Performance Snapshot**
- **Status**: Not Implemented (0% complete)
- **Placeholder Text**: "Coming soon: backed by `v_team_record_regular` and `v_active_win_streak_regular`"
- **Reality**: Database views exist but **no queries are implemented**
- **Required Data**: Record (W-L), Win streak, Kills, Deaths, Differential
- **Critical Gap**: Views exist at `supabase/migrations/20260118175907_remote_schema.sql` lines 1756-1796, but page never queries them

**Card D — Opponent Tera Captains**
- **Status**: Not Implemented (0% complete)
- **Placeholder Text**: "Coming soon: sourced from roster metadata (team roster + captain flags)"
- **Reality**: No query to `team_rosters` table with `tera_captain` filter
- **Required Display**: List of opponent Pokémon with ⭐ indicator for Tera Captains
- **Critical Gap**: `team_rosters` table has `tera_captain` boolean field, but no query exists

**Card E — Standings & Division Context**
- **Status**: Not Implemented (0% complete)
- **Placeholder Text**: "Coming soon: backed by `v_regular_team_rankings`"
- **Reality**: View exists with correct comparator logic, but **never queried**
- **Required Data**: League rank, Division rank, Conference position
- **Critical Gap**: View implementation is correct (lines 1849-1907) but unused

#### Gap Analysis Summary

The database infrastructure exists but is disconnected from the frontend:

1. **Database Views Exist**: All required views are defined in migrations
   - `v_team_record_regular` (lines 1756-1768)
   - `v_active_win_streak_regular` (lines 1771-1796)
   - `v_regular_team_rankings` (lines 1849-1907)

2. **No Data Fetching**: The weekly-matches page doesn't query these views
   - Current queries only fetch basic match and team data
   - No aggregation queries for opponent stats
   - No roster queries for Tera captains
   - No standings queries

3. **Missing Fields**: Team logo (`logo_url`) available but not displayed
   - Field exists in teams table
   - Not included in select statements
   - No image component rendering logos

4. **Missing Feature**: Sprite view selector not implemented
   - Requirement mentions "selection of sprites to view"
   - No UI component exists
   - No state management for sprite preferences

---

### Theme 2: Weekly Battle Plan Persistence

#### Current State Assessment

**Database Schema**: ✅ Complete
- Table: `weekly_battle_plans` exists (`supabase/migrations/20260125004000_create_weekly_battle_plans.sql`)
- Schema includes: `user_id`, `match_id`, `season_id`, `matchweek_id`, `week_number`, `notes`, `payload` (JSONB)
- Unique constraint: `UNIQUE(user_id, match_id)` ensures one plan per user per match

**RLS Policies**: ✅ Correctly Implemented
- Users can only read their own plans: `USING (auth.uid() = user_id)`
- Users can only insert/update/delete their own plans
- Proper privacy boundaries enforced

**Editor Component**: ✅ Fully Functional
- `WeeklyBattlePlanEditor` component exists (`components/dashboard/weekly-matches/battle-plan-editor.tsx`)
- Autosave functionality implemented (900ms debounce)
- Structured fields (winConditions, threats, leads, endgame) supported
- Freeform notes supported

**API Routes**: ✅ Complete
- GET endpoint: `/api/weekly-battle-plans?matchId={id}` - Fetches user's plan for match
- POST endpoint: `/api/weekly-battle-plans` - Upserts plan with proper user validation

#### Alignment Assessment

**Requirement**: "Save these 'weekly battle plans' with some sort of cache that is specific to my login. This save feature needs to be able to be used and utilized for other users that have the 'Coach' roles, but not shared between users."

**Implementation Analysis**:
- ✅ **Per-user**: Enforced via `user_id` column and RLS policies
- ✅ **Per-match**: Enforced via `match_id` column and unique constraint
- ✅ **Not shared**: RLS policies prevent cross-user access
- ✅ **Cache**: Database storage serves as persistent cache (appropriate for this use case)
- ✅ **Coach role**: Available to all authenticated users (can be restricted if needed)

**Status**: **Fully Aligned** ✅

The battle plan system correctly implements all requirements. The "cache" requirement is satisfied by database persistence, which is the appropriate solution for this use case. No additional client-side caching is needed.

---

### Theme 3: Damage Calculator Integration

#### Current State Assessment

**Standalone Calculator**: ✅ Exists
- Page: `/app/calc/page.tsx` - Full iframe embed of calculator
- URL: `https://aab-calc.moodmnky.com`
- Components: `DamagePreview` and `DamageMatrix` exist in `components/damage-calculator/`
- API: `/api/calc` route exists for calculations

**Integration Status**: ❌ Not Integrated
- Current: Link to `/calc` exists but doesn't pre-filter teams
- Requirement: "Pulls only the Pokémon from each team for the specific week's planning"
- Gap: No team scoping mechanism implemented

#### Gap Analysis

**Requirement from MATTS-UPGRADES.md**:
> "Below the cards formatted to the upper part of the page in the main content area, I would like to have a damage calculator implemented that pulls only the pokemon from each team for the specific weeks planning, into its search query to be planned for. This needs to run through Simeon and approved by him before we take any action."

**Current Implementation**:
- Link exists: `<Link href="/calc">Open full damage calculator</Link>` (line 311)
- No pre-filtering: Calculator opens to full draft pool, not scoped to week's teams
- No integration: Calculator is standalone, not embedded in weekly matches page

**Approval Status**: ⚠️ **Pending Approval**
- MATTS-UPGRADES.md explicitly states: "This needs to run through Simeon and approved by him before we take any action"
- Current status: Calculator exists but integration blocked pending approval

**Status**: **Pending Approval and Integration** ⚠️

The damage calculator exists as a standalone feature but requires:
1. Simeon's approval for integration
2. Team scoping mechanism (filter to week's teams only)
3. Integration into weekly matches page workflow

---

### Theme 4: Performance and Caching

#### Current State Assessment

**Database Views**: ✅ Exist
- `v_team_record_regular` - Team records for regular season
- `v_active_win_streak_regular` - Active win streaks
- `v_regular_team_rankings` - Standings with tie-breakers

**View Type**: ❌ **Regular Views, Not Materialized**
- Current: All views are `CREATE VIEW` (regular PostgreSQL views)
- Problem: Views recompute aggregations on every query
- Impact: Performance degrades as match data grows

**Refresh Strategy**: ❌ **None**
- No materialized view refresh mechanism
- No triggers to refresh after match submissions
- No scheduled refresh jobs

#### Critical Gap

**Requirement from MATTS-UPGRADES.md**:
> "Should be backed by a materialized or cached aggregate"  
> "Do not recompute from raw matches on every page load."

**Current Implementation**:
- Views are regular PostgreSQL views (`CREATE VIEW`, not `CREATE MATERIALIZED VIEW`)
- Every query recomputes aggregations from raw match data
- No caching layer exists at application level

**Performance Impact**:
- **Current**: Views recompute on every page load
- **Scalability**: Will slow down as season progresses
- **Requirement Violation**: Directly contradicts performance requirements

**Evidence**:
```sql
-- Current implementation (from migration file)
create or replace view "public"."v_team_record_regular" as 
  SELECT t.season_id, ...
  FROM (public.teams t
    LEFT JOIN public.v_match_team_rows_regular r ON ...)
  GROUP BY t.season_id, t.id, t.name, t.conference, t.division;
```

**Required Implementation**:
```sql
-- Should be materialized view
CREATE MATERIALIZED VIEW v_team_record_regular AS ...
CREATE UNIQUE INDEX ON v_team_record_regular(team_id, season_id);

-- With refresh trigger
CREATE OR REPLACE FUNCTION refresh_team_stats()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY v_team_record_regular;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
```

**Status**: **Critical Gap - Performance Requirements Violated** ❌

---

### Theme 5: Standings Accuracy

#### Current State Assessment

**Ranking View**: ✅ Exists
- View: `v_regular_team_rankings` (lines 1849-1907)
- Complexity: Implements multi-level tie-breaking logic
- Structure: Uses CTEs for tie groups and head-to-head calculations

**Comparator Implementation**: ✅ Correct
```sql
ORDER BY 
  tg.wins DESC,                    -- Wins (desc) ✅
  tg.losses,                       -- Losses (asc) ✅
  tg.differential DESC,            -- Differential (desc) ✅
  hw.tied_h2h_win_pct DESC,       -- H2H ✅
  tg.active_win_streak DESC,      -- Streak ✅
  tg.sos DESC,                     -- SoS ✅
  tg.team_name                     -- Alpha ✅
```

**Required Comparator** (from MATTS-UPGRADES.md):
> "Wins (desc) → Losses (asc) → Differential (desc) → H2H → Streak → SoS → Alpha"

**Alignment Check**:
- ✅ Wins DESC: Correct (`tg.wins DESC`)
- ✅ Losses ASC: Correct (`tg.losses` without DESC = ASC)
- ✅ Differential DESC: Correct (`tg.differential DESC`)
- ✅ H2H: Implemented via `hw.tied_h2h_win_pct DESC`
- ✅ Streak: Implemented via `tg.active_win_streak DESC`
- ✅ SoS: Implemented via `tg.sos DESC`
- ✅ Alpha: Implemented via `tg.team_name` (alphabetical)

#### Gap Analysis

**View Correctness**: ✅ **Correct**
- The standings view correctly implements the league comparator
- Tie-breaking logic is properly structured
- Head-to-head calculations are accurate

**Usage**: ❌ **Not Used**
- View exists but is never queried in weekly matches page
- Standings card shows placeholder text only
- Correctness is rendered moot by lack of usage

**Status**: **Correct but Unused** ⚠️

The standings view implementation is correct and matches league requirements, but it's not being utilized. This represents a "correct but unused" pattern that appears throughout the codebase.

---

## Practical Implications

### Immediate Implementation Priorities

#### Priority 1: Data Integration (Critical) 🔴

**Actions Required**:
1. **Opponent Stats Query**: Implement query to `v_team_record_regular` and `v_active_win_streak_regular`
   ```typescript
   const { data: opponentStats } = await supabase
     .from('v_team_record_regular')
     .select('wins, losses, kills, deaths, differential')
     .eq('team_id', opponentTeamId)
     .eq('season_id', seasonId)
     .single()
   
   const { data: winStreak } = await supabase
     .from('v_active_win_streak_regular')
     .select('active_win_streak')
     .eq('team_id', opponentTeamId)
     .eq('season_id', seasonId)
     .single()
   ```

2. **Tera Captains Query**: Query `team_rosters` for Tera captains
   ```typescript
   const { data: teraCaptains } = await supabase
     .from('team_rosters')
     .select('pokemon_name, tera_types')
     .eq('team_id', opponentTeamId)
     .eq('season_id', seasonId)
     .eq('tera_captain', true)
   ```

3. **Standings Query**: Query `v_regular_team_rankings` for standings context
   ```typescript
   const { data: standings } = await supabase
     .from('v_regular_team_rankings')
     .select('league_rank, division_rank, conference_rank')
     .eq('team_id', opponentTeamId)
     .eq('season_id', seasonId)
     .single()
   ```

4. **Team Logo Display**: Include `logo_url` in team queries and display
   ```typescript
   // Update select statement to include logo_url
   team1:team1_id(id, name, coach_name, division, logo_url)
   ```

**Impact**: Transforms placeholder cards into functional data displays

**Timeline**: Should be completed immediately

---

#### Priority 2: Performance Optimization (Critical) 🔴

**Actions Required**:
1. **Convert Views to Materialized Views**
   ```sql
   -- Convert existing views to materialized views
   DROP VIEW IF EXISTS v_team_record_regular CASCADE;
   CREATE MATERIALIZED VIEW v_team_record_regular AS ...
   CREATE UNIQUE INDEX ON v_team_record_regular(team_id, season_id);
   ```

2. **Implement Refresh Triggers**
   ```sql
   -- Refresh after match result submission
   CREATE OR REPLACE FUNCTION refresh_team_stats()
   RETURNS TRIGGER AS $$
   BEGIN
     REFRESH MATERIALIZED VIEW CONCURRENTLY v_team_record_regular;
     REFRESH MATERIALIZED VIEW CONCURRENTLY v_active_win_streak_regular;
     REFRESH MATERIALIZED VIEW CONCURRENTLY v_regular_team_rankings;
     RETURN NULL;
   END;
   $$ LANGUAGE plpgsql;
   
   CREATE TRIGGER refresh_stats_after_match
     AFTER INSERT OR UPDATE ON matches
     FOR EACH ROW
     WHEN (NEW.winner_id IS NOT NULL)
     EXECUTE FUNCTION refresh_team_stats();
   ```

3. **Add Application-Level Caching** (Optional but recommended)
   - Cache opponent stats for current week
   - Cache standings data with TTL
   - Invalidate cache on match submission

**Impact**: Prevents performance degradation as season progresses

**Timeline**: Should be completed before Season 5 begins

---

#### Priority 3: Feature Completion (High) 🟡

**Actions Required**:
1. **Sprite View Selector**: Add to Card A
   - Create component for sprite view selection
   - Options: Gen sprites, animated/static, alt art
   - Store preference in user settings or local storage

2. **Tera Captain Display**: Implement Card D
   - Display list of opponent Pokémon
   - Add ⭐ indicator for Tera Captains
   - Show Tera types for each captain

3. **Opponent Performance Display**: Implement Card C
   - Display record (W-L)
   - Show win streak
   - Display kills, deaths, differential
   - Format symmetrically within card

**Impact**: Completes core functionality requirements

**Timeline**: Complete after Priority 1 and 2

---

#### Priority 4: Damage Calculator Integration (Pending Approval) 🟡

**Actions Required** (Pending Simeon's Approval):
1. **Design Integration Plan**
   - Document team scoping mechanism
   - Design UI for scoped calculator
   - Plan pre-filtering logic

2. **Implement Team Scoping**
   - Filter calculator to week's teams only
   - Pre-populate with opponent's roster
   - Allow selection of your team's Pokémon

3. **Integrate into Weekly Matches Page**
   - Embed calculator below cards
   - Pre-filter to relevant Pokémon
   - Maintain context with week selection

**Impact**: Enables strategic planning workflow

**Timeline**: Blocked pending approval

---

### Long-Term Considerations

#### Scalability

**Materialized Views**: Essential for league growth
- Current regular views will become slow as data accumulates
- Materialized views maintain consistent performance
- Refresh strategy must be optimized for concurrent access

**Partitioning Strategies**: Consider for historical data
- Archive completed seasons to separate tables
- Maintain current season in active tables
- Implement data retention policies

**Incremental Refresh**: Optimize materialized view updates
- Only refresh affected teams after match submission
- Use `REFRESH MATERIALIZED VIEW CONCURRENTLY` for zero-downtime updates
- Monitor refresh times and optimize as needed

#### User Experience

**First Impressions**: Current placeholder cards create poor UX
- Coaches expect functional opponent intelligence
- Placeholder text suggests incomplete feature
- Data integration will significantly improve usability

**Competitive Advantage**: Opponent intelligence is critical
- Coaches need opponent stats for preparation
- Tera captain information affects strategy
- Standings context informs match importance

**Workflow Integration**: Damage calculator integration completes planning workflow
- Currently fragmented (separate calculator page)
- Integration creates seamless planning experience
- Pre-filtering saves time and reduces errors

#### Data Accuracy

**Standings Accuracy**: Critical for league integrity
- Current view implementation is correct
- Must ensure materialized views maintain accuracy
- Regular validation against manual calculations recommended

**Performance Consistency**: Materialized views ensure consistent performance
- Regular views may have variable performance
- Materialized views provide predictable query times
- Essential for good user experience

---

### Risk Factors and Mitigation

#### Performance Degradation

**Risk**: Regular views will slow down as data grows
- **Probability**: High
- **Impact**: High
- **Mitigation**: Convert to materialized views immediately
- **Timeline**: Before Season 5 begins

#### Incomplete Feature Set

**Risk**: Coaches cannot effectively plan without opponent data
- **Probability**: High (current state)
- **Impact**: High
- **Mitigation**: Implement data integration as Priority 1
- **Impact**: Reduces competitive advantage of platform

#### Approval Bottleneck

**Risk**: Damage calculator integration blocked pending approval
- **Probability**: Medium
- **Impact**: Medium
- **Mitigation**: Document integration plan for review
- **Workaround**: Current link to `/calc` provides basic functionality

---

## Summary of Alignment Status

| Requirement | Status | Completion % | Notes |
|------------|--------|--------------|-------|
| **Card A: Week & View Config** | Partial | 70% | Week selector works, sprite selector missing |
| **Card B: Opponent Identity** | Partial | 60% | Name/coach shown, logo missing |
| **Card C: Performance Snapshot** | Missing | 0% | Placeholder only, no data queries |
| **Card D: Tera Captains** | Missing | 0% | Placeholder only, no roster queries |
| **Card E: Standings Context** | Missing | 0% | Placeholder only, no rankings queries |
| **Battle Plans** | Complete | 100% | Fully implemented with RLS |
| **Damage Calculator** | Pending | 0% | Exists but not integrated, needs approval |
| **Performance (Materialized Views)** | Missing | 0% | Views exist but not materialized |
| **Standings Accuracy** | Correct (Unused) | 50% | View is correct but not queried |

**Overall Alignment**: **35% Complete**

---

## Recommendations

### Immediate Actions (This Week)

1. **Implement Data Queries for All Five Cards**
   - Add queries to fetch opponent stats from views
   - Query team_rosters for Tera captains
   - Query standings view for rankings
   - Include logo_url in team queries

2. **Convert Database Views to Materialized Views**
   - Create migration to convert views
   - Add refresh triggers after match submissions
   - Test refresh performance

3. **Add Team Logo Display**
   - Update select statements to include logo_url
   - Add image component to display logos
   - Handle missing logos gracefully

4. **Implement Tera Captain Queries and Display**
   - Query team_rosters with tera_captain filter
   - Display with ⭐ indicator
   - Show Tera types for each captain

### Short-Term Actions (Next 2 Weeks)

1. **Add Sprite View Selector**
   - Create component for sprite selection
   - Store user preferences
   - Apply to Pokémon displays

2. **Create Refresh Mechanism for Materialized Views**
   - Implement trigger function
   - Test concurrent refresh
   - Monitor performance

3. **Document Damage Calculator Integration Plan**
   - Design team scoping mechanism
   - Document UI/UX approach
   - Prepare for approval review

### Long-Term Considerations

1. **Implement Application-Level Caching**
   - Cache frequently accessed data
   - Implement TTL-based invalidation
   - Monitor cache hit rates

2. **Add Performance Monitoring**
   - Track view refresh times
   - Monitor query performance
   - Alert on degradation

3. **Consider Incremental Refresh Strategies**
   - Refresh only affected teams
   - Optimize for concurrent access
   - Reduce refresh overhead

---

## Conclusion

The dashboard structure is well-designed and the foundational components exist, but **critical data integration gaps** prevent it from meeting its intended functionality. The battle plan system is complete and correctly architected, demonstrating that the development team can deliver high-quality features when requirements are clear. However, the disconnect between database infrastructure (which is correct) and frontend implementation (which is incomplete) suggests a need for better integration between database design and UI development.

**Performance optimization through materialized views is critical** and should be prioritized before the season begins to prevent scalability issues. The standings logic is correct but unused, representing a pattern of "correct but unused" infrastructure that should be addressed.

**Overall, the dashboard is 35% aligned with MATTS-UPGRADES.md requirements**, with the primary gaps being data integration and performance optimization. With focused effort on Priority 1 and Priority 2 items, the dashboard can be brought to full alignment within 1-2 weeks.

---

**Document Generated**: January 26, 2026  
**Analysis Method**: Deep Research Protocol  
**Next Review**: After Priority 1 & 2 implementation
