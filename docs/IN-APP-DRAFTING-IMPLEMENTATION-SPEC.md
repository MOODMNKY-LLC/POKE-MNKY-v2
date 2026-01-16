# In-App Drafting System - Implementation Specification

> **Status**: Ready for Implementation
> **Based on**: Comprehensive codebase analysis + external research

---

## 🎯 Executive Summary

**Current State**: Backend is 80% complete, frontend is 0% complete
**Goal**: Build complete in-app drafting experience to replace Google Sheets
**Timeline**: 4 weeks phased implementation
**Key Technologies**: Next.js 16, Supabase Realtime, Shadcn UI, TypeScript

---

## 📊 Current Architecture Assessment

### ✅ Backend Capabilities (Complete)

#### DraftSystem Class (`lib/draft-system.ts`)
**Status**: ✅ Fully implemented
**Capabilities**:
- Session management (create, get active)
- Snake draft turn tracking
- Pick validation (budget, availability)
- Budget updates
- Pokemon availability management

**Methods Available**:
```typescript
- getActiveSession(seasonId): Promise<DraftSession | null>
- createSession(seasonId, teamIds, config?): Promise<DraftSession>
- getCurrentTurn(sessionId): Promise<{teamId, pickNumber, round, isSnakeRound}>
- makePick(sessionId, teamId, pokemonName): Promise<{success, error?, pick?}>
- getAvailablePokemon(filters?): Promise<Array<{pokemon_name, point_value, generation}>>
- getTeamStatus(teamId, seasonId): Promise<{budget, picks}>
```

#### API Routes (`app/api/draft/`)
**Status**: ✅ Fully implemented
**Endpoints**:
- `POST /api/draft/pick` - Make draft pick
- `GET /api/draft/status` - Get session status
- `GET /api/draft/available` - Get available Pokemon
- `GET /api/draft/team-status` - Get team budget/picks

#### Database Schema
**Status**: ✅ Complete
**Tables**:
- `draft_sessions` - Session state management
- `draft_pool` - Available Pokemon with points
- `team_rosters` - Draft picks storage
- `draft_budgets` - Point budget tracking

---

### ❌ Frontend Gaps (To Build)

#### Missing Components
1. **Draft Room Page** - Main interface (`/app/draft/page.tsx`)
2. **DraftBoard Component** - Pokemon selection grid
3. **TeamRoster Component** - Current picks display
4. **TurnIndicator Component** - Turn tracking UI
5. **PickHistory Component** - Recent picks list
6. **Free Agency UI** - Transaction interface

#### Missing Real-time Integration
1. **Supabase Realtime** - Not connected to draft system
2. **Broadcast Channels** - Not implemented
3. **Database Triggers** - Not created
4. **Presence Tracking** - Not implemented

---

## 🏗️ Technical Architecture

### Real-time Implementation Strategy

**Channel Structure:**
```
draft:${sessionId}:picks      - Pick events (broadcast)
draft:${sessionId}:turn       - Turn changes (broadcast)
draft:${sessionId}:users     - Presence tracking
```

**Database Triggers:**
```sql
-- Broadcast when pick is made
CREATE TRIGGER draft_pick_broadcast
  AFTER INSERT ON team_rosters
  FOR EACH ROW
  WHEN (NEW.draft_round IS NOT NULL)
  EXECUTE FUNCTION broadcast_draft_pick();

-- Broadcast when turn changes
CREATE TRIGGER draft_turn_broadcast
  AFTER UPDATE ON draft_sessions
  FOR EACH ROW
  WHEN (OLD.current_team_id IS DISTINCT FROM NEW.current_team_id)
  EXECUTE FUNCTION broadcast_draft_turn();
```

**Frontend Pattern:**
```typescript
// Use existing RealtimeChat, RealtimeAvatarStack components
// Subscribe to draft channels
// Update UI on broadcast events
```

---

## 🎨 Component Specifications

### 1. Draft Room Page (`/app/draft/page.tsx`)

**Features**:
- Real-time draft board
- Team roster display
- Turn indicator with timer
- Pick history
- Draft room chat
- Online users presence

**Layout**:
```
┌─────────────────────────────────────────────────────┐
│ Header: Draft Room - Season 5 | Round 3, Pick #45  │
├─────────────────────────────────────────────────────┤
│ ┌──────────────┐ ┌──────────────────────────────┐ │
│ │ DRAFT BOARD  │ │ YOUR TEAM                    │ │
│ │ [Filters]    │ │ Budget: 75/120pts            │ │
│ │ [Grid]       │ │ [Roster List]                │ │
│ └──────────────┘ └──────────────────────────────┘ │
│ ┌────────────────────────────────────────────────┐ │
│ │ PICK HISTORY                                  │ │
│ │ [Recent Picks List]                           │ │
│ └────────────────────────────────────────────────┘ │
│ ┌────────────────────────────────────────────────┐ │
│ │ CHAT | Online: 12 users                       │ │
│ └────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### 2. DraftBoard Component

**Props**:
```typescript
interface DraftBoardProps {
  sessionId: string
  currentTeamId: string
  onPick: (pokemonName: string) => Promise<void>
}
```

**Features**:
- Filter by point value (12-20)
- Filter by generation (1-9)
- Search Pokemon by name
- Grid layout with Pokemon cards
- Click to draft (disabled if not your turn)
- Real-time availability updates

### 3. TeamRoster Component

**Props**:
```typescript
interface TeamRosterProps {
  teamId: string
  seasonId: string
}
```

**Features**:
- Display current picks
- Show budget (spent/remaining)
- Show roster size
- Real-time updates when picks made

### 4. TurnIndicator Component

**Props**:
```typescript
interface TurnIndicatorProps {
  sessionId: string
}
```

**Features**:
- Show current team's turn
- Show next team
- Countdown timer (45 seconds default)
- Visual indicator (highlight current team)

### 5. PickHistory Component

**Props**:
```typescript
interface PickHistoryProps {
  sessionId: string
  limit?: number
}
```

**Features**:
- Show recent picks (last 10-20)
- Real-time updates
- Filter by team
- Show round and pick number

---

## 🆓 Free Agency System Specification

### Database Schema Additions

```sql
-- Free agency transactions
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

-- Transaction count tracking
CREATE TABLE IF NOT EXISTS public.team_transaction_counts (
  team_id UUID NOT NULL REFERENCES teams(id),
  season_id UUID NOT NULL REFERENCES seasons(id),
  transaction_count INTEGER DEFAULT 0,
  last_transaction_at TIMESTAMPTZ,
  PRIMARY KEY (team_id, season_id)
);
```

### API Endpoints

**`POST /api/free-agency/submit`**
```typescript
Request: {
  team_id: string
  season_id: string
  transaction_type: 'replacement' | 'addition' | 'drop_only'
  added_pokemon_name?: string
  dropped_pokemon_name?: string
}

Response: {
  success: boolean
  transaction?: FreeAgencyTransaction
  error?: string
  validation?: {
    isValid: boolean
    errors: string[]
    newRosterSize: number
    newPointTotal: number
  }
}
```

**`GET /api/free-agency/transactions`**
```typescript
Query: {
  team_id?: string
  season_id?: string
  status?: 'pending' | 'approved' | 'processed'
  limit?: number
}

Response: {
  transactions: FreeAgencyTransaction[]
  total: number
}
```

**`GET /api/free-agency/available`**
```typescript
Query: {
  season_id: string
  search?: string
}

Response: {
  pokemon: Array<{
    pokemon_id: string
    name: string
    point_value: number
    generation: number
  }>
}
```

### Validation Logic

**Budget Check**:
- Current total - dropped points + added points ≤ 120

**Roster Size Check**:
- After transaction: 8 ≤ roster size ≤ 10

**Transaction Limit Check**:
- Count transactions for team/season
- Must be ≤ 10 through Week 8

**Timing Check**:
- Process on Monday 12AM EST (or allow pending)

---

## 🔗 Integration Points

### 1. Supabase Realtime

**Implementation**:
- Use `broadcast` for pick events
- Use `presence` for online users
- Create database triggers for automatic broadcasts
- Use private channels with RLS

**Channels**:
```typescript
// Draft picks channel
const picksChannel = supabase.channel(`draft:${sessionId}:picks`, {
  config: { private: true }
})

// Turn changes channel
const turnChannel = supabase.channel(`draft:${sessionId}:turn`, {
  config: { private: true }
})

// Presence channel
const presenceChannel = supabase.channel(`draft:${sessionId}:users`, {
  config: { 
    private: true,
    presence: { key: 'user-id' }
  }
})
```

### 2. Discord Bot Enhancements

**New Commands**:
- `/draft-room` - Get link to draft room page
- `/draft-notify` - Enable/disable turn notifications
- `/free-agency-submit` - Submit transaction via Discord
- `/free-agency-status` - Check transaction status

**Enhancements**:
- Real-time notifications when it's your turn
- Pick confirmations in Discord
- Transaction approval notifications

### 3. N8N Workflow Integration

**Current**: Google Sheets free agency automation
**Future**: Optional webhook integration
- Webhook: `POST /api/webhooks/n8n/free-agency`
- Trigger: When transaction processed
- Payload: Transaction details

**Migration Path**:
1. Build in-app free agency (primary)
2. Keep N8N for Google Sheets sync (backup)
3. Add webhook for N8N notifications (optional)

### 4. Google Sheets Sync (Reverse)

**Current**: Sheets → Supabase
**Future**: Supabase → Sheets (export)

**Use Case**: Backup and offline access
**Implementation**:
- Export draft results to Sheets
- Export free agency transactions
- Maintain Master Data Sheet structure

---

## 📋 Implementation Phases

### Phase 1: Draft Room Foundation (Week 1)

**Tasks**:
1. Create `/app/draft/page.tsx`
2. Build DraftBoard component
3. Build TeamRoster component
4. Build TurnIndicator component
5. Integrate with existing API routes
6. Test basic drafting flow

**Deliverables**:
- Functional draft room page
- Pokemon selection working
- Turn tracking working
- Basic UI complete

---

### Phase 2: Real-time Integration (Week 1-2)

**Tasks**:
1. Create database triggers for broadcasts
2. Implement Supabase Realtime subscriptions
3. Add RealtimeChat component
4. Add RealtimeAvatarStack (presence)
5. Build PickHistory component
6. Test real-time updates

**Deliverables**:
- Real-time pick updates
- Live turn changes
- Presence tracking
- Draft room chat

---

### Phase 3: Free Agency System (Week 2-3)

**Tasks**:
1. Create database tables
2. Build `/app/free-agency/page.tsx`
3. Create API endpoints
4. Implement validation logic
5. Build transaction UI
6. Add transaction history

**Deliverables**:
- Complete free agency system
- Transaction validation
- Transaction history
- Integration with team rosters

---

### Phase 4: Discord Bot Integration (Week 3)

**Tasks**:
1. Enhance `/draft` commands
2. Add `/draft-room` command
3. Add turn notifications
4. Add `/free-agency-submit` command
5. Test Discord → App integration

**Deliverables**:
- Enhanced Discord commands
- Real-time notifications
- Discord transaction submission

---

### Phase 5: Polish & Testing (Week 4)

**Tasks**:
1. Add loading states
2. Add error handling
3. Performance optimization
4. End-to-end testing
5. User acceptance testing

**Deliverables**:
- Polished UI/UX
- Error handling complete
- Performance optimized
- Ready for production

---

## 🎯 Success Criteria

### Draft Room
- ✅ Coaches can make picks in real-time
- ✅ Turn tracking works correctly
- ✅ Real-time updates for all users
- ✅ Chat and presence working
- ✅ Mobile responsive

### Free Agency
- ✅ Transactions can be submitted in-app
- ✅ Validation works correctly
- ✅ Transaction history visible
- ✅ Integration with rosters working

### Integration
- ✅ Discord bot enhanced
- ✅ Real-time notifications working
- ✅ Google Sheets sync maintained (optional)

---

**Status**: Specification complete - Ready for implementation
