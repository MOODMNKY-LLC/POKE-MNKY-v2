# Draft Room - Complete Implementation Roadmap

> **Status**: ✅ Analysis Complete - Ready for Programmatic Implementation
> **Source**: SIM-MATT-DRAFT-CHAT.md Analysis + MagicUI/Shadcn Integration

---

## 📊 Executive Summary

After analyzing SIM-MATT-DRAFT-CHAT.md and the codebase, the implementation plan incorporates:

1. **Canonical Draft Log** concept from the document
2. **Point Tier Organization** (20pts → 12pts) matching Google Sheets structure
3. **Ownership History** tracking for all changes
4. **MagicUI Components** for engaging UI
5. **Shadcn Components** for structure and functionality
6. **Real-time Integration** with Supabase Realtime

---

## 🎯 Implementation Phases

### Phase 1: Foundation Setup (Day 1)

#### 1.1 Install MagicUI Components
```bash
npx shadcn@latest add "https://magicui.design/r/bento-grid.json"
npx shadcn@latest add "https://magicui.design/r/magic-card.json"
npx shadcn@latest add "https://magicui.design/r/shimmer-button.json"
npx shadcn@latest add "https://magicui.design/r/animated-list.json"
npx shadcn@latest add "https://magicui.design/r/number-ticker.json"
npx shadcn@latest add "https://magicui.design/r/sparkles-text.json"
npx shadcn@latest add "https://magicui.design/r/animated-gradient-text.json"
npx shadcn@latest add "https://magicui.design/r/blur-fade.json"
```

#### 1.2 Database Migration
**File**: `supabase/migrations/20260116000002_enhance_draft_tracking.sql`

```sql
-- Add source tracking to team_rosters
ALTER TABLE public.team_rosters 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'draft' 
CHECK (source IN ('draft', 'free_agency', 'trade'));

-- Create ownership history view
CREATE OR REPLACE VIEW public.ownership_history AS
SELECT 
  pokemon_id,
  team_id,
  'draft' as source,
  draft_round,
  draft_order,
  created_at as acquired_at
FROM team_rosters
WHERE draft_round IS NOT NULL
UNION ALL
SELECT 
  added_pokemon_id as pokemon_id,
  team_id,
  'free_agency' as source,
  NULL as draft_round,
  NULL as draft_order,
  created_at as acquired_at
FROM free_agency_transactions
WHERE added_pokemon_id IS NOT NULL AND status = 'processed';

-- Create helper function for Pokemon by tier
CREATE OR REPLACE FUNCTION get_pokemon_by_tier(tier_points INTEGER)
RETURNS TABLE (
  pokemon_name TEXT,
  point_value INTEGER,
  generation INTEGER,
  pokemon_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dp.pokemon_name,
    dp.point_value,
    dp.generation,
    pc.pokemon_id
  FROM draft_pool dp
  LEFT JOIN pokemon_cache pc ON LOWER(pc.name) = LOWER(dp.pokemon_name)
  WHERE dp.point_value = tier_points
    AND dp.is_available = true
  ORDER BY dp.pokemon_name;
END;
$$ LANGUAGE plpgsql;

-- Create broadcast triggers
CREATE OR REPLACE FUNCTION broadcast_draft_pick()
RETURNS TRIGGER AS $$
DECLARE
  session_id_val UUID;
BEGIN
  SELECT ds.id INTO session_id_val
  FROM draft_sessions ds
  JOIN teams t ON t.season_id = ds.season_id
  WHERE t.id = NEW.team_id
    AND ds.status = 'active'
  LIMIT 1;
  
  IF session_id_val IS NOT NULL THEN
    PERFORM realtime.broadcast_changes(
      'draft:' || session_id_val::text || ':picks',
      'INSERT',
      'team_rosters',
      'public',
      NEW,
      NULL
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER draft_pick_broadcast
  AFTER INSERT ON team_rosters
  FOR EACH ROW
  WHEN (NEW.draft_round IS NOT NULL)
  EXECUTE FUNCTION broadcast_draft_pick();

CREATE OR REPLACE FUNCTION broadcast_draft_turn()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.current_team_id IS DISTINCT FROM NEW.current_team_id THEN
    PERFORM realtime.broadcast_changes(
      'draft:' || NEW.id::text || ':turn',
      'UPDATE',
      'draft_sessions',
      'public',
      NEW,
      OLD
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER draft_turn_broadcast
  AFTER UPDATE ON draft_sessions
  FOR EACH ROW
  EXECUTE FUNCTION broadcast_draft_turn();
```

---

### Phase 2: Draft Room Page (Day 2)

**File**: `app/draft/page.tsx`

**Implementation Steps**:
1. Create page structure
2. Fetch active session
3. Set up real-time subscriptions
4. Layout components
5. Error handling

**MagicUI Usage**:
- `AnimatedGradientText` - Page title
- `NumberTicker` - Round/pick counters
- `SparklesText` - Current team name

---

### Phase 3: Draft Board Components (Day 3-4)

**Components to Build**:
1. `DraftBoard` - Main board component
2. `PointTierSection` - Individual tier
3. `DraftPokemonCard` - Pokemon card

**MagicUI Usage**:
- `BentoGrid` - Tier sections layout
- `MagicCard` - Pokemon cards
- `ShimmerButton` - Selection buttons
- `BlurFade` - Drafted state

---

### Phase 4: Supporting Components (Day 5)

**Components to Build**:
1. `TeamRosterPanel` - Team display
2. `TurnIndicator` - Turn tracking
3. `PickHistory` - Recent picks
4. `DraftHeader` - Header component

**MagicUI Usage**:
- `NumberTicker` - Budget display
- `AnimatedList` - Roster and pick history
- `SparklesText` - Team names
- `AnimatedGradientText` - Headers

---

### Phase 5: Real-time Integration (Day 6)

**Tasks**:
1. Set up Supabase Realtime subscriptions
2. Implement broadcast handlers
3. Add presence tracking
4. Integrate RealtimeChat component

---

### Phase 6: Free Agency UI (Day 7-8)

**Components to Build**:
1. `/app/free-agency/page.tsx`
2. `FreeAgencyPanel`
3. `TransactionForm`
4. `TransactionHistory`

---

## 🎨 Component Code Generation

### Using MagicUI MCP

The MagicUI MCP provides component code directly. Use:
- `getComponents()` - Get component implementations
- `getTextAnimations()` - Get text animation components
- `getButtons()` - Get button components
- `getSpecialEffects()` - Get special effect components

### Component Installation Commands

All MagicUI components can be installed via Shadcn CLI:
```bash
npx shadcn@latest add "https://magicui.design/r/{component-name}.json"
```

---

## 📋 Detailed Implementation Checklist

### Database Setup
- [ ] Run migration: `20260116000002_enhance_draft_tracking.sql`
- [ ] Verify `source` column added to `team_rosters`
- [ ] Verify `ownership_history` view created
- [ ] Verify triggers created and working
- [ ] Test broadcast functions

### Component Installation
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
- [ ] Create `components/draft/draft-room.tsx`
- [ ] Create `components/draft/draft-header.tsx`
- [ ] Create `components/draft/draft-board.tsx`
- [ ] Create `components/draft/point-tier-section.tsx`
- [ ] Create `components/draft/draft-pokemon-card.tsx`
- [ ] Create `components/draft/team-roster-panel.tsx`
- [ ] Create `components/draft/turn-indicator.tsx`
- [ ] Create `components/draft/pick-history.tsx`
- [ ] Create `components/draft/draft-chat.tsx`

### Real-time Integration
- [ ] Set up picks channel subscription
- [ ] Set up turn channel subscription
- [ ] Set up presence channel subscription
- [ ] Implement broadcast handlers
- [ ] Test real-time updates

### API Integration
- [ ] Connect to `/api/draft/status`
- [ ] Connect to `/api/draft/available`
- [ ] Connect to `/api/draft/pick`
- [ ] Connect to `/api/draft/team-status`
- [ ] Add error handling
- [ ] Add loading states

### Testing
- [ ] Test draft pick flow
- [ ] Test real-time updates
- [ ] Test turn tracking
- [ ] Test budget validation
- [ ] Test error handling
- [ ] Test mobile responsiveness

---

## 🚀 Next Steps

1. **Install MagicUI Components** (Use commands above)
2. **Run Database Migration** (Apply SQL migration)
3. **Create Draft Room Page** (Start with basic structure)
4. **Build Draft Board** (Point tier organization)
5. **Add Real-time** (Supabase Realtime subscriptions)
6. **Polish & Test** (Error handling, loading states)

---

**Status**: ✅ Complete Implementation Plan Ready

All specifications complete. Component selections made. Database migrations prepared. Ready for programmatic implementation.
