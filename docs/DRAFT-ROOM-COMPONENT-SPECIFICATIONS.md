# Draft Room Component Specifications

> **Status**: ✅ Ready for Implementation
> **Components**: MagicUI + Shadcn UI

---

## 🎨 Component Specifications

### 1. Draft Room Page (`/app/draft/page.tsx`)

**Layout Structure**:
```
┌─────────────────────────────────────────────────────────────┐
│  Draft Room - Season 5                                      │
│  [AnimatedGradientText]                                     │
├─────────────────────────────────────────────────────────────┤
│  Round 3, Pick #45 | Current: [SparklesText] | Next: Team  │
│  [NumberTicker] [NumberTicker]                             │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────┐  ┌─────────────────────────────┐ │
│  │  DRAFT BOARD         │  │  YOUR TEAM                 │ │
│  │  [Filters]           │  │  Budget: [NumberTicker]    │ │
│  │  [BentoGrid]         │  │  [AnimatedList]            │ │
│  │                      │  │                            │ │
│  │  20 Points           │  │  PICK HISTORY              │ │
│  │  [PointTierSection]  │  │  [AnimatedList]            │ │
│  │                      │  │                            │ │
│  │  19 Points           │  │  DRAFT CHAT                │ │
│  │  [PointTierSection]  │  │  [RealtimeChat]            │ │
│  │                      │  │                            │ │
│  │  ...                 │  │                            │ │
│  └──────────────────────┘  └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**MagicUI Components**:
- `AnimatedGradientText` - "Draft Room" title
- `NumberTicker` - Round and pick counters
- `SparklesText` - Current team name
- `BentoGrid` - Point tier sections
- `AnimatedList` - Pick history and roster

**Shadcn Components**:
- `Card` - Section containers
- `Tabs` - View switching
- `Input` - Search/filter
- `Select` - Filters
- `Badge` - Status indicators

---

### 2. DraftBoard Component

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

**Features**:
- Fetch available Pokemon from `/api/draft/available`
- Organize by point tiers (20pts → 12pts)
- Filter by tier, generation, search
- Real-time updates when picks are made
- Visual drafted state indication

**MagicUI Usage**:
```tsx
<BentoGrid className="grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {pointTiers.map(tier => (
    <PointTierSection 
      key={tier}
      points={tier}
      pokemon={pokemonByTier[tier]}
      draftedPokemon={draftedList}
      isYourTurn={isYourTurn}
      onPick={handlePick}
    />
  ))}
</BentoGrid>
```

---

### 3. PointTierSection Component

**Props**:
```typescript
interface PointTierSectionProps {
  points: number
  pokemon: Array<{
    name: string
    pointValue: number
    generation: number
  }>
  draftedPokemon: string[]
  isYourTurn: boolean
  onPick: (pokemonName: string) => void
}
```

**MagicUI Components**:
- `AnimatedGradientText` - Tier header ("20 Points")
- `MagicCard` - Pokemon cards
- `ShimmerButton` - Selection buttons
- `BlurFade` - Drafted Pokemon animation

**Layout**:
```tsx
<Card>
  <CardHeader>
    <AnimatedGradientText className="text-2xl font-bold">
      {points} Points
    </AnimatedGradientText>
  </CardHeader>
  <CardContent>
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {pokemon.map(p => (
        <DraftPokemonCard {...p} />
      ))}
    </div>
  </CardContent>
</Card>
```

---

### 4. DraftPokemonCard Component

**Props**:
```typescript
interface DraftPokemonCardProps {
  pokemon: {
    name: string
    pointValue: number
    generation: number
  }
  isDrafted: boolean
  isYourTurn: boolean
  onPick: () => void
}
```

**MagicUI Components**:
- `MagicCard` - Card with spotlight effect
- `ShimmerButton` - Click to draft
- `BlurFade` - Drafted state animation

**States**:
- **Available + Your Turn**: Normal, shimmer-button visible, magic-card highlight
- **Available + Not Your Turn**: Normal, button disabled
- **Drafted**: Blur-fade effect, opacity reduced, disabled

**Code Structure**:
```tsx
<BlurFade delay={0.1} inView={!isDrafted}>
  <MagicCard className={cn(
    isDrafted && "opacity-50",
    isYourTurn && !isDrafted && "ring-2 ring-primary"
  )}>
    <Card>
      <PokemonSprite name={pokemon.name} />
      <h3>{pokemon.name}</h3>
      <Badge>{pokemon.pointValue}pts</Badge>
      {!isDrafted && isYourTurn && (
        <ShimmerButton onClick={onPick}>
          Draft
        </ShimmerButton>
      )}
    </Card>
  </MagicCard>
</BlurFade>
```

---

### 5. TeamRosterPanel Component

**Props**:
```typescript
interface TeamRosterPanelProps {
  teamId: string
  seasonId: string
}
```

**MagicUI Components**:
- `NumberTicker` - Budget display (spent/remaining)
- `AnimatedList` - Roster list with animations

**Shadcn Components**:
- `Card` - Container
- `Progress` - Budget progress bar
- `Table` - Roster table
- `Badge` - Point values

**Layout**:
```tsx
<Card>
  <CardHeader>
    <CardTitle>Your Team</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-4">
      {/* Budget */}
      <div>
        <div className="flex justify-between mb-2">
          <span>Budget</span>
          <span>
            <NumberTicker value={spentPoints} /> / 
            <NumberTicker value={totalPoints} />
          </span>
        </div>
        <Progress value={(spentPoints / totalPoints) * 100} />
      </div>
      
      {/* Roster */}
      <AnimatedList items={rosterPicks} />
    </div>
  </CardContent>
</Card>
```

---

### 6. TurnIndicator Component

**Props**:
```typescript
interface TurnIndicatorProps {
  sessionId: string
  currentTeamId: string
  nextTeamId: string
  countdownSeconds: number
  isYourTurn: boolean
}
```

**MagicUI Components**:
- `SparklesText` - Current team name
- `AnimatedGradientText` - "Your Turn!" indicator
- `NumberTicker` - Countdown timer

**Shadcn Components**:
- `Card` - Container
- `Badge` - Status badge
- `Progress` - Timer progress bar

**Code**:
```tsx
<Card>
  <CardContent className="p-4 text-center space-y-2">
    <p className="text-sm text-muted-foreground">Current Turn</p>
    {isYourTurn ? (
      <AnimatedGradientText className="text-xl font-bold">
        Your Turn!
      </AnimatedGradientText>
    ) : (
      <SparklesText text={currentTeamName} />
    )}
    <NumberTicker value={countdownSeconds} />
    <Progress value={(countdownSeconds / 45) * 100} />
    <p className="text-xs text-muted-foreground">
      Next: {nextTeamName}
    </p>
  </CardContent>
</Card>
```

---

### 7. PickHistory Component

**Props**:
```typescript
interface PickHistoryProps {
  sessionId: string
  limit?: number
}
```

**MagicUI Components**:
- `AnimatedList` - Animated list of picks

**Shadcn Components**:
- `Card` - Container
- `Table` - Pick history table
- `Badge` - Round/pick numbers
- `Avatar` - Team logos

**Code**:
```tsx
<Card>
  <CardHeader>
    <CardTitle>Recent Picks</CardTitle>
  </CardHeader>
  <CardContent>
    <AnimatedList 
      items={recentPicks}
      className="space-y-2"
    />
  </CardContent>
</Card>
```

---

## 🔄 Real-time Integration

### Database Triggers

```sql
-- Broadcast draft picks
CREATE OR REPLACE FUNCTION broadcast_draft_pick()
RETURNS TRIGGER AS $$
DECLARE
  session_id_val UUID;
BEGIN
  -- Get active session for team's season
  SELECT id INTO session_id_val
  FROM draft_sessions
  WHERE season_id = (
    SELECT season_id FROM teams WHERE id = NEW.team_id
  )
  AND status = 'active'
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
// In draft-room.tsx
useEffect(() => {
  if (!sessionId) return

  // Picks channel
  const picksChannel = supabase.channel(`draft:${sessionId}:picks`, {
    config: { private: true }
  })

  picksChannel
    .on('broadcast', { event: 'INSERT' }, (payload) => {
      // Update draft board
      setDraftedPokemon(prev => [...prev, payload.new.pokemon_name])
      // Refresh available Pokemon
      refetchAvailablePokemon()
    })
    .subscribe()

  // Turn channel
  const turnChannel = supabase.channel(`draft:${sessionId}:turn`, {
    config: { private: true }
  })

  turnChannel
    .on('broadcast', { event: 'UPDATE' }, (payload) => {
      // Update turn indicator
      setCurrentTeamId(payload.new.current_team_id)
      // Reset countdown
      setCountdownSeconds(45)
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
      const state = presenceChannel.presenceState()
      setOnlineUsers(Object.keys(state))
    })
    .subscribe()

  return () => {
    picksChannel.unsubscribe()
    turnChannel.unsubscribe()
    presenceChannel.unsubscribe()
  }
}, [sessionId, user])
```

---

## 📋 Implementation Order

### Step 1: Install Components
```bash
# Install all MagicUI components
npx shadcn@latest add "https://magicui.design/r/bento-grid.json"
npx shadcn@latest add "https://magicui.design/r/magic-card.json"
npx shadcn@latest add "https://magicui.design/r/shimmer-button.json"
npx shadcn@latest add "https://magicui.design/r/animated-list.json"
npx shadcn@latest add "https://magicui.design/r/number-ticker.json"
npx shadcn@latest add "https://magicui.design/r/sparkles-text.json"
npx shadcn@latest add "https://magicui.design/r/animated-gradient-text.json"
npx shadcn@latest add "https://magicui.design/r/blur-fade.json"
```

### Step 2: Database Migration
```sql
-- Run migration: add source tracking
ALTER TABLE team_rosters ADD COLUMN source TEXT DEFAULT 'draft';
-- Create triggers
-- Create views
```

### Step 3: Create Components
1. DraftRoom page
2. DraftBoard
3. PointTierSection
4. DraftPokemonCard
5. TeamRosterPanel
6. TurnIndicator
7. PickHistory

### Step 4: Real-time Integration
1. Set up subscriptions
2. Handle broadcasts
3. Update UI on events

---

**Status**: ✅ Specifications Complete - Ready to Build
