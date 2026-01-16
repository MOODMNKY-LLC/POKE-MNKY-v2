# Draft Room - Programmatic Implementation Guide

> **Status**: ✅ Ready for Implementation
> **Based on**: SIM-MATT-DRAFT-CHAT.md Analysis + MagicUI/Shadcn Components

---

## 📊 Analysis Summary

### Key Insights from SIM-MATT-DRAFT-CHAT.md

1. **Canonical Draft Log Concept**: Single source of truth for all picks
   - ✅ Our `team_rosters` table serves this (needs `source` field enhancement)

2. **Point Tier Organization**: Pokemon organized by cost (20pts → 12pts)
   - ✅ Our `draft_pool` table has this structure
   - Need: UI organized by tiers (like Google Sheets Draft Board)

3. **Ownership History**: Track all ownership changes
   - ⚠️ Need: Enhanced tracking beyond just FA transactions

4. **Visual Draft Status**: Clear drafted vs available indication
   - Need: UI components with visual states

5. **Explicit Transaction Logging**: Formal FA log
   - ✅ Our `free_agency_transactions` table addresses this

---

## 🎨 Component Selection & Installation

### MagicUI Components to Install

```bash
# Install MagicUI components via Shadcn CLI
npx shadcn@latest add "https://magicui.design/r/bento-grid.json"
npx shadcn@latest add "https://magicui.design/r/magic-card.json"
npx shadcn@latest add "https://magicui.design/r/shimmer-button.json"
npx shadcn@latest add "https://magicui.design/r/animated-list.json"
npx shadcn@latest add "https://magicui.design/r/number-ticker.json"
npx shadcn@latest add "https://magicui.design/r/sparkles-text.json"
npx shadcn@latest add "https://magicui.design/r/animated-gradient-text.json"
npx shadcn@latest add "https://magicui.design/r/blur-fade.json"
```

### Shadcn Components (Already Installed)

- ✅ `Card` - Container components
- ✅ `Badge` - Point values, status
- ✅ `Button` - Actions
- ✅ `Input` - Search/filter
- ✅ `Select` - Filters
- ✅ `Table` - Draft results
- ✅ `Tabs` - View switching
- ✅ `Dialog` - Modals
- ✅ `Progress` - Budget bars
- ✅ `Avatar` - Pokemon sprites
- ✅ `Skeleton` - Loading states

---

## 🏗️ Component Architecture

### File Structure

```
components/
├── draft/
│   ├── draft-room.tsx              # Main container
│   ├── draft-header.tsx            # Header with turn indicator
│   ├── draft-board.tsx             # Pokemon selection board
│   ├── point-tier-section.tsx      # One point tier (20pts, 19pts, etc.)
│   ├── draft-pokemon-card.tsx      # Individual Pokemon card
│   ├── team-roster-panel.tsx       # Current team display
│   ├── turn-indicator.tsx          # Turn tracking UI
│   ├── pick-history.tsx            # Recent picks list
│   └── draft-chat.tsx              # Real-time chat wrapper
└── free-agency/
    ├── free-agency-panel.tsx        # Main FA interface
    ├── transaction-form.tsx        # Add/drop form
    ├── transaction-history.tsx     # Transaction log
    └── roster-manager.tsx           # Roster display
```

---

## 📝 Component Specifications

### 1. Draft Room Page (`/app/draft/page.tsx`)

**Layout**:
```tsx
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  {/* Left: Draft Board (2 columns) */}
  <div className="lg:col-span-2">
    <DraftHeader />
    <DraftBoard />
  </div>
  
  {/* Right: Team Info (1 column) */}
  <div className="lg:col-span-1">
    <TeamRosterPanel />
    <PickHistory />
    <DraftChat />
  </div>
</div>
```

**MagicUI Usage**:
- `animated-gradient-text` - "Draft Room" title
- `number-ticker` - Round/pick counter
- `sparkles-text` - Current team name

---

### 2. DraftBoard Component

**Purpose**: Display Pokemon organized by point tiers

**MagicUI Components**:
- `bento-grid` - Main grid for tier sections
- `magic-card` - Each Pokemon card
- `shimmer-button` - Pokemon selection buttons
- `blur-fade` - Drafted Pokemon indication

**Layout**:
```tsx
<div className="space-y-8">
  {pointTiers.map(tier => (
    <PointTierSection 
      key={tier} 
      points={tier}
      pokemon={pokemonByTier[tier]}
      onPick={handlePick}
    />
  ))}
</div>
```

**Features**:
- Filter by point tier (dropdown)
- Filter by generation (dropdown)
- Search Pokemon (input)
- Visual drafted state (blur-fade)
- Click to draft (shimmer-button)

---

### 3. PointTierSection Component

**Purpose**: Display one point tier (e.g., "20 Points")

**MagicUI Components**:
- `animated-gradient-text` - Tier header
- `magic-card` - Pokemon cards
- `shimmer-button` - Selection buttons

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
        <DraftPokemonCard 
          key={p.name}
          pokemon={p}
          isDrafted={draftedPokemon.includes(p.name)}
          isYourTurn={isYourTurn}
          onPick={() => handlePick(p.name)}
        />
      ))}
    </div>
  </CardContent>
</Card>
```

---

### 4. DraftPokemonCard Component

**Purpose**: Individual Pokemon card in draft board

**MagicUI Components**:
- `magic-card` - Card with spotlight effect
- `shimmer-button` - Click to draft

**Shadcn Components**:
- `Card` - Base card
- `Badge` - Point value badge
- `Avatar` - Pokemon sprite

**States**:
- **Available**: Normal, shimmer-button clickable
- **Drafted**: Blur-fade effect, disabled
- **Your Turn**: Magic-card highlight border
- **Hover**: Shimmer effect on button

**Code**:
```tsx
<MagicCard className={cn(
  "relative",
  isDrafted && "opacity-50 blur-sm",
  isYourTurn && "ring-2 ring-primary"
)}>
  <Card className="p-4">
    <Avatar>
      <PokemonSprite name={pokemon.name} />
    </Avatar>
    <h3>{pokemon.name}</h3>
    <Badge>{pokemon.pointValue}pts</Badge>
    {!isDrafted && isYourTurn && (
      <ShimmerButton onClick={onPick}>
        Draft {pokemon.name}
      </ShimmerButton>
    )}
  </Card>
</MagicCard>
```

---

### 5. TeamRosterPanel Component

**Purpose**: Show current team's picks and budget

**MagicUI Components**:
- `number-ticker` - Budget display
- `animated-list` - Roster list

**Shadcn Components**:
- `Card` - Container
- `Table` - Roster table
- `Progress` - Budget progress bar
- `Badge` - Point values

**Layout**:
```tsx
<Card>
  <CardHeader>
    <CardTitle>Your Team</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-4">
      {/* Budget Display */}
      <div>
        <div className="flex justify-between mb-2">
          <span>Budget</span>
          <NumberTicker value={spentPoints} /> / 
          <NumberTicker value={totalPoints} />
        </div>
        <Progress value={(spentPoints / totalPoints) * 100} />
      </div>
      
      {/* Roster List */}
      <AnimatedList items={rosterPicks} />
    </div>
  </CardContent>
</Card>
```

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

**Code**:
```tsx
<Card>
  <CardContent className="p-4">
    <div className="text-center space-y-2">
      <p className="text-sm text-muted-foreground">Current Turn</p>
      {isYourTurn ? (
        <AnimatedGradientText className="text-xl">
          Your Turn!
        </AnimatedGradientText>
      ) : (
        <SparklesText text={currentTeamName} />
      )}
      <NumberTicker value={countdownSeconds} />
      <Progress value={(countdownSeconds / 45) * 100} />
    </div>
  </CardContent>
</Card>
```

---

### 7. PickHistory Component

**Purpose**: Show recent picks made

**MagicUI Components**:
- `animated-list` - Animated list of picks

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

## 🔄 Implementation Workflow

### Step 1: Install MagicUI Components

```bash
# Run installation commands
npx shadcn@latest add "https://magicui.design/r/bento-grid.json"
npx shadcn@latest add "https://magicui.design/r/magic-card.json"
npx shadcn@latest add "https://magicui.design/r/shimmer-button.json"
npx shadcn@latest add "https://magicui.design/r/animated-list.json"
npx shadcn@latest add "https://magicui.design/r/number-ticker.json"
npx shadcn@latest add "https://magicui.design/r/sparkles-text.json"
npx shadcn@latest add "https://magicui.design/r/animated-gradient-text.json"
npx shadcn@latest add "https://magicui.design/r/blur-fade.json"
```

### Step 2: Create Database Migration

```sql
-- Add source tracking
ALTER TABLE team_rosters 
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

-- Create triggers for broadcasts
CREATE OR REPLACE FUNCTION broadcast_draft_pick()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM realtime.broadcast_changes(
    'draft:' || (SELECT id FROM draft_sessions WHERE season_id = (SELECT season_id FROM teams WHERE id = NEW.team_id) AND status = 'active' LIMIT 1)::text || ':picks',
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
```

### Step 3: Create Draft Room Page

**File**: `app/draft/page.tsx`

**Structure**:
```tsx
"use client"

import { useEffect, useState } from "react"
import { DraftHeader } from "@/components/draft/draft-header"
import { DraftBoard } from "@/components/draft/draft-board"
import { TeamRosterPanel } from "@/components/draft/team-roster-panel"
import { PickHistory } from "@/components/draft/pick-history"
import { DraftChat } from "@/components/draft/draft-chat"
import { createClient } from "@/lib/supabase/client"

export default function DraftRoomPage() {
  const [session, setSession] = useState(null)
  const [currentTeam, setCurrentTeam] = useState(null)
  const supabase = createClient()

  useEffect(() => {
    // Fetch active session
    // Set up real-time subscriptions
    // Handle pick events
  }, [])

  return (
    <div className="container mx-auto p-6">
      <DraftHeader session={session} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2">
          <DraftBoard 
            sessionId={session?.id}
            currentTeamId={currentTeam?.id}
            onPick={handlePick}
          />
        </div>
        <div className="lg:col-span-1 space-y-6">
          <TeamRosterPanel teamId={currentTeam?.id} />
          <PickHistory sessionId={session?.id} />
          <DraftChat sessionId={session?.id} />
        </div>
      </div>
    </div>
  )
}
```

### Step 4: Create DraftBoard Component

**File**: `components/draft/draft-board.tsx`

**Features**:
- Fetch Pokemon by tier from API
- Filter by point tier, generation, search
- Display in grid layout
- Handle pick submission
- Real-time updates

**MagicUI Integration**:
- Use `bento-grid` for tier sections
- Use `magic-card` for Pokemon cards
- Use `shimmer-button` for selection
- Use `blur-fade` for drafted state

### Step 5: Create Supporting Components

**Components to Build**:
1. `draft-header.tsx` - Turn indicator, round/pick counter
2. `point-tier-section.tsx` - One tier display
3. `draft-pokemon-card.tsx` - Individual Pokemon card
4. `team-roster-panel.tsx` - Team picks display
5. `turn-indicator.tsx` - Turn tracking
6. `pick-history.tsx` - Recent picks
7. `draft-chat.tsx` - Real-time chat wrapper

---

## 🎯 Implementation Priority

### Phase 1: Core Draft Room (Days 1-3)
1. Install MagicUI components
2. Create database migration
3. Create `/app/draft/page.tsx`
4. Create DraftBoard component
5. Create PointTierSection component
6. Create DraftPokemonCard component
7. Integrate with API routes

### Phase 2: Real-time & Polish (Days 4-5)
1. Create database triggers
2. Set up Supabase Realtime subscriptions
3. Create TurnIndicator component
4. Create PickHistory component
5. Create TeamRosterPanel component
6. Add DraftChat component

### Phase 3: Free Agency UI (Days 6-7)
1. Create `/app/free-agency/page.tsx`
2. Create FreeAgencyPanel component
3. Create TransactionForm component
4. Create TransactionHistory component
5. Integrate validation

---

## 📋 Component Code Templates

### DraftPokemonCard Template

```tsx
"use client"

import { MagicCard } from "@/components/ui/magic-card"
import { ShimmerButton } from "@/components/ui/shimmer-button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar } from "@/components/ui/avatar"
import { PokemonSprite } from "@/components/pokemon-sprite"
import { cn } from "@/lib/utils"
import { BlurFade } from "@/components/ui/blur-fade"

interface DraftPokemonCardProps {
  pokemon: {
    name: string
    pointValue: number
    generation: number
    spriteUrl?: string
  }
  isDrafted: boolean
  isYourTurn: boolean
  onPick: () => void
}

export function DraftPokemonCard({
  pokemon,
  isDrafted,
  isYourTurn,
  onPick
}: DraftPokemonCardProps) {
  return (
    <BlurFade delay={0.1} inView={!isDrafted}>
      <MagicCard className={cn(
        "relative transition-all",
        isDrafted && "opacity-50 pointer-events-none",
        isYourTurn && !isDrafted && "ring-2 ring-primary ring-offset-2"
      )}>
        <Card className="p-4 flex flex-col items-center gap-2">
          <Avatar className="h-16 w-16">
            <PokemonSprite name={pokemon.name} size="md" />
          </Avatar>
          <h3 className="font-semibold capitalize">{pokemon.name}</h3>
          <Badge variant="secondary">{pokemon.pointValue}pts</Badge>
          {!isDrafted && isYourTurn && (
            <ShimmerButton 
              onClick={onPick}
              className="w-full mt-2"
            >
              Draft
            </ShimmerButton>
          )}
          {isDrafted && (
            <Badge variant="outline" className="mt-2">
              Drafted
            </Badge>
          )}
        </Card>
      </MagicCard>
    </BlurFade>
  )
}
```

### PointTierSection Template

```tsx
"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { AnimatedGradientText } from "@/components/ui/animated-gradient-text"
import { DraftPokemonCard } from "./draft-pokemon-card"

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

export function PointTierSection({
  points,
  pokemon,
  draftedPokemon,
  isYourTurn,
  onPick
}: PointTierSectionProps) {
  return (
    <Card>
      <CardHeader>
        <AnimatedGradientText className="text-2xl font-bold">
          {points} Points
        </AnimatedGradientText>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {pokemon.map(p => (
            <DraftPokemonCard
              key={p.name}
              pokemon={p}
              isDrafted={draftedPokemon.includes(p.name)}
              isYourTurn={isYourTurn}
              onPick={() => onPick(p.name)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
```

---

**Status**: ✅ Implementation Plan Complete - Ready to Build

All components specified, MagicUI components identified, code templates provided. Ready for programmatic implementation.
