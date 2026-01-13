# Showdown Implementation Plan

## Executive Summary

This document outlines the comprehensive plan for implementing the **Showdown** section of the Average at Best Draft League platform. Showdown will serve as the central hub for battle simulation, team building, and strategic analysis, featuring Showdown-accurate battle mechanics powered by `@pkmn/engine` and AI-powered opponents using OpenAI GPT-4.1.

---

## Current State Analysis

### ✅ What's Already Built

1. **Battle Engine Foundation** (`lib/battle-engine.ts`)
   - Basic `BattleEngine` class using `@pkmn/engine`
   - Battle session management in Supabase (`battle_sessions` table)
   - Turn-by-turn event logging (`battle_events` table)
   - Legal move validation framework
   - Battle state persistence

2. **Battle API Endpoints**
   - `POST /api/battle/create` - Initialize new battle
   - `POST /api/battle/[id]/step` - Execute battle turn
   - `GET /api/battle/[id]/step` - Get current battle state

3. **Team Builder** (`app/teams/builder/page.tsx`)
   - Draft budget tracking (120 points default)
   - Pokemon search and filtering
   - Type coverage analysis
   - Roster validation (6-10 Pokemon)
   - Save/load team functionality

4. **AI Integration**
   - OpenAI GPT-4.1 for move selection (`lib/openai-client.ts`)
   - AI opponent support in battle API
   - Strategic reasoning and commentary

5. **Database Schema**
   - `battle_sessions` table for battle state
   - `battle_events` table for turn-by-turn logging
   - `team_rosters` table for team management
   - `pokemon_cache` table for Pokemon data

### ❌ What's Missing

1. **Battle UI Components**
   - Visual battle interface
   - Move selection UI
   - Pokemon switching interface
   - Battle log viewer
   - Health/status indicators

2. **Battle Replay System**
   - Visual replay playback
   - Turn navigation controls
   - Battle statistics display

3. **Team Builder Enhancements**
   - Moveset configuration
   - Item assignment
   - EV/IV customization
   - Ability selection
   - Nature selection

4. **Battle Features**
   - Multi-format support (Gen 8, Gen 9, etc.)
   - Weather/terrain effects
   - Status condition tracking
   - Damage calculation display
   - Critical hit indicators

5. **Integration Features**
   - Link battles to league matches
   - Result submission workflow
   - Battle history dashboard
   - Statistics tracking

---

## Implementation Phases

### Phase 1: Core Battle Interface (Weeks 1-2)

**Goal**: Create a functional battle UI where users can play turn-based battles

**Tasks**:
1. **Battle Page Component** (`app/showdown/battle/[id]/page.tsx`)
   - Battle state display (Pokemon, HP, status)
   - Move selection buttons
   - Switch Pokemon interface
   - Battle log sidebar
   - Turn indicator

2. **Battle Components**
   - `components/battle/pokemon-display.tsx` - Pokemon sprite and stats
   - `components/battle/move-selector.tsx` - Move selection UI
   - `components/battle/switch-menu.tsx` - Pokemon switching
   - `components/battle/battle-log.tsx` - Turn-by-turn log viewer
   - `components/battle/health-bar.tsx` - HP and status display

3. **Battle State Management**
   - Real-time battle state updates (Supabase Realtime)
   - Optimistic UI updates
   - Error handling and retries

**Deliverables**:
- Functional battle interface
- Turn-based battle flow
- Basic move execution
- Battle log display

---

### Phase 2: Team Builder Enhancements (Weeks 3-4)

**Goal**: Enhance team builder with moveset configuration and battle-ready team export

**Tasks**:
1. **Moveset Configuration**
   - Select moves for each Pokemon
   - Move legality validation
   - Move pool display (level-up, TM, egg moves)
   - Move search and filtering

2. **Item & Ability Selection**
   - Item assignment per Pokemon
   - Ability selection (including hidden abilities)
   - Item legality validation

3. **Team Export**
   - Export team in Showdown format
   - Export team to battle
   - Save team to database
   - Share team link

4. **Team Analysis**
   - Type coverage visualization
   - Weakness/resistance chart
   - Speed tier analysis
   - Role distribution

**Deliverables**:
- Enhanced team builder with movesets
- Team export functionality
- Team analysis dashboard

---

### Phase 3: AI Opponents & Battle Features (Weeks 5-6)

**Goal**: Implement AI opponents and advanced battle features

**Tasks**:
1. **AI Opponent System**
   - AI difficulty levels (Easy, Medium, Hard)
   - AI team generation
   - Strategic move selection
   - AI reasoning display

2. **Battle Features**
   - Weather/terrain effects
   - Status condition tracking
   - Damage calculation display
   - Critical hit indicators
   - Animation system (optional)

3. **Battle Validation**
   - Format rule enforcement
   - Legal move checking
   - Team validation
   - Battle state validation

**Deliverables**:
- AI opponent battles
- Advanced battle features
- Battle validation system

---

### Phase 4: Battle Replay & History (Weeks 7-8)

**Goal**: Implement battle replay system and history tracking

**Tasks**:
1. **Battle Replay System**
   - Visual replay playback
   - Turn navigation (prev/next)
   - Speed control (1x, 2x, 4x)
   - Battle statistics overlay

2. **Battle History Dashboard**
   - List of past battles
   - Battle search and filtering
   - Statistics tracking
   - Win/loss record

3. **Battle Analysis**
   - Turn-by-turn analysis
   - Key decision points
   - Damage breakdown
   - Strategy insights

**Deliverables**:
- Battle replay system
- Battle history dashboard
- Battle analysis tools

---

### Phase 5: League Integration (Weeks 9-10)

**Goal**: Integrate battles with league matches and standings

**Tasks**:
1. **Match Integration**
   - Link battles to league matches
   - Result submission workflow
   - Commissioner review system
   - Standings updates

2. **Tournament Support**
   - Playoff bracket battles
   - Tournament mode
   - Elimination tracking
   - Bracket visualization

3. **Statistics & Analytics**
   - Player statistics
   - Team performance metrics
   - Battle trends
   - Leaderboards

**Deliverables**:
- League match integration
- Tournament support
- Statistics dashboard

---

## Technical Architecture

### Battle Engine

**Technology Stack**:
- `@pkmn/engine` - Core battle engine
- `@pkmn/dex` - Pokemon data and mechanics
- `@pkmn/sim` - Battle simulation (optional)

**Architecture**:
```
Battle Flow:
1. Create Battle → Initialize engine with teams
2. Get Request → Engine returns legal actions
3. Choose Action → User/AI selects move/switch
4. Apply Choice → Engine processes turn
5. Update State → Store battle state in Supabase
6. Repeat until battle ends
```

### Database Schema

**Tables**:
- `battle_sessions` - Active battle state
- `battle_events` - Turn-by-turn events
- `battle_teams` - Team configurations
- `battle_history` - Completed battles

**Realtime Subscriptions**:
- Battle state updates
- Turn notifications
- Battle completion events

### AI Integration

**OpenAI Models**:
- **GPT-4.1** - Move selection (constrained decisions)
- **GPT-5.2** - Strategic analysis (deep reasoning)

**AI Features**:
- Legal move filtering
- Strategic move selection
- Team analysis
- Matchup predictions

---

## UI/UX Design

### Battle Interface Layout

```
┌─────────────────────────────────────────────────────────┐
│  Battle: Player vs AI Opponent                    [X]   │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────┐      ┌──────────────┐                │
│  │  Opponent    │      │  Your        │                │
│  │  Pokemon     │  VS  │  Pokemon     │                │
│  │  HP: ████░░░ │      │  HP: ███████ │                │
│  └──────────────┘      └──────────────┘                │
│                                                           │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Move Selection:                                  │  │
│  │  [Thunderbolt] [Quick Attack] [Iron Tail] [Volt] │  │
│  │  [Switch Pokemon ▼]                               │  │
│  └───────────────────────────────────────────────────┘  │
│                                                           │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Battle Log:                                       │  │
│  │  Turn 1: Pikachu used Thunderbolt!               │  │
│  │  Turn 2: Opponent's Charizard fainted!           │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Team Builder Enhancements

**New Sections**:
- Moveset Configuration (4 moves per Pokemon)
- Item Assignment
- Ability Selection
- Nature Selection (optional)
- EV/IV Configuration (optional)

---

## API Endpoints

### Battle Endpoints

- `POST /api/battle/create` - Create new battle
- `GET /api/battle/[id]` - Get battle state
- `POST /api/battle/[id]/step` - Execute turn
- `GET /api/battle/[id]/log` - Get battle log
- `POST /api/battle/[id]/replay` - Start replay
- `GET /api/battle/history` - Get battle history

### Team Endpoints

- `GET /api/teams/builder/[id]` - Get team
- `POST /api/teams/builder` - Save team
- `PUT /api/teams/builder/[id]` - Update team
- `POST /api/teams/builder/[id]/export` - Export team

---

## Success Metrics

### Phase 1 (Core Battle Interface)
- ✅ Users can initiate and play battles
- ✅ Battle state updates in real-time
- ✅ Moves execute correctly
- ✅ Battle log displays accurately

### Phase 2 (Team Builder Enhancements)
- ✅ Users can configure movesets
- ✅ Teams can be exported
- ✅ Team analysis displays correctly

### Phase 3 (AI Opponents)
- ✅ AI opponents make legal moves
- ✅ AI difficulty levels work
- ✅ Battle features function correctly

### Phase 4 (Battle Replay)
- ✅ Battles can be replayed
- ✅ Battle history displays correctly
- ✅ Statistics track accurately

### Phase 5 (League Integration)
- ✅ Battles link to league matches
- ✅ Results submit correctly
- ✅ Standings update automatically

---

## Future Enhancements

### Visual Enhancements
- Pokemon sprite animations
- Move animation effects
- Battle field visuals
- Status condition icons

### Advanced Features
- Multi-battle tournaments
- Spectator mode
- Battle commentary
- Replay sharing

### Mobile Support
- Touch-optimized battle interface
- Mobile team builder
- Responsive design

---

## Dependencies

### Required Packages
- `@pkmn/engine` - Battle engine
- `@pkmn/dex` - Pokemon data
- `@pkmn/sim` - Battle simulation (optional)
- `openai` - AI integration (already installed)

### Database Tables
- `battle_sessions` - Already exists
- `battle_events` - Already exists
- `team_rosters` - Already exists
- `battle_history` - Needs creation
- `battle_teams` - Needs creation

---

## Timeline

**Total Estimated Time**: 10 weeks

- **Phase 1**: 2 weeks (Core Battle Interface)
- **Phase 2**: 2 weeks (Team Builder Enhancements)
- **Phase 3**: 2 weeks (AI Opponents & Features)
- **Phase 4**: 2 weeks (Battle Replay & History)
- **Phase 5**: 2 weeks (League Integration)

**MVP Target**: Phases 1-2 (4 weeks) for basic battle functionality

---

## Risk Assessment

### Technical Risks
- **Battle Engine Complexity**: `@pkmn/engine` has a learning curve
  - *Mitigation*: Start with simple battles, iterate
- **Real-time Updates**: Supabase Realtime may have latency
  - *Mitigation*: Use optimistic updates, fallback polling
- **AI Costs**: OpenAI API calls can be expensive
  - *Mitigation*: Cache AI responses, limit AI battles

### Feature Risks
- **Scope Creep**: Battle features can expand indefinitely
  - *Mitigation*: Stick to MVP, prioritize core features
- **Performance**: Complex battles may be slow
  - *Mitigation*: Optimize state updates, use virtualization

---

## Next Steps

1. **Immediate** (This Week):
   - ✅ Create Showdown page with coming soon content
   - ✅ Reorganize navbar with Showdown section
   - ✅ Move Team Builder under Showdown

2. **Short-term** (Next 2 Weeks):
   - Design battle interface mockups
   - Set up battle state management
   - Create basic battle components

3. **Medium-term** (Next Month):
   - Implement Phase 1 (Core Battle Interface)
   - Test battle flow end-to-end
   - Gather user feedback

---

**Status**: Planning Complete ✅  
**Next Phase**: Phase 1 - Core Battle Interface  
**Last Updated**: 2025-01-13
