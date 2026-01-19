# Draft System Update - Comprehensive Implementation Plan

**Date**: January 19, 2026  
**Status**: Planning Phase  
**Based On**: DRAFTBOARD-COMPREHENSIVE-BREAKDOWN.md + Current Codebase Analysis

---

## Executive Summary

This document provides a comprehensive plan to update the POKE MNKY draft system to align with the specifications in `DRAFTBOARD-COMPREHENSIVE-BREAKDOWN.md`. The analysis reveals a **schema migration gap** where the database has been migrated to the new structure (`status` enum, `season_id`, denormalized fields) but the application code still uses the old structure (`is_available` boolean, no season filtering).

**Current State**: 
- ✅ Database schema migrated (status enum, season_id, denormalized fields exist)
- ❌ Application code still uses old schema (is_available boolean)
- ⚠️ Components exist but don't match DRAFTBOARD spec exactly
- ⚠️ Missing some UI enhancements specified in DRAFTBOARD

**Goal**: Complete the migration by updating all code to use the new schema, enhance components to match DRAFTBOARD spec, and integrate MagicUI/Shadcn components for improved UX.

---

## Critical Findings

### 1. Schema Migration Gap (CRITICAL)

**Database State** (Verified via Supabase MCP):
- ✅ `status` enum column exists (`draft_pool_status` type)
- ✅ `season_id` column exists and is NOT NULL
- ✅ Denormalized fields exist: `drafted_by_team_id`, `draft_round`, `draft_pick_number`, `drafted_at`
- ⚠️ `is_available` boolean column STILL EXISTS (transition state)
- ✅ All 749 Pokemon have `status = 'available'` and `is_available = true`

**Code State**:
- ❌ `lib/draft-system.ts` queries `is_available = true` (line 162, 304)
- ❌ No `season_id` filtering in queries
- ❌ Doesn't use denormalized fields
- ❌ Components reference `is_available` instead of `status`

**Impact**: Code will break when `is_available` column is removed. Must update all code before removing old column.

### 2. Component Structure Mismatch

**DRAFTBOARD Spec**:
- `DraftBoardGrid` - Main grid container
- `PointValueColumn` - Column for each point tier (1-20)
- `PokemonCard` - Individual Pokemon card
- `BudgetDisplay` - Budget progress indicator
- `PickConfirmation` - Modal for confirming picks

**Current Implementation**:
- ✅ `DraftBoard` exists (similar to DraftBoardGrid)
- ✅ `PointTierSection` exists (similar to PointValueColumn, different naming)
- ✅ `DraftPokemonCard` exists (matches PokemonCard conceptually)
- ❌ `BudgetDisplay` component missing (budget shown in TeamRosterPanel)
- ❌ `PickConfirmation` modal missing

### 3. Missing Features

**From DRAFTBOARD Spec**:
- Enhanced filter UI with point range sliders
- Budget validation UI feedback
- Pick confirmation modal
- Better mobile responsiveness (horizontal scroll)
- Accessibility features (ARIA labels, keyboard navigation)
- Real-time updates via postgres_changes (currently uses broadcast)

**Current State**:
- Basic filters exist (search, tier dropdown, generation dropdown)
- Budget shown but not prominently displayed
- No confirmation modal before picks
- Mobile responsive but could be improved
- Basic accessibility
- Real-time via broadcast channels (should use postgres_changes)

---

## Implementation Plan

### Phase 1: Schema Migration Completion (CRITICAL - Week 1)

#### 1.1 Update DraftSystem Class

**File**: `lib/draft-system.ts`

**Changes Required**:

1. **Replace `is_available` with `status` enum**:
   ```typescript
   // OLD (line 162):
   .eq("is_available", true)
   
   // NEW:
   .eq("status", "available")
   ```

2. **Add `season_id` filtering to all queries**:
   ```typescript
   // Add season_id parameter to getAvailablePokemon
   async getAvailablePokemon(
     seasonId: string, // ADD THIS
     filters?: { ... }
   ): Promise<...> {
     let query = this.supabase
       .from("draft_pool")
       .select("pokemon_name, point_value, generation, pokemon_id, status")
       .eq("status", "available") // Changed from is_available
       .eq("season_id", seasonId) // ADD THIS
       ...
   }
   ```

3. **Update `makePick` to use new schema**:
   ```typescript
   // OLD (line 162):
   .eq("is_available", true)
   
   // NEW:
   .eq("status", "available")
   .eq("season_id", session.season_id) // ADD THIS
   
   // Update draft_pool after pick (line 256):
   // OLD:
   .update({ is_available: false })
   
   // NEW:
   .update({
     status: "drafted",
     drafted_by_team_id: teamId,
     drafted_at: new Date().toISOString(),
     draft_round: session.current_round,
     draft_pick_number: session.current_pick_number,
   })
   ```

4. **Use denormalized fields for performance**:
   ```typescript
   // When querying team picks, use denormalized fields:
   const { data: picks } = await this.supabase
     .from("draft_pool")
     .select("pokemon_name, point_value, draft_round, draft_pick_number")
     .eq("drafted_by_team_id", teamId)
     .eq("season_id", seasonId)
     .eq("status", "drafted")
     .order("draft_round", { ascending: true })
     .order("draft_pick_number", { ascending: true })
   ```

**Files to Update**:
- `lib/draft-system.ts` (all methods)

**Testing**:
- ✅ Verify all queries filter by season_id
- ✅ Verify status enum used instead of is_available
- ✅ Verify denormalized fields populated on draft picks
- ✅ Test backward compatibility (if any)

#### 1.2 Update API Routes

**Files**: `app/api/draft/*/route.ts`

**Changes Required**:

1. **`/api/draft/available/route.ts`**:
   ```typescript
   // Add season_id parameter
   // Update response to include status field
   // Remove is_available from response
   ```

2. **`/api/draft/pick/route.ts`**:
   ```typescript
   // Update to use status enum
   // Add season_id validation
   // Update draft_pool with denormalized fields
   ```

3. **`/api/draft/status/route.ts`**:
   ```typescript
   // Ensure season_id is included in response
   ```

4. **`/api/draft/team-status/route.ts`**:
   ```typescript
   // Use denormalized fields from draft_pool
   // Add season_id filtering
   ```

**Testing**:
- ✅ All API routes return status field
- ✅ All queries filter by season_id
- ✅ Draft picks update denormalized fields
- ✅ Error handling for missing season_id

#### 1.3 Update Frontend Components

**Files**: `components/draft/*.tsx`

**Changes Required**:

1. **`components/draft/draft-board.tsx`**:
   ```typescript
   // Update to use status field instead of is_available
   // Add season_id to API calls
   // Update draftedPokemon check to use status
   ```

2. **`components/draft/draft-pokemon-card.tsx`**:
   ```typescript
   // Update props to use status instead of isDrafted boolean
   // Add status display (available/drafted/banned)
   ```

3. **`components/draft/point-tier-section.tsx`**:
   ```typescript
   // Update to filter by status
   // Show status counts (available/drafted)
   ```

**Testing**:
- ✅ Components display status correctly
- ✅ Drafted Pokemon show as unavailable
- ✅ Real-time updates work with new schema

---

### Phase 2: Component Alignment (Week 2)

#### 2.1 Create Missing Components

**New Components to Create**:

1. **`components/draft/pick-confirmation.tsx`**:
   ```typescript
   // Modal component for confirming draft picks
   // Shows Pokemon details, budget impact, confirmation
   // Uses Shadcn Dialog component
   ```

2. **`components/draft/budget-display.tsx`**:
   ```typescript
   // Prominent budget display with progress bar
   // Shows spent/remaining points
   // Color-coded (green/yellow/red)
   // Uses Shadcn Progress component
   ```

3. **`components/draft/draft-board-grid.tsx`**:
   ```typescript
   // Main grid container matching DRAFTBOARD spec
   // Organizes PointValueColumn components
   // Horizontal scroll on mobile
   ```

4. **`components/draft/point-value-column.tsx`**:
   ```typescript
   // Column component for each point tier
   // Replaces PointTierSection (or rename)
   // Shows available count in header
   ```

**MagicUI Components to Integrate**:
- `number-ticker` - Animate budget numbers
- `confetti` - Celebrate successful picks
- `animated-list` - Enhanced pick history
- `border-beam` - Highlight selected Pokemon
- `blur-fade` - Smooth transitions (already used)

**Shadcn Components to Use**:
- `Dialog` - Pick confirmation modal
- `Progress` - Budget progress bar
- `Badge` - Status indicators (already used)
- `Slider` - Point range filter

#### 2.2 Enhance Existing Components

**`components/draft/draft-board.tsx`**:
- Add horizontal scroll for mobile
- Improve filter UI (add point range slider)
- Add keyboard shortcuts
- Enhance accessibility

**`components/draft/draft-pokemon-card.tsx`**:
- Add status badge (available/drafted/banned)
- Add border-beam effect when selected
- Improve hover states
- Add keyboard navigation

**`components/draft/team-roster-panel.tsx`**:
- Integrate BudgetDisplay component
- Use denormalized fields for faster loading
- Add sort/filter options

---

### Phase 3: Real-time Updates Enhancement (Week 2-3)

#### 3.1 Update Real-time Subscriptions

**Current**: Uses broadcast channels  
**Target**: Use postgres_changes for better reliability

**Changes Required**:

1. **Update `app/draft/board/page.tsx`**:
   ```typescript
   // OLD:
   const picksChannel = supabase
     .channel(`draft:${sessionData.id}:picks`)
     .on("broadcast", { event: "INSERT" }, ...)
   
   // NEW:
   const picksChannel = supabase
     .channel(`draft:${sessionData.id}:picks`)
     .on(
       "postgres_changes",
       {
         event: "INSERT",
         schema: "public",
         table: "team_rosters",
         filter: "source=eq.draft",
       },
       (payload) => {
         // Handle real-time update
         queryClient.invalidateQueries({ queryKey: ["draft-pool"] });
       }
     )
     .subscribe()
   ```

2. **Add draft_pool changes subscription**:
   ```typescript
   const draftPoolChannel = supabase
     .channel(`draft-pool:${seasonId}`)
     .on(
       "postgres_changes",
       {
         event: "UPDATE",
         schema: "public",
         table: "draft_pool",
         filter: `season_id=eq.${seasonId}`,
       },
       (payload) => {
         // Update UI when Pokemon status changes
       }
     )
     .subscribe()
   ```

**Testing**:
- ✅ Real-time updates work when picks are made
- ✅ Multiple clients see updates simultaneously
- ✅ No duplicate updates
- ✅ Handles connection drops gracefully

---

### Phase 4: UI/UX Enhancements (Week 3)

#### 4.1 MagicUI Component Integration

**Components to Add**:

1. **Confetti on Successful Pick**:
   ```typescript
   import { Confetti } from "@/components/ui/confetti"
   
   // In PickConfirmation component
   {success && <Confetti />}
   ```

2. **Number Ticker for Budget**:
   ```typescript
   import { NumberTicker } from "@/components/ui/number-ticker"
   
   // In BudgetDisplay component
   <NumberTicker value={remainingPoints} />
   ```

3. **Animated List for Pick History**:
   ```typescript
   import { AnimatedList } from "@/components/ui/animated-list"
   
   // In PickHistory component
   <AnimatedList items={recentPicks} />
   ```

4. **Border Beam for Selected Pokemon**:
   ```typescript
   import { BorderBeam } from "@/components/ui/border-beam"
   
   // In DraftPokemonCard when selected
   <BorderBeam duration={12} />
   ```

#### 4.2 Accessibility Enhancements

**Add ARIA Labels**:
```typescript
<button
  aria-label={`Draft ${pokemon.name} for ${pokemon.point_value} points`}
  aria-disabled={!isAvailable || !canAfford}
  onKeyDown={(e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handlePick();
    }
  }}
>
```

**Add Screen Reader Announcements**:
```typescript
<div role="status" aria-live="polite" className="sr-only">
  {draftStatus && `Current pick: ${draftStatus.current_pick} of ${draftStatus.total_picks}`}
</div>
```

**Keyboard Shortcuts**:
- `Ctrl/Cmd + F` - Focus search
- `Esc` - Close modals
- `Enter` - Confirm draft pick
- Arrow keys - Navigate Pokemon cards

#### 4.3 Mobile Responsiveness

**Horizontal Scroll for Point Columns**:
```typescript
<div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4">
  {pointTiers.map(tier => (
    <PointValueColumn
      key={tier}
      pointValue={tier}
      className="snap-center min-w-[280px]"
    />
  ))}
</div>
```

**Touch-Friendly Targets**:
- Minimum 44x44px touch targets
- Larger spacing between cards
- Swipe gestures for navigation

---

### Phase 5: Performance Optimization (Week 3-4)

#### 5.1 Use Denormalized Fields

**Benefits**:
- Faster queries (no JOINs needed)
- Reduced database load
- Better real-time performance

**Implementation**:
```typescript
// Instead of JOINing team_rosters with pokemon:
const { data: picks } = await supabase
  .from("draft_pool")
  .select("pokemon_name, point_value, draft_round, draft_pick_number")
  .eq("drafted_by_team_id", teamId)
  .eq("season_id", seasonId)
  .eq("status", "drafted")
  .order("draft_round", { ascending: true })
```

#### 5.2 Query Optimization

**Add Indexes** (if not already present):
```sql
-- Verify indexes exist
CREATE INDEX IF NOT EXISTS idx_draft_pool_season_status 
  ON draft_pool(season_id, status);
  
CREATE INDEX IF NOT EXISTS idx_draft_pool_drafted_by 
  ON draft_pool(drafted_by_team_id) 
  WHERE status = 'drafted';
```

**Limit Query Results**:
```typescript
// Add pagination or limits
.limit(100) // For available Pokemon queries
```

#### 5.3 Frontend Optimization

**Memoization**:
```typescript
const filteredPokemon = useMemo(() => {
  return pokemon.filter(p => {
    // Filter logic
  });
}, [pokemon, filters]);
```

**Virtual Scrolling** (for large lists):
```typescript
import { useVirtualizer } from "@tanstack/react-virtual";

// For Pokemon lists with 100+ items
```

**Code Splitting**:
```typescript
const PickConfirmation = dynamic(() => import("./pick-confirmation"), {
  ssr: false,
});
```

---

## Testing Strategy

### Unit Tests

**DraftSystem Class**:
- ✅ `getAvailablePokemon` filters by season_id and status
- ✅ `makePick` updates status and denormalized fields
- ✅ Budget validation works correctly
- ✅ Turn tracking works for snake draft

**API Routes**:
- ✅ All routes return status field
- ✅ All routes filter by season_id
- ✅ Error handling for invalid inputs
- ✅ Authentication/authorization checks

### Integration Tests

**Draft Flow**:
- ✅ Create draft session
- ✅ Make draft picks
- ✅ Update budget correctly
- ✅ Mark Pokemon as drafted
- ✅ Advance to next turn
- ✅ Complete draft session

**Real-time Updates**:
- ✅ Multiple clients see updates
- ✅ No duplicate updates
- ✅ Handles connection drops
- ✅ Reconnects gracefully

### E2E Tests

**User Flows**:
- ✅ View draft board
- ✅ Filter Pokemon
- ✅ Make draft pick
- ✅ See budget update
- ✅ See real-time updates
- ✅ View team roster

---

## Migration Checklist

### Pre-Migration

- [ ] Backup database
- [ ] Verify all tests pass with current code
- [ ] Document current behavior
- [ ] Create rollback plan

### Migration Steps

- [ ] Update DraftSystem class
- [ ] Update API routes
- [ ] Update frontend components
- [ ] Update real-time subscriptions
- [ ] Add new components
- [ ] Integrate MagicUI components
- [ ] Add accessibility features
- [ ] Test all functionality

### Post-Migration

- [ ] Verify all tests pass
- [ ] Test real-time updates
- [ ] Test on mobile devices
- [ ] Performance testing
- [ ] User acceptance testing
- [ ] Remove `is_available` column (after verification period)
- [ ] Update documentation

---

## Risk Mitigation

### Risk 1: Breaking Existing Functionality

**Mitigation**:
- Comprehensive testing before deployment
- Feature flags for gradual rollout
- Rollback plan ready
- Monitor error logs closely

### Risk 2: Real-time Updates Not Working

**Mitigation**:
- Test subscriptions thoroughly
- Add fallback polling mechanism
- Monitor connection status
- Add reconnection logic

### Risk 3: Performance Degradation

**Mitigation**:
- Use denormalized fields
- Add database indexes
- Implement pagination
- Monitor query performance
- Add caching where appropriate

### Risk 4: Mobile Experience Issues

**Mitigation**:
- Test on multiple devices
- Use responsive design patterns
- Optimize touch targets
- Test horizontal scroll performance

---

## Rollback Plan

If issues arise:

1. **Immediate Rollback**:
   - Revert code changes
   - Database schema remains (backward compatible)
   - Old code still works with both columns

2. **Partial Rollback**:
   - Keep new components
   - Revert schema changes in code
   - Use feature flags to disable new features

3. **Data Recovery**:
   - Database has both old and new fields
   - Can reconstruct state from either
   - No data loss risk

---

## Success Criteria

### Functional Requirements

- ✅ All queries use `status` enum instead of `is_available`
- ✅ All queries filter by `season_id`
- ✅ Denormalized fields populated on draft picks
- ✅ Real-time updates work correctly
- ✅ All components match DRAFTBOARD spec
- ✅ Budget validation works correctly
- ✅ Pick confirmation modal works
- ✅ Mobile experience is smooth

### Performance Requirements

- ✅ Page load < 2 seconds
- ✅ Filter updates < 500ms
- ✅ Draft pick confirmation < 1 second
- ✅ Real-time update latency < 1 second
- ✅ Smooth scrolling (60fps)

### UX Requirements

- ✅ Intuitive interface
- ✅ Clear visual feedback
- ✅ Accessible (WCAG AA)
- ✅ Mobile-friendly
- ✅ Responsive design

---

## Timeline

**Week 1**: Schema Migration Completion
- Update DraftSystem class
- Update API routes
- Update frontend components
- Testing

**Week 2**: Component Alignment
- Create missing components
- Enhance existing components
- Integrate MagicUI components
- Testing

**Week 3**: Real-time & Performance
- Update real-time subscriptions
- Performance optimization
- Accessibility enhancements
- Testing

**Week 4**: Polish & Launch
- Final testing
- Bug fixes
- Documentation
- Deployment

---

## Next Steps

1. **Review this plan** with team
2. **Prioritize phases** based on business needs
3. **Set up testing environment**
4. **Begin Phase 1 implementation**
5. **Regular checkpoints** for progress review

---

## References

- **DRAFTBOARD Spec**: `DRAFTBOARD-COMPREHENSIVE-BREAKDOWN.md`
- **Current Implementation**: `lib/draft-system.ts`, `app/api/draft/`, `components/draft/`
- **Database Schema**: Supabase migrations
- **MagicUI Components**: Available via MCP
- **Shadcn Components**: `components/ui/`

---

**Last Updated**: January 19, 2026  
**Status**: Ready for Implementation  
**Next Review**: After Phase 1 completion
