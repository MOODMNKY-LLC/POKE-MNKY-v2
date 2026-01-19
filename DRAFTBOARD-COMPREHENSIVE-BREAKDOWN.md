# Draftboard System - Comprehensive Technical Breakdown

**Date**: January 19, 2026  
**Version**: Complete Analysis  
**Status**: Production System - Season 5

---

## Executive Summary

The **Draftboard** is the central reference system for all available Pokémon during the POKE MNKY Battle League draft process. It serves as both a **visual reference** (Google Sheets) and a **structured database** (PostgreSQL), providing real-time availability tracking, point value organization, and draft progress monitoring. The system enables teams to make informed draft decisions within their 120-point budget constraint through a snake draft format.

**Key Characteristics**:
- **409+ Pokémon** organized by point values (1-20)
- **120-point budget** per team (Season 5)
- **Snake draft format** with 45-second pick timers
- **Real-time synchronization** between Google Sheets and database
- **MCP server integration** for programmatic access
- **Availability tracking** via `is_available` boolean flag

---

## Frontend Quick Start (v0.dev)

### What to Build

A **Draft Board Interface** that allows teams to:
1. **View available Pokémon** organized by point values (1-20)
2. **Filter Pokémon** by point range, generation, or type
3. **See team budget** (spent/remaining points out of 120)
4. **Draft Pokémon** with budget validation and confirmation
5. **View team roster** (drafted Pokémon)
6. **Track draft progress** (current pick, round, whose turn)

### Key Components Needed

1. **DraftBoard** - Main container component
2. **DraftBoardGrid** - Grid layout with columns for each point value (1-20)
3. **PokemonCard** - Individual Pokémon card with name, points, availability
4. **PointValueColumn** - Column component for each point tier
5. **BudgetDisplay** - Shows spent/remaining points with progress bar
6. **Filters** - Point range, generation, type filters
7. **DraftStatus** - Current draft state (pick number, round, team)
8. **TeamRoster** - List of team's drafted Pokémon
9. **PickConfirmation** - Modal for confirming draft picks

### API Endpoints

**Base URL**: `https://mcp-draft-pool.moodmnky.com/api`

1. **GET Available Pokémon**
   - Endpoint: `POST /get_available_pokemon`
   - Body: `{ point_range?: [min, max], generation?: number, type?: string, limit?: number }`
   - Returns: `{ pokemon: DraftPoolPokemon[], count: number }`

2. **GET Draft Status**
   - Endpoint: `POST /get_draft_status`
   - Body: `{ season_id?: string }`
   - Returns: `{ session_id, status, current_pick, current_round, current_team_id, total_picks }`

3. **GET Team Budget**
   - Endpoint: `POST /get_team_budget`
   - Body: `{ team_id: string, season_id?: string }`
   - Returns: `{ team_id, total_points, spent_points, remaining_points }`

4. **GET Team Picks**
   - Endpoint: `POST /get_team_picks`
   - Body: `{ team_id: string, season_id?: string }`
   - Returns: `{ team_id, picks: TeamRosterEntry[], total_spent }`

### Data Structures

```typescript
interface DraftPoolPokemon {
  id: string;
  pokemon_name: string;
  point_value: number; // 1-20
  is_available: boolean;
  generation?: number;
}

interface DraftBudget {
  total_points: number; // 120
  spent_points: number;
  remaining_points: number;
}
```

### Key Features

- **Real-time Updates**: Use Supabase Realtime to listen for draft picks
- **Budget Validation**: Check `remaining_points >= point_value` before allowing picks
- **Availability Check**: Only show Pokémon where `is_available = true`
- **Responsive Design**: Horizontal scroll on mobile, grid on desktop
- **Loading States**: Show skeletons while fetching data
- **Error Handling**: Display errors gracefully with retry options

### Recommended Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Query (TanStack Query) for server state
- **Real-time**: Supabase Realtime subscriptions
- **HTTP Client**: Fetch API or Axios

**See Section 16 for complete frontend implementation guide.**

---

## Table of Contents

1. [Physical Structure (Google Sheets)](#1-physical-structure-google-sheets)
2. [Database Schema](#2-database-schema)
3. [Point Value System](#3-point-value-system)
4. [Budget Management](#4-budget-management)
5. [Draft Process Flow](#5-draft-process-flow)
6. [Synchronization Mechanism](#6-synchronization-mechanism)
7. [Availability Tracking](#7-availability-tracking)
8. [MCP Server Integration](#8-mcp-server-integration)
9. [Complete Lifecycle](#9-complete-lifecycle)
10. [Technical Implementation](#10-technical-implementation)

---

## 1. Physical Structure (Google Sheets)

### Sheet Layout

The Draft Board is organized in Google Sheets with a specific structure:

```
Row 1: Header/image area
Row 2: Empty/spacing
Row 3: Point value headers (20, 19, 18, ... down to 1)
Row 4: Additional headers or spacing
Row 5+: Pokemon entries organized by point value
```

### Column Organization

**Point Value Columns**:
- Each point value (1-20) has dedicated columns
- Point value headers appear in Row 3
- Pokémon are listed **vertically** under their point value column
- Pokémon columns are positioned **5 columns before** their point value header

**Example Structure**:
```
Column A: Pokemon (20 pts) | Column F: Header "20"
Column B: Pokemon (20 pts) | Column G: Header "19"
Column C: Pokemon (19 pts) | Column H: Header "18"
...
```

### Row Organization

- **Header Rows (1-4)**: Point value headers, labels, spacing
- **Pokemon Rows (5+)**: Individual Pokémon entries
- **Organization Rows**: Grouping and spacing for readability

### Sheet Metadata

- **Sheet Name**: "Draft Board"
- **Spreadsheet ID**: `1ezZTEqhLrE4id9EdXRIAd0J8hqiGE9dh9Ar5RvcPCLw` (Season 5)
- **Total Rows**: ~409 rows (including headers and organization)
- **Point Range**: 1-20 points
- **Pokemon Count**: Varies by season and restrictions

---

## 2. Database Schema

### Draft Pool Table (`draft_pool`)

The `draft_pool` table is the database representation of the Draft Board:

```sql
CREATE TABLE draft_pool (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pokemon_name TEXT NOT NULL,
    point_value INTEGER NOT NULL CHECK (point_value >= 1 AND point_value <= 20),
    is_available BOOLEAN DEFAULT true,
    generation INTEGER CHECK (generation >= 1 AND generation <= 9),
    pokemon_id INTEGER,  -- Links to pokemon_cache/pokepedia_pokemon
    sheet_name TEXT NOT NULL,  -- Source tracking: "Draft Board"
    sheet_row INTEGER,  -- Row number in Google Sheets (1-indexed)
    sheet_column TEXT,  -- Column letter (A, B, C, etc.)
    extracted_at TIMESTAMP DEFAULT now(),
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    
    -- Unique constraint: Same Pokemon at same point value from same sheet
    UNIQUE (sheet_name, pokemon_name, point_value)
);
```

**Key Fields Explained**:

- **`pokemon_name`**: Species name (e.g., "Charizard", "Pikachu")
- **`point_value`**: Draft cost (1-20 points)
- **`is_available`**: `true` = available for drafting, `false` = already drafted
- **`generation`**: Pokémon generation (1-9, nullable)
- **`pokemon_id`**: Foreign key to `pokemon_cache` for sprite URLs and enhanced data
- **`sheet_name`**: Source tracking ("Draft Board" for main board)
- **`sheet_row`**: Exact row number in Google Sheets (enables bidirectional sync)
- **`sheet_column`**: Exact column letter (enables bidirectional sync)

**Indexes**:
- `idx_draft_pool_available`: Partial index on `is_available = true` (optimizes available queries)
- `idx_draft_pool_point_value`: Index on `point_value` (optimizes tier queries)
- `idx_draft_pool_pokemon_name`: Index on `pokemon_name` (optimizes name lookups)
- `idx_draft_pool_generation`: Index on `generation` (optimizes generation filters)
- `idx_draft_pool_pokemon_id`: Partial index on `pokemon_id IS NOT NULL` (optimizes joins)

### Related Tables

#### Draft Budgets (`draft_budgets`)

Tracks team budget spending per season:

```sql
CREATE TABLE draft_budgets (
    id UUID PRIMARY KEY,
    team_id UUID NOT NULL REFERENCES teams(id),
    season_id UUID NOT NULL REFERENCES seasons(id),
    total_points INTEGER DEFAULT 120,
    spent_points INTEGER DEFAULT 0,
    remaining_points INTEGER GENERATED ALWAYS AS (total_points - spent_points) STORED,
    created_at TIMESTAMP DEFAULT now(),
    
    UNIQUE (team_id, season_id)
);
```

**Key Logic**:
- `remaining_points` is a **generated column** (automatically calculated)
- One record per team per season
- Updated when picks are made

#### Team Rosters (`team_rosters`)

Tracks all Pokémon on team rosters (draft + free agency):

```sql
CREATE TABLE team_rosters (
    id UUID PRIMARY KEY,
    team_id UUID NOT NULL REFERENCES teams(id),
    pokemon_id UUID NOT NULL REFERENCES pokemon(id),
    draft_round INTEGER NOT NULL,  -- 1-11
    draft_order INTEGER NOT NULL,  -- 1-220 (total picks)
    draft_points INTEGER DEFAULT 0,  -- Point value of Pokémon
    source TEXT DEFAULT 'draft' CHECK (source IN ('draft', 'free_agency', 'trade')),
    created_at TIMESTAMP DEFAULT now(),
    
    UNIQUE (team_id, pokemon_id)
);
```

**Key Fields**:
- **`draft_round`**: Which round the Pokémon was drafted (1-11)
- **`draft_order`**: Overall pick number (1-220 for 20 teams × 11 rounds)
- **`draft_points`**: Point value (informational for free agency)
- **`source`**: Distinguishes draft picks from free agency/trades

#### Draft Sessions (`draft_sessions`)

Tracks active draft sessions:

```sql
CREATE TABLE draft_sessions (
    id UUID PRIMARY KEY,
    season_id UUID NOT NULL REFERENCES seasons(id),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
    current_pick INTEGER DEFAULT 1,
    current_round INTEGER DEFAULT 1,
    current_team_id UUID REFERENCES teams(id),
    total_teams INTEGER DEFAULT 20,
    total_rounds INTEGER DEFAULT 11,
    total_picks INTEGER DEFAULT 220,  -- 20 teams × 11 rounds
    turn_order JSONB,  -- Array of team IDs in draft order
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);
```

---

## 3. Point Value System

### Point Range

- **Highest**: 20 points (most powerful/valuable Pokémon)
- **Lowest**: 1 point (least powerful/valuable Pokémon)
- **Total Range**: 20 different point tiers

### Point Distribution

**High-Tier (15-20 points)**:
- Elite competitive viability
- High base stats or powerful abilities
- Meta-defining presence
- Limited availability
- **Strategic Value**: Foundation pieces, high budget allocation, early draft priorities

**Mid-Tier (8-14 points)**:
- Strong role players
- Good type coverage
- Versatile options
- Balanced power level
- **Strategic Value**: Core team members, moderate budget allocation, mid-draft priorities

**Low-Tier (1-7 points)**:
- Niche roles
- Specific utility
- Budget-friendly options
- Support functions
- **Strategic Value**: Role-specific picks, budget efficiency, late-draft selections

### Point Assignment Logic

Point values reflect:
- **Competitive viability**: How strong the Pokémon is in competitive play
- **Power level**: Base stats, abilities, movepool
- **Strategic value**: Role in team composition
- **Meta relevance**: Current tier placement and usage rates

**Example Point Assignments**:
- **20 points**: Box legendaries, top-tier threats (e.g., Koraidon, Miraidon)
- **15-19 points**: Elite Pokémon, meta-defining threats
- **10-14 points**: Strong role players, versatile options
- **5-9 points**: Niche picks, specific utility
- **1-4 points**: Budget options, support roles

---

## 4. Budget Management

### Team Budgets (Season 5)

- **Draft Budget**: 120 points per team
- **Tera Budget**: 15 points per team (separate from draft budget)
- **Total Budget**: 135 points (combined)

### Budget Calculation

**Spent Points**:
```sql
SELECT SUM(draft_points) 
FROM team_rosters 
WHERE team_id = ? AND source = 'draft';
```

**Remaining Points**:
```sql
SELECT remaining_points 
FROM draft_budgets 
WHERE team_id = ? AND season_id = ?;
-- OR calculated: total_points - spent_points
```

### Budget Validation

**Non-Blocking Warnings**:
- System warns if picks exceed remaining budget
- Warnings are informational (not blocking)
- Teams can technically exceed budget (manual override)

**Budget Exhaustion**:
- Teams cannot draft Pokémon if budget is insufficient
- System checks: `remaining_points >= point_value`
- Validation occurs before `is_available` flag update

### Budget Tracking

**Per Team Per Season**:
- One `draft_budgets` record per team per season
- Updated automatically when picks are made
- `remaining_points` is a generated column (always accurate)

**Update Flow**:
1. Team drafts Pokémon with `point_value = X`
2. Insert into `team_rosters` with `draft_points = X`
3. Update `draft_budgets.spent_points += X`
4. `remaining_points` automatically recalculates

---

## 5. Draft Process Flow

### Snake Draft Format

**Round 1** (Forward):
```
Team 1 → Team 2 → Team 3 → ... → Team 20
Pick 1    Pick 2    Pick 3         Pick 20
```

**Round 2** (Reverse):
```
Team 20 → Team 19 → Team 18 → ... → Team 1
Pick 21    Pick 22    Pick 23         Pick 40
```

**Pattern Repeats**:
- Odd rounds: Forward (Team 1 → Team 20)
- Even rounds: Reverse (Team 20 → Team 1)

**Example**: If Team 1 picks first in Round 1, they pick last in Round 2 (pick 40 if 20 teams).

### Draft Timing

- **Time Limit**: 45 seconds per pick
- **Skip Penalty**: If unable to pick in time, skipped that round with 45 seconds added to next pick
- **Draft Duration**: Varies based on number of teams and picks
- **Total Picks**: 220 picks (20 teams × 11 rounds)

### Draft Order Calculation

**Snake Draft Formula**:
```javascript
function getPickNumber(round, teamIndex, totalTeams) {
    if (round % 2 === 1) {
        // Odd rounds: forward
        return (round - 1) * totalTeams + teamIndex + 1;
    } else {
        // Even rounds: reverse
        return (round - 1) * totalTeams + (totalTeams - teamIndex);
    }
}
```

**Example** (20 teams):
- Round 1, Team 1: Pick 1
- Round 1, Team 20: Pick 20
- Round 2, Team 20: Pick 21 (reversed)
- Round 2, Team 1: Pick 40 (reversed)

### Draft Tracking

When a Pokémon is drafted:

1. **Removed from Board**: `is_available = false` in `draft_pool`
2. **Added to Roster**: Insert into `team_rosters` with:
   - `team_id`: Drafting team
   - `pokemon_id`: Pokémon UUID
   - `draft_round`: Current round
   - `draft_order`: Overall pick number
   - `draft_points`: Point value
   - `source`: 'draft'
3. **Budget Updated**: `draft_budgets.spent_points += point_value`
4. **Point Validation**: System checks if pick is within budget
5. **Session Updated**: `draft_sessions.current_pick++`, `current_team_id` updated

---

## 6. Synchronization Mechanism

### Google Sheets → Database

**Extraction Script**: `scripts/generate-seed-from-draft-board.js`

**Process**:
1. **Authenticate**: Google Sheets API with service account
2. **Read Sheet**: `Draft Board!A1:BZ200` (wide range to catch all columns)
3. **Parse Headers**: Row 3 contains point value headers (20, 19, 18, ...)
4. **Map Columns**: Point value columns → Pokémon columns (5 columns before header)
5. **Extract Pokémon**: Starting from Row 5, extract Pokémon names from mapped columns
6. **Generate SQL**: Create INSERT statements with:
   - `pokemon_name`: Extracted name
   - `point_value`: Mapped point value
   - `sheet_row`: Row number (1-indexed)
   - `sheet_column`: Column letter (A, B, C, etc.)
   - `sheet_name`: "Draft Board"
   - `is_available`: `true` (default)
7. **Upsert Logic**: `ON CONFLICT (sheet_name, pokemon_name, point_value) DO NOTHING`

**Key Features**:
- **Duplicate Prevention**: Uses `(sheet_name, pokemon_name, point_value)` unique constraint
- **Position Tracking**: `sheet_row` and `sheet_column` enable bidirectional sync
- **Generation Detection**: Attempts to infer generation from Pokémon name (can be null)

### Database → Google Sheets (Future/Bidirectional)

**Potential Implementation**:
- Use `sheet_row` and `sheet_column` to update specific cells
- Mark drafted Pokémon as struck out or removed
- Update availability status in real-time

**Current State**:
- Database is source of truth for availability
- Google Sheets serves as visual reference
- Manual updates may be needed for sheet formatting

### Synchronization Triggers

**Real-Time Updates**:
- When Pokémon is drafted: `is_available = false`
- When draft session updates: `draft_sessions` table updated
- When budget changes: `draft_budgets` table updated

**Broadcast Mechanism**:
- **Trigger**: `broadcast_draft_pick()` fires on `team_rosters` INSERT
- **Action**: Broadcasts draft pick via Supabase Realtime
- **Purpose**: Real-time updates to connected clients

---

## 7. Availability Tracking

### The `is_available` Flag

**Purpose**: Tracks whether a Pokémon is available for drafting

**Values**:
- **`true`**: Available for drafting
- **`false`**: Already drafted (removed from pool)

### Availability Lifecycle

**Pre-Draft**:
- All Pokémon: `is_available = true`
- Total available: ~400+ Pokémon

**During Draft**:
- When Pokémon is drafted: `is_available = false`
- Available count decreases with each pick
- Query: `SELECT COUNT(*) FROM draft_pool WHERE is_available = true`

**Post-Draft**:
- Drafted Pokémon: `is_available = false`
- Undrafted Pokémon: `is_available = true`
- Final pool: Remaining undrafted Pokémon

### Availability Updates

**When Pokémon is Drafted**:

```sql
-- Step 1: Insert into team_rosters
INSERT INTO team_rosters (team_id, pokemon_id, draft_round, draft_order, draft_points, source)
VALUES (?, ?, ?, ?, ?, 'draft');

-- Step 2: Update draft_pool.is_available
UPDATE draft_pool
SET is_available = false,
    updated_at = now()
WHERE pokemon_name = ? 
  AND point_value = ?
  AND sheet_name = 'Draft Board';

-- Step 3: Update draft_budgets
UPDATE draft_budgets
SET spent_points = spent_points + ?,
    updated_at = now()
WHERE team_id = ? AND season_id = ?;
```

**Note**: In practice, this may be handled by database triggers or application logic.

### Querying Available Pokémon

**MCP Server Query**:
```typescript
const { data } = await supabase
  .from('draft_pool')
  .select('pokemon_name, point_value, generation, is_available')
  .eq('is_available', true)
  .gte('point_value', minPoints)
  .lte('point_value', maxPoints)
  .order('point_value', { ascending: false });
```

**Optimization**:
- Partial index: `idx_draft_pool_available` on `is_available = true`
- Only indexes available Pokémon (reduces index size)
- Faster queries for available Pokémon

---

## 8. MCP Server Integration

### MCP Server Overview

**Server**: `poke-mnky-draft-pool`  
**Version**: 1.0.1  
**URL**: `https://mcp-draft-pool.moodmnky.com/mcp`  
**Protocol**: MCP (Model Context Protocol) - JSON-RPC over HTTP

### Draftboard-Related Tools

#### 1. `get_available_pokemon`

**Purpose**: Query available Pokémon in draft pool

**Input**:
```typescript
{
  point_range?: [min, max],  // Optional point range filter
  generation?: number,       // Optional generation filter
  type?: string,            // Optional type filter
  limit?: number            // Max results (default: 100)
}
```

**Output**:
```json
{
  "pokemon": [
    {
      "pokemon_name": "Charizard",
      "point_value": 15,
      "generation": 1,
      "available": true
    }
  ],
  "count": 1
}
```

**Implementation**:
```typescript
let query = supabase
  .from('draft_pool')
  .select('pokemon_name, point_value, generation, is_available')
  .eq('is_available', true)
  .limit(limit);

if (point_range && point_range.length === 2) {
  query = query.gte('point_value', point_range[0])
                .lte('point_value', point_range[1]);
}

if (generation) {
  query = query.eq('generation', generation);
}
```

#### 2. `get_draft_status`

**Purpose**: Get current draft session status

**Input**:
```typescript
{
  season_id?: string  // Optional, defaults to current season
}
```

**Output**:
```json
{
  "session_id": "uuid",
  "status": "active",
  "current_pick": 45,
  "current_round": 3,
  "current_team_id": "uuid",
  "total_picks": 220
}
```

#### 3. `get_team_budget`

**Purpose**: Get team budget information

**Input**:
```typescript
{
  team_id: string,      // Required
  season_id?: string    // Optional, defaults to current season
}
```

**Output**:
```json
{
  "team_id": "uuid",
  "total_points": 120,
  "spent_points": 45,
  "remaining_points": 75
}
```

#### 4. `get_team_picks`

**Purpose**: Get all draft picks for a team

**Input**:
```typescript
{
  team_id: string,      // Required
  season_id?: string    // Optional, defaults to current season
}
```

**Output**:
```json
{
  "team_id": "uuid",
  "picks": [
    {
      "pokemon_name": "Charizard",
      "point_value": 15,
      "draft_round": 1,
      "draft_order": 5
    }
  ],
  "total_spent": 45
}
```

### Draftboard Resources

#### Resource: `draft-board://current`

**Purpose**: Current state of available Pokémon in draft pool

**Format**: JSON

**Content**:
```json
{
  "timestamp": "2026-01-19T04:00:00Z",
  "available_count": 350,
  "pokemon": [
    {
      "pokemon_name": "Charizard",
      "point_value": 15,
      "generation": 1,
      "is_available": true
    }
  ]
}
```

**Implementation**:
```typescript
const { data } = await supabase
  .from('draft_pool')
  .select('pokemon_name, point_value, generation, is_available')
  .eq('is_available', true)
  .order('point_value', { ascending: false });
```

### Caching Strategy

**Cache Key**: `draft_pool:available:{filters}`
**TTL**: 30 seconds (configurable)
**Invalidation**: On draft pick (updates `is_available`)

**Benefits**:
- Reduces database load
- Faster response times
- Automatic invalidation on updates

---

## 9. Complete Lifecycle

### Pre-Draft Phase

**Setup**:
1. **Extract from Google Sheets**: Run `generate-seed-from-draft-board.js`
2. **Populate Database**: Insert all Pokémon with `is_available = true`
3. **Initialize Budgets**: Create `draft_budgets` records (120 points per team)
4. **Create Draft Session**: Initialize `draft_sessions` with status 'active'
5. **Set Draft Order**: Randomize team order, store in `turn_order` JSONB

**State**:
- All Pokémon: `is_available = true`
- All teams: `spent_points = 0`, `remaining_points = 120`
- Draft session: `status = 'active'`, `current_pick = 1`, `current_round = 1`

### During Draft Phase

**Per Pick Flow**:

1. **Current Team's Turn**:
   - Query `draft_sessions` for `current_team_id`
   - Display available Pokémon filtered by budget

2. **Team Selects Pokémon**:
   - Validate: `remaining_points >= point_value`
   - Check: `is_available = true` in `draft_pool`

3. **Record Pick**:
   ```sql
   -- Insert into team_rosters
   INSERT INTO team_rosters (team_id, pokemon_id, draft_round, draft_order, draft_points, source)
   VALUES (current_team_id, pokemon_id, current_round, current_pick, point_value, 'draft');
   
   -- Mark as unavailable
   UPDATE draft_pool
   SET is_available = false
   WHERE pokemon_name = ? AND point_value = ?;
   
   -- Update budget
   UPDATE draft_budgets
   SET spent_points = spent_points + point_value
   WHERE team_id = current_team_id AND season_id = ?;
   
   -- Advance draft
   UPDATE draft_sessions
   SET current_pick = current_pick + 1,
       current_round = CASE WHEN current_pick % total_teams = 0 THEN current_round + 1 ELSE current_round END,
       current_team_id = next_team_id
   WHERE id = session_id;
   ```

4. **Broadcast Update**:
   - Trigger `broadcast_draft_pick()` fires
   - Real-time update to all connected clients
   - MCP server cache invalidated

**State Transitions**:
- `current_pick`: 1 → 2 → ... → 220
- `current_round`: 1 → 2 → ... → 11
- `is_available`: `true` → `false` (for drafted Pokémon)
- `spent_points`: Increments with each pick
- `remaining_points`: Decrements with each pick

### Post-Draft Phase

**Completion**:
1. **Final Pick**: When `current_pick = total_picks` (220)
2. **Mark Session Complete**: `status = 'completed'`
3. **Finalize Rosters**: All `team_rosters` records created
4. **Calculate Final Budgets**: All `draft_budgets` finalized

**Final State**:
- Drafted Pokémon: `is_available = false`
- Undrafted Pokémon: `is_available = true`
- All teams: `spent_points` = sum of drafted Pokémon
- Draft session: `status = 'completed'`

**Post-Draft Queries**:
- Available for free agency: `SELECT * FROM draft_pool WHERE is_available = true`
- Team rosters: `SELECT * FROM team_rosters WHERE team_id = ? AND source = 'draft'`
- Budget analysis: `SELECT * FROM draft_budgets WHERE season_id = ?`

---

## 10. Technical Implementation

### Extraction Scripts

#### `scripts/generate-seed-from-draft-board.js`

**Purpose**: Extract Draft Board from Google Sheets and generate SQL INSERT statements

**Process**:
1. Authenticate with Google Sheets API
2. Read `Draft Board!A1:BZ200`
3. Parse Row 3 for point value headers
4. Map Pokémon columns (5 columns before headers)
5. Extract Pokémon from Row 5+
6. Generate SQL with `sheet_row` and `sheet_column` tracking

**Output**: SQL INSERT statements with conflict handling

**Key Features**:
- Handles duplicate prevention via `ON CONFLICT`
- Tracks exact sheet position (`sheet_row`, `sheet_column`)
- Filters out headers and empty cells
- Generates generation inference (can be null)

### Database Functions

#### `get_available_pokemon_for_free_agency()`

**Purpose**: Get Pokémon available for free agency (not on any roster)

**Logic**:
```sql
SELECT dp.*
FROM draft_pool dp
WHERE dp.is_available = true
  AND dp.pokemon_name NOT IN (
    SELECT p.name
    FROM team_rosters tr
    INNER JOIN pokemon p ON tr.pokemon_id = p.id
    INNER JOIN teams t ON tr.team_id = t.id
    WHERE t.season_id = p_season_id
  )
ORDER BY dp.point_value DESC, dp.pokemon_name ASC;
```

### Database Triggers

#### `broadcast_draft_pick()`

**Purpose**: Broadcast draft pick via Supabase Realtime

**Trigger**: `AFTER INSERT ON team_rosters WHERE draft_round IS NOT NULL`

**Action**:
```sql
PERFORM realtime.broadcast_changes(
  'draft_pick',
  'public',
  'team_rosters',
  NEW,
  NULL
);
```

**Effect**: Real-time updates to connected clients (Discord bot, web app, etc.)

### MCP Server Implementation

#### Query Optimization

**Caching**:
- Cache key: `draft_pool:available:{point_range}:{generation}`
- TTL: 30 seconds
- Invalidation: On `is_available` updates

**Index Usage**:
- `idx_draft_pool_available`: Filters `is_available = true`
- `idx_draft_pool_point_value`: Filters point ranges
- `idx_draft_pool_generation`: Filters by generation

**Query Pattern**:
```typescript
// Optimized query using indexes
const query = supabase
  .from('draft_pool')
  .select('pokemon_name, point_value, generation, is_available')
  .eq('is_available', true)  // Uses idx_draft_pool_available
  .gte('point_value', min)   // Uses idx_draft_pool_point_value
  .lte('point_value', max)   // Uses idx_draft_pool_point_value
  .order('point_value', { ascending: false });
```

### Error Handling

**Common Scenarios**:

1. **Pokémon Not Found**:
   - Query returns empty array
   - MCP server returns `{ pokemon: [], count: 0 }`

2. **Budget Exceeded**:
   - Validation warning (non-blocking)
   - System allows but warns

3. **Pokémon Already Drafted**:
   - `is_available = false` check
   - Error: "Pokémon already drafted"

4. **Draft Session Not Active**:
   - Check `draft_sessions.status = 'active'`
   - Error: "No active draft session"

### Performance Considerations

**Indexes**:
- Partial index on `is_available = true` (smaller, faster)
- Point value index (enables range queries)
- Generation index (enables generation filters)

**Caching**:
- MCP server caches available Pokémon queries
- 30-second TTL balances freshness and performance
- Automatic invalidation on updates

**Query Optimization**:
- Limit results (default: 100)
- Use indexes for filters
- Order by indexed columns (`point_value`)

---

## 11. Real-World Examples

### Example 1: Query Available Pokémon (15-20 points)

**MCP Tool Call**:
```json
{
  "tool": "get_available_pokemon",
  "arguments": {
    "point_range": [15, 20],
    "limit": 50
  }
}
```

**Database Query**:
```sql
SELECT pokemon_name, point_value, generation, is_available
FROM draft_pool
WHERE is_available = true
  AND point_value >= 15
  AND point_value <= 20
ORDER BY point_value DESC, pokemon_name ASC
LIMIT 50;
```

**Result**:
```json
{
  "pokemon": [
    { "pokemon_name": "Koraidon", "point_value": 20, "generation": 9, "available": true },
    { "pokemon_name": "Miraidon", "point_value": 20, "generation": 9, "available": true },
    { "pokemon_name": "Charizard", "point_value": 15, "generation": 1, "available": true }
  ],
  "count": 3
}
```

### Example 2: Team Drafts Pokémon

**Flow**:
1. Team 1 selects "Charizard" (15 points) in Round 1, Pick 1
2. System validates: `remaining_points (120) >= point_value (15)` ✅
3. System checks: `is_available = true` ✅
4. Insert into `team_rosters`:
   ```sql
   INSERT INTO team_rosters (team_id, pokemon_id, draft_round, draft_order, draft_points, source)
   VALUES ('team-1-uuid', 'charizard-uuid', 1, 1, 15, 'draft');
   ```
5. Update `draft_pool`:
   ```sql
   UPDATE draft_pool
   SET is_available = false
   WHERE pokemon_name = 'Charizard' AND point_value = 15;
   ```
6. Update `draft_budgets`:
   ```sql
   UPDATE draft_budgets
   SET spent_points = 15
   WHERE team_id = 'team-1-uuid' AND season_id = 'season-5-uuid';
   ```
7. Advance draft session:
   ```sql
   UPDATE draft_sessions
   SET current_pick = 2, current_team_id = 'team-2-uuid'
   WHERE id = 'session-uuid';
   ```
8. Broadcast via Realtime: All clients notified

**Result**:
- Charizard: `is_available = false`
- Team 1: `spent_points = 15`, `remaining_points = 105`
- Draft: `current_pick = 2`, `current_team_id = team-2-uuid`

### Example 3: Check Team Budget

**MCP Tool Call**:
```json
{
  "tool": "get_team_budget",
  "arguments": {
    "team_id": "team-1-uuid"
  }
}
```

**Database Query**:
```sql
SELECT team_id, total_points, spent_points, remaining_points
FROM draft_budgets
WHERE team_id = 'team-1-uuid' AND season_id = (
  SELECT id FROM seasons WHERE is_current = true
);
```

**Result**:
```json
{
  "team_id": "team-1-uuid",
  "total_points": 120,
  "spent_points": 45,
  "remaining_points": 75
}
```

---

## 12. Edge Cases & Special Scenarios

### Multiple Point Values

**Scenario**: Same Pokémon at different point values

**Example**: "Charizard" at 15 points AND 20 points

**Handling**:
- Unique constraint: `(sheet_name, pokemon_name, point_value)`
- Both entries can exist
- Each has separate `is_available` flag
- Teams can draft either version

**Query**:
```sql
SELECT * FROM draft_pool
WHERE pokemon_name = 'Charizard';
-- Returns: 15 points (available), 20 points (drafted)
```

### Sheet Position Tracking

**Purpose**: `sheet_row` and `sheet_column` enable bidirectional sync

**Use Cases**:
- Update Google Sheets when Pokémon is drafted
- Mark Pokémon as struck out in sheet
- Maintain visual consistency

**Example**:
```sql
SELECT pokemon_name, sheet_row, sheet_column
FROM draft_pool
WHERE pokemon_name = 'Charizard' AND point_value = 15;
-- Returns: Row 42, Column C
-- Can update Google Sheets cell C42 directly
```

### Season Management

**Multiple Seasons**:
- Each season has separate `draft_pool` entries
- `sheet_name` can differentiate: "Draft Board Season 5", "Draft Board Season 6"
- `draft_budgets` and `team_rosters` linked via `season_id`

**Current Season**:
- Query: `SELECT * FROM seasons WHERE is_current = true`
- Defaults to current season in MCP tools

### Free Agency

**Post-Draft Availability**:
- Undrafted Pokémon: `is_available = true`
- Available for free agency pickups
- Query: `get_available_pokemon_for_free_agency(season_id)`

**Free Agency Additions**:
- Insert into `team_rosters` with `source = 'free_agency'`
- `draft_points` still recorded (informational)
- `draft_round` and `draft_order` are NULL

---

## 13. Integration Points

### Discord Bot Integration

**Usage**:
- Query available Pokémon: `get_available_pokemon`
- Check team budget: `get_team_budget`
- Get draft status: `get_draft_status`

**Example**:
```typescript
// Discord command: !draftboard 15-20
const available = await mcpClient.callTool('get_available_pokemon', {
  point_range: [15, 20],
  limit: 20
});
```

### Next.js App Integration

**REST API**:
- Endpoint: `https://mcp-draft-pool.moodmnky.com/api/get_available_pokemon`
- Method: POST
- Body: `{ point_range: [15, 20], limit: 50 }`

**Example**:
```typescript
const response = await fetch('https://mcp-draft-pool.moodmnky.com/api/get_available_pokemon', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ point_range: [15, 20] })
});
const data = await response.json();
```

### Open WebUI Integration

**MCP Server Connection**:
- URL: `https://mcp-draft-pool.moodmnky.com/mcp`
- Tools available in Open WebUI functions
- Resources accessible via MCP protocol

**Example Function**:
```python
def get_available_pokemon(point_range=None, generation=None):
    result = mcp_client.call_tool('get_available_pokemon', {
        'point_range': point_range,
        'generation': generation
    })
    return result['structuredContent']
```

---

## 14. Data Flow Diagram

```
┌─────────────────┐
│  Google Sheets  │
│   Draft Board   │
└────────┬─────────┘
         │ Extract
         │ (generate-seed-from-draft-board.js)
         ▼
┌─────────────────┐
│   PostgreSQL    │
│   draft_pool    │
│  (is_available)  │
└────────┬─────────┘
         │ Query
         │ (MCP Server)
         ▼
┌─────────────────┐
│   MCP Server    │
│  (draft-pool)   │
└────────┬─────────┘
         │ Serve
         │ (JSON-RPC / REST)
         ▼
┌─────────────────┐
│   Applications  │
│ (Discord/WebUI) │
└─────────────────┘

When Pokémon is Drafted:
┌─────────────────┐
│  Draft Action   │
└────────┬─────────┘
         │
         ├─► INSERT team_rosters
         ├─► UPDATE draft_pool.is_available = false
         ├─► UPDATE draft_budgets.spent_points
         ├─► UPDATE draft_sessions.current_pick
         └─► BROADCAST (Realtime)
```

---

## 15. Key Takeaways

### Core Concepts

1. **Dual Representation**: Google Sheets (visual) + Database (structured)
2. **Point-Based System**: 1-20 points reflect competitive value
3. **Budget Constraint**: 120 points per team (Season 5)
4. **Availability Flag**: `is_available` tracks draft status
5. **Snake Draft**: Alternating forward/reverse rounds

### Technical Highlights

1. **Position Tracking**: `sheet_row` and `sheet_column` enable sync
2. **Unique Constraint**: `(sheet_name, pokemon_name, point_value)` prevents duplicates
3. **Generated Columns**: `remaining_points` automatically calculated
4. **Partial Indexes**: Optimize `is_available = true` queries
5. **Real-Time Updates**: Supabase Realtime broadcasts draft picks

### Query Patterns

**Available Pokémon**:
```sql
SELECT * FROM draft_pool WHERE is_available = true;
```

**By Point Range**:
```sql
SELECT * FROM draft_pool 
WHERE is_available = true 
  AND point_value BETWEEN 15 AND 20;
```

**Team Budget**:
```sql
SELECT * FROM draft_budgets 
WHERE team_id = ? AND season_id = ?;
```

**Draft Status**:
```sql
SELECT * FROM draft_sessions 
WHERE status = 'active' 
ORDER BY created_at DESC 
LIMIT 1;
```

---

## 16. Frontend Implementation Guide (v0.dev Compatible)

### Overview

This section provides comprehensive frontend implementation guidance for building a draftboard interface using React/Next.js, TypeScript, and modern web technologies. All patterns are optimized for v0.dev code generation and follow best practices.

---

### 16.1 TypeScript Interfaces

#### Core Data Types

```typescript
// Pokemon in draft pool
interface DraftPoolPokemon {
  id: string;
  pokemon_name: string;
  point_value: number; // 1-20
  is_available: boolean;
  generation?: number; // 1-9, nullable
  pokemon_id?: number; // Links to pokemon_cache
  sheet_name: string; // "Draft Board"
  sheet_row?: number;
  sheet_column?: string;
  created_at: string;
  updated_at: string;
}

// Team budget information
interface DraftBudget {
  id: string;
  team_id: string;
  season_id: string;
  total_points: number; // 120 (Season 5)
  spent_points: number;
  remaining_points: number; // Generated column
  created_at: string;
}

// Team roster entry (drafted Pokemon)
interface TeamRosterEntry {
  id: string;
  team_id: string;
  pokemon_id: string;
  pokemon_name: string; // Joined from pokemon table
  draft_round: number; // 1-11
  draft_order: number; // 1-220
  draft_points: number;
  source: 'draft' | 'free_agency' | 'trade';
  created_at: string;
}

// Draft session state
interface DraftSession {
  id: string;
  season_id: string;
  status: 'active' | 'completed' | 'paused';
  current_pick: number; // 1-220
  current_round: number; // 1-11
  current_team_id?: string;
  total_teams: number; // 20
  total_rounds: number; // 11
  total_picks: number; // 220
  turn_order: string[]; // Array of team IDs
  created_at: string;
  updated_at: string;
}

// API Response Types
interface AvailablePokemonResponse {
  pokemon: DraftPoolPokemon[];
  count: number;
}

interface DraftStatusResponse {
  session_id: string;
  status: string;
  current_pick: number;
  current_round: number;
  current_team_id?: string;
  total_picks: number;
}

interface TeamBudgetResponse {
  team_id: string;
  total_points: number;
  spent_points: number;
  remaining_points: number;
}

interface TeamPicksResponse {
  team_id: string;
  picks: TeamRosterEntry[];
  total_spent: number;
}
```

---

### 16.2 API Client Setup

#### REST API Client (Recommended for Frontend)

```typescript
// lib/api/draft-pool-client.ts
const API_BASE_URL = 'https://mcp-draft-pool.moodmnky.com/api';

class DraftPoolClient {
  private apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
      headers['X-API-Key'] = this.apiKey;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(error.message || `API error: ${response.status}`);
    }

    return response.json();
  }

  // Get available Pokemon
  async getAvailablePokemon(params?: {
    point_range?: [number, number];
    generation?: number;
    type?: string;
    limit?: number;
  }): Promise<AvailablePokemonResponse> {
    return this.request('/get_available_pokemon', {
      method: 'POST',
      body: JSON.stringify(params || {}),
    });
  }

  // Get draft status
  async getDraftStatus(seasonId?: string): Promise<DraftStatusResponse> {
    return this.request('/get_draft_status', {
      method: 'POST',
      body: JSON.stringify({ season_id: seasonId }),
    });
  }

  // Get team budget
  async getTeamBudget(
    teamId: string,
    seasonId?: string
  ): Promise<TeamBudgetResponse> {
    return this.request('/get_team_budget', {
      method: 'POST',
      body: JSON.stringify({ team_id: teamId, season_id: seasonId }),
    });
  }

  // Get team picks
  async getTeamPicks(
    teamId: string,
    seasonId?: string
  ): Promise<TeamPicksResponse> {
    return this.request('/get_team_picks', {
      method: 'POST',
      body: JSON.stringify({ team_id: teamId, season_id: seasonId }),
    });
  }
}

export const draftPoolClient = new DraftPoolClient(
  process.env.NEXT_PUBLIC_MCP_API_KEY
);
```

#### React Query Hooks

```typescript
// hooks/use-draft-pool.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { draftPoolClient } from '@/lib/api/draft-pool-client';

// Query available Pokemon
export function useAvailablePokemon(params?: {
  point_range?: [number, number];
  generation?: number;
  type?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['draft-pool', 'available', params],
    queryFn: () => draftPoolClient.getAvailablePokemon(params),
    staleTime: 5 * 60 * 1000, // 5 minutes (matches cache TTL)
    refetchOnWindowFocus: true,
  });
}

// Query draft status
export function useDraftStatus(seasonId?: string) {
  return useQuery({
    queryKey: ['draft-status', seasonId],
    queryFn: () => draftPoolClient.getDraftStatus(seasonId),
    refetchInterval: 5000, // Poll every 5 seconds during active draft
    enabled: true,
  });
}

// Query team budget
export function useTeamBudget(teamId: string, seasonId?: string) {
  return useQuery({
    queryKey: ['team-budget', teamId, seasonId],
    queryFn: () => draftPoolClient.getTeamBudget(teamId, seasonId),
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Query team picks
export function useTeamPicks(teamId: string, seasonId?: string) {
  return useQuery({
    queryKey: ['team-picks', teamId, seasonId],
    queryFn: () => draftPoolClient.getTeamPicks(teamId, seasonId),
    staleTime: 30 * 1000,
  });
}
```

---

### 16.3 Component Architecture

#### Recommended Component Structure

```
components/
  draft-board/
    DraftBoard.tsx              # Main container
    DraftBoardGrid.tsx          # Grid layout by point value
    PokemonCard.tsx             # Individual Pokemon card
    PointValueColumn.tsx         # Column for each point tier
    Filters.tsx                  # Filter controls
    BudgetDisplay.tsx            # Team budget indicator
    DraftStatus.tsx              # Current draft state
    TeamRoster.tsx               # Team's drafted Pokemon
    PickConfirmation.tsx         # Modal for confirming picks
```

#### Main Draft Board Component

```typescript
// components/draft-board/DraftBoard.tsx
'use client';

import { useState } from 'react';
import { useAvailablePokemon } from '@/hooks/use-draft-pool';
import { DraftBoardGrid } from './DraftBoardGrid';
import { Filters } from './Filters';
import { BudgetDisplay } from './BudgetDisplay';
import { DraftStatus } from './DraftStatus';

interface DraftBoardProps {
  teamId: string;
  seasonId?: string;
}

export function DraftBoard({ teamId, seasonId }: DraftBoardProps) {
  const [filters, setFilters] = useState<{
    point_range?: [number, number];
    generation?: number;
    type?: string;
  }>({});

  const { data, isLoading, error } = useAvailablePokemon({
    ...filters,
    limit: 500, // Get all available
  });

  if (isLoading) {
    return <DraftBoardSkeleton />;
  }

  if (error) {
    return <DraftBoardError error={error} />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b bg-white">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Draft Board</h1>
          <DraftStatus seasonId={seasonId} />
        </div>
        <Filters filters={filters} onFiltersChange={setFilters} />
      </div>

      {/* Budget Display */}
      <BudgetDisplay teamId={teamId} seasonId={seasonId} />

      {/* Main Grid */}
      <div className="flex-1 overflow-auto">
        <DraftBoardGrid
          pokemon={data?.pokemon || []}
          teamId={teamId}
          seasonId={seasonId}
        />
      </div>
    </div>
  );
}
```

#### Pokemon Card Component

```typescript
// components/draft-board/PokemonCard.tsx
'use client';

import { DraftPoolPokemon } from '@/types/draft-pool';
import { useTeamBudget } from '@/hooks/use-draft-pool';
import { useState } from 'react';
import { PickConfirmation } from './PickConfirmation';

interface PokemonCardProps {
  pokemon: DraftPoolPokemon;
  teamId: string;
  seasonId?: string;
  onPick?: (pokemon: DraftPoolPokemon) => void;
}

export function PokemonCard({
  pokemon,
  teamId,
  seasonId,
  onPick,
}: PokemonCardProps) {
  const { data: budget } = useTeamBudget(teamId, seasonId);
  const [showConfirm, setShowConfirm] = useState(false);

  const canAfford =
    budget && budget.remaining_points >= pokemon.point_value;
  const isAvailable = pokemon.is_available;

  const handleClick = () => {
    if (!isAvailable) return;
    if (!canAfford) {
      alert(`Insufficient budget. Need ${pokemon.point_value} points, have ${budget?.remaining_points}.`);
      return;
    }
    setShowConfirm(true);
  };

  return (
    <>
      <button
        onClick={handleClick}
        disabled={!isAvailable || !canAfford}
        className={`
          p-3 rounded-lg border-2 transition-all
          ${!isAvailable
            ? 'opacity-50 cursor-not-allowed bg-gray-100'
            : canAfford
            ? 'border-blue-500 hover:border-blue-600 hover:shadow-md cursor-pointer'
            : 'border-red-300 opacity-75 cursor-not-allowed'
          }
        `}
      >
        <div className="text-center">
          <div className="font-bold text-lg">{pokemon.pokemon_name}</div>
          <div className="text-sm text-gray-600">
            {pokemon.point_value} points
          </div>
          {pokemon.generation && (
            <div className="text-xs text-gray-400">
              Gen {pokemon.generation}
            </div>
          )}
          {!isAvailable && (
            <div className="text-xs text-red-600 mt-1">Drafted</div>
          )}
        </div>
      </button>

      {showConfirm && (
        <PickConfirmation
          pokemon={pokemon}
          teamId={teamId}
          seasonId={seasonId}
          onConfirm={() => {
            onPick?.(pokemon);
            setShowConfirm(false);
          }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  );
}
```

#### Point Value Column Component

```typescript
// components/draft-board/PointValueColumn.tsx
'use client';

import { DraftPoolPokemon } from '@/types/draft-pool';
import { PokemonCard } from './PokemonCard';

interface PointValueColumnProps {
  pointValue: number;
  pokemon: DraftPoolPokemon[];
  teamId: string;
  seasonId?: string;
  onPick?: (pokemon: DraftPoolPokemon) => void;
}

export function PointValueColumn({
  pointValue,
  pokemon,
  teamId,
  seasonId,
  onPick,
}: PointValueColumnProps) {
  const availableCount = pokemon.filter((p) => p.is_available).length;
  const totalCount = pokemon.length;

  return (
    <div className="flex flex-col min-w-[200px] border-r">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b p-2 text-center z-10">
        <div className="text-2xl font-bold">{pointValue}</div>
        <div className="text-xs text-gray-500">
          {availableCount} / {totalCount} available
        </div>
      </div>

      {/* Pokemon List */}
      <div className="flex flex-col gap-2 p-2">
        {pokemon.map((p) => (
          <PokemonCard
            key={p.id}
            pokemon={p}
            teamId={teamId}
            seasonId={seasonId}
            onPick={onPick}
          />
        ))}
      </div>
    </div>
  );
}
```

#### Draft Board Grid Component

```typescript
// components/draft-board/DraftBoardGrid.tsx
'use client';

import { DraftPoolPokemon } from '@/types/draft-pool';
import { PointValueColumn } from './PointValueColumn';
import { useMemo } from 'react';

interface DraftBoardGridProps {
  pokemon: DraftPoolPokemon[];
  teamId: string;
  seasonId?: string;
  onPick?: (pokemon: DraftPoolPokemon) => void;
}

export function DraftBoardGrid({
  pokemon,
  teamId,
  seasonId,
  onPick,
}: DraftBoardGridProps) {
  // Group Pokemon by point value
  const pokemonByPoint = useMemo(() => {
    const grouped: Record<number, DraftPoolPokemon[]> = {};
    for (let i = 20; i >= 1; i--) {
      grouped[i] = [];
    }
    pokemon.forEach((p) => {
      if (grouped[p.point_value]) {
        grouped[p.point_value].push(p);
      }
    });
    return grouped;
  }, [pokemon]);

  return (
    <div className="flex overflow-x-auto h-full">
      {Array.from({ length: 20 }, (_, i) => 20 - i).map((pointValue) => (
        <PointValueColumn
          key={pointValue}
          pointValue={pointValue}
          pokemon={pokemonByPoint[pointValue] || []}
          teamId={teamId}
          seasonId={seasonId}
          onPick={onPick}
        />
      ))}
    </div>
  );
}
```

#### Budget Display Component

```typescript
// components/draft-board/BudgetDisplay.tsx
'use client';

import { useTeamBudget } from '@/hooks/use-draft-pool';
import { useMemo } from 'react';

interface BudgetDisplayProps {
  teamId: string;
  seasonId?: string;
}

export function BudgetDisplay({ teamId, seasonId }: BudgetDisplayProps) {
  const { data: budget, isLoading } = useTeamBudget(teamId, seasonId);

  const percentageUsed = useMemo(() => {
    if (!budget) return 0;
    return (budget.spent_points / budget.total_points) * 100;
  }, [budget]);

  if (isLoading) {
    return <div className="p-4 border-b">Loading budget...</div>;
  }

  if (!budget) {
    return <div className="p-4 border-b text-red-600">Budget not found</div>;
  }

  return (
    <div className="p-4 border-b bg-blue-50">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold">Draft Budget</span>
          <span className="text-sm text-gray-600">
            {budget.spent_points} / {budget.total_points} points
          </span>
        </div>
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
          <div
            className={`h-4 rounded-full transition-all ${
              percentageUsed >= 100
                ? 'bg-red-500'
                : percentageUsed >= 80
                ? 'bg-yellow-500'
                : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(percentageUsed, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Remaining: {budget.remaining_points} points</span>
          <span className={`font-semibold ${
            budget.remaining_points < 0 ? 'text-red-600' : 'text-gray-800'
          }`}>
            {percentageUsed.toFixed(1)}% used
          </span>
        </div>
      </div>
    </div>
  );
}
```

#### Filters Component

```typescript
// components/draft-board/Filters.tsx
'use client';

import { useState } from 'react';

interface FiltersProps {
  filters: {
    point_range?: [number, number];
    generation?: number;
    type?: string;
  };
  onFiltersChange: (filters: FiltersProps['filters']) => void;
}

export function Filters({ filters, onFiltersChange }: FiltersProps) {
  const [minPoints, setMinPoints] = useState(filters.point_range?.[0] || '');
  const [maxPoints, setMaxPoints] = useState(filters.point_range?.[1] || '');
  const [generation, setGeneration] = useState(filters.generation?.toString() || '');

  const applyFilters = () => {
    const newFilters: FiltersProps['filters'] = {};
    
    if (minPoints && maxPoints) {
      newFilters.point_range = [Number(minPoints), Number(maxPoints)];
    }
    
    if (generation) {
      newFilters.generation = Number(generation);
    }
    
    onFiltersChange(newFilters);
  };

  const clearFilters = () => {
    setMinPoints('');
    setMaxPoints('');
    setGeneration('');
    onFiltersChange({});
  };

  return (
    <div className="flex gap-4 items-center mt-4">
      <div className="flex gap-2 items-center">
        <label className="text-sm font-medium">Points:</label>
        <input
          type="number"
          min="1"
          max="20"
          placeholder="Min"
          value={minPoints}
          onChange={(e) => setMinPoints(e.target.value)}
          className="w-20 px-2 py-1 border rounded"
        />
        <span>-</span>
        <input
          type="number"
          min="1"
          max="20"
          placeholder="Max"
          value={maxPoints}
          onChange={(e) => setMaxPoints(e.target.value)}
          className="w-20 px-2 py-1 border rounded"
        />
      </div>

      <div className="flex gap-2 items-center">
        <label className="text-sm font-medium">Generation:</label>
        <select
          value={generation}
          onChange={(e) => setGeneration(e.target.value)}
          className="px-2 py-1 border rounded"
        >
          <option value="">All</option>
          {Array.from({ length: 9 }, (_, i) => i + 1).map((gen) => (
            <option key={gen} value={gen}>
              Gen {gen}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={applyFilters}
        className="px-4 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Apply
      </button>
      <button
        onClick={clearFilters}
        className="px-4 py-1 bg-gray-300 rounded hover:bg-gray-400"
      >
        Clear
      </button>
    </div>
  );
}
```

---

### 16.4 Real-Time Updates

#### Supabase Realtime Subscription

```typescript
// hooks/use-draft-realtime.ts
import { useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function useDraftRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Subscribe to draft picks
    const picksChannel = supabase
      .channel('draft-picks')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'team_rosters',
          filter: 'source=eq.draft',
        },
        (payload) => {
          // Invalidate queries to refetch
          queryClient.invalidateQueries({ queryKey: ['draft-pool'] });
          queryClient.invalidateQueries({ queryKey: ['team-picks'] });
          queryClient.invalidateQueries({ queryKey: ['team-budget'] });
          queryClient.invalidateQueries({ queryKey: ['draft-status'] });
        }
      )
      .subscribe();

    // Subscribe to draft session updates
    const sessionChannel = supabase
      .channel('draft-session')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'draft_sessions',
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['draft-status'] });
        }
      )
      .subscribe();

    return () => {
      picksChannel.unsubscribe();
      sessionChannel.unsubscribe();
    };
  }, [queryClient]);
}
```

#### Usage in Component

```typescript
// In DraftBoard.tsx
import { useDraftRealtime } from '@/hooks/use-draft-realtime';

export function DraftBoard({ teamId, seasonId }: DraftBoardProps) {
  useDraftRealtime(); // Enable real-time updates
  
  // ... rest of component
}
```

---

### 16.5 State Management

#### Zustand Store (Optional)

```typescript
// stores/draft-store.ts
import { create } from 'zustand';
import { DraftPoolPokemon, DraftSession } from '@/types/draft-pool';

interface DraftStore {
  selectedPokemon: DraftPoolPokemon | null;
  filters: {
    point_range?: [number, number];
    generation?: number;
    type?: string;
  };
  draftSession: DraftSession | null;
  setSelectedPokemon: (pokemon: DraftPoolPokemon | null) => void;
  setFilters: (filters: DraftStore['filters']) => void;
  setDraftSession: (session: DraftSession | null) => void;
}

export const useDraftStore = create<DraftStore>((set) => ({
  selectedPokemon: null,
  filters: {},
  draftSession: null,
  setSelectedPokemon: (pokemon) => set({ selectedPokemon: pokemon }),
  setFilters: (filters) => set({ filters }),
  setDraftSession: (session) => set({ draftSession: session }),
}));
```

---

### 16.6 Error Handling

#### Error Boundary Component

```typescript
// components/draft-board/DraftBoardErrorBoundary.tsx
'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class DraftBoardErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('DraftBoard error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center">
          <h2 className="text-xl font-bold text-red-600 mb-4">
            Something went wrong
          </h2>
          <p className="text-gray-600 mb-4">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

---

### 16.7 Loading States

#### Skeleton Components

```typescript
// components/draft-board/DraftBoardSkeleton.tsx
export function DraftBoardSkeleton() {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b bg-white animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-48 mb-4" />
        <div className="h-4 bg-gray-200 rounded w-64" />
      </div>
      <div className="flex-1 overflow-auto p-4">
        <div className="flex gap-4">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="flex flex-col min-w-[200px]">
              <div className="h-16 bg-gray-200 rounded mb-2" />
              {Array.from({ length: 10 }).map((_, j) => (
                <div
                  key={j}
                  className="h-24 bg-gray-100 rounded mb-2"
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

### 16.8 User Interaction Flows

#### Draft Pick Flow

```typescript
// Flow: User selects Pokemon → Confirm → API call → Update UI

async function handlePokemonPick(
  pokemon: DraftPoolPokemon,
  teamId: string,
  seasonId?: string
) {
  try {
    // 1. Validate budget
    const budget = await draftPoolClient.getTeamBudget(teamId, seasonId);
    if (budget.remaining_points < pokemon.point_value) {
      throw new Error('Insufficient budget');
    }

    // 2. Validate availability
    if (!pokemon.is_available) {
      throw new Error('Pokemon already drafted');
    }

    // 3. Call draft API (implement this endpoint)
    const response = await fetch('/api/draft/pick', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        team_id: teamId,
        pokemon_name: pokemon.pokemon_name,
        point_value: pokemon.point_value,
        season_id: seasonId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    // 4. Invalidate queries (React Query will refetch)
    queryClient.invalidateQueries({ queryKey: ['draft-pool'] });
    queryClient.invalidateQueries({ queryKey: ['team-budget'] });
    queryClient.invalidateQueries({ queryKey: ['team-picks'] });
    queryClient.invalidateQueries({ queryKey: ['draft-status'] });

    // 5. Show success message
    toast.success(`${pokemon.pokemon_name} drafted successfully!`);
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Failed to draft Pokemon');
  }
}
```

---

### 16.9 Responsive Design

#### Mobile Considerations

```typescript
// Use responsive grid for mobile
<div className="
  grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-10 xl:grid-cols-20
  gap-4 p-4
">
  {/* Pokemon cards */}
</div>

// Horizontal scroll on mobile for point columns
<div className="flex overflow-x-auto snap-x snap-mandatory">
  {/* Point value columns */}
</div>
```

---

### 16.10 Accessibility Features

```typescript
// Add ARIA labels and keyboard navigation
<button
  onClick={handleClick}
  aria-label={`Draft ${pokemon.pokemon_name} for ${pokemon.point_value} points`}
  aria-disabled={!isAvailable || !canAfford}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }}
>
  {/* Pokemon card content */}
</button>

// Screen reader announcements
<div role="status" aria-live="polite" className="sr-only">
  {draftStatus && `Current pick: ${draftStatus.current_pick} of ${draftStatus.total_picks}`}
</div>
```

---

### 16.11 Environment Variables

```bash
# .env.local
NEXT_PUBLIC_MCP_API_KEY=your_api_key_here
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

---

### 16.12 UI/UX Best Practices

#### Visual Design Patterns

1. **Point Value Color Coding**:
   ```typescript
   const getPointColor = (points: number) => {
     if (points >= 15) return 'bg-red-100 border-red-500'; // High tier
     if (points >= 8) return 'bg-yellow-100 border-yellow-500'; // Mid tier
     return 'bg-green-100 border-green-500'; // Low tier
   };
   ```

2. **Availability Indicators**:
   - Available: Green border, enabled button
   - Drafted: Gray background, strikethrough text, disabled button
   - Unaffordable: Red border, disabled button with tooltip

3. **Budget Visualization**:
   - Progress bar with color thresholds:
     - Green: 0-79% used
     - Yellow: 80-99% used
     - Red: 100%+ used (over budget)

4. **Draft Status Display**:
   - Show current pick number prominently
   - Highlight current team's turn
   - Display countdown timer (45 seconds per pick)

#### User Experience Enhancements

1. **Search Functionality**:
   ```typescript
   const [searchQuery, setSearchQuery] = useState('');
   const filteredPokemon = pokemon.filter(p => 
     p.pokemon_name.toLowerCase().includes(searchQuery.toLowerCase())
   );
   ```

2. **Sort Options**:
   - By point value (default)
   - Alphabetically
   - By generation
   - By availability

3. **Keyboard Shortcuts**:
   - `Ctrl/Cmd + F`: Focus search
   - `Esc`: Close modals
   - `Enter`: Confirm draft pick
   - Arrow keys: Navigate Pokemon cards

4. **Toast Notifications**:
   ```typescript
   import { toast } from 'react-hot-toast';
   
   toast.success(`${pokemon.pokemon_name} drafted!`);
   toast.error('Insufficient budget');
   toast.info('Draft pick confirmed');
   ```

5. **Confirmation Flow**:
   - Show Pokemon details in confirmation modal
   - Display budget impact (points remaining after pick)
   - Allow cancellation
   - Show loading state during API call

#### Performance Optimizations

1. **Virtual Scrolling**: Use `react-window` or `react-virtuoso` for large lists
2. **Debounced Search**: Wait 300ms before filtering
3. **Memoization**: Use `useMemo` for filtered/sorted lists
4. **Code Splitting**: Lazy load modals and heavy components
5. **Image Optimization**: Use Next.js Image component for Pokemon sprites

#### Accessibility Checklist

- ✅ Semantic HTML (`<button>`, `<nav>`, `<main>`)
- ✅ ARIA labels for interactive elements
- ✅ Keyboard navigation support
- ✅ Screen reader announcements
- ✅ Focus management in modals
- ✅ Color contrast (WCAG AA minimum)
- ✅ Error messages associated with inputs

### 16.13 v0.dev Prompt Suggestions

For generating components in v0.dev, use these prompts:

**Main Draft Board**:
```
Create a Pokemon draft board interface with:
- Grid layout: 20 columns (one per point value 1-20)
- Each column shows Pokemon cards for that point value
- Pokemon cards display: name, point value, generation, availability status
- Cards are clickable to draft (disabled if unavailable or unaffordable)
- Budget display at top: progress bar showing spent/remaining points (120 total)
- Filters: point range slider, generation dropdown, search bar
- Real-time updates when Pokemon are drafted (gray out drafted Pokemon)
- Responsive: horizontal scroll on mobile, full grid on desktop
- Loading skeleton states while fetching
- Error boundary for API failures
```

**Pokemon Card Component**:
```
Create a Pokemon card component with:
- Pokemon name (bold, large)
- Point value badge (colored by tier: red 15-20, yellow 8-14, green 1-7)
- Generation indicator (small badge)
- Availability status (green checkmark if available, red X if drafted)
- Hover effect: slight elevation and border highlight
- Disabled state: gray background, reduced opacity, cursor-not-allowed
- Click handler: opens confirmation modal
- Props: pokemon (DraftPoolPokemon), teamId, seasonId, onPick callback
```

**Budget Display Component**:
```
Create a budget display component showing:
- Total budget: 120 points (fixed)
- Spent points: dynamic from API
- Remaining points: calculated (total - spent)
- Progress bar: visual representation with color coding
  - Green: 0-79% used
  - Yellow: 80-99% used  
  - Red: 100%+ used
- Percentage used: "X% used" text
- Warning if remaining < 20 points
- Props: teamId, seasonId
```

**Draft Status Component**:
```
Create a draft status component showing:
- Current pick number: "Pick 45 of 220"
- Current round: "Round 3 of 11"
- Current team: "Team Name's turn" (highlighted)
- Draft status: "Active" badge (green) or "Completed" (gray)
- Countdown timer: "45 seconds remaining" (if active)
- Props: seasonId
```

**Team Roster Component**:
```
Create a team roster component showing:
- List of drafted Pokemon
- Each entry: Pokemon name, point value, draft round, draft order
- Total spent points at bottom
- Group by round (collapsible sections)
- Sort options: by round, by points, alphabetically
- Props: teamId, seasonId
```

**Pick Confirmation Modal**:
```
Create a confirmation modal for drafting Pokemon:
- Pokemon name (large, bold)
- Point value display
- Current budget: "You have X points remaining"
- After pick: "You will have Y points remaining"
- Confirm button (primary, enabled)
- Cancel button (secondary)
- Loading state during API call
- Success/error toast notifications
- Props: pokemon, teamId, seasonId, onConfirm, onCancel
```

### 16.14 Testing & Validation Checklist

#### Functional Requirements

- [ ] **Pokemon Display**: All available Pokemon shown in correct point value columns
- [ ] **Filtering**: Point range filter works correctly
- [ ] **Filtering**: Generation filter works correctly
- [ ] **Search**: Search by Pokemon name works
- [ ] **Budget Display**: Shows correct spent/remaining points
- [ ] **Budget Validation**: Prevents drafting if insufficient budget
- [ ] **Availability Check**: Disables drafting of already-drafted Pokemon
- [ ] **Draft Pick**: Successfully drafts Pokemon and updates UI
- [ ] **Real-time Updates**: UI updates when other teams draft
- [ ] **Draft Status**: Shows correct current pick, round, team
- [ ] **Team Roster**: Displays all drafted Pokemon correctly

#### UI/UX Requirements

- [ ] **Loading States**: Shows skeletons while fetching
- [ ] **Error Handling**: Displays errors gracefully with retry
- [ ] **Responsive Design**: Works on mobile (horizontal scroll)
- [ ] **Responsive Design**: Works on desktop (full grid)
- [ ] **Accessibility**: Keyboard navigation works
- [ ] **Accessibility**: Screen reader compatible
- [ ] **Visual Feedback**: Hover states on interactive elements
- [ ] **Visual Feedback**: Disabled states clearly indicated
- [ ] **Confirmation Flow**: Modal appears before drafting
- [ ] **Notifications**: Success/error toasts appear

#### Edge Cases to Test

1. **Budget Exceeded**: Try to draft Pokemon when budget is insufficient
2. **Already Drafted**: Try to draft Pokemon that's already taken
3. **Network Error**: Test behavior when API calls fail
4. **Empty Results**: Test when filters return no Pokemon
5. **Concurrent Drafts**: Test real-time updates when multiple users draft
6. **Session Expired**: Test behavior when draft session ends
7. **Large Dataset**: Test performance with 400+ Pokemon
8. **Rapid Clicks**: Test debouncing on rapid filter changes

#### Performance Benchmarks

- Initial load: < 2 seconds
- Filter updates: < 500ms
- Draft pick confirmation: < 1 second
- Real-time update latency: < 1 second
- Smooth scrolling: 60fps
- No layout shifts during loading

### 16.15 Common Pitfalls & Solutions

#### Pitfall 1: Not Handling Loading States

**Problem**: UI shows empty state or errors during API calls

**Solution**: Always show loading skeletons or spinners
```typescript
if (isLoading) return <DraftBoardSkeleton />;
if (error) return <ErrorDisplay error={error} />;
```

#### Pitfall 2: Stale Data After Draft Pick

**Problem**: UI doesn't update after successful draft

**Solution**: Invalidate React Query cache
```typescript
queryClient.invalidateQueries({ queryKey: ['draft-pool'] });
```

#### Pitfall 3: Missing Real-time Updates

**Problem**: UI doesn't reflect other teams' picks

**Solution**: Set up Supabase Realtime subscription
```typescript
useEffect(() => {
  const channel = supabase.channel('draft-picks')
    .on('postgres_changes', { event: 'INSERT', table: 'team_rosters' }, () => {
      queryClient.invalidateQueries({ queryKey: ['draft-pool'] });
    })
    .subscribe();
  return () => channel.unsubscribe();
}, []);
```

#### Pitfall 4: Budget Validation Not Working

**Problem**: Users can draft Pokemon they can't afford

**Solution**: Validate on both frontend and backend
```typescript
// Frontend validation (UX)
if (budget.remaining_points < pokemon.point_value) {
  toast.error('Insufficient budget');
  return;
}

// Backend validation (security - must implement API endpoint)
```

#### Pitfall 5: Poor Mobile Experience

**Problem**: Grid doesn't work well on mobile

**Solution**: Use horizontal scroll with snap points
```typescript
<div className="flex overflow-x-auto snap-x snap-mandatory">
  {pointColumns.map(col => <PointValueColumn {...col} />)}
</div>
```

### 16.16 Integration Examples

#### Next.js App Router Setup

```typescript
// app/draft/page.tsx
import { DraftBoard } from '@/components/draft-board/DraftBoard';
import { DraftBoardErrorBoundary } from '@/components/draft-board/DraftBoardErrorBoundary';

export default function DraftPage() {
  const teamId = 'current-user-team-id'; // Get from auth
  const seasonId = undefined; // Uses current season

  return (
    <DraftBoardErrorBoundary>
      <DraftBoard teamId={teamId} seasonId={seasonId} />
    </DraftBoardErrorBoundary>
  );
}
```

#### React Query Provider Setup

```typescript
// app/providers.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: true,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

---

## 17. Related Documentation

- **Draft Rules**: `docs/LEAGUE-RULES.md`
- **MCP Server Guide**: `knowledge-base/aab-battle-league/MCP-SERVER-COMPLETE-GUIDE.md`
- **Database Schema**: `supabase/migrations/20260118093937_baseline_schema.sql`
- **Extraction Script**: `scripts/generate-seed-from-draft-board.js`
- **MCP Server Code**: `tools/mcp-servers/draft-pool-server/src/index.ts`
- **OpenAPI Spec**: `tools/mcp-servers/draft-pool-server/openapi.json`

---

**Last Updated**: January 19, 2026  
**Version**: 1.0.0 (Frontend Implementation Guide Added)  
**Status**: Production System - Season 5  
**Maintained By**: POKE MNKY Development Team
