# Draft Room Implementation - Complete Summary

> **Status**: ✅ Analysis Complete - Ready for Programmatic Implementation
> **Based on**: SIM-MATT-DRAFT-CHAT.md + Codebase Analysis + MagicUI/Shadcn Components

---

## 📊 Key Findings from SIM-MATT-DRAFT-CHAT.md

### Architecture Principles

1. **Canonical Draft Log**: Single source of truth
   - ✅ `team_rosters` table serves this
   - Need: Add `source` field (draft/free_agency/trade)

2. **Point Tier Organization**: Pokemon by cost (20pts → 12pts)
   - ✅ `draft_pool` table has this structure
   - Need: UI organized by tiers

3. **Ownership History**: Track all changes
   - Need: Enhanced tracking view

4. **Visual Draft Status**: Clear drafted vs available
   - Need: UI components with states

5. **Explicit Transaction Logging**: Formal FA log
   - ✅ `free_agency_transactions` table exists

---

## 🎨 Component Selection

### MagicUI Components (To Install)

1. **`bento-grid`** - Point tier grid layout
2. **`magic-card`** - Pokemon cards with spotlight
3. **`shimmer-button`** - Pokemon selection buttons
4. **`animated-list`** - Pick history animations
5. **`number-ticker`** - Budget/countdown displays
6. **`sparkles-text`** - Current team name
7. **`animated-gradient-text`** - Tier headers
8. **`blur-fade`** - Drafted Pokemon indication

### Shadcn Components (Already Installed)

- ✅ `Card`, `Badge`, `Button`, `Input`, `Select`
- ✅ `Table`, `Tabs`, `Dialog`, `Progress`, `Avatar`
- ✅ `Skeleton`, `ScrollArea`

### Existing Components (Reuse)

- ✅ `PokemonSprite` - Pokemon sprite display
- ✅ `PokemonCard` - Can be adapted for draft
- ✅ `RealtimeChat` - Draft room chat
- ✅ `RealtimeAvatarStack` - Online users

---

## 🏗️ Implementation Plan

### Phase 1: Setup & Database (Day 1)

**Tasks**:
1. Install MagicUI components (8 components)
2. Run database migration (add `source` field)
3. Create ownership history view
4. Create database triggers for broadcasts

**Commands**:
```bash
# Install MagicUI components
npx shadcn@latest add "https://magicui.design/r/bento-grid.json"
npx shadcn@latest add "https://magicui.design/r/magic-card.json"
npx shadcn@latest add "https://magicui.design/r/shimmer-button.json"
npx shadcn@latest add "https://magicui.design/r/animated-list.json"
npx shadcn@latest add "https://magicui.design/r/number-ticker.json"
npx shadcn@latest add "https://magicui.design/r/sparkles-text.json"
npx shadcn@latest add "https://magicui.design/r/animated-gradient-text.json"
npx shadcn@latest add "https://magicui.design/r/blur-fade.json"
```

---

### Phase 2: Draft Room Page (Day 2)

**File**: `app/draft/page.tsx`

**Features**:
- Fetch active draft session
- Set up real-time subscriptions
- Layout with draft board (left) and team info (right)
- Error handling and loading states

**Components Used**:
- `animated-gradient-text` - Page title
- `number-ticker` - Round/pick counter
- `sparkles-text` - Current team name

---

### Phase 3: Draft Board Component (Day 3-4)

**File**: `components/draft/draft-board.tsx`

**Features**:
- Fetch Pokemon by tier from API
- Filter by point tier, generation, search
- Display in grid (bento-grid for tiers)
- Handle pick submission
- Real-time updates

**Components Used**:
- `bento-grid` - Tier sections
- `PointTierSection` - Individual tiers
- `DraftPokemonCard` - Pokemon cards

---

### Phase 4: Supporting Components (Day 5-6)

**Components to Build**:
1. `draft-header.tsx` - Turn indicator, stats
2. `point-tier-section.tsx` - One tier display
3. `draft-pokemon-card.tsx` - Individual Pokemon
4. `team-roster-panel.tsx` - Team picks display
5. `turn-indicator.tsx` - Turn tracking
6. `pick-history.tsx` - Recent picks

---

### Phase 5: Real-time Integration (Day 7)

**Tasks**:
1. Set up Supabase Realtime subscriptions
2. Implement broadcast handlers
3. Add presence tracking
4. Integrate RealtimeChat

---

### Phase 6: Free Agency UI (Day 8-9)

**Tasks**:
1. Create `/app/free-agency/page.tsx`
2. Build transaction components
3. Integrate validation
4. Add transaction history

---

## 📋 Component File Structure

```
app/
└── draft/
    └── page.tsx                    # Main draft room page

components/
├── draft/
│   ├── draft-room.tsx             # Container component
│   ├── draft-header.tsx           # Header with turn indicator
│   ├── draft-board.tsx            # Pokemon selection board
│   ├── point-tier-section.tsx     # One point tier
│   ├── draft-pokemon-card.tsx     # Individual Pokemon card
│   ├── team-roster-panel.tsx      # Current team display
│   ├── turn-indicator.tsx         # Turn tracking UI
│   ├── pick-history.tsx           # Recent picks list
│   └── draft-chat.tsx             # Real-time chat wrapper
└── free-agency/
    ├── free-agency-panel.tsx       # Main FA interface
    ├── transaction-form.tsx        # Add/drop form
    ├── transaction-history.tsx     # Transaction log
    └── roster-manager.tsx          # Roster display
```

---

## 🎯 Implementation Checklist

### Database
- [ ] Add `source` column to `team_rosters`
- [ ] Create `ownership_history` view
- [ ] Create database triggers for broadcasts
- [ ] Create helper functions for tier queries

### MagicUI Installation
- [ ] Install bento-grid
- [ ] Install magic-card
- [ ] Install shimmer-button
- [ ] Install animated-list
- [ ] Install number-ticker
- [ ] Install sparkles-text
- [ ] Install animated-gradient-text
- [ ] Install blur-fade

### Core Components
- [ ] Create `/app/draft/page.tsx`
- [ ] Create DraftBoard component
- [ ] Create PointTierSection component
- [ ] Create DraftPokemonCard component
- [ ] Create TeamRosterPanel component
- [ ] Create TurnIndicator component
- [ ] Create PickHistory component

### Real-time
- [ ] Set up Supabase Realtime subscriptions
- [ ] Implement broadcast handlers
- [ ] Add presence tracking
- [ ] Integrate RealtimeChat

### Integration
- [ ] Connect to existing API routes
- [ ] Add error handling
- [ ] Add loading states
- [ ] Test end-to-end flow

---

**Status**: ✅ Ready for Programmatic Implementation

All analysis complete. Component specifications ready. MagicUI components identified. Implementation plan detailed.
