# Draft Room Implementation Plan - Based on SIM-MATT-DRAFT-CHAT Analysis

> **Status**: ✅ Analysis Complete - Ready for Programmatic Implementation
> **Source**: SIM-MATT-DRAFT-CHAT.md + Codebase Analysis

---

## 📊 Key Insights from SIM-MATT-DRAFT-CHAT.md

### Core Architecture Principles

1. **Canonical Draft Log**: Single source of truth for all picks
   - ✅ Our `team_rosters` table serves this purpose
   - Need: Enhanced to track source (Draft vs FA)

2. **Point Tier Organization**: Pokemon organized by cost (20pts, 19pts, etc.)
   - ✅ Our `draft_pool` table has point values
   - Need: UI organized by tiers

3. **Ownership History**: Track all ownership changes, not just FA
   - ⚠️ Our `free_agency_transactions` only tracks FA
   - Need: Enhanced to track all ownership changes

4. **Explicit Transaction Logging**: Formal FA log with audit trail
   - ✅ Our `free_agency_transactions` table addresses this
   - Need: UI to display transaction history

5. **Visual Draft Status**: Clear indication of drafted vs available
   - Need: UI components with visual states

---

## 🏗️ Database Enhancements

### 1. Enhanced Ownership Tracking

**Current**: `team_rosters` tracks picks, `free_agency_transactions` tracks FA moves
**Enhancement**: Add `source` field to `team_rosters` to distinguish Draft vs FA

```sql
-- Migration: Add source tracking to team_rosters
ALTER TABLE public.team_rosters 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'draft' 
CHECK (source IN ('draft', 'free_agency', 'trade'));

-- Create ownership history view
CREATE OR REPLACE VIEW ownership_history AS
SELECT 
  pokemon_id,
  team_id,
  source,
  draft_round,
  draft_order,
  created_at as acquired_at
FROM team_rosters
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
```

### 2. Draft Pool Point Tier Organization

**Current**: `draft_pool` has point values
**Enhancement**: Add index and helper functions for tier queries

```sql
-- Index for point tier queries
CREATE INDEX IF NOT EXISTS idx_draft_pool_point_tier 
ON draft_pool(point_value, is_available) 
WHERE is_available = true;

-- Function to get Pokemon by tier
CREATE OR REPLACE FUNCTION get_pokemon_by_tier(tier_points INTEGER)
RETURNS TABLE (
  pokemon_name TEXT,
  point_value INTEGER,
  generation INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dp.pokemon_name,
    dp.point_value,
    dp.generation
  FROM draft_pool dp
  WHERE dp.point_value = tier_points
    AND dp.is_available = true
  ORDER BY dp.pokemon_name;
END;
$$ LANGUAGE plpgsql;
```

---

## 🎨 Frontend Component Architecture

### Component Hierarchy

```
/app/draft/page.tsx (Draft Room Page)
├── DraftHeader (Turn indicator, round/pick counter)
├── DraftBoard (Point tier grid)
│   ├── PointTierSection (20pts, 19pts, etc.)
│   │   └── PokemonCard (Individual Pokemon)
├── TeamRosterPanel (Current team's picks)
├── PickHistory (Recent picks list)
└── DraftChat (Real-time chat)
```

---

## 🎯 Component Specifications

### 1. Draft Room Page (`/app/draft/page.tsx`)

**Layout**: Split screen with draft board (left) and team info (right)

**MagicUI Components**:
- `animated-gradient-text` - For "Draft Room" header
- `number-ticker` - For round/pick counter
- `sparkles-text` - For current team name
- `bento-grid` - For point tier sections

**Shadcn Components**:
- `Card` - Container for sections
- `Tabs` - Switch between views
- `Badge` - Status indicators
- `Button` - Actions

---

### 2. DraftBoard Component

**Purpose**: Display Pokemon organized by point tiers (20pts → 12pts)

**MagicUI Components**:
- `bento-grid` - Main grid layout for tiers
- `magic-card` - Each Pokemon card with hover effects
- `shimmer-button` - Pokemon selection buttons
- `animated-list` - For pick history within tier

**Shadcn Components**:
- `Card` - Tier containers
- `Badge` - Point value badges
- `Input` - Search/filter
- `Select` - Generation filter

**Features**:
- Filter by point tier (20pts, 19pts, etc.)
- Filter by generation (1-9)
- Search Pokemon by name
- Visual indication of drafted Pokemon (opacity/blur)
- Click to draft (disabled if not your turn)

**Props**:
```typescript
interface DraftBoardProps {
  sessionId: string
  currentTeamId: string
  onPick: (pokemonName: string) => Promise<void>
  filters?: {
    pointTier?: number
    generation?: number
    search?: string
  }
}
```

---

### 3. PointTierSection Component

**Purpose**: Display one point tier (e.g., "20 Points")

**MagicUI Components**:
- `animated-gradient-text` - Tier header
- `magic-card` - Pokemon cards
- `shimmer-button` - Selection buttons

**Shadcn Components**:
- `Card` - Container
- `Badge` - Point value
- `Skeleton` - Loading state

**Layout**:
```
┌─────────────────────────────────┐
│ 20 Points (animated-gradient)   │
├─────────────────────────────────┤
│ [Pokemon] [Pokemon] [Pokemon]   │
│ [Pokemon] [Pokemon] [Pokemon]   │
│ ...                             │
└─────────────────────────────────┘
```

---

### 4. PokemonCard Component (Draft-specific)

**Purpose**: Individual Pokemon card in draft board

**MagicUI Components**:
- `magic-card` - Card with spotlight effect
- `shimmer-button` - Click to draft

**Shadcn Components**:
- `Card` - Base card
- `Badge` - Point value
- `Avatar` - Pokemon sprite

**States**:
- **Available**: Normal, clickable
- **Drafted**: Blurred, disabled
- **Your Turn**: Highlighted border
- **Hover**: Shimmer effect

**Props**:
```typescript
interface DraftPokemonCardProps {
  pokemon: {
    name: string
    pointValue: number
    generation: number
    spriteUrl: string
  }
  isDrafted: boolean
  isYourTurn: boolean
  onPick: () => void
}
```

---

### 5. TeamRosterPanel Component

**Purpose**: Show current team's picks and budget

**MagicUI Components**:
- `number-ticker` - Budget display (spent/remaining)
- `animated-list` - Roster list with animations

**Shadcn Components**:
- `Card` - Container
- `Table` - Roster table
- `Badge` - Point values
- `Progress` - Budget progress bar

**Features**:
- Display current picks
- Show budget (spent/remaining/total)
- Show roster size
- Real-time updates

---

### 6. TurnIndicator Component

**Purpose**: Show whose turn it is and countdown

**MagicUI Components**:
- `sparkles-text` - Current team name
- `animated-gradient-text` - "Your Turn" indicator
- `number-ticker` - Countdown timer

**Shadcn Components**:
- `Card` - Container
- `Badge` - Status badge
- `Progress` - Timer progress

**Features**:
- Current team name (highlighted if yours)
- Next team name
- Countdown timer (45 seconds default)
- Visual pulse when it's your turn

---

### 7. PickHistory Component

**Purpose**: Show recent picks made

**MagicUI Components**:
- `animated-list` - Animated list of picks
- `magic-card` - Pick cards

**Shadcn Components**:
- `Card` - Container
- `Table` - Pick history table
- `Badge` - Round/pick numbers
- `Avatar` - Team logos

**Features**:
- Last 10-20 picks
- Filter by team
- Real-time updates
- Show round and pick number

---

### 8. FreeAgencyPanel Component

**Purpose**: Free agency transaction interface

**MagicUI Components**:
- `animated-list` - Transaction history
- `magic-card` - Transaction cards

**Shadcn Components**:
- `Card` - Container
- `Table` - Transaction table
- `Dialog` - Transaction submission
- `Form` - Transaction form
- `Select` - Pokemon selection

**Features**:
- Current roster display
- Add Pokemon (search/select)
- Drop Pokemon (select from roster)
- Transaction preview
- Real-time validation
- Transaction history

---

## 🔄 Real-time Integration

### Database Triggers

```sql
-- Broadcast draft picks
CREATE OR REPLACE FUNCTION broadcast_draft_pick()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM realtime.broadcast_changes(
    'draft:' || (SELECT session_id FROM draft_sessions WHERE id = NEW.team_id)::text || ':picks',
    'INSERT',
    'team_rosters',
    'public',
    NEW,
    NULL
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER draft_pick_broadcast
  AFTER INSERT ON team_rosters
  FOR EACH ROW
  WHEN (NEW.draft_round IS NOT NULL)
  EXECUTE FUNCTION broadcast_draft_pick();

-- Broadcast turn changes
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

### Frontend Subscriptions

```typescript
// Draft picks channel
const picksChannel = supabase.channel(`draft:${sessionId}:picks`, {
  config: { private: true }
})

picksChannel
  .on('broadcast', { event: 'INSERT' }, (payload) => {
    // Update draft board (mark Pokemon as drafted)
    updateDraftBoard(payload.new)
  })
  .subscribe()

// Turn changes channel
const turnChannel = supabase.channel(`draft:${sessionId}:turn`, {
  config: { private: true }
})

turnChannel
  .on('broadcast', { event: 'UPDATE' }, (payload) => {
    // Update turn indicator
    updateTurnIndicator(payload.new.current_team_id)
  })
  .subscribe()

// Presence channel
const presenceChannel = supabase.channel(`draft:${sessionId}:users`, {
  config: { 
    private: true,
    presence: { key: user.id }
  }
})

presenceChannel
  .on('presence', { event: 'sync' }, () => {
    // Update online users
    updateOnlineUsers(presenceChannel.presenceState())
  })
  .subscribe()
```

---

## 📋 Implementation Steps

### Phase 1: Database Enhancements (Day 1)

1. **Add source tracking to team_rosters**
   ```sql
   ALTER TABLE team_rosters ADD COLUMN source TEXT DEFAULT 'draft';
   ```

2. **Create ownership history view**
   ```sql
   CREATE VIEW ownership_history AS ...
   ```

3. **Create database triggers**
   ```sql
   CREATE TRIGGER draft_pick_broadcast ...
   CREATE TRIGGER draft_turn_broadcast ...
   ```

4. **Add helper functions**
   ```sql
   CREATE FUNCTION get_pokemon_by_tier(...) ...
   ```

---

### Phase 2: Core Draft Room Page (Day 2-3)

1. **Create `/app/draft/page.tsx`**
   - Layout structure
   - Fetch active session
   - Set up real-time subscriptions
   - Error handling

2. **Install MagicUI components**
   ```bash
   npx shadcn@latest add [components]
   ```

3. **Create DraftHeader component**
   - Turn indicator
   - Round/pick counter
   - Timer

---

### Phase 3: Draft Board Component (Day 4-5)

1. **Create DraftBoard component**
   - Point tier organization
   - Filter logic
   - Pokemon grid layout

2. **Create PointTierSection component**
   - Tier header
   - Pokemon grid
   - Drafted state handling

3. **Create DraftPokemonCard component**
   - Pokemon display
   - Click handler
   - State management

4. **Integrate with API**
   - Fetch available Pokemon
   - Handle pick submission
   - Real-time updates

---

### Phase 4: Supporting Components (Day 6-7)

1. **Create TeamRosterPanel**
   - Fetch team status
   - Display picks
   - Budget display

2. **Create TurnIndicator**
   - Current turn display
   - Countdown timer
   - Next team indicator

3. **Create PickHistory**
   - Fetch recent picks
   - Display list
   - Real-time updates

---

### Phase 5: Real-time Integration (Day 8)

1. **Set up Supabase Realtime subscriptions**
   - Pick broadcasts
   - Turn changes
   - Presence tracking

2. **Update UI on events**
   - Draft board updates
   - Turn indicator updates
   - Pick history updates

3. **Add RealtimeChat component**
   - Draft room chat
   - Message history

---

### Phase 6: Free Agency UI (Day 9-10)

1. **Create `/app/free-agency/page.tsx`**
   - Transaction interface
   - Roster display
   - Transaction history

2. **Create FreeAgencyPanel component**
   - Add Pokemon UI
   - Drop Pokemon UI
   - Transaction preview

3. **Integrate validation**
   - Budget checks
   - Roster size checks
   - Transaction limits

---

### Phase 7: Polish & Testing (Day 11-12)

1. **Add loading states**
2. **Add error handling**
3. **Performance optimization**
4. **Mobile responsiveness**
5. **End-to-end testing**

---

## 🎨 MagicUI Component Usage

### Draft Board Layout
```tsx
import { BentoGrid } from "@/components/ui/bento-grid"
import { MagicCard } from "@/components/ui/magic-card"
import { ShimmerButton } from "@/components/ui/shimmer-button"

// Point tier sections in bento grid
<BentoGrid className="grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  {pointTiers.map(tier => (
    <PointTierSection key={tier} points={tier} />
  ))}
</BentoGrid>
```

### Pokemon Cards
```tsx
<MagicCard>
  <ShimmerButton onClick={handlePick}>
    <PokemonSprite url={spriteUrl} />
    <span>{pokemonName}</span>
    <Badge>{pointValue}pts</Badge>
  </ShimmerButton>
</MagicCard>
```

### Turn Indicator
```tsx
import { SparklesText } from "@/components/ui/sparkles-text"
import { NumberTicker } from "@/components/ui/number-ticker"

<SparklesText text={currentTeamName} />
<NumberTicker value={countdownSeconds} />
```

### Pick History
```tsx
import { AnimatedList } from "@/components/ui/animated-list"

<AnimatedList items={recentPicks} />
```

---

## 📊 Component File Structure

```
components/
├── draft/
│   ├── draft-room.tsx              # Main draft room page component
│   ├── draft-board.tsx             # Pokemon selection board
│   ├── point-tier-section.tsx      # One point tier
│   ├── draft-pokemon-card.tsx      # Individual Pokemon card
│   ├── team-roster-panel.tsx       # Team picks display
│   ├── turn-indicator.tsx          # Turn tracking
│   ├── pick-history.tsx            # Recent picks
│   └── draft-header.tsx            # Header with stats
├── free-agency/
│   ├── free-agency-panel.tsx       # Main FA interface
│   ├── transaction-form.tsx        # Add/drop form
│   ├── transaction-history.tsx     # Transaction log
│   └── roster-manager.tsx          # Roster display
└── ui/
    ├── bento-grid.tsx              # MagicUI: Grid layout
    ├── magic-card.tsx              # MagicUI: Card effects
    ├── shimmer-button.tsx          # MagicUI: Button effects
    ├── animated-list.tsx           # MagicUI: List animations
    ├── number-ticker.tsx           # MagicUI: Number animation
    ├── sparkles-text.tsx           # MagicUI: Text effects
    └── animated-gradient-text.tsx  # MagicUI: Gradient text
```

---

## 🔧 MagicUI Component Installation

### Step 1: Install MagicUI Components

```bash
# Install via npx (MagicUI CLI)
npx shadcn@latest add bento-grid
npx shadcn@latest add magic-card
npx shadcn@latest add shimmer-button
npx shadcn@latest add animated-list
npx shadcn@latest add number-ticker
npx shadcn@latest add sparkles-text
npx shadcn@latest add animated-gradient-text
```

### Step 2: Configure Components

MagicUI components will be added to `components/ui/` and can be imported:
```tsx
import { BentoGrid } from "@/components/ui/bento-grid"
import { MagicCard } from "@/components/ui/magic-card"
```

---

## 🎯 Key Design Decisions

### 1. Point Tier Organization
**Decision**: Use `bento-grid` for tier sections, `magic-card` for Pokemon
**Rationale**: Visual organization matches Google Sheets structure, MagicUI provides engaging interactions

### 2. Drafted State Indication
**Decision**: Use `blur-fade` component for drafted Pokemon
**Rationale**: Clear visual feedback without removing from view

### 3. Turn Indicator
**Decision**: Use `sparkles-text` for current team, `number-ticker` for countdown
**Rationale**: Eye-catching for important information, animated numbers for timer

### 4. Pick History
**Decision**: Use `animated-list` for smooth pick animations
**Rationale**: Engaging real-time updates, smooth user experience

### 5. Pokemon Selection
**Decision**: Use `shimmer-button` with `magic-card` hover effects
**Rationale**: Clear call-to-action, engaging interactions

---

## 📋 Implementation Checklist

### Database
- [ ] Add `source` column to `team_rosters`
- [ ] Create `ownership_history` view
- [ ] Create database triggers for broadcasts
- [ ] Create helper functions for tier queries

### Components
- [ ] Install MagicUI components
- [ ] Create DraftRoom page
- [ ] Create DraftBoard component
- [ ] Create PointTierSection component
- [ ] Create DraftPokemonCard component
- [ ] Create TeamRosterPanel component
- [ ] Create TurnIndicator component
- [ ] Create PickHistory component
- [ ] Create FreeAgencyPanel component

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

**Status**: ✅ Plan Complete - Ready for Programmatic Implementation
