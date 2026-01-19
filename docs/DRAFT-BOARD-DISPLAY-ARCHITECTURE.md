# Draft Board Display Architecture

**Date**: January 19, 2026  
**Status**: ✅ **IMPLEMENTED**

---

## 🎯 Overview

This document explains how and where the draft board displays Pokemon from the `draft_pool` table.

---

## 📍 Where It's Displayed

### Routes

1. **Dashboard Route** (Primary):
   - URL: `/dashboard/draft/board`
   - Component: `app/dashboard/draft/board/page.tsx`
   - Wrapper: `components/dashboard/draft-board-section.tsx`
   - Renders: `components/draft/draft-board.tsx`

2. **Legacy Route** (Still Works):
   - URL: `/draft/board`
   - Component: `app/draft/board/page.tsx`
   - Directly renders: `components/draft/draft-board.tsx`

3. **Dashboard Tab**:
   - Main dashboard (`/dashboard`) shows Draft tabs section
   - "Board" tab navigates to `/dashboard/draft/board`
   - Uses: `components/dashboard/draft-tabs-section.tsx`

---

## 🔄 Data Flow

### Step 1: Component Initialization

**File**: `components/draft/draft-board.tsx`

```typescript
// Component receives props:
- sessionId: string        // Active draft session ID
- currentTeamId: string   // User's team ID (or null)
- seasonId: string        // Current season ID
- isYourTurn: boolean      // Whether it's user's turn
```

### Step 2: Fetch Available Pokemon

**API Call**: `GET /api/draft/available?limit=500&season_id=${seasonId}`

**API Route**: `app/api/draft/available/route.ts`

**Backend Logic**: `lib/draft-system.ts` → `getAvailablePokemon()`

```typescript
// Queries draft_pool table:
SELECT 
  pokemon_name,
  point_value,
  pokemon_id,
  status,
  generation  // Fetched separately from pokemon_cache
FROM draft_pool
WHERE season_id = $seasonId
  AND status = 'available'
ORDER BY point_value DESC, pokemon_name ASC
```

**Returns**: Array of Pokemon objects:
```typescript
{
  pokemon_name: string
  point_value: number
  generation: number | null
  pokemon_id: number | null
  status: "available" | "drafted" | "banned" | "unavailable"
}
```

### Step 3: Fetch Drafted Pokemon (for filtering)

**Direct Supabase Query**: `components/draft/draft-board.tsx` (lines 75-79)

```typescript
const { data } = await supabase
  .from("draft_pool")
  .select("pokemon_name")
  .eq("season_id", seasonId)
  .eq("status", "drafted")
```

**Purpose**: Get list of already-drafted Pokemon names to mark them visually

### Step 4: Organize by Point Tiers

**Logic**: `components/draft/draft-board.tsx` (lines 123-130, 280-300)

```typescript
// Organize Pokemon by point_value
const pointTiers = [20, 19, 18, ..., 1] // 20 down to 1

// Filter Pokemon for each tier
pointTiers.map(tier => {
  const tierPokemon = filteredPokemon.filter(p => p.point_value === tier)
  // Render PointTierSection for each tier
})
```

### Step 5: Render Pokemon Cards

**Component Hierarchy**:
```
DraftBoard (Card container)
  └─ PointTierSection (for each tier: 20, 19, 18, ..., 1)
      └─ DraftPokemonCard (for each Pokemon in tier)
          └─ PokemonSprite (visual sprite)
          └─ Pokemon name, point value, status badge
          └─ Action button (if your turn) or "Not Your Turn" badge
```

---

## 🎨 Visual Structure

### Layout

```
┌─────────────────────────────────────────────────────────┐
│ Draft Board Header                                      │
│ ├─ Title: "Draft Board"                                 │
│ ├─ BudgetDisplay (top right)                           │
│ └─ Filters: Search, Tier, Generation                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌───────────────────────────────────────────────────┐ │
│ │ 20 Points (AnimatedGradientText)                  │ │
│ │ 15 Pokemon available                              │ │
│ ├───────────────────────────────────────────────────┤ │
│ │ [Pokemon Card] [Pokemon Card] [Pokemon Card] ... │ │
│ │ [Pokemon Card] [Pokemon Card] [Pokemon Card] ... │ │
│ │ Grid: 2 cols (mobile) → 3 cols (tablet) → 4 cols│ │
│ └───────────────────────────────────────────────────┘ │
│                                                         │
│ ┌───────────────────────────────────────────────────┐ │
│ │ 19 Points                                         │ │
│ │ ...                                               │ │
│ └───────────────────────────────────────────────────┘ │
│                                                         │
│ ... (continues for tiers 18, 17, ..., 1)              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Pokemon Card Structure

```
┌─────────────────┐
│                 │
│  [Pokemon Sprite]│  ← PokemonSprite component (24x24)
│                 │
├─────────────────┤
│  Pokemon Name    │  ← Capitalized name
│  [20pts] Badge  │  ← Point value badge
│  [Drafted] Badge│  ← Status badge (if drafted/banned)
├─────────────────┤
│  [Draft Button] │  ← ShimmerButton (if your turn)
│  OR             │
│  Not Your Turn   │  ← Badge (if not your turn)
└─────────────────┘
```

---

## 🔍 Component Details

### 1. DraftBoard Component

**File**: `components/draft/draft-board.tsx`

**Responsibilities**:
- ✅ Fetches available Pokemon via API
- ✅ Fetches drafted Pokemon list for filtering
- ✅ Organizes Pokemon by point tiers
- ✅ Handles search/filter logic
- ✅ Manages pick confirmation dialog
- ✅ Sets up real-time subscriptions

**Key Features**:
- Search by Pokemon name
- Filter by point tier (1-20)
- Filter by generation (1-9)
- Real-time updates when picks are made
- BorderBeam animation when it's your turn

### 2. PointTierSection Component

**File**: `components/draft/point-tier-section.tsx`

**Responsibilities**:
- ✅ Displays tier header (e.g., "20 Points")
- ✅ Shows count of Pokemon in tier
- ✅ Renders grid of Pokemon cards
- ✅ Passes click handlers to cards

**Layout**:
- Grid: `grid-cols-2 md:grid-cols-3 lg:grid-cols-4`
- Gap: `gap-4`

### 3. DraftPokemonCard Component

**File**: `components/draft/draft-pokemon-card.tsx`

**Responsibilities**:
- ✅ Displays Pokemon sprite (via `PokemonSprite`)
- ✅ Shows Pokemon name and point value
- ✅ Shows status badge (Drafted/Banned/Unavailable)
- ✅ Handles click events (triggers pick confirmation)
- ✅ Visual states:
  - Available + Your Turn: Ring highlight + Draft button
  - Drafted: Opacity 50% + "Drafted" badge + disabled
  - Banned: Opacity 30% + "Banned" badge + disabled
  - Not Your Turn: "Not Your Turn" badge

**Visual States**:
```typescript
// Available + Your Turn
className="ring-2 ring-primary ring-offset-2"
→ Shows ShimmerButton "Draft"

// Drafted
className="opacity-50 pointer-events-none"
→ Shows CheckCircle2 icon + "Drafted" text

// Banned
className="opacity-30 pointer-events-none"
→ Shows "Banned" badge

// Not Your Turn
→ Shows Badge "Not Your Turn"
```

---

## 📊 Data Sources

### Primary: draft_pool Table

**Schema**:
```sql
CREATE TABLE draft_pool (
  id UUID PRIMARY KEY,
  season_id UUID REFERENCES seasons(id),
  pokemon_name TEXT NOT NULL,
  point_value INTEGER NOT NULL,
  pokemon_id INTEGER,
  status draft_pool_status NOT NULL DEFAULT 'available',
  -- Denormalized fields (for performance):
  team_id UUID,              -- Team that drafted this Pokemon
  draft_round INTEGER,        -- Round when drafted
  draft_order INTEGER,        -- Order within round
  draft_points INTEGER        -- Points spent
);
```

**Query Pattern**:
```typescript
// Available Pokemon
SELECT * FROM draft_pool
WHERE season_id = $seasonId
  AND status = 'available'
ORDER BY point_value DESC, pokemon_name ASC

// Drafted Pokemon (for filtering)
SELECT pokemon_name FROM draft_pool
WHERE season_id = $seasonId
  AND status = 'drafted'
```

### Secondary: pokemon_cache Table

**Purpose**: Fetch `generation` field (not stored in `draft_pool`)

**Query**: Done separately in `lib/draft-system.ts` via batch lookup

---

## 🔄 Real-Time Updates

### Subscription Setup

**File**: `components/draft/draft-board.tsx` (lines 102-121)

```typescript
const channel = supabase
  .channel(`draft-pool:${seasonId}`)
  .on(
    "postgres_changes",
    {
      event: "UPDATE",
      schema: "public",
      table: "draft_pool",
      filter: `season_id=eq.${seasonId}`,
    },
    debouncedFetch  // Refetch drafted Pokemon list
  )
  .subscribe()
```

**What Updates**:
- When a Pokemon's `status` changes from `available` → `drafted`
- Component refetches drafted Pokemon list
- UI updates to mark Pokemon as drafted
- No full page refresh needed

---

## 🎯 Display Logic Summary

### Pokemon Organization

1. **Fetch**: Get all available Pokemon from `/api/draft/available`
2. **Filter**: Apply search, tier, generation filters
3. **Group**: Organize by `point_value` (20 → 1)
4. **Render**: Display each tier as a `PointTierSection`
5. **Cards**: Each Pokemon rendered as `DraftPokemonCard`

### Visual Indicators

- **Available Pokemon**: Normal opacity, clickable (if your turn)
- **Drafted Pokemon**: 50% opacity, "Drafted" badge, disabled
- **Banned Pokemon**: 30% opacity, "Banned" badge, disabled
- **Your Turn**: Blue ring highlight around card
- **Not Your Turn**: "Not Your Turn" badge instead of button

---

## 📍 Current Display Locations

### 1. Dashboard Draft Board Tab

**Route**: `/dashboard/draft/board`

**Component Stack**:
```
app/dashboard/draft/board/page.tsx (Server Component)
  └─ components/dashboard/draft-board-section.tsx (Client Component)
      └─ components/draft/draft-header.tsx
      └─ components/draft/draft-board.tsx ← MAIN DISPLAY
      └─ components/draft/team-roster-panel.tsx
      └─ components/draft/pick-history.tsx
      └─ components/ai/draft-assistant-chat.tsx
      └─ components/draft/draft-chat.tsx
```

**Layout**: 2-column grid (Board: 2 cols, Sidebar: 1 col)

### 2. Legacy Draft Board Page

**Route**: `/draft/board`

**Component Stack**:
```
app/draft/board/page.tsx (Client Component)
  └─ components/draft/draft-header.tsx
  └─ components/draft/draft-board.tsx ← MAIN DISPLAY
  └─ components/draft/team-roster-panel.tsx
  └─ components/draft/pick-history.tsx
  └─ components/ai/draft-assistant-chat.tsx
  └─ components/draft/draft-chat.tsx
```

**Layout**: Same 2-column grid

### 3. Dashboard Main Page

**Route**: `/dashboard`

**Component**: `components/dashboard/draft-tabs-section.tsx`

**Tabs**:
- Planning: Shows available Pokemon (read-only)
- Board: Links to `/dashboard/draft/board` (live draft)
- Roster: Shows user's drafted Pokemon

---

## 🔍 Key Files Reference

### Components

- **`components/draft/draft-board.tsx`**: Main Pokemon display component
- **`components/draft/point-tier-section.tsx`**: Tier grouping component
- **`components/draft/draft-pokemon-card.tsx`**: Individual Pokemon card
- **`components/dashboard/draft-board-section.tsx`**: Dashboard wrapper

### API Routes

- **`app/api/draft/available/route.ts`**: Fetches available Pokemon
- **`app/api/draft/pick/route.ts`**: Handles making picks
- **`app/api/draft/status/route.ts`**: Gets active session

### Backend Logic

- **`lib/draft-system.ts`**: Core draft logic (`getAvailablePokemon()`)
- **`lib/supabase/client.ts`**: Client-side Supabase queries

---

## 🎨 Visual Features

### MagicUI Components Used

1. **BorderBeam**: Animated border when it's your turn
2. **MagicCard**: Card container with hover effects
3. **ShimmerButton**: "Draft" button with shimmer effect
4. **AnimatedGradientText**: Tier headers (e.g., "20 Points")
5. **BlurFade**: Entrance animations for Pokemon cards

### Status Badges

- **Available**: No badge (default state)
- **Drafted**: Blue badge with "Drafted" text
- **Banned**: Red badge with "Banned" text
- **Unavailable**: Gray badge

---

## 📝 Summary

**Where**: 
- Primary: `/dashboard/draft/board` (dashboard-integrated)
- Legacy: `/draft/board` (standalone page)

**How**:
1. Component fetches from `/api/draft/available`
2. API queries `draft_pool` table filtered by `season_id` and `status = 'available'`
3. Pokemon organized by `point_value` (20 → 1)
4. Each tier rendered as `PointTierSection`
5. Each Pokemon rendered as `DraftPokemonCard` with sprite, name, points, status
6. Real-time updates via Supabase subscriptions

**Display Structure**:
- Card container with header (title, budget, filters)
- Multiple tier sections (20 points, 19 points, ..., 1 point)
- Grid of Pokemon cards per tier (2-4 columns responsive)
- Visual indicators for status (drafted, banned, available)
- Interactive elements (Draft button when your turn)

---

**Last Updated**: January 19, 2026  
**Status**: ✅ Fully Implemented
