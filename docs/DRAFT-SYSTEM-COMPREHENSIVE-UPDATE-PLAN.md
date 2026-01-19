# Draft System Comprehensive Update Plan

**Date**: January 19, 2026  
**Status**: Planning Phase  
**Based On**: DRAFTBOARD-COMPREHENSIVE-BREAKDOWN.md + Current Codebase Analysis

---

## Executive Summary

This document provides a comprehensive plan to update the draftboard system to align with the new schema (`status` enum, `season_id` filtering) and enhance the UI/UX using Shadcn and MagicUI components. The analysis reveals that **server-side code is complete**, **application code is 85% complete**, with remaining gaps in TypeScript interfaces, database migration cleanup, and UI enhancements.

---

## Current State Analysis

### ✅ What's Complete

#### Backend (Server-Side)
- ✅ Discord Bot: Uses `status` enum and `season_id` filtering
- ✅ Open WebUI Pipeline: Uses `status` enum and `season_id` filtering  
- ✅ MCP Server: Uses `status` enum and `season_id` filtering

#### Application Code (Next.js)
- ✅ `lib/draft-system.ts`: Fully updated
  - `makePick()` uses `status = "drafted"` and denormalized fields
  - `getAvailablePokemon()` filters by `status = "available"` and `season_id`
  - `getTeamStatus()` uses denormalized fields from `draft_pool`
- ✅ `app/api/draft/available/route.ts`: Correctly extracts `season_id` and passes to `draftSystem.getAvailablePokemon()`
- ✅ `app/api/draft/pick/route.ts`: Already consistent (takes `season_id` from body)
- ✅ `app/api/draft/team-status/route.ts`: Already consistent (benefits from denormalization)
- ✅ `components/draft/draft-board.tsx`: Uses `status` field, queries `draft_pool` directly
- ✅ `components/draft/point-tier-section.tsx`: Includes `status` field in Pokemon interface
- ✅ `components/draft/draft-pokemon-card.tsx`: Uses `status` field with fallback logic
- ✅ `lib/free-agency.ts`: Updated to query `draft_pool` with `status` filtering

### ⚠️ What Needs Attention

#### Database Schema (Migration State)
- ⚠️ **Both `is_available` (boolean, NOT NULL) and `status` (enum, nullable) columns exist**
- ⚠️ `status` column is nullable (should have default `'available'`)
- ⚠️ No migration to drop `is_available` column after verification period

#### TypeScript Interfaces
- ⚠️ `Pokemon` interface in `draft-board.tsx` missing `status` field (line 11-16)
- ⚠️ Status is passed through but not typed correctly

#### UI Components (Enhancement Opportunities)
- ⚠️ Missing `BudgetDisplay` component (specified in DRAFTBOARD-COMPREHENSIVE-BREAKDOWN.md)
- ⚠️ Missing `PickConfirmation` modal component
- ⚠️ Could enhance with MagicUI components:
  - `confetti` for successful draft picks
  - `animated-list` for pick history
  - `number-ticker` for budget display
  - `sparkles-text` for special moments
  - `border-beam` for active turn highlighting

#### Parser Scripts (Low Priority)
- ⚠️ `lib/google-sheets-parsers/draft-pool-parser.ts` still uses `is_available` (acceptable - one-time import script)

---

## Detailed Findings

### 1. Database Schema Status

**Current State**:
```sql
-- draft_pool table has BOTH columns:
is_available BOOLEAN NOT NULL DEFAULT true  -- OLD (should be removed)
status draft_pool_status                    -- NEW (nullable, should have default)
```

**Issues**:
1. **Dual Column State**: Both `is_available` and `status` exist, causing potential confusion
2. **Nullable Status**: `status` column is nullable, should default to `'available'`
3. **No Cleanup Migration**: No migration exists to drop `is_available` after verification

**Recommendation**:
- Create migration to set default value for `status` column
- Create migration to backfill `status` from `is_available` for any NULL values
- After 1-2 week verification period, create migration to drop `is_available` column

### 2. TypeScript Interface Gaps

**Issue**: `Pokemon` interface in `draft-board.tsx` (lines 11-16) doesn't include `status` field:

```typescript
interface Pokemon {
  pokemon_name: string
  point_value: number
  generation: number | null
  pokemon_id: number | null
  // Missing: status?: "available" | "drafted" | "banned" | "unavailable"
}
```

**Impact**: Type safety compromised, status passed through but not typed

**Fix**: Add `status` field to interface

### 3. Missing UI Components

**From DRAFTBOARD-COMPREHENSIVE-BREAKDOWN.md Section 16**:

1. **BudgetDisplay Component**: Missing
   - Should show spent/remaining points with progress bar
   - Should use color coding (green/yellow/red based on usage)
   - Should display percentage used

2. **PickConfirmation Modal**: Missing
   - Should show Pokemon details before confirming pick
   - Should display budget impact
   - Should allow cancellation

**Existing Components** (Good):
- ✅ `draft-board.tsx` - Main container
- ✅ `draft-pokemon-card.tsx` - Individual Pokemon cards
- ✅ `point-tier-section.tsx` - Point value columns
- ✅ `draft-header.tsx` - Draft status display
- ✅ `team-roster-panel.tsx` - Team picks display
- ✅ `pick-history.tsx` - Pick history list
- ✅ `live-draft-ticker.tsx` - Real-time updates

### 4. UI Enhancement Opportunities

**MagicUI Components Available**:
- `confetti` - Celebrate successful draft picks
- `animated-list` - Enhance pick history with animations
- `number-ticker` - Animate budget numbers
- `sparkles-text` - Highlight special moments
- `border-beam` - Highlight active turn
- `animated-gradient-text` - Already used in `point-tier-section.tsx` ✅
- `blur-fade` - Already used in `draft-pokemon-card.tsx` ✅
- `magic-card` - Already used in `draft-pokemon-card.tsx` ✅
- `shimmer-button` - Already used in `draft-pokemon-card.tsx` ✅

**Shadcn Components Available**:
- `progress` - For budget progress bar
- `dialog` - For pick confirmation modal
- `slider` - For point range filter (enhancement)
- `badge` - Already used ✅
- `card` - Already used ✅
- `skeleton` - Already used ✅

---

## Implementation Plan

### Phase 1: Database Migration Cleanup (Priority: High)

**Goal**: Ensure database schema is consistent and `status` column has proper defaults

**Tasks**:
1. **Create Migration**: Set default value for `status` column
   ```sql
   ALTER TABLE draft_pool 
   ALTER COLUMN status SET DEFAULT 'available';
   ```

2. **Create Migration**: Backfill NULL `status` values from `is_available`
   ```sql
   UPDATE draft_pool 
   SET status = CASE 
     WHEN is_available = true THEN 'available'
     WHEN is_available = false THEN 'drafted'
   END
   WHERE status IS NULL;
   ```

3. **Create Migration**: Make `status` NOT NULL after backfill
   ```sql
   ALTER TABLE draft_pool 
   ALTER COLUMN status SET NOT NULL;
   ```

4. **Future Migration** (After 1-2 week verification): Drop `is_available` column
   ```sql
   ALTER TABLE draft_pool DROP COLUMN is_available;
   ```

**Files to Create**:
- `supabase/migrations/YYYYMMDDHHMMSS_set_status_default.sql`
- `supabase/migrations/YYYYMMDDHHMMSS_backfill_status_from_is_available.sql`
- `supabase/migrations/YYYYMMDDHHMMSS_make_status_not_null.sql`
- `supabase/migrations/YYYYMMDDHHMMSS_drop_is_available_column.sql` (future)

**Verification**:
- Query database to ensure all rows have `status` set
- Verify no NULL `status` values exist
- Test that new inserts default to `'available'`

---

### Phase 2: TypeScript Interface Updates (Priority: Medium)

**Goal**: Fix TypeScript interfaces to include `status` field

**Tasks**:
1. **Update `components/draft/draft-board.tsx`**:
   ```typescript
   interface Pokemon {
     pokemon_name: string
     point_value: number
     generation: number | null
     pokemon_id: number | null
     status?: "available" | "drafted" | "banned" | "unavailable"  // ADD THIS
   }
   ```

2. **Verify API Response Types**: Ensure `/api/draft/available` returns `status` field
   - Already correct in `lib/draft-system.ts` ✅
   - Verify response includes `status` in JSON

**Files to Update**:
- `components/draft/draft-board.tsx` (line 11-16)

**Verification**:
- TypeScript compilation passes
- No type errors in IDE
- Runtime behavior unchanged

---

### Phase 3: Missing UI Components (Priority: High)

**Goal**: Create missing components from DRAFTBOARD specification

#### 3.1 BudgetDisplay Component

**Location**: `components/draft/budget-display.tsx`

**Requirements**:
- Display total budget (120 points)
- Display spent points
- Display remaining points
- Progress bar with color coding:
  - Green: 0-79% used
  - Yellow: 80-99% used
  - Red: 100%+ used
- Percentage used display
- Warning if remaining < 20 points

**Shadcn Components**:
- `progress` - For progress bar
- `card` - Container
- `badge` - For point values

**MagicUI Components**:
- `number-ticker` - Animate budget numbers

**Props**:
```typescript
interface BudgetDisplayProps {
  teamId: string
  seasonId?: string
}
```

**Implementation**:
- Use `useTeamBudget` hook (create if needed) or fetch from `/api/draft/team-status`
- Display in `draft-board.tsx` header area

#### 3.2 PickConfirmation Modal

**Location**: `components/draft/pick-confirmation-dialog.tsx`

**Requirements**:
- Show Pokemon name (large, bold)
- Show point value
- Show current budget: "You have X points remaining"
- Show after pick: "You will have Y points remaining"
- Confirm button (primary)
- Cancel button (secondary)
- Loading state during API call
- Success/error toast notifications

**Shadcn Components**:
- `dialog` - Modal container
- `button` - Actions
- `card` - Content container

**MagicUI Components**:
- `confetti` - Celebrate on successful pick

**Props**:
```typescript
interface PickConfirmationDialogProps {
  pokemon: {
    name: string
    point_value: number
    generation?: number
  }
  teamId: string
  seasonId?: string
  currentBudget: {
    total: number
    spent: number
    remaining: number
  }
  open: boolean
  onConfirm: () => void
  onCancel: () => void
}
```

**Integration**:
- Update `draft-pokemon-card.tsx` to open dialog on click
- Handle confirmation in `draft-board.tsx` `handlePick` function

---

### Phase 4: UI Enhancements (Priority: Low-Medium)

**Goal**: Enhance existing components with MagicUI animations

#### 4.1 Draft Pick Celebration

**Enhancement**: Add confetti animation on successful draft pick

**Component**: `components/draft/draft-pokemon-card.tsx`

**MagicUI Component**: `confetti`

**Implementation**:
- Trigger confetti when `onPick` succeeds
- Use `useConfetti` hook or direct component

#### 4.2 Pick History Animation

**Enhancement**: Animate pick history list

**Component**: `components/draft/pick-history.tsx`

**MagicUI Component**: `animated-list`

**Implementation**:
- Replace static list with `AnimatedList`
- Animate items as they're added

#### 4.3 Budget Number Animation

**Enhancement**: Animate budget numbers when they change

**Component**: `components/draft/budget-display.tsx` (new)

**MagicUI Component**: `number-ticker`

**Implementation**:
- Use `NumberTicker` for spent/remaining points
- Smooth transitions when budget updates

#### 4.4 Active Turn Highlighting

**Enhancement**: Highlight current team's turn with border beam

**Component**: `components/draft/draft-board.tsx`

**MagicUI Component**: `border-beam`

**Implementation**:
- Add `BorderBeam` to draft board when `isYourTurn === true`
- Animate border to draw attention

#### 4.5 Special Moments Sparkles

**Enhancement**: Add sparkles for special moments (first pick, budget milestones)

**Component**: `components/draft/draft-header.tsx`

**MagicUI Component**: `sparkles-text`

**Implementation**:
- Use `SparklesText` for milestone announcements
- Trigger on specific events (pick #1, 50% budget used, etc.)

---

### Phase 5: Real-Time Updates Optimization (Priority: Low)

**Goal**: Optimize real-time subscriptions

**Current State**: ✅ Using `postgres_changes` on `draft_pool` table

**Enhancements**:
1. **Debounce Updates**: Prevent excessive re-renders
2. **Selective Updates**: Only update affected components
3. **Connection Management**: Properly unsubscribe on unmount

**Files to Review**:
- `components/draft/draft-board.tsx` (lines 82-102)

**Verification**:
- Test with multiple concurrent users
- Monitor performance
- Ensure no memory leaks

---

## Component Architecture

### Current Component Structure

```
components/draft/
├── draft-board.tsx              ✅ Main container
├── draft-pokemon-card.tsx       ✅ Individual cards
├── point-tier-section.tsx       ✅ Point value columns
├── draft-header.tsx             ✅ Status display
├── team-roster-panel.tsx        ✅ Team picks
├── pick-history.tsx             ✅ Pick history
├── live-draft-ticker.tsx        ✅ Real-time ticker
├── draft-chat.tsx               ✅ Chat component
├── coach-card.tsx               ✅ Coach display
├── trainer-card.tsx             ✅ Trainer display
├── budget-display.tsx           ❌ MISSING (Phase 3.1)
└── pick-confirmation-dialog.tsx ❌ MISSING (Phase 3.2)
```

### Proposed Component Structure

```
components/draft/
├── draft-board.tsx                    ✅ Enhanced with BudgetDisplay
├── draft-pokemon-card.tsx             ✅ Enhanced with confetti
├── point-tier-section.tsx             ✅ Already good
├── draft-header.tsx                   ✅ Enhanced with sparkles
├── team-roster-panel.tsx              ✅ Already good
├── pick-history.tsx                   ✅ Enhanced with animated-list
├── live-draft-ticker.tsx              ✅ Already good
├── draft-chat.tsx                     ✅ Already good
├── coach-card.tsx                     ✅ Already good
├── trainer-card.tsx                   ✅ Already good
├── budget-display.tsx                 🆕 NEW (Phase 3.1)
└── pick-confirmation-dialog.tsx      🆕 NEW (Phase 3.2)
```

---

## Testing Strategy

### Unit Tests

1. **Database Migrations**:
   - Test default value assignment
   - Test backfill logic
   - Test NOT NULL constraint

2. **TypeScript Interfaces**:
   - Verify type safety
   - Test with various status values

3. **Components**:
   - Test BudgetDisplay with various budget states
   - Test PickConfirmation modal open/close
   - Test confetti trigger

### Integration Tests

1. **Draft Flow**:
   - Test complete draft pick flow
   - Test budget updates
   - Test real-time updates

2. **API Routes**:
   - Test `/api/draft/available` returns `status`
   - Test `/api/draft/pick` updates `status`
   - Test `/api/draft/team-status` uses denormalized fields

### E2E Tests

1. **User Flow**:
   - User views draft board
   - User filters Pokemon
   - User selects Pokemon
   - Confirmation modal appears
   - User confirms pick
   - Confetti animation triggers
   - Budget updates
   - Pokemon marked as drafted
   - Real-time update to other users

---

## Risk Assessment

### Low Risk
- ✅ TypeScript interface updates (non-breaking)
- ✅ UI enhancements (additive only)
- ✅ MagicUI component additions (progressive enhancement)

### Medium Risk
- ⚠️ Database migrations (requires careful testing)
- ⚠️ Component refactoring (may affect existing functionality)

### High Risk
- ❌ None identified

### Mitigation Strategies
1. **Database Migrations**: Test on staging first, backup production
2. **Component Updates**: Incremental rollout, feature flags
3. **Real-Time Updates**: Monitor performance, add error boundaries

---

## Success Criteria

### Phase 1 (Database)
- ✅ All `draft_pool` rows have `status` set (no NULLs)
- ✅ New inserts default to `'available'`
- ✅ `is_available` column can be safely dropped after verification

### Phase 2 (TypeScript)
- ✅ No TypeScript errors
- ✅ `status` field properly typed throughout
- ✅ IDE autocomplete works for `status` field

### Phase 3 (Components)
- ✅ BudgetDisplay component functional
- ✅ PickConfirmation modal functional
- ✅ Components integrated into draft board

### Phase 4 (Enhancements)
- ✅ Confetti triggers on successful picks
- ✅ Budget numbers animate smoothly
- ✅ Pick history animates new items
- ✅ Active turn highlighted

### Phase 5 (Optimization)
- ✅ Real-time updates performant
- ✅ No memory leaks
- ✅ Proper cleanup on unmount

---

## Timeline Estimate

### Phase 1: Database Migration (2-3 hours)
- Create migrations: 1 hour
- Test migrations: 1 hour
- Deploy and verify: 30 minutes

### Phase 2: TypeScript Updates (30 minutes)
- Update interface: 15 minutes
- Verify compilation: 15 minutes

### Phase 3: Missing Components (4-6 hours)
- BudgetDisplay: 2 hours
- PickConfirmation: 2 hours
- Integration: 1-2 hours

### Phase 4: UI Enhancements (3-4 hours)
- Confetti: 1 hour
- Animated list: 1 hour
- Number ticker: 1 hour
- Border beam/sparkles: 1 hour

### Phase 5: Optimization (1-2 hours)
- Review and optimize: 1-2 hours

**Total Estimate**: 10-15 hours

---

## Dependencies

### External
- ✅ Shadcn UI components (already installed)
- ✅ MagicUI components (already installed)
- ✅ Supabase client (already configured)

### Internal
- ✅ `lib/draft-system.ts` (already updated)
- ✅ API routes (already updated)
- ✅ Existing draft components (already functional)

---

## Next Steps

1. **Immediate** (Today):
   - Review and approve this plan
   - Create database migrations (Phase 1)
   - Update TypeScript interfaces (Phase 2)

2. **Short Term** (This Week):
   - Create BudgetDisplay component (Phase 3.1)
   - Create PickConfirmation modal (Phase 3.2)
   - Integrate components into draft board

3. **Medium Term** (Next Week):
   - Add UI enhancements (Phase 4)
   - Optimize real-time updates (Phase 5)
   - Test thoroughly

4. **Future** (After Verification):
   - Drop `is_available` column migration
   - Monitor performance
   - Gather user feedback

---

## References

- **DRAFTBOARD-COMPREHENSIVE-BREAKDOWN.md** - Complete specification
- **lib/draft-system.ts** - Core draft logic
- **components/draft/** - Existing components
- **Shadcn UI Docs** - Component library
- **MagicUI Docs** - Animation components
- **Supabase Docs** - Database and real-time

---

**Last Updated**: January 19, 2026  
**Status**: Ready for Implementation  
**Approved By**: [Pending]
