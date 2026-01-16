# In-App Drafting System - Comprehensive Design

> **Status**: Design Phase - Based on Current Codebase Analysis
> **Goal**: Replace Google Sheets dependency with full in-app drafting experience

---

## 📊 Current State Analysis

### ✅ What Exists (Backend)

#### 1. Draft System Core (`lib/draft-system.ts`)
- **DraftSystem Class**: Complete drafting logic
  - `getActiveSession()` - Get or create active session
  - `createSession()` - Initialize new draft session
  - `makePick()` - Process draft pick with validation
  - `getCurrentTurn()` - Calculate whose turn it is
  - `getAvailablePokemon()` - Query draft pool
  - `getTeamStatus()` - Get team budget and picks

#### 2. API Routes (`app/api/draft/`)
- **`/api/draft/pick`** (POST) - Make a draft pick
- **`/api/draft/status`** (GET) - Get draft session status
- **`/api/draft/available`** (GET) - Get available Pokemon
- **`/api/draft/team-status`** (GET) - Get team's budget and picks

#### 3. Database Schema
- **`draft_sessions`**: Manages active draft sessions
  - Status tracking (pending/active/paused/completed)
  - Turn order (JSONB array)
  - Current pick/round tracking
- **`draft_pool`**: Available Pokemon with point values
  - Point values (12-20)
  - Availability status
  - Generation data
- **`team_rosters`**: Draft picks stored here
  - Links to `teams` and `pokemon`
  - Draft round and order
  - Draft points spent
- **`draft_budgets`**: Budget tracking per team
  - Total points (120)
  - Spent points
  - Remaining points (computed)

#### 4. Discord Bot Integration
- **`/draft <pokemon>`** - Make draft pick
- **`/draft-status`** - View draft progress
- **`/draft-available`** - List available Pokemon
- **`/draft-my-team`** - View team's picks and budget

---

### ❌ What's Missing (Frontend & Enhancements)

#### 1. Frontend UI Components
- **Draft Room Page** (`/app/draft/page.tsx`) - Main draft interface
- **Draft Board Component** - Visual Pokemon selection grid
- **Team Roster Display** - Show current picks
- **Turn Indicator** - Show whose turn it is
- **Pick History** - Show all picks made
- **Timer Component** - Countdown for picks

#### 2. Real-time Updates
- **Supabase Realtime** integration for draft room
- **Live turn notifications** when picks are made
- **Presence tracking** (who's in the draft room)
- **Broadcast updates** for pick confirmations

#### 3. Free Agency System
- **In-app free agency UI** (replacing Google Sheets)
- **Transaction submission** interface
- **Transaction validation** logic
- **Transaction history** tracking
- **Integration** with N8N workflow (optional)

#### 4. Enhanced Features
- **Draft room chat** (using RealtimeChat component)
- **Pick predictions** (AI-powered suggestions)
- **Draft analytics** (team composition analysis)
- **Export functionality** (to Google Sheets for backup)

---

## 🏗️ Architecture Design

### Data Flow: In-App Drafting

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND LAYER                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Draft Room Page (/app/draft/page.tsx)              │   │
│  │  ├─ Draft Board (Pokemon selection grid)            │   │
│  │  ├─ Team Roster Display                              │   │
│  │  ├─ Turn Indicator                                   │   │
│  │  ├─ Pick History                                     │   │
│  │  └─ RealtimeChat (draft room chat)                   │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ HTTPS + WebSocket (Realtime)
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                 APPLICATION LAYER                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  API Routes (/api/draft/*)                           │   │
│  │  ├─ POST /api/draft/pick                             │   │
│  │  ├─ GET /api/draft/status                            │   │
│  │  ├─ GET /api/draft/available                         │   │
│  │  └─ GET /api/draft/team-status                       │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  DraftSystem Class (lib/draft-system.ts)             │   │
│  │  ├─ Session management                                │   │
│  │  ├─ Turn tracking (snake draft logic)                │   │
│  │  ├─ Pick validation                                  │   │
│  │  └─ Budget updates                                   │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ Supabase Client
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    DATABASE LAYER                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Supabase PostgreSQL                                  │   │
│  │  ├─ draft_sessions (session state)                    │   │
│  │  ├─ draft_pool (available Pokemon)                   │   │
│  │  ├─ team_rosters (draft picks)                      │   │
│  │  └─ draft_budgets (point tracking)                   │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Supabase Realtime                                    │   │
│  │  ├─ Broadcast: draft:${sessionId}:picks              │   │
│  │  ├─ Broadcast: draft:${sessionId}:turn                │   │
│  │  └─ Presence: draft:${sessionId}:users                │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎨 Frontend Design

### Draft Room Page (`/app/draft/page.tsx`)

**Layout Structure:**
```
┌─────────────────────────────────────────────────────────────┐
│  Draft Room - Season 5                                      │
│  Round 3, Pick #45 | Current: Team Alpha | Next: Team Beta │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌─────────────────────────────────┐ │
│  │  DRAFT BOARD     │  │  YOUR TEAM                      │ │
│  │  (Pokemon Grid)  │  │  Budget: 75/120pts              │ │
│  │                  │  │  ┌───────────────────────────┐ │ │
│  │  [Filter by]     │  │  │ 1. Flutter Mane (20pts)   │ │ │
│  │  Points: [All ▼] │  │  │ 2. Pikachu (12pts)        │ │ │
│  │  Gen: [All ▼]    │  │  │ 3. Charizard (15pts)      │ │ │
│  │                  │  │  └───────────────────────────┘ │ │
│  │  ┌───┐ ┌───┐ ┌──┐│  │                                │ │
│  │  │20 │ │19 │ │18││  │  PICK HISTORY                  │ │
│  │  └───┘ └───┘ └──┘│  │  ┌───────────────────────────┐ │ │
│  │  ┌───┐ ┌───┐ ┌──┐│  │  │ Pick #44: Team Beta       │ │ │
│  │  │17 │ │16 │ │15││  │  │   → Mewtwo (20pts)        │ │ │
│  │  └───┘ └───┘ └──┘│  │  │ Pick #43: Team Gamma       │ │ │
│  │  ...             │  │  │   → Garchomp (18pts)       │ │ │
│  │                  │  │  └───────────────────────────┘ │ │
│  │  [Click Pokemon] │  │                                │ │
│  │  to Draft        │  │  [Draft Chat]                 │ │
│  └──────────────────┘  └─────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  [Chat Messages] | [Users Online: 12]                      │
└─────────────────────────────────────────────────────────────┘
```

**Key Components:**
1. **DraftBoard** - Pokemon selection grid with filters
2. **TeamRoster** - Current team's picks and budget
3. **PickHistory** - Recent picks made
4. **TurnIndicator** - Shows current turn and countdown
5. **RealtimeChat** - Draft room chat
6. **RealtimeAvatarStack** - Who's online

---

## 🔄 Real-time Implementation

### Supabase Realtime Channels

**Channel Structure:**
- **`draft:${sessionId}:picks`** - Broadcast pick events
- **`draft:${sessionId}:turn`** - Broadcast turn changes
- **`draft:${sessionId}:users`** - Presence tracking

**Database Triggers:**
```sql
-- Trigger for draft pick broadcasts
CREATE TRIGGER draft_pick_broadcast
  AFTER INSERT ON team_rosters
  FOR EACH ROW
  WHEN (NEW.draft_round IS NOT NULL)
  EXECUTE FUNCTION broadcast_draft_pick();

-- Trigger for turn changes
CREATE TRIGGER draft_turn_broadcast
  AFTER UPDATE ON draft_sessions
  FOR EACH ROW
  WHEN (OLD.current_team_id IS DISTINCT FROM NEW.current_team_id)
  EXECUTE FUNCTION broadcast_draft_turn();
```

**Frontend Subscription:**
```typescript
// Subscribe to draft updates
const channel = supabase.channel(`draft:${sessionId}:picks`, {
  config: { private: true }
})

channel
  .on('broadcast', { event: 'pick_made' }, (payload) => {
    // Update UI with new pick
    updateDraftBoard(payload.pick)
  })
  .on('broadcast', { event: 'turn_changed' }, (payload) => {
    // Update turn indicator
    updateTurnIndicator(payload.currentTeam)
  })
  .on('presence', { event: 'sync' }, () => {
    // Update online users
    updateOnlineUsers(channel.presenceState())
  })
  .subscribe()
```

---

## 🆓 Free Agency System Design

### In-App Free Agency Flow

**Transaction Types:**
1. **Replacement**: Drop Pokemon A, Add Pokemon B
2. **Addition**: Add Pokemon (roster < 10)
3. **Drop Only**: Drop Pokemon (roster > 8)

**UI Design:**
```
┌─────────────────────────────────────────────────────────────┐
│  Free Agency - Team Alpha                                   │
├─────────────────────────────────────────────────────────────┤
│  Current Roster (8 Pokemon, 95pts used, 25pts remaining)    │
│  ┌───────────────────────────────────────────────────────┐   │
│  │ 1. Flutter Mane (20pts)  [Drop]                      │   │
│  │ 2. Pikachu (12pts)        [Drop]                      │   │
│  │ ...                                                    │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐   │
│  │ ADD POKEMON                                            │   │
│  │ [Search Pokemon...]                                    │   │
│  │ Available: Slowking (15pts)                            │   │
│  │ [Add Slowking]                                        │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐   │
│  │ DROP POKEMON                                           │   │
│  │ Select Pokemon to drop: [Pikachu ▼]                   │   │
│  │ [Drop Pikachu]                                         │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                               │
│  Transaction Preview:                                        │
│  - Drop: Pikachu (12pts)                                    │
│  - Add: Slowking (15pts)                                    │
│  - New Total: 98pts (22pts remaining) ✅                     │
│                                                               │
│  [Submit Transaction]                                        │
└─────────────────────────────────────────────────────────────┘
```

**API Endpoints:**
- **`POST /api/free-agency/submit`** - Submit transaction
- **`GET /api/free-agency/transactions`** - Get transaction history
- **`GET /api/free-agency/available`** - Get available Pokemon (not on rosters)

**Database Schema:**
```sql
-- Free agency transactions table
CREATE TABLE IF NOT EXISTS public.free_agency_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id),
  season_id UUID NOT NULL REFERENCES seasons(id),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('replacement', 'addition', 'drop_only')),
  added_pokemon_id UUID REFERENCES pokemon(id),
  dropped_pokemon_id UUID REFERENCES pokemon(id),
  added_points INTEGER DEFAULT 0,
  dropped_points INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processed')),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Transaction tracking (count F/A moves)
CREATE TABLE IF NOT EXISTS public.team_transaction_counts (
  team_id UUID NOT NULL REFERENCES teams(id),
  season_id UUID NOT NULL REFERENCES seasons(id),
  transaction_count INTEGER DEFAULT 0,
  last_transaction_at TIMESTAMPTZ,
  PRIMARY KEY (team_id, season_id)
);
```

---

## 🔗 Integration Points

### 1. Supabase Realtime
- **Draft Room**: Real-time pick updates, turn changes
- **Free Agency**: Real-time transaction notifications
- **Presence**: Who's online in draft room

### 2. Discord Bot
- **Enhancements Needed**:
  - `/draft-room` - Link to draft room page
  - `/draft-notify` - Notify when it's your turn
  - `/free-agency-submit` - Submit transactions via Discord
  - Real-time notifications for draft events

### 3. N8N Workflow
- **Current**: Google Sheets free agency automation
- **Future**: Optional webhook integration for notifications
- **Migration Path**: Keep N8N for Google Sheets sync, add in-app as primary

### 4. Google Sheets Sync
- **Keep**: For backup and legacy support
- **Enhance**: Sync FROM Supabase TO Sheets (reverse sync)
- **Use Case**: Export draft results to Sheets for offline access

---

## 📋 Implementation Roadmap

### Phase 1: Draft Room Foundation (Week 1)
- [ ] Create `/app/draft/page.tsx`
- [ ] Build DraftBoard component
- [ ] Build TeamRoster component
- [ ] Build TurnIndicator component
- [ ] Integrate Supabase Realtime for picks
- [ ] Test with one team

### Phase 2: Real-time Enhancements (Week 1-2)
- [ ] Add RealtimeChat component
- [ ] Add RealtimeAvatarStack (presence)
- [ ] Add PickHistory component
- [ ] Implement turn change broadcasts
- [ ] Add pick confirmation notifications

### Phase 3: Free Agency System (Week 2-3)
- [ ] Create `/app/free-agency/page.tsx`
- [ ] Build transaction submission UI
- [ ] Create `/api/free-agency/submit` endpoint
- [ ] Implement transaction validation
- [ ] Add transaction history display
- [ ] Create database tables for tracking

### Phase 4: Discord Bot Integration (Week 3)
- [ ] Enhance `/draft` commands
- [ ] Add `/draft-room` command
- [ ] Add draft turn notifications
- [ ] Add `/free-agency-submit` command
- [ ] Test Discord → App integration

### Phase 5: Polish & Testing (Week 4)
- [ ] Add loading states
- [ ] Add error handling
- [ ] Add transaction limits validation
- [ ] Test end-to-end workflows
- [ ] Performance optimization

---

## 🎯 Key Design Decisions

### 1. Real-time Strategy
**Decision**: Use Supabase Realtime `broadcast` for all draft events
**Rationale**: More scalable than `postgres_changes`, better performance, customizable payloads

### 2. Free Agency Approach
**Decision**: Build in-app system as primary, keep Google Sheets as backup
**Rationale**: Better UX, real-time validation, eliminates manual Sheet updates

### 3. Discord Bot Role
**Decision**: Enhance bot for notifications and quick actions, not full drafting
**Rationale**: App provides better UI, bot provides convenience and notifications

### 4. Google Sheets Sync
**Decision**: Keep sync but reverse direction (Supabase → Sheets)
**Rationale**: Maintains backup and legacy support, but app is source of truth

---

**Status**: Design complete - Ready for implementation
