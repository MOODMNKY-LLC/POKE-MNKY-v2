# AAB Draft Database Schema - Complete Reference

**Purpose**: Comprehensive guide to all draft-related tables for end-to-end testing  
**Audience**: App Agent - for building draft features with seeded production data  
**Last Updated**: 2026-01-19  
**Status**: ✅ **Production Ready - All tables seeded**

---

## Overview

This document details all draft-related database tables, their relationships, and how they work together in the draft system. After pulling the production database (`supabase db pull --linked`), you'll have all the seeded data needed for end-to-end draft testing.

---

## Table Hierarchy & Dependencies

```
seasons (1)
  ├── conferences (2) [Lance, Leon]
  │     └── divisions (4) [Kanto, Johto, Hoenn, Sinnoh]
  │           └── teams (20)
  │                 ├── draft_budgets (20) [120 points each]
  │                 └── team_rosters (populated during draft)
  │
  ├── draft_pool (778 Pokemon)
  │     └── References: teams (drafted_by_team_id)
  │
  └── draft_sessions (1) [tracks active draft]
        └── References: teams (current_team_id, turn_order)
```

**Dependency Order** (for seeding):
1. `seasons` → 2. `conferences` → 3. `divisions` → 4. `teams` → 5. `draft_budgets` → 6. `draft_pool` → 7. `draft_sessions` → 8. `team_rosters` (during draft)

---

## Core Tables

### 1. `seasons`

**Purpose**: Track league seasons (Season 5, Season 6, etc.)

**Schema**:
```sql
CREATE TABLE seasons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,                    -- e.g., "Season 5"
    start_date DATE NOT NULL,              -- e.g., '2025-08-17'
    end_date DATE,                         -- e.g., '2025-12-31'
    is_current BOOLEAN DEFAULT false,      -- Only one season can be current
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**Seeded Data**:
- ✅ **1 season**: Season 5
  - `id`: `00000000-0000-0000-0000-000000000001`
  - `name`: "Season 5"
  - `start_date`: `2025-08-17`
  - `end_date`: `2025-12-31`
  - `is_current`: `true`

**Usage in Draft**:
- All draft operations filter by `season_id`
- Use `WHERE is_current = true` to get current season
- One season can be current at a time

**Query Pattern**:
```sql
-- Get current season
SELECT id FROM seasons WHERE is_current = true LIMIT 1;

-- Get all teams for current season
SELECT * FROM teams WHERE season_id = (SELECT id FROM seasons WHERE is_current = true);
```

---

### 2. `conferences`

**Purpose**: Organize teams into conferences (Lance Conference, Leon Conference)

**Schema**:
```sql
CREATE TABLE conferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,                    -- "Lance Conference" or "Leon Conference"
    season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**Seeded Data**:
- ✅ **2 conferences**:
  - Lance Conference (`id`: `00000000-0000-0000-0000-000000000010`)
  - Leon Conference (`id`: `00000000-0000-0000-0000-000000000011`)

**Usage in Draft**:
- Organizational structure only
- Teams belong to divisions, which belong to conferences
- Used for standings/rankings display

---

### 3. `divisions`

**Purpose**: Organize teams into divisions within conferences

**Schema**:
```sql
CREATE TABLE divisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,                    -- "Kanto", "Johto", "Hoenn", "Sinnoh"
    conference_id UUID NOT NULL REFERENCES conferences(id) ON DELETE CASCADE,
    season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**Seeded Data**:
- ✅ **4 divisions** (5 teams each):
  - **Kanto** (`id`: `00000000-0000-0000-0000-000000000020`) - Lance Conference
  - **Johto** (`id`: `00000000-0000-0000-0000-000000000021`) - Lance Conference
  - **Hoenn** (`id`: `00000000-0000-0000-0000-000000000022`) - Leon Conference
  - **Sinnoh** (`id`: `00000000-0000-0000-0000-000000000023`) - Leon Conference

**Usage in Draft**:
- Used for turn order sorting (Kanto → Johto → Hoenn → Sinnoh)
- Organizational structure for standings

---

### 4. `teams`

**Purpose**: Store team information (name, coach, division, conference)

**Schema**:
```sql
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,                     -- e.g., "Arkansas Fighting Hogs"
    coach_name TEXT NOT NULL,               -- e.g., "Jordan"
    division TEXT NOT NULL,                 -- "Kanto", "Johto", "Hoenn", "Sinnoh"
    conference TEXT NOT NULL,               -- "Lance Conference", "Leon Conference"
    season_id UUID REFERENCES seasons(id) ON DELETE SET NULL,
    division_id UUID REFERENCES divisions(id) ON DELETE SET NULL,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    differential INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**Seeded Data**:
- ✅ **20 teams** with real names and coaches from Google Sheets:
  - **Kanto Division** (Lance Conference): 5 teams
    - Arkansas Fighting Hogs (Jordan)
    - Leicester Lycanrocs (Bok Choy)
    - Miami Blazins (Ary)
    - Daycare Dittos (PokeGoat)
    - Grand Rapids Garchomp (Matt)
  - **Johto Division** (Lance Conference): 5 teams
    - Boise State Mudsdales (Fouster)
    - ToneBone Troublemakers (Tony)
    - Tegucigalpa Dragonites (Gabe)
    - Team 9 (Dandelion)
    - Montana Meganiums (Krampe)
  - **Hoenn Division** (Leon Conference): 5 teams
    - Liverpool Lunalas (Harry)
    - Manchester Milcerys (ShameWall)
    - Garden City Grimmsnarl (Bryce)
    - Team 14 (Simeon (Mod))
    - South Bend Snowflakes (Pup)
  - **Sinnoh Division** (Leon Conference): 5 teams
    - Jackson Jigglies (Mark)
    - Detroit Drakes (Zach)
    - Krazy Kecleons (Bfarias)
    - Rockslide Rebels (DevXP)
    - Kalamazoo Kangaskhans (Andy W)

**Usage in Draft**:
- Teams make picks during draft
- Referenced in `draft_sessions.turn_order` (JSONB array of team IDs)
- Referenced in `draft_sessions.current_team_id` (whose turn it is)
- Referenced in `draft_pool.drafted_by_team_id` (who drafted what)

**Query Pattern**:
```sql
-- Get all teams for current season
SELECT * FROM teams 
WHERE season_id = (SELECT id FROM seasons WHERE is_current = true)
ORDER BY 
  CASE WHEN division = 'Kanto' THEN 1 
       WHEN division = 'Johto' THEN 2 
       WHEN division = 'Hoenn' THEN 3 
       WHEN division = 'Sinnoh' THEN 4 END,
  name;
```

---

### 5. `coaches`

**Purpose**: Store coach information (optional - teams currently use `coach_name` text field)

**Schema**:
```sql
CREATE TABLE coaches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    display_name TEXT NOT NULL,             -- e.g., "Jordan", "Bok Choy"
    email TEXT,                              -- NULL for now
    user_id UUID,                            -- NULL for now (future: link to auth.users)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**Seeded Data**:
- ✅ **23 coaches** extracted from team coach names
- Unique coaches (some coaches may coach multiple teams)

**Usage in Draft**:
- Currently optional (teams use `coach_name` text field)
- Future: Teams may use `coach_id` foreign key instead of `coach_name`

---

### 6. `draft_budgets`

**Purpose**: Track team budget spending per season (120 points per team)

**Schema**:
```sql
CREATE TABLE draft_budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    total_points INTEGER DEFAULT 120,       -- Season 5 budget: 120 points
    spent_points INTEGER DEFAULT 0,          -- Increments with each pick
    remaining_points INTEGER GENERATED ALWAYS AS (total_points - spent_points) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    UNIQUE (team_id, season_id)
);
```

**Seeded Data**:
- ✅ **20 draft budgets** (one per team)
  - `total_points`: `120` (Season 5 budget)
  - `spent_points`: `0` (ready for draft)
  - `remaining_points`: `120` (automatically calculated)

**Usage in Draft**:
- **Before Pick**: Check `remaining_points >= point_value` of Pokemon
- **After Pick**: Update `spent_points = spent_points + point_value`
- `remaining_points` is a **generated column** (automatically calculated)

**Query Pattern**:
```sql
-- Get budget for a team
SELECT * FROM draft_budgets 
WHERE team_id = ? 
  AND season_id = (SELECT id FROM seasons WHERE is_current = true);

-- Check if team can afford a Pokemon
SELECT remaining_points >= ? AS can_afford
FROM draft_budgets
WHERE team_id = ?
  AND season_id = (SELECT id FROM seasons WHERE is_current = true);
```

---

### 7. `draft_pool`

**Purpose**: Application table for Pokemon available to be drafted (with season support and status tracking)

**Schema**:
```sql
CREATE TYPE draft_pool_status AS ENUM (
    'available',      -- Available to be drafted
    'drafted',        -- Has been drafted
    'banned',         -- Banned from draft (Pokemon of Ruin, etc.)
    'unavailable'     -- Unavailable for other reasons
);

CREATE TABLE draft_pool (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pokemon_name TEXT NOT NULL,             -- e.g., "Charizard", "Pikachu"
    point_value INTEGER NOT NULL CHECK (point_value >= 1 AND point_value <= 20),
    pokemon_id INTEGER REFERENCES pokemon_cache(pokemon_id) ON DELETE SET NULL,
    
    -- Season support (multi-season capability)
    season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    
    -- Status enum (replaces is_available boolean)
    status draft_pool_status NOT NULL DEFAULT 'available',
    
    -- Draft tracking (denormalized for performance)
    drafted_by_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    drafted_at TIMESTAMP WITH TIME ZONE,
    draft_round INTEGER CHECK (draft_round >= 1),
    draft_pick_number INTEGER CHECK (draft_pick_number >= 1),
    
    -- Banned tracking
    banned_reason TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    -- Unique constraint: One Pokemon per season
    UNIQUE (season_id, pokemon_name)
);
```

**Seeded Data**:
- ✅ **778 Pokemon** for Season 5
  - `status`: `'available'` (all ready to be drafted)
  - `point_value`: 1-20 (draft cost)
  - `season_id`: Current season ID
  - `drafted_by_team_id`: `NULL` (not drafted yet)
  - `draft_round`: `NULL` (not drafted yet)
  - `draft_pick_number`: `NULL` (not drafted yet)

**Usage in Draft**:
- **Pre-Draft**: Query `WHERE status = 'available'` to show available Pokemon
- **During Draft**: Update `status = 'drafted'`, set `drafted_by_team_id`, `draft_round`, `draft_pick_number`
- **Post-Draft**: Query `WHERE status = 'drafted'` to show all drafted Pokemon

**Status Transitions**:
- `'available'` → `'drafted'`: When Pokemon is selected during draft
- `'available'` → `'banned'`: When Pokemon is banned (set `banned_reason`)
- `'available'` → `'unavailable'`: For other reasons

**Query Pattern**:
```sql
-- Get available Pokemon for current season
SELECT * FROM draft_pool
WHERE season_id = (SELECT id FROM seasons WHERE is_current = true)
  AND status = 'available'
ORDER BY point_value DESC, pokemon_name;

-- Get Pokemon drafted by a team
SELECT * FROM draft_pool
WHERE season_id = (SELECT id FROM seasons WHERE is_current = true)
  AND drafted_by_team_id = ?
  AND status = 'drafted'
ORDER BY draft_round, draft_pick_number;
```

---

### 8. `draft_sessions`

**Purpose**: Track active draft sessions (turn order, current pick, round, etc.)

**Schema**:
```sql
CREATE TABLE draft_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    session_name TEXT,                      -- e.g., "Season 5 Draft"
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'active', 'completed', 'paused'
    draft_type TEXT,                         -- 'snake' (snake draft)
    total_teams INTEGER DEFAULT 20,
    total_rounds INTEGER DEFAULT 11,        -- 11 rounds (11 Pokemon per team)
    current_pick_number INTEGER,             -- 1-220 (total picks)
    current_round INTEGER,                   -- 1-11
    current_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    turn_order JSONB,                        -- Array of team IDs in draft order
    pick_time_limit_seconds INTEGER DEFAULT 45,
    auto_draft_enabled BOOLEAN DEFAULT false,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**Seeded Data**:
- ✅ **1 draft session** (optional - for testing):
  - `status`: `'pending'` (ready to activate)
  - `draft_type`: `'snake'`
  - `total_teams`: `20`
  - `total_rounds`: `11`
  - `current_pick_number`: `1`
  - `current_round`: `1`
  - `turn_order`: JSONB array of team IDs (ordered by division, then name)
  - `pick_time_limit_seconds`: `45`

**Usage in Draft**:
- **Pre-Draft**: `status = 'pending'` (ready to start)
- **During Draft**: `status = 'active'`, track `current_pick_number`, `current_round`, `current_team_id`
- **Post-Draft**: `status = 'completed'`, `completed_at` set

**Turn Order Logic** (Snake Draft):
- **Round 1**: Teams pick in order (Team 1 → Team 2 → ... → Team 20)
- **Round 2**: Teams pick in reverse order (Team 20 → Team 19 → ... → Team 1)
- **Round 3**: Teams pick in order again (Team 1 → Team 2 → ... → Team 20)
- And so on...

**Query Pattern**:
```sql
-- Get active draft session
SELECT * FROM draft_sessions
WHERE season_id = (SELECT id FROM seasons WHERE is_current = true)
  AND status = 'active'
LIMIT 1;

-- Get current team's turn
SELECT t.* FROM teams t
JOIN draft_sessions ds ON ds.current_team_id = t.id
WHERE ds.id = ?;
```

---

### 9. `team_rosters`

**Purpose**: Track all Pokemon on team rosters (draft picks + free agency + trades)

**Schema**:
```sql
CREATE TABLE team_rosters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    pokemon_id UUID NOT NULL REFERENCES pokemon(id) ON DELETE CASCADE,
    draft_round INTEGER,                     -- 1-11 (NULL for free agency/trades)
    draft_order INTEGER,                     -- 1-220 (NULL for free agency/trades)
    draft_points INTEGER DEFAULT 0,          -- Point value (informational)
    source TEXT DEFAULT 'draft' CHECK (source IN ('draft', 'free_agency', 'trade')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    UNIQUE (team_id, pokemon_id)
);
```

**Seeded Data**:
- ⏳ **Not seeded** (populated during draft)
- Empty table ready for draft picks

**Usage in Draft**:
- **During Draft**: Insert record when Pokemon is drafted
  - `draft_round`: Current round (1-11)
  - `draft_order`: Current pick number (1-220)
  - `draft_points`: Point value of Pokemon
  - `source`: `'draft'`
- **Post-Draft**: Query to show team rosters
- **Free Agency**: Insert records with `source = 'free_agency'` (no draft_round/draft_order)

**Query Pattern**:
```sql
-- Get team roster (draft picks only)
SELECT * FROM team_rosters
WHERE team_id = ?
  AND source = 'draft'
ORDER BY draft_round, draft_order;

-- Get all Pokemon for a team (including free agency)
SELECT * FROM team_rosters
WHERE team_id = ?
ORDER BY 
  CASE WHEN source = 'draft' THEN 0 ELSE 1 END,
  draft_round NULLS LAST,
  draft_order NULLS LAST;
```

---

## How Tables Work Together

### Pre-Draft State

1. **Season Setup**:
   - `seasons`: Season 5 marked as current
   - `conferences`: Lance and Leon conferences created
   - `divisions`: Kanto, Johto, Hoenn, Sinnoh divisions created
   - `teams`: 20 teams assigned to divisions

2. **Draft Preparation**:
   - `draft_budgets`: 20 budgets initialized (120 points each, 0 spent)
   - `draft_pool`: 778 Pokemon with `status = 'available'`
   - `draft_sessions`: 1 session in `'pending'` status (optional)

3. **Ready to Start**:
   - All teams have budgets
   - All Pokemon are available
   - Draft session can be activated (`status = 'active'`)

### During Draft Flow

1. **Get Current Turn**:
   ```sql
   -- Get current team
   SELECT t.* FROM teams t
   JOIN draft_sessions ds ON ds.current_team_id = t.id
   WHERE ds.id = ? AND ds.status = 'active';
   ```

2. **Check Budget**:
   ```sql
   -- Check if team can afford Pokemon
   SELECT remaining_points >= ? AS can_afford
   FROM draft_budgets
   WHERE team_id = ? AND season_id = ?;
   ```

3. **Make Pick**:
   ```sql
   -- Insert into team_rosters
   INSERT INTO team_rosters (team_id, pokemon_id, draft_round, draft_order, draft_points, source)
   VALUES (?, ?, ?, ?, ?, 'draft');
   
   -- Update draft_pool
   UPDATE draft_pool
   SET 
       status = 'drafted',
       drafted_by_team_id = ?,
       drafted_at = now(),
       draft_round = ?,
       draft_pick_number = ?,
       updated_at = now()
   WHERE pokemon_name = ? AND season_id = ?;
   
   -- Update budget
   UPDATE draft_budgets
   SET spent_points = spent_points + ?
   WHERE team_id = ? AND season_id = ?;
   
   -- Advance draft
   UPDATE draft_sessions
   SET 
       current_pick_number = current_pick_number + 1,
       current_round = CASE WHEN current_pick_number % total_teams = 0 THEN current_round + 1 ELSE current_round END,
       current_team_id = (SELECT team_id FROM turn_order WHERE ...),
       updated_at = now()
   WHERE id = ?;
   ```

### Post-Draft State

1. **Complete Draft**:
   - `draft_sessions.status = 'completed'`
   - `draft_sessions.completed_at = now()`
   - All 220 picks made (20 teams × 11 rounds)

2. **Final Rosters**:
   - `team_rosters`: 220 records (11 Pokemon per team)
   - `draft_pool`: All Pokemon have `status = 'drafted'` or `'banned'`
   - `draft_budgets`: All budgets show `spent_points` (sum of drafted Pokemon)

---

## Key Relationships

### Foreign Key Relationships

```
seasons (id)
  ├── conferences.season_id
  ├── divisions.season_id
  ├── teams.season_id
  ├── draft_budgets.season_id
  ├── draft_pool.season_id
  └── draft_sessions.season_id

teams (id)
  ├── draft_budgets.team_id
  ├── draft_pool.drafted_by_team_id
  ├── draft_sessions.current_team_id
  └── team_rosters.team_id

conferences (id)
  └── divisions.conference_id

divisions (id)
  └── teams.division_id
```

### Data Flow

```
Draft Pick Flow:
1. draft_sessions.current_team_id → teams.id (get current team)
2. draft_budgets.team_id → teams.id (check budget)
3. draft_pool.pokemon_name → team_rosters.pokemon_id (insert pick)
4. draft_pool.drafted_by_team_id → teams.id (mark as drafted)
5. draft_budgets.spent_points += draft_pool.point_value (update budget)
6. draft_sessions.current_pick_number++ (advance draft)
```

---

## Query Examples for App Development

### Get Available Pokemon for Draft Board

```sql
SELECT 
    dp.id,
    dp.pokemon_name,
    dp.point_value,
    dp.pokemon_id,
    dp.status
FROM draft_pool dp
WHERE dp.season_id = (SELECT id FROM seasons WHERE is_current = true)
  AND dp.status = 'available'
ORDER BY dp.point_value DESC, dp.pokemon_name;
```

### Get Current Team's Turn

```sql
SELECT 
    t.id,
    t.name,
    t.coach_name,
    db.remaining_points
FROM teams t
JOIN draft_sessions ds ON ds.current_team_id = t.id
JOIN draft_budgets db ON db.team_id = t.id 
    AND db.season_id = (SELECT id FROM seasons WHERE is_current = true)
WHERE ds.id = ?
  AND ds.status = 'active';
```

### Get Team Roster

```sql
SELECT 
    tr.draft_round,
    tr.draft_order,
    tr.draft_points,
    dp.pokemon_name,
    dp.point_value
FROM team_rosters tr
JOIN draft_pool dp ON dp.drafted_by_team_id = tr.team_id
WHERE tr.team_id = ?
  AND tr.source = 'draft'
ORDER BY tr.draft_round, tr.draft_order;
```

### Get Draft Progress

```sql
SELECT 
    ds.current_pick_number,
    ds.current_round,
    ds.total_teams * ds.total_rounds AS total_picks,
    ROUND((ds.current_pick_number::numeric / (ds.total_teams * ds.total_rounds)) * 100, 2) AS progress_percent
FROM draft_sessions ds
WHERE ds.id = ?;
```

---

## Seeded Data Summary

### Production Data (After `supabase db pull --linked`)

- ✅ **1 season**: Season 5 (current)
- ✅ **2 conferences**: Lance, Leon
- ✅ **4 divisions**: Kanto, Johto, Hoenn, Sinnoh
- ✅ **20 teams**: Real names and coaches from Google Sheets
- ✅ **23 coaches**: Extracted from team coach names
- ✅ **20 draft budgets**: 120 points each, 0 spent
- ✅ **778 Pokemon**: All available (`status = 'available'`)
- ✅ **1 draft session**: Pending status (ready to activate)
- ⏳ **0 team_rosters**: Empty (populated during draft)

### Testing Scenarios

**Pre-Draft**:
- ✅ All data ready
- ✅ Can query available Pokemon
- ✅ Can check team budgets
- ✅ Can activate draft session

**During Draft**:
- ✅ Can make picks (updates `draft_pool`, `team_rosters`, `draft_budgets`, `draft_sessions`)
- ✅ Can track progress
- ✅ Can show current turn

**Post-Draft**:
- ⏳ Need to simulate picks (or wait for actual draft)
- ✅ Can query final rosters
- ✅ Can query final budgets

---

## Migration Files

All data is seeded via migrations (not `seed.sql`):

1. `20260119111702` - Populate `sheets_draft_pool` (source data)
2. `20260119113545` - Populate `teams`, `coaches`, `draft_budgets`
3. `20260119114000` - Populate `draft_sessions` (optional)
4. `20260119114500` - Fix teams/coaches (ensure all 20 teams)
5. `20260119120000` - Populate `draft_pool` from `sheets_draft_pool`
6. `20260119120100` - Make `draft_pool.season_id` NOT NULL
7. `20260119130000` - Populate `draft_pool` (fix)

**Note**: After pulling production DB, all migrations are applied and data is populated automatically.

---

## Next Steps for App Development

1. **Pull Production DB**:
   ```bash
   supabase db pull --linked
   ```

2. **Verify Seeded Data**:
   ```sql
   SELECT COUNT(*) FROM teams WHERE season_id = (SELECT id FROM seasons WHERE is_current = true);
   -- Expected: 20
   
   SELECT COUNT(*) FROM draft_pool WHERE status = 'available';
   -- Expected: 778
   ```

3. **Build Draft UI**:
   - Use `draft_pool` for Pokemon selection
   - Use `draft_sessions` for turn tracking
   - Use `draft_budgets` for budget validation
   - Use `team_rosters` for roster display

4. **Test Draft Flow**:
   - Activate draft session (`status = 'active'`)
   - Make picks (update all related tables)
   - Track progress (`current_pick_number`, `current_round`)
   - Complete draft (`status = 'completed'`)

---

**Last Updated**: 2026-01-19  
**Status**: ✅ Complete - All tables documented with seeded data ready for testing
